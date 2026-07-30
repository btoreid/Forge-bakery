# Gjennomgang: hva den opprinnelige appen har, og hva mobilappen mangler

Full opptelling mot repoet (`btoreid/Forge-bakery`, master). Kilder: `index.html` (14 seksjoner),
`js/app.js` (visningsfunksjoner), `js/data.js` (18 datasett).
Status: **✔ inne** · **◑ forenklet** · **✘ mangler**.

---

## 1 · Datasett i `js/data.js`

| Datasett | Innhold i repoet | Status i mobilappen |
|---|---|---|
| `FLOURS` | **30 meltyper**: protein, absorpsjon, styrke, maxPct, kr/kg, grov-flagg, notat | ◑ 21 hentet inn |
| `MEL_INFO` | **plus/minus-lister per meltype** (2–4 fordeler, 2–3 ulemper) + `glutenbidrag` + `tilgang` (daglivare/meny/helsekost/nett/vanskelig) | ✘ mangler helt — mobilappen har bare notatet |
| `MELTALL_INFO` | ⓘ-forklaring på **hvert tall** på melkortet (protein, absorpsjon, styrke, maxPct, pris) | ✘ mangler |
| `GLUTENBIDRAG_TEKST` | fire klasser med farge og forklaring | ◑ etiketten vises, forklaringen mangler |
| `KORN_SVG` + `MEL_KORN` | **tegning av hvert kornslag**, mørkere fyll for sammalt | ✘ mangler |
| `SOAKERS` | **11 frø/korn**: kaldt/varmt vannbinding, `type`, `korn`-flagg, kr/kg, notat | ◑ 7 lagt inn som `TILLEGG`, ikke koblet ennå |
| `TILLEGG` | **10 tillegg** med `hvorfor` / `obs` / `opt` / `opp` / `ned` | ◑ data lagt inn, UI ikke ferdig koblet |
| `TILLEGG_EFFEKT` | **dose–responskurver** (frø, honning, fett, malt) → ovnsløft, smak, saftighet, med kilder | ✘ mangler — appens «Hva valgene koster»-panel finnes ikke |
| `PARAM_INFO` | ⓘ på **hvert parameterfelt**: navn, `opt`, `opp`, `ned`, `hvorfor` — hydrering, salt, gjær, startTemp, ffTimer, planUtbak, eltetid m.fl. | ✘ mangler (bare mel har ⓘ nå) |
| `BAKE_PROFILES` | 8 stekeprofiler + notat | ✔ alle 8, styrer kjeden |
| `PRESETS` | 5 kalibrerte forvalg med `refPlan` og notat | ◑ brødtypene finnes, forvalgets refPlan/notat brukes ikke |
| `BROTYPER` | 5 typer med `rute` (bygg/preset), `harForm`, `passer`, `merk` | ◑ typene finnes; rute-logikken og de redaksjonelle tekstene mangler |
| `FORMER` | 3 former: kFaktor, mål, utstyr, `om`, `snitt` | ✘ mangler — formvalget er borte, og det styrer stekeutstyret |
| `GROVHET` | 6 trinn med **melblanding per trinn**, klasse, basisHydrering | ◑ trinnene finnes, men blandingen er min egen 77/23-fordeling |
| `TIDSPLANER` | 5 planer med forferment, heveplan, `om`, `ovnslos` | ✔ alle 5 |
| `UTSTYR` | 6 utstyrstyper med effusivitet, kontakttemperatur, forvarming, damp, `best`, advarsel | ✘ mangler |
| `ORDLISTE` | **44 fagord** med definisjon, gruppe og kryssreferanser | ✘ mangler |
| `TIPS` | **23 fagstoffseksjoner**, fire merket ⚠ (motsier notatene) | ◑ bare titlene |

## 2 · Visninger i `js/app.js`

