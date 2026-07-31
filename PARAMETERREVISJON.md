# Parameterrevisjon — Forge Bakery

Gjennomgang 29.07.2026 av alle tall appen regner med eller påstår faglig.
Kilder: `js/engine.js` (576 l.), `js/data.js` (1352 l.), `js/app.js` (2772 l.).

Tre kategorier, som bedt om:

- **A. Faglig begrunnet** — kilde eller utledning finnes, og tallet er kryssjekket mot noe uavhengig.
- **B. Henger løst i luften** — tallet påstår empiri («målt», «publisert»), men ingen kilde er
  oppgitt noe sted. Kan være helt riktig; det er bare ikke etterprøvbart.
- **C. Hardkodet uten referanse** — magiske tall i koden som styrer råd, uten kommentar eller kilde.

Til slutt: **D. Bekreftede feil** — steder der koden og teksten sier ulike ting, eller der
et oppslag ikke treffer.

---

## A. Faglig begrunnet — disse kan stå

| Parameter | Verdi | Hvor | Forankring |
|---|---|---|---|
| Måldose, basis | 2,30 | `app.js:520` | 24 fullt spesifiserte publiserte formler (Hamelman, King Arthur Pro, ChainBaker, Forkish, Weekend Bakery, brotdoc, BBGA). Median 1,83, kvartilbredde 1,15–2,41. |
| Måldose, pff-ledd | ×(1 − 0,6·pff) | `app.js:520` | Samme materiale: formler med forferment ligger på 1,63 i snitt mot 2,30 uten. Uavhengig bekreftelse av strukturen. |
| Elting → varme | 1 Wh/kg = 1,29 °C | `engine.js:324` | c_p 2,8 kJ/kg·K. Kryssvalidert: Chorleywood leverer målt 11 Wh/kg og gir dokumentert 14–15 °C stigning; modellen gir 14,2. |
| Ratkowsky T_max | 44,0 | `engine.js:12` | Salvadó 2011 (T_max 45,4 for vekst). |
| Ratkowsky, samlet | T_min 0, c 0,28 | `engine.js:11–13` | Reproduserer tre uavhengige observasjoner samtidig: dobling per 8–10 °C ved romtemp, R(3,5 °C)=0,021, målt optimum 1,82× ved 35,5 °C. Det er en ekte overbestemt tilpasning. |
| Varmekapasiteter | mel 1,81 · vann 4,181 kJ/kg·K | `engine.js:272` | Standard termofysikk. |
| Isandel | (spring − ønsket)/(79,9 + spring) | `engine.js:337` | Smeltevarme/varmekapasitet. Eksakt, ikke tilnærming. |
| Fersk → instant tørr | ÷3 | `engine.js:24` | Enstemmig i alle konsulterte kilder. |
| Poolish-potensloven | K 7,7 · n 1,33 | `engine.js:28–29` | Treffer den publiserte tabellen (12 t 0,11 % → 18 t 0,05 %) innenfor ~15 %. Tabellen selv: Calvel/Rosada via SFBI, klassisk fransk bakertabell, Weekend Bakery. Kryssjekk: gir 0,95 % fersk for Giorillis 18-timers biga, mot Giorillis egne 1 %. |
| `TILLEGG_EFFEKT` (alle fire) | frø · honning · fett · malt | `data.js:828–878` | **Den best kildede strukturen i appen.** Hver tabell har eget `kilde`-felt med navngitte studier: Aldawsari & Simsek 2014, Gélinas & McKinnon 2018, Verheyen et al. Foods 2022, Chin et al. 2010, Canale et al. 2025 LWT 229:118150, Mäkinen & Arendt 2012, PMC-referanser. |
| Praktisk gjærtak | `TAK_TORR` 0,833 | `app.js:568` | = 2,5 % fersk. Begrunnet: over dette får du gjærsmak og kollapsende hevevindu. |
| Veieterskel | 20 × minste trinn | `app.js` `underVekt()` | Vektas usikkerhet er ±1–2 siffer; under 20× spiser den en merkbar andel. |
| `anbefaltEltMin()` | utledet | `app.js` | Midtpunkt av målsonen (4 Wh/kg) ÷ maskinens friksjon. Ingen fast default — bevisst, etter tidligere feil. |
| Urkorn-eltetak | enkorn 4 · emmer 5 · spelt 9 min | `app.js:2143` | Grundig kommentert. Spelt: glutenindeks 59 mot hvetens 97–100, farinografstabilitet 9,5 mot 17,5 min. Kommentaren dokumenterer også at en tidligere **gjettet** tabell ble fjernet — det er forbilledlig. |
| Kald biga-protokoll | 24 t · 4 °C · 1 % fersk · 50 % | `app.js` | Molino Quaglia / Petra, direkte sammenligning mot Giorilli-standarden. |
| Honning- og smørvann | 17,1 % · 16 % | `engine.js:444` | Næringsdata, oppgitt i grensesnittet. |
| Stivhetsfaktor | 1,0 ved 70 % → 2,5 ved 50 % | `engine.js:253` | Selve kurven er konstruert, men endepunktet er kryssjekket mot Giorilli. Grensetilfelle mot B. |

