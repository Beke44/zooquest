import type { ParkPack, Poi } from '@/types'
import { dist, walkMinutes, type LatLon } from './geo'
import { orderStops, type WalkGraph } from './router'

export interface PlanInput {
  favs: string[] // species ids
  minutes: number
  stroller: boolean
  shade: boolean
  rain: boolean
  kids: boolean
  start: LatLon
}

export interface PlanResult {
  stops: string[] // poi ids in order
  walkMin: number
  totalMin: number
  dropped: number
  legs: { poiId: string; metres: number; min: number }[]
}

const STAY_MIN = 8 // minutes spent at an enclosure
const BREAK_EVERY = 75 // add a rest stop every ~75 min with small kids

/**
 * "Mi fér bele?" planner (ChatGPT round 1): favourites first, then nearby
 * extras while time allows; rain prefers indoor houses, heat/kids add
 * rest stops (benches, water, food) – answers the "too much walking,
 * no shade, tired kids" complaints.
 */
export function buildPlan(park: ParkPack, graph: WalkGraph, input: PlanInput): PlanResult {
  const animals = park.pois.filter((p) => p.type === 'animal' && p.status !== 'closed')
  const favPois = uniq(input.favs.map((sid) => animals.find((p) => p.species?.includes(sid))).filter(Boolean) as Poi[])
  let chosen = [...favPois]

  // fill with extras near the chosen ones (rain → indoor first)
  const extras = animals
    .filter((p) => !chosen.includes(p))
    .sort((a, b) => {
      const ia = input.rain && a.indoor ? -400 : 0
      const ib = input.rain && b.indoor ? -400 : 0
      return nearestTo(a, chosen, input.start) + ia - (nearestTo(b, chosen, input.start) + ib)
    })

  const pace = input.kids ? 'family' : 'normal'
  const evaluate = (pois: Poi[]) => {
    const order = orderStops(input.start, pois.map((p) => ({ id: p.id, p: [p.lat, p.lon] as LatLon })))
    let cur = input.start
    let walk = 0
    const legs: PlanResult['legs'] = []
    for (const id of order) {
      const p = park.pois.find((x) => x.id === id)!
      const r = graph.route(cur, [p.lat, p.lon])
      const m = r?.metres ?? dist(cur, [p.lat, p.lon])
      const min = walkMinutes(m, pace)
      walk += min
      legs.push({ poiId: id, metres: m, min })
      cur = [p.lat, p.lon]
    }
    const stay = order.length * STAY_MIN
    const breaks = (input.kids || input.shade ? Math.floor((walk + stay) / BREAK_EVERY) : 0) * 12
    return { order, walk, total: walk + stay + breaks, legs }
  }

  let best = evaluate(chosen)
  for (const e of extras) {
    const trial = evaluate([...chosen, e])
    if (trial.total > input.minutes) break
    chosen = [...chosen, e]
    best = trial
  }
  let dropped = 0
  while (best.total > input.minutes && chosen.length > 1) {
    chosen = chosen.slice(0, -1)
    dropped++
    best = evaluate(chosen)
  }

  // insert rest stops (benches / water / food / playground) between legs
  let stops = best.order
  if (input.kids || input.shade) {
    const rests = park.pois.filter((p) => ['bench', 'water', 'food', 'playground'].includes(p.type) && (!input.shade || p.shade !== false))
    const out: string[] = []
    let acc = 0
    best.legs.forEach((leg) => {
      acc += leg.min + STAY_MIN
      out.push(leg.poiId)
      if (acc >= BREAK_EVERY && rests.length) {
        const here = park.pois.find((p) => p.id === leg.poiId)!
        const r = [...rests].sort((a, b) => dist([a.lat, a.lon], [here.lat, here.lon]) - dist([b.lat, b.lon], [here.lat, here.lon]))[0]
        if (r && !out.includes(r.id)) out.push(r.id)
        acc = 0
      }
    })
    stops = out
  }
  return { stops, walkMin: best.walk, totalMin: best.total, dropped, legs: best.legs }
}

function nearestTo(p: Poi, set: Poi[], start: LatLon) {
  const pts: LatLon[] = set.length ? set.map((s) => [s.lat, s.lon]) : [start]
  return Math.min(...pts.map((q) => dist([p.lat, p.lon], q)))
}

function uniq<T>(a: T[]) { return [...new Set(a)] }

/** When to leave the current spot to reach a feeding on time (+5 min buffer). */
export function leaveAt(time: string, walkMin: number): string {
  const [h, m] = time.split(':').map(Number)
  const t = h * 60 + m - walkMin - 5
  const hh = Math.floor(((t % 1440) + 1440) % 1440 / 60)
  const mm = ((t % 60) + 60) % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}
