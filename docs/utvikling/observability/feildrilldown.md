# Feiloversikt

[Team eSyfo – Feiloversikt](https://grafana.nav.cloud.nais.io/d/team-esyfo-feiloversikt) svarer på **hva som feiler, når det skjer og hvordan vi undersøker et konkret forløp**. Produksjon er standard for tjenestene; `prod-gcp` og `dev-gcp` velges inne i **Feil i tjenestene**. Nettleserfeil har sin egen del med egne velgere og eksplisitt miljøkolonne.

Dashboardet er en feilsøkingsflate, ikke oversikten over all teknisk helse. Trafikk, svartid, replikaer, omstarter og køsignaler finnes i [kontrollrommet](./kontrollrom).

## Operatørflyt

Den primære, åpne delen har én rekkefølge:

1. **Loggede feil per minutt** viser utviklingen med samme enhet uansett tidsrom. **Hvor skjer feilene?** viser antall hendelser per tjeneste i hele tidsrommet som horisontale stolper.
2. **Hva feiler?** viser hendelsestype, kode og operasjon. Topp 25 beregnes separat for `error`, `critical` og `fatal`, slik at sjeldne alvorlige nivåer ikke forsvinner bak vanlige ERROR-hendelser.
3. **Konkrete feilforløp · åpne trace** gir et utvalg fra de 100 nyeste trace-koblede feilene, med valgfri HTTP-status fra tjenesten som ble kalt.
4. **Avviste API-kall · WARN** viser inntil 50 grupper separat fra ERROR. Gjentatte avvisninger kan avsløre klient- eller konfigurasjonsfeil selv om serveren avviser korrekt.

Avvisningspanelet omfatter bare `detected_level=warn|warning` med `event_type=api_request_rejected`, ikke alle WARN eller HTTP 4xx. Flaggskipet #81 leverer denne hendelsen med lukket `rejection_reason`. Manglende eller ugyldig årsak vises som **Årsak ikke oppgitt**; den underliggende verdien er `UNSPECIFIED`. Gruppelinken bevarer også avvisningsgrunnen i søket. WARN legges ikke inn i ERROR-tallene, og panelet alene beviser ikke full dekning av avvisninger i flåten.

I runtime-tabellene åpner **Undersøk** en meny:

- **Logger for denne gruppen · Explore** bevarer miljø, tidsrom og eksakt gruppering. Spørringen er ferdig; du trenger ikke skrive LogQL. Explore beholdes fordi grupperingen også støtter eldre loggformater og utledede felt.
- **Alle tjenestelogger** åpner den enklere Logs Drilldown-visningen i samme miljø og tidsrom. Denne utvider bevisst fra feilgruppen til tjenesten, slik at du kan lese sammenhengen.
- **Feil i APM** åpner tjenestens Issues-fane med riktig miljø og tidsrom. APM har egen gruppering og videre tracing; dette er ikke nødvendigvis samme feilgruppe som i tabellen.

I trace-tabellen åpner **Åpne trace** det konkrete sporet; tjenestecellen gir menyen til logger og APM. En trace-ID betyr ikke at sporet nødvendigvis er lagret eller fortsatt tilgjengelig. Tabellen er deduplisert på trace, tjeneste, feiltype, kode, operasjon og HTTP-status fra kall, men beholder ulike feil i samme trace.

I tillegg finnes:

- **Forbedre loggdata**, en sammenfoldet del som viser hendelser uten gyldig `event_type`. Disse feilene er allerede med i hovedtabellen, ikke ekstra feil. Delen arver miljø og tjeneste fra **Feil i tjenestene**.
- **Nettleserfeil · eget utvalg**, med egen inventarstyrt flatevelger og miljøvelger. Den påvirkes ikke av runtime-valgene. Standard er alle miljøer, også ukjent, med miljø oppgitt per rad.

Panelbeskrivelser og lenker til kontrakt og runbook ligger i panelmenyene. Dashboardet har ikke et stort forklaringspanel som skyver feilinformasjonen ut av første skjermbilde.

## Scope og datakilder

- Runtime-tjenestene genereres fra det [godkjente runtimeinventaret](./runtimeinventar). `active`, `migrating` og `retiring` er med; `sunset`, `retired` og eksplisitte exclusions er ute.
- Runtime-miljø er single-select uten `All`. Grafana viser `prod-gcp`/`dev-gcp`, mens Loki bruker `prod`/`dev`. Queryene bruker ankret eksaktmatch på `k8s_cluster_name`; `prod-fss` er ikke med.
- Runtimefeil kommer fra Loki-datasource `PEA2100DC89AE9FE2` og filtreres positivt på structured metadata `detected_level=error|critical|fatal`.
- Logger som browseren har videresendt via `next-logger` og merket `x_isFrontend=true`, ekskluderes både når markøren finnes som Loki-metadata og når den bare finnes i JSON-linjen. Ikke-JSON runtime-logger beholdes i trend og hovedtelling.
- Nettleserfeil kommer fra Faro-strømmen `kind=exception`. Flatevelgeren inneholder bare de fem flatene med konfigurert telemetry. `app_namespace=team-esyfo` sammen med `app_environment=prod-gcp|dev-gcp` gir verifisert miljø; manglende eller ikke-parsebare metadata beholdes som **Ukjent**. Et eksplisitt annet namespace ekskluderes.
- Trace-datakilden avledes skjult fra kjøremiljøet: `prod-gcp-tempo` (`P8A28344D07741F8D`) for prod og `dev-gcp-tempo` (`P95CC91DC09CABFC8`) for dev.
- Dashboard-UID er `team-esyfo-feiloversikt`, og ressursen skal ligge i Team eSyfo-mappen med UID `K-1b-N_4k`.

Overgangstilstander står synlig i runtime-velgeren. Det gjør at `esyfovarsel` kan følges under migreringen til `syfo-budstikka`, og at `syfobrukertilgang` beholder nødvendig kontroll frem til utfasing er fullført.

En aggregert kontroll 9. september 2026 bekreftet produksjonsmetadata for `aktivitetskrav-frontend`, `dialogmote-frontend`, `dinesykmeldte` og `syfo-oppfolgingsplan-frontend`. Samme vindu inneholdt også hendelser uten miljø, særlig fra `meroppfolging-frontend`. Derfor filtrerer vi ikke slike hendelser bort eller antar at de er fra produksjon. Nettleserens gruppelogglink bevarer både valgt feiltype og radens klassifiserte miljø.

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

Et rått loggsøk åpnes etter et eksplisitt loggvalg: **Undersøk → Logger for denne gruppen · Explore**, **Alle tjenestelogger**, eller nettleserdelens **Se logger**. Gruppelinken filtrerer på den samme, utledede feiltypen, koden og operasjonen; der er den opprinnelige `message`-teksten tilgjengelig. Kontraktsgap og nettlesergrupper har tilsvarende avgrensede lenker.

## Telling, tomt resultat og kost

Tallene er **logghendelser**, ikke unike feil, incidents eller berørte brukere. Flere logger kan tilhøre samme feilforløp. Trend og metriske Loki-queryer bruker Grafanas `$__auto`, beholder bare nødvendige labels før aggregering og begrenser trendens oppløsning til 240 datapunkter med minimumsintervall ett minutt.

- **Tom trend** betyr ingen kvalifiserende treff i søket, ikke dokumentert null feil eller frisk tjeneste. Ingen kunstig nullserie legges til. Enkeltstående målepunkter vises også uten en sammenhengende linje.
- **Tom tabell** betyr at den konkrete tabellspørringen ikke fant treff. Det beviser ikke komplett telemetry.
- **Ikke oppgitt av appen** betyr at feilhendelsen finnes, men at appen ikke sendte en brukbar feilidentitet.
- **Datasource- eller queryfeil** skal stå som feil/ukjent og må aldri tolkes som grønt.

Standard refresh er ett minutt. Intervallene 5 og 10 sekunder er fjernet. Loggdatakontrollen starter sammenfoldet med `preload=false`; nettleserfeil er en egen åpen del. Query Inspector brukes til å kontrollere kostnad og om sammenfoldede queryer faktisk utsettes.

`Topp 25 per nivå` er en prioriteringsvisning, ikke en full flåteliste. Nivå normaliseres til lowercase før gruppering, så `ERROR`, `Error` og `error` bruker samme bøtte. Velg én tjeneste når listen ikke er komplett nok.

## Dashboard som kode

Kilden ligger i `.vitepress/grafana/error-drilldown.ts`. Den reviewbare [Grafana-ressursen](/team-esyfo/grafana/team-esyfo-feiloversikt.json) genereres deterministisk og er artefakten som publiseres. Dashboardet er `editable=false`; endringer skal gå via kode og review.

Kjør fra `docs/`:

```bash
pnpm error-dashboard:test
pnpm error-dashboard:export
pnpm error-dashboard:check
node scripts/observability-query-smoke.ts
pnpm grafana-dashboard:smoke
pnpm build
```

Testene dekker panelhierarki, lokal variabelarv, separate allowlister, eksakte radlenker, klassifisering, browsermiljø og tracevalidering. Query-smoken kjører de faktiske queryene mot syntetiske Loki-hendelser, også uten JSON, uten miljø og med videresendte browserlogger. `grafana-dashboard:smoke` importerer ressursen i samme Grafana-versjon som produksjon og sammenligner ressurs, DTO, layout, `preload`, `editable` og `liveNow` semantisk. Se [designprinsippene](./dashboard-design).

Publisering til produksjons-Grafana er foreløpig manuell. Den committede JSON-filen er fasit. Før overwrite skal gjeldende live-dashboard eksporteres som rollback-kopi. Importer deretter den genererte ressursen med samme UID og mappe, hent live-ressursen tilbake og sammenlign semantisk med artefakten.

Verifiser minst:

- `prod-gcp` og `dev-gcp`, `All` og én runtime-tjeneste
- at nettleserpanelet ikke arver runtime-miljø, og at egen miljøvelger og gruppelenke bevarer prod/test/ukjent korrekt
- at første skjermbilde viser miljø, trend, feilgrupper og handling uten forklaringsvegg
- at feilgruppehandlingen åpner Explore med riktig miljø, tjeneste, type, kode og tidsrom
- at avvisningspanelet er åpent, viser WARN separat og åpner samme tjeneste, operasjon, kode og avvisningsgrunn i Explore
- at trace-tabellen har sju kolonner og ingen identiske `(trace, tjeneste, feiltype, kode, operasjon, HTTP-status fra kall)`-rader
- at loggdatakontrollen starter lukket og arver riktig runtime-utvalg når den åpnes
- Query Inspector-resultat for bytes skannet, svartid, serieantall og parserfeil i standardvinduet

Ugyldige runtime-miljøverdier skal gi no-data, aldri blande miljøer. UI-smoken beviser import og roundtrip lokalt, men produksjons-Loki må fortsatt verifiseres live.

## Referanser

- [NAIS: Opprett dashboard](https://doc.nais.io/observability/metrics/how-to/dashboard/)
- [NAIS APM: URL-kontrakt](https://doc.nais.io/observability/apm/reference/url-contract/)
- [NAIS APM: Issues og fingerprinting](https://doc.nais.io/observability/apm/reference/issues-model/)
- [Grafana: Observability as code](https://grafana.com/docs/grafana/latest/as-code/observability-as-code/)
- [Grafana: Data links](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-data-links/)
- [Grafana: Explore URL schema](https://grafana.com/docs/grafana/latest/visualizations/explore/get-started-with-explore/#generate-explore-urls-from-external-tools)
- [Grafana Loki: Query best practices](https://grafana.com/docs/loki/latest/query/bp-query/)
