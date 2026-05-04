# Kartleggingsspørsmål — teknisk oversikt

Kartleggingsspørsmål-systemet identifiserer sykmeldte som kvalifiserer for kartlegging, varsler dem, presenterer et spørreskjema og gjør svarene tilgjengelige for Nav-veileder.

## Dataflyt

```mermaid
sequenceDiagram
    participant ismo as ismeroppfolging<br/>(team sykefravær)
    participant varselbus as «Kafka»<br/>team-esyfo.varselbus
    participant esyfovarsel as esyfovarsel
    participant bruker as Den sykmeldte
    participant micro as esyfo-microfrontends<br/>(Min side)
    participant bro as bro-frontend
    participant backend as meroppfolging-backend
    participant db as PostgreSQL
    participant svartopic as «Kafka»<br/>team-esyfo.kartleggingssporsmal-svar
    participant modia as syfomodiaperson<br/>(team sykefravær)

    rect rgb(240, 248, 255)
    Note over ismo,esyfovarsel: Kandidatvurdering og varsling

    ismo->>varselbus: SM_KARTLEGGINGSSPORSMAL hendelse
    esyfovarsel-->>varselbus: consume
    esyfovarsel->>bruker: OPPGAVE-notifikasjon + SMS
    end

    rect rgb(248, 255, 240)
    Note over bruker,backend: Besvarelse

    esyfovarsel->>micro: Aktiverer microfrontend (meroppfølging-widget)
    micro->>backend: Henter kandidat-status (on load)
    bruker->>micro: Ser kartleggings-widget på Min side
    micro->>bro: Klikker videre til skjema
    Note right of bro: TokenX-autentisering
    bro->>backend: Sender svar
    backend->>db: Lagrer svar
    end

    rect rgb(255, 248, 240)
    Note over backend,modia: Svar til veileder

    backend->>svartopic: Publiserer svar
    modia-->>svartopic: consume
    Note right of modia: Azure AD API
    end
```

## Kafka-topics

| Topic | Retning | Beskrivelse |
|-------|---------|-------------|
| `team-esyfo.varselbus` | Inn | Mottar `SM_KARTLEGGINGSSPORSMAL`-hendelser fra ismeroppfolging |
| `team-esyfo.kartleggingssporsmal-svar` | Ut | Publiserer kartleggingssvar til syfomodiaperson |

## Systemer

| System | Ansvar |
|--------|--------|
| [ismeroppfolging](https://github.com/navikt/ismeroppfolging) | Vurderer kandidat-status (eid av team sykefravær) |
| [esyfovarsel](https://github.com/navikt/esyfovarsel) | Sender brukernotifikasjon og SMS |
| [esyfo-microfrontends](https://github.com/navikt/esyfo-microfrontends) | Viser kartleggings-widget på Min side |
| [bro-frontend](https://github.com/navikt/bro-frontend) | Kartleggingsskjema (TokenX-autentisert) |
| [meroppfolging-backend](https://github.com/navikt/meroppfolging-backend) | Lagrer svar og publiserer til Kafka |
| [syfomodiaperson](https://github.com/navikt/syfomodiaperson) | Viser svar til Nav-veileder (eid av team sykefravær) |
| [Lumi](https://aksel.nav.no/komponenter/lumi-survey) | Tilbakemeldingswidget for brukerundersøkelser |

## API-dokumentasjon

Se README i de respektive repoene for API-endepunkter:

- [meroppfolging-backend](https://github.com/navikt/meroppfolging-backend)
- [bro-frontend](https://github.com/navikt/bro-frontend)
