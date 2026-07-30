# Endringslogg — Forge Bakery

Nyeste øverst. Hver post sier **hva** som ble endret, **hvorfor**, og **hvor i koden** —
slik at arbeidet kan tas opp igjen kaldt, uten forhistorien i hodet.

Les `STATUS.md` først for gjeldende tilstand og åpne punkter.

---

## 30.07.2026 (natt, senere) — V2: innlogging og sky-lagring

Bjørn ville ikke miste data, og opprettet et Supabase-prosjekt (`xoripdwbghqlzbgxkfps`).
Appen forblir 100 % statisk på GitHub Pages — nettleseren snakker direkte med Supabase.

- **`js/sky.js`** er hele sky-laget, med et bevisst smalt API mot resten av appen:
  `Sky.klar/bruker/status/paaEndring/registrer/loggInn/loggUt/glemtPassord/hentNed/
  lagreOpp/skyvNaa`. Feilmeldinger oversettes til norsk (`norsk()`), inkludert et
  eget tilfelle for «tabellen finnes ikke» → «kjør SQL-en i SUPABASE.md».
- **Lokalt først.** localStorage er fortsatt sannheten mens appen brukes, så alt virker
  offline og helt uten konto. `lagre()` speiler opp til skyen KUN når noen er innlogget,
  og opplastingen er debouncet 1,2 s — en skyver som dras skal ikke bli hundre
  nettverkskall.
- **Konfliktløsning på tidsstempel.** `S.oppdatert` settes ved hver lagring; ved
  innlogging (`synkVedInnlogging()`) sammenlignes lokalt mot skyens `oppdatert`, og
  **nyeste vinner**. Uten dette ville en gammel kopi på PC-en overskrevet en fersk logg
  fra telefonen.
- **Konto-UI i Logg** (`tegnKonto()`): logg inn / ny konto / glemt passord, statusprikk
  med e-post og synkestatus, «Synk nå» og «Logg ut» (som tvinger en siste opplasting
  før den logger ut, så siste endring ikke tapes). Passordfeltet lever i en modul-lokal
  variabel, ikke i `S` — halvskrevne passord skal aldri havne i localStorage eller i en
  nedlastet sikkerhetskopi.
- **supabase-js er vendoret** til `js/vendor/supabase.js`, av samme grunn som fontene:
  ingen CDN-avhengighet, virker fra `file://`.
- **`SUPABASE.md`** har SQL-en som må kjøres én gang (tabell + Row Level Security med
  fire regler på `auth.uid() = bruker_id`), URL-oppsettet for «glemt passord», og
  hvordan lagene henger sammen.
- **`.github/workflows/supabase-ping.yml`** kaller REST-API-et daglig, så gratis-tierens
  pause etter sju døgn uten aktivitet aldri inntreffer. Godtar 200/401/403 som «lever».

Sikkerhetskopi-knappene fra forrige runde beholdes med vilje: belte og bukser.

Verifisert i Chromium med alle Supabase-kall blokkert (19 sjekker): UI-et tegner,
innloggingsforsøk uten nett gir en norsk feilmelding i stedet for å krasje, og appen
fungerer ellers uendret — inkludert lokal lagring uten konto.

---

## 30.07.2026 (natt, sist) — Installerbar app på Android (PWA)

Bjørn ba om å kunne installere appen fra Chrome på Android. Chrome krever tre ting:
manifest, service worker med `fetch`-handler, og HTTPS (som GitHub Pages allerede gir).

- **`manifest.webmanifest`** — `display: standalone` (ingen adressefelt), portrett,
  bakgrunns- og temafarge fra designsystemet (`#f5ead8`), og **relative** `start_url`/`scope`
  (`./`). Absolutte stier ville brutt både lokal testing og undermappa `/Forge-bakery/`.
  Feltet `id` ble fjernet igjen av samme grunn — utledes fra `start_url` og er da riktig
  begge steder.
- **`icons/`** — 192, 512, maskable 512 og apple-touch 180, tegnet i Chromium fra appens
  eget brødikon (krem på terrakotta). Maskable-varianten har motivet krympet til 56 % så
  det overlever Androids ikonmaske, som kan klippe de ytterste 10 % på hver kant.
- **`sw.js`** — **nett først, cache som reserve.** Med cache-først kunne en installert app
  blitt hengende på gammel kode i dagevis uten at noe tydet på det, og appen pushes flere
  ganger daglig. Nett-først koster noen hundre millisekunder på nett og faller umiddelbart
  tilbake på cache uten. Kun same-origin GET røres — Supabase-kall går alltid rett på nettet,
  og POST/PATCH aldri gjennom cachen. Bare `ok`+`basic`-svar lagres, ellers ville en 404
  blitt servert videre offline. Navigasjon uten treff faller tilbake på `./`.
- **Snarveier** i manifestet (langtrykk på appikonet) åpner Prosess og Logg direkte. De
  virker fordi appen nå leser `?skjerm=` ved oppstart — uten den biten ville de bare åpnet
  forsiden.

