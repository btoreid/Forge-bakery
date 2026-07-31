/* Pyrex-i-ovnen-valget + at «rundbrød» er ute av utstyrsteksten. */
const { chromium } = require('playwright');
require('fs').mkdirSync(__dirname + '/skjermbilder', { recursive: true });
const D = __dirname + '/skjermbilder/';
let feil = 0;
const ok = (n, s, e) => { console.log((s ? '  ✓ ' : '  ✗ ') + n + (e ? ' — ' + e : '')); if (!s) feil++; };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('http://localhost:8123/');
  await page.waitForTimeout(400);

  console.log('— Utstyrsteksten —');
  const utstyr = page.locator('.kort:has-text("Stekeutstyr")');
  await utstyr.scrollIntoViewIfNeeded();
  const uTekst = await utstyr.innerText();
  ok('ingen «rundbrød» i utstyrsteksten', !/rundbrød/i.test(uTekst));
  ok('valget «Pyrexen står i ovnen» finnes', await page.locator('.pyrex-valg').count() === 1);

  console.log('— Av: 230 °C —');
  ok('avkrysning er av som standard', await page.evaluate(() => !window.__FB.S.pyrexIOvn));
  let prof = await page.evaluate(() => { const r = regn(window.__FB.S); return { id: r.prof.id, inn: r.prof.inn, ned: r.prof.ned, varm: !!r.prof.varmPaa }; });
  ok('profilen er kloke på 230 °C', prof.id === 'brod_kloke' && prof.inn === 230, JSON.stringify(prof));
  ok('teksten forklarer 220-grensen', /220/.test(uTekst) && /Steker på 230/.test(uTekst));
  await page.screenshot({ path: D + 'pyrex-av.png' });

  console.log('— På: 260 °C —');
  await page.locator('.pyrex-valg input').check();
  await page.waitForTimeout(400);
  prof = await page.evaluate(() => { const r = regn(window.__FB.S); return { id: r.prof.id, inn: r.prof.inn, ned: r.prof.ned, varm: !!r.prof.varmPaa }; });
  ok('profilen kjøres varm: 260 → 230', prof.inn === 260 && prof.ned === 230 && prof.varm, JSON.stringify(prof));
  const uTekst2 = await page.locator('.kort:has-text("Stekeutstyr")').innerText();
  ok('konsekvensteksten er oppdatert', /Steker på 260/.test(uTekst2));
  ok('advarsel om rask nedkjøling vises', /aldri i vann/.test(uTekst2));
  await page.screenshot({ path: D + 'pyrex-paa.png' });

  console.log('— Følger gjennom til Prosess og Oppslag —');
  await page.click('#bunnmeny button:has-text("Prosess")');
  await page.waitForTimeout(400);
  // Prosess viser ett steg om gangen — gå til ovnssteget og til stekesteget.
  await page.click('.valgkort:has-text("Sett på ovnen")');
  await page.waitForTimeout(300);
  const ovnSteg = await page.locator('.stegkort').first().innerText();
  ok('ovnssteget sier 260 °C', /260 °C/.test(ovnSteg), ovnSteg.replace(/\n/g, ' | ').slice(0, 90));
  ok('ovnssteget sier ikke 230', !/230 °C/.test(ovnSteg));
  await page.click('.valgkort:has-text("Stek")');
  await page.waitForTimeout(300);
  const stekSteg = await page.locator('.stegkort').first().innerText();
  ok('stekesteget sier 260 → 230 °C', /260/.test(stekSteg) && /230/.test(stekSteg), stekSteg.replace(/\n/g, ' | ').slice(0, 100));
  await page.click('#bunnmeny button:has-text("Oppslag")');
  await page.waitForTimeout(300);
  await page.click('.valgkort:has-text("Stekeprofiler")');
  await page.waitForTimeout(300);
  const opp = await page.locator('.innhold').innerText();
  ok('oppslaget markerer riktig profil som planen din', opp.includes('planen din'));

  console.log('— Deig-i-gryta får IKKE varmt alternativ —');
  await page.click('#bunnmeny button:has-text("Brød")');
  await page.waitForTimeout(300);
  await page.selectOption('select[aria-label="Stekeutstyr"]', 'glass_stal');
  await page.waitForTimeout(400);
  ok('valget er borte for deig-i-gryta', await page.locator('.pyrex-valg').count() === 0);
  const prof2 = await page.evaluate(() => { const r = regn(window.__FB.S); return { id: r.prof.id, inn: r.prof.inn }; });
  ok('deig-i-gryta står på 230 °C selv med flagget på', prof2.inn === 230, JSON.stringify(prof2));
  ok('flagget er fortsatt satt i state', await page.evaluate(() => window.__FB.S.pyrexIOvn === true));

  // overlever omlasting
  await page.selectOption('select[aria-label="Stekeutstyr"]', 'stal15');
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForTimeout(500);
  ok('valget huskes etter omlasting', await page.locator('.pyrex-valg input').isChecked());

  ok('ingen JS-feil', errs.length === 0, errs.join(' | '));
  await browser.close();
  console.log(feil === 0 ? '\nALLE TESTER GRØNNE' : '\n' + feil + ' TESTER RØDE');
  process.exit(feil === 0 ? 0 : 1);
})();
