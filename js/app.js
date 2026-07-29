/* ============================================================
   FORGE BAKERY — brukergrensesnitt
   ============================================================ */

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; };

/* ---------- Tilstand ---------- */
const S = {
  // Hva som skal bakes, og i hvilken form. Dette er det ØVERSTE valget: det
  // avgjør hvilken av appens to veier som gjelder (se BROTYPER), og dermed
  // hvilke faner som er hovedvei og hvilke som er fordypning. Før lå brødtypen
  // gjemt i en nedtrekksliste inne på «Oppskrift», mens startfanen «Bygg brød»
  // stilltiende antok et rundbrød — så valgte man ciabatta, kunne man fortsatt
  // sitte og dra i en grovhetsdial som ikke hadde noe med ciabatta å gjøre.
  brotype: 'grovbrod',
  // Avlang er standard fordi det er kurvene som faktisk står i kjøkkenet her.
  // Merk at formen ikke er kosmetikk: den styrer hvilket stekeutstyr som får
  // plass rundt emnet, og et avlangt emne passer ikke under en rund gryte.
  form: 'avlang',
  presetId: 'brod_standard',
  melListe: [], froListe: [],
  hydrering: 70, saltPct: 1.8, honningPct: 0, oljePct: 0, sukkerPct: 0, smorPct: 0, maltPct: 0,
  antall: 4, vektPerBrod: 900, froVannPaaToppen: true,
  forferment: { bruk: true, type: 'poolish', pctMel: 25, hydrering: 100, timer: 14, temp: 22 },
  gjaerType: 'torr', gjaerPct: 0.3,
  startTemp: 24,
  plan: [], refDose: null,
  masseKg: 4, lokk: true, fulltKjol: false,
  maalDose: null,
  byggGrovhet: 1, byggTid: 'optimal', byggTillegg: {}, byggUtstyr: 'glass',
  byggAntall: 2, byggVekt: 900,
  // Stekeprofilen følger oppskriften, ikke forvalget. Før lå den bare i
  // forvalget, så et brød bygget i «Bygg brød» arvet stekeprofilen til det
  // forvalget som tilfeldigvis stod i velgeren — typisk baguetter til et
  // 900 g rundbrød. Nå settes den av utstyret du velger, og kan overstyres.
  stekeProfil: null,
  // Tidspunktet alt regnes bakover fra, pluss de to manuelle bolkene.
  // Lå tidligere bare i DOM-en, så Tidsplan og grafen kunne komme i utakt.
  planFerdig: null, planUtbak: 45, planElt: 75,
  // Deigtemperatur-oppsettet. Lå også bare i DOM-en, uten lagring — og eltetiden
  // stod på 8 minutter, mens bakekjeden gjettet «høyst 12». Friksjonsvarmen er
  // tid × intensitet, så eltetiden er den enkeltverdien som avgjør
  // vanntemperaturen. Den hører hjemme i tilstanden, ikke i en defaultverdi.
  // Eltetiden har ingen fast standardverdi. Den utledes av maskinen, slik at
  // arbeidet lander midt i målsonen på 3–5 Wh/kg. Her stod det tidligere 18,
  // som var brukerens egen vane hardkodet inn — nøyaktig det han ba om at ikke
  // skulle styre anbefalingene. null betyr «ikke satt», og settes ved oppstart.
  eltMin: null, dtMelTemp: 21, dtSpring: 12, dtFfTemp: 18,
  dtMikser: 'spiralHjemme', dtEgen: 0.5,
  // Vektas minste avlesning. Appen advarte tidligere fast under 0,3 g, som er
  // riktig for en vanlig kjøkkenvekt på 1 g — og helt feil for en finvekt.
  // Med 0,01 g er 1,42 g gjær en triviell veiing, ikke et problem.
  vektTrinn: 0.01,
  // Meltyper du har stjernemerket. Løftes til toppen av melvelgeren, slik at et
  // bibliotek på snart 30 meltyper ikke gjør den daglige bruken tyngre.
  favorittMel: [],
  // Framdrift i «Bak nå»: hvilke steg som er huket av, og når hvert ble gjort.
  bakHuket: {}, bakStartet: null,
  logg: []
};

/* Hvilken stekeprofil hører til utstyret du valgte i «Bygg brød»? */
const UTSTYR_PROFIL = {
  stal15:    'brod_kloke',
  glass:     'brod_glass_stal',
  glass_stal:'brod_glass_stal',
  stopejern: 'brod_gryte',
  apen:      'brod_apen'
};

/* Én kilde til hvilken stekeprofil som gjelder — brukt av Tidsplan, Steking
   og Bak nå, slik at de tre aldri kan si tre forskjellige ting. */
function aktivProfil() {
  return BAKE_PROFILES.find(p => p.id === S.stekeProfil)
      || BAKE_PROFILES.find(p => p.id === (PRESETS.find(x => x.id === S.presetId) || {}).steking)
      || BAKE_PROFILES[0];
}

/* ---------- Lagring ---------- */
/* Nøkkelnavnet er historisk (appen het Brødlab) og skal IKKE endres:
   bytter man nøkkel, mister alle eksisterende brukere lagret tilstand. */
const LAGER = 'brodlab.v1';
function lagre() {
  try {
    localStorage.setItem(LAGER, JSON.stringify({
      brotype: S.brotype, form: S.form, stekeProfilManuell: S.stekeProfilManuell,
      presetId: S.presetId, melListe: S.melListe, froListe: S.froListe,
      hydrering: S.hydrering, saltPct: S.saltPct, honningPct: S.honningPct, oljePct: S.oljePct,
      sukkerPct: S.sukkerPct, smorPct: S.smorPct, maltPct: S.maltPct,
      antall: S.antall, vektPerBrod: S.vektPerBrod, forferment: S.forferment, froVannPaaToppen: S.froVannPaaToppen,
      gjaerType: S.gjaerType, gjaerPct: S.gjaerPct, startTemp: S.startTemp,
      plan: S.plan, maalDose: S.maalDose, lokk: S.lokk, fulltKjol: S.fulltKjol, logg: S.logg,
      byggGrovhet: S.byggGrovhet, byggTid: S.byggTid, byggTillegg: S.byggTillegg,
      byggUtstyr: S.byggUtstyr, byggAntall: S.byggAntall, byggVekt: S.byggVekt,
      stekeProfil: S.stekeProfil, bakHuket: S.bakHuket, bakStartet: S.bakStartet,
      planFerdig: S.planFerdig, planUtbak: S.planUtbak, planElt: S.planElt,
      eltMin: S.eltMin, dtMelTemp: S.dtMelTemp, dtSpring: S.dtSpring,
      dtFfTemp: S.dtFfTemp, dtMikser: S.dtMikser, dtEgen: S.dtEgen,
      vektTrinn: S.vektTrinn, favorittMel: S.favorittMel, eltMigrert: S.eltMigrert,
      grovMigrert: S.grovMigrert
    }));
  } catch (e) { /* privat modus e.l. */ }
}
function last() {
  try {
    const d = JSON.parse(localStorage.getItem(LAGER) || 'null');
    if (d) Object.assign(S, d);
  } catch (e) {}

  /* Lagret tilstand er uvalidert JSON, gjerne skrevet av eldre versjoner av
     appen (nøkkelen har fulgt med siden Brødlab-tiden). Alt motoren regner på
     vaskes derfor her: én ukjent frø-id eller et hevetrinn uten miljø gir
     ellers unntak eller stille NaN gjennom samtlige visninger. */
  const tall = v => typeof v === 'number' && isFinite(v);
  if (!Array.isArray(S.melListe)) S.melListe = [];
  S.melListe = S.melListe.filter(m => m && FLOURS.some(f => f.id === m.id) && tall(m.pct) && m.pct >= 0);
  if (!Array.isArray(S.froListe)) S.froListe = [];
  S.froListe = S.froListe.filter(f => f && SOAKERS.some(s => s.id === f.id) && tall(f.gram) && f.gram >= 0);
  if (!Array.isArray(S.plan)) S.plan = [];
  S.plan = S.plan.filter(t => t && tall(t.timer) && t.timer >= 0 && tall(t.miljo));
  const ffOk = S.forferment && typeof S.forferment === 'object'
    && tall(S.forferment.pctMel) && tall(S.forferment.hydrering)
    && tall(S.forferment.timer) && tall(S.forferment.temp);
  // Står oppskriften uten mel eller plan etter vasken, er tilstanden ubrukelig —
  // da lastes forvalget på nytt i stedet for å regne på ingenting. Bakeloggen
  // og andre felter som overlevde vasken røres ikke av dette.
  if (!S.melListe.length || !S.plan.length || !ffOk) {
    if (!PRESETS.some(p => p.id === S.presetId)) S.presetId = PRESETS[0].id;
    brukPreset(S.presetId);
  }

  // Skalarfeltene motoren deler og multipliserer med må også klemmes — en
  // streng, NaN eller 0 her gir NaN gjennom hele oppskriften uten feilmelding.
  const klem = (k, min, max, fallback) => {
    if (!tall(S[k]) || S[k] < min || S[k] > max) S[k] = fallback;
  };
  klem('hydrering', 40, 120, 70);
  klem('saltPct', 0, 5, 1.8);
  klem('gjaerPct', 0.001, 5, 0.3);
  klem('antall', 1, 100, 4);
  klem('vektPerBrod', 100, 5000, 900);
  klem('startTemp', 5, 35, 24);
  klem('byggAntall', 1, 100, 2);
  klem('byggVekt', 100, 5000, 900);
  // Beholderne som dereferes direkte ved første oppdater() — null her krasjer
  // før noen fallback rekker å slå inn.
  if (!S.byggTillegg || typeof S.byggTillegg !== 'object') S.byggTillegg = {};
  if (!Array.isArray(S.favorittMel)) S.favorittMel = [];
  if (!Array.isArray(S.logg)) S.logg = [];
  if (!S.bakHuket || typeof S.bakHuket !== 'object') S.bakHuket = {};
  // Forfermenttemperatur på 0–3 °C passerer talltesten men gir Infinity i
  // forfermentGjaerPct — gjær gjør uansett ingenting der.
  if (S.forferment && tall(S.forferment.temp) && (S.forferment.temp < 4 || S.forferment.temp > 35)) S.forferment.temp = 22;

  // Peker det lagrede forvalget på noe som ikke finnes lenger — fordi et forvalg
  // er fjernet — er hele oppskriften i tilstanden arvet fra det forvalget. Da er
  // det ærligere å laste et gyldig forvalg enn å la appen stå med en oppskrift
  // uten opphav og en tom velger. Bakeloggen røres ikke.
  if (!PRESETS.some(p => p.id === S.presetId)) {
    S.presetId = PRESETS[0].id;
    brukPreset(S.presetId);
  }

  // Tilstand lagret før startsiden fantes har ingen brødtype. Den skal ikke
  // settes til en standardverdi — da ville et lagret ciabatta-oppsett plutselig
  // påstå at du baker grovbrød. Den utledes av forvalget, som ER opphavet til
  // oppskriften som ligger der. Finnes ingen match, faller vi tilbake på den
  // typen som deler forvalg med det lagrede.
  if (!BROTYPER.some(t => t.id === S.brotype)) {
    const t = BROTYPER.find(x => x.preset === S.presetId);
    S.brotype = t ? t.id : 'grovbrod';
  }
  if (!FORMER.some(f => f.id === S.form)) S.form = 'avlang';

  // Eltetiden utledes av maskinen. Lagret tilstand kan inneholde den gamle
  // hardkodede 18-eren, som aldri var et brukervalg — den ryddes bort én gang.
  // Etter det står brukerens egne endringer i fred, for da er flagget satt.
  if (!S.eltMigrert) { S.eltMin = anbefaltEltMin(); S.eltMigrert = true; }
  if (!S.eltMin || !isFinite(S.eltMin)) S.eltMin = anbefaltEltMin();

  /* Grovhetstrappa ble bygget om etter Brødskala'n 29.07.2026, og trinnene
     betyr nå noe annet enn de gjorde. Gammel trapp var 0/10/20/30/40 %, ny er
     0/10/25/40/60/80 %. Uten migrering ville et lagret valg på indeks 4 gått
     stille fra 40 % til 60 % grovt — altså et helt annet brød enn det som stod
     der da appen sist ble lukket. Vi flytter til trinnet med NÆRMEST samme
     grovhet, ikke til samme indeks.                                        */
  if (!S.grovMigrert) {
    const gammelPct = [0, 10, 20, 30, 40];
    const gammel = gammelPct[S.byggGrovhet];
    if (gammel !== undefined) {
      const nyPct = GROVHET.map(g => parseFloat(g.kort));
      let best = 0;
      nyPct.forEach((p, i) => {
        if (Math.abs(p - gammel) < Math.abs(nyPct[best] - gammel)) best = i;
      });
      S.byggGrovhet = best;
    }
    S.grovMigrert = true;
  }
  if (!GROVHET[S.byggGrovhet]) S.byggGrovhet = 1;
}

/* ---------- Preset ---------- */
function brukPreset(id, behold) {
  const p = PRESETS.find(x => x.id === id); if (!p) return;
  S.presetId = id;
  if (!behold) {
    S.melListe = p.mel.map(m => ({ ...m }));
    S.froListe = p.fro.map(f => ({ ...f }));
    S.hydrering = p.hydrering; S.saltPct = p.salt;
    S.honningPct = 0; S.oljePct = p.id === 'focaccia' ? 5 : 0; S.sukkerPct = 0; S.smorPct = 0; S.maltPct = 0;
    S.antall = p.antall; S.vektPerBrod = p.vektPerBrod;
    S.forferment = { ...p.forferment };
    S.gjaerType = p.gjaerType; S.gjaerPct = p.gjaerPct;
    S.startTemp = p.refPlan[0].temp ?? 24;
    S.plan = p.refPlan.map(t => ({ ...t }));
    S.stekeProfil = p.steking;
    S.bakHuket = {}; S.bakStartet = null;
  }
  // Måldosen ble aldri nullstilt her, så den fulgte med fra forrige brød og
  // tegnGjaering() satte den bare når den var null. Resultatet var at appen
  // samtidig kunne si «avvik +0 %» og «kaldhevingen må mer enn dobles».
  S.refDose = null; S.maalDose = null;
}

function refDoseFor(presetId) {
  const p = PRESETS.find(x => x.id === presetId); if (!p) return null;
  const r = beregnOppskrift(oppskriftInn(p));
  const torr = tilTorrPct(p.gjaerPct, p.gjaerType);
  return planDose(p.refPlan, torr, r.masseKg, { lokk: true, antall: p.antall }).dose;
}

function oppskriftInn(p) {
  return {
    melListe: p.mel, froListe: p.fro, hydrering: p.hydrering / 100,
    saltPct: p.salt, honningPct: 0, oljePct: 0, sukkerPct: 0, smorPct: 0, maltPct: 0,
    gjaerPct: p.gjaerPct, gjaerType: p.gjaerType, forferment: p.forferment,
    antall: p.antall, vektPerBrod: p.vektPerBrod
  };
}

/* ============================================================
   BRØDTYPE, FORM OG RUTE
   ============================================================ */

function aktivBrotype() { return BROTYPER.find(t => t.id === S.brotype) || BROTYPER[1]; }
function aktivForm()    { return FORMER.find(f => f.id === S.form) || FORMER[0]; }

/* Emnets største mål. Brukes til å avgjøre om det i det hele tatt får plass
   under en gryte — det er den vanligste grunnen til at «bruk gryte» slutter å
   være et gyldig råd, og appen sa det ikke noe sted før. */
function emneMaal(vekt) {
  const f = aktivForm();
  if (!f.kFaktor) return null;
  return { cm: f.kFaktor * Math.cbrt(Math.max(vekt, 1)), maal: f.maal, form: f };
}

/* Stekeprofilen som hører til utstyr + form.
   UTSTYR_PROFIL alene er ikke nok: den sender 15 mm stål til «glasset som kloke
   over», og en kloke må faktisk dekke emnet. For et avlangt emne er det ikke
   gitt at den gjør det, så da er åpen steking med dampkar det ærlige svaret —
   det virker uansett lengde. */
function profilForUtstyr(utstyrId, formId) {
  if (utstyrId === 'stal15' && formId === 'avlang') return 'brod_apen';
  return UTSTYR_PROFIL[utstyrId] || 'brod_apen';
}

/* Committer det «Bygg brød» viser til den faktiske oppskriften.
   Lå tidligere bare inni klikkhandleren på #byggBruk. Startsiden må gjøre
   nøyaktig det samme når du velger en bygg-type, og to kopier av denne koden
   ville vært en garantert kilde til at fanene kom i utakt. */
function brukByggOppskrift(o = {}) {
  const B = byggOppskrift();
  S.melListe = B.gr.mel.map(m => ({ ...m }));
  S.froListe = B.r.fro.map(f => ({ id: f.id, gram: Math.round(f.gram), varmt: f.varmt }));
  S.hydrering = +(B.hyd * 100).toFixed(1);
  S.saltPct = 2.0;
  S.honningPct = B.smak.honningPct || 0;
  S.maltPct = B.smak.maltPct || 0;
  S.oljePct = B.smak.oljePct || 0;
  S.sukkerPct = 0; S.smorPct = 0;
  S.gjaerType = 'torr'; S.gjaerPct = +B.gjaerPct.toFixed(3);
  S.forferment = { ...B.tp.forferment };
  S.antall = S.byggAntall; S.vektPerBrod = S.byggVekt;
  S.plan = B.plan.map(s => ({ ...s }));
  S.startTemp = 24;
  S.froVannPaaToppen = true;
  // Måldosen skal være det planen SIKTER mot, ikke det den oppnådde. Satte vi
  // den til det oppnådde, ble avviket alltid «+0 %» — også når gjæren står på
  // det praktiske taket og planen ikke rekker fram. Da skjulte nøkkeltallet
  // nøyaktig det problemet «Bygg brød» advarer om i rødt like ved siden av.
  S.refDose = B.g.dose; S.maalDose = B.maalDose;
  // Har brukeren selv valgt stekeprofil i «Bak nå», skal den overleve. Startsiden
  // ber uttrykkelig om nettopp den overstyringen når et avlangt emne kanskje ikke
  // passer under gryta — da kan ikke hver eneste justering kaste valget hans.
  if (!S.stekeProfilManuell) S.stekeProfil = profilForUtstyr(S.byggUtstyr, S.form);
  // Framdriften nullstilles bare når brødet faktisk byttes ut, ikke hver gang en
  // slider beveger seg. Ellers ville avhukingen i «Bak nå» forsvinne mens man
  // finjusterer, og det er den ene tingen man ikke har råd til å miste midt i et bak.
  if (o.nullstillFramdrift) { S.bakHuket = {}; S.bakStartet = null; }
}

/* Enhver justering i «Bygg brød» skriver rett til den ekte oppskriften.
   Før kalte klikkhandlerne bare tegnBygg(), så fanen var en frakoblet
   forhåndsvisning: man kunne dra grovheten til «Kraftig» og tiden til «Ekspress»
   og se 0,833 % gjær der, mens Oppskrift, Gjæring, Tidsplan og «Bak nå» fortsatt
   regnet med 0,179 % — en faktor 4,7 — og hevekurven tegnet en kaldheving
   brukeren nettopp hadde valgt bort. «Bruk denne» var eneste vei ut, og den
   knappen leses som navigasjon, ikke som lagring. Nå er dialene levende. */
function byggEndret() { brukByggOppskrift(); lagre(); oppdater(); }

/* Velger brødtype og gjør HELE appen konsistent med den med én gang.
   Poenget er at du ikke skal kunne stå i «Oppskrift» og se et grovbrød mens
   startsiden sier ciabatta. Begge veier ender med en ferdig oppskrift i S. */
function velgBrotype(id) {
  const t = BROTYPER.find(x => x.id === id); if (!t) return;
  const byttet = S.brotype !== id;
  S.brotype = id;

  // Bytter du brød, skal ingenting fra det forrige henge igjen. Måldosen er den
  // farligste: den ble aldri nullstilt, så et grovbrøds 1,82 ble liggende når man
  // gikk til ciabatta — og da sa nøkkeltallene «avvik +0 %» mens panelet under
  // krevde at kaldhevingen skulle mer enn dobles, fordi de to målte mot hvert
  // sitt tall. Stekeprofil-overstyringen hører til det forrige brødet den også.
  if (byttet) { S.maalDose = null; S.refDose = null; S.stekeProfilManuell = false; }

  if (t.rute === 'bygg') {
    // Grovhet, antall og vekt er typens startpunkt — dialene står fritt etterpå.
    S.byggGrovhet = t.grovhet;
    S.byggAntall = t.antall; S.byggVekt = t.vekt;
    S.byggUtstyr = aktivForm().utstyr;
    // Forvalget følger med, slik at «Tilbakestill til forvalgets plan» og
    // referansedosen peker på noe som hører til brødet du faktisk bygger.
    S.presetId = t.preset;
    brukByggOppskrift({ nullstillFramdrift: byttet });
  } else {
    // Ferdig kalibrert deig. brukPreset setter mel, hydrering, plan og steking.
    brukPreset(t.preset);
  }
  lagre();
}

/* Formen bytter stekeutstyr, men bare for de typene der formen er et valg —
   ciabatta og focaccia formes ikke i kurv. */
function velgForm(id) {
  const f = FORMER.find(x => x.id === id); if (!f) return;
  S.form = id;
  if (aktivBrotype().harForm) {
    S.byggUtstyr = f.utstyr;
    // Respekter en profil brukeren selv har satt. Før overskrev denne linja
    // valget hans hver gang han trykket på samme formkort på nytt.
    if (!S.stekeProfilManuell) S.stekeProfil = profilForUtstyr(f.utstyr, id);
    brukByggOppskrift();
  }
  lagre();
}

/* Veien gjennom appen, per rute. Fanenavnene leses ut av navigasjonen i stedet
   for å skrives av her — ett sted å endre dem. */
const RUTER = {
  bygg: {
    hoved: [
      ['start',   'Velg brødtype, form og kurv'],
      ['bygg',    'Sett grovhet, tid og tillegg. Appen løser gjærmengden for deg'],
      ['baknaa',  'Bak, med klokkeslett og avhuking']
    ],
    juster: ['oppskrift', 'gjaering', 'deigtemp', 'plan'],
    ikke: []
  },
  preset: {
    hoved: [
      ['start',      'Velg brødtype'],
      ['oppskrift',  'Deigen er ferdig kalibrert. Juster antall og vekt om du vil'],
      ['baknaa',     'Bak, med klokkeslett og avhuking']
    ],
    juster: ['gjaering', 'deigtemp', 'plan'],
    ikke: ['bygg']
  }
};

const OPPSLAG = ['steking', 'melbibliotek', 'teknikk', 'logg'];

/* Fanenavnene bor her, ikke i markupen — de brukes av navigasjonen, rutestripa,
   rutefoten og mobilvelgeren, og skal skrives ett sted. */
const FANENAVN = {
  start: 'Start', bygg: 'Bygg brød', oppskrift: 'Oppskrift',
  gjaering: 'Gjæring & tid', deigtemp: 'Deigtemp', plan: 'Tidsplan',
  baknaa: 'Bak nå', steking: 'Steking', melbibliotek: 'Mel & korn',
  teknikk: 'Teknikk', logg: 'Bakelogg'
};
function faneNavn(v) { return FANENAVN[v] || v; }

/* Elleve faner på én rad er ikke en meny, det er en liste. Gruppert i fire
   følger toppnivået prosessen — velg brødet, planlegg det, bak det — og
   oppslagsstoffet er samlet for seg i stedet for å konkurrere med handlingene.
   Selve <section>-ene er urørt; dette er bare navigasjon. */
const GRUPPER = [
  { id: 'brodet',  navn: '① Brødet',    views: ['start', 'bygg', 'oppskrift'] },
  { id: 'prosess', navn: '② Prosessen', views: ['gjaering', 'deigtemp', 'plan'] },
  { id: 'baking',  navn: '③ Bak nå',    views: ['baknaa'] },
  { id: 'oppslag', navn: 'Oppslag',     views: OPPSLAG }
];

const gruppeSist = {};
function gruppeFor(v) { return GRUPPER.find(g => g.views.includes(v)) || GRUPPER[0]; }

/* Toppnivået bygges én gang. Trykker du på en gruppe, havner du i den fanen du
   sist var i der — ikke tilbake på start hver gang. */
function byggNav() {
  const n = $('#nav'); if (!n) return;
  n.innerHTML = '';
  GRUPPER.forEach(g => {
    const b = el('button', null, g.navn);
    b.dataset.g = g.id;
    b.onclick = () => vis(g.views.includes(gruppeSist[g.id]) ? gruppeSist[g.id] : g.views[0]);
    n.appendChild(b);
  });
}

/* Undernivået tegnes på nytt ved hvert fanebytte, fordi det bare skal vise
   valgene i den aktive gruppen. «③ Bak nå» har én fane, og da forsvinner raden
   helt i stedet for å stå igjen som en tom stripe. */
function tegnUndernav(v) {
  const g = gruppeFor(v);
  const un = $('#undernav'), sel = $('#undernavSel');
  const wrap = document.querySelector('.undernavwrap');
  if (wrap) wrap.style.display = g.views.length > 1 ? '' : 'none';
  if (!un || !sel) return;

  un.innerHTML = '';
  g.views.forEach(w => {
    const b = el('button', w === v ? 'on' : null, faneNavn(w));
    b.dataset.v = w;
    b.onclick = () => vis(w);
    un.appendChild(b);
  });

  sel.innerHTML = '';
  g.views.forEach(w => {
    const o = el('option', null, faneNavn(w));
    o.value = w; if (w === v) o.selected = true;
    sel.appendChild(o);
  });
  sel.onchange = () => vis(sel.value);

  merkRute();
}

/* Markerer hovedveien og de fanene som ikke gjelder for valgt brødtype.
   Lå tidligere på #nav; flyttet ett nivå ned da toppnivået ble grupper. */
function merkRute() {
  const R = RUTER[aktivBrotype().rute]; if (!R) return;
  const hoved = new Set(R.hoved.map(x => x[0]));
  const ikke = new Set(R.ikke);
  $$('#undernav button').forEach(b => {
    b.classList.toggle('rute', hoved.has(b.dataset.v));
    b.classList.toggle('utenfor', ikke.has(b.dataset.v));
  });
  $$('#nav button').forEach(b => {
    const g = GRUPPER.find(x => x.id === b.dataset.g);
    b.classList.toggle('rute', !!g && g.views.some(w => hoved.has(w)));
  });
}

/* Rutefoten: hvor er jeg, og hva er neste steg? Uten den var ruta bare synlig på
   startsiden — og «Oppskrift», som ER steg 2 av 3 for ciabatta, baguetter og
   focaccia, hadde ingen vei videre i det hele tatt. */
function tegnRutefot(v) {
  const sec = $('#v-' + v); if (!sec) return;
  const R = RUTER[aktivBrotype().rute];
  const idx = R.hoved.findIndex(x => x[0] === v);
  const erFordyp = R.juster.includes(v);
  let fot = sec.querySelector('.rutefot');
  if (idx < 0 && !erFordyp) { if (fot) fot.remove(); return; }
  if (!fot) { fot = el('div', 'rutefot'); sec.appendChild(fot); }

  if (idx >= 0) {
    const neste = R.hoved[idx + 1], forrige = R.hoved[idx - 1];
    fot.innerHTML =
      `<span class="rutefot-n">Steg ${idx + 1} av ${R.hoved.length}</span>
       <span class="small">${aktivBrotype().navn}</span>
       <span class="rutefot-k">
         ${forrige ? `<button class="btn ghost sm" data-go="${forrige[0]}">◂ ${faneNavn(forrige[0])}</button>` : ''}
         ${neste ? `<button class="btn sm" data-go="${neste[0]}">${faneNavn(neste[0])} ▸</button>` : ''}
       </span>`;
  } else {
    fot.innerHTML =
      `<span class="small">Finjustering — hovedveien går utenom denne fanen.</span>
       <span class="rutefot-k">
         ${R.hoved.map(([w], i) => `<button class="btn ghost sm" data-go="${w}">${i + 1}. ${faneNavn(w)}</button>`).join(' ')}
       </span>`;
  }
  fot.querySelectorAll('[data-go]').forEach(b => b.onclick = () => vis(b.dataset.go));
}


/* ---------- Tegninger av korn og frø ----------
   Samme rutenett for alle, så størrelsesforskjellene mellom kornslagene er
   ekte og ikke normalisert bort. `grov` gir en mørkere fyllfarge, slik at
   sammalt og siktet av samme korn er visuelt forskjellige. */
function kornSvg(id, o = {}) {
  const k = KORN_SVG[id];
  if (!k) return '';
  const h = o.h || 42;
  // Sammalt mel er hele kornet, altså med kli og kim. Det tegnes mørkere enn
  // det siktede av samme korn, slik at de to ikke ser like ut i lista.
  const morkere = c => o.grov ? blandFarge(c, '#4a3520', 0.42) : c;
  return `<svg class="korn" viewBox="0 0 40 60" width="${h * 40 / 60}" height="${h}"
    role="img" aria-label="${o.alt || id}"
    style="--kf:${morkere(k.farge)};--kk:${morkere(k.kant)}">${k.svg}</svg>`;
}

/* Blander to hex-farger. Brukes til å gjøre sammalt mørkere enn siktet. */
function blandFarge(a, b, t) {
  const hex = c => [1, 3, 5].map(i => parseInt(c.substr(i, 2), 16));
  const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b);
  const m = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}

/* Tegningen som hører til en melsort. */
function melSvg(melId, o = {}) {
  const f = FLOURS.find(x => x.id === melId);
  return kornSvg(MEL_KORN[melId] || 'hvete', { ...o, grov: f ? !!f.grov : false, alt: f ? f.navn : melId });
}

/* ---------- Veiing ----------
   Alt som skal på vekta rundes til det vekta faktisk kan vise, og advarsler om
   «for lite til å veie» henger på vektas oppløsning i stedet for et fast tall.
   Tommelfingerregelen for nøyaktighet er at avlesningen bør være minst rundt
   20 ganger minste trinn — under det spiser vektas egen usikkerhet på ±1–2
   siffer en merkbar andel av mengden. */
function vektDesimaler() {
  return S.vektTrinn >= 1 ? 0 : S.vektTrinn >= 0.1 ? 1 : 2;
}

/* Rundet til nærmeste trinn vekta kan vise. Desimalene trappes ned når mengden
   vokser — vekta kan godt vise 28,10 g, men det andre sifferet er støy når du
   veier opp mel, og gjør bare tabellen tyngre å lese. */
function veiG(v) {
  const t = S.vektTrinn || 0.01;
  const tak = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return gram(Math.round(v / t) * t, Math.min(vektDesimaler(), tak));
}

/* Er mengden så liten at vekta ikke kan treffe den pålitelig? */
function underVekt(v) { return v > 0 && v < 20 * (S.vektTrinn || 0.01); }

