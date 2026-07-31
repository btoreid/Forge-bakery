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

### 10 · Forfermentens temperatur og kjøleskapsvalg — `levert` · bøtte: ui + modell

> «under forferment så må man kunne velge og sette hvordan temp man hever på. Det må
> også være mulig å huke av at fermenteringen skal skje i kjøleskap, og at appen guider
> deg gjennom hvordan dette påvirker tid og effekten av forfermenteringen»

### 11 · Trangt i romtemp-boksen under heveplanen — `levert` · bøtte: ui

> «under heveplanen er det noen problemer rundt lufta i romtempboksen. Under varme
> balanse, der det blir litt trangt.»

Løst sammen med 36: ny vertikal rytme på stepperne, og tallfeltet utvidet fordi
«24,0 °C» ble klippet til «24,0 °».

### 12 · Hastighet på eltemaskinen, med faser — `levert` · bøtte: ui + innhold

> «når det kommer til maskinkjøring av deg, så må det også komme noen indikasjoner til
> hvordan hastighet man skal kjøre på: Lav hastighet · Medium hastighet · Høy hastighet
> det kan også være at man skal kjøre lav hastighet i en periode, og så høy hastighet i
> en periode. Da må man også si det.»

`faser` i `MASKIN_INFO`: hastighetsplan med minutter regnet av den eltetiden du har
satt. Prosasetningen ligger under som begrunnelse.

### 13 · Validere friksjonstallet for Ooni Halo Pro — `levert` · bøtte: innhold

> «har du mulighet til å gjøre en research på Oni Halo Pro og validere om den
> varmegenereringen er riktig?»

Etterprøvd og ført inn i `PARAMETERREVISJON.md`. 0,40 °C/min er et klasseanslag —
Ooni oppgir ingen verdi, publiserte spiraltall gir 0,42–0,63 for bakerimaskiner.
**Tallet er ikke endret**; i stedet ber appen deg kalibrere din egen (se 38).

### 14 · Gjæringsgrafen: 30 grader akkumulert gjæring i kjøleskap? — `levert` · bøtte: ui

> «grafen gjæring over tid. Kan du forklare hvordan man kan nå tretti grader på den
> akkumulerte gjæringen når ting står i kjøleskapet?»

Ikke en regnefeil. To skalaer deler tegneflate: venstre er deigtemperatur (0–30°),
høyre er akkumulert gjæring (0–100 %). Den grønne kurven ligger på HØYRE akse og er
normalisert mot sin egen sluttverdi, så den ender alltid på taket — som tilfeldigvis
er samme høyde som «30°»-streken. Aksene er nå farget som hver sin kurve og heter
«°C deig» og «% gjæring».

### 15 · «Har du alt i huset?» som steg 1 i prosessen — `levert` · bøtte: ui

> «punktet. Dette må være i huset; bør egentlig komme som nummer én i prosessen der man
> sjekker at man har alt man trenger.»

Ligger nå øverst i Prosess, med «Jeg har alt»-kvittering. Bevisst UTENFOR `kjede()`:
kjeden eier de tidsatte stegene, og et steg uten varighet der ville forskjøvet
klokkeslettene i alt som leser den.

### 16 · Bunnlinja dekker ikke Androids gestlinje — `levert` · bøtte: ui

> «det er et skjønningsfeil på bunnlinja som gjør at man scroller bort ikonene. Den
> fyller ikke 100 % ut på Android, der du har en bunnlinje som er svart. Der man ofte
> drar opp menyen til Android.»

`env(safe-area-inset-bottom)` + `viewport-fit=cover`. Gjelder installert PWA.

### 23 · Smakstilleggene viste «0 g» og kunne ikke justeres i gram — `levert` · bøtte: ui

> «på håndtering må man også få opp gram og mulighet til å justere gram. I dag sier det
> 2% null gram, gir ingen mulighet for å justere noe. Det må være en feil her.»

