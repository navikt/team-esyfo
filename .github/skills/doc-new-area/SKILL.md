---
name: doc-new-area
description: "Opprett et nytt fagområde i Team eSyfos VitePress-wiki med brukerreise, teknisk side og områderegistrering."
---

# Nytt fagområde

- Les en relevant nabo under `docs/omrader/` og typen `Area` i
  `docs/.vitepress/areas.ts` før du oppretter området.
- Bruk en ASCII-slug under `docs/omrader/<id>/`. Beskriv formål og brukerreise i
  `index.md`, og systemer, dataflyt og eventuelle Kafka-topics i `teknisk.md`.
  Hent repoer og domenebegreper fra `docs/utvikling/repositories.md` og
  `docs/ordbok.md`; ta bare med bekreftede demo-/Storybook-lenker.
- Registrer området i `areas.ts` med `id`, `name`, `emoji`, `phase`,
  `description`, `path` og relevante `subpages`. Tillatte faser er `early`,
  `mid`, `late` og `continuous`; sidebaren bygges fra dette registeret.
- Vurder også forsiden `docs/index.md`: frontmatter oppdateres ikke fra
  `areas.ts`. Tilpass den dersom det nye området endrer forsideoversikten.
- Kjør `pnpm --dir docs build` og kontroller de nye sidene og navigasjonen.
