# 29.07.2026 — Parameterrevisjon og grovhet etter Brødskala'n

Innspill til `CHANGELOG.md` fra én samtale. Dekker to sammenhengende leveranser:
først en full gjennomgang av alle tall i appen, deretter ombyggingen av
grovhetsskalaen etter norsk standard.

**Forholdet til det som allerede står i CHANGELOG.md:** posten «29.07.2026
(tidligere samme dag) — Parameterrevisjon» er et sammendrag av første halvdel av
denne samtalen, men den sier at `middels-sterk`-feilen er «ikke rettet ennå».
**Det stemmer ikke lenger** — den ble rettet senere i samme samtale, se punkt 3
under. Brødskala'n-arbeidet er ikke dekket i CHANGELOG.md i det hele tatt, selv
om ringvirkningene av det er synlige der (brødtypen heter «Halvgrovt brød» i
`BROTYPER`-tabellen nettopp på grunn av dette arbeidet).

Posten «Sammenhengen: startside, kontekstpanel, navigasjon» er **ikke** fra denne
samtalen.

---

## 1 · Parameterrevisjonen

### Hva Bjørn ba om, og hvorfor

Bjørn ba om en gjennomgang av alle parametere i appen, sortert i **faglig
begrunnet** / **henger løst i luften** / **hardkodet uten tydelig referanse** —
uttrykkelig for å kunne «sjekke og validere at vi har riktige dataverdier».

Bakgrunnen er et mønster fra tidligere økter: appen hadde flere ganger presentert
ukildede tall med samme selvsikkerhet som de kildede. Speltens «maks 4 min
elting» er det tydeligste eksemplet — et gammelt notat som viste seg å være en
forveksling av utviklingstid med maks eltetid. Poenget med revisjonen var derfor
ikke å finne feil i regnestykkene, men å gjøre **opphavet** til hvert tall synlig,
slik at det går an å se hvilke verdier som tåler vekt og hvilke som ikke gjør det.

### Leveranse

Ny fil **`PARAMETERREVISJON.md`** i prosjektmappa. Strukturen er:

- **A — faglig begrunnet:** kilde eller utledning finnes, og tallet er kryssjekket
  mot noe uavhengig.
- **B — henger løst i luften:** tallet påstår empiri («målt», «publisert»), men
  ingen kilde er oppgitt noe sted. Kan være riktig; det er bare ikke etterprøvbart.
- **C — hardkodet uten referanse:** magiske tall i koden som styrer råd.
- **D — bekreftede feil:** 12 stykker, verifisert direkte i koden.

### Hovedfunnene, kort

**Kjernen i regnemotoren holder.** Måldosens basis 2,30 kommer fra 24 fullt
spesifiserte publiserte formler med median 1,83 og kvartilbredde 1,15–2,41.
`ELTING.GRAD_PER_WH` (1 Wh/kg ≈ 1,29 °C) er kryssvalidert mot Chorleywood, som
leverer målt 11 Wh/kg og gir dokumentert 14–15 °C stigning — modellen gir 14,2.
Ratkowsky-parametrene reproduserer tre uavhengige observasjoner samtidig.
`TILLEGG_EFFEKT` er den best kildede strukturen i hele appen, fordi hver tabell
har et eget `kilde`-felt med navngitte studier (Aldawsari & Simsek 2014,
Gélinas & McKinnon 2018, Verheyen et al. 2022, Chin et al. 2010, Canale et al.
2025, Mäkinen & Arendt 2012).

**Melbiblioteket er det motsatte.** `FLOURS` har 30 oppføringer med fem numeriske
felt hver, og ingen av dem hadde kildeangivelse. Det gjelder også `absorpsjon`,
som driver anbefalt hydrering direkte. Samme for `SOAKERS`, der vannbindingen går
rett inn i vannregnskapet, og for `UTSTYR`, som oppgir effusivitetsformelen
`e = √(k·ρ·c)` men ikke materialverdiene den bygger på — så tallene kan ikke
etterprøves. `TIDSPLANER.ovnslos` (100/96/90/82/70) er rene indeksverdier uten
måling eller utledning bak seg.

