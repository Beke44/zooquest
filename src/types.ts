export type Lang = 'hu' | 'en' | 'de' | 'es'
export type Localized = Partial<Record<Lang, string>> & { hu: string; en: string }

export type PoiType =
  | 'animal' | 'toilet' | 'food' | 'playground' | 'info' | 'shop'
  | 'firstaid' | 'water' | 'bench' | 'attraction' | 'entrance'

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
export type DataSource = 'osm' | 'osm-validated' | 'manual' | 'approx' | 'community'
export type PoiStatus = 'open' | 'closed' | 'unknown'

export interface Poi {
  id: string
  type: PoiType
  name: Localized
  lat: number
  lon: number
  species?: string[]
  indoor?: boolean
  approx?: boolean
  zone?: string
  status?: PoiStatus
  shade?: boolean
  babycare?: boolean
  accessible?: boolean
  /** DeepSeek (round 3): where this item came from, for auditability */
  source?: DataSource
  verifiedAt?: string
  /** original OpenStreetMap label (e.g. 'ázsiai oroszlán') */
  osmName?: string
}

export interface Species {
  id: string
  emoji: string
  name: Localized
  latin: string
  rarity: Rarity
  zone: string
  fact: Localized
  quiz: { q: Localized; options: Localized[]; answer: number }
  activeHours?: [number, number]
}

export interface ScheduleItem {
  poiId: string
  time: string
  label: Localized
  validFrom?: string
  validTo?: string
  source?: DataSource
}

export interface ThemeRoute {
  id: string
  emoji: string
  name: Localized
  desc: Localized
  stops: string[]
}

export interface ParkPack {
  schemaVersion: 1
  id: string
  version: string
  name: Localized
  city: string
  country: string
  center: [number, number]
  bounds: [[number, number], [number, number]]
  boundary?: [number, number][]
  pois: Poi[]
  paths: [number, number][][]
  /** indexes into paths that are stairs – skipped for strollers/wheelchairs */
  steps?: number[]
  /** optional park-specific species; shared cards live in data/species.ts */
  species?: Species[]
  schedule: ScheduleItem[]
  routes: ThemeRoute[]
  hours?: string
  sources: string[]
  dataNote?: Localized
}

export interface WorldZoo {
  id: string
  name: string
  city: string
  country: string
  flag: string
  lat: number
  lon: number
  status: 'live' | 'soon'
}

export interface Capture {
  id: string
  speciesId: string
  poiId: string
  parkId: string
  at: number
  photoKey?: string
  method: 'photo' | 'quiz'
  points: number
  lat?: number
  lon?: number
}

export interface StatusReport {
  id: string
  poiId: string
  kind: 'clean' | 'dirty' | 'queue' | 'closed' | 'active' | 'sleeping'
  at: number
}
