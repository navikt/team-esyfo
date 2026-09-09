# Kontrollrom

[Åpne Team eSyfo – Kontrollrom](https://grafana.nav.cloud.nais.io/d/team-esyfo-kontrollrom)

**Hvor bør vi undersøke nå?** Kontrollrommet gir en fast oversikt over teamets tjenester i produksjon. [Feiloversikt](./feildrilldown) er neste steg når du vil finne en feilgruppe, lese logger eller åpne et konkret trace.

## Slik bruker vi det

1. Se toppkortene og **Tjenester i produksjon**. Tabellen beholder forventede tjenester selv når måledata mangler. Klikk tjenesten for logger, APM, Feiloversikt og runbook.
2. Åpne **Undersøk en tjeneste** for trafikk, feilmarkerte kall, svartid, replikaer og omstarter. Tjenestevelgeren gjelder bare denne raden.
3. Åpne de egne radene for meldingsbehandling, jobber eller utvalgte tjenester når avviket peker dit. Måledekning finnes i egen sammenfoldet rad. WARN-avvisninger vises separat i den åpne oversikten.

Det er ingen globale område- eller tjenestefiltre. Oversikten gjelder alltid hele produksjonsflåten. Tidsrommet er felles; paneler merket **5 min**, **15 min** eller **24 t** bruker det oppgitte vinduet bakover fra slutten av valgt tidsrom.

## Hva tallene betyr

| Signal | Tolkning |
|---|---|
| Feilmarkerte kall | Inngående SERVER-spans med OTel `STATUS_CODE_ERROR`. Ikke automatisk HTTP 5xx eller påvist brukerimpact. |
| Loggfeil · 5 min | Logghendelser med `error`, `critical` eller `fatal`, uavhengig av HTTP-sporene. |
| Omstarter · 15 min | Toppkortet teller tjenester med omstarter; tabellen viser estimerte omstarter per tjeneste. Gult er et undersøkelsessignal, ikke en nedetidsalarm. |
| Klare replikaer | Klare i forhold til ønskede replikaer. Et øyeblikksbilde, ikke målt tilgjengelighet. |
| Måledata | Om forventede HTTP-måleserier er oppdatert, forsinket eller mangler. Ikke tidspunktet for siste kall. |

**Ingen treff** i et loggpanel betyr at søket ikke returnerte kvalifiserende hendelser. Det beviser ikke at alle tjenester har komplett logging. Manglende Kubernetes-målinger er ukjent, ikke 0 % klare replikaer. En faktisk målt null med ønskede replikaer større enn null er derimot 0 %. Tjenester med ønsket antall null inngår ikke i prosentberegningen.

Datasource- og spørringsfeil skal vises som feil, aldri som frisk tjeneste. Det finnes ingen samlet grønn helsescore.

### Omstarter og utrulling

Vanlig oppretting, fjerning eller erstatning av podder ved deploy og skalering øker ikke containerens restart-teller. Derfor undertrykker vi ikke alle avvik rundt deploy. Korte fall i antall klare replikaer kan likevel være normale; se tidsserien og eventuell brukerimpact før du konkluderer.

Podtabellen viser omstarter siste 15 minutter og 24 timer, samt **siste registrerte avslutningsårsak på nåværende podder**. Årsaken gjelder ikke nødvendigvis alle omstarter i vinduet. Erstattede podder kan ha restarthistorikk uten tilgjengelig årsak, og dagens metrikkgrunnlag gir ikke avslutningstidspunkt.

- `OOMKilled`: sammenhold minnebruk og minnegrense før tiltak.
- `Error`: åpne poddens logger rundt hendelsen; årsaken kan ikke leses av exit-status alene.
- Manglende årsak: ikke bevis på normal deploy.

Prometheus `increase()` estimerer tellerøkning. Verdiene er ikke en eksakt hendelseslogg. Se [HTTP-/runtime-runbook](./runbooks/http-runtime).

## Avgrensning og datagrunnlag

Produksjonsflåten genereres fra [runtimeinventaret](./runtimeinventar): 26 operative GCP-appkomponenter, hvorav 24 har HTTP/SERVER-profil. Avviklet `syfooppfolgingsplanservice` i FSS er ikke med. `esyfovarsel` og `syfo-budstikka` er workers og skal ikke vurderes med HTTP-måledekning.

- HTTP-målinger: `traces_spanmetrics_calls_total` og `traces_spanmetrics_latency_bucket`, avgrenset til `service_namespace=team-esyfo`, `k8s_cluster_name=prod` og `span_kind=SPAN_KIND_SERVER`.
- Kubernetes: produksjon i `team-esyfo`, deduplisert per deployment eller pod/container. Manglende teller eller nevner syntetiseres ikke til en målt verdi.
- Runtime-logger: positivt filter på Loki `detected_level=error|critical|fatal`. Browserlogger videresendt med `x_isFrontend=true` utelates både som metadata og JSON-felt. Ikke-JSON runtimefeil beholdes.
- Nettleserfeil: egen del av [Feiloversikt](./feildrilldown), ikke en del av kontrollrommets produksjonsstatus.

HTTP-måledata klassifiseres slik:

- **Mottar data:** aktuell SERVER-serie finnes. Det beviser måleserie, ikke trafikk.
- **Forsinket:** sett siste 30 minutter, men ikke aktuell.
- **Mangler:** ingen serie siste 30 minutter for en forventet HTTP-tjeneste.
- **Bakgrunnstjeneste:** worker uten inbound SERVER-kontrakt.

### Meldingsbehandling og jobber

Poll-alder viser sekunder siden Kafka-klienten kalte `poll()`. Consumer-lag viser meldinger bak i transporten. Ingen av dem beviser alene riktig behandling, ende-til-ende-leveranse eller brukerimpact.

Oppfølgingsplans deserialiseringssignal skiller ennå ikke terminal forkasting fra retryforsøk. Kubernetes-jobbpanelet viser bare `kube_job_failed{condition="true"}` i valgt tidsrom; `false` og `unknown` er ikke feil. Et tomt resultat beviser ikke en vellykket eller punktlig jobbkjøring.

Se [Kafka-kontraktene](./kafka-kontrakter), [pipelines og jobber](./runbooks/pipelines-og-jobber) og [deserialiseringsrunbook](./runbooks/oppfolgingsplan-deserialisering) for kontrakter og trygg videre undersøkelse.

### Utvalgte tjenester

Dine sykmeldte-panelene avgrenser `GET /api/minesykmeldte` og `GET /api/virksomheter`. 2xx uten OTel-feilstatus telles som vellykkede svar. 4xx uten OTel-feilstatus vises separat og nøytralt; 5xx eller OTel-feilstatus er teknisk feilmarkert. Texas kan maskere tekniske introspeksjonsfeil som 401, så 4xx omtales ikke generelt som forventet. Se [dinesykmeldte-backend#729](https://github.com/navikt/dinesykmeldte-backend/issues/729).

Møtebehovs tilgjengelige replikaer er diagnostikk sammen med trafikk og feil, ikke en selvstendig SLO. Se [egen runbook](./runbooks/syfomotebehov-tilgjengelighet).

## Begrensninger og videre arbeid

Prosjektstatus er dokumentert her, ikke i store tekstpaneler på driftsflaten:

- SLO-er og burn-rate er ikke etablert av dette dashboardet.
- Siste deploy-SHA og deploytid må undersøkes i NAIS Console/GitHub. Pod-alder brukes ikke som deploybevis.
- Pipelineutfall, terminal behandling og nulltrafikk krever eide kontrakter i [#212](https://github.com/navikt/team-esyfo/issues/212).
- Legacy-jobben mangler siste start, siste suksess og evaluering av forventede kjøringer.
- Dashboardet aktiverer ingen pager. Observasjon, uavhengig verifikasjon og eksplisitt beslutning følges i [#217](https://github.com/navikt/team-esyfo/issues/217).

## Vedlikehold og verifikasjon

Builder: `.vitepress/grafana/control-room.ts`. Inventarscope: `.vitepress/grafana/control-room-scope.ts`. Den genererte [Grafana-ressursen](/grafana/team-esyfo-kontrollrom.json) er publiseringsartefakten.

Kjør fra `docs/`:

```bash
pnpm control-room:test
pnpm control-room:export
pnpm control-room:check
node scripts/observability-query-smoke.ts
pnpm grafana-dashboard:smoke
pnpm build
```

Query-smoken kjører syntetiske hendelser i lokal Loki og måleserier gjennom Prometheus' `promtool`. Den dekker blant annet ekte null, manglende replikaer, skalering til null, jobbens tre condition-verdier og skillet mellom ERROR og WARN. Grafana-smoken importerer de eksakte artefaktene i samme Grafana-versjon som produksjon og sammenligner både lagret ressurs og UI-DTO. Begge krever lokal Docker; de skriver ikke produksjonsdata.

Rendring og lenker må også prøves i Grafana: hele flåten, en backend/frontend/worker, normal utrulling, reelle omstarter, manglende målinger og ett konkret feilforløp. Kontroller at lokalt tjenestevalg ikke endrer produksjonsoversikten. Se [designprinsippene](./dashboard-design).

Ved publisering: eksporter live-dashboardet som rollback-kopi, importer artefakten med samme UID `team-esyfo-kontrollrom` i **Team Esyfo** (`K-1b-N_4k`), og eksporter på nytt for semantisk sammenligning. Ikke overskriv uavklarte live-endringer. Standard er én time og to minutters oppdatering; flåte-Loki leser bare fem minutter.

## Referanser

- [NAIS APMs RED-queryer og span-målinger](https://github.com/nais/grafana-apm-app/blob/0bade9b7cd886489955439a32f8c820a080a0b99/src/pages/buildServiceScene.ts#L119-L170)
- [Kubernetes: Pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Prometheus: increase](https://prometheus.io/docs/prometheus/latest/querying/functions/#increase)
- [kube-state-metrics: Job condition-målinger](https://github.com/kubernetes/kube-state-metrics/blob/v2.17.0/internal/store/job.go#L278-L299)