**Rundt 25 formuleringer i fagstoffet sier eksplisitt «målt» uten å si av hvem.**
Blant dem speltens 9,5 mot 17,5 min farinografstabilitet — altså nettopp tallet
som erstattet den gamle feilen, og som derfor fortjener en kilde mer enn noe annet.

### Metode, og en advarsel om den

Jeg leste `engine.js` selv og delegerte to Explore-agenter i parallell: én på
resten av `data.js`, én på `app.js`. **Agentenes linjenumre var systematisk feil.**
Innholdet de rapporterte stemte, men henvisningene traff ikke. Alt ble derfor
verifisert på nytt med innholdssøk før det ble skrevet ned. Ikke stol på
linjenumre fra en delegert lesing uten å slå opp.

**Linjenumrene i `PARAMETERREVISJON.md` er fra før endringene i del 2** og har
flyttet seg. Søk på innhold, ikke på linje.

---

## 2 · Grovhet etter Brødskala'n

### Hvordan problemet ga seg til kjenne

Bjørn skrev at han var «svært usikker» på grovhetsskalaene og ba om at norsk
standard skulle gjelde. Han hadde rett i å tvile, og feilen var større enn en
merkelapp.

Den gamle trappa var fem trinn: 0 / 10 / 20 / 30 / 40 % med navnene Loff, Loff+,
**Halvgrov**, **Grov** og **Kraftig**. Målt mot **Brødskala'n** er 20 % og 30 %
begge *fint* eller *halvgrovt* brød, og 40 % er fortsatt halvgrovt. Appen nådde
altså **aldri** kategorien «grovt», men brukte ordet på et brød som i butikken
ville stått merket med én kakestykkebit.

### Standarden, slik den faktisk er

**Brødskala'n** eies av Baker- og Konditorbransjens Landsforening (BKLF),
utarbeidet 2006 av NHO Mat og Drikke og BKLF, sist revidert 2017.
Kilde: <https://brodogkorn.no/fakta/brodskalaen/>

| Kategori | Andel |
|---|---|
| Fint brød | 0–25,9 % |
| Halvgrovt brød | 26–50,9 % |
| Grovt brød | 51–75,9 % |
| Ekstra grovt brød | 76–100 % |

Regnestykket har tre trekk som er lette å ta feil av, og appen tok feil av alle tre:

1. **Nevneren er melmengden** — ikke deigen og ikke tørrstoffet.
2. **Frø og nøtter teller ikke.** Verken i teller eller nevner.
3. **Gryn og kli av korn teller fullt.**

**Nøkkelhullet** er en egen ordning med et strengere krav: minst 30 % fullkorn,
regnet av tørrstoffet i produktets korndel (Veileder til nøkkelhullsforskriften,
Mattilsynet, revidert 2021). Jeg fant ikke etterprøvbare tall for ordningens krav
til fiber, salt, sukker og fett, og **lot dem derfor være** framfor å gjengi tall
jeg ikke kunne belegge. Bare 30 %-grensen er brukt i appen.

### Den egentlige feilen: frø ble talt som grovhet

`beregnOppskrift()` i `engine.js` regnet
`grovTotal = (grovAndel × melTotal + froGramTotal) / (melTotal + froGramTotal)`
og grensesnittet kalte tallet **«Grovhet totalt»**. Frøene lå altså i både teller
og nevner, i strid med standarden.

Konsekvensen, målt på et Loff+ med 10 % grovt mel:

| Tillegg | Appen viste før | Riktig etter standarden |
|---|---|---|
| 300 g solsikke | 36,2 % «grovhet» | **10,0 %** — fint brød |
| 600 g blandede frø | 63,4 % | **10,0 %** — fint brød |
| 300 g havregryn | 43,3 % | 43,3 % — halvgrovt (korn teller) |
| 200 g hvetekli | 27,7 % | 27,7 % — halvgrovt (kli teller) |
| 300 g solsikke + 200 g ruggryn | 58,1 % | **38,3 %** — halvgrovt |

Et brød med mye solsikke så altså ut som et halvgrovt brød i appen, mens det
etter norsk merking er fint brød. Dette er ikke en avrundingssak — det er to
forskjellige størrelser som var slått sammen.

