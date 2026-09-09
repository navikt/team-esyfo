# AID – om tallene

[Åpne AID-dashboardet](https://grafana.nav.cloud.nais.io/d/aufd2lm).

Dashboardet viser registrert bruk av tiltakspakke 1 i produksjon: ferdigstilte
oppfølgingsplaner, påminnelsesvalg og om tilbudene kommer fram. Det viser handlinger, ikke unike
personer eller effekten av pakken. Designvalg og videre prioriteringer er
beskrevet i [AID som produktdashboard](./produktdashboard).

## Innhold og filtre

Oppsettet har 12 paneler: åtte datapaneler i produktoversikten og fire tekniske
paneler i en sammenfoldet kontrollseksjon.

| Seksjon | Innhold | Avgrensning |
| --- | --- | --- |
| Oppfølgingsplaner i forsøket | Ferdigstillinger, trend og visninger av utfyllingssiden | Tiltak og kontroll; lokalt gruppefilter |
| Valg av evalueringspåminnelse | Ferdigstilte planer med og uten valgt påminnelse | Tiltaksgruppen med AID-tilpasninger |
| Påminnelse før fireukersfristen | Tilbud vist, påminnelse slått på eller av, og tilgjengelighet | Tiltaksgruppen i Dine sykmeldte |
| Teknisk kontroll | Tilgjengelighet, tildeling og resultater fra appene | Alle grupper, inkludert utenfor forsøket og ukjent |

**Dashboardet viser bare produksjon.** Alle paneler er bundet til `prod-gcp`;
det finnes ingen miljøvelger. Tidsrom gjelder hele dashboardet. Nettleserhendelser
avgrenses på appmiljø og serverlogger på tilsvarende runtime-cluster. Begge leses
fra Loki, med eksplisitt avgrensning på tjeneste og namespace. Teknisk testing
kan fortsatt gjøres med miljøparametriske spørringer og lokale testdata.

**«Forsøksgruppe» gjelder bare planseksjonen.** Variabelen `plan_group` viser
begge forsøksgrupper som standard. Valget endrer ikke påminnelsesseksjonene
eller den tekniske kontrollen. Kolonnefiltrene i tabellene gjelder bare den
enkelte tabellen; filterikonet filtrerer, mens kolonnenavnet sorterer.

Pakke 1 er fast. Det finnes ikke et globalt påminnelsesfilter: valgene gjelder
to forskjellige tilbud og kan ikke kobles til én brukerreise med dagens data.

Dashboardets UID er uendret. Gamle `var-env`- og `var-environment`-lenker
endrer ikke lenger miljøet; også disse viser produksjon.

## Hvorfor er det lite historikk?

Tiltakene ble satt i produksjon 7. september 2026, men disse målingene kom
senere. Første vellykkede produksjonsutrulling, i norsk tid:

| Måling | Måler fra | Utrulling |
| --- | --- | --- |
| Utfyllingsside og innsending fra oppfølgingsplan | 9. september kl. 08:37 | [#1039, inkludert #1041](https://github.com/navikt/syfo-oppfolgingsplan-frontend/actions/runs/34319342252) |
| Påminnelsestilbud og handlinger i Dine sykmeldte | 9. september kl. 08:37 | [#801](https://github.com/navikt/dinesykmeldte/actions/runs/34319303620) |
| Ferdigstilte planer og evalueringsvalg i hovedvisningen | 9. september kl. 09:28 | [#1042](https://github.com/navikt/syfo-oppfolgingsplan-frontend/actions/runs/34323403370) |

Eldre planer blir ikke etterregistrert. Å velge 7 eller 30 dager gir derfor
ikke måledata fra før utrullingen. Dette er heller ikke nasjonal planstatistikk:
forsøket omfatter virksomheter med registrert adresse i Troms eller Finnmark
(fylkeskode 55 eller 56 i EREG). Virksomhetsorgnummeret avgjør en stabil
fordeling mellom tiltak og kontroll; geografien gjelder ikke den ansattes
bosted. [Regel og fordeling](https://github.com/navikt/flaggskipet/blob/ecb6fd285cf655525d26bbeefc2084f788e9d388/src/main/kotlin/no/nav/flaggskipet/domain/vurdering/Tiltakspakker.kt)

## Ferdigstilte oppfølgingsplaner og visninger av utfyllingssiden

Ferdigstillinger og trend bruker serverhendelsen `aid_plan_opprettet` fra
oppfølgingsplan-frontend. Til tross for hendelsesnavnet registrerer den
**«Ferdigstill og del med den ansatte»**, etter vellykket svar fra backend.
Planen er da ferdigstilt og tilgjengelig for den ansatte; det dokumenterer
ikke at en varsling er levert, at planen er lest eller delt med lege eller Nav.
Hendelsen gjenbruker vurderingen som leverte utfyllingssiden. Det krever
ikke nettleserens APM eller et ekstra Flaggskipet-oppslag. Videresendte
nettleserlogger utelukkes. [Registrering ved ferdigstilling](https://github.com/navikt/syfo-oppfolgingsplan-frontend/blob/1df120b08d288ea90470136af17bbaefc57045ae/src/server/actions/ferdigstillPlan.ts#L76)

**Senere oppdateringer teller også.** «Oppdater planen» leder til samme
ferdigstilling, enten lederen begynner med en tom plan eller innholdet fra den
forrige. Målingen skiller ikke første plan fra en senere oppdatering.
Tallene er ikke første planer, unike personer eller en fullstendig
databasetelling. Tap av API-svar eller logg kan
gi undertelling. Ikke summer med nettleserbekreftelser; de kan observere samme
ferdigstilling. Volumforskjeller mellom gruppene dokumenterer ikke effekt.

Tiltaksgruppen inkluderer også ferdigstillinger uten AID-tilpasninger. `gruppe`
beskriver tildelingen; `skjemavariant=tiltak|standard` beskriver skjemaet som
faktisk ble levert. Uten AID-tilpasninger er derfor ikke synonymt med kontroll.

Horisontale stolper viser antallet per gruppe, med kategorinavn og tall.
De viser verken prosent, måloppnåelse eller antall unike personer.

Trendens punkter teller **siste 24 timer ved hvert tidspunkt**, ikke
kalenderdager. Vinduene overlapper og kan ikke summeres til periodetotaler.

Visninger av utfyllingssiden kommer fra nettleserhendelsen `aid_oppfolgingsplan`.
Utfyllingssiden må ha kommet inn i skjermbildet. Det er ikke en visning av en
ferdigstilt plan, eller bevis på at lederen begynte å skrive eller leste alle
tekstene. Visninger er ikke en nevner for andelen som ferdigstiller plan.

## De to påminnelsene

### Evaluere planen

«Påminnelse valgt» og «Påminnelse ikke valgt» viser innsendt `ja`/`nei` ved
ferdigstilling i tiltaksgruppen med AID-tilpasninger. Dette gjelder tilbudet om
e-post tre dager før valgt dato for neste møte om å evaluere planen. Brukeren
må svare Ja eller Nei i utfyllingen. Kontroll, utenfor forsøket og vanlig
skjema inngår ikke: bare AID-tilpasningene tilbyr valget. Vanlig skjema sitt
`nei` er ikke et aktivt avslag. [Spørsmålet i oppfølgingsplanen](https://github.com/navikt/syfo-oppfolgingsplan-frontend/blob/1df120b08d288ea90470136af17bbaefc57045ae/src/components/NyPlanSide/FyllUtPlanSteg/form/OPFormFields.tsx#L173)

Et valg kan følge med fra et utkast eller en tidligere plan. «Ikke valgt» sier
ikke hvorfor valget ble slik. Tallene teller ferdigstilte planer, inkludert
senere oppdateringer, ikke hvor mange ledere som har svart. De bekrefter verken utsendt
påminnelse eller utført evaluering.

Serverkontrakten krever gyldig `ja`/`nei`. Ferdigstillingstabellen i den tekniske
kontrollseksjonen viser nettleserens evalueringsfelt sammen med forsøk og
resultat: manglende felt er `ikke_registrert`, ugyldige verdier er `ugyldig`,
aldri `nei`. For vanlig skjema vises `ikke_tilbudt`, ikke et aktivt avslag.
Den eldre kontraktspørringen `aidPlanEvaluationQuery` er også beholdt i kode.

### Påminnelse før fireukersfristen i Dine sykmeldte

Målingen bruker `aid_paaminnelse` fra Dine sykmeldte. Tilbudet «Ja, minn meg på
det» gjelder e-post før fireukersfristen for å lage oppfølgingsplan, ikke
evalueringsmøtet. Påminnelsen planlegges til dag 24. De tre tallene viser
tilbudet vist, påminnelse slått på og påminnelse slått av i tiltaksgruppen.
Å slå på eller av telles først når appen får forventet, vellykket svar.
De er separate hendelser, ikke en trakt. Flere hendelser kan gjelde samme
oppfølging. En bestilling er ikke en utsending eller en aktiv bestillingstelling.

Tilgjengelighet registreres når tilstanden er vurdert. «Tilgjengelig» betyr
at tilbudet kan vises, ikke at det er sett. «Ikke tilgjengelig» kan være
forventet, for eksempel når bestillingsvinduet er over eller en plan allerede
er ferdigstilt. Målingen skiller ikke disse årsakene. Den er ikke automatisk en feil.
Status ved handling beskriver tilstanden før handlingen. Ingen aktiv
bestilling er verken et sikkert nei eller bevis på at brukeren ikke har svart.

## Teknisk kontroll og datadekning

Den sammenfoldede seksjonen viser fire tabeller: påminnelsestilbud i alle
grupper, valg av utfyllingsside, ferdigstillingsforsøk med nettlesersvar
og evalueringsfelt, samt problemer ved påminnelsesvisning og handling.
Hver tabell navngir produktet og det som kontrolleres. Påminnelsens tilgjengelighet
er aggregert per gruppe og resultat, uten en ekstra, overlappende variantkolonne.

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
etter en vellykket spørring viser ingen registreringer i valgt tidsrom,
ikke dokumentert null bruk. Målingene har ingen historikk før
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
eksisterende UID `aufd2lm` i **Team Esyfo**. Kontroller produksjonsavgrensning, lokalt
gruppefilter, tomme resultater og reelle kategorier i publisert visning.
Sammenlign eksporten med kildekoden. Brukertesten med produktleder og designer
i [beslutningsnotatet](./produktdashboard) er en separat kontroll.
