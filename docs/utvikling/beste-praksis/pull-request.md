# Beste praksis for pull requests

Vi bruker [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow) som arbeidsflyt for endringer.

## Beskrivelse

Alle pull requests (PR) må ha en tydelig beskrivelse som forklarer **hva** som er endret og **hvorfor** endringen ble gjort. Det gjør det enklere for andre å lese og vurdere koden.

- **Hold PR-er små:** Forsøk å holde endringene så små og fokuserte som mulig samtidig som de leverer verdi. Store endringer er vanskeligere å gjennomgå og øker risikoen for feil.
- **Semantiske commits:** Vi oppfordrer til bruk av [Conventional Commits](https://www.conventionalcommits.org/) for å skape en ryddig og lesbar historikk.
- **Enhetstester:** Vi verdsetter høy testdekning. Enhetstester er avgjørende for å opprettholde kodekvalitet og forhindre regresjoner.

## Merge-strategi

:::tip Squash & merge
Vi bruker **Squash & Merge** for å holde historikken på main-branchen ren og lineær.
:::

## Sjekkliste før merge

- [ ] Alle kodesjekker er grønne (lint, bygg, tester)
- [ ] Koden er lesbar og hensikten er tydelig
- [ ] Ingen hemmeligheter eller personvern­sensitiv informasjon er sjekket inn
- [ ] Tester er oppdatert/lagt til (enhetstester anbefales sterkt!)
