# Innspill til endringsloggen — 28.–29.07.2026

Fra samtalen som startet med «gjør en review av brødappen og valider at ting er riktig og
henger sammen», og som endte med melbibliotek og ordliste.

CHANGELOG.md har allerede punktlister for dette arbeidet under **«28.07.2026 — Bak nå og de
første feilrettelsene»** og **«29.07.2026 — Melbibliotek, ordliste, korntegninger,
konsekvenslag»**. Dette dokumentet gjentar ikke dem, men fyller inn begrunnelsene, tallene
og beslutningene som ikke kan leses ut av koden.

*Merk: jeg er ikke helt sikker på om «Bak nå» ble bygget 28. eller 29. juli — samtalen gikk
over døgnskiftet, og CHANGELOG daterer den til 28. Jeg har latt den datoen stå.*

---

## 0 · Oversikt — hva som ble rørt

| Fil | Nytt / endret |
|---|---|
| `js/engine.js` | `ELTING`, `arbeidWh()`, `gradForArbeid()`, `interp()`. Rettet `vannHoved` i `beregnOppskrift()`, fjernet `×0,5`-leddet i `forfermentGjaerPct()`, la til `froVannOverskudd`, kuttet solveriterasjoner 70 → 42 |
| `js/data.js` | `TILLEGG_EFFEKT`, `PARAM_INFO`, `MELTALL_INFO`, `MEL_INFO`, `GLUTENBIDRAG_TEKST`, `TILGANG_TEKST`, `ORDLISTE`, `KORN_SVG`, `MEL_KORN`. Utvidet `TILLEGG` med `opt`/`opp`/`ned`, `FLOURS` med 7 nye meltyper, slettet forvalget `diggeste` |
| `js/app.js` | `bakeSteg()`, `ferdigTid()`, `settStartTid()`, `deigtempInn()`, `anbefaltEltMin()`, `forfermentMel()`, `aktivProfil()`, `UTSTYR_PROFIL`, `FORVARM_MIN`, `tegnBakNaa()`, `tegnEffekt()`, `tegnFriksjon()`, `tegnMelbibliotek()`, `tegnOrdliste()`, `festInfo()`, `kornSvg()`, `melSvg()`, `blandFarge()`, `veiG()`, `underVekt()`, `settTilleggGram()`, `settMelGram()`, `fokusNokkel()`, `gjenopprettFokus()`, `visFeilbanner()` |
| `index.html` | Fanene «Bak nå» og «Mel & korn», ordlistekort i Teknikk, effektpanel i Bygg brød, felt for start-tid, vektoppløsning og gramfelt |
| `css/style.css` | `.naakort`, `.bsteg`, `.melkort`, `.ordknapp`, `.infoboks`, `.korn`, `.feilbanner`, `.gramrad`, `.tilbakestill`. Rettet `.melrow`/`.frorow`-kolonnene |
| `LES MEG.md`, `STATUS.md` | Oppdatert status; `STATUS.md` opprettet ved øktskifte |

De av disse som ikke får egen begrunnelse lenger nede, står i **§ 9**.

## 1 · Hvorfor «Bak nå» ble bygget

Bjørns formulering var: *«Den er også litt vanskelig å bruke nå der det er vanskelig å følge
prosessen. Tenk at jeg skal bake og må følge en guidet prosess hvor jeg har kontroll på
mengder, temperaturer og tider.»*

Appen hadde alt tallene, men de lå spredt: mengdene i Oppskrift, temperaturene i Deigtemp og
Steking, tidene i Tidsplan. Står du på kjøkkenet med mel på hendene, er det tre faner å bytte
mellom for ett steg.

`bakeSteg()` ble skrevet som **én kjede som bygges bakover fra ferdigtidspunktet**, der hvert
steg bærer sine egne gram, grader og klokkeslett. Grunnen til at den ble én funksjon og ikke
tre visninger som hver regnet selv, var en konkret feil jeg fant i reviewet: Tidsplan,
gjæringsgrafen og stekeprofilen hadde hver sin utregning, og de kunne vise ulik starttid og
ulik stekeprofil for samme brød.

