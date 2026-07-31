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

/* Kaldeste vann man faktisk får tak i.
   Kjøleskapsvann holder ~3,5 °C, og under det finnes ikke uten isbiter. Appen
   regnet fritt nedover og kunne be om 1 °C eller −4 °C — tall man ikke kan
   følge, og som ga en falsk trygghet om at deigtemperaturen ville treffe.
   Brukeren kan sette sitt eget tall: kjøleskap varierer fra 2 til 7 grader. */
const VANN_KALDEST_STD = 3.5;

/* ---------- Relativ fermenteringsrate ---------- */
function rateFactor(T) {
  const f = t => (t <= FERM.T_MIN || t >= FERM.T_MAX)
    ? 0
    : (t - FERM.T_MIN) * (1 - Math.exp(FERM.C_HIGH * (t - FERM.T_MAX)));
  const ref = f(FERM.T_REF);
  const v = f(T) / ref;
  return v * v;
}

/* Hvor lang tid tilsvarer `timer` ved `fraTemp` når den står ved `tilTemp`?
   Modningen er rate × tid, så samme modning krever t2 = t1 · rate(T1)/rate(T2).
   Dette er den ærlige måten å svare på «hva gjør kjøleskapet med forfermenten»:
   den stopper ikke, den går saktere, og tallet sier hvor mye.

   Returnerer null under FERM.T_MIN — der er raten null i modellen, og et tall
   ville vært oppspinn. */
