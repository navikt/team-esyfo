# 🧩 Funksjonelle endringer – Tiltakspakke 1

Dette er de **funksjonelle endringene** i Tiltakspakke 1: det vi faktisk bygger for å realisere [dulte-tiltakene](./dulte-tiltak) fra nudgelab. Én endring kan realisere flere dulte-tiltak, og ett dulte-tiltak kan spenne flere endringer.

Hver endring har:

- **Hva** – det brukeren faktisk møter.
- **Hvorfor** – dulten bak, forankret i adferdspsykologi.
- **Realiserer** – hvilke [dulte-tiltak](./dulte-tiltak) endringen henger på.
- **Status** – 🟢 Ferdig · 🟡 Under arbeid · ⚪ Planlagt · 🔵 Kanskje / uavklart
- **Spor** – lenke til oppgaven der detaljene og live-status lever.

> Statusen her er grov og kan henge litt etter. **Prosjekttavla og oppgavene er alltid fasit** — følg «Spor»-lenken. Trenger du en rask oversikt over alle endringene, bruk listen «På denne siden» til høyre.

## For arbeidsgiver (nærmeste leder)

### 1. «Kom i gang tidlig»-boks øverst på Dine sykmeldte ⚪ {#e1}

- **Hva:** En boks øverst på [Dine sykmeldte](/omrader/dine-sykmeldte/) som oppfordrer lederen til å komme tidlig i gang med oppfølgingen.
- **Hvorfor:** Fjerner usikkerhet og oppmuntrer til tidlig kontakt.
- **Realiserer:** [Fjerne usikkerhet / tidlig kontakt](./dulte-tiltak#leder)
- **Status:** Planlagt.
- **Spor:** [dinesykmeldte#742](https://github.com/navikt/dinesykmeldte/issues/742)

### 2. «Ditt ansvar når en ansatt er sykmeldt» nederst ⚪ {#e2}

- **Hva:** En tydelig ansvarsseksjon nederst på Dine sykmeldte (erstatter dagens film og «tips og triks»), med fire punkter: lag oppfølgingsplan, gjennomfør dialogmøte 1, tilrettelegg, og følg opp gjennom hele forløpet — hvert med lenke til nav.no.
- **Hvorfor:** Gjør lederens rolle og ansvar tydeligere.
- **Realiserer:** [Rolleforståelse og ansvar](./dulte-tiltak#leder)
- **Status:** Planlagt.
- **Spor:** [dinesykmeldte#742](https://github.com/navikt/dinesykmeldte/issues/742)

### 3. Frivillig påminnelse om å lage plan 🟡 {#e3}

- **Hva:** Når lederen ser en ny sykmelding, kan hen be om en påminnelse i tilfelle fraværet nærmer seg 4 uker (fristen for oppfølgingsplan). Lederen velger selv, og kan avbestille.
- **Hvorfor:** En påminnelse gjør det lett å handle i tide. I dag har vi ingen naturlig inngang til oppfølging i tidlig fase — påminnelsen skaper den.
- **Realiserer:** [Påminnelser (standardvalg man kan melde seg av)](./dulte-tiltak#leder)
- **Status:** Under arbeid.
- **Spor:** [dinesykmeldte#722](https://github.com/navikt/dinesykmeldte/issues/722)

### 4. Varsel/oppgave om å lage plan 🟡 {#e4}

- **Hva:** For dem som har takket ja: en beskjed på Min side arbeidsgiver (og mulig e-post) når fristen nærmer seg. Beskjeden leder videre til riktig sykmeldt i Dine sykmeldte og inn i oppfølgingsplanen.
- **Hvorfor:** Rett handling, til rett tid, på rett person.
- **Realiserer:** [Påminnelser; landingsside → riktig sykmeldt; meny → handlingsknapper](./dulte-tiltak#leder)
- **Status:** Under arbeid. Om ekstern e-post skal være med i første test er ikke avklart.
- **Spor:** [oppfolgingsplan-backend#330](https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/330)

### 5. Forbedret varsel når Nav ber om plan ⚪ {#e5}

- **Hva:** Bedre tekst og innramming i varselet arbeidsgiver får når en Nav-veileder ber om en oppfølgingsplan.
- **Hvorfor:** Tydeligere hvorfor planen etterspørres gjør det lettere å svare.
- **Realiserer:** [Framing: hvorfor man deler plan](./dulte-tiltak#leder)
- **Status:** Planlagt.
- **Spor:** [esyfovarsel#1018](https://github.com/navikt/esyfovarsel/issues/1018)

### 6. Behovsvurdering: «meld fra om plan ikke trengs» 🟡 {#e6}

- **Hva:** Alle i tiltakspakken kan aktivt melde fra at en oppfølgingsplan ikke er nødvendig akkurat nå — og kan ombestemme seg senere. Å lage plan er hovedvalget; unntak må velges aktivt.
- **Hvorfor:** Gjør oppfølgingsplan til standardvalget ved å synliggjøre unntakene.
- **Realiserer:** [Standardvalg (synliggjøre unntak)](./dulte-tiltak#leder)
- **Status:** Under arbeid. Hvem beskjeden skal deles med (Nav, den sykmeldte) avklares med jurist/personvern.
- **Spor:** [oppfolgingsplan-backend#308](https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/308)

### 7. Tydeligere oppfølgingsplan-forside ⚪ {#e7}

- **Hva:** Bedre tekst på forsiden av [oppfølgingsplanen](/omrader/oppfolgingsplan/) om hvordan lederen bør bruke planen, verdien av den, og hvorfor den bør deles med fastlegen.
- **Hvorfor:** Synliggjør verdien, og rammer inn deling med lege positivt — legen får bedre grunnlag for riktig gradert sykmelding.
- **Realiserer:** [Synliggjøre verdien; framing av deling med lege](./dulte-tiltak#leder)
- **Status:** Planlagt.
- **Spor:** [oppfolgingsplan-frontend#889](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/889)

### 8. Frivillig evalueringsvarsel 🟡 {#e8}

- **Hva:** Lederen kan be om en påminnelse om å evaluere planen når evalueringsdatoen nærmer seg. Lederen velger selv (avkryssing).
- **Hvorfor:** Påminnelse pluss innramming av hvorfor jevnlig oppfølging hjelper.
- **Realiserer:** [Påminnelser; framing av hvorfor man evaluerer](./dulte-tiltak#leder)
- **Status:** Under arbeid.
- **Spor:** [oppfolgingsplan-backend#330](https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/330)

## For den sykmeldte (arbeidstaker)

### 9. «Slik bidrar du i oppfølgingen» – uten aktiv plan ⚪ {#e9}

- **Hva:** Informasjon til den sykmeldte om hvordan hen kan bidra, og om egen medvirkningsplikt, før en plan finnes.
- **Hvorfor:** Styrker forståelsen av egen rolle og plikt.
- **Realiserer:** [Medvirkningsplikt; rolleforståelse](./dulte-tiltak#arbeidstaker)
- **Status:** Planlagt. Merk: få sykmeldte er inne på oppfølgingsplan-siden før en plan finnes — se endring 14.
- **Spor:** [oppfolgingsplan-frontend#890](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/890)

### 10. «Forbered deg til samtalen» ⚪ {#e10}

- **Hva:** Et forberedelsesskjema og en samtaleguide (lenke til Idébanken) som hjelper den sykmeldte å forberede seg til samtalen med lederen.
- **Hvorfor:** Gjør det lettere å delta aktivt i egen oppfølging.
- **Realiserer:** [Forberedelsesskjema; samtaleguide](./dulte-tiltak#arbeidstaker)
- **Status:** Planlagt.
- **Spor:** [oppfolgingsplan-frontend#890](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/890)

### 11. «Slik bidrar du i oppfølgingen» – med aktiv plan ⚪ {#e11}

- **Hva:** Tilsvarende veiledning når den sykmeldte allerede har en aktiv plan — hvordan bidra videre.
- **Hvorfor:** Holder den sykmeldte aktiv gjennom hele forløpet.
- **Realiserer:** [Positive konsekvenser av oppfølging](./dulte-tiltak#arbeidstaker)
- **Status:** Planlagt.
- **Spor:** [oppfolgingsplan-frontend#890](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/890)

### 12. Synliggjøre at leder har meldt «plan ikke aktuell» ⚪ {#e12}

- **Hva:** Hvis lederen har meldt at en plan ikke trengs nå, vises dette tydelig for den sykmeldte, med mulighet til å ta kontakt med Nav ved spørsmål. Vises kun på siden — ikke som SMS eller e-post.
- **Hvorfor:** Åpenhet, og en mulighet for den sykmeldte til å reagere.
- **Realiserer:** Henger sammen med [behovsvurderingen (endring 6)](#e6).
- **Status:** Planlagt.
- **Spor:** [oppfolgingsplan-frontend#888](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/888)

### 13. Be arbeidsgiver om å lage en plan 🔵 {#e13}

- **Hva:** Når det ikke finnes en aktiv plan, kan den sykmeldte be lederen om å lage en.
- **Hvorfor:** Gir den sykmeldte en aktiv kanal for medvirkning.
- **Realiserer:** [Medvirkning – en aktiv kanal](./dulte-tiltak#arbeidstaker)
- **Status:** Kanskje. Noe funksjonalitet finnes fra før.
- **Spor:** [oppfolgingsplan-frontend#764](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/764)

### 14. Mikrofrontend på Min side 🔵 {#e14}

- **Hva:** En modul på Min side (personbruker) som løfter fram og lenker til oppfølgings-innholdet, siden få sykmeldte er inne på oppfølgingsplan-siden før en plan finnes.
- **Hvorfor:** Møter den sykmeldte der de faktisk er.
- **Realiserer:** Gjør [endring 9–11](#e9) synlige der brukeren er.
- **Status:** Kanskje. Uavklart om den skal handle kun om oppfølgingsplan, eller om medvirkning bredere (også aktivitetskrav og dialogmøte).
- **Spor:** Ingen oppgave ennå.

## På tvers

### 15. A/B-styring (Flaggskipet) 🟡 {#e15}

- **Hva:** En egen tjeneste (Flaggskipet) avgjør hvilke arbeidsgivere som er i tiltaksgruppen (får pakken) og hvilke som er i kontrollgruppen (dagens opplevelse). Tildelingen skjer per underenhet, og piloten kjøres i Troms og Finnmark.
- **Hvorfor:** Lar oss måle effekten av pakken på en etterprøvbar måte.
- **Realiserer:** Selve A/B-testen (infrastruktur).
- **Status:** Under arbeid (aktiv i testmiljø).
- **Spor:** [flaggskipet#5](https://github.com/navikt/flaggskipet/issues/5)

### 16. Måling 🟡 {#e16}

- **Hva:** Vi måler om pakken virker — blant annet om flere lager en plan i tide.
- **Hvorfor:** Vi setter bare i gang tiltak vi kan måle, og forkaster det som ikke virker.
- **Realiserer:** Grunnlaget for å vurdere effekt (infrastruktur).
- **Status:** Under arbeid.
- **Spor:** Se [Måling](./maaling).