To ting i kjeden er lette å gjøre feil hvis man skriver den om:

**Forferment og bløtlegg henger begge på eltingen, ikke på hverandre.** Den gamle koden
kjedet dem etter hverandre, så forfermenten ble satt en halvtime for tidlig når det var frø i
oppskriften.

**Forvarmingen overlapper med hevingen med vilje.** Et 15 mm stål trenger 90–120 minutter, så
steget må starte midt i kaldhevingen. Legger man det rett før innsetting, blir stålet aldri
ladet. `FORVARM_MIN` per stekeprofil gjør dette eksplisitt.

---

## 2 · Feilene, med tall

### Vannregnskapet ba om samme vann to ganger

Den alvorligste. `vannHoved` trakk ikke fra vannet frøene binder. For forvalget
«Standardbrød 70 %» med 300 g solsikke og 150 g linfrø:

| | Appen sa | Riktig |
|---|---|---|
| Vann i hoveddeigen | 1 558 g | **1 123 g** |
| Vann å helle over frøene | 805 g | 805 g (hvorav 435 g bindes) |

Følger du oppskriften bokstavelig, blir det ca. 150 % hydrering. Feilen gjaldt **begge**
konvensjonene: både når frøvannet legges på toppen og når det tas fra hydreringen.

Invarianten som nå holder og bør testes ved enhver endring i `beregnOppskrift()`:

    vannTotal = vannHoved + forferment.vann + froAbsorbert

### Forferment-gjæren hoppet ved 16 timer

Et `if (timer > 16 && temp >= 21) ferskPct *= 0.5` i `forfermentGjaerPct()` ga et sprang midt
i et felt brukeren justerer i halvtimer:

| Modningstid | Med leddet | Uten leddet | Appens egen publiserte tabell |
|---|---|---|---|
| 16,0 t | 0,064 % | 0,064 % | 0,07 % |
| 16,5 t | **0,031 %** | 0,062 % | — |
| 18 t | 0,027 % | 0,055 % | **0,05 %** |

Leddet gjorde altså at modellen motsa appens *egen* tabell ved 18 timer. Å fjerne det fikk de
to til å stemme innenfor ca. 15 % over hele spennet 12–18 timer. Blast-radiusen var dessuten
liten: ingen innebygd konfigurasjon traff betingelsen — den bet bare den som manuelt satte
modningstid over 16 timer ved 21 °C eller mer.

### «Utbakt»-avkryssingen hadde aldri virket

Lest med `+inp.value`, som for en checkbox gir `+"on"` = NaN = 0. Boksen slo seg av igjen
straks. Nettopp det valget avgjør om hele batchen eller ett emne kjøles ned, og dermed hvor
mye av gjæringen som havner i kjøleskapet.

### Pyrex-profilen sa 250 °C

`brod_glass_stal` hadde `inn:250`, mens utstyrslista og fagstoffet begge sa maks 230 på grunn
av termisk sjokk (5-graders deig i 250-graders gryte = 245 graders sprang, over
spesifikasjonens 220). Rettet til 230, og emnevekten fra «800–900 g» til «700–800 g», som er
det utstyrslista alltid har sagt om den innvendige plassen.

---

## 3 · Beslutninger — og hva som bevisst ble valgt bort

### Forvalgene ble kalibrert mot formelen, ikke mot 1,95

Bjørn spurte om et tall han mente å huske fra tidligere research. Verifisert: appens
dokumenterte grunnlag er **1,95** (baguetter 1,95, magre brød 1,95, ciabatta 1,99), mens
1,97 finnes i appen som *Gisslen-regnestykket* «2,00 mot 1,97» — noe helt annet.

