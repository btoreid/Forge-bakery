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
  brotype: 'grovbrod', grov: 40, hyd: 75, tid: 'lang',
  ff: false, ffType: 'poolish',
  tillegg: { solsikke: 6, linfro: 3 },
  antall: 4, vekt: 900,
  startTemp: 24, melTemp: 21, maskin: 'spiralHjemme', eltMin: 13, romTemp: 22,
  stekeProfil: 'brod_kloke', stekeProfilManuell: false, lokk: true, fulltKjol: false,
  form: 'rund', utstyr: 'stal15', vektTrinn: 1, egenFriksjon: 0.4, pyrexIOvn: false,
  saltPct: null, ferdigMs: null, tidModus: 'ferdig',
  heveplan: null,                 // null = planens standard; array = redigert
  paramInfo: null, tilleggInfo: null, melInfo: null, meltallInfo: null,
  aktivSteg: 0, regnskapAapen: false, byttBekreft: null,
  loggListe: [], lgNavn: '', lgKar: 8, lgBilder: [], oppdatert: 0,
  lgRediger: null, lgSlett: null, bildeVis: null,
  favoritter: [], oppslag: 'meny', oppslagSok: ''
};
let S = last();

function nyStandard() {
  const s = Object.assign({}, STANDARD);
  s.tillegg = Object.assign({}, STANDARD.tillegg);   // bryt delt referanse med STANDARD
  s.loggListe = []; s.favoritter = []; s.lgBilder = [];
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
function lagre() {
  // Tidsstempel på hver lagring: det er dette synken sammenligner når samme
  // konto brukes fra to enheter (nyeste vinner).
  S.oppdatert = Date.now();
  try { localStorage.setItem(LAGER, JSON.stringify(S)); } catch (e) {}
  // Lokalt først: localStorage er sannheten mens du bruker appen. Er du
  // innlogget, speiles den opp til skyen (debouncet inne i Sky).
  if (typeof Sky !== 'undefined' && Sky.klar() && Sky.bruker()) Sky.lagreOpp(S);
}

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

/* ---------- Formattering (motorens hjelpere er globale) ---------- */
const g0 = v => gram(v, 0);
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
const SKJERMER = [
  { id: 'brodet',  navn: 'Brød',    kicker: 'FORBEREDELSE · 1 AV 3', tittel: '' },
  { id: 'deigen',  navn: 'Deig',    kicker: 'FORBEREDELSE · 2 AV 3', tittel: 'Mel, vann og frø' },
  { id: 'tid',     navn: 'Tid',     kicker: 'FORBEREDELSE · 3 AV 3', tittel: 'Når vil du ha brød?' },
  { id: 'prosess', navn: 'Prosess', kicker: 'BAKING', tittel: 'Følg prosessen' },
  { id: 'logg',    navn: 'Logg',    kicker: 'LOGG', tittel: 'Bakeloggen' },
  { id: 'oppslag', navn: 'Oppslag', kicker: 'OPPSLAG', tittel: 'Oppslag' }
];
/* Brødtypene som designet viser dem — «Brød» er én type der grovheten settes i
   deigen (loff = grov 0), de tre andre er kalibrerte forvalg. */
const BTYPER = [
  { id: 'grovbrod', navn: 'Brød', undertittel: 'Fra loff til ekstra grovt — du setter grovheten i deigen', rute: 'bygg', antall: 4, vekt: 900,
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
    // Feilgrense: en korrupt tilstand skal aldri gi en blank app (teknisk #4).
    if (typeof console !== 'undefined') console.error('render feilet, nullstiller', e);
    S = nyStandard();
    try { localStorage.removeItem(LAGER); } catch (e2) {}
    try { renderInner(); } catch (e3) { byId('innhold').textContent = 'Noe gikk galt — appen ble nullstilt.'; }
  }
  finally { _rendrer = false; }
}
function renderInner() {
  const r = regn(S);
  const K = kjede(S, r, S.ferdigMs != null ? S.ferdigMs : standardFerdig());
  const sk = SKJERMER.find(s => s.id === S.skjerm) || SKJERMER[0];

  byId('topp').replaceChildren(
    ...[h('div', { class: 'kicker' }, sk.kicker), sk.tittel ? h('h1', null, sk.tittel) : null].filter(Boolean)
  );

  // Bevar scroll (teknisk #1) og fokus/markør (teknisk #2) over re-render.
  const innhold = byId('innhold');
  const scroll = _nullstillScroll ? 0 : innhold.scrollTop;
  const aktiv = document.activeElement;
  const fokusN = aktiv && aktiv.dataset ? aktiv.dataset.fokus : null;
  const caret = aktiv && aktiv.selectionStart != null ? aktiv.selectionStart : null;

  const tegner = { brodet: tegnBrodet, deigen: tegnDeigen, tid: tegnTid, prosess: tegnProsess, logg: tegnLogg, oppslag: tegnOppslag }[S.skjerm];
  innhold.replaceChildren(tegner(r, K));
  innhold.scrollTop = scroll;
  _nullstillScroll = false;

  if (fokusN) {
    const ny = innhold.querySelector('[data-fokus="' + fokusN + '"]');
    if (ny) { ny.focus(); if (caret != null) { try { ny.setSelectionRange(caret, caret); } catch (e) {} } }
  }

  tegnBunnlinje(r, K);
  tegnBildeVis();

  byId('bunnmeny').replaceChildren(...SKJERMER.map(s =>
    h('button', { class: s.id === S.skjerm ? 'paa' : '', 'aria-current': s.id === S.skjerm ? 'page' : null, onClick: () => bytt(s.id) },
      h('span', { class: 'ikon', 'aria-hidden': 'true' }, ikonSvg(s.id)), s.navn)));
}

function bytt(id) {
  _nullstillScroll = true;
  if (id === 'prosess') S.aktivSteg = 0;
  S.skjerm = id; lagre(); render();
}
function oppdater() { lagre(); render(); }

function standardFerdig() {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(17, 0, 0, 0);
  return d.getTime();
}

/* ============================================================
   BUNNLINJE — deigregnskap
   ============================================================ */
function fjernBakteppe() { const b = byId('bakteppe'); if (b) b.remove(); }
function tegnBunnlinje(r, K) {
  const bl = byId('bunnlinje');
  fjernBakteppe();
  if (['logg', 'oppslag'].includes(S.skjerm)) { bl.replaceChildren(); bl.className = 'bunnlinje'; S.regnskapAapen = false; return; }
  bl.className = 'bunnlinje' + (S.regnskapAapen ? ' open' : '');
  const stripe = h('button', { class: 'stripe', 'aria-expanded': S.regnskapAapen ? 'true' : 'false', onClick: () => { S.regnskapAapen = !S.regnskapAapen; oppdater(); } },
    h('b', null, g0(r.totalVekt)), ' deig', sep(),
    h('b', null, fmt(r.doseProfil.dose, 2)), ' GD', sep(),
    h('b', null, fmt(r.gjaerTotal, 2) + ' g'), ' gjær', sep(),
    h('b', null, String(r.loft.loft)), ' løft', sep(),
    h('b', null, fmt(K.totalT, 1) + ' t'), ' total',
    h('span', { class: 'pil' }, '▾'));
  const barn = [stripe];
  if (S.regnskapAapen) {
    const rader = [
      ['Mel totalt', g0(r.melTotal)],
      ['Vann i deigen', g0(r.vannHoved)],
      r.ffPaa ? ['Forferment', g0(r.forferment.total)] : null,
      ['Salt', fmt(r.salt, 1) + ' g'],
      ['Gjær (tørr)', fmt(r.gjaerTotal, 2) + ' g'],
      ['Effektiv hydrering', pst(r.effektivHydrering * 100, 1)],
      ['Brødskala', fmt(r.brodskala.pct, 0) + ' % · ' + r.brodskala.kort],
      ['Løftindeks', r.loft.loft + ' / 100'],
      ['Total tid', fmt(K.totalT, 1) + ' t'],
      ['Kostnad', fmt(r.kost.total, 0) + ' kr']
    ].filter(Boolean);
    // «Hva valgene koster» hører hjemme her: totalen over, avvikene mot
    // normalen (brød uten tillegg) under — samme tall som dose–respons-panelet.
    const avvik = doseResponsRader();
    // Arket popper opp OVER bunnlinja (position:absolute; bottom:100%).
    // Trykk hvor som helst på arket lukker det — ikke bare på bakteppet.
    barn.push(h('div', { class: 'regnskap-ark', onClick: () => { S.regnskapAapen = false; oppdater(); } },
      h('div', { class: 'ark-hank' }),
      h('div', { class: 'ark-tittel' }, 'Deigregnskap'),
      h('div', { class: 'regnskap' }, ...rader.map(([k, v]) =>
        h('div', { class: 'rad' }, h('span', null, k), h('b', null, v)))),
      avvik.length ? h('div', { class: 'ark-tittel', style: 'margin-top:12px' }, 'Valgene dine mot normalen') : null,
      ...avvik.map(rad => h('div', { class: 'ark-avvik' },
        h('b', null, rad.navn),
        h('span', null, rad.verdier.map(([lab, v]) => lab + ' ' + fmtDelta(v)).join(' · ')))),
      avvik.length ? h('div', { style: 'font-size:.68rem;color:var(--color-neutral-500);margin-top:4px' },
        '± er endring mot samme brød uten tillegg. Detaljer i «Hva valgene koster» på Deig.') : null));
    // Bakteppe over innholdet — lukker ved trykk.
    byId('telefon').appendChild(h('div', { class: 'regnskap-bakteppe', id: 'bakteppe',
      onClick: () => { S.regnskapAapen = false; oppdater(); } }));
  }
  bl.replaceChildren(...barn);
}
const sep = () => h('span', { class: 'sep' }, ' · ');

/* ============================================================
   1 · BRØDET
   ============================================================ */
function tegnBrodet(r, K) {
  const wrap = h('div');
  if (!S.loggListe.length) {
    wrap.appendChild(h('div', { class: 'tomkort' },
      h('div', { style: 'font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;color:var(--color-neutral-600);font-weight:800' }, 'Bakeloggen er tom'),
      h('div', { class: 'hjelpetekst', style: 'margin-top:6px' },
        'Første gang har appen ingenting å sammenligne med. Start fra et forvalg — de er kalibrert mot 24 publiserte formler — og loggfør baket når det er ute av ovnen. Da måles alt du endrer senere mot noe du faktisk har smakt.'),
      h('button', { class: 'btn btn-primary btn-full', style: 'margin-top:12px', onClick: startForvalg },
        'Start fra forvalget «Halvgrovt 40 %»')));
  }
  wrap.appendChild(h('div', { class: 'seksjonstittel' }, 'Eller velg brødtype'));
  wrap.appendChild(h('div', { class: 'valg' }, ...BTYPER.map(bt => {
    const paa = bt.id === S.brotype || (bt.id === 'grovbrod' && S.brotype === 'loff');
    const erPreset = bt.rute === 'preset';
    const preset = erPreset ? PRESETS.find(p => p.id === bt.id) : null;
    const grov = erPreset ? null : Math.round(paa ? r.brodskala.pct : S.grov);
    const badge = erPreset
      ? h('span', { class: 'badge-rund badge-vann' }, h('span', { class: 'b1' }, fmt(preset.hydrering, 0) + ' %'), h('span', { class: 'b2' }, 'VANN'))
      : h('span', { class: 'badge-rund badge-grov' }, h('span', { class: 'b1' }, grov + ' %'), h('span', { class: 'b2' }, 'GROVT'));
    return h('button', { class: 'valgkort' + (paa ? ' paa' : ''), aria: { pressed: paa }, onClick: () => velgBrotype(bt.id) },
      badge,
      h('span', { style: 'flex:1;min-width:0' },
        h('span', { class: 'tittel' }, bt.navn),
        h('span', { class: 'undertittel' }, bt.undertittel || '')),
      paa ? h('span', { class: 'valgt-merke' }, '✓ valgt') : null);
  })));

  // «Er du sikker?» — å bytte bakst er å starte på nytt, og det skal bekreftes.
  if (S.byttBekreft) {
    const ny = BTYPER.find(b => b.id === S.byttBekreft);
    wrap.appendChild(h('div', { class: 'varsel' },
      h('div', { style: 'font-weight:800;margin-bottom:4px' }, 'Bytte til ' + ny.navn + ' — starte på nytt?'),
      h('div', { style: 'font-size:.8rem;line-height:1.45' },
        'Da nullstilles deigvalgene dine (tillegg, vann, salt, grovhet og heveplan) til ' +
        ny.navn.toLowerCase() + 's egen oppskrift. Utstyr, maskin, logg og favoritter beholdes.'),
      h('div', { style: 'display:flex;gap:8px;margin-top:10px' },
        h('button', { class: 'btn btn-primary', style: 'flex:1;font-size:.82rem', onClick: () => nyBakst(S.byttBekreft) }, 'Ja, start på nytt'),
        h('button', { class: 'btn', style: 'flex:1;font-size:.82rem', onClick: () => { S.byttBekreft = null; oppdater(); } }, 'Avbryt'))));
  }

  // Om dette baket — hva det er, og prosessen du har foran deg. Stegene
  // GENERERES fra kjede(), samme kilde som Tid og Prosess leser.
  const btNaa = BTYPER.find(b => b.id === S.brotype) || (S.brotype === 'loff' ? BTYPER[0] : null);
  if (btNaa && btNaa.om && K && K.length) {
    const d = h('details', { class: 'kort', style: 'padding:0' });
    d.appendChild(h('summary', { style: 'padding:14px 16px;cursor:pointer;font-weight:800;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;color:var(--color-neutral-600);list-style:none' },
      'Om dette baket — prosessen kort ▾'));
    const kropp = h('div', { style: 'padding:0 16px 14px' });
    kropp.appendChild(h('div', { class: 'hjelpetekst' }, btNaa.om));
    kropp.appendChild(h('div', { class: 'felt-label', style: 'margin-top:10px;font-weight:800' },
      'Prosessen · totalt ' + fmt(K.totalT, 1) + ' t'));
    K.forEach((s, j) => kropp.appendChild(h('div', { style: 'display:flex;gap:8px;align-items:baseline;font-size:.78rem;padding:3px 0;border-bottom:1px dotted var(--color-neutral-200)' },
      h('span', { style: 'flex:0 0 18px;color:var(--color-neutral-500);font-variant-numeric:tabular-nums' }, String(j + 1)),
      h('span', { style: 'flex:1' }, s.navn),
      h('span', { style: 'color:var(--color-neutral-600);font-variant-numeric:tabular-nums;white-space:nowrap' }, fmtTimer(s.varighet / 60)))));
    kropp.appendChild(h('div', { style: 'font-size:.7rem;color:var(--color-neutral-500);margin-top:6px' },
      'Tidene følger valgene dine — hele kjeden med klokkeslett ligger under Prosess.'));
    d.appendChild(kropp);
    wrap.appendChild(d);
  }

  // Størrelse
  const emneMasse = r.totalVekt / Math.max(S.antall, 1);
  wrap.appendChild(h('div', { class: 'kort', style: 'margin-top:14px' },
    h('div', { class: 'kort-num' }, 'Størrelse'),
    stepperRad('Antall brød', S.antall, 'antall', 1, 40, 1),
    stepperRad('Gram per brød', S.vekt, 'vekt', 100, 2000, 50),
    h('div', { style: 'margin-top:10px;font-size:.8rem;color:var(--color-neutral-700);font-variant-numeric:tabular-nums' },
      'Deigvekt ', h('b', null, g0(r.totalVekt)), ' · hver ca. ', h('b', null, g0(emneMasse)),
      ' · Pyrex-gryta er 21,5 cm innvendig'),
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
function tegnFormKurv(r, emneMasse) {
  const boks = kort('Form og kurv', null);
  boks.appendChild(h('div', { class: 'valg', style: 'margin-top:6px' }, ...FORMER.map(f => {
    const paa = f.id === S.form;
    let maal = '';
    if (f.maal === 'lengde') maal = 'ca. ' + fmt(Math.cbrt(emneMasse / 1000) * f.kFaktor * 10, 0) + ' cm lang';
    else if (f.maal === 'tverrmål') maal = 'ca. ' + fmt(Math.cbrt(emneMasse / 1000) * f.kFaktor * 10, 0) + ' cm tvers';
    return h('button', { class: 'valgkort' + (paa ? ' paa' : ''), onClick: () => velgForm(f.id) },
      h('span', { style: 'flex:1;min-width:0' },
        h('span', { class: 'tittel', style: 'font-size:.98rem' }, f.navn),
        h('span', { class: 'undertittel' }, f.kort + (maal ? ' · ' + maal : ''))),
      paa ? h('span', { class: 'valgt-merke' }, '✓' ) : null);
  })));
  const f = FORMER.find(x => x.id === S.form);
  if (f && f.advarsel) boks.appendChild(h('div', { class: 'varsel' }, f.advarsel));
  if (f) boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:8px' }, f.om, f.snitt ? h('div', { style: 'margin-top:6px' }, h('b', null, 'Snitt: '), f.snitt) : null));
  return boks;
}
function tegnUtstyrValg(r) {
  const boks = kort('Stekeutstyr', null);
  const u = UTSTYR.find(x => x.id === S.utstyr) || UTSTYR[0];
  boks.appendChild(h('select', { class: 'sok', style: 'margin-top:6px', 'aria-label': 'Stekeutstyr',
    onchange: e => { S.utstyr = e.target.value; if (!S.stekeProfilManuell) S.stekeProfil = profilForUtstyr(S.utstyr, S.form); oppdater(); } },
    ...UTSTYR.map(x => h('option', { value: x.id, selected: x.id === S.utstyr ? 'selected' : null }, x.navn))));
  boks.appendChild(h('div', { style: 'display:flex;gap:12px;font-size:.76rem;color:var(--color-neutral-600);margin-top:8px;flex-wrap:wrap;font-variant-numeric:tabular-nums' },
    h('span', null, 'Kontakt ', h('b', null, u.kontakt + ' °C')), h('span', null, 'Forvarm ', h('b', null, u.forvarm)), h('span', null, 'Damp: ', h('b', null, u.damp))));
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:6px' }, u.om));
  boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:8px' }, 'Gir stekeprofilen ', h('b', null, r.prof.navn), '. Best til: ' + u.best + '.'));
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
    if (paa) boks.appendChild(h('div', { class: 'varsel' },
      h('b', null, 'To ting glasset ikke tåler: '), 'å settes tilbake i en varm ovn etter at det er blitt kaldt, og å kjøles raskt — legg det aldri i vann eller på en våt benk når du tar det av etter 20 minutter. La det kjøle i luft, eller sett det rett inn igjen mens det er varmt.'));
  }
  return boks;
}
function velgForm(id) { S.form = id; if (!S.stekeProfilManuell) S.stekeProfil = profilForUtstyr(S.utstyr, id); oppdater(); }
const UTSTYR_PROFIL = { stal15: 'brod_kloke', glass: 'brod_glass_stal', glass_stal: 'brod_glass_stal', stopejern: 'brod_gryte', apen: 'brod_apen' };
function profilForUtstyr(utstyrId, formId) {
  // Tidligere ble avlangt + stål tvunget til åpen steking (antatt at ingen gryte
  // tok avlange emner). Med den avlange Pyrexen tar klokke-oppsettet avlange
  // brød fint, så det spesialtilfellet er fjernet.
  return UTSTYR_PROFIL[utstyrId] || 'brod_apen';
}
function startForvalg() { S.brotype = 'grovbrod'; S.grov = 40; S.tid = 'lang'; S.skjerm = 'deigen'; oppdater(); }
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
    saltPct: null, heveplan: null, stekeProfil: null, stekeProfilManuell: false,
    form: STANDARD.form, aktivSteg: 0, byttBekreft: null,
    paramInfo: null, tilleggInfo: null, melInfo: null
  });
  if (bt.antall) S.antall = bt.antall;
  if (bt.vekt) S.vekt = bt.vekt;
  // Preset forutsetter sin egen forferment (ciabatta = biga). Synk den, ellers
  // ville motoren gitt presetet ingen forferment før brukeren slår den på manuelt.
  if (bt.rute === 'preset') {
    const pr = PRESETS.find(p => p.id === id);
    if (pr && pr.forferment) { S.ff = !!pr.forferment.bruk; S.ffType = pr.forferment.type === 'pate' ? 'biga' : pr.forferment.type; }
  }
  oppdater();
}

