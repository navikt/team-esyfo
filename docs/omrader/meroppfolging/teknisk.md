# Meroppfølging — teknisk oversikt

Meroppfølging-systemet gir den sykmeldte informasjon i <Term id="sen-oppfolging">sen fase</Term> av sykefraværet, viser <Term id="maksdato">maksdato</Term> for sykepenger og lagrer svar om behov for videre oppfølging. Backend henter grunnlag fra Kafka, frontend henter maksdato direkte fra API-et til sykepengedager-informasjon, og backend gjør svarene tilgjengelige både i API-er og Kafka-topics.

## Dataflyt

### 1. Grunnlag for sen oppfølging

```mermaid
sequenceDiagram
    participant sykmelding as «Kafka»<br/>teamsykmelding.ok-sykmelding
    participant sykepengedager as «Kafka»<br/>team-esyfo.sykepengedager-informasjon-topic
    participant backend as meroppfolging-backend
    participant db as PostgreSQL

    sykmelding-->>backend: leverer godkjent sykmelding
    sykepengedager-->>backend: leverer informasjon om gjenstående sykepengedager
    backend->>db: oppdaterer grunnlag for status og tilgang
```

### 2. Varsler sendes

```mermaid
sequenceDiagram
    participant backend as meroppfolging-backend
    participant senvarsel as «Kafka»<br/>team-esyfo.sen-oppfolging-varsel
    participant varselbus as «Kafka»<br/>team-esyfo.varselbus
    participant esyfovarsel as esyfovarsel
    actor sykmeldt as Den sykmeldte

    backend->>senvarsel: publiserer varsel om sen oppfølging
    backend->>varselbus: publiserer varsel-hendelse
    esyfovarsel-->>varselbus: lytter
    esyfovarsel->>sykmeldt: sender notifikasjon eller SMS
```

### 3. Den sykmeldte åpner siden

```mermaid
sequenceDiagram
    actor sykmeldt as Den sykmeldte
    participant frontend as meroppfolging-frontend
    participant backend as meroppfolging-backend
    participant spdi as sykepengedager-informasjon

    sykmeldt->>frontend: åpner /syk/meroppfolging/snart-slutt-pa-sykepengene
    frontend->>spdi: henter maksdato
    spdi-->>frontend: returnerer maksdato
    Note right of frontend: TokenX mot backend
    frontend->>backend: henter status for sen oppfølging
    backend-->>frontend: returnerer tilgang, status og eventuelt tidligere svar
```

### 4. Den sykmeldte sender svar

```mermaid
sequenceDiagram
    actor sykmeldt as Den sykmeldte
    participant frontend as meroppfolging-frontend
    participant backend as meroppfolging-backend
    participant db as PostgreSQL
    participant svartopic as «Kafka»<br/>team-esyfo.sen-oppfolging-svar

    sykmeldt->>frontend: sender inn skjemaet
    Note right of frontend: TokenX mot backend
    frontend->>backend: POST /api/v2/senoppfolging/submitform
    backend->>db: lagrer svarene
    backend->>svartopic: publiserer svar om oppfølgingsbehov
```

### 5. ismeroppfolging bruker svar-topicet

```mermaid
sequenceDiagram
    participant backend as meroppfolging-backend
    participant svartopic as «Kafka»<br/>team-esyfo.sen-oppfolging-svar
    participant ismeroppfolging as ismeroppfolging

    backend->>svartopic: publiserer svar om oppfølgingsbehov
    ismeroppfolging-->>svartopic: konsumerer svar-topicet
    svartopic-->>ismeroppfolging: leverer svar til videre oppfølging
```

### 6. Nav-veileder henter svar

```mermaid
sequenceDiagram
    actor veileder as Nav-veileder
    participant modia as syfomodiaperson
    participant backend as meroppfolging-backend

    veileder->>modia: åpner personen i Modia
    Note right of modia: Azure AD mot backend
    modia->>backend: henter skjemasvar
    backend-->>modia: returnerer svar
    modia-->>veileder: viser svaret
```

## Kafka-topics

| Topic                                         | Retning | Beskrivelse                                                                       |
| --------------------------------------------- | ------- | --------------------------------------------------------------------------------- |
| `teamsykmelding.ok-sykmelding`                | Inn     | Mottar godkjente sykmeldinger                                                     |
| `team-esyfo.sykepengedager-informasjon-topic` | Inn     | Mottar informasjon om gjenstående sykepengedager til backend-grunnlag             |
| `team-esyfo.sen-oppfolging-svar`              | Ut      | Publiserer svar fra sykmeldte om oppfølgingsbehov, som ismeroppfolging konsumerer |
| `team-esyfo.sen-oppfolging-varsel`            | Ut      | Publiserer varsler om sen oppfølging                                              |
| `team-esyfo.varselbus`                        | Ut      | Publiserer varsel-hendelser på Kafka til esyfovarsel                              |

## Systemer

| System                                                                             | Ansvar                                                                                                                  |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [meroppfolging-frontend](https://github.com/navikt/meroppfolging-frontend)         | Viser informasjon om sen oppfølging, maksdato og skjemaet for den sykmeldte                                             |
| [meroppfolging-backend](https://github.com/navikt/meroppfolging-backend)           | Henter grunnlag fra Kafka, lagrer svar og eksponerer API-er for frontend og syfomodiaperson                             |
| [sykepengedager-informasjon](https://github.com/navikt/sykepengedager-informasjon) | Leverer informasjon om gjenstående sykepengedager via Kafka til backend og maksdato via API til frontend                |
| [esyfovarsel](https://github.com/navikt/esyfovarsel)                               | Lytter på Kafka-topicet `team-esyfo.varselbus` og sender notifikasjon og SMS                                            |
| [syfomodiaperson](https://github.com/navikt/syfomodiaperson)                       | Viser svarene til Nav-veileder i Modia                                                                                  |
| [ismeroppfolging](https://github.com/navikt/ismeroppfolging)                       | Konsumerer Kafka-topicet `team-esyfo.sen-oppfolging-svar` og bruker svarene i videre oppfølging av sykmeldte i sen fase |
