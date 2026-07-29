/* ============================================================
   FORGE BAKERY — datagrunnlag
   Mel, frø, forferment, stekeprofiler, presets og fagstoff.
   Kilder er notert i teksten. Estimater er merket (est).
   ============================================================ */

/* ---------- MEL ----------
   absorpsjon = relativt vannbehov, 1.00 = siktet hvetemel.
   Blandingens faktor = Σ(andel × absorpsjon).
   kr = kilopris (fra ditt eget regneark der den fantes).
   maxPct = praktisk tak i et frittstående brød.
   grov = 1 for sammalt/fullkorn, 0 for siktet. Dette feltet er ikke kosmetisk:
          det er telleren i Brødskala'n-utregningen (se GROVHET og engine.js).

   ── KILDESTATUS PER FELT, ærlig oppgitt ──────────────────────────────────
   Feltene her har svært ulik etterprøvbarhet, og det var ikke synlig før nå.
   Behandle dem deretter:

     protein     DEKLARASJON. Tallet står på pakka eller i møllas datablad, og
                 kan etterprøves i butikk. Men det er en deklarasjon med
                 avrundingsslingring, ikke en måling gjort her — og det sier
                 ingenting om glutenKVALITET. Se `glutenbidrag` i MEL_INFO,
                 som er det feltet du faktisk skal styre etter.
     kr          OBSERVERT DAGLIGVAREPRIS, norsk marked, juli 2026. Ferskvare:
                 disse råtner. Er de mer enn et år gamle, stemmer ikke
                 kostnadsregnskapet lenger.
     absorpsjon  ⚠ APPENS EGEN ARBEIDSVERDI — ikke en publisert måling. Ingen
                 norsk mølle publiserer farinografopptak for forbrukermel.
                 Verdiene er satt relativt til siktet hvete = 1,00 og er
                 innbyrdes konsistente, men de kan ikke slås opp noe sted.
                 To unntak har faktisk måling bak seg og sier det i notatet:
                 enkorn (−6 prosentpoeng mot brødhvete) og bokhvete
                 (farinografopptak 54,8 → 52,6 % ved innblanding).
                 Avviker din deig fra tallet, er det TALLET som er feil.
     styrke      ⚠ SKJØNNSKATEGORI, ikke en måleskala. Sju trinn uten definert
                 prøvemetode. Der W-verdi finnes (Caputo) står den i notatet
                 og er produsentens egen; for norsk mel finnes ingen publisert
                 W i det hele tatt, og trinnet er da et anslag.
     maxPct      ⚠ ANSLAG basert på bakepraksis, ikke måledata.
   ─────────────────────────────────────────────────────────────────────────  */
const FLOURS = [
  // Siktet hvete
  { id:'regal_standard',  navn:'Regal Hvetemel standard ★',        gruppe:'Siktet hvete', protein:13.0, absorpsjon:1.02, styrke:'middels-sterk', maxPct:100, kr:10.0, grov:0,
    notat:'Det sterkeste melet du får i vanlig daglivare. Møllas egen beskrivelse: «svært god glutenkvalitet og høyt falltall». Inneholder askorbinsyre, som er en fordel her — det er en oksidant som strammer deigen. Ingen norsk mølle publiserer W, men anslag er 250–300. Førstevalg når mye av melet er glutenfritt.' },
  { id:'hvetemel',        navn:'Møllerens hvetemel siktet',        gruppe:'Siktet hvete', protein:12.2, absorpsjon:1.00, styrke:'middels',       maxPct:100, kr:10.0, grov:0,
    notat:'78 % utmaling. Tåler mye juling i maskinen og er tilgivende under heving, men svakere enn Regal standard. Ikke sterk nok alene til 80 %+ ciabatta.' },
  { id:'regal_relax',     navn:'Regal Hvetemel relax',             gruppe:'Siktet hvete', protein:12.0, absorpsjon:1.00, styrke:'middels',       maxPct:100, kr:10.0, grov:0,
    notat:'Uten askorbinsyre. Velg denne når du VIL ha ubehandlet mel — men til en deig med 30 % enkorn gir du fra deg strammingen du trenger.' },
  { id:'hvetemel_sterkt', navn:'Sterkt hvetemel / manitoba (W300+)', gruppe:'Siktet hvete', protein:14.0, absorpsjon:1.04, styrke:'sterk',        maxPct:100, kr:24.0, grov:0,
    notat:'Caputo Cuoco, Manitoba Oro o.l. Eneste trygge valg for ciabatta over 80 %. Kan brukes 20–40 % for å forsterke svakt norsk mel.' },
  { id:'hvetemel_stein',  navn:'Steinmalt hvetemel (Holli/Kvelde)', gruppe:'Siktet hvete', protein:12.5, absorpsjon:1.02, styrke:'middels',       maxPct:100, kr:22.0, grov:0,
    notat:'Smaker mye mer, men tåler mindre elting og kortere bulk. Halver eltetiden, forleng autolysen.' },
  { id:'caputo_cuoco',    navn:'Caputo Cuoco «rød» Tipo 00 ★★',     gruppe:'Siktet hvete', protein:13.0, absorpsjon:1.02, styrke:'sterk',         maxPct:100, kr:59.9, grov:0,
    notat:'W 300–320, P/L 0,45–0,55. Det STERKESTE melet du har, og det eneste som når den publiserte terskelen på W 300+ for ciabatta over 80 % hydrering. Laget for 24–72 timers modning, altså nøyaktig det du driver med. 55 % utmaling og svært fint malt. Ulempen er prisen: ca. 60 kr/kg mot Regals 10. Bruk den der styrken faktisk betaler seg — ciabatta, biga, og som forsterkning når du går grovt eller vått.' },
  { id:'caputo_blaa',     navn:'Caputo Pizzeria «blå» Tipo 00',     gruppe:'Siktet hvete', protein:12.5, absorpsjon:0.97, styrke:'middels-sterk', maxPct:100, kr:59.9, grov:0,
    notat:'W 260–280, P/L 0,50–0,60. Konstruert for 55–67 % hydrering og korte til middels modninger. God til pizza og til biga, men den røde Cuoco er et klart bedre valg til brød.' },
  { id:'tipo00',          navn:'Tipo 00 pizzamel (generisk)',       gruppe:'Siktet hvete', protein:12.5, absorpsjon:0.97, styrke:'middels',       maxPct:100, kr:20.0, grov:0,
    notat:'55 % utmaling. Fin til pizza på 60–67 %, ikke til ciabatta på 85 %.' },
  { id:'landhvete',       navn:'Landhvete siktet (Holli)',          gruppe:'Siktet hvete', protein:11.0, absorpsjon:0.98, styrke:'svak-middels',  maxPct:60,  kr:32.0, grov:0,
    notat:'Norsk landrase. Glutenkvalitet ligger mellom spelt og moderne hvete. Dyp kornsmak.' },
  { id:'regal_tipo00',    navn:'Regal Tipo 00 ★',                   gruppe:'Siktet hvete', protein:13.0, absorpsjon:1.00, styrke:'sterk',         maxPct:100, kr:34.0, grov:0,
    notat:'Beste norske kjøp. 13 % protein av 100 % norsk vårhvete, ingen askorbinsyre, i vanlig dagligvare til ca. halve prisen av Caputo. Møllas egen beskrivelse: glutenet er «elastisk og krever grundig elting». Norsk vårhvete gir kraftigere og mer elastisk gluten enn italiensk grano tenero — sterkere struktur, men strammere deig som trenger lengre benkehvile mellom foldinger. Falltall er ikke publisert, så oppførselen over 48 timer er uverifisert.' },
  { id:'kolonihagen',     navn:'Kolonihagen siktet hvete (øko)',    gruppe:'Siktet hvete', protein:14.0, absorpsjon:1.01, styrke:'sterk',         maxPct:100, kr:31.0, grov:0,
    notat:'14 % deklarert protein, helt rent — ingen askorbinsyre, ingen enzymer — til 31 kr/kg, og obligatorisk i de største REMA-butikkene. Fiberverdien på 5,0 g er konsistent med et ekte siktet mel. Men 14 % protein sier ingenting om KVALITETEN på glutenet, og verken falltall eller glutenstyrke er publisert. Verdt en test.' },
  { id:'mollerens_tipo00',navn:'Møllerens Pizzamel Tipo 00',        gruppe:'Siktet hvete', protein:12.5, absorpsjon:0.98, styrke:'middels-sterk', maxPct:100, kr:32.8, grov:0,
    notat:'Ny vare med bredest distribusjon av alle tipo 00-ene, og uten askorbinsyre. Produsenten oppgir «sterke hvetesorter» og ca. 55 % utmaling. Uprøvd — ingen uavhengige tester ennå.' },
  { id:'manitoba_oro',    navn:'Caputo Manitoba Oro (blandemel)',   gruppe:'Siktet hvete', protein:14.0, absorpsjon:1.05, styrke:'sterk',         maxPct:40,  kr:64.9, grov:0,
    notat:'W 360–380, farinografstabilitet 16–20 minutter, våtgluten over 45 %. Caputo kaller den selv farina da taglio — blandemel. Alene gir så høy styrke ofte en deig som strammer seg og lukker krummen; innblandet 15–30 % i Cuoco eller Regal Tipo 00 gir den mer løft enn den gjør alene.' },

  // Grovt hvete
  { id:'samalt_hvete',    navn:'Sammalt hvete fin',                 gruppe:'Grovt',        protein:13.4, absorpsjon:1.19, styrke:'svak-middels',  maxPct:60,  kr:18.0, grov:1,
    notat:'Fin kli kutter glutenet mer enn grov kli gjør. Bløtlegg eller kjør lang autolyse.' },
  { id:'samalt_hvete_grov',navn:'Sammalt hvete grov',               gruppe:'Grovt',        protein:13.4, absorpsjon:1.17, styrke:'svak-middels',  maxPct:50,  kr:18.0, grov:1,
    notat:'Grov kli skader volumet mindre enn fin kli (målt). Bør bløtlegges 30 min i halve vannmengden.' },
  { id:'fullkorn_fibra',  navn:'Fullkornshvete ekstra finmalt',     gruppe:'Grovt',        protein:13.2, absorpsjon:1.16, styrke:'middels',       maxPct:100, kr:20.0, grov:1,
    notat:'Den snilleste norske fullkornshveten. Malt av ekstra bakekraftige sorter.' },

  // Rug
  { id:'rug_siktet',      navn:'Rugmel siktet',                     gruppe:'Rug',          protein:6.5,  absorpsjon:1.08, styrke:'ingen',         maxPct:25,  kr:16.5, grov:1,
    notat:'Ingen glutennettverk. Absorpsjonen er tidsavhengig — deigen strammer seg etter elting.' },
  { id:'samalt_rug',      navn:'Sammalt rug fin',                   gruppe:'Rug',          protein:9.2,  absorpsjon:1.15, styrke:'ingen',         maxPct:25,  kr:30.0, grov:1,
    notat:'Over 20 % uten surdeig blir klissete. 10–15 % er sweet spot i et hvetebrød.' },
  { id:'samalt_rug_grov', navn:'Sammalt rug grov',                  gruppe:'Rug',          protein:9.1,  absorpsjon:1.20, styrke:'ingen',         maxPct:25,  kr:30.0, grov:1,
    notat:'Over 40 % må i form. La brødet hvile 12–24 t før skjæring.' },
  { id:'svedjerug',       navn:'Svedjerug sammalt',                 gruppe:'Rug',          protein:10.2, absorpsjon:1.18, styrke:'ingen',         maxPct:25,  kr:54.0, grov:1,
    notat:'Den mest aromatiske rugen — røykaktig, dyp og kompleks, med mer aroma per prosentpoeng enn vanlig rug. Samme amylase- og pentosanproblematikk, så behandle den som rug og ikke som hvete. Fås fra Holli, Sigdal og Norsk Urkorn, kun nett.' },

  // Urkorn
  { id:'enkorn',          navn:'Enkorn (einkorn)',                  gruppe:'Urkorn',       protein:13.0, absorpsjon:0.90, styrke:'svært svak',    maxPct:35,  kr:35.0, grov:1,
    notat:'LAVEST absorpsjon av alt melet her (−6 prosentpoeng målt mot brødhvete). Diploid, nesten ingen HMW-glutenin. Topper ca. 30 % tidligere enn hvete og KOLLAPSER så. Elt maks 3–4 min. Undergjær med vilje. 9–11× karotenoid = gyllen krumme.' },
  { id:'emmer',           navn:'Emmer siktet',                      gruppe:'Urkorn',       protein:12.7, absorpsjon:0.97, styrke:'svak',          maxPct:40,  kr:38.0, grov:0,
    notat:'«Spelt med mer protein». Svært kort farinografstabilitet. Ikke kutt vannet like hardt som ved enkorn.' },
  { id:'spelt_siktet',    navn:'Spelt siktet',                      gruppe:'Urkorn',       protein:14.3, absorpsjon:0.98, styrke:'svak',          maxPct:100, kr:41.0, grov:0,
    notat:'HØYT protein, SVAKT gluten: glutenindeks i snitt 59 mot hvetens 97–100. Farinografstabiliteten er målt til 9,5 minutter i snitt mot hvetens 17,5 — altså omtrent halvparten, ikke fire minutter, som en eldre versjon av denne appen hevdet. Spennet mellom speltsorter er dessuten enormt (0–19,6 min), så sortsvalg betyr mer enn arten. Det springende punktet er kinetikken, ikke kapasiteten: spelt tar opp vannet SENERE enn hvete, så deigen skal være klissete tidlig og strammer seg opp underveis. Ikke kompenser med mer mel.' },
  { id:'samalt_spelt',    navn:'Sammalt spelt grov',                gruppe:'Urkorn',       protein:13.4, absorpsjon:1.12, styrke:'svak',          maxPct:40,  kr:45.0, grov:1,
    notat:'' },

  // Andre korn
  { id:'havremel',        navn:'Havremel sammalt',                  gruppe:'Andre korn',   protein:14.0, absorpsjon:1.18, styrke:'ingen',         maxPct:20,  kr:27.5, grov:1,
    notat:'7 g fett/100 g — høyest fettinnhold av alt melet. Betaglukan gjør det tørst. Tak 35–40 %.' },
  { id:'byggmel',         navn:'Byggmel sammalt',                   gruppe:'Andre korn',   protein:8.7,  absorpsjon:1.20, styrke:'ingen',         maxPct:15,  kr:26.0, grov:1,
    notat:'Høy betaglukan — svært tørst og ikke-lineær. Aktivt ødeleggende for gluten.' },
  { id:'durum',           navn:'Durummel',                          gruppe:'Andre korn',   protein:13.0, absorpsjon:1.02, styrke:'middels',       maxPct:40,  kr:24.0, grov:0,
    notat:'Sterkt, men lite ekstensibelt (høy P/L). Bland, ikke bruk alene.' },
  { id:'kikertmel',       navn:'Kikertmel',                         gruppe:'Andre korn',   protein:19.0, absorpsjon:1.04, styrke:'ingen',         maxPct:20,  kr:101.0, grov:1,
    notat:'Overraskende nyttig i små doser: målt GA 10 % kikertmel HØYERE deigstabilitet enn kontrollen — først fra 20 % falt den. Gir fyldig nøtteaktig-smøraktig dybde og pen gul krumme. Rå smaker den bønneaktig og litt bitter, men det mildner betydelig ved steking. Merk at de 19 g protein ikke er glutendannende i det hele tatt.' },
  { id:'bokhvete',        navn:'Bokhvetemel',                       gruppe:'Andre korn',   protein:11.7, absorpsjon:0.97, styrke:'ingen',         maxPct:20,  kr:110.0, grov:1,
    notat:'Ikke et korn i det hele tatt, men en frøplante i syrefamilien. Vannopptaket er MÅLT LAVERE enn siktet hvetemel — farinografopptaket sank fra 54,8 til 52,6 % ved innblanding, noe som overrasker de fleste. Kraftig jordaktig og nøtteaktig smak, men med en bitter ettersmak som bygger seg: 10 % er deilig og rustikk, 25 % smaker medisinsk.' },
  { id:'annet',           navn:'Annet mel',                         gruppe:'Andre korn',   protein:12.0, absorpsjon:1.05, styrke:'ukjent',        maxPct:100, kr:40.0, grov:1,
    notat:'Fritt felt — juster kilopris selv.' }
];

/* ---------- FRØ OG BLØTLEGG ----------
   vannKaldt / vannVarmt = gram vann som faktisk BINDES per 100 g tørt.
   Kaldbløt: hell ~1,85× det som bindes og hell av overskuddet, slik at
   ingenting blir tørt. Skålding (varmt): hell nøyaktig det som bindes —
   alt vannet skal med i deigen, for det er skåldevannet som bærer
   sukkerartene og stivelsen skåldingen frigjør.

   `korn` er IKKE et smaksfelt — det avgjør om ingrediensen teller i grovheten.
   Brødskala'n regner hele korn, sammalt mel, kli og gryn av korn som grovt,
   og holder frø og nøtter HELT utenfor regnestykket (BKLF, se GROVHET under).
   Havregryn, rugknekk, byggflak, knekt hvete og hvetekli er korn og teller.
   Solsikke, lin, sesam, gresskar og chia er frø og teller ikke — verken i
   telleren eller nevneren. Det er derfor feltet finnes.

   ⚠ Vannbindingstallene er appens egne arbeidsverdier, ikke publiserte
   måledata. De er konsistente med hverandre og med bakepraksis, men ingen
   av dem kan slås opp i en kilde. Behandle dem som kalibrerbare: avviker
   ditt bløt fra tallet, er det tallet som skal justeres.                  */
const SOAKERS = [
  { id:'solsikke',  navn:'Solsikkekjerner', kaldt:80,  varmt:80,  type:'kaldt', korn:false, kr:88.0, notat:'Temperaturuavhengig — varm bløtlegging gir ingenting. ⚠ Solsikke er blant de MINST tørste frøene (80 g/100 g mot linfrøets 130 og chiaens 237), har skall og ~50 % fett. Under ca. 8 % av melet er bløtlegging valgfritt — vannet de stjeler er da under 3 prosentpoeng hydrering, som du enkelt kompenserer med litt mer vann. Over 10 % begynner det å bety noe. Rist dem uansett: det er ristingen som gir smaken, ikke bløtleggingen. Rister du OG bløtlegger, bruk kaldt vann og kort tid — pyrazinene er vannløselige og flyktige, så en lang eller varm bløt vasker ut nettopp det du ristet fram.' },
  { id:'linfro',    navn:'Linfrø hele',     kaldt:130, varmt:136, type:'kaldt', korn:false, kr:56.0, notat:'Slimstoffdrevet. Hele linfrø går rett gjennom deg om de ikke knuses.' },
  { id:'linfro_malt',navn:'Linfrø malt',    kaldt:300, varmt:320, type:'kaldt', korn:false, kr:56.0, notat:'(est) Geléer aggressivt. Kalibrer selv — spennet er 250–350.' },
  { id:'sesam',     navn:'Sesamfrø',        kaldt:58,  varmt:68,  type:'kaldt', korn:false, kr:70.0, notat:'Ristes oftere enn den bløtlegges.' },
  { id:'gresskar',  navn:'Gresskarkjerner', kaldt:38,  varmt:48,  type:'kaldt', korn:false, kr:95.0, notat:'Lavest absorpsjon av alle vanlige frø.' },
  { id:'havregryn', navn:'Havregryn',       kaldt:90,  varmt:206, type:'begge', korn:true,  kr:22.0, notat:'Størst forskjell kaldt/varmt av alt (+116 g). Slipper fuktighet som damp under steking.' },
  { id:'ruggryn',   navn:'Ruggryn / rugknekk', kaldt:65, varmt:154, type:'varmt', korn:true, kr:26.0, notat:'MÅ skåldes. Kaldbløtlagt rugknekk blir grus i brødet.' },
  { id:'knekt_hvete',navn:'Knekt hvete',    kaldt:178, varmt:225, type:'varmt', korn:true,  kr:20.0, notat:'' },
  { id:'hvetekli',  navn:'Hvetekli',        kaldt:96,  varmt:168, type:'begge', korn:true,  kr:25.0, notat:'Gråsone: oppfører seg nesten som mel. Vurder å telle den i melmengden.' },
  { id:'byggflak',  navn:'Byggflak',        kaldt:125, varmt:200, type:'varmt', korn:true,  kr:30.0, notat:'' },
  { id:'chia',      navn:'Chiafrø',         kaldt:237, varmt:276, type:'kaldt', korn:false, kr:120.0, notat:'Ignorer «10–12× egen vekt» — det er svellevolum, ikke det deigen faktisk mister.' }
];

/* ---------- STEKEPROFILER ---------- */
const BAKE_PROFILES = [
  { id:'brod_gryte', navn:'Rundbrød i støpejernsgryte', vekt:'800–900 g', hydrering:'70–75 %',
    inn:260, ned:230, nedNaar:'straks døra lukkes', damp:'ingen tilsatt — brødet damper seg selv', dampTid:'lokk på 20 min',
    rist:'nederste tredel', tid:'45–50 min', kjerne:'96–99 °C', luft:'lokk av etter 20 min, dørspalte siste 5 min',
    notat:'Best enkeltinvestering for ovnsløft hjemme. Løser damp og bunnvarme i én gjenstand. Over 270 °C setter skorpa seg før brødet er ferdig utvidet.' },
  { id:'brod_apen', navn:'Rundbrød åpen steking på stein/stål', vekt:'800–900 g', hydrering:'70–75 %',
    inn:270, ned:240, nedNaar:'straks døra lukkes, så 230 etter 25 min', damp:'50–75 ml KOKENDE vann i forvarmet støpejernspanne', dampTid:'15–20 min',
    rist:'nederste tredel', tid:'45–50 min', kjerne:'96–99 °C', luft:'ta ut dampkaret etter 18 min',
    notat:'Brød lavt i ovnen: bunnvarmen driver løftet, og du trenger takhøyde — et brød spretter 8–12 cm og setter skorpa for tidlig hvis toppen er nær elementet.' },
  { id:'brod_600', navn:'Mindre brød', vekt:'600 g', hydrering:'70–75 %',
    inn:260, ned:230, nedNaar:'straks', damp:'som over', dampTid:'15 min',
    rist:'nederste tredel', tid:'35–40 min', kjerne:'96–98 °C', luft:'damp ut etter 17 min', notat:'' },
  // 230 °C, ikke 250: Pyrexen tåler 220 °C termisk sprang, og 5-graders deig ned
  // i en 250-graders gryte er 245. Resten av appen har hele tiden sagt 230 —
  // denne profilen var det eneste stedet som sa noe annet.
  // Vekten er satt ned til 700–800 g av samme grunn som utstyrslista oppgir:
  // innvendig 21,5 × 13,5 cm blir trangt for et 900 g emne etter ovnsløftet.
  { id:'brod_glass_stal', navn:'★ Rundbrød — glassgryte PÅ 15 mm stål', vekt:'700–800 g', hydrering:'72–78 %',
    inn:230, ned:230, nedNaar:'hold den der', damp:'ingen tilsatt — gryta holder på brødets eget damp', dampTid:'lokk på 20 min',
    rist:'gryta står oppå det forvarmede stålet, nederste tredel', tid:'45–50 min', kjerne:'96–99 °C', luft:'lokk av etter 20 min, dørspalte siste 5 min',
    notat:'Dette er det beste du får ut av utstyret du har. Stålet leverer ca. 213 °C kontakttemperatur til bunnen ved 230-graders ovn (232-tallet gjelder 250 °C, som Pyrexen ikke tåler), glasset leverer dampen. Glasset alene gir bare ~140 °C mot bunnen — det er der ovnsløftet forsvinner. Forvarm stålet 90–120 min. LES ADVARSELEN om termisk sjokk under Utstyr før du forvarmer glasset.' },
  // 230 °C av samme grunn som glassgryte-profilen over: Pyrexen tåler 220 °C
  // termisk sprang, og en romtemperert kloke inn i 260-graders ovn er 235+.
  // Denne profilen stod alene på 260 og motsa både utstyrslista og tipset om
  // forvarming — det var en reell bruddrisiko, ikke bare et avvik.
  // 700–800 g av samme grunn som glassgryte-profilen: innvendig 21,5 cm blir
  // trangt for et 900 g emne etter ovnsløftet — kloken er samme gryte.
  { id:'brod_kloke', navn:'★ Rundbrød — brød på stålet, glasset som kloke over', vekt:'700–800 g', hydrering:'72–78 %',
    inn:230, ned:230, nedNaar:'hold den der', damp:'brødets eget, fanget under glasset', dampTid:'glasset av etter 20 min',
    rist:'direkte på stålet, nederste tredel', tid:'45–50 min', kjerne:'96–99 °C', luft:'glasset av etter 20 min',
    notat:'Teoretisk det sterkeste oppsettet: full stålkontakt mot deigen OG et lukket dampkammer. Krever at gryta er dyp nok til å dekke brødet uten å røre det. King Arthurs egen sammenligning kåret nettopp «støpejern + kokende vann + opp-ned bolle over brødet» til vinner. MAKS 230 °C med Pyrex som kloke — glasset tåler 220 °C termisk sprang, så det skal aldri inn i en varmere ovn enn det. LES ADVARSELEN om termisk sjokk under Utstyr før du forvarmer glasset.' },
  { id:'ciabatta', navn:'Ciabatta — 15 mm stål', vekt:'200–300 g biter', hydrering:'80–85 %',
    inn:260, ned:230, nedNaar:'straks', damp:'50 ml kokende vann i forvarmet støpejern', dampTid:'10–12 min',
    rist:'MIDTEN', tid:'20–25 min', kjerne:'97–99 °C', luft:'ta ut dampkaret etter 12 min',
    notat:'Ciabatta midt i ovnen fordi bunnflaten mot volumet er ca. 3× et rundbrøds — den svir seg før krummen setter seg. Trenger heller ikke bunnkick, den utvider seg sidelengs.' },
  { id:'baguette', navn:'Baguetter', vekt:'250–350 g', hydrering:'68–73 %',
    inn:260, ned:240, nedNaar:'straks', damp:'75 ml kokende vann i støpejern på ovnsbunnen', dampTid:'12–15 min',
    rist:'nedre-midt', tid:'22–28 min', kjerne:'96–98 °C', luft:'damp ut 15 min. Valgfritt: slå av ovnen, sett døra 5 cm på gløtt og kjøl ned i ovnen for maks sprøhet.',
    notat:'Baguetter skal ikke langtidsheve — kjør 3–4 timer bulk. Poolish gjør smaksjobben.' },
  { id:'focaccia', navn:'Focaccia i form', vekt:'~700 g / 25 cm form', hydrering:'75–85 %',
    inn:240, ned:220, nedNaar:'straks', damp:'ingen', dampTid:'—',
    rist:'nederste tredel', tid:'25–30 min (snu etter 15)', kjerne:'94 °C', luft:'—',
    notat:'Bunnskorpa lages av ledningsvarme nedenfra pluss nok olje i formen til at den frityrsteker seg. Salamoia (like deler vann og olivenolje + 2 % salt, pisket) helles i søylepyttene rett før steking.' }
];