Verifisert i Chromium: manifest og alle ikonfilene (riktig piksestørrelse og MIME-type),
service worker aktiv og styrende, 13 filer i cachen, **full app offline** med fonter, layout
og fungerende motor, og begge snarveiene.

---

## 30.07.2026 (natt, senere) — Loggen, og Pyrexen som står i ovnen

### Bakeloggen: bilder i stort format, rediger og slett

- **Trykk på et bilde åpner det i fullskjerm** (`tegnBildeVis()`, `.bildevis`) over hele
  telefonrammen — z-index 60, altså over bunnmenyen. Piler og piltaster blar når posten har
  flere bilder, Esc eller ✕ lukker, og trykk på selve bildet lukker *ikke* (bare utenfor) —
  ellers ville hvert forsøk på å se nærmere lukket visningen.
- **Hver post kan redigeres:** navn, karakter, et nytt **notatfelt** («hva lærte du?») og
  bilder (legg til / fjern, fortsatt maks 3). `loggRediger()`; endringene lagres mens du
  skriver. **Måletallene er bevisst ikke redigerbare** — dose, hydrering, grovhet og løft er
  hentet fra baket slik det faktisk var, og en logg man kan pynte på slutter å være et
  ærlig referansepunkt.
- **Slett med bekreftelse** som sier hvor mange bilder som ryker med (`loggSlettBekreft()`).
- **Postene har fått stabil `id`.** Uten den pekte rediger/slett på *posisjon* — og
  posisjonen flytter seg når noe slettes, når skyen synker inn en annen liste, og lista
  vises dessuten nyeste-først. Eldre poster får en id i `last()`. Iterasjonen går nå bakover
  med den ekte indeksen i stedet for `slice().reverse()`, som ga feil rad.

### «Pyrexen står i ovnen» — 260 °C i stedet for 230

Bjørn påpekte at Pyrexen kan bli stående i ovnen mellom bakerundene, og at man da bør kunne
kjøre stål-temperaturer. Det stemmer, men bare for det ene av de to Pyrex-oppsettene, og
det er verdt å skille:

230-taket kommer av glassets **termiske sprang på 220 °C** — men det dekker to ulike sjokk:

1. **Romtemperert glass inn i varm ovn** (260 − 20 = 240 > 220). Dette er det Bjørns
   arbeidsmåte fjerner: står glasset i ovnen fra kald start, varmes det opp sammen med den.
2. **Kald deig mot varm glassflate** (~254 °C ved 260). Dette gjelder bare `brod_glass_stal`,
   der deigen ligger *inni* glassbunnen.

I **kloke-oppsettet** (`brod_kloke`) ligger deigen på stålet og rører aldri glasset, så bare
sjokk 1 er i spill — og det er nettopp det som forsvinner. Derfor har den profilen fått et
`varm`-alternativ på **260 → 230 °C** (støpejernsgrytas tall; den er appens egen referanse
for lukket kammer). `brod_glass_stal` har med vilje *ingen* `varm`.

Slått på med avkrysningen **«Pyrexen står i ovnen»** under Stekeutstyr (`S.pyrexIOvn`), som
bare vises når den valgte profilen faktisk har et varmt alternativ. Byttet skjer i
**`regn()`**, ikke i render, så kjeden, Prosess-stegene og oppslaget alle leser samme
temperatur. Med valget på står det en advarsel om de to tingene glasset fortsatt ikke tåler:
å settes tilbake i en varm ovn etter å ha blitt kaldt, og rask nedkjøling (vann, våt benk).

### «Rundbrød» ute av utstyrsteksten

`UTSTYR.stal15.om` åpnet med «Det beste oppsettet du har for rundbrød». Bjørn har aldri
sagt at han baker rundbrød — samme feil som ★-merkene i stekeprofilene, som ble rettet
tidligere samme dag. Stekeutstyr handler om bunnvarme og damp, ikke om emnets form.
(«Rundbrød» står fortsatt i fagstoffet, der det brukes faglig som sammenligningsgrunnlag —
bunnflate mot volum, avkjølingstid — og det er riktig bruk.)

---

## 30.07.2026 (natt) — V2: seks punkter fra tredje brukertest

Verifisert i Chromium (23 automatiske sjekker + skjermbilder).

- **Brødtype-bytte er nå et nytt bak, med bekreftelse.** Før tok byttet med seg alle
  deigvalgene — en ciabatta arvet solsikkefrøene og vannet fra brødet. Nå spør et
  varselkort «Bytte til X — starte på nytt?» (`S.byttBekreft`), og bekreftelsen
  (`nyBakst()`) nullstiller oppskriftsvalgene (tillegg, vann, salt, grovhet, heveplan,
  stekeprofil, form) til bakstens standard. Utstyr, maskin, logg, favoritter og
  romtemp beholdes — de er brukerens, ikke bakstens.
- **Bilder i loggen er tilbake** (designfasen hadde dem — `appgjennomgang.md` sier
  «✔ + bilder (nytt)»). Inntil 3 bilder per bak: `tegnBildeVelger()`/`leggTilBilde()`
  skalerer ned til maks 480 px JPEG (kvalitet 0,7) i canvas før lagring, så
  localStorage (~5 MB) rommer mange bak; kvotevern nekter nye bilder over ~4,2 MB
  total. Miniatyrer i skjemaet og på loggpostene.
