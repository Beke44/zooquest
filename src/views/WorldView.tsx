import { useTranslation } from 'react-i18next'
import { MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { Globe2, ThumbsUp } from 'lucide-react'
import { WORLD_ZOOS } from '@/data/world'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { Button, Card } from '@/components/ui'

const pin = (live: boolean) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${live ? 22 : 14}px;height:${live ? 22 : 14}px;border-radius:999px;background:${live ? '#d1603a' : '#2f6b38'};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
    iconSize: [live ? 22 : 14, live ? 22 : 14],
    iconAnchor: [live ? 11 : 7, live ? 11 : 7],
  })

export default function WorldView({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useTranslation()
  const { state, dispatch } = useStore()
  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <h1 className="flex items-center gap-2 font-display text-3xl font-semibold text-jungle-900"><Globe2 className="h-7 w-7" />{t('world.title')}</h1>
      <p className="text-jungle-700">{t('world.sub')}</p>
      <div className="h-56 overflow-hidden rounded-3xl ring-1 ring-black/5">
        <MapContainer center={[35, 15]} zoom={1.5} minZoom={1} scrollWheelZoom={false} className="h-full w-full" attributionControl>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
          {WORLD_ZOOS.map((z) => (
            <Marker key={z.id} position={[z.lat, z.lon]} icon={pin(z.status === 'live')}>
              <Tooltip>{z.flag} {z.name}</Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {WORLD_ZOOS.map((z) => {
          const voted = state.votes.includes(z.id)
          return (
            <Card key={z.id} className="flex items-center gap-3 p-3">
              <span className="text-3xl">{z.flag}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-jungle-900">{z.name}</span>
                <span className="text-sm text-jungle-600">{z.city} · <b className={z.status === 'live' ? 'text-clay-600' : ''}>{t(z.status === 'live' ? 'world.live' : 'world.soon')}</b></span>
              </span>
              {z.status === 'live' ? (
                <Button variant="accent" onClick={() => onOpen(z.id)}>{t('world.open')}</Button>
              ) : (
                <Button variant="ghost" disabled={voted} onClick={() => { dispatch({ type: 'vote', zooId: z.id }); toast(t('world.voted')) }}>
                  <ThumbsUp className="h-4 w-4" />{voted ? '✓' : t('world.request')}
                </Button>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
