# Legg til en god logg

En god logg lar oss finne hendelsen i [Feiloversikt](./feildrilldown), forstå
årsaken og følge en trace videre i APM. Appen beholder loggeren sin.

Anbefalt oppsett er [eSyfo-bibliotekene 0.1.0](https://github.com/navikt/esyfo-observability/releases/tag/v0.1.0).
De gir typesikre, lokale hendelser og teststøtte med den eksisterende
runtime-error-kontrakten v1.0.0. En ny domenehendelse krever verken ny
bibliotekrelease eller dashboardendring.

## 1. Bruk riktig pakke

- **Node/Next, serverkode:** `@navikt/esyfo-logger` som avhengighet og
  `@navikt/esyfo-logger-testkit` kun i `devDependencies`.
- **Kotlin/SLF4J:** `no.nav.esyfo.observability:esyfo-logger` som
  `implementation` og `no.nav.esyfo.observability:esyfo-logger-testkit`
  kun som `testImplementation`.

Pinn versjon `0.1.0`, bruk appens vanlige GitHub Packages-autentisering og
verifiser bygg og tester i CI. Ingen registry-secrets skal følge appen til
produksjon. Se [installasjon og støttet oppsett](https://github.com/navikt/esyfo-observability#innføring-i-en-app)
for Node 24 / TypeScript 6 / Pino 10 og Kotlin 2.4.10 / SLF4J 2 / Java 21+.
Nettleserfeil fortsetter gjennom eksisterende APM/Faro.

## 2. Definer hendelsen der feilen eies

Logg der operasjonen til slutt feiler, ikke på hvert lag eller etter hvert
retry. Appen eier hendelsesnavn, koder, kontekst, alvorlighetsnivå og loggpunkt.
Bruk konstanter, uniontyper eller enums, aldri requestverdier eller feilmeldinger
som grupperingsnøkler. Valgfrie felt tas bare med når de tilfører noe.

**TypeScript:** Konteksttypen er appens lokale feltdefinisjon.

```ts
import { logger } from "@navikt/next-logger";
import { createEventLogger, defineEvent } from "@navikt/esyfo-logger";

const log = createEventLogger(logger);
const planHentingFeilet = defineEvent<{
  error_code: "NETWORK_ERROR" | "INVALID_RESPONSE";
}>({
  name: "plan_fetch_failed",
  level: "error",
  message: "Kunne ikke hente oppfølgingsplan",
});

// I loggpunktet, med et feilobjekt som er vurdert som egnet for logging:
log.event(planHentingFeilet, { error_code: "NETWORK_ERROR" }, error);
```

**Kotlin:** En dataklasse gir typet kontekst; loggeren er fortsatt appens SLF4J-logger.

```kotlin
import no.nav.esyfo.observability.Event
import no.nav.esyfo.observability.emit
import org.slf4j.event.Level

data class PlanHentingFeilet(val upstreamStatus: Int?)

val planHentingFeilet = Event<PlanHentingFeilet>(
    name = "plan_fetch_failed",
    level = Level.ERROR,
    message = "Kunne ikke hente oppfølgingsplan",
    errorCode = "PLAN_SERVICE_UNAVAILABLE",
    fields = mapOf("upstream_status" to { it.upstreamStatus }),
)

log.emit(planHentingFeilet, PlanHentingFeilet(503), cause = exception)
```

Utelat `upstream_status` når ingen HTTP-respons ble mottatt; JVM-adapteren
utelater feltlesere som returnerer `null`.

En relevant, faktisk API-avvisning bruker den felles `apiRequestRejected`-
definisjonen: WARN, `event_type=api_request_rejected` og en lokal, lukket
`rejection_reason`. Ikke bruk den for alle 4xx, teknisk svikt eller når en
fallback gir tilgang. Behold eksisterende HTTP-respons og feilhåndtering.

## 3. Behold diagnostikk og personvern

Send et vurdert feilobjekt separat, som i eksemplene. Biblioteket videresender
det til den eksisterende loggeren og bevarer native feilinformasjon. Det
installerer ingen encoder, scrubber eller trace-mekanisme.

Ikke send vilkårlige HTTP-klientobjekter: de kan inneholde headers, URL,
request og responsdata. Behold nyttig melding, stack, nettverksårsak og
`cause`, men bruk og test appens eksisterende serialisering og redigering.
Ikke bygg en ny generell scrubbingmotor.

**PDLs GraphQL-`errors[]` er nyttig feildiagnostikk og skal ikke fjernes ved
generell scrubbing.** PDL-data, requestvariabler og lokal personkontekst skal
ikke følge med. APMs scrubbing brukes for APM-data; den gjør ikke automatisk
rå logger trygge.

## 4. Test det appen faktisk skriver

Utløs et kontrollert feilforløp gjennom appkoden med syntetiske data. Bruk
produksjonens loggerkonfigurasjon, ikke bare en mock av et loggkall:

- **Node:** `createLogCapture` gir en destination til appens loggerfabrikk.
  Injiser loggeren i scenariet og kontroller utdata med `assertLogEvent`
  eller `assertLogEvents`. Se [Node-teststøtten](https://github.com/navikt/esyfo-observability/tree/main/packages/logger-testkit).
- **JVM:** `captureLogs` bruker appens allerede konfigurerte JSON-encoder.
  `RuntimeLogContract.forEvents` avleder katalogen fra hendelsesdefinisjonene;
  dynamiske årsakskoder gis fra lokale enums. Se [JVM-teststøtten](https://github.com/navikt/esyfo-observability/blob/main/jvm/README.md#test-faktisk-json).

Testkittene inkluderer det pinnede schemaet; hovedløypen trenger ingen
app-lokal schemakopi, Ajv-oppsett eller separat katalogfil. Kjør testene i
appens eksisterende testkommando og CI.

Kontroller i scenariet:

- riktig nivå, melding og felt, og nøyaktig én terminal hendelse;
- at vellykket fallback og kansellering ikke blir feilaktige avvisninger;
- at nødvendig diagnostikk beholdes, også i exception og `cause`;
- at aktiv trace følger det asynkrone forløpet uten hjemmelaget reserve-ID;
- at syntetiske sensitive verdier faktisk legges i inngangen, men ikke finnes
  noe sted i den serialiserte loggen.

Ikke filtrer bort umerkede feil før kontrollen. Typer og schema beviser
ikke personvern, riktig loggpunkt eller dekning av alle appens logger.
Capture beviser serialisering, ikke levering til Loki eller APM.

Pilotene [narmesteleder-frontend #452](https://github.com/navikt/narmesteleder-frontend/pull/452)
og [esyfo-narmesteleder #520](https://github.com/navikt/esyfo-narmesteleder/pull/520)
viser innføring i ekte apper. De krever fortsatt human review før merge.

## Alternativ: schema eller CLI uten biblioteket

For andre oppsett kan appens tester fortsatt validere faktisk JSON direkte
mot [schema v1.0.0](/contracts/runtime-error/v1.0.0/schema.json). Hold lokale
grupperingsverdier lukket, og kontroller dem fra kodeeide konstanter/enums,
ikke ved å samle verdier fra loggen som testes.

Filbasert validering bruker [validate.mjs](/contracts/runtime-error/v1.0.0/validate.mjs)
og [SHA256SUMS.txt](/contracts/runtime-error/v1.0.0/SHA256SUMS.txt). Hent schema,
validator og sjekksummer sammen, kontroller `shasum -a 256 -c SHA256SUMS.txt`
og review før commit. De publiserte v1-filene endres ikke; ikke hent
flytende `latest` eller ny scriptkode ved hvert bygg.

CLI-en krever Node 22+ og låst Ajv 8 som dev-avhengighet:

```sh
node test/observability/runtime-error-v1.0.0/validate.mjs \
  --catalog test/observability/catalog.json \
  --expect-count 1 \
  test-output/terminal-error.ndjson
```

Katalogfilen lister appens tillatte verdier for feltene som brukes, som
`event_type`, `operation` og `error_code`. Velg forventet antall for scenariet.
Exit-kode 0 betyr gyldige hendelser, 1 ugyldig innhold/antall og 2 tom input
eller feil oppsett. En tom fil er aldri et grønt bevis på logging.
Se [felt- og nivåkontrakten](./runtime-feilkontrakt).

Etter deploy: velg riktig app og tidsrom i Feiloversikt, følg «Se logger» og
åpne en trace når den finnes. Logghendelser og spans er ulike signaler,
ikke tall som skal summeres.
