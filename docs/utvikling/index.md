# Utvikling

Teamets teknologivalg og konvensjoner for frontend, backend og samarbeid. Her finner du oversikt over stacken vi bruker og hvordan vi jobber med kode.

## Håndbøker

Utviklerhåndbøker vi skal følge med og ta i bruk bestepraksis.

[Nais utvikler dokumentasjon](https://doc.nais.io)

[Security Playbook](https://sikkerhet.nav.no)

[Copilot i Nav](https://min-copilot.ansatt.nav.no)

## Seksjoner

<div class="sections-grid">

### 🖥️ [Frontend](./frontend/)

Next.js og Astro-baserte microfrontends hostet på NAIS. Biome for linting/formatering og Vitest for testing.

### ⚙️ [Backend](./backend/)

Kotlin-applikasjoner med Ktor og Spring Boot, deployed til NAIS-plattformen.

### 📋 [Beste praksis](./beste-praksis/pull-request)

Pull request-rutiner, GitHub Flow og konvensjoner for kodesamarbeid i teamet.

## Daglige platformer

- [Google Cloud Console — eSYFO](https://console.nav.cloud.nais.io/team/team-esyfo) — Oversikt over apper, deploy og ressurser i NAIS
-
- [Bauta-rutiner i Slack](https://nav-it.slack.com/docs/T5LNAMWNA/F05QS0SG09F) — Vaktrutiner og beredskap
-
- [Grafana-dashboard eSYFO](https://grafana.nav.cloud.nais.io/d/eeivq822edhj4c/esyfo3a-error-summary?orgId=1&from=now-1h&to=now&timezone=browser&var-env=PD969E40991D5C4A8&var-selectedService=All&refresh=auto) — Feil og ytelse i sanntid
-
- [GitHub-repoer for team eSYFO](https://github.com/orgs/navikt/teams/team-esyfo/repositories) — Alle repoer teamet har tilgang til og enten har admin- eller lesetilgang.

</div>

<style>
.sections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}
.sections-grid h3 {
  margin-top: 0;
}
.sections-grid h3 a {
  text-decoration: none;
}
</style>
