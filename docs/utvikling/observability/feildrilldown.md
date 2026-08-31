# Feiloversikt

[Team eSyfo – Feiloversikt](https://grafana.nav.cloud.nais.io/d/team-esyfo-feiloversikt/team-esyfo-feiloversikt?orgId=1&from=now-6h&to=now&timezone=browser&var-runtime_environment=prod&var-app=$__all&var-browser_app=$__all&refresh=1m) er teamets arbeidsflate for runtimefeil. Produksjon er standard, men `prod-gcp` og `dev-gcp` velges eksplisitt. Nettleserfeil ligger i en separat, sammenfoldet del fordi browserstrømmen ennå ikke har et verifisert miljøfelt.

Dashboardet er en drilldown, ikke kontrollrommet for all teknisk helse. Tilgjengelighet, latency, saturation, restarts, Kafka-flyt og syntetiske reiser hører hjemme i [kontrollrommet](./kontrollrom).

## Operatørflyt

Den primære, åpne delen har én rekkefølge:

1. **Runtimefeil over tid** viser om feilvolumet endrer seg i valgt scope.
2. **Vanligste runtimefeil per nivå (topp 25)** viser hvor volumet kommer fra og hvilken feilidentitet og kode som er tilgjengelig. Topp-listen beregnes separat for `error`, `critical` og `fatal`.
3. **Nyeste runtimefeil med trace (maks 100)** gir konkrete forløp å undersøke videre, med valgfri HTTP-status fra tjenesten som ble kalt.

Hovedtabellen har en egen handling som åpner samme feilgruppe i Grafana Explore. Miljø, tjeneste, feiltype, kode, operasjon og tidsrom følger med; operatøren starter derfor ikke på nytt i et uavgrenset loggsøk. Trace-tabellen er deduplisert på trace, tjeneste, feiltype, kode, operasjon og HTTP-status fra kall, men beholder ulike feil i samme trace.

Den sammenfoldede raden **Datakvalitet og nettleserfeil** inneholder:

- **Loggmetadata som må forbedres**, som viser bare tjenester og hendelser uten gyldig kanonisk `event_type`.
- **Nettleserfeil**, som har sin egen inventarstyrte flatevelger inne i den sammenfoldede raden og aldri arver valgt kjøremiljø.

Panelbeskrivelser og lenker til kontrakt og runbook ligger i panelmenyene. Dashboardet har ikke et stort forklaringspanel som skyver feilinformasjonen ut av første skjermbilde.

## Scope og datakilder

- Runtime-tjenestene genereres fra det [godkjente runtimeinventaret](./runtimeinventar). `active`, `migrating` og `retiring` er med; `sunset`, `retired` og eksplisitte exclusions er ute.
- Runtime-miljø er single-select uten `All`. Grafana viser `prod-gcp`/`dev-gcp`, mens Loki bruker `prod`/`dev`. Queryene bruker ankret eksaktmatch på `k8s_cluster_name`; `prod-fss` er ikke med.
- Runtimefeil kommer fra Loki-datasource `PEA2100DC89AE9FE2` og filtreres positivt på structured metadata `detected_level=error|critical|fatal`.
- Logger som browseren har videresendt via `next-logger` og merket `x_isFrontend=true`, ekskluderes både når markøren finnes som Loki-metadata og når den bare finnes i JSON-linjen. Ikke-JSON runtime-logger beholdes i trend og hovedtelling.
- Nettleserfeil kommer fra den separate Faro-strømmen `kind=exception`. Flatevelgeren inneholder bare de fem flatene som inventaret markerer med konfigurert telemetry.
- Trace-datakilden avledes skjult fra kjøremiljøet: `prod-gcp-tempo` (`P8A28344D07741F8D`) for prod og `dev-gcp-tempo` (`P95CC91DC09CABFC8`) for dev.
- Dashboard-UID er `team-esyfo-feiloversikt`, og ressursen skal ligge i Team eSyfo-mappen med UID `K-1b-N_4k`.

Overgangstilstander står synlig i runtime-velgeren. Det gjør at `esyfovarsel` kan følges under migreringen til `syfo-budstikka`, og at `syfobrukertilgang` beholder nødvendig kontroll frem til utfasing er fullført.

## Feiltype, kode og kontraktsgap

`event_type` er den kanoniske, stabile identiteten til en logisk feilhendelse. Hovedtabellen velger feiltype i denne rekkefølgen:

1. gyldig `event_type`
2. formatvalidert legacy `event`
3. formatvaliderte exception-/error-felt som ender på `Error` eller `Exception`
4. `Ikke oppgitt av appen`

Eldre fallbackfelt beholdes midlertidig for at dashboardet skal være operativt mens appene migreres. De er ikke kontraktkonforme bare fordi formatet er gyldig. Datakvalitetspanelet skiller derfor mellom:

- **Eldre typefelt**: dashboardet måtte bruke et eldre strukturert typefelt.
- **Avvist format**: et kandidatfelt fantes, men brøt den konservative formatkontrollen.
- **Ikke oppgitt av appen**: ingen kjent identitetskandidat ble sendt.

Kode er valgfri metadata og velges separat fra `error_code`, `code`, `feilkode`, en streng uppercase legacy-kode i `type`, eller HTTP `4xx`/`5xx` fra det tvetydige legacyfeltet `status`. Manglende kode vises som `—`; den gjør ikke hendelsen til en egen feilklasse. Operasjon er også valgfri, kodeeid kontekst og vises i hovedtabellen, men er ikke en erstatning for `event_type`.

`upstream_status` er et eget, valgfritt JSON-number fra `100` til `599`. Det beskriver HTTP-responsen fra tjenesten operasjonen kalte og vises bare som **HTTP-status fra kall** i trace-tabellen. Feltet endrer ikke feiltype, kode eller gruppering i hovedtabellen. Legacy `status` fyller ikke denne kolonnen; slik unngår dashboardet å gjette om en eldre status gjelder egen respons, en upstream eller noe annet. Loki kan områdevalidere den uttrukne verdien, men producerens serialiseringstest må bevise at JSON-typen faktisk er number.

`logger_name` er fjernet fra operatørflaten. Navn som `Application` eller `ControllerExceptionHandler` forteller hvor en logglinje ble skrevet, men sjelden hva som feilet. Nye og endrede loggpunkter skal følge [runtime-feilkontrakten](./runtime-feilkontrakt), som definerer stabil hendelsestype, tillatt metadata, konformitetstest og migrering av legacylogger.

## Personvern og kardinalitet

Dashboardet returnerer bare eksplisitt utvalgte strukturerte felt. Det viser ikke rå logglinje, melding, stacktrace, request body, valideringsskjema, person-/sesjonsidentifikator eller full dynamisk URL.

Regex-validering alene beviser ikke at produsenten bruker et felt riktig. Derfor omtales legacyfeltene som **formatvaliderte**, ikke som personvernsikre. Den langsiktige garantien kommer fra den eide kontrakten, et lukket event-katalog i appen og producer-nære konformitetstester.

Browserfeltet `type` behandles strengere: bare en lukket liste med kjente JavaScript-/DOM-exceptiontyper, inkludert den live-observerte `UnhandledRejection`, vises. Alt annet og alle ikke-parsebare hendelser aggregeres som `Annen / ikke oppgitt`. Rå Faro-`value`, melding og dynamisk URL hentes ikke inn i panelet.

Trace-ID må være 32 hextegn og kan ikke være W3C/OTel sin ugyldige null-ID. ID-en skjules bak handlingen **Åpne trace**. Loki-resultatet omskrives til den validerte feiltypen før det når tabellen.

Et rått loggsøk åpnes bare etter den eksplisitte handlingen **Se logger**. Hovedtabellens Explore-lenk filtrerer på den samme, utledede feiltypen, koden og operasjonen; der er den opprinnelige `message`-teksten tilgjengelig. Kontraktsgap og browsergrupper har tilsvarende scope-korrekte lenker.

## Telling, tomt resultat og kost

Tallene er **logghendelser**, ikke unike feil, incidents eller berørte brukere. Flere logger kan tilhøre samme feilforløp. Trend og metriske Loki-queryer bruker Grafanas `$__auto`, beholder bare nødvendige labels før aggregering og begrenser trendens oppløsning til 240 datapunkter med minimumsintervall ett minutt.

- **0 i trenden** betyr at count-spørringen lyktes uten kvalifiserende treff.
- **Tom tabell** betyr at den konkrete tabellspørringen ikke fant treff. Det beviser ikke komplett telemetry.
- **Ikke oppgitt av appen** betyr at feilhendelsen finnes, men at appen ikke sendte en brukbar feilidentitet.
- **Datasource- eller queryfeil** skal stå som feil/ukjent og må aldri tolkes som grønt.

Standard refresh er ett minutt. Intervallene 5 og 10 sekunder er fjernet. Den sekundære raden starter sammenfoldet med `preload=false`; Query Inspector skal brukes ved publisering for å bekrefte om Grafana-versjonen også unngår å kjøre de sammenfoldede queryene.

`Topp 25 per nivå` er en prioriteringsvisning, ikke en full flåteliste. Nivå normaliseres til lowercase før gruppering, så `ERROR`, `Error` og `error` bruker samme bøtte. Velg én tjeneste når listen ikke er komplett nok.

## Dashboard som kode

Kilden ligger i `.vitepress/grafana/error-drilldown.ts`. Den reviewbare [Grafana-ressursen](/team-esyfo/grafana/team-esyfo-feiloversikt.json) genereres deterministisk og er artefakten som publiseres. Dashboardet er `editable=false`; endringer skal gå via kode og review.

Kjør fra `docs/`:

```bash
pnpm error-dashboard:test
pnpm error-dashboard:export
pnpm error-dashboard:check
pnpm grafana-dashboard:smoke
pnpm build
```

Testene dekker blant annet panelhierarki, sammenfoldet sekundærrad, queryshape, separate allowlister, eksakte radlenker, kanonisk/eldre/avvist/manglende klassifisering, browsercanaries, tracevalidering og fravær av råfelt. `grafana-dashboard:smoke` importerer ressursen i samme Grafana-versjon som produksjon og sammenligner ressurs, DTO, layout, `preload`, `editable` og `liveNow` semantisk.

Publisering til produksjons-Grafana er foreløpig manuell. Den committede JSON-filen er fasit. Før overwrite skal gjeldende live-dashboard eksporteres som rollback-kopi. Importer deretter den genererte ressursen med samme UID og mappe, hent live-ressursen tilbake og sammenlign semantisk med artefakten.

Verifiser minst:

- `prod-gcp` og `dev-gcp`, `All` og én runtime-tjeneste
- at nettleserpanelet og nettleserlenken ikke får kjøremiljø
- at første skjermbilde viser miljø, trend, feilgrupper og handling uten forklaringsvegg
- at feilgruppehandlingen åpner Explore med riktig miljø, tjeneste, type, kode og tidsrom
- at trace-tabellen har sju kolonner og ingen identiske `(trace, tjeneste, feiltype, kode, operasjon, HTTP-status fra kall)`-rader
- at sekundærraden starter lukket, og om queryene faktisk utsettes
- Query Inspector-resultat for bytes skannet, svartid, serieantall og parserfeil i standardvinduet

Ugyldige runtime-miljøverdier skal gi no-data, aldri blande miljøer. UI-smoken beviser import og roundtrip lokalt, men produksjons-Loki må fortsatt verifiseres live.

## Referanser

- [NAIS: Opprett dashboard](https://doc.nais.io/observability/metrics/how-to/dashboard/)
- [Grafana: Observability as code](https://grafana.com/docs/grafana/latest/as-code/observability-as-code/)
- [Grafana: Data links](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-data-links/)
- [Grafana: Explore URL schema](https://grafana.com/docs/grafana/latest/visualizations/explore/get-started-with-explore/#generate-explore-urls-from-external-tools)
- [Grafana Loki: Query best practices](https://grafana.com/docs/loki/latest/query/bp-query/)
