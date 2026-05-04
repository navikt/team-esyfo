---
name: doc-new-area
description: "Scaffolding av dokumentasjon for nytt fagområde i Team eSyfo sin VitePress-wiki — oppretter områdeside med brukerreise, teknisk underside og registrerer i areas.ts. Brukes via /doc-new-area når et nytt fagområde skal dokumenteres."
---

# Scaffolde nytt fagområde

Opprett dokumentasjon for et nytt fagområde i Team eSyfo sin wiki.

## Kravinnhenting

Spør brukeren om følgende før du starter:

| Felt | Beskrivelse | Eksempel |
|------|-------------|---------|
| **Navn** | Områdets visningsnavn | «Kartleggingsspørsmål» |
| **Emoji** | Én emoji som representerer området | 📋 |
| **Fase** | `early` / `mid` / `late` / `continuous` | `early` |
| **Kort beskrivelse** | 1–2 setninger om hva området gjør | «Samler informasjon fra den sykmeldte tidlig i sykefraværet.» |
| **Brukerreise** | Hvem utløser hva, steg-for-steg | Systemet vurderer → varsel → besvarelse → svar brukes |
| **Systemer** | Repoer og eksterne systemer involvert | ismeroppfolging, esyfovarsel, bro-frontend |
| **Kafka-topics** | Relevante topics (inn/ut) | team-esyfo.varselbus, team-esyfo.kartleggingssporsmal-svar |
| **Demo/Storybook** | Lenker til demo-miljø og storybook | demo.ekstern.dev.nav.no/syk/..., storybook-URL |

Utled `id` fra navnet: lowercase, norske tegn til ASCII, mellomrom til bindestrek (f.eks. «Nærmeste leder» → `narmeste-leder`).

## Arbeidsflyt

### 1. Opprett områdeside (index.md)

Opprett `docs/omrader/{id}/index.md` med denne malen:

```md
# {emoji} {navn}

**Fase:** {faselabel} {faseikon}

## Formål

{Kort avsnitt: hva gjør området, for hvem, og hva oppnås.}

## Brukerreisen

::: tip 🎯 Prøv selv
- [Åpne demo →]({demo-URL})
- [Storybook: {tilstand 1} →]({storybook-URL-1})
- [Storybook: {tilstand 2} →]({storybook-URL-2})
:::

### 1. {emoji} {Steg-tittel}

{Beskrivelse av steget. Hvem gjør hva, og hvilke kriterier gjelder.}

- **Kriterium 1**: Forklaring
- **Kriterium 2**: Forklaring

### 2. {emoji} {Steg-tittel}

{Neste steg i brukerreisen.}

::: tip Storybook 🎨
[Se hvordan det ser ut →]({storybook-URL})
:::

### 3. {emoji} {Steg-tittel}

{Fortsett til reisen er komplett.}

## Viktige begreper

| Begrep | Forklaring |
|--------|-----------|
| {begrep} | {Kort, presis forklaring} |

::: info 🔧 Teknisk oversikt
Dataflyt, Kafka-topics og systemer → [teknisk side](./teknisk)
:::
```

Fasemapping:

| Fase | Label | Ikon |
|------|-------|------|
| `early` | Tidlig | 🟢 |
| `mid` | Midtveis | 🟡 |
| `late` | Sen fase | 🟠 |
| `continuous` | Gjennomgående | 🔵 |

### 2. Opprett teknisk underside (teknisk.md)

Opprett `docs/omrader/{id}/teknisk.md` med denne malen:

```md
# {Navn} — teknisk oversikt

{Én setning som oppsummerer systemets ansvar og dataflyt.}

## Dataflyt

\`\`\`mermaid
sequenceDiagram
    participant a as {System A}
    participant b as {System B}
    participant c as {System C}

    rect rgb(240, 248, 255)
    Note over a,b: {Fase 1}
    a->>b: {hendelse/kall}
    end

    rect rgb(248, 255, 240)
    Note over b,c: {Fase 2}
    b->>c: {hendelse/kall}
    end
\`\`\`

## Kafka-topics

| Topic | Retning | Beskrivelse |
|-------|---------|-------------|
| `{namespace}.{topic}` | Inn | {Hva topicen mottar} |
| `{namespace}.{topic}` | Ut | {Hva topicen publiserer} |

## Systemer

| System | Ansvar |
|--------|--------|
| [{repo-navn}]({GitHub-URL}) | {Kort beskrivelse} |
```

Mermaid-tips:
- Bruk norske verb i pilene: «lytter», «sender», «lagrer», «publiserer»
- Grupper steg i `rect`-blokker med farger for lesbarhet
- Marker autentisering med `Note right of`: TokenX, Azure AD

### 3. Registrer i areas.ts

Legg til et nytt objekt i `areas`-arrayen i `docs/.vitepress/areas.ts`:

```ts
{
  id: "{id}",
  name: "{navn}",
  emoji: "{emoji}",
  phase: "{fase}",
  description: "{kort beskrivelse}",
  path: "/omrader/{id}/",
},
```

Plasser det nye området sortert etter fase-rekkefølge (early → mid → late → continuous), og følg eksisterende mønstre i arrayen for plassering innenfor samme fase.

### 4. Språkvask

Bruk `/klarsprak` på all tekst i begge filer. Sikre:

- Aktiv setningsbygning
- Kort og presist — unngå fylltekst
- Norske termer fremfor anglisismer (f.eks. «lytter» ikke «consumer»)
- Sammensatte ord uten bindestrek med mindre de inneholder egennavn (Nav-veileder, men kandidatstatus)
- Konsekvent med eksisterende områdesider i wikien

### 5. Bygg og verifiser

Kjør `cd docs && pnpm build` for å verifisere at:
- Alle lenker fungerer
- Mermaid-diagrammer rendres
- VitePress-containere (`::: tip`, `::: info`) er lukket

### 6. Minn brukeren om forsiden

Etter opprettelse, informer brukeren:

> **Merk:** Forsiden (`docs/index.md`) har manuell frontmatter som ikke oppdateres automatisk fra `areas.ts`. Sjekk om forsiden trenger manuell oppdatering etter at et nytt område er lagt til.

## VitePress-containere

Bruk disse for å fremheve innhold:

| Container | Bruk |
|-----------|------|
| `::: tip {tittel}` | Demo-lenker, storybook, prøv-selv |
| `::: info {tittel}` | Referanser, lenke til teknisk side |
| `::: warning {tittel}` | Viktige advarsler |
| `::: details {tittel}` | Sammenleggbar tilleggsinformasjon |

## Grenser

- Ikke endre `docs/index.md` automatisk
- Ikke endre eksisterende områders innhold
- Fyll ut malen med faktisk innhold — ikke la `[Punkt 1]`-plassholdere stå
