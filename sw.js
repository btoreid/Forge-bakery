/* ============================================================
   FORGE BAKERY — service worker
   Gjør appen installerbar på Android (Chrome krever en SW med
   fetch-handler) og lar den åpne uten nett.

   STRATEGI: nett først, cache som reserve — ikke omvendt.
   Appen er under aktiv utvikling og pushes flere ganger om dagen.
   Med cache-først ville en installert app kunne bli hengende på en
   gammel versjon i dagevis uten at noe tydet på det. Nett-først
   koster noen hundre millisekunder når du er på nett, og faller
   umiddelbart tilbake på cache når du ikke er det.

   Hev VERSJON ved endringer her — det er den som rydder bort gamle
   cacher i `activate`.
   ============================================================ */
const VERSJON = 'forgebakery-v1';

/* Appskallet. Alt appen trenger for å starte uten nett. Merk at
   Supabase-kall bevisst IKKE ligger her — de skal alltid gå på nett,
   og håndteres av at appen er lokal-først (localStorage er sannheten). */
const SKALL = [
  './',
  'index.html',
  'css/fonts.css',
  'css/style-v2.css',
  'js/vendor/supabase.js',
  'js/data.js',
  'js/engine.js',
  'js/sky.js',
  'js/app-v2.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'manifest.webmanifest'
];

self.addEventListener('install', e => {
  // addAll er alt-eller-ingenting: én manglende fil ville gjort hele
  // installasjonen mislykket. Fontene ligger derfor ikke i lista over —
  // de hentes inn av `fetch`-handleren ved første bruk i stedet.
  e.waitUntil(caches.open(VERSJON).then(c => c.addAll(SKALL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(navn => Promise.all(navn.filter(n => n !== VERSJON).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // POST/PATCH til Supabase: rør ikke
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // supabase.co og alt annet eksternt

  e.respondWith(
    fetch(req)
      .then(svar => {
        // Bare ekte, fullstendige svar er verdt å ta vare på. En 404 eller
        // et opaque svar i cachen ville servert feilen videre offline.
        if (svar && svar.ok && svar.type === 'basic') {
          const kopi = svar.clone();
          caches.open(VERSJON).then(c => c.put(req, kopi));
        }
        return svar;
      })
      .catch(() =>
        caches.match(req).then(truffet =>
          // Navigasjon uten treff faller tilbake på forsiden — appen er en
          // enkeltside, så det er alltid riktig svar.
          truffet || (req.mode === 'navigate' ? caches.match('./') : undefined)
        )
      )
  );
});
