# AID – kartlegging av eksisterende datakilder

Kartlagt 8. september 2026 mot kildekoden på `main`. **Hovedfunn: vi har allerede en analysevei via `isyfo-analyse`, BigQuery `EXTERNAL_QUERY` og Airflow/Quarto.** Vi trenger ikke starte med en ny innsamlingsplattform. Men eksisterende AID-beregninger og kildeuttak er ikke ferdige resultatkontrakter for Grafana.

Dette er kodeverifisering, ikke en kontroll av produksjonsdata, deployede revisjoner, databaseprivilegier eller vellykkede Airflow-kjøringer. Ingen spørringer er kjørt, persondata lest eller nye koblinger opprettet. Direkte analyse av sykefraværslengde, retur til arbeid og sykefraværsgrad er utenfor arbeidet. Tillatt tidsreferanse for planhandlinger må avklares separat, jf. [resultatmåling](./resultatmaaling).

## Hva finnes, og hva kan gjenbrukes?

| Behov | Eksisterende kilde | Hva som kan gjenbrukes | Viktig begrensning |
| --- | --- | --- | --- |
| Tildelt gruppe | Flaggskipet: `tiltakspakke_deltakelse`. Analyseuttak `flaggskipet_tiltakspakke_1`. | Lagret pakke, virksomhet, deltakelse, fylke, vurderingsgrunn og registreringstid. | Vurdering lagres ved oppslag. Tabellen er ikke dokumentert som et komplett register over alle kvalifiserte virksomheter. Registreringstid er ikke første UI-visning. [Tildeling][tildeling] · [brukstilfelle][vurdering] · [SQL][analyse-sql] |
| Ferdigstilt plan i Nav-løsningen | Planbackend: `oppfolgingsplan`. Uttak `ny_oppfolgingsplan`. | Én rad per lagret plan/versjon, `uuid`, `created_at`, virksomhet og metadata for deling. | Ny versjon får ny UUID; ingen eksplisitt forløpsnøkkel eller «første plan»-markør i tabellen. «Antall rader» er ikke antall oppfølginger med plan. [Tabeller][plantabeller] · [lagring][ferdigstilling] |
| Utkast / oppstart | `oppfolgingsplan_utkast`, samt `utkast_created_at` på ferdigstilt plan. | Tidspunkt for et bevart utkast eller utkastet som ble ferdigstilt. | Utkast oppdateres og slettes ved ferdigstilling. Utløpte utkast slettes etter fire måneder uten oppdatering. Ikke komplett historikk over alle som begynte og avbrøt. [Lagring][ferdigstilling] · [utkast][utkast] · [retensjon][planservice] |
| Deling med lege / Nav | `delt_med_lege_tidspunkt`, `delt_med_veileder_tidspunkt`, `journalpost_id`. | Registrert delingsresultat på planen; skill dette fra `skal_deles_*`. | Feltene oppdateres, ikke en egen historikktabell over hver deling. API-/journalføringsresultat beviser ikke at mottaker har lest planen. [API][planapi] · [DAO][plandao] |
| Planer fra LPS | `follow_up_plan_lps_v1`, eldre `altinn_lps`; eksisterende `sql/lps.sql`. | Mottatt plan, virksomhet, kilde og sendestatus. | `created_at` settes ved mottak i Nav, ikke nødvendigvis da planen ble laget hos leverandøren. Ny UUID per POST; ingen felles identitet med Nav-plan. LPS er kommentert ut av dagens AID-analyse. [API][lpsapi] · [DAO][lpsdao] · [SQL][lpssql] |
| Bestilling av påminnelse om å lage plan | `paaminnelse` + backendens `outbox`. | Nåstatus, gjeldende bestillings-ID og køens opprettelse/resultat innen lagringstiden. | Nåstatus overskrives. To kømeldinger per aktivering er ikke to bestillinger. Avbestilling er ikke garantert bevart som en egen historisk hendelse. [Bestilling][bestilling] |
| Ønske om evalueringspåminnelse | `oppfolgingsplan.evaluering_paaminnelse` + egne outbox-typer. | Innsendt boolsk verdi per lagret plan/versjon; planlagt behandling og resultat per kanal. | Eksisterende analyseuttak mangler feltet. Historisk/default `false` er ikke dokumentert aktivt nei; backendtabellen lagrer ikke levert skjemavariant. Ingen markør for at evalueringen faktisk er utført. [Tabeller][plantabeller] · [lagring][ferdigstilling] · [planlegging][evaluering] |
| Utsendingskjede | Backend `outbox` → Budstikka `inbox_message` → `delivery`. Analyseuttak finnes i `sql/budstikka.sql`. | Teknisk progresjon, kanal, status og avvisningsgrunn. | Backend `SENT` betyr publisert til Kafka. Budstikka `SENT` betyr kanalhandlerens suksess, ikke lest varsel. `delivery` har ikke et separat sendt-tidspunkt. [Publisering][publisering] · [delivery][delivery] · [worker][deliveryworker] · [SQL][budstikkasql] |
| Nav etterspør plan | Uttaket `be_om_oppfolgingsplan` leser `isoppfolgingsplan.foresporsel`. | Kandidatkilde for registrert forespørsel med virksomhet og tidspunkt. | SQL-kilden er funnet; produsentens hendelsessemantikk, avbrutte forespørsler og dekning er ikke verifisert her. Ikke det samme som et generelt «uke 8-varsel». [SQL][analyse-sql] |
| Nevner, også uten plan eller besøk | AID-analysen bruker `syfodata.oppfolgingstilfelle_person` for virksomheter hentet fra Flaggskipet. | Eksisterende analysevei kan undersøkes av analyseansvarlig. | Dette er person-/helserelatert analysegrunnlag, ikke ferdige godkjente Grafana-aggregater. Det dekker ikke automatisk hele pilotpopulasjonen, og vi gjenbruker ikke lengde-/gradfelter. [AID-kode][aidkode] · [kildehjelper][analyseutils] |

