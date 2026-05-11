# 👥 esyfo-token-tjeneste

**Fase:** Gjennomgående 🔵

## Formål

Forket verktøy fra `Team HAG` for å hente Maskinporten-token i `dev`-miljøet (krever `naisdevice`). Støtter p.t. kun systembrukere. Benyttes for å enklere kunne gjøre kall med auth
til våre eksterne tjenester `syfo-dokumentporten` og `esyfo-narmesteleder` gjennom Bruno, Curl eller liknende. Den innloggede
konteksten blir da som en LPS mot våre tjenester.

#### Forutsetninger

- `Naisdevice` installert og konfigurert.
- Gyldig systembruker konfigurert på organisasjonen man ber om token for.

#### Konfigurasjon
- Maskinportenklienten er konfigurert med et nøkkelpar, `PEM` ligger i `nais console -> secrets`.
- Satt opp mot Altinn-systemet `KpfSys`
- Konfigurerte organisasjoner ligger i Slack-kanalen #syfo-ut-av-altinn2

#### Begrensninger
- `lps-oppfolgingsplan-mottak` benytter ikke systembruker, så token vil ikke
være gyldig der. Burde kreve små endringer i token-tjenesten for å støtte dette, dersom noen har lyst.
- Kan ikke brukes direkte mot Altinn/Dialogporten. 
