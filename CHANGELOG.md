# Endringslogg — Forge Bakery

Nyeste øverst. Hver post sier **hva** som ble endret, **hvorfor**, og **hvor i koden** —
slik at arbeidet kan tas opp igjen kaldt, uten forhistorien i hodet.

Les `STATUS.md` først for gjeldende tilstand og åpne punkter.

---

## 02.08.2026 — Vekta: 0,01 g ut, og presisjon etter mengde

Bjørn: «min vekt er 0,1 g, ikke 0,01 — ta bort 0,01, det er det ingen som
bruker. Gir f.eks. ikke mening å måle komma-x over 50 gram.»

Vektvalget er nå **hele gram** eller **0,1 g**. Finvekt-trinnet er ute
(`VEKT_TRINN` i js/app-v2.js), og lagret 0,01 migreres til 0,1 i `last()` —
ellers ville valget stått usynlig og gitt oppskrifter med desimaler ingen
pille lenger tilbyr.

I tillegg styrer **mengden** presisjonen: over 50 g vises hele gram uansett
hva vekta kan (`veiG()`: taket var 100 g/1 desimal, nå 50 g/0). Under det er
tidelen ekte informasjon — gjær og malt lever der, og 4,3 g er noe annet enn
4 g. Åtte steder som hardkodet én eller to desimaler på gram (bunnstripa,
regnskapets gjær- og saltrader, forferment-tabellen, «lagres automatisk med
baket») bruker nå `veiG()`, så tallene ikke kan drifte fra hverandre:
gjæren viser «6 g» / «6,1 g» der den før sto som «6,09 g».

Tester i `tester/test-v2.js`: to vektvalg, ingen desimaler på hele gram,
én desimal under 50 g, ingen over — og at lagret 0,01 migreres.

---

## 02.08.2026 — «Start på nytt» på Brød-skjermen

Bjørn: «etter mye baking og endringer er det litt kaos». Nederst på Brød —
bak en bekreftelse som sier hva som skjer — nullstiller knappen oppskriften,
tidsplanen, avhukingene i Prosess og det ulagrede loggskjemaet. Har du et
standardbrød, landes det der, akkurat som ved en fersk oppstart.

`BEHOLD_VED_NYSTART` er en HVITELISTE over det som består: bakeloggen,
favorittene, standardbrødet, utstyret, maskinmålingene og kjøkkenets
temperaturer. Skrevet slik med vilje — et nytt oppskriftsfelt som legges til
senere nullstilles da av seg selv, mens en svarteliste stille ville latt det
overleve. Bilder i det forkastede skjemaet ryddes også ut av Storage-bøtta.
Ti tester i `tester/test-r3.js`.

---

## 02.08.2026 — Bunnmenyen: lik luft rundt punktene

Med like brede kolonner (`flex: 1`) fikk «Tid» 18 px luft på hver side mens
«Forferment» hadde 0,7 og nesten rørte naboen — det Bjørn så som «ikke
balansert». `flex: 1 1 auto` gir hver knapp tekstbredden pluss en lik andel av
det som er til overs, så gapet mellom ordene er det samme hele veien (målt:
8,9–14,4 px mot 0,7–17,8 før). Verifisert på 320, 360, 390 og 430 px — ingen
klipping. Regresjonstest i `tester/test-flytt.js` måler luften på 320 og
390 px og krever at spennet holder seg lite.

---

## 02.08.2026 — Forferment og autolyse som egne steg (3 og 4 av 5)

Bjørn: «for mye scrolling nå». Forferment og autolyse lå som seksjon 8–9
nederst på Deig-skjermen — begge er egne beslutninger med egne konsekvenser
for tidsplanen, og de druknet under mel, vann, frø og salt.

Forberedelsen er nå FEM punkter: **Brød → Deig → Forferment → Autolyse →
Tid**. `SKJERMER` i js/app-v2.js har fått to nye oppføringer med egne titler
(«Poolish, biga eller rett på?», «Hvile før elting?»); `tegnForferment()` og
`tegnAutolyse()` er koblet rett på rendereren og fjernet fra `tegnDeigen()` —
selve boksene er uendret, bare flyttet, så all logikk og alt fagstoff følger
med. Videre-knappen kjeder de fem sammen. Prosess har fortsatt ikke stegtall:
den er gjennomføringen, ikke et forberedelsessteg.

**Ikoner** i samme Lucide-stil som de andre: gjæringskrukke med bobler
(forferment — poolishen som står og arbeider) og timeglass (autolyse — mel og
vann som hviler). Bunnmenyen er nå åtte punkter; skriftstørrelsen er justert
til .58rem så «Forferment» får plass på 390 px uten klipping (målt, ikke
antatt).

Testene som talte seks menyknapper eller «1 av 4» er oppdatert, og de to
UI-testene som leste forferment-/autolyseteksten fra Deig navigerer nå til
riktig skjerm. Alle 9 suitene grønne.

---

## 02.08.2026 — Ærlig logg: redigerbar fullført-tid, lås oppskriften, fullført-merke

Tre vern mot at loggen lyver (Bjørns bestilling):

**Klokkeslettet per steg kan korrigeres.** Man krysser gjerne av lenge etter
at steget faktisk var ferdig, og da lyver både avviket og loggen. Fullførte
steg har nå et redigerbart tidsfelt (`input type=time`, `.steg-tid`) ved
FULLFØRT-pillen; endring nullstiller `avvikOk` så flytt-planen-tilbudet kan
komme opp igjen med riktig avvik. Datoen står — det er klokkeslettet man
retter. Stegnotatene i loggposten bærer nå også selve klokkeslettet
(`ferdig`-feltet, vises som «ferdig kl. 14:32»).

**Lås oppskriften til baket.** Deigen hever i timevis, og appen brukes i
mellomtiden til å prøve og planlegge. Uten lås lagret posten oppskriften slik
appen TILFELDIGVIS sto ved lagring. Knappen «Lås oppskriften til dette baket»
fryser avtrykket og måletallene i `S.lgLaas`; `lagreBak()` bruker de låste
verdiene (også antall/stekeprofil for brød-radene) og nullstiller låsen.
Reversibel («Lås opp — følg appen igjen»), synkes som data.

**Merk baket som fullført.** Når alt er inne (også brød-kommentarene som
kommer timer senere), settes `fullfort` på posten: Rediger og Slett forsvinner
bak en bevisst «Lås opp for å endre», så en ferdig logg ikke køddes til ved et
uhell når appen brukes videre. Reversibel med ett tydelig trykk.

Ny testseksjon ×3 i `tester/test-logg.js`; alle 9 suitene grønne.

---

## 02.08.2026 — Bildene lagres i databasen (Supabase Storage)

Bjørn: «Vi må lagre bildene i databasen. Det gir ikke mening å bare ha dem i
cache.» Før lå bildene som base64 i `bakerstate`-JSON-en: hele raden ble
lastet opp på nytt ved hver endring, og localStorage var det egentlige taket.

**Modellen.** Et bilde er nå `{id, data, sti}` (normalisert i `last()`, også
for gamle poster med rene strenger): `id` er innholdsutledet (samme bilde →
samme id på alle enheter), `data` er den lokale JPEG-en (alt virker offline og
uten konto, som før), `sti` er filstien i den private bøtta `bakebilder`
(`bruker-id/bilde-id.jpg`) når fila er lastet opp.

**Flyten.** `synkBilder()` laster opp hvert bilde som FIL og stempler sti;
`tilSky()` stripper `data` fra opplastede bilder før raden pushes — skyraden
bærer referanser, ikke megabytes. `bildeSrc()` viser lokal data, øktens
nedlastingsminne, eller en plassholder mens fila hentes fra bøtta (annen
enhet). `dataAvtrykk()` ser bevisst bort fra bildenes `data`: en nedlasting
eller rehydrering er ikke en dataendring og skal ikke stemple `oppdatert`.
Ved innlogging rehydreres flettede poster fra lokal data (id-oppslag), så en
strippet skyversjon som vinner duellen ikke koster en ny nedlasting. Sletting
av bilde/rad/post fjerner filene i bøtta (beste forsøk).

**Krever én SQL-kjøring:** bøtta og RLS-policyene står i `SUPABASE.md`
(«Bilder i Storage»). Uten den sier synken fra på norsk og alt virker lokalt.
Tester: objektform + tilSky-stripping i `tester/test-logg.js`.

---

## 02.08.2026 — Kameraknappen: flatt strekikon i stedet for emoji

📷-emojien rendres som fargeglyf fra systemskriften og skar seg mot appens
flate Lucide-ikoner (Bjørn: «stygt»). Ny `kameraIkon()` i samme strektegnede
stil som resten (stroke 2, runde ender) i alle tre velgerne; knappene
flex-sentrerer SVG-en.

---

## 02.08.2026 — Ta bilde direkte: 📷-knapp ved siden av +

Bjørn: «hva skjedde med ta bilde direkte?» Svaret var at det aldri fantes —
alle bildevelgerne var rene filvelgere (`accept="image/*"` uten `capture`),
så på Android landet man i galleriet og måtte lete seg til kameraet derfra.

Alle tre velgerne (bakstbilder i skjemaet, bilder i postredigeringen og
per-brød-radene via `brodBildeRad()`) har nå TO knapper: 📷 med
`capture="environment"` som åpner kamera-appen direkte — brødet står nystekt
på benken, det er dét man vil — og + som åpner galleriet for bilder som alt
er tatt. På PC ignoreres `capture` og begge åpner filvelgeren. Bakstbildenes
inline-stilte +-knapp ble til klassen `.bilde-ny` i samme slengen. Tester på
knappene og capture-attributtet i `tester/test-logg.js`.

---

## 02.08.2026 — Kommentarfeltene vokser med teksten

Bjørn: lange kommentarer i loggen måtte scrolles fram sidelengs. Feltene var
énlinjes `<input>`; nå er alle kommentarfelt voksende textareas — per-brød-
kommentarene (skjema og redigering), postens notat og stegkommentaren på
Prosess. `voksFelt()` (js/app-v2.js) setter høyden lik innholdet på hver
tastetrykk, og render() måler alle `.autovoks` etter oppbygging, så et felt
med lagret tekst åpner i full høyde. CSS: `textarea.autovoks` uten indre
scroll og dra-hank; `.sok`-pilleformen rettes til 14 px hjørner på flerlinjer.

**Latent feil avslørt underveis:** `h()` setter `value` som ATTRIBUTT, og på
en textarea gjør det ingenting — postens notatfelt viste tomt etter neste
render selv om notatet lå trygt i tilstanden. Innholdet står nå som tekstbarn
i alle textareas. Test på vekst + at teksten står etter re-render i
`tester/test-logg.js`.

---

## 02.08.2026 — Historisk deigregnskap: radstilene traff ikke

Skjermbilde fra Bjørn: «Mel totalt1 770 g» — etikett og verdi klistret sammen
i arket fra loggen. Alle radstilene (`.regnskap`, `.regnskap-par`, `.rad`) var
scopet under `.bunnlinje`, og det historiske arket ligger i `#telefon` (Logg
har ingen bunnlinje). Selektorene er omscopet til `.regnskap-ark`, som begge
arkene har — samme stil, én kilde. Testen sjekker KOMPILERT stil (flex +
space-between) på raden i `#loggArk`, så en ny omscoping ikke sniker seg forbi.

---

## 02.08.2026 — Bilder per brød: grensa opp fra 2 til 4

To per brød («skorpe og krumme») holdt ikke i praksis: skorpe, bunn, krumme og
smøreprøven er et helt vanlig bak (Bjørn 02.08). `MAKS_BRODBILDER` i
`js/app-v2.js` er nå 4 — det er localStorage-kvotevernet i `skalerBilde()` som
er den egentlige grensa, ikke tallet. Test på at +-knappen står igjen etter
bilde nummer to i `tester/test-logg.js`. Alle 9 suitene grønne.

---

## 02.08.2026 — Loggen: deigregnskap og hevekurve per post

Bjørns bestilling: en knapp i loggen som drar opp HELE deigregnskapet og
gjæringskurven for et gammelt bak, så historikken kan leses i tall og kurve —
ikke bare i måletallene på kortet.

**Slik virker det.** Hver post med lagret oppskrift (samme felt som «Bak dette
på nytt» bruker) har fått knappen «⌃ Deigregnskap og hevekurve». Den drar opp
samme ark som stripa nederst på Brød/Deig/Tid/Prosess — men regnet ut fra
POSTENS oppskrift: motoren er deterministisk, så `regn()` + `kjede()` på det
lagrede oppskriftsavtrykket gjenskaper regnskapet og kurven nøyaktig slik de
sto da baket ble planlagt. Ingen ny lagring, ingen kopi som kan drifte.

**Implementasjon.** Arkinnholdet er trukket ut av `tegnBunnlinje()` til
`regnskapInnmat(r, K)` (js/app-v2.js) og deles av begge visningene. Det
historiske arket (`tegnLoggRegnskap()`) bytter S til postens oppskrift kun
synkront under utregning/tegning, med tilbakestilling i `finally` — den ekte
tilstanden røres aldri. `vinduStart`/`ferdigMs` nulles med vilje: de peker på
klokkeslett i fortiden, og å strekke planen mot dem i dag ville gitt en annen
kurve enn den som ble bakt etter (arket sier dette selv). Arket bor i
`S.lgRegnskap` (UI-felt, synkes ikke), lukker på Esc, tilbakeknapp, bakteppe
og trykk — og hører til Logg-skjermen: bytter man skjerm, lukkes det.

**Tester.** Ny seksjon i `tester/test-logg.js` (10 tester): knapp, ark med
navn/regnskap/kurve, z-orden over bunnmenyen, uendret gjeldende oppskrift,
Esc- og bakteppelukking. Alle 9 suitene grønne.

---

## 02.08.2026 — Loggen: bilder per brød

Oppfølgeren til «Brød for brød»-radene: hvert brød kan nå få sine egne bilder
(maks 2 — skorpe og krumme), i tillegg til bakstbildene som allerede fantes
(maks 3 per bak). Det er koblingen bilde↔brød som er poenget — «brød 2 i
glassgryta ble slik» er noe helt annet enn tre løse bilder nederst på posten.

**Skjemaet og redigeringen.** Hver brød-rad har en miniatyrrad
(`brodBildeRad()` i `js/app-v2.js`) med fjern-kryss og +-knapp — samme
komponent begge steder, så UI-et ikke må læres to ganger. Bilder kan legges
til og fjernes i ettertid med vilje: krummen fotograferes gjerne først når
brødet skjæres dagen etter. Skjemabildene bor i `S.lgBrod[i].bilder`, lagres
umiddelbart (`lagre()` i skaleringens callback) og sanitiseres i `last()`.

