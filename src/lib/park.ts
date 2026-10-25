import { useMemo } from 'react'
import { BUDAPEST } from '@/data/budapest'
import { speciesById } from '@/data/species'
import type { ParkPack, Poi, Species } from '@/types'
import { WalkGraph } from './router'

// Animal POIs take their display name from the shared species cards.
function withSpeciesNames(p: ParkPack): ParkPack {
  return {
    ...p,
    pois: p.pois.map((poi) => {
      const sp = poi.type === 'animal' && poi.species?.[0] ? speciesById[poi.species[0]] : null
      return sp ? { ...poi, name: sp.name } : poi
    }),
  }
}

export const PARKS: Record<string, ParkPack> = { budapest: withSpeciesNames(BUDAPEST) }

const graphs = new Map<string, WalkGraph>()
/** stepFree = stroller / wheelchair profile: stairs are removed from the graph. */
export function graphFor(p: ParkPack, stepFree = false) {
  const key = `${p.id}:${stepFree}`
  if (!graphs.has(key)) {
    const steps = new Set(p.steps ?? [])
    graphs.set(key, new WalkGraph(stepFree ? p.paths.filter((_, i) => !steps.has(i)) : p.paths))
  }
  return graphs.get(key)!
}

export function usePark(id = 'budapest') {
  const park = PARKS[id] ?? PARKS.budapest
  return useMemo(() => {
    const graph = graphFor(park)
    const stepFreeGraph = graphFor(park, true)
    const animalPois = park.pois.filter((p) => p.type === 'animal' && p.species?.length)
    const speciesInPark: Species[] = [...new Set(animalPois.flatMap((p) => p.species!))]
      .map((id) => speciesById[id])
      .filter(Boolean)
    const poiOfSpecies = (sid: string): Poi | undefined => animalPois.find((p) => p.species!.includes(sid))
    const poi = (pid: string) => park.pois.find((p) => p.id === pid)
    const entrance = park.pois.find((p) => p.type === 'entrance') ?? null
    return { park, graph, stepFreeGraph, animalPois, speciesInPark, poiOfSpecies, poi, entrance }
  }, [park])
}