---

## B. Henger løst i luften

Alle disse påstår et konkret tall. Ingen av dem har en kilde du kan slå opp.

### B1. Melbibliotekets egne tall — det største hullet

`FLOURS` har 30 oppføringer × 5 numeriske felt. **Ingen av dem har kilde.**

| Felt | Hva det styrer | Status |
|---|---|---|
| `absorpsjon` (0,90–1,20) | **Anbefalt hydrering, direkte.** Blandingens faktor = Σ(andel × absorpsjon) | Ukildet for alle 30. Unntak med begrunnelse i notatet: enkorn (−6 pp «målt») og bokhvete (farinografopptak 54,8 → 52,6). Resten er tall. |
| `maxPct` | Praktisk tak i frittstående brød | Ukildet. Rug står på 40 % — men appens eget notat sier taket er 25 % i ren gjærdeig, 40 % først med 1–2 % eddik. Flagget som åpent punkt tidligere; fortsatt uløst. |
| `styrke` | Advarsler, forfermentvalg, hevemål | Subjektiv sjubunns skala uten definert måleprosedyre. Se **D1** — den er også ødelagt. |
| `protein` | Vises, brukes ikke i regning | Deklarasjonsverdier. Bare Kolonihagen er merket «deklarert». |
| `kr` | Hele kostnadsregnskapet | Ingen dato. Priser råtner; disse vil være feil om et år uten at noe varsler. |

`SOAKERS` har samme problem, og det veier tyngre fordi tallene går rett inn i
vannregnskapet: `kaldt`/`varmt` (38–320 g per 100 g) driver `froAbsorbert`, som
igjen driver effektiv hydrering og vannet i bollen. Bare `linfro_malt` er ærlig
merket `(est)` med spenn 250–350. De øvrige ti er ikke merket og har ingen kilde.

### B2. «Målt»-påstander uten navngitt kilde

Disse formuleringene sier eksplisitt at noen har målt noe, uten å si hvem:

- Spelt: glutenindeks 59 vs 97–100, farinografstabilitet 9,5 vs 17,5 min *(dette er
  tallene som erstattet den gamle feilen — de fortjener en kilde nettopp derfor)*
- Salt: alveograf på 176 prøver, W 147 → 201 (+37 %), høyere i 171 av 176
- Salt: utviklingstid +40–45 % (farinograf 5,6 → 8,0 min), stabilitet +49–80 %
- Malt: 0,5 % trekker falltallet 327 → 194 s; farinografstabilitet 7,5 → 2,6 min
- Fett: krummehardhet 686 g med 3 % fett mot 1163 g uten (69 %); oleogel koster 8,8 % volum
- Risting: 28–51× mer pyrazin, optimum 125 °C i 45 min
- Havre: 12,6–24 % volumtap ved bare 10 %; +20 % vann gjenoppretter
- Kikertmel: høyere deigstabilitet ved 10 % enn kontrollen
- Forvarming: 15 min → 144 °C, 30 → 213, 45 → 233, 60 → 265 (ovn 260 °C)
- Friksjon: hånd 0,15 · planet 0,6 · hjemmespiral 0,4 · kommersiell 1,0 °C/min
- pH: 48 t ved 22 °C flytter pH 6,13 → 5,44; melkesyre 0,17 vs 4,93 g/kg (29×)
- Flytetesten: avgasset deig 1,20–1,23 g/cm³, innpisket luft 5–13 %
- `RISE_ANKER` (27→30 %, 24→50, 21→75, 18→100): betingelsene *er* oppgitt
  (75 % hydrering, 90/10, 2 % salt), som gjør den etterprøvbar — men kilden mangler.

