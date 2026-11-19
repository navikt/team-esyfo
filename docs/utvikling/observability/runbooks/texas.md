# Runbook: Texas og identitetstilbydere

Varselet `TexasUpstreamFailuresAcrossApps` går til `#esyfo-alarm` som ticket når minst tre apper i team-esyfo har fått endelige feil fra Texas mot samme identitetstilbyder de siste fem minuttene, og tilstanden har vart i to minutter. Labelen `identity_provider` i varselet viser hvilken tilbyder det gjelder: `tokenx`, `entra_id`, `maskinporten`, `idporten` eller `ansattporten`. Flere podder i samme app teller som én app, så én app med problemer utløser ikke varselet. Feiler flere tilbydere samtidig, kommer ett varsel per tilbyder. Regelen ligger i [`nais/alerts/texas.yaml`](https://github.com/navikt/team-esyfo/blob/main/nais/alerts/texas.yaml). Den er ikke en pager.

Texas er sidecaren som henter og veksler token for appen. TokenX driftes av Nais, Entra ID av Microsoft, og Maskinporten og ID-porten av Digdir. Vi kan sjelden rette feilen selv, men vi må vite hvilke apper og brukerflyter som rammes, og sørge for at Nais vet om det.

## Signalene

| Signal | Kilde | Betydning |
| --- | --- | --- |
| Endelig feil | `texas_handler_errors_total{error_kind="UpstreamFailure"}` per `identity_provider` | Texas fikk ikke et gyldig svar fra identitetstilbyderen: nettverksfeil eller timeout etter alle forsøk, eller et svar Texas ikke kunne lese. Appen fikk HTTP 500 og kunne ikke kalle tjenesten. Varselet bruker dette. |
| Nytt forsøk | INFO-logg `retrying upstream request` fra containeren `texas` | Ett forsøk feilet med nettverksfeil, timeout eller HTTP 5xx/408/429. Neste forsøk kan ha lyktes. Bare dashboard. |

Retry-loggen har ikke URL når upstream svarer med HTTP-feil. Retry-panelet viser derfor ikke hvilken identitetstilbyder et nytt forsøk gjaldt.

Varselet dekker ikke HTTP-feil fra identitetstilbyderen. Svarer tilbyderen med HTTP 5xx, 408 eller 429 også etter siste forsøk, teller Texas feilen som `error_kind="UpstreamOAuthError"` og sender samme statuskode videre til appen. Den feiltypen omfatter også 4xx-feil som ofte skyldes appen eller brukerens token, og metrikken har ingen statuskode. Derfor varsles den ikke.

## Bekreft signalet

1. Åpne Kontrollrommet og se panelene `Texas · feilede tokenkall per identitetstilbyder` og `Texas · nye forsøk mot identitetstilbyder` på Oversikt.
2. Bekreft hvilke apper som teller, og hvilke podder som har feil, i Metrics Explore:

   ```promql
   sum by (identity_provider, downstream_app_name, nais_pod_name) (
     increase(texas_handler_errors_total{app="texas", k8s_cluster_name="prod", downstream_app_namespace="team-esyfo", error_kind="UpstreamFailure"}[5m])
   )
   ```

   Spørringen viser bare økning innenfor vinduet. En pod som fikk sin første feil nylig, kan derfor mangle her selv om varselet teller appen.

3. Se feiltype og retries i Loki. Ikke kopier rå logglinjer til Slack eller GitHub:

   ```logql
   {service_namespace="team-esyfo", k8s_cluster_name="prod"} |= "retrying upstream request" | k8s_container_name="texas"
   ```

4. Skill:
   - Mange apper samtidig: sannsynlig feil hos identitetstilbyderen, i nettverket eller i Nais-plattformen.
   - Feil i bare én app, som vises i panelet uten å utløse varselet: sjekk appens egen konfigurasjon, nylig deploy og `accessPolicy`.
   - Retries uten `UpstreamFailure`: sjekk også `error_kind="UpstreamOAuthError"` for samme tilbyder. Øker den samtidig, svarer tilbyderen med HTTP-feil også etter siste forsøk. Øker den ikke, tok Texas seg inn igjen, og ingen tiltak er nødvendig.

## Avklar konsekvens

1. Velg berørte apper under `Undersøk en tjeneste` og se feilandel og loggfeil i samme tidsrom.
2. Avklar om feilene rammer brukerflyter (for eksempel innlogget visning hos arbeidsgiver eller sykmeldt) eller bare bakgrunnsjobber som prøver igjen.

## Tiltak

1. Sjekk Nais-status og `#nais` i Slack for kjente hendelser.
2. Sammenlign med Nais' felles Texas-dashboard: https://grafana.nav.cloud.nais.io/d/ae4lpwgogkt1ce/texas
3. Er feilen ikke kjent, meld den i `#nais` med identitetstilbyder, tidsrom, antall berørte apper og om feilen er nettverksfeil eller HTTP-feil. Ikke del tokens, brukerdata eller rå logger.
4. Ikke restart podder for å rette en feil hos identitetstilbyderen. Texas prøver igjen ved neste kall. En restart tømmer token-cachen og kan gi flere kall mot tilbyderen.

## Bevis recovery

- Ingen nye endelige feil i to påfølgende femminuttersvinduer.
- Retry-panelet er tilbake til vanlig nivå.
- Feilandelen i berørte apper er tilbake til vanlig nivå.

## Live-verifisering

Regelen er bygget på Texas' kildekode og ikke på observerte produksjonsdata. Før regelen føres i [alert-registeret](../alert-register) må en person bekrefte i Metrics Explore at:

- `texas_handler_errors_total` finnes for team-esyfo i prod, med labelene `app="texas"`, `downstream_app_namespace="team-esyfo"`, `downstream_app_name`, `k8s_cluster_name`, `identity_provider` og `error_kind`.
- PrometheusRule-ressursen `team-esyfo-texas-alerts` er lastet i prod-gcp.
- Texas-loggene i Loki har `k8s_container_name="texas"` og samme `service_name` som appen, slik retry-panelet forutsetter.

Mangler `downstream_app_name`, teller regelen alle apper som én, og varselet går aldri. Mangler `app` eller `downstream_app_namespace`, eller har de andre verdier, går varselet aldri.

Kjente grenser i regelen: Etter et innsamlingsavbrudd på over en time ser alle eksisterende feilserier nye ut i fem minutter, og varselet kan gå uten nye feil. Starter en container på nytt i samme pod og fortsetter en serie innen en time, kan første feil etter omstarten mangle. Får en eksisterende feilserie nye labeler, for eksempel etter en Texas-oppgradering, ser den også ny ut i fem minutter.
