# Testing

Testoppsettet i backend er ganske likt på tvers av repoene, men ikke helt likt. Bruk derfor `mise tasks` som startpunkt, og kjør test-tasken repoet faktisk har.

## Vanlige testkommandoer

Det vanligste mønsteret er:

```bash
mise run test
```

Noen repoer har også:

```bash
mise run verify
```

`verify` er eksplisitt dokumentert i `aktivitetskrav-backend`. I mange andre repoer er mønsteret heller å kjøre `test` og `lint` hver for seg.

## Testrammeverk

[Kotest](https://kotest.io/) er standardmønsteret i de fleste aktive backend-repoene våre. Det brukes ofte sammen med:

- [MockK](https://mockk.io/)
- [Testcontainers](https://testcontainers.com/)

Det finnes også viktige avvik:

- `esyfo-token-tjeneste` bruker JUnit 5 og MockOAuth2Server
- `syfo-dokumentporten` bruker Kotlin test og MockK i stedet for Kotest i build-filen som ble kartlagt
- noen Spring Boot-repoer kombinerer Kotest med JUnit 5 eller auth-tester

Kort sagt: forvent Kotest, men verifiser i build-filen før du skriver ny testkode.

## Når trenger du Docker eller Colima?

Mange tester starter containere for database, Kafka eller andre avhengigheter. Da må Docker-miljøet ditt kjøre først, enten via Docker Desktop eller Colima.

Hvis tester feiler lokalt uten tydelig kodefeil, er det ofte lurt å sjekke:

- om Docker eller Colima kjører
- om repoet forventer lokale containere via compose
- om testene bruker Testcontainers

## Praktiske eksempler

- `dinesykmeldte-backend`, `esyfo-narmesteleder` og `syfo-oppfolgingsplan-backend` følger et vanlig mønster med Kotest, MockK og Testcontainers.
- `syfomotebehov` kombinerer Kotest, JUnit 5, MockK, Testcontainers og MockOAuth2Server.
- `aktivitetskrav-backend` har egne `mise`-tasks for både `test` og `verify`.
