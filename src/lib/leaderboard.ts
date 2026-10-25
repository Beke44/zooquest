/**
 * Public family leaderboard.
 *
 * Works in two modes:
 *  - Supabase (free tier) when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 *    are set: shared between every family. Schema in supabase/schema.sql.
 *  - Offline/demo otherwise: your own family plus sample families, so the
 *    game still works without an account or network.
 * Only a nickname is ever published (privacy decision, round 3).
 */
export interface BoardRow {
  familyId: string
  nick: string
  emoji: string
  xp: number
  parkId: string
  country?: string
  me?: boolean
}

export type BoardScope = 'today' | 'week' | 'all'

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const isSupabase = Boolean(URL_ && KEY)

/* Third backend: when the app runs as a published claude.ai artifact, the
 * viewer's runtime offers a shared database – a real public leaderboard
 * with zero setup. Absent everywhere else (Lovable, own hosting). */
type Snap = { id: string; data(): Record<string, unknown> | undefined }
type Coll = { limit(n: number): { get(): Promise<{ docs: Snap[] }> }; doc(id: string): { set(d: Record<string, unknown>): Promise<void> } }
type ArtifactDb = { collection(p: string): Coll }
type Runtime = { use(n: string): Promise<unknown> }
let runtimeP: Promise<{ db: ArtifactDb; id: string } | null> | null = null
function artifactDb() {
  if (!runtimeP) {
    runtimeP = (async () => {
      const c = (window as unknown as { claude?: Runtime }).claude
      if (!c?.use) return null
      try {
        const [db, user] = (await Promise.all([c.use('db'), c.use('user')])) as [ArtifactDb | null, { id(): Promise<string | null> } | null]
        const id = db && user ? await user.id() : null
        return db && id ? { db, id } : null
      } catch { return null }
    })()
  }
  return runtimeP
}

/** Resolves true when scores are shared with other families. */
export async function sharedMode(): Promise<boolean> {
  return isSupabase || Boolean(await artifactDb())
}

export function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return `${t.getUTCFullYear()}-W${Math.ceil(((+t - +y) / 864e5 + 1) / 7)}`
}
export const dayKey = (d = new Date()) => d.toISOString().slice(0, 10)

// Deterministic sample families so the board is never empty in demo mode.
type Sample = Omit<BoardRow, 'xp' | 'me'> & { base: number }
const SAMPLE: Sample[] = [
  { familyId: 's1', nick: 'Szafari Kovácsék', emoji: '🦁', parkId: 'budapest', country: 'HU', base: 4200 },
  { familyId: 's2', nick: 'Team Zebra', emoji: '🦓', parkId: 'budapest', country: 'HU', base: 3650 },
  { familyId: 's3', nick: 'Die Pinguine', emoji: '🐧', parkId: 'berlin', country: 'DE', base: 3300 },
  { familyId: 's4', nick: 'Los Flamencos', emoji: '🦩', parkId: 'madrid', country: 'ES', base: 2900 },
  { familyId: 's5', nick: 'Elefántcsapat', emoji: '🐘', parkId: 'budapest', country: 'HU', base: 2480 },
  { familyId: 's6', nick: 'Wild Wanderers', emoji: '🦒', parkId: 'london', country: 'GB', base: 2100 },
  { familyId: 's7', nick: 'Majomparádé', emoji: '🐒', parkId: 'budapest', country: 'HU', base: 1750 },
  { familyId: 's8', nick: 'Tiger Tribe', emoji: '🐯', parkId: 'sandiego', country: 'US', base: 1400 },
  { familyId: 's9', nick: 'Kis Vízilovak', emoji: '🦛', parkId: 'budapest', country: 'HU', base: 980 },
  { familyId: 's10', nick: 'Les Girafes', emoji: '🦒', parkId: 'beauval', country: 'FR', base: 760 },
]

