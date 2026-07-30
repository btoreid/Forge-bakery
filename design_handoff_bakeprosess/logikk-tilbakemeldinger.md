# Logikk- og modellsaker → Claude Code

Loggbok som følger designarbeidet i dette prosjektet. **Designet endres her; logikken endres i
repoet** (`btoreid/Forge-bakery`). Alt Bjørn peker på som en faglig eller regnemessig brist
skrives inn her, ikke løses i mockupen.

Kolonnene: `ID` · hva som er galt · hvor det viser seg i designet · hvilken fil/funksjon i
repoet som eier tallet · status.

Status: `ÅPEN` (ikke behandlet) · `BEKREFTET` (Bjørn har bekreftet at det er en feil) ·
`AVKLART` (ikke en feil — begrunnelse notert) · `SENDT` (med i bestilling til Claude Code) ·
`FIKSET` (bekreftet rettet i repoet).

---

## Bestilling som skal til Claude Code

Ingen sendt ennå. Når listen under har nok `BEKREFTET`-saker, samles de i én bestilling med
filreferanse, forventet oppførsel og testkriterium per sak.

---

## Saker

### L-01 · Ovnsløft-indeksen finnes ikke i appen
**Hva:** Designet (1a, 2b) viser «ovnsløft-indeks 0–100» med delta mot forrige bak. Appen har
ingen slik samlet størrelse — bare `TIDSPLANER[].ovnslos` og spredte kostnader i
`TILLEGG_EFFEKT`. Tallene i mockupen er min interpolasjon: `ovnslos − grovhetskostnad −
frøkostnad − hydreringsstraff`.
**Hvor:** 1a «Sannsynlighet for ovnsløft», 2b «Ovnsløft».
**Repo:** ny funksjon, hører i `js/engine.js` ved siden av `brodskalan()`. Grunnlaget finnes i
`data.js` (`TIDSPLANER[].ovnslos`, `TILLEGG_EFFEKT`, `FLOURS[].glutenbidrag`).
**Må avklares:** hvilke ledd som skal inn, og hvilke som har kilde. `PARAMETERREVISJON.md`
skal styre — ingen nye ukildede tall.
**Status:** ÅPEN

### L-02 · Gjærmengde per tidsplan er avledet, ikke hentet
**Hva:** Designet viser gjær i % og gram per tidsplan (`0,205 / 0,234 / 0,42 / 0,58 / 1,05 %`
uten forferment, ×0,85 med). Bare `0,234 %` er ekte — den er repoets kalibrerte verdi for
`brod_standard`. De andre er skalert av meg.
**Hvor:** 2a topp-pille, 2b deigregnskap og «Tid — velg, se prisen».
**Repo:** `js/app.js` løser gjærmengden numerisk mot måldosen i «Bygg brød». Designet bør lese
den løsningen, ikke en tabell.
**Status:** ÅPEN

### L-03 · Grovhetsdialen og melblandingen er uenige om samme brød
**Hva:** `BROTYPER.grovbrod` starter på `grovhet:3` = **40 %**, mens forvalget
`PRESETS.brod_standard` — som er samme brød — har en melblanding på **35 %** sammalt.
Måldosen blir 2,14 av dialen og 2,16 av blandingen. Ingen av dem er feil isolert, men appen
viser begge som «grovheten din».
**Hvor:** 1a «Brødskala'n», 2b kicker og «Gjæringsdose» — designet må velge én kilde.
**Repo:** `js/data.js` (`BROTYPER`, `PRESETS`, `GROVHET`), `brodskalan()` i `js/engine.js`.
**Spørsmål til Bjørn:** skal dialen alltid overstyre blandingen, eller skal dialen leses *av*
blandingen når man kommer fra et forvalg?
**Status:** ÅPEN

### L-14 · Forfermenten påvirker ikke løftet i det hele tatt
**Hva:** Løftindeksen regnes som `plan.ovnslos − grovKost − froKost − hydKost`. Forfermenten
inngår ikke med ett eneste ledd, verken om den er på eller av, og uansett type. Slår du på en
biga på 30 % endrer tallet seg ikke. Det er feil på to måter: forfermenten er det ene grepet i
appen som *øker* løftet uten å koste noe annet enn tid, og typene skiller seg reelt fra
hverandre — stiv biga gir mest deigstyrke, poolish mest ekstensibilitet, pâte fermentée noe av
begge. I dag ser brukeren bare at gjærdosen faller (`1 − 0,6 × andel`), og trekker den rimelige,
men gale slutningen at forfermenten bare er en smaksgreie.

