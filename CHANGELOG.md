# Endringslogg — Brødlab

Nyeste øverst. Hver post sier **hva** som ble endret, **hvorfor**, og **hvor i koden** —
slik at arbeidet kan tas opp igjen kaldt, uten forhistorien i hodet.

Les `STATUS.md` først for gjeldende tilstand og åpne punkter.

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