/* ---------- FORVALG (presets) ----------
   refPlan er DIN dokumenterte prosess. Appen regner ut gjæringsdosen
   av den planen og bruker den som mål — så alt annet kalibreres mot
   noe du allerede vet fungerer.

   KALIBRERT 29.07.2026: gjaerPct er nå løst numerisk slik at hvert forvalg
   treffer måltallet (2,30 − 0,40×grovt) × (1 − 0,6×forfermentandel) — det samme
   målet Bygg brød sikter mot. Før bar hvert forvalg en gjærmengde hentet fra
   notater og konvensjonelle oppskrifter, og dosene spredte seg fra 1,53 til 2,99
   mens formelen siktet mot 1,61–2,30. Det gjorde at appens to halvdeler var
   uenige om hva riktig gjæringsgrad er — og referansedosen i «Gjæring & tid»,
   som alt måles avvik mot, arvet den uenigheten.
   Gamle verdier står i parentes bak hver linje.                        */
const PRESETS = [
  {
    id:'brod_standard',
    navn:'Standardbrød 70 % (sammalt hvete)',
    beskrivelse:'Grunnoppskriften fra notatene dine: 1 % fersk gjær, 3–4 t bulk, 18–24 t på kjøl.',
    // Frømengden var 300 + 150 g = 28,8 % av melet. Appens egne anbefalinger er
    // 6 % solsikke og 3 % lin, og 28,8 % koster ca. HALVE ovnsløftet: glutenbærende
    // andel falt til 50,4 %, og 9,6 % lin er langt inne i sonen der deigstabiliteten
    // kollapser. Hydreringen er hevet 72→75 % i tråd med absFaktor for blandingen.
    hydrering:75, salt:1.8, antall:4, vektPerBrod:900,
    mel:[ {id:'regal_standard', pct:65}, {id:'samalt_hvete', pct:27}, {id:'samalt_rug', pct:8} ],
    fro:[ {id:'solsikke', gram:96, varmt:false}, {id:'linfro', gram:48, varmt:false} ],
    forferment:{ bruk:false, type:'poolish', pctMel:20, hydrering:100, timer:14, temp:22 },
    gjaerType:'torr', gjaerPct:0.234,   // kalibrert til dose 2,16 (var 0,333 → 2,99)
    refPlan:[
      { navn:'Bulk (romtemp)',    timer:3.5, temp:24, miljo:24 },
      { navn:'Kjøleskap (utbakt i hevekurv)', timer:20, temp:24, miljo:3.5, utbakt:true }
    ],
    steking:'brod_apen',
    notat:'Frøene teller ikke i hydreringen (samme konvensjon som regnearket ditt), men de stjeler ca. 340 g vann fra deigen. Se «effektiv hydrering».'
  },
  {
    id:'ciabatta',
    navn:'Ciabatta 82 % med biga',
    beskrivelse:'Stiv biga på 45 % vann, 18 timer ved 18 °C — Giorilli-standarden. Krever sterkt mel.',
    hydrering:82, salt:2.0, antall:8, vektPerBrod:280,
    mel:[ {id:'caputo_cuoco', pct:80}, {id:'regal_standard', pct:20} ],
    fro:[],
    forferment:{ bruk:true, type:'biga', pctMel:50, hydrering:45, timer:18, temp:18 },
    gjaerType:'torr', gjaerPct:0.168,   // kalibrert til dose 1,61 (var 0,200 → 1,89)
    refPlan:[
      { navn:'Bulk (romtemp)',    timer:2,  temp:25, miljo:25 },
      { navn:'Kjøleskap over natt', timer:16, temp:25, miljo:3.5 },
      { navn:'Benkehvile utbakt', timer:0.75, temp:8, miljo:24 }
    ],
    steking:'ciabatta',
    notat:'Ciabatta beholdes i boks over natta og bakes ut rett før steking. Deles opp 30–45 min før ovnen. Ett bestemt kutt med skrape — ikke sag, da river du glutenet og slipper ut gassen i sidene.'
  },
  {
    id:'baguette',
    navn:'Baguetter 70 % med poolish',
    beskrivelse:'33 % av melet i poolish. Kort bulk — poolishen har allerede gjort smaksjobben.',
    hydrering:70, salt:1.9, antall:6, vektPerBrod:330,
    mel:[ {id:'regal_standard', pct:100} ],
    fro:[],
    forferment:{ bruk:true, type:'poolish', pctMel:33, hydrering:100, timer:14, temp:21 },
    gjaerType:'torr', gjaerPct:0.446,   // kalibrert til dose 1,84 (var 0,367 → 1,53 — den eneste som lå FOR LAVT)
    refPlan:[
      { navn:'Bulk (romtemp)',    timer:2,   temp:24, miljo:24 },
      { navn:'Etterheving kurv',  timer:1.25, temp:24, miljo:24 }
    ],
    steking:'baguette',
    notat:'Forform til løse rektangler, ikke kuler — runding bygger spenning som kjemper mot uttrekket. Benkehvilen dømmes på følelse: emnet skal strekke seg av egen vekt uten motstand.'
  },
  {
    id:'focaccia',
    navn:'Focaccia 78 %',
    beskrivelse:'Samme deig som brødet, men hever i formen og kaldhever der.',
    // 4 % olje i deigen: volumtoppen ligger på 4–5 % etter TILLEGG_EFFEKT.fett,
    // og 3 % gir målt 69 % mykere krumme. Uten olje i deigen er en focaccia et
    // flatbrød — oljen i formen gjør bare utsiden.
    hydrering:78, salt:2.0, oljePct:4, antall:1, vektPerBrod:1000,
    mel:[ {id:'regal_standard', pct:100} ],
    fro:[],
    forferment:{ bruk:true, type:'poolish', pctMel:25, hydrering:100, timer:14, temp:22 },
    gjaerType:'torr', gjaerPct:0.266,   // kalibrert til dose 1,95 (var 0,300 → 2,19)
    refPlan:[
      { navn:'Bulk i bolle',      timer:2,  temp:24, miljo:24 },
      { navn:'Kjøleskap i formen', timer:16, temp:24, miljo:3.5 },
      { navn:'Temperering + gropping', timer:2, temp:6, miljo:24 }
    ],
    steking:'focaccia',
    notat:'Grop først når deigen er helt avslappet og nær ferdig hevet — alle ti fingre rett ned til bunnen av formen. Gropper du for tidlig, trekker den seg tilbake.'
  },
  {
    id:'loff',
    navn:'Loff med autolyse 75 %',
    beskrivelse:'Bland mel og vann, hold igjen 5 %, la stå 1 time i maskinen. Så salt og gjær.',
    hydrering:75, salt:1.8, antall:2, vektPerBrod:800,
    mel:[ {id:'regal_standard', pct:100} ],
    fro:[],
    forferment:{ bruk:false, type:'poolish', pctMel:20, hydrering:100, timer:14, temp:22 },
    gjaerType:'torr', gjaerPct:0.299,   // kalibrert til dose 2,30 (var 0,333 → 2,54)
    refPlan:[
      { navn:'Bulk (romtemp)',    timer:3,  temp:24, miljo:24 },
      { navn:'Kjøleskap (utbakt i hevekurv)', timer:18, temp:24, miljo:3.5, utbakt:true }
    ],
    steking:'brod_apen',
    notat:'Autolyse med gjærdeig tåler mye lenger enn surdeig gjør — deigen ligger på pH 5,5 der proteasene er nesten sovende. 1–3 timer er trygt.'
  }
];

/* ---------- BRØDTYPER — appens inngangsport ----------
   Startsiden spør hva som skal bakes, fordi det spørsmålet avgjør alt annet.
   Appen har hele tiden hatt TO reelt forskjellige veier gjennom seg, men ingen
   steder sagt hvilken som gjelder — «Bygg brød» antok stilltiende et rundbrød,
   mens ciabatta og baguetter lå gjemt i en nedtrekksliste inne på «Oppskrift».

     rute:'bygg'   — frittstående brød der GROVHET er hoveddialen. Du velger
                     grovhet, tid og tillegg, og appen løser gjærmengden.
                     Melblandingen kommer fra GROVHET-trappa.
     rute:'preset' — brød der grovhetstrappa ikke gir mening, fordi hele poenget
                     ER en bestemt deig: ciabatta skal være ren sterk hvete med
                     stiv biga, baguetter poolish og kort bulk, focaccia olje og
                     form. De styres fra ferdig kalibrerte forvalg.

   Feltene her er redaksjonelle — hvorfor du velger typen, ikke hva den gjør.
   Selve prosessen GENERERES fra forvalget og heveplanen (prosessSteg() i
   app.js leser bakeSteg()). Skrives prosessen av her, drifter den fra det
   «Bak nå» faktisk sier, og det var nettopp den feilen som gjorde at fanene
   kunne vise ulik starttid og ulik stekeprofil for samme brød.            */
const BROTYPER = [
  { id:'loff', navn:'Loff', undertittel:'Fint, mykt, maks løft', ikon:'🍞',
    rute:'bygg', preset:'loff', grovhet:0, harForm:true, antall:2, vekt:800,
    passer:'Når krummen skal være lys og myk og løftet størst mulig. Ingen kli som kutter glutentrådene, så dette er referansen alt annet måles mot.',
    merk:'Vil du ha loffens krumme med litt mer smak, er 10 % grovt det best dokumenterte byttet som finnes — flytt grovhetsdialen ett hakk opp i «Bygg brød», så er du der.' },

  { id:'grovbrod', navn:'Halvgrovt brød', undertittel:'Du velger grovheten, 0–80 %', ikon:'🌾',
    rute:'bygg', preset:'brod_standard', grovhet:3, harForm:true, antall:2, vekt:800,
    passer:'Hverdagsbrødet. Grovhetstrappa er hoveddialen: hvert hakk grovere gir mer smak og koster ovnsløft, og appen viser deg prisen før du betaler den. Starter på 40 % — midt i det halvgrove båndet på Brødskala\'n.',
    merk:'Navnet følger Brødskala\'n, ikke magefølelsen: fint brød er 0–25,9 %, halvgrovt 26–50,9 %, grovt 51–75,9 % og ekstra grovt fra 76 %. De første 10–20 prosentpoengene er nesten gratis i ovnsløft — det er over 30 % du begynner å merke det i høyden. Vil du ha loffens krumme, flytt dialen ned til Loff+.' },

  { id:'ciabatta', navn:'Ciabatta', undertittel:'Stiv biga, 82 % vann, sterkt mel', ikon:'🥖',
    rute:'preset', preset:'ciabatta', harForm:false,
    passer:'Når du vil ha store, uregelmessige hull og tynn, sprø skorpe. Deigen er så våt at den ikke formes — den helles og deles.',
    merk:'Krever mel som når W 300+. Av melet ditt er det bare Caputo Cuoco som gjør det. Grovhetstrappa er slått av her, fordi grovt mel og 82 % hydrering ikke går sammen.' },

  { id:'baguette', navn:'Baguetter', undertittel:'Poolish, kort bulk, ingen kaldheving', ikon:'🥐',
    rute:'preset', preset:'baguette', harForm:false,
    passer:'Når du vil ha sprø skorpe og krumme samme dag. Poolishen gjør hele smaksjobben over natta, så selve bakedagen er kort.',
    merk:'Baguetter skal IKKE langtidsheves — 3–4 timer bulk er riktig. Lengre gjæring gir en deig som ikke tåler uttrekket.' },

  { id:'focaccia', navn:'Focaccia', undertittel:'I form, olje, hever der den stekes', ikon:'🫓',
    rute:'preset', preset:'focaccia', harForm:false,
    passer:'Det enkleste brødet i lista: ingen forming, ingen kurv, ingen snitting. Deigen hever i formen og stekes i den.',
    merk:'Bunnskorpa lages av nok olje i formen til at den frityrsteker seg. Sparer du på oljen, får du en tørr bunn i stedet.' }
];

/* ---------- FORM OG KURV ----------
   Formen er ikke kosmetikk. Den avgjør hvilket stekeutstyr som i det hele tatt
   er mulig: et avlangt emne får ikke plass under en rund gryte, og det er den
   vanligste grunnen til at «bruk gryte» plutselig ikke er et råd som gjelder.

   `kFaktor` gir emnets største mål (cm) som k × vekt^⅓. Det er en formings-
   KONVENSJON, ikke en fysisk lov — hvor langt du trekker en bâtard bestemmer du
   selv — så regn ±15 %. Ankerpunktene: boule 800 g ≈ 18 cm tvers over,
   bâtard 800 g ≈ 28 cm lang.                                              */
const FORMER = [
  { id:'avlang', navn:'Avlang kurv (bâtard)', kort:'ditt vanlige', ikon:'▬',
    kFaktor:3.0, maal:'lengde', utstyr:'stal15',
    om:'Mer skorpe per gram enn en boule, og et langt snitt som gir ett stort, kontrollert øre. Emnet sprer seg mer sidelengs, så det står litt lavere enn en rund av samme vekt.',
    snitt:'Ett langt drag langs midten, 30–45° fra vannrett, eller 3–5 skrå snitt som overlapper en tredel. Ikke kryss — det deler løftet i fire.',
    advarsel:'Avlange emner får sjelden plass under en rund gryte. Sjekk målet under før du planlegger å bruke glassgryta.' },

  { id:'rund', navn:'Rund kurv (boule)', kort:'holder høyden best', ikon:'●',
    kFaktor:1.93, maal:'tverrmål', utstyr:'glass_stal',
    om:'Minst overflate per gram, så den taper minst fukt og står høyest. Dette er formen alle grytebaserte oppsett er bygget for.',
    snitt:'Ett kryss, en firkant, eller ett enkelt buet drag langs kanten. Det buede draget gir høyest løft av de tre.',
    advarsel:'' },

  { id:'form', navn:'Brødform', kort:'når deigen er for slapp', ikon:'▭',
    kFaktor:0, maal:'', utstyr:'apen',
    om:'Formen bærer deigen, så du kan kjøre grovere og våtere enn et frittstående brød tåler. Over 40 % grovt eller 25 % rug er dette det ærlige valget.',
    snitt:'Ett langsgående snitt, eller ingen — en formdeig som er riktig hevet sprekker pent av seg selv langs kanten.',
    advarsel:'' }
];

/* ---------- GROVHETSTRAPP ----------
   OMBYGGET 29.07.2026 ETTER BRØDSKALA'N — den norske standarden.

   Trappa var feilmerket. Den kalte 20 % «Halvgrov» og 30 % «Grov», og toppet
   ut på 40 % «Kraftig». Etter Brødskala'n er alle tre FINT eller HALVGROVT
   brød; appen nådde aldri «grovt» i det hele tatt, men brukte ordet på et brød
   som i butikken ville stått merket med én kakestykkebit.

   Brødskala'n (BKLF, utarbeidet 2006 av NHO Mat og Drikke + BKLF, sist
   revidert 2017 — https://brodogkorn.no/fakta/brodskalaen/):
       Fint brød          0–25,9 %
       Halvgrovt brød    26–50,9 %
       Grovt brød        51–75,9 %
       Ekstra grovt brød 76–100 %

   Regnestykket, ordrett fra ordningen:
     TELLER  hele korn + sammalt mel + kli + gryn av korn
     NEVNER  total melmengde
     UTENFOR frø og nøtter — de teller ikke, uansett hvor mye du har i.
   Se `brodskalan()` i engine.js, som regner nøyaktig dette.

   Nøkkelhullet er en egen ordning med et strengere krav: minst 30 % fullkorn,
   regnet av tørrstoffet i produktets korndel (Veileder til nøkkelhullsforskriften,
   Mattilsynet, revidert 2021). Trinn 3 og oppover passerer den grensen.

   Basen er alltid det sterkeste butikkmelet, fordi alt grovt du legger til
   stjeler fra den glutenbærende andelen. Hydreringen regnes ut fra
   melblandingens absorpsjon, ikke gjettes — derfor står basisHyd på 70 hele
   veien, mens den faktiske hydreringen stiger av seg selv med grovheten.

   `klasse` er brødets offisielle betegnelse ved akkurat denne melblandingen.
   Legger du frø i tillegg, endrer den seg IKKE — det er hele poenget med at
   ordningen holder frø utenfor.                                            */
const GROVHET = [
  { id:0, navn:'Loff', kort:'0 % grovt', klasse:'Fint brød', basisHyd:70,
    mel:[{id:'regal_standard', pct:100}],
    om:'Ren siktet hvete. Maksimal glutenstyrke, maksimalt ovnsløft, minst smak.',
    ovnslos:'Referansen. Alt annet måles mot denne.' },
  { id:1, navn:'Loff+', kort:'10 % grovt', klasse:'Fint brød', basisHyd:70,
    mel:[{id:'regal_standard', pct:90}, {id:'samalt_hvete', pct:10}],
    om:'Ekspertenes svar på «litt sunnere loff». 10–20 % grovt gir tydelig mer smak til nesten ingen krummekostnad — det er det best dokumenterte forholdet mellom smak og struktur som finnes. Merk at dette fortsatt er et FINT brød på Brødskala\'n; «litt sunnere» er en smaksforskjell, ikke en ernæringsmessig.',
    ovnslos:'Praktisk talt uendret. Dette er gratis smak.' },
  { id:2, navn:'Fin, øvre kant', kort:'25 % grovt', klasse:'Fint brød', basisHyd:70,
    mel:[{id:'regal_standard', pct:75}, {id:'samalt_hvete', pct:19}, {id:'samalt_rug', pct:6}],
    om:'Så grovt du kan gå og fortsatt selge det som fint brød — 26 % ville flyttet det til halvgrovt. Tydelig kornsmak, fortsatt åpen krumme. Rugen kommer inn her fordi den bringer amylase, som gir skorpefarge og mat til gjæren sent i hevingen.',
    ovnslos:'5–10 % lavere enn loff. Merkbart, men ikke noe du angrer på.' },
  { id:3, navn:'Halvgrov', kort:'40 % grovt', klasse:'Halvgrovt brød', basisHyd:70,
    mel:[{id:'regal_standard', pct:60}, {id:'samalt_hvete', pct:30}, {id:'samalt_rug', pct:10}],
    om:'Midt i det halvgrove båndet, og over Nøkkelhullets 30 %-grense. Her begynner du å betale: kliens skarpe kanter kutter glutentrådene fysisk. Krever mer vann, kortere elting og lavere hevemål.',
    ovnslos:'25–35 % lavere enn loff. Vurder form framfor frittstående.' },
  { id:4, navn:'Grov', kort:'60 % grovt', klasse:'Grovt brød', basisHyd:70,
    mel:[{id:'regal_standard', pct:40}, {id:'fullkorn_fibra', pct:25}, {id:'samalt_hvete', pct:25}, {id:'samalt_rug', pct:10}],
    om:'Første trinn som faktisk fortjener ordet «grovt» etter norsk standard. Fullkornshveten bærer mesteparten fordi den er malt av bakekraftige sorter og tåler å være hovedmel; sammalt hvete alene ville tatt for mye av strukturen.',
    ovnslos:'40–50 % lavere enn loff. Frittstående er mulig, men form er det trygge valget.' },
  { id:5, navn:'Ekstra grov', kort:'80 % grovt', klasse:'Ekstra grovt brød', basisHyd:70,
    mel:[{id:'regal_standard', pct:20}, {id:'fullkorn_fibra', pct:45}, {id:'samalt_hvete', pct:25}, {id:'samalt_rug', pct:10}],
    om:'Toppen av Brødskala\'n. Bare 20 % siktet mel igjen å bygge nettverk av, så dette er et formbrød — ikke fordi det smaker dårlig, men fordi et frittstående emne ikke har nok gluten til å holde formen gjennom ovnsløftet.',
    ovnslos:'55–65 % lavere enn loff. Bruk form, og regn med en tett, saftig krumme framfor hull.' }
];

/* ---------- TIDSBUDSJETT ----------
   Gjærmengden er ikke oppgitt — appen LØSER den slik at alle planene gir
   samme gjæringsdose. Det er hele poenget: samme brød, ulik klokke.         */