Det avdekket at forvalgene aldri var kalibrert. Dosene spredte seg **1,53–2,99** der formelen
sikter mot 1,61–2,30. Det betydde noe praktisk: referansedosen i «Gjæring & tid», som alt
måles ±8 % mot, arvet spriket.

Bjørn ble forelagt fire alternativer og valgte **«kalibrer alle mot formelen»** framfor flat
1,95, framfor å skjerme standardbrødet, og framfor å bare dokumentere avviket. Begrunnelsen
for at formelen vant: grovt mel og forferment flytter beviselig måltallet, så et flatt tall
ville ignorert det.

| Forvalg | Dose før | Etter | `gjaerPct` |
|---|---|---|---|
| brod_standard | 2,99 (+38 %) | 2,16 | 0,333 → **0,234** |
| ciabatta | 1,89 (+18 %) | 1,61 | 0,200 → **0,168** |
| baguette | 1,53 (−17 %) | 1,84 | 0,367 → **0,446** |
| focaccia | 2,19 (+12 %) | 1,96 | 0,300 → **0,266** |
| loff | 2,54 (+11 %) | 2,30 | 0,333 → **0,299** |

Baguetten var den eneste som lå for lavt. Alle treffer nå innenfor 0,15 %.

### Modellen for kald biga ble ikke utvidet — med vilje

Bjørn har ikke noe rom på 18 °C og spurte om bigaen kan stå i kjøleskapet. Appen svarte
**15,6 % fersk gjær** for 18 timer ved 4 °C — et tall ingen baker bruker.

Den fristende løsningen var å strekke `forfermentGjaerPct()` nedover. Det ble valgt bort, og
grunnen er prinsipiell: Molino Quaglia har publisert en direkte sammenligning der **samme
gjærmengde** ga moden biga på 16 t ved 16 °C og 24 t ved 4 °C — bare 1,5× lengre tid tross 12
graders fall. Det er umulig hvis gassproduksjon var det tidsbestemmende. **En bigas modenhet
styres av enzymatisk modning og gjærformering, ikke av gassvolum**, og det er en annen
mekanisme enn kurven appen regner på.

Derfor: under 12 °C sier appen at den er utenfor gyldighetsområdet, og viser **dokumenterte
protokoller** med gram ferdig utregnet i stedet for et beregnet tall. Advarselen kommer før
tallene, så man ikke rekker å tro på dem.

Det viktigste praktiske punktet derfra: **25–26 °C ut av bollen**, altså varmere enn man
tror. For kald lukketemperatur er den vanligste grunnen til at kald biga stopper helt.

### 16–18 °C for biga er konvensjon, ikke optimum

Verdt å skrive ned fordi det frigjør Bjørn fra et krav han ikke kan oppfylle: det finnes
**ingen publisert temperaturoptimaliseringsstudie for biga**. Den eneste fagfellevurderte
biga-studien bruker 16 °C som fast betingelse og varierer bare tiden. Mellom 12 og 22 °C
endrer alle rater seg jevnt med under 2×, og forholdet mellom enzym- og gjæraktivitet
forskyves bare rundt 1,2× over hele spennet.

Det som *er* evidensforankret er hydreringen på 45 % og at man holder seg under 26 °C.

### Ratkowsky-modellen ble IKKE endret

En research-rapport hevdet at nedbremsingen ved 4 °C bare er 3–8×, ikke ~36× som appen
regner, basert på ren Q10. Det ble undersøkt videre framfor å endre modellen — og en senere
rapport viste at gjær har et **brudd i Arrhenius-kurven ved 14–19 °C** der aktiveringsenergien
stiger kraftig. Regner man med det, blir svaret 20–40× fra 24 °C.

Appens modell er altså forsvarlig, og den er nettopp valgt fordi en fast Q10 ikke klarer lave
temperaturer. **Ikke bytt den ut basert på Q10-argumenter alene.**