### B3. Rene indeksverdier uten grunnlag

- `TIDSPLANER.ovnslos`: 100 / 96 / 90 / 82 / 70. Presenteres som prosent av oppnåelig
  ovnsløft. Ingen måling, ingen utledning. Brukes til fargekoding (`< 85` → advarsel).
- `GROVHET.ovnslos`-tekstene: «5–10 % lavere», «15–20 %», «25–35 %». Samme.
- `UTSTYR.effusivitet` / `kontakt`: 13625/232, 1453/147, 13123/232, 1730/157.
  Formelen e=√(k·ρ·c) er oppgitt, men **ingen av materialverdiene k, ρ, c er det** —
  så tallene kan ikke etterprøves. De er også internt inkonsistente, se **D8**.
- `maksKaldheving`-tabellen (72/54/24 t osv. for fire deigtyper): ingen kilde.
- `estimerPH`: PH0 6,05 · gulv 5,20 · K 0,030. Ingen kilde.

### B4. Konvensjon presentert som tall

Appen er ett sted forbilledlig ærlig: den sier eksplisitt at «biga må ha 16–18 °C» er
fagkonvensjon og ikke et målt optimum, og at 12–22 °C fungerer.

**Men forvalget setter fortsatt 18 °C** (`app.js` forferment-forvalg, og `PRESETS.ciabatta`).
Appen motsier altså seg selv i praksis: den forklarer hvorfor tallet ikke er hellig,
og velger det så for deg uten kommentar.

---

## C. Hardkodet uten referanse

Rangert etter hvor mye de påvirker rådene.

### C1. Høy påvirkning — bør avklares først

| Nr | Tall | Sted | Hva det styrer |
|---|---|---|---|
| 1 | `0,40 × grovAndel` | `app.js:520` | **Grovhetsstraffen i måldosen.** Basisleddet 2,30 og pff-leddet er grundig kildet fra 24 formler — dette leddet er det eneste i formelen ingen kommentar nevner. Det styrer gjærmengden i hele Bygg brød. |
| 2 | `takHyd = 80 / 76` | `app.js:670` | Hydreringstaket. Teksten kaller det «praktisk tak **for denne melblandingen**» — men tallet avhenger bare av om gryta er lukket, ikke av melet i det hele tatt. Det er direkte villedende. |
| 3 | `0,45` / `0,55` | `app.js:914, 1213, 1225` | Grensene for «for lite glutenbærende mel» — appens sentrale strukturvarsel, i tre visninger. |
| 4 | Hevevindu-oppslag | `app.js:873` og gjæringsvisningen | `torr ≥ 1,0 → 10–20 min`, `≥ 0,4 → 40–60 min`, `≥ 0,2 → 1–2 t`, ellers 1,5–3 t. Ren tabell i koden, ikke i `data.js`, ingen kilde. |
| 5 | `miljo <= 12` | 8 steder i `app.js` | **Skillet mellom kald- og romtemperert heving i hele appen.** Aldri navngitt konstant, aldri begrunnet. Endrer du det ett sted, går appen ut av synk med seg selv. |
| 6 | `± 8 %` | `app.js` (avviksbånd) | Toleransen mot referansedosen — det brukeren måles mot i «Gjæring & tid». |
| 7 | `55 / 65–85 / 90 %` | bulk-andel-rådet, 2 steder | Hvor mye av gjæringen som bør skje i bulken. |

### C2. Middels påvirkning

- `BASIS_TAK = 25` min (`app.js:2144`) — eltetak for vanlig hvetemel. Urkorn-tabellen
  ved siden av er grundig dokumentert; denne er ikke.
- `wh < 2,2` (`app.js:2172`) — nedre arbeidsgrense. De tre andre sonegrensene kommer
  fra `ELTING` i engine.js; denne er hardkodet lokalt.
- Harmonisk vekting av blandingens eltetak — her er kommentaren ærlig: «Selve
  vektingen er mitt anslag; det finnes ingen publisert regel for blandinger.» Godkjent
  som ærlig, men fortsatt ukildet.
- Friksjonskalibreringens fire terskler 0,05 / 0,3 / 0,55 / 0,8 °C/min.
- `FORVARM_MIN`: 105 / 55 / 75 / 45 min per stekeprofil. Prinsippet er kommentert
  («tallene er utstyrets, ikke ovnens»), de enkelte minuttallene ikke.