/* ---------- Sentral beregning ---------- */
function beregn() {
  const r = beregnOppskrift({
    melListe: S.melListe, froListe: S.froListe, hydrering: S.hydrering / 100,
    saltPct: S.saltPct, honningPct: S.honningPct, oljePct: S.oljePct,
    sukkerPct: S.sukkerPct, smorPct: S.smorPct, maltPct: S.maltPct,
    gjaerPct: S.gjaerPct, gjaerType: S.gjaerType, forferment: S.forferment,
    antall: S.antall, vektPerBrod: S.vektPerBrod, froVannPaaToppen: S.froVannPaaToppen
  });
  S.masseKg = r.masseKg;
  const torr = tilTorrPct(S.gjaerPct, S.gjaerType);
  const plan = S.plan.map((t, i) => i === 0 ? { ...t, temp: S.startTemp } : { ...t });
  const g = planDose(plan, torr, r.masseKg, { lokk: S.lokk, fulltKjol: S.fulltKjol, antall: S.antall });
  return { r, g, torr, plan };
}

/* ============================================================
   KONTEKSTPANELET — «Deigen din»
   Speiler den ene sannheten mens du jobber. Leser fra beregn() og bakeSteg(),
   akkurat som alle andre visninger, så det kan per konstruksjon ikke komme i
   utakt. Panelet VISER; hovedspalten endrer — ingen kontroller her, ellers får
   man to steder å endre samme tall og to mentale modeller for hvor sannheten bor.
   ============================================================ */
function tegnKontekst() {
  const { r, g, plan } = beregn();
  const type = aktivBrotype();

  $('#kxIdent').innerHTML =
    `<b>${type.navn}</b>${type.harForm ? ` · ${aktivForm().navn.split(' (')[0].toLowerCase()}` : ''}<br>
     <span class="small">${S.antall} × ${gram(S.vektPerBrod)} · ${pst(S.hydrering, 0)} vann · ${pst(r.brodskala.pct, 0)} grovt (${r.brodskala.kort.toLowerCase()})</span>`;

  tegnTempChart(g, plan, {
    svg: $('#kxKurve'), W: 340, H: 150, mini: true, pad: { l: 5, r: 5, t: 5, b: 5 }
  });
  $('#kxLegend').innerHTML =
    `<span style="color:#e0a53c">━</span> gjæring &nbsp;
     <span style="color:#5b8fa8">╌</span> deigtemp &nbsp;
     <span style="color:#c9633a">▨</span> fart`;

  // Måldosen: samme referanse som «Gjæring & tid» bruker, ikke en egen.
  const mal = S.maalDose || S.refDose || maalDoseFor(r.grovAndel,
    S.forferment.bruk ? S.forferment.pctMel / 100 : 0);
  const avvik = mal ? (g.dose / mal - 1) * 100 : 0;
  const cls = Math.abs(avvik) <= 8 ? 'ok' : Math.abs(avvik) <= 20 ? 'warn' : 'bad';
  // «−0 %» er en lesefeil som venter på å skje. Under et halvt prosentpoeng er
  // fortegnet støy, ikke informasjon.
  const avvikTxt = Math.abs(avvik) < 0.5 ? '±0 %' : `${avvik > 0 ? '+' : '−'}${fmt(Math.abs(avvik), 0)} %`;
  const bs = bakeSteg();
  const rise = maalHeveProsent(S.startTemp, {
    hydrering: S.hydrering / 100, grovAndel: r.grovAndel, styrke: r.svakesteStyrke
  });

  $('#kxStats').innerHTML = `
    <div class="stat ${cls}"><div class="k">Gjæringsdose</div>
      <div class="v">${fmt(g.dose, 2)}<span class="u"> ${avvikTxt}</span></div></div>
    <div class="stat"><div class="k">Tørrgjær</div>
      <div class="v">${fmt(tilTorrPct(S.gjaerPct, S.gjaerType), 3)}<span class="u"> %</span></div></div>
    <div class="stat"><div class="k">Mål heving</div>
      <div class="v">${fmt(rise, 0)}–${fmt(rise * 1.2, 0)}<span class="u"> %</span></div></div>
    <div class="stat"><div class="k">Total tid</div>
      <div class="v">${fmt((bs.ferdig - bs.start) / 3600000, 1)}<span class="u"> t</span></div></div>`;

  const kaldAndel = g.trinn.filter(t => t.miljo <= 12).reduce((s, t) => s + t.dose, 0) / (g.dose || 1) * 100;
  $('#kxStatus').innerHTML =
    `<div class="note ${cls}" style="margin:8px 0 0">${fmt(100 - kaldAndel, 0)} % av gjæringen skjer varmt,
      ${fmt(kaldAndel, 0)} % på kjøl · ${bs.steg.length} steg · stekes ${grader(bs.prof.inn, 0)}</div>`;

  // Håndtaket på mobil viser det viktigste når skuffen er lukket.
  $('#kxHandtak').textContent =
    `Deigen din — GD ${fmt(g.dose, 2)} · ${avvikTxt} · ${fmt((bs.ferdig - bs.start) / 3600000, 1)} t`;
}

/* ============================================================
   VISNING: START
   ============================================================ */

/* Det eneste målet vi faktisk kjenner på Pyrex-gryta er innvendig BREDDE.
   Lengden er ikke oppgitt noe sted, og den avgjør om et avlangt emne passer.
   Derfor sier appen «mål den» i stedet for å påstå at det går eller ikke går. */
const GRYTE_BREDDE_CM = 21.5;

function tegnStart() {
  const type = aktivBrotype();

  /* --- 1. Brødtype --- */
  const tv = $('#brotypeValg'); tv.innerHTML = '';
  BROTYPER.forEach(t => {
    const paa = t.id === S.brotype;
    // Ekte <button>, ikke klikk-div: appens aller første valg må kunne nås
    // med tastatur og skjermleser. Samme mønster på alle kortvalg.
    const b = el('button', 'stat');
    b.type = 'button';
    b.dataset.k = 'kort-brotype-' + t.id; // stabil nøkkel: gjenopprettFokus finner igjen kortet etter re-render
    b.setAttribute('aria-pressed', String(paa));
    if (paa) { b.style.borderColor = 'var(--gull)'; b.style.background = 'var(--panel2)'; }
    b.innerHTML = `<div class="k">${t.ikon} ${t.rute === 'bygg' ? 'Du styrer grovheten' : 'Ferdig kalibrert deig'}</div>
      <div class="v" style="font-size:1.05rem">${paa ? '✓ ' : ''}${t.navn}</div>
      <div class="small" style="margin-top:5px">${t.undertittel}</div>`;
    b.onclick = () => { velgBrotype(t.id); oppdater(); };
    tv.appendChild(b);
  });

  $('#brotypeUt').innerHTML =
    `<div class="note">${type.passer}</div>` +
    (type.merk ? `<div class="note">${type.merk}</div>` : '');

  /* --- 2. Form og kurv (bare der formen er et reelt valg) --- */
  const fk = $('#formKort');
  fk.style.display = type.harForm ? '' : 'none';
  if (type.harForm) {
    const fv = $('#formValg'); fv.innerHTML = '';
    FORMER.forEach(f => {
      const paa = f.id === S.form;
      const b = el('button', 'stat');
      b.type = 'button';
      b.dataset.k = 'kort-form-' + f.id;
      b.setAttribute('aria-pressed', String(paa));
      if (paa) { b.style.borderColor = 'var(--gull)'; b.style.background = 'var(--panel2)'; }
      b.innerHTML = `<div class="k">${f.ikon} ${f.kort}</div>
        <div class="v" style="font-size:1.02rem">${paa ? '✓ ' : ''}${f.navn}</div>
        <div class="small" style="margin-top:5px">${f.snitt.split('.')[0]}.</div>`;
      b.onclick = () => { velgForm(f.id); oppdater(); };
      fv.appendChild(b);
    });

    const f = aktivForm();
    const m = emneMaal(S.vektPerBrod);
    let h = `<div class="note">${f.om}</div>`;
    h += `<div class="note"><b>Snitting:</b> ${f.snitt}</div>`;

    if (m) {
      const passer = m.cm <= GRYTE_BREDDE_CM;
      h += `<div class="note ${passer ? 'ok' : 'warn'}">
        Et emne på <b>${gram(S.vektPerBrod)}</b> blir ca. <b>${fmt(m.cm, 0)} cm</b> i ${m.maal} — regn ±15 %,
        for dette er en formingskonvensjon og ikke en fysisk lov.
        ${passer
          ? `Det ligger innenfor de ${fmt(GRYTE_BREDDE_CM, 1)} cm Pyrex-gryta er oppgitt å være innvendig, så gryteoppsettet ditt gjelder.`
          : `Pyrex-gryta er oppgitt til ${fmt(GRYTE_BREDDE_CM, 1)} cm innvendig <i>bredde</i> — lengden står ingen steder.
             <b>Mål den innvendige lengden før du planlegger å bruke glasset som kloke over et avlangt emne.</b>
             Er gryta rund, får emnet ikke plass, og da er åpen steking på stålet med dampkar det som virker.
             Appen har derfor satt stekeprofilen til åpen steking — bytt den i «Bak nå» hvis gryta viser seg å være lang nok.`}
      </div>`;
    }
    $('#formUt').innerHTML = h;
  }

  /* --- 3. Prosessen, hentet fra den ene bakekjeden --- */
  const pu = $('#prosessUt');
  const B = bakeSteg();
  let ph = `<div class="note">
      <b>${type.navn}</b>${type.harForm ? ` · ${aktivForm().navn.toLowerCase()}` : ''} ·
      ${S.antall} emne${S.antall === 1 ? '' : 'r'} à ${gram(S.vektPerBrod)} ·
      ${pst(S.hydrering, 0)} hydrering · ${B.steg.length} steg fra start til avkjølt brød.
    </div><table><thead><tr><th>#</th><th>Steg</th><th>Varighet</th></tr></thead><tbody>`;
  B.steg.forEach(s => {
    ph += `<tr><td class="mono">${s.nr}</td>
      <td>${STEGIKON[s.type] || '·'} ${s.navn}</td>
      <td class="mono">${s.varighet >= 60 ? fmtTimer(s.varighet / 60) : fmt(s.varighet) + ' min'}</td></tr>`;
  });
  ph += `</tbody></table>
    <div class="spacer"></div>
    <button class="btn" id="startTilBak">Gå til «Bak nå» og sett klokkeslett</button>`;
  pu.innerHTML = ph;
  $('#startTilBak').onclick = () => vis('baknaa');

  /* --- 4. Ruten gjennom fanene --- */
  const R = RUTER[type.rute];
  let rh = `<p class="sub">Du baker <b>${type.navn.toLowerCase()}</b>. Da er dette veien:</p>`;
  R.hoved.forEach(([v, hva], i) => {
    rh += `<div class="rutesteg">
      <span class="rutenr">${i + 1}</span>
      <button class="btn ghost sm" data-go="${v}">${faneNavn(v)}</button>
      <span class="small">${hva}</span></div>`;
  });

  rh += `<div class="spacer"></div>
    <p class="small"><b>Vil du finjustere?</b> Disse fanene viser og endrer detaljer i det samme brødet —
    du trenger dem ikke, men de er der: ${R.juster.map(v => `<button class="btn ghost sm" data-go="${v}">${faneNavn(v)}</button>`).join(' ')}</p>`;

  if (R.ikke.length) {
    rh += `<div class="note warn"><b>Hopp over ${R.ikke.map(faneNavn).join(' og ')}.</b>
      Den fanen bygger frittstående brød av grovhetstrappa — Regal, sammalt hvete og rug.
      ${type.navn} er en annen deig, og grovhetsdialen der ville bare bygget deg et helt annet brød.</div>`;
  }

  rh += `<p class="small" style="margin-top:10px"><b>Oppslag når du lurer på noe:</b>
    ${OPPSLAG.map(v => `<button class="btn ghost sm" data-go="${v}">${faneNavn(v)}</button>`).join(' ')}</p>`;

  $('#ruteUt').innerHTML = rh;
  $$('#ruteUt [data-go]').forEach(b => b.onclick = () => vis(b.dataset.go));

  /* --- 5. Marker hovedveien i navigasjonen --- */
  const ikke = new Set(R.ikke);
  merkRute();
  // Ruta kan ha endret seg (bygg ↔ preset), så foten i fanen du står i må følge med.
  tegnRutefot(sisteVis);

  /* --- 6. Varsel i «Bygg brød» når fanen ikke gjelder --- */
  const bv = $('#byggRuteVarsel');
  if (bv) {
    bv.innerHTML = ikke.has('bygg')
      ? `<div class="card"><div class="note warn">
          <b>Du har valgt ${type.navn.toLowerCase()} på startsiden, og denne fanen gjelder ikke for den.</b>
          «Bygg brød» setter alltid sammen et frittstående brød av grovhetstrappa. Drar du i dialene her og
          trykker «Bruk denne», bytter du ut ${type.navn.toLowerCase()}en med et grovbrød.
          Deigen din styres fra «Oppskrift».
          <div class="spacer"></div>
          <button class="btn ghost sm" id="byggTilOppskrift">Gå til Oppskrift</button>
          <button class="btn ghost sm" id="byggTilStart">Tilbake til Start</button>
        </div></div>`
      : '';
    const a = $('#byggTilOppskrift'); if (a) a.onclick = () => vis('oppskrift');
    const c = $('#byggTilStart'); if (c) c.onclick = () => vis('start');
  }
}

/* ============================================================
   VISNING: BYGG BRØD
   ============================================================ */

/* Måldose for et magert brød.
   Forankret i PUBLISERTE PROFESJONELLE FORMLER, ikke i én bakers notater.
   24 fullt spesifiserte oppskrifter (Hamelman, King Arthur Pro, ChainBaker,
   Forkish, Weekend Bakery, brotdoc, BBGA) ble regnet gjennom denne modellen:

     Baguetter   n=8   snitt 1,95
     Magre brød  n=8   snitt 1,95
     Ciabatta    n=7   snitt 1,99
     ALLE        n=24  median 1,83, kvartilbredde 1,15–2,41

   At tre helt ulike brødtyper konvergerer på ~1,95 er den egentlige
   valideringen — langt sterkere enn to oppskrifter fra samme kjøkken.

   Formler MED forferment ligger i snitt på 1,63, UTEN på 2,30. Forholdet
   0,71 bekrefter uavhengig strukturen i pff-leddet under.

   Merk at kvartilbredden er nesten 2×: profesjonell praksis spenner vidt,
   så dosen er et planleggingstall med ca. ±35 % toleranse. Målekrukka
   avgjør, ikke dette tallet. */
function maalDoseFor(grovAndel, pff = 0) {
  return (2.30 - 0.40 * grovAndel) * (1 - 0.6 * pff);
}

/* Bygger en komplett oppskrift av grovhet + tid + tillegg.
   Frø oppgis i % av mel, så melmengden løses iterativt (konvergerer på 3–4 runder). */
function byggOppskrift() {
  const gr = GROVHET[S.byggGrovhet] || GROVHET[1];
  const tp = TIDSPLANER.find(t => t.id === S.byggTid) || TIDSPLANER[0];
  const ut = UTSTYR.find(u => u.id === S.byggUtstyr) || UTSTYR[0];
  // glass_stal manglet her, og det er nettopp oppsettet utstyrslista kaller
  // «ditt beste for rundbrød» og «utmerket — lukket kammer». Uten det mistet
  // brukeren 3 prosentpoeng hydrering ved å velge det appen selv anbefaler.
  const lukket = ['glass', 'glass_stal', 'stopejern'].includes(ut.id);

  const smak = { honningPct: 0, maltPct: 0, oljePct: 0 };
  const froPct = [];
  TILLEGG.forEach(t => {
    const v = S.byggTillegg[t.id];
    if (v === undefined || v === null) return;
    if (t.type === 'fro') froPct.push({ id: t.id, pct: v, varmt: !!t.varmt });
    else smak[t.felt] = v;
  });

  const maalVekt = S.byggAntall * S.byggVekt;
  let melTotal = maalVekt / 1.85, gjaerPct = 1.0, hyd = gr.basisHyd / 100, r = null;

  for (let i = 0; i < 6; i++) {
    const froListe = froPct.map(f => ({ id: f.id, gram: melTotal * f.pct / 100, varmt: f.varmt }));
    r = beregnOppskrift({
      melListe: gr.mel, froListe, hydrering: hyd,
      saltPct: 2.0, ...smak, sukkerPct: 0, smorPct: 0,
      gjaerPct, gjaerType: 'torr',
      forferment: tp.forferment,
      antall: S.byggAntall, vektPerBrod: S.byggVekt, froVannPaaToppen: true
    });
    melTotal = r.melTotal;
    // Hydrering følger melblandingens absorpsjon. Lukket gryte støtter deigen
    // mens den utvider seg, så du kan kjøre 3 prosentpoeng våtere — og siden
    // nesten halve ovnsløftet er fordampende vann, er det ren gevinst.
    hyd = Math.min(0.82, (gr.basisHyd / 100) * r.absFaktor + (lukket ? 0.03 : 0));
  }

  const plan = tp.plan.map(s => ({ ...s }));
  plan[0].temp = 24;
  const pff = tp.forferment.bruk ? tp.forferment.pctMel / 100 : 0;
  const maalDose = maalDoseFor(r.grovMelAndel, pff);
  // Kjøleskapsinnstillingene gjelder også her — de ble tidligere ignorert i denne visningen.
  const opt = { lokk: S.lokk, fulltKjol: S.fulltKjol, antall: S.byggAntall };
  // Praktisk tak: over ~0,83 % tørrgjær (= 2,5 % fersk) får du gjærsmak,
  // kollapsende hevevindu og dårligere løft. Da er det ærligere å si at planen
  // ikke rekker fram enn å foreskrive en gjærmengde ingen baker faktisk bruker.
  const TAK_TORR = 0.833;
  let torr = gjaerForDose(maalDose, plan, r.masseKg, opt);
  let underskudd = 0;
  if (torr > TAK_TORR) {
    torr = TAK_TORR;
    underskudd = 1 - planDose(plan, torr, r.masseKg, opt).dose / maalDose;
  }
  gjaerPct = torr;

  // Siste runde med riktig gjærmengde
  const froListe = froPct.map(f => ({ id: f.id, gram: melTotal * f.pct / 100, varmt: f.varmt }));
  r = beregnOppskrift({
    melListe: gr.mel, froListe, hydrering: hyd,
    saltPct: 2.0, ...smak, sukkerPct: 0, smorPct: 0,
    gjaerPct, gjaerType: 'torr', forferment: tp.forferment,
    antall: S.byggAntall, vektPerBrod: S.byggVekt, froVannPaaToppen: true
  });
  const g = planDose(plan, torr, r.masseKg, opt);
  const rise = maalHeveProsent(24, { hydrering: hyd, grovAndel: r.grovMelAndel, styrke: r.svakesteStyrke });

  return { gr, tp, ut, lukket, r, g, plan, torr, gjaerPct, hyd, maalDose, rise, smak, froPct, underskudd };
}

/* ============================================================
   TILLEGGENES PRIS OG GEVINST
   Tre akser som trekker mot hver sin kant: løft, smak, saftighet.
   Poenget med panelet er at man ser byttehandelen mens man drar i slideren,
   i stedet for å oppdage den når brødet er skåret opp.
   ============================================================ */
function tegnEffekt(B) {
  const c = $('#effektUt'); if (!c) return;
  const E = TILLEGG_EFFEKT;

  const froPct = B.froPct.reduce((s, f) => s + f.pct, 0);
  const honning = B.smak.honningPct || 0;
  const olje = B.smak.oljePct || 0;
  const malt = B.smak.maltPct || 0;

  // Frø regnes som bløtlagte — appen bløtlegger dem alltid og bokfører vannet.
  const froLoft   = interp(E.fro.pct, E.fro.loftBloet, froPct);
  const froTort   = interp(E.fro.pct, E.fro.loftTort, froPct);
  const froSmak   = interp(E.fro.pct, E.fro.smak, froPct);
  const froSaft   = interp(E.fro.pct, E.fro.saftighet, froPct);
  const hoLoft    = interp(E.honning.pct, E.honning.loft, honning);
  const hoBrun    = interp(E.honning.pct, E.honning.bruning, honning);
  const hoSmak    = interp(E.honning.pct, E.honning.smak, honning);
  const hoSaft    = interp(E.honning.pct, E.honning.saftighet, honning);
  const feLoft    = interp(E.fett.pct, E.fett.olje, olje);
  const feSaft    = interp(E.fett.pct, E.fett.saftighet, olje);
  const maLoft    = interp(E.malt.pct, E.malt.loft, malt);
  const maGummi   = interp(E.malt.pct, E.malt.gummi, malt);

  // Løftene multipliseres: hver ingrediens virker på det som er igjen.
  const loft = froLoft / 100 * hoLoft / 100 * feLoft / 100 * maLoft / 100 * 100;
  // Smak og saftighet metter — to gode ting gir ikke dobbelt så godt.
  const metning = (...xs) => { const s = xs.reduce((a, b) => a + b, 0); return 10 * (1 - Math.exp(-s / 6)); };
  const smak = metning(froSmak, hoSmak);
  const saft = metning(froSaft, hoSaft, feSaft);

  const bar = (verdi, maks, farge) =>
    `<div style="height:7px;border-radius:99px;background:var(--bg2);overflow:hidden;margin-top:5px">
       <div style="height:100%;width:${Math.max(0, Math.min(100, verdi / maks * 100))}%;background:${farge}"></div></div>`;

  const loftCls = loft >= 97 ? 'ok' : loft >= 90 ? '' : loft >= 80 ? 'warn' : 'bad';

  let h = `<div class="stats">
    <div class="stat ${loftCls}"><div class="k">Ovnsløft</div><div class="v">${fmt(loft, 0)}<span class="u"> % av rent brød</span></div>
      ${bar(loft, 120, 'var(--gull)')}</div>
    <div class="stat"><div class="k">Smak fra tillegg</div><div class="v">${fmt(smak, 1)}<span class="u"> / 10</span></div>
      ${bar(smak, 10, 'var(--rust)')}</div>
    <div class="stat"><div class="k">Saftighet</div><div class="v">${fmt(saft, 1)}<span class="u"> / 10</span></div>
      ${bar(saft, 10, 'var(--blå)')}</div>
    ${honning > 0 ? `<div class="stat ${hoBrun > 200 ? 'warn' : ''}"><div class="k">Bruningsrate</div><div class="v">${fmt(hoBrun, 0)}<span class="u"> %</span></div>${bar(hoBrun, 300, 'var(--rust)')}</div>` : ''}
    ${malt > 0 ? `<div class="stat ${maGummi > 4 ? 'bad' : maGummi > 2 ? 'warn' : ''}"><div class="k">Gummirisiko</div><div class="v">${fmt(maGummi, 1)}<span class="u"> / 10</span></div>${bar(maGummi, 10, 'var(--rød)')}</div>` : ''}
  </div>`;

  if (froPct > 0 || honning > 0 || olje > 0 || malt > 0) {
    h += `<div class="spacer"></div><table><thead><tr><th>Tillegg</th><th class="n">Løft</th><th class="n">Smak</th><th class="n">Saftighet</th></tr></thead><tbody>`;
    if (froPct > 0) h += `<tr><td>Frø, ${pst(froPct, 0)} <span class="small">bløtlagt</span></td>
      <td class="n mono">${froLoft < 100 ? '−' + fmt(100 - froLoft, 0) + ' %' : '±0'}</td>
      <td class="n mono">+${fmt(froSmak, 1)}</td><td class="n mono">+${fmt(froSaft, 1)}</td></tr>
      <tr class="small"><td colspan="4" style="color:var(--txt3)">Uten bløtlegging: −${fmt(100 - froTort, 0)} % løft i stedet for −${fmt(100 - froLoft, 0)} %. Bløtlegging henter tilbake omtrent halvparten av tapet.</td></tr>`;
    if (honning > 0) h += `<tr><td>Honning, ${pst(honning, 1)}</td>
      <td class="n mono">${hoLoft >= 100 ? '+' + fmt(hoLoft - 100, 0) : '−' + fmt(100 - hoLoft, 0)} %</td>
      <td class="n mono">+${fmt(hoSmak, 1)}</td><td class="n mono">+${fmt(hoSaft, 1)}</td></tr>`;
    if (olje > 0) h += `<tr><td>Olivenolje, ${pst(olje, 1)}</td>
      <td class="n mono">+${fmt(feLoft - 100, 0)} %</td><td class="n mono">–</td><td class="n mono">+${fmt(feSaft, 1)}</td></tr>`;
    if (malt > 0) h += `<tr><td>Diastatisk malt, ${pst(malt, 2)}</td>
      <td class="n mono">+${fmt(maLoft - 100, 0)} %</td><td class="n mono">–</td><td class="n mono">–</td></tr>`;
    h += '</tbody></table>';
  }
  c.innerHTML = h;

  /* --- rådene --- */
  const n = el('div'); c.appendChild(n);
  const si = (kls, tekst) => n.appendChild(el('div', 'note ' + kls, tekst));

  /* Den avgjørende asymmetrien: to veier til saftig brød, med motsatt fortegn
     på løftet. Frø gir fuktighet og koster løft. Vann gir fuktighet OG løft,
     fordi 45–55 % av ovnsløftet er vann som blir damp. Rekkefølgen følger av
     det, og den er ikke åpenbar før man ser den skrevet ned. */
  const hydPct = B.hyd * 100;
  /* Taket het «for denne melblandingen», men var en ren konstant — den flyttet
     seg bare når du byttet stekeutstyr. Det gjorde det direkte villedende så
     snart grovhetstrappa nådde de grove trinnene: et ekstra grovt brød MÅ ligge
     rundt 80 % for i det hele tatt å bli en deig, og fikk rød advarsel for det.
     Nå skaleres taket med blandingens egen absorpsjonsfaktor, som er den samme
     størrelsen appen allerede bruker til å regne ut anbefalt hydrering. Basis
     76/80 gjelder altså siktet hvete (absFaktor 1,0), og følger melet derfra.
     Selve basistallene er fortsatt et anslag — de er ikke målt. */
  const takHyd = (B.lukket ? 80 : 76) * (B.r.absFaktor || 1);
  si(hydPct < takHyd - 3 ? 'ok' : hydPct < takHyd ? 'warn' : 'bad',
    `<b>Saftighet: ta vannet før frøene.</b> Begge gjør brødet saftigere, men bare den ene koster løft.
     Frø binder fuktighet og gir tygg — og betaler med ${fmt(100 - froLoft, 0)} % av ovnsløftet.
     Vann gir fuktighet og <b>mer</b> løft, fordi 45–55 % av ovnsløftet er vann som fordamper og utvider seg.
     Derfor: skru hydreringen opp til strukturen sier stopp, og bruk frø til smak og tygg — ikke som fuktkilde.
     <br>Du ligger på <b>${pst(hydPct, 1)}</b>${B.lukket ? ', og fordi du steker i lukket gryte tåler du 3 prosentpoeng mer enn åpent — veggene støtter deigen mens den utvider seg' : ''}.
     Praktisk tak for denne melblandingen er rundt <b>${pst(takHyd, 0)}</b>.
     ${hydPct < takHyd - 3
       ? `Du har altså ${fmt(takHyd - hydPct, 0)} prosentpoeng igjen å gå på. Klatre 2 % per bak til deigen begynner å flyte ut i stedet for å holde formen — det er der grensen din faktisk går, ikke der tabellen sier.`
       : hydPct < takHyd
         ? 'Du er nær taket. Videre opp krever sterkere mel, ikke bedre teknikk.'
         : 'Du er over det praktiske taket. Over dette flyter deigen ut sidelengs i stedet for å reise seg — og et flatt brød er ikke saftig, det er bare fuktig.'}`);

  si('', `<b>Ovnsløftet faller 2–3× raskere enn volumet.</b> Det er hovedgrunnen til at denne tabellen finnes.
    Aldawsari & Simsek målte at ved 6 % linfrø var brød<i>volumet</i> 6 % <b>høyere</b> enn kontrollen — mens
    <i>ovnsløftet</i> allerede var 19 % <b>lavere</b>. Volumtallene du finner i litteraturen underdriver derfor
    systematisk skaden på nettopp det du jakter.`);

  if (froPct > 0) {
    si(froPct <= 6 ? 'ok' : froPct <= 10 ? 'warn' : 'bad',
      `<b>Frø ved ${pst(froPct, 0)} koster ${fmt(100 - froLoft, 0)} % av ovnsløftet</b>, og gir ${fmt(froSmak, 1)} av 10 i smak.
       ${froPct <= 6
         ? 'Det er den billige sonen: under 6 % er kurven fortsatt slak, og du får mesteparten av smaken for lite løft.'
         : froPct <= 10
           ? 'Fra 6 % blir kurven brattere. Hvert prosentpoeng herfra koster rundt 1,5 % av løftet — fortsatt greit hvis smaken betyr mer enn de siste centimeterne, men det er ikke gratis lenger.'
           : 'Her er smaken praktisk talt mettet — den flater ut rundt 12–15 % — mens løftet fortsatt faller lineært. Du betaler stadig mer for stadig mindre.'}
       <br><b>Jakter du maks løft: legg deg på 5–6 % i deigen og resten på skorpen.</b>`);
    si('ok', `<b>To grep som gir smak gratis.</b> <b>Rist frøene</b> — målt ga risting 28–51× mer pyrazin, altså
       omtrent dobbelt så mye smak per gram. 8 % ristede frø smaker som 16 % uristede. Rist ved 125–150 °C til lys
       gyllen, ikke hardt og raskt; studiens optimum var 125 °C i 45 min for lavest bismak, og avkjøl helt før
       bløtlegging. <b>Og legg resten på skorpen</b> — frø utenpå gir full aroma til <b>null</b> strukturkostnad.
       Det er den eneste måten å få 18 %-smak med 8 %-løft.`);
  }

  if (honning > 2.5) si('warn',
    `<b>Honningen din bruner ${fmt(hoBrun, 0)} % så fort som uten.</b> På normalt hvetemel gjør honning nesten
     ingenting for hevingen — gassproduksjonen er målt konstant opp til 6 % sukker, fordi melets egen amylase
     allerede leverer nok. Den ene reelle effekten er skorpefarge, og det er nettopp den som setter skorpa tidlig
     og lukker ekspansjonsvinduet. Jakter du løft: <b>1,5–2,5 %</b>. Sødme merkes uansett ikke før rundt 4–5 %.`);

  if (olje > 0) si('',
    `Flytende olje kan ikke stabilisere gassceller slik fettkrystaller gjør — de smelter under steking og mater
     grenseflatemateriale til boblene som utvider seg. Målt koster det <b>8,8 % spesifikt volum</b> å bytte fast
     fett mot oleogel. Vil du ha maks løft, er <b>3 % smør</b> sterkere enn 3 % olivenolje. Til saftighet er begge gode.`);

  if (malt > 0) si(malt > 0.2 ? 'bad' : 'warn',
    `<b>Norsk hvetemel trenger normalt ikke malt.</b> Det ligger på 280–320 s falltall, som <i>er</i> det optimale
     vinduet. Målt trekker 0,5 % malt falltallet fra 327 til 194 s — langt under — og farinograf-stabiliteten
     faller fra 7,5 til 2,6 min, altså svakere deig. Lang kaldheving gir dessuten amylasen 3–8 timers ekstra
     arbeid. Bruk <b>0 %</b> som standard; 0,1–0,15 % bare hvis du får blek skorpe og dårlig volum til tross for god heving.`);

  return { loft, smak, saft, froPct };
}

/* Hvor mange gram utgjør et tillegg i den ferdige oppskriften? */
function tilleggGram(B, t) {
  if (t.type === 'fro') {
    const f = B.r.fro.find(x => x.id === t.id);
    return f ? f.gram : 0;
  }
  return B.r[{ honningPct: 'honning', maltPct: 'malt', oljePct: 'olje' }[t.felt]] || 0;
}