**Lagring.** Skaleringen (480 px JPEG) og localStorage-kvotevernet er trukket
ut i `skalerBilde(fil, ferdig)` og deles av alle bildeveiene — grensene kan
ikke drifte. På posten lagres bildene i `brod[j].bilder`, men feltet utelates
når det er tomt, og et bilde alene gjør radene «verdt» å lagre (`brodVerdt`).

**Visning.** Miniatyrene står under sitt brøds rad i «Brød for brød»-boksen
(56 px, mindre enn bakstbildenes 86 — de skal ikke dominere kortet).
Fullskjermviseren blar nå gjennom ÉN samlet liste (`postBilder()`:
bakstbildene først, så brødenes i radrekkefølge) og skriver «· brød N» i
teksten. Sletteadvarselen teller alle bildene gjennom samme liste — «1 bilde»
når det ryker tre hadde vært en løgn.

**Tester.** Ny seksjon «Bilder per brød» i `tester/test-logg.js` (11 tester):
bilde i skjemarad, bilde alene utløser lagring av radene, tomt felt utelates,
miniatyr på kortet, fullskjerm med brødnummer, legg til/fjern i ettertid,
overlever omlasting. Alle 9 suitene grønne.

---

## 02.08.2026 — Loggen: stekemetode og kommentar per brød

Bjørns bestilling fra testbakingen: fire brød fra samme deig stekes gjerne på
fire måter (klokke, glassgryte, åpent på stålet …), og da er «én metode per
bak» ikke en ærlig logg. Loggskjemaet har nå en «Brød for brød»-seksjon med én
rad per brød i oppskriften (`S.antall`): stekemetode (nedtrekk fra
`BAKE_PROFILES`, standard «Som oppsettet» = gjeldende stekeprofil) og fritt
kommentarfelt. Kommentarfeltene lagrer på blur, av samme grunn som navnefeltet.

**Lagring.** Radene løses ved lagring — '' blir gjeldende `stekeProfil` — og
legges på posten som `brod: [{metode, kommentar}]`, men BARE når de sier noe
(en kommentar eller en avvikende metode); ellers er de støy. Skjemafeltet bor i
`S.lgBrod` (nullstilles av `lagreBak`, sanitiseres i `last()`).

**Visning og redigering.** Posten viser en «Brød for brød»-boks (samme form
som «Fra prosessen»). I redigeringen kan metode og kommentar endres, rader
legges til og fjernes — i ettertid med vilje: brødene stekes til ulik tid, så
kommentaren på brød 3 finnes ofte ikke før timer etter at posten ble lagret.
Radoppdateringene leses fra `S.loggListe`, ikke fra closure — to tastetrykk i
hver sin rad ville ellers overskrevet hverandre.

Kode: `js/app-v2.js` (`tegnLoggBrod`, `settLgBrod`, `stekeMetodeNavn`,
`lagreBak`, `loggPost`, `loggRediger`). Tester: ny seksjon i
`tester/test-logg.js` (14 nye sjekker, alle 9 suiter grønne).

## 02.08.2026 (natt) — Prosesstegene redesignet: kvittering, sjekkliste, plan-korrigering og stegnotater

Bjørns natt-bestilling. Fire nye byggeklosser, alle verifisert i nettleser og
med alle 9 suiter grønne:

**Ingrediens-sjekkliste per steg.** Hvert steg der noe tilsettes har nå en
`ingredienser`-liste i kjeden (forferment, frø-klargjøring, autolyse, elting),
og det aktive stegkortet viser den som avkryssbare rader med navn og gram.
Smakstilleggene (honning, olje, sukker, smør, malt) og de klargjorte frøene
står nå på ELTESTEGET — før var de ikke nevnt på noe steg i det hele tatt.
Tall-radene under er ryddet for duplikater; de har bare det som ikke er
ingredienser (friksjon, arbeid, deigvekt, temperatur).

**Kvittering med grønn hake.** «✓ Alt i — fullfør steget» (huker samtidig av
hele lista) eller «Hopp over» — og først DA får steget grønn hake i
framdriftsprikkene og prosesslista. Å bla forbi teller ikke lenger som gjort.
Angre-knapp finnes. Tilstanden bor i `stegKvitt` (synkes, nullstilles av
nyBakst/bakPaaNytt/lagreBak).

**Plan-korrigering ved avvik.** Fullfører du et steg mer enn 20 min før eller
etter planlagt slutt (eksempel fra virkeligheten: bulken trengte 3 t, ikke 4),
tilbyr kortet «Flytt planen X fram/bak» — ferdig-ankeret justeres, og hele
resten av kjeden følger med (den regnes bakover fra ferdig). «Behold planen»
avfeier tilbudet. I vindu-modus går appen over til ferdig-modus ved justering.

**Stegnotater → loggen.** Hvert steg har et kommentarfelt («hva skjedde?»).
Ved «Lagre baket» følger notatene, hoppede steg og avvikene med inn i
loggposten som `stegNotater`, og vises under «Fra prosessen» på posten —
læringsdataene for neste bak, og for å gjøre appen bedre.

test-r5 oppdatert: to assertions leste mengdene fra `tall`; de bor nå i
`ingredienser`.

Bjørn ba om full release-gjennomgang med en NY agentrekke (teknisk, baker på
stegkjeden, UX for førstegangsbruker, release-ingeniør med live kjøring).
De viktigste fiksene, alle verifisert med røyktest + alle 9 suiter grønne:

**Synk (KRITISK).** `_synkOk` ble aldri satt — den løpende opplastingen var DØD;
endringer nådde skyen bare ved innlogging/fokus. Settes nå etter vellykket
fletting, slippes ved utlogging. Sky-stempelet er nå ENDRINGSTID (statens
`oppdatert`), ikke opplastingstid — en uendret enhet kunne se «nyest» ut og
rulle tilbake ekte endringer. Push ved fokus skjer bare når flettingen faktisk
har noe skyen mangler. Feilet push re-køes (15 s). Feilet nedhenting prøves på
nytt. Kontobytte-vernet (lagretUid) er koblet på: bytter man konto på samme
enhet vinner skyen ubetinget, og forrige brukers poster følger ikke med.
Logg-arkivet leses nå faktisk inn igjen ved innlogging. Full localStorage viser
varig banner (før: stille datatap). Bildekvote-vakten måler alle
forgebakery-nøklene, ikke bare hovedtilstanden.

**Preset-prosessene (KRITISK, baker).** Ciabatta/baguette/focaccia fikk generisk
brødprosess: nå eier presetet forferment-spec-en (Giorilli-biga 50 %),
stekeprofilen (nyBakst), og forme-/snitte-stegene («Del emnene» med skrape for
ciabatta, løse rektangler + uttrekk for baguette, ingen damp/snitt for
focaccia). Focaccia får igjen sine 4 % olje i deigen (ble bare lest av V1).
Dessuten: varm POSTPROOF 30→15 min (ubudsjettert gjæringstid), formbrød vendes
ikke ut ved snitt, lang kaldheving = utildekket 30 min + pose (ikke lærskinn),
skåld får 90 min (varm skåld velter varmebalansen), refPlan-trinnene fikk
utbakt-flagg, varmested-råd når trinn ligger over romtemp.

**Motor.** `isFinite(null)`-fella tettet for romTemp/kjolskapTemp/kjolTemp/
egenFriksjon (romTemp:null ga 0-graders rom). regn()-cachen serialiserer ikke
lenger loggbildene (megabyte per tastetrykk). tilpassVindu gulver til 0,05 t
(0-trinn forsvant ved reload). nyBakst nullstiller tidsvindu + ff-romtemp.
Timerne teller nå ned også uten Notification-API.

**PWA.** sw.js v11: V1-filene (index-v1.html, style.css, app.js) stemples —
V1 deler motor med V2 og kunne kjøre med ny motor + gammel app i 10 min etter
deploy. Fonter + maskable-ikon i skallet. V1-navigasjoner caches under egen
nøkkel (før kunne V1-HTML bli forsiden offline).

**UX.** Manglende CSS-token `--color-accent-2-600` definert (målekrukkas «bak
ut»-merke var usynlig). «Videre: Deig/Tid/Prosess»-knapp på steg 1–3.
Bytt-bekreftelsen rett under kortet man trykket. Tidsoversikten: strek viser
til-ovnen-tid, ny «KLAR»-rad med nedkjølingen. Timer-knappene fikk 44 px
trykkflate. Backup-teksten motsier ikke lenger sky-modellen. Intern sjargong
ute av Oppslag og Logg-tomtilstanden. Bak-navnet lagres på blur. Aria på
bunnstripa og kort-ⓘ.

Åpent etter reviewen (bevisst ikke tatt nå): ordliste-lenker fra sjargong-
etikettene, dynamisk kortnummerering på Deig, offline-testens setOffline-hull,
gravsteins-beskjæring, ffTimer-kontroll i UI, egen preset-heveplan i kjeden.

Bjørn meldte seks punkter med skjermbilder. To var ekte feil (merket FEIL), resten
forbedringer. Alle 9 suiter grønne, V1 kontrollert etter motorendringene.

**FEIL — varmebalansen så ut til å regne feil (den regnet riktig).** «Vann inn
23,1 °C» mot ønsket deigtemp 24 leste som om friksjonen var glemt. Motoren er
ettergått: tallet stemmer — en kald forferment (~690 g fra kjøl) skal også opp til
deigtemp, og det er vannet som må løfte den. Feilen var TEKSTEN, som bare nevnte mel
og elting; av de to alene følger ~17 °C, så leseren kunne ikke få 23 til å stemme.
Regnesetningen i Varmebalanse-kortet nevner nå forfermentens temperatur, og en egen
forklaring vises når den er kald (`js/app-v2.js`, `tegnTid`).

**FEIL — gjæringsgrafens tidslinje stemte ikke med planen.** Grafen startet ved
bulk (f.eks. 23:06) mens vinduet over sa start 10:51 — forfermentens 12 timer var
usynlige. Nå henter grafen forferment-steget fra KJEDEN (samme kilde som stegene,
dynamisk mot alle endringer) og strekker aksen bakover: skravert bånd med navn,
timer og temperatur, pluss forfermentens temperaturkurve (blandes varm → kjøles mot
skapet). Deigens fart/dose-kurver starter fortsatt ved eltingen — forfermenten er
en egen kultur i egen bolle og deler ikke deigens doseskala. Etikettene fikk
kollisjonsvern (smalere bånd → kortere navn, hopp over ved overlapp).
`gjaeringsGraf(pts, r, bulkStart, visNaa, K)` i `js/app-v2.js`.

**Dato + klokkeslett som to native kontroller.** datetime-local føltes som
fritekst på telefon. Ny `datoTidVelger()`: `<input type="date">` + `<select>` med
kvarters oppløsning (eksakt tid utenfor nettet beholdes som eget valg øverst).
Brukt i egendefinert vindu (begge feltene) og «Ferdig»-velgeren. Egendefinert-
kortet ble samtidig lagt i kolonneretning — i .valgkort-raden presset velgerne
kortet bredere enn skjermen. `test-v2.js` oppdatert til de nye kontrollene.

**Timer/Miljø i heveplanen ligger nå UNDER hverandre** — to felt på delt bredde
ble trange på 390 px (`tegnHeveplan`).

**ⓘ-knappen: runding på runding fjernet.** SVG-ikonet er selv en sirkel; knappens
egen ring oppå var dobbel. Ny klasse `.info-knapp.ikon` (uten ramme, ikonet fyller
knappen, trykkflaten uendret). ×- og ★-knappene beholder ringen.

**Hydreringsanbefalingen fikk sikkerhetsmargin (baker-review).** Bjørns spørsmål
«er 78,4 % realistisk å bake ut?» — svar: nei, ikke frittstående. 78,4 var
gryte-med-lokk-anbefalingen klemt HELT opp på sitt eget tak, presentert med
«frittstående»-tekst. Fire endringer i `engine.js`/`app-v2.js`:
`hydAnbefalt` klemmes nå mot `tak − 1,5` (aldri null margin mot flyt-grensen);
lokk-bonusen justert +3 → +2 pp (gryta støtter mindre enn den lovte); benkhevet
uten kurv får `takFri − 3` (kurven holder fasongen, benken gjør det ikke — konsistent
med FORMER-teksten «over ~75 % flyter emnet ut»); og «I vinduet»-teksten sier nå
hvilket OPPSETT den lover for (gryte med lokk / brødform / frittstående). Ny mild
form-nudge også når lokk er på. Bjørns 25 %-blanding: anbefalt 78,4 → 76,2 % i
gryte — midt i bakerens eget råd (75–77).

**Melbiblioteket: Regal ≠ Møllerens, men tallene overdrev forskjellen.** To møller
(Regal = Lantmännen Cerealia, Møllerens = Norgesmøllene), to produkter — beholdes
begge. Men deklarasjonene er 12,0 og 11,2 g protein (verifisert mot matinfo/
matoppskrift 01.08), ikke 13,0/12,2 som sto der; reell forskjell er askorbinsyren,
og notatene sier nå det. «Sterkeste melet i dagligvare» nedjustert (appen rangerer
selv Kolonihagen og Regal Tipo 00 sterkere). Tre gjenlevende «10 kr/kg»-tekster fra
før prisrevisjonen rettet til 17/64 kr, og manitoba-minusens «24 kr/kg» til 62.
Styrkefeltene (som motoren faktisk regner med) er uendret.

Bjørns fulltesting av V2 avdekket én reell modellfeil og en rekke visnings-/logikk-
feil. Alt er fikset, testet og live på `master`. Nyeste arbeid nederst i denne posten.

**Hydreringstaket var bakefaglig feil (KRITISK, verifisert med baker-agent).**
`tak` ganget vannbehovet (`absFaktor`) med strukturen, så FRITTSTÅENDE-taket *steg*
med grovhet (til 88 % på 100 %) — stikk i strid med appens egen tekst «dette er et
formbrød». Modellen anbefalte form-brød-hydrering (81 % på 50 % grovt) til et
frittstående emne på butikkmel, som flyter ut. Nå to separate tak i `engine.js`
(~1471): `takVaat` (absorpsjon, = gammelt tak, gjelder brødform) og `takFri`
(struktur, `76 + (styrkeVektet−4)×4`, uten absFaktor, FALLER med grovhet, gjelder
frittstående/kurv). Gryte med lokk = `takFri+3`. Formvalget (`state.form`/`state.lokk`)
velger. `hydAnbefalt` klemmes mot form-taket. Resultat på Regal: 50 % grovt
frittstående → ~75 % (bakbart) mot 81 % før; brødform → fortsatt 81 %. Nytt varsel
foreslår brødform når vannet blandingen *trenger* overstiger det frittstående bærer
(>40 % grovt / >25 % rug). Eksponert: `takFri`, `takVaat`, `hydBehov`, `rugAndel`.