Ekte feil. Gramverdien ble hentet fra `r.fro`, som bare inneholder frø og korn —
honning, olje, sukker, smør og malt har hvert sitt felt i motoren. Verdien fantes hele
tiden, den ble hentet fra feil sted. Gramfeltet manglet dessuten helt for disse, og med
et steg på 0,5 prosentpoeng var malt (0,05–0,3 %) i praksis ujusterbar.

### 24 · Sonefargen bekreftet — `levert` · bøtte: ui

> «det er mye finere når du har denne grønne grafikken på venstre sida. Det er mye finere
> at du bruker hele boksen i farge.»

Bekreftelse på 22. Behandlingen ligger nå på tilleggsradene og på vann- og saltkortet.

### 25 · Sonefargen som bakgrunn, ikke kantstripe — `levert` · bøtte: ui

> «jeg vil ikke ha denne kanten i det hele tatt, legge fargen som bakgrunnsfarge i boksene
> istedenfor»

Overstyrer 24. Kantstripa er fjernet; fargen ligger i bakgrunnen.

### 26 · Loggen lå igjen etter utlogging — `levert` · bøtte: ui

> «loggen ligger fortsatt i lista, selv om man har logget ut.»

Eksisterende loggposter manglet `konto`-merket, og `!b.konto` leste dem som enhetens.
Skillet går nå på om feltet FINNES: `konto: null` = bevisst uten konto (enhetens),
felt som mangler = eldre post som hele tiden er synket til kontoen.

### 27 · Lokal logg slettet ved utlogging, borte ved innlogging — `levert` · bøtte: ui

> «den lokale loggen slettes selv om man har logget ut. Når man logger inn igjen, er den
> borte. Det må knyttes til kontoen, ikke til den lokale sesjonen.»

Alvorlig. `lagre()` speiler opp til skyen så lenge man er innlogget — så da loggen ble
tømt lokalt FØR utloggingen, ble den tomme lista lagt i kø mot skyen og skrev over
historikken der. Nå: last opp → verifiser → **logg ut** → så endre lokalt. Loggen
ARKIVERES per konto (`forgebakery.v2.logg.<uid>`) i stedet for å slettes.

### 28 · ⓘ må ligge inni brødtype-boksen — `levert` · bøtte: ui

> «grafikken ikonet som ligger til høyre for boksen på "hva skal tilbake" må integreres i
> selve boksene. Du kan også ta bort det check marken, sånn at du får plass.»

### 29 · Kurver: generisk språk, egne mål, og «uten form» — `levert` · bøtte: innhold + ui

> «og kurv, så er det dumt å bruke beskrivelsen ditt vanlige. Det her skal være en generisk
> app. Det må også kunne legges inn hvor lang kurven er i centimeter som en setting. Det
> samme gjelder for … den andre runde kurven. Det bør også være en egen form som er uten
> form, så man bare kan bake brød uten å ha noen form rundt.»

### 30 · Skrivefeil: «kloke», ikke «klokke» — `levert` · bøtte: innhold

> «en skrivefeil på stålet: "glasset som kloke over," ikke "klokke over."»

### 31 · Feil prosent i «tilbake til anbefalt blanding» — `levert` · bøtte: ui

> «Det står 1 prosent når jeg gjør en test, i stedet for 10 prosent, som er det man
> forventer.»

Knappen viste `r.brodskala.pct`, altså brødskalaen for den OVERSTYRTE blandingen. Den
viser nå grovhetstrinnet knappen faktisk gjenoppretter.

### 32 · Kompensasjonspanelet som popup — `levert` · bøtte: ui

> «Den boksen der må komme opp når man gjør en endring. Den må komme opp som en popup i
> vinduet. Den bør ikke ligge på bunnen.»

### 33 · Autolyse som egen boks — `levert` · bøtte: ui + modell

> «under forfermentering, der må autolyse være en egen boks.»

Den lå som en setning under «Ingen forferment», altså usynlig for alle som BRUKER en
forferment. Nå eget valg med egen varighet i `kjede()`.

### 34 · «Mot normalen» er feil ord — `levert` · bøtte: ui

> «så kommer valgene dine mot normalen. Det er ikke noe normalt her. Det er mer hvordan
> valgene i tilleggene påvirker det.»