/* Lås et tillegg til et gitt antall gram.
   Melmengden avhenger av hvor mye tillegg som er i deigen — legger du i mer frø,
   blir det mindre plass til mel når totalvekten er fast. Prosenten kan derfor
   ikke regnes ut i ett steg; den må itereres til den står stille. Konvergerer
   på 3–4 runder, så seks er rikelig. */
function settTilleggGram(id, gram) {
  const t = TILLEGG.find(x => x.id === id); if (!t) return;
  if (gram <= 0) { S.byggTillegg[id] = 0; return; }

  // Første gjett fra melmengden slik den er nå.
  const mel0 = byggOppskrift().r.melTotal;
  if (isFinite(mel0) && mel0 > 0) S.byggTillegg[id] = gram / mel0 * 100;

  // Så korrigeres det proporsjonalt mot det oppskriften FAKTISK gir. Et rent
  // «pct = gram/mel» konvergerer for tregt når frøandelen er stor, fordi mer frø
  // fortrenger mel når totalvekten er låst — de to drar i hver sin retning.
  for (let i = 0; i < 25; i++) {
    const naa = tilleggGram(byggOppskrift(), t);
    if (!isFinite(naa) || naa <= 1e-6) break;
    if (Math.abs(naa - gram) < 0.05) break;
    S.byggTillegg[id] = Math.max(0, S.byggTillegg[id] * gram / naa);
  }
}

