---
title: Observability ved avvikling av syfooppfolgingsplanservice
---

# Observability ved avvikling av syfooppfolgingsplanservice

::: info CUTOVER BEKREFTET 2. september 2026
Produksjonstjenesten er stanset. Runtimeinventaret og den forventede topologien
kan derfor pensjonere legacyressursene. Nulltrafikk, gjenværende Redis/exporter,
live regler og falske hendelser må fortsatt verifiseres og dokumenteres i #208.
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

- Produksjonscutover er bekreftet 2. september 2026.
- Siste kjente konsument ble fulgt i [syfomodiaperson#2194](https://github.com/navikt/syfomodiaperson/issues/2194). [PR #2195](https://github.com/navikt/syfomodiaperson/pull/2195) er merget, og [deployworkflowen](https://github.com/navikt/syfomodiaperson/actions/runs/33496056838) fullførte både dev og prod.
- Legacy-repoets [kildesnapshot](https://github.com/navikt/syfooppfolgingsplanservice/blob/46e66123d27cc1ad930beb9cb523b1d0b4b712f3/nais/alerts-fss.yaml) inneholder tre alertregler, men alertfilen var ikke koblet til deployworkflowen. Kildekode alene beviser derfor ikke hvilke regler som fremdeles finnes live.
- Redis-exporteren er observert i runtimeinventaret, men sikker deploy- og eierskapsmekanisme er ikke identifisert.
- Runtimeinventaret regner ikke lenger tjenesten, Redis eller exporter som forventet produksjonsruntime. Hvis de fortsatt observeres live, rapporteres de som drift som må ryddes.

## Før observability-cutover

Alle punktene dokumenteres med tidspunkt, målevindu og produksjonskilde i #208:

- [x] Produksjonstjenesten er bekreftet stanset 2. september 2026.
- [x] PR #2195 er merget og produksjonssatt.
- [ ] Nulltrafikk mot legacy-tjenesten er verifisert med tidsvindu og produksjonskilde.
- [ ] Erstatningen har friske prober, forventede SERVER-spans, metrikker og feilbilder.
- [ ] Live app-, Redis-, exporter- og `PrometheusRule`-tilstand er identifisert i `prod-fss`.
- [ ] Alle aktive dashboard-, alert- og topologireferanser er listet før de endres.
- [ ] Planlagt shutdown kan gjennomføres uten at legacy-regler skaper falske hendelser.

En grønn PR, en kildekode-SHA eller et tomt dashboardpanel er ikke alene produksjonsevidens.

## Observability-cutover

1. Produksjonscutoveren er bekreftet.
2. De tre ressursene markeres som avviklet i runtimeinventaret, og legacy-produsenten fjernes fra `varselbus`-topologien.
3. Legacyressursene fjernes fra aktive dashboards. Alertregisteret beholder sist observerte kilde, regler og observasjoner som blokkert oppryddingsgjeld frem til en ny live-avstemming beviser fravær.
4. Dashboard- og registerartefaktene regenereres og full docs-build kjøres.
5. Verifiser nulltrafikk, gjenværende app-/Redis-/exporterressurser og live `PrometheusRule`-instanser. Eventuelle observerte legacyressurser er drift som skal fjernes.
6. Når live-fravær er bevist, fjernes den blokkerte oppryddingsgjelden fra alertregisteret og registerartefakten regenereres på nytt.
7. Verifiser at erstatningen fortsatt er frisk, og at ingen falske `down`-, `absent`- eller `No data`-hendelser oppstår.
8. Registrer queries, tidsvinduer, resultater og endelig status i #208.

Ikke fjern live ressurser eller regler, og ikke lukk #208, hvis tjenestestoppen er uavklart, erstatningens telemetry er ukjent, det fortsatt finnes trafikk eller jobbaktivitet, live regler ikke kan identifiseres, eller oppryddingen skaper uventede hendelser.

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

Runtimeinventaret holder de tre ressursene som `retired` etter bekreftet cutover. Dashboardtestene låser dem ute av aktivt Kontrollrom- og Feiloversikt-scope, mens runtime-drift fortsatt gjør eventuelle observerte legacyressurser synlige.
