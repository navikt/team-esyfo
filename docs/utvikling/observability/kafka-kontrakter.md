# Operative Kafka-kontrakter

Dette er det kildeverifiserte utkastet til [#212](https://github.com/navikt/team-esyfo/issues/212). Det skiller mellom hva dagens kode kan bevise og hva teamet fortsatt må beslutte. Ingen numerisk behandlingstid er godkjent ennå, så kontraktene står fortsatt som `proposed` og Kontrollrommet viser `IKKE EVALUERT`.

Airflow er bare ført som ekstern leser. Team eSyfo eier ikke driften eller sluttutfallet der. Consumer-lag brukes som diagnostikk, aldri som eneste pagergrunnlag.

Team eSyfo eier topicet og de interne stegene. Produsenten eier frem til broker-ACK, og intern konsument eier terminal behandling. Ved ekstern handoff overtar mottakerteamet; en ende-til-ende-kontrakt må avtales sammen.

## De ti topicene

Ingen av topicene er en heartbeat. Nulltrafikk er derfor ikke i seg selv en feil, men akseptabelt tidsvindu og nødvendige støttebevis må godkjennes per topic. Tabellen viser hvorfor null kan oppstå; den vedtar ikke nulltrafikkpolicyen.

| Topic og aktiv rute | Formål og terminal semantikk | Riktig helsesignal og nåværende gap |
|---|---|---|
| `aapen-syfo-oppfolgingsplan-lps-nav-v2`<br>`lps-oppfolgingsplan-mottak → ispersonoppgave` | Oppfølgingsplaner som krever NAV-bistand. Produsenten kaller asynkron `send`, men dagens success-telling beviser ikke broker-ACK. Ekstern konsuments sluttutfall og retry er ukjent. | Broker-ACK/-feil, reconciliation fra kvalifisert plan til event og ekstern freshness. Bekreft aktiv consumer group og sluttutfall med team iSyfo. |
| `budstikka.v1`<br>`syfo-oppfolgingsplan-backend → syfo-budstikka` | Varseldispatch med stabil `eventId`, durable outbox/inbox og deduplisering. Produsentens `SENT` betyr Kafka-ACK; Budstikkas delivery-`SENT` betyr at neste kanal har akseptert handoffen, ikke at brukeren har lest varselet. | Eldste forfalte outbox, retries, dead letters, terminale inbox-/deliveryutfall, reconciliation og ende-til-ende-latens i aktivt sendevindu. Se første snitt nedenfor. |
| `dinesykmeldte-hendelser-v2`<br>`esyfovarsel + syfo-budstikka + Flex → dinesykmeldte-backend` | Oppretter eller ferdigstiller hendelser for arbeidsgiverflaten. Terminal suksess er lagret hendelsestilstand. Behandlingsfeil restarter konsumenten; ingen DLQ er bevist. Budstikka er manifestert og implementert produsent, mens esyfovarsel fortsatt er legacy-produsent. | Behandlede utfall, freshness/eldste ubehandlede og reconciliation; group-lag kun som diagnostikk. Skill produsent og eventtype under migrering, og krev semantisk paritet og fravær av gammel trafikk før cutover. |
| `kartleggingssporsmal-svar`<br>`meroppfolging-backend → ismeroppfolging` | Brukerens kartleggingssvar lagres før en asynkron Kafka-send. Callback-feil logges, men verken returneres til kalleren eller forsøkes på nytt; lagret svar kan derfor mangle event. Ekstern sluttbehandling er ukjent. | Broker-ACK/-feil og reconciliation mellom lagrede svar og events, deretter ekstern freshness. Bekreft aktiv consumer group og sluttutfall med team iSyfo. |
| `sen-oppfolging-svar`<br>`meroppfolging-backend → ismeroppfolging` | Brukerens svar lagres før synkron publish. Publish-feil går tilbake til HTTP-kallet, men et nytt forsøk kan avvises fordi svaret allerede finnes. Ingen durable outbox er bevist. | Reconciliation lagret svar → Kafka-ACK → ekstern behandling. Avklar reparasjon/deduplisering og eksternt sluttutfall. |
| `sen-oppfolging-varsel`<br>`meroppfolging-backend → ismeroppfolging` | Planlagt jobb kjører hver time 09–17; en kjøring kan legitimt produsere null. Koden publiserer etter dokument/varselarbeid, mens manifestteksten beskriver en sendekommando. Service-laget kan svelge publish-feil slik at jobben fjerner retrydatoen. | Siste forventede jobbkjøring, antall kvalifiserte/publiserte/avviste/feilede og reconciliation. Avklar først om eventet betyr «send» eller «allerede sendt», og etabler reparerbar feilsemantikk. |
| `syfo-narmesteleder-leesah`<br>`esyfo-narmesteleder → dinesykmeldte-backend` | Team-eid, kompaktert kopi av nærmeste-leder-endringer. Broen lagrer, sender med broker-ACK og committer legacy-offset; feil gir batch-retry og kan duplisere. Ugyldige records droppes. Tombstones videresendes, mens dagens Dinesykmeldte-konsument ikke har en synlig null-guard. | Eksakt group-progresjon, alder på siste domeneevent, utfall per record og reconciliation av aktiv ledertilstand. Avklar tombstone, duplikat og expected-drop-semantikk. |
| `sykepengedager-informasjon-topic`<br>`sykepengedager-informasjon → meroppfolging-backend` | Beregnet sykepengeinformasjon. Produsenten venter på ACK og lagrer `SENT` eller `SENDING_FAILED`; ingen automatisk resend av feiltabellen er bevist. | Eldste `SENDING_FAILED`, ACK-/feilutfall, downstream-freshness og reconciliation. Avklar reparasjon og terminalt konsumentutfall. |
| `sykepengedager.infotrygd.v1`<br>`Infotrygd/GoldenGate → sykepengedager-informasjon` | Kompaktert input fra en team-eid AivenApplication med ekstern datakilde. Konsumenten acknowledger etter vellykket prosessering, men fanger feil uten ack eller rethrow; DLQ er ikke bevist. | Eksakt consumer-progresjon, eldste ubehandlede endring og reconciliation mot lagret tilstand. Bekreft retryoppførsel og teknisk eier for kilden. |
| `varselbus`<br>`flere produsenter → esyfovarsel` | Legacy varselbus. Konsumenten committer også etter behandlingsfeil; Kafka-inputen retries derfor ikke. Enkelte kanalfeil lagres og retries senere i databasen. `syfooppfolgingsplanservice` fjernes ved sunset 31. august 2026. | Per produsent og eventtype: kvalifisert → akseptert → sendt, expected drop eller teknisk/permanent feil; i tillegg eldste retry. Ikke bland migrert og legacy trafikk i én rate. |

Kildegrunnlaget er manifest og implementasjon på default branch 29.–30. august 2026: [LPS](https://github.com/navikt/lps-oppfolgingsplan-mottak/tree/05b79196efb91d7d8a2803c21f93a75c91b77215), [Budstikka](https://github.com/navikt/syfo-budstikka/tree/422a150ca189a8be0c615c35ba9c350d60aab802), [oppfølgingsplan](https://github.com/navikt/syfo-oppfolgingsplan-backend/tree/6fd3e1f6a5564ca73106f2ceedb039e0109bf953), [Dine sykmeldte](https://github.com/navikt/dinesykmeldte-backend/tree/1921141806d0085b221a8dbbe0345e9f21a4efb3), [Mer oppfølging](https://github.com/navikt/meroppfolging-backend/tree/3a5d83d6b8f3080ef04aeba25745ba8edca0bfcd), [nærmeste leder](https://github.com/navikt/esyfo-narmesteleder/tree/54b3bbbd6bb403d41356664302d0bdc7bc6dedaf), [sykepengedager](https://github.com/navikt/sykepengedager-informasjon/tree/f3e727e9ca5df07aeff08a945145fda6b3d25147) og [esyfovarsel](https://github.com/navikt/esyfovarsel/tree/4026473093e9fff96748fe2f225630c900d7cfa9). ACL beviser tilgang, ikke at en ekstern consumer group faktisk er aktiv.

## Første snitt: `OPPFOLGINGSPLAN_CREATED`

Dette er det beste første Budstikka-snittet: oppfølgingsplanen og outbox-raden opprettes atomisk, `eventId` er stabil, og flyten har én tydelig Min side-delivery.

- **Produsent:** Kafka-ACK gir `SENT`. Teknisk feil retries med samme `eventId`; en kilde som ikke lenger er kvalifisert er forventet bortfall, mens manglende kilde er en brutt invariant.
- **Ingest:** Gyldig dispatch lagres durable og duplikater dedupliseres. Ugyldig wire-input går til dead letter. DB-feil gjør at Kafka-batchen leses igjen.
- **Terminalt utfall:** Alle påkrevde deliveries er `SENT`, eller inbox er eksplisitt `DROPPED(DEAD)`. `FAILED`, dead-letter-vekst og oppbrukt retrybudsjett er tekniske feil.
- **Tid:** Varsler med Budstikkas sendevindu kan vente legitimt utenfor 09–20, søndag og stengte dager. En frist må derfor måle aktiv tid eller vise sendevindu-`WAIT` separat fra forsinkelse.

[Oppfølgingsplan-PR #451](https://github.com/navikt/syfo-oppfolgingsplan-backend/pull/451) foreslår produsentsignalene. [Budstikka-PR #264](https://github.com/navikt/syfo-budstikka/pull/264) og [#265](https://github.com/navikt/syfo-budstikka/pull/265) foreslår henholdsvis bounded dead-letter-signal og diagnostisk event-spor. Ingen av dem alene beviser ende-til-ende-kontrakten; tellingene må kunne reconciles på samme lave kardinalitetsflyt.

## Beslutninger før kontrakten kan godkjennes

1. Sett maksimal aktiv behandlingstid for produsent → Kafka-ACK, ingest → terminal kanalaksept og totalen. Start med `OPPFOLGINGSPLAN_CREATED`; eksisterende 15-minutters alert er en terskel, ikke en vedtatt SLA.
2. Godkjenn nulltrafikkpolicy per topic: tidsvinduet og hvilke signaler for forventet jobb/runtime, forfalt arbeid og retry-/feilbacklog som samtidig må være friske.
3. Klassifiser tvilstilfellene: manglende kilde, leder eller e-post, malformed records og tombstones som expected drop eller teknisk/product failure.
4. Bekreft aktive eksterne consumer groups, terminalt utfall og reparasjonsansvar med team iSyfo. Airflow forblir utenfor eSyfos driftsscope.
5. Godkjenn migrasjon per produsent og eventtype. Cutover krever at ny flyt er reconciled, uten gammel trafikk for typen i observasjonsvinduet, uten voksende oldest/retry/dead-letter-backlog, og med verifisert rollback/runbook.
6. Velg observasjonsperiode og shadow-terskler før et kontraktsbrudd får page. Før dette er signalene diagnostikk.