function tegnBygg() {
  // --- Grovhet ---
  const gv = $('#grovhetValg'); gv.innerHTML = '';
  GROVHET.forEach((x, i) => {
    const b = el('button', 'stat');
    b.type = 'button';
    b.dataset.k = 'kort-grovhet-' + i;
    b.setAttribute('aria-pressed', String(i === S.byggGrovhet));
    if (i === S.byggGrovhet) { b.style.borderColor = 'var(--gull)'; b.style.background = 'var(--panel2)'; }
    b.innerHTML = `<div class="k">${x.kort}</div><div class="v" style="font-size:1.05rem">${x.navn}</div>
                   <div class="small" style="margin-top:3px;color:var(--gull)">${x.klasse}</div>
                   <div class="small" style="margin-top:5px">${x.ovnslos}</div>`;
    b.onclick = () => { S.byggGrovhet = i; byggEndret(); };
    gv.appendChild(b);
  });

  // --- Tid ---
  const tv = $('#tidValg'); tv.innerHTML = '';
  TIDSPLANER.forEach(x => {
    const b = el('button', 'stat');
    b.type = 'button';
    b.dataset.k = 'kort-tid-' + x.id;
    b.setAttribute('aria-pressed', String(x.id === S.byggTid));
    if (x.id === S.byggTid) { b.style.borderColor = 'var(--gull)'; b.style.background = 'var(--panel2)'; }
    b.innerHTML = `<div class="k">${x.kort}</div><div class="v" style="font-size:1.05rem">${x.navn}</div>
                   <div class="small" style="margin-top:5px">Smak/løft ca. ${x.ovnslos} % av optimal</div>`;
    b.onclick = () => { S.byggTid = x.id; byggEndret(); };
    tv.appendChild(b);
  });

  // Regnes før tilleggskortene, slik at hvert kort kan vise sin egen gramvekt
  // ved siden av prosenten. Funksjonen leser bare tilstand, ikke DOM.
  const B = byggOppskrift();

  // --- Tillegg ---
  const lv = $('#tilleggValg'); lv.innerHTML = '';
  TILLEGG.forEach(t => {
    const paa = S.byggTillegg[t.id] !== undefined;
    // Ikke <button> her: valgte kort inneholder slider og gram-felt, og nestede
    // kontroller inne i en button er ugyldig. role+tabindex+keydown gir samme
    // tastaturtilgang uten å ødelegge de indre feltene.
    const b = el('div', 'stat');
    b.style.cursor = 'pointer';
    b.tabIndex = 0;
    b.dataset.k = 'kort-tillegg-' + t.id;
    b.setAttribute('role', 'button');
    b.setAttribute('aria-pressed', String(paa));
    if (paa) { b.style.borderColor = 'var(--gull)'; b.style.background = 'var(--panel2)'; }
    b.innerHTML = `<div class="k">${t.type === 'fro' ? 'Frø / korn' : 'Smak'}</div>
      <div class="v" style="font-size:1rem">${paa ? '✓ ' : '+ '}${t.navn}</div>
      <div class="small" style="margin-top:4px">${paa ? `<b>${fmt(S.byggTillegg[t.id], t.pct < 1 ? 2 : 0)} %</b> av melet` : `anbefalt ${fmt(t.pct, t.pct < 1 ? 2 : 0)} %`}</div>`;
    const veksle = () => {
      if (paa) delete S.byggTillegg[t.id]; else S.byggTillegg[t.id] = t.pct;
      byggEndret();
    };
    b.onclick = e => {
      if (e.target.tagName === 'INPUT') return;
      veksle();
    };
    b.onkeydown = e => {
      if (e.target !== b) return; // Enter/space i indre felt skal ikke veksle kortet
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); veksle(); }
    };
    if (paa) {
      const sl = el('input'); sl.type = 'range'; sl.min = t.min; sl.max = t.max;
      sl.step = t.pct < 1 ? 0.05 : 1; sl.value = S.byggTillegg[t.id];
      sl.oninput = () => { S.byggTillegg[t.id] = +sl.value; byggEndret(); };
      sl.onclick = e => e.stopPropagation();
      b.appendChild(sl);

      // Retningen du er på vei i, mens du drar. Uten dette må man gjette hva
      // slideren gjør med brødet — som er hele grunnen til at panelet finnes.
      const naa = S.byggTillegg[t.id];
      const avvik = naa - t.pct;
      const retning = Math.abs(avvik) < (t.pct < 1 ? 0.03 : 0.5)
        ? `<span style="color:var(--grønn)">På anbefalt nivå.</span>`
        : avvik > 0
          ? `<span style="color:var(--gull)">▲ ${fmt(Math.abs(avvik), t.pct < 1 ? 2 : 0)} over anbefalt.</span> ${(t.opp || '').split('.')[0]}.`
          : `<span style="color:var(--blå)">▼ ${fmt(Math.abs(avvik), t.pct < 1 ? 2 : 0)} under anbefalt.</span> ${(t.ned || '').split('.')[0]}.`;
      const r = el('div', 'small', retning);
      r.style.marginTop = '6px';
      r.onclick = e => e.stopPropagation();
      b.appendChild(r);

      // Gram ved siden av prosent. Prosent er riktig enhet for modellen, men
      // gram er det du har i skapet — har du 250 g solsikke igjen, vil du legge
      // inn 250 og se hva det tilsvarer, ikke regne baklengs selv.
      const gramNaa = tilleggGram(B, t);
      const rad = el('div', 'gramrad');
      rad.innerHTML = `<span class="small">gram</span>`;
      const gi = el('input');
      gi.type = 'number'; gi.min = '0'; gi.step = '10';
      gi.value = Math.round(gramNaa);
      gi.dataset.k = 'tilleggGram-' + t.id;
      gi.onclick = e => e.stopPropagation();
      gi.oninput = () => {
        const v = +gi.value;
        if (!isFinite(v) || v < 0) return;
        settTilleggGram(t.id, v);
        byggEndret();
      };
      rad.appendChild(gi);
      rad.appendChild(el('span', 'small', `= ${pst(S.byggTillegg[t.id], t.pct < 1 ? 2 : 1)} av melet`));
      b.appendChild(rad);

      // Vei tilbake til anbefalt nivå etter at man har eksperimentert.
      // Vises bare når man faktisk har flyttet seg fra det.
      if (Math.abs(S.byggTillegg[t.id] - t.pct) > (t.pct < 1 ? 0.03 : 0.5)) {
        const ret = el('button', 'btn ghost sm tilbakestill',
          `↺ Tilbake til anbefalt (${fmt(t.pct, t.pct < 1 ? 2 : 0)} %)`);
        ret.type = 'button';
        ret.onclick = e => {
          e.stopPropagation();
          S.byggTillegg[t.id] = t.pct;
          byggEndret();
        };
        b.appendChild(ret);
      }
    }
    lv.appendChild(b);
  });

  // --- Utstyr ---
  const uv = $('#byggUtstyr');
  if (!uv.options.length) { UTSTYR.forEach(u => { const o = el('option', null, u.navn); o.value = u.id; uv.appendChild(o); }); }
  uv.value = S.byggUtstyr;
  $('#byggAntall').value = S.byggAntall; $('#byggVekt').value = S.byggVekt;

  const { gr, tp, ut, lukket, r, g, torr, gjaerPct, hyd, rise } = B;

  $('#grovhetUt').innerHTML = `<div class="note">${gr.om}</div>`;
  $('#tidUt').innerHTML = `<div class="note">${tp.om}</div>
    <div class="note ${tp.id === 'optimal' ? 'ok' : tp.ovnslos < 85 ? 'warn' : ''}">
      Med denne planen løser appen gjærmengden til <b>${fmt(torr, 3)} % tørrgjær</b> (tilsvarer ${fmt(gjaerKonverter(torr, 'torr', 'fersk'), 2)} % fersk)
      for å treffe måldosen ${fmt(B.maalDose, 2)}. ${torr > 0.55 ? 'Så høy gjærmengde gir et hevevindu på 10–20 minutter — følg deigen, ikke klokka.' : torr < 0.14 ? 'Lav gjærmengde gir et bredt, tilgivende hevevindu.' : ''}</div>` +
    (B.underskudd > 0.02 ? `<div class="note bad"><b>Denne planen rekker ikke helt fram.</b> Gjæren er satt på det praktiske taket 0,83 % tørrgjær, og deigen når likevel bare ${fmt((1 - B.underskudd) * 100, 0)} % av måldosen. Mer gjær enn dette gir gjærsmak, smalere hevevindu og dårligere løft — det løser ikke problemet, det bytter det ut. Regn med et tettere brød med mindre smak. Har du 60 minutter til, velg neste plan opp; det er den billigste kvalitetsøkningen som finnes.</div>` : '');
  $('#utstyrUt').innerHTML = `<div class="note ${ut.id === 'glass' ? 'warn' : ''}">${ut.om}</div>` +
    (ut.id === 'glass' ? `<div class="note bad"><b>Termisk sjokk:</b> finn produsentens maksgrense før du forvarmer. Borosilikat tåler ~150 °C sprang, herdet kalknatronglass bare 60–80 °C, og mye glassbakeutstyr er kun godkjent til 220–250 °C. Sett heller glassgryta oppå det forvarmede stålet — da gjør stålet jobben glasset ikke klarer.</div>` : '');

  // Tilleggseffekter
  const lu = $('#tilleggUt'); lu.innerHTML = '';
  if (B.froPct.length || Object.values(B.smak).some(v => v > 0)) {
    let h = '<table><thead><tr><th>Tillegg</th><th class="n">Gram</th><th class="n">Binder vann</th><th>Effekt</th></tr></thead><tbody>';
    r.fro.forEach(f => {
      const t = TILLEGG.find(x => x.id === f.id);
      h += `<tr><td><b>${f.navn}</b><div class="small">${t ? t.hvorfor : ''}</div>
              ${t && t.opt ? `<div class="small" style="color:var(--grønn);margin-top:3px"><b>Anbefalt:</b> ${t.opt}</div>` : ''}</td>
            <td class="n mono">${fmt(f.gram)}</td><td class="n mono">${fmt(f.bloetleggVann)} g</td>
            <td class="small">${t ? t.obs : ''}
              ${t && t.opp ? `<div style="margin-top:5px"><b style="color:var(--gull)">▲ Mer:</b> ${t.opp}</div>` : ''}
              ${t && t.ned ? `<div style="margin-top:4px"><b style="color:var(--blå)">▼ Mindre:</b> ${t.ned}</div>` : ''}</td></tr>`;
    });
    [['honningPct', r.honning, 'Honning'], ['maltPct', r.malt, 'Diastatisk malt'], ['oljePct', r.olje, 'Olivenolje']].forEach(([k, gram, navn]) => {
      if (!(B.smak[k] > 0)) return;
      const t = TILLEGG.find(x => x.felt === k);
      h += `<tr><td><b>${navn}</b><div class="small">${t ? t.hvorfor : ''}</div>
              ${t && t.opt ? `<div class="small" style="color:var(--grønn);margin-top:3px"><b>Anbefalt:</b> ${t.opt}</div>` : ''}</td>
            <td class="n mono">${fmt(gram, 1)}</td><td class="n mono">${k === 'honningPct' ? fmt(r.honningVann, 1) + ' g' : '–'}</td>
            <td class="small">${t ? t.obs : ''}
              ${t && t.opp ? `<div style="margin-top:5px"><b style="color:var(--gull)">▲ Mer:</b> ${t.opp}</div>` : ''}
              ${t && t.ned ? `<div style="margin-top:4px"><b style="color:var(--blå)">▼ Mindre:</b> ${t.ned}</div>` : ''}</td></tr>`;
    });
    h += '</tbody></table>';
    lu.innerHTML = h;
    lu.appendChild(el('div', 'note',
      `Tilleggene fortynner strukturen fra <b>${fmt(r.grovMelAndel * 100, 1)} %</b> (bare melet) til <b>${fmt(r.fortynnetAndel * 100, 1)} %</b> av alt tørrstoffet, og binder <b>${fmt(r.froAbsorbert)} g vann</b> som er lagt på toppen av hydreringen.
       <br>${r.kornTillegg > 0
         ? `<b>Men bare korndelen teller som grovhet.</b> Brødskala'n holder frø og nøtter helt utenfor regnestykket, mens korngrynene (${gram(r.kornTillegg)}) teller fullt med. Brødet havner derfor på <b>${fmt(r.brodskala.pct, 1)} %</b> — opp fra ${fmt(r.grovMelAndel * 100, 1)} % på melet alene — og merkes som <b>${r.brodskala.kort.toLowerCase()}</b>. Frøene flyttet det ikke ett prosentpoeng.`
         : `<b>Men grovheten endrer seg ikke av det.</b> Brødskala'n holder frø og nøtter utenfor regnestykket, så brødet står fortsatt på <b>${fmt(r.brodskala.pct, 1)} %</b> og merkes som <b>${r.brodskala.kort.toLowerCase()}</b>.`}`));
  } else lu.innerHTML = '<p class="small">Ingen tillegg valgt. Loff+ med 10 % sammalt og 6 % ristede solsikkekjerner er det klassiske svaret på «litt sunnere loff» — ristede frø gir omtrent dobbelt så mye smak per gram som uristede, så 6 % ristede tilsvarer 12 % uristede.</p>';

  tegnEffekt(B);

  // Nøkkeltall
  const st = $('#byggStats'); st.innerHTML = '';
  const stat = (k, v, u, cls) => st.appendChild(el('div', 'stat ' + (cls || ''), `<div class="k">${k}</div><div class="v">${v}<span class="u">${u || ''}</span></div>`));
  stat('Deighydrering', fmt(hyd * 100, 1), ' %', lukket ? 'ok' : '');
  stat('Grovt mel', fmt(r.grovMelAndel * 100, 1), ' %');
  stat(`Brødskala'n`, fmt(r.brodskala.pct, 1), ' %', 'ok');
  stat('Merkes som', r.brodskala.kort, '');
  stat('Strukturfortynning', fmt(r.fortynnetAndel * 100, 1), ' %');
  stat('Glutenbærende', fmt(r.glutenbaerende * 100, 1), ' %', r.glutenbaerende < 0.55 ? 'warn' : 'ok');
  stat('Tørrgjær', fmt(torr, 3), ' %');
  stat('Gjæringsdose', fmt(g.dose, 2), '', 'ok');
  stat('Mål heveprosent', `${fmt(rise, 0)}–${fmt(rise * 1.2, 0)}`, ' %');
  // Total tid leses fra den ekte bakekjeden, ikke av en egen sum med en fast
  // 1,5-times påplussing. De to spriket med 1,3 timer på samme brød.
  const bs = bakeSteg();
  stat('Total tid', fmt((bs.ferdig - bs.start) / 3600000, 1), ' t');
  stat('Pris per brød', fmt(r.kost.perBrod, 2), ' kr');

  // Notiser
  const bn = $('#byggNotiser'); bn.innerHTML = '';
  if (lukket) bn.appendChild(el('div', 'note ok',
    `Hydreringen er hevet 3 prosentpoeng fordi du steker i lukket gryte: veggene støtter deigen mens den utvider seg.
     Siden 45–55 % av ovnsløftet er vann som blir damp, er det ekstra vannet direkte ekstra løft.`));
  if (r.glutenbaerende < 0.55) bn.appendChild(el('div', 'note warn',
    `Bare ${fmt(r.glutenbaerende * 100, 1)} % av tørrstoffet bygger gluten. Elt kort, brett i stedet, og sikt mot lav ende av hevemålet.`));
  const bulkAndel = g.dose > 0 ? g.trinn.filter(t => t.miljo > 12).reduce((s, t) => s + t.dose, 0) / g.dose * 100 : 0;
  bn.appendChild(el('div', 'note', `<b>${fmt(bulkAndel, 0)} %</b> av gjæringen skjer i bulken. Målet er 65–85 %: bulken skal bestemme, kjøleskapet finpusse.`));

  // Tabell
  const t = $('#byggTabell');
  let rows = `<thead><tr><th>Ingrediens</th><th class="n">Vekt</th><th class="n">Av melet</th></tr></thead><tbody>`;
  if (r.forferment) {
    const ff = r.forferment;
    rows += `<tr class="tsec"><td colspan="3">${ff.type === 'biga' ? 'Biga' : 'Poolish'} — ${fmt(ff.timer, 0)} t ved ${grader(ff.temp, 0)}</td></tr>
      <tr><td>Hvetemel</td><td class="n mono">${gram(ff.mel)}</td><td class="n mono">${pst(ff.pctMel, 0)} av totalt mel</td></tr>
      <tr><td>Vann</td><td class="n mono">${gram(ff.vann)}</td><td class="n mono">${pst(ff.hydrering, 0)} av ff-mel</td></tr>
      <tr><td>Tørrgjær</td><td class="n mono">${gram(ff.gjaer, 2)}</td><td class="n mono">${pst(ff.gjaerPctAvFfMel, 3)} av ff-mel</td></tr>
      <tr><td>Salt <span class="small">(bremser proteasene)</span></td><td class="n mono">${gram(ff.salt, 1)}</td><td class="n mono">${pst(0.15, 2)} av ff-mel</td></tr>`;
  }
  rows += `<tr class="tsec"><td colspan="3">Hoveddeig</td></tr>`;
  r.mel.forEach(m => rows += `<tr><td>${m.navn}</td><td class="n mono">${gram(m.gram)}</td><td class="n mono">${pst(m.pct, 1)}</td></tr>`);
  rows += `<tr><td>Vann i hoveddeigen</td><td class="n mono">${gram(r.vannHoved)}</td><td class="n mono">${pst(r.vannHoved / r.melTotal * 100, 1)}</td></tr>`;
  rows += `<tr><td>Salt</td><td class="n mono">${gram(r.salt, 1)}</td><td class="n mono">${pst(2.0, 2)}</td></tr>`;
  rows += `<tr><td>Tørrgjær i hoveddeigen</td><td class="n mono">${gram(r.gjaerHoved, 2)}</td><td class="n mono">${pst(r.gjaerHoved / r.melTotal * 100, 3)}</td></tr>`;
  [['Honning', r.honning], ['Diastatisk malt', r.malt], ['Olivenolje', r.olje]].forEach(([n2, v]) => {
    if (v > 0.05) rows += `<tr><td>${n2}</td><td class="n mono">${gram(v, 1)}</td><td class="n mono">${pst(v / r.melTotal * 100, 2)}</td></tr>`;
  });
  if (r.fro.length) {
    rows += `<tr class="tsec"><td colspan="3">Bløtlegges separat, minst 30 min</td></tr>`;
    r.fro.forEach(f => rows += `<tr><td>${f.navn} <span class="small">— hell ${gram(f.hellVann)} ${f.varmt ? 'kokende' : 'kaldt'} vann over</span></td><td class="n mono">${gram(f.gram)}</td><td class="n mono">${pst(f.gram / r.melTotal * 100, 1)}</td></tr>`);
  }
  rows += `<tr class="tsum"><td>${S.byggAntall} brød à ${gram(S.byggVekt)}</td><td class="n mono">${gram(r.totalVekt)}</td><td class="n"></td></tr></tbody>`;
  t.innerHTML = rows;

  // Sjekkliste
  // Her stod en hardkodet kopi av utstyr→profil-oppslaget som ikke kjente formen.
  // Den ga sjekklista 260 °C og «damp fanget under glasset», mens Tidsplan,
  // Steking og «Bak nå» samtidig sa 270 °C og kokende vann i støpejernspanne for
  // samme brød. Nå er det ett oppslag, og aktivProfil() er fasiten.
  const prof = aktivProfil();
  $('#byggSjekk').innerHTML = `
    <div class="note ok"><b>1. Sett inn ved 75–85 % heving, ikke 100 %.</b> Trykktesten skal fylles langsomt igjen over 5–10 sekunder og etterlate et synlig merke. Overheving er den klart vanligste årsaken til dårlig løft — er du i tvil, bak 15 minutter for tidlig.</div>
    <div class="note ok"><b>2. Forvarm ${ut.forvarm}.</b> ${ut.id === 'stal15' ? 'Ditt 15 mm stål lagrer 55 700 J/m²K — mer enn dobbelt så mye som en vanlig bakestein — og trenger derfor 90–120 minutter for full metning. De fleste gir det halvparten.' : 'Ovnens pipelyd betyr ingenting; steinen ligger typisk 116 °C for lavt etter 15 minutter.'}</div>
    <div class="note ok"><b>3. ${prof.damp}</b>, i ${prof.dampTid}. Etter kondensasjonsfasen på ~2 minutter fjerner damp 25–31 % av varmestrømmen, så ta den helt ut ved 15–20 min.</div>
    <div class="note ok"><b>4. Bak rett fra kjøleskapet.</b> Kald kjerne holder seg ekstensibel lenger mens bunnen varmes. Legg 2–4 min på steketiden.</div>
    <div class="note ok"><b>5. Snitt med buet blad, 30–45° fra vannrett, 6–13 mm dypt, ett bestemt drag.</b> Øret er en underskåret flik, ikke et kutt.</div>
    <div class="note ok"><b>6. ${prof.inn} °C inn, ned til ${prof.ned} °C straks døra lukkes.</b> ${prof.rist}. Stek ${prof.tid} til ${prof.kjerne} kjerne.</div>
    <div class="note"><b>7. Avkjøl til 35–38 °C før du skjærer.</b> Stivelsen setter seg under nedkjølingen, ikke under stekingen — 3–4 timer for et 900 g brød.</div>`;
}

/* ============================================================
   VISNING: OPPSKRIFT
   ============================================================ */
/* Sett gram på én melsort ved å justere prosenten. De andre melsortene beholder
   sitt innbyrdes forhold, så det er bare denne raden som flytter seg — ellers
   ville det å skrive inn ett tall stokket om hele blandingen.
   Melmengden avhenger av prosentene, så dette itereres til det står stille. */
function settMelGram(i, gram) {
  for (let n = 0; n < 6; n++) {
    const r = beregn().r;
    if (!isFinite(r.melTotal) || r.melTotal <= 0) break;
    const sum = S.melListe.reduce((s, m) => s + m.pct, 0) || 100;
    const andreSum = sum - S.melListe[i].pct;
    const oensketAndel = Math.min(0.99, Math.max(0, gram / r.melTotal));
    // ny_pct / (ny_pct + andreSum) = ønsket andel
    S.melListe[i].pct = andreSum > 0
      ? Math.max(0, oensketAndel * andreSum / Math.max(1 - oensketAndel, 1e-6))
      : 100;
  }
}

/* Gramverdiene fra forrige tegning, slik at feltene kan fylles ut uten å regne
   oppskriften to ganger i samme runde. */
let forrigeMelGram = [];

function tegnOppskrift() {
  // Mel-rader
  const mv = $('#melListe'); mv.innerHTML = '';
  forrigeMelGram = beregn().r.mel.map(m => m.gram);
  S.melListe.forEach((m, i) => {
    const row = el('div', 'melrow');
    const bilde = el('span', 'kornikon', melSvg(m.id, { h: 34 }));
    const sel = el('select');
    // Favorittene først, i sin egen gruppe. Resten som før, gruppert på korntype.
    const favs = FLOURS.filter(f => S.favorittMel.includes(f.id));
    if (favs.length) {
      const og = el('optgroup'); og.label = '★ Favoritter'; sel.appendChild(og);
      favs.forEach(f => { const o = el('option', null, f.navn); o.value = f.id; og.appendChild(o); });
    }
    let grp = '';
    FLOURS.forEach(f => {
      if (f.gruppe !== grp) { grp = f.gruppe; sel.appendChild(el('optgroup')).label = grp; }
      const o = el('option', null, f.navn); o.value = f.id;
      sel.lastChild.appendChild(o);
    });
    sel.value = m.id;
    sel.dataset.k = 'mel-id-' + i;
    sel.onchange = () => { S.melListe[i].id = sel.value; oppdater(); };
    const inp = el('input'); inp.type = 'number'; inp.step = '1'; inp.min = '0'; inp.value = m.pct;
    inp.dataset.k = 'mel-pct-' + i;
    inp.oninput = () => { S.melListe[i].pct = +inp.value || 0; oppdater(); };
    // Gram ved siden av prosenten, og redigerbart begge veier: har du 500 g
    // igjen av en melsort, skriver du 500 i stedet for å regne ut andelen selv.
    const gInp = el('input');
    gInp.type = 'number'; gInp.min = '0'; gInp.step = '10';
    gInp.dataset.k = 'mel-gram-' + i;
    gInp.title = 'Gram av dette melet — endrer prosenten tilsvarende';
    const melRad = forrigeMelGram[i];
    gInp.value = melRad !== undefined ? Math.round(melRad) : '';
    gInp.oninput = () => {
      const v = +gInp.value;
      if (!isFinite(v) || v < 0) return;
      settMelGram(i, v);
      oppdater();
    };
    const x = el('button', 'x', '×');
    x.onclick = () => { S.melListe.splice(i, 1); oppdater(); };
    row.append(bilde, sel, inp, gInp, x); mv.appendChild(row);
  });

  // Frø-rader
  const fv = $('#froListe'); fv.innerHTML = '';
  S.froListe.forEach((f, i) => {
    const row = el('div', 'frorow');
    const bilde = el('span', 'kornikon', kornSvg(f.id, { h: 34, alt: f.id }));
    const sel = el('select');
    SOAKERS.forEach(s => { const o = el('option', null, s.navn); o.value = s.id; sel.appendChild(o); });
    sel.value = f.id;
    sel.dataset.k = 'fro-id-' + i;
    sel.onchange = () => { S.froListe[i].id = sel.value; oppdater(); };
    const inp = el('input'); inp.type = 'number'; inp.step = '10'; inp.min = '0'; inp.value = f.gram;
    inp.dataset.k = 'fro-gram-' + i;
    inp.oninput = () => { S.froListe[i].gram = +inp.value || 0; oppdater(); };
    // Frø oppgis i gram, men prosent av melet er tallet all faglitteratur bruker
    // — og det som avgjør hva det koster i ovnsløft. Vis begge.
    const froR = beregn().r;
    const pctAvMel = froR.melTotal > 0 ? (f.gram || 0) / froR.melTotal * 100 : 0;
    const pctVis = el('span', 'small gramhint', pst(pctAvMel, 1) + '<br>av melet');
    const lab = el('label', 'inline', `<input type="checkbox" ${f.varmt ? 'checked' : ''}> varmt`);
    lab.style.margin = '0';
    lab.querySelector('input').onchange = e => { S.froListe[i].varmt = e.target.checked; oppdater(); };
    const x = el('button', 'x', '×');
    x.onclick = () => { S.froListe.splice(i, 1); oppdater(); };
    row.append(bilde, sel, inp, pctVis, lab, x); fv.appendChild(row);
  });

  const { r } = beregn();

  // Melvarsler
  const ma = $('#melAdvarsel'); ma.innerHTML = '';
  S.melListe.forEach(m => {
    const f = FLOURS.find(x => x.id === m.id); if (!f) return;
    const andel = m.pct / (S.melListe.reduce((s, y) => s + y.pct, 0) || 100) * 100;
    if (andel > f.maxPct) ma.appendChild(el('div', 'note warn',
      `<b>${f.navn} på ${fmt(andel)} %</b> er over praktisk tak (${f.maxPct} %) for et frittstående brød. ${f.notat}`));
  });
  const sum = S.melListe.reduce((s, m) => s + m.pct, 0);
  if (Math.abs(sum - 100) > 0.5) ma.appendChild(el('div', 'note',
    `Melprosentene summerer til <b>${fmt(sum, 1)} %</b> — appen normaliserer til 100 %.`));

  // Anbefalt hydrering
  const anb = r.anbefaltHydrering * 100;
  if (Math.abs(anb - S.hydrering) > 1.5) {
    ma.appendChild(el('div', 'note', `Melblandingen har absorpsjonsfaktor <b>${fmt(r.absFaktor, 2)}</b>. Med ditt siktede-hvete-utgangspunkt tilsvarer ${fmt(S.hydrering)} % en <b>effektiv styrke som ${fmt(anb, 1)} %</b> ville gitt på rent siktet hvetemel.`));
  }

  // Smaksnotiser
  const sn = $('#smakNotiser'); sn.innerHTML = '';
  // Tersklene matcher teksten (1,8/2,2) — før slo advarselen først inn ved
  // 1,7/2,4, så en bruker på 1,75 % fikk aldri beskjed om at gulvet var 1,8.
  if (S.saltPct < 1.8) sn.appendChild(el('div', 'note warn', 'Under 1,8 % salt smaker brødet flatt og gjærer uforutsigbart — og skorpa blir blekere, fordi gjæren rekker å spise opp sukkeret.'));
  if (S.saltPct > 2.2) sn.appendChild(el('div', 'note warn', 'Over 2,2 % begynner du å betale i hevehøyde uten smaksgevinst.'));
  // Salt er parameteren der svakt/grovt mel vinner mest (+51 % målt styrke) —
  // grove deiger bør ligge mot 2,0, ikke på gulvet.
  if (r.grovMelAndel > 0.25 && S.saltPct >= 1.8 && S.saltPct < 1.9) sn.appendChild(el('div', 'note warn', `Med ${fmt(r.grovMelAndel * 100, 0)} % grovt mel bør saltet mot <b>2,0 %</b> — svakt mel vinner mest deigstyrke på salt.`));
  if (S.honningPct > 0) {
    const v = r.honning * 0.171;
    sn.appendChild(el('div', 'note ok', `Honningen bærer <b>${fmt(v, 1)} g vann</b> (17,1 %), som er trukket fra hovedvannet. Ved ${fmt(S.honningPct, 1)} % er du fortsatt på den akselererende siden — gassproduksjonen topper først rundt 7 % sukker. Ha den i deigen, ikke i forfermenten.`));
  }
  if (S.maltPct > 0) {
    sn.appendChild(el('div', 'note ' + (S.maltPct > 0.75 ? 'bad' : 'warn'),
      S.maltPct > 0.75
      ? `<b>${fmt(S.maltPct, 2)} % diastatisk malt er over det regulatoriske taket på 0,75 %.</b> Over 1 % gir gummiaktig krumme og rødbrun skorpe.`
      : `Sjekk ingredienslisten på melet ditt først. Mye kommersielt mel er allerede maltet, og å legge 0,5 % på toppen er den vanligste måten hjemmebakere lager gummikrumme på.`));
  }
  if (S.smorPct > 5 || S.oljePct > 5) sn.appendChild(el('div', 'note warn', 'Over 5 % fett går glutennettverket fra å bli støttet til å bli kortet: deigen blir kortere, mykere og holder dårligere på gassen. Under 5 % kan fettet i praksis inn når som helst; over 5 % skal det inn etter at glutenet er utviklet.'));
  if (S.smorPct > 0) sn.appendChild(el('div', 'note', `Smøret bærer <b>${fmt(r.smorVann, 1)} g vann</b> (16 %), trukket fra hovedvannet.`));

  // Forferment
  $('#ffFelt').style.display = S.forferment.bruk ? '' : 'none';
  const fu = $('#ffUt'); fu.innerHTML = '';
  if (r.forferment) {
    const ff = r.forferment;
    const enhet = { fersk: 'fersk gjær', torr: 'tørrgjær', aktiv: 'aktiv tørrgjær' }[S.gjaerType];

    // Sjekk gyldighetsområdet FØR tallene vises. Ser man «28,65 g tørrgjær» først,
    // har man allerede begynt å tro på det.
    const ffFersk = gjaerKonverter(ff.gjaerPctAvFfMel, S.gjaerType, 'fersk');
    const utenforOmraade = S.forferment.temp < 12 || ffFersk > 3;
    if (utenforOmraade) {
      /* Kald biga er ETABLERT italiensk praksis («biga fredda» / «biga in frigo»),
         ikke et hjemmekompromiss — Molino Quaglia har publisert en direkte
         sammenligning mot Giorilli-standarden med likt resultat på løft.
         Men modellen her kan ikke regne den ut, og grunnen er prinsipiell:
         Petra bruker SAMME gjærmengde og får moden biga på 16 t ved 16 °C og
         24 t ved 4 °C — bare 1,5× lengre tross 12 graders fall. Det er umulig
         hvis gassproduksjon var det tidsbestemmende. En bigas modenhet styres av
         enzymatisk modning og gjærformering, ikke av gassvolum, og det er en
         annen mekanisme enn den kurven appen regner på.
         Derfor: ikke ekstrapoler — oppgi den dokumenterte praksisen i stedet. */
      const ffMelG = ff.mel;
      const oppskrift = (navn, ferskPct, tekst) =>
        `<tr><td><b>${navn}</b><div class="small">${tekst}</div></td>
             <td class="n mono">${pst(ferskPct, 2)} fersk<div class="small">${veiG(ffMelG * ferskPct / 100)}</div></td>
             <td class="n mono">${pst(ferskPct / 3, 3)} tørr<div class="small">${veiG(ffMelG * ferskPct / 300)}</div></td></tr>`;

      fu.appendChild(el('div', 'note bad',
        `<b>Modellen kan ikke regne på kald biga — men praksisen finnes, og den er dokumentert.</b>
         Formelen her er tilpasset modning ved 16–24 °C, og ved ${grader(S.forferment.temp, 0)} kompenserer den for kulden
         ved å skru gjæren opp til ${pst(ffFersk, 1)} fersk. Det er ikke et tall noen bruker.
         <br>Grunnen er prinsipiell: en biga er ikke «moden» når den har produsert nok gass, men når melet er enzymatisk
         modnet og gjæren har formert seg. Molino Quaglia kjørte to bigaer side om side på samme mel og
         <b>samme gjærmengde</b> — 16 t ved 16 °C mot 24 t ved 4 °C — og fikk «lignende resultat i løft og sprøhet».
         Bare 1,5× lengre tid tross 12 graders fall. Det kan ikke forklares av gassproduksjon.
         <b>Bruk tabellen under i stedet for tallet appen regner ut.</b>`));

      fu.appendChild(el('div', 'note',
        `<b>Dokumentert praksis for kald biga</b> — gjærmengder i prosent av forfermentmelet (${gram(ffMelG)}):
         <table style="margin-top:8px"><tbody>
         ${oppskrift('24 t ved 4 °C — hovedanbefalingen', 1.0, 'Petra-protokollen. Hev hydreringen til 50 %, ikke 45. Rett i kjøleskapet.')}
         ${oppskrift('Varm start, så kaldt — 24 t totalt', 0.5, '2–3 t på kjøkkenet, deretter 21–22 t kaldt. Bruk denne om kjøleskapet ditt ligger på 3 °C.')}
         ${oppskrift('48 t delt — best aroma', 0.5, '24 t ved 4 °C, deretter varm sluttfase. På ditt 21–24 °C kjøkken: kort sluttfasen til 12–16 t.')}
         </tbody></table>`));

      fu.appendChild(el('div', 'note warn',
        `<b>Den vanligste grunnen til at hjemmebakeres kalde biga mislykkes:</b> for lav temperatur ut av bollen.
         Da blir bigaen stående blokkert i kjøleskapet og kommer aldri i gang.
         Sikt mot <b>25–26 °C</b> ut av blandingen — altså varmere enn du er vant til, ikke kaldere.
         Den italienske tommelfingerregelen er vanntemperatur = <b>70 − (romtemp + meltemp)</b>,
         som med ${grader(S.dtMelTemp, 0)} mel og 23 °C kjøkken gir ${grader(70 - 23 - S.dtMelTemp, 0)}.`));

      fu.appendChild(el('div', 'note warn',
        `<b>Melet er en større flaskehals enn temperaturen.</b> Alle biga-kildene krever W 300–350.
         Regal ligger godt under det. Over 24–48 timer kaldt er det proteolysen på for svakt mel som biter deg,
         ikke kulden. <b>Bruk Caputo Cuoco til bigadelen</b> — også når du ikke baker ciabatta.
         Alternativt: velg poolish ved 21–22 °C, som treffer kjøkkentemperaturen din uten kompromiss.`));
    }

    fu.appendChild(el('div', 'note ok',
      `<b>${ff.type === 'biga' ? 'Biga' : ff.type === 'pate' ? 'Pâte fermentée' : 'Poolish'}:</b>
       ${fmt(ff.mel)} g mel · ${fmt(ff.vann)} g vann · <b>${fmt(ff.gjaer, 2)} g ${enhet}</b>
       (${fmt(ff.gjaerPctAvFfMel, 3)} % av poolishmelet)${ff.salt > 0.3 ? ` · ${fmt(ff.salt, 1)} g salt` : ''}.
       <br>Ferdig etter ${fmt(ff.timer, 1)} t ved ${fmt(ff.temp, 1)} °C. Brukbar ${fmt(ff.brukTidligst, 1)}–${fmt(ff.brukSenest, 1)} t, hardt tak ${fmt(ff.hardtTak, 1)} t.`));
    if (!utenforOmraade && r.gjaerHoved <= 0.01) fu.appendChild(el('div', 'note bad',
      `<b>Forfermenten krever mer gjær enn hele oppskriften har.</b> Den skal ha ${fmt(ff.gjaer, 2)} g, mens totalen er ${fmt(r.gjaerTotal, 2)} g.
       Hoveddeigen får da null, og den faktiske gjærmengden i brødet blir høyere enn gjæringsdosen er regnet ut fra.
       Forleng modningstiden eller senk temperaturen på forfermenten — begge deler senker gjærbehovet.`));
    if (utenforOmraade) { /* følgefeil — hopp over resten */ }
    else if (underVekt(ff.gjaer)) fu.appendChild(el('div', 'note warn',
      `${veiG(ff.gjaer)} er i minste laget for en vekt som viser ${fmt(S.vektTrinn, vektDesimaler())} g —
       under ca. 20 trinn spiser vektas egen usikkerhet en merkbar andel av mengden.
       Enten øk andelen til 30–35 % av melet, bruk fersk gjær, eller lag en oppslemming:
       løs 1 g gjær i 100 g vann, bruk ${fmt(ff.gjaer * 100, 0)} g av blandingen og trekk det fra forfermentens vann.`));
    else fu.appendChild(el('div', 'note ok',
      `${veiG(ff.gjaer)} lar seg veie greit på vekta di (${fmt(S.vektTrinn, vektDesimaler())} g). Ingen oppslemming nødvendig.`));
    if (!utenforOmraade) fu.appendChild(el('div', 'note',
      `Ta den når den har kuppel og <b>akkurat begynner å synke i midten</b>, med vannmerke på beholderveggen. 0,15 % salt bremser proteasene som ellers får den til å bli flytende innvendig.`));
    // Temperaturvinduet er bredere enn folkevisdommen sier, og det er verdt å si
    // fra om — «jeg har ikke 18 °C» er den vanligste grunnen til at folk dropper
    // biga helt, og den grunnen holder ikke.
    if (!utenforOmraade && ff.type === 'biga' && S.forferment.temp >= 12)
      fu.appendChild(el('div', 'note ok',
        `<b>Du trenger ikke treffe 18 °C.</b> Det tallet er fagkonvensjon, ikke et målt optimum — det finnes ingen
         publisert temperaturoptimalisering for biga. Mellom <b>12 og 22 °C</b> endrer alle rater seg jevnt med under 2×,
         og forholdet mellom enzym- og gjæraktivitet forskyves bare rundt 1,2 × over hele spennet.
         Det som faktisk er evidensforankret, er hydreringen på ${pst(ff.hydrering, 0)} — stiv deig bremser bakteriene og gir
         høy gjæringstoleranse — og at du holder deg <b>under 26 °C</b>, der forholdet mellom gjær og melkesyrebakterier
         begynner å forskyve seg. Kjøkkenet ditt på 21–22 °C er altså fullt brukbart: appen har allerede kuttet gjæren
         til ${pst(ff.gjaerPctAvFfMel, 3)} for å kompensere.`));

    if (ff.hydrering <= 60) fu.appendChild(el('div', 'note',
      `Stiv forferment på ${fmt(ff.hydrering)} % vann gjærer <b>${fmt(stivhetsMultiplikator(ff.hydrering / 100), 1)}× saktere</b> enn en 100 % poolish — derfor trenger den mer gjær ved samme tid. Bland kun til den er lurvete; rå melklumper er riktig.`));
  }

  // Nøkkeltall
  const st = $('#oppskriftStats');
  st.innerHTML = '';
  const stat = (k, v, u, cls) => st.appendChild(el('div', 'stat ' + (cls || ''), `<div class="k">${k}</div><div class="v">${v}<span class="u">${u || ''}</span></div>`));
  stat('Totalvekt', fmt(r.totalVekt), ' g');
  stat('Sum mel', fmt(r.melTotal), ' g');
  stat('Vann totalt', fmt(r.vannTotal), ' g');
  stat('Deighydrering', fmt(r.effektivHydrering * 100, 1), ' %',
       Math.abs(r.effektivHydrering * 100 - S.hydrering) > 4 ? 'warn' : 'ok');
  if (r.froAbsorbert > 5) stat('Bundet i frø', fmt(r.froAbsorbert), ' g');
  if (r.froAbsorbert > 5) stat('Vann av mel totalt', fmt(r.oppgittHydrering * 100, 1), ' %');
  stat('Grovt mel', fmt(r.grovMelAndel * 100, 1), ' %');
  stat(`Brødskala'n`, `${fmt(r.brodskala.pct, 1)} % · ${r.brodskala.kort}`, '', 'ok');
  if (r.froAndel > 0.01) stat('Frø i % av mel', fmt(r.froAndel * 100, 1), ' %');
  if (r.froAndel > 0.01) stat('Strukturfortynning', fmt(r.fortynnetAndel * 100, 1), ' %', 'warn');
  stat('Glutenbærende andel', fmt(r.glutenbaerende * 100, 1), ' %',
       r.glutenbaerende < 0.45 ? 'bad' : r.glutenbaerende < 0.55 ? 'warn' : 'ok');
  stat('Pris per brød', fmt(r.kost.perBrod, 2), ' kr');

  // Notiser
  const on = $('#oppskriftNotiser'); on.innerHTML = '';
  if (r.froAndel > 0.01) on.appendChild(el('div', 'note',
    `<b>De fire tallene, som ofte forveksles:</b>
     «Grovt mel» (${fmt(r.grovMelAndel * 100, 1)} %) er andelen av <i>melet</i> som er sammalt — det er tallet regnearket ditt regner, og det som styrer hvor mye kli som kutter glutentrådene.
     «Frø i % av mel» (${fmt(r.froAndel * 100, 1)} %) er bakerprosent frø. Frø kutter <i>ikke</i> gluten slik kli gjør; de er inerte innslag som fortynner nettverket og stjeler vann.
     «Brødskala'n» (${fmt(r.brodskala.pct, 1)} % — <b>${r.brodskala.klasse.toLowerCase()}</b>) er den <i>offisielle</i> grovheten: hele korn, sammalt mel, kli og korngryn delt på total melmengde. Frø og nøtter holdes helt utenfor brøken, så solsikke gjør ikke brødet grovere i lovens forstand. ${r.brodskala.nokkelhull ? 'Denne blandingen passerer Nøkkelhullets krav på 30 % fullkorn.' : `Nøkkelhullet krever 30 % — du mangler ${fmt(30 - r.brodskala.pct, 1)} prosentpoeng.`}
     «Strukturfortynning» (${fmt(r.fortynnetAndel * 100, 1)} %) er hvor stor del av alt tørrstoffet som ikke bygger struktur. Her teller frøene fullt, og det er dette som avgjør hvor tett brødet oppleves — ikke Brødskala'n.
     <br>Nøkkeltallet for bakingen er likevel <b>glutenbærende andel: ${fmt(r.glutenbaerende * 100, 1)} %</b>. Det er hvor lite mel som skal bære hele brødet.`));

  if (r.glutenbaerende < 0.55) on.appendChild(el('div', 'note ' + (r.glutenbaerende < 0.45 ? 'bad' : 'warn'),
    `Bare <b>${fmt(r.glutenbaerende * 100, 1)} %</b> av tørrstoffet bygger gluten. Under 55 % må du kompensere aktivt:
     sterkere hvetemel, salt opp mot 2,0 % (svakt mel vinner målt +51 % styrke på salt, sterkt mel bare +9 %),
     stiv biga framfor poolish, kortere elting, og lavere hydrering enn tallene i notatene dine tilsier.`));

  if (r.froAbsorbert > 20) {
    if (S.froVannPaaToppen) on.appendChild(el('div', 'note ok',
      `Frøvannet er regnet inn. Frøene binder <b>${fmt(r.froAbsorbert)} g</b>, som er lagt <b>på toppen</b> av hydreringen:
       totalt vann ${fmt(r.vannTotal)} g (${fmt(r.oppgittHydrering * 100, 1)} % av melet), mens selve deigen får de ${fmt(S.hydrering, 1)} % du oppga.
       Bløtlegg frøene i sitt eget vann minst 30 minutter først — ellers trekker de vannet ut av glutenet underveis i bulken,
       og deigen strammer seg time for time uten at du skjønner hvorfor. Det er akkurat den effekten som gjør at «samme oppskrift» oppfører seg ulikt fra bak til bak når frømengden varierer.`));
    else on.appendChild(el('div', 'note warn',
      `Frøene binder <b>${fmt(r.froAbsorbert)} g vann</b> som de tar fra den oppgitte hydreringen. Deigen føles derfor som
       <b>${fmt(r.effektivHydrering * 100, 1)} %</b>, ikke ${fmt(S.hydrering, 1)} %.
       Det er samme konvensjon som regnearket ditt, og forklarer hvorfor et «75 %-brød» med mye frø oppfører seg langt fastere enn tallet skulle tilsi.
       Vil du at deigen faktisk skal ha ${fmt(S.hydrering, 1)} %, kryss av for «legg vannet på toppen» under Frø.
       Uansett: bløtlegg frøene i halve vannmengden i 30 minutter først — ellers stjeler de vannet fra glutenet underveis.`));
  }
  // Vektet styrke, ikke svakeste enkeltmel: 80 % Caputo Cuoco + 20 % Regal er
  // 0,8×5 + 0,2×4,5 = 4,9 og skal IKKE utløse advarsel på 82 % — det er appens
  // eget ciabatta-forvalg. Terskelen skjerpes over 82 %.
  const styrkeKrav = S.hydrering > 82 ? 4.85 : 4.7;
  if (S.hydrering >= 78 && r.styrkeVektet < styrkeKrav) on.appendChild(el('div', 'note bad',
    `Du kjører <b>${fmt(S.hydrering, 1)} % hydrering</b>, og melblandingen er ikke sterk nok til det (vektet styrke ${fmt(r.styrkeVektet, 1)} av 5, trenger ${fmt(styrkeKrav, 1)}). Over 78 % trenger du W 300+ i størstedelen av melet, ellers flyter deigen ut. Bland inn mer sterkt hvetemel eller gå ned til 74 % og klatre 2 % per bak.`));
  // Terskelen matcher teksten: advarselen sier «under 78 %», da skal den også utløses der.
  if (S.hydrering < 78 && S.presetId === 'ciabatta') on.appendChild(el('div', 'note warn', 'Ciabatta under 78 % blir et vanlig brød. De store uregelmessige hullene kommer av at glutenfilmene er tynne nok til å blåses enormt opp før de revner.'));

  // Tabell
  const t = $('#oppskriftTabell');
  const rows = [];
  rows.push(`<thead><tr><th>Ingrediens</th><th class="n">Vekt</th><th class="n">Av melet</th><th class="n">Pris</th></tr></thead><tbody>`);
  const pct = g => pst(g / r.melTotal * 100, 1);

  if (r.forferment) {
    rows.push(`<tr class="tsec"><td colspan="4">Forferment — ${r.forferment.type} · ${fmt(r.forferment.timer, 1)} t ved ${grader(r.forferment.temp)}</td></tr>`);
    rows.push(`<tr><td>Mel til forferment</td><td class="n mono">${gram(r.forferment.mel)}</td><td class="n mono">${pct(r.forferment.mel)}</td><td class="n">–</td></tr>`);
    rows.push(`<tr><td>Vann til forferment</td><td class="n mono">${gram(r.forferment.vann)}</td><td class="n mono">${pct(r.forferment.vann)}</td><td class="n">–</td></tr>`);
    rows.push(`<tr><td>Gjær til forferment</td><td class="n mono">${gram(r.forferment.gjaer, 2)}</td><td class="n mono">${pst(r.forferment.gjaerPctAvFfMel, 3)}<span class="small"> av ff-mel</span></td><td class="n">–</td></tr>`);
    if (r.forferment.salt > 0.3) rows.push(`<tr><td>Salt i forferment (mot proteaser)</td><td class="n mono">${gram(r.forferment.salt, 1)}</td><td class="n mono">${pst(0.15, 2)}</td><td class="n">–</td></tr>`);
  }

  rows.push(`<tr class="tsec"><td colspan="4">Mel${r.forferment ? ' (totalt, inkl. det som går i forfermenten)' : ''}</td></tr>`);
  r.mel.forEach(m => rows.push(`<tr><td>${m.navn}</td><td class="n mono">${gram(m.gram)}</td><td class="n mono">${pst(m.pct, 1)}</td><td class="n mono">${kron(m.kost)}</td></tr>`));

  if (r.fro.length) {
    rows.push(`<tr class="tsec"><td colspan="4">Frø — bløtlegges separat</td></tr>`);
    r.fro.forEach(f => rows.push(`<tr><td>${f.navn} <span class="small">(${f.varmt ? 'skåld' : 'kaldt'} — hell ${gram(f.hellVann)} vann, binder ${gram(f.bloetleggVann)})</span></td><td class="n mono">${gram(f.gram)}</td><td class="n mono">${pct(f.gram)}</td><td class="n mono">${kron(f.kost)}</td></tr>`));
  }

  rows.push(`<tr class="tsec"><td colspan="4">Vann</td></tr>`);
  rows.push(`<tr><td>Vann i hoveddeigen</td><td class="n mono">${gram(r.vannHoved)}</td><td class="n mono">${pct(r.vannHoved)}</td><td class="n">–</td></tr>`);
  rows.push(`<tr class="small"><td colspan="4" style="color:var(--txt3)">Hold igjen alt over 70 % av melet (${gram(r.melTotal * 0.70)}) og spe det inn under kjøring, sammen med saltet helt til slutt. Juster alltid deigen med vann, aldri motsatt.</td></tr>`);

  rows.push(`<tr class="tsec"><td colspan="4">Gjær og smak</td></tr>`);
  const gnavn = { fersk: 'Fersk gjær', torr: 'Tørrgjær (instant)', aktiv: 'Aktiv tørrgjær' }[S.gjaerType];
  rows.push(`<tr><td>${gnavn} i hoveddeigen</td><td class="n mono">${gram(r.gjaerHoved, 2)}</td><td class="n mono">${pst(r.gjaerHoved / r.melTotal * 100, 3)}</td><td class="n">–</td></tr>`);
  rows.push(`<tr><td>Salt <span class="small">(siste 2–3 min av eltingen)</span></td><td class="n mono">${gram(r.salt, 1)}</td><td class="n mono">${pst(S.saltPct, 2)}</td><td class="n mono">${kron(r.salt / 1000 * 10)}</td></tr>`);
  [['Honning', r.honning, S.honningPct], ['Olivenolje', r.olje, S.oljePct], ['Sukker', r.sukker, S.sukkerPct], ['Smør', r.smor, S.smorPct], ['Diastatisk malt', r.malt, S.maltPct]]
    .filter(x => x[1] > 0.05)
    .forEach(x => rows.push(`<tr><td>${x[0]}</td><td class="n mono">${gram(x[1], 1)}</td><td class="n mono">${pst(x[2], 2)}</td><td class="n">–</td></tr>`));

  rows.push(`<tr class="tsum"><td>Totalt — ${S.antall} brød à ${gram(S.vektPerBrod)}</td><td class="n mono">${gram(r.totalVekt)}</td><td class="n"></td><td class="n mono">${kron(r.kost.total)}</td></tr>`);
  rows.push('</tbody>');
  t.innerHTML = rows.join('');
}

/* ============================================================
   VISNING: GJÆRING
   ============================================================ */
function tegnGjaering() {
  const { r, g, torr, plan } = beregn();
  if (S.refDose === null || !isFinite(S.refDose)) S.refDose = refDoseFor(S.presetId);
  if (S.maalDose === null || !isFinite(S.maalDose)) S.maalDose = S.refDose;

  // Plantabell
  const pt = $('#planTabell');
  const rows = [`<thead><tr><th>Trinn</th><th class="n">Timer</th><th class="n">Miljø °C</th><th class="n" title="Er deigen delt i emner? Ett emne kjøles mye raskere enn hele batchen.">Utbakt</th><th class="n">Deigtemp slutt</th><th class="n">Ekv. timer</th><th class="n">Dose</th><th></th></tr></thead><tbody>`];
  g.trinn.forEach((t, i) => {
    rows.push(`<tr>
      <td><input data-p="navn" data-i="${i}" data-k="plan-navn-${i}" value="${t.navn}" style="padding:5px 7px"></td>
      <td class="n"><input data-p="timer" data-i="${i}" data-k="plan-timer-${i}" type="number" step="0.25" min="0" value="${t.timer}" style="width:78px;padding:5px 7px;text-align:right"></td>
      <td class="n"><input data-p="miljo" data-i="${i}" data-k="plan-miljo-${i}" type="number" step="0.5" value="${t.miljo}" style="width:78px;padding:5px 7px;text-align:right"></td>
      <td class="n"><input data-p="utbakt" data-i="${i}" type="checkbox" ${t.utbakt ? 'checked' : ''} style="width:auto"> <span class="small">${fmt(t.emneMasse, 2)} kg</span></td>
      <td class="n mono">${grader(t.sluttTemp)}</td>
      <td class="n mono">${fmt(t.ekvTimer, 2)} t</td>
      <td class="n mono"><b>${fmt(t.dose, 2)} GD</b></td>
      <td><button class="x" data-del="${i}">×</button></td>
    </tr>`);
  });
  rows.push(`<tr class="tsum"><td>Sum</td><td class="n mono">${fmtTimer(g.trinn.reduce((s, t) => s + t.timer, 0))}</td><td></td><td></td><td></td><td class="n mono">${fmt(g.ekvTimer, 2)} t</td><td class="n mono">${fmt(g.dose, 2)} GD</td><td></td></tr>`);
  rows.push('</tbody>');
  pt.innerHTML = rows.join('');
  pt.querySelectorAll('input[data-p]').forEach(inp => {
    const skriv = () => {
      const i = +inp.dataset.i, p = inp.dataset.p;
      // Avkryssingsboksen for «utbakt» må leses av checked, ikke av value.
      // Leses den som tall blir «on» til NaN og deretter 0, så boksen slo av
      // seg selv igjen med en gang — og utbakt/samlet er nettopp det valget
      // som avgjør hvor fort emnene kjøles ned og dermed hele kaldhevingen.
      if (inp.type === 'checkbox') S.plan[i][p] = inp.checked;
      else if (p === 'navn') { S.plan[i][p] = inp.value; lagre(); return; }
      else S.plan[i][p] = +inp.value || 0;
      oppdater();
    };
    inp.oninput = skriv;
    if (inp.type === 'checkbox') inp.onchange = skriv;
  });
  pt.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { S.plan.splice(+b.dataset.del, 1); oppdater(); });

  // Nøkkeltall
  const st = $('#gjStats'); st.innerHTML = '';
  const stat = (k, v, u, cls) => st.appendChild(el('div', 'stat ' + (cls || ''), `<div class="k">${k}</div><div class="v">${v}<span class="u">${u || ''}</span></div>`));

  const avvik = S.refDose ? (g.dose / S.refDose - 1) * 100 : 0;
  const cls = Math.abs(avvik) < 8 ? 'ok' : Math.abs(avvik) < 20 ? 'warn' : 'bad';
  stat('Gjæringsdose', fmt(g.dose, 2), '', cls);
  stat('Referansedose', S.refDose ? fmt(S.refDose, 2) : '–', '');
  stat('Avvik fra referanse', (avvik >= 0 ? '+' : '') + fmt(avvik, 0), ' %', cls);
  stat('24 °C-ekvivalente timer', fmt(g.ekvTimer, 1), ' t');
  stat('Tørrgjær-ekvivalent', fmt(torr, 3), ' %');
  stat('Estimert pH', fmt(estimerPH(g.ekvTimer), 2), '');

  const maalRise = maalHeveProsent(S.startTemp, {
    hydrering: S.hydrering / 100, grovAndel: r.grovAndel, styrke: r.svakesteStyrke
  });
  stat('Mål heveprosent i bulk', `${fmt(maalRise, 0)}–${fmt(maalRise * 1.2, 0)}`, ' %');
  const startVol = r.melTotal * 1.5;
  stat('Deigvolum i boksen', `${fmt(startVol)} → ${fmt(startVol * (1 + maalRise / 100))}`, ' ml');

  // Notiser
  const n = $('#gjNotiser'); n.innerHTML = '';

  if (Math.abs(avvik) >= 8) {
    const nyGjaer = gjaerForDose(S.refDose, plan, r.masseKg, { lokk: S.lokk, fulltKjol: S.fulltKjol, antall: S.antall });
    const nyGjaerVist = gjaerKonverter(nyGjaer, 'torr', S.gjaerType);
    const f = tidsfaktorForDose(S.refDose, plan, torr, r.masseKg, { lokk: S.lokk, fulltKjol: S.fulltKjol, antall: S.antall });
    n.appendChild(el('div', 'note ' + (Math.abs(avvik) > 20 ? 'bad' : 'warn'),
      `Planen din gir <b>${avvik > 0 ? fmt(avvik, 0) + ' % mer' : fmt(-avvik, 0) + ' % mindre'} gjæring</b> enn referansen.
       For å treffe nøyaktig: enten <b>${fmt(nyGjaerVist, 3)} % ${{ fersk: 'fersk gjær', torr: 'tørrgjær', aktiv: 'aktiv tørrgjær' }[S.gjaerType]}</b> (nå ${fmt(S.gjaerPct, 3)} %),
       eller skalér alle trinn med <b>${fmt(f, 2)}×</b>.`));
  } else {
    n.appendChild(el('div', 'note ok', `Planen ligger innenfor ±8 % av referansedosen. Dette skal gi samme hevegrad som referansebaket.`));
  }

  // Kjøleskapsanalyse
  const kjolTrinn = g.trinn.filter(t => t.miljo <= 12);
  if (kjolTrinn.length) {
    const kt = kjolTrinn[0];
    const forste6 = stageDose({ timer: Math.min(6, kt.timer), gjaerPct: torr, T0: kt.startTemp, miljo: kt.miljo, masseKg: kt.emneMasse, lokk: kt.utbakt ? false : S.lokk, fulltKjol: S.fulltKjol });
    const andel = kt.ekvTimer > 0 ? forste6.ekvTimer / kt.ekvTimer * 100 : 0;
    const bulkAndel = g.dose > 0 ? g.trinn.filter(t => t.miljo > 12).reduce((s, t) => s + t.dose, 0) / g.dose * 100 : 0;
    n.appendChild(el('div', 'note',
      `<b>Kjøleskapets skjulte matematikk:</b> ${kt.utbakt ? `hvert utbakte emne på ${fmt(kt.emneMasse, 2)} kg` : `hele deigmassen på ${fmt(kt.emneMasse, 1)} kg samlet`}
       bruker rundt <b>${fmtTimer(kt.tau * 2.3)}</b> på å nærme seg ${fmt(kt.miljo, 1)} °C (tidskonstant ${fmtTimer(kt.tau)}).
       Derfor akkumuleres <b>${fmt(andel, 0)} % av hele kaldhevingens gjæring i de første 6 timene</b>.
       Hadde deigen kjølt ned momentant, ville trinnet gitt ${fmt(kt.timer * rateFactor(kt.miljo), 2)} ekvivalenttimer — det gir i stedet ${fmt(kt.ekvTimer, 2)}.
       <br><b>${fmt(bulkAndel, 0)} % av all gjæringen skjer i bulken</b>, ${fmt(100 - bulkAndel, 0)} % på kjøl.
       ${bulkAndel < 55
         ? 'Sikt mot 65–85 % i bulken. Er du under det, gjør kjøleskapet for mye av jobben, og du mister kontrollen over sluttpunktet. Bak ut i enkeltemner før kjøl (halverer nedkjølingstiden), kort kaldhevingen, eller forleng bulken.'
         : bulkAndel > 90
           ? 'Nesten alt skjer i bulken. Da kjøper kaldhevingen deg smak og håndterbarhet, men lite gass — helt greit, men vit at sluttpunktet avgjøres før kjøleskapet.'
           : 'Det er innenfor målet på 65–85 %: bulken bestemmer, kjøleskapet finpusser.'}`));
    if (!kt.utbakt && kt.timer > 8) n.appendChild(el('div', 'note warn',
      `Deigen står <b>samlet</b> i kjøleskapet. En hel batch kjøles etter kubikkroten av massen, så ${fmt(kt.emneMasse, 1)} kg bruker ${fmtTimer(kt.tau * 2.3)} på å bli kald,
       og gjærer nesten i romtemperatur mesteparten av den tiden. Baker du ut i ${S.antall} emner først, faller tidskonstanten til ${fmtTimer(tauHours(r.masseKg / S.antall))} og kaldhevingen blir noe du styrer i stedet for noe som løper fra deg.`));
    const maks = maksKaldheving(kt.miljo, r.grovAndel > 0.3 ? 'fullkorn' : 'mager');
    if (kt.timer > maks) n.appendChild(el('div', 'note bad', `<b>${fmtTimer(kt.timer)} ved ${fmt(kt.miljo, 1)} °C er over anbefalt tak på ${fmtTimer(maks)}</b> for denne deigtypen. Etter det: sprit-aktig lukt, slapp deig som river, dårlig løft.`));
    else if (kt.timer > maks * 0.7) n.appendChild(el('div', 'note warn', `Du er på ${fmt(kt.timer / maks * 100, 0)} % av det anbefalte taket (${fmtTimer(maks)}). Fortsatt trygt, men ikke strekk det lenger.`));
    if (kt.timer >= 12 && kt.timer <= 30) n.appendChild(el('div', 'note ok', `12–24 t kaldheving er utbetalingssonen. Målt topp for aromastoffer ligger på 24 timer. Fordi gjærdeigen ligger på pH ${fmt(estimerPH(g.ekvTimer), 1)} — godt over proteasenes aktiveringsvindu på 3,0–4,5 — tåler den langt lengre kaldheving enn surdeig.`));
  }

  if (S.startTemp > 26) n.appendChild(el('div', 'note warn', `Deigtemp ${fmt(S.startTemp, 1)} °C er over 26 °C. Mager deig gir da hard, gjæraktig smak og et kollapsende hevevindu. Sikt mot 24–25 °C, eller 21–22 °C hvis du skal langtidsheve og la glutenbindingen fortsette under hevingen.`));

  const vindu = torr >= 1.0 ? '10–20 minutter' : torr >= 0.4 ? '40–60 minutter' : torr >= 0.2 ? '1–2 timer' : '1,5–3 timer';
  n.appendChild(el('div', 'note', `Med ${fmt(torr, 3)} % tørrgjær ved ${fmt(S.startTemp, 1)} °C er hevevinduet ca. <b>${vindu}</b>. Løsningen på et smalt vindu er alltid å kutte gjæren, ikke å bytte hevemiddel.`));

  n.appendChild(el('div', 'note ok',
    `<b>Sikt mot ${fmt(maalRise, 0)} % stigning i bulken, og klatre mot ${fmt(maalRise * 1.2, 0)} % hvis brødet blir tett.</b>
     Ta 40 g deig rett etter elting over i et rettvegget glass som står VED SIDEN AV boksen, press det jevnt og merk startnivået med strikk.
     Fordi glasset er rettvegget er høydeprosent lik volumprosent — merk måltrekken ${fmt(maalRise, 0)} % over.
     Maks ovnsløft kommer <b>før</b> maks volum, rundt 78 % av veien til full utvidelse: deigen som gir best brød ser litt underhevet ut i boksen. Er du i tvil, bak for tidlig.`));

  // Løs for. Ikke overskriv feltet mens brukeren står i det — ellers får du
  // «1.90» i det du har rukket å skrive «1.9».
  if (document.activeElement !== $('#maalDose'))
    $('#maalDose').value = fmt(S.maalDose || S.refDose || g.dose, 2).replace(',', '.');
  const lu = $('#loesUt'); lu.innerHTML = '';
  const md = S.maalDose || S.refDose || g.dose;
  const gj = gjaerForDose(md, plan, r.masseKg, { lokk: S.lokk, fulltKjol: S.fulltKjol, antall: S.antall });
  const tf = tidsfaktorForDose(md, plan, torr, r.masseKg, { lokk: S.lokk, fulltKjol: S.fulltKjol, antall: S.antall });
  const gnavn = { fersk: 'fersk gjær', torr: 'tørrgjær', aktiv: 'aktiv tørrgjær' }[S.gjaerType];
  lu.innerHTML = `
    <table><tbody>
      <tr><td>Gjærmengde som treffer måldosen</td><td class="n mono"><b>${fmt(gjaerKonverter(gj, 'torr', S.gjaerType), 3)} %</b> ${gnavn}</td></tr>
      <tr><td>… i gram</td><td class="n mono">${fmt(r.melTotal * gjaerKonverter(gj, 'torr', S.gjaerType) / 100, 2)} g</td></tr>
      <tr><td>Skaler alle trinn med</td><td class="n mono"><b>${fmt(tf, 2)}×</b></td></tr>
    </tbody></table>
    <div class="spacer"></div>
    <table><thead><tr><th>Løs kun dette trinnet</th><th class="n">Ny lengde</th></tr></thead><tbody>
    ${S.plan.map((t, i) => {
      const h = timerForTrinn(md, plan, i, torr, r.masseKg, { lokk: S.lokk, fulltKjol: S.fulltKjol, antall: S.antall });
      return `<tr><td>${t.navn}</td><td class="n mono">${h > 71 ? 'ikke oppnåelig' : fmtTimer(h)} <span class="small">(nå ${fmtTimer(t.timer)})</span></td></tr>`;
    }).join('')}
    </tbody></table>
    <div class="spacer"></div>
    <div class="note">Alle tre alternativene gir <b>samme</b> gjæringsgrad. Velg det som passer døgnet ditt — det er hele poenget med å regne i dose i stedet for i timer.</div>`;

  tegnDoseForklaring();
  tegnTempChart(g, plan);
  tegnRateTabell();
}

