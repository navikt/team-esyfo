---
title: Observability ved avvikling av syfooppfolgingsplanservice
---

# Observability ved avvikling av syfooppfolgingsplanservice

::: danger NO-GO per 29. august 2026
Aktive observability-referanser kan ikke pensjoneres før en ansvarlig for selve tjenesteavviklingen har bekreftet produksjonscutover. Grafana og NAIS Device var utilgjengelig under kartleggingen, så live trafikk, regler og ressurser er ikke verifisert.
:::

Dette er observability-sjekklisten for [team-esyfo#208](https://github.com/navikt/team-esyfo/issues/208). Den skal hindre blindsoner og falske alarmer når tjenesten avvikles, men den godkjenner eller gjennomfører ikke selve nedstengingen.

## Omfang

Observability-arbeidet dekker:

- aktive dashboardvariabler og paneler for `syfooppfolgingsplanservice`, Redis og Redis-exporter
- live `PrometheusRule`-instanser og alertregisteret
- runtimeinventaret og `varselbus`-topologien
- verifisert telemetry i `syfo-oppfolgingsplan-backend` før gamle signaler fjernes
- kontroll etter cutover som avdekker falske `down`-, `absent`- og `No data`-hendelser

Stopp av appen, sletting av Redis/exporter, deaktivering av deployworkflows, provider-ACL-er, `isyfomock` og arkivering av repoet eies av avviklingsarbeidet utenfor observability-epicen.

Airflow, `esyfovarsel`, `dulting-studio`, janitor-applikasjonene og øvrige ressurser i `teamsykefravr` inngår ikke.

## Nåværende evidens

- Planlagt cutover er mandag 31. august 2026.
- Siste kjente konsument følges i [syfomodiaperson#2194](https://github.com/navikt/syfomodiaperson/issues/2194) og [PR #2195](https://github.com/navikt/syfomodiaperson/pull/2195). PR-en var grønn, men ikke merget eller produksjonssatt 29. august.
- Legacy-repoet inneholder tre alertregler, men alertfilen er ikke koblet til dagens deployworkflow. Kildekode alene beviser derfor ikke hvilke regler som finnes live.
- Redis-exporteren er observert i runtimeinventaret, men sikker deploy- og eierskapsmekanisme er ikke identifisert.
- Tjenesten kan fortsatt ha trafikk, bakgrunnsarbeid og `varselbus`-publisering. Observability-sjekklisten kan synliggjøre dette, men kan ikke alene beslutte at tjenesten er trygg å stoppe.

## Før observability-cutover

Alle punktene dokumenteres med tidspunkt, målevindu og produksjonskilde i #208:

- [ ] Ansvarlig for tjenesteavviklingen har bekreftet produksjonscutover og eksplisitt GO.
- [ ] PR #2195 er merget, produksjonssatt og fulgt av verifisert nulltrafikk mot legacy-tjenesten.
- [ ] Erstatningen har friske prober, forventede SERVER-spans, metrikker og feilbilder.
- [ ] Live app-, Redis-, exporter- og `PrometheusRule`-tilstand er identifisert i `prod-fss`.
- [ ] Alle aktive dashboard-, alert- og topologireferanser er listet før de endres.
- [ ] Planlagt shutdown kan gjennomføres uten at legacy-regler skaper falske hendelser.

En grønn PR, en kildekode-SHA eller et tomt dashboardpanel er ikke alene produksjonsevidens.

## Observability-cutover

1. Rett før den eksternt godkjente stoppen: fjern eller demp bekreftede live legacy-regler som ellers vil varsle på planlagt shutdown.
2. Vent på eksplisitt bekreftelse fra avviklingsansvarlig om at cutover og ressursstopp er fullført.
3. Verifiser at erstatningen fortsatt er frisk, og at ingen falske `down`-, `absent`- eller `No data`-hendelser oppstår.
4. Marker de tre ressursene som avviklet i runtimeinventaret og fjern legacy-produsenten fra `varselbus`-topologien.
5. Fjern aktive legacy-referanser fra dashboardene og alertregisteret, men behold historisk beslutnings- og kildeevidens.
6. Regenerer dashboardartefaktene og kjør full docs-build.
7. Registrer queries, tidsvinduer, resultater og endelig status i #208.

Stopp observability-cutoveren hvis ekstern GO mangler, erstatningens telemetry er ukjent, det fortsatt finnes trafikk eller jobbaktivitet, live regler ikke kan identifiseres, eller planlagt shutdown skaper uventede hendelser.

## Evidensmal for #208

```text
Tidspunkt og målevindu:
Utført av:
Ekstern cutover-bekreftelse:
Legacy trafikk og aktivitet:
Erstatningens telemetry:
Live app/Redis/exporter/PrometheusRule:
Dashboard-, inventory-, topic- og alertendringer:
Falske hendelser etter cutover:
Beslutning: NO-GO | GO | STOPPET | FULLFØRT
Lenker eller skjermbilder:
```

## Ferdigkriterium

#208 kan lukkes når en separat, bekreftet produksjonscutover er fulgt av ryddede aktive dashboard-, inventory-, topic- og alertreferanser, uten blindsoner eller falske hendelser. Oppgaven eier ikke resten av tjenesteavviklingen.

Runtimeinventaret holder de tre ressursene som `sunset` frem til bekreftet cutover. Dashboardtestene låser dem ute av aktivt Kontrollrom- og Feiloversikt-scope.
