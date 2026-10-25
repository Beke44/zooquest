import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Baby, CloudRain, Footprints, Sun, Clock, Bell, MapPinned, Sparkles } from 'lucide-react'
import { loc } from '@/i18n'
import { usePark } from '@/lib/park'
import { useStore } from '@/lib/store'
import { buildPlan, leaveAt, type PlanResult } from '@/lib/planner'
import { dist, walkMinutes, type LatLon } from '@/lib/geo'
import { Button, Card, Chip } from '@/components/ui'
import { speciesById } from '@/data/species'

export default function PlanView({ onStart }: { onStart: () => void }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { park, graph: walkGraph, stepFreeGraph, speciesInPark, poi, entrance } = usePark()
  const { state, dispatch } = useStore()
  const defaults = () => {
    const pref = ['lion', 'zebra', 'elephant', 'giraffe', 'penguin', 'tiger'].filter((id) => speciesInPark.some((s) => s.id === id))
    return (pref.length ? pref : speciesInPark.map((s) => s.id)).slice(0, 3)
  }
  const [favs, setFavs] = useState<string[]>(defaults)
  const [showAll, setShowAll] = useState(false)
  // a different zoo was opened → fresh favourites and plan
  useEffect(() => { setFavs(defaults()); setResult(null) }, [park.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [hours, setHours] = useState(3)
  const [stroller, setStroller] = useState(false)
  const [shade, setShade] = useState(false)
  const [rain, setRain] = useState(false)
  const [kids, setKids] = useState(true)
  const [result, setResult] = useState<PlanResult | null>(null)
  const graph = stroller ? stepFreeGraph : walkGraph

  const start: LatLon = entrance ? [entrance.lat, entrance.lon] : park.center

  const toggle = (id: string) =>
    setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : f.length >= 6 ? f : [...f, id]))

  const build = (fixedStops?: string[]) => {
    const r = fixedStops
      ? planFromStops(fixedStops)
      : buildPlan(park, graph, { favs, minutes: hours * 60, stroller, shade, rain, kids, start })
    setResult(r)
    dispatch({ type: 'plan', plan: { stops: r.stops, minutes: hours * 60, stroller, shade, rain, createdAt: Date.now() } })
  }

  const planFromStops = (ids: string[]): PlanResult => {
    let cur = start
    let walk = 0
    const legs = ids.map((id) => {
      const p = poi(id)!
      const r = graph.route(cur, [p.lat, p.lon])
      const m = r?.metres ?? 0
      cur = [p.lat, p.lon]
      const min = walkMinutes(m)
      walk += min
      return { poiId: id, metres: m, min }
    })
    return { stops: ids, walkMin: walk, totalMin: walk + ids.length * 8, dropped: 0, legs }
  }

  const feedings = useMemo(
    () =>
      [...park.schedule]
        .sort((a, b) => a.time.localeCompare(b.time))
        .map((s) => {
          const p = poi(s.poiId)
          const m = p ? dist(start, [p.lat, p.lon]) * 1.25 : 0
          return { ...s, p, leave: leaveAt(s.time, walkMinutes(m)) }
        }),
    [park, poi, start],
  )

  return (
    <div className="space-y-5 px-4 pb-28 pt-4">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay-600">{loc(park.name, lang)}</p>
        <h1 className="font-display text-3xl font-semibold leading-tight text-jungle-900">{t('plan.title')}</h1>
        {park.id !== 'budapest' && park.dataNote && <p className="mt-1 text-xs text-jungle-600">{loc(park.dataNote, lang)}</p>}
      </section>

      <Card className="p-4">
        <label className="flex items-center justify-between font-bold text-jungle-900">
          <span className="flex items-center gap-2"><Clock className="h-5 w-5" /> {t('plan.time')}</span>
          <span className="font-display text-2xl">{hours} h</span>
        </label>
        <input type="range" min={1} max={7} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))}
          className="mt-3 w-full accent-jungle-700" aria-label={t('plan.time')} />
      </Card>

      <Card className="p-4">
        <p className="mb-3 font-bold text-jungle-900">{t('plan.favs')}</p>
        <div className="flex flex-wrap gap-2">
          {(showAll ? speciesInPark : speciesInPark.slice(0, 24)).map((s) => (
            <Chip key={s.id} active={favs.includes(s.id)} onClick={() => toggle(s.id)}>
              <span className="text-lg leading-none">{s.emoji}</span> {loc(s.name, lang)}
            </Chip>
          ))}
          {!showAll && speciesInPark.length > 24 && <Chip onClick={() => setShowAll(true)}>+{speciesInPark.length - 24}</Chip>}
          {speciesInPark.length === 0 && <p className="text-sm text-jungle-700">{t('world.notFound')}</p>}
        </div>
      </Card>

      <Card className="p-4">
        <p className="mb-3 font-bold text-jungle-900">{t('plan.needs')}</p>
        <div className="grid grid-cols-2 gap-2">
          <Chip active={stroller} onClick={() => setStroller(!stroller)}><Baby className="h-4 w-4" />{t('plan.stroller')}</Chip>
          <Chip active={kids} onClick={() => setKids(!kids)}><Footprints className="h-4 w-4" />{t('plan.kids')}</Chip>
          <Chip active={shade} onClick={() => setShade(!shade)}><Sun className="h-4 w-4" />{t('plan.shade')}</Chip>
          <Chip active={rain} onClick={() => setRain(!rain)}><CloudRain className="h-4 w-4" />{t('plan.rain')}</Chip>
        </div>
      </Card>

      <Button className="w-full text-lg" onClick={() => build()} disabled={!favs.length}>
        <Sparkles className="h-5 w-5" /> {t('plan.build')}
      </Button>

      {result && (
        <Card className="overflow-hidden">
          <div className="bg-jungle-800 p-4 text-white">
            <p className="text-sm uppercase tracking-widest text-jungle-200">{t('plan.result')}</p>
            <p className="font-display text-2xl">
              {t('plan.stops', { n: result.stops.length })} · {t('plan.walk', { m: result.walkMin })}
            </p>
            <p className="mt-1 text-sm text-jungle-100">
              {result.dropped ? t('plan.tooLong', { n: result.dropped }) : t('plan.fits', { h: hours })}
            </p>
          </div>
          <ol className="divide-y divide-jungle-100">
            {result.stops.map((id, i) => {
              const p = poi(id)
              if (!p) return null
              const sp = p.species?.[0] ? speciesById[p.species[0]] : null
              const leg = result.legs.find((l) => l.poiId === id)
              return (
                <li key={id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sand-100 text-sm font-black text-jungle-800">{i + 1}</span>
                  <span className="text-2xl">{sp?.emoji ?? iconFor(p.type)}</span>
                  <span className="flex-1 font-semibold text-jungle-900">{loc(p.name, lang)}</span>
                  {leg && <span className="text-sm text-jungle-600">{leg.min} {t('common.min')}</span>}
                </li>
              )
            })}
          </ol>
          <div className="p-4">
            <Button variant="accent" className="w-full" onClick={onStart}><MapPinned className="h-5 w-5" />{t('plan.start')}</Button>
          </div>
        </Card>
      )}

      {park.routes.length > 0 && <section>
        <h2 className="mb-2 font-display text-xl font-semibold text-jungle-900">{t('plan.theme')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {park.routes.map((r) => (
            <button key={r.id} onClick={() => build(r.stops)}
              className="flex items-start gap-3 rounded-3xl bg-white p-4 text-left ring-1 ring-black/5 transition hover:ring-jungle-400 active:scale-[0.99]">
              <span className="text-3xl">{r.emoji}</span>
              <span>
                <span className="block font-bold text-jungle-900">{loc(r.name, lang)}</span>
                <span className="block text-sm text-jungle-700">{loc(r.desc, lang)}</span>
              </span>
            </button>
          ))}
        </div>
      </section>}

      {feedings.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 flex items-center gap-2 font-display text-xl font-semibold text-jungle-900"><Bell className="h-5 w-5" />{t('plan.feeding')}</h2>
          <ul className="space-y-2">
            {feedings.map((f, i) => (
              <li key={i} className="flex items-center justify-between rounded-2xl bg-sand-50 px-3 py-2">
                <span><b className="font-display text-lg">{f.time}</b> · {loc(f.label, lang)}</span>
                <span className="text-xs font-bold text-clay-600">{t('plan.leaveAt', { t: f.leave })}</span>
              </li>
            ))}
          </ul>
          {state.plan && null}
        </Card>
      )}
    </div>
  )
}

export function iconFor(type: string) {
  return ({ toilet: '🚻', food: '🍽️', playground: '🛝', info: 'ℹ️', shop: '🛍️', firstaid: '⛑️', water: '🚰', bench: '🪑', attraction: '⭐', entrance: '🚪', animal: '🐾' } as Record<string, string>)[type] ?? '📍'
}
