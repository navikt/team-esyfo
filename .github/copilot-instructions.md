# Team eSyfo

- Dette er teamets norske VitePress-wiki, Kotlin-notebooks og Bruno-verktøy;
  applikasjonskoden ligger i egne repoer.
- `docs/utvikling/repositories.md` er appoversikten; `docs/ordbok.md` forklarer
  domenebegrepene. Teamets oppgaver, mål og status ligger i GitHub Projects
  `navikt/157`, med felter og opsjons-ID-er som må hentes fra tavla.
- Wikiens UI er Vue i `docs/.vitepress/`. Områder og deres navigasjon kommer fra
  `docs/.vitepress/areas.ts`; forsiden `docs/index.md` har egen frontmatter.
- Bruk verktøyversjonene i `mise.toml`. Bygg wikien med `mise run wiki:build`
  (eller `pnpm --dir docs build` med avhengighetene installert). Bygget kjører
  også typesjekk, inventar-/dashboardkontroller og tester.
- Notebook-bygg: `cd notebooks && ./gradlew build --no-daemon`.
- Wikien og notebook-utdata kan publiseres; bruk syntetiske eksempler uten
  persondata, interne payloads eller innloggingsopplysninger.
