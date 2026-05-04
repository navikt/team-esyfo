---
name: doc-new-area
description: "Scaffolding av dokumentasjon for nytt fagområde i Team eSyfo sin VitePress-wiki — oppretter områdeside og registrerer i areas.ts. Brukes via /doc-new-area når et nytt fagområde skal dokumenteres."
---

# Scaffolde nytt fagområde

Opprett dokumentasjon for et nytt fagområde i Team eSyfo sin wiki.

## Kravinnhenting

Spør brukeren om følgende før du starter:

| Felt | Beskrivelse | Eksempel |
|------|-------------|---------|
| **Navn** | Områdets visningsnavn | «Oppfølgingsplan» |
| **Emoji** | Én emoji som representerer området | 📝 |
| **Fase** | `early` / `mid` / `late` / `continuous` | `mid` |
| **Kort beskrivelse** | 1–2 setninger om hva området gjør | «Plan for oppfølging mellom arbeidsgiver og arbeidstaker.» |

Utled `id` fra navnet: lowercase, norske tegn til ASCII, mellomrom til bindestrek (f.eks. «Nærmeste leder» → `narmeste-leder`).

## Arbeidsflyt

### 1. Opprett områdeside

Opprett `docs/omrader/{id}/index.md` med denne malen:

```md
# {emoji} {navn}

**Fase:** {faselabel} {faseikon}

## Formål

{beskrivelse utvidet til et kort avsnitt}

## Dette området handler om

- [Punkt 1]
- [Punkt 2]

## Viktige begreper

| Begrep | Forklaring |
|--------|-----------|
| ... | ... |

## Brukergrupper

- [Gruppe 1]
- [Gruppe 2]

---

> [!NOTE]
> Denne siden er under utvikling. Legg til skisser, flytdiagrammer og tekniske detaljer etter hvert som området dokumenteres.
```

Fasemapping:

| Fase | Label | Ikon |
|------|-------|------|
| `early` | Tidlig | 🟢 |
| `mid` | Midtveis | 🟡 |
| `late` | Sen fase | 🟠 |
| `continuous` | Gjennomgående | 🔵 |

### 2. Registrer i areas.ts

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

Plasser det nye området sortert etter fase-rekkefølge (early → mid → late → continuous), og alfabetisk innenfor samme fase.

### 3. Språkvask

Bruk `/klarsprak` på beskrivelsen og formålsteksten i `index.md`. Sikre:

- Aktiv setningsbygning
- Kort og presist — unngå fylltekst
- Konsekvent med eksisterende områdesider i wikien

### 4. Minn brukeren om forsiden

Etter opprettelse, informer brukeren:

> **Merk:** Forsiden (`docs/index.md`) genereres fra `areas.ts`, men kan ikke oppdateres automatisk på grunn av VitePress-begrensninger. Sjekk om forsiden trenger manuell synkronisering.

## Grenser

- Ikke endre `docs/index.md` automatisk
- Ikke opprett undersider — kun `index.md` for det nye området
- Ikke endre eksisterende områder
