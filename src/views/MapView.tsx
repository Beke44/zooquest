import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Circle, MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Coffee, Crosshair, DoorOpen, EyeOff, Navigation, Toilet, X } from 'lucide-react'
import { loc } from '@/i18n'
import { usePark } from '@/lib/park'
import { freshReports, helperToday, HELPER_DAILY_CAP, useStore } from '@/lib/store'
import { useGeo, useWakeLock } from '@/lib/useGeo'
import { bearing, dist, formatDistance, walkMinutes, type LatLon } from '@/lib/geo'
import { BONUS } from '@/lib/scoring'
import { toast } from '@/lib/toast'
import { speciesById } from '@/data/species'
import type { Poi, StatusReport } from '@/types'
import CatchSheet from '@/components/CatchSheet'
import { Button, Sheet } from '@/components/ui'
import { communityPlaces, entries as communityEntries, initializeCommunity, type Entry, type CommunityPlaceType } from '@/features/community/api'
import { iconFor } from './PlanView'

const ARRIVE_M = 30
const COMMUNITY_EMOJI: Record<CommunityPlaceType, string> = { animal: '🐾', toilet: '🚻', food: '🍽️', water: '💧', bench: '🪑', info: 'ℹ️' }
const COMMUNITY_LABEL = {
  hu: { confirmed: 'Közösség által megerősítve', note: 'Látogatói helyjelölés. Ehhez a ponthoz nincs ellenőrzött navigációs útvonal.' },
  en: { confirmed: 'Community confirmed', note: 'Visitor-contributed location. No verified navigation route is available for this point.' },
  de: { confirmed: 'Von der Community bestätigt', note: 'Von Besuchern markierter Ort. Für diesen Punkt ist keine geprüfte Navigationsroute verfügbar.' },
  es: { confirmed: 'Confirmado por la comunidad', note: 'Lugar aportado por visitantes. No hay una ruta de navegación verificada a este punto.' },
}

