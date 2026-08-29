# Runbook: syfomotebehov tilgjengelighet

Dette er diagnostikk for pagerkandidaten i [syfomotebehov#753](https://github.com/navikt/syfomotebehov/issues/753). Den aktiverer ikke pager. Endelig rute krever dokumentert konsekvens, tuning, observasjonsperiode og second-person-verifikasjon i [#217](https://github.com/navikt/team-esyfo/issues/217).

## Bekreft signalet

1. Åpne Kontrollrommets panel `syfomotebehov · ready/desired`.
2. Bekreft namespace `team-esyfo`, cluster `prod`, deployment `syfomotebehov` og at desired er større enn null.
3. Skill:
   - ready/desired 0 % med desired > 0: runtime er utilgjengelig.
   - desired = 0 eller manglende desired-serie: `UKJENT`, ikke «nede».
   - datasourcefeil: queryen kunne ikke evalueres.

## Avklar konsekvens

1. Velg `syfomotebehov` som detaljtjeneste.
2. Les request-rate, OTel-feilstatus og P95 i samme tidsrom.
3. Se begge relevante reiser: Møtebehov og Dialogmøte. Runtimeutilgjengelighet er en pagerkandidat først når forventet arbeid eller brukerflyt faktisk kan rammes.
4. Åpne APM, Feildrilldown og avgrensede logger fra panelet.
5. Kontroller pågående rollout i NAIS Console. Pod-alder er ikke verifisert deploytid.

## Tiltak

- Stopp videre utrulling dersom avviket startet under en aktiv rollout.
- Bruk dokumentert rollback hvis siste endring er sannsynlig årsak og rollback er trygg.
- Ikke restart gjentatte ganger uten å forstå crash, readiness, avhengighet eller konfigurasjonsfeil.
- Hvis upstream/downstream er årsaken, dokumenter dette separat; appens podstatus alene beskriver ikke hele reisen.

## Bevis recovery

- ready/desired er stabilt 100 % i to komplette, påfølgende femminuttersvinduer, altså minst ti minutter. Dette er en diagnostisk v1-konvensjon; endelig alertvindu fastsettes og shadow-evalueres i #753/#217.
- Request-rate er tilbake til forventet mønster eller legitim nulltrafikk er dokumentert.
- Nye OTel-/runtimefeil øker ikke.
- En kontrollert, ikke-personidentifiserende test av relevant møtebehovsflyt lykkes.
- #753 oppdateres med tidsrom, årsak, tiltak og sanitert evidens.

## Runbook-test før pager

Test i dev ved å skalere en ufarlig testdeployment eller bruke en kontrollert readiness-fixture. Verifiser 100 %, degradert, 0 %, desired=0, manglende serie og datasourcefeil som seks ulike tilstander. Produksjon skal ikke forstyrres for å teste runbooken.
