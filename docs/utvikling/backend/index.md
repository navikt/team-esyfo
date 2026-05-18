# Backend

I team eSYFO bruker vi **Kotlin** som hovedspråk for backend-utvikling, med [Ktor](https://ktor.io/) og [Spring Boot](https://spring.io/projects/spring-boot) som rammeverk.

Se [repo-oversikten](/utvikling/repositories) for en komplett liste over backend-repoer (filtrert med topic `backend`).

Arkitekturen er i stor grad basert på mikrotjenester, benytter DDD-prinsipper og vertikale lag (hver bounded context er en pakke/mappe som har services, DAOs etc. under seg).
Kafka er det primære kommunikasjonsmønsteret mellom tjenester, men vi har også noen REST-API-er.
Vi har besluttet å bruke inbox/outbox pattern for å bedre robustheten i tjenestene.

## API-testing med Bruno

Bruno-samlingen ligger i repoet under [`tools/bruno`](https://github.com/navikt/team-esyfo/tree/main/tools/bruno) og kan brukes til å teste kall mot relevante API-er og hjelpeverktøy.

### Typiske bruksområder

- utforske eksisterende requests og miljøoppsett
- teste integrasjoner lokalt
- dele nyttige kall mellom teammedlemmer
