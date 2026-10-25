export type Entry = { id: string; park_id: string; kind: 'tip' | 'idea' | 'place'; title: string; body: string; created_at: string; confirmations: number; active: boolean }
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const connected = Boolean(url && key)
type Session = { access_token: string; refresh_token: string; expires_at: number }
let pending: Promise<string> | null = null
async function token(): Promise<string> {
  if (pending) return pending
  pending = (async () => {
    let old: Session | null = null
    try { old = JSON.parse(localStorage.getItem('zq-community-session') || 'null') } catch { /* new visitor */ }
    if (old && old.expires_at > Date.now() + 60000) return old.access_token
    const response = await fetch(`${url}/auth/v1/${old ? 'token?grant_type=refresh_token' : 'signup'}`, {
      method: 'POST', headers: { apikey: key!, 'Content-Type': 'application/json' },
      body: JSON.stringify(old ? { refresh_token: old.refresh_token } : {}),
    })
    if (!response.ok) throw new Error('auth')
    const data = await response.json()
    if (!data.access_token) throw new Error('auth')
    localStorage.setItem('zq-community-session', JSON.stringify({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + data.expires_in * 1000 }))
    return data.access_token as string
  })()
  try { return await pending } finally { pending = null }
}
async function request(path: string, body?: object) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: body ? 'POST' : 'GET', headers: { apikey: key!, Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!response.ok) throw new Error('community-request')
  return response.status === 204 ? null : response.json()
}
export async function entries(park: string): Promise<Entry[]> {
  return request(`community_feed?park_id=eq.${encodeURIComponent(park)}&order=created_at.desc&limit=100`)
}
export async function submit(park: string, kind: Entry['kind'], title: string, body: string) {
  return request('rpc/submit_community', { p_park: park, p_kind: kind, p_title: title.trim(), p_body: body.trim() })
}
export async function confirm(id: string) { return request('rpc/confirm_community', { p_entry: id }) }
