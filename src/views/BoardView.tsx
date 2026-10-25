import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trophy, Users } from 'lucide-react'
import { fetchBoard, sharedMode, pushScore, type BoardRow, type BoardScope } from '@/lib/leaderboard'
import { totals, useStore } from '@/lib/store'
import { Button, Card, Chip } from '@/components/ui'
import { usePark } from '@/lib/park'

const flagOf = (cc: string) => (/^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '🌍')

const EMOJIS = ['🦁', '🦓', '🦒', '🐘', '🐧', '🦩', '🐯', '🦘', '🐨', '🦛', '🐒', '🦭']

export default function BoardView() {
  const { t, i18n } = useTranslation()
  const { state, dispatch } = useStore()
  const { park } = usePark()
  const [scope, setScope] = useState<BoardScope | 'countries'>('week')
  const [rows, setRows] = useState<BoardRow[]>([])
  const [nick, setNick] = useState(state.family.nick)
  const [shared, setShared] = useState(false)
  useEffect(() => { sharedMode().then(setShared) }, [])
  const tot = totals(state.xp)
  const fallbackNick = t('board.you')
  const me: BoardRow = {
    familyId: state.family.id,
    nick: state.family.nick || fallbackNick,
    emoji: state.family.emoji,
    xp: scope === 'today' ? tot.today : scope === 'all' ? tot.all : tot.week,
    parkId: state.parkId,
    country: park.country || 'HU',
  }

  useEffect(() => {
    let alive = true
    const real: BoardScope = scope === 'countries' ? 'week' : scope
    fetchBoard(real, me).then((r) => {
      if (!alive) return
      if (scope !== 'countries') return setRows(r)
      // Gemini r4: monthly-style league of countries (summed family scores)
      const by = new Map<string, BoardRow>()
      r.forEach((x) => {
        const c = x.country || '??'
        const cur = by.get(c) ?? { familyId: `c-${c}`, nick: c, emoji: flagOf(c), xp: 0, parkId: '', country: '', me: false }
        cur.xp += x.xp
        if (x.me) cur.me = true
        by.set(c, cur)
      })
      setRows([...by.values()].sort((a, b) => b.xp - a.xp))
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, me.xp, me.nick, me.emoji])

  useEffect(() => {
    if (state.family.nick) pushScore(me, tot).then(() => { if (scope !== 'countries') fetchBoard(scope, me).then(setRows) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tot.all, state.family.nick, state.family.emoji])

  const medal = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`

  return (
    <div className="space-y-5 px-4 pb-28 pt-4">
      <h1 className="flex items-center gap-2 font-display text-3xl font-semibold text-jungle-900"><Trophy className="h-7 w-7 text-amber-500" />{t('board.title')}</h1>

      <div className="flex flex-wrap gap-2">
        {(['today', 'week', 'all', 'countries'] as const).map((s) => (
          <Chip key={s} active={scope === s} onClick={() => setScope(s)}>{t(`board.${s}`)}</Chip>
        ))}
      </div>

      <Card className="overflow-hidden">
        <ol>
          {rows.slice(0, 11).map((r, i) => (
            <li key={r.familyId} className={`flex items-center gap-3 px-4 py-3 ${r.me ? 'bg-amber-50 ring-2 ring-inset ring-amber-300' : i % 2 ? 'bg-sand-50/60' : ''}`}>
              <span className="w-8 text-center font-display text-lg">{medal(i)}</span>
              <span className="text-2xl">{r.emoji}</span>
              <span className="flex-1">
                <span className="block font-bold text-jungle-900">{r.nick}{r.me && state.family.nick && ` · ${t('board.you')}`}</span>
                {r.country && <span className="text-xs text-jungle-600">{r.country} · {r.parkId}</span>}
              </span>
              <span className="font-display text-lg font-semibold text-jungle-900">{r.xp.toLocaleString(i18n.language)}</span>
            </li>
          ))}
        </ol>
      </Card>
      {!shared && <p className="text-xs text-jungle-600">{t('board.demo')}</p>}

      <Card className="space-y-3 p-4">
        <p className="font-bold text-jungle-900">{t('board.nickTitle')}</p>
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => dispatch({ type: 'family', family: { emoji: e } })}
              className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${state.family.emoji === e ? 'bg-jungle-700' : 'bg-sand-100'}`} aria-label={e}>{e}</button>
          ))}
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); dispatch({ type: 'family', family: { nick: nick.trim().slice(0, 24) } }) }}>
          <input value={nick} onChange={(e) => setNick(e.target.value)} maxLength={24} placeholder="Szafari Csapat"
            className="min-w-0 flex-1 rounded-2xl border-0 bg-sand-50 px-4 py-3 font-semibold text-jungle-900 ring-1 ring-jungle-200 focus:ring-2 focus:ring-jungle-600" />
          <Button type="submit">{t('board.save')}</Button>
        </form>
        <p className="text-xs text-jungle-600">{t('board.nickHint')}</p>
        <div className="flex items-center justify-between rounded-2xl bg-sand-50 px-3 py-2">
          <span className="flex items-center gap-2 font-semibold text-jungle-900"><Users className="h-4 w-4" />{t('board.members')}</span>
          <span className="flex items-center gap-2">
            <button className="h-8 w-8 rounded-full bg-white font-black ring-1 ring-jungle-200" onClick={() => dispatch({ type: 'family', family: { members: Math.max(1, state.family.members - 1) } })}>−</button>
            <b className="w-5 text-center">{state.family.members}</b>
            <button className="h-8 w-8 rounded-full bg-white font-black ring-1 ring-jungle-200" onClick={() => dispatch({ type: 'family', family: { members: Math.min(10, state.family.members + 1) } })}>+</button>
          </span>
        </div>
      </Card>
    </div>
  )
}
