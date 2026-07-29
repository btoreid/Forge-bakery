# Status og neste steg — 29.07.2026

Notat ved øktskifte. Appen er i en konsistent, verifisert tilstand.

**Full historikk med begrunnelser: `CHANGELOG.md`.** Den har også arkitekturreglene,
testoppskriften (forhåndsvisningen bufrer både JS og CSS) og arbeidsmåten Bjørn har bedt om.
Skal du videreutvikle appen, les den før du rører kode.

## Slik henger appen sammen — oppdatert 29.07.2026

**`BROTYPER` i `data.js` er inngangsporten**, og feltet `rute` avgjør veien:

| rute | brødtyper | vei |
|---|---|---|
| `bygg` | Loff, Halvgrovt brød | Start → **Bygg brød** → Bak nå |
| `preset` | Ciabatta, Baguetter, Focaccia | Start → **Oppskrift** → Bak nå |

For `preset`-rutene tones «Bygg brød» ned i navigasjonen og får et varselkort — grovhetsdialen
der ville bygget et helt annet brød. `FORMER` (avlang kurv / rund kurv / brødform) styrer
stekeutstyret, ikke bare utseendet: `profilForUtstyr()` sender avlang + stål til `brod_apen`,
fordi en kloke må dekke emnet.

**Navigasjonen er fire grupper**, ikke elleve faner: ① Brødet · ② Prosessen · ③ Bak nå ·
Oppslag. Undernivået viser kun aktiv gruppes faner og blir en native `<select>` under 640 px.
Hver hovedveisfane har en rutefot: «Steg 2 av 3 · ◂ Start · Bak nå ▸».

**`#kontekst` («Deigen din»)** er en 340 px sticky sidespalte med mini-hevekurve og fire
nøkkeltall, synlig i alle faner unntatt «Bak nå» (der `.naakort` er konteksten). Under
1000 px blir den en bunnskuff via `<details>`. Den **speiler** — ingen kontroller, med vilje.

**`bakeSteg()` er én kilde til sannhet** for hele bakekjeden: Tidsplan, «Bak nå»,
klokkeslettene i grafen, prosessoversikten på startsiden og «Total tid» leser alle fra den.
Lag aldri en parallell utregning et annet sted — det var nettopp det som gjorde at fanene
kunne vise ulik starttid og ulik stekeprofil for samme brød.

## ⚠ LES FØRST: `PARAMETERREVISJON.md`

Alle tall i appen er gjennomgått og sortert i **faglig begrunnet** / **henger løst i
luften** / **hardkodet uten referanse**, med 12 bekreftede feil. Fem av dem er rettet;
resten står i restlista nederst i den fila. **Ikke endre et tall i appen uten å lese
den først** — den sier hvilke verdier som har kilde og hvilke som bare ser ut til å ha det.

## Grovhet følger nå Brødskala'n