**Frøvann-forvirringen.** «Effektiv hydrering» viste samme tall som valgt selv med
frø. Bakefaglig korrekt (forbløtte frø får vann på toppen, melet beholder sin
hydrering), men teksten var selvmotsigende. Ny tekst viser melets hydrering +
«samlet deigfukt». Ny **bryter** (`froVannPaaToppen`): «Forbløtt — vann på toppen»
(standard) vs «Tørre frø rett i deigen» (melets effektive hydrering synker, f.eks.
77→60 %). Deigregnskapet: «Vann i deigen» → «Vann i hoveddeigen» + egen linje «Vann
til frøene», så vannet ikke ser ut til å forsvinne når melet krymper.

**Egendefinert tidsvindu (nytt).** Plan-valg «Egendefinert vindu»: sett tidligst
start + senest ferdig, så strekker `tilpassVindu()` det fleksible leddet
(kaldhevingen) til prosessen fyller vinduet og løser gjæren automatisk. Flagger for
korte vinduer. `vinduStart` i OPPSKRIFT_FELT.

**Mindre feil ryddet:**
- Rå floats i steppere («1.834…») → `stepperRad` bruker `fmt` + runder til steg.
- Biga-temp: fjernet stille 16–20-klemming («22 ett sted, 20 et annet»); nå råd i tekst.
- `gradTxt()`: smarte desimaler på temp-etiketter («Kjøleskapet 4 °C» viste 4 mens
  feltet viste 3,5 — samme verdi, to tall). Hydrering på 0,1-rutenett, skyver 0,5-steg.
- Egen melblanding: grovhetspillene lyser ikke lenger feil trinn; header sier «egen blanding».
- Formingsteksten følger formvalget (rund boule / avlang bâtard / brødform) + form-spesifikt snitt.
- Scroll-anker: raden du trykker på (tillegg) holder seg i ro når kort dukker opp over den.
- Timerpanel: fast rekkefølge, så +5/−5 ikke bytter hvilken timer du justerer.
- Mel-raden: gramtall og prosent sentrert over hverandre.

**Åpent:** V1 (`js/app.js`, frosset) har samme gamle takfeil (`takHyd` linje ~951) —
ikke fikset, siden V2 er aktiv. Web Push for varsling med låst skjerm står fortsatt
som mulig neste steg (krever push-server via Supabase).

---

## 31.07.2026 (natt, aller sist) — De ti anslagene er nede i tre

Bjørn: «melprisene har du jo akkurat sjekket, så det finner du vel ut av selv?»

Rimelig innvending. Ti varer ble stående som `prisAnslag:true` fordi de ikke dukket opp
i første søkerunde — men de fantes, de lå bare utenfor dagligvarekanalen. Sju er nå
verifisert:

| vare | anslag | funnet | kilde |
|---|---|---|---|
| Sammalt rug fin | 17,50 | **16,40** | Møllerens 1 kg, Oda |
| Hvetekli | 28,00 | **36,75** | Kruskakli hvete 400 g, Oda |
| Havregryn | 25,00 | **24,45** | Bjørn Lettkokte 1,1 kg, Oda |
| Ruggryn / rugknekk | 26,00 | **78,00** | Skærtoft rugkjerner knekket 500 g |
| Byggflak | 30,00 | **75,00** | Urtekram byggflak 400 g |
| Enkorn | 68,00 | **85,00** | Holli Mølle fin sammalt 1 kg |
| Kikertmel | 101,00 | **109,00** | Biogan øko 1 kg |

**De to store bommene var rugknekk og byggflak** — begge tre ganger for lave. Grunnen
til at de ikke ble funnet først er også grunnen til at anslaget var så galt: de føres
ikke i vanlig dagligvare. De ligger i helsekostleddet, og der koster spesialkorn 70–80
kr/kg, ikke 26. Å lete bare i dagligvare og så gjette resten er å systematisk
undervurdere nettopp de dyre ingrediensene.

**Tre står igjen, og de er anslag av natur:**

- **«Sterkt hvetemel / manitoba (W300+)»** — det finnes ingen norsk forbrukervare i
  klassen. Møllerens og Regal lager den ikke. Realistisk vei er Caputo Manitoba (egen
  rad, verifisert) eller en 25 kg-sekk fra spesialforhandler.
- **«Knekt hvete»** — selges ikke for seg i dagligvare. Priset som Møllerens hvete
  helkorn, som er samme korn.
- **«Annet mel»** — en plassholder for noe som ikke står i lista. Den *kan* ikke ha en
  observert pris; det er hele poenget med den.

Begrunnelsen står i `data.js` ved siden av tallene, ikke bare her — ellers ser det ut
som latskap ved neste gjennomlesning. To nye sjekker i `test-r5.js` vokter at antallet
anslag ikke sniker seg oppover igjen, og at alle frøprisene er verifiserte.

---

## 31.07.2026 (natt, sist) — Opprydding, og en oppdagelse om V1

### Grenene er ryddet

`claude/forge-bakery-mobile-v2-67w83p` er borte. `…-l4ean3` står igjen fordi
git-proxyen i utviklingsmiljøet svarer **403 på branch-sletting** — den kan bare
slettes fra GitHubs eget grensesnitt. Begge var kontrollert til null commits utenfor
`master` før sletting; ingenting går tapt.

### V1 er ikke så frosset som den ser ut

Bjørn ville beholde V1 for historisk formål, og det utløste en sjekk som burde vært
gjort før: **V1 laster `js/data.js` og `js/engine.js` — de samme filene V2 bruker.**

«V1 er frosset» har hele tiden betydd `index-v1.html` og `js/app.js`. Motoren under den
er delt, og den har flyttet seg mye i dag: `KJEDE.ELT` byttet navn til `ELT_FAST`,
`klokke()` fikk nytt format, `hydLoftFaktor` fikk nytt knekkpunkt, forfermentens
gjærdose fikk tak, `regn()` leser nå `romTemp`/`kjolskapTemp`, og 41 kilopriser er
endret. Hver av dem kunne ha knekt V1 uten at noen merket det.

Den ble derfor lastet i nettleser og kontrollert: **ingen JS-feil, rendrer fullt.** Den
har til og med hatt rett hele tiden der V2 tok feil — V1 kalte `maalHeveProsent()`
korrekt og viste «MÅL HEVING 32–38 %» mens V2 sto på hardkodet 60–72 %.

**Regelen framover:** endrer du `engine.js` eller `data.js`, har du rørt V1 også. Last
`index-v1.html` og se etter at den fortsatt tegner. `test-flytt.js` sjekker bare at
inngangene svarer, ikke at V1 regner riktig — den dagen V1 skal være garantert, trengs
en egen suite.

### Hele økten, kort

| tema | hva |
|---|---|
| Delt maskinkalibrering | «mangler kalibrering» i stedet for et klasseanslag; delt tabell med RLS |
| Bakefaglig review | hevemål per grovhet, hydrering mot melblandingen, hoveddeigens gjærdose, tak på forfermenten |
| Steg mot virkeligheten | lokk-råd, «fra kjøl» på varme planer, `state.form`, stegvarigheter, surdeig uten tørrgjær |
| Autolyse | to tidskonstanter i stedet for én |
| Rom og kjøleskap | målinger, ikke valg — gjør ikke planen egendefinert |
| Datoer | kolonner som står under hverandre, ukedager skrevet ut |
| Priser | 41 kilopriser hentet fra Oda, med dato og kilde i appen |
| Infrastruktur | V2 og live flyttet til `master`, grener ryddet |

Ni testsuiter, alle grønne. `test-r5.js` er ny og vokter tallene fra reviewen.

---

## 31.07.2026 (natt) — V2 er flyttet til `master`

Bjørn: «burde vi merget til main nå og jobbet derfra, så det ikke blir noe forvirring
framover?»

Ja. Til nå har repoet hatt to sannheter: hele V2 lå på
`claude/forge-bakery-mobile-v2-l4ean3` og Pages deployet den grenen, mens `master` —
standardgrenen — fortsatt bare hadde V1 og supabase-ping-workflowen. Det er en felle som
venter på å smelle, av tre grunner: planlagte workflows kjøres **kun** fra
standardgrenen (derfor måtte ping-fila ligge et helt annet sted enn koden den pinger
for), hver ny økt måtte få beskjed om hvor den skulle pushe, og «hva er egentlig live»
hadde ikke et opplagt svar.

Rekkefølgen som ble brukt, og hvorfor: `master` hadde én commit `l4ean3` manglet
(workflow-fila). Den ble hentet inn i `l4ean3` FØRST, så `master` kunne fast-forwarde i
stedet for å få en merge-commit — historikken forblir lineær, og det er lettere å lese
tilbake i.

**Rekkefølgen på selve byttet er den farlige biten.** Pages ble pekt om til `master`
mens `master` fortsatt var V1, så i noen minutter serverte live den gamle appen.
Riktig rekkefølge er å pushe `master` først og flippe Pages etterpå — da ser ingen noe
til overgangen.

Fra nå: `master` er standardgren, det som er live og det som utvikles.
`…-l4ean3` og `…-67w83p` står igjen som historikk, begge inneholdt i `master`.

---

## 31.07.2026 (natt) — Databasesjekk i appen

Bjørn: «tror jeg kjørte feil query først … har kjørt begge nå. sjekker du at det ble
riktig?»

Jeg kommer ikke til Supabase fra dette miljøet — proxyen blokkerer `supabase.co`, både
fra skallet og fra Chromium i containeren. Så det måtte løses to andre veier.

**1 · Kontrollspørring i `SUPABASE.md`.** Ni linjer med ✅/❌: at begge tabellene finnes,
at RLS er på begge, at `bakerstate` har fire policyer, at `maskinkalibrering` har én
select-policy og to skrivepolicyer, at e-posten faktisk står i begge skrivepolicyene, og
at det IKKE finnes en slettepolicy. Pluss en spørring som lister alt i `public`, så man
ser om noe ble liggende igjen fra en feil kjøring.

**2 · «Sjekk databaseoppsettet» i Logg → Konto og sky.** Grunnen til at dette trengs i
appen og ikke bare i SQL Editor: SQL-en kjøres for hånd, én gang, og går den halvveis
gjennom **sier appen ingenting**. Den faller pent tilbake på anslagene og fortsetter —
riktig oppførsel i bruk, og ubrukelig når man skal finne ut om det ble riktig.

`Sky.sjekkOppsett()` leser én rad fra hver tabell og skiller de tre utfallene fra
hverandre, som er hele poenget: PostgREST svarer `PGRST205`/«schema cache» når tabellen
mangler, 200 når den finnes (også tom), og en annen feilkode når RLS avviser. Uten det
skillet leses «finnes ikke» og «du får ikke lov» som samme sak — og de krever motsatt
handling.

Panelet skriver ✅/❌ per tabell og hva man gjør med et ❌. Den skriver ingenting til
databasen, så den kan trykkes så mange ganger man vil. `dbSjekk` ligger som modulvariabel
utenfor `S`, i likhet med `skyForm` — en diagnose er ikke data og skal ikke synkes.

Tre nye sjekker i `test-r5.js` med stubbet Sky. Service worker til `forgebakery-v6`.

**Fjernet igjen samme kveld.** Begge tabellene svarte grønt, og da er knappen ikke
lenger et verktøy — den er en permanent påminnelse om et engangsproblem. Bjørn: «det er
bare støy.» Riktig: en diagnose som har gjort jobben sin skal ut, ellers samler appen
opp knapper ingen trykker på. Kontrollspørringen i `SUPABASE.md` står igjen, for den
koster ingenting å ha liggende og er der man leter når man setter opp på nytt.

---

## 31.07.2026 (kveld, sent) — Melprisene hentet fra nett, ikke arvet fra regnearket

Bjørn: «under kostnad må du også kontrollere at det ikke er hentet fra mitt gamle
regneark, men at det faktisk er hentet fra nett med cirka oppdaterte priser 2026.»

Det var arvet fra regnearket, og feilen var ikke bare at tallene var gamle — den var
**systematisk skjev**:

| mel | før | nå | |
|---|---|---|---|
| Siktet hvetemel (Møllerens/Regal) | 10,00 | 17,00 | ikke hyllepris på mange år |
| Sammalt hvete fin | 18,00 | 17,90 | traff |
| Sammalt rug fin | 30,00 | 17,50 | var nesten dobbelt for høy |
| Sammalt rug grov | 30,00 | 16,70 | samme |
| Durum semola (Caputo) | 24,00 | 66,40 | var under en tredel |
| Bokhvetemel | 110,00 | 159,80 | |
| Spelt siktet | 41,00 | 47,30 | |
| Svedjerug sammalt | 54,00 | 56,40 | traff |
| Havremel | 27,50 | 32,90 | |
| Emmer siktet | 38,00 | 64,90 | var nesten halv pris |

Retningen på skjevheten er verdt å merke seg: **siktet mel var satt for billig og rug
for dyrt**, altså i motsatt retning av virkeligheten. «Hva koster det å bake grovt»
ga derfor feil svar begge veier.

Kilde er **Oda.no**, som oppgir kilopris per vare og dermed er sammenlignbar på tvers
av pakningsstørrelser, supplert med Meny for 2 kg-posene av siktet hvetemel (der Odas
1 kg-boks ikke er det folk faktisk kjøper). Frø og gryn er hentet samme sted.

Ti varer lot seg ikke slå opp — sterkt hvetemel/manitoba (generisk), enkorn, kikertmel,
havregryn, ruggryn, knekt hvete, hvetekli, byggflak, «annet mel» og sammalt rug fin.
De står med `prisAnslag:true`, og **appen sier det**: melkortet skriver nå hvor prisene
er hentet og når, og navngir dem som bare er anslått. Samme prinsipp som «mangler
kalibrering» på maskinene — et tall uten dekning skal ikke se ut som et tall med.

Et 800 g grovbrød koster nå 9–11 kr i mel mot 8 kr før; en ren loff 8 kr.

`PRIS_HENTET` og `PRIS_KILDE` i `data.js` er datoen og kilden, eksponert så UI-et kan
vise dem. Seks nye sjekker i `test-r5.js` vokter at ingen pris faller tilbake til et
åpenbart utdatert nivå.

---

## 31.07.2026 (kveld) — Bakefaglig review: fire ting appen sa som ville ødelagt brød