| Visning | Hva den gjør | Status |
|---|---|---|
| `tegnStart` | brødtype, **form og kurv**, emnestørrelse mot gryta (21,5 cm), prosessoversikt, rutekort | ◑ brødtype + størrelse; form, emnemål og prosessoversikt mangler |
| `tegnBygg` | grovhetstrapp med melblanding, tidsplan, tilleggsmeny, **dose–respons** | ◑ grovhet og tid; tilleggsmeny og dose–respons mangler |
| `tegnOppskrift` | melrader med **gram-felt du kan skrive i**, korntegning, favorittsortering, frørader med kaldt/varmt-valg, advarsler når blandingen ikke tåler hydreringen | ◑ melrader finnes, men uten grammfelt, tegning og advarsler |
| `tegnEffekt` | hva frø og smakstilsetninger **koster og gir** (ovnsløft/smak/saftighet), interpolert fra måleserier | ✘ |
| `tegnSeOver` | parametergjennomgang før klokka settes | ✘ — erstattet av sum-skuffen |
| `tegnGjaering` | gjæringsdose, **heveplan-tabell du kan redigere** (legg til trinn, temp per trinn), «løs for …», resultatnotiser | ✘ heveplanen kan ikke redigeres i mobilappen |
| `tegnDoseForklaring` | måltallet **tegnet** som areal | ✘ |
| `tegnTempChart` | deigtemp, gjæringsfart og akkumulert gjæring mot klokka + minikurve i kontekstpanelet | ✘ |
| `tegnRateTabell` | gjæringsfart ved 16 temperaturer, og hvor mange grader som dobler farten | ✘ |
| `tegnDeigtemp` | vanntemperatur via varmebalanse, ismengde, **friksjonstabell** (eltetid × maskin), **kalibrator** for din maskin | ✘ — appen viser 17,5 °C som et fast tall |
| `tegnPlan` | tidslinje + **handleliste** «dette må være i huset» | ◑ tidslinje finnes, handleliste mangler |
| `tegnBakNaa` | kjeden med avhuking, framdriftslinje, «nå»-kort | ✔ (ett steg om gangen i stedet for liste) |
| `tegnSteking` | 8 profiler + **tre konkrete endringer i praksisen din** | ◑ profilene finnes, de tre endringene mangler |
| `tegnMelbibliotek` | 30 meltyper med tegning, fordeler/ulemper, ⓘ per tall, favorittstjerne, søk, gruppe- og glutenbidragsfilter | ◑ 21 typer, søk, gruppefilter, stjerne — mangler tegning, plus/minus, ⓘ per tall, bidragsfilter |
| `tegnOrdliste` | 44 ord i grupper, klikkbare, med kryssreferanser | ✘ |
| `tegnTeknikk` | 23 seksjoner med søk og «åpne alle» | ◑ bare titler |
| `tegnLogg` | logg med dose/hydrering/gjær/temp, **«bruk dosen som mål»**, tidligere bak | ✔ + bilder (nytt) |
| `tegnKontekst` | «Deigen din» — speiler dose, avvik mot mål, hevemål, kald/varm andel | ◑ sum-linja dekker deler av det; avvik og kald/varm-andel mangler |

## 3 · Mekanikk som er lett å miste

| Mekanisme | Repoet | Status |
|---|---|---|
| ⓘ på hvert felt (`festInfo` + `PARAM_INFO`) | opt / opp / ned / hvorfor per parameter | ✘ (bare mel) |
| Vektoppløsning (`vektTrinn`, `veiG`, `underVekt`) | hele gram / 0,1 g / 0,01 g, og advarsel når mengden er under 20× minste trinn | ✘ |
| Steppere med hold-for-repetisjon | `leggTilSteppere` | ◑ enkeltklikk |
| Skriv inn gram direkte på melraden | `settMelGram`, itererer til det står stille | ✘ |
| Favorittmel løftes i velgeren | `S.favorittMel` | ◑ favoritter merkes, men sorterer ikke melvelgeren |
| Frøvann «på toppen» eller «fra hydreringen» | `froVannPaaToppen` | ✘ |
| Kaldbløt vs skålding per frøtype | `SOAKERS.type`, 1,85× overskudd | ◑ ligger i de nye dataene, ikke i UI |
| Lagring i localStorage + gjenoppretting av fokus | `LAGER = 'brodlab.v1'` | ✘ (prototypen glemmer alt) |
| Feilbanner ved stille feil | `visFeilbanner` | ✘ |
| Advarsler når melblandingen ikke tåler hydreringen | `melAdvarsel`, `maxPct` per sort | ◑ bare «over taket»-merking |

