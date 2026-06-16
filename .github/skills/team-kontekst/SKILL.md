---
name: team-kontekst
description: "Team-esyfos autoritative oppsett for @doctor-who — tavle, måldokument, apper teamet eier, domeneordbok, rapportkadens og områdeinndeling. Lastes ved oppstart av status-, prioriterings-, mål- og discovery-arbeid."
---

# Team-kontekst — esyfo

Den autoritative inngangen til **team-esyfos oppsett** for @doctor-who. Agenten
leser denne ved oppstart, slik at den slipper å spørre om tavle, mål og apper.

Prinsipp: **pek på teamets ekte dokumenter, ikke kopier dem.** Wikien er kilden
til sannhet — denne fila er bare en indeks. Dupliser aldri app-lista eller
ordboka hit; de råtner. Wiki: <https://navikt.github.io/team-esyfo/>

Team eSyfo eier den **eksterne sykefraværsoppfølgingen** i Nav.

## Tavle (GitHub Projects)

- **Tavle:** `navikt/157`
- **Tavle-guide:** finnes ikke som egen fil ennå. Kolonne-/feltsemantikk tolkes
  via områdeinndelingen (`docs/omrader/index.md`) og ordboka inntil en egen
  guide opprettes. Mangler noe: spør brukeren én gang.

Pekeren over er stabil og trygg. **Feltstrukturen er det ikke** — felt-ID-er,
opsjon-ID-er og statusnavn leses alltid dynamisk fra Projects v2 ved kjøring.
Aldri hardkod dem; de endrer seg når noen omdøper en kolonne.

## Måldokument

Teamet har ikke et formelt OKR-/måldokument i repoet ennå. Når mål formaliseres:
opprett det i wikien (f.eks. `docs/mal.md`) og oppdater pekeren her. Inntil da:
avklar gjeldende mål med brukeren før prioriterings- og målarbeid.

## Apper teamet eier

Autoritativ, gruppert liste (frontend / backend / felles / verktøy) med
forretningsbeskrivelse per repo: **`docs/utvikling/repositories.md`**
(<https://navikt.github.io/team-esyfo/utvikling/repositories>).

Les den fila for å finne riktig repo — aldri gjett på hvilke apper teamet eier.

> Tverrgående arbeid *inni* en enkelt app (f.eks. drodle i kontekst av
> `syfo-oppfolgingsplan-backend`) krever en read-only «hent annet repo»-
> capability som ikke er bygget ennå — se hovmester #66. Til da: be brukeren
> åpne appens eget repo for dyp kode-kontekst, eller lime inn det relevante.

## Områdeinndeling

Sykefraværsforløpet er delt i åtte områder (fra tidlige tiltak til sen fase):
**`docs/omrader/index.md`** (<https://navikt.github.io/team-esyfo/omrader/>).
Bruk områdene som ramme når status og prioritering skal knyttes til forløpet.

## Domeneordbok og akronymer

Domenebegreper (39-ukersvarsel, aktivitetskrav, dialogmøte, LPS, …) er forklart
i **`docs/ordbok.md`** (<https://navikt.github.io/team-esyfo/ordbok>). Slå opp
der før du bruker et begrep — **gjett aldri** på hva et akronym betyr.

## Rapportkadens

`<f.eks. ukesoversikt mandager; tertialstatus mot mål ved tertialslutt>`
<!-- TODO: fyll inn teamets faktiske rapportrytme. -->

## Slik bruker agenten denne

- **Ved oppstart** av status-, prioriterings-, mål- eller discovery-arbeid: bruk
  denne som inngang, og les de lenkede dokumentene ved behov.
- **Tavlas felter/opsjoner** hentes dynamisk fra Projects v2 — aldri hardkodet.
- **Mangler et felt her** (tavle-guide, måldokument, kadens): spør brukeren én
  gang, og foreslå å legge svaret inn i riktig wiki-dokument (PR — spør først).

## Grenser

### ✅ Alltid
- Behandle wikien som kilden til sannhet; denne fila er kun en indeks
- Les feltene på tavla dynamisk — aldri hardkod felt-/opsjon-ID-er
- Slå opp domenebegreper i ordboka

### ⚠️ Spør først
- Oppdatere denne fila eller wiki-dokumenter (via PR)

### 🚫 Aldri
- Duplisere app-lista, ordboka eller områdene hit — pek på wikien
- Hardkode tavlas feltstruktur (ID-er, opsjon-ID-er, statusnavn)
- Gjette på domeneakronymer som står i ordboka — slå opp i stedet