Bakeren, den tekniske revieweren og databasereviewen leverte hver sin liste. Dette er
oppgjøret med de bakefaglige kritikalitetene — de som ikke bare irriterer, men gir et
dårligere brød.

### 1 · Hevemålet var hardkodet 60–72 % for ALT

`kjede()` skrev «Mål stigning 60–72 %» i hvert eneste gjæringstrinn, uansett brød.
Det er riktig for en loff og direkte skadelig for et grovt brød: grovt mel har mindre
sammenhengende gluten å holde på gassen, og heves det til 70 % har man ikke et luftig
brød, man har et som faller sammen i ovnen.

`maalHeveProsent()` i `engine.js` har regnet det riktige tallet hele tiden — V2 spurte
aldri. Nå gjør den det, mot deigtemperatur, hydrering, grovandel, melstyrke og om
deigen skal på kjøl:

| grovhet | mål stigning |
|---|---|
| 0 % (loff) | 54–65 % |
| 25 % | 41–49 % |
| 50 % | 33–39 % |
| 100 % | 18–22 % |

### 2 · Hydreringen fulgte ikke melblandingen

Appen anbefalte **74 %** uansett hva som lå i bollen, og advarte om «over taket» fra
rundt 75 % på grove blandinger. Kli og fullkorn suger 16–19 % mer vann enn siktet
hvete, så på 100 % grovt er 74 % en stram, tørr deig — og appen advarte altså mot
nettopp den hydreringen den selv burde anbefalt.

Anbefaling og tak følger nå blandingens absorpsjonsfaktor. Over grovhetstrappa:
75 → 77 → 78 → 81 → 84 → 86 % anbefalt, med taket 3–4 poeng over. Merkelappene
STRAMT / TRYGT / I VINDUET / LØST / OVER TAKET måles mot melet i stedet for mot faste
tall, så en 86 % fullkorndeig leses som «i vinduet» mens en 86 % loff fortsatt leses
som over taket. Skyveren går til 88 %, siden 86 ikke lenger var nok til å nå appens
egen anbefaling.

`hydLoftFaktor` hadde i tillegg en kant: det flate optimumet sluttet på hardkodet 78 %
selv når melets tak lå lavere, så en svak blanding fikk full uttelling til 78 og et
fall på fem løftpoeng over ett prosentpoeng vann. Optimumet slutter nå ved 78 **eller**
taket, det som kommer først.

### 3 · Gjærmengden var totalen — også når forfermenten hadde tatt en tredel

Med forferment viste appen `gjaerTotal` som «gjær». Veide man opp det tallet i
hoveddeigen, fikk man **inntil 35 % for mye gjær**, fordi forfermenten allerede hadde
tatt sitt. `gjaerHoved` fantes i motoren og ble vist ingen steder.

Eltesteget sier nå «Tørrgjær nå» med hoveddeigens dose først, og forfermentens i
parentes under. Deigregnskapet viser tre linjer i stedet for én: hoveddeigen,
forfermenten, totalen.

### 4 · Kjøleskapsknappen på forfermenten ga 15,9 % fersk gjær

Modellen holder modningstiden fast og løser gjæren mot temperaturen. Setter man en
12-timers poolish i kjøleskapet, er svaret matematisk riktig og bakefaglig umulig:
5,3 % tørrgjær av forfermentens mel. En kald biga kjøres på ca. **1 %** fersk.

Dosen har nå et tak på 2 % fersk. Advarselen som skulle fanget dette sto på «2» og ble
sammenlignet med en *tørrgjærprosent* — altså 6 % fersk, tre ganger for høyt, så den
slo aldri inn. Appen klemmer dosen, sier at forfermenten da blir mindre moden enn
planen regner med, og tilbyr den ene løsningen som finnes: lengre modningstid (ny
`ffTimer`) eller varmere plass.

### Og de mindre, men like konkrete

- **Autolysesteget ba deg blande ALT melet** — også forfermentens, som står i en bøtte
  og modner. Nå hoveddeigens mel.
- **«Temperer og snitt · fra kjøl» sto på varme planer.** På Samme dag og Ekspress er
  siste trinn en utbakt etterheving i romtemperatur. Eget steg nå: «Snitt og sett inn».
- **Stekesteget sa «lokket/gryta gjør jobben»** for stekebrettet, fordi testen sto på
  damp-teksten og både gryta og brettet sier «ingen tilsatt». Profilene har nå et
  `lokket`-flagg, og brettet får rådet det trenger: lag dampen selv.
- **`kjede()` leste aldri `state.form`.** «Uten form» fikk beskjed om å legge emnet i
  hevekurv med god side ned. Alle stegtekstene følger nå formvalget.
- **Brødform pekte på åpen steking på stein ved 270 °C.** Den peker nå på `brett`,
  som er det oppsettet en brødform faktisk står i.
- **Stegvarighetene var satt på slump:** elting 75 min (nesten dobbelt — nå 25 min pluss
  din egen eltetid), forming 25 min (nå 40), risting av frø 15 min (nå 25, de skal
  kjøles også).
- **Wh/kg-dommen sto på håndelting.** Målsonen 3–8,3 Wh/kg er fra spiralelting; for hånd
  er tallet lavt av natur, og «under målsonen» leste som en feil å rette — der svaret
  ville vært å elte hardere, som er nøyaktig feil råd.
- **Surdeigsvalget doserte tørrgjær i levainen.** En levain med tørrgjær i er ikke en
  levain. Den podes nå med moden starter, 20 % av levainens mel.

### Autolyse: én tidskonstant kunne ikke være riktig for to prosesser

Bjørn: «du kan ikke mene at det å ha autolyse i 30 minutter eller 1–2 timer har ingen
effekt … Her må du sjekke fagstoffet.»

Modellen brukte én metningskurve for alt. Autolyse er to ting i hver sin fart:
**hydrering** (τ ≈ 20 min — 78 % ferdig etter en halvtime; gir kortere elting og mykere
deig) og **proteolyse** (τ ≈ 90 min — 28 % etter en halvtime, 74 % etter to timer; gir
strekkbarhet). Med én felles konstant måtte modellen ta feil om minst én av dem.
Panelet viser nå begge, så valget mellom en halvtime og to timer er opplyst.
Se `PARAMETERREVISJON.md`.

### Rommet og kjøleskapet er målinger, ikke valg

Bjørn: «det å endre temperaturen på rommet må jo ikke endre planen til å være en
egendefinert tidsplan», og «rommet mitt er ikke 22 grader hele tiden».

Plantabellens temperaturer er nominelle. Eneste vei til å endre dem gikk gjennom
heveplan-editoren — som merket planen «egendefinert», altså straffet deg for å svare
ærlig på hva termometeret viser. Varme trinn forskyves nå med `romTemp − 24`, kalde
trinn settes til `kjolskapTemp` (ny innstilling), og ingen av delene rører planen.

Forfermenten holder rommets eller kjøleskapets temperatur — ikke sin egen. Den har
ingen egen før den har stått en stund, og ingen måler den.

### Delt maskinkalibrering

Friksjonstallene i `MASKIN_INFO` er klasseanslag, ikke målinger — for Ooni Halo Pro
finnes ingen produsentoppgitt verdi i det hele tatt. Panelet viste dem likevel som om
de var maskinens egne. Det står nå **«mangler kalibrering»** til noen faktisk har målt.

Har man målt sin egen, kan målingen deles: ny tabell `maskinkalibrering` i Supabase,
lesbar for alle innloggede, skrivbar bare for e-posten som eier repoet (RLS, og ingen
slettepolicy). Rangeringen i motoren er egen måling → delt måling → anslag.

### Datoer og ukedager

- Start/ferdig-oppsummeringen er nå et rutenett med faste kolonner: ukedag under ukedag,
  dato under dato, klokkeslett under klokkeslett. Som løpende tekst forskjøv alt seg
  fordi ukedagene har ulik lengde.
- «du starter fre og er ferdig lør» skrives ut: **fredag**, **lørdag**.
- Stegtidene sto som «fre. kl. 19:57». Nå «FRE 19:57» — store bokstaver sier at det er
  en forkortelse, og punktumet midt i en tidsangivelse var bare støy.

### Tester

Ny suite `tester/test-r5.js` (33 sjekker) vokter hvert tall over: hevemålet per
grovhet, hydreringsanbefaling og tak mot melblandingen, at løftkurven ikke har kant,
hoveddeigens gjærdose, forfermentens tak, at levainen ikke får gjær, at rom- og
kjøleskapstemperatur flytter trinnene uten å gjøre planen egendefinert, og at
stegtekstene ikke lover utstyr man ikke har. `test-v2` og `test-r4` er oppdatert der
de festet seg til tall som nå er blandingsavhengige. Alle 9 suitene grønne.

Service worker til `forgebakery-v5`.

---

## 31.07.2026 (natt) — Innlogging først, flimring, og svarene på de fem spørsmålene

### Innlogging er nå en port foran hele appen

Bjørn: «tenker vi må legge login først, sånn at alt skjer under innlogget konto
database. Det gjør mindre forvirring og hindrer problematikk.»

Det er riktig, og det fjerner en hel klasse problemer med ett grep: finnes det ingen
utlogget bruk, finnes det ingen loggpost uten eier, ingen sammenblanding på delte
enheter og ingen «hvem tilhører denne posten». Alt eierskapsarbeidet fra i dag
(gravsteiner, enhetsbøtte, arkiv per konto) står igjen som sikkerhetsnett, men det er
nå situasjoner man normalt ikke havner i.

`skalKreveInnlogging()` tegner porten i STEDET for appen — ikke oppå den. Da finnes det
ingen vei rundt og ingen halvferdig tilstand bak et overlegg.

**Prisen, som er verdt å vite:** appen kan ikke lenger brukes uten konto, og aller
første gang kreves nett. Etter innlogging holder Supabase økten ved like, så offline
fungerer som før.

Testene kommer forbi porten med `window.__FB_TEST_INGEN_PORT`, satt med Playwrights
`addInitScript`. Ingen produksjonskode setter den.

### Flimringen

Meldt som «flere plasser i appen så er det flickringsfeil både ved trykk og ikke trykk».
Videoen lot seg ikke dekode i dette miljøet (Chromium mangler H.264), så feilen ble
funnet i koden. Fire kilder:

1. **`height: 100dvh` på telefonrammen.** `dvh` følger nettleserens dynamiske høyde, og
   den endrer seg kontinuerlig mens adressefeltet på Android glir inn og ut under
   scroll. Rammen har fast `height` og `overflow:hidden`, så hver piksel adressefeltet
   flytter seg utløste en ny layout av HELE appen. Det er flimringen uten å ta på noe.
   → `100svh`, den minste høyden, som står stille.
2. **Androids tap-highlight.** Et grått felt som blinker over hele knappeflaten ved
   trykk. Appen har sin egen `:active`. → av.
3. **Modal og bakteppe ble revet ned og bygget opp igjen ved HVER render**, så
   inn-animasjonen spilte av på nytt for hvert trykk. → gjenbrukes; bare innholdet
   byttes.
4. **Ingen `contain` på innholdsfeltet**, så hele rammen måtte regnes om ved hver
   `replaceChildren`. → `contain: layout paint`.

### Svarene på de fem spørsmålene

- **Kalibrering av eltemaskinen** er nå en egen boks under Varmebalanse: tre tall inn
  (temp før, temp etter, minutter), `(etter − før) ÷ min` ut, og knappen setter din
  egen friksjon. Den vises til den er besvart eller avvist. Bakgrunnen er
  Ooni-gjennomgangen: 0,40 °C/min er et klasseanslag, ikke en måling.
- **Førstegangsverdier:** 0 % grovt, ingen tillegg, 800 g per brød. Sto på 40 % grovt
  med solsikke og linfrø — altså en ferdig oppfatning om hva brukeren skulle bake,
  servert som «standard».
- **Kurvmål:** appen SPØR første gang i stedet for å måle mot en antatt standard, og
  advarselen «emnet er for stort for kurven» gjelder først når målet er ditt.
- **Autolyse og forferment samtidig** har et poeng, og appen sier nå hvilket:
  forfermenten modnes for seg og gir smak, autolysen gjelder RESTEN av melet og bygger
  gluten uten at gjæringen starter. Klassisk baguettemetode.
- **Fire tidsplaner, ikke fem:** Ekspress · Samme dag · Over natta · Optimal. «Én dag»
  (8–9 t) og «Kort» (4–5 t) beskrev omtrent samme sak. `kort` er fjernet, og lagret
  tilstand med `tid:'kort'` migreres til `dag` i `last()`.

### Appikonet

Bjørn lastet opp motivet han valgte. Kilden ligger som `icons/kilde-ikon.png`
(1024×1024) og skaleres av `tester/lag-ikoner.js` til 192, 512, maskable 512 og
apple-touch 180. Maskable-varianten har motivet krympet til 72 % så det overlever
Androids ikonmaske.

---

## 31.07.2026 (kveld) — Sytten punkter til, og loggen som endelig hører til kontoen

Bjørn matet inn tilbakemeldinger fortløpende gjennom hele økta. Alle 38 står i
`INNSPILL.md` med hans egen ordlyd. Verifisert: `test-r4.js` utvidet til 85 sjekker,
alle åtte suiter grønne, skjermbilder av hver visuelle endring.

### Loggen ble slettet lokalt OG i skyen — den alvorligste feilen i runden

Meldt i to trinn: «loggen ligger fortsatt i lista, selv om man har logget ut», og så
«den lokale loggen slettes selv om man har logget ut. Når man logger inn igjen, er den
borte.»

To ulike feil, begge innført av forrige runde:

**1 · Eldre loggposter ble lest som enhetens.** De har ikke `konto`-feltet i det hele
tatt, og `!b.konto` er sant for både `null` og «finnes ikke». Skillet går nå på om
feltet FINNES (`erUtenKonto`): `konto: null` er en post man bevisst loggførte utlogget,
mens en post uten feltet er eldre enn eierskapet og har hele tiden blitt synket opp til
kontoen — den hører hjemme der.

**2 · Utloggingen la en TOM logg i kø mot skyen.** `lagre()` speiler opp så lenge noen
er innlogget, debouncet 1,2 s. Rekkefølgen var: tøm loggen lokalt → lagre → logg ut.
Den lagringen la den tomme lista i kø, og et sekund senere skrev den over historikken i
skyen. Rekkefølgen er nå: last opp → **verifiser** → logg ut → så endre lokalt.

Og viktigst: **loggen slettes ikke lenger i det hele tatt.** Den ARKIVERES per eier i
`forgebakery.v2.logg.<uid>` (og `…logg.enhet` for bak uten konto). Utlogging flytter
den dit; innlogging henter den ut igjen, også uten nett.

