/**
 * Builds a ZooQuest park pack for ANY zoo on Earth from OpenStreetMap,
 * live in the browser (Overpass API, free, no key). Budapest ships a
 * curated pack; every other zoo is generated on first open and cached.
 *
 * Fair use (DeepSeek, round 4): one query per zoo, cached for 14 days,
 * three public mirrors with back-off, and a hard size guard.
 */
import { registerSpecies, speciesById } from '@/data/species'
import type { DataSource, Localized, ParkPack, Poi, PoiType, Species, ThemeRoute } from '@/types'
import { dist, type LatLon } from './geo'

export interface ZooRef {
  /** stable id used across the app: "osm-w123" / "osm-r456" / "osm-n789" */
  id: string
  osmType: 'node' | 'way' | 'relation'
  osmId: number
  name: string
  lat: number
  lon: number
  city?: string
  country?: string
}

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

interface OsmEl {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  geometry?: { lat: number; lon: number }[]
  members?: { role: string; geometry?: { lat: number; lon: number }[] }[]
  tags?: Record<string, string>
}

export async function overpass(query: string, signal?: AbortSignal): Promise<OsmEl[]> {
  let lastErr: unknown = null
  for (let round = 0; round < 2; round++) {
    for (const url of MIRRORS) {
      try {
        const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(query), signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
        if (r.status === 429 || r.status >= 500) { lastErr = new Error(`HTTP ${r.status}`); continue }
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j = (await r.json()) as { elements: OsmEl[] }
        return j.elements ?? []
      } catch (e) {
        if ((e as Error).name === 'AbortError') throw e
        lastErr = e
      }
    }
    await new Promise((res) => setTimeout(res, 2500 * (round + 1)))
  }
  throw lastErr ?? new Error('overpass unavailable')
}

// ---------- species matching ----------

/** Latin-name rules mapping OSM `species` tags onto the hand-written cards. */
const CARD_RULES: [string, RegExp][] = [
  ['lion', /^Panthera leo\b/], ['tiger', /^Panthera tigris/], ['zebra', /^Equus (quagga|grevyi|zebra|burchell)/],
  ['giraffe', /^Giraffa/], ['elephant', /^(Elephas|Loxodonta)/], ['hippo', /^(Hippopotamus|Choeropsis)/],
  ['rhino', /^(Ceratotherium|Diceros|Rhinoceros|Dicerorhinus)/], ['gorilla', /^Gorilla/], ['orangutan', /^Pongo/],
  ['polarbear', /^Ursus maritimus/], ['seal', /^(Zalophus|Otaria|Arctocephalus|Phoca|Halichoerus|Eumetopias)/],
  ['penguin', /^(Spheniscus|Eudyptes|Aptenodytes|Pygoscelis|Eudyptula)/], ['kangaroo', /^(Macropus|Osphranter|Notamacropus)/],
  ['koala', /^Phascolarctos/], ['flamingo', /^Phoenicopterus/], ['meerkat', /^Suricata/], ['bison', /^Bison/],
  ['crocodile', /^(Crocodylus|Alligator|Caiman|Osteolaemus|Tomistoma|Mecistops)/], ['redpanda', /^Ailurus/],
]
/** English-name fallbacks for zoos that tag names but not species. */
const CARD_NAMES: [string, RegExp][] = [
  ['lion', /\blions?\b|löwe|oroszlán(?!fóka)|león/i], ['tiger', /\btig(er|ris|re)s?\b/i], ['zebra', /\bzebr/i],
  ['giraffe', /giraf|zsiráf|jirafa/i], ['elephant', /elephant|elefant|elefánt/i], ['hippo', /hippo|flusspferd|víziló|nilpferd/i],
  ['rhino', /rhino|nashorn|orrszarvú|rinoceronte/i], ['gorilla', /gorill/i], ['orangutan', /orang[- ]?utan/i],
  ['polarbear', /polar bear|eisbär|jegesmedve|oso polar/i], ['seal', /sea ?lion|\bseals?\b|robbe|seelöwe|fóka|león marino/i],
  ['penguin', /pingu|penguin|pingüino/i], ['kangaroo', /kangaroo|känguru|kenguru|canguro/i], ['koala', /koala/i],
  ['flamingo', /flamingo|flamenco/i], ['meerkat', /meerkat|erdmännchen|szurikáta|suricata/i], ['bison', /bison|wisent|bölény/i],
  ['crocodile', /crocod|krokodil|alligator|aligátor/i], ['redpanda', /red panda|roter panda|macskamedve|panda rojo/i],
  ['monkey', /monkey|\baffen?\b|majom|lemur|maki|tamarin|\bmono/i], ['snake', /snake|python|schlange|kígyó|serpiente/i], ['goat', /goat|ziege|kecske|cabra|petting|streichel|simogató/i],
]
const MONKEY_LATIN = /^(Saimiri|Lemur|Macaca|Cebus|Sapajus|Ateles|Saguinus|Leontopithecus|Callithrix|Colobus|Mandrillus|Hylobates|Nomascus|Varecia|Eulemur|Alouatta|Papio|Theropithecus)/
const SNAKE_LATIN = /^(Python|Morelia|Boa |Eunectes|Lichanura|Malayopython|Naja|Crotalus|Bitis|Dendroaspis)/

