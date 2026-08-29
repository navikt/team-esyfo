# Runbook: browser

Browserdelen i Kontrollrommet skiller kildekodekonfigurasjon fra operative målinger. Per nå er bare Faro `kind=exception` live-verifisert for Team eSyfos Feildrilldown. [Browserkontrakten](../browserkontrakt) kommer fra [#206](https://github.com/navikt/team-esyfo/issues/206); page loads, sessions, sideidentitet og CWV p75 forblir `UKJENT` til den enkelte flaten har bestått rollout-gatene.

## 1. Bekreft identitet og dekning

1. Åpne runtimeinventaret fra Kontrollrommets browserstatus og finn browserflaten der.
2. Bekreft `browserIdentity.serviceName` mot faktisk Faro-konfig i kildekoden og deployert revision.
3. Skill statusene:
   - SDK-konfigurert betyr bare at kildekoden forsøker å sende telemetry.
   - Browser tracing, sourcemaps, page identity og privacy-canary har egne bevis.
   - Ingen exceptions er ikke bevis på at SDK-en sender page loads eller CWV.

## 2. Triage et browser-unntak

1. Åpne Feildrilldown fra Kontrollrommet og velg samme tidsrom og service.
2. Se på stabil exception-type/fingerprint og normalisert side-ID når den finnes.
3. Ikke summer hendelser på tvers av flater med ulik eller ukjent samplingrate.
4. Omtal en exception som en **samplet hendelse**, ikke en session eller bruker.
5. Koble til backendspor bare når en sanitert trace-/correlation-identitet faktisk finnes.

## 3. Privacy og sikker deling

- Ikke bruk rå URL eller fritekst som paneldimensjon; path-parametre og query-parametre kan inneholde persondata.
- Ikke sett user context, fødselsnummer, e-post eller NAV-identifikatorer i Faro.
- Ikke aktiver console capture eller session replay uten eksplisitt privacy-/sikkerhetsbeslutning.
- Del kun aggregert eller sanitert evidens. Skjermbilder må kontrolleres for URL-er og identifikatorer før de postes.

## 4. CWV og page-load-gapet

Når et CWV-/page-load-panel viser `No data` i NAIS sitt generiske dashboard:

1. Bekreft app- og env-identitet.
2. Teamets nåværende Faro exception-query har ikke verifisert miljødimensjon. Ikke les den som produksjonsstatus eller konkluder med 0 page loads eller god ytelse.
3. Verifiser event-/measurement-schema, miljølabel og faktisk sampling i den aktuelle flatens rollout.
4. Først etter en kontrollert test kan LCP/INP/CLS p75 vises per flate eller normalisert side. Ulike sample rates skal ikke summeres.

## Kontrollert test av runbooken

I dev eller med en eksisterende, ufarlig exception:

1. Bekreft at exceptionen vises på riktig browseridentitet.
2. Bekreft at sourcemap/deobfuscation ikke eksponerer payload eller identifikatorer.
3. Bekreft at APM-/Feildrilldown-lenkene beholder valgt tidsrom.
4. Kjør privacy-canary for rå URL, user context, console capture og session replay før en flate markeres dekket.