### Protein ble skilt fra bakestyrke

`MEL_INFO.glutenbidrag` (bidrar / nøytral / fortynner / bryterned) ble lagt inn som eget felt
framfor å utvide `styrke`. Grunnen er at protein-% er direkte villedende: spelt deklarerer
14,3 g og er svakere enn siktet hvete på 12, havremel har 14 g og null bakeevne, kikertmel 19
g og null.

`MEL_INFO` ble holdt **utenfor** `FLOURS` med vilje, så regnemodellen og oppslagsverket kan
utvikle seg hver for seg.

### Meltyper som bevisst IKKE ble lagt inn

- **Hirsemel** — ingen dagligvarekjede fører det, det harskner raskt, og det bidrar ingenting
  bedre mel ikke gjør.
- **Quinoamel** — 177 kr/kg for en utpreget bitter saponinsmak som slår gjennom ved 10–15 %.
  Bokhvete gir mer for pengene.
- **Byggkli** — finnes ikke som forbrukervare i Norge i det hele tatt.
- **Potetmel** hører hjemme som en *tangzhong-parameter*, ikke som en meltype.

### Standardverdier justert etter research

Anbefalingene i `TILLEGG` ble endret fordi de var satt uten hensyn til at ovnsløft er
førsteprioritet: solsikke 12 → **6 %**, linfrø 6 → **3 %**, honning 3 → **2 %**, diastatisk
malt 0,4 → **0,1 %** med tak 0,75 → **0,3 %**.

Begrunnelsen for malt er sterkest: norsk hvetemel ligger på 280–320 s falltall, som *er* det
optimale vinduet. Målt trekker 0,5 % malt falltallet fra 327 til 194 s, og
farinograf-stabiliteten fra 7,5 til 2,6 minutter. Lang kaldheving gir dessuten amylasen 3–8
timers ekstra arbeid.

---

## 4 · To ganger feil om eltetid — og hvordan det ble løst til slutt

Dette er verdt å skrive ut, fordi feilen ble gjentatt.

**Første feil:** guiden foreskrev 6 minutter og bakekjeden gjettet «høyst 12». Bjørn elter
15–20. Vanntemperaturen bommet dermed med over 10 grader.

**Andre feil:** jeg satte da `eltMin: 18` fordi han sa det. Han presiserte at vanene hans
**ikke** skulle styre anbefalingene hvis det fantes bedre belegg. Jeg sa meg enig — og glemte
likevel å fjerne tallet da researchen kom. Han måtte påpeke det en gang til, med spørsmålet
«du er veldig opphengt i 18 minutter elting, hvorfor?».

**Løsningen** ble å fjerne tallet helt. `anbefaltEltMin()` utleder eltetiden fra maskinens
friksjon slik at arbeidet lander midt i målsonen på 4 Wh/kg:

| Maskin | °C/min | Anbefalt | Gir |
|---|---|---|---|
| Håndelting | 0,15 | 34 min | 4,0 Wh/kg |
| Kjøkkenmaskin | 0,60 | 9 min | 4,2 |
| Spiral hjemme (Ooni) | 0,40 | **13 min** | 4,0 |
| Spiral proff | 1,00 | 5 min | 3,9 |

Alle fire lander på samme arbeid. Det er også forklaringen på hele forvirringen: guidens
«6 minutter» er et tall for en **kommersiell spiral**, ikke for hans maskin.

`S.eltMigrert` er en engangsflagg som rydder bort den gamle 18-eren fra lagret tilstand uten å
røre senere brukervalg. Verifisert: gammel 18 → 13 · bruker setter 20 → står i fred → 20 ·
fersk installasjon → 13.

### Hvorfor friksjonsvarme kan brukes som arbeidsmåler

