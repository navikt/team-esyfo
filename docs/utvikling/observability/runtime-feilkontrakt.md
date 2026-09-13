# Runtime-feilkontrakt

Felles felt gjør feil grupperbare i [Feiloversikt](./feildrilldown), mens den
vanlige loggen forklarer hva som skjedde. Kontrakten gjelder nye og endrede
serverlogger i Team eSyfos apper. Den erstatter ikke loggeren eller APM.

**Skal du legge til en logg?** Følg [oppskriften for gode logger](./gode-logger).

## Dette håndhever vi

- Ett versjonert [JSON Schema v1.0.0](/contracts/runtime-error/v1.0.0/schema.json)
  for form, JSON-typer og grenser.
- En liten, kodeeid katalog i hver app for hendelser, operasjoner og koder.
- Test av den **faktisk serialiserte loggen** i appens CI, med
  [validatoren](/contracts/runtime-error/v1.0.0/validate.mjs) eller en
  draft-07-kompatibel JSON Schema-validator i appens eksisterende testspråk.

Vi lager ikke en ny runtime-logger, npm-/Maven-pakke, generator eller et eget
repo nå. Katalogen gir lokale konstanter/enumverdier; schema og tester fanger
avvik etter serialisering. Ny hendelse i en registrert app krever derfor
verken dashboardendring eller sentral bibliotekrelease. En liten delt
testpakke kan vurderes hvis pilotene viser konkret gjentakelse.

## Felt og betydning

Alle identitetsfelt er kodeeide konstanter, aldri verdier bygget fra en request,
feilmelding eller respons. Valgfrie felt utelates når de ikke tilfører noe.

| Felt | Krav og format | Hva forteller det? |
|---|---|---|
| `event_type` | Påkrevd. `^[a-z][a-z0-9_.-]{0,79}$` | Hva feilet? Eksempel: `plan_creation_failed`. Ikke det generiske `runtime_error`. |
| `operation` | Valgfritt. Samme format som `event_type`. | Hva forsøkte vi å gjøre? Eksempel: `create_plan`. Utelat hvis det bare gjentar hendelsen. |
| `error_code` | Valgfritt. `^[A-Z][A-Z0-9_]{1,79}$` | Stabil teknisk kategori eller protokollkode, som `NETWORK_ERROR`. Ikke en status som streng. |
| `upstream_status` | Valgfritt. JSON-heltall 100–599. | HTTP-status fra tjenesten vi kalte. Utelat ved DNS-/nettverksfeil uten respons. |
| `exception_type` | Valgfritt. `^([A-Za-z][A-Za-z0-9_.:$]{0,143})?(Error|Exception)$` | Kodeeid exceptionkategori, som `TypeError`. Ukjent dynamisk klassenavn trenger ikke en egen dimensjon. |
| `rejection_reason` | Påkrevd for `api_request_rejected`. Samme format som `error_code`. | Kodeeid årsak til en avvisning, som `SYSTEM_USER_ACCESS_NOT_GRANTED`. |
| `logger_name` | Valgfritt. 1–160 tegn. | Frameworkets stabile loggernavn. Fravær i Node er normalt. |
| `trace_id` | Når aktiv tracing finnes. 32 små hextegn, ikke bare nuller. | Aktiv W3C/OTel trace-ID. Aldri en egen ID eller en erstatning generert av appen. |

`event_type`, `operation`, `error_code`, `exception_type` og `rejection_reason`
må i tillegg finnes i appens lokale katalog. Regex alene beviser ikke at en
verdi er kodeeid eller har lav kardinalitet.

Tjeneste, miljø, cluster og namespace kommer fra plattformlabels som
`service_name`, `k8s_cluster_name` og `service_namespace`. Ikke legg på nye
duplikatfelter for dashboardets skyld.

## ERROR, WARN og én logg per feil

**ERROR:** Laget som avgjør at en logisk operasjon har feilet terminalt, logger
én hendelse. Underliggende lag propagerer feilen. En retry som senere lykkes
er ikke en ny terminal errorhendelse.

