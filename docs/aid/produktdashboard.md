# AID som produktdashboard

## Retning

AID-dashboardet skal gjøre registrert bruk av tiltakspakke 1 lett å forstå for
produktleder, designer og resten av teamet. Det skal hjelpe oss å velge hva vi
bør undersøke videre. Det skal ikke presentere teknisk instrumentering som
produktresultater, eller gi en automatisk dom over om pakken virker.

Hovedvisningen viser produksjonsdata og avgrenses til forsøket. Ferdigstilte
oppfølgingsplaner og de to forskjellige påminnelsene får hver sin seksjon.
En liten leveringskontroll er synlig, mens
tekniske detaljer ligger sammenfoldet. Vi fjerner generelle backendtotaler og
lange metodeforklaringer fra hovedflaten, ikke fra datainnsamlingen eller
dokumentasjonen.

Dette notatet beskriver designvalg, begrunnelser og krav til validering. Det er
ikke dokumentasjon på at en bestemt versjon er publisert eller brukertestet.

## 1. Hvilken jobb skal dashboardet gjøre?

[AID-oppdraget](./index) handler om bedre oppfølging, ikke flere klikk i seg
selv. Tiltakspakke 1 inneholder blant annet tidlig informasjon, påminnelse om å
lage plan, behovsvurdering, AID-tilpasninger i utfyllingen av oppfølgingsplanen
og støtte til den sykmeldtes medvirkning. [Endringsoversikten](./endringer)
viser en bredere pakke enn det
dagens målinger dekker.

Teamet har fast AID-synk på tirsdager og setter av tirsdag og onsdag til
dulting. Dashboardet bør støtte denne arbeidsrytmen:

| Situasjon | Spørsmål | Nyttig oppfølging |
| --- | --- | --- |
| Ukessynk | Hva er brukt siden sist, og hva er fortsatt lite observert? | Velge ett eller to spørsmål å undersøke videre. |
| Designarbeid | Hvilke tilbud velges, og hvor ser vi uventede mønstre? | Prioritere en brukertest eller gjennomgang av en bestemt flyt. |
| Oppfølging av utrulling | Får gruppene riktig løsning, og kommer målingene fram? | Avklare leveringsproblemer før lav aktivitet tolkes som en svak produktidé. |
| Videre prioritering | Hvilket viktig spørsmål hindrer dagens datagrunnlag oss i å svare på? | Velge neste avgrensede måling eller brukerinnsikt. |

