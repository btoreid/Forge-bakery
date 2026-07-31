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
  /* Innloggingsporten (31.07) står foran hele appen. Denne kroken er den
     eneste veien forbi den, og settes kun her — aldri i produksjonskode. */
  await page.addInitScript(() => { window.__FB_TEST_INGEN_PORT = true; });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  await page.goto(URL);
  // Start fra blanke ark. Uten dette arver kjøringen tilstanden fra forrige
  // kjøring (bl.a. et lagret standardbrød), og «endret verdi»-sjekkene under kan
  // bli grønne eller røde av feil grunn.
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.waitForTimeout(400);

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
    FB.S.hyd = (FB.S.hyd === 78 ? 79 : 78); FB.oppdater();   // ekte dataendring
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
    /* 1400 g ligger innenfor skyverens spenn (62–86 %). Løseren klemmer til
       samme grenser som skyveren — ulike grenser ga før et tall over skyveren
       som skyveren selv ikke kunne stå på. */
    const hyd = settVannGram(S, 1400);
    const rVann = regn(Object.assign({}, S, { hyd }));
    // Et uoppnåelig ønske skal klemmes til skyverens tak, ikke forbi det.
    const hydHoy = settVannGram(S, 9000);
    return { mel0: Math.round(rMel.mel[0].gram), vann: Math.round(rVann.vannTotal),
      hydHoy, sumPct: Math.round(rMel.mel.reduce((s, m) => s + m.pct, 0)) };
  });
  ok('500 g på første meltype gir 500 g', Math.abs(gram.mel0 - 500) <= 2, String(gram.mel0));
  ok('melandelene summerer fortsatt til 100 %', Math.abs(gram.sumPct - 100) <= 1, String(gram.sumPct));
  ok('uoppnåelig vannmengde klemmes til skyverens tak', gram.hydHoy === 88, String(gram.hydHoy));
  ok('1400 g vann gir 1400 g', Math.abs(gram.vann - 1400) <= 4, String(gram.vann));

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
    // Grovhetstrappa er 0/25/50/75/100 fra 31.07 (natt).
    const k = [...document.querySelectorAll('.piller button')].find(b => b.textContent.trim() === '50 %');
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
      // Overskriften ligger i TOPPFELTET nå, ikke som en seksjonstittel i
      // innholdet — stegtallet og tittelen deler én linje for å spare plass.
      overskrift: /hva skal du bake\?/i.test(document.getElementById('topp').textContent),
      stegTall: /1 av 4/i.test(document.getElementById('topp').textContent),
      ingenStart: !/Start fra forvalget/.test(t),
      tegninger: document.querySelectorAll('svg.brodsvg').length,
      infoknapper: document.querySelectorAll('.brodvalg .info-ring').length,
      ingenNokkeltall: !document.querySelector('.brodvalg .badge-rund')
    };
  });
  ok('overskriften spør hva du skal bake', brod.overskrift);
  ok('stegtallet står i overskriftslinja (1 av 4)', brod.stegTall);
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


  /* ---------------------------------------------------------------
     9 · Bakeloggen hører til kontoen
     ---------------------------------------------------------------
     Følgefeil av flettingen over: loggen ble liggende igjen etter utlogging og
     ville blitt flettet inn i neste konto som logget inn på enheten. */
  console.log('— Loggen hører til kontoen —');
  const eierskap = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    localStorage.removeItem('forgebakery.v2.utenkonto');
    // to poster: én uten konto (loggført utlogget), én som tilhører konto A
    S.loggListe = [
      { id: 'anon1', laget: 1, endret: 1, konto: null, navn: 'bakt uten konto' },
      { id: 'a1', laget: 2, endret: 2, konto: 'uid-A', navn: 'kontoens eget' }
    ];
    S.loggSlettet = [];
    // simuler innlogging som konto B: bare Bs egne skal med, anon settes til side
    const mine = S.loggListe.filter(b => b.konto === 'uid-B');
    const anon = S.loggListe.filter(b => !b.konto);
    const flettet = FB.flettLogg(mine, [{ id: 'b1', laget: 3, endret: 3, konto: 'uid-B', navn: 'Bs bak' }], []);
    return { antall: flettet.length, navn: flettet.map(x => x.navn), anonAntall: anon.length };
  });
  ok('en annen kontos poster arves IKKE ved innlogging', !eierskap.navn.includes('kontoens eget'), eierskap.navn.join(' | '));
  ok('kun innlogget kontos egne poster flettes', eierskap.navn.join(',') === 'Bs bak', eierskap.navn.join(','));
  ok('poster uten konto settes til side', eierskap.anonAntall === 1);

  const utlogging = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    // enhetens egne (uten konto) skal komme TILBAKE etter utlogging
    localStorage.setItem('forgebakery.v2.utenkonto', JSON.stringify({ poster: [{ id: 'anon9', laget: 9, konto: null, navn: 'enhetens egen' }], avslaatt: false }));
    S.loggListe = [{ id: 'k1', laget: 1, konto: 'uid-A', navn: 'kontoens' }];
    S.loggSlettet = ['x'];
    // etterlign trinn 2 og 3 i loggUtTrygt() (trinn 1 krever nett)
    const anon = JSON.parse(localStorage.getItem('forgebakery.v2.utenkonto')).poster;
    S.loggListe = anon.slice(); S.loggSlettet = [];
    FB.oppdater();
    return { navn: S.loggListe.map(b => b.navn), gravsteiner: S.loggSlettet.length };
  });
  ok('kontoens poster fjernes fra enheten ved utlogging', !utlogging.navn.includes('kontoens'), utlogging.navn.join(','));
  ok('bak uten konto overlever utloggingen', utlogging.navn.join(',') === 'enhetens egen', utlogging.navn.join(','));
  ok('gravsteinene ryddes med', utlogging.gravsteiner === 0);

  const nyBakStempel = await page.evaluate(() => {
    // utlogget: nye poster skal få konto = null
    const F = window.__FB;
    return typeof F.oppskriftAvtrykk === 'function';
  });
  ok('oppskriftsavtrykket er eksponert for testing', nyBakStempel);

  /* ---------------------------------------------------------------
     10 · Standardbrød
     --------------------------------------------------------------- */
  console.log('— Standardbrød —');
  const standard = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.brotype = 'grovbrod'; S.grov = 60; S.hyd = 73; S.vekt = 750; S.tillegg = {};
    S.skjerm = 'logg'; FB.render();
    await new Promise(r => setTimeout(r, 80));
    const knapp = [...document.querySelectorAll('button')].find(b => /Lagre dette som standardbrød/.test(b.textContent));
    const fantKnapp = !!knapp;
    if (knapp) knapp.click();
    await new Promise(r => setTimeout(r, 120));
    const lagret = !!FB.S.standardBrod && FB.S.standardBrod.grov === 60;
    /* Sett oppskriften tilbake til fabrikk GJENNOM appen, ikke ved å skrive i
       localStorage: det er den veien en ekte «start på nytt» går, og det er
       tilstanden `erFabrikkOppskrift()` skal kjenne igjen ved neste oppstart. */
    // Fabrikkverdiene er 0 % grovt, ingen tillegg og 800 g fra 31.07 (kveld).
    S.grov = 0; S.hyd = 75; S.vekt = 800; S.brotype = 'grovbrod'; S.tid = 'lang';
    S.antall = 4; S.saltPct = null; S.heveplan = null; S.ff = false; S.ffType = 'poolish';
    S.tillegg = {}; S.melOverstyr = null; S.okDeig = false; S.autolyseMin = 0;
    FB.oppdater();
    await new Promise(r => setTimeout(r, 120));
    return { lagret, fantKnapp, lagretIStore: !!localStorage.getItem('forgebakery.v2') };
  });
  ok('«Lagre dette som standardbrød»-knappen finnes i Logg', standard.fantKnapp);
  ok('standardbrødet lagres', standard.lagret);
  ok('tilstanden er skrevet til localStorage', standard.lagretIStore);
  await page.reload(); await page.waitForTimeout(400);
  const paalagt = await page.evaluate(() => ({ grov: window.__FB.S.grov, hyd: window.__FB.S.hyd, vekt: window.__FB.S.vekt }));
  ok('standardbrødet legges på når oppskriften er fabrikkinnstilt', paalagt.grov === 60 && paalagt.hyd === 73 && paalagt.vekt === 750,
    JSON.stringify(paalagt));

  /* ---------------------------------------------------------------
     11 · Sonefarge på hele kortet, og rundt gramfelt
     --------------------------------------------------------------- */
  console.log('— Soner og form —');
  const soner = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.skjerm = 'deigen'; FB.render();
    await new Promise(r => setTimeout(r, 120));
    // Velg på overskriften, ikke på at ordet «vann» finnes i kortet: flere kort
    // nevner vann i konsekvensteksten, og da traff find() feil kort.
    const finnKort = nr => [...document.querySelectorAll('.kort')]
      .find(k => { const n = k.querySelector('.kort-num'); return n && n.textContent.trim().indexOf(nr) === 0; });
    /* Taket og anbefalingen følger melblandingen nå, så testen kan ikke bruke
       faste tall: 86 % er over taket på siktet hvete og innenfor det på en grov
       blanding. Den spør derfor motoren hva grensene ER for blandingen som
       ligger der, og sjekker fargen på hver side av dem. */
    const g = regn(S);
    S.hyd = Math.min(88, Math.round(g.tak) + 2); FB.render();
    await new Promise(r => setTimeout(r, 120));
    const over = finnKort('3 ·');
    const rod = over && over.className.includes('sone-rod');
    S.hyd = g.hydAnbefalt; FB.render();
    await new Promise(r => setTimeout(r, 120));
    const vk2 = finnKort('3 ·');
    const gronn = vk2 && vk2.className.includes('sone-gronn');
    const felt = document.querySelector('.gramfelt');
    return { rod, gronn, tak: g.tak, anb: g.hydAnbefalt, radius: felt ? getComputedStyle(felt).borderRadius : '' };
  });
  ok('vannkortet blir rødt over melblandingens tak', soner.rod, 'tak ' + Math.round(soner.tak));
  ok('vannkortet er grønt på anbefalt hydrering', soner.gronn, 'anbefalt ' + soner.anb);
  ok('gramfeltet har runde kanter', /999px|50%/.test(soner.radius) || parseFloat(soner.radius) >= 12, soner.radius);


  /* ---------------------------------------------------------------
     12 · Hva skal gi etter når en meltype endres i gram
     --------------------------------------------------------------- */
  console.log('— Mel: hva skal gi etter —');
  const girEtter = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.melOverstyr = null; S.grov = 40; S.vekt = 900; S.antall = 4; S.tillegg = {};
    S.skjerm = 'deigen'; FB.oppdater();
    await new Promise(r => setTimeout(r, 150));
    const start = regn(S).mel.map(m => Math.round(m.gram));
    const prop = regn({ ...S, melOverstyr: settMelGram(S, 0, 900) }).mel.map(m => Math.round(m.gram));
    const mot1 = regn({ ...S, melOverstyr: settMelGramMot(S, 0, 900, 1) }).mel.map(m => Math.round(m.gram));
    const voks = settMelGramMerDeig(S, 0, 900);
    const vr = regn({ ...S, melOverstyr: voks.melOverstyr, vekt: voks.vekt }).mel.map(m => Math.round(m.gram));
    return { start, prop, mot1, voks: vr, nyVekt: voks.vekt, gammelVekt: S.vekt };
  });
  // ±2 g: løserne itererer, og siste desimal er under vektas oppløsning uansett.
  const naer = (a, b) => Math.abs(a - b) <= 2;
  ok('proporsjonalt: alle andre justeres', naer(girEtter.prop[0], 900) && !naer(girEtter.prop[1], girEtter.start[1]) && !naer(girEtter.prop[2], girEtter.start[2]),
    girEtter.prop.join(' / ') + '  (start ' + girEtter.start.join(' / ') + ')');
  ok('mot én meltype: bare den ene endres', naer(girEtter.mot1[0], 900) && naer(girEtter.mot1[2], girEtter.start[2]) && !naer(girEtter.mot1[1], girEtter.start[1]),
    girEtter.mot1.join(' / '));
  ok('la deigen endres: de andre står helt urørt',
    naer(girEtter.voks[0], 900) && naer(girEtter.voks[1], girEtter.start[1]) && naer(girEtter.voks[2], girEtter.start[2]),
    girEtter.voks.join(' / '));
  ok('brødvekten følger med når deigen endres', girEtter.nyVekt !== girEtter.gammelVekt,
    girEtter.gammelVekt + ' → ' + girEtter.nyVekt);

  const spm = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.melEndring = { i: 0, gram: 900, fra: 1109 }; S.skjerm = 'deigen'; FB.render();
    await new Promise(r => setTimeout(r, 150));
    const boks = [...document.querySelectorAll('.varsel')].find(x => /hva vil du at det skal være/i.test(x.textContent));
    return { finnes: !!boks, valg: boks ? boks.querySelectorAll('.valgkort').length : 0,
      antallMel: regn(S).mel.length,
      krymper: boks ? /la deigen krympe/i.test(boks.textContent) : false };
  });
  ok('spørsmålet reises av en gramendring', spm.finnes);
  // ett valg per ANNEN meltype + «alle deler på det» + «la deigen endres»
  ok('ett valg per meltype + proporsjonalt + deigen', spm.valg === spm.antallMel + 1,
    spm.valg + ' valg for ' + spm.antallMel + ' meltyper');
  ok('retningen står riktig (reduksjon = krympe)', spm.krymper);

  /* ---------------------------------------------------------------
     13 · Forfermentens temperatur
     --------------------------------------------------------------- */
  console.log('— Forferment: temperatur og kjøleskap —');
  const ffT = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.melEndring = null; S.ff = true; S.ffType = 'poolish'; S.ffTemp = null; FB.oppdater();
    await new Promise(r => setTimeout(r, 120));
    const varm = regn(S);
    S.ffTemp = 4; FB.oppdater();
    await new Promise(r => setTimeout(r, 150));
    const kald = regn(S);
    const tekst = document.body.innerText;
    return { varmTemp: varm.forferment.temp, kaldTemp: kald.forferment.temp,
      varmGjaer: varm.forferment.gjaer, kaldGjaer: kald.forferment.gjaer,
      ekv: ffTidEkvivalent(varm.forferment.timer, varm.forferment.temp, 4),
      rom: S.romTemp,
      advarer: /går ikke opp/i.test(tekst), harKjoleskapsknapp: /I kjøleskapet/.test(tekst) };
  });
  /* Forfermenten holder ROMMETS temperatur når man ikke har rørt den — ikke et
     tabelltall på 21 grader. Det er rommet man vet temperaturen på. */
  ok('forfermenten følger romtemperaturen når man ikke har rørt den', ffT.varmTemp === ffT.rom,
    ffT.varmTemp + ' mot rom ' + ffT.rom);
  ok('kjøleskapsknappen setter kjøleskapstemperaturen', ffT.kaldTemp === 4 && ffT.harKjoleskapsknapp);
  ok('kaldt krever mer gjær for samme tid', ffT.kaldGjaer > ffT.varmGjaer,
    ffT.varmGjaer.toFixed(2) + ' → ' + ffT.kaldGjaer.toFixed(2) + ' g');
  ok('ekvivalent tid regnes ut', ffT.ekv > 0 && isFinite(ffT.ekv), Math.round(ffT.ekv) + ' t');
  ok('appen sier fra når kombinasjonen ikke går opp', ffT.advarer);

  /* ---------------------------------------------------------------
     14 · Autolyse som eget steg
     --------------------------------------------------------------- */
  console.log('— Autolyse —');
  const auto = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    /* Uten forferment: med forferment på er DEN første steg i kjeden, og den
       ankres til eltestart — autolysen legger seg mellom forberedelse og elting
       og flytter da ikke kjedens start. Det er riktig oppførsel, men gjør
       totaltiden til feil ting å måle på. */
    S.ff = false; S.ffTemp = null; S.autolyseMin = 0; FB.oppdater();
    await new Promise(r => setTimeout(r, 100));
    const r0 = regn(S), k0 = kjede(S, r0, Date.now() + 20 * 3600000);
    S.autolyseMin = 60; FB.oppdater();
    await new Promise(r => setTimeout(r, 120));
    const r1 = regn(S), k1 = kjede(S, r1, Date.now() + 20 * 3600000);
    return { uten: k0.length, med: k1.length,
      harSteg: k1.some(x => x.id === 'autolyse'),
      totalUten: +k0.totalT.toFixed(2), totalMed: +k1.totalT.toFixed(2),
      egenBoks: /9 · Autolyse/i.test(document.body.innerText) };
  });
  ok('autolyse er av som standard og legger til ett steg', auto.med === auto.uten + 1, auto.uten + ' → ' + auto.med);
  ok('steget heter autolyse', auto.harSteg);
  ok('autolysen forlenger totaltiden med 1 t', Math.abs((auto.totalMed - auto.totalUten) - 1) < 0.02,
    auto.totalUten + ' → ' + auto.totalMed + ' t');
  ok('autolyse har egen boks i Deig', auto.egenBoks);

  /* ---------------------------------------------------------------
     15 · Form og kurv: uten form, og kurvmål som innstilling
     --------------------------------------------------------------- */
  console.log('— Form og kurv —');
  const former = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.autolyseMin = 0; S.skjerm = 'brodet'; S.form = 'ingen'; FB.oppdater();
    await new Promise(r => setTimeout(r, 150));
    const utenForm = /Uten form/.test(document.body.innerText);
    // Uten eget mål SPØR appen i stedet for å advare — advarselen ville da vært
    // målt mot en antatt standardstørrelse, ikke mot kurven på kjøkkenet.
    S.form = 'avlang'; S.vekt = 1600; S.kurvMaal = {}; FB.oppdater();
    await new Promise(r => setTimeout(r, 150));
    const spoer = /Hvor stor er kurven din/i.test(document.body.innerText);
    S.kurvMaal = { avlang: 20 }; FB.oppdater();
    await new Promise(r => setTimeout(r, 150));
    const forLiten = /kurven din er/i.test(document.body.innerText);
    S.kurvMaal = { avlang: 60 }; FB.oppdater();
    await new Promise(r => setTimeout(r, 150));
    const okNaa = !/kurven din er/i.test(document.body.innerText);
    return { utenForm, spoer, forLiten, okNaa,
      ingenDittVanlige: !/ditt vanlige/i.test(JSON.stringify(FORMER)) };
  });
  ok('«Uten form» finnes som valg', former.utenForm);
  ok('appen spør om kurvmålet første gang', former.spoer);
  ok('appen sier fra når emnet er for stort for DIN kurv', former.forLiten);
  ok('egen kurvstørrelse fjerner advarselen', former.okNaa);
  ok('«ditt vanlige» er ute av formbeskrivelsene', former.ingenDittVanlige);

  /* ---------------------------------------------------------------
     16 · Deigregnskapet: pil opp og gjæringsgraf
     --------------------------------------------------------------- */
  console.log('— Deigregnskapet —');
  const regnskap = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.vekt = 900; S.skjerm = 'deigen'; S.regnskapAapen = false; FB.oppdater();
    await new Promise(r => setTimeout(r, 150));
    const pil = document.querySelector('.bunnlinje .pil');
    const pilTegn = pil ? pil.textContent.trim() : '';
    S.regnskapAapen = true; FB.oppdater();
    await new Promise(r => setTimeout(r, 200));
    const ark = document.querySelector('.regnskap-ark');
    return { pilTegn, harGraf: !!(ark && ark.querySelector('svg[viewBox="0 0 360 210"]')),
      harTittel: !!(ark && /Gjæringen over tid/i.test(ark.textContent)) };
  });
  ok('pila peker oppover når arket er lukket', regnskap.pilTegn === '⌃', regnskap.pilTegn);
  ok('gjæringsgrafen ligger i deigregnskapet', regnskap.harGraf);
  ok('grafen er merket i arket', regnskap.harTittel);

  /* ---------------------------------------------------------------
     17 · «Dette må være i huset» ligger først i Prosess
     --------------------------------------------------------------- */
  console.log('— Handlelista —');
  const huset = await page.evaluate(async () => {
    const FB = window.__FB, S = FB.S;
    S.regnskapAapen = false; S.handlelisteOk = false; S.skjerm = 'prosess'; FB.oppdater();
    await new Promise(r => setTimeout(r, 200));
    const innhold = document.querySelector('.innhold');
    const foerst = innhold.firstElementChild ? innhold.firstElementChild.firstElementChild : null;
    const tekst = foerst ? foerst.textContent : '';
    const knapp = [...document.querySelectorAll('button')].find(b => /Jeg har alt/.test(b.textContent));
    if (knapp) knapp.click();
    await new Promise(r => setTimeout(r, 150));
    return { foerstTekst: tekst.slice(0, 60), kvittert: FB.S.handlelisteOk,
      // Ny oppførsel: kvittert = linja forsvinner fra toppen (den lå bare i
      // veien over stegene), og en diskré «Vis handlelista igjen» ligger nederst.
      altErIHusetLinje: /Alt er i huset/.test(document.body.innerText),
      visIgjen: /Vis handlelista igjen/.test(document.body.innerText) };
  });
  ok('handlelista ligger ØVERST i Prosess', /i huset/i.test(huset.foerstTekst), huset.foerstTekst);
  ok('«Jeg har alt» kvitterer den bort', huset.kvittert);
  ok('kvittert lista forsvinner fra toppen over stegene', !huset.altErIHusetLinje);
  ok('men kan åpnes igjen fra en diskré knapp nederst', huset.visIgjen);

  /* ---------------------------------------------------------------
     18 · Tidsplanene heter noe man kan skille
     --------------------------------------------------------------- */
  const planNavn = await page.evaluate(() => TIDSPLANER.map(t => t.navn));
  ok('fire planer: Optimal/Over natta/Samme dag/Ekspress',
    planNavn.join(',') === 'Optimal,Over natta,Samme dag,Ekspress', planNavn.join(','));
  await page.evaluate(() => { localStorage.setItem('forgebakery.v2', JSON.stringify({ tid: 'kort' })); });
  await page.reload(); await page.waitForTimeout(400);
  ok('lagret «kort» migreres til «dag»', await page.evaluate(() => window.__FB.S.tid) === 'dag');

  /* ---------------------------------------------------------------
     19 · Skrivefeil og hardkodede formuleringer
     --------------------------------------------------------------- */
  const tekster = await page.evaluate(() => ({
    kloke: JSON.stringify(UTSTYR) + JSON.stringify(BAKE_PROFILES),
    former: JSON.stringify(FORMER)
  }));
  /* Bjørn ombestemte seg: det skal stå «klokke», ikke «kloke». Testen vokter nå
     at det er konsistent — ikke at ett bestemt av de to ordene er brukt. */
  ok('«klokke» brukt konsistent i utstyr og profiler',
    !/\bkloke\b/.test(tekster.kloke), (tekster.kloke.match(/\bkloke\b/) || ['—'])[0]);

  console.log(pageErrors.length ? '  ✗ JS-feil: ' + pageErrors.join(' | ') : '  ✓ ingen JS-feil på siden');
  if (pageErrors.length) feil++;

  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await browser.close();
  console.log(feil ? `\n${feil} FEIL` : '\nALLE TESTER GRØNNE');
  process.exit(feil ? 1 : 0);
})();
