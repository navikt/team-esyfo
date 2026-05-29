# Backend

I team eSYFO er backend-repoene våre Kotlin-applikasjoner. De fleste bruker [Ktor](https://ktor.io/), og noen bruker [Spring Boot](https://spring.io/projects/spring-boot). Java 21 er vanligst, men det finnes avvik.

Se [repo-oversikten](/utvikling/repositories) for aktive backendrepoer og eierskap.

🚀 [Bygg og kjør lokalt](./bygg-og-kjor) — Kom i gang med mise, Docker og Colima

🧪 [Testing](./testing) — Hvordan vi vanligvis kjører tester, og hvilke unntak som finnes

🧹 [Linting og formatering](./linting) — Ktlint er vanligst, men ikke eneste variant

🛠️ [Backend-verktøy](./verktoy) — IntelliJ, Bruno, k9s og andre nyttige hjelpemidler

## API-testing med Bruno

Bruno-samlingen ligger i repoet under [`tools/bruno`](https://github.com/navikt/team-esyfo/tree/main/tools/bruno).

Bruk Bruno når du vil:

- utforske eksisterende requests og miljøoppsett
- teste integrasjoner lokalt
- dele nyttige kall mellom teammedlemmer

Se [Backend-verktøy](./verktoy#bruno) for kort oppsett og lenker videre.
