# 📋 Kartleggingsspørsmål

**Fase:** Tidlig 🟢

## Formål

Kartleggingsspørsmålene samler inn informasjon fra **den sykmeldte** tidlig i sykefraværet. Svarene gir **Nav-veileder** bedre grunnlag for å tilpasse oppfølgingen.

## Brukerreisen

::: tip 🎯 Prøv selv
- [Åpne demo-kartleggingen →](https://demo.ekstern.dev.nav.no/syk/kartleggingssporsmal)
- [Storybook: Microfrontend før besvarelse →](https://navikt.github.io/esyfo-microfrontends/?path=/story/meroppf%C3%B8lging--kartlegging-ikke-svart)
- [Storybook: Microfrontend etter besvarelse →](https://navikt.github.io/esyfo-microfrontends/?path=/story/meroppf%C3%B8lging--kartlegging-svart)
:::

### 1. 🔍 Automatisk vurdering

Systemet ([ismeroppfolging](https://github.com/navikt/ismeroppfolging), eid av team <Term id="isyfo">iSyfo</Term>) sjekker om den sykmeldte oppfyller kriteriene for kartlegging.

**Målgruppe:** Alle sykmeldte i Norge ved uke 6, uansett gradering, bortsett fra de som:

- Er 67 år eller eldre
- Ikke har en arbeidsgiver (inkludert frilansere og selvstendige)
- Har et gjeldende § 14a-vedtak for inneværende oppfølgingsperiode
- Allerede har fått spørsmålene «Snart slutt på sykepengene»

### 2. 📲 Varsel

Når kriteriene er oppfylt, får den sykmeldte en notifikasjon og en SMS om at Nav har sendt noen spørsmål, med oppfordring om å logge inn på Nav for å svare.

### 3. 🏠 Kartlegging på Min side

Den sykmeldte ser en <Term id="microfrontend">microfrontend</Term> på [Min side](https://www.nav.no/minside) med lenke til kartleggingsskjemaet:

::: tip Storybook 🎨
[Se hvordan det ser ut før sykmeldt har svart →](https://navikt.github.io/esyfo-microfrontends/?path=/story/meroppf%C3%B8lging--kartlegging-ikke-svart)
:::

### 4. ✍️ Besvarelse

Den sykmeldte klikker seg videre til kartleggingsskjemaet og svarer på spørsmålene.

::: tip Demo 🎯
[Prøv kartleggingsskjemaet i demo →](https://demo.ekstern.dev.nav.no/syk/kartleggingssporsmal)
:::

### 5. ✅ Fullført

Etter besvarelse oppdateres microfrontenden på Min side:

::: tip Storybook 🎨
[Se hvordan det ser ut etter besvarelse →](https://navikt.github.io/esyfo-microfrontends/?path=/story/meroppf%C3%B8lging--kartlegging-svart)
:::

### 6. 👀 Svarene brukes

Nav-veileder får tilgang til svarene i <Term id="modia">Modia</Term> og bruker dem i oppfølgingen av den sykmeldte.

## Skjemavarianter

Kartleggingsspørsmål kan ha flere varianter. Per nå finnes det:

| Variant | Beskrivelse |
| ------- | ----------- |
| Standard | Flervalg-skjema med faste svarsalternativer |
| Pilot (fritekst) | Utvidet skjema der den sykmeldte får et fritekstfelt basert på valgt svarsalternativ |

Hvilken variant den sykmeldte får bestemmes av feltet `skjemavariant` i Kafka-meldingen fra `ismeroppfolging-kartleggingssporsmal-kandidat`-topicen.

## Viktige begreper

| Begrep              | Forklaring                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Kandidat            | En sykmeldt som oppfyller kriteriene for kartlegging, basert på oppfølgingstilfellets varighet                           |
| Kandidatstatus      | Angir om personen kan besvare kartleggingsskjemaet                                                                       |
| Microfrontend       | UI-paneler fra eSyfo integrert på Min side. Hvilke paneler som vises avhenger av hva som er aktivert for den sykmeldte.  |
| Lumi                | Personvernvennlig spørreundersøkelse som samler inn tilbakemelding om kartleggingsopplevelsen                            |

::: tip 📖 Ordbok
Se [Ordbok](/ordbok) for forklaring av begreper brukt på denne siden.
:::

::: info 🔧 Teknisk oversikt
Dataflyt, Kafka-topics og systemer → [teknisk side](./teknisk)
:::

Etter besvarelse samles det inn tilbakemelding via <Term id="lumi">Lumi</Term> for å forbedre kartleggingsopplevelsen.
