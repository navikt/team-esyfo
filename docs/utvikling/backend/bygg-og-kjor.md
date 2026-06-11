# ▶️ Bygg og kjør lokalt

:::warning Forutsetninger
- Git og tilgang til relevante repoer i `navikt`.
- Java. Java 21 er vanligst i backend-repoene våre, men `sykepengedager-informasjon` bruker Java 17.
- [Docker](https://www.docker.com/) eller [Colima](https://github.com/abiosoft/colima) for repoer som starter lokale tjenester med compose eller Testcontainers.
- Nesten alle repoer har [Mise](https://mise.jdx.dev/) oppsett.
:::

## Kom i gang

Start med å lese README-en i repoet du skal jobbe i. Backend-repoene våre er ikke helt like:

- mange aktive backend-repoer har `mise`-oppsett
- mange Ktor-repoer har `docker-compose.yml`, ofte også en egen Kafka-compose-fil
- noen repoer krever lokale støttetjenester
- noen repoer er vanskelige å kjøre fullt lokalt på grunn av avhengigheter i [NAIS](/ordbok#nais)

## Finn riktige kommandoer først

Ikke anta at alle repoer har samme tasks. Kjør heller:

```bash
mise tasks
```

Når du har funnet tasken du trenger, kjører du den slik:

```bash
mise run <task>
```

Noen repoer har også egne tasks for eksempel `flyway-info`, `flyway-repair`, auth-hjelpere eller pre-commit hooks.

## Docker og Colima

Docker er vanlig i lokal backend-utvikling. Særlig Ktor-repoer bruker ofte compose-filer for databaser, Kafka eller andre lokale avhengigheter.

Colima er eksplisitt dokumentert i blant annet `esyfo-narmesteleder` og `syfo-oppfolgingsplan-backend`. Det betyr ikke at alle backend-repoer krever Colima, men det er et nyttig alternativ hvis du ikke bruker Docker Desktop.

Beste konfigurasjon for å starte Colima som funker i alle backendrepoer:

```bash
colima start --arch aarch64 --memory 8 --cpu 4

# Why you need to do this: Colima creates ~/.colima/default/docker.sock when it starts. If you create the symlink before Colima is running, the target may not exist yet.
sudo rm -f /var/run/docker.sock
sudo ln -s "$HOME/.colima/default/docker.sock" /var/run/docker.sock
```
