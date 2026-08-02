/* Loggen: fullskjermbilder + rediger/slett poster. */
const { chromium } = require('playwright');
require('fs').mkdirSync(__dirname + '/skjermbilder', { recursive: true });
const fs = require('fs');
const D = __dirname + '/skjermbilder/';
let feil = 0;
const ok = (n, s, e) => { console.log((s ? '  ✓ ' : '  ✗ ') + n + (e ? ' — ' + e : '')); if (!s) feil++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  /* Innloggingsporten (31.07) står foran hele appen. Denne kroken er den
     eneste veien forbi den, og settes kun her — aldri i produksjonskode. */
  await page.addInitScript(() => { window.__FB_TEST_INGEN_PORT = true; });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('http://localhost:8123/');
  await page.waitForTimeout(400);
  // Testbilder i samme størrelsesorden som ekte kamerabilder etter nedskalering
  // (480 px). Et 64 px-bilde ville ikke blitt skalert opp — contain skalerer ned,
  // ikke opp — og testen på «vises stort» ville vært meningsløs.
  for (const [navn, farge] of [['bilde-a.png', '#c67139'], ['bilde-b.png', '#7a8a5e']]) {
    const data = await page.evaluate(f => {
      const c = document.createElement('canvas'); c.width = 640; c.height = 480;
      const x = c.getContext('2d'); x.fillStyle = f; x.fillRect(0, 0, 640, 480);
      return c.toDataURL('image/png');
    }, farge);
    fs.writeFileSync(D + navn, Buffer.from(data.split(',')[1], 'base64'));
  }
  // Loggskjemaet er siste steg i PROSESS nå; Logg-skjermen er ren historikk.
  const tilSkjema = async () => { await page.click('#bunnmeny button:has-text("Prosess")'); await page.waitForTimeout(350); };
  const tilLogg = async () => { await page.click('#bunnmeny button:has-text("Logg")'); await page.waitForTimeout(350); };
  await tilSkjema();

  console.log('— Lagre to bak, ett med to bilder —');
  for (const f of ['bilde-a.png', 'bilde-b.png']) {
    const [v] = await Promise.all([page.waitForEvent('filechooser'), page.click('button[aria-label="Legg til bilde"]')]);
    await v.setFiles(D + f);
    await page.waitForTimeout(400);
  }
  await page.fill('input[placeholder*="Halvgrovt"]', 'Bak med bilder');
  await page.click('button:has-text("Lagre baket")');
  await page.waitForTimeout(400);
  ok('lagring fra Prosess lander på Logg', await page.evaluate(() => window.__FB.S.skjerm) === 'logg');
  await tilSkjema();
  await page.fill('input[placeholder*="Halvgrovt"]', 'Bak uten bilder');
  await page.click('button:has-text("Lagre baket")');
  await page.waitForTimeout(400);
  ok('to poster i loggen', await page.evaluate(() => window.__FB.S.loggListe.length) === 2);
  ok('nyeste øverst', (await page.locator('.kort:has-text("Bak uten bilder")').count()) === 1);
  ok('hver post har id', await page.evaluate(() => window.__FB.S.loggListe.every(b => !!b.id)));

  console.log('— Fullskjermvisning —');
  ok('miniatyrene er knapper', await page.locator('.logg-bilde').count() === 2);
  await page.locator('.logg-bilde').first().click();
  await page.waitForTimeout(300);
  ok('bildevisning åpnet', await page.locator('#bildevis').count() === 1);
  const bredde = await page.locator('#bildevis img').evaluate(e => e.getBoundingClientRect().width);
  ok('bildet fyller skjermen', bredde > 300, Math.round(bredde) + ' px av 390');
  ok('viser navn og teller', (await page.locator('.bv-tekst').innerText()).includes('1 av 2'), await page.locator('.bv-tekst').innerText());
  ok('ligger over bunnmenyen', await page.locator('#bildevis').evaluate(e => +getComputedStyle(e).zIndex) > 30);
  await page.screenshot({ path: D + 'logg-bildevis.png' });
  await page.click('.bv-pil.hoyre');
  await page.waitForTimeout(250);
  ok('pil bytter til bilde 2', (await page.locator('.bv-tekst').innerText()).includes('2 av 2'));
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(250);
  ok('piltast blar tilbake', (await page.locator('.bv-tekst').innerText()).includes('1 av 2'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  ok('Esc lukker', await page.locator('#bildevis').count() === 0);
  // trykk på selve bildet skal IKKE lukke; trykk utenfor skal
  await page.locator('.logg-bilde').first().click();
  await page.waitForTimeout(250);
  await page.locator('#bildevis img').click();
  await page.waitForTimeout(250);
  ok('trykk på bildet lukker ikke', await page.locator('#bildevis').count() === 1);
  await page.locator('#bildevis').click({ position: { x: 10, y: 10 } });
  await page.waitForTimeout(250);
  ok('trykk utenfor lukker', await page.locator('#bildevis').count() === 0);

  console.log('— Redigere —');
  await page.locator('.kort:has-text("Bak med bilder") button:has-text("Rediger")').click();
  await page.waitForTimeout(300);
  ok('redigeringsmodus åpnet', await page.locator('.kort:has-text("Redigerer")').count() === 1);
  await page.fill('input[data-fokus="lgnavn"]', 'Omdøpt bak');
  await page.waitForTimeout(300);
  ok('navnet endret i state', await page.evaluate(() => window.__FB.S.loggListe.some(b => b.navn === 'Omdøpt bak')));
  await page.fill('textarea[data-fokus="lgnotat"]', 'For tett krumme — mer vann neste gang');
  await page.waitForTimeout(300);
  ok('notat lagret', await page.evaluate(() => window.__FB.S.loggListe.some(b => (b.notat || '').includes('mer vann'))));
  const karFoer = await page.evaluate(() => window.__FB.S.loggListe.find(b => b.navn === 'Omdøpt bak').kar);
  await page.locator('.kort:has-text("Redigerer") button[aria-label="Høyere karakter"]').click();
  await page.waitForTimeout(300);
  ok('karakter kan endres', await page.evaluate(() => window.__FB.S.loggListe.find(b => b.navn === 'Omdøpt bak').kar) === karFoer + 1);
  // fjern ett bilde
  await page.locator('.kort:has-text("Redigerer") button[aria-label="Fjern bilde 1"]').click();
  await page.waitForTimeout(300);
  ok('bilde fjernet fra posten', await page.evaluate(() => window.__FB.S.loggListe.find(b => b.navn === 'Omdøpt bak').bilder.length) === 1);
  await page.screenshot({ path: D + 'logg-rediger.png' });
  await page.locator('.kort:has-text("Redigerer") button:has-text("Ferdig")').click();
  await page.waitForTimeout(300);
  ok('redigering lukket', await page.locator('.kort:has-text("Redigerer")').count() === 0);
  ok('notatet vises på kortet', (await page.locator('.kort:has-text("Omdøpt bak")').innerText()).includes('mer vann'));
  ok('måletall urørt', (await page.locator('.kort:has-text("Omdøpt bak")').innerText()).includes('% grovt'));

  console.log('— Slette —');
  await page.locator('.kort:has-text("Omdøpt bak") button:has-text("Slett")').click();
  await page.waitForTimeout(300);
  ok('bekreftelse vises', await page.locator('.kort:has-text("Slette «Omdøpt bak»?")').count() === 1);
  ok('nevner bildet', (await page.locator('.kort:has-text("Slette «Omdøpt bak»?")').innerText()).includes('1 bilde'));
  await page.click('button:has-text("Avbryt")');
  await page.waitForTimeout(300);
  ok('avbryt beholder posten', await page.evaluate(() => window.__FB.S.loggListe.length) === 2);
  // slett den ØVERSTE (nyeste) og sjekk at riktig post forsvinner — indeksfella
  await page.locator('.kort:has-text("Bak uten bilder") button:has-text("Slett")').click();
  await page.waitForTimeout(250);
  await page.click('button:has-text("Ja, slett")');
  await page.waitForTimeout(300);
  const igjen = await page.evaluate(() => window.__FB.S.loggListe.map(b => b.navn));
  ok('riktig post slettet', igjen.length === 1 && igjen[0] === 'Omdøpt bak', JSON.stringify(igjen));

  console.log('— Brød for brød: metode og kommentar per brød —');
  // Poster lagret uten at radene ble rørt skal IKKE ha brod-feltet — radene er
  // bare verdt å lagre når de sier noe (en kommentar eller en avvikende metode).
  ok('urørte rader lagres ikke', await page.evaluate(() =>
    !('brod' in window.__FB.S.loggListe.find(b => b.navn === 'Omdøpt bak'))));
  await tilSkjema();
  const skjema = page.locator('.kort:has-text("Loggfør dette baket")');
  ok('én rad per brød i oppskriften (4)', await skjema.locator('select[aria-label^="Stekemetode for brød"]').count() === 4);
  await skjema.locator('select[aria-label="Stekemetode for brød 2"]').selectOption('brod_glass_stal');
  await page.waitForTimeout(250);
  await skjema.locator('textarea[aria-label="Kommentar til brød 1"]').fill('Glasset av etter 18 min');
  await page.waitForTimeout(250);
  // Feltet skal VOKSE med lang tekst — bryte til nye linjer, ikke scrolle
  // sidelengs (Bjørn 02.08). Måles på klientboksen: høyere enn én linje, og
  // ingen vannrett overflyt.
  const kfelt = skjema.locator('textarea[aria-label="Kommentar til brød 2"]');
  const kfoer = await kfelt.evaluate(e => e.clientHeight);
  await kfelt.fill('Glasset av etter 18 min, så fem minutter ekstra med damp. Bunnen ble litt mørk — neste gang lavere hylle, kortere etterstek og en skvett vann i brettet under.');
  await page.waitForTimeout(250);
  ok('kommentarfeltet vokser med teksten', await kfelt.evaluate((e, foer) =>
    e.clientHeight > foer && e.scrollWidth <= e.clientWidth + 1, kfoer));
  await skjema.locator('input[placeholder*="Halvgrovt"]').fill('Bak brød for brød');
  await page.click('button:has-text("Lagre baket")');
  await page.waitForTimeout(400);
  const bpost = await page.evaluate(() => window.__FB.S.loggListe.find(b => b.navn === 'Bak brød for brød'));
  ok('alle fire brød i posten', bpost && Array.isArray(bpost.brod) && bpost.brod.length === 4, JSON.stringify(bpost && bpost.brod));
  ok('avvikende metode lagret', bpost && bpost.brod[1].metode === 'brod_glass_stal');
  ok('kommentaren lagret', bpost && bpost.brod[0].kommentar === 'Glasset av etter 18 min');
  ok('umerkede brød fikk oppsettets metode', bpost && bpost.brod[2].metode === bpost.oppskrift.stekeProfil);
  const bkort = page.locator('.kort:has-text("Bak brød for brød")');
  // innerText er CSS-bevisst: overskriften står med text-transform:uppercase,
  // så det er den transformerte teksten som kommer tilbake.
  ok('kortet viser Brød for brød', (await bkort.innerText()).includes('BRØD FOR BRØD'));
  ok('kortet viser metoden', (await bkort.innerText()).includes('Glassgryte PÅ 15 mm stål'));
  ok('kortet viser kommentaren', (await bkort.innerText()).includes('18 min'));
  // Redigering i ettertid: brødene stekes til ulik tid, så kommentarene på de
  // siste brødene finnes ofte ikke før timer etter at posten ble lagret.
  await bkort.locator('button:has-text("Rediger")').click();
  await page.waitForTimeout(300);
  const red = page.locator('.kort:has-text("Redigerer")');
  await red.locator('textarea[aria-label="Kommentar til brød 3"]').fill('Stekt tre timer senere, åpen på stålet');
  await page.waitForTimeout(250);
  ok('kommentar kan legges til i ettertid', await page.evaluate(() =>
    window.__FB.S.loggListe.find(b => b.navn === 'Bak brød for brød').brod[2].kommentar.includes('tre timer')));
  // Lagret kommentar skal stå i feltet når redigeringen tegnes om — `value`-
  // attributtet virker ikke på textarea, så innholdet må stå som tekstbarn.
  ok('kommentaren står i feltet etter re-render', await red.locator('textarea[aria-label="Kommentar til brød 1"]').evaluate(e => e.value.includes('18 min')));
  await red.locator('select[aria-label="Stekemetode for brød 3"]').selectOption('brod_apen');
  await page.waitForTimeout(250);
  ok('metode kan endres i ettertid', await page.evaluate(() =>
    window.__FB.S.loggListe.find(b => b.navn === 'Bak brød for brød').brod[2].metode === 'brod_apen'));
  await red.locator('button:has-text("+ Legg til brød")').click();
  await page.waitForTimeout(250);
  ok('rad kan legges til', await page.evaluate(() =>
    window.__FB.S.loggListe.find(b => b.navn === 'Bak brød for brød').brod.length === 5));
  await red.locator('button[aria-label="Fjern brød 5"]').click();
  await page.waitForTimeout(250);
  ok('rad kan fjernes', await page.evaluate(() =>
    window.__FB.S.loggListe.find(b => b.navn === 'Bak brød for brød').brod.length === 4));
  await red.locator('button:has-text("Ferdig")').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: D + 'logg-brod-for-brod.png' });

  // overlever omlasting
  await page.reload();
  await page.waitForTimeout(500);
  await page.click('#bunnmeny button:has-text("Logg")');
  await page.waitForTimeout(300);
  ok('endringene overlever omlasting', (await page.locator('.kort:has-text("Omdøpt bak")').count()) === 1);
  ok('bildet også', await page.locator('.logg-bilde').count() === 1);
  ok('brød for brød også', (await page.locator('.kort:has-text("Bak brød for brød")').innerText()).includes('tre timer'));

  console.log('— Bilder per brød —');
  await tilSkjema();
  // Kameraet skal være ETT trykk unna: egen 📷-knapp med capture-input som
  // åpner kamera-appen direkte, ved siden av + som åpner galleriet.
  ok('kameraknapp på baket og per brød', await page.locator('button[aria-label="Ta bilde"]').count() === 1
    && await page.locator('button[aria-label="Ta bilde av brød 1"]').count() === 1);
  ok('kameraet åpnes direkte (capture)', await page.locator('input[capture="environment"]').count() >= 2);
  // Bildet legges på brød 1 i skjemaet UTEN å røre metode eller kommentar —
  // bildet alene skal være nok til at radene er verdt å lagre på posten.
  const [vb] = await Promise.all([page.waitForEvent('filechooser'), page.click('button[aria-label="Legg til bilde av brød 1"]')]);
  await vb.setFiles(D + 'bilde-a.png');
  await page.waitForTimeout(500);
  ok('bildet ligger i skjemaraden', await page.evaluate(() => (window.__FB.S.lgBrod[0].bilder || []).length === 1));
  await page.fill('input[placeholder*="Halvgrovt"]', 'Bak med brødbilde');
  await page.click('button:has-text("Lagre baket")');
  await page.waitForTimeout(400);
  const fp = await page.evaluate(() => {
    const b = window.__FB.S.loggListe.find(x => x.navn === 'Bak med brødbilde');
    return { harBrod: !!b.brod, b1: b.brod ? (b.brod[0].bilder || []).length : 0, b2har: !!(b.brod && ('bilder' in b.brod[1])) };
  });
  ok('bildet alene gjør radene verdt å lagre', fp.harBrod);
  ok('bildet ligger på brød 1', fp.b1 === 1);
  ok('brød uten bilde får ikke bilder-felt', !fp.b2har);
  // Bildemodellen {id, data, sti}: id er innholdsutledet (stabil på tvers av
  // enheter), data er den lokale JPEG-en. sti kommer først ved opplasting.
  ok('bildet er objekt med id og lokal data', await page.evaluate(() => {
    const bl = window.__FB.S.loggListe.find(x => x.navn === 'Bak med brødbilde').brod[0].bilder[0];
    return !!bl && typeof bl === 'object' && !!bl.id && (bl.data || '').slice(0, 5) === 'data:';
  }));
  // Skyraden skal bære referanser, ikke megabytes: tilSky() stripper data fra
  // bilder som HAR sti, og beholder den for bilder som ennå ikke er lastet opp.
  ok('skykopien stripper opplastede bilder', await page.evaluate(() => {
    const k = window.__FB.tilSky({ loggListe: [{ id: 'x', bilder: [
      { id: 'a', data: 'data:image/jpeg;base64,AAA', sti: 'u/a.jpg' },
      { id: 'b', data: 'data:image/jpeg;base64,BBB' }] }] });
    return !('data' in k.loggListe[0].bilder[0]) && k.loggListe[0].bilder[1].data === 'data:image/jpeg;base64,BBB';
  }));
  ok('skjemaet er nullstilt etter lagring', await page.evaluate(() => window.__FB.S.lgBrod.length === 0));
  const fkort = page.locator('.kort:has-text("Bak med brødbilde")');
  ok('miniatyren står i brødraden på kortet', await fkort.locator('.logg-bilde.liten').count() === 1);
  await fkort.locator('.logg-bilde.liten').first().click();
  await page.waitForTimeout(300);
  ok('fullskjerm åpnet fra brødraden', await page.locator('#bildevis').count() === 1);
  ok('teksten sier hvilket brød', (await page.locator('.bv-tekst').innerText()).includes('brød 1'), await page.locator('.bv-tekst').innerText());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  // I ettertid: krummen fotograferes gjerne først når brødet skjæres dagen
  // etter — bilder må kunne legges til og fjernes på en lagret post.
  await fkort.locator('button:has-text("Rediger")').click();
  await page.waitForTimeout(300);
  const fred = page.locator('.kort:has-text("Redigerer")');
  const [vb2] = await Promise.all([page.waitForEvent('filechooser'), fred.locator('button[aria-label="Legg til bilde av brød 2"]').click()]);
  await vb2.setFiles(D + 'bilde-b.png');
  await page.waitForTimeout(500);
  ok('bilde kan legges til i ettertid', await page.evaluate(() =>
    (window.__FB.S.loggListe.find(x => x.navn === 'Bak med brødbilde').brod[1].bilder || []).length === 1));
  // Grensa er 4 per brød, ikke 2: etter bilde nummer to skal +-knappen fortsatt
  // stå der. (Skorpe, bunn, krumme og smøreprøve er et helt vanlig bak.)
  const [vb3] = await Promise.all([page.waitForEvent('filechooser'), fred.locator('button[aria-label="Legg til bilde av brød 2"]').click()]);
  await vb3.setFiles(D + 'bilde-a.png');
  await page.waitForTimeout(500);
  ok('to bilder på samme brød', await page.evaluate(() =>
    (window.__FB.S.loggListe.find(x => x.navn === 'Bak med brødbilde').brod[1].bilder || []).length === 2));
  ok('plass til flere enn to', await fred.locator('button[aria-label="Legg til bilde av brød 2"]').count() === 1);
  await fred.locator('button[aria-label="Fjern bilde 1 av brød 1"]').click();
  await page.waitForTimeout(250);
  ok('bilde kan fjernes i ettertid', await page.evaluate(() =>
    (window.__FB.S.loggListe.find(x => x.navn === 'Bak med brødbilde').brod[0].bilder || []).length === 0));
  await fred.locator('button:has-text("Ferdig")').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: D + 'logg-brodbilder.png' });
  await page.reload();
  await page.waitForTimeout(500);
  await page.click('#bunnmeny button:has-text("Logg")');
  await page.waitForTimeout(300);
  ok('brødbildene overlever omlasting', await page.locator('.kort:has-text("Bak med brødbilde") .logg-bilde.liten').count() === 2);

  console.log('— Deigregnskap og hevekurve fra loggen —');
  const rkort = page.locator('.kort:has-text("Bak med brødbilde")');
  ok('knappen står på posten', await rkort.locator('button:has-text("Deigregnskap og hevekurve")').count() === 1);
  await rkort.locator('button:has-text("Deigregnskap og hevekurve")').click();
  await page.waitForTimeout(400);
  ok('arket åpnet', await page.locator('#loggArk').count() === 1);
  // innerText er CSS-bevisst: ark-titlene står med text-transform:uppercase,
  // så det er den transformerte teksten som kommer tilbake.
  const arkTekst = (await page.locator('#loggArk').innerText()).toUpperCase();
  ok('viser postens navn', arkTekst.includes('BAK MED BRØDBILDE'));
  ok('regnskapet er med', arkTekst.includes('MEL TOTALT') && arkTekst.includes('GJÆR'));
  // Radstilene var scopet til .bunnlinje og traff ikke arket i #telefon —
  // «Mel totalt1 770 g» uten luft mellom etikett og verdi. Sjekk KOMPILERT
  // stil, ikke bare klassenavnet, så en ny omscoping ikke sniker seg forbi.
  ok('radene har arkets stil (etikett–verdi med luft)', await page.locator('#loggArk .regnskap .rad').first().evaluate(e => {
    const s = getComputedStyle(e); return s.display === 'flex' && s.justifyContent === 'space-between';
  }));
  ok('hevekurven er med', arkTekst.includes('GJÆRINGEN OVER TID') && await page.locator('#loggArk svg').count() >= 1);
  ok('ligger over bunnmenyen', await page.locator('#loggArk').evaluate(e => +getComputedStyle(e).zIndex) > 30);
  // Visningen skal ikke røre den EKTE tilstanden: S byttes bare synkront under
  // utregningen, og alt du holder på med nå skal stå urørt etterpå.
  ok('gjeldende oppskrift urørt', await page.evaluate(() =>
    window.__FB.S.brotype === 'grovbrod' && window.__FB.S.lgRegnskap !== null));
  await page.screenshot({ path: D + 'logg-regnskap.png' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  ok('Esc lukker arket', await page.locator('#loggArk').count() === 0);
  await rkort.locator('button:has-text("Deigregnskap og hevekurve")').click();
  await page.waitForTimeout(300);
  await page.locator('#loggArkTeppe').click({ position: { x: 10, y: 10 } });
  await page.waitForTimeout(300);
  ok('trykk på bakteppet lukker', await page.locator('#loggArk').count() === 0);

  console.log('— Fullført-klokkeslett på steg —');
  await page.click('#bunnmeny button:has-text("Prosess")');
  await page.waitForTimeout(400);
  await page.locator('button:has-text("fullfør steget")').first().click();
  await page.waitForTimeout(300);
  const tidInp = page.locator('input.steg-tid').first();
  ok('fullført steg viser klokkeslett-felt', await tidInp.count() === 1);
  // Man krysser gjerne av lenge etter at steget var ferdig — klokkeslettet må
  // kunne korrigeres, ellers lyver både avviket og loggen.
  await tidInp.fill('03:04');
  await tidInp.evaluate(e => e.dispatchEvent(new Event('change')));
  await page.waitForTimeout(300);
  ok('klokkeslettet kan korrigeres', await page.evaluate(() => {
    const kv = Object.values(window.__FB.S.stegKvitt).find(k => k && k.ok);
    const d = new Date(kv.ok); return d.getHours() === 3 && d.getMinutes() === 4;
  }));

  console.log('— Lås oppskriften til baket —');
  await tilSkjema();
  await page.click('button:has-text("Lås oppskriften til dette baket")');
  await page.waitForTimeout(250);
  ok('låsen vises i skjemaet', (await page.locator('.kort:has-text("Loggfør dette baket")').innerText()).includes('låst til dette baket'));
  // Endre oppskriften i appen MENS låsen står — det er hele poenget med den.
  await page.evaluate(() => { window.__FB.S.hyd = 85; window.__FB.oppdater(); });
  await page.waitForTimeout(250);
  await page.fill('input[placeholder*="Halvgrovt"]', 'Låst bak');
  await page.click('button:has-text("Lagre baket")');
  await page.waitForTimeout(400);
  ok('posten fikk den LÅSTE oppskriften', await page.evaluate(() =>
    window.__FB.S.loggListe.find(b => b.navn === 'Låst bak').oppskrift.hyd === 75));
  ok('appen står fortsatt på endringen', await page.evaluate(() => window.__FB.S.hyd === 85));
  ok('låsen nullstilles etter lagring', await page.evaluate(() => window.__FB.S.lgLaas === null));
  ok('stegnotatet bærer klokkeslettet', await page.evaluate(() => {
    const b = window.__FB.S.loggListe.find(x => x.navn === 'Låst bak');
    return !!(b.stegNotater && b.stegNotater.some(n => n.ferdig));
  }));

  console.log('— Merk baket som fullført —');
  const lkort = page.locator('.kort:has-text("Låst bak")');
  await lkort.locator('button:has-text("Merk baket som fullført")').click();
  await page.waitForTimeout(300);
  ok('fullført-merket vises', (await lkort.innerText()).includes('FULLFØRT'));
  ok('Rediger er borte', await lkort.locator('button:has-text("Rediger")').count() === 0);
  ok('Slett er borte', await lkort.locator('button:has-text("Slett")').count() === 0);
  await lkort.locator('button:has-text("Lås opp for å endre")').click();
  await page.waitForTimeout(300);
  ok('opplåsing gir Rediger tilbake', await lkort.locator('button:has-text("Rediger")').count() === 1);

  ok('ingen JS-feil', errs.length === 0, errs.join(' | '));
  await browser.close();
  console.log(feil === 0 ? '\nALLE TESTER GRØNNE' : '\n' + feil + ' TESTER RØDE');
  process.exit(feil === 0 ? 0 : 1);
})();
