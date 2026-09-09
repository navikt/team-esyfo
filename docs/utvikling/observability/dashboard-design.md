# Design av driftsdashboardene

Teamet trenger rask orientering og en kort vei til bevis, ikke enda et system for sakshåndtering. Vi beholder derfor to tydelige innganger:

| Dashboard | Spørsmål | Neste steg |
|---|---|---|
| [Kontrollrom](./kontrollrom) | Hvor bør vi undersøke nå? | Velg tjeneste og undersøk trafikk, feil, replikaer eller meldingsbehandling. |
| [Feiloversikt](./feildrilldown) | Hva feiler, når skjer det, og hvilket forløp kan vi undersøke? | Åpne feilgruppens logger, tjenestens APM eller et konkret trace. |

## Valgene vi bygger på

1. **Oversikt før detalj.** Vis de få signalene som peker mot neste handling først. Målegap står ved tjenesten, mens detaljer åpnes ved behov; WARN-avvisninger og nettleserfeil har tydelige, egne innganger.
2. **Filtre må oppføre seg som de ser ut.** Kontrollrommet åpner med en fast produksjonsoversikt. Tjenestevelgeren står i detaljfanen og påvirker bare den. Tjenestedetaljene følger tjenestens signaler: workers får ikke tomme HTTP-grafer, og særpaneler vises bare hos eieren. Runtime og nettleserstrømmer får ikke late som de har samme miljøkontrakt.
3. **Farger skal bety noe.** En omstart eller kort kapasitetsreduksjon er et undersøkelsessignal, ikke automatisk en hendelse med brukerimpact. Ukjente målinger skal verken bli rødt null eller grønn friskmelding.
4. **Grafikk skal svare på et spørsmål.** Tidsserier viser når noe endret seg. Horisontale stolper viser hvilke tjenester som bidrar mest. Tabeller beholder feiltype, kode og operasjon der eksakt identitet er nødvendig for feilsøking.
5. **Presist språk uten kontraktstøy.** Vi teller logghendelser, ikke incidents eller brukere. OTel-feilstatus er feilmarkerte kall, ikke automatisk HTTP 5xx. Korte paneltitler og skjult panelinfo erstatter forklaringsvegger.
6. **Bruk plattformens gravemuligheter.** Et presist Explore-søk bevarer vår feilgruppe. Logs Drilldown gir kontekst i tjenestens øvrige logger. NAIS APM har egen gruppering og tracing; det er ikke et løfte om identisk feilgruppe.

Dette er designvalg basert på gjennomgang av kode, produksjonsdata og dokumenterte prinsipper, ikke en gjennomført brukertest. Vi bør observere hvordan teamet løser neste reelle hendelse: finner de riktig tjeneste, forstår de tidsrommet, og kommer de til et nyttig forløp uten å skrive en spørring?

## Grunnlag

[Grafanas dashboard-råd](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/best-practices/) vektlegger ett klart spørsmål, lav tolkningskostnad, hierarkiske drilldowns og utprøving utenfor produksjon. [Google SRE](https://sre.google/sre-book/monitoring-distributed-systems/) skiller symptomer fra årsaker og prioriterer trafikk, feil, ventetid og metning. Her betyr det at podhistorikk og instrumenteringsstatus ikke skal dominere tjenestebildet.

[Progressiv avdekking](https://www.nngroup.com/articles/progressive-disclosure/) og [språk som samsvarer med brukerens verden](https://www.nngroup.com/articles/match-system-real-world/) støtter synlige innganger til detaljer og gjenkjennelige titler. Teknisk presisjon beholdes i feltene utvikleren trenger.

[NAIS APMs URL-kontrakt](https://doc.nais.io/observability/apm/reference/url-contract/) støtter direkte lenker til Issues og Traces med tjeneste, miljø og tidsrom. APMs [fingerprinting](https://doc.nais.io/observability/apm/reference/issues-model/) er forskjellig fra dashboardets `event_type`/kode/operasjon-gruppering; lenketeksten må vise den forskjellen.
