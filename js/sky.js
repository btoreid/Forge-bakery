/* ============================================================
   FORGE BAKERY — SKY (innlogging + synk)
   ============================================================
   Appen er 100 % statisk (GitHub Pages) og kan ikke lagre noe selv. Denne fila
   snakker derfor rett fra nettleseren til Supabase, som holder både innlogging
   og data.

   Prinsippet er «lokalt først»:
     - localStorage er fortsatt sannheten mens du bruker appen. Alt virker
       offline og uten konto, nøyaktig som før.
     - Er du innlogget, speiles tilstanden opp til skyen etter hver endring
       (debounced), og hentes ned ved innlogging.
     - Konflikt løses på `oppdatert` (ms): nyeste vinner. Med én bruker og én
       app er det tilstrekkelig — og forutsigbart.

   `anon`-nøkkelen ligger åpent her MED VILJE: den er laget for frontend-kode.
   Sikkerheten ligger i Row Level Security på serveren (se SUPABASE.md), som
   sier at en rad bare kan leses/skrives av eieren.

   API-et ut mot app-v2.js er bevisst smalt:
     Sky.klar()      — er sky konfigurert i det hele tatt?
     Sky.bruker()    — innlogget bruker, eller null
     Sky.status()    — {tilstand, tekst} for visning
     Sky.paaEndring(cb) — kalles når status endrer seg (app-v2 re-tegner)
     Sky.registrer/loggInn/loggUt/glemtPassord
     Sky.hentNed()   — hent tilstanden fra skyen (returnerer objekt eller null)
     Sky.lagreOpp(S) — speil tilstanden opp (debounced, stille)
   ============================================================ */
