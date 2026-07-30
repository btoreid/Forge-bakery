/* ============================================================
   FORGE BAKERY — regnemotor
   Fermenteringskinetikk, deigtemperatur og oppskriftsmatematikk.
   Alle temperaturer i °C, tid i timer, gjær i % av totalt mel.
   ============================================================ */

const FERM = {
  // Temperaturrespons: utvidet Ratkowsky kvadratrot-modell.
  // Reproduserer både «dobling per 8–10 °C» rundt romtemperatur,
  // den observerte ~36× nedbremsingen i kjøleskap, og målt optimum 35,5 °C.
  T_MIN: 0.0,     // nedre grense for gassproduksjon
  T_MAX: 44.0,    // øvre grense (Salvadó 2011: T_max 45,4 for vekst)
  C_HIGH: 0.28,   // høytemperatur-dempning
  T_REF: 24.0,    // referanse; R(24) === 1

  // Gjærpopulasjonens vekst i deig (logistisk).
  MU_REF: 0.18,   // spesifikk veksthastighet ved 24 °C (doblingstid ~3,9 t)
  Y_MAX: 2.5,     // bæreevne i mager hvetedeig, % tørrgjær-ekvivalent

  // Newton-avkjøling i kjøleskap
  TAU_1KG: 3.0,   // tidskonstant i timer for 1 kg deigmasse

  // Gjæromregning (multipliser FRA fersk gjær)
  FERSK_TIL_TORR: 1 / 3,     // instant tørrgjær — enstemmig i alle kilder
  FERSK_TIL_AKTIV: 0.40,     // aktiv tørrgjær; kilder spenner 0,33–0,50

  // Poolish/biga
  POOLISH_K: 7.7,
  POOLISH_N: 1.33,
  POOLISH_TREF: 23.0
};

/* ---------- Relativ fermenteringsrate ---------- */
function rateFactor(T) {
  const f = t => (t <= FERM.T_MIN || t >= FERM.T_MAX)
    ? 0
    : (t - FERM.T_MIN) * (1 - Math.exp(FERM.C_HIGH * (t - FERM.T_MAX)));
  const ref = f(FERM.T_REF);
  const v = f(T) / ref;
  return v * v;
}

/* Hvor mange grader må du opp for å doble farten? null over optimum. */
function doublingInterval(T0) {
  const target = 2 * rateFactor(T0);
  for (let T = T0; T < FERM.T_MAX; T += 0.05) {
    if (rateFactor(T) >= target) return T - T0;
  }
  return null;
}

/* ---------- Termisk etterslep ---------- */
/* Tidskonstanten styres av massen til ETT emne, ikke av batchen. En utbakt
   deig i hevekurver kjøles derfor dramatisk raskere enn samme deig i én boks —
   og det er den enkeltbeslutningen som avgjør hvor mye av gjæringen som havner
   i kjøleskapet i stedet for i bulken. */
function tauHours(massKg, opt = {}) {
  let tau = FERM.TAU_1KG * Math.cbrt(Math.max(massKg, 0.05));
  if (opt.lokk)       tau *= 1.25;  // tett lokkboks
  if (opt.fulltKjol)  tau *= 1.35;  // stappfullt kjøleskap, dårlig luft
  return tau;
}

function doughTempAt(t, T0, Tenv, tau) {
  return Tenv + (T0 - Tenv) * Math.exp(-t / tau);
}

/* ---------- Gjærpopulasjon (logistisk) ---------- */
function yeastAt(t, Y0, avgRate) {
  if (Y0 >= FERM.Y_MAX) return Y0;
  const mu = FERM.MU_REF * avgRate;
  return (FERM.Y_MAX * Y0) / (Y0 + (FERM.Y_MAX - Y0) * Math.exp(-mu * t));
}

/* ---------- Gjæringsdose for ett trinn ----------
   Dose = ∫ Y(t) · R(T(t)) dt   [enhet: %-tørrgjær-timer ved 24 °C]     */
function stageDose(o) {
  const {
    timer, gjaerPct, T0, miljo,
    masseKg = 1.0, utbakt = false, lokk = false, fulltKjol = false,
    steg = 300
  } = o;

  const tau = tauHours(masseKg, { utbakt, lokk, fulltKjol });
  const dt = timer / steg;
  const isoterm = Math.abs(T0 - miljo) < 0.05;

  let dose = 0, rateIntegral = 0, gjaer = gjaerPct;

  for (let i = 0; i < steg; i++) {
    const tMid = (i + 0.5) * dt;
    const T = isoterm ? miljo : doughTempAt(tMid, T0, miljo, tau);
    const R = rateFactor(T);
    rateIntegral += R * dt;
    gjaer = yeastAt(tMid, gjaerPct, rateIntegral / Math.max(tMid, 1e-9));
    dose += gjaer * R * dt;
  }

  return {
    dose,
    ekvTimer: rateIntegral,              // 24 °C-ekvivalente timer
    sluttTemp: isoterm ? miljo : doughTempAt(timer, T0, miljo, tau),
    sluttGjaer: gjaer,
    tau
  };
}

/* ---------- Hele planen ----------
   plan: [{navn, timer, temp (starttemp, kun trinn 1 brukes), miljo}]
   Etterfølgende trinn arver sluttemperaturen fra forrige.               */
function planDose(plan, gjaerPctTorr, masseKg, opt = {}) {
  let dose = 0, ekv = 0;
  let T = plan.length ? (plan[0].temp ?? plan[0].miljo) : 24;
  let Y = gjaerPctTorr;
  const trinn = [];

  const antall = Math.max(1, opt.antall || 1);

  for (const s of plan) {
    // Er deigen bakt ut, er det ett emne som kjøles — ikke hele batchen.
    const emneMasse = s.utbakt ? masseKg / antall : masseKg;
    const r = stageDose({
      timer: s.timer,
      gjaerPct: Y,
      T0: (s.temp !== undefined && s.temp !== null && trinn.length === 0) ? s.temp : T,
      miljo: s.miljo,
      masseKg: emneMasse,
      // Utbakte emner i hevekurv står åpent, ikke i tett lokkboks.
      lokk: s.utbakt ? false : (opt.lokk !== undefined ? opt.lokk : true),
      fulltKjol: !!opt.fulltKjol
    });
    trinn.push({ navn: s.navn, timer: s.timer, miljo: s.miljo, utbakt: !!s.utbakt, emneMasse, ...r, startTemp: T });
    dose += r.dose; ekv += r.ekvTimer; T = r.sluttTemp; Y = r.sluttGjaer;
  }
  return { dose, ekvTimer: ekv, sluttTemp: T, trinn };
}

/* ---------- Profil: den ekte kurven bak dosen ----------
   Returnerer punkter med øyeblikkelig gjæringsfart y(t)·R(T(t)) og akkumulert
   dose. Arealet under fart-kurven ER dosen. Brukes til grafene, slik at de
   viser den faktiske formen — ikke en rett strek gjennom hvert trinn.        */
function planProfil(plan, gjaerPctTorr, masseKg, opt = {}) {
  const antall = Math.max(1, opt.antall || 1);
  const pts = [];
  let T = plan.length ? (plan[0].temp ?? plan[0].miljo) : 24;
  let Y = gjaerPctTorr, tAkk = 0, doseAkk = 0;

  plan.forEach((s, si) => {
    const emneMasse = s.utbakt ? masseKg / antall : masseKg;
    const tau = tauHours(emneMasse, {
      lokk: s.utbakt ? false : (opt.lokk !== undefined ? opt.lokk : true),
      fulltKjol: !!opt.fulltKjol
    });
    const T0 = (s.temp !== undefined && s.temp !== null && si === 0) ? s.temp : T;
    const isoterm = Math.abs(T0 - s.miljo) < 0.05;
    const n = Math.max(40, Math.round(s.timer * 12));
    const dt = s.timer / n;
    let rateIntegral = 0, y = Y;

    for (let i = 0; i <= n; i++) {
      const t = i * dt;
      const temp = isoterm ? s.miljo : doughTempAt(t, T0, s.miljo, tau);
      const R = rateFactor(temp);
      if (i > 0) {
        const tMid = (i - 0.5) * dt;
        const tempMid = isoterm ? s.miljo : doughTempAt(tMid, T0, s.miljo, tau);
        const Rmid = rateFactor(tempMid);
        rateIntegral += Rmid * dt;
        y = yeastAt(tMid, Y, rateIntegral / Math.max(tMid, 1e-9));
        doseAkk += y * Rmid * dt;
      }
      pts.push({ t: tAkk + t, temp, R, fart: y * R, dose: doseAkk, trinn: si });
    }
    tAkk += s.timer;
    T = isoterm ? s.miljo : doughTempAt(s.timer, T0, s.miljo, tau);
    Y = y;
  });
  return pts;
}

