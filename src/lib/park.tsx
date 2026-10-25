import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BUDAPEST } from '@/data/budapest'
import { speciesById } from '@/data/species'
import type { ParkPack, Poi, Species } from '@/types'
import { WalkGraph } from './router'
import { loadPack, type ZooRef } from './osmPack'
import { cachePack, getCachedPack } from './zooDirectory'
import { useStore } from './store'

// Animal POIs take their display name from the species cards.
function withSpeciesNames(p: ParkPack): ParkPack {
  return {
    ...p,
    pois: p.pois.map((poi) => {
      const sp = poi.type === 'animal' && poi.species?.[0] ? speciesById[poi.species[0]] : null
      return sp ? { ...poi, name: sp.name } : poi
    }),
  }
}

export const BUDAPEST_PACK = withSpeciesNames(BUDAPEST)

const graphs = new Map<string, WalkGraph>()
/** stepFree = stroller / wheelchair profile: stairs are removed from the graph. */
export function graphFor(p: ParkPack, stepFree = false) {
  const key = `${p.id}:${p.version}:${stepFree}`
  if (!graphs.has(key)) {
    const steps = new Set(p.steps ?? [])
    graphs.set(key, new WalkGraph(stepFree ? p.paths.filter((_, i) => !steps.has(i)) : p.paths))
  }
  return graphs.get(key)!
}

type Status = 'ready' | 'loading' | 'error'
interface ParkCtx { park: ParkPack; status: Status; zoo: ZooRef | null; retry: () => void }
const Ctx = createContext<ParkCtx>({ park: BUDAPEST_PACK, status: 'ready', zoo: null, retry: () => {} })

/** Serves the zoo the family picked: Budapest built in, others from cache or OSM. */
export function ParkProvider({ children }: { children: ReactNode }) {
  const { state } = useStore()
  const zoo = state.zoo
  const [park, setPark] = useState<ParkPack>(BUDAPEST_PACK)
  const [status, setStatus] = useState<Status>('ready')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!zoo || zoo.id === 'budapest') { setPark(BUDAPEST_PACK); setStatus('ready'); return }
    const ac = new AbortController()
    let alive = true
    setStatus('loading')
    ;(async () => {
      const cached = await getCachedPack(zoo.id)
      if (cached && alive) { setPark(cached); setStatus('ready'); return }
      try {
        const pack = await loadPack(zoo, ac.signal)
        if (!alive) return
        await cachePack(pack)
        setPark(pack)
        setStatus('ready')
      } catch {
        if (alive) setStatus('error')
      }
    })()
    return () => { alive = false; ac.abort() }
  }, [zoo, attempt])

  const value = useMemo(() => ({ park, status, zoo, retry: () => setAttempt((a) => a + 1) }), [park, status, zoo])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useParkStatus() {
  return useContext(Ctx)
}

export function usePark() {
  const { park } = useContext(Ctx)
  return useMemo(() => {
    const graph = graphFor(park)
    const stepFreeGraph = graphFor(park, true)
    const animalPois = park.pois.filter((p) => p.type === 'animal' && p.species?.length)
    const speciesInPark: Species[] = [...new Set(animalPois.flatMap((p) => p.species!))]
      .map((id) => speciesById[id])
      .filter(Boolean)
    const poiOfSpecies = (sid: string): Poi | undefined => animalPois.find((p) => p.species!.includes(sid))
    const poi = (pid: string) => park.pois.find((p) => p.id === pid)
    const entrance = park.pois.find((p) => p.id === 'main-gate') ?? park.pois.find((p) => p.type === 'entrance') ?? null
    return { park, graph, stepFreeGraph, animalPois, speciesInPark, poiOfSpecies, poi, entrance }
  }, [park])
}
