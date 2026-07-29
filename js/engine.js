/* ============================================================
   BRØDLAB — regnemotor
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
  const { hydrering = 0.75, grovAndel = 0.10, styrke = 'middels' } = o;
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
  return Math.max(18, base * hydJust * grovJust * styrkeJust);
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
  melListe.forEach(m => {
    const f = flourById(m.id); if (!f) return;
    const andel = m.pct / pctSum;
    absFaktor += andel * f.absorpsjon;
    grovAndel += andel * f.grov;
    const r = styrkeRang[f.styrke] ?? 3;
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

  // Frø
  const fro = froListe.map(f => {
    const sk = soakerById(f.id);
    const bloet = (f.gram || 0) * (f.varmt ? sk.varmt : sk.kaldt) / 100;
    return {
      id: f.id, navn: sk ? sk.navn : f.id, gram: f.gram || 0, varmt: !!f.varmt,
      bloetleggVann: bloet, hellVann: bloet * 1.85,
      kost: sk ? (f.gram || 0) / 1000 * sk.kr : 0, notat: sk ? sk.notat : ''
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
  const vannHoved = vannTotal - (ff ? ff.vann : 0) - honningVann - smorVann - froAbsorbert;

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
    vannHoved, froVannHelles, froAbsorbert,
    // Overskuddet du heller av etter bløtlegging. Frøene skal stå i rikelig vann
    // (~1,85× det de binder) for at ingen kjerner blir tørre, men bare det de
    // faktisk binder følger med i deigen — resten helles av.
    froVannOverskudd: froVannHelles - froAbsorbert,
    hydrering, effektivHydrering, anbefaltHydrering, absFaktor, froVannPaaToppen,
    oppgittHydrering: vannTotal / melTotal,
    grovAndel, svakesteStyrke,
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
           nokkelhull: pct >= 30 };
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
