# Feildrilldown

[Team eSyfo – Feildrilldown](https://grafana.nav.cloud.nais.io/d/team-esyfo-error-drilldown/team-esyfo-e28093-feildrilldown?orgId=1&from=now-6h&to=now&timezone=browser&var-runtime_environment=prod&var-app=$__all&refresh=30s) er teamets felles inngang til runtimefeil. Runtime-miljø velges eksplisitt mellom `prod-gcp` og `dev-gcp`, med produksjon som standard. Dashboardet viser også browser-exceptions, men skiller dem tydelig ut fordi deres miljøscope ennå ikke er verifisert.

Dashboardet er en drilldown, ikke kontrollrommet for all teknisk helse. Tilgjengelighet, latency, saturation, restarts, Kafka-flyt og syntetiske reiser kommer i [kontrollrommet i #211](https://github.com/navikt/team-esyfo/issues/211).

## Scope og datakilder

- Tjenestevalgene genereres fra det [godkjente runtimeinventaret](./runtimeinventar). `active`, `migrating` og `retiring` er med; `sunset`, `retired` og eksplisitte exclusions er ute.
- Runtime-miljø er single-select uten `All`. Grafana viser `prod-gcp`/`dev-gcp`, mens Loki og NAIS APM bruker de interne verdiene `prod`/`dev`. Runtimequeryer bruker eksakt likhet på `k8s_cluster_name`; `prod-fss` er ikke med.
- Runtimefeil kommer fra Loki-datasource `PEA2100DC89AE9FE2` og filtreres positivt på structured metadata `detected_level=error|critical|fatal`. Logger som browseren har videresendt via `next-logger` og merket `x_isFrontend=true`, ekskluderes både når markøren finnes som Loki-metadata og når den bare finnes i JSON-linjen. Ikke-JSON runtime-logger beholdes. Det betyr ikke at alle ekskluderte logger blir Faro-exceptions.
- Browserfeil kommer fra den separate Faro-strømmen `kind=exception` der den er konfigurert. Runtime-miljø filtrerer ikke browserpanelene, og de er derfor merket `miljøscope UKJENT`.
- Tempo-datasource for trace er `P8A28344D07741F8D`.
- Dashboard-UID er `team-esyfo-error-drilldown`, og det skal ligge i Team eSyfo-mappen med UID `K-1b-N_4k`.

Overgangstilstander står synlig i tjenestevelgeren. Det gjør at `esyfovarsel` kan overvåkes under migreringen til `syfo-budstikka`, og at `syfobrukertilgang` beholder nødvendig kontroll frem til utfasing er besluttet og fullført.

## Feiltype og «Ikke oppgitt av appen»

Hovedtabellen grupperer på tjeneste, personvernsikker feiltype og kode. Det er en prioriteringsvisning, ikke en oversikt over unike feil eller incidents. Feiltype velges i denne rekkefølgen:

1. `event_type` eller `event`
2. eksplisitte exception-felt: `exception.type`, `error.type` eller `err.type`
3. `Ikke oppgitt av appen`

Kode velges separat fra `error_code`, `code` eller `feilkode`. Live-data har også vist uppercase kodeverdier som `INTERNAL_SERVER_ERROR` i top-level `type`; derfor brukes `type` bare når verdien matcher et strengt kodeformat, og aldri som generell feiltype. HTTP `4xx`/`5xx`-status er siste kodefallback.

`logger_name` brukes aldri som feiltype; navn som `Application` eller `ControllerExceptionHandler` sier hvor loggen kom fra, ikke hvilken feil som skjedde. `Ikke oppgitt av appen` betyr at logghendelsen har riktig alvorlighetsgrad, men mangler et trygt strukturert identitetsfelt. Dashboardet forsøker ikke å gjette type fra fri tekst.

Tallene i runtime- og browserpanelene er **logghendelser**, ikke unike feil, incidents eller berørte brukere. Flere logger kan tilhøre samme feilforløp eller trace. Den aggregerte signaturtabellen er derfor prioriteringsvisningen; trace-tabellen er et diagnostisk utvalg på maksimalt 100 nyeste JSON-parsebare hendelser med trace-ID.

Nye og endrede loggpunkter skal følge [runtime-feilkontrakten](./runtime-feilkontrakt), som definerer stabil hendelsestype, personvern, konformitetstest og migrering av legacylogger.

## Personvernkontrakt

Hovedoversikten viser bare allowlistede, regex-validerte tjenestenavn, feiltyper, koder og antall. Det separate dekningspanelet viser `typed`, `context_only`, `code_only`, `rejected` og `missing`. Trace-ID valideres som 32 hextegn, skjules bak handlingen og brukes bare til å åpne riktig trace. Panelene viser ikke rå logglinje, melding, stacktrace, request body, valideringsskjema, person- eller sesjonsidentifikator eller full dynamisk URL.

Trace-tabellen bruker selektiv JSON-ekstraksjon og overskriver original feillinje med den sanitiserte hendelsen før Loki returnerer resultatet. Et rått loggsøk åpnes bare etter en eksplisitt handling og avgrenses til tjenesten og dashboardets valgte tidsrom. Trace-handlingen er den eneste radhandlingen som peker på én eksakt hendelseskontekst.

Browserfeil grupperes på Faro-feltet `type`; feltet `value` hentes ikke inn i panelet. [Browserkontrakten](./browserkontrakt) kommer fra [#206](https://github.com/navikt/team-esyfo/issues/206), mens live-evidens eies av utrullingen per flate. En tom browserflate betyr derfor ikke automatisk at brukerne ikke opplever feil.

## Slik tolkes 0, tomt og ukjent

- **0 feil** betyr at count-spørringen lyktes og ikke fant kvalifiserende hendelser i valgt scope.
- **Tom tabell** betyr at den konkrete tabellspørringen ikke fant treff. Det er ikke bevis på komplett telemetry.
- **Ikke oppgitt av appen** betyr at feilhendelsen finnes, men at tjenesten ikke logger en trygg, stabil feilidentitet som dashboardet kan bruke.
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

Publisering til produksjons-Grafana er foreløpig manuell. Den committede JSON-filen er fasit; kode og artefakt kan derfor være nyere enn dashboardet som faktisk ligger i Grafana. Før en oppdatering skal gjeldende live-dashboard eksporteres som rollback-kopi. Importer deretter den genererte ressursen med samme UID og mappe, hent live-ressursen tilbake og sammenlign semantisk med artefakten.

Verifiser minst både `prod-gcp` og `dev-gcp`, `All` i tjenestevelgeren, én runtimeapp, én browserapp, en app uten browsertelemetri, et tomt tidsrom og radlenkene til APM, logger og trace. Ugyldige runtime-miljøverdier skal gi no-data, aldri blande miljøer. Bruk Query Inspector til å bekrefte eksakt `k8s_cluster_name`, både metadata- og JSON-varianten av `x_isFrontend`, at klassifiseringsspørringene returnerer uten parserfeil, og at forespørselskostnaden er akseptabel for standardtidsrommet. UI-smoken beviser import og roundtrip lokalt, men kjører ikke Loki-spørringene mot produksjonsdata.

Første publisering ble verifisert i produksjons-Grafana 28. august 2026 med eksakt generert artefakt, stabil UID og Team eSyfo-mappen. Reelle runtime- og browserhendelser bekreftet error-pathene, APM- og logglenkene åpnet riktig tjeneste og scope, og en persistiert trace-lenke åpnet riktig trace. Valg av `aktivitetskrav-backend` i samme seks-timersvindu bekreftet `0` i begge totalpanelene, `No data` i gruppetabellene og `No rows` i trace-tabellen. Reelle, sanitiserte hendelser ble brukt som sterkere integrasjonsevidens enn å skrive syntetiske feillogger til produksjon.

Etter eksplisitt teamgodkjenning ble de gamle dashboardene `eSyfo: Error details` og den uvirksomme `eSyfo: Error summary` slettet i stedet for å ligge igjen som markerte erstatningsflater. `Team eSyfo – ERROR logs` ble beholdt uendret fordi den fortsatt er i bruk.

## Referanser

- [NAIS: Opprett dashboard](https://doc.nais.io/observability/metrics/how-to/dashboard/)
- [Grafana: Observability as code](https://grafana.com/docs/grafana/latest/as-code/observability-as-code/)
- [Grafana: Data links](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-data-links/)
- [Grafana Loki: Log queries](https://grafana.com/docs/loki/latest/query/log_queries/)
