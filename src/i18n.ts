import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Lang, Localized } from './types'

const hu = {
  tagline: 'Családi felfedezőtúra a világ állatkertjeiben',
  tabs: { plan: 'Mai kaland', map: 'Térkép', collection: 'Gyűjtemény', board: 'Ranglista', world: 'Állatkertek' },
  plan: {
    title: 'Mi fér bele a mai napba?',
    time: 'Mennyi időtök van?',
    favs: 'Kiket akartok látni? (max. 6)',
    needs: 'Mire figyeljünk?',
    stroller: 'Babakocsi / kerekesszék',
    shade: 'Árnyékos út (meleg van)',
    rain: 'Fedett helyek (esik)',
    kids: 'Kisgyerek tempó',
    theme: 'Vagy válasszatok kész útvonalat',
    build: 'Útvonal elkészítése',
    result: 'A ti utatok',
    stops: '{{n}} megálló',
    walk: '{{m}} perc séta',
    fits: 'Belefér a {{h}} órába',
    tooLong: 'Szűkös – a végéről kihagytunk {{n}} állatot',
    start: 'Indulás a térképen',
    feeding: 'Mai etetések és bemutatók',
    leaveAt: 'Indulj {{t}}-kor',
  },
  map: {
    you: 'Itt vagy',
    accuracy: 'Pontosság: ±{{m}} m',
    weak: 'Gyenge GPS-jel – koppints a térképen, hol állsz',
    simulate: 'Bemutató mód: koppints a térképre a helyed megadásához',
    locate: 'Helyem',
    next: 'Következő',
    arrived: 'Megérkeztetek! Tegyétek el a telefont, és keressétek meg az állatot 👀',
    toilet: 'Mosdó',
    rest: 'Szünet kell',
    cantSee: 'Nem látjuk',
    exit: 'Kijárat',
    nearest: 'Legközelebbi: {{name}}',
    catch: 'Elkapás fotóval',
    tooFar: 'Menj közelebb ({{m}} m)',
    report: 'Mi a helyzet itt?',
    reportThanks: 'Köszi! +{{p}} pont a családnak',
    closed: 'Zárva',
    feedingSoon: 'Etetés {{t}}-kor',
    replanned: 'Útvonal újratervezve – Szafari Hős bónusz!',
  },
  report: { clean: 'Tiszta', dirty: 'Koszos', queue: 'Nagy sor', closed: 'Zárva', active: 'Aktív az állat', sleeping: 'Alszik / bújik' },
  catch: {
    title: '{{name}} befogása',
    take: 'Fotó készítése',
    stale: 'Ez a kép nem most készült – élő fotó kell',
    hidden: 'Nem látszik? Virtuális kereső',
    quizTitle: 'Virtuális kereső – válaszolj és megkapod a kártyát',
    correct: 'Helyes! +{{p}} pont',
    wrong: 'Nem talált – próbáljátok újra a kifutónál',
    caught: 'Megvan! +{{p}} pont',
    coop: 'Többen fotóztunk (+20%)',
    already: 'Ez már megvan – újabb fotó a naplóba',
    legendNow: 'Etetési idő – most Legendás, dupla pont!',
  },
  collection: {
    title: 'Családi gyűjtemény',
    progress: '{{a}} / {{b}} faj',
    empty: 'Még üres. Menjetek a térképre és kapjátok el az első állatot!',
    real: 'Igazi fotó',
    virtual: 'Kártya',
    fact: 'Tudtad?',
    journal: 'Expedíciós napló',
    level: '{{n}}. szint',
    badges: 'Jelvények',
  },
  rarity: { common: 'Gyakori', rare: 'Ritka', epic: 'Epikus', legendary: 'Legendás' },
  board: {
    title: 'Családi ranglista',
    today: 'Ma', week: 'Heti liga', all: 'Örök',
    you: 'Ti',
    demo: 'Bemutató mód: minta-családok. Közös, valódi ranglista Supabase-szel kapcsolható be.',
    nickTitle: 'A családotok beceneve',
    nickHint: 'Csak a becenév nyilvános – név, fotó és hely soha.',
    save: 'Mentés',
    members: 'Hányan vagytok ma?',
  },
  world: {
    title: 'A világ állatkertjei',
    live: 'Elérhető',
    soon: 'Hamarosan',
    open: 'Megnyitás',
    request: 'Szavazz rá',
    voted: 'Köszi a szavazatot!',
    sub: 'Budapest a pilot. Minden állatkert egy nyílt „park pack” – bárki hozzájárulhat.',
  },
  badges: {
    first: 'Első fogás', hero: 'Szafari Hős', zone: 'Zóna-bajnok', helper: 'Segítő kéz', legend: 'Legenda-vadász', scholar: 'Kis tudós',
  },
  common: { min: 'perc', close: 'Bezárás', back: 'Vissza', approx: 'hozzávetőleges hely', data: 'Adatforrás' },
}

