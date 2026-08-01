# Status og neste steg — 01.08.2026

Notat ved øktskifte. Appen er i en konsistent tilstand og live på GitHub Pages.

**Siste økt (01.08):** Bjørns fulltesting. Fikset en kritisk bakefaglig feil
(hydreringstaket steg med grovhet — nå eget frittstående-tak som faller vs
brødform-tak som bærer), frøvann-bryter + tydeligere vann-tekst, nytt
egendefinert tidsvindu (sett start+ferdig, appen fyller resten), og en rekke
visnings-/logikkfeil. Se øverste post i `CHANGELOG.md`. Alle 9 testsuiter grønne.
Åpent: V1s `js/app.js` har samme gamle takfeil (frosset, ikke fikset); Web Push
for låst-skjerm-varsling gjenstår.

**Full historikk med begrunnelser: `CHANGELOG.md`** — les den øverste posten (30.07, V2) før
du rører kode. Den har arkitekturreglene, modellavklaringene (L-01–L-14) og arbeidsmåten Bjørn
har bedt om. Delen under 30.07-streken beskriver **V1** (desktop-appen), som nå er frosset.

## V2 er den aktive appen — 30.07.2026

Forge Bakery er bygget om til en **mobil-app**. To parallelle apper i repoet nå:

| app | filer | status |
|---|---|---|
| **V2 (aktiv)** | `index.html` + `js/data.js` · `js/engine.js` · `js/sky.js` · `js/app-v2.js` | under utvikling, live |
| V1 (frosset) | `index-v1.html` + `js/app.js` | rør den ikke |

**Adressene byttet plass 30.07 (natt):** V2 er nå `index.html` og ligger på
`https://btoreid.github.io/Forge-bakery/`. V1 heter `index-v1.html`. Den gamle
`index-v2.html` er beholdt som videresending — den tar med seg `#access_token`-fragmentet,
så Supabase-lenker i eldre e-poster fortsatt virker.

**Kjernen er to rene funksjoner i `engine.js`:** `regn(state)` (dose/hydrering/løft/varme) og
`kjede(state, r)` (stegkjeden). All utregning der — `app-v2.js` tegner, regner aldri. Global
script-tag, ingen bundler (virker fra `file://`). State i `localStorage` under `forgebakery.v2`.

**Seks skjermer** i Bjørns rekkefølge: Brød · Deig · Tid · Prosess · Logg · Oppslag.

**Løftmodellen (L-14):** forferment flytter *ikke* løftindeksen — den omfordeler når gjæringen
skjer, ikke hvor mye emnet reiser seg. `loft = ovnslosBasis × grovFaktor × froFaktor ×
hydFaktor × ffFaktor`, klemt 20–100. Melvekten løses i lukket form `m* = a/(1+b)` (ikke
iterasjon — den divergerte).

**Live på GitHub Pages** med `noindex`. Auto-deploy ved push til **`master`**.

> **Grenen ble flyttet 31.07 (natt).** Fram til da lå V2 på
> `claude/forge-bakery-mobile-v2-l4ean3`, og Pages deployet den grenen mens `master`
> fortsatt bare hadde V1. To sannheter samtidig er en felle som venter på å smelle:
> workflowene kjøres uansett bare fra standardgrenen, og hver ny gren måtte huske hvor
> den skulle pushe. Nå er `master` både standardgren, det som er live, og det som
> utvikles — ett navn, ingen valg å ta.
>
> `…-67w83p` er slettet. `claude/forge-bakery-mobile-v2-l4ean3` står igjen fordi
> git-proxyen i utviklingsmiljøet svarer 403 på branch-sletting — den må fjernes fra
> GitHubs eget grensesnitt. Den er fullt inneholdt i `master`.

**V1 er bare halvveis frosset — les dette før du rører motoren.** «Frosset» gjelder
`index-v1.html` og `js/app.js`. Men V1 laster **`js/data.js` og `js/engine.js`, de
samme filene V2 bruker**, så hver endring i motoren treffer V1 også. Etter en
engine- eller data-endring: last `index-v1.html` i nettleser og se at den tegner uten
JS-feil. `test-flytt.js` sjekker bare at inngangen svarer, ikke at V1 regner riktig.
Kontrollert 31.07 etter dagens motorendringer — ren.