function cardFor(latin: string, names: string): string | null {
  if (latin) {
    for (const [id, re] of CARD_RULES) if (re.test(latin)) return id
    if (MONKEY_LATIN.test(latin)) return 'monkey'
    if (SNAKE_LATIN.test(latin)) return 'snake'
    if (/^Capra hircus/.test(latin)) return 'goat'
  }
  for (const [id, re] of CARD_NAMES) if (re.test(names)) return id
  return null
}

/** A reasonable emoji for an animal the app has no card for. */
function emojiFor(text: string): string {
  const t = text.toLowerCase()
  const table: [RegExp, string][] = [
    [/owl|bagoly|eule/, '🦉'], [/parrot|ara\b|macaw|papag|kakadu|cockatoo|lori/, '🦜'], [/eagle|vulture|keselyű|sas\b|adler|geier|falcon|hawk/, '🦅'],
    [/duck|réce|kacsa|ente|goose|lúd|gans|swan|hattyú|schwan/, '🦆'], [/peacock|páva|pfau/, '🦚'], [/pelican|gödény|pelikan|stork|gólya|storch|crane|daru|kranich|heron|gém|ibis/, '🦩'],
    [/bird|madár|vogel|ave\b|finch|pinty|sparrow/, '🐦'], [/fish|hal\b|fisch|pez|shark|cápa|hai|ray\b|rája/, '🐟'], [/turtle|tortoise|teknős|schildkröte|tortuga/, '🐢'],
    [/lizard|gyík|echse|iguana|leguán|gecko|varan|dragon|sárkány/, '🦎'], [/frog|béka|frosch|rana|toad/, '🐸'], [/spider|pók|spinne|tarantula/, '🕷️'],
    [/butterfly|lepke|schmetterling|mariposa/, '🦋'], [/bear|medve|bär|oso/, '🐻'], [/wolf|farkas|lobo/, '🐺'], [/fox|róka|fuchs|zorro/, '🦊'],
    [/deer|szarvas|hirsch|ciervo|elk|moose|reindeer|rénszarvas/, '🦌'], [/camel|teve|kamel|alpaca|llama|láma|vicuña|guanaco/, '🐪'], [/horse|ló\b|pferd|caballo|pony|donkey|szamár|esel/, '🐴'],
    [/pig|disznó|schwein|cerdo|boar|vaddisznó|peccary/, '🐗'], [/cow|cattle|marha|rind|vaca|buffalo|bivaly|büffel|yak|jak/, '🐃'], [/sheep|juh|schaf|oveja|ram\b/, '🐑'],
    [/rabbit|nyúl|kaninchen|conejo|hare/, '🐇'], [/squirrel|mókus|hörnchen|ardilla/, '🐿️'], [/otter|vidra/, '🦦'], [/beaver|hód|biber/, '🦫'], [/hedgehog|sün|igel|porcupine/, '🦔'],
    [/bat\b|denevér|fledermaus|murciélago/, '🦇'], [/sloth|lajhár|faultier|perezoso/, '🦥'], [/anteater|hangyász|ameisenbär|oso hormiguero|armadillo/, '🐜'], [/raccoon|mosómedve|waschbär/, '🦝'],
    [/cat\b|macska|katze|lynx|hiúz|luchs|leopard|jaguar|puma|cheetah|gepárd|gepard|ocelot|serval/, '🐆'], [/hyena|hiéna|hyäne/, '🐕'], [/antelope|antilop|gazell|kudu|oryx|impala|gnu|wildebeest/, '🦌'],
    [/tapir|capybara|vízidisznó|wasserschwein|mara\b/, '🐾'], [/wombat|wallaby|koala|opossum/, '🦘'], [/snail|csiga|schnecke/, '🐌'], [/insect|rovar|insekt|beetle|bogár|käfer|ant\b|hangya/, '🐞'],
  ]
  for (const [re, e] of table) if (re.test(t)) return e
  return '🐾'
}

