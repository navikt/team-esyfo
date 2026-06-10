# Dataretting ved feilregistrering av oppfølgingsplan

Dersom en oppfølgingsplan er registrert på feil person, må det gjøres en dataretting. 
Dette er nødvendig for å ivareta personvernet til vedkommende planen gjelder.

## Prosess for dataretting
Når en oppfølgingsplan mottas, vil den etter noe tid bli sendt til `Dokumentporten`, som igjen 
sender en beskjed til arbeidsgiver i `Dialogporten`. Denne inneholder en lenke til PDF-en.
Dersom oppfølgingsplanen i tillegg er delt med Nav, vil den også bli sendt til `Dokarkiv`.

For å utilgjengeliggjøre en feilregistrert plan, gjøres følgende:
1. Opprett en flyway-migrering i `syfo-oppfolgingsplan-backend` som setter feltene `oppfolgingsplan.feilregistrert` og `oppfolgingsplan.feilregistrert_aarsak`.
2. Opprett en flyway-migrering i `syfo-dokumentporten` som setter feltet `document.delete_performed`
3. Dersom planen er delt med nav (feltet `oppfolgingsplan.journalpost_id` er satt i `syfo-oppfolgingsplan-backend`), må dokumentet settes som 
feilregistrert i `Dokarkiv`. Dette kan gjøres av `funksjonell brukerstøtte` i `Gosys`. Tilordne gruppen i en Jira-sak, og spør om de kan bistå.
