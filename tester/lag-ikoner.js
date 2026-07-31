/* Tegner appikonene i Chromium og skriver dem som PNG.
   To varianter: «any» (brødet fyller ikonet) og «maskable» (brødet krympet inn i
   Androids sikre sone — de ytterste 10 % på hver kant kan bli klippet bort av
   systemets ikonmaske). */
const { chromium } = require('playwright');
const UT = require('path').resolve(__dirname, '../icons') + '/';

// Brødet fra appens egen bunnmeny (ikonSvg('brodet')), i samme strøkstil.
const brod = `
  <path d="M4 13c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>
  <path d="M8.5 7.4 7.3 5.6"/><path d="M12 7V5"/><path d="M15.5 7.4 16.7 5.6"/>`;

function side(px, maskable) {
  const bg = '#c67139';            // terrakotta, appens aksentfarge
  const fg = '#fdf6ec';            // krem, samme som knappetekst
  // Sikker sone: maskable-ikoner skal tåle at 10 % klippes på hver kant.
  const skala = maskable ? 0.56 : 0.78;
  const boks = px * skala, off = (px - boks) / 2;
  return `<!DOCTYPE html><html><body style="margin:0">
  <div style="width:${px}px;height:${px}px;background:${bg};position:relative">
    <!-- Brødformen spenner y≈5–15 i en 24-boks, altså med tyngdepunkt over midten.
         viewBox forskyves −2 så motivet står optisk sentrert i ikonet. -->
    <svg width="${boks}" height="${boks}" viewBox="0 -2 24 24" fill="none"
         stroke="${fg}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
         style="position:absolute;left:${off}px;top:${off}px">${brod}</svg>
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
    await page.setContent(side(px, maskable));
    await page.screenshot({ path: UT + navn, omitBackground: false });
    await page.close();
    console.log('skrev', navn, px + '×' + px, maskable ? '(maskable)' : '');
  }
  await browser.close();
})();
