/**
 * Prebuilds park packs for the featured zoos (runs in GitHub Actions, which
 * has normal internet). Featured zoos then open instantly; any other zoo is
 * still built live in the browser.
 *
 * Kind to Overpass: packs younger than MAX_AGE_DAYS are reused from the
 * live site, queries run one at a time with a pause, and a zoo that fails
 * keeps its previous pack (or falls back to live loading in the app).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { WORLD_ZOOS } from '../src/data/world'
import { loadPack, overpass, type ZooRef } from '../src/lib/osmPack'
import type { ParkPack } from '../src/types'

const LIVE = 'https://beke44.github.io/zooquest/packs'
const OUT = 'public/packs'
const MAX_AGE_DAYS = 7
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url)
    return r.ok ? ((await r.json()) as T) : null
  } catch { return null }
}

async function resolve(z: (typeof WORLD_ZOOS)[number]): Promise<ZooRef | null> {
  const els = await overpass(`[out:json][timeout:40];nwr[tourism=zoo](around:2500,${z.lat},${z.lon});out tags center;`)
  const scored = els
    .map((e) => {
      const c = e.center ?? (e.lat !== undefined ? { lat: e.lat, lon: e.lon! } : null)
      return c ? { e, c, d: Math.hypot(c.lat - z.lat, (c.lon - z.lon) * Math.cos((z.lat * Math.PI) / 180)) } : null
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => Number(a.e.type === 'node') - Number(b.e.type === 'node') || a.d - b.d)
  const best = scored[0]
  if (!best) return null
  return {
    id: `osm-${best.e.type[0]}${best.e.id}`, osmType: best.e.type, osmId: best.e.id,
    name: z.name, lat: best.c.lat, lon: best.c.lon, city: z.city, country: z.country,
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const prevFeatured = (await getJson<Record<string, ZooRef>>(`${LIVE}/featured.json`)) ?? {}
  const featured: Record<string, ZooRef> = {}
  let built = 0, reused = 0, failed = 0

  for (const z of WORLD_ZOOS) {
    if (z.id === 'budapest') continue
    try {
      const ref = prevFeatured[z.id] ?? (await resolve(z))
      if (!ref) { console.warn(`! ${z.id}: no tourism=zoo found`); failed++; continue }
      featured[z.id] = ref
      const prev = await getJson<ParkPack>(`${LIVE}/${ref.id}.json`)
      const age = prev ? (Date.now() - Date.parse(prev.version.replace('osm-', ''))) / 864e5 : Infinity
      let pack: ParkPack | null = prev && age < MAX_AGE_DAYS ? prev : null
      if (pack) reused++
      else {
        try {
          pack = await loadPack(ref)
          built++
          await sleep(4000)
        } catch (e) {
          pack = prev // keep the older pack rather than nothing
          console.warn(`! ${z.id}: overpass failed (${(e as Error).message})${prev ? ', kept previous pack' : ''}`)
          if (!prev) failed++
        }
      }
      if (pack) {
        writeFileSync(`${OUT}/${ref.id}.json`, JSON.stringify(pack))
        const animals = pack.pois.filter((p) => p.type === 'animal').length
        console.log(`✓ ${z.id.padEnd(12)} ${ref.id.padEnd(16)} ${String(animals).padStart(3)} animals, ${pack.paths.length} paths`)
      }
    } catch (e) {
      failed++
      if (prevFeatured[z.id]) featured[z.id] = prevFeatured[z.id]
      console.warn(`! ${z.id}: ${(e as Error).message}`)
    }
  }
  writeFileSync(`${OUT}/featured.json`, JSON.stringify(featured))
  console.log(`done: ${built} built, ${reused} reused, ${failed} failed`)
}

main()
