# Linting

Kotlin-backendene våre har som regel egne tasks for linting og ofte også formatering. Start med å sjekke hvilke tasks som finnes i repoet ditt:

```bash
mise tasks
```

Vanlige kommandoer er:

```bash
mise run lint
mise run format
```

## Hva brukes i praksis?

[Ktlint](https://pinterest.github.io/ktlint/latest/) er vanligst i backend-repoene våre. Det er standardmønsteret i mange Ktor- og Spring Boot-repoer.

Det finnes likevel avvik:

- `oppfolgingsplan-backend` bruker Detekt
- `syfobrukertilgang` bruker Detekt
- `lps-oppfolgingsplan-mottak` bruker både ktlint og Spotless

Skriv derfor ikke nye regler eller scripts uten å sjekke hva repoet allerede bruker.

## Praktisk råd

- Kjør `lint` før du pusher når repoet har en egen lint-task.
- Kjør `format` hvis repoet tilbyr det.
- La repoets eksisterende verktøy styre stilen. Ikke innfør ktlint eller Detekt som om det var universelt i teamet.

## Eksempel på vanlig flyt

I repoer med fullt `mise`-oppsett er denne flyten vanlig:

```bash
mise run lint
mise run test
```

eller, der det finnes:

```bash
mise run verify
```
