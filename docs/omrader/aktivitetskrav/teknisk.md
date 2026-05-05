# Aktivitetskrav — teknisk oversikt

Aktivitetskrav-systemet mottar vurderinger fra iSyfo, lagrer dem i aktivitetskrav-backend, varsler den sykmeldte og viser status i microfrontend og frontend.

## Dataflyt

```mermaid
sequenceDiagram
    participant isak as isaktivitetskrav<br/>(team iSyfo)
    participant vurderingtopic as «Kafka»<br/>teamsykefravr.aktivitetskrav-vurdering
    participant varseltopic as «Kafka»<br/>teamsykefravr.aktivitetskrav-varsel
    participant backend as aktivitetskrav-backend
    participant db as PostgreSQL
    participant varselbus as «Kafka»<br/>team-esyfo.varselbus
    participant esyfovarsel as esyfovarsel
    participant micro as esyfo-microfrontends<br/>(Min side)
    participant frontend as aktivitetskrav-frontend
    participant bruker as Den sykmeldte
    participant modia as syfomodiaperson<br/>(team iSyfo)

    rect rgb(240, 248, 255)
    Note over isak,db: Vurdering og lagring

    isak->>vurderingtopic: publiserer vurdering
    backend-->>vurderingtopic: lytter
    isak->>varseltopic: publiserer forhåndsvarsel
    backend-->>varseltopic: lytter
    backend->>db: lagrer vurdering og varsel
    backend->>varselbus: publiserer SM_AKTIVITETSPLIKT
    end

    rect rgb(248, 255, 240)
    Note over esyfovarsel,micro: Varsling og Min side

    esyfovarsel-->>varselbus: lytter
    esyfovarsel->>bruker: sender notifikasjon og SMS
    esyfovarsel->>micro: aktiverer microfrontend
    micro->>backend: henter gjeldende status
    Note right of micro: OBO-token mot backend
    bruker->>micro: ser status på Min side
    end

    rect rgb(255, 248, 240)
    Note over bruker,db: Detaljer og historikk

    bruker->>frontend: åpner /syk/aktivitetskrav
    Note right of frontend: TokenX-autentisering
    frontend->>backend: henter historikk
    frontend->>backend: markerer som lest
    backend->>db: leser og oppdaterer data
    end

    rect rgb(255, 240, 248)
    Note over backend,modia: Status til veileder

    modia->>backend: henter aktivitetskrav-status
    Note right of modia: Azure AD API
    end
```

## Kafka-topics

| Topic | Retning | Beskrivelse |
|-------|---------|-------------|
| `teamsykefravr.aktivitetskrav-vurdering` | Inn | Mottar vurderingshendelser fra isaktivitetskrav |
| `teamsykefravr.aktivitetskrav-varsel` | Inn | Mottar forhåndsvarsel om stans av sykepenger |
| `team-esyfo.varselbus` | Ut | Publiserer `SM_AKTIVITETSPLIKT`-hendelser for visning og varsling |

## Systemer

| System | Ansvar |
|--------|--------|
| [isaktivitetskrav](https://github.com/navikt/isaktivitetskrav) | Vurderer aktivitetskrav og publiserer hendelser |
| [aktivitetskrav-backend](https://github.com/navikt/aktivitetskrav-backend) | Lagrer vurderinger og varsler, eksponerer API og publiserer til varselbussen |
| [esyfovarsel](https://github.com/navikt/esyfovarsel) | Sender brukernotifikasjon og styrer synlighet av microfrontend |
| [esyfo-microfrontends](https://github.com/navikt/esyfo-microfrontends) | Viser widget på Min side. Panelet vises ikke ved status `IKKE_OPPFYLT` |
| [aktivitetskrav-frontend](https://github.com/navikt/aktivitetskrav-frontend) | Viser historikk og detaljer for den sykmeldte |
| [syfomodiaperson](https://github.com/navikt/syfomodiaperson) | Viser aktivitetskrav-status til Nav-veileder |
