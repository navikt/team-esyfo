# Legg til en god logg

Målet er enkelt: Finn hendelsen i Feiloversikt, forstå hva som skjedde i
loggene, og følg sporet videre i APM. Bruk appens eksisterende logger.

## 1. Velg ett loggpunkt og et stabilt navn

Logg der operasjonen til slutt feiler, ikke på hvert lag den passerer. Bruk
et konkret `event_type`, som `plan_creation_failed`. Legg bare til `operation`
og `error_code` når de sier noe mer. En ny hendelse i en registrert app trenger
ingen dashboardendring.

Hold verdiene i lokale konstanter eller enumverdier. Testkatalogen hentes fra
de samme konstantene, eller en test sjekker at de stemmer overens. Ikke bygg
katalogen ved å samle verdier fra loggen som skal valideres; da godkjenner den
sitt eget testresultat.

Katalogen kan være appens eksisterende konstanter; en egen JSON-fil er ikke
påkrevd. Bruker dere filbasert validering, kan `test/observability/catalog.json`
for eksempel se slik ut:

```json
{
  "event_type": ["plan_creation_failed", "api_request_rejected"],
  "operation": ["create_plan"],
  "error_code": ["NETWORK_ERROR"],
  "rejection_reason": ["ACCESS_DENIED"]
}
```

Bruk appens faktiske verdier, ikke hele eksempelsettet. Kontroller at verdier
for `event_type`, `operation`, `error_code`, `rejection_reason` og eventuell
`exception_type` finnes i appens lukkede katalog når feltene brukes. Legger dere
til et slikt felt, må den lokale testen også kontrollere katalogverdien.
Katalogen beviser ikke at en bestemt kombinasjon er riktig; det kontrollerer
testen av det konkrete feilforløpet.

## 2. Behold forklaringen

For en kontrollert nettverksfeil uten persondata bruker Pino sin vanlige
feilserializer. `err` bevarer forklaringen; gruppering trenger ikke kopiere den:

```ts
logger.error(
  {
    event_type: "plan_creation_failed",
    error_code: "NETWORK_ERROR",
    err: error,
  },
  "Kunne ikke opprette oppfølgingsplan",
);
```

Bruk ikke et vilkårlig HTTP-klientobjekt som `err`: noen klienter legger
headers, URL, request og respons på objektet. Test appens eksisterende
serializer. Når objektet ikke er trygt, logg den relevante, vurderte
diagnostikken med eksisterende logger. Ikke dropp all årsaksinformasjon.

I SLF4J/Logback sendes exception som siste argument, ikke som strukturert
dimensjon. `StructuredArguments` skal være aktivert i appens JSON-encoder:

```kotlin
import net.logstash.logback.argument.StructuredArguments.kv

log.error(
    "Kunne ikke opprette oppfølgingsplan: {} {}",
    kv("event_type", "plan_creation_failed"),
    kv("error_code", "NETWORK_ERROR"),
    exception,
)
```

For en relevant, forventet API-avvisning brukes WARN med
`event_type=api_request_rejected` og en kodeeid `rejection_reason`. Andre
WARN-logger skal ikke merkes slik for å bli synlige. Se
[hele felt- og nivåkontrakten](./runtime-feilkontrakt).

## 3. Test utdata fra loggeren

Utløs ett realistisk, kontrollert feilforløp gjennom appkoden. Fang utdata fra
den samme JSON-serializeren/encoderen som produksjon bruker, ikke bare et mock-kall
til `logger.error`. Bruk syntetiske data. Skriv eventuelt testutdata som NDJSON,
én faktisk JSON-logg per linje, til en midlertidig fil.

Kontroller i appens vanlige test:

- riktig loggnivå og nøyaktig én terminal hendelse, også med retry/propagering;
- forventet hendelse, operasjon og kode for akkurat dette feilforløpet;
- aktiv `trace_id` bevares når testen kjører i en span, uten syntetisk fallback;
- relevant melding, nettverksårsak, exception/stack og `cause` bevares;
- syntetiske persondata, token, requestvariabler og payload ikke lekker i
  **hele den serialiserte loggen**, heller ikke via exception/cause;
- schema og lokale katalogverdier godkjennes, uten typekonvertering eller
  automatisk fjerning av ugyldige felter.

**Node:** Fang en Pino-/eksisterende logger-destination, kjør appfunksjonen og
parse de serialiserte linjene. Ajv med `strict: true` og `allErrors: true` kan
validere samme schema direkte i testen.