(function () {
'use strict';

/* Prosjektet ditt hos Supabase. Publishable/anon-nøkkelen er offentlig. */
const SUPABASE_URL = 'https://xoripdwbghqlzbgxkfps.supabase.co';
const SUPABASE_ANON = 'sb_publishable_Ix7fTZ50hAco3SBAUAKeqA_TcgI5XIE';
const TABELL = 'bakerstate';

let klient = null;
let bruker = null;
/* Er den lagrede økten sjekket ennå?
   `getSession()` er ASYNKRON, så `bruker` er null i de første hundredelene etter
   oppstart — også for en som er innlogget. Uten dette flagget rakk appen å tegne
   innloggingsporten før økten var gjenopprettet, og hvert eneste åpne blinket
   innom påloggingsskjermen. */
let sesjonSjekket = false;
let sisteFeil = null;
let synkStatus = 'av';          // av | klar | synker | lagret | feil
const lyttere = [];

function varsle() { lyttere.forEach(f => { try { f(); } catch (e) {} }); }

function init() {
  if (typeof supabase === 'undefined' || !supabase.createClient) return;
  if (!SUPABASE_URL || !SUPABASE_ANON) return;
  try {
    klient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  } catch (e) { klient = null; sesjonSjekket = true; return; }
  // Gjenopprett en tidligere økt (persistSession) og følg innlogging/utlogging.
  klient.auth.getSession().then(({ data }) => {
    bruker = (data && data.session && data.session.user) || null;
    if (bruker) synkStatus = 'klar';
    sesjonSjekket = true;
    varsle();
  }).catch(() => { sesjonSjekket = true; varsle(); });
  /* Sikkerhetsnett: henger nettet, løser `getSession()` seg aldri — og appen
     ville stått på splash-skjermen i det uendelige. Etter 4 sekunder slipper vi
     brukeren videre til innloggingsskjemaet, som i det minste er noe hen kan
     gjøre noe med. Er økten gyldig og kommer inn etterpå, tegnes appen straks. */
  setTimeout(() => { if (!sesjonSjekket) { sesjonSjekket = true; varsle(); } }, 4000);
  klient.auth.onAuthStateChange((_hendelse, sesjon) => {
    sesjonSjekket = true;
    const foer = bruker && bruker.id;
    bruker = (sesjon && sesjon.user) || null;
    if (!bruker) synkStatus = 'av';
    else if (bruker.id !== foer) synkStatus = 'klar';
    varsle();
  });
}

/* ---------- Feilmeldinger på norsk ---------- */
function norsk(feil) {
  const m = String((feil && feil.message) || feil || '').toLowerCase();
  if (m.includes('invalid login')) return 'Feil e-post eller passord.';
  if (m.includes('email not confirmed')) return 'E-posten er ikke bekreftet ennå — sjekk innboksen.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Denne e-posten har allerede en konto. Logg inn i stedet.';
  if (m.includes('password should be at least')) return 'Passordet må ha minst 6 tegn.';
  if (m.includes('rate limit') || m.includes('too many')) return 'For mange forsøk — vent litt og prøv igjen.';
  if (m.includes('failed to fetch') || m.includes('networkerror')) return 'Får ikke kontakt med skyen. Er du på nett? Appen virker fint videre lokalt.';
  // To ulike ordlyder for samme sak: Postgres sier «relation … does not exist»,
  // mens PostgREST svarer «Could not find the table 'public.bakerstate' in the
  // schema cache» (PGRST205). Bare den første var dekket, så den vanligste
  // varianten slapp gjennom som rå engelsk tekst uten å si hva man skal gjøre.
  if ((m.includes('relation') && m.includes('does not exist')) ||
      m.includes('could not find the table') || m.includes('schema cache')) {
    return 'Databasetabellen «bakerstate» finnes ikke ennå. Kjør SQL-en fra SUPABASE.md i Supabase → SQL Editor, så virker synken. Alt du gjør lagres lokalt i mellomtiden.';
  }
  return (feil && feil.message) ? feil.message : 'Ukjent feil.';
}

/* ---------- Kontohandlinger ---------- */
async function registrer(epost, passord) {
  if (!klient) return { feil: 'Sky er ikke konfigurert.' };
  const { data, error } = await klient.auth.signUp({ email: epost, password: passord });
  if (error) return { feil: norsk(error) };
  // Med e-postbekreftelse på får vi bruker uten sesjon — da må hen sjekke e-post.
  if (data && data.user && !data.session) return { melding: 'Konto opprettet. Sjekk e-posten din og bekreft adressen før du logger inn.' };
  return { melding: 'Konto opprettet og innlogget.' };
}
async function loggInn(epost, passord) {
  if (!klient) return { feil: 'Sky er ikke konfigurert.' };
  const { error } = await klient.auth.signInWithPassword({ email: epost, password: passord });
  if (error) return { feil: norsk(error) };
  return { melding: 'Innlogget.' };
}
async function loggUt() {
  if (!klient) return;
  await klient.auth.signOut();
}
async function glemtPassord(epost) {
  if (!klient) return { feil: 'Sky er ikke konfigurert.' };
  const { error } = await klient.auth.resetPasswordForEmail(epost, { redirectTo: location.href });
  if (error) return { feil: norsk(error) };
  return { melding: 'Vi har sendt deg en e-post for å sette nytt passord.' };
}

/* ---------- Delt maskinkalibrering ----------
   Friksjonstallene i appen er klasseanslag. Én ekte måling er mer verdt enn
   tabellen, og skal komme alle med samme maskin til gode — derfor en egen,
   delt tabell i stedet for å gjemme målingen i eierens egen rad.

   SKRIVETILGANGEN ligger i databasen, ikke her: RLS slipper bare gjennom
   e-posten som eier repoet (se SUPABASE.md). Klienten kan altså ikke lyve seg
   til å publisere — `kanPublisere()` under er bare til å skjule en knapp som
   likevel ville blitt avvist. */
const EIER_EPOST = 'bjorn@medthings.no';
function kanPublisere() {
  return !!(bruker && String(bruker.email || '').toLowerCase() === EIER_EPOST);
}
async function hentKalibreringer() {
  if (!klient || !bruker) return null;
  const { data, error } = await klient.from('maskinkalibrering').select('maskin_id, friksjon, deigvekt, oppdatert');
  // Feiler den (tabellen finnes ikke ennå), skal appen gå videre på anslagene.
  if (error || !Array.isArray(data)) return null;
  const ut = {};
  data.forEach(rad => { if (rad && rad.maskin_id) ut[rad.maskin_id] = rad; });
  return ut;
}
async function lagreKalibrering(maskinId, friksjon, deigvekt) {
  if (!klient || !bruker) return { feil: 'Ikke innlogget.' };
  const { error } = await klient.from('maskinkalibrering')
    .upsert({ maskin_id: maskinId, friksjon, deigvekt, oppdatert: new Date().toISOString() },
            { onConflict: 'maskin_id' });
  if (error) return { feil: norsk(error) };
  return { melding: 'Kalibreringen er delt.' };
}

/* ---------- Data opp og ned ---------- */
async function hentNed() {
  if (!klient || !bruker) return null;
  const { data, error } = await klient.from(TABELL).select('state, oppdatert').eq('bruker_id', bruker.id).maybeSingle();
  // Skill mellom «leseforsøket feilet» og «det ligger ingenting der». Begge ga
  // før null, og kalleren tolket null som tomt og lastet opp sin egen tilstand —
  // altså kunne et nettverksglipp eller en RLS-hikke overskrive historikken i
  // skyen med det enheten tilfeldigvis hadde lokalt.
  if (error) { sisteFeil = norsk(error); synkStatus = 'feil'; varsle(); return { feil: sisteFeil }; }
  if (!data || !data.state) return null;
  return { state: data.state, oppdatert: data.oppdatert };
}

let tidsavbrudd = null, venterState = null;
/* Debouncet opplasting: en skyver som dras gir mange lagringer i sekundet, og
   hver av dem skal ikke bli en nettverksrunde. */
function lagreOpp(S) {
  if (!klient || !bruker) return;
  venterState = S;
  if (tidsavbrudd) clearTimeout(tidsavbrudd);
  tidsavbrudd = setTimeout(skyv, 1200);
}
async function skyv() {
  tidsavbrudd = null;
  if (!klient || !bruker || !venterState) return;
  const nyttState = venterState; venterState = null;
  synkStatus = 'synker'; varsle();
  /* Stempelet er ENDRINGSTID (statens eget `oppdatert`), ikke opplastingstid.
     Med opplastingstid så en uendret enhet som pushet en no-op «nyere» ut enn
     enheten med ekte, upushede endringer — og «nyeste vinner» rullet så de
     ekte endringene tilbake (release-review 01.08). */
  const naar = isFinite(nyttState && nyttState.oppdatert) && nyttState.oppdatert > 0
    ? new Date(nyttState.oppdatert) : new Date();
  const rad = { bruker_id: bruker.id, state: nyttState, oppdatert: naar.toISOString() };
  const { error } = await klient.from(TABELL).upsert(rad, { onConflict: 'bruker_id' });
  if (error) {
    sisteFeil = norsk(error); synkStatus = 'feil';
    /* Feilet push skal IKKE miste køen: legg tilstanden tilbake og prøv igjen
       om en stund — før lå endringen bare lokalt til neste tastetrykk. */
    if (!venterState) { venterState = nyttState; tidsavbrudd = setTimeout(skyv, 15000); }
  }
  else { sisteFeil = null; synkStatus = 'lagret'; }
  varsle();
}
/* Tvungen, ventende lagring — brukes før utlogging så siste endring ikke tapes. */
async function skyvNaa(S) {
  if (S) venterState = S;
  if (tidsavbrudd) { clearTimeout(tidsavbrudd); tidsavbrudd = null; }
  await skyv();
}

function status() {
  if (!klient) return { tilstand: 'ukonfigurert', tekst: 'Sky er ikke satt opp i denne versjonen.' };
  if (!bruker) return { tilstand: 'utlogget', tekst: 'Ikke innlogget — data ligger kun i denne nettleseren.' };
  const t = { klar: 'Synkes til skyen', synker: 'Lagrer …', lagret: 'Lagret i skyen', feil: 'Synk feilet: ' + (sisteFeil || ''), av: 'Av' }[synkStatus];
  return { tilstand: synkStatus, tekst: t, epost: bruker.email };
}

init();
window.Sky = {
  klar: () => !!klient,
  bruker: () => bruker,
  sesjonSjekket: () => sesjonSjekket,
  status, paaEndring: cb => lyttere.push(cb),
  registrer, loggInn, loggUt, glemtPassord,
  kanPublisere, hentKalibreringer, lagreKalibrering,
  hentNed, lagreOpp, skyvNaa
};
})();
