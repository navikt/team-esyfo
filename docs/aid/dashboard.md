# AID – levering og bruk

[Åpne AID-dashboardet i Grafana](https://grafana.nav.cloud.nais.io/d/aufd2lm).

Dashboardet følger levering og bruk av tiltakspakke 1. Det er **produkttelemetri, ikke effektanalyse**: ingen personkobling, sykefraværslengde, sykefraværsgrad eller konklusjon om effekt på sykefravær. Eksperimentelt design og effektmål er beskrevet separat under [Måling](./maaling).

## Datadekning

| Datagrunnlag | Hva vi kan se | Hva vi ikke kan si |
| --- | --- | --- |
| Eksisterende backendtellere | Opprettede planer, deling med fastlege/Nav, bestillings- og avbestillingsoperasjoner, «plan trengs ikke» og fjerning av valget | Ingen segmentering på tiltak/kontroll eller påminnelsesvalg. Tallene gjelder hele valgt miljø, ikke bare piloten. |
| Ny browsermåling i Dine sykmeldte | Tildelingsgruppe, levert påminnelsesvariant, kort i skjermbildet, bestillings-/avbestillingsforsøk og API-bekreftelse | Ikke alle AID-flater, personer, faktisk utsendte påminnelser eller historisk bruk før instrumenteringen er rullet ut. |
| Ny browsermåling i oppfølgingsplan-frontend | Tildelingsgruppe, levert skjemavariant, skjemabeholder i skjermbildet og opprettelsesforsøk med bekreftet/feilet resultat. Innsendt ja/nei til evalueringspåminnelse når tilleggsinstrumenteringen er utrullet. | Ikke unike planer/personer, bekreftet varsling, utført evaluering eller deling med fastlege/Nav. |

Browsermålingene krever utrulling av instrumenteringen i hver app: [Dine sykmeldte #801](https://github.com/navikt/dinesykmeldte/pull/801), [oppfølgingsplan-frontend #1039](https://github.com/navikt/syfo-oppfolgingsplan-frontend/pull/1039) og tillegget for evalueringspåminnelse [#1041](https://github.com/navikt/syfo-oppfolgingsplan-frontend/pull/1041). Tomme paneler før dette er forventet. Også etter utrulling kan blokkering, nettverksfeil eller manglende instrumentering gi tomme paneler. **Ingen måledata er ikke det samme som null bruk.** Ingen syntetiske produktoperasjoner skal utføres i prod for å fylle dashboardet.

Boardet starter med resultatspørsmålet «får flere en plan, og skjer planhandlingene tidligere?», men viser ingen effektprosent før et godkjent kohortgrunnlag er på plass. Se [definisjoner og datakrav for resultatmåling](./resultatmaaling). Direkte analyse av sykefraværslengde er utenfor omfanget og ikke en senere dashboardleveranse.

## Påminnelsen: hendelser og segmentering

Den nye målingen bruker eksisterende NAIS APM/Faro, med hendelsesnavn `aid_paaminnelse`, domene `aid` og `schema_version=1`. Ingen ny telemetritjeneste eller ekstra Flaggskipet-oppslag er lagt til.

| Felt | Betydning |
| --- | --- |
| `tiltakspakke` | Fast `OPPFOLGINGSPLAN_TILTAKSPAKKE_1`. Andre pakker skal få en eksplisitt kontrakt når de finnes. |
| `flate` | `dinesykmeldte`. Omfatter bare påminnelsesmodulen. |
| `gruppe` | `tiltak`, `kontroll`, `utenfor_scope`, `blandet` eller `ukjent`, fra eksisterende vurdering av relevant virksomhet. `blandet` er reservert for kontekst med flere kjente, ulike grupper. |
| `variant` | `aid` når modulen er tilgjengelig, ellers `skjult`. Tildeling er ikke det samme som levert UI. |
| `paaminnelsevalg` | `bestilt`, `ikke_bestilt`, `ikke_tilbudt` eller `ukjent`. Ved handling er dette status **før** handlingen. |
| `hendelse` | `beslutning`, `vist`, `bestill` eller `avbestill`. |
| `utfall` | Avgrenset status: `tilgjengelig`, `skjult`, `vurdering_mangler`, `status_feilet`, `forsok`, `bekreftet`, `feilet` eller `ikke_bekreftet`. |

- `beslutning`: første avklarte tilstand per montering/relevant kontekst. En senere bakgrunnsoppdatering gir ikke en ny beslutning.
- `vist`: kortet har kommet inn i skjermbildet, registrert med IntersectionObserver. Det betyr ikke at innholdet er lest. Rerendering og bestilling/avbestilling gir ikke nye visninger. Ny åpning/kontekst kan gjøre det. Uten støtte for observatøren sendes ingen visning.
- `bestill`/`avbestill`: ett forsøk og ett resultat per API-operasjon. `bekreftet` krever et gyldig svar med forventet status. Det bekrefter ikke at påminnelsen er sendt.
- Tom/fail-closed vurdering er `ukjent`, aldri kontroll. Den kan skyldes blant annet avslått funksjonsbryter, manglende vurdering eller feil.
- `ikke_bestilt` betyr et tilgjengelig tilbud uten aktiv bestilling, ikke et aktivt nei. `ikke_tilbudt` brukes for kontroll/utenfor scope. Skjult status i tiltaksgruppen sier ikke hvorfor tilbudet mangler; backend kan også skjule ved enkelte feil.

Tabellene grupperer på disse feltene og har kolonnefiltre. Gruppe og påminnelsesvalg er ikke globale filtre som utilsiktet endrer resten av sammenligningen. Påminnelsesvalg er selvvalgt; forskjeller mellom bestilt/ikke bestilt er beskrivende, ikke en isolert påminnelseseffekt.

De nye hendelsesfeltene tillater bare de lukkede kategoriene over. Ukjente felter fjernes; ugyldige verdier forkastes. Ingen person-, virksomhets- eller planidentifikator, dato eller fritekst legges til. Eksisterende APM-håndtering av metadata og URL-er beholdes. Lokale identifikatorer brukt til å skille komponentkontekst forlater ikke komponenten gjennom denne målingen.

## Planskjema: hendelser og segmentering

Planseksjonen bruker `aid_oppfolgingsplan` fra `syfo-oppfolgingsplan-frontend`, med domene `aid`, `schema_version=1`, `tiltakspakke=OPPFOLGINGSPLAN_TILTAKSPAKKE_1` og `flate=ny_plan`. Den leser bare lukkede kategorier fra det eksisterende APM-formatet, ikke URL-er, sesjoner eller identifikatorer.

| Felt | Betydning |
| --- | --- |
| `gruppe` | `tiltak`, `kontroll`, `utenfor_scope` eller `ukjent`. Én virksomhet per skjema; ingen `blandet`-kategori. |
| `variant` | `aid` eller `standard`, slik skjemaet faktisk leveres. Tiltak kan få standard når funksjonsbryteren er av. Standard er derfor ikke synonymt med kontroll. |
| `hendelse` / `utfall` | `beslutning` og `vist` har `tilgjengelig`. `opprett` har `forsok`, `bekreftet` eller `feilet`. |
| `evaluering_paaminnelse` | Innsendt `ja` eller `nei`, bare ved `opprett`, tatt vare på før serverkallet og brukt på både forsøk og resultat. Additivt felt i versjon 1; eldre hendelser mangler det. |

- **Tildelt gruppe → levert variant:** én beslutning per montering/lederkontekst. Rerender og stegbytte teller ikke som nye beslutninger.
- **Faktiske visninger:** skjemabeholderen har kommet inn i skjermbildet. Det beviser ikke at hele skjemaet, alle AID-felt eller innholdet er lest.
- **Planopprettelse:** forsøk og resultat vises separat per gruppe og variant. Ikke summer dem til antall planer. Bekreftet betyr at klienten mottok vellykket svar fra opprettelses-API-et, også når brukeren allerede har navigert bort. Det kan være en ny versjon av en plan, og er ikke bekreftet varsling. Feilet betyr manglende klientbekreftelse; backend kan likevel ha lagret planen. Utkast og ugyldig skjema teller ikke som opprettelsesforsøk.
- **Trend:** hvert punkt teller bekreftelser siste 24 timer. Det er et rullerende døgn, ikke kalenderdøgn. Gruppe og variant har egne serier; standardskjema har stiplet linje. Ikke summer trendpunktene til periodetotaler.

Bruk kolonnefiltrene for å se for eksempel bare tiltak med standardskjema. De endrer ikke andre paneler. Miljøvalget gjelder alle paneler: browserdata avgrenses på `app_environment=dev-gcp|prod-gcp`, mens backend bruker den valgte miljødatakilden. Tiltakspakke er foreløpig fast pakke 1, ikke en dropdown med uvirksomme valg.

### Evalueringspåminnelse

Egen tabell viser innsendt ja/nei per tildelt gruppe, levert variant og resultat. Bruk kolonnefiltrene `Levert variant=aid` og `Utfall=bekreftet` for å se valget ved klientbekreftet opprettelse i skjemaet som tilbyr valget. Det er ikke en separat bekreftelse fra varslingstjenesten eller bevis på utført evaluering.

- Bare AID-varianten tilbyr ja/nei-valget. `nei` i standardvarianten er ikke et aktivt avslag. Innsendt verdi beholdes også der, fordi et gjenbrukt utkast kan inneholde et valg.
- Eldre/manglende felt vises som **Ikke registrert**, aldri som nei. Ugyldige verdier samles under **Ugyldig verdi** uten å vise den opprinnelige verdien. Begge er datadekning/kontraktskvalitet, ikke brukerpreferanser.
- Forsøk og resultat er separate hendelser, og skal ikke summeres. Eksisterende planpaneler teller fortsatt alle gyldige opprettelseshendelser uavhengig av det nye feltet.
- Påminnelsesvalget fra Dine sykmeldte gjelder påminnelsen om å **lage plan** og kan ikke brukes til å segmentere planopprettelser. Målingene har ingen personkobling og skal ikke settes sammen til en konverteringsprosent eller brukes som effektmål.

## Eksisterende tellere

Prometheus-spørringene bruker `syfo_oppfolgingsplan_backend_<navn>_total`, avgrenset til `app="syfo-oppfolgingsplan-backend"` i valgt miljø:

| Navn | Betydning |
| --- | --- |
| `oppfolgingsplan` | Plan opprettet, ikke nødvendigvis ferdigstilt eller delt. |
| `oppfolgingsplan_shared_with_gp` | Delingsoperasjon med fastlege. |
| `oppfolgingsplan_shared_with_nav` | Delingsoperasjon med Nav. |
| `paaminnelse_bestilt` / `paaminnelse_avbestilt` | Vellykkede bestillings-/avbestillingsoperasjoner, ikke antall aktive bestillinger eller utsendinger. |
| `unntaksvurdering` / `unntaksvurdering_soft_deleted` | Registrering/fjerning av behovsvurdering. |

`increase` estimerer endringen mellom scrape-tidspunkter. Deling kan gjelde planer opprettet før valgt tidsrom. Flere operasjoner kan gjelde samme plan. Tellerne og browserhendelsene er derfor ikke én brukertrakt, og dashboardet beregner ingen konverteringsprosent fra dem. LPS har annen dekning og må ikke antas inkludert i disse API-tellerne.

## Utrulling og kontroll

1. Gjennomgå og rull ut appinstrumenteringen. Bekreft i dev at tiltak, kontroll, utenfor scope, manglende vurdering, bestilling, avbestilling og feil gir de forventede kategoriene.
2. Publiser [dashboard-JSON](/grafana/team-esyfo-aid.json) til eksisterende UID `aufd2lm` i **Team Esyfo**. Eksporter gjeldende dashboard først for tilbakeføring. Ikke opprett en parallell kopi.
3. Kontroller spørringene og feltnavnene mot Grafana. Etter apputrulling: bekreft de første reelle hendelsene før tallene brukes til produktbeslutninger. Mangel på trafikk er ikke i seg selv en feil.
4. For planskjemaet: bekreft `event_data_*`-feltene og `app_environment` i dev, deretter tabeller og trend for de gyldige hendelse/utfall-parene over. Sjekk både dev/prod-filter, ukjent gruppe og tiltak med standardvariant. En tom, vellykket spørring er ikke bevis for hele hendelsesformatet. Dashboardkode og lokal Grafana-import alene verifiserer ikke appens ende-til-ende-levering.
5. For evalueringspåminnelse: verifiser ja/nei på forsøk og resultat, separate varianter, samt at eldre hendelser uten felt fortsatt inngår i totalene og står som «Ikke registrert». Ikke behandle historiske hendelser som aktive nei. Verifiser visningsnavn og kolonnefiltre etter import.

Kilden er `docs/.vitepress/grafana/aid-delivery-usage.ts`; planspørringene ligger i `aid-plan-queries.ts` ved siden av. Kjør `pnpm aid-dashboard:export`, `pnpm grafana-dashboard:test` og `pnpm grafana-dashboard:smoke` i `docs/`. `pnpm aid-dashboard:query-smoke` verifiserer planspørringenes tellinger og avgrensninger mot syntetiske data i en lokal Loki-container. Eksportkontrollen inngår i dokumentasjonsbygget.

## Neste prioriteringer

1. Verifiser første målekjede og datadekning etter utrulling før flere hendelser legges til.
2. Avklar første resultatmål for planhandlinger, komplett nevner og godkjente aggregater etter [resultatmåling](./resultatmaaling). Ikke legg personkobling eller helsefelter til browsermålingen.
3. Skill påminnelsestyper og følg bestilling til bekreftet utsending når en autoritativ kilde for utsendingsresultat er identifisert. Ikke kall en bestilling «sendt».

Et felles bibliotek eller generell kontrakthåndheving vurderes først dersom flere konkrete målekjeder viser at det gir verdi. Første steg trenger verken datavarehus, personkobling eller nytt rammeverk.