### Hva skal gi etter når du endrer gram på en meltype?

Appen fordelte differansen på de andre meltypene uten å si fra — ett rimelig svar av
tre. Nå spør den, med ett valg per alternativ: alle andre deler på det · én bestemt
meltype gir etter · ingen, la deigen endres. `settMelGramMot()` og
`settMelGramMerDeig()` i engine.js. Merk at retningen står riktig i teksten: reduserer
du en meltype og ingen skal ta over, **krymper** deigen.

### Forfermentens temperatur, og hva kulda faktisk koster

`S.ffTemp` med hurtigvalg for rommet og kjøleskap. Gjærdosen løses allerede mot
temperaturen i motoren, så dette er avlesning, ikke en ny regel. Ny `ffTidEkvivalent()`
svarer ærlig på hva kulda gjør: samme modning krever `t · rate(T1)/rate(T2)`.

Og appen sier fra når regnestykket blir meningsløst: en poolish satt på 4 °C med samme
tid krever over 2 % gjær på sitt eget mel. Da er svaret matematisk riktig og bakefaglig
tull, og det skal stå.

### Autolyse ble et eget steg

Lå som en setning under «Ingen forferment» — usynlig for alle som bruker en forferment,
enda kombinasjonen er helt vanlig. Nå egen boks med egen varighet i `kjede()`, så den
skyver tidsplanen slik den faktisk gjør på kjøkkenet.

### Resten

- **Kompensasjonspanelet er en modal.** Et spørsmål som ligger og venter nederst i en
  rulleliste blir ikke stilt.
- **Hastighet på maskinen som faseplan** med minutter regnet av eltetiden, ikke én
  prosasetning. `faser` i `MASKIN_INFO`.
- **«Dette må være i huset» ligger først i Prosess.** Å oppdage at melet ikke rekker
  etter at forfermenten står, hjelper ingen. Den ligger med vilje UTENFOR `kjede()` —
  kjeden eier de tidsatte stegene.
- **Kurver:** «ditt vanlige» er ute (appen vet ikke hva som er noens vanlige), kurvens
  mål i cm er en innstilling per form, og **«Uten form»** finnes som valg.
- **Deigregnskapet:** pila peker opp — det er retningen arket kommer fra — og
  gjæringsgrafen ligger i arket. Regnskapet sier hva deigen ER, grafen hvordan den
  kommer dit.
- **Sonefargen som bakgrunn**, ikke kantstripe. Kantstripa ble prøvd først og forkastet.
- **Luft i stepperne.** Tallfeltet ble samtidig utvidet: «24,0 °C» ble klippet til
  «24,0 °» — samme felle som da +/−-knappene «ikke virket» fordi feltet mellom dem var
  to piksler bredt.
- **Tidsplanene** heter Optimal · Over natta · Samme dag · Ettermiddag · Ekspress.
  «Én dag» og «Kort» beskrev omtrent samme sak.
- **ⓘ ligger inni brødtype-boksen**, hakemerket er ute.
- **Skrivefeil:** «kloke», ikke «klokke».
- **«Mot normalen»** → «Hva tilleggene gjør med brødet».
- **Smakstilleggene** viste «0 g» og manglet gramfelt — verdien ble hentet fra `r.fro`,
  som er frø og korn.

### Ooni Halo Pro-friksjonen er etterprøvd, og IKKE endret

Full gjennomgang i `PARAMETERREVISJON.md`. Kort: 0,40 °C/min ligger i nedre kant av det
kildene støtter (publiserte spiraltall gir 0,42–0,63 °C/min), og Ooni oppgir ingen verdi
for Halo Pro. Å flytte tallet ville vært å bytte ett ukildet tall med et annet — appen
har allerede «Egen (kalibrer)», som er det eneste presise svaret. Notatet i maskinpanelet
sier nå rett ut at 0,40 er et klasseanslag.

### To feller som veltet oppstarten under arbeidet

Verdt å skrive ned, for begge ga en helt hvit app:

- **`appendChild(null)` kaster.** `h()` tåler null-barn; `appendChild` gjør det ikke.
- **En `const` er i TDZ selv om funksjonen som bruker den er hoistet.** `let S = last()`
  kjørte før `const FABRIKK_FELT` var initialisert.

---

## 31.07.2026 (senere) — Loggen hører til kontoen, og fire punkter til

### Bakeloggen ble liggende igjen på enheten

Følgefeil av flettingen tidligere samme dag, meldt av Bjørn: «loggene bak vil fortsatt
være der — den bør være koblet til at du er logget inn eller ikke.» Riktig, og verre enn
det: siden loggen nå FLETTES, ville den blitt flettet inn i neste konto som logget inn
på enheten.

Modellen er to eierskap, ikke ett:

- post med `konto: <uid>` → hører til kontoen, bor i skyen
- post med `konto: null` → loggført uten konto, hører til **enheten**

**Ved utlogging** (`loggUtTrygt()`), i denne rekkefølgen: last opp → *verifiser at det
gikk* → fjern kontoens poster lokalt → legg tilbake postene uten konto. Verifiseringen
er ikke pynt: uten den ville et nettverksglipp betydd at loggen ble slettet lokalt uten
å finnes noe annet sted — nøyaktig feilen vi nettopp rettet, speilvendt. Feiler
opplastingen, blir man stående innlogget med alt i behold og får beskjed.

**Ved innlogging** deles de lokale postene på eierskap før noe flettes. Kontoens egne
flettes som før; postene uten konto legges i en enhetsbøtte (`forgebakery.v2.utenkonto`)
og utløser et spørsmål: «N bak er loggført uten konto — ta dem med inn?» Å flette dem i
stillhet ville lagt en fremmeds bak inn i din logg på en delt enhet; å slette dem ville
vært datatap. Å spørre er det eneste som ikke er en av delene. Sier man nei, blir de
liggende og dukker opp igjen ved utlogging.

### Smakstilleggene viste «0 g» og kunne ikke justeres

Honning, olje, sukker, smør og malt sa «2,0 % · 0 g», uten gramfelt. Gramverdien ble
hentet fra `r.fro` — men den listen er frø og korn; smakstilleggene har hvert sitt felt
i motoren (`honningPct` → `r.honning`). Verdien fantes hele tiden, den ble hentet fra
feil sted. Gramfeltet er dessuten gitt til alle tillegg nå: med et steg på 0,5
prosentpoeng var diastatisk malt (0,05–0,3 %) i praksis ujusterbar.

### Standardbrød

«Lagre dette som standardbrød» i Logg lagrer oppskriften som appen åpner på når det ikke
ligger noe påbegynt der fra før. Samme avtrykk som loggposten bruker, så de kan ikke
drifte. `erFabrikkOppskrift()` avgjør når den legges på — har man begynt på noe, skal
appen ikke overkjøre det.

### Sonefargen dekker hele kortet

Var bare en merkelapp i hjørnet. Nå bærer fargen hele raden eller kortet, med en farget
venstrekant som gir styrken retning: grønn i sonen, gul over anbefalt, rød nær taket.
Gjelder tilleggsradene og vann- og saltkortet. Gramfeltet har fått runde kanter.

### Verifisert

Ny suite `test-r4.js` utvidet til 55 sjekker; alle åtte suiter grønne. To feil funnet
under testingen og verdt å huske: `appendChild(null)` kaster (h() tåler null-barn, det
gjør ikke appendChild), og en `const` brukt fra en hoistet funksjon som kalles tidligere
i fila er i TDZ — begge veltet hele oppstarten.

---

## 31.07.2026 — V2: tolv punkter fra fjerde brukertest

Bjørn matet inn tilbakemeldinger fortløpende gjennom økta. Alle er skrevet inn i
`INNSPILL.md` etter hvert som de kom, med status, slik at køen overlever et øktskifte
og ingenting lever bare i chatten. Tolv er levert her; fem står igjen som åpne.

Verifisert i ekte Chromium: ny suite `tester/test-r4.js` (41 sjekker) pluss hele
regresjonen — åtte suiter grønne.

### Kritisk: bakeloggen kunne forsvinne ved innlogging

Meldt som «logger du inn, får du ikke opp historikken din — da har man ingen logging
igjen». Det var ekte datatap, og det var **uopprettelig**, så det er det viktigste i
denne posten.

**Årsaken:** `lagre()` stemplet `S.oppdatert = Date.now()` på HVER lagring, og
`oppdater()` kjøres ved all bruk — også når man bare blar mellom skjermer. På en enhet
uten historikk holdt det derfor å navigere til Logg for å logge inn: da var den tomme
lokale tilstanden «nyest», og `synkVedInnlogging()` la den opp OVER historikken i skyen.

Tre rettelser, som løser hver sin del:

1. **`oppdatert` flytter seg bare når DATAENE endrer seg.** `UI_FELT` lister rent
   visningstilstand (skjerm, utfellinger, søkefelt), og `dataAvtrykk()` sammenligner
   resten mot forrige lagring. Grunnlinja settes fra tilstanden slik den ble LASTET —
   med null ville aller første lagring alltid telt som en endring, og det er nettopp
   den som skjer når man blar til Logg.
2. **Bakeloggen FLETTES, den overskrives aldri.** Resten av tilstanden er innstillinger,
   der «nyeste vinner» er riktig — det finnes bare én gjeldende oppskrift. Loggen er
   historikk, og historikk kan ikke ha en vinner: en post som finnes på én enhet og
   ikke på den andre er ikke en konflikt. `flettLogg()` gjør union på `id`; ved samme
   id vinner den sist redigerte (`endret`). Rekkefølgen holdes kronologisk på `laget`.
3. **Sletting bruker gravsteiner** (`S.loggSlettet`). Uten dem ville en union gjenopplivet
   hver post man har slettet, hver gang den andre enheten synket.

I tillegg: **`Sky.hentNed()` skiller nå leseferil fra tomt svar.** Begge ga før `null`,
og kalleren tolket `null` som «ingenting der oppe» og lastet opp sin egen tilstand — så
et nettverksglipp kunne overskrive historikken i skyen.

### «Bak dette på nytt» erstatter startblokka

Startblokka på Brød («Start fra forvalget Halvgrovt 40 %») er fjernet. Den lovet et
utgangspunkt, men pekte på et forvalg Bjørn aldri hadde bakt — og den forsvant så snart
loggen fikk sin første post, altså akkurat når man begynte å ha noe ekte å gå tilbake til.

Loggpostene lagrer nå selve oppskriften (`OPPSKRIFT_FELT`, en hviteliste — en svarteliste
ville sluppet gjennom hvert nytt felt som legges til senere), og har fått **«↻ Bak dette
på nytt»**. Poster fra før feltet fantes sier det rett ut i stedet for å vise en knapp
som ikke kan virke.

### Kompensasjonspanelet kunne økes i det uendelige

«Trykker du på "øk" igjen, kan du bare øke og øke og øke.» Riktig: «Øk deigen» var en
HANDLING som skrev til `S.vekt`, og den nye vekten ble så grunnlag for neste utregning.

Nå er det et VALG med to tilstander (`S.okDeig`), og selve skaleringen skjer i `regn()`
av state — `state.vekt` er brukerens valgte brødvekt og røres aldri. Verifisert: fire
trykk gir samme deig som ett, og melmengden lander eksakt på det den var uten tillegg.

### Gram inn, prosent ut — begge veier

Gramvekt per meltype var borte fra V2 (V1 hadde den). Den er tilbake, og vannet har fått
det samme: et eget, redigerbart gramfelt i stedet for en bisetning i konsekvenslinja.

`settMelGram(state, i, gram)` og `settVannGram(state, gram)` ligger i **engine.js**, ikke
i app-v2.js, fordi de REGNER. Begge itererer: melmengden avhenger av andelene og andelene
av melmengden. Målt: 500 g på en meltype treffer 500 g, 1500 g vann treffer 1498.

Egen melblanding lever i `S.melOverstyr` og slår både preset og grovhetstrappa — men et
grovhetstrinn nullstiller den, ellers ville dialen sett ut som om den sluttet å virke.
Et varsel med «Tilbake til anbefalt blanding» står i kortet mens overstyringen er aktiv.

**«Bruk anbefalt»-knapp** på vann og salt, synlig bare når man faktisk står et annet sted
enn anbefalingen.

### Vanlig steking i ovnen manglet helt

Alle fem utstyrsoppsettene forutsatte forvarmet masse — stål, Pyrex, støpejern, stein.
Vanlig stekebrett eller brødform, uten noe av det, fantes ikke. Det er måten de fleste
faktisk baker på.

Nytt oppsett `brett` + ny profil `brod_brett` (240 → 210 °C, nederste rille, 40–50 min,
20 min forvarming). Tallene er lavere og lengre enn de andre, og grunnen er fysisk: et
1 mm aluminiumsbrett lagrer 2 700 · 900 · 0,001 ≈ **2 400 J/m²K** mot 15 mm ståls
55 700 — omtrent 4 %. Brettet er tomt for varme etter sekunder, og bunnen får varme fra
ovnslufta i stedet for fra kontakt. Da hjelper ikke 270 °C: toppen setter seg før bunnen
er ferdig.

`kontakt` og `effusivitet` er **null**, ikke tall. Aluminiums effusivitet er høyere enn
ståls, så et tall der ville rangert oppsettet på topp i appens egen liste — mens
reservoaret altså er tomt. Å oppgi et tall ville vært å låne troverdighet fra en modell
som ikke gjelder.

### Favoritter er brukerens, ikke appens

`stal15` het «★ Deig rett på stålet …» og ble beskrevet som «det beste oppsettet du har»;
`brod_glass_stal` sa «det beste du får ut av utstyret du har». Samme klasse feil som
★-merkene i stekeprofilene og «rundbrød» i utstyrsteksten, begge rettet 30.07: appen
kårer en favoritt på Bjørns vegne.

★-et og «beste»-formuleringene er ute. Favoritt-mekanikken, som fantes for mel, dekker nå
også **stekeutstyr og stekeprofiler**. Id-ene er navnerom-prefikset (`mel:` · `utstyr:` ·
`steking:`) fordi de tre listene ellers kunne kollidere; gamle, uprefiksede favoritter
migreres i `last()`. Favoritter sorteres først i utstyrsvelgeren og får ★ der — det er
den eneste måten en favoritt faktisk sparer noen for arbeid.

Nytt oppslag: **Stekeutstyr**, med tall, ★-knapp og «Bruk dette oppsettet».

### Brød-skjermen