Google-forskernes HEART-rammeverk beskriver en nyttig rekkefølge: avklar
brukermålet, identifiser tegn på at det nås, og velg deretter konkrete måltall.
Bruk og opplevd kvalitet er ulike sider av brukeropplevelsen. Et tilgjengelig
måltall er derfor ikke automatisk et relevant produktmål. [1](https://research.google.com/pubs/archive/36299.pdf)

For AID betyr dette at en ferdigstilt oppfølgingsplan er et nærliggende
aktivitetstegn. Den forteller ikke alene om planen er relevant, om lederen og
den ansatte har hatt en god samtale, eller om noen forsto teksten bedre.
Dashboardet må være nyttig uten å påstå at disse spørsmålene er besvart.

## 2. Fra instrumenteringsrapport til produktoversikt

Den tidligere oppbyggingen prioriterte server, nettleser og backend som
separate datakilder. Det ga mange overlappende tabeller og forklaringer på
hvorfor tallene ikke kunne summeres eller sammenlignes. Leseren måtte forstå
målekontraktene og sette flere kolonnefiltre før enkelte analyser ble riktige.

Grafanas egne råd er å bygge rundt et spørsmål, holde figurene fokuserte og
redusere tankearbeidet som kreves for å tolke dem. Detaljer kan ligge i
panelbeskrivelsen. [2](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/best-practices/)

ONS peker samtidig på at dashboards lett legger tolkningsbyrden på brukeren,
særlig når data krever mye forklaring. De anbefaler at behov undersøkes,
viktig informasjon prioriteres og innholdet vurderes på nytt over tid.
[3](https://service-manual.ons.gov.uk/data-visualisation/guidance/dashboards)

Vårt designvalg er derfor å gjøre hovedanalysene riktig avgrenset fra starten.
Brukeren skal ikke måtte filtrere bort «nei» fra varianten uten
AID-tilpasninger for å lese evalueringsvalget, eller vite at nasjonale
backendtotaler gjelder noe annet
enn forsøket. Færre forklaringer blir mulig fordi vi først rydder i innholdet.

Hovedflaten har ingen generell intro. Presise overskrifter forteller hva som
telles, og panelinformasjonen forklarer nødvendige avgrensninger der de er
relevante. Én lenke til [om tallene](./dashboard) erstatter den lange seksjonen
«Definisjoner og neste måletrinn».

## 3. Hovedvisningene

### Oppfølgingsplaner i forsøket

Planseksjonen viser ferdigstilte oppfølgingsplaner i tiltaks- og kontrollgruppen.
Den bruker én serverbasert kilde, som registrerer vellykket svar når lederen
har valgt «Ferdigstill og del med den ansatte». Backend har da lagret planen;
målingen gjelder ikke utkast, arbeidstakerens godkjenning eller om et varsel
er levert. Nettleserens bekreftelse vises ikke som et ekstra
produktresultat. Begge kan gjelde samme handling.

Det synlige navnet er «Ferdigstilte oppfølgingsplaner». Produktets «Oppdater
planen» leder til samme ferdigstilling, enten lederen bruker innhold fra den
forrige planen eller begynner med tom plan. Derfor forklarer panelinformasjonen
at hver ferdigstilling teller, også senere oppdateringer. Målingen skiller ikke
første plan fra oppdateringer og teller ikke unike ansatte eller alle planer
i databasen. Dekningen er beskrevet i [målegrunnlaget](./dashboard).

Seksjonen har tre forskjellige funksjoner:

- **Antall:** horisontale stolper med antall ferdigstillinger per gruppe i
  valgt tidsrom.
- **Utvikling:** trend fra samme kilde og med samme gruppeavgrensning.
- **Utfyllingssiden:** registrerte visninger fordelt på gruppe og variant
  med eller uten AID-tilpasninger, slik at vi kan se om forsøksopplevelsen
  når fram.

En visning betyr at utfyllingssiden kom inn i skjermbildet. Det er ikke en
visning av en ferdig plan, en unik leder eller dokumentasjon på at alle
felter eller tekster ble lest. Visningene brukes til leveringskontroll, ikke
som nevner for en konverteringsprosent.

Begge forsøksgrupper vises alltid sammen, uten en gruppevelger. Tiltaksgruppen
beholdes også når varianten uten AID-tilpasninger ble vist. Tildeling og
faktisk levert opplevelse må ikke blandes sammen.

Trendpunktene viser foreløpig **siste 24 timer ved hvert tidspunkt**, ikke
kalenderdager. Dette må stå i tittelen eller tett på grafen. Punktene overlapper
og kan ikke summeres til periodetotalen. Separate, tydelig avgrensede
dagsintervaller er en ønsket forbedring for ukessynken, men må få avklart
tidssone, delvise dager og telling før de erstatter dagens trend.

Antallsforskjeller mellom gruppene er ikke et effektmål. Vi kjenner ikke en
komplett nevner fra denne målingen. Ingen prosentvis forbedring, rangering av
gruppene eller rød/grønn resultatdom legges oppå volumene.

### Valg av evalueringspåminnelse · tiltaksgruppen

Denne seksjonen gjelder bare tiltaksgruppen som får AID-tilpasningene, der
valget faktisk tilbys. Horisontale stolper viser antall ferdigstilte planer
**med påminnelse** og **uten påminnelse**. Lederen må svare Ja eller Nei på om
hen ønsker en e-postpåminnelse om neste møte for å evaluere planen. Påminnelsen
planlegges tre dager før valgt evalueringsdato.

Ordvalget er bevisst nøytralt. Et innsendt valg dokumenterer ikke motivasjon,
og en verdi kan følge med fra et tidligere utkast eller den forrige planen.
Et nytt utkast har ikke et forhåndsvalgt svar. «Uten påminnelse» skal
likevel ikke omskrives til «ønsker ikke», «avviser» eller «synes ikke det er
nyttig». Tilsvarende betyr «med» ikke at varselet er sendt eller at planen er
evaluert.

Varianten uten AID-tilpasninger tilbyr ikke spørsmålet. Dens `nei` er ikke
et aktivt avslag og holdes utenfor fordelingen, sammen med kontrollgruppen
og bruk utenfor forsøket. Manglende
eller ugyldig verdi flyttes ikke inn i «uten». Slike hendelser undersøkes
som datadekning, ikke brukerpreferanser. Tabellen over ferdigstillingsforsøk
i den tekniske kontrollseksjonen viser manglende og ugyldige evalueringsfelt.
Ved utfylling uten AID-tilpasninger vises «Ikke tilbudt» framfor en verdi som kan
forveksles med et avslag.

Antall er tilstrekkelig nå. En eventuell senere andel må bruke registrerte
ferdigstillinger med tilbudt og kjent valg som nevner, og vise den nevneren.
Andelen ville fortsatt gjelde ferdigstillinger, inkludert oppdateringer, ikke
andelen arbeidsgivere som ønsker påminnelse.

### Påminnelse før fireukersfristen · Dine sykmeldte · tiltaksgruppen

Dette er et annet tilbud, på siden for én sykmelding i Dine sykmeldte.
Nærmeste leder kan velge en e-postpåminnelse før fristen for å lage
oppfølgingsplan. Påminnelsen planlegges 24 dager etter periodens start, ikke
etter fire uker. Seksjonen avgrenses tydelig til tiltaksgruppen og viser tre
tall:

1. Registrerte visninger av tilbudet.
2. Registrerte, vellykkede bestillinger.
3. Registrerte, vellykkede avbestillinger.

Tallene er selvstendige observasjoner. De tegnes ikke som en trakt med
frafall, og bestillinger deles ikke på visninger for å lage en
konverteringsrate. Målingen følger ikke de samme personene gjennom stegene.
Flere visninger eller handlinger kan gjelde samme oppfølging.

En bestilling bekrefter heller ikke utsending. «Ingen aktiv bestilling» ved
en visning kan ha flere forklaringer, blant annet en tidligere avbestilling.
Den er ikke et sikkert mål på «ikke svart» eller et nei til tilbudet.

En kompakt, synlig oversikt viser om tilbudet var tilgjengelig, skjult eller
ikke kunne vurderes. **Skjult er ikke automatisk feil.** Tilbudet kan være
skjult i en legitim tilstand; årsaken må undersøkes før det gis en
feilforklaring eller en rød status.

## 4. Fast sammenligning og ett felles tidsrom

Dashboardet viser bare produksjon og har ingen miljø- eller gruppevelger.
Testdata skal ikke blandes inn i produktoversikten. Periode er det eneste
felles valget og gjelder hele dashboardet. Planseksjonen viser alltid både
tiltak og kontroll; påminnelsesseksjonene måler tilbud som bare gjelder
tiltaksgruppen. Avgrensningen står i seksjonstitlene.

Grafana 13.1 støtter variabler og filtre på seksjonsnivå.
[4](https://grafana.com/docs/grafana/v13.1/visualizations/dashboards/build-dashboards/create-dashboard/dashboard-groupings/)
Et slikt gruppefilter ble prøvd, men opplevdes som et valg for hele
dashboardet selv om påminnelsestallene ikke endret seg. Fast sammenligning er
enklere: brukeren trenger ikke kjenne filterets tekniske omfang. Variabelen er
fjernet fra både oppsett og spørringer, ikke bare skjult. Gamle miljø- og
gruppeparametere i delte lenker skal heller ikke endre avgrensningen.

Vi innfører ikke et globalt «påminnelse»-filter. Evalueringsvalget finnes i
planhendelsen; bestilling av påminnelse om å lage plan finnes i en annen
målekjede. Dagens data kan ikke vise ferdigstilte planer blant dem som tidligere
bestilte den andre påminnelsen. En felles dropdown ville love en analyse vi
ikke har.

Det er heller ingen tiltakspakke-dropdown med bare ett meningsfullt valg.
Pakke 1 står i tittelen. Flere pakker kan få et felles filter først når
dataene og begrepene faktisk er sammenlignbare.

## 5. Synlig tillit, detaljer ved behov

«Utenfor forsøket» er ikke kontroll. Hovedanalysene viser tiltak og kontroll
innenfor forsøket, slik det er beskrevet i [AID-oppdraget](./index). Hendelser
utenfor forsøket beholdes i en sammenfoldet teknisk seksjon. De er nyttige
for å undersøke om feil gruppe får et tilbud, men skal ikke dominere
produktoversikten.

«Teknisk kontroll» omfatter alle grupper, ukjent tildeling,
utfylling med og uten AID-tilpasninger og mislykkede handlinger.
Tabellen over ferdigstillingsforsøk viser også evalueringsfeltet: registrerte
verdier, manglende eller ugyldige verdier, eller at valget ikke var tilbudt i
varianten uten AID-tilpasninger. Dette beholdes i samme
kontrollpanel, ikke som en ny hovedanalyse. Det finnes ikke en egen indikator
for hvor ferske dataene er.

Forsøk og resultat holdes adskilt. En nettleserfeil kan bety at bekreftelsen
ikke kom fram, selv om planen ble lagret. Den er derfor ikke automatisk en
tapt plan.

Microsofts arbeid med datakvalitet fremhever manglende og ugyldige verdier,
forsinkelse og konsistens som forutsetninger for troverdige analyser. De
understreker også at datakvalitet må undersøkes innen relevante segmenter;
et samlet tall kan skjule problemer i én gruppe.
[5](https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/articles/data-quality-fundamental-building-blocks-for-trustworthy-a-b-testing-analysis/)

For dette dashboardet skal kvalitetstesten minst dekke:

| Felt eller tilstand | Krav |
| --- | --- |
| Miljø | Bare produksjonsdata inngår, uten miljøvelger. |
| Gruppe | Begge forsøksgrupper vises fast i planseksjonen. Ukjent og utenfor forsøket blir aldri kontroll. |
| Utfyllingsvariant | Tildelt gruppe og visning med eller uten AID-tilpasninger kan leses hver for seg. |
| Evalueringsvalg | Manglende verdi blir aldri «uten påminnelse». |
| Hendelse og resultat | Forsøk, bekreftelse og feil summeres ikke til ett resultat. |
| Datakilde | Server- og nettleserobservasjoner telles ikke som separate planer. |
| Tidsrom | Ny måling har ingen historikk før utrulling; rullerende døgn merkes. |
| Tomt resultat | Ingen treff skilles fra queryfeil og omtales ikke som dokumentert null bruk. |

Teknisk korrekt spørring er bare ett kontrollpunkt. De første reelle
hendelsene må også passe kontrakten, og en vellykket deploy beviser ikke at
alle kategorier har vært brukt. Uobserverte kategorier merkes som ikke
verifisert med reelle data, ikke som feil.

## 6. Nyttige analyser og ugyldige snarveier

Dagens [datagrunnlag](./dashboard) støtter beskrivende spørsmål: hvor mye
registrert aktivitet vi ser, hvilke tilbudte valg som følger ferdigstillingene,
og hvilke leveringsmønstre som bør undersøkes. Det støtter ikke en komplett
brukerreise eller planresultater per person.

| Nyttig nå | Ikke støttet av samme tall |
| --- | --- |
| Ferdigstilte oppfølgingsplaner per gruppe | Hvor stor andel av gruppen som får en plan |
| Med/uten evalueringspåminnelse når valget tilbys | Hvorfor brukerne valgte slik, eller om de evaluerte |
| Bestilling og avbestilling av påminnelse før fireukersfristen | Aktive bestillinger, utsendte eller leste varsler |
| Visninger av utfyllingssiden med og uten AID-tilpasninger | Om innholdet er lest, forstått eller nyttig |
| Utvikling i registrert bruk | Kausal effekt av pakken eller én påminnelse |

Microsoft skiller mellom stabile segmenter og segmenter som selv påvirkes
av tiltaket. Sistnevnte kan endre sammensetning underveis og gi en misvisende
tolkning av forskjeller. Det er relevant for selvvalgte påminnelser, men
ikke et argument for å bygge en ny analyseplattform.
[6](https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/articles/patterns-of-trustworthy-experimentation-during-experiment-stage/)

En forskjell mellom handlinger med og uten valgt påminnelse skal derfor
ikke omtales som påminnelsens virkning. Vi innfører heller ikke nye
personkoblinger, helsefelt eller direkte analyse av sykefraværets lengde
eller grad. Slike analyser inngår ikke i denne leveransen eller i veikartet
under. Kravene til andre resultatmål er skilt ut i
[resultatmåling](./resultatmaaling).

## 7. Hva vi tar med fra dulting-studio

[Målerammeverket i dulting-studio](https://github.com/navikt/dulting-studio/blob/c81dc3b396db99446b61e54d29e335c58575db9a/docs/maling-rammeverk.md)
har en nyttig intensjon: start med ønsket atferd og bruk måling til å
undersøke om oppfølgingen blir bedre. Den spørsmålsdrevne fortellingen,
samlede kontroller og skjult metode er gode forbilder. Vi tar også med
skillet mellom aktivitet og opplevd støtte.

Prototypen er derimot ikke en produksjonskontrakt. Den bruker syntetiske tall
og forutsetter koblede aggregater. Dens
[metodeillustrasjon](https://github.com/navikt/dulting-studio/blob/c81dc3b396db99446b61e54d29e335c58575db9a/src/components/maling/sections/MetodeOgData.tsx)
viser fortsatt hele Troms og Finnmark mot resten av landet. Gjeldende
forsøksbeskrivelse har tilfeldig fordeling mellom virksomheter innenfor
pilotområdet. Illustrasjonen kan derfor ikke kopieres.

Automatiske konklusjoner om at pakken virker, responsfiltre på tvers av en
hel personreise og traktberegninger følger heller ikke med. Det vi skal
gjenskape, er forståeligheten, ikke antakelser som dagens data ikke bærer.

## 8. Språk, utforming og brukertest

Aksels skriveråd vektlegger enkel, vennlig og tilgjengelig tekst, korte
setninger og meningsbærende overskrifter. Det passer et dashboard for et
tverrfaglig produktteam. [7](https://aksel.nav.no/side/skriv-for-aksel)

Vi bruker derfor handlinger og tilbud i titlene, ikke «serverbekreftelse»,
«levert variant» eller «utfall». Tekniske feltnavn kan fortsatt stå i
detaljvisningen. Farger brukes konsekvent til å kjenne igjen grupper, ikke
til å kåre vinner eller taper. Små tall får være små; de trenger ikke en
stor statusindikator.

W3Cs veiledning for komplekse bilder fremhever at diagrammenes vesentlige
informasjon må være tilgjengelig som tekst. Dette er et nyttig prinsipp
også når vi vurderer om Grafanas figurer og tabeller er forståelige og
tilgjengelige. [8](https://www.w3.org/WAI/tutorials/images/complex/)

Vi skal derfor kunne finne de relevante tallene uten å være avhengig av
farge eller presis musepeking. Lesbarhet ved deling av skjerm, tastaturbruk,
smalere vindu og tilgang til tabellverdier inngår i kontrollen. Teknisk
visningstesting erstatter ikke en faktisk test med produktleder og designer.

En kort akseptansetest gjennomføres uten innledende metodeforedrag:

1. Finn planaktiviteten i forsøket og forklar hva som telles.
2. Finn tallene for tiltak og kontroll, og si hvilke seksjoner som bare gjelder tiltaksgruppen.
3. Forklar forskjellen på de to påminnelsene.
4. Finn valget ved ferdigstilling uten å tolke «uten» som motivasjon.
5. Forklar hva et tomt panel og en skjult påminnelse kan bety.
6. Velg ett spørsmål teamet bør undersøke videre, og ett dashboardet ikke kan besvare.

Målet er at hovedinnholdet skal kunne forstås på omtrent ett minutt. Reell
utprøving med disse brukerne gjenstår; designet skal justeres dersom de
trenger forklaringer for å unngå sentrale feiltolkninger.

## 9. Videre arbeid etter verdi

**Først: få den avgrensede oversikten til å fungere godt.** Verifiser
gruppeavgrensning, periodevalg, tallgrunnlag og tomme tilstander, og prøv den
i ukessynken. Forbedre dagsinndeling dersom rullerende døgn gjør samtalen
vanskelig. Behold bare figurer som faktisk brukes.

**Deretter: forstå påminnelsens leveranse.** En naturlig neste datakjede er
bestilling til autoritativt utsendingsresultat. Kartlegg eksisterende kilder
før nye hendelser bestilles. Avklar også om en teknisk utsending tilsvarer
det teamet ønsker å kalle «sendt». Det betyr fortsatt ikke «lest».

**Så: undersøk kvaliteten i brukeropplevelsen.** Prioriter konkrete spørsmål
om forståelse av behovsvurderingen, støtte versus press og om løsningen
hjelper samtalen med den ansatte. Brukertester eller en avklart, målrettet
undersøkelse kan gi mer verdi enn flere visningstellere. Den sykmeldtes
opplevelse må ikke forsvinne fordi dagens målinger hovedsakelig gjelder leder.

**Utvid produktdekningen når en beslutning krever det.** Behovsvurdering,
deling og senere bruk av planen er relevante kandidater. For hver kandidat
skal teamet formulere spørsmålet, identifisere den minste nødvendige målingen
og undersøke om kilden kan levere den innen gjeldende rammer. Ingen generell
instrumentering av alle flater, ingen ny personkobling og ingen ny
analyseplattform er en forutsetning.

Dashboardet skal bli bedre ved å besvare viktige spørsmål tydeligere, ikke
ved å få flest mulig paneler.

**Avklar varighet og kost før målingen blir en fast historisk rapport.** Loki
er nyttig for å kontrollere de nye hendelsene nå. NAIS anbefaler metrikker
først til dashboards og monitorering, blant annet av hensyn til ytelse og
kostnad. [9](https://doc.nais.io/observability/logging/) Vi må kontrollere faktisk
lagringstid og spørringskost før teamet baserer seg på lange tidsserier.
Stabile metrikker med få kategorier eller avklarte aggregater kan bli et
neste steg dersom bruken viser verdi. Det krever ikke et nytt bibliotek
eller en generell analyseplattform nå.

## Kilder

Eksterne primærkilder, kontrollert 9. september 2026:

1. Rodden, Hutchinson og Fu, Google: [Measuring the User Experience on a Large Scale: User-Centered Metrics for Web Applications](https://research.google.com/pubs/archive/36299.pdf), CHI 2010.
2. Grafana: [Dashboard best practices](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/best-practices/).
3. Office for National Statistics: [Advanced formats: Dashboards](https://service-manual.ons.gov.uk/data-visualisation/guidance/dashboards).
4. Grafana 13.1: [Dashboard panel groupings](https://grafana.com/docs/grafana/v13.1/visualizations/dashboards/build-dashboards/create-dashboard/dashboard-groupings/).
5. Microsoft Research: [Data Quality: Fundamental Building Blocks for Trustworthy A/B Testing Analysis](https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/articles/data-quality-fundamental-building-blocks-for-trustworthy-a-b-testing-analysis/), 2021.
6. Microsoft Research: [Patterns of Trustworthy Experimentation: During-Experiment Stage](https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/articles/patterns-of-trustworthy-experimentation-during-experiment-stage/), 2021.
7. Nav, Aksel: [Skriv for Aksel](https://aksel.nav.no/side/skriv-for-aksel).
8. W3C WAI: [Complex Images](https://www.w3.org/WAI/tutorials/images/complex/).
9. NAIS: [Logging](https://doc.nais.io/observability/logging/).

Internt grunnlag: [AID-oppdraget](./index), [funksjonelle endringer](./endringer),
[dagens målekontrakter](./dashboard), [resultatmåling](./resultatmaaling) og de
lenkede kildeversjonene fra dulting-studio. Interne definisjoner og rammene for
AID styrer analysene; eksterne råd begrunner utforming og kontroll, ikke nye
datainnsamlingsformål.
