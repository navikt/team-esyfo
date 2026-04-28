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
    participant nl as narmesteleder<br/>(team-sykmelding)
    participant altinn as syfonlaltinn<br/>(team-sykmelding)

    Note over esyfo,altinn: Kafka-topics med teamsykmelding.*-prefiks

    altinn->>nl: syfo-narmesteleder
    activate nl
    nl->>esyfo: syfo-narmesteleder-leesah
    deactivate nl

    esyfo->>DB: Lagrer NL-relasjon
    esyfo-->>esyfo: syfo-sendt-sykmelding (konsumerer)

    LPS->>esyfo: POST /api/narmesteleder
    esyfo->>DB: Lagrer NL-relasjon
    esyfo->>nl: syfo-narmesteleder
    Note right of esyfo: Publiserer NL-relasjoner<br/>fra LPS tilbake til felles topic
```

::: warning Avvik fra opprinnelig design
- **`nl-republisher`** ble aldri implementert — komponenten finnes ikke i noe repo.
- **Topic-prefikser** er korrigert fra `esfo-` til `teamsykmelding.syfo-*`.
- **`syfo-sendt-sykmelding`** er tillagt — `esyfo-narmesteleder` konsumerer dette topicet, men det var ikke med i det opprinnelige diagrammet.
:::
