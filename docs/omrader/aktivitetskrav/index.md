# ⏱️ Aktivitetskrav

**Fase:** Tidlig 🟢

## Formål

En sykmeldt har aktivitetsplikt — det betyr at den sykmeldte skal være i aktivitet så tidlig som mulig i sykefraværet, med mindre medisinske grunner hindrer det. Denne løsningen viser status for aktivitetsplikten, varsler når Nav har gjort en vurdering, og gir tilgang til detaljer og historikk.

## Brukerreisen

::: tip 🎯 Prøv selv
- [Åpne demo →](https://demo.ekstern.dev.nav.no/syk/aktivitetskrav) — velg testscenario nederst på siden (Infoside, Forhåndsvarsel, Oppfylt, Ikke aktuell, Innstilling om stans, Unntak)
- [Storybook: Microfrontend med ny vurdering →](https://navikt.github.io/esyfo-microfrontends/?path=/story/aktivitetskrav--ny-vurdering)
- [Storybook: Microfrontend med forhåndsvarsel →](https://navikt.github.io/esyfo-microfrontends/?path=/story/aktivitetskrav--forhandsvarsel-for-frist)
:::

### 1. 🧭 Vurdering hos Nav

Nav-veileder vurderer <Term id="aktivitetskrav">aktivitetskravet</Term> i [isaktivitetskrav](https://github.com/navikt/isaktivitetskrav) (eid av team iSyfo). Vurderingen kan ende med oppfylt, ikke oppfylt, unntak eller forhåndsvarsel. Noen vurderinger har en frist som den sykmeldte må forholde seg til.

### 2. 📲 Varsel

Når vurderingen er klar, får den sykmeldte en notifikasjon og SMS om at Nav har vurdert aktivitetskravet.

### 3. 🏠 Status på Min side

Etter innlogging på nav.no ser den sykmeldte en <Term id="microfrontend">microfrontend</Term> på [Min side](https://www.nav.no/minside) med gjeldende status og lenke til aktivitetskrav-siden. Panelet vises kun for relevante statuser — når aktivitetskravet ikke er oppfylt, skjules det.

::: tip Storybook 🎨
[Se hvordan det ser ut med ny vurdering →](https://navikt.github.io/esyfo-microfrontends/?path=/story/aktivitetskrav--ny-vurdering)
:::

### 4. 🔎 Detaljer og historikk

Den sykmeldte klikker seg videre til [aktivitetskrav-frontend](https://github.com/navikt/aktivitetskrav-frontend) og ser detaljer, historikk og eventuelle frister.

::: tip Demo 🎯
[Prøv aktivitetskrav i demo →](https://demo.ekstern.dev.nav.no/syk/aktivitetskrav)
:::

### 5. 👀 Status brukes videre

Når den sykmeldte har åpnet siden, markeres varselet som lest. Nav-veileder kan samtidig se status for aktivitetskrav i Modia.

::: tip 📖 Ordbok
Se [Ordbok](/ordbok) for forklaring av begreper brukt på denne siden.
:::

::: info 🔧 Teknisk oversikt
Dataflyt, Kafka-topics og systemer → [teknisk side](./teknisk)
:::