### Hva som ble bygget

**`js/engine.js`**
- `BRODSKALAN` — tabell med de fire kategoriene og grensene.
- `brodskalanKlasse(pct)` — slår opp kategori.
- `brodskalan(grovMelGram, melTotal, kornTillegg)` — returnerer
  `{pct, klasse, kort, biter, nokkelhull}`.
- `beregnOppskrift()` regner nå `kornTillegg` (sum gram av tillegg med `korn:true`)
  og returnerer `brodskala` og `fortynnetAndel`.
- Lagt inn `'middels-sterk'` i `styrkeRang` og `styrkeJust`.

**`js/data.js`**
- `SOAKERS` har fått feltet **`korn`**. `true` for havregryn, ruggryn, knekt hvete,
  hvetekli og byggflak; `false` for solsikke, linfrø (hel og malt), sesam,
  gresskar og chia. Feltet er ikke kosmetisk — det er skillet standarden gjør.
- `GROVHET` bygget om til seks trinn, hvert med feltet **`klasse`**:

| Trinn | Grovt | Klasse | Melblanding |
|---|---|---|---|
| Loff | 0 % | Fint brød | regal 100 |
| Loff+ | 10 % | Fint brød | regal 90 / sammalt hvete 10 |
| Fin, øvre kant | 25 % | Fint brød | regal 75 / sammalt hvete 19 / sammalt rug 6 |
| Halvgrov | 40 % | Halvgrovt brød | regal 60 / sammalt hvete 30 / sammalt rug 10 |
| Grov | 60 % | Grovt brød | regal 40 / fullkorn_fibra 25 / sammalt hvete 25 / sammalt rug 10 |
| Ekstra grov | 80 % | Ekstra grovt brød | regal 20 / fullkorn_fibra 45 / sammalt hvete 25 / sammalt rug 10 |

- `BROTYPER`: brødtypen `grovbrod` heter nå **«Halvgrovt brød»** (var «Grovt brød»),
  starter på trinn 3 i stedet for trinn 2, og undertittelen sier 0–80 % i stedet
  for 10–40 %.

**`js/app.js`**
- Grovhetskortene viser `klasse` under navnet.
- Nøkkeltallene viser «Brødskala'n», «Merkes som» og «Strukturfortynning» der det
  før stod «Grovhet totalt».
- Forklaringsteksten i Oppskrift gikk fra tre til fire tall, med Nøkkelhullet-status.
- Migrering av lagret tilstand, se punkt 3.

**`index.html`** — undertittelen på «1 · Hvor grovt?» forklarer kategoriene.

### Hvorfor `fullkorn_fibra` bærer de grove trinnene

`samalt_hvete` har `maxPct: 60`, så den kan ikke bære et brød på 80 % grovt alene.
`fullkorn_fibra` («Fullkornshvete ekstra finmalt») har `maxPct: 100` og beskrives
i appens eget notat som «den snilleste norske fullkornshveten, malt av ekstra
bakekraftige sorter». Den er derfor hovedmel på 60- og 80-trinnet, med sammalt
hvete og rug som smakskomponenter.

---

## 3 · Feil som ble funnet og rettet

### `middels-sterk` fantes ikke i tre av fire oppslagstabeller ⚠

Tre meltyper har `styrke: 'middels-sterk'` — `regal_standard`, `caputo_blaa` og
`mollerens_tipo00`. Verdien var kjent i **én** tabell (`rang` i `forfermentMel()`
i `app.js`, der den stod som 4,5) og manglet i tre: `styrkeRang` og `styrkeJust`
i `engine.js`, og `rang` i hydreringsadvarselen i `app.js`.

**Konsekvens:** Regal Hvetemel standard — appens eget anbefalte hverdagsmel og
basen i hele grovhetstrappa — falt til reserveverdien `?? 3`, altså **lavere enn
`'middels'` = 4**. Appen rangerte sitt sterkeste dagligvaremel som svakere enn
det den selv kaller svakere. En ren Regal-deig på 78 % hydrering fikk rød
advarsel om at melet var for svakt, og hevemålet ble regnet som om melet var
middels.

