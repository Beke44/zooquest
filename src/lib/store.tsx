import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import type { Capture, StatusReport } from '@/types'
import { dayKey, weekKey } from './leaderboard'

export interface XpEvent { at: number; points: number; reason: string }

export interface Family {
  id: string
  nick: string
  emoji: string
  members: number
}

export interface Plan {
  stops: string[]
  minutes: number
  stroller: boolean
  shade: boolean
  rain: boolean
  createdAt: number
}

export interface State {
  family: Family
  captures: Capture[]
  reports: StatusReport[]
  xp: XpEvent[]
  helper: XpEvent[]
  badges: string[]
  plan: Plan | null
  visited: string[]
  parkId: string
  votes: string[]
}

type Action =
  | { type: 'capture'; capture: Capture }
  | { type: 'report'; report: StatusReport; points: number }
  | { type: 'xp'; event: XpEvent }
  | { type: 'badge'; id: string }
  | { type: 'plan'; plan: Plan | null }
  | { type: 'visit'; poiId: string }
  | { type: 'family'; family: Partial<Family> }
  | { type: 'vote'; zooId: string }
  | { type: 'reset' }

const KEY = 'zooquest-state-v1'

function fresh(): State {
  const id = (crypto.randomUUID?.() ?? String(Math.random()).slice(2)).slice(0, 12)
  return {
    family: { id, nick: '', emoji: '🦁', members: 3 },
    captures: [], reports: [], xp: [], helper: [], badges: [], plan: null, visited: [], parkId: 'budapest', votes: [],
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...fresh(), ...JSON.parse(raw) }
  } catch { /* private mode etc. */ }
  return fresh()
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'capture':
      return {
        ...s,
        captures: [...s.captures, a.capture],
        xp: [...s.xp, { at: a.capture.at, points: a.capture.points, reason: `catch:${a.capture.speciesId}` }],
      }
    case 'report':
      // ChatGPT (round 3): helper points are separate, capped per day and
      // never count towards the competitive leaderboard.
      return { ...s, reports: [...s.reports, a.report], helper: [...s.helper, { at: a.report.at, points: a.points, reason: `report:${a.report.kind}` }] }
    case 'xp':
      return { ...s, xp: [...s.xp, a.event] }
    case 'badge':
      return s.badges.includes(a.id) ? s : { ...s, badges: [...s.badges, a.id] }
    case 'plan':
      return { ...s, plan: a.plan }
    case 'visit':
      return s.visited.includes(a.poiId) ? s : { ...s, visited: [...s.visited, a.poiId] }
    case 'family':
      return { ...s, family: { ...s.family, ...a.family } }
    case 'vote':
      return s.votes.includes(a.zooId) ? s : { ...s, votes: [...s.votes, a.zooId] }
    case 'reset':
      return fresh()
  }
}

const Ctx = createContext<{ state: State; dispatch: (a: Action) => void } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  }, [state])
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>
}

export function useStore() {
  const c = useContext(Ctx)
  if (!c) throw new Error('StoreProvider missing')
  return c
}

export function totals(xp: XpEvent[]) {
  const today = dayKey()
  const week = weekKey()
  let all = 0, d = 0, w = 0
  for (const e of xp) {
    const dt = new Date(e.at)
    all += e.points
    if (dayKey(dt) === today) d += e.points
    if (weekKey(dt) === week) w += e.points
  }
  return { all, today: d, week: w }
}

export const HELPER_DAILY_CAP = 10
/** Reports older than this are hidden from the map (stale info hurts routing). */
export const REPORT_TTL_MIN = 45

export function helperToday(helper: XpEvent[]) {
  const today = dayKey()
  return helper.filter((e) => dayKey(new Date(e.at)) === today).length
}

export function freshReports(reports: StatusReport[], poiId: string, now = Date.now()) {
  return reports.filter((r) => r.poiId === poiId && now - r.at < REPORT_TTL_MIN * 60000).sort((a, b) => b.at - a.at)
}
