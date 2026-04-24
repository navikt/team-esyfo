# Team eSyfo

Dokumentasjon, verktøy og notebooks for Team eSyfo — ekstern sykefraværsoppfølging i Nav.

## Innhold

| Mappe | Beskrivelse |
|---|---|
| [`docs/`](docs/) | [Team eSyfo Wiki](https://navikt.github.io/team-esyfo/) — VitePress-basert wiki med onboarding, domene, systemlandskap og verktøy |
| [`notebooks/`](notebooks/) | Kotlin-notebooks for utforsking og analyse |
| [`tools/`](tools/) | Bruno API-samlinger for lokal testing |

## Kom i gang

Repoet bruker [mise](https://mise.jdx.dev/) for oppgaver og verktøyversjonering.

```sh
mise run wiki:dev    # Start wiki-utviklingsserver
mise run wiki:build  # Bygg wiki for produksjon
```

Se [`docs/README.md`](docs/README.md) for flere detaljer om wiki-oppsett.