- `metning`-konstanten 6 i tilleggspanelet — bestemmer hvor fort smak og saftighet
  flater ut. Kommentaren forklarer at det *metter*, ikke hvorfor ved 6.
- `tau × 2,3` for nedkjølingstid (≈ ln 10, altså 90 % av veien — men det står ingensteds).
- `startVol = mel × 1,5` ml — deigvolum i hevekurven.
- Brettplanen: hver 30. minutt, 2–4 omganger, bare i første trinn over 1,5 t.
- `maalHeveProsent`-justeringene: hydJust-koeffisienten 1,2 og grovJust 0,7.
- Kostprisene i `engine.js:506` — salt 10, honning 120, olje 90, sukker 22, smør 90,
  malt 200, gjær 60/250 kr/kg. Hardkodet i regnemotoren, ikke i `data.js`, ikke redigerbare.
- Forfermentens salt 0,15 % og brukstidsvinduet (−2 / +3 / +5 timer).

### C3. Startverdier uten begrunnelse

`S`-tilstanden i `app.js:10–51`. Disse er det brukeren møter først, og de framstår
som anbefalinger enten de er ment sånn eller ikke:

`hydrering 70` · `saltPct 1,8` · `gjaerPct 0,3` · `startTemp 24` · `antall 4 × 900 g` ·
`forferment 25 % / 100 % / 14 t / 22 °C` · `dtMelTemp 21` · `dtSpring 12` · `dtFfTemp 18` ·
`planUtbak 45 min` · `planElt 75 min` · `masseKg 4`

`eltMin` er det ene unntaket: den har bevisst **ingen** default og utledes fra maskinen.
Samme behandling er verdt å vurdere for flere av disse.

---

## D. Bekreftede feil

Disse er verifisert direkte i koden, ikke antatt.

### D1. `middels-sterk` finnes ikke i tre av fire oppslagstabeller ⚠

Tre meltyper har `styrke:'middels-sterk'` — `regal_standard`, `caputo_blaa`,
`mollerens_tipo00` (`data.js:14, 26, 36`). Verdien er kjent i **én** tabell:

- ✅ `app.js:1678` (`forfermentMel`) — har `'middels-sterk': 4.5`
- ❌ `engine.js:400` (`beregnOppskrift` → `svakesteStyrke`) — mangler → faller til `?? 3`
- ❌ `engine.js:248` (`maalHeveProsent` → `styrkeJust`) — mangler → faller til `?? 0.96`
- ❌ `app.js:1243` (hydreringsadvarselen) — mangler → faller til `?? 3`

**Konsekvens:** Regal Hvetemel standard — appens eget anbefalte hverdagsmel og
grunnlaget i alle fem forvalg — rangeres som **3**, altså lavere enn Møllerens
hvetemel siktet som er `'middels'` = 4. Appen rangerer sitt sterkeste dagligvaremel
som svakere enn det den selv kaller svakere. En ren Regal-deig på 78 % hydrering
får derfor en rød advarsel om at melet er for svakt, og hevemålet regnes som om
melet var middels.

### D2–D5. Kode og tekst sier ulike ting

| Sted | Koden sjekker | Teksten sier |
|---|---|---|
| `app.js:1087` | `saltPct < 1.7` | «Under 1,8 % …» |
| `app.js:1088` | `saltPct > 2.4` | «Over 2,2 % …» |
| `app.js:1246` | `hydrering < 72` | «Ciabatta under 78 % blir et vanlig brød» |
| bløtleggingssteget | terskel `< 5` prosentpoeng | kommentaren rett over: «under ca. 3 prosentpoeng» |

Saltgrensene er verst: brukeren får ingen advarsel på 1,75 % selv om appen tre
andre steder sier 1,8 % er gulvet.

### D6. Solsikkeanbefalingen er ikke oppdatert overalt

`TILLEGG.solsikke.pct` ble justert 12 → 6 % etter research. Men `app.js:904` sier
fortsatt: «Loff+ med 10 % sammalt og **12 % ristede** solsikkekjerner er det klassiske
svaret». Appens egen tekst sier samtidig at 6 % ristede tilsvarer 12 % *uristede* —
så linjen anbefaler det dobbelte av gjeldende anbefaling.

### D7. Malt-kurven har to ulike basislinjer