### 35 · Tidsplanene måtte kunne skilles — `levert` · bøtte: innhold

> «under tid så er en dag og kort omtrent det samme, så det er bedre å si … ekspress,
> samme dag, over natta og optimal.»

Nå: Optimal · Over natta · Samme dag · Ettermiddag · Ekspress.

### 36 · Luft i romtemp- og varmebalanse-boksene — `levert` · bøtte: ui

> «det er fortsatt veldig trangt der man skal ta inn romtemperaturen … samme gjelder
> boksene i varmebalanse»

Løser også 11. Ny rytme på stepperne, og tallfeltet utvidet — «24,0 °C» ble klippet til
«24,0 °».

### 37 · Pil opp på deigregnskapet, og grafen inn i det — `levert` · bøtte: ui

> «pila nedover … bør være en tydeligere pil som peker oppover … Det bør også i det
> panelet legges inn gjæring over tid-grafen.»

### 38 · Kalibrering, førstegangsverdier, kurvmål, autolyse+ff, fire tidsplaner — `levert`

Bjørns svar på de fem spørsmålene fra forrige runde:

> «2 lag et punkt at kalibrering trengs, så gjør jeg det første gang. 3. er siste man
> gjorde som innlogget bruker lagret? Da er det best å bare følge det. For første gangs
> bruk kan du bare bruke 0% grovt og ingen tillegg som standard. Sett også standard
> brødstørrelse til 800 gram. 4. gjør det mulig å sette egne mål og be brukeren sette
> målet første gang. 5. er det noe poeng å ha begge samtidig?»

- **Kalibrering:** egen boks under Varmebalanse som regner (etter − før) ÷ minutter og
  setter din egen friksjon. Vises til den er besvart eller avvist.
- **Førstegangsverdier:** 0 % grovt, ingen tillegg, 800 g. Har du bakt før, kommer din
  egen siste tilstand tilbake gjennom synken.
- **Kurvmål:** appen SPØR første gang, og advarslene gjelder først når målet er ditt.
- **Autolyse + forferment:** ja, det har et poeng, og appen sier nå hvilket — forfermenten
  modnes for seg, autolysen gjelder resten av melet. Klassisk baguettemetode.
- **Fire tidsplaner:** Ekspress · Samme dag · Over natta · Optimal. `kort` er fjernet og
  lagret tilstand migreres.

### 39 · Flimring på mobil — `levert` · bøtte: ui

> «flere plasser i appen så er det flickringsfeil både ved trykk og ikke trykk»

Videoen lot seg ikke dekode her, så feilen ble funnet i koden. Fire kilder, alle rettet:
`100dvh` (adressefeltet på Android endrer den kontinuerlig under scroll) → `100svh` ·
Androids grå tap-highlight → av · modal og bakteppe ble revet ned og bygget opp igjen
ved HVER render, så inn-animasjonen spilte av på nytt for hvert trykk → gjenbrukes ·
`contain: layout paint` på innholdsfeltet.

### 40 · Innlogging først — `levert` · bøtte: infra + ui

> «tenker vi må legge login først, sånn at alt skjer under innlogget konto database. Det
> gjør mindre forvirring og hindrer problematikk.»

Riktig, og det fjerner hele eierskapsproblematikken fra 18/26/27: finnes det ingen
utlogget bruk, finnes det ingen logg uten eier. **Merk prisen:** appen kan ikke lenger
brukes uten konto, og aller første gang kreves nett.

### 41 · Splash i stedet for påloggingsblink ved oppstart — `levert` · bøtte: ui

> «Når man åpner appen etter å ha vært logget inn, kommer et annet bilde opp enn Forge
> Bakery.»

`getSession()` er asynkron, så `Sky.bruker()` er null de første hundredelene — også for
en innlogget. Appen rakk å tegne innloggingsporten før økten var gjenopprettet. Nå vises
en nøytral splash til økten er avklart, med 4 sekunders sikkerhetsnett hvis nettet henger.

### 42 · Dato på tidligere bakeøkter — `levert` · bøtte: ui

