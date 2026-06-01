# 🔔 Meroppfølging

**Fase:** Sen 🟠

## Formål

Meroppfølging hjelper <Term id="den-sykmeldte">den sykmeldte</Term> når sykepengene nærmer seg slutt. Løsningen viser <Term id="maksdato">maksdato</Term> for sykepenger, forklarer hvilke valg som finnes videre og lar brukeren si fra om behov for meroppfølging fra Nav.

## Brukerreiser

### Den sykmeldte

::: tip 🎯 Prøv selv
- [Demo: Meroppfølging →](https://demo.ekstern.dev.nav.no/syk/meroppfolging/snart-slutt-pa-sykepengene)
:::

#### 1. 📬 Får beskjed i sen fase

Den sykmeldte får varsel når sykepengene nærmer seg slutt. Varslet leder videre til siden for meroppfølging på nav.no.

#### 2. 📅 Ser maksdato og hva som skjer videre

På siden ser brukeren når sykepengene tar slutt og informasjon om mulige <Term id="veivalg">veier videre</Term>. Hvis brukeren ikke har tilgang til skjemaet, vises en informasjonsside i stedet.

#### 3. ✍️ Svarer om situasjonen videre

Brukeren svarer på spørsmål om situasjonen etter maksdato og om det er behov for meroppfølging fra Nav.

#### 4. ✅ Får kvittering

Når svarene er sendt inn, lagres de i backend. Brukeren får en kvittering som viser at skjemaet er levert.

### Nav-veileder

#### 1. 👀 Ser svarene i Modia

Nav-veileder henter svarene via syfomodiaperson. Svarene gir et bedre grunnlag for videre oppfølging i <Term id="sen-oppfolging">sen fase</Term> av sykefraværet.

## Viktige begreper

| Begrep         | Forklaring                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| Maksdato       | Datoen da retten til sykepenger utløper                                                                     |
| Sen oppfølging | Oppfølging i sluttfasen av sykepengeperioden, fra varselperioden og fram mot maksdato                       |
| 39-ukersvarsel | Varsel som sendes før maksdato for å gjøre den sykmeldte oppmerksom på at sykepengeperioden går mot slutten |

::: info 🔧 Teknisk oversikt
Dataflyt, Kafka-topics og systemer → [teknisk side](./teknisk)
:::
