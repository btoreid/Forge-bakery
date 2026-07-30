# Forge Bakery

Dobbeltklikk **index.html** for å åpne appen. Ingen installasjon, ingenting å starte — det er ren
HTML/CSS/JavaScript. Alt du legger inn lagres lokalt i nettleseren, og synkes til skyen hvis du logger inn.

```
index.html        appen (mobil-V2) — live på btoreid.github.io/Forge-bakery/
index-v1.html     den gamle desktop-appen, frosset
manifest.webmanifest · sw.js · icons/   gjør appen installerbar på Android
css/style-v2.css  utseende (V2)
js/data.js        mel, frø, forvalg, stekeprofiler, fagstoff
js/engine.js      regnemotoren (fermenteringskinetikk, deigtemperatur, bakerprosent)
js/app-v2.js      grensesnittet (V2) — tegner bare, regner aldri
js/sky.js         innlogging og synk (Supabase) — se SUPABASE.md
js/app.js         grensesnittet til V1, frosset
```

## Status

Ti faner: **Bygg brød** (grovhetstrapp, tidsbudsjett, tilleggsmeny, dose–respons) ·
**Bak nå** (den guidede prosessen) · Oppskrift · **Gjæring & tid** (måltallet forklart med
tegninger, forløpsgraf med klokkeslett) · Deigtemp (med arbeidsmåler) · Tidsplan · Steking ·
**Mel & korn** (30 meltyper med fordeler, ulemper og favorittmerking) · Teknikk (23 seksjoner
+ ordliste på 43 fagord) · Bakelogg.

Måldosen er forankret i **24 publiserte profesjonelle formler**, ikke i egne notater.
Anbefalingene for elting, frø, honning, fett og malt er forankret i **fem
research-gjennomganger** gjort 29.07.2026, med kildehenvisning i notatfeltene.

Alle grovhet × tid-kombinasjoner i **Bygg brød** treffer måldosen eksakt — der løses
gjærmengden numerisk mot målet. Alle forvalg treffer målvekten eksakt.

Forvalgene er **kalibrert 29.07.2026** slik at de også treffer måldosen, innenfor 0,15 %.
Før bar de gjærmengder hentet fra notater og konvensjonelle oppskrifter og spredte seg
fra 1,53 til 2,99 der formelen sikter mot 1,61–2,30. Se tabellen nederst.

## Hva appen gjør

**Mel & korn** — oppslagsverk over 30 meltyper med tegning av kornet, fordeler og ulemper,
tilgjengelighet i norske butikker, og en ⓘ på hvert tall som forklarer hva det betyr i
praksis. Stjernemerk favorittene, så legger de seg øverst i melvelgeren under Oppskrift.
Merk feltet **glutenbidrag**, som er bevisst skilt fra protein: spelt har 14,3 g protein og
er svakere enn siktet hvete på 12, havremel har 14 g og null bakeevne. Protein duger ikke
som mål på bakestyrke.

**Elting måles i arbeid, ikke minutter.** 1 Wh/kg tilsvarer 1,29 °C friksjonsvarme i deigen,
og målsonen for åpen krumme er 3–5 Wh/kg. Deigtemp-fanen viser hvor du ligger og hvilken
eltetid som treffer sonen for din maskin — 13 minutter på en hjemmespiral, 5 på en
kommersiell. Det er samme arbeid. Kryssvalidering: Chorleywood leverer målt 11 Wh/kg og gir
dokumentert 14–15 °C stigning; modellen gir 14,2.

**Bak nå** — hele prosessen som én nummerert liste fra forferment til avkjøling, med gram,
grader og klokkeslett samlet i hvert steg. Sett når brødet skal ut av ovnen, så faller resten
på plass bakover. Hak av etter hvert; framdriften ligger lagret. Et «nå»-kort øverst sier hva
som er neste steg og hvor lenge det er til. Steg som overlapper — forvarmingen starter mens
emnene fortsatt står kaldt — er plassert der de faktisk hører hjemme i klokka.

**Oppskrift** — bakerprosent med forferment, frø, kostnad og advarsler når melblandingen ikke tåler
hydreringen du har valgt. Samme konvensjon som regnearket ditt: «sum tørt» er alt mel inkludert melet
i forfermenten, og frø teller ikke i hydreringen. I tillegg vises *effektiv* hydrering, som trekker fra
vannet frøene binder — det er den som forklarer hvordan deigen faktisk føles.

**Gjæring & tid** — appens kjerne. Gjæringsdose (GD) er ett tall som gjør ulike kombinasjoner av
gjærmengde, tid og temperatur direkte sammenlignbare. Vil du bake klokka 17 i stedet for klokka 9,
eller kjøkkenet er 26 °C i stedet for 21, sier appen nøyaktig hvor mye gjæren eller tiden må endres
for å treffe samme gjæringsgrad. Referansen hentes fra forvalgets plan — altså fra en prosess du
allerede vet fungerer — og kan når som helst kalibreres mot et bak du selv har logget.

