# Feildrilldown

[Team eSyfo – Feildrilldown](https://grafana.nav.cloud.nais.io/d/team-esyfo-error-drilldown/team-esyfo-e28093-feildrilldown?orgId=1&from=now-6h&to=now&timezone=browser&var-app=$__all&refresh=30s) er teamets felles inngang til produksjonsfeil. Den skiller mellom runtimefeil og faktiske browserfeil, og leder videre til NAIS APM, et avgrenset loggsøk og trace når en runtimehendelse har trace-ID.

Dashboardet er en drilldown, ikke kontrollrommet for all teknisk helse. Tilgjengelighet, latency, saturation, restarts, Kafka-flyt og syntetiske reiser kommer i [kontrollrommet i #211](https://github.com/navikt/team-esyfo/issues/211).

## Scope og datakilder

- Tjenestevalgene genereres fra det [godkjente runtimeinventaret](./runtimeinventar). `active`, `migrating` og `retiring` er med; `sunset`, `retired` og eksplisitte exclusions er ute.
- Runtimefeil kommer fra Loki-datasource `PEA2100DC89AE9FE2` og filtreres positivt på structured metadata `detected_level=error|critical|fatal`. Logger som browseren har videresendt via `next-logger` og merket `x_isFrontend=true`, ekskluderes fra runtimekategorien. Det betyr ikke at alle slike logger blir Faro-exceptions.
- Browserfeil kommer fra den separate Faro-strømmen `kind=exception` der den er konfigurert. Den får ikke påtvunget runtime-labels som den ikke har.
- Tempo-datasource for trace er `P8A28344D07741F8D`.
- Dashboard-UID er `team-esyfo-error-drilldown`, og det skal ligge i Team eSyfo-mappen med UID `K-1b-N_4k`.

Overgangstilstander står synlig i tjenestevelgeren. Det gjør at `esyfovarsel` kan overvåkes under migreringen til `syfo-budstikka`, og at `syfobrukertilgang` beholder nødvendig kontroll frem til utfasing er besluttet og fullført.

## Personvernkontrakt

Oversiktspanelene viser bare tjenestenavn, sikker feiltype/loggergruppe, en trace-handling og antall. Trace-ID-en skjules bak handlingen og brukes bare til å åpne riktig trace. Panelene viser ikke rå logglinje, melding, stacktrace, request body, valideringsskjema, person- eller sesjonsidentifikator eller full dynamisk URL.

Trace-tabellen bruker selektiv JSON-ekstraksjon og overskriver original feillinje med loggergruppen før Loki returnerer resultatet. Et rått loggsøk åpnes bare etter en eksplisitt handling og er alltid avgrenset til valgt rad, tjeneste og tidsrom.

Browserfeil grupperes på Faro-feltet `type`; feltet `value` hentes ikke inn i panelet. [Browserkontrakten](./browserkontrakt) kommer fra [#206](https://github.com/navikt/team-esyfo/issues/206), mens live-evidens eies av utrullingen per flate. En tom browserflate betyr derfor ikke automatisk at brukerne ikke opplever feil.

## Slik tolkes 0, tomt og ukjent

- **0 feil** betyr at count-spørringen lyktes og ikke fant kvalifiserende hendelser i valgt scope.
- **Tom tabell** betyr at den konkrete tabellspørringen ikke fant treff. Det er ikke bevis på komplett telemetry.
- **Telemetry ikke konfigurert** vises som inventargenerert dekningsgap i dashboardet.
- **Ukjent eller feil** betyr at datasource eller spørring feilet. Det skal aldri tolkes som grønt.

## Dashboard som kode

Kilden ligger i `.vitepress/grafana/error-drilldown.ts`. Den reviewbare [Grafana-ressursen](/team-esyfo/grafana/team-esyfo-error-drilldown.json) genereres deterministisk og er artefakten som publiseres.

Kjør fra `docs/`:

```bash
pnpm error-dashboard:test
pnpm error-dashboard:export
pnpm error-dashboard:check
pnpm grafana-dashboard:smoke
pnpm build
```

`error-dashboard:check` sammenligner generert og committed JSON byte for byte. CI feiler derfor dersom inventaret eller builderen endres uten at dashboardartefakten regenereres.

`grafana-dashboard:smoke` importerer både Feildrilldown og Kontrollrom i en
midlertidig lokal Grafana og sammenligner lagret ressurs og UI-DTO med de
committede artefaktene. Smoken kjører også i CI.

Før en endring publiseres, skal den importeres i Grafana uten å overskrive UID eller mappe. Verifiser minst `All`, én runtimeapp, én browserapp, en app uten browsertelemetri, et tomt tidsrom og radlenkene til APM, logger og trace.

Første publisering ble verifisert i produksjons-Grafana 28. august 2026 med eksakt generert artefakt, stabil UID og Team eSyfo-mappen. Reelle runtime- og browserhendelser bekreftet error-pathene, APM- og logglenkene åpnet riktig tjeneste og scope, og en persistiert trace-lenke åpnet riktig trace. Valg av `aktivitetskrav-backend` i samme seks-timersvindu bekreftet `0` i begge totalpanelene, `No data` i gruppetabellene og `No rows` i trace-tabellen. Reelle, sanitiserte hendelser ble brukt som sterkere integrasjonsevidens enn å skrive syntetiske feillogger til produksjon.

Etter eksplisitt teamgodkjenning ble de gamle dashboardene `eSyfo: Error details` og den uvirksomme `eSyfo: Error summary` slettet i stedet for å ligge igjen som markerte erstatningsflater. `Team eSyfo – ERROR logs` ble beholdt uendret fordi den fortsatt er i bruk.

## Referanser

- [NAIS: Opprett dashboard](https://doc.nais.io/observability/metrics/how-to/dashboard/)
- [Grafana: Observability as code](https://grafana.com/docs/grafana/latest/as-code/observability-as-code/)
- [Grafana: Data links](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-data-links/)
- [Grafana Loki: Log queries](https://grafana.com/docs/loki/latest/query/log_queries/)
