# Repositories

Oversikt over alle repoer som Team eSyfo eier og vedlikeholder, gruppert etter type.

<style>
.repo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin: 24px 0;
}
.repo-card {
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  padding: 20px;
  background: var(--vp-c-bg-soft);
  transition: border-color 0.25s, box-shadow 0.25s;
}
.repo-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.repo-card h4 {
  margin: 0 0 8px 0;
  font-size: 1rem;
}
.repo-card h4 a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 600;
}
.repo-card h4 a:hover {
  text-decoration: underline;
}
.repo-card p {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}
.repo-card .tech-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.repo-card .tech-badges span {
  display: inline-block;
  padding: 2px 8px;
  font-size: 0.75rem;
  border-radius: 4px;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
}
.deprecated-section {
  margin: 16px 0;
}
.deprecated-section summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--vp-c-warning-1);
  padding: 8px 0;
}
.deprecated-card {
  border: 1px dashed var(--vp-c-warning-1);
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
  background: var(--vp-c-bg-soft);
  opacity: 0.8;
}
.deprecated-card h4 {
  margin: 0 0 6px 0;
  font-size: 0.95rem;
}
.deprecated-card h4 a {
  color: var(--vp-c-text-2);
  text-decoration: none;
}
.deprecated-card p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
}
</style>

## 🌐 Frontend

Brukervendte applikasjoner — de fleste bygget med Next.js og TypeScript. Noen repoer er delte komponenter.

<div class="repo-grid">

<div class="repo-card">
<h4><a href="https://github.com/navikt/aktivitetskrav-frontend">aktivitetskrav-frontend</a></h4>
<p>Viser status for aktivitetskravet (krav om yrkesrettet aktivitet) for innloggede brukere på Min side.</p>
<div class="tech-badges"><span>TypeScript</span><span>Next.js</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/bro-frontend">bro-frontend</a></h4>
<p>Frontend for behovsrettet oppfølging — lar sykmeldte og arbeidsgivere melde behov for dialogmøte.</p>
<div class="tech-badges"><span>TypeScript</span><span>Next.js</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/dialogmote-frontend">dialogmote-frontend</a></h4>
<p>Dialogmøte-app for arbeidsgiver og arbeidstaker — viser innkallinger, referat og svar.</p>
<div class="tech-badges"><span>TypeScript</span><span>Next.js</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/dinesykmeldte">dinesykmeldte</a></h4>
<p>Oversikt over din bedrifts sykmeldte — arbeidsgivers inngangsport til sykefraværsoppfølging.</p>
<div class="tech-badges"><span>TypeScript</span><span>Next.js</span></div>
</div>

<!-- TODO: Beskrivelse mangler — verifiser med teamet -->
<div class="repo-card">
<h4><a href="https://github.com/navikt/dinesykmeldte-sidemeny">dinesykmeldte-sidemeny</a></h4>
<p>Sidemeny-komponent brukt i dinesykmeldte-konteksten.</p>
<div class="tech-badges"><span>TypeScript</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/meroppfolging-frontend">meroppfolging-frontend</a></h4>
<p>App for sykmeldte som nærmer seg slutten på sykepengeperioden. Viser maksdato, samler inn svar og lar brukeren be om oppfølging.</p>
<div class="tech-badges"><span>TypeScript</span><span>Next.js</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/narmesteleder-frontend">narmesteleder-frontend</a></h4>
<p>Registrering og oppdatering av nærmeste leder for sykmeldte ansatte. Støtter forhåndsutfylte skjemaer fra Dialogporten.</p>
<div class="tech-badges"><span>TypeScript</span><span>Next.js</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/oppfolgingsplan-lps-demo">oppfolgingsplan-lps-demo</a></h4>
<p>Demo-applikasjon for å vise hvordan LPS-leverandører sender oppfølgingsplaner til Nav.</p>
<div class="tech-badges"><span>TypeScript</span><span>Next.js</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/syfo-oppfolgingsplan-frontend">syfo-oppfolgingsplan-frontend</a></h4>
<p>Ny frontend for oppfølgingsplan, utviklet fra sommer 2025. Erstatter den eldre oppfølgingsplan-frontenden.</p>
<div class="tech-badges"><span>TypeScript</span><span>Next.js</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/syfojanitor-frontend">syfojanitor-frontend</a></h4>
<p>Intern admin-app for å lukke åpne dialogmøter manuelt (krever UUID og personident).</p>
<div class="tech-badges"><span>TypeScript</span><span>Next.js</span></div>
</div>

