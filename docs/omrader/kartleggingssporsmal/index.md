# 📋 Kartleggingsspørsmål

**Fase:** Tidlig 🟢

## Formål

Kartleggingsspørsmålene samler inn informasjon fra den sykmeldte tidlig i sykefraværet. Svarene gir Nav og arbeidsgiver bedre grunnlag for å vurdere hva slags oppfølging som trengs.

## Brukerreisen

::: tip 🎯 Prøv selv
[Åpne demo-kartleggingen →](https://demo.ekstern.dev.nav.no/syk/kartleggingssporsmal)
:::

### 1. 🔍 Automatisk vurdering

Systemet sjekker om den sykmeldte oppfyller kriteriene for kartlegging. Vurderingen tar hensyn til hvor lenge personen har vært sykmeldt, alder og hvilket Nav-kontor som følger opp.

### 2. 📲 Varsel

Når kriteriene er oppfylt, får den sykmeldte en SMS og en melding om at kartleggingen er klar.

### 3. 🏠 Kartlegging på Min side

Den sykmeldte ser en microfrontend på [Min side](https://www.nav.no/minside) med lenke til kartleggingsskjemaet:

> [Se hvordan det ser ut før besvarelse (Storybook) →](https://navikt.github.io/esyfo-microfrontends/?path=/story/meroppf%C3%B8lging--kartlegging-ikke-svart)

### 4. ✍️ Besvarelse

Den sykmeldte klikker seg videre til [kartleggingsskjemaet](https://demo.ekstern.dev.nav.no/syk/kartleggingssporsmal) og svarer på spørsmålene. Etter besvarelse får den sykmeldte en kort tilbakemeldings-undersøkelse via Lumi om hvordan det var å svare.

### 5. ✅ Fullført

Etter besvarelse oppdateres microfrontenden på Min side:

> [Se hvordan det ser ut etter besvarelse (Storybook) →](https://navikt.github.io/esyfo-microfrontends/?path=/story/meroppf%C3%B8lging--kartlegging-svart)

### 6. 👀 Svarene brukes

Nav-veileder får tilgang til svarene i Modia og bruker dem i oppfølgingen av den sykmeldte.

---

## Viktige begreper

| Begrep | Forklaring |
|--------|-----------|
| Kandidat | En sykmeldt som oppfyller kriteriene for kartlegging, basert på sykmeldingsvarighet |
| Kandidat-status | Angir om personen kan besvare kartleggingsskjemaet |
| Microfrontend | Meldingen den sykmeldte ser på Min side — eid av oss, vist i en annen apps kontekst |
| Lumi | Personvernvennlig survey som samler inn tilbakemelding om kartleggingsopplevelsen |

## Brukergrupper

| Brukergruppe | Rolle |
|---|---|
| Den sykmeldte | Mottar varsel, besvarer kartleggingsskjemaet via Min side |
| Nav-veileder | Ser svarene i Modia og bruker dem i oppfølgingen |
| Arbeidsgiver | Får indirekte nytte via veileders oppfølging |

## Teknisk dokumentasjon

For utviklere: se [teknisk oversikt](./teknisk) med dataflyt, Kafka-topics og systemer.