## Eksisterende analysevei – ikke et nytt datavarehus

`isyfo-analyse` har allerede:

- `sql/oppfolgingsplan.sql`: federerte uttak fra Flaggskipet og ny planbackend, samt forespørsler fra Nav.
- `sql/lps.sql` og `sql/budstikka.sql`: egne uttak for mottatte LPS-planer og varslingskjeden.
- `stories/aid_oppdrag/flaggskipet.py`: tildeling, kandidater til nevner og kobling til planopprettelse.
- `dags/aid_oppdrag_dag.py`: en daglig Quarto-jobb, med cron `0 3 * * *`. Tidssone og siste vellykkede kjøring må kontrolleres i det operative oppsettet. [DAG][aiddag]
- `transfer/datatransfer_oppfolgingsplan_deling.py`: overføring til BigQuery-datasettet `syfo_oppfolgingsplan_deling`. Dette er et avgrenset delingsuttrekk, ikke en komplett planpopulasjon eller endringshistorikk. [Overføring][delingsoverforing]

I planbackend er migreringen for alle tabeller og framtidige tabellprivilegier nylig utvidet i [#467](https://github.com/navikt/syfo-oppfolgingsplan-backend/pull/467). Flaggskipet og Budstikka har tilsvarende SQL for rollen `esyfo-analyse`; LPS har en eksisterende grant-migrering. Dette dokumenterer **tilsiktet teknisk tilgang**, ikke at migreringene er kjørt eller at ethvert nytt formål, felt, uttrekk eller dashboardpublikum er godkjent. Ingen credentials eller databaseforbindelser er brukt i kartleggingen. [Planbackend][grant-plan] · [Flaggskipet][grant-flagg] · [Budstikka][grant-bud] · [LPS][grant-lps]

Anbefalingen er å utvide den eksisterende analyseveien med et avklart aggregat, ikke å koble Grafana direkte til rå operasjonelle tabeller. Gjenbruk forbindelsene, men velg nødvendige felt eksplisitt; eksisterende `SELECT *`, innhold, mottakeridentiteter og feilmeldinger er ikke en eksportkontrakt for boardet.

## Konkrete ting som må rettes eller avklares før resultatvisning

### 1. «Innen 4 uker» beregnes ikke som fire uker

I [AID-koden][aidkode] viser panelet med denne tittelen om `created_at_plan` finnes. Det mangler både en fireukersgrense fra et avtalt startpunkt og et krav om at observasjonsvinduet er ferdig. Koblingen leter framover fra tildelingstid, med `tolerance=365` i en konstruert nøkkel. Det er ikke i seg selv en fireukersregel.

**Før gjenbruk:** avklar lovlig tidsreferanse og primær planhandling, test fristgrensen og skill ikke-modne observasjoner fra dem uten plan innen fristen. Inntil da må visningen ikke kalles «innen 4 uker» eller brukes som effektresultat.

### 2. Plankoblingen mister virksomhet og kan gi feil gruppetilhørighet

AID-koden sender bare `personident` og `created_at` fra plantabellen til koblingen. Senere fjernes duplikater på person alene. En person med to arbeidsgivere kan dermed få en plan fra feil virksomhet knyttet til sin gruppe, eller miste en relevant oppfølging i nevneren. [AID-kode][aidkode] · [koblingshjelpere][analyseutils]

**Før gjenbruk:** fastsett analyseenhet og eksplisitte koblingsnøkler med analyseansvarlig. Tester må dekke én person i flere virksomheter, flere planversjoner, plan før tildeling, ingen plan og flere oppfølginger. Dette notatet godkjenner eller implementerer ikke personkoblingen.

### 3. Uttakene er ikke oppdatert til hele datamodellen

- `paaminnelser`-uttaket peker til tabellen **`paaminnelser`**, mens appens migrering og DAO bruker **`paaminnelse`**. Ingen slik flertallstabell/view er funnet i appens migreringer. Dette er et konkret kontraktsavvik; eventuell databaseopprettet view og om uttaket brukes må kontrolleres før endring. [SQL][analyse-sql] · [DAO][bestilling]
- `ny_oppfolgingsplan` mangler blant annet `evaluering_paaminnelse`, `skjult_fra` og `feilregistrert`. Uten de to siste kan man ikke anvende en eksplisitt regel for skjulte/feilregistrerte planer. Skjult er ikke automatisk det samme som at en historisk planhandling aldri skjedde. [SQL][analyse-sql] · [tabeller][plantabeller]
- Det eksisterende AID-uttaket filtrerer allerede til tiltak/kontroll og `created_at >= 2026-08-31`. Det passer en avgrenset sammenligning, men kan ikke samtidig vise full tildelings-/datadekning. Analysen justerer også tidlige tildelinger til `2026-09-07`; denne pilotstarten er et kodevalg som må bekreftes av forsøksansvarlig, ikke utledes fra raden alene. [SQL][analyse-sql] · [AID-kode][aidkode]

### 4. Delingsoverføringen er ikke komplett endringsfangst

Overføringen velger delingsrader etter **planens opprettelsestid**, og BigQuery-merge gjør bare `WHEN NOT MATCHED THEN INSERT`. En gammel plan som deles etter uttrekksvinduet, eller en rad som får delingstidspunkt etter første innlasting, blir derfor ikke generelt fanget opp/oppdatert av denne mekanismen. Uttaket er dessuten begrenset til delingsvalg, så det er uegnet som nevner for alle planer. [Overføring][delingsoverforing]

**Før gjenbruk:** kildeansvarlig må verifisere formålet, etterslep og strategi for etterregistrerte resultater. Ikke anta at dette datasettet er CDC eller en fullstendig historikk. Ingen ny CDC eller endring av retensjon er bestilt her.

### 5. LPS har en annen resultatsemantikk

Nav-mottakstid er ikke leverandørens opprettelsestid. Dessuten returnerer dagens `FollowUpPlanSendingService` `isSentToNavStatus` fra `sendPlanToNav`, også i grenen der PDF mangler og journalføring ikke utføres; API-et bruker denne statusen til `sent_to_nav_at`. Det feltet alene er derfor ikke sikkert bevis på fullført journalføring. [LPS-sending][lpssending] · [API][lpsapi]

**Før gjenbruk:** behold Nav og LPS som separate kilder, avklar hva «laget», «mottatt», «delt» og «journalført» betyr, og kvalitetssikre bekreftelseskilden. Deduplisering og eventuelle rettinger i LPS er et eget arbeid; kartleggingen endrer ikke appen.

## Hvor mye historikk har vi faktisk?

| Kilde | Verifisert mekanisme i kode | Konsekvens for analyse |
| --- | --- | --- |
| Flaggskipet | Første lagrede vurdering beholdes ved konflikt. Migrering V10 nullstilte prelaunch-vurderinger; tidspunkt for utrulling er ikke verifisert her. | Ingen komplett endringshistorikk bak tildelingen. Ikke rekonstruer tidligere vurderinger fra dagens regel. [Repository][tildelingrepo] · [V10][reset] |
| Påminnelse om å lage plan | Nåstatus per person/virksomhet. Ny `bestilling_id` ved reaktivering/ny periode. Avbestilling kansellerer bare kømeldinger som fortsatt er `READY`. | Avbestilling etter at begge meldinger er sendt gir ikke nødvendigvis en historisk outbox-rad. «Aldri bestilt» og tidligere avbestilt kan ikke generelt skilles gjennom dagens nåstatus. [DAO][bestilling] |
| Planbackend outbox | `SENT`/`CANCELLED` slettes etter 90 dager fra `completed_at`, for de fem konfigurerte meldingstypene. | Kortvarig teknisk historikk, ikke varig analysehistorikk. To kanaler må ikke dobbelttelles. Ikke forleng lagring uten avklaring. [Policy][outboxpolicy] · [sletting][outboxdao] |
| Budstikka | Policyen i kode er 100 dager fra mottak for inbox/dead-letter og 180 dager fra opprettelse for terminale deliveries, men **oppryddingen er avslått i prod-manifestet**. `inbox_event_id` settes til null når inbox slettes. | Faktisk lagringshorisont er ikke verifisert. Ved opprydding kan koblingen forsvinne før delivery-raden. Nåstatus og `created_at` gir ikke et presist sendt-tidspunkt. Ikke slå på opprydding eller anta varig historikk ut fra denne kartleggingen. [Policy][budpolicy] · [sletting][budretention] · [FK][deliverymigration] · [manifest][budprod] |

## Anbefalt neste leveranse og minste avklaringer

**Start med kilde- og beregningsretting i eksisterende analysearbeid, ikke flere browserhendelser.** Før en PR som endrer analyseuttak/koblinger må analyseansvarlig bekrefte hvilke endringer som er innenfor dagens godkjente formål. Kartleggingen gir dette konkrete grunnlaget:

1. **Analyseansvarlig:** bekreft siste vellykkede AID-/planjobb, hvilke SQL-uttrekk som brukes, og om de nye tabellprivilegiene er deployet. Kontroller skjema/tilgang uten å eksportere personrader hit. Dette er drift/verifikasjon, ikke en ny analyse.
2. **Produkt- og analyseansvarlig:** velg analyseenhet og første planhandling, virksomhetssikker kobling, nevner og pilotstart. En komplett nevner må ta med relevante oppfølginger uten plan/besøk, og være eksplisitt om virksomheter uten lagret tildeling.
3. **Analyse-/personvernansvarlig:** avklar lovlig tidsreferanse, tillatte felt/segmenter, småtallsregler, lagringstid og hvem som kan se aggregatene. Eksisterende SQL eller teknisk SELECT-tilgang er ikke dokumentasjon på denne godkjenningen. Ingen direkte lengdeanalyse skal innføres.
4. **Kildeansvarlige:** avstem påminnelseshistorikk, etterregistrert deling og LPS-bekreftelse. Hvis et godkjent historisk uttrekk allerede finnes, gjenbruk det; ellers dokumenter gapet før ny innsamling foreslås.
5. **Dashboardansvarlig:** koble én godkjent aggregert resultatvisning til Grafana, med datadato, dekning, teller/nevner og metode. Inntil da fortsetter [levering og bruk](./dashboard) som separat produkttelemetri.

Ingen endringer i apper, analysekode, privilegier, retensjon eller produksjonsdata er gjort som del av denne kartleggingen. `syfooppfolgingsplanservice` behandles som avviklet, ikke som en ny produksjonskilde; eldre uttrekk derfra er historiske og må ikke blandes inn som nåværende AID-dekning.

## Kilderevisjoner

Lenkene under er låst til revisjonene som ble lest, slik at funnene kan etterprøves selv om `main` endres:

| Repository | Revisjon |
| --- | --- |
| `isyfo-analyse` | `40d4ef32b58cb406cb5f49fd168291d2d199d055` |
| `flaggskipet` | `ecb6fd285cf655525d26bbeefc2084f788e9d388` |
| `syfo-oppfolgingsplan-backend` | `3c02db6a793479ef15975fc61a06a409640deac2` |
| `lps-oppfolgingsplan-mottak` | `506b7f4b74a9289cd5a04d12f2d45ae6799a1b11` |
| `syfo-budstikka` | `dc425086ee513acea00cbe31325ecd7c38e1501b` |

[analyse-sql]: https://github.com/navikt/isyfo-analyse/blob/40d4ef32b58cb406cb5f49fd168291d2d199d055/sql/oppfolgingsplan.sql
[aidkode]: https://github.com/navikt/isyfo-analyse/blob/40d4ef32b58cb406cb5f49fd168291d2d199d055/stories/aid_oppdrag/flaggskipet.py
[analyseutils]: https://github.com/navikt/isyfo-analyse/blob/40d4ef32b58cb406cb5f49fd168291d2d199d055/tools/utils.py
[aiddag]: https://github.com/navikt/isyfo-analyse/blob/40d4ef32b58cb406cb5f49fd168291d2d199d055/dags/aid_oppdrag_dag.py
[lpssql]: https://github.com/navikt/isyfo-analyse/blob/40d4ef32b58cb406cb5f49fd168291d2d199d055/sql/lps.sql
[budstikkasql]: https://github.com/navikt/isyfo-analyse/blob/40d4ef32b58cb406cb5f49fd168291d2d199d055/sql/budstikka.sql
[delingsoverforing]: https://github.com/navikt/isyfo-analyse/blob/40d4ef32b58cb406cb5f49fd168291d2d199d055/transfer/datatransfer_oppfolgingsplan_deling.py
[tildeling]: https://github.com/navikt/flaggskipet/blob/ecb6fd285cf655525d26bbeefc2084f788e9d388/src/main/kotlin/no/nav/flaggskipet/infrastructure/database/tables/TiltakspakkeDeltakelseTable.kt
[tildelingrepo]: https://github.com/navikt/flaggskipet/blob/ecb6fd285cf655525d26bbeefc2084f788e9d388/src/main/kotlin/no/nav/flaggskipet/infrastructure/database/repositories/TiltakspakkeVurderingRepositoryImpl.kt
[vurdering]: https://github.com/navikt/flaggskipet/blob/ecb6fd285cf655525d26bbeefc2084f788e9d388/src/main/kotlin/no/nav/flaggskipet/application/VurderTiltakspakkerUseCase.kt
[reset]: https://github.com/navikt/flaggskipet/blob/ecb6fd285cf655525d26bbeefc2084f788e9d388/src/main/resources/database.migration/V10__nullstill_tiltakspakkevurderinger.sql
[grant-flagg]: https://github.com/navikt/flaggskipet/blob/ecb6fd285cf655525d26bbeefc2084f788e9d388/src/main/resources/database.migration/R__grant_analysis_privileges.sql
[plantabeller]: https://github.com/navikt/syfo-oppfolgingsplan-backend/blob/3c02db6a793479ef15975fc61a06a409640deac2/src/main/kotlin/no/nav/syfo/oppfolgingsplan/db/OppfolgingsplanTables.kt
[ferdigstilling]: https://github.com/navikt/syfo-oppfolgingsplan-backend/blob/3c02db6a793479ef15975fc61a06a409640deac2/src/main/kotlin/no/nav/syfo/oppfolgingsplan/db/OppfolgingsplanFinalizationRepository.kt
[utkast]: https://github.com/navikt/syfo-oppfolgingsplan-backend/blob/3c02db6a793479ef15975fc61a06a409640deac2/src/main/kotlin/no/nav/syfo/oppfolgingsplan/db/OppfolgingsplanUtkastDAO.kt
[planservice]: https://github.com/navikt/syfo-oppfolgingsplan-backend/blob/3c02db6a793479ef15975fc61a06a409640deac2/src/main/kotlin/no/nav/syfo/oppfolgingsplan/service/OppfolgingsplanService.kt
[planapi]: https://github.com/navikt/syfo-oppfolgingsplan-backend/blob/3c02db6a793479ef15975fc61a06a409640deac2/src/main/kotlin/no/nav/syfo/oppfolgingsplan/api/v1/arbeidsgiver/OppfolgingsplanApiV1.kt
[plandao]: https://github.com/navikt/syfo-oppfolgingsplan-backend/blob/3c02db6a793479ef15975fc61a06a409640deac2/src/main/kotlin/no/nav/syfo/oppfolgingsplan/db/OppfolgingsplanDAO.kt
[bestilling]: https://github.com/navikt/syfo-oppfolgingsplan-backend/blob/3c02db6a793479ef15975fc61a06a409640deac2/src/main/kotlin/no/nav/syfo/oppfolgingsplan/db/OpprettOppfolgingsplanPaaminnelseDAO.kt
[evaluering]: https://github.com/navikt/syfo-oppfolgingsplan-backend/blob/3c02db6a793479ef15975fc61a06a409640deac2/src/main/kotlin/no/nav/syfo/oppfolgingsplan/outbox/EvalueringPaaminnelseFactory.kt
[publisering]: https://github.com/navikt/syfo-oppfolgingsplan-backend/blob/3c02db6a793479ef15975fc61a06a409640deac2/src/main/kotlin/no/nav/syfo/varsel/budstikka/infrastructure/BudstikkaProducer.kt
[outboxpolicy]: https://github.com/navikt/syfo-oppfolgingsplan-backend/blob/3c02db6a793479ef15975fc61a06a409640deac2/src/main/kotlin/no/nav/syfo/plugins/DependencyInjection.kt
[outboxdao]: https://github.com/navikt/syfo-oppfolgingsplan-backend/blob/3c02db6a793479ef15975fc61a06a409640deac2/src/main/kotlin/no/nav/syfo/application/outbox/db/OutboxDAO.kt
[grant-plan]: https://github.com/navikt/syfo-oppfolgingsplan-backend/blob/3c02db6a793479ef15975fc61a06a409640deac2/src/main/resources/db/migration/R__grant_analysis_privileges.sql
[lpsapi]: https://github.com/navikt/lps-oppfolgingsplan-mottak/blob/506b7f4b74a9289cd5a04d12f2d45ae6799a1b11/src/main/kotlin/no/nav/syfo/oppfolgingsplanmottak/FollowUpPlanApi.kt
[lpsdao]: https://github.com/navikt/lps-oppfolgingsplan-mottak/blob/506b7f4b74a9289cd5a04d12f2d45ae6799a1b11/src/main/kotlin/no/nav/syfo/oppfolgingsplanmottak/database/LpsOppfolgingsplanDao.kt
[lpssending]: https://github.com/navikt/lps-oppfolgingsplan-mottak/blob/506b7f4b74a9289cd5a04d12f2d45ae6799a1b11/src/main/kotlin/no/nav/syfo/oppfolgingsplanmottak/service/FollowUpPlanSendingService.kt
[grant-lps]: https://github.com/navikt/lps-oppfolgingsplan-mottak/blob/506b7f4b74a9289cd5a04d12f2d45ae6799a1b11/src/main/resources/db/migration/V13__Create_analysis_user.sql
[delivery]: https://github.com/navikt/syfo-budstikka/blob/dc425086ee513acea00cbe31325ecd7c38e1501b/src/main/kotlin/no/nav/budstikka/infrastructure/database/delivery/DeliveryTable.kt
[deliveryworker]: https://github.com/navikt/syfo-budstikka/blob/dc425086ee513acea00cbe31325ecd7c38e1501b/src/main/kotlin/no/nav/budstikka/application/delivery/DeliveryWorker.kt
[deliverymigration]: https://github.com/navikt/syfo-budstikka/blob/dc425086ee513acea00cbe31325ecd7c38e1501b/src/main/resources/database.migration/V3__delivery.sql
[budpolicy]: https://github.com/navikt/syfo-budstikka/blob/dc425086ee513acea00cbe31325ecd7c38e1501b/src/main/kotlin/no/nav/budstikka/application/retention/RetentionPolicy.kt
[budretention]: https://github.com/navikt/syfo-budstikka/blob/dc425086ee513acea00cbe31325ecd7c38e1501b/src/main/kotlin/no/nav/budstikka/infrastructure/database/retention/RetentionRepositoryImpl.kt
[budprod]: https://github.com/navikt/syfo-budstikka/blob/dc425086ee513acea00cbe31325ecd7c38e1501b/nais/nais-prod.yaml
[grant-bud]: https://github.com/navikt/syfo-budstikka/blob/dc425086ee513acea00cbe31325ecd7c38e1501b/src/main/resources/database.migration/R__grant_analysis_privileges.sql