/* ============================================================
   VISNING: HVA MÅLTALLET ER, TEGNET
   ============================================================ */
function tegnDoseForklaring() {
  const { r, g, torr, plan } = beregn();
  const maal = S.maalDose || S.refDose || g.dose;
  const opt = { lokk: S.lokk, fulltKjol: S.fulltKjol, antall: S.antall };
  const c = $('#doseForklaring');

  /* --- A: dosen som ett rektangel --- */
  const demoGjaer = 0.30, demoTimer = 4, demoR = rateFactor(24);
  const demoDose = demoGjaer * demoTimer * demoR;
  const A = (() => {
    const W = 380, H = 210, p = { l: 58, r: 20, t: 20, b: 46 };
    const iW = W - p.l - p.r, iH = H - p.t - p.b;
    const bx = p.l, bw = iW * 0.72, by = p.t + iH * 0.30, bh = iH * 0.70;
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:380px;height:auto">
      <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#e0a53c" opacity=".26" stroke="#e0a53c" stroke-width="2"/>
      <text x="${bx + bw / 2}" y="${by + bh / 2 + 2}" fill="#f2c46b" font-size="17" font-weight="700" text-anchor="middle">areal = ${fmt(demoDose, 2)}</text>
      <text x="${bx + bw / 2}" y="${by + bh / 2 + 20}" fill="#b8a894" font-size="11" text-anchor="middle">det er dosen</text>
      <line x1="${p.l}" y1="${p.t + iH}" x2="${p.l + iW}" y2="${p.t + iH}" stroke="#4a3f34"/>
      <line x1="${p.l}" y1="${p.t}" x2="${p.l}" y2="${p.t + iH}" stroke="#4a3f34"/>
      <line x1="${bx}" y1="${p.t + iH + 10}" x2="${bx + bw}" y2="${p.t + iH + 10}" stroke="#8a7a68" marker-start="url(#aL)" marker-end="url(#aR)"/>
      <text x="${bx + bw / 2}" y="${p.t + iH + 26}" fill="#b8a894" font-size="11.5" text-anchor="middle">bredde = ${demoTimer} timer</text>
      <text x="${p.l - 8}" y="${by + bh / 2 - 6}" fill="#b8a894" font-size="11.5" text-anchor="end">høyde =</text>
      <text x="${p.l - 8}" y="${by + bh / 2 + 8}" fill="#b8a894" font-size="11.5" text-anchor="end">${pst(demoGjaer, 2)} gjær</text>
      <text x="${p.l - 8}" y="${by + bh / 2 + 22}" fill="#8a7a68" font-size="10.5" text-anchor="end">× fart ved 24 °C</text>
      <defs>
        <marker id="aL" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M7,0 L0,3.5 L7,7" fill="none" stroke="#8a7a68"/></marker>
        <marker id="aR" markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="none" stroke="#8a7a68"/></marker>
      </defs>
    </svg>`;
  })();

  /* --- B: fire planer, samme areal, ulik form --- */
  const kandidater = [
    { navn: 'Varmt og raskt',   plan: [{ navn: 'bulk', timer: 2, temp: 27, miljo: 27 }, { navn: 'heving', timer: 1, miljo: 27, utbakt: true }] },
    { navn: 'Standard bulk',    plan: [{ navn: 'bulk', timer: 4, temp: 24, miljo: 24 }, { navn: 'heving', timer: 1.25, miljo: 24, utbakt: true }] },
    { navn: 'Kjølig rom',       plan: [{ navn: 'bulk', timer: 9, temp: 20, miljo: 20 }] },
    { navn: 'Bulk + kaldheving', plan: [{ navn: 'bulk', timer: 4, temp: 24, miljo: 24 }, { navn: 'kjøl', timer: 14, miljo: 3.5, utbakt: true }] }
  ].map(k => {
    const gj = gjaerForDose(maal, k.plan, r.masseKg, opt);
    const pts = planProfil(k.plan, gj, r.masseKg, opt);
    return { ...k, gj, pts, timer: k.plan.reduce((s2, x) => s2 + x.timer, 0), dose: planDose(k.plan, gj, r.masseKg, opt).dose };
  });
  const maxT = Math.max(...kandidater.map(k => k.timer));
  const maxFart = Math.max(...kandidater.flatMap(k => k.pts.map(p => p.fart)));

  /* Formen på kaldhevingen — hentet fra den siste kandidaten (bulk + kjøl) */
  const kk = kandidater[3];
  const kjolPts = kk.pts.filter(p => p.trinn === 1);
  const kaldForm = kjolPts.length ? [1, 3, 6, 10, 14].map(t => {
    const d0 = kjolPts[0].dose, dS = kjolPts[kjolPts.length - 1].dose;
    const bulkT = kk.plan[0].timer;
    const pt = kjolPts.filter(p => p.t <= bulkT + t).pop() || kjolPts[0];
    return { t, temp: pt.temp, andel: dS > d0 ? (pt.dose - d0) / (dS - d0) * 100 : 0 };
  }) : [];

  const B = kandidater.map(k => {
    const W = 830, H = 74, p = { l: 168, r: 96, t: 8, b: 16 };
    const iW = W - p.l - p.r, iH = H - p.t - p.b;
    const X = t => p.l + t / maxT * iW;
    const Y = f => p.t + iH - (f / maxFart) * iH;
    let d = `M ${X(0)} ${p.t + iH}`;
    k.pts.forEach(pt => d += ` L ${X(pt.t)} ${Y(pt.fart)}`);
    d += ` L ${X(k.timer)} ${p.t + iH} Z`;
    let grenser = '';
    let acc = 0;
    k.plan.forEach((s2, i) => { acc += s2.timer; if (i < k.plan.length - 1) grenser += `<line x1="${X(acc)}" y1="${p.t}" x2="${X(acc)}" y2="${p.t + iH}" stroke="#4a3f34" stroke-dasharray="2 3"/>`; });
    const kald = k.plan.some(s2 => s2.miljo <= 12);
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">
      <text x="0" y="${p.t + 15}" fill="#efe6da" font-size="13" font-weight="650">${k.navn}</text>
      <text x="0" y="${p.t + 31}" fill="#8a7a68" font-size="11">${pst(k.gj, 3)} tørrgjær · ${fmtTimer(k.timer)}</text>
      <line x1="${p.l}" y1="${p.t + iH}" x2="${p.l + iW}" y2="${p.t + iH}" stroke="#3a3129"/>
      <path d="${d}" fill="${kald ? '#5b8fa8' : '#e0a53c'}" opacity=".32" stroke="${kald ? '#5b8fa8' : '#e0a53c'}" stroke-width="1.6"/>
      ${grenser}
      <text x="${p.l + iW + 10}" y="${p.t + iH - 4}" fill="#f2c46b" font-size="13" font-weight="700">${fmt(k.dose, 2)}</text>
      <text x="${p.l + iW + 10}" y="${p.t + iH + 10}" fill="#8a7a68" font-size="10">i dose</text>
    </svg>`;
  }).join('');

  /* --- C: temperaturkurven --- */
  const C = (() => {
    const W = 380, H = 210, p = { l: 46, r: 18, t: 16, b: 42 };
    const iW = W - p.l - p.r, iH = H - p.t - p.b;
    const X = T => p.l + T / 42 * iW;
    const Y = v => p.t + iH - (v / 1.9) * iH;
    let d = '';
    for (let T = 0; T <= 42; T += 0.5) d += `${d ? 'L' : 'M'} ${X(T)} ${Y(rateFactor(T))} `;
    let s2 = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:380px;height:auto">`;
    [0.5, 1, 1.5].forEach(v => {
      s2 += `<line x1="${p.l}" y1="${Y(v)}" x2="${p.l + iW}" y2="${Y(v)}" stroke="#3a3129"/>`;
      s2 += `<text x="${p.l - 6}" y="${Y(v) + 4}" fill="#8a7a68" font-size="10" text-anchor="end">${fmt(v, 1)}×</text>`;
    });
    s2 += `<path d="${d}" fill="none" stroke="#c9633a" stroke-width="2.4"/>`;
    [[3.5, 'kjøleskap'], [24, 'referanse'], [35.5, 'topp']].forEach(([T, nv]) => {
      s2 += `<line x1="${X(T)}" y1="${p.t}" x2="${X(T)}" y2="${p.t + iH}" stroke="#4a3f34" stroke-dasharray="2 3"/>`;
      s2 += `<circle cx="${X(T)}" cy="${Y(rateFactor(T))}" r="4" fill="#e0a53c"/>`;
      s2 += `<text x="${X(T)}" y="${p.t + iH + 15}" fill="#b8a894" font-size="10.5" text-anchor="middle">${fmt(T, T % 1 ? 1 : 0)} °C</text>`;
      s2 += `<text x="${X(T)}" y="${p.t + iH + 28}" fill="#8a7a68" font-size="9.5" text-anchor="middle">${nv}</text>`;
    });
    s2 += `<text x="${X(3.5) + 7}" y="${Y(rateFactor(3.5)) - 6}" fill="#e0a53c" font-size="10.5">${fmt(rateFactor(3.5), 3)}×</text>`;
    s2 += `<text x="${X(24) + 7}" y="${Y(1) - 7}" fill="#e0a53c" font-size="10.5">1,00×</text>`;
    s2 += `<line x1="${p.l}" y1="${p.t + iH}" x2="${p.l + iW}" y2="${p.t + iH}" stroke="#4a3f34"/></svg>`;
    return s2;
  })();

  c.innerHTML = `
    <h3 style="color:var(--gull2);margin-top:4px">1 · Dosen er bredde × høyde</h3>
    <div class="grid g2" style="align-items:center">
      <div>${A}</div>
      <div>
        <p style="margin-top:0">Tenk på gjæring som arbeid som blir gjort. <b>Hvor fort</b> arbeidet går bestemmes av
        hvor mye gjær du har og hvor varmt det er. <b>Hvor lenge</b> det pågår er tiden.
        Ganger du de to, får du hvor mye arbeid som ble gjort — og det er dosen.</p>
        <p class="small">Formelt er det integralet <b>∫ gjærmengde × fart dt</b>, men i praksis er det bare arealet
        under kurven. Enheten er valgt slik at <b>1 % tørrgjær i 1 time ved 24 °C ≈ 1,0</b>.
        Derfor betyr «dose ${fmt(maal, 2)}» omtrent det samme som «${fmt(maal, 2)} timer ved 24 °C med 1 % tørrgjær».</p>
      </div>
    </div>

    <hr>
    <h3 style="color:var(--gull2)">2 · Samme areal, helt ulik form</h3>
    <p class="sub">Fire planer som alle treffer din måldose på ${fmt(maal, 2)}. Se på flatene: de er like store, men strukket ulikt. Det er hele poenget — du kan bytte tid mot gjær mot temperatur, så lenge arealet holdes fast.</p>
    ${B}
    <div class="note">Den varme planen er en høy, smal flate: mye gjær, kort tid. Kaldhevingen er lang og lav —
    og legg merke til at den <b>ikke er flat</b>. Den starter høyt og stuper, fordi deigen bruker timer på å bli kald.
    Det er den formen som gjør at kaldheving gir langt mer gjæring enn temperaturen alene skulle tilsi.</div>
    <p class="small" style="margin-bottom:6px">Hvor mye av kaldhevingens gjæring er unnagjort når?</p>
    <table><thead><tr><th>Tid på kjøl</th><th class="n">Deigtemperatur</th><th class="n">Andel av kaldhevingen</th></tr></thead><tbody>
      ${kaldForm.map(x => `<tr><td>etter ${x.t} t</td><td class="n mono">${grader(x.temp)}</td><td class="n mono">${pst(x.andel, 0)}</td></tr>`).join('')}
    </tbody></table>
    <div class="note warn">Den <b>første timen</b> på kjøl står for ${pst(kaldForm[0].andel, 0)} av hele kaldhevingens gjæring,
    mens deigen fortsatt holder ${grader(kaldForm[0].temp)}. De siste fire timene bidrar
    ${pst(kaldForm[kaldForm.length - 1].andel - kaldForm[kaldForm.length - 2].andel, 0)}.
    Derfor er det ikke lengden på kaldhevingen som styrer gjæringen — det er hvor fort emnene blir kalde.
    Og det er derfor du skal bake ut <b>før</b> kjøleskapet, ikke etter.</div>

    <hr>
    <h3 style="color:var(--gull2)">3 · Hvorfor temperatur bøyer alt</h3>
    <div class="grid g2" style="align-items:center">
      <div>${C}</div>
      <div>
        <p style="margin-top:0">Høyden på flaten er gjærmengde ganget med <b>farten ved den temperaturen</b>.
        Den farten er ikke lineær. Ved 24 °C er den definert som 1,00×. I kjøleskapet ditt på 3,5 °C
        er den <b>${fmt(rateFactor(3.5), 3)}×</b> — altså ${fmt(1 / rateFactor(3.5), 0)} ganger saktere.
        Og den topper på bare ${fmt(rateFactor(35.5), 2)}× ved 35,5 °C.</p>
        <p class="small">Det siste er verdt å merke seg: du kan bremse gjæringen ${fmt(1 / rateFactor(3.5), 0)} ganger ned,
        men du kan ikke skynde på den mer enn ${fmt(rateFactor(35.5), 2)} ganger opp. Varme er en dårlig snarvei; kulde er en kraftig brems.</p>
      </div>
    </div>

    <hr>
    <h3 style="color:var(--gull2)">4 · Hva måltallet ditt er, og hvor det kommer fra</h3>
    <div class="stats">
      <div class="stat"><div class="k">Din måldose</div><div class="v">${fmt(maal, 2)}</div></div>
      <div class="stat"><div class="k">Publisert median</div><div class="v">1,83</div></div>
      <div class="stat"><div class="k">Publisert spenn</div><div class="v" style="font-size:1.05rem">1,15–2,41</div></div>
      <div class="stat"><div class="k">Din plan gir nå</div><div class="v ${Math.abs(g.dose / maal - 1) < 0.08 ? '' : 'warn'}">${fmt(g.dose, 2)}</div></div>
    </div>
    <div class="note">Måltallet er ikke funnet på. Det er medianen av <b>24 fullt spesifiserte publiserte formler</b>
    — Hamelman, King Arthur Pro, ChainBaker, Forkish, Weekend Bakery, BBGA — regnet gjennom denne modellen.
    Baguetter landet på 1,95 i snitt, magre brød på 1,95, ciabatta på 1,99. At tre ulike brødtyper konvergerer der,
    er grunnen til å stole på tallet.</div>
    <div class="note warn">Men kvartilbredden er 1,15–2,41, altså nesten 2×. Profesjonell praksis spenner vidt,
    så dette er et <b>planleggingstall med rundt ±35 % toleranse</b> — ikke en fasit.
    Bruk det til å oversette mellom klokker; bruk målekrukka til å bestemme når du faktisk baker ut.
    Blir de uenige, har krukka rett.</div>`;
}

/* ============================================================
   BAKEKJEDEN
   Én funksjon bygger hele forløpet — mengder, temperaturer og klokkeslett —
   og Tidsplan, «Bak nå» og klokkeslettene i grafen leser alle fra den.
   Før hadde disse hver sin utregning, og da kunne de vise ulik starttid og
   ulik stekeprofil for det samme brødet.
   ============================================================ */

/* Forvarmingstid i minutter per stekeprofil. Tallene er utstyrets, ikke ovnens:
   et 15 mm stål er ikke ladet før etter halvannen time, uansett hva ovnen piper. */
const FORVARM_MIN = {
  brod_kloke: 105, brod_glass_stal: 105, brod_gryte: 55,
  brod_apen: 75, brod_600: 75, ciabatta: 105, baguette: 75, focaccia: 45
};

/* Ett oppsett for varmebalansen, brukt av både Deigtemp-fanen og bakekjeden.
   Ønsket deigtemperatur er S.startTemp — den samme verdien gjæringsmodellen
   regner med. Tidligere var det to uavhengige felter, så Deigtemp kunne
   dimensjonere vannet for 24 °C mens gjæringen var regnet for 23. */
/* Eltetiden som lander midt i målsonen for den valgte maskinen.
   Utledet, ikke gjettet: målsonen er 3–5 Wh/kg, midtpunktet 4, og 1 Wh/kg er
   1,29 °C friksjonsvarme. En hjemmespiral på 0,4 °C/min trenger da 13 minutter,
   en kommersiell spiral på 1,0 bare 5. Det er derfor «6 minutter» og
   «18 minutter» kan beskrive samme arbeid på ulike maskiner. */
function anbefaltEltMin() {
  const f = S.dtMikser === 'egen' ? S.dtEgen : FRIKSJON[S.dtMikser];
  const maal = (ELTING.MAAL_LAV + ELTING.MAAL_HOY) / 2;
  const min = Math.max(1, Math.round(gradForArbeid(maal) / Math.max(f, 0.01)));
  // Håndelting: arbeidsmodellen gjelder ikke. Mye av friksjonsvarmen går til
  // benk og luft, og hendene varmer deigen uavhengig av arbeidet — så
  // temperaturstigningen er ingen gyldig arbeidsmåler her. Rå formel ga 34 min,
  // samtidig som appen advarte mot mer enn 25. Normen er 10–12 min pluss brett.
  if (S.dtMikser === 'hand') return Math.min(12, min);
  // Ingen maskin skal anbefales over appens eget tak for hvetemel.
  return Math.min(25, min);
}

function deigtempInn(r) {
  const melIHoved = r.melTotal - (r.forferment ? r.forferment.mel : 0);
  return {
    onsketDeigTemp: S.startTemp,
    melGram: melIHoved, melTemp: S.dtMelTemp,
    vannGram: Math.max(r.vannHoved, 1),
    forfermentGram: r.forferment ? r.forferment.total : 0,
    forfermentTemp: S.dtFfTemp,
    forfermentHydrering: r.forferment ? r.forferment.hydrering / 100 : 1,
    froGram: r.froAbsorbert + r.fro.reduce((s, f) => s + f.gram, 0),
    froTemp: S.dtMelTemp,
    mikser: S.dtMikser === 'egen' ? 'spiralHjemme' : S.dtMikser,
    minutter: S.eltMin,
    friksjonPerMin: S.dtMikser === 'egen' ? S.dtEgen : null
  };
}

function ferdigTid() {
  if (S.planFerdig) { const d = new Date(S.planFerdig); if (!isNaN(d.getTime())) return d; }
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(17, 0, 0, 0);
  return d;
}

/* Sett når du vil STARTE i stedet for når brødet skal være ferdig.
   Kjeden regnes fortsatt bakover fra ferdigtidspunktet — det er den eneste
   retningen som gir mening når stekingen er det faste punktet — så her flytter vi
   bare hele planen slik at første steg lander der du vil. Da beholder alle trinn
   sine innbyrdes avstander, og du ser umiddelbart når brødet er ute av ovnen. */
function settStartTid(ny) {
  if (!ny || isNaN(ny.getTime())) return;
  const b = bakeSteg();
  const delta = ny.getTime() - b.start.getTime();
  S.planFerdig = tilFeltVerdi(new Date(ferdigTid().getTime() + delta));
  lagre();
  oppdater();
}

