/* ============================================================
   FORGE BAKERY — service worker
   Gjør appen installerbar på Android, lar den åpne uten nett, og
   sørger for at en vanlig refresh alltid gir siste versjon.

   ── HVORFOR DENNE ER MER ENN EN VANLIG CACHE ────────────────
   Det opplagte oppsettet — «hent fra nett, fall tilbake på cache»
   — ser riktig ut og virker likevel ikke. Målt i Chromium:

     ved refresh får service workeren KUN navigasjonsforespørselen.
     `<script src="js/data.js">` og CSS-en når den aldri.

   Chrome serverer subressurser rett fra sin egen HTTP-cache så
   lenge `max-age` ikke er utløpt, uten å spørre service workeren
   i det hele tatt. GitHub Pages sender `max-age=600`. Resultatet
   var gammel kode i ti minutter av gangen — og eneste utvei å
   tømme cachen for hånd. Ingen fetch-strategi fikser det, fordi
   `fetch` aldri blir kalt.

   ── LØSNINGEN: URL-ene må endre seg når innholdet endrer seg ──
   Service workeren fanger navigasjonen (den får den alltid), leser
   ETag-en til hver appfil, og skriver om HTML-en slik at hver
   script- og lenke-URL får `?v=<etag>`. Da:

     • innhold endret  → ny ETag → ny URL → HTTP-cachen bommer,
                          filen hentes på nytt. Automatisk.
     • innhold uendret → samme ETag → samme URL → HTTP-cachen
                          treffer, ingenting lastes ned.

   ETag-oppslagene er betingede forespørsler: uendrede filer svarer
   **304 Not Modified**, noen hundre byte hver. En uendret app
   koster dermed noen få kilobyte å verifisere, mot 385 KB hvis vi
   hentet alt ukondisjonelt.

   Versjonerte URL-er (`?v=`) er innholdsadresserte og hentes
   cache-først — de kan per definisjon ikke være foreldet.

   Hev VERSJON ved endringer her; det er den som rydder gamle
   cacher i `activate`.
   ============================================================ */
/* v4: ikonfilene fikk nye navn (`…-v2.png`).
   Å bytte innholdet i en fil med samme navn er ikke nok for et ikon: Android
   cacher appikonet ved INSTALLASJON, og både service workeren og manifestet
   pekte på den gamle URL-en. Nytt filnavn er den eneste veien som treffer alle
   tre. Versjonen heves for å rydde bort den gamle cachen med de gamle ikonene. */
/* v10: timer-varselet sender med timer-id-en, så et trykk på varselet skrur av
   alarmen for nettopp den timeren (ikke bare åpner steget). */
const VERSJON = 'forgebakery-v10';

/* Filene HTML-en laster, og som derfor skal versjonsstemples. */
const APPFILER = [
  'css/fonts.css', 'css/style-v2.css',
  'js/vendor/supabase.js', 'js/data.js', 'js/engine.js', 'js/sky.js', 'js/app-v2.js'
];

/* Appskallet — nok til at appen starter uten nett. */
const SKALL = ['./', 'index.html', 'icons/icon-192-v2.png', 'icons/icon-512-v2.png', 'manifest.webmanifest'].concat(APPFILER);

/* Same-origin-henting med revalidering.
   Bare URL + opsjoner: å bygge en Request fra den innkommende er en felle —
   `mode: 'navigate'` kan ikke konstrueres, og unntaket ville fått respondWith
   til å feile stille, slik at alt falt tilbake på HTTP-cachen. */
function ferskt(url) {
  return fetch(url, { cache: 'no-cache', credentials: 'same-origin' });
}
const absolutt = sti => new URL(sti, self.registration.scope).href;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSJON)
      // no-cache også her: ellers kunne en fersk worker fylt cachen fra
      // HTTP-cachen, altså med nøyaktig den gamle koden vi vil bli kvitt.
      .then(c => c.addAll(SKALL.map(u => new Request(u, { cache: 'no-cache' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(navn => Promise.all(navn.filter(n => n !== VERSJON).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* Henter en appfil ferskt, legger den i cachen under BÅDE ren og versjonert
   URL, og returnerer stempelet. Den versjonerte nøkkelen er den nettleseren
   spør etter like etter; den rene er reserven når vi er offline. */
async function stempleFor(sti) {
  const url = absolutt(sti);
  try {
    const svar = await ferskt(url);
    if (!svar.ok) return null;
    // ETag er stabil for uendret innhold. Last-Modified er reserven for
    // servere som ikke sender ETag.
    const merke = svar.headers.get('etag') || svar.headers.get('last-modified');
    if (!merke) return null;
    const v = merke.replace(/[^A-Za-z0-9]/g, '').slice(-16);
    const c = await caches.open(VERSJON);
    await Promise.all([c.put(url, svar.clone()), c.put(url + '?v=' + v, svar.clone())]);
    return v;
  } catch (e) {
    return null;                                  // offline: HTML-en beholder rene URL-er
  }
}

/* Navigasjon: hent index.html ferskt og stemple alle appfil-URL-ene i den. */
async function navigasjon(req) {
  let svar;
  try { svar = await ferskt(req.url); }
  catch (e) { return (await caches.match(absolutt('./'))) || (await caches.match(req)); }
  if (!svar.ok) return svar;

  let html = await svar.text();
  const stempler = await Promise.all(APPFILER.map(async f => [f, await stempleFor(f)]));
  for (const [f, v] of stempler) {
    // Bare eksakte src="…"/href="…"-treff, så vi ikke rører tekst i kommentarer.
    if (v) html = html.split('"' + f + '"').join('"' + f + '?v=' + v + '"');
  }
  const h = new Headers({ 'Content-Type': 'text/html; charset=utf-8' });
  const ut = new Response(html, { status: 200, headers: h });
  caches.open(VERSJON).then(c => c.put(absolutt('./'), ut.clone()));
  return ut;
}

/* ---------- Baketimere: trykk på varselet ----------
   Et timer-varsel (også de OS-planlagte via TimestampTrigger) håndteres her.
   Trykker man på det, hentes en åpen fane fram — eller appen åpnes — og
   prosess-skjermen får beskjed om hvilket steg det gjaldt, så man lander riktig
   sted. */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const data = e.notification.data || {};
  e.waitUntil((async () => {
    const alle = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of alle) {
      if ('focus' in c) {
        await c.focus();
        c.postMessage({ type: 'timer-klikk', stegId: data.stegId || null, timerId: data.timerId || null });
        return;
      }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(absolutt('./') + '?skjerm=prosess');
    }
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                        // POST/PATCH til Supabase: rør ikke
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;         // supabase.co og alt annet eksternt

  if (req.mode === 'navigate') { e.respondWith(navigasjon(req)); return; }

  // Versjonert URL: innholdsadressert, altså aldri foreldet. Cache først —
  // det er dette som gjør oppstarten rask når ingenting er endret.
  if (url.searchParams.has('v')) {
    e.respondWith(
      caches.match(req).then(truffet => truffet || ferskt(req.url).then(svar => {
        if (svar.ok && svar.type === 'basic') {
          const kopi = svar.clone();
          caches.open(VERSJON).then(c => c.put(req, kopi));
        }
        return svar;
      }))
    );
    return;
  }

  // Alt annet (fonter, ikoner, manifest): nett først, cache som reserve.
  e.respondWith(
    ferskt(req.url)
      .then(svar => {
        if (svar && svar.ok && svar.type === 'basic') {
          const kopi = svar.clone();
          caches.open(VERSJON).then(c => c.put(req, kopi));
        }
        return svar;
      })
      .catch(() => caches.match(req))
  );
});