- **Sikkerhetskopi i Logg** (`tegnBackup()`): «Last ned kopi» (hele tilstanden som
  JSON-fil) og «Hent inn kopi» (validert import som gjenbruker normaliseringen i
  `last()`). Dette er svaret på «lagring og innlogging» som er mulig uten server —
  ekte konto/sky-lagring krever en backend og står som åpent punkt i STATUS.
- **Stekeprofilene beskriver nå metoden, ikke brødformen.** ★-merkene og
  «Rundbrød»/«Ciabatta»-navnene er ute — formen har ingenting med stekeprosessen å
  gjøre. Nye navn («Støpejernsgryte med lokk», «Glassgryte PÅ 15 mm stål», «Midt i
  ovnen på stål, kort og varmt» …) + nytt felt `anbefaltTil` per profil, vist som
  «anbefalt til»-merke i Oppslag → Stekeprofiler. Koblingen bakst→profil lever videre
  som anbefaling i `PRESETS.steking`/`profilForUtstyr` — uendret logikk, bare riktig
  merket som anbefaling.
- **«Om dette baket — prosessen kort»** på Brød-skjermen: kollapskort med hva baksten
  ER (nytt `om`-felt i `BTYPER`) og hele stegkjeden med varigheter og total tid,
  GENERERT fra `kjede()` — samme kilde som Tid og Prosess, så den kan ikke drifte.

---

## 30.07.2026 (kveld) — V2: ti punkter fra andre brukertest

Bjørns andre testrunde ga ti punkter i én melding. Alle er levert, verifisert i ekte
Chromium (31 automatiske sjekker på 390 px + skjermbilder av hver endring) og pushet.

### Tid
- **Velg dato og klokkeslett for ferdig.** ±-knappene (à 60 min) var eneste vei til et
  annet døgn. Ny `<input type="datetime-local">` (`.dato-inp`) under tidstepperen i
  Ferdig-modus, hjelper `tilDatoLokal()` i `app-v2.js`.
- **Litt luft mellom plankortene** — ny klasse `plan-valg` (8 px margin-bottom).
- **«Start nå» ankrer nå kjeden til nå:** ferdig settes til nå + total tid ved trykk.
  Før byttet knappen bare visning og viste starttiden som fulgte av et gammelt
  ferdigtidspunkt — «Start nå» startet ingenting.
- **Nå-markøren i gjæringsgrafen vises kun når prosessen er startet** («Start nå»-modus,
  og nå er inne i gjæringsvinduet). Bjørns poeng: en nå-strek i en ikke-startet,
  hypotetisk plan peker på ingenting. `gjaeringsGraf(..., visNaa)`; legenden følger med.
- **Heveplan: romtemperatur og kjøleskap.** Ny stepper «Romtemp der deigen hever»
  (`S.romTemp`) og hurtigknapper per trinn: «Kjøleskap 4°» / «Rommet ditt X°» som setter
  trinnets miljø. Gjærdosen løses om automatisk, som før, når miljøet endres.

### Deig
- **«Hva vil du gjøre med endringen?»** (`tegnKompensasjon()`): når tillegg er på, viser
  et panel at melet faller i en fast deigvekt (fra X til Y, −Z g) og at vannet alt er
  justert — og tilbyr alternativet «Øk deigen: N g/brød», som skalerer brødvekten så
  melmengden blir som uten tillegg. Da kan Bjørn ta stilling til hva endringen gjør.
- **Soner mot anbefalingen:** tilleggsrader skifter fra grønn til gul («over anbefalt»)
  og rød («nær maks»), relativt til spennet anbefalt→maks per tillegg (solsikke: gul fra
  ~7,7 %, rød fra ~14,4 %). Salt fikk sonemerke (I SONEN / UTENFOR / LANGT UTENFOR) på
  samme måte som vann. Statuslinja i raden sier hvorfor den er gul/rød.
- **«Hva valgene koster» viser nå ± mot normalen** (samme brød uten tillegget):
  divergerende søyler med 0-strek i midten, grønt = gevinst, rødt = kostnad, terrakotta
  = nøytralt (bruning). Baseline er første punkt på hver målekurve.
  `doseResponsRader()` / `deltaRad()` / `fmtDelta()`.
- **Totalen ligger i deigregnskapet:** arket har fått seksjonen «Valgene dine mot
  normalen», bygget av samme `doseResponsRader()` som panelet — de to kan ikke drifte.

### Diverse
- **Deigregnskapet lukker nå ved trykk på selve arket**, ikke bare på bakteppet over.
- **Eltemaskin:** «Spiral hjemme» heter nå «Ooni Halo Pro (spiral hjemme)» — maskinen
  Bjørn faktisk har. Alle maskinene i `MASKIN_INFO` fikk et `fart`-felt med hastighetsråd
  (lav fart til samling, middels til utvikling; planetmaskin: produsentene fraråder over
  trinn 2 for gjærdeig), vist som egen «Hastighet:»-linje i maskinpanelet.