`TILLEGG_EFFEKT.malt.falltall` går fra basis **300 s** (0,4 % → 205 s).
Fritekstene tre steder sier **327 → 194 s ved 0,5 %**. Samme fenomen, to
uforenlige nullpunkter — grafen og teksten kan ikke begge stemme.

### D8. Effusivitetstallene stemmer ikke med sin egen tekst

`UTSTYR` gir stål 13625 og åpen stekeplate 1730 → forhold **7,9×**.
Fagteksten sier forholdet er **6,3×** og at selgernes «18–20×» overdriver med ca. 3×.
Tilsvarende: 15 mm stål oppgis som 55 700 J/m²K ett sted og 55 695 to andre steder,
mens 6 mm-tallet 22 100 skalert til 15 mm gir 55 250.

### D9. Utstyrsbudsjettet summerer ikke

Postene i utstyrstipset er 700–900 + 300–1200 + 150–300 + 100–250 + 350–1100 +
100–200 kr = **1700–3950 kr**. Konklusjonen sier «1200–2000 kr dekker hele gapet».

### D10. Duplisert nøkkel

`svedjerug` står to ganger i `MEL_INFO` (`data.js:493` og `519`) med identisk innhold.
Harmløst i dag — den andre overskriver den første stille — men det er nettopp sånn
to versjoner av samme tall oppstår senere.

### D11. Flere interne motsigelser i fagstoffet

Samme parameter, ulik verdi på ulike steder:

| Parameter | Sted A | Sted B |
|---|---|---|
| Autolysetid | «30–45 min er nok» | «autolyse 1–3 timer» |
| Bassinage | «hold igjen 5–10 %» | «10–15 %» (to steder) |
| Diastatisk malt | «0 % er riktig standard» | «0,25–0,5 %» |
| Sukker og gassproduksjon | «konstant opp til 6 %» | «topper ved ca. 7 % (+89 %)» |
| Andel gjæring i bulk | «65–85 %» | «75–85 %» |
| Maks deigtemperatur | «over 26 °C» | «aldri over 28 °C» / «tak 30 °C» |
| Falltallsvindu | 280–320 s (tre steder) | 250–320 s |
| Solsikketerskel for bløtlegging | «under 6 % av melet» | «under ca. 8 %» |
| Maks ovnsløft ved hevegrad | 75–85 % (tre steder) | 70–85 % |
| Poolish-temperatur | 20–22 °C (tre steder) | 18–21 °C |
| Eltetid hjemmespiral | «12–16 minutter» | «15–20 min på Ooni Halo Pro» som *kort* elting |

### D12. Verdt et blikk, ikke sikkert feil

- **Friksjonsrangeringen:** planetmaskin 0,6 °C/min ligger *over* hjemmespiral 0,4.
  En spiralmikser gjør normalt mer arbeid per minutt enn en planetmaskin. 0,4 er
  målt på Halo Pro og skal stå — men 0,6 for planet fortjener en kontroll.
- **Den klassiske deigtempformelen** (`app.js:2050`) regnes som
  `3 × ønsket − melTemp − melTemp − 3 × friksjon`. Teksten beskriver «3 × ønsket −
  mel − **rom** − friksjonsfaktor». Appen har ikke noe romtemperaturfelt, så den
  antar rom = mel. Sluttsetningen innrømmer det («bare eksakt når mel- og
  romtemperatur er like»), men grader-bom-tallet brukeren ser avhenger av en
  antakelse han aldri har satt.

---

---

## RETTET 29.07.2026

Etter beskjed om å fikse kildene der det er hensiktsmessig, og å følge norsk
standard for grovhet.

### Grovhetsskalaen bygget om etter Brødskala'n

Trappa var feilmerket målt mot den norske merkeordningen. Den kalte 20 %
«Halvgrov» og 30 % «Grov», og toppet på 40 %. Etter Brødskala'n er alle tre
fint eller halvgrovt brød — appen nådde aldri «grovt», men brukte ordet.

Kilde: Brødskala'n, eid av Baker- og Konditorbransjens Landsforening (BKLF),
utarbeidet 2006 av NHO Mat og Drikke og BKLF, sist revidert 2017.
Fint 0–25,9 % · halvgrovt 26–50,9 % · grovt 51–75,9 % · ekstra grovt 76–100 %.

Ny trapp, seks trinn, hvert med feltet `klasse`:

