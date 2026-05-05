# 🔧 Fellestjenester

**Fase:** Gjennomgående 🔵

## Formål

Fellestjenester samler felles tjenester og biblioteker som brukes på tvers av områdene. Dette var tidligere kjent som «crossdomain» og «delt infrastruktur». Målet er å unngå duplisering og sikre konsistente løsninger.

## Applikasjoner

Disse applikasjonene betjener flere områder:

| Applikasjon | Beskrivelse |
|-------------|-------------|
| syfo-dokumentporten | Felles dokumenthåndtering |
| syfooppdfgen | PDF-generering for sykefraværsdokumenter |
| lumi | Tilbakemeldingswidget |
| esyfovarsel | Varsling på tvers av områder |
| syfobrukertilgang | Tilgangsstyring for brukere |
| esyfo-microfrontends | Delte mikrofrontend-komponenter |

## Dette området handler om

- Felles autentisering og autorisasjon (token-håndtering, tilgangsstyring)
- Delte Kafka-konsumenter og -produsenter
- Fellesbiblioteker og utilities som brukes av flere apper
- Infrastruktur og plattformkonfigurasjon (NAIS-oppsett, overvåkning)

## Brukergrupper

- Utviklere i Team eSyfo

## Avhengigheter

> [!NOTE]
> Avhengighetene under gjelder hele teamet. De vil bli flyttet til hvert enkelt område etter hvert.

### Team iSyfo (intern sykefraværsoppfølging)

Team iSyfo eier den interne sykefraværsoppfølgingen — altså Nav-veiledernes verktøy. Mange av Team eSyfos tjenester leverer data som iSyfo konsumerer, og omvendt.

| Avhengighet | Retning | Beskrivelse |
|-------------|---------|-------------|
| Oppfølgingsplan | eSyfo → iSyfo | Planer delt med Nav leses av iSyfo |
| Møtebehov | eSyfo → iSyfo | Innmeldt møtebehov vises for Nav-veileder |
| Dialogmøte-innkalling | iSyfo → eSyfo | Nav kaller inn — eSyfo viser til bruker |
| Aktivitetskrav-vurdering | iSyfo → eSyfo | Nav vurderer — eSyfo viser resultat |

### Team Sykmelding

| Avhengighet | Retning | Beskrivelse |
|-------------|---------|-------------|
| Nærmesteleder (Kafka) | Sykmelding → eSyfo | NL-relasjoner publiseres på felles Kafka-topic |
| Sykmeldinger (Kafka) | Sykmelding → eSyfo | Sendte sykmeldinger konsumeres av esyfo-narmesteleder |
| Altinn NL-skjema | Sykmelding → eSyfo | NL-relasjoner fra Altinn via Kafka |

### Andre avhengigheter

| System / Team | Retning | Beskrivelse |
|---------------|---------|-------------|
| PDL (persondata) | Ekstern → eSyfo | Personopplysninger for visning |
| EREG (enhetsregisteret) | Ekstern → eSyfo | Organisasjonsdata |
| Altinn | Ekstern → eSyfo | Rettigheter og roller for arbeidsgivere |
| ID-porten / TokenX | Ekstern → eSyfo | Autentisering av innbyggere |
| Azure AD | Intern | Autentisering mellom tjenester |

---

::: tip 📖 Ordbok
Se [Ordbok](/ordbok) for forklaring av begreper brukt på denne siden.
:::

> [!TIP]
> Se [nærmesteleder — teknisk](/omrader/narmeste-leder/teknisk) for et detaljert Kafka-flytdiagram.
