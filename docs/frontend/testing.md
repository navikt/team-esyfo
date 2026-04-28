# Testing Frontend

Vi bruker **Vitest** som testrammeverk for enhetstester i team eSYFO. Vitest er et raskt, moderne testingframework optimalisert for React-komponenter, utilities og JavaScript/TypeScript-kode.

Bruk Vitest til:
- Enhetstesting av komponenter
- Testing av utilities og helper-funksjoner
- Testing av business logic
- Snapshot-testing av komponenter

Vi ser nærmere på mulighetene i både Vitest sin [komponenttesting](https://vitest.dev/guide/browser/component-testing.html) og [React Testing Library (RTL)](https://testing-library.com/docs/react-testing-library/intro/). Vi har en antakelse at Vitest, sammen med eller uten RTL, kan dekke 90 % av vårt behov for testing.

## e2e (end to end) Testing med Playwright (Valgfritt)

Vi mener at Playwright kan være et godt verktøy for mer avanserte e2e-tester i tilfeller der det er behov for å teste mer kompleks flyt, som navigasjon via lenker, automatisering av fulle brukerreiser (f.eks. innlogging → navigering → utfylling av skjema → submit).

## Tilgjengelighetstesting

:::info Utforskes
Vi ønsker å undersøke løsninger for tilgjengelighetstesting, enten med [@axe-core/playwright](https://playwright.dev/docs/accessibility-testing) eller Vitest axe.
:::

## Ressurser

- [Vitest-dokumentasjon](https://vitest.dev/)
- [Vitest component testing](https://vitest.dev/guide/browser/component-testing.html)
- [Playwright-dokumentasjon](https://playwright.dev/)