function tilFeltVerdi(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/* Hvilket mel går i forfermenten? Motoren tar bare et antall gram «av melet»,
   men på benken må du vite hvilken pose du skal åpne. Forfermenten skal ha det
   sterkeste siktede hvetemelet — grovt mel og urkorn tåler ikke å stå alene. */
function forfermentMel(r) {
  const rang = { 'sterk': 5, 'middels-sterk': 4.5, 'middels': 4, 'svak-middels': 3, 'svak': 2, 'svært svak': 1, 'ingen': 0 };
  let best = null;
  r.mel.forEach(m => {
    const f = FLOURS.find(x => x.id === m.id); if (!f) return;
    const poeng = (f.gruppe === 'Siktet hvete' ? 10 : 0) + (rang[f.styrke] ?? 3) + m.gram / 100000;
    if (!best || poeng > best.poeng) best = { poeng, m, f };
  });
  return best;
}

function bakeSteg() {
  const { r, g } = beregn();
  const prof = aktivProfil();
  const stekeMin = parseInt(prof.tid) || 40;
  const forvarmMin = FORVARM_MIN[prof.id] || 60;
  const utbak = S.planUtbak, elt = S.planElt;
  const ferdig = ferdigTid();
  const minus = (d, m) => new Date(d.getTime() - m * 60000);

  /* --- ankerpunkter, regnet bakover --- */
  const innsetting = minus(ferdig, stekeMin);
  const utbakStart = minus(innsetting, utbak);
  const forvarmStart = minus(innsetting, forvarmMin);

  const planTider = [];
  let peker = new Date(utbakStart);
  for (let i = S.plan.length - 1; i >= 0; i--) {
    const start = new Date(peker.getTime() - S.plan[i].timer * 3600000);
    planTider[i] = { start, slutt: new Date(peker) };
    peker = start;
  }
  const eltStart = minus(peker, elt);
  // Bløtlegg og forferment henger begge på eltingen, ikke på hverandre: frøene
  // trenger 30 minutter, forfermenten sine egne timer. Kjedet man dem etter
  // hverandre, ble forfermenten satt en halvtime for tidlig.
  const bloetStart = r.fro.length ? minus(eltStart, 30) : null;
  const ffStart = r.forferment ? new Date(eltStart.getTime() - r.forferment.timer * 3600000) : null;

  /* --- vanntemperatur: samme oppsett som Deigtemp-fanen, fra tilstanden --- */
  const vt = vanntemperatur(deigtempInn(r));

  const maalRise = maalHeveProsent(S.startTemp, {
    hydrering: S.hydrering / 100, grovAndel: r.grovAndel, styrke: r.svakesteStyrke
  });
  const gnavn = { fersk: 'Fersk gjær', torr: 'Tørrgjær', aktiv: 'Aktiv tørrgjær' }[S.gjaerType];
  const steg = [];
  // Stegets id må beskrive HANDLINGEN, ikke posisjonen. Med løpenummer fulgte
  // avhukingen i «Bak nå» plassen i lista: skrudde man av forfermenten, arvet
  // «Elt deigen» haken fra «Sett bigaen», og appen påsto at en 14-timers
  // kaldheving var unnagjort. Semantiske id-er gjør at en hake enten finner
  // igjen sitt eget steg eller forsvinner — aldri flytter seg til et annet.
  const legg = o => { steg.push({ mengder: [], ...o, id: o.id || 'steg' + steg.length }); };

  /* --- 1. forferment --- */
  if (r.forferment) {
    const ff = r.forferment;
    const fm = forfermentMel(r);
    const navn = ff.type === 'biga' ? 'Biga' : ff.type === 'pate' ? 'Pâte fermentée' : 'Poolish';
    legg({
      id: 'ff', navn: `Sett ${navn.toLowerCase()}en`, tid: ffStart, type: 'ff',
      varighet: ff.timer * 60,
      mengder: [
        [fm ? fm.f.navn : 'Hvetemel', gram(ff.mel)],
        ['Vann', gram(ff.vann)],
        [gnavn, veiG(ff.gjaer)],
        ...(ff.salt > 0.05 ? [['Salt', veiG(ff.salt)]] : [])
      ],
      temp: `Skal stå på ${grader(ff.temp, 0)} i ${fmtTimer(ff.timer)}`,
      gjor: `Visp ut gjæren i vannet <b>før</b> melet — ${fmt(ff.gjaer, 2)} g fordeler seg ikke i tørt mel. ${ff.hydrering <= 60 ? 'Bland bare til den er lurvete; rå melklumper er riktig i en stiv forferment.' : 'Rør til jevn røre.'} Lokk på.`,
      sjekk: `Klar når den har kuppel og <b>akkurat begynner å synke i midten</b>, med vannmerke på beholderveggen. Brukbar fra ${fmtTimer(ff.brukTidligst)} til ${fmtTimer(ff.brukSenest)}, hardt tak ${fmtTimer(ff.hardtTak)}.`,
      varsel: fm && fm.f.gruppe !== 'Siktet hvete'
        ? 'Blandingen din har ikke noe siktet hvetemel å ta av. Grovt mel og urkorn bør ikke stå alene så lenge — vurder å bytte inn litt sterkt hvetemel.'
        : (ff.mel > 0 && fm ? `Melet tas fra ${fm.f.navn} — den posen skal altså åpnes nå, og resten går i hoveddeigen.` : '')
    });
  }

  /* --- 2. bløtlegg ---
     Ikke en universell regel. De dokumenterte gevinstene er målt på kli, havre
     og chia, som binder 130–300 g vann per 100 g. Solsikke binder 80, sesam 58,
     gresskar 38. Terskelen som betyr noe er hvor mye hydrering frøene faktisk
     stjeler — under ca. 3 prosentpoeng kan du like gjerne justere vannet. */
  if (r.fro.length) {
    const stjaaltPP = r.melTotal > 0 ? r.froAbsorbert / r.melTotal * 100 : 0;
    const maa = r.fro.filter(f => f.varmt);
    // 5 prosentpoeng tilsvarer ca. 6 % solsikke. Under det er forskjellen
    // hovedsakelig at deigen strammer seg gradvis gjennom bulken i stedet for å
    // være stabil fra start — ubehagelig å lese, men ikke ødeleggende, og du
    // kompenserer med vann. Over det begynner det å koste struktur.
    const valgfritt = stjaaltPP < 5 && !maa.length;
    legg({
      id: 'bloet',
      navn: valgfritt ? 'Rist frøene (bløtlegging valgfritt)' : 'Bløtlegg frø og korn',
      tid: bloetStart, type: 'prep', varighet: 30,
      mengder: r.fro.map(f => [f.navn, `${gram(f.gram)}${valgfritt ? '' : ` + ${gram(f.hellVann)} ${f.varmt ? 'kokende' : 'kaldt'} vann`}`]),
      temp: maa.length
        ? `${maa.map(f => f.navn).join(' og ')} MÅ skåldes med kokende vann — kaldbløtlagt rugknekk blir grus i brødet.`
        : valgfritt
          ? `Frøene stjeler bare ${pst(stjaaltPP, 1)} av hydreringen. Det kan du like gjerne legge på vannet.`
          : 'Kaldt vann holder.',
      gjor: valgfritt
        ? `<b>Rist dem</b> — det er ristingen som gir smaken, ikke bløtleggingen: målt 28–51× mer pyrazin, altså dobbelt så mye smak per gram. 125–150 °C til lys gyllen, ikke hardt og raskt. Avkjøl før de går i deigen. Vil du likevel bløtlegge, bruk <b>kaldt</b> vann og kort tid — pyrazinene er vannløselige og flyktige, så en lang eller varm bløt vasker ut nettopp det du ristet fram.`
        : `Minst 30 minutter. Frøene binder til sammen <b>${gram(r.froAbsorbert)}</b> — det er ${pst(stjaaltPP, 1)} av hydreringen, nok til å merkes.${maa.length ? ' Skåldevannet skal med i deigen alt sammen — det bærer sukkerartene og stivelsen skåldingen frigjør.' : ''}${r.froVannOverskudd > 1 ? ` Overskuddet fra kaldbløtet på <b>${gram(r.froVannOverskudd)}</b> heller du av før frøene går i deigen.` : ''} Rist dem først, og bruk kaldt bløtevann hvis du vil beholde ristesmaken.`,
      sjekk: valgfritt
        ? 'Frøene skal dufte nøtteaktig, ikke brent. Blir de mørke, har du kjørt for varmt.'
        : 'Ingen tørre kjerner igjen. Bløtlegger du ikke ved denne mengden, trekker frøene vann ut av glutenet gjennom hele bulken, og deigen strammer seg uten at du skjønner hvorfor.'
    });
  }

  /* --- 3. elting --- */
  const fm = forfermentMel(r);
  const melRader = r.mel.map(m => {
    const trekk = (r.forferment && fm && fm.m.id === m.id) ? r.forferment.mel : 0;
    return [m.navn + (trekk ? ` <span class="small">— av ${gram(m.gram)} totalt; ${gram(trekk)} står allerede i forfermenten</span>` : ''), gram(m.gram - trekk)];
  });
  // Bassinage bare når det faktisk er vann å holde igjen. Er deigen tørrere enn
  // 70 % går regnestykket i null, og «hold igjen de siste 0 g» er bare støy.
  const bassinage = Math.max(r.vannHoved - r.melTotal * 0.70, 0);
  legg({
    id: 'mix', navn: 'Elt deigen', tid: eltStart, type: 'mix', varighet: elt,
    mengder: [
      ...melRader,
      ['Vann i bollen', gram(r.vannHoved)],
      ...(r.forferment ? [['Forfermenten', gram(r.forferment.total)]] : []),
      ...(r.fro.length ? [['Bløtlagte frø (avrent)', gram(r.fro.reduce((s, f) => s + f.gram, 0) + r.froAbsorbert)]] : []),
      [gnavn, veiG(r.gjaerHoved)],
      ['Salt', gram(r.salt, 1)],
      ...[['Honning', r.honning], ['Olivenolje', r.olje], ['Sukker', r.sukker], ['Smør', r.smor], ['Diastatisk malt', r.malt]]
        .filter(x => x[1] > 0.05).map(x => [x[0], veiG(x[1])])
    ],
    temp: `Vann på <b>${grader(vt.vannTemp, 1)}</b> gir deig ut på <b>${grader(S.startTemp, 1)}</b> ved <b>${S.eltMin} min</b> i maskinen (friksjon +${grader(vt.friksjonsOkning, 1)}). Mål deigtemperaturen — det er det ene tallet hele planen står på.`,
    gjor: `${bassinage > 5 ? `Hold igjen de siste <b>${gram(bassinage)}</b> av vannet og spe det inn under kjøring — deigen tar imot mer vann etter at glutenet har begynt å feste seg enn før. ` : 'Alt vannet kan i fra start; deigen er tørr nok til at den tåler det. '}Salt de siste 2–3 minuttene. Stopp ved 60–75 % glutenutvikling — <b>ikke</b> full vindusrute.`,
    sjekk: `Deigen slipper bollen, men er fortsatt litt klissete. Dømm på deigen, ikke på klokka: ${S.eltMin} minutter er din normal, men ulikt mel kommer dit på ulik tid. Blir den for stram, mister du ekstensibiliteten du trenger i ovnen.`,
    varsel: r.forferment && r.gjaerHoved <= 0.01
      ? `Forfermenten alene krever ${gram(r.forferment.gjaer, 2)} gjær, mens hele oppskriften er regnet med ${gram(r.gjaerTotal, 2)}. Det går ikke opp: hoveddeigen får null, og du ender med mer gjær i brødet enn gjæringsdosen bygger på. Forleng forfermentens modningstid eller senk temperaturen, så trenger den mindre.`
      : vt.vannTemp < 2 ? `Du trenger ${grader(vt.vannTemp, 1)} vann. Kjøl melet eller kort eltetiden — se Deigtemp-fanen.` : ''
  });

  /* --- 4. heveplanen --- */
  S.plan.forEach((s, i) => {
    const kald = s.miljo <= 12;
    const tr = g.trinn[i] || {};
    const brett = [];
    if (i === 0 && !kald && s.timer >= 1.5) {
      const n = Math.min(4, Math.max(2, Math.round(s.timer)));
      for (let b = 1; b <= n; b++) brett.push(new Date(planTider[i].start.getTime() + b * 30 * 60000));
    }
    legg({
      id: 'plan' + i, navn: s.navn, tid: planTider[i].start, type: kald ? 'cold' : 'bulk',
      varighet: s.timer * 60,
      mengder: [
        ['Varighet', fmtTimer(s.timer)],
        ['Ferdig', klokke(planTider[i].slutt)],
        ['Andel av gjæringen', pst(g.dose > 0 ? (tr.dose || 0) / g.dose * 100 : 0, 0)],
        ...(s.utbakt ? [['Emnestørrelse', fmt((tr.emneMasse || 0) * 1000) + ' g × ' + S.antall]] : [])
      ],
      temp: `Miljø ${grader(s.miljo, 1)}${tr.sluttTemp !== undefined ? ` · deigen ender på ${grader(tr.sluttTemp, 1)}` : ''}`,
      gjor: kald
        ? (s.utbakt
            ? `Emnene står utbakt i hevekurv. ${fmt(tr.tau ? tr.tau * 2.3 : 0, 1)} timer på å bli kalde — og det er i den perioden det meste av gjæringen skjer.`
            : `Deigen står samlet. Baker du ut i ${S.antall} emner først, halveres nedkjølingstiden og du får styring på sluttpunktet.`)
        : (brett.length
            ? `Brett ${brett.map(b => b.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })).join(', ')} — så ikke rør deigen den siste halvdelen.`
            : 'La den stå i fred.'),
      sjekk: kald
        ? 'Gå etter klokka her, men se på emnet før du steker: det skal ha vokst tydelig og kjennes luftig, ikke stinnt.'
        : `Sikt mot <b>${fmt(maalRise, 0)}–${fmt(maalRise * 1.2, 0)} % stigning</b>. Ta 40 g deig i et rettvegget glass ved siden av boksen og merk startnivået — der er høydeprosent lik volumprosent.`,
      maalRise: kald ? null : maalRise
    });
  });

  /* --- 5. forvarming, utbaking, steking, avkjøling --- */
  legg({
    id: 'oven', navn: 'Sett på ovnen', tid: forvarmStart, type: 'oven', varighet: forvarmMin,
    mengder: [['Forvarm', fmtTimer(forvarmMin / 60)], ['Til', grader(prof.inn, 0)], ['Rist', prof.rist]],
    temp: `${prof.inn} °C med stein, stål eller gryte inne hele tiden.`,
    gjor: 'Ovnens pipelyd betyr ingenting — den måler lufta, ikke stålet. Etter 15 minutter ligger en bakestein typisk 116 °C for lavt.',
    sjekk: 'Dette steget overlapper med hevingen. Det er derfor det står her og ikke rett før innsetting.'
  });

  legg({
    id: 'shape', navn: 'Bak ut og la hvile', tid: utbakStart, type: 'shape', varighet: utbak,
    mengder: [['Antall emner', String(S.antall)], ['Vekt per emne', gram(r.totalVekt / Math.max(S.antall, 1))], ['Benkehvile', fmt(utbak) + ' min']],
    temp: 'Kald deig rett fra kjøleskapet snitter rent og holder seg ekstensibel lenger i ovnen.',
    gjor: 'Håndter bare de ytterste 1 cm. Overflatespenningen er det som holder igjen gassen til den blir ovnsløft. Ta av håndkleet 10 minutter før ovnen så skorpa tørker.',
    sjekk: 'Trykktest: gropen skal fylle seg langsomt igjen over 5–10 sekunder og etterlate et synlig merke. Fylles den straks, er emnet underhevet; blir merket stående, er du forbi.'
  });

  legg({
    id: 'bake', navn: 'Stek', tid: innsetting, type: 'bake', varighet: stekeMin,
    mengder: [['Inn på', grader(prof.inn, 0)], ['Ned til', grader(prof.ned, 0)], ['Steketid', prof.tid], ['Kjerne', prof.kjerne], ['Rist', prof.rist]],
    temp: `${prof.inn} °C inn, ned til ${prof.ned} °C ${prof.nedNaar}.`,
    gjor: `<b>Damp:</b> ${prof.damp}, i ${prof.dampTid}. ${prof.luft}. Snitt med buet blad, 30–45° fra vannrett, 6–13 mm dypt, ett bestemt drag.`,
    sjekk: `Ferdig ved ${prof.kjerne} kjernetemperatur. Ovnsløftet varer 15–20 minutter, med 80 % levert i de første 10–12 — ikke åpne døra i den perioden.`
  });

  legg({
    id: 'cool', navn: 'Avkjøl', tid: ferdig, type: 'cool', varighet: 180,
    mengder: [['Til kjerne', '35–38 °C'], ['Tid', prof.id.startsWith('brod') ? '3–4 timer' : '30–45 min']],
    temp: 'På rist, med luft under.',
    gjor: 'Ikke skjær varmt. Stivelsen setter seg under nedkjølingen, ikke under stekingen — skjærer du for tidlig, blir krummen klissete uansett hvor godt alt annet gikk.',
    sjekk: 'Skorpa knitrer mens den kjøles. Det er vanndamp som forlater brødet.'
  });

  steg.sort((a, b) => a.tid - b.tid);
  steg.forEach((s, i) => s.nr = i + 1);
  return { steg, r, g, prof, ferdig, start: steg[0].tid, vt, maalRise, forvarmMin, stekeMin };
}

/* Når starter bulken? Leses ut av den felles kjeden, slik at grafen og
   tidsplanen alltid viser samme klokke. */
function bulkStartTid() {
  const b = bakeSteg();
  const bulk = b.steg.find(s => s.type === 'bulk' || s.type === 'cold');
  return bulk ? bulk.tid : b.start;
}

/* Kurven tegnes i to størrelser fra SAMME data: full versjon i «Gjæring & tid»,
   og en tekstløs miniatyr i kontekstpanelet som følger deg gjennom hele appen.
   `mini` fjerner all tekst — ved 340 px bredde ville fasenavn og klokkeslett
   overlappe til uleselighet, og formen på kurven er hele poenget der. */
function tegnTempChart(g, plan, o = {}) {
  const svg = o.svg || $('#tempChart');
  if (!svg) return;
  const mini = !!o.mini;
  const W = o.W || 860, H = o.H || 360;
  const pad = o.pad || { l: 52, r: 58, t: 46, b: 46 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const totalT = g.trinn.reduce((s, t) => s + t.timer, 0) || 1;
  const start = bulkStartTid();

  // Den ekte profilen fra motoren — ikke en rett strek gjennom hvert trinn.
  const torr = tilTorrPct(S.gjaerPct, S.gjaerType);
  const pts = planProfil(plan, torr, S.masseKg, { lokk: S.lokk, fulltKjol: S.fulltKjol, antall: S.antall });
  const totalDose = g.dose || 1;

  const X = t => pad.l + t / totalT * iW;
  const tempMin = 0, tempMax = Math.max(30, Math.ceil(Math.max(...pts.map(p => p.temp)) / 5) * 5);
  const Yt = v => pad.t + (1 - (v - tempMin) / (tempMax - tempMin)) * iH;
  const Yd = f => pad.t + (1 - f) * iH;
  const klokkeAv = t => new Date(start.getTime() + t * 3600000);

  let s = '';

  // --- fasebånd med navn ---
  let acc = 0;
  g.trinn.forEach((tr, i) => {
    const x0 = X(acc), x1 = X(acc + tr.timer);
    const kald = tr.miljo <= 12;
    s += `<rect x="${x0}" y="${pad.t}" width="${x1 - x0}" height="${iH}" fill="${kald ? '#5b8fa8' : '#e0a53c'}" opacity="${i % 2 ? 0.05 : 0.08}"/>`;
    s += `<line x1="${x0}" y1="${pad.t}" x2="${x0}" y2="${pad.t + iH}" stroke="#4a3f34" stroke-dasharray="3 3"/>`;
    const midt = (x0 + x1) / 2;
    if (!mini && x1 - x0 > 62) {
      s += `<text x="${midt}" y="${pad.t - 26}" fill="${kald ? '#7fb3cc' : '#e0a53c'}" font-size="12" font-weight="650" text-anchor="middle">${tr.navn}</text>`;
      s += `<text x="${midt}" y="${pad.t - 12}" fill="#8a7a68" font-size="10.5" text-anchor="middle">${fmtTimer(tr.timer)} · ${fmt(tr.miljo, 1)} °C · ${fmt(tr.dose / totalDose * 100, 0)} % av gjæringen</text>`;
    }
    acc += tr.timer;
  });

  // --- vannrett rutenett + venstre akse (temperatur) ---
  for (let v = 0; v <= tempMax; v += 5) {
    s += `<line x1="${pad.l}" y1="${Yt(v)}" x2="${pad.l + iW}" y2="${Yt(v)}" stroke="#3a3129" stroke-width="1"/>`;
    if (!mini) s += `<text x="${pad.l - 8}" y="${Yt(v) + 4}" fill="#8a7a68" font-size="10.5" text-anchor="end">${v} °C</text>`;
  }
  // --- høyre akse (akkumulert gjæring) ---
  if (!mini) [0, 25, 50, 75, 100].forEach(p => {
    s += `<text x="${pad.l + iW + 9}" y="${Yd(p / 100) + 4}" fill="#8a7a68" font-size="10.5">${p} %</text>`;
  });

  // --- gjæringsfart som areal: arealet under denne ER dosen ---
  const maxF = Math.max(...pts.map(p => p.fart), 1e-6);
  let area = `M ${X(0)} ${pad.t + iH}`;
  pts.forEach(p => area += ` L ${X(p.t)} ${pad.t + iH - (p.fart / maxF) * iH * 0.42}`);
  area += ` L ${X(totalT)} ${pad.t + iH} Z`;
  s += `<path d="${area}" fill="#c9633a" opacity="0.22"/>`;

  // --- akkumulert dose (hovedkurven) ---
  let dl = '';
  pts.forEach((p, i) => dl += `${i ? 'L' : 'M'} ${X(p.t)} ${Yd(p.dose / totalDose)} `);
  s += `<path d="${dl}" fill="none" stroke="#e0a53c" stroke-width="3"/>`;

  // --- deigtemperatur ---
  let tl = '';
  pts.forEach((p, i) => tl += `${i ? 'L' : 'M'} ${X(p.t)} ${Yt(p.temp)} `);
  s += `<path d="${tl}" fill="none" stroke="#5b8fa8" stroke-width="2.4" stroke-dasharray="6 3"/>`;

  // --- halvveismerke: når er 50 % av gjæringen gjort? ---
  const halv = pts.find(p => p.dose >= totalDose * 0.5);
  if (halv) {
    s += `<line x1="${X(halv.t)}" y1="${pad.t}" x2="${X(halv.t)}" y2="${pad.t + iH}" stroke="#7fa650" stroke-width="1.5" stroke-dasharray="2 3"/>`;
    s += `<circle cx="${X(halv.t)}" cy="${Yd(0.5)}" r="4.5" fill="#7fa650"/>`;
    if (!mini) {
      const anker = X(halv.t) > pad.l + iW - 130 ? 'end' : 'start';
      const dx = anker === 'end' ? -9 : 9;
      s += `<text x="${X(halv.t) + dx}" y="${Yd(0.5) - 9}" fill="#9dc46b" font-size="11" font-weight="600" text-anchor="${anker}">halve gjæringen unnagjort</text>`;
      s += `<text x="${X(halv.t) + dx}" y="${Yd(0.5) + 5}" fill="#9dc46b" font-size="10.5" text-anchor="${anker}">${klokke(klokkeAv(halv.t))} · etter ${fmtTimer(halv.t)}</text>`;
    }
  }

  // --- akser og klokkeslett ---
  s += `<line x1="${pad.l}" y1="${pad.t + iH}" x2="${pad.l + iW}" y2="${pad.t + iH}" stroke="#4a3f34"/>`;
  if (!mini) {
    const steg = totalT <= 8 ? 1 : totalT <= 16 ? 2 : totalT <= 30 ? 3 : 6;
    for (let t = 0; t <= totalT + 0.01; t += steg) {
      const dt = klokkeAv(t);
      s += `<line x1="${X(t)}" y1="${pad.t + iH}" x2="${X(t)}" y2="${pad.t + iH + 5}" stroke="#4a3f34"/>`;
      s += `<text x="${X(t)}" y="${pad.t + iH + 19}" fill="#b8a894" font-size="11" text-anchor="middle">${dt.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}</text>`;
      s += `<text x="${X(t)}" y="${pad.t + iH + 33}" fill="#8a7a68" font-size="9.5" text-anchor="middle">${t === 0 ? dt.toLocaleDateString('nb-NO', { weekday: 'short' }) : '+' + Math.round(t) + ' t'}</text>`;
    }
    // aksetitler
    s += `<text x="${pad.l - 8}" y="${pad.t - 8}" fill="#5b8fa8" font-size="10.5" text-anchor="end">temp</text>`;
    s += `<text x="${pad.l + iW + 9}" y="${pad.t - 8}" fill="#e0a53c" font-size="10.5">gjæring</text>`;
  }

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = s;
  if (mini) return;

  const kald = g.trinn.filter(t => t.miljo <= 12);
  const kaldAndel = kald.reduce((s2, t) => s2 + t.dose, 0) / totalDose * 100;
  $('#chartLegend').innerHTML =
    `<span style="color:#e0a53c">━</span> akkumulert gjæring (høyre akse) &nbsp;·&nbsp;
     <span style="color:#5b8fa8">╌</span> deigtemperatur (venstre akse) &nbsp;·&nbsp;
     <span style="color:#c9633a">▨</span> øyeblikkelig gjæringsfart &nbsp;·&nbsp;
     <span style="color:#9dc46b">┆</span> halvveismerke
     ${kald.length ? `<br><b>Se på formen på den gule kurven i kjøletrinnet:</b> den er bratt i starten og flater ut.
     Kaldhevingen står for ${fmt(kaldAndel, 0)} % av gjæringen, men mesteparten av det skjer i de første timene mens deigen fortsatt kjøles ned — ikke jevnt utover.` : ''}`;
}

function tegnRateTabell() {
  const t = $('#rateTabell');
  const temps = [2, 4, 6, 8, 10, 14, 18, 20, 22, 24, 26, 28, 30, 33, 35.5, 38];
  let h = `<thead><tr><th class="n">°C</th><th class="n">Rate</th><th class="n">Mot 24 °C</th><th class="n">+°C for å doble farten</th><th></th></tr></thead><tbody>`;
  temps.forEach(T => {
    const R = rateFactor(T), d = doublingInterval(T);
    const rel = R >= 1 ? `${fmt(R, 2)}× raskere` : `${fmt(1 / R, R > 0.1 ? 1 : 0)}× saktere`;
    const hl = Math.abs(T - S.startTemp) < 0.6 ? ' style="background:#ffffff0f"' : '';
    let merk = '';
    if (T === 35.5) merk = 'optimum — bare 1,81× raskere enn 24 °C';
    else if (T === 4) merk = 'typisk kjøleskap';
    else if (T === 24) merk = 'referanse';
    else if (T === 30) merk = 'over dette er det nesten ingenting å hente';
    h += `<tr${hl}><td class="n mono">${fmt(T, T % 1 ? 1 : 0)}</td><td class="n mono">${fmt(R, 3)}</td><td class="n mono">${rel}</td><td class="n mono">${d === null ? '—' : '+' + fmt(d, 1)}</td><td class="small">${merk}</td></tr>`;
  });
  h += '</tbody>';
  t.innerHTML = h;
}

/* ============================================================
   VISNING: DEIGTEMP
   ============================================================ */
function tegnDeigtemp() {
  const { r } = beregn();
  $('#dtEgenFelt').style.display = S.dtMikser === 'egen' ? '' : 'none';

  const melIHoved = r.melTotal - (r.forferment ? r.forferment.mel : 0);
  const o = deigtempInn(r);

  $('#dtMengder').innerHTML = `${fmt(melIHoved)} g mel i hoveddeigen, ${fmt(r.vannHoved)} g vann${r.forferment ? `, ${fmt(r.forferment.total)} g forferment` : ''}${o.froGram > 0 ? `, ${fmt(o.froGram)} g bløtlagte frø` : ''}.`;

  const v = vanntemperatur(o);
  const spring = S.dtSpring;
  const is = isAndel(spring, v.vannTemp);

  tegnFriksjon(r, o, v);

  const st = $('#dtStats'); st.innerHTML = '';
  const stat = (k, val, u, cls) => st.appendChild(el('div', 'stat ' + (cls || ''), `<div class="k">${k}</div><div class="v">${val}<span class="u">${u || ''}</span></div>`));
  stat('Vanntemperatur', fmt(v.vannTemp, 1), ' °C', v.vannTemp < 0 ? 'bad' : v.vannTemp < 5 ? 'warn' : 'ok');
  stat('Friksjonsøkning', '+' + fmt(v.friksjonsOkning, 1), ' °C');
  stat('Deigens varmekapasitet', fmt(v.cpDeig, 2), ' kJ/kg·K');
  if (is > 0) {
    stat('Is av vannmengden', fmt(is * 100, 0), ' %');
    stat('Is', fmt(r.vannHoved * is), ' g');
    stat('Springvann', fmt(r.vannHoved * (1 - is)), ' g');
  }

  const n = $('#dtNotiser'); n.innerHTML = '';

  if (v.vannTemp < 0) {
    n.appendChild(el('div', 'note bad',
      `Du trenger <b>${fmt(v.vannTemp, 1)} °C</b> vann, som ikke er fysisk mulig. Kjøkkenet eller melet er for varmt for den eltetiden.
       Fiks i denne rekkefølgen: 1) kjøl melet — 21 → 4 °C gir −6,2 °C på deigen. 2) Kort eltetiden. 3) Frys en del av vannet til isbiter.`));
  } else if (is > 0.2) {
    n.appendChild(el('div', 'note warn', `Over 20 % is er ikke mulig — 0 °C er en hard bunn. Kjøl melet i tillegg.`));
  } else if (is > 0) {
    n.appendChild(el('div', 'note ok', `Bruk <b>${fmt(r.vannHoved * is)} g is + ${fmt(r.vannHoved * (1 - is))} g springvann</b>. Formelen er eksakt, ikke en tilnærming: isandel = (springtemp − ønsket) / (79,9 + springtemp).`));
  } else {
    n.appendChild(el('div', 'note ok', `Springvannet på ${fmt(spring, 1)} °C er kaldere enn du trenger — varm det til ${fmt(v.vannTemp, 1)} °C, eller bland med varmt.`));
  }

  // Sammenlign med klassisk formel
  const klassisk3 = 3 * o.onsketDeigTemp - o.melTemp - o.melTemp - 3 * v.friksjonsOkning;
  const faktisk = faktiskDeigTemp(o, klassisk3);
  if (Math.abs(faktisk - o.onsketDeigTemp) > 0.8) {
    n.appendChild(el('div', 'note warn',
      `<b>Hvorfor ikke den klassiske formelen:</b> «3 × ønsket − mel − rom − friksjonsfaktor» gir ${fmt(klassisk3, 1)} °C her,
       som i praksis ville landet deigen på <b>${fmt(faktisk, 1)} °C</b> — ${fmt(Math.abs(faktisk - o.onsketDeigTemp), 1)} grader bom.
       Den er bare eksakt når mel- og romtemperatur er like og lik (ønsket − friksjon).`));
  }

  const lev = (r.vannHoved / 1000 * CP.vann) / v.Csum;
  n.appendChild(el('div', 'note',
    `Vannet utgjør <b>${fmt(lev * 100, 0)} %</b> av deigens varmekapasitet. Derfor gir 1 °C på vannet <b>${fmt(lev, 2)} °C</b> på deigen.
     Isvann ned til 0 °C fra ${fmt(spring, 0)}-gradig springvann gir <b>−${fmt(spring * lev, 1)} °C</b> på deigen — normalt langt mer enn du trenger.`));

  if (o.onsketDeigTemp <= 22.5) n.appendChild(el('div', 'note ok',
    `${fmt(o.onsketDeigTemp, 1)} °C ut av maskinen er et godt valg for langtidsheving: glutenbindingsprosessen fortsetter under hevingen i stedet for å bli fullført i maskinen.`));

  // Kalibrering. Eltetiden her skal speile den du faktisk kjørte, så feltet
  // starter på din vanlige eltetid i stedet for en tilfeldig default.
  if (!$('#kalMin').value) $('#kalMin').value = S.eltMin;
  const kalVann = +$('#kalVann').value, kalMel = +$('#kalMel').value, kalUt = +$('#kalUt').value, kalMin = +$('#kalMin').value;
  const ko = { ...o, melTemp: kalMel, minutter: kalMin, friksjonPerMin: 0 };
  const utenFriksjon = faktiskDeigTemp(ko, kalVann);
  const friksjonTotal = kalUt - utenFriksjon;
  const perMin = kalMin > 0 ? friksjonTotal / kalMin : 0;
  const ku = $('#kalUtSvar');
  if (kalMin > 0 && isFinite(perMin)) {
    let vurdering = '';
    if (perMin < 0.05) vurdering = 'Nesten ingen friksjon — sjekk om målingen er riktig, eller om du elter for hånd.';
    else if (perMin < 0.3) vurdering = 'Svært lav — typisk for hånd eller veldig kort/langsom kjøring.';
    else if (perMin < 0.55) vurdering = 'Typisk hjemmespiral. Din maskin er mildere enn tommelfingerregelen på 1 °C/min.';
    else if (perMin < 0.8) vurdering = 'Typisk kjøkkenmaskin med krok.';
    else vurdering = 'Høyt — på nivå med en kommersiell spiral. Da stemmer tommelfingerregelen din på 1 °C per minutt.';
    ku.innerHTML = `<div class="note ok"><b>Din maskin: ${fmt(perMin, 2)} °C per minutt</b> (${fmt(friksjonTotal, 1)} °C over ${kalMin} min). ${vurdering}
      <br>Velg «Egen kalibrering» over og skriv inn ${fmt(perMin, 2)}.</div>`;
  } else ku.innerHTML = '';
}

/* Friksjonsvarmen er tid × intensitet. Tabellen gjør begge aksene synlige, fordi
   det er den ene tingen som avgjør om «bruk kaldt vann» er riktig råd eller ikke. */
function tegnFriksjon(r, o, v) {
  const t = $('#dtFriksjonTabell'); if (!t) return;
  const tider = [6, 8, 10, 12, 15, 18, 20, 25];
  const maskiner = [
    ['hand', 'Håndelting', FRIKSJON.hand],
    ['planet', 'Kjøkkenmaskin', FRIKSJON.planet],
    ['spiralHjemme', 'Spiral hjemme (Ooni)', FRIKSJON.spiralHjemme],
    ['spiralProff', 'Spiral proff', FRIKSJON.spiralProff]
  ];
  if (S.dtMikser === 'egen') maskiner.push(['egen', 'Din kalibrering', S.dtEgen]);

  let h = `<thead><tr><th>Eltetid</th>${maskiner.map(m => `<th class="n">${m[1]}<div class="small" style="text-transform:none;letter-spacing:0">${fmt(m[2], 2)} °C/min</div></th>`).join('')}</tr></thead><tbody>`;
  tider.forEach(min => {
    const din = min === S.eltMin;
    h += `<tr${din ? ' style="background:#ffffff0f"' : ''}><td>${din ? '<b>' : ''}${min} min${din ? ' — din</b>' : ''}</td>`;
    maskiner.forEach(m => {
      const vv = vanntemperatur({
        ...o,
        mikser: m[0] === 'egen' ? 'spiralHjemme' : m[0],
        friksjonPerMin: m[0] === 'egen' ? S.dtEgen : null,
        minutter: min
      });
      const umulig = vv.vannTemp < 0, kaldt = vv.vannTemp < 4;
      const aktiv = din && m[0] === S.dtMikser;
      const stil = umulig ? ' style="color:var(--rød)"'
                 : aktiv ? ' style="color:var(--gull2);font-weight:700"' : '';
      h += `<td class="n mono"${stil}>${fmt(vv.vannTemp, 1)} °C`
         + `<div class="small">+${fmt(vv.friksjonsOkning, 1)} °C${umulig ? ' · umulig' : kaldt ? ' · isvann' : ''}</div></td>`;
    });
    h += '</tr>';
  });
  h += '</tbody>';
  t.innerHTML = h;

  /* Tåler melblandingen eltetiden?

     Her stod tidligere en tabell som ga ALLE meltyper et elteta k — inkludert
     sammalt hvete (9 min) og rug (6 min). De tallene var gjettet, og de er
     direkte i strid med litteraturen: det finnes ingen publisert regel av typen
     «halver eltetiden ved X % sammalt», og målingene på kli spriker om
     utviklingstid i det hele tatt. Kli river glutenfilmen og stjeler vann — det
     er derfor du ikke får vindusrute — men det er ikke det samme som at deigen
     brytes ned av å eltes. Rug bidrar ingenting til glutenet, så eltingen av
     rugandelen er bortkastet arbeid, men heller ikke det er et tidstak.

     Nå settes tak KUN for urkorn med svakt glutenin, der det finnes publiserte
     tall: enkorn (anbefalt 3–4 min ved 100 %), emmer (danner ingen
     aggregeringstopp i det hele tatt) og spelt (glutenindeks ~59 mot hvetens
     97+, farinografstabilitet 9,5 mot 17,5 min).

     Blandingstaket er en HARMONISK vekting — nedbrytning per tidsenhet er
     omtrent additiv, så den svake andelen trekker mest. Selve vektingen er mitt
     anslag; det finnes ingen publisert regel for blandinger.                  */
  const URKORN_TAK = { enkorn: 4, emmer: 5, spelt_siktet: 9, samalt_spelt: 9 };
  const BASIS_TAK = 25;                       // sterkt/normalt hvetemel, hjemmespiral

  let sumInv = 0, urkornAndel = 0, svakest = null;
  const pctSum = S.melListe.reduce((s, y) => s + y.pct, 0) || 100;
  S.melListe.forEach(m => {
    const f = FLOURS.find(x => x.id === m.id); if (!f) return;
    const andel = m.pct / pctSum;
    const t = URKORN_TAK[m.id];
    sumInv += andel / (t || BASIS_TAK);
    if (t) {
      urkornAndel += andel;
      if (!svakest || t < svakest.t) svakest = { t, f, andel };
    }
  });
  // Bare meningsfullt når urkornet faktisk utgjør noe. Under 10 % er taket
  // praktisk talt hvetemelets eget, og da er det arbeidsmålet som gjelder.
  const verst = (svakest && urkornAndel >= 0.10)
    ? { gr: Math.round(1 / Math.max(sumInv, 1e-9)), f: svakest.f, andel: svakest.andel }
    : null;

  const n = $('#dtEltNotiser'); n.innerHTML = '';

  /* --- Arbeidsmåleren --- */
  const friksjonPerMin = S.dtMikser === 'egen' ? S.dtEgen : FRIKSJON[S.dtMikser];
  const wh = arbeidWh(v.friksjonsOkning);
  const minForWh = w => w * ELTING.GRAD_PER_WH / Math.max(friksjonPerMin, 1e-6);
  const maskinNavn = maskiner.find(m => m[0] === S.dtMikser)?.[1] || 'maskinen';

  const sone = wh < 2.2 ? ['bad', 'under terskelen for utviklet gluten']
             : wh < ELTING.MAAL_LAV ? ['warn', 'litt under målsonen']
             : wh <= ELTING.MAAL_HOY ? ['ok', 'i målsonen for åpen krumme']
             : wh <= ELTING.METNING ? ['warn', 'over målsonen — krummen går fra åpen mot fin']
             : ['bad', 'forbi metning: mer arbeid gir ikke mer nettverk'];

  const st = el('div', 'stats');
  const stt = (k, val, u, cls) => st.appendChild(el('div', 'stat ' + (cls || ''), `<div class="k">${k}</div><div class="v">${val}<span class="u">${u || ''}</span></div>`));
  stt('Arbeid i deigen', fmt(wh, 1), ' Wh/kg', sone[0]);
  stt('Friksjonsvarme', '+' + fmt(v.friksjonsOkning, 1), ' °C', sone[0]);
  stt('Målsone', `${fmt(ELTING.MAAL_LAV, 0)}–${fmt(ELTING.MAAL_HOY, 0)}`, ' Wh/kg');
  stt('Tid som treffer sonen', `${fmt(minForWh(ELTING.MAAL_LAV), 0)}–${fmt(minForWh(ELTING.MAAL_HOY), 0)}`, ' min');
  n.appendChild(st);

  n.appendChild(el('div', 'note ' + sone[0],
    `<b>${S.eltMin} minutter på ${maskinNavn} = ${fmt(wh, 1)} Wh/kg</b> — ${sone[1]}.
     Nesten all mekanisk energi ender som varme i deigen, så temperaturstigningen <i>er</i> arbeidsmåleren din:
     1 Wh/kg ≈ ${fmt(ELTING.GRAD_PER_WH, 2)} °C. Kryssjekken som gjør tallet troverdig: Chorleywood-prosessen leverer
     målt 11 Wh/kg og gir dokumentert 14–15 °C stigning — modellen her gir ${fmt(gradForArbeid(11), 1)} °C.
     <br><b>Stopp på temperatur, ikke på klokka:</b> mål deigen underveis og stopp ved
     <b>+${fmt(gradForArbeid(ELTING.MAAL_LAV), 0)} til +${fmt(gradForArbeid(ELTING.MAAL_HOY), 0)} °C</b> over blandingstemperaturen.
     Det er det samme tallet uansett hastighet, mens minuttene ikke er det.`));

  n.appendChild(el('div', 'note',
    `<b>Hastighet slår tid.</b> Effekten går som turtallet opphøyd i 1,3–1,7, så dobler du hastigheten
     får du 2,5–3,2× arbeidet per minutt — ikke det dobbelte. Derfor er «6 minutter» og «18 minutter» ikke
     nødvendigvis uenige: de kan beskrive samme arbeid på ulik hastighet. Kjører du lavt og synes det ikke
     monner, <b>hev hastigheten framfor å legge på minutter</b> — lange økter på lav hastighet piper inn luft
     og bleker melet uten å bygge tilsvarende nettverk.`));

  // Bolla må være full nok til at arbeidet i det hele tatt overføres.
  const bolleLiter = 7;
  if (r.masseKg < 1.0) n.appendChild(el('div', 'note warn',
    `<b>Bare ${fmt(r.masseKg, 1)} kg deig.</b> En spiralmikser overfører arbeid dårlig når bolla er for tom —
     bransjeregelen er 20–115 % av kapasitet, og for en ${bolleLiter} L bolle anbefales minst 0,9–1 kg, optimalt over det.
     Underfylling er en vanlig og usynlig grunn til at «anbefalt eltetid ikke virker»: deigen blir kastet rundt i stedet for knadd.`));

  n.appendChild(el('div', 'note',
    `Vannet er ${fmt((r.vannHoved / 1000 * CP.vann) / v.Csum * 100, 0)} % av deigens varmekapasitet, så én grad på vannet flytter deigen
     <b>${fmt((r.vannHoved / 1000 * CP.vann) / v.Csum, 2)} °C</b>. Alt du vil korrigere, koster derfor omtrent dobbelt på vannet.`));

  if (v.vannTemp < 12 && v.vannTemp >= 0) n.appendChild(el('div', 'note',
    `Her er «bruk kaldt vann» faktisk riktig råd for deg — men av riktig grunn.
     Rådet stammer fra lang, hard elting på proff spiral, der maskinen alene tilfører 6–12 grader.
     Du kommer til samme sted fordi <b>${S.eltMin} minutter</b> på en hjemmespiral også er mye arbeid.
     Hadde du eltet ${fmt(Math.max(S.eltMin - 10, 3))} minutter, ville du trengt
     ${grader(vanntemperatur({ ...o, minutter: Math.max(S.eltMin - 10, 3) }).vannTemp, 1)} — altså lunkent vann.`));

  /* --- Melets tåleevne mot arbeidsmålet ---
     To uavhengige tak gjelder samtidig: hvor mye arbeid deigen SKAL ha, og hvor
     mye melet TÅLER. Er melet svakt nok, nås aldri arbeidsmålet — glutenet brytes
     ned før du kommer dit. Da er ikke svaret flere minutter; da må resten av
     nettverket bygges et annet sted. Det er selve poenget, og appen sa det ikke før. */
  if (verst) {
    const whVedTak = arbeidWh(verst.gr * friksjonPerMin);
    const naarIkkeMaal = whVedTak < ELTING.MAAL_LAV;
    const eltSetning = (verst.f.notat || '').split(/(?<=\.)\s+/)
      .find(s => /elt|elti|maskin/i.test(s)) || '';

    if (naarIkkeMaal) n.appendChild(el('div', 'note bad',
      `<b>Melet setter taket, ikke arbeidsmålet.</b> ${verst.f.navn} utgjør ${pst(verst.andel * 100, 0)} av melet og er ${verst.f.styrke};
       blandingen tåler anslagsvis <b>${verst.gr} minutter</b> før glutenet brytes ned raskere enn det bygges. ${eltSetning}
       På ${maskinNavn} rekker du da bare <b>${fmt(whVedTak, 1)} Wh/kg</b> — under målsonen på ${fmt(ELTING.MAAL_LAV, 0)}.
       <br>Det er ikke et problem du kan elte deg ut av. Hent resten slik:
       <b>autolyse 30–45 min</b> (Calvel målte ~15 % kortere nødvendig eltetid), <b>bassinage</b> — hold igjen 5–10 % av vannet
       og spe det inn til slutt, slik at deigen er stivere mens arbeidet gjøres — og <b>3 sett brett</b> i bulken.
       Brett bygger nettverk uten å piske inn luft, og uten å rive et skjørt gluten.
       <br>Merk også at fullt salt fra start <b>styrker</b> en svak deig: målt faller Mixing Tolerance Index fra 80 til 40 BU
       når saltet går fra 0 til 1,5 %. Utsatt salt er et grep for sterkt mel, ikke for dette.`));
    else if (S.eltMin > verst.gr) n.appendChild(el('div', 'note warn',
      `<b>${verst.f.navn}</b> utgjør ${pst(verst.andel * 100, 0)} av melet og er ${verst.f.styrke}.
       Vektet mot resten av blandingen tåler deigen anslagsvis <b>${verst.gr} minutter</b> — du kjører ${S.eltMin}. ${eltSetning}
       Du rekker arbeidsmålet innenfor det taket, så det holder å stoppe tidligere: mål temperaturen og stopp på
       +${fmt(gradForArbeid(ELTING.MAAL_LAV), 0)} til +${fmt(gradForArbeid(ELTING.MAAL_HOY), 0)} °C.
       <span class="small">Blandingsvektingen er et anslag — det finnes publiserte tall for rene urkorn, ikke for blandinger.</span>`));
  }

  // Grovt mel og rug: si hva de faktisk gjør, ikke at de er et tidstak.
  const grovAndel = S.melListe.reduce((s, m) => {
    const f = FLOURS.find(x => x.id === m.id);
    return s + (f && f.grov && !URKORN_TAK[m.id] ? m.pct / pctSum : 0);
  }, 0);
  if (grovAndel >= 0.15) n.appendChild(el('div', 'note',
    `<b>De ${pst(grovAndel * 100, 0)} grovt mel er ikke et tidstak.</b> Det er en utbredt oppfatning at sammalt mel og kli
     krever kortere elting, men målingene spriker om utviklingstid i det hele tatt, og det finnes ingen publisert regel
     for hvor mye kortere. Det kli faktisk gjør er å <b>rive glutenfilmen fysisk og stjele vann</b> — det er derfor du
     ikke får vindusrute — og eventuell rug bidrar <b>ingenting</b> til glutenet, så eltingen av den andelen er
     bortkastet arbeid uansett hvor lenge du kjører. Bruk arbeidsmålet over som styring, og døm på overflaten:
     glattere, samlet, slipper bollen. Ikke jag en film dette melet ikke kan danne.`));

  n.appendChild(el('div', 'note',
    `<b>Hva du faktisk taper ved for mye elting.</b> Mekanisk sammenbrudd er nesten umulig hjemme — det krever
     rundt 30 minutter på høy hastighet med fullkorn. Skaden er en annen og usynlig til brødet er skåret opp:
     eltingen pisker inn luft som aktiverer lipoksygenase og bleker karotenoidene, altså den blasse fargen og den tomme
     smaken Calvel skrev om. Og fordi <b>alle gassceller i det ferdige brødet stammer fra luft pisket inn under eltingen</b> —
     ingen nye bobler dannes senere — gir mer arbeid flere og mindre bobler, altså finere og jevnere krumme.
     Mer arbeid gir mer volum, men mindre åpen krumme. De to målene trekker mot hver sin kant, og løsningen er å hente
     volumet fra gjæringen og ovnen i stedet for fra mikseren.`));
}

/* ============================================================
   VISNING: TIDSPLAN
   ============================================================ */
function tegnPlan() {
  const B = bakeSteg();
  const { r, g, steg, ferdig, prof } = B;

  const tl = $('#planTidslinje'); tl.innerHTML = '';
  const naa = new Date();
  steg.forEach(x => {
    const fortid = x.tid < naa;
    const row = el('div', 'tlrow ' + (x.type === 'cold' ? 'cold' : x.type === 'bake' || x.type === 'oven' || x.type === 'cool' ? 'bake' : ''));
    row.innerHTML = `<div class="t">${klokke(x.tid)}${fortid ? ' <span class="pill r">i fortid</span>' : ''}</div>
                     <div class="n">${x.nr}. ${x.navn}</div>
                     <div class="d">${x.temp}${x.gjor ? ' ' + x.gjor : ''}</div>`;
    tl.appendChild(row);
  });

  const totalT = (ferdig - B.start) / 3600000;
  const pl = $('#planListe');
  pl.innerHTML = `
    <div class="stats">
      <div class="stat"><div class="k">Total prosess</div><div class="v">${fmt(totalT, 1)}<span class="u"> t</span></div></div>
      <div class="stat"><div class="k">Start</div><div class="v" style="font-size:1rem">${klokke(B.start)}</div></div>
      <div class="stat"><div class="k">Gjæringsdose</div><div class="v">${fmt(g.dose, 2)}</div></div>
      <div class="stat"><div class="k">Antall brød</div><div class="v">${S.antall}</div></div>
      <div class="stat"><div class="k">Stekeprofil</div><div class="v" style="font-size:.95rem">${prof.navn}</div></div>
    </div>
    <div class="spacer"></div>
    <div class="note">${totalT >= 16 ? '<b>Over 16 timer total prosess</b> — det er der smaken bygges. 24–36 timer inkludert kaldheving er målet.' : '<b>Under 16 timer.</b> Vurder å legge inn poolish eller lengre kaldheving; tid er råstoffet for smak i en gjærdeig.'}</div>
    <h3 style="margin-top:16px">Handleliste — dette må være i huset</h3>
    <table><tbody>
      ${r.mel.map(m => `<tr><td>${m.navn}</td><td class="n mono">${gram(m.gram)}</td></tr>`).join('')}
      ${r.fro.map(f => `<tr><td>${f.navn}</td><td class="n mono">${gram(f.gram)}</td></tr>`).join('')}
      <tr><td>Vann totalt <span class="small">(${gram(r.vannHoved)} i deigen${r.forferment ? ` + ${gram(r.forferment.vann)} i forfermenten` : ''}${r.froAbsorbert > 1 ? ` + ${gram(r.froAbsorbert)} i frøene` : ''})</span></td><td class="n mono">${gram(r.vannTotal)}</td></tr>
      <tr><td>Salt</td><td class="n mono">${gram(r.salt, 1)}</td></tr>
      <tr><td>${{ fersk: 'Fersk gjær', torr: 'Tørrgjær', aktiv: 'Aktiv tørrgjær' }[S.gjaerType]}</td><td class="n mono">${gram(r.gjaerTotal, 2)}</td></tr>
    </tbody></table>`;
}

/* ============================================================
   VISNING: BAK NÅ — den guidede prosessen
   Ett steg om gangen, med mengder, temperaturer og klokkeslett samlet
   der du står. Alt regnes fra den samme kjeden som Tidsplan bruker.
   ============================================================ */
const STEGIKON = { ff: '◐', prep: '◦', mix: '⚙', bulk: '▲', cold: '❄', oven: '🔥', shape: '✋', bake: '🔥', cool: '≈' };

function tegnBakNaa() {
  const vert = $('#bakSteg'); if (!vert) return;
  const B = bakeSteg();
  const { steg, r, g, prof, ferdig } = B;
  const naa = new Date();

  // Første steg som ikke er huket av er «nå». Er alt huket av, er du ferdig.
  const neste = steg.find(s => !S.bakHuket[s.id]);
  const gjort = steg.filter(s => S.bakHuket[s.id]).length;

  // --- toppkort ---
  $('#bakOversikt').innerHTML = `
    <div class="stats">
      <div class="stat"><div class="k">Brød</div><div class="v" style="font-size:1rem">${S.antall} × ${gram(S.vektPerBrod)}</div></div>
      <div class="stat"><div class="k">Start</div><div class="v" style="font-size:1rem">${klokke(B.start)}</div></div>
      <div class="stat"><div class="k">Ut av ovnen</div><div class="v" style="font-size:1rem">${klokke(ferdig)}</div></div>
      <div class="stat"><div class="k">Total prosess</div><div class="v">${fmt((ferdig - B.start) / 3600000, 1)}<span class="u"> t</span></div></div>
      <div class="stat ok"><div class="k">Gjæringsdose</div><div class="v">${fmt(g.dose, 2)}</div></div>
      <div class="stat"><div class="k">Deigtemp mål</div><div class="v">${fmt(S.startTemp, 1)}<span class="u"> °C</span></div></div>
      <div class="stat"><div class="k">Vann inn</div><div class="v">${fmt(B.vt.vannTemp, 1)}<span class="u"> °C</span></div></div>
      <div class="stat"><div class="k">Framdrift</div><div class="v">${gjort}<span class="u"> / ${steg.length}</span></div></div>
    </div>
    <div class="bakbar"><div style="width:${gjort / steg.length * 100}%"></div></div>`;

  // --- «nå»-banneret ---
  const nb = $('#bakNaaKort');
  if (!neste) {
    nb.className = 'naakort ferdig';
    nb.innerHTML = `<div class="nk-l">Ferdig</div><div class="nk-n">Alle ${steg.length} stegene er huket av.</div>
      <div class="nk-d">Logg baket under Bakelogg mens du husker det — dose ${fmt(g.dose, 2)}, ${fmt(S.hydrering, 1)} % hydrering, ${fmt(S.startTemp, 1)} °C deigtemp. Var det bra, kan du bruke dosen som mål for alt du baker senere.</div>`;
  } else {
    const diff = (neste.tid - naa) / 60000;
    const naaEtikett = diff <= 0 ? (diff > -neste.varighet ? 'Nå — i gang' : 'På overtid')
                     : diff < 60 ? `Om ${Math.round(diff)} min` : `Om ${fmtTimer(diff / 60)}`;
    nb.className = 'naakort' + (diff <= 0 ? ' aktiv' : '');
    nb.innerHTML = `
      <div class="nk-l">${naaEtikett} · ${klokke(neste.tid)}</div>
      <div class="nk-n">${STEGIKON[neste.type] || '•'} Steg ${neste.nr}: ${neste.navn}</div>
      <div class="nk-d">${neste.temp}</div>`;
  }

  // --- stegene ---
  vert.innerHTML = '';
  steg.forEach(s => {
    const huket = !!S.bakHuket[s.id];
    const erNaa = neste && s.id === neste.id;
    const d = el('div', 'bsteg' + (huket ? ' huket' : '') + (erNaa ? ' naa' : ''));
    d.innerHTML = `
      <div class="bs-topp">
        <button class="bs-hak" data-hak="${s.id}" aria-label="${huket ? 'Fjern haken' : 'Marker som gjort'}">${huket ? '✓' : s.nr}</button>
        <div class="bs-tit">
          <div class="bs-navn">${STEGIKON[s.type] || '•'} ${s.navn}</div>
          <div class="bs-tid">${klokke(s.tid)}${s.varighet ? ' · ' + (s.varighet >= 90 ? fmtTimer(s.varighet / 60) : fmt(s.varighet) + ' min') : ''}${huket && S.bakHuket[s.id] !== true ? ` · <span class="small">gjort ${klokke(new Date(S.bakHuket[s.id]))}</span>` : ''}</div>
        </div>
      </div>
      <div class="bs-kropp">
        ${s.mengder.length ? `<table class="bs-tab"><tbody>${s.mengder.map(m => `<tr><td>${m[0]}</td><td class="n mono">${m[1]}</td></tr>`).join('')}</tbody></table>` : ''}
        <div class="bs-temp">${s.temp}</div>
        ${s.gjor ? `<div class="bs-gjor">${s.gjor}</div>` : ''}
        ${s.sjekk ? `<div class="note ok" style="margin:8px 0 0"><b>Se etter:</b> ${s.sjekk}</div>` : ''}
        ${s.varsel ? `<div class="note warn" style="margin:8px 0 0">${s.varsel}</div>` : ''}
      </div>`;
    vert.appendChild(d);
  });

  vert.querySelectorAll('[data-hak]').forEach(b => b.onclick = () => {
    const id = b.dataset.hak;
    if (S.bakHuket[id]) delete S.bakHuket[id];
    else S.bakHuket[id] = new Date().toISOString();
    lagre(); tegnBakNaa();
  });

  // --- stekeprofilvelger ---
  const sp = $('#bakProfil');
  if (sp && !sp.options.length) {
    BAKE_PROFILES.forEach(p => { const o = el('option', null, p.navn); o.value = p.id; sp.appendChild(o); });
  }
  if (sp && document.activeElement !== sp) sp.value = prof.id;

  const fi = $('#bakFerdig');
  if (fi && document.activeElement !== fi) fi.value = tilFeltVerdi(ferdig);
  const si = $('#bakStart');
  if (si && document.activeElement !== si) si.value = tilFeltVerdi(B.start);
}

/* ============================================================
   VISNING: STEKING
   ============================================================ */
function tegnSteking() {
  const k = $('#stekeKort'); k.innerHTML = '';
  // Samme profil som Tidsplan og Bak nå bruker — ikke forvalgets, som kunne
  // peke på baguetter for et rundbrød du hadde bygget i «Bygg brød».
  const aktiv = aktivProfil().id;
  BAKE_PROFILES.forEach(p => {
    const c = el('div', 'card');
    c.style.background = p.id === aktiv ? 'var(--panel2)' : 'var(--bg2)';
    c.style.borderColor = p.id === aktiv ? 'var(--gull)' : 'var(--line)';
    c.innerHTML = `
      <h3 style="color:var(--gull2)">${p.navn} ${p.id === aktiv ? '<span class="pill y">denne bruker planen din</span>' : ''}</h3>
      <div class="small" style="margin-bottom:9px">${p.vekt} · ${p.hydrering}</div>
      <table><tbody>
        <tr><td>Inn på</td><td class="n mono"><b>${p.inn} °C</b></td></tr>
        <tr><td>Ned til</td><td class="n mono"><b>${p.ned} °C</b> — ${p.nedNaar}</td></tr>
        <tr><td>Damp</td><td class="n">${p.damp}</td></tr>
        <tr><td>Damptid</td><td class="n">${p.dampTid}</td></tr>
        <tr><td>Rist</td><td class="n">${p.rist}</td></tr>
        <tr><td>Steketid</td><td class="n mono"><b>${p.tid}</b></td></tr>
        <tr><td>Kjernetemperatur</td><td class="n mono"><b>${p.kjerne}</b></td></tr>
        <tr><td>Lufting</td><td class="n">${p.luft}</td></tr>
      </tbody></table>
      ${p.notat ? `<div class="note">${p.notat}</div>` : ''}`;
    k.appendChild(c);
  });

  $('#stekeEndringer').innerHTML = `
    <div class="note bad"><b>1. Dampkaret, ikke vannmengden.</b> En liten kopp (100–150 ml) er rikelig — du trenger bare ~26 ml for å fylle en 60-liters ovn.
      Men en tynn stekeplate rommer bare ~50 kJ brukbar varme, og å fordampe 120 g kaldt vann krever 321 kJ. Vannet flasher ikke, det putrer av gårde over 10–20 minutter.
      Det gir svak damp i de eneste 2 minuttene som betyr noe, og en lang damphale gjennom minutt 5–20 — akkurat regimet som undertrykker bruning.
      <br><b>Fiks:</b> kokende vann fra kjelen, i en forvarmet støpejernspanne eller på lavastein/bolter, i det du setter inn brødet. Da holder 50–75 ml.</div>

    <div class="note bad"><b>2. Dropp dørspalten etter 5 minutter.</b> Mekanismen du sikter mot er ekte — etter kondensasjonsfasen fjerner damp faktisk 25–31 % av varmestrømmen fordi vanndamp absorberer infrarødt.
      Men ved 5 minutter er ovnsløftet ikke ferdig (vindu 15–20 min for et 900 g brød), og 20 sekunder åpen dør koster 2–5 minutter steketid.
      Du setter skorpa mens brødet fortsatt vil utvide seg: snittet slutter å åpne seg og øret slutter å dannes.
      <br><b>Fiks:</b> trekk dampen ut ved 15–20 minutter i stedet. Det er den samme fysikken, brukt på riktig tidspunkt.</div>

    <div class="note bad"><b>3. Stol på et termoelement, ikke laseren.</b> De 350 °C du målte på stekebrettet er nesten helt sikkert reflektert elementstråling.
      Et blankt stålbrett er nesten et speil i infrarødt. Verre: i en ovn som har nådd likevekt leser et IR-termometer <b>cavitetens</b> temperatur uansett hva objektet holder —
      med emissivitet 0,1 leser den 252 °C når stålet i virkeligheten er 200 °C. Den lyver mest når stålet er blankest.
      <br><b>Diagnose:</b> mål to ganger, én gang mens elementene gløder og én i en av-syklus. Kollapser tallet, var det refleksjon.
      <br><b>Fiks:</b> et K-type termoelement eller en innstikksføler lagt flatt på platen. Billigere enn de fleste IR-pistoler. På <i>stein</i> er en vanlig pistol faktisk nøyaktig.</div>

    <div class="note ok"><b>Det du gjør riktig:</b> 270–280 → 230–250 følger Modernist Breads regel om at innsettingstemperaturen skal ligge ca. 10 % over steketemperaturen.
      Eneste finpuss: bruk nedre ende (260–270 inn / 230 stek) ved gryte, der lukkerommet allerede gir aggressiv varme og for varm innsetting setter skorpa før brødet er ferdig utvidet.
      «Kast inn vannet innen 1 min og så ikke noe mer styr» er også korrekt og standard — ingen seriøs kilde damper på nytt etterpå.</div>`;
}

/* ============================================================
   VISNING: TEKNIKK
   ============================================================ */
/* ============================================================
   VISNING: MEL & KORN
   Oppslagsverk med favorittmerking. Favorittene løftes til toppen av
   melvelgeren i Oppskrift, slik at et bibliotek på 28 meltyper ikke gjør
   den daglige bruken tyngre.
   ============================================================ */
const melInfoAapne = new Set();

function tegnMelbibliotek() {
  const c = $('#melBibliotek'); if (!c) return;

  const gs = $('#melGruppe');
  if (gs && !gs.options.length) {
    gs.appendChild(el('option', null, 'Alle grupper')).value = '';
    [...new Set(FLOURS.map(f => f.gruppe))].forEach(g => {
      const o = el('option', null, g); o.value = g; gs.appendChild(o);
    });
  }

  const sok = ($('#melSok')?.value || '').toLowerCase().trim();
  const gruppe = $('#melGruppe')?.value || '';
  const bidrag = $('#melBidrag')?.value || '';
  const bareFav = !!$('#melBareFav')?.checked;

  const treff = FLOURS.filter(f => {
    const i = MEL_INFO[f.id] || {};
    if (gruppe && f.gruppe !== gruppe) return false;
    if (bidrag && i.glutenbidrag !== bidrag) return false;
    if (bareFav && !S.favorittMel.includes(f.id)) return false;
    if (!sok) return true;
    const tekst = [f.navn, f.gruppe, f.notat, f.styrke,
      ...(i.plus || []), ...(i.minus || [])].join(' ').toLowerCase();
    return tekst.includes(sok);
  });

  $('#melAntall').innerHTML = `Viser <b>${treff.length}</b> av ${FLOURS.length} meltyper`
    + (S.favorittMel.length ? ` · <b>${S.favorittMel.length}</b> favoritter` : '');

  c.innerHTML = '';
  if (!treff.length) { c.innerHTML = '<div class="card"><p class="small">Ingen treff.</p></div>'; return; }

  // Grupper visningen, men bare når man ikke allerede filtrerer på én gruppe.
  const grupper = gruppe ? [gruppe] : [...new Set(treff.map(f => f.gruppe))];
  grupper.forEach(g => {
    const iGruppe = treff.filter(f => f.gruppe === g);
    if (!iGruppe.length) return;
    const kort = el('div', 'card');
    kort.appendChild(el('h3', null, g));
    const rutenett = el('div', 'melgrid');

    iGruppe.forEach(f => {
      const i = MEL_INFO[f.id] || {};
      const gb = GLUTENBIDRAG_TEKST[i.glutenbidrag] || GLUTENBIDRAG_TEKST.noytral;
      const fav = S.favorittMel.includes(f.id);
      const d = el('div', 'melkort' + (fav ? ' fav' : ''));
      // Hver rad har en ⓘ som folder ut hva tallet betyr i praksis. Teksten er
      // felles og ligger i MELTALL_INFO; det er bare visningen som er per kort.
      const rad = (felt, navn, verdi, ekstra = '') => {
        const aapen = melInfoAapne.has(f.id + ':' + felt);
        return `<tr><td>${navn}${ekstra}
            <button class="miknapp${aapen ? ' on' : ''}" data-mi="${f.id}:${felt}"
              aria-label="Hva betyr ${navn}?" title="Hva betyr dette?">ⓘ</button></td>
            <td class="n mono">${verdi}</td></tr>
          ${aapen ? `<tr class="mk-forklaring"><td colspan="2">${MELTALL_INFO[felt].tekst}</td></tr>` : ''}`;
      };

      const gbAapen = melInfoAapne.has(f.id + ':glutenbidrag');
      d.innerHTML = `
        <div class="mk-topp">
          <div class="mk-bilde">${melSvg(f.id, { h: 46 })}</div>
          <div class="mk-tit">
            <div class="mk-navn">${f.navn}</div>
            <div class="mk-tag" style="color:${gb.farge}">${gb.navn}
              <button class="miknapp${gbAapen ? ' on' : ''}" data-mi="${f.id}:glutenbidrag"
                aria-label="Hva betyr glutenbidrag?" title="Hva betyr dette?">ⓘ</button></div>
            <div class="small">${TILGANG_TEKST[i.tilgang] || ''}</div>
          </div>
          <button class="mk-stjerne${fav ? ' on' : ''}" data-fav="${f.id}"
            aria-label="${fav ? 'Fjern favoritt' : 'Merk som favoritt'}" title="Favoritt">${fav ? '★' : '☆'}</button>
        </div>
        ${gbAapen ? `<div class="mk-forklaring fri">${MELTALL_INFO.glutenbidrag.tekst}</div>` : ''}
        <table class="mk-tall"><tbody>
          ${rad('protein', 'Protein', gram(f.protein, 1))}
          ${rad('vannbehov', 'Vannbehov', f.absorpsjon === 1 ? 'likt'
              : (f.absorpsjon > 1 ? '+' : '−') + fmt(Math.abs(f.absorpsjon - 1) * 100, 0) + ' %-poeng',
              ' <span class="small">vs. siktet hvete</span>')}
          ${rad('tak', 'Praktisk tak', pst(f.maxPct, 0))}
          ${rad('pris', 'Pris', fmt(f.kr, 0) + ' kr/kg')}
        </tbody></table>
        ${i.plus ? `<ul class="mk-plus">${i.plus.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
        ${i.minus ? `<ul class="mk-minus">${i.minus.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
        ${f.notat ? `<div class="mk-notat">${f.notat}</div>` : ''}`;
      rutenett.appendChild(d);
    });

    kort.appendChild(rutenett);
    c.appendChild(kort);
  });

  c.querySelectorAll('[data-mi]').forEach(b => b.onclick = () => {
    const k = b.dataset.mi;
    if (melInfoAapne.has(k)) melInfoAapne.delete(k); else melInfoAapne.add(k);
    tegnMelbibliotek();
  });

  c.querySelectorAll('[data-fav]').forEach(b => b.onclick = () => {
    const id = b.dataset.fav;
    const n = S.favorittMel.indexOf(id);
    if (n >= 0) S.favorittMel.splice(n, 1); else S.favorittMel.push(id);
    lagre();
    tegnMelbibliotek();
    tegnOppskrift();   // favorittene styrer rekkefølgen i melvelgeren
  });
}

/* ---------- Ordliste ----------
   Gruppert etter tema, ikke alfabetisk: ord man lurer på henger sammen med
   nabobegrepene sine, og da er tema mer nyttig enn bokstavrekkefølge.
   Søk slår derimot på alt, inkludert definisjonsteksten. */
let ordAapent = null;

function tegnOrdliste() {
  const c = $('#ordListe'); if (!c) return;
  const sok = ($('#ordSok')?.value || '').toLowerCase().trim();
  const treff = ORDLISTE.filter(o =>
    !sok || (o.ord + ' ' + o.def + ' ' + o.gr).toLowerCase().includes(sok));

  c.innerHTML = '';
  if (!treff.length) { c.innerHTML = '<p class="small">Ingen treff.</p>'; return; }

  const grupper = [...new Set(treff.map(o => o.gr))];
  grupper.forEach(gr => {
    c.appendChild(el('div', 'ordgruppe', gr));
    const rad = el('div', 'ordrad');
    treff.filter(o => o.gr === gr).forEach(o => {
      const knapp = el('button', 'ordknapp' + (ordAapent === o.ord ? ' on' : ''), o.ord);
      knapp.type = 'button';
      knapp.onclick = () => { ordAapent = ordAapent === o.ord ? null : o.ord; tegnOrdliste(); };
      rad.appendChild(knapp);
    });
    c.appendChild(rad);

    const aapen = treff.find(o => o.gr === gr && o.ord === ordAapent);
    if (aapen) {
      const d = el('div', 'orddef');
      d.innerHTML = `<div class="od-ord">${aapen.ord}</div><div>${aapen.def}</div>`
        + (aapen.se?.length ? `<div class="od-se">Se også: ${aapen.se.map(s =>
            `<a href="#" data-se="${s}">${s}</a>`).join(' · ')}</div>` : '');
      d.querySelectorAll('[data-se]').forEach(a => a.onclick = e => {
        e.preventDefault();
        ordAapent = a.dataset.se;
        if ($('#ordSok')) $('#ordSok').value = '';
        tegnOrdliste();
        $('#ordListe').scrollIntoView({ block: 'nearest' });
      });
      c.appendChild(d);
    }
  });
}

let tipsAapne = new Set([1]);
function tegnTeknikk() {
  const sok = ($('#tipsSok').value || '').toLowerCase().trim();
  const c = $('#tipsListe'); c.innerHTML = '';
  TIPS.forEach((t, i) => {
    const tekst = (t.tittel + ' ' + (t.intro || '') + ' ' + t.punkter.map(p => p.join(' ')).join(' ')).toLowerCase();
    if (sok && !tekst.includes(sok)) return;
    const open = tipsAapne.has(i) || (sok.length > 2);
    const d = el('div', 'tip' + (t.varsel ? ' varsel' : '') + (open ? ' open' : ''));
    d.innerHTML = `
      <div class="tiphead" role="button" tabindex="0" aria-expanded="${open}"><span class="ic" aria-hidden="true">${t.ikon}</span><span class="ttl">${t.tittel}</span><span class="arw" aria-hidden="true">›</span></div>
      <div class="tipbody">
        ${t.intro ? `<div class="intro">${t.intro}</div>` : ''}
        <dl>${t.punkter.map(p => `<dt>${p[0]}</dt><dd>${p[1]}</dd>`).join('')}</dl>
      </div>`;
    const hode = d.querySelector('.tiphead');
    const veksle = () => {
      d.classList.toggle('open');
      const aapen = d.classList.contains('open');
      hode.setAttribute('aria-expanded', String(aapen));
      if (aapen) tipsAapne.add(i); else tipsAapne.delete(i);
    };
    hode.onclick = veksle;
    hode.onkeydown = e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); veksle(); }
    };
    c.appendChild(d);
  });
  if (!c.children.length) c.innerHTML = '<div class="card"><p class="small">Ingen treff.</p></div>';
}

/* ============================================================
   VISNING: LOGG
   ============================================================ */
function tegnLogg() {
  const { r, g, torr } = beregn();
  $('#lgAuto').innerHTML = `Lagres automatisk med: <b>${fmt(g.dose, 2)}</b> gjæringsdose · ${fmt(S.hydrering, 1)} % hydrering (effektiv ${fmt(r.effektivHydrering * 100, 1)} %) · ${fmt(torr, 3)} % tørrgjær · ${fmt(S.startTemp, 1)} °C deigtemp · ${fmt(g.ekvTimer, 1)} ekv. timer · ${fmt(r.grovAndel * 100, 0)} % grovt.`;
  if (!$('#lgDato').value) $('#lgDato').value = new Date().toISOString().slice(0, 10);

  const c = $('#loggListe'); c.innerHTML = '';
  if (!S.logg.length) { c.innerHTML = '<p class="small">Ingen bak logget ennå. Endre én variabel per bak og skriv ned deigtemperatur, heveprosent og total tid — det er den enkeltvanen som skiller en god gjærbaker fra en fantastisk.</p>'; return; }
  S.logg.slice().reverse().forEach((l, ri) => {
    const i = S.logg.length - 1 - ri;
    const d = el('div', 'logg');
    const kls = l.karakter >= 8 ? 'g' : l.karakter >= 6 ? 'y' : 'r';
    d.innerHTML = `
      <div class="lh"><span class="lt">${l.navn || 'Uten navn'} <span class="pill ${kls}">${l.karakter}/10</span></span><span class="ld">${l.dato}</span></div>
      <div class="lm">
        <span>Dose <b>${fmt(l.dose, 2)}</b></span>
        <span>Hydr. <b>${fmt(l.hydrering, 1)} %</b></span>
        <span>Gjær <b>${fmt(l.torr, 3)} %</b> tørr</span>
        <span>Deigtemp <b>${fmt(l.startTemp, 1)} °C</b></span>
        <span>Grovt <b>${fmt(l.grov, 0)} %</b></span>
        <span>Ekv. <b>${fmt(l.ekvTimer, 1)} t</b></span>
      </div>
      ${l.komm ? `<div class="lk">${l.komm}</div>` : ''}
      ${l.endring ? `<div class="lk" style="color:var(--gull2)">→ ${l.endring}</div>` : ''}
      <div style="margin-top:8px;display:flex;gap:6px">
        <button class="btn ghost sm" data-bruk="${i}">Bruk dosen som mål</button>
        <button class="btn danger sm" data-slett="${i}">Slett</button>
      </div>`;
    c.appendChild(d);
  });
  c.querySelectorAll('[data-slett]').forEach(b => b.onclick = () => { S.logg.splice(+b.dataset.slett, 1); lagre(); tegnLogg(); });
  c.querySelectorAll('[data-bruk]').forEach(b => b.onclick = () => {
    S.maalDose = S.logg[+b.dataset.bruk].dose; S.refDose = S.maalDose; lagre();
    vis('gjaering'); oppdater();
  });
}

/* ============================================================
   NAVIGASJON OG BINDING
   ============================================================ */
/* Legger − og + rundt alle talIfelt. Steglengden hentes fra feltets step-attributt,
   så temperaturfelt går i 0,5 °C og gramfelt i hele enheter. */
/* Hold-inne-tilstanden ligger utenfor knappens closure og ryddes fra document:
   første tikk re-renderer listene, knappen byttes ut i DOM-en midt i holdet,
   og pointerup på den gamle knappen fyrer da aldri. Bare én stepper kan
   holdes om gangen, så ett par timer-id-er holder. */
let stepperForsinkelse = null, stepperIntervall = null;
function stoppStepper() {
  clearTimeout(stepperForsinkelse); clearInterval(stepperIntervall);
  stepperForsinkelse = stepperIntervall = null;
}
document.addEventListener('pointerup', stoppStepper);
document.addEventListener('pointercancel', stoppStepper);
// Slippes museknappen utenfor vinduet, fyrer verken pointerup eller
// pointercancel — blur og pointerleave på dokumentet fanger de tilfellene.
document.addEventListener('pointerleave', stoppStepper);
window.addEventListener('blur', stoppStepper);

function leggTilSteppere() {
  $$('input[type=number]').forEach(inp => {
    if (inp.dataset.stepper || inp.readOnly) return;
    inp.dataset.stepper = '1';
    const steg = parseFloat(inp.step) || 1;
    const dec = (String(steg).split('.')[1] || '').length;
    const wrap = el('div', 'step');
    inp.parentNode.insertBefore(wrap, inp);

    const knapp = (tegn, kls, retning) => {
      const b = el('button', kls, tegn);
      b.type = 'button';
      b.tabIndex = -1;
      b.setAttribute('aria-label', retning > 0 ? 'Øk' : 'Reduser');
      const juster = () => {
        const min = inp.min === '' ? -Infinity : parseFloat(inp.min);
        const max = inp.max === '' ? Infinity : parseFloat(inp.max);
        const ny = Math.min(max, Math.max(min, (parseFloat(inp.value) || 0) + retning * steg));
        inp.value = dec ? ny.toFixed(dec) : String(Math.round(ny));
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      };
      b.onclick = juster;
      // Hold inne for å gjenta — se stoppStepper over for hvorfor tilstanden er global
      b.onpointerdown = () => {
        stoppStepper();
        stepperForsinkelse = setTimeout(() => { stepperIntervall = setInterval(juster, 90); }, 450);
      };
      b.onpointerleave = stoppStepper;
      return b;
    };

    wrap.appendChild(knapp('−', 'minus', -1));
    wrap.appendChild(inp);
    if (inp.dataset.enhet) wrap.appendChild(el('span', 'enhet', inp.dataset.enhet));
    wrap.appendChild(knapp('+', 'pluss', 1));
  });
}

/* ============================================================
   KONSEKVENSLAGET
   Hvert felt får en ⓘ som forteller hva som er anbefalt, og hva som skjer
   hvis du skrur opp eller ned. Innholdet ligger i PARAM_INFO i data.js, så
   det er én kilde og ikke tekst strødd rundt i grensesnittet.
   ============================================================ */
const infoAapne = new Set();

/* Noen felter deler samme forklaring — eltetid finnes to steder, og
   «ønsket deigtemp» er samme størrelse som deigtemp i Gjæring. */
const INFO_ALIAS = {
  dtMin: 'eltetid', kalMin: 'eltetid', planElt: 'eltetid',
  dtOnsket: 'startTemp',
  antall: null, vektPerBrod: null
};

function festInfo() {
  $$('.field').forEach(felt => {
    if (felt.dataset.info) return;
    const inp = felt.querySelector('input,select,textarea');
    if (!inp || !inp.id) return;
    const nokkel = INFO_ALIAS[inp.id] !== undefined ? INFO_ALIAS[inp.id] : inp.id;
    const info = nokkel && PARAM_INFO[nokkel];
    if (!info) return;
    felt.dataset.info = nokkel;

    const lab = felt.querySelector('label');
    if (!lab) return;
    const knapp = el('button', 'infoknapp', 'ⓘ');
    knapp.type = 'button';
    knapp.title = 'Hva skjer om jeg endrer dette?';
    knapp.setAttribute('aria-label', 'Forklaring: ' + info.navn);
    lab.appendChild(knapp);

    const boks = el('div', 'infoboks');
    boks.innerHTML = `
      <div class="ib-opt"><b>Anbefalt:</b> ${typeof info.opt === 'function' ? info.opt(S) : info.opt}</div>
      <div class="ib-rad"><span class="ib-pil opp">▲ Mer</span><span>${info.opp}</span></div>
      <div class="ib-rad"><span class="ib-pil ned">▼ Mindre</span><span>${info.ned}</span></div>
      ${info.hvorfor ? `<div class="ib-hvorfor"><b>Hvorfor:</b> ${info.hvorfor}</div>` : ''}`;
    felt.appendChild(boks);

    if (infoAapne.has(nokkel)) felt.classList.add('info-open');
    knapp.onclick = e => {
      e.preventDefault(); e.stopPropagation();
      const paa = felt.classList.toggle('info-open');
      if (paa) infoAapne.add(nokkel); else infoAapne.delete(nokkel);
    };
  });
}

/* Hvor man var i hver fane huskes. Å bli kastet til toppen hver gang man bytter
   er en del av «mister oversikten» — særlig i «Gjæring & tid», som er 5 000 px. */
const scrollMinne = {};
let sisteVis = 'start';

function vis(v) {
  scrollMinne[sisteVis] = window.scrollY;
  sisteVis = v;
  const g = gruppeFor(v);
  gruppeSist[g.id] = v;
  $$('.view').forEach(x => x.classList.toggle('on', x.id === 'v-' + v));
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.g === g.id));
  tegnUndernav(v);
  tegnRutefot(v);
  // Styrer om kontekstpanelet vises (skjult på «Bak nå», der trinnkortet er konteksten).
  document.body.dataset.v = v;
  window.scrollTo(0, scrollMinne[v] || 0);
}

