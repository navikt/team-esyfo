# Runtime-feilkontrakt

Denne kontrakten definerer den minste kontraktkonforme errorloggen som gjør en
runtimefeil grupperbar i [Feiloversikt](./feildrilldown). Den gjelder nye og
endrede errorlogger i Team eSyfos Node- og JVM-apper.

## Feltkontrakt

| Felt | Krav | Semantikk |
|---|---|---|
| `event_type` | Obligatorisk | Kodeeid, stabil hendelsestype fra et lukket sett, for eksempel `graphql_request_failed`. Maks 80 tegn og format `^[a-z][a-z0-9_.-]{0,79}$`. Verdien skal aldri bygges fra runtime-data. |
| `error_code` | Valgfritt | Stabil enum-/protokollkode, for eksempel `INTERNAL_SERVER_ERROR`. Ikke exception-melding eller ekstern respons. |
| `operation` | Valgfritt | Stabil logisk operasjon fra et lukket sett, for eksempel `sykmelding_by_id`. Bruk aldri rått GraphQL-navn, URL, path med ID eller query-parametre. |
| `upstream_status` | Valgfritt | HTTP-status fra tjenesten operasjonen kalte, som JSON-number fra og med `100` til og med `599`. Feltet er diagnostisk kontekst, ikke feiltype eller `error_code`, og utelates når det ikke kom en HTTP-respons. |
| `exception_type` | Valgfritt | Kun normalisert, kodeeid type-/klassenavn fra et lukket sett, for eksempel `IllegalStateException` eller `TypeError`; aldri ukontrollert `error.name`, melding eller stack. |
| `logger_name` | Valgfritt | Frameworkets stabile loggernavn. JVM-encoder fyller ofte dette automatisk; fravær i Node er normalt. |
| `trace_id` | Påkrevd når tracing finnes | W3C/OTel trace-ID fra aktiv span. Ikke generer en erstatning og ikke bruk domene-, person- eller request-ID. |

Miljø, tjeneste, namespace og cluster kommer fra plattformlabels som
`k8s_cluster_name`, `service_name` og `service_namespace`. Appen skal ikke
duplisere dem i loggpayloaden.

## Eierskap og leveransemodell

`team-esyfo` eier den normative, funksjonelle kontrakten, migreringsstatusen og
dashboardtolkningen. Runtimeinventar, dashboardkilder, alert-register og
runbooks blir også her, fordi de utgjør teamets operative kontrollplan. Et
senere verktøyrepo er ikke et nytt hjem for «all observability».

Hvert apprepo eier sitt eget lukkede sett av `event_type`-verdier og
konformitetstestene ved de faktiske loggpunktene. En ny domenespesifikk
hendelsestype skal derfor ikke kreve release av en sentral runtimepakke.

Første utrulling bruker appenes eksisterende Pino- og SLF4J/Logback-API-er. Det
publiseres ikke en npm- eller Maven-runtimeavhengighet før minst én Node- og én
JVM-pilot har bevist et stabilt felles adaptergrensesnitt. Når den repeterte
mekanikken er kjent, flyttes maskinlesbart schema, generator, reusable
GitHub Action og eventuelle buildverktøy til et eget observability-repo. Dette
repoet skal da være eneste kilde for de kjørbare artefaktene, mens `team-esyfo`
beholder funksjonell dokumentasjon, dashboard og en pinnet kontraktversjon.

Målbildet er schema-first med genererte lokale TS-/Kotlin-typer og validering av
faktisk serialisert JSON i CI. Genererte kilder kan committes i apprepoet, slik
at applikasjonen får compile-time-sikkerhet uten en ny produksjonsdependency.
En collector kan senere normalisere legacy og lage dekningsmetrikk, men skal
aldri gjette `event_type` fra melding eller stack.

### Én feil, én semantisk errorlogg

Laget som avgjør at den logiske operasjonen har feilet terminalt, logger én
errorhendelse. Underliggende lag enten propagerer feilen eller måler retry uten
å logge samme feil på nytt. En retry som senere lykkes er ikke en ny terminal
errorhendelse. Forventede domeneavvisninger og ordinære 4xx er heller ikke
automatisk runtimefeil.

`event_type` beskriver utfallet, ikke implementasjonsstedet. Bruk
`document_dispatch_failed`, ikke `dokumentporten_service_error` eller det
generiske `runtime_error`.

## Personvern og kardinalitet

Felt i signaturen skal være korte identifikatorer fra kodeeide, endelige sett.
Følgende skal aldri brukes som dimensjoner eller bygges inn i dimensjonsverdier:

- fødselsnummer, aktør-ID, UUID, event-/message-ID, e-post eller andre person-
  og korrelasjonsidentifikatorer;
- rå `message`, exception-melding, `stack` eller `stack_trace`;
- URL, path, query-parametre, request-/response-body eller ekstern payload;
- fritekst, databaseverdier eller andre verdier som kan vokse uten en fast
  øvre kardinalitetsgrense.

