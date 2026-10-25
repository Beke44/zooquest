# ZooQuest közösségi háttérszolgáltatás

A GitHub Pages-en futó React/Vite alkalmazás nyilvános közösségi adatokat olvas a `public/community-config.json` fájl `apiUrl` HTTPS-originjéről. A konfiguráció nem tartalmaz titkos kulcsot. Opcionális build felülbírálás: `VITE_COMMUNITY_API_URL`.

A megosztott adatbázis Cloudflare D1, a backend Sites-on fut. Tippek, ötletek, helyjavítások, megerősítések eszközök között megosztottak. A beküldés és a megerősítés a közösségi oldal saját felületén, natív ChatGPT-bejelentkezéssel működik; a GitHub frontend nem kap hozzáférési tokent és nem küld személyes adatot a hivatkozásban. A hivatkozás csak az állatkert azonosítóját és a felület nyelvét viszi át.

Tíz különböző fiók megerősítése automatikusan aktiválja a bejegyzést. A szerző nem erősítheti meg sajátját. A szavazatszámot a szerver az adatbázisból számítja. Az aktiválás közösségi megerősítés, nem helyszíni vagy akadálymentességi tanúsítvány; a navigációs gráfba nem kerül automatikusan ellenőrizetlen útvonal. Az új helyhez koordinátát és típust kell megadni. Tíz megerősítés után az adott állatkert környezetében lévő hely külön térképjelölőként jelenik meg; az app percenként frissíti a közösségi jelölőket. Koordináta nélküli régi helyjavításból nem készül kitalált jelölő.

Az e-mail és a fiókazonosító nem szerepel a nyilvános adatokban. A háttérszolgáltatás a szavazatok különbözőségéhez a platform által biztosított belső azonosítót tárolja. A fotók továbbra is a telefonon maradnak.

A Supabase adapter alternatívaként megmarad. Ha nincs külső konfiguráció, és Supabase sincs beállítva, a felület csak egyértelműen jelzett helyi piszkozatot ment. Ha a már beállított közösségi szolgáltatás elérhetetlen, hibát mutat; nem helyettesíti valótlan közösségi adatokkal.
