# 🔔 Meroppfølging

**Fase:** Sen 🟠

## Formål

Meroppfølging hjelper [den sykmeldte](/ordbok#den-sykmeldte) når sykepengene nærmer seg slutt. Løsningen viser [maksdato](/ordbok#maksdato) for sykepenger, forklarer hvilke valg som finnes videre og lar brukeren si fra om behov for meroppfølging fra Nav.

## Brukerreiser

### Den sykmeldte

::: tip 🎯 Prøv selv
- [Demo: Meroppfølging →](https://demo.ekstern.dev.nav.no/syk/meroppfolging/snart-slutt-pa-sykepengene)
:::

#### 1. 📬 Får beskjed i sen fase

Den sykmeldte får varsel når sykepengene nærmer seg slutt. Varslet leder videre til siden for meroppfølging på nav.no.

#### 2. 📅 Ser maksdato og hva som skjer videre

På siden ser brukeren når sykepengene tar slutt og informasjon om mulige veier videre. Hvis brukeren ikke har tilgang til skjemaet, vises en informasjonsside i stedet.

#### 3. ✍️ Svarer om situasjonen videre

Brukeren svarer på spørsmål om situasjonen etter maksdato og om det er behov for meroppfølging fra Nav.

#### 4. ✅ Får kvittering

Når svarene er sendt inn, lagres de i backend. Brukeren får en kvittering som viser at skjemaet er levert.

### Nav-veileder

#### 1. 👀 Ser svarene i Modia

Nav-veileder henter svarene via syfomodiaperson. Svarene gir et bedre grunnlag for videre oppfølging i [sen fase](/ordbok#sen-oppfolging) av sykefraværet.

::: tip 📖 Ordbok
Se [Maksdato](/ordbok#maksdato), [Sen oppfølging](/ordbok#sen-oppfolging) og [39-ukersvarsel](/ordbok#39-ukersvarsel) i ordboken.
:::

::: info 🔧 Teknisk oversikt
Dataflyt, Kafka-topics og systemer → [teknisk side](./teknisk)
:::
