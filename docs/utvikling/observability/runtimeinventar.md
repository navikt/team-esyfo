# Runtimeinventar og observability-dekning

Denne siden er Team eSyfos kanoniske, maskinlesbare ønskede produksjonsscope. Den er avgrenset fra [repooversikten](/utvikling/repositories): et repo kan være eid uten å ha en aktiv runtime, mens én runtime kan ha flere browserflater. Browserradene vurderes mot den korte [browserkontrakten](./browserkontrakt), og topicradene utdypes i de [operative Kafka-kontraktene](./kafka-kontrakter).

<RuntimeInventory />

## Slik holdes inventaret ærlig

Inventaret skiller mellom tre ting:

1. **Ønsket tilstand** — runtimeidentitet, eier, livssyklus, kritikalitet, brukerreise/pipeline og obligatoriske signaler.
2. **Observert runtime** — et tidsstemplet snapshot fra NAIS/Kubernetes.
3. **Dekningsevidens** — tidsstemplet resultat fra metrikker, logger, traces og syntetiske kontroller.

Bare fersk, vellykket evidens kan gi komplett dekning. Manglende serier, stale snapshots, gamle enkeltressurser og feil fra en datakilde er henholdsvis `missing` eller `unknown`, aldri grønt. En topic med legitim nulltrafikk vurderes ut fra fersk kontroll av pipeline/runtime og backlog — ikke ut fra at den må ha meldinger hele tiden. Continuous topics krever derimot et ferskt `lastSeenAt`-bevis innen behandlingsfristen.

## Lokal validering og driftkontroll

Kjør fra `docs/`:

```bash
pnpm inventory:check
pnpm inventory:test
pnpm inventory:observe -- --output /tmp/esyfo-runtime.json
pnpm inventory:drift -- --observed /tmp/esyfo-runtime.json
pnpm inventory:coverage -- --evidence /tmp/esyfo-coverage-evidence.json
```

`inventory:observe` bruker dine eksisterende `kubectl`-rettigheter mot `prod-gcp` og `prod-fss`. Vanlig dokumentasjonsbygg henter aldri live produksjonsdata; CI er deterministisk og bruker samme rene validator og driftmotor som den autentiserte adapteren.

`inventory:coverage` tar imot den tidsstemplede `coverage evidence v1`-kontrakten og rapporterer `complete`, `partial`, `missing` eller `unknown` per app, jobb, topic og browserflate. Browserens `release-identity` krever matchende immutable kilde- og deploy-SHA; en flytende `main`-referanse er ikke bevis. Kontraktene kommer fra [#203](https://github.com/navikt/team-esyfo/issues/203), [#206](https://github.com/navikt/team-esyfo/issues/206), [#211](https://github.com/navikt/team-esyfo/issues/211) og [#212](https://github.com/navikt/team-esyfo/issues/212); live-evidens følger den enkelte utrullingen. Inntil den finnes, viser siden gapene — ikke en konstruert grønn status.

En Kafka-pipeline får alltid det maskinelle gapet `pipeline-contract` så lenge kontrakten står som `proposed`. [Kildegjennomgangen](./kafka-kontrakter) fant ingen godkjente behandlingstidsgrenser for de ti topicene, så fristene står `IKKE DEFINERT` fremfor å vise tidligere, udokumenterte tallforslag. Nulltrafikkpolicy og consumer-lag brukes heller ikke til å evaluere produksjonshelse før kontrakten er godkjent i #212. Dermed kan selv perfekte tekniske signaler ikke gjøre en uavklart pipeline grønn.

Tilsvarende får en browserflate `browser-contract` som maskinelt gap frem til kildekontrakten er implementert. Ferske live-signaler kan derfor ikke skjule manglende privacy-, rute- eller feilkonfigurasjon.

Bygget eksporterer også `runtime-inventory.v3.json`. Versjon 3 legger til browserkontrakten og nye, eksplisitte browserstatuser; versjon 2 innførte de uavklarte topic-feltene. Senere dashboardgenerering og kontrollrom kan bruke samme kontrakt uten å kopiere en ny app-liste.

## Godkjenningspunkt

Baselinen ble godkjent 28. august 2026 i arbeidet med [sak #204](https://github.com/navikt/team-esyfo/issues/204). Statusen `approved` gjelder scope og kritikalitet. `esyfovarsel` migrerer gradvis til `syfo-budstikka`, men eksakt cutoverdato er ikke besluttet. Faktisk APM-, runbook-, browser- og topicdekning må fortsatt bevises med fersk evidens og kan ikke arve godkjenningsstatusen.

I arbeidet med [#205](https://github.com/navikt/team-esyfo/issues/205) ble 23 av de 26 nåværende runtimene funnet i NAIS APM-katalogen for `team-esyfo/prod`, og disse har nå tidsstemplet `linked`-evidens. `aktivitetskrav-frontend`, `dialogmote-microfrontend` og `lumi-dashboard` står fortsatt som `unverified`. En fungerende tjenesterute beviser ikke i seg selv komplett trace- eller metrikksdekning.

Etter godkjenningen ble `syfobrukertilgang` markert `retiring` etter teamavklaring. Den beholder kritisk dekning mens den kjører. `syfomotebehov` er den bekreftede aktive konsumenten på default branch; `syfooppfolgingsplanservice` forsvinner ved sin allerede besluttede sunset. En direkte eller tilsvarende tilgangssjekk i `esyfo-narmesteleder` er foreløpig bare erstatningskandidat, og endpoint, semantisk ekvivalens og avviklingsdato må besluttes før livssyklusen kan få bindende måldato.
