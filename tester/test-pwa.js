/* PWA: manifest, ikoner, service worker, offline og snarveier. */
const { chromium } = require('playwright');
require('fs').mkdirSync(__dirname + '/skjermbilder', { recursive: true });
const D = __dirname + '/skjermbilder/';
const B = 'http://localhost:8123/';
let feil = 0;
const ok = (n, s, e) => { console.log((s ? '  ✓ ' : '  ✗ ') + n + (e ? ' — ' + e : '')); if (!s) feil++; };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  /* Innloggingsporten (31.07) står foran hele appen. Kroken settes på HELE
     konteksten her, fordi disse suitene åpner flere sider. Kun i tester. */
  await ctx.addInitScript(() => { window.__FB_TEST_INGEN_PORT = true; });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(B);
  await page.waitForTimeout(500);

  console.log('— Manifest —');
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  ok('manifest lenket fra index.html', href === 'manifest.webmanifest');
  const man = await page.evaluate(async h => (await fetch(h)).json(), href);
  ok('name og short_name satt', !!man.name && !!man.short_name, man.name);
  ok('display er standalone', man.display === 'standalone', man.display);
  ok('start_url og scope er relative', man.start_url === './' && man.scope === './');
  ok('har 192 px-ikon', man.icons.some(i => i.sizes === '192x192'));
  ok('har 512 px-ikon', man.icons.some(i => i.sizes === '512x512' && i.purpose === 'any'));
  ok('har maskable-ikon', man.icons.some(i => (i.purpose || '').includes('maskable')));
  ok('theme_color i manifest og meta', !!man.theme_color &&
    await page.locator('meta[name=theme-color]').getAttribute('content') === man.theme_color);

  console.log('— Ikonfilene finnes og er riktig størrelse —');
  for (const i of man.icons) {
    const r = await page.evaluate(async src => {
      const res = await fetch(src);
      if (!res.ok) return { ok: false };
      const bl = await res.blob();
      const bm = await createImageBitmap(bl);
      return { ok: true, w: bm.width, h: bm.height, type: bl.type };
    }, i.src);
    const [bw] = i.sizes.split('x').map(Number);
    ok(i.src + ' er ' + i.sizes + ' PNG', r.ok && r.w === bw && r.h === bw && r.type === 'image/png',
      r.ok ? r.w + '×' + r.h + ' ' + r.type : 'kunne ikke hentes');
  }

  console.log('— Service worker —');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 })
    .catch(() => {});
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return { finnes: !!reg, scope: reg && reg.scope, aktiv: !!(reg && reg.active), styrer: !!navigator.serviceWorker.controller };
  });
  ok('service worker registrert', sw.finnes);
  ok('er aktiv', sw.aktiv);
  ok('styrer siden', sw.styrer);
  ok('scope dekker appen', (sw.scope || '').endsWith('/'), sw.scope);
  const cachet = await page.evaluate(async () => {
    const navn = await caches.keys();
    const c = await caches.open(navn[0]);
    return { navn, antall: (await c.keys()).length };
  });
  ok('appskallet er cachet', cachet.antall >= 10, cachet.navn + ': ' + cachet.antall + ' filer');

  console.log('— Offline —');
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForTimeout(800);
  ok('appen laster uten nett', await page.locator('#bunnmeny button').count() === 6);
  ok('CSS lastet fra cache', await page.locator('#telefon').evaluate(e => getComputedStyle(e).maxWidth) === '430px');
  ok('motoren regner offline', await page.evaluate(() => typeof regn === 'function' && regn(window.__FB.S).melTotal > 0));
  await page.screenshot({ path: D + 'pwa-offline.png' });
  await ctx.setOffline(false);

  console.log('— Snarveier —');
  ok('manifestet har snarveier', (man.shortcuts || []).length === 2);
  for (const s of (man.shortcuts || [])) {
    const p2 = await ctx.newPage();
    await p2.goto(B + s.url.replace('./', ''));
    await p2.waitForTimeout(500);
    const aktiv = await p2.evaluate(() => window.__FB.S.skjerm);
    const vent = new URL(s.url, B).searchParams.get('skjerm');
    ok('snarveien «' + s.short_name + '» åpner ' + vent, aktiv === vent, 'fikk ' + aktiv);
    await p2.close();
  }

  ok('ingen JS-feil', errs.length === 0, errs.join(' | '));
  await browser.close();
  console.log(feil === 0 ? '\nALLE TESTER GRØNNE' : '\n' + feil + ' TESTER RØDE');
  process.exit(feil === 0 ? 0 : 1);
})();