En statisk, personvernvurdert loggmelding kan fortsatt finnes i råloggen, men
dashboardet bruker den aldri som signatur. Ikke send et helt error-, request-
eller response-objekt bare for å oppfylle denne kontrakten.

## Node/Pino

`@navikt/pino-logger` legger normalt `trace_id` på logger i en aktiv OTel-span.
Feltene under er de eneste dynamiske verdiene som sendes, og alle kommer fra
kodeeide typer eller operasjonsnavn:

```ts
logger.error(
  {
    event_type: "graphql_request_failed",
    error_code: "INTERNAL_SERVER_ERROR",
    operation: "sykmelding_by_id",
    upstream_status: 502,
    exception_type: normalizeExceptionType(error),
  },
  "GraphQL request failed",
);
```

Ikke legg `error.message`, variabler, URL eller hele `error`-objektet i
signaturfeltene. Hvis loggeroppsettet ikke propagerer aktiv trace automatisk,
skal `trace_id` hentes fra aktiv span i stedet for å bruke en applikasjons-ID.

## Kotlin/LogstashEncoder

Bruk `StructuredArguments.kv` og la MDC/OTel-integrasjonen levere `trace_id`:

```kotlin
import net.logstash.logback.argument.StructuredArguments.kv

log.error(
    "GraphQL request failed: {} {} {} {}",
    kv("event_type", "graphql_request_failed"),
    kv("error_code", "INTERNAL_SERVER_ERROR"),
    kv("operation", "sykmelding_by_id"),
    kv("upstream_status", 502),
    kv("exception_type", exception::class.simpleName ?: "UnknownException"),
    exception,
)
```

Ikke avled `exception_type` fra stacktekst. Ikke legg throwable-meldingen,
request-URL eller person-/domeneidentifikatorer i de strukturerte feltene.

## Konformitetstest i apprepoet

Hver ny eller migrert errorhendelse skal ha en test som fanger den serialiserte
JSON-loggen og verifiserer:

1. nøyaktig én `error`-logg for én kontrollert, terminal logisk feil;
2. `event_type` er en forventet konstant, matcher formatet og tilhører appens
   lukkede allowlist;
3. valgfrie felt matcher forventede, stabile verdier; `upstream_status` er et
   heltall i serialisert JSON fra `100` til `599`, og `trace_id` er 32 hextegn
   når testen kjører i en aktiv span;
4. miljøfelter og canaries for fødselsnummer, UUID, e-post, URL, message,
   stack og payload ikke finnes i dimensjonsfeltene;
5. retry-/propageringslag ikke lager duplikate errorlogger.

Testen skal ligge ved loggpunktet i apprepoet. En kontrollert dev-hendelse kan
i tillegg brukes til å bekrefte én `canonical` logghendelse i Feiloversikt, men er
ikke en erstatning for kontrakttesten.

## Dashboardets `contract_state`

Feiloversikt teller logghendelser, ikke unike feil eller incidents, og
klassifiserer identitetskontrakten aggregert:

- `canonical`: gyldig `event_type` finnes;
- `legacy_type`: en formatvalidert legacy `event`- eller exception/error-type
  brukes som operativ fallback;
- `rejected`: et identitetskandidatfelt finnes, men bryter formatet;
- `missing`: ingen kjent identitetskandidat finnes.

`rejected`, `missing` og `legacy_type` er kontraktsgap som prioriteres etter
antall hendelser. Fravær av `error_code`, `operation`, `upstream_status` eller
`logger_name` er ikke alene et identitetsgap; feltene er valgfrie.
Regex-validering beviser bare format, ikke JSON-type, produsentproveniens eller
personvern. Full konformitet krever derfor kodeeid katalog og producer-nær
serialiseringstest.

## Migrasjon og legacy

- Nye errorlogger følger kontrakten fra første commit.
- Når et eksisterende feilforløp endres, migreres det terminale loggpunktet og
  duplikate errorlogger fjernes i samme endring.
- Legacylogger beholdes synlige som `legacy_type`, `missing` eller `rejected`;
  dashboardet skal aldri gjette type fra melding eller stack.
- Det tvetydige legacyfeltet `status` beholdes midlertidig som eksisterende
  fallback under **Kode**, men tolkes aldri som `upstream_status` og fyller ikke
  kolonnen **HTTP-status fra kall**. Endrede produsenter sender det eksplisitte
  `upstream_status`-feltet som JSON-number og beholder en separat `error_code`
  når en stabil kode finnes.
- Migrering prioriteres etter høyt antall `missing`/`rejected`/`legacy_type`,
  ikke etter lav kode-, operasjons- eller loggerdekning.
- Ikke massefyll `event_type=runtime_error`. Hver verdi skal uttrykke et stabilt,
  handlingsrettet teknisk utfall.
