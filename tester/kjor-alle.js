/* Kjører hele regresjonen: starter serverne, kjører hver suite, oppsummerer.
   Serverne må startes herfra — testene forutsetter dem, og å be folk huske to
   bakgrunnsprosesser i riktig katalog er en oppskrift på falske røde tester. */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const ROT = path.resolve(__dirname, '..');
const SUITER = [
  ['test-v2', 'Runde 2: tid, soner, dose–respons, favoritter, deigregnskap'],
  ['test-r3', 'Runde 3: bytte bakst, om-baket, stekeprofiler, backup'],
  ['test-r4', 'Runde 4: synk uten datatap, bak-på-nytt, gram inn, vanlig ovn'],
  ['test-logg', 'Loggen: fullskjermbilder, rediger, slett'],
  ['test-pyrex', 'Pyrex i ovnen: 260 °C kun for kloke-oppsettet'],
  ['test-flytt', 'Inngangene: rota = V2, index-v1 = V1, videresending'],
  ['test-pwa', 'PWA: manifest, ikoner, service worker, offline'],
  ['test-cache', 'Cache: refresh gir ny kode uten tømming']
];

function vent(url, forsok = 40) {
  return new Promise((ok, feil) => {
    const proev = n => http.get(url, r => { r.resume(); ok(); })
      .on('error', () => n > 0 ? setTimeout(() => proev(n - 1), 250) : feil(new Error('ingen server på ' + url)));
    proev(forsok);
  });
}
const kjor = (kmd, args, cwd) => spawn(kmd, args, { cwd, stdio: 'ignore', detached: true });

(async () => {
  // 8123 serverer appen som den er; 8124 hermer GitHub Pages (max-age + ETag),
  // som test-cache trenger for å se cache-oppførselen i det hele tatt.
  const app = kjor('python3', ['-m', 'http.server', '8123'], ROT);
  const pages = kjor('node', [path.join(__dirname, 'pages-server.js')], __dirname);
  const rydd = () => { try { process.kill(-app.pid); } catch (e) {} try { process.kill(-pages.pid); } catch (e) {} };
  process.on('exit', rydd); process.on('SIGINT', () => { rydd(); process.exit(130); });

  try {
    await Promise.all([vent('http://localhost:8123/'), vent('http://localhost:8124/')]);
  } catch (e) {
    console.error('Fikk ikke opp testserverne: ' + e.message); rydd(); process.exit(1);
  }

  let feilet = [];
  for (const [fil, hva] of SUITER) {
    process.stdout.write(fil.padEnd(13) + hva.padEnd(60));
    const kode = await new Promise(ok =>
      spawn('node', [path.join(__dirname, fil + '.js')], { stdio: 'ignore' }).on('close', ok));
    console.log(kode === 0 ? 'GRØNN' : 'RØD');
    if (kode !== 0) feilet.push(fil);
  }
  rydd();
  console.log(feilet.length
    ? '\n' + feilet.length + ' suite(r) røde: ' + feilet.join(', ') + '\nKjør den enkelte for detaljer, f.eks.  node ' + feilet[0] + '.js'
    : '\nAlle ' + SUITER.length + ' suitene grønne.');
  process.exit(feilet.length ? 1 : 0);
})();