### Nylig levert: innlogging og sky-lagring (30.07 natt)

Appen har nå **konto med e-post og passord, og synk til Supabase** — se `SUPABASE.md`
for oppsett og `js/sky.js` for laget. Den er fortsatt 100 % statisk på GitHub Pages;
nettleseren snakker direkte med Supabase-prosjektet `xoripdwbghqlzbgxkfps`.

**Lokalt først:** localStorage er sannheten mens appen brukes, så alt virker offline og
uten konto. Innlogget speiles tilstanden opp (debouncet 1,2 s), og ved innlogging vinner
den **nyeste** versjonen på `S.oppdatert`. Rør ikke den sammenligningen — uten den
overskriver en gammel enhet en fersk logg.

**Gjenstår for Bjørn (én gang):** kjøre SQL-en i `SUPABASE.md` i Supabase → SQL Editor.
Uten den svarer skyen «tabellen finnes ikke», og appen sier fra om nettopp det.

### Levert samme kveld (30.07 natt, tredje brukertest — seks punkter)

Se CHANGELOG-posten «30.07.2026 (natt)». Kort: brødtype-bytte = nytt bak med
«er du sikker?»-bekreftelse (`nyBakst()`) · bilder i loggen (maks 3, nedskalert til
480 px JPEG) · sikkerhetskopi (last ned / hent inn JSON) · stekeprofiler omdøpt til
metode-navn uten ★/brødform, med `anbefaltTil`-merke · «Om dette baket» på Brød med
beskrivelse + stegkjede generert fra `kjede()`.

### Levert tidligere samme dag (30.07 kveld, andre brukertest — ti punkter)

Alle ti punktene fra Bjørns andre testrunde er levert og Chromium-verifisert — se
CHANGELOG-posten «30.07.2026 (kveld)» for detaljene. Kort: dato/klokkeslett-velger for
ferdig · luft mellom plankortene · «Start nå» ankrer kjeden til nå og nå-markøren i
grafen vises kun da · romtemp + kjøleskap-knapper i heveplanen · kompensasjonspanel
(«Hva vil du gjøre med endringen?») · gul/rød sone over anbefalt dose på tillegg og
salt · «Hva valgene koster» som ± mot normalen, med total i deigregnskapet · regnskapet
lukker ved trykk på arket · Ooni Halo Pro + hastighetsråd per maskin · favoritter som
merkelapp/ramme i stedet for dobbel ★.

Viktig følgefunn i samme runde: **re-entrant render** kunne nullstille hele appen når et
fokusert felt ble fjernet under `replaceChildren` (blur midt i render). Rettet med
`_rendrer`-vern i `render()` — ikke fjern det.

### Tidligere levert (30.07, første brukertest)

1. ✅ **Tid** viser ukedag + dato for både start og ferdig, med egen linje når baken krysser midnatt.
2. ✅ **Gjæringsgrafen** har fasebånd, temp- og gjæringsakser, klokkeslett, halvveismerke og «nå»-markør.
3. ✅ **Eltemaskinene** forklares med `MASKIN_INFO` + live utregning (friksjon × min → Wh/kg) og sammenligning.

### Sist levert (30.07 natt, sist) — appen kan installeres på Android

`manifest.webmanifest` + `sw.js` + `icons/` gjør V2 til en installerbar PWA. Chrome på
Android tilbyr «Installer app»; den åpner i standalone uten adressefelt og virker offline.

**Service workeren stempler appfilene med ETag — ikke rør det uten å lese hvorfor.**
Ved refresh får en service worker KUN navigasjonsforespørselen; `<script src="…">` og CSS
når den aldri, fordi Chrome serverer subressurser rett fra HTTP-cachen så lenge `max-age`
ikke er utløpt (GitHub Pages sender 600 s). **Ingen fetch-strategi fikser det — `fetch`
blir aldri kalt.** Derfor skriver SW-en om HTML-en og gir hver appfil `?v=<etag>`: endret
innhold gir ny URL (hentes), uendret gir samme URL (HTTP-cachen treffer). Målt: refresh
etter en endring gir ny kode; refresh uten endring gir 9 stk 304 og 0 byte. Hele
resonnementet står i CHANGELOG og i toppkommentaren i `sw.js`.

