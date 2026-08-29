# Browser-observability

Dette er minimumskontrakten for Team eSyfos elleve aktive browserflater. Den sier hva som må være sant før en flate kan stå som dekket; [runtimeinventaret](./runtimeinventar) viser hva som faktisk er kjent per flate.

Aktivt scope er `aktivitetskrav-frontend`, `aktivitetskrav-microfrontend`, `bro-frontend`, `dialogmote-frontend`, `dialogmote-microfrontend`, `dinesykmeldte`, `lumi-dashboard`, `meroppfolging-frontend`, `meroppfolging-microfrontend`, `narmesteleder-frontend` og `syfo-oppfolgingsplan-frontend`.

## Minimumskrav

| Område | Bestått når |
| --- | --- |
| Identitet | `app`, `namespace=team-esyfo`, miljø og eksakt deploy-SHA kan leses i mottatt telemetry. |
| SDK | `@nais/apm` er pinnet til én eksakt versjon og initialiseres én gang. Rå Faro er migreringsstatus, ikke måltilstand. |
| Sider | `page.id` kommer fra en kort allowlist. Dynamiske ID-er og ukjente ruter faller til en generell verdi. |
| URL-er | Path-parametre, query, fragment, credentials og fritekst fjernes før sending. Scrubbingen gjelder alle strenger og nøkler i payloaden. |
| Brukerdata | `setUser`, user context, session replay og screenshots er avslått. Aktivering krever en separat privacy- og sikkerhetsbeslutning. |
| Feil | Én komponent eier hver feil. Error boundary eller rammeverkets tilsvarende toppnivåhåndtering gir recovery uten å sende samme feil flere ganger. |
| Sampling | Rate er et eksplisitt tall større enn `0` og høyst `1`. SDK-default eller ukjent rate teller som et gap. En samplet session er ikke en unik bruker. |
| Tracing | På eller av er et bevisst valg. Browsertracing aktiveres først når URL-scrubbing og ende-til-ende-kobling er verifisert. |
| Sourcemaps | Build-opplasting og faktisk deobfuskering i produksjon bevises separat. |
| Canary | En syntetisk test viser at app/team/miljø/SHA/rute er riktig, at én feil blir én hendelse, og at rå ID-er og query ikke sendes. |

## Rollout-gate

En repoendring er klar for menneskereview når statiske tester dekker rutetabell, rekursiv scrubbing, eksplisitt sampling, avslått bruker-/replay-kontekst og single-owner feilfangst. Det er ikke produksjonsbevis.

Deretter kreves:

1. **Dev:** collector svarer 2xx; metadata og normalisert `page.id` matcher deployet SHA; privacy-canary er ren.
2. **Første produksjonsdeploy:** page loads, sessions og CWV finnes med samme identitet og sampling. En kontrollert exception vises nøyaktig én gang.
3. **Neste produksjonsdeploy:** en ny unik SHA erstatter den gamle. Først da er releasekoblingen bevist over tid.

Testen skal bruke genererte canary-verdier og en ufarlig startside, aldri en reell personsak. Evidensen lagrer tidspunkt, miljø og lenke eller kort beskrivelse — ikke rå payload eller personopplysninger.

## Matrise og status

Runtimeinventarets browsermatrise er fasiten for de elleve flatene. Den viser eier, identitet, SDK-versjon, side-/rutebeskyttelse, release, sampling, sourcemaps, tracing og siste syntetiske kontroll. `mangler`, `ikke verifisert` og SDK-default er gap, aldri grønt.

Følgende er eksplisitt utenfor utrullingen: `dulting-studio`, `syfojanitor-frontend`, `syfooppfolgingsplanservice` og komponentbiblioteket `dinesykmeldte-sidemeny`. Airflow/data-science-flater og andre namespaces følger sine eiere.

`dinesykmeldte`-implementasjonen i [PR #779](https://github.com/navikt/dinesykmeldte/pull/779) er første kildekodereferanse. Dev-/produksjonsevidens står fortsatt pending og må vises som gap i matrisen. [#206](https://github.com/navikt/team-esyfo/issues/206) kan lukkes når kontrakten og statusmodellen er godkjent; utrullingsoppgavene eier live-evidensen per flate.

## Tolkning i dashboard

- Page loads og sessions er hendelser under valgt sampling, ikke brukere.
- Tall med ulik eller ukjent samplingrate summeres ikke.
- `No data` er ukjent når collector, miljø eller sampling ikke er bevist.
- Browserexceptions brukes til drilldown; de er ikke alene et mål på brukerimpact eller tilgjengelighet.