function slug(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

function localizedFromTags(t: Record<string, string>): Localized {
  const base = t.name ?? t['name:en'] ?? ''
  const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
  return {
    hu: cap(t['name:hu'] ?? base)!, en: cap(t['name:en'] ?? base)!,
    de: cap(t['name:de'] ?? base), es: cap(t['name:es'] ?? base),
  }
}

/** Card for an animal that has no hand-written card: generated and quiz-ready. */
function generatedSpecies(id: string, name: Localized, latin: string, emoji: string, pool: string[]): Species {
  const wrong = pool.filter((l) => l && l !== latin).sort(() => Math.random() - 0.5).slice(0, 2)
  const options = [latin, ...wrong].sort(() => Math.random() - 0.5)
  const L = (s: string): Localized => ({ hu: s, en: s })
  const show = (n: Localized) => n.en || n.hu
  return {
    id, emoji, latin, rarity: 'common', zone: 'world', name,
    fact: latin
      ? { hu: `${name.hu} – tudományos neve: ${latin}.`, en: `${show(name)} – scientific name: ${latin}.`, de: `${name.de ?? show(name)} – wissenschaftlicher Name: ${latin}.`, es: `${name.es ?? show(name)} – nombre científico: ${latin}.` }
      : { hu: `${name.hu}: keresd meg a táblán, honnan származik!`, en: `${show(name)}: check the sign to find out where it comes from!`, de: `${name.de ?? show(name)}: Lies auf dem Schild nach, woher es stammt!`, es: `${name.es ?? show(name)}: ¡mira en el cartel de dónde viene!` },
    quiz: latin && wrong.length >= 1
      ? { q: { hu: `Mi a(z) ${name.hu} tudományos neve?`, en: `What is the scientific name of the ${show(name)}?`, de: `Wie lautet der wissenschaftliche Name: ${name.de ?? show(name)}?`, es: `¿Cuál es el nombre científico: ${name.es ?? show(name)}?` }, options: options.map(L), answer: options.indexOf(latin) }
      : { q: { hu: 'Láttátok a táblát a kifutónál?', en: 'Did you read the sign at the enclosure?', de: 'Habt ihr das Schild am Gehege gelesen?', es: '¿Habéis leído el cartel del recinto?' }, options: [{ hu: 'Igen, elolvastuk', en: 'Yes, we read it', de: 'Ja, gelesen', es: 'Sí, lo leímos' }, { hu: 'Még nem', en: 'Not yet', de: 'Noch nicht', es: 'Todavía no' }], answer: 0 },
  }
}

// ---------- pack builder ----------

const WALKABLE = new Set(['footway', 'path', 'pedestrian', 'steps', 'living_street', 'track', 'service', 'cycleway', 'corridor', 'bridleway', 'residential', 'unclassified'])
const r5 = (x: number) => Math.round(x * 1e5) / 1e5
const centerOf = (e: OsmEl): LatLon | null => {
  if (e.lat !== undefined && e.lon !== undefined) return [e.lat, e.lon]
  if (e.center) return [e.center.lat, e.center.lon]
  const g = e.geometry ?? e.members?.flatMap((m) => m.geometry ?? []) ?? []
  if (!g.length) return null
  let a = 0, b = 0
  g.forEach((p) => { a += p.lat; b += p.lon })
  return [a / g.length, b / g.length]
}

function inside(p: LatLon, ring: LatLon[]) {
  let c = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i], [yj, xj] = ring[j]
    if (yi > p[0] !== yj > p[0] && p[1] < ((xj - xi) * (p[0] - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

export function buildPack(ref: ZooRef, els: OsmEl[]): ParkPack {
  const zooEl = els.find((e) => e.type === ref.osmType && e.id === ref.osmId)
  // boundary: the largest outer ring
  let boundary: LatLon[] = []
  if (zooEl?.geometry) boundary = zooEl.geometry.map((p) => [r5(p.lat), r5(p.lon)])
  else if (zooEl?.members) {
    const rings = zooEl.members.filter((m) => m.role !== 'inner' && m.geometry?.length).map((m) => m.geometry!.map((p) => [r5(p.lat), r5(p.lon)] as LatLon))
    boundary = rings.sort((a, b) => b.length - a.length)[0] ?? []
  }
  const hasRing = boundary.length > 3
  const center: LatLon = zooEl ? (centerOf(zooEl) ?? [ref.lat, ref.lon]) : [ref.lat, ref.lon]
  const within = (p: LatLon) => (hasRing ? inside(p, boundary) || dist(p, center) < 60 : dist(p, center) < 450)

  const paths: LatLon[][] = []
  const steps: number[] = []
  const pois: Poi[] = []
  const counters: Record<string, number> = {}
  const animalsByKey = new Map<string, { poi: Poi; card: string | null; latin: string; name: Localized; text: string }>()

  const add = (type: PoiType, name: Localized, p: LatLon, extra: Partial<Poi> = {}) => {
    counters[type] = (counters[type] ?? 0) + 1
    const poi: Poi = { id: `${type}-${counters[type]}`, type, name, lat: r5(p[0]), lon: r5(p[1]), source: 'osm' as DataSource, ...extra }
    pois.push(poi)
    return poi
  }
  const G: Record<string, Localized> = {
    toilet: { hu: 'Mosdó', en: 'Toilets', de: 'WC', es: 'Aseos' }, water: { hu: 'Ivókút', en: 'Drinking water', de: 'Trinkbrunnen', es: 'Fuente' },
    bench: { hu: 'Pihenőpad', en: 'Benches', de: 'Sitzbänke', es: 'Bancos' }, food: { hu: 'Büfé', en: 'Snack bar', de: 'Imbiss', es: 'Cafetería' },
    entrance: { hu: 'Bejárat', en: 'Entrance', de: 'Eingang', es: 'Entrada' }, info: { hu: 'Információ', en: 'Information', de: 'Information', es: 'Información' },
    playground: { hu: 'Játszótér', en: 'Playground', de: 'Spielplatz', es: 'Parque infantil' }, firstaid: { hu: 'Elsősegély', en: 'First aid', de: 'Erste Hilfe', es: 'Primeros auxilios' },
  }
  const named = (t: Record<string, string>, fallback: Localized) => (t.name ? localizedFromTags(t) : fallback)

  for (const e of els) {
    if (e === zooEl) continue
    const t = e.tags ?? {}
    if (e.type === 'way' && t.highway && WALKABLE.has(t.highway) && e.geometry && t.access !== 'private') {
      const line = e.geometry.map((p) => [r5(p.lat), r5(p.lon)] as LatLon)
      if (!line.some(within)) continue
      if (t.highway === 'steps') steps.push(paths.length)
      paths.push(line)
      continue
    }
    const c = centerOf(e)
    if (!c || !within(c)) continue
    const isAnimal = t.attraction === 'animal' || t.zoo === 'enclosure' || t.zoo === 'petting_zoo' || t.zoo === 'aviary' || t.zoo === 'reptile_house' || !!t.species
    if (isAnimal && (t.name || t.species || t['name:en'])) {
      if (t.attraction === 'plant' || /plant|páfrány|fern/i.test(t.description ?? '')) continue
      const latin = (t.species ?? t['species:en'] ?? '').trim()
      const name = localizedFromTags(t.name || t['name:en'] ? t : { name: latin })
      const text = [t.name, t['name:en'], t['name:de'], t['species:en'], latin, t.zoo].filter(Boolean).join(' ')
      const card = cardFor(latin, text)
      const key = card ?? (latin ? `l:${latin.split(' ').slice(0, 2).join(' ')}` : `n:${slug(name.en || name.hu)}`)
      if (animalsByKey.has(key)) continue
      const poi = add('animal', name, c, { indoor: !!t.building || t.indoor === 'yes', osmName: t.name })
      animalsByKey.set(key, { poi, card, latin, name, text })
      continue
    }
    if (t.amenity === 'toilets') add('toilet', named(t, G.toilet), c, { babycare: t.changing_table === 'yes', accessible: t.wheelchair === 'yes' })
    else if (t.amenity === 'drinking_water') add('water', G.water, c, { shade: true })
    else if (['restaurant', 'fast_food', 'cafe', 'ice_cream', 'bar', 'food_court'].includes(t.amenity) || ['pastry', 'confectionery', 'bakery'].includes(t.shop)) add('food', named(t, G.food), c)
    else if (t.amenity === 'bench' || t.leisure === 'picnic_table' || t.amenity === 'shelter') add('bench', G.bench, c, { shade: t.amenity === 'shelter' || t.covered === 'yes' })
    else if (t.entrance === 'main' || t.entrance === 'yes' && t.name || t.barrier === 'entrance') add('entrance', named(t, G.entrance), c)
    else if (t.tourism === 'information' && t.information !== 'board') add('info', named(t, G.info), c)
    else if (t.leisure === 'playground') add('playground', named(t, G.playground), c, { shade: true })
    else if (t.amenity === 'first_aid' || t.emergency === 'first_aid_kit' || t.healthcare === 'first_aid') add('firstaid', G.firstaid, c)
    else if (t.name && (t.building || t.tourism === 'attraction' || t.attraction || t.historic || t.shop === 'gift' || t.leisure === 'garden')) add('attraction', localizedFromTags(t), c, { indoor: !!t.building })
  }

  // species cards: hand-written where we have one, generated otherwise (max 60 per zoo)
  const latinPool = [...animalsByKey.values()].map((a) => a.latin).filter(Boolean)
  const generated: Species[] = []
  const entries = [...animalsByKey.values()].sort((a, b) => Number(!!b.card) - Number(!!a.card) || Number(!!b.latin) - Number(!!a.latin))
  const kept = entries.slice(0, 60)
  const dropIds = new Set(entries.slice(60).map((a) => a.poi.id))
  for (const a of kept) {
    if (a.card) {
      a.poi.species = [a.card]
      a.poi.name = speciesById[a.card].name
      a.poi.zone = speciesById[a.card].zone
      continue
    }
    const id = `osm:${a.latin ? slug(a.latin) : slug(a.name.en || a.name.hu)}`
    const sp = speciesById[id] ?? generatedSpecies(id, a.name, a.latin, emojiFor(a.text), latinPool)
    generated.push(sp)
    a.poi.species = [id]
  }
  const finalPois = pois.filter((p) => !dropIds.has(p.id))
  registerSpecies(generated)

  // no tagged entrance → nearest path point to the zoo's own label, or the centre
  if (!finalPois.some((p) => p.type === 'entrance')) {
    const ring = hasRing ? boundary : [center]
    const gate = ring.reduce((best, p) => (dist(p, [ref.lat, ref.lon]) < dist(best, [ref.lat, ref.lon]) ? p : best), ring[0])
    finalPois.unshift({ id: 'entrance-1', type: 'entrance', name: G.entrance, lat: gate[0], lon: gate[1], source: 'approx', approx: true })
  }

  // ChatGPT (round 4): never invent paths. With no mapped footways the
  // app shows direction and distance only, and says so.
  const animals = finalPois.filter((p) => p.type === 'animal')
  const hasPaths = paths.length >= 3
  const facilities = finalPois.filter((p) => ['toilet', 'food', 'water', 'playground', 'firstaid'].includes(p.type)).length

  const ptsAll: LatLon[] = [...(hasRing ? boundary : []), ...finalPois.map((p) => [p.lat, p.lon] as LatLon), center]
  const lats = ptsAll.map((p) => p[0]), lons = ptsAll.map((p) => p[1])
  const bounds: [[number, number], [number, number]] = [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]]

  const pick = (pred: (p: Poi) => boolean, n: number) => animals.filter(pred).slice(0, n).map((p) => p.id)
  const card = (p: Poi) => !p.species?.[0]?.startsWith('osm:')
  const routes: ThemeRoute[] = []
  const stars = pick(card, 12)
  if (stars.length >= 2) routes.push({ id: 'stars', emoji: '⭐', name: { hu: 'A sztárok köre', en: 'The star animals', de: 'Die Stars', es: 'Los animales estrella' }, desc: { hu: 'A leghíresebb állatok egy körben', en: 'The most famous animals in one loop', de: 'Die berühmtesten Tiere in einer Runde', es: 'Los animales más famosos en una vuelta' }, stops: stars })
  const indoor = pick((p) => !!p.indoor, 8)
  if (indoor.length >= 2) routes.push({ id: 'rainy', emoji: '☔', name: { hu: 'Esős napi útvonal', en: 'Rainy-day route', de: 'Regentag-Route', es: 'Ruta para días de lluvia' }, desc: { hu: 'Fedett házak és terráriumok', en: 'Indoor houses and terrariums', de: 'Häuser und Terrarien', es: 'Casas cubiertas y terrarios' }, stops: indoor })
  if (animals.length >= 4) routes.push({ id: 'all', emoji: '🧭', name: { hu: 'A nagy felfedezőkör', en: 'The grand discovery loop', de: 'Die große Entdeckerrunde', es: 'La gran vuelta' }, desc: { hu: `Mind a ${animals.length} gyűjthető állat`, en: `All ${animals.length} collectable animals`, de: `Alle ${animals.length} sammelbaren Tiere`, es: `Los ${animals.length} animales coleccionables` }, stops: animals.slice(0, 40).map((p) => p.id) })

  const name: Localized = zooEl?.tags ? localizedFromTags(zooEl.tags) : { hu: ref.name, en: ref.name }
  const today = new Date().toISOString().slice(0, 10)
  return {
    schemaVersion: 1, id: ref.id, version: `osm-${today}`, name, city: ref.city ?? '', country: ref.country ?? '',
    center, bounds, boundary: hasRing ? boundary : undefined, pois: finalPois, paths: hasPaths ? paths : [], steps: hasPaths ? steps : [], schedule: [], routes,
    coverage: { paths: hasPaths, stepsMapped: steps.length > 0, animals: animals.length, facilities },
    sources: [`https://www.openstreetmap.org/${ref.osmType}/${ref.osmId}`],
    dataNote: {
      hu: `Automatikusan az OpenStreetMap-ből (${today}). ${!hasPaths ? 'Ebben az állatkertben nincsenek feltérképezett utak – csak irányt és távolságot mutatunk. ' : ''}Etetési időket a helyszíni táblán találsz.`,
      en: `Generated from OpenStreetMap (${today}). ${!hasPaths ? 'No footpaths are mapped here – we show direction and distance only. ' : ''}Check feeding times on site.`,
      de: `Automatisch aus OpenStreetMap (${today}). ${!hasPaths ? 'Hier sind keine Wege kartiert – wir zeigen nur Richtung und Entfernung. ' : ''}Fütterungszeiten stehen vor Ort.`,
      es: `Generado desde OpenStreetMap (${today}). ${!hasPaths ? 'No hay caminos mapeados: solo mostramos dirección y distancia. ' : ''}Consulta los horarios en el zoo.`,
    },
  }
}

export function packQuery(ref: ZooRef) {
  const sel = ref.osmType === 'node' ? null : `${ref.osmType}(${ref.osmId})`
  const scope = sel ? '(area.a)' : `(around:450,${ref.lat},${ref.lon})`
  return `[out:json][timeout:90][maxsize:67108864];
${sel ? `${sel}->.z;.z out geom;.z map_to_area->.a;` : `node(${ref.osmId});out;`}
(way${scope}[highway];nwr${scope}[amenity];nwr${scope}[attraction];nwr${scope}[zoo];nwr${scope}[species];nwr${scope}[leisure~"playground|picnic_table|garden"];nwr${scope}[entrance];nwr${scope}[tourism~"information|attraction"];nwr${scope}[building][name];nwr${scope}[shop];);
out geom qt;`
}

export async function loadPack(ref: ZooRef, signal?: AbortSignal): Promise<ParkPack> {
  const els = await overpass(packQuery(ref), signal)
  return buildPack(ref, els)
}

