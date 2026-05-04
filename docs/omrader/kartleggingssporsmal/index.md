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

Systemet ([ismeroppfolging](https://github.com/navikt/ismeroppfolging), eid av team iSyfo) sjekker om den sykmeldte oppfyller kriteriene for kartlegging:

- **Sykmeldingsvarighet**: Mellom 42 og 72 sykedager (6–10 uker), justert for friske dager i perioden
- **Oppfølgingstilfellet** må fortsatt være aktivt (ikke avsluttet for mer enn 30 dager siden)
- Personen må ha **aktiv status** i folkeregisteret

### 2. 📲 Varsel

Når kriteriene er oppfylt, får den sykmeldte en notifikasjon og en SMS om at Nav har sendt noen spørsmål, med oppfordring om å logge inn på Nav for å svare.

### 3. 🏠 Kartlegging på Min side

Den sykmeldte ser en microfrontend på [Min side](https://www.nav.no/minside) med lenke til kartleggingsskjemaet:

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

Nav-veileder får tilgang til svarene i Modia og bruker dem i oppfølgingen av den sykmeldte.

## Viktige begreper

| Begrep              | Forklaring                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Oppfølgingstilfelle | En sammenhengende sykefraværsperiode for én person, beregnet av iSyfo. Kan inneholde flere sykmeldinger og friske dager. |
| Kandidat            | En sykmeldt som oppfyller kriteriene for kartlegging, basert på oppfølgingstilfellets varighet                           |
| Kandidatstatus      | Angir om personen kan besvare kartleggingsskjemaet                                                                       |
| Microfrontend       | UI-paneler fra eSyfo integrert på Min side. Hvilke paneler som vises avhenger av hva som er aktivert for den sykmeldte.  |
| Lumi                | Personvernvennlig spørreundersøkelse som samler inn tilbakemelding om kartleggingsopplevelsen                            |

::: info 🔧 Teknisk oversikt
Dataflyt, Kafka-topics og systemer → [teknisk side](./teknisk)
:::