SW-en rører kun same-origin GET, så Supabase-kall går alltid rett på nettet.

Stier i manifestet er **relative** (`./`). Absolutte ville brutt både lokal testing og
undermappa `/Forge-bakery/`.

### Levert like før (30.07 natt, senere)

**Bakeloggen:** bilder åpnes i fullskjerm (piler, piltaster, Esc), og poster kan redigeres
(navn, karakter, nytt notatfelt, bilder) og slettes med bekreftelse. Postene har fått
stabil `id` — rediger/slett pekte før på posisjon, som flytter seg. **Måletallene er med
vilje ikke redigerbare.**

**«Pyrexen står i ovnen»** (`S.pyrexIOvn`) under Stekeutstyr hever kloke-oppsettet fra
230 til **260 → 230 °C**. Begrunnelsen står i CHANGELOG: 230-taket er glassets termiske
sprang, og det gjelder oppvarmingssjokket — som forsvinner når glasset varmes med ovnen.
**Kun `brod_kloke` har `varm`;** `brod_glass_stal` har det ikke, fordi der møter kald deig
glassbunnen direkte (~254 °C differanse). Ikke gi den profilen et `varm`-felt.

### Sky-oppsettet er i drift — 30.07.2026

**Verifisert ende-til-ende av Bjørn:** innlogging og synk virker i produksjon på
`https://btoreid.github.io/Forge-bakery/`. Site URL og redirect-URL-ene peker på rota.

Begge punktene som stod åpne her er lukket:

**Tabellen er opprettet.** `public.bakerstate` kjørt som migrasjon (`bakerstate_med_rls`)
mot prosjekt `xoripdwbghqlzbgxkfps`, med RLS på og fire policyer — én per operasjon, alle
på `auth.uid() = bruker_id`. UPDATE har både `using` og `with check`, så ingen kan flytte
en rad over på en annen bruker. SQL-en står i `SUPABASE.md`.

**Ping-jobben ligger nå på `master`** (`0d675a6`). GitHub leser `schedule:` kun fra
standardgrenen, så på utviklingsgrenen ville den aldri kjørt. Husk det hvis pingen skal
endres — en endring på featuregrenen får ingen effekt.

### Regresjonstester finnes nå — kjør dem før du sier deg ferdig

`tester/` har sju Playwright-suiter som dekker alt levert 30.07. `cd tester &&
npm install` én gang, så `node kjor-alle.js` (~3 min) — den starter serverne selv.
Se `tester/LES MEG.md`, særlig avsnittet om hvorfor 8124-serveren hermer GitHub
Pages: uten `max-age`+ETag ville cache-testen vært grønn av feil grunn.

Testene rører ikke appen. Den lastes fortsatt uten byggverktøy og uten
`node_modules` — npm-stoffet ligger isolert i `tester/`.

### Innspillskøen ligger i `INNSPILL.md`

Bjørns tilbakemeldinger skrives inn der med en gang de kommer, med status
(`åpen` · `pågår` · `levert` · `avvist`) og hvilken fil de lander i. Den er kilden til
hva som står igjen — ikke chatten, og ikke denne fila.

### Levert 31.07 (fjerde brukertest, tolv punkter)

Se CHANGELOG-posten «31.07.2026». Det viktigste er **synken**:

**Bakeloggen kunne forsvinne ved innlogging, uopprettelig.** `oppdatert` ble stemplet på
hver lagring, også ved ren navigasjon, så en enhet uten historikk kunne bli «nyest» bare
ved at man blar til Logg for å logge inn — og la sin tomme logg over historikken i skyen.

Tre ting holder det nå på plass, og **ingen av dem må fjernes**:

