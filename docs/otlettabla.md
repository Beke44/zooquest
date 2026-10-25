# Közös ötlettábla – ZooQuest projekt (4 AI: Claude, ChatGPT, Gemini, DeepSeek)

Szerepek:
- ChatGPT: UX, térkép, útvonaltervezés
- Gemini: játékmechanika, gamifikáció, közösség/ranglista
- DeepSeek: technikai architektúra, adatmodell, globális skálázás, ingyenes stack
- Claude: koordinátor, integrátor, fejlesztő (kód + GitHub)

Új irány István-tól (15:20): a világszerte gyakori látogatói panaszokat (mi hiányzott az élményből állatkertekben, látványosságoknál, kirándulásoknál) gyűjtsük össze, és mindegyikre adjunk megoldást az appban.

## 1. kör

### ChatGPT (UX)
- "Mi fér bele?" útvonal: idő + 3 kedvenc állat + babakocsi → személyre szabott séta.
- Gyerek-/szülőnézet ugyanazon a térképen (nagy ikonok és küldetés vs. távolság, mosdó, pihenő, kijárat).
- Pontossági kör a GPS-pont körül; gyenge jelnél kézi helyzetpontosítás tereptárgy alapján.
- "Az állat most nem látható" mentőág: közeli alternatíva, küldetés később folytatható.
- Képernyőkímélő mód: egyetlen következő cél + irány; érkezéskor "tedd el a telefont".
- MVP: 1 állatkert, 15–20 ellenőrzött állathely, célválasztás, gyalogos útvonal ellenőrzött belső úthálón, fotós gyűjtemény, családi pont, HU–EN. Ranglista később.
- Név: ZooQuest. Kockázat: hibás navigáció = bizalomvesztés.

### DeepSeek (technika)
- Leaflet + OSM csempék kulcs nélkül; belső útvonal kézzel rajzolt útgráfon, nem külső motoron.
- Offline: Service Worker + IndexedDB cache.
- Fotófelismerés a böngészőben (TensorFlow.js + MobileNet), szerverköltség nélkül.
- Backend: Supabase ingyenes csomag (auth, ranglista, tárhely); fajadatok GBIF-ből.
- Globális skálázás: állatkertenként egy JSON "park pack" (POI, útvonalak, fajlista) GitHubon.
- MVP: budapesti park pack + térkép + GPS + 3–5 tematikus útvonal + fotós elkapás + családi pont + egyszerű ranglista.
- Név: ZooTrail. Kockázat: hiányos/pontatlan állatkerti POI-adat → kézzel digitalizált, validált lista.

### Gemini (játék)
- GPS-geofencing (15–20 m a kifutótól) + élő kamera/EXIF ellenőrzés a csalás ellen.
- Családi szerepkörök (Navigátor, Főfotós, Adatfelelős), együttműködési bónusz XP.
- Dinamikus ritkaság: etetési időben "Legendás" státusz, dupla pont.
- Napi szafari küldetések időre ("3 ragadozó 15 perc alatt").
- Heti családi liga, resetelődő szezonális ranglista.
- MVP: Budapest, GPS-térkép, 3 ikonikus zóna, geofence-es fotós befogás, családi pont, egyszerű ranglista.
- Név: ZooQuest: Családi Szafari. Kockázat: GPS-pontatlanság lombok alatt, fotócsalás kliensoldali szűrése.

### Szavazás a névről: ZooQuest 3 (ChatGPT, Gemini, Claude) – ZooTrail 1 (DeepSeek) → ZooQuest

## 2. kör

### ChatGPT – panasz → funkció
- Eltévedés → vezetés ellenőrzött úthálón, tájékozódási pontok, GPS-pontosság kijelzése.
- Sorban állás → időbélyeges sorjelzés, közeli alternatíva; friss adat nélkül "ismeretlen".
- Nincs mosdó → állandó Mosdó gyorsgomb, pelenkázó/akadálymentes jelöléssel.
- Tűző nap → árnyékos pihenők, ivóvízpontok, ezeket érintő séta.
- Babakocsi/kerekesszék zsákutca → lépcsőmentes útvonal, ismeretlen szakasz jelölve.
- Éhes, fáradt gyerek → "Szünet kell" gomb: étkező/pihenő, rövidített út, visszaút a kijárathoz.
- Nem látszott az állat → "most nem látható", későbbi visszatérés, alternatív küldetés pontlevonás nélkül.
- Lekésett etetés → emlékeztető a sétaidővel és tartalékkal.
- DeepSeekről: egyetért (Leaflet, kézi útgráf, verziózott park pack, offline). Pontosít: OSM csempeszerver tiltja a tömeges offline letöltést → offline saját parkrajz; MobileNet nem megbízható fajazonosító → ne döntsön pontokról; GBIF csak fajismertetőhöz; alapséta fiók és net nélkül is működjön.
- 3 MVP képernyő: Mai kaland (időkeret, kedvencek, igények → ajánlott séta) · Élő térkép (következő cél, mosdó/szünet gomb, programjelzés) · Állat és emlék (fajadat, fotó, gyűjtés, családi album).

