# 28.07.2026 — Første bygg: appen, gjæringsmodellen og forankringen

*Innspill til CHANGELOG.md fra samtalen som bygget appen fra ingenting.
Samtalen startet 28.07.2026 og løp inn i 29.07 — jeg er usikker på hvor døgnskillet
går for de siste endringene, så enkelte punkter nederst kan tilhøre 29.07.*

Denne posten dekker **det opprinnelige bygget** og **hvorfor regnemodellen ser ut som
den gjør**. Changeloggens eksisterende poster for 28.–29.07 beskriver feilrettinger og
utvidelser gjort i senere samtaler *oppå* dette; flere av feilene de retter er feil jeg
la inn her. Jeg gjentar ikke dem, men supplerer med begrunnelsene som ellers ikke finnes
noe sted.

---

## 1 · Utgangspunktet

Bjørn hadde to filer i mappa: `Brød_Ciabatta_Foccatia.pdf` (fire sider prosessnotater fra
mange års prøving og feiling) og `Brødoppskriftberegning.xlsx` (åtte ark — bakerprosent
med hev/poolish-støtte, melpriser, en tidsberegner). Oppgaven var å bygge en app rundt
kunnskapen, med **best mulig proofing og best mulig ovnsløft** som mål.

Regnearket ble lest ut med PowerShell mot XML-en i xlsx-en, siden verken Node eller Python
finnes på maskinen. Det er også grunnen til **arkitekturvalget: ren HTML/CSS/JS uten
byggesteg**, åpnet direkte fra `file://`. Ingen npm, ingen moduler (ES-moduler feiler på
CORS fra `file://`), bare tre `<script src>` med globale navn.

Seks researchagenter ble kjørt: fermenteringskinetikk, surdeigsteknikk-overføring,
stekefasen, norsk mel og hydrering, og to som gikk dypere på salt og tilsetninger.
Senere kom to til: én på flytetesten, én som samlet publiserte formler.

---

## 2 · Hvorfor gjæringsdose i det hele tatt

Bjørns ønske var «mest nøyaktig og sammenlignbart resultat hver gang». Problemet med å
styre på **timer** er at en time ikke er en fast mengde gjæring — den avhenger av
gjærmengde og temperatur. Notatene hans sier det selv: «styre på temp, vel så mye som på tid».

Løsningen ble et skalartall, **gjæringsdose (GD)**:

```
dose = ∫ gjærmengde(t) × rate(temp(t)) dt      [%-tørrgjær-timer ved 24 °C]
```

Det er `planDose()` i `engine.js`, som integrerer `stageDose()` over trinnene.
Poenget er at *ulike klokker kan sammenlignes*: appen kan svare på «kjøkkenet er 26 °C i
dag» eller «jeg må bake klokka 17 i stedet for 09» med et tall i stedet for et skuldertrekk.

`gjaerForDose()`, `tidsfaktorForDose()` og `timerForTrinn()` løser baklengs — henholdsvis
gjærmengde, en felles tidsskalering, og lengden på ett enkelt trinn.

**Verifisert seinere i samtalen:** arealet under fart-kurven er lik dosen innenfor
**0,05–0,16 %** (trapesintegrasjon mot motorens egen verdi, fire ulike planer). «Dosen er
et areal» er altså ikke en pedagogisk forenkling — det er identisk.

---

## 3 · De fire modellvalgene, og hva som ble valgt bort

### Temperaturrespons: Ratkowsky, ikke fast Q₁₀

`rateFactor(T)` bruker en utvidet Ratkowsky kvadratrotmodell med `T_MIN 0`, `T_MAX 44`,
`C_HIGH 0,28`, `T_REF 24`.

**Valgt bort:** den vanlige «raten dobles per 8–10 °C». Grunnen er at en fast Q₁₀ ikke kan
gjengi tre observasjoner samtidig: at raten dobles per ~8–10 °C *rundt romtemperatur*, at
kjøleskapet er størrelsesorden 40× saktere, og at optimum ligger på 35,5 °C med bare
1,82× av 24-gradersraten. En fast dobling på 8 °C ville gjort 4 °C bare 4× saktere, som er
åpenbart galt mot praksis.