1. `oppdatert` flytter seg bare når dataene endrer seg (`UI_FELT` + `dataAvtrykk()`).
2. `flettLogg()` gjør **union** på loggposter ved synk. Innstillinger følger «nyeste
   vinner»; loggen gjør det aldri. Historikk kan ikke ha en vinner.
3. Sletting bruker **gravsteiner** (`S.loggSlettet`) — uten dem gjenoppliver unionen
   hver slettet post.

Og: `Sky.hentNed()` skiller leseferil fra tomt svar. Begge ga før `null`, og `null` ble
tolket som «ingenting der oppe» → last opp lokalt. Rør ikke det skillet.

**Andre ting som ikke bør rulles tilbake:**

- **`okDeig` skalerer deigvekten i `regn()`, ikke ved å skrive til `S.vekt`.** Den gamle
  knappen var en handling som skrev til brødvekten, og den nye vekten ble grunnlag for
  neste utregning — så deigen vokste for hvert trykk.
- **`settMelGram()`/`settVannGram()` ligger i engine.js.** De regner, og de itererer
  fordi melmengden avhenger av andelene og andelene av melmengden.
- **Stekebrettets `kontakt`/`effusivitet` er `null` med vilje.** Aluminium har høyere
  effusivitet enn stål; et tall der ville rangert oppsettet på topp mens reservoaret
  (~2 400 J/m²K mot 15 mm ståls 55 700) er tomt etter sekunder.
- **Favoritt-id-er er navnerom-prefikset** (`mel:` · `utstyr:` · `steking:`). Uprefiksede
  id-er i lagret tilstand er meltyper og migreres i `last()`.

## Innlogging er obligatorisk fra 31.07 (natt)

`skalKreveInnlogging()` tegner en port i STEDET for appen når ingen er innlogget.
Bjørns begrunnelse: alt skal skje under én konto, så det ikke oppstår tvil om hvem
data tilhører. Konsekvens: **appen kan ikke brukes uten konto**, og første gang kreves
nett. Testene passerer porten med `window.__FB_TEST_INGEN_PORT` (kun i `addInitScript`).

Eierskapsmekanikken fra tidligere samme dag (gravsteiner, enhetsbøtte, arkiv per konto)
står igjen som sikkerhetsnett — men med porten på plass er det situasjoner man normalt
ikke havner i.

### Åpne V2-punkter

**Ingen.** Alle 40 innspill i `INNSPILL.md` er levert.