const TIDSPLANER = [
  { id:'optimal', navn:'Optimal', timer:null, kort:'26–34 timer',
    forferment:{ bruk:true, type:'biga', pctMel:30, hydrering:50, timer:16, temp:18 },
    plan:[ { navn:'Bulk', timer:4, miljo:24 },
           { navn:'Kaldheving, utbakt i kurv', timer:14, miljo:3.5, utbakt:true } ],
    om:'Alt forskningen peker på: stiv biga for styrke, full bulk ved kontrollert temperatur, og 14 timers kaldheving på utbakte emner. Kaldhevingen gir blemmer, rent snitt og et bredt hevevindu — og fordi gjærdeig ligger på pH 5,5–6 tåler den dette uten å bli sur.',
    ovnslos:100 },
  { id:'lang', navn:'Lang', timer:20, kort:'18–20 timer',
    forferment:{ bruk:true, type:'poolish', pctMel:25, hydrering:100, timer:12, temp:21 },
    plan:[ { navn:'Bulk', timer:3.5, miljo:24 },
           { navn:'Kaldheving, utbakt i kurv', timer:3, miljo:3.5, utbakt:true } ],
    om:'Poolish over natta på benken, deig og steking neste dag. Nesten all smaken fra optimal-planen, halve klokka. Poolish er lettere å treffe hjemme enn biga, som vil ha 16–18 °C.',
    ovnslos:96 },
  { id:'dag', navn:'Én dag', timer:9, kort:'8–9 timer',
    forferment:{ bruk:true, type:'poolish', pctMel:20, hydrering:100, timer:4, temp:24 },
    plan:[ { navn:'Bulk', timer:3, miljo:25 },
           { navn:'Etterheving utbakt', timer:1.25, miljo:24, utbakt:true } ],
    om:'Start om morgenen, brød til middag. En kort poolish på 4 timer gir fortsatt merkbart mer smak enn ingen.',
    ovnslos:90 },
  { id:'kort', navn:'Kort', timer:5, kort:'4–5 timer',
    forferment:{ bruk:false, type:'poolish', pctMel:20, hydrering:100, timer:4, temp:24 },
    plan:[ { navn:'Bulk', timer:2.5, miljo:26 },
           { navn:'Etterheving utbakt', timer:1.25, miljo:25, utbakt:true } ],
    om:'Ingen forferment. Bruk lang autolyse (1 time) i stedet — det er den billigste smaken du får når klokka er knapp.',
    ovnslos:82 },
  { id:'ekspress', navn:'Ekspress', timer:3, kort:'under 3 timer',
    forferment:{ bruk:false, type:'poolish', pctMel:20, hydrering:100, timer:4, temp:24 },
    plan:[ { navn:'Bulk', timer:1.25, miljo:27 },
           { navn:'Etterheving utbakt', timer:0.75, miljo:26, utbakt:true } ],
    om:'Nødplan. Hevevinduet er nå 10–20 minutter bredt, så følg deigen, ikke klokka. Smaken blir tydelig flatere — det er tiden du mister, ikke teknikken.',
    ovnslos:70 }
];

/* ---------- TILLEGGSMENY ----------
   pct = anbefalt bakerprosent av MEL. Appen viser effekten på grovhet og vann. */
const TILLEGG = [
  { id:'solsikke',   type:'fro',   navn:'Solsikkekjerner', pct:6, min:2,  max:20,
    hvorfor:'Ristes i panne først for pyrazinsmak — ristet, nøtteaktig, kaffeaktig. Umulig å forveksle med surdeigssyre, og derfor et av de beste smaksgrepene du har.',
    obs:'Binder 80 g vann per 100 g. Blandes inn mot slutten av eltingen, ellers blir de porøse.',
    opt:'5–6 % i deigen når ovnsløft er førsteprioritet, og resten strødd på skorpen.',
    opp:'Mer nøttesmak og mer tygg, og litt saftigere krumme fordi bløtlagte frø er et fuktlager. Men løftet faller ca. 1,5 % per prosentpoeng over 6 %, og smakskurven flater ut rundt 12–15 % — der betaler du stadig mer løft for stadig mindre smak.',
    ned:'Mer ovnsløft og åpnere krumme. Under 5 % blir smaksbidraget beskjedent — men rister du frøene får du dobbelt så mye smak per gram, så 6 % ristede tilsvarer 12 % uristede.' },
  { id:'linfro',     type:'fro',   navn:'Linfrø',          pct:3,  min:1,  max:12,
    hvorfor:'Slimstoffene gir saftighet og lengre holdbarhet.',
    obs:'Binder hele 130 g vann per 100 g — den tørsteste ingrediensen i lista. Hele linfrø må knuses for å gi næring.',
    opt:'2–3 %. Den dyreste frøtypen i struktur — bruk solsikke til smaken og lin bare til saftigheten.',
    opp:'Saftigere krumme og lengre holdbarhet. Men deigstabiliteten kollapser: målt fra 15,3 til 3,3 minutter ved 15 % linfrø. I frittstående brød gir lin målt større diameter og lavere høyde — altså flatere brød.',
    ned:'Merkbart bedre løft og en deig som er langt lettere å håndtere. Du taper lite smak, for lin smaker lite.' },
  { id:'sesam',      type:'fro',   navn:'Sesamfrø',        pct:5,  min:3,  max:10,
    hvorfor:'Best ristet og strødd på toppen framfor i deigen.',
    obs:'Binder 58 g per 100 g.',
    opt:'0 % i deigen — alt på skorpen. Der gir de full aroma til null strukturkostnad.',
    opp:'Mer sesamsmak, men også fortynning av glutenet. Over 20 % faller alt i sensoriske tester.',
    ned:'Bedre løft. Smaken henter du inn igjen ved å strø dem utenpå i stedet.' },
  { id:'gresskar',   type:'fro',   navn:'Gresskarkjerner', pct:8,  min:4,  max:15,
    hvorfor:'Farge og tygg. Lavest vannbinding av alle frøene, så billigst i struktur.',
    obs:'Binder bare 38 g per 100 g.',
    opt:'5–8 %. Det billigste frøet i vannregnskapet.',
    opp:'Mer farge og tygg. Fordi de binder minst vann av alle frøene, stjeler de mindre fra deigen enn andre frø ved samme vekt — men de fortynner glutenet like mye.',
    ned:'Bedre løft, mindre visuell effekt i snittflaten.' },
  { id:'havregryn',  type:'fro',   navn:'Havregryn',       pct:8,  min:4,  max:15,
    hvorfor:'Mykhet og mild sødme.',
    obs:'Skåldet binder de 206 g per 100 g mot 90 g kaldt — den største forskjellen kaldt/varmt av alt. Skålding gir også ekte sødme.',
    opt:'5–8 %, skåldet. Bløtlegg til metning, ikke til det står fritt vann.',
    opp:'Mykere krumme og mild sødme. Men havre binder svært mye vann skåldet, og både under- og overhydrering av bløtet ga målt dårligere brød.',
    ned:'Bedre løft og fastere krumme.' },
  { id:'ruggryn',    type:'fro',   navn:'Ruggryn (skåldet)', pct:8, min:4, max:15, varmt:true,
    hvorfor:'Skåldingen frigjør sukker og gir den runde, nesten søtlige dybden folk forbinder med surdeig — helt uten syre. Det sterkeste ikke-sure smaksgrepet som finnes.',
    obs:'MÅ skåldes med kokende vann. Kaldbløtlagt rugknekk blir grus i brødet.',
    opt:'5–8 %, alltid skåldet. Det beste smaksgrepet i lista hvis du jakter surdeigsdybde uten syre.',
    opp:'Rundere, søtligere dybde. Men rug bidrar ingenting til glutenet, så hvert prosentpoeng er ren fortynning av nettverket.',
    ned:'Bedre løft, men du mister det sterkeste ikke-sure smaksgrepet du har.' },
  { id:'hvetekli',   type:'fro',   navn:'Hvetekli',        pct:5,  min:2,  max:10,
    hvorfor:'Ren fiberøkning uten å bytte mel. Praktisk hvis du vil ha loffens krumme men mer fiber.',
    obs:'Oppfører seg nesten som mel og kutter gluten som mel gjør. Regnes derfor mot grovheten.',
    opt:'0–3 % hvis løft er målet. Kli er den dyreste fiberkilden i struktur.',
    opp:'Mer fiber. Men målt er ren kli ca. 1,5× så skadelig for volumet som frø ved samme vektandel. Laboratoriemålt vannbindingsevne er 4–6 g per gram (sentrifugert WHC), men i deig gir kliet mye av det tilbake — praktisk binding er ca. 1 g kaldt og 1,7 g skåldet, som er tallene appen regner med. Fiberens fenoler hemmer dessuten glutendannelsen kjemisk.',
    ned:'Merkbart bedre løft. Vil du ha fiber billigere, bytt til litt sammalt mel i stedet.' },
  { id:'honning',    type:'smak',  navn:'Honning',         pct:2,  min:0.5, max:6, felt:'honningPct',
    hvorfor:'Rundhet og skorpefarge. Honning er allerede invertert sukker, og fruktose har lavest karamelliseringsterskel av alle sukkerarter — derfor bruner den hardere enn vanlig sukker.',
    obs:'Er 17 % vann, som appen trekker fra hovedvannet. Under ca. 4 % smakes den ikke — da er den en ren skorpeingrediens.',
    opt:'1,5–2,5 % når ovnsløft er førsteprioritet.',
    opp:'Mørkere skorpe, ca. +20 % bruningsrate per prosentpoeng. Men skorpa setter seg tidligere og lukker ekspansjonsvinduet mens brødet fortsatt vil vokse.',
    ned:'Lysere skorpe og lengre ekspansjonsvindu. Du taper nesten ingen heving: gassproduksjonen er målt konstant opp til 6 % sukker.' },
  { id:'malt',       type:'smak',  navn:'Diastatisk malt', pct:0.1, min:0.05, max:0.3, felt:'maltPct',
    hvorfor:'Tilfører amylase som lager maltose gjennom hele hevingen. Motgiften mot blek skorpe — men bare når melet faktisk har for høyt falltall.',
    obs:'Norsk hvetemel ligger normalt på 280–320 s falltall, som allerede ER det optimale vinduet. Da trenger du ikke malt.',
    opt:'0 %. Legg inn 0,1–0,15 % bare hvis du får blek skorpe og dårlig volum til tross for god heving.',
    opp:'Mørkere skorpe og litt mer volum. Men 0,5 % trekker målt falltallet fra 327 til 194 s — langt under vinduet — og gir klissete, gummiaktig krumme. Farinograf-stabiliteten faller fra 7,5 til 2,6 min.',
    ned:'Tryggere krumme og sterkere deig. Ved rug i deigen skal den uansett til 0 — rug har rikelig egen amylase.' },
  { id:'olje',       type:'smak',  navn:'Olivenolje',      pct:3,  min:1,  max:8, felt:'oljePct',
    hvorfor:'Mykere krumme og lengre holdbarhet.',
    obs:'Under 5 % støtter fettet glutenutviklingen; over 5 % korter det trådene og gassretensjonen faller.',
    opt:'0 % for maks løft. 3 % for saftighet og holdbarhet — men da er smør sterkere.',
    opp:'Mykere krumme og lengre holdbarhet — målt 69 % hardere krumme uten fett enn med 3 %. Volumet topper rundt 4–5 %.',
    ned:'Sprøere skorpe og renere kornsmak. Brødet tørker raskere.' }
];

/* ---------- MELBIBLIOTEK ----------
   Fordeler og ulemper per meltype, holdt utenfor FLOURS så regnemodellen og
   oppslagsverket kan utvikle seg hver for seg.

   `glutenbidrag` er det viktigste feltet her, og det er BEVISST skilt fra
   protein: spelt deklarerer 14,3 g protein og er svakere enn siktet hvete på
   10–12; havremel har 14 g og null bakeevne; kikertmel 19 g og null. Protein
   duger ikke som mål på bakestyrke.
     bidrar    — bygger glutennettverk
     noytral   — verken bygger eller ødelegger, fortynner bare
     fortynner — fortynner og konkurrerer om vann
     bryterned — angriper nettverket aktivt

   `tilgang`: daglivare · meny · helsekost · nett · vanskelig               */
const MEL_INFO = {
  regal_standard: { glutenbidrag:'bidrar', tilgang:'daglivare',
    plus:['Sterkeste melet i vanlig daglivare','Inneholder askorbinsyre, som strammer deigen — en fordel når resten av blandingen er svak','Billig, ca. 10 kr/kg'],
    minus:['Ingen norsk mølle publiserer W-verdi, så styrken er anslått','Ikke sterk nok alene til ciabatta over 80 %'] },
  hvetemel: { glutenbidrag:'bidrar', tilgang:'daglivare',
    plus:['Tåler mye juling i maskinen','Tilgivende under heving'],
    minus:['Svakere enn Regal standard','Ikke nok til høy hydrering'] },
  regal_relax: { glutenbidrag:'bidrar', tilgang:'daglivare',
    plus:['Uten askorbinsyre — velg denne når du vil ha ubehandlet mel'],
    minus:['Du gir fra deg strammingen askorbinsyren gir, og den trengs i svake blandinger'] },
  hvetemel_sterkt: { glutenbidrag:'bidrar', tilgang:'nett',
    plus:['Eneste trygge valg for ciabatta over 80 %','20–40 % forsterker svakt norsk mel merkbart'],
    minus:['Dyrt, ca. 24 kr/kg','Kan gi seig krumme hvis du bruker det alene i et vanlig brød'] },
  hvetemel_stein: { glutenbidrag:'bidrar', tilgang:'helsekost',
    plus:['Smaker mye mer enn valsemalt','Beholder mer av kimen'],
    minus:['Tåler mindre elting — halver eltetiden','Kortere bulk','Dyrt'] },
  caputo_cuoco: { glutenbidrag:'bidrar', tilgang:'meny',
    plus:['W 300–320 — det eneste melet du får som når terskelen for ciabatta over 80 %','Laget for 24–72 timers modning','Bør brukes i bigaen, også når du ikke baker ciabatta'],
    minus:['Ca. 60 kr/kg mot Regals 10','Overkill i et vanlig hverdagsbrød'] },
  caputo_blaa: { glutenbidrag:'bidrar', tilgang:'meny',
    plus:['God til pizza på 55–67 % hydrering','Fin i biga'],
    minus:['Konstruert for korte modninger','Den røde Cuoco er et klart bedre valg til brød'] },
  tipo00: { glutenbidrag:'bidrar', tilgang:'daglivare',
    plus:['Fin til pizza på 60–67 %','Svært fint malt'],
    minus:['55 % utmaling gir lite smak','Ikke til ciabatta på 85 %'] },
  regal_tipo00: { glutenbidrag:'bidrar', tilgang:'daglivare',
    plus:['Beste norske kjøp — 13 % protein til ca. halve prisen av Caputo','100 % norsk vårhvete, som gir kraftigere og mer elastisk gluten enn italiensk grano tenero','Ingen askorbinsyre','I vanlig dagligvare'],
    minus:['Falltall ikke publisert, så oppførselen over 48 t kaldheving er uverifisert','Strammere deig som trenger lengre benkehvile mellom foldinger'] },
  kolonihagen: { glutenbidrag:'bidrar', tilgang:'daglivare',
    plus:['14 % deklarert protein — høyest av de norske','Helt rent: ingen askorbinsyre, ingen enzymer','31 kr/kg og obligatorisk i de største REMA-butikkene'],
    minus:['14 % protein sier ingenting om KVALITETEN på glutenet','Verken falltall eller glutenstyrke publisert — uprøvd'] },
  mollerens_tipo00: { glutenbidrag:'bidrar', tilgang:'daglivare',
    plus:['Bredest distribusjon av alle tipo 00-ene','Ingen askorbinsyre','Ca. 55 % utmaling gir renere glutennettverk enn norsk 78 %'],
    minus:['Ny og uprøvd vare — ingen uavhengige tester','Produsenten oppgir «sterke hvetesorter», men ingen tall'] },
  manitoba_oro: { glutenbidrag:'bidrar', tilgang:'meny',
    plus:['Farinografstabilitet 16–20 min — høyest i lista','W 360–380 og våtgluten over 45 %','P/L 0,45–0,55 er uvanlig ekstensibelt for styrken'],
    minus:['Alene strammer den seg og lukker krummen — bruk 15–30 % som blandemel','Dyrest i lista, 64,90 kr/kg'] },
  svedjerug: { glutenbidrag:'bryterned', tilgang:'nett',
    plus:['Mest aromatiske rugen — røykaktig, dyp, kompleks','Mer aroma per prosentpoeng enn vanlig rug'],
    minus:['Lavt protein (10,2 % av tørrstoff)','Samme amylase- og pentosanproblematikk som vanlig rug','52–56 kr/kg, kun nett'] },
  landhvete: { glutenbidrag:'bidrar', tilgang:'helsekost',
    plus:['Norsk landrase med dyp kornsmak','Mykt, men ekte gluten — kan være hovedmel i et fritt formet brød','Sigdal oppgir at den kan erstatte vanlig mel 1:1'],
    minus:['Ømtålig for voldsom elting','Dyrt, 47–66 kr/kg'] },

  samalt_hvete: { glutenbidrag:'fortynner', tilgang:'daglivare',
    plus:['Mye smak for relativt lite volumtap','Billig'],
    minus:['Fin kli kutter glutenfilmen mer enn grov gjør','Krever bløtlegging eller lang autolyse'] },
  samalt_hvete_grov: { glutenbidrag:'fortynner', tilgang:'daglivare',
    plus:['Grov kli skader volumet mindre enn fin kli (målt)','Tydelig kornsmak'],
    minus:['Bør bløtlegges 30 min','Vindusrute blir umulig'] },
  fullkorn_fibra: { glutenbidrag:'fortynner', tilgang:'daglivare',
    plus:['Den snilleste norske fullkornshveten','Malt av ekstra bakekraftige sorter'],
    minus:['Fortsatt fullkorn — regn med volumtap over 30 %'] },

  rug_siktet: { glutenbidrag:'bryterned', tilgang:'daglivare',
    plus:['Rugsmak uten den mørke krummen','Amylasekilde som redder skorpefargen'],
    minus:['Ingen glutennettverk','Absorpsjonen er tidsavhengig — deigen strammer seg etter elting'] },
  samalt_rug: { glutenbidrag:'bryterned', tilgang:'daglivare',
    plus:['Best smak per tapt ovnsløft av alt i lista','10–15 % gir umiskjennelig rugkarakter for nesten ingenting i volum','Pentosanene holder på vannet i dagevis — markert lengre saftighet'],
    minus:['Arabinoksylanet hindrer fysisk at proteinene aggregerer','Over 25 % i ren gjærdeig blir det klissete — da trengs 1–2 % eddik','Rugens amylase spiser stivelsen akkurat idet den skulle stivne'] },
  samalt_rug_grov: { glutenbidrag:'bryterned', tilgang:'daglivare',
    plus:['Kraftigst rugsmak','Mest fiber'],
    minus:['Mer bitterhet fra skalldelene','Over 40 % må i form','La brødet hvile 12–24 t før skjæring'] },
  svedjerug: { glutenbidrag:'bryterned', tilgang:'nett',
    plus:['Mest aromatiske rugen — røykaktig, dyp, kompleks','Mer aroma per prosentpoeng enn vanlig rug'],
    minus:['Lavt protein (10,2 % av tørrstoff)','Samme amylase- og pentosanproblematikk som vanlig rug','52–56 kr/kg, kun nett'] },

  enkorn: { glutenbidrag:'fortynner', tilgang:'vanskelig',
    plus:['Konsentrert, søtlig smak','9–11× karotenoid gir gyllen krumme'],
    minus:['⚠ Nesten umulig å få tak i i Norge — ingen kjeder fører det','Nesten ingen HMW-glutenin; deigen blir klissete','Publisert anbefaling er 3–4 min lav hastighet — men det gjelder 100 % enkorn. Ved 30 % innblanding tåler blandingen ca. 10 min','Topper ~30 % tidligere enn hvete og kollapser så'] },
  emmer: { glutenbidrag:'bidrar', tilgang:'meny',
    plus:['Kraftig rustikk, nøtteaktig smak','Mykt men ekte gluten — tåler 30–40 %','Fås som ordinær vare hos Meny'],
    minus:['Svært kort farinografstabilitet','Trenger lang hevetid'] },
  spelt_siktet: { glutenbidrag:'bidrar', tilgang:'daglivare',
    plus:['Kan bære et frittstående brød alene — det eneste ikke-hvetemelet som kan det','Fyldig, nøtteaktig, litt søtlig','Opptil 50 % oppfører den seg praktisk talt som hvete'],
    minus:['⚠ Høyt protein, SVAKT gluten — glutenindeks i snitt 59 mot hvetens 97–100','Farinografstabilitet 9,5 min mot hvetens 17,5, altså omtrent halv eltetoleranse','Tar opp vannet senere enn hvete — deigen er klissete tidlig og strammer seg underveis','Overheving gir kollaps, for nettverket holder ikke','Møllerens siktede inneholder askorbinsyre'] },
  samalt_spelt: { glutenbidrag:'bidrar', tilgang:'daglivare',
    plus:['Nesten gratis smak — varm, honningaktig tone','Beste smak per strukturtap i hele lista'],
    minus:['Samme skjøre gluten som siktet spelt','Overheving gir kollaps'] },

  havremel: { glutenbidrag:'fortynner', tilgang:'daglivare',
    plus:['Mild, søtlig, kremete','Gir mye saftighet og tekstur'],
    minus:['Null bakeevne til tross for 14 g protein','7 g fett/100 g — kortest holdbarhet i lista','Betaglukan gjør det svært tørst','Målt 12,6–24 % volumtap ved bare 10 % — men det kan nesten fullt kompenseres med 20 % mer vann'] },
  byggmel: { glutenbidrag:'fortynner', tilgang:'daglivare',
    plus:['Mild, søtlig maltsmak med gammeldags norsk karakter','Forlenget saftighet','Billig'],
    minus:['Ingen bakeevne overhodet','Betaglukan binder mye vann og legger seg mellom proteintrådene','Smaksbidraget er beskjedent i forhold til volumkostnaden'] },
  durum: { glutenbidrag:'bidrar', tilgang:'meny',
    plus:['LEGGER TIL gluten — netto positiv struktur opp til ~30 %','Søtlig, nøtteaktig, nesten smøraktig','Gul krumme og markert tyggemotstand'],
    minus:['Sterkt men lite elastisk — mangler D-genomet som gir brødhvetens fjæring','Absorberer tregt; autolyse nesten obligatorisk','Over ~50 % rives deigen i stedet for å strekke seg'] },
  kikertmel: { glutenbidrag:'fortynner', tilgang:'meny',
    plus:['Målt HØYERE deigstabilitet enn kontrollen ved 10 %','Mye farge og smaksdybde ved bare 5–10 %','Pen gul krumme'],
    minus:['Bønneaktig og bitter rå — men mildner mye ved steking','Klissete deig fra 20 %','Dyrt, 67–128 kr/kg'] },
  bokhvete: { glutenbidrag:'fortynner', tilgang:'helsekost',
    plus:['Kraftig, jordaktig, nøtteaktig smak','Vannopptaket er LAVERE enn hvete — overrasker de fleste'],
    minus:['Bitter ettersmak som bygger seg — 25 % smaker medisinsk','Ikke et korn i det hele tatt, så null gluten','Dyrt og ligger i «Fri For»-hyllen, ikke melhyllen'] },
  annet: { glutenbidrag:'noytral', tilgang:'daglivare',
    plus:['Fritt felt for det appen ikke dekker'],
    minus:['Du må selv anslå absorpsjon og styrke'] }
};

