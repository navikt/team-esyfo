# Nærmeste leder

Nærmeste leder-løsningen håndterer relasjoner mellom sykmeldt og nærmeste leder. Målene er:

- **Motta nye relasjoner** fra eksisterende metoder (Altinn, sykmelding, narmesteleder-app)
- **Ta imot relasjoner fra frontender/LPS** i vår app og sende tilbake
- **Kunne kutte koblingen** til dagens system når alle avhengigheter er over

## Dataflyt

```mermaid
sequenceDiagram
    participant LPS as LPS
    participant esyfo as esyfo-narmesteleder<br/>(team-esyfo)
    participant DB as Database
    participant t_nl as «Kafka»<br/>syfo-narmesteleder
    participant t_leesah as «Kafka»<br/>syfo-narmesteleder-leesah
    participant t_sm as «Kafka»<br/>syfo-sendt-sykmelding
    participant nl as narmesteleder<br/>(team-sykmelding)
    participant altinn as syfonlaltinn<br/>(team-sykmelding)

    rect rgb(240, 248, 255)
    Note over altinn,esyfo: Kafka-flyt inn

    altinn->>t_nl: publish
    nl-->>t_nl: consume
    activate nl
    nl->>t_leesah: publish
    deactivate nl
    esyfo-->>t_leesah: consume
    esyfo-->>t_sm: consume
    esyfo->>DB: Lagrer NL-relasjon
    end

    rect rgb(255, 248, 240)
    Note over LPS,esyfo: LPS-flyt ut

    LPS->>esyfo: POST /api/narmesteleder
    esyfo->>DB: Lagrer NL-relasjon
    esyfo->>t_nl: publish
    Note right of esyfo: Publiserer NL-relasjoner<br/>fra LPS tilbake til felles topic
    end
```

::: warning Avvik fra opprinnelig design
- **`nl-republisher`** ble aldri implementert — komponenten finnes ikke i noe repo.
- **Topic-prefikser** er korrigert fra `esfo-` til `teamsykmelding.syfo-*`.
- **`syfo-sendt-sykmelding`** er tillagt — `esyfo-narmesteleder` konsumerer dette topicet, men det var ikke med i det opprinnelige diagrammet.
:::
