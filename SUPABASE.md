# Sky-oppsett — innlogging og synk

Appen er statisk (GitHub Pages) og kan ikke lagre noe selv. Innlogging og lagring
ligger derfor hos **Supabase**, som nettleseren snakker med direkte.

Prosjektet er `xoripdwbghqlzbgxkfps` (Forge Bakery). Nøkkelen i `js/sky.js` er
**publishable/anon** — den er laget for å ligge åpent i frontend-kode. Sikkerheten
ligger i **Row Level Security** under: en rad kan bare leses og skrives av eieren.

## 1 · Kjør denne SQL-en én gang

Supabase → **SQL Editor** → ny spørring → lim inn → **Run**.

```sql
-- Én rad per bruker. Hele apptilstanden ligger som JSON i `state`.
create table if not exists public.bakerstate (
  bruker_id  uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  oppdatert  timestamptz not null default now()
);

-- Låsen: uten denne kunne hvem som helst med anon-nøkkelen lese alle rader.
alter table public.bakerstate enable row level security;

-- Fire regler, alle med samme betingelse: du er raden din.
drop policy if exists "egen rad lesing"    on public.bakerstate;
drop policy if exists "egen rad innsetting" on public.bakerstate;
drop policy if exists "egen rad oppdatering" on public.bakerstate;
drop policy if exists "egen rad sletting"  on public.bakerstate;

create policy "egen rad lesing"      on public.bakerstate
  for select using (auth.uid() = bruker_id);
create policy "egen rad innsetting"  on public.bakerstate
  for insert with check (auth.uid() = bruker_id);
create policy "egen rad oppdatering" on public.bakerstate
  for update using (auth.uid() = bruker_id) with check (auth.uid() = bruker_id);
create policy "egen rad sletting"    on public.bakerstate
  for delete using (auth.uid() = bruker_id);
```

## 2 · Innloggingsinnstillinger

**Authentication → Providers → Email**: e-post + passord skal være på (standard).

**Authentication → URL Configuration**: legg inn appens adresse under *Site URL* og
*Redirect URLs*, ellers virker ikke «glemt passord»-lenken:

```
https://btoreid.github.io/Forge-bakery/
```

Appen lå tidligere på `/Forge-bakery/index-v2.html`. Den adressen videresender nå hit — med
fragmentet (`#access_token=…`) intakt, for det er der innloggingsnøkkelen fra e-postlenker
ligger. Gamle bekreftelses-e-poster virker derfor fortsatt.

**E-postbekreftelse** (*Confirm email*) er på som standard. Da må du bekrefte adressen
før første innlogging. Vil du slippe det mens du tester, kan den slås av samme sted.

## 3 · Gratis-tieren pauses etter en ukes inaktivitet

Prosjektet fryses (data slettes ikke) hvis ingen snakker med det på sju dager. Bruker du
appen ukentlig, skjer det aldri. `.github/workflows/supabase-ping.yml` holder det uansett
i live med et lite kall hvert døgn.

**Den fila ligger på `master`** (commit `0d675a6`), ikke bare på utviklingsgrenen — GitHub
leser `schedule:` kun fra standardgrenen. Endrer du pingen, må endringen dit for å få
effekt. Første kjøring er 06:17 UTC; du kan også starte den manuelt under **Actions →
Supabase ping → Run workflow**.

## Slik henger det sammen i koden

| fil | rolle |
|---|---|
| `js/vendor/supabase.js` | supabase-js, vendoret lokalt (som fontene) — ingen CDN-avhengighet |
| `js/sky.js` | hele sky-laget: `Sky.loggInn/registrer/loggUt/hentNed/lagreOpp` |
| `js/app-v2.js` | `lagre()` speiler opp ved innlogget bruker; `tegnKonto()` er UI-et i Logg |

**Lokalt først:** localStorage er fortsatt sannheten mens du bruker appen, så alt virker
offline og uten konto. Opplasting er debouncet 1,2 s (en skyver som dras skal ikke bli
hundre nettverkskall). Ved innlogging sammenlignes `oppdatert`-tidsstempelet, og **den
nyeste versjonen vinner** — ellers ville en gammel kopi på PC-en overskrevet en fersk
logg fra telefonen.


---

## Delt maskinkalibrering (lagt til 31.07.2026)

Bjørn: «dersom jeg gjør kalibrering, så må de oppdatere seg og gjelde for alle
som har den maskinen, ikke bare min konto» — og «det er kun min epost som eier
repo som får skrive».

Friksjonstallene i `MASKIN_INFO` er klasseanslag. For Ooni Halo Pro finnes ingen
produsentoppgitt verdi i det hele tatt (se `PARAMETERREVISJON.md`). Én ekte
måling er derfor mer verdt enn tabellen, og den bør komme alle til gode.

Kjør denne i Supabase → SQL Editor:

