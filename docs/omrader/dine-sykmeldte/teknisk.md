# Dine sykmeldte — teknisk oversikt

Dine sykmeldte består av en Next.js-frontend, et internt GraphQL-lag i frontendappen, en Ktor-backend og en delt sidemeny. Backend lagrer og leser data fra PostgreSQL og holder oversikten oppdatert ved å konsumere hendelser fra Kafka.

## Dataflyt

### 1. Åpne oversikt over sykmeldte

```mermaid
sequenceDiagram
    actor arbeidsgiver as Arbeidsgiver (nærmesteleder)
    participant frontend as dinesykmeldte
    participant graphql as Next.js GraphQL-lag
    participant backend as dinesykmeldte-backend
    participant db as PostgreSQL

    arbeidsgiver->>frontend: åpner /arbeidsgiver/sykmeldte
    frontend->>graphql: SSR og klientkall mot /api/graphql
    Note right of graphql: OAuth2 OBO via @navikt/oasis
    graphql->>backend: GET /api/minesykmeldte
    graphql->>backend: GET /api/virksomheter
    backend->>db: henter sykmeldte, lesestatus og aktivitetsvarsler
    backend-->>graphql: returnerer oversikt
    graphql-->>frontend: mapper data til UI
    frontend-->>arbeidsgiver: viser ansatte, status og varsler
```

### 2. Åpne detaljside og navigere videre

```mermaid
sequenceDiagram
    actor arbeidsgiver as Arbeidsgiver (nærmesteleder)
    participant frontend as dinesykmeldte
    participant sidemeny as dinesykmeldte-sidemeny
    participant graphql as Next.js GraphQL-lag
    participant backend as dinesykmeldte-backend
    participant dialogmote as dialogmote-frontend
    participant oppfolgingsplan as syfo-oppfolgingsplan-frontend

    arbeidsgiver->>frontend: åpner en sykmeldt
    frontend->>sidemeny: bygger PageContainer og SideMenu
    sidemeny-->>arbeidsgiver: viser lenker til detaljsider og andre apper
    arbeidsgiver->>frontend: åpner sykmelding eller søknad
    frontend->>graphql: henter detaljdata
    graphql->>backend: GET /api/sykmelding/{id} eller /api/soknad/{id}
    backend-->>graphql: returnerer detaljdata
    graphql-->>frontend: oppdaterer siden
    arbeidsgiver->>sidemeny: velger Dialogmøter eller Oppfølgingsplaner
    sidemeny-->>dialogmote: lenker videre til dialogmote-frontend
    sidemeny-->>oppfolgingsplan: lenker videre til oppfølgingsplan-frontend
```

### 3. Aktivitetsvarsler via Kafka

Aktivitetsvarsler er beskjeder som forteller nærmesteleder at noe har skjedd — for eksempel en ny søknad eller en hendelse i sykefraværsforløpet. Andre tjenester publiserer varsler til Kafka, backend konsumerer dem og viser dem som uleste beskjeder i oversikten.

```mermaid
sequenceDiagram
    participant varsler as sykepengesoknad-narmesteleder-varsler / esyfovarsel
    participant kafka as «Kafka»<br/>team-esyfo.dinesykmeldte-hendelser-v2
    participant backend as dinesykmeldte-backend
    participant db as PostgreSQL
    participant graphql as Next.js GraphQL-lag
    participant frontend as dinesykmeldte
    actor arbeidsgiver as Arbeidsgiver (nærmesteleder)

    varsler->>kafka: skriver opprettHendelse eller ferdigstillHendelse
    backend->>kafka: konsumerer topicet
    backend->>db: lagrer eller ferdigstiller aktivitetsvarsel
    arbeidsgiver->>frontend: åpner oversikt eller beskjeder
    frontend->>graphql: mutation for lesestatus
    graphql->>backend: PUT /api/hendelse/{id}/lest eller /api/hendelser/read
    backend->>db: oppdaterer lesestatus
    backend-->>graphql: bekrefter oppdatering
    graphql-->>frontend: oppdaterer UI
```

## Kafka-topics

| Topic | Retning | Beskrivelse |
|-------|---------|-------------|
| `teamsykmelding.syfo-narmesteleder-leesah` | Inn | Oppdaterer koblingen mellom leder og sykmeldt i backend |
| `teamsykmelding.syfo-sendt-sykmelding` | Inn | Gir backend nye og oppdaterte sykmeldinger |
| `flex.sykepengesoknad` | Inn | Gir backend søknadsdata som vises for arbeidsgiver |
| `team-esyfo.dinesykmeldte-hendelser-v2` | Inn | Gir aktivitetsvarsler og ferdigstilling av varsler til oversikten |

## Systemer

| System | Ansvar |
|--------|--------|
| [dinesykmeldte](https://github.com/navikt/dinesykmeldte) | Next.js-frontend for arbeidsgiver. Viser oversikt, detaljsider og intern GraphQL-ruting mot backend |
| [dinesykmeldte-backend](https://github.com/navikt/dinesykmeldte-backend) | Ktor-backend som eksponerer API-er, konsumerer Kafka-topics og lagrer data i PostgreSQL |
| [dinesykmeldte-sidemeny](https://github.com/navikt/dinesykmeldte-sidemeny) | Delt React-bibliotek med sidemeny og layout for Dine sykmeldte, Dialogmøter og Oppfølgingsplan |
| [syfo-oppfolgingsplan-frontend](https://github.com/navikt/syfo-oppfolgingsplan-frontend) | Frontend som arbeidsgiver kan åpne fra sidemenyen når det er behov for oppfølgingsplan |
| [dialogmote-frontend](https://github.com/navikt/dialogmote-frontend) | Frontend som arbeidsgiver kan åpne fra sidemenyen for dialogmøter |
| [esyfovarsel](https://github.com/navikt/esyfovarsel) | Skriver hendelser til Dine sykmeldte-topicet for varsler som skal vises til arbeidsgiver |
| [sykepengesoknad-narmesteleder-varsler](https://github.com/navikt/sykepengesoknad-narmesteleder-varsler) | Produserer hendelser om søknader og andre oppgaver til Dine sykmeldte-topicet |
| [flex-syketilfelle](https://github.com/navikt/flex-syketilfelle) | Leverer informasjon om aktivt syketilfelle som backend bruker i oppfølgingen |
