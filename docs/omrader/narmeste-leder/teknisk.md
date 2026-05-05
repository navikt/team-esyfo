# Nærmeste leder — teknisk oversikt

Nærmeste leder-løsningen håndterer relasjoner mellom sykmeldt og nærmeste leder. Målene er:

- **Motta nye relasjoner** fra eksisterende metoder (Altinn, sykmelding, narmesteleder-app)
- **Ta imot relasjoner fra frontender/LPS** i vår app og sende tilbake
- **Kunne kutte koblingen** til dagens system når alle avhengigheter er over

## Dataflyt

### 1. Kafka-flyt inn

```mermaid
sequenceDiagram
    participant altinn as syfonlaltinn<br/>(team-sykmelding)
    participant t_nl as «Kafka»<br/>syfo-narmesteleder
    participant nl as narmesteleder<br/>(team-sykmelding)
    participant t_leesah as «Kafka»<br/>syfo-narmesteleder-leesah
    participant t_sm as «Kafka»<br/>syfo-sendt-sykmelding
    participant esyfo as esyfo-narmesteleder<br/>(team-esyfo)
    participant db as Database

    altinn->>t_nl: publiserer
    nl-->>t_nl: lytter
    activate nl
    nl->>t_leesah: publiserer
    deactivate nl
    esyfo-->>t_leesah: lytter
    esyfo-->>t_sm: lytter
    esyfo->>db: lagrer NL-relasjon
```

### 2. LPS-flyt ut

```mermaid
sequenceDiagram
    participant LPS as LPS
    participant esyfo as esyfo-narmesteleder<br/>(team-esyfo)
    participant db as Database
    participant t_nl as «Kafka»<br/>syfo-narmesteleder

    LPS->>esyfo: POST /api/narmesteleder
    esyfo->>db: lagrer NL-relasjon
    esyfo->>t_nl: publiserer
    Note right of esyfo: Publiserer NL-relasjoner<br/>fra LPS tilbake til felles topic
```

::: warning Avvik fra opprinnelig design
- **`nl-republisher`** ble aldri implementert — komponenten finnes ikke i noe repo.
- **Topic-prefikser** er korrigert fra `esfo-` til `teamsykmelding.syfo-*`.
- **`syfo-sendt-sykmelding`** er tillagt — `esyfo-narmesteleder` konsumerer dette topicet, men det var ikke med i det opprinnelige diagrammet.
:::
