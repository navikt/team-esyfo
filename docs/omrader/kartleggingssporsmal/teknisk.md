# Kartleggingsspørsmål — teknisk oversikt

Kartleggingsspørsmål-systemet identifiserer sykmeldte som kvalifiserer for kartlegging, varsler dem, presenterer et spørreskjema og gjør svarene tilgjengelige for Nav-veileder.

## Dataflyt

### 1. Kandidatvurdering og varsling

```mermaid
sequenceDiagram
    participant ismo as ismeroppfolging<br/>(team iSyfo)
    participant varselbus as «Kafka»<br/>team-esyfo.varselbus
    participant esyfovarsel as esyfovarsel
    actor bruker as Den sykmeldte

    ismo->>varselbus: SM_KARTLEGGINGSSPORSMAL hendelse
    esyfovarsel-->>varselbus: lytter
    esyfovarsel->>bruker: OPPGAVE-notifikasjon + SMS
```

### 2. Besvarelse

```mermaid
sequenceDiagram
    participant esyfovarsel as esyfovarsel
    actor bruker as Den sykmeldte
    participant micro as esyfo-microfrontends<br/>(Min side)
    participant bro as bro-frontend
    participant backend as meroppfolging-backend
    participant db as PostgreSQL

    esyfovarsel->>micro: Aktiverer microfrontend (meroppfølging-widget)
    micro->>backend: Henter kandidatstatus (ved lasting)
    bruker->>micro: Ser kartleggings-widget på Min side
    micro->>bro: Klikker videre til skjema
    Note right of bro: TokenX-autentisering
    bro->>backend: Sender svar
    backend->>db: Lagrer svar
```

### 3. Svar til veileder

```mermaid
sequenceDiagram
    participant backend as meroppfolging-backend
    participant svartopic as «Kafka»<br/>kartleggingssporsmal-svar
    participant modia as syfomodiaperson<br/>(team iSyfo)
    actor veileder as Nav-veileder

    backend->>svartopic: Publiserer svar
    modia-->>svartopic: lytter
    Note right of modia: Azure AD API
    modia-->>veileder: viser kartleggingssvar
```

## Kafka-topics

| Topic                                  | Retning | Beskrivelse                                                    |
| -------------------------------------- | ------- | -------------------------------------------------------------- |
| `team-esyfo.varselbus`                 | Inn     | Mottar `SM_KARTLEGGINGSSPORSMAL`-hendelser fra ismeroppfolging |
| `team-esyfo.kartleggingssporsmal-svar` | Ut      | Publiserer kartleggingssvar til syfomodiaperson                |

## Systemer

| System                                                                   | Ansvar                                          |
| ------------------------------------------------------------------------ | ----------------------------------------------- |
| [ismeroppfolging](https://github.com/navikt/ismeroppfolging)             | Vurderer kandidatstatus (eid av team iSyfo)     |
| [esyfovarsel](https://github.com/navikt/esyfovarsel)                     | Sender brukernotifikasjon og SMS                |
| [esyfo-microfrontends](https://github.com/navikt/esyfo-microfrontends)   | Viser kartleggings-widget på Min side           |
| [bro-frontend](https://github.com/navikt/bro-frontend)                   | Kartleggingsskjema (TokenX-autentisert)         |
| [meroppfolging-backend](https://github.com/navikt/meroppfolging-backend) | Lagrer svar og publiserer til Kafka             |
| [syfomodiaperson](https://github.com/navikt/syfomodiaperson)             | Viser svar til Nav-veileder (eid av team iSyfo) |