function emojiIcon(emoji: string, opts: { big?: boolean; done?: boolean; next?: boolean; closed?: boolean } = {}) {
  const s = opts.big ? 44 : 32
  const ring = opts.next ? '#d1603a' : opts.done ? '#5f9a63' : '#ffffff'
  return L.divIcon({
    className: '',
    html: `<div style="width:${s}px;height:${s}px;display:grid;place-items:center;border-radius:999px;background:#fbf8f1;border:3px solid ${ring};box-shadow:0 3px 10px rgba(18,43,25,.28);font-size:${opts.big ? 24 : 17}px;${opts.closed ? 'filter:grayscale(1);opacity:.55;' : ''}${opts.next ? 'animation:pulse 1.6s infinite;' : ''}">${emoji}${opts.done ? '<span style="position:absolute;right:-4px;bottom:-4px;font-size:12px">✅</span>' : ''}</div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
  })
}

const youIcon = L.divIcon({
  className: '',
  html: '<div style="width:20px;height:20px;border-radius:999px;background:#2563eb;border:4px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function TapToSet({ enabled, onTap }: { enabled: boolean; onTap: (p: LatLon) => void }) {
  useMapEvents({ click: (e) => enabled && onTap([e.latlng.lat, e.latlng.lng]) })
  return null
}

function ZoomWatch({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) })
  return null
}

/** Opens on the family (or the gate in demo mode) once, at walking zoom. */
function StartAt({ at, center }: { at: LatLon | null; center: LatLon }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (at && !done.current) {
      // keep the family on screen but show the zoo ahead of them
      map.setView([(at[0] * 2 + center[0]) / 3, (at[1] * 2 + center[1]) / 3], 17)
      done.current = true
    }
  }, [at, map])
  return null
}

function FlyTo({ target }: { target: LatLon | null }) {
  const map = useMap()
  useEffect(() => { if (target) map.flyTo(target, Math.max(map.getZoom(), 18), { duration: 0.6 }) }, [target, map])
  return null
}

export default function MapView() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { park, graph, stepFreeGraph, poi, entrance } = usePark()
  const { state, dispatch } = useStore()
  // the family counts as 'at the zoo' within the park's own size + 500 m
  const parkRadius = useMemo(() => Math.max(1200, dist(park.bounds[0], park.bounds[1]) / 2 + 500), [park])
  const geo = useGeo(park.center, parkRadius)
  const [selected, setSelected] = useState<Poi | null>(null)
  const [catching, setCatching] = useState<Poi | null>(null)
  const [target, setTarget] = useState<string | null>(null)
  const [fly, setFly] = useState<LatLon | null>(null)
  const [now, setNow] = useState(Date.now())
  const [zoom, setZoom] = useState(17)
  const [community, setCommunity] = useState<Entry[]>([])
  const communityLabel = COMMUNITY_LABEL[lang.slice(0, 2) as keyof typeof COMMUNITY_LABEL] ?? COMMUNITY_LABEL.en
  const communityPins = useMemo(() => communityPlaces(community, park.id, park.bounds), [community, park.id, park.bounds])
  useEffect(() => {
    let live = true
    let fetching = false
    setCommunity([])
    async function refreshCommunity() {
      if (fetching) return
      fetching = true
      try {
        const config = await initializeCommunity()
        if (!live || config.mode === 'draft') return
        const points = await communityEntries(park.id)
        if (live) setCommunity(points)
      } catch { /* optional community layer must never block the park map */ }
      finally { fetching = false }
    }
    void refreshCommunity()
    const timer = setInterval(() => { void refreshCommunity() }, 60000)
    return () => { live = false; clearInterval(timer) }
  }, [park.id])
  useWakeLock(true)
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(i) }, [])

  // Demo mode: away from the zoo we start at the main gate and let the user tap to move.
  const here: LatLon | null = geo.pos ?? (geo.demo && entrance ? [entrance.lat, entrance.lon] : null)
  const g = state.plan?.stroller ? stepFreeGraph : graph

  const planStops = state.plan?.stops ?? []
  const remaining = planStops.filter((id) => !state.visited.includes(id) && !isClosed(id))
  const nextId = target ?? remaining[0] ?? null
  const next = nextId ? poi(nextId) : null

  const route = useMemo(() => (here && next ? g.route(here, [next.lat, next.lon]) : null), [here, next, g])
  const nextDist = here && next ? dist(here, [next.lat, next.lon]) : null

  function isClosed(id: string) {
    const r = freshReports(state.reports, id, now)[0]
    return r?.kind === 'closed' || poi(id)?.status === 'closed'
  }

  // mark arrival
  useEffect(() => {
    if (next && nextDist !== null && nextDist < ARRIVE_M && !state.visited.includes(next.id)) {
      dispatch({ type: 'visit', poiId: next.id })
      if (target === next.id) setTarget(null)
      toast(t('map.arrived'))
      if (next.type === 'animal') setSelected(next)
    }
  }, [next, nextDist, state.visited, dispatch, t, target])

  const nearestOf = (types: Poi['type'][], filter?: (p: Poi) => boolean) => {
    if (!here) return null
    const cands = park.pois.filter((p) => types.includes(p.type) && (!filter || filter(p)) && !isClosed(p.id))
    let best: Poi | null = null
    let bestM = Infinity
    for (const c of cands) {
      const r = g.route(here, [c.lat, c.lon])
      if (r && r.metres < bestM) { bestM = r.metres; best = c }
    }
    return best
  }

  const quick = (kind: 'toilet' | 'rest' | 'exit') => {
    const p =
      kind === 'toilet' ? nearestOf(['toilet'])
        : kind === 'rest' ? nearestOf(['food', 'bench', 'playground', 'water'])
          : nearestOf(['entrance'])
    if (!p) return
    setTarget(p.id)
    setFly([p.lat, p.lon])
    toast(t('map.nearest', { name: loc(p.name, lang) }))
  }

  // "Can't see it" (ChatGPT) → skip without penalty, re-plan to the next stop (Gemini: Safari Hero)
  const cantSee = () => {
    if (!next) return
    report(next.id, 'sleeping', false)
    dispatch({ type: 'visit', poiId: next.id })
    dispatch({ type: 'badge', id: 'hero' })
    dispatch({ type: 'xp', event: { at: Date.now(), points: 50, reason: 'hero' } })
    setTarget(null)
    toast(t('map.replanned'))
    if (next.type === 'animal') setSelected(next)
  }

  const report = (poiId: string, kind: StatusReport['kind'], announce = true) => {
    const capped = helperToday(state.helper) >= HELPER_DAILY_CAP
    const pts = capped ? 0 : BONUS.statusReport
    dispatch({ type: 'report', report: { id: String(Date.now()), poiId, kind, at: Date.now() }, points: pts })
    if (helperToday(state.helper) + 1 >= 3) dispatch({ type: 'badge', id: 'helper' })
    if (announce) toast(t('map.reportThanks', { p: pts }))
  }

  const sel = selected
  const selSp = sel?.species?.[0] ? speciesById[sel.species[0]] : null
  const selDist = sel && here ? dist(here, [sel.lat, sel.lon]) : Infinity
  const selReports = sel ? freshReports(state.reports, sel.id, now) : []
  const feed = (id: string) => park.schedule.find((s) => s.poiId === id && s.time >= new Date().toTimeString().slice(0, 5))
  const caught = new Set(state.captures.map((c) => c.speciesId))

  return (
    <div className="relative h-[calc(100dvh-8.5rem)] w-full">
      <MapContainer center={park.center} zoom={17} minZoom={15} maxZoom={20} maxBounds={L.latLngBounds(park.bounds).pad(0.6)} className="h-full w-full" zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxNativeZoom={19} maxZoom={20} attribution="© OpenStreetMap" />
        {park.boundary && <Polygon positions={park.boundary} pathOptions={{ color: '#2f6b38', weight: 2, fillColor: '#5f9a63', fillOpacity: 0.07, dashArray: '6 6' }} />}
        {park.paths.map((p, i) => (
          <Polyline key={i} positions={p} pathOptions={{ color: (park.steps ?? []).includes(i) ? '#d1603a' : '#e9d9b4', weight: 3, opacity: 0.9 }} interactive={false} />
        ))}
        {route && <Polyline positions={route.line} pathOptions={{ color: '#245530', weight: 7, opacity: 0.85, lineCap: 'round' }} />}
        {route && <Polyline positions={route.line} pathOptions={{ color: '#fbf8f1', weight: 2, dashArray: '2 10', opacity: 1 }} />}
        {park.pois.filter((p) => {
          if (p.id === nextId || p.id === target) return true
          if (p.type === 'animal' || p.type === 'toilet' || p.type === 'entrance') return true
          if (p.type === 'bench' || p.type === 'water') return zoom >= 19 || (state.plan?.shade && p.type === 'water')
          return zoom >= 18 // food, playgrounds, houses, statues appear when zoomed in
        }).map((p) => {
          const sp = p.species?.[0] ? speciesById[p.species[0]] : null
          return (
            <Marker key={p.id} position={[p.lat, p.lon]} eventHandlers={{ click: () => setSelected(p) }}
              icon={emojiIcon(sp?.emoji ?? iconFor(p.type), { big: !!sp, next: p.id === nextId, done: !!sp && caught.has(sp.id), closed: isClosed(p.id) })} />
          )
        })}
        {communityPins.map((entry) => <Marker key={`community:${entry.id}`} position={[entry.lat, entry.lon]}
          icon={emojiIcon(COMMUNITY_EMOJI[entry.place_type ?? 'info'], { done: true })}>
          <Popup>
            <div className="max-w-[16rem] space-y-2 text-jungle-900">
              <strong className="block break-words">{entry.title}</strong>
              <p className="whitespace-pre-wrap break-words">{entry.body}</p>
              <p className="text-xs font-bold text-jungle-700">✓ {communityLabel.confirmed} · {entry.confirmations}/10</p>
              <p className="text-xs text-jungle-600">{communityLabel.note}</p>
            </div>
          </Popup>
        </Marker>)}
        {here && geo.accuracy && geo.source === 'gps' && <Circle center={here} radius={geo.accuracy} pathOptions={{ color: '#2563eb', weight: 1, fillOpacity: 0.08 }} />}
        {here && <Marker position={here} icon={youIcon} />}
        <TapToSet enabled={geo.demo || (geo.accuracy ?? 0) > 35} onTap={geo.setManual} />
        <FlyTo target={fly} />
        <StartAt at={here} center={park.center} />
        <ZoomWatch onZoom={setZoom} />
      </MapContainer>

      {/* status strip */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex flex-col gap-2">
        {(geo.demo || (geo.accuracy ?? 0) > 35) && (
          <div className="pointer-events-auto rounded-2xl bg-sand-50/95 px-3 py-2 text-sm font-semibold text-jungle-900 shadow ring-1 ring-black/5">
            {geo.demo ? t('map.simulate') : t('map.weak')}
            {geo.accuracy && !geo.demo && <span className="ml-1 text-jungle-600">· {t('map.accuracy', { m: Math.round(geo.accuracy) })}</span>}
          </div>
        )}
        {next && here && (
          <div className="pointer-events-auto flex items-center gap-3 rounded-3xl bg-jungle-800 px-4 py-3 text-white shadow-xl">
            <Navigation className="h-6 w-6 shrink-0 text-sand-200" style={{ transform: `rotate(${bearing(here, [next.lat, next.lon]) - 45}deg)` }} />
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-widest text-jungle-200">{t('map.next')}</p>
              <p className="truncate font-display text-xl">{(next.species?.[0] && speciesById[next.species[0]]?.emoji) || iconFor(next.type)} {loc(next.name, lang)}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-xl">{formatDistance(route?.metres ?? nextDist ?? 0)}</p>
              <p className="text-xs text-jungle-200">{walkMinutes(route?.metres ?? (nextDist ?? 0) * 1.3)} {t('common.min')}</p>
            </div>
            {target && <button onClick={() => setTarget(null)} aria-label={t('common.close')}><X className="h-5 w-5" /></button>}
          </div>
        )}
        {next && here && !park.paths.length && (
          <p className="pointer-events-auto rounded-2xl bg-sand-100/95 px-3 py-1.5 text-xs font-bold text-sand-600 shadow-sm">{t('map.noPaths')}</p>
        )}
      </div>

      {/* quick actions – answers to the top complaints */}
      <div className="absolute inset-x-3 bottom-3 z-[500] grid grid-cols-4 gap-2">
        <QuickBtn icon={<Toilet className="h-5 w-5" />} label={t('map.toilet')} onClick={() => quick('toilet')} />
        <QuickBtn icon={<Coffee className="h-5 w-5" />} label={t('map.rest')} onClick={() => quick('rest')} />
        <QuickBtn icon={<EyeOff className="h-5 w-5" />} label={t('map.cantSee')} onClick={cantSee} disabled={!next} />
        <QuickBtn icon={<DoorOpen className="h-5 w-5" />} label={t('map.exit')} onClick={() => quick('exit')} />
      </div>
      <button onClick={() => here && setFly([...here] as LatLon)} className="absolute bottom-24 right-3 z-[500] grid h-12 w-12 place-items-center rounded-full bg-white text-jungle-800 shadow-lg ring-1 ring-black/5" aria-label={t('map.locate')}>
        <Crosshair className="h-6 w-6" />
      </button>

      <Sheet open={!!sel && !catching} onClose={() => setSelected(null)}>
        {sel && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-5xl">{selSp?.emoji ?? iconFor(sel.type)}</span>
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-semibold text-jungle-900">{loc(sel.name, lang)}</h2>
                <p className="text-sm text-jungle-600">
                  {here ? `${formatDistance(g.route(here, [sel.lat, sel.lon])?.metres ?? selDist)} · ` : ''}
                  {sel.osmName && sel.osmName !== loc(sel.name, lang) ? `${sel.osmName} · ` : ''}
                  {sel.indoor ? '🏠 ' : ''}{sel.babycare ? '🚼 ' : ''}
                  {isClosed(sel.id) && <b className="text-clay-600">{t('map.closed')}</b>}
                </p>
              </div>
            </div>
            {feed(sel.id) && <p className="rounded-2xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-900">🍖 {t('map.feedingSoon', { t: feed(sel.id)!.time })} – {loc(feed(sel.id)!.label, lang)}</p>}
            {selReports.length > 0 && (
              <p className="text-sm text-jungle-700">
                {selReports.slice(0, 2).map((r) => `${t(`report.${r.kind}`)} (${Math.round((now - r.at) / 60000)}′)`).join(' · ')}
              </p>
            )}
            {selSp && (
              <Button className="w-full text-lg" onClick={() => setCatching(sel)}>📸 {t('map.catch')}</Button>
            )}
            <Button variant="ghost" className="w-full" onClick={() => { setTarget(sel.id); setSelected(null) }}>
              <Navigation className="h-5 w-5" />{t('map.next')}: {loc(sel.name, lang)}
            </Button>
            <div>
              <p className="mb-2 text-sm font-bold text-jungle-900">{t('map.report')}</p>
              <div className="flex flex-wrap gap-2">
                {(sel.type === 'toilet' ? ['clean', 'dirty', 'queue', 'closed'] : sel.type === 'food' ? ['queue', 'closed'] : selSp ? ['active', 'sleeping', 'closed'] : ['queue', 'closed']).map((k) => (
                  <button key={k} onClick={() => report(sel.id, k as StatusReport['kind'])}
                    className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-jungle-900 ring-1 ring-jungle-200 active:scale-95">{t(`report.${k}`)}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Sheet>

      {catching && selSp && (
        <CatchSheet poi={catching} sp={selSp} distance={selDist} accuracy={geo.accuracy} demo={geo.demo}
          onClose={() => { setCatching(null); setSelected(null) }} />
      )}
    </div>
  )
}

function QuickBtn({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex flex-col items-center gap-1 rounded-2xl bg-white/95 px-1 py-2 text-[11px] font-bold leading-tight text-jungle-900 shadow-lg ring-1 ring-black/5 active:scale-95 disabled:opacity-40">
      {icon}<span className="text-center">{label}</span>
    </button>
  )
}
