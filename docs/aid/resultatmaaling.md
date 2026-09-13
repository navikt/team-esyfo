# AID – fra produktbruk til resultatmåling

Målet er å forstå om tiltakspakken fører til flere og tidligere planhandlinger, bedre oppfølging og mindre behov for at Nav etterspør en plan. Dagens [Grafana-dashboard](./dashboard) svarer på levering og bruk. Det svarer ikke på effekt: browserhendelser er verken en komplett populasjon eller unike oppfølginger.

[Kildekartleggingen fra 8. september 2026](./datakilder) viser eksisterende analysevei, gjenbrukbare tabeller og konkrete hull i beregninger og historikk. Den erstatter ikke avklaringene under, men gjør neste leveranse mer presis.

**Direkte analyse av sykefraværslengde er ikke tillatt i dette arbeidet.** Vi innfører ikke analyse av tid til friskmelding, retur til arbeid eller sykefraværsgrad. Tidsfrister for planhandlinger krever en særskilt avklart, godkjent tidsreferanse; de gir ikke i seg selv tillatelse til å samle helseopplysninger eller koble data.

## Spørsmålene dashboardet skal hjelpe oss med

| Spørsmål | Verdi | Datagrunnlag og status |
| --- | --- | --- |
| Kommer tilbudet fram til riktig gruppe? | Skille en svak idé fra manglende levering. | Klart for browsermåling etter apputrulling: tildelt gruppe, levert variant og visning. Ikke mål på hele pilotpopulasjonen. |
| Bestiller brukerne påminnelse om å lage plan? | Forstå om tilbudet oppleves nyttig og om bestillingen virker. | Forsøk og API-resultat i Dine sykmeldte. Ikke aktivt antall bestillinger, faktisk utsending eller leste varsler. |
| Ønsker brukerne en evalueringspåminnelse? | Forstå bruken av et annet, separat tilbud. | Innsendt ja/nei ved opprettelse i planskjemaet, etter utrulling av frontend #1041. Standardvariantens nei er ikke et aktivt avslag. Ikke bevis på utført evaluering. |
| Får flere en plan innen avtalt frist? | Primært resultatbehov: gjør tiltakspakken en forskjell for planhandlinger? | Ikke klart. Krever godkjent kohort, tidsreferanse, entydig planhandling og komplett nevner. «Innen uke 4» er en kandidat som må avklares, ikke en beregning i dagens board. |
| Blir planen delt, oppdatert og tilgjengelig før Nav etterspør den? | Se om planen kommer til nytte, ikke bare blir opprettet. | Separate utfall. Autoritative kilder, dekning, rekkefølge og frister må verifiseres. Dagens delingstellere kan ikke svare på dette. |
| Forstår brukerne neste steg, og opplever de oppfølgingen som nyttig? | Forklare mekanismen bak bruk og resultater. | Vurder egne, godkjente brukerundersøkelser. Vis svarandel og utvalg; ikke bland skårer med telemetri til en automatisk effektdom. |

## Første resultatvisning: planhandling innen avtalt frist

Dette er en kravliste for avklaring, ikke en ny datakontrakt eller bestilling av personkobling:

- **Analyseenhet og nevner:** definer hvilke oppfølginger som er omfattet, også de uten besøk, bestilling eller plan. Browservisninger kan ikke være nevner. Vis både antall virksomheter og antall oppfølginger bak hver gruppe.
- **Teller:** velg én primær handling, for eksempel første ferdigstilte plan. Skill utkast, ny versjon og deling. Avklar dekning fra Nav-løsningen og LPS og hvordan duplikater håndteres før kildene eventuelt kombineres.
- **Tid:** avklar et godkjent startpunkt, frist og inklusjonsvindu. Oppfølginger som ennå ikke har hatt hele observasjonsvinduet, skal ikke telles som «ingen plan innen fristen». Vis dem som ikke modne for måling. Eksisterende oppfølginger ved pilotstart må behandles eksplisitt.
- **Gruppe:** bruk tildelingen fra Flaggskipet. Tiltak og kontroll er fordelt mellom virksomheter innenfor pilotområdet; resten av landet er ikke kontroll. Primærsammenligningen beholder tiltaksgruppen også når tilbudet ikke ble levert. Vis leveringsgap separat.
- **Sammenligning:** vis teller/nevner, andel, forskjell i prosentpoeng og usikkerhet først når analyseansvarlig har fastsatt metoden. Målinger fra samme virksomhet er ikke uavhengige. Ingen automatisk grønn/rød «effekt»-status fra en vilkårlig terskel.
- **Dekning:** vis datakilde, oppdatert tidspunkt, siste komplette kohort og manglende data. Manglende/undertrykte data er ikke null. Smågrense og tillatte segmentkombinasjoner må godkjennes; ikke kopier en grense fra en prototype.

Grafana skal bare motta godkjente aggregater. Ingen fødselsnummer, organisasjonsnummer, plan-ID, rå tidsreferanse for et individ eller nye helsefelter legges i produkttelemetri, Prometheus-labels eller Loki for denne analysen. Beregning og eventuell godkjent kobling hører hjemme i et tilgangsstyrt analysegrunnlag, ikke i dashboardspørringer over browserlogger.

## Påminnelsesvalg er ikke et randomisert eksperiment

Tiltakspakken kan sammenlignes etter tildelt gruppe. Bestilt/ikke bestilt er derimot selvvalgt og kan endre seg over tid. En forskjell mellom dem viser ikke alene hva påminnelsen forårsaket. Et senere valg må heller ikke brukes til å klassifisere hele historikken som «bestilt».

Tabellen for påminnelse om å lage plan i backend inneholder nåtilstand per person/virksomhet og oppdateres ved nye valg. Den alene dokumenterer ikke full valghistorikk. Før en analyse bestilles, må backend-/analyseansvarlig undersøke om eksisterende outbox, historikk eller godkjente uttrekk dekker bestilling, avbestilling og utsendingsresultat. Ikke bygg en ny hendelseslogg før dette kildegapet er bekreftet. Teknisk behandling av en utsending er heller ikke det samme som at et varsel er lest.

Evalueringspåminnelsen i planskjemaet er en annen påminnelse. De to målingene kan ikke kobles til en personreise med dagens telemetri.

## Det vi tar med fra dulting-studio

Spørsmålsdrevet inndeling, synlige definisjoner, side-ved-side-sammenligning og skillet mellom resultat og forklaring er nyttige konsepter fra prototypens målerammeverk og analysevisning. Tallene og regnereglene er ikke et produksjonsgrunnlag. Vi kopierer ikke en obligatorisk brukertrakt, resten av landet som kontroll, kausal konklusjon fra valgt segment eller analyse av sykefraværets varighet.

## Leveranserekkefølge

1. **App- og dashboardansvarlig:** rull ut eksisterende instrumentering og verifiser de første reelle hendelsene i dev/prod. Det nye evalueringspanelet er bakoverkompatibelt; manglende felt er «Ikke registrert».
2. **Produkt- og analyseansvarlig, med nødvendige juridiske avklaringer:** velg primær planhandling, nevner, tidsreferanse og tillatte aggregater. Ingen nye datakoblinger før dette er avklart.
3. **Kildeansvarlige:** verifiser dekning for tildeling, planhandlinger, påminnelseshistorikk og eventuell etterspørring fra Nav. Gjenbruk godkjente kilder der de finnes.
4. **Analyse- og dashboardansvarlig:** lever én resultatvisning med datadekning og usikkerhet. Utvid først når den gir et pålitelig svar. Et felles bibliotek eller generelt skjemarammeverk er ikke en forutsetning.