| Trinn | Grovt | Brødskala'n | Nøkkelhullet |
|---|---|---|---|
| Loff | 0 % | Fint brød | nei |
| Loff+ | 10 % | Fint brød | nei |
| Fin, øvre kant | 25 % | Fint brød | nei |
| Halvgrov | 40 % | Halvgrovt brød | ja |
| Grov | 60 % | Grovt brød | ja |
| Ekstra grov | 80 % | Ekstra grovt brød | ja |

Alle seks er verifisert: melprosentene summerer til 100, og den beregnede
klassen stemmer med den påstemplede i alle seks tilfeller.

### Frø teller ikke som grovhet — dette var en ekte regnefeil

Brødskala'n regner `(hele korn + sammalt mel + kli + korngryn) / total melmengde`,
og holder **frø og nøtter helt utenfor brøken** — både teller og nevner.

Appen la frøene rett inn i begge og kalte resultatet «Grovhet totalt».
Et Loff+ med 300 g solsikke viste da 36,2 % og så ut som et halvgrovt brød.
Riktig svar er 10 %, fint brød.

`SOAKERS` har derfor fått et `korn`-felt. Havregryn, rugknekk, byggflak, knekt
hvete og hvetekli er korn og teller fullt; solsikke, lin, sesam, gresskar og
chia er frø og teller ikke. Verifisert:

| Tillegg | Brødskala'n | Strukturfortynning |
|---|---|---|
| ingen | 10,0 % | 10,0 % |
| 300 g solsikke | 10,0 % | 36,2 % |
| 600 g blandede frø | 10,0 % | 63,4 % |
| 300 g havregryn | 43,3 % | 43,3 % |
| 200 g hvetekli | 27,7 % | 27,7 % |
| 300 g solsikke + 200 g rugknekk | 38,3 % | 58,1 % |

Det gamle tallet er beholdt som `fortynnetAndel` («strukturfortynning»). Det er
en ekte størrelse — hvor mye av tørrstoffet som ikke bygger gluten — men det er
ikke grovhet, og det var feil å kalle det det.

### D1 rettet: `middels-sterk`

Lagt inn i alle tre tabellene som manglet den: `styrkeRang` og `styrkeJust` i
engine.js, `rang` i app.js. Regal standard rangeres nå 4,5 og ikke 3.
Verifisert: `svakesteStyrke` for en ren Regal-deig returnerer `middels-sterk`.

### C1 nr. 2 rettet: `takHyd`

Taket het «praktisk tak for denne melblandingen», men flyttet seg bare når du
byttet stekeutstyr. Det skalerer nå med blandingens `absFaktor`, som er den
samme størrelsen appen allerede bruker til anbefalt hydrering. Uten dette ville
de nye grove trinnene fått rød advarsel for hydreringen de faktisk trenger
(ekstra grov lander på 79,7 %). Basistallene 76/80 er fortsatt et anslag, og
kommentaren sier det nå.

### D6 rettet

Solsikketeksten sa fortsatt «12 % ristede» etter at anbefalingen ble justert til
6 %. Rettet, med appens egen begrunnelse: 6 % ristede tilsvarer 12 % uristede.

### Kildestatus lagt inn der verdiene ikke kan endres

`FLOURS` og `SOAKERS` har fått en kildestatus-blokk per felt. Verdiene er urørt
— de er hentet fra norske kilder og skal stå — men opphavet er nå ærlig oppgitt:

- `protein` — deklarasjon, etterprøvbar i butikk, sier ingenting om glutenkvalitet
- `kr` — observert dagligvarepris, norsk marked, juli 2026, råtner
- `absorpsjon` — ⚠ appens egen arbeidsverdi, ikke publisert måling. Unntak med
  ekte måling bak seg: enkorn og bokhvete, som sier det i notatet
- `styrke` — ⚠ skjønnskategori uten definert prøvemetode
- `maxPct` — ⚠ anslag fra bakepraksis
- `SOAKERS` vannbinding — ⚠ appens egne arbeidsverdier, kalibrerbare

### Migrering av lagret tilstand

Trinnene betyr noe annet enn før, så `last()` har fått et `grovMigrert`-flagg
som flytter lagrede valg til trinnet med nærmest samme grovhet, ikke samme
indeks. Verifisert: gammel 0/10/20/30/40 % → ny indeks 0/1/2/2/3. Uten dette
ville et lagret valg på 40 % stille blitt 60 %.

### Verifisert