- Overskriften spør **«Hva skal du bake?»**.
- Nøkkeltall-badgen («40 % GROVT», «82 % VANN») er byttet ut med **tegninger av de fire
  brødtypene**. Et tall som endrer seg mens du blar er ikke et kjennetegn ved brødtypen —
  det er tilstanden din, og den står allerede i Deig.
- «Om dette baket» er flyttet fra ett kollapskort for den valgte baksten til **ⓘ per
  brødtype**. Da kan man lese hva en ciabatta ER før man bytter til den, som er når man
  lurer. Stegkjeden følger med for den valgte; for de andre vises beskrivelsen uten en
  oppdiktet kjede.

### Gjæringsgrafen: «hvordan når man 30 grader i kjøleskapet?»

Ikke en regnefeil — en lesefeil grafen selv inviterte til. To skalaer deler tegneflate:
0–tempMax til venstre (deigtemperatur), 0–100 % til høyre (akkumulert gjæring). Den
akkumulerte kurven er normalisert mot sin egen sluttverdi og ender ALLTID på taket, og
taket ligger på samme høyde som «30°»-linja i rutenettet.

Aksene er nå farget som hver sin kurve og heter **«°C deig»** og **«% gjæring»**.

### Bunnmenyen dekket ikke Androids gestlinje

`viewport-fit=cover` gjør at 100dvh inkluderer området gestlinja ligger over. Uten
`padding-bottom: env(safe-area-inset-bottom)` havnet knappene delvis under den svarte
stripa — ikonene så ut som de var scrollet bort, og trykk nederst traff Androids meny.
Paddingen ligger på beholderen, ikke på knappene, så bakgrunnsfargen fyller innstikket.

### Åpent etter denne runden

Forfermentens temperatur og kjøleskapsvalg · hastighetsfaser på eltemaskinen ·
validering av friksjonstallet for Ooni Halo Pro · «har du alt i huset?» som steg 1 i
prosessen · lufta i romtemp-boksen (trenger en peker på hvilken boks) · nytt appikon.
Alle står i `INNSPILL.md`.

---

## 30.07.2026 (natt, senere) — V2: innlogging og sky-lagring

Bjørn ville ikke miste data, og opprettet et Supabase-prosjekt (`xoripdwbghqlzbgxkfps`).
Appen forblir 100 % statisk på GitHub Pages — nettleseren snakker direkte med Supabase.

- **`js/sky.js`** er hele sky-laget, med et bevisst smalt API mot resten av appen:
  `Sky.klar/bruker/status/paaEndring/registrer/loggInn/loggUt/glemtPassord/hentNed/
  lagreOpp/skyvNaa`. Feilmeldinger oversettes til norsk (`norsk()`), inkludert et
  eget tilfelle for «tabellen finnes ikke» → «kjør SQL-en i SUPABASE.md».
- **Lokalt først.** localStorage er fortsatt sannheten mens appen brukes, så alt virker
  offline og helt uten konto. `lagre()` speiler opp til skyen KUN når noen er innlogget,
  og opplastingen er debouncet 1,2 s — en skyver som dras skal ikke bli hundre
  nettverkskall.
- **Konfliktløsning på tidsstempel.** `S.oppdatert` settes ved hver lagring; ved
  innlogging (`synkVedInnlogging()`) sammenlignes lokalt mot skyens `oppdatert`, og
  **nyeste vinner**. Uten dette ville en gammel kopi på PC-en overskrevet en fersk logg
  fra telefonen.
- **Konto-UI i Logg** (`tegnKonto()`): logg inn / ny konto / glemt passord, statusprikk
  med e-post og synkestatus, «Synk nå» og «Logg ut» (som tvinger en siste opplasting
  før den logger ut, så siste endring ikke tapes). Passordfeltet lever i en modul-lokal
  variabel, ikke i `S` — halvskrevne passord skal aldri havne i localStorage eller i en
  nedlastet sikkerhetskopi.
- **supabase-js er vendoret** til `js/vendor/supabase.js`, av samme grunn som fontene:
  ingen CDN-avhengighet, virker fra `file://`.
- **`SUPABASE.md`** har SQL-en som må kjøres én gang (tabell + Row Level Security med
  fire regler på `auth.uid() = bruker_id`), URL-oppsettet for «glemt passord», og
  hvordan lagene henger sammen.
- **`.github/workflows/supabase-ping.yml`** kaller REST-API-et daglig, så gratis-tierens
  pause etter sju døgn uten aktivitet aldri inntreffer. Godtar 200/401/403 som «lever».

Sikkerhetskopi-knappene fra forrige runde beholdes med vilje: belte og bukser.

Verifisert i Chromium med alle Supabase-kall blokkert (19 sjekker): UI-et tegner,
innloggingsforsøk uten nett gir en norsk feilmelding i stedet for å krasje, og appen
fungerer ellers uendret — inkludert lokal lagring uten konto.

---

## 30.07.2026 (natt, sist av alt) — Slutt på å tømme cachen

Bjørn: «gjør det slik at jeg slipper å slette cache hele tiden, og at det går
automatisk med refresh av siden.» Det tok tre forsøk, og de to første er verdt å
skrive ned fordi de så riktige ut.

**Forsøk 1 — `fetch()` i service workeren.** Antok at nett-først holdt. Feil: et
vanlig `fetch()` inne i en SW går fortsatt gjennom nettleserens HTTP-cache.

**Forsøk 2 — `cache: 'no-cache'` på den fetchen.** Riktig verktøy, feil sted.
Testen var fortsatt rød, og en måling av hvilke forespørsler som faktisk traff
serveren under en refresh viste hvorfor:

    ved refresh får service workeren KUN navigasjonsforespørselen.
    <script src="js/data.js"> og CSS-en når den aldri.

Chrome serverer subressurser rett fra HTTP-cachen så lenge `max-age` ikke er
utløpt — uten å spørre service workeren i det hele tatt. GitHub Pages sender
`max-age=600`. **Ingen fetch-strategi kan fikse dette, fordi `fetch` aldri kalles.**
Det var derfor cache-tømming var eneste utvei.

**Forsøk 3, som virker — URL-ene må endre seg når innholdet endrer seg.**
Service workeren fanger navigasjonen (den får den alltid), henter `index.html`
ferskt, leser **ETag-en** til hver appfil og skriver om HTML-en så hver URL får
`?v=<etag>`:

- innhold endret → ny ETag → ny URL → HTTP-cachen bommer → hentes på nytt
- innhold uendret → samme ETag → samme URL → HTTP-cachen treffer → ingen nedlasting

ETag-oppslagene er betingede, så uendrede filer svarer **304**. Versjonerte URL-er
er innholdsadresserte og hentes cache-først — de kan per definisjon ikke være
foreldet.

**Målt** mot en testserver som hermer GitHub Pages (`max-age=600` + ETag + 304):
en vanlig refresh etter at en fil er endret gir **ny kode**, og en refresh der
ingenting er endret gir **9 stk 304 og 0 byte nedlastet** — mot 385 KB hvis alt
hadde blitt hentet ukondisjonelt. Offline virker fortsatt.

Dessuten: `controllerchange` laster fanen om én gang når en ny worker tar over
(med vakt mot at førstegangsinstallasjon utløser en unødig omlasting), og
`visibilitychange` ser etter ny versjon hver gang en installert app hentes fram.
Nederst i **Oppslag** står nå «Denne appversjonen» med tidsstempel og en
«Se etter oppdatering nå»-knapp — en ærlig kvittering på at oppdateringen kom.

---

## 30.07.2026 (natt, sist) — Installerbar app på Android (PWA)

Bjørn ba om å kunne installere appen fra Chrome på Android. Chrome krever tre ting:
manifest, service worker med `fetch`-handler, og HTTPS (som GitHub Pages allerede gir).

- **`manifest.webmanifest`** — `display: standalone` (ingen adressefelt), portrett,
  bakgrunns- og temafarge fra designsystemet (`#f5ead8`), og **relative** `start_url`/`scope`
  (`./`). Absolutte stier ville brutt både lokal testing og undermappa `/Forge-bakery/`.
  Feltet `id` ble fjernet igjen av samme grunn — utledes fra `start_url` og er da riktig
  begge steder.
- **`icons/`** — 192, 512, maskable 512 og apple-touch 180, tegnet i Chromium fra appens
  eget brødikon (krem på terrakotta). Maskable-varianten har motivet krympet til 56 % så
  det overlever Androids ikonmaske, som kan klippe de ytterste 10 % på hver kant.
- **`sw.js`** — **nett først, cache som reserve.** Med cache-først kunne en installert app
  blitt hengende på gammel kode i dagevis uten at noe tydet på det, og appen pushes flere
  ganger daglig. Nett-først koster noen hundre millisekunder på nett og faller umiddelbart
  tilbake på cache uten. Kun same-origin GET røres — Supabase-kall går alltid rett på nettet,
  og POST/PATCH aldri gjennom cachen. Bare `ok`+`basic`-svar lagres, ellers ville en 404
  blitt servert videre offline. Navigasjon uten treff faller tilbake på `./`.
- **Snarveier** i manifestet (langtrykk på appikonet) åpner Prosess og Logg direkte. De
  virker fordi appen nå leser `?skjerm=` ved oppstart — uten den biten ville de bare åpnet
  forsiden.

Verifisert i Chromium: manifest og alle ikonfilene (riktig piksestørrelse og MIME-type),
service worker aktiv og styrende, 13 filer i cachen, **full app offline** med fonter, layout
og fungerende motor, og begge snarveiene.

---

## 30.07.2026 (natt, senere) — Loggen, og Pyrexen som står i ovnen

### Bakeloggen: bilder i stort format, rediger og slett

- **Trykk på et bilde åpner det i fullskjerm** (`tegnBildeVis()`, `.bildevis`) over hele
  telefonrammen — z-index 60, altså over bunnmenyen. Piler og piltaster blar når posten har
  flere bilder, Esc eller ✕ lukker, og trykk på selve bildet lukker *ikke* (bare utenfor) —
  ellers ville hvert forsøk på å se nærmere lukket visningen.
- **Hver post kan redigeres:** navn, karakter, et nytt **notatfelt** («hva lærte du?») og
  bilder (legg til / fjern, fortsatt maks 3). `loggRediger()`; endringene lagres mens du
  skriver. **Måletallene er bevisst ikke redigerbare** — dose, hydrering, grovhet og løft er
  hentet fra baket slik det faktisk var, og en logg man kan pynte på slutter å være et
  ærlig referansepunkt.
- **Slett med bekreftelse** som sier hvor mange bilder som ryker med (`loggSlettBekreft()`).
- **Postene har fått stabil `id`.** Uten den pekte rediger/slett på *posisjon* — og
  posisjonen flytter seg når noe slettes, når skyen synker inn en annen liste, og lista
  vises dessuten nyeste-først. Eldre poster får en id i `last()`. Iterasjonen går nå bakover
  med den ekte indeksen i stedet for `slice().reverse()`, som ga feil rad.

### «Pyrexen står i ovnen» — 260 °C i stedet for 230

Bjørn påpekte at Pyrexen kan bli stående i ovnen mellom bakerundene, og at man da bør kunne
kjøre stål-temperaturer. Det stemmer, men bare for det ene av de to Pyrex-oppsettene, og
det er verdt å skille:

230-taket kommer av glassets **termiske sprang på 220 °C** — men det dekker to ulike sjokk:

1. **Romtemperert glass inn i varm ovn** (260 − 20 = 240 > 220). Dette er det Bjørns
   arbeidsmåte fjerner: står glasset i ovnen fra kald start, varmes det opp sammen med den.
2. **Kald deig mot varm glassflate** (~254 °C ved 260). Dette gjelder bare `brod_glass_stal`,
   der deigen ligger *inni* glassbunnen.

I **kloke-oppsettet** (`brod_kloke`) ligger deigen på stålet og rører aldri glasset, så bare
sjokk 1 er i spill — og det er nettopp det som forsvinner. Derfor har den profilen fått et
`varm`-alternativ på **260 → 230 °C** (støpejernsgrytas tall; den er appens egen referanse
for lukket kammer). `brod_glass_stal` har med vilje *ingen* `varm`.

Slått på med avkrysningen **«Pyrexen står i ovnen»** under Stekeutstyr (`S.pyrexIOvn`), som
bare vises når den valgte profilen faktisk har et varmt alternativ. Byttet skjer i
**`regn()`**, ikke i render, så kjeden, Prosess-stegene og oppslaget alle leser samme
temperatur. Med valget på står det en advarsel om de to tingene glasset fortsatt ikke tåler:
å settes tilbake i en varm ovn etter å ha blitt kaldt, og rask nedkjøling (vann, våt benk).

### «Rundbrød» ute av utstyrsteksten

`UTSTYR.stal15.om` åpnet med «Det beste oppsettet du har for rundbrød». Bjørn har aldri
sagt at han baker rundbrød — samme feil som ★-merkene i stekeprofilene, som ble rettet
tidligere samme dag. Stekeutstyr handler om bunnvarme og damp, ikke om emnets form.
(«Rundbrød» står fortsatt i fagstoffet, der det brukes faglig som sammenligningsgrunnlag —
bunnflate mot volum, avkjølingstid — og det er riktig bruk.)

---

## 30.07.2026 (natt) — V2: seks punkter fra tredje brukertest

Verifisert i Chromium (23 automatiske sjekker + skjermbilder).

- **Brødtype-bytte er nå et nytt bak, med bekreftelse.** Før tok byttet med seg alle
  deigvalgene — en ciabatta arvet solsikkefrøene og vannet fra brødet. Nå spør et
  varselkort «Bytte til X — starte på nytt?» (`S.byttBekreft`), og bekreftelsen
  (`nyBakst()`) nullstiller oppskriftsvalgene (tillegg, vann, salt, grovhet, heveplan,
  stekeprofil, form) til bakstens standard. Utstyr, maskin, logg, favoritter og
  romtemp beholdes — de er brukerens, ikke bakstens.
- **Bilder i loggen er tilbake** (designfasen hadde dem — `appgjennomgang.md` sier
  «✔ + bilder (nytt)»). Inntil 3 bilder per bak: `tegnBildeVelger()`/`leggTilBilde()`
  skalerer ned til maks 480 px JPEG (kvalitet 0,7) i canvas før lagring, så
  localStorage (~5 MB) rommer mange bak; kvotevern nekter nye bilder over ~4,2 MB
  total. Miniatyrer i skjemaet og på loggpostene.
- **Sikkerhetskopi i Logg** (`tegnBackup()`): «Last ned kopi» (hele tilstanden som
  JSON-fil) og «Hent inn kopi» (validert import som gjenbruker normaliseringen i
  `last()`). Dette er svaret på «lagring og innlogging» som er mulig uten server —
  ekte konto/sky-lagring krever en backend og står som åpent punkt i STATUS.
