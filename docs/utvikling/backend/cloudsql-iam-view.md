# Gi en IAM-servicekonto lesetilgang til et view i Cloud SQL

Når et annet team, for eksempel DVH, trenger lesetilgang til data i en av våre Cloud SQL Postgres-databaser, gir vi servicekontoen deres `SELECT` på ett view, og ingenting annet. Tilgangen er uten passord: den bruker [Cloud SQL IAM database authentication](https://docs.knada.io/analyse/eksempler/#cloud-sql-iam-database-authentication), så ingen hemmelighet skal i GSM.

Eksempel: `afterMigrate.sql` i syfomotebehov, med viewet `MOTEBEHOV_DVH` ([navikt/syfomotebehov#807](https://github.com/navikt/syfomotebehov/pull/807)).

## Hvorfor en smal grant på et view

Knada-dokumentasjonen foreslår `GRANT SELECT ON ALL TABLES IN SCHEMA public TO cloudsqliamserviceaccount`. Det gir **alle** IAM-servicekontoer på instansen lesetilgang til **alle** tabeller, også fremtidige. Vi gir i stedet én navngitt bruker `SELECT` på ett view:

- **Dataminimering:** konsumenten ser bare kolonnene og radene viewet eksponerer.
- **Personvern:** tabellene våre kan inneholde helseopplysninger og fødselsnumre. Det som ikke er med i viewet, kan ikke lekke.
- **Bevisst databehov:** analytikerne må avklare med oss hva de faktisk trenger før viewet utvides, i stedet for å hente det de finner.
- **Enkel revisjon:** tilgangen står i koden og kan trekkes tilbake for én bruker.

Et view leser de underliggende tabellene med eierens rettigheter (appbrukeren), så konsumenten trenger ingen grants på tabellene.

## 1. Variabler

```bash
# Dev: team-esyfo-dev-c0de. Finn prod-prosjektet med:
#   gcloud projects list --filter="projectId:team-esyfo-prod*"
PROJECT=team-esyfo-dev-c0de
INSTANCE=syfomotebehov
SA_EMAIL=navn@prosjekt.iam.gserviceaccount.com   # full e-post fra konsumenten

# Databasebrukeren er e-posten uten ".gserviceaccount.com" (Postgres har maks 63 tegn)
DB_USER="${SA_EMAIL%.gserviceaccount.com}"
echo "$DB_USER"
```

## 2. Gi IAM-roller i prosjektet

Servicekontoen trenger `Cloud SQL Client` og `Cloud SQL Instance User` i prosjektet som eier instansen.

```bash
for ROLE in roles/cloudsql.client roles/cloudsql.instanceUser; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$ROLE" \
    --condition=None
done
```

`--condition=None` er påkrevd fordi team-prosjektene allerede har betingede bindinger.

## 3. Legg til IAM-brukeren på Cloud SQL-instansen

```bash
gcloud sql users create "$DB_USER" \
  --instance="$INSTANCE" \
  --type=cloud_iam_service_account \
  --project="$PROJECT"

# Kontroller
gcloud sql users list --instance="$INSTANCE" --project="$PROJECT" \
  --filter="type=CLOUD_IAM_SERVICE_ACCOUNT"
```

Nais CLI har ingen kommando for dette; `nais postgres` lager passordbrukere eller gir tilgang til personlige brukere.

## 4. Grant med guard i Flyway

Legg granten i `afterMigrate.sql`, ikke i en versjonert migrering. `afterMigrate` kjøres etter hver migrering, så tilgangen kommer tilbake automatisk hvis viewet en gang blir droppet og laget på nytt (`DROP VIEW` fjerner grants; `CREATE OR REPLACE VIEW` beholder dem).

Velg bruker per miljø med Nais-variabelen `NAIS_CLUSTER_NAME` (`dev-gcp` eller `prod-gcp`). Flyway erstatter `${navn}` i SQL-filene med verdien til en placeholder, så appen må sende variabelen inn som placeholder. Bruk `local` som standardverdi, slik at lokal kjøring og tester ikke gir noen grant.

### Ktor

> **Merk:** Ktor-oppsettet er ikke testet i Nais-miljøene ennå. Bare Spring Boot-varianten er verifisert i dev (syfomotebehov). Sjekk første deploy i dev med verifiseringsspørringene i steg 5.

Send placeholderen inn der Flyway konfigureres:

```kotlin
Flyway.configure()
    .dataSource(dataSource)
    .placeholders(
        mapOf("naisCluster" to (System.getenv("NAIS_CLUSTER_NAME") ?: "local")),
    )
    .load()
    .migrate()
```

Leser appen konfigurasjon fra `application.conf`, kan verdien gå via HOCON i stedet:

```hocon
database {
  naisCluster = "local"
  naisCluster = ${?NAIS_CLUSTER_NAME}
}
```

```kotlin
val naisCluster = environment.config.property("database.naisCluster").getString()
Flyway.configure()
    .dataSource(dataSource)
    .placeholders(mapOf("naisCluster" to naisCluster))
    .load()
    .migrate()
```

Begge variantene gir `local` når variabelen mangler, så testene trenger ikke noe oppsett. Vil du teste dev-granten, sett placeholderen eksplisitt i testen (se `DvhGrantMigrationTest` i syfomotebehov).

### Spring Boot

Spring sender `spring.flyway.placeholders.*` videre til Flyway. I `src/main/resources/application.yaml`:

```yaml
spring:
  flyway:
    placeholders:
      naisCluster: ${NAIS_CLUSTER_NAME:local}
```

Har testene egen `application.yaml`, legg inn `naisCluster: local` der også.

### Fallgruver

- Placeholder-erstatning gjelder **alle** SQL-filene. En `${...}` uten definert placeholder stopper migreringen med `No value provided for placeholder`.
- Inne i `DO $$ ... $$` erstattes placeholderen før Postgres ser koden, så `'${naisCluster}'` blir en vanlig strengliteral.
- Ikke sett placeholderen fra noe brukeren kan påvirke. Verdien limes rett inn i SQL-en.

### SQL

`src/main/resources/db/migration/afterMigrate.sql`:

```sql
DO $$
DECLARE
  view_user text := CASE '${naisCluster}'
    WHEN 'dev-gcp'  THEN 'dev-bruker@prosjekt.iam'
    WHEN 'prod-gcp' THEN 'prod-bruker@prosjekt.iam'
  END;
BEGIN
  IF view_user IS NULL THEN
    RETURN; -- lokalt og i tester
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = view_user) THEN
    RAISE NOTICE 'not granting view access -- role % does not exist', view_user;
    RETURN; -- appen skal starte selv om steg 3 ikke er gjort ennå
  END IF;
  EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', view_user);
  EXECUTE format('GRANT SELECT ON MITT_VIEW TO %I', view_user);
END
$$;
```

- Guarden hindrer at appen feiler ved oppstart når rollen mangler (Testcontainers, eller et miljø der steg 3 ikke er gjort).
- `REVOKE ALL` først sørger for at brukeren bare har tilgang til viewet, selv om noen har gitt mer manuelt.
- Rekkefølgen er valgfri: deployer du før steg 3, gir neste deploy tilgang.

## 5. Verifiser tilgangen

Kjør som en bruker med innsyn i katalogen, for eksempel din personlige IAM-bruker.

```sql
-- Finnes rollen, og er den en IAM-servicekonto?
SELECT r.rolname, m.rolname AS member_of
FROM pg_roles r
LEFT JOIN pg_auth_members am ON am.member = r.oid
LEFT JOIN pg_roles m ON m.oid = am.roleid
WHERE r.rolname = 'dev-bruker@prosjekt.iam';
-- Forventet: member_of = cloudsqliamserviceaccount

-- Hvilke tabeller/views har brukeren tilgang til?
SELECT c.relname, c.relkind, a.privilege_type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace,
     aclexplode(c.relacl) a
JOIN pg_roles g ON g.oid = a.grantee
WHERE n.nspname = 'public'
  AND g.rolname = 'dev-bruker@prosjekt.iam';
-- Forventet: én rad, MITT_VIEW (relkind v), SELECT

-- Stikkprøve
SELECT has_table_privilege('dev-bruker@prosjekt.iam', 'mitt_view', 'SELECT')    AS view_ok,
       has_table_privilege('dev-bruker@prosjekt.iam', 'en_tabell', 'SELECT')    AS tabell_skal_vaere_false;
```

Ikke bruk `information_schema.role_table_grants` til dette. Viewet viser bare grants som involverer rollene til brukeren som spør, så andre brukere er usynlige.

## 6. DVH og Union: nettverk og tilkobling

DVH kobler til fra Union. Konsumenten må sørge for at de kan nå databasen vår derfra; se konfigurasjonen i [sykefravar-orkestrering, `.github/union/utsa-dev.yaml`](https://github.com/navikt/sykefravar-orkestrering/blob/motebehov_migrering/.github/union/utsa-dev.yaml#L18). De trenger:

- Instansens **public IP**, som må kunne nås fra Union.
- **Connection name** (`prosjekt:region:instans`) til Cloud SQL Python Connector.
- Databasenavn og IAM-brukernavnet (uten `.gserviceaccount.com`).
- Riktig GCP-prosjekt: dev og prod er ulike prosjekter.

```bash
# Public IP
gcloud sql instances describe "$INSTANCE" --project="$PROJECT" --format=json \
  | jq -r '.ipAddresses[] | select(.type=="PRIMARY") | .ipAddress'

# Connection name
gcloud sql instances describe "$INSTANCE" --project="$PROJECT" \
  --format="value(connectionName)"

# Alle instanser i prosjektet med IP
gcloud sql instances list --project="$PROJECT" \
  --format="table(name,connectionName,ipAddresses[0].ipAddress)"
```

Public IP og connection name vises også i Cloud Console under **SQL → instansen → Overview** (Connect to this instance).

Koblingseksempel med Python: [knada-dokumentasjonen](https://docs.knada.io/analyse/eksempler/#cloud-sql-iam-database-authentication), avsnittet «Lese med service account».

## 7. Fjerne en IAM-bruker

`gcloud sql users delete` feiler så lenge brukeren har grants (avhengigheter). Fjern dem først.

1. Trekk tilbake tilgangen. Bare grantor eller eier (appbrukeren) kan gjøre det; som en annen bruker gir `REVOKE` bare advarselen `no privileges could be revoked`. Enklest er en guardet blokk som kjøres av Flyway (versjonert migrering, eller midlertidig i `afterMigrate.sql`):

   ```sql
   DO $$
   BEGIN
     IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gammel-bruker@prosjekt.iam') THEN
       REVOKE ALL ON ALL TABLES IN SCHEMA public FROM "gammel-bruker@prosjekt.iam";
     END IF;
   END
   $$;
   ```

   Fjern også brukeren fra `CASE`-en i steg 4, ellers gir neste deploy tilgangen tilbake.

2. Kontroller med `relacl`-spørringen i steg 5 at det ikke er rader igjen.
3. Slett brukeren og IAM-rollene:

   ```bash
   gcloud sql users delete "$DB_USER" --instance="$INSTANCE" --project="$PROJECT"

   for ROLE in roles/cloudsql.client roles/cloudsql.instanceUser; do
     gcloud projects remove-iam-policy-binding "$PROJECT" \
       --member="serviceAccount:$SA_EMAIL" \
       --role="$ROLE" \
       --condition=None
   done
   ```

## 8. Feilsøking

| Symptom | Årsak | Løsning |
|---|---|---|
| `User name ... is too long (max 63)` | Full e-post er brukt som databasebruker | Bruk `$DB_USER` uten `.gserviceaccount.com` |
| `The policy contains bindings with conditions ... specify a condition` | Prosjektet har betingede IAM-bindinger | Legg til `--condition=None` |
| `SELECT 1 FROM pg_roles WHERE rolname = '...'` gir 0 rader etter deploy | IAM-brukeren er ikke lagt til på instansen (steg 3); guarden hoppet over granten | Gjør steg 3 og deploy på nytt (eller restart appen) |
| `role_table_grants` viser bare `cloudsqliamuser` | Viewet viser bare dine egne roller | Bruk spørringene i steg 5 |
| Tester feiler etter grant til `cloudsqliamserviceaccount` | Rollen finnes bare i Cloud SQL, ikke i Testcontainers-Postgres | Bruk smal grant med guard (steg 4) |
| Konsumenten får ikke koblet til, selv om grants ser riktige ut | Kobler mot feil GCP-prosjekt/instans (dev vs. prod) | Sjekk connection name (steg 6) |
| `gcloud sql users delete` feiler på grunn av avhengigheter | Brukeren har fortsatt grants | Se steg 7 |
| `REVOKE` gir `no privileges could be revoked` | Kjørt som en annen bruker enn grantor | Kjør som appbrukeren, for eksempel via Flyway |
| Tilgangen forsvant etter en endring av viewet | Viewet ble droppet og laget på nytt | Ligger granten i `afterMigrate.sql`, kommer den tilbake ved neste deploy |
