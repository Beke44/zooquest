"""Builds src/data/budapest.ts from OpenStreetMap (osm-budapest.json) +
the official keeper-programme schedule. Re-run after refreshing the OSM
extract (Overpass query in README)."""
import json, sys
osm = json.load(open(sys.argv[1]))
out = sys.argv[2]

GENERIC = {
  't': ({'hu':'Mosdó','en':'Toilets','de':'WC','es':'Aseos'}, 'toilet'),
  'w': ({'hu':'Ivókút','en':'Drinking water','de':'Trinkbrunnen','es':'Fuente'}, 'water'),
  'b': ({'hu':'Pihenőpad','en':'Benches','de':'Sitzbänke','es':'Bancos'}, 'bench'),
  'f': ({'hu':'Büfé','en':'Snack bar','de':'Imbiss','es':'Cafetería'}, 'food'),
  'e': ({'hu':'Bejárat','en':'Entrance','de':'Eingang','es':'Entrada'}, 'entrance'),
  'i': ({'hu':'Információ','en':'Information','de':'Information','es':'Información'}, 'info'),
  'g': ({'hu':'Játszótér','en':'Playground','de':'Spielplatz','es':'Parque infantil'}, 'playground'),
  's': ({'hu':'Látnivaló','en':'Sight','de':'Sehenswürdigkeit','es':'Atracción'}, 'attraction'),
}
INDOOR_HOUSES = ['Pálmaház','Madagaszkár','Elefántház','Emberszabásúak','India-ház','Mérgesház','Szavannaház','Vidraház','Vombatház','Bagolyvár','Vízparti','Cápasuli','Zsiráfház']

ZONE = {'lion':'asia','tiger':'asia','elephant':'asia','redpanda':'asia','zebra':'africa','giraffe':'africa','rhino':'africa','hippo':'africa',
        'meerkat':'africa','flamingo':'africa','gorilla':'apes','orangutan':'apes','monkey':'apes','penguin':'water','seal':'water',
        'crocodile':'tropics','snake':'tropics','kangaroo':'australia','goat':'farm'}
INDOOR = {'snake','crocodile','monkey','gorilla','orangutan','elephant'}
SHADE = {'monkey','crocodile','snake','kangaroo','redpanda','gorilla','orangutan'}

pois = []
for sid, items in osm['A'].items():
    lat, lon, osmname = items[0]
    pois.append({'id': sid, 'type':'animal', 'species':[sid], 'name': {'hu': osmname[:1].upper()+osmname[1:], 'en': sid}, 'lat':lat, 'lon':lon, 'zone':ZONE.get(sid),
                 'indoor': sid in INDOOR, 'shade': sid in SHADE, 'source':'osm', 'osmName': osmname, 'status':'open'})

counters = {}
seen_names = set()
for k, lat, lon, hu, en, flag in osm['F']:
    name, typ = GENERIC[k]
    counters[k] = counters.get(k, 0) + 1
    if hu in ('főbejárat', 'Állatkert Főbejárat'):
        continue
    key = (hu, round(lat, 4), round(lon, 4))
    if hu and key in seen_names:
        continue
    seen_names.add(key)
    pid = f"{typ}-{counters[k]}"
    n = dict(name)
    if hu:
        n = {'hu': hu, 'en': en or hu}
    p = {'id': pid, 'type': typ, 'name': n, 'lat': lat, 'lon': lon, 'source': 'osm'}
    if typ == 'toilet' and flag: p['babycare'] = True
    if typ == 'attraction' and any(h in hu for h in INDOOR_HOUSES): p['indoor'] = True
    if typ in ('bench','water','playground'): p['shade'] = True
    pois.append(p)

# the main (Elephant) gate on Állatkerti körút
main = min([p for p in pois if p['type']=='entrance'], key=lambda p: abs(p['lat']-47.51801)+abs(p['lon']-19.07757))
main['id'] = 'main-gate'
main['name'] = {'hu':'Főbejárat (Elefántkapu)','en':'Main entrance (Elephant Gate)','de':'Haupteingang (Elefantentor)','es':'Entrada principal (Puerta del Elefante)'}
pois.remove(main); pois.insert(0, main)

