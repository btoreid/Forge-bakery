/* Etter flyttingen: rota = V2, index-v1.html = V1, index-v2.html videresender
   (og tar med seg fragment + query, som Supabase-lenkene trenger). */
const { chromium } = require('playwright');
require('fs').mkdirSync(__dirname + '/skjermbilder', { recursive: true });
const B = 'http://localhost:8123/';
let feil = 0;
const ok = (n, s, e) => { console.log((s ? '  ✓ ' : '  ✗ ') + n + (e ? ' — ' + e : '')); if (!s) feil++; };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  /* Innloggingsporten (31.07) står foran hele appen. Denne kroken er den
     eneste veien forbi den, og settes kun her — aldri i produksjonskode. */
  await page.addInitScript(() => { window.__FB_TEST_INGEN_PORT = true; });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));

  console.log('— Rota serverer V2 —');
  await page.goto(B);
  await page.waitForTimeout(500);
  ok('V2-rammen finnes', await page.locator('#telefon #bunnmeny').count() === 1);
  ok('åtte skjermer i bunnmenyen', await page.locator('#bunnmeny button').count() === 8);
  const meny = await page.locator('#bunnmeny').innerText();
  ok('riktig rekkefølge', /Brød[\s\S]*Deig[\s\S]*Forferment[\s\S]*Autolyse[\s\S]*Tid[\s\S]*Prosess[\s\S]*Logg[\s\S]*Oppslag/.test(meny), meny.replace(/\n/g, ' '));
  /* Balansen i bunnmenyen: med like brede kolonner fikk «Tid» 18 px luft på
     hver side mens «Forferment» hadde 0,7 og nesten rørte naboen. Måler luften
     rundt hver etikett på de smaleste skjermene appen møter — ingen skal
     klemmes, og spennet mellom mest og minst luft skal være lite. */
  for (const bredde of [320, 390]) {
    await page.setViewportSize({ width: bredde, height: 800 });
    await page.waitForTimeout(200);
    const b = await page.evaluate(() => {
      const meny = document.getElementById('bunnmeny');
      const luft = [...meny.querySelectorAll('button')].map(k => {
        const rg = document.createRange();
        const tn = [...k.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
        rg.selectNodeContents(tn);
        return (k.getBoundingClientRect().width - rg.getBoundingClientRect().width) / 2;
      });
      return { min: +Math.min(...luft).toFixed(1), maks: +Math.max(...luft).toFixed(1),
        klippet: meny.scrollWidth > meny.clientWidth + 1 };
    });
    ok(bredde + ' px: ingen etikett klemmes', b.min >= 4 && !b.klippet, 'minst ' + b.min + ' px luft');
    ok(bredde + ' px: jevn luft mellom punktene', b.maks - b.min <= 8, b.min + '–' + b.maks + ' px');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  ok('supabase-js lastet', await page.evaluate(() => typeof window.supabase !== 'undefined'));
  ok('sky-laget lastet', await page.evaluate(() => typeof window.Sky !== 'undefined'));
  await page.click('#bunnmeny button:has-text("Logg")');
  await page.waitForTimeout(300);
  ok('konto-og-synk finnes i Logg', (await page.locator('.innhold').innerText()).toLowerCase().includes('konto'));
  await page.screenshot({ path: __dirname + '/skjermbilder/flytt-rot.png' });

  console.log('— index-v2.html videresender —');
  await page.goto(B + 'index-v2.html');
  await page.waitForTimeout(600);
  ok('havnet på rota', page.url() === B, page.url());
  ok('V2 lastet etter videresending', await page.locator('#bunnmeny button').count() === 8);
  // Fragmentet MÅ overleve — der ligger innloggingsnøkkelen fra e-postlenker.
  await page.goto(B + 'index-v2.html#access_token=TESTNOKKEL&type=signup');
  await page.waitForTimeout(600);
  ok('fragment tatt med videre', page.url().includes('#access_token=TESTNOKKEL'), page.url());
  await page.goto(B + 'index-v2.html?kode=123');
  await page.waitForTimeout(600);
  ok('query tatt med videre', page.url().includes('?kode=123'), page.url());

  console.log('— index-v1.html er V1 —');
  await page.goto(B + 'index-v1.html');
  await page.waitForTimeout(600);
  const v1 = await page.content();
  ok('V1-headeren finnes', v1.includes('FORGE BAKERY') && v1.includes('stegStatus'));
  ok('V1 har IKKE V2-rammen', await page.locator('#telefon').count() === 0);
  ok('V1 lastet app.js', await page.evaluate(() => !!document.querySelector('script[src*="js/app.js"]')));
  await page.screenshot({ path: __dirname + '/skjermbilder/flytt-v1.png' });

  ok('ingen JS-feil noe sted', errs.length === 0, errs.join(' | '));
  await browser.close();
  console.log(feil === 0 ? '\nALLE TESTER GRØNNE' : '\n' + feil + ' TESTER RØDE');
  process.exit(feil === 0 ? 0 : 1);
})();