- **Favoritter uten dobbeltmerking:** ★-prefikset i Deig er fjernet — flere melnavn har
  allerede ★ i seg som kvalitetsmerke, så favoritter leste som «★ … ★». Favoritt vises nå
  som «FAVORITT»-merkelapp i Deig (`.fav-pille`) og som ramme rundt hele kortet i
  Oppslag (`.kort.fav`). ☆/★-knappen er fortsatt selve bryteren.
- **Kritisk følgefunn rettet — re-entrant render:** når `replaceChildren` fjernet et
  fokusert inputfelt, fyrte nettleseren en ekte blur MIDT i renderen; feltets onblur
  startet en ny render oppå den halvferdige → `NotFoundError` → feilgrensa nullstilte
  hele appen, inkludert loggen. Nytt `_rendrer`-vern i `render()` gjør det nestede
  kallet til en no-op (tilstanden er allerede lagret).

---

## 30.07.2026 — V2: appen bygget om til en mobil-app

Stor omlegging over én økt, etter Bjørns oppdrag: bygg Forge Bakery om til en **mobil-app**
ut fra designhandoffen i `design_handoff_bakeprosess/`. **V1 skulle ikke røres** — den lever
videre som `index.html` + `js/app.js`. V2 er en ny, parallell app: `index-v2.html` laster
`js/data.js` → `js/engine.js` → `js/app-v2.js` (globale script-tagger, ingen rammeverk).

Underveis presiserte Bjørn to ting som styrer resten: **«designfilene var et designprinsipp,
ikke fasit på endelig app»** (alt V1 kunne, skal V2 også kunne) og **«du skal si fra når du
mener du er FERDIG»** (ikke meld ferdig for tidlig).

### A · Modellkjernen først — L-01 til L-14

Før én skjerm ble tegnet gikk vi gjennom `logikk-tilbakemeldinger.md` (L-01–L-14, kjente
modellfeil) og ble enige om regnemodellen. Kjernen er to **rene** funksjoner i `engine.js`
— all utregning der, ingen i render (`app-v2.js` bare tegner det `regn()`/`kjede()` gir):

- **`regn(state)`** — dosen, hydreringen, løftindeksen, varmebalansen. Ett kall, alt utledet.
- **`kjede(state, r)`** — stegkjeden (bulk → forming → utbakt → steking) som ren funksjon.

**L-14 var viktigst: forferment skal ikke flytte løftindeksen.** En poolish/biga/surdeig
omfordeler *når* gjæringen skjer, ikke *hvor mye* emnet reiser seg i ovnen. Løftet regnes
derfor multiplikativt av det som faktisk styrer volum —
`loft = ovnslosBasis(plan) × grovFaktor × froFaktor × hydFaktor × ffFaktor`, klemt til 20–100
(`loftIndeks()` med `grovLoftFaktor`/`froLoftFaktor`/`hydLoftFaktor`/`ffLoftFaktor`).
`ffFaktor` er nær 1 med vilje: forfermenten nudger, styrer ikke.

Andre avklaringer fra samme runde: **pâte fermentée fjernet** (Bjørn brukte den ikke),
**surdeig lagt til** som forferment-type, og **grovheten følger Brødskala'n** (samme norske
standard som V1 fikk 29.07 — frø utenfor, korn/kli teller fullt).

`kjede()` løser samtidig L-07/L-09/L-10/L-12/L-13 (bløtlegging rist/bloet/skald, kald snitting,
forming før første utbakt-trinn — se baker-review under).

### B · Seks skjermer

Skjermrekkefølgen er Bjørns: **Brød · Deig · Tid · Prosess · Logg · Oppslag**
(`bunnmeny` i `app-v2.js`). Han beskrev overgangen selv: «brød, deig, tid, prosess, logg,
oppslag som blir riktig rekkefølge». Render er `render()` → `renderInner()` med
try/catch-feilgrense, så en enkelt tegnefeil ikke svartlegger hele appen. Tilstanden ligger i
`localStorage` under `forgebakery.v2`, normalisert i `last()`/`nyStandard()`.

### C · Designet gjenskapt, så V1-paritet lagt oppå

Første tilbakemelding var **«dette ser mindre pent ut enn hva Claude Design laget»**. Årsaken
var at Google Fonts var blokkert; fontene er nå **vendoret lokalt** (Caprasimo/Figtree woff2 i
`css/fonts/`, `css/fonts.css`) så appen ser lik ut offline og fra `file://`. Grovhet ble
piller i stedet for slider, med sirkelbadges, steg-teller og glutenbidrag per mel.

Deretter, på **«jeg vil ha inn alt det gamle også»**, ble hele V1-funksjonaliteten hentet inn
(commitene `V1-paritet A/B/C`): form/kurv og stekeutstyr med vektoppløsning, dose–respons-panelet,
korntegningene, meltall-info og mel-advarsel, redigerbar heveplan, rate-tabell, is-utregning,
handleliste og deigtemp-kalibratoren.