function ffTidEkvivalent(timer, fraTemp, tilTemp) {
  const r1 = rateFactor(fraTemp), r2 = rateFactor(tilTemp);
  if (!(r2 > 0) || !(r1 > 0)) return null;
  return timer * r1 / r2;
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
   Forankret i målt tabell (75 % hydrering, 90/10 hvete/fullkorn, 2 % salt).
   27 °C-ankeret sto på 30 %. Retningen er riktig — varm deig brytes ned
   raskere og settes inn tidligere — men 30 % presenteres som et konkret «Mål
   stigning», og et vanlig hvetebrød satt inn på 30 % er UNDERHEVET: tett krumme,
   sprengte sider. Hevet til 40 % står trygt over den grensa uten å bli overhevet
   i det varme vinduet. */
const RISE_ANKER = [[27, 40], [24, 50], [21, 75], [18, 100]];

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
  // For et ELLERS vanlig hvetebrød (lite grovt mel) settes et absolutt gulv på
  // 40 %: et sifta-hvetebrød satt inn under det er underhevet uansett hva de
  // øvrige justeringene gjør. Grove deiger tåler — og trenger — mindre stigning,
  // så gulvet gjelder bare når glutennettverket faktisk kan holde på gassen.
  const renHveteGulv = grovAndel <= 0.15 ? 40 : 18;
  const gulv = (etterKaldheving && hydrering > 0.80) ? 60 : renHveteGulv;
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

  /* Surdeigsstarterens masse må inn i deigvekten FØR melTotal løses.
     Et levain podes med moden starter (`podePct` % av levainens mel), og den
     starteren er REELL masse i bollen — halvt mel, halvt vann ved ~100 %
     hydrering. Før lå den bare i `ff.total` og var helt utenfor `totalVekt`: en
     surdeig på 2 × 900 g ba deg tilsette 61 g starter, så bollen veide 1861 g og
     hvert emne 930 g, ikke 900. `starterFaktor` = gram starter per gram
     oppskriftsmel, så den kan foldes inn i divisoren akkurat som frøvekten. */
  let starterFaktor = 0;
  if (forferment && forferment.bruk) {
    const ffTypeDef = (typeof FF_TYPER !== 'undefined' && FF_TYPER.find(t => t.id === forferment.type)) || {};
    if (ffTypeDef.kultur) starterFaktor = (forferment.pctMel / 100) * ((ffTypeDef.podePct || 20) / 100);
  }

  // Enten tar frøene vannet sitt fra den oppgitte hydreringen (regnearkets
  // konvensjon), eller det legges på toppen slik at deigen faktisk blir så våt
  // som tallet sier. Bare i det andre tilfellet tilfører frøene vekt utover
  // sin egen tørrvekt — ellers ligger vannet deres allerede i hydreringen.
  const froEkstraVann = froVannPaaToppen ? froAbsorbert : 0;
  const froMedVann = froGramTotal + froEkstraVann;
  // Starteren tar plass i deigvekten (`starterFaktor` i divisoren), så melTotal
  // krymper akkurat nok til at ferdig bolle treffer antall × vektPerBrod.
  const melTotal = Math.max(0, (maalVekt - froMedVann) / (perMel + starterFaktor));

  // Melet og vannet starteren bærer med seg. Moden starter er ~100 % hydrering,
  // så halvparten er mel og halvparten vann. Disse teller i sum tørt og i
  // hydreringen — det er de ~30 g melet som ellers falt ut av bakerprosenten.
  const starterMasse = melTotal * starterFaktor;
  const starterMel = starterMasse / 2;
  const starterVann = starterMasse / 2;

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
    /* Taket på forfermentens egen gjærdose.
       Modellen holder tiden fast og løser gjærmengden mot temperaturen. Det gir
       riktig matematikk og umulig bakverk når man setter en 12-timers poolish i
       kjøleskapet: dosen løp opp i 5,3 % tørrgjær av forfermentens mel — 15,9 %
       fersk. En kald biga kjøres på ca. 1 % fersk, ikke femten.

       Faglig grense er ~2 % FERSK gjær; over det smaker det gjær og forfermenten
       mister hensikten. Uttrykt i den gjærtypen dosen regnes i, er det
       FF_GJAER_TAK_FERSK omregnet — ikke 2 % av hva som helst, som var feilen:
       terskelen sto på 2 og ble sammenlignet med en tørrgjærprosent, altså 6 %
       fersk.

       Taket NEKTER ikke — det klemmer dosen og flagger underskuddet, samme
       mønster som hoveddeigens `gjaerUnderskudd`. Da ser bakeren at tiden, ikke
       gjæren, er det som må gi seg. */
    /* Et levain podes med SURDEIGSSTARTER, ikke med kommersiell gjær.
       Modellen doserte tørrgjær også i surdeigsvalget — og en levain med
       tørrgjær i er ikke en levain, det er en poolish med surdeigsnavn. Er
       typen merket `kultur`, settes gjærdosen i forfermenten til null og
       podemengden oppgis i gram moden starter i stedet. */
    const ffTypeDef = (typeof FF_TYPER !== 'undefined' && FF_TYPER.find(t => t.id === forferment.type)) || {};
    const medKultur = !!ffTypeDef.kultur;
    const ffPctBrukt = medKultur ? 0 : Math.min(ffGjaerPct, gjaerKonverter(FF_GJAER_TAK_FERSK, 'fersk', gjaerType));
    const ffGjaer = ffMel * ffPctBrukt / 100;
    const ffStarter = medKultur ? ffMel * (ffTypeDef.podePct || 20) / 100 : 0;
    ff = {
      type: forferment.type, pctMel: forferment.pctMel, hydrering: forferment.hydrering,
      timer: forferment.timer, temp: forferment.temp,
      // Hva planen foreslo, og om brukeren har overstyrt — UI-et trenger begge
      // for å kunne tilby «tilbake til planens verdi».
      standardTemp: forferment.standardTemp, egenTemp: !!forferment.egenTemp,
      standardTimer: forferment.standardTimer, egenTimer: !!forferment.egenTimer,
      mel: ffMel, vann: ffVann, gjaer: ffGjaer, gjaerPctAvFfMel: ffPctBrukt,
      // Hva modellen VILLE hatt, og hvor mye den ikke fikk. Null når taket ikke slo inn.
      gjaerPctOnsket: ffGjaerPct,
      kultur: medKultur, starter: ffStarter, podePct: medKultur ? (ffTypeDef.podePct || 20) : 0,
      gjaerPaaTaket: !medKultur && ffGjaerPct > ffPctBrukt + 1e-9,
      gjaerTakPct: gjaerKonverter(FF_GJAER_TAK_FERSK, 'fersk', gjaerType),
      salt: ffMel * 0.0015,                       // 0,15 % mot proteaseoppløsning
      // Starteren er også masse som går i bollen, og den skal telle i totalen.
      total: ffMel + ffVann + ffGjaer + ffStarter,
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
  // Starteren (starterMasse = starterMel + starterVann) er reell masse i bollen
  // og MÅ med, ellers veier hvert emne mer enn appen sier.
  const totalVekt = melTotal + vannTotal + salt + honning + olje + sukker + smor + malt + gjaerTotal + froGramTotal + starterMasse;

  // Kostnad
  const melKost = mel.reduce((s, m) => s + m.kost, 0);
  const froKost = fro.reduce((s, f) => s + f.kost, 0);
  const annenKost = salt / 1000 * 10 + honning / 1000 * 120 + olje / 1000 * 90
                  + sukker / 1000 * 22 + smor / 1000 * 90 + malt / 1000 * 200
                  + gjaerTotal / 1000 * (gjaerType === 'fersk' ? 60 : 250);
  const totalKost = melKost + froKost + annenKost;

  // Sum tørt og totalt vann INKLUDERT det starteren bærer. Starterens mel er
  // ~30 g fint mel som ellers falt ut av bakerprosenten, så hydrering og
  // grovhet driftet (75,0 vist mot 75,7 faktisk). Salt/gjær holdes fortsatt på
  // det VEIDE oppskriftsmelet (melTotal) — det er melet brukeren doserer mot.
  const sumTort = melTotal + starterMel;
  const vannMedStarter = vannTotal + starterVann;

  // Effektiv hydrering: vannet frøene binder er ikke tilgjengelig for deigen
  const effektivHydrering = (vannMedStarter - froAbsorbert) / Math.max(sumTort, 1);

  return {
    melTotal, vannTotal, totalVekt,
    // Starterens bidrag, eksponert så UI og logg kan vise den ekte deigvekten.
    starterMel, starterVann, starterMasse,
    sumTort,
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
    // Faktisk hydrering mot sum tørt inkl. starterens mel/vann.
    oppgittHydrering: vannMedStarter / Math.max(sumTort, 1),
    grovAndel, svakesteStyrke, styrkeVektet,
    // Frø er ikke mel. De bygger ikke gluten, men de fortynner nettverket og
    // stjeler vann. Derfor flere ulike «grovhets»-tall som ofte forveksles —
    // og som betyr helt forskjellige ting:
    froAndel: froGramTotal / Math.max(melTotal, 1),                       // frø i % av mel (bakerprosent)
    grovMelAndel: grovAndel,                                             // grovt MEL som andel av melet
    kornTillegg,                                                          // gryn og kli av korn, i gram
    // OFFISIELL grovhet etter norsk standard. Frø holdes utenfor, korngryn
    // teller med. Starterens mel er fint mel og teller i nevneren (fortynner
    // grovheten litt), på linje med resten av sum tørt.
    brodskala: brodskalan(grovAndel * melTotal, melTotal + starterMel, kornTillegg),
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

/* ---------- MELBLANDINGENS PRAKTISKE GRENSER (maxPct) ----------
   `maxPct` i FLOURS er det praktiske taket for hvor stor andel ett mel kan ha i
   et frittstående brød. Forvalgene og grovhetstrappa holder seg innenfor av seg
   selv, men i det øyeblikket brukeren skriver inn egne gram/prosent
   (`melOverstyr`), var det INGENTING som stoppet 100 % rug eller 40 % havre kjørt
   gjennom hvete-prosessen — et kollapset, mulig ustekt brød uten advarsel.

   Denne sperrer ikke; den flagger, samme mønster som `gjaerUnderskudd` og
   `vannUnderskudd`. To konsekvenser avledes av melets `glutenbidrag` (MEL_INFO):
     bryterned (rug)         → trenger SYRE (surdeig/1–2 % eddik) mot amylasen,
                               og over ~40 % må brødet i FORM.
     fortynner + styrke ingen → korn uten bakeevne (havre, bygg, kikert, bokhvete):
                               kan ikke bære struktur, må i form.
   `melListe` = [{id, pct}] der pct summerer til melandelen (normaliseres her). */
function melAdvarsler(melListe) {
  const MI = (typeof MEL_INFO !== 'undefined') ? MEL_INFO : {};
  const pctSum = (melListe || []).reduce((s, m) => s + (m.pct || 0), 0) || 100;
  const perMel = [];
  (melListe || []).forEach(m => {
    const f = FLOURS.find(x => x.id === m.id); if (!f) return;
    const andel = (m.pct || 0) / pctSum * 100;
    const maxPct = f.maxPct ?? 100;
    if (andel <= maxPct + 0.5) return;
    // Uten oppslag i MEL_INFO: grovt mel fortynner, siktet bidrar. Konservativt.
    const bidrag = (MI[m.id] && MI[m.id].glutenbidrag) || (f.grov ? 'fortynner' : 'bidrar');
    const utenBakeevne = bidrag === 'fortynner' && (f.styrke === 'ingen');
    perMel.push({
      id: m.id, navn: f.navn, pct: andel, maxPct, bidrag, styrke: f.styrke,
      // Rug angriper stivelsen (amylase) og har ingen gluten → syre + form.
      // Korn uten bakeevne bærer ikke et fritt emne → form.
      trengerSyre: bidrag === 'bryterned',
      maaIForm: (bidrag === 'bryterned' && andel > 40) || utenBakeevne
    });
  });
  return {
    perMel,
    over: perMel.length > 0,
    maaIForm: perMel.some(p => p.maaIForm),
    trengerSyre: perMel.some(p => p.trengerSyre)
  };
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
   tak kollapser løftet. `tak` er melblandingens hydreringstak i prosent.

   Det flate optimumet slutter ved 78 % ELLER ved melets eget tak, det som kommer
   først. Uten `flat` var 78 hardkodet, og en svak blanding med tak på 72 fikk
   full uttelling helt opp til 78 og så et fall på fem prosentpoeng i løftindeks
   over ett eneste prosentpoeng vann. Et mel som gir seg ved 72 gir seg ved 72 —
   ikke først seks poeng senere, og ikke i ett byks.                            */
function hydLoftFaktor(hydPct, tak = 82) {
  if (hydPct < 68) return 1 - 0.010 * (68 - hydPct);
  const flat = Math.min(78, tak);
  if (hydPct <= flat) return 1;
  if (hydPct <= tak) return 1 - 0.006 * (hydPct - flat);
  return 1 - 0.006 * (tak - flat) - 0.020 * (hydPct - tak);
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
/* ---------- Autolysens virkning ----------
   Autolysen var en tidsluke uten konsekvens: den skjøv klokka og gjorde ingenting
   med deigen. Det er feil — autolyse er en av de best dokumenterte teknikkene i
   brødbaking, og den gjør to ting som appen allerede modellerer.

   1 · ELTETID. Dette er hovedeffekten, og den er Calvels opprinnelige poeng:
       melet hydreres fullt og glutenet organiserer seg passivt, så samme
       utvikling nås med vesentlig kortere elting. Appen regner eltetid → friksjon
       → vanntemperatur, så dette forplanter seg av seg selv.
       Modellert som en reduksjonsfaktor som metter: 20 min gir mesteparten av
       gevinsten, og lenger enn en time gir lite ekstra på eltefronten.

   2 · LØFT. En autolysert deig er mer ekstensibel og gir noe bedre ovnsløft.
       Retningen er sikker og godt beskrevet; STØRRELSEN er det ikke, og derfor
       er den satt lavt og med et hardt tak: maks +4 % på løftindeksen.
       Ført som anslag i PARAMETERREVISJON.md — ikke som et kildet tall.

   Effekten flater ut fordi begge mekanismene er metningskurver: vannet er
   opptatt og proteasene har gjort sitt etter en tid, og etter ~3 timer snur det
   (se advarselen i autolyse-boksen).                                          */
function autolyseFaktor(minutter) {
  const m = Math.max(0, +minutter || 0);
  if (!m) return { elt: 1, loft: 1, metning: 0, hydratert: 0, proteolyse: 0, absorpsjon: 0, sukker: 0 };
  /* TO prosesser, ikke én.
     Modellen hadde én tidskonstant på 45 minutter for alt, og da ble 30 minutter
     nesten uten virkning — stikk i strid med hvorfor folk faktisk gjør det.
     Autolyse er to ting som går i hver sin fart:

       HYDRERING (rask). Melet drikker seg fullt og glutenet organiserer seg
       passivt. Det meste skjer i løpet av 20–30 minutter, og det er dette som
       gir kortere elting og en deig som kjennes mykere. τ ≈ 20 min: 78 % ferdig
       etter en halvtime, 95 % etter én time.

       PROTEOLYSE (langsom). Melets egne proteaser klipper glutenet og gjør
       deigen mer strekkbar. Den bygger seg opp over timer, ikke minutter, og
       er grunnen til at 2 timer kjennes annerledes enn 30 minutter — og til at
       for lenge på svakt mel gir slapp deig i stedet for smidig. τ ≈ 90 min.

     Med én felles konstant kunne modellen ikke skille disse to, og da måtte den
     ta feil om minst én av dem. Effektstørrelsene under er anslag; retningen og
     rekkefølgen er godt belagt, tallene er appens egen arbeidsverdi. */
  const hydratert  = 1 - Math.exp(-m / 20);
  const proteolyse = 1 - Math.exp(-m / 90);
  return {
    hydratert, proteolyse,
    metning: hydratert,          // bakoverkompatibelt navn
    elt: 1 - 0.30 * hydratert,   // inntil 30 % kortere elting — følger hydreringen
    loft: 1 + 0.04 * proteolyse, // inntil +4 % løft — bevisst forsiktig, og sent
    /* Melet drikker seg fullt: samme vannmengde kjennes som en lavere
       hydrering, fordi vannet er bundet i stedet for å ligge fritt. Uttrykt som
       prosentpoeng «opplevd» lavere hydrering, maks 3 pp. Følger hydreringen. */
    absorpsjon: 3 * hydratert,
    /* Amylasen frigjør maltose mens melet ligger. Det gir gjæren mer mat sent i
       hevingen og mer skorpefarge — men det ENDRER IKKE hvor mye gjær du
       trenger, for gjæren er ikke i deigen ennå og hevetiden er den samme.
       Enzymarbeid er langsomt, så det følger proteolysekurven. */
    sukker: proteolyse
  };
}

function loftIndeks(o) {
  const {
    plan, grovPct = 0, froPct = 0, tortFrak = 0, hydPct = 75, tak = 82,
    ffType = 'ingen', ffAndel = 0, styrkeVektet = 4.0, ekvTimer = 0,
    autolyseMin = 0
  } = o;
  const basis = (plan && (plan.ovnslosBasis ?? plan.ovnslos)) || 82;
  const fGrov = grovLoftFaktor(grovPct);
  const fFro  = froLoftFaktor(froPct, tortFrak);
  const fHyd  = hydLoftFaktor(hydPct, tak);
  const fFf   = ffLoftFaktor(ffType, ffAndel, styrkeVektet, ekvTimer);
  const fAuto = autolyseFaktor(autolyseMin).loft;
  const raa = basis * fGrov * fFro * fHyd * fFf * fAuto;
  const loft = Math.round(Math.max(20, Math.min(100, raa)));
  return {
    loft, basis, raa,
    faktor: { grov: fGrov, fro: fFro, hyd: fHyd, ff: fFf, autolyse: fAuto },
    // Poeng tapt/vunnet mot basis, til «hva dette koster»-visningen.
    tap: {
      grov: basis * (1 - fGrov),
      fro:  basis * fGrov * (1 - fFro),
      hyd:  basis * fGrov * fFro * (1 - fHyd),
      ff:   basis * fGrov * fFro * fHyd * (fFf - 1),  // positivt = gevinst
      autolyse: basis * fGrov * fFro * fHyd * fFf * (fAuto - 1)
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

/* ---------- Brukerens egen melblanding ----------
   `state.melOverstyr` er [{id, pct}] og slår både preset og grovhetstrappa. Den
   valideres her og ikke der den brukes, så en korrupt lagret tilstand (ukjent
   meltype, NaN-prosent, tom liste) faller stille tilbake på den utledede
   blandingen i stedet for å gi NaN gjennom hele oppskriften. */
function gyldigOverstyring(liste) {
  if (!Array.isArray(liste) || !liste.length) return null;
  const rein = liste
    .filter(m => m && FLOURS.some(f => f.id === m.id) && isFinite(m.pct) && m.pct >= 0)
    .map(m => ({ id: m.id, pct: +m.pct }));
  if (!rein.length || rein.reduce((s, m) => s + m.pct, 0) <= 0) return null;
  return rein;
}

/* ---------- Gram inn, andel ut ----------
   Melmengden avhenger av prosentene OG prosentene av melmengden: skriver du
   500 g av en meltype, flytter det melTotal, som flytter hva 500 g utgjør i
   prosent. Derfor itereres det til det står stille — seks runder holder langt
   forbi vektas oppløsning.

   Begge lever her, ikke i app-v2.js, fordi de REGNER. Appen kaller dem fra en
   klikkhandler og tegner resultatet.                                          */
function settMelGram(state, i, gram) {
  const grunn = gyldigOverstyring(state.melOverstyr) || regn(state).melListe;
  const liste = grunn.map(m => ({ ...m }));
  if (!liste[i]) return liste;
  const maal = Math.max(0, gram);
  for (let n = 0; n < 6; n++) {
    const r = regn({ ...state, melOverstyr: liste });
    if (!isFinite(r.melTotal) || r.melTotal <= 0) break;
    const sum = liste.reduce((s, m) => s + m.pct, 0) || 100;
    const andreSum = sum - liste[i].pct;
    // ny_pct / (ny_pct + andreSum) = ønsket andel  →  løst for ny_pct
    const andel = Math.min(0.99, Math.max(0, maal / r.melTotal));
    liste[i].pct = andreSum > 0
      ? Math.max(0, andel * andreSum / Math.max(1 - andel, 1e-6))
      : 100;
  }
  return liste;
}
/* ---------- Hva skal gi etter? ----------
   `settMelGram` fordeler differansen på ALLE de andre meltypene. Det er én av
   flere rimelige svar, og appen tok det stilltiende. De to under er de andre to,
   og appen spør nå i stedet for å velge.

   `settMelGramMot`: én bestemt meltype tar hele endringen. Skriver du 700 g
   sammalt og sier at hvetemelet skal gi etter, er det hvetemelet som faller —
   ikke rugen, som du kanskje har dosert bevisst.                              */
function settMelGramMot(state, i, gram, j) {
  const grunn = gyldigOverstyring(state.melOverstyr) || regn(state).melListe;
  const liste = grunn.map(m => ({ ...m }));
  if (!liste[i] || !liste[j] || i === j) return liste;
  const maal = Math.max(0, gram);
  for (let n = 0; n < 6; n++) {
    const r = regn({ ...state, melOverstyr: liste });
    if (!isFinite(r.melTotal) || r.melTotal <= 0) break;
    const diff = maal - (r.mel[i] ? r.mel[i].gram : 0);
    const gJ = (r.mel[j] ? r.mel[j].gram : 0) - diff;         // giveren tar hele endringen
    const sum = liste.reduce((s, m) => s + m.pct, 0) || 100;
    // Andelene er relative, så gram → pct går via melTotal, som holdes fast her:
    // summen av mel endrer seg ikke når én tar det den andre gir fra seg.
    liste[i].pct = Math.max(0, maal / r.melTotal * sum);
    liste[j].pct = Math.max(0, gJ / r.melTotal * sum);
  }
  return liste;
}

/* `settMelGramMerDeig`: ingen andre meltyper røres — deigen vokser i stedet.
   Returnerer BÅDE ny melliste og ny brødvekt, fordi de to henger sammen: mer mel
   i samme antall brød betyr tyngre brød.                                      */
function settMelGramMerDeig(state, i, gram) {
  const r0 = regn(state);
  const start = r0.mel.map(m => m.gram);
  if (!start[i] && start[i] !== 0) return { melOverstyr: gyldigOverstyring(state.melOverstyr) || r0.melListe, vekt: state.vekt || 900 };
  /* De andre meltypene låses til gramverdiene de HAR NÅ, én gang.
     Første forsøk leste dem på nytt i hver iterasjon — og siden de da allerede
     var flyttet av forrige runde, drev de oppover i stedet for å stå stille. */
  const maalGram = start.map((g, k) => (k === i ? Math.max(0, gram) : g));
  const nyTotal = maalGram.reduce((sum, g) => sum + g, 0);
  if (!(nyTotal > 0)) return { melOverstyr: r0.melListe, vekt: state.vekt || 900 };
  const liste = r0.melListe.map((m, k) => ({ id: m.id, pct: maalGram[k] / nyTotal * 100 }));
  // Andelene er nå gitt; bare deigvekten må løses, så melTotal treffer nyTotal.
  let vekt = state.vekt || 900;
  for (let n = 0; n < 6; n++) {
    const r = regn({ ...state, melOverstyr: liste, vekt });
    if (!isFinite(r.melTotal) || r.melTotal <= 0) break;
    vekt = vekt * nyTotal / r.melTotal;
  }
  /* Klemmes til samme spenn som stepperen på Brød (100–2000 g/brød).
     Uten klemmen kunne et vilt gramtall gi 9 kg per brød, og brukeren hadde
     ingen praktisk vei tilbake — stepperen går i steg på 50. */
  return { melOverstyr: liste, vekt: Math.min(2000, Math.max(100, Math.round(vekt))) };
}

/* Vann i gram → hydrering i prosent. Samme gjensidige avhengighet: vannet er
   melTotal × hyd, og melTotal faller når hydreringen stiger i en fast deigvekt. */
function settVannGram(state, gram) {
  let hyd = state.hyd ?? 75;
  const maal = Math.max(0, gram);
  for (let n = 0; n < 6; n++) {
    const r = regn({ ...state, hyd });
    if (!isFinite(r.melTotal) || r.melTotal <= 0) break;
    // vannTotal = melTotal × hydrering + vannet frøene drar med seg. Skriver du
    // 700 g, mener du alt vannet du heller i — så frøvannet trekkes fra før
    // hydreringen løses, ellers ville hvert frøtillegg forskjøvet tallet.
    const froVann = r.vannTotal - r.melTotal * (hyd / 100);
    // Samme spenn som skyveren i UI-et (62–86). Ulike grenser ga et tall over
    // skyveren som skyveren selv ikke kunne stå på.
    hyd = Math.max(62, Math.min(88, (maal - froVann) / r.melTotal * 100));
  }
  return Math.round(hyd * 10) / 10;
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
/* Forfermentens eget tak, oppgitt i FERSK gjær av forfermentens mel. Over ~2 %
   fersk smaker forfermenten gjær, og da er den ikke lenger en smakskilde. En
   kald biga kjøres typisk på 1 % fersk over 18–24 t. */
const FF_GJAER_TAK_FERSK = 2.0;

/* Delt måling for maskinen som er valgt, hvis noen har målt den og delt den.
   `state.delteKalib` fylles av appen etter innlogging og er `null` ellers — så
   uten sky, og uten en måling for akkurat denne maskinen, faller alt tilbake til
   klasseanslaget i FRIKSJON. */
function delfriksjon(state) {
  const kal = state && state.delteKalib;
  const mid = (state && state.maskin) || 'spiralHjemme';
  const rad = kal && kal[mid];
  return rad && isFinite(rad.friksjon) ? +rad.friksjon : null;
}

/* regn() er en REN funksjon av tilstanden, men tung: gjærsolveren kjører 42
   halveringer × full plangjennomregning, og ett gramtastetrykk kan utløse 6–10
   kall (fikspunktløkkene i settMelGram/settVannGram + flere kall per render).
   Derfor et lite LRU-minne på serialisert tilstand: identisk tilstand gir
   identisk svar, så gjentatte kall i samme interaksjon koster bare en
   JSON.stringify i stedet for en ny integrasjon. Ingen numerisk endring —
   samme funksjon, bare husket. Cachen tømmes aldri manuelt; 16 plasser holder
   for et par renders, og gammelt faller ut av seg selv. */
const _regnCache = new Map();
const _REGN_CACHE_MAX = 16;
function regn(state) {
  let key;
  try { key = JSON.stringify(state); } catch (e) { key = null; }
  if (key !== null && _regnCache.has(key)) {
    // Flytt til «nyest brukt» (LRU) og returner det huskede resultatet.
    const v = _regnCache.get(key);
    _regnCache.delete(key); _regnCache.set(key, v);
    return v;
  }
  const v = regnKjerne(state);
  if (key !== null) {
    _regnCache.set(key, v);
    if (_regnCache.size > _REGN_CACHE_MAX) _regnCache.delete(_regnCache.keys().next().value);
  }
  return v;
}

function regnKjerne(state) {
  const bt = BROTYPER.find(b => b.id === state.brotype) || BROTYPER[0];
  const plan = TIDSPLANER.find(t => t.id === state.tid)
            || TIDSPLANER.find(t => t.id === 'lang') || TIDSPLANER[0];
  const preset = bt.rute === 'preset' ? PRESETS.find(p => p.id === bt.preset) : null;

  // Melblanding: preset låser sin egen; bygg-ruta utleder av grov-skyveren.
  // `melOverstyr` er brukerens egen blanding og slår begge — den settes når man
  // skriver inn gram eller prosent på en meltype, og nullstilles av grovhets-
  // trinnene (ellers ville dialen sluttet å virke uten at noe sa fra).
  /* `?? ` fanger bare null/undefined, IKKE NaN — og `NaN / 100` propagerer til
     melTotal og hele oppskriften (alt blir «–»). Skyverne gir alltid gyldige
     tall, så dette er en teoretisk luke, men en korrupt lagret tilstand
     (saltPct: NaN fra en gammel migrering) skal ikke velte regnestykket.
     Derfor `isFinite`-gulv på alt som mater melTotal/totalVekt. */
  const num = (v, fallback) => (isFinite(v) ? +v : fallback);
  const melListe = gyldigOverstyring(state.melOverstyr)
    || (preset ? preset.mel.map(m => ({ ...m })) : melblandingForGrov(num(state.grov, 40)));

  // Hydrering og salt: preset eier sine, ellers brukerens valg.
  const hyd = (preset ? preset.hydrering : num(state.hyd, 75)) / 100;
  const saltPct = preset ? preset.salt : num(state.saltPct, 1.8);

  /* Rommet og kjøleskapet, slik brukeren har oppgitt dem. Alt som skal stå
     «i rommet» eller «på kjøl» måles mot disse to, ikke mot tabellens tall. */
  const romT = isFinite(state.romTemp) ? +state.romTemp : ROM_NOMINELL;
  const kjolskapT = isFinite(state.kjolskapTemp) ? +state.kjolskapTemp : KJOLSKAP_STD;

  // Forferment: TYPEN eies av valget, TIDSPLANEN (timer, andel) av planen.
  const ffT = ffTypeFor(state.ffType);
  const ffPaa = !!state.ff && ffT.id !== 'ingen';
  const pf = plan.forferment || {};
  /* Forfermentens temperatur: planen/typen foreslår, brukeren bestemmer.
     `ffTemp` er null når man ikke har rørt den, og da gjelder forslaget som før.
     Gjærdosen i forfermenten løses mot NETTOPP denne temperaturen
     (forfermentGjaerPct), så et kaldt skap gir automatisk mer gjær for samme
     modningstid — det er ikke en separat regel som må vedlikeholdes. */
  /* Står forfermenten varmt, står den i ROMMET DITT — ikke på et tabelltall.
     Tabellens 21 grader er ingen som har målt; det er en antakelse. Er den
     derimot ment å stå kaldt, er det kjøleskapet, og da gjelder ditt skap.

     UNNTAK: en biga vil stå KJØLIGERE enn rommet (16–18 °C). Har typen et
     temperaturbånd (`tempMin`/`tempMax`), klemmes romtemperaturen inn i det —
     så en biga på et 24 °C-kjøkken lander på 20 (kjøligste realistiske) i stedet
     for å gjære for fort på full romtemp, og en biga på et 17 °C-kjøkken står på
     17. Gjærdosen løses mot den faktiske temperaturen uansett. */
  const ffNominell = pf.temp || ffT.temp || 21;
  let ffStandardTemp;
  if (ffNominell <= KALDGRENSE) {
    ffStandardTemp = kjolskapT;
  } else if (isFinite(ffT.tempMin) && isFinite(ffT.tempMax)) {
    ffStandardTemp = Math.max(ffT.tempMin, Math.min(ffT.tempMax, romT));
  } else {
    ffStandardTemp = romT;
  }
  const forferment = {
    bruk: ffPaa, type: ffT.id,
    pctMel: pf.pctMel || ffT.pctMel,
    hydrering: ffT.hyd || pf.hydrering || 100,
    /* Modningstiden kan overstyres på samme måte som temperaturen. Uten den
       hadde appen ingen vei ut av «for kaldt til å rekke det»: den kunne bare
       konstatere at kombinasjonen ikke går opp, uten å la deg gjøre noe med
       den ene variabelen som faktisk løser det. */
    timer: (state.ffTimer != null && isFinite(state.ffTimer) && state.ffTimer > 0)
      ? +state.ffTimer : (pf.timer || ffT.timer),
    standardTimer: pf.timer || ffT.timer,
    egenTimer: state.ffTimer != null,
    temp: state.ffTemp != null ? state.ffTemp : ffStandardTemp,
    standardTemp: ffStandardTemp,
    egenTemp: state.ffTemp != null
  };

  // Frøgram avhenger av melTotal og melTotal av frøgram. Det er en AFFIN likning,
  // ikke en som skal itereres: naiv Picard-iterasjon DIVERGERER når frølasten er
  // tung (teknisk review, kritisk — ga melTotal = 0 og NaN i hele oppskriften).
  // g(m) = beregnOppskrift(froListe(m)).melTotal er affin i m, så to evalueringer
  // gir det eksakte fikspunktet m* = a/(1+b), med beregnOppskrift selv som eneste
  // kilde (ingen duplisert perMel-formel som kan komme i utakt med motoren).
  const smak = tilleggOppdelt(state.tillegg, 1).smak;

  /* Kompensasjon for tillegg (`okDeig`): tillegg tar plass i en fast deigvekt, så
     melet faller. Er valget på, skaleres deigvekten opp til melmengden er den
     samme som uten tillegg.

     Regnes HER, av state, og skriver aldri til `state.vekt`. Før satte knappen
     `S.vekt` til den kompenserte vekten — og da ble den nye vekten selv grunnlag
     for neste utregning, så hvert trykk økte deigen på nytt, i det uendelige.
     `state.vekt` er brukerens valgte brødvekt og skal forbli det.               */
  let vektPerBrod = state.vekt || 900;
  if (state.okDeig && Object.keys(state.tillegg || {}).length) {
    const uten = regn({ ...state, tillegg: {}, okDeig: false });
    const med  = regn({ ...state, okDeig: false });
    if (med.melTotal > 0 && isFinite(uten.melTotal)) vektPerBrod *= uten.melTotal / med.melTotal;
  }

  const oppskrift = (gjaerPct, mFro) => beregnOppskrift({
    melListe, froListe: tilleggOppdelt(state.tillegg, mFro).froListe,
    hydrering: hyd, saltPct, ...smak,
    gjaerPct, gjaerType: 'torr', forferment,
    antall: state.antall || 1, vektPerBrod,
    froVannPaaToppen: state.froVannPaaToppen !== false
  });
  const losMel = (gjaerPct) => {
    const a = oppskrift(gjaerPct, 0).melTotal;      // g(0)
    const g1 = oppskrift(gjaerPct, a).melTotal;     // g(a)
    const b = a > 0 ? (a - g1) / a : 0;             // g(m) = a − b·m
    return a / (1 + b);                             // fikspunkt
  };
  let r = oppskrift(0.3, losMel(0.3));

  /* Gjæren løses numerisk mot måldosen (L-02), med tak og underskudd-flagg.
     Heveplanen kan være redigert av brukeren (state.heveplan); ellers planens
     standard.

     PLANENS TEMPERATURER ER NOMINELLE, ikke fasit. Tabellen sier «bulk ved 24»
     og «kjøleskap ved 3,5», men rommet ditt er ikke 24 grader hele året, og
     kjøleskapet ditt er ditt eget. Før måtte man redigere heveplanen for å
     endre det — og da ble planen «egendefinert» av å svare ærlig på hvor kaldt
     det er hjemme. Det er feil: en egendefinert tidsplan er når man endrer hvor
     LENGE noe står, ikke når man forteller appen hva termometeret viser.

     Derfor: varme trinn forskyves med differansen mellom rommet ditt og
     plantabellens nominelle romtemperatur, så et trinn planen legger to grader
     over romtemp fortsatt ligger to grader over DITT rom. Kalde trinn settes
     rett til kjøleskapstemperaturen din. Har brukeren redigert planen selv, står
     hans egne tall — da er de valgt, ikke arvet. */
  const egenPlan = Array.isArray(state.heveplan) && state.heveplan.length;
  const planTrinn = (egenPlan ? state.heveplan : plan.plan).map(s => {
    const t = { ...s };
    if (!egenPlan) {
      t.miljo = s.miljo <= KALDGRENSE
        ? kjolskapT
        : Math.max(KALDGRENSE + 0.5, s.miljo + (romT - ROM_NOMINELL));
    }
    return t;
  });
  if (planTrinn.length) planTrinn[0].temp = state.startTemp ?? 24;
  /* Forfermentens EFFEKTIVE andel, ikke bare melandelen.
     `maalDoseFor` senket måldosen ut fra hvor stor andel av melet som ligger i
     forfermenten — som om en forferment alltid er ferdig moden. Den er den ikke:
     står den kaldt, har den knapt gjæret, og da har den heller ikke gjort den
     jobben hoveddeigen slipper å gjøre.

     Aktiviteten måles mot forfermentens egen referansetemperatur: full uttelling
     ved den temperaturen typen er kalibrert for, mindre når den står kaldere.
     Uten dette sto hoveddeigens gjærmengde helt stille enten forfermenten stod
     på 26 eller på 4 grader — og det var åpenbart galt. */
  const ffRef = forferment.standardTemp || 21;
  const ffAktiv = ffPaa ? Math.max(0, Math.min(1, rateFactor(forferment.temp) / Math.max(rateFactor(ffRef), 1e-6))) : 0;
  const pff = ffPaa ? (forferment.pctMel / 100) * ffAktiv : 0;
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
  let prof = BAKE_PROFILES.find(p => p.id === state.stekeProfil)
          || (preset && BAKE_PROFILES.find(p => p.id === preset.steking))
          || BAKE_PROFILES[0];
  // Står Pyrexen i ovnen fra kald start, forsvinner oppvarmingssjokket som er
  // grunnen til 230-taket, og profilen kan kjøres varmt. Byttet skjer HER, i
  // regn(), så kjeden, Prosess og oppslaget alle leser samme temperatur — en
  // justering gjort i render ville drevet fra det steget faktisk sier.
  if (state.pyrexIOvn && prof.varm) prof = Object.assign({}, prof, prof.varm, { varmPaa: true });

  // Deigtemp: ekte varmebalanse (samme motor som Deigtemp-skjermen). Vannet i
  // hoveddeigen, melet utenom forfermenten, forfermenten og frøene veies hver
  // for seg — det er nettopp derfor 3-faktorformelen bommer på våte deiger.
  const eltMin = state.eltMin || 13;
  const melIHoved = r.melTotal - (r.forferment ? r.forferment.mel : 0);
  const froGramTot = r.froAbsorbert + r.fro.reduce((s, f) => s + (f.gram || 0), 0);
  const dtInn = {
    onsketDeigTemp: state.startTemp ?? 24,
    melGram: melIHoved, melTemp: state.melTemp ?? 21,
    vannGram: Math.max(r.vannHoved, 1),
    forfermentGram: r.forferment ? r.forferment.total : 0,
    forfermentTemp: r.forferment ? r.forferment.temp : 20,
    forfermentHydrering: r.forferment ? r.forferment.hydrering / 100 : 1,
    froGram: froGramTot, froTemp: state.melTemp ?? 21,
    // «egen» maskin bruker brukerens kalibrerte friksjon (°C/min) i stedet for
    // en av standardmaskinene.
    mikser: state.maskin === 'egen' ? 'spiralHjemme' : (state.maskin || 'spiralHjemme'),
    /* Rekkefølgen er: din egen måling → en delt måling for nettopp denne
       maskinen → klasseanslaget i tabellen. En ekte måling er mer verdt enn et
       anslag, også når det er en annen som har gjort den. */
    friksjonPerMin: state.maskin === 'egen' && isFinite(state.egenFriksjon) ? state.egenFriksjon
      : delfriksjon(state),
    minutter: eltMin
  };
  const dt = vanntemperatur(dtInn);
  // Kaldeste vann brukeren faktisk får. Kjøleskap varierer, så det er en
  // innstilling og ikke en konstant.
  const kaldest = isFinite(state.kjolTemp) ? +state.kjolTemp : VANN_KALDEST_STD;

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
  /* Hydreringstaket følger BÅDE styrken og absorpsjonen.
     Styrken alene var ikke nok: et grovt brød har svakere gluten, så
     styrkeleddet dro taket ned mot 75 % — samtidig som kli og fullkorn suger
     16–19 % mer vann og deigen faktisk TRENGER over 80 for ikke å bli tørr.
     Appen advarte altså mot den hydreringen den selv burde anbefalt. Nå ganges
     taket med blandingens absorpsjonsfaktor, slik at «tåler» og «trenger» måles
     i samme enhet. Ankeret er middels siktet butikkmel (styrkeVektet 4,
     absorpsjon 1,00), som lander på 79 % — der den gamle formelen lå for siktet
     hvete, så hvetebrødene oppfører seg som før. Det som endrer seg er de grove
     blandingene, som var de eneste formelen tok feil på. */
  const tak = Math.max(70, Math.min(92, (79 + (r.styrkeVektet - 4) * 4) * r.absFaktor));
  const loft = loftIndeks({
    plan, grovPct: r.brodskala.pct, froPct: froPctEkte, tortFrak,
    hydPct: hyd * 100, tak,
    ffType: ffT.id, ffAndel: pff,
    styrkeVektet: r.styrkeVektet, ekvTimer: doseProfil.ekvTimer,
    autolyseMin: state.autolyseMin || 0
  });

  return {
    ...r,
    // NB: `r.forferment` er beregnOppskrifts BEREGNEDE forferment (med mel/vann/
    // gjær-mengder) — det må IKKE overskrives av input-spesifikasjonen `forferment`.
    // Input-spec-en eksponeres separat som `ffInn` for plan-koblingsvisningen.
    bt, plan, preset, planTrinn,
    ffT, ffPaa, ffInn: forferment,
    hyd, saltPct,
    /* Hydreringstaket og den anbefalte hydreringen hører sammen, og begge følger
       melblandingen.

       74 % var oppgitt som anbefaling uansett hva som lå i blandingen. Det er en
       anbefaling for siktet butikkmel, og på 100 % grovt er den direkte feil:
       kli og fullkorn suger 16–19 % mer vann enn siktet hvete, så samme 74 %
       gir en deig som kjennes stiv og bakes tørr. Anbefalingen er derfor
       forankret i 74 % og ganget med blandingens absorpsjonsfaktor — på ren
       fullkorn lander den rundt 86 %, og den klippes mot melets eget tak.
       `tak` regnes én gang her og brukes både av løftmodellen og av UI-et, så
       de to ikke kan komme i utakt. */
    tak,
    hydAnbefalt: Math.round(Math.max(62, Math.min(tak, 88, 74 * r.absFaktor))),
    gjaerTorr: torr, maalDose, gjaerUnderskudd,
    doseProfil, loft,
    ffAktiv, ffAndelEffektiv: pff,
    /* Er vannet appen ber om i det hele tatt mulig å skaffe?
       `vannTemp` er den TEORETISKE temperaturen. `vannTempMulig` er den man kan
       faktisk kan helle, og `deigTempMulig` er temperaturen deigen da lander på.
       Avviket er det brukeren må løse med andre tiltak — kaldere rom, kaldere
       mel, kortere elting — og det kan appen ikke gjøre for ham. */
    vannKaldest: kaldest,
    vannForKaldt: dt.vannTemp < kaldest,
    vannTempMulig: Math.max(kaldest, dt.vannTemp),
    deigTempMulig: dt.vannTemp < kaldest
      ? faktiskDeigTemp(dtInn, kaldest)
      : (state.startTemp ?? 24),
    prof, eltMin, vannTemp: dt.vannTemp, friksjon: dt.friksjonsOkning, wh: dt.friksjonsOkning / ELTING.GRAD_PER_WH,
    // Anbefalt eltetid MED autolysen: melet er alt hydrert og glutenet delvis
    // organisert, så samme utvikling nås på kortere tid.
    eltMinAnbefalt: Math.max(2, Math.round(eltMin * autolyseFaktor(state.autolyseMin || 0).elt)),
    autolyse: autolyseFaktor(state.autolyseMin || 0),
    // Praktiske melgrenser (maxPct). Bruker den BEREGNEDE melfordelingen (r.mel),
    // som er normalisert til 100 %, så et mel over sitt tak flagges uansett om
    // brukeren skrev prosent eller gram.
    melAdvarsler: melAdvarsler(r.mel),
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
/* Plantabellens nominelle romtemperatur og kjøleskap. Trinnene i TIDSPLANER er
   skrevet mot disse; brukerens egne verdier (`romTemp`, `kjolskapTemp`)
   forskyver dem. Ingen av dem er et valg brukeren har tatt — de er bare det
   tabellen antar når han ikke har sagt noe annet. */
const ROM_NOMINELL = 24;
const KJOLSKAP_STD = 4;
/* Faste stegvarigheter (min).
   Tallene var satt på slump og bommet hver sin vei:
     ELT 75 — nesten dobbelt. Selve eltingen er 10–15 minutter; resten er
       veiing, sammenblanding og opprydding. Derfor er den nå ELT_FAST pluss den
       eltetiden brukeren faktisk har satt, i stedet for ett tall for alle.
     FORM 25 — for kort. Forforming, 15–20 minutters benkehvile og selve
       formingen er alene 25; hele steget lander på ca. 40.
     RIST 15 — for kort. Frøene skal ristes OG kjøles før de går i deigen; går
       de varme i, drar de deigtemperaturen med seg. */
const KJEDE = { UTBAK: 45, ELT_FAST: 25, PREP: 30, RIST: 25, FORM: 40 };
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

  /* Måltallet for stigning i bulk.
     Det sto «60–72 %» for ALT — samme tall for en loff på fint hvetemel og for
     et 100 % grovt brød. Det er feil vei å ta feil på: et grovt brød har mindre
     gluten å holde på gassen, og hever du det til 70 % har du ikke et luftig
     brød, du har et som faller sammen i ovnen. Riktig måltall faller med
     grovhet, med hydrering og med svakt mel — `maalHeveProsent()` har regnet det
     hele tiden, V2 spurte bare aldri. Båndet er måltallet til måltallet × 1,2,
     samme som V1 viser. */
  const harKald = trinn.some(t => t.miljo <= KALDGRENSE);
  const maalRise = maalHeveProsent(state.startTemp ?? 24, {
    hydrering: r.hydrering, grovAndel: r.grovMelAndel,
    styrke: r.svakesteStyrke, etterKaldheving: harKald
  });
  const riseTxt = Math.round(maalRise) + '–' + Math.round(maalRise * 1.2) + ' %';

  // Første trinn som er utbakt = når emnet må være ferdig FORMET. Formingen
  // (forforming → benkehvile → forming) skjer rett FØR det, og etter siste
  // gjæringstrinn gjenstår da bare temperering + kaldt snitt — IKKE en ny 45-min
  // romheving, som ville omformet et ferdig kaldhevet emne og degassert
  // blæreskinnet (baker-review, kritisk). Er ingen trinn utbakt (bulk i boks),
  // er «Bak ut og la hvile» rett, og gjør formingen der.
  const formIdx = trinn.findIndex(t => t.utbakt);
  const sisteUtbakt = trinn.length > 0 && trinn[trinn.length - 1].utbakt;
  /* «Temperer og snitt · fra kjøl» forutsetter at emnet FAKTISK kommer fra kjøl.
     Testen var bare `sisteUtbakt`, og på Samme dag og Ekspress er siste trinn en
     utbakt etterheving ved romtemperatur — så steget sa «ta emnene rett fra
     kjøl» om et emne som hadde stått på benken. */
  const sisteKaldt = sisteUtbakt && trinn[trinn.length - 1].miljo <= KALDGRENSE;
  const POSTPROOF = sisteUtbakt ? 30 : KJEDE.UTBAK;   // temperer+snitt vs bak-ut-og-hvile

  /* Formen bestemmer HVORDAN emnet hviler og hva teksten kan love.
     `kjede()` leste aldri `state.form`, så «Uten form» fikk beskjed om å legge
     emnet i hevekurv med god side ned — utstyr brukeren nettopp har sagt at han
     ikke bruker. */
  const formV = (typeof FORMER !== 'undefined' && FORMER.find(f => f.id === state.form)) || null;
  const ingenKurv = !!(formV && formV.ingenKurv);
  const iBrodform = !!(formV && formV.id === 'form');
  const hvileSted = ingenKurv ? 'på melet klede eller brett' : iBrodform ? 'i brødformen' : 'i hevekurven med god side ned';

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
  /* Eltesteget varer så lenge eltingen din faktisk tar, pluss veiing og
     opprydding rundt. Ett fast tall for alle maskiner var feil begge veier. */
  const eltSteg = KJEDE.ELT_FAST + (r.eltMin || 13);
  const eltStart = minus(peker, eltSteg);
  /* Autolyse ligger MELLOM forberedelse og elting: mel og vann blandes, hviler,
     og først da kommer salt og gjær i. Den har egen varighet og skyver derfor
     alt foran seg — derfor må den inn i kjeden og ikke bare stå som et råd i
     teksten. 0 = av. */
  const autoMin = Math.max(0, +(state.autolyseMin || 0));
  const autoStart = minus(eltStart, autoMin);
  const prepStart = minus(autoMin > 0 ? autoStart : eltStart, KJEDE.PREP);

  const steg = [];

  // 1 · Forferment (bare hvis på)
  if (r.ffPaa && r.forferment) {
    const ff = r.forferment;
    const ffStart = minus(eltStart, ff.timer * 60);
    steg.push({
      id: 'ff', navn: 'Sett ' + r.ffT.navn.toLowerCase() + 'en', tid: ffStart, varighet: ff.timer * 60, tone: 'noytral',
      hoved: gram(ff.mel), hovedNote: 'mel i forfermenten', sideK: 'Modning', sideV: fmtTimer(ff.timer),
      tall: [['Mel', gram(ff.mel)], ['Vann', gram(ff.vann)],
             ff.kultur
               ? ['Moden starter', fmt(ff.starter, 0) + ' g (' + fmt(ff.podePct, 0) + ' % av melet)']
               : ['Tørrgjær', fmt(ff.gjaer, 2) + ' g'],
             ['Temperatur', grader(ff.temp, 0)], ...(ff.salt > 0.05 ? [['Salt', fmt(ff.salt, 2) + ' g']] : [])],
      gjor: ff.kultur
        ? 'Rør ut ' + fmt(ff.starter, 0) + ' g moden surdeigsstarter i vannet, så melet i. Ingen kommersiell gjær her — det er kulturen som skal bygge levainen. Lokk på.'
        : 'Visp ut gjæren i vannet FØR melet — noen tiendedels gram fordeler seg ikke i tørt mel. ' +
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

  // 2b · Autolyse (bare hvis på)
  if (autoMin > 0) {
    /* Melet som skal autolyseres er HOVEDDEIGENS mel, ikke alt melet.
       Sto det `r.melTotal`, ba steget deg blande i forfermentens mel også — det
       melet står allerede i en bøtte og modner, og å ta det ut igjen er hverken
       mulig eller ønskelig. Samme sak for vannet: `r.vannHoved` var alt riktig,
       men melet var ikke, så tallene var ikke engang konsistente med hverandre. */
    const autoMel = r.melTotal - (r.ffPaa && r.forferment ? r.forferment.mel : 0);
    steg.push({
      id: 'autolyse', navn: 'Autolyse', tid: autoStart, varighet: autoMin, tone: 'noytral',
      hoved: fmtTimer(autoMin / 60), hovedNote: 'mel og vann hviler', sideK: 'Uten', sideV: 'salt og gjær',
      tall: [['Varighet', fmtTimer(autoMin / 60)], ['Mel (hoveddeigen)', gram(autoMel)], ['Vann', gram(r.vannHoved)],
             ['Salt og gjær', 'holdes utenfor'],
             ...(r.ffPaa ? [['Forfermenten', 'står for seg — kommer i ved elting']] : [])],
      gjor: 'Bland hoveddeigens mel og vann til det ikke er tørt mel igjen — ikke elt. La det hvile tildekket. Salt og gjær' +
            (r.ffPaa ? ' og forfermenten' : '') + ' kommer i når eltingen begynner.',
      sjekk: 'Deigen skal kjennes tydelig mykere og mer strekkbar enn da du blandet den. Det er enzymene og vannet som har gjort jobben elting ellers måtte gjort. ' +
             (autoMin <= 45
               ? 'På ' + Math.round(autoMin) + ' minutter er det mest hydreringen du henter — deigen blir smidigere og eltetiden kortere.'
               : 'Over en time begynner proteasene å myke opp glutenet i tillegg, og deigen blir merkbart mer strekkbar. Går den for lenge på svakt mel, blir den slapp i stedet for smidig.')
    });
  }

  // 3 · Elting
  steg.push({
    id: 'elt', navn: 'Elt deigen', tid: eltStart, varighet: eltSteg, tone: 'accent',
    hoved: grader(state.startTemp ?? 24, 1), hovedNote: 'deigtemp ut av maskinen', sideK: 'Vann inn', sideV: grader(r.vannTemp, 1),
    /* Gjærmengden hører hjemme HER, i steget der den skal på vekta — og det er
       hoveddeigens gjær, ikke totalen. Med forferment er differansen opptil en
       tredjedel, og totalen lest som «det du veier opp nå» er en overdose. */
    tall: [['Tørrgjær nå', fmt(r.ffPaa ? r.gjaerHoved : r.gjaerTotal, 2) + ' g'],
           ...(r.ffPaa ? [['(forfermenten har alt tatt', fmt(r.forferment.gjaer, 2) + ' g)']] : []),
           ['Salt', fmt(r.salt - (r.ffPaa && r.forferment ? (r.forferment.salt || 0) : 0), 1) + ' g'],
           ['Friksjon, ' + r.eltMin + ' min', '+' + grader(r.friksjon, 1)], ['Arbeid', fmt(r.wh, 1) + ' Wh/kg'],
           ['Meltemperatur', grader(state.melTemp ?? 21, 0)], ['Deigvekt', gram(r.totalVekt)]],
    gjor: (r.ffPaa ? 'Bruk ' + fmt(r.gjaerHoved, 2) + ' g tørrgjær her — resten står alt i forfermenten. ' : '') +
          'Salt de siste 2–3 minuttene. Stopp ved 60–75 % glutenutvikling — IKKE full vindusrute.',
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
             ['Andel av hoveddeigens gjæring', pst(andel, 0)], ...(tr.utbakt ? [['Emnestørrelse', gram(r.totalVekt / antall) + ' × ' + antall]] : [['Mål stigning', riseTxt]])],
      gjor: kaldt
        ? (tr.utbakt
            ? 'Emnene står UTILDEKKET ' + hvileSted + ' på kjøl — utildekket gir skinn, og skinn gir blemmer og rent snitt. Mesteparten av gjæringen skjer de første 6 timene, mens deigen ennå kjøles ned.'
            : 'Deigen står tett tildekket på kjøl. Mesteparten av gjæringen skjer de første 6 timene, mens den ennå kjøles ned.')
        : (i === 0 ? 'Brett i første halvdel, så ikke rør deigen etterpå. Bretting bygger struktur bare mens glutenet er tøyelig.'
                   : 'Følg emnene tett — hevevinduet er smalt når det er varmt.'),
      sjekk: kaldt ? 'Se på emnet før du steker: det skal ha vokst tydelig og kjennes luftig, ikke stinnt.'
                   : (tr.utbakt ? 'Trykktest før ovnen: gropen skal fylle seg langsomt igjen over 5–10 sekunder.'
                                : 'Sikt mot ' + riseTxt + ' stigning i målekrukka. Grovt mel og mye vann tåler mindre stigning enn en loff — går den lenger, mister den løftet i ovnen.'),
      krukke: !tr.utbakt || !kaldt
    });
  });

  // Forming — foran det utbakte kaldhevingstrinnet (bare når et trinn er utbakt).
  if (formTid) {
    steg.push({
      id: 'form', navn: 'Form emnene', tid: formTid.start, varighet: KJEDE.FORM, tone: 'accent',
      hoved: gram(r.totalVekt / antall), hovedNote: 'per emne · ' + antall + ' emner', sideK: 'Benkehvile', sideV: '15–20 min',
      tall: [['Antall emner', String(antall)], ['Vekt per emne', gram(r.totalVekt / antall)],
             ['Forforming', 'rund opp, hvil 15–20 min'],
             ['Forming', 'stram overflatespenning, ' + hvileSted],
             ...(formV ? [['Form', formV.navn]] : [])],
      gjor: 'Forform lett til runde emner, la dem hvile 15–20 min under klede, form så stramt og legg dem ' + hvileSted + '. Håndter bare de ytterste millimeterne.' +
            (ingenKurv ? ' Uten kurv er det bare glutennettverket som holder fasongen — form strammere enn du ville gjort i en kurv, og la emnet stå kort.' : ''),
      sjekk: ingenKurv
        ? 'Emnet skal holde en stram kuppel av seg selv. Flyter det utover på brettet allerede nå, er det for vått eller for lite utviklet for fri heving — bruk kurv eller form neste gang.'
        : 'Emnet skal holde en stram kuppel og ikke flyte ut når du slipper det. Flyter det, trenger deigen mer struktur eller mindre vann.'
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
  if (sisteUtbakt && sisteKaldt) {
    steg.push({
      id: 'snitt', navn: 'Temperer og snitt', tid: postStart, varighet: POSTPROOF, tone: 'noytral',
      hoved: gram(r.totalVekt / antall), hovedNote: 'per emne · ' + antall + ' emner', sideK: 'Fra kjøl', sideV: POSTPROOF + ' min',
      tall: [['Antall emner', String(antall)], ['Vekt per emne', gram(r.totalVekt / antall)], ['Fra kjøl', 'snitt kaldt, rett i ovnen'], ['Benkestå', 'kort — ingen ny heving']],
      gjor: 'Ta emnene rett fra kjøl, vend på plata med god side opp, og snitt kaldt — kald deig holder snittet bedre. IKKE form på nytt: da degasser du blæreskinnet du nettopp bygde.',
      sjekk: 'Snittet skal åpne seg rent. Emnet er kaldt og fast — det er riktig; ovnsløftet kommer i ovnen, ikke på benken.'
    });
  } else if (sisteUtbakt) {
    // Utbakt, men varmt: emnet står ferdig hevet på benken, ikke i skapet.
    steg.push({
      id: 'snitt', navn: 'Snitt og sett inn', tid: postStart, varighet: POSTPROOF, tone: 'noytral',
      hoved: gram(r.totalVekt / antall), hovedNote: 'per emne · ' + antall + ' emner', sideK: 'Fra benken', sideV: POSTPROOF + ' min',
      tall: [['Antall emner', String(antall)], ['Vekt per emne', gram(r.totalVekt / antall)], ['Fra benken', 'romtemperert, ferdig hevet'], ['Benkestå', 'ingen ny heving']],
      gjor: 'Emnet er ferdig hevet i romtemperatur. Vend det på plata med god side opp og snitt rett før det går inn. IKKE form på nytt: da degasser du det du nettopp bygde. Et romtemperert emne er mykere enn et kaldt, så bladet må være vått og draget bestemt.',
      sjekk: 'Trykktest: gropen skal fylle seg langsomt igjen over 5–10 sekunder. Fyller den seg ikke, er emnet overhevet — sett det inn med én gang.'
    });
  } else {
    steg.push({
      id: 'utbak', navn: 'Bak ut og la hvile', tid: postStart, varighet: POSTPROOF, tone: 'noytral',
      hoved: gram(r.totalVekt / antall), hovedNote: 'per emne · ' + antall + ' emner', sideK: 'Benkehvile', sideV: POSTPROOF + ' min',
      tall: [['Antall emner', String(antall)], ['Vekt per emne', gram(r.totalVekt / antall)], ['Benkehvile', POSTPROOF + ' min'],
             ...(formV ? [['Hviler', hvileSted]] : [])],
      gjor: 'Forform, hvil 15–20 min, form stramt og la hvile ' + hvileSted + '. Håndter bare de ytterste 1 cm. Ta av håndkleet 10 minutter før ovnen så skorpa tørker.',
      sjekk: 'Trykktest: gropen skal fylle seg langsomt igjen over 5–10 sekunder og etterlate et synlig merke.'
    });
  }

  // Stek
  steg.push({
    id: 'stek', navn: 'Stek', tid: innsetting, varighet: stekeMin, tone: 'accent',
    hoved: forstTall(prof.tid) + ' min', hovedNote: prof.inn + ' → ' + prof.ned + ' °C', sideK: 'Kjerne', sideV: prof.kjerne,
    tall: [['Inn på', prof.inn + ' °C'], ['Ned til', prof.ned + ' °C ' + (prof.nedNaar || '')], ['Damp', prof.damp], ['Rist', prof.rist]],
    /* «Lokket gjør jobben» gjelder bare når det FINNES et lokk.
       Testen sto på damp-teksten, og både gryta og stekebrettet sier «ingen
       tilsatt» — så et brød på stekebrett fikk beskjed om å legge på et lokk det
       ikke har, og om at gryta ordner dampen. Da er rådet ikke bare unyttig, det
       er villedende: på brett er det nettopp mangelen på damp man må gjøre noe
       med. `lokket` står nå på profilen selv. */
    gjor: prof.lokket
      ? 'Ingen damp å tilsette — lokket/gryta gjør jobben. Ett bestemt drag med buet blad før lokket på.'
      : (prof.damp === 'ingen' || String(prof.damp).startsWith('ingen'))
        ? 'Ingen forvarmet masse og ingen gryte her, så dampen må du lage selv: sett en form med kokende vann i bunnen av ovnen når du setter inn brødet, og ta den ut etter 15 minutter. Ett bestemt drag med buet blad før det går inn.'
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
  /* Tiden fram til brødet er UTE AV OVNEN, altså «ferdig» slik resten av appen
     bruker ordet. `totalT` inkluderer nedkjølingen, som er 2–3 timer og lik for
     hver eneste plan — så en «Ekspress» kom ut på nesten åtte timer og så ut som
     alt annet enn ekspress. Planvalget skal sammenlignes på det som faktisk
     skiller planene. */
  const utAvOvnen = steg.filter(x => x.id !== 'kjol');
  const sisteFoerKjol = utAvOvnen[utAvOvnen.length - 1] || siste;
  steg.tilOvnenT = (sisteFoerKjol.tid.getTime() + sisteFoerKjol.varighet * 60000 - steg[0].tid.getTime()) / 3600000;
  steg.kjolT = steg.totalT - steg.tilOvnenT;
  steg.filter(x => x.id === 'kjol').forEach(x => { x.sideV = fmt(steg.totalT, 1) + ' t'; });
  steg.start = steg[0].tid;
  steg.ferdig = ferdig;
  steg.maalRise = maalRise;
  steg.maalRiseTxt = riseTxt;
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
/* Ukedagen i STORE bokstaver, uten punktum: «FRE 19:57».
   Med «fre. kl. 19:57» leste forkortelsen som et halvt ord med en skrivefeil i,
   og punktumet midt i en tidsangivelse er bare støy. Store bokstaver sier at
   det er en forkortelse, og gjør den lett å skille fra klokkeslettet ved siden
   av — man skal kunne se hvilken dag et steg faller på i et blikk. */
function klokke(dato) {
  const dag = dato.toLocaleDateString('nb-NO', { weekday: 'short' }).replace(/\.$/, '').toUpperCase();
  return dag + ' ' + dato.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

/* Benevnelser skrives alltid bak tallet, ikke bare i kolonneoverskriften —
   det gjør det langt vanskeligere å lese feil rad når man står og baker. */
function gram(v, d = 0)   { return fmt(v, d) + ' g'; }
function pst(v, d = 1)    { return fmt(v, d) + ' %'; }
function kron(v)          { return fmt(v, 2) + ' kr'; }
function grader(v, d = 1) { return fmt(v, d) + ' °C'; }
