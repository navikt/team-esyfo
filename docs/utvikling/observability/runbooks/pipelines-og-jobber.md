# Runbook: pipelines og jobber

En Kafka-pipeline eller planlagt jobb er ikke frisk fordi podene kjører. Operativ helse krever typekorrekt forventet kjøring, ferskhet, progresjon, eldste ventende arbeid og terminalt utfall.

## Oppfølgingsplan: utgående varselkø {#oppfolgingsplan-outbox}

Tabellen beskriver #454-kandidaten som er deployert til dev for canary: tre endrede køtilstandsregler og én ny ferskhetsregel for den utgående varselkøen (`outbox`). Prod har fortsatt de tre eldre uttrykkene og ingen egen snapshot-stalenessregel. Reglene må leses som produsentens ansvar frem til Kafka har bekreftet meldingen. De sier ikke at Budstikka eller sluttkanalen har levert varselet, og de beviser aldri at brukeren har lest det.

| Varselregel | Hva den betyr | Første kontroll |
|---|---|---|
| `OppfolgingsplanOutboxOldestDueTooOld` | Eldste leveringsklare melding er mer enn 15 minutter gammel, og vilkåret har vært sant sammenhengende i 10 minutter. | Avgrens på `message_type`, kontroller at eldste alder går ned, og se om telleren for nye forsøk (`retry`) eller feil øker. |
| `OppfolgingsplanOutboxExpiredClaims` | Køen har hatt minst én utløpt arbeidsreservasjon (`claim`) ved hver evaluering gjennom 10 minutter. Det er ikke nødvendigvis samme reservasjon. | Se etter pod-restart, lang behandling, Kafka-latens eller et reservasjonstidsrom som er kortere enn reell behandlingstid. |
| `OppfolgingsplanOutboxPersistentFailures` | Køen har hatt minst én ikke-terminal melding med teknisk feil gjennom 15 minutter. Den kan være i ventetid (`backoff`), og det er ikke nødvendigvis samme melding. | Kontroller `failure_count`, siste saniterte feilklasse og om Kafka/Budstikka er tilgjengelig. Ikke spill av på nytt før idempotens er avklart. |
| `OppfolgingsplanOutboxQueueSnapshotStale` | Den ferskeste poden har ikke produsert et snapshot for en kjent meldingstype på over 5 minutter, eller serien for meldingstypen mangler helt; vilkåret har vart i 10 minutter. Dette betyr ukjent datakvalitet, ikke bevist leveringsstans. | Stopp tolkning av køgaugene. Undersøk snapshot-worker, databaseobservasjon, podstatus og metrikkeksponering for den aktuelle meldingstypen. |

Bekreft alltid datakvaliteten før køtilstanden tolkes:

1. Velg `syfo-oppfolgingsplan-backend`, riktig miljø og samme `message_type` i Kontrollrommet eller Metrics Explore.
2. Kontroller `syfo_oppfolgingsplan_backend_outbox_queue_snapshot_last_success_timestamp_seconds` per pod og meldingstype. Et målesnapshot eldre enn 180 sekunder er **ukjent køtilstand**, ikke en frisk kø.
3. Sammenlign køsignalene fra samme ferske snapshot. Ikke bruk en gammel gauge sammen med et nytt podsett, og summer aldri pod-gaugene: poddene observerer den samme globale køen.
4. Skill produsentfeil fra neste ledd: outboxen slutter ved broker-ACK; Budstikkas inbox, delivery-kø og terminale kanalutfall undersøkes separat.

