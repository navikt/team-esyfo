# Repositories

Oversikt over alle repoer som Team eSyfo eier og vedlikeholder, gruppert etter type.

## 🌐 Frontend

Brukervendte applikasjoner — alle bygget med Next.js og TypeScript.

---

### [aktivitetskrav-frontend](https://github.com/navikt/aktivitetskrav-frontend)

Viser status for aktivitetskravet (krav om yrkesrettet aktivitet) for innloggede brukere på Min side.

`TypeScript` `Next.js`

---

### [bro-frontend](https://github.com/navikt/bro-frontend)

Frontend for behovsrettet oppfølging — lar sykmeldte og arbeidsgivere melde behov for dialogmøte.

`TypeScript` `Next.js`

---

### [dialogmote-frontend](https://github.com/navikt/dialogmote-frontend)

Dialogmøte-app for arbeidsgiver og arbeidstaker — viser innkallinger, referat og svar.

`TypeScript` `Next.js`

---

### [dinesykmeldte](https://github.com/navikt/dinesykmeldte)

Oversikt over din bedrifts sykmeldte — arbeidsgivers inngangsport til sykefraværsoppfølging.

`TypeScript` `Next.js`

---

### [dinesykmeldte-sidemeny](https://github.com/navikt/dinesykmeldte-sidemeny)

<!-- TODO: Beskrivelse mangler — verifiser med teamet -->
Sidemeny-komponent brukt i dinesykmeldte-konteksten.

`TypeScript`

---

### [meroppfolging-frontend](https://github.com/navikt/meroppfolging-frontend)

App for sykmeldte som nærmer seg slutten på sykepengeperioden. Viser maksdato, samler inn svar om situasjonen videre og lar brukeren be om oppfølging fra Nav.

`TypeScript` `Next.js`

---

### [narmesteleder-frontend](https://github.com/navikt/narmesteleder-frontend)

Registrering og oppdatering av nærmeste leder for sykmeldte ansatte. Støtter forhåndsutfylte skjemaer fra Dialogporten og tomme skjemaer fra Min side – arbeidsgiver.

`TypeScript` `Next.js`

---

### [oppfolgingsplan-lps-demo](https://github.com/navikt/oppfolgingsplan-lps-demo)

Demo-applikasjon for å vise hvordan LPS-leverandører sender oppfølgingsplaner til Nav.

`TypeScript` `Next.js`

---

### [syfo-oppfolgingsplan-frontend](https://github.com/navikt/syfo-oppfolgingsplan-frontend)

Ny frontend for oppfølgingsplan, utviklet fra sommer 2025. Erstatter den eldre oppfølgingsplan-frontenden.

`TypeScript` `Next.js`

---

### [syfojanitor-frontend](https://github.com/navikt/syfojanitor-frontend)

Intern admin-app for å lukke åpne dialogmøter manuelt (krever UUID og personident).

`TypeScript` `Next.js`

---

<details>
<summary>⚠️ Deprecated frontend-repoer</summary>

### [oppfolgingsplan-frontend](https://github.com/navikt/oppfolgingsplan-frontend)

<!-- TODO: Beskrivelse mangler -->
Erstattet av `syfo-oppfolgingsplan-frontend`.

`TypeScript` `Next.js` `deprecated`

</details>

## ⚙️ Backend

API-er og bakgrunnstjenester — Kotlin med enten Spring Boot eller Ktor.

---

### [aktivitetskrav-backend](https://github.com/navikt/aktivitetskrav-backend)

Backend-tjeneste for aktivitetskrav (krav om yrkesrettet aktivitet) i sykefraværsoppfølgingen.

`Kotlin` `Spring Boot`

---

### [dinesykmeldte-backend](https://github.com/navikt/dinesykmeldte-backend)

Backend for dinesykmeldte — aggregerer sykmeldingsdata for arbeidsgivere.

`Kotlin` `Ktor`

---

### [esyfo-narmesteleder](https://github.com/navikt/esyfo-narmesteleder)

API for håndtering av nærmeste leder-koblinger mellom arbeidsgiver og sykmeldt.

`Kotlin` `Ktor`

---

### [esyfo-token-tjeneste](https://github.com/navikt/esyfo-token-tjeneste)

Hjelpetjeneste for å hente Maskinporten-tokens i dev-miljøet. Krever NaisDevice.

`Kotlin` `Ktor`

---

### [esyfovarsel](https://github.com/navikt/esyfovarsel)

Håndterer varsler (SMS, e-post) for SYFO-domenet — dialogmøter, aktivitetskrav m.m.

`Kotlin` `Ktor`

---

### [lps-oppfolgingsplan-mottak](https://github.com/navikt/lps-oppfolgingsplan-mottak)

Mottar oppfølgingsplaner fra eksterne LPS-leverandører (lønnssystem-leverandører) og videresender til Nav og/eller fastlege.

