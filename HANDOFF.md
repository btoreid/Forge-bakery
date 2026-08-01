# Oppstartsprompt — ny chat / ny økt

Lim inn teksten under i en ny chat for å ta opp arbeidet med full kontekst.
Oppdater den når arkitektur eller åpne punkter endrer seg.

---

Jeg fortsetter arbeidet på **Forge Bakery** (brødbaking-PWA), repo
`btoreid/forge-bakery`, gren **`master`** (live på GitHub Pages, auto-deploy ved push).

**Les først, før du rører kode:**
1. `STATUS.md` — gjeldende tilstand, hvilke filer som er aktive, arkitektur.
2. Øverste post i `CHANGELOG.md` — siste økts endringer med begrunnelser.
3. Arkitekturreglene og «Arbeidsmåte Bjørn har bedt om» nederst i `CHANGELOG.md`.

**Kjernefakta:**
- V2 er aktiv: `index.html` + `js/data.js`, `js/engine.js`, `js/sky.js`,
  `js/app-v2.js`, `css/style-v2.css`. V1 (`index-v1.html` + `js/app.js`) er frosset,
  MEN deler `data.js`/`engine.js`.
- Motoren er to rene funksjoner i `engine.js`: `regn(state)` og
  `kjede(state, r, ferdigMs)`. `app-v2.js` tegner, regner aldri.
- Ingen bundler, vanlig `h()`-DOM-helper, state i localStorage.
- Tester: `node tester/kjor-alle.js` (Playwright, Chromium på
  `/opt/pw-browsers/chromium`). Alle 9 skal være grønne før push.
- Formatering: bruk `fmt`/`gradTxt` (komma-desimal) for brukervendte tall; punktum
  kun i CSS/SVG.

**Arbeidsmåte:** Bjørn er teknisk sterk, vil ha begrunnelser og tall. Bakefaglige
avgjørelser skal forankres i teori — bruk `baker`-subagenten for tvilstilfeller.
Ovnsløft er førsteprioritet. Test i nettleser med Playwright (skjermbilde, ikke bare
«rendrer uten feil»), kjør suiten, commit med tydelig melding, push til `master`.

**Åpne punkter:**
- V1s `js/app.js` (~linje 951, `takHyd`) har den gamle hydreringstakfeilen — ikke
  fikset siden V1 er frosset. Vurder om den skal rettes.
- Web Push for varsling med låst skjerm gjenstår (krever push-server via Supabase).

Jeg holder på med fulltesting og melder feil/ønsker fortløpende.
