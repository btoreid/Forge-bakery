/* Runde 4 — Bjørns tilbakemeldinger 31.07.
   Tyngdepunktet er synken: at bakeloggen forsvant ved innlogging var datatap,
   og det er den eneste feilen i dette settet som ikke kunne rettes i ettertid. */
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

  /* ---------------------------------------------------------------
     1 · Synk: loggen skal ALDRI kunne bli borte
     ---------------------------------------------------------------
     Feilen som ble meldt: `oppdatert` ble stemplet på HVER lagring, også når
     man bare blar mellom skjermer. En enhet uten historikk kunne dermed bli
     «nyest» bare ved at man navigerte til Logg for å logge inn — og la sin
     tomme loggListe over historikken i skyen.                              */
  console.log('— Synk: tidsstempel og sammenfletting —');

  const navFlytterIkke = await page.evaluate(async () => {
    const FB = window.__FB;
    FB.S.skjerm = 'brodet'; FB.oppdater();
    await new Promise(r => setTimeout(r, 30));
    const foer = FB.S.oppdatert;
    // ren navigasjon + åpne/lukke utfellinger går gjennom oppdater() → lagre(),
    // nøyaktig som i appen. Det er dette som IKKE skal stemple tilstanden.
    ['deigen', 'tid', 'logg', 'oppslag', 'brodet'].forEach(s => { FB.S.skjerm = s; FB.oppdater(); });
    FB.S.brodInfo = 'ciabatta'; FB.oppdater();
    FB.S.brodInfo = null; FB.oppdater();
    return { foer, etter: FB.S.oppdatert };
  });
  ok('navigasjon flytter IKKE «oppdatert»', navFlytterIkke.foer === navFlytterIkke.etter,
    navFlytterIkke.foer + ' → ' + navFlytterIkke.etter);

  const dataFlytter = await page.evaluate(async () => {
    const FB = window.__FB;
    const foer = FB.S.oppdatert;
    await new Promise(r => setTimeout(r, 15));
    FB.S.hyd = 78; FB.oppdater();   // ekte dataendring
    return { foer, etter: FB.S.oppdatert };
  });
  ok('en ekte dataendring flytter «oppdatert»', dataFlytter.etter > dataFlytter.foer,
    dataFlytter.foer + ' → ' + dataFlytter.etter);

  // Selve sammenfletningen: union på id, aldri subtraksjon.
  const flett = await page.evaluate(() => {
    const F = window.__FB.flettLogg;
    const lokal = [{ id: 'b1000', laget: 1000, endret: 1000, navn: 'kun lokal' },
                   { id: 'b2000', laget: 2000, endret: 5000, navn: 'nyere lokalt' }];
    const sky   = [{ id: 'b2000', laget: 2000, endret: 3000, navn: 'eldre i sky' },
                   { id: 'b3000', laget: 3000, endret: 3000, navn: 'kun i sky' }];
    const u = F(lokal, sky, []);
    return { antall: u.length, navn: u.map(b => b.navn), rekkefolge: u.map(b => b.id) };
  });
  ok('poster fra begge sider beholdes', flett.antall === 3, flett.navn.join(' | '));
  ok('samme post: sist redigerte vinner', flett.navn.includes('nyere lokalt') && !flett.navn.includes('eldre i sky'));
  ok('rekkefølgen er kronologisk', flett.rekkefolge.join(',') === 'b1000,b2000,b3000', flett.rekkefolge.join(','));

  const gravstein = await page.evaluate(() => {
    const F = window.__FB.flettLogg;
    const lokal = [{ id: 'b1', laget: 1 }];
    const sky = [{ id: 'b1', laget: 1 }, { id: 'b2', laget: 2 }];
    return F(lokal, sky, ['b2']).map(b => b.id);
  });
  ok('slettet post gjenoppstår ikke fra skyen', gravstein.join(',') === 'b1', gravstein.join(','));

  // Sletting skal legge igjen en gravstein.
  const slettet = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S, n = Date.now();
    S.loggListe = [{ id: 'bX' + n, laget: n, endret: n, navn: 'skal slettes', kar: 7, dato: '31.7.2026', grov: '40', hyd: '75', loft: 50, dose: '1.8', bilder: [] }];
    S.loggSlettet = []; S.skjerm = 'logg'; S.lgSlett = 'bX' + n; FB.render();
    await new Promise(r => setTimeout(r, 60));
    const knapp = [...document.querySelectorAll('button')].find(b => /Ja, slett/.test(b.textContent));
    if (knapp) knapp.click();
    await new Promise(r => setTimeout(r, 120));
    return { igjen: FB.S.loggListe.length, gravsteiner: FB.S.loggSlettet.length };
  });
  ok('sletting fjerner posten', slettet.igjen === 0);
  ok('sletting legger igjen gravstein', slettet.gravsteiner === 1);

  /* ---------------------------------------------------------------
     2 · «Bak dette på nytt»
     --------------------------------------------------------------- */
  console.log('— Bak dette på nytt —');
  const paaNytt = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.brotype = 'grovbrod'; S.grov = 25; S.hyd = 71; S.tillegg = { linfro: 4 }; S.vekt = 800;
    S.skjerm = 'logg'; S.loggSlettet = []; FB.render();
    await new Promise(r => setTimeout(r, 60));
    const lagre = [...document.querySelectorAll('button')].find(b => /Lagre baket/.test(b.textContent));
    if (lagre) lagre.click();
    await new Promise(r => setTimeout(r, 150));
    const post = FB.S.loggListe[FB.S.loggListe.length - 1];
    // endre alt etterpå
    S.grov = 80; S.hyd = 85; S.tillegg = {}; S.vekt = 1200; FB.render();
    await new Promise(r => setTimeout(r, 60));
    const knapp = [...document.querySelectorAll('button')].find(b => /Bak dette på nytt/.test(b.textContent));
    if (knapp) knapp.click();
    await new Promise(r => setTimeout(r, 200));
    return { harOppskrift: !!(post && post.oppskrift), grov: FB.S.grov, hyd: FB.S.hyd,
      vekt: FB.S.vekt, linfro: (FB.S.tillegg || {}).linfro, skjerm: FB.S.skjerm,
      loggBeholdt: FB.S.loggListe.length };
  });
  ok('loggposten lagrer selve oppskriften', paaNytt.harOppskrift);
  ok('gjenoppretter grovhet', paaNytt.grov === 25, String(paaNytt.grov));
  ok('gjenoppretter vann', paaNytt.hyd === 71, String(paaNytt.hyd));
  ok('gjenoppretter brødvekt', paaNytt.vekt === 800, String(paaNytt.vekt));
  ok('gjenoppretter tillegg', paaNytt.linfro === 4, String(paaNytt.linfro));
  ok('går til Brød-skjermen', paaNytt.skjerm === 'brodet', paaNytt.skjerm);
  ok('loggen røres ikke av gjenopprettingen', paaNytt.loggBeholdt >= 1, String(paaNytt.loggBeholdt));

  /* ---------------------------------------------------------------
     3 · Gram inn på mel og vann (begge veier)
     --------------------------------------------------------------- */
  console.log('— Gram inn, prosent ut —');
  const gram = await page.evaluate(() => {
    const S = window.__FB.S;
    const ov = settMelGram(S, 0, 500);
    const rMel = regn(Object.assign({}, S, { melOverstyr: ov }));
    const hyd = settVannGram(S, 1500);
    const rVann = regn(Object.assign({}, S, { hyd }));
    return { mel0: Math.round(rMel.mel[0].gram), vann: Math.round(rVann.vannTotal),
      sumPct: Math.round(rMel.mel.reduce((s, m) => s + m.pct, 0)) };
  });
  ok('500 g på første meltype gir 500 g', Math.abs(gram.mel0 - 500) <= 2, String(gram.mel0));
  ok('melandelene summerer fortsatt til 100 %', Math.abs(gram.sumPct - 100) <= 1, String(gram.sumPct));
  ok('1500 g vann gir 1500 g', Math.abs(gram.vann - 1500) <= 3, String(gram.vann));

  const nullstill = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.melOverstyr = settMelGram(S, 0, 500); S.skjerm = 'deigen'; FB.render();
    await new Promise(r => setTimeout(r, 80));
    const harVarsel = !!document.body.innerText.match(/din egen melblanding/i);
    const k = [...document.querySelectorAll('button')].find(b => /Tilbake til anbefalt blanding/.test(b.textContent));
    if (k) k.click();
    await new Promise(r => setTimeout(r, 120));
    return { harVarsel, etter: FB.S.melOverstyr };
  });
  ok('egen blanding varsles', nullstill.harVarsel);
  ok('«tilbake til anbefalt» nullstiller den', nullstill.etter === null);

  const grovNullstiller = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.melOverstyr = settMelGram(S, 0, 500); FB.render();
    await new Promise(r => setTimeout(r, 60));
    const k = [...document.querySelectorAll('.piller button')].find(b => b.textContent.trim() === '60 %');
    if (k) k.click();
    await new Promise(r => setTimeout(r, 120));
    return FB.S.melOverstyr;
  });
  ok('grovhetstrinn nullstiller egen blanding', grovNullstiller === null);

  /* ---------------------------------------------------------------
     4 · Vanlig steking i ovnen
     --------------------------------------------------------------- */
  console.log('— Vanlig steking i ovnen —');
  const brett = await page.evaluate(() => {
    const S = window.__FB.S;
    const r = regn(Object.assign({}, S, { utstyr: 'brett', stekeProfil: 'brod_brett' }));
    const u = UTSTYR.find(x => x.id === 'brett');
    return { profil: r.prof.id, inn: r.prof.inn, ned: r.prof.ned,
      forvarm: FORVARM_MIN.brod_brett, kontakt: u.kontakt, harVarm: !!r.prof.varm };
  });
  ok('profilen brod_brett finnes og velges', brett.profil === 'brod_brett');
  ok('lavere starttemperatur enn de tunge oppsettene', brett.inn === 240 && brett.ned === 210, brett.inn + ' → ' + brett.ned);
  ok('kortest forvarming i lista', brett.forvarm === 20, String(brett.forvarm));
  ok('ingen oppdiktet kontakttemperatur', brett.kontakt === null);

  /* ---------------------------------------------------------------
     5 · Favoritter er brukerens, ikke appens
     --------------------------------------------------------------- */
  console.log('— Favoritter —');
  const hardkodet = await page.evaluate(() => ({
    utstyrNavn: UTSTYR.map(u => u.navn).join(' | '),
    tekster: UTSTYR.map(u => u.om).join(' ') + BAKE_PROFILES.map(p => p.notat || '').join(' ')
  }));
  ok('ingen ★ hardkodet i utstyrsnavnene', !hardkodet.utstyrNavn.includes('★'), hardkodet.utstyrNavn.slice(0, 60));
  ok('ingen «det beste oppsettet du har»', !/beste oppsettet du har|beste du får ut av utstyret/i.test(hardkodet.tekster));

  const favUtstyr = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.favoritter = []; S.skjerm = 'oppslag'; S.oppslag = 'utstyr'; FB.render();
    await new Promise(r => setTimeout(r, 100));
    const stjerne = document.querySelector('.kort .info-knapp');
    if (stjerne) stjerne.click();
    await new Promise(r => setTimeout(r, 120));
    return { favoritter: FB.S.favoritter.slice(), rammer: document.querySelectorAll('.kort.fav').length };
  });
  ok('utstyr kan stjernemerkes fra Oppslag', favUtstyr.favoritter.length === 1 && /^utstyr:/.test(favUtstyr.favoritter[0]),
    favUtstyr.favoritter.join(','));
  ok('favoritten får ramme', favUtstyr.rammer === 1);

  const favOrden = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.favoritter = ['utstyr:brett']; S.skjerm = 'brodet'; FB.render();
    await new Promise(r => setTimeout(r, 100));
    const opts = [...document.querySelectorAll('select[aria-label="Stekeutstyr"] option')].map(o => o.textContent);
    return opts;
  });
  ok('favoritt-utstyr ligger øverst i velgeren, med ★', /^★ /.test(favOrden[0]), favOrden[0]);

  // Gamle, uprefiksede favoritter (meltyper) skal migreres, ikke kastes.
  const migrering = await page.evaluate(() => {
    localStorage.setItem('forgebakery.v2', JSON.stringify({ favoritter: ['regal_standard', 'samalt_rug'] }));
    return null;
  });
  await page.reload(); await page.waitForTimeout(400);
  const migrert = await page.evaluate(() => window.__FB.S.favoritter.slice());
  ok('gamle melfavoritter migreres til mel:-navnerom',
    migrert.join(',') === 'mel:regal_standard,mel:samalt_rug', migrert.join(','));

  /* ---------------------------------------------------------------
     6 · Brød-skjermen
     --------------------------------------------------------------- */
  console.log('— Brød-skjermen —');
  await page.evaluate(() => { localStorage.removeItem('forgebakery.v2'); });
  await page.reload(); await page.waitForTimeout(400);
  const brod = await page.evaluate(() => {
    const t = document.querySelector('.innhold').innerText;
    return {
      overskrift: /hva skal du bake\?/i.test(t),
      ingenStart: !/Start fra forvalget/.test(t),
      tegninger: document.querySelectorAll('svg.brodsvg').length,
      infoknapper: document.querySelectorAll('.brodvalg .info-ring').length,
      ingenNokkeltall: !document.querySelector('.brodvalg .badge-rund')
    };
  });
  ok('overskriften spør hva du skal bake', brod.overskrift);
  ok('startblokka er borte', brod.ingenStart);
  ok('alle fire brødtypene har tegning', brod.tegninger === 4, String(brod.tegninger));
  ok('alle fire har ⓘ', brod.infoknapper === 4, String(brod.infoknapper));
  ok('nøkkeltall-badgen er ute av kortene', brod.ingenNokkeltall);
  await page.screenshot({ path: SHOT('r4-brod') });

  /* ---------------------------------------------------------------
     7 · Bunnmenyen dekker Androids gestlinje
     --------------------------------------------------------------- */
  console.log('— Bunnmeny og gestlinje —');
  const safe = await page.evaluate(() => {
    const el = document.querySelector('.bunnmeny');
    return getComputedStyle(el).paddingBottom;
  });
  ok('bunnmenyen har safe-area-padding i bunn', safe !== '' && safe !== undefined, safe);
  const cssTekst = await page.evaluate(async () => (await fetch('css/style-v2.css')).text());
  ok('paddingen kommer fra env(safe-area-inset-bottom)', /padding-bottom:\s*env\(safe-area-inset-bottom/.test(cssTekst));

  /* ---------------------------------------------------------------
     8 · Gjæringsgrafen: to akser, tydelig merket
     --------------------------------------------------------------- */
  console.log('— Gjæringsgrafen —');
  await page.evaluate(() => { window.__FB.S.skjerm = 'tid'; window.__FB.render(); });
  await page.waitForTimeout(300);
  const graf = await page.evaluate(() => {
    const svg = document.querySelector('svg[viewBox="0 0 360 210"]');
    return svg ? svg.innerHTML : '';
  });
  ok('venstre akse merket som deigtemperatur', /°C deig/.test(graf));
  ok('høyre akse merket som prosent gjæring', /% gjæring/.test(graf));

  console.log(pageErrors.length ? '  ✗ JS-feil: ' + pageErrors.join(' | ') : '  ✓ ingen JS-feil på siden');
  if (pageErrors.length) feil++;

  await browser.close();
  console.log(feil ? `\n${feil} FEIL` : '\nALLE TESTER GRØNNE');
  process.exit(feil ? 1 : 0);
})();