def find_attr(word):
    for p in pois:
        if p['type']=='attraction' and word in p['name']['hu']: return p['id']
    return None

V = {'validFrom':'2026-04-01','validTo':'2026-11-01','source':'manual'}
sched = [
 ('penguin','10:00',{'hu':'Pingvinetetés','en':'Penguin feeding','de':'Pinguinfütterung','es':'Comida de los pingüinos'}),
 ('lion','10:30',{'hu':'Ragadozóetetés','en':'Big cat feeding','de':'Raubtierfütterung','es':'Comida de los felinos'}),
 ('seal','11:00',{'hu':'Oroszlánfóka-tréning','en':'Sea lion training','de':'Seelöwentraining','es':'Entrenamiento de leones marinos'}),
 (find_attr('Cápasuli'),'12:00',{'hu':'Cápák világa','en':'World of sharks','de':'Welt der Haie','es':'El mundo de los tiburones'}),
 ('goat','12:30',{'hu':'Barátaink a tanyáról','en':'Friends from the farm','de':'Freunde vom Bauernhof','es':'Amigos de la granja'}),
 ('gorilla','13:00',{'hu':'Gorillaetetés','en':'Gorilla feeding','de':'Gorillafütterung','es':'Comida de los gorilas'}),
 (find_attr('Vidraház'),'13:00',{'hu':'Óriásvidra-etetés','en':'Giant otter feeding','de':'Riesenotterfütterung','es':'Comida de las nutrias gigantes'}),
 (find_attr('Vadállatmentő'),'14:00',{'hu':'Vadállatmentők','en':'Wildlife rescuers talk','de':'Wildtierretter','es':'Rescatadores de fauna'}),
 ('flamingo','14:30',{'hu':'Pelikánetetés a Nagytónál','en':'Pelican feeding at the Great Lake','de':'Pelikanfütterung am großen See','es':'Comida de los pelícanos'}),
 ('elephant','15:00',{'hu':'Elefánttréning','en':'Elephant training','de':'Elefantentraining','es':'Entrenamiento de elefantes'}),
 ('seal','16:00',{'hu':'Oroszlánfóka-tréning','en':'Sea lion training','de':'Seelöwentraining','es':'Entrenamiento de leones marinos'}),
]
schedule = [dict(poiId=a, time=b, label=c, **V) for a,b,c in sched if a]

