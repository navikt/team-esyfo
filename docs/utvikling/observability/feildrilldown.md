# Feiloversikt

[Team eSyfo – Feiloversikt](https://grafana.nav.cloud.nais.io/d/team-esyfo-feiloversikt) svarer på **hva som feiler, når det skjer og hvordan vi undersøker et konkret forløp**. Produksjon er standard for tjenestene; `prod-gcp` og `dev-gcp` velges inne i **Feil i tjenestene**. Nettleserfeil har sin egen del med egne velgere og eksplisitt miljøkolonne.

Dashboardet er en feilsøkingsflate, ikke oversikten over all teknisk helse. Trafikk, svartid, replikaer, omstarter og køsignaler finnes i [kontrollrommet](./kontrollrom).

## Operatørflyt

Den primære, åpne delen har én rekkefølge:

1. **Loggede feil per minutt** viser utviklingen med samme enhet uansett tidsrom. **Hvor skjer feilene?** viser antall hendelser per tjeneste i hele tidsrommet som horisontale stolper.
2. **Hva feiler?** prioriterer tjeneste og hendelse. **Kode og operasjon** samler kode og operasjon når de tilfører informasjon. CRITICAL og FATAL fremgår også der. Topp 25 beregnes separat per nivå, slik at sjeldne alvorlige nivåer ikke forsvinner bak vanlige ERROR-hendelser. En tjenestestolpe åpner tjenestens feilgrupper.
3. **Siste feil med trace · valgt tjenesteutvalg** gir et utvalg fra de 100 nyeste trace-koblede feilene. Dette er ikke forløp for en valgt rad i tabellen over; bruk radens **Vis hendelser** for den gruppens hendelser.
4. **Registrerte API-avvisninger · WARN** viser inntil 50 grupper separat fra ERROR, med avvisningsgrunn først og kode/operasjon samlet under **Detaljer**. Gjentatte avvisninger kan avsløre klient- eller konfigurasjonsfeil selv om serveren avviser korrekt.

Avvisningspanelet omfatter `detected_level=warn|warning` med `event_type=api_request_rejected`, ikke alle WARN eller HTTP 4xx. Flaggskipet #81 leverer denne hendelsen med lukket `rejection_reason`. Manglende eller ugyldig årsak får samme verdi, **Årsak ikke oppgitt**, i både grupperingen og loggsøket. Gruppelinken bevarer også avvisningsgrunnen i søket. WARN legges ikke inn i ERROR-tallene, og panelet alene beviser ikke full dekning av avvisninger i flåten.

En avgrenset overgangsleser gjenkjenner også den kodeeide meldingen `System user does not have access to nav_syfo_oppgi-narmesteleder resource`, bare for `esyfo-narmesteleder` og bare på WARN. Den vises som **Systembrukertilgang ikke innvilget**. Rå melding og identifikatorer returneres ikke til panelet. En hendelse som også har kanonisk `api_request_rejected`, telles bare én gang med den kanoniske årsaken. Produsentkontrakt og funksjonell avklaring følges i [esyfo-narmesteleder #516](https://github.com/navikt/esyfo-narmesteleder/issues/516); overgangsleseren kan fjernes når kontrakten og nødvendig historikk tillater det. Avvisningen beviser ikke i seg selv manglende delegering: PDPs `Deny`, `NotApplicable` og `Indeterminate` blir i dag samme boolean-resultat.

I **Hva feiler?** åpner **Vis hendelser** detaljvisningen for samme miljø, tidsrom, tjeneste, hendelse, kode, operasjon og nivå. Den viser de konkrete tekniske feltene appen har oppgitt: avhengighet, HTTP-status, exceptiontype, årsakstype, SQLState og jobbnavn. Status og exceptiontype vises sammen når begge finnes. Feltene beskriver observasjoner; dashboardet lager ingen egen feilklassifisering eller vurdering av rotårsak.

**Konkrete hendelser · med og uten trace** viser de 50 nyeste treffene i gruppen. Herfra finnes tre måter å undersøke videre:

- **Logger rundt hendelsen** åpner alle nivåer for samme tjeneste fra to minutter før til to minutter etter hendelsens tidspunkt. Dette fungerer uten trace. Vinduet kan også inneholde andre samtidige forløp.
- **Logger med samme trace** følger en gyldig trace-ID på tvers av teamets tjenester og loggnivåer innenfor det valgte tidsrommet. Dermed kan også INFO og WARN før terminalfeilen gi sammenheng. **Åpne trace** åpner selve sporet i valgt Tempo-datakilde når det er samplet, eksportert og fortsatt lagret.
- **Rålogger for gruppen** er det avanserte søket etter alle hendelser i den opprinnelige feilgruppen. Den lange kompatibilitetsspørringen starter sammenfoldet i Explore, slik at resultatet får plassen. Lenken finnes på hendelsesradene og åpner hele gruppen, ikke bare den ene hendelsen.

Detaljvisningens **Alle tjenestelogger** åpner Logs Drilldown i samme miljø og tidsrom. **Feil for denne tjenesten** åpner oversikten for tjenesten som undersøkes. Nettleserens tilbakeknapp tar deg tilbake til det opprinnelige tjenesteutvalget. Kontraktsgap og API-avvisninger beholder egne presise gruppesøk og snarveier til logger/APM.

Trace-tabellen på hovedoversikten er deduplisert på trace, tjeneste, feiltype, kode, operasjon og HTTP-status fra kall. En trace-ID beviser ikke at sporet er lagret. Manglende trace skjuler heller ikke hendelsene i detaljvisningen.

Hjelpefeltene som spørringen beregner, fjernes fra Explore-resultatet etter at gruppen er filtrert. Den opprinnelige logglinjen, appens feildiagnostikk, podmetadata og trace-ID beholdes. Dette er opprydding i visningen, ikke scrubbing av loggene.

Tabellene er tilpasset en laptop på 1366–1440 px, også med Grafana-menyen åpen. Feilgrupper, avvisninger og trace-tabell har fem synlige kolonner og intern scrolling fremfor mange små sider. Støttefelter skjules bare i tabellen; presise lenker beholder dem.

I tillegg finnes:

- **Forbedre loggdata** viser hendelser uten gyldig `event_type`. Disse hendelsene er allerede med i hovedtabellen, ikke ekstra feil. Delen starter sammenfoldet og arver miljø og tjeneste.
- **Nettleserfeil · eget utvalg**, med egen inventarstyrt flatevelger og miljøvelger. Den påvirkes ikke av runtime-valgene. Standard er alle miljøer, også ukjent, med miljø oppgitt per rad.

Nettlesertabellen grupperer på brede JavaScript-typer som `Error`, ikke på rotårsak. **Se logger** finner radens nøyaktige tjeneste, miljø og type. **APM · alle typer (ukjent miljø → alle)** åpner flatens egne feilgrupper, alle typer, i samme miljø og tidsrom. For **Ukjent** åpnes alle miljøer; dashboardet gjetter ikke produksjon. APMs gruppering gjenbrukes i stedet for en ny fingerprint-løsning i teamets dashboard.

Panelbeskrivelser og lenker til kontrakt og runbook ligger i panelmenyene. Dashboardet har ikke et stort forklaringspanel som skyver feilinformasjonen ut av første skjermbilde.

## Scope og datakilder

- Runtime-tjenestene genereres fra det [godkjente runtimeinventaret](./runtimeinventar). `active`, `migrating` og `retiring` er med; `sunset`, `retired` og eksplisitte exclusions er ute.
- Runtime-miljø er single-select uten `All`. Grafana viser `prod-gcp`/`dev-gcp`, mens Loki bruker `prod`/`dev`. Queryene bruker ankret eksaktmatch på `k8s_cluster_name`; `prod-fss` er ikke med.
- Runtimefeil kommer fra Loki-datasource `PEA2100DC89AE9FE2` og filtreres positivt på structured metadata `detected_level=error|critical|fatal`.
- Logger som browseren har videresendt via `next-logger` og merket `x_isFrontend=true`, ekskluderes både når markøren finnes som Loki-metadata og når den bare finnes i JSON-linjen. Ikke-JSON runtime-logger beholdes i trend og hovedtelling.
- Nettleserfeil kommer fra Faro-strømmen `kind=exception`. Flatevelgeren inneholder bare de fem flatene med konfigurert telemetry. `app_namespace=team-esyfo` sammen med `app_environment=prod-gcp|dev-gcp` gir verifisert miljø; manglende eller ikke-parsebare metadata beholdes som **Ukjent**. Et eksplisitt annet namespace ekskluderes.
- Trace-datakilden avledes skjult fra kjøremiljøet: `prod-gcp-tempo` (`P8A28344D07741F8D`) for prod og `dev-gcp-tempo` (`P95CC91DC09CABFC8`) for dev.
- Dashboard-UID er `team-esyfo-feiloversikt`, og ressursen skal ligge i Team eSyfo-mappen med UID `K-1b-N_4k`.

Overgangstilstander står synlig i runtime-velgeren. Det gjør at `esyfovarsel` kan følges under migreringen til `syfo-budstikka`.

En aggregert kontroll 9. september 2026 bekreftet produksjonsmetadata for `aktivitetskrav-frontend`, `dialogmote-frontend`, `dinesykmeldte` og `syfo-oppfolgingsplan-frontend`. Samme vindu inneholdt også hendelser uten miljø, særlig fra `meroppfolging-frontend`. Derfor filtrerer vi ikke slike hendelser bort eller antar at de er fra produksjon. Nettleserens gruppelogglink bevarer både valgt feiltype og radens klassifiserte miljø.

Grafanas radlenker bruker cellens formaterte verdi. Derfor lages **Produksjon**, **Test** og **Ukjent** i den felles LogQL-pipelinen, ikke som separate value mappings i panelet. Telling og loggsøk matcher dermed samme verdi. Miljøvelgeren filtrerer fortsatt på normalisert `prod-gcp`, `dev-gcp` og `ukjent`.

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

`upstream_status` er et eget, valgfritt JSON-number fra `100` til `599`. Det beskriver HTTP-responsen fra tjenesten operasjonen kalte og vises i hendelseslisten og trace-tabellens detaljer. Feltet endrer ikke feiltype, kode eller gruppering i hovedtabellen. Legacy `status` brukes ikke som HTTP-status fra kall; slik unngår dashboardet å gjette om en eldre status gjelder egen respons, en upstream eller noe annet. Loki kan områdevalidere den uttrukne verdien, men producerens serialiseringstest må bevise at JSON-typen faktisk er number.

`logger_name` er fjernet fra operatørflaten. Navn som `Application` eller `ControllerExceptionHandler` forteller hvor en logglinje ble skrevet, men sjelden hva som feilet. Nye og endrede loggpunkter skal følge [runtime-feilkontrakten](./runtime-feilkontrakt), som definerer stabil hendelsestype, tillatt metadata, konformitetstest og migrering av legacylogger.

## Personvern og kardinalitet

Dashboardet returnerer bare eksplisitt utvalgte strukturerte felt. Det viser ikke rå logglinje, melding, stacktrace, request body, valideringsskjema, person-/sesjonsidentifikator eller full dynamisk URL.

Regex-validering alene beviser ikke at produsenten bruker et felt riktig. Derfor omtales legacyfeltene som **formatvaliderte**, ikke som personvernsikre. Den langsiktige garantien kommer fra den eide kontrakten, et lukket event-katalog i appen og producer-nære konformitetstester.

Browserfeltet `type` behandles strengere: bare en lukket liste med kjente JavaScript-/DOM-exceptiontyper, inkludert den live-observerte `UnhandledRejection`, vises. Alt annet og alle ikke-parsebare hendelser aggregeres som `Annen / ikke oppgitt`. Rå Faro-`value`, melding og dynamisk URL hentes ikke inn i panelet.

Trace-ID må være 32 hextegn og kan ikke være W3C/OTel sin ugyldige null-ID. ID-en skjules bak handlingen **Åpne trace**. Loki-resultatet omskrives til den validerte feiltypen før det når tabellen.

Et rått loggsøk åpnes etter et eksplisitt loggvalg: **Vis hendelser → Rålogger for gruppen**, **Alle tjenestelogger**, eller nettleserdelens **Se logger**. Gruppelinken filtrerer på den samme, utledede feiltypen, koden og operasjonen; der er den opprinnelige `message`-teksten tilgjengelig. Kontraktsgap og nettlesergrupper har tilsvarende avgrensede lenker.

For nye loggpunkter: følg [Legg til en god logg](./gode-logger). Samme versjonerte JSON Schema testes mot appens faktiske serialiserte logger i CI. Det erstatter ikke tester av riktig loggnivå, nyttig diagnostikk og fravær av persondata.

## Telling, tomt resultat og kost

Tallene er **logghendelser**, ikke unike feil, incidents eller berørte brukere. Flere logger kan tilhøre samme feilforløp. Trend og metriske Loki-queryer bruker Grafanas `$__auto`, beholder bare nødvendige labels før aggregering og begrenser trendens oppløsning til 240 datapunkter med minimumsintervall ett minutt.

- **Tom trend** betyr ingen kvalifiserende treff i søket, ikke dokumentert null feil eller frisk tjeneste. Ingen kunstig nullserie legges til. Enkeltstående målepunkter vises også uten en sammenhengende linje.
- **Tom tabell** betyr at den konkrete tabellspørringen ikke fant treff. Det beviser ikke komplett telemetry.
- **Ikke oppgitt av appen** betyr at feilhendelsen finnes, men at appen ikke sendte en brukbar feilidentitet.
- **Datasource- eller queryfeil** skal stå som feil/ukjent og må aldri tolkes som grønt.

Standard refresh er ett minutt. Intervallene 5 og 10 sekunder er fjernet. Loggdatakontrollen starter sammenfoldet med `preload=false`; nettleserfeil er en egen åpen del. Query Inspector brukes til å kontrollere kostnad og om sammenfoldede queryer faktisk utsettes.

`Topp 25 per nivå` er en prioriteringsvisning, ikke en full flåteliste. Nivå normaliseres til lowercase før gruppering, så `ERROR`, `Error` og `error` bruker samme bøtte. Velg én tjeneste når listen ikke er komplett nok.

## Kort kollegatest

Bruk en vanlig laptop, gjerne 1366 × 768, og et tidsrom med kjente hendelser:

1. Finn en tjeneste i Kontrollrommet. Åpne **Undersøk tjenesten**, deretter **Feiloversikt**. Tjeneste og tidsrom skal følge med. Topplenken **Alle tjenesters feil** utvider bevisst til alle.
2. Velg **Vis hendelser** på en feilgruppe. Sjekk samme identitet og tidsrom, og at de konkrete tekniske feltene er lesbare før avansert loggsøk. Finn en hendelse uten trace og åpne logger rundt tidspunktet.
3. Velg **Logger med samme trace** på en trace. Sjekk at også andre nivåer og relevante tjenester blir med. Åpne et lagret spor når det finnes. Sammenlign med hovedoversiktens trace-tabell, som er et utvalg for tjenestene.
4. Finn en nettleserrad. Sjekk at **Se logger** finner den samme typen og miljøet. APM-valget utvider til alle typer; en rad med ukjent miljø skal ikke påstå produksjon.
5. Finn en historisk omstart. Podlenken skal beholde pod og tidsrom. Manglende logger eller avslutningsårsak skal ikke tolkes som null omstarter. Sammenlign et tidsrom uten data: ukjent/ingen treff skal ikke se ut som bekreftet frisk drift.

Noter forventning, faktisk resultat og en lenke med tidsrom hvis noe er uklart. Dette er en test av observability-løsningen; feilene den avdekker prioriteres separat.

## Dashboard som kode

Kildene ligger i `.vitepress/grafana/error-drilldown.ts`, `error-details.ts` og `error-diagnostics.ts`. De reviewbare ressursene [Feiloversikt](/team-esyfo/grafana/team-esyfo-feiloversikt.json) og [Feildetaljer](/team-esyfo/grafana/team-esyfo-feildetaljer.json) genereres deterministisk og publiseres sammen. Dashboardet er `editable=false`; endringer skal gå via kode og review.

Kjør fra `docs/`:

```bash
pnpm error-dashboard:test
pnpm error-dashboard:export
pnpm error-dashboard:check
node scripts/observability-query-smoke.ts
pnpm grafana-dashboard:smoke
pnpm build
```

Testene dekker panelhierarki, lokal variabelarv, separate allowlister, eksakte radlenker, klassifisering, browsermiljø og tracevalidering. Query-smoken kjører de faktiske queryene mot syntetiske Loki-hendelser, også uten JSON, uten miljø og med videresendte browserlogger. Den følger dessuten hver aggregert feil-, avvisnings-, kontraktsgap- og nettleserrad til det genererte loggsøket og krever samme antall treff. En separat test hindrer at tekstendrende value mappings bryter radlenkene. Smoken tester også HTTP og exceptiontype på samme hendelse uten trace, originale exceptiontyper og SQLState, manglende tekniske felt, diagnostikkcanaries, tidsvindu rundt hendelser og trace på tvers av tjenester. Dette erstatter ikke en faktisk klikkontroll i Grafana. `grafana-dashboard:smoke` importerer ressursen i samme Grafana-versjon som produksjon og sammenligner ressurs, DTO, layout, `preload`, `editable` og `liveNow` semantisk. Se [designprinsippene](./dashboard-design).

Publisering til produksjons-Grafana er foreløpig manuell. De committede JSON-filene er fasit. Importer den nye detaljressursen før oversikten, slik at første-klikk-lenken virker hele tiden. Før overwrite skal gjeldende live-dashboard eksporteres som rollback-kopi. Importer deretter den genererte ressursen med samme UID og mappe, hent live-ressursen tilbake og sammenlign semantisk med artefakten.

Verifiser minst:

- `prod-gcp` og `dev-gcp`, `All` og én runtime-tjeneste
- at nettleserpanelet ikke arver runtime-miljø, og at egen miljøvelger og gruppelenke bevarer prod/test/ukjent korrekt
- at første skjermbilde viser miljø, trend, feilgrupper og handling uten forklaringsvegg
- at feilgruppehandlingen åpner Feildetaljer med riktig miljø, tjeneste, type, kode, operasjon, nivå og tidsrom
- at HTTP-status og teknisk årsak er synlige uten trace, at kontekstlenken bruker hendelsens tidspunkt, og at Explore-queryen starter sammenfoldet
- at avvisningspanelet er åpent, viser WARN separat og åpner samme tjeneste, operasjon, kode og avvisningsgrunn i Explore
- at trace-tabellen har fem synlige kolonner og ingen identiske `(trace, tjeneste, feiltype, kode, operasjon, HTTP-status fra kall)`-rader
- at loggdatakontrollen starter lukket og arver riktig runtime-utvalg når den åpnes
- Query Inspector-resultat for bytes skannet, svartid, serieantall og parserfeil i standardvinduet

Ugyldige runtime-miljøverdier skal gi no-data, aldri blande miljøer. UI-smoken beviser import og roundtrip lokalt, men produksjons-Loki må fortsatt verifiseres live.

For en lokal klikkontroll med bare syntetiske data, start `node scripts/observability-query-smoke.ts --preview`. Bruk den utskrevne adressen som `LOKI_PREVIEW_URL` når du starter `node scripts/grafana-dashboard-smoke.ts --preview` i en annen terminal. Grafana bindes til loopback med anonym lesetilgang. Stopp begge prosessene etter kontrollen; testcontainerne ryddes da bort.

## Referanser

- [NAIS: Opprett dashboard](https://doc.nais.io/observability/metrics/how-to/dashboard/)
- [NAIS APM: URL-kontrakt](https://doc.nais.io/observability/apm/reference/url-contract/)
- [NAIS APM: Issues og fingerprinting](https://doc.nais.io/observability/apm/reference/issues-model/)
- [Grafana: Observability as code](https://grafana.com/docs/grafana/latest/as-code/observability-as-code/)
- [Grafana: Data links](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-data-links/)
- [Grafana: Explore URL schema](https://grafana.com/docs/grafana/latest/visualizations/explore/get-started-with-explore/#generate-explore-urls-from-external-tools)
- [Grafana Loki: Query best practices](https://grafana.com/docs/loki/latest/query/bp-query/)