- **Stekeprofilene beskriver nå metoden, ikke brødformen.** ★-merkene og
  «Rundbrød»/«Ciabatta»-navnene er ute — formen har ingenting med stekeprosessen å
  gjøre. Nye navn («Støpejernsgryte med lokk», «Glassgryte PÅ 15 mm stål», «Midt i
  ovnen på stål, kort og varmt» …) + nytt felt `anbefaltTil` per profil, vist som
  «anbefalt til»-merke i Oppslag → Stekeprofiler. Koblingen bakst→profil lever videre
  som anbefaling i `PRESETS.steking`/`profilForUtstyr` — uendret logikk, bare riktig
  merket som anbefaling.
- **«Om dette baket — prosessen kort»** på Brød-skjermen: kollapskort med hva baksten
  ER (nytt `om`-felt i `BTYPER`) og hele stegkjeden med varigheter og total tid,
  GENERERT fra `kjede()` — samme kilde som Tid og Prosess, så den kan ikke drifte.

---

## 30.07.2026 (kveld) — V2: ti punkter fra andre brukertest

Bjørns andre testrunde ga ti punkter i én melding. Alle er levert, verifisert i ekte
Chromium (31 automatiske sjekker på 390 px + skjermbilder av hver endring) og pushet.

### Tid
- **Velg dato og klokkeslett for ferdig.** ±-knappene (à 60 min) var eneste vei til et
  annet døgn. Ny `<input type="datetime-local">` (`.dato-inp`) under tidstepperen i
  Ferdig-modus, hjelper `tilDatoLokal()` i `app-v2.js`.
- **Litt luft mellom plankortene** — ny klasse `plan-valg` (8 px margin-bottom).
- **«Start nå» ankrer nå kjeden til nå:** ferdig settes til nå + total tid ved trykk.
  Før byttet knappen bare visning og viste starttiden som fulgte av et gammelt
  ferdigtidspunkt — «Start nå» startet ingenting.
- **Nå-markøren i gjæringsgrafen vises kun når prosessen er startet** («Start nå»-modus,
  og nå er inne i gjæringsvinduet). Bjørns poeng: en nå-strek i en ikke-startet,
  hypotetisk plan peker på ingenting. `gjaeringsGraf(..., visNaa)`; legenden følger med.
- **Heveplan: romtemperatur og kjøleskap.** Ny stepper «Romtemp der deigen hever»
  (`S.romTemp`) og hurtigknapper per trinn: «Kjøleskap 4°» / «Rommet ditt X°» som setter
  trinnets miljø. Gjærdosen løses om automatisk, som før, når miljøet endres.

### Deig
- **«Hva vil du gjøre med endringen?»** (`tegnKompensasjon()`): når tillegg er på, viser
  et panel at melet faller i en fast deigvekt (fra X til Y, −Z g) og at vannet alt er
  justert — og tilbyr alternativet «Øk deigen: N g/brød», som skalerer brødvekten så
  melmengden blir som uten tillegg. Da kan Bjørn ta stilling til hva endringen gjør.
- **Soner mot anbefalingen:** tilleggsrader skifter fra grønn til gul («over anbefalt»)
  og rød («nær maks»), relativt til spennet anbefalt→maks per tillegg (solsikke: gul fra
  ~7,7 %, rød fra ~14,4 %). Salt fikk sonemerke (I SONEN / UTENFOR / LANGT UTENFOR) på
  samme måte som vann. Statuslinja i raden sier hvorfor den er gul/rød.
- **«Hva valgene koster» viser nå ± mot normalen** (samme brød uten tillegget):
  divergerende søyler med 0-strek i midten, grønt = gevinst, rødt = kostnad, terrakotta
  = nøytralt (bruning). Baseline er første punkt på hver målekurve.
  `doseResponsRader()` / `deltaRad()` / `fmtDelta()`.
- **Totalen ligger i deigregnskapet:** arket har fått seksjonen «Valgene dine mot
  normalen», bygget av samme `doseResponsRader()` som panelet — de to kan ikke drifte.

### Diverse
- **Deigregnskapet lukker nå ved trykk på selve arket**, ikke bare på bakteppet over.
- **Eltemaskin:** «Spiral hjemme» heter nå «Ooni Halo Pro (spiral hjemme)» — maskinen
  Bjørn faktisk har. Alle maskinene i `MASKIN_INFO` fikk et `fart`-felt med hastighetsråd
  (lav fart til samling, middels til utvikling; planetmaskin: produsentene fraråder over
  trinn 2 for gjærdeig), vist som egen «Hastighet:»-linje i maskinpanelet.
- **Favoritter uten dobbeltmerking:** ★-prefikset i Deig er fjernet — flere melnavn har
  allerede ★ i seg som kvalitetsmerke, så favoritter leste som «★ … ★». Favoritt vises nå
  som «FAVORITT»-merkelapp i Deig (`.fav-pille`) og som ramme rundt hele kortet i
  Oppslag (`.kort.fav`). ☆/★-knappen er fortsatt selve bryteren.
- **Kritisk følgefunn rettet — re-entrant render:** når `replaceChildren` fjernet et
  fokusert inputfelt, fyrte nettleseren en ekte blur MIDT i renderen; feltets onblur
  startet en ny render oppå den halvferdige → `NotFoundError` → feilgrensa nullstilte
  hele appen, inkludert loggen. Nytt `_rendrer`-vern i `render()` gjør det nestede
  kallet til en no-op (tilstanden er allerede lagret).

---

## 30.07.2026 — V2: appen bygget om til en mobil-app

Stor omlegging over én økt, etter Bjørns oppdrag: bygg Forge Bakery om til en **mobil-app**
ut fra designhandoffen i `design_handoff_bakeprosess/`. **V1 skulle ikke røres** — den lever
videre som `index.html` + `js/app.js`. V2 er en ny, parallell app: `index-v2.html` laster
`js/data.js` → `js/engine.js` → `js/app-v2.js` (globale script-tagger, ingen rammeverk).

Underveis presiserte Bjørn to ting som styrer resten: **«designfilene var et designprinsipp,
ikke fasit på endelig app»** (alt V1 kunne, skal V2 også kunne) og **«du skal si fra når du
mener du er FERDIG»** (ikke meld ferdig for tidlig).

### A · Modellkjernen først — L-01 til L-14

Før én skjerm ble tegnet gikk vi gjennom `logikk-tilbakemeldinger.md` (L-01–L-14, kjente
modellfeil) og ble enige om regnemodellen. Kjernen er to **rene** funksjoner i `engine.js`
— all utregning der, ingen i render (`app-v2.js` bare tegner det `regn()`/`kjede()` gir):

- **`regn(state)`** — dosen, hydreringen, løftindeksen, varmebalansen. Ett kall, alt utledet.
- **`kjede(state, r)`** — stegkjeden (bulk → forming → utbakt → steking) som ren funksjon.

**L-14 var viktigst: forferment skal ikke flytte løftindeksen.** En poolish/biga/surdeig
omfordeler *når* gjæringen skjer, ikke *hvor mye* emnet reiser seg i ovnen. Løftet regnes
derfor multiplikativt av det som faktisk styrer volum —
`loft = ovnslosBasis(plan) × grovFaktor × froFaktor × hydFaktor × ffFaktor`, klemt til 20–100
(`loftIndeks()` med `grovLoftFaktor`/`froLoftFaktor`/`hydLoftFaktor`/`ffLoftFaktor`).
`ffFaktor` er nær 1 med vilje: forfermenten nudger, styrer ikke.

Andre avklaringer fra samme runde: **pâte fermentée fjernet** (Bjørn brukte den ikke),
**surdeig lagt til** som forferment-type, og **grovheten følger Brødskala'n** (samme norske
standard som V1 fikk 29.07 — frø utenfor, korn/kli teller fullt).

`kjede()` løser samtidig L-07/L-09/L-10/L-12/L-13 (bløtlegging rist/bloet/skald, kald snitting,
forming før første utbakt-trinn — se baker-review under).

### B · Seks skjermer

Skjermrekkefølgen er Bjørns: **Brød · Deig · Tid · Prosess · Logg · Oppslag**
(`bunnmeny` i `app-v2.js`). Han beskrev overgangen selv: «brød, deig, tid, prosess, logg,
oppslag som blir riktig rekkefølge». Render er `render()` → `renderInner()` med
try/catch-feilgrense, så en enkelt tegnefeil ikke svartlegger hele appen. Tilstanden ligger i
`localStorage` under `forgebakery.v2`, normalisert i `last()`/`nyStandard()`.

### C · Designet gjenskapt, så V1-paritet lagt oppå

Første tilbakemelding var **«dette ser mindre pent ut enn hva Claude Design laget»**. Årsaken
var at Google Fonts var blokkert; fontene er nå **vendoret lokalt** (Caprasimo/Figtree woff2 i
`css/fonts/`, `css/fonts.css`) så appen ser lik ut offline og fra `file://`. Grovhet ble
piller i stedet for slider, med sirkelbadges, steg-teller og glutenbidrag per mel.

Deretter, på **«jeg vil ha inn alt det gamle også»**, ble hele V1-funksjonaliteten hentet inn
(commitene `V1-paritet A/B/C`): form/kurv og stekeutstyr med vektoppløsning, dose–respons-panelet,
korntegningene, meltall-info og mel-advarsel, redigerbar heveplan, rate-tabell, is-utregning,
handleliste og deigtemp-kalibratoren.

### D · Vekt-fikspunktet (teknisk-review, kritisk)

Melvekten løses av en affin fikspunktligning (mel binder vann som binder mel …). Naiv
Picard-iterasjon **divergerte** på tunge frølaster → `melTotal = 0` → NaN i hele arket. Rettet
med lukket form: `m* = a / (1 + b)`. Ingen iterasjon, ingen divergens.

### E · Dobbeltforming (baker-review, kritisk)

Kjeden bakte ut og hvilte 45 min **etter** den kalde utbakt-hevingen, uten forming før. Rettet:
formingssteg før første utbakt-trinn, «Temperer og snitt» (kald snitting) etter. Nå former du
før heving, ikke etter.

### F · Hosting

Publisert på **GitHub Pages** (gratis, offentlig repo er greit ifølge Bjørn) med
`noindex, nofollow` i `index-v2.html`, `robots.txt` og `.nojekyll`. Auto-deploy ved push til
`claude/forge-bakery-mobile-v2-l4ean3`. Hemmelighetsskann kjørt — rent.

### G · App-layout og siste UX-runde (fra rask brukertesting)

- **Fast bunnlinje, ikke scrollende side.** `#telefon` er `height:100dvh; overflow:hidden`;
  deigregnskapet spretter opp som et `.regnskap-ark` (absolutt, over bunnlinjen) med en
  `#bakteppe`-bakgrunn som lukker ved trykk.
- **Hydrerings- og saltskyverne** oppdaterer tall/merkelapp/guide **live under draget**
  (`oninput`, kun DOM) og regner ferdig **på slipp** (`onchange`). Ny `vannGuide()` forklarer
  hva lavt/høyt vann gjør. (Rettet en regresjon der `onchange`-alene gjorde at slideren ikke
  fulgte fingeren.)
- **Tillegg (frø/korn/smak)** kan igjen aktiveres med ett trykk, markeres grønt når på, og
  fjernes lett via toggle (`togglTillegg()`, `.tillegg-rad.paa`).
- **Stekeutstyr:** deig rett på stålet er nå det anbefalte valget (★), Pyrexen er avlang og
  uten unødig advarsel.

### H · Tre punkter til fra brukertesten (samme dag, etter G)

- **Tid viser nå ukedag + dato for både start og ferdig.** «17:00» alene sa ikke hvilken dag,
  og baken går over døgnskiller. Ny start→ferdig-oppsummering i `tegnTid` viser alltid begge
  ender fullt ut («Fredag 31. juli, kl. 07:05»), første steg, total tid, og en egen linje når
  baken krysser midnatt. Hjelpere `klDato()`, `ukedagKort()`, `dagSpenn()`.
- **Gjæringsgrafen bygget om fra en naken tre-linjers skisse** til V1s fyldige graf, mobil-
  tilpasset: fasebånd med navn/tid/temp (kald heving grønn, varm terrakotta), temperaturakse
  venstre, gjæringsakse høyre, gjæringsfart som areal (arealet ER dosen), akkumulert dose som
  hovedkurve, deigtemp stiplet, halvveismerke med klokkeslett, ekte klokkeslett på x-aksen,
  aksetitler og en «nå»-markør. `gjaeringsGraf()` tar nå `bulkStart` for ekte klokke.
- **Eltemaskinene forklares nå.** Ny `MASKIN_INFO` i `data.js` (friksjonstall, hva maskinen er,
  typisk eltetid). `maskinInfoPanel()` viser den valgte maskinens forklaring, den levende
  utregningen (friksjon × min → +°C → ÷ 1,29 → Wh/kg med målsone-flagg) og en sammenligning av
  alle maskinene ved gjeldende eltetid. Bruker `r.friksjon`/`r.wh` — samme tall som
  varmebalansen, så forklaring og resultat ikke kan drifte fra hverandre.

### Arkitekturregler for V2 (ikke bryt)

    All utregning i regn()/kjede() i engine.js. app-v2.js tegner, regner aldri.
    Globale script-tagger, ingen import/bundler — virker fra file://.
    State i localStorage 'forgebakery.v2', normaliseres i last()/nyStandard().
    V1 (index.html / js/app.js) er frosset — rør den ikke.

---

## 29.07.2026 — Sammenhengen: startside, kontekstpanel, navigasjon

Tre sammenhengende leveranser samme dag, etter tre tilbakemeldinger fra Bjørn:
«hvor velger jeg hva som skal bakes?», «prosessen må oppleves helhetlig — jeg vil se
hevekurven sammen med valgene», og «bruk heller nedtrekksmenyer enn masse faner».

To UX-agenter ble kjørt på hans eksplisitte forespørsel: én på informasjonsarkitektur,
én som gikk gjennom kjørende app og lette etter brutt sammenheng. Funnene fra begge
ligger til grunn for det under.

### A · Startside og brødtyper

**Problem:** appen hadde to parallelle innganger som ikke kjente hverandre. «Bygg brød»
(startfanen) antok stilltiende et frittstående rundbrød og bygget det alltid av
grovhetstrappa. Ciabatta, baguetter og focaccia lå gjemt i en nedtrekksliste inne på
«Oppskrift». Ingen av dem sa hvilken vei brukeren skulle gå.

**Løsning:** `BROTYPER` i `data.js` er ny inngangsport. Feltet **`rute`** er kjernen:

| rute | brødtyper | vei gjennom appen |
|---|---|---|
| `bygg` | Loff, Halvgrovt brød | Start → **Bygg brød** → Bak nå |
| `preset` | Ciabatta, Baguetter, Focaccia | Start → **Oppskrift** → Bak nå |

For `preset`-rutene tones «Bygg brød» ned i navigasjonen og får et varselkort øverst —
grovhetsdialen der ville bygget et helt annet brød.

**`FORMER`** (avlang kurv / rund kurv / brødform) styrer stekeutstyret, ikke bare utseendet.
`profilForUtstyr(utstyr, form)` overstyrer `UTSTYR_PROFIL`: **avlang + stål gir `brod_apen`,
ikke `brod_kloke`** — en kloke må faktisk dekke emnet. Emnets største mål regnes som
`kFaktor × vekt^⅓` (boule 1,93 · bâtard 3,0), altså ca. 28 cm for et avlangt 800 g emne.

**Prosessoversikten på startsiden GENERERES fra `bakeSteg()`.** Skrives den av som tekst,
drifter den fra det «Bak nå» faktisk sier — nøyaktig feilen som en gang gjorde at fanene
viste ulik starttid og ulik stekeprofil for samme brød.

`brukByggOppskrift()` ble trukket ut av klikkhandleren på `#byggBruk`, fordi startsiden må
gjøre nøyaktig det samme. To kopier ville garantert utakt.

### B · Kontekstpanelet «Deigen din»

**Problem, målt:** i «Gjæring & tid» (4 999 px desktop, 7 810 px mobil) ligger
gjærmengdefeltet på 150 px og hevekurven på 3 767 px. **Aldri på skjermen samtidig, på
noen skjermstørrelse.** Bjørns ønske om å se kurven sammen med valgene var altså ikke et
ønske om en ny funksjon, men en presis diagnose.

**Løsning:** `#kontekst` — 340 px fast sidespalte, `position:sticky`, med tekstløs
mini-hevekurve, fire nøkkeltall og statuslinje. Under 1000 px blir den en bunnskuff via
`<details>` — ingen JS-tilstand, virker fra `file://`. Skjult på «Bak nå», der `.naakort`
*er* konteksten (`body[data-v]` settes i `vis()`).

`tegnTempChart(g, plan, o)` tar nå `{svg, W, H, mini, pad}`. `mini` fjerner ALL tekst — ved
340 px ville fasenavn og klokkeslett overlappe til uleselighet. **Samme data, to størrelser,
null ny matematikk.**

**Panelet har ingen kontroller, med vilje.** Det speiler; hovedspalten endrer. En slider der
ville gitt to steder å endre samme tall og to mentale modeller for hvor sannheten bor.

### C · Navigasjon, kollapskort, rutefot

**11 faner → 4 grupper** (`GRUPPER` i `app.js`): ① Brødet · ② Prosessen · ③ Bak nå · Oppslag.
`<section>`-ene er URØRT — dette er bare navigasjon, derfor lav risiko.
`#undernav` viser kun aktiv gruppes faner; `#undernavSel` er en native `<select>` som
overtar under 640 px. Har gruppen én fane (③ Bak nå), skjules raden helt.
`gruppeSist` husker hvilken fane du var i per gruppe.

**`tegnRutefot(v)`** legger «Steg 2 av 3 · ◂ Start · Bak nå ▸» nederst i hver hovedveisfane.
Fordypningsfanene får «Finjustering — hovedveien går utenom». Løser at «Oppskrift» — steg 2
av 3 for ciabatta/baguett/focaccia — ikke hadde noen vei videre i det hele tatt.

**Seks tunge fagstoffkort er `<details class="card kollaps">`**, lukket som standard.
Fordi elementene er statiske i `index.html`, overlever `open` alle `oppdater()`-runder —
`app.js` skriver bare til IDene inni. «Gjæring & tid» falt **4 999 → 2 834 px**.

**Mobil:** header 187 → 144 px og `static`. Undertittelen i logoen skjules under 640 px.

### D · Tolv brudd på sammenhengen, funnet og rettet

Alle verifisert med tall fra kjørende app.

1. **«Bygg brød» var en frakoblet forhåndsvisning.** Dialene skrev aldri til oppskriften;
   bare «Bruk denne» committet, og den knappen leses som navigasjon. Grovhet «Kraftig» +
   tid «Ekspress» ga 0,833 % gjær i fanen mens resten av appen regnet med 0,179 % —
   **faktor 4,7** — og kurven tegnet en kaldheving brukeren nettopp hadde valgt bort.
   → `byggEndret()` kaller `brukByggOppskrift()` på hver justering.
2. **`S.maalDose` ble aldri nullstilt ved brødbytte.** Appen sa samtidig «avvik +0 %» og
   «kaldhevingen må mer enn dobles». → Nullstilles i `brukPreset()` og `velgBrotype()`.
3. **Stekeprofilen sa tre ting.** `tegnBygg()` hadde en hardkodet kopi av utstyr→profil som
   ikke kjente formen: sjekklista sa 260 °C og «damp under glasset» mens Tidsplan, Steking
   og Bak nå sa 270 °C og kokende vann i støpejern. → `aktivProfil()` er eneste oppslag.
   `S.stekeProfilManuell` bevarer brukerens egen overstyring, som `velgForm()` før kastet.
4. **`bakHuket` brukte posisjons-id** (`'S'+n`). Skrudde man av forfermenten, arvet «Elt
   deigen» haken fra «Sett bigaen», og appen påsto at 14 t kaldheving var unnagjort.
   → Semantiske id-er: `ff · bloet · mix · plan0… · oven · shape · bake · cool`.
5. **`glass_stal` manglet i `lukket`** i `byggOppskrift()` → man mistet 3 prosentpoeng
   hydrering ved å velge det oppsettet appen selv kaller sitt beste.
6. **Fersk `localStorage` ga to ulike brød i appen** før man rørte noe (4 × 900 g / 35 %
   grovt mot 2 × 900 g / 10 %), fordi `velgBrotype()` aldri ble kjørt. → `init()` kaller den.
7. **`antall`/`vektPerBrod` synket bare bygg → hoved.** 6 × 400 g i Oppskrift lot Bygg brød
   stå igjen med 2 × 800 g. → Begge veier nå.
8. **`#masseKg` lå én tegning bak** (viste 1,60 kg mens oppskriften var 6,40). Massen styrer
   nedkjølingstiden. → `beregn()` kjøres først i `oppdater()`.
9. **«Total tid» spriket 1,3 t** mellom Bygg brød og Bak nå. → Leses fra `bakeSteg()`.
10. **`resetPlan`/`setRefDose` hentet fra et forvalg brukeren aldri hadde valgt** (dosen falt
    1,82 → 1,65). → Ruteavhengige.
11. **Måldosen ble satt til det planen OPPNÅDDE, ikke det den siktet mot** — så avviket var
    alltid «+0 %», og det skjulte at ekspressplanen ligger 13 % under målet fordi gjæren står
    på taket. → `S.maalDose = B.maalDose` (målet), `S.refDose = B.g.dose` (oppnådd).
12. **Mobil var snudd på hodet:** headeren `sticky` og 187 px (23 % av skjermen), mens
    `.naakort` var `static`. Navigasjonen spikret fast, «hva gjør jeg nå» rullende bort —
    på kjøkkenet. → Snudd. Pluss scrollminne per fane i `vis()`.

**Bonusfunn under mobiltesting:** `#planTabell` er 635 px og hadde ingen scrollcontainer, så
HELE dokumentet fikk vannrett scroll (660 px mot 375). → `.card table{display:block;
overflow-x:auto}` under 1000 px.

### Verifisert
196 kombinasjoner desktop med kortene åpne · 110 visninger på 375 px med kortene både åpne
og lukket · ingen vannrett scroll · bygg = hoveddeig overalt · dosene treffer måltallet
(loff 1,89 mot formelens 1,886, halvgrovt 1,82 mot 1,820).

---

## 29.07.2026 (tidligere samme dag) — Parameterrevisjon

Alle tall i appen sortert i *faglig begrunnet* / *ukildet* / *hardkodet*, med 12 bekreftede
feil. Se **`PARAMETERREVISJON.md`**. Verste funn, **ikke rettet ennå**: `styrke:'middels-sterk'`
finnes på Regal standard + 2 andre mel, men mangler i tre av fire oppslagstabeller
(`engine.js:400`, `engine.js:248`, `app.js:1243`) — faller til `?? 3` og rangerer Regal som
SVAKERE enn Møllerens siktet (`middels` = 4).

## 29.07.2026 — Melbibliotek, ordliste, korntegninger, konsekvenslag

- Egen fane «Mel & korn»: 30 meltyper med fordeler/ulemper, ⓘ på hvert tall, favorittmerking.
  `MEL_INFO` holdt adskilt fra `FLOURS` så regnemodell og oppslagsverk kan utvikle seg hver
  for seg. `glutenbidrag` er bevisst skilt fra protein.
- `ORDLISTE`: 43 fagord i 8 temagrupper med klikkbare kryssreferanser.
- `KORN_SVG`: inline SVG for 8 kornslag og 11 frø/gryn i samme 40×60-rutenett, så
  størrelsesforskjellene er ekte.
- `PARAM_INFO` + `festInfo()`: konsekvenslag («hva skjer om jeg skrur denne opp/ned»).
- `ELTING` i engine.js: elting som ARBEID (Wh/kg), ikke minutter. 1 Wh/kg ≈ 1,29 °C.
- Rettet speltens eltetoleranse: 9,5 min farinografstabilitet, ikke «maks 4 min».
- Gram ↔ prosent begge veier. Bløtlegging gjort betinget av hvor mye vann frøene stjeler.
- Forvalgene kalibrert: `gjaerPct` løst numerisk mot `maalDoseFor` for hvert forvalg.

## 28.07.2026 — «Bak nå» og de første feilrettelsene

- Ny guidet modus: én nummerert liste fra forferment til avkjøling, alt fra `bakeSteg()`.
- Vannregnskapet med frø: oppskriften ba om samme vann to ganger.
- Fokustap ved hvert tastetrykk løst med stabile `data-k`-nøkler.
- «Utbakt»-avkryssingen ble lest med `+inp.value` («on» → NaN → 0).
- Stekeprofilen fulgte forvalget, ikke oppskriften.
- Forferment-gjæren hoppet ved 16 t (et `×0,5`-ledd).
- Pyrex-profilen sa 250 °C mens resten av appen sa maks 230 (termisk sjokk).
- Eltetiden var hardkodet feil to ganger; `anbefaltEltMin()` utleder den nå fra maskinen.
- `+/−`-knappene «virket ikke» — grid-kolonnen var 78 px, feltet fikk 2 px.

---

# Arkitekturregler — brytes disse, kommer fanene i utakt igjen

1. **`bakeSteg()` er ÉN kilde til sannhet for hele bakekjeden.** Tidsplan, «Bak nå»,
   klokkeslettene i gjæringsgrafen, prosessoversikten på startsiden og «Total tid» leser
   alle fra den. Lag aldri en parallell utregning et annet sted.
2. **`aktivProfil()` er eneste oppslag for stekeprofil.** Ikke skriv en `if utstyr === …`
   til; det var nettopp det som ga tre forskjellige svar.
3. **Kontekstpanelet speiler, det endrer ikke.** Ingen kontroller der.
4. **Alt som skrives til `S` fra «Bygg brød» går gjennom `brukByggOppskrift()`.**
5. **Nye felter hører i `PARAM_INFO`/`TILLEGG`**, ikke som løs tekst i grensesnittet.
6. **Invarianter som skal holde:**
   `vannTotal = vannHoved + forferment.vann + froAbsorbert`
   `totalVekt = antall × vektPerBrod`

# Testing — les dette før du tester noe

Forhåndsvisningsruta hurtigbufrer **både JS og CSS** svært aggressivt og serverer gamle
versjoner selv ved cache-busting. `location.reload()` virker sjelden. Symptomet på stale CSS
er at `getComputedStyle` viser gamle regler (`grid-template-columns: none`) mens DOM-en er fersk.

```js
// 1) fersk CSS
const css = await fetch('css/style.css?x=' + Math.random()).then(r => r.text());
document.querySelectorAll('link[rel=stylesheet],style[data-fersk]').forEach(e => e.remove());
const st = document.createElement('style'); st.dataset.fersk = '1';
st.textContent = css; document.head.appendChild(st);

// 2) fersk JS i eget scope
const files = ['js/data.js','js/engine.js','js/app.js'];
const src = (await Promise.all(files.map(f =>
  fetch(f + '?x=' + Math.random()).then(r => r.text())))).join('\n');
new Function(src);                       // syntakssjekk
document.querySelectorAll('input,select,textarea,button')
  .forEach(e => e.replaceWith(e.cloneNode(true)));   // klon bort gamle handlere
localStorage.removeItem('brodlab.v1');
window.M = new Function(
  src.replace("document.addEventListener('DOMContentLoaded', init);","")
  + '\nreturn {S, init, vis, oppdater, bakeSteg, beregn, byggOppskrift, byggEndret,'
  + ' velgBrotype, velgForm, BROTYPER, FORMER, GROVHET, TIDSPLANER, GRUPPER};')();
M.init();
```

Unngå nøstede template-strenger med `\n` inne i `javascript_tool` — escapingen ryker.
Eksporter funksjonene og skriv testene i et etterfølgende, vanlig kall.

**Sjekk alltid, i tillegg til at det ikke kaster:**
- `document.body.scrollWidth` mot `clientWidth` per visning — vannrett dokumentscroll er
  usynlig i kode og verst på mobil, for da vandrer overskriftene ut av syne.
- Rendret pikselbredde med `getBoundingClientRect()` når noe legges i en smal grid-kolonne.
- **Ta skjermbilde.** «Rendrer uten feil» er ikke det samme som «ser riktig ut» — særlig
  for SVG tegnet i blinde.

# Arbeidsmåte Bjørn har bedt om

- Notatene hans er **ikke fasit**. Forankre i publisert teori og dokumenterte tester, og
  korriger notatene der de er feil.
- **Ikke hardkod vanene hans som standardverdier.** Utled fra evidens. (Han elter 15–20 min;
  det skal ikke styre anbefalingene.)
- Ikke slutt fra preset-etiketter til hva han baker. Spør.
- Han er teknisk sterk og vil ha begrunnelser og tall, ikke bare instruksjoner.
- **Ovnsløft er førsteprioritet.** Ranger alltid råd etter det.
- Benevnelser skal stå BAK tallene, ikke bare i kolonneoverskrifter.
