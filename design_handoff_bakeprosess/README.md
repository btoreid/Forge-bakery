# Handoff: Forge Bakery — bakeprosessen som mobil-app

## Oversikt

Dette er en komplett omtegning av Forge Bakery som mobil-app: én sammenhengende flyt fra
brødvalg til uttak av ovnen, med et deigregnskap som til enhver tid viser hva deigen faktisk
består av, og hva hvert valg koster eller gir i løft, smak og tid.

Målgruppa er Bjørn og noen bakekamerater — folk som baker ofte nok til å ville forstå
årsakssammenhengene, ikke bare følge en oppskrift. Bærende idé: **hver parameter du kan endre
skal si hva som skjer opp, hva som skjer ned, og hva det koster**.

Repoet det skal inn i: `btoreid/Forge-bakery`, branch `master` (vanilla JS: `index.html`,
`css/style.css`, `js/app.js`, `js/data.js`, `js/engine.js`).

## Om designfilene

Filene i denne pakka er **designreferanser skrevet i HTML** — en fungerende prototype som
viser tiltenkt utseende og oppførsel, ikke produksjonskode som skal kopieres rett inn.
Oppgaven er å **gjenskape designet i repoets eksisterende miljø** (vanilla JS, `js/app.js`
med render-funksjoner mot `js/data.js` og `js/engine.js`) med de mønstrene som allerede
finnes der.

`Forge Bakery app.dc.html` er skrevet i et komponentformat som trenger `support.js` for å
kjøre. Åpne den i nettleser for å se og klikke gjennom designet; les den som kilde for
struktur, tekst og tall. All logikk ligger i `class Component` nederst i fila — datatabellene
(`FF_TYPER`, `TILLEGG`, `TIDSPLANER`, `BRODTYPER`, `PARAM`) er skrevet slik at de kan flyttes
nesten uendret til `js/data.js`.

## Fidelitet

**Hi-fi.** Farger, typografi, avstander og tekst er endelige. Alle tall i grensesnittet
kommer fra faktiske utregninger, ikke fra plassholdere. Gjenskap pikselnært med
designsystemet under «Designtokens».

Ett unntak: teksten i `logikk-tilbakemeldinger.md` beskriver **kjente brister i
beregningsmodellen** som designet ikke løser. De skal fikses i kode, ikke i CSS. Les den
fila før du begynner — særlig L-14, som handler om at forfermenten i dag ikke påvirker
løftindeksen i det hele tatt.

## Skjermer

Appen har seks skjermer i én bunnmeny: **Brødet · Tid · Deigen · Bak · Logg · Oppslag.**
Rekkefølgen er bevisst — tid settes *før* deigen, fordi tidsplanen bestemmer hvor mye av
gjæringsarbeidet forfermenten kan gjøre, og dermed hva slags deig som er mulig.

Over bunnmenyen ligger **bunnlinja**: en alltid synlig stripe med `3600 g deig · 2,14 GD ·
4,33 g gjær · 82 løft · 12,8 t total`. Den er trykkbar og folder ut fullt deigregnskap.

### 1 · Brødet

Velg hva du skal bake og hvor mye.

- Er bakeloggen tom, står et forklaringskort øverst med primærknappen «Start fra forvalget:
  brød på 40 % grovt».
- Under: brødtypelista. **Brød** er én samlet type der grovheten settes i deigen (badge viser
  levende grovhet, f.eks. `40 % GROVT`); **Ciabatta**, **Baguetter** og **Focaccia** er
  kalibrerte deiger med fast hydrering (badge viser vann, f.eks. `82 % VANN`).
- Nederst: **Størrelse** — antall brød og gram per brød som redigerbare tallfelt.
  Feltene klamrer *ikke* mens du skriver (så «9» ikke blir «100» før du er ferdig),
  bare på blur.

### 2 · Tid