Modellen gir `R(3,5 °C) = 0,021` — **47× saktere** — og `R(35,5) = 1,82×`.
Den praktiske konsekvensen, som står i appen: *du kan bremse gjæringen 47 ganger ned,
men bare skynde den 1,8 ganger opp. Varme er en dårlig snarvei; kulde er en kraftig brems.*

### Gjærvekst: logistisk

`yeastAt()` med `MU_REF 0,18/t` ved 24 °C og tak `Y_MAX 2,5 %`.

Uten dette leddet stemmer ikke «halver gjæren, doble tiden» — og det er nettopp det som
gjør Gisslens eltetabell forståelig (se punkt 8). Over en 4,5-timers bulk gir formeringen
**+63 % gratis dose**; over 25 minutter **+1 %**.

**Usikkerhet:** `MU_REF` og `Y_MAX` er researchagentens tilpassede verdier, ikke målte.
De er plausible og gjør modellen konsistent, men de er ikke belagt med en publisert måling.

### Termisk etterslep: per emne, ikke per batch

`tauHours()` med `TAU_1KG 3,0` og τ = 3,0 × (kg)^⅓, ganget med 1,25 for tett lokkboks
og 1,35 for stappfullt kjøleskap.

Dette viste seg å være **den viktigste enkeltmekanismen i hele modellen**, og den er
usynlig i vanlige oppskrifter. En deig bruker timer på å bli kald, og gjærer nesten i
romtemperatur mesteparten av den tiden.

Målt i modellen, for en 14 timers kaldheving av utbakte 800 g-emner ved 3,5 °C:

| Tid på kjøl | Deigtemperatur | Andel av kaldhevingens gjæring |
|---|---|---|
| 1 t | 17,8 °C | **34 %** |
| 3 t | 10,5 °C | 68 % |
| 6 t | 5,9 °C | 85 % |
| 14 t | 3,6 °C | 100 % |

*(Tallene flytter seg noe med gjærmengde og plan — panelet regner dem live. Med en annen
måldose viste samme panel 41 % etter én time.)*

Konsekvensen som gikk rett inn i anbefalingene: **det er ikke lengden på kaldhevingen som
styrer gjæringen, det er hvor fort emnene blir kalde.** Derfor skal deigen bakes ut *før*
kjøleskapet, ikke etter — det halverer tidskonstanten.

### Deigtemperatur: varmebalanse, ikke 3-faktorformelen

`vanntemperatur()` bruker ekte varmekapasiteter (`CP.mel 1,81`, `CP.vann 4,181`,
`CP.forferment100 2,99`).

**Valgt bort:** den klassiske «vann = 3 × ønsket − mel − rom − friksjonsfaktor».
Den er eksakt bare når mel- og romtemperatur er like *og* lik (ønsket − friksjon).
Med mel rett fra kjøleskapet bommer den med rundt 4 °C. Appen viser avviket eksplisitt
når det er stort nok, med den klassiske formelens svar til sammenligning — det var et
bevisst valg fordi Bjørn kjenner den formelen og ville lurt på hvorfor tallene spriker.

---

## 4 · Feil funnet og rettet i denne samtalen

Alle med tall fra kjørende kode.

1. **Totalvekten dobbeltalte vannet frøene binder.** `beregnOppskrift()` la `froAbsorbert`
   inn både i `vannTotal` og i vektligningen. Standardbrødet kom ut på **3 616 g mot
   målet 3 600**, og med frøvann-på-toppen slått på **4 051 g mot 3 600** — 435 g bom.
   Rettet med `froEkstraVann`, og `totalVekt` teller nå bare tørrvekten av frøene.
   Etter: eksakt 3 600 g.

2. **`perMel` manglet gjærmengden**, så alle forvalg lå ~21 g over målvekt (0,6 %).
   Etter: eksakt for alle seks.

3. **Tidslinjen sorterte feil.** «Start forvarming av ovn» ble lagt inn i rekkefølgen den
   ble beregnet, ikke etter klokkeslett, så den havnet *før* utbakingen selv om den skjer
   15 minutter senere. Rettet med en `trinn.sort()` på tid til slutt.