Kryssvalideringen som gjør `ELTING` troverdig: Chorleywood-prosessen leverer **målt 11 Wh/kg**
og gir **dokumentert 14–15 °C** deigtemperaturstigning. Modellen (1 Wh/kg ≈ 1,29 °C, c_p 2,8
kJ/kg·K) gir 14,2 °C. Den treffer.

Det betyr at temperaturstigningen *er* arbeidsmåleren — den eneste et hjemmekjøkken har.

---

## 5 · Melets eltetoleranse: en feil jeg innførte, og en jeg arvet

### Den jeg innførte

Da jeg koblet melet mot arbeidsmålet, lagde jeg en tabell som ga **alle** meltyper et
eltetak — sammalt hvete 9 minutter, rug 6. De tallene var gjettet.

Symptomet: **15 % sammalt hvete** — en helt vanlig halvgrov deig — utløste en **rød** advarsel
om at melet bare tålte 9 minutter. Det gjaldt tre av fem grovhetstrinn.

Research-rapporten sa uttrykkelig det motsatte: det finnes **ingen publisert regel** av typen
«halver eltetiden ved X % sammalt», og målingene på kli spriker om utviklingstid i det hele
tatt. Kli river glutenfilmen og stjeler vann — derfor uteblir vindusruta — men det er ikke det
samme som at deigen brytes ned av å eltes. Rug bidrar ingenting til glutenet, så eltingen av
rugandelen er bortkastet arbeid, men heller ikke det er et tidstak.

**Rettet til `URKORN_TAK`**, som bare dekker urkorn med svakt glutenin, der det finnes
publiserte tall: enkorn 4, emmer 5, spelt 9. Blandinger vektes harmonisk, og vektingen er
merket som anslag i grensesnittet, siden det ikke finnes publiserte tall for blandinger.

| Melblanding | Før | Etter |
|---|---|---|
| 80/15/5 halvgrov | RØD, «tåler 9 min» | intet meltak — arbeidsmålet styrer |
| 30 % enkorn | RØD, «tåler 4 min» | gult, blandingen tåler ~10 min |
| 100 % enkorn | RØD | RØD, 4 min (riktig) |
| 100 % spelt | — | RØD, 9 min |

### Den jeg arvet

Bjørn reagerte på melkortet for spelt: *«Kan ikke stemme at den tåler bare fire minutters
elting.»* Han hadde rett, og tallet var gammelt og ukildet.

| | Spelt | Hvete |
|---|---|---|
| Glutenindeks | 59 | 97–100 |
| **Farinografstabilitet** | **9,5 min** | 17,5 min |
| Utviklingstid | 4,75 min | — |

Spelt tåler omtrent **halvparten** av hvetens elting, ikke en fjerdedel. Mistanken min er at
noen har forvekslet **utviklingstiden** (4,75 min — når deigen når toppen) med **maks
eltetid** (når nedbrytningen begynner). Det er to forskjellige ting.

Samtidig rettet på samme kort: `maxPct` 50 → **100** (spelt er det eneste ikke-hvetemelet som
kan bære et brød alene) og `absorpsjon` 0,96 → **0,98** — det springende punktet er
kinetikken, ikke kapasiteten. Spelt tar opp vannet *senere*, så deigen er klissete tidlig og
strammer seg underveis.

**Lærdom for videre arbeid:** appens eldste `FLOURS`-notater er ukildede. Etterprøv dem når de
gir konkrete tall. Enkorns «3–4 min» er derimot ekte og publisert — men gjelder 100 % enkorn,
og er nå presisert.

---

## 6 · Bløtlegging var en regel uten dekning

Appen påsto kategorisk at frø «aldri» skal i deigen tørre. Bjørn stusset: *«skal
solsikkefrø bløtlegges? Det har jeg ikke hørt før.»*

Han hadde rett i å stusse. De dokumenterte bløtleggingsgevinstene er målt på **kli, havre og
chia** — materialer som binder 130–300 g vann per 100 g. Solsikke er i motsatt ende:

