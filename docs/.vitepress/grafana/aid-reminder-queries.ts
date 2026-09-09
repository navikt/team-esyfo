export const AID_EVENT_NAME = "aid_paaminnelse";
export const AID_PACKAGE = "OPPFOLGINGSPLAN_TILTAKSPAKKE_1";

const eventSelector = '{service_name="dinesykmeldte", kind="event"}';
// Faro/Alloy serializes custom event attributes with the event_data_ prefix.
// Parse only the closed fields used here, never page URLs or session IDs.
export const aidEventPipeline = `${eventSelector}
| logfmt app_namespace, app_environment, event_name, event_domain, event_data_schema_version, event_data_tiltakspakke, event_data_flate, event_data_gruppe, event_data_variant, event_data_hendelse, event_data_paaminnelsevalg, event_data_utfall
| __error__=""
| app_namespace="team-esyfo"
| app_environment="\${env:text}"
| event_name="${AID_EVENT_NAME}"
| event_domain="aid"
| event_data_schema_version="1"
| event_data_tiltakspakke="${AID_PACKAGE}"
| event_data_flate="dinesykmeldte"
| event_data_gruppe=~"tiltak|kontroll|utenfor_scope|blandet|ukjent"
| event_data_variant=~"aid|skjult"
| event_data_hendelse=~"beslutning|vist|bestill|avbestill"
| event_data_paaminnelsevalg=~"bestilt|ikke_bestilt|ikke_tilbudt|ukjent"
| event_data_utfall=~"tilgjengelig|skjult|vurdering_mangler|status_feilet|forsok|bekreftet|feilet|ikke_bekreftet"
| label_format gruppe=event_data_gruppe, variant=event_data_variant, hendelse=event_data_hendelse, paaminnelsevalg=event_data_paaminnelsevalg, utfall=event_data_utfall
| keep gruppe, variant, hendelse, paaminnelsevalg, utfall`;

export const aidCount = (
	filter: string,
	groupBy = "gruppe",
	range = "$__auto",
) =>
	`sum by (${groupBy}) (count_over_time(${aidEventPipeline}\n${filter}\n[${range}]))`;
export const aidDecisionsQuery = aidCount(
	'| hendelse="beslutning"',
	"gruppe, variant, utfall",
);
export const aidViewsQuery = aidCount(
	'| hendelse="vist"',
	"gruppe, paaminnelsevalg",
);
export const aidActionsQuery = aidCount(
	'| hendelse=~"bestill|avbestill"',
	"gruppe, hendelse, paaminnelsevalg, utfall",
);
export const aidFailuresQuery = aidCount(
	'| utfall=~"vurdering_mangler|status_feilet|feilet|ikke_bekreftet"',
	"gruppe, hendelse, utfall",
);
