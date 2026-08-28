# Utvikling

Teamets teknologivalg og konvensjoner for frontend, backend og samarbeid. Her finner du oversikt over stacken vi bruker og hvordan vi jobber med kode.

I [repooversikt](repositories) for du en kort sammendrag hva slags repoer vi eier / jobber med.

## Håndbøker

Vi skal følge utviklerhåndbøker og ta i bruk beste praksis.

[Nais utvikler dokumentasjon](https://doc.nais.io) — plattform, deploy og infrastruktur

[Security Playbook](https://sikkerhet.nav.no) — sikkerhetskrav, bestepraksis, golden path

[Copilot i Nav](https://min-copilot.ansatt.nav.no) — KI-assisert utviling, oversikt av KI-bruk

## Seksjoner

<div class="sections-grid">

### 🖥️ [Frontend](./frontend/)

Next.js og Astro-baserte [microfrontends](/ordbok#microfrontend) hostet på [NAIS](/ordbok#nais). Biome for linting/formatering og Vitest for testing.

### ⚙️ [Backend](./backend/)

Kotlin-applikasjoner med Ktor og Spring Boot, deployed til NAIS-plattformen.

### 📋 [Beste praksis](./beste-praksis/pull-request)

Pull request-rutiner, GitHub Flow og konvensjoner for kodesamarbeid i teamet.

</div>

## Daglige plattformer

[Google Cloud Console](https://console.nav.cloud.nais.io/team/team-esyfo) — Oversikt over apper, deploy og ressurser i NAIS

[Bauta-rutiner i Slack](https://nav-it.slack.com/docs/T5LNAMWNA/F05QS0SG09F) — Vaktrutiner og beredskap

[Grafana: Team eSyfo – Feildrilldown](https://grafana.nav.cloud.nais.io/d/team-esyfo-error-drilldown/team-esyfo-e28093-feildrilldown?orgId=1&from=now-6h&to=now&timezone=browser&var-app=$__all&refresh=30s) — Felles inngang til runtime- og browserfeil i produksjon

[Grafana: Team eSyfo – ERROR logs](https://grafana.nav.cloud.nais.io/d/team-esyfo-error-summary/team-esyfo-error-logs?orgId=1&from=now-6h&to=now&timezone=browser&var-cluster=prod&var-team=team-esyfo&var-app=$__all&var-source=PEA2100DC89AE9FE2&var-ex_level=unknown&var-ex_level=info&var-ex_level=warn&var-fmt=%7C%20__error__%3D%22%22&var-search_regex=&var-search_message=&refresh=30s) — Eksisterende detaljert loggflate, beholdt mens den fortsatt er i bruk

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
