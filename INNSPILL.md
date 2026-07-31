# Innspill — kø

Bjørns tilbakemeldinger, i den rekkefølgen de kom. Skrives inn med en gang de kommer,
så ingenting lever bare i chatten og køen overlever et øktskifte.

Levert arbeid flyttes ikke ut herfra — det får status **levert** med commit-referanse, og
begrunnelsen for hva som ble gjort står i `CHANGELOG.md`. Avviste eller utsatte punkter
blir stående med hvorfor, så de ikke tas opp igjen fra bunnen av.

**Status:** `åpen` · `pågår` · `levert` · `venter på Bjørn` · `avvist`

**Bøtte** sier hvor endringen lander, og den avgjør hvordan de kan grupperes:

| bøtte | fil | merk |
|---|---|---|
| modell | `js/engine.js` | all utregning — `regn()` / `kjede()` |
| ui | `js/app-v2.js` | tegner kun, regner aldri |
| innhold | `js/data.js` | tall, tekst, fagstoff (les `PARAMETERREVISJON.md` først) |
| infra | `sw.js` · `js/sky.js` · manifest · workflows | |

---

## Åpne

### 1 · Loggen forsvinner når man logger inn — `levert` · bøtte: infra + ui

> «Det er et problem når du logger inn; så får du ikke opp historikken din. Da har jeg
> den borte, og da har man ingen logging igjen.»

Datatap, høyeste prioritet. Årsak funnet i koden, se CHANGELOG.

### 2 · Hardkodet favorittisering av stekeoppsett — `levert` · bøtte: ui + innhold

> «du har favorittisert de rett på stålet pluss glass som klokke, med en hardkodet
> favorittisering. Det bør heller vært sånn at man kan lage og hente favorittene sine
> fra oppslaget.»

Samme klasse feil som ★-merkene i stekeprofilene og «rundbrød» i utstyrsteksten
(begge rettet 30.07): appen bestemmer hva som er best for Bjørn. Favoritt-mekanikken
finnes allerede, men bare for mel.

### 3 · Vanlig steking i ovnen mangler — `levert` · bøtte: innhold + ui

> «jeg tror det mangler vanlig steking i ovnen.»

Stemmer. `UTSTYR` har stål, Pyrex, Pyrex-på-stål, støpejern og stein — alle forutsetter
forvarmet masse. Vanlig stekebrett/rist/brødform, uten stein, stål eller gryte, finnes
ikke. Samme i `BAKE_PROFILES`, der «åpen steking» forutsetter stein/stål.

### 4 · Brød-skjermen: ikoner i stedet for nøkkeltall, ⓘ i stedet for kort — `levert` · bøtte: ui

> «I stedet for å ha om denne bakeprosessen kort under valg av brødtype, kan man heller
> ha det som et informasjonsikon som man kan trykke på for hver type. Det står også
> "Valg brødtype", men det er jo baking som er hva du skal bake. Vi prøver å få til dette
> ikonet med 40% grovt og 82% vann, og sånt er litt dårlig. Jeg tror du heller kan erstatte
> det med ikoner av de forskjellige typene: Brød, kjavatta, baguetta, focaccia.»

Tre ting: «Om dette baket» flyttes fra kollapskort til ⓘ per brødtype · overskriften
skal si hva du skal bake · korttekstene med grovhet/vann byttes ut med tegninger av
brødtypene.

### 5 · Drop «start fra sist», gi loggen «bak dette på nytt» — `levert` · bøtte: ui

> «har man et valg i loggen, så fungerer ikke den første starten fra siste brødet man
> hadde sist. Jeg tror det der er veldig dårlig og misvisende. Jeg mener vi kan droppe
> den starten, det siste brødet, eller hva man snakker om. I stedet kan man ha en knapp
> i loggen som gjør at man kan si "bak dette" på nytt. For eksempel, det er mye bedre.
> Så i starten handler det om: Hva skal du bake?»

Startblokka på Brød fjernes. Loggposter får «Bak dette på nytt». Krever at posten
lagrer selve oppskriften, ikke bare måletallene — det gjør den ikke i dag.

### 6 · Gramvekt per meltype må kunne redigeres — `levert` · bøtte: ui

> «du har tatt bort muligheten for å redigere gramvekten på meltypene. Det er viktig å
> ha muligheten til å redigere gramvekt.»

### 7 · Vann i gram — vis det tydelig, og la det kunne skrives inn — `levert` · bøtte: ui

> «det må komme enklere frem hvor mange gram vann det er, og man må også kunne legge inn
> antall gram med vann man ønsker, som da også påvirker prosenten.»

Samme sak som 6: gram og prosent må kunne redigeres begge veier.

### 8 · «Anbefalt»-knapp på nivåene — `levert` · bøtte: ui

> «anbefalinger. Til nivåer bør det også være mulig å trykke "anbefalt."»
>
> Presisert: «Anbefalinger til nivåer bør det være mulig å velge anbefalt verdi.»

Henger sammen med 6 og 7: når man kan skrive inn egne tall, trengs en vei tilbake til
anbefalingen.

### 9 · Kompensasjonspanelet kan økes i det uendelige — `levert` · bøtte: ui

> «menyen "Hva vil du gjøre med endringen?" har en stor logisk brist. Dersom du trykker
> på "øk" igjen, kan du bare øke og øke og øke og øke. Jeg tror det er viktigere å få
> frem tydeligere den endringsboksen, som kanskje kan poppe opp dersom man gjør en
> endring i den andre delen. Slik at man forstår umiddelbart at denne endringen her vil
> man måtte ta stilling til.»

To ting: knappen må være et valg som kan slås av og på, ikke en akkumulator · panelet
må vise seg når endringen skjer.