### D · Vekt-fikspunktet (teknisk-review, kritisk)

Melvekten løses av en affin fikspunktligning (mel binder vann som binder mel …). Naiv
Picard-iterasjon **divergerte** på tunge frølaster → `melTotal = 0` → NaN i hele arket. Rettet
med lukket form: `m* = a / (1 + b)`. Ingen iterasjon, ingen divergens.

### E · Dobbeltforming (baker-review, kritisk)

Kjeden bakte ut og hvilte 45 min **etter** den kalde utbakt-hevingen, uten forming før. Rettet:
formingssteg før første utbakt-trinn, «Temperer og snitt» (kald snitting) etter. Nå former du
før heving, ikke etter.

### F · Hosting

Publisert på **GitHub Pages** (gratis, offentlig repo er greit ifølge Bjørn) med
`noindex, nofollow` i `index-v2.html`, `robots.txt` og `.nojekyll`. Auto-deploy ved push til
`claude/forge-bakery-mobile-v2-l4ean3`. Hemmelighetsskann kjørt — rent.

### G · App-layout og siste UX-runde (fra rask brukertesting)

- **Fast bunnlinje, ikke scrollende side.** `#telefon` er `height:100dvh; overflow:hidden`;
  deigregnskapet spretter opp som et `.regnskap-ark` (absolutt, over bunnlinjen) med en
  `#bakteppe`-bakgrunn som lukker ved trykk.
- **Hydrerings- og saltskyverne** oppdaterer tall/merkelapp/guide **live under draget**
  (`oninput`, kun DOM) og regner ferdig **på slipp** (`onchange`). Ny `vannGuide()` forklarer
  hva lavt/høyt vann gjør. (Rettet en regresjon der `onchange`-alene gjorde at slideren ikke
  fulgte fingeren.)
- **Tillegg (frø/korn/smak)** kan igjen aktiveres med ett trykk, markeres grønt når på, og
  fjernes lett via toggle (`togglTillegg()`, `.tillegg-rad.paa`).
- **Stekeutstyr:** deig rett på stålet er nå det anbefalte valget (★), Pyrexen er avlang og
  uten unødig advarsel.

### H · Tre punkter til fra brukertesten (samme dag, etter G)

- **Tid viser nå ukedag + dato for både start og ferdig.** «17:00» alene sa ikke hvilken dag,
  og baken går over døgnskiller. Ny start→ferdig-oppsummering i `tegnTid` viser alltid begge
  ender fullt ut («Fredag 31. juli, kl. 07:05»), første steg, total tid, og en egen linje når
  baken krysser midnatt. Hjelpere `klDato()`, `ukedagKort()`, `dagSpenn()`.
- **Gjæringsgrafen bygget om fra en naken tre-linjers skisse** til V1s fyldige graf, mobil-
  tilpasset: fasebånd med navn/tid/temp (kald heving grønn, varm terrakotta), temperaturakse
  venstre, gjæringsakse høyre, gjæringsfart som areal (arealet ER dosen), akkumulert dose som
  hovedkurve, deigtemp stiplet, halvveismerke med klokkeslett, ekte klokkeslett på x-aksen,
  aksetitler og en «nå»-markør. `gjaeringsGraf()` tar nå `bulkStart` for ekte klokke.
- **Eltemaskinene forklares nå.** Ny `MASKIN_INFO` i `data.js` (friksjonstall, hva maskinen er,
  typisk eltetid). `maskinInfoPanel()` viser den valgte maskinens forklaring, den levende
  utregningen (friksjon × min → +°C → ÷ 1,29 → Wh/kg med målsone-flagg) og en sammenligning av
  alle maskinene ved gjeldende eltetid. Bruker `r.friksjon`/`r.wh` — samme tall som
  varmebalansen, så forklaring og resultat ikke kan drifte fra hverandre.

### Arkitekturregler for V2 (ikke bryt)

    All utregning i regn()/kjede() i engine.js. app-v2.js tegner, regner aldri.
    Globale script-tagger, ingen import/bundler — virker fra file://.
    State i localStorage 'forgebakery.v2', normaliseres i last()/nyStandard().
    V1 (index.html / js/app.js) er frosset — rør den ikke.

---

## 29.07.2026 — Sammenhengen: startside, kontekstpanel, navigasjon

Tre sammenhengende leveranser samme dag, etter tre tilbakemeldinger fra Bjørn:
«hvor velger jeg hva som skal bakes?», «prosessen må oppleves helhetlig — jeg vil se
hevekurven sammen med valgene», og «bruk heller nedtrekksmenyer enn masse faner».

To UX-agenter ble kjørt på hans eksplisitte forespørsel: én på informasjonsarkitektur,
én som gikk gjennom kjørende app og lette etter brutt sammenheng. Funnene fra begge
ligger til grunn for det under.

### A · Startside og brødtyper

**Problem:** appen hadde to parallelle innganger som ikke kjente hverandre. «Bygg brød»
(startfanen) antok stilltiende et frittstående rundbrød og bygget det alltid av
grovhetstrappa. Ciabatta, baguetter og focaccia lå gjemt i en nedtrekksliste inne på
«Oppskrift». Ingen av dem sa hvilken vei brukeren skulle gå.