type Dict = typeof hu

const en: Dict = {
  tagline: 'A family discovery quest through the world’s zoos',
  tabs: { plan: 'Today', map: 'Map', collection: 'Collection', board: 'Leaderboard', world: 'Zoos' },
  plan: {
    title: 'What fits into today?', time: 'How much time do you have?', favs: 'Who do you want to see? (max 6)', needs: 'Anything to plan around?',
    stroller: 'Stroller / wheelchair', shade: 'Shady route (it’s hot)', rain: 'Covered places (rain)', kids: 'Little-kid pace',
    theme: 'Or pick a ready-made route', build: 'Build our route', result: 'Your route', stops: '{{n}} stops', walk: '{{m}} min walk',
    fits: 'Fits into {{h}} h', tooLong: 'Tight – we dropped {{n}} animals from the end', start: 'Start on the map',
    feeding: 'Today’s feedings & keeper talks', leaveAt: 'Leave at {{t}}',
  },
  map: {
    you: 'You are here', accuracy: 'Accuracy: ±{{m}} m', weak: 'Weak GPS – tap the map where you are', simulate: 'Demo mode: tap the map to set your position',
    locate: 'Locate me', next: 'Next', arrived: 'You’ve arrived! Put the phone away and spot the animal 👀', toilet: 'Toilet', rest: 'Need a break',
    cantSee: 'Can’t see it', exit: 'Exit', nearest: 'Nearest: {{name}}', catch: 'Catch with a photo', tooFar: 'Get closer ({{m}} m)',
    report: 'How is it here?', reportThanks: 'Thanks! +{{p}} points for your family', closed: 'Closed', feedingSoon: 'Feeding at {{t}}',
    replanned: 'Route re-planned – Safari Hero bonus!',
  },
  report: { clean: 'Clean', dirty: 'Dirty', queue: 'Long queue', closed: 'Closed', active: 'Animal active', sleeping: 'Sleeping / hiding' },
  catch: {
    title: 'Catch the {{name}}', take: 'Take photo', stale: 'This photo wasn’t taken just now – a live shot is needed',
    hidden: 'Hidden? Virtual seeker', quizTitle: 'Virtual seeker – answer to earn the card', correct: 'Correct! +{{p}} points',
    wrong: 'Not quite – try again at the enclosure', caught: 'Caught! +{{p}} points', coop: 'Several of us took photos (+20%)',
    already: 'Already collected – a new photo goes to the journal',
    legendNow: 'Feeding time – Legendary now, double points!',
  },
  collection: {
    title: 'Family collection', progress: '{{a}} / {{b}} species', empty: 'Empty so far. Head to the map and catch your first animal!',
    real: 'Real photo', virtual: 'Card', fact: 'Did you know?', journal: 'Expedition journal', level: 'Level {{n}}', badges: 'Badges',
  },
  rarity: { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' },
  board: {
    title: 'Family leaderboard', today: 'Today', week: 'Weekly league', all: 'All-time', you: 'You',
    demo: 'Demo mode: sample families. A shared live leaderboard can be switched on with Supabase.',
    nickTitle: 'Your family nickname', nickHint: 'Only the nickname is public – never names, photos or location.', save: 'Save', members: 'How many of you today?',
  },
  world: {
    title: 'Zoos of the world', live: 'Available', soon: 'Coming soon', open: 'Open', request: 'Vote for it', voted: 'Thanks for voting!',
    sub: 'Budapest is the pilot. Every zoo is an open “park pack” anyone can contribute to.',
  },
  badges: { first: 'First catch', hero: 'Safari Hero', zone: 'Zone champion', helper: 'Helping hand', legend: 'Legend hunter', scholar: 'Little scholar' },
  common: { min: 'min', close: 'Close', back: 'Back', approx: 'approximate location', data: 'Data source' },
}

const de: Dict = {
  tagline: 'Familien-Entdeckertour durch die Zoos der Welt',
  tabs: { plan: 'Heute', map: 'Karte', collection: 'Sammlung', board: 'Rangliste', world: 'Zoos' },
  plan: {
    title: 'Was passt in den heutigen Tag?', time: 'Wie viel Zeit habt ihr?', favs: 'Wen wollt ihr sehen? (max. 6)', needs: 'Worauf sollen wir achten?',
    stroller: 'Kinderwagen / Rollstuhl', shade: 'Schattiger Weg (heiß)', rain: 'Überdachte Orte (Regen)', kids: 'Kleinkind-Tempo',
    theme: 'Oder eine fertige Route wählen', build: 'Route erstellen', result: 'Eure Route', stops: '{{n}} Stationen', walk: '{{m}} Min. Fußweg',
    fits: 'Passt in {{h}} Std.', tooLong: 'Knapp – {{n}} Tiere am Ende weggelassen', start: 'Auf der Karte starten',
    feeding: 'Fütterungen & Kommentierungen heute', leaveAt: 'Losgehen um {{t}}',
  },
  map: {
    you: 'Du bist hier', accuracy: 'Genauigkeit: ±{{m}} m', weak: 'Schwaches GPS – tippe auf die Karte, wo du stehst', simulate: 'Demo: Tippe auf die Karte, um deinen Standort zu setzen',
    locate: 'Mein Standort', next: 'Nächstes', arrived: 'Angekommen! Handy weg und das Tier entdecken 👀', toilet: 'WC', rest: 'Pause nötig',
    cantSee: 'Nicht zu sehen', exit: 'Ausgang', nearest: 'Am nächsten: {{name}}', catch: 'Mit Foto fangen', tooFar: 'Geh näher ran ({{m}} m)',
    report: 'Wie ist es hier?', reportThanks: 'Danke! +{{p}} Punkte für eure Familie', closed: 'Geschlossen', feedingSoon: 'Fütterung um {{t}}',
    replanned: 'Route neu geplant – Safari-Held-Bonus!',
  },
  report: { clean: 'Sauber', dirty: 'Schmutzig', queue: 'Lange Schlange', closed: 'Geschlossen', active: 'Tier aktiv', sleeping: 'Schläft / versteckt' },
  catch: {
    title: '{{name}} fangen', take: 'Foto aufnehmen', stale: 'Dieses Foto ist nicht von gerade eben – ein Live-Foto ist nötig',
    hidden: 'Versteckt? Virtueller Sucher', quizTitle: 'Virtueller Sucher – beantworte die Frage für die Karte', correct: 'Richtig! +{{p}} Punkte',
    wrong: 'Leider nein – versucht es am Gehege noch einmal', caught: 'Gefangen! +{{p}} Punkte', coop: 'Mehrere haben fotografiert (+20 %)',
    already: 'Schon gesammelt – neues Foto kommt ins Tagebuch',
    legendNow: 'Fütterungszeit – jetzt Legendär, doppelte Punkte!',
  },
  collection: {
    title: 'Familiensammlung', progress: '{{a}} / {{b}} Arten', empty: 'Noch leer. Ab zur Karte und das erste Tier fangen!',
    real: 'Echtes Foto', virtual: 'Karte', fact: 'Schon gewusst?', journal: 'Expeditionstagebuch', level: 'Level {{n}}', badges: 'Abzeichen',
  },
  rarity: { common: 'Häufig', rare: 'Selten', epic: 'Episch', legendary: 'Legendär' },
  board: {
    title: 'Familien-Rangliste', today: 'Heute', week: 'Wochenliga', all: 'Ewig', you: 'Ihr',
    demo: 'Demo-Modus: Beispielfamilien. Eine gemeinsame Live-Rangliste lässt sich mit Supabase aktivieren.',
    nickTitle: 'Euer Familien-Spitzname', nickHint: 'Nur der Spitzname ist öffentlich – nie Namen, Fotos oder Standort.', save: 'Speichern', members: 'Wie viele seid ihr heute?',
  },
  world: {
    title: 'Zoos der Welt', live: 'Verfügbar', soon: 'Demnächst', open: 'Öffnen', request: 'Dafür stimmen', voted: 'Danke für deine Stimme!',
    sub: 'Budapest ist der Pilot. Jeder Zoo ist ein offenes „Park-Pack“, zu dem jeder beitragen kann.',
  },
  badges: { first: 'Erster Fang', hero: 'Safari-Held', zone: 'Zonen-Champion', helper: 'Helfende Hand', legend: 'Legendenjäger', scholar: 'Kleiner Forscher' },
  common: { min: 'Min.', close: 'Schließen', back: 'Zurück', approx: 'ungefährer Ort', data: 'Datenquelle' },
}

const es: Dict = {
  tagline: 'Una aventura familiar por los zoológicos del mundo',
  tabs: { plan: 'Hoy', map: 'Mapa', collection: 'Colección', board: 'Ranking', world: 'Zoológicos' },
  plan: {
    title: '¿Qué cabe en el día de hoy?', time: '¿Cuánto tiempo tenéis?', favs: '¿A quién queréis ver? (máx. 6)', needs: '¿Algo que tener en cuenta?',
    stroller: 'Carrito / silla de ruedas', shade: 'Ruta con sombra (hace calor)', rain: 'Lugares cubiertos (llueve)', kids: 'Ritmo de niños pequeños',
    theme: 'O elegid una ruta preparada', build: 'Crear nuestra ruta', result: 'Vuestra ruta', stops: '{{n}} paradas', walk: '{{m}} min a pie',
    fits: 'Cabe en {{h}} h', tooLong: 'Justo – quitamos {{n}} animales del final', start: 'Empezar en el mapa',
    feeding: 'Comidas y charlas de hoy', leaveAt: 'Salid a las {{t}}',
  },
  map: {
    you: 'Estás aquí', accuracy: 'Precisión: ±{{m}} m', weak: 'GPS débil – toca el mapa donde estás', simulate: 'Modo demo: toca el mapa para fijar tu posición',
    locate: 'Mi ubicación', next: 'Siguiente', arrived: '¡Habéis llegado! Guardad el móvil y buscad al animal 👀', toilet: 'Aseo', rest: 'Necesito un descanso',
    cantSee: 'No se ve', exit: 'Salida', nearest: 'Más cercano: {{name}}', catch: 'Atrapar con foto', tooFar: 'Acércate ({{m}} m)',
    report: '¿Cómo está esto?', reportThanks: '¡Gracias! +{{p}} puntos para la familia', closed: 'Cerrado', feedingSoon: 'Comida a las {{t}}',
    replanned: 'Ruta replanificada – ¡bonus Héroe Safari!',
  },
  report: { clean: 'Limpio', dirty: 'Sucio', queue: 'Mucha cola', closed: 'Cerrado', active: 'Animal activo', sleeping: 'Durmiendo / escondido' },
  catch: {
    title: 'Atrapa: {{name}}', take: 'Hacer foto', stale: 'Esta foto no es de ahora – hace falta una foto en vivo',
    hidden: '¿Escondido? Buscador virtual', quizTitle: 'Buscador virtual – responde y gana la carta', correct: '¡Correcto! +{{p}} puntos',
    wrong: 'Casi – probad otra vez en el recinto', caught: '¡Atrapado! +{{p}} puntos', coop: 'Varios hicimos fotos (+20 %)',
    already: 'Ya lo tenéis – la nueva foto va al diario',
    legendNow: '¡Hora de comer – ahora Legendario, puntos dobles!',
  },
  collection: {
    title: 'Colección familiar', progress: '{{a}} / {{b}} especies', empty: 'Aún vacía. ¡Id al mapa y atrapad el primer animal!',
    real: 'Foto real', virtual: 'Carta', fact: '¿Sabías que…?', journal: 'Diario de expedición', level: 'Nivel {{n}}', badges: 'Insignias',
  },
  rarity: { common: 'Común', rare: 'Raro', epic: 'Épico', legendary: 'Legendario' },
  board: {
    title: 'Ranking familiar', today: 'Hoy', week: 'Liga semanal', all: 'Histórico', you: 'Vosotros',
    demo: 'Modo demo: familias de ejemplo. El ranking compartido se activa con Supabase.',
    nickTitle: 'Apodo de vuestra familia', nickHint: 'Solo el apodo es público – nunca nombres, fotos ni ubicación.', save: 'Guardar', members: '¿Cuántos sois hoy?',
  },
  world: {
    title: 'Zoológicos del mundo', live: 'Disponible', soon: 'Próximamente', open: 'Abrir', request: 'Votar', voted: '¡Gracias por votar!',
    sub: 'Budapest es el piloto. Cada zoo es un “park pack” abierto al que cualquiera puede contribuir.',
  },
  badges: { first: 'Primera captura', hero: 'Héroe Safari', zone: 'Campeón de zona', helper: 'Mano amiga', legend: 'Cazaleyendas', scholar: 'Pequeño sabio' },
  common: { min: 'min', close: 'Cerrar', back: 'Atrás', approx: 'ubicación aproximada', data: 'Fuente de datos' },
}

export const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'hu', label: 'Magyar', flag: '🇭🇺' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { id: 'es', label: 'Español', flag: '🇪🇸' },
]

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('zq-lang') as Lang | null
    if (saved && LANGS.some((l) => l.id === saved)) return saved
  } catch { /* ignore */ }
  const nav = (navigator.language || 'hu').slice(0, 2) as Lang
  return LANGS.some((l) => l.id === nav) ? nav : 'hu'
}

i18n.use(initReactI18next).init({
  resources: { hu: { translation: hu }, en: { translation: en }, de: { translation: de }, es: { translation: es } },
  lng: initialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function setLang(l: Lang) {
  i18n.changeLanguage(l)
  try { localStorage.setItem('zq-lang', l) } catch { /* ignore */ }
  document.documentElement.lang = l
}

/** Pick the right language from park-pack content, falling back to English. */
export function loc(t: Localized | undefined, lang: string): string {
  if (!t) return ''
  return (t as Record<string, string>)[lang] ?? t.en ?? t.hu
}

export default i18n
