/* Kjernetesten: kommer ny kode fram ved en vanlig refresh, uten at noe tømmes?
   Serveren sender max-age=600 + ETag, akkurat som GitHub Pages — det er den
   max-age-en som gjorde at gammel kode ble hengende. */
const { chromium } = require('playwright');
require('fs').mkdirSync(__dirname + '/skjermbilder', { recursive: true });
const fs = require('fs');
const B = 'http://localhost:8124/';
const FIL = '/home/user/Forge-bakery/js/data.js';
let feil = 0;
const ok = (n, s, e) => { console.log((s ? '  ✓ ' : '  ✗ ') + n + (e ? ' — ' + e : '')); if (!s) feil++; };

(async () => {
  const original = fs.readFileSync(FIL, 'utf8');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  /* Innloggingsporten (31.07) står foran hele appen. Kroken settes på HELE
     konteksten her, fordi disse suitene åpner flere sider. Kun i tester. */
  await ctx.addInitScript(() => { window.__FB_TEST_INGEN_PORT = true; });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));

  try {
    console.log('— Første besøk —');
    await page.goto(B);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    ok('service worker styrer', await page.evaluate(() => !!navigator.serviceWorker.controller));
    const foer = await page.evaluate(() => MASKIN_INFO.spiralHjemme.navn);
    ok('leser opprinnelig data', /Ooni/.test(foer), foer);

    console.log('— Ny versjon pushes (fila endres på serveren) —');
    fs.writeFileSync(FIL, original.replace("navn:'Ooni Halo Pro (spiral hjemme)'", "navn:'ENDRET AV TESTEN'"));
    // Ingen cache-tømming, ingen hard reload — bare en helt vanlig refresh.
    await page.reload();
    await page.waitForTimeout(1200);
    const etter = await page.evaluate(() => MASKIN_INFO.spiralHjemme.navn);
    ok('vanlig refresh gir NY kode', etter === 'ENDRET AV TESTEN', etter);
    ok('ingen JS-feil etter oppdatering', errs.length === 0, errs.join(' | '));

    console.log('— Uendret app koster lite (304-revalidering) —');
    fs.writeFileSync(FIL, original);
    await page.reload();
    await page.waitForTimeout(1000);
    const tilbake = await page.evaluate(() => MASKIN_INFO.spiralHjemme.navn);
    ok('tilbakerulling merkes også', /Ooni/.test(tilbake), tilbake);
    // Hva serveren FAKTISK svarte. Sidelytteren duger ikke her: service
    // workerens egne kall går utenom siden, og det er nettopp de som
    // revaliderer. Serverloggen er eneste ærlige kilde.
    await fetch(B + '__logg');                                  // nullstill
    await page.reload();
    await page.waitForTimeout(1500);
    const linjer = await (await fetch(B + '__logg')).json();
    const n304 = linjer.filter(l => l.status === 304).length;
    const n200 = linjer.filter(l => l.status === 200).length;
    const bytes = linjer.reduce((s, l) => s + (l.bytes || 0), 0);
    ok('serveren svarer 304 på uendrede filer', n304 > 0, n304 + ' stk 304, ' + n200 + ' stk 200');
    ok('lite data ved uendret app', bytes < 60000,
      Math.round(bytes / 1024) + ' KB lastet ned — app-filene er 385 KB');

    console.log('— Offline virker fortsatt —');
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForTimeout(1000);
    ok('appen laster uten nett', await page.locator('#bunnmeny button').count() === 8);
    await ctx.setOffline(false);

    console.log('— Versjonsvisning i Oppslag —');
    await page.reload();
    await page.waitForTimeout(900);
    await page.click('#bunnmeny button:has-text("Oppslag")');
    await page.waitForTimeout(400);
    const opp = await page.locator('.innhold').innerText();
    ok('viser denne appversjonen', /Denne appversjonen/.test(opp));
    ok('har oppdateringsknapp', await page.locator('button:has-text("Se etter oppdatering")').count() === 1);
    ok('sier at cache ikke må tømmes', /aldri måtte tømme cachen/.test(opp));
    await page.screenshot({ path: __dirname + '/skjermbilder/cache-versjon.png' });
  } finally {
    fs.writeFileSync(FIL, original);   // alltid legg tilbake, uansett utfall
    await browser.close();
  }
  const uendret = fs.readFileSync(FIL, 'utf8') === original;
  ok('data.js lagt tilbake uendret', uendret);
  console.log(feil === 0 ? '\nALLE TESTER GRØNNE' : '\n' + feil + ' TESTER RØDE');
  process.exit(feil === 0 ? 0 : 1);
})();
