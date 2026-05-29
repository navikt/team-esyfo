# Backend-verktøy

Her er verktøy som ofte er nyttige i backend-arbeid i team eSYFO. Noen er godt dokumentert i repoene våre, andre er mer team- og plattformnære hjelpemidler.

## IntelliJ

IntelliJ er det mest naturlige valget for Kotlin-backend i teamet.

Repoene våre dokumenterer litt ulike tillegg:

- `lps-oppfolgingsplan-mottak` anbefaler IDEA-pluginene for Detekt og Kotest
- `syfo-oppfolgingsplan-backend` har HTTP Client-filer for kall direkte fra IntelliJ
- `syfo-oppfolgingsplan-backend` nevner også remote debug i IntelliJ

Bruk derfor repoet som fasit for hvilke plugins eller filer som faktisk er relevante der du jobber.

## Bruno

Bruno-samlingen i dette repoet ligger under [`tools/bruno`](https://github.com/navikt/team-esyfo/tree/main/tools/bruno).

Bruno er nyttig når du vil:

- kjøre API-kall manuelt
- teste integrasjoner lokalt
- dele request-oppsett i teamet uten å commite hemmeligheter

Se også:

- [Bruno-kolleksjonen i repoet](https://github.com/navikt/team-esyfo/tree/main/tools/bruno)
- [README for Bruno-kolleksjonen](https://github.com/navikt/team-esyfo/blob/main/tools/bruno/README.md)

## k9s

[k9s](https://k9scli.io/) ble ikke funnet dokumentert i backend-repoene som ble kartlagt, men det er fortsatt et nyttig verktøy for arbeid i NAIS og Kubernetes.

Bruk k9s når du vil:

- se pods, logger og ressurser raskt
- følge med på deploy eller feilsøke lokalt mot et miljø
- hoppe mellom namespace uten mange `kubectl`-kommandoer

Behandle derfor k9s som et nyttig team- og plattformverktøy, ikke som et krav i hvert repo.

## Andre nyttige mønstre

- `mise` er vanlig for å samle lokale tasks
- Docker eller Colima er ofte nødvendig når repoet bruker compose eller Testcontainers
- noen repoer har egne hjelpe-tasks for auth eller Flyway