> «det er fint å ha dato når man gjorde forrige bak, så man vet cirka når på året det var.»

«14. februar 2026» med månedsnavn, på egen linje. Nylige bak sier «i dag» / «i går» /
«for 3 dager siden». Poenget er årstiden: melet og kjøkkenet er ikke det samme i februar
som i august.

### 43 · Overskriften: stegtall inline, «forberedelse» ut — `levert` · bøtte: ui

> «overskriften på brød med forberedelse, en av tre, har en annen formatering enn de og
> ti. Jeg tenker også at prosessen er det fjerde steget … Slik sparer du plass på toppen,
> og så kan man ta bort ordet "forberedelse."»

Toppfeltet gikk fra 78 til 50 px. Prosess er nå steg 4 av 4.

### 44 · Regnskapsarket flimret fortsatt — `levert` · bøtte: ui

> «det regnskap "pop-upen" flimrer fortsatt.»

Jeg hadde fikset bakteppet, ikke arket. `bl.replaceChildren` på bunnlinja tok arket med
seg ved hver render, så `animation: arkOpp` spilte av på nytt. Både stripa og arket er nå
stabile noder — bare innholdet byttes, og scrollposisjonen beholdes.

### 45 · Autolysen påvirket ingenting — `levert` · bøtte: modell

> «det må jo være en feil av at autolyset ikke påvirker løft og andre parametre.»

Helt riktig — den var en tidsluke uten konsekvens. Nå: inntil 30 % kortere eltetid
(hovedeffekten, og den forplanter seg til friksjon og vanntemperatur) og inntil +4 % løft
(retningen er sikker, størrelsen ikke — derfor forsiktig og ført som anslag i
`PARAMETERREVISJON.md`). Begge metter med tiden.

### 46 · Sletting nådde ikke fram til den andre enheten — `levert` · bøtte: ui

> «dersom jeg sletter en logg på en enhet, så blir den ikke borte på den andre, selv med
> refresh.»

Partisjoneringen i `synkVedInnlogging()` brukte fortsatt `!b.konto` i stedet for
`erUtenKonto()`. Eldre poster falt da UTENFOR kontoens logg og INNENFOR enhetsbøtta
samtidig — og kom tilbake fra bøtta i stedet for å bli filtrert av gravsteinen. I tillegg
hentes skyen nå ned på nytt når appen hentes fram (`visibilitychange`).

### 47 · «Tidligere bakeøkter» — `levert` · bøtte: ui

### 48 · Runde grovhetstrinn — `levert` · bøtte: innhold

> «er det ikke mer naturlig å ha femti prosent, syttifem prosent og hundre prosent grovt?»

Jo — og de treffer Brødskala'ns klassegrenser eksakt: 0 · 25 (topp fint) · 50 (topp
halvgrovt) · 75 (topp grovt) · 100 (ekstra grovt). Melprosentene summerer til 100 på hvert
trinn, og de grove melene til nøyaktig trinnets tall.

### 49 · Samme tekst på 10 % og 25 % — `levert` · bøtte: ui

> «I teksten mellom ti prosent og tjuefem prosent er det ingen forskjell.»

Konsekvensteksten bøttet på Brødskala-klasse, og begge er «fint brød». Nå eier hvert
trinn sin egen beskrivelse.

### 50 · «Legg til meltype» manglet — `levert` · bøtte: ui

> «det mangler en "legg til" knapp på mel, så nå kan man ikke legge til andre meltyper.»

Legg til og fjern, med favorittene merket i velgeren.

### 51 · Hardkodet ★ på melnavn — `levert` · bøtte: innhold

> «regal vetemail har en hardkodet favorittstjerne. Det skal du ikke ha.»

Tre melnavn hadde ★ som «kvalitetsmerke». Samme feil som i stekeprofilene og utstyrslista.

### 52 · Tilbakeknappen lukket appen — `levert` · bøtte: ui

> «dersom man bruker back-knappen på Android … så må man gå tilbake til forrige side, ikke
> lukke appen.»

Historikk per skjermbytte. Overlegg (bilde, modal, regnskap, oppslagsside) lukkes først.

