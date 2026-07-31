/* Runde 5 — bakefaglig review + Bjørns innspill 31.07 (kveld).
   Alle sjekkene her vokter et tall eller en setning som var FEIL i appen, ikke
   bare at koden kjører. De faller i fire grupper:

     A) Hevemålet var hardkodet 60–72 % for alt — også for et 100 % grovt brød
        som skal stoppe rundt 18 %.
     B) Hydreringen fulgte ikke melblandingen: 74 % anbefalt uansett, og et tak
        som advarte fra ~75 % på blandinger som trenger over 80.
     C) Gjæren: totalen ble vist som om den skulle veies opp i hoveddeigen selv
        når forfermenten hadde tatt en tredel av den, og en kald forferment
        løp opp i 15,9 % fersk gjær.
     D) Rommet og kjøleskapet er MÅLINGER, ikke valg — å oppgi dem skal ikke
        gjøre tidsplanen «egendefinert».                                       */
const { chromium } = require('playwright');
require('fs').mkdirSync(__dirname + '/skjermbilder', { recursive: true });
const URL = 'http://localhost:8123/';
const SHOT = d => `${__dirname}/skjermbilder/${d}.png`;
let feil = 0;
const ok = (navn, sant, ekstra) => { console.log((sant ? '  ✓ ' : '  ✗ ') + navn + (ekstra ? ' — ' + ekstra : '')); if (!sant) feil++; };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => { window.__FB_TEST_INGEN_PORT = true; });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.waitForTimeout(400);

  /* ---------------------------------------------------------------
     A · Hevemålet følger grovheten
     --------------------------------------------------------------- */
  console.log('— Hevemål —');
  const rise = await page.evaluate(() => {
    const S = window.__FB.S;
    const maal = g => {
      const st = Object.assign({}, S, { brotype: 'grovbrod', grov: g, melOverstyr: null, hyd: 75 });
      const r = regn(st);
      return kjede(st, r, Date.now() + 864e5).maalRise;
    };
    return { loff: maal(0), halv: maal(50), grov: maal(100) };
  });
  ok('loff sikter høyt', rise.loff >= 45 && rise.loff <= 65, Math.round(rise.loff) + ' %');
  ok('50 % grovt sikter lavere enn loffen', rise.halv < rise.loff - 10, Math.round(rise.halv) + ' %');
  ok('100 % grovt sikter lavest', rise.grov < rise.halv - 8 && rise.grov >= 12, Math.round(rise.grov) + ' %');
  ok('ingen plan viser lenger det hardkodede 60–72 %', !(await page.evaluate(() => {
    const S = window.__FB.S;
    const st = Object.assign({}, S, { brotype: 'grovbrod', grov: 100, melOverstyr: null });
    const K = kjede(st, regn(st), Date.now() + 864e5);
    return JSON.stringify(K).includes('60–72');
  })));

  /* ---------------------------------------------------------------
     B · Hydreringen følger melblandingen
     --------------------------------------------------------------- */
  console.log('— Hydrering —');
  const hyd = await page.evaluate(() => {
    const S = window.__FB.S;
    const v = g => {
      const r = regn(Object.assign({}, S, { brotype: 'grovbrod', grov: g, melOverstyr: null }));
      return { anb: r.hydAnbefalt, tak: r.tak, abs: r.absFaktor };
    };
    return { fint: v(0), grovt: v(100) };
  });
  ok('anbefalingen er lav på siktet mel', hyd.fint.anb >= 72 && hyd.fint.anb <= 78, hyd.fint.anb + ' %');
  ok('anbefalingen stiger med grovheten', hyd.grovt.anb >= hyd.fint.anb + 8, hyd.grovt.anb + ' %');
  ok('taket ligger over anbefalingen, også grovt', hyd.grovt.tak > hyd.grovt.anb, Math.round(hyd.grovt.tak) + ' > ' + hyd.grovt.anb);
  ok('taket advarer IKKE på grovt brød ved 80 %', hyd.grovt.tak >= 80, Math.round(hyd.grovt.tak) + ' %');
  // hydLoftFaktor hadde en 5-poengs kant ved 78 når taket lå lavere.
  const kant = await page.evaluate(() => {
    let verst = 0;
    for (let h = 62; h <= 88; h += 0.5) {
      const a = hydLoftFaktor(h, 72), b = hydLoftFaktor(h + 0.5, 72);
      verst = Math.max(verst, Math.abs(a - b));
    }
    return verst;
  });
  ok('ingen kant i løftkurven når taket er lavt', kant < 0.02, 'største sprang ' + kant.toFixed(4));

  /* ---------------------------------------------------------------
     C · Gjæren: hoveddeigens dose, og forfermentens tak
     --------------------------------------------------------------- */
  console.log('— Gjær —');
  const gj = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.ff = true; S.ffType = 'poolish'; S.ffTemp = null; S.ffTimer = null;
    S.skjerm = 'deigen'; FB.oppdater();
    await new Promise(r => setTimeout(r, 150));
    const varm = regn(S);
    S.ffTemp = 4; FB.oppdater();
    await new Promise(r => setTimeout(r, 200));
    const kald = regn(S);
    const K = kjede(S, kald, Date.now() + 864e5);
    const elt = K.find(s => s.id === 'elt');
    return {
      hoved: varm.gjaerHoved, total: varm.gjaerTotal, ffGjaer: varm.forferment.gjaer,
      kaldFersk: kald.forferment.gjaerPctAvFfMel * 3,
      paaTaket: kald.forferment.gjaerPaaTaket,
      eltTekst: JSON.stringify(elt.tall) + elt.gjor
    };
  });
  ok('hoveddeigens gjær er mindre enn totalen når forfermenten tar sitt',
    gj.hoved < gj.total - 1e-6, gj.hoved.toFixed(2) + ' av ' + gj.total.toFixed(2) + ' g');
  ok('eltesteget oppgir hoveddeigens gjær, ikke totalen', /Tørrgjær nå/.test(gj.eltTekst));
  ok('kald forferment stopper på 2 % fersk', gj.kaldFersk <= 2.05, gj.kaldFersk.toFixed(1) + ' % fersk');
  ok('appen flagger at dosen står på taket', gj.paaTaket);

  // Et levain podes med starter, ikke med tørrgjær.
  const surdeig = await page.evaluate(() => {
    const S = window.__FB.S;
    const r = regn(Object.assign({}, S, { ff: true, ffType: 'surdeig', ffTemp: null }));
    const K = kjede(Object.assign({}, S, { ff: true, ffType: 'surdeig', ffTemp: null }), r, Date.now() + 864e5);
    const ffSteg = K.find(s => s.id === 'ff');
    return { gjaer: r.forferment.gjaer, starter: r.forferment.starter,
      tekst: JSON.stringify(ffSteg.tall) + ffSteg.gjor };
  });
  ok('levainen får ingen kommersiell gjær', surdeig.gjaer === 0, String(surdeig.gjaer));
  ok('levainen podes med moden starter', surdeig.starter > 0 && /starter/i.test(surdeig.tekst),
    Math.round(surdeig.starter) + ' g');

  /* ---------------------------------------------------------------
     D · Rommet og kjøleskapet er målinger, ikke valg
     --------------------------------------------------------------- */
  console.log('— Rom og kjøleskap —');
  const rom = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.ff = false; S.ffTemp = null; S.heveplan = null; S.tid = 'lang';
    S.romTemp = 22; S.kjolskapTemp = 4; FB.oppdater();
    await new Promise(r => setTimeout(r, 150));
    const foer = regn(S).planTrinn.map(t => t.miljo);
    S.romTemp = 18; S.kjolskapTemp = 6; FB.oppdater();
    await new Promise(r => setTimeout(r, 150));
    const etter = regn(S).planTrinn.map(t => t.miljo);
    return { foer, etter, egendefinert: S.heveplan != null };
  });
  ok('romtemperaturen flytter de varme trinnene', rom.etter[0] === rom.foer[0] - 4,
    rom.foer[0] + ' → ' + rom.etter[0] + ' °C');
  ok('kjøleskapstemperaturen flytter de kalde trinnene',
    rom.etter.some((m, i) => m > rom.foer[i] && m <= 12), JSON.stringify(rom.etter));
  ok('planen blir IKKE egendefinert av å oppgi temperaturer', !rom.egendefinert);

  /* Forfermenten holder ROMMETS temperatur. Den har ingen egen. */
  const ffRom = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.ff = true; S.ffType = 'poolish'; S.ffTemp = null; S.romTemp = 18; FB.oppdater();
    await new Promise(r => setTimeout(r, 150));
    return { temp: regn(S).forferment.temp, rom: S.romTemp };
  });
  ok('forfermenten holder rommets temperatur', ffRom.temp === ffRom.rom, ffRom.temp + ' = ' + ffRom.rom);

  /* ---------------------------------------------------------------
     E · Steg som lovet noe utstyret ikke har
     --------------------------------------------------------------- */
  console.log('— Steg mot virkeligheten —');
  const steg = await page.evaluate(() => {
    const S = window.__FB.S;
    const bygg = over => {
      const st = Object.assign({}, S, over);
      return kjede(st, regn(st), Date.now() + 864e5);
    };
    const brett = bygg({ utstyr: 'brett', stekeProfil: 'brod_brett', form: 'ingen', tid: 'lang', ff: false });
    const gryte = bygg({ utstyr: 'stopejern', stekeProfil: 'brod_gryte', form: 'rund', tid: 'lang', ff: false });
    const varm  = bygg({ utstyr: 'brett', stekeProfil: 'brod_brett', form: 'rund', tid: 'dag', ff: false });
    const auto  = bygg({ autolyseMin: 60, ff: true, ffType: 'poolish', tid: 'lang' });
    return {
      brettStek: brett.find(s => s.id === 'stek').gjor,
      gryteStek: gryte.find(s => s.id === 'stek').gjor,
      brettForm: (brett.find(s => s.id === 'form') || brett.find(s => s.id === 'utbak')).gjor,
      varmPost: (varm.find(s => s.id === 'snitt') || varm.find(s => s.id === 'utbak')).gjor,
      autoSteg: JSON.stringify((auto.find(s => s.id === 'autolyse') || {}).tall),
      autoMel: (() => {
        const st = Object.assign({}, S, { autolyseMin: 60, ff: true, ffType: 'poolish', tid: 'lang' });
        const r = regn(st);
        return { total: r.melTotal, ff: r.forferment.mel };
      })()
    };
  });
  ok('stekebrett får ikke beskjed om å legge på lokk', !/lokket\/gryta/.test(steg.brettStek));
  ok('stekebrett får råd om å lage damp selv', /kokende vann/i.test(steg.brettStek));
  ok('gryta beholder lokk-rådet', /lokket\/gryta/.test(steg.gryteStek));
  ok('«uten form» nevner ikke hevekurv', !/hevekurv/i.test(steg.brettForm), steg.brettForm.slice(0, 60));
  ok('varm plan sier ikke «fra kjøl»', !/fra kjøl/i.test(steg.varmPost), steg.varmPost.slice(0, 60));
  // Autolysen skal gjelde HOVEDDEIGENS mel — forfermentens står allerede og modner.
  ok('autolysen bruker hoveddeigens mel, ikke alt melet',
    steg.autoSteg.includes('Mel (hoveddeigen)') &&
    !steg.autoSteg.includes(String(Math.round(steg.autoMel.total)) + ' g'),
    steg.autoSteg.slice(0, 90));

  /* Autolysen skal ha ULIK virkning på 30 min og 2 timer. */
  const auto = await page.evaluate(() => ({
    m30: autolyseFaktor(30), m120: autolyseFaktor(120)
  }));
  ok('30 min gir mest hydrering', auto.m30.hydratert > 0.6, (auto.m30.hydratert * 100).toFixed(0) + ' %');
  ok('2 timer gir vesentlig mer enzymarbeid enn 30 min',
    auto.m120.proteolyse > auto.m30.proteolyse * 2,
    (auto.m30.proteolyse * 100).toFixed(0) + ' % → ' + (auto.m120.proteolyse * 100).toFixed(0) + ' %');

  /* ---------------------------------------------------------------
     F · Maskinen sier «mangler kalibrering» i stedet for et anslag
     --------------------------------------------------------------- */
  console.log('— Maskinkalibrering —');
  const maskin = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.skjerm = 'tid'; S.maskin = 'spiralProff'; S.delteKalib = null; FB.oppdater();
    await new Promise(r => setTimeout(r, 200));
    const panel = document.querySelector('.maskin-info');
    const utenKal = panel ? panel.textContent : '';
    S.delteKalib = { spiralProff: { friksjon: 0.55, deigvekt: 2000 } }; FB.oppdater();
    await new Promise(r => setTimeout(r, 200));
    const p2 = document.querySelector('.maskin-info');
    return { utenKal, medKal: p2 ? p2.textContent : '' };
  });
  ok('ukalibrert maskin viser ingen friksjonsverdi som «din»', /mangler kalibrering/.test(maskin.utenKal));
  ok('en delt måling erstatter «mangler kalibrering»',
    /delt måling/.test(maskin.medKal) && !/mangler kalibrering/.test(maskin.medKal));
  ok('håndelting får ikke Wh/kg-dommen', await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.maskin = 'hand'; FB.oppdater();
    await new Promise(r => setTimeout(r, 200));
    const p = document.querySelector('.maskin-info');
    return !!p && /gjelder ikke for hånd/.test(p.textContent);
  }));

  /* ---------------------------------------------------------------
     G · Melprisene er hentet, ikke arvet fra et gammelt regneark
     --------------------------------------------------------------- */
  console.log('— Priser —');
  const pris = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.skjerm = 'deigen'; S.grov = 50; S.melOverstyr = null; FB.oppdater();
    await new Promise(r => setTimeout(r, 200));
    const finn = id => (FLOURS.find(f => f.id === id) || {}).kr;
    const r = regn(S);
    return {
      hentet: typeof PRIS_HENTET !== 'undefined' ? PRIS_HENTET : null,
      siktet: finn('hvetemel'), rugFin: finn('samalt_rug'), sammaltHvete: finn('samalt_hvete'),
      perBrod: r.kost.perBrod,
      tekst: document.body.innerText,
      // Ingen pris skal stå igjen på en verdi som var åpenbart utdatert.
      billigst: Math.min.apply(null, FLOURS.map(f => f.kr))
    };
  });
  ok('prisdatoen er oppgitt', !!pris.hentet, pris.hentet);
  ok('appen forteller hvor prisene er hentet fra', /hentet 31\. juli 2026/.test(pris.tekst));
  /* De to som var mest feil: siktet hvetemel sto på 10 kr/kg (ikke hyllepris på
     mange år) og sammalt rug på 30 der den ligger rundt 17. */
  ok('siktet hvetemel er ikke lenger 10 kr/kg', pris.siktet >= 14, pris.siktet + ' kr/kg');
  ok('sammalt rug er ikke lenger dyrere enn sammalt hvete',
    pris.rugFin <= pris.sammaltHvete + 2, 'rug ' + pris.rugFin + ' vs hvete ' + pris.sammaltHvete);
  ok('ingen mel ligger under 15 kr/kg', pris.billigst >= 15, 'billigst ' + pris.billigst + ' kr/kg');
  ok('kostnaden per brød er i et rimelig leie', pris.perBrod > 4 && pris.perBrod < 40,
    pris.perBrod.toFixed(1) + ' kr');

  /* Skjermbilder — «rendrer uten feil» er ikke det samme som «ser riktig ut». */
  await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.maskin = 'spiralHjemme'; S.skjerm = 'tid'; S.delteKalib = null; FB.oppdater();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOT('r5-tid-rom-og-kjoleskap'), fullPage: true });
  await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.skjerm = 'deigen'; S.grov = 100; S.melOverstyr = null; FB.oppdater();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOT('r5-deig-hydrering-grovt'), fullPage: true });
  await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.skjerm = 'prosess'; S.aktivSteg = 0; FB.oppdater();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOT('r5-prosess'), fullPage: true });

  console.log(pageErrors.length ? '  ✗ JS-feil: ' + pageErrors.join(' | ') : '  ✓ ingen JS-feil på siden');
  if (pageErrors.length) feil++;

  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await browser.close();
  console.log(feil ? `\n${feil} FEIL` : '\nALLE TESTER GRØNNE');
  process.exit(feil ? 1 : 0);
})();
