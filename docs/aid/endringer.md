# 🧩 Funksjonelle endringer – Tiltakspakke 1

Dette er de **funksjonelle endringene** i Tiltakspakke 1: det vi faktisk bygger for å realisere [dulte-tiltakene](./dulte-tiltak) fra nudgelab. Hver endring er **1:1 med en funksjonell oppgave** på tavla (epic for kryssrepo/større, story for frittstående), så alt kan testes funksjonelt.

Tabellene er gruppert etter hvem endringen er for. Kolonnene: **Hvor** (appen/flaten endringen gjøres i — flere med «+» når den spenner apper) · **Hva** brukeren møter · **Hvorfor** (dulten bak, med lenke til [dulte-tiltaket](./dulte-tiltak)) · **Figma** · **Spor** (oppgaven/epicen der status og detaljer lever).

> **Status følger tavla, ikke wikien.** Følg «Spor»-lenken for hvor en endring står. Referer gjerne til endringene ved navn.

## For arbeidsgiver (nærmeste leder)

| Endring | Hvor | Hva | Hvorfor | Figma | Spor |
|---------|------|-----|---------|-------|------|
| <span id="e1"></span>**Kom i gang-boks øverst** | Dine sykmeldte | Boks øverst som oppfordrer til tidlig oppfølging | Fjerner usikkerhet, oppmuntrer tidlig kontakt · [dult](./dulte-tiltak#leder) | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1187-8558) | [#742](https://github.com/navikt/dinesykmeldte/issues/742) |
| <span id="e2"></span>**«Ditt ansvar»-seksjon nederst** | Dine sykmeldte | Ansvarsseksjon nederst (erstatter film/tips): lag plan, dialogmøte 1, tilrettelegg, følg opp — med nav.no-lenker | Tydeliggjør lederens rolle og ansvar · [dult](./dulte-tiltak#leder) | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1187-8558) | [#743](https://github.com/navikt/dinesykmeldte/issues/743) |
| <span id="e3"></span>**Frivillig påminnelse om å lage plan** | Dine sykmeldte + Oppfølgingsplan + esyfovarsel | Leder kan be om (og avbestille) påminnelse før 4-ukersfristen; varsel på Min side (+ mulig e-post) leder til Dine sykmeldte og planen. *Merk: e-post ikke avklart* | Skaper en kanal inn i tidlig oppfølging · [dult](./dulte-tiltak#leder) | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1187-8346) | [#722](https://github.com/navikt/dinesykmeldte/issues/722) · epic |
| <span id="e4"></span>**Forbedret varsel når Nav ber om plan** | esyfovarsel | Bedre tekst og innramming i varselet når en Nav-veileder ber om en plan | Tydeligere hvorfor → lettere å svare · [dult](./dulte-tiltak#leder) | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1206-10726) | [#1018](https://github.com/navikt/esyfovarsel/issues/1018) |
| <span id="e5"></span>**Behovsvurdering: «plan trengs ikke»** | Dine sykmeldte + Oppfølgingsplan | Leder kan aktivt melde at plan ikke trengs nå (og ombestemme seg); unntak må velges aktivt. *Merk: deling avklares med jurist/PVK* | Gjør plan til standardvalget ved å synliggjøre unntak · [dult](./dulte-tiltak#leder) | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1187-7824) | [#356](https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/356) · epic |
| <span id="e6"></span>**Tydeligere oppfølgingsplan-forside** | Oppfølgingsplan | Bedre forsidetekst om hvordan bruke planen og hvorfor dele den med fastlegen | Synliggjør verdi; framer deling med lege positivt · [dult](./dulte-tiltak#leder) | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1191-12005) | [#889](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/889) |
| <span id="e7"></span>**Frivillig evalueringsvarsel** | Oppfølgingsplan + esyfovarsel | Leder kan be om påminnelse om å evaluere planen ved evalueringsdato (avkryssing) | Påminnelse + hvorfor jevnlig oppfølging hjelper · [dult](./dulte-tiltak#leder) | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1191-13254) | [#330](https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/330) · epic |

## For den sykmeldte (arbeidstaker)

| Endring | Hvor | Hva | Hvorfor | Figma | Spor |
|---------|------|-----|---------|-------|------|
| <span id="e8"></span>**Innhold til den sykmeldte** | Oppfølgingsplan | Veiledning uten aktiv plan (bidra + medvirkningsplikt), hjelp til å forberede samtalen (Idébanken), og med aktiv plan. *Merk: få er inne før en plan finnes — se Mikrofrontend* | Styrker medvirkning gjennom hele forløpet · [dult](./dulte-tiltak#arbeidstaker) | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1211-15333) | [#890](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/890) |
| <span id="e9"></span>**Synliggjøre «plan ikke aktuell»** | Oppfølgingsplan | Viser den sykmeldte at leder har meldt at plan ikke trengs, med mulighet til å kontakte Nav. Kun på siden — ikke SMS/e-post | Åpenhet og mulighet til å reagere · henger på behovsvurderingen | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1223-9621) | [#888](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/888) |
| <span id="e10"></span>**Be arbeidsgiver om å lage en plan** | Oppfølgingsplan | Den sykmeldte kan be leder om å lage en plan når ingen finnes | Aktiv kanal for medvirkning · [dult](./dulte-tiltak#arbeidstaker) | [🎨](https://www.figma.com/design/FKUh739hCdxz3DfoDzxRx3/AID-Oppf%C3%B8lginsplan?node-id=1251-9339) | [#764](https://github.com/navikt/syfo-oppfolgingsplan-frontend/issues/764) |
| <span id="e11"></span>**Mikrofrontend på Min side** | Min side (mikrofrontend) | Modul på Min side som løfter fram oppfølgings-innholdet der den sykmeldte faktisk er. *Merk: scope uavklart (kun oppfølgingsplan vs. medvirkning bredt)* | Møter brukeren der de er | — | [#140](https://github.com/navikt/team-esyfo/issues/140) |

## På tvers

| Endring | Hvor | Hva | Hvorfor | Figma | Spor |
|---------|------|-----|---------|-------|------|
| <span id="e12"></span>**A/B-styring (Flaggskipet)** | Flaggskipet | Egen tjeneste tildeler tiltaks- eller kontrollgruppe per underenhet (pilot Troms og Finnmark) | Muliggjør en etterprøvbar A/B-test · [verktøyside](/verktoy/flaggskipet) | — | [#5](https://github.com/navikt/flaggskipet/issues/5) · epic |
| <span id="e13"></span>**Måling** | Analyse | Måler om pakken virker — blant annet om flere lager en plan i tide | Vi setter bare i gang det vi kan måle · [Måling](./maaling) | — | [Måling](./maaling) |