**JVM:** Fang den faktiske Logback-encoderens utdata, for eksempel fra en
`OutputStreamAppender` med appens `LogstashEncoder`. En `ListAppender` alene
beviser ikke at JSON-feltene blir riktige. Valider JSON i eksisterende
draft-07-kompatibel testvalidator. En JVM-validator som testavhengighet krever
verken Node eller endringer i appens runtime.

Schemaet kontrollerer feltformatet. De lokale testene kontrollerer betydning,
loggnivå, antall hendelser og personvern. Kontrollen gjelder feilforløpene som
testene utløser, ikke automatisk alle logger i appen.

## 4. Kjør samme kontroll lokalt og i CI

### Anbefalt: valider direkte i eksisterende tester

Hent [schema v1.0.0](/contracts/runtime-error/v1.0.0/schema.json) én gang og
kontroller SHA-256 mot
[publiserte sjekksummer](/contracts/runtime-error/v1.0.0/SHA256SUMS.txt).
Legg schemaet og den forventede sjekksummen i appens testressurser. Testen skal
både kontrollere sjekksummen og validere de faktiske JSON-loggene.

Kjør kontrollen som del av vanlig `pnpm test --run` eller `./gradlew test`,
og la eksisterende CI kjøre den samme testen. Ingen separat CLI, loggfil eller
ny workflow er nødvendig. Validatoren er kun en testavhengighet.

Pilotene viser to konkrete oppsett (PR-er til human review):

- [narmesteleder-frontend #452](https://github.com/navikt/narmesteleder-frontend/pull/452):
  eksisterende next-logger, Ajv og appens TypeScript-konstanter.
- [esyfo-narmesteleder #520](https://github.com/navikt/esyfo-narmesteleder/pull/520):
  eksisterende Logstash-encoder, JVM-validator og lokal hendelseskatalog.

Review og commit de pinnede testressursene. Ikke hent en flytende `latest`
eller ny scriptkode fra nettet for hvert bygg. Sjekksummer oppdager endrede
bytes, men erstatter ikke kontroll av kilden ved førstegangsinnføring.
Ved oppgradering gjennomgås og oppdateres versjon, schema og sjekksum samlet.

### Alternativ: valider en loggfil med CLI

Bruk dette hvis testene allerede skriver faktiske JSON-logger til fil, eller
dere ønsker samme kommandolinjekontroll på tvers av språk. Hent også
[validate.mjs](/contracts/runtime-error/v1.0.0/validate.mjs) og den komplette
[SHA256SUMS.txt](/contracts/runtime-error/v1.0.0/SHA256SUMS.txt) til samme mappe
som schemaet. Kontroller begge filer med `shasum -a 256 -c SHA256SUMS.txt`
(Linux: `sha256sum -c SHA256SUMS.txt`) før review og commit.

Denne CLI-en krever Node 22 eller nyere og Ajv 8 som låst **dev-avhengighet**
(`pnpm add -D -E ajv@8.20.0`). Legg dette i appens vanlige test/build-kommando
etter testen som produserer loggfilen:

```sh
node test/observability/runtime-error-v1.0.0/validate.mjs \
  --catalog test/observability/catalog.json \
  --expect-count 1 \
  test-output/terminal-error.ndjson
```

`--expect-count 1` passer et scenario som skal gi én hendelse; flere testscenarier
kan valideres samlet med riktig antall. `--format json` leser én JSON-logg per
fil, også pretty-printet. Standard er NDJSON. `-` leser stdin, og flere filer
kan oppgis. Bare loggene fra de valgte scenarioene skal sendes inn, ikke en
blanding av vanlig INFO-trafikk og testutdata. Ikke filtrer bort umerkede ERROR-
logger før kontrollen; en mistet `event_type` skal få testen til å feile.

Exit-kode **0** betyr at alle hendelsene følger schema og lokal katalog,
**1** betyr ugyldige hendelser eller feil antall, og **2** betyr manglende/tom
input eller feil oppsett. Feilmeldinger viser fil, linje og felt, ikke rå
logginnhold. Tom fil blir aldri et grønt bevis på logging.

Etter deploy: åpne Feiloversikt for riktig app og tidsrom, sjekk at hendelsen
vises, følg «Se logger», og åpne en trace når aktiv tracing finnes. Logger og
spans er ulike signaler og skal ikke summeres som antall feil.

## Når oppskriften er fulgt

En kollega skal kunne legge til en relevant hendelse ved å endre appens lokale
konstanter/katalog og ett testet loggpunkt. Verken dashboardkode, nytt
bibliotek eller app-lokal scrubbingmotor skal være nødvendig.

Teknisk grunnlag: [JSON Schema om åpne og påkrevde felter](https://json-schema.org/understanding-json-schema/reference/object)
og [Ajvs validerings-API](https://ajv.js.org/guide/getting-started.html).
