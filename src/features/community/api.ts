export type Entry = { id: string; park_id: string; kind: 'tip' | 'idea' | 'place'; title: string; body: string; created_at: string; confirmations: number; active: boolean }
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const supabaseConfigured = Boolean(url && key)
export type CommunityConfig = { mode: 'external' | 'supabase' | 'draft'; apiUrl?: string }
let configuration: Promise<CommunityConfig> | null = null

function externalOrigin(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return
  try {
    const parsed = new URL(value)
    // Only an HTTPS origin is accepted; never forward auth data or credentials.
    if (parsed.protocol === 'https:' && !parsed.username && !parsed.password && parsed.pathname === '/' && !parsed.search && !parsed.hash) return parsed.origin
  } catch { /* malformed public config falls back to an existing backend */ }
}

export function initializeCommunity(): Promise<CommunityConfig> {
  if (!configuration) configuration = (async () => {
    const override = externalOrigin(import.meta.env.VITE_COMMUNITY_API_URL)
    if (override) return { mode: 'external', apiUrl: override }
    try {
      const configUrl = new URL(`${import.meta.env.BASE_URL}community-config.json`, location.href).href
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)
      try {
        const response = await fetch(configUrl, { cache: 'no-store', credentials: 'omit', signal: controller.signal })
        if (response.ok) {
          const data = await response.json()
          const apiUrl = externalOrigin(data?.apiUrl)
          if (apiUrl) return { mode: 'external', apiUrl }
        }
      } finally { clearTimeout(timer) }
    } catch { /* optional runtime config can be absent or offline */ }
    return { mode: supabaseConfigured ? 'supabase' : 'draft' }
  })()
  return configuration
}

export function communityPageUrl(config: CommunityConfig, park: string, lang: string): string | undefined {
  if (config.mode !== 'external' || !config.apiUrl) return
  const page = new URL('/', config.apiUrl)
  page.searchParams.set('park', park)
  page.searchParams.set('lang', ['hu','en','de','es'].includes(lang.slice(0,2)) ? lang.slice(0,2) : 'en')
  return page.href
}
type Session = { access_token: string; refresh_token: string; expires_at: number }
const SESSION_KEY = 'zq-community-session'
let memory: Session | null = null
let pending: Promise<string> | null = null

function savedSession(): Session | null {
  if (memory) return memory
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    if (typeof value?.access_token === 'string' && typeof value?.refresh_token === 'string' && Number.isFinite(value?.expires_at)) memory = value
  } catch { /* memory-only session works when browser storage is blocked */ }
  return memory
}

async function timedFetch(input: string, init: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try { return await fetch(input, { ...init, signal: controller.signal }) } finally { clearTimeout(timer) }
}

async function token(): Promise<string> {
  if (pending) return pending
  pending = (async () => {
    const old = savedSession()
    if (old && old.expires_at > Date.now() + 60000) return old.access_token
    const authenticate = (refresh?: string) => timedFetch(`${url}/auth/v1/${refresh ? 'token?grant_type=refresh_token' : 'signup'}`, {
      method: 'POST', headers: { apikey: key!, 'Content-Type': 'application/json' },
      body: JSON.stringify(refresh ? { refresh_token: refresh } : {}),
    })
    let response = await authenticate(old?.refresh_token)
    // A revoked/expired refresh token must not permanently strand the visitor.
    // Network/server/rate-limit errors preserve the existing identity for retry.
    if (old && (response.status === 400 || response.status === 401)) response = await authenticate()
    if (!response.ok) throw new Error('auth')
    const data = await response.json()
    if (typeof data.access_token !== 'string' || typeof data.refresh_token !== 'string' || !Number.isFinite(data.expires_in)) throw new Error('auth')
    memory = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + data.expires_in * 1000 }
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(memory)) } catch { /* session remains usable in memory */ }
    return memory.access_token
  })()
  try { return await pending } finally { pending = null }
}

async function request(path: string, body?: object) {
  if (!supabaseConfigured) throw new Error('community-not-configured')
  const send = async () => timedFetch(`${url}/rest/v1/${path}`, {
    method: body ? 'POST' : 'GET', headers: { apikey: key!, Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  let response = await send()
  // A cached JWT can be revoked before its expiry. Refresh once; never retry
  // successful mutations or ambiguous network failures that may have committed.
  if (response.status === 401) {
    const old = savedSession()
    if (old) memory = { ...old, expires_at: 0 }
    response = await send()
  }
  if (!response.ok) throw new Error('community-request')
  return response.status === 204 ? null : response.json()
}
export async function entries(park: string): Promise<Entry[]> {
  const config = await initializeCommunity()
  if (config.mode === 'external' && config.apiUrl) {
    const response = await timedFetch(`${config.apiUrl}/api/community?park=${encodeURIComponent(park)}`, { credentials: 'omit' })
    if (!response.ok) throw new Error('community-request')
    const data = await response.json()
    const list: unknown = Array.isArray(data) ? data : data?.entries
    if (!Array.isArray(list) || list.some(e => !e || typeof e.id !== 'string' || e.park_id !== park || !['tip','idea','place'].includes(e.kind) || typeof e.title !== 'string' || typeof e.body !== 'string' || typeof e.created_at !== 'string' || !Number.isFinite(Date.parse(e.created_at)) || !Number.isInteger(e.confirmations) || e.confirmations < 0 || typeof e.active !== 'boolean')) throw new Error('community-invalid-feed')
    return list as Entry[]
  }
  return request(`community_feed?park_id=eq.${encodeURIComponent(park)}&order=created_at.desc&limit=100`)
}
export async function submit(park: string, kind: Entry['kind'], title: string, body: string) {
  if ((await initializeCommunity()).mode !== 'supabase') throw new Error('community-top-level-sign-in-required')
  return request('rpc/submit_community', { p_park: park, p_kind: kind, p_title: title.trim(), p_body: body.trim() })
}
export async function confirm(id: string) {
  if ((await initializeCommunity()).mode !== 'supabase') throw new Error('community-top-level-sign-in-required')
  return request('rpc/confirm_community', { p_entry: id })
}
