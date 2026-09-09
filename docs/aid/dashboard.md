# AID – om tallene

[Åpne AID-dashboardet](https://grafana.nav.cloud.nais.io/d/aufd2lm).

Dashboardet viser registrert bruk av tiltakspakke 1: planopprettelser,
påminnelsesvalg og om tilbudene kommer fram. Det viser handlinger, ikke unike
personer eller effekten av pakken. Designvalg og videre prioriteringer er
beskrevet i [AID som produktdashboard](./produktdashboard).

## Innhold og filtre

Oppsettet har 13 paneler: én kort introduksjon, åtte datapaneler i
produktoversikten og fire tekniske paneler i en sammenfoldet kontrollseksjon.

| Seksjon | Innhold | Avgrensning |
| --- | --- | --- |
| Planer | Registrerte opprettelser, trend og hvilket skjema som blir vist | Tiltak og kontroll; lokalt gruppefilter |
| Påminnelse om å evaluere planen | Med eller uten påminnelse ved opprettelse | Tiltaksgruppen med nytt skjema |
| Påminnelse om å lage plan | Visninger, bestillinger, avbestillinger og tilgjengelighet | Tiltaksgruppen i Dine sykmeldte |
| Kontroll av målingen | Tilgjengelighet, tildeling og tekniske resultater | Alle grupper, inkludert utenfor forsøket og ukjent |

**Miljø og tidsrom gjelder alt.** Produksjon er standard og betyr `prod-gcp`;
Test betyr `dev-gcp`. Variabelen `environment` avgrenser nettleserhendelser på
appmiljø og serverlogger på tilsvarende runtime-cluster. Begge leses fra Loki,
med eksplisitt avgrensning på tjeneste og namespace.

**«Vis planer for» gjelder bare planseksjonen.** Variabelen `plan_group` viser
begge forsøksgrupper som standard. Valget endrer ikke påminnelsesseksjonene
eller den tekniske kontrollen. Kolonnefiltrene i tabellene gjelder bare den
enkelte tabellen; filterikonet filtrerer, mens kolonnenavnet sorterer.

Pakke 1 er fast. Det finnes ikke et globalt påminnelsesfilter: valgene gjelder
to forskjellige tilbud og kan ikke kobles til én brukerreise med dagens data.

**Lenker fra tidligere oppsett må oppdateres.** Miljøvariabelen `env` er
erstattet av `environment`. Gamle `var-env`-lenker bevarer ikke miljøvalget;
bruk `var-environment=prod-gcp` eller `var-environment=dev-gcp`. Dashboardets
UID er uendret, og produksjon er standard når det nye miljøvalget mangler.

## Planopprettelser og skjemavisninger

Opprettelser og trend bruker serverhendelsen `aid_plan_opprettet` fra
oppfølgingsplan-frontend. Den registreres etter vellykket svar fra
opprettelses-API-et og gjenbruker vurderingen som leverte skjemaet. Det krever
ikke nettleserens APM eller et ekstra Flaggskipet-oppslag. Videresendte
nettleserlogger utelukkes.

**Nye planversjoner teller også.** Tallene er ikke første planer, unike
personer eller en fullstendig databasetelling. Tap av API-svar eller logg kan
gi undertelling. Ikke summer med nettleserbekreftelser; de kan observere samme
opprettelse. Volumforskjeller mellom gruppene dokumenterer ikke effekt.

Tiltaksgruppen inkluderer også opprettelser med vanlig skjema. `gruppe`
beskriver tildelingen; `skjemavariant=tiltak|standard` beskriver skjemaet som
faktisk ble levert. Vanlig skjema er derfor ikke synonymt med kontroll.

Trendens punkter teller **siste 24 timer ved hvert tidspunkt**, ikke
kalenderdager. Vinduene overlapper og kan ikke summeres til periodetotaler.

Skjemavisninger kommer fra nettleserhendelsen `aid_oppfolgingsplan`.
Skjemabeholderen må ha kommet inn i skjermbildet. Det beviser ikke at alle
felter eller tekster er lest. Visninger er ikke en nevner for andelen som
oppretter plan.

## De to påminnelsene

### Evaluere planen

«Med påminnelse» og «Uten påminnelse» viser innsendt `ja`/`nei` ved
serverregistrert opprettelse i tiltaksgruppen med nytt skjema. Kontroll,
utenfor forsøket og vanlig skjema inngår ikke: bare det nye skjemaet tilbyr
valget. Vanlig skjema sitt `nei` er ikke et aktivt avslag.

Et valg kan følge med fra et utkast. «Uten» sier derfor ikke hvorfor valget
ble slik. Tallene inkluderer nye planversjoner og bekrefter verken utsendt
påminnelse eller utført evaluering.

Serverkontrakten krever gyldig `ja`/`nei`. Innsendingstabellen i den tekniske
kontrollseksjonen viser nettleserens evalueringsfelt sammen med forsøk og
resultat: manglende felt er `ikke_registrert`, ugyldige verdier er `ugyldig`,
aldri `nei`. For vanlig skjema vises `ikke_tilbudt`, ikke et aktivt avslag.
Den eldre kontraktspørringen `aidPlanEvaluationQuery` er også beholdt i kode.

### Lage plan

Målingen bruker `aid_paaminnelse` fra Dine sykmeldte. De tre tallene viser
visninger av tilbudet, vellykkede bestillinger og vellykkede avbestillinger.
De er separate hendelser, ikke en trakt. Flere hendelser kan gjelde samme
oppfølging. En bestilling er ikke en utsending eller en aktiv bestillingstelling.

Tilgjengelighet registreres når tilstanden er vurdert. «Tilgjengelig» betyr
at tilbudet kan vises, ikke at det er sett. «Ikke tilgjengelig» kan være
forventet; målingen forklarer ikke hvorfor. Den er ikke automatisk en feil.
Status ved handling beskriver tilstanden før handlingen. Ingen aktiv
bestilling er verken et sikkert nei eller bevis på at brukeren ikke har svart.

## Teknisk kontroll og datadekning

Den sammenfoldede seksjonen viser fire tabeller: påminnelsestilbud i alle
grupper, tilgjengeliggjort planskjema, innsendinger med forsøk, nettlesersvar
og evalueringsfelt, samt problemer ved påminnelsesvisning og handling.

Utenfor forsøket er aldri kontroll. Manglende vurdering er ukjent; det kan
skyldes feil, funksjonsbrytere eller manglende grunnlag. Forsøk og resultat
skal ikke summeres. Manglende nettleserbekreftelse betyr ikke nødvendigvis at
planen ikke ble lagret.

Målingene leser lukkede kategorier i `schema_version=1`, avgrenset til pakke 1
og riktig flate. For eldre planhendelser oversettes `variant=aid` til
`skjemavariant=tiltak`; `standard` beholdes. Et nytt, utfylt felt har forrang.
Ugyldige skjemakategorier utelukkes, og samme hendelse telles ikke to ganger.
Påminnelsesmodulens separate `variant=aid|skjult` endres ikke.

**Queryfeil, ingen treff og null er forskjellige tilstander.** Et tomt panel
etter en vellykket spørring viser ingen registreringer i valgt tidsrom og
miljø, ikke dokumentert null bruk. Målingene har ingen historikk før
utrulling. Lite trafikk, tap av nettleserdata eller manglende instrumentering
kan også gi tomme resultater.

Generelle backendtellere er tatt ut av AID-dashboardet fordi de ikke kan
avgrenses til forsøket. Innsamlingen beholdes. Det innføres ingen
personkobling, identifikatorer, fritekst eller helsefelt i denne målingen,
og ingen direkte analyse av sykefraværets lengde eller grad.

## Verifisering og publisering

Kontroller hver målekjede mot ekte hendelser etter utrulling. En grønn test
eller vellykket deploy beviser ikke at alle kategorier kommer fram.
Kategorier uten observerte hendelser er **ikke verifisert med reelle data**,
ikke automatisk feil. Ikke opprett syntetiske produktoperasjoner i produksjon.

Kilden er `docs/.vitepress/grafana/aid-delivery-usage.ts`. Kjør
`pnpm aid-dashboard:export`, `pnpm grafana-dashboard:test` og
`pnpm grafana-dashboard:smoke` fra `docs/`; `pnpm aid-dashboard:query-smoke`
kontrollerer telling og avgrensning med syntetiske data i lokal Loki.

Ved publisering: eksporter gjeldende dashboard for tilbakeføring, og oppdater
eksisterende UID `aufd2lm` i **Team Esyfo**. Kontroller miljøvalg, lokalt
gruppefilter, tomme resultater og reelle kategorier i publisert visning.
Sammenlign eksporten med kildekoden. Brukertesten med produktleder og designer
i [beslutningsnotatet](./produktdashboard) er en separat kontroll.
