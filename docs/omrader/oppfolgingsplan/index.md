# 📝 Oppfølgingsplan

**Fase:** Midtveis 🟡

## Formål

Oppfølgingsplan hjelper arbeidsgiver og arbeidstaker med å samle tiltak, mål og vurderinger for tilrettelegging og veien tilbake til arbeid. Løsningen brukes fra Dine sykmeldte og Ditt sykefravær, og planen kan deles med Nav eller fastlege når det er behov.

## Brukerreiser

### Arbeidsgiver (nærmesteleder)

::: tip 🎯 Prøv selv
- [Demo: opprett ny plan →](https://demo.ekstern.dev.nav.no/syk/oppfolgingsplan/1/ny-plan)
- [Demo: aktiv plan →](https://demo.ekstern.dev.nav.no/syk/oppfolgingsplan/1/aktiv-plan)
:::

#### 1. ✍️ Lage utkast

Arbeidsgiver (nærmesteleder) går inn via [Dine sykmeldte](https://www.nav.no/arbeidsgiver/sykmeldte), velger en ansatt og starter oppfølgingsplanen. I appen fyller nærmesteleder ut mål, arbeidsoppgaver og tiltak. Backend lagrer innholdet som et utkast som kan redigeres over tid.

- Utkast slettes automatisk etter fire måneder hvis det ikke ferdigstilles

#### 2. ✅ Opprette oppfølgingsplan

Når innholdet er klart, sender arbeidsgiver inn planen. Backend lagrer planen, sletter utkastet og henter stillingsinformasjon fra Aareg. Arbeidstaker får varsel om at planen er opprettet.

#### 3. 📤 Dele med Nav (valgfritt)

Arbeidsgiver kan velge å dele planen med Nav. Backend genererer en PDF og arkiverer den i Dokumentporten. Nav-veileder kan deretter se planen i Modia.

#### 4. 📤 Dele med fastlege (valgfritt)

Arbeidsgiver kan velge å dele planen med fastlege. Backend genererer en PDF og sender den via IsDialogmelding til fastlegens journalsystem over Norsk Helsenett.

### Den sykmeldte

::: tip 🎯 Prøv selv
- [Demo: aktiv plan →](https://demo.ekstern.dev.nav.no/syk/oppfolgingsplan/sykmeldt/aktiv-plan/223e4567-e89b-12d3-a456-426614174002)
:::

#### 1. 📬 Mottar varsel

Når arbeidsgiver oppretter planen, får den sykmeldte et varsel. Den sykmeldte åpner planen via [Ditt sykefravær](https://www.nav.no/syk/sykefravaer).

#### 2. 👀 Ser innholdet

Den sykmeldte kan se mål, arbeidsoppgaver og tiltak som arbeidsgiver har fylt ut.

## Viktige begreper

| Begrep | Forklaring |
|--------|-----------|
| Oppfølgingsplan | Felles plan med mål, tiltak og vurderinger for å komme tilbake i arbeid |
| Utkast | Midlertidig versjon av planen som lagres før den sendes inn |
| Journalpost | Referanse til planen etter at den er arkivert i Dokumentporten |
| Stillingsinformasjon | Stillingstittel og stillingsprosent som backend henter fra Aareg |

::: info 🔧 Teknisk oversikt
Dataflyt, Kafka-topics og systemer → [teknisk side](./teknisk)
:::