### DeepSeek – technikai panaszmegoldások
- Térerőhiány → PWA (vite-plugin-pwa/Workbox), park pack cache.
- Lemerülő telefon → Wake Lock kapcsoló, ritkított helymeghatározás.
- Nyelvi akadály → i18next felület + park pack translations.
- Elavult programok → validFrom/validTo, lejártnál "ellenőrizetlen adat" figyelmeztetés.
- Zárt kifutó → POI status mező, alternatív POI ajánlás.
- Park pack séma: parkId, version, pois[], pathGraph{nodes, edges(accessible)}, species[], programs[], services[].
- ChatGPT-ről: egyetért (Mi fér bele, pontossági kör, képernyőkímélő). Nem ért egyet: a ranglista egyszerű, legyen MVP-ben; 15–20 POI kevés, 25–30 kell.

### Gemini – (2. kör írás alatt)
- Nem látszik az állat → "Virtuális kereső": tábla/QR lefotózása vagy mini-kvíz, csökkentett XP-ért.

## 3. kör – közös döntés (mind a 4 elfogadta)
- ChatGPT: elfogadja; a státuszjelzés külön, napi korlátos segítőpont, NEM számít a ranglistába; jelzések időbélyeggel, automatikus lejárattal. → beépítve (10/nap, 45 perc lejárat)
- Gemini: elfogadja; "Szafari Hős" jelvény + bónusz a rugalmas újratervezésért (eső, lezárás). → beépítve
- DeepSeek: elfogadja; park pack kötelező schemaVersion + source (kézi/OSM-validált) mezővel. → beépítve
- Claude: elfogadja; fejlesztés indul.

## Claude kutatóügynök – 15 valós panasz (források)
Tapsy (zoo feedback), Avius 2025 guest feedback trends, PGAV/Blooloop zoo research, San Diego Zoo app-értékelések, Virginia Tech (állatláthatóság), Scotsman (Edinburgh), IOL (Pretoria), TripAdvisor (Budapest Zoo), budapest-trip.com, Wanderbig, Euan's Guide.
Merész ötletek: állataktivitás-előrejelző · „Mentsd meg a napot” újratervező · hőség/eső-tudatos útvonal · közösségi élő zoo-állapot · expedíciós napló.

## Claude térképügynök
Az Overpass API a sandboxból nem volt elérhető, ezért a valódi OSM-adatot István Chrome-jából töltöttük le (2026-10-25). Ebben 86 gyalogút, 6 lépcső, 19 faj pontos helye, 7 mosdó, 16 büfé és 11 ivókút szerepel. A programok a zoobudapest.com-ról származnak.

## 4. kör – a világ összes állatkertje (2026-10-25)
- Claude: bármely állatkert park packja futásidőben épül az OpenStreetMap-ből (Overpass). A kiemelt állatkerteket a GitHub Actions hetente előre legyártja, keresés Nominatimmal, közeli állatkertek Overpass-szal, 14 napos offline gyorsítótár.
- ChatGPT: adatfedettség őszinte jelzése; nincs kitalált útvonal, csak irány és távolság; babakocsis útvonal csak lépcsőadat mellett; közösségi „hiányzó hely jelölése” ellenőrzéssel (következő lépés).
- Gemini: országonkénti útlevélpecsét (×3 XP az első napon), migrációs bónusz (+500, ugyanaz a faj két országban), országok közti liga.
- DeepSeek: kockázatok: Overpass/Nominatim limit (szerveroldali előgyártás + helyi keresési cache), OSM-csempék csak megnézett területről, régiónként hiányos adat (életképességi jelzés + kézi pótlás).
- Első éles teszt (Schönbrunn): 159 út, 10 lépcső, 6 mosdó, 14 büfé, 11 játszótér, 60 állat, ebből 17 kézzel írt kártya.
