# Kontrollrom

::: tip Operativ inngang
[Åpne Team eSyfo – Kontrollrom i Grafana](https://grafana.nav.cloud.nais.io/d/team-esyfo-control-room-v1/team-esyfo-e28093-kontrollrom?orgId=1&from=now-1h&to=now&timezone=browser&refresh=2m)
:::

Kontrollrommet er den felles hendelsesinngangen for Team eSyfos operative flåte. Det starter med forventede ressurser fra runtimeinventaret og fyller inn bevist telemetry. En app kan derfor ikke forsvinne fra oversikten bare fordi signalet mangler.

Leveransen er coverage-first: det vi kan måle korrekt vises live; det vi ikke kan bevise står som `UKJENT`, `IKKE DEFINERT`, `IKKE EVALUERT` eller `BLOCKED`. [#211](https://github.com/navikt/team-esyfo/issues/211) forblir åpen til browser-, pipeline-, SLO- og deploykontraktene faktisk er levert.

## Firetrinns hendelsesløype

1. **Handle nå:** Se etter OTel-feilstatus, runtimefeil, restarts og lav ready/desired. Les alltid span- og kube-dekning ved siden av.
2. **Finn raden:** Flåtematrisen viser forventet tjeneste, kritikalitet, livssyklus, telemetry og observerte avvik. Manglende signal gjør raden rød/ukjent; den forsvinner ikke.
3. **Avgrens én tjeneste:** Velg runtime i `Tjeneste`. Request-rate, OTel-feilratio og P95 gjelder da bare denne identiteten, ikke en uleselig miks av hele flåten.
4. **Følg runbook og drilldown:** Hver runtime og pagerkandidat lenker til APM, avgrensede logger, Feildrilldown og relevant runbook.

`Omfang` filtrerer bare oversiktskortene og flåtematrisen. `Tjeneste` styrer bare detaljpanelene. Dine sykmeldte-, browser-, pipeline-, jobb- og pagerseksjonene har sitt eksplisitte, faste scope og endres ikke av disse valgene.

## Tilstandsord

| Dimensjon | Tillatte tolkninger |
|---|---|
| Brukerimpact | `PÅVIST`, `INGEN PÅVIST IMPACT`, `UKJENT` |
| Teknisk helse | `OK`, `DEGRADERT`, `FEILET`, `UKJENT` |
| Telemetry | `FERSK`, `STALE`, `MANGLER`, datasourcefeil |
| Trafikk | `AKTIV`, forventet nulltrafikk, uventet nulltrafikk, `UKJENT` |
| Kontrakt | `VERIFISERT`, `IKKE DEFINERT`, `IKKE EVALUERT`, `BLOCKED` |

Kontrollrommet lager ikke én samlet grønn status. Den tidligere `sykepengedager-informasjon`-hendelsen demonstrerte hvorfor: HTTP-sporene kunne vise ingen påvist synkron impact samtidig som runtimefeil og restarts viste reell teknisk degradering.

## Hva dashboardet dekker

### Runtime

- Scope velges som hele flåten, brukerreise, pipeline eller livssyklus.
- Runtimeinventaret per 28. august 2026 gir 26 forventede GCP-appkomponenter i den generiske flåten.
- De tre `syfooppfolgingsplanservice`-komponentene i FSS er ikke generiske flåterader. Fram til sunset 31. august følges de bare med eksisterende, tidsavgrensede regler i Alert-registeret; etter fristen skal shutdown verifiseres i [#208](https://github.com/navikt/team-esyfo/issues/208). Dette hindrer at en GCP-query feilaktig viser dem som `MANGLER`.
- RED bruker `traces_spanmetrics_calls_total` og `traces_spanmetrics_latency_bucket`, avgrenset til `service_namespace=team-esyfo`, `k8s_cluster_name=prod` og `span_kind=SPAN_KIND_SERVER` for de 24 profilene med HTTP/SERVER-kontrakt.
- `esyfovarsel` og `syfo-budstikka` er workers. De står som `ANNEN KONTRAKT` i SERVER-kolonnen og inngår ikke i SERVER-dekningsnevneren; deres operative kontroll ligger i pipeline-/jobbsignalene.
- OTel `STATUS_CODE_ERROR` omtales som spanstatus, ikke automatisk HTTP 5xx eller bevist brukerimpact.
- De to Dine sykmeldte-panelene avgrenser `GET /api/minesykmeldte` og `GET /api/virksomheter`. Rute-/labelkontrakten og 200/`STATUS_CODE_UNSET` er live-verifisert mot NAIS APM-spanmetrikker. 2xx uten OTel-feilstatus er `good`; 4xx uten OTel-feilstatus vises nøytralt som `http_4xx`, mens 5xx eller OTel-feilstatus er `technical_failure`. Texas kan maskere tekniske introspeksjonsfeil som 401, så 4xx kalles ikke forventet før et bounded appsignal skiller årsakene i [dinesykmeldte-backend#729](https://github.com/navikt/dinesykmeldte-backend/issues/729).
- Kube-signaler dedupliseres og `desired=0` filtreres bort.
- Flåtematrisen teller bare positivt klassifiserte `detected_level=error|critical|fatal` siste fem minutter. Den gjør ikke en ekstra full-loggskann for å konstruere null; `No data` er ukjent. Valgt tjeneste kan undersøkes over dashboardets valgte tidsrom.

Telemetrykolonnen er inventarforankret:

- `FERSK`: aktuell SERVER-spanserie finnes for en SERVER-eligible profil. Det måler scrape-/seriesignal, ikke siste request.
- `STALE`: serien er sett siste 30 minutter, men er ikke aktuell.
- `MANGLER`: ingen serie siste 30 minutter for en SERVER-eligible profil.
- `ANNEN KONTRAKT`: workerprofil som ikke skal vurderes med inbound SERVER-spans.
- En datasourcefeil feiler queryen og blir aldri mappet til `MANGLER` eller grønt.

### Browser

Kontrollrommet viser en kompakt browserstatus og en diagnostisk exception-graf. Det detaljerte [runtimeinventaret](./runtimeinventar) viser de 11 browserflatene, kildekodekonfigurasjon, browseridentitet, side-ID, privacygap og høy-impact issue. Bare Faro `kind=exception` er live-verifisert i denne leveransen. Miljødimensjonen er ikke verifisert, så exception-grafen har ukjent miljøscope og må ikke omtales som produksjonsstatus. [#206](https://github.com/navikt/team-esyfo/issues/206) definerer browserkontrakten; page loads, sessions og CWV p75 står eksplisitt ukjent til den enkelte flaten har bevist identitet, miljø, numerisk samplingrate og queryschema i sin rollout.

En sampled exception, page load eller session skal aldri omtales som en unik bruker. Verdier med ulik samplingrate skal ikke summeres.

### Pipelines og jobber

Kontrollrommet viser pipelinehelse som `IKKE EVALUERT`, ikke som et feilresultat. Sju pipelinegrupper og ti team-topics er kartlagt; detaljerte produsent-/konsumentruter ligger i [runtimeinventaret](./runtimeinventar). Operativ helse kan først evalueres når [#212](https://github.com/navikt/team-esyfo/issues/212) har avklart expected run, ferskhet, progresjon, eldste ventende og terminalt utfall.

Varslingsreisen viser `syfo-budstikka` som målprosessor og `esyfovarsel` som migrerende legacy-prosessor. Airflow er ekstern sekundærkonsument og er utenfor scope. `esyfovarsel-job` får kun et tidsavgrenset Kubernetes failure-guardrail; `No data` betyr ikke suksess.

### Pager readiness

De tre kandidatene fra [#210](https://github.com/navikt/team-esyfo/issues/210) har egne diagnostikkpaneler og runbooklenker:

- Budstikka-lag er kun diagnostikk mens ende-til-ende-ferskhet/eldste alder og terminale utfall bygges i [syfo-budstikka#260](https://github.com/navikt/syfo-budstikka/issues/260).
- Oppfølgingsplan har et verifisert legacy-signal for observerte deserialiseringsfeil. Signalet skiller ennå ikke terminal forkasting fra retryforsøk; dette og recovery/reconciliation avklares i [syfo-oppfolgingsplan-backend#449](https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/449).
- `syfomotebehov` har guarded ready/desired sammen med single-service RED; tuning og konsekvens avklares i [syfomotebehov#753](https://github.com/navikt/syfomotebehov/issues/753).

Alle tre står `BLOCKED`. Dashboard og runbook aktiverer ikke pager; aktivering krever observasjonsperiode, shadow-evidens, second-person-verifikasjon og eksplisitt beslutning i [#217](https://github.com/navikt/team-esyfo/issues/217).

## Kjente gap

- SLO-burn er `IKKE DEFINERT`; alert-policy er ikke en SLO-kontrakt.
- Siste deploy er `UKJENT`; pod-alder og `kube_deployment_created` brukes ikke som deploybevis.
- Browser page loads/sessions/CWV venter på live-evidens fra utrullingen per flate.
- Topic-/pipelineutfall venter på #212 og deretter konkrete adaptere.
- Legacy-jobben mangler siste start, siste suksess og forventet-run-evaluering.

## Runbooks

- [Runbookoversikt](./runbooks/)
- [HTTP og runtime](./runbooks/http-runtime)
- [Browser](./runbooks/browser)
- [Pipelines og jobber](./runbooks/pipelines-og-jobber)
- [syfomotebehov tilgjengelighet](./runbooks/syfomotebehov-tilgjengelighet)
- [Oppfølgingsplan deserialiseringsfeil](./runbooks/oppfolgingsplan-deserialisering)

## For vedlikeholdere

Builderen ligger i `.vitepress/grafana/control-room.ts`, mens inventarscope og generert operatørtekst ligger i `.vitepress/grafana/control-room-scope.ts`. Den reviewbare [Grafana-ressursen](/grafana/team-esyfo-control-room-v1.json) genereres deterministisk.

Kjør fra `docs/`:

```bash
pnpm control-room:test
pnpm control-room:export
pnpm control-room:check
pnpm control-room:grafana-smoke
pnpm build
```

`control-room:grafana-smoke` krever Docker og bruker kun `127.0.0.1`. Den starter
en midlertidig Grafana med samme versjon som dashboardbyggeren, importerer den
eksakte artefakten gjennom v2-API-et og sammenligner både lagret ressurs og
UI-ens DTO semantisk. Containeren og engangspassordet fjernes etter testen.
Smoken kjører ikke datasource-queryene og rendrer ikke panelene; dette må fortsatt
verifiseres i Grafana som beskrevet under. Kommandoen kjører også som et eget steg
i dokumentasjonsbygget i CI.

Før publisering skal artefakten importeres med UID `team-esyfo-control-room-v1` i Team eSyfo-mappen `K-1b-N_4k`. Velg Team Esyfo eksplisitt også ved overwrite. Verifiser minst:

- hele flåten og ett reise-/pipelinescope,
- en valgt backend, frontend og worker,
- påvist runtimefeil uten OTel-feil,
- nulltrafikk, `STALE`, `MANGLER` og datasourcefeil,
- de tre pagerpanelene og alle runbook-/drilldownlenker,
- at browser, pipeline, SLO og deploy fortsatt står ukjent når kontrakten mangler.

Standardvisningen er én time med to minutters refresh. Bruk Grafana Query Inspector før overwrite til å kontrollere queryfeil, svartid og skannede bytes. Flåte-Loki leser bare et fast femminuttersvindu; øk tidsrom eller refreshfrekvens bevisst under drilldown, ikke som permanent default.

## Referanser

- [NAIS APMs RED-queryer](https://github.com/nais/grafana-apm-app/blob/0bade9b7cd886489955439a32f8c820a080a0b99/src/pages/buildServiceScene.ts#L119-L170)
- [NAIS APMs metrikk- og labelkontrakt](https://github.com/nais/grafana-apm-app/blob/0bade9b7cd886489955439a32f8c820a080a0b99/pkg/plugin/otelconfig/otelconfig.go#L338-L380)
- [NAIS span metrics](https://github.com/nais/doc/blob/003a79811b2131b35263c68992d049809a5c4c77/docs/observability/tracing/reference/span-metrics.md)
- [kube-state-metrics: deployment metrics](https://github.com/kubernetes/kube-state-metrics/blob/9295108daad18a00840069be20e0ec3970cb89e6/docs/metrics/workload/deployment-metrics.md)