**Løsning:** `BROTYPER` i `data.js` er ny inngangsport. Feltet **`rute`** er kjernen:

| rute | brødtyper | vei gjennom appen |
|---|---|---|
| `bygg` | Loff, Halvgrovt brød | Start → **Bygg brød** → Bak nå |
| `preset` | Ciabatta, Baguetter, Focaccia | Start → **Oppskrift** → Bak nå |

For `preset`-rutene tones «Bygg brød» ned i navigasjonen og får et varselkort øverst —
grovhetsdialen der ville bygget et helt annet brød.

**`FORMER`** (avlang kurv / rund kurv / brødform) styrer stekeutstyret, ikke bare utseendet.
`profilForUtstyr(utstyr, form)` overstyrer `UTSTYR_PROFIL`: **avlang + stål gir `brod_apen`,
ikke `brod_kloke`** — en kloke må faktisk dekke emnet. Emnets største mål regnes som
`kFaktor × vekt^⅓` (boule 1,93 · bâtard 3,0), altså ca. 28 cm for et avlangt 800 g emne.

**Prosessoversikten på startsiden GENERERES fra `bakeSteg()`.** Skrives den av som tekst,
drifter den fra det «Bak nå» faktisk sier — nøyaktig feilen som en gang gjorde at fanene
viste ulik starttid og ulik stekeprofil for samme brød.

`brukByggOppskrift()` ble trukket ut av klikkhandleren på `#byggBruk`, fordi startsiden må
gjøre nøyaktig det samme. To kopier ville garantert utakt.

### B · Kontekstpanelet «Deigen din»

**Problem, målt:** i «Gjæring & tid» (4 999 px desktop, 7 810 px mobil) ligger
gjærmengdefeltet på 150 px og hevekurven på 3 767 px. **Aldri på skjermen samtidig, på
noen skjermstørrelse.** Bjørns ønske om å se kurven sammen med valgene var altså ikke et
ønske om en ny funksjon, men en presis diagnose.

**Løsning:** `#kontekst` — 340 px fast sidespalte, `position:sticky`, med tekstløs
mini-hevekurve, fire nøkkeltall og statuslinje. Under 1000 px blir den en bunnskuff via
`<details>` — ingen JS-tilstand, virker fra `file://`. Skjult på «Bak nå», der `.naakort`
*er* konteksten (`body[data-v]` settes i `vis()`).

`tegnTempChart(g, plan, o)` tar nå `{svg, W, H, mini, pad}`. `mini` fjerner ALL tekst — ved
340 px ville fasenavn og klokkeslett overlappe til uleselighet. **Samme data, to størrelser,
null ny matematikk.**

**Panelet har ingen kontroller, med vilje.** Det speiler; hovedspalten endrer. En slider der
ville gitt to steder å endre samme tall og to mentale modeller for hvor sannheten bor.

### C · Navigasjon, kollapskort, rutefot

**11 faner → 4 grupper** (`GRUPPER` i `app.js`): ① Brødet · ② Prosessen · ③ Bak nå · Oppslag.
`<section>`-ene er URØRT — dette er bare navigasjon, derfor lav risiko.
`#undernav` viser kun aktiv gruppes faner; `#undernavSel` er en native `<select>` som
overtar under 640 px. Har gruppen én fane (③ Bak nå), skjules raden helt.
`gruppeSist` husker hvilken fane du var i per gruppe.

**`tegnRutefot(v)`** legger «Steg 2 av 3 · ◂ Start · Bak nå ▸» nederst i hver hovedveisfane.
Fordypningsfanene får «Finjustering — hovedveien går utenom». Løser at «Oppskrift» — steg 2
av 3 for ciabatta/baguett/focaccia — ikke hadde noen vei videre i det hele tatt.

**Seks tunge fagstoffkort er `<details class="card kollaps">`**, lukket som standard.
Fordi elementene er statiske i `index.html`, overlever `open` alle `oppdater()`-runder —
`app.js` skriver bare til IDene inni. «Gjæring & tid» falt **4 999 → 2 834 px**.

**Mobil:** header 187 → 144 px og `static`. Undertittelen i logoen skjules under 640 px.

### D · Tolv brudd på sammenhengen, funnet og rettet

Alle verifisert med tall fra kjørende app.

1. **«Bygg brød» var en frakoblet forhåndsvisning.** Dialene skrev aldri til oppskriften;
   bare «Bruk denne» committet, og den knappen leses som navigasjon. Grovhet «Kraftig» +
   tid «Ekspress» ga 0,833 % gjær i fanen mens resten av appen regnet med 0,179 % —
   **faktor 4,7** — og kurven tegnet en kaldheving brukeren nettopp hadde valgt bort.
   → `byggEndret()` kaller `brukByggOppskrift()` på hver justering.