Grovhetstrappa var feilmerket. Den kalte 20 % «Halvgrov» og 30 % «Grov» og toppet på
40 %, mens den norske merkeordningen sier fint 0–25,9 · halvgrovt 26–50,9 · grovt
51–75,9 · ekstra grovt 76–100 % (BKLF, https://brodogkorn.no/fakta/brodskalaen/).
Appen nådde altså aldri «grovt», men brukte ordet.

`GROVHET` er nå seks trinn — 0 / 10 / 25 / 40 / 60 / 80 % — hvert med feltet `klasse`.

**Viktigst:** Brødskala'n holder **frø og nøtter helt utenfor** regnestykket, mens
korngryn og kli teller fullt. Appen la frøene inn i både teller og nevner og kalte
resultatet «grovhet». Derfor har `SOAKERS` nå et `korn`-felt, og `brodskalan()` i
engine.js regner den offisielle grovheten. Det gamle tallet lever videre som
`fortynnetAndel` — en ekte, men helt annen størrelse. **Ikke slå dem sammen igjen.**

## Verifisert nå

Full regresjon grønn i alle kombinasjoner: 5 forvalg × 8 stekeprofiler · 30 kombinasjoner
av grovhet × tidsplan · alle 11 faner · alle 10 tillegg på min/anbefalt/maks og alle
samtidig · alle 30 meltyper · alle 11 frøtyper · 25 kombinasjoner av eltetid × maskin ·
forferment 4–26 °C · alle tre vektoppløsninger · tom melliste · antall = 0.

Etter omleggingen 29.07.2026: **196 kombinasjoner på desktop** med fagstoffkortene åpne
(5 brødtyper × 3 former × 11 visninger, pluss grovhet × tidsplan og alle tillegg på maks) ·
**110 visninger på 375 px** med kortene både åpne og lukket · **ingen vannrett dokumentscroll**
i noen visning · «Bygg brød» og hoveddeigen enige overalt · dosene treffer måltallet
(loff 1,89 mot formelens 1,886, halvgrovt 1,82 mot 1,820).

Grovhetstrappa er verifisert mot standarden: melprosentene summerer til 100 på alle seks
trinn, og beregnet klasse stemmer med den påstemplede i alle seks. Frøtesten er kjørt
eksplisitt: 600 g blandede frø flytter ikke Brødskala'n ett prosentpoeng, mens 300 g
havregryn flytter den fra 10 til 43 %.

Datagrunnlaget er komplett: ingen meltype mangler fordeler/ulemper eller tegning, ingen
brutte kryssreferanser i ordlista (44 ord), ingen tillegg uten konsekvenstekst.

Invarianter som holder og bør testes ved endringer:

    vann totalt = vann i deigen + vann i forfermenten + vann frøene binder
    totalvekt   = antall brød × vekt per brød

## Åpne punkter

**Bjørn har ikke bestemt seg for melvalg.** Han har fått rangeringen etter smak per tapt
ovnsløft — sammalt rug, sammalt spelt, svedjerug, durum semola rimacinata, emmer på topp —
men har ikke stjernemerket noen i Mel & korn ennå. Favorittfunksjonen virker; han må velge.

**Grovhets- og tidsplankortene i Bygg brød mangler ⓘ.** De er klikkbare kort, ikke
`.field`-elementer, så `festInfo()` treffer dem ikke. Han ble spurt om de skulle konverteres,
og har ikke svart.

**Dose–respons-panelet dekker frø, honning, fett og malt**, men ikke melvalg. Å koble
`glutenbidrag` til forventet ovnsløft ville vært en naturlig utvidelse.

**Fra parameterrevisjonen, ikke rettet ennå** (full liste i `PARAMETERREVISJON.md`):
`0,40 × grovAndel` i `maalDoseFor` er nå det eneste ukildede leddet i en ellers grundig
kildet formel, og det betyr mer etter at trappa går til 80 % grovt. Kode og tekst er
dessuten uenige fire steder: salt (koden 1,7/2,4, teksten 1,8/2,2), ciabatta (koden 72 %,
teksten 78 %), sukker (6 mot 7 %) og bløtlegging (3 mot 5 prosentpoeng). `miljo <= 12`
— skillet mellom kald og varm heving — står hardkodet åtte steder uten å være en
navngitt konstant.

## Foreslått, ikke besluttet

Tre ting research-gjennomgangene pekte på som modellen ennå ikke gjør:

1. **Rug trenger et syre-flagg.** Taket er 25 % i ren gjærdeig, men 40 % med 1–2 % eddik på
   melvekt. Det er den eneste ingrediensen der et tilsetningsstoff flytter taket vesentlig.
2. **Havre og bygg trenger en vannkompensasjonsregel.** Målt gjenoppretter +20 % vann over
   farinografverdien volumet nesten fullstendig. Uten regelen straffer appen dem dobbelt:
   først for fortynningen, så for underhydreringen den selv forårsaket.
3. **Rug og bygg/havre bør ha ulike straffefunksjoner.** Rug bryter ned aktivt
   (arabinoksylan hindrer proteinaggregering + amylase angriper stivelsen under steking);
   bygg og havre fortynner og konkurrerer om vann. Samme prosentandel gir ikke samme skade.

## Fire feil å ikke gjenta

Alle ble gjort i denne økten og korrigert først etter at Bjørn påpekte dem.

**Ikke slutt fra preset-etiketter til hva han baker.** Forvalget «Det diggeste brødet» var
merket «din favorittblanding» og inneholdt 30 % enkorn. Jeg bygget både råd og
research-oppdrag rundt enkorn. Han hadde aldri nevnt det, og enkorn viste seg dessuten å
være nesten umulig å få tak i i Norge. Forvalget er slettet på hans forespørsel.

**Ikke hardkod vanene hans som standardverdier.** Han nevnte at han elter 15–20 minutter;
jeg satte 18 som default. Han ba uttrykkelig om at vanene hans ikke skulle styre
anbefalingene. Jeg sa meg enig — og glemte likevel å fjerne tallet da researchen kom. Det
måtte påpekes en gang til. Eltetiden utledes nå fra maskinens friksjon.

**Ikke la ukildede tall i `FLOURS`-notatene stå som fakta.** Appen påsto at spelt «tåler
maks ~4 min elting». Målt farinografstabilitet er 9,5 minutter. Tallet var trolig en
forveksling av utviklingstid med maks eltetid.

**«Rendrer uten feil» er ikke det samme som «ser riktig ut».** Korntegningene besto alle
tester, men på skjermbildet var samtlige kornslag umulige å skille. Det samme gjaldt
+/−-knappene, som «ikke virket» fordi tallfeltet mellom dem var to piksler bredt.
Ta skjermbilde av visuelle endringer før du sier deg ferdig.

## Testmetode

Forhåndsvisningsruta hurtigbufrer JS-filene svært aggressivt og serverer gamle versjoner.
`location.reload()` virker bare av og til. Metoden som alltid virker er å hente filene med
`fetch` og kjøre dem i eget scope — se `brodlab-appen` i minnet for oppskriften.
Sjekk alltid at koden er fersk før du stoler på en test.