Syntakssjekk ren. Alle seks grovhetstrinn tegner uten feil og uten feilbanner,
med monoton og fornuftig oppførsel: hydrering 71,4 → 79,7 %, måldose 1,89 →
1,62, glutenbærende 100 → 20 %. Grensesnittet er lest av i rendret tilstand,
ikke bare kjørt.

⚠ Forhåndsvisningen serverte bufret `app.js` gjennom hele økten, også etter
`location.reload()` og cache-busting-parameter. Alt er testet ved å hente
filene ferskt og kjøre dem i eget scope — den metoden som virker.

---

## Foreslått rekkefølge

~~1. **D1** (`middels-sterk`)~~ — rettet.
~~3b. **C1 nr. 2** (`takHyd`)~~ — rettet.
~~D6~~ — rettet. ~~B1-kildestatus~~ — lagt inn som feltdokumentasjon.

Gjenstår, i rekkefølge:

1. **D2–D5** — kode/tekst-avvikene som står igjen: salt (koden 1,7/2,4, teksten
   1,8/2,2), ciabatta (koden 72 %, teksten 78 %), sukker (6 % mot 7 %),
   bløtlegging (kommentar 3 pp, kode 5 pp). Rene, avgrensede rettinger.
2. **C1 nr. 1** — grovhetsstraffen `0,40 × grovAndel` i `maalDoseFor`. Nå det eneste
   ukildede leddet i en ellers grundig kildet formel, og den betyr mer etter at
   trappa går til 80 % grovt.
3. **C1 nr. 5** — samle `miljo <= 12` i én navngitt konstant før noen endrer den ett sted.
4. **B1** — melbibliotekets absorpsjonsverdier er nå ærlig merket som anslag, men
   fortsatt anslag. Skal de bli målinger, må de måles.
5. **D7–D11** — velg én verdi per parameter i fagstoffet, og rydd den dupliserte
   `svedjerug`-nøkkelen.

## Et mønster verdt å bevare

`TILLEGG_EFFEKT` har et `kilde`-felt ved siden av tallene. Det er det eneste stedet i
appen der en leser kan gå fra tall til referanse uten å lete. Samme grep i `FLOURS`,
`SOAKERS` og `UTSTYR` ville flyttet størstedelen av kategori B over i A — eller avslørt
hvilke tall som faktisk må måles på nytt.

---

## 31.07.2026 — Etterprøvd: friksjonstallet for Ooni Halo Pro (`spiralHjemme: 0.4`)

Bjørn ba om at varmeutviklingen ble validert. Tallet styrer vanntemperaturen i
hele appen (`FRIKSJON` i engine.js, °C deigoppvarming per minutts elting).

**Konklusjon: 0,40 °C/min ligger i nedre kant av det kildene støtter, og det
finnes ingen produsentoppgitt verdi for Halo Pro. Tallet er IKKE endret** — se
begrunnelsen nederst.

### Hva kildene sier

| kilde | oppgitt | omregnet til °C/min |
|---|---|---|
| Spiralmikser, standard brøddeig: 6–9 °F stigning over en typisk miks (~8 min) | 3,3–5,0 °C | **0,42–0,63** |
| Spiralmikser «tilfører rundt 8 °C» over en miks (~15 min) | 8 °C | **~0,53** |
| Målt eksempel, spiralmikser på fart 5: 44 → 74 °F på 28 min | 16,7 °C | **~0,60** |
| Ooni Halo Pro spesifikt | — | **ingen publisert verdi** |

Merk at det amerikanske «friction factor» (oppgitt som 35–40 °F for spiralmiksere)
**ikke er sammenlignbart**: det er et samletall i °F for hele miksen, brukt i
DDT-formelen `FF = DDT × N − (mel + rom + vann [+ forferment])`, ikke en rate per
minutt. Det tallet kan ikke settes inn i appens modell direkte, og gjør det
heller ikke.

### Vurdering

0,40 er forsvarlig for en **husholdnings**spiral: kildene over gjelder i hovedsak
bakerimaskiner, og en mindre motor på en mindre deig tilfører mindre energi per
kg. Men appen bør ikke late som tallet er målt på nettopp Halo Pro — det er et
klasseanslag, og det ligger under midten av spennet.

**Praktisk konsekvens hvis tallet er for lavt:** appen ber om for varmt vann, og
deigen lander over ønsket temperatur. Ved 13 min elting er forskjellen mellom
0,40 og 0,55 °C/min omtrent 2 °C i ferdig deigtemperatur — nok til å merkes på
hevetiden, ikke nok til å ødelegge et bak.