### 53 · Androids kopier/lim-linje spratt opp overalt — `levert` · bøtte: ui

> «driver appen og sender ting til copy-paste på Android? Jeg får opp masse sånne
> copy-paste-ikoner hele tiden.»

`select()` på fokus i gramfeltene markerer hele verdien, og en markering utløser Androids
kopier/lim-verktøylinje. Nå bare når det finnes en presis peker (mus).

### 54 · Egendefinert tidsplan må merkes og valideres — `levert` · bøtte: ui

> «dersom man legger til egne tidsvinduer … må man merke at dette er en egendefinert
> tidsplan. Man må korrigere gjærforhold og andre ting basert på den tidsplanen, og komme
> med varsling dersom den er urealistisk … Det kan hende at en bedre plan er å ikke ha en
> ekspress som tar ni timer eller ti timer; det er for lenge.»

Tre ting. **Merkelapp:** redigerte trinn gir «Egendefinert tidsplan» med vei tilbake.
**Gjær:** løses allerede numerisk mot dine egne trinn — det står nå eksplisitt.
**Varsel:** når dosen står på taket (0,833 % tørrgjær) rekker deigen ikke måldosen
uansett, og da sier appen det — uten å nekte, for en kort plan er et gyldig valg.

**Og hovedfunnet:** «Ekspress» viste 7,9 t fordi totalen inkluderte 3 t nedkjøling og
1,75 t forvarming — likt for hver plan. Planvalget viser nå **tid til brødet er ute av
ovnen**, som er det ordet «ferdig» betyr ellers i appen. Nedkjølingen står som egen linje.

### 55 · Kalibreringen målte noe som ikke finnes ennå — `levert` · bøtte: ui

> «under kalibreringen av maskinen din snakker du om deigtemperatur før elting. Man kan
> ikke måle en deig før den er eltet; da er den ikke en deig. Så da må du heller ha mål
> over fem minutter som en referanse … Og det kan også være at man skal for eksempel si:
> "Kjør på to minutter på 20%, to minutter på 50%, og to minutter på 80%"»

Helt riktig — et termometer i en melhaug måler ingenting. Nullpunktet er nå deigen slik
den er når alt akkurat er samlet, og målingen er tre drag à to minutter på lav, middels
og høy fart. Appen bruker MIDDELS, fordi det er der utviklingen skjer. Deigvekten
registreres med, fordi samme maskin varmer en liten deig raskere per minutt enn en stor.

### 17 · Bedre appikon — `levert` · bøtte: infra

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

### 21 · Endret gram på mel: spør hva som skal gi etter — `levert` · bøtte: ui

> «nå er det sånn at man bare justerer en annen meltype dersom du endrer grammen. Men jeg
> vil ha en pop-up boks som sier hva du vil gjøre når du har endret dette. Vil du redusere
> vetemelet? Vil du øke vannmengden? Og så videre og så videre.»

Endrer #6, som nettopp ble levert: i dag fordeles differansen stilltiende på de andre
meltypene. Skal bli et valg — hvilken meltype som gir etter, eller om deigen skal vokse.

### 22 · Sonefargen bør dekke hele boksen — `levert` · bøtte: ui

> «bokser som har en anbefaling for nivå, kan du gjerne bruke mer av den fargen med
> grønt, gult og rødt i hele boksen i stedet for bare små indikasjoner.»

---

Higgsfield-koblingen laget fire forslag; Bjørn valgte ett (ambolt, glødende snittet
boule, flammer) og lastet det opp selv, siden proxyen her nekter CONNECT til Higgsfields
CDN. Et håndtegnet SVG-alternativ ble laget underveis og forkastet av ham («ikke i
nærheten av å være det samme»).

Kilden ligger som `icons/kilde-ikon.png` (1024×1024) og skaleres av
`tester/lag-ikoner.js` til 192, 512, maskable 512 og apple-touch 180. Maskable-varianten
har motivet krympet til 72 % så det overlever Androids ikonmaske.

---

## Levert

_(ingen ennå)_
