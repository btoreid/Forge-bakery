/* ============================================================
   FORGE BAKERY — MOBIL V2 · render
   All utregning ligger i regn(state)/kjede(state,r) i engine.js.
   Denne fila gjør INGEN bakematematikk — den leser bare resultatet
   og tegner. Skjermrekkefølge: Brød → Deig → Tid → Prosess → Logg → Oppslag.
   ============================================================ */
(function () {
'use strict';

/* ---------- Tilstand ---------- */
const LAGER = 'forgebakery.v2';
const STANDARD = {
  skjerm: 'brodet',
  /* Førstegangsverdier: et enkelt brød uten tillegg.
     Sto på 40 % grovt med solsikke og linfrø — altså en ferdig oppfatning om hva
     brukeren skulle bake, servert som «standard». Nå starter appen nøytralt, og
     den som har bakt før får uansett sin egen siste tilstand tilbake gjennom
     synken (eller et lagret standardbrød). */
  brotype: 'grovbrod', grov: 0, hyd: 75, tid: 'lang',
  ff: false, ffType: 'poolish',
  tillegg: {},
  antall: 4, vekt: 800,
  startTemp: 24, melTemp: 21, maskin: 'spiralHjemme', eltMin: 13, romTemp: 22,
  stekeProfil: 'brod_kloke', stekeProfilManuell: false, lokk: true, fulltKjol: false,
  form: 'rund', utstyr: 'stal15', vektTrinn: 1, egenFriksjon: 0.4, pyrexIOvn: false,
  saltPct: null, ferdigMs: null, tidModus: 'ferdig',
  vinduStart: null,               // egendefinert vindu: når du kan sette deigen
  heveplan: null,                 // null = planens standard; array = redigert
  paramInfo: null, tilleggInfo: null, melInfo: null, meltallInfo: null,
  aktivSteg: 0, aktivStegId: null, regnskapAapen: false, byttBekreft: null,
  loggListe: [], lgNavn: '', lgKar: 8, lgBilder: [], lgBrod: [], oppdatert: 0,
  lgRediger: null, lgSlett: null, bildeVis: null,
  lgRegnskap: null,           // loggpost-id med historisk deigregnskap/hevekurve åpen
  // Gravsteiner: id-ene til slettede loggposter. Uten dem ville sammenfletningen
  // ved synk gjenopplivet hver post man har slettet på en annen enhet.
  loggSlettet: [],
  favoritter: [], oppslag: 'meny', oppslagSok: '',
  melOverstyr: null,          // brukerens egen melblanding; null = følg grovheten
  standardBrod: null,         // oppskriften appen åpner på når ingenting er påbegynt
  okDeig: false,              // kompenser tilleggenes plass ved å øke deigvekten
  brodInfo: null,             // hvilken brødtype som har ⓘ-utfellingen åpen
  melEndring: null,           // ventende gramendring på mel: {i, gram, fra}
  kompSporsmal: false,        // kompensasjonsmodalen er reist av en endring
  melVelger: false,           // meltype-velgeren er åpen
  ffTemp: null,               // forfermentens temperatur; null = planens forslag
  ffRomTemp: null,            // romtemp der forfermenten står/blandes; null = følg romTemp
  ffRomTid: null,             // timer i romtemp før kjøl (kald-start); null = motorens standard
  autolyseMin: 0,             // autolyse i minutter; 0 = av
  handlelisteOk: false,       // «dette må være i huset» er kvittert bort
  krukkeStart: null,          // startnivået du merker av i målekrukka (valgfritt)
  stegKvitt: {},              // per steg-id: {ing:{navn:true}, ok:ts, hoppet, notat, avvikOk}
  stegNotatRediger: null,     // steg-id med åpent kommentarfelt (visning, synkes ikke)
  timere: [],                 // aktive baketimere [{id, navn, slutt, stegId, ringt}]
  friksjonKalibrert: false,   // kalibreringsboksen er besvart eller avvist
  kalib: {},                  // {foer, etter, min} — målingene fra kalibreringen
  kurvMaal: {},               // brukerens kurvstørrelser i cm, per form-id
  kjolTemp: 3.5,              // kaldeste vann du får ut av kranen/kjøleskapet
  kjolskapTemp: 4,            // lufta i kjøleskapet — kaldhevingen skjer i den
  svalTemp: 16,               // det svale stedet (kjeller/bod) — mellom skap og rom
  ffTimer: null,              // egen modningstid på forfermenten; null = planens
  delteKalib: null,           // delte maskinmålinger hentet fra skyen
  kalibFor: null,             // hvilken maskin din egen måling gjelder
  kalibVekt: null,            // deigvekten målingen ble gjort på
  kalibDelt: null,            // kvittering etter deling (visning)
  kompVist: false             // kompensasjonspanelet er åpnet av en endring
};
/* Er oppskriften fortsatt akkurat som den kom fra fabrikken? Brukes til å avgjøre
   om standardbrødet kan legges på uten å overkjøre noe brukeren har begynt på.
   Sammenligner bare oppskriftsfeltene — skjerm, utstyr og logg er uvedkommende. */
const FABRIKK_FELT = ['brotype', 'grov', 'hyd', 'tid', 'ff', 'ffType', 'tillegg', 'antall',
  'vekt', 'saltPct', 'heveplan', 'melOverstyr', 'okDeig'];
function erFabrikkOppskrift(s) {
  return FABRIKK_FELT.every(k => JSON.stringify(s[k]) === JSON.stringify(STANDARD[k]));
}

let S = last();

function nyStandard() {
  const s = Object.assign({}, STANDARD);
  s.tillegg = Object.assign({}, STANDARD.tillegg);   // bryt delt referanse med STANDARD
  s.loggListe = []; s.favoritter = []; s.lgBilder = []; s.lgBrod = []; s.loggSlettet = [];
  return s;
}
function last() {
  let s = null;
  try {
    const raw = localStorage.getItem(LAGER);
    if (raw) s = Object.assign(nyStandard(), JSON.parse(raw));
  } catch (e) {}
  if (!s) s = nyStandard();
  // Normaliser typer så korrupt lagret tilstand ikke velter appen (teknisk #4/#10)
  if (!Array.isArray(s.loggListe)) s.loggListe = [];
  if (!Array.isArray(s.favoritter)) s.favoritter = [];
  if (!Array.isArray(s.lgBilder)) s.lgBilder = [];
  if (!Array.isArray(s.lgBrod)) s.lgBrod = [];
  s.lgBrod = s.lgBrod.filter(x => x && typeof x === 'object')
    .map(x => ({ metode: typeof x.metode === 'string' ? x.metode : '',
      kommentar: typeof x.kommentar === 'string' ? x.kommentar : '',
      bilder: Array.isArray(x.bilder) ? x.bilder.filter(b => typeof b === 'string') : [] }));
  if (!Array.isArray(s.loggSlettet)) s.loggSlettet = [];
  // Favorittene het før bare meltype-id-en. Nå kan også stekeutstyr og
  // stekeprofiler merkes, så id-ene er navnerom-prefikset for å unngå at to
  // lister med samme id kolliderer. Gamle, uprefiksede id-er er meltyper.
  s.favoritter = s.favoritter.filter(x => typeof x === 'string')
    .map(x => x.indexOf(':') > 0 ? x : 'mel:' + x);
  if (s.melOverstyr != null && !Array.isArray(s.melOverstyr)) s.melOverstyr = null;
  if (!s.stegKvitt || typeof s.stegKvitt !== 'object' || Array.isArray(s.stegKvitt)) s.stegKvitt = {};
  // Tidsplanen «kort» (Ettermiddag) er slått sammen med «dag» (Samme dag).
  // Uten denne linja ville lagret tilstand falt tilbake på første plan i lista.
  if (s.tid === 'kort') s.tid = 'dag';
  /* Standardbrødet legges på når oppskriften ennå er fabrikkinnstillingen —
     altså «dersom det ikke ligger noe annet der fra før av». Har man begynt på
     noe, skal appen ikke overkjøre det. */
  if (s.standardBrod && typeof s.standardBrod === 'object' && erFabrikkOppskrift(s)) {
    Object.keys(s.standardBrod).forEach(k => { s[k] = s.standardBrod[k]; });
  }
  // Hver loggpost trenger en stabil id, ellers ville rediger/slett pekt på
  // posisjon — og posisjon flytter seg når noe slettes eller når skyen synker
  // inn en annen liste. Eldre poster (lagret før id-en fantes) får en her.
  s.loggListe = s.loggListe.map((b, i) => (b && b.id) ? b : Object.assign({}, b, { id: 'b' + i + '-' + (b && b.dato ? b.dato : 'x') }));
  if (!s.tillegg || typeof s.tillegg !== 'object') s.tillegg = {};
  s.tillegg = Object.assign({}, s.tillegg);
  s.loggListe = s.loggListe.slice(); s.favoritter = s.favoritter.slice();
  // Heveplan-INNHOLD må valideres, ellers gir et trinn uten numerisk timer/miljo
  // NaN-dose og en tilsynelatende gyldig, men helt feil oppskrift (teknisk #5).
  if (s.heveplan != null) {
    if (!Array.isArray(s.heveplan)) s.heveplan = null;
    else {
      s.heveplan = s.heveplan.filter(t => t && isFinite(t.timer) && t.timer > 0 && isFinite(t.miljo)).map(t => ({ ...t }));
      if (!s.heveplan.length) s.heveplan = null;
    }
  }
  return s;
}
/* Rent VISNINGSTILstand — hvilken skjerm du står på, hvilke utfellinger som er
   åpne. Disse skal IKKE flytte `oppdatert`.

   Grunnen er at `oppdatert` avgjør hvem som vinner ved innlogging. Bumpet vi
   den på hver render, holdt det å bla til Logg-skjermen for å logge inn: da var
   den tomme lokale tilstanden «nyest», og den ble lastet opp over historikken i
   skyen. Tidsstempelet må svare på «når endret dataene seg sist», ikke «når rørte
   noen appen sist». */
const UI_FELT = ['skjerm', 'paramInfo', 'tilleggInfo', 'melInfo', 'meltallInfo', 'aktivSteg',
  'regnskapAapen', 'byttBekreft', 'lgRediger', 'lgSlett', 'bildeVis', 'lgRegnskap', 'oppslag', 'oppslagSok',
  'brodInfo', 'kompVist', 'melEndring', 'kompSporsmal', 'handlelisteOk', 'melVelger',
  'visMaskiner', 'aktivSteg', 'aktivStegId', 'krukkeStart', 'timere', 'stegNotatRediger',
  /* Delte maskinmålinger er HENTET, ikke skrevet. De hører hjemme i den delte
     tabellen, ikke i din rad — teller de som data, ville hver nedlasting sett ut
     som en endring og stemplet `oppdatert` på nytt. */
  'delteKalib', 'kalibDelt'];
function dataAvtrykk(s) {
  const kopi = {};
  Object.keys(s).forEach(k => { if (k !== 'oppdatert' && UI_FELT.indexOf(k) < 0) kopi[k] = s[k]; });
  try { return JSON.stringify(kopi); } catch (e) { return null; }
}
/* Grunnlinja settes fra tilstanden slik den ble LASTET, ikke fra null. Med null
   ville aller første lagring alltid talt som en endring — og det er nettopp den
   som skjer når man blar til Logg for å logge inn. */
let _sisteAvtrykk = dataAvtrykk(S);

/* ---------- Opplastingsporten ----------
   ÉN betingelse styrer om noe får gå opp i skyen, og den er streng med vilje.
   Databasereviewen fant fire varianter av samme feilform, og alle ender i at en
   dårligere tilstand skriver over en bedre:

     `_synkOk`      — vi har hentet ned og flettet mot skyen for DENNE kontoen.
                      Uten den kunne et mislykket nedlastingsforsøk (fryst
                      Supabase-prosjekt, halvdød wifi) etterfølges av en push
                      som la en uflettet logg over historikken.
     `_trygtAaSynke`— feilgrensa i render() har ikke nullstilt tilstanden. Et
                      nullstilt state som lastes opp er nøyaktig like ille som
                      de to hendelsene som allerede har skjedd i dag.

   I tillegg lastes det bare opp når DATAENE faktisk er endret. Før gikk en full
   opplasting ved hver navigasjon — som både kostet megabyte og flyttet skyens
   tidsstempel, slik at skyen systematisk så nyere ut enn den var. */
let _synkOk = false;
let _trygtAaSynke = true;
function kanSynke() {
  return typeof Sky !== 'undefined' && Sky.klar() && Sky.bruker() && _synkOk && _trygtAaSynke;
}
function lagre() {
  // Tidsstempel når DATAENE endrer seg: det er dette synken sammenligner når
  // samme konto brukes fra to enheter (nyeste vinner).
  const avtrykk = dataAvtrykk(S);
  const endret = (avtrykk === null || avtrykk !== _sisteAvtrykk);
  if (endret) {
    S.oppdatert = Date.now();
    _sisteAvtrykk = avtrykk;
  }
  try { localStorage.setItem(LAGER, JSON.stringify(S)); _lagringFull = false; }
  catch (e) {
    // Full kvote feilet før i stillhet: appen så ut til å lagre, og ved neste
    // omstart var dagens arbeid borte. Flagget rendres som banner i toppen.
    if (String(e && e.name) === 'QuotaExceededError') _lagringFull = true;
  }
  if (endret && kanSynke()) Sky.lagreOpp(S);
}
let _lagringFull = false;

/* ---------- DOM-hjelper ---------- */
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'style') e.setAttribute('style', v);
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'aria') { for (const a in v) e.setAttribute('aria-' + a, v[a]); }
    else e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    e.appendChild(typeof kid === 'object' ? kid : document.createTextNode(String(kid)));
  }
  return e;
}
const byId = id => document.getElementById(id);
/* Kommentarfelt vokser med innholdet i stedet for å scrolle inni seg selv —
   en lang kommentar skal LESES, ikke dras fram bit for bit (Bjørn 02.08).
   Kalles fra oninput på feltet og fra render() for alle .autovoks (høyden kan
   først måles når feltet står i DOM-en). +2 er rammen: scrollHeight måler
   innsiden, mens height med border-box teller kantene med. */
function voksFelt(el) {
  el.style.height = 'auto';
  el.style.height = (el.scrollHeight + 2) + 'px';
}

/* ---------- Favoritter ----------
   Brukerens egne merker, ikke appens. Tre navnerom deler én liste: `mel:`,
   `utstyr:` og `steking:`. Prefikset er der fordi id-ene ellers kunne kollidere
   mellom listene — og fordi en favoritt uten navnerom ikke sier hva den peker på. */
const favNokkel = (ns, id) => ns + ':' + id;
function erFavoritt(ns, id) { return (S.favoritter || []).indexOf(favNokkel(ns, id)) >= 0; }
function vekslFavoritt(ns, id) {
  const n = favNokkel(ns, id);
  S.favoritter = erFavoritt(ns, id) ? S.favoritter.filter(x => x !== n) : (S.favoritter || []).concat([n]);
  oppdater();
}
/* ★-knappen, lik overalt den brukes. */
function favKnapp(ns, id, navn) {
  const paa = erFavoritt(ns, id);
  return h('button', { class: 'info-knapp', style: paa ? 'color:var(--color-accent-500);border-color:var(--color-accent-300)' : '',
    'aria-label': (paa ? 'Fjern favoritt: ' : 'Merk som favoritt: ') + navn, onClick: () => vekslFavoritt(ns, id) }, paa ? '★' : '☆');
}

/* ---------- Formattering (motorens hjelpere er globale) ---------- */
const g0 = v => gram(v, 0);
/* Temperatur-tall UTEN enhet, med smarte desimaler: heltall står som «22», en
   halv grad som «3,5». Kjøleskapet kan settes i halvtrinn (0,5 °C), og da rundet
   «Kjøleskapet 4 °C»-knappen 3,5 opp til 4 mens miljø-feltet viste 3,5 — samme
   verdi, to ulike tall. Denne holder alle temp-etikettene på samme presisjon. */
const gradTxt = v => fmt(v, (isFinite(v) && v % 1) ? 1 : 0);
/* Vektoppløsning: rund til det vekta faktisk kan vise (hele gram / 0,1 / 0,01),
   med færre desimaler når mengden vokser — det andre sifferet er støy over 100 g. */
function vektDesimaler() { const t = S.vektTrinn || 0.01; return t >= 1 ? 0 : t >= 0.1 ? 1 : 2; }
function veiG(v) {
  const t = S.vektTrinn || 0.01;
  const tak = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return gram(Math.round(v / t) * t, Math.min(vektDesimaler(), tak));
}
/* Er mengden så liten at vekta ikke treffer den pålitelig (under 20× minste trinn)? */
function underVekt(v) { return v > 0 && v < 20 * (S.vektTrinn || 0.01); }

/* ============================================================
   RENDER
   ============================================================ */
/* Stegnummeret står INNE i overskriftslinja, ikke som en egen kicker over den.
   Tre grunner: «FORBEREDELSE» sa ingenting brukeren ikke allerede visste, Brød
   hadde ingen tittel og fikk derfor et helt annet toppfelt enn Deig og Tid, og
   to linjer øverst spiste plass på en skjerm der plass er alt.

   Prosess er det FJERDE steget, ikke en egen kategori — man går Brød → Deig →
   Tid → Prosess. Logg og Oppslag er oppslagsverk og har ingen plass i rekka. */
const SKJERMER = [
  { id: 'brodet',  navn: 'Brød',    steg: 1, tittel: 'Hva skal du bake?' },
  { id: 'deigen',  navn: 'Deig',    steg: 2, tittel: 'Mel, vann og frø' },
  { id: 'tid',     navn: 'Tid',     steg: 3, tittel: 'Når vil du ha brød?' },
  { id: 'prosess', navn: 'Prosess', steg: 4, tittel: 'Følg prosessen' },
  { id: 'logg',    navn: 'Logg',    tittel: 'Bakeloggen' },
  { id: 'oppslag', navn: 'Oppslag', tittel: 'Oppslag' }
];
const ANTALL_STEG = SKJERMER.filter(s => s.steg).length;
/* Brødtypene som designet viser dem — «Brød» er én type der grovheten settes i
   deigen (loff = grov 0), de tre andre er kalibrerte forvalg. */
const BTYPER = [
  { id: 'grovbrod', navn: 'Brød', undertittel: 'Fra loff til ekstra grovt — du setter grovheten i deigen', rute: 'bygg', antall: 4, vekt: 800,
    om: 'Ett frittstående brød der du styrer alt selv: grovhet, vann, frø og tidsplan. Grunnformen er alltid den samme — elt, bulkhev varmt, form emnet stramt, kaldhev i kurv, stek varmt med damp.' },
  { id: 'ciabatta', navn: 'Ciabatta', undertittel: 'Stiv biga, åpen krumme · kalibrert deig', rute: 'preset', antall: 8, vekt: 280,
    om: 'Italiensk, svært vått brød på sterkt mel. En stiv biga modnes over natta og gir styrke og smak; deigen bulkheves, kjøles i boks og DELES i biter i stedet for å formes — luftigheten er hele poenget. Stekes kort og varmt midt i ovnen.' },
  { id: 'baguette', navn: 'Baguetter', undertittel: 'Poolish og kort bulk · kalibrert deig', rute: 'preset', antall: 6, vekt: 330,
    om: 'Poolishen står over natta og gjør smaksjobben; selve bakedagen er kort. Kort bulk, forform til løse rektangler, trekk ut til lengder, og stek raskt og varmt med kraftig damp. Skal ikke langtidsheve.' },
  { id: 'focaccia', navn: 'Focaccia', undertittel: 'Hever i formen, olje i deigen · kalibrert deig', rute: 'preset', antall: 1, vekt: 1000,
    om: 'Samme deigfamilie som brødet, men den hever og kaldhever i formen med olje — ingen forming, ingen kurv. Grop med alle ti fingre når deigen er avslappet, hell over salamoia, og stek i formen uten damp.' }
];
/* Lucide-ikoner (stroke 2, rund) — ikke unicode-glyffer, som så billig ut. */
function ikonSvg(name) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  [['viewBox', '0 0 24 24'], ['width', '22'], ['height', '22'], ['fill', 'none'], ['stroke', 'currentColor'],
   ['stroke-width', '2'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round']].forEach(a => svg.setAttribute(a[0], a[1]));
  const P = d => { const e = document.createElementNS(NS, 'path'); e.setAttribute('d', d); svg.appendChild(e); };
  const C = (cx, cy, r) => { const e = document.createElementNS(NS, 'circle'); e.setAttribute('cx', cx); e.setAttribute('cy', cy); e.setAttribute('r', r); svg.appendChild(e); };
  ({
    brodet: () => { P('M4 13c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z'); P('M8.5 7.4 7.3 5.6'); P('M12 7V5'); P('M15.5 7.4 16.7 5.6'); },
    deigen: () => { P('M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z'); },
    tid: () => { C(12, 12, 9); P('M12 7v5l3 2'); },
    prosess: () => { P('M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z'); },
    logg: () => { P('M12 7v13'); P('M3 17a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z'); },
    oppslag: () => { C(11, 11, 7); P('m21 21-4.3-4.3'); }
  }[name] || (() => {}))();
  return svg;
}

/* Ordentlig info-ikon i samme strektegnede stil som resten av ikonene, i stedet
   for ﻿ⓘ-tegnet (U+24D8), som rendres ulikt på tvers av skrifter og så klumpete
   ut. «i» i en sirkel: prikk + strek. */
function infoIkon(px = 15) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  // Tynnere strek når ikonet ER hele knappen (stor variant) — 2,2 er avstemt
  // for liten inline-bruk og blir klumpete oppskalert.
  [['viewBox', '0 0 24 24'], ['width', px], ['height', px], ['fill', 'none'], ['stroke', 'currentColor'],
   ['stroke-width', px >= 20 ? '2' : '2.2'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['aria-hidden', 'true']].forEach(a => svg.setAttribute(a[0], a[1]));
  const P = d => { const e = document.createElementNS(NS, 'path'); e.setAttribute('d', d); svg.appendChild(e); };
  const e = document.createElementNS(NS, 'circle');
  e.setAttribute('cx', 12); e.setAttribute('cy', 12); e.setAttribute('r', 9.5); svg.appendChild(e);
  P('M12 16.5v-5');            // «i»-stammen
  P('M12 8h.01');             // prikken over
  return svg;
}

/* ---------- Brødtegninger ----------
   Erstatter nøkkeltall-badgen («40 % GROVT», «82 % VANN») på brødtypekortene.
   Et tall som endrer seg mens du blar er ikke et kjennetegn ved brødtypen —
   det er tilstanden din, og den står allerede i Deig. Formen er derimot det
   ene som faktisk skiller de fire fra hverandre.

   Tegnet i samme strek som ikonene ellers: stroke 1,6, rund, currentColor. */
function brodTegning(id) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  [['viewBox', '0 0 44 44'], ['width', '44'], ['height', '44'], ['fill', 'none'],
   ['stroke', 'currentColor'], ['stroke-width', '1.6'], ['stroke-linecap', 'round'],
   ['stroke-linejoin', 'round'], ['class', 'brodsvg'], ['aria-hidden', 'true']].forEach(a => svg.setAttribute(a[0], a[1]));
  const P = (d, kl) => { const e = document.createElementNS(NS, 'path'); e.setAttribute('d', d); if (kl) e.setAttribute('class', kl); svg.appendChild(e); };
  ({
    // Boule sett fra siden, med ett langt snitt på skrå — slik appen selv
    // beskriver snittet under Form og kurv.
    grovbrod: () => { P('M6 27c0-7.2 7.2-13 16-13s16 5.8 16 13a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z', 'fyll'); P('M15 24.5c3.5-4 10.5-4 14 0'); },
    // Flat, rektangulær, tydelig lavere — og prikkene som er den åpne krummen.
    ciabatta: () => { P('M5 20.5c0-2.5 3-4.5 8-5l14-1.2c6-.5 12 1.5 12 5.5s-5 7.2-11 7.7l-14 1.2c-5 .4-9-2-9-5.5z', 'fyll');
      P('M13 21.5h.01'); P('M19 24h.01'); P('M26 20h.01'); P('M31 23h.01'); },
    // Lang og smal, med de skrå snittene som er baguettens kjennetegn.
    baguette: () => { P('M4 27c0-3.3 2.4-6 5.4-6h25.2c3 0 5.4 2.7 5.4 6s-2.4 6-5.4 6H9.4C6.4 33 4 30.3 4 27z', 'fyll');
      P('M11 24.5 14 29'); P('M18 24.5 21 29'); P('M25 24.5 28 29'); P('M32 24.5 35 29'); },
    // Firkantet, i form, med fingergropene.
    focaccia: () => { P('M7 15h30a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3z', 'fyll');
      P('M12 20.5h.01'); P('M19 20.5h.01'); P('M26 20.5h.01'); P('M33 20.5h.01');
      P('M15 25.5h.01'); P('M22 25.5h.01'); P('M29 25.5h.01'); }
  }[id] || (() => {}))();
  return svg;
}

/* Korntegning fra KORN_SVG (via MEL_KORN). Klassene .f/.s/.s2 styles i CSS mot
   fargevariablene satt inline. */
function kornTegning(flourId) {
  const tom = h('span', { style: 'flex:0 0 0;width:0' });
  if (typeof MEL_KORN === 'undefined' || typeof KORN_SVG === 'undefined') return tom;
  const k = KORN_SVG[MEL_KORN[flourId]];
  if (!k) return tom;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 60'); svg.setAttribute('width', '26'); svg.setAttribute('height', '39');
  svg.setAttribute('class', 'kornsvg'); svg.setAttribute('style', 'flex:0 0 26px;--kf:' + k.farge + ';--kk:' + k.kant);
  svg.innerHTML = k.svg;
  return svg;
}

let _nullstillScroll = false;
let _rendrer = false;

/* SCROLL-ANKER: en re-render bygger hele skjermen på nytt, og trykker du f.eks.
   «Honning» dukker kompensasjonskortet opp ØVERST i tillegg-seksjonen samtidig
   som raden vokser. Med bare bevart `scrollTop` sklir raden du nettopp traff
   langt nedover — «masse spretter på skjermen». Løsningen: rett før tilstanden
   endres noterer vi det trykte elementets plass i vinduet (via `data-anker`), og
   etter re-render justeres scrollen så SAMME element ligger der fingeren var.
   Vi bruker performance.now() i stedet for Date.now() så det er trygt overalt. */
let _anker = null;   // { id, top, tid }
document.addEventListener('click', e => {
  const el = e.target && e.target.closest ? e.target.closest('[data-anker]') : null;
  if (el) _anker = { id: el.getAttribute('data-anker'), top: el.getBoundingClientRect().top, tid: performance.now() };
}, true);
function render() {
  // Re-entrans-vern: når replaceChildren fjerner et fokusert felt, fyrer
  // nettleseren en ekte blur MIDT i renderen — og feltets onblur ville startet
  // en ny render oppå den halvferdige (NotFoundError, og feilgrensa nullstilte
  // hele appen). Tilstanden er allerede oppdatert, så det nestede kallet kan
  // trygt hoppes over.
  if (_rendrer) return;
  _rendrer = true;
  try { renderInner(); }
  catch (e) {
    /* Feilgrense: en korrupt tilstand skal aldri gi en blank app (teknisk #4).
       MEN den skal heller ikke kaste bort data. Før slettet den localStorage og
       lot neste trykk laste den tomme tilstanden opp i skyen — samme utfall som
       de to datatapene i dag, bare med en render-exception som utløser.

       Nå: originalen tas vare på under en krasjnøkkel, og opplasting stenges til
       appen har flettet mot skyen igjen. */
    if (typeof console !== 'undefined') console.error('render feilet, nullstiller', e);
    try {
      const raa = localStorage.getItem(LAGER);
      if (raa) localStorage.setItem(LAGER + '.krasj', raa);
    } catch (e2) {}
    _trygtAaSynke = false;
    S = nyStandard();
    _sisteAvtrykk = dataAvtrykk(S);
    try { localStorage.setItem(LAGER, JSON.stringify(S)); } catch (e2) {}
    try { renderInner(); } catch (e3) { byId('innhold').textContent = 'Noe gikk galt — appen ble nullstilt.'; }
  }
  finally { _rendrer = false; }
}
/* ---------- Innloggingsport ----------
   Bjørns beslutning 31.07: «legg login først, sånn at alt skjer under innlogget
   konto database. Det gjør mindre forvirring og hindrer problematikk.»

   Det fjerner hele eierskapsspørsmålet: finnes det ingen utlogget bruk, finnes
   det heller ingen logg uten eier, ingen sammenblanding på delte enheter og
   ingen «hvem tilhører denne posten».

   Prisen er verdt å vite: appen kan ikke lenger brukes uten konto, og
   aller første gang kreves nett. Etter innlogging holder Supabase økten ved
   like (`persistSession`), så den fungerer offline som før.

   Porten hopper man over når sky ikke er konfigurert i det hele tatt — ellers
   ville appen vært ubrukelig fra `file://` og i testene. */
function skalKreveInnlogging() {
  /* Eneste vei forbi porten er en testkrok som INGEN produksjonskode setter —
     den finnes bare fordi regresjonen ellers ville måttet logge inn mot ekte
     Supabase for å teste noe som helst. Settes med Playwrights addInitScript. */
  if (window.__FB_TEST_INGEN_PORT) return false;
  return typeof Sky !== 'undefined' && Sky.klar() && !Sky.bruker();
}
/* Venter vi fortsatt på at den lagrede økten skal gjenopprettes?
   `getSession()` er asynkron. Uten dette blinket appen innom påloggingsskjermen
   ved hvert eneste åpne, også når man var innlogget hele tiden. */
function venterPaaSesjon() {
  if (window.__FB_TEST_INGEN_PORT) return false;
  return typeof Sky !== 'undefined' && Sky.klar() &&
         typeof Sky.sesjonSjekket === 'function' && !Sky.sesjonSjekket();
}
/* Nøytral splash mens økten sjekkes: merkevaren, ingen skjema.
   Den skal ikke si noe om innlogging i det hele tatt — brukeren vet ennå ikke
   om hen må logge inn, og appen vet det heller ikke. */
function tegnSplash() {
  return h('div', { class: 'port' },
    h('div', { class: 'port-logo' }, h('img', { src: 'icons/icon-512-v2.png', alt: 'Forge Bakery', width: 132, height: 132 })),
    h('h1', { class: 'port-tittel' }, 'Forge Bakery'),
    h('div', { class: 'port-under' }, 'Henter kontoen din …'));
}
function tegnPort() {
  const wrap = h('div', { class: 'port' });
  wrap.appendChild(h('div', { class: 'port-logo' }, h('img', { src: 'icons/icon-512-v2.png', alt: 'Forge Bakery', width: 132, height: 132 })));
  wrap.appendChild(h('h1', { class: 'port-tittel' }, 'Forge Bakery'));
  wrap.appendChild(h('div', { class: 'port-under' },
    'Logg inn for å bake. Bakeloggen, oppskriftene og bildene dine ligger på kontoen og følger deg til alle enhetene dine.'));
  const konto = tegnKonto();
  if (konto) wrap.appendChild(konto);
  wrap.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:14px;text-align:center' },
    'Første gang trenger du nett. Etterpå virker appen offline.'));
  return wrap;
}

function renderInner() {
  // Porten tegnes i stedet for appen, ikke oppå den: da finnes det ingen vei
  // rundt, og ingen halvferdig tilstand bak et overlegg.
  if (venterPaaSesjon() || skalKreveInnlogging()) {
    byId('topp').replaceChildren();
    byId('innhold').replaceChildren(venterPaaSesjon() ? tegnSplash() : tegnPort());
    byId('bunnlinje').replaceChildren();
    byId('bunnlinje').className = 'bunnlinje';
    byId('bunnmeny').replaceChildren();
    fjernBakteppe();
    const km = byId('kompmodal'); if (km) km.remove();
    return;
  }
  /* Kald forferment følger kjøleskapet — det er ÉN måling. `ffTemp` lagres som
     tall når man velger «I kjøleskapet», og uten denne synken regnet motoren
     videre på det gamle tallet etter at kjøleskapet ble justert på Tid, mens
     pillen viste det nye (teknisk review 01.08). */
  if (S.ffTemp != null && isFinite(S.ffTemp) && S.ffTemp <= KALDGRENSE_APP
      && S.kjolskapTemp != null && isFinite(S.kjolskapTemp) && S.ffTemp !== +S.kjolskapTemp) {
    S.ffTemp = +S.kjolskapTemp;
  }
  const r = regn(S);
  const K = kjede(S, r, S.ferdigMs != null ? S.ferdigMs : standardFerdig());
  const sk = SKJERMER.find(s => s.id === S.skjerm) || SKJERMER[0];

  const toppBarn = [h('h1', null,
    sk.steg ? h('span', { class: 'steg-tall' }, sk.steg + ' av ' + ANTALL_STEG) : null,
    sk.tittel)];
  /* Full lagring skal aldri feile i stillhet: banneret står til en lagring
     lykkes igjen (flagget nullstilles i lagre()). */
  if (_lagringFull) toppBarn.push(h('div', { class: 'varsel fare', style: 'margin-top:8px' },
    h('b', null, 'Lagringen er full. '),
    'Endringer lagres ikke lenger på denne enheten. Slett noen loggbilder, eller last ned en sikkerhetskopi (Logg → Sikkerhetskopi) og rydd — så virker lagringen igjen.'));
  // Aktiv timer bindes til topplinja, så den er synlig uansett hvilken skjerm
  // man står på — og alarmen kan skrus av herfra.
  const tt = tegnTopplinjeTimer();
  if (tt) toppBarn.push(tt);
  byId('topp').replaceChildren(...toppBarn);

  // Bevar scroll (teknisk #1) og fokus/markør (teknisk #2) over re-render.
  const innhold = byId('innhold');
  const scroll = _nullstillScroll ? 0 : innhold.scrollTop;
  const aktiv = document.activeElement;
  const fokusN = aktiv && aktiv.dataset ? aktiv.dataset.fokus : null;
  const caret = aktiv && aktiv.selectionStart != null ? aktiv.selectionStart : null;

  const tegner = { brodet: tegnBrodet, deigen: tegnDeigen, tid: tegnTid, prosess: tegnProsess, logg: tegnLogg, oppslag: tegnOppslag }[S.skjerm];
  innhold.replaceChildren(tegner(r, K));
  /* Synlig vei VIDERE på steg 1–3: steg-pillen sier «1 av 4», men uten denne
     knappen var bunnmenyen eneste hint om at fanene er en sekvens — en
     førstegangsbruker ble stående (ux-review 01.08). */
  const neste = { brodet: ['deigen', 'Deig'], deigen: ['tid', 'Tid'], tid: ['prosess', 'Prosess'] }[S.skjerm];
  if (neste) innhold.appendChild(h('button', {
    class: 'btn btn-primary btn-full', style: 'margin:14px 0 4px',
    onClick: () => bytt(neste[0]) }, 'Videre: ' + neste[1] + ' ›'));
  innhold.scrollTop = scroll;
  /* Hold det trykte elementet i ro: fant vi et anker rett før denne renderen,
     flytt scrollen så elementet havner tilbake der det var da man traff det.
     Da glir ikke raden vekk selv om et kort dukker opp over den. */
  if (!_nullstillScroll && _anker && performance.now() - _anker.tid < 700) {
    let na = null;
    try { na = innhold.querySelector('[data-anker="' + (window.CSS && CSS.escape ? CSS.escape(_anker.id) : _anker.id) + '"]'); } catch (e) {}
    if (na) innhold.scrollTop += na.getBoundingClientRect().top - _anker.top;
  }
  _anker = null;
  _nullstillScroll = false;

  if (fokusN) {
    const ny = innhold.querySelector('[data-fokus="' + fokusN + '"]');
    if (ny) { ny.focus(); if (caret != null) { try { ny.setSelectionRange(caret, caret); } catch (e) {} } }
  }

  tegnBunnlinje(r, K);
  tegnBildeVis();
  tegnLoggRegnskap();
  // Kommentarfeltene bygges med rows=1/2 og må måles ETTER at de står i
  // DOM-en — et felt som gjenskapes med lagret tekst skal åpne i full høyde.
  document.querySelectorAll('textarea.autovoks').forEach(voksFelt);
  // Kompensasjonen er ikke lenger en modal — den rendres inline i tillegg-
  // seksjonen. Rydd bort en eventuell gammel modal fra en tidligere versjon.
  { const gml = byId('kompmodal'); if (gml) gml.remove(); }

  byId('bunnmeny').replaceChildren(...SKJERMER.map(s =>
    h('button', { class: s.id === S.skjerm ? 'paa' : '', 'aria-current': s.id === S.skjerm ? 'page' : null, onClick: () => bytt(s.id) },
      h('span', { class: 'ikon', 'aria-hidden': 'true' }, ikonSvg(s.id)), s.navn)));
}

/* ---------- Tilbakeknappen ----------
   På Android lukket den appen, fordi appen aldri la noe i historikken: den er
   én side som bytter innhold. Nå skyves en tilstand per skjermbytte, og
   `popstate` tar deg ETT steg tilbake i appen i stedet for ut av den.

   Er en modal, en bildevisning eller regnskapet åpent, lukker tilbake DET
   først — det er den innerste tingen brukeren ser, og det er den man mener. */
let _hopperTilbake = false;
function bytt(id) {
  // Trykk på fanen man allerede står på skal ikke legge noe i historikken —
  // ellers må man trykke tilbake like mange ganger som man har bomtrykket.
  if (id === S.skjerm) return;
  _nullstillScroll = true;
  if (id === 'prosess') S.aktivSteg = 0;
  S.skjerm = id; lagre(); render();
  if (!_hopperTilbake) {
    try { history.pushState({ skjerm: id }, ''); } catch (e) {}
  }
}
window.addEventListener('popstate', e => {
  // Innerste lag først: overlegg lukkes før man forlater skjermen.
  if (S.bildeVis) { S.bildeVis = null; oppdater(); nyHistorikk(); return; }
  if (S.lgRegnskap) { S.lgRegnskap = null; oppdater(); nyHistorikk(); return; }
  if (S.kompSporsmal) { S.kompSporsmal = false; oppdater(); nyHistorikk(); return; }
  if (S.melEndring) { S.melEndring = null; oppdater(); nyHistorikk(); return; }
  if (S.regnskapAapen) { S.regnskapAapen = false; oppdater(); nyHistorikk(); return; }
  if (S.oppslag && S.oppslag !== 'meny' && S.skjerm === 'oppslag') { S.oppslag = 'meny'; oppdater(); nyHistorikk(); return; }
  const maal = (e.state && e.state.skjerm) || 'brodet';
  if (maal === S.skjerm) return;      // ingenting igjen i appen — la nettleseren gjøre sitt
  _hopperTilbake = true;
  bytt(maal);
  _hopperTilbake = false;
});
/* Et overlegg ble lukket i stedet for at vi forlot skjermen — legg tilbake en
   tilstand, ellers ville neste tilbaketrykk hoppet to hakk. */
function nyHistorikk() { try { history.pushState({ skjerm: S.skjerm }, ''); } catch (e) {} }
function oppdater() { lagre(); render(); }

function standardFerdig() {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(17, 0, 0, 0);
  return d.getTime();
}

/* EGENDEFINERT VINDU: du sier når du KAN starte og når det MÅ være ferdig, så
   fyller appen ut resten selv. Den strekker det fleksible leddet — kaldhevingen
   (eller siste trinn hvis ingen er kald) — til hele prosessen akkurat fyller
   vinduet, og gjærdosen løses automatisk mot den nye planen (mer tid = mindre
   gjær). Returnerer den tilpassede planen og om vinduet var for kort.
   Itererer fordi forvarm/stek overlapper litt — noen runder lander eksakt. */
function tilpassVindu(startMs, ferdigMs) {
  const maalT = (ferdigMs - startMs) / 3600000;
  const base = (Array.isArray(S.heveplan) && S.heveplan.length)
    ? S.heveplan
    : ((typeof TIDSPLANER !== 'undefined' && TIDSPLANER.find(t => t.id === S.tid)) || {}).plan || [];
  let trinn = base.map(t => ({ ...t }));
  if (!trinn.length) return { trinn: null, span: null, forKort: true };
  // Det fleksible leddet: kaldhevingen om den finnes, ellers siste trinn.
  let idx = trinn.findIndex(t => t.miljo <= 12);
  if (idx < 0) idx = trinn.length - 1;
  let span = maalT;
  for (let n = 0; n < 6; n++) {
    const st = Object.assign({}, S, { heveplan: trinn, ferdigMs });
    const K = kjede(st, regn(st), ferdigMs);
    span = (ferdigMs - K.start.getTime()) / 3600000;
    const diff = maalT - span;
    if (Math.abs(diff) < 0.05) break;
    /* Gulv 0,05, ikke 0: `last()` kaster trinn med timer <= 0 ved neste
       oppstart, så et 0-timers trinn (med utbakt-flagget sitt!) forsvant
       stille etter reload og ga en ANNEN plan enn den brukeren så (teknisk
       review 01.08). 0,05 t overlever lasting og leses som «i praksis null». */
    trinn[idx] = Object.assign({}, trinn[idx], { timer: Math.max(0.05, Math.round((trinn[idx].timer + diff) * 4) / 4) });
  }
  // Etter klemming til 0: sjekk hva vinduet FAKTISK ble (for kort → span > mål).
  const st = Object.assign({}, S, { heveplan: trinn, ferdigMs });
  span = (ferdigMs - kjede(st, regn(st), ferdigMs).start.getTime()) / 3600000;
  return { trinn, span, forKort: span > maalT + 0.25, flexIdx: idx };
}
// Bruk vinduet: fit planen og lagre. Kalles når start eller ferdig endres.
function settVindu(startMs, ferdigMs) {
  if (!(isFinite(startMs) && isFinite(ferdigMs) && ferdigMs > startMs)) { oppdater(); return; }
  const res = tilpassVindu(startMs, ferdigMs);
  if (res.trinn) S.heveplan = res.trinn;
  S.vinduStart = startMs;
  S.ferdigMs = ferdigMs;
  oppdater();
}

/* ============================================================
   BUNNLINJE — deigregnskap
   ============================================================ */
function fjernBakteppe() { const b = byId('bakteppe'); if (b) b.remove(); }
function tegnBunnlinje(r, K) {
  const bl = byId('bunnlinje');
  /* Bakteppet fjernes bare når arket faktisk skal LUKKES. Før ble det revet ned
     og bygget opp igjen ved hver render, og fade-inn-animasjonen spilte av på
     nytt hver gang — et blink for hvert trykk mens regnskapet stod åpent. */
  if (!S.regnskapAapen) fjernBakteppe();
  if (['logg', 'oppslag'].includes(S.skjerm)) { bl.replaceChildren(); bl.className = 'bunnlinje'; S.regnskapAapen = false; fjernBakteppe(); return; }
  bl.className = 'bunnlinje' + (S.regnskapAapen ? ' open' : '');
  /* Stripa er ETT element som gjenbrukes — bare innholdet byttes.
     Før ble hele bunnlinja tømt med `replaceChildren`, og da forsvant ARKET med
     i dragsuget: neste render bygget det opp på nytt, og `animation: arkOpp`
     spilte av igjen. Det var spretten Bjørn så ved hvert trykk mens regnskapet
     stod åpent. Stabile noder er hele løsningen. */
  let stripe = byId('bunnStripe');
  if (!stripe) {
    stripe = h('button', { class: 'stripe', id: 'bunnStripe', 'aria-label': 'Deigregnskap — åpne eller lukk',
      onClick: () => { S.regnskapAapen = !S.regnskapAapen; oppdater(); } });
    bl.insertBefore(stripe, bl.firstChild);
  }
  stripe.setAttribute('aria-expanded', S.regnskapAapen ? 'true' : 'false');
  // Stripa viser bare det en baker trenger i et blikk — deigvekt, gjær, løft og
  // total tid. «GD» (gjæringsdose) er tatt ut: det var ren sjargong, gjentok
  // gjær-tallet rett ved siden av, og var med på å sprenge bredden så linja
  // klippet på smal skjerm. Resten står i regnskapsarket som dras opp.
  stripe.replaceChildren(
    h('b', null, g0(r.totalVekt)), ' deig', sep(),
    h('b', null, fmt(r.gjaerTotal, 2) + ' g'), ' gjær', sep(),
    h('b', null, String(r.loft.loft)), ' løft', sep(),
    h('b', null, fmt(K.totalT, 1) + ' t'), ' total',
    // Pila peker OPP når arket er lukket: det er retningen arket kommer fra, og
    // det er den som forteller at linja er noe man kan dra opp. Nedover leste
    // som «her lukkes noe», altså motsatt av hva knappen gjør.
    h('span', { class: 'pil', 'aria-hidden': 'true' }, '⌃'));
  const gammeltArk = byId('regnskapArk');
  if (!S.regnskapAapen) { if (gammeltArk) gammeltArk.remove(); return; }

  const innmat = [
    h('div', { class: 'ark-hank' }),
    h('div', { class: 'ark-tittel' }, 'Deigregnskap'),
    ...regnskapInnmat(r, K)
  ];

  if (gammeltArk) {
    const sc = gammeltArk.scrollTop;
    gammeltArk.replaceChildren(...innmat);
    gammeltArk.scrollTop = sc;
  } else {
    bl.appendChild(h('div', { class: 'regnskap-ark', id: 'regnskapArk',
      onClick: () => { S.regnskapAapen = false; oppdater(); } }, ...innmat));
  }
  // Bakteppe over innholdet — lukker ved trykk. Gjenbrukes hvis det allerede
  // står der, ellers spilles fade-inn om igjen ved hver render.
  if (!byId('bakteppe')) byId('telefon').appendChild(h('div', { class: 'regnskap-bakteppe', id: 'bakteppe',
    onClick: () => { S.regnskapAapen = false; oppdater(); } }));
}
/* Innholdet i regnskapsarket — alt under tittelen. Trukket ut av tegnBunnlinje
   fordi loggen viser NØYAKTIG det samme arket for et historisk bak: leses r og
   K fra en gammel oppskrift, skal tabellen og kurven følge med gratis, uten en
   kopi som kan drifte. Leser S (tillegg, antall, lokk …) — kalles den for en
   loggpost, må S midlertidig stå på postens oppskrift (se tegnLoggRegnskap). */
function regnskapInnmat(r, K) {
  /* Med forferment: PARET tabell — samme ingrediens på samme linje, forferment i
     venstre kolonne og hoveddeig i høyre, så øyet kan sammenligne uten å lete
     (Bjørn 01.08: «vann i forferment til venstre, vann i hoveddeig til høyre»).
     Det gamle 2-kolonners-rutenettet parret radene tilfeldig etter rekkefølge. */
  const ffSaltG = r.ffPaa && r.forferment ? (r.forferment.salt || 0) : 0;
  const parTabell = r.ffPaa ? h('div', { class: 'regnskap-par' },
    h('span'), h('span', { class: 'rp-hode' }, 'Forferment'), h('span', { class: 'rp-hode' }, 'Hoveddeig'),
    ...[
      ['Mel', g0(r.forferment.mel), g0(r.melTotal - r.forferment.mel)],
      ['Vann', g0(r.forferment.vann), g0(r.vannHoved)],
      /* Gjærtallene per bolle: det som skal på vekta i HVER av dem. Totalen står
         i listen under — å vise bare totalen ga 35 % overdose i hoveddeigen. */
      ['Gjær (tørr)', fmt(r.forferment.gjaer, 2) + ' g', fmt(r.gjaerHoved, 2) + ' g'],
      ['Salt', ffSaltG > 0.05 ? fmt(ffSaltG, 1) + ' g' : '–', fmt(r.salt - ffSaltG, 1) + ' g']
    ].flatMap(([lab, fv, hv]) => [
      h('span', { class: 'rp-lab' }, lab), h('b', null, fv), h('b', null, hv)])) : null;
  const rader = [
    ['Mel totalt', g0(r.melTotal)],
    /* «Vann i hoveddeigen» = det du faktisk heller i bollen (vannHoved). Frøvannet
       står på EGEN linje under, ellers så det ut som vann forsvant når man la til
       frø: melet krymper (fast deigvekt), hovedvannet krymper med det, og frøenes
       vann var usynlig. Nå balanserer regnskapet. */
    r.ffPaa ? null : ['Vann i hoveddeigen', g0(r.vannHoved)],
    r.froAbsorbert > 0.5 ? ['Vann til frøene (bløtlegg)', g0(r.froAbsorbert)] : null,
    r.ffPaa ? ['Forferment totalt', g0(r.forferment.total)] : null,
    r.ffPaa ? null : ['Salt', fmt(r.salt, 1) + ' g'],
    r.ffPaa
      ? ['Gjær totalt', fmt(r.gjaerTotal, 2) + ' g']
      : ['Gjær (tørr)', fmt(r.gjaerTotal, 2) + ' g'],
    /* Tilleggene med GRAM, ikke bare som effekt-avvik: frø ved navn, og
       smakstilleggene (honning, olje, sukker, smør, malt). Alle går i
       hoveddeigen, så de står i totallisten — regnskapet skal kunne leses som
       en handleliste (Bjørn 01.08). */
    ...(r.fro || []).filter(f => (f.gram || 0) > 0.5).map(f => {
      const sk = (typeof SOAKERS !== 'undefined') && SOAKERS.find(s => s.id === f.id);
      return [(sk ? sk.navn : f.id), g0(f.gram)];
    }),
    ...[['honning', 'Honning'], ['olje', 'Olje'], ['sukker', 'Sukker'], ['smor', 'Smør'], ['malt', 'Malt']]
      .filter(([k]) => (r[k] || 0) > 0.5)
      .map(([k, navn]) => [navn, g0(r[k])]),
    ['Effektiv hydrering', pst(r.effektivHydrering * 100, 1)],
    ['Brødskala', fmt(r.brodskala.pct, 0) + ' % · ' + r.brodskala.kort],
    ['Løftindeks', r.loft.loft + ' / 100'],
    ['Total tid', fmt(K.totalT, 1) + ' t'],
    ['Kostnad', fmt(r.kost.total, 0) + ' kr']
  ].filter(Boolean);
  // «Hva valgene koster» hører hjemme her: totalen over, avvikene mot
  // brødet uten tillegget som referanse — samme tall som dose–respons-panelet.
  const avvik = doseResponsRader();
  return [
    parTabell,
    h('div', { class: 'regnskap' }, ...rader.map(([k, v]) =>
      h('div', { class: 'rad' }, h('span', null, k), h('b', null, v)))),
    avvik.length ? h('div', { class: 'ark-tittel', style: 'margin-top:12px' }, 'Hva tilleggene gjør med brødet') : null,
    ...avvik.map(rad => h('div', { class: 'ark-avvik' },
      h('b', null, rad.navn),
      h('span', null, rad.verdier.map(([lab, v]) => lab + ' ' + fmtDelta(v)).join(' · ')))),
    avvik.length ? h('div', { style: 'font-size:.68rem;color:var(--color-neutral-600);margin-top:4px' },
      '± er endring mot samme brød uten tillegg. Detaljer i «Hva valgene koster» på Deig.') : null,
    // Gjæringskurven hører hjemme her: regnskapet sier hva deigen ER, grafen
    // sier hvordan den kommer dit. Samme funksjon som på Tid, i mini-format.
    regnskapGraf(r, K)
  ].filter(Boolean);
}
/* Mini-gjæringskurve til deigregnskapet. Bruker nøyaktig samme planProfil() og
   gjaeringsGraf() som Tid-skjermen. */
function regnskapGraf(r, K) {
  if (typeof planProfil !== 'function') return null;
  const pts = planProfil(r.planTrinn, r.gjaerTorr, r.masseKg, { antall: S.antall, lokk: S.lokk, fulltKjol: S.fulltKjol });
  if (!pts || pts.length <= 2) return null;
  const bulkStart = (K.find(x => x.id === 'trinn-0') || {}).tid || K.start;
  return h('div', { style: 'margin-top:12px' },
    h('div', { class: 'ark-tittel' }, 'Gjæringen over tid'),
    // K MÅ med: uten den finner ikke grafen forferment-steget, og da forsvant
    // bigaen og klokkeslettene stemte ikke med planen — men bare i DENNE
    // mini-utgaven, ikke på Tid (Bjørn 01.08, «bigaen borte — hva skjedde?»).
    gjaeringsGraf(pts, r, bulkStart, S.tidModus === 'naa', K),
    h('div', { style: 'font-size:.68rem;color:var(--color-neutral-600);margin-top:2px' },
      'Grønn kurve: andel av gjæringen som er gjort (høyre akse). Stiplet: deigtemperatur (venstre).'));
}

const sep = () => h('span', { class: 'sep' }, ' · ');

/* ============================================================
   1 · BRØDET
   ============================================================ */
function tegnBrodet(r, K) {
  const wrap = h('div');
  // Startblokka «Start fra forvalget Halvgrovt 40 %» er fjernet. Den lovet et
  // utgangspunkt, men pekte på et forvalg brukeren aldri hadde bakt — og den
  // forsvant så snart loggen fikk sin første post, altså akkurat når man
  // begynte å ha noe ekte å gå tilbake til. Veien tilbake til et bak som funket
  // ligger nå der den hører hjemme: «Bak dette på nytt» på loggposten.
  // Overskriften står i toppfeltet nå — en gjentakelse her ville vært støy.
  wrap.appendChild(h('div', { class: 'valg' }, ...BTYPER.map(bt => {
    const paa = bt.id === S.brotype || (bt.id === 'grovbrod' && S.brotype === 'loff');
    const rad = h('div', { class: 'brodvalg' + (paa ? ' paa' : '') });
    // Hakemerket er ute: valgt tilstand vises på kortets egen farge, og plassen
    // trengs til at ⓘ kan ligge INNI boksen i stedet for å henge utenfor den.
    rad.appendChild(h('button', { class: 'brodvalg-hoved', aria: { pressed: paa }, onClick: () => velgBrotype(bt.id) },
      h('span', { class: 'brodvalg-ikon' }, brodTegning(bt.id)),
      h('span', { style: 'flex:1;min-width:0' },
        h('span', { class: 'tittel' }, bt.navn),
        h('span', { class: 'undertittel' }, bt.undertittel || ''))));
    // ⓘ per brødtype i stedet for ett kollapskort for den valgte. Da kan man
    // lese hva en ciabatta ER før man bytter til den — som er når man lurer.
    rad.appendChild(h('button', { class: 'info-ring', 'aria-label': 'Om ' + bt.navn,
      onClick: () => { S.brodInfo = S.brodInfo === bt.id ? null : bt.id; oppdater(); } }, infoIkon(26)));
    const boks = h('div');
    boks.appendChild(rad);
    if (S.brodInfo === bt.id) boks.appendChild(brodInfoBoks(bt, paa ? K : null));
    /* «Er du sikker?» rett UNDER kortet man trykket, ikke etter hele lista:
       med varselet under folden så trykket ut som det ikke virket (ux-review
       01.08 — kortet lyser ikke opp før man har bekreftet). */
    if (S.byttBekreft === bt.id) {
      boks.appendChild(h('div', { class: 'varsel', style: 'margin-top:6px' },
        h('div', { style: 'font-weight:800;margin-bottom:4px' }, 'Bytte til ' + bt.navn + ' — starte på nytt?'),
        h('div', { style: 'font-size:.8rem;line-height:1.45' },
          'Da nullstilles deigvalgene dine (tillegg, vann, salt, grovhet og heveplan) til ' +
          bt.navn.toLowerCase() + 's egen oppskrift. Utstyr, maskin, logg og favoritter beholdes.'),
        h('div', { style: 'display:flex;gap:8px;margin-top:10px' },
          h('button', { class: 'btn btn-primary', style: 'flex:1;font-size:.82rem', onClick: () => nyBakst(S.byttBekreft) }, 'Ja, start på nytt'),
          h('button', { class: 'btn', style: 'flex:1;font-size:.82rem', onClick: () => { S.byttBekreft = null; oppdater(); } }, 'Avbryt'))));
    }
    return boks;
  })));

  // Størrelse
  const emneMasse = r.totalVekt / Math.max(S.antall, 1);
  wrap.appendChild(h('div', { class: 'kort', style: 'margin-top:14px' },
    h('div', { class: 'kort-num' }, 'Størrelse'),
    stepperRad('Antall brød', S.antall, 'antall', 1, 40, 1),
    stepperRad('Gram per brød', S.vekt, 'vekt', 100, 2000, 50),
    h('div', { style: 'margin-top:10px;font-size:.8rem;color:var(--color-neutral-700);font-variant-numeric:tabular-nums' },
      'Deigvekt ', h('b', null, g0(r.totalVekt)), ' · hver ca. ', h('b', null, g0(emneMasse)),
      // Pyrex-målet er bare relevant når man faktisk baker i Pyrexen — ellers er
      // det irrelevant støy midt i et sentralt tall.
      (r.prof && (r.prof.id === 'brod_glass_stal' || r.prof.id === 'brod_kloke')) ? ' · Pyrex-gryta er 21,5 cm innvendig' : ''),
    h('div', { style: 'margin-top:12px' },
      h('div', { class: 'felt-label' }, 'Kjøkkenvekta di viser'),
      h('div', { class: 'piller' }, ...[[1, 'hele gram'], [0.1, '0,1 g'], [0.01, '0,01 g']].map(([v, navn]) =>
        h('button', { class: (S.vektTrinn || 1) === v ? 'paa' : '', onClick: () => { S.vektTrinn = v; oppdater(); } }, navn))))));

  // Form og kurv (styrer stekeutstyret, ikke bare utseendet)
  if (r.bt.rute !== 'preset') wrap.appendChild(tegnFormKurv(r, emneMasse));

  // Utstyr
  wrap.appendChild(tegnUtstyrValg(r));
  return wrap;
}
/* ⓘ-innholdet per brødtype. For den VALGTE typen følger stegkjeden med, generert
   fra kjede() — samme kilde som Tid og Prosess, så den kan ikke drifte. For de
   andre vises bare hva baksten er: kjeden deres avhenger av valg som ikke er
   gjort ennå, og en oppdiktet kjede ville vært verre enn ingen. */
function brodInfoBoks(bt, K) {
  const boks = h('div', { class: 'info-boks', style: 'margin:-2px 0 8px' });
  boks.appendChild(h('div', { class: 'hjelpetekst' }, bt.om || ''));
  if (K && K.length) {
    boks.appendChild(h('div', { class: 'felt-label', style: 'margin-top:10px;font-weight:800' },
      'Prosessen · totalt ' + fmt(K.totalT, 1) + ' t'));
    K.forEach((s, j) => boks.appendChild(h('div', { style: 'display:flex;gap:8px;align-items:baseline;font-size:.78rem;padding:3px 0;border-bottom:1px dotted var(--color-neutral-200)' },
      h('span', { style: 'flex:0 0 18px;color:var(--color-neutral-500);font-variant-numeric:tabular-nums' }, String(j + 1)),
      h('span', { style: 'flex:1' }, s.navn),
      h('span', { style: 'color:var(--color-neutral-600);font-variant-numeric:tabular-nums;white-space:nowrap' }, fmtTimer(s.varighet / 60)))));
    boks.appendChild(h('div', { style: 'font-size:.7rem;color:var(--color-neutral-600);margin-top:6px' },
      'Tidene følger valgene dine — hele kjeden med klokkeslett ligger under Prosess.'));
  } else {
    boks.appendChild(h('div', { style: 'font-size:.7rem;color:var(--color-neutral-600);margin-top:8px' },
      'Velg denne baksten for å se hele stegkjeden med tider.'));
  }
  return boks;
}

/* Emnets største mål i cm: kFaktor × ∛(masse i kg) × 10. Samme formel som
   ellers i appen, samlet ett sted. */
function emneMaalCm(f, emneMasse) {
  if (!f || !f.kFaktor) return null;
  return Math.cbrt(emneMasse / 1000) * f.kFaktor * 10;
}
/* Brukerens egen kurvstørrelse. Kurver finnes i mange mål, og om emnet passer
   er et spørsmål om DIN kurv — ikke om en antatt standardstørrelse. */
function kurvMaal(f) {
  if (!f || !f.standardMaal) return null;
  const eget = (S.kurvMaal || {})[f.id];
  return isFinite(eget) && eget > 0 ? eget : f.standardMaal;
}
function tegnFormKurv(r, emneMasse) {
  const boks = kort('Form og kurv', null);
  boks.appendChild(h('div', { class: 'valg', style: 'margin-top:6px' }, ...FORMER.map(f => {
    const paa = f.id === S.form;
    const cm = emneMaalCm(f, emneMasse);
    const maal = cm ? 'emnet blir ca. ' + fmt(cm, 0) + ' cm ' + (f.maal === 'lengde' ? 'langt' : 'tvers') : '';
    return h('button', { class: 'valgkort' + (paa ? ' paa' : ''), onClick: () => velgForm(f.id) },
      h('span', { style: 'flex:1;min-width:0' },
        h('span', { class: 'tittel', style: 'font-size:.98rem' }, f.navn),
        h('span', { class: 'undertittel' }, f.kort + (maal ? ' · ' + maal : ''))),
      paa ? h('span', { class: 'valgt-merke' }, '✓' ) : null);
  })));
  const f = FORMER.find(x => x.id === S.form);
  // Kurvens mål som innstilling, og en ærlig sjekk mot emnet.
  if (f && f.standardMaal) {
    const mine = kurvMaal(f), cm = emneMaalCm(f, emneMasse);
    const egetSatt = isFinite((S.kurvMaal || {})[f.id]);
    /* Første gang SPØR appen i stedet for å bruke et tall den har funnet på.
       Kurver finnes i mange størrelser, og advarselen «emnet er for stort for
       kurven» er verdiløs — eller direkte feil — om den måles mot en antatt
       standard i stedet for kurven som står på kjøkkenet. */
    if (!egetSatt) boks.appendChild(h('div', { class: 'varsel' },
      h('div', { style: 'font-weight:800;margin-bottom:2px' }, 'Hvor stor er kurven din?'),
      h('div', { style: 'font-size:.8rem;line-height:1.45' },
        'Mål innvendig ' + (f.maal === 'lengde' ? 'lengde' : 'tverrmål') + ' i centimeter. Uten det måler appen emnet mot ' +
        fmt(f.standardMaal, 0) + ' cm — en vanlig størrelse, men ikke nødvendigvis din, og da blir advarslene under upålitelige.')));
    boks.appendChild(h('div', { class: 'gramrad' },
      h('span', { class: 'gramrad-lab' }, (f.maal === 'lengde' ? 'Kurvens lengde' : 'Kurvens tverrmål') +
        (egetSatt ? '' : ' (antatt)')),
      gramFelt(mine, v => {
        S.kurvMaal = Object.assign({}, S.kurvMaal);
        if (v > 0) S.kurvMaal[f.id] = v; else delete S.kurvMaal[f.id];
        oppdater();
      }, 'Kurvens mål i cm'),
      h('span', { class: 'gramrad-enhet' }, 'cm')));
    if (egetSatt && cm && cm > mine) boks.appendChild(h('div', { class: 'varsel' },
      'Emnet blir ca. ' + fmt(cm, 0) + ' cm og kurven din er ' + fmt(mine, 0) + ' cm. Del deigen i flere brød, eller bruk en større kurv — et emne som presses ned i en for kort kurv mister spenningen du nettopp bygget.'));
    else if (egetSatt && cm && cm < mine * 0.6) boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:8px' },
      'Emnet er ca. ' + fmt(cm, 0) + ' cm i en ' + fmt(mine, 0) + ' cm kurv. Det har god plass — men mye slark gjør at emnet flyter utover i stedet for å holdes oppreist.'));
  }
  if (f && f.advarsel) boks.appendChild(h('div', { class: 'varsel' }, f.advarsel));
  if (f) boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:8px' }, f.om, f.snitt ? h('div', { style: 'margin-top:6px' }, h('b', null, 'Snitt: '), f.snitt) : null));
  return boks;
}
function tegnUtstyrValg(r) {
  const boks = kort('Stekeutstyr', null);
  const u = UTSTYR.find(x => x.id === S.utstyr) || UTSTYR[0];
  // Favorittene øverst, med ★. Stjernen settes i Oppslag → Stekeutstyr; her er
  // den bare en gjenfinning. (★-et som lå hardkodet i ett av navnene er borte.)
  boks.appendChild(h('select', { class: 'sok', style: 'margin-top:6px', 'aria-label': 'Stekeutstyr',
    onchange: e => { S.utstyr = e.target.value; if (!S.stekeProfilManuell) S.stekeProfil = profilForUtstyr(S.utstyr, S.form); oppdater(); } },
    ...favForst(UTSTYR, 'utstyr').map(x => h('option', { value: x.id, selected: x.id === S.utstyr ? 'selected' : null },
      (erFavoritt('utstyr', x.id) ? '★ ' : '') + x.navn))));
  boks.appendChild(h('div', { style: 'display:flex;gap:12px;font-size:.76rem;color:var(--color-neutral-600);margin-top:8px;flex-wrap:wrap;font-variant-numeric:tabular-nums' },
    u.kontakt != null ? h('span', null, 'Kontakt ', h('b', null, u.kontakt + ' °C')) : null,
    h('span', null, 'Forvarm ', h('b', null, u.forvarm)), h('span', null, 'Damp: ', h('b', null, u.damp))));
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:6px' }, u.om));
  boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:8px' }, 'Gir stekeprofilen ', h('b', null, r.prof.navn), '. Best til: ' + u.best + '.'));
  boks.appendChild(h('button', { class: 'btn-ghost', style: 'margin-top:8px',
    onClick: () => { S.skjerm = 'oppslag'; S.oppslag = 'utstyr'; oppdater(); } },
    'Sammenlign oppsettene og merk favoritter ›'));
  // Pyrex i ovnen — vises bare når den valgte profilen faktisk har et varmt
  // alternativ, altså kloke-oppsettet. Se kommentaren ved `varm` i data.js for
  // hvorfor deig-i-gryta ikke får det samme.
  const grunn = BAKE_PROFILES.find(p => p.id === r.prof.id);
  if (grunn && grunn.varm) {
    const paa = !!S.pyrexIOvn;
    boks.appendChild(h('label', { class: 'pyrex-valg' + (paa ? ' paa' : '') },
      h('input', { type: 'checkbox', checked: paa ? 'checked' : null,
        onchange: e => { S.pyrexIOvn = e.target.checked; oppdater(); } }),
      h('span', null,
        h('b', null, 'Pyrexen står i ovnen'),
        h('span', { class: 'pv-under' }, 'Den varmes opp sammen med ovnen og blir stående mellom bakerundene — tas aldri kald inn i en varm ovn.'))));
    boks.appendChild(h('div', { class: 'konsekvens' }, paa
      ? [h('b', null, 'Steker på ' + grunn.varm.inn + ' °C'), ' i stedet for ' + grunn.inn + ' °C, ned til ' + grunn.varm.ned + ' °C. Uten oppvarmingssjokket er det ikke 220-gradersgrensen som setter taket lenger, så oppsettet kan kjøres som en støpejernsgryte — mer bunnvarme og bedre ovnsløft. Deigen ligger på stålet og rører aldri glasset.']
      : [h('b', null, 'Steker på ' + grunn.inn + ' °C.'), ' Taket er glassets termiske sprang på 220 °C: et romtemperert glass inn i en 260-graders ovn er 240 og kan sprekke. Lar du glasset stå i ovnen fra kald start, forsvinner den grensen — kryss av over.']));
    if (paa) boks.appendChild(h('div', { class: 'varsel fare' },
      h('b', null, 'To ting glasset ikke tåler: '), 'å settes tilbake i en varm ovn etter at det er blitt kaldt, og å kjøles raskt — legg det aldri i vann eller på en våt benk når du tar det av etter 20 minutter. La det kjøle i luft, eller sett det rett inn igjen mens det er varmt.'));
  }
  return boks;
}
function velgForm(id) { S.form = id; if (!S.stekeProfilManuell) S.stekeProfil = profilForUtstyr(S.utstyr, id); oppdater(); }
const UTSTYR_PROFIL = { stal15: 'brod_kloke', glass: 'brod_glass_stal', glass_stal: 'brod_glass_stal', stopejern: 'brod_gryte', apen: 'brod_apen', brett: 'brod_brett' };
function profilForUtstyr(utstyrId, formId) {
  // Tidligere ble avlangt + stål tvunget til åpen steking (antatt at ingen gryte
  // tok avlange emner). Med den avlange Pyrexen tar kloke-oppsettet avlange
  // brød fint, så det spesialtilfellet er fjernet.
  return UTSTYR_PROFIL[utstyrId] || 'brod_apen';
}
/* startForvalg() er fjernet sammen med startblokka på Brød-skjermen. */
/* Å velge en annen brødtype er å starte et NYTT bak — før tok den med seg alle
   deigvalgene (tillegg, vann, salt, heveplan) inn i den nye baksten, så en
   ciabatta arvet f.eks. solsikkefrøene fra brødet. Nå spørres det først
   («er du sikker?»), og bekreftelsen nullstiller oppskriftsvalgene til den nye
   bakstens standard. Utstyr, maskin, logg og favoritter beholdes — de er dine,
   ikke bakstens. */
function velgBrotype(id) {
  if (id === S.brotype || (id === 'grovbrod' && S.brotype === 'loff')) { S.byttBekreft = null; oppdater(); return; }
  S.byttBekreft = id;
  oppdater();
}
function nyBakst(id) {
  const bt = BTYPER.find(b => b.id === id) || BTYPER[0];
  Object.assign(S, {
    brotype: id,
    grov: STANDARD.grov, hyd: STANDARD.hyd, tid: STANDARD.tid,
    ff: STANDARD.ff, ffType: STANDARD.ffType,
    tillegg: bt.rute === 'preset' ? {} : Object.assign({}, STANDARD.tillegg),
    saltPct: null, heveplan: null, stekeProfilManuell: false,
    /* Profilen utledes av UTSTYRET, ikke satt til null.
       Med null falt motoren tilbake på BAKE_PROFILES[0] = støpejernsgryte på
       260 °C — mens utstyret fortsatt var Pyrex som klokke, med tak på 230.
       Det er nøyaktig den bruddrisikoen data.js selv advarer mot. */
    stekeProfil: profilForUtstyr(S.utstyr, STANDARD.form),
    form: STANDARD.form, aktivSteg: 0, aktivStegId: null, byttBekreft: null,
    paramInfo: null, tilleggInfo: null, melInfo: null,
    /* Disse hører til BAKSTEN og må vike, ikke arves inn i den nye.
       `melOverstyr` var verst: en egen melblanding slår presetets eget mel, så
       en ciabatta kunne bli bakt på 60 % sammalt rug — stikk i strid med det
       bekreftelsesteksten lover. */
    melOverstyr: null, melEndring: null, okDeig: false, autolyseMin: 0,
    ffTemp: null, ffTimer: null, handlelisteOk: false, kompSporsmal: false, brodInfo: null,
    /* Tidsvinduet og forferment-romtempen hører også til BAKSTEN: sto vindu-
       modusen igjen etter et brødtypebytte, viste Tid et aktivt vindukort som
       «fittet» mot en plan som alt var nullstilt — tallene stemte ikke med noe
       (teknisk review 01.08). */
    tidModus: 'ferdig', vinduStart: null, ffRomTid: null, ffRomTemp: null,
    stegKvitt: {}               // kvitteringene hører til baket, ikke til det neste
  });
  if (bt.antall) S.antall = bt.antall;
  if (bt.vekt) S.vekt = bt.vekt;
  // Preset forutsetter sin egen forferment (ciabatta = biga). Synk den, ellers
  // ville motoren gitt presetet ingen forferment før brukeren slår den på manuelt.
  if (bt.rute === 'preset') {
    const pr = PRESETS.find(p => p.id === id);
    if (pr && pr.forferment) { S.ff = !!pr.forferment.bruk; S.ffType = pr.forferment.type === 'pate' ? 'biga' : pr.forferment.type; }
    /* Presetet EIER stekingen sin (ciabatta 260° midt i ovnen, focaccia i form
       uten damp) — utstyrsutledningen ga alle presetene generisk brød-profil,
       så en ciabatta ble stekt 45 min under Pyrex-klokke (baker-review 01.08).
       Finnes presetets profil, brukes den; brukeren kan fortsatt overstyre. */
    if (pr && pr.steking && BAKE_PROFILES.find(p => p.id === pr.steking)) S.stekeProfil = pr.steking;
  }
  oppdater();
}

/* ---------- Redigerbart gramtall ----------
   Ser ut som tallet det erstatter, men er et felt. `onchange` og ikke `oninput`:
   skriver du «7» på vei til «700», skal ikke oppskriften løses om for 7 g først
   — og en re-render midt i tastingen ville dessuten tatt fokus fra feltet. */
function gramFelt(verdi, settInn, etikett) {
  return h('input', {
    class: 'gramfelt', type: 'number', inputmode: 'numeric', min: 0, step: 10,
    value: Math.round(verdi), 'aria-label': etikett,
    /* `select()` markerer hele verdien — og på Android utløser en markering
       systemets kopier/lim-verktøylinje, som spretter opp over appen ved hvert
       eneste felt man tar i. Praktisk med mus, plagsomt med finger. Derfor bare
       når det faktisk finnes en presis peker. */
    onfocus: e => { try { if (window.matchMedia('(pointer: fine)').matches) e.target.select(); } catch (err) {} },
    onchange: e => {
      /* Komma OG tomt felt må håndteres. `+''` er 0, ikke NaN, så et tomt eller
         komma-avvist felt (type=number gir value='' for «500,5») satte før melet
         til 0 g stille. parseFloat med komma→punktum, og tomt/ugyldig ruller
         tilbake til vist verdi i stedet for å nulle raden. */
      const raw = String(e.target.value).replace(',', '.').trim();
      const v = parseFloat(raw);
      if (raw === '' || !isFinite(v) || v < 0) { render(); return; }
      settInn(v);
    }
  });
}
/* «Anbefalt»-knapp for et nivå. Vises bare når du faktisk står et annet sted enn
   anbefalingen — ellers ville den vært en knapp som ikke gjør noe. */
function anbefaltKnapp(naa, anbefalt, settInn, enhet) {
  if (Math.abs((+naa || 0) - anbefalt) < 0.05) return null;
  return h('button', { class: 'anbefalt-knapp', onClick: () => settInn(anbefalt) },
    'Bruk anbefalt: ' + fmt(anbefalt, anbefalt % 1 ? 1 : 0) + (enhet || ''));
}

function stepperRad(label, verdi, felt, min, max, steg) {
  /* Utgangspunktet er den VISTE verdien, ikke `S[felt]`.
     Er feltet null (som `ffTemp` er til man rører den), viste raden planens
     21 °C mens `(S[felt] || 0)` regnet fra 0 — og «+» klemte bare mot `max`.
     Ett trykk sendte forfermenten til 1 °C, og gjærdosen fra 0,6 til 224 gram. */
  /* `isFinite(null)` er TRUE (Number(null) === 0), så en null-sjekk må komme
     først. Uten den falt `ffTemp: null` tilbake på 0 og «+» ga 1 °C. */
  const naa = (S[felt] != null && isFinite(S[felt])) ? +S[felt]
            : (verdi != null && isFinite(verdi)) ? +verdi : min;
  /* Vis alltid et rent tall med komma-desimal, aldri en rå float som
     «1.8340080864093424». Antall desimaler følger stegstørrelsen: heltallssteg
     gir heltall, ellers én desimal — som er det fineste noen stepper her bruker. */
  const dec = Number.isInteger(steg) ? 0 : 1;
  const sett = v => { S[felt] = Math.min(max, Math.max(min, Math.round(v / steg) * steg)); oppdater(); };
  return h('div', { class: 'stepper-blokk' },
    h('div', { class: 'felt-label' }, label),
    h('div', { class: 'stepper' },
      h('button', { 'aria-label': 'Mindre ' + label, onClick: () => sett(naa - steg) }, '−'),
      h('input', { type: 'text', inputmode: 'numeric', value: fmt(naa, dec), 'aria-label': label,
        onblur: e => { const v = parseFloat(e.target.value.replace(',', '.')); if (!isNaN(v)) sett(v); else oppdater(); } }),
      h('button', { 'aria-label': 'Mer ' + label, onClick: () => sett(naa + steg) }, '+')));
}

/* ============================================================
   2 · DEIGEN
   ============================================================ */
function tegnDeigen(r) {
  const wrap = h('div');
  const erPreset = r.bt.rute === 'preset';

  // 1 · Grovhet — segmenterte piller (0/10/25/40/60/80), som designet
  if (!erPreset) {
    const bk = r.brodskala;
    const trinn = [0, 10, 25, 50, 75, 100];
    const boks = h('div', { class: 'kort' },
      h('div', { class: 'kort-hode' },
        h('span', { class: 'kort-num', style: 'display:inline' }, '1 · Hvor grovt'),
        h('span', { class: 'h-verdi' }, fmt(bk.pct, 0) + ' % · ' + bk.kort.toLowerCase() + (S.melOverstyr ? ' · egen blanding' : ''))),
      /* Har du en EGEN melblanding, stemmer den sjelden med et av de faste
         trinnene — den faktiske grovheten står i overskriften (f.eks. 19 %). Da
         skal ingen pille lyse «10 %», for det var bare startpunktet du siden
         endret. Velger du en pille, ber du om den anbefalte blandingen for det
         trinnet, og egenblandingen viker (melOverstyr = null). */
      h('div', { class: 'piller' }, ...trinn.map(t =>
        h('button', { class: (!S.melOverstyr && S.grov === t) ? 'paa' : '', onClick: () => { S.grov = t; S.melOverstyr = null; oppdater(); } }, t + ' %'))),
      h('div', { class: 'konsekvens', style: 'margin-top:12px' }, grovKonsekvens(r)));
    wrap.appendChild(boks);
  }

  // 2 · Meltypene — glutenbidrag + protein, stort gramtall, ⓘ
  const sumKr = r.mel.reduce((s, m) => s + (m.kost || 0), 0);
  const melBoks = h('div', { class: 'kort' },
    h('div', { class: 'kort-hode' },
      h('span', { class: 'kort-num', style: 'display:inline' }, '2 · Meltypene'),
      h('span', { class: 'h-meta' }, 'Sum mel ' + g0(r.melTotal) + ' · 100 % · ' + fmt(sumKr, 0) + ' kr')));
  r.mel.forEach((m, i) => {
    const info = (typeof MEL_INFO !== 'undefined') && MEL_INFO[m.id];
    const flour = FLOURS.find(f => f.id === m.id) || {};
    const bidrag = info && GLUTENBIDRAG_TEKST[info.glutenbidrag] ? GLUTENBIDRAG_TEKST[info.glutenbidrag].navn : '';
    const fav = erFavoritt('mel', m.id);
    /* Stjerna står BAK navnet, som en merkelapp på melet — ikke som en pille.
       Den er brukerens egen (satt i Oppslag → Mel & korn), aldri hardkodet:
       ★-ene som lå i tre av melnavnene er fjernet nettopp derfor. */
    melBoks.appendChild(h('div', { class: 'melrad2' + (i === 0 ? ' forst' : '') },
      h('div', { class: 'm-navn' },
        h('div', { class: 'n' }, m.navn, fav ? h('span', { class: 'fav-stjerne', title: 'Favoritt' }, '★') : null),
        h('div', { class: 'sub' }, melUndertekst(m, flour, bidrag))),
      // Gram er redigerbart. Har du 500 g igjen av en melsort, skriver du 500 —
      // i stedet for å regne ut hvilken andel det blir. Selve omregningen ligger
      // i engine.js (settMelGram), som itererer fordi melmengden avhenger av
      // andelene og andelene av melmengden.
      h('div', { class: 'm-tall' },
        // Endringen utføres IKKE her. Den legges som et spørsmål (`melEndring`),
        // fordi «hva skal gi etter» har flere rimelige svar og appen tok det
        // stilltiende før: den fordelte alltid differansen på de andre meltypene.
        gramFelt(m.gram, nyGram => {
          if (Math.abs(nyGram - m.gram) < 0.5) return;
          S.melEndring = { i, gram: nyGram, fra: Math.round(m.gram) };
          oppdater();
        }, 'Gram ' + m.navn),
        h('div', { class: 'p' }, fmt(m.pct, 0) + ' %')),
      h('button', { class: 'info-ring', 'aria-label': 'Info om ' + m.navn, onClick: () => { S.tilleggInfo = null; S.melInfo = S.melInfo === m.id ? null : m.id; oppdater(); } }, infoIkon(26)),
      // × til HØYRE på raden, etter info — «fjern denne meltypen». Lå før inne i
      // navnekolonnen til venstre, der den svevde under undertoksten.
      r.mel.length > 1 ? h('button', { class: 'm-fjern', 'aria-label': 'Fjern ' + m.navn,
        onClick: () => {
          const liste = (gyldigOverstyring(S.melOverstyr) || r.melListe).filter((_, j) => j !== i);
          S.melOverstyr = liste.length ? liste : null;
          oppdater();
        } }, '×') : null));
    if (S.melInfo === m.id && info) {
      const linjer = [];
      if (info.plus) info.plus.forEach(p => linjer.push(['+', p, 'var(--color-accent-2-700)']));
      if (info.minus) info.minus.forEach(p => linjer.push(['−', p, 'var(--color-danger)']));
      if (!linjer.length && flour.notat) linjer.push(['', flour.notat, 'var(--color-neutral-700)']);
      melBoks.appendChild(h('div', { class: 'info-boks' }, ...linjer.map(([l, tk, f]) =>
        h('div', { class: 'info-linje' }, h('span', { class: 'etikett', style: 'flex:0 0 18px;color:' + f }, l), h('span', { class: 'tekst' }, tk)))));
    }
  });
  // Legg til / fjern meltype. Uten dette var melblandingen låst til det
  // grovhetstrappa fant på, og en meltype man faktisk har i skapet kunne ikke
  // komme inn i oppskriften i det hele tatt.
  melBoks.appendChild(tegnMelLeggTil(r));
  // Spørsmålet etter en gramendring: hva skal gi etter?
  const melSp = tegnMelEndring(r);
  if (melSp) melBoks.appendChild(melSp);
  // Praktisk melgrense (maxPct). En egen blanding kan settes langt utenfor det
  // et mel tåler i et frittstående brød — 100 % rug, 40 % havre — og da må
  // brukeren få vite HVA det koster, ikke bare at deigen «flyter ut».
  const ma = r.melAdvarsler;
  if (ma && ma.over) {
    const rader = ma.perMel.map(p =>
      h('div', { class: 'info-linje' },
        h('span', { class: 'etikett', style: 'flex:0 0 18px;color:var(--color-danger)' }, '⚠'),
        h('span', { class: 'tekst' },
          h('b', null, p.navn), ' ligger på ' + fmt(p.pct, 0) + ' %, over det praktiske taket på ' + p.maxPct + ' %' +
          (p.bidrag === 'bryterned' ? ' — rug har ikke gluten og amylasen bryter ned stivelsen.'
           : p.styrke === 'ingen' ? ' — dette melet har ingen bakeevne og bærer ikke et emne alene.'
           : ' — over dette rives eller lukkes deigen i stedet for å reise seg.'))));
    const raad = [];
    if (ma.trengerSyre) raad.push('Bruk surdeig eller 1–2 % eddik mot rugens amylase.');
    if (ma.maaIForm) raad.push('Bak i FORM — dette emnet holder ikke fasongen fritt.');
    raad.push('Reduser hevemålet og la brødet hvile 12–24 t før skjæring.');
    melBoks.appendChild(h('div', { class: 'varsel fare' },
      h('div', { style: 'margin-bottom:6px' }, h('b', null, 'Melblandingen er utenfor det som gir et trygt brød.')),
      ...rader,
      h('div', { style: 'margin-top:6px;font-size:.82rem;color:var(--color-neutral-700)' }, raad.join(' '))));
  }
  // Veien tilbake til anbefalingen. Uten den er en egen blanding en enveisdør,
  // og grovhetsdialen ser ut som den har sluttet å virke.
  if (S.melOverstyr) {
    /* Knappen skal beskrive blandingen du går tilbake TIL — grovhetstrinnet du
       satte — ikke den egne blandingen du står på nå. Før brukte den den EGNE
       blandingens grovhet (f.eks. 19 %) og hardkodet ordet «grovt», så den både
       viste feil tall og motsa grovhetskortet over (som klassifiserte samme tall
       som «fint» etter Brødskala). Nå regnes den anbefalte blandingen (uten
       overstyring), og både prosenten og klassen kommer derfra — samme språk som
       kortet over. */
    const anbefalt = regn({ ...S, melOverstyr: null });
    const ab = anbefalt.brodskala;
    melBoks.appendChild(h('div', { class: 'varsel', style: 'margin-top:10px' },
      h('div', null, h('b', null, 'Du har din egen melblanding.'), ' Grovhetstrinnene over styrer den ikke lenger.'),
      h('button', { class: 'btn', style: 'margin-top:8px;width:100%;font-size:.82rem',
        onClick: () => { S.melOverstyr = null; oppdater(); } },
        'Tilbake til anbefalt blanding · ' + fmt(ab.pct, 0) + ' % · ' + ab.kort.toLowerCase())));
  }
  /* En kostnad uten dato er en påstand uten holdbarhet.
     Prisene sto fra Bjørns gamle regneark og var flere år gamle — siktet
     hvetemel på 10 kr/kg, sammalt rug på 30 der den ligger på 17. Nå står det
     hvor de er hentet og når, og hvilke som ikke lot seg etterprøve. */
  if (typeof PRIS_HENTET !== 'undefined') {
    const anslag = r.mel.filter(m => {
      const f = FLOURS.find(x => x.id === m.id);
      return f && f.prisAnslag && (m.gram || 0) > 0;
    });
    melBoks.appendChild(h('div', { style: 'font-size:.68rem;color:var(--color-neutral-600);margin-top:8px;line-height:1.45' },
      'Kiloprisene er hentet ' + PRIS_HENTET + ' fra ' + PRIS_KILDE + '.' +
      (anslag.length
        ? ' ' + anslag.map(m => m.navn).join(', ') + (anslag.length > 1 ? ' er anslag' : ' er et anslag') +
          ' — de fantes ikke å slå opp, så kostnaden for dem er omtrentlig.'
        : '')));
  }
  melBoks.appendChild(h('button', { class: 'btn-ghost', style: 'margin-top:8px', onClick: () => { S.skjerm = 'oppslag'; S.oppslag = 'mel'; oppdater(); } },
    'Se melbiblioteket — fordeler, ulemper og tak ›'));
  wrap.appendChild(melBoks);

  // 3 · Vann (preset låser)
  if (!erPreset) {
    // Taket og anbefalingen kommer nå fra motoren, ikke fra en formel gjentatt
    // her. To steder å regne det samme er to steder å komme i utakt.
    // Gulv til 0,1 (ikke hele tall): hydAnbefalt ligger nå på 0,1-rutenett, og et
    // heltallsavrundet tak kunne runde NED under anbefalingen, så «bruk anbefalt»
    // havnet i rød sone. Samme rutenett på begge holder dem i takt.
    const tak = Math.floor(r.tak * 10) / 10;
    const anb = r.hydAnbefalt;
    const lab0 = vannMerke(S.hyd, anb, tak);
    const verdiEl = h('span', { class: 'skyver-verdi' }, gradTxt(S.hyd) + ' %');
    const merkeEl = h('span', { class: 'skyver-klasse', style: 'background:' + lab0.bg + ';color:' + lab0.farge }, lab0.merke);
    const guideEl = h('div', { class: 'konsekvens' }, vannGuide(S.hyd, anb, tak, r));
    // Live-oppdatering UNDER draget (oninput) uten full re-render — så tallet og
    // merkelappen følger fingeren. Selve utregningen skjer på slipp (onchange).
    const oppdaterLive = v => {
      verdiEl.textContent = gradTxt(v) + ' %';
      const m = vannMerke(v, anb, tak);
      merkeEl.textContent = m.merke;
      merkeEl.setAttribute('style', 'background:' + m.bg + ';color:' + m.farge);
      guideEl.textContent = vannGuide(v, anb, tak, r);
      if (vk) vk.className = 'kort sone-' + m.sone;
    };
    const vk = kort('3 · Vann', 'hydrering',
      h('div', { class: 'skyver-topp' }, verdiEl, merkeEl),
      // Taket kan ligge på 88 for en grov blanding. En skyver som stopper på 86
      // kan da ikke nå appens egen anbefaling.
      h('input', { type: 'range', class: 'skyver', min: 62, max: 88, step: 0.5, value: S.hyd,
        oninput: e => oppdaterLive(+e.target.value),
        onchange: e => { S.hyd = +e.target.value; oppdater(); } }),
      // Gramtallet er det man faktisk heller opp, og lå før bare som en bisetning
      // i konsekvenslinja. Nå står det som eget, redigerbart felt: skriver du
      // 700, løses prosenten om (settVannGram i engine.js).
      h('div', { class: 'gramrad' },
        h('span', { class: 'gramrad-lab' }, 'Vann i deigen'),
        gramFelt(r.vannTotal, nyGram => { S.hyd = settVannGram(S, nyGram); oppdater(); }, 'Gram vann'),
        h('span', { class: 'gramrad-enhet' }, 'g')),
      /* Anbefalingen følger melet i bollen. 74 % gjelder siktet butikkmel; kli
         og fullkorn suger 16–19 % mer, og da er 74 % en tørr deig, ikke en
         normal en. */
      h('div', { style: 'font-size:.74rem;color:var(--color-neutral-600);margin-top:6px' },
        r.grovAndel < 0.01
          ? 'Anbefalt ' + gradTxt(anb) + ' % for et frittstående brød på siktet butikkmel.'
          : 'Anbefalt ' + gradTxt(anb) + ' % for melblandingen din — grovt mel og fullkorn suger mer vann enn siktet hvete, så 74 % ville gitt en stram, tørr deig her.'),
      anbefaltKnapp(S.hyd, anb, v => { S.hyd = v; oppdater(); }, ' %'),
      guideEl,
      h('div', { style: 'font-size:.78rem;color:var(--color-neutral-600);margin-top:6px;font-variant-numeric:tabular-nums' }, vannKonsekvens(r)),
      infoUtfelling('hydrering'));
    vk.className = 'kort sone-' + lab0.sone;
    if (S.hyd > tak) vk.appendChild(h('div', { class: 'varsel fare' },
      (r.erBrodform ? 'Melblandingen din (vektet styrke ' + fmt(r.styrkeVektet, 1) + ') tåler anslagsvis ' + gradTxt(tak) + ' % vann. '
                    : 'Et ' + (r.medLokk ? 'emne i gryte med lokk' : 'frittstående emne') + ' av denne melblandingen bærer anslagsvis ' + gradTxt(tak) + ' % før det flyter ut i stedet for å reise seg. ') +
      'Du ligger ' + gradTxt(Math.round((S.hyd - tak) * 10) / 10) + ' pp over — ' + (r.erBrodform ? 'bytt inn sterkere mel eller senk vannet.' : 'bak i brødform, eller senk vannet.')));
    /* Form-nudge (baker-funn): når vannet blandingen TRENGER overstiger det et
       frittstående emne bærer, er det signalet om å bruke form — ikke om å tørke
       ut deigen. Den snur en høy hydrering fra advarsel til begrunnelse for form. */
    if (!r.erBrodform && !r.medLokk && (r.hydBehov > r.takFri + 2 || r.grovAndel > 0.40 || r.rugAndel > 0.25)) {
      vk.appendChild(h('div', { class: 'varsel' },
        'Denne melblandingen trenger ~' + gradTxt(r.hydBehov) + ' % vann for ikke å bake tørr, men et frittstående emne bærer bare ~' + gradTxt(r.takFri) + ' % før det flyter ut. Bak i brødform — da kan du gi deigen vannet den trenger uten at den mister fasongen. (Gryte med lokk hjelper litt, men ikke like mye.)'));
    }
    /* Samme signal MED lokk: gryta gir bare +2 pp over strukturtaket, så en
       blanding som trenger mer enn det, presser fortsatt mot grensen. Før nådde
       denne beskjeden aldri fram i standardoppsettet (lokk er på som standard) —
       brukeren fikk anbefalingen uten å få vite at brødform er det romslige
       valget for blandingen hans (baker-review 01.08). */
    else if (!r.erBrodform && r.medLokk && r.hydBehov > r.takFri + 2) {
      vk.appendChild(h('div', { class: 'varsel' },
        'Denne melblandingen trenger ~' + gradTxt(r.hydBehov) + ' % vann for ikke å bake tørr — mer enn et frittstående emne bærer (~' + gradTxt(r.takFri) + ' %). Gryta med lokk gir litt støtte, så anbefalingen holder seg like under grytetaket. Vil du gi deigen vannet med god margin, er brødform det trygge valget.'));
    }
    wrap.appendChild(vk);
  }

  // 4–6 · Frø, korn, smak
  wrap.appendChild(tilleggSeksjon(r));

  // Dose–respons: hva valgene koster (ovnsløft/smak/saftighet), interpolert fra
  // de målte kurvene i TILLEGG_EFFEKT.
  wrap.appendChild(tegnDoseRespons(r));

  // 7 · Salt (preset låser)
  if (!erPreset) {
    const saltN = S.saltPct != null ? S.saltPct : 1.8;
    const saltVerdiEl = h('span', { class: 'skyver-verdi' }, fmt(saltN, 1) + ' %');
    const sm0 = saltMerke(saltN);
    const saltMerkeEl = h('span', { class: 'skyver-klasse', style: 'background:' + sm0.bg + ';color:' + sm0.farge }, sm0.merke);
    const saltKort = kort('7 · Salt', 'saltPct',
      h('div', { class: 'skyver-topp' }, saltVerdiEl, saltMerkeEl),
      h('input', { type: 'range', class: 'skyver', min: 1.4, max: 2.4, step: 0.1, value: saltN,
        oninput: e => {
          const v = +e.target.value;
          saltVerdiEl.textContent = fmt(v, 1) + ' %';
          const m = saltMerke(v);
          saltMerkeEl.textContent = m.merke;
          saltMerkeEl.setAttribute('style', 'background:' + m.bg + ';color:' + m.farge);
          saltKort.className = 'kort sone-' + m.sone;
        },
        onchange: e => { S.saltPct = +e.target.value; oppdater(); } }),
      h('div', { class: 'konsekvens' }, g0(r.salt) + ' salt. Salt strammer glutenet og bremser gjæren; 1,8–2,0 % er sonen.'),
      anbefaltKnapp(saltN, 1.8, v => { S.saltPct = v; oppdater(); }, ' %'),
      infoUtfelling('saltPct'));
    saltKort.className = 'kort sone-' + sm0.sone;
    wrap.appendChild(saltKort);
  }

  // 8 · Forferment
  wrap.appendChild(tegnForferment(r));
  // 9 · Autolyse — egen boks, ikke en fotnote under «ingen forferment».
  wrap.appendChild(tegnAutolyse(r));
  return wrap;
}

/* Undertekst per mel: hva det GIR først, hva det koster etterpå.
   Linja sa før bare glutenbidraget — «Fortynner», «Bryter ned» — så et helt
   melbibliotek leste som en liste over ting som ødelegger brødet. Hver meltype
   er valgt av en grunn, og den grunnen skal stå først. `MEL_INFO.plus[0]` er
   melets egen begrunnelse; glutenbidraget følger etter som kostnaden. */
function melUndertekst(m, flour, bidrag) {
  const info = (typeof MEL_INFO !== 'undefined') && MEL_INFO[m.id];
  const gir = info && info.plus && info.plus.length ? info.plus[0] : null;
  const deler = [gir, bidrag, flour.protein != null ? fmt(flour.protein, 1) + ' g protein' : null];
  return deler.filter(Boolean).join(' · ');
}

/* Legg til en meltype, og fjern en du ikke vil ha.
   Skriver til `S.melOverstyr`, samme mekanisme som gramredigeringen: fra det
   øyeblikket man rører blandingen er den brukerens, og grovhetstrinnene styrer
   den ikke lenger (varselet rett under sier fra, og tar deg tilbake). */
function tegnMelLeggTil(r) {
  const boks = h('div', { style: 'margin-top:12px' });
  const brukt = new Set(r.mel.map(m => m.id));
  const ledige = FLOURS.filter(f => !brukt.has(f.id));
  if (!ledige.length) return boks;

  if (!S.melVelger) {
    boks.appendChild(h('button', { class: 'btn', style: 'width:100%;font-size:.84rem',
      onClick: () => { S.melVelger = true; oppdater(); } }, '+ Legg til meltype'));
    return boks;
  }
  /* ETT trykk legger melet inn. Første utgave hadde en nedtrekksliste og en
     «legg til»-knapp: man måtte velge, og så bekrefte valget man nettopp gjorde.
     Nå er lista selve handlingen. Favoritter øverst, fordi det er dem man
     som regel er ute etter. */
  boks.appendChild(h('div', { style: 'display:flex;align-items:baseline;gap:8px' },
    h('div', { class: 'felt-label', style: 'flex:1;font-weight:800' }, 'Velg meltype å legge til'),
    h('button', { class: 'btn-ghost', style: 'font-size:.78rem', onClick: () => { S.melVelger = false; oppdater(); } }, 'Avbryt')));

  const leggTil = id => {
    /* Ny meltype kommer inn på 10 % og de andre skaleres til 90 %, så summen
       blir 100 uansett hva den var. 0 % ville gitt en rad som ikke gjorde noe. */
    const grunn = (gyldigOverstyring(S.melOverstyr) || r.melListe).map(m => ({ ...m }));
    const sum = grunn.reduce((s2, m) => s2 + m.pct, 0) || 100;
    S.melOverstyr = grunn.map(m => ({ id: m.id, pct: m.pct / sum * 90 })).concat([{ id, pct: 10 }]);
    S.melVelger = false;
    oppdater();
  };
  const liste = h('div', { class: 'melvelger' });
  const favs = ledige.filter(f => erFavoritt('mel', f.id));
  const rad = f => h('button', { class: 'melvelger-rad', onClick: () => leggTil(f.id) },
    kornTegning(f.id),
    h('span', { style: 'flex:1;min-width:0;text-align:left' },
      h('span', { style: 'display:block;font-weight:700;font-size:.86rem' },
        f.navn, erFavoritt('mel', f.id) ? h('span', { class: 'fav-stjerne' }, '★') : null),
      h('span', { style: 'display:block;font-size:.72rem;color:var(--color-neutral-600)' },
        f.gruppe + ' · ' + fmt(f.protein, 1) + ' g protein')),
    h('span', { style: 'color:var(--color-accent-700);font-weight:800;font-size:1.1rem' }, '+'));
  if (favs.length) {
    liste.appendChild(h('div', { class: 'felt-label', style: 'margin-top:6px' }, 'Favorittene dine'));
    favs.forEach(f => liste.appendChild(rad(f)));
  }
  let gruppe = '';
  ledige.filter(f => !erFavoritt('mel', f.id)).forEach(f => {
    if (f.gruppe !== gruppe) {
      gruppe = f.gruppe;
      liste.appendChild(h('div', { class: 'felt-label', style: 'margin-top:8px' }, gruppe));
    }
    liste.appendChild(rad(f));
  });
  boks.appendChild(liste);
  return boks;
}

/* «Du satte X til N g — hva skal gi etter?»
   Før fordelte appen differansen på de andre meltypene uten å si fra. Det er ett
   rimelig svar av tre, og de to andre er ofte de man mener: at ÉN bestemt meltype
   skal gi etter (rugen er kanskje dosert bevisst), eller at ingen skal det og
   deigen heller får vokse. */
function tegnMelEndring(r) {
  const e = S.melEndring;
  if (!e || !r.mel[e.i]) return null;
  const navn = r.mel[e.i].navn;
  const opp = e.gram > e.fra;
  const diff = Math.abs(Math.round(e.gram - e.fra));
  const boks = h('div', { class: 'varsel', style: 'margin-top:10px' },
    h('div', { style: 'font-weight:800;margin-bottom:2px' },
      navn + ': ' + e.fra + ' → ' + Math.round(e.gram) + ' g'),
    h('div', { style: 'font-size:.8rem;line-height:1.45;margin-bottom:8px' },
      'Deigvekten er fast, så ' + diff + ' g må ' + (opp ? 'tas fra' : 'gå til') +
      ' noe annet. Hva vil du at det skal være?'));
  const velg = (fn) => { fn(); S.melEndring = null; oppdater(); };
  const knapp = (tekst, under, fn) => h('button', { class: 'valgkort', style: 'margin-bottom:6px', onClick: () => velg(fn) },
    h('span', { style: 'flex:1;min-width:0' },
      h('span', { style: 'display:block;font-weight:700;font-size:.86rem' }, tekst),
      h('span', { class: 'undertittel' }, under)));

  boks.appendChild(knapp('De andre meltypene deler på det', 'Alle andre justeres proporsjonalt — blandingsforholdet mellom dem holdes',
    () => { S.melOverstyr = settMelGram(S, e.i, e.gram); }));
  r.mel.forEach((m, j) => {
    if (j === e.i) return;
    boks.appendChild(knapp((opp ? 'Reduser ' : 'Øk ') + m.navn,
      'Bare denne endres — ' + g0(m.gram) + ' ' + (opp ? '−' : '+') + ' ' + diff + ' g. De øvrige står',
      () => { S.melOverstyr = settMelGramMot(S, e.i, e.gram, j); }));
  });
  // Retningen må stå riktig i teksten: reduserer man en meltype og ingen andre
  // skal ta over, KRYMPER deigen — den vokser ikke.
  const nyVekt = settMelGramMerDeig(S, e.i, e.gram).vekt;
  boks.appendChild(knapp('Ingen — la deigen ' + (opp ? 'vokse' : 'krympe'),
    'De andre meltypene står urørt. Brødvekten går ' + S.vekt + ' → ' + nyVekt + ' g/brød',
    () => { const ut = settMelGramMerDeig(S, e.i, e.gram); S.melOverstyr = ut.melOverstyr; S.vekt = ut.vekt; }));
  boks.appendChild(h('button', { class: 'btn', style: 'width:100%;font-size:.82rem;margin-top:2px',
    onClick: () => { S.melEndring = null; oppdater(); } }, 'Avbryt'));
  return boks;
}

function kort(num, infoId, ...barn) {
  const hode = h('div', { class: 'kort-num' }, num);
  if (infoId) hode.appendChild(h('button', { class: 'info-knapp ikon', 'aria-label': 'Info om ' + num, onClick: () => toggleInfo(infoId) }, infoIkon(26)));
  return h('div', { class: 'kort' }, hode, ...barn);
}
function toggleInfo(id) { S.paramInfo = S.paramInfo === id ? null : id; oppdater(); }
function infoUtfelling(id) {
  if (S.paramInfo !== id) return null;
  const pi = (typeof PARAM_INFO !== 'undefined') && PARAM_INFO[id];
  if (!pi) return null;
  const linjer = [];
  if (pi.opt) linjer.push(['OPTIMALT', typeof pi.opt === 'function' ? pi.opt(S) : pi.opt, 'var(--color-accent-2-700)']);
  if (pi.opp) linjer.push(['MER ↑', pi.opp, 'var(--color-accent-700)']);
  if (pi.ned) linjer.push(['MINDRE ↓', pi.ned, 'var(--color-accent-2-700)']);
  if (pi.hvorfor) linjer.push(['HVORFOR', pi.hvorfor, 'var(--color-neutral-600)']);
  return h('div', { class: 'info-boks' }, ...linjer.map(([lab, tekst, farge]) =>
    h('div', { class: 'info-linje' },
      h('span', { class: 'etikett', style: 'color:' + farge }, lab),
      h('span', { class: 'tekst', html: tekst }))));
}

/* ---------- Tillegg (frø / korn / smak) ---------- */
function tilleggSeksjon(r) {
  const grupper = [
    { key: 'fro', tittel: '4 · Frø', filt: t => t.type === 'fro' && !soakerKorn(t.id) },
    { key: 'korn', tittel: '5 · Korn og gryn', filt: t => t.type === 'fro' && soakerKorn(t.id) },
    { key: 'smak', tittel: '6 · Smak og skorpe', filt: t => t.type === 'smak' }
  ];
  const wrap = h('div');
  /* «Hva vil du gjøre med endringen?» — INLINE, øverst i tillegg-seksjonen, rett
     over ingrediensene den handler om. Før var dette en modal som la seg oppå og
     dekket kontrollen man nettopp brukte, og som poppet opp igjen for hvert +/−.
     Nå står valget fast her og oppdaterer seg mens man justerer, så man ser både
     ingrediensen og konsekvensen samtidig. Den vises bare når et tillegg faktisk
     har tatt plass fra melet (tap ≥ 1 g). */
  const komp = tegnKompensasjon(r, false);
  if (komp) wrap.appendChild(komp);
  // Frøvann-konvensjon: bare relevant når det faktisk er frø/korn som binder vann.
  const frov = tegnFrovann(r);
  if (frov) wrap.appendChild(frov);
  grupper.forEach(gr => {
    const items = TILLEGG.filter(gr.filt);
    if (!items.length) return;
    const boks = kort(gr.tittel, null);
    items.forEach(t => boks.appendChild(tilleggRad(t, r)));
    wrap.appendChild(boks);
  });
  return wrap;
}

/* Frøvann-bryter: to måter å håndtere vannet frøene binder på. Standard er
   FORBLØTT (vann på toppen): melet beholder hydreringen sin, frøene får vannet
   sitt i tillegg. Alternativet er TØRRE frø rett i deigen: da trekker frøene
   vann ut av glutenet, og melets effektive hydrering synker. Vises bare når det
   faktisk er frø/korn som binder vann. */
function tegnFrovann(r) {
  if (!(r.froAbsorbert > 0.5)) return null;
  const paaTopp = S.froVannPaaToppen !== false;   // default: forbløtt
  const boks = kort('Frøvann', null);
  boks.appendChild(h('div', { class: 'felt-label' }, 'Hvordan får frøene vannet sitt?'));
  boks.appendChild(h('div', { class: 'piller', style: 'margin-top:4px' },
    h('button', { class: paaTopp ? 'paa' : '', onClick: () => { S.froVannPaaToppen = true; oppdater(); } },
      'Forbløtt — vann på toppen'),
    h('button', { class: paaTopp ? '' : 'paa', onClick: () => { S.froVannPaaToppen = false; oppdater(); } },
      'Tørre frø rett i deigen')));
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:6px' }, paaTopp
    ? 'Du bløtlegger frøene først. Appen legger ' + g0(r.froAbsorbert) + ' vann på toppen, så melet beholder den valgte hydreringen — anbefalt for kornbrød.'
    : 'Frøene går tørre i deigen og trekker ' + g0(r.froAbsorbert) + ' vann ut av glutenet under hevingen. Melets effektive hydrering synker (se tallet under Vann), og deigen blir strammere.'));
  return boks;
}

/* «Hva vil du gjøre med endringen?» — tillegg tar plass i en fast deigvekt, så
   melet faller. Panelet viser hva som faktisk skjedde og tilbyr alternativet:
   øk deigen i stedet, så melmengden blir som uten tillegg. Vannet justeres
   alltid automatisk for det frøene binder. */
function tegnKompensasjon(r, iModal) {
  if (!Object.keys(S.tillegg || {}).length) return null;
  // Referansen er ALLTID «samme bakst uten tillegg og uten kompensasjon». Den er
  // fast, og det er nettopp derfor panelet ikke lenger kan løpe løpsk.
  const r0 = regn(Object.assign({}, S, { tillegg: {}, okDeig: false }));
  const rRa = regn(Object.assign({}, S, { okDeig: false }));
  const tap = r0.melTotal - rRa.melTotal;
  if (tap < 1) return null;
  const paa = !!S.okDeig;
  const nyVekt = Math.round(r.totalVekt / Math.max(S.antall, 1) / 10) * 10;
  const boks = iModal ? h('div', null, h('div', { class: 'kort-num' }, 'Hva vil du gjøre med endringen?'))
                      : kort('Hva vil du gjøre med endringen?', null);
  boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:6px' },
    'Tilleggene tar plass i deigen: uten kompensasjon faller melet ',
    h('b', null, g0(tap)), ' (fra ' + g0(r0.melTotal) + ' til ' + g0(rRa.melTotal) + ').',
    // Bare nevn frø-vann-justeringen når det faktisk er frø/korn som binder vann.
    r.froAbsorbert > 0.5 ? ' Vannet er allerede justert for det frøene binder.' : ''));
  // Ett valg med to tilstander, ikke to knapper som «gjør» noe hver gang de
  // trykkes. Før var «Øk deigen» en handling som skrev til brødvekten — og siden
  // den nye vekten ble grunnlag for neste utregning, kunne den trykkes i det
  // uendelige og deigen vokse hver gang.
  boks.appendChild(h('div', { class: 'piller', style: 'margin-top:10px' },
    h('button', { class: paa ? '' : 'paa', onClick: () => { S.okDeig = false; oppdater(); } }, 'Behold brødvekten'),
    h('button', { class: paa ? 'paa' : '', onClick: () => { S.okDeig = true; oppdater(); } }, 'Øk deigen')));
  boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:8px' }, paa
    ? ['Deigen er økt til ', h('b', null, nyVekt + ' g/brød'), ' (du valgte ' + S.vekt + ' g), så melmengden blir ' + g0(r.melTotal) + ' — som uten tillegg. Brødene blir tilsvarende større.']
    : ['Brødene er ', h('b', null, S.vekt + ' g'), ' som valgt, med ' + g0(r.melTotal) + ' mel — ' + g0(tap) + ' mindre enn uten tillegg. Litt tettere krumme, samme størrelse.']));
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:8px' },
    'Valget kan slås av og på uten at noe går tapt: brødvekten din står urørt på ' + S.vekt + ' g/brød under Størrelse.'));
  // Ingen «Ferdig»-knapp lenger: panelet er ikke en modal, det står inline i
  // tillegg-seksjonen. `iModal` beholdes bare for bakoverkompatibel signatur.
  return boks;
}

function soakerKorn(id) { const s = SOAKERS.find(x => x.id === id); return s && s.korn; }
function tilleggRad(t, r) {
  const pct = (S.tillegg || {})[t.id] || 0;
  const paa = pct > 0;
  const erSmak = t.type === 'smak';
  /* Gram for smakstilleggene lå ikke i `r.fro` — den listen er frø og korn. De
     har hvert sitt felt i motoren (`honningPct` → `r.honning` osv.), og uten
     dette oppslaget viste raden «2,0 % · 0 g» for honning, olje, sukker, smør
     og malt. Verdien fantes hele tiden; den ble bare hentet fra feil sted. */
  const frr = r.fro.find(f => f.id === t.id);
  const smakFelt = erSmak && t.felt ? t.felt.replace(/Pct$/, '') : null;
  const gramV = frr ? frr.gram : (smakFelt && isFinite(r[smakFelt]) ? r[smakFelt] : 0);
  // Sone mot anbefalingen: grønn t.o.m. anbefalt dose, gul over, rød nær taket.
  // Grensene er relative til spennet anbefalt→maks, så de skalerer per tillegg.
  let sone = '', soneOrd = '';
  if (paa) {
    const anb = t.pct || 6, maks = t.max || 30;
    const over = (pct - anb) / Math.max(maks - anb, 0.001);
    if (over >= 0.6) { sone = ' rod'; soneOrd = ' · nær maks — les ⓘ'; }
    else if (over > 0.12) { sone = ' gul'; soneOrd = ' · over anbefalt ' + fmt(anb, erSmak ? 1 : 0) + ' %'; }
  }
  const status = paa
    ? fmt(pct, 1) + ' % · ' + veiG(gramV) + (erSmak ? '' : ' · ' + behandlingOrd(t.id)) + soneOrd
    : 'trykk for å legge til (' + fmt(t.pct, 1) + ' %)';
  const rad = h('div', { class: 'tillegg-rad' + (paa ? ' paa' : '') + sone, 'data-anker': 'tillegg-' + t.id },
    h('div', { style: 'display:flex;align-items:center;gap:8px' },
      // Trykkbar toggle: av → legg til på anbefalt verdi, på → fjern.
      h('button', { class: 'tillegg-toggle', 'aria-pressed': paa ? 'true' : 'false', onClick: () => togglTillegg(t) },
        h('span', { class: 'tillegg-hake' + (paa ? ' paa' : '') }, paa ? '✓' : '+'),
        h('span', { style: 'flex:1;min-width:0' },
          h('span', { style: 'display:block;font-weight:700;font-size:.9rem' }, t.navn),
          h('span', { style: 'display:block;font-size:.74rem;color:var(--color-neutral-600)' }, status))),
      h('button', { class: 'info-knapp ikon', 'aria-label': 'Info om ' + t.navn, onClick: () => { S.tilleggInfo = S.tilleggInfo === t.id ? null : t.id; oppdater(); } }, infoIkon(26))));
  // Finjustering vises bare når tillegget er PÅ.
  if (paa) rad.appendChild(h('div', { style: 'display:flex;align-items:center;gap:8px;margin-top:8px' },
    h('div', { class: 'stepper', style: 'flex:1' },
      h('button', { 'aria-label': 'Mindre', onClick: () => endreTillegg(t, -(erSmak ? 0.5 : 1)) }, '−'),
      h('input', { type: 'text', inputmode: 'decimal', 'aria-label': t.navn + ' prosent', value: fmt(pct, 1), style: 'font-size:1.05rem',
        onblur: e => { const v = parseFloat(e.target.value.replace(',', '.')); settTillegg(t, isNaN(v) ? 0 : v); } }),
      h('button', { 'aria-label': 'Mer', onClick: () => endreTillegg(t, (erSmak ? 0.5 : 1)) }, '+')),
    h('span', { style: 'font-size:.8rem;color:var(--color-neutral-600);font-weight:800' }, '%'),
    // Gramfeltet gjelder ALLE tillegg. Smakstilleggene hadde det ikke, og med
    // et steg på 0,5 prosentpoeng var malt (0,05–0,3 %) i praksis ujusterbar.
    h('div', { style: 'display:flex;align-items:center;gap:4px;flex:0 0 auto' },
      h('input', { type: 'text', inputmode: 'decimal', 'aria-label': t.navn + ' gram',
        value: fmt(gramV, gramV > 0 && gramV < 10 ? 1 : 0),
        style: 'width:60px;min-height:44px;text-align:center;font:inherit;font-weight:800;font-variant-numeric:tabular-nums;background:#fff;border:1px solid var(--color-neutral-300);border-radius:12px',
        onblur: e => { const v = parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')); settTilleggGram(t, isNaN(v) ? 0 : v); } }),
      h('span', { style: 'font-size:.8rem;color:var(--color-neutral-600);font-weight:800' }, 'g'))));
  if (S.tilleggInfo === t.id) {
    const linjer = [];
    if (t.hvorfor) linjer.push(['HVORFOR', t.hvorfor, 'var(--color-neutral-600)']);
    if (t.opt) linjer.push(['OPTIMALT', t.opt, 'var(--color-accent-2-700)']);
    if (t.opp) linjer.push(['MER ↑', t.opp, 'var(--color-accent-700)']);
    if (t.ned) linjer.push(['MINDRE ↓', t.ned, 'var(--color-accent-2-700)']);
    if (t.obs) linjer.push(['OBS', t.obs, 'var(--color-danger)']);
    rad.appendChild(h('div', { class: 'info-boks' }, ...linjer.map(([l, tk, f]) =>
      h('div', { class: 'info-linje' }, h('span', { class: 'etikett', style: 'color:' + f }, l), h('span', { class: 'tekst' }, tk)))));
  }
  return rad;
}
function behandlingOrd(id) {
  const s = SOAKERS.find(x => x.id === id);
  return { rist: 'ristes', bloet: 'bløtlegges', skald: 'skåldes' }[s && s.behandling] || '';
}
function endreTillegg(t, d) { settTillegg(t, ((S.tillegg || {})[t.id] || 0) + d); }
// Trykk på et tillegg: av → legg til på anbefalt verdi (t.pct); på → fjern helt.
function togglTillegg(t) {
  const paa = ((S.tillegg || {})[t.id] || 0) > 0;
  settTillegg(t, paa ? 0 : (t.pct || 6));
}
/* Gram → prosent ved fikspunkt: melmengden faller når tilleggsprosenten stiger,
   så vi itererer pct = gram / melTotal (fire runder er nok — samme som README). */
function settTilleggGram(t, gram) {
  if (!(gram > 0)) { settTillegg(t, 0); return; }
  let pct = ((S.tillegg || {})[t.id]) || t.pct || 6;
  for (let i = 0; i < 5; i++) {
    const prov = regn(Object.assign({}, S, { tillegg: Object.assign({}, S.tillegg, { [t.id]: pct }) }));
    pct = gram / Math.max(prov.melTotal, 1) * 100;
  }
  settTillegg(t, pct);
}
function settTillegg(t, v) {
  // Spørsmålet «hva skal endringen gå ut over» vises nå INLINE i tillegg-
  // seksjonen (ikke som en modal som dekket kontrollen man nettopp brukte, og
  // poppet opp på nytt for hvert +/−). Derfor settes ikke kompSporsmal her lenger.
  S.tillegg = Object.assign({}, S.tillegg);
  const min = t.min || 0, max = t.max || 30;
  v = Math.round(v * 10) / 10;
  if (v <= 0) delete S.tillegg[t.id];
  else S.tillegg[t.id] = Math.min(max, Math.max(min, v));
  oppdater();
}

/* ---------- Forferment (2×2) ---------- */
function tegnForferment(r) {
  const boks = kort('8 · Forferment', null);
  boks.appendChild(h('div', { class: 'rutenett', style: 'margin-top:6px' }, ...FF_TYPER.map(ff => {
    const valgt = (ff.id === 'ingen') ? !S.ff : (S.ff && S.ffType === ff.id);
    return h('button', { class: 'valgkort' + (valgt ? ' paa' : ''), style: 'min-height:78px;flex-direction:column;align-items:flex-start;gap:2px',
      onClick: () => velgFf(ff.id) },
      h('span', { class: 'tittel', style: 'font-size:.98rem' }, ff.navn),
      h('span', { class: 'undertittel', style: 'margin-top:0' }, ff.kort),
      ff.merke ? h('span', { style: 'font-size:.6rem;font-weight:800;color:var(--color-accent-2-700);margin-top:3px' }, ff.merke) : null);
  })));

  // Plan-kobling
  boks.appendChild(h('div', { class: 'varsel', style: 'display:flex;align-items:center;gap:8px' },
    h('span', null, 'Antar planen ', h('b', null, r.plan.navn), '. Forfermentens timer og melandel styres av tidsplanen.'),
    h('button', { class: 'btn-ghost', style: 'margin-left:auto;white-space:nowrap', onClick: () => bytt('tid') }, 'Endre på Tid ›')));

  // Konsekvens + tabell + fordeler/ulemper
  const ff = r.ffT;
  if (S.ff && ff.id !== 'ingen' && r.forferment) {
    const f = r.forferment;
    boks.appendChild(tegnFfTemp(r, f));
    boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:10px' },
      'Tar ', h('b', null, fmt(f.pctMel, 0) + ' %'), ' av melet (', g0(f.mel), ') og modner ', h('b', null, fmtTimer(f.timer)),
      ' ved ', h('b', null, grader(f.temp, 0)), '. Gjærdosen i hoveddeigen faller, og løftet ', h('b', null, (r.loft.tap.ff >= 0 ? '+' : '') + fmt(r.loft.tap.ff, 1)), ' poeng.'));
    boks.appendChild(h('div', { style: 'margin-top:10px' },
      tallrad('Mel', veiG(f.mel)), tallrad('Vann', veiG(f.vann)),
      // Et levain podes med starter, ikke med tørrgjær.
      f.kultur ? tallrad('Moden starter', veiG(f.starter)) : tallrad('Gjær (tørr)', veiG(f.gjaer)),
      tallrad('Modning', fmtTimer(f.timer) + ' ved ' + grader(f.temp, 0)), f.salt > 0.05 ? tallrad('Salt', veiG(f.salt)) : null));
    if (!f.kultur && underVekt(f.gjaer)) boks.appendChild(h('div', { class: 'varsel' },
      'Gjærmengden (' + veiG(f.gjaer) + ') er for liten til å veies pålitelig på kjøkkenvekta di. Løs opp en større mengde i vann og bruk en andel — eller sett vekta til 0,01 g under Størrelse.'));
  } else if (ff.id === 'ingen') {
    boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:10px' }, ff.hvorfor));
  }
  // Fordeler / ulemper
  if (ff.plus && ff.minus) {
    boks.appendChild(h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px' },
      spalte('FORDELER', ff.plus, 'var(--color-accent-2-700)'),
      spalte('ULEMPER', ff.minus, 'var(--color-danger)')));
  }
  return boks;
}
/* Autolyse som eget valg.
   Den lå som en setning under «Ingen forferment» («1 t autolyse i stedet»), og
   var dermed usynlig for alle som BRUKER en forferment — enda kombinasjonen er
   helt vanlig. Den er nå et eget steg med egen varighet i `kjede()`, så den
   skyver tidsplanen slik den faktisk gjør på kjøkkenet. */
function tegnAutolyse(r) {
  const min = S.autolyseMin || 0;
  const paa = min > 0;
  const boks = kort('9 · Autolyse', null);
  boks.appendChild(h('div', { class: 'piller', style: 'margin-top:6px' },
    ...[[0, 'Av'], [30, '30 min'], [60, '1 time'], [120, '2 timer'], [180, '3 timer']].map(([v, navn]) =>
      h('button', { class: min === v ? 'paa' : '', onClick: () => { S.autolyseMin = v; oppdater(); } }, navn))));
  if (paa) boks.appendChild(stepperRad('Minutter', min, 'autolyseMin', 10, 240, 15));
  /* Hva autolysen FAKTISK gjør, med tall for den lengden som er valgt.
     Uten dette så 30 minutter og 2 timer helt like ut, og valget virket som en
     tidsluke uten innhold. Alle tallene kommer fra `autolyseFaktor()` — ingen
     parallell utregning her. */
  if (paa) {
    const a = r.autolyse || { elt: 1, loft: 1, absorpsjon: 0, metning: 0 };
    const utenAuto = regn(Object.assign({}, S, { autolyseMin: 0 }));
    const eltUten = S.eltMin || 13;
    boks.appendChild(h('div', { style: 'margin-top:12px' },
      h('div', { class: 'felt-label', style: 'font-weight:800' }, 'Dette gjør ' + fmtTimer(min / 60) + ' autolyse'),
      tallrad('Elting du trenger', eltUten + ' → ' + r.eltMinAnbefalt + ' min'),
      tallrad('Løftindeks', utenAuto.loft.loft + ' → ' + r.loft.loft),
      tallrad('Deigen kjennes som', 'ca. ' + fmt(S.hyd - a.absorpsjon, 0) + ' % vann (du har ' + S.hyd + ' %)'),
      // De to prosessene hver for seg. Ett samletall skjulte nettopp det
      // spørsmålet folk stiller: hva er forskjellen på 30 minutter og 2 timer?
      tallrad('Hydrering av melet', fmt((a.hydratert != null ? a.hydratert : a.metning) * 100, 0) + ' % ferdig'),
      tallrad('Enzymene (strekkbarhet)', fmt((a.proteolyse || 0) * 100, 0) + ' % ferdig')));
    boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:8px' },
      'Legger ', h('b', null, fmtTimer(min / 60)), ' til totaltiden. ',
      'De to virkningene går i hver sin fart, og det er derfor 30 minutter og 2 timer ikke er samme sak: ',
      h('b', null, 'hydreringen'), ' er nesten ferdig etter en halvtime — melet har drukket seg fullt, deigen er mykere og eltetiden kortere. ',
      h('b', null, 'Enzymene'), ' bruker timer: de klipper glutenet og gjør deigen tydelig mer strekkbar, og det er den forskjellen du kjenner mellom en halvtime og to timer. ',
      'Kort autolyse for lettere elting, lang for strekkbarhet — men ikke lenger enn melet tåler.'));
    boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:8px' },
      h('b', null, 'Gjærmengden endres ikke — og det er riktig. '),
      'Gjæren er ikke i deigen under autolysen, og hevetiden etterpå er den samme, så det er ingenting for gjæren å ta igjen. Det autolysen gir, er at melet er ferdig hydrert og glutenet delvis bygget FØR eltingen begynner. Amylasen frigjør samtidig litt maltose, som gir mer skorpefarge og mat til gjæren sent i hevingen.'));
  } else {
    boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:10px' },
      'Av. Mel, vann, salt og gjær blandes samtidig.'));
  }
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:8px' },
    'Autolyse er mel og vann alene, uten salt og gjær. Melet drikker seg fullt, og enzymene begynner å bryte ned proteinet — glutenet bygger seg selv, så du trenger kortere elting for samme nettverk. Saltet holdes utenfor fordi det strammer glutenet og bremser enzymene; gjæren fordi gjæringen ikke skal starte ennå.'));
  /* Begge samtidig ER meningsfullt, og det er verdt å si HVORDAN — ellers ser
     det ut som to overlappende måter å gjøre det samme på.
     Forfermenten modnes for seg og tilfører smak og syre; autolysen gjelder
     RESTEN av melet og vannet, og bygger gluten uten gjæring. De rører ikke
     hverandre: forfermenten ankres til eltestart, autolysen ligger rett foran
     den. Klassisk baguettemetode er nettopp begge. */
  if (paa && S.ff) boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:8px' },
    'Du har både forferment og autolyse på, og det henger sammen: forfermenten modnes for seg og gir smak, mens autolysen gjelder ',
    h('b', null, 'resten'), ' av melet og vannet og bygger gluten uten at gjæringen starter. Bland forfermenten inn først når autolysen er ferdig, sammen med salt og gjær. Det er den klassiske baguettemetoden.'));
  if (min >= 180) boks.appendChild(h('div', { class: 'varsel fare' },
    'Over ~3 timer begynner proteasene å bryte ned mer enn de bygger, og deigen blir slapp og klissete. Med gjærdeig er 1–3 timer trygt — surdeig tåler langt mindre fordi lav pH vekker proteasene.'));
  return boks;
}

/* Forfermentens temperatur — og hva den faktisk gjør.
   Gjærdosen i forfermenten løses mot temperaturen i motoren, så alt her er
   AVLESNING av modellen, ikke en parallell regel. Den ekvivalente tiden kommer
   fra ffTidEkvivalent() i engine.js. */
function tegnFfTemp(r, f) {
  const boks = h('div', { style: 'margin-top:12px' });
  boks.appendChild(h('div', { class: 'felt-label' }, 'Hvor står forfermenten?'));
  const kald = f.temp <= 12;
  const ffRom = (S.ffRomTemp != null && isFinite(S.ffRomTemp)) ? +S.ffRomTemp : (isFinite(S.romTemp) ? +S.romTemp : 22);
  boks.appendChild(h('div', { class: 'piller', style: 'margin-top:4px' },
    h('button', { class: kald ? '' : 'paa', onClick: () => { S.ffTemp = null; oppdater(); } },
      'I rommet ' + gradTxt(ffRom) + ' °C'),
    h('button', { class: kald ? 'paa' : '', onClick: () => { S.ffTemp = S.kjolskapTemp || 4; oppdater(); } },
      'I kjøleskapet ' + gradTxt(S.kjolskapTemp || 4) + ' °C')));
  /* Kjøleskapstemperaturen er justerbar DER spørsmålet oppstår (Bjørn 01.08:
     «hvor justerer jeg hva kjøleskapet er?» — svaret lå gjemt i Heveplan-kortet
     på Tid). Det er den samme ene målingen som overalt ellers (`kjolskapTemp`),
     og forfermentens temperatur følger med i samme trykk — to tall som drev fra
     hverandre ville betydd to ulike kjøleskap i samme app. */
  if (kald) {
    const kjt = isFinite(S.kjolskapTemp) ? +S.kjolskapTemp : 4;
    const settKjol = v => {
      const nv = Math.min(12, Math.max(1, Math.round(v * 2) / 2));
      S.kjolskapTemp = nv; S.ffTemp = nv; oppdater();
    };
    boks.appendChild(h('div', { class: 'stepper-blokk' },
      h('div', { class: 'felt-label' }, 'Kjøleskapet ditt (lufta i skapet)'),
      h('div', { class: 'stepper' },
        h('button', { 'aria-label': 'Kaldere kjøleskap', onClick: () => settKjol(kjt - 0.5) }, '−'),
        h('input', { type: 'text', inputmode: 'numeric', value: fmt(kjt, 1), 'aria-label': 'Kjøleskapstemperatur',
          onblur: e => { const v = parseFloat(e.target.value.replace(',', '.')); if (!isNaN(v)) settKjol(v); else oppdater(); } }),
        h('button', { 'aria-label': 'Varmere kjøleskap', onClick: () => settKjol(kjt + 0.5) }, '+'))));
  }

  /* EGEN romtemp for forfermenten. Brukeren har bedt om dette gjentatte ganger:
     romtemperaturen ved forfermentering er ofte en annen enn ved bake-ut —
     forfermenten settes kvelden før på et kjøligere kjøkken, mens bake-ut skjer
     på dagen med ovnen på. Derfor et eget, redigerbart tall her, uavhengig av
     «Romtemp der deigen hever» under Tid. Selv når forfermenten står KALDT er
     dette blandetemperaturen (den blandes varm), og den styrer nedkjølingsbanen. */
  boks.appendChild(stepperRad(
    kald ? 'Romtemp den blandes ved' : 'Romtemp der forfermenten står',
    ffRom, 'ffRomTemp', 10, 30, 0.5));
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:2px' },
    'Eget tall for forfermenten, uavhengig av rommet der deigen hever (under Tid).'));

  /* ROMTEMP-HOLD FØR KJØL (kald-start). Bare når forfermenten står kaldt: den
     står en tid i rommet så gjæren kommer i gang, og settes så kaldt. Redigerbar,
     med motorens temperatur-skalerte standard (poolish ~1,5 t, biga ~2 t ved
     21 °C). 0 t = rett i kjøl. */
  if (kald) {
    const rtStd = f.romTidStd || 0;
    const rtNaa = f.romTid || 0;
    boks.appendChild(stepperRad('Timer i romtemp før kjøl', rtNaa, 'ffRomTid', 0, 6, 0.5));
    boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:2px' },
      rtNaa > 0.05
        ? 'La den stå ca. ' + fmtTimer(rtNaa) + ' i romtemp til de FØRSTE boblene viser seg, sett den så i kjøleskapet. Kald-starten får gjæren i gang før kulda bremser den.'
        : 'Rett i kjøl — ingen romtemp-start. Passer lange retarderinger og varme kjøkken.'));
    if (f.egenRomTid && Math.abs(rtNaa - rtStd) > 0.05) boks.appendChild(anbefaltKnapp(rtNaa, rtStd,
      v => { S.ffRomTid = v; oppdater(); }, ' t'));
  }

  // Kald: skapets temperatur står i stepperen rett over — å gjenta tallet her
  // (og peke til Tid) var både dobbelt og, når det ikke var oppdatert, feil.
  boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:10px' },
    kald
      ? 'Forfermenten modnes i kjøleskapet på ' + grader(f.temp, 1) + ' — gjærdosen er løst mot nettopp den temperaturen. Kaldhevingen av selve deigen bruker det samme kjøleskapet.'
      : 'Forfermenten holder rommets temperatur — ' + grader(f.temp, 0) + '.'));

  /* Biga TRIVES svalere (16–18 °C). Motoren klemmer ikke lenger temperaturen ned
     i det stille (det ga «22 i toggelen, 20 i regnestykket»); i stedet et ærlig
     råd når rommet er varmt. Gjærdosen er allerede løst mot den temperaturen du
     ser, så tallet er trygt — dette er kun en smaks-/styrkeanbefaling. */
  if (!kald && f.type === 'biga' && ffRom > 20) {
    boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:8px' },
      'En biga blir best litt svalere enn dette — 16–18 °C gir dypere smak og en sterkere, mer ekstensibel deig. Finner du et kjøligere hjørne (kjeller, nordvendt vindu) er det verdt det. Regner du med ', grader(ffRom, 0), ' er tallene riktige for det; gjæren er løst mot temperaturen du ser.'));
  }

  /* Kald forferment: yngre MED VILJE, ikke «umulig». Den gamle teksten regnet
     isotermt ved kjøleskapstemperatur og påsto at en 16-timers poolish måtte stå
     ~481 timer (20 døgn!) — bak mål. Motoren regner nå med at forfermenten gjærer
     godt mens den kjøles ned de første timene (samme avkjølingsmodell som
     hoveddeigen), så gjærmengden lander der erfarne bakere faktisk kjører den. */
  if (kald) {
    boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:8px' },
      'En kald forferment over natta er MED VILJE yngre og mer aromatisk enn en varm: kulda bremser gjæren mer enn melkesyrebakteriene, så du får mer smaksdybde og litt mindre gassdriv. Den blandes varm og gjærer godt mens den kjøles ned de første timene — derfor holder ',
      h('b', null, veiG(f.gjaer)), ' gjær, ikke den isoterme overdosen. Den ser mindre voluminøs ut enn en varm poolish; det er forventet, ikke et tegn på at den ikke er klar.'));
  } else {
    boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:8px' },
      'Appen løser gjærmengden mot tid og temperatur — derfor står det ', h('b', null, veiG(f.gjaer)), ' gjær.'));
  }

  if (f.temp < 2.5) boks.appendChild(h('div', { class: 'varsel' },
    'Under ~2 °C står gjæringen nesten stille, og tallene blir da mer et anslag enn en beregning.'));

  /* Gjærtaket KLEMMER, det NEKTER ikke. Over ~2 % fersk begynner forfermenten å
     smake gjær; når en svært kald/kort kombinasjon ville krevd mer, stopper appen
     der og sier at forfermenten blir litt yngre — ikke at det er «umulig», og
     ingen 481-timer-knapp. */
  if (f.gjaerPaaTaket) {
    const takFersk = gjaerKonverter(f.gjaerTakPct, r.gjaerType, 'fersk');
    boks.appendChild(h('div', { class: 'varsel' },
      h('b', null, 'Gjæren er kappet på ' + fmt(takFersk, 0) + ' % fersk. '),
      'Så kaldt eller kort som du har satt den, ville full modning krevd litt mer gjær enn det — og over ~' + fmt(takFersk, 0) +
      ' % begynner forfermenten å smake gjær. Appen holder ' + veiG(f.gjaer) + ', og forfermenten blir da litt yngre enn planen regner med. Det er helt brukbart — gi den gjerne noen timer ekstra, eller en litt varmere start, om du vil ha den mer moden.'));
  }
  return boks;
}

function velgFf(id) {
  if (id === 'ingen') { S.ff = false; }
  else { S.ff = true; S.ffType = id; }
  oppdater();
}
function spalte(tittel, punkter, farge) {
  return h('div', null,
    h('div', { style: 'font-size:.68rem;font-weight:800;letter-spacing:.06em;color:' + farge }, tittel),
    ...punkter.map(p => h('div', { style: 'font-size:.78rem;line-height:1.4;margin-top:6px;color:var(--color-neutral-800)' }, '• ' + p)));
}
function tallrad(k, v) { return v == null ? null : h('div', { class: 'tallrad' }, h('span', null, k), h('b', null, v)); }

/* ---------- Dose–respons: «hva valgene koster» — som ± mot normalen ----------
   Baseline er første punkt på hver målekurve (0 % tillegg), så alt vises som
   pluss/minus mot samme brød uten tillegget. Radene deles med totalen i
   deigregnskapet, så de to aldri kan drifte fra hverandre. */
function doseResponsRader() {
  if (typeof TILLEGG_EFFEKT === 'undefined') return [];
  const e = TILLEGG_EFFEKT, til = S.tillegg || {};
  const froPct = TILLEGG.filter(t => t.type === 'fro' && !soakerKorn(t.id)).reduce((s, t) => s + (til[t.id] || 0), 0);
  const honning = til.honning || 0, olje = til.olje || 0, malt = til.malt || 0;
  const d = (xs, ys, x, enh, t) => {
    const delta = interp(xs, ys, x) - ys[0];
    const tone = t === 'noytral' ? 'noytral' : t === 'darlig-opp' ? (delta > 0.01 ? 'darlig' : 'god') : (delta >= -0.01 ? 'god' : 'darlig');
    return { delta, enh, tone };
  };
  const rader = [];
  if (froPct > 0) rader.push({ navn: 'Frø ' + fmt(froPct, 0) + ' %', kilde: e.fro.kilde, verdier: [
    ['Ovnsløft', d(e.fro.pct, e.fro.loftBloet, froPct, '%'), 50],
    ['Smak', d(e.fro.pct, e.fro.smak, froPct, 'p'), 10],
    ['Saftighet', d(e.fro.pct, e.fro.saftighet, froPct, 'p'), 10]] });
  if (honning > 0) rader.push({ navn: 'Honning ' + fmt(honning, 1) + ' %', kilde: e.honning.kilde, verdier: [
    ['Ovnsløft', d(e.honning.pct, e.honning.loft, honning, '%'), 50],
    ['Bruning', d(e.honning.pct, e.honning.bruning, honning, '%', 'noytral'), 200],
    ['Saftighet', d(e.honning.pct, e.honning.saftighet, honning, 'p'), 10]] });
  if (olje > 0) rader.push({ navn: 'Olje ' + fmt(olje, 1) + ' %', kilde: e.fett.kilde, verdier: [
    ['Volum', d(e.fett.pct, e.fett.olje, olje, '%'), 50],
    ['Saftighet', d(e.fett.pct, e.fett.saftighet, olje, 'p'), 10]] });
  if (malt > 0) rader.push({ navn: 'Malt ' + fmt(malt, 2) + ' %', kilde: e.malt.kilde, verdier: [
    ['Ovnsløft', d(e.malt.pct, e.malt.loft, malt, '%'), 50],
    ['Falltall', d(e.malt.pct, e.malt.falltall, malt, 's'), 200],
    ['Gummi', d(e.malt.pct, e.malt.gummi, malt, 'p', 'darlig-opp'), 10]] });
  return rader;
}
function fmtDelta(v) {
  const tall = fmt(Math.abs(v.delta), Math.abs(v.delta) < 10 ? 1 : 0);
  const fortegn = v.delta >= 0.05 ? '+' : v.delta <= -0.05 ? '−' : '±';
  return fortegn + tall + (v.enh === '%' ? ' %' : v.enh === 's' ? ' s' : '');
}
function tegnDoseRespons(r) {
  const boks = kort('Hva valgene koster', null);
  const rader = doseResponsRader();
  if (!rader.length) {
    boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:4px' },
      'Legg til frø, honning, olje eller malt over, så viser panelet hva de koster og gir som pluss og minus mot samme brød uten tillegget — interpolert fra måleserier, ikke gjettet.'));
    return boks;
  }
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:4px' },
    'Hvert tillegg målt mot det samme brødet uten det. Streken i midten er brødet uten tillegget — til høyre er gevinst, til venstre kostnad.'));
  rader.forEach(rad => boks.appendChild(h('div', { style: 'margin-top:10px' },
    h('div', { style: 'font-weight:700;font-size:.86rem;margin-bottom:4px' }, rad.navn),
    ...rad.verdier.map(([lab, v, skala]) => deltaRad(lab, v, skala)),
    h('div', { style: 'font-size:.64rem;color:var(--color-neutral-600);margin-top:4px' }, 'Kilde: ' + rad.kilde))));
  return boks;
}
/* Divergerende søyle: 0 i midten, pluss mot høyre, minus mot venstre. Grønn når
   endringen er en gevinst, rød når den koster, terrakotta når den er nøytral. */
function deltaRad(lab, v, skala) {
  const br = Math.min(50, Math.abs(v.delta) / skala * 50);
  const farge = v.tone === 'god' ? 'var(--color-accent-2-500)' : v.tone === 'darlig' ? 'var(--color-danger)' : 'var(--color-accent-500)';
  return h('div', { style: 'display:flex;align-items:center;gap:8px;margin-top:3px' },
    h('span', { style: 'flex:0 0 74px;font-size:.74rem;color:var(--color-neutral-600)' }, lab),
    h('span', { style: 'flex:1;height:8px;border-radius:4px;background:var(--color-neutral-200);position:relative;overflow:hidden' },
      h('span', { style: 'position:absolute;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;background:var(--color-neutral-400)' }),
      h('span', { style: 'position:absolute;top:0;bottom:0;background:' + farge + ';' + (v.delta >= 0 ? 'left:50%;width:' + br.toFixed(1) + '%' : 'right:50%;width:' + br.toFixed(1) + '%') })),
    h('span', { style: 'flex:0 0 52px;text-align:right;font-size:.74rem;font-weight:700;font-variant-numeric:tabular-nums;color:' + (v.tone === 'darlig' ? 'var(--color-danger)' : 'inherit') }, fmtDelta(v)));
}

/* ---------- Redigerbar heveplan + «løs for» ----------
   Planen som vises er den motoren FAKTISK kjører — altså med rommet ditt og
   kjøleskapet ditt satt inn. Sto tabellens 24 og 3,5 her mens motoren regnet med
   19 og 5, viste editoren tall ingen andre steder i appen brukte. */
function basePlan() {
  const tp = TIDSPLANER.find(t => t.id === S.tid) || TIDSPLANER[0];
  if (Array.isArray(S.heveplan) && S.heveplan.length) return S.heveplan.map(s => ({ ...s }));
  const romT = isFinite(S.romTemp) ? +S.romTemp : 24;
  const kjolT = isFinite(S.kjolskapTemp) ? +S.kjolskapTemp : 4;
  return tp.plan.map(s => ({ ...s,
    miljo: s.miljo <= KALDGRENSE_APP
      ? kjolT
      : Math.max(KALDGRENSE_APP + 0.5, s.miljo + (romT - 24)) }));
}
const KALDGRENSE_APP = 12;
function redigerTrinn(i, felt, val) {
  const p = basePlan();
  if (felt !== 'navn' && felt !== 'utbakt') { val = parseFloat(String(val).replace(',', '.')); if (isNaN(val)) return; }
  if (p[i]) p[i][felt] = felt === 'timer' ? Math.max(0.05, val) : val;
  S.heveplan = p; oppdater();
}
function fjernTrinn(i) { const p = basePlan(); if (p.length <= 1) return; p.splice(i, 1); S.heveplan = p; oppdater(); }
// Nytt trinn er som standard et varmt bulk-trinn (ikke utbakt) — ikke arvet kaldt/utbakt.
function leggTilTrinn() { const p = basePlan(); p.push({ navn: 'Nytt trinn', timer: 2, miljo: 24, utbakt: false }); S.heveplan = p; oppdater(); }
function tegnHeveplan(r) {
  const boks = kort('Heveplan', null);
  const trinn = basePlan();
  /* Har man redigert planen, er den EGENDEFINERT — og det skal stå, ikke bare
     antydes ved at tallene ikke lenger stemmer med kortet man valgte. */
  if (S.heveplan) {
    const grunn = TIDSPLANER.find(t => t.id === S.tid);
    boks.appendChild(h('div', { class: 'varsel', style: 'margin-top:6px' },
      h('div', { style: 'font-weight:800;margin-bottom:2px' }, 'Egendefinert tidsplan'),
      h('div', { style: 'font-size:.8rem;line-height:1.45' },
        'Du har endret trinnene, så dette er ikke lenger «' + (grunn ? grunn.navn : 'planen') +
        '» slik den er kalibrert. Gjærmengden er løst om mot dine egne trinn — ' +
        veiG(r.gjaerTotal) + ' (' + fmt(r.gjaerTorr, 3) + ' %).'),
      h('button', { class: 'btn', style: 'margin-top:8px;width:100%;font-size:.82rem',
        onClick: () => { S.heveplan = null; oppdater(); } },
        'Tilbake til ' + (grunn ? grunn.navn : 'planens standard'))));
    /* Er planen for kort til at gjæren rekker det? Da står dosen på taket, og da
       er svaret matematisk riktig og fysisk umulig — gjær har en maksfart.
       Appen skal si det, men ikke nekte: en kort plan er et gyldig valg, den gir
       bare et annet brød. */
    const paaTaket = r.gjaerTorr >= GJAER_TAK_TORR - 0.001;
    const sumT = trinn.reduce((s2, t) => s2 + (t.timer || 0), 0);
    if (paaTaket) boks.appendChild(h('div', { class: 'varsel fare' },
      h('b', null, 'For kort for gjæren. '),
      'Planen din gir ' + fmtTimer(sumT) + ' heving, og selv med gjæren på taket (' +
      fmt(GJAER_TAK_TORR, 2) + ' % tørrgjær) rekker ikke deigen måldosen. Over dette taket får du gjærsmak og dårligere løft i stedet for mer heving. Brødet blir bakt, men tettere og mindre smakfullt enn planen sikter mot — gi den en time eller to til, eller sett trinnene varmere.'));
    else if (sumT < 1.5) boks.appendChild(h('div', { class: 'varsel' },
      'Under halvannen time samlet heving er svært kort. Det går, men regn med tett krumme og lite smak — det meste av både smaken og strukturen kommer av tid.'));
  }
  /* Rommet og kjøleskapet. Dette er MÅLINGER, ikke valg — derfor endrer de ikke
     planen til «egendefinert». Planen er de timene du gir deigen; rommet er
     bare den virkeligheten timene skjer i, og den er ikke 22 grader hele året.
     Trinnene forskyves med differansen mot tabellens nominelle 24 °C, slik at et
     trinn planen legger over romtemp fortsatt ligger over DITT rom. */
  const rt = isFinite(S.romTemp) ? +S.romTemp : 22;
  const kjt = isFinite(S.kjolskapTemp) ? +S.kjolskapTemp : 4;
  /* Det SVALE stedet er den tredje målingen (Bjørn 01.08: «16 grader er vel
     kanskje middels — vi trenger kanskje en til parameter»): kjelleren, boden,
     garasjen — der bigaen trives og en heving kan bremses uten kjøleskap. */
  const svt = isFinite(S.svalTemp) ? +S.svalTemp : 16;
  boks.appendChild(miniStepper('Romtemp der deigen hever', rt, 'romTemp', 14, 30, 0.5, ' °C'));
  boks.appendChild(miniStepper('Kjøleskapet ditt', kjt, 'kjolskapTemp', 1, 12, 0.5, ' °C'));
  boks.appendChild(miniStepper('Svalt sted (kjeller/bod)', svt, 'svalTemp', 8, 20, 0.5, ' °C'));
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:4px' },
    'Begge er målinger, ikke valg: å skru på dem gjør ikke planen egendefinert — den blir den først når du endrer hvor lenge et trinn står. Gjærmengden løses om automatisk mot temperaturene du oppgir.'));
  trinn.forEach((tr, i) => {
    const kaldt = tr.miljo <= KALDGRENSE_APP;
    /* Tre soner, ikke to: 16 °C er verken kjøleskap eller romtemperatur — det er
       svalt (kjeller/sval bod, der bigaen trives). Med bare kaldt/varmt fikk
       16 °C merkelappen «varmt», som leste som feil (Bjørn 01.08). Grensene:
       ≤12 kaldt (samme KALDGRENSE som motoren), 12–18 svalt, >18 varmt. */
    const svalt = !kaldt && tr.miljo <= 18;
    boks.appendChild(h('div', { style: 'border-top:1px solid var(--color-neutral-200);padding:9px 0' },
      h('div', { style: 'display:flex;align-items:center;gap:8px' },
        h('span', { class: 'pille', style: kaldt ? 'background:var(--color-accent-2-100);color:var(--color-accent-2-700)'
          : svalt ? 'background:var(--color-neutral-200);color:var(--color-neutral-700)'
          : 'background:var(--color-accent-100);color:var(--color-accent-700)' }, kaldt ? 'kaldt' : svalt ? 'svalt' : 'varmt'),
        h('input', { type: 'text', value: tr.navn, 'aria-label': 'Trinnnavn', style: 'flex:1;border:none;background:none;font:inherit;font-weight:700;font-size:.86rem;min-width:0', onblur: e => redigerTrinn(i, 'navn', e.target.value) }),
        trinn.length > 1 ? h('button', { class: 'info-knapp', 'aria-label': 'Fjern trinn', onClick: () => fjernTrinn(i) }, '×') : null),
      // Timer og Miljø UNDER hverandre, ikke side ved side: to felt på delt
      // bredde ble trange på 390 px, og etikettene fløt sammen med naboens tall.
      h('div', { style: 'display:flex;flex-direction:column;gap:6px;margin-top:6px' },
        trinnFelt('Timer', tr.timer, 't', v => redigerTrinn(i, 'timer', v)),
        trinnFelt('Miljø', tr.miljo, '°C', v => redigerTrinn(i, 'miljo', v))),
      // Hurtigvalg for hvor deigen står: kjøleskapet, det svale stedet eller rommet.
      // Kortere etiketter («Kjøleskap 3,5°», ikke «Kjøleskapet 3,5 °C») og
      // nowrap: tre knapper på 390 px brakk ellers til to linjer (Bjørn 01.08).
      h('div', { class: 'piller', style: 'margin-top:6px' },
        h('button', { class: Math.abs(tr.miljo - kjt) < 0.3 ? 'paa' : '', style: 'font-size:.74rem;white-space:nowrap;flex:1;padding-left:4px;padding-right:4px', onClick: () => redigerTrinn(i, 'miljo', kjt) }, 'Kjøleskap ' + gradTxt(kjt) + '°'),
        h('button', { class: Math.abs(tr.miljo - svt) < 0.3 ? 'paa' : '', style: 'font-size:.74rem;white-space:nowrap;flex:1;padding-left:4px;padding-right:4px', onClick: () => redigerTrinn(i, 'miljo', svt) }, 'Svalt ' + gradTxt(svt) + '°'),
        h('button', { class: Math.abs(tr.miljo - rt) < 0.3 ? 'paa' : '', style: 'font-size:.74rem;white-space:nowrap;flex:1;padding-left:4px;padding-right:4px', onClick: () => redigerTrinn(i, 'miljo', rt) }, 'Rommet ' + gradTxt(rt) + '°')),
      // Eksplisitt utbakt-toggle: styrer om emnet er formet (kjøles som ett emne,
      // uten lokk) — en modellforskjell som ikke kan avledes av temperaturen alene.
      h('label', { style: 'display:flex;align-items:center;gap:8px;margin-top:8px;font-size:.78rem;color:var(--color-neutral-700);cursor:pointer' },
        h('input', { type: 'checkbox', checked: tr.utbakt ? 'checked' : null, style: 'width:20px;height:20px;accent-color:var(--color-accent-500)',
          onchange: e => redigerTrinn(i, 'utbakt', e.target.checked) }),
        'Utbakt i hevekurv (formet emne, ikke bulk i boks)'),
      /* En kaldheving på minutter er ikke en kaldheving — deigen rekker knapt å
         begynne nedkjølingen (tau er 3–5 timer for en boks). Vindu-fittingen kan
         klemme trinnet dit; da skal appen SI det, ikke servere «0,3 t på kjøl»
         som om det var en plan (Bjørn 01.08). */
      kaldt && tr.timer < 1 ? h('div', { class: 'varsel', style: 'margin-top:8px' },
        h('b', null, fmtTimer(tr.timer) + ' på kjøl gjør nesten ingenting. '),
        'Deigen rekker knapt å begynne nedkjølingen (en boks bruker 3–5 timer). Gi trinnet minst et par timer — smaken bygges først etter 6+ — eller ta det bort og la tiden gå til et varmt trinn.') : null));
  });
  boks.appendChild(h('div', { style: 'display:flex;gap:8px;margin-top:10px' },
    h('button', { class: 'btn', style: 'flex:1', onClick: () => leggTilTrinn() }, '+ Trinn'),
    S.heveplan ? h('button', { class: 'btn', style: 'flex:1', onClick: () => { S.heveplan = null; oppdater(); } }, 'Tilbakestill til planens standard') : null));
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:8px' },
    'Gjærmengden løses automatisk mot måldosen (', h('b', null, fmt(r.maalDose, 2)), '), uansett hvordan du setter trinnene. Rediger timer, temperatur og utbakt for å styre hvor mye av gjæringen som skjer varmt vs. kaldt — grafen og «andel av gjæringen» under regnes om.'));
  return boks;
}
function trinnFelt(lab, val, enhet, onSet) {
  return h('div', { style: 'flex:1' },
    h('div', { class: 'felt-label' }, lab),
    h('div', { style: 'display:flex;align-items:center;gap:4px;margin-top:2px' },
      h('input', { type: 'text', inputmode: 'decimal', 'aria-label': lab, value: gradTxt(val),
        style: 'width:100%;min-height:40px;text-align:center;font:inherit;font-weight:700;font-variant-numeric:tabular-nums;background:var(--color-neutral-100);border:1px solid var(--color-neutral-300);border-radius:10px', onblur: e => onSet(e.target.value) }),
      h('span', { style: 'font-size:.75rem;color:var(--color-neutral-600)' }, enhet)));
}

/* ---------- Rate-tabell: gjæringsfart mot temperatur ---------- */
function tegnRateTabell() {
  if (typeof rateFactor !== 'function') return null;
  const boks = kort('Gjæringsfart mot temperatur', null);
  const temps = [4, 8, 12, 16, 20, 24, 28, 32, 36];
  boks.appendChild(h('div', { style: 'margin-top:4px' }, ...temps.map(T => {
    const rel = rateFactor(T);
    return h('div', { style: 'display:flex;align-items:center;gap:8px;margin-top:3px' },
      h('span', { style: 'flex:0 0 46px;font-size:.76rem;font-variant-numeric:tabular-nums' }, grader(T, 0)),
      h('span', { style: 'flex:1;height:7px;border-radius:4px;background:var(--color-neutral-200);overflow:hidden' },
        h('span', { style: 'display:block;height:100%;width:' + Math.min(100, rel / rateFactor(36) * 100).toFixed(0) + '%;background:var(--color-accent-500)' })),
      h('span', { style: 'flex:0 0 52px;text-align:right;font-size:.76rem;font-weight:700;font-variant-numeric:tabular-nums' }, '×' + fmt(rel, 2)));
  })));
  const naa = S.startTemp || 24;
  const dbl = (typeof doublingInterval === 'function') ? doublingInterval(naa) : null;
  /* Modellens optimum (der raten topper) skannes fram, så meldingen kan si
     hvor det ligger. `doublingInterval` er null både PÅ optimum OG godt under
     det — raten topper på ~1,8× og når aldri det dobbelte av 24 °C-raten. Å
     kalle 24 °C «nær optimum» er feil: man står 11–12 °C under, og mer varme
     hjelper faktisk. De to tilfellene skilles nå ad. */
  let optT = naa, optR = rateFactor(naa);
  for (let T = 0; T <= 44; T += 0.5) { const R = rateFactor(T); if (R > optR) { optR = R; optT = T; } }
  const relNaa = rateFactor(naa) || 1e-9;
  const melding = dbl
    ? 'Fra ' + grader(naa, 0) + ' må du ' + fmt(dbl, 1) + ' °C opp for å doble farten.'
    : (naa >= optT - 0.5
        ? 'Du er på eller over optimum (rundt ' + grader(optT, 0) + ') — mer varme gjør ikke farten høyere.'
        : 'Mer varme hjelper opp mot optimum rundt ' + grader(optT, 0) + ', men farten topper på ×' + fmt(optR / relNaa, 1) + ' herfra og dobler seg aldri helt.');
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:8px' },
    'Relativt til 24 °C (×1,00). ' + melding));
  return boks;
}

/* ---------- Konsekvenstekster ---------- */
function klasseStil(kort) {
  const m = { 'Fint': 'background:var(--color-accent-100);color:var(--color-accent-700)',
    'Halvgrovt': 'background:var(--color-accent-2-100);color:var(--color-accent-2-700)',
    'Grovt': 'background:var(--color-accent-200);color:var(--color-accent-900)',
    'Ekstra grovt': 'background:var(--color-accent-2-200);color:var(--color-accent-2-900)' };
  return m[kort] || m['Halvgrovt'];
}
/* Konsekvensteksten hentes fra TRINNET man står på, ikke fra en grovsortering.
   Den gamle varianten bøttet på klasse, og siden både 10 % og 25 % er «fint
   brød» fikk de nøyaktig samme setning — to ulike valg som så like ut.
   Nå eier hvert trinn sin egen beskrivelse i `GROVHET`, og løftkostnaden legges
   til fra den faktiske utregningen. */
function grovKonsekvens(r) {
  const g = S.grov ?? 0, t = Math.round(r.loft.tap.grov);
  const trinn = GROVHET.slice().sort((a, b) =>
    Math.abs(parseFloat(a.kort) - g) - Math.abs(parseFloat(b.kort) - g))[0];
  const naer = trinn && Math.abs(parseFloat(trinn.kort) - g) < 0.5;
  const basis = naer ? trinn.om : 'Mellom to trinn: ' + fmt(g, 0) + ' % grovt mel, ' +
    (r.brodskala.kort || '').toLowerCase() + ' på Brødskala\'n.';
  return t >= 1 ? basis + ' Koster ca. ' + t + ' løftpoeng mot ren loff.' : basis;
}
/* Saltsonen er 1,8–2,0 % (samme tall som konsekvensteksten under skyveren). */
/* `sone` er grønn/gul/rød og brukes til å farge HELE kortet, ikke bare pillen.
   Merkelappen alene var for svakt signal — er du over anbefalt nivå, er det
   kortets tilstand. */
function saltMerke(v) {
  if (v >= 1.8 && v <= 2.0) return { merke: 'I SONEN', sone: 'gronn', bg: 'var(--color-accent-2-100)', farge: 'var(--color-accent-2-700)' };
  if (v >= 1.6 && v <= 2.2) return { merke: 'UTENFOR SONEN', sone: 'gul', bg: '#f6ecd2', farge: '#7a5a12' };
  return { merke: 'LANGT UTENFOR', sone: 'rod', bg: '#f6ddd6', farge: 'var(--color-danger)' };
}
/* Merkelappene måles MOT melblandingen, ikke mot faste tall.
   68/71/77/82 var absolutte, og på en grov blanding sa de «LØST» og «OVER TAKET»
   om nettopp den hydreringen appen selv anbefaler — fordi kli suger vannet og
   deigen ikke er løs i det hele tatt. Nå ligger grensene i forhold til
   anbefalingen og melets eget tak, så en 86 % fullkorndeig leses som «i vinduet»
   mens en 86 % loff fortsatt leses som over taket.
   Med standardmelet (anbefalt 74, tak 82) gir det nøyaktig de gamle grensene. */
function vannSoner(anb, tak) {
  anb = isFinite(anb) ? anb : 74;
  tak = isFinite(tak) ? tak : 82;
  return { stramt: anb - 6, trygt: anb - 3, vindu: Math.min(anb + 3, tak), lost: tak };
}
function vannMerke(hyd, anb, tak) {
  const s = vannSoner(anb, tak);
  if (hyd <= s.stramt) return { merke: 'STRAMT', sone: 'gul', bg: 'var(--color-neutral-200)', farge: 'var(--color-neutral-700)' };
  if (hyd <= s.trygt) return { merke: 'TRYGT', sone: 'gronn', bg: 'var(--color-accent-2-100)', farge: 'var(--color-accent-2-700)' };
  if (hyd <= s.vindu) return { merke: 'I VINDUET', sone: 'gronn', bg: 'var(--color-accent-2-200)', farge: 'var(--color-accent-2-900)' };
  if (hyd <= s.lost) return { merke: 'LØST', sone: 'gul', bg: 'var(--color-accent-200)', farge: 'var(--color-accent-900)' };
  return { merke: 'OVER TAKET', sone: 'rod', bg: 'var(--color-accent-300)', farge: 'var(--color-accent-900)' };
}
/* `r` avgjør hvilket OPPSETT teksten lover for. «I vinduet» sa «frittstående
   brød» uansett — også når taket anbefalingen var regnet mot, var gryte-med-
   lokk-taket eller brødformens. Det var nettopp det som forvirret: appen så ut
   til å påstå at 78 % var frittstående-realistisk (baker-review 01.08: det er
   det ikke — frittstående-taket for samme blanding er lavere). */
function vannGuide(hyd, anb, tak, r) {
  const s = vannSoner(anb, tak);
  const oppsett = !r ? 'brød med oppsettet ditt'
    : r.erBrodform ? 'brød i brødform'
    : r.medLokk ? 'brød stekt i gryte med lokk'
    : 'frittstående brød';
  if (hyd <= s.stramt) return 'Stramt: fast deig som er lett å håndtere og forme, men tettere krumme med mindre uregelmessige hull. Trygt for nybegynnere og grovt mel.';
  if (hyd <= s.trygt) return 'Trygt: deigen holder formen godt, gir jevn krumme og reiser seg villig. Et godt utgangspunkt før du skrur oppover.';
  if (hyd <= s.vindu) return 'I vinduet: her ligger de fleste ' + oppsett + ' på denne melblandingen — åpen, saftig krumme uten at deigen flyter ut. Krever litt stø hånd i formingen.';
  if (hyd <= s.lost) return 'Løst: våt, klissete deig som gir stor, hullete krumme og sprø skorpe — men den vil helst støttes av form eller kurv, og trenger sterkt mel.';
  return 'Over taket: mer vann enn denne melblandingen holder på, så deigen flyter ut i stedet for å reise seg. Bruk form, brett ofte under heving, og regn med tettere bunn.';
}
function vannKonsekvens(r) {
  const eff = r.effektivHydrering * 100;
  const harFro = r.froAbsorbert > 0.5;
  // Uten frø/korn: rett fram, ingen frø-snakk.
  if (!harFro) return 'Deigen ligger på ' + pst(eff, 1) + ' hydrering.';
  /* Med frø, men UTEN vann på toppen: da tar frøene faktisk fra deigvannet, og
     melets effektive hydrering SYNKER under det valgte. Da er «stjeler»-språket
     riktig. (I dag finnes ingen UI-bryter for dette, men motoren støtter det.) */
  if (r.froVannPaaToppen === false) {
    return 'Frøene tar ' + g0(r.froAbsorbert) + ' fra deigvannet, så melet sitter igjen med '
      + pst(eff, 1) + ' effektiv hydrering — regn med en stram deig. Bløtlegg frøene og legg vannet på toppen om du vil beholde den valgte hydreringen.';
  }
  /* Standard (vann på toppen): melet BEHOLDER sin hydrering — frøene er forbløtt
     og får vannet sitt i tillegg. Tallet skal derfor IKKE synke; det var den
     gamle teksten som var selvmotsigende («effektiv 77 %, frøene stjeler 12 pp»
     samtidig). Vi viser melets hydrering som hovedtall og samlet deigfukt (alt
     vann mot alt tørt, frø medregnet) som et eget, sekundært tall. */
  const seedDry = (r.fro || []).reduce((s, f) => s + (f.gram || 0), 0);
  const vannMedStarter = r.vannTotal + (r.starterVann || 0);
  const deigfukt = vannMedStarter / Math.max(r.sumTort + seedDry, 1) * 100;
  return 'Melet jobber på ' + pst(eff, 1) + ' hydrering. Frøene binder ' + g0(r.froAbsorbert)
    + ' vann i tillegg, så samlet deigfukt er ' + pst(deigfukt, 1)
    + '. Vannet deres er lagt på toppen, så melet beholder hydreringen sin gjennom hevingen.';
}

/* ============================================================
   3 · TID
   ============================================================ */
function tegnTid(r, K) {
  const wrap = h('div');
  const ferdigMs = S.ferdigMs != null ? S.ferdigMs : standardFerdig();

  // Ferdig/Start-veksler + tidsstepper
  const kort1 = h('div', { class: 'kort' });
  kort1.appendChild(h('div', { class: 'toggle2' },
    h('button', { class: S.tidModus === 'ferdig' ? 'paa' : '', onClick: () => { S.tidModus = 'ferdig'; oppdater(); }       /* «man» og «lør» i småbokstaver midt i en knapp leses som stavefeil.
         Her er det ikke plass til hele ukedagen, så den står i store bokstaver:
         MAN, LØR. Da er den åpenbart en forkortelse og ikke et halvt ord. */
}, 'Ferdig ' + ukedagKort(ferdigMs).toUpperCase() + ' ' + klHM(ferdigMs)),
    // «Start nå» ankrer kjeden til NÅ: ferdig settes til nå + total tid. Uten
    // dette viste den bare starttiden som fulgte av gammelt ferdigtidspunkt —
    // og nå-markøren i grafen hadde ingenting ekte å peke på.
    // I EGENDEFINERT VINDU er ferdig-tidspunktet brukerens harde grense og skal
    // ALDRI flyttes av en nå-knapp: der betyr «Start nå» at vinduet begynner nå,
    // og appen refitter planen innenfor samme ferdig (Bjørn 01.08).
    h('button', { class: S.tidModus === 'start' ? 'paa' : '', onClick: () => {
      if (S.tidModus === 'vindu') { settVindu(Date.now(), ferdigMs); return; }
      S.tidModus = 'start'; S.ferdigMs = Date.now() + K.tilOvnenT * 3600000; oppdater();
    } }, 'Start nå')));
  const erStart = S.tidModus === 'start';
  const startMs = K.start.getTime();
  const visMs = erStart ? startMs : ferdigMs;
  kort1.appendChild(h('div', { class: 'tidstepper' },
    h('button', { onClick: () => flyttFerdig(-60) }, '−'),
    h('div', { class: 'midt' },
      h('div', { class: 'kl' }, klHM(visMs)),
      h('div', { class: 'note' }, erStart ? 'her setter du deigen i gang' : 'ut av ovnen')),
    h('button', { onClick: () => flyttFerdig(60) }, '+')));
  // Direkte valg av dato og klokkeslett for ferdig — ±-knappene er for
  // finjustering, ikke for å flytte seg tre døgn fram.
  if (!erStart && S.tidModus !== 'vindu') kort1.appendChild(h('div', { style: 'margin-top:10px' },
    h('div', { class: 'felt-label' }, 'Eller velg dato og klokkeslett ferdig'),
    datoTidVelger(ferdigMs, t => { S.ferdigMs = t; oppdater(); }, 'Ferdig')));

  // Start → ferdig, alltid begge ender med ukedag og dato, så det er tydelig
  // hvilket døgn du starter og hvilket du er ferdig (baken går over døgnskiller).
  const forsteNavn = (K[0] && K[0].navn) ? K[0].navn.toLowerCase() : 'første steg';
  const spenn = dagSpenn(startMs, ferdigMs);
  /* Ukedag, dato og klokkeslett i EGNE kolonner, ikke som én tekstlinje.
     Sto det «Fredag 31. juli, kl. 19:57» over «Lørdag 1. august, kl. 17:00»,
     havnet ingenting under hverandre: ukedagene har ulik lengde, så datoen og
     klokkeslettet forskjøv seg for hver rad, og øyet fikk ingen kolonne å
     sammenligne i. Nå er de fire cellene i et rutenett med faste kolonner —
     dagen under dagen, datoen under datoen, klokkeslettet under klokkeslettet. */
  const tidRad = (merke, klasse, ms, under) => h('div', { class: 'tid-rad' },
    h('span', { class: 'tid-merke ' + klasse }, merke),
    h('span', { class: 'tid-dag' }, ukedagLang(ms)),
    h('span', { class: 'tid-dato' }, datoKort(ms)),
    h('span', { class: 'tid-kl' }, klHM(ms)),
    h('span', { class: 'tid-under' }, under));
  /* Streken mellom radene viser strekningen MELLOM dem — tilOvnenT, ikke
     totalen med nedkjøling (to skjermer sa ulike tall for samme spenn,
     ux-review 01.08). Nedkjølingen har fått egen rad: «ferdig» i tittelens
     forstand er når brødet kan skjæres, ikke når det kommer ut av ovnen. */
  const oppsum = h('div', { class: 'tid-oppsum' },
    tidRad('STARTER', 'start', startMs, 'du begynner: ' + forsteNavn),
    h('div', { class: 'tid-strek' }, h('span', null, '↓ ' + fmt(K.tilOvnenT, 1) + ' t fra start til ut av ovnen')),
    tidRad('UT AV OVNEN', 'ferdig', ferdigMs, 'brødet er stekt og skal kjøle'),
    h('div', { class: 'tid-strek' }, h('span', null, '↓ ' + fmt(K.kjolT, 1) + ' t nedkjøling på rist')),
    tidRad('KLAR', 'ferdig', ferdigMs + K.kjolT * 3600000, 'avkjølt — nå kan det skjæres'));
  /* Ukedagene skrives ut, ikke forkortet til «fre» og «lør» midt i en setning.
     Der leste de som ord man snublet i; skrevet helt ut er de det man faktisk
     trenger å få med seg. */
  if (spenn >= 1) oppsum.appendChild(h('div', { class: 'tid-doegn' },
    spenn === 1 ? ['Baken går over natta — du starter ', h('b', null, ukedagLang(startMs).toLowerCase()),
                   ' og er ferdig ', h('b', null, ukedagLang(ferdigMs).toLowerCase()), '.']
      : ['Baken går over ' + spenn + ' døgn — du starter ', h('b', null, ukedagLang(startMs).toLowerCase()),
         ' og er ferdig ', h('b', null, ukedagLang(ferdigMs).toLowerCase()), '.']));
  kort1.appendChild(oppsum);
  wrap.appendChild(kort1);

  // Plan-kort
  TIDSPLANER.forEach(tp => {
    const paa = tp.id === S.tid;
    /* Forhåndsvisningen må vise det KLIKKET gir. Den dro med seg `S.heveplan`,
       så alle fire kortene viste dine egne trinn — mens klikket nullstiller dem.
       Ekspress og Optimal så da like lange ut. */
    const fv = (paa && !S.heveplan) ? { prov: r, pK: K } : planForhaandsvis(tp.id, ferdigMs);
    const prov = fv.prov, pK = fv.pK;
    // Etiketten leses fra EFFEKTIV tilstand (samme kilde som tallene), ikke fra
    // planens statiske forferment-spec (teknisk #5).
    const sub = (prov.ffPaa ? prov.ffT.navn.toLowerCase() + ' ' + prov.ffInn.pctMel + ' %' : 'ingen forferment') +
      ' · gjær ' + fmt(prov.gjaerTorr, 3) + ' % = ' + fmt(prov.gjaerTotal, 2) + ' g';
    wrap.appendChild(h('button', { class: 'valgkort plan-valg' + (paa && S.tidModus !== 'vindu' ? ' paa' : ''), onClick: () => { S.tid = tp.id; S.heveplan = null; if (S.tidModus === 'vindu') S.tidModus = 'ferdig'; oppdater(); } },
      h('div', { class: 'plankort' },
        h('div', { style: 'flex:1;min-width:0' },
          // «t til ovnen», ikke totalen: nedkjølingen er den samme for alle
          // planer og skjulte forskjellen mellom dem.
          h('div', null, h('span', { class: 'p-navn' }, tp.navn),
            h('span', { class: 'p-tid' }, fmt(pK.tilOvnenT, 1) + ' t til ovnen')),
          h('div', { class: 'p-sub' }, sub)),
        h('div', { class: 'p-loft' }, h('div', { class: 'v' }, String(prov.loft.loft)), h('div', { class: 'l' }, 'LØFT')))));
  });

  /* EGENDEFINERT VINDU — du setter start og slutt, appen fyller resten.
     Egen komponent (div med en knapp inni), ikke ett stort <button>, fordi
     dato-velgerne under må kunne trykkes uten å ligge inne i en knapp. */
  {
    const vinduPaa = S.tidModus === 'vindu';
    const startNaa = S.vinduStart != null ? S.vinduStart : Date.now();
    /* Kolonne, ikke .valgkort-radens flex: dato- og tidsvelgerne skal ligge på
       FULL bredde under teksten. I raden sto de klemt ved siden av den og
       presset kortet bredere enn skjermen (Bjørns skjermbilde 01.08). */
    const egen = h('div', { class: 'valgkort plan-valg' + (vinduPaa ? ' paa' : ''), style: 'flex-direction:column;align-items:stretch' });
    egen.appendChild(h('button', { style: 'all:unset;display:block;width:100%;box-sizing:border-box;cursor:pointer;padding:14px 16px',
      onClick: () => { if (vinduPaa) return; S.tidModus = 'vindu'; settVindu(startNaa, ferdigMs); } },
      h('div', { class: 'plankort' },
        h('div', { style: 'flex:1;min-width:0' },
          h('div', null, h('span', { class: 'p-navn' }, 'Egendefinert vindu'),
            h('span', { class: 'p-tid' }, vinduPaa ? fmt(K.tilOvnenT, 1) + ' t til ovnen' : 'sett start og slutt')),
          h('div', { class: 'p-sub' }, 'Du sier når du kan starte og når det må være ferdig — appen fyller ut hevetiden og gjæren selv.')),
        h('div', { class: 'p-loft' }, h('div', { class: 'v' }, vinduPaa ? String(r.loft.loft) : '·'), h('div', { class: 'l' }, 'LØFT')))));
    if (vinduPaa) {
      const res = tilpassVindu(startNaa, ferdigMs);
      const flex = (res.trinn && res.flexIdx != null) ? res.trinn[res.flexIdx] : null;
      const det = h('div', { style: 'padding:0 16px 14px' },
        h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px' },
          h('div', { class: 'felt-label' }, 'Tidligst jeg kan starte'),
          // «Nå»: det vanligste svaret på «når kan du starte?» fortjener én
          // knapp i stedet for to velgerhjul (Bjørn 01.08).
          h('button', { class: 'btn', style: 'font-size:.78rem;padding:4px 16px;min-height:32px',
            onClick: () => settVindu(Date.now(), ferdigMs) }, 'Nå')),
        datoTidVelger(startNaa, t => settVindu(t, ferdigMs), 'Tidligst start'),
        h('div', { class: 'felt-label', style: 'margin-top:10px' }, 'Ferdig senest (ut av ovnen)'),
        datoTidVelger(ferdigMs, t => settVindu(startNaa, t), 'Ferdig senest'));
      if (res.forKort) {
        det.appendChild(h('div', { class: 'varsel fare', style: 'margin-top:10px' },
          'Vinduet er for kort. Selv uten kaldheving trenger denne baken minst ', h('b', null, fmtTimer(res.span)),
          ' fra start til ferdig. Flytt starten tidligere eller ferdig senere.'));
      } else if (flex) {
        det.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:10px' },
          'Appen fyller vinduet med ', h('b', null, fmtTimer(flex.timer) + ' ' + (flex.miljo <= 12 ? 'kaldheving' : 'heving')),
          ' og løser gjæren til ', h('b', null, fmt(r.gjaerTotal, 2) + ' g'), '. Endrer du start eller ferdig, regnes resten om.'));
        // Klemte fittingen kaldhevingen ned til minutter, er den i praksis borte
        // — si det her, der vinduet ble satt, ikke bare nede i heveplanen.
        if (flex.miljo <= 12 && flex.timer < 1) det.appendChild(h('div', { class: 'varsel', style: 'margin-top:8px' },
          h('b', null, 'Vinduet er for trangt for kaldheving. '),
          'Det ble bare ' + fmtTimer(flex.timer) + ' på kjøl — det gjør nesten ingenting for smak eller struktur. Utvid vinduet, eller fjern kaldhevingstrinnet i heveplanen og bak varmt.'));
      }
      egen.appendChild(det);
    }
    wrap.appendChild(egen);
  }

  wrap.appendChild(h('div', { style: 'font-size:.72rem;color:var(--color-neutral-600);margin:2px 0 10px;padding:0 2px' },
    'Tidene er fra du starter til brødet er ute av ovnen. Nedkjøling kommer i tillegg — ' +
    fmt(K.kjolT, 1) + ' t for denne størrelsen, og den er lik for alle planene.'));

  // Redigerbar heveplan + «løs for»
  wrap.appendChild(tegnHeveplan(r));

  // Varmebalanse — vanntemperaturen fra mel- og romtemperatur (README: Tid har
  // varmebalanse). Alle tallene kommer fra regn(); her er bare kontrollene.
  const vb = kort('Varmebalanse', 'startTemp',
    h('div', { style: 'display:flex;align-items:baseline;gap:8px;margin-top:2px' },
      h('span', { class: 'skyver-verdi' }, grader(r.vannTemp, 1)),
      h('span', { style: 'font-size:.8rem;color:var(--color-neutral-600)' }, 'vann inn'),
      h('span', { style: 'margin-left:auto;font-size:.8rem;color:var(--color-neutral-600);font-variant-numeric:tabular-nums' }, fmt(r.wh, 1) + ' Wh/kg')),
    h('div', { class: 'konsekvens', style: 'margin-top:8px' },
      'For å treffe ', h('b', null, grader(S.startTemp || 24, 0)), ' deigtemp med mel på ', h('b', null, grader(S.melTemp || 21, 0)),
      /* Forfermenten MÅ nevnes når den er med: den er en stor masse med egen
         temperatur, og med en kald biga/poolish dominerer den hele regnestykket.
         Sto det bare «mel og elting», så et riktig svar (varmt vann tross
         friksjon) ut som en regnefeil — mel 21 og +5 °C friksjon alene peker
         mot ~17 °C vann, ikke 23. */
      r.forferment ? [', forferment på ', h('b', null, grader(r.forferment.temp, 0))] : null,
      ' og ', h('b', null, (S.eltMin || 13) + ' min'), ' elting: bruk vann på ', h('b', null, grader(r.vannTemp, 1)), '.',
      r.wh < 3 ? ' Arbeidet er under målsonen (3–5 Wh/kg) — elt lengre for åpnere krumme.' : r.wh > 8.3 ? ' Over metning (8,3 Wh/kg) — mer elting gir ikke mer nettverk.' : ' Arbeidet er i målsonen 3–5 Wh/kg.'),
    /* Kald forferment: vannet ender gjerne NÆR (eller over) ønsket deigtemp,
       som strider mot intuisjonen «elting varmer, så vannet må være kaldt».
       Begge deler er sant samtidig — friksjonen varmer, men den kalde massen
       fra kjøleskapet skal også opp til deigtemp, og vannet er det eneste
       leddet som kan bære begge. Uten denne setningen leses tallet som feil. */
    r.forferment && r.forferment.temp <= KALDGRENSE ? h('div', { class: 'konsekvens', style: 'margin-top:8px' },
      'Vannet er varmere enn friksjonen alene tilsier: ', h('b', null, g0(r.forferment.total)),
      ' forferment rett fra kjøl (', h('b', null, grader(r.forferment.temp, 0)),
      ') skal også opp til deigtemp, og det er vannet som må løfte den. Friksjonen (+',
      fmt(r.friksjon, 1), ' °C) er regnet inn.') : null,
    /* Kan vannet appen ber om i det hele tatt skaffes?
       Regnestykket kan lande på 1 °C eller lavere, og da er tallet ubrukelig
       som instruksjon. Da skal appen si hva som FAKTISK skjer, og hva man kan
       gjøre med det — ikke be om vann som ikke finnes. */
    r.vannForKaldt ? h('div', { class: 'varsel fare' },
      h('div', { style: 'font-weight:800;margin-bottom:2px' },
        'Vannet må være kaldere enn du får det'),
      h('div', { style: 'font-size:.8rem;line-height:1.45' },
        'Regnestykket ber om ', h('b', null, grader(r.vannTemp, 1)),
        ', men det kaldeste du får er ', h('b', null, grader(r.vannKaldest, 1)),
        '. Bruker du det, lander deigen på ', h('b', null, grader(r.deigTempMulig, 1)),
        ' — altså ', h('b', null, fmt(r.deigTempMulig - (S.startTemp || 24), 1) + ' °C'), ' over målet.'),
      h('div', { style: 'font-size:.8rem;line-height:1.45;margin-top:6px' },
        h('b', null, 'Det er rommet som er for varmt, ikke vannet som er for lunkent. '),
        'Tre ting virker: sett melet kaldt noen timer (det er den største massen), elt kortere — ',
        'friksjonen står for ', h('b', null, grader(r.friksjon, 1)), ' av oppvarmingen — eller bruk isbiter i vannet. ',
        'Du kan også godta en varmere deig og korte ned bulkhevingen tilsvarende.')) : null,
    isRad(r),
    h('div', { style: 'margin-top:10px' },
      miniStepper('Ønsket deigtemp', S.startTemp || 24, 'startTemp', 18, 30, 0.5, ' °C'),
      miniStepper('Meltemperatur', S.melTemp || 21, 'melTemp', 4, 30, 1, ' °C'),
      miniStepper('Eltetid', S.eltMin || 13, 'eltMin', 3, 25, 1, ' min'),
      // Kjøleskap varierer fra 2 til 7 grader, og det avgjør hvor kaldt vann du
      // faktisk kan skaffe.
      miniStepper('Kaldeste vann du får', S.kjolTemp != null ? S.kjolTemp : 3.5, 'kjolTemp', 0, 15, 0.5, ' °C')),
    h('div', { style: 'margin-top:10px' },
      h('div', { class: 'felt-label' }, 'Maskin'),
      h('div', { class: 'piller', style: 'flex-wrap:wrap' }, ...['hand', 'planet', 'spiralHjemme', 'spiralProff', 'egen'].map(id =>
        h('button', { class: (S.maskin || 'spiralHjemme') === id ? 'paa' : '', style: 'flex:1 1 45%;font-size:.78rem', onClick: () => { S.maskin = id; oppdater(); } }, MASKIN_INFO[id].navn))),
      S.maskin === 'egen' ? h('div', { style: 'margin-top:8px' },
        miniStepper('Din friksjon (°C per min)', S.egenFriksjon || 0.4, 'egenFriksjon', 0.05, 2, 0.05, '')) : null,
      maskinInfoPanel(r)));
  const kal = tegnKalibrering(r);
  if (kal) vb.appendChild(kal);
  wrap.appendChild(vb);

  // Gjæringsgraf — den ekte fart- og akkumuleringskurven bak dosen.
  const pts = (typeof planProfil === 'function') ? planProfil(r.planTrinn, r.gjaerTorr, r.masseKg, { antall: S.antall, lokk: S.lokk, fulltKjol: S.fulltKjol }) : [];
  if (pts.length > 2) {
    const bulkStart = (K.find(x => x.id === 'trinn-0') || {}).tid || K.start;
    // «Nå»-markøren gir bare mening når prosessen faktisk er i gang («Start
    // nå»-modus). Med et ferdigtidspunkt fram i tid er planen hypotetisk, og
    // en nå-strek i en ikke-startet gjæring ville pekt på ingenting.
    const visNaa = S.tidModus === 'start';
    wrap.appendChild(h('div', { class: 'kort' },
      h('div', { class: 'kort-num' }, 'Gjæringen over tid'),
      gjaeringsGraf(pts, r, bulkStart, visNaa, K),
      h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;font-size:.7rem;color:var(--color-neutral-600)' },
        legendePrikk('var(--color-accent-2-500)', 'Akkumulert gjæring (høyre)'),
        legendePrikk('var(--color-neutral-500)', 'Deigtemp (venstre)'),
        legendePrikk('var(--color-accent-500)', 'Gjæringsfart'),
        legendePrikk('var(--color-accent-2-700)', 'Halvveis'),
        r.ffPaa ? legendePrikk('var(--color-accent-2-500)', 'Forfermentens del (stiplet)') : null,
        visNaa ? legendePrikk('var(--color-danger)', 'Nå') : null),
      h('div', { style: 'font-size:.72rem;color:var(--color-neutral-600);margin-top:8px;line-height:1.45' },
        'Arealet under fartskurven er dosen. Grønne bånd er kald heving (≤ 12 °C), varme bånd romtemperatur — se hvordan farten stuper i kulda og skyter fart igjen når deigen tempereres.' +
        (r.ffPaa ? ' Gjæringen starter i forfermentbåndet: den stiplede grønnkurven er forfermentens del av totalen, og deigens kurve fortsetter derfra til 100 % — den starter ikke på null, for forfermentens gjæring er alt gjort når deigen eltes. Den stiplede grå broen opp til deigtempen er eltingen (varmt vann + friksjon).' : ''))));
  }

  // Rate-tabell: gjæringsfart mot temperatur
  const rt = tegnRateTabell(); if (rt) wrap.appendChild(rt);
  return wrap;
}
/* Ismengde når ønsket vanntemperatur er lavere enn springvannet (~12 °C). */
function isRad(r) {
  if (typeof isAndel !== 'function') return null;
  const spring = 12;
  if (r.vannTemp >= spring - 0.2) return null;
  const andel = isAndel(spring, r.vannTemp);
  const is = Math.max(r.vannHoved, 1) * andel;   // eksakt hovedvann (teknisk #10)
  return h('div', { class: 'varsel', style: 'margin-top:8px' },
    'Vannet skal være kaldere enn springen (', grader(spring, 0), '). Bytt ut ', h('b', null, pst(andel * 100, 0)),
    ' av vannet med is — ca. ', h('b', null, g0(is)), ' isbiter, resten kaldt vann.');
}
/* Etikett og stepper på samme rad, men med luft: tre slike stablet med 6 px
   mellomrom og en etikett som brøt til to linjer ble en tett grøt på 390 px.
   Rytmen ligger i CSS (.ministepper-rad) i stedet for i inline-stiler. */
function miniStepper(label, verdi, felt, min, max, steg, enhet) {
  return h('div', { class: 'ministepper-rad' },
    h('div', { class: 'felt-label' }, label),
    h('div', { class: 'stepper' },
      h('button', { 'aria-label': 'Mindre ' + label, onClick: () => { S[felt] = Math.max(min, (S[felt] || min) - steg); oppdater(); } }, '−'),
      h('input', { type: 'text', inputmode: 'decimal', 'aria-label': label, value: fmt(verdi, steg < 1 ? 1 : 0) + enhet, style: 'font-size:1rem',
        onblur: e => { const v = parseFloat(e.target.value.replace(',', '.')); if (!isNaN(v)) S[felt] = Math.min(max, Math.max(min, v)); oppdater(); } }),
      h('button', { 'aria-label': 'Mer ' + label, onClick: () => { S[felt] = Math.min(max, (S[felt] || min) + steg); oppdater(); } }, '+')));
}
function legendePrikk(farge, tekst) {
  return h('span', { style: 'display:inline-flex;align-items:center;gap:5px' },
    h('span', { style: 'width:10px;height:3px;border-radius:2px;background:' + farge }), tekst);
}
/* Forklarer den valgte eltemaskinen: hva den er, friksjonstallet, den levende
   utregningen (friksjon × min → Wh/kg) og en sammenligning av alle maskinene. */
/* Fasene som minutter. `andel` av eltetiden, men aldri under `min` — samling
   tar den tiden den tar selv om totalen er kort. Siste fase får resten, så
   summen alltid er nøyaktig eltetiden og ikke et avrundingsavvik. */
function fartFaser(faser, totalMin) {
  const ut = faser.map(f => ({ fart: f.fart, hva: f.hva, min: Math.max(f.min || 0, Math.round(totalMin * f.andel)) }));
  const sum = ut.reduce((s2, f) => s2 + f.min, 0);
  if (ut.length && sum !== totalMin) {
    const siste = ut[ut.length - 1];
    siste.min = Math.max(1, siste.min + (totalMin - sum));
  }
  return ut;
}
/* ---------- Kalibrering av maskinens friksjon ----------
   Friksjonstallet styrer vanntemperaturen i hele appen, og tabellverdiene er
   KLASSEANSLAG — for Ooni Halo Pro finnes det ingen produsentoppgitt verdi i
   det hele tatt (se PARAMETERREVISJON.md, 31.07.2026). Å måle sin egen tar to
   avlesninger, og da er tallet ekte i stedet for et snitt av andres maskiner.

   Regnestykket er (etter − før) / minutter, og ingenting mer. Det ligger her og
   ikke i engine.js fordi det ikke er en modell — det er en divisjon på to tall
   brukeren nettopp har lest av. */
function tegnKalibrering(r) {
  if (S.friksjonKalibrert && S.maskin === 'egen') return null;
  const k = S.kalib || {};
  const sett = (nokkel, v) => { S.kalib = Object.assign({}, S.kalib, { [nokkel]: v }); oppdater(); };
  const boks = h('div', { class: 'kort', style: 'margin-top:12px;background:var(--color-accent-2-100)' },
    h('div', { class: 'kort-num' }, 'Kalibrer maskinen din'),
    h('div', { class: 'hjelpetekst', style: 'margin-top:4px' },
      'Tallene i lista er anslag for maskinTYPEN — for Ooni Halo Pro finnes ingen produsentoppgitt verdi. Mål din egen én gang, så treffer vanntemperaturen resten av tiden.'));

  /* Protokollen måler ETTER sammenblanding, ikke før.
     Første utgave ba om «deigtemp før elting», og det finnes ikke: før maskinen
     har gått er det mel og vann, ikke deig, og et termometer i en tørr melhaug
     måler ingenting brukbart. Nullpunktet er derfor deigen slik den er når alt
     akkurat er samlet.

     Tre korte drag i stedet for ett langt: friksjonen er ikke den samme på lav
     og høy fart, og med tre punkter ser man forskjellen i stedet for å måtte tro
     på ett tall. Appen bruker MIDDELS, fordi det er der utviklingen skjer og der
     mesteparten av eltetiden ligger. */
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:8px' },
    h('b', null, 'Slik gjør du det: '),
    'bland mel og vann til det ikke er tørt mel igjen, og la maskinen stå. Nå har du en deig, og nå måler du. Kjør så to minutter på hver fart og mål på nytt mellom hver.'));

  boks.appendChild(h('div', { class: 'gramrad' },
    h('span', { class: 'gramrad-lab' }, 'Deigvekt du målte på'),
    gramFelt(k.vekt != null ? k.vekt : Math.round(r.totalVekt), v => sett('vekt', v), 'Deigvekt i gram'),
    h('span', { class: 'gramrad-enhet' }, 'g')));
  boks.appendChild(h('div', { style: 'font-size:.72rem;color:var(--color-neutral-600);margin-top:2px;line-height:1.4' },
    'Vekten betyr noe: samme maskin varmer en liten deig raskere per minutt enn en stor, fordi effekten fordeles på mindre masse. Måler du på ' +
    g0(k.vekt != null ? k.vekt : r.totalVekt) + ', gjelder tallet best rundt den størrelsen.'));

  boks.appendChild(h('div', { class: 'gramrad', style: 'margin-top:12px' },
    h('span', { class: 'gramrad-lab' }, h('b', null, 'Start'), ' — deigen akkurat samlet'),
    gramFelt(k.t0 != null ? k.t0 : '', v => sett('t0', v), 'Temperatur ved start'),
    h('span', { class: 'gramrad-enhet' }, '°C')));

  const FARTER = [
    { n: 'lav', lab: 'Lav fart', min: 2 },
    { n: 'mid', lab: 'Middels fart', min: 2 },
    { n: 'hoy', lab: 'Høy fart', min: 2 }
  ];
  const temp = n => (n === 'start' ? k.t0 : k['t_' + n]);
  const forrige = i => (i === 0 ? k.t0 : k['t_' + FARTER[i - 1].n]);
  FARTER.forEach((f, i) => {
    boks.appendChild(h('div', { class: 'gramrad' },
      h('span', { class: 'gramrad-lab' }, 'Etter ' + f.min + ' min på ' + f.lab.toLowerCase()),
      gramFelt(k['t_' + f.n] != null ? k['t_' + f.n] : '', v => sett('t_' + f.n, v), 'Temperatur etter ' + f.lab),
      h('span', { class: 'gramrad-enhet' }, '°C')));
    const fra = forrige(i), til = k['t_' + f.n];
    if (isFinite(fra) && isFinite(til)) {
      const rate = (til - fra) / f.min;
      boks.appendChild(h('div', { style: 'font-size:.74rem;color:var(--color-neutral-700);margin:-2px 0 6px;padding-left:2px;font-variant-numeric:tabular-nums' },
        '→ ' + fmt(rate, 2) + ' °C/min' + (f.n === 'mid' ? ' — dette er tallet appen bruker' : '')));
    }
  });

  const midRate = (isFinite(k.t_lav) && isFinite(k.t_mid)) ? (k.t_mid - k.t_lav) / 2 : null;
  if (midRate != null && midRate > 0) {
    boks.appendChild(h('button', { class: 'btn btn-primary btn-full', style: 'margin-top:10px',
      onClick: () => {
        S.egenFriksjon = Math.round(midRate * 100) / 100;
        /* Hvilken maskin målingen GJELDER, tas vare på før valget bytter til
           «egen». Uten den vet appen etterpå bare at tallet er målt — ikke hva
           det er målt på, og da kan det ikke deles med andre som har samme
           maskin. */
        S.kalibFor = S.maskin && S.maskin !== 'egen' ? S.maskin : (S.kalibFor || null);
        S.kalibVekt = isFinite(k.vekt) ? k.vekt : Math.round(r.totalVekt);
        S.maskin = 'egen'; S.friksjonKalibrert = true; oppdater();
      } }, 'Bruk ' + fmt(midRate, 2) + ' °C/min for maskinen min'));
  } else {
    boks.appendChild(h('div', { style: 'font-size:.72rem;color:var(--color-neutral-600);margin-top:8px' },
      'Fyll inn start og de to første fartene, så regner appen ut friksjonen. Høy fart er valgfri — den er der for å vise deg forskjellen.'));
  }
  if (midRate != null && midRate <= 0) boks.appendChild(h('div', { class: 'varsel fare' },
    'Temperaturen gikk ikke opp mellom lav og middels. Enten gikk det for kort tid, eller så er kjøkkenet kaldere enn deigen — mål på nytt med litt lengre drag.'));
  boks.appendChild(h('button', { class: 'btn-ghost', style: 'margin-top:6px;font-size:.78rem',
    onClick: () => { S.friksjonKalibrert = true; oppdater(); } }, 'Ikke nå — bruk tabellverdien'));
  return boks;
}

function maskinInfoPanel(r) {
  const mid = S.maskin || 'spiralHjemme';
  const info = (typeof MASKIN_INFO !== 'undefined') && MASKIN_INFO[mid];
  if (!info) return null;
  const min = S.eltMin || 13;
  // Samme rangering som motoren bruker: egen måling → delt måling → anslag.
  const delt = (S.delteKalib && S.delteKalib[mid] && isFinite(S.delteKalib[mid].friksjon)) ? +S.delteKalib[mid].friksjon : null;
  const frik = mid === 'egen' ? (S.egenFriksjon || 0.4) : (delt != null ? delt : info.friksjon);
  /* Wh/kg-sonen gjelder MASKINELTING. Målsonen 3–8,3 Wh/kg kommer fra
     spiralelting, og for hånd er den meningsløs: tallet er lavt fordi hendene
     tilfører lite varme, ikke fordi deigen er underutviklet. Sto det «under
     målsonen» på håndelting, leste det som en feil å rette opp — og svaret ville
     vært å elte hardere, som er nøyaktig feil råd. */
  const forHand = mid === 'hand';
  const sone = forHand
    ? ['gjelder ikke for hånd', 'var(--color-neutral-600)']
    : r.wh < 3 ? ['under målsonen', 'var(--color-accent-700)'] : r.wh > 8.3 ? ['over metning', 'var(--color-danger)'] : ['i målsonen', 'var(--color-accent-2-700)'];

  const panel = h('div', { class: 'maskin-info' },
    h('div', { class: 'mi-topp' },
      h('b', null, info.navn),
      /* Et tall her leses som «slik er DIN maskin». Er det bare et
         klasseanslag, står det ikke noe tall — det står at kalibreringen
         mangler. Regnestykket bruker anslaget videre (ellers kan appen ikke
         regne vanntemperatur i det hele tatt), men den later ikke som. */
      mid === 'egen'
        ? h('span', { class: 'mi-frik' }, 'målt ' + fmt(frik, 2) + ' °C/min')
        : (S.delteKalib && S.delteKalib[mid])
          ? h('span', { class: 'mi-frik' }, fmt(S.delteKalib[mid].friksjon, 2) + ' °C/min · delt måling')
          : h('span', { class: 'mi-frik mi-ukalibrert' }, 'mangler kalibrering')),
    h('div', { class: 'mi-hva' }, info.hva),
    h('div', { class: 'mi-hva', style: 'margin-top:4px' }, info.tid),
    // Hastighet som FASER med minutter, regnet av eltetiden du faktisk har satt.
    // Prosasetningen ligger under som begrunnelse.
    info.faser ? h('div', { style: 'margin-top:8px' },
      h('div', { class: 'felt-label', style: 'font-weight:800' }, 'Hastighet — ' + min + ' min fordelt'),
      ...fartFaser(info.faser, min).map((f, i) => h('div', { class: 'fart-fase' },
        h('span', { class: 'ff-nr' }, String(i + 1)),
        h('span', { class: 'ff-fart' }, f.fart),
        h('span', { class: 'ff-min' }, f.min + ' min'),
        h('span', { class: 'ff-hva' }, f.hva)))) : null,
    info.fart ? h('div', { class: 'mi-hva', style: 'margin-top:6px' }, info.fart) : null,
    info.anslag && mid !== 'egen' && !(S.delteKalib && S.delteKalib[mid])
      ? h('div', { class: 'mi-hva', style: 'margin-top:6px;color:var(--color-accent-700)' },
          'Vanntemperaturen under er regnet med et anslag for maskinTYPEN. Kalibrer under, så blir den din.')
      : null,
    // Den levende utregningen — samme tall som varmebalansen bruker.
    h('div', { class: 'mi-regn' },
      h('span', null, fmt(frik, 2), ' °C/min × ', String(min), ' min = '),
      h('b', null, '+' + fmt(r.friksjon, 1) + ' °C'),
      h('span', null, ' → ÷ 1,29 = '),
      h('b', { style: 'color:' + sone[1] }, fmt(r.wh, 1) + ' Wh/kg'),
      h('span', { style: 'color:' + sone[1] }, ' (' + sone[0] + ')')),
    forHand ? h('div', { class: 'mi-hva', style: 'margin-top:4px' },
      'Wh/kg måler arbeidet en maskin tilfører deigen. Elter du for hånd, er tallet lavt av natur — det er ikke noe å rette opp. Dømm på deigen: strekk-og-brett til den er smidig og holder fasongen.') : null,
    h('div', { class: 'mi-note' }, info.note));

  /* Del målingen.
     Knappen vises bare for den som faktisk har skrivetilgang i den delte
     tabellen (RLS slipper gjennom én e-post, se SUPABASE.md). For alle andre
     ville den bare gitt en avvisning fra serveren, og da er det ærligere å ikke
     tilby den. Selve sperren ligger i databasen — dette skjuler bare en knapp. */
  if (mid === 'egen' && S.kalibFor && typeof Sky !== 'undefined' && Sky.kanPublisere && Sky.kanPublisere()) {
    const forNavn = (MASKIN_INFO[S.kalibFor] || {}).navn || S.kalibFor;
    panel.appendChild(h('button', { class: 'btn-ghost', style: 'margin-top:8px;font-size:.78rem',
      onClick: async () => {
        const svar = await Sky.lagreKalibrering(S.kalibFor, S.egenFriksjon || 0.4, S.kalibVekt || null);
        S.kalibDelt = svar && svar.feil ? svar.feil : 'Delt — alle med ' + forNavn + ' får nå ' + fmt(S.egenFriksjon || 0.4, 2) + ' °C/min.';
        oppdater();
        hentDelteKalibreringer();
      } }, 'Del målingen med alle som har ' + forNavn));
    if (S.kalibDelt) panel.appendChild(h('div', { class: 'mi-hva', style: 'margin-top:4px' }, S.kalibDelt));
  }

  // Sammenlign alle maskinene ved gjeldende eltetid.
  const vis = !!S.visMaskiner;
  panel.appendChild(h('button', { class: 'btn-ghost', style: 'margin-top:8px;font-size:.76rem', onClick: () => { S.visMaskiner = !vis; oppdater(); } },
    vis ? 'Skjul sammenligning' : 'Sammenlign maskinene ved ' + min + ' min ›'));
  if (vis) {
    const rader = ['hand', 'spiralHjemme', 'planet', 'spiralProff'].map(id => {
      const m = MASKIN_INFO[id];
      const stig = m.friksjon * min, wh = stig / 1.29;
      return h('div', { class: 'mi-rad' + (id === mid ? ' paa' : '') },
        h('span', { class: 'mi-navn' }, m.navn),
        h('span', { class: 'mi-tall' }, fmt(m.friksjon, 2) + ' °C/min'),
        h('span', { class: 'mi-tall' }, '+' + fmt(stig, 1) + ' °C'),
        h('span', { class: 'mi-tall' }, fmt(wh, 1) + ' Wh/kg'));
    });
    panel.appendChild(h('div', { class: 'mi-tabell' },
      h('div', { class: 'mi-rad hode' }, h('span', { class: 'mi-navn' }, 'Maskin'), h('span', { class: 'mi-tall' }, 'friksjon'), h('span', { class: 'mi-tall' }, 'ved ' + min + ' min'), h('span', { class: 'mi-tall' }, 'arbeid')),
      ...rader,
      h('div', { class: 'mi-note', style: 'margin-top:6px' }, 'Målsonen for åpen krumme er 3–5 Wh/kg; metning ved 8,3. Samme eltetid gir helt ulikt arbeid — derfor må vanntemperaturen følge maskinvalget.')));
  }
  return panel;
}
/* SVG-graf: fasebånd, temp- og gjæringsakser, gjæringsfart (areal), akkumulert
   dose (hovedkurve), deigtemp, halvveismerke, klokkeslett og «nå»-markør.
   `bulkStart` er Date-en for når gjæringen (bulk) begynner — gir ekte klokke. */
function gjaeringsGraf(pts, r, bulkStart, visNaa, K) {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 360, H = 210;
  const pad = { l: 30, r: 30, t: 30, b: 30 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const trinn = r.planTrinn || [];
  const totalT = pts[pts.length - 1].t || 1;
  const doseMax = pts[pts.length - 1].dose || 1;
  const fartMax = Math.max(...pts.map(p => p.fart), 1e-6);
  const tempMax = Math.max(30, Math.ceil(Math.max(...pts.map(p => p.temp)) / 5) * 5);
  const startMs = bulkStart ? bulkStart.getTime() : Date.now();
  /* Tidslinja skal dekke HELE prosessen, ikke bare deigen etter elting. Med
     forferment starter baket mange timer før bulk — uten den perioden i grafen
     stemte ikke aksens klokkeslett med planen over (vindu-start 10:51, graf fra
     23:06), og det leste som en feil. Forfermentens tider hentes fra KJEDEN
     (samme kilde som stegene), så de følger enhver endring lengre opp. */
  const ffSteg = (K && K.find) ? K.find(x => x.id === 'ff') : null;
  const tMin = ffSteg ? Math.min(0, (ffSteg.tid.getTime() - startMs) / 3600000) : 0;
  const span = totalT - tMin || 1;
  /* Forfermentens DEL av totalgjæringen. Motoren senker deigens måldose når
     forfermenten bidrar (maalDoseFor), så andelen er differansen mellom målet
     uten og med forferment. Den grønne akkumulert-kurven skal starte HER ved
     bulkstart — ikke på 0 % — for gjæringen begynte da forfermenten ble satt
     (Bjørn 01.08: «burde ikke den vært med fra forfermenteringen?»). */
  const ffShare = (ffSteg && typeof maalDoseFor === 'function' && (r.ffAndelEffektiv || 0) > 0)
    ? Math.max(0, Math.min(0.6, 1 - maalDoseFor(r.grovMelAndel, r.ffAndelEffektiv) / Math.max(maalDoseFor(r.grovMelAndel, 0), 1e-9)))
    : 0;
  // Total gjæring 0–1: forfermentens del først, deigens dose skalert inn etterpå.
  const Ytot = andel => Yd(ffShare + (1 - ffShare) * andel);
  const X = t => pad.l + (t - tMin) / span * iW;
  const Yt = v => pad.t + (1 - v / tempMax) * iH;   // temperatur 0..tempMax (venstre)
  const Yd = f => pad.t + (1 - f) * iH;             // gjæringsandel 0..1 (høyre)
  const klAv = t => klHM(startMs + t * 3600000);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const n = v => v.toFixed(1);
  let s = '';
  let sistLabelX = -Infinity;   // kollisjonsvern for fasebånd-etikettene

  // Forfermenten i grafen: skravert bånd med navn, temperaturkurve (venstre
  // akse) OG dens egen modningskurve (høyre akse, 0–100 % av dens ferdige
  // modning). Forfermenten gjærer for fullt hele tiden den står — det er hele
  // poenget med den — men den gjærer i egen bolle mot sitt eget mål, så kurven
  // er normalisert mot dens egen modning, ikke deigens doseskala.
  if (ffSteg && r.forferment) {
    const ff = r.forferment;
    const ffTimer = (ffSteg.varighet || 0) / 60;
    const ffSlutt = tMin + ffTimer;
    const kaldFf = ff.temp <= 12;
    s += `<rect x="${n(X(tMin))}" y="${pad.t}" width="${n(X(ffSlutt) - X(tMin))}" height="${iH}" fill="${kaldFf ? 'var(--color-accent-2-500)' : 'var(--color-accent-500)'}" opacity="0.09"/>`;
    s += `<line x1="${n(X(ffSlutt))}" y1="${pad.t}" x2="${n(X(ffSlutt))}" y2="${pad.t + iH}" stroke="var(--color-neutral-300)" stroke-dasharray="3 3"/>`;
    if (X(ffSlutt) - X(tMin) > 42) {
      const midt = (X(tMin) + X(ffSlutt)) / 2;
      s += `<text x="${n(midt)}" y="${pad.t - 15}" fill="var(--color-neutral-700)" font-size="9.5" font-weight="700" text-anchor="middle">${esc(r.ffT ? r.ffT.navn : 'Forferment')}</text>`;
      s += `<text x="${n(midt)}" y="${pad.t - 5}" fill="var(--color-neutral-500)" font-size="8.5" text-anchor="middle">${fmt(ffTimer, ffTimer < 10 ? 1 : 0)} t · ${fmt(ff.temp, 0)}°</text>`;
      sistLabelX = midt;
    }
    // Temperaturbanen: blandes varm (mikstemp), står evt. romTid timer varmt,
    // og kjøles så mot skapet — samme modell som kjølebanen i motoren.
    const masse = ((ff.mel || 0) + (ff.vann || 0)) / 1000;
    const tau = (typeof tauHours === 'function') ? tauHours(Math.max(masse, 0.1), { lokk: true }) : 4;
    const T0 = (ff.mikstemp != null && isFinite(ff.mikstemp)) ? ff.mikstemp : ff.temp;
    const romTid = ff.romTid || 0;
    const dt = ffTimer / 40;
    const temps = [];
    for (let i = 0; i <= 40; i++) {
      const t = i * dt;
      temps.push(ff.temp >= T0 - 0.05 ? ff.temp
        : (t < romTid ? T0 : (typeof doughTempAt === 'function' ? doughTempAt(t - romTid, T0, ff.temp, tau) : ff.temp)));
    }
    let ftl = '';
    temps.forEach((temp, i) => { ftl += `${i ? 'L' : 'M'} ${n(X(tMin + i * dt))} ${n(Yt(temp))} `; });
    s += `<path d="${ftl}" fill="none" stroke="var(--color-neutral-500)" stroke-width="1.6" stroke-dasharray="5 3" opacity="0.7"/>`;
    // Modningskurven: akkumulert gjæringsaktivitet langs temperaturbanen (samme
    // rateFactor som motoren). Kurven stiger fra 0 til forfermentens ANDEL av
    // totalgjæringen (ffShare) — så deigens kurve kan fortsette derfra, som én
    // sammenhengende historie på samme akse.
    if (typeof rateFactor === 'function' && ffShare > 0) {
      const akk = [0];
      for (let i = 1; i <= 40; i++) akk.push(akk[i - 1] + rateFactor((temps[i - 1] + temps[i]) / 2) * dt);
      const tot = akk[40] || 1;
      let ml = '';
      akk.forEach((a, i) => { ml += `${i ? 'L' : 'M'} ${n(X(tMin + i * dt))} ${n(Yd(ffShare * a / tot))} `; });
      s += `<path d="${ml}" fill="none" stroke="var(--color-accent-2-500)" stroke-width="1.8" stroke-dasharray="4 3" opacity="0.75"/>`;
      // Bind sammen med deigkurven over elte-gapet (samme nivå, ingen gjæring
      // regnes i selve eltingen).
      s += `<path d="M ${n(X(ffSlutt))} ${n(Yd(ffShare))} L ${n(X(0))} ${n(Yd(ffShare))}" fill="none" stroke="var(--color-accent-2-500)" stroke-width="1.8" stroke-dasharray="2 3" opacity="0.6"/>`;
    }
    /* Overgangen forferment → deig: en stiplet bro fra forfermentens siste
       temperatur opp til deigens starttemp. Det er ELTINGEN som løfter den —
       varmt vann + friksjon — og uten broen så spranget ut som et hull i
       kurven (Bjørn 01.08). Broen starter der forfermenten slutter og lander
       der deigens tempkurve begynner (bulkstart). */
    if (pts.length) {
      s += `<path d="M ${n(X(ffSlutt))} ${n(Yt(temps[40]))} L ${n(X(0))} ${n(Yt(pts[0].temp))}" fill="none" stroke="var(--color-neutral-500)" stroke-width="1.4" stroke-dasharray="2 4" opacity="0.8"/>`;
    }
    s += `<line x1="${n(X(0))}" y1="${pad.t}" x2="${n(X(0))}" y2="${pad.t + iH}" stroke="var(--color-neutral-400)" stroke-dasharray="3 3"/>`;
  }

  // Fasebånd med navn, tid og temperatur — kald heving (≤12 °C) i grønt, varm i terrakotta.
  // Etikettene kolliderte da forfermenten kom inn på aksen og gjorde hvert bånd
  // smalere: lange navn («Kaldheving, utbakt i kurv») fløt inn i naboens. Derfor
  // kortes navnet ved komma på smale bånd, og en etikett hoppes helt over hvis
  // senteret ligger nærmere forrige tegnede etikett enn 62 px.
  let acc = 0;
  trinn.forEach((tr, i) => {
    const x0 = X(acc), x1 = X(acc + (tr.timer || 0)), br = x1 - x0;
    const kald = tr.miljo <= 12;
    s += `<rect x="${n(x0)}" y="${pad.t}" width="${n(br)}" height="${iH}" fill="${kald ? 'var(--color-accent-2-500)' : 'var(--color-accent-500)'}" opacity="${i % 2 ? 0.06 : 0.11}"/>`;
    if (i > 0) s += `<line x1="${n(x0)}" y1="${pad.t}" x2="${n(x0)}" y2="${pad.t + iH}" stroke="var(--color-neutral-300)" stroke-dasharray="3 3"/>`;
    const midt = (x0 + x1) / 2;
    if (br > 42 && midt - sistLabelX > 62) {
      const navn = br < 110 ? String(tr.navn).split(/[,·(]/)[0].trim() : tr.navn;
      s += `<text x="${n(midt)}" y="${pad.t - 15}" fill="var(--color-neutral-700)" font-size="9.5" font-weight="700" text-anchor="middle">${esc(navn)}</text>`;
      s += `<text x="${n(midt)}" y="${pad.t - 5}" fill="var(--color-neutral-500)" font-size="8.5" text-anchor="middle">${fmt(tr.timer, tr.timer < 10 ? 1 : 0)} t · ${fmt(tr.miljo, 0)}°</text>`;
      sistLabelX = midt;
    }
    acc += tr.timer || 0;
  });

  // Vannrett rutenett + temperaturakse (venstre).
  for (let v = 0; v <= tempMax; v += 10) {
    s += `<line x1="${pad.l}" y1="${n(Yt(v))}" x2="${pad.l + iW}" y2="${n(Yt(v))}" stroke="var(--color-neutral-200)"/>`;
    s += `<text x="${pad.l - 5}" y="${n(Yt(v) + 3)}" fill="var(--color-neutral-500)" font-size="8.5" text-anchor="end">${v}°</text>`;
  }
  // Gjæringsakse (høyre): 0 / 50 / 100 %.
  //
  // Aksene farges som hver sin kurve, og det er ikke pynt. De to skalaene deler
  // tegneflate: 0–tempMax til venstre, 0–100 % til høyre. Den akkumulerte
  // gjæringskurven ender ALLTID på taket (den er normalisert mot sin egen
  // sluttverdi), og taket ligger på samme høyde som «30°»-linja i rutenettet.
  // Leser man den mot venstre akse, ser det ut som deigen når 30 °C mens den
  // står i kjøleskapet. Fargen knytter hvert tall til riktig kurve.
  [0, 50, 100].forEach(p => s += `<text x="${pad.l + iW + 5}" y="${n(Yd(p / 100) + 3)}" fill="var(--color-accent-2-700)" font-weight="700" font-size="8.5">${p}%</text>`);

  // Gjæringsfart som areal — arealet under kurven ER dosen.
  let area = `M ${n(X(0))} ${n(pad.t + iH)}`;
  pts.forEach(p => area += ` L ${n(X(p.t))} ${n(pad.t + iH - (p.fart / fartMax) * iH * 0.5)}`);
  area += ` L ${n(X(totalT))} ${n(pad.t + iH)} Z`;
  s += `<path d="${area}" fill="var(--color-accent-500)" opacity="0.18"/>`;

  // Akkumulert gjæring (hovedkurven, høyre akse). Starter på forfermentens
  // andel (ffShare), ikke på null — den gjæringen er alt gjort når deigen eltes.
  let dl = ''; pts.forEach((p, i) => dl += `${i ? 'L' : 'M'} ${n(X(p.t))} ${n(Ytot(p.dose / doseMax))} `);
  s += `<path d="${dl}" fill="none" stroke="var(--color-accent-2-500)" stroke-width="2.6"/>`;

  // Deigtemperatur (venstre akse, stiplet).
  let tl = ''; pts.forEach((p, i) => tl += `${i ? 'L' : 'M'} ${n(X(p.t))} ${n(Yt(p.temp))} `);
  s += `<path d="${tl}" fill="none" stroke="var(--color-neutral-500)" stroke-width="1.6" stroke-dasharray="5 3"/>`;

  // Halvveismerke — når er 50 % av HELE gjæringen gjort (forfermenten medregnet)?
  // Med stor forferment-andel flytter det seg mot venstre; bidrar den over
  // halvparten, ligger halvveis inne i forfermentperioden og merket droppes
  // (kurven der er en modellert modningsbane, ikke et klokkeslett å planlegge mot).
  const halvAndel = ffShare < 0.5 ? (0.5 - ffShare) / (1 - ffShare) : null;
  const halv = halvAndel != null ? pts.find(p => p.dose >= doseMax * halvAndel) : null;
  if (halv) {
    s += `<line x1="${n(X(halv.t))}" y1="${pad.t}" x2="${n(X(halv.t))}" y2="${pad.t + iH}" stroke="var(--color-accent-2-700)" stroke-width="1" stroke-dasharray="2 3"/>`;
    s += `<circle cx="${n(X(halv.t))}" cy="${n(Yd(0.5))}" r="3.4" fill="var(--color-accent-2-700)"/>`;
    const ank = X(halv.t) > pad.l + iW - 88 ? 'end' : 'start', dx = ank === 'end' ? -6 : 6;
    s += `<text x="${n(X(halv.t) + dx)}" y="${n(Yd(0.5) - 6)}" fill="var(--color-accent-2-700)" font-size="8.5" font-weight="700" text-anchor="${ank}">halvveis ${klAv(halv.t)}</text>`;
  }

  // «Nå»-markør — bare når prosessen er startet OG vi står inne i vinduet
  // (forfermentperioden regnes med: står poolishen, er prosessen i gang).
  const naaT = (Date.now() - startMs) / 3600000;
  if (visNaa && naaT > tMin + 0.02 && naaT < totalT) {
    s += `<line x1="${n(X(naaT))}" y1="${pad.t - 2}" x2="${n(X(naaT))}" y2="${pad.t + iH}" stroke="var(--color-danger)" stroke-width="1.4"/>`;
    s += `<circle cx="${n(X(naaT))}" cy="${pad.t - 2}" r="2.6" fill="var(--color-danger)"/>`;
    s += `<text x="${n(X(naaT))}" y="${pad.t - 20}" fill="var(--color-danger)" font-size="8.5" font-weight="800" text-anchor="middle">nå</text>`;
  }

  // X-akse med klokkeslett — fra prosessens FAKTISKE start (forfermenten om den
  // er med), så aksen viser de samme klokkeslettene som planen over.
  s += `<line x1="${pad.l}" y1="${pad.t + iH}" x2="${pad.l + iW}" y2="${pad.t + iH}" stroke="var(--color-neutral-400)"/>`;
  const steg = span <= 8 ? 2 : span <= 18 ? 4 : span <= 30 ? 6 : 8;
  for (let t = tMin; t <= totalT + 0.01; t += steg) {
    s += `<line x1="${n(X(t))}" y1="${pad.t + iH}" x2="${n(X(t))}" y2="${pad.t + iH + 4}" stroke="var(--color-neutral-400)"/>`;
    s += `<text x="${n(X(t))}" y="${pad.t + iH + 15}" fill="var(--color-neutral-500)" font-size="8.5" text-anchor="middle">${klAv(t)}</text>`;
  }
  // Aksetitler. «gjæring» og ikke «gjær»: tallet er hvor stor andel av hele
  // planens gjæring som er unnagjort, ikke en mengde gjær og ikke en temperatur.
  s += `<text x="${pad.l - 5}" y="${pad.t - 6}" fill="var(--color-neutral-600)" font-weight="700" font-size="8" text-anchor="end">°C deig</text>`;
  s += `<text x="${pad.l + iW + 5}" y="${pad.t - 6}" fill="var(--color-accent-2-700)" font-weight="700" font-size="8">% gjæring</text>`;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('width', '100%');
  svg.setAttribute('style', 'display:block;overflow:visible');
  svg.innerHTML = s;
  return svg;
}
/* Memoiser plan-forhåndsvisningene (teknisk #7): signaturen utelater melTemp,
   eltMin og maskin fordi de bare påvirker vanntemperaturen — ikke løft, gjær
   eller total tid. Dermed slipper vi 5 gjennomregninger ved hvert trykk på de
   varmebalanse-kontrollene. */
let _planMemo = { sig: null, data: {} };
function planForhaandsvis(tpId, ferdigMs) {
  // `heveplan` er UTE av signaturen: forhåndsvisningen regner alltid med
  // planens egne trinn, fordi det er dem klikket gir.
  const sig = JSON.stringify([S.brotype, S.grov, S.hyd, S.ff, S.ffType, S.tillegg, S.antall, S.vekt,
    // Rom og kjøleskap MÅ være med: de flytter hvert eneste trinns miljø, og uten
    // dem viste forhåndsvisningen tallene fra før man skrudde på temperaturen.
    S.startTemp, S.saltPct, S.lokk, S.fulltKjol, S.stekeProfil, S.autolyseMin, S.ffTemp, S.ffTimer,
    S.romTemp, S.kjolskapTemp, ferdigMs]);
  if (_planMemo.sig !== sig) _planMemo = { sig, data: {} };
  if (!_planMemo.data[tpId]) {
    const st = Object.assign({}, S, { tid: tpId, heveplan: null });
    const prov = regn(st);
    const pK = kjede(st, prov, ferdigMs);
    _planMemo.data[tpId] = { prov, pK };
  }
  return _planMemo.data[tpId];
}
function klHM(ms) { return new Date(ms).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }); }
/* Lokal tid på formen datetime-local krever: YYYY-MM-DDTHH:MM (uten sekunder). */
function tilDatoLokal(ms) {
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
}
/* Dato og klokkeslett som TO kontroller: <input type="date"> pluss en <select>
   med kvarters oppløsning. Ett datetime-local-felt ga i praksis fritekst-følelse
   på telefon; date-feltet og select-en åpner hver sitt NATIVE hjul, som er det
   som faktisk fungerer med melete fingre. Kvarter er finmasket nok for en
   bakeplan, og står klokka utenfor kvartersnettet (f.eks. satt av «Start nå»),
   beholdes den eksakte tiden som eget valg øverst til man velger noe annet. */
function datoTidVelger(ms, onSet, aria) {
  const p = n => String(n).padStart(2, '0');
  const d = new Date(ms);
  const naa = p(d.getHours()) + ':' + p(d.getMinutes());
  const tider = [];
  if (d.getMinutes() % 15 !== 0) tider.push(naa);
  for (let m = 0; m < 24 * 60; m += 15) tider.push(p(Math.floor(m / 60)) + ':' + p(m % 60));
  return h('div', { style: 'display:flex;gap:8px' },
    // width:auto i style: .dato-inp har width:100 % i CSS-en, og i en flex-rad
    // ville to 100 %-bredder lagt seg utenfor kortet. Style-attributtet vinner.
    h('input', { type: 'date', class: 'dato-inp', style: 'flex:1.3;min-width:0;width:auto', 'aria-label': aria + ' — dato',
      value: tilDatoLokal(ms).slice(0, 10),
      onchange: e => {
        const [y, mn, dg] = String(e.target.value).split('-').map(Number);
        if (!y || !mn || !dg) return;
        const ny = new Date(ms); ny.setFullYear(y, mn - 1, dg); onSet(ny.getTime());
      } }),
    h('select', { class: 'dato-inp', style: 'flex:1;min-width:0;width:auto', 'aria-label': aria + ' — klokkeslett',
      onchange: e => {
        const [t, m] = String(e.target.value).split(':').map(Number);
        if (!isFinite(t) || !isFinite(m)) return;
        const ny = new Date(ms); ny.setHours(t, m, 0, 0); onSet(ny.getTime());
      } },
      ...tider.map(t => h('option', { value: t, selected: t === naa ? 'selected' : null }, t))));
}
/* Full dato med ukedag — baken går over døgnskiller, så «17:00» alene sier ikke
   hvilken dag. «fredag 31. juli, 17:00». */
function klDato(ms) {
  const dag = new Date(ms).toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
  return dag.charAt(0).toUpperCase() + dag.slice(1) + ', kl. ' + klHM(ms);
}
function ukedagKort(ms) { return new Date(ms).toLocaleDateString('nb-NO', { weekday: 'short' }).replace(/\.$/, ''); }
/* Ukedagen skrevet ut («Lørdag»), og datoen kort («1. aug.») — de står i hver
   sin kolonne i start/ferdig-oppsummeringen, så de må være hver sin verdi og
   ikke én ferdig sammensatt setning. */
function ukedagLang(ms) {
  const d = new Date(ms).toLocaleDateString('nb-NO', { weekday: 'long' });
  return d.charAt(0).toUpperCase() + d.slice(1);
}
function datoKort(ms) {
  return new Date(ms).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}
/* Dato på en loggpost, skrevet så man ser NÅR PÅ ÅRET det var — «14. februar
   2026», ikke «14.2.2026». Poenget med datoen i loggen er å kunne kjenne igjen
   årstiden: melet, romtemperaturen og kjøkkenet er ikke det samme i februar som
   i august, og det forklarer ofte hvorfor et bak oppførte seg som det gjorde.

   `laget` er tidsstempelet i ms. Eldre poster har bare `dato` som tekst, og da
   vises den som den er — bedre enn å gjette. */
function loggDato(b) {
  const ms = lagetMs(b);
  if (ms > 0) {
    const d = new Date(ms);
    const naa = new Date();
    const dager = Math.floor((naa - d) / 86400000);
    const full = d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
    if (dager <= 0) return 'i dag';
    if (dager === 1) return 'i går';
    if (dager < 7) return 'for ' + dager + ' dager siden';
    return full;
  }
  return (b && b.dato) || '';
}
/* Antall døgnskiller mellom to tidspunkt (0 = samme dag). */
function dagSpenn(startMs, sluttMs) {
  const a = new Date(startMs); a.setHours(0, 0, 0, 0);
  const b = new Date(sluttMs); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function flyttFerdig(min) {
  const base = S.ferdigMs != null ? S.ferdigMs : standardFerdig();
  // I vindu-modus flyttes hele vinduet (både start og ferdig), så baken beholder
  // lengden sin — du skyver bare når den skjer. Ellers flyttes bare ferdig.
  if (S.tidModus === 'vindu' && S.vinduStart != null) {
    settVindu(S.vinduStart + min * 60000, base + min * 60000);
    return;
  }
  S.ferdigMs = base + min * 60000; oppdater();
}

/* ============================================================
   4 · PROSESS
   ============================================================ */
/* Timer bundet til TOPPLINJA: alltid synlig, på alle skjermer, så lenge en
   timer går. Ringer en timer, blir stripa en rød alarm med «Skru av». Ellers
   viser den nærmeste nedtellingen, og et trykk tar deg til prosess-steget. */
function tegnTopplinjeTimer() {
  const timere = (S.timere || []).slice().sort((a, b) => a.slutt - b.slutt);
  if (!timere.length) return null;
  const now = Date.now();
  const ringer = timere.filter(t => now >= t.slutt && !t.kvittert);
  const gaaTil = t => { S.skjerm = 'prosess'; if (t.stegId) { S.aktivStegId = t.stegId; S.aktivSteg = 0; } oppdater(); };
  if (ringer.length) {
    const t = ringer[0];
    return h('div', { class: 'topp-timer alarm' },
      h('button', { class: 'topp-timer-hoved', onClick: () => gaaTil(t) },
        h('span', { class: 'topp-timer-ikon', 'aria-hidden': 'true' }, '⏰'),
        h('span', { class: 'topp-timer-navn' }, t.navn + (ringer.length > 1 ? '  +' + (ringer.length - 1) : ''))),
      h('button', { class: 'topp-timer-av', onClick: () => avbrytTimer(t.id) }, 'Skru av'));
  }
  const t = timere[0];
  return h('div', { class: 'topp-timer' },
    h('button', { class: 'topp-timer-hoved', onClick: () => gaaTil(t) },
      h('span', { class: 'topp-timer-ikon', 'aria-hidden': 'true' }, '⏰'),
      h('span', { class: 'topp-timer-navn' }, t.navn),
      h('span', { class: 'topp-timer-tid', 'data-timer': t.id }, timerTekst(t.slutt - now)),
      timere.length > 1 ? h('span', { class: 'topp-timer-flere' }, '+' + (timere.length - 1)) : null));
}

/* Timer-panelet: pågående baketimere med levende nedtelling. Ligger øverst på
   prosess-skjermen så «hvor lenge igjen» er ett blikk unna. */
function tegnTimerpanel() {
  const now = Date.now();
  /* STABIL rekkefølge (slik de ble startet), IKKE sortert på gjenstående tid.
     Sorterte man på tid, hoppet radene om plass i det du justerte: trykket du
     +5 til én timer passerte en annen, byttet radene stå, og neste trykk på
     samme skjermplass traff plutselig en ANNEN timer — «man flytter på flere
     timere samtidig». Fast rekkefølge holder raden (og +5/−5) på sin egen timer. */
  const timere = (S.timere || []).slice();
  if (!timere.length) return null;
  const boks = h('div', { class: 'timer-panel' },
    h('div', { class: 'seksjonstittel', style: 'margin:2px 2px 6px' }, timere.length > 1 ? timere.length + ' timere' : 'Timer'),
    ...timere.map(t => {
      const ferdig = t.slutt <= now;
      return h('div', { class: 'timerrad' + (ferdig ? ' ferdig' : '') },
        h('div', { style: 'flex:1;min-width:0' },
          h('div', { class: 'timer-navn' }, t.navn),
          h('div', { class: 'timer-tid', 'data-timer': t.id }, ferdig ? 'ferdig' : timerTekst(t.slutt - now))),
        ferdig ? null : h('button', { class: 'timer-juster', 'aria-label': 'Fem minutter mindre', onClick: () => justerTimer(t.id, -5) }, '−5'),
        ferdig ? null : h('button', { class: 'timer-juster', 'aria-label': 'Fem minutter mer', onClick: () => justerTimer(t.id, 5) }, '+5'),
        h('button', { class: 'timer-avbryt', 'aria-label': ferdig ? 'Fjern timer' : 'Avbryt timer', onClick: () => avbrytTimer(t.id) }, '×'));
    }));
  // Ærlig om hva som skal til for at det faktisk ringer på telefonen.
  if (varslingStottes() && Notification.permission === 'default') {
    boks.appendChild(h('button', { class: 'btn btn-primary', style: 'width:100%;margin-top:8px;font-size:.82rem',
      onClick: async () => { await beOmVarsling(); (S.timere || []).forEach(planleggVarsel); oppdater(); } },
      '🔔 Slå på varsling — så ringer det på telefonen'));
  } else if (varslingStottes() && Notification.permission === 'denied') {
    boks.appendChild(h('div', { class: 'timer-hint' },
      'Varsling er avslått for denne siden — timeren teller ned her, men ringer ikke. Slå den på igjen i nettleserens innstillinger.'));
  } else if (varslingStottes() && Notification.permission === 'granted' && !planlagteVarslerStottes()) {
    // Ærlig om den reelle begrensningen: uten en push-tjeneste kan ikke en PWA
    // vekke en LÅST telefon. Timeren holder skjermen på mens den går (wakelock),
    // så den ringer så lenge du ikke slår av skjermen selv.
    boks.appendChild(h('div', { class: 'timer-hint' },
      'Telefonen holder skjermen på mens en timer går, så alarmen ringer. Låser du telefonen med av-knappen, kan varselet utebli — nettleseren får ikke vekke en helt lukket app uten en egen varslingstjeneste. La appen ligge åpen for de viktige timerne.'));
  }
  return boks;
}

function tegnProsess(r, K) {
  const wrap = h('div');
  const tp = tegnTimerpanel();
  if (tp) wrap.appendChild(tp);
  /* «Dette må være i huset» er steg null: å oppdage at melet ikke rekker etter
     at forfermenten står, hjelper ingen. Den lå som et sammenklappet kort
     NEDERST — altså etter alt man skulle gjort med varene.

     Den ligger med vilje UTENFOR `kjede()`: kjeden eier de tidsatte stegene, og
     et steg uten varighet der ville forskjøvet klokkeslettene i alt som leser
     den (Tid, grafen, totaltiden). */
  const handleliste = tegnHandleliste(r);
  if (handleliste) wrap.appendChild(handleliste);
  /* Aktivt steg identifiseres på ID, ikke posisjon.
     Slår man på autolyse eller et frøtillegg, settes et nytt steg inn FORAN i
     kjeden, og den lagrede indeksen pekte plutselig på et helt annet steg. */
  let i = K.findIndex(x => x.id === S.aktivStegId);
  if (i < 0) i = Math.min(Math.max(0, S.aktivSteg || 0), K.length - 1);
  const settSteg = j => {
    const n = Math.min(Math.max(0, j), K.length - 1);
    S.aktivSteg = n; S.aktivStegId = K[n] ? K[n].id : null; oppdater();
  };
  /* Grønn hake kommer fra KVITTERINGEN, ikke fra hvor du står i lista: et steg
     er gjort når du har fullført (eller hoppet over) det med knapp — å bla seg
     forbi teller ikke (Bjørn 01.08). */
  wrap.appendChild(h('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:12px' },
    h('div', { class: 'framdrift', style: 'flex:1;margin:0' }, ...K.map((s, j) =>
      h('div', { class: 'prikk' + (stegGjort(s.id) ? ' gjort' : j === i ? ' naa' : '') }))),
    h('div', { style: 'font-size:.72rem;color:var(--color-neutral-600);white-space:nowrap;font-variant-numeric:tabular-nums' }, 'steg ' + (i + 1) + ' av ' + K.length)));

  wrap.appendChild(stegKort(K[i], 'I GANG', { harFlere: i < K.length - 1 }));

  wrap.appendChild(h('div', { style: 'display:flex;gap:8px;margin:6px 0 14px' },
    h('button', { class: 'btn', style: 'flex:1', disabled: i === 0 ? '' : null, onClick: () => settSteg(i - 1) }, '‹ Forrige'),
    h('button', { class: 'btn btn-primary', style: 'flex:1', disabled: i === K.length - 1 ? '' : null, onClick: () => settSteg(i + 1) }, 'Neste ›')));

  wrap.appendChild(h('div', { class: 'seksjonstittel' }, 'Hele prosessen · totalt ' + fmt(K.totalT, 1) + ' t'));
  K.forEach((s, j) => {
    const gjort = stegGjort(s.id);
    const kvI = stegKv(s.id);
    wrap.appendChild(h('button', { class: 'valgkort' + (j === i ? ' paa' : ''), style: 'min-height:48px', onClick: () => settSteg(j) },
      h('span', { style: 'flex:0 0 24px;height:24px;border-radius:999px;display:grid;place-items:center;font-size:.72rem;font-weight:800;' + (gjort ? 'background:var(--color-accent-2-500);color:#fff' : 'background:var(--color-neutral-200)') }, gjort ? '✓' : String(j + 1)),
      h('span', { style: 'flex:1;min-width:0;font-size:.86rem;font-weight:600' }, s.navn,
        kvI && kvI.notat ? h('span', { style: 'display:block;font-size:.68rem;font-weight:400;color:var(--color-neutral-600);overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, '💬 ' + kvI.notat) : null),
      h('span', { style: 'font-size:.74rem;color:var(--color-neutral-600);font-variant-numeric:tabular-nums' }, klokke(s.tid))));
  });

  // Diskré vei tilbake til handlelista når den er kvittert bort — den skal ikke
  // stå over stegene, men den skal fortsatt være å finne.
  if (S.handlelisteOk) {
    wrap.appendChild(h('button', { class: 'btn-ghost', style: 'margin-top:14px',
      onClick: () => { S.handlelisteOk = false; oppdater(); } }, 'Vis handlelista igjen'));
  }

  return wrap;
}
function tegnHandleliste(r) {
  // Kvittert bort? Da forsvinner den helt fra toppen — den lå bare i veien over
  // stegene. En diskré vei tilbake ligger nederst på prosess-skjermen.
  if (S.handlelisteOk) return null;
  const d = h('div', { class: 'kort', style: 'padding:0;margin-bottom:12px' });
  d.appendChild(h('div', { style: 'padding:14px 16px 0' },
    h('div', { class: 'kort-num' }, 'Før du starter · dette må være i huset'),
    h('div', { class: 'hjelpetekst', style: 'margin-top:4px' },
      'Sjekk at du har alt før forfermenten står — det er for sent å oppdage at melet ikke rekker når deigen er i gang.')));
  const kropp = h('div', { style: 'padding:0 16px 14px' });
  const seksjon = (tittel, rader) => {
    if (!rader.length) return;
    kropp.appendChild(h('div', { class: 'felt-label', style: 'margin-top:10px;font-weight:800' }, tittel));
    rader.forEach(([k, v]) => kropp.appendChild(h('div', { class: 'tallrad' }, h('span', null, k), h('b', null, v))));
  };
  seksjon('Mel', r.mel.map(m => [m.navn, veiG(m.gram)]));
  seksjon('Væske og gjær', [['Vann', veiG(r.vannTotal)], ['Salt', veiG(r.salt)], ['Tørrgjær', veiG(r.gjaerTotal)]]);
  seksjon('Frø og korn', r.fro.filter(f => f.gram > 0).map(f => [f.navn, veiG(f.gram)]));
  const smakRader = [];
  if (r.honning > 0.1) smakRader.push(['Honning', veiG(r.honning)]);
  if (r.olje > 0.1) smakRader.push(['Olje', veiG(r.olje)]);
  if (r.malt > 0.01) smakRader.push(['Malt', veiG(r.malt)]);
  seksjon('Smak', smakRader);
  const u = (typeof UTSTYR !== 'undefined') && UTSTYR.find(x => x.id === S.utstyr);
  const vektNavn = (S.vektTrinn || 1) >= 1 ? 'hele gram' : (S.vektTrinn === 0.1 ? '0,1 g' : '0,01 g');
  const utstyrRader = [['Stekeutstyr', u ? u.navn : '—']];
  // Hevekurv er bare relevant når brukeren faktisk velger form (bygg-ruta),
  // ikke for presets som skjuler form/kurv (teknisk #6).
  if (r.bt.rute !== 'preset') utstyrRader.push(['Hevekurv', (FORMER.find(f => f.id === S.form) || {}).navn || '—']);
  utstyrRader.push(['Vekt', 'som viser ' + vektNavn]);
  seksjon('Utstyr', utstyrRader);
  kropp.appendChild(h('button', { class: 'btn btn-primary btn-full', style: 'margin-top:14px',
    onClick: () => { S.handlelisteOk = true; oppdater(); } }, 'Jeg har alt — start prosessen'));
  d.appendChild(kropp);
  return d;
}
/* ---------- MÅLEKRUKKA — heveindikatoren ----------
   Kjernen i appens filosofi: klokka styrer rekkefølgen, men DEIGEN bestemmer.
   Står det 4 t bulk og krukka har nådd hevemålet etter 3, er den ferdig. Blir
   klokka og krukka uenige, har krukka rett.

   Metoden: ta en liten, RETT-SIDET beholder (et lite glass, en målekrukke), legg
   i en klump deig, trykk flat og merk av startnivået — eller merk av nivået på
   selve deigen i en rett bøtte. Når nivået har steget måltallet, er den klar.

   Verktøyet gjør to ting: viser målet visuelt som en krukke, og regner om
   startnivået DITT (ml, cm, hva du enn leser av) til nivået du baker ut på — så
   du slipper hoderegning ved benken. `steg.maalRise` er måltallet i prosent. */
function tegnKrukke(steg) {
  const lo = steg.maalRise, hi = steg.maalRise * 1.2;      // båndet, som «Mål stigning»
  const loF = lo / 100, hiF = hi / 100;
  const snittF = (loF + hiF) / 2;
  // Visuell krukke: start ligger på en fast andel, målet stiger derfra.
  const startFrac = 0.40;
  const maalFrac = Math.min(0.94, startFrac * (1 + snittF));

  const jug = h('div', { class: 'krukke-jug' },
    h('div', { class: 'krukke-deig', style: 'height:' + (startFrac * 100).toFixed(0) + '%' }),
    h('div', { class: 'krukke-startlinje', style: 'bottom:' + (startFrac * 100).toFixed(0) + '%' }),
    h('div', { class: 'krukke-maallinje', style: 'bottom:' + (maalFrac * 100).toFixed(0) + '%' },
      h('span', { class: 'krukke-maal-tag' }, 'bak ut')));

  // Kalkulator: startnivå → utbaknivå, i brukerens egen enhet.
  const utEl = h('div', { class: 'krukke-ut' });
  const settUt = v => {
    if (v > 0) {
      utEl.replaceChildren(
        h('span', null, 'Bak ut når krukka når '),
        h('b', null, fmt(v * (1 + loF), 0) + '–' + fmt(v * (1 + hiF), 0)),
        h('span', { style: 'color:var(--color-neutral-600)' }, ' (fra ' + fmt(v, 0) + ')'));
    } else {
      utEl.replaceChildren(h('span', { style: 'color:var(--color-neutral-600)' },
        'Skriv startnivået du merker av, så regner jeg ut hvor høyt det skal stige.'));
    }
  };
  const inn = h('input', {
    // Full bredde: .gramfelt er 5,2 em, og der ble selv plassholderen «f.eks.
    // 500» kuttet — raden har hele kortbredden å ta av (Bjørn 01.08).
    class: 'gramfelt', type: 'number', inputmode: 'numeric', min: 0, step: 10,
    style: 'flex:1;width:auto;min-width:0;text-align:left',
    value: S.krukkeStart != null ? S.krukkeStart : '', placeholder: 'f.eks. 500',
    'aria-label': 'Startnivå i målekrukka',
    onchange: e => {
      const raw = String(e.target.value).replace(',', '.').trim();
      const v = parseFloat(raw);
      S.krukkeStart = (raw === '' || !isFinite(v) || v < 0) ? null : v;
      // Oppdater bare tallet, ikke hele skjermen — så fokus ikke rykker vekk.
      settUt(S.krukkeStart || 0);
    }
  });
  settUt(S.krukkeStart || 0);

  const hode = h('div', { class: 'krukke-hode' },
    h('span', { class: 'krukke-ikon', 'aria-hidden': 'true' }, '🫙'),
    h('div', null,
      h('div', { class: 'krukke-tittel' }, 'Målekrukka avgjør'),
      h('div', { class: 'krukke-under' }, 'Deigen skal vokse ', h('b', null, steg.maalRiseTxt))));

  const nullstill = S.krukkeStart != null
    ? h('button', { class: 'm-fjern', 'aria-label': 'Nullstill startnivå',
        onClick: () => { S.krukkeStart = null; oppdater(); } }, '×')
    : null;

  const hoyre = h('div', { class: 'krukke-hoyre' },
    h('div', { class: 'krukke-metode' },
      'Legg en klump deig i et rett-sidet glass, trykk flat og merk av nivået — eller merk av på selve deigen i en rett bøtte.'),
    h('div', { class: 'felt-label', style: 'margin-top:10px' }, 'Startnivå (ml, cm — din enhet)'),
    h('div', { style: 'display:flex;align-items:center;gap:8px' }, inn, nullstill),
    utEl);

  return h('div', { class: 'krukke-kort' },
    hode,
    h('div', { class: 'krukke-rad' }, jug, hoyre),
    h('div', { class: 'krukke-note' },
      'Klokka styrer rekkefølgen, men deigen bestemmer. Har krukka nådd målet før klokka, er den likevel ferdig — og blir de uenige, har krukka rett.'));
}

/* ---------- Kvittering per steg ----------
   Hvert steg eier sin egen kvittering (Bjørn 01.08): ingrediensene hakes av,
   steget fullføres (eller hoppes over) med knapp, og først da får det grønn
   hake — tid alene gjør ikke et steg «gjort». Kvitteringene bor i `stegKvitt`
   (data, synkes), nullstilles av nyBakst/bakPaaNytt, og notatene følger med
   inn i loggposten når baket lagres. */
function stegKv(id) { return (S.stegKvitt && S.stegKvitt[id]) || null; }
function settKv(id, endr) {
  const gml = stegKv(id) || { ing: {}, ok: null, hoppet: false, notat: '', avvikOk: false };
  S.stegKvitt = Object.assign({}, S.stegKvitt, { [id]: Object.assign({}, gml, endr) });
  oppdater();
}
function stegGjort(id) { const kv = stegKv(id); return !!(kv && (kv.ok || kv.hoppet)); }
/* Avvik mot planen i minutter: + = ferdig ETTER planlagt slutt, − = før.
   Regnes av kvitteringstidspunktet, så tallet står i ro etterpå. */
function stegAvvikMin(steg) {
  const kv = stegKv(steg.id);
  if (!kv || !kv.ok) return 0;
  return Math.round((kv.ok - (steg.tid.getTime() + steg.varighet * 60000)) / 60000);
}

function stegKort(steg, status, ctx) {
  const kropp = h('div', { class: 'kropp' });
  if (steg.hoved) {
    kropp.appendChild(h('div', { style: 'display:flex;align-items:flex-end;gap:12px' },
      h('div', { style: 'flex:1;min-width:0' },
        h('div', { class: 'hovedtall' }, steg.hoved),
        steg.hovedNote ? h('div', { class: 'hovednote' }, steg.hovedNote) : null),
      steg.sideV ? h('div', { style: 'text-align:right' },
        h('div', { style: 'font-size:.64rem;font-weight:800;letter-spacing:.06em;color:var(--color-neutral-500);text-transform:uppercase' }, steg.sideK || ''),
        h('div', { style: 'font-size:1.15rem;font-weight:800;font-variant-numeric:tabular-nums' }, steg.sideV)) : null));
  }
  /* Ingrediens-sjekklista — bare på det AKTIVE steget (status satt). Hver rad
     er en avkryssbar knapp; «tall»-radene under er referanse, dette er
     handlingene. Avhukingen huskes i stegKvitt. */
  const kv = stegKv(steg.id);
  if (status && steg.ingredienser && steg.ingredienser.length) {
    const liste = h('div', { class: 'sjekkliste' },
      h('div', { class: 'felt-label', style: 'font-weight:800;margin-bottom:4px' }, 'Ingredienser i dette steget — huk av'));
    steg.ingredienser.forEach(([navn, mengde]) => {
      const paa = !!(kv && kv.ing && kv.ing[navn]);
      liste.appendChild(h('button', { class: 'sjekkrad' + (paa ? ' paa' : ''),
        'aria-pressed': paa ? 'true' : 'false',
        onClick: () => settKv(steg.id, { ing: Object.assign({}, (kv && kv.ing) || {}, { [navn]: !paa }) }) },
        h('span', { class: 'sjekkboks' }, paa ? '✓' : ''),
        h('span', { style: 'flex:1;min-width:0;text-align:left' }, navn),
        h('span', { style: 'font-weight:800;font-variant-numeric:tabular-nums' }, mengde)));
    });
    kropp.appendChild(liste);
  }
  if (steg.tall && steg.tall.length) kropp.appendChild(h('div', { style: 'margin-top:8px' }, ...steg.tall.map(([k, v]) => h('div', { class: 'tallrad' }, h('span', null, k), h('b', null, v)))));
  if (steg.gjor) kropp.appendChild(h('div', { class: 'instruks' }, h('span', { class: 'lab' }, 'Slik gjør du'), steg.gjor));
  if (steg.sjekk) kropp.appendChild(h('div', { class: 'instruks sjekk' }, h('span', { class: 'lab' }, 'Sjekk'), steg.sjekk));
  // Målekrukka: bare på gjæringstrinn der man faktisk kan følge stigningen, og
  // bare på det AKTIVE steget (status satt) — ikke i hele-prosessen-lista.
  if (steg.krukke && steg.maalRise && status) kropp.appendChild(tegnKrukke(steg));
  // Timer for det aktive steget: setter en nedtelling på stegets varighet, som
  // ringer på telefonen når det er tid å sjekke. Ikke på forvarmingen (den
  // overlapper), og ikke der en timer alt er satt for steget.
  // `ingenTimer`: steg som er en HANDLING (snitt og sett inn) har ingenting å
  // telle ned — en timer der er støy (Bjørn 02.08).
  if (status && steg.varighet >= 1 && steg.id !== 'ovn' && !steg.ingenTimer) {
    const alt = (S.timere || []).some(t => t.stegId === steg.id);
    /* Timeren teller den KONKRETE ventingen i steget (steg.timerMin — f.eks.
       benkehvilen på 15 min i formingen), ikke stegets totale varighet med
       veiing og håndarbeid rundt (Bjørn 02.08). Uten eget timer-mål er hele
       varigheten ventingen (heving, autolyse, steking), og da brukes den. */
    const tMin = steg.timerMin != null ? steg.timerMin : Math.round(steg.varighet);
    const navn = steg.timerNavn ? steg.timerNavn
               : steg.id === 'stek' ? 'Brødet er ferdig — sjekk kjernetemperaturen'
               : steg.id === 'kjol' ? 'Brødet er avkjølt — nå kan du skjære'
               : (steg.krukke ? 'Sjekk deigen: ' : '') + steg.navn;
    kropp.appendChild(h('div', { style: 'margin-top:12px' },
      alt
        ? h('div', { class: 'timer-satt' }, '⏰ Timer i gang — se øverst på skjermen')
        : h('button', { class: 'btn timer-start', style: 'width:100%',
            onClick: () => startTimer(navn, tMin, steg.id) },
            '⏰ Sett timer på ' + fmtTimer(tMin / 60) +
            (steg.timerMin != null && Math.round(steg.varighet) !== steg.timerMin ? ' — ' + navn.split(' — ')[0].toLowerCase() : ''))));
  }
  /* Kvittering: fullfør (grønn hake) eller hopp over. Fullføring før/etter
     planlagt slutt utløser tilbudet om å FLYTTE resten av planen tilsvarende —
     eksempelet fra virkeligheten: bulken trengte 3 timer, ikke 4, og da skal
     resten av kjeden rykke fram i stedet for å lyve om klokkeslettene. Flyttingen
     gjøres ved å justere ferdig-ankeret (kjeden regnes bakover fra det), så alle
     gjenstående steg følger med. Kommentarfeltet lagres per steg og følger med
     inn i loggposten — det er slik appen skal lære av bakene. */
  if (status) {
    const gjort = stegGjort(steg.id);
    const kvitt = h('div', { style: 'margin-top:12px' });
    if (!gjort) {
      const alleIng = steg.ingredienser && steg.ingredienser.length
        ? Object.fromEntries(steg.ingredienser.map(([navn]) => [navn, true])) : null;
      kvitt.appendChild(h('div', { style: 'display:flex;gap:8px' },
        h('button', { class: 'btn btn-primary', style: 'flex:1.4', onClick: () => {
          settKv(steg.id, Object.assign({ ok: Date.now() }, alleIng ? { ing: alleIng } : {}));
        } }, alleIng ? '✓ Alt i — fullfør steget' : '✓ Fullfør steget'),
        h('button', { class: 'btn', style: 'flex:1', onClick: () => settKv(steg.id, { hoppet: true }) }, 'Hopp over')));
    } else {
      const avvik = stegAvvikMin(steg);
      kvitt.appendChild(h('div', { style: 'display:flex;align-items:center;gap:8px' },
        h('span', { class: 'pille', style: 'background:var(--color-accent-2-100);color:var(--color-accent-2-700)' },
          kv && kv.hoppet && !kv.ok ? 'HOPPET OVER' : '✓ FULLFØRT' + (kv && kv.ok ? ' ' + klHM(kv.ok) : '')),
        h('button', { class: 'btn-ghost', style: 'margin-left:auto;font-size:.76rem',
          onClick: () => settKv(steg.id, { ok: null, hoppet: false, avvikOk: false }) }, 'Angre')));
      // Plan-korrigeringen: vis når avviket er reelt (>20 min), ikke avfeid, og
      // det finnes gjenstående steg å flytte.
      if (kv && kv.ok && !kv.avvikOk && Math.abs(avvik) > 20 && steg.id !== 'kjol' && ctx && ctx.harFlere) {
        const foer = avvik < 0;
        kvitt.appendChild(h('div', { class: 'varsel', style: 'margin-top:8px' },
          h('b', null, 'Du ble ferdig ' + fmtTimer(Math.abs(avvik) / 60) + (foer ? ' FØR' : ' ETTER') + ' planen. '),
          'Skal resten av planen flyttes tilsvarende, så klokkeslettene stemmer igjen?',
          h('div', { style: 'display:flex;gap:8px;margin-top:8px' },
            h('button', { class: 'btn btn-primary', style: 'flex:1.4;font-size:.8rem', onClick: () => {
              S.ferdigMs = (S.ferdigMs != null ? S.ferdigMs : standardFerdig()) + avvik * 60000;
              if (S.tidModus === 'vindu') S.tidModus = 'ferdig';   // vinduet er historie når man justerer underveis
              oppdater();
            } }, 'Flytt planen ' + fmtTimer(Math.abs(avvik) / 60) + (foer ? ' fram' : ' bak')),
            h('button', { class: 'btn', style: 'flex:1;font-size:.8rem', onClick: () => settKv(steg.id, { avvikOk: true }) }, 'Behold planen'))));
      }
    }
    /* Kommentar til steget — lagres i loggen sammen med baket. EKSPLISITT
       Lagre-knapp, ikke blur: på mobil er blur usynlig og upålitelig, og man
       skal SE at kommentaren kom inn (Bjørn 02.08). Lagret kommentar vises som
       tekst med Rediger-knapp. */
    const harNotat = !!(kv && kv.notat);
    const redigerer = S.stegNotatRediger === steg.id;
    if (harNotat && !redigerer) {
      kvitt.appendChild(h('div', { class: 'steg-notat-vis' }, '💬 ' + kv.notat));
      kvitt.appendChild(h('button', { class: 'btn-ghost', style: 'font-size:.78rem;margin-top:2px',
        onClick: () => { S.stegNotatRediger = steg.id; oppdater(); } }, 'Rediger kommentar'));
    } else {
      const felt = h('textarea', { class: 'steg-notat autovoks', rows: 2,
        placeholder: 'Kommentar til steget — hva skjedde? (lagres i loggen)',
        'aria-label': 'Kommentar til steget ' + steg.navn,
        oninput: e => voksFelt(e.target)
      }, (kv && kv.notat) || '');
      kvitt.appendChild(felt);
      kvitt.appendChild(h('div', { style: 'display:flex;gap:8px;margin-top:6px' },
        h('button', { class: 'btn', style: 'flex:1.4;font-size:.8rem', onClick: () => {
          S.stegNotatRediger = null;
          settKv(steg.id, { notat: felt.value.trim() });
        } }, harNotat ? 'Lagre endringen' : 'Lagre kommentar'),
        redigerer ? h('button', { class: 'btn-ghost', style: 'flex:1;font-size:.8rem',
          onClick: () => { S.stegNotatRediger = null; oppdater(); } }, 'Avbryt') : null));
    }
    kropp.appendChild(kvitt);
  }
  const gjortNaa = stegGjort(steg.id);
  const pilleBg = status === 'I GANG'
    ? (gjortNaa ? 'background:var(--color-accent-2-500);color:#fff' : 'background:var(--color-accent-2-100);color:var(--color-accent-2-700)')
    : 'background:var(--color-neutral-200);color:var(--color-neutral-700)';
  return h('div', { class: 'stegkort ' + (steg.tone || 'noytral') },
    h('div', { style: 'display:flex;align-items:center;padding:14px 16px 2px' },
      status ? h('span', { class: 'pille', style: pilleBg }, gjortNaa && status === 'I GANG' ? '✓ GJORT' : status) : null,
      h('span', { style: 'margin-left:auto;font-size:.74rem;color:var(--color-neutral-600);font-variant-numeric:tabular-nums' }, klokke(steg.tid) + ' · ' + fmtTimer(steg.varighet / 60))),
    h('div', { style: 'font-family:var(--font-heading);font-size:1.3rem;line-height:1.15;padding:2px 16px 6px' }, steg.navn),
    kropp);
}

/* ============================================================
   5 · LOGG
   ============================================================ */
function tegnLogg(r) {
  const wrap = h('div');
  const form = h('div', { class: 'kort' },
    h('div', { class: 'kort-num' }, 'Loggfør dette baket'),
    h('div', { class: 'hjelpetekst', style: 'margin-top:6px' }, 'Forskjellen mellom en god og en fantastisk gjærbaker er en loggbok, ikke en surdeig. Endre én variabel per bak.'),
    h('input', { class: 'sok', style: 'margin-top:10px', placeholder: 'Navn — f.eks. Halvgrovt med svedjerug', value: S.lgNavn,
      // onblur lagrer: drepes fanen midt i et mange-timers bak (vanlig på
      // mobil), skal ikke navnet være borte (ux-review 01.08).
      oninput: e => { S.lgNavn = e.target.value; }, onblur: () => lagre() }),
    h('div', { style: 'display:flex;align-items:center;gap:12px;margin-top:4px' },
      h('div', { class: 'felt-label', style: 'flex:1' }, 'Karakter'),
      h('div', { class: 'stepper', style: 'width:170px' },
        h('button', { onClick: () => { S.lgKar = Math.max(1, S.lgKar - 1); oppdater(); } }, '−'),
        h('input', { type: 'text', inputmode: 'numeric', value: String(S.lgKar), onblur: e => { const v = parseInt(e.target.value); if (!isNaN(v)) S.lgKar = Math.min(10, Math.max(1, v)); oppdater(); } }),
        h('button', { onClick: () => { S.lgKar = Math.min(10, S.lgKar + 1); oppdater(); } }, '+'))));
  form.appendChild(tegnLoggBrod());
  form.appendChild(tegnBildeVelger());
  // Lagres automatisk med baket
  const auto = h('div', { class: 'info-boks', style: 'margin-top:12px' },
    h('div', { style: 'font-size:.66rem;font-weight:800;letter-spacing:.06em;color:var(--color-neutral-600);text-transform:uppercase;margin-bottom:6px' }, 'Lagres automatisk med baket'));
  [['Gjæringsdose', fmt(r.doseProfil.dose, 2)],
   ['Hydrering (effektiv)', fmt(r.hyd * 100, 0) + ' % (' + fmt(r.effektivHydrering * 100, 1) + ' %)'],
   ['Grovhet', fmt(r.brodskala.pct, 0) + ' % · ' + r.brodskala.kort.toLowerCase()],
   ['Tørrgjær', fmt(r.gjaerTorr, 3) + ' % = ' + fmt(r.gjaerTotal, 2) + ' g'],
   ['Deigtemp ut av maskin', grader(S.startTemp || 24, 1)],
   ['Løftindeks', r.loft.loft + ' / 100']
  ].forEach(([k, v]) => auto.appendChild(h('div', { class: 'tallrad' }, h('span', null, k), h('b', null, v))));
  form.appendChild(auto);
  form.appendChild(h('button', { class: 'btn btn-primary btn-full', style: 'margin-top:12px', onClick: () => lagreBak(r) }, 'Lagre baket'));
  /* Standardbrødet: oppskriften appen åpner på når det ikke ligger noe påbegynt
     der fra før. Samme avtrykk som loggposten bruker, så de kan ikke drifte. */
  const erStandard = S.standardBrod && JSON.stringify(S.standardBrod) === JSON.stringify(oppskriftAvtrykk());
  form.appendChild(h('button', { class: 'btn btn-full', style: 'margin-top:8px;font-size:.82rem',
    onClick: () => { S.standardBrod = erStandard ? null : oppskriftAvtrykk(); oppdater(); } },
    erStandard ? '✓ Dette er standardbrødet ditt — trykk for å fjerne' : 'Lagre dette som standardbrød'));
  form.appendChild(h('div', { style: 'font-size:.72rem;color:var(--color-neutral-600);margin-top:6px;line-height:1.45' },
    S.standardBrod
      ? 'Appen åpner på dette brødet når du starter på nytt uten noe påbegynt.'
      : 'Da åpner appen på dette brødet neste gang du starter uten noe påbegynt fra før.'));
  wrap.appendChild(form);

  if (!S.loggListe.length) {
    wrap.appendChild(h('div', { class: 'tomkort', style: 'margin-top:12px' },
      h('div', { class: 'hjelpetekst' }, 'Ingen bak logget ennå. Lagre det første når brødet er ute av ovnen — så kan du alltid hente oppskriften tilbake med «Bak dette på nytt».')));
  } else {
    wrap.appendChild(h('div', { class: 'seksjonstittel' }, 'Tidligere bakeøkter'));
    // Nyeste først, men med den EKTE indeksen i behold — reverse() på en kopi
    // ville gitt feil rad ved rediger/slett.
    for (let i = S.loggListe.length - 1; i >= 0; i--) wrap.appendChild(loggPost(S.loggListe[i], i));
  }
  // NB: tegnUtenKonto() returnerer null når man er utlogget eller bøtta er tom,
  // og appendChild(null) kaster. h() tåler null-barn; appendChild gjør det ikke.
  const utenKonto = tegnUtenKonto();
  if (utenKonto) wrap.appendChild(utenKonto);
  const konto = tegnKonto();
  if (konto) wrap.appendChild(konto);
  wrap.appendChild(tegnBackup());
  return wrap;
}
/* ---------- Per brød: stekemetode og kommentar ----------
   Ett bak er ofte FLERE brød stekt ulikt — fire emner der ett får klokka, ett
   står i glasset og to steker åpent — og da er «én metode per bak» ikke en
   ærlig logg (Bjørn 02.08). Radene følger antallet i oppskriften. Metode ''
   betyr «som oppsettet» og løses til gjeldende stekeprofil idet baket lagres,
   så loggposten sier hva som faktisk ble gjort, ikke en peker som kan drifte. */
function stekeMetodeNavn(id) {
  const p = (typeof BAKE_PROFILES !== 'undefined') && BAKE_PROFILES.find(x => x.id === id);
  return p ? p.navn : (id || '—');
}
function settLgBrod(i, felt, verdi) {
  const rader = (S.lgBrod || []).slice();
  while (rader.length <= i) rader.push({ metode: '', kommentar: '', bilder: [] });
  rader[i] = Object.assign({}, rader[i], { [felt]: verdi });
  S.lgBrod = rader;
}
/* Miniatyrrad for ETT brøds bilder: fjern-kryss på hver, + så lenge det er
   plass. Gjenbrukes av skjemaet og redigeringen — de skal se og oppføre seg
   likt, ellers lærer man UI-et to ganger. Maks 4 per brød (var 2 — «skorpe og
   krumme» holdt ikke: skorpe, bunn, krumme OG smøreprøven er et helt vanlig
   bak, Bjørn 02.08). Kvotevernet i skalerBilde() er den egentlige grensa;
   helhetsbildene av baket har sin egen velger med plass til 3. */
const MAKS_BRODBILDER = 4;
function brodBildeRad(nr, bilder, leggTil, fjern) {
  const inp = h('input', { type: 'file', accept: 'image/*', style: 'display:none',
    'aria-label': 'Velg bilde til brød ' + nr,
    onchange: e => skalerBilde(e.target.files && e.target.files[0], leggTil) });
  const rad = h('div', { class: 'logg-bilder', style: 'margin-top:6px' });
  bilder.forEach((src, k) => rad.appendChild(h('div', { style: 'position:relative' },
    h('img', { src, alt: 'Bilde ' + (k + 1) + ' av brød ' + nr, class: 'brod-mini' }),
    h('button', { class: 'bilde-fjern', 'aria-label': 'Fjern bilde ' + (k + 1) + ' av brød ' + nr,
      onClick: () => fjern(k) }, '×'))));
  if (bilder.length < MAKS_BRODBILDER) rad.appendChild(h('button', { class: 'brod-mini-ny',
    'aria-label': 'Legg til bilde av brød ' + nr, onClick: () => inp.click() }, '+'));
  rad.appendChild(inp);
  return rad;
}
function tegnLoggBrod() {
  const antall = Math.max(1, S.antall || 1);
  const boks = h('div', { style: 'margin-top:10px' },
    h('div', { class: 'felt-label' }, 'Brød for brød'),
    h('div', { class: 'hjelpetekst', style: 'margin-top:2px' },
      'Stekes brødene ulikt, velg metode og noter hva du gjorde per brød. Legg gjerne ved bilde av hvert brød. Radene følger antallet i oppskriften (' + antall + ').'));
  for (let i = 0; i < antall; i++) {
    const rad = (S.lgBrod || [])[i] || { metode: '', kommentar: '', bilder: [] };
    boks.appendChild(h('div', { class: 'felt-label', style: 'margin-top:8px' }, 'Brød ' + (i + 1)));
    boks.appendChild(h('select', { class: 'sok', 'aria-label': 'Stekemetode for brød ' + (i + 1),
      onchange: e => { settLgBrod(i, 'metode', e.target.value); oppdater(); } },
      h('option', { value: '', selected: !rad.metode ? 'selected' : null },
        'Som oppsettet — ' + stekeMetodeNavn(S.stekeProfil)),
      ...(typeof BAKE_PROFILES !== 'undefined' ? BAKE_PROFILES : []).map(p =>
        h('option', { value: p.id, selected: rad.metode === p.id ? 'selected' : null }, p.navn))));
    /* Textarea, ikke input: en kommentar på tre setninger skal bryte til nye
       linjer og vokse, ikke scrolles fram sidelengs. Innholdet står som
       tekstBARN — `value` som attributt gjør ingenting på en textarea, og
       feltet ville stått tomt etter neste render. */
    boks.appendChild(h('textarea', { class: 'sok autovoks', rows: 1, style: 'margin-top:6px',
      placeholder: 'Kommentar — f.eks. glasset av etter 18 min',
      'aria-label': 'Kommentar til brød ' + (i + 1),
      // onblur lagrer, av samme grunn som navnefeltet: drepes fanen midt i
      // et mange-timers bak, skal ikke notatet være borte.
      oninput: e => { settLgBrod(i, 'kommentar', e.target.value); voksFelt(e.target); },
      onblur: () => lagre() }, rad.kommentar || ''));
    /* Bildene leses fra S i det bildet er ferdig skalert, ikke fra closure-
       `rad`: skaleringen er asynkron, og i mellomtiden kan andre felt på raden
       ha endret seg. `lagre()` med én gang — bildet tas gjerne timer før baket
       lagres, og skal ikke være borte om fanen drepes. */
    boks.appendChild(brodBildeRad(i + 1, rad.bilder || [],
      data => { settLgBrod(i, 'bilder', (((S.lgBrod || [])[i] || {}).bilder || []).concat([data])); lagre(); oppdater(); },
      k => { settLgBrod(i, 'bilder', ((((S.lgBrod || [])[i] || {}).bilder) || []).filter((_, m) => m !== k)); oppdater(); }));
  }
  return boks;
}

/* Feltene som SKAL til for å bake det samme igjen. Bevisst en hviteliste og
   ikke «hele S minus litt»: visningstilstand, logg, favoritter og kontoting har
   ingenting i en oppskrift å gjøre, og en svarteliste ville sluppet gjennom
   hvert nytt felt som legges til senere. */
const OPPSKRIFT_FELT = ['brotype', 'grov', 'hyd', 'tid', 'ff', 'ffType', 'ffTemp', 'ffRomTemp', 'ffRomTid', 'ffTimer', 'ffKjol',
  'tillegg', 'antall', 'vekt', 'startTemp', 'melTemp', 'maskin', 'eltMin', 'romTemp', 'kjolskapTemp',
  'stekeProfil', 'stekeProfilManuell', 'lokk', 'fulltKjol', 'form', 'utstyr', 'pyrexIOvn',
  'saltPct', 'heveplan', 'melOverstyr', 'okDeig', 'froVannPaaToppen', 'vinduStart'];
function oppskriftAvtrykk() {
  const o = {};
  OPPSKRIFT_FELT.forEach(k => { if (S[k] !== undefined) o[k] = S[k]; });
  try { return JSON.parse(JSON.stringify(o)); } catch (e) { return null; }
}
function lagreBak(r) {
  const naa = Date.now();
  /* Stegnotatene og avvikene fra prosess-skjermen følger med inn i posten —
     «bulken trengte 3 t, ikke 4» skal kunne leses ut igjen senere og gjøre
     neste bak (og appen) bedre (Bjørn 01.08). Navnene hentes fra kjeden slik
     den så ut da baket ble lagret. */
  const K = kjede(S, r, S.ferdigMs != null ? S.ferdigMs : standardFerdig());
  const stegNotater = K.map(s => {
    const kv = stegKv(s.id);
    if (!kv || (!kv.notat && !kv.hoppet && !(kv.ok && Math.abs(stegAvvikMin(s)) > 20))) return null;
    return {
      steg: s.navn,
      notat: kv.notat || '',
      hoppet: !!kv.hoppet && !kv.ok,
      avvikMin: kv.ok ? stegAvvikMin(s) : null
    };
  }).filter(Boolean);
  /* Brød-radene: '' løses til gjeldende stekeprofil NÅ, så posten står på egne
     bein. Lagres bare når radene faktisk sier noe — en kommentar, et bilde
     eller en metode som avviker fra oppsettet — ellers er de bare støy i
     loggen. Tomt bilder-felt utelates av samme grunn. */
  const brodRader = [];
  for (let i = 0; i < Math.max(1, S.antall || 1); i++) {
    const rad = (S.lgBrod || [])[i] || {};
    const bilder = (rad.bilder || []).slice();
    brodRader.push({ metode: rad.metode || S.stekeProfil, kommentar: (rad.kommentar || '').trim(),
      ...(bilder.length ? { bilder } : {}) });
  }
  const brodVerdt = brodRader.some(x => x.kommentar || (x.bilder && x.bilder.length) || x.metode !== S.stekeProfil);
  S.loggListe = S.loggListe.concat([{
    id: 'b' + naa,
    laget: naa, endret: naa,
    // Hvem baket dette. `null` = loggført uten konto, og de postene hører til
    // ENHETEN, ikke til den første som måtte logge inn på den etterpå.
    konto: naaKonto(),
    navn: S.lgNavn || ('Bak #' + (S.loggListe.length + 1)),
    kar: S.lgKar, dato: new Date().toLocaleDateString('nb-NO'),
    grov: fmt(r.brodskala.pct, 0), hyd: fmt(r.hyd * 100, 0), loft: r.loft.loft, dose: fmt(r.doseProfil.dose, 2),
    bilder: (S.lgBilder || []).slice(),
    ...(stegNotater.length ? { stegNotater } : {}),
    ...(brodVerdt ? { brod: brodRader } : {}),
    // Selve oppskriften, ikke bare måletallene — det er dette «Bak dette på
    // nytt» henter tilbake. Poster fra før dette feltet fantes kan ikke
    // gjenskapes, og da vises knappen med vilje ikke.
    oppskrift: oppskriftAvtrykk()
  }]);
  S.lgNavn = ''; S.lgBilder = []; S.lgBrod = [];
  S.stegKvitt = {};             // kvitteringene er levert — neste bak starter blankt
  oppdater();
}
/* Bak dette på nytt: legg oppskriften tilbake i tilstanden og gå til Brød.
   Loggen, favorittene, utstyret og maskinen røres ikke — de er dine, ikke
   bakstens (samme skille som `nyBakst()` gjør ved brødtypebytte). */
function bakPaaNytt(b) {
  if (!b || !b.oppskrift) return;
  Object.keys(b.oppskrift).forEach(k => { S[k] = b.oppskrift[k]; });
  S.skjerm = 'brodet';
  S.lgRediger = null; S.lgSlett = null; S.byttBekreft = null;
  S.stegKvitt = {};             // nytt bak, blanke kvitteringer
  oppdater();
}

/* ---------- Én post i bakeloggen: vis, rediger eller bekreft sletting ----------
   `i` er den EKTE indeksen i S.loggListe. Redigering identifiseres likevel på
   `id`, ikke indeks, så en synk fra skyen midt i redigeringen ikke flytter deg
   over på en annen post. */
function loggPost(b, i) {
  if (S.lgSlett === b.id) return loggSlettBekreft(b, i);
  if (S.lgRediger === b.id) return loggRediger(b, i);
  /* Datoen står på EGEN linje, ikke klemt inn ved siden av navn og karakter:
     «14. februar 2026» er for langt til å dele rad med dem på 390 px, og det er
     nettopp den lange formen som gjør at man ser hvilken årstid baket var. */
  const kortEl = h('div', { class: 'kort' },
    h('div', { style: 'display:flex;align-items:baseline;gap:8px' },
      h('span', { style: 'font-family:var(--font-heading);font-size:1.05rem;flex:1;min-width:0' }, b.navn || 'Uten navn'),
      h('span', { class: 'badge' }, b.kar + ' / 10')),
    h('div', { style: 'font-size:.76rem;color:var(--color-neutral-600);margin-top:3px' }, loggDato(b)),
    h('div', { style: 'font-size:.8rem;color:var(--color-neutral-700);margin-top:4px;font-variant-numeric:tabular-nums' },
      b.grov + ' % grovt · ' + b.hyd + ' % vann · løft ' + b.loft + ' · dose ' + b.dose));
  if (b.notat) kortEl.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:6px' }, b.notat));
  /* Stegnotatene fra prosessen: hva som faktisk skjedde, steg for steg —
     avvik («1 t 0 min før planen»), hoppede steg og kommentarene. Det er
     læringsdataene for neste bak. */
  if (b.stegNotater && b.stegNotater.length) {
    const sn = h('div', { class: 'info-boks', style: 'margin-top:8px' },
      h('div', { style: 'font-size:.66rem;font-weight:800;letter-spacing:.06em;color:var(--color-neutral-600);text-transform:uppercase;margin-bottom:4px' }, 'Fra prosessen'));
    b.stegNotater.forEach(n => sn.appendChild(h('div', { style: 'font-size:.78rem;line-height:1.45;margin-top:4px' },
      h('b', null, n.steg + ': '),
      [n.hoppet ? 'hoppet over' : null,
       (n.avvikMin != null && Math.abs(n.avvikMin) > 20) ? 'ferdig ' + fmtTimer(Math.abs(n.avvikMin) / 60) + (n.avvikMin < 0 ? ' før planen' : ' etter planen') : null,
       n.notat || null].filter(Boolean).join(' — '))));
    kortEl.appendChild(sn);
  }
  /* Brød for brød: fire brød fra samme deig kan være stekt på fire måter, og
     det er nettopp de sammenligningene loggen skal kunne svare på senere.
     Brødets bilder står under sin egen rad, ikke i samlerekka nederst — det er
     koblingen bilde↔brød som er poenget. Indeksen inn i fullskjermviseren
     teller gjennom postBilder(), som legger bakstbildene først. */
  if (b.brod && b.brod.length) {
    const bb = h('div', { class: 'info-boks', style: 'margin-top:8px' },
      h('div', { style: 'font-size:.66rem;font-weight:800;letter-spacing:.06em;color:var(--color-neutral-600);text-transform:uppercase;margin-bottom:4px' }, 'Brød for brød'));
    let visIdx = (b.bilder || []).length;
    b.brod.forEach((rad, j) => {
      bb.appendChild(h('div', { style: 'font-size:.78rem;line-height:1.45;margin-top:4px' },
        h('b', null, 'Brød ' + (j + 1) + ': '),
        [stekeMetodeNavn(rad.metode), rad.kommentar || null].filter(Boolean).join(' — ')));
      if (rad.bilder && rad.bilder.length) {
        const start = visIdx;
        bb.appendChild(h('div', { class: 'logg-bilder', style: 'margin-top:4px' },
          ...rad.bilder.map((src, k) => h('button', { class: 'logg-bilde liten',
            'aria-label': 'Vis bilde ' + (k + 1) + ' av brød ' + (j + 1) + ' i stort format',
            onClick: () => { S.bildeVis = { id: b.id, i: start + k }; oppdater(); } },
            h('img', { src, alt: 'Brød ' + (j + 1) + ', bilde ' + (k + 1) })))));
      }
      visIdx += (rad.bilder || []).length;
    });
    kortEl.appendChild(bb);
  }
  if (b.bilder && b.bilder.length) kortEl.appendChild(h('div', { class: 'logg-bilder' },
    ...b.bilder.map((src, j) => h('button', { class: 'logg-bilde', 'aria-label': 'Vis bilde ' + (j + 1) + ' i stort format',
      onClick: () => { S.bildeVis = { id: b.id, i: j }; oppdater(); } },
      h('img', { src, alt: 'Bilde ' + (j + 1) + ' av ' + (b.navn || 'baket') })))));
  // «Bak dette på nytt» — hovedveien tilbake til et bak som funket. Erstatter
  // startblokka på Brød-skjermen, som pekte på et forvalg i stedet for på noe
  // Bjørn faktisk hadde bakt.
  if (b.oppskrift) {
    kortEl.appendChild(h('button', { class: 'btn btn-full', style: 'margin-top:10px;font-size:.82rem',
      onClick: () => bakPaaNytt(b) }, '↻ Bak dette på nytt'));
    /* Historikken i tall og kurve: posten bærer hele oppskriften, så
       deigregnskapet og gjæringskurven kan regnes ut på nytt — nøyaktig slik
       de sto da baket ble planlagt. Samme ark som stripa nederst drar opp. */
    kortEl.appendChild(h('button', { class: 'btn btn-full', style: 'margin-top:8px;font-size:.82rem',
      onClick: () => { S.lgRegnskap = b.id; oppdater(); } }, '⌃ Deigregnskap og hevekurve'));
  } else {
    kortEl.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:8px' },
      'Denne posten ble lagret før appen tok vare på selve oppskriften, så den kan ikke hentes tilbake. Nye bak kan.'));
  }
  kortEl.appendChild(h('div', { style: 'display:flex;gap:8px;margin-top:10px' },
    h('button', { class: 'btn-ghost', style: 'font-size:.78rem;padding:4px 0', onClick: () => { S.lgRediger = b.id; S.lgSlett = null; oppdater(); } }, 'Rediger'),
    h('button', { class: 'btn-ghost', style: 'font-size:.78rem;padding:4px 0;margin-left:auto;color:var(--color-danger)', onClick: () => { S.lgSlett = b.id; S.lgRediger = null; oppdater(); } }, 'Slett')));
  return kortEl;
}
function loggSlettBekreft(b, i) {
  // Teller ALLE bildene — også dem som ligger på brød-radene, ikke bare
  // samlerekka. «1 bilde» når det ryker tre hadde vært en løgn i en
  // sletteadvarsel.
  const antBilder = postBilder(b).length;
  return h('div', { class: 'kort' },
    h('div', { style: 'font-weight:800;font-size:.9rem' }, 'Slette «' + (b.navn || 'Uten navn') + '»?'),
    h('div', { class: 'hjelpetekst', style: 'margin-top:4px' },
      'Posten og eventuelle bilder forsvinner for godt' + (antBilder ? ' (' + antBilder + (antBilder === 1 ? ' bilde' : ' bilder') + ')' : '') + '. Dette kan ikke angres.'),
    h('div', { style: 'display:flex;gap:8px;margin-top:10px' },
      h('button', { class: 'btn', style: 'flex:1;font-size:.82rem;background:var(--color-danger);color:#fff;border-color:transparent',
        onClick: () => {
          // Gravsteinen er det som gjør sletting varig: uten den ville posten
          // kommet tilbake neste gang en annen enhet synket sin kopi opp.
          /* Filtrer på ID, ikke indeks. En synk fra en annen enhet kan bytte
             ut hele lista mens bekreftelsesdialogen står åpen, og da peker
             indeksen på en helt annen post enn den man ba om å slette. */
          S.loggSlettet = (S.loggSlettet || []).concat([b.id]);
          S.loggListe = S.loggListe.filter(x => x.id !== b.id);
          S.lgSlett = null; oppdater();
        } }, 'Ja, slett'),
      h('button', { class: 'btn', style: 'flex:1;font-size:.82rem', onClick: () => { S.lgSlett = null; oppdater(); } }, 'Avbryt')));
}
/* Redigerbart er det du selv har skrevet: navn, karakter, notat og bilder.
   Tallene under (dose, hydrering, løft) er MÅLT fra baket og skal ikke kunne
   endres i ettertid — da ville loggen sluttet å være et ærlig referansepunkt. */
function loggRediger(b, i) {
  const settFelt = (felt, verdi) => {
    // På ID, av samme grunn som slettingen: indeksen kan ha flyttet seg.
    // `endret` stemples fordi det er den som avgjør hvem som vinner når samme
    // post er redigert på to enheter.
    S.loggListe = S.loggListe.map(x =>
      x.id === b.id ? Object.assign({}, x, { [felt]: verdi, endret: Date.now() }) : x);
  };
  const inpFil = h('input', { type: 'file', accept: 'image/*', style: 'display:none',
    'aria-label': 'Velg bilde', onchange: e => leggTilBilde(e.target.files && e.target.files[0], i) });
  const boks = h('div', { class: 'kort', style: 'border-color:var(--color-accent-300);box-shadow:0 0 0 3px var(--color-accent-100)' },
    h('div', { class: 'kort-num' }, 'Redigerer'),
    h('input', { class: 'sok', style: 'margin-top:8px', placeholder: 'Navn', value: b.navn || '', 'data-fokus': 'lgnavn',
      oninput: e => settFelt('navn', e.target.value) }),
    h('div', { style: 'display:flex;align-items:center;gap:12px' },
      h('div', { class: 'felt-label', style: 'flex:1' }, 'Karakter'),
      h('div', { class: 'stepper', style: 'width:170px' },
        h('button', { 'aria-label': 'Lavere karakter', onClick: () => { settFelt('kar', Math.max(1, (b.kar || 1) - 1)); oppdater(); } }, '−'),
        h('input', { type: 'text', inputmode: 'numeric', 'aria-label': 'Karakter', value: String(b.kar),
          onblur: e => { const v = parseInt(e.target.value); if (!isNaN(v)) settFelt('kar', Math.min(10, Math.max(1, v))); oppdater(); } }),
        h('button', { 'aria-label': 'Høyere karakter', onClick: () => { settFelt('kar', Math.min(10, (b.kar || 0) + 1)); oppdater(); } }, '+'))),
    h('div', { class: 'felt-label', style: 'margin-top:10px' }, 'Notat — hva lærte du?'),
    /* Innholdet som tekstBARN, ikke `value`-attributt: på en textarea gjør
       attributtet ingenting, og notatet VISTES tomt etter neste render selv
       om det lå trygt i tilstanden (latent til 02.08 — voksefeltene avslørte
       den). Vokser med teksten som de andre kommentarfeltene. */
    h('textarea', { class: 'sok autovoks', rows: 2, 'data-fokus': 'lgnotat',
      placeholder: 'F.eks. for tett krumme, prøv 3 pp mer vann',
      oninput: e => { settFelt('notat', e.target.value); voksFelt(e.target); } }, b.notat || ''));
  /* Brød for brød redigeres i ettertid med vilje: brødene stekes til ulik tid,
     så «glasset av etter 18 min» på brød 3 finnes ofte ikke før timer etter at
     posten ble lagret. Radene leses fra S.loggListe og ikke fra closure-`b` —
     to tastetrykk i hver sin rad ville ellers overskrevet hverandre, siden
     visningen ikke tegnes om for hvert tegn. */
  const brodNaa = () => {
    const post = S.loggListe.find(x => x.id === b.id);
    return ((post && post.brod) || []).map(x => Object.assign({}, x));
  };
  const settBrodRad = (j, felt, verdi) => {
    const rader = brodNaa();
    if (!rader[j]) return;
    rader[j][felt] = verdi;
    settFelt('brod', rader);
  };
  boks.appendChild(h('div', { class: 'felt-label' }, 'Brød for brød — metode og kommentar'));
  (b.brod || []).forEach((rad, j) => {
    boks.appendChild(h('div', { style: 'display:flex;align-items:baseline;gap:8px;margin-top:8px' },
      h('div', { class: 'felt-label', style: 'margin:0;flex:1' }, 'Brød ' + (j + 1)),
      h('button', { class: 'btn-ghost', style: 'font-size:.74rem;padding:2px 0;color:var(--color-danger)',
        'aria-label': 'Fjern brød ' + (j + 1),
        onClick: () => { settFelt('brod', brodNaa().filter((_, k) => k !== j)); oppdater(); } }, 'Fjern')));
    boks.appendChild(h('select', { class: 'sok', 'aria-label': 'Stekemetode for brød ' + (j + 1),
      onchange: e => { settBrodRad(j, 'metode', e.target.value); oppdater(); } },
      ...(typeof BAKE_PROFILES !== 'undefined' ? BAKE_PROFILES : []).map(p =>
        h('option', { value: p.id, selected: rad.metode === p.id ? 'selected' : null }, p.navn))));
    boks.appendChild(h('textarea', { class: 'sok autovoks', rows: 1, style: 'margin-top:6px',
      placeholder: 'Kommentar — f.eks. glasset av etter 18 min',
      'aria-label': 'Kommentar til brød ' + (j + 1),
      oninput: e => { settBrodRad(j, 'kommentar', e.target.value); voksFelt(e.target); } }, rad.kommentar || ''));
    /* Bilde per brød også i ettertid — krummen ser man først når brødet
       skjæres, gjerne dagen etter at posten ble lagret. Leses via brodNaa()
       når skaleringen er ferdig, av samme grunn som tekstfeltene. */
    boks.appendChild(brodBildeRad(j + 1, rad.bilder || [],
      data => { const rader = brodNaa(); if (!rader[j]) return;
        rader[j].bilder = (rader[j].bilder || []).concat([data]);
        settFelt('brod', rader); oppdater(); },
      k => { const rader = brodNaa(); if (!rader[j]) return;
        rader[j].bilder = (rader[j].bilder || []).filter((_, m) => m !== k);
        settFelt('brod', rader); oppdater(); }));
  });
  boks.appendChild(h('button', { class: 'btn btn-full', style: 'margin-top:8px;font-size:.8rem',
    onClick: () => {
      const rader = brodNaa();
      rader.push({ metode: (b.oppskrift && b.oppskrift.stekeProfil) || S.stekeProfil, kommentar: '' });
      settFelt('brod', rader); oppdater();
    } }, '+ Legg til brød'));
  boks.appendChild(h('div', { class: 'felt-label' }, 'Bilder'));
  const rad = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:6px' });
  (b.bilder || []).forEach((src, j) => rad.appendChild(h('div', { style: 'position:relative' },
    h('img', { src, alt: 'Bilde ' + (j + 1), style: 'width:64px;height:64px;object-fit:cover;border-radius:12px;border:1px solid var(--color-neutral-300);display:block' }),
    h('button', { 'aria-label': 'Fjern bilde ' + (j + 1), class: 'bilde-fjern',
      onClick: () => { settFelt('bilder', (b.bilder || []).filter((_, k) => k !== j)); oppdater(); } }, '×'))));
  if ((b.bilder || []).length < 3) rad.appendChild(h('button', {
    style: 'width:64px;height:64px;border-radius:12px;border:1.5px dashed var(--color-neutral-400);background:none;color:var(--color-neutral-600);font-size:1.4rem;cursor:pointer',
    'aria-label': 'Legg til bilde', onClick: () => inpFil.click() }, '+'));
  boks.appendChild(rad);
  boks.appendChild(inpFil);
  boks.appendChild(h('div', { style: 'display:flex;gap:8px;margin-top:12px' },
    h('button', { class: 'btn btn-primary', style: 'flex:1;font-size:.82rem', onClick: () => { S.lgRediger = null; oppdater(); } }, 'Ferdig'),
    h('button', { class: 'btn', style: 'flex:0 0 auto;font-size:.82rem;color:var(--color-danger)', onClick: () => { S.lgSlett = b.id; S.lgRediger = null; oppdater(); } }, 'Slett')));
  boks.appendChild(h('div', { style: 'font-size:.7rem;color:var(--color-neutral-600);margin-top:8px' },
    'Endringene lagres mens du skriver. Måletallene (dose, hydrering, løft) kan ikke endres — de er hentet fra baket slik det faktisk var.'));
  return boks;
}

/* ---------- Historisk deigregnskap fra loggen ----------
   «Hvordan så deigen og hevingen ut den gangen?» Posten bærer hele oppskriften
   og motoren er deterministisk, så regnskapet og gjæringskurven regnes ut på
   nytt fra den — samme ark og samme funksjoner som stripa nederst drar opp,
   ingen kopi som kan drifte. regn/kjede/regnskapInnmat leser alle den globale
   S, så S byttes midlertidig til postens oppskrift; byttet er synkront og
   settes ALLTID tilbake i finally — et unntak underveis skal ikke kunne la
   appen bli stående på en gammel oppskrift.
   `vinduStart` og `ferdigMs` nulles: de peker på klokkeslett i fortiden, og å
   strekke planen mot dem I DAG ville gitt en annen kurve enn den som ble bakt
   etter. Kurven viser forløpet (timer og temperaturer), ikke datidens klokke. */
function tegnLoggRegnskap() {
  const gmlA = byId('loggArk'); if (gmlA) gmlA.remove();
  const gmlT = byId('loggArkTeppe'); if (gmlT) gmlT.remove();
  if (!S.lgRegnskap) return;
  // Arket hører til Logg-skjermen: bytter man skjerm med det åpent, skal det
  // ikke bli liggende over Deig eller Tid — der finnes det ekte regnskapet.
  if (S.skjerm !== 'logg') { S.lgRegnskap = null; return; }
  const b = S.loggListe.find(x => x.id === S.lgRegnskap);
  if (!b || !b.oppskrift) { S.lgRegnskap = null; return; }
  const lukk = () => { S.lgRegnskap = null; oppdater(); };
  let innmat;
  const ekteS = S;
  try {
    S = Object.assign({}, ekteS, b.oppskrift, { ferdigMs: null, tidModus: 'ferdig', vinduStart: null });
    const r2 = regn(S);
    const K2 = kjede(S, r2, standardFerdig());
    innmat = regnskapInnmat(r2, K2);
  } catch (e) {
    innmat = [h('div', { class: 'hjelpetekst' },
      'Fikk ikke regnet ut denne posten — oppskriften ser ut til å mangle noe fra en eldre versjon av appen.')];
  } finally {
    S = ekteS;
  }
  byId('telefon').appendChild(h('div', { class: 'regnskap-bakteppe logg-teppe', id: 'loggArkTeppe', onClick: lukk }));
  byId('telefon').appendChild(h('div', { class: 'regnskap-ark logg-ark', id: 'loggArk', role: 'dialog',
    'aria-label': 'Deigregnskap for ' + (b.navn || 'Uten navn'), onClick: lukk },
    h('div', { class: 'ark-hank' }),
    h('div', { class: 'ark-tittel' }, 'Deigregnskap — ' + (b.navn || 'Uten navn') + ' · ' + loggDato(b)),
    h('div', { style: 'font-size:.72rem;color:var(--color-neutral-600);margin:-2px 0 8px;line-height:1.45' },
      'Regnet ut på nytt fra oppskriften slik den ble lagret. Kurven viser forløpet, ikke klokkeslettene den gangen.'),
    ...innmat));
}

/* ---------- Bildet i stort format ----------
   Ligger inne i #telefon (som klipper alt annet), over bunnmenyen. Trykk hvor
   som helst, Esc eller ✕ lukker; piler bytter bilde når posten har flere. */
/* ALLE bildene på en post, i fast rekkefølge: bakstbildene først, så brødenes
   i radrekkefølge. Viseren, pilene og sletteadvarselen teller gjennom denne
   ene lista — miniatyrenes indekser i loggPost() må følge samme rekkefølge. */
function postBilder(b) {
  const liste = ((b && b.bilder) || []).map(src => ({ src, brod: null }));
  ((b && b.brod) || []).forEach((rad, j) =>
    ((rad && rad.bilder) || []).forEach(src => liste.push({ src, brod: j + 1 })));
  return liste;
}
function tegnBildeVis() {
  const gml = byId('bildevis'); if (gml) gml.remove();
  if (!S.bildeVis) return;
  const post = S.loggListe.find(b => b.id === S.bildeVis.id);
  const bilder = post ? postBilder(post) : [];
  if (!bilder.length) { S.bildeVis = null; return; }
  const idx = Math.max(0, Math.min(S.bildeVis.i, bilder.length - 1));
  const bytt = d => { S.bildeVis = { id: S.bildeVis.id, i: (idx + d + bilder.length) % bilder.length }; oppdater(); };
  const stopp = e => e.stopPropagation();
  const merke = bilder[idx].brod ? ' · brød ' + bilder[idx].brod : '';
  const lag = h('div', { class: 'bildevis', id: 'bildevis', role: 'dialog', 'aria-label': 'Bilde i stort format',
    onClick: () => { S.bildeVis = null; oppdater(); } },
    h('img', { src: bilder[idx].src, alt: (post.navn || 'Baket') + (merke ? ', brød ' + bilder[idx].brod : '') + ', bilde ' + (idx + 1), onClick: stopp }),
    h('button', { class: 'bv-lukk', 'aria-label': 'Lukk' }, '✕'),
    h('div', { class: 'bv-tekst' }, (post.navn || 'Uten navn') + ' · ' + post.dato + merke +
      (bilder.length > 1 ? ' · ' + (idx + 1) + ' av ' + bilder.length : '')),
    bilder.length > 1 ? h('button', { class: 'bv-pil venstre', 'aria-label': 'Forrige bilde',
      onClick: e => { stopp(e); bytt(-1); } }, '‹') : null,
    bilder.length > 1 ? h('button', { class: 'bv-pil hoyre', 'aria-label': 'Neste bilde',
      onClick: e => { stopp(e); bytt(1); } }, '›') : null);
  byId('telefon').appendChild(lag);
}
/* Bilder av baket — designfasen hadde dem i loggen; nå er de tilbake. Skaleres
   ned til maks 480 px JPEG i canvas før lagring, så localStorage (~5 MB)
   rommer mange bak. Maks 3 per bak. */
function tegnBildeVelger() {
  const boks = h('div', { style: 'margin-top:12px' });
  boks.appendChild(h('div', { class: 'felt-label' }, 'Bilder av baket'));
  const inp = h('input', { type: 'file', accept: 'image/*', style: 'display:none',
    'aria-label': 'Velg bilde', onchange: e => leggTilBilde(e.target.files && e.target.files[0]) });
  const rad = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:6px' });
  (S.lgBilder || []).forEach((src, i) => rad.appendChild(h('div', { style: 'position:relative' },
    h('img', { src, alt: 'Bilde ' + (i + 1), style: 'width:64px;height:64px;object-fit:cover;border-radius:12px;border:1px solid var(--color-neutral-300);display:block' }),
    h('button', { 'aria-label': 'Fjern bilde ' + (i + 1),
      style: 'position:absolute;top:-8px;right:-8px;width:24px;height:24px;border-radius:999px;border:1px solid var(--color-neutral-300);background:#fff;color:var(--color-danger);font-weight:800;line-height:1;cursor:pointer;padding:0',
      onClick: () => { S.lgBilder = (S.lgBilder || []).filter((_, j) => j !== i); oppdater(); } }, '×'))));
  if ((S.lgBilder || []).length < 3) rad.appendChild(h('button', {
    style: 'width:64px;height:64px;border-radius:12px;border:1.5px dashed var(--color-neutral-400);background:none;color:var(--color-neutral-600);font-size:1.4rem;cursor:pointer',
    'aria-label': 'Legg til bilde', onClick: () => inp.click() }, '+'));
  boks.appendChild(rad);
  boks.appendChild(inp);
  return boks;
}
/* Skaler ned og lever et data-URL. Felles for alle bildeveiene (baket, per
   brød, redigering) — grensa og kvotevernet skal ikke kunne drifte fra
   hverandre. `ferdig` kalles kun når bildet faktisk fikk plass. */
function skalerBilde(fil, ferdig) {
  if (!fil) return;
  const les = new FileReader();
  les.onload = () => {
    const img = new Image();
    img.onload = () => {
      const sk = Math.min(1, 480 / Math.max(img.width, img.height, 1));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * sk));
      c.height = Math.max(1, Math.round(img.height * sk));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL('image/jpeg', 0.7);
      // Vern mot full localStorage: nekt heller ett nytt bilde enn å miste alt.
      // Målt mot ALT appen lagrer i origin (hovedtilstand + logg-arkiver +
      // enhetsbøtte), ikke bare hovednøkkelen — arkivene kan alene doble
      // forbruket, og da slapp vakten gjennom bilder som sprengte 5 MB-kvoten
      // i stillhet (release-review 01.08).
      let brukt = 0;
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('forgebakery') === 0) brukt += (localStorage.getItem(k) || '').length; } }
      catch (e) { brukt = JSON.stringify(S).length; }
      if (brukt + data.length > 4200000) {
        alert('Lagringen i nettleseren er nesten full — last ned en sikkerhetskopi og slett gamle bilder først.');
        return;
      }
      ferdig(data);
    };
    img.src = les.result;
  };
  les.readAsDataURL(fil);
}
/* `loggIdx` utelatt = bildet hører til skjemaet for det neste baket. Er den satt,
   legges bildet på en allerede lagret loggpost i stedet. */
function leggTilBilde(fil, loggIdx) {
  skalerBilde(fil, data => {
    if (loggIdx == null) {
      S.lgBilder = (S.lgBilder || []).concat([data]);
    } else if (S.loggListe[loggIdx]) {
      // `endret` MÅ stemples: flettingen avgjør duellen på det feltet, og en
      // post med nytt bilde tapte mot en uendret kopi på en annen enhet.
      const maalId = S.loggListe[loggIdx].id;
      S.loggListe = S.loggListe.map(x => x.id === maalId
        ? Object.assign({}, x, { bilder: (x.bilder || []).concat([data]), endret: Date.now() })
        : x);
    }
    oppdater();
  });
}
/* Sikkerhetskopi — alt ligger kun i nettleserens localStorage. Til ekte
   innlogging/sky trengs en backend; inntil den beslutningen er tatt er dette
   vernet mot tap: last ned alt som JSON, hent inn igjen hvor som helst. */
/* «Du har N bak loggført uten konto — ta dem med inn?»
   Vises bare når man ER innlogget og det faktisk ligger noe i enhetsbøtta. Sier
   man nei, blir de liggende der og dukker opp igjen når man logger ut — de er
   ikke slettet, bare holdt utenfor kontoen. */
function tegnUtenKonto() {
  const uid = naaKonto();
  if (!uid) return null;
  const anon = lesAnon();
  if (!anon.poster.length || anon.avslaatt) return null;
  const n = anon.poster.length;
  const boks = h('div', { class: 'varsel' },
    h('div', { style: 'font-weight:800;margin-bottom:4px' },
      n + (n === 1 ? ' bak er loggført uten konto' : ' bak er loggført uten konto')),
    h('div', { style: 'font-size:.8rem;line-height:1.45' },
      'De ligger på denne enheten, ikke i kontoen din. Vil du ta dem med inn i ' +
      (Sky.status().epost || 'kontoen') + '? Sier du nei, blir de liggende her og dukker opp igjen når du logger ut.'));
  boks.appendChild(h('div', { style: 'display:flex;gap:8px;margin-top:10px' },
    h('button', { class: 'btn btn-primary', style: 'flex:1;font-size:.82rem', onClick: () => {
      const naa = Date.now();
      const kjent = new Set((S.loggListe || []).map(b => b.id));
      const tas = anon.poster.filter(b => !kjent.has(b.id)).map(b => ({ ...b, konto: uid, endret: naa }));
      S.loggListe = flettLogg(S.loggListe || [], tas, S.loggSlettet || []);
      skrivAnon({ poster: [], avslaatt: false });
      oppdater();
    } }, 'Ja, ta dem med'),
    h('button', { class: 'btn', style: 'flex:1;font-size:.82rem', onClick: () => {
      skrivAnon({ poster: anon.poster, avslaatt: true });
      oppdater();
    } }, 'Nei, hold dem utenfor')));
  return boks;
}

function tegnBackup() {
  const inpFil = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none',
    'aria-label': 'Velg sikkerhetskopi', onchange: e => hentInnKopi(e.target.files && e.target.files[0]) });
  const boks = kort('Sikkerhetskopi', null);
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:6px' },
    'Skyen er hovedlagringen når du er innlogget. Kopi-fila er en ekstra trygghet: last den ned nå og da, så kan alt hentes inn igjen på en ny telefon — også helt uten nett eller konto.'));
  boks.appendChild(h('div', { style: 'display:flex;gap:8px;margin-top:10px' },
    h('button', { class: 'btn', style: 'flex:1;font-size:.8rem', onClick: lastNedKopi }, 'Last ned kopi'),
    h('button', { class: 'btn', style: 'flex:1;font-size:.8rem', onClick: () => inpFil.click() }, 'Hent inn kopi')));
  boks.appendChild(inpFil);
  return boks;
}
function lastNedKopi() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
  const d = new Date(), p = n => String(n).padStart(2, '0');
  a.download = 'forge-bakery-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function hentInnKopi(fil) {
  if (!fil) return;
  const les = new FileReader();
  les.onload = () => {
    try {
      const data = JSON.parse(les.result);
      if (!data || typeof data !== 'object' || !('brotype' in data)) throw new Error('dette er ikke en Forge Bakery-kopi');
      localStorage.setItem(LAGER, JSON.stringify(data));
      S = last();                       // gjenbruker all normalisering i last()
      if (window.__FB) window.__FB.S = S;
      render();
    } catch (e) { alert('Kunne ikke lese fila: ' + (e && e.message ? e.message : e)); }
  };
  les.readAsText(fil);
}

/* ============================================================
   6 · OPPSLAG  (gruppering + kryssreferanser tilbake — L: designet strippet dette)
   ============================================================ */
function tegnOppslag(r) {
  if (S.oppslag === 'mel') return oppslagMel();
  if (S.oppslag === 'teknikk') return oppslagTeknikk();
  if (S.oppslag === 'steking') return oppslagSteking(r);
  if (S.oppslag === 'utstyr') return oppslagUtstyr(r);
  if (S.oppslag === 'ordliste') return oppslagOrdliste();
  // Meny
  const wrap = h('div');
  const punkter = [
    ['mel', 'Mel & korn', (typeof FLOURS !== 'undefined' ? FLOURS.length : 30) + ' meltyper: protein, glutenbidrag, absorpsjon, tak og pris. Stjernemerk favorittene.'],
    ['teknikk', 'Teknikk og fagstoff', (typeof TIPS !== 'undefined' ? TIPS.length : 23) + ' seksjoner, verifisert mot forskning.'],
    ['steking', 'Stekeprofiler', 'Temperatur, damp og kjerne per metode — og hvilken planen din bruker. Stjernemerk favorittene.'],
    ['utstyr', 'Stekeutstyr', UTSTYR.length + ' oppsett: bunnvarme, damp og forvarming. Stjernemerk dem du faktisk bruker.'],
    ['ordliste', 'Ordliste', (typeof ORDLISTE !== 'undefined' ? ORDLISTE.length : 44) + ' fagord, gruppert, med kryssreferanser.']
  ];
  punkter.forEach(([id, tit, und]) => wrap.appendChild(h('button', { class: 'valgkort', onClick: () => { S.oppslag = id; S.oppslagSok = ''; oppdater(); } },
    h('span', { style: 'flex:1' }, h('span', { class: 'tittel', style: 'font-size:1rem' }, tit), h('span', { class: 'undertittel' }, und)),
    h('span', { style: 'color:var(--color-neutral-400)' }, '›'))));
  wrap.appendChild(h('div', { class: 'varsel', style: 'margin-top:12px' },
    'Fagstoffet ligger her, ikke i veien for bakingen. Der et valg har en konsekvens, står forklaringen som ⓘ rett ved valget — ikke som en lenke hit.'));
  wrap.appendChild(tegnAppVersjon());
  return wrap;
}
/* Hvilken versjon kjører jeg? `document.lastModified` er tidsstempelet serveren
   ga index.html, så den flytter seg når en ny versjon faktisk er hentet — en
   ærlig kvittering på at oppdateringen kom fram. */
function tegnAppVersjon() {
  const d = new Date(document.lastModified);
  const naar = isFinite(d.getTime()) ? klDato(d.getTime()) : 'ukjent tidspunkt';
  const boks = h('div', { style: 'margin-top:14px;padding:12px 14px;border-radius:var(--radius-md);background:var(--color-neutral-100)' },
    h('div', { style: 'font-size:.72rem;color:var(--color-neutral-600);font-weight:700' }, 'Denne appversjonen'),
    h('div', { style: 'font-size:.8rem;margin-top:2px;font-variant-numeric:tabular-nums' }, naar),
    h('div', { style: 'font-size:.72rem;color:var(--color-neutral-600);margin-top:6px;line-height:1.45' },
      'Appen henter siste versjon selv hver gang du åpner den med nett — du skal aldri måtte tømme cachen.'));
  boks.appendChild(h('button', { class: 'btn', style: 'margin-top:10px;width:100%;font-size:.8rem', onClick: seEtterOppdatering },
    'Se etter oppdatering nå'));
  return boks;
}
async function seEtterOppdatering(e) {
  const knapp = e && e.currentTarget;
  if (knapp) { knapp.textContent = 'Sjekker …'; knapp.disabled = true; }
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
    }
  } catch (err) {}
  // Omlastingen henter gjennom service workeren, som revaliderer mot serveren —
  // så dette gir siste versjon uten at noe må tømmes for hånd.
  location.reload();
}
function tilbakeknapp() { return h('button', { class: 'btn-ghost', onClick: () => { S.oppslag = 'meny'; oppdater(); } }, '‹ Oppslag'); }
/* Tom-treff-tilstand for Oppslag-søkene. Uten den sto brukeren igjen med et
   søkefelt over et helt tomt område når søket ikke traff noe — det leser som en
   feil, ikke som «ingen treff». */
function tomTreff(sok) {
  return h('div', { class: 'tomkort', style: 'margin-top:10px;text-align:center;color:var(--color-neutral-600);font-size:.86rem' },
    'Ingen treff på «' + sok + '».');
}

function oppslagMel() {
  const wrap = h('div', null, tilbakeknapp());
  wrap.appendChild(h('input', { class: 'sok', 'data-fokus': 'sok', placeholder: 'Søk meltype…', value: S.oppslagSok, oninput: e => { S.oppslagSok = e.target.value; render(); } }));
  const sok = (S.oppslagSok || '').toLowerCase();
  const grupper = {};
  FLOURS.forEach(f => { if (sok && !(f.navn.toLowerCase().includes(sok) || (f.gruppe || '').toLowerCase().includes(sok))) return; (grupper[f.gruppe] = grupper[f.gruppe] || []).push(f); });
  Object.keys(grupper).forEach(gr => {
    wrap.appendChild(h('div', { class: 'seksjonstittel' }, gr));
    grupper[gr].forEach(f => {
      const fav = erFavoritt('mel', f.id);
      const info = (typeof MEL_INFO !== 'undefined') && MEL_INFO[f.id];
      // Klikkbare tall → MELTALL_INFO-forklaring (ⓘ per tall).
      const tallKnapp = (nokkel, lab, verdi) => h('button', {
        style: 'background:none;border:none;padding:0;font:inherit;cursor:pointer;color:inherit;text-align:left',
        'aria-label': lab + ' — forklaring', onClick: () => { S.meltallInfo = S.meltallInfo === (f.id + nokkel) ? null : (f.id + nokkel); oppdater(); } },
        lab + ' ', h('b', null, verdi), h('span', { style: 'display:inline-flex;vertical-align:-2px;margin-left:3px;color:var(--color-neutral-400)' }, infoIkon(12)));
      // Favoritter utheves med ramme rundt hele kortet, ikke bare stjerna.
      const kortEl = h('div', { class: 'kort flat' + (fav ? ' fav' : '') },
        h('div', { style: 'display:flex;align-items:flex-start;gap:10px' },
          kornTegning(f.id),
          h('div', { style: 'flex:1;min-width:0' },
            h('div', { style: 'display:flex;align-items:baseline;gap:8px' },
              h('span', { style: 'font-weight:700;font-size:.92rem;flex:1' }, f.navn),
              info && GLUTENBIDRAG_TEKST[info.glutenbidrag] ? h('span', { class: 'pille', style: 'background:var(--color-accent-2-100);color:var(--color-accent-2-700)' }, GLUTENBIDRAG_TEKST[info.glutenbidrag].navn) : null),
            h('div', { style: 'display:flex;gap:12px;font-size:.74rem;color:var(--color-neutral-600);margin-top:4px;font-variant-numeric:tabular-nums;flex-wrap:wrap' },
              tallKnapp('protein', 'Protein', fmt(f.protein, 1) + ' %'),
              tallKnapp('absorpsjon', 'Absorpsjon', fmt(f.absorpsjon * 100, 0) + ' %'),
              tallKnapp('styrke', 'Styrke', f.styrke),
              tallKnapp('maxPct', 'Tak', f.maxPct + ' %'),
              tallKnapp('pris', 'Pris', fmt(f.kr, 0) + ' kr/kg'))),
          favKnapp('mel', f.id, f.navn)));
      // MELTALL_INFO-utfelling
      const aapenNok = S.meltallInfo && S.meltallInfo.indexOf(f.id) === 0 ? S.meltallInfo.slice(f.id.length) : null;
      if (aapenNok && typeof MELTALL_INFO !== 'undefined' && MELTALL_INFO[aapenNok]) {
        kortEl.appendChild(h('div', { class: 'info-boks' },
          h('div', { style: 'font-weight:800;font-size:.74rem;margin-bottom:4px' }, MELTALL_INFO[aapenNok].navn),
          h('div', { class: 'hjelpetekst', html: MELTALL_INFO[aapenNok].tekst })));
      }
      // plus/minus fra MEL_INFO, ellers notat
      if (info && (info.plus || info.minus)) {
        kortEl.appendChild(h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px' },
          info.plus ? spalte('FORDELER', info.plus, 'var(--color-accent-2-700)') : h('div'),
          info.minus ? spalte('ULEMPER', info.minus, 'var(--color-danger)') : h('div')));
      } else if (f.notat) {
        kortEl.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:6px' }, f.notat));
      }
      wrap.appendChild(kortEl);
    });
  });
  if (sok && !Object.keys(grupper).length) wrap.appendChild(tomTreff(S.oppslagSok));
  return wrap;
}
function oppslagTeknikk() {
  const wrap = h('div', null, tilbakeknapp());
  wrap.appendChild(h('input', { class: 'sok', 'data-fokus': 'sok', placeholder: 'Søk fagstoff…', value: S.oppslagSok, oninput: e => { S.oppslagSok = e.target.value; render(); } }));
  const sok = (S.oppslagSok || '').toLowerCase();
  let antTreff = 0;
  TIPS.forEach(t => {
    const tekst = JSON.stringify(t).toLowerCase();
    if (sok && !tekst.includes(sok)) return;
    antTreff++;
    const motsier = (t.tittel || '').includes('⚠') || (t.ikon === '⚠');
    const boks = h('details', { class: 'kort', style: 'padding:0' });
    boks.appendChild(h('summary', { style: 'padding:14px 16px;cursor:pointer;font-weight:700;font-size:.9rem;list-style:none;display:flex;gap:8px;align-items:center' },
      motsier ? h('span', { class: 'pille', style: 'background:var(--color-accent-200);color:var(--color-accent-900)' }, '⚠ vanlig råd som ikke stemmer') : null,
      t.tittel));
    const kropp = h('div', { style: 'padding:0 16px 14px' });
    (t.punkter || []).forEach(p => {
      if (Array.isArray(p)) kropp.appendChild(h('div', { style: 'margin-top:8px' }, h('b', { style: 'font-size:.84rem' }, p[0]), h('div', { class: 'hjelpetekst', style: 'margin-top:2px' }, p[1])));
      else kropp.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:6px' }, String(p)));
    });
    if (t.intro) kropp.insertBefore(h('div', { class: 'hjelpetekst' }, t.intro), kropp.firstChild);
    boks.appendChild(kropp);
    wrap.appendChild(boks);
  });
  if (sok && !antTreff) wrap.appendChild(tomTreff(S.oppslagSok));
  return wrap;
}
/* Favoritter først. Rekkefølgen er den eneste måten en favoritt faktisk sparer
   noen for arbeid — en stjerne som bare farger et kort er pynt. */
function favForst(liste, ns) {
  return liste.slice().sort((a, b) => (erFavoritt(ns, b.id) ? 1 : 0) - (erFavoritt(ns, a.id) ? 1 : 0));
}
function oppslagSteking(r) {
  const wrap = h('div', null, tilbakeknapp());
  favForst(BAKE_PROFILES, 'steking').forEach(p => {
    const aktiv = r.prof && r.prof.id === p.id;
    wrap.appendChild(h('div', { class: 'kort' + (erFavoritt('steking', p.id) ? ' fav' : '') },
      h('div', { style: 'display:flex;align-items:baseline;gap:8px' },
        h('span', { style: 'font-family:var(--font-heading);font-size:1.02rem;flex:1' }, p.navn),
        aktiv ? h('span', { class: 'badge' }, 'planen din') : null,
        favKnapp('steking', p.id, p.navn)),
      h('div', { style: 'font-size:.76rem;color:var(--color-neutral-600);margin-top:2px' }, (p.vekt || '') + ' · ' + (p.hydrering || '')),
      p.anbefaltTil ? h('div', { style: 'font-size:.78rem;margin-top:6px' },
        h('span', { class: 'pille', style: 'background:var(--color-accent-2-100);color:var(--color-accent-2-700)' }, 'anbefalt til'), ' ' + p.anbefaltTil) : null,
      h('div', { style: 'margin-top:8px' },
        tallrad('Inn på', p.inn + ' °C'), tallrad('Ned til', p.ned + ' °C'), tallrad('Damp', p.damp), tallrad('Damptid', p.dampTid), tallrad('Kjerne', p.kjerne)),
      p.notat ? h('div', { class: 'hjelpetekst', style: 'margin-top:6px' }, p.notat) : null));
  });
  return wrap;
}
/* Stekeutstyr som eget oppslag. Det manglet helt, og det var her Bjørn fant
   appens egen favorittisering («★ Deig rett på stålet», «det beste oppsettet du
   har»). Merkingen er hans nå — appen oppgir tall og lar ham velge.

   `kontakt`/`effusivitet` kan være null: et tynt stekebrett har ingen ekte
   kontakttemperatur (se kommentaren ved oppsettet i data.js), og da skal det stå
   ingenting i stedet for «null °C». */
function oppslagUtstyr(r) {
  const wrap = h('div', null, tilbakeknapp());
  favForst(UTSTYR, 'utstyr').forEach(u => {
    const brukt = S.utstyr === u.id;
    const kortEl = h('div', { class: 'kort' + (erFavoritt('utstyr', u.id) ? ' fav' : '') },
      h('div', { style: 'display:flex;align-items:baseline;gap:8px' },
        h('span', { style: 'font-family:var(--font-heading);font-size:1.02rem;flex:1;min-width:0' }, u.navn),
        brukt ? h('span', { class: 'badge' }, 'valgt nå') : null,
        favKnapp('utstyr', u.id, u.navn)),
      h('div', { style: 'margin-top:8px' },
        u.kontakt != null ? tallrad('Kontakttemperatur', u.kontakt + ' °C') : tallrad('Kontakttemperatur', 'ikke meningsfull — ingen lagret varme'),
        tallrad('Forvarming', u.forvarm),
        tallrad('Damp', u.damp),
        tallrad('Best til', u.best)),
      h('div', { class: 'hjelpetekst', style: 'margin-top:8px' }, u.om));
    if (!brukt) kortEl.appendChild(h('button', { class: 'btn', style: 'margin-top:10px;width:100%;font-size:.82rem',
      onClick: () => { S.utstyr = u.id; if (!S.stekeProfilManuell) S.stekeProfil = profilForUtstyr(u.id, S.form); S.skjerm = 'brodet'; oppdater(); } },
      'Bruk dette oppsettet'));
    wrap.appendChild(kortEl);
  });
  return wrap;
}
function oppslagOrdliste() {
  const wrap = h('div', null, tilbakeknapp());
  if (typeof ORDLISTE === 'undefined') return wrap;
  wrap.appendChild(h('input', { class: 'sok', 'data-fokus': 'sok', placeholder: 'Søk ord…', value: S.oppslagSok, oninput: e => { S.oppslagSok = e.target.value; render(); } }));
  const sok = (S.oppslagSok || '').toLowerCase();
  const grupper = {};
  ORDLISTE.forEach(o => {
    if (sok && !((o.ord || o.navn || '').toLowerCase().includes(sok) || (o.def || o.definisjon || '').toLowerCase().includes(sok))) return;
    const gr = o.gr || o.gruppe || 'Annet'; (grupper[gr] = grupper[gr] || []).push(o);
  });
  Object.keys(grupper).sort().forEach(gr => {
    wrap.appendChild(h('div', { class: 'seksjonstittel' }, gr));
    grupper[gr].forEach(o => {
      const se = o.se || o.kryss || [];
      wrap.appendChild(h('div', { class: 'kort flat' },
        h('div', { style: 'font-weight:700;font-size:.9rem' }, o.ord || o.navn),
        h('div', { class: 'hjelpetekst', style: 'margin-top:3px', html: o.def || o.definisjon || '' }),
        (se && se.length) ? h('div', { style: 'margin-top:6px;font-size:.74rem;color:var(--color-neutral-600)' },
          'Se også: ', ...(Array.isArray(se) ? se : [se]).map((ord, k) => h('span', null,
            k ? ', ' : '',
            h('button', { style: 'background:none;border:none;padding:0;font:inherit;font-size:inherit;color:var(--color-accent-700);font-weight:700;cursor:pointer;text-decoration:underline',
              onClick: () => { S.oppslagSok = ord; oppdater(); } }, ord)))) : null));
    });
  });
  if (sok && !Object.keys(grupper).length) wrap.appendChild(tomTreff(S.oppslagSok));
  return wrap;
}

/* ---------- Sky: innlogging og synk ---------- */
/* Skjemaet er lokalt i modulen (ikke i S), så halvskrevne passord aldri havner
   i localStorage eller i en sikkerhetskopi. */
const skyForm = { epost: '', passord: '', modus: 'inn', melding: null, feil: null, jobber: false };
let _harHentetNed = false;

function tegnKonto() {
  if (typeof Sky === 'undefined' || !Sky.klar()) return null;
  const st = Sky.status();
  const boks = kort('Konto og sky', null);
  if (st.tilstand !== 'utlogget') {
    const prikk = { synker: 'var(--color-accent-500)', lagret: 'var(--color-accent-2-500)', feil: 'var(--color-danger)' }[st.tilstand] || 'var(--color-accent-2-500)';
    boks.appendChild(h('div', { style: 'display:flex;align-items:center;gap:8px;margin-top:6px' },
      h('span', { style: 'width:9px;height:9px;border-radius:999px;flex:0 0 9px;background:' + prikk }),
      h('div', { style: 'flex:1;min-width:0' },
        h('div', { style: 'font-weight:700;font-size:.9rem;overflow:hidden;text-overflow:ellipsis' }, st.epost || ''),
        h('div', { style: 'font-size:.74rem;color:var(--color-neutral-600)' }, st.tekst))));
    boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:8px' },
      'Bakeloggen, bildene og valgene dine lagres i skyen og følger deg til andre enheter. Appen virker som før uten nett — endringene sendes opp når du er tilkoblet igjen.'));
    boks.appendChild(h('div', { style: 'display:flex;gap:8px;margin-top:10px' },
      h('button', { class: 'btn', style: 'flex:1;font-size:.8rem', onClick: async () => { await Sky.skyvNaa(S); render(); } }, 'Synk nå'),
      h('button', { class: 'btn', style: 'flex:1;font-size:.8rem', onClick: loggUtTrygt }, 'Logg ut')));
    if (skyForm.utFeil) boks.appendChild(h('div', { class: 'varsel fare' },
      h('b', null, 'Fikk ikke lagret loggen i skyen. '),
      'Du er fortsatt innlogget, og ingenting er slettet. ' + skyForm.utFeil +
      ' Prøv «Synk nå» når du har nett igjen, så kan du logge ut trygt.'));
    boks.appendChild(h('div', { style: 'font-size:.72rem;color:var(--color-neutral-600);margin-top:8px;line-height:1.45' },
      'Logger du ut, lastes bakeloggen opp og fjernes fra denne enheten. Da ser ingen bakene dine uten å logge inn. De hentes ned igjen neste gang du logger inn.'));
    return boks;
  }
  // Utlogget: registrer / logg inn
  const erNy = skyForm.modus === 'ny';
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:6px' },
    skalKreveInnlogging()
      ? 'Alt du lager ligger på kontoen din: bakeloggen, oppskriftene, bildene og innstillingene. Logger du inn på en annen enhet, er alt der.'
      : 'Logger du inn, lagres bakeloggen i skyen og følger deg til ny telefon eller PC.'));
  boks.appendChild(h('div', { class: 'toggle2', style: 'margin-top:10px' },
    h('button', { class: !erNy ? 'paa' : '', onClick: () => { skyForm.modus = 'inn'; skyForm.feil = skyForm.melding = null; render(); } }, 'Logg inn'),
    h('button', { class: erNy ? 'paa' : '', onClick: () => { skyForm.modus = 'ny'; skyForm.feil = skyForm.melding = null; render(); } }, 'Ny konto')));
  boks.appendChild(h('input', { class: 'sok', style: 'margin-top:10px', type: 'email', inputmode: 'email',
    autocomplete: 'email', 'data-fokus': 'skyEpost', placeholder: 'E-post', value: skyForm.epost,
    oninput: e => { skyForm.epost = e.target.value; } }));
  boks.appendChild(h('input', { class: 'sok', type: 'password', 'data-fokus': 'skyPassord',
    autocomplete: erNy ? 'new-password' : 'current-password', placeholder: 'Passord (minst 6 tegn)', value: skyForm.passord,
    oninput: e => { skyForm.passord = e.target.value; } }));
  boks.appendChild(h('button', { class: 'btn btn-primary btn-full', disabled: skyForm.jobber ? '' : null,
    onClick: () => skySend(erNy) }, skyForm.jobber ? 'Vent …' : (erNy ? 'Opprett konto' : 'Logg inn')));
  if (!erNy) boks.appendChild(h('button', { class: 'btn-ghost', style: 'font-size:.78rem', onClick: skyGlemt }, 'Glemt passord?'));
  if (skyForm.feil) boks.appendChild(h('div', { class: 'varsel fare' }, skyForm.feil));
  if (skyForm.melding) boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:8px' }, skyForm.melding));
  return boks;
}
async function skySend(erNy) {
  skyForm.feil = skyForm.melding = null;
  if (!skyForm.epost || !skyForm.passord) { skyForm.feil = 'Fyll inn både e-post og passord.'; render(); return; }
  skyForm.jobber = true; render();
  const svar = erNy ? await Sky.registrer(skyForm.epost, skyForm.passord) : await Sky.loggInn(skyForm.epost, skyForm.passord);
  skyForm.jobber = false;
  skyForm.feil = svar.feil || null;
  skyForm.melding = svar.melding || null;
  if (!svar.feil) skyForm.passord = '';
  render();
  if (!svar.feil && Sky.bruker()) await synkVedInnlogging();
}
async function skyGlemt() {
  skyForm.feil = skyForm.melding = null;
  if (!skyForm.epost) { skyForm.feil = 'Skriv inn e-posten din først.'; render(); return; }
  const svar = await Sky.glemtPassord(skyForm.epost);
  skyForm.feil = svar.feil || null; skyForm.melding = svar.melding || null;
  render();
}
/* ---------- Bakeloggen flettes, den overskrives aldri ----------
   Resten av tilstanden er INNSTILLINGER — der er «nyeste vinner» riktig, for det
   finnes bare én gjeldende oppskrift. Bakeloggen er HISTORIKK, og historikk kan
   ikke ha en vinner: en post som finnes på én enhet og ikke på den andre er ikke
   en konflikt, den er en post den andre enheten ikke har sett ennå.

   Dette er feilen Bjørn traff. `oppdatert` ble bumpet av all bruk, så en enhet
   uten historikk kunne bli «nyest» bare ved at man blar til Logg for å logge inn
   — og da la den sin tomme loggListe over historikken i skyen. Uopprettelig.

   Sletting løses med gravsteiner (`loggSlettet`) i stedet for ved fravær. Uten
   dem ville en union gjenopplivet hver post man har slettet, hver gang den andre
   enheten synket. */
/* ---------- Bakeloggen hører til kontoen ----------
   Etter at loggen ble FLETTET i stedet for overskrevet (se over), fikk «lokalt
   først» en bakside: loggen ble liggende igjen på enheten etter utlogging, og
   ville blitt flettet inn i neste konto som logget inn der. Bakeloggen er
   personlig; den skal ikke arves av den som låner telefonen.

   Modellen er derfor to eierskap, ikke ett:
     - post med `konto: <uid>`  → hører til den kontoen, bor i skyen
     - post med `konto: null`   → loggført uten konto, hører til ENHETEN

   Ved utlogging lastes kontoens poster opp, VERIFISERT, og fjernes så lokalt.
   Postene uten konto legges tilbake, for de var aldri kontoens.

   Ved innlogging flettes kontoens egne poster som før, mens poster uten konto
   utløser et spørsmål. Å flette dem inn i stillhet ville lagt en fremmeds bak
   inn i din logg på en delt enhet; å slette dem ville vært datatap. Å spørre er
   det eneste som ikke er en av delene.                                        */
/* Loggen bor i et arkiv per eier, ved siden av hovedtilstanden. Utlogging
   FLYTTER loggen dit i stedet for å slette den, og innlogging henter den ut
   igjen. Ingenting kastes noe sted i denne mekanikken — det er hele poenget:
   førsteforsøket slettet den lokale loggen ved utlogging, og var loggen ikke
   kommet trygt opp i skyen først, var den borte for godt.

   `enhet` er arkivet for bak loggført uten konto. */
const LOGG_ARKIV = uid => 'forgebakery.v2.logg.' + (uid || 'enhet');
function lesArkiv(uid) {
  try {
    const o = JSON.parse(localStorage.getItem(LOGG_ARKIV(uid)) || 'null');
    if (o && Array.isArray(o.poster)) return { poster: o.poster, slettet: Array.isArray(o.slettet) ? o.slettet : [] };
  } catch (e) {}
  return { poster: [], slettet: [] };
}
function skrivArkiv(uid, poster, slettet) {
  try { localStorage.setItem(LOGG_ARKIV(uid), JSON.stringify({ poster: poster || [], slettet: slettet || [] })); } catch (e) {}
}

/* Hvilken konto den lokale tilstanden tilhører.
   `S` bar ingen uid, så ved kontobytte på samme enhet ble forrige brukers
   innstillinger, standardbrød, favoritter og bildeutkast behandlet som den nye
   kontoens — og lastet opp i deres rad. Loggen var vernet av flettingen; resten
   var det ikke. */
const UID_LAGER = 'forgebakery.v2.uid';
function lagretUid() { try { return localStorage.getItem(UID_LAGER); } catch (e) { return null; } }
function settLagretUid(uid) { try { uid ? localStorage.setItem(UID_LAGER, uid) : localStorage.removeItem(UID_LAGER); } catch (e) {} }

const ANON_LAGER = 'forgebakery.v2.utenkonto';
function naaKonto() {
  const b = (typeof Sky !== 'undefined' && Sky.klar() && Sky.bruker()) || null;
  return b ? b.id : null;
}
/* Er posten ENHETENS, altså loggført bevisst uten konto?
   Forskjellen på `konto: null` og manglende `konto` er reell og viktig:

     konto: null   — feltet er satt, og satt til null: loggført mens man var
                     utlogget, ETTER at eierskap ble innført. Hører til enheten.
     ingen konto   — posten er eldre enn feltet. Den har hele tiden blitt synket
                     opp til kontoen, så det er der den hører hjemme.

   Uten dette skillet ble hver eneste eksisterende loggpost lest som enhetens,
   lagt i enhetsbøtta ved innlogging og lagt TILBAKE ved utlogging — så loggen
   ble stående i lista etter at man hadde logget ut. */
function erUtenKonto(b) {
  return !!b && Object.prototype.hasOwnProperty.call(b, 'konto') && b.konto == null;
}
function lesAnon() {
  try {
    const o = JSON.parse(localStorage.getItem(ANON_LAGER) || 'null');
    if (o && Array.isArray(o.poster)) return { poster: o.poster, avslaatt: !!o.avslaatt };
  } catch (e) {}
  return { poster: [], avslaatt: false };
}
function skrivAnon(o) {
  try {
    if (!o.poster.length) localStorage.removeItem(ANON_LAGER);
    else localStorage.setItem(ANON_LAGER, JSON.stringify(o));
  } catch (e) {}
}

function lagetMs(b) {
  if (b && isFinite(b.laget)) return +b.laget;
  const m = /^b(\d{10,})/.exec(String((b && b.id) || ''));   // id-ene er 'b' + Date.now()
  return m ? +m[1] : 0;                                      // eldre id-er: sorteres først
}
function flettLogg(lokal, sky, slettet) {
  const doed = new Set(slettet || []);
  const kart = new Map();
  (Array.isArray(sky) ? sky : []).forEach(b => { if (b && b.id) kart.set(b.id, b); });
  (Array.isArray(lokal) ? lokal : []).forEach(b => {
    if (!b || !b.id) return;
    const fra = kart.get(b.id);
    // Samme post begge steder: den sist redigerte vinner. Mangler `endret` på
    // begge (poster fra før feltet fantes), beholdes den lokale.
    if (!fra || (+b.endret || 0) >= (+fra.endret || 0)) kart.set(b.id, b);
  });
  return [...kart.values()].filter(b => !doed.has(b.id)).sort((a, b) => lagetMs(a) - lagetMs(b));
}

/* Utlogging i tre trinn, i denne rekkefølgen, og bare hvis trinn 1 lykkes:
     1. last opp — og VERIFISER at det gikk. Uten verifiseringen ville et
        nettverksglipp betydd at loggen ble slettet lokalt uten å finnes noe
        annet sted. Det er nøyaktig den feilen vi nettopp rettet, speilvendt.
     2. fjern kontoens poster fra enheten
     3. legg tilbake postene som ble loggført uten konto — de var aldri
        kontoens, og skal overleve utloggingen                                */
async function loggUtTrygt() {
  skyForm.utFeil = null;
  const uid = naaKonto();
  const alle = S.loggListe || [];
  const enhetens = alle.filter(erUtenKonto);
  const kontoens = alle.filter(b => !erUtenKonto(b));

  // 1 · Opp i skyen, og verifiser. Feiler det, skjer INGENTING annet: man blir
  //     stående innlogget med alt i behold og får beskjed.
  if (alle.length || (S.loggSlettet || []).length) {
    await Sky.skyvNaa(S);
    const st = Sky.status();
    if (st.tilstand === 'feil') { skyForm.utFeil = st.tekst || ''; render(); return; }
  }
  // 2 · Legg kontoens logg i arkivet. Den slettes ikke — den flyttes, så en
  //     innlogging uten nett fortsatt viser historikken.
  if (uid) skrivArkiv(uid, kontoens, S.loggSlettet || []);

  /* 3 · Logg ut FØR tilstanden endres.
         Rekkefølgen er ikke kosmetikk: `lagre()` speiler opp til skyen så lenge
         noen er innlogget, og debouncet. Tømte vi loggen først og lagret, ble en
         TOM logg lagt i kø mot skyen — og skrev over historikken der et sekund
         senere. Det var nettopp slik den lokale loggen kunne forsvinne for godt. */
  await Sky.loggUt();
  _harHentetNed = false;
  _synkOk = false;                // porten lukkes med kontoen
  settLagretUid(null);

  // 4 · Enhetens egne bak er tilbake — de var aldri kontoens.
  const arkivEnhet = lesArkiv(null);
  const kjent = new Set(enhetens.map(b => b.id));
  S.loggListe = enhetens.concat(arkivEnhet.poster.filter(b => b && !kjent.has(b.id)));
  S.loggSlettet = arkivEnhet.slettet.slice();
  lagre();
  render();
}

/* Ved innlogging: innstillingene følger nyeste tidsstempel, loggen flettes. */
async function synkVedInnlogging() {
  if (_harHentetNed) return;
  _harHentetNed = true;
  const sky = await Sky.hentNed();
  // Leseferil er IKKE det samme som «ingenting der oppe». Uten dette skillet
  // kunne et nettverksglipp få appen til å laste opp lokal tilstand over en
  // historikk den aldri fikk lest. `_harHentetNed` slippes, så neste
  // synlighetsbytte prøver igjen — før ble ett glipp stående til omstart
  // (release-review 01.08).
  if (sky && sky.feil) { _harHentetNed = false; render(); return; }
  const uid = naaKonto();
  /* KONTOBYTTE PÅ SAMME ENHET: er den lokale tilstanden stemplet med en ANNEN
     uid, er innstillingene, standardbrødet og kalibreringen forrige brukers —
     de skal ikke flettes inn i (eller vinne over) den nye kontoens rad.
     Loggen er alt vernet av eierskapsfeltene; her vernes resten: skyen vinner
     ubetinget, og finnes ingenting der oppe, starter kontoen fra standard i
     stedet for å arve naboens oppsett (teknisk review 01.08 — vernet var
     skrevet, men aldri koblet på). */
  const forrigeUid = lagretUid();
  const kontoByttet = !!(forrigeUid && uid && forrigeUid !== uid);
  settLagretUid(uid);
  /* Kontoens ARKIV (skrevet ved forrige utlogging) flettes inn igjen — det er
     hele grunnen til at utlogging flytter loggen dit i stedet for å slette
     den. Før ble det skrevet, men aldri lest: en innlogging uten nett viste
     tom logg tross at historikken lå lokalt (teknisk review 01.08). */
  const arkiv = lesArkiv(uid);
  if (arkiv.poster.length) {
    const kjent = new Set((S.loggListe || []).map(b => b && b.id));
    S.loggListe = (S.loggListe || []).concat(arkiv.poster.filter(b => b && !kjent.has(b.id)));
    S.loggSlettet = [...new Set([].concat(S.loggSlettet || [], arkiv.slettet || []))];
  }
  if (!sky || !sky.state) {
    if (kontoByttet) { S = nyStandard(); if (window.__FB) window.__FB.S = S; S.loggListe = arkiv.poster.slice(); S.loggSlettet = arkiv.slettet.slice(); }
    _synkOk = true;                                                // flettet mot (tom) sky — porten kan åpnes
    lagre(); Sky.lagreOpp(S); render(); return;                    // ingenting oppe ennå — legg opp det lokale
  }
  const skyMs = sky.oppdatert ? new Date(sky.oppdatert).getTime() : 0;
  const lokaltMs = kontoByttet ? -1 : (S.oppdatert || 0);          // byttet konto → skyen vinner alltid
  // Del de lokale postene på eierskap FØR noe flettes. Bare kontoens egne skal
  // inn i kontoens logg; postene uten konto legges til side og spørres om.
  const lokalt = S.loggListe || [];
  /* `erUtenKonto` er testen, ikke `!b.konto`.
     Med den gamle testen falt hver eldre post (uten `konto`-feltet) UTENFOR
     `mine` og INNENFOR `utenKonto` samtidig: den ble flyttet til enhetsbøtta,
     forsvant fra kontoens logg — og ble lagt tilbake ved neste utlogging. Det
     er også grunnen til at en sletting på én enhet ikke ble borte på den andre:
     posten kom tilbake fra bøtta i stedet for å bli filtrert av gravsteinen. */
  // Ved kontobytte: forrige brukers konto-poster (konto === en ANNEN uid) skal
  // ikke inn i den nye kontoens logg — de tilhører raden de kom fra.
  const mine = lokalt.filter(b => b && !erUtenKonto(b) && (!kontoByttet || !b.konto || b.konto === uid));
  const utenKonto = lokalt.filter(erUtenKonto);
  if (utenKonto.length) {
    const anon = lesAnon();
    const kjent = new Set(anon.poster.map(b => b.id));
    skrivAnon({ poster: anon.poster.concat(utenKonto.filter(b => !kjent.has(b.id))), avslaatt: anon.avslaatt });
  }
  const skyState = sky.state || {};
  const gravsteiner = [...new Set([].concat(S.loggSlettet || [], skyState.loggSlettet || []))];
  const flettet = flettLogg(mine, skyState.loggListe, gravsteiner);
  if (skyMs > lokaltMs) {
    try {
      /* Skyen vinner på INNSTILLINGER, aldri på hvor du står.
         Uten dette adopterte appen også `skjerm`, åpne utfellinger og
         søkefeltet fra den andre enheten: gikk du til Logg mens en synk kom
         inn, ble du kastet til Oppslag fordi det var der PC-en sto sist.
         Visningstilstand tilhører enheten du holder i hånda. */
      const beholdUI = {};
      UI_FELT.forEach(k => { beholdUI[k] = S[k]; });
      localStorage.setItem(LAGER, JSON.stringify(skyState));
      S = last();
      Object.keys(beholdUI).forEach(k => { if (beholdUI[k] !== undefined) S[k] = beholdUI[k]; });
      if (window.__FB) window.__FB.S = S;
    } catch (e) {}
  }
  // Loggen settes ETTER at innstillingene er avgjort, uansett hvem som vant.
  S.loggListe = flettet;
  S.loggSlettet = gravsteiner;
  /* PORTEN ÅPNES FØRST NÅ: vi har hentet ned og flettet mot skyen for denne
     kontoen — det er nøyaktig betingelsen `_synkOk` beskriver. Uten denne
     tilordningen var den løpende synken DØD: `kanSynke()` ble aldri sann, og
     endringer nådde skyen bare ved fokus-bytte og innlogging (funnet uavhengig
     av to reviewer 01.08). */
  _synkOk = true;
  lagre();                 // skriv det flettede lokalt (og stempl det, hvis det endret seg)
  /* Push tilbake bare når flettingen faktisk har noe skyen mangler: lokale
     innstillinger som var nyest, eller poster/gravsteiner skyen ikke hadde. En
     ubetinget push stemplet skyraden ved HVERT fokus-bytte — og siden stempelet
     var opplastingstid, så en uendret enhet systematisk «nyere» ut enn enheten
     med ekte endringer, som så ble rullet tilbake (release-review 01.08). */
  const skyLogg = skyState.loggListe || [];
  const skyGrav = skyState.loggSlettet || [];
  if (lokaltMs > skyMs || flettet.length !== skyLogg.length || gravsteiner.length !== skyGrav.length) {
    Sky.skyvNaa(S);
  }
  render();
  hentDelteKalibreringer();
}

/* Delte maskinmålinger.
   Friksjonstallene i tabellen er klasseanslag. Har noen målt sin egen maskin og
   delt den, skal alle med samme maskin få nytte av den — derfor hentes de fra en
   egen, delt tabell ved innlogging. Feiler den (tabellen finnes ikke ennå, eller
   nettet er nede), går appen videre på anslagene: dette er en forbedring, ikke
   en forutsetning. */
async function hentDelteKalibreringer() {
  if (typeof Sky === 'undefined' || !Sky.hentKalibreringer) return;
  try {
    const kal = await Sky.hentKalibreringer();
    if (kal && Object.keys(kal).length) { S.delteKalib = kal; render(); }
  } catch (e) {}
}

/* Tastatur i bildevisningen: Esc lukker, piler blar. Én lytter for hele appen —
   den sjekker selv om visningen er åpen, så den trenger aldri av- og påmelding. */
document.addEventListener('keydown', e => {
  if (!S.bildeVis) {
    // Det historiske regnskapsarket fra loggen lukker også på Esc — men bare
    // når bildevisningen ikke ligger over: innerste lag først.
    if (e.key === 'Escape' && S.lgRegnskap) { S.lgRegnskap = null; oppdater(); }
    return;
  }
  if (e.key === 'Escape') { S.bildeVis = null; oppdater(); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const post = S.loggListe.find(b => b.id === S.bildeVis.id);
    const n = post ? postBilder(post).length : 0;
    if (n > 1) { S.bildeVis = { id: S.bildeVis.id, i: (S.bildeVis.i + (e.key === 'ArrowLeft' ? -1 : 1) + n) % n }; oppdater(); }
  }
});

/* Snarveiene i manifestet (langtrykk på appikonet på Android) åpner appen med
   ?skjerm=prosess eller ?skjerm=logg. Uten dette ville de bare åpnet forsiden. */
(function apneFraAdresse() {
  const bedt = new URLSearchParams(location.search).get('skjerm');
  if (bedt && SKJERMER.some(s => s.id === bedt)) { S.skjerm = bedt; if (bedt === 'prosess') S.aktivSteg = 0; }
})();

/* ============================================================
   BAKETIMERE — nedtelling med varsel på telefonen
   ============================================================
   Under bakingen står man ofte og venter på ett tall: når skal jeg sjekke
   deigen igjen, når er stekingen ferdig. Timerne løser det, og det viktige er
   at de RINGER på telefonen selv om appen er lukket.

   Hvordan det faktisk ringer når appen er borte: en PWA kan ikke kjøre en
   `setTimeout` i bakgrunnen — service workeren blir drept. Den eneste veien til
   et varsel på et framtidig klokkeslett UTEN en egen push-server er
   Notification Triggers (`showTrigger` + `TimestampTrigger`): et varsel som
   planlegges på OS-nivå og fyres av Android selv om appen er helt lukket.
   Støttes det ikke, faller vi tilbake på et varsel + lyd mens appen er åpen, og
   sier tydelig fra i grensesnittet at appen da må stå på. Ærlig framfor stille
   svikt: en baketimer som ikke ringer er verre enn ingen timer. */

function varslingStottes() { return typeof Notification !== 'undefined' && 'serviceWorker' in navigator; }
function planlagteVarslerStottes() { return varslingStottes() && 'showTrigger' in Notification.prototype; }

async function beOmVarsling() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try { return await Notification.requestPermission(); } catch (e) { return 'denied'; }
}

/* Planlegg et OS-nivå varsel som fyrer selv om appen er lukket. */
async function planleggVarsel(t) {
  if (!planlagteVarslerStottes() || Notification.permission !== 'granted') return;
  let reg; try { reg = await navigator.serviceWorker.ready; } catch (e) { return; }
  try {
    await reg.showNotification('Forge Bakery', {
      tag: 'baketimer-' + t.id, body: t.navn,
      icon: 'icons/icon-192-v2.png', badge: 'icons/icon-192-v2.png',
      vibrate: [300, 120, 300, 120, 300], requireInteraction: true, renotify: true,
      showTrigger: new TimestampTrigger(t.slutt),
      data: { stegId: t.stegId || null, timerId: t.id }
    });
  } catch (e) {}
}

/* Vis varselet MED EN GANG (brukes når appen er åpen og timeren går ut, og
   planlagte varsler ikke støttes). Samme tag, så det aldri dobles. */
async function visVarselNaa(t) {
  if (!varslingStottes() || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('Forge Bakery', {
      tag: 'baketimer-' + t.id, body: t.navn, icon: 'icons/icon-192-v2.png', badge: 'icons/icon-192-v2.png',
      vibrate: [300, 120, 300, 120, 300], requireInteraction: true,
      data: { stegId: t.stegId || null, timerId: t.id }
    });
  } catch (e) {}
}

async function avlysVarsel(id) {
  if (!varslingStottes()) return;
  let reg; try { reg = await navigator.serviceWorker.ready; } catch (e) { return; }
  for (const opt of [{ tag: 'baketimer-' + id, includeTriggered: true }, { tag: 'baketimer-' + id }]) {
    try { (await reg.getNotifications(opt)).forEach(n => n.close()); return; } catch (e) {}
  }
}

/* Alarmen skal RINGE, ikke pippe én gang og gi seg. Denne spiller et kort
   triplett-pip + vibrasjon, og kalles gjentatte ganger av sekund-tikken så
   lenge en timer står i alarm — helt til brukeren skrur den av. */
let _lydCtx = null, _alarmTeller = 0;
function alarmLyd() {
  try { if (navigator.vibrate) navigator.vibrate([400, 150, 400]); } catch (e) {}
  try {
    _lydCtx = _lydCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _lydCtx; if (ctx.state === 'suspended') ctx.resume();
    [0, 0.26, 0.52].forEach(dt => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      const t0 = ctx.currentTime + dt;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      o.start(t0); o.stop(t0 + 0.22);
    });
  } catch (e) {}
}
function stoppLyd() { try { if (navigator.vibrate) navigator.vibrate(0); } catch (e) {} _alarmTeller = 0; }

function timerId() { return 't' + Date.now().toString(36) + Math.floor(Math.random() * 1e5).toString(36); }
/* Skjerm-wakelock: så lenge en timer går, holdes skjermen VÅKEN, så sekund-
   tikken og alarmen faktisk kjører. En PWA-timer stopper når skjermen slukner
   (nettleseren fryser fanen), og det er derfor varselet uteble «da telefonen
   gikk i svart». Wakelock er det eneste en app UTEN en push-tjeneste kan gjøre —
   den hindrer at skjermen slukner av seg selv. Låser du telefonen manuelt
   (av-knappen), slippes den likevel; da kan varselet utebli, og det sier appen
   ærlig fra om i timer-panelet. */
let _wakeLock = null;
async function oppdaterWakeLock() {
  if (!('wakeLock' in navigator)) return;
  const harTimer = (S.timere || []).length > 0;
  try {
    if (harTimer && !_wakeLock && document.visibilityState === 'visible') {
      _wakeLock = await navigator.wakeLock.request('screen');
      _wakeLock.addEventListener('release', () => { _wakeLock = null; });
    } else if (!harTimer && _wakeLock) {
      await _wakeLock.release(); _wakeLock = null;
    }
  } catch (e) { _wakeLock = null; }
}

async function startTimer(navn, minutter, stegId) {
  const tillat = await beOmVarsling();
  const t = { id: timerId(), navn: navn || 'Timer', slutt: Date.now() + Math.round(minutter * 60000), stegId: stegId || null, ringt: false };
  S.timere = (S.timere || []).concat([t]);
  if (tillat === 'granted') planleggVarsel(t);
  oppdaterWakeLock();
  oppdater();
}
function avbrytTimer(id) {
  S.timere = (S.timere || []).filter(t => t.id !== id);
  avlysVarsel(id);
  stoppLyd();               // stopp vibrasjon/alarm med en gang
  oppdaterWakeLock();
  oppdater();
}
function justerTimer(id, deltaMin) {
  const t = (S.timere || []).find(x => x.id === id); if (!t) return;
  t.slutt = Math.max(Date.now() + 1000, t.slutt + deltaMin * 60000);
  t.ringt = false;
  avlysVarsel(id).then(() => planleggVarsel(t));
  oppdater();
}

function timerTekst(ms) {
  if (ms <= 0) return 'ferdig';
  const s = Math.round(ms / 1000), t = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sek = s % 60;
  if (t > 0) return t + ' t ' + String(m).padStart(2, '0') + ' min';
  return String(m).padStart(2, '0') + ':' + String(sek).padStart(2, '0');
}

/* Tikker hvert sekund: oppdaterer nedtellings-tekstene i DOM-en (ikke full
   re-render, som ville stjålet fokus), og driver alarmen. Alarmen LOOPER så
   lenge en utgått timer ikke er skrudd av — det var nettopp det som manglet:
   før ga den én kort lyd og ga seg selv. */
let _timerTikk = null;
function tikkTimere() {
  const now = Date.now();
  let nyRing = false, alarmerer = false;
  (S.timere || []).forEach(t => {
    const tekst = t.slutt <= now ? 'ferdig' : timerTekst(t.slutt - now);
    // querySelectorAll: samme timer kan vises både i topplinja og i panelet.
    document.querySelectorAll('[data-timer="' + t.id + '"]').forEach(el => { el.textContent = tekst; });
    if (now >= t.slutt && !t.kvittert) {
      alarmerer = true;
      if (!t.ringt) {
        t.ringt = true; nyRing = true;
        if (!planlagteVarslerStottes()) visVarselNaa(t);
      }
    }
  });
  // Ring hvert 3. sekund så lenge noe alarmerer.
  if (alarmerer) { if (_alarmTeller % 3 === 0) alarmLyd(); _alarmTeller++; }
  else _alarmTeller = 0;
  // Full re-render bare når en NY timer nettopp gikk av — da må topplinja og
  // panelet vise «Skru av»-knappen.
  if (nyRing) { lagre(); render(); }
}

function initTimere() {
  /* Uten Notification-API (iOS Safari i fane, eldre nettlesere) skal timerne
     LIKEVEL telle ned og ringe i appen — bare OS-varslene mangler. Før
     returnerte vi her, så tikken aldri startet: timere kunne legges til, men
     sto frosset og ringte aldri (teknisk review 01.08). */
  const harVarsel = typeof Notification !== 'undefined';
  const now = Date.now();
  // Rydd bort timere som gikk ut for mer enn en time siden; behold nye/pågående.
  S.timere = (S.timere || []).filter(t => t && isFinite(t.slutt) && t.slutt > now - 3600000);
  S.timere.forEach(t => {
    if (now >= t.slutt) t.ringt = true;                 // alt utgått: ikke pip på nytt ved lasting
    else if (harVarsel && Notification.permission === 'granted') planleggVarsel(t);   // re-arm etter omstart
  });
  if (_timerTikk == null) _timerTikk = setInterval(tikkTimere, 1000);
  // Wakelock slippes automatisk når fanen skjules — hent den igjen når appen
  // kommer fram, så lenge en timer fortsatt går.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') oppdaterWakeLock();
  });
  oppdaterWakeLock();
  // Trykk på varselet åpner prosess-skjermen på riktig steg.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data && e.data.type === 'timer-klikk') {
        S.skjerm = 'prosess';
        if (e.data.stegId) { S.aktivStegId = e.data.stegId; S.aktivSteg = 0; }
        // Trykk på varselet = «jeg tar den» → skru av alarmen for den timeren.
        if (e.data.timerId) { S.timere = (S.timere || []).filter(t => t.id !== e.data.timerId); stoppLyd(); }
        oppdater();
      }
    });
  }
}

/* ---------- Start ---------- */
if (typeof Sky !== 'undefined' && Sky.klar()) {
  Sky.paaEndring(() => { render(); if (Sky.bruker()) synkVedInnlogging(); });
  /* Hentes appen fram igjen, sjekkes skyen på nytt.
     Uten dette skjedde nedhentingen bare ved oppstart, og en enhet som lå åpen
     ville aldri se at et bak var slettet på en annen — den ville tvert imot
     dytte sin egen (uten gravsteinen) opp igjen ved neste endring, og
     gjenopplive posten. */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !Sky.bruker()) return;
    _harHentetNed = false;
    synkVedInnlogging();
  });
}
render();
// Baketimere: rydd utgåtte, re-arm pågående varsler, og start sekund-tikken.
try { initTimere(); } catch (e) {}
// Grunntilstand i historikken, så første tilbaketrykk har noe å falle tilbake på.
try { history.replaceState({ skjerm: S.skjerm }, ''); } catch (e) {}
/* Testkroken. `flettLogg` er eksponert fordi den er ren og fordi den er den
   viktigste funksjonen i appen å ha dekket: det er den som gjør at bakeloggen
   ikke kan forsvinne i en synk. */
window.__FB = { S, render, oppdater, flettLogg, oppskriftAvtrykk, startTimer, justerTimer, avbrytTimer };
})();