`Kotlin` `Ktor` `PostgreSQL` `Kafka`

---

### [meroppfolging-backend](https://github.com/navikt/meroppfolging-backend)

Backend for meroppfolging-frontend — lagrer svar og håndterer oppfølgingsforespørsler.

`Kotlin` `Spring Boot`

---

### [oppfolgingsplan-backend](https://github.com/navikt/oppfolgingsplan-backend)

Lagring og prosessering av oppfølgingsplaner. Overtok funksjonalitet fra syfooppfolgingsplanservice (GCP).

`Kotlin` `Spring Boot`

---

### [syfo-dokumentporten](https://github.com/navikt/syfo-dokumentporten)

<!-- TODO: Verifiser beskrivelse med teamet -->
Dokumenttjeneste for oppfølgingsplaner — håndterer lagring og uthenting av plan-dokumenter.

`Kotlin` `Ktor` `PostgreSQL`

---

### [syfo-oppfolgingsplan-backend](https://github.com/navikt/syfo-oppfolgingsplan-backend)

Backend for den nye oppfølgingsplan-løsningen. Brukes av arbeidsgiver, sykmeldt og Nav-veileder.

`Kotlin` `Ktor` `PostgreSQL` `Kafka`

---

### [syfobrukertilgang](https://github.com/navikt/syfobrukertilgang)

Håndterer tilgangskontroll til sykefraværsoppfølgingen for brukere i selvbetjeningssonen.

`Kotlin` `Ktor`

---

### [syfomotebehov](https://github.com/navikt/syfomotebehov)

Lagrer og eksponerer data om behov for dialogmøte — brukes av bro-frontend.

`Kotlin` `Spring Boot`

---

### [syfojanitor-backend](https://github.com/navikt/syfojanitor-backend)

Backend for syfojanitor — mottar forespørsler om å lukke dialogmøter via Kafka.

`Kotlin` `Ktor` `Kafka` `PostgreSQL`

---

### [sykepengedager-informasjon](https://github.com/navikt/sykepengedager-informasjon)

Aggregerer og distribuerer informasjon om gjenstående sykepengedager (maksdato).

`Kotlin` `Spring Boot`

---

<details>
<summary>⚠️ Deprecated backend-repoer</summary>

### [syfooppfolgingsplanservice](https://github.com/navikt/syfooppfolgingsplanservice)

Gammel applikasjon i FSS som håndterte og lagret digitale oppfølgingsplaner. Erstattes av `oppfolgingsplan-backend`.

`Kotlin` `Spring Boot` `deprecated`

</details>

## 🧩 Microfrontend

Mikrofronter som kjører inne i andre applikasjoner (Min side).

---

### [esyfo-microfrontends](https://github.com/navikt/esyfo-microfrontends)

Astro SSR-monorepo for eSyfo-mikrofronter (aktivitetskrav, dialogmøte og meroppfølging), integrert på Min side.

`TypeScript` `Astro`

---

## 🧱 Monorepo

Tverrfaglige prosjekter med både frontend og backend i ett repo.

---

### [lumi](https://github.com/navikt/lumi)

Personvernvennlig survey-infrastruktur for Nav — brukes til å samle tilbakemeldinger uten å lagre persondata.

`Kotlin` `Ktor` `TypeScript` `Monorepo`

---

## 📦 Verktøy og annet

Utviklerverktøy, infrastruktur og delte ressurser.

---

### [esyfo-cli](https://github.com/navikt/esyfo-cli)

CLI-verktøykasse for team-esyfo — lokale hjelpescripts for utvikling (krever Bun).

`TypeScript` `Bun`

---

### [esyfo-proxy](https://github.com/navikt/esyfo-proxy)

Proxy-backend for eSyfo — ruter trafikk mellom frontender og backend-tjenester.

`TypeScript`

---

### [nav-ekstern-api-dok](https://github.com/navikt/nav-ekstern-api-dok)

Oversikt over API-dokumentasjon som Nav eksponerer eksternt.

---

### [syfooppdfgen](https://github.com/navikt/syfooppdfgen)

Genererer PDF fra oppfølgingsplaner mottatt fra LPS-leverandører.

---

### [team-esyfo](https://github.com/navikt/team-esyfo)

Denne wikien — dokumentasjon, runbooks og onboarding for Team eSyfo.

`VitePress` `Markdown`

---

### [teamesyfo-github-actions-workflows](https://github.com/navikt/teamesyfo-github-actions-workflows)

Delte GitHub Actions-workflows brukt på tvers av teamets repoer.

`GitHub Actions`

---

<details>
<summary>⚠️ Deprecated / arkivert</summary>

### [esyfo-dev-tools](https://github.com/navikt/esyfo-dev-tools)

Tidligere utviklerverktøy — nå arkivert. Funksjonalitet flyttet til `esyfo-cli`.

`archived`

</details>
