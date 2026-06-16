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

## Agenter og produktledelse

- **@doctor-who** 🕰️ er teamets produktleder-agent — teamstatus, prioritering,
  OKR, workshops/retro og discovery. Den leser den lokale **`team-kontekst`**-
  skillen (`.github/skills/team-kontekst/`) ved oppstart; den er teamets
  autoritative oppsett (tavle, app-liste, ordbok, områder, kadens).
- Teamets prosjekttavle: `navikt/157` (autoritativ kilde: `team-kontekst`-skillen).
- Øvrige agenter (hovmester, souschef, kokk, konditor, inspektører, designer,
  barista) er dokumentert i `docs/verktoy/hovmester.md`.

## Konvensjoner

- **Norsk** i dokumentasjon, issues og brukerrettet tekst.
- `.github/` (agenter, instruksjoner, skills, issue-templates) synkroniseres fra
  [navikt/hovmester](https://github.com/navikt/hovmester) via
  `hovmester-sync.yml`. **Rediger ikke synkede filer for hånd** — endre dem i
  hovmester. Lokale, ikke-synkede skills (som `team-kontekst`) eies av dette
  repoet og overlever sync.
- Dokumentendringer: følg eksisterende VitePress-struktur under `docs/`.