function sample(scope: BoardScope): BoardRow[] {
  const seed = scope === 'today' ? Number(dayKey().replace(/-/g, '')) : scope === 'week' ? Number(weekKey().replace(/\D/g, '')) : 1
  const f = scope === 'today' ? 0.22 : scope === 'week' ? 0.6 : 3
  return SAMPLE.map((s, i) => ({
    familyId: s.familyId, nick: s.nick, emoji: s.emoji, parkId: s.parkId, country: s.country,
    xp: Math.round(s.base * f * (0.75 + (((seed * (i + 7)) % 97) / 97) * 0.5)),
  }))
}

export async function fetchBoard(scope: BoardScope, me: BoardRow): Promise<BoardRow[]> {
  const adb = await artifactDb()
  if (adb) {
    try {
      const snap = await adb.db.collection('scores').limit(500).get()
      const rows: BoardRow[] = []
      for (const d of snap.docs) {
        const x = d.data() ?? {}
        const xp = scope === 'today' ? (x.day === dayKey() ? Number(x.today) : 0) : scope === 'week' ? (x.week === weekKey() ? Number(x.weekXp) : 0) : Number(x.all)
        if (!xp && d.id !== adb.id) continue
        rows.push({ familyId: d.id, nick: String(x.nick ?? '?').slice(0, 24), emoji: String(x.emoji ?? '🦁').slice(0, 4), parkId: String(x.parkId ?? ''), country: String(x.country ?? ''), xp: xp || 0, me: d.id === adb.id })
      }
      if (!rows.some((r) => r.me)) rows.push({ ...me, me: true })
      else rows.forEach((r) => { if (r.me) Object.assign(r, { nick: me.nick, emoji: me.emoji, xp: me.xp }) })
      return rows.sort((a, b) => b.xp - a.xp)
    } catch { /* fall through to demo */ }
  }
  if (isSupabase) {
    try {
      const filter = scope === 'today' ? `&day=eq.${dayKey()}` : scope === 'week' ? `&week=eq.${weekKey()}` : ''
      const table = scope === 'all' ? 'family_totals' : scope === 'week' ? 'weekly' : 'scores'
      const r = await fetch(`${URL_}/rest/v1/${table}?select=family_id,nick,emoji,xp,park_id,country&order=xp.desc&limit=10${filter}`, {
        headers: { apikey: KEY!, Authorization: `Bearer ${KEY}` },
      })
      if (r.ok) {
        const rows = (await r.json()) as { family_id: string; nick: string; emoji: string; xp: number; park_id: string; country: string }[]
        const list: BoardRow[] = rows.map((x) => ({ familyId: x.family_id, nick: x.nick, emoji: x.emoji, xp: x.xp, parkId: x.park_id, country: x.country, me: x.family_id === me.familyId }))
        if (!list.some((x) => x.me)) list.push({ ...me, me: true })
        return list.sort((a, b) => b.xp - a.xp)
      }
    } catch { /* fall back to demo */ }
  }
  return [...sample(scope), { ...me, me: true }].sort((a, b) => b.xp - a.xp)
}

export async function pushScore(row: BoardRow, xp: { today: number; week: number; all: number }) {
  const adb = await artifactDb()
  if (adb) {
    try {
      await adb.db.collection('scores').doc(adb.id).set({
        nick: row.nick, emoji: row.emoji, parkId: row.parkId, country: row.country ?? '',
        day: dayKey(), week: weekKey(), today: xp.today, weekXp: xp.week, all: xp.all, at: Date.now(),
      })
    } catch { /* viewer may be read-only */ }
    return
  }
  const xpToday = xp.today
  if (!isSupabase) return
  try {
    await fetch(`${URL_}/rest/v1/scores`, {
      method: 'POST',
      headers: { apikey: KEY!, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ family_id: row.familyId, nick: row.nick, emoji: row.emoji, park_id: row.parkId, country: row.country, day: dayKey(), week: weekKey(), xp: xpToday }),
    })
  } catch { /* offline – retried on next catch */ }
}
