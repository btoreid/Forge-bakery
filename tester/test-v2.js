/* Verifisering av de ti brukertest-punktene i V2, i ekte Chromium. */
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

  console.log('— Tid-skjermen —');
  await page.click('#bunnmeny button:has-text("Tid")');
  await page.waitForTimeout(200);

  // 1: datetime-velger finnes og setter ferdigMs
  const dato = page.locator('input.dato-inp');
  ok('datetime-velger synlig i Ferdig-modus', await dato.count() === 1);
  await dato.fill('2026-08-02T12:30');
  await dato.dispatchEvent('change');
  await page.waitForTimeout(200);
  const ferdigTekst = await page.locator('.tid-rad').nth(1).innerText();
  ok('ferdig-oppsummering viser valgt dato', /2\.\s*august.*12[:.]30/i.test(ferdigTekst.replace(/\n/g, ' ')), ferdigTekst.replace(/\n/g, ' | '));

  // 2: luft mellom plankortene
  const mb = await page.locator('.plan-valg').first().evaluate(e => getComputedStyle(e).marginBottom);
  ok('plankort har margin-bottom 8px', mb === '8px', mb);

  // 5: ingen nå-markør i Ferdig-modus
  let svg = await page.locator('.kort:has-text("Gjæringen over tid") svg').innerHTML();
  ok('ingen nå-markør i Ferdig-modus', !svg.includes('>nå<'));
  // …i Start nå-modus rett etter start er nå fortsatt FØR bulk (elting m.m.
  // først) — heller ingen markør. Midt i gjæringen skal den vises.
  await page.click('.toggle2 button:has-text("Start nå")');
  await page.waitForTimeout(300);
  svg = await page.locator('.kort:has-text("Gjæringen over tid") svg').innerHTML();
  ok('ingen nå-markør rett etter start (før bulk)', !svg.includes('>nå<'));
  await page.evaluate(() => { window.__FB.S.ferdigMs = Date.now() + 4 * 3600000; window.__FB.render(); });
  await page.waitForTimeout(200);
  svg = await page.locator('.kort:has-text("Gjæringen over tid") svg').innerHTML();
  ok('nå-markør vises midt i en startet gjæring', svg.includes('>nå<'));
  await page.click('.toggle2 button >> nth=0'); // tilbake til Ferdig
  await page.waitForTimeout(200);
  await page.evaluate(() => { window.__FB.S.ferdigMs = Date.now() + 26 * 3600000; window.__FB.render(); });
  await page.waitForTimeout(200);

  // 3: Ooni Halo Pro + hastighet
  const maskin = await page.locator('.maskin-info').innerText();
  ok('maskinpanelet sier Ooni Halo Pro', maskin.includes('Ooni Halo Pro'));
  ok('maskinpanelet har hastighetsråd', maskin.includes('Hastighet:'));
  await page.click('.piller button:has-text("Kjøkkenmaskin")');
  await page.waitForTimeout(200);
  const maskin2 = await page.locator('.maskin-info').innerText();
  ok('planetmaskin har eget hastighetsråd', maskin2.includes('trinn 2'));
  await page.click('.piller button:has-text("Ooni")');
  await page.waitForTimeout(200);

  // 10: romtemp + kjøleskap-pills i heveplanen
  const hp = page.locator('.kort:has-text("Heveplan")').first();
  ok('romtemp-stepper finnes', await hp.locator('text=Romtemp der deigen hever').count() > 0);
  ok('kjøleskap-knapp per trinn', await hp.locator('button:has-text("Kjøleskap 4°")').count() >= 2);
  ok('rommet ditt-knapp per trinn', await hp.locator('button:has-text("Rommet ditt")').count() >= 2);
  // kaldtrinnet (3,5°) skal vise kjøleskap som aktivt
  ok('kaldheving (3,5°) markert som kjøleskap', await hp.locator('button.paa:has-text("Kjøleskap 4°")').count() >= 1);
  // trykk «Rommet ditt» på første trinn og se at miljø-feltet følger med
  await hp.locator('button:has-text("Rommet ditt")').first().click();
  await page.waitForTimeout(200);
  const miljoFelt = await page.locator('.kort:has-text("Heveplan")').first().locator('input[aria-label="Miljø"]').first().inputValue();
  ok('«Rommet ditt» satte miljø til 22', miljoFelt.startsWith('22'), miljoFelt);
  await page.screenshot({ path: SHOT('tid'), fullPage: false });

  console.log('— Deig-skjermen —');
  await page.click('#bunnmeny button:has-text("Deig")');
  await page.waitForTimeout(200);

  // 8: soner — standard solsikke 6 % = grønn; skru til 12 % = gul; 16 % = rød
  const sol = page.locator('.tillegg-rad:has-text("Solsikkekjerner")');
  ok('solsikke 6 % er grønn (ingen gul/rød klasse)', (await sol.getAttribute('class')).indexOf('gul') < 0);
  const solInp = sol.locator('input[aria-label="Solsikkekjerner prosent"]');
  await solInp.fill('12'); await solInp.dispatchEvent('blur');
  await page.waitForTimeout(200);
  let solKl = await page.locator('.tillegg-rad:has-text("Solsikkekjerner")').getAttribute('class');
  ok('solsikke 12 % er gul', solKl.includes('gul'), solKl);
  const solInp2 = page.locator('.tillegg-rad:has-text("Solsikkekjerner")').locator('input[aria-label="Solsikkekjerner prosent"]');
  await solInp2.fill('16'); await solInp2.dispatchEvent('blur');
  await page.waitForTimeout(200);
  solKl = await page.locator('.tillegg-rad:has-text("Solsikkekjerner")').getAttribute('class');
  ok('solsikke 16 % er rød', solKl.includes('rod'), solKl);
  ok('statuslinja forklarer sonen', (await page.locator('.tillegg-rad:has-text("Solsikkekjerner")').innerText()).includes('nær maks'));
  await page.screenshot({ path: SHOT('deig-soner') });
  await solInp2.fill('6'); await solInp2.dispatchEvent('blur');
  await page.waitForTimeout(200);

  // 6: kompensasjonspanel
  const komp = page.locator('.kort:has-text("Hva vil du gjøre med endringen?")');
  ok('kompensasjonspanel vises når tillegg er på', await komp.count() === 1);
  const kompTekst = await komp.innerText();
  ok('panelet viser meltapet', /melet faller/.test(kompTekst));
  ok('panelet har «Øk deigen»-knapp', /Øk deigen/.test(kompTekst));
  // trykk «Øk deigen» og sjekk at vekta faktisk økte (Brød-fanen)
  const melFoer = await page.locator('.kort:has-text("2 · Meltypene") .h-meta').innerText();
  await komp.locator('button:has-text("Øk deigen")').click();
  await page.waitForTimeout(250);
  const melEtter = await page.locator('.kort:has-text("2 · Meltypene") .h-meta').innerText();
  ok('melmengden økte etter «Øk deigen»', melFoer !== melEtter, melFoer + ' → ' + melEtter);

  // 9: dose–respons som ± mot normalen
  const dr = page.locator('.kort:has-text("Hva valgene koster")');
  const drTekst = await dr.innerText();
  ok('dose–respons viser ± mot normalen', /[+−]\d/.test(drTekst) && drTekst.includes('normalen'), drTekst.slice(0, 90));
  await dr.scrollIntoViewIfNeeded();
  await page.screenshot({ path: SHOT('deig-doserespons') });

  // 8b: salt-merke
  const salt = page.locator('.kort:has-text("7 · Salt")');
  ok('salt har sonemerke', (await salt.innerText()).includes('I SONEN'));

  // 7: favoritt — stjernemerk Regal standard i Oppslag, sjekk ramme + pille i Deig
  console.log('— Favoritter —');
  await page.click('#bunnmeny button:has-text("Oppslag")');
  await page.waitForTimeout(200);
  await page.click('.valgkort:has-text("Mel & korn")');
  await page.waitForTimeout(200);
  const regalKort = page.locator('.kort.flat:has-text("Regal Hvetemel standard")').first();
  await regalKort.locator('button[aria-label*="favoritt"]').click();
  await page.waitForTimeout(200);
  const regalKl = await page.locator('.kort:has-text("Regal Hvetemel standard")').first().getAttribute('class');
  ok('favoritt-kort i Oppslag har ramme (.fav)', regalKl.includes('fav'), regalKl);
  await page.screenshot({ path: SHOT('oppslag-fav') });
  await page.click('#bunnmeny button:has-text("Deig")');
  await page.waitForTimeout(200);
  const melrad = await page.locator('.melrad2:has-text("Regal")').first().innerText();
  ok('Deig viser favoritt-pille, ikke dobbel stjerne', melrad.includes('FAVORITT') || melrad.includes('favoritt'));
  ok('ingen «★ Regal…★»-dobling', !/★\s*Regal/.test(melrad), melrad.split('\n')[0]);

  // 4 + 9: deigregnskap — åpne, sjekk avvikseksjonen, lukk ved å trykke PÅ arket
  console.log('— Deigregnskap —');
  await page.click('.bunnlinje .stripe');
  await page.waitForTimeout(300);
  ok('regnskapsarket åpnet', await page.locator('.regnskap-ark').count() === 1);
  const ark = await page.locator('.regnskap-ark').innerText();
  ok('arket har «Valgene dine mot normalen»', /valgene dine mot normalen/i.test(ark), ark.replace(/\n/g, ' | ').slice(0, 120));
  await page.screenshot({ path: SHOT('regnskap') });
  await page.locator('.regnskap-ark .ark-tittel').first().click();
  await page.waitForTimeout(300);
  ok('trykk på selve arket lukker det', await page.locator('.regnskap-ark').count() === 0);

  ok('ingen JS-feil på siden', pageErrors.length === 0, pageErrors.join(' | '));
  await browser.close();
  console.log(feil === 0 ? '\nALLE TESTER GRØNNE' : '\n' + feil + ' TESTER RØDE');
  process.exit(feil === 0 ? 0 : 1);
})();