### Ikke endret, og hvorfor

Å flytte 0,40 → ~0,50 ville vært å bytte ett ukildet tall med et annet ukildet
tall. Appen har allerede den riktige veien ut: **«Egen (kalibrer)»**, der man
måler deigtemperaturen rett før og rett etter elting og deler stigningen på
minuttene. Det tar to avlesninger og gir Bjørns egen maskin, ikke et snitt av
andres.

**Spørsmål til Bjørn:** vil du at jeg flytter standardverdien til midten av
spennet (~0,5), eller står den på 0,40 til du har målt din egen?

Kilder:
- <https://www.restaurantsupply.com/blogs/food-service-buying-guide/spiral-mixer-dough-temperature-guide-ddt>
- <https://www.kingarthurbaking.com/blog/2018/08/27/determining-the-friction-factor-in-baking>
- <https://www.theperfectloaf.com/how-to-mix-bread-and-pizza-dough-with-a-ooni-halo-pro-spiral-mixer/>
- <https://uk.ooni.com/blogs/ooni-insights/dough-mixing-101-with-ooni-halo-pro>
- <https://www.thefreshloaf.com/node/69895/dough-temp-intensive-mixing>

---

## 31.07.2026 (natt) — Autolysens virkning, som anslag

`autolyseFaktor()` i engine.js gir autolysen to virkninger. De er ulikt godt fundert, og
det skal stå:

| virkning | størrelse | grunnlag |
|---|---|---|
| kortere eltetid | inntil **−30 %** | Calvels opprinnelige poeng, og den best beskrevne effekten: melet hydreres fullt og glutenet organiserer seg passivt. Retning OG omtrentlig størrelse er godt beskrevet i faglitteraturen. |
| bedre ovnsløft | inntil **+4 %** | Retningen er sikker (mer ekstensibel deig, bedre løft). **Størrelsen er et anslag.** Satt lavt og med hardt tak nettopp fordi den ikke er kildet. |

Begge metter etter samme kurve, `1 − e^(−min/45)`: ~63 % av effekten ved 45 min, ~86 %
ved 90 min. Metningen er valgt fordi begge mekanismene er metningsprosesser — vannet er
opptatt og enzymene har gjort sitt — og fordi det stemmer med at 1–3 timer er det
vanlige rådet. Over ~3 timer snur det, og appen advarer om det.

**Skal kalibreres mot Bjørns egne bak** hvis løftgevinsten skal justeres. Ikke gjett den
bort — den er med vilje satt så lavt at den ikke kan lyve mye.

---

## 31.07.2026 (natt) — Rettet fagfeil: kli «kutter» ikke glutentråder

Bjørn husket at den mekaniske forklaringen var motbevist. Det stemmer, og appen
gjentok den fem steder.

**Det appen sa:** «kliens skarpe kanter kutter glutentrådene fysisk».

**Hva som faktisk er vist:** Noort m.fl. (2010), *Journal of Cereal Science*,
«The effect of particle size of wheat bran fractions on bread quality — evidence
for fibre–protein interactions». Studien konkluderer at skaden skyldes
**fiber–gluten-interaksjoner**, og eksplisitt IKKE fortynning av gluten,
punktering av gassceller, eller partikler som fysisk forstyrrer nettverket.

**Det avgjørende beviset ligger i partikkelstørrelsen:** effekten blir VERRE når
klien males finere. Kuttehypotesen forutsier det motsatte — mindre og rundere
partikler skulle skåret mindre. At finere kli skader mer, passer derimot presist
med interaksjonsforklaringen: mindre partikler har større samlet overflate per
volum, altså mer kli-mot-gluten-kontakt.

Appens egen `FLOURS`-tekst inneholdt allerede observasjonen («fin kli kutter
glutenet mer enn grov») — altså det som motbeviser mekanismen den selv oppga.

Rettet fem steder i `data.js`: grovhetstrinnet på 50 %, `passer`-teksten for
siktet hvete, `notat` og `minus` for fin kli, og `obs` for knekt hvete.
Formuleringen er nå at klien **binder seg til glutenproteinene og hindrer dem i
å bygge nettverk**, og at finere kli skader mer fordi den har mer overflate.

Kilde: <https://www.sciencedirect.com/science/article/abs/pii/S0733521010000524>