Det er også en indirekte feil: `plan.ovnslos` er satt per tidsplan (100 for Optimal, 96 for Lang,
82 for Kort) og *inneholder allerede* at de lange planene har forferment. Så forfermentens bidrag
er bakt inn i planvalget og forsvinner når man skrur den av — Kort-planen med poolish påslått får
fortsatt 82.

**Forslag til modell:** eget ledd `ffGevinst` som legges til, ikke trekkes fra:
- ingen: 0
- poolish: +3 · (andel/25), mest ekstensibilitet — best på frittstående og høy hydrering
- biga: +5 · (andel/30), mest deigstyrke — skalerer med melstyrke, gir mest når melet er svakt
- pâte fermentée: +2,5 · (andel/20)
og at `plan.ovnslos` normaliseres til verdien *uten* forferment, slik at planvalg og
forfermentvalg ikke teller samme gevinst to ganger.

**Hvor:** Deigregnskapet, kortet «8 · Forferment» og «Hva dette koster».
**Repo:** `loft`-utregningen (samme sted som L-01), `TIDSPLANER[].ovnslos` i `js/data.js`.
**Spørsmål til Bjørn:** har du en formening om hvor mange løftpoeng en biga er verdt mot en
poolish på ditt mel? Tallene over er plausible, ikke målte.
**Status:** ÅPEN — designet viser i dag ingen løfteffekt av forfermenten.

### L-13 · Tidsplanenes etiketter stemmer ikke med planene deres egne timer
**Hva:** `TIDSPLANER` bærer en fast tekst `kort` («26–34 timer» for Optimal, «18–20 timer» for
Lang), men planens egne ledd summerer til noe annet: Optimal er biga 16 t + bulk 4 t + kaldheving
14 t + elting, utbaking, steking og avkjøling ≈ **40 t**. Etiketten utelater forfermenten, mens
`bakeSteg()` legger den inn i kjeden — så appen viser 26–34 t og 39,8 t på samme skjerm.
Designet viser nå den regnede tiden per plan og ikke etiketten.
**Hvor:** appen, Tid-skjermen (planvalget mot sum-linja).
**Repo:** `TIDSPLANER[].kort` i `js/data.js` mot kjeden i `bakeSteg()` (`js/app.js`).
**Forventet:** `kort` slettes eller regnes ut. Er den ment å beskrive tiden *etter* at
forfermenten er satt, må den si det — «18 t etter elting» er en annen opplysning enn «total tid».
**Status:** BEKREFTET av Bjørn 29.07.2026

### L-12 · Samme tall gjentas i samme kort
**Hva:** Frøstegene viste hovedtallet én gang stort («111 g solsikke») og deretter som egen rad i
tabellen under, pluss raden «Vannbinding 80 g per 100 g» som er konstanten bak neste rad
(«Binder totalt 89 g»). Tre rader for én opplysning. Ryddet i designet: hovedtallet står én gang,
og konstanten står i parentes bak resultatet.
**Hvor:** appen, frøstegene i Baking.
**Repo:** samme mønster ligger i `bakeSteg()` sine `mengder`-lister og i `.bs-tab` under «Bak nå»
i `js/app.js` — mengdetabellen gjentar tall som allerede står i stegets overskrift eller i
`temp`-linja.
**Forventet:** hvert tall vises én gang per steg. En konstant (g vann per 100 g frø) er ikke en
mengde og hører ikke i mengdetabellen.
**Status:** BEKREFTET av Bjørn 29.07.2026

### L-11 · Appen sier at linfrø må knuses
**Hva:** `SOAKERS` i `js/data.js` har notatet «Hele linfrø går rett gjennom deg om de ikke
knuses», og `TILLEGG.linfro` sier «Hele linfrø må knuses for å gi næring». Bjørn knuser ikke
linfrø, og for BAKINGEN er påstanden dessuten irrelevant: knusing handler om
næringsopptak hos den som spiser, ikke om deig, vannbinding eller struktur. Instruksjonen er
fjernet fra appen — linfrøene bløtlegges kaldt, hele.
**Hvor:** appen, frøraden i Deigen, frøsteget i Bak nå og totalregnskapet.
**Repo:** `SOAKERS.linfro.notat` og `TILLEGG.linfro.obs` i `js/data.js`.
**Forventet:** ikke bland ernæringsråd inn i bakeinstruksjonene. Vil man beholde poenget, hører
det i fagstoffet, ikke i et steg brukeren skal utføre.
**Status:** BEKREFTET av Bjørn 29.07.2026

