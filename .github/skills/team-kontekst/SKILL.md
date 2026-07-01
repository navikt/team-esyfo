---
name: team-kontekst
description: "Team-esyfos autoritative oppsett for @doctor-who — tavlestruktur (navikt/157), arbeidsrytme, mål/drift, issue-hierarki, apper teamet eier, kode-oppslag på tvers av repoer, domeneordbok, AID-oppdraget og dokumentasjonskonvensjoner. Lastes ved oppstart av status-, prioriterings-, mål-, discovery- og dokumentasjonsarbeid."
---

# Team-kontekst — esyfo

Den autoritative inngangen til **team-esyfos oppsett** for @doctor-who. Agenten
leser denne ved oppstart, slik at den slipper å spørre om tavle, rytme, mål og apper.

Prinsipp: **pek på teamets ekte kilder, ikke kopier dem.** Wikien er kilden til
sannhet for fag/apper/ordbok; **tavla** er kilden til sannhet for oppgaver, mål
og status. Denne fila beskriver *strukturen og semantikken* så agenten vet hvor
den skal hente det den trenger — og leser alltid de volatile verdiene live.

Team eSyfo eier den **eksterne sykefraværsoppfølgingen** i Nav.
Wiki: <https://navikt.github.io/team-esyfo/>

## Tavle (GitHub Projects `navikt/157`)

Teamets eneste tavle. Alle issues fra repoets maler legges automatisk på den
(`projects: ["navikt/157"]`). Tavla er kilden til sannhet for **oppgaver, mål,
prioritering og status** — ikke wikien.

**Hvordan lese den:** felter, opsjoner og ID-er er volatile og hentes alltid
dynamisk ved kjøring. Bruk `team-status`-skillen → `references/projects-v2.md`
hvis den er synket inn (kommer via `product`-collectionen), ellers direkte:

```bash
gh project view 157 --owner navikt --format json
gh project field-list 157 --owner navikt --format json   # felt- og opsjonsnavn
gh project item-list 157 --owner navikt --format json --limit 200
```

**Aldri hardkod felt-/opsjon-ID-er.** Strukturen under er kart, ikke fasit —
verifiser navn live, de endres når noen omdøper en kolonne.

### Faner (views) — hva de er til

| Fane | Layout | Brukes til |
|------|--------|-----------|
| **Mine oppgaver** | tabell | Personlig arbeidsliste (filtrert på assignee) |
| **Alle oppgaver** | tabell | Full backlog på tvers av repoer |
| **Ukas prioriteringer** | board | **Ukentlig planlegging** — det teamet jobber med denne uka |
| **T1 - 2026 / T2 - 2026** | tabell | Tertialvisning — arbeid gruppert per tertial |
| **Til vurdering** | tabell | Ufordelte/uavklarte ting som må triages |
| **Done** | tabell | Ferdig arbeid |
| **AID-oppgaver** | roadmap | Tidslinje for AID-oppdraget |

### Felter — hva de betyr

- **Status:** `Backlog`, `Monday epics 🎯`, `Plukk meg! 🙌`, `Jeg jobbes med! ⚒️`,
  `Til diskusjon`, `AID-oppdraget`, `Done`. Flyten er typisk Backlog →
  Monday epics (ukentlig planlegging mandag) → Plukk meg! → Jeg jobbes med! → Done.
- **Priority:** `P0`, `P1`, `P2`.
- **Size:** `XS`, `S`, `M`, `L`, `XL` (grov estimering).
- **Tertial:** `T1 - 2026`, `T2 - 2026`, `T3 - 2026` — knytter arbeid til tertialet.
- **Måleparameter:** teamets **tertialmål / key results** ligger her som
  single-select-opsjoner (ikke i et eget måldokument). Les opsjonene live for å
  se gjeldende mål — de er tertial-spesifikke og endres. Drift/vedlikehold kan
  være representert både som en Måleparameter og via `BAU`-taggen.
- **Tags:** `Etterlevelse`, `BAU` (= business as usual / **drift**), `Bug`,
  `Dataretting`, `AID`, `Sommerferie`.
- **Start date / End date / Estimate:** planlegging.
- **Parent issue / Sub-issues progress:** epic → deloppgave-hierarkiet.

## Arbeidsrytme

- **Ukentlig** innenfor **tertial**: teamet planlegger per uke (`Monday epics 🎯`
  + fanen `Ukas prioriteringer`), og grupperer arbeid i tertialer via
  `Tertial`-feltet (T1/T2/T3 - 2026).
- **Mål** formaliseres som `Måleparameter`-opsjoner på tavla per tertial — bruk
  disse som rammen for prioriterings- og statusarbeid.
- **Drift/forvaltning** skilles med `BAU`-tag og er en uttalt målsetting (kapasitet
  til vedlikehold). Når du gjør OKR-/målarbeid: behandle drift som legitim
  prioritering her, ikke som noe som holdes utenfor.

## Issue-typer og hierarki

Maler i `.github/ISSUE_TEMPLATE/` (alle auto-knyttet til `navikt/157`):