```sql
create table if not exists public.maskinkalibrering (
  maskin_id  text primary key,
  friksjon   numeric not null check (friksjon > 0 and friksjon < 5),
  deigvekt   integer,
  notat      text,
  oppdatert  timestamptz not null default now()
);

alter table public.maskinkalibrering enable row level security;

-- ALLE innloggede kan LESE. Poenget er nettopp at målingen skal komme andre
-- til gode.
create policy "alle kan lese kalibreringer"
  on public.maskinkalibrering for select
  to authenticated
  using (true);

-- KUN eieren av repoet kan skrive. E-posten leses fra JWT-en, ikke fra noe
-- klienten sender — en bruker kan ikke lyve seg til skrivetilgang.
create policy "kun eier kan sette inn"
  on public.maskinkalibrering for insert
  to authenticated
  with check (auth.jwt() ->> 'email' = 'bjorn@medthings.no');

create policy "kun eier kan oppdatere"
  on public.maskinkalibrering for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'bjorn@medthings.no')
  with check (auth.jwt() ->> 'email' = 'bjorn@medthings.no');
```

**Merk at det ikke finnes noen delete-policy.** Uten den kan ingen slette rader,
heller ikke eieren — en kalibrering rettes ved å overskrive den, ikke ved å
fjerne den. Det er med vilje: en app som plutselig mangler et tall den hadde, er
verre enn en app med et gammelt tall.

Endres e-posten, må begge policyene skrives om. De står som to separate policyer
fordi PostgreSQL krever `with check` på insert og både `using` og `with check` på
update — én felles policy ville ikke dekket begge riktig.

---

## Sjekk at det ble riktig

Kjørte du feil spørring først, eller er du usikker på om alt gikk gjennom: kjør
denne i SQL Editor. Den skriver ingenting — den leser bare skjemaet og gir én
linje per regel, med ✅ eller ❌.

```sql
select sjekk,
       case when ok then '✅ ok' else '❌ IKKE OK' end as status,
       detalj
from (
  select 'bakerstate · tabellen finnes' as sjekk,
         to_regclass('public.bakerstate') is not null as ok,
         'holder din egen tilstand' as detalj
  union all
  select 'bakerstate · RLS er på',
         coalesce((select relrowsecurity from pg_class
                   where oid = to_regclass('public.bakerstate')), false),
         'uten den kan hvem som helst lese alles data'
  union all
  select 'bakerstate · fire policyer (les/sett inn/oppdater/slett)',
         (select count(*) from pg_policies
          where schemaname = 'public' and tablename = 'bakerstate') = 4,
         'fant ' || (select count(*) from pg_policies
                     where schemaname = 'public' and tablename = 'bakerstate')
  union all
  select 'maskinkalibrering · tabellen finnes',
         to_regclass('public.maskinkalibrering') is not null,
         'den delte tabellen'
  union all
  select 'maskinkalibrering · RLS er på',
         coalesce((select relrowsecurity from pg_class
                   where oid = to_regclass('public.maskinkalibrering')), false),
         'uten den kan hvem som helst overskrive kalibreringene'
  union all
  select 'maskinkalibrering · alle innloggede kan lese',
         (select count(*) from pg_policies
          where schemaname = 'public' and tablename = 'maskinkalibrering'
            and cmd = 'SELECT') = 1,
         'fant ' || (select count(*) from pg_policies
                     where schemaname = 'public' and tablename = 'maskinkalibrering'
                       and cmd = 'SELECT') || ' select-policy'
  union all
  select 'maskinkalibrering · kun eier kan skrive',
         (select count(*) from pg_policies
          where schemaname = 'public' and tablename = 'maskinkalibrering'
            and cmd in ('INSERT', 'UPDATE')) = 2,
         'skal være to: én insert, én update'
  union all
  select 'maskinkalibrering · e-posten står i begge skrivepolicyene',
         (select count(*) from pg_policies
          where schemaname = 'public' and tablename = 'maskinkalibrering'
            and cmd in ('INSERT', 'UPDATE')
            and coalesce(qual, '') || coalesce(with_check, '')
                ilike '%bjorn@medthings.no%') = 2,
         'skrivetilgangen henger på JWT-e-posten'
  union all
  select 'maskinkalibrering · INGEN slettepolicy',
         (select count(*) from pg_policies
          where schemaname = 'public' and tablename = 'maskinkalibrering'
            and cmd = 'DELETE') = 0,
         'med vilje — en kalibrering rettes ved å overskrives, ikke fjernes'
) t
order by ok, sjekk;
```

Alle ni skal si ✅. Er noen ❌, kjør SQL-en over på nytt — den er skrevet med
`create table if not exists`, så den kan kjøres flere ganger uten skade.
Policyene tåler det derimot ikke: `create policy` feiler hvis policyen finnes
fra før. Får du «policy already exists», er den alt på plass — hopp over den.

### Ble det liggende igjen noe fra en feil spørring?

Denne lister ALT som finnes i `public`, så du ser om noe uventet står igjen:

```sql
select table_name as tabell,
       (select count(*) from pg_policies p
        where p.schemaname = 'public' and p.tablename = t.table_name) as antall_policyer
from information_schema.tables t
where table_schema = 'public' and table_type = 'BASE TABLE'
order by table_name;
```

Det skal stå nøyaktig to rader: `bakerstate` (4 policyer) og `maskinkalibrering`
(3). Står det flere tabeller, er de fra noe annet — en tom tabell gjør ingen
skade, men `drop table public.<navn>;` rydder den bort.
