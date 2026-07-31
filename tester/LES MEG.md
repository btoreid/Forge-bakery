# Tester

Playwright-tester for V2, kjørt i ekte Chromium. De ligger her fordi flere av dem
har fanget feil som ikke var synlige i koden — se «Hva de har fanget» nederst.

Testene rører **ikke** appen: den lastes fortsatt uten byggverktøy og uten
`node_modules`. Alt npm-stoffet her gjelder bare testene.

## Kjør dem

```bash
cd tester
npm install          # én gang
node kjor-alle.js    # hele regresjonen, ~3 min
```

`kjor-alle.js` starter serverne selv og rydder opp etterpå. Vil du se detaljene
i én suite, kjør den alene mens serverne står — eller bare:

```bash
node test-logg.js    # kjor-alle starter serverne; ellers se «Serverne» under
```

Er nettleseren ikke funnet, sjekk at `executablePath` peker på en Chromium som
finnes. I dette miljøet ligger den på `/opt/pw-browsers/chromium`, og
`npx playwright install` virker ikke.

## Suitene

| Fil | Dekker |
|---|---|
| `test-v2.js` | Tid (dato/klokkeslett, plankort, nå-markør), gul/rød sone på tillegg og salt, «hva valgene koster» som ±, favorittmerking, deigregnskapet |
| `test-r3.js` | Bytte bakst med bekreftelse, «om dette baket», stekeprofiler uten ★/brødform, loggbilder, sikkerhetskopi ut og inn |
| `test-logg.js` | Bilder i fullskjerm (piler, piltaster, Esc), redigering, sletting, at riktig post treffes |
| `test-pyrex.js` | At «Pyrexen står i ovnen» gir 260 °C — og at deig-i-gryta **ikke** får det |
| `test-flytt.js` | Rota = V2, `index-v1.html` = V1, og at `index-v2.html` videresender med fragment i behold |
| `test-pwa.js` | Manifest, ikonstørrelser, service worker, offline, snarveier |
| `test-cache.js` | At en vanlig refresh gir ny kode uten at noe tømmes, og hva det koster i data |

## Serverne

To, fordi de svarer på ulike spørsmål:

- **8123** (`python3 -m http.server`) — serverer appen som den er.
- **8124** (`pages-server.js`) — hermer GitHub Pages: `Cache-Control: max-age=600`,
  ETag og 304. Uten disse hodene ville `test-cache.js` aldri sett cache-problemet
  den er skrevet for å fange, og testen ville vært grønn av feil grunn.

`pages-server.js` har et `/__logg`-endepunkt som returnerer hva serveren faktisk
har svart (og nullstiller). Det er eneste ærlige måte å måle 304-er på, siden
service workerens egne kall går utenom siden og ikke synes i `page.on('response')`.

## `lag-ikoner.js`

Ikke en test — den tegner appikonene (`icons/`) i Chromium fra appens eget
brødikon. Kjør den på nytt hvis merkevaren endres.

## Hva de har fanget

Verdt å vite, for det forklarer hvorfor de er verdt å beholde:

- **Service workeren så riktig ut og virket ikke.** `test-cache.js` var rød i to
  runder mot en tilsynelatende korrekt «nett først»-strategi. Målingen viste at
  service workeren ved refresh kun får navigasjonsforespørselen — script og CSS
  serveres av Chrome rett fra HTTP-cachen. Ingen fetch-strategi kunne fikset det.
- **Re-entrant render kunne nullstille hele appen.** Dukket opp som en
  tilsynelatende urelatert feil da et tallfelt mistet fokus under re-render.
- **Indeksfellen i loggen.** Lista vises nyeste-først, så sletting via
  visningsindeks traff feil post. `test-logg.js` sletter den øverste og sjekker
  at riktig post ble borte.
