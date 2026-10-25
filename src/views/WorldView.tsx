import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { Globe2, LocateFixed, Loader2, Search } from 'lucide-react'
import { WORLD_ZOOS } from '@/data/world'
import { useStore } from '@/lib/store'
import { useParkStatus } from '@/lib/park'
import { searchZoos, zoosNear } from '@/lib/zooDirectory'
import type { ZooRef } from '@/lib/osmPack'
import { toast } from '@/lib/toast'
import { loc } from '@/i18n'
import { Button, Card } from '@/components/ui'

const pin = (on: boolean) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${on ? 22 : 14}px;height:${on ? 22 : 14}px;border-radius:999px;background:${on ? '#d1603a' : '#2f6b38'};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
    iconSize: [on ? 22 : 14, on ? 22 : 14],
    iconAnchor: [on ? 11 : 7, on ? 11 : 7],
  })

const flag = (cc?: string) =>
  cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '🌍'

export default function WorldView({ onOpen }: { onOpen: () => void }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.slice(0, 2)
  const { state, dispatch } = useStore()
  const { park } = useParkStatus()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<'search' | 'near' | string | null>(null)
  const [results, setResults] = useState<(ZooRef & { km?: number })[] | null>(null)

  const open = (z: ZooRef | null) => {
    dispatch({ type: 'zoo', zoo: z })
    onOpen()
  }

  const doSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (q.trim().length < 2) return
    setBusy('search')
    try { setResults(await searchZoos(q.trim(), lang)) } catch { toast(t('world.netError')) } finally { setBusy(null) }
  }

  const near = () => {
    if (!('geolocation' in navigator)) { toast(t('world.noGeo')); return }
    setBusy('near')
    navigator.geolocation.getCurrentPosition(
      async (g) => {
        try { setResults(await zoosNear(g.coords.latitude, g.coords.longitude)) } catch { toast(t('world.netError')) } finally { setBusy(null) }
      },
      () => { setBusy(null); toast(t('world.noGeo')) },
      { timeout: 15000, maximumAge: 600000 },
    )
  }

  // curated list → resolve to the real OSM object on first open
  const openCurated = async (z: (typeof WORLD_ZOOS)[number]) => {
    if (z.id === 'budapest') return open(null)
    setBusy(z.id)
    try {
      const hits = await zoosNear(z.lat, z.lon, undefined, 2500)
      // prefer the big area over a stray point (e.g. a gate tagged as zoo)
      const best = hits.find((h) => h.osmType !== 'node') ?? hits[0]
      if (!best) { toast(t('world.notFound')); return }
      open({ ...best, name: z.name, city: z.city, country: z.country })
    } catch { toast(t('world.netError')) } finally { setBusy(null) }
  }

  const cov = park.coverage
  const curId = state.zoo?.id ?? 'budapest'

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <h1 className="flex items-center gap-2 font-display text-3xl font-semibold text-jungle-900"><Globe2 className="h-7 w-7" />{t('world.title')}</h1>
      <p className="text-jungle-700">{t('world.sub')}</p>

      {/* current zoo + honest data coverage (ChatGPT r4) */}
      <Card className="p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-clay-600">{t('world.current')}</p>
        <p className="font-display text-2xl text-jungle-900">{flag(park.country)} {loc(park.name, lang)}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
          <CovChip ok={cov ? cov.paths : true} label={t('world.covPaths')} />
          <CovChip ok={(cov?.animals ?? 19) >= 5} label={t('world.covAnimals', { n: cov?.animals ?? park.pois.filter((p) => p.type === 'animal').length })} />
          <CovChip ok={(cov?.facilities ?? 10) >= 3} label={t('world.covServices')} />
          <CovChip ok={park.schedule.length > 0} label={t('world.covFeeding')} />
        </div>
        {park.dataNote && <p className="mt-2 text-xs text-jungle-600">{loc(park.dataNote, lang)}</p>}
      </Card>

      <form onSubmit={doSearch} className="flex gap-2">
        <label className="sr-only" htmlFor="zoo-search">{t('world.search')}</label>
        <input id="zoo-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('world.searchPh')}
          className="min-w-0 flex-1 rounded-2xl border-0 bg-white px-4 py-3 font-semibold text-jungle-900 ring-1 ring-jungle-200 focus:ring-2 focus:ring-jungle-600" />
        <Button type="submit" disabled={busy === 'search'}>{busy === 'search' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}</Button>
      </form>
      <Button variant="ghost" className="w-full" onClick={near} disabled={busy === 'near'}>
        {busy === 'near' ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}{t('world.near')}
      </Button>

      {results && (
        <section className="space-y-2">
          {results.length === 0 && <p className="text-sm text-jungle-700">{t('world.notFound')}</p>}
          {results.map((z) => (
            <ZooRow key={z.id} flag={flag(z.country)} name={z.name} sub={[z.city, z.km !== undefined ? `${z.km} km` : null].filter(Boolean).join(' · ')}
              active={z.id === curId} onOpen={() => open(z)} label={t('world.open')} />
          ))}
        </section>
      )}

      {state.recentZoos.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-xl font-semibold text-jungle-900">{t('world.recent')}</h2>
          <ZooRow flag="🇭🇺" name="Fővárosi Állat- és Növénykert" sub="Budapest" active={curId === 'budapest'} onOpen={() => open(null)} label={t('world.open')} />
          {state.recentZoos.map((z) => (
            <ZooRow key={z.id} flag={flag(z.country)} name={z.name} sub={z.city ?? ''} active={z.id === curId} onOpen={() => open(z)} label={t('world.open')} />
          ))}
        </section>
      )}

      <h2 className="font-display text-xl font-semibold text-jungle-900">{t('world.featured')}</h2>
      <div className="h-56 overflow-hidden rounded-3xl ring-1 ring-black/5">
        <MapContainer center={[35, 15]} zoom={1.5} minZoom={1} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
          {WORLD_ZOOS.map((z) => (
            <Marker key={z.id} position={[z.lat, z.lon]} icon={pin(z.id === curId)} eventHandlers={{ click: () => openCurated(z) }}>
              <Tooltip>{z.flag} {z.name}</Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {WORLD_ZOOS.map((z) => (
          <ZooRow key={z.id} flag={z.flag} name={z.name} sub={z.city} active={z.id === curId || (z.id === 'budapest' && curId === 'budapest')}
            busy={busy === z.id} onOpen={() => openCurated(z)} label={t('world.open')} />
        ))}
      </div>
      <p className="text-xs text-jungle-600">{t('world.osmNote')}</p>
    </div>
  )
}

function CovChip({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`rounded-full px-2.5 py-1 ${ok ? 'bg-jungle-100 text-jungle-800' : 'bg-sand-200 text-sand-600'}`}>{ok ? '✓' : '–'} {label}</span>
}

function ZooRow({ flag, name, sub, active, onOpen, label, busy }: { flag: string; name: string; sub: string; active?: boolean; onOpen: () => void; label: string; busy?: boolean }) {
  return (
    <Card className={`flex items-center gap-3 p-3 ${active ? 'ring-2 ring-clay-400' : ''}`}>
      <span className="text-3xl">{flag}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-jungle-900">{name}</span>
        <span className="block truncate text-sm text-jungle-600">{sub}</span>
      </span>
      <Button variant={active ? 'ghost' : 'accent'} onClick={onOpen} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? '✓' : label}
      </Button>
    </Card>
  )
}
