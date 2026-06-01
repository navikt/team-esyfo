# Aktivitetskrav — teknisk oversikt

Aktivitetskrav-systemet mottar vurderinger fra iSyfo, lagrer dem i aktivitetskrav-backend, varsler den sykmeldte og viser status i [microfrontend](/ordbok#microfrontend) og frontend.

## Dataflyt

### 1. Vurdering og lagring

```mermaid
sequenceDiagram
    participant isak as isaktivitetskrav<br/>(team iSyfo)
    participant vurderingtopic as «Kafka»<br/>aktivitetskrav-vurdering
    participant varseltopic as «Kafka»<br/>aktivitetskrav-varsel
    participant backend as aktivitetskrav-backend
    participant db as PostgreSQL
    participant varselbus as «Kafka»<br/>team-esyfo.varselbus

    isak->>vurderingtopic: publiserer vurdering
    backend-->>vurderingtopic: lytter
    isak->>varseltopic: publiserer forhåndsvarsel
    backend-->>varseltopic: lytter
    backend->>db: lagrer vurdering og varsel
    backend->>varselbus: publiserer SM_AKTIVITETSPLIKT
```

### 2. Varsling og Min side

```mermaid
sequenceDiagram
    participant varselbus as «Kafka»<br/>team-esyfo.varselbus
    participant esyfovarsel as esyfovarsel
    participant micro as esyfo-microfrontends<br/>(Min side)
    participant backend as aktivitetskrav-backend
    actor bruker as Den sykmeldte

    esyfovarsel-->>varselbus: lytter
    esyfovarsel->>bruker: sender notifikasjon og SMS
    esyfovarsel->>micro: aktiverer microfrontend
    micro->>backend: henter gjeldende status
    Note right of micro: OBO-token mot backend
    bruker->>micro: ser status på Min side
```

### 3. Detaljer og historikk

```mermaid
sequenceDiagram
    actor bruker as Den sykmeldte
    participant frontend as aktivitetskrav-frontend
    participant backend as aktivitetskrav-backend
    participant db as PostgreSQL

    bruker->>frontend: åpner /syk/aktivitetskrav
    Note right of frontend: TokenX-autentisering
    frontend->>backend: henter historikk
    frontend->>backend: markerer som lest
    backend->>db: leser og oppdaterer data
```

### 4. Status til veileder

```mermaid
sequenceDiagram
    actor veileder as Nav-veileder
    participant modia as syfomodiaperson<br/>(team iSyfo)
    participant backend as aktivitetskrav-backend

    veileder->>modia: åpner sykefraværsoppfølging
    modia->>backend: henter aktivitetskrav-status
    Note right of modia: Azure AD API
    backend-->>modia: returnerer status
    modia-->>veileder: viser aktivitetskrav-status
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
