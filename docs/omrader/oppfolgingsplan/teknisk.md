# Oppfølgingsplan — teknisk oversikt

Oppfølgingsplan-systemet lagrer <Term id="utkast">utkast</Term> og planer, henter <Term id="stillingsinformasjon">stillingsinformasjon</Term> fra Aareg, varsler via Kafka og deler ferdige planer med Nav eller fastlege.

## Arbeidsgiverdataflyt

### 1. Lage utkast

```mermaid
sequenceDiagram
    actor arbeidsgiver as Arbeidsgiver
    participant dinesykmeldte as dinesykmeldte
    participant frontend as syfo-oppfolgingsplan-frontend
    participant backend as syfo-oppfolgingsplan-backend
    participant db as PostgreSQL

    arbeidsgiver->>dinesykmeldte: åpner ansatt
    dinesykmeldte->>frontend: åpner /syk/oppfolgingsplan
    arbeidsgiver->>frontend: fyller ut mål, tiltak og arbeidsoppgaver
    Note right of frontend: TokenX mot backend
    frontend->>backend: lagrer utkast
    backend->>db: oppretter eller oppdaterer utkast
```

### 2. Opprette oppfølgingsplan

```mermaid
sequenceDiagram
    actor arbeidsgiver as Arbeidsgiver
    participant frontend as syfo-oppfolgingsplan-frontend
    participant backend as syfo-oppfolgingsplan-backend
    participant aareg as Aareg
    participant db as PostgreSQL
    participant varselbus as «Kafka»<br/>team-esyfo.varselbus

    arbeidsgiver->>frontend: sender inn planen
    Note right of frontend: TokenX mot backend
    frontend->>backend: oppretter oppfølgingsplan
    backend->>aareg: henter stillingsinformasjon
    aareg-->>backend: returnerer stillingstittel og stillingsprosent
    backend->>db: lagrer plan og sletter utkast
    backend->>varselbus: publiserer SM_OPPFOLGINGSPLAN_OPPRETTET
```

### 3. Dele med Nav (valgfritt)

```mermaid
sequenceDiagram
    actor arbeidsgiver as Arbeidsgiver
    actor veileder as Nav-veileder
    participant frontend as syfo-oppfolgingsplan-frontend
    participant backend as syfo-oppfolgingsplan-backend
    participant pdfgen as syfooppdfgen
    participant dokarkiv as dokarkiv<br/>(Joark)
    participant modia as syfomodiaperson<br/>(Modia)

    arbeidsgiver->>frontend: velger del med Nav
    Note right of frontend: TokenX mot backend
    frontend->>backend: ber om deling
    backend->>pdfgen: genererer PDF
    backend->>dokarkiv: arkiverer planen
    dokarkiv-->>backend: returnerer journalpostId
    veileder->>modia: åpner oppfølging
    Note right of modia: Azure AD mot backend
    modia->>backend: henter delte planer
    backend-->>modia: returnerer plan
    modia-->>veileder: viser planen
```

### 4. Dele med fastlege (valgfritt)

```mermaid
sequenceDiagram
    actor arbeidsgiver as Arbeidsgiver
    actor lege as Fastlege
    participant frontend as syfo-oppfolgingsplan-frontend
    participant backend as syfo-oppfolgingsplan-backend
    participant pdfgen as syfooppdfgen
    participant isdialogmelding as IsDialogmelding

    arbeidsgiver->>frontend: velger del med fastlege
    Note right of frontend: TokenX mot backend
    frontend->>backend: ber om deling
    backend->>pdfgen: genererer PDF
    backend->>isdialogmelding: sender PDF til fastlege
    Note right of isdialogmelding: Sikker overføring via Norsk Helsenett
    isdialogmelding-->>lege: leverer til journalsystem
```

## Sykmeldtdataflyt

### 1. Mottar varsel og åpner plan

```mermaid
sequenceDiagram
    participant varselbus as «Kafka»<br/>team-esyfo.varselbus
    participant esyfovarsel as esyfovarsel
    actor sykmeldt as Den sykmeldte
    participant frontend as syfo-oppfolgingsplan-frontend
    participant backend as syfo-oppfolgingsplan-backend

    esyfovarsel-->>varselbus: lytter
    esyfovarsel->>sykmeldt: sender varsel om opprettet plan
    sykmeldt->>frontend: åpner /syk/oppfolgingsplan via Ditt sykefravær
    Note right of frontend: TokenX mot backend
    frontend->>backend: henter planer
    backend-->>frontend: returnerer aktive planer
```

### 2. Ser innholdet i planen

```mermaid
sequenceDiagram
    actor sykmeldt as Den sykmeldte
    participant frontend as syfo-oppfolgingsplan-frontend
    participant backend as syfo-oppfolgingsplan-backend

    sykmeldt->>frontend: åpner en plan
    Note right of frontend: TokenX mot backend
    frontend->>backend: henter plan by uuid
    backend-->>frontend: returnerer planinnhold
    frontend-->>sykmeldt: viser mål, tiltak og arbeidsoppgaver
```

## Kafka-topics

| Topic | Retning | Beskrivelse |
|-------|---------|-------------|
| `team-esyfo.varselbus` | Ut | Publiserer `SM_OPPFOLGINGSPLAN_OPPRETTET` når en plan er opprettet |

## Systemer

| System | Ansvar |
|--------|--------|
| [syfo-oppfolgingsplan-frontend](https://github.com/navikt/syfo-oppfolgingsplan-frontend) | Viser oppfølgingsplanen for arbeidsgiver og arbeidstaker på `/syk/oppfolgingsplan` |
| [syfo-oppfolgingsplan-backend](https://github.com/navikt/syfo-oppfolgingsplan-backend) | Lagrer utkast og planer, eksponerer API-er og styrer deling |
| [dinesykmeldte](https://github.com/navikt/dinesykmeldte) | Inngang for arbeidsgiver til å starte en plan fra oversikten over ansatte |
| [Aareg](https://www.nav.no/no/nav-og-samfunn/kontakt-nav/for-utviklere/apier/aareg) | Leverer stillingstittel og stillingsprosent når planen opprettes |
| [esyfovarsel](https://github.com/navikt/esyfovarsel) | Lytter på varselbus og sender varsel om opprettet plan |
| [syfooppdfgen](https://github.com/navikt/syfooppdfgen) | Lager PDF av oppfølgingsplanen før deling |
| [syfo-dokumentporten](https://github.com/navikt/syfo-dokumentporten) | Mottar PDF, oppretter dialog i Altinn Dialogporten og gjør planen tilgjengelig for arbeidsgiver via LPS eller innboks |
| [dokarkiv](https://confluence.adeo.no/display/BOA/dokarkiv) | Journalfører planen i Joark ved deling med Nav |
| [IsDialogmelding](https://github.com/navikt/isdialogmelding) (iSyfo) | Sender planen til fastlege ved deling med fastlege |
| [syfomodiaperson](https://github.com/navikt/syfomodiaperson) | Henter delte planer fra backend og viser dem til Nav-veileder |
