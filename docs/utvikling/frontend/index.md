# Frontend

I team eSYFO bruker vi [Next.js](https://nextjs.org/) som React-rammeverk for å utvikle webapplikasjoner. Unntaket er [microfrontends](/ordbok#microfrontend), som bygges med [Astro](https://astro.build/).

Se [repooversikten](/utvikling/repositories) for aktive frontendrepoer og eierskap.

🚀 [Bygg og kjør lokalt](./bygg-og-kjor) — Sett opp utviklingsmiljø og start appen lokalt

🧪 [Testing](./testing) — Enhetstesting med Vitest og e2e med Playwright

🧹 [Linting og formatering](./linting) — Biome for konsistent kode og automatisk formatering

🛠️ [Frontend-verktøy](./verktoy) — Nyttige extensions og utviklerverktøy

## Signalansvar i Next.js

Bruk `@nais/apm` for uventede feil og tekniske signaler i browseren. Bruk `@navikt/next-logger` for SSR, Server Components, server actions, route handlers og andre driftslogger på serveren. Browserkode kan bruke next-logger til bevisste `info`- og `warn`-hendelser med trygge, strukturerte felt.

Den samme rå `Error`-instansen skal ikke sendes eksplisitt fra flere eiere. I React 19-apper der `@nais/apm` fanger Reacts `console.error`, skal en error boundary bare vise fallback; et eksplisitt `captureException`-kall i samme boundary gir duplikater. Bruk eksplisitt `captureException` for fangede feil som ellers ikke når den globale rapporteringen. Verifiser eierskapet med en test som forventer nøyaktig én APM-hendelse, og kjør testen på nytt ved endringer i React, Next.js eller APM-integrasjonen. Fangede serverfeil logges én gang med next-logger ved ansvargrensen; ufangede feil håndteres av Next- og NAIS-instrumenteringen. Ikke logg persondata, identifikatorer i URL-er eller backend-responsbody.

Bruk `@nais/apm` fremfor rå Faro-konfigurasjon, slik at privacy-scrubbing og browseridentitet følger samme kontrakt i appene. Aktiver `tracing: true` når browser–server-korrelasjon inngår i signalbehovet, og verifiser den i dev.