/* Hva tallene på melkortene betyr i praksis. Vises bak en ⓘ på hver rad. */
const MELTALL_INFO = {
  protein: {
    navn:'Protein',
    tekst:`Fra produsentens næringsdeklarasjon, avrundet til hele gram — så «13 g» kan i praksis
      være 12,5–13,4. <b>Protein er ikke det samme som bakestyrke</b>, og det er den vanligste
      misforståelsen i melvalg: spelt deklarerer 14,3 g og er <i>svakere</i> enn siktet hvete på 12,
      havremel har 14 g og null bakeevne, kikertmel 19 g og null. Det som bærer brødet er
      <b>glutenin</b>, ikke totalprotein. Se «Glutenbidrag»-merket øverst på kortet — det er tallet
      som faktisk sier noe om struktur.` },
  vannbehov: {
    navn:'Vannbehov',
    tekst:`Hvor mye mer eller mindre vann melet trenger enn siktet hvetemel, målt i
      <b>prosentpoeng hydrering</b>. Regneeksempel: bruker du 75 % hydrering på siktet hvete og
      bytter til et mel med «+15 %-poeng», trenger den samme deigen 90 % for å kjennes lik.
      Blander du bare inn 20 % av et slikt mel, blir påslaget 20 % av 15, altså 3 prosentpoeng.
      <br>Dette er grunnen til at grovt mel «tørker ut» brød: gir du det ikke mer vann, tar kliet
      det fra glutenet i stedet, og deigen strammer seg gjennom hele bulken.` },
  tak: {
    navn:'Praktisk tak',
    tekst:`Hvor stor andel av <b>melmengden</b> dette kan utgjøre i et frittstående brød før
      resultatet blir dårlig. Det er ikke en absolutt grense — det er punktet der du må gjøre alt
      annet riktig samtidig for at det skal gå bra.
      <br>Over taket: deigen flyter ut i stedet for å reise seg, krummen blir tett og fuktig, og
      ovnsløftet faller merkbart. Et brød i form tåler 5–10 prosentpoeng mer enn et frittstående,
      fordi formen gjør jobben glutenet ellers måtte gjort.` },
  pris: {
    navn:'Pris',
    tekst:`Omtrentlig kilopris i vanlig butikk. Sett den i sammenheng: et 900 g brød inneholder
      rundt 550 g mel, så 10 kroner i kilopris blir ca. 5,50 kr melkostnad per brød, mens 60 kroner
      blir 33. Derfor er det billig å bruke et dyrt mel <b>bare i forfermenten</b> — den utgjør typisk
      25–35 % av melet, så du får styrken der den trengs til en tredjedel av merkostnaden.` },
  glutenbidrag: {
    navn:'Glutenbidrag',
    tekst:`Hva melet gjør med selve nettverket, uavhengig av hvor mye protein det inneholder.
      <b>Bygger gluten</b> — danner nettverk og bærer struktur.
      <b>Nøytral</b> — verken bygger eller ødelegger.
      <b>Fortynner</b> — bygger ikke selv, og konkurrerer om vannet.
      <b>Bryter ned</b> — angriper nettverket aktivt. Rug er det viktigste eksempelet:
      arabinoksylanet hindrer fysisk at proteinene aggregerer, og amylasen spiser stivelsen akkurat
      i det øyeblikket den skulle stivne. Derfor koster hvert prosentpoeng rug mer enn
      prosentpoenget hvetemel du fjernet.` }
};

const GLUTENBIDRAG_TEKST = {
  bidrar:    { navn:'Bygger gluten',      farge:'var(--grønn)', om:'Danner glutennettverk og bærer struktur.' },
  noytral:   { navn:'Nøytral',            farge:'var(--txt3)',  om:'Verken bygger eller ødelegger.' },
  fortynner: { navn:'Fortynner',          farge:'var(--gull)',  om:'Bygger ikke selv, og konkurrerer om vannet.' },
  bryterned: { navn:'Bryter ned',         farge:'var(--rød)',   om:'Angriper nettverket aktivt — hindrer at proteinene aggregerer.' }
};

const TILGANG_TEKST = {
  daglivare:'Vanlig daglivare', meny:'Meny/Spar', helsekost:'Helsekost',
  nett:'Nettbutikk', vanskelig:'⚠ Vanskelig å få tak i'
};

/* ---------- ORDLISTE ----------
   Appen er tett pakket med fagord. `se` peker på beslektede oppslag.        */
const ORDLISTE = [
  { ord:'Krumme', gr:'Brødet',
    def:'Alt inni brødet — den luftige delen innenfor skorpa. Fargen varierer med melet; det er plasseringen som definerer den, ikke fargen.',
    se:['Skorpe','Åpen krumme'] },
  { ord:'Skorpe', gr:'Brødet',
    def:'Det ytre, harde laget. Mesteparten av brødets aroma sitter her, og understeking er den vanligste smaksfeilen.', se:['Maillard'] },
  { ord:'Åpen krumme', gr:'Brødet',
    def:'Hullstruktur med store, uregelmessige hull og tynne vegger. Motsatsen er tett og finporet krumme, som i et formbrød fra butikken. Alle gassceller stammer fra luft pisket inn under eltingen — mer elting gir flere og mindre bobler, altså finere krumme.',
    se:['Krumme','Elting'] },
  { ord:'Ovnsløft', gr:'Brødet',
    def:'Utvidelsen som skjer de første 15–20 minuttene i ovnen. Ikke en CO₂-ballong, men en dampmaskin: 45–55 % av løftet er vann som fordamper, 20–30 % er CO₂ som går ut av løsning, 15–25 % ren termisk utvidelse. Gjæraktivitet står for bare 2–5 %.',
    se:['Damp','Snitting'] },

  { ord:'Hydrering', gr:'Oppskrift',
    def:'Vann som prosent av melvekten. 75 % hydrering betyr 750 g vann på 1000 g mel. Den eneste spaken som gir både saftighet og løft.',
    se:['Bakerprosent','Effektiv hydrering'] },
  { ord:'Effektiv hydrering', gr:'Oppskrift',
    def:'Hydreringen minus vannet frøene binder. Forklarer hvorfor et «75 %-brød» med mye frø kjennes langt fastere enn tallet tilsier.',
    se:['Hydrering'] },
  { ord:'Prosentpoeng', gr:'Oppskrift',
    def:'Differansen mellom to prosenttall. Går hydreringen fra 72 % til 75 %, er det en økning på 3 <b>prosentpoeng</b> — ikke 3 prosent (som ville vært 74,2 %). Appen bruker prosentpoeng når den sammenligner meltypers vannbehov: «+2 %-poeng» betyr at der du ville brukt 75 % på siktet hvete, trenger dette melet 77 %.',
    se:['Hydrering','Bakerprosent'] },
  { ord:'Bakerprosent', gr:'Oppskrift',
    def:'Alt regnes som prosent av melet, som alltid er 100 %. Summen blir derfor over 100. Gjør oppskrifter direkte sammenlignbare uansett størrelse.',
    se:['Hydrering'] },
  { ord:'Sammalt', gr:'Mel',
    def:'Hele kornet malt opp — kli, kim og mellagret. Motsatsen er siktet, der kli og kim er siktet bort.',
    se:['Kli','Siktet'] },
  { ord:'Siktet', gr:'Mel',
    def:'Bare den stivelsesrike kjernen. Norsk siktet hvete har typisk 78 % utmaling, italiensk tipo 00 rundt 55 %.', se:['Sammalt'] },
  { ord:'Kli', gr:'Mel',
    def:'Kornets ytre skallag. Laboratoriemålt vannbindingsevne er 4–6 g per gram, men det er en sentrifugert verdi: i deig gir kliet mye tilbake, og praktisk binding er ca. 1 g kaldt og 1,7 g skåldet. Hemmer glutendannelsen kjemisk — derfor får man ikke vindusrute i grovt mel.',
    se:['Sammalt','Vindusrute'] },
  { ord:'Falltall', gr:'Mel',
    def:'Hagberg Falling Number, et mål på melets egen amylaseaktivitet. Norsk hvetemel ligger på 280–320 sekunder, som er det optimale vinduet. Lavt falltall gir klissete krumme, høyt gir blek skorpe.',
    se:['Amylase','Diastatisk malt'] },
  { ord:'W-verdi', gr:'Mel',
    def:'Bakestyrke målt i alveograf. W 300+ regnes som nødvendig for ciabatta over 80 % hydrering. Norske møller publiserer sjelden W.',
    se:['Gluten'] },

  { ord:'Gluten', gr:'Deig',
    def:'Nettverket som holder på gassen, dannet når glutenin og gliadin møter vann. Glutenin gir styrke og elastisitet, gliadin gir flyt og ekstensibilitet. Brødvolum forklares i hovedsak av glutenininnholdet, ikke av totalproteinet.',
    se:['Ekstensibilitet','Vindusrute'] },
  { ord:'Ekstensibilitet', gr:'Deig',
    def:'Hvor langt deigen lar seg strekke uten å rive. Det gjærdeig mangler mest, fordi den ikke surgjøres. Kjøpes med poolish, autolyse og bassinage.',
    se:['Gluten','Poolish'] },
  { ord:'Vindusrute', gr:'Deig',
    def:'Testen der du strekker en deigklump tynn nok til å se lys gjennom. Fungerer bare på fint, sterkt mel — kli river filmen mekanisk, så testen måler kliinnhold like mye som glutenutvikling. For maks ovnsløft skal du uansett stoppe før dette, ved 60–75 % utvikling.',
    se:['Gluten','Kli'] },
  { ord:'Autolyse', gr:'Deig',
    def:'Mel og vann blandes og får hvile før salt og gjær. Calvel målte at det kutter nødvendig eltetid med rundt 15 %. 30–45 minutter er nok; det finnes ingen publisert kurve som viser gevinst av lengre.',
    se:['Elting','Bassinage'] },
  { ord:'Bassinage', gr:'Deig',
    def:'Å holde igjen 5–10 % av vannet under eltingen og spe det inn til slutt. Deigen er stivere mens arbeidet gjøres, så kreftene overføres bedre — og den tar imot mer vann etter at glutenet har begynt å feste seg.',
    se:['Hydrering','Elting'] },
  { ord:'Elting', gr:'Deig',
    def:'Måles riktigst i arbeid, ikke minutter: 1 Wh/kg tilsvarer ca. 1,29 °C friksjonsvarme i deigen. Målsonen for åpen krumme er 3–5 Wh/kg, altså +4 til +6 °C. Effekten går som turtallet opphøyd i 1,3–1,7, så hastighet slår tid.',
    se:['Friksjonsvarme','Åpen krumme'] },
  { ord:'Friksjonsvarme', gr:'Deig',
    def:'Oppvarmingen mikseren tilfører. Nesten all mekanisk energi ender som varme, så temperaturstigningen er den eneste arbeidsmåleren et hjemmekjøkken har.',
    se:['Elting','Deigtemperatur'] },
  { ord:'Deigtemperatur', gr:'Deig',
    def:'Temperaturen ut av maskinen. Det ene tallet hele planen står på — en bom på 3 grader gir 30 % feil i timingen over en 3-timers bulk. Mål 24–25 °C for mager lys deig.',
    se:['Friksjonsvarme','Gjæringsdose'] },

  { ord:'Bulk', gr:'Heving',
    def:'Første heving, mens deigen står samlet i én masse — før den deles og bakes ut. Her lages både gass, smak og glutenstruktur. Målet er at 65–85 % av gjæringen skjer her.',
    se:['Utbaking','Kaldheving'] },
  { ord:'Utbaking', gr:'Heving',
    def:'Å dele deigen i emner og forme dem. Håndter bare de ytterste centimeterne — overflatespenningen som bygges her er halve ovnsløftet.',
    se:['Bulk','Ovnsløft'] },
  { ord:'Kaldheving', gr:'Heving',
    def:'Heving i kjøleskap, typisk 12–24 timer. Gir blemmer, rent snitt og bredt hevevindu. Fordi gjærdeig ligger på pH 5,5–6 blir den ikke sur av det. Merk at deigen bruker timer på å bli kald, og mesteparten av gjæringen skjer i den perioden.',
    se:['Bulk','Gjæringsdose'] },
  { ord:'Heveprosent', gr:'Heving',
    def:'Hvor mye deigen har vokst i volum. Måles enklest med 40 g deig i et rettvegget glass ved siden av boksen — der er høydeprosent lik volumprosent. Sett i ovnen ved 75–85 % av full heving, ikke ved 100 %.',
    se:['Bulk','Ovnsløft'] },
  { ord:'Gjæringsdose', gr:'Heving',
    def:'Appens kjernetall: integralet av gjærmengde × temperaturrate over hele planen, i enheten %-tørrgjær-timer ved 24 °C. Gjør ulike kombinasjoner av gjær, tid og temperatur direkte sammenlignbare.',
    se:['Kaldheving','Deigtemperatur'] },

  { ord:'Forferment', gr:'Forferment',
    def:'En liten deig som gjæres på forhånd og blandes inn i hoveddeigen. Gir smak og styrke. Poolish, biga og pâte fermentée er de tre vanlige.',
    se:['Poolish','Biga'] },
  { ord:'Poolish', gr:'Forferment',
    def:'Forferment på 100 % hydrering — like deler mel og vann, en tynn røre. Gir ekstensibilitet og en kremet, mildt vinøs smak. Lett å lese: klar når kuppelen begynner å synke. Trives på 20–22 °C.',
    se:['Biga','Ekstensibilitet'] },
  { ord:'Biga', gr:'Forferment',
    def:'Stiv forferment på 45–55 % hydrering. Gir styrke og ekstensibilitet samtidig, og en dypere, mer vinøs smak. At den «må ha 16–18 °C» er fagkonvensjon, ikke et målt optimum — 12–22 °C fungerer.',
    se:['Poolish','Pâte fermentée'] },
  { ord:'Pâte fermentée', gr:'Forferment',
    def:'Gammel deig — du klyper av 15–30 % av dagens deig og bruker den neste gang. Den eneste forfermenten med salt (2 %), som er grunnen til at den tåler 12–48 timer på kjøl uten å bli sur.',
    se:['Forferment'] },
  { ord:'Skålding', gr:'Forferment',
    def:'Å helle kokende vann over korn eller gryn. Frigjør sukker og gir en rund, nesten søtlig dybde uten syre. Ruggryn og havregryn må skåldes; kaldbløtlagt rugknekk blir grus i brødet.',
    se:['Bløtlegging'] },
  { ord:'Bløtlegging', gr:'Forferment',
    def:'Å la frø trekke vann før de går i deigen. Viktigst for tørste ting som kli, havre og chia (130–300 g vann per 100 g). Solsikke binder bare 80 og trenger det sjelden under 6 % av melet.',
    se:['Skålding','Effektiv hydrering'] },

  { ord:'Damp', gr:'Steking',
    def:'De første 15–20 minuttene. Kondenserende damp leverer enorm varme — ett gram tilsvarer 25 liter 230-gradig ovnsluft — og holder overflaten myk så snittet åpner seg. Etter kondensasjonsfasen fjerner damp derimot 25–31 % av varmestrømmen, så den skal ut igjen.',
    se:['Ovnsløft','Snitting'] },
  { ord:'Snitting', gr:'Steking',
    def:'Kuttet i overflaten før steking. Buet blad, 30–45° fra vannrett, 6–13 mm dypt, ett bestemt drag. Målet er en underskåret flik, ikke et kutt.',
    se:['Øre','Damp'] },
  { ord:'Øre', gr:'Steking',
    def:'Den oppkrøllede kanten langs snittet. Fliken løftes av deigen som utvider seg under, tørker, og settes i krøllet stilling av Maillard. Uten damp knekker den i stedet.',
    se:['Snitting','Maillard'] },
  { ord:'Maillard', gr:'Steking',
    def:'Reaksjonen mellom aminosyrer og reduserende sukker som gir brun skorpe og mesteparten av brødets aroma. Farten dobles til tredobles per 10 °C.',
    se:['Karamellisering','Skorpe'] },
  { ord:'Karamellisering', gr:'Steking',
    def:'Nedbrytning av sukker ved varme, uten aminosyrer. Terskelen varierer: fruktose fra ca. 110 °C, glukose 150, sukrose 160–170. Derfor bruner honning hardere enn vanlig sukker.',
    se:['Maillard'] },
  { ord:'Effusivitet', gr:'Steking',
    def:'Hvor raskt et materiale leverer varme gjennom en kontaktflate, √(k·ρ·c). Avgjør bunnvarmen: ved 250 °C leverer støpejern og tykt stål 232 °C mot deigen, cordierittstein 157 og glass 147.',
    se:['Ovnsløft'] },

  { ord:'Amylase', gr:'Kjemi',
    def:'Enzym som spalter stivelse til sukker, altså mat til gjæren og råstoff for skorpefargen. Melet har egen amylase — mengden måles som falltall.',
    se:['Falltall','Diastatisk malt'] },
  { ord:'Diastatisk malt', gr:'Kjemi',
    def:'Spiret og tørket korn som tilfører amylase. Norsk hvetemel ligger allerede i det optimale falltallsvinduet, så det trengs normalt ikke — 0,5 % trekker falltallet fra 327 til 194 sekunder og gir gummiaktig krumme.',
    se:['Amylase','Falltall'] },
  { ord:'Protease', gr:'Kjemi',
    def:'Enzym som bryter ned protein, altså gluten. Mest aktivt ved pH 3,0–4,5 — der surdeig ligger. Gjærdeig ligger på 5,4–6,0 og slipper unna, som er grunnen til at den tåler mye lengre kaldheving.',
    se:['Gluten','Kaldheving'] },
  { ord:'Pentosan', gr:'Kjemi',
    def:'Slimstoffer, særlig i rug (6–12 % mot hvetens 2–3 %). Binder opptil 16 ganger egen vekt vann og hindrer aktivt at glutenstrenger dannes. Derfor kan ikke rug bære et brød alene.',
    se:['Gluten'] },
  { ord:'Betaglukan', gr:'Kjemi',
    def:'Løselig fiber i havre og bygg. Gjør melet svært tørst og oppfører seg ikke-lineært — derfor tåler begge bare 35–40 % av melmengden.',
    se:['Pentosan'] },
  { ord:'Pyraziner', gr:'Kjemi',
    def:'Aromastoffene som dannes når frø ristes — nøtteaktig, ristet, kaffeaktig. Målt ga risting 28–51× mer pyrazin. De er vannløselige og flyktige, så en lang eller varm bløtlegging etterpå vasker dem ut igjen.',
    se:['Bløtlegging','Maillard'] }
];

/* ---------- TEGNINGER AV KORN OG FRØ ----------
   Rene inline-SVG-er: appen skal virke uten nett, så ingen bildefiler.
   Alle tegnes i samme 40×60-rutenett slik at størrelsene blir sammenlignbare —
   et enkornkorn ER smalere enn et hvetekorn, og det skal synes.
   `f` er fyllfarge, `s` er strek. Skalaen er omtrentlig, ikke målestokk.     */
const KORN_SVG = {
  /* --- korn ---
     Ekte kornkjerner ligner hverandre mye, så her er de kjennetegnene som
     faktisk skiller dem overdrevet: bredde/lengde-forholdet, hvor spisse endene
     er, om det er børstehår, og fargen. Ellers blir alt «oval med strek». */

  // Bredt og butt, dyp fure, tydelig børste i toppen.
  hvete: { farge:'#d9b877', kant:'#8a6f3c', svg:`
    <path d="M20 7 c11 0 15 11 15 24 c0 12 -5 22 -15 22 c-10 0 -15 -10 -15 -22 c0 -13 4 -24 15 -24z" class="f"/>
    <path d="M20 12 v36" class="s"/>
    <path d="M20 7 q-4 -6 -3 -7 M20 7 v-8 M20 7 q4 -6 3 -7" class="s2"/>` },

  // Langt og slankt, spisse ender i begge retninger.
  spelt: { farge:'#d3a96a', kant:'#87663a', svg:`
    <path d="M20 2 c8 8 11 20 11 30 c0 11 -4 22 -11 26 c-7 -4 -11 -15 -11 -26 c0 -10 3 -22 11 -30z" class="f"/>
    <path d="M20 10 v40" class="s"/>` },

  // Smalt, langt og lett buet. Gråere enn hvete.
  rug: { farge:'#c2ae86', kant:'#75664a', svg:`
    <path d="M20 3 c6 7 9 19 8 30 c-1 12 -4 21 -8 25 c-4 -4 -8 -13 -8 -25 c0 -11 2 -23 8 -30z" class="f"/>
    <path d="M20 9 q2 20 0 42" class="s"/>` },

  // Bredest av alle, med en tydelig spiss tipp.
  bygg: { farge:'#e2cd9a', kant:'#8f7c4e', svg:`
    <path d="M20 4 l4 8 c8 3 12 12 12 22 c0 12 -6 21 -16 21 c-10 0 -16 -9 -16 -21 c0 -10 4 -19 12 -22z" class="f"/>
    <path d="M20 14 v38" class="s"/>
    <path d="M11 26 q9 -4 18 0" class="s2"/>` },

  // Svært langt og tynt, med hår i toppen.
  havre: { farge:'#eadcbb', kant:'#94825a', svg:`
    <path d="M20 6 c6 8 8 22 8 32 c0 12 -3 20 -8 21 c-5 -1 -8 -9 -8 -21 c0 -10 2 -24 8 -32z" class="f"/>
    <path d="M20 12 v42" class="s"/>
    <path d="M20 6 q-5 -5 -7 -6 M20 6 q5 -5 7 -6 M20 6 v-6" class="s2"/>` },

  // Minst og smalest — enkorn er ett korn per småaks, tydelig flatklemt.
  enkorn: { farge:'#e0b44e', kant:'#9a7420', svg:`
    <path d="M20 10 c5 6 7 16 7 24 c0 9 -3 16 -7 19 c-4 -3 -7 -10 -7 -19 c0 -8 2 -18 7 -24z" class="f"/>
    <path d="M20 15 v32" class="s"/>` },

  // Stort og kantete, med flate sider.
  emmer: { farge:'#c98f52', kant:'#7d5424', svg:`
    <path d="M20 4 l10 9 l2 20 l-6 20 l-6 5 l-6 -5 l-6 -20 l2 -20z" class="f"/>
    <path d="M20 10 v42" class="s"/>
    <path d="M12 21 h16 M13 34 h14" class="s2"/>` },

  // Stort, kompakt og fasettert. Ravgul.
  durum: { farge:'#e8b544', kant:'#96701a', svg:`
    <path d="M20 5 l11 7 l3 19 l-5 20 l-9 4 l-9 -4 l-5 -20 l3 -19z" class="f"/>
    <path d="M20 11 v40" class="s"/>` },

  /* --- frø --- */
  // Dråpeform med de karakteristiske stripene.
  solsikke: { farge:'#cbb083', kant:'#6b5a3a', svg:`
    <path d="M20 4 c10 5 15 17 14 28 c-1 13 -6 22 -14 24 c-8 -2 -13 -11 -14 -24 c-1 -11 4 -23 14 -28z" class="f"/>
    <path d="M12 15 q5 21 2 38 M20 10 q2 23 0 44 M28 15 q-5 21 -2 38" class="s2"/>` },

  // Flat linse, spiss i den ene enden. Ikke en oval som kornene.
  linfro: { farge:'#a5703a', kant:'#61401c', svg:`
    <path d="M20 6 c11 6 15 18 15 27 c0 10 -6 19 -15 21 c-9 -2 -15 -11 -15 -21 c0 -9 4 -21 15 -27z" class="f"/>
    <path d="M20 12 q3 20 0 40" class="s2"/>
    <path d="M9 30 q11 -8 22 0" class="s2"/>` },

  // Bred, flat, med tydelig kantrand.
  gresskar: { farge:'#bfc98a', kant:'#6e7a45', svg:`
    <path d="M20 5 c11 2 16 13 16 25 c0 13 -6 24 -16 26 c-10 -2 -16 -13 -16 -26 c0 -12 5 -23 16 -25z" class="f"/>
    <path d="M20 10 c8 2 12 10 12 20 c0 11 -4 19 -12 21 c-8 -2 -12 -10 -12 -21 c0 -10 4 -18 12 -20z" class="s"/>` },

  // Liten dråpe.
  sesam: { farge:'#e8dcc0', kant:'#9a8b62', svg:`
    <path d="M20 14 c7 3 10 10 10 17 c0 8 -4 14 -10 16 c-6 -2 -10 -8 -10 -16 c0 -7 3 -14 10 -17z" class="f"/>` },

  // Bitte liten, flekkete.
  chia: { farge:'#8f8266', kant:'#544a35', svg:`
    <ellipse cx="20" cy="32" rx="8" ry="12" class="f"/>
    <circle cx="17" cy="27" r="1.5" class="s2f"/><circle cx="23" cy="33" r="1.5" class="s2f"/>
    <circle cx="19" cy="38" r="1.3" class="s2f"/>` },

  // Valset flak — bredere enn høyt.
  havregryn: { farge:'#e6d7b4', kant:'#93815a', svg:`
    <ellipse cx="20" cy="32" rx="17" ry="11" class="f"/>
    <path d="M5 30 q15 -6 30 0 M7 36 q13 5 26 0" class="s2"/>` },

  // Knust, kantete bit.
  ruggryn: { farge:'#b9a37a', kant:'#6f6044', svg:`
    <path d="M7 22 l13 -7 l14 9 l-3 15 l-11 9 l-14 -8z" class="f"/>
    <path d="M20 15 l-4 17 l15 7" class="s2"/>` },

  knekt_hvete: { farge:'#d3b884', kant:'#846b3d', svg:`
    <path d="M9 20 l12 -6 l13 8 l-3 16 l-12 8 l-12 -8z" class="f"/>
    <path d="M21 14 v15 l10 8" class="s2"/>` },

  // Uregelmessig, tynt skall-flak.
  hvetekli: { farge:'#b08a55', kant:'#6d5330', svg:`
    <path d="M5 28 q9 -12 19 -6 q11 6 12 13 q-12 9 -22 5 q-9 -4 -9 -12z" class="f"/>
    <path d="M9 27 q10 -5 18 5" class="s2"/>` },

  byggflak: { farge:'#ded0a4', kant:'#8d7d4f', svg:`
    <ellipse cx="20" cy="32" rx="16" ry="10" class="f"/>
    <path d="M7 28 q13 -5 26 0" class="s2"/>` },

  // Bokhvete er ikke et korn, men et trekantet nøttefrø — og den formen er
  // faktisk det enkleste kjennetegnet.
  bokhvete: { farge:'#b5a68c', kant:'#6b6050', svg:`
    <path d="M20 6 l14 24 l-14 24 l-14 -24z" class="f"/>
    <path d="M20 14 v32 M9 30 h22" class="s2"/>` },

  // Kikert: rund med den karakteristiske lille nebben.
  kikert: { farge:'#d8bc84', kant:'#8b7442', svg:`
    <path d="M20 8 c11 0 16 9 16 21 c0 12 -6 21 -16 21 c-10 0 -16 -9 -16 -21 c0 -12 5 -21 16 -21z" class="f"/>
    <path d="M20 8 l4 -6 l-7 1z" class="f"/>
    <path d="M13 24 q7 -5 14 0" class="s2"/>` },

  linfro_malt: { farge:'#9c6c3c', kant:'#5d3f1f', svg:`
    <ellipse cx="20" cy="34" rx="15" ry="8" class="f"/>
    <circle cx="13" cy="32" r="1.7" class="s2f"/><circle cx="20" cy="36" r="1.7" class="s2f"/>
    <circle cx="27" cy="32" r="1.5" class="s2f"/>` }
};