### L-09 · «Andel av gjæringen» kan ikke gjettes per steg
**Hva:** Mockupen viste «andel av gjæringen 25 % / 75 %» på bulk og kaldheving. Tallene stammer
fra forvalget `brod_standard` (3,5 t bulk + 20 t kjøl) og er feil for alle andre planer — på
Lang-planen (3 t 30 bulk + 3 t kjøl) påsto den at det korte, kalde steget bar 75 %. Radene er
**fjernet** fra designet; det er ett av tallene bare motoren kan svare på.
**Hvor:** appen, Bak nå (bulk- og kaldhevingssteget).
**Repo:** `planProfil()` og trinn-dosene i `js/engine.js` regner dette riktig, inkludert
termisk etterslep (Newton-avkjøling, τ = 3,0 × kg^⅓ t) — som er nettopp grunnen til at 75 % kan
skje kaldt i én plan og 11 % i en annen.
**Forventet:** visningen leser `g.trinn[i].dose / g.dose`, aldri en konstant.
**Status:** DELVIS LØST i designet 29.07.2026 — appen regner nå andelen selv, med utvidet Ratkowsky-respons (T_min 0, T_max 44, c 0,28) og Newton-avkjøling (tidskonstant 3,0 x kg^1/3, per emne). Lang-planen gir 71 % varmt / 29 % kaldt, ikke 25/75 som den faste teksten påsto. Forenklingen som står igjen: gjærpopulasjonen er konstant, mens engine.js også har logistisk vekst (my 0,18/t, tak 2,5 %). Den skal med når dette flyttes til koden.

### L-10 · Totaltiden var summert to steder og manglet forfermenten
**Hva:** Total prosesstid ble regnet som en sum av leddene i mockupen, og forfermentens timer var
glemt — så toppen sa 12,8 t mens kjeden rett under viste 24,25 t. Rettet i designet ved at
totalen nå leses **ut av kjeden** (siste steg slutt − første steg start).
**Hvor:** appen, sum-linja, Tid-skjermen, Avkjøl-steget, kostnadslinja i Deigen.
**Repo:** `bakeSteg()` returnerer `start` og `ferdig`, og «Total tid» skal alltid regnes derfra.
Verdt en test: total tid = siste steg slutt − første steg start, for alle fem tidsplaner med og
uten forferment.
**Status:** ÅPEN — samme klasse feil som `STATUS.md` advarer mot (parallell utregning).

### L-07 · Frøene er slått sammen til ett steg, men har ulike prosesser
**Hva:** `bakeSteg()` lager ETT frøsteg (`id:'bloet'`) for alle frøtyper, med én felles
instruks og ett felles `valgfritt`-flagg basert på hvor mye vann frøene til sammen stjeler.
Men prosessene er forskjellige og delvis motstridende:
- **Solsikke** ristes tørt (125–150 °C) for pyrazinsmak, binder 80 g/100 g. Lang eller varm
  bløtlegging *vasker ut* det ristingen ga — pyrazinene er vannløselige og flyktige.
- **Linfrø** må knuses for å gi noe, binder 130 g/100 g, og bløtlegges kaldt for slimstoffene.
- **Sesam** hører etter appens eget råd ikke i deigen i det hele tatt, men på skorpen.
Ett felles steg gjør at minst én av dem får feil instruks.
**Hvor:** appen, skjerm 2 (nå to separate rader) og Bak nå (nå to separate steg).
**Repo:** `bakeSteg()` i `js/app.js` (frøsteget), `SOAKERS`/`TILLEGG` i `js/data.js`
(`varmt`-flagget finnes, men skiller bare skålding fra kaldbløt — ikke risting fra bløtlegging).
**Forventet:** ett steg per behandlingsmåte (rist / kaldbløt / skåld), med frøene gruppert etter
metode, ikke etter at de er «frø». Vannregnskapet må fortsatt summere per frø.
**Status:** BEKREFTET av Bjørn 29.07.2026

