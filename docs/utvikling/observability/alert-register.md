---
aside: false
---

# Alert-register

Alert-registeret er Team eSyfos sporbare oversikt over observerte alertinstanser og nåværende eller historisk kildegrunnlag. Det svarer på fire ulike spørsmål uten å blande dem sammen:

1. Hvilken regel er deklarert, hvor kommer den fra, og hva forsøker den å måle?
2. I hvilke miljøer er regelen deployert, og er den konfigurert som `enabled`, `paused` eller `disabled`?
3. Hva viste den tidsstemplede live-observasjonen?
4. Hvilket vedtak og hvilken operativ respons gjelder i den vedtatte fasen — og hva mangler før den faktisk er implementert?

<AlertRegistry />

## Vedtaket i korte trekk

[Alert-policyen i #210](https://github.com/navikt/team-esyfo/issues/210) klassifiserer hver logiske regel eksplisitt som `KEEP`, `TUNE`, `REPLACE`, `RETIRE`, `MIGRATE` eller `EXTERNAL_ONLY`. Ingen regel får en implisitt standardbeslutning; de genererte tellingene står i registervisningen over.

Dette er en **vedtatt operativ policy**, ikke en beskrivelse av hva dagens Slack-/Grafana-ruting allerede leverer. Responsen er eksplisitt fasebundet: for eksempel «etter tuning», «erstatningen», «under migrering» eller «frem til pensjonering». En `RETIRE`-regel med ticket betyr derfor en midlertidig guardrail, ikke at ticket er regelens endelige måltilstand. Pager-kandidatene står som blokkert. En kandidat kan først markeres klar når den har alvorlig produksjonskonsekvens, konkret umiddelbar handling, kritisk produksjonsseverity, testet runbook, relevant diagnostisk dashboard og en verifisert avbrytende kanal. `#esyfo-alarm` er verifisert som Team eSyfos NAIS-rute, men Slack-ruting alene er ikke pager/on-call.

Responsklassene betyr:

- **Pager:** avbrytende respons på pågående eller nært forestående alvorlig bruker-/domenekonsekvens som krever handling nå.
- **Ticket:** deduplisert, ikke-avbrytende oppfølging med konkret eier og handling innen neste bemannede arbeidsdag.
- **Dashboard-only:** trend eller diagnostikk uten forhåndsdefinert operativ handling og uten varslingsrute.

Én ordinær requestfeil, én pod, rå loggrate, rå consumer-offset eller `lag > 0` alene kan ikke page. Dette følger prinsippene om handlingsrettede symptomsignaler og SLO-baserte varsler fra [Google SRE Workbook](https://sre.google/workbook/alerting-on-slos/) og [Prometheus alerting practices](https://prometheus.io/docs/practices/alerting/). Kafka-fremdrift skal bruke typekorrekt behandlingstid/ferskhet og terminale utfall, ikke absolutt offset; se [Apache Kafka monitoring](https://kafka.apache.org/42/operations/monitoring/).

Kanalene er avklart slik:

- `#esyfo-alarm` er Team eSyfos aktive operative Slack-inngang for ticket-respons. Den får ikke pager-semantikk uten separat verifisert avbrytende rute.
- `#esyfo-data-alert` brukes av Airflow/DAG-er i `isyfo-analyse` og eies av data scientists. Reglene importeres ikke i dette registeret.
- `#esyfo-kibana-alerts` har ingen verifisert nåværende kode-/plattformreferanse. Den er `no-new-alerts` frem til eier og mottaker eventuelt verifiseres på nytt.

`RETIRE` betyr heller ikke «slett nå». Hver pensjonering har enten verifisert/begrunnet bortfall eller en eksplisitt gate. For eksempel kan `syfobrukertilgang`-reglene ikke fjernes fra GCP før [tilgangscutoveren i syfomotebehov](https://github.com/navikt/syfomotebehov/issues/755) er bevist, mens de tre foreldreløse FSS-instansene kan [ryddes separat](https://github.com/navikt/syfobrukertilgang/issues/368).

## Slik skal statusene leses

Registeret skiller bevisst mellom **konfigurasjon**, **evaluering** og **evaluatorhelse**. NAIS viste 39 PrometheusRule-instanser som `Inactive` ved det opprinnelige snapshotet. `Inactive` betyr bare at ingen alertinstans fyrte akkurat da. Det er derfor ikke det samme som `disabled`, og heller ikke et bevis på at evaluator eller query er frisk.

Etter snapshotet ble de to `BudstikkaConsumerLagCritical`-instansene [fjernet i syfo-budstikka#263](https://github.com/navikt/syfo-budstikka/pull/263). [Deployen fullførte i både dev og prod](https://github.com/navikt/syfo-budstikka/actions/runs/33250953194), så v2-registeret inneholder nå 37 gjeldende PrometheusRule-instanser. Det frosne v1-snapshotet beholder de opprinnelige 39 som historikk. Budstikkas planlagte ende-til-ende-ferskhet er fortsatt en strategisk pager-kandidat i [syfo-budstikka#260](https://github.com/navikt/syfo-budstikka/issues/260) og [#217](https://github.com/navikt/team-esyfo/issues/217), men telles ikke som en eksisterende regel før den faktisk er implementert.

De to Grafana-reglene var derimot eksplisitt `paused / not-evaluated`. Kafka-regelen må ikke bare slås på: navnet omtaler consumer lag, mens uttrykket måler absolutt consumer-offset. Live preview viste 46 serier over terskelen. Siden regelen både er pauset og semantisk ugyldig, er den klar for begrunnet sletting uten en ny global kopi. Bare `budstikka.v1` har direkte overlapp via én app-avgrenset warning-regel; de ni øvrige topic-gapene beholdes i [#212](https://github.com/navikt/team-esyfo/issues/212), som definerer riktig eier og signal per topic.

Den andre Grafana-regelen sammenligner kandidater i `meroppfolging-backend` med en senere legacy-teller i `esyfovarsel`. Tellerne har ulike prosesseringsgrenser og kan ikke brukes som et regnskap. Den forblir pauset frem til en prosessornøytral erstatning er shadow-verifisert for akkurat `SM_MER_VEILEDNING`; en vilkårlig første Budstikka-flyt oppfyller ikke dette kravet.

Prometheus-reglene rutes i dag via NAIS-teaminnstillingen til `#esyfo-alarm`. Grafana-reglene har kontaktpunktet `Slack-esyfo-alert`, men den fysiske kanalen bak webhooken er ikke synlig i regelvisningen og står derfor eksplisitt som `unresolved`. Registeret gjetter ikke. Den vedtatte, fasebundne responsen står separat fra denne observerte rutingen, og policygap forblir synlige frem til tilhørende oppgave har live-evidens.

## Oppdatering og kontroll

Kjør fra `docs/`:

```bash
pnpm alert-register:check
pnpm alert-register:test
pnpm alert-register:export
pnpm alert-register:drift -- --observed /tmp/esyfo-alert-observations.json
```

`alert-register:check` validerer registeret og kontrollerer at `public/alert-register.v2.json` er synkronisert. V2 inneholder både faktisk observasjon og eksplisitt vedtatt policy. Den tidligere `public/alert-register.v1.json` beholdes som et frosset, maskinmerket `superseded` kartleggingssnapshot fra #203; den inneholder ikke vedtatt policy og er ikke gjeldende kontrakt. `alert-register:test` dekker tellinger, kildesporbarhet, statussemantikk, beslutningsmatrise, retirement-gates og pager-sikkerhet. `alert-register:export` oppdaterer den maskinlesbare v2-artefakten.

`alert-register:drift` sammenligner registeret med et autentisert observation-snapshot v1. Et snapshot må inneholde regel-ID, miljø, konfigurert tilstand, evalueringstilstand, evaluatorhelse, observasjonstidspunkt og evidenslenke per instans. Manglende eller gammelt bevis blir `unknown`; det blir aldri tolket som grønt.

Driftkommandoen sammenligner fingerprinten som snapshot-produsenten oppgir; den canonicaliserer ikke PromQL. Snapshot-produsenten må derfor følge samme dokumenterte, manuelle semantiske normalisering når NAIS har injisert labels eller endret matcherrekkefølge.

Vanlig dokumentasjonsbygg henter ikke live produksjonsdata. For ordinære repo-kilder pinner registeret alertdefinisjonen som lå på default branch ved kildens registrerte innhentingstid. Denne commit-SHA-en er kildegrunnlag, **ikke bevis på eksakt deployed SHA**. Ved det opprinnelige snapshotet ble live query og `for` manuelt avstemt for alle 39 NAIS-instansene; v2 beholder attestasjonene for de 37 gjeldende instansene etter Budstikka-oppryddingen. Resultatet er lagret som uavhengige fingerprint-/timing-attestasjoner, slik at en senere kildeendring feiler valideringen frem til live-beviset oppdateres. NAIS injiserer `k8s_cluster_name` og kan omorganisere matchere, så dette er en dokumentert semantisk sammenligning — ikke en automatisk PromQL-canonicalizer. Grafana-kildene ble avstemt direkte i regelvisningen og er pinnet med regel-UID. Når regler endres, skal både kildegrunnlag, observasjon og eksportert artefakt oppdateres i samme endring.

### Kilde-/deploydrift: fire restinstanser

To historiske kilde-/deploygrunnlag forklarer fire PrometheusRule-instanser som fortsatt var synlige i NAIS, men som ikke lenger styres av det aktuelle grunnlaget:

- `ALTINN KAFKA OPPFOLGINGSPLAN CONSUMER LAG` var fortsatt enabled/inaktiv i `prod-gcp`. `lps-oppfolgingsplan-mottak/nais/alerts.yaml` ble [slettet i commit `16a44e597fdc`](https://github.com/navikt/lps-oppfolgingsplan-mottak/commit/16a44e597fdc6bfd9dc01c2ecec41b085c2dfa28) 2. juli 2026 da consumeren ble fjernet. [Siste gyldige fil ligger i parent-commit `c2101c2278ed`](https://github.com/navikt/lps-oppfolgingsplan-mottak/blob/c2101c2278ed8b67181480beed67c2038121f492/nais/alerts.yaml).
- Tre `syfobrukertilgang`-regler var fortsatt enabled/inaktive i `prod-fss`, mens [NAIS-applikasjonslisten](https://console.nav.cloud.nais.io/team/team-esyfo/applications) bare viser tjenesten i `dev-gcp` og `prod-gcp`. [Commit `9c9a259c7926`](https://github.com/navikt/syfobrukertilgang/commit/9c9a259c7926093335a24788ed9fd82d00406d82) flyttet alert-workflowen fra `prod-fss` til `prod-gcp` 22. mai 2023; den slettet ikke alertfilen. [Commit `22b66f6950f8`](https://github.com/navikt/syfobrukertilgang/blob/22b66f6950f874ac10dd5c2012c67c7a0835154e/alerts.yaml) er siste repository-snapshot før denne cluster-cutoveren. Den er **ikke** bevis på hvilken SHA som sist ble deployert til FSS. Instansene avviker også fra runtimeinventarets `prod-gcp`.

Registeret behandler disse repo-referansene som **historiske kilder** og de berørte reglene som oppryddingsfunn under utfasing. De skal verifiseres og ryddes i NAIS, ikke brukes som bevis for at alle 28 gjeldende Prometheus-regler fortsatt styres av dagens kildekode. Kartleggingen har 11 nåværende default-branch-kilder og 2 historiske repo-kilder.

### Leveringsdrift: tre alertfiler har workflow-gap

Tre av de nåværende kildefilene er heller ikke pålitelig koblet til kontinuerlig levering, til sammen for ti live regelinstanser:

- [`syfobrukertilgang/.github/workflows/alerts.yaml`](https://github.com/navikt/syfobrukertilgang/blob/9571911ed14724db56d316c379c51b7b832f9676/.github/workflows/alerts.yaml) følger `alerts.yaml`, men deployer `nais/alerts.yaml` til `prod-gcp`.
- [`syfomotebehov/.github/workflows/alerts.yaml`](https://github.com/navikt/syfomotebehov/blob/0c1549a71463a60569a4c07cc3c1c147c22d45e4/.github/workflows/alerts.yaml) følger `.nais/alerts-gcp.yaml`, men deployer `nais/alerts-gcp.yaml` til `prod-gcp`.
- [`syfooppfolgingsplanservice/.github/workflows/build-and-deploy.yaml`](https://github.com/navikt/syfooppfolgingsplanservice/blob/46e66123d27cc1ad930beb9cb523b1d0b4b712f3/.github/workflows/build-and-deploy.yaml) deployer applikasjonsmanifestet, men refererer ikke `nais/alerts-fss.yaml`.

Det betyr ikke at live-reglene er deaktivert. Det betyr at en endring i kildefilen ikke har en pålitelig, sporbar vei til produksjon. Gapene må ryddes eller eksplisitt pensjoneres i policyarbeidet; `syfooppfolgingsplanservice` skal uansett avvikles 31. august.

## Scope og beslutninger

Registeret følger det godkjente [runtimeinventaret](/utvikling/observability/runtimeinventar). Airflow/data science, `teamsykefravr`, `dulting-studio` og `syfojanitor-*` er eksplisitt utenfor scope. Eksterne topics kan likevel stå som avhengigheter når en eSyfo-regel måler dem.

Målets tjeneste-/capabilitylivssyklus er kontekst på hver regel. Den beskriver om runtime eller prosess er varig, migrerende eller på vei bort; selve regelens skjebne bestemmes bare av policyvedtaket:

- Regler for `esyfovarsel` er midlertidige guardrails under migreringen til `syfo-budstikka`. Eksakt cutoverdato er ikke besluttet; gjennomføringen og trygg fjerning av legacy-reglene følges i [#218](https://github.com/navikt/team-esyfo/issues/218).
- Regler for `syfobrukertilgang` beholdes mens tjenesten fases ut. Tre deployerte `prod-fss`-instanser er bekreftet restkonfigurasjon fra GCP-migreringen og skal ryddes kontrollert.
- Regler for `syfooppfolgingsplanservice` følger tjenestens besluttede sunset 31. august 2026, se [#208](https://github.com/navikt/team-esyfo/issues/208).
- Varige regler er kandidater for standardisering etter brukerreise, pipeline og semantisk familie — ikke bare kopiering av dagens terskler.

Kanonisk kartlegging ligger i [#203](https://github.com/navikt/team-esyfo/issues/203), og policyvedtaket i [#210](https://github.com/navikt/team-esyfo/issues/210). Dashboards og runbooks følges i [#211](https://github.com/navikt/team-esyfo/issues/211), Kafka-/pipelinekontrakter i [#212](https://github.com/navikt/team-esyfo/issues/212), og aktivering skal skje kontrollert gjennom [#217](https://github.com/navikt/team-esyfo/issues/217). App-spesifikke gap er koblet direkte fra hver regel i matrisen.