**WARN:** Forventet domeneavvisning og ordinær 4xx er ikke automatisk en feil.
Når en API-avvisning er relevant å følge opp, bruk `event_type=api_request_rejected`
og en konkret `rejection_reason` fra appens lukkede katalog. Bare denne
eksplisitte hendelsen inngår i dashboardets registrerte API-avvisninger; alle
WARN-logger og alle 4xx telles ikke. Det finnes én midlertidig adapter for den
eldre systembrukerloggen i esyfo-narmesteleder. Nye apper skal ikke bruke den.

Loggnivå og duplikater testes ved loggpunktet. Schemaet krever ikke ett bestemt
`level`-format, siden Pino og Logback serialiserer nivå ulikt. En teknisk svikt
hos en tilgangstjeneste må ikke omskrives til «brukeren mangler tilgang».

## Behold diagnostikk, ikke persondata

Signaturfeltene skal aldri inneholde fødselsnummer, aktør-ID, UUID, e-post,
request-ID, URL, path med ID, query-parametre, fritekst, melding, stack eller
request-/response-body. Vanlig loggtekst, exception, stack og `cause` kan
fortsatt være nødvendig diagnostikk **utenfor signaturen**.

Schemaet tillater derfor loggerens vanlige `err`, `stack_trace`, `msg` og
andre diagnostiske felter. Dette er ikke en tillatelse til å logge et helt
request-/responseobjekt eller persondata. Test loggerens faktiske serializer
og eksisterende redaksjon med syntetiske canaryverdier. APMs scrubbing brukes
for APM-data; den gjør ikke automatisk rå logger trygge. Ikke bygg en parallell,
generisk scrubbingmotor eller en egen throwable-type for kontraktens skyld.

PDL anbefaler logging av GraphQL-`errors`, som ikke inneholder personinformasjon.
Behold denne feildiagnostikken. PDLs `data`, requestvariabler og lokal
personkontekst er noe annet og skal ikke følge med.

## Hva betyr kontraktstatus i dashboardet?

Dashboardet teller logghendelser, ikke unike feil, berørte brukere eller incidents.

- `canonical`: formatgyldig `event_type`.
- `legacy_type`: kjent og formatvalidert eldre hendelses-/exceptionfelt.
- `rejected`: et kjent identitetsfelt finnes, men formatet er ugyldig.
- `missing`: ingen kjent feilidentitet.

Dette er måling av **identitetsdekning**, ikke full schemavalidering eller
personvernkontroll. `missing` kan samle flere forskjellige feil. Fravær av
valgfri kode, operasjon eller upstream-status er ikke i seg selv et avvik.
Legacy skal forbli synlig; dashboardet gjetter ikke hendelsesnavn fra fritekst.

## Versjonering og eierskap

`team-esyfo` eier schema, validator og dashboardtolkning. Hver app eier sitt
hendelsessett, riktige loggnivåer og produsentnære tester. Publiserte filer under
`contracts/runtime-error/v1.0.0/` er byte-låst i CI mot PR-ens base. Endringer
publiseres på en ny versjonssti; appene oppgraderer gjennom vanlig review.

Schemaet har et åpent feltrom for diagnostikk. Å begrense et tidligere ukjent
felt, kreve et nytt felt eller innsnevre tillatte verdier er derfor en
brytende kontraktendring. Det krever ny hovedversjon. Ren dokumentasjons- eller
validatorretting får også ny filsti, slik at sjekksummer og lokale kopier ikke
endres under en eksisterende versjon. Eldre gyldige logger må fortsatt kunne
leses av dashboardet.

Migrer det terminale loggpunktet når et feilforløp endres, og fjern eventuelle
duplikater i samme endring. Prioriter mye `missing`, `rejected` og `legacy_type`,
ikke å fylle alle valgfrie felter. Det eldre `status`-feltet tolkes aldri som
`upstream_status`; endrede produsenter sender eksplisitt heltallsfelt.