### L-08 · Emoji som ikoner
**Hva:** Ikonene i mockupen var emoji (🌾🍞🥖🫓🔥❄). Feil på tre måter: de er ikke
designsystemets ikoner (Organic bruker Lucide, stroke 2,75), de betyr forskjellige ting på ulike
plattformer, og 🥖 sto på både ciabatta og baguett. De er nå fjernet — brødtypene er merket med
**grovhet i prosent** og stegene med **nummer**, altså med data i stedet for pynt.
**Hvor:** hele appen.
**Repo:** appen bruker `ikon`-felt i `BROTYPER`, `FORMER` og `STEGIKON` i `js/app.js` —
alle med emoji eller geometriske tegn. Skal erstattes med Lucide-SVG, eller sløyfes.
**Status:** BEKREFTET av Bjørn 29.07.2026

### L-06 · Designet antok en bakelogg som ikke finnes
**Hva:** Startskjermen viste «Bak det samme igjen — Halvgrovt #12 · 8,5 av 10», og totalen
målte alle endringer mot «baket du likte». Bjørn har ikke logget noe bak. Kortet er nå erstattet
med en ekte tom tilstand, og alle avvik måles mot **forvalget**, ikke mot en logg.
**Hvor:** appen, skjerm 1 og totalskuffen. Skissene 1a/2b har fortsatt den samme antakelsen —
de er historikk og rettes ikke.
**Repo:** `S.logg` i `js/app.js` er tom til man lagrer. To ting følger:
1. Referansedosen hentes fra forvalgets plan når loggen er tom — det er riktig, men appen bør
   **si** hvor referansen kommer fra, ellers ser modelltallet ut som erfaring.
2. «Denne var perfekt — bruk dosen som mål» er den eneste veien fra logg til referanse.
   Førstegangsbrukeren trenger en tydelig oppfordring til å logge det første baket, ellers får
   avvikstallene aldri et ekte anker.
**Status:** BEKREFTET av Bjørn 29.07.2026

### L-05 · Appen modellerer ikke vekttap eller emnetemperatur
**Hva:** Kjøkkenmodus ville naturlig vist «netto vekt etter steking» i avkjølingssteget og
«deigtemp inn i ovnen» i utbakingssteget. Ingen av dem finnes i modellen: `BAKE_PROFILES`,
`bakeSteg()` sine `shape`/`cool`-steg og `PRESETS` bærer verken vekttap eller emnetemperatur.
Radene er derfor **fjernet** fra designet framfor å stå der som om de var appens tall.
**Hvor:** 3a steg 6 og steg 8.
**Repo:** `js/engine.js` (ny beregning), `js/data.js` (`BAKE_PROFILES` — vekttap varierer med
profil og damptid).
**Spørsmål til Bjørn:** er dette verdt å modellere? Vekttap er nyttig fordi du veier emnene i
gram, men det krever en målt verdi per stekeprofil, ikke et anslag.
**Status:** ÅPEN

### L-04 · Kjente avvik fra `STATUS.md` som ennå ikke er rettet
Tas med i samme bestilling fordi de treffer tall designet viser:
- `0,40 × grovAndel` i `maalDoseFor` er det eneste ukildede leddet — og betyr mer nå at
  trappa går til 80 %.
- Kode og tekst uenige fire steder: salt (1,7/2,4 mot 1,8/2,2), ciabatta (72 mot 78 %),
  sukker (6 mot 7 %), bløtlegging (3 mot 5 prosentpoeng).
- `miljo <= 12` — skillet kaldt/varmt — står hardkodet åtte steder uten å være konstant.
- Grovhets- og tidsplankortene i «Bygg brød» mangler ⓘ (`festInfo()` treffer dem ikke).
**Status:** ÅPEN (dokumentert i repoet fra før, ikke rørt av designarbeidet)

---

## Designbeslutninger som IKKE er logikkendringer

Ligger her bare så de ikke forveksles med saker over.

- Prosessen vises som **ett steg om gangen på mobil** og **ett brett på PC** — samme
  `bakeSteg()`-kjede, ny visning.
- **Tall aldri erstattet av grafikk.** Graf + gram/prosent i samme kort, alltid.
- **Snarveier får prislapp i tall** (timer, gram, prosentpoeng, løftpoeng) — krever L-01 og
  L-02 for å være ekte.
