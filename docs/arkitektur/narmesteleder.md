# Nærmeste leder — arkitekturnotater

<!-- UTREDNING: Disse notatene er resultatet av verifisering av PlantUML-diagrammet
     fra esyfo-dev-tools.wiki. Brukes som grunnlag for Mermaid-konvertering i neste fase. -->

## Funn fra verifisering (fase 2g)

### Repos — status

| Repository | Status | Eier |
|---|---|---|
| `esyfo-narmesteleder` | ✅ Aktiv | team-esyfo |
| `narmesteleder` | ✅ Aktiv | team-sykmelding |
| `syfonlaltinn` | ✅ Aktiv | team-sykmelding |
| `nl-republisher` / `nl-replublisher` | ❌ Finnes ikke | — |

### Kafka-topics — faktiske navn

Alle topics har `teamsykmelding.`-prefiks:

| Topic i diagram | Faktisk topic-navn | Merknad |
|---|---|---|
| `esfo-narmesteleder` | `teamsykmelding.syfo-narmesteleder` | ⚠️ Feil prefiks i diagram (`esfo-` → `syfo-`) |
| `esfo-narmesteleder-leesah` | — | ❌ Finnes ikke som eget topic |
| `syfo-narmesteleder` | `teamsykmelding.syfo-narmesteleder` | ✅ Korrekt (med prefiks) |
| `syfo-narmesteleder-leessah` | `teamsykmelding.syfo-narmesteleder-leesah` | ⚠️ Skrivefeil: «leessah» → «leesah» |

### Faktisk flyt (verifisert fra kildekode)

```
syfonlaltinn (team-sykmelding / Altinn2)
  → publiserer til: teamsykmelding.syfo-narmesteleder

narmesteleder (team-sykmelding)
  → konsumerer: teamsykmelding.syfo-narmesteleder
  → publiserer: teamsykmelding.syfo-narmesteleder-leesah

esyfo-narmesteleder (team-esyfo API)
  → konsumerer: teamsykmelding.syfo-narmesteleder-leesah
  → konsumerer: teamsykmelding.syfo-sendt-sykmelding
  → publiserer: teamsykmelding.syfo-narmesteleder (NL-relasjoner fra LPS)
```

### Avvik fra PlantUML-diagram

1. **`nl-replublisher` finnes ikke** — komponenten er aldri opprettet, eller fjernet. Flyten den skulle ivareta (republisere fra leesah til esyfo-topic) ser ut til å ikke være implementert.
2. **Topic-prefiks feil** — diagrammet bruker `esfo-` men faktisk prefiks er `teamsykmelding.syfo-`.
3. **Skrivefeil** — `leessah` i diagrammet skal være `leesah`.
4. **Nytt topic** — `esyfo-narmesteleder` konsumerer også `teamsykmelding.syfo-sendt-sykmelding` (ikke i diagrammet).

### Anbefaling for Mermaid-konvertering (neste fase)

- Fjern `nl-replublisher` fra diagrammet
- Korriger alle topic-navn til faktiske verdier med `teamsykmelding.`-prefiks
- Legg til `syfo-sendt-sykmelding`-topic som kilde for `esyfo-narmesteleder`
- Marker flyten som «designforslag» der den avviker fra det som faktisk er implementert
