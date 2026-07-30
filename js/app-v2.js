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
  startTemp: 24, melTemp: 21, maskin: 'spiralHjemme', eltMin: 13,
  stekeProfil: null, lokk: true, fulltKjol: false,
  ferdigMs: null,
  paramInfo: null, tilleggInfo: null, ffInfo: false,
  aktivSteg: 0, regnskapAapen: false,
  loggListe: [], lgNavn: '', lgKar: 8,
  favoritter: [], oppslag: 'meny', oppslagSok: ''
};
let S = last();

function last() {
  try {
    const raw = localStorage.getItem(LAGER);
    if (raw) return Object.assign({}, STANDARD, JSON.parse(raw));
  } catch (e) {}
  return Object.assign({}, STANDARD);
}
function lagre() {
  try { localStorage.setItem(LAGER, JSON.stringify(S)); } catch (e) {}
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

/* ============================================================
   RENDER
   ============================================================ */
const SKJERMER = [
  { id: 'brodet',  navn: 'Brød',    kicker: 'FORBEREDELSE · 1 AV 3', tittel: 'Brødet' },
  { id: 'deigen',  navn: 'Deig',    kicker: 'FORBEREDELSE · 2 AV 3', tittel: 'Mel, vann og frø' },
  { id: 'tid',     navn: 'Tid',     kicker: 'FORBEREDELSE · 3 AV 3', tittel: 'Når vil du ha brød?' },
  { id: 'prosess', navn: 'Prosess', kicker: 'BAKINGEN', tittel: 'Prosessen' },
  { id: 'logg',    navn: 'Logg',    kicker: 'ETTER BAKET', tittel: 'Bakeloggen' },
  { id: 'oppslag', navn: 'Oppslag', kicker: 'SLÅ OPP', tittel: 'Oppslag' }
];
/* Brødtypene som designet viser dem — «Brød» er én type der grovheten settes i
   deigen (loff = grov 0), de tre andre er kalibrerte forvalg. */
const BTYPER = [
  { id: 'grovbrod', navn: 'Brød', undertittel: 'Fra loff til ekstra grovt — du setter grovheten i deigen', rute: 'bygg', antall: 4, vekt: 900 },
  { id: 'ciabatta', navn: 'Ciabatta', undertittel: 'Stiv biga, åpen krumme · kalibrert deig', rute: 'preset', antall: 8, vekt: 280 },
  { id: 'baguette', navn: 'Baguetter', undertittel: 'Poolish og kort bulk · kalibrert deig', rute: 'preset', antall: 6, vekt: 330 },
  { id: 'focaccia', navn: 'Focaccia', undertittel: 'Hever i formen, olje i deigen · kalibrert deig', rute: 'preset', antall: 1, vekt: 1000 }
];
const IKON = { brodet: '◗', deigen: '◍', tid: '◔', prosess: '❯', logg: '▤', oppslag: '❔' };

function render() {
  const r = regn(S);
  const K = kjede(S, r, S.ferdigMs != null ? S.ferdigMs : standardFerdig());
  const sk = SKJERMER.find(s => s.id === S.skjerm) || SKJERMER[0];

  // Topp
  byId('topp').replaceChildren(
    h('div', { class: 'kicker' }, sk.kicker),
    h('h1', null, sk.tittel)
  );

  // Innhold
  const innhold = byId('innhold');
  const tegner = { brodet: tegnBrodet, deigen: tegnDeigen, tid: tegnTid, prosess: tegnProsess, logg: tegnLogg, oppslag: tegnOppslag }[S.skjerm];
  innhold.replaceChildren(tegner(r, K));
  innhold.scrollTop = innhold.__scroll || 0;

  // Bunnlinje (deigregnskap) — skjules på Prosess/Logg/Oppslag der den ikke gir mening
  tegnBunnlinje(r, K);

  // Bunnmeny
  byId('bunnmeny').replaceChildren(...SKJERMER.map(s =>
    h('button', { class: s.id === S.skjerm ? 'paa' : '', onClick: () => bytt(s.id) },
      h('span', { class: 'ikon' }, IKON[s.id]), s.navn)));
}

function bytt(id) {
  const innhold = byId('innhold');
  if (innhold) innhold.__scroll = 0;
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
function tegnBunnlinje(r, K) {
  const bl = byId('bunnlinje');
  if (['prosess', 'logg', 'oppslag'].includes(S.skjerm)) { bl.replaceChildren(); bl.className = 'bunnlinje'; return; }
  bl.className = 'bunnlinje' + (S.regnskapAapen ? ' open' : '');
  const stripe = h('button', { class: 'stripe', onClick: () => { S.regnskapAapen = !S.regnskapAapen; oppdater(); } },
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
    barn.push(h('div', { class: 'regnskap' }, ...rader.map(([k, v]) =>
      h('div', { class: 'rad' }, h('span', null, k), h('b', null, v)))));
  }
  bl.replaceChildren(...barn);
}
const sep = () => h('span', { class: 'sep' }, ' · ');

/* ============================================================
   1 · BRØDET
   ============================================================ */
function tegnBrodet(r) {
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
    const grov = erPreset ? null : Math.round(paa ? regn(S).brodskala.pct : S.grov);
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

  // Størrelse
  wrap.appendChild(h('div', { class: 'kort', style: 'margin-top:14px' },
    h('div', { class: 'kort-num' }, 'Størrelse'),
    stepperRad('Antall brød', S.antall, 'antall', 1, 40, 1),
    stepperRad('Gram per brød', S.vekt, 'vekt', 100, 2000, 50),
    h('div', { style: 'margin-top:10px;font-size:.8rem;color:var(--color-neutral-700);font-variant-numeric:tabular-nums' },
      'Deigvekt ', h('b', null, g0(r.totalVekt)), ' · hver ca. ', h('b', null, g0(r.totalVekt / Math.max(S.antall, 1))))));
  return wrap;
}
function startForvalg() { S.brotype = 'grovbrod'; S.grov = 40; S.tid = 'lang'; S.skjerm = 'deigen'; oppdater(); }
function velgBrotype(id) {
  S.brotype = id;
  const bt = BTYPER.find(b => b.id === id);
  if (bt && bt.antall) S.antall = bt.antall;
  if (bt && bt.vekt) S.vekt = bt.vekt;
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
    melBoks.appendChild(h('div', { class: 'melrad2' + (i === 0 ? ' forst' : '') },
      h('div', { class: 'm-navn' },
        h('div', { class: 'n' }, (fav ? '★ ' : '') + m.navn),
        h('div', { class: 'sub' }, [bidrag, flour.protein != null ? fmt(flour.protein, 1) + ' g protein' : null].filter(Boolean).join(' · '))),
      h('div', { class: 'm-tall' }, h('div', { class: 'g' }, g0(m.gram)), h('div', { class: 'p' }, fmt(m.pct, 0) + ' %')),
      h('button', { class: 'info-ring', onClick: () => { S.tilleggInfo = null; S.melInfo = S.melInfo === m.id ? null : m.id; oppdater(); } }, 'ⓘ')));
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
    const lab = vannMerke(S.hyd);
    wrap.appendChild(kort('3 · Vann', 'hydrering',
      h('div', { class: 'skyver-topp' },
        h('span', { class: 'skyver-verdi' }, S.hyd + ' %'),
        h('span', { class: 'skyver-klasse', style: 'background:' + lab.bg + ';color:' + lab.farge }, lab.merke)),
      h('input', { type: 'range', class: 'skyver', min: 62, max: 86, step: 1, value: S.hyd,
        oninput: e => { S.hyd = +e.target.value; oppdater(); } }),
      h('div', { class: 'konsekvens' }, vannKonsekvens(r)),
      infoUtfelling('hydrering')));
  }

  // 4–6 · Frø, korn, smak
  wrap.appendChild(tilleggSeksjon(r));

  // 7 · Salt (preset låser)
  if (!erPreset) {
    wrap.appendChild(kort('7 · Salt', 'saltPct',
      h('div', { class: 'skyver-topp' }, h('span', { class: 'skyver-verdi' }, fmt(S.saltPct != null ? S.saltPct : 1.8, 1) + ' %')),
      h('input', { type: 'range', class: 'skyver', min: 1.4, max: 2.4, step: 0.1, value: S.saltPct != null ? S.saltPct : 1.8,
        oninput: e => { S.saltPct = +e.target.value; oppdater(); } }),
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
  return wrap;
}
function soakerKorn(id) { const s = SOAKERS.find(x => x.id === id); return s && s.korn; }
function tilleggRad(t, r) {
  const pct = (S.tillegg || {})[t.id] || 0;
  const paa = pct > 0;
  const frr = r.fro.find(f => f.id === t.id);
  const gramV = frr ? frr.gram : 0;
  const rad = h('div', { style: 'padding:10px 0;border-top:1px solid var(--color-neutral-200)' },
    h('div', { style: 'display:flex;align-items:center;gap:10px' },
      h('div', { style: 'flex:1;min-width:0' },
        h('div', { style: 'font-weight:600;font-size:.9rem' }, t.navn),
        h('div', { style: 'font-size:.74rem;color:var(--color-neutral-600);font-variant-numeric:tabular-nums' },
          paa ? fmt(pct, 1) + ' % · ' + g0(gramV) + (t.type === 'fro' ? ' · ' + behandlingOrd(t.id) : '') : 'av')),
      h('div', { class: 'stepper', style: 'flex:0 0 auto;width:150px' },
        h('button', { onClick: () => endreTillegg(t, -(t.type === 'smak' ? 0.5 : 1)) }, '−'),
        h('input', { type: 'text', inputmode: 'decimal', value: paa ? fmt(pct, 1) : '0', style: 'font-size:1.05rem',
          onblur: e => { const v = parseFloat(e.target.value.replace(',', '.')); settTillegg(t, isNaN(v) ? 0 : v); } }),
        h('button', { onClick: () => endreTillegg(t, (t.type === 'smak' ? 0.5 : 1)) }, '+')),
      h('button', { class: 'info-knapp', onClick: () => { S.tilleggInfo = S.tilleggInfo === t.id ? null : t.id; oppdater(); } }, 'ⓘ')));
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
      tallrad('Mel', g0(f.mel)), tallrad('Vann', g0(f.vann)), tallrad('Gjær (tørr)', fmt(f.gjaer, 2) + ' g'),
      tallrad('Modning', fmtTimer(f.timer) + ' ved ' + grader(f.temp, 0)), f.salt > 0.05 ? tallrad('Salt', fmt(f.salt, 2) + ' g') : null));
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
function vannMerke(hyd) {
  if (hyd <= 68) return { merke: 'STRAMT', bg: 'var(--color-neutral-200)', farge: 'var(--color-neutral-700)' };
  if (hyd <= 71) return { merke: 'TRYGT', bg: 'var(--color-accent-2-100)', farge: 'var(--color-accent-2-700)' };
  if (hyd <= 77) return { merke: 'I VINDUET', bg: 'var(--color-accent-2-200)', farge: 'var(--color-accent-2-900)' };
  if (hyd <= 82) return { merke: 'LØST', bg: 'var(--color-accent-200)', farge: 'var(--color-accent-900)' };
  return { merke: 'OVER TAKET', bg: 'var(--color-accent-300)', farge: 'var(--color-accent-900)' };
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
function tegnTid(r) {
  const wrap = h('div');
  const ferdigMs = S.ferdigMs != null ? S.ferdigMs : standardFerdig();
  const K = kjede(S, r, ferdigMs);

  // Ferdig/Start-veksler + tidsstepper
  const kort1 = h('div', { class: 'kort' });
  kort1.appendChild(h('div', { class: 'toggle2' },
    h('button', { class: S.tidModus !== 'start' ? 'paa' : '', onClick: () => { S.tidModus = 'ferdig'; oppdater(); } }, 'Ferdig ' + klHM(ferdigMs)),
    h('button', { class: S.tidModus === 'start' ? 'paa' : '', onClick: () => { S.tidModus = 'start'; oppdater(); } }, 'Start nå')));
  const erStart = S.tidModus === 'start';
  const visMs = erStart ? K.start.getTime() : ferdigMs;
  kort1.appendChild(h('div', { class: 'tidstepper' },
    h('button', { onClick: () => flyttFerdig(-60) }, '−'),
    h('div', { class: 'midt' },
      h('div', { class: 'kl' }, klHM(visMs)),
      h('div', { class: 'note' }, erStart ? 'du starter — ut av ovnen ' + klHM(ferdigMs) : 'ut av ovnen — første steg blir ' + klHM(K.start.getTime()))),
    h('button', { onClick: () => flyttFerdig(60) }, '+')));
  wrap.appendChild(kort1);

  // Plan-kort
  TIDSPLANER.forEach(tp => {
    const paa = tp.id === S.tid;
    const prov = regn(Object.assign({}, S, { tid: tp.id }));
    const pK = kjede(Object.assign({}, S, { tid: tp.id }), prov, ferdigMs);
    const ff = tp.forferment;
    const sub = (ff.bruk ? ff.type + ' ' + ff.pctMel + ' %' : 'ingen forferment') +
      ' · gjær ' + fmt(prov.gjaerTorr, 3) + ' % = ' + fmt(prov.gjaerTotal, 2) + ' g';
    wrap.appendChild(h('button', { class: 'valgkort' + (paa ? ' paa' : ''), onClick: () => { S.tid = tp.id; oppdater(); } },
      h('div', { class: 'plankort' },
        h('div', { style: 'flex:1;min-width:0' },
          h('div', null, h('span', { class: 'p-navn' }, tp.navn), h('span', { class: 'p-tid' }, fmt(pK.totalT, 1) + ' t')),
          h('div', { class: 'p-sub' }, sub)),
        h('div', { class: 'p-loft' }, h('div', { class: 'v' }, String(prov.loft.loft)), h('div', { class: 'l' }, 'LØFT')))));
  });
  return wrap;
}
function klHM(ms) { return new Date(ms).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }); }
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
  wrap.appendChild(h('div', { class: 'framdrift' }, ...K.map((s, j) =>
    h('div', { class: 'prikk' + (j < i ? ' gjort' : j === i ? ' naa' : '') }))));
  wrap.appendChild(h('div', { style: 'text-align:center;font-size:.74rem;color:var(--color-neutral-600);margin-bottom:8px' },
    'Steg ' + (i + 1) + ' av ' + K.length + ' · totalt ' + fmt(K.totalT, 1) + ' t'));

  const steg = K[i];
  wrap.appendChild(stegKort(steg, true));

  // Naviger
  wrap.appendChild(h('div', { style: 'display:flex;gap:8px;margin:6px 0 14px' },
    h('button', { class: 'btn', style: 'flex:1', disabled: i === 0 ? '' : null, onClick: () => { S.aktivSteg = Math.max(0, i - 1); oppdater(); } }, '‹ Forrige'),
    h('button', { class: 'btn btn-primary', style: 'flex:1', disabled: i === K.length - 1 ? '' : null, onClick: () => { S.aktivSteg = Math.min(K.length - 1, i + 1); oppdater(); } }, 'Neste ›')));

  // Hele kjeden kompakt
  wrap.appendChild(h('div', { class: 'seksjonstittel' }, 'Hele prosessen'));
  K.forEach((s, j) => wrap.appendChild(h('button', { class: 'valgkort' + (j === i ? ' paa' : ''), style: 'min-height:48px', onClick: () => { S.aktivSteg = j; oppdater(); } },
    h('span', { class: 'nr', style: 'flex:0 0 24px;height:24px;border-radius:999px;display:grid;place-items:center;font-size:.72rem;font-weight:800;background:var(--color-neutral-200)' }, String(j + 1)),
    h('span', { style: 'flex:1;font-size:.86rem;font-weight:600' }, s.navn),
    h('span', { style: 'font-size:.74rem;color:var(--color-neutral-600);font-variant-numeric:tabular-nums' }, klokke(s.tid)))));
  return wrap;
}
function stegKort(steg, aapen) {
  const kropp = h('div', { class: 'kropp' });
  if (steg.hoved) {
    kropp.appendChild(h('div', { class: 'hovedtall' }, steg.hoved));
    if (steg.hovedNote) kropp.appendChild(h('div', { class: 'hovednote' }, steg.hovedNote));
  }
  if (steg.tall && steg.tall.length) kropp.appendChild(h('div', null, ...steg.tall.map(([k, v]) => h('div', { class: 'tallrad' }, h('span', null, k), h('b', null, v)))));
  if (steg.gjor) kropp.appendChild(h('div', { class: 'instruks' }, h('span', { class: 'lab' }, 'Gjør'), steg.gjor));
  if (steg.sjekk) kropp.appendChild(h('div', { class: 'instruks sjekk' }, h('span', { class: 'lab' }, 'Sjekk'), steg.sjekk));
  return h('div', { class: 'stegkort ' + (steg.tone || 'noytral') },
    h('div', { class: 'hode' },
      h('span', { class: 'nr' }, String(steg.nr)),
      h('span', { class: 'navn' }, steg.navn),
      h('span', { class: 'kl' }, klokke(steg.tid), h('br'), fmtTimer(steg.varighet / 60))),
    kropp);
}

/* ============================================================
   5 · LOGG
   ============================================================ */
function tegnLogg(r) {
  const wrap = h('div');
  wrap.appendChild(h('div', { class: 'kort' },
    h('div', { class: 'kort-num' }, 'Loggfør dette baket'),
    h('input', { class: 'sok', style: 'margin-top:10px', placeholder: 'Navn (f.eks. Halvgrovt #1)', value: S.lgNavn,
      oninput: e => { S.lgNavn = e.target.value; } }),
    h('div', { class: 'felt-label' }, 'Karakter: ' + S.lgKar + ' / 10'),
    h('input', { type: 'range', class: 'skyver', min: 1, max: 10, step: 1, value: S.lgKar, oninput: e => { S.lgKar = +e.target.value; oppdater(); } }),
    h('button', { class: 'btn btn-primary btn-full', onClick: () => lagreBak(r) }, 'Lagre baket')));

  if (!S.loggListe.length) {
    wrap.appendChild(h('div', { class: 'tomkort', style: 'margin-top:12px' },
      h('div', { class: 'hjelpetekst' }, 'Ingen bak logget ennå. Referansen appen måler mot kommer fra forvalget til du lagrer ditt første bak — da får avvikstallene et ekte anker.')));
  } else {
    wrap.appendChild(h('div', { class: 'seksjonstittel' }, 'Tidligere bak'));
    S.loggListe.slice().reverse().forEach(b => wrap.appendChild(h('div', { class: 'kort' },
      h('div', { style: 'display:flex;align-items:baseline;gap:8px' },
        h('span', { style: 'font-family:var(--font-heading);font-size:1.05rem' }, b.navn || 'Uten navn'),
        h('span', { class: 'badge' }, b.kar + ' / 10'),
        h('span', { style: 'margin-left:auto;font-size:.74rem;color:var(--color-neutral-600)' }, b.dato)),
      h('div', { style: 'font-size:.8rem;color:var(--color-neutral-700);margin-top:4px;font-variant-numeric:tabular-nums' },
        b.grov + ' % grovt · ' + b.hyd + ' % vann · løft ' + b.loft + ' · dose ' + b.dose))));
  }
  return wrap;
}
function lagreBak(r) {
  S.loggListe = S.loggListe.concat([{
    navn: S.lgNavn || ('Bak #' + (S.loggListe.length + 1)),
    kar: S.lgKar, dato: new Date().toLocaleDateString('nb-NO'),
    grov: fmt(r.brodskala.pct, 0), hyd: fmt(r.hyd * 100, 0), loft: r.loft.loft, dose: fmt(r.doseProfil.dose, 2)
  }]);
  S.lgNavn = '';
  oppdater();
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
  wrap.appendChild(h('input', { class: 'sok', placeholder: 'Søk meltype…', value: S.oppslagSok, oninput: e => { S.oppslagSok = e.target.value; render(); } }));
  const sok = (S.oppslagSok || '').toLowerCase();
  const grupper = {};
  FLOURS.forEach(f => { if (sok && !(f.navn.toLowerCase().includes(sok) || (f.gruppe || '').toLowerCase().includes(sok))) return; (grupper[f.gruppe] = grupper[f.gruppe] || []).push(f); });
  Object.keys(grupper).forEach(gr => {
    wrap.appendChild(h('div', { class: 'seksjonstittel' }, gr));
    grupper[gr].forEach(f => {
      const fav = (S.favoritter || []).includes(f.id);
      wrap.appendChild(h('div', { class: 'kort flat' },
        h('div', { style: 'display:flex;align-items:baseline;gap:8px' },
          h('span', { style: 'font-weight:700;font-size:.92rem;flex:1' }, f.navn),
          h('button', { class: 'info-knapp', style: fav ? 'color:var(--color-accent-500);border-color:var(--color-accent-300)' : '', onClick: () => { S.favoritter = fav ? S.favoritter.filter(x => x !== f.id) : (S.favoritter || []).concat([f.id]); oppdater(); } }, fav ? '★' : '☆')),
        h('div', { style: 'display:flex;gap:12px;font-size:.74rem;color:var(--color-neutral-600);margin-top:4px;font-variant-numeric:tabular-nums;flex-wrap:wrap' },
          h('span', null, 'Protein ', h('b', null, fmt(f.protein, 1) + ' %')),
          h('span', null, 'Absorpsjon ', h('b', null, fmt(f.absorpsjon * 100, 0) + ' %')),
          h('span', null, 'Styrke ', h('b', null, f.styrke)),
          h('span', null, 'Tak ', h('b', null, f.maxPct + ' %')),
          h('span', null, h('b', null, fmt(f.kr, 0) + ' kr/kg'))),
        f.notat ? h('div', { class: 'hjelpetekst', style: 'margin-top:6px' }, f.notat) : null));
    });
  });
  return wrap;
}
function oppslagTeknikk() {
  const wrap = h('div', null, tilbakeknapp());
  wrap.appendChild(h('input', { class: 'sok', placeholder: 'Søk fagstoff…', value: S.oppslagSok, oninput: e => { S.oppslagSok = e.target.value; render(); } }));
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
      h('div', { style: 'margin-top:8px' },
        tallrad('Inn på', p.inn + ' °C'), tallrad('Ned til', p.ned + ' °C'), tallrad('Damp', p.damp), tallrad('Damptid', p.dampTid), tallrad('Kjerne', p.kjerne)),
      p.notat ? h('div', { class: 'hjelpetekst', style: 'margin-top:6px' }, p.notat) : null));
  });
  return wrap;
}
function oppslagOrdliste() {
  const wrap = h('div', null, tilbakeknapp());
  if (typeof ORDLISTE === 'undefined') return wrap;
  wrap.appendChild(h('input', { class: 'sok', placeholder: 'Søk ord…', value: S.oppslagSok, oninput: e => { S.oppslagSok = e.target.value; render(); } }));
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
        (se && se.length) ? h('div', { style: 'margin-top:6px;font-size:.74rem;color:var(--color-accent-700)' }, 'Se også: ' + (Array.isArray(se) ? se.join(', ') : se)) : null));
    });
  });
  return wrap;
}

/* ---------- Start ---------- */
render();
window.__FB = { S, render };
})();