Rettet ved å legge inn 4,5 i begge rang-tabellene og 1,00 i `styrkeJust`.
Verifisert: `svakesteStyrke` for en ren Regal-deig returnerer nå `middels-sterk`.

### `takHyd` utga seg for å være melavhengig

Grensesnittet skrev «Praktisk tak **for denne melblandingen** er rundt X %», men
`takHyd` var `B.lukket ? 80 : 76` — en konstant som bare flyttet seg når du byttet
stekeutstyr. Det var villedende allerede, og ble blokkerende med den nye trappa:
et ekstra grovt brød lander på **79,7 %** hydrering fordi absorpsjonsfaktoren er
1,138, og ville fått rød advarsel mot et tak på 76.

Nå `(B.lukket ? 80 : 76) × B.r.absFaktor`, altså den samme størrelsen appen
allerede bruker til å regne anbefalt hydrering. Basistallene 76/80 er fortsatt et
anslag, og kommentaren i koden sier det nå.

### Solsikkeanbefalingen var ikke oppdatert overalt

`TILLEGG.solsikke.pct` ble justert 12 → 6 % etter research i en tidligere økt, men
en tekstlinje i `app.js` anbefalte fortsatt «12 % ristede solsikkekjerner» som det
klassiske svaret på «litt sunnere loff». Appens egen tekst sier samtidig at
ristede frø gir omtrent dobbelt så mye smak per gram — altså at 6 % ristede
tilsvarer 12 % **uristede**. Linjen anbefalte dermed det dobbelte av gjeldende
anbefaling. Rettet, med begrunnelsen skrevet inn.

### Selvmotsigende formulering i tilleggsnotatet

Første versjon av den nye notisen sa «Men grovheten endrer seg ikke av det» og
skrev deretter ut 45,4 % mot melets 40 % når det lå korngryn i deigen. Den er nå
delt i to grener på `kornTillegg > 0`, så teksten stemmer i begge tilfeller.
**Lærdom:** en påstand om at noe ikke endrer seg må sjekkes mot den grenen der
det faktisk endrer seg.

### Migrering av lagret tilstand

Trinnene betyr noe annet enn før, så et lagret valg på indeks 4 ville stille gått
fra 40 % til 60 % grovt — et helt annet brød enn det som stod der da appen sist ble
lukket. `last()` har fått flagget `grovMigrert`, som flytter til trinnet med
**nærmest samme grovhet**, ikke samme indeks. Verifisert mapping:

| Gammel indeks | Gammel % | Ny indeks | Nytt trinn |
|---|---|---|---|
| 0 | 0 | 0 | Loff |
| 1 | 10 | 1 | Loff+ |
| 2 | 20 | 2 | Fin, øvre kant (25 %) |
| 3 | 30 | 2 | Fin, øvre kant (25 %) |
| 4 | 40 | 3 | Halvgrov (40 %) |

---

## 4 · Beslutninger, og hva som bevisst ble valgt bort

**Melverdiene ble ikke endret — bare opphavet ble dokumentert.** Bjørn sa at
meltypene er hentet fra norske kilder og kan stå «dersom de er korrekte», og det
er nettopp det jeg ikke kan avgjøre for 30 absorpsjonsverdier. Alternativet —
å skrive på en kilde per meltype — ville betydd å finne på kilder. `FLOURS` har
derfor fått en **kildestatus-blokk per felt** i headeren i stedet: `protein` er
deklarasjon og etterprøvbar i butikk, `kr` er observert dagligvarepris juli 2026
som råtner, mens `absorpsjon`, `styrke` og `maxPct` er merket som appens egne
anslag. To unntak har ekte måling bak seg og sier det i notatet: enkorn
(−6 prosentpoeng mot brødhvete) og bokhvete (farinografopptak 54,8 → 52,6 %).
`SOAKERS` har tilsvarende blokk. **Regelen som ble valgt: heller merke et tall
som anslag enn å gi det en kilde det ikke har.**

