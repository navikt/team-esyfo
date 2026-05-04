# 📋 Kartleggingsspørsmål

**Fase:** Tidlig 🟢

## Formål

Kartleggingsspørsmålene samler inn informasjon fra den sykmeldte tidlig i sykefraværet. Svarene gir Nav og arbeidsgiver bedre grunnlag for å vurdere hva slags oppfølging som trengs.

## Brukerreisen

1. **Automatisk vurdering** — Systemet sjekker om den sykmeldte oppfyller kriteriene for kartlegging. Vurderingen tar hensyn til hvor lenge personen har vært sykmeldt, alder og hvilket Nav-kontor som følger opp.
2. **Varsel** — Når kriteriene er oppfylt, får den sykmeldte en SMS og en notifikasjon om at kartleggingen er klar.
3. **Kartlegging tilgjengelig** — Den sykmeldte ser en melding på Min side med lenke til kartleggingsskjemaet.
4. **Besvarelse** — Den sykmeldte klikker seg videre og svarer på spørsmålene.
5. **Fullført** — Etter besvarelse endres meldingen på Min side til å vise at kartleggingen er gjennomført.
6. **Svarene brukes** — Nav-veileder får tilgang til svarene og bruker dem i oppfølgingen av den sykmeldte.

## Viktige begreper

| Begrep | Forklaring |
|--------|-----------|
| Kandidat | En sykmeldt som oppfyller kriteriene for kartlegging, basert på sykmeldingsvarighet |
| Kandidat-status | Angir om personen kan besvare kartleggingsskjemaet |
| Lumi | Personvernvennlig spørreundersøkelse som brukes inne i kartleggingsskjemaet |

## Brukergrupper

| Brukergruppe | Rolle |
|---|---|
| Den sykmeldte | Mottar varsel, besvarer kartleggingsskjemaet |
| Nav-veileder | Ser svarene i Modia og bruker dem i oppfølgingen |
| Arbeidsgiver | Får indirekte nytte via veileders oppfølging |

## Slik ser det ut

Kartleggingen vises som en melding på Min side. Her er eksempler fra designbiblioteket:

- [Før den sykmeldte har svart (Storybook)](https://navikt.github.io/esyfo-microfrontends/?path=/story/meroppf%C3%B8lging--kartlegging-ikke-svart)
- [Etter at den sykmeldte har svart (Storybook)](https://navikt.github.io/esyfo-microfrontends/?path=/story/meroppf%C3%B8lging--kartlegging-svart)

## Demo

Prøv kartleggingsskjemaet i demomiljøet: [demo.ekstern.dev.nav.no/syk/kartleggingssporsmal](https://demo.ekstern.dev.nav.no/syk/kartleggingssporsmal)

## Teknisk dokumentasjon

For utviklere: se [teknisk oversikt](./teknisk) med dataflyt, Kafka-topics og systemer.


