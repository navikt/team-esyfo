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

## Testrammeverk

[Kotest](https://kotest.io/) er standardbibliotek for våre backendrepoene.

- [MockK](https://mockk.io/)
- [Testcontainers](https://testcontainers.com/)


## Når trenger du Docker eller Colima?

Mange tester starter containere for database, Kafka eller andre avhengigheter. Da må Docker-miljøet ditt kjøre først, enten via Docker Desktop eller Colima.

Hvis tester feiler lokalt uten tydelig kodefeil, er det ofte lurt å sjekke:

- om Docker eller Colima kjører
- om repoet forventer lokale containere via compose
- om testene bruker Testcontainers