| Frø | Binder per 100 g |
|---|---|
| Chia | 237 g |
| Linfrø | 130 g |
| **Solsikke** | **80 g** |
| Sesam | 58 g |
| Gresskar | 38 g |

Og det finnes et argument **mot** å bløtlegge ristede frø: pyrazinene er vannløselige og
flyktige, så en lang eller varm bløt vasker ut nettopp det ristingen lagde.

Bløtleggingssteget i `bakeSteg()` er nå betinget av `froAbsorbert / melTotal`. Terskelen er
satt til **5 prosentpoeng stjålet hydrering**, som tilsvarer ca. 6 % solsikke. Første forsøk
satte den til 3, men det tilsvarer under 4 % solsikke — «valgfritt» slo aldri inn ved
realistiske mengder. Under terskelen bytter steget navn til «Rist frøene (bløtlegging
valgfritt)». Ruggryn og havregryn må fortsatt skåldes uansett mengde.

---

## 7 · Åpne punkter

**Melvalget er ikke tatt.** Bjørn fikk rangeringen etter smak per tapt ovnsløft — sammalt rug,
sammalt spelt, svedjerug, durum semola rimacinata, emmer på topp — men har ikke stjernemerket
noen i Mel & korn. Favorittfunksjonen virker; han må velge.

**Grovhets- og tidsplankortene i «Bygg brød» mangler ⓘ.** De er klikkbare kort, ikke
`.field`-elementer, så `festInfo()` treffer dem ikke. Han ble spurt om de skulle konverteres,
og svarte ikke.

**Dose–respons-panelet dekker ikke melvalg.** Det dekker frø, honning, fett og malt. Å koble
`glutenbidrag` til forventet ovnsløft ville vært en naturlig utvidelse.

**Tre modellendringer foreslått, ikke besluttet:**

1. **Rug trenger et syre-flagg.** Taket er 25 % i ren gjærdeig, men 40 % med 1–2 % eddik på
   melvekt. Det er den eneste ingrediensen der et tilsetningsstoff flytter taket vesentlig.
2. **Havre og bygg trenger en vannkompensasjonsregel.** Målt gjenoppretter +20 % vann over
   farinografverdien volumet nesten fullstendig. Uten regelen straffes de dobbelt: først for
   fortynningen, så for underhydreringen appen selv forårsaket.
3. **Rug og bygg/havre bør ha ulike straffefunksjoner.** Rug bryter ned aktivt; bygg og havre
   fortynner og konkurrerer om vann. Samme prosentandel gir ikke samme skade.

**Ubesvart spørsmål fra meg:** om ordlista også skulle kobles på ordene der de dukker opp i
løpende tekst, ikke bare ligge som eget oppslag. Automatisk innlenking i vilkårlig HTML ble
vurdert som for skjørt og ble ikke gjort.

---

## 8 · Feller ved testing

CHANGELOG dekker bufringen. Disse kommer i tillegg, og alle kostet meg tid:

**Mine egne tester forurenset sida.** Jeg klonet bort alle DOM-handlere med
`replaceWith(cloneNode(true))` for å teste `init()` på nytt. Men `cloneNode` beholder
`dataset.stepper`, så `leggTilSteppere()` hoppet over feltene og lot de klonede,
handlerløse +/−-knappene stå igjen. Det fikk meg til å «reprodusere» en feil som ikke fantes.
**Bygg heller DOM-en på nytt fra fila** med `DOMParser` framfor å klone bort handlere.

**Test mot harnessens konstanter, ikke sidas globale.** Jeg kjørte
`PRESETS.forEach(p => M.brukPreset(p.id))` der `PRESETS` var den *gamle* globale fra den
bufrede sida. Da inneholdt lista fortsatt det slettede forvalget, `M.brukPreset` returnerte
stille for en id som ikke fantes, og testrapporten så grønn ut mens den ikke testet noe.
Eksporter konstantene fra harnessen og bruk dem.

