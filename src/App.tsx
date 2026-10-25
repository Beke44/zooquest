import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Compass, Globe2, LayoutGrid, Map as MapIcon, Trophy } from 'lucide-react'
import { LANGS, setLang } from './i18n'
import { totals, useStore } from './lib/store'
import { useParkStatus } from './lib/park'
import { loc } from './i18n'
import { useToast } from './lib/toast'
import { Toast } from './components/ui'
import PlanView from './views/PlanView'
import CollectionView from './views/CollectionView'
import BoardView from './views/BoardView'
import type { Lang } from './types'

// Leaflet views load on demand to keep first paint light.
const MapView = lazy(() => import('./views/MapView'))
const WorldView = lazy(() => import('./views/WorldView'))

type Tab = 'plan' | 'map' | 'collection' | 'board' | 'world'
const TABS: { id: Tab; icon: typeof Compass }[] = [
  { id: 'plan', icon: Compass },
  { id: 'map', icon: MapIcon },
  { id: 'collection', icon: LayoutGrid },
  { id: 'board', icon: Trophy },
  { id: 'world', icon: Globe2 },
]

function readTab(): Tab {
  const h = location.hash.replace('#', '') as Tab
  return TABS.some((t) => t.id === h) ? h : 'plan'
}

export default function App() {
  const { t, i18n } = useTranslation()
  const { state, dispatch } = useStore()
  const { park, status, retry } = useParkStatus()
  const [tab, setTab] = useState<Tab>(readTab)
  const toast = useToast()
  const xp = totals(state.xp).today

  useEffect(() => {
    const f = () => setTab(readTab())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  const go = (id: Tab) => { location.hash = id; setTab(id); window.scrollTo({ top: 0 }) }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col">
      <header className="sticky top-0 z-[600] flex items-center gap-3 border-b border-jungle-100 bg-sand-50/90 px-4 py-3 backdrop-blur">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-jungle-800 text-xl shadow-inner" aria-hidden>🧭</div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-semibold leading-none text-jungle-900">ZooQuest</p>
          <button onClick={() => go('world')} className="block max-w-full truncate text-left text-xs font-semibold text-jungle-600 underline-offset-2 hover:underline">
            📍 {loc(park.name, i18n.language.slice(0, 2))}
          </button>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-900" title="XP">⭐ {xp}</span>
        <select
          aria-label="Language"
          value={i18n.language.slice(0, 2)}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="rounded-xl border-0 bg-white py-1.5 pl-2 pr-7 text-sm font-bold text-jungle-900 ring-1 ring-jungle-200"
        >
          {LANGS.map((l) => <option key={l.id} value={l.id}>{l.flag} {l.id.toUpperCase()}</option>)}
        </select>
      </header>

      <main className="relative flex-1">
        {status !== 'ready' && (
          <div className="absolute inset-0 z-[650] grid place-items-center bg-sand-50/90 px-6 text-center backdrop-blur-sm" role="status">
            {status === 'loading' ? (
              <div className="space-y-3">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-jungle-200 border-t-clay-500" />
                <p className="font-display text-xl text-jungle-900">{t('world.loading')}</p>
                <p className="text-sm text-jungle-600">{state.zoo?.name}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-4xl">🗺️</p>
                <p className="font-display text-xl text-jungle-900">{t('world.loadError')}</p>
                <p className="text-sm text-jungle-600">{t('world.netError')}</p>
                <div className="flex justify-center gap-2">
                  <button onClick={retry} className="rounded-2xl bg-jungle-700 px-4 py-2.5 font-bold text-white">{t('world.retry')}</button>
                  <button onClick={() => dispatch({ type: 'zoo', zoo: null })} className="rounded-2xl bg-white px-4 py-2.5 font-bold text-jungle-900 ring-1 ring-jungle-200">{t('world.back')}</button>
                </div>
              </div>
            )}
          </div>
        )}
        <Suspense fallback={<div className="grid h-64 place-items-center text-4xl">🐾</div>}>
          {tab === 'plan' && <PlanView onStart={() => go('map')} />}
          {tab === 'map' && <MapView />}
          {tab === 'collection' && <CollectionView />}
          {tab === 'board' && <BoardView />}
          {tab === 'world' && <WorldView onOpen={() => go('plan')} />}
        </Suspense>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-[700] border-t border-jungle-100 bg-sand-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          {TABS.map(({ id, icon: Icon }) => (
            <button key={id} onClick={() => go(id)} aria-current={tab === id}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold transition ${tab === id ? 'text-clay-600' : 'text-jungle-700'}`}>
              <span className={`grid h-8 w-12 place-items-center rounded-full ${tab === id ? 'bg-clay-500/10' : ''}`}><Icon className="h-5 w-5" /></span>
              {t(`tabs.${id}`)}
            </button>
          ))}
        </div>
      </nav>
      <Toast text={toast} />
    </div>
  )
}