[Oppfølgingsplan-PR #454](https://github.com/navikt/syfo-oppfolgingsplan-backend/pull/454) foreslår å håndheve 180-sekunderskravet i alle tre køtilstandsuttrykkene før aggregering på app og meldingstype. Den legger samtidig til `OppfolgingsplanOutboxQueueSnapshotStale`, som bruker den ferskeste poden per app og meldingstype, varsler etter 5 minutters staleness og oppdager helt manglende serier for alle tre lukkede meldingstypene. Regelen må være sann i 10 minutter og er warning i dev og prod. Mellom 180 og 300 sekunder er køtilstanden allerede `UKJENT`, selv om stalenessregelen ennå ikke er sann.

Hele fire-reglerskandidaten er [deployert til dev-gcp](https://github.com/navikt/syfo-oppfolgingsplan-backend/actions/runs/33389745043); proddeployen ble hoppet over. PR-kandidaten er ikke kanonisk produksjonsgrunnlag før merge, proddeploy og autentisert live-avstemming. Inntil dette er gjort må prod-ferskhet kontrolleres manuelt, og fravær av alertserie skal aldri tolkes som grønt.

Normal drift er først bevist når alle tre kjente meldingstyper har ferskt snapshot, eldste forfalte alder faller til normalt nivå, utløpte arbeidsreservasjoner er borte, køen for nye forsøk ikke vokser og eksisterende backlog går til `SENT` eller forventet `CANCELLED`. Bruk eventuelt en kontrollert, ikke-personidentifiserende testmelding i dev; ikke krev en ny ekte produksjonsmelding som recoverytest. Dokumenter tidsrom og antall per meldingstype, aldri payload, fødselsnummer eller andre identifikatorer.

## Pipeline

1. Les den samlede kontraktstatusen i Kontrollrommet, og åpne runtimeinventaret derfra for å identifisere aktive interne produsenter og konsumenter.
2. Bekreft kontraktstatus:
   - `IKKE EVALUERT`: signalbinding eller tjenestenivå er ikke godkjent.
   - `UKJENT`: kontrakten finnes, men evidens mangler eller er for gammel.
   - Grønn kan først brukes når forventet kjøring eller trafikk og alle avtalte terminale utfall er evaluert.
3. Les signalene separat:
   - ferskhet/siste vellykkede behandling,
   - progresjon/gjennomstrømning,
   - eldste ventende arbeid,
   - nytt forsøk og permanent feil eller varig feilkø (`dead letter`),
   - consumer lag bare der en intern konsument og labelkontrakt er bevist.
4. Avgrens til aktiv prosessor. Under varslingsmigreringen er `syfo-budstikka` målprosessor og `esyfovarsel` tidligere prosessor; samme prosess kan ikke vurderes med én blandet status.
5. Airflow/isyfo-analyse er en ekstern sekundærkonsument og er utenfor Team eSyfos ansvarsområde til data scientists eksplisitt avtaler annet.

## Planlagt jobb

1. Les cron, timezone og `lateAfterMinutes` fra runtimeinventaret.
2. Finn siste forventede kjøring i lokal tid, inkludert helg/arbeidstid. Podtilstedeværelse er ikke en kjøring.
3. Se terminalt Kubernetes failure-flagg. `No data` betyr at ingen relevant Job-resource er bevist i tidsrommet; det betyr ikke suksess.
4. Når adapteren finnes, bekreft siste start, siste suksess, varighet og terminalt utfall mot forventet kjøring.
5. For `esyfovarsel-job` brukes kun en minimal sikkerhetsregel i [esyfovarsel#1094](https://github.com/navikt/esyfovarsel/issues/1094); ikke bygg en ny varig plattform rundt den døende prosessoren.

## Gjenoppretting

- Ikke spill av på nytt før idempotens, rekkefølge, skjema og konsekvens i neste ledd er avklart.
- Skill midlertidige nye forsøk fra terminal forkasting.
- Dokumenter start-offset/tidsrom og antall meldinger, aldri payload eller identifikatorer.
- Bevis at backlog/eldste alder går ned og at terminale feil ikke øker etter tiltak.

## Kontrollert test av runbooken

1. Bruk en dev-fixture eller dokumentert historisk hendelse med kjent forventet kjøring.
2. Bekreft at «ingen kjøring», «feilet kjøring», «sen kjøring» og «datasourcefeil» gir ulike utfall.
3. Bekreft at et topic med sporadisk, legitim trafikk ikke markeres feilet ved nulltrafikk.
4. Bekreft at en ugyldig melding forblir synlig gjennom restart og ikke feilaktig regnes som gjenopprettet.

De konkrete topic-kontraktene godkjennes i [#212](https://github.com/navikt/team-esyfo/issues/212).
