---
title: Avvikling av syfooppfolgingsplanservice
---

# Avvikling av syfooppfolgingsplanservice

::: danger NO-GO per 29. august 2026
Produksjonsstopp er ikke godkjent ennå. Kildekartleggingen er gjort, men vi mangler produksjonsdeploy og nulltrafikk for siste kjente konsument, live kontroll av erstatningen og bekreftet drenering av bakgrunnsarbeid.
:::

Dette er den operative sjekklisten for [team-esyfo#208](https://github.com/navikt/team-esyfo/issues/208), som er et delarbeid under [observability-epic #201](https://github.com/navikt/team-esyfo/issues/201). Planlagt avvikling er **mandag 31. august 2026**.

## Omfang

Disse tre FSS-ressursene behandles samlet:

- `syfooppfolgingsplanservice`
- `syfooppfolgingsplanservice-redis`
- `syfooppfolgingsplanservice-redisexporter`

`syfo-oppfolgingsplan-backend` er erstatningen. `syfomodiaperson` er en konsument hos søsterteamet og følges i [#2194](https://github.com/navikt/syfomodiaperson/issues/2194) og [PR #2195](https://github.com/navikt/syfomodiaperson/pull/2195).

Airflow, `esyfovarsel`, `dulting-studio`, janitor-applikasjonene og øvrige ressurser i `teamsykefravr` inngår ikke i denne avviklingen. `isyfomock` har en dev-integrasjon som ryddes etter produksjonsstopp.

## Det vi vet

- PR #2195 fjerner kjente runtime-, proxy-, miljø- og NAIS-referanser fra `syfomodiaperson`. CI var grønn 29. august, men PR-en var ikke merget eller produksjonssatt.
- Legacy-manifestet tillater `oppfolgingsplan-frontend`, `syfomodiaperson` og `ditt-sykefravaer`, og eksponerer flere ingresser. Fravær av kodefunn i en klient er ikke bevis på null produksjonstrafikk. Se [prod-manifestet](https://github.com/navikt/syfooppfolgingsplanservice/blob/46e66123d27cc1ad930beb9cb523b1d0b4b712f3/nais/nais-prod.yaml#L34-L54).
- En leader-worker leser `ASYNK_OPPGAVE` hvert andre sekund. Køen kan inneholde Dokumentporten-arbeid og eldre Altinn/juridisk-logg-oppgaver. Se [scheduler](https://github.com/navikt/syfooppfolgingsplanservice/blob/46e66123d27cc1ad930beb9cb523b1d0b4b712f3/src/main/java/no/nav/syfo/scheduler/AsynkOppgaverScheduledTask.java#L22-L28) og [DAO](https://github.com/navikt/syfooppfolgingsplanservice/blob/46e66123d27cc1ad930beb9cb523b1d0b4b712f3/src/main/java/no/nav/syfo/repository/dao/AsynkOppgaveDAO.java#L98-L113).
- En separat leader-jobb journalfører delte planer uten `journalpost_id` hvert minutt. Se [scheduler](https://github.com/navikt/syfooppfolgingsplanservice/blob/46e66123d27cc1ad930beb9cb523b1d0b4b712f3/src/main/java/no/nav/syfo/scheduler/ProsesserInnkomnePlaner.java#L33-L42) og [query](https://github.com/navikt/syfooppfolgingsplanservice/blob/46e66123d27cc1ad930beb9cb523b1d0b4b712f3/src/main/java/no/nav/syfo/repository/dao/GodkjentplanDAO.java#L51-L53).
- Tjenesten kan fortsatt publisere til `team-esyfo.varselbus`. Se [produsenten](https://github.com/navikt/syfooppfolgingsplanservice/blob/46e66123d27cc1ad930beb9cb523b1d0b4b712f3/src/main/kotlin/no/nav/syfo/varsling/EsyfovarselProducer.kt#L15-L34).
- Tre legacy-alertregler finnes i kildekoden, men alertfilen er ikke koblet til dagens deployworkflow. Live `PrometheusRule`-tilstand må derfor sjekkes eksplisitt. Se [alertfilen](https://github.com/navikt/syfooppfolgingsplanservice/blob/46e66123d27cc1ad930beb9cb523b1d0b4b712f3/nais/alerts-fss.yaml#L1-L38).
- Redis-exporteren er observert som runtime, men vi har ikke funnet en appspesifikk kildefil eller sikker deploymekanisme for den.

Grafana og NAIS Device var utilgjengelig under kildekartleggingen. Alle påstander om live trafikk, køstatus, regler og clusterressurser står derfor fortsatt åpne.

## GO-kriterier før stopp

Alle punktene må være bekreftet med tidspunkt og produksjonskilde i #208:

- [ ] PR #2195 er merget og deployet til `prod-gcp`.
- [ ] Ny oppfølgingsplanflyt og avtalt Gosys-fallback er smoke-testet.
- [ ] Legacy-tjenesten har null innkommende trafikk fra `syfomodiaperson`, `ditt-sykefravaer`, gammel frontend og øvrige ingresser gjennom et avtalt målevindu.
- [ ] `syfo-oppfolgingsplan-backend` har friske prober, forventede SERVER-spans, metrikker og feilbilder i produksjon.
- [ ] `ASYNK_OPPGAVE` er tom og forblir tom gjennom minst én retry-/observasjonsperiode.
- [ ] Queryen for delte planer uten journalpost returnerer null gjennom minst to kjøringer av minuttjobben.
- [ ] Siste forventede varselbus-melding er levert, og produsenten er stille.
- [ ] App, Redis, Redis-exporter og live `PrometheusRule`-tilstand er identifisert i `prod-fss`.
- [ ] En ansvarlig utvikler har skrevet eksplisitt **GO** i #208.

En grønn PR, en kildekode-SHA eller et tomt dashboardpanel er ikke alene produksjonsevidens.

## Kontrollert gjennomføring

1. Fullfør GO-kriteriene og noter alle queries, tidsvinduer og resultater i #208.
2. Fjern eventuelle live down/4xx/5xx-regler rett før stopp, slik at planlagt shutdown ikke utløser falske hendelser.
3. Deaktiver app- og Redis-workflowene etter siste nødvendige deploy. Begge kan ellers gjenopprette avviklede ressurser ved senere push eller manuell kjøring: [app-workflow](https://github.com/navikt/syfooppfolgingsplanservice/blob/46e66123d27cc1ad930beb9cb523b1d0b4b712f3/.github/workflows/build-and-deploy.yaml#L1-L24) og [Redis-workflow](https://github.com/navikt/syfooppfolgingsplanservice/blob/46e66123d27cc1ad930beb9cb523b1d0b4b712f3/.github/workflows/redis.yaml#L1-L27).
4. Stopp `syfooppfolgingsplanservice`. Verifiser på nytt null trafikk, ingen publisering eller jobbaktivitet, og at erstatningen fortsatt fungerer.
5. Slett Redis og deretter identifisert exporter. Ikke slett dem før appen er bekreftet borte.
6. Oppdater runtimeinventar, varselbus-topologi og alertregister samlet. Behold historiske kildebevis, men fjern aktive referanser.
7. Regenerer dashboardartefaktene og kjør full docs-build. Kontrollrommet og feildrilldownet skal fortsatt være uten legacy-ressursene i aktivt scope.
8. Fjern bare den gamle principalen fra kjente provider-ACL-er: PDL, `syfobrukertilgang`, `syfo-dokumentporten`, `narmesteleder`, `syfosmregister` og `isdialogmelding`. Behold andre aktive klienter.
9. Rydd legacy-integrasjonen i `isyfomock`.
10. Arkiver `syfooppfolgingsplanservice`-repoet til slutt.

## Stopp og revurder hvis

- det fortsatt kommer inn trafikk fra en kjent eller ukjent klient
- en av DB-køene vokser eller ikke kan måles sikkert
- erstatningen mangler telemetri eller får nye feil under gjennomføringen
- varselbus fortsatt mottar uventede meldinger
- eier eller slettemekanisme for Redis-exporteren er ukjent
- en deployworkflow fortsatt kan gjenopprette ressursene

## Evidensmal for #208

```text
Tidspunkt og målevindu:
Utført av:
Deploy/run:
Legacy innkommende trafikk:
ASYNK_OPPGAVE:
Ikke-journalførte planer:
Varselbus:
Erstatningens helse:
Live app/Redis/exporter/PrometheusRule:
Beslutning: NO-GO | GO | STOPPET | FULLFØRT
Lenker eller skjermbilder:
```

## Ferdigkriterium

#208 kan lukkes når de tre FSS-ressursene er borte, deployveiene er stengt, køer og trafikk er verifisert tomme, erstatningen er frisk, aktive inventory-/topic-/alert-/dashboardreferanser er ryddet, provider-ACL-er og `isyfomock` er fulgt opp, og legacy-repoet er arkivert.

Det eksisterende runtimeinventaret holder de tre ressursene som `sunset` frem til cutover og gjør passert dato til CI-feil i streng modus. Dashboardtestene låser dem ute av aktivt Kontrollrom- og feildrilldown-scope.