**Deigtemp** — vanntemperatur via ekte varmebalanse, ikke den klassiske 3-faktorformelen (den
overkorrigerer med rundt 4 °C så snart melet ikke holder romtemperatur). Inkluderer ismengde og en
kalibrator som finner din maskins faktiske friksjon.

**Tidsplan** — sett når brødet skal ut av ovnen, få hele prosessen bakover med klokkeslett.

**Steking** — stekeprofiler per brødtype, pluss tre konkrete endringer i din nåværende praksis.

**Teknikk** — notatene dine verifisert mot forskning. Der noe motsier notatene, er det merket ⚠.

**Bakelogg** — logg bak med gjæringsdose, og gjenbruk dosen fra et vellykket bak som mål.

## Modellene bak

- **Temperaturrespons:** utvidet Ratkowsky kvadratrot-modell (T_min 0, T_max 44, c 0,28), som samtidig
  reproduserer «dobling per 8–10 °C» rundt romtemperatur, den observerte ~36× nedbremsingen ved 4 °C,
  og målt optimum på 35,5 °C. En fast Q₁₀ klarer ikke alle tre.
- **Gjærpopulasjon:** logistisk vekst (μ 0,18/t ved 24 °C, tak 2,5 %), som er grunnen til at «halver
  gjæren, doble tiden» bare stemmer for korte og kalde hevinger.
- **Termisk etterslep:** Newton-avkjøling med tidskonstant 3,0 × (kg)^⅓ timer. Dette er den viktigste
  enkeltfaktoren i kaldheving — 75 % av gjæringen skjer i de første 6 timene, mens deigen ennå kjøles ned.
- **Deigtemperatur:** varmebalanse med c_mel 1,81 og c_vann 4,181 kJ/kg·K.
- **Forferment:** fersk gjær % = 7,7 / t^1,33, temperaturjustert, ganget med en stivhetsfaktor som går
  fra 1,0 ved 70 % hydrering til 2,5 ved 50 %. Modellen gir 0,77 % fersk gjær for en 18-timers biga ved
  18 °C og 45 % vann — mot Giorillis ~1 % — og 0,25 % for en 14-timers poolish ved 22 °C.
  Potensloven alene treffer den publiserte tabellen innenfor ca. 15 % over hele spennet 12–18 timer.

## Vannregnskapet, presist

Tre steder kan vann ligge, og appen holder dem fra hverandre:

    vann totalt = vann i deigen + vann i forfermenten + vann frøene binder

«Vann i hoveddeigen» er altså bare det som skal i bollen. Frøene bløtlegges i sitt eget vann ved
siden av. Ved kaldbløt heller du ca. 1,85× det de binder, slik at ingen kjerner blir tørre, og
heller av overskuddet før de går i deigen. Ved skålding heller du nøyaktig det som bindes, og alt
skal med i deigen — det er skåldevannet som bærer sukkerartene skåldingen frigjør. Appen viser
riktig mengde for begge tilfellene.

## Kalibreringen av forvalgene, 29.07.2026

«Formelens mål» er `(2,30 − 0,40×grovt) × (1 − 0,6×forfermentandel)`, altså samme tall
som Bygg brød sikter mot for den melblandingen og den forfermenten.

| Forvalg | Grovt | Forferment | Mål | Dose før | Dose etter | Gjær før | Gjær etter |
|---|---|---|---|---|---|---|---|
| brod_standard | 35 % | – | 2,16 | 2,99 (+38 %) | 2,16 | 0,333 % | **0,234 %** |
| ciabatta | 0 % | 50 % | 1,61 | 1,89 (+18 %) | 1,61 | 0,200 % | **0,168 %** |
| baguette | 0 % | 33 % | 1,84 | 1,53 (−17 %) | 1,84 | 0,367 % | **0,446 %** |
| focaccia | 0 % | 25 % | 1,95 | 2,19 (+12 %) | 1,96 | 0,300 % | **0,266 %** |
| loff | 0 % | – | 2,30 | 2,54 (+11 %) | 2,30 | 0,333 % | **0,299 %** |

Fem av seks lå for høyt; baguettene lå for lavt. Alle treffer nå innenfor 0,15 %.

Merk at dette endrer **referansedosen** i Gjæring & tid, siden den hentes fra forvalgets
plan. Har du logget bak mot den gamle referansen, bruk «Bruk dosen som mål» i Bakeloggen
for å låse den du faktisk likte — et logget, vellykket bak slår alltid et modelltall.

Til sammenligning: publisert snitt er baguetter 1,95, magre brød 1,95, ciabatta 1,99,
og snittet av alle 25 kombinasjonene i Bygg brød er 2,02 — altså 4 % fra 1,95.

## Én viktig korreksjon til notatene

Notatet sier «20 % poolish + 0,5 % gjær, 12–18 timer ved 23 °C, maks 26 timer».
0,5 % er en 3–4 timers poolish, ikke en 12–18 timers — rundt 6 ganger for mye.
Riktig er 0,25 % fersk gjær (0,08 % tørr) for 14 timer ved 23 °C, med hardt tak rundt 19 timer.
Se ⚠-seksjonen under Teknikk for begrunnelsen og hele tabellen.