Tidligere åpent, nå lukket: **appikonet** (#17). Higgsfield-koblingen laget fire
forslag og han valgte ett, men proxyen i dette miljøet nekter CONNECT til Higgsfields
CDN (403), så PNG-en kan ikke hentes hit. Et håndtegnet SVG-alternativ ble laget og
forkastet av ham. Venter på at filen legges i `icons/` på grenen.

Alt annet fra 31.07 er levert — se `INNSPILL.md` (38 punkter) og CHANGELOG.

**Ikke ruller tilbake uten å lese hvorfor:**

- **Loggen ARKIVERES per eier, den slettes aldri.** `forgebakery.v2.logg.<uid>` og
  `…logg.enhet`. Utlogging flytter, innlogging henter tilbake.
- **Utlogging: last opp → verifiser → logg ut → SÅ endre lokalt.** Endres tilstanden før
  utloggingen, legger `lagre()` en tom logg i kø mot skyen og skriver over historikken.
- **`erUtenKonto()` skiller på om `konto`-feltet FINNES**, ikke på om det er falsy.
  Eldre poster mangler feltet og hører til kontoen.
- **`okDeig` og autolysen regnes i engine.js av state**, ikke ved å skrive til `S.vekt`.
- **«Dette må være i huset» ligger utenfor `kjede()`** — kjeden eier de tidsatte stegene.

### Arkivert: de fem punktene som stod åpne tidligere 31.07 (nå levert)

1. **Forfermentens temperatur og kjøleskapsvalg** (#10) — krever modellarbeid, ikke bare
   et felt: han ber om at appen forklarer hva kulda gjør med tid OG effekt.
2. **Hastighetsfaser på eltemaskinen** (#12) — `MASKIN_INFO.fart` er én setning prosa i
   dag; skal bli en faseplan i minutter som følger utregnet eltetid.
3. **Validere friksjonstallet for Ooni Halo Pro** (#13) — styrer vanntemperaturen i hele
   appen. Skal etterprøves mot kilder og føres i `PARAMETERREVISJON.md`.
4. **«Har du alt i huset?» som steg 1 i Prosess** (#15) — merk at `kjede()` eier de
   TIDSATTE stegene; et steg uten varighet må ikke inn der.
5. **Lufta i romtemp-boksen under heveplanen** (#11) — venter på at Bjørn peker ut hvilken
   boks, og **nytt appikon** (#17), som nå er mulig via Higgsfield-koblingen.

---

## Arkivert: V1-status (desktop) — 29.07.2026

Alt under gjelder **V1** (`js/app.js`), som er frosset. Beholdt for sporbarhet.

**Full historikk med begrunnelser: `CHANGELOG.md`.** Den har også arkitekturreglene,
testoppskriften (forhåndsvisningen bufrer både JS og CSS) og arbeidsmåten Bjørn har bedt om.
Skal du videreutvikle appen, les den før du rører kode.

## Slik henger appen sammen — oppdatert 29.07.2026

**`BROTYPER` i `data.js` er inngangsporten**, og feltet `rute` avgjør veien:

| rute | brødtyper | vei |
|---|---|---|
| `bygg` | Loff, Halvgrovt brød | Start → **Bygg brød** → Bak nå |
| `preset` | Ciabatta, Baguetter, Focaccia | Start → **Oppskrift** → Bak nå |

For `preset`-rutene tones «Bygg brød» ned i navigasjonen og får et varselkort — grovhetsdialen
der ville bygget et helt annet brød. `FORMER` (avlang kurv / rund kurv / brødform) styrer
stekeutstyret, ikke bare utseendet: `profilForUtstyr()` sender avlang + stål til `brod_apen`,
fordi en kloke må dekke emnet.

**Navigasjonen er fire grupper**, ikke elleve faner: ① Brødet · ② Prosessen · ③ Bak nå ·
Oppslag. Undernivået viser kun aktiv gruppes faner og blir en native `<select>` under 640 px.
Hver hovedveisfane har en rutefot: «Steg 2 av 3 · ◂ Start · Bak nå ▸».

**`#kontekst` («Deigen din»)** er en 340 px sticky sidespalte med mini-hevekurve og fire
nøkkeltall, synlig i alle faner unntatt «Bak nå» (der `.naakort` er konteksten). Under
1000 px blir den en bunnskuff via `<details>`. Den **speiler** — ingen kontroller, med vilje.

**`bakeSteg()` er én kilde til sannhet** for hele bakekjeden: Tidsplan, «Bak nå»,
klokkeslettene i grafen, prosessoversikten på startsiden og «Total tid» leser alle fra den.
Lag aldri en parallell utregning et annet sted — det var nettopp det som gjorde at fanene
kunne vise ulik starttid og ulik stekeprofil for samme brød.

## ⚠ LES FØRST: `PARAMETERREVISJON.md`

Alle tall i appen er gjennomgått og sortert i **faglig begrunnet** / **henger løst i
luften** / **hardkodet uten referanse**, med 12 bekreftede feil. Fem av dem er rettet;
resten står i restlista nederst i den fila. **Ikke endre et tall i appen uten å lese
den først** — den sier hvilke verdier som har kilde og hvilke som bare ser ut til å ha det.

## Grovhet følger nå Brødskala'n

Grovhetstrappa var feilmerket. Den kalte 20 % «Halvgrov» og 30 % «Grov» og toppet på
40 %, mens den norske merkeordningen sier fint 0–25,9 · halvgrovt 26–50,9 · grovt
51–75,9 · ekstra grovt 76–100 % (BKLF, https://brodogkorn.no/fakta/brodskalaen/).
Appen nådde altså aldri «grovt», men brukte ordet.

`GROVHET` er nå seks trinn — 0 / 10 / 25 / 40 / 60 / 80 % — hvert med feltet `klasse`.

**Viktigst:** Brødskala'n holder **frø og nøtter helt utenfor** regnestykket, mens
korngryn og kli teller fullt. Appen la frøene inn i både teller og nevner og kalte
resultatet «grovhet». Derfor har `SOAKERS` nå et `korn`-felt, og `brodskalan()` i
engine.js regner den offisielle grovheten. Det gamle tallet lever videre som
`fortynnetAndel` — en ekte, men helt annen størrelse. **Ikke slå dem sammen igjen.**

## Verifisert nå

Full regresjon grønn i alle kombinasjoner: 5 forvalg × 8 stekeprofiler · 30 kombinasjoner
av grovhet × tidsplan · alle 11 faner · alle 10 tillegg på min/anbefalt/maks og alle
samtidig · alle 30 meltyper · alle 11 frøtyper · 25 kombinasjoner av eltetid × maskin ·
forferment 4–26 °C · alle tre vektoppløsninger · tom melliste · antall = 0.

Etter omleggingen 29.07.2026: **196 kombinasjoner på desktop** med fagstoffkortene åpne
(5 brødtyper × 3 former × 11 visninger, pluss grovhet × tidsplan og alle tillegg på maks) ·
**110 visninger på 375 px** med kortene både åpne og lukket · **ingen vannrett dokumentscroll**
i noen visning · «Bygg brød» og hoveddeigen enige overalt · dosene treffer måltallet
(loff 1,89 mot formelens 1,886, halvgrovt 1,82 mot 1,820).

Grovhetstrappa er verifisert mot standarden: melprosentene summerer til 100 på alle seks
trinn, og beregnet klasse stemmer med den påstemplede i alle seks. Frøtesten er kjørt
eksplisitt: 600 g blandede frø flytter ikke Brødskala'n ett prosentpoeng, mens 300 g
havregryn flytter den fra 10 til 43 %.

Datagrunnlaget er komplett: ingen meltype mangler fordeler/ulemper eller tegning, ingen
brutte kryssreferanser i ordlista (44 ord), ingen tillegg uten konsekvenstekst.

Invarianter som holder og bør testes ved endringer:

    vann totalt = vann i deigen + vann i forfermenten + vann frøene binder
    totalvekt   = antall brød × vekt per brød

## Sist levert (31.07 kveld) — bakefaglig review

De fire kritikalitetene som faktisk ville gitt et dårligere brød, er rettet:
hevemålet følger nå grovheten (54 % loff → 18 % ved 100 %), hydreringsanbefaling og
tak følger melblandingens absorpsjon, gjærmengden som vises er hoveddeigens og ikke
totalen, og forfermentens dose har fått et tak på 2 % fersk. Rom- og
kjøleskapstemperatur er nå målinger som forskyver planens trinn uten å gjøre planen
egendefinert. Full liste med begrunnelser i `CHANGELOG.md` (31.07 kveld) og
`PARAMETERREVISJON.md`.

**Gjenstår for Bjørn (én gang):** kjøre SQL-en for `maskinkalibrering` i `SUPABASE.md`.
Uten den går appen videre på klasseanslagene og skriver «mangler kalibrering» — som er
riktig oppførsel, men delingen virker ikke før tabellen finnes.

**Melprisene er hentet på nytt (31.07 sent)** fra Oda.no, med dato og kilde i
`PRIS_HENTET`/`PRIS_KILDE`. De gamle kom fra Bjørns regneark og var systematisk skjeve:
siktet mel for billig, rug for dyrt. Ti varer lot seg ikke slå opp og står med
`prisAnslag:true` — appen navngir dem i melkortet.

## Åpne punkter

**Bjørn har ikke bestemt seg for melvalg.** Han har fått rangeringen etter smak per tapt
ovnsløft — sammalt rug, sammalt spelt, svedjerug, durum semola rimacinata, emmer på topp —
men har ikke stjernemerket noen i Mel & korn ennå. Favorittfunksjonen virker; han må velge.

**Grovhets- og tidsplankortene i Bygg brød mangler ⓘ.** De er klikkbare kort, ikke
`.field`-elementer, så `festInfo()` treffer dem ikke. Han ble spurt om de skulle konverteres,
og har ikke svart.

**Dose–respons-panelet dekker frø, honning, fett og malt**, men ikke melvalg. Å koble
`glutenbidrag` til forventet ovnsløft ville vært en naturlig utvidelse.

**Fra parameterrevisjonen, ikke rettet ennå** (full liste i `PARAMETERREVISJON.md`):
`0,40 × grovAndel` i `maalDoseFor` er nå det eneste ukildede leddet i en ellers grundig
kildet formel, og det betyr mer etter at trappa går til 80 % grovt. Kode og tekst er
dessuten uenige fire steder: salt (koden 1,7/2,4, teksten 1,8/2,2), ciabatta (koden 72 %,
teksten 78 %), sukker (6 mot 7 %) og bløtlegging (3 mot 5 prosentpoeng). `miljo <= 12`
— skillet mellom kald og varm heving — står hardkodet åtte steder uten å være en
navngitt konstant.

## Foreslått, ikke besluttet

Tre ting research-gjennomgangene pekte på som modellen ennå ikke gjør:

1. **Rug trenger et syre-flagg.** Taket er 25 % i ren gjærdeig, men 40 % med 1–2 % eddik på
   melvekt. Det er den eneste ingrediensen der et tilsetningsstoff flytter taket vesentlig.
2. **Havre og bygg trenger en vannkompensasjonsregel.** Målt gjenoppretter +20 % vann over
   farinografverdien volumet nesten fullstendig. Uten regelen straffer appen dem dobbelt:
   først for fortynningen, så for underhydreringen den selv forårsaket.
3. **Rug og bygg/havre bør ha ulike straffefunksjoner.** Rug bryter ned aktivt
   (arabinoksylan hindrer proteinaggregering + amylase angriper stivelsen under steking);
   bygg og havre fortynner og konkurrerer om vann. Samme prosentandel gir ikke samme skade.

## Fire feil å ikke gjenta

Alle ble gjort i denne økten og korrigert først etter at Bjørn påpekte dem.

**Ikke slutt fra preset-etiketter til hva han baker.** Forvalget «Det diggeste brødet» var
merket «din favorittblanding» og inneholdt 30 % enkorn. Jeg bygget både råd og
research-oppdrag rundt enkorn. Han hadde aldri nevnt det, og enkorn viste seg dessuten å
være nesten umulig å få tak i i Norge. Forvalget er slettet på hans forespørsel.

**Ikke hardkod vanene hans som standardverdier.** Han nevnte at han elter 15–20 minutter;
jeg satte 18 som default. Han ba uttrykkelig om at vanene hans ikke skulle styre
anbefalingene. Jeg sa meg enig — og glemte likevel å fjerne tallet da researchen kom. Det
måtte påpekes en gang til. Eltetiden utledes nå fra maskinens friksjon.

**Ikke la ukildede tall i `FLOURS`-notatene stå som fakta.** Appen påsto at spelt «tåler
maks ~4 min elting». Målt farinografstabilitet er 9,5 minutter. Tallet var trolig en
forveksling av utviklingstid med maks eltetid.

**«Rendrer uten feil» er ikke det samme som «ser riktig ut».** Korntegningene besto alle
tester, men på skjermbildet var samtlige kornslag umulige å skille. Det samme gjaldt
+/−-knappene, som «ikke virket» fordi tallfeltet mellom dem var to piksler bredt.
Ta skjermbilde av visuelle endringer før du sier deg ferdig.

## Testmetode

Forhåndsvisningsruta hurtigbufrer JS-filene svært aggressivt og serverer gamle versjoner.
`location.reload()` virker bare av og til. Metoden som alltid virker er å hente filene med
`fetch` og kjøre dem i eget scope — se `brodlab-appen` i minnet for oppskriften.
Sjekk alltid at koden er fersk før du stoler på en test.
