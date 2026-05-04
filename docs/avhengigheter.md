# Avhengigheter

Team eSyfo samarbeider med flere andre team og systemer. Denne siden gir oversikt over de viktigste avhengighetene.

## Team iSyfo (intern sykefraværsoppfølging)

Team iSyfo eier den interne sykefraværsoppfølgingen — altså Nav-veiledernes verktøy. Mange av Team eSyfos tjenester leverer data som iSyfo konsumerer, og omvendt.

| Avhengighet | Retning | Beskrivelse |
|-------------|---------|-------------|
| Oppfølgingsplan | eSyfo → iSyfo | Planer delt med Nav leses av iSyfo |
| Møtebehov | eSyfo → iSyfo | Innmeldt møtebehov vises for Nav-veileder |
| Dialogmøte-innkalling | iSyfo → eSyfo | Nav kaller inn — eSyfo viser til bruker |
| Aktivitetskrav-vurdering | iSyfo → eSyfo | Nav vurderer — eSyfo viser resultat |

## Team Sykmelding

| Avhengighet | Retning | Beskrivelse |
|-------------|---------|-------------|
| Nærmeste leder (Kafka) | Sykmelding → eSyfo | NL-relasjoner publiseres på felles Kafka-topic |
| Sykmeldinger (Kafka) | Sykmelding → eSyfo | Sendte sykmeldinger konsumeres av esyfo-narmesteleder |
| Altinn NL-skjema | Sykmelding → eSyfo | NL-relasjoner fra Altinn via Kafka |

## Andre avhengigheter

| System / Team | Retning | Beskrivelse |
|---------------|---------|-------------|
| PDL (persondata) | Ekstern → eSyfo | Personopplysninger for visning |
| EREG (enhetsregisteret) | Ekstern → eSyfo | Organisasjonsdata |
| Altinn | Ekstern → eSyfo | Rettigheter og roller for arbeidsgivere |
| ID-porten / TokenX | Ekstern → eSyfo | Autentisering av innbyggere |
| Azure AD | Intern | Autentisering mellom tjenester |

---

> [!TIP]
> Se [nærmeste leder — teknisk](/omrader/narmeste-leder/teknisk) for et detaljert Kafka-flytdiagram.