/* Hvilken tegning hører til hvilket mel? Flere melsorter deler samme korn. */
const MEL_KORN = {
  regal_standard:'hvete', hvetemel:'hvete', regal_relax:'hvete', hvetemel_sterkt:'hvete',
  hvetemel_stein:'hvete', caputo_cuoco:'hvete', caputo_blaa:'hvete', tipo00:'hvete',
  landhvete:'hvete', samalt_hvete:'hvete', samalt_hvete_grov:'hvete', fullkorn_fibra:'hvete',
  regal_tipo00:'hvete', kolonihagen:'hvete', mollerens_tipo00:'hvete', manitoba_oro:'hvete',
  rug_siktet:'rug', samalt_rug:'rug', samalt_rug_grov:'rug', svedjerug:'rug',
  kikertmel:'kikert', bokhvete:'bokhvete',
  enkorn:'enkorn', emmer:'emmer', spelt_siktet:'spelt', samalt_spelt:'spelt',
  havremel:'havre', byggmel:'bygg', durum:'durum', annet:'hvete'
};

/* ---------- DOSE–RESPONS FOR TILLEGG ----------
   Hva koster et tillegg i ovnsløft, og hva gir det i smak? Tabellene er
   ankerpunkter fra publisert litteratur; appen interpolerer mellom dem.

   Det viktigste enkeltfunnet, og grunnen til at denne tabellen finnes:
   OVNSLØFTET FALLER 2–3× RASKERE ENN VOLUMET. Aldawsari & Simsek målte at ved
   6 % linfrømel var brødvolumet 6 % HØYERE enn kontrollen, mens ovnsløftet
   allerede var 19 % LAVERE. Volumtallene i litteraturen underdriver derfor
   systematisk skaden på det som betyr mest her.

   Kilder: Aldawsari & Simsek 2014 (J. Food Research 3(6)); PMC4244912
   (linfrø/kli, samme bakemetode); PMC12192202 (havrekli, metning); PMC10252298
   (chia); Sci. Rep. 9:11295 (risting og pyraziner); Gélinas & McKinnon 2018
   (sukker og gassproduksjon); Chin et al. 2010 (fett, optimum 4 %);
   Foods 2024 PMC11171671 (fast fett vs oleogel); LWT 229:118150 (malt).       */
const TILLEGG_EFFEKT = {
  /* Total frøandel i % av mel → relativ verdi mot brød uten frø (100 = uendret).
     «Bløtlagt» forutsetter at frøene er mettet OG at bløtevannet er bokført.
     Smak er en skala 0–10 for uristede frø; risting omtrent dobler den. */
  fro: {
    pct:        [0,   5,   10,  15,  20,  25,  30],
    loftBloet:  [100, 93,  84,  76,  67,  58,  48],
    loftTort:   [100, 88,  76,  64,  53,  43,  34],
    volumBloet: [100, 100, 96,  91,  85,  78,  70],
    smak:       [0,   3.5, 6.0, 7.5, 8.5, 9.0, 9.5],
    // Bløtlagte frø er et fuktlager: de slipper vannet langsomt tilbake til
    // krummen og forlenger mykheten. Det er frøenes ene gratis gevinst — den
    // koster ikke løft, den kommer av vannet de allerede bærer.
    saftighet:  [0,   2,   4,   5.5, 6.5, 7,   7.5],
    kilde:'Aldawsari & Simsek 2014 · PMC4244912 · PMC12192202'
  },
  /* Honning i % av mel. Gassproduksjon topper lavt og faller; bruningen er den
     eneste effekten som virkelig monner — og den er tveegget, fordi en skorpe
     som setter seg tidlig fysisk begrenser ekspansjonen. */
  honning: {
    pct:     [0,   1,   2,   3,   5,   7,   10],
    loft:    [100, 101, 102, 102, 100, 95,  85],
    bruning: [100, 120, 140, 160, 210, 245, 290],
    smak:    [0,   0,   0,   0.5, 2,   5,   8],
    // Fruktose er det mest hygroskopiske vanlige sukkeret og binder fuktighet
    // i krummen. Ved 3 % er effekten liten — anslagsvis et halvt til ett døgn.
    saftighet:[0,  0.5, 1,   1.5, 2.5, 3.5, 5],
    kilde:'Gélinas & McKinnon 2018 · Verheyen et al. Foods 2022'
  },
  /* Fett i % av mel. Flytende olje kan ikke stabilisere gassceller slik
     fettkrystaller gjør — målt forskjell 8,8 % spesifikt volum. */
  fett: {
    pct:    [0,   1,   2,   3,   5,   8,   10],
    olje:   [100, 105, 110, 113, 114, 106, 99],
    fast:   [100, 106, 112, 117, 119, 111, 104],
    // Målt: krummehardhet 686 g med 3 % fett mot 1163 g uten — altså 69 % hardere
    // uten. Fett er det sterkeste antistaling-grepet i lista.
    saftighet:[0,  2,   3.5, 5,   6,   6.5, 7],
    kilde:'Chin et al. 2010 · Foods 2024 PMC11171671 · PMC5821639 · SciELO Braz. J. Pharm. Sci.'
  },
  /* Diastatisk malt i % av mel, på NORSK hvetemel med falltall ~300 s — altså
     mel som allerede ligger i det optimale vinduet 250–320 s og ikke trenger
     malt. Gummirisikoen er forhøyet av lang kaldheving. */
  malt: {
    pct:      [0,   0.2, 0.4, 0.6, 0.8, 1.0],
    falltall: [300, 250, 205, 180, 155, 122],
    loft:     [100, 102, 104, 105, 105, 105],
    gummi:    [0,   1,   3,   6,   8,   10],
    kilde:'Canale et al. 2025 LWT 229:118150 · Mäkinen & Arendt 2012'
  }
};

/* ---------- KONSEKVENSER AV Å ENDRE ET FELT ----------
   For hvert felt i appen: hva er anbefalt, hva skjer om du skrur opp, hva skjer
   om du skrur ned, og hvorfor. Nøkkelen er feltets id i index.html.
   `opt` kan være en streng eller en funksjon av tilstanden.                  */
const PARAM_INFO = {
  hydrering: {
    navn:'Hydrering',
    opt:'72–76 % for et frittstående brød på butikkmel. I lukket gryte tåler du 3 prosentpoeng mer, fordi veggene støtter deigen mens den utvider seg.',
    opp:'Mer damp i ovnen og dermed <b>mer ovnsløft</b> — 45–55 % av løftet er vann som fordamper. Åpnere krumme, saftigere brød, lengre holdbarhet. Men deigen blir vanskeligere å forme, og over melets tak flyter den ut sidelengs i stedet for å reise seg.',
    ned:'Strammere deig som er lett å håndtere og holder formen. Tettere og jevnere krumme, tørrere brød, kortere holdbarhet. Under ca. 65 % mister du merkbart av løftet.',
    hvorfor:'Vann er både byggemateriale for glutenet og drivstoffet i ovnen. Det er den eneste spaken som gir <i>både</i> saftighet og løft — alt annet som gjør brødet saftigere, koster løft.'
  },
  saltPct: {
    navn:'Salt',
    opt:'1,8–2,0 %. Gå mot 2,0 når melet er svakt.',
    opp:'Strammere og mer stabil deig — målt faller Mixing Tolerance Index fra 80 til 40 BU når saltet går fra 0 til 1,5 %. Mørkere skorpe. Over 2,2 % begynner du å betale i hevehøyde uten å vinne smak, og gjæringen bremser merkbart.',
    ned:'Raskere gjæring og litt mer volum på papiret. Men brødet smaker flatt, hevingen blir uforutsigbar, og skorpa blir blekere fordi gjæren rekker å spise opp sukkeret.',
    hvorfor:'Salt strammer glutenet og bremser gjæren. Svakt mel vinner målt +51 % styrke på salt, sterkt mel bare +9 % — derfor betyr saltet mest nettopp når melblandingen er svak.'
  },
  honningPct: {
    navn:'Honning',
    opt:'1,5–2,5 % når ovnsløft er førsteprioritet. 3–4 % for et balansert hverdagsbrød.',
    opp:'Kraftigere skorpefarge — ca. +20 % bruningsrate per prosentpoeng. Litt saftigere krumme. Men skorpa setter seg tidligere, og det <b>lukker ekspansjonsvinduet</b> mens brødet fortsatt vil vokse. Over 5 % faller gassproduksjonen av osmotisk stress.',
    ned:'Lysere skorpe, lengre ekspansjonsvindu. Du taper nesten ingenting i heving: gassproduksjonen er målt konstant opp til 6 % sukker, fordi melets egen amylase allerede leverer nok.',
    hvorfor:'Honning er invertsukker, og fruktose karamelliserer fra 110 °C mot sukrosens 160. Den bruner derfor hardere enn vanlig sukker. Sødme merkes først rundt 4–5 % i et langtidsgjæret brød — under det er honning en ren skorpeingrediens.'
  },
  oljePct: {
    navn:'Olivenolje',
    opt:'0 % hvis du jakter maks løft med metall under brødet. 3 % for mykere krumme og lengre holdbarhet.',
    opp:'Mykere krumme og merkbart lengre holdbarhet — målt 69 % hardere krumme uten fett enn med 3 %. Volumet stiger til rundt 4–5 %, deretter faller det.',
    ned:'Sprøere skorpe og renere kornsmak. Brødet tørker raskere.',
    hvorfor:'Fett stabiliserer gassceller — men bare <i>fast</i> fett gjør det ordentlig. Fettkrystaller smelter under steking og mater grenseflatemateriale til boblene som utvider seg; flytende olje kan ikke det. Målt koster byttet 8,8 % spesifikt volum. Vil du ha maks løft, er smør sterkere enn olivenolje.'
  },
  sukkerPct: {
    navn:'Sukker',
    opt:'0 % i et magert brød. Honning gjør samme jobb med mer farge.',
    opp:'Mørkere skorpe og mykere krumme. Over 5–6 % bremser det gjæringen gjennom osmotisk stress, og over 10 % svekkes glutenet av vannkonkurranse.',
    ned:'Renere smak, lysere skorpe, mer forutsigbar gjæring.',
    hvorfor:'Sukrose må spaltes av invertase før gjæren får bruk for den, så den starter tregere enn honning og bruner mindre ved samme mengde.'
  },
  smorPct: {
    navn:'Smør',
    opt:'0 % i magert brød. 3 % hvis du vil ha mykhet og samtidig beholde løftet.',
    opp:'Mykere krumme, lengre holdbarhet, og bedre volum enn samme mengde olje fordi fettkrystallene stabiliserer gassceller. Over 5 % kortes glutentrådene og gassretensjonen faller.',
    ned:'Sprøere skorpe, renere smak, raskere tørking.',
    hvorfor:'Smør er ca. 16 % vann, som appen trekker fra hovedvannet. Under 5 % kan det inn når som helst; over 5 % skal det inn etter at glutenet er utviklet.'
  },
  maltPct: {
    navn:'Diastatisk malt',
    opt:'0 %. Norsk hvetemel ligger på 280–320 s falltall, som allerede <i>er</i> det optimale vinduet.',
    opp:'Mer maltose gjennom hele hevingen, altså mørkere skorpe og litt mer volum. Men målt trekker 0,5 % falltallet fra 327 til 194 s — langt under vinduet — og farinograf-stabiliteten faller fra 7,5 til 2,6 min. Resultatet er klissete, gummiaktig krumme.',
    ned:'Tryggere krumme og sterkere deig. Risikoen er blek skorpe hvis melet faktisk har høyt falltall.',
    hvorfor:'Lang kaldheving gir amylasen 3–8 timers ekstra romtemperert arbeid, så riktig dose er <i>lavere</i> ved lang heving enn ved kort. Er det rug i deigen, senk ytterligere — rug har rikelig egen amylase.'
  },
  gjaerPct: {
    navn:'Gjærmengde',
    opt:'Løses av gjæringsdosen. For en optimalplan lander den rundt 0,18 % tørrgjær.',
    opp:'Raskere heving og kortere prosess. Men hevevinduet krymper — over 1 % tørrgjær er det 10–20 minutter bredt — og du får gjærsmak, flatere aroma og dårligere løft.',
    ned:'Bredere og mer tilgivende hevevindu, mer smak fra lengre gjæring. Krever tid: halverer du gjæren må dosen hentes inn med timer eller varme.',
    hvorfor:'Gjæren formerer seg underveis. Over en lang bulk vokser populasjonen betydelig, så «halver gjæren, doble tiden» stemmer bare for korte og kalde hevinger. Det er derfor appen regner i dose og ikke i prosent.'
  },
  startTemp: {
    navn:'Deigtemperatur ut av maskin',
    opt:'24–25 °C for mager lys deig. 21–22 °C hvis du skal langtidsheve.',
    opp:'Raskere gjæring og kortere bulk. Over 26 °C får du hard, gjæraktig smak, slapp deig og et hevevindu som kollapser. Over 30 °C er det ingenting å hente — maks oppnåelig fart er bare 1,81× fra 24 °C.',
    ned:'Langsommere, jevnere gjæring og mer smak. Glutenbindingen fortsetter under hevingen i stedet for å bli fullført i maskinen. Under 20 °C blir bulken lang nok til å bli upraktisk.',
    hvorfor:'Dette er det ene tallet hele planen står på. En bom på 3 grader gir 30 % feil i timingen over en 3-timers bulk.'
  },
  eltetid: {
    navn:'Eltetid',
    opt:'Den tiden som gir 3–5 Wh/kg, altså +4 til +6 °C friksjonsvarme. På en hjemmespiral på lav hastighet er det 12–16 minutter.',
    opp:'Mer volum, men <b>finere og jevnere krumme</b> — mer arbeid pisker inn flere og mindre luftbobler, og alle gassceller i det ferdige brødet stammer fra elting. Over 5–6 Wh/kg mister du den åpne krummen. Eltingen bleker dessuten melet oksidativt.',
    ned:'Åpnere og mer uregelmessig krumme, mer smak og farge. Under ca. 2 Wh/kg er glutenet ikke ferdig utviklet, og deigen holder ikke på gassen.',
    hvorfor:'Det er arbeidet som teller, ikke minuttene. Effekten går som turtallet opphøyd i 1,3–1,7, så dobbel hastighet gir 2,5–3,2× arbeid per minutt. Mekanisk sammenbrudd er nesten umulig hjemme — skaden er oksidativ og strukturell.'
  },
  ffPctMel: {
    navn:'Forfermentens andel av melet',
    opt:'25–35 % for poolish, 30–50 % for biga.',
    opp:'Mer smak og mer deigstyrke, og forfermenten gjør en større del av gjæringsarbeidet. Over 50 % blir hoveddeigen så liten at du mister kontrollen over sluttpunktet.',
    ned:'Mindre smaksbidrag, men enklere å styre. Under 20 % blir gjærmengden i forfermenten så liten at den er vanskelig å veie.',
    hvorfor:'I 24 gjennomregnede publiserte formler gjør forfermenten rundt 30 % av gjæringsarbeidet. Men du bruker den for smak og styrke — tidsbesparelsen er en bieffekt.'
  },
  ffHydrering: {
    navn:'Forfermentens hydrering',
    opt:'100 % for poolish, 45–50 % for biga.',
    opp:'Mer ekstensibilitet, mildere og mer kremet smak, lettere å lese — du ser når kuppelen synker. Men mindre deigstyrke, og proteasene får friere spillerom.',
    ned:'Mer styrke og en dypere, mer vinøs smak. Den stive matrisen beskytter glutenet og bremser proteasene, så den tåler tid bedre. Trenger til gjengjeld mer gjær ved samme modningstid.',
    hvorfor:'Dette er den ene forskjellen mellom poolish og biga — alt annet følger av den. Hydreringen er dessuten den best dokumenterte spaken for syreprofilen: stiv deig favoriserer eddiksyre.'
  },
  ffTimer: {
    navn:'Forfermentens modningstid',
    opt:'12–16 timer for poolish ved 21–22 °C. 16–18 timer for biga.',
    opp:'Mer smaksdybde, og mindre gjær trengs. Over det harde taket tar tilfeldige melkesyrebakterier over, ekte surhet dukker opp og glutenet brytes ned.',
    ned:'Mildere smak og mindre bidrag til deigen. Krever mer gjær for å bli moden i tide.',
    hvorfor:'Ta den når den har kuppel og akkurat begynner å synke i midten, med vannmerke på beholderveggen. Klokka er en pekepinn — utseendet avgjør.'
  },
  ffTemp: {
    navn:'Forfermentens temperatur',
    opt:'20–22 °C for poolish. For biga er 14–22 °C alt sammen brukbart.',
    opp:'Raskere modning, mindre gjær. Over 26 °C forskyves forholdet mellom gjær og melkesyrebakterier, og du får en annen og skarpere smak.',
    ned:'Langsommere modning og bredere brukbart vindu. Under 12 °C er det en annen prosess: en kald forferment modnes enzymatisk, ikke ved gassproduksjon, og appens formel gjelder ikke.',
    hvorfor:'At biga «må ha 16–18 °C» er fagkonvensjon, ikke et målt optimum — det finnes ingen publisert temperaturoptimalisering. Mellom 12 og 22 °C endrer alle rater seg jevnt med under 2×.'
  },
  planUtbak: {
    navn:'Utbaking og benkehvile',
    opt:'40–50 minutter for rundbrød. Ciabatta deles 30–45 min før ovnen.',
    opp:'Mer avslappet deig som er lettere å forme, men overflatespenningen slakner og emnet kan flyte ut.',
    ned:'Strammere emne som holder formen bedre, men risikerer å rive i snittet fordi glutenet ikke har fått slappe av.',
    hvorfor:'Overflatespenningen fra formingen er halve ovnsløftet: et stramt skinn gjør at deigen motsetter seg utvidelse, så mer gass hoper seg opp før den ser ferdig hevet ut.'
  },
  vektTrinn: {
    navn:'Vektas oppløsning',
    opt:'0,01 g hvis du har finvekt. Det er den som avgjør om du kan veie gjæren direkte.',
    opp:'Grovere vekt betyr at små mengder må lages som oppslemming i stedet for å veies.',
    ned:'Finere vekt lar deg veie gjær og malt direkte, uten mellomregning.',
    hvorfor:'Tommelfingerregelen er at avlesningen bør være minst 20 ganger minste trinn. Under det spiser vektas egen usikkerhet på ±1–2 siffer en merkbar andel av mengden.'
  }
};

/* ---------- STEKEUTSTYR ----------
   Effusivitet e = √(k·ρ·c) styrer kontaktvarme. Kontakttemperaturen er
   regnet mot kald deig (6 °C rett fra kjøleskapet) ved 250 °C helle.        */
const UTSTYR = [
  { id:'stal15', navn:'15 mm bakestål (ditt)', effusivitet:13625, kontakt:232, forvarm:'90–120 min',
    damp:'må ordnes separat', best:'Ciabatta, baguetter, pizza, og brød hvis du kombinerer med kloke',
    om:'Toppklasse på bunnvarme — identisk med støpejern. 15 mm lagrer 55 700 J/m²K, seks ganger et 5 mm glass. Baksiden er at det må forvarmes lenge: de fleste gir et 15 mm stål 30–45 minutter, og da ligger det fortsatt 40–60 °C for lavt. Regn 90 minutter, gjerne 2 timer.' },
  { id:'glass', navn:'Pyrex Slow Cook 4,4 L med lokk (din)', effusivitet:1453, kontakt:147, forvarm:'sammen med stålet, maks 230 °C',
    damp:'utmerket — lukket kammer', best:'Damp og fuktighetskontroll, ikke bunnvarme',
    om:'Produsentspesifikasjon: tåler −40 til +300 °C, og termisk sjokk opptil 220 °C differanse. Det er borosilikat-tall — herdet kalknatronglass ligger på 60–80 °C — så den tåler langt mer enn typisk glassbakeutstyr. Som dampkammer er den fullverdig: en lukket gryte trenger bare ~2 g damp, og brødet inneholder selv 350–400 g vann. Som helle er den svak: effusivitet 1 453 mot støpejernets 13 123. Glasset måtte holdt 397 °C for å matche støpejern på 250. Løsningen er å la stålet levere bunnvarmen og glasset dampen. Innvendig 21,5 cm bred og 13,5 cm høy med lokket på — komfortabelt til 700–800 g emner, trangt over 900 g.' },
  // kontakt:213, ikke 232: kontakttallene er regnet ved 250 °C helle (se
  // headerkommentaren), men dette oppsettet er låst til 230 av Pyrexens
  // 220-graders termiske sprang. Ved 230 °C mot 6-graders deig blir det ~213.
  { id:'glass_stal', navn:'★ Pyrex-gryta PÅ 15 mm stålet', effusivitet:13625, kontakt:213, forvarm:'stål 90–120 min, gryta inn siste 20 min',
    damp:'utmerket — lukket kammer', best:'Dette er ditt beste oppsett for rundbrød',
    om:'Stålet leverer ca. 213 °C kontakttemperatur gjennom glassbunnen ved 230-graders ovn (232-tallet forutsetter 250 °C, som Pyrexen ikke tåler), gryta leverer dampen. Du får begge gryteoppgavene løst med utstyr du allerede eier. Sett gryta på det ferdig forvarmede stålet de siste 20 minuttene av forvarmingen, hold deg på 230 °C, og last inn på bakepapir. Da er temperaturspranget godt innenfor de 220 °C spesifikasjonen tåler.' },
  { id:'stopejern', navn:'Støpejernsgryte (referanse)', effusivitet:13123, kontakt:232, forvarm:'45–60 min',
    damp:'utmerket — lukket kammer', best:'Alt av frittstående brød',
    om:'Løser damp og bunnvarme i én gjenstand. Dette er fasiten alle andre oppsett måles mot.' },
  { id:'apen', navn:'Åpen steking på stein', effusivitet:1730, kontakt:157, forvarm:'60–90 min',
    damp:'må ordnes separat', best:'Flere brød samtidig',
    om:'Cordieritstein leverer 157 °C kontakttemperatur mot støpejernets 232. Krever et skikkelig dampoppsett for å konkurrere.' }
];

