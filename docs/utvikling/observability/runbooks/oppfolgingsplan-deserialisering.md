# Runbook: permanent deserialiseringsfeil i Oppfølgingsplan

`syfo_oppfolgingsplan_backend_sykmelding_deserialization_error_total` teller records som ikke kan deserialiseres og derfor kan forkastes permanent. Vedvarende rate kan gi manglende sykmeldingsperioder i oppfølgingsplanen. Implementering og kontrollert verifikasjon følges i [syfo-oppfolgingsplan-backend#449](https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/449).

Dette er en blokkert pagerkandidat. Ingen pager aktiveres før recovery/reconciliation, evidens og ruting er godkjent i [#217](https://github.com/navikt/team-esyfo/issues/217).

## Bekreft signalet

1. Åpne Kontrollrommets panel `Oppfølgingsplan · permanent deserialiseringsrate`.
2. Bekreft at serien har namespace `team-esyfo`, `k8s_cluster_name="prod"` og at økningen varer lenger enn et enkelt scrape-/deployvindu. Kontrollrommet skal aldri blande dev og prod.
3. Panelet summerer rate over alle prod-replikaer for å vise total forkastingshastighet. Sammenlign med den eksisterende kandidatregelen, som fortsatt evaluerer enkeltserier, før terskel eller pagersemantikk endres.
4. Skill permanent deserialisering fra transient runtimefeil og generell consumer lag.
5. `No data` betyr manglende eller ukjent metrikkserie, ikke null permanente feil.

## Avgrens konsekvens uten persondata

1. Åpne `syfo-oppfolgingsplan-backend` i APM og Feildrilldown for samme tidsrom.
2. Bruk sanitert logger-/exception-type, schema-versjon, topic/partition og offset der dette er trygt. Ikke kopier record payload, fødselsnummer, sykmeldingsinnhold eller rå stacktrace til GitHub/Slack.
3. Sammenlign consumerens forventede skjema med produsentens faktisk deployerte kontrakt/revision.
4. Tell berørte records og tidsrom. En metrikkrate alene identifiserer ikke hvilke personer eller oppfølgingsplaner som mangler data.

## Velg recovery

- Ikke restart eller replay blindt; samme record kan forkastes igjen og skjule kø-/offsetbildet.
- Avklar om feilen skyldes inkompatibelt skjema, ugyldig historisk record, feil serializer eller korrupt data.
- Før replay må idempotens, offset-strategi, downstream-sideeffekter og tilgang til original record være dokumentert.
- Hvis records er permanent tapt, avtal en eksplisitt reconciliation fra autoritativ kilde og dokumenter forventet antall.
- Ved kontraktbrudd: stabiliser produsent/consumer-kompatibilitet før backlog behandles.

## Bevis recovery

- Deserialiseringsraten er 0 i to komplette, påfølgende femminuttersvinduer med faktisk consumertrafikk, altså minst ti minutter. Dette følger panelets `rate(...[5m])`; endelig alertvindu fastsettes i #449/#217.
- Nye permanente feil øker ikke etter deploy/recovery.
- Eventuell backlog eller reconciliation fullfører med forventet antall, og terminale avvik er eksplisitt redegjort for.
- En sanitert ende-til-ende-kontroll bekrefter at sykmeldingsperioder materialiseres uten å dele persondata.
- #449 inneholder tidspunkt, schema-/revisionbevis, tiltak og kontrollresultat.

## Kontrollert test før pager

Bruk dev og en syntetisk record uten persondata:

1. Produser én gyldig record og bekreft normal behandling.
2. Produser en kontrollert inkompatibel fixture og bekreft at metrikken, dashboardet og runbooken peker på samme hendelse.
3. Bevis trygg recovery/reconciliation og at retry ikke gir dobbel sideeffekt.
4. Bekreft at logger og traces ikke eksponerer payload eller identifikatorer.
5. Dokumenter testens metrikkvindu og forventede utfall som evidens i #449.
