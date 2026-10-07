# 👥 Dine sykmeldte

**Fase:** Gjennomgående 🔵

## Formål

«Dine sykmeldte» gir arbeidsgiver (nærmesteleder) en samlet oversikt over sykmeldte ansatte. Løsningen brukes gjennom hele sykefraværsforløpet og er arbeidsgivers viktigste inngang til oppfølging, status og videre navigasjon. Den sykmeldte bruker ikke denne appen — de ser sitt eget sykefravær i [Ditt sykefravær](https://www.nav.no/syk/sykefravaer) (eid av Team Flex).

## Brukerreise

::: tip 🎯 Prøv selv
- [Demo: Dine sykmeldte →](https://demo.ekstern.dev.nav.no/arbeidsgiver/sykmeldte)
:::

#### 1. 🔐 Logger inn og velger virksomhet

Arbeidsgiver (nærmesteleder) logger inn på nav.no og åpner Dine sykmeldte. Hvis personen følger opp ansatte i flere virksomheter, kan hen velge riktig virksomhet før oversikten vises.

#### 2. 👀 Ser oversikt over sykmeldte ansatte

Arbeidsgiver får en samlet liste over sykmeldte ansatte med navn, startdato for sykefravær og status for oppfølging. Oversikten viser også nye hendelser og andre signaler som hjelper lederen å prioritere oppfølgingen.

#### 3. 🔔 Ser nye hendelser

Andre systemer publiserer hendelser om dialogmøter, oppfølgingsplaner og søknader som ikke er sendt inn, til Kafka. Hendelsene vises som nye i oversikten og i lenkepanelene for den ansatte, og markeres som lest når nærmesteleder åpner dem.

#### 4. 📄 Åpner en ansatt og ser detaljer

Fra oversikten kan arbeidsgiver åpne en ansatt og se sykmeldinger, søknader og nye hendelser om dialogmøter og oppfølgingsplaner. På detaljsidene brukes en felles sidemeny som gjør det enkelt å bytte mellom innhold for samme person.

#### 5. 🔀 Går videre til andre oppfølgingsflater

Fra sideoversikten kan nærmesteleder navigere videre til:

- [Oppfølgingsplaner](/omrader/oppfolgingsplan/)
- [Dialogmøter](/ordbok#dialogmote)

Dine sykmeldte fungerer dermed som inngang til flere deler av arbeidsgiveroppfølgingen.

::: tip 📖 Ordbok
Se [Ordbok](/ordbok) for forklaring av begreper brukt på denne siden.
:::

::: info 🔧 Teknisk oversikt
Dataflyt, Kafka-topics og systemer → [teknisk side](./teknisk)
:::
