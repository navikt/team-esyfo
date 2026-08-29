# Runbook: pipelines og jobber

En Kafka-pipeline eller planlagt jobb er ikke frisk fordi podene kjører. Operativ helse krever typekorrekt forventet kjøring, ferskhet, progresjon, eldste ventende arbeid og terminalt utfall.

## Pipeline

1. Velg pipeline i Kontrollrommets matrise og identifiser aktive interne produsenter og konsumenter.
2. Bekreft kontraktstatus:
   - `IKKE EVALUERT`: signalbinding eller service-level er ikke godkjent.
   - `UKJENT`: kontrakten finnes, men evidens mangler eller er for gammel.
   - Grønn kan først brukes når expected run/traffic og alle avtalte terminale utfall er evaluert.
3. Les signalene separat:
   - ferskhet/siste vellykkede behandling,
   - progresjon/throughput,
   - eldste ventende arbeid,
   - retry og permanent failure/dead letter,
   - consumer lag bare der en intern konsument og labelkontrakt er bevist.
4. Avgrens til aktiv prosessor. Under varslingsmigreringen er `syfo-budstikka` målprosessor og `esyfovarsel` legacy-prosessor; samme prosess kan ikke vurderes med én blandet status.
5. Airflow/isyfo-analyse er en ekstern sekundærkonsument og er ute av Team eSyfos scope til data scientists eksplisitt avtaler annet.

## Planlagt jobb

1. Les cron, timezone og `lateAfterMinutes` fra runtimeinventaret.
2. Finn siste forventede run i lokal tid, inkludert helg/arbeidstid. Podtilstedeværelse er ikke et run.
3. Se terminalt Kubernetes failure-flagg. `No data` betyr at ingen relevant Job-resource er bevist i tidsrommet; det betyr ikke suksess.
4. Når adapteren finnes, bekreft siste start, siste suksess, varighet og terminalt utfall mot forventet run.
5. For `esyfovarsel-job` brukes kun et minimum guardrail i [esyfovarsel#1094](https://github.com/navikt/esyfovarsel/issues/1094); ikke bygg en ny varig plattform rundt den døende prosessoren.

## Recovery

- Ikke replay før idempotens, rekkefølge, skjema og downstream-konsekvens er avklart.
- Skill transient retry fra terminal forkasting.
- Dokumenter start-offset/tidsrom og antall records, aldri payload eller identifikatorer.
- Bevis at backlog/eldste alder går ned og at terminal failure ikke øker etter tiltak.

## Kontrollert test av runbooken

1. Bruk en dev-fixture eller dokumentert historisk hendelse med kjent expected run.
2. Bekreft at «ingen run», «failed run», «sen run» og «datasourcefeil» gir ulike utfall.
3. Bekreft at en intermittent topic med legitim nulltrafikk ikke markeres feilet.
4. Bekreft at poison record forblir synlig gjennom restart og ikke feilaktig regnes som recovery.

De konkrete topic-kontraktene godkjennes i [#212](https://github.com/navikt/team-esyfo/issues/212).
