/**
 * Finding zoos anywhere: Nominatim search by name, Overpass for "near me",
 * plus an IndexedDB cache so a generated park pack works offline at the zoo.
 */
import type { ParkPack } from '@/types'
import { overpass, type ZooRef } from './osmPack'

// ---------- cache ----------
const DB = 'zooquest-packs'
const STORE = 'packs'
const TTL = 14 * 24 * 3600 * 1000

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}

export async function getCachedPack(id: string): Promise<ParkPack | null> {
  try {
    const db = await open()
    const hit = await new Promise<{ at: number; pack: ParkPack } | undefined>((res) => {
      const q = db.transaction(STORE).objectStore(STORE).get(id)
      q.onsuccess = () => res(q.result)
      q.onerror = () => res(undefined)
    })
    if (hit && Date.now() - hit.at < TTL) return hit.pack
  } catch { /* no IndexedDB */ }
  return null
}

export async function cachePack(pack: ParkPack) {
  try {
    const db = await open()
    db.transaction(STORE, 'readwrite').objectStore(STORE).put({ at: Date.now(), pack }, pack.id)
  } catch { /* ignore */ }
}

// ---------- search ----------
interface NomHit {
  osm_type: 'node' | 'way' | 'relation'
  osm_id: number
  lat: string
  lon: string
  name?: string
  display_name: string
  category?: string
  class?: string
  type: string
  address?: Record<string, string>
}

const refOf = (t: ZooRef['osmType'], id: number, name: string, lat: number, lon: number, city?: string, country?: string): ZooRef => ({
  id: `osm-${t[0]}${id}`, osmType: t, osmId: id, name, lat, lon, city, country,
})

/** Search any zoo on Earth by name (Nominatim, 1 request per search). */
export async function searchZoos(q: string, lang: string, signal?: AbortSignal): Promise<ZooRef[]> {
  // DeepSeek r4: cache searches locally – fewer Nominatim requests, works offline
  const key = `zq-search:${lang}:${q.toLowerCase()}`
  try {
    const hit = JSON.parse(localStorage.getItem(key) ?? 'null') as { at: number; refs: ZooRef[] } | null
    if (hit && Date.now() - hit.at < TTL) return hit.refs
  } catch { /* ignore */ }
  const refs = await searchLive(q, lang, signal)
  try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), refs })) } catch { /* quota */ }
  return refs
}

async function searchLive(q: string, lang: string, signal?: AbortSignal): Promise<ZooRef[]> {
  const run = async (query: string) => {
    const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=12&accept-language=${lang}&q=${encodeURIComponent(query)}`
    const r = await fetch(u, { signal })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return ((await r.json()) as NomHit[]).filter((h) => (h.category ?? h.class) === 'tourism' && ['zoo', 'aquarium'].includes(h.type))
  }
  let hits = await run(q)
  if (!hits.length) hits = await run(`${q} zoo`)
  return hits.map((h) =>
    refOf(h.osm_type, h.osm_id, h.name || h.display_name.split(',')[0], Number(h.lat), Number(h.lon),
      h.address?.city ?? h.address?.town ?? h.address?.village ?? h.address?.state, h.address?.country_code?.toUpperCase()))
}

/** Zoos within ~120 km of the family (Overpass). */
export async function zoosNear(lat: number, lon: number, signal?: AbortSignal, radius = 120000): Promise<(ZooRef & { km: number })[]> {
  const els = await overpass(`[out:json][timeout:40];nwr[tourism=zoo][name](around:${radius},${lat},${lon});out tags center 60;`, signal)
  return els
    .map((e) => {
      const c = e.center ?? (e.lat !== undefined ? { lat: e.lat, lon: e.lon! } : null)
      if (!c || !e.tags?.name) return null
      const km = Math.round(haversineKm(lat, lon, c.lat, c.lon))
      return { ...refOf(e.type, e.id, e.tags.name, c.lat, c.lon, e.tags['addr:city'], e.tags['addr:country']), km }
    })
    .filter((x): x is ZooRef & { km: number } => !!x)
    .sort((a, b) => a.km - b.km)
}

function haversineKm(a: number, b: number, c: number, d: number) {
  const R = 6371, rad = Math.PI / 180
  const s = Math.sin(((c - a) * rad) / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}
