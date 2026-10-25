import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, Camera, HelpCircle } from 'lucide-react'
import { loc } from '@/i18n'
import { usePark } from '@/lib/park'
import { totals, useStore } from '@/lib/store'
import { levelOf } from '@/lib/scoring'
import { loadPhoto } from '@/lib/photos'
import { speciesById } from '@/data/species'
import AnimalGuide from '@/components/AnimalGuide'
import AnimalCard from '@/components/AnimalCard'
import { Card, Sheet } from '@/components/ui'
import type { Capture } from '@/types'

const BADGE_ICON: Record<string, string> = { first: '🎯', hero: '🦸', zone: '🏆', helper: '🤝', legend: '🌟', scholar: '🎓', migration: '🕊️' }
const flag = (cc: string) => (/^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '🌍')

export default function CollectionView() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { speciesInPark, poi } = usePark()
  const { state } = useStore()
  const [open, setOpen] = useState<string | null>(null)
  const got = useMemo(() => new Set(state.captures.map((c) => c.speciesId)), [state.captures])
  const xp = totals(state.xp).all
  const lvl = levelOf(xp)
  const journal = [...state.captures].sort((a, b) => b.at - a.at)

  return (
    <div className="space-y-5 px-4 pb-28 pt-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-jungle-900">{t('collection.title')}</h1>
          <p className="text-jungle-700">🌍 {new Set(state.captures.map((c) => c.speciesId)).size} · {t('collection.progress', { a: [...got].filter((id) => speciesInPark.some((s) => s.id === id)).length, b: speciesInPark.length })}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl text-jungle-900">{t('collection.level', { n: lvl.lvl })}</p>
          <div className="mt-1 h-2 w-28 overflow-hidden rounded-full bg-jungle-100">
            <div className="h-full rounded-full bg-clay-500" style={{ width: `${lvl.progress * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-jungle-600">{xp.toLocaleString(lang)} XP</p>
        </div>
      </header>

      {state.badges.some((b) => b.startsWith('passport:')) && (
        <Card className="p-4">
          <p className="mb-2 font-bold text-jungle-900">🛂 {t('badges.passport')}</p>
          <div className="flex flex-wrap gap-2">
            {state.badges.filter((b) => b.startsWith('passport:')).map((b) => (
              <span key={b} className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-clay-400 bg-sand-50 text-2xl" title={b.slice(9)}>{flag(b.slice(9))}</span>
            ))}
          </div>
        </Card>
      )}

      {state.badges.some((b) => !b.startsWith('passport:')) && (
        <Card className="p-4">
          <p className="mb-2 font-bold text-jungle-900">{t('collection.badges')}</p>
          <div className="flex flex-wrap gap-2">
            {state.badges.filter((b) => !b.startsWith('passport:')).map((b) => (
              <span key={b} className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-3 py-1.5 text-sm font-bold text-jungle-900">
                {BADGE_ICON[b]} {t(`badges.${b}`)}
              </span>
            ))}
          </div>
        </Card>
      )}

      {got.size === 0 && <Card className="p-5 text-center text-jungle-700">{t('collection.empty')}</Card>}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {speciesInPark.map((s) => {
          const mine = state.captures.filter((c) => c.speciesId === s.id)
          return (
            <button key={s.id} aria-label={loc(s.name, lang)} onClick={() => setOpen(s.id)} className="text-left active:scale-95">
              <AnimalCard sp={s} locked={!mine.length} size="sm" />
            </button>
          )
        })}
      </div>

      {journal.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-display text-xl font-semibold text-jungle-900"><BookOpen className="h-5 w-5" />{t('collection.journal')}</h2>
          <ol className="relative space-y-3 border-l-2 border-dashed border-jungle-200 pl-4">
            {journal.map((c) => {
              const sp = speciesById[c.speciesId]
              return (
                <li key={c.id} className="relative">
                  <span className="absolute -left-[1.45rem] top-2 h-3 w-3 rounded-full bg-clay-500 ring-4 ring-sand-50" />
                  <JournalRow c={c} title={`${sp?.emoji ?? ''} ${loc(sp?.name, lang)}`} place={loc(poi(c.poiId)?.name, lang)} lang={lang} />
                </li>
              )
            })}
          </ol>
        </section>
      )}

      <Sheet open={!!open} onClose={() => setOpen(null)}>
        {open && <Detail speciesId={open} captures={state.captures.filter((c) => c.speciesId === open)} />}
      </Sheet>
    </div>
  )
}

function JournalRow({ c, title, place, lang }: { c: Capture; title: string; place: string; lang: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 ring-1 ring-black/5">
      <div>
        <p className="font-bold text-jungle-900">{title}</p>
        <p className="text-xs text-jungle-600">{new Date(c.at).toLocaleString(lang, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {place}</p>
      </div>
      <span className="flex items-center gap-1 text-sm font-black text-clay-600">
        {c.method === 'quiz' ? <HelpCircle className="h-4 w-4" /> : <Camera className="h-4 w-4" />}+{c.points}
      </span>
    </div>
  )
}

function Detail({ speciesId, captures }: { speciesId: string; captures: Capture[] }) {
  const { t, i18n } = useTranslation()
  const sp = speciesById[speciesId]
  const [photo, setPhoto] = useState<string | null>(null)
  const withPhoto = captures.filter((c) => c.photoKey).sort((a, b) => b.at - a.at)[0]
  useEffect(() => {
    let alive = true
    setPhoto(null)
    if (withPhoto?.photoKey) loadPhoto(withPhoto.photoKey).then((p) => alive && setPhoto(p))
    return () => { alive = false }
  }, [withPhoto?.photoKey])
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <figure>
          <figcaption className="mb-1 text-xs font-bold uppercase tracking-widest text-jungle-600">{t('collection.real')}</figcaption>
          <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-jungle-100 ring-2 ring-jungle-200">
            {photo ? <img src={photo} alt={loc(sp.name, i18n.language)} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-4xl">❓</div>}
          </div>
        </figure>
        <figure>
          <figcaption className="mb-1 text-xs font-bold uppercase tracking-widest text-jungle-600">{t('collection.virtual')}</figcaption>
          <AnimalCard sp={sp} size="lg" />
        </figure>
      </div>
      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <p className="text-xs font-bold uppercase tracking-widest text-clay-600">{t('collection.fact')}</p>
        <p className="mt-1 text-jungle-900">{loc(sp.fact, i18n.language)}</p>
      </div>
      <AnimalGuide sp={sp} />
    </div>
  )
}
