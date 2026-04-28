# Beste praksis for pull requests

Alle pull requests (PR) må ha en tydelig beskrivelse som forklarer **hva** som er endret og **hvorfor** endringen ble gjort. Det gjør det enklere for andre å lese og vurdere koden. Den enkleste måten å få dette til på er å først opprette en issue med Copilot. Bruk også Copilot til å opprette PR, da får du en beskrivelse automatisk.

- **Hold PR-er små:** Forsøk å holde endringene så små og fokuserte som mulig samtidig som de leverer verdi. Store endringer er vanskeligere å gjennomgå og øker risikoen for feil.
- **Semantiske commits:** Vi oppfordrer til bruk av [Conventional Commits](https://www.conventionalcommits.org/) for å skape en ryddig og lesbar historikk.
- **Enhetstester:** Vi verdsetter høy testdekning. Enhetstester er avgjørende for å opprettholde kodekvalitet og forhindre regresjoner.
- **Copilot**: La Copilot gjøre en gjennomgang. Brukk grillskill av hovedmester i tillegg.

## Merge-strategi

:::tip Squash & merge
Vi bruker **Squash & Merge** for å holde historikken på main-branchen ren og lineær.
:::

## Sjekkliste før merge

- [ ] Alle kodesjekker er grønne (lint, bygg, tester)
- [ ] Koden er lesbar og hensikten er tydelig
- [ ] Ingen hemmeligheter eller *personvern­sensitiv* informasjon er sjekket inn
- [ ] Tester er oppdatert/lagt til (enhetstester anbefales sterkt!)
