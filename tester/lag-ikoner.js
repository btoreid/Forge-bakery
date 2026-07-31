/* Tegner appikonene i Chromium og skriver dem som PNG.

   KILDEN er `icons/kilde-ikon.png` — motivet Bjørn valgte: brødet på ambolten
   med essa bak. Den ligger i repoet som 1024×1024 og skaleres ned her, i stedet
   for at hver størrelse lastes opp for hånd.

   To varianter:
     any       — motivet fyller ikonet, med litt luft mot kanten.
     maskable  — motivet krympet inn i Androids sikre sone. Systemets ikonmaske
                 kan klippe de ytterste 10 % på hver kant, og en sirkelmaske
                 spiser hjørnene helt. Bakgrunnen fyller resten.               */
const { chromium } = require('playwright');
const path = require('path');
const UT = path.resolve(__dirname, '../icons') + '/';
const KILDE = 'kilde-ikon.png';

/* Bakgrunnsfargen er hentet fra kildebildets egen kant, ikke gjettet — da blir
   det ingen synlig skjøt der motivet slutter og fyllet begynner. */
const BG = '#f7f1dd';

function side(px, maskable) {
  const skala = maskable ? 0.72 : 1;
  const boks = Math.round(px * skala), off = Math.round((px - boks) / 2);
  return `<!DOCTYPE html><html><body style="margin:0">
  <div style="width:${px}px;height:${px}px;background:${BG};position:relative;overflow:hidden">
    <img src="${KILDE}" width="${boks}" height="${boks}"
         style="position:absolute;left:${off}px;top:${off}px;display:block">
  </div></body></html>`;
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const jobber = [
    ['icon-192.png', 192, false], ['icon-512.png', 512, false],
    ['maskable-512.png', 512, true], ['apple-touch-icon.png', 180, false]
  ];
  for (const [navn, px, maskable] of jobber) {
    const page = await browser.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 });
    // file:// mot icons-mappa, så <img> finner kilden uten en server.
    await page.goto('file://' + UT);
    await page.setContent(side(px, maskable));
    await page.waitForFunction(() => {
      const i = document.querySelector('img');
      return i && i.complete && i.naturalWidth > 0;
    }, { timeout: 10000 });
    await page.screenshot({ path: UT + navn, omitBackground: false });
    await page.close();
    console.log('skrev', navn, px + '×' + px, maskable ? '(maskable)' : '');
  }
  await browser.close();
})();