**`grovbrod` peker på trinn 3 (40 %, halvgrovt), ikke trinn 4 (60 %, faktisk
grovt).** Jeg vurderte å beholde navnet «Grovt brød» og la det lande på 60 %, som
ville vært den mest bokstavtro løsningen. Valgt bort fordi det ville flyttet
Bjørns standardbrød fra 20 til 60 % grovt i ett hopp, og ovnsløft er hans
førsteprioritet. Løsningen ble å gjøre **navnet** ærlig i stedet for å gjøre
**brødet** grovere: typen heter «Halvgrovt brød» og starter på 40 %, mens dialen
nå faktisk rekker opp til ekstra grovt for den som vil dit.

**`basisHyd` står på 70 for alle seks trinn.** Hydreringen stiger av seg selv med
grovheten fordi `absFaktor` går fra 1,02 til 1,138. Det følger appens etablerte
prinsipp om at hydreringen regnes ut fra melblandingens absorpsjon og ikke gjettes
per trinn — å skrive inn seks håndsatte hydreringer ville vært en ny kilde til
uenighet med regnemotoren.

**Det gamle tallet ble beholdt som `fortynnetAndel`, ikke slettet.** Hvor stor
del av tørrstoffet som ikke bygger gluten er en ekte og nyttig størrelse — den
forklarer hvorfor et frørikt brød oppleves tett. Feilen var å kalle den grovhet.
`grovTotal` står igjen som utgått alias med kommentar. **Merk:** jeg beholdt det
defensivt av hensyn til gammel lagret tilstand og bakelogg, men **jeg bekreftet
ikke at noe faktisk leser det** — innholdssøk viser at `app.js` ikke lenger gjør
det. Den som rydder senere bør sjekke bakeloggen før feltet fjernes.

**To rettinger ble gjort utenfor det Bjørn strengt tatt ba om**, og det bør være
et bevisst valg og ikke en vane: `middels-sterk` fordi den ga aktivt feil råd på
et standardbrød, og `takHyd` fordi den ville gitt falske røde advarsler på de nye
trinnene. Alt annet fra restlista ble liggende.

---

## 5 · Åpne punkter

Ting Bjørn ikke har tatt stilling til, eller som ble funnet og ikke rettet.
Full liste ligger i restlista nederst i `PARAMETERREVISJON.md`.

**Tilbudt, ikke besvart:** jeg tilbød å ta kode/tekst-avvikene og
grovhetsstraffen; Bjørn gikk videre til dokumentasjonen i stedet.

1. **`0,40 × grovAndel` i `maalDoseFor()`** er nå det eneste ukildede leddet i en
   ellers grundig kildet formel — og det betyr mer enn før, siden trappa går til
   80 % grovt. Måldosen faller fra 1,89 til 1,62 over de seks trinnene utelukkende
   på grunn av dette leddet.
2. **Fire steder der kode og tekst er uenige:** salt (koden sjekker 1,7 og 2,4,
   teksten sier 1,8 og 2,2), ciabatta (koden 72 %, teksten 78 %), sukker
   («konstant opp til 6 %» mot «topper rundt 7 %») og bløtlegging (kommentaren
   3 prosentpoeng, koden 5). Saltgrensene er verst: ingen advarsel på 1,75 %
   selv om appen tre andre steder sier 1,8 % er gulvet.
3. **`miljo <= 12`** — skillet mellom kald og romtemperert heving — står hardkodet
   åtte steder uten å være en navngitt konstant.
4. **`svedjerug` er duplisert i `MEL_INFO`** med identisk innhold. Harmløst i dag,
   men det er sånn to versjoner av samme tall oppstår.
5. **Malt-kurven har to uforenlige nullpunkter:** tabellen går fra basis 300 s
   (0,4 % → 205 s), teksten sier 327 → 194 s ved 0,5 %.
6. **Effusivitetstallene stemmer ikke med sin egen tekst:** `UTSTYR` gir forholdet
   7,9× mellom stål og åpen plate, fagteksten sier 6,3×.
7. **Utstyrsbudsjettet summerer ikke:** postene gir 1700–3950 kr, konklusjonen
   sier 1200–2000 kr.