/* Mel-, frø- og heveplanradene bygges opp fra bunnen ved hver eneste
   oppdatering, og oppdatering skjer på hvert tastetrykk. Feltet du skriver i blir
   altså kastet og laget på nytt mellom to tegn — du rakk å skrive «7» av «72» før
   markøren forsvant. Løsningen er at hvert dynamisk felt har en stabil nøkkel
   (data-k), slik at vi kan finne igjen det samme feltet etterpå og legge markøren
   tilbake der den stod. */
function fokusNokkel() {
  const a = document.activeElement;
  if (!a || !a.dataset || !a.dataset.k) return null;
  let sel = null;
  try { sel = a.selectionStart === null ? null : [a.selectionStart, a.selectionEnd]; } catch (e) {}
  return { k: a.dataset.k, sel };
}

function gjenopprettFokus(f) {
  if (!f) return;
  const e = document.querySelector(`[data-k="${f.k}"]`);
  if (!e || e === document.activeElement) return;
  e.focus();
  if (f.sel) { try { e.setSelectionRange(f.sel[0], f.sel[1]); } catch (err) {} }
}

/* Visningene tegnes etter hverandre, og +/−-knappene legges på til slutt.
   Tidligere var bare tegnBygg pakket inn i try/catch — kastet en av de andre,
   stoppet hele resten av kjeden, inkludert leggTilSteppere(). Symptomet var at
   pluss og minus «sluttet å virke», mens den egentlige feilen lå et helt annet
   sted og bare havnet i konsollen. Nå isoleres hvert steg, steppere legges alltid
   på, og feil vises i grensesnittet i stedet for å forsvinne i stillhet. */
