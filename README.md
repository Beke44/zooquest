# 🧭 ZooQuest

**Családi felfedezőtúra a világ állatkertjeiben.** GPS-térkép, útvonaltervező és Pokémon GO-szerű fotós állatgyűjtés. A pilot helyszín a Budapesti Állat- és Növénykert. A világ többi állatkertje nyílt „park pack" adatcsomagként csatlakozhat.

> Négy AI közösen tervezte (Claude, ChatGPT, Gemini, DeepSeek), Békési István ötlete alapján. A döntések menete: [`docs/otlettabla.md`](docs/otlettabla.md).

**Élő oldal:** https://beke44.github.io/zooquest/ (minden `main`-re pusholás után automatikusan frissül)

## Mit tud?

| Látogatói panasz (világszerte) | ZooQuest-megoldás |
|---|---|
| Eltévedünk, zavaros a térkép | Élő GPS, pontossági kör, útvonal az OSM-úthálón; gyenge jelnél a térképre koppintva lehet helyet pontosítani |
| Nem fér bele minden, túl sokat gyalogolunk | **„Mi fér bele?"** tervező: időkeret, kedvenc állatok, kisgyerek-tempó, rövidített kör |
| Babakocsival vagy kerekesszékkel lépcsőhöz jutunk | Lépcsőmentes útvonalprofil: az OSM-ben jelölt lépcsőket kihagyja |
| Hol a WC vagy a pelenkázó? | Egy koppintásos **Mosdó** gomb a legközelebbi mosdóhoz, a 🚼 a pelenkázót jelzi |
| Fáradt vagy éhes a gyerek | **Szünet kell** gomb: büfé, pad, ivókút vagy játszótér |
| Tűz a nap, vagy esik | Árnyékos pihenők; esős napra fedett házakból álló útvonal |
| Üres a kifutó, alszik az állat | **Nem látjuk** gomb: továbblép pontlevonás nélkül, a kártya kvízzel is megszerezhető (Virtuális kereső) |
| Lekéstük az etetést | Mai programok az indulási idővel együtt; etetés körül az állat **Legendás**, dupla pontot ér |
| Zárt kifutó, figyelmeztetés nélkül | Közösségi élő státusz (zárva, sor, tiszta), 45 perces lejárattal |
| Csak magyarul van információ | HU / EN / DE / ES felület és tartalom |
| Nem kapcsolódik az app, nincs térerő | PWA offline gyorsítótár (app, parkadat, a már megnézett térképcsempék) |
| Nem érte meg, semmi nem marad meg | Családi gyűjtemény: az igazi fotó a virtuális kártya mellett, expedíciós napló, jelvények, szintek |
| Nincs ok visszajönni | Heti liga, zónagyűjtés, a világ állatkertjei |

### Pontozás (Gemini)
Gyakori 100 · Ritka 250 · Epikus 500 · Legendás 1000 XP. Kooperáció +20%, kvíz +50, teljes zóna +500, csendes zóna +75. A státuszjelzés külön **segítőpontot** ér (napi max. 10 jelzés). Ez nem számít bele a ranglistába (ChatGPT).

### Csalás elleni védelem
A fotózás csak a kifutó körüli **geofence**-en belül működik (35 m, a GPS-pontossággal bővítve, legfeljebb 70 m). Csak **friss** kép fogadható el: a 10 percnél régebbi galériaképet elutasítja. A fotófelismerés **nem** dönt a pontokról.

### Adatvédelem
A fotók csak a család telefonján maradnak (IndexedDB). Nyilvános csak a becenév és a pontszám.

## Technika – 100% ingyenes stack
- **React + Vite + TypeScript + Tailwind** (Lovable-kompatibilis, `@/` alias)
- **Leaflet + OpenStreetMap** csempék, saját Dijkstra-útvonalkereső az OSM-gyalogutakon (`src/lib/router.ts`)
- **i18next**: 4 nyelv (`src/i18n.ts`)
- Ranglista: alapból offline/demó mód; közös ranglistához **Supabase free tier** (`supabase/schema.sql`, `.env.example`)
- Nincs szükség API-kulcsra, fizetős szolgáltatásra vagy Lovable creditre

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ – bármilyen statikus tárhelyre (GitHub Pages, Netlify, Cloudflare Pages)
```

### Lovable-be importálás credit nélkül
1. Töltsd fel a repót a GitHubra.
2. Lovable → *New project → Import from GitHub* (vagy kösd össze a GitHub-integrációt). A szerkesztő megnyitása nem fogyaszt creditet, csak az AI-promptok.
3. Közös ranglistához add meg a Supabase kulcsokat környezeti változóként.

## Új állatkert hozzáadása („park pack")
Minden állatkert egy `ParkPack` (`src/types.ts`): `schemaVersion`, POI-k forrásjelöléssel (`source: osm | manual | community`), útháló, lépcsők, programok érvényességi dátummal (`validFrom` / `validTo`), tematikus útvonalak.

A budapesti csomag generálása:
```bash
# 1) OSM-kivonat (Overpass, böngészőből):
#    [out:json];nwr[tourism=zoo](around:900,47.5185,19.0789)->.z;.z out geom;
#    .z map_to_area->.a;(way(area.a)[highway];nwr(area.a)[name];nwr(area.a)[amenity];);out geom;
# 2) tömörítés → scripts/osm-budapest.json, majd:
python3 scripts/build_budapest.py scripts/osm-budapest.json src/data/budapest.ts
npx tsx scripts/check-graph.ts   # minden pont elérhető-e a főbejárattól
```

## Ütemterv
1. **Pilot – Budapest** ✅ (ez a verzió)
2. Közös ranglista (Supabase), magyar állatkertek (Nyíregyháza, Szeged), közösségi adatjavítás
3. Nyílt park-pack szerkesztő az állatkerteknek, állataktivitás-előrejelző a családok fotóiból, partneri kihívások

## Adatforrások
- Térkép, utak, mosdók, büfék, állathelyek: © [OpenStreetMap](https://www.openstreetmap.org/relation/6221647)-közreműködők, ODbL
- Programok és nyitvatartás: [zoobudapest.com](https://zoobudapest.com/en/be-there/) (2026. 04. 01. – 11. 01.). A helyszíni tábla az irányadó.