8. **Elleve interne motsigelser i fagstoffet** der samme parameter har ulik verdi
   ulike steder (autolysetid, bassinage, maltdose, andel gjæring i bulk,
   maks deigtemperatur, falltallsvindu m.fl.).
9. **`FLOURS.absorpsjon` er nå ærlig merket som anslag, men fortsatt anslag.**
   Skal de bli målinger, må de måles.
10. **Rug-taket:** `samalt_rug.maxPct` står på 40, mens appens eget notat sier
    taket er 25 % i ren gjærdeig og 40 % først med 1–2 % eddik. Uendret av meg.

Åpne punkter fra tidligere økter (melvalg, ⓘ på grovhetskortene, dose–respons for
melvalg) er ikke berørt av dette arbeidet.

---

## 6 · Feller

**Forhåndsvisningen bufret `app.js` gjennom hele økten.** Dette er kjent fra før,
men to detaljer er nye og verdt å notere:

- **Bufringen var delvis.** `data.js` og `engine.js` ble servert ferskt mens
  `app.js` fortsatt var gammel. Symptomet var forvirrende: `brodskalan` fantes og
  `GROVHET` hadde seks trinn, men `grovMigrert` manglet i `S`. Sjekk derfor
  ferskhet med noe fra **hver** fil, ikke bare én.
- Verken `location.reload()` eller navigasjon til `index.html?v=<tall>` hjalp.
  Et forsøk på å teste migreringen ved å skrive gammel tilstand til localStorage
  og laste på nytt ga et meningsløst resultat (`byggGrovhet` kom tilbake som 5 der
  jeg hadde skrevet 4), rett og slett fordi siden aldri ble lastet på nytt.
  Migreringen ble derfor testet mot ferskt hentet kildekode i eget scope i stedet.

**Skjermbilde var ikke tilgjengelig i denne økten.** `computer/screenshot` feilet
med «the Browser pane is not displayed, so the page is not compositing frames».
Jeg verifiserte i stedet ved å lese ut `innerText` fra de rendrede elementene —
grovhetskortene, nøkkeltallene og notisene — så innholdet er kontrollert.
**Men prosjektets egen regel om å ta skjermbilde er ikke oppfylt.** Layouten på de
to nye nøkkeltallene («Brødskala'n» og «Merkes som», som gjør at kortraden i Bygg
brød har fått to felter mer) er ikke sett med øynene. Det bør gjøres.

**Linjenumre fra delegerte agenter var systematisk feil.** Innholdet stemte,
henvisningene ikke. Verifiser alltid med innholdssøk før du skriver ned en
linjereferanse.

**Grep-verktøyets visning kan få gyldig kode til å se ødelagt ut.** I utdrag så
`m.pct / pctSum` ut som `m.pct \ pctSum`, og `</b>` som `<\b>`. Det er
visningsescaping, ikke syntaksfeil i fila — syntakssjekk med `new Function(src)`
bekreftet at koden var ren. Ikke «rett» dette.

---

## Verifisert

- Syntakssjekk ren på alle tre JS-filene.
- Alle seks grovhetstrinn: melprosentene summerer til 100, og beregnet klasse
  stemmer med den påstemplede i alle seks.
- Frøtesten kjørt eksplisitt, se tabellen i punkt 2.
- Regresjon: 6 grovheter × 5 tidsplaner + alle 5 forvalg + alle 11 faner tegnet
  uten kastede feil og uten innhold i `#feilbanner`.
- Monoton og fornuftig oppførsel over trappa: hydrering 71,4 → 79,7 %, måldose
  1,89 → 1,62, glutenbærende andel 100 → 20 %, `absFaktor` 1,02 → 1,138.
- Migreringsmappingen verifisert for alle fem gamle indekser.

## Følgefiler oppdatert

`PARAMETERREVISJON.md` (ny «RETTET»-seksjon og oppdatert restliste),
`STATUS.md` og minnefila. Ved den siste gjennomgangen viste det seg at `STATUS.md`
ikke nevnte noe av dette arbeidet og fortsatt oppga «125 kombinasjoner av grovhet
× tid × utstyr» — et tall som forutsetter fem grovheter. Tre tilsvarende
utdaterte tall ble rettet i minnefila.