function stepperRad(label, verdi, felt, min, max, steg) {
  return h('div', { style: 'margin-top:10px' },
    h('div', { class: 'felt-label' }, label),
    h('div', { class: 'stepper' },
      h('button', { onClick: () => { S[felt] = Math.max(min, (S[felt] || 0) - steg); oppdater(); } }, '−'),
      h('input', { type: 'text', inputmode: 'numeric', value: String(verdi),
        onblur: e => { const v = parseFloat(e.target.value.replace(',', '.')); if (!isNaN(v)) S[felt] = Math.min(max, Math.max(min, v)); oppdater(); } }),
      h('button', { onClick: () => { S[felt] = Math.min(max, (S[felt] || 0) + steg); oppdater(); } }, '+')));
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
    const trinn = [0, 10, 25, 40, 60, 80];
    const boks = h('div', { class: 'kort' },
      h('div', { class: 'kort-hode' },
        h('span', { class: 'kort-num', style: 'display:inline' }, '1 · Hvor grovt'),
        h('span', { class: 'h-verdi' }, fmt(bk.pct, 0) + ' % · ' + bk.kort.toLowerCase())),
      h('div', { class: 'piller' }, ...trinn.map(t =>
        h('button', { class: S.grov === t ? 'paa' : '', onClick: () => { S.grov = t; oppdater(); } }, t + ' %'))),
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
    const fav = (S.favoritter || []).includes(m.id);
    // Favoritt vises som egen merkelapp, ikke ★ foran navnet — flere melnavn
    // har allerede ★ i seg (kvalitetsmerke), og to stjerner leste som støy.
    melBoks.appendChild(h('div', { class: 'melrad2' + (i === 0 ? ' forst' : '') },
      h('div', { class: 'm-navn' },
        h('div', { class: 'n' }, m.navn, fav ? h('span', { class: 'fav-pille' }, 'favoritt') : null),
        h('div', { class: 'sub' }, [bidrag, flour.protein != null ? fmt(flour.protein, 1) + ' g protein' : null].filter(Boolean).join(' · '))),
      h('div', { class: 'm-tall' }, h('div', { class: 'g' }, g0(m.gram)), h('div', { class: 'p' }, fmt(m.pct, 0) + ' %')),
      h('button', { class: 'info-ring', 'aria-label': 'Info om ' + m.navn, onClick: () => { S.tilleggInfo = null; S.melInfo = S.melInfo === m.id ? null : m.id; oppdater(); } }, 'ⓘ')));
    if (S.melInfo === m.id && info) {
      const linjer = [];
      if (info.plus) info.plus.forEach(p => linjer.push(['+', p, 'var(--color-accent-2-700)']));
      if (info.minus) info.minus.forEach(p => linjer.push(['−', p, 'var(--color-danger)']));
      if (!linjer.length && flour.notat) linjer.push(['', flour.notat, 'var(--color-neutral-700)']);
      melBoks.appendChild(h('div', { class: 'info-boks' }, ...linjer.map(([l, tk, f]) =>
        h('div', { class: 'info-linje' }, h('span', { class: 'etikett', style: 'flex:0 0 18px;color:' + f }, l), h('span', { class: 'tekst' }, tk)))));
    }
  });
  melBoks.appendChild(h('button', { class: 'btn-ghost', style: 'margin-top:8px', onClick: () => { S.skjerm = 'oppslag'; S.oppslag = 'mel'; oppdater(); } },
    'Se melbiblioteket — fordeler, ulemper og tak ›'));
  wrap.appendChild(melBoks);

  // 3 · Vann (preset låser)
  if (!erPreset) {
    const tak = Math.round(Math.max(72, Math.min(88, 74 + (r.styrkeVektet - 3) * 6)));
    const lab0 = vannMerke(S.hyd);
    const verdiEl = h('span', { class: 'skyver-verdi' }, S.hyd + ' %');
    const merkeEl = h('span', { class: 'skyver-klasse', style: 'background:' + lab0.bg + ';color:' + lab0.farge }, lab0.merke);
    const guideEl = h('div', { class: 'konsekvens' }, vannGuide(S.hyd));
    // Live-oppdatering UNDER draget (oninput) uten full re-render — så tallet og
    // merkelappen følger fingeren. Selve utregningen skjer på slipp (onchange).
    const oppdaterLive = v => {
      verdiEl.textContent = v + ' %';
      const m = vannMerke(v);
      merkeEl.textContent = m.merke;
      merkeEl.setAttribute('style', 'background:' + m.bg + ';color:' + m.farge);
      guideEl.textContent = vannGuide(v);
    };
    const vk = kort('3 · Vann', 'hydrering',
      h('div', { class: 'skyver-topp' }, verdiEl, merkeEl),
      h('input', { type: 'range', class: 'skyver', min: 62, max: 86, step: 1, value: S.hyd,
        oninput: e => oppdaterLive(+e.target.value),
        onchange: e => { S.hyd = +e.target.value; oppdater(); } }),
      h('div', { style: 'font-size:.74rem;color:var(--color-neutral-600);margin-top:2px' }, 'Anbefalt 74 % for et frittstående brød på butikkmel.'),
      guideEl,
      h('div', { style: 'font-size:.78rem;color:var(--color-neutral-600);margin-top:6px;font-variant-numeric:tabular-nums' }, vannKonsekvens(r)),
      infoUtfelling('hydrering'));
    if (S.hyd > tak) vk.appendChild(h('div', { class: 'varsel' },
      'Melblandingen din (vektet styrke ' + fmt(r.styrkeVektet, 1) + ') tåler anslagsvis ' + tak + ' % før deigen flyter ut i stedet for å reise seg. Du ligger ' + (S.hyd - tak) + ' pp over — bruk form, eller bytt inn sterkere mel.'));
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
    wrap.appendChild(kort('7 · Salt', 'saltPct',
      h('div', { class: 'skyver-topp' }, saltVerdiEl, saltMerkeEl),
      h('input', { type: 'range', class: 'skyver', min: 1.4, max: 2.4, step: 0.1, value: saltN,
        oninput: e => {
          const v = +e.target.value;
          saltVerdiEl.textContent = fmt(v, 1) + ' %';
          const m = saltMerke(v);
          saltMerkeEl.textContent = m.merke;
          saltMerkeEl.setAttribute('style', 'background:' + m.bg + ';color:' + m.farge);
        },
        onchange: e => { S.saltPct = +e.target.value; oppdater(); } }),
      h('div', { class: 'konsekvens' }, g0(r.salt) + ' salt. Salt strammer glutenet og bremser gjæren; 1,8–2,0 % er sonen.'),
      infoUtfelling('saltPct')));
  }

  // 8 · Forferment
  wrap.appendChild(tegnForferment(r));
  return wrap;
}