4. **`maalHeveProsent()` straffet grovt mel multiplikativt to ganger.** Enkornbrødet fikk
   hevemål **28 %**, som er urimelig lavt. `grovJust` gikk fra 0,9 til 0,7 per andel og
   den svakeste styrkeklassen fra 0,72 til 0,78. Etter: **33 %**.

5. **Målekrukke-tallet var meningsløst.** Jeg viste «start 79 ml → 100 ml», utledet av
   melvekt × 1,5 delt på 40. Den formelen gjelder *hele* deigen, ikke en 40 g prøve.
   Erstattet med deigvolumet i boksen og en forklaring på at rettvegget glass gjør
   høydeprosent lik volumprosent.

6. **Termisk etterslep brukte hele batchmassen.** Bjørn baker ut før kjøleskapet, og da er
   det 800–900 g per emne som skal kjøles, ikke 3,6 kg samlet. τ falt fra **5,7 t til
   2,9 t**, og bulkens andel av gjæringen steg fra **31 % til 45 %**. `planDose()` tar nå
   `opt.antall` og deler massen på trinn merket `utbakt`.

7. **«Stappfullt kjøleskap» så død ut — halvt riktig.** Bjørn meldte at avkryssingen ikke
   gjorde noe. Den *virket* i «Gjæring & tid» (τ 2,90 → 3,91 t, dose +15,3 %), men
   `byggOppskrift()` sendte aldri `S.fulltKjol` og `S.lokk` videre. Rettet.

8. **«Lokk» har null effekt når kjøletrinnet er utbakt** — 0,0 %, målt. Det er korrekt
   oppførsel (emner i hevekurv står ikke i lokkboks), men så ut som en feil. Feltet
   nedtones og forklares nå når det ikke gjelder, i stedet for å se ødelagt ut.

9. **Grafen løy om sin egen påstand.** `tegnTempChart()` fordelte hvert trinns dose *jevnt*
   utover trinnet, så den akkumulerte kurven ble en rett strek — mens legenden påsto at
   kaldhevingen er «bratt i starten og flater ut». Rettet ved å legge `planProfil()` i
   `engine.js`, som returnerer den ekte øyeblikksfarten `y(t) × R(T(t))`.

10. **Måldosen var forankret feil** — se punkt 6 under.

---

## 5 · Korreksjoner mot Bjørns notater

Notatene er hans egne observasjoner over år, og de fleste holdt. Disse gjorde det ikke:

- **Poolish-gjæren.** Notatet sier «20 % poolish + 0,5 % gjær, 12–18 timer ved 23 °C, maks
  26 timer». 0,5 % er en **3–4 timers** poolish, ikke en 12–18 timers. Tre uavhengige
  profesjonelle linjer (Calvel/Rosada via SFBI, den klassiske franske bakertabellen,
  Weekend Bakery) konvergerer mot ~0,08 % tørrgjær / 0,25 % fersk ved 14 t og 23 °C —
  **rundt 6 ganger mindre**. «Maks 26 timer» er også for sjenerøst; brukbart vindu er
  12–17 t med hardt tak rundt 19.
  `forfermentGjaerPct()` implementerer dette som `7,7/t^1,33`, temperaturjustert, ganget
  med `stivhetsMultiplikator()` (1,0 ved 70 % hydrering → 2,5 ved 50 %). Modellen gir
  **0,77 % fersk** for en 18 timers biga ved 18 °C og 45 % vann, som lander på Giorillis
  publiserte ~0,8–1 %. At samme formel treffer både poolish- og biga-enden er den beste
  valideringen den har.

- **Dampkaret.** «Kast en liten kopp vann i en plate under» — mengden er riktig, karet er
  feil. Å fordampe 120 g kaldt vann krever 321 kJ; en tynn stekeplate rommer ~50 kJ
  brukbar varme. Vannet flasher ikke, det putrer av gårde over 10–20 minutter, som gir
  svak damp i de eneste 2 minuttene som betyr noe og en lang damphale gjennom minutt 5–20
  — akkurat regimet som undertrykker bruning. Anbefaling: kokende vann i forvarmet støpejern.