---

## Gjort 29.07.2026 (etter gjennomgangen)

1. **Tilleggene**: tre grupper — Frø (utenfor Brødskala'n), Korn og gryn (teller fullt),
   Smak og skorpe — 10 tillegg med mengde i % og gram, vannbinding per type, og ⓘ med
   `hvorfor` / `obs` / `opt` / `opp` / `ned` fra `TILLEGG`. Bak nå får **ett steg per
   behandling** (rist / kaldbløt / skålding), ikke ett felles frøsteg.
2. **Brødskala'n regnes riktig**: korngryn og kli teller i både teller og nevner, frø holdes
   utenfor. Grovheten i sum-linja er nå den offisielle, ikke melprosenten.
3. **Vann og deigtemp**: vanntemperaturen regnes av ekte varmebalanse (c_mel 1,81, c_vann 4,181)
   med maskinvalg (0,15 / 0,4 / 0,6 / 1,0 °C per min), eltetid og meltemperatur — og viser
   arbeidet i Wh/kg mot målsonen 3–5.
4. **ⓘ på parametrene**: hydrering, salt, gjær, deigtemp, eltetid og forferment, med repoets egne
   opt/opp/ned/hvorfor-tekster.
5. **Melradene** har ⓘ med hva mer og mindre av den sorten gjør, og taket per sort.
6. **Alle 8 stekeprofiler**, og valget styrer bakekjeden (forvarming, damp, steketid, kjerne).

7. **Gjæringen i tid**: kurve med gjæringsfart, akkumulert gjæring og deigtemperatur mot klokka, pluss andelen av gjæringen per fase — regnet, ikke hardkodet. Viser også hvor lenge deigen bruker på å bli kald.

## Gjenstår

## Forslag til rekkefølge

1. **Tilleggene ferdig** (pågår): tre grupper — frø (utenfor Brødskala'n), korn og gryn (teller
   fullt), smak og skorpe — hver rad med mengde, vannbinding, behandling (rist / kaldbløt /
   skålding) og ⓘ med `hvorfor` / `opt` / `opp` / `ned`.
2. **ⓘ overalt** fra `PARAM_INFO`: hydrering, salt, gjær, deigtemp, eltetid, forfermentens timer.
3. **Dose–respons** (`TILLEGG_EFFEKT`): ovnsløft, smak og saftighet som tre kurver mot valgene —
   det er dette som gjør «hva koster snarveien» ekte i stedet for min interpolasjon.
4. **Deigtemp-skjerm**: varmebalanse, friksjonstabell og kalibrator. Vanntemperaturen er i dag et
   fast tall i mockupen, og det er en av appens beste funksjoner.
5. **Heveplanen redigerbar** + gjæringskurven, og «løs for …».
6. **Melbiblioteket komplett**: 30 typer, plus/minus, ⓘ per tall, korntegninger.
7. **Ordliste og fagstoff** med tekst, ikke bare titler.
8. **Form og kurv** tilbake i steg 1 — den styrer stekeutstyret, ikke bare utseendet.
9. **Vektoppløsning og gramfelt** på melradene.
10. **Lagring** slik at appen husker mellom økter.

Punkt 1–4 er de som endrer hva appen kan brukes til. 5–10 er komplettering.