const tegnFeil = new Map();

function oppdater() {
  const f = fokusNokkel();
  try { lagre(); } catch (e) {}

  const trygg = (navn, fn) => {
    try { fn(); tegnFeil.delete(navn); }
    catch (e) { tegnFeil.set(navn, e.message); console.error(navn + ':', e); }
  };

  // Deigmassen settes inne i beregn(). Kjørte vi syncFelt først, viste det
  // readonly-feltet «Deigmasse (kg) — fra oppskriften» massen fra FORRIGE
  // tilstand — 1,60 kg mens oppskriften var 6,40. Massen styrer nedkjølingstiden
  // i kjøleskapet, så et tall som ligger én tegning bak er ikke kosmetikk.
  trygg('Masse', beregn);
  trygg('Felter', syncFelt);
  trygg('Start', tegnStart);
  trygg('Bygg brød', tegnBygg);
  trygg('Oppskrift', tegnOppskrift);
  trygg('Gjæring', tegnGjaering);
  trygg('Deigtemp', tegnDeigtemp);
  trygg('Tidsplan', tegnPlan);
  trygg('Steking', tegnSteking);
  trygg('Bak nå', tegnBakNaa);
  trygg('Bakelogg', tegnLogg);
  trygg('Mel & korn', tegnMelbibliotek);
  trygg('Kontekst', tegnKontekst);
  trygg('Steppere', leggTilSteppere);
  trygg('Infobokser', festInfo);

  visFeilbanner();
  gjenopprettFokus(f);
}

/* En stille feil er verre enn en synlig. Uten dette banneret ser man bare at
   noe «ikke virker», uten å vite hva eller hvor. */
function visFeilbanner() {
  let b = $('#feilbanner');
  if (!tegnFeil.size) { if (b) b.remove(); return; }
  if (!b) {
    b = el('div', 'feilbanner'); b.id = 'feilbanner';
    document.body.appendChild(b);
  }
  b.innerHTML = `<b>Noe klikket i beregningen.</b> Resten av appen virker som normalt.
    <div class="small" style="margin-top:4px">${[...tegnFeil].map(([k, v]) => `${k}: ${v}`).join('<br>')}</div>`;
}

function syncFelt() {
  const set = (id, v) => { const e = $(id); if (e && document.activeElement !== e) e.value = v; };
  set('#antall', S.antall); set('#vektPerBrod', S.vektPerBrod); set('#hydrering', S.hydrering);
  set('#saltPct', S.saltPct); set('#honningPct', S.honningPct); set('#oljePct', S.oljePct);
  set('#sukkerPct', S.sukkerPct); set('#smorPct', S.smorPct); set('#maltPct', S.maltPct);
  set('#gjaerPct', S.gjaerPct); set('#startTemp', S.startTemp); set('#masseKg', fmt(S.masseKg, 2).replace(',', '.'));
  set('#ffPctMel', S.forferment.pctMel); set('#ffHydrering', S.forferment.hydrering);
  set('#ffTimer', S.forferment.timer); set('#ffTemp', S.forferment.temp);
  $('#gjaerType').value = S.gjaerType; $('#ffType').value = S.forferment.type;
  $('#ffBruk').checked = S.forferment.bruk;
  $('#lokk').checked = S.lokk; $('#fulltKjol').checked = S.fulltKjol;
  // «Lokk» gjelder bare trinn der deigen står samlet. Er alle kjøletrinn utbakt,
  // har valget ingen effekt — da skal det se avslått ut, ikke ødelagt.
  const harSamletKjol = S.plan.some(t => t.miljo <= 12 && !t.utbakt);
  const lokkFelt = $('#lokk').closest('.field');
  $('#lokk').disabled = !harSamletKjol;
  if (lokkFelt) {
    lokkFelt.style.opacity = harSamletKjol ? '1' : '.45';
    lokkFelt.title = harSamletKjol ? '' : 'Uten effekt: deigen er bakt ut i emner, og da står den i hevekurv, ikke i lokkboks.';
  }
  $('#froVannPaaToppen').checked = !!S.froVannPaaToppen;
  // Ferdigtidspunkt: settes én gang til i morgen 17:00, deretter er det brukerens.
  if (!S.planFerdig) S.planFerdig = tilFeltVerdi(ferdigTid());
  set('#planFerdig', S.planFerdig); set('#bakFerdig', S.planFerdig);
  set('#planUtbak', S.planUtbak); set('#planElt', S.planElt);
  set('#dtOnsket', S.startTemp); set('#dtMelTemp', S.dtMelTemp); set('#dtSpring', S.dtSpring);
  set('#dtFfTemp', S.dtFfTemp); set('#dtEgen', S.dtEgen); set('#dtMin', S.eltMin);
  if (document.activeElement !== $('#dtMikser')) $('#dtMikser').value = S.dtMikser;
  if (document.activeElement !== $('#vektTrinn')) $('#vektTrinn').value = String(S.vektTrinn);
  // Knappen vises bare når du faktisk har flyttet deg fra det maskinen tilsier.
  const eb = $('#eltAnbefalt');
  if (eb) {
    const anb = anbefaltEltMin();
    const avvik = Math.abs(S.eltMin - anb) >= 1;
    eb.style.display = avvik ? '' : 'none';
    eb.textContent = `↺ Sett til anbefalt (${anb} min)`;
  }
  $('#preset').value = S.presetId;
  const p = PRESETS.find(x => x.id === S.presetId);
  $('#presetNotat').innerHTML = p ? `${p.beskrivelse}<br><span style="color:var(--txt2)">${p.notat}</span>` : '';
}

function init() {
  const ferskt = !localStorage.getItem(LAGER);
  last();
  if (!S.melListe.length) brukPreset(S.presetId);
  // Uten lagret tilstand ble brødtypen aldri tatt i bruk: startsiden sa
  // «Grovt brød» mens oppskriften under var forvalget brod_standard — 4 × 900 g
  // og 35 % grovt mot Bygg brøds 2 × 900 g og 10 %. Brukeren hadde altså to
  // ulike brød i appen før han hadde rørt noe som helst.
  if (ferskt) velgBrotype(S.brotype);

  // Preset-velger
  const ps = $('#preset');
  PRESETS.forEach(p => { const o = el('option', null, p.navn); o.value = p.id; ps.appendChild(o); });
  ps.onchange = () => {
    brukPreset(ps.value);
    // Brødtypen på startsiden må følge med, ellers kan Start si «ciabatta» mens
    // oppskriften under er en focaccia. Har forvalget ingen egen brødtype,
    // hører det til et frittstående brød.
    const t = BROTYPER.find(x => x.preset === ps.value);
    S.brotype = t ? t.id : 'grovbrod';
    oppdater();
  };

  byggNav();

  // paa() i stedet for $('#x').onclick = … : mangler elementet — for eksempel fordi
  // nettleseren serverer en bufret index.html — skal init() gå videre, ikke stoppe
  // midt i og la halve appen stå ubundet.
  const paa = (id, hendelse, fn) => { const e = $(id); if (e) e[hendelse] = fn; };

  // Tallfelt
  const bind = (id, key, fn) => {
    const e = $(id); if (!e) return;
    e.oninput = () => { (fn || (v => S[key] = v))(e.type === 'number' ? (+e.value || 0) : e.value); oppdater(); };
    if (e.tagName === 'SELECT' || e.type === 'checkbox') e.onchange = e.oninput;
  };
  // Antall og vekt fantes i to uavhengige par som bare synket bygg → hoved.
  // Endret man til 6 × 400 g i Oppskrift, stod «Bygg brød» igjen med 2 × 800 g
  // og en sumlinje på 1 600 g mot oppskriftens 2 400. Nå går det begge veier.
  bind('#antall', null, v => { S.antall = v; S.byggAntall = v; });
  bind('#vektPerBrod', null, v => { S.vektPerBrod = v; S.byggVekt = v; });
  bind('#hydrering', 'hydrering');
  bind('#saltPct', 'saltPct'); bind('#honningPct', 'honningPct'); bind('#oljePct', 'oljePct');
  bind('#sukkerPct', 'sukkerPct'); bind('#smorPct', 'smorPct'); bind('#maltPct', 'maltPct');
  bind('#gjaerPct', 'gjaerPct'); bind('#startTemp', 'startTemp');
  bind('#gjaerType', null, v => S.gjaerType = v);
  bind('#lokk', null, () => S.lokk = $('#lokk').checked);
  bind('#fulltKjol', null, () => S.fulltKjol = $('#fulltKjol').checked);
  bind('#ffBruk', null, () => S.forferment.bruk = $('#ffBruk').checked);
  bind('#froVannPaaToppen', null, () => S.froVannPaaToppen = $('#froVannPaaToppen').checked);
  bind('#ffType', null, v => {
    S.forferment.type = v;
    if (v === 'biga') { S.forferment.hydrering = 45; S.forferment.timer = 18; S.forferment.temp = 18; }
    if (v === 'poolish') { S.forferment.hydrering = 100; S.forferment.timer = 14; S.forferment.temp = 22; }
    if (v === 'pate') { S.forferment.hydrering = 65; S.forferment.timer = 4; S.forferment.temp = 21; }
  });
  bind('#ffPctMel', null, v => S.forferment.pctMel = v);
  bind('#ffHydrering', null, v => S.forferment.hydrering = v);
  bind('#ffTimer', null, v => S.forferment.timer = v);
  bind('#ffTemp', null, v => S.forferment.temp = v);
  bind('#maalDose', null, v => S.maalDose = v);
  paa('#vektTrinn', 'onchange', () => { S.vektTrinn = +$('#vektTrinn').value || 0.01; oppdater(); });
  paa('#eltAnbefalt', 'onclick', () => { S.eltMin = anbefaltEltMin(); oppdater(); });

  // Bygg-visningen
  ['#byggUtstyr', '#byggAntall', '#byggVekt'].forEach(id => {
    const e = $(id); if (!e) return;
    const key = { '#byggUtstyr': 'byggUtstyr', '#byggAntall': 'byggAntall', '#byggVekt': 'byggVekt' }[id];
    e.oninput = e.onchange = () => { S[key] = e.type === 'number' ? (+e.value || 1) : e.value; byggEndret(); };
  });
  // Selve committen ligger i brukByggOppskrift(), fordi startsiden må gjøre
  // nøyaktig det samme når du velger en bygg-type der.
  // Endringene gjelder nå fortløpende, så denne knappen er ren navigasjon.
  $('#byggBruk').onclick = () => { vis('baknaa'); };

  $('#addMel').onclick = () => { S.melListe.push({ id: 'regal_standard', pct: 10 }); oppdater(); };
  $('#addFro').onclick = () => { S.froListe.push({ id: 'solsikke', gram: 100, varmt: false }); oppdater(); };
  $('#addTrinn').onclick = () => { S.plan.push({ navn: 'Nytt trinn', timer: 1, miljo: 24 }); oppdater(); };
  // For brødtyper med rute 'bygg' er S.presetId en intern kobling brukeren aldri
  // har sett. Å tilbakestille til «forvalgets plan» hentet da et helt annet døgn
  // enn det han bygget — 3,5 timer lengre, og dosen falt fra 1,82 til 1,65 —
  // mens «Bygg brød» fortsatt viste den gamle planen. Nå tilbakestilles bygg-brød
  // til sin egen plan, og forvalgsvarianten gjelder bare der et forvalg er valgt.
  $('#resetPlan').onclick = () => {
    if (aktivBrotype().rute === 'bygg') brukByggOppskrift();
    else {
      const p = PRESETS.find(x => x.id === S.presetId);
      if (p) { S.plan = p.refPlan.map(t => ({ ...t })); S.startTemp = p.refPlan[0].temp ?? 24; }
    }
    oppdater();
  };
  $('#setRefDose').onclick = () => {
    S.refDose = aktivBrotype().rute === 'bygg' ? byggOppskrift().g.dose : refDoseFor(S.presetId);
    S.maalDose = S.refDose;
    oppdater();
  };

  // Deigtemp-felt. Eltetid, meltemp og maskin påvirker vanntemperaturen som vises
  // i Bak nå, så de utløser full oppdatering — ikke bare denne fanen.
  [['#dtMelTemp', 'dtMelTemp'], ['#dtSpring', 'dtSpring'], ['#dtFfTemp', 'dtFfTemp'],
   ['#dtEgen', 'dtEgen'], ['#dtMin', 'eltMin']].forEach(([id, key]) => {
    const e = $(id); if (!e) return;
    e.oninput = e.onchange = () => { S[key] = +e.value || 0; oppdater(); };
  });
  // «Ønsket deigtemp» og «Deigtemp ut av maskin» er samme størrelse — ett felt i to faner.
  $('#dtOnsket').oninput = $('#dtOnsket').onchange = () => { S.startTemp = +$('#dtOnsket').value || 24; oppdater(); };
  $('#dtMikser').onchange = () => { S.dtMikser = $('#dtMikser').value; oppdater(); };
  ['#kalVann', '#kalMel', '#kalUt', '#kalMin'].forEach(id => {
    const e = $(id); if (!e) return;
    e.oninput = e.onchange = tegnDeigtemp;
  });

  // Ferdigtidspunkt, utbaking og elting bor i tilstanden, ikke i DOM-en, slik at
  // Tidsplan, Bak nå og klokkeslettene i gjæringsgrafen alltid viser det samme.
  const settFerdig = v => { S.planFerdig = v || null; lagre(); tegnPlan(); tegnBakNaa(); tegnGjaering(); };
  ['#planFerdig', '#bakFerdig'].forEach(id => {
    const e = $(id); if (!e) return;
    e.oninput = e.onchange = () => settFerdig(e.value);
  });
  [['#planUtbak', 'planUtbak'], ['#planElt', 'planElt']].forEach(([id, key]) => {
    const e = $(id); if (!e) return;
    e.oninput = e.onchange = () => { S[key] = +e.value || 0; lagre(); tegnPlan(); tegnBakNaa(); };
  });
  // Velger brukeren stekeprofil selv, er det et bevisst overstyringsvalg som skal
  // overleve senere justeringer — startsiden ber uttrykkelig om det når et
  // avlangt emne kanskje ikke passer under gryta.
  paa('#bakProfil', 'onchange', () => {
    S.stekeProfil = $('#bakProfil').value; S.stekeProfilManuell = true; lagre(); oppdater();
  });
  // Bekreftelse fordi knappen sletter fremdriften i et pågående bak — den ligger
  // øverst i fanen, midt i klikksonen for melete fingre, og det finnes ingen angre.
  paa('#bakNullstill', 'onclick', () => {
    const antallHuket = Object.keys(S.bakHuket).length;
    if (antallHuket && !confirm(`Nullstille avhukingen? ${antallHuket} avhukede steg slettes — dette kan ikke angres.`)) return;
    S.bakHuket = {}; lagre(); tegnBakNaa();
  });

  // Start-tid som alternativt ankerpunkt. Hele kjeden regnes fortsatt bakover fra
  // ferdigtidspunktet; å sette starten forskyver bare hele planen i tid.
  paa('#bakStart', 'onchange', () => { if ($('#bakStart').value) settStartTid(new Date($('#bakStart').value)); });
  paa('#bakStart', 'oninput', () => { if ($('#bakStart').value) settStartTid(new Date($('#bakStart').value)); });
  paa('#bakStartNaa', 'onclick', () => settStartTid(new Date()));

  // Ett minutts takt er nok: «nå»-kortet teller ned i minutter, ikke sekunder.
  setInterval(() => { if ($('#v-baknaa').classList.contains('on')) tegnBakNaa(); }, 60000);

  ['#melSok', '#melGruppe', '#melBidrag', '#melBareFav'].forEach(id =>
    paa(id, id === '#melSok' ? 'oninput' : 'onchange', tegnMelbibliotek));

  paa('#ordSok', 'oninput', tegnOrdliste);
  tegnOrdliste();

  $('#tipsSok').oninput = tegnTeknikk;
  $('#tipsAlle').onclick = () => {
    const alle = tipsAapne.size >= TIPS.length;
    tipsAapne = alle ? new Set() : new Set(TIPS.map((_, i) => i));
    $('#tipsAlle').textContent = alle ? 'Åpne alle' : 'Lukk alle';
    tegnTeknikk();
  };

  $('#lgLagre').onclick = () => {
    const { r, g, torr } = beregn();
    S.logg.push({
      navn: $('#lgNavn').value, dato: $('#lgDato').value || new Date().toISOString().slice(0, 10),
      karakter: +$('#lgKar').value || 7, komm: $('#lgKomm').value, endring: $('#lgEndring').value,
      dose: g.dose, ekvTimer: g.ekvTimer, hydrering: S.hydrering, effHydrering: r.effektivHydrering * 100,
      torr, startTemp: S.startTemp, grov: r.grovAndel * 100, preset: S.presetId
    });
    $('#lgNavn').value = ''; $('#lgKomm').value = ''; $('#lgEndring').value = '';
    lagre(); tegnLogg();
  };
  $('#lgKalibrer').onclick = () => {
    const { g } = beregn();
    S.maalDose = g.dose; S.refDose = g.dose; lagre();
    alert(`Måldose satt til ${fmt(g.dose, 2)}.\n\nAlle framtidige planer kalibreres nå mot dette baket. Endrer du temperatur, tid eller gjærmengde, viser appen hva som må justeres for å treffe samme gjæringsgrad.`);
    vis('gjaering'); oppdater();
  };

  paa('#kxTilKurve', 'onclick', () => {
    vis('gjaering');
    const el2 = $('#tempChart');
    if (el2) el2.scrollIntoView({ block: 'center' });
  });
  // Panelet er en bunnskuff under 1000 px og en fast sidespalte over.
  // Må settes BEGGE veier: satte vi bare open=false, ble panelet liggende lukket
  // for alltid hos den som hadde åpnet appen i et smalt vindu én gang.
  const kx = $('#kontekst');
  if (kx) {
    const mq = window.matchMedia('(max-width:1000px)');
    const still = () => { kx.open = !mq.matches; };
    still();
    mq.addEventListener ? mq.addEventListener('change', still) : mq.addListener(still);
  }
  vis('start');

  tegnTeknikk();
  oppdater();
}

document.addEventListener('DOMContentLoaded', init);