- **Dørspalten etter 5 minutter.** Ikke støttet. Mekanismen er ekte (damp fjerner 25–31 %
  av varmestrømmen etter kondensasjonsfasen), men ved 5 minutter er ovnsløftet ikke ferdig
  — vinduet er 15–20 min for et 900 g brød — og 20 sekunder åpen dør koster 2–5 minutter
  steketid. Trekk dampen ut ved 15–20 min i stedet.

- **«350 °C målt med laser på stekebrettet».** Nesten sikkert refleksjonsartefakt. Et blankt
  stålbrett er nær et speil i infrarødt, og i en ovn ved likevekt leser et IR-termometer
  *cavitetens* temperatur uansett hva objektet holder. Diagnose: mål én gang mens elementene
  gløder og én i av-syklus.

- **«1 grad per minutt kjøring».** Stemmer for kommersiell spiral. Publiserte verdier:
  hånd 0,15, hjemmespiral 0,4, planetmaskin 0,6, kommersiell spiral 1,0 °C/min.

- **Flytetesten** (spurt om seinere i samtalen, ikke fra notatene). Forkastet, se punkt 7.

---

## 6 · Måldosen: fra Bjørns notater til publiserte formler

Dette er den viktigste beslutningen i samtalen, og den ble tatt **etter at Bjørn eksplisitt
ba om det**: «du skal ikke bruke notatene mine som fasit, det er bare notater. Sikre deg
heller i dokumentert teori og tester som ligger på nett.»

**Før:** `maalDoseFor()` var kalibrert mot hans to dokumenterte prosesser
(1 % fersk over natta → dose 2,99 ved hans kjøleskapstemperatur; 2 % fersk samme dag → 3,72),
med basisverdi **3,6**.

**Etter:** en agent hentet 24 fullt spesifiserte publiserte formler (Hamelman, King Arthur
Pro, ChainBaker, Forkish, Weekend Bakery, brotdoc, BBGA). Alle ble regnet gjennom modellen:

| Brødtype | n | Snittdose |
|---|---|---|
| Baguetter | 8 | 1,95 |
| Magre brød | 8 | 1,95 |
| Ciabatta | 7 | 1,99 |
| **Alle** | **24** | **median 1,83**, kvartilbredde 1,15–2,41 |

At tre helt ulike brødtyper konvergerer på ~1,95 er langt sterkere validering enn to
oppskrifter fra samme kjøkken. Formelen ble
`(2,30 − 0,40 × grovAndel) × (1 − 0,6 × pff)`.

**Gjærmengden falt fra 0,292 % til 0,183 % tørrgjær** for optimalplanen — omtrent halvparten.
De nye tallene ligger midt blant de publiserte: Hamelmans poolish-baguette 0,36 %,
Forkish Harvest 0,34 %, ChainBaker poolish-baguetter 0,39 %, appens én-dagsplan 0,32 %.

**Uavhengig bekreftelse av pff-leddet:** formler *med* forferment har snittdose 1,63,
*uten* 2,30 (etter at én uteligger på 6,22 er tatt ut — King Arthurs Slow Rise Baguette,
som retarderer ved 10 °C og ikke 4). Forholdet 0,71 stemmer med leddets 0,76 ved 30 % pff.

**Viktig forbehold som står i koden og i appen:** kvartilbredden er nesten 2×. Profesjonell
praksis spenner vidt, så dosen er et **planleggingstall med rundt ±35 % toleranse**, ikke
en fasit. Målekrukka avgjør.

**Usikkerhet jeg ikke fikk lukket:** `0,40`-leddet for grovhet er min vurdering, ikke hentet
fra data. Datasettet er nesten utelukkende lyst mel, så det er ikke belegg for hvordan dosen
skal falle med grovhet. `0,6`-leddet for pff har derimot støtte i tallene over.

---

## 7 · Flytetesten — undersøkt og forkastet

Bjørn hadde sett at «folk legger en liten del av deigen i et glass vann; når den flyter, er
deigen perfekt» og spurte om det stemmer, fordi «det gjør prosessen mye enklere».

Forkastet, av tre grunner:

1. **Fysikken.** Avgasset deig har tetthet 1,20–1,23 g/cm³. Siden massen er konstant er
   volumøkningen som trengs for å komme under 1,0 lik (tetthet − 1) × 100, altså +20 til
   +23 %. Regner man med luften som eltes inn (målt 5–13 %) faller terskelen til +11–17 %.
   Fornuftige sluttmål for bulk er 30–75 %. **Flytepunktet ligger tidlig i bulken.**
   Hydrering flytter terskelen bare ~6 prosentpoeng fra 60 til 100 %, så «testen feiler
   fordi deigen er våt» holder ikke.
2. **Det eneste kontrollerte forsøket.** King Arthur testet direkte på *gjærdeig*: deig
   som hadde hevet 30 minutter av en bulk på 60–90 minutter fløt allerede.
3. **Den er en terskel, ikke en måler.** Overhevet deig fortsetter å flyte. Og testen måler
   ikke deigens gassinnhold — den måler gassen som overlever at du klyper av og triller en
   bit, som er helt ustandardisert. To dokumenterte tilfeller på The Fresh Loaf der bakere
   overhevet deigen mens de ventet på en flyting som aldri kom.

**Alternativet er enklere, ikke vanskeligere**, og det er poenget: rettvegget boks med en
strikk der deigen starter og en på målhøyden. Ingen prøve, ingen vask, intet svinn, ingen
håndtering som skader deigen.

*Attribusjonsnotat:* «Debra Wink motbeviste flytetesten» sirkulerer bredt, men agenten fant
ingen tekst av henne som kritiserer den. Det som er hennes er mikrobiologien bak den mest
dramatiske falske positiven. Ikke gjenta attribusjonen.

---

## 8 · Gisslens eltetabell — hvorfor den forklarer modellen

Bjørn ba om en dypere forklaring av sitatet «en fransk brøddeig med kort elting kan trenge
0,2 % gjær, mens samme formel med intensiv elting trenger 0,8 % for å fullføre gjæringen på
oppsatt tid». Regnet gjennom modellen, med bulk pluss én times etterheving ved 27 °C
(Gisslens egen anbefaling):

| | Gjær | Bulk | Dose |
|---|---|---|---|
| Kort elting | 0,2 % | 4,5 t | **2,00** |
| Forbedret | 0,6 % | 1,5 t | **1,97** |
| Intensiv | 0,8 % | 25 min | **1,37** |

**Kort → forbedret er en eksakt identitet** — gjær ×3, tid ÷3, dose 2,00 mot 1,97.
**Kort → intensiv er det ikke:** gjær ×4 mens tiden faller ÷10,7, og dosen faller til 1,37.
Den intensivt eltede deigen er reelt mindre gjæret. Gisslen påstår heller ikke noe annet —
han skriver «for å fullføre gjæringen på oppsatt tid», altså for å få deigen hevet, ikke
for å få samme brød.

Gjærens formering forklarer hvorfor 0,2 % holder i 4,5 timer: **+63 % gratis dose** mot
**+1 %** på 25 minutter.

Dette gikk inn i appen som en egen fagstoffseksjon, og det er den beste eksterne
bekreftelsen modellen har fått — et lærebokssitat fra 1990-tallet som faller ut av
integralet uten at noe ble tilpasset for å få det til å stemme. Merk også at Gisslens
korteltings-tall er **0,2 %**, og at appens optimalplan landet på **0,183 %** helt
uavhengig, fra 24 andre formler.

---

## 9 · Utstyret: hva som ble regnet ut

Bjørn oppga underveis at han steker i **glassgryte** og har en **15 mm bakestålplate**.
Kontaktvarme styres av effusivitet e = √(k·ρ·c):

| | Effusivitet | Kontakttemp mot 6 °C deig, helle på 250 °C |
|---|---|---|
| Støpejern | 13 123 | 232 °C |
| 15 mm stål | 13 625 | 232 °C |
| Cordierittstein | 1 730 | 157 °C |
| Borosilikatglass | 1 453 | **147 °C** |

Glasset måtte holdt **397 °C** for å levere samme bunnvarme som støpejern på 250.
Et 5 mm glass lagrer 9 255 J/m²K mot stålets 55 695 — seks ganger mindre.

**Men som dampkammer er glasset fullverdig:** en lukket gryte trenger ~2 g damp for å
mettes, og brødet inneholder selv 350–400 g vann.

