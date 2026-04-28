# ▶️ Bygg og kjør lokalt

:::warning Forutsetninger
- Git og GitHub-konto med tilgang til Navikt.
- Node.js (versjonen avhenger av appen du skal starte). Det er lurt å bruke en node­manager som [Mise](https://mise.jdx.dev/) for å bytte versjoner.
- pnpm (følger med Node)
- [GitHub Personal Access Token (PAT)](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages) — tokenet må settes i variabelen `NPM_AUTH_TOKEN`. Husk å aktivere SSO for Navikt!
- SSH-nøkkel for å kunne pushe til repoet.
:::

## 🚀 Kom i gang

Alle våre frontendrepoer har en [Mise](https://mise.jdx.dev)-konfigurasjonsfil (`.mise.toml`) med konfigurerte Node- og pnpm-versjon. Kjør `mise task` for å se alle tilgjengelige tasks for prosjektet.

Klon repoet:

> **Merk:** Bytt ut `[repository-name]` med navnet på ditt repository.

```bash
git clone https://github.com/navikt/[repository-name]
cd [repository-name]
```

Start lokal utviklingsserver:

```bash
mise dev
```

Applikasjonen kjører nå på `http://localhost:3000`. Husk å sjekke `basePath` for appen din i repoet!