/* ---------- Løs for gjær eller tid gitt en måldose ---------- */
function gjaerForDose(maalDose, plan, masseKg, opt = {}) {
  let lo = 0.0005, hi = 5.0;
  // 42 halveringer gir 12 desimalers presisjon på disse intervallene. De 70 som
  // stod her var ren sløsing: hver runde koster en full gjennomregning av planen,
  // og solverne kjøres et titalls ganger per tastetrykk.
  for (let i = 0; i < 42; i++) {
    const mid = (lo + hi) / 2;
    if (planDose(plan, mid, masseKg, opt).dose < maalDose) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/* Skalerer alle trinn proporsjonalt til dosen treffer målet. */
function tidsfaktorForDose(maalDose, plan, gjaerPct, masseKg, opt = {}) {
  let lo = 0.05, hi = 20;
  const skaler = f => plan.map(s => ({ ...s, timer: s.timer * f }));
  // 42 halveringer gir 12 desimalers presisjon på disse intervallene. De 70 som
  // stod her var ren sløsing: hver runde koster en full gjennomregning av planen,
  // og solverne kjøres et titalls ganger per tastetrykk.
  for (let i = 0; i < 42; i++) {
    const mid = (lo + hi) / 2;
    if (planDose(skaler(mid), gjaerPct, masseKg, opt).dose < maalDose) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/* Løser kun ETT trinns lengde (typisk bulken), resten låst. */
function timerForTrinn(maalDose, plan, idx, gjaerPct, masseKg, opt = {}) {
  let lo = 0.05, hi = 72;
  const med = h => plan.map((s, i) => i === idx ? { ...s, timer: h } : s);
  // 42 halveringer gir 12 desimalers presisjon på disse intervallene. De 70 som
  // stod her var ren sløsing: hver runde koster en full gjennomregning av planen,
  // og solverne kjøres et titalls ganger per tastetrykk.
  for (let i = 0; i < 42; i++) {
    const mid = (lo + hi) / 2;
    if (planDose(med(mid), gjaerPct, masseKg, opt).dose < maalDose) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/* ---------- Gjæromregning ---------- */
const GJAER_FRA_FERSK = { fersk: 1, torr: FERM.FERSK_TIL_TORR, aktiv: FERM.FERSK_TIL_AKTIV };
function gjaerKonverter(mengde, fra, til) {
  const somFersk = mengde / GJAER_FRA_FERSK[fra];
  return somFersk * GJAER_FRA_FERSK[til];
}
function tilTorrPct(pct, type) { return gjaerKonverter(pct, type, 'torr'); }

/* ---------- Måltall for heveprosent ----------
   Forankret i målt tabell (75 % hydrering, 90/10 hvete/fullkorn, 2 % salt). */
const RISE_ANKER = [[27, 30], [24, 50], [21, 75], [18, 100]];

function maalHeveProsent(deigTemp, o = {}) {
  const { hydrering = 0.75, grovAndel = 0.10, styrke = 'middels', etterKaldheving = false } = o;
  const p = RISE_ANKER;
  let base;
  if (deigTemp >= p[0][0]) base = p[0][1];
  else if (deigTemp <= p[p.length - 1][0]) base = p[p.length - 1][1];
  else {
    for (let i = 0; i < p.length - 1; i++) {
      const [t1, r1] = p[i], [t2, r2] = p[i + 1];
      if (deigTemp <= t1 && deigTemp >= t2) { base = r1 + (r2 - r1) * (deigTemp - t1) / (t2 - t1); break; }
    }
  }
  const hydJust  = 1 - 1.2 * (hydrering - 0.75);
  const grovJust = 1 - 0.7 * (grovAndel - 0.10);
  const styrkeJust = { 'svært svak': 0.78, 'svak': 0.85, 'svak-middels': 0.90, 'middels': 0.96, 'middels-sterk': 1.00, 'sterk': 1.05, 'ingen': 0.85, 'ukjent': 0.93 }[styrke] ?? 0.96;
  const maal = base * hydJust * grovJust * styrkeJust;
  // Ankertabellen er forankret på 75 % hydrering og 90/10 hvete/fullkorn — den
  // er ikke kalibrert for en ciabatta på 82 % ren sterk hvete. Formelen ga der
  // 45 % bulkstigning, mens fagteksten sier 70–80 %. Går deigen på kjøl etterpå
  // og ligger over 80 % hydrering, settes et gulv på 60 %.
  const gulv = (etterKaldheving && hydrering > 0.80) ? 60 : 18;
  return Math.max(gulv, maal);
}

/* ---------- Forferment ---------- */
function stivhetsMultiplikator(hydrering) {         // 1,0 ved ≥70 %, 2,5 ved 50 %
  return 1 + 1.5 * (0.70 - Math.min(hydrering, 0.70)) / 0.20;
}

/* Potensloven alene treffer den publiserte tabellen (23 °C: 12 t 0,11 % tørr,
   14 t 0,09, 16 t 0,07, 18 t 0,05) innenfor ca. 15 % over hele spennet.
   Her lå tidligere et ekstra ledd som halverte gjærmengden brått så snart
   modningstiden passerte 16 timer. Det gjorde to ting galt: det brøt med appens
   egen tabell ved 18 t (0,027 % mot 0,05 %), og det ga et sprang midt i et felt
   brukeren justerer i halvtimer — 16,0 t ga dobbelt så mye gjær som 16,5 t. */
function forfermentGjaerPct(timer, temp, o = {}) {
  const { hydrering = 1.0, type = 'torr' } = o;
  const tempJust = rateFactor(temp) / rateFactor(FERM.POOLISH_TREF);
  let ferskPct = (FERM.POOLISH_K / Math.pow(Math.max(timer, 1), FERM.POOLISH_N)) / tempJust;
  ferskPct *= stivhetsMultiplikator(hydrering);
  return gjaerKonverter(ferskPct, 'fersk', type);
}

/* ---------- Deigtemperatur: ekte varmebalanse ---------- */
const CP = { mel: 1.81, vann: 4.181, forferment100: 2.99, fro: 2.0 };
const FRIKSJON = { hand: 0.15, planet: 0.6, spiralHjemme: 0.4, spiralProff: 1.0 };

function vanntemperatur(o) {
  const {
    onsketDeigTemp, melGram, melTemp, vannGram,
    forfermentGram = 0, forfermentTemp = 20, forfermentHydrering = 1.0,
    froGram = 0, froTemp = 20,
    mikser = 'spiralHjemme', minutter = 8, friksjonPerMin = null
  } = o;

  const kg = g => g / 1000;
  const cpPref = forfermentHydrering >= 0.8 ? CP.forferment100
               : (CP.mel + forfermentHydrering * CP.vann) / (1 + forfermentHydrering);

  const Cmel  = kg(melGram) * CP.mel;
  const Cvann = kg(vannGram) * CP.vann;
  const Cpref = kg(forfermentGram) * cpPref;
  const Cfro  = kg(froGram) * CP.fro;
  const Csum  = Cmel + Cvann + Cpref + Cfro;

  const dTfriksjon = (friksjonPerMin ?? FRIKSJON[mikser]) * minutter;
  const Emiks = Csum * dTfriksjon;

  const Tvann = (onsketDeigTemp * Csum - Cmel * melTemp - Cpref * forfermentTemp - Cfro * froTemp - Emiks) / Cvann;

  return {
    vannTemp: Tvann,
    friksjonsOkning: dTfriksjon,
    cpDeig: Csum / (kg(melGram + vannGram + forfermentGram + froGram)),
    Csum
  };
}

/* ---------- Elting som ARBEID, ikke som minutter ----------
   Nesten all mekanisk energi mikseren tilfører ender som varme i deigen. Derfor
   er temperaturstigningen en gyldig måler på hvor mye arbeid du faktisk har lagt
   inn — og den eneste et hjemmekjøkken har.

   Omregningen: 1 Wh/kg = 3,6 kJ/kg, og deigens varmekapasitet er målt til
   2,8 kJ/kg·K. Det gir 1 Wh/kg ≈ 1,29 °C.

   Kryssjekk som gjør at man kan stole på tallet: Chorleywood-prosessen leverer
   målt 11 Wh/kg og gir en dokumentert deigtemperaturstigning på 14–15 °C.
   Modellen her gir 11 × 1,29 = 14,2 °C. Den treffer.

   Terskler (målt, Chin & Campbell 2005 og spiralmikserforsøk):
     ~2,2 Wh/kg   gluten så vidt utviklet (toppen på effektkurven)
     3–5 Wh/kg    «improved mix» — målsonen for åpen krumme
     ~8,3 Wh/kg   mekanisk utvikling metter seg; mer arbeid gir ikke mer nettverk
     11–13 Wh/kg  Chorleywood; her er krummen fin, jevn og hvit                 */
const ELTING = {
  GRAD_PER_WH: 1.29,     // °C deigtemperaturstigning per Wh/kg
  MAAL_LAV: 3.0,         // Wh/kg — nedre kant av improved mix
  MAAL_HOY: 5.0,         // Wh/kg — over dette går krummen fra åpen mot fin
  METNING: 8.3           // Wh/kg — mekanisk utvikling mettet
};

function arbeidWh(dT)      { return dT / ELTING.GRAD_PER_WH; }
function gradForArbeid(wh) { return wh * ELTING.GRAD_PER_WH; }

/* Isandel for å nå ønsket vanntemperatur fra springvann. */
function isAndel(springTemp, onsketVannTemp) {
  if (onsketVannTemp >= springTemp) return 0;
  const f = (springTemp - onsketVannTemp) / (79.9 + springTemp);
  return Math.min(Math.max(f, 0), 1);
}

/* Faktisk deigtemperatur hvis du bruker en gitt vanntemperatur. */
function faktiskDeigTemp(o, vannTemp) {
  const kg = g => g / 1000;
  const cpPref = (o.forfermentHydrering ?? 1) >= 0.8 ? CP.forferment100
               : (CP.mel + (o.forfermentHydrering ?? 1) * CP.vann) / (1 + (o.forfermentHydrering ?? 1));
  const Cmel  = kg(o.melGram) * CP.mel;
  const Cvann = kg(o.vannGram) * CP.vann;
  const Cpref = kg(o.forfermentGram || 0) * cpPref;
  const Cfro  = kg(o.froGram || 0) * CP.fro;
  const Csum  = Cmel + Cvann + Cpref + Cfro;
  const dT = (o.friksjonPerMin ?? FRIKSJON[o.mikser || 'spiralHjemme']) * (o.minutter ?? 8);
  return (Cmel * o.melTemp + Cvann * vannTemp + Cpref * (o.forfermentTemp ?? 20) + Cfro * (o.froTemp ?? 20) + Csum * dT) / Csum;
}

/* ---------- pH-estimat for ren gjærdeig ---------- */
function estimerPH(ekvTimer24) {
  const PH0 = 6.05, GULV = 5.20, K = 0.030;
  return GULV + (PH0 - GULV) * Math.exp(-K * ekvTimer24);
}

/* ---------- Maks kaldheving ---------- */
function maksKaldheving(kjolTemp, type) {
  const tabell = {            //  4 °C   6 °C   10 °C
    mager:      [72, 54, 24],
    fullkorn:   [48, 36, 18],
    rug:        [36, 28, 14],
    beriket:    [24, 18, 12]
  }[type] ?? [72, 54, 24];
  const xs = [4, 6, 10];
  if (kjolTemp <= xs[0]) return tabell[0];
  if (kjolTemp >= xs[2]) return tabell[2];
  const i = kjolTemp <= xs[1] ? 0 : 1;
  const f = (kjolTemp - xs[i]) / (xs[i + 1] - xs[i]);
  return tabell[i] + f * (tabell[i + 1] - tabell[i]);
}

/* ---------- Oppskriftsmatematikk ----------
   Konvensjon (samme som regnearket ditt):
     «Sum tørt» = alt mel, inkl. melet i forfermenten. Frø teller IKKE.
     Hydrering  = alt vann / sum tørt, inkl. vannet i forfermenten.
   I tillegg regner appen ut EFFEKTIV hydrering, der vannet frøene
   binder er trukket fra — det er den som forklarer hvordan deigen føles. */
function beregnOppskrift(inn) {
  const {
    melListe,              // [{id, pct}]
    froListe = [],         // [{id, gram, varmt}]
    hydrering,             // 0.75
    saltPct, honningPct = 0, oljePct = 0, sukkerPct = 0, smorPct = 0, maltPct = 0,
    gjaerPct, gjaerType,
    forferment,            // {bruk, type, pctMel, hydrering, timer, temp}
    antall, vektPerBrod,
    froVannPaaToppen = true
  } = inn;

  const flourById = id => FLOURS.find(f => f.id === id);
  const soakerById = id => SOAKERS.find(s => s.id === id);

  // Blandingens absorpsjonsfaktor og grovandel
  const pctSum = melListe.reduce((s, m) => s + m.pct, 0) || 100;
  let absFaktor = 0, grovAndel = 0, svakesteStyrke = 'sterk';
  // 'middels-sterk' MÅ stå her. Uten den falt Regal Hvetemel standard — appens
  // eget anbefalte hverdagsmel og basen i hele grovhetstrappa — til reserve-
  // verdien 3, altså LAVERE enn 'middels'. Appen rangerte da sitt sterkeste
  // dagligvaremel som svakere enn det den selv kaller svakere, og en ren
  // Regal-deig fikk advarsel om for svakt mel.
  const styrkeRang = { 'ingen': 0, 'svært svak': 1, 'svak': 2, 'svak-middels': 3, 'middels': 4, 'middels-sterk': 4.5, 'sterk': 5, 'ukjent': 3 };
  let minRang = 9;
  // styrkeVektet = Σ(andel × rang): blandingens samlede styrke. Hydrerings-
  // advarselen bruker denne, ikke svakesteStyrke — 20 % middels-sterkt mel i en
  // ellers sterk blanding skal ikke utløse «for svakt mel» på 82 % hydrering.
  let styrkeVektet = 0;
  melListe.forEach(m => {
    const f = flourById(m.id); if (!f) return;
    const andel = m.pct / pctSum;
    absFaktor += andel * f.absorpsjon;
    grovAndel += andel * f.grov;
    const r = styrkeRang[f.styrke] ?? 3;
    styrkeVektet += andel * r;
    if (r < minRang && andel >= 0.15) { minRang = r; svakesteStyrke = f.styrke; }
  });

  // Anbefalt hydrering justert for melblandingen
  const anbefaltHydrering = hydrering * absFaktor;

  // Total deigvekt = mål. Vi løser bakover for melmengden.
  const maalVekt = antall * vektPerBrod;

  const froGramTotal = froListe.reduce((s, f) => s + (f.gram || 0), 0);

  // Brødskala'n skiller korn fra frø. Gryn og kli av korn (havregryn, rugknekk,
  // byggflak, knekt hvete, hvetekli) er grovt mel i standardens forstand; frø og
  // nøtter faller helt utenfor brøken. Se brodskalan() over.
  const kornTillegg = froListe.reduce((s, f) => {
    const sk = soakerById(f.id);
    return s + (sk && sk.korn ? (f.gram || 0) : 0);
  }, 0);
  const froAbsorbert = froListe.reduce((s, f) => {
    const sk = soakerById(f.id); if (!sk) return s;
    return s + (f.gram || 0) * (f.varmt ? sk.varmt : sk.kaldt) / 100;
  }, 0);

  // Vekt per gram mel: 1 + hyd + salt + honning + olje + sukker + smør + malt
  // (frø kommer i tillegg som fast gram, sammen med vannet de skal ha)
  const perMel = 1 + hydrering + (saltPct + honningPct + oljePct + sukkerPct + smorPct + maltPct + gjaerPct) / 100;

  // Enten tar frøene vannet sitt fra den oppgitte hydreringen (regnearkets
  // konvensjon), eller det legges på toppen slik at deigen faktisk blir så våt
  // som tallet sier. Bare i det andre tilfellet tilfører frøene vekt utover
  // sin egen tørrvekt — ellers ligger vannet deres allerede i hydreringen.
  const froEkstraVann = froVannPaaToppen ? froAbsorbert : 0;
  const froMedVann = froGramTotal + froEkstraVann;
  const melTotal = Math.max(0, (maalVekt - froMedVann) / perMel);

  const vannTotal = melTotal * hydrering + froEkstraVann;
  const salt    = melTotal * saltPct / 100;
  const honning = melTotal * honningPct / 100;
  const olje    = melTotal * oljePct / 100;
  const sukker  = melTotal * sukkerPct / 100;
  const smor    = melTotal * smorPct / 100;
  const malt    = melTotal * maltPct / 100;

  // Honning og smør bærer vann
  const honningVann = honning * 0.171;
  const smorVann    = smor * 0.16;

  // Melfordeling
  const mel = melListe.map(m => {
    const f = flourById(m.id);
    const gram = melTotal * m.pct / pctSum;
    return { id: m.id, navn: f ? f.navn : m.id, pct: m.pct / pctSum * 100, gram, kr: f ? f.kr : 0, kost: f ? gram / 1000 * f.kr : 0, notat: f ? f.notat : '' };
  });

  // Frø. Ukjent id (f.eks. fra eldre lagret tilstand) må ikke velte hele
  // beregningen — raden nulles og vises med id-en som navn.
  const fro = froListe.map(f => {
    const sk = soakerById(f.id);
    if (!sk) return { id: f.id, navn: f.id, gram: f.gram || 0, varmt: !!f.varmt, bloetleggVann: 0, hellVann: 0, kost: 0, notat: '' };
    const bloet = (f.gram || 0) * (f.varmt ? sk.varmt : sk.kaldt) / 100;
    // Skålding (varmt): hell nøyaktig det som bindes — alt skal med i deigen,
    // for det er skåldevannet som bærer sukkerartene og den forklistrede
    // stivelsen. 1,85× med avhelling gjelder bare kaldbløt.
    return {
      id: f.id, navn: sk.navn, gram: f.gram || 0, varmt: !!f.varmt,
      bloetleggVann: bloet, hellVann: f.varmt ? bloet : bloet * 1.85,
      kost: (f.gram || 0) / 1000 * sk.kr, notat: sk.notat
    };
  });

  // Forferment
  let ff = null;
  if (forferment && forferment.bruk) {
    const ffMel = melTotal * forferment.pctMel / 100;
    const ffVann = ffMel * forferment.hydrering / 100;
    const ffGjaerPct = forfermentGjaerPct(forferment.timer, forferment.temp, {
      hydrering: forferment.hydrering / 100, type: gjaerType
    });
    const ffGjaer = ffMel * ffGjaerPct / 100;
    ff = {
      type: forferment.type, pctMel: forferment.pctMel, hydrering: forferment.hydrering,
      timer: forferment.timer, temp: forferment.temp,
      mel: ffMel, vann: ffVann, gjaer: ffGjaer, gjaerPctAvFfMel: ffGjaerPct,
      salt: ffMel * 0.0015,                       // 0,15 % mot proteaseoppløsning
      total: ffMel + ffVann + ffGjaer,
      brukTidligst: Math.max(1, forferment.timer - 2),
      brukSenest: forferment.timer + 3,
      hardtTak: forferment.timer + 5
    };
  }

  // Gjær i hoveddeigen
  const gjaerTotal = melTotal * gjaerPct / 100;
  const gjaerHoved = Math.max(0, gjaerTotal - (ff ? ff.gjaer : 0));

  // Vann i hoveddeigen. Alt vann som ligger et annet sted enn i bollen må trekkes
  // fra: forfermentens vann, vannet honning og smør bærer med seg — og vannet
  // frøene har sugd til seg i bløtlegget. Frøvannet er poenget her: det står
  // allerede i vannTotal, så teller man det ikke ut igjen, får bakeren beskjed om
  // å helle det to ganger. Det gjelder begge konvensjonene: legges frøvannet på
  // toppen, er det ekstra vann som aldri skulle vært i bollen; tas det fra
  // hydreringen, er det vann deigen har gitt fra seg til frøene.
  const froVannHelles = fro.reduce((s, f) => s + f.hellVann, 0);
  const vannHovedRaa = vannTotal - (ff ? ff.vann : 0) - honningVann - smorVann - froAbsorbert;
  // Negativt vann er ikke en mengde, det er en umulig oppskrift: forfermenten
  // inneholder mer vann enn hele deigen skal ha (poolish over ~70 % av melet
  // ved 70 % hydrering). Klemmes til 0 og flagges, på samme måte som gjaerHoved.
  const vannHoved = Math.max(0, vannHovedRaa);
  const vannUnderskudd = Math.max(0, -vannHovedRaa);

  // Vannet frøene binder ligger allerede i vannTotal, så her teller bare tørrvekten.
  const totalVekt = melTotal + vannTotal + salt + honning + olje + sukker + smor + malt + gjaerTotal + froGramTotal;

  // Kostnad
  const melKost = mel.reduce((s, m) => s + m.kost, 0);
  const froKost = fro.reduce((s, f) => s + f.kost, 0);
  const annenKost = salt / 1000 * 10 + honning / 1000 * 120 + olje / 1000 * 90
                  + sukker / 1000 * 22 + smor / 1000 * 90 + malt / 1000 * 200
                  + gjaerTotal / 1000 * (gjaerType === 'fersk' ? 60 : 250);
  const totalKost = melKost + froKost + annenKost;

  // Effektiv hydrering: vannet frøene binder er ikke tilgjengelig for deigen
  const effektivHydrering = (vannTotal - froAbsorbert) / melTotal;

  return {
    melTotal, vannTotal, totalVekt,
    mel, fro, forferment: ff,
    salt, honning, olje, sukker, smor, malt,
    honningVann, smorVann,
    gjaerTotal, gjaerHoved, gjaerType,
    vannHoved, vannUnderskudd, froVannHelles, froAbsorbert,
    // Overskuddet du heller av etter KALDBLØT. Kalde frø skal stå i rikelig vann
    // (~1,85× det de binder) for at ingen kjerner blir tørre, men bare det de
    // binder følger med i deigen — resten helles av. Skåldede frø bidrar ikke
    // hit: der helles nøyaktig det som bindes, og alt går i deigen.
    froVannOverskudd: froVannHelles - froAbsorbert,
    hydrering, effektivHydrering, anbefaltHydrering, absFaktor, froVannPaaToppen,
    oppgittHydrering: vannTotal / melTotal,
    grovAndel, svakesteStyrke, styrkeVektet,
    // Frø er ikke mel. De bygger ikke gluten, men de fortynner nettverket og
    // stjeler vann. Derfor flere ulike «grovhets»-tall som ofte forveksles —
    // og som betyr helt forskjellige ting:
    froAndel: froGramTotal / Math.max(melTotal, 1),                       // frø i % av mel (bakerprosent)
    grovMelAndel: grovAndel,                                             // grovt MEL som andel av melet
    kornTillegg,                                                          // gryn og kli av korn, i gram
    // OFFISIELL grovhet etter norsk standard. Frø holdes utenfor, korngryn
    // teller med. Dette er tallet som svarer til merkingen i butikk.
    brodskala: brodskalan(grovAndel * melTotal, melTotal, kornTillegg),
    // Strukturfortynning: hvor stor del av alt tørrstoffet som ikke bygger
    // glutennettverk. Dette er IKKE grovhet — frøene teller fullt her, fordi
    // de fortynner nettverket selv om Brødskala'n ser bort fra dem. Det er
    // dette tallet som forklarer hvor tett brødet oppleves.
    fortynnetAndel: (grovAndel * melTotal + froGramTotal) / Math.max(melTotal + froGramTotal, 1),
    // ⚠ UTGÅTT ALIAS for fortynnetAndel. Het «Grovhet totalt» i grensesnittet og
    // var det ikke — frøene lå i både teller og nevner, i strid med Brødskala'n.
    // Beholdt bare så gammel lagret tilstand og bakelogg ikke brekker.
    // Bruk `brodskala.pct` for grovhet og `fortynnetAndel` for strukturfortynning.
    grovTotal: (grovAndel * melTotal + froGramTotal) / Math.max(melTotal + froGramTotal, 1),
    glutenbaerende: (1 - grovAndel) * melTotal / Math.max(melTotal + froGramTotal, 1),
    antall, vektPerBrod,
    kost: { mel: melKost, fro: froKost, annet: annenKost, total: totalKost, perBrod: totalKost / Math.max(antall, 1) },
    masseKg: totalVekt / 1000
  };
}

/* ---------- BRØDSKALA'N — den norske grovhetsstandarden ----------
   Kilde: Brødskala'n, eid av Baker- og Konditorbransjens Landsforening (BKLF),
   utarbeidet 2006 av NHO Mat og Drikke og BKLF, sist revidert 2017.
   https://brodogkorn.no/fakta/brodskalaen/

   Regnestykket er ordningens eget, og det er tre ting ved det som er lette å
   ta feil av — appen tok feil av alle tre før 29.07.2026:

   1. NEVNEREN ER MELMENGDEN, ikke deigen og ikke tørrstoffet. Vann, salt,
      gjær, honning og olje er ikke med i brøken i det hele tatt.
   2. FRØ OG NØTTER TELLER IKKE. Verken i telleren eller nevneren. Et brød med
      30 % solsikke er ikke ett prosentpoeng grovere enn det samme brødet uten.
      Appen la tidligere frøene rett i telleren OG nevneren, som ga et tall som
      så ut som en grovhetsprosent, het «grovhet», og ikke var det.
   3. GRYN OG KLI AV KORN TELLER FULLT. Havregryn, rugknekk, byggflak, knekt
      hvete og hvetekli er korn, ikke frø, og hører hjemme i telleren — selv om
      de i denne appen ligger i SOAKERS sammen med frøene. Det er nettopp
      derfor SOAKERS har et `korn`-felt.

   Grensene er ordningens egne, oppgitt med desimal:
     Fint 0–25,9 · Halvgrovt 26–50,9 · Grovt 51–75,9 · Ekstra grovt 76–100.   */
const BRODSKALAN = [
  { grense: 25.9,  klasse: 'Fint brød',          kort: 'Fint',        biter: 1 },
  { grense: 50.9,  klasse: 'Halvgrovt brød',     kort: 'Halvgrovt',   biter: 2 },
  { grense: 75.9,  klasse: 'Grovt brød',         kort: 'Grovt',       biter: 3 },
  { grense: 100.1, klasse: 'Ekstra grovt brød',  kort: 'Ekstra grovt', biter: 4 }
];

function brodskalanKlasse(pct) {
  return BRODSKALAN.find(b => pct <= b.grense) || BRODSKALAN[BRODSKALAN.length - 1];
}

/* melTotal/grovMel i gram, kornTillegg = gryn og kli av korn i gram. */
function brodskalan(grovMelGram, melTotal, kornTillegg = 0) {
  const nevner = melTotal + kornTillegg;
  const pct = nevner > 0 ? (grovMelGram + kornTillegg) / nevner * 100 : 0;
  const k = brodskalanKlasse(pct);
  return { pct, klasse: k.klasse, kort: k.kort, biter: k.biter,
           // Nøkkelhullet krever minst 30 % fullkorn av tørrstoffet i korndelen
           // (Veileder til nøkkelhullsforskriften, Mattilsynet, revidert 2021).
           // Feltet heter fullkorn, ikke nokkelhull, fordi ordningen i tillegg
           // stiller krav til salt, fiber, sukker og fett — dem har appen ikke
           // tallene til å vurdere. Et brød på 2,0 % salt ryker trolig på
           // saltkravet selv om fullkornandelen holder.
           nokkelhullFullkorn: pct >= 30 };
}

/* ---------- OVNSLØFT-INDEKS (L-01 + L-14) ----------
   Én samlet størrelse 0–100 for hvor mye ovnsløft du kan vente. Før fantes den
   ikke i appen — bare `TIDSPLANER[].ovnslos` og spredte kostnader — og designets
   interpolasjon lot forfermenten være HELT UTENFOR (L-14): en biga på 30 % endret
   ikke tallet med ett poeng.

   Modellen er MULTIPLIKATIV, ikke addisjon av løse poeng. Grunnen er at kildene
   selv er prosenter: GROVHET-tekstene sier «25–35 % lavere», TILLEGG_EFFEKT.fro
   er en relativ verdi mot 100, og forfermentens reelle effekt er ±% på volumet.
   Da er et produkt av faktorer mer trofast enn å trekke fra poeng.

     loft = ovnslosBasis(plan) · grovFaktor · froFaktor · hydFaktor · ffFaktor

   Rangorden (GUIDE Del 1): hevegrad, bunnvarme, damp og hydrering EIER løftet;
   gjæraktivitet er 2–5 %. Derfor er ffFaktor bundet til ~±5 %, og verken
   forferment eller surdeig kan eie toppen. Basisen er normalisert (se TIDSPLANER
   i data.js) så plan- og forfermentvalg ikke teller samme gevinst to ganger. */

/* Grovhetens løfttap. Konveks kurve forankret i GROVHET-tekstene i data.js
   (10 % ~uendret · 25 % 5–10 % · 40 % 25–35 % · 60 % 40–50 % · 80 % 55–65 %),
   ikke designets mildere lineære formel som underpenaliserer systematisk.
   Tallene «baker inn» at appens grove blandinger inneholder rug (bryterned) —
   en ren rug-fri grovblanding taper mindre; en framtidig forbedring er å vekte
   med FLOURS[].glutenbidrag i stedet for grovandel alene.                     */
const LOFT_GROV = { pct: [0, 10, 25, 40, 60, 80, 100], tap: [0, 3, 8, 30, 45, 60, 68] };
function grovLoftFaktor(grovPct) {
  return 1 - interp(LOFT_GROV.pct, LOFT_GROV.tap, grovPct) / 100;
}

/* Frøenes løfttap fra de MÅLTE dose–responskurvene (TILLEGG_EFFEKT.fro,
   Aldawsari & Simsek 2014). Bløtlagte frø koster mindre løft enn tørre — begge
   kurver er relative til 100. `tortFrak` er andelen av frøvekten som ligger
   tørt/ristet i deigen (default 0: appen bløtlegger som standard).            */
function froLoftFaktor(froPct, tortFrak = 0) {
  if (froPct <= 0) return 1;
  const e = TILLEGG_EFFEKT.fro;
  const fB = interp(e.pct, e.loftBloet, froPct);
  const fT = interp(e.pct, e.loftTort, froPct);
  return (fB * (1 - tortFrak) + fT * tortFrak) / 100;
}

/* Hydreringens løfteffekt. Damp er ~halve løftet, så mer vann hjelper — helt til
   melets tak, der deigen flyter ut sidelengs i stedet for å reise seg. Vindu
   68–78 % er fullt; under det blir deigen strammere med mindre damp, over melets
   tak kollapser løftet. `tak` er melblandingens hydreringstak i prosent.       */
function hydLoftFaktor(hydPct, tak = 82) {
  if (hydPct < 68) return 1 - 0.010 * (68 - hydPct);
  if (hydPct <= 78) return 1;
  if (hydPct <= tak) return 1 - 0.006 * (hydPct - 78);
  return 1 - 0.006 * (tak - 78) - 0.020 * (hydPct - tak);
}

/* Forfermentens løftfaktor. `loftBase`/`refAndel`/`syre` kommer fra FF_TYPER.
   Gevinsten skalerer med melandelen. To bakefaglige korreksjoner:
   1) Biga bygger STYRKE. På allerede sterkt mel (W300+, styrkeVektet > 4,5)
      mangler du ikke styrke men EKSTENSIBILITET, så bigas fortrinn krymper og
      poolish kan gå forbi — nettopp ciabatta-tilfellet.
   2) Surdeig (`syre`) har et tak under bigas optimum og et syreledd: går
      byggingen for lenge, degraderer syren glutenet og løftet SYNKER.
   `ekvTimer` = 24°-ekvivalente gjæringstimer for hele planen.                 */
function ffLoftFaktor(ffType, andel, styrkeVektet = 4.0, ekvTimer = 0) {
  const t = ffTypeFor(ffType);
  if (!t || t.id === 'ingen' || andel <= 0 || !t.refAndel) return 1;
  let base = t.loftBase * (andel / t.refAndel);
  if (t.id === 'biga' && styrkeVektet > 4.5) {
    base -= 2.0 * (styrkeVektet - 4.5) / 0.5;   // svinner mot ~+3 på rent W300+-mel
  }
  base = Math.max(0, base);
  if (t.syre) {
    base = Math.min(base, 3.0);                 // surdeig eier aldri toppen
    if (ekvTimer > 20) base -= Math.min(5.0, 0.4 * (ekvTimer - 20)); // oversurt → degraderer
  }
  return 1 + base / 100;
}

/* Samler leddene til den endelige indeksen. Returnerer også hvert ledd separat,
   slik at UI-et kan vise «hva dette koster / gir» i poeng uten å regne på nytt.
   Klemt til 20–100: 100 er referansemaks (loff, sterkt siktet mel, optimal plan,
   biga), og under 20 er tallet uansett ikke informativt.                       */
function loftIndeks(o) {
  const {
    plan, grovPct = 0, froPct = 0, tortFrak = 0, hydPct = 75, tak = 82,
    ffType = 'ingen', ffAndel = 0, styrkeVektet = 4.0, ekvTimer = 0
  } = o;
  const basis = (plan && (plan.ovnslosBasis ?? plan.ovnslos)) || 82;
  const fGrov = grovLoftFaktor(grovPct);
  const fFro  = froLoftFaktor(froPct, tortFrak);
  const fHyd  = hydLoftFaktor(hydPct, tak);
  const fFf   = ffLoftFaktor(ffType, ffAndel, styrkeVektet, ekvTimer);
  const raa = basis * fGrov * fFro * fHyd * fFf;
  const loft = Math.round(Math.max(20, Math.min(100, raa)));
  return {
    loft, basis, raa,
    faktor: { grov: fGrov, fro: fFro, hyd: fHyd, ff: fFf },
    // Poeng tapt/vunnet mot basis, til «hva dette koster»-visningen.
    tap: {
      grov: basis * (1 - fGrov),
      fro:  basis * fGrov * (1 - fFro),
      hyd:  basis * fGrov * fFro * (1 - fHyd),
      ff:   basis * fGrov * fFro * fHyd * (fFf - 1)   // positivt = gevinst
    }
  };
}

/* ---------- MÅLDOSE for gjæringsgrad ----------
   Flyttet hit fra app.js (V1) så regn() kan være en ren motorfunksjon.
   ⚠ L-04 / PARAMETERREVISJON: leddet `0,40 × grovAndel` er det ENESTE ukildede
   tallet i en ellers grundig kildet formel, og det betyr mer etter at
   grovhetstrappa går til 80 %. Står urørt til Bjørn kalibrerer det mot egne bak
   — det skal ikke gjettes bort. Forfermenten senker måldosen (mindre gjær i
   hoveddeigen) fordi en del av gjæringsarbeidet alt er gjort.                  */
function maalDoseFor(grovAndel, pff = 0) {
  return (2.30 - 0.40 * grovAndel) * (1 - 0.6 * pff);
}

/* ---------- GROVHET (kontinuerlig) → MELBLANDING (L-03) ----------
   Mobil-V2 har en kontinuerlig grovhets-skyver 0–100, mens GROVHET-trinnene er
   standardens dokumenterte ankre (0/10/25/40/60/80). Her interpoleres hver
   melkomponent mellom de to nærmeste ankrene: union av mel-id-er, manglende id
   teller 0 %, resultatet renormaliseres til 100. Lander skyveren på et anker,
   får du NØYAKTIG det trinnets blanding — så en bruker som kommer fra et forvalg
   ser sin egen blanding, og dialen eier verdien når den flyttes (Bjørns valg i
   L-03). Utenfor endepunktene klippes det til ytterste trinn.                  */
function melblandingForGrov(grov) {
  const trinn = GROVHET.map(g => ({ grov: parseFloat(g.kort), mel: g.mel }))
                       .sort((a, b) => a.grov - b.grov);
  if (grov <= trinn[0].grov) return trinn[0].mel.map(m => ({ ...m }));
  const siste = trinn[trinn.length - 1];
  if (grov >= siste.grov) return siste.mel.map(m => ({ ...m }));
  let lo = trinn[0], hi = siste;
  for (let i = 0; i < trinn.length - 1; i++) {
    if (grov >= trinn[i].grov && grov <= trinn[i + 1].grov) { lo = trinn[i]; hi = trinn[i + 1]; break; }
  }
  const f = (grov - lo.grov) / (hi.grov - lo.grov);
  const ids = [...new Set([...lo.mel, ...hi.mel].map(m => m.id))];
  const pctOf = (arr, id) => (arr.find(m => m.id === id) || {}).pct || 0;
  const blad = ids.map(id => ({ id, pct: pctOf(lo.mel, id) * (1 - f) + pctOf(hi.mel, id) * f }))
                  .filter(m => m.pct > 0.05);
  const sum = blad.reduce((s, m) => s + m.pct, 0) || 100;
  return blad.map(m => ({ id: m.id, pct: m.pct / sum * 100 }));
}

/* tillegg {id: pct} → froListe [{id, gram, varmt}] + smak-parametre.
   `type:'fro'` blir frø med gram = melTotal · pct/100 (fikspunkt løses i regn()),
   `type:'smak'` skrives til sitt `felt` (honningPct, maltPct, oljePct …).
   `varmt` = skålding, fra TILLEGG-flagget eller SOAKERS.type === 'varmt'.       */
function tilleggOppdelt(tillegg, melTotal) {
  const froListe = [], smak = {};
  Object.keys(tillegg || {}).forEach(id => {
    const pct = tillegg[id]; if (!(pct > 0)) return;
    const t = TILLEGG.find(x => x.id === id); if (!t) return;
    if (t.type === 'smak' && t.felt) { smak[t.felt] = pct; return; }
    const sk = SOAKERS.find(s => s.id === id);
    // Skålding (behandling 'skald') bruker varm absorpsjon; rist og kaldbløt
    // bruker kald. `behandling` er kilden — `varmt`-flagget avledes av den.
    const varmt = !!t.varmt || (sk && (sk.behandling === 'skald' || sk.type === 'varmt'));
    froListe.push({ id, gram: melTotal * pct / 100, varmt });
  });
  return { froListe, smak };
}

/* ---------- regn(state): DEN RENE MODELLFUNKSJONEN ----------
   Tar den flate mobiltilstanden og returnerer alt avledet i ett objekt. Ingen
   globaler, ingen DOM — så den kan testes og kalles fra hvilken som helst skjerm
   uansett rekkefølge (viktig for skjermrekkefølgen brød → deig → tid: deigen
   regnes mot gjeldende/standard plan, og alt regnes om når planen endres).

   Porta fra V1s byggOppskrift(), gjort ren, med tre tillegg: kontinuerlig grov →
   blanding (L-03), tillegg{id:pct} → froListe, og loftIndeks() (L-01/L-14).
   Gjæren løses ALLTID numerisk mot måldosen (L-02) — aldri fra en tabell.       */
const GJAER_TAK_TORR = 0.833;   // 2,5 % fersk; over dette: gjærsmak og dårlig løft

function regn(state) {
  const bt = BROTYPER.find(b => b.id === state.brotype) || BROTYPER[0];
  const plan = TIDSPLANER.find(t => t.id === state.tid)
            || TIDSPLANER.find(t => t.id === 'lang') || TIDSPLANER[0];
  const preset = bt.rute === 'preset' ? PRESETS.find(p => p.id === bt.preset) : null;

  // Melblanding: preset låser sin egen; bygg-ruta utleder av grov-skyveren.
  const melListe = preset ? preset.mel.map(m => ({ ...m })) : melblandingForGrov(state.grov ?? 40);

  // Hydrering og salt: preset eier sine, ellers brukerens valg.
  const hyd = (preset ? preset.hydrering : (state.hyd ?? 75)) / 100;
  const saltPct = preset ? preset.salt : (state.saltPct ?? 1.8);

  // Forferment: TYPEN eies av valget, TIDSPLANEN (timer, andel) av planen.
  const ffT = ffTypeFor(state.ffType);
  const ffPaa = !!state.ff && ffT.id !== 'ingen';
  const pf = plan.forferment || {};
  const forferment = {
    bruk: ffPaa, type: ffT.id,
    pctMel: pf.pctMel || ffT.pctMel,
    hydrering: ffT.hyd || pf.hydrering || 100,
    timer: pf.timer || ffT.timer,
    temp: pf.temp || ffT.temp || 21
  };

  // Frøgram avhenger av melTotal og melTotal av frøgram. Det er en AFFIN likning,
  // ikke en som skal itereres: naiv Picard-iterasjon DIVERGERER når frølasten er
  // tung (teknisk review, kritisk — ga melTotal = 0 og NaN i hele oppskriften).
  // g(m) = beregnOppskrift(froListe(m)).melTotal er affin i m, så to evalueringer
  // gir det eksakte fikspunktet m* = a/(1+b), med beregnOppskrift selv som eneste
  // kilde (ingen duplisert perMel-formel som kan komme i utakt med motoren).
  const smak = tilleggOppdelt(state.tillegg, 1).smak;
  const oppskrift = (gjaerPct, mFro) => beregnOppskrift({
    melListe, froListe: tilleggOppdelt(state.tillegg, mFro).froListe,
    hydrering: hyd, saltPct, ...smak,
    gjaerPct, gjaerType: 'torr', forferment,
    antall: state.antall || 1, vektPerBrod: state.vekt || 900,
    froVannPaaToppen: state.froVannPaaToppen !== false
  });
  const losMel = (gjaerPct) => {
    const a = oppskrift(gjaerPct, 0).melTotal;      // g(0)
    const g1 = oppskrift(gjaerPct, a).melTotal;     // g(a)
    const b = a > 0 ? (a - g1) / a : 0;             // g(m) = a − b·m
    return a / (1 + b);                             // fikspunkt
  };
  let r = oppskrift(0.3, losMel(0.3));

  // Gjæren løses numerisk mot måldosen (L-02), med tak og underskudd-flagg.
  const planTrinn = plan.plan.map(s => ({ ...s }));
  if (planTrinn.length) planTrinn[0].temp = state.startTemp ?? 24;
  const pff = ffPaa ? forferment.pctMel / 100 : 0;
  const maalDose = maalDoseFor(r.grovMelAndel, pff);
  const opt = { lokk: !!state.lokk, fulltKjol: !!state.fulltKjol, antall: state.antall || 1 };
  let torr = gjaerForDose(maalDose, planTrinn, r.masseKg, opt), gjaerUnderskudd = 0;
  if (torr > GJAER_TAK_TORR) {
    torr = GJAER_TAK_TORR;
    gjaerUnderskudd = 1 - planDose(planTrinn, torr, r.masseKg, opt).dose / maalDose;
  }

  // Endelig oppskrift: løs melmengden på nytt med riktig gjær, så beregn.
  r = oppskrift(torr, losMel(torr));
  const doseProfil = planDose(planTrinn, torr, r.masseKg, opt);

  // Stekeprofil: brukerens valg, ellers presetets, ellers første profil.
  const prof = BAKE_PROFILES.find(p => p.id === state.stekeProfil)
            || (preset && BAKE_PROFILES.find(p => p.id === preset.steking))
            || BAKE_PROFILES[0];

  // Deigtemp: ekte varmebalanse (samme motor som Deigtemp-skjermen). Vannet i
  // hoveddeigen, melet utenom forfermenten, forfermenten og frøene veies hver
  // for seg — det er nettopp derfor 3-faktorformelen bommer på våte deiger.
  const eltMin = state.eltMin || 13;
  const melIHoved = r.melTotal - (r.forferment ? r.forferment.mel : 0);
  const froGramTot = r.froAbsorbert + r.fro.reduce((s, f) => s + (f.gram || 0), 0);
  const dt = vanntemperatur({
    onsketDeigTemp: state.startTemp ?? 24,
    melGram: melIHoved, melTemp: state.melTemp ?? 21,
    vannGram: Math.max(r.vannHoved, 1),
    forfermentGram: r.forferment ? r.forferment.total : 0,
    forfermentTemp: r.forferment ? r.forferment.temp : 20,
    forfermentHydrering: r.forferment ? r.forferment.hydrering / 100 : 1,
    froGram: froGramTot, froTemp: state.melTemp ?? 21,
    mikser: state.maskin || 'spiralHjemme', minutter: eltMin
  });

  // Løftindeks. Frø-leddet teller BARE ekte frø (ikke korn) — korn ligger
  // allerede i grovheten (brodskala), så å telle dem her ville vært dobbelt.
  // `tortFrak` = andelen av frøvekten som ristes tørt (behandling 'rist'):
  // ristede frø koster mer løft enn bløtlagte (TILLEGG_EFFEKT.loftTort).
  let froW = 0, tortW = 0;
  r.fro.forEach(f => {
    const sk = SOAKERS.find(x => x.id === f.id) || {};
    if (sk.korn) return;
    froW += f.gram || 0;
    if (sk.behandling === 'rist') tortW += f.gram || 0;
  });
  const froPctEkte = froW / Math.max(r.melTotal, 1) * 100;
  const tortFrak = froW > 0 ? tortW / froW : 0;
  // Hydreringstaket følger melblandingens styrke: sterkt mel tåler mer vann før
  // deigen flyter ut. Var hardkodet 82 uansett blanding (teknisk review #6).
  const tak = Math.max(72, Math.min(88, 74 + (r.styrkeVektet - 3) * 6));
  const loft = loftIndeks({
    plan, grovPct: r.brodskala.pct, froPct: froPctEkte, tortFrak,
    hydPct: hyd * 100, tak,
    ffType: ffT.id, ffAndel: pff,
    styrkeVektet: r.styrkeVektet, ekvTimer: doseProfil.ekvTimer
  });

  return {
    ...r,
    // NB: `r.forferment` er beregnOppskrifts BEREGNEDE forferment (med mel/vann/
    // gjær-mengder) — det må IKKE overskrives av input-spesifikasjonen `forferment`.
    // Input-spec-en eksponeres separat som `ffInn` for plan-koblingsvisningen.
    bt, plan, preset, planTrinn,
    ffT, ffPaa, ffInn: forferment,
    hyd, saltPct,
    gjaerTorr: torr, maalDose, gjaerUnderskudd,
    doseProfil, loft,
    prof, eltMin, vannTemp: dt.vannTemp, friksjon: dt.friksjonsOkning, wh: dt.friksjonsOkning / ELTING.GRAD_PER_WH,
    melListe
  };
}

/* ---------- kjede(state, r): STEGKJEDEN som ren funksjon ----------
   Bygger hele bakekjeden av regn()-resultatet, regnet BAKOVER fra ferdig stekt
   (stekingen er det faste punktet). Løser flere logikksaker samtidig:
   - L-10: total tid er ALLTID siste stegs slutt minus første stegs start, lest
     ut av kjeden — aldri en parallell sum.
   - L-13: stegene bærer sin egen regnede varighet; ingen fast «26–34 t»-etikett.
   - L-09: gjæringsandelen per trinn leses av doseProfil.trinn[i].dose / total,
     aldri en konstant — så en plan med kaldt trinn får riktig varm/kald-fordeling.
   - L-07: ett steg per BEHANDLING (rist / kaldbløt / skåld), ikke ett felles
     frøsteg — prosessene motarbeider hverandre.
   - L-12: hvert tall vises ÉN gang per steg; konstanter står i parentes.

   `ferdigMs` er ønsket ferdig-tidspunkt i ms (Date). Utelatt: en fast referanse,
   så tidene finnes for testing — totaltiden er uansett uavhengig av den.        */
const KALDGRENSE = 12;        // °C — skillet kaldt/varmt miljø (L-04: var hardkodet)
const KJEDE = { UTBAK: 45, ELT: 75, PREP: 30, RIST: 15, FORM: 25 };  // faste stegvarigheter (min)
const REF_FERDIG = Date.UTC(2026, 6, 30, 15, 0, 0);        // deterministisk testreferanse

function forstTall(s) { const m = String(s).match(/\d+/); return m ? +m[0] : null; }

function kjede(state, r, ferdigMs) {
  const prof = r.prof;
  const antall = state.antall || 1;
  const stekeMin = forstTall(prof.tid) || 45;
  const forvarmMin = FORVARM_MIN[prof.id] || 60;

  const ferdig = new Date(ferdigMs != null ? ferdigMs : REF_FERDIG);
  const minus = (d, min) => new Date(d.getTime() - min * 60000);
  const kl = d => klokke(d);

  const trinn = r.planTrinn;
  const doseTr = r.doseProfil.trinn || [];
  const doseSum = r.doseProfil.dose || 1;

  // Første trinn som er utbakt = når emnet må være ferdig FORMET. Formingen
  // (forforming → benkehvile → forming) skjer rett FØR det, og etter siste
  // gjæringstrinn gjenstår da bare temperering + kaldt snitt — IKKE en ny 45-min
  // romheving, som ville omformet et ferdig kaldhevet emne og degassert
  // blæreskinnet (baker-review, kritisk). Er ingen trinn utbakt (bulk i boks),
  // er «Bak ut og la hvile» rett, og gjør formingen der.
  const formIdx = trinn.findIndex(t => t.utbakt);
  const sisteUtbakt = trinn.length > 0 && trinn[trinn.length - 1].utbakt;
  const POSTPROOF = sisteUtbakt ? 30 : KJEDE.UTBAK;   // temperer+snitt vs bak-ut-og-hvile

  // Ankerpunkter bakover fra ferdig.
  const innsetting = minus(ferdig, stekeMin);
  const postStart = minus(innsetting, POSTPROOF);
  const forvarmStart = minus(innsetting, forvarmMin);

  // Gjæringstrinnene regnes bakover fra etterstek-steget. Vi ITERERER planens
  // trinn i stedet for å anta «bulk + kald», så L-09 blir riktig uansett antall
  // trinn — og skyter formingssteget inn foran det første utbakte trinnet.
  const trinnTider = [];
  let formTid = null;
  let peker = new Date(postStart);
  for (let i = trinn.length - 1; i >= 0; i--) {
    const slutt = new Date(peker);
    const start = minus(slutt, (trinn[i].timer || 0) * 60);
    trinnTider[i] = { start, slutt };
    peker = start;
    if (i === formIdx) {
      formTid = { start: minus(peker, KJEDE.FORM), slutt: new Date(peker) };
      peker = formTid.start;
    }
  }
  const eltStart = minus(peker, KJEDE.ELT);
  const prepStart = minus(eltStart, KJEDE.PREP);

  const steg = [];

  // 1 · Forferment (bare hvis på)
  if (r.ffPaa && r.forferment) {
    const ff = r.forferment;
    const ffStart = minus(eltStart, ff.timer * 60);
    steg.push({
      id: 'ff', navn: 'Sett ' + r.ffT.navn.toLowerCase() + 'en', tid: ffStart, varighet: ff.timer * 60, tone: 'noytral',
      hoved: gram(ff.mel), hovedNote: 'mel i forfermenten', sideK: 'Modning', sideV: fmtTimer(ff.timer),
      tall: [['Mel', gram(ff.mel)], ['Vann', gram(ff.vann)], ['Tørrgjær', fmt(ff.gjaer, 2) + ' g'],
             ['Temperatur', grader(ff.temp, 0)], ...(ff.salt > 0.05 ? [['Salt', fmt(ff.salt, 2) + ' g']] : [])],
      gjor: 'Visp ut gjæren i vannet FØR melet — noen tiendedels gram fordeler seg ikke i tørt mel. ' +
            (ff.hydrering <= 60 ? 'Bland bare til den er lurvete; rå melklumper er riktig i en stiv forferment. ' : 'Rør til jevn røre. ') + 'Lokk på.',
      // Tellene er ulike per type: surdeig og stiv biga leses IKKE som en poolish.
      // Flytetesten er bevisst utelatt for surdeig — appen fraråder den for deig
      // (flytepunktet inntreffer alt ved 11–17 % stigning), og et flytende levain
      // bekrefter bare gass, ikke at det ikke er overmodent.
      sjekk: r.ffT.id === 'surdeig'
        ? 'Klar 8–12 t etter mating når det har toppet og akkurat begynner å hvelve seg eller synke i midten — kuppel, boblet overflate, mild syrlig duft, ikke skarpt. Overmodent (sunket, skarp eddiklukt) degraderer glutenet og senker løftet.'
        : ff.hydrering <= 60
          ? 'En stiv biga synker ikke som en poolish: den hvelver seg og sprekker på toppen, får nettverksaktig innmat og en søtlig, mildt alkoholisk duft. Brukbar fra ' + fmtTimer(ff.brukTidligst || Math.max(1, ff.timer - 2)) + ' til ' + fmtTimer(ff.brukSenest || ff.timer + 3) + '.'
          : 'Klar når den har kuppel og akkurat begynner å synke i midten, med vannmerke på beholderveggen.'
    });
  }

  // 2 · Frøbehandling — ett steg per behandling (L-07)
  const froAktive = r.fro.filter(f => (f.gram || 0) > 0).map(f => {
    const sk = SOAKERS.find(s => s.id === f.id) || {};
    const behandling = sk.behandling || (f.varmt ? 'skald' : 'bloet');
    return { f, sk, pct: (f.gram || 0) / Math.max(r.melTotal, 1) * 100, bundet: f.bloetleggVann || 0, behandling };
  });
  const BEH = [
    { id: 'rist', navn: 'Rist', varighet: KJEDE.RIST,
      gjor: 'Tørr panne, 125–150 °C til lys gyllen — ristingen gir målt 28–51× mer pyrazin, altså dobbelt så mye smak per gram. Ikke bløtlegg dem varmt eller lenge etterpå: pyrazinene er vannløselige og flyktige.',
      sjekk: 'De skal dufte nøtteaktig, ikke brent. Avkjøl før de går i deigen.' },
    { id: 'bloet', navn: 'Bløtlegg kaldt', varighet: KJEDE.PREP,
      gjor: 'Kaldt vann, ca. 1,85× det de binder, og hell av overskuddet før de går i deigen. Minst 30 minutter.',
      sjekk: 'Ingen tørre kjerner igjen. Bløtlegger du ikke, trekker de vann ut av glutenet gjennom hele bulken.' },
    { id: 'skald', navn: 'Skåld', varighet: KJEDE.PREP,
      gjor: 'Hell nøyaktig det som bindes, med KOKENDE vann. Alt skåldevannet skal med i deigen — det bærer sukkerartene og stivelsen skåldingen frigjør. Avkjøl grynene til romtemperatur før de går i deigen, ellers drar de opp deigtemperaturen.',
      sjekk: 'Grynene skal være helt mettede og kladde seg sammen. Kaldbløtlagt rugknekk blir grus i brødet.' }
  ];
  BEH.forEach(b => {
    const med = froAktive.filter(x => x.behandling === b.id);
    if (!med.length) return;
    const gramSum = med.reduce((a, x) => a + (x.f.gram || 0), 0);
    const bundet = med.reduce((a, x) => a + x.bundet, 0);
    // L-12: hvert tall én gang. Gramfeltet står i hovedtallet; tabellen viser
    // per frø, og konstanten (vann bundet) i parentes — ikke som egen rad.
    steg.push({
      id: 'prep-' + b.id, navn: b.navn + ' ' + med.map(x => x.f.navn.toLowerCase().split(' (')[0]).join(' og '),
      tid: prepStart, varighet: b.varighet, tone: 'noytral',
      hoved: gram(gramSum), hovedNote: med.map(x => pst(x.pct, 1) + ' ' + x.f.navn.toLowerCase().split(' (')[0]).join(' · '),
      // Ristede frø bløtlegges ikke — de tørrises og suger så fra deigen. Da er
      // «binder vann» feil etikett (teknisk review #4); tallet er det de trekker.
      sideK: b.id === 'rist' ? 'Suger fra deigen' : 'Binder vann', sideV: gram(bundet),
      tall: med.map(x => [x.f.navn, gram(x.f.gram) + (b.id === 'rist' ? '' : ' (+ ' + gram(x.bundet * (b.id === 'bloet' ? 1.85 : 1)) + ' vann)')])
             .concat(b.id === 'bloet' ? [['Hell av overskuddet', gram(bundet * 0.85)]] : [])
             .concat([['Stjeler av hydreringen', pst(bundet / Math.max(r.melTotal, 1) * 100, 1) + '-poeng']]),
      gjor: b.gjor, sjekk: b.sjekk
    });
  });

  // 3 · Elting
  steg.push({
    id: 'elt', navn: 'Elt deigen', tid: eltStart, varighet: KJEDE.ELT, tone: 'accent',
    hoved: grader(state.startTemp ?? 24, 1), hovedNote: 'deigtemp ut av maskinen', sideK: 'Vann inn', sideV: grader(r.vannTemp, 1),
    tall: [['Friksjon, ' + r.eltMin + ' min', '+' + grader(r.friksjon, 1)], ['Arbeid', fmt(r.wh, 1) + ' Wh/kg'],
           ['Meltemperatur', grader(state.melTemp ?? 21, 0)], ['Deigvekt', gram(r.totalVekt)]],
    gjor: 'Salt de siste 2–3 minuttene. Stopp ved 60–75 % glutenutvikling — IKKE full vindusrute.',
    sjekk: 'Deigen slipper bollen, men er fortsatt litt klissete. Dømm på deigen, ikke på klokka.', veie: true
  });

  // 4..n · Gjæringstrinnene fra planen (L-09: andel av doseProfil)
  trinn.forEach((tr, i) => {
    const kaldt = tr.miljo <= KALDGRENSE;
    const dose = doseTr[i] ? doseTr[i].dose : 0;
    const andel = dose / doseSum * 100;
    const tt = trinnTider[i];
    steg.push({
      id: 'trinn-' + i, navn: tr.navn, tid: tt.start, varighet: (tr.timer || 0) * 60,
      tone: kaldt ? 'sage' : 'accent',
      // «Andel av HOVEDDEIGENS gjæring»: doseProfil dekker ikke forfermentens egen
      // gjæring, så tallet er andel av hoveddeigens trinn, ikke av all gjæring
      // (baker-review #5).
      hoved: fmtTimer(tr.timer), hovedNote: 'ved ' + grader(tr.miljo, 1), sideK: 'Andel hoveddeig', sideV: pst(andel, 0),
      tall: [['Varighet', fmtTimer(tr.timer)], ['Ferdig', kl(tt.slutt)], ['Miljø', grader(tr.miljo, 1)],
             ['Andel av hoveddeigens gjæring', pst(andel, 0)], ...(tr.utbakt ? [['Emnestørrelse', gram(r.totalVekt / antall) + ' × ' + antall]] : [['Mål stigning', '60–72 %']])],
      gjor: kaldt
        ? (tr.utbakt
            ? 'Emnene står UTILDEKKET i hevekurv på kjøl — utildekket gir skinn, og skinn gir blemmer og rent snitt. Mesteparten av gjæringen skjer de første 6 timene, mens deigen ennå kjøles ned.'
            : 'Deigen står tett tildekket på kjøl. Mesteparten av gjæringen skjer de første 6 timene, mens den ennå kjøles ned.')
        : (i === 0 ? 'Brett i første halvdel, så ikke rør deigen etterpå. Bretting bygger struktur bare mens glutenet er tøyelig.'
                   : 'Følg emnene tett — hevevinduet er smalt når det er varmt.'),
      sjekk: kaldt ? 'Se på emnet før du steker: det skal ha vokst tydelig og kjennes luftig, ikke stinnt.'
                   : (tr.utbakt ? 'Trykktest før ovnen: gropen skal fylle seg langsomt igjen over 5–10 sekunder.'
                                : 'Sikt mot 60–72 % stigning i målekrukka.'),
      krukke: !tr.utbakt || !kaldt
    });
  });

  // Forming — foran det utbakte kaldhevingstrinnet (bare når et trinn er utbakt).
  if (formTid) {
    steg.push({
      id: 'form', navn: 'Form emnene', tid: formTid.start, varighet: KJEDE.FORM, tone: 'accent',
      hoved: gram(r.totalVekt / antall), hovedNote: 'per emne · ' + antall + ' emner', sideK: 'Benkehvile', sideV: '15–20 min',
      tall: [['Antall emner', String(antall)], ['Vekt per emne', gram(r.totalVekt / antall)],
             ['Forforming', 'rund opp, hvil 15–20 min'], ['Forming', 'stram overflatespenning, i melet kurv med god side ned']],
      gjor: 'Forform lett til runde emner, la dem hvile 15–20 min under klede, form så stramt og legg i hevekurven med god side ned. Håndter bare de ytterste millimeterne.',
      sjekk: 'Emnet skal holde en stram kuppel og ikke flyte ut når du slipper det. Flyter det, trenger deigen mer struktur eller mindre vann.'
    });
  }

  // Forvarm (overlapper hevingen)
  steg.push({
    id: 'ovn', navn: 'Sett på ovnen', tid: forvarmStart, varighet: forvarmMin, tone: 'accent',
    hoved: prof.inn + ' °C', hovedNote: (prof.navn || '').toLowerCase(), sideK: 'Forvarm', sideV: fmtTimer(forvarmMin / 60),
    tall: [['Sett ovnen på', prof.inn + ' °C'], ['Forvarmingstid', fmtTimer(forvarmMin / 60)], ['Rist', prof.rist], ['Damp', prof.damp]],
    gjor: 'Ovnens pipelyd betyr ingenting — den måler lufta, ikke stålet. Sett dampkaret inn nå.',
    sjekk: 'Dette steget overlapper med hevingen. Det er derfor det ligger her og ikke rett før innsetting.'
  });

  // Etter siste gjæringstrinn: enten kaldt snitt (utbakt emne) eller bak-ut+hvile
  // (bulk i boks som ennå ikke er formet). L-04/baker-review, kritisk.
  if (sisteUtbakt) {
    steg.push({
      id: 'snitt', navn: 'Temperer og snitt', tid: postStart, varighet: POSTPROOF, tone: 'noytral',
      hoved: gram(r.totalVekt / antall), hovedNote: 'per emne · ' + antall + ' emner', sideK: 'Fra kjøl', sideV: POSTPROOF + ' min',
      tall: [['Antall emner', String(antall)], ['Vekt per emne', gram(r.totalVekt / antall)], ['Fra kjøl', 'snitt kaldt, rett i ovnen'], ['Benkestå', 'kort — ingen ny heving']],
      gjor: 'Ta emnene rett fra kjøl, vend på plata med god side opp, og snitt kaldt — kald deig holder snittet bedre. IKKE form på nytt: da degasser du blæreskinnet du nettopp bygde.',
      sjekk: 'Snittet skal åpne seg rent. Emnet er kaldt og fast — det er riktig; ovnsløftet kommer i ovnen, ikke på benken.'
    });
  } else {
    steg.push({
      id: 'utbak', navn: 'Bak ut og la hvile', tid: postStart, varighet: POSTPROOF, tone: 'noytral',
      hoved: gram(r.totalVekt / antall), hovedNote: 'per emne · ' + antall + ' emner', sideK: 'Benkehvile', sideV: POSTPROOF + ' min',
      tall: [['Antall emner', String(antall)], ['Vekt per emne', gram(r.totalVekt / antall)], ['Benkehvile', POSTPROOF + ' min']],
      gjor: 'Forform, hvil 15–20 min, form stramt og la hvile. Håndter bare de ytterste 1 cm. Ta av håndkleet 10 minutter før ovnen så skorpa tørker.',
      sjekk: 'Trykktest: gropen skal fylle seg langsomt igjen over 5–10 sekunder og etterlate et synlig merke.'
    });
  }

  // Stek
  steg.push({
    id: 'stek', navn: 'Stek', tid: innsetting, varighet: stekeMin, tone: 'accent',
    hoved: forstTall(prof.tid) + ' min', hovedNote: prof.inn + ' → ' + prof.ned + ' °C', sideK: 'Kjerne', sideV: prof.kjerne,
    tall: [['Inn på', prof.inn + ' °C'], ['Ned til', prof.ned + ' °C ' + (prof.nedNaar || '')], ['Damp', prof.damp], ['Rist', prof.rist]],
    gjor: (prof.damp === 'ingen' || String(prof.damp).startsWith('ingen'))
      ? 'Ingen damp å tilsette — lokket/gryta gjør jobben. Ett bestemt drag med buet blad før lokket på.'
      : 'Kokende vann fra kjelen i det du setter inn. Ett bestemt drag med buet blad.',
    sjekk: 'Ovnsløftet varer 15–20 minutter, med 80 % levert i de første 10–12. Ikke åpne døra i den perioden.'
  });

  // Avkjøl
  steg.push({
    id: 'kjol', navn: 'Avkjøl', tid: ferdig, varighet: 180, tone: 'noytral',
    hoved: '3 t', hovedNote: 'til kjerne 35–38 °C', sideK: 'Total prosess', sideV: '',
    tall: [['Til kjernetemperatur', '35–38 °C'], ['Tid', '3–4 timer'], ['På rist', 'luft under'], ['Antall brød', String(antall)]],
    gjor: 'Ikke skjær varmt. Stivelsen setter seg under nedkjølingen, ikke under stekingen.',
    sjekk: 'Skorpa knitrer mens den kjøles. Logg baket mens du husker det — løft ' + r.loft.loft + ', ' + fmt(r.hyd * 100, 0) + ' % vann.'
  });

  steg.sort((a, b) => a.tid - b.tid);
  steg.forEach((x, i) => x.nr = i + 1);
  // L-10: ÉN kilde til totaltiden — kjeden selv, første steg til avkjølt brød.
  const siste = steg[steg.length - 1];
  steg.totalT = (siste.tid.getTime() + siste.varighet * 60000 - steg[0].tid.getTime()) / 3600000;
  steg.filter(x => x.id === 'kjol').forEach(x => { x.sideV = fmt(steg.totalT, 1) + ' t'; });
  steg.start = steg[0].tid;
  steg.ferdig = ferdig;
  return steg;
}

/* Lineær interpolasjon i en ankerpunkttabell. Utenfor endepunktene klippes det
   til nærmeste verdi framfor å ekstrapolere — tabellene bygger på måledata i et
   bestemt spenn, og utenfor det spennet vet vi ikke. */
function interp(xs, ys, x) {
  if (!xs.length) return 0;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 0; i < xs.length - 1; i++) {
    if (x <= xs[i + 1]) {
      const f = (x - xs[i]) / (xs[i + 1] - xs[i]);
      return ys[i] + f * (ys[i + 1] - ys[i]);
    }
  }
  return ys[ys.length - 1];
}

/* ---------- Hjelpere ---------- */
function fmt(n, d = 0) {
  if (!isFinite(n)) return '–';
  return n.toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtTimer(t) {
  if (!isFinite(t)) return '–';
  const h = Math.floor(t), m = Math.round((t - h) * 60);
  if (m === 60) return `${h + 1} t`;
  return m === 0 ? `${h} t` : `${h} t ${m} min`;
}
function klokke(dato) {
  return dato.toLocaleString('nb-NO', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

/* Benevnelser skrives alltid bak tallet, ikke bare i kolonneoverskriften —
   det gjør det langt vanskeligere å lese feil rad når man står og baker. */
function gram(v, d = 0)   { return fmt(v, d) + ' g'; }
function pst(v, d = 1)    { return fmt(v, d) + ' %'; }
function kron(v)          { return fmt(v, 2) + ' kr'; }
function grader(v, d = 1) { return fmt(v, d) + ' °C'; }
