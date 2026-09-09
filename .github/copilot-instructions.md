# Team eSyfo — fellesrepo

Dette er **team-esyfos fellesrepo**: dokumentasjon (VitePress-wiki), verktøy og
notebooks for **ekstern sykefraværsoppfølging i Nav**. Det er *ikke* en enkelt
applikasjon — applikasjonskoden bor i teamets egne app-repoer.

Wiki: <https://navikt.github.io/team-esyfo/>

## Hva ligger hvor

| Område | Sti | Merk |
|---|---|---|
| Dokumentasjon (wiki) | `docs/` | VitePress. Norsk. Kilden til sannhet for team-kunnskap |
| Teamets app-/repo-oversikt | `docs/utvikling/repositories.md` | Autoritativ liste — slå opp her, gjett aldri på hvilke repoer teamet eier |
| Områdeinndeling (sykefraværsforløpet) | `docs/omrader/index.md` | Åtte områder fra tidlig til sen fase |
| Domeneordbok | `docs/ordbok.md` | Slå opp begreper/akronymer her — **gjett aldri** |
| Kotlin-notebooks | `notebooks/` | Dataanalyse og utforsking |
| API-testing (Bruno) | `tools/bruno/` | Lokal testing av tjenester |

## Domenespråk

Sykefraværsdomenet har mange spesifikke begreper (39-ukersvarsel, aktivitetskrav,
dialogmøte, LPS, nærmeste leder, …). Slå alltid opp i `docs/ordbok.md` før du
bruker et begrep, og **gjett aldri** på hva et akronym betyr.

## Lokal teamkontekst og felles metode

- Last den repo-eide `team-kontekst`-skillen ved status-, prioriterings-, mål-,
  discovery- og dokumentasjonsarbeid. Den peker på tavle, app-liste, ordbok,
  områder og kadens. Hent volatile verdier fra kildene den navngir.
- Felles agentroller og skills leveres av Grillmester-pakken via nav-pilot.
  Velg agent og eksakt skill-ID fra klientens aktive oversikt; en lokal kilde
  med samme ID kan overstyre pluginen.
- Bruk og ansvar er forklart i `docs/verktoy/grillmester.md`.

## Konvensjoner

- **Norsk** i dokumentasjon, issues og brukerrettet tekst.
- Dette repoet eier `.github/copilot-instructions.md`, path-instruksjoner,
  issue-/PR-maler og de lokale skillsene `team-kontekst` og `doc-new-area`.
  Vedlikehold fakta her når et autorisert oppdrag gjør dem utdaterte. Ikke
  kopier felles pluginroller eller skills inn i repoet.
- Dokumentendringer følger VitePress-strukturen under `docs/`. Bruk
  `doc-new-area` når et nytt fagområde skal dokumenteres. Felles metoder som
  `readme-update` og `klarsprak` må lastes fra den aktive skilloversikten.
- Dokumentasjon bygges med `pnpm --dir docs build`; `docs/package.json`
  inneholder verifikasjonene. Oppdater lenker og navigasjon ved flytting av sider.
