# 🤖 Hovmester

Hovmester er teamets AI-agentpipeline for assistert utvikling. Du gir én oppgave til `@hovmester`, og den koordinerer spesialiserte agenter som planlegger, implementerer og kvalitetssikrer koden.

**Repo:** [navikt/hovmester](https://github.com/navikt/hovmester)

## Agenter

- **Hovmester** 🍽️ — Orkestrator. Mottar oppgaven, delegerer og konsoliderer resultatet.
- **Souschef** 📋 — Planlegger. Utforsker kodebasen og lager implementasjonsplaner.
- **Kokk** 👨‍🍳 — Backend-utvikler. API, tjenester, database, Kafka og infrastruktur.
- **Konditor** 🎂 — Frontend-utvikler. UI, Aksel-komponenter, state og tilgjengelighet.
- **Inspektører** 🔬 — Kryssmodell-review. Opus gjennomgår GPT-kode, og GPT gjennomgår Opus-kode.
- **Designer** ✏️ — Designhjelp, Figma-skisser og visuelle konsepter.

## Bruk

Hovmester aktiveres via Copilot CLI (`@hovmester`) og delegerer oppgaver til riktig agent basert på oppgavens karakter. Én agent eier hele det vertikale funksjonssnittet (f.eks. all frontend eller all backend).

## Synkronisering til repoer

Hovmester distribuerer instruksjoner, skills og agenter til teamets repoer via en GitHub Actions-workflow. Hvert repo som bruker Hovmester har en `.github/workflows/hovmester-sync.yml` som kjører daglig og oppretter en PR hvis noe har endret seg.

Workflowen synkroniserer kun filer under `.github/` (agenter, instruksjoner, skills og issue-templates). Den endrer aldri workflows eller annen kode.

Les mer om oppsett og konfigurasjon i [Hovmester README](https://github.com/navikt/hovmester#readme).