Derfor konklusjonen: **la stålet levere bunnvarmen og glasset dampen.** Enten gryta oppå
det forvarmede stålet, eller brødet direkte på stålet med gryta snudd over som kloke.

Bjørn sendte senere lenke til den faktiske gryta: **Pyrex Slow Cook 4,4 L + 1,4 L lokk**,
oppgitt til **−40 til +300 °C** og **termisk sjokk 220 °C**. Det er borosilikattall
(herdet kalknatron ligger på 60–80). Men 5-graders deig i 250-graders glass er 245 °C
sprang, altså over spec — derav anbefalingen **230 °C og innlasting på bakepapir**.
Innvendig 21,5 × 13,5 cm med lokk gjorde at anbefalt emnestørrelse ble justert fra
900 g til **800 g**.

Stålet: 15 mm lagrer dobbelt så mye som en vanlig bakestein, og målt data for en 15 mm
stein ved 260 °C viser at overflaten ligger 116 °C for lavt etter 15 min og først er
framme ved 60. **Anbefalt forvarming 90–120 minutter** — de fleste gir et slikt stål
halvparten.

**Ooni Halo Pro** ble bekreftet som ekte spiralmikser (7 L, dobbel rotasjon, 58
hastigheter). Friksjon ~0,4 °C/min, ikke 1,0. Det er grunnen til at anbefalt vanntemperatur
ble **23,4 °C** og ikke iskaldt: en kort, skånsom spiralkjøring tilfører bare 2,4 °C.
Følger man «bruk kaldt vann» med 4-graders vann, lander deigen på **14,7 °C** — sju grader
under mål.

---

## 10 · Grovhet og frøvann — Bjørns egen smertepunkt

Bjørn: «frøvann må selvfølgelig regnes inn, jeg har slitt med dette tidligere — hvordan frø
påvirker grovheten og hvordan frøvann påvirker hydrasjon.»

To ting ble gjort:

**`froVannPaaToppen` ble standard på.** Regnearkets konvensjon (frøene tar vannet fra den
oppgitte hydreringen) er beholdt som valg, fordi den er hans utgangspunkt, men den er ikke
lenger standard. Effekten er stor: standardbrødet med 450 g frø binder 435 g vann, så
deigen føles som **44,2 % hydrering** i stedet for 72 %.

**Tre atskilte grovhetstall** ble innført i `beregnOppskrift()`, fordi de blandes hele tiden:

- `grovMelAndel` — andelen av *melet* som er sammalt. Det er kli som fysisk kutter glutentråder.
- `froAndel` — frø i bakerprosent. Frø kutter **ikke** gluten slik kli gjør; de er inerte
  innslag som fortynner nettverket og stjeler vann.
- `grovTotal` — hvor stor del av alt tørrstoffet som ikke bygger struktur.
- `glutenbaerende` — nøkkeltallet: hvor lite mel som skal bære hele brødet.

---

## 11 · Beslutninger om form og innhold

- **Norsk gjennomgående**, inkludert kode-kommentarer, fordi Bjørn skriver norsk.
- **Benevnelser bak tallene**, ikke bare i kolonneoverskrifter — hans eksplisitte ønske,
  begrunnet med at det hindrer lesefeil. Hjelperne `gram()`, `pst()`, `kron()`, `grader()`
  ligger i `engine.js`.
- **+/− knapper** på alle tallfelt (`leggTilSteppere()`), med steglengde hentet fra feltets
  `step`-attributt slik at temperatur går i 0,5 °C. Hold inne for å repetere.
- **Gjærmengden løses, den oppgis ikke.** I «Bygg brød» velger man grovhet og tidsbudsjett,
  og appen regner ut gjæren som treffer måldosen. Det var poenget med hele doseskalaren.
- **Praktisk gjærtak på 0,833 % tørrgjær** (= 2,5 % fersk). Ekspressplanen krevde opprinnelig
  4,85 % fersk, som ingen baker faktisk bruker. Appen sier nå ærlig fra at planen ikke rekker
  fram, i stedet for å foreskrive noe urealistisk. Underskuddet falt fra 44 % til 8–14 % etter
  at måldosen ble omkalibrert.
