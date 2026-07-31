/* Runde 3: brødtype-bytte m/bekreftelse, om-baket, logg-bilder, backup,
   stekeprofiler uten ★/form, anbefalt-til. */
const { chromium } = require('playwright');
require('fs').mkdirSync(__dirname + '/skjermbilder', { recursive: true });
const URL = 'http://localhost:8123/';
const SHOT = d => `${__dirname}/skjermbilder/${d}.png`;
let feil = 0;
const ok = (navn, sant, ekstra) => { console.log((sant ? '  ✓ ' : '  ✗ ') + navn + (ekstra ? ' — ' + ekstra : '')); if (!sant) feil++; };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(300);

  console.log('— Brødtype-bytte —');
  // legg på et særpreg som IKKE skal følge med til ciabatta
  await page.evaluate(() => { const FB = window.__FB; FB.S.hyd = 80; FB.S.tillegg = { solsikke: 10 }; FB.render(); });
  await page.click('.brodvalg-hoved:has-text("Ciabatta")');
  await page.waitForTimeout(200);
  ok('bekreftelseskort vises', await page.locator('.varsel:has-text("starte på nytt?")').count() === 1);
  ok('brødtype IKKE byttet ennå', await page.evaluate(() => window.__FB.S.brotype) === 'grovbrod');
  await page.screenshot({ path: SHOT('r3-bekreft') });
  // avbryt først
  await page.click('button:has-text("Avbryt")');
  await page.waitForTimeout(200);
  ok('avbryt lukker kortet', await page.locator('.varsel:has-text("starte på nytt?")').count() === 0);
  // så bekreft
  await page.click('.brodvalg-hoved:has-text("Ciabatta")');
  await page.waitForTimeout(200);
  await page.click('button:has-text("Ja, start på nytt")');
  await page.waitForTimeout(250);
  const st = await page.evaluate(() => { const S = window.__FB.S; return { brotype: S.brotype, tillegg: S.tillegg, hyd: S.hyd, antall: S.antall, ff: S.ff, ffType: S.ffType }; });
  ok('byttet til ciabatta', st.brotype === 'ciabatta');
  ok('tillegg nullstilt (ingen solsikke i ciabatta)', Object.keys(st.tillegg).length === 0, JSON.stringify(st.tillegg));
  ok('hyd tilbake til standard', st.hyd === 75, String(st.hyd));
  ok('preset-forferment synket (biga)', st.ff === true && st.ffType === 'biga');

  /* «Om dette baket» er flyttet fra ett kollapskort for den valgte baksten til
     en ⓘ per brødtype — da kan man lese hva en ciabatta ER før man bytter til
     den, som er når man lurer. Stegkjeden følger fortsatt med for den VALGTE. */
  console.log('— Om dette baket (ⓘ per brødtype) —');
  const raden = page.locator('.brodvalg:has-text("Ciabatta")');
  await raden.locator('.info-ring').click();
  await page.waitForTimeout(250);
  const omTekst = await page.locator('.info-boks').first().innerText();
  ok('beskrivelse av ciabatta', /biga/i.test(omTekst), omTekst.slice(0, 60));
  ok('prosess-steg fra kjeden', /Prosessen · totalt/.test(omTekst) && /Stek/.test(omTekst));
  await page.screenshot({ path: SHOT('r3-ombaket') });
  // en ikke-valgt bakst viser beskrivelsen, men ingen oppdiktet kjede
  await page.locator('.brodvalg:has-text("Focaccia")').locator('.info-ring').click();
  await page.waitForTimeout(250);
  const omAnnen = await page.locator('.info-boks').first().innerText();
  ok('ikke-valgt bakst: beskrivelse uten kjede', /salamoia|olje/i.test(omAnnen) && !/Prosessen · totalt/.test(omAnnen));
  await page.locator('.brodvalg:has-text("Focaccia")').locator('.info-ring').click();
  await page.waitForTimeout(150);

  console.log('— Stekeprofiler —');
  await page.click('#bunnmeny button:has-text("Oppslag")');
  await page.waitForTimeout(200);
  await page.click('.valgkort:has-text("Stekeprofiler")');
  await page.waitForTimeout(200);
  const prof = await page.locator('.innhold').innerText();
  ok('ingen ★ i profilnavnene', !prof.includes('★'));
  ok('ingen «Rundbrød»-navn i profilene', !/Rundbrød/.test(prof));
  ok('anbefalt til-merker finnes', (prof.match(/anbefalt til/gi) || []).length >= 6, String((prof.match(/anbefalt til/gi) || []).length));
  await page.screenshot({ path: SHOT('r3-profiler') });

  console.log('— Logg: bilder og sikkerhetskopi —');
  await page.click('#bunnmeny button:has-text("Logg")');
  await page.waitForTimeout(200);
  ok('bilde-velger finnes', await page.locator('button[aria-label="Legg til bilde"]').count() === 1);
  ok('backup-kort finnes', await page.locator('.kort:has-text("Sikkerhetskopi")').count() === 1);
  // lag et testbilde (64x64 rød PNG) og last det opp
  const fs = require('fs');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAG0lEQVR42u3BAQ0AAADCoPdPbQ8HFAAAAAAA8G4wQAABY8mtogAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(SHOT('testbilde').replace('.png', '') + '.png', png);
  const [velger] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('button[aria-label="Legg til bilde"]')
  ]);
  await velger.setFiles(SHOT('testbilde'));
  await page.waitForTimeout(500);
  ok('bilde lagt til som miniatyr', await page.locator('img[alt="Bilde 1"]').count() === 1);
  // lagre baket og se bildet på loggposten
  await page.fill('input[placeholder*="Halvgrovt"]', 'Testbak med bilde');
  await page.click('button:has-text("Lagre baket")');
  await page.waitForTimeout(300);
  ok('loggpost viser bildet', await page.locator('.kort:has-text("Testbak med bilde") img').count() === 1);
  ok('bildevelgeren er tømt etter lagring', await page.evaluate(() => window.__FB.S.lgBilder.length) === 0);
  // nedlasting av kopi
  const [nedlasting] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Last ned kopi")')
  ]);
  const kopiSti = SHOT('kopi').replace('.png', '.json');
  await nedlasting.saveAs(kopiSti);
  const kopi = JSON.parse(fs.readFileSync(kopiSti, 'utf8'));
  ok('kopi inneholder loggen', Array.isArray(kopi.loggListe) && kopi.loggListe.some(b => b.navn === 'Testbak med bilde'));
  // slett alt lokalt, hent inn kopien igjen
  await page.evaluate(() => { localStorage.removeItem('forgebakery.v2'); });
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#bunnmeny button:has-text("Logg")');
  await page.waitForTimeout(200);
  ok('loggen er tom etter sletting', await page.locator('.kort:has-text("Testbak med bilde")').count() === 0);
  const [velger2] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('button:has-text("Hent inn kopi")')
  ]);
  await velger2.setFiles(kopiSti);
  await page.waitForTimeout(500);
  ok('kopien gjenopprettet loggen med bilde', await page.locator('.kort:has-text("Testbak med bilde") img').count() === 1);
  await page.screenshot({ path: SHOT('r3-logg') });

  ok('ingen JS-feil på siden', pageErrors.length === 0, pageErrors.join(' | '));
  await browser.close();
  console.log(feil === 0 ? '\nALLE TESTER GRØNNE' : '\n' + feil + ' TESTER RØDE');
  process.exit(feil === 0 ? 0 : 1);
})();
