import { SPECIES } from '@/data/species'
import type { Capture, ParkPack, Rarity, ScheduleItem, Species } from '@/types'

/** Gemini's rarity table (agreed in round 3). */
export const RARITY_XP: Record<Rarity, number> = {
  common: 100,
  rare: 250,
  epic: 500,
  legendary: 1000,
}

export const BONUS = {
  coop: 0.2, // +20% when 2+ family members take part
  quiz: 50, // per correct answer
  zoneComplete: 500, // every animal of a zone collected
  quietZone: 75, // less-visited enclosure (crowd relief)
  statusReport: 15, // community live-status tap
  quizCatchFactor: 0.5, // "Virtual seeker": animal hidden → quiz catch at half XP
}

/** Within ±20 min of a feeding/keeper talk the animal counts as Legendary. */
export function effectiveRarity(sp: Species, poiId: string, schedule: ScheduleItem[], now = new Date()): Rarity {
  const mins = now.getHours() * 60 + now.getMinutes()
  const feeding = schedule.some((s) => {
    if (s.poiId !== poiId) return false
    const [h, m] = s.time.split(':').map(Number)
    return Math.abs(h * 60 + m - mins) <= 20
  })
  return feeding ? 'legendary' : sp.rarity
}

export function catchPoints(opts: {
  rarity: Rarity
  method: 'photo' | 'quiz'
  coop: boolean
  quiet: boolean
}): number {
  let p = RARITY_XP[opts.rarity]
  if (opts.method === 'quiz') p *= BONUS.quizCatchFactor
  if (opts.quiet) p += BONUS.quietZone
  if (opts.coop) p *= 1 + BONUS.coop
  return Math.round(p)
}

export function completedZones(park: ParkPack, captures: Capture[]): string[] {
  const got = new Set(captures.filter((c) => c.parkId === park.id).map((c) => c.speciesId))
  const zones = new Map<string, string[]>()
  const ids = new Set(park.pois.flatMap((p) => (p.type === 'animal' ? p.species ?? [] : [])))
  SPECIES.filter((s) => ids.has(s.id)).forEach((s) => zones.set(s.zone, [...(zones.get(s.zone) ?? []), s.id]))
  return [...zones].filter(([, ids]) => ids.every((id) => got.has(id))).map(([z]) => z)
}

export const LEVELS = [0, 500, 1500, 3000, 5000, 8000, 12000, 18000, 25000]
export function levelOf(xp: number) {
  let lvl = 1
  LEVELS.forEach((t, i) => { if (xp >= t) lvl = i + 1 })
  const next = LEVELS[lvl] ?? LEVELS[LEVELS.length - 1] * 1.5
  const base = LEVELS[lvl - 1]
  return { lvl, progress: Math.min(1, (xp - base) / (next - base)), next }
}