- **Kontekst framfor tall alene:** advarsler er formulert som «hvorfor», ikke bare «for høyt».
- **Valgt bort: en generell oppskriftsdatabase.** Appen er bygget rundt *hans* prosess og
  utstyr. Forvalgene er utgangspunkt, ikke et bibliotek.

---

## 12 · Åpne punkter

- **Ingenting er bakt.** Alle tall er modellerte. Ingen del av appen er validert mot et
  faktisk brød. Dette er det største åpne punktet.
- **Tre spørsmål jeg stilte ved første leveranse; ett ble aldri besvart.** Bjørn svarte på
  mel (butikkmel) og frøvann (skal regnes inn), men **ikke på om 35 % er riktig praktisk tak
  for enkorn**, eller om han lar 30 %-blandingen gå lenger enn appens lave hevemål.
- **Motstrid om Caputo-varianten.** Strekkodesøket (8014601036100) pekte på blå *Pizzeria*,
  W 260–280. Bjørn sa posen er **rød**, altså *Cuoco*, W 300–320. Jeg tok hans ord for det og
  la inn Cuoco, men motstriden er ikke oppklart. Sjekk posen.
- **Pyrex-marginen er ikke bekreftet med ham.** Jeg anbefalte 230 °C fordi 250 °C gir 245 °C
  sprang mot spec'ens 220. Han har ikke sagt om han godtar den begrensningen, eller om han
  heller vil kjøre kaldstart.
- **Grovhetsnivå 3 og 4 (30–40 %)** er beregnet, aldri bakt. Ciabatta med Cuoco er satt opp,
  aldri testet.
- **`0,40`-leddet for grovhet i `maalDoseFor()`** mangler kildegrunnlag (se punkt 6).
- **`MU_REF` og `Y_MAX`** er tilpassede, ikke målte verdier.
- Bjørn nevnte at han har **Ooni Halo Pro** først seint i samtalen; jeg rakk å legge inn
  friksjonsverdien, men eltetiden i forvalgene ble ikke gjennomgått i lys av at en spiralmikser
  utvikler gluten raskere enn en planetmaskin.

---

## 13 · Feller ved testing

Disse kostet mest tid, og de er ikke åpenbare.

- **Forhåndsvisningsruta bufrer JS ekstremt aggressivt.** Den serverte gammel `app.js`
  gjentatte ganger — også ved nytt filnavn, ny query-streng og `force`-navigering. Symptomet
  er lumsk: siden ser fersk ut, DOM-en er riktig, men `typeof tegnBygg === 'undefined'` eller
  en funksjon inneholder gammel logikk. Sjekk `beregnOppskrift.toString()` mot en kjent
  nylig endring når noe ikke stemmer.
  *(Changeloggens testoppskrift dekker dette nå, inkludert at CSS-en bufres like hardt.)*

- **Den aller første forhåndsvisningen 404-et på `app.js`** fordi hooken åpnet den i det
  `index.html` ble skrevet — før `app.js` fantes. Den 404-en ble så bufret, og feilsøkingen
  gikk i flere runder før årsaken var klar.

- **En agent kapret nettleserfanen midt i en testkjøring.** Verifiseringen kjørte mot
  thefreshloaf.com i stedet for appen og returnerte `Unexpected token '<'` for alle tre
  filene. Kjør ikke browser-tester i samme melding som en agent som kan navigere.

- **`const`-redeklarasjon** ved re-evaluering av kildekoden i samme scope gir SyntaxError.
  Løsningen er å pakke alt i `new Function(...)` eller trekke ut bare de funksjonene testen
  trenger.

- **Variabler fra ytre scope er ikke synlige inne i `new Function`.** En `d.match(...)` i
  testkroppen ga `d is not defined` — de må interpoleres inn som literaler.

- **SVG ble tegnet i blinde.** Skjermbilde feilet («Browser pane is not displayed»), så
  grafene ble verifisert ved å telle DOM-noder og lese `textContent` — antall `<path>`,
  fasenavn, klokkeslett, aksetekster. Det fanger at noe *tegnes*, men ikke at det *ser
  riktig ut*. Changeloggen har senere lagt inn «ta skjermbilde» som krav, med god grunn.
