import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lightbulb, MessageCircle, ShieldCheck } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button, Card } from '@/components/ui'
import { connected, confirm, entries, submit, type Entry } from '@/features/community/api'
import { communityCopy } from '@/features/community/copy'

export default function CommunityView() {
 const { i18n } = useTranslation()
 const c = communityCopy(i18n.language)
 const { state } = useStore()
 const [list, setList] = useState<Entry[]>([])
 const [kind, setKind] = useState<Entry['kind']>('tip')
 const [title, setTitle] = useState('')
 const [body, setBody] = useState('')
 const [busy, setBusy] = useState(false)
 const [loading, setLoading] = useState(false)
 const [message, setMessage] = useState('')
 const [filter, setFilter] = useState('all')
 const [voted, setVoted] = useState<string[]>([])
 const draftKey = `zq-community-draft:${state.parkId}`
 useEffect(() => {
   setTitle(''); setBody(''); setMessage(''); setList([])
   try { const d = JSON.parse(localStorage.getItem(draftKey) || 'null'); if (d) { setTitle(d.title); setBody(d.body); setKind(d.kind) } } catch { /* storage unavailable */ }
 }, [draftKey])
 const refresh = useCallback(async () => {
   if (!connected) return
   setLoading(true)
   try { setList(await entries(state.parkId)) } catch { setMessage(c.error) } finally { setLoading(false) }
 }, [state.parkId, c.error])
 useEffect(() => { void refresh() }, [refresh])
 async function send() {
   setBusy(true); setMessage('')
   try {
     if (!connected) { localStorage.setItem(draftKey, JSON.stringify({ kind, title, body })); setMessage(c.saved); return }
     await submit(state.parkId, kind, title, body)
     setTitle(''); setBody(''); localStorage.removeItem(draftKey); setMessage(c.sent); await refresh()
   } catch { setMessage(c.error) } finally { setBusy(false) }
 }
 async function vote(id: string) {
   setBusy(true)
   try { await confirm(id); setVoted(v => [...v, id]); setMessage(c.voted); await refresh() } catch { setMessage(c.error) } finally { setBusy(false) }
 }
 return <div className="space-y-5 px-4 pb-28 pt-4">
  <section className="expedition-hero rounded-[2rem] p-6 text-white">
   <MessageCircle className="mb-4 h-8 w-8 text-amber-200" />
   <h1 className="font-display text-3xl">{c.title}</h1><p className="mt-3 text-sm text-white/85">{c.intro}</p>
  </section>
  {!connected && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-200">{c.offline}</p>}
  <Card className="space-y-3 p-4">
   <form onSubmit={e => { e.preventDefault(); void send() }} className="space-y-3">
    <label className="block text-sm font-bold"><span className="sr-only">{c.filter}</span><select value={kind} onChange={e => setKind(e.target.value as Entry['kind'])} className="w-full rounded-xl border border-jungle-200 bg-sand-50 p-3">{(['tip','idea','place'] as const).map(k => <option key={k} value={k}>{c[k]}</option>)}</select></label>
    <label className="block text-sm font-bold">{c.heading}<input required minLength={3} maxLength={100} value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-jungle-200 p-3" /></label>
    <label className="block text-sm font-bold">{c.body}<textarea required minLength={10} maxLength={1500} rows={4} value={body} onChange={e => setBody(e.target.value)} className="mt-1 w-full rounded-xl border border-jungle-200 p-3" /></label>
    <p className="text-xs text-jungle-600">{c.privacy}</p>
    <Button type="submit" disabled={busy || title.trim().length < 3 || body.trim().length < 10} className="w-full"><Lightbulb className="h-4 w-4" />{connected ? c.send : c.save}</Button>
   </form>
  </Card>
  <p role="status" aria-live="polite" className="text-sm font-semibold text-jungle-800">{message}</p>
  <p className="flex gap-2 text-xs leading-relaxed text-jungle-700"><ShieldCheck className="h-5 w-5 shrink-0" />{c.rule}</p>
  {connected && <>
   <div className="flex items-center gap-2"><select aria-label={c.filter} value={filter} onChange={e => setFilter(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-jungle-200 p-2"><option value="all">{c.filter}</option>{(['tip','idea','place'] as const).map(k => <option key={k} value={k}>{c[k]}</option>)}</select><Button variant="ghost" disabled={busy || loading} onClick={() => void refresh()}>{c.retry}</Button></div>
   {loading && <p role="status">{c.loading}</p>}
   {!loading && !list.length && <Card className="p-5 text-center">{c.empty}</Card>}
   {list.filter(e => filter === 'all' || e.kind === filter).map(e => <Card key={e.id} className="space-y-3 p-4">
    <div className="flex justify-between gap-3 text-xs text-jungle-600"><span>{c[e.kind]}</span><time>{new Date(e.created_at).toLocaleDateString(i18n.language)}</time></div>
    <h2 className="font-display text-xl">{e.title}</h2><p className="whitespace-pre-wrap break-words text-sm">{e.body}</p>
    <p className={`text-xs font-bold ${e.active ? 'text-jungle-700' : 'text-amber-800'}`}>{e.active ? '✓ ' + c.active : c.pending} · {e.confirmations}/10</p>
    <div className="h-1.5 overflow-hidden rounded-full bg-jungle-100"><div className="h-full bg-jungle-600" style={{ width: `${Math.min(100,e.confirmations * 10)}%` }} /></div>
    <Button disabled={busy || voted.includes(e.id)} variant="ghost" onClick={() => void vote(e.id)}>{voted.includes(e.id) ? '✓' : c.confirm}</Button>
   </Card>)}
  </>}
 </div>
}