**Regexen min plukket feil melding.** Jeg lette etter meltak-advarselen med
`querySelector('.note.warn')`, men arbeidssone-varselet er også `.note.warn` og kommer først.
Testen rapporterte «intet meltak» for alle blandinger, inkludert de som helt riktig ga rødt.

**0 px feltbredde er ikke alltid en feil.** Fem felt målte 0 px i en layouttest — de lå i
`#ffFelt` og `#dtEgenFelt`, som er `display:none` til man slår dem på. Sjekk `offsetParent`
før du melder feil.

**Skjulte faner måler 0.** Går du gjennom alle visninger med `vis()` og måler etterpå, ligger
alt utenom siste fane i en `display:none`-seksjon.

---

## 9 · De mindre endringene, og hvorfor de finnes

CHANGELOG nevner flere av disse i punktform. Her er grunnene, som ikke står der.

**Fokusbevaring — `fokusNokkel()` / `gjenopprettFokus()`.** Mel-%, frø-gram, heveplanens
timer og temperatur, og måldose ble bygget opp fra bunnen ved hvert tastetrykk, siden
`oppdater()` tegner alt på nytt. Feltet du skrev i ble altså kastet og laget på nytt mellom
to tegn: du rakk å skrive «7» av «72» før markøren forsvant. Verifisert ved at
`document.activeElement` ble `BODY` etter ett tastetrykk. Løst med stabile `data-k`-nøkler
på hvert dynamisk felt. **Dette var trolig hovedgrunnen til at Bjørn åpnet samtalen med at
appen var «vanskelig å bruke».**

**+/−-knappene som «ikke virket».** Bjørn meldte dette som en feil, og jeg klarte ikke å
reprodusere den ved å klikke programmatisk — `S.melListe[0].pct` oppdaterte seg helt korrekt.
Det var **skjermbildet hans** som løste den: grid-kolonnen i `.melrow` var 78 px, de to
stepper-knappene tok 2 × 38 = 76, og tallfeltet mellom dem fikk 2 px. Verdien var usynlig, så
knappene *så* døde ut mens de virket perfekt. Kolonnene er nå 124 px, knappene kan krympe
(`flex:0 1 38px; min-width:30px`) og feltet har `min-width:44px`.

**Feilisolering og `#feilbanner`.** `oppdater()` kjørte visningene etter hverandre med
`leggTilSteppere()` **sist**, og bare `tegnBygg` var pakket i try/catch. Kastet en av de andre
visningene, stoppet resten av kjeden stille — og da ble +/−-knappene aldri lagt på i det hele
tatt. Symptomet var altså «knappene virker ikke», mens årsaken lå et helt annet sted og bare
havnet i konsollen. Nå isoleres hvert steg, steppere legges alltid på, og feil vises i
grensesnittet. **En stille feil er verre enn en synlig.**

**Start-tid og «Start nå» — `settStartTid()`.** Bjørn påpekte at ferdigtidspunktet er én
parameter, men at det er vel så viktig å kunne si når man *starter*. Kjeden regnes fortsatt
bakover fra ferdig — det er den eneste retningen som gir mening når stekingen er det faste
punktet — så `settStartTid()` forskyver hele planen i stedet. Varigheten holdes uendret begge
veier. Feltene `#planFerdig`, `#planUtbak` og `#planElt` ble samtidig flyttet fra DOM-en til
tilstanden, fordi Tidsplan og grafen ellers kunne komme i utakt.

**Vektoppløsning — `S.vektTrinn`, `veiG()`, `underVekt()`.** Bjørn opplyste at vekta hans
leser 0,01 g. Appen advarte fast under 0,3 g om at mengden var for liten å veie, noe som er
riktig for en 1-grams kjøkkenvekt og helt feil for en finvekt. Terskelen henger nå på vektas
egen oppløsning, satt til 20 × minste trinn — under det spiser vektas usikkerhet på ±1–2
siffer en merkbar andel. Bigaens 1,42 g gjær får nå «lar seg veie greit» i stedet for forslag
om oppslemming.

