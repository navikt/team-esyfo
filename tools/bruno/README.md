# Bruno – esyfo-dev-tools

API-samling for lokal testing mot Maskinporten og Altinn Dialogporten.

## Innhold

| Mappe                  | Beskrivelse                           |
| ---------------------- | ------------------------------------- |
| `maskinporten/`        | Token-henting via JWT-bearer grant    |
| `altinn/auth/`         | Systemregistrering og systembrukere   |
| `altinn/dialogporten/` | Opprette, hente og oppdatere dialoger |

## Kom i gang

1. [Last ned Bruno](https://www.usebruno.com/downloads)
2. **Open Collection** → velg denne mappen (`tools/bruno`)
3. Velg miljø øverst til høyre (`altinn` eller `maskinporten`)
4. Fyll inn hemmeligheter — de lagres kun lokalt og committes aldri

## Miljøer

| Miljø          | Fil                             | Bruksområde       |
| -------------- | ------------------------------- | ----------------- |
| `altinn`       | `environments/altinn.bru`       | Dialogporten TT02 |
| `maskinporten` | `environments/maskinporten.bru` | Token-generering  |

## Mer informasjon

Se [Bruno-wikisiden](https://navikt.github.io/team-esyfo/bruno) for detaljert oversikt over alle requests.