function kort(num, infoId, ...barn) {
  const hode = h('div', { class: 'kort-num' }, num);
  if (infoId) hode.appendChild(h('button', { class: 'info-knapp', 'aria-label': 'Info', onClick: () => toggleInfo(infoId) }, 'ⓘ'));
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
  grupper.forEach(gr => {
    const items = TILLEGG.filter(gr.filt);
    if (!items.length) return;
    const boks = kort(gr.tittel, null);
    items.forEach(t => boks.appendChild(tilleggRad(t, r)));
    wrap.appendChild(boks);
  });
  const komp = tegnKompensasjon(r);
  if (komp) wrap.appendChild(komp);
  return wrap;
}

/* «Hva vil du gjøre med endringen?» — tillegg tar plass i en fast deigvekt, så
   melet faller. Panelet viser hva som faktisk skjedde og tilbyr alternativet:
   øk deigen i stedet, så melmengden blir som uten tillegg. Vannet justeres
   alltid automatisk for det frøene binder. */
function tegnKompensasjon(r) {
  if (!Object.keys(S.tillegg || {}).length) return null;
  const r0 = regn(Object.assign({}, S, { tillegg: {} }));
  const tap = r0.melTotal - r.melTotal;
  if (tap < 1) return null;
  const faktor = r0.melTotal / Math.max(r.melTotal, 1);
  const nyVekt = Math.round(S.vekt * faktor / 10) * 10;
  const boks = kort('Hva vil du gjøre med endringen?', null);
  boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:6px' },
    'Tilleggene tar plass i en fast deigvekt på ', h('b', null, g0(r.totalVekt)), ': melet faller ',
    h('b', null, g0(tap)), ' (fra ' + g0(r0.melTotal) + ' til ' + g0(r.melTotal) + '). Vannet er allerede justert for det frøene binder.'));
  boks.appendChild(h('div', { style: 'display:flex;gap:8px;margin-top:10px' },
    h('button', { class: 'btn', style: 'flex:1;font-size:.8rem;background:var(--color-accent-2-100);border-color:var(--color-accent-2-300)' }, '✓ Behold deigvekten (som nå)'),
    nyVekt > S.vekt ? h('button', { class: 'btn', style: 'flex:1;font-size:.8rem', onClick: () => { S.vekt = nyVekt; oppdater(); } }, 'Øk deigen: ' + nyVekt + ' g/brød') : null));
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:8px' },
    'Å øke deigen gir like mye mel som uten tillegg, men hvert brød blir tyngre. Å beholde vekten gir samme brødstørrelse med litt mindre mel og litt tettere krumme.'));
  return boks;
}
function soakerKorn(id) { const s = SOAKERS.find(x => x.id === id); return s && s.korn; }
function tilleggRad(t, r) {
  const pct = (S.tillegg || {})[t.id] || 0;
  const paa = pct > 0;
  const frr = r.fro.find(f => f.id === t.id);
  const gramV = frr ? frr.gram : 0;
  const erSmak = t.type === 'smak';
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
    ? fmt(pct, 1) + ' % · ' + g0(gramV) + (erSmak ? '' : ' · ' + behandlingOrd(t.id)) + soneOrd
    : 'trykk for å legge til (' + fmt(t.pct, 1) + ' %)';
  const rad = h('div', { class: 'tillegg-rad' + (paa ? ' paa' : '') + sone },
    h('div', { style: 'display:flex;align-items:center;gap:8px' },
      // Trykkbar toggle: av → legg til på anbefalt verdi, på → fjern.
      h('button', { class: 'tillegg-toggle', 'aria-pressed': paa ? 'true' : 'false', onClick: () => togglTillegg(t) },
        h('span', { class: 'tillegg-hake' + (paa ? ' paa' : '') }, paa ? '✓' : '+'),
        h('span', { style: 'flex:1;min-width:0' },
          h('span', { style: 'display:block;font-weight:700;font-size:.9rem' }, t.navn),
          h('span', { style: 'display:block;font-size:.74rem;color:var(--color-neutral-600)' }, status))),
      h('button', { class: 'info-knapp', 'aria-label': 'Info om ' + t.navn, onClick: () => { S.tilleggInfo = S.tilleggInfo === t.id ? null : t.id; oppdater(); } }, 'ⓘ')));
  // Finjustering vises bare når tillegget er PÅ.
  if (paa) rad.appendChild(h('div', { style: 'display:flex;align-items:center;gap:8px;margin-top:8px' },
    h('div', { class: 'stepper', style: 'flex:1' },
      h('button', { 'aria-label': 'Mindre', onClick: () => endreTillegg(t, -(erSmak ? 0.5 : 1)) }, '−'),
      h('input', { type: 'text', inputmode: 'decimal', 'aria-label': t.navn + ' prosent', value: fmt(pct, 1), style: 'font-size:1.05rem',
        onblur: e => { const v = parseFloat(e.target.value.replace(',', '.')); settTillegg(t, isNaN(v) ? 0 : v); } }),
      h('button', { 'aria-label': 'Mer', onClick: () => endreTillegg(t, (erSmak ? 0.5 : 1)) }, '+')),
    h('span', { style: 'font-size:.8rem;color:var(--color-neutral-600);font-weight:800' }, '%'),
    erSmak ? null : h('div', { style: 'display:flex;align-items:center;gap:4px;flex:0 0 auto' },
      h('input', { type: 'text', inputmode: 'numeric', 'aria-label': t.navn + ' gram', value: fmt(gramV, 0),
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
    boks.appendChild(h('div', { class: 'konsekvens', style: 'margin-top:10px' },
      'Tar ', h('b', null, fmt(f.pctMel, 0) + ' %'), ' av melet (', g0(f.mel), ') og modner ', h('b', null, fmtTimer(f.timer)),
      ' ved ', h('b', null, grader(f.temp, 0)), '. Gjærdosen i hoveddeigen faller, og løftet ', h('b', null, (r.loft.tap.ff >= 0 ? '+' : '') + fmt(r.loft.tap.ff, 1)), ' poeng.'));
    boks.appendChild(h('div', { style: 'margin-top:10px' },
      tallrad('Mel', veiG(f.mel)), tallrad('Vann', veiG(f.vann)), tallrad('Gjær (tørr)', veiG(f.gjaer)),
      tallrad('Modning', fmtTimer(f.timer) + ' ved ' + grader(f.temp, 0)), f.salt > 0.05 ? tallrad('Salt', veiG(f.salt)) : null));
    if (underVekt(f.gjaer)) boks.appendChild(h('div', { class: 'varsel' },
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
    'Pluss og minus mot samme brød uten tillegget. Streken i midten er normalen (0).'));
  rader.forEach(rad => boks.appendChild(h('div', { style: 'margin-top:10px' },
    h('div', { style: 'font-weight:700;font-size:.86rem;margin-bottom:4px' }, rad.navn),
    ...rad.verdier.map(([lab, v, skala]) => deltaRad(lab, v, skala)),
    h('div', { style: 'font-size:.64rem;color:var(--color-neutral-500);margin-top:4px' }, 'Kilde: ' + rad.kilde))));
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

/* ---------- Redigerbar heveplan + «løs for» ---------- */
function basePlan() {
  const tp = TIDSPLANER.find(t => t.id === S.tid) || TIDSPLANER[0];
  return (Array.isArray(S.heveplan) && S.heveplan.length ? S.heveplan : tp.plan).map(s => ({ ...s }));
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
  // Rommet deigen faktisk skal stå i — «Rommet ditt»-knappen per trinn bruker
  // denne, så du slipper å taste temperatur i hvert felt.
  const rt = S.romTemp || 22;
  boks.appendChild(miniStepper('Romtemp der deigen hever', rt, 'romTemp', 14, 30, 0.5, ' °C'));
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:4px' },
    'Sett temperaturen i rommet deigen skal stå i, og merk trinn som skal i kjøleskapet (4 °C). Gjærmengden løses om automatisk.'));
  trinn.forEach((tr, i) => {
    const kaldt = tr.miljo <= KALDGRENSE_APP;
    boks.appendChild(h('div', { style: 'border-top:1px solid var(--color-neutral-200);padding:9px 0' },
      h('div', { style: 'display:flex;align-items:center;gap:8px' },
        h('span', { class: 'pille', style: kaldt ? 'background:var(--color-accent-2-100);color:var(--color-accent-2-700)' : 'background:var(--color-accent-100);color:var(--color-accent-700)' }, kaldt ? 'kaldt' : 'varmt'),
        h('input', { type: 'text', value: tr.navn, 'aria-label': 'Trinnnavn', style: 'flex:1;border:none;background:none;font:inherit;font-weight:700;font-size:.86rem;min-width:0', onblur: e => redigerTrinn(i, 'navn', e.target.value) }),
        trinn.length > 1 ? h('button', { class: 'info-knapp', 'aria-label': 'Fjern trinn', onClick: () => fjernTrinn(i) }, '×') : null),
      h('div', { style: 'display:flex;gap:8px;margin-top:6px' },
        trinnFelt('Timer', tr.timer, 't', v => redigerTrinn(i, 'timer', v)),
        trinnFelt('Miljø', tr.miljo, '°C', v => redigerTrinn(i, 'miljo', v))),
      // Hurtigvalg for hvor deigen står: kjøleskapet eller rommet ditt.
      h('div', { class: 'piller', style: 'margin-top:6px' },
        h('button', { class: Math.abs(tr.miljo - 4) < 0.6 ? 'paa' : '', style: 'font-size:.78rem', onClick: () => redigerTrinn(i, 'miljo', 4) }, 'Kjøleskap 4°'),
        h('button', { class: Math.abs(tr.miljo - rt) < 0.3 ? 'paa' : '', style: 'font-size:.78rem', onClick: () => redigerTrinn(i, 'miljo', rt) }, 'Rommet ditt ' + fmt(rt, 0) + '°')),
      // Eksplisitt utbakt-toggle: styrer om emnet er formet (kjøles som ett emne,
      // uten lokk) — en modellforskjell som ikke kan avledes av temperaturen alene.
      h('label', { style: 'display:flex;align-items:center;gap:8px;margin-top:8px;font-size:.78rem;color:var(--color-neutral-700);cursor:pointer' },
        h('input', { type: 'checkbox', checked: tr.utbakt ? 'checked' : null, style: 'width:20px;height:20px;accent-color:var(--color-accent-500)',
          onchange: e => redigerTrinn(i, 'utbakt', e.target.checked) }),
        'Utbakt i hevekurv (formet emne, ikke bulk i boks)')));
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
      h('input', { type: 'text', inputmode: 'decimal', 'aria-label': lab, value: fmt(val, 1),
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
  const dbl = (typeof doublingInterval === 'function') ? doublingInterval(S.startTemp || 24) : null;
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:8px' },
    'Relativt til 24 °C (×1,00). ' + (dbl ? 'Fra ' + grader(S.startTemp || 24, 0) + ' må du ' + fmt(dbl, 1) + ' °C opp for å doble farten.' : 'Du er nær eller over optimum — mer varme dobler ikke lenger.')));
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
function grovKonsekvens(r) {
  const g = S.grov, t = Math.round(r.loft.tap.grov);
  if (g < 6) return 'Ren siktet hvete: maksimal glutenstyrke og maksimalt ovnsløft, minst smak.';
  if (g <= 26) return 'Fint band. Tydelig mer smak til nesten ingen krummekostnad — det best dokumenterte byttet som finnes.';
  if (g <= 51) return 'Halvgrovt. Her begynner kliens skarpe kanter å kutte glutentrådene: koster ca. ' + t + ' løftpoeng. Vurder form framfor frittstående.';
  if (g <= 76) return 'Grovt etter norsk standard. Koster ca. ' + t + ' løftpoeng — form er det trygge valget, mer vann trengs.';
  return 'Ekstra grovt. Bare ' + fmt(100 - g, 0) + ' % siktet mel å bygge nettverk av: formbrød, tett og saftig krumme framfor hull.';
}
/* Saltsonen er 1,8–2,0 % (samme tall som konsekvensteksten under skyveren). */
function saltMerke(v) {
  if (v >= 1.8 && v <= 2.0) return { merke: 'I SONEN', bg: 'var(--color-accent-2-100)', farge: 'var(--color-accent-2-700)' };
  if (v >= 1.6 && v <= 2.2) return { merke: 'UTENFOR SONEN', bg: '#f6ecd2', farge: '#7a5a12' };
  return { merke: 'LANGT UTENFOR', bg: '#f6ddd6', farge: 'var(--color-danger)' };
}
function vannMerke(hyd) {
  if (hyd <= 68) return { merke: 'STRAMT', bg: 'var(--color-neutral-200)', farge: 'var(--color-neutral-700)' };
  if (hyd <= 71) return { merke: 'TRYGT', bg: 'var(--color-accent-2-100)', farge: 'var(--color-accent-2-700)' };
  if (hyd <= 77) return { merke: 'I VINDUET', bg: 'var(--color-accent-2-200)', farge: 'var(--color-accent-2-900)' };
  if (hyd <= 82) return { merke: 'LØST', bg: 'var(--color-accent-200)', farge: 'var(--color-accent-900)' };
  return { merke: 'OVER TAKET', bg: 'var(--color-accent-300)', farge: 'var(--color-accent-900)' };
}
function vannGuide(hyd) {
  if (hyd <= 68) return 'Stramt: fast deig som er lett å håndtere og forme, men tettere krumme med mindre uregelmessige hull. Trygt for nybegynnere og grovt mel.';
  if (hyd <= 71) return 'Trygt: deigen holder formen godt, gir jevn krumme og reiser seg villig. Et godt utgangspunkt før du skrur oppover.';
  if (hyd <= 77) return 'I vinduet: her ligger de fleste frittstående hveitebrød — åpen, saftig krumme uten at deigen flyter ut. Krever litt stø hånd i formingen.';
  if (hyd <= 82) return 'Løst: våt, klissete deig som gir stor, hullete krumme og sprø skorpe — men den vil helst støttes av form eller kurv, og trenger sterkt mel.';
  return 'Over taket: svært våt deig som flyter ut om ikke melet er sterkt nok. Bruk form, brett ofte under heving, og regn med tettere bunn.';
}
function vannKonsekvens(r) {
  const froPp = (r.oppgittHydrering - r.effektivHydrering) * 100;
  let s = 'Effektiv hydrering ' + pst(r.effektivHydrering * 100, 1) + ' etter at frøene har tatt sitt.';
  if (froPp > 1.5) s += ' Frøene stjeler ' + fmt(froPp, 1) + ' prosentpoeng — kompenser med litt mer vann om deigen kjennes stram.';
  return s;
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
    h('button', { class: S.tidModus !== 'start' ? 'paa' : '', onClick: () => { S.tidModus = 'ferdig'; oppdater(); } }, 'Ferdig ' + ukedagKort(ferdigMs) + ' ' + klHM(ferdigMs)),
    // «Start nå» ankrer kjeden til NÅ: ferdig settes til nå + total tid. Uten
    // dette viste den bare starttiden som fulgte av gammelt ferdigtidspunkt —
    // og nå-markøren i grafen hadde ingenting ekte å peke på.
    h('button', { class: S.tidModus === 'start' ? 'paa' : '', onClick: () => { S.tidModus = 'start'; S.ferdigMs = Date.now() + K.totalT * 3600000; oppdater(); } }, 'Start nå')));
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
  if (!erStart) kort1.appendChild(h('div', { style: 'margin-top:10px' },
    h('div', { class: 'felt-label' }, 'Eller velg dato og klokkeslett ferdig'),
    h('input', { type: 'datetime-local', class: 'dato-inp', 'aria-label': 'Dato og klokkeslett ferdig',
      value: tilDatoLokal(ferdigMs),
      onchange: e => { const t = new Date(e.target.value).getTime(); if (isFinite(t)) { S.ferdigMs = t; oppdater(); } } })));

  // Start → ferdig, alltid begge ender med ukedag og dato, så det er tydelig
  // hvilket døgn du starter og hvilket du er ferdig (baken går over døgnskiller).
  const forsteNavn = (K[0] && K[0].navn) ? K[0].navn.toLowerCase() : 'første steg';
  const spenn = dagSpenn(startMs, ferdigMs);
  const oppsum = h('div', { class: 'tid-oppsum' },
    h('div', { class: 'tid-rad' },
      h('span', { class: 'tid-merke start' }, 'STARTER'),
      h('div', { class: 'tid-tekst' },
        h('div', { class: 'd' }, klDato(startMs)),
        h('div', { class: 's' }, 'du begynner: ' + forsteNavn))),
    h('div', { class: 'tid-strek' }, h('span', null, '↓ ' + fmt(K.totalT, 1) + ' t fra start til avkjølt brød')),
    h('div', { class: 'tid-rad' },
      h('span', { class: 'tid-merke ferdig' }, 'UT AV OVNEN'),
      h('div', { class: 'tid-tekst' },
        h('div', { class: 'd' }, klDato(ferdigMs)),
        h('div', { class: 's' }, 'brødet er stekt og skal kjøle'))));
  if (spenn >= 1) oppsum.appendChild(h('div', { class: 'tid-doegn' },
    spenn === 1 ? 'Baken går over natta — du starter ' + ukedagKort(startMs) + ' og er ferdig ' + ukedagKort(ferdigMs) + '.'
      : 'Baken går over ' + spenn + ' døgn — du starter ' + ukedagKort(startMs) + ' og er ferdig ' + ukedagKort(ferdigMs) + '.'));
  kort1.appendChild(oppsum);
  wrap.appendChild(kort1);

  // Plan-kort
  TIDSPLANER.forEach(tp => {
    const paa = tp.id === S.tid;
    const fv = paa ? { prov: r, pK: K } : planForhaandsvis(tp.id, ferdigMs);
    const prov = fv.prov, pK = fv.pK;
    // Etiketten leses fra EFFEKTIV tilstand (samme kilde som tallene), ikke fra
    // planens statiske forferment-spec (teknisk #5).
    const sub = (prov.ffPaa ? prov.ffT.navn.toLowerCase() + ' ' + prov.ffInn.pctMel + ' %' : 'ingen forferment') +
      ' · gjær ' + fmt(prov.gjaerTorr, 3) + ' % = ' + fmt(prov.gjaerTotal, 2) + ' g';
    wrap.appendChild(h('button', { class: 'valgkort plan-valg' + (paa ? ' paa' : ''), onClick: () => { S.tid = tp.id; S.heveplan = null; oppdater(); } },
      h('div', { class: 'plankort' },
        h('div', { style: 'flex:1;min-width:0' },
          h('div', null, h('span', { class: 'p-navn' }, tp.navn), h('span', { class: 'p-tid' }, fmt(pK.totalT, 1) + ' t')),
          h('div', { class: 'p-sub' }, sub)),
        h('div', { class: 'p-loft' }, h('div', { class: 'v' }, String(prov.loft.loft)), h('div', { class: 'l' }, 'LØFT')))));
  });

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
      ' og ', h('b', null, (S.eltMin || 13) + ' min'), ' elting: bruk vann på ', h('b', null, grader(r.vannTemp, 1)), '.',
      r.wh < 3 ? ' Arbeidet er under målsonen (3–5 Wh/kg) — elt lengre for åpnere krumme.' : r.wh > 8.3 ? ' Over metning (8,3 Wh/kg) — mer elting gir ikke mer nettverk.' : ' Arbeidet er i målsonen 3–5 Wh/kg.'),
    isRad(r),
    h('div', { style: 'margin-top:10px' },
      miniStepper('Ønsket deigtemp', S.startTemp || 24, 'startTemp', 18, 30, 0.5, ' °C'),
      miniStepper('Meltemperatur', S.melTemp || 21, 'melTemp', 4, 30, 1, ' °C'),
      miniStepper('Eltetid', S.eltMin || 13, 'eltMin', 3, 25, 1, ' min')),
    h('div', { style: 'margin-top:10px' },
      h('div', { class: 'felt-label' }, 'Maskin'),
      h('div', { class: 'piller', style: 'flex-wrap:wrap' }, ...['hand', 'planet', 'spiralHjemme', 'spiralProff', 'egen'].map(id =>
        h('button', { class: (S.maskin || 'spiralHjemme') === id ? 'paa' : '', style: 'flex:1 1 45%;font-size:.78rem', onClick: () => { S.maskin = id; oppdater(); } }, MASKIN_INFO[id].navn))),
      S.maskin === 'egen' ? h('div', { style: 'margin-top:8px' },
        miniStepper('Din friksjon (°C per min)', S.egenFriksjon || 0.4, 'egenFriksjon', 0.05, 2, 0.05, '')) : null,
      maskinInfoPanel(r)));
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
      gjaeringsGraf(pts, r, bulkStart, visNaa),
      h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;font-size:.7rem;color:var(--color-neutral-600)' },
        legendePrikk('var(--color-accent-2-500)', 'Akkumulert gjæring (høyre)'),
        legendePrikk('var(--color-neutral-500)', 'Deigtemp (venstre)'),
        legendePrikk('var(--color-accent-500)', 'Gjæringsfart'),
        legendePrikk('var(--color-accent-2-700)', 'Halvveis'),
        visNaa ? legendePrikk('var(--color-danger)', 'Nå') : null),
      h('div', { style: 'font-size:.72rem;color:var(--color-neutral-600);margin-top:8px;line-height:1.45' },
        'Arealet under fartskurven er dosen. Grønne bånd er kald heving (≤ 12 °C), varme bånd romtemperatur — se hvordan farten stuper i kulda og skyter fart igjen når deigen tempereres.')));
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
function miniStepper(label, verdi, felt, min, max, steg, enhet) {
  return h('div', { style: 'display:flex;align-items:center;gap:10px;margin-top:6px' },
    h('div', { class: 'felt-label', style: 'flex:1' }, label),
    h('div', { class: 'stepper', style: 'width:160px' },
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
function maskinInfoPanel(r) {
  const mid = S.maskin || 'spiralHjemme';
  const info = (typeof MASKIN_INFO !== 'undefined') && MASKIN_INFO[mid];
  if (!info) return null;
  const min = S.eltMin || 13;
  const frik = mid === 'egen' ? (S.egenFriksjon || 0.4) : info.friksjon;
  const sone = r.wh < 3 ? ['under målsonen', 'var(--color-accent-700)'] : r.wh > 8.3 ? ['over metning', 'var(--color-danger)'] : ['i målsonen', 'var(--color-accent-2-700)'];

  const panel = h('div', { class: 'maskin-info' },
    h('div', { class: 'mi-topp' },
      h('b', null, info.navn),
      h('span', { class: 'mi-frik' }, mid === 'egen' ? 'målt ' + fmt(frik, 2) + ' °C/min' : fmt(frik, 2) + ' °C/min')),
    h('div', { class: 'mi-hva' }, info.hva),
    h('div', { class: 'mi-hva', style: 'margin-top:4px' }, info.tid),
    info.fart ? h('div', { class: 'mi-hva', style: 'margin-top:4px' }, h('b', null, 'Hastighet: '), info.fart) : null,
    // Den levende utregningen — samme tall som varmebalansen bruker.
    h('div', { class: 'mi-regn' },
      h('span', null, fmt(frik, 2), ' °C/min × ', String(min), ' min = '),
      h('b', null, '+' + fmt(r.friksjon, 1) + ' °C'),
      h('span', null, ' → ÷ 1,29 = '),
      h('b', { style: 'color:' + sone[1] }, fmt(r.wh, 1) + ' Wh/kg'),
      h('span', { style: 'color:' + sone[1] }, ' (' + sone[0] + ')')),
    h('div', { class: 'mi-note' }, info.note));

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
function gjaeringsGraf(pts, r, bulkStart, visNaa) {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 360, H = 210;
  const pad = { l: 30, r: 30, t: 30, b: 30 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const trinn = r.planTrinn || [];
  const totalT = pts[pts.length - 1].t || 1;
  const doseMax = pts[pts.length - 1].dose || 1;
  const fartMax = Math.max(...pts.map(p => p.fart), 1e-6);
  const tempMax = Math.max(30, Math.ceil(Math.max(...pts.map(p => p.temp)) / 5) * 5);
  const X = t => pad.l + t / totalT * iW;
  const Yt = v => pad.t + (1 - v / tempMax) * iH;   // temperatur 0..tempMax (venstre)
  const Yd = f => pad.t + (1 - f) * iH;             // gjæringsandel 0..1 (høyre)
  const startMs = bulkStart ? bulkStart.getTime() : Date.now();
  const klAv = t => klHM(startMs + t * 3600000);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const n = v => v.toFixed(1);
  let s = '';

  // Fasebånd med navn, tid og temperatur — kald heving (≤12 °C) i grønt, varm i terrakotta.
  let acc = 0;
  trinn.forEach((tr, i) => {
    const x0 = X(acc), x1 = X(acc + (tr.timer || 0)), br = x1 - x0;
    const kald = tr.miljo <= 12;
    s += `<rect x="${n(x0)}" y="${pad.t}" width="${n(br)}" height="${iH}" fill="${kald ? 'var(--color-accent-2-500)' : 'var(--color-accent-500)'}" opacity="${i % 2 ? 0.06 : 0.11}"/>`;
    if (i > 0) s += `<line x1="${n(x0)}" y1="${pad.t}" x2="${n(x0)}" y2="${pad.t + iH}" stroke="var(--color-neutral-300)" stroke-dasharray="3 3"/>`;
    if (br > 42) {
      const midt = n((x0 + x1) / 2);
      s += `<text x="${midt}" y="${pad.t - 15}" fill="var(--color-neutral-700)" font-size="9.5" font-weight="700" text-anchor="middle">${esc(tr.navn)}</text>`;
      s += `<text x="${midt}" y="${pad.t - 5}" fill="var(--color-neutral-500)" font-size="8.5" text-anchor="middle">${fmt(tr.timer, tr.timer < 10 ? 1 : 0)} t · ${fmt(tr.miljo, 0)}°</text>`;
    }
    acc += tr.timer || 0;
  });

  // Vannrett rutenett + temperaturakse (venstre).
  for (let v = 0; v <= tempMax; v += 10) {
    s += `<line x1="${pad.l}" y1="${n(Yt(v))}" x2="${pad.l + iW}" y2="${n(Yt(v))}" stroke="var(--color-neutral-200)"/>`;
    s += `<text x="${pad.l - 5}" y="${n(Yt(v) + 3)}" fill="var(--color-neutral-500)" font-size="8.5" text-anchor="end">${v}°</text>`;
  }
  // Gjæringsakse (høyre): 0 / 50 / 100 %.
  [0, 50, 100].forEach(p => s += `<text x="${pad.l + iW + 5}" y="${n(Yd(p / 100) + 3)}" fill="var(--color-neutral-500)" font-size="8.5">${p}%</text>`);

  // Gjæringsfart som areal — arealet under kurven ER dosen.
  let area = `M ${n(X(0))} ${n(pad.t + iH)}`;
  pts.forEach(p => area += ` L ${n(X(p.t))} ${n(pad.t + iH - (p.fart / fartMax) * iH * 0.5)}`);
  area += ` L ${n(X(totalT))} ${n(pad.t + iH)} Z`;
  s += `<path d="${area}" fill="var(--color-accent-500)" opacity="0.18"/>`;

  // Akkumulert dose (hovedkurven, høyre akse).
  let dl = ''; pts.forEach((p, i) => dl += `${i ? 'L' : 'M'} ${n(X(p.t))} ${n(Yd(p.dose / doseMax))} `);
  s += `<path d="${dl}" fill="none" stroke="var(--color-accent-2-500)" stroke-width="2.6"/>`;

  // Deigtemperatur (venstre akse, stiplet).
  let tl = ''; pts.forEach((p, i) => tl += `${i ? 'L' : 'M'} ${n(X(p.t))} ${n(Yt(p.temp))} `);
  s += `<path d="${tl}" fill="none" stroke="var(--color-neutral-500)" stroke-width="1.6" stroke-dasharray="5 3"/>`;

  // Halvveismerke — når er 50 % av gjæringen gjort?
  const halv = pts.find(p => p.dose >= doseMax * 0.5);
  if (halv) {
    s += `<line x1="${n(X(halv.t))}" y1="${pad.t}" x2="${n(X(halv.t))}" y2="${pad.t + iH}" stroke="var(--color-accent-2-700)" stroke-width="1" stroke-dasharray="2 3"/>`;
    s += `<circle cx="${n(X(halv.t))}" cy="${n(Yd(0.5))}" r="3.4" fill="var(--color-accent-2-700)"/>`;
    const ank = X(halv.t) > pad.l + iW - 88 ? 'end' : 'start', dx = ank === 'end' ? -6 : 6;
    s += `<text x="${n(X(halv.t) + dx)}" y="${n(Yd(0.5) - 6)}" fill="var(--color-accent-2-700)" font-size="8.5" font-weight="700" text-anchor="${ank}">halvveis ${klAv(halv.t)}</text>`;
  }

  // «Nå»-markør — bare når prosessen er startet OG vi står inne i vinduet.
  const naaT = (Date.now() - startMs) / 3600000;
  if (visNaa && naaT > 0.02 && naaT < totalT) {
    s += `<line x1="${n(X(naaT))}" y1="${pad.t - 2}" x2="${n(X(naaT))}" y2="${pad.t + iH}" stroke="var(--color-danger)" stroke-width="1.4"/>`;
    s += `<circle cx="${n(X(naaT))}" cy="${pad.t - 2}" r="2.6" fill="var(--color-danger)"/>`;
    s += `<text x="${n(X(naaT))}" y="${pad.t - 20}" fill="var(--color-danger)" font-size="8.5" font-weight="800" text-anchor="middle">nå</text>`;
  }

  // X-akse med klokkeslett.
  s += `<line x1="${pad.l}" y1="${pad.t + iH}" x2="${pad.l + iW}" y2="${pad.t + iH}" stroke="var(--color-neutral-400)"/>`;
  const steg = totalT <= 8 ? 2 : totalT <= 18 ? 4 : totalT <= 30 ? 6 : 8;
  for (let t = 0; t <= totalT + 0.01; t += steg) {
    s += `<line x1="${n(X(t))}" y1="${pad.t + iH}" x2="${n(X(t))}" y2="${pad.t + iH + 4}" stroke="var(--color-neutral-400)"/>`;
    s += `<text x="${n(X(t))}" y="${pad.t + iH + 15}" fill="var(--color-neutral-500)" font-size="8.5" text-anchor="middle">${klAv(t)}</text>`;
  }
  // Aksetitler.
  s += `<text x="${pad.l - 5}" y="${pad.t - 6}" fill="var(--color-neutral-500)" font-size="8" text-anchor="end">°C</text>`;
  s += `<text x="${pad.l + iW + 5}" y="${pad.t - 6}" fill="var(--color-accent-2-700)" font-size="8">gjær</text>`;

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
  const sig = JSON.stringify([S.brotype, S.grov, S.hyd, S.ff, S.ffType, S.tillegg, S.antall, S.vekt,
    S.startTemp, S.saltPct, S.lokk, S.fulltKjol, S.heveplan, S.stekeProfil, ferdigMs]);
  if (_planMemo.sig !== sig) _planMemo = { sig, data: {} };
  if (!_planMemo.data[tpId]) {
    const prov = regn(Object.assign({}, S, { tid: tpId }));
    const pK = kjede(Object.assign({}, S, { tid: tpId }), prov, ferdigMs);
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
/* Full dato med ukedag — baken går over døgnskiller, så «17:00» alene sier ikke
   hvilken dag. «fredag 31. juli, 17:00». */
function klDato(ms) {
  const dag = new Date(ms).toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
  return dag.charAt(0).toUpperCase() + dag.slice(1) + ', kl. ' + klHM(ms);
}
function ukedagKort(ms) { return new Date(ms).toLocaleDateString('nb-NO', { weekday: 'short' }).replace(/\.$/, ''); }
/* Antall døgnskiller mellom to tidspunkt (0 = samme dag). */
function dagSpenn(startMs, sluttMs) {
  const a = new Date(startMs); a.setHours(0, 0, 0, 0);
  const b = new Date(sluttMs); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function flyttFerdig(min) {
  const base = S.ferdigMs != null ? S.ferdigMs : standardFerdig();
  S.ferdigMs = base + min * 60000; oppdater();
}

/* ============================================================
   4 · PROSESS
   ============================================================ */
function tegnProsess(r, K) {
  const wrap = h('div');
  const i = Math.min(S.aktivSteg, K.length - 1);
  wrap.appendChild(h('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:12px' },
    h('div', { class: 'framdrift', style: 'flex:1;margin:0' }, ...K.map((s, j) =>
      h('div', { class: 'prikk' + (j < i ? ' gjort' : j === i ? ' naa' : '') }))),
    h('div', { style: 'font-size:.72rem;color:var(--color-neutral-600);white-space:nowrap;font-variant-numeric:tabular-nums' }, 'steg ' + (i + 1) + ' av ' + K.length)));

  wrap.appendChild(stegKort(K[i], 'I GANG'));

  wrap.appendChild(h('div', { style: 'display:flex;gap:8px;margin:6px 0 14px' },
    h('button', { class: 'btn', style: 'flex:1', disabled: i === 0 ? '' : null, onClick: () => { S.aktivSteg = Math.max(0, i - 1); oppdater(); } }, '‹ Forrige'),
    h('button', { class: 'btn btn-primary', style: 'flex:1', disabled: i === K.length - 1 ? '' : null, onClick: () => { S.aktivSteg = Math.min(K.length - 1, i + 1); oppdater(); } }, 'Neste ›')));

  wrap.appendChild(h('div', { class: 'seksjonstittel' }, 'Hele prosessen · totalt ' + fmt(K.totalT, 1) + ' t'));
  K.forEach((s, j) => wrap.appendChild(h('button', { class: 'valgkort' + (j === i ? ' paa' : ''), style: 'min-height:48px', onClick: () => { S.aktivSteg = j; oppdater(); } },
    h('span', { style: 'flex:0 0 24px;height:24px;border-radius:999px;display:grid;place-items:center;font-size:.72rem;font-weight:800;' + (j < i ? 'background:var(--color-accent-2-500);color:#fff' : 'background:var(--color-neutral-200)') }, j < i ? '✓' : String(j + 1)),
    h('span', { style: 'flex:1;font-size:.86rem;font-weight:600' }, s.navn),
    h('span', { style: 'font-size:.74rem;color:var(--color-neutral-600);font-variant-numeric:tabular-nums' }, klokke(s.tid)))));

  // Handleliste — dette må være i huset
  wrap.appendChild(tegnHandleliste(r));
  return wrap;
}
function tegnHandleliste(r) {
  const d = h('details', { class: 'kort', style: 'padding:0' });
  d.appendChild(h('summary', { style: 'padding:14px 16px;cursor:pointer;font-weight:800;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;color:var(--color-neutral-600);list-style:none' }, 'Dette må være i huset ▾'));
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
  d.appendChild(kropp);
  return d;
}
function stegKort(steg, status) {
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
  if (steg.tall && steg.tall.length) kropp.appendChild(h('div', { style: 'margin-top:8px' }, ...steg.tall.map(([k, v]) => h('div', { class: 'tallrad' }, h('span', null, k), h('b', null, v)))));
  if (steg.gjor) kropp.appendChild(h('div', { class: 'instruks' }, h('span', { class: 'lab' }, 'Slik gjør du'), steg.gjor));
  if (steg.sjekk) kropp.appendChild(h('div', { class: 'instruks sjekk' }, h('span', { class: 'lab' }, 'Sjekk'), steg.sjekk));
  const pilleBg = status === 'I GANG' ? 'background:var(--color-accent-2-100);color:var(--color-accent-2-700)' : 'background:var(--color-neutral-200);color:var(--color-neutral-700)';
  return h('div', { class: 'stegkort ' + (steg.tone || 'noytral') },
    h('div', { style: 'display:flex;align-items:center;padding:14px 16px 2px' },
      status ? h('span', { class: 'pille', style: pilleBg }, status) : null,
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
      oninput: e => { S.lgNavn = e.target.value; } }),
    h('div', { style: 'display:flex;align-items:center;gap:12px;margin-top:4px' },
      h('div', { class: 'felt-label', style: 'flex:1' }, 'Karakter'),
      h('div', { class: 'stepper', style: 'width:170px' },
        h('button', { onClick: () => { S.lgKar = Math.max(1, S.lgKar - 1); oppdater(); } }, '−'),
        h('input', { type: 'text', inputmode: 'numeric', value: String(S.lgKar), onblur: e => { const v = parseInt(e.target.value); if (!isNaN(v)) S.lgKar = Math.min(10, Math.max(1, v)); oppdater(); } }),
        h('button', { onClick: () => { S.lgKar = Math.min(10, S.lgKar + 1); oppdater(); } }, '+'))));
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
  wrap.appendChild(form);

  if (!S.loggListe.length) {
    wrap.appendChild(h('div', { class: 'tomkort', style: 'margin-top:12px' },
      h('div', { class: 'hjelpetekst' }, 'Ingen bak logget ennå. Referansen appen måler mot kommer fra forvalget til du lagrer ditt første bak — da får avvikstallene et ekte anker.')));
  } else {
    wrap.appendChild(h('div', { class: 'seksjonstittel' }, 'Tidligere bak'));
    // Nyeste først, men med den EKTE indeksen i behold — reverse() på en kopi
    // ville gitt feil rad ved rediger/slett.
    for (let i = S.loggListe.length - 1; i >= 0; i--) wrap.appendChild(loggPost(S.loggListe[i], i));
  }
  const konto = tegnKonto();
  if (konto) wrap.appendChild(konto);
  wrap.appendChild(tegnBackup());
  return wrap;
}
function lagreBak(r) {
  S.loggListe = S.loggListe.concat([{
    id: 'b' + Date.now(),
    navn: S.lgNavn || ('Bak #' + (S.loggListe.length + 1)),
    kar: S.lgKar, dato: new Date().toLocaleDateString('nb-NO'),
    grov: fmt(r.brodskala.pct, 0), hyd: fmt(r.hyd * 100, 0), loft: r.loft.loft, dose: fmt(r.doseProfil.dose, 2),
    bilder: (S.lgBilder || []).slice()
  }]);
  S.lgNavn = ''; S.lgBilder = [];
  oppdater();
}

/* ---------- Én post i bakeloggen: vis, rediger eller bekreft sletting ----------
   `i` er den EKTE indeksen i S.loggListe. Redigering identifiseres likevel på
   `id`, ikke indeks, så en synk fra skyen midt i redigeringen ikke flytter deg
   over på en annen post. */
function loggPost(b, i) {
  if (S.lgSlett === b.id) return loggSlettBekreft(b, i);
  if (S.lgRediger === b.id) return loggRediger(b, i);
  const kortEl = h('div', { class: 'kort' },
    h('div', { style: 'display:flex;align-items:baseline;gap:8px' },
      h('span', { style: 'font-family:var(--font-heading);font-size:1.05rem;flex:1;min-width:0' }, b.navn || 'Uten navn'),
      h('span', { class: 'badge' }, b.kar + ' / 10'),
      h('span', { style: 'font-size:.74rem;color:var(--color-neutral-600);white-space:nowrap' }, b.dato)),
    h('div', { style: 'font-size:.8rem;color:var(--color-neutral-700);margin-top:4px;font-variant-numeric:tabular-nums' },
      b.grov + ' % grovt · ' + b.hyd + ' % vann · løft ' + b.loft + ' · dose ' + b.dose));
  if (b.notat) kortEl.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:6px' }, b.notat));
  if (b.bilder && b.bilder.length) kortEl.appendChild(h('div', { class: 'logg-bilder' },
    ...b.bilder.map((src, j) => h('button', { class: 'logg-bilde', 'aria-label': 'Vis bilde ' + (j + 1) + ' i stort format',
      onClick: () => { S.bildeVis = { id: b.id, i: j }; oppdater(); } },
      h('img', { src, alt: 'Bilde ' + (j + 1) + ' av ' + (b.navn || 'baket') })))));
  kortEl.appendChild(h('div', { style: 'display:flex;gap:8px;margin-top:10px' },
    h('button', { class: 'btn-ghost', style: 'font-size:.78rem;padding:4px 0', onClick: () => { S.lgRediger = b.id; S.lgSlett = null; oppdater(); } }, 'Rediger'),
    h('button', { class: 'btn-ghost', style: 'font-size:.78rem;padding:4px 0;margin-left:auto;color:var(--color-danger)', onClick: () => { S.lgSlett = b.id; S.lgRediger = null; oppdater(); } }, 'Slett')));
  return kortEl;
}
function loggSlettBekreft(b, i) {
  return h('div', { class: 'kort' },
    h('div', { style: 'font-weight:800;font-size:.9rem' }, 'Slette «' + (b.navn || 'Uten navn') + '»?'),
    h('div', { class: 'hjelpetekst', style: 'margin-top:4px' },
      'Posten og eventuelle bilder forsvinner for godt' + (b.bilder && b.bilder.length ? ' (' + b.bilder.length + (b.bilder.length === 1 ? ' bilde' : ' bilder') + ')' : '') + '. Dette kan ikke angres.'),
    h('div', { style: 'display:flex;gap:8px;margin-top:10px' },
      h('button', { class: 'btn', style: 'flex:1;font-size:.82rem;background:var(--color-danger);color:#fff;border-color:transparent',
        onClick: () => { S.loggListe = S.loggListe.filter((_, j) => j !== i); S.lgSlett = null; oppdater(); } }, 'Ja, slett'),
      h('button', { class: 'btn', style: 'flex:1;font-size:.82rem', onClick: () => { S.lgSlett = null; oppdater(); } }, 'Avbryt')));
}
/* Redigerbart er det du selv har skrevet: navn, karakter, notat og bilder.
   Tallene under (dose, hydrering, løft) er MÅLT fra baket og skal ikke kunne
   endres i ettertid — da ville loggen sluttet å være et ærlig referansepunkt. */
function loggRediger(b, i) {
  const settFelt = (felt, verdi) => {
    const liste = S.loggListe.slice();
    liste[i] = Object.assign({}, liste[i], { [felt]: verdi });
    S.loggListe = liste;
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
    h('textarea', { class: 'sok', rows: 2, style: 'border-radius:14px;resize:vertical', 'data-fokus': 'lgnotat',
      placeholder: 'F.eks. for tett krumme, prøv 3 pp mer vann', value: b.notat || '',
      oninput: e => settFelt('notat', e.target.value) }),
    h('div', { class: 'felt-label' }, 'Bilder'));
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
  boks.appendChild(h('div', { style: 'font-size:.7rem;color:var(--color-neutral-500);margin-top:8px' },
    'Endringene lagres mens du skriver. Måletallene (dose, hydrering, løft) kan ikke endres — de er hentet fra baket slik det faktisk var.'));
  return boks;
}

/* ---------- Bildet i stort format ----------
   Ligger inne i #telefon (som klipper alt annet), over bunnmenyen. Trykk hvor
   som helst, Esc eller ✕ lukker; piler bytter bilde når posten har flere. */
function tegnBildeVis() {
  const gml = byId('bildevis'); if (gml) gml.remove();
  if (!S.bildeVis) return;
  const post = S.loggListe.find(b => b.id === S.bildeVis.id);
  const bilder = (post && post.bilder) || [];
  if (!bilder.length) { S.bildeVis = null; return; }
  const idx = Math.max(0, Math.min(S.bildeVis.i, bilder.length - 1));
  const bytt = d => { S.bildeVis = { id: S.bildeVis.id, i: (idx + d + bilder.length) % bilder.length }; oppdater(); };
  const stopp = e => e.stopPropagation();
  const lag = h('div', { class: 'bildevis', id: 'bildevis', role: 'dialog', 'aria-label': 'Bilde i stort format',
    onClick: () => { S.bildeVis = null; oppdater(); } },
    h('img', { src: bilder[idx], alt: (post.navn || 'Baket') + ', bilde ' + (idx + 1), onClick: stopp }),
    h('button', { class: 'bv-lukk', 'aria-label': 'Lukk' }, '✕'),
    h('div', { class: 'bv-tekst' }, (post.navn || 'Uten navn') + ' · ' + post.dato +
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
/* `loggIdx` utelatt = bildet hører til skjemaet for det neste baket. Er den satt,
   legges bildet på en allerede lagret loggpost i stedet. */
function leggTilBilde(fil, loggIdx) {
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
      if (JSON.stringify(S).length + data.length > 4200000) {
        alert('Lagringen i nettleseren er nesten full — last ned en sikkerhetskopi og slett gamle bilder først.');
        return;
      }
      if (loggIdx == null) {
        S.lgBilder = (S.lgBilder || []).concat([data]);
      } else if (S.loggListe[loggIdx]) {
        const liste = S.loggListe.slice();
        liste[loggIdx] = Object.assign({}, liste[loggIdx], { bilder: (liste[loggIdx].bilder || []).concat([data]) });
        S.loggListe = liste;
      }
      oppdater();
    };
    img.src = les.result;
  };
  les.readAsDataURL(fil);
}
/* Sikkerhetskopi — alt ligger kun i nettleserens localStorage. Til ekte
   innlogging/sky trengs en backend; inntil den beslutningen er tatt er dette
   vernet mot tap: last ned alt som JSON, hent inn igjen hvor som helst. */
function tegnBackup() {
  const inpFil = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none',
    'aria-label': 'Velg sikkerhetskopi', onchange: e => hentInnKopi(e.target.files && e.target.files[0]) });
  const boks = kort('Sikkerhetskopi', null);
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:6px' },
    'Alt du legger inn ligger kun i denne nettleseren — sletter du nettleserdata, er det borte. Last ned en kopi nå og da; fila kan hentes inn igjen på en ny telefon. Ekte innlogging med sky-lagring står på planen, men krever en server.'));
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
  if (S.oppslag === 'ordliste') return oppslagOrdliste();
  // Meny
  const wrap = h('div');
  const punkter = [
    ['mel', 'Mel & korn', (typeof FLOURS !== 'undefined' ? FLOURS.length : 30) + ' meltyper: protein, glutenbidrag, absorpsjon, tak og pris. Stjernemerk favorittene.'],
    ['teknikk', 'Teknikk og fagstoff', (typeof TIPS !== 'undefined' ? TIPS.length : 23) + ' seksjoner, verifisert mot forskning. Fire av dem motsier notatene.'],
    ['steking', 'Stekeprofiler', 'Temperatur, damp og kjerne per utstyr — og hvilken planen din bruker.'],
    ['ordliste', 'Ordliste', (typeof ORDLISTE !== 'undefined' ? ORDLISTE.length : 44) + ' fagord, gruppert, med kryssreferanser.']
  ];
  punkter.forEach(([id, tit, und]) => wrap.appendChild(h('button', { class: 'valgkort', onClick: () => { S.oppslag = id; S.oppslagSok = ''; oppdater(); } },
    h('span', { style: 'flex:1' }, h('span', { class: 'tittel', style: 'font-size:1rem' }, tit), h('span', { class: 'undertittel' }, und)),
    h('span', { style: 'color:var(--color-neutral-400)' }, '›'))));
  wrap.appendChild(h('div', { class: 'varsel', style: 'margin-top:12px' },
    'Fagstoffet ligger her, ikke i veien for bakingen. Der et valg har en konsekvens, står forklaringen som ⓘ rett ved valget — ikke som en lenke hit.'));
  return wrap;
}
function tilbakeknapp() { return h('button', { class: 'btn-ghost', onClick: () => { S.oppslag = 'meny'; oppdater(); } }, '‹ Oppslag'); }

function oppslagMel() {
  const wrap = h('div', null, tilbakeknapp());
  wrap.appendChild(h('input', { class: 'sok', 'data-fokus': 'sok', placeholder: 'Søk meltype…', value: S.oppslagSok, oninput: e => { S.oppslagSok = e.target.value; render(); } }));
  const sok = (S.oppslagSok || '').toLowerCase();
  const grupper = {};
  FLOURS.forEach(f => { if (sok && !(f.navn.toLowerCase().includes(sok) || (f.gruppe || '').toLowerCase().includes(sok))) return; (grupper[f.gruppe] = grupper[f.gruppe] || []).push(f); });
  Object.keys(grupper).forEach(gr => {
    wrap.appendChild(h('div', { class: 'seksjonstittel' }, gr));
    grupper[gr].forEach(f => {
      const fav = (S.favoritter || []).includes(f.id);
      const info = (typeof MEL_INFO !== 'undefined') && MEL_INFO[f.id];
      // Klikkbare tall → MELTALL_INFO-forklaring (ⓘ per tall).
      const tallKnapp = (nokkel, lab, verdi) => h('button', {
        style: 'background:none;border:none;padding:0;font:inherit;cursor:pointer;color:inherit;text-align:left',
        'aria-label': lab + ' — forklaring', onClick: () => { S.meltallInfo = S.meltallInfo === (f.id + nokkel) ? null : (f.id + nokkel); oppdater(); } },
        lab + ' ', h('b', null, verdi), h('span', { style: 'color:var(--color-neutral-400);font-size:.7em' }, ' ⓘ'));
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
          h('button', { class: 'info-knapp', style: fav ? 'color:var(--color-accent-500);border-color:var(--color-accent-300)' : '', 'aria-label': (fav ? 'Fjern favoritt: ' : 'Merk som favoritt: ') + f.navn, onClick: () => { S.favoritter = fav ? S.favoritter.filter(x => x !== f.id) : (S.favoritter || []).concat([f.id]); oppdater(); } }, fav ? '★' : '☆')));
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
  return wrap;
}
function oppslagTeknikk() {
  const wrap = h('div', null, tilbakeknapp());
  wrap.appendChild(h('input', { class: 'sok', 'data-fokus': 'sok', placeholder: 'Søk fagstoff…', value: S.oppslagSok, oninput: e => { S.oppslagSok = e.target.value; render(); } }));
  const sok = (S.oppslagSok || '').toLowerCase();
  TIPS.forEach(t => {
    const tekst = JSON.stringify(t).toLowerCase();
    if (sok && !tekst.includes(sok)) return;
    const motsier = (t.tittel || '').includes('⚠') || (t.ikon === '⚠');
    const boks = h('details', { class: 'kort', style: 'padding:0' });
    boks.appendChild(h('summary', { style: 'padding:14px 16px;cursor:pointer;font-weight:700;font-size:.9rem;list-style:none;display:flex;gap:8px;align-items:center' },
      motsier ? h('span', { class: 'pille', style: 'background:var(--color-accent-200);color:var(--color-accent-900)' }, '⚠ motsier') : null,
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
  return wrap;
}
function oppslagSteking(r) {
  const wrap = h('div', null, tilbakeknapp());
  BAKE_PROFILES.forEach(p => {
    const aktiv = r.prof && r.prof.id === p.id;
    wrap.appendChild(h('div', { class: 'kort' },
      h('div', { style: 'display:flex;align-items:baseline;gap:8px' },
        h('span', { style: 'font-family:var(--font-heading);font-size:1.02rem;flex:1' }, p.navn),
        aktiv ? h('span', { class: 'badge' }, 'planen din') : null),
      h('div', { style: 'font-size:.76rem;color:var(--color-neutral-600);margin-top:2px' }, (p.vekt || '') + ' · ' + (p.hydrering || '')),
      p.anbefaltTil ? h('div', { style: 'font-size:.78rem;margin-top:6px' },
        h('span', { class: 'pille', style: 'background:var(--color-accent-2-100);color:var(--color-accent-2-700)' }, 'anbefalt til'), ' ' + p.anbefaltTil) : null,
      h('div', { style: 'margin-top:8px' },
        tallrad('Inn på', p.inn + ' °C'), tallrad('Ned til', p.ned + ' °C'), tallrad('Damp', p.damp), tallrad('Damptid', p.dampTid), tallrad('Kjerne', p.kjerne)),
      p.notat ? h('div', { class: 'hjelpetekst', style: 'margin-top:6px' }, p.notat) : null));
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
      h('button', { class: 'btn', style: 'flex:1;font-size:.8rem', onClick: async () => { await Sky.skyvNaa(S); await Sky.loggUt(); _harHentetNed = false; render(); } }, 'Logg ut')));
    return boks;
  }
  // Utlogget: registrer / logg inn
  const erNy = skyForm.modus === 'ny';
  boks.appendChild(h('div', { class: 'hjelpetekst', style: 'margin-top:6px' },
    'Uten konto ligger alt kun i denne nettleseren. Logger du inn, lagres bakeloggen i skyen og følger deg til ny telefon eller PC.'));
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
  if (skyForm.feil) boks.appendChild(h('div', { class: 'varsel', style: 'border-color:var(--color-danger)' }, skyForm.feil));
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
/* Ved innlogging: hent ned skyens versjon og la den NYESTE vinne. Uten
   tidsstempel-sammenligning ville en fersk logg på telefonen blitt overskrevet
   av en gammel kopi fra PC-en, eller omvendt. */
async function synkVedInnlogging() {
  if (_harHentetNed) return;
  _harHentetNed = true;
  const sky = await Sky.hentNed();
  if (!sky || !sky.state) { Sky.lagreOpp(S); render(); return; }   // ingenting oppe ennå — legg opp det lokale
  const skyMs = sky.oppdatert ? new Date(sky.oppdatert).getTime() : 0;
  const lokaltMs = S.oppdatert || 0;
  if (skyMs > lokaltMs) {
    try {
      localStorage.setItem(LAGER, JSON.stringify(sky.state));
      S = last();
      if (window.__FB) window.__FB.S = S;
    } catch (e) {}
  } else {
    Sky.lagreOpp(S);
  }
  render();
}

/* Tastatur i bildevisningen: Esc lukker, piler blar. Én lytter for hele appen —
   den sjekker selv om visningen er åpen, så den trenger aldri av- og påmelding. */
document.addEventListener('keydown', e => {
  if (!S.bildeVis) return;
  if (e.key === 'Escape') { S.bildeVis = null; oppdater(); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const post = S.loggListe.find(b => b.id === S.bildeVis.id);
    const n = (post && post.bilder && post.bilder.length) || 0;
    if (n > 1) { S.bildeVis = { id: S.bildeVis.id, i: (S.bildeVis.i + (e.key === 'ArrowLeft' ? -1 : 1) + n) % n }; oppdater(); }
  }
});

/* Snarveiene i manifestet (langtrykk på appikonet på Android) åpner appen med
   ?skjerm=prosess eller ?skjerm=logg. Uten dette ville de bare åpnet forsiden. */
(function apneFraAdresse() {
  const bedt = new URLSearchParams(location.search).get('skjerm');
  if (bedt && SKJERMER.some(s => s.id === bedt)) { S.skjerm = bedt; if (bedt === 'prosess') S.aktivSteg = 0; }
})();

/* ---------- Start ---------- */
if (typeof Sky !== 'undefined' && Sky.klar()) {
  Sky.paaEndring(() => { render(); if (Sky.bruker()) synkVedInnlogging(); });
}
render();
window.__FB = { S, render };
})();