Når vil du ha brød? Fire tidsplaner (Optimal, Lang, Kort, Ekspress), hver med sin
ovnsløs-verdi, gjærdose og forfermenttid. Hvert planvalg viser prisen: hvilken forferment
den forutsetter, hvor mange timer, og hva gjærdosen lander på.

### 3 · Deigen

Den tyngste skjermen. Åtte nummererte kort:

1. **Grovhet** — skyver 0–100 %, med brødskalaen (BKLF: fint 0–25,9 · halvgrovt 26–50,9 ·
   grovt 51–75,9 · ekstra grovt fra 76) og en konsekvenslinje som endrer seg med verdien.
2. **Mel** — 21 meltyper med hver sin karakter («Bygger sterkt», «Bryter ned», «Bygger
   svakt»), favorittmerking og ⓘ-info.
3. **Vann** — hydrering 62–86 %, «anbefalt 74 %». Under skyveren en levende konsekvensboks
   med merkelapp: STRAMT (≤68) · TRYGT (≤71) · I VINDUET (≤77) · LØST (≤82) · OVER TAKET.
   Boksen sier også hvor mange prosentpoeng frøene stjeler, når differansen er over 1,5.
4–6. **Frø, korn og smak** — hver rad har prosent, et **redigerbart gramfelt** og ⓘ.
   Gramfeltet løser prosenten ved fikspunkt mot melmengden (fordi melmengden faller når
   tilleggsprosenten stiger — fire iterasjoner er nok).
7. **Salt.**
8. **Forferment** — fire valg i et 2×2-rutenett: Ingen (1 t autolyse i stedet), Poolish
   (tynn røre, 100 % vann, 21 °C), Biga (stiv, 50 % vann, 18 °C), Pâte fermentée
   (gammeldeig med salt, på kjøl). Under valget: en konsekvenslinje som fyller inn
   planens faktiske timer og melandel, en tabell med mel/vann/gjær/modning/salt, og to
   spalter **FORDELER** og **ULEMPER** med tre punkter hver.

   Merk ansvarsdelingen: **planen eier tidsplanen** (`ffTimer`, `ffPctMel`), **typen eier
   karakteren** (hydrering, temperatur, smak, fordeler/ulemper).

### 4 · Bak

Stegkjeden, bygget av `kjede()`: forferment → autolyse → elting → bulk → utbaking →
hevning → steking. Hvert steg har klokkeslett, varighet, hovedtall, en tabell med detaljer,
en **Gjør**-instruks og en **Sjekk**-test (f.eks. trykktesten: gropen skal fylle seg
langsomt over 5–10 sekunder).

### 5 · Logg

Bakeloggen: navn, karakter, bilde, dato. Sannhetskilden appen måler senere endringer mot.

### 6 · Oppslag

Referansestoff: meltyper gruppert med favoritter øverst, teknikknotater (noen merket
«motsier notatene»), stekeprofiler.

## Interaksjon og oppførsel

- **Bunnmeny**: seks knapper, aktiv knapp får gruppens bakgrunnsfarge. Trykk på «Bak»
  nullstiller aktivt steg.
- **ⓘ-knapper**: hvert parameterkort har en ⓘ som folder ut fire tekster — *hvorfor*,
  *OPTIMALT*, *MER ↑*, *MINDRE ↓*. Én åpen om gangen (`state.paramInfo` / `state.tilleggInfo`
  holder id-en).
- **Konsekvenslinjene** er ikke statiske: de regnes ut fra gjeldende verdi hver render, og
  har merkelapp + farge fra aksentrampene.
- **Tallfelt** holder en rå strengverdi mens du skriver (`vektRaw`, `antallRaw`, `gramRaw`)
  og bare den validerte verdien i modellen. Blur rydder rå-verdien.
- **Tid-skjermen** har gjæringsgraf (rate og akkumulert) og deigtemp-kurve, samt
  varmebalanse som regner vanntemperatur ut fra mel- og romtemperatur.

