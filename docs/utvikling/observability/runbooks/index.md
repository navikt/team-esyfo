# Operative runbooks

Runbookene er inngangen fra Kontrollrom når et signal krever vurdering. De beskriver hvordan vi bekrefter signal, avgrenser konsekvens, velger trygg handling og beviser recovery. De aktiverer ikke pager og erstatter ikke en manglende domene- eller signalkontrakt.

## Signal-familier

- [HTTP og runtime](./http-runtime): generisk RED-, Loki-, restart-, replika- og telemetrytriage.
- [Browser](./browser): Faro-unntak, dekningsgap, sideidentitet og privacy.
- [Pipelines og jobber](./pipelines-og-jobber): forventet kjøring, progresjon, ferskhet og terminale utfall.

## Pagerkandidater

- [syfomotebehov tilgjengelighet](./syfomotebehov-tilgjengelighet)
- [Oppfølgingsplan: permanent deserialiseringsfeil](./oppfolgingsplan-deserialisering)
- [Budstikka-helsesjekk](https://github.com/navikt/syfo-budstikka/blob/main/docs/helsesjekk.md)

## Felles stoppregler

- `No data`, en manglende rad og en datasourcefeil er tre ulike tilstander. Ingen av dem er grønn.
- Ikke restart eller replay blindt. Poison records, kontraktbrudd og ikke-idempotente sideeffekter kan gjøre situasjonen verre.
- Ikke kopier rå logger, URL-er, payloads eller identifikatorer til Slack, GitHub eller dokumentasjon.
- En session, page load, request eller Kafka-record er ikke en unik bruker.
- I bemannet tid er `#esyfo-alarm` Team eSyfos operative inngang for ticket-respons. Den er **ikke** en verifisert pager/on-call-rute, og Slack må ikke antas lest utenfor bemannet tid.
- Ved akutt, kritisk konsekvens utenfor bemannet tid: følg den berørte tjenestens allerede etablerte beredskaps-/hendelsesprosess og varsle nærmeste verifiserte operative vakt. Kontrollrommet dokumenterer foreløpig ingen egen team-pager; dette er en eksplisitt blocker i [#217](https://github.com/navikt/team-esyfo/issues/217).
- Hvis konsekvens, eier eller trygg recovery er ukjent, stabiliser situasjonen og eskaler framfor å improvisere i produksjon. Se [Alert-registeret](../alert-register) for gjeldende responsklasse og ruting.