2. **`S.maalDose` ble aldri nullstilt ved brødbytte.** Appen sa samtidig «avvik +0 %» og
   «kaldhevingen må mer enn dobles». → Nullstilles i `brukPreset()` og `velgBrotype()`.
3. **Stekeprofilen sa tre ting.** `tegnBygg()` hadde en hardkodet kopi av utstyr→profil som
   ikke kjente formen: sjekklista sa 260 °C og «damp under glasset» mens Tidsplan, Steking
   og Bak nå sa 270 °C og kokende vann i støpejern. → `aktivProfil()` er eneste oppslag.
   `S.stekeProfilManuell` bevarer brukerens egen overstyring, som `velgForm()` før kastet.
4. **`bakHuket` brukte posisjons-id** (`'S'+n`). Skrudde man av forfermenten, arvet «Elt
   deigen» haken fra «Sett bigaen», og appen påsto at 14 t kaldheving var unnagjort.
   → Semantiske id-er: `ff · bloet · mix · plan0… · oven · shape · bake · cool`.
5. **`glass_stal` manglet i `lukket`** i `byggOppskrift()` → man mistet 3 prosentpoeng
   hydrering ved å velge det oppsettet appen selv kaller sitt beste.
6. **Fersk `localStorage` ga to ulike brød i appen** før man rørte noe (4 × 900 g / 35 %
   grovt mot 2 × 900 g / 10 %), fordi `velgBrotype()` aldri ble kjørt. → `init()` kaller den.
7. **`antall`/`vektPerBrod` synket bare bygg → hoved.** 6 × 400 g i Oppskrift lot Bygg brød
   stå igjen med 2 × 800 g. → Begge veier nå.
8. **`#masseKg` lå én tegning bak** (viste 1,60 kg mens oppskriften var 6,40). Massen styrer
   nedkjølingstiden. → `beregn()` kjøres først i `oppdater()`.
9. **«Total tid» spriket 1,3 t** mellom Bygg brød og Bak nå. → Leses fra `bakeSteg()`.
10. **`resetPlan`/`setRefDose` hentet fra et forvalg brukeren aldri hadde valgt** (dosen falt
    1,82 → 1,65). → Ruteavhengige.
11. **Måldosen ble satt til det planen OPPNÅDDE, ikke det den siktet mot** — så avviket var
    alltid «+0 %», og det skjulte at ekspressplanen ligger 13 % under målet fordi gjæren står
    på taket. → `S.maalDose = B.maalDose` (målet), `S.refDose = B.g.dose` (oppnådd).
12. **Mobil var snudd på hodet:** headeren `sticky` og 187 px (23 % av skjermen), mens
    `.naakort` var `static`. Navigasjonen spikret fast, «hva gjør jeg nå» rullende bort —
    på kjøkkenet. → Snudd. Pluss scrollminne per fane i `vis()`.

**Bonusfunn under mobiltesting:** `#planTabell` er 635 px og hadde ingen scrollcontainer, så
HELE dokumentet fikk vannrett scroll (660 px mot 375). → `.card table{display:block;
overflow-x:auto}` under 1000 px.

### Verifisert
196 kombinasjoner desktop med kortene åpne · 110 visninger på 375 px med kortene både åpne
og lukket · ingen vannrett scroll · bygg = hoveddeig overalt · dosene treffer måltallet
(loff 1,89 mot formelens 1,886, halvgrovt 1,82 mot 1,820).

---

## 29.07.2026 (tidligere samme dag) — Parameterrevisjon

Alle tall i appen sortert i *faglig begrunnet* / *ukildet* / *hardkodet*, med 12 bekreftede
feil. Se **`PARAMETERREVISJON.md`**. Verste funn, **ikke rettet ennå**: `styrke:'middels-sterk'`
finnes på Regal standard + 2 andre mel, men mangler i tre av fire oppslagstabeller
(`engine.js:400`, `engine.js:248`, `app.js:1243`) — faller til `?? 3` og rangerer Regal som
SVAKERE enn Møllerens siktet (`middels` = 4).

## 29.07.2026 — Melbibliotek, ordliste, korntegninger, konsekvenslag

- Egen fane «Mel & korn»: 30 meltyper med fordeler/ulemper, ⓘ på hvert tall, favorittmerking.
  `MEL_INFO` holdt adskilt fra `FLOURS` så regnemodell og oppslagsverk kan utvikle seg hver
  for seg. `glutenbidrag` er bevisst skilt fra protein.
- `ORDLISTE`: 43 fagord i 8 temagrupper med klikkbare kryssreferanser.
- `KORN_SVG`: inline SVG for 8 kornslag og 11 frø/gryn i samme 40×60-rutenett, så
  størrelsesforskjellene er ekte.
- `PARAM_INFO` + `festInfo()`: konsekvenslag («hva skjer om jeg skrur denne opp/ned»).
- `ELTING` i engine.js: elting som ARBEID (Wh/kg), ikke minutter. 1 Wh/kg ≈ 1,29 °C.
- Rettet speltens eltetoleranse: 9,5 min farinografstabilitet, ikke «maks 4 min».
- Gram ↔ prosent begge veier. Bløtlegging gjort betinget av hvor mye vann frøene stjeler.
- Forvalgene kalibrert: `gjaerPct` løst numerisk mot `maalDoseFor` for hvert forvalg.