**Gram ↔ prosent — `settTilleggGram()`, `settMelGram()`.** Begrunnelsen er praktisk: «jeg har
250 g solsikke igjen som skal brukes opp». Prosent er riktig enhet for modellen, gram er det
som står i skapet. Det er **ikke** en triviell omregning: når totalvekten er låst, fortrenger
mer frø mel, så melmengden avhenger av frømengden som avhenger av prosenten som regnes av
melmengden. Første forsøk med `pct = gram/mel` bommet med 1 g ved store andeler. Løsningen er
proporsjonal korreksjon mot det oppskriften faktisk gir, 25 runder. Treffer nå eksakt fra
50 til 400 g. `settMelGram()` beholder de andre melsortenes innbyrdes forhold, så én rad
flytter seg uten å stokke om blandingen.

**Ytelse — solveriterasjoner 70 → 42.** En full `oppdater()` tok 99 ms, som merkes når den
kjøres på hvert tastetrykk. Halveringssøkene i `gjaerForDose()`, `tidsfaktorForDose()` og
`timerForTrinn()` kjørte 70 runder, som gir absurd presisjon — 42 gir 12 desimaler på de
aktuelle intervallene. Ned til 65 ms uten at noe tall endret seg.

**Forvalget «Det diggeste brødet» ble slettet** på Bjørns forespørsel, med begrunnelsen «så vi
unngår misforståelser». Bakgrunnen: forvalget var merket «din favorittblanding» og inneholdt
30 % enkorn, og jeg hadde sluttet fra den etiketten at det var deigen han vanligvis baker —
og skrevet «30 % enkorn» inn i research-oppdrag som om det var et faktum om ham. Han hadde
aldri nevnt enkorn. Researchen viste dessuten at enkorn er **nesten umulig å få tak i i
Norge**; ingen dagligvarekjede fører det. `last()` migrerer lagret tilstand som peker på et
forvalg som ikke finnes lenger, uten å røre bakeloggen.

**Stekeprofilen ble frikoblet fra forvalget** — `S.stekeProfil`, `aktivProfil()`,
`UTSTYR_PROFIL`. Bygde man et rundbrød i «Bygg brød» og trykket «Bruk denne», fortsatte
Tidsplan og Steking å beskrive det forvalget som tilfeldigvis stod i velgeren — i min test
baguetter, altså 22 minutter på nedre-midt rist for et 900 g rundbrød. Utstyrs-id-en
`glass_stal` traff dessuten ingen gren i den gamle oppslagskoden og falt tilbake på åpen
steking, selv om appen selv kaller det oppsettet sitt beste.

**Bassinage-rådet ble gjort betinget.** Eltetrinnet sa «hold igjen de siste 0 g av vannet»
når deigen lå under 70 % hydrering og regnestykket gikk i null. Nå sier det i stedet at alt
vannet kan i fra start.

**Biga-teksten «6× mer gjær enn en poolish»** motsa sin egen brødtekst, som sa 2,5× i samme
avsnitt. Overskriften er omformulert.

**Lukket gryte ga 2 prosentpoeng hydrering i koden** mens kommentaren rett over og
fagstoffet begge sa 3–5. Koden er rettet opp til 3, siden det er tallet som har kilde.

## 10 · Én ting om arbeidsmåten

De fem mest verdifulle rettelsene i denne samtalen kom fordi Bjørn stusset på noe:
vannet som ble talt to ganger, +/−-knappene som «ikke virket», enkorn-slutningen jeg tok fra
en preset-etikett, speltens fire minutter, og de 18 minuttene jeg ikke fikk fjernet.

Alle fem besto de automatiske testene mine. Ingen av dem hadde blitt funnet uten at han sa fra.
