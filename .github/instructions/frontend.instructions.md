---
description: "VitePress and Vue documentation UI in team-esyfo"
applyTo: "docs/.vitepress/**/*.{ts,vue,css}"
---

# Documentation UI

This repository's frontend is VitePress with Vue under `docs/.vitepress/`,
not a Next.js or React application. `docs/package.json` owns dependencies and
build commands; `docs/.vitepress/config.ts` owns navigation and site config.
Reuse the existing theme/components and preserve generated inventory and
registry contracts. Validate documentation with `pnpm --dir docs build`.
Do not add application authentication, React/Aksel or survey dependencies
because another team application uses them.
