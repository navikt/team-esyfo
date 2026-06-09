# Dataretting ved feilregistrering av oppfølgingsplan

Dersom en oppfølgingsplan er feilregistrert, for eksempel ved at den er knyttet til feil person eller inneholder feil informasjon, må det gjøres en dataretting for å korrigere feilen. 
Dette er nødvendig for å ivareta personværnet til vedkommende den gjelder.

## Prosess for dataretting
Når en oppfølgingsplan mottas, vil den etter noe tid bli sendt til `Dokumentporten`, som igjen 
lager et varsel i `Dialogporten`.
Dersom oppfølgingsplanen i tillegg er delt med Nav, vil den også bli sendt til `Dokarkiv`.

For å rette dette gjøres følgende:
1. Opprett en flyway-migrering i `syfo-oppfolgingsplan-backend` som setter feltene `feilregistrert` og `feilregistrert_aarsak`.
2. Opprett en flyway-migrering i `syfo-dokumentporten` som setter feltent `document.delete_performed`
3. Dersom planen er delt med nav (feltet `journalpost_id` er satt i `syfo-oppfolgingsplan-backend`), må dokumentet settes som 
feilregistrert i `Dokarkiv`. Dette kan gjøres av hvem som helst med tilgang til `Gosys`, men krever identifikasjonen til den riktige personen. 