</div>

<details class="deprecated-section">
<summary>⚠️ Deprecated frontend-repoer</summary>
<div class="deprecated-card">
<h4><a href="https://github.com/navikt/oppfolgingsplan-frontend">oppfolgingsplan-frontend</a></h4>
<!-- TODO: Beskrivelse mangler -->
<p>Erstattet av syfo-oppfolgingsplan-frontend.</p>
</div>
</details>

## ⚙️ Backend

API-er og bakgrunnstjenester — Kotlin med enten Spring Boot eller Ktor.

<div class="repo-grid">

<div class="repo-card">
<h4><a href="https://github.com/navikt/aktivitetskrav-backend">aktivitetskrav-backend</a></h4>
<p>Backend-tjeneste for aktivitetskrav (krav om yrkesrettet aktivitet) i sykefraværsoppfølgingen.</p>
<div class="tech-badges"><span>Kotlin</span><span>Spring Boot</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/dinesykmeldte-backend">dinesykmeldte-backend</a></h4>
<p>Backend for dinesykmeldte — aggregerer sykmeldingsdata for arbeidsgivere.</p>
<div class="tech-badges"><span>Kotlin</span><span>Ktor</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/esyfo-narmesteleder">esyfo-narmesteleder</a></h4>
<p>API for håndtering av nærmeste leder-koblinger mellom arbeidsgiver og sykmeldt.</p>
<div class="tech-badges"><span>Kotlin</span><span>Ktor</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/esyfo-token-tjeneste">esyfo-token-tjeneste</a></h4>
<p>API for å hente Maskinporten-token til systembrukere i `dev`-miljøet.</p>
<div class="tech-badges"><span>Kotlin</span><span>Ktor</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/esyfovarsel">esyfovarsel</a></h4>
<p>Håndterer varsler (SMS, e-post) for SYFO-domenet — dialogmøter, aktivitetskrav m.m.</p>
<div class="tech-badges"><span>Kotlin</span><span>Ktor</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/lps-oppfolgingsplan-mottak">lps-oppfolgingsplan-mottak</a></h4>
<p>Mottar oppfølgingsplaner fra eksterne LPS-leverandører og videresender til Nav og/eller fastlege.</p>
<div class="tech-badges"><span>Kotlin</span><span>Ktor</span><span>PostgreSQL</span><span>Kafka</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/meroppfolging-backend">meroppfolging-backend</a></h4>
<p>Backend for meroppfolging-frontend — lagrer svar og håndterer oppfølgingsforespørsler.</p>
<div class="tech-badges"><span>Kotlin</span><span>Spring Boot</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/oppfolgingsplan-backend">oppfolgingsplan-backend</a></h4>
<p>Lagring og prosessering av oppfølgingsplaner. Overtok funksjonalitet fra syfooppfolgingsplanservice.</p>
<div class="tech-badges"><span>Kotlin</span><span>Spring Boot</span></div>
</div>

<!-- TODO: Verifiser beskrivelse med teamet -->
<div class="repo-card">
<h4><a href="https://github.com/navikt/syfo-dokumentporten">syfo-dokumentporten</a></h4>
<p>Dokumenttjeneste for oppfølgingsplaner — håndterer lagring og uthenting av plan-dokumenter.</p>
<div class="tech-badges"><span>Kotlin</span><span>Ktor</span><span>PostgreSQL</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/syfo-oppfolgingsplan-backend">syfo-oppfolgingsplan-backend</a></h4>
<p>Backend for den nye oppfølgingsplan-løsningen. Brukes av arbeidsgiver, sykmeldt og Nav-veileder.</p>
<div class="tech-badges"><span>Kotlin</span><span>Ktor</span><span>PostgreSQL</span><span>Kafka</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/syfobrukertilgang">syfobrukertilgang</a></h4>
<p>Håndterer tilgangskontroll til sykefraværsoppfølgingen for brukere i selvbetjeningssonen.</p>
<div class="tech-badges"><span>Kotlin</span><span>Ktor</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/syfomotebehov">syfomotebehov</a></h4>
<p>Lagrer og eksponerer data om behov for dialogmøte — brukes av bro-frontend.</p>
<div class="tech-badges"><span>Kotlin</span><span>Spring Boot</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/syfojanitor-backend">syfojanitor-backend</a></h4>
<p>Backend for syfojanitor — mottar forespørsler om å lukke dialogmøter via Kafka.</p>
<div class="tech-badges"><span>Kotlin</span><span>Ktor</span><span>Kafka</span><span>PostgreSQL</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/sykepengedager-informasjon">sykepengedager-informasjon</a></h4>
<p>Aggregerer og distribuerer informasjon om gjenstående sykepengedager (maksdato).</p>
<div class="tech-badges"><span>Kotlin</span><span>Spring Boot</span></div>
</div>

