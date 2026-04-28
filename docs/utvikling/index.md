# Utvikling

Teamets teknologivalg og konvensjoner for frontend, backend og samarbeid. Her finner du oversikt over stacken vi bruker og hvordan vi jobber med kode.

## Håndbøker

Vi skal følge utviklerhåndbøker og ta i bruk beste praksis.

[Nais utvikler dokumentasjon](https://doc.nais.io) — plattform, deploy og infrastruktur

[Security Playbook](https://sikkerhet.nav.no) — sikkerhetskrav, bestepraksis, golden path

[Copilot i Nav](https://min-copilot.ansatt.nav.no) — KI-assisert utviling, oversikt av KI-bruk

## Seksjoner

<div class="sections-grid">

### 🖥️ [Frontend](./frontend/)

Next.js og Astro-baserte microfrontends hostet på NAIS. Biome for linting/formatering og Vitest for testing.

### ⚙️ [Backend](./backend/)

Kotlin-applikasjoner med Ktor og Spring Boot, deployed til NAIS-plattformen.

### 📋 [Beste praksis](./beste-praksis/pull-request)

Pull request-rutiner, GitHub Flow og konvensjoner for kodesamarbeid i teamet.

</div>

## Daglige plattformer

[Google Cloud Console](https://console.nav.cloud.nais.io/team/team-esyfo) — Oversikt over apper, deploy og ressurser i NAIS

[Bauta-rutiner i Slack](https://nav-it.slack.com/docs/T5LNAMWNA/F05QS0SG09F) — Vaktrutiner og beredskap

[Grafana-dashboard](https://grafana.nav.cloud.nais.io/d/eeivq822edhj4c/esyfo3a-error-summary?orgId=1&from=now-1h&to=now&timezone=browser&var-env=PD969E40991D5C4A8&var-selectedService=All&refresh=auto) — Feil og ytelse i sanntid

[GitHub-repoer for team eSyfo](https://github.com/orgs/navikt/teams/team-esyfo/repositories) — Alle repoer teamet har tilgang til

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
