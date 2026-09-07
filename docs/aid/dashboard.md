# AID – levering og bruk

[Åpne AID-dashboardet i Grafana](https://grafana.nav.cloud.nais.io/d/aufd2lm).

Dashboardet følger levering og bruk av tiltakspakke 1. Det er **produkttelemetri, ikke effektanalyse**: ingen personkobling, sykefraværslengde, sykefraværsgrad eller konklusjon om effekt på sykefravær. Eksperimentelt design og effektmål er beskrevet separat under [Måling](./maaling).

## Datadekning

| Datagrunnlag | Hva vi kan se | Hva vi ikke kan si |
| --- | --- | --- |
| Eksisterende backendtellere | Opprettede planer, deling med fastlege/Nav, bestillings- og avbestillingsoperasjoner, «plan trengs ikke» og fjerning av valget | Ingen segmentering på tiltak/kontroll eller påminnelsesvalg. Tallene gjelder hele valgt miljø, ikke bare piloten. |
| Ny browsermåling i Dine sykmeldte | Tildelingsgruppe, levert påminnelsesvariant, kort i skjermbildet, bestillings-/avbestillingsforsøk og API-bekreftelse | Ikke alle AID-flater, personer, faktisk utsendte påminnelser eller historisk bruk før instrumenteringen er rullet ut. |

Browsermålingen krever utrulling av instrumenteringen i Dine sykmeldte. Tomme paneler før dette er forventet. Også etter utrulling kan blokkering, nettverksfeil eller manglende instrumentering gi tomme paneler. **Ingen måledata er ikke det samme som null bruk.** Ingen syntetiske produktoperasjoner skal utføres i prod for å fylle dashboardet.

## Hendelser og segmentering

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

Kilden er `docs/.vitepress/grafana/aid-delivery-usage.ts`. Kjør `pnpm aid-dashboard:export`, `pnpm grafana-dashboard:test` og `pnpm grafana-dashboard:smoke` i `docs/`. Eksportkontrollen inngår i dokumentasjonsbygget.

## Neste prioriteringer

1. Verifiser første målekjede og datadekning etter utrulling før flere hendelser legges til.
2. Utvid med faktisk levering og planhandlinger i oppfølgingsplan-frontend: opprettelse, deling med sykmeldt, fastlege og Nav. Bruk eksisterende autoritativ gruppekontekst; manglende kontekst skal ikke fylles inn med gjetting eller ekstra Flaggskipet-kall bare for måling.
3. Skill påminnelsestyper og følg bestilling til bekreftet utsending når en autoritativ kilde for utsendingsresultat er identifisert. Ikke kall en bestilling «sendt».

Et felles bibliotek eller generell kontrakthåndheving vurderes først dersom flere konkrete målekjeder viser at det gir verdi. Første steg trenger verken datavarehus, personkobling eller nytt rammeverk.
