import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, HelpCircle, Users } from 'lucide-react'
import { loc } from '@/i18n'
import { usePark } from '@/lib/park'
import { useStore } from '@/lib/store'
import { catchPoints, completedZones, effectiveRarity, migrationBonus, passportActive, BONUS } from '@/lib/scoring'
import { compressImage, isFreshShot, savePhoto } from '@/lib/photos'
import { toast } from '@/lib/toast'
import type { Poi, Species } from '@/types'
import AnimalCard from './AnimalCard'
import { Button, Sheet } from './ui'

/**
 * Catch flow (Gemini): live photo inside the geofence → virtual card.
 * If the animal is hiding, the "Virtual seeker" quiz still earns the card
 * at half XP – no family leaves an empty enclosure empty-handed.
 */
export default function CatchSheet({ poi, sp, distance, accuracy, demo, onClose }: {
  poi: Poi; sp: Species; distance: number; accuracy: number | null; demo: boolean; onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { park } = usePark()
  const { state, dispatch } = useStore()
  const file = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'start' | 'quiz' | 'done'>('start')
  const [coop, setCoop] = useState(state.family.members > 1)
  const [earned, setEarned] = useState(0)
  const [photo, setPhoto] = useState<string | null>(null)
  const [answer, setAnswer] = useState<number | null>(null)

  // geofence: 35 m around the enclosure, widened by the GPS accuracy circle (max 70 m)
  const fence = Math.min(70, 35 + (accuracy ?? 0) * 0.6)
  const inside = demo || distance <= fence
  const rarity = effectiveRarity(sp, poi.id, park.schedule)
  const already = state.captures.some((c) => c.speciesId === sp.id && c.parkId === park.id)
  const quiet = isQuiet(poi.id)

  const finish = (method: 'photo' | 'quiz', photoKey?: string, extra = 0) => {
    const base = catchPoints({ rarity, method, coop, quiet })
    const country = park.country
    const passport = passportActive(state.captures, park.id, country)
    const migr = migrationBonus(state.captures, sp.id, country)
    const points = Math.round((already ? base * 0.2 : base) * (passport ? BONUS.passportFactor : 1)) + extra + (migr ? BONUS.migration : 0)
    if (passport) dispatch({ type: 'badge', id: `passport:${country}` })
    if (migr) dispatch({ type: 'badge', id: 'migration' })
    const before = completedZones(park, state.captures)
    const cap = { id: crypto.randomUUID?.() ?? String(Date.now()), speciesId: sp.id, poiId: poi.id, parkId: park.id, at: Date.now(), photoKey, method, points, country }
    dispatch({ type: 'capture', capture: cap })
    if (!state.captures.length) dispatch({ type: 'badge', id: 'first' })
    if (rarity === 'legendary') dispatch({ type: 'badge', id: 'legend' })
    const after = completedZones(park, [...state.captures, cap])
    if (after.length > before.length) {
      dispatch({ type: 'xp', event: { at: Date.now(), points: BONUS.zoneComplete, reason: 'zone' } })
      dispatch({ type: 'badge', id: 'zone' })
    }
    setEarned(points)
    setMode('done')
  }

  const onPhoto = async (f: File | undefined) => {
    if (!f) return
    if (!demo && !isFreshShot(f)) { toast(t('catch.stale')); return }
    const data = await compressImage(f)
    const key = `${sp.id}-${Date.now()}`
    await savePhoto(key, data)
    setPhoto(data)
    finish('photo', key)
  }

  const onAnswer = (i: number) => {
    setAnswer(i)
    if (i === sp.quiz.answer) {
      dispatch({ type: 'badge', id: 'scholar' })
      setTimeout(() => finish('quiz', undefined, BONUS.quiz), 700)
    }
  }

  return (
    <Sheet open onClose={onClose} title={t('catch.title', { name: loc(sp.name, lang) })}>
      {mode === 'start' && (
        <div className="space-y-4">
          <div className="mx-auto w-40"><AnimalCard sp={sp} rarity={rarity} locked={!already} /></div>
          {rarity === 'legendary' && sp.rarity !== 'legendary' && (
            <p className="rounded-2xl bg-amber-100 px-3 py-2 text-center text-sm font-bold text-amber-900">✨ {t('catch.legendNow')}</p>
          )}
          {already && <p className="text-center text-sm text-jungle-700">{t('catch.already')}</p>}
          {passportActive(state.captures, park.id, park.country) && (
            <p className="rounded-2xl bg-sky-100 px-3 py-2 text-center text-sm font-bold text-sky-900">🛂 {t('catch.passport', { c: park.country })}</p>
          )}
          <label className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 ring-1 ring-black/5">
            <span className="flex items-center gap-2 font-semibold text-jungle-900"><Users className="h-4 w-4" />{t('catch.coop')}</span>
            <input type="checkbox" checked={coop} onChange={(e) => setCoop(e.target.checked)} className="h-5 w-5 accent-jungle-700" />
          </label>
          <input ref={file} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
          <Button className="w-full text-lg" disabled={!inside} onClick={() => file.current?.click()}>
            <Camera className="h-5 w-5" />{inside ? t('catch.take') : t('map.tooFar', { m: Math.round(distance - fence) })}
          </Button>
          <Button variant="ghost" className="w-full" disabled={!inside} onClick={() => setMode('quiz')}>
            <HelpCircle className="h-5 w-5" />{t('catch.hidden')}
          </Button>
        </div>
      )}

      {mode === 'quiz' && (
        <div className="space-y-3">
          <p className="text-sm font-bold uppercase tracking-widest text-clay-600">{t('catch.quizTitle')}</p>
          <p className="font-display text-xl text-jungle-900">{loc(sp.quiz.q, lang)}</p>
          {sp.quiz.options.map((o, i) => {
            const state = answer === null ? '' : i === sp.quiz.answer ? 'bg-jungle-600 text-white' : i === answer ? 'bg-clay-500 text-white' : 'opacity-50'
            return (
              <button key={i} disabled={answer !== null} onClick={() => onAnswer(i)}
                className={`w-full rounded-2xl bg-white px-4 py-3 text-left font-semibold ring-1 ring-black/5 transition ${state}`}>{loc(o, lang)}</button>
            )
          })}
          {answer !== null && answer !== sp.quiz.answer && <p className="text-center text-sm text-clay-600">{t('catch.wrong')}</p>}
        </div>
      )}

      {mode === 'done' && (
        <div className="space-y-4 text-center">
          <div className="grid grid-cols-2 gap-3">
            <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-jungle-100 ring-2 ring-jungle-200">
              {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-5xl">🔎</div>}
            </div>
            <div className="animate-[pop_.5s_ease-out]"><AnimalCard sp={sp} rarity={rarity} /></div>
          </div>
          <p className="font-display text-3xl text-jungle-900">{t('catch.caught', { p: earned })}</p>
          <p className="rounded-2xl bg-white p-3 text-left text-jungle-800 ring-1 ring-black/5"><b>{t('collection.fact')}</b> {loc(sp.fact, lang)}</p>
          <Button className="w-full" onClick={onClose}>{t('common.close')}</Button>
        </div>
      )}
    </Sheet>
  )
}

// "Quiet zone" bonus (Gemini): enclosures most families skip – spreads crowds.
const QUIET = new Set(['redpanda', 'kangaroo', 'meerkat', 'crocodile', 'snake'])
function isQuiet(id: string) { return QUIET.has(id) }