## Tilstand

```js
{
  skjerm: 'brodet',           // brodet | tid | deigen | bak | logg | oppslag
  brotype: 'grovbrod',
  grov: 40, hyd: 75,
  tid: 'lang',                // id i TIDSPLANER
  ff: false, ffType: 'poolish',
  tillegg: { solsikke: 6, linfro: 3 },   // id → prosent av mel
  antall: 4, vekt: 900,
  antallRaw, vektRaw, gramRaw,           // det brukeren skriver, før validering
  startTemp: 24, melTemp: 21,
  maskin: 'spiralHjemme', eltMin: 13,
  paramInfo: null, tilleggInfo: null,    // hvilken ⓘ som er åpen
  aktivSteg: 0,
  loggListe: [], lgNavn, lgKar,
  favoritter: []
}
```

Alt avledet regnes i `regn(state)` — én ren funksjon som returnerer melmengde, total,
effektiv hydrering, gjærdose, løftindeks, brødskalaklasse og forfermentens mel/vann.
`kjede(state, r)` bygger stegene av det. Behold det skillet: ingen utregning i render.

## Designtokens

Designsystemet **Organic** (`_ds/organic-841da930-…/styles.css`). Ikke skriv inn hexverdier —
bruk variablene.

- **Grunn** `--color-bg` #f5ead8 · **tekst** `--color-text` #201e1d
- **Aksent** `--color-accent` #c67139 (terrakotta) · **aksent 2** `--color-accent-2` #7a8a5e (salvie)
- Hver rolle har ramper 100–900: lyse steg (100–300) til tonede fyll og hover, 500 som base,
  mørke steg (700–900) til tekst på tonet fyll. Brødtekst i aksentfarge skal bruke
  `--color-accent-700`, ikke aksenten selv.
- **Type**: Caprasimo (`--font-heading`) over Figtree (`--font-body`).
- **Radius**: `--radius-lg` på kort, `999px` på knapper og felt.
- **Skygger**: `--shadow-sm/md/lg`.
- **Avstander**: `--space-*`.
- **Ikoner**: Lucide, strektykkelse 2,75.
- **Fokus**: `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`
- Minste trykkflate 44px. Tallfelt bruker `font-variant-numeric: tabular-nums`.

## Ressurser

Ingen bilder i designet. Bakeloggen har en bildeplassholder brukeren fyller selv.

## Filer i pakka

- `Forge Bakery app.dc.html` — designet. Åpne i nettleser for å klikke gjennom; les kilden
  for tall og tekst.
- `support.js` — kjøretidsfila designet trenger. Skal **ikke** inn i repoet.
- `logikk-tilbakemeldinger.md` — **les denne først.** Fjorten saker (L-01 … L-14) der
  beregningsmodellen i repoet er feil eller mangler. Hver sak har hva, hvorfor, forslag til
  modell, hvor i repoet det ligger, og status.
- `skjermbilder/` — åtte skjermbilder i rekkefølge: 01 Brødet · 02 Tid · 03–05 Deigen
  (topp, frø og korn, forferment) · 06 Bak · 07 Logg · 08 Oppslag. Bruk dem til å se
  proporsjoner og rytme; hent eksakte verdier fra HTML-kilden, ikke fra bildene.
- `appgjennomgang.md` — hva som mangler eller har brister i appen, ordnet etter prioritet.

## Rekkefølge jeg ville tatt det i

1. Les `logikk-tilbakemeldinger.md`. Flere av sakene endrer datamodellen, og det er
   billigere før UI-et er bygget enn etter.
2. Flytt datatabellene fra designfila til `js/data.js`.
3. Bygg `regn()` og `kjede()` i `js/engine.js` som rene funksjoner.
4. Bygg skjermene i `js/app.js` i rekkefølgen Brødet → Tid → Deigen, som er der
   avhengighetene ligger.
