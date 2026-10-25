import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Species } from '@/types'
import { loc } from '@/i18n'

type Article = { text: string; url: string; image?: string; imageCredit?: string; imagePage?: string; language: string; at: number }
const copy = {
 hu: { title: 'Ismerd meg közelebbről', loading: 'Állatismertető betöltése…', unavailable: 'A részletes ismertető most nem érhető el. A rövid érdekességet továbbra is elolvashatod.', source: 'Forrás: Wikipédia', english: 'Angol nyelvű ismertető', note: 'Fajismertető; nem igazolja az állat jelenlétét ebben az állatkertben.' },
 en: { title: 'Meet the animal', loading: 'Loading animal guide…', unavailable: 'The full guide is unavailable right now. You can still read the short fact.', source: 'Source: Wikipedia', english: 'English language guide', note: 'Species guide; does not confirm this animal is present at this zoo.' },
 de: { title: 'Lerne das Tier kennen', loading: 'Tierbeschreibung wird geladen…', unavailable: 'Die ausführliche Beschreibung ist gerade nicht verfügbar. Die kurze Information bleibt lesbar.', source: 'Quelle: Wikipedia', english: 'Englischer Text', note: 'Artbeschreibung; bestätigt nicht, dass dieses Tier in diesem Zoo lebt.' },
 es: { title: 'Conoce al animal', loading: 'Cargando información…', unavailable: 'La guía detallada no está disponible. Puedes leer el dato breve.', source: 'Fuente: Wikipedia', english: 'Guía en inglés', note: 'Información de la especie; no confirma su presencia en este zoo.' },
}
export default function AnimalGuide({ sp }: { sp: Species }) {
 const { i18n } = useTranslation()
 const lang = ['hu','en','de','es'].includes(i18n.language.slice(0,2)) ? i18n.language.slice(0,2) : 'en'
 const c = copy[lang as keyof typeof copy]
 const [article, setArticle] = useState<Article | null>(null)
 const [loading, setLoading] = useState(true)
 useEffect(() => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  let alive = true
  const key = `zq-guide-v2:${lang}:${sp.latin}`
  setArticle(null); setLoading(true)
  async function read() {
   try {
    let cached: Article | null = null
    try { cached = JSON.parse(localStorage.getItem(key) || 'null') } catch { /* no cache */ }
    if (cached) { if (alive) setArticle(cached); if (Date.now()-cached.at < 7*86400000) return }
    const options = { signal: controller.signal }
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(sp.latin)}`, options)
    if (!response.ok) return
    let data = await response.json()
    if (data.type === 'disambiguation' || !data.extract) return
    let language = 'en'
    if (lang !== 'en') {
     try {
      const links = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=langlinks&lllang=${lang}&titles=${encodeURIComponent(data.title)}`, options)
      if (links.ok) {
       const json = await links.json()
       const pages = Object.values(json.query?.pages ?? {}) as { langlinks?: { '*': string }[] }[]
       const title = pages[0]?.langlinks?.[0]?.['*']
       if (title) {
        const translated = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, options)
        if (translated.ok) { const value = await translated.json(); if (value.extract && value.type !== 'disambiguation') { data = value; language = lang } }
       }
      }
     } catch { /* English source remains available */ }
    }
    const result: Article = { text: data.extract, url: data.content_urls?.desktop?.page, image: data.thumbnail?.source, language, at: Date.now() }
    // Display a photograph only when its author/license metadata is available.
    if (result.image) {
     result.image = undefined
     try {
      const filename = decodeURIComponent((data.originalimage?.source ?? '').split('/').pop() ?? '')
      if (filename) {
       const creditResponse = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=extmetadata%7Curl&titles=${encodeURIComponent('File:' + filename)}`, options)
       if (creditResponse.ok) {
        const creditData = await creditResponse.json()
        const page = (Object.values(creditData.query?.pages ?? {}) as { imageinfo?: { descriptionurl: string; extmetadata: Record<string, { value: string }> }[] }[])[0]
        const info = page?.imageinfo?.[0]
        const meta = info?.extmetadata
        if (meta?.Artist?.value && meta?.LicenseShortName?.value && info?.descriptionurl?.startsWith('https://commons.wikimedia.org/')) {
         const plain = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent ?? ''
         result.imageCredit = `${plain(meta.Artist.value)} · ${plain(meta.LicenseShortName.value)}`
         result.imagePage = info.descriptionurl
         result.image = data.thumbnail?.source
        }
       }
      }
     } catch { /* keep the guide without a photo if credit cannot be verified */ }
    }
    if (!result.url?.startsWith(`https://${language}.wikipedia.org/`)) return
    if (alive) setArticle(result)
    try { localStorage.setItem(key,JSON.stringify(result)) } catch { /* quota */ }
   } catch { /* cached article or short fact remains readable */ }
   finally { if (alive) setLoading(false) }
  }
  void read()
  return () => { alive = false; controller.abort(); clearTimeout(timer) }
 }, [sp.latin, lang])
 return <section className="mt-4 overflow-hidden rounded-3xl bg-white ring-1 ring-jungle-100">
  {article?.image && <img src={article.image} alt={loc(sp.name,lang)} loading="lazy" className="h-48 w-full object-contain bg-jungle-50" />}
  <div className="space-y-3 p-4">
   {article?.image && article.imagePage && <a href={article.imagePage} target="_blank" rel="noopener noreferrer" className="block text-xs text-jungle-600 underline">📷 {article.imageCredit}</a>}
   <h3 className="font-display text-xl text-jungle-900">{c.title}</h3>
   <p className="text-xs italic text-jungle-600">{sp.latin}</p>
   {loading && !article && <p role="status" className="text-sm">{c.loading}</p>}
   {article ? <><p lang={article.language} className="whitespace-pre-line text-sm leading-relaxed text-jungle-900">{article.text}</p><a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-bold text-jungle-700 underline">{c.source} ↗</a>{article.language !== lang && <p className="text-xs text-jungle-600">{c.english}</p>}</> : !loading && <p className="text-sm text-jungle-700">{c.unavailable}</p>}
   <p className="text-xs text-jungle-600">{c.note}</p>
  </div>
 </section>
}