### 10 · Forfermentens temperatur og kjøleskapsvalg — `åpen` · bøtte: ui + modell

> «under forferment så må man kunne velge og sette hvordan temp man hever på. Det må
> også være mulig å huke av at fermenteringen skal skje i kjøleskap, og at appen guider
> deg gjennom hvordan dette påvirker tid og effekten av forfermenteringen»

### 11 · Trangt i romtemp-boksen under heveplanen — `åpen` · bøtte: ui

> «under heveplanen er det noen problemer rundt lufta i romtempboksen. Under varme
> balanse, der det blir litt trangt.»

Layout. IKKE gjort ennå — jeg finner ikke sikkert hvilken boks du mener på
skjermbildene mine. Trenger en peker: er det trinn-kortene i heveplanen, eller
romtemp-stepperen under Varmebalanse?

### 12 · Hastighet på eltemaskinen, med faser — `åpen` · bøtte: ui + innhold

> «når det kommer til maskinkjøring av deg, så må det også komme noen indikasjoner til
> hvordan hastighet man skal kjøre på: Lav hastighet · Medium hastighet · Høy hastighet
> det kan også være at man skal kjøre lav hastighet i en periode, og så høy hastighet i
> en periode. Da må man også si det.»

`fart`-feltet i `MASKIN_INFO` finnes, men er én setning prosa. Må bli en faseplan med
minutter, som følger den utregnede eltetiden.

### 13 · Validere friksjonstallet for Ooni Halo Pro — `åpen` · bøtte: innhold

> «har du mulighet til å gjøre en research på Oni Halo Pro og validere om den
> varmegenereringen er riktig?»

Friksjonstallet (°C deigoppvarming per minutt) styrer vanntemperaturen i hele appen.
Skal etterprøves mot kilder og føres inn i `PARAMETERREVISJON.md`.

### 14 · Gjæringsgrafen: 30 grader akkumulert gjæring i kjøleskap? — `levert` · bøtte: ui

> «grafen gjæring over tid. Kan du forklare hvordan man kan nå tretti grader på den
> akkumulerte gjæringen når ting står i kjøleskapet?»

Spørsmål, men ser ut som en ekte lesefeil i grafen: to akser med ulik betydning som
leses som samme skala.

### 15 · «Har du alt i huset?» som steg 1 i prosessen — `åpen` · bøtte: ui

> «punktet. Dette må være i huset; bør egentlig komme som nummer én i prosessen der man
> sjekker at man har alt man trenger.»

En sjekk av ingredienser og utstyr før man starter. Merk: `kjede()` eier de TIDSATTE
stegene — et steg uten varighet må ikke inn der, ellers forskyves alt som leser den.

### 16 · Bunnlinja dekker ikke Androids gestlinje — `levert` · bøtte: ui

> «det er et skjønningsfeil på bunnlinja som gjør at man scroller bort ikonene. Den
> fyller ikke 100 % ut på Android, der du har en bunnlinje som er svart. Der man ofte
> drar opp menyen til Android.»

`env(safe-area-inset-bottom)` + `viewport-fit=cover`. Gjelder installert PWA.

### 17 · Bedre appikon — `åpen` · bøtte: infra

> «ikonet til appen er litt dårlig. Brødbakeikonet. Prøv å lage et bedre ikon som er litt
> kulere. Har du noen skills som kan gjøre det? Eller connections? MCP-greier?»

### 18 · Bakeloggen må høre til kontoen — `levert` · bøtte: ui + infra

> «Så vil fortsatt loggene bak være der. Den bør være koblet til at du er logget inn
> eller ikke.»

Riktig, og en følge av flettingen i #1: loggen ble liggende etter utlogging, og ville
blitt flettet inn i neste konto som logget inn på enheten. Valgt løsning (bekreftet av
Bjørn): **loggen fjernes fra enheten ved utlogging** (etter en verifisert opplasting),
og **bak loggført uten konto utløser et spørsmål ved innlogging** i stedet for å bli
flettet inn i stillhet.

### 19 · Gramfeltet er for firkantet — `levert` · bøtte: ui

> «loksen du har laget med gram er veldig firkantig. Kanskje du skal ha litt rundere
> kanter av den?»

### 20 · «Lagre dette som standardbrød» — `levert` · bøtte: ui

> «lag en knapp som heter "Lagre dette som standardbrød" under loggingen, sånn at man har
> det når man åpner appen som standard, dersom det ikke ligger noe annet der fra før av.»

### 21 · Endret gram på mel: spør hva som skal gi etter — `åpen` · bøtte: ui

> «nå er det sånn at man bare justerer en annen meltype dersom du endrer grammen. Men jeg
> vil ha en pop-up boks som sier hva du vil gjøre når du har endret dette. Vil du redusere
> vetemelet? Vil du øke vannmengden? Og så videre og så videre.»

Endrer #6, som nettopp ble levert: i dag fordeles differansen stilltiende på de andre
meltypene. Skal bli et valg — hvilken meltype som gir etter, eller om deigen skal vokse.

### 22 · Sonefargen bør dekke hele boksen — `levert` · bøtte: ui

> «bokser som har en anbefaling for nivå, kan du gjerne bruke mer av den fargen med
> grønt, gult og rødt i hele boksen i stedet for bare små indikasjoner.»

---

Svar på spørsmålet: nei, ingen av de tilkoblede MCP-ene lager bilder (Coda, Drive, Slack,
Trello, Grafana, GitHub, kalender, reise). Veien er `tester/lag-ikoner.js`, som tegner
`icons/` i Chromium fra en SVG i repoet — altså håndtegnet SVG, så regenerering.

---

## Levert

_(ingen ennå)_
