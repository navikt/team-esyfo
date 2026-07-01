# 🧩 Funksjonelle endringer – Tiltakspakke 1

Dette er de **funksjonelle endringene** i Tiltakspakke 1: det vi faktisk bygger for å realisere [dulte-tiltakene](./dulte-tiltak) fra nudgelab. Én endring kan realisere flere dulte-tiltak, og ett dulte-tiltak kan spenne flere endringer.

Hver endring har:

- **Hva** – det brukeren faktisk møter.
- **Hvorfor** – dulten bak, forankret i adferdspsykologi.
- **Realiserer** – hvilke [dulte-tiltak](./dulte-tiltak) endringen henger på.
- **Figma** – lenke til skissen, der det finnes.
- **Spor** – lenke til oppgaven på tavla, der status og detaljer lever.

> **Status følger tavla, ikke wikien.** Følg «Spor»-lenken for hvor en endring står. Trenger du en rask oversikt, bruk tabellen under eller listen «På denne siden» til høyre.

## Oversikt

| # | Endring | For hvem | Figma | Spor |
|---|---------|----------|-------|------|
| 1 | «Kom i gang tidlig»-boks øverst | Arbeidsgiver | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1187-8558) | [dinesykmeldte#742](https://github.com/navikt/dinesykmeldte/issues/742) |
| 2 | «Ditt ansvar»-seksjon nederst | Arbeidsgiver | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1187-8558) | [dinesykmeldte#743](https://github.com/navikt/dinesykmeldte/issues/743) |
| 3 | Frivillig påminnelse om å lage plan | Arbeidsgiver | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1187-8346) | [dinesykmeldte#722](https://github.com/navikt/dinesykmeldte/issues/722) |
| 4 | Varsel/oppgave om å lage plan | Arbeidsgiver | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1187-7693) | [oppfolgingsplan-backend#330](https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/330) |
| 5 | Forbedret varsel når Nav ber om plan | Arbeidsgiver | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1206-10726) | [esyfovarsel#1018](https://github.com/navikt/esyfovarsel/issues/1018) |
| 6 | Behovsvurdering: «plan trengs ikke» | Arbeidsgiver | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1187-7824) | [oppfolgingsplan-backend#356](https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/356) |
| 7 | Tydeligere oppfølgingsplan-forside | Arbeidsgiver | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1191-12005) | [oppfolgingsplan-frontend#889](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/889) |
| 8 | Frivillig evalueringsvarsel | Arbeidsgiver | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1191-13254) | [oppfolgingsplan-backend#330](https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/330) |
| 9 | «Slik bidrar du» – uten aktiv plan | Sykmeldt | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1211-15333) | [oppfolgingsplan-frontend#890](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/890) |
| 10 | «Forbered deg til samtalen» | Sykmeldt | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1211-15333) | [oppfolgingsplan-frontend#890](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/890) |
| 11 | «Slik bidrar du» – med aktiv plan | Sykmeldt | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1211-15333) | [oppfolgingsplan-frontend#890](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/890) |
| 12 | Synliggjøre «plan ikke aktuell» | Sykmeldt | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1223-9621) | [oppfolgingsplan-frontend#888](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/888) |
| 13 | Be arbeidsgiver om å lage en plan | Sykmeldt | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1251-9339) | [oppfolgingsplan-frontend#764](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/764) |
| 14 | Mikrofrontend på Min side | Sykmeldt | — | [team-esyfo#140](https://github.com/navikt/team-esyfo/issues/140) |
| 15 | A/B-styring (Flaggskipet) | På tvers | — | [flaggskipet#5](https://github.com/navikt/flaggskipet/issues/5) |
| 16 | Måling | På tvers | — | [Måling](./maaling) |

## For arbeidsgiver (nærmeste leder)

### 1. «Kom i gang tidlig»-boks øverst på Dine sykmeldte {#e1}

- **Hva:** En boks øverst på [Dine sykmeldte](/omrader/dine-sykmeldte/) som oppfordrer lederen til å komme tidlig i gang med oppfølgingen.
- **Hvorfor:** Fjerner usikkerhet og oppmuntrer til tidlig kontakt.
- **Realiserer:** [Fjerne usikkerhet / tidlig kontakt](./dulte-tiltak#leder)
- **Figma:** [Dine sykmeldte](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1187-8558)
- **Spor:** [dinesykmeldte#742](https://github.com/navikt/dinesykmeldte/issues/742)

### 2. «Ditt ansvar når en ansatt er sykmeldt» nederst {#e2}

- **Hva:** En tydelig ansvarsseksjon nederst på Dine sykmeldte (erstatter dagens film og «tips og triks»), med fire punkter: lag oppfølgingsplan, gjennomfør dialogmøte 1, tilrettelegg, og følg opp gjennom hele forløpet — hvert med lenke til nav.no.
- **Hvorfor:** Gjør lederens rolle og ansvar tydeligere.
- **Realiserer:** [Rolleforståelse og ansvar](./dulte-tiltak#leder)
- **Figma:** [Dine sykmeldte](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1187-8558)
- **Spor:** [dinesykmeldte#743](https://github.com/navikt/dinesykmeldte/issues/743)

### 3. Frivillig påminnelse om å lage plan {#e3}

- **Hva:** Når lederen ser en ny sykmelding, kan hen be om en påminnelse i tilfelle fraværet nærmer seg 4 uker (fristen for oppfølgingsplan). Lederen velger selv, og kan avbestille.
- **Hvorfor:** En påminnelse gjør det lett å handle i tide. I dag har vi ingen naturlig inngang til oppfølging i tidlig fase — påminnelsen skaper den.
- **Realiserer:** [Påminnelser (standardvalg man kan melde seg av)](./dulte-tiltak#leder)
- **Figma:** [Dine sykmeldte](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1187-8346)
- **Spor:** [dinesykmeldte#722](https://github.com/navikt/dinesykmeldte/issues/722)

### 4. Varsel/oppgave om å lage plan {#e4}

- **Hva:** For dem som har takket ja: en beskjed på Min side arbeidsgiver (og mulig e-post) når fristen nærmer seg. Beskjeden leder videre til riktig sykmeldt i Dine sykmeldte og inn i oppfølgingsplanen.
- **Hvorfor:** Rett handling, til rett tid, på rett person.
- **Realiserer:** [Påminnelser; landingsside → riktig sykmeldt; meny → handlingsknapper](./dulte-tiltak#leder)
- **Figma:** [E-post-varsel med nudging](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1187-7693) · [Varsel på Min side arbeidsgiver](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1187-7715)
- **Merk:** Om ekstern e-post skal være med i første test er ikke avklart.
- **Spor:** [oppfolgingsplan-backend#330](https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/330)

### 5. Forbedret varsel når Nav ber om plan {#e5}

- **Hva:** Bedre tekst og innramming i varselet arbeidsgiver får når en Nav-veileder ber om en oppfølgingsplan.
- **Hvorfor:** Tydeligere hvorfor planen etterspørres gjør det lettere å svare.
- **Realiserer:** [Framing: hvorfor man deler plan](./dulte-tiltak#leder)
- **Figma:** [Varsel når Nav ber om en plan](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1206-10726)
- **Spor:** [esyfovarsel#1018](https://github.com/navikt/esyfovarsel/issues/1018)

### 6. Behovsvurdering: «meld fra om plan ikke trengs» {#e6}

- **Hva:** Alle i tiltakspakken kan aktivt melde fra at en oppfølgingsplan ikke er nødvendig akkurat nå — og kan ombestemme seg senere. Å lage plan er hovedvalget; unntak må velges aktivt.
- **Hvorfor:** Gjør oppfølgingsplan til standardvalget ved å synliggjøre unntakene.
- **Realiserer:** [Standardvalg (synliggjøre unntak)](./dulte-tiltak#leder)
- **Figma:** [Behov for oppfølgingsplan vs. unntak](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1187-7824) · [Fullstendig (unntak + historikk)](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1243-8582)
- **Merk:** Hvem beskjeden skal deles med (Nav, den sykmeldte) avklares med jurist/personvern.
- **Spor:** [oppfolgingsplan-backend#356](https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/356)

### 7. Tydeligere oppfølgingsplan-forside {#e7}

- **Hva:** Bedre tekst på forsiden av [oppfølgingsplanen](/omrader/oppfolgingsplan/) om hvordan lederen bør bruke planen, verdien av den, og hvorfor den bør deles med fastlegen.
- **Hvorfor:** Synliggjør verdien, og rammer inn deling med lege positivt — legen får bedre grunnlag for riktig gradert sykmelding.
- **Realiserer:** [Synliggjøre verdien; framing av deling med lege](./dulte-tiltak#leder)
- **Figma:** [Lager oppfølgingsplan](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1191-12005) · [Deler oppfølgingsplan](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1191-12690)
- **Spor:** [oppfolgingsplan-frontend#889](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/889)

### 8. Frivillig evalueringsvarsel {#e8}

- **Hva:** Lederen kan be om en påminnelse om å evaluere planen når evalueringsdatoen nærmer seg. Lederen velger selv (avkryssing).
- **Hvorfor:** Påminnelse pluss innramming av hvorfor jevnlig oppfølging hjelper.
- **Realiserer:** [Påminnelser; framing av hvorfor man evaluerer](./dulte-tiltak#leder)
- **Figma:** [Evaluere plan](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1191-13254)
- **Spor:** [oppfolgingsplan-backend#330](https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/330)

## For den sykmeldte (arbeidstaker)

### 9. «Slik bidrar du i oppfølgingen» – uten aktiv plan {#e9}

- **Hva:** Informasjon til den sykmeldte om hvordan hen kan bidra, og om egen medvirkningsplikt, før en plan finnes.
- **Hvorfor:** Styrker forståelsen av egen rolle og plikt.
- **Realiserer:** [Medvirkningsplikt; rolleforståelse](./dulte-tiltak#arbeidstaker)
- **Figma:** [Landingsside sykmeldt](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1211-15333)
- **Merk:** Få sykmeldte er inne på oppfølgingsplan-siden før en plan finnes — se endring 14.
- **Spor:** [oppfolgingsplan-frontend#890](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/890)

### 10. «Forbered deg til samtalen» {#e10}

- **Hva:** Et forberedelsesskjema og en samtaleguide (lenke til Idébanken) som hjelper den sykmeldte å forberede seg til samtalen med lederen.
- **Hvorfor:** Gjør det lettere å delta aktivt i egen oppfølging.
- **Realiserer:** [Forberedelsesskjema; samtaleguide](./dulte-tiltak#arbeidstaker)
- **Figma:** [Landingsside sykmeldt](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1211-15333)
- **Spor:** [oppfolgingsplan-frontend#890](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/890)

### 11. «Slik bidrar du i oppfølgingen» – med aktiv plan {#e11}

- **Hva:** Tilsvarende veiledning når den sykmeldte allerede har en aktiv plan — hvordan bidra videre.
- **Hvorfor:** Holder den sykmeldte aktiv gjennom hele forløpet.
- **Realiserer:** [Positive konsekvenser av oppfølging](./dulte-tiltak#arbeidstaker)
- **Figma:** [Landingsside sykmeldt](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1211-15333)
- **Spor:** [oppfolgingsplan-frontend#890](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/890)

### 12. Synliggjøre at leder har meldt «plan ikke aktuell» {#e12}

- **Hva:** Hvis lederen har meldt at en plan ikke trengs nå, vises dette tydelig for den sykmeldte, med mulighet til å ta kontakt med Nav ved spørsmål. Vises kun på siden — ikke som SMS eller e-post.
- **Hvorfor:** Åpenhet, og en mulighet for den sykmeldte til å reagere.
- **Realiserer:** Henger sammen med [behovsvurderingen (endring 6)](#e6).
- **Figma:** [Oppfølgingsplan foreløpig ikke aktuell](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1223-9621)
- **Spor:** [oppfolgingsplan-frontend#888](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/888)

### 13. Be arbeidsgiver om å lage en plan {#e13}

- **Hva:** Når det ikke finnes en aktiv plan, kan den sykmeldte be lederen om å lage en.
- **Hvorfor:** Gir den sykmeldte en aktiv kanal for medvirkning.
- **Realiserer:** [Medvirkning – en aktiv kanal](./dulte-tiltak#arbeidstaker)
- **Figma:** [Varsel når den ansatte ber om å lage en plan](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1251-9339)
- **Merk:** Noe funksjonalitet finnes fra før.
- **Spor:** [oppfolgingsplan-frontend#764](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/764)

### 14. Mikrofrontend på Min side {#e14}

- **Hva:** En modul på Min side (personbruker) som løfter fram og lenker til oppfølgings-innholdet, siden få sykmeldte er inne på oppfølgingsplan-siden før en plan finnes.
- **Hvorfor:** Møter den sykmeldte der de faktisk er.
- **Realiserer:** Gjør [endring 9–11](#e9) synlige der brukeren er.
- **Merk:** Uavklart om den skal handle kun om oppfølgingsplan, eller om medvirkning bredere (også aktivitetskrav og dialogmøte) — se discovery-oppgaven.
- **Spor:** [team-esyfo#140](https://github.com/navikt/team-esyfo/issues/140)

## På tvers

### 15. A/B-styring (Flaggskipet) {#e15}

- **Hva:** En egen tjeneste (Flaggskipet) avgjør hvilke arbeidsgivere som er i tiltaksgruppen (får pakken) og hvilke som er i kontrollgruppen (dagens opplevelse). Tildelingen skjer per underenhet, og piloten kjøres i Troms og Finnmark.
- **Hvorfor:** Lar oss måle effekten av pakken på en etterprøvbar måte.
- **Realiserer:** Selve A/B-testen (infrastruktur).
- **Spor:** [flaggskipet#5](https://github.com/navikt/flaggskipet/issues/5)

### 16. Måling {#e16}

- **Hva:** Vi måler om pakken virker — blant annet om flere lager en plan i tide.
- **Hvorfor:** Vi setter bare i gang tiltak vi kan måle, og forkaster det som ikke virker.
- **Realiserer:** Grunnlaget for å vurdere effekt (infrastruktur).
- **Spor:** Se [Måling](./maaling).
