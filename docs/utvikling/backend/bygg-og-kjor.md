# ▶️ Bygg og kjør lokalt

:::warning Forutsetninger
- Git og tilgang til relevante repoer i `navikt`.
- Java. Java 21 er vanligst i backend-repoene våre, men `sykepengedager-informasjon` bruker Java 17.
- [Docker](https://www.docker.com/) eller [Colima](https://github.com/abiosoft/colima) for repoer som starter lokale tjenester med compose eller Testcontainers.
- [Mise](https://mise.jdx.dev/) i repoer som har `mise`-oppsett. Ofte ligger konfigurasjonen i `.mise.toml`, ikke i `mise.toml`.
:::

## Kom i gang

Start med å lese README-en i repoet du skal jobbe i. Backend-repoene våre er ikke helt like:

- mange aktive backend-repoer har `mise`-oppsett
- mange Ktor-repoer har `docker-compose.yml`, ofte også en egen Kafka-compose-fil
- noen repoer krever lokale støttetjenester
- noen repoer er vanskelige å kjøre fullt lokalt på grunn av avhengigheter i NAIS

## Finn riktige kommandoer først

Ikke anta at alle repoer har samme tasks. Kjør heller:

```bash
mise tasks
```

Når du har funnet tasken du trenger, kjører du den slik:

```bash
mise run <task>
```

Vanlige tasks i backend-repoene er:

- `build`
- `start`
- `test`
- `lint`
- `format`
- `docker-up`
- `docker-down`

Noen repoer har også egne tasks for for eksempel `flyway-info`, `flyway-repair`, auth-hjelpere eller pre-commit hooks.

## Docker og Colima

Docker er vanlig i lokal backend-utvikling. Særlig Ktor-repoer bruker ofte compose-filer for databaser, Kafka eller andre lokale avhengigheter.

Colima er eksplisitt dokumentert i blant annet `esyfo-narmesteleder` og `syfo-oppfolgingsplan-backend`. Det betyr ikke at alle backend-repoer krever Colima, men det er et nyttig alternativ hvis du ikke bruker Docker Desktop.

Hvis repoet har compose-tasks, er mønsteret ofte:

```bash
mise run docker-up
mise run start
```

og når du er ferdig:

```bash
mise run docker-down
```

Sjekk alltid `mise tasks` og README i repoet før du starter.

## Praktiske forskjeller mellom repoer

- `aktivitetskrav-backend` dokumenterer at lokal kjøring kan være krevende uten NAIS-avhengigheter.
- `syfomotebehov` bruker en lokal Spring-profil i `mise`.
- `dinesykmeldte-backend`, `esyfo-narmesteleder` og `syfo-oppfolgingsplan-backend` har tydelige tasks for lokal oppstart, testing og Docker-støtte.
