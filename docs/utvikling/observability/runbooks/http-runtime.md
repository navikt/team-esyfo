# Runbook: HTTP og runtime

Bruk denne for apper som vises i Kontrollrommets flåtematrise eller detaljpaneler. Målet er å skille påvist brukerimpact, teknisk degradering og telemetryfeil før tiltak velges.

## 1. Bekreft scope og evidens

1. Åpne [Kontrollrom](https://grafana.nav.cloud.nais.io/d/team-esyfo-kontrollrom/team-esyfo-kontrollrom?orgId=1&from=now-1h&to=now&timezone=browser&refresh=2m).
2. Velg relevant **Operativt område**, tidsrom og deretter én **Detaljtjeneste**.
   - `Operativt område` styrer bare oversiktskortene og flåtematrisen.
   - `Detaljtjeneste` styrer bare detaljpanelene.
   - Browser-, pipeline-, jobb- og pagerseksjonene har fast scope og følger ingen av variablene.
3. Les telemetrykolonnen først:
   - `FERSK`: aktuell SERVER-spanserie finnes. Det beviser seriescrape, ikke trafikk.
   - `STALE`: serien er sett siste 30 minutter, men er ikke aktuell.
   - `MANGLER`: ingen SERVER-spanserie siste 30 minutter.
   - Panel-/datasourcefeil: queryen kunne ikke evalueres; ikke tolk dette som `MANGLER`.
4. Kontroller at runtime-identiteten stemmer mellom inventar, deployment/container og APM `service_name`. Et mappinggap er et observabilityproblem, ikke en appfeil.

## 2. Avklar brukerimpact

1. Se request-rate for valgt tjeneste. Nulltrafikk kan være legitimt, uventet eller ukjent.
2. Se OTel-feilratio. `STATUS_CODE_ERROR` er spanstatus, ikke automatisk HTTP 5xx eller domeneimpact.
3. Se P95 kun som diagnostikk. Det finnes ingen generell grønn/rød SLO-grense i Kontrollrommet.
4. Åpne NAIS APM fra raden og avgrens til samme tidsrom. Se etter berørte routes/operations og traces uten å kopiere rå persondata.

Bruk formuleringen **påvist impact** bare når telemetry faktisk viser mislykkede kall eller en domene-/pipelinekontrakt er brutt. Ellers: **ingen impact påvist** eller **ukjent**.

### syfomotebehov: dagens regel og foreslått observasjonsregel

Det live-verifiserte registersnapshotet inneholder fortsatt alerten `HIGH RATIO OF HTTP 5XX RESPONSE`. Den bruker denne ingress-ratioen per `backend` i et femminuttersvindu:

```promql
100 * sum by (backend) (rate(nginx_ingress_controller_requests{namespace="team-esyfo", service="syfomotebehov", status=~"^5\\d\\d"}[5m]))
/
sum by (backend) (rate(nginx_ingress_controller_requests{namespace="team-esyfo", service="syfomotebehov"}[5m]))
```

- Kjør samme uttrykk for samme tidsrom og backend. Dagens grense på `> 2 %` er en legacy-terskel, ikke en SLO.
- Regelen mangler minimumstrafikk. Én mislykket request ved lav trafikk kan derfor utløse den.
- Manglende nevner eller `No data` er ukjent, ikke null feil eller frisk tjeneste.
- Sammenlign med OTel/APM for brukerimpact, men ikke likestill ingress-5xx med `STATUS_CODE_ERROR` i spans.

[syfomotebehov-PR #756](https://github.com/navikt/syfomotebehov/pull/756) foreslår å erstatte denne med en urutet observasjonsregel (`shadow`) basert på produksjonens SERVER-spans. Kandidaten krever samtidig:

- mer enn 2 prosent HTTP 5xx i et 15-minuttersvindu,
- minst 20 SERVER-spans med HTTP-status fra 1xx til 5xx,
- en beregnet økning på minst 3 HTTP 5xx SERVER-spans,
- og at alle vilkårene er sanne sammenhengende i 5 minutter.

Uttrykket nullfyller bare 5xx-telleren når totaltrafikken finnes; manglende totalserie forblir `No data`. SERVER-spans uten `http_response_status_code` er ikke med i nevneren og må behandles som et telemetrygap, ikke som vellykkede kall. Regelen er merket for observasjonsmodus (`shadow`) og ikke-avbrytende oppfølging (`ticket`); den er ikke pager eller bevis på brukerimpact alene. Den generiske 4xx-regelen fjernes også i #756, men først når endringen faktisk er deployert. Frem til #756 er merget, deployert og live-avstemt skal registeret og hendelseshåndteringen fortsatt behandle ingress-reglene som de faktiske live-reglene. Etter deploy må kilde-SHA, fingerprint, timing og live-observasjon oppdateres samlet i alert-registeret.

## 3. Avklar teknisk helse

1. Se runtimefeil, restarts og ready/desired uavhengig av HTTP-panelene.
2. Åpne Feiloversikt og det avgrensede loggsøket fra tjenesteraden.
3. Grupper på stabilt teknisk felt, for eksempel logger eller exception-type. Ikke bruk rå melding, payload eller URL som issue-fingerprint.
4. Kontroller nylige endringer i NAIS Console/GitHub. Kontrollrommet viser foreløpig ikke verifisert deploy-SHA eller deploytid; pod-alder er ikke deploybevis.

## 4. Velg handling

| Situasjon | Trygg første handling |
|---|---|
| Påvist impact og dårlig ready/desired | Finn rollout-/ressursårsak. Stopp videre utrulling ved behov og bruk dokumentert rollback hvis den finnes. |
| Runtimefeil uten påvist HTTP-impact | Avgrens feilgruppen og berørt asynkron/domain-flyt. Ikke lukk hendelsen fordi RED ser grønn ut. |
| Uventet nulltrafikk | Bekreft routing, upstream og forventet trafikkmønster før appen endres. |
| Manglende/stale telemetry | Behandle som dekningshendelse. Verifiser instrumentering, scraping og identitetsmapping. |
| Poison record eller kontraktbrudd | Ikke restart/replay blindt. Følg pipeline-/appspesifikk runbook og avklar idempotens. |

## 5. Bevis recovery

- Den opprinnelige avvikskolonnen er stabilisert i to påfølgende femminuttersvinduer, altså minst ti minutter totalt. Dette er en diagnostisk v1-konvensjon, ikke en SLO- eller pagerkontrakt; en senere signalkontrakt kan kreve et lengre vindu.
- Request-rate og påvirkningssignal er tilbake til forventet mønster, eller legitim nulltrafikk er dokumentert.
- Ready/desired er stabil og restartkurven øker ikke videre.
- Telemetry er fersk. Hvis den ikke er det, er apprecovery og telemetryrecovery to separate oppfølgingspunkter.
- Hendelsesnotatet inneholder tidspunkt, berørt teknisk scope, valgt tiltak og lenker til sanitert evidens — aldri rå persondata.

## Kontrollert test av runbooken

Kjør som tabletop eller i dev med en ufarlig testtjeneste:

1. Bruk et tidsrom med kjent trafikk og bekreft APM-/logg-/Feiloversikt-lenkene.
2. Bruk et tidsrom eller en tjeneste uten SERVER-serie og bekreft at den står som `STALE`/`MANGLER`, ikke grønn.
3. Bruk en kjent runtimefeil uten OTel-feil og bekreft at sannhetene ikke kollapses.
4. Avbryt testen hvis den krever produksjonsfeil, ekte payload eller personidentifikator.