## 28.07.2026 — «Bak nå» og de første feilrettelsene

- Ny guidet modus: én nummerert liste fra forferment til avkjøling, alt fra `bakeSteg()`.
- Vannregnskapet med frø: oppskriften ba om samme vann to ganger.
- Fokustap ved hvert tastetrykk løst med stabile `data-k`-nøkler.
- «Utbakt»-avkryssingen ble lest med `+inp.value` («on» → NaN → 0).
- Stekeprofilen fulgte forvalget, ikke oppskriften.
- Forferment-gjæren hoppet ved 16 t (et `×0,5`-ledd).
- Pyrex-profilen sa 250 °C mens resten av appen sa maks 230 (termisk sjokk).
- Eltetiden var hardkodet feil to ganger; `anbefaltEltMin()` utleder den nå fra maskinen.
- `+/−`-knappene «virket ikke» — grid-kolonnen var 78 px, feltet fikk 2 px.

---

# Arkitekturregler — brytes disse, kommer fanene i utakt igjen

1. **`bakeSteg()` er ÉN kilde til sannhet for hele bakekjeden.** Tidsplan, «Bak nå»,
   klokkeslettene i gjæringsgrafen, prosessoversikten på startsiden og «Total tid» leser
   alle fra den. Lag aldri en parallell utregning et annet sted.
2. **`aktivProfil()` er eneste oppslag for stekeprofil.** Ikke skriv en `if utstyr === …`
   til; det var nettopp det som ga tre forskjellige svar.
3. **Kontekstpanelet speiler, det endrer ikke.** Ingen kontroller der.
4. **Alt som skrives til `S` fra «Bygg brød» går gjennom `brukByggOppskrift()`.**
5. **Nye felter hører i `PARAM_INFO`/`TILLEGG`**, ikke som løs tekst i grensesnittet.
6. **Invarianter som skal holde:**
   `vannTotal = vannHoved + forferment.vann + froAbsorbert`
   `totalVekt = antall × vektPerBrod`

# Testing — les dette før du tester noe

Forhåndsvisningsruta hurtigbufrer **både JS og CSS** svært aggressivt og serverer gamle
versjoner selv ved cache-busting. `location.reload()` virker sjelden. Symptomet på stale CSS
er at `getComputedStyle` viser gamle regler (`grid-template-columns: none`) mens DOM-en er fersk.

```js
// 1) fersk CSS
const css = await fetch('css/style.css?x=' + Math.random()).then(r => r.text());
document.querySelectorAll('link[rel=stylesheet],style[data-fersk]').forEach(e => e.remove());
const st = document.createElement('style'); st.dataset.fersk = '1';
st.textContent = css; document.head.appendChild(st);

// 2) fersk JS i eget scope
const files = ['js/data.js','js/engine.js','js/app.js'];
const src = (await Promise.all(files.map(f =>
  fetch(f + '?x=' + Math.random()).then(r => r.text())))).join('\n');
new Function(src);                       // syntakssjekk
document.querySelectorAll('input,select,textarea,button')
  .forEach(e => e.replaceWith(e.cloneNode(true)));   // klon bort gamle handlere
localStorage.removeItem('brodlab.v1');
window.M = new Function(
  src.replace("document.addEventListener('DOMContentLoaded', init);","")
  + '\nreturn {S, init, vis, oppdater, bakeSteg, beregn, byggOppskrift, byggEndret,'
  + ' velgBrotype, velgForm, BROTYPER, FORMER, GROVHET, TIDSPLANER, GRUPPER};')();
M.init();
```

Unngå nøstede template-strenger med `\n` inne i `javascript_tool` — escapingen ryker.
Eksporter funksjonene og skriv testene i et etterfølgende, vanlig kall.

**Sjekk alltid, i tillegg til at det ikke kaster:**
- `document.body.scrollWidth` mot `clientWidth` per visning — vannrett dokumentscroll er
  usynlig i kode og verst på mobil, for da vandrer overskriftene ut av syne.
- Rendret pikselbredde med `getBoundingClientRect()` når noe legges i en smal grid-kolonne.
- **Ta skjermbilde.** «Rendrer uten feil» er ikke det samme som «ser riktig ut» — særlig
  for SVG tegnet i blinde.

# Arbeidsmåte Bjørn har bedt om

- Notatene hans er **ikke fasit**. Forankre i publisert teori og dokumenterte tester, og
  korriger notatene der de er feil.
- **Ikke hardkod vanene hans som standardverdier.** Utled fra evidens. (Han elter 15–20 min;
  det skal ikke styre anbefalingene.)
- Ikke slutt fra preset-etiketter til hva han baker. Spør.
- Han er teknisk sterk og vil ha begrunnelser og tall, ikke bare instruksjoner.
- **Ovnsløft er førsteprioritet.** Ranger alltid råd etter det.
- Benevnelser skal stå BAK tallene, ikke bare i kolonneoverskrifter.