- **Epic** — stor oppgave (Mål, Bakgrunn, Omfang, Deloppgaver) som brytes ned.
- **Story** — brukerrettet leveranse.
- **Task** — teknisk oppgave/vedlikehold/chore (Beskrivelse, Bakgrunn, Akseptansekriterier).
- **Feature** — ny funksjonalitet.
- **Bug** — feil.

Epics samler deloppgaver via Parent/Sub-issues. Bruk `issue-management`- og
`pull-request`-skills for selve opprettelsen og PR-kobling.

## Apper teamet eier

Autoritativ liste gruppert etter type, med forretningsbeskrivelse per repo:
**`docs/utvikling/repositories.md`**
(<https://navikt.github.io/team-esyfo/utvikling/repositories>).

Les den fila for å finne riktig repo — aldri gjett på hvilke apper teamet eier.

## Lese ekte kode fra app-repoer (read-only)

@doctor-who kjører i team-esyfo-arbeidskopien, men kan svare på spørsmål som
gjelder en konkret app (f.eks. «hva bør vi gjøre i oppfølgingsplan?») ved å hente
**ekte kode read-only** fra søsken-repoer via `gh` (bruker din innlogging).

**Default — kun lesing (`gh api` GET / `gh search code`):**

```bash
# Søk i et apprepo (iboende read-only)
gh search code --repo navikt/syfo-oppfolgingsplan-backend "BehovForOppfolging"
# Les en fil (GET — endrer ingenting)
gh api repos/navikt/syfo-oppfolgingsplan-backend/contents/README.md \
  --jq '.content' | base64 -d
```

Bruk `gh api` **kun til GET (lesing)** og `gh search code` (alltid read-only).
`gh api` er en generell REST-klient — **aldri** `-X POST/PUT/PATCH/DELETE` eller
request-body mot en annen app; det ville endre remote og bryte sideeffekt-løftet.

**Siste utvei — midlertidig klon (spør først):** trengs det bred kode-kontekst
som `gh api` GET ikke dekker, spør brukeren, klon til en unik temp-mappe og rydd
opp uansett utfall (`trap`):

```bash
dir=$(mktemp -d); trap 'rm -rf "$dir"' EXIT
gh repo clone navikt/syfo-oppfolgingsplan-backend "$dir" -- --depth 1
# ... les filer i "$dir" ...
```

Slå opp riktig repo-navn i `repositories.md` først (oppfølgingsplan finnes i flere
repoer: `syfo-oppfolgingsplan-frontend`/`-backend` er de nye, `oppfolgingsplan-*`
og `syfooppfolgingsplanservice` er eldre/under utfasing).

> **Grenser:** kun lesing fra andre repoer — `gh api` GET / `gh search code`.
> Klon kun som siste utvei, etter avklaring, til egen temp-mappe som ryddes opp.
> Aldri skrive-verb (`gh api -X POST/…`), `git push`, PR eller commit mot en
> annen app fra team-esyfo-kontekst — foreslå heller at arbeidet flyttes dit.

## Dokumentasjon — hvor og hva

Repoet er en **VitePress-wiki** (`docs/`). Legg dokumentasjon der den hører hjemme:

| Hva | Hvor |
|-----|------|
| Nytt **fagområde** i sykefraværsforløpet | `docs/omrader/<id>/` — bruk `/doc-new-area`-skillen (scaffolder side + registrerer i `areas.ts`) |
| **Teknisk** praksis / backend / frontend | `docs/utvikling/` |
| **Verktøy** og oppsett | `docs/verktoy/` |
| **Dataanalyse / design** | `docs/dataanalyse/`, `docs/design/` |
| **Domenebegrep** | `docs/ordbok.md` |
| **App-/repo-oversikt** | `docs/utvikling/repositories.md` |

For dokumentasjonsarbeid: bruk `/doc-new-area` (nytt område), `/readme-update`
(repo-dok), `/klarsprak` (språkvask) og `/create-a-skill` (ny skill). Endringer i
wikien skjer via PR — **spør først** før du oppretter PR.

## Områdeinndeling

Sykefraværsforløpet er delt i flere områder (aktivitetskrav, oppfølgingsplan,
møtebehov, …) — se **`docs/omrader/index.md`**
(<https://navikt.github.io/team-esyfo/omrader/>) for gjeldende liste. Bruk
områdene som ramme når status og prioritering skal knyttes til forløpet.

Et område har typisk en `index.md` (**brukerreisen** — hvem utløser hva, fase,
formål) og ofte en `teknisk.md` (**teknisk dybde** — systemer, repoer,
Kafka-topics). Ikke alle har `teknisk.md`, og noen har mer (f.eks.
`oppfolgingsplan/` har også `dataanalyse.md` og `dataretting.md`) — sjekk hva som
ligger i områdemappa. Les den relevante undersiden før du svarer på
områdespørsmål; det er ofte raskere og mer presist enn å lese kode.

## AID-oppdraget (dulting)

**AID** (Arbeids- og inkluderingsdepartementet) har gitt team eSyfo i oppdrag å
utforske **dulting** (nudging) for å øke etterlevelsen av regelverket. Første
leveranse er **Tiltakspakke 1 for oppfølgingsplan**: flere endringer som
A/B-testes mot en kontrollgruppe, randomisert på underenhet, med pilot i Troms
og Finnmark. Alt shippes kontinuerlig, men er skrudd **av i prod** og **på i
dev/lokal**.

**Kilde til sannhet:** wikien under **`docs/aid/`**
(<https://navikt.github.io/team-esyfo/aid/>) — `index` (oppdrag, mål,
spilleregler, A/B-design), `endringer` (funksjonelle endringer med status og
spor til tavla), `dulte-tiltak` (nudgelab-registeret) og `maaling`. Les den før
du svarer på AID-spørsmål.

**Begrepsmodell (viktig):** `tiltakspakke → dulte-tiltak (nudgelab) →
funksjonelle endringer (våre) → issues`. **Reserver «tiltak» for nudgelab sine
dulte-tiltak** — teamets eget nivå heter **funksjonelle endringer**.

**På tavla:** AID-arbeid tagges **Tag = AID**, og AID-fanen er
programoversikten (ingen topp-epic — wiki + fane er oversikten). Nye AID-issues
får Tag = AID, og `endringer`-siden lenker hver endring til sporet (epic/issue).

**Sentrale apper:** `flaggskipet` (A/B-motoren — avgjør tiltaks- vs
kontrollgruppe per underenhet), `syfo-oppfolgingsplan-frontend`/`-backend`,
`dinesykmeldte`(`-backend`) og `esyfovarsel`. Slå opp i
`docs/utvikling/repositories.md` for detaljer.

## Wiki som kunnskapsbase

`docs/`-wikien er teamets samlede kunnskap, ikke bare filene som er lenket over.
**Søk i den først** (f.eks. `grep -ri "<begrep>" docs/`) når du svarer på
teamspesifikke spørsmål, og siter den relevante siden. I tillegg til kildene over
finnes blant annet `docs/kom-i-gang.md` (onboarding, tilganger, viktigste apper)
og `docs/utvikling/` (backend/frontend bygg-kjør-linting-testing,
`beste-praksis/pull-request.md`). Oppdager du at wikien er utdatert eller mangler
noe: foreslå en oppdatering (PR — spør først).

## Domeneordbok og akronymer

Domenebegreper (39-ukersvarsel, aktivitetskrav, dialogmøte, LPS, …) er forklart
i **`docs/ordbok.md`** (<https://navikt.github.io/team-esyfo/ordbok>). Slå opp
der før du bruker et begrep — **gjett aldri** på hva et akronym betyr.

## Rapportkadens

Ikke fastsatt i denne fila ennå. Spør brukeren om teamets rapportrytme
(ukesoversikt / tertialstatus) én gang, og foreslå å legge svaret inn her.

## Slik bruker agenten denne

- **Ved oppstart** av status-, prioriterings-, mål-, discovery- eller
  dokumentasjonsarbeid: bruk denne som inngang, og les de lenkede kildene ved behov.
- **Tavlas felter/opsjoner** (inkl. Måleparameter = mål) hentes dynamisk fra
  Projects v2 — aldri hardkodet.
- **Teamspesifikke spørsmål** (område, app, praksis): søk i `docs/`-wikien først
  (`grep -ri` / les relevant `teknisk.md`), deretter app-kode ved behov.
- **App-kode** hentes read-only via `gh api`/`gh search code` når et spørsmål
  gjelder en konkret app; klon kun som siste utvei etter avklaring.
- **Mangler et felt her** (tavle-guide, kadens): spør brukeren én gang, og
  foreslå å legge svaret inn i riktig kilde (PR — spør først).

## Grenser

### ✅ Alltid
- Behandle wikien som kilden for fag/apper/ordbok og **tavla** som kilden for
  oppgaver/mål/status; denne fila er kart, ikke kopi
- Søk i `docs/`-wikien (inkl. per-område `teknisk.md`) før du svarer på
  teamspesifikke spørsmål — wikien er teamets samlede kunnskap
- Les tavlas felter/opsjoner dynamisk — aldri hardkod felt-/opsjon-ID-er
- Slå opp domenebegreper i ordboka
- Hent kode fra andre repoer **read-only** — `gh api`/`gh search code` som default

### ⚠️ Spør først
- Oppdatere denne fila eller wiki-dokumenter (via PR)
- Opprette issues eller endre tavle-felter
- Klone et annet repo lokalt (siste utvei; bruk egen temp-mappe og rydd opp)

### 🚫 Aldri
- Duplisere app-lista, ordboka eller områdene hit — pek på kilden
- Hardkode tavlas feltstruktur (ID-er, opsjon-ID-er, verbose måleparameter-tekster)
- Skrive mot en *annen* app fra team-esyfo-kontekst — `gh api -X POST/…`, push,
  PR eller commit. Kun lesing (`gh api` GET / `gh search code`)
- Gjette på domeneakronymer som står i ordboka — slå opp i stedet