routes = [
 {'id':'safari','emoji':'🌍','name':{'hu':'Afrikai szafari','en':'African safari','de':'Afrika-Safari','es':'Safari africano'},
  'desc':{'hu':'Zebra, zsiráf, orrszarvú, víziló és szurikáták','en':'Zebras, giraffes, rhinos, hippos and meerkats','de':'Zebras, Giraffen, Nashörner, Flusspferde, Erdmännchen','es':'Cebras, jirafas, rinocerontes, hipopótamos y suricatas'},
  'stops':['zebra','giraffe','rhino','hippo','meerkat','flamingo']},
 {'id':'predators','emoji':'🐾','name':{'hu':'Ragadozók nyomában','en':'On the trail of predators','de':'Auf der Spur der Raubtiere','es':'Tras la pista de los depredadores'},
  'desc':{'hu':'Oroszlán, tigris, aligátor és kígyók','en':'Lions, tigers, alligators and snakes','de':'Löwen, Tiger, Alligatoren und Schlangen','es':'Leones, tigres, caimanes y serpientes'},
  'stops':['lion','tiger','crocodile','snake']},
 {'id':'little','emoji':'🧸','name':{'hu':'Kicsik kedvencei (rövid kör)','en':'Little ones’ favourites (short loop)','de':'Lieblinge der Kleinen (kurze Runde)','es':'Favoritos de los peques (ruta corta)'},
  'desc':{'hu':'Pingvin, fóka, maki, kecskesimogató + játszótér','en':'Penguins, sea lions, lemurs, petting goats + playground','de':'Pinguine, Seelöwen, Lemuren, Ziegen + Spielplatz','es':'Pingüinos, leones marinos, lémures, cabras + parque'},
  'stops':['penguin','seal','monkey','goat']},
 {'id':'rainy','emoji':'☔','name':{'hu':'Esős napi útvonal','en':'Rainy-day route','de':'Regentag-Route','es':'Ruta para días de lluvia'},
  'desc':{'hu':'Fedett házak: Pálmaház, Madagaszkár-ház, Emberszabásúak, Elefántház','en':'Indoor houses: Palm House, Madagascar, Great Apes, Elephants','de':'Überdachte Häuser: Palmenhaus, Madagaskar, Menschenaffen, Elefanten','es':'Casas cubiertas: Palmeras, Madagascar, Simios, Elefantes'},
  'stops':['crocodile','monkey','gorilla','orangutan','elephant']},
 {'id':'zootrail','emoji':'🧭','name':{'hu':'ZooTrail – a nagy kör','en':'ZooTrail – the grand loop','de':'ZooTrail – die große Runde','es':'ZooTrail – la gran vuelta'},
  'desc':{'hu':'Minden ikonikus állat egy napban (DeepSeek névötlete)','en':'Every iconic animal in one day','de':'Alle Stars an einem Tag','es':'Todos los animales estrella en un día'},
  'stops':['kangaroo','crocodile','penguin','seal','monkey','lion','redpanda','tiger','gorilla','orangutan','snake','flamingo','zebra','hippo','giraffe','rhino','meerkat','elephant','goat']},
]

steps = [i for i, p in enumerate(osm['P']) if p[0] == 1]
pack = {
  'schemaVersion': 1, 'id':'budapest', 'version':'2026.10.25',
  'name': {'hu':'Fővárosi Állat- és Növénykert','en':'Budapest Zoo & Botanical Garden','de':'Zoo & Botanischer Garten Budapest','es':'Zoo y Jardín Botánico de Budapest'},
  'city':'Budapest','country':'HU','center':[47.51885,19.07900],
  'bounds':[[47.5163,19.0730],[47.5214,19.0862]],
  'boundary': osm['B'], 'pois': pois, 'paths':[p[1:] for p in osm['P']], 'steps': steps,
  'schedule': schedule, 'routes': routes,
  'hours': 'Oct: Mon–Fri 9:00–17:00, Sat–Sun 9:00–17:30 · Nov–Feb: 9:00–16:00 · last entry 1 h before closing',
  'sources': ['https://www.openstreetmap.org/relation/6221647','https://zoobudapest.com/en/be-there/','https://zoobudapest.com/latogatoknak/nyitvatartas/'],
  'dataNote': {'hu':'Térkép és helyek: OpenStreetMap közreműködők (2026-10-25). Programok: zoobudapest.com – a helyszíni tábla az irányadó.',
               'en':'Map & places: OpenStreetMap contributors (2026-10-25). Programmes: zoobudapest.com – signs on site take precedence.',
               'de':'Karte & Orte: OpenStreetMap-Mitwirkende (25.10.2026). Programme: zoobudapest.com – Schilder vor Ort gelten.',
               'es':'Mapa y lugares: colaboradores de OpenStreetMap (25-10-2026). Programas: zoobudapest.com – manda la señalización.'},
}
from collections import Counter
print(Counter(p['type'] for p in pois), len(schedule), 'steps', len(steps))
with open(out,'w') as f:
    f.write('// AUTO-GENERATED by scripts/build_budapest.py – do not edit by hand.\n')
    f.write('// © OpenStreetMap contributors, ODbL. Programmes: zoobudapest.com\n')
    f.write("import type { ParkPack } from '@/types'\n\n")
    f.write('export const BUDAPEST: ParkPack = ' + json.dumps(pack, ensure_ascii=False) + '\n')
