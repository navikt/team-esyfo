# Kontrollrom

[Åpne Team eSyfo – Kontrollrom i Grafana](https://grafana.nav.cloud.nais.io/d/team-esyfo-control-room-v1/team-esyfo-e28093-kontrollrom?orgId=1&from=now-6h&to=now&timezone=browser&var-app=$__all&refresh=30s).

Kontrollrommet er hendelsesinngangen for brukerinnvirkning og teknisk helse. Første tracer dekker reisen **Sen oppfølging** og runtimekomponentene `meroppfolging-frontend`, `meroppfolging-microfrontend`, `meroppfolging-backend` og `sykepengedager-informasjon`.

Dashboardet er første vertikale slice i [#211](https://github.com/navikt/team-esyfo/issues/211), ikke hele målbildet. Det utvides inventardrevet etter at signalene er verifisert i produksjon.

## Tilstandsmodellen

Kontrollrommet holder to sannheter adskilt:

- **Brukerinnvirkning:** inbound request-volum, HTTP-feil, feilrate og P95-latency fra SERVER-spans.
- **Teknisk helse:** runtimefeil fra Loki, containerrestarts, ready/desired replicas, inventarforankret kube-/span-dekning og telemetryferskhet.

En tjeneste kan dermed være teknisk degradert uten at vi har påvist mislykkede HTTP-kall. Det er med vilje. Den gjentakende coroutine-feilen i `sykepengedager-informasjon` var integrasjonstesten for nettopp denne semantikken: HTTP-sporene kunne stå som «ingen brukerimpact påvist», mens runtimefeilene viste reell degradering.

`Ukjent`, nulltrafikk og en ekte nullverdi behandles forskjellig:

- Error-null fylles bare når en requestserie finnes.
- Feilrate og latency blir `Ukjent` ved nulltrafikk i stedet for kunstig grønne.
- Manglende datasource eller manglende serie blir `Ukjent`/`No data`.
- Runtimefeil teller 0 bare når Loki-spørringen lykkes, observerer loggaktivitet og ikke finner kvalifiserende feil. Null er nøytral fordi fravær av logger ikke beviser komplett loggdekning.

## Datakilder og querykontrakt

- Produksjons-Mimir: `PA58DA793C7250F1B` (`Metrics`).
- Loki: `PEA2100DC89AE9FE2`.
- RED bruker de live-verifiserte NAIS-metrikkene `traces_spanmetrics_calls_total` og `traces_spanmetrics_latency_bucket`, avgrenset til `service_namespace=team-esyfo`, `k8s_cluster_name=prod` og `span_kind=SPAN_KIND_SERVER`.
- Feil er OTel `status_code=STATUS_CODE_ERROR`.
- Restartserier dedupliseres per pod/container før de summeres.
- Replikahelse bruker `kube_deployment_status_replicas_ready / kube_deployment_spec_replicas`, fyller manglende ready-serie med null når desired-serien finnes, og er alltid avgrenset til prod.
- Kube- og span-dekning bruker de fire forventede tjenestene direkte fra runtimeinventaret som nevner. De to signalene gjelder hele traceren selv når tjenestefilteret endres.
- Telemetryferskhet per tjeneste bruker 30 minutters lookback; etter det forsvinner raden og dekningen forblir rødt signal.

NAIS’ aggregerte recording rules brukes ikke i denne slicen fordi de aggregerer bort `span_kind` og cluster. Det ville kunne blande HTTP SERVER-spans med CLIENT-, CONSUMER- og PRODUCER-spans eller dev med prod.

## Hybridtjenesten sykepengedager-informasjon

Tjenesten har to ulike helseløp:

```text
Maksdato-oppslag: bruker/veileder → HTTP API → PostgreSQL

Datakjede: Infotrygd/AAP/Spleis → prosessering → PostgreSQL
                                      └→ sykepengedager-informasjon-topic
                                             └→ meroppfolging-backend
```

Hovedrollen er Kafka-basert materialisering og viderepublisering, men HTTP-lesesiden er også i bruk. Verifiserte direkte kallere er `ditt-sykefravaer`, `meroppfolging-frontend` og `syfomodiaperson`; den utgående topicen konsumeres av `meroppfolging-backend`.

Denne slicen dekker HTTP- og runtimehelse. Kafka-delen står eksplisitt som **ikke evaluert** fram til [#212](https://github.com/navikt/team-esyfo/issues/212) har avtalt consumer lag, siste vellykkede materialisering, publish success/failure, failed-send-kø og end-to-end-ferskhet. Airflow er en ekstern sekundærkonsument og er utenfor teamets kontrollromscope.

Browserpåvirkning følger kontrakten i [#206](https://github.com/navikt/team-esyfo/issues/206). Brennende SLO-er forutsetter alertkartleggingen i [#203](https://github.com/navikt/team-esyfo/issues/203) og policybeslutningene i [#210](https://github.com/navikt/team-esyfo/issues/210); selve visningen inngår videre i #211. Manglende runbooks er synlige som et gap i #211.

## Dashboard som kode

Builderen ligger i `.vitepress/grafana/control-room.ts`. Den reviewbare [Grafana-ressursen](/team-esyfo/grafana/team-esyfo-control-room-v1.json) genereres deterministisk fra builderen og det godkjente runtimeinventaret.

Kjør fra `docs/`:

```bash
pnpm control-room:test
pnpm control-room:export
pnpm control-room:check
pnpm build
```

Før publisering skal artefakten importeres med UID `team-esyfo-control-room-v1` i Team eSyfo-mappen `K-1b-N_4k`. Velg alltid Team Esyfo eksplisitt, også ved overwrite; Grafanas importdialog bruker ellers rotmappen som default. Verifiser minst hele reisen, hver av de fire tjenestene alene, et kort tidsrom med nulltrafikk, en tjeneste med runtimefeil, APM-/logg-/Feildrilldown-lenkene og at Kafka-seksjonen fortsatt står som ukjent.

## Referanser

- [NAIS APMs RED-queryer](https://github.com/nais/grafana-apm-app/blob/0bade9b7cd886489955439a32f8c820a080a0b99/src/pages/buildServiceScene.ts#L119-L170)
- [NAIS APMs metrikk- og labelkontrakt](https://github.com/nais/grafana-apm-app/blob/0bade9b7cd886489955439a32f8c820a080a0b99/pkg/plugin/otelconfig/otelconfig.go#L338-L380)
- [NAIS span metrics](https://github.com/nais/doc/blob/003a79811b2131b35263c68992d049809a5c4c77/docs/observability/tracing/reference/span-metrics.md)
- [kube-state-metrics: deployment metrics](https://github.com/kubernetes/kube-state-metrics/blob/9295108daad18a00840069be20e0ec3970cb89e6/docs/metrics/workload/deployment-metrics.md)