</div>

<details class="deprecated-section">
<summary>⚠️ Deprecated backend-repoer</summary>
<div class="deprecated-card">
<h4><a href="https://github.com/navikt/syfooppfolgingsplanservice">syfooppfolgingsplanservice</a></h4>
<p>Gammel applikasjon i FSS som håndterte og lagret digitale oppfølgingsplaner. Erstattes av oppfolgingsplan-backend.</p>
</div>
</details>

## 🧩 Microfrontend

Mikrofronter som kjører inne i andre applikasjoner (Min side).

<div class="repo-grid">

<div class="repo-card">
<h4><a href="https://github.com/navikt/esyfo-microfrontends">esyfo-microfrontends</a></h4>
<p>Astro SSR-monorepo for eSyfo-mikrofronter (aktivitetskrav, dialogmøte og meroppfølging), integrert på Min side.</p>
<div class="tech-badges"><span>TypeScript</span><span>Astro</span></div>
</div>

</div>

## 🧱 Monorepo

Tverrfaglige prosjekter med både frontend og backend i ett repo.

<div class="repo-grid">

<div class="repo-card">
<h4><a href="https://github.com/navikt/lumi">lumi</a></h4>
<p>Personvernvennlig survey-infrastruktur for Nav — brukes til å samle tilbakemeldinger uten å lagre persondata.</p>
<div class="tech-badges"><span>Kotlin</span><span>Ktor</span><span>TypeScript</span><span>Monorepo</span></div>
</div>

</div>

## 📊 Dataanalyse

<div class="repo-grid">

<div class="repo-card">
<h4><a href="https://github.com/navikt/isyfo-analyse">isyfo-analyse</a></h4>
<p>Kildekode for teamets dataanalyser og datafortellinger.</p>
<div class="tech-badges"><span>Python</span><span>Quarto</span><span>Airflow</span></div>
</div>

</div>

## 📦 Verktøy og annet

Utviklerverktøy, infrastruktur og delte ressurser.

<div class="repo-grid">

<div class="repo-card">
<h4><a href="https://github.com/navikt/esyfo-cli">esyfo-cli</a></h4>
<p>CLI-verktøykasse for team-esyfo — lokale hjelpescripts for utvikling (krever Bun).</p>
<div class="tech-badges"><span>TypeScript</span><span>Bun</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/esyfo-proxy">esyfo-proxy</a></h4>
<p>Proxy-backend for eSyfo — ruter trafikk mellom frontender og backend-tjenester.</p>
<div class="tech-badges"><span>TypeScript</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/nav-ekstern-api-dok">nav-ekstern-api-dok</a></h4>
<p>Oversikt over API-dokumentasjon som Nav eksponerer eksternt.</p>
<div class="tech-badges"><span>Dokumentasjon</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/syfooppdfgen">syfooppdfgen</a></h4>
<p>Genererer PDF fra oppfølgingsplaner mottatt fra LPS-leverandører.</p>
<div class="tech-badges"><span>PDF-generering</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/team-esyfo">team-esyfo</a></h4>
<p>Denne wikien — dokumentasjon, runbooks og onboarding for Team eSyfo.</p>
<div class="tech-badges"><span>VitePress</span><span>Markdown</span></div>
</div>

<div class="repo-card">
<h4><a href="https://github.com/navikt/teamesyfo-github-actions-workflows">teamesyfo-github-actions-workflows</a></h4>
<p>Delte GitHub Actions-workflows brukt på tvers av teamets repoer.</p>
<div class="tech-badges"><span>GitHub Actions</span></div>
</div>

</div>