/* ---------- FAGSTOFF ---------- */
const TIPS = [
  {
    tittel:'Ovnsløft — de sju tingene som faktisk avgjør det',
    ikon:'▲',
    intro:'Ovnsløft er ikke en CO₂-ballong. Det er en dampmaskin som går inne i deigen. Det snur prioriteringene: vann som blir damp står for 45–55 % av løftet, CO₂ ut av løsning 20–30 %, ren termisk utvidelse 15–25 %, etanol ~5 %, og fortsatt gjæraktivitet bare 2–5 %. «Fanget CO₂ utvider seg» ble motbevist i 1985.',
    punkter:[
      ['1. Hevegraden — den desidert vanligste årsaken til dårlig løft','Sett inn ved 75–85 % av full heving, altså synlig FØR toppen. Løftet kjøpes med to valutaer: gass som ennå ikke har utvidet seg, og overflatespenning som holder igjen. Et fullhevet brød har brukt opp begge. Trykktest: gropen skal fylles langsomt igjen over 5–10 sekunder og etterlate et synlig merke. Er du i tvil, bak 15 minutter for tidlig.'],
      ['2. Bunnvarme — kontakttemperatur, ikke ovnstemperatur','Det som teller er effusiviteten til hella, ikke hvor varm ovnen er. Ved 250 °C leverer støpejern og tykt stål 232 °C mot deigen, cordierittstein 157 °C og glass 147 °C. Et glass måtte holdt 397 °C for å matche støpejern på 250. Løsningen er alltid å legge metall under brødet.'],
      ['3. Damp de første 15–20 minuttene','Latentvarmen ved kondensering er 2 257 kJ/kg. Ett gram kondenserende damp leverer like mye varme som 25 liter 230-gradig ovnsluft avkjølt til 100. Dampen holder også overflaten myk så snittet åpner seg i stedet for å revne. Men etter kondensasjonsfasen — som er over etter ~2 minutter — fjerner dampen 25–31 % av varmestrømmen, fordi vanndamp absorberer infrarødt. Derfor: hardt inn tidlig, helt ut ved 15–20 min.'],
      ['4. Hydrering er en løftespak, ikke bare en krummespak','Siden nesten halve løftet er fordampende vann, gir mer vann direkte mer løft — så lenge strukturen holder. Det er derfor en gryte lar deg gå 3–5 prosentpoeng høyere enn åpen steking: veggene støtter deigen mens den utvider seg.'],
      ['5. Overflatespenning fra formingen','Et stramt skinn gjør at deigen motsetter seg utvidelse, så mer gass hoper seg opp før den «ser» ferdig hevet ut. Den oppsparte gassen er nettopp det som blir ovnsløft. Håndter bare de ytterste 1 cm.'],
      ['6. Kald deig rett fra kjøleskapet','Den kalde kjernen holder seg ekstensibel lenger mens bunnen varmes opp, så utvidelsesvinduet blir bredere. Kald deig snitter dessuten rent. Legg 2–4 minutter på steketiden.'],
      ['7. Snittet — en underskåret flik, ikke et kutt','Buet blad, 30–45° fra vannrett, 6–13 mm dypt, ett bestemt drag. Fliken løftes av deigen som utvider seg under, tørker og settes i krøllet stilling av Maillard. Uten damp knekker den i stedet for å krølle seg.'],
      ['Vinduets lengde','For et 800–900 g brød varer ovnsløftet 15–20 minutter, med ca. 80 % levert i de første 10–12. Krummen settes over 70–85 °C, og volumet låses når overflaten tørker ut og passerer 100 °C — ikke av forgelatineringen i seg selv.']
    ]
  },
  {
    tittel:'⚠ Glassgryte — damp uten bunnvarme, og en sikkerhetsadvarsel',
    ikon:'⚠',
    varsel:true,
    intro:'Du steker i glassgryte. Den gjør én av gryteoppgavene perfekt og den andre dårlig, og det er verdt å vite nøyaktig hvilken.',
    punkter:[
      ['Dampen: fullverdig','En lukket gryte trenger bare rundt 2 gram damp for å mettes, og et 900 g brød inneholder 350–400 g vann. Brødet damper seg selv 200 ganger over. Her er glass akkurat like bra som støpejern, og du skal ikke tilsette vann.'],
      ['Bunnvarmen: ni ganger dårligere','Effusivitet √(k·ρ·c) styrer hvor fort varme krysser en kontaktflate. Borosilikatglass ligger på 1 453, støpejern på 13 123. Ved 250 °C betyr det 147 °C mot deigbunnen i glass, mot 232 °C i støpejern. Et 5 mm glass lagrer dessuten 9 255 J/m²K mot ditt 15 mm ståls 55 695 — seks ganger mindre.'],
      ['Løsningen du allerede eier','Sett glassgryta oppå det forvarmede 15 mm-stålet. Stålet leverer bunnvarmen gjennom glasset, glasset leverer dampen. Enda bedre, hvis fasongen tillater det: sett brødet DIREKTE på stålet og snu glassgryta over som en kloke. Da får du full metallkontakt og lukket dampkammer samtidig — nøyaktig oppsettet som vant King Arthurs egen metodesammenligning.'],
      ['✔ Din Pyrex Slow Cook — spesifikasjonen er avklart','Produsenten oppgir −40 til +300 °C, og termisk sjokk opptil 220 °C differanse («fra −20 i fryseren til +200 i ovnen»). Det er borosilikat-tall. Til sammenligning tåler herdet kalknatronglass, som det meste av moderne amerikansk «Pyrex» er laget av, bare 60–80 °C. Du har altså langt mer margin enn typisk glassbakeutstyr.'],
      ['Hva de 220 gradene betyr i praksis','Setter du 5-graders deig rett fra kjøleskapet ned i en 250-graders gryte, er spranget 245 °C — over spesifikasjonen. Ved 230 °C og deig på bakepapir er du innenfor. Derfor: <b>forvarm til 230 °C, ikke 250</b>, og last alltid inn på bakepapir. Papiret er ikke for at brødet skal slippe; det er et termisk mellomlegg.'],
      ['Størrelsen din','Innvendig 21,5 cm bred og 13,5 cm høy med lokket på. Et 900 g rundbrød blir ca. 20 cm bredt og 11 cm høyt etter løftet — det går, men er trangt. <b>700–800 g emner er den komfortable størrelsen i denne gryta</b>, og gir dessuten mer plass til fritt ovnsløft.'],
      ['Trygg variant hvis du vil unngå spranget helt','Kaldstart: legg deigen i romtemperert gryte, sett inn i kald ovn og la alt stige sammen. Du mister noe løft, men null risiko. Fordi glass uansett leder dårlig, koster en hard forvarming deg mindre her enn i støpejern — kaldstart er et mer fornuftig kompromiss i glass enn i metall.'],
      ['Rangering for maks ovnsløft med ditt utstyr','1) Brød på stålet med glasset som kloke over. 2) Glassgryte stående på det forvarmede stålet. 3) Åpen steking på stålet med kokende vann i forvarmet støpejernspanne. 4) Glassgryte alene på rist — det svakeste alternativet, og sannsynligvis der du er i dag.']
    ]
  },
  {
    tittel:'Ditt 15 mm stål — du forvarmer det nesten helt sikkert for kort',
    ikon:'▬',
    intro:'15 mm stål er kraftigere utstyr enn de fleste hjemmebakere eier. Det har én kostnad: treghet.',
    punkter:[
      ['Tallene','15 mm stål lagrer 55 695 J/m²K. Til sammenligning: 6 mm stål 22 100, 15 mm cordierittstein 28 050. Du har altså mer enn dobbelt så mye leverbar energi som en vanlig bakestein.'],
      ['Forvarmingstiden skalerer med det','Målt data for en 15 mm stein ved 260 °C: etter 15 min ligger overflaten 116 °C for lavt, etter 30 min 47 °C for lavt, etter 45 min 27 °C for lavt, og først ved 60 min er den framme. Ditt stål har dobbelt så høy arealkapasitet, så regn 90–120 minutter for full metning. De aller fleste gir et slikt stål 30–45 minutter.'],
      ['Hvorfor det ikke føles slik','Stål er internt utjevnet på sekunder, så overflaten kjennes varm lenge før massen er ladet. Det er den lagrede energien, ikke overflatetemperaturen, som avgjør hva brødet får de første to minuttene.'],
      ['Emissivitet','Et nytt, blankt stål forvarmes mer enn dobbelt så sakte som det samme stålet når det er godt innsvidd og svart, fordi strålingsvarmeovergangen går fra ca. 6,5 til 29 W/m²K. Sving det inn — det fikser både forvarming og måling.'],
      ['At ciabattaen din blir bra','Gir mening: ciabatta stekes 20–25 min, så den henter ut mest mulig av stålets fortrinn i den korte, intense fasen. Får du enda lengre forvarming, er det der du finner de siste prosentene.']
    ]
  },
  {
    tittel:'Kjernetanken: surdeigskvalitet uten surdeig',
    ikon:'◆',
    intro:'Nesten alt som gjør surdeigsbrød godt, er ikke syren. Det er lav gjærmengde, forferment, skånsom glutenutvikling, kaldheving og god håndtering. Alle fem overføres fullt ut til gjærdeig.',
    punkter:[
      ['Det eneste som IKKE overføres','Surdeig ligger på pH 3,8–4,3. Der er hveteproteasene på sitt mest aktive, så deigen blir gradvis mykere og mer ekstensibel underveis. Gjærdeig ligger på pH 5,4–6,0 og forblir spenstig og elastisk. Alle ekstensibilitetsproblemer i gjærbaking sporer tilbake til akkurat dette.'],
      ['Kompensasjonen','Kjøp ekstensibiliteten et annet sted: poolish 25–35 % av melet, autolyse 1–3 timer, bassinage (hold igjen 10–15 % av vannet), 0,25–0,5 % diastatisk malt, bland inn 10–20 % svakere mel i veldig sterkt mel, og ikke elt til full vindusrute.'],
      ['Målt fakta om syre','48 timer ved 22 °C med ren gjær flytter pH kun ~0,7 enheter (6,13 → 5,44). Melkesyre etter 48 t: 0,17 g/kg med gjær mot 4,93 g/kg med melkesyrebakterier — 29 ganger forskjell. En gjærdeig KAN ikke bli sur. Det er derfor du trygt kan kjøre lange kaldhevinger uten å få smaken du misliker.'],
      ['Bonus du får gratis','Fordi gjærdeigen ligger over proteasenes aktiveringsvindu, tåler den langt lengre kaldheving enn surdeig. Surdeig: 18–24 t ved 4 °C. Mager gjærdeig på sterkt mel: 72 t.']
    ]
  },
  {
    tittel:'⚠ Korreksjon til notatene dine: poolish-gjæren',
    ikon:'⚠',
    varsel:true,
    intro:'Notatet ditt sier «20 % poolish + 0,5 % gjær, 12–18 timer ved 23 °C, maks 26 timer». Tre uavhengige profesjonelle kilder (Calvel/Rosada via SFBI, den klassiske franske bakertabellen, og Weekend Bakery) konvergerer mot et helt annet tall.',
    punkter:[
      ['Hva 0,5 % faktisk er','0,5 % tørrgjær er en 3–4 timers poolish, ikke en 12–18 timers. Ved 23 °C topper den etter 3–4 t, er kollapset etter 6 t, og er inne i proteasedrevet oppløsning ved 12 t. Selv lest som fersk gjær (= 0,17 % tørr) er det en ~10 timers poolish.'],
      ['Riktige tall ved 23 °C, i % av POOLISH-melet','12 t: 0,11 % tørr / 0,33 % fersk. 14 t: 0,09 % / 0,27 %. 16 t: 0,07 % / 0,21 %. 18 t: 0,05 % / 0,15 %. Det er rundt 6× mindre gjær enn notatet.'],
      ['«Maks 26 timer» er også for sjenerøst','Ved 23 °C er brukstiden ca. 12–17 t, hardt tak rundt 19 t. Over det tar tilfeldige melkesyrebakterier over, ekte surhet dukker opp, glutenet brytes ned og deigen blir klissete. Skal planen skli, sett poolishen i kjøleskapet ved 12 t — kaldt holder den ytterligere 12–24 t nesten uten syreøkning.'],
      ['Én ting notatet ditt har helt rett i','Å gå ned til 20 % poolish er gyldig, men konservativt. 25–35 % gir mer. Praktisk poeng: ved 20 % poolish på 1000 g mel blir 0,08 % tørrgjær = 0,16 g, som er under det de fleste kjøkkenvekter klarer. Enten øk til 30 %, eller bruk fersk gjær (0,5 g), eller lag en oppslemming.'],
      ['Riktig anbefaling','30 % av melet · 100 % hydrering · 0,25 % fersk gjær av poolishmelet · 14 t ved 23 °C · brukbar 12–17 t · hardt tak 19 t. Ta den når den har kuppel og akkurat begynner å synke i midten, med vannmerke på beholderveggen.'],
      ['Rosadas triks mot at poolishen flyter ut','Tilsett 0,1–0,2 % salt i forfermenten. Usaltede forfermenter i romtemperatur får økt proteaseaktivitet og begynner å bli flytende innvendig. Pâte fermentée tåler flere døgn på kjøl nettopp fordi den bærer 2 % salt.']
    ]
  },
  {
    tittel:'Temperatur er hovedvariabelen',
    ikon:'🌡',
    intro:'Notatet ditt sier «styre på temp, vel så mye som på tid». Det er den viktigste linjen i hele dokumentet, og forskningen bekrefter den.',
    punkter:[
      ['Måltemperaturer','Mager lys deig med åpen krumme: 24–25 °C. Over 25 % grovt: 23–24 °C. Ciabatta: 24–26 °C. Poolish under modning: 18–21 °C. Biga: 16–18 °C. Kaldheving: 3–5 °C. Aldri over 28 °C for mager deig — da får du hard, gjæraktig smak, slapp deig og et kollapsende hevevindu.'],
      ['Hvor mye 1 grad betyr','Fermenteringsraten dobles ikke ved en fast temperaturforskjell. Den kostnaden varierer: ved 8 °C trengs bare +3,3 °C for å doble farten, ved 20 °C trengs +8,6 °C, og over 23 °C er det umulig — maks oppnåelig fart fra 24 °C er 1,81× ved 35,5 °C. Praktisk: en 3 graders bom gir 30 % feil i timingen over en 3-timers bulk.'],
      ['Over 30 °C er det ingenting å hente','R(30) = 1,51 og R(35) = 1,81 mot 24 °C. Du får 20 % raskere for stor smaks- og strukturkostnad. Sett tak på 30 °C.'],
      ['Under 10 °C teller små feil enormt','R(4) = 0,028 mot R(6) = 0,063 — to graders forskjell i kjøleskapet er 2,25× i fart. Hjemmekjøleskap varierer mellom 3 og 7 °C. Mål ditt.'],
      ['Hjemmeoppsett rangert','1) Sous vide-bad på 24,0 °C med deigen i lukket boks — ±0,2 °C, best som finnes hjemme. 2) Hevekabinett (Brød & Taylor o.l.), ±0,5 °C. 3) Kjølebag med 1 liter 40-gradig vann i en krukke, bytt hver 2.–3. time. 4) Ovn med lyset på — men mål først, den er ofte 27–32 °C, altså for varm. 5) Vinskap på 12–16 °C er et utmerket verktøy for kjølig bulk over natta.'],
      ['Justering underveis, for fort','Sett boksen i kjøleskapet 20–40 min for å ta 4–6 °C av kjernen, så videre ved 20–21 °C. Eller bak ut tidlig og la kjøleskapet fullføre. Ikke prøv å fikse det med hardere bretting, og ikke tilsett mel eller salt midt i bulken.'],
      ['Justering underveis, for sakte','Sett varmere og gi tid — som notatet ditt sier. Aldri over 30 °C. Én skånsom brett jevner ut temperaturen i en deig med kald kjerne, men gjør ingenting med farten. Ikke slå opp for mye.']
    ]
  },
  {
    tittel:'Gisslens eltetabell — hvorfor 0,2 % og 0,8 % gjær kan gi samme brød',
    ikon:'⚙',
    intro:'Wayne Gisslen skriver i «Professional Baking»: «en fransk brøddeig eltet med kort elting kan trenge 0,2 % gjær, mens samme formel med intensiv elting trenger 0,8 % for å fullføre gjæringen på oppsatt tid.» Fire ganger så mye gjær til samme oppskrift. Setningen virker absurd til du ser hva den egentlig handler om.',
    punkter:[
      ['Tabellen den hører til','Kort elting: 9–10 min på 1. hastighet, 0 på 2., bulk 4–5 timer, 4–5 brett. Forbedret: 3–4 + 5 min, bulk 1–2 timer, 1–2 brett. Intensiv: 3–4 + 8–12 min, bulk 20–30 minutter, 0 brett. Gisslens omregningsfaktorer for gjær: kort → forbedret ×3, kort → intensiv ×4.'],
      ['Poenget er ikke eltingen, det er TIDEN','Bulktiden faller fra 4,5 timer til 1,5 til 0,42. Gjæren må gjøre samme jobb på en tiendedel av tida, så du må ha mer av den. «Intensiv elting krever mer gjær» er en misvisende formulering — kort bulk krever mer gjær, og intensiv elting er grunnen til at bulken kan være kort.'],
      ['Kort → forbedret er eksakt invers','Gjær ×3, tid ÷3. Regner man gjæringsdosen for hele prosessen (bulk pluss én times etterheving ved 27 °C, som er Gisslens egen anbefaling), får man 2,00 mot 1,97. Halvannen prosent fra hverandre. De to metodene gir altså virkelig samme brød — det er ikke en tommelfingerregel, det er en identitet.'],
      ['Men kort → intensiv er IKKE invers','Der er gjær ×4 mens tiden faller ÷10,7. Doseregnestykket forklarer hvorfor: 2,00 mot 1,37. Den intensivt eltede deigen er faktisk <b>mindre gjæret</b>, ikke likt. Gisslen sier heller ikke at brødet blir likt — han sier «for å fullføre gjæringen på oppsatt tid», altså for å få deigen hevet i tide. Smaken er en annen sak.'],
      ['Hvorfor 0,2 % holder så lenge: gjæren formerer seg','Dette er mekanismen folk overser. Over 4,5 timers bulk ved 25 °C rekker gjærpopulasjonen å vokse betydelig, så den 0,2 % du målte opp oppfører seg som langt mer mot slutten. Modellen tallfester det: kort elting får <b>+63 %</b> ekstra dose av gjærens egen formering, forbedret +14 %, intensiv <b>+1 %</b>. På 25 minutter rekker gjæren ikke å formere seg i det hele tatt — der er gjæren du har i, all gjæren du får.'],
      ['Og hvorfor etterhevingen jevner ut resten','Etterhevingen er den samme for alle tre. For den intensivt eltede deigen står den for nesten hele gjæringen (1,00 av 1,37), mens den for kortelting bare er 0,52 av 2,00. Når bulken er nede i 25 minutter, har mer gjær i bulken avtakende effekt på totalen — den rekker uansett ikke å bli brukt før emnene er formet.'],
      ['Hvorfor bulken kan kortes ned i det hele tatt','Bulkgjæring gjør to jobber samtidig: den lager gass og smak, OG den utvikler gluten. Tid og bretting er et fullgodt substitutt for mekanisk arbeid. Intensiv elting gjør glutenjobben i maskinen, og da trenger bulken bare å gjøre gassjobben. Problemet er at gassjobben ikke lar seg forsere — og det er derfor smaken forsvinner.'],
      ['Prisen for intensiv elting','Tre kostnader, alle målt: den pisker inn store mengder luft som oksiderer og bleker karotenoidene, altså den blasse fargen og den tomme smaken Calvel skrev om — og som autolysen ble oppfunnet for å bøte på. Den lager tusenvis av små boblekjerner, som gir fin og jevn krumme, ikke åpen. Og den gir en overelastisk deig som motsetter seg utvidelse i ovnen.'],
      ['Hva dette betyr for deg','Du vil ha åpen krumme og maksimalt ovnsløft. Da hører du hjemme helt nede i «kort elting»-raden: lav intensitet, lite gjær, lang bulk, mange brett. Legg merke til at Gisslens korteltings-tall er <b>0,2 % gjær</b>, og at appen din lander på <b>0,18 %</b> for optimalplanen — helt uavhengig utledet, fra 24 andre formler. To ulike veier til samme sted.'],
      ['Nyanse om «kort»','Gisslens korte elting er 9–10 minutter — men på 1. hastighet på en kommersiell spiral. Det er arbeidet som er poenget, ikke minuttene, og en hjemmespiral på lav hastighet leverer langt mindre arbeid per minutt. Derfor kan 15–20 minutter på en Ooni Halo Pro godt være «kort elting» i Gisslens forstand. Det ærligste målet du har på hvor hardt du faktisk elter, er friksjonsvarmen: kalibrer maskinen i Deigtemp-fanen og les av °C per minutt. Stopp uansett ved 60–75 % glutenutvikling, ikke ved vindusrute.']
    ]
  },
  {
    tittel:'Biga eller poolish? Pluss og minus',
    ikon:'⚖',
    intro:'Begge er forfermenter av gjær, mel og vann. Forskjellen er vannmengden, og den forskjellen forplanter seg til alt annet: hvor fort de modner, hva de gjør med deigen, hvor mye gjær de trenger og hvor tilgivende de er.',
    punkter:[
      ['Kort definisjon','Poolish: 100 % hydrering, altså like deler mel og vann — en tynn røre. Biga: 45–55 % hydrering — en stiv, lurvete klump. Pâte fermentée: samme hydrering som deigen din, og den eneste med salt (2 %).'],
      ['POOLISH + fordeler','Gir EKSTENSIBILITET, som er det gjærdeig mangler mest fordi den ikke surgjøres. Kremet, nøtteaktig, mildt vinøs smak. Enkel å røre sammen og lett å lese: du ser tydelig når kuppelen begynner å synke i midten. Tåler vanlig romtemperatur (20–22 °C), som du treffer uten spesialutstyr.'],
      ['POOLISH − ulemper','Bidrar lite til STYRKE, så den hjelper deg ikke der butikkmel er svakest. Smalere brukbart vindu — den topper og kollapser tydeligere. Uten salt og med mye vann får proteasene fritt spillerom, og den blir flytende innvendig hvis den står for lenge. Den trenger svært lite gjær (0,08–0,1 % tørr av poolishmelet), som blir under 0,2 g i en hjemmebatch og dermed vanskelig å veie.'],
      ['BIGA + fordeler','Gir STYRKE og ekstensibilitet samtidig. Den stive matrisen beskytter glutenet mens det utvikles, og begrenset vannmobilitet bremser proteasene — derfor er den langt mer tilgivende på tid. Dypere, mer vinøs og mer markant hvetesmak enn poolish. Trenger 2,5× mer gjær ved samme tid, som gjør veiingen praktisk mulig hjemme. Den kanoniske italienske ciabatta- og pizzatradisjonen bygger på den.'],
      ['⚠ BIGA − ulemper, korrigert','Den utbredte påstanden er at biga «må ha 16–18 °C». Det tallet er <b>fagkodifisering, ikke et målt optimum</b>. Det finnes ingen publisert temperaturoptimaliseringsstudie for biga i det hele tatt: den eneste fagfellevurderte biga-studien bruker 16 °C som fast betingelse og varierer bare tiden. Mellom 12 og 22 °C skjer det ikke noe dramatisk — alle rater endrer seg jevnt med godt under 2×, og forholdet mellom enzym- og gjæraktivitet forskyves bare rundt 1,2× over hele spennet. 16–18 °C er best beskrevet som en velvalgt konvensjon innenfor et bredt og flatt optimum, historisk festet av italienske kjellertemperaturer. Det som faktisk er evidensforankret som avgjørende, er to andre ting: <b>hydreringen på 45 %</b> (stiv deig bremser bakteriene, favoriserer eddiksyre og gir høy gjæringstoleranse) og at du <b>holder deg under ~26 °C</b>, der forholdet mellom gjær og melkesyrebakterier begynner å forskyve seg. Praktisk: 20–22 °C er fullt brukbart hvis du kutter gjæren og korter tiden. Den reelle ulempen er at bigaen er vanskeligere å lese — du må vurdere om den er tredoblet og trådete innvendig, ikke bare se på en kuppel — og at den må blandes lurvete, noe som føles feil første gang.'],
      ['PÂTE FERMENTÉE + og −','+ Den enkleste av alle: klyp av 15–30 % av dagens deig, la den stå 3–4 t og sett den kaldt. Fordi den bærer 2 % salt tåler den 12–48 timer på kjøl uten å bli sur, og gir «gårsdagens deig»-dybde uten noen endring i timeplanen. − Krever at du bakte i går, gir mindre effekt enn de to andre, og over 72 timer kommer eddiksyrespissen.'],
      ['Hvordan velge, konkret','Er det GLUTENSTYRKE du mangler — mye grovt mel, høy hydrering, ciabatta — velg biga, forutsatt at du kan holde 16–18 °C. Er det EKSTENSIBILITET og enkelhet du vil ha, eller kan du ikke holde 18 °C, velg poolish på 20–22 °C. Vil du ha dybde uten å endre timeplanen, bruk pâte fermentée.'],
      ['Hva forskjellen faktisk er verdt','I 24 gjennomregnede publiserte formler har oppskrifter MED forferment en samlet gjæringsdose på i snitt 1,63 mot 2,30 uten. Forfermenten gjør altså rundt 30 % av gjæringsarbeidet — men det er ikke derfor du bruker den. Du bruker den for smak og deigstyrke; tidsbesparelsen er en bieffekt.'],
      ['Gjærmengde i forfermenten — samstemt på tvers av kilder','Poolish bærer 0,04–0,25 % av sitt eget mel ved 10–16 timer på 20–22 °C (King Arthur 0,1–0,2 % fersk, ChainBaker 0,1–0,125 % tørr, Weekend Bakery 0,04 %, Plötzblogs kanoniske «100 g mel, 100 g vann, 0,1 g fersk gjær, 12 timer ved 20 °C»). Kalde eller stive forfermenter bærer omtrent 10× mer: Giorillis 18-graders biga bruker 0,95 % fersk.'],
      ['Med DITT mel','Caputo Pizzeria blå er konstruert for 55–67 % hydrering og har publisert W 260–280. En biga på 45–50 % vann ligger midt i det vinduet — det er der melet er på hjemmebane. Regal standard har mer protein (13 % mot 12,5 %) og grovere partikler, og gjør mer nytte i hoveddeigen på 74 %. Den naturlige arbeidsdelingen er derfor Caputo i bigaen, Regal i hoveddeigen.']
    ]
  },
  {
    tittel:'⚠ Flytetesten — den virker ikke slik folk sier',
    ikon:'⚠',
    varsel:true,
    intro:'Påstanden er at du legger en liten deigbit i et glass vann, og at deigen er perfekt hevet når biten flyter opp. Den er utbredt, men fysikken og de kontrollerte forsøkene sier noe annet: flytepunktet inntreffer TIDLIG i bulken, og når det først er passert, forblir det passert.',
    punkter:[
      ['Regn på det','Avgasset deig har tetthet rundt 1,20–1,23 g/cm³. Siden massen er konstant, er volumøkningen som trengs for å komme under 1,0 rett og slett (tetthet − 1) × 100. Det gir +23 % ved 65 % hydrering, +22 % ved 75 % og +20 % ved 85 %. Regner man med luften som eltes inn (målt til 5–13 %), faller terskelen til +11–17 %. Til sammenligning er fornuftige sluttmål for bulk 30–75 % stigning. Flytepunktet ligger altså langt før du er ferdig.'],
      ['Hydrering er ikke problemet','Fra 60 til 100 % hydrering flytter terskelen seg bare fra +24 til +18 %. Den vanlige forklaringen «testen feiler fordi deigen er så våt» holder ikke.'],
      ['Det eneste kontrollerte forsøket','King Arthur testet dette direkte. Deig som hadde hevet i 30 minutter av en bulk på 60–90 minutter fløt allerede. Deres egen konklusjon: «Både delvis hevet gjærdeig og voksende — men ikke moden — surdeigsstarter vil flyte i vann.» Forsøket ble gjort på GJÆRDEIG, altså akkurat din situasjon.'],
      ['Den avgjørende innvendingen','Testen måler ikke deigens gassinnhold. Den måler gassen som overlever at du klyper av og triller en bit. Hvor mye det er, avhenger fullstendig av hvor forsiktig du er — det er ustandardisert, varierer fra gang til gang, og forklarer hvorfor folk rapporterer BÅDE at deigen flyter altfor tidlig og at den aldri flyter i det hele tatt.'],
      ['Terskel, ikke måler','Når deigen først flyter, fortsetter den å flyte. Overhevet deig synker ikke igjen — gassandelen stiger monotont gjennom hele bulken. Testen kan derfor bare svare på «har jeg passert en grense», aldri på «er jeg på optimum». Og grensen ligger på feil sted.'],
      ['To dokumenterte havarier','På The Fresh Loaf finnes to uavhengige bakere som fulgte hver sin publiserte forfatters råd om flytetest på bulkdeig. Begge ventet på en flyting som aldri kom — den ene 5 timer, den andre 8 timer mot en oppskrift på 5 — og begge overhevet deigen mens de ventet. Falske negativer i denne testen fører aktivt til overheving, fordi instruksjonen er «vent til den flyter».'],
      ['Verre med gjær enn med surdeig','Surdeig surgjør og bryter ned gluten til slutt, så gass kan lekke ut. Gjærdeig gjør ikke det, og forblir derfor «flytende» enda mer vedvarende. I tillegg er bulken din kortere, så avstanden mellom «passerer terskelen» og «overhevet» er like mange prosent, men langt færre minutter.'],
      ['Det testen ÆRLIG kan brukes til','«Synker den, er du helt sikkert ikke ferdig.» Det er en gyldig minsteprøve, men ikke et stoppsignal.'],
      ['Det enklere alternativet','Flytetesten koster deg noe hver halvtime: klype av, slippe i vann, se, vurdere, vaske glasset, kaste deigen. Prosentmålingen koster deg én ting én gang: hev i en RETTVEGGET boks og sett en strikk rundt der deigen starter. Etterpå ser du bare på den i forbifarten. Ingen prøve, ingen vask, intet svinn, ingen håndtering som skader deigen. Det er faktisk mindre arbeid, ikke mer.'],
      ['Én nyanse i din favør','Fordi du baker ut og kaldhever, blir en for tidlig avslutning delvis reddet av at gjæringen fortsetter i kjøleskapet. Å bomme tidlig er dessuten den riktige veien å bomme når ovnsløft er prioritet. Men det er en redning, ikke et argument for å bruke testen — og det hjelper ikke mot den falske negativen som faktisk felte begge bakerne over.'],
      ['En attribusjon som ikke stemmer','«Debra Wink motbeviste flytetesten» sirkulerer bredt, men agenten fant ingen tekst av henne som kritiserer den. Det som er hennes, er mikrobiologien bak den mest dramatiske falske positiven: i en 2–4 dager gammel starter kommer gassen fra Leuconostoc og enterobakterier, ikke fra gjær. Den kan altså flyte uten å inneholde hevekraft.']
    ]
  },
  {
    tittel:'Tørrgjær — omregning, og én ting som faktisk koster deg løft',
    ikon:'◇',
    intro:'Du bruker bare tørrgjær. Omregningen er enkel, men det finnes ett målt forbehold som er direkte relevant når ovnsløft er førsteprioritet.',
    punkter:[
      ['Omregningen','Fersk gjær delt på 3 gir instant tørrgjær. Det er enstemmig i alle kilder — Fresh Loaf, PizzaBlab, ChainBaker, traditionaloven — og regnearket ditt har det allerede riktig. Aktiv tørrgjær er derimot fersk delt på 2,5, ikke 3: tørkeprosessen dreper det ytterste cellelaget, så den trenger ca. 20 % mer. Norsk «tørrgjær» i pose (Idun o.l.) er instant-typen og skal rett i melet.'],
      ['Hvorfor tørrgjær ikke må rehydreres','Instant tørrgjær har ca. 3 % vann mot ferskgjærens 70 %, og partiklene er små nok til å løse seg opp i deigen. Aktiv tørrgjær MÅ derimot røres ut i ~40-gradig vann først, ellers presterer den dårligere enn omregningen tilsier.'],
      ['⚠ Det målte forbeholdet','Verheyen et al. målte 21 % lavere spesifikt brødvolum med instant tørrgjær enn med fersk gjær ved nominelt likeverdig dose — og fant at gassRETENSJONEN oppførte seg forskjellig, ikke bare gassproduksjonen. Når du jakter maksimalt ovnsløft, er det verdt å vite at fersk gjær har et lite forsprang.'],
      ['Hva du gjør med det','Ikke øk gjærmengden — det gir deg gjærsmak og et smalere hevevindu, altså akkurat feil vei. Kompenser heller der det er gratis: litt høyere hydrering, full forvarming av stålet, og disiplin på å sette inn ved 75–85 % heving. Effekten av å treffe hevegraden er mange ganger større enn 21 %.'],
      ['Ferskhet','Tørrgjær taper aktivitet over tid, særlig etter åpning. Oppbevar posen lufttett i fryseren — den tåler det fint — og test en gammel pose i lunkent sukkervann før du bruker den i en 30-timers plan.']
    ]
  },
  {
    tittel:'Kjøleskapet ditt på 3–4 °C — hva det betyr',
    ikon:'❄',
    intro:'Du oppgir 3–4 °C. Det er kaldere enn de fleste hjemmekjøleskap, og det er en fordel — men det flytter tall.',
    punkter:[
      ['Raten halveres mot 5 °C','Relativ gjæringsrate mot 24 °C: R(3) = 0,016, R(3,5) = 0,022, R(4) = 0,028, R(5) = 0,044. Ditt kjøleskap gjærer altså rundt halvparten så fort som et på 5 °C. Appen bruker nå 3,5 °C som standard i alle planene.'],
      ['Men effekten er mindre enn du tror','Fordi mesteparten av kaldhevingens gjæring skjer mens deigen fortsatt kjøles ned — 75 % i de første 6 timene for en utbakt emne — betyr sluttemperaturen mindre enn nedkjølingskurven. Å gå fra 5 til 3,5 °C kutter kaldhevingens bidrag med rundt en femtedel, ikke med halvparten.'],
      ['Fordelen: bredere vindu','Kaldere kjøleskap gir deg et mer tilgivende hevevindu og gjør at du trygt kan strekke kaldhevingen lenger for mer smak. Ved 3,5 °C tåler en mager gjærdeig på sterkt mel opp mot 72 timer før proteasene begynner å telle.'],
      ['Ulempen: må kompenseres','Samme kaldhevingstid gir mindre gjæring, så enten forlenger du kaldhevingen, forlenger bulken, eller øker gjæren litt. Appen løser dette automatisk — endre kjøleskapstemperaturen i heveplanen, så regner den om.'],
      ['Mål ditt eget','Et kjøleskap varierer mellom hyller og med hvor fullt det er. Legg et termometer der du faktisk setter hevekurvene og les av om morgenen. Forskjellen mellom 3 og 5 °C er nesten tredobbelt i gjæringsrate — det er den enkeltmålingen som gir mest presisjon i hele kaldhevingen.']
    ]
  },
  {
    tittel:'Kjøleskapets skjulte matematikk',
    ikon:'❄',
    intro:'Dette er den mest underkommuniserte faktoren i all brødbaking, og den forklarer hvorfor deiger overhever over natta selv om «kjøleskapet stopper gjæringen».',
    punkter:[
      ['Deigen kjøles ikke ned med én gang','En 1,5 kg deig som går inn på 24 °C i et hjemmekjøleskap: 1 t → 20 °C, 2 t 45 min → 15 °C, 4 t → 10 °C, 7 t → 5 °C. Tidskonstanten er ca. 3,0 × (masse i kg)^⅓ timer.'],
      ['Konsekvensen, i tall','Over en 24-timers kaldheving av 1,5 kg deig akkumuleres 46 % av all gjæring i de FØRSTE 2 TIMENE og 75 % i de første 6. Hadde deigen kjølt ned momentant, ville 24 t ved 4 °C bidratt med 0,67 ekvivalenttimer. Med reell nedkjøling blir det 2,83 — altså 4,2× mer.'],
      ['Praktisk regel','En kaldheving av 1–2 kg deig er verdt ca. 2,5 ± 0,5 timer ved 24 °C for de første 12 timene, pluss ca. 0,03 timer per time deretter. Tid utover ~12 t kjøper smak og enzymarbeid, nesten ingen gass.'],
      ['Hvordan utnytte det','Vil du ha maks kaldheving uten overheving: del opp i enkeltemner (halverer tidskonstanten), sett dem i den kaldeste delen av kjøleskapet, og ikke stable dem. Vil du ha MER gjæring ut av kaldhevingen, gjør det motsatte — hel deig i lokkboks.'],
      ['Fordelingen bulk vs. kjøl','Sikt mot 75–85 % av all gjæring i bulken ved kontrollert temperatur, og la kjøleskapet levere de siste 15–25 %. To feil dette unngår: å kaldheve en knapt bulket deig (kjøleskapet er for tregt til å ta den igjen → tett, ugjæret brød), og å kaldheve en allerede ferdighevet deig (kollaps til morgenen).']
    ]
  },
  {
    tittel:'Elting, gluten og åpen krumme',
    ikon:'◎',
    intro:'Antall gassbobler i deigen avgjøres nesten helt i de første 10 minuttene, av hvor mye luft du mekanisk pisker inn. Gjæren lager ikke nye bobler — den blåser opp de som finnes.',
    punkter:[
      ['Den store feilen','IKKE elt til full vindusrute. Sikt mot 60–75 % glutenutvikling ved endt elting: deigen skal være sammenhengende, slippe bollen og strekke seg litt før den revner — men langt fra gjennomskinnelig. La bretting og tid gjøre resten. Intensiv elting lager tusenvis av små kjerner (fin, jevn krumme) og en overelastisk deig som motsetter seg utvidelse.'],
      ['Din egen indikator er riktig','«Blank deig, og deigen sklir av eltekroken når den heves» er en god ferdigindikator. Legg til: stopp litt før du tror du er der.'],
      ['Brettskjema','For en 3-timers bulk ved 24 °C: laminering eller ett sett slap-and-fold ved 0:30, strekk-og-brett 0:30 og 1:00, coil fold 1:30 — så IKKE rør deigen fra 1:30 til 3:00. Den urørte siste halvdelen er når boblene vokser og smelter sammen. Bretter du på 2:30, har du ødelagt krummen du bygde.'],
      ['Bassinage','Hold igjen 10–15 % av vannet og spe det inn i 2–3 omganger sammen med saltet, etter at deigen er dannet. Dette er måten du kommer til 80 %+ på uten å få en sølepytt. Notatet ditt gjør allerede dette («start på 70 % og jobb oppover») — hold på det.'],
      ['Utbaking uten å slippe ut gassen','Håndter BARE de ytterste 1 cm. Bygg spenning i skinnet, la innmaten være helt urørt. Bruk skrape til å dra og brette ved forforming, ikke press. Mel benken, ikke toppen av deigen — toppen blir skorpa.'],
      ['Stor uregelmessig krumme vs. tett jevn','Åpen: minimal mekanisk elting, 78–85 % vann, moderat glutenutvikling ferdigstilt med bretting, fullført bulk, siste 45 min urørt, skånsom skinn-bare-forming, ingen fett. Tett: intensiv elting, ≤70 % vann, full vindusrute i maskinen, kort bulk, bretting helt fram til forming, fast forming, fett i deigen, over 30 % grovt.'],
      ['Skille ekte åpen krumme fra feil','Ekte åpen krumme er uregelmessig, men strukturelt sunn: blanke celleveggger, hull i varierte størrelser fordelt over hele brødet, høyt brød. Overhevet gir vannrette tunneler nær toppen, flatt brød, tett gummiaktig bånd i bunnen og matte cellevegger. Underhevet gir noen få store hulrom rett under skorpa og tett, stram kropp ellers.']
    ]
  },
  {
    tittel:'Hevegrad og hevevinduet',
    ikon:'📈',
    intro:'Hvor mye deigen skal ha steget før du baker ut, er en funksjon av temperatur og hva som skjer etterpå — ikke et fast tall.',
    punkter:[
      ['Målt heveprosent ved endt bulk','27 °C → 30 %. 24 °C → 50 %. 21 °C → 75 %. 18 °C → 100 %. (Målt på 75 % hydrering, 90/10 hvete/fullkorn, 2 % salt, med etterfølgende kaldheving.)'],
      ['Hvorfor tallet synker med temperaturen','Ikke fordi varm deig trenger mindre gjæring, men fordi den fortsetter å gjære mens du former og mens den kjøles ned. Regner man med etterslepet, er den TOTALE gjæringsdosen konstant på tvers av hele tabellen. Det er derfor appen regner i dose og ikke i timer.'],
      ['Justering for din deig','Våtere deig: lavere mål (−1,2 prosentpoeng per prosentpoeng over 75 % hydrering). Mer grovt: lavere mål. Svakere mel: kutt tidligere. 100 % fullkorn kan være ferdig på 20–30 % stigning mens en lys 70 %-deig dobler seg — begge kan være riktige samtidig.'],
      ['Målekrukke (aliquot jar)','Ta 35–45 g deig rett etter elting over i et rettvegget glass, merk startnivået med strikk, og la det stå VED SIDEN AV hoveddeigen. Det er den enkeltvanen med høyest verdi i hele denne appen. Forbehold: en liten prøve i glass varmes og kjøles raskere enn en 2 kg boks, og den brettes aldri — kalibrer mot dine egne bak.'],
      ['Hvor toppen av ovnsløftet ligger','Maks ovnsløft kommer FØR maks deigvolum — rundt 70–85 % av veien til maksimal utvidelse. Deigen som gir best brød ser litt underhevet ut i boksen. Det er derfor alle erfarne bakere sikter lavere enn nybegynnere venter. Er du i tvil: bak for tidlig.'],
      ['Trykktesten','Melet finger, trykk 1–1,5 cm inn i siden, slipp. Underhevet: spretter helt tilbake på under 2 sekunder. Ferdig: fylles langsomt igjen over 5–10 sekunder og etterlater en synlig grunn grop. Overhevet: spretter ikke tilbake, gropen blir stående, deigen sukker.'],
      ['Hvor bredt er vinduet egentlig','1,5 % tørrgjær ved 26 °C: 10–20 minutter. 0,4 % ved 24 °C: 40–60 min. 0,15 % ved 21 °C: 1,5–3 timer. Ved 4 °C: 4–8 timer. Løsningen på «altfor smalt vindu» er å kutte gjæren, ikke å bytte hevemiddel.']
    ]
  },
  {
    tittel:'Salt — hva som faktisk er målt',
    ikon:'◈',
    intro:'Notatet ditt sier salt hemmer glutenutvikling, bremser gjæringen og gjør deigen fastere. To av tre stemmer; den første er mer nyansert enn folk tror.',
    punkter:[
      ['Bremser gjæringen — ja, men mindre enn ventet','Gassproduksjonen faller ca. 10 % ved 1,5 % salt og 10–20 % ved 2 %. MEN gassRETENSJONEN stiger like bratt (retensjonskoeffisient +5 til +10 prosentpoeng ved 2 %). Netto hevehøyde er langt mindre saltfølsom enn rå CO₂-produksjon. Ikke skalér hevetiden etter gassproduksjonstallet.'],
      ['Gjør deigen fastere — ja, klart målt','Alveograf på 176 prøver: styrken W stiger fra 147 til 201 (+37 %) ved 1,5 % salt, høyere i 171 av 176 prøver. Svakt mel vinner langt mer på salt enn sterkt mel gjør (svakt +51 %, sterkt +9 %).'],
      ['«Hemmer glutenutvikling» — riktig om tid, feil om resultat','Salt forlenger utviklingstiden med 40–45 % (farinograf: 5,6 → 8,0 min). Men det ØKER samtidig stabiliteten med 49–80 %. Salt er en styrker langt mer enn en strammer. Ekstensibiliteten topper faktisk rundt 0,9 % salt og faller først etter det.'],
      ['Salt til slutt — ærlig dom','Det eneste målte utbyttet av å holde igjen saltet er kortere eltetid. Det finnes INGEN publisert kontrollert sammenligning av ferdig brød med og uten utsatt salt. King Arthurs profesjonelle referanse anbefaler faktisk salt fra start, med Calvels eget anti-oksidasjonsargument: saltfri elting oksiderer raskere og bleker karotenoidene. For en langtidshevet hjemmedeig, der eltetid ikke er flaskehalsen, er den målte gevinsten nær null. Behold vanen om du vil — den skader ikke — men ikke tro den er avgjørende.'],
      ['Hvorfor 2 % ikke dreper gjæren','Gjæren ser ikke «2 % salt», den ser saltkonsentrasjonen i vannfasen. Ved 70 % hydrering blir 2 % salt til 0,49 M — omtrent en tredel til halvparten av der gjærveksten virkelig stanser. Ved 80 % hydrering er det 12 % lavere. Appen skalerer derfor salteffekten etter hydrering, ikke bare etter bakerprosent.'],
      ['Nivå','1,8–2,2 % for et mager brød som jakter smak. Under 1,8 % smaker brødet flatt og gjærer uforutsigbart. Ditt 1,8 % er godt plassert. Lite salt gir også blekere skorpe, fordi gjæren rekker å spise opp sukkeret.']
    ]
  },
  {
    tittel:'Smak uten surhet — rangert etter effekt',
    ikon:'✦',
    intro:'Rangeringen her er etter faktisk smakseffekt per innsats, ikke etter hvor mye folk snakker om dem.',
    punkter:[
      ['1. Forferment','Størst enkeltverktøy. 20–40 % av melet. Poolish gir kremet, nøtteaktig, søtlig. Biga gir dypere, mer vinøst og mer markant hvete. Poolish bidrar mest til ekstensibilitet, biga mest til styrke.'],
      ['2. Lav gjærmengde + lang total tid','0,1–0,4 % tørrgjær totalt. Sikt mot ≥16 timer total prosess, helst 24–36 inkludert kaldheving. Tid er råstoffet.'],
      ['3. Stek skorpa mørk','Mesteparten av brødets aroma sitter i skorpa. Understeking er den vanligste smaksfeilen. Stek til 8–12 % vekttap og 96–99 °C kjerne — legg gjerne 5–8 minutter på etter at det «ser ferdig ut».'],
      ['4. Lang kaldheving','12–24 t ved 3–5 °C. Målt topp for aromastoffer ligger på 24 timer. 36–48 t fordyper videre, men avtakende. Over 72 t: sprit-aktig, slapp deig, dårlig løft.'],
      ['5. Melet','10–20 % grovt gir tydelig mer smak med minimal krummekostnad. 20–30 % gir kraftig smak, tettere krumme, legg til 3–5 % vann. Steinmalt og ferskmalt smaker dramatisk mer.'],
      ['6. Skålding (Brühstück/Kochstück)','Det beste ikke-sure «rundhets»-trikset som finnes. Kochstück: 5–10 % av melet kokes med 5× sin vekt vann til ~65 °C til en grøt. Brühstück: 5–15 % av melet eller knekt korn skåldes med 1–2× kokende vann, hviler 4–12 t. Gir ekte sødme, fuktighet og 2 døgn lengre holdbarhet. Trekk både mel og vann fra hovedoppskriften.'],
      ['7. Ristede frø og korn','Pyraziner — ristet, nøtteaktig, kaffeaktig. Umulig å forveksle med surhet. Målt ga risting 28–51× mer pyrazin, altså omtrent dobbelt så mye smak per gram: 6 % ristede frø smaker som 12 % uristede. Rist ved 125–150 °C til lys gyllen; studiens optimum var 125 °C i 45 min for lavest bismak, ikke hardt og raskt. ⚠ Om bløtlegging: den er ikke en universell regel. De dokumenterte gevinstene er målt på kli, havre og chia, som binder 130–300 g vann per 100 g. Solsikke binder 80, sesam 58 og gresskar bare 38 — under ca. 8 % av melet stjeler de så lite vann at du like gjerne kan justere hydreringen i stedet. Og rister du først, vasker en lang bløt ut nettopp pyrazinene du lagde, siden de er vannløselige og flyktige. Rugknekk og havregryn MÅ derimot skåldes.'],
      ['8. Malt','Ikke-diastatisk (sirup/pulver): 1–3 %, ren maltsødme og skorpefarge, ingen deigeffekt. ⚠ Diastatisk malt er derimot korrigert ned siden denne seksjonen ble skrevet: <b>0 % er riktig standard på norsk hvetemel</b>, som allerede ligger på 280–320 s falltall — midt i det optimale vinduet. Målt trekker 0,5 % falltallet til 194 s, langt under, og farinografstabiliteten fra 7,5 til 2,6 min. Lang kaldheving gir dessuten amylasen 3–8 timers ekstra arbeid. Bruk 0,1–0,15 % bare hvis du får blek skorpe og dårlig volum til tross for god heving, og 0 % hvis det er rug i deigen.'],
      ['9. Pâte fermentée (gammeldeig)','Best forhold mellom innsats og dybde. Klyp av 15–30 % av dagens deig, la den stå 3–4 t ved 20–22 °C og sett den kaldt. Bruk den mellom 12 og 48 timer gammel. Den er den ENESTE forfermenten med salt (2 %), som er grunnen til at den tåler flere døgn kaldt uten å bli sur. Etter 72 t kommer eddiksyrespissen.'],
      ['10. Honning','Rundt 5 % er greit, i deigen — ikke i poolish eller biga, akkurat som notatet ditt sier. Honning er 17,1 % vann og 82 % sukker, hvorav nesten alt allerede er invertert (kun 0,9 % sukrose). Derfor bruner den hardere enn sukker: fruktose har lavest karamelliseringsterskel av alle sukkerarter. Appen teller honningens vann i hydreringen.'],
      ['Målt om sukkermengde','Gassproduksjonen TOPPER ved ca. 7 % sukker (+89 % mot ingen sukker) og faller under nullkontrollen først et sted mellom 14 og 21 %. Ved 5 % honning er du altså på den akselererende siden av kurven — sukkeret bremser ikke, det gir fart.']
    ]
  },
  {
    tittel:'Deigtemperatur og friksjon',
    ikon:'⚙',
    intro:'Notatet ditt sier «1 grad per minutt kjøring er riktig tempo». Det stemmer for en kommersiell spiral, men er 2–2,5× for høyt for de fleste hjemmemaskiner.',
    punkter:[
      ['Målte friksjonsverdier','Håndelting 0,15 °C/min. Kjøkkenmaskin med krok (planet) 0,6 °C/min. Hjemmespiral 0,4 °C/min. Kommersiell spiral 1,0 °C/min. Din tommelfingerregel tilsvarer altså en profesjonell spiral — kalibrer den mot din egen maskin i appen.'],
      ['Den klassiske formelen overkorrigerer','Vanntemp = 3 × ønsket − mel − rom − friksjonsfaktor fungerer kun når mel- og romtemperatur er like. Har du mel rett fra kjøleskapet, bommer den med rundt 4 °C. Appen bruker en ekte varmebalanse med reelle varmekapasiteter (mel 1,81 kJ/kg·K, vann 4,18) og gir riktig svar uansett.'],
      ['Hva kaldt vann faktisk kjøper deg','Ved 75 % hydrering utgjør vannet 63 % av deigens varmekapasitet. 1 °C på vannet gir 0,63 °C på deigen. Isvann ned til 0 °C fra 20-gradig springvann gir −12,7 °C på deigen — langt mer enn du noen gang trenger. Kjøleskapskaldt mel (21 → 4 °C) gir −6,2 °C.'],
      ['Ismengde','Du trenger aldri over ca. 20 % is i vannet, og 0 °C er en hard bunn. Formelen er eksakt, ikke en tilnærming: isandel = (springtemp − ønsket) / (79,9 + springtemp).'],
      ['Dine egne måltall','24–25 °C ut av maskinen for vanlig deig. 21–22 °C for langtidsheving, slik at glutenbindingen fortsetter under hevingen — dette er et godt og velbegrunnet valg. Startpunkt 14–15 °C ved kaldt vann. Alt dette bekreftes av litteraturen.'],
      ['Meltemperatur','Notatet ditt har rett: melets temperatur er ikke i seg selv poenget, det er deigens sluttemperatur som teller. Men melet er 37 % av varmekapasiteten, så kaldt mel er reserven når kjøkkenet er varmt og du allerede kjører isvann.']
    ]
  },
  {
    tittel:'Damp og ovnsløft',
    ikon:'🔥',
    intro:'Ovnsløft er stort sett en dampmaskin som går inne i deigen, ikke en CO₂-ballong. Det snur nesten alt annet på hodet.',
    punkter:[
      ['Hva som faktisk driver løftet','Vann som blir damp inne i deigen: 45–55 %. CO₂ som går ut av løsning: 20–30 %. Termisk utvidelse av gassen som allerede er der: 15–25 %. Etanol: ~5 %. Fortsatt gjæraktivitet: 2–5 %. «Trapped CO₂ expands» ble motbevist allerede i 1985.'],
      ['Hvor mye damp trengs','Ca. 26 ml vann, fullt fordampet, fyller hele en 60-liters ovn. Mengde er ikke flaskehalsen — HASTIGHET og lekkasje er det. Din «lille kopp vann» er rikelig, arguably i overkant.'],
      ['⚠ Den svake lenken i din metode','Å fordampe 120 g kaldt vann krever 321 kJ. En tynn stekeplate rommer bare ~50 kJ brukbar varme. Vannet flasher IKKE — det putrer av gårde over 10–20 minutter. Det gir deg svak damp i de eneste 2 minuttene som betyr noe, og en lang damphale gjennom minutt 5–20, som er akkurat regimet som undertrykker bruning. Verste av begge verdener.'],
      ['Fiksen','Bruk KOKENDE vann fra kjelen (sparer 418 J/g og gir damp umiddelbart), hell i en forvarmet støpejernspanne eller på lavastein/bolter, i det du setter inn brødet. Med et kar som faktisk flasher kan du gå ned til 50–75 ml. En 2,5 kg støpejernspanne kan flashe ~50 g kokende vann momentant; en tynn plate ~22 g.'],
      ['⚠ Dørspalten etter 5 minutter','Ikke støttet. Mekanismen du sikter mot er ekte — damp etter kondensasjonsfasen fjerner faktisk 25–31 % av varmestrømmen fordi vanndamp absorberer infrarødt. MEN ved 5 minutter er ovnsløftet ikke ferdig (vindu 15–20 min for et 900 g brød), og 20 sekunder åpen dør koster 2–5 minutter steketid. Du setter skorpa mens brødet fortsatt vil utvide seg — snittet slutter å åpne seg og øret slutter å danne seg. Trekk dampen ut ved 15–20 min i stedet.'],
      ['Kondensasjonsvinduet','Ovnsfuktigheten stiger på under 1 minutt; overflatens temperatur stiger bratt i ~2 minutter, som er kondensasjonssonen; kondensasjon stopper når overflaten når 80–90 °C. Absolutt all latentvarme-gevinsten leveres i de første ~2 minuttene. Damp som kommer senere kan ikke kondensere.'],
      ['Overdamping er målt, ikke folklore','Økt damp gir målt: mindre skorpefarge, lavere bruddstyrke (lærete i stedet for sprø), mer glans. Glans og bruning går i motsatt retning med dampdose — du kan ikke maksimere begge.'],
      ['Rangert liste over metoder','1) Lukket støpejernsgryte/kombigryte — løser damp og bunnvarme i én gjenstand, trenger null tilsatt vann (en 5-liters gryte trenger bare ~2 g damp, og brødet inneholder 380 g vann). 2) Forvarmet støpejernspanne + ½–1 kopp kokende vann, gjerne med en opp-ned bolle over brødet. 3) Lavastein/bolter i støpejern. 4) Kokende vann i tynn plate — virker, men svakt. 5) Sprayflaske alene.']
    ]
  },
  {
    tittel:'Stein, stål og forvarming',
    ikon:'▬',
    intro:'Nesten alle forvarmer for kort, og de fleste måler feil.',
    punkter:[
      ['Målt forvarmingsdata','Ovn satt på 260 °C, steinens faktiske overflatetemperatur: 15 min → 144 °C (116 grader for lite!). 30 min → 213 °C. 45 min → 233 °C. 60 min → 265 °C. Anbefaling: 6 mm stål 45–60 min, 10 mm stål 75–90 min, 15 mm stein 60 min minimum og 90 for full soaking.'],
      ['Ovnens pipelyd betyr ingenting','Termostatføleren er en liten sensor i luftstrømmen. Den er fornøyd lenge før vegger, glass, rister og stein er det.'],
      ['Stål mot stein — riktig tall','Selgerne sier «18–20× mer ledende». Det er ledningsevnen, og den overdriver praktisk nytte med ca. 3×. Tallet som styrer kontaktvarme er effusivitet, og der er forholdet 6,3×. En steinplate på 290 °C leverer samme kontakttemperatur som et stål på 217 °C.'],
      ['Konsekvens for brød på stål','Stål kan svi bunnen over en 45-minutters bake. Enten kjør ovnen 15–25 °C lavere enn samme oppskrift på stein, eller behold bakepapir under de første 20 min, eller flytt brødet opp på rist siste tredel.'],
      ['⚠ Din 350 °C-måling med laser','Nesten helt sikkert refleksjon. Et blankt stålbrett er nesten et speil i infrarødt — det gjennomsnitter ikke ovnen, det avbilder speilvendt det som står foran det. Verre: i en ovn som har nådd likevekt leser et IR-termometer CAVITETENS temperatur uansett hva objektet faktisk holder. Med ε 0,1 leser den 252 °C når stålet i virkeligheten er 200 °C.'],
      ['Diagnose og fiks','Ta to målinger — én mens elementene gløder og én i en av-syklus. Kollapser tallet, var det refleksjon. Riktig verktøy er et K-type termoelement eller en innstikksføler lagt flatt på platen; immun mot emissivitet og refleksjon, og billigere enn de fleste IR-pistoler. Alternativt: brenn/sote stålet svart og bruk en pistol med justerbar emissivitet satt til 0,85–0,90. På STEIN er en vanlig pistol faktisk nøyaktig (ε ≈ 0,93). Masketeip er ubrukelig over 150 °C.'],
      ['Ristposisjon','Brød lavt: bunnvarmen driver løftet, OG du trenger takhøyde — et brød spretter 8–12 cm, og på midterste rille setter toppskorpa seg tidlig og bremser mekanisk. Ciabatta midt: bunnflate mot volum er ~3× et rundbrøds, kort steketid, og ingen behov for bunnkick. Pizza høyt: 4–6 minutters bake rekker ikke å brune toppen med konveksjon alene.']
    ]
  },
  {
    tittel:'Snitting og øret (grigne)',
    ikon:'⁄',
    intro:'Øret er ikke et kutt, det er en underskåret flik. Bladet går nesten parallelt med overflaten og etterlater en tynn kile av skinn som henger over på den ene siden.',
    punkter:[
      ['Vinkel og dybde','30–45° fra vannrett (altså nesten flatt langs overflaten), 6–13 mm dypt, med et BUET blad. Buen er det som skaper fliken. Rett blad på 90° gir rene, dype kutt og «bloom», men ikke ører. Grunnere vinkel = mer markert øre.'],
      ['Notatet ditt','Du skriver «rett kutt, med litt skrå». Skru skråstillingen kraftigere — nesten som om du barberer det øverste laget. Og du har helt rett i at riktig mengde vann og riktig poff i deigen er det viktigste.'],
      ['Alt dette må stemme samtidig','Stramt skinn fra formingen. Litt under- til korrekt hevet (overhevet = ingen kraft til å løfte fliken). Damp de første ~20 min slik at fliken krøller seg i stedet for å knekke. Hard forvarming og sterk bunnvarme. Kald deig rett fra kjøleskapet — den kalde kjernen holder seg ekstensibel lenger mens bunnen varmes. Skarpt blad.'],
      ['Ett dypt kutt slår mange','For ett dramatisk øre: ett langt, bestemt kutt litt utenfor midten. Flere dype kutt deler utvidelsen mellom seg og gir mindre ører hver.'],
      ['Når det ikke blir øre','I rekkefølge etter hvor vanlig: 1) overhevet deig — den klart vanligste årsaken. 2) For loddrett snitt. 3) For grunt. 4) For dypt (over ~15 mm) — brødet faller sammen langs kuttet. 5) Svak forming. 6) For lite damp. 7) For lav ovns- eller platetemperatur. 8) Sløvt blad. 9) For mye mel i kuttlinja — bladet skøyter og fliken fester seg ikke.']
    ]
  },
  {
    tittel:'Skorpe, blemmer og avkjøling',
    ikon:'◐',
    intro:'',
    punkter:[
      ['Tynn sprø vs. tykk seig','Det styrende er TØRRE steketimer, ikke damp i seg selv. Konkret bytte for tynnere skorpe: 232 °C i 50 min → 246 °C i 30 min. Damp og tørrtid er to uavhengige knapper, og det er tørrtiden som bygger tykkelse. Høyere hydrering (70–80 %) gir tynnere skorpe. Underhevet deig gir tykk, hard skorpe.'],
      ['Blemmer','Kommer av CO₂ fanget under et nedkjølt, halvsatt skinn. Krever: 3–5 °C, 12–36 timer (20–24 t+ der det virkelig blir bra), lav gjærmengde, ≥75 % hydrering. Hev UTILDEKKET på kjøl slik at det danner seg skinn, men FUKT overflaten ved innsetting og børst av alt rismel — melag blokkerer forgelatineringen. Enzymene lager samtidig sukker på overflaten mens gjæren er kald, og det er derfor blemmene blir blanke og oransje, ikke bare humpete.'],
      ['Håndkle, plast eller ingenting over hevekurven?','Det avhenger av hvor kurven står, og håndkle er nesten alltid feil svar. <b>I ROMTEMPERATUR: dekk til, alltid</b> — lokk eller plast. Et skinn her koster deg ekstensibilitet, og det kan revne når deigen utvider seg. <b>PÅ KJØL: utildekket</b> er standardvalget hvis du vil ha blemmer, rent snitt og et markert øre. Kjøleskapet er et tørkeskap, og nettopp den tørre, faste overflaten er det blemmene og fliken trenger. <b>Håndkle er det dårligste alternativet i begge tilfeller:</b> stoff stopper ikke fuktighetstapet, det suger det til seg — samtidig som det tørker fast i deigoverflaten og river den opp når du fjerner det.'],
      ['Når du likevel bør dekke til på kjøl','Går kaldhevingen over 18–20 timer, eller er kjøleskapet ditt uvanlig tørt, blir skinnet lærete og begynner å begrense løftet i stedet for å hjelpe det. Da: dusjhette eller en plastpose løst over kurven — den holder på fuktigheten uten å ligge mot deigen. Det er også riktig valg hvis du merker at brødene får en grå, seig hinne.'],
      ['Og rett før ovnen','Notatet ditt sier å ta av håndkleet 10 minutter før for å tørke skorpa. Prinsippet er riktig — en tørr overflate snitter rent — men du trenger ikke det steget hvis du har hevet utildekket, for da er overflaten alt tørr. Det som derimot betyr noe ved innsetting: <b>børst av alt overflødig mel</b> (melag blokkerer forgelatineringen som gir glans og blemmer) og <b>fukt overflaten lett</b>. Tørr under hevingen, fuktet i det den går inn — de to henger sammen, de motsier ikke hverandre.'],
      ['⚠ Motsetning å ta stilling til','Kaldheving tørker overflaten og gir TYKKERE skorpe. Alle blemmeruter krever 12–36 t kaldheving. Du kan ikke maksimere blemmer og minimere skorpetykkelse samtidig — velg.'],
      ['Hvorfor overhevet deig blir blek','Sukkeret er spist opp. Gjæringen bruker maltose og glukose, og går bulken for langt, tømmes puljen raskere enn amylasen fyller på. Resultat: blek, matt skorpe som kan få svidde flekker, men aldri jevn dyp brunfarge. Merk at blek skorpe betyr BÅDE under- og overhevet — skill dem på volum og trykktest, ikke på farge.'],
      ['Amylasevinduet — undervurdert mekanisme','Gjæren dør ved 46–58 °C, men α-amylasen er aktiv til ~75 °C. Sukker frigjort i det 20–30-graders båndet blir aldri spist opp og går rett til skorpefarge. Derfor påvirker steketemperaturen fargen mer enn folk venter.'],
      ['Avkjøling','Skjær ved ~35–38 °C kjernetemperatur. Stivelsen setter seg under NEDKJØLINGEN, ikke under stekingen — det er derfor varmt brød blir klissete. Baguette ~30 min. 700 g brød ~3 t. 900 g rundbrød 3–4 t. Rug 6 t+, tradisjonelt 12–24. Rist, aldri tildekket, aldri stablet, ~7 cm mellom brødene.'],
      ['Oppfrisking','Fukt skorpa lett, 175–180 °C i 5–10 min. Virker, men er ekte midlertidig — den mykner igjen innen et par timer, og raskere enn første gang. ALDRI kjøleskap: 0–7 °C er den raskeste sonen for stivelsesretrogradering.']
    ]
  },
  {
    tittel:'Ciabatta i detalj',
    ikon:'▭',
    intro:'Ciabatta er den reneste formen for hele tankegangen: maksimal smak fra forfermenten, maksimal åpenhet fra å gjøre nesten ingenting med deigen.',
    punkter:[
      ['Biga etter Giorilli','100 % mel (W 300–350), 45 % vann, 1 % fersk gjær. Bland KUN til den er lurvete — rå melklumper er riktig og med vilje. 18 timer ved 18 °C. Ferdig når den er ca. tredoblet, trådete og nettaktig innvendig, og lukter søtt og vinøst uten skarp syre. Temperaturkontroll er viktigere her enn noe annet sted i prosessen: en biga på 24 °C er en annen og dårligere ingrediens.'],
      ['Hvorfor stiv biga trenger mer gjær enn en poolish','Ved 45–50 % hydrering er vannmobiliteten begrenset, det osmotiske trykket høyere og diffusjonen dårlig. Multiplikatoren er ca. 2,5× ved 50 % mot 70 % hydrering. Dette forklarer den tilsynelatende motsetningen mellom kilder som sier 0,1 % og kilder som sier 1 % — de beskriver ulike hydreringer.'],
      ['Sluttblanding','Bryt bigaen i biter i maskinen med ~70 % av sluttvannet. Lav hastighet 3 min for å fordele, så middels 4–6 min til MODERAT utvikling. Ikke jag vindusrute. Spe så inn resten av vannet i 2–3 omganger sammen med saltet.'],
      ['Bulk','Oljet rektangulær boks, 1,5–2 timer ved 24–26 °C, 2–3 coil folds i første time, så urørt. Mål ~70–80 % stigning. Rektangulær boks forformer deigen for deg.'],
      ['Håndteringen som IKKE er forming','Mel benken kraftig (semule + mel). Vend ut boksen i én bevegelse så deigen faller som en plate med gassen intakt. Ikke slå ut, ikke rund, ikke brett. Mel toppen. Del med skrape i ETT bestemt nedadgående kutt per snitt — sager du, river du glutenet og slipper ut gassen i sidene.'],
      ['Vendingen — den viktigste detaljen','Hev emnene med GOD SIDE NED på melet klede i 40–60 min, og snu dem så over på plata. To grunner: den glatte undersiden blir toppen, og — det viktigste — under hevingen stiger de STØRSTE boblene til toppen av platen. Snuingen legger dem i bunnen, mot varmen, der de blåser oppover gjennom hele brødet.'],
      ['Vanlige feil','Flyter ut = for svakt mel (W under 280) eller overgjæret eller for stort hydreringshopp; gå tilbake til 74 % og klatre 2 % per bak. Jevn tett krumme = for mye elting eller sagete kutt. Store hull med gummiaktig bånd i bunnen = undergjæret eller understekt. Sur smak = biga over 20 t eller for varm.']
    ]
  },
  {
    tittel:'Utstyr — hva som faktisk betyr noe',
    ikon:'🔧',
    intro:'Rangert etter kvalitetsgevinst per krone for en vanlig husholdningsovn.',
    punkter:[
      ['1. Ovnstermometer (100–200 kr)','Billigste ting, størst informasjonsgevinst. Hjemmeovner ligger typisk 14–28 °C feil, og syklingen svinger ±28 °C. Rundt 80 % ligger utenfor akseptabelt avvik. Uten dette tar du ALLE andre valg mot en ukjent temperatur.'],
      ['Kalibreringsmetode','Luftføler midt i ovnen, midterste rille, ikke mot metall. Sett 175 °C. Kjør to påfølgende 30-minuttersperioder og FORKAST den første. Fra den andre: avvik = ((maks + min) / 2) − settpunkt. Spennet (maks − min) er separat diagnostisk — stort spenn betyr dårlig termisk masse, som fikses med stein eller stål, ikke med kalibrering.'],
      ['2. Støpejerns kombigryte (700–900 kr)','Største enkeltsprang for rundbrød, fordi den løser damp og bunnvarme i én gjenstand og gjør det PÅLITELIG, ikke omtrentlig. Velg kombigryte (grunn panne som bunn) framfor dyp gryte — du setter inn på en flat flate og brenner ikke underarmene.'],
      ['3. Bakestein eller bakestål (300–1200 kr)','Der gryta slutter å hjelpe: ciabatta, som stekes åpent og ofte flere om gangen. Stål til ciabatta/pizza/korte bak, stein til lange brødbak (stål overbruner bunnen over 45 min).'],
      ['4. Hevekurv med duk (150–300 kr)','Bedre overflatespenning og formholdning under kaldheving — en forutsetning for øret, og lar deg heve utildekket for blemmer. Badehette i bunnen av kurven fungerer utmerket, akkurat som notatet ditt sier.'],
      ['5. Buet lame (100–250 kr)','Nødvendig for den underskårne fliken, men nedstrøms alt over: en lame kan ikke redde en underdampet eller underoppvarmet bake.'],
      ['6. Innstikkstermometer (350–1100 kr)','Bekrefter 96–99 °C ferdig — og mer nyttig: forteller når brødet har falt til 35–38 °C og er trygt å skjære. Også riktig verktøy for å måle stålet.'],
      ['Sum','1200–2000 kr dekker hele det meningsfulle gapet mellom en husholdningsovn og en dekkovn for denne stilen. Alt utover er batchstørrelse og bekvemmelighet, ikke skorpekvalitet.']
    ]
  }
];
