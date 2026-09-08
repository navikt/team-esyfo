// Contract: syfo-oppfolgingsplan-frontend #1039. Keep this separate from the
// reminder event: its variants, outcomes and reminder choice mean other things.
const planEventContext = `{service_name="syfo-oppfolgingsplan-frontend", kind="event"}
| logfmt app_namespace, app_environment, event_name, event_domain, event_data_schema_version, event_data_tiltakspakke, event_data_flate, event_data_gruppe, event_data_variant, event_data_hendelse, event_data_utfall, event_data_evaluering_paaminnelse
| __error__=""
| app_namespace="team-esyfo"
| app_environment="\${env:text}"
| event_name="aid_oppfolgingsplan"
| event_domain="aid"
| event_data_schema_version="1"
| event_data_tiltakspakke="OPPFOLGINGSPLAN_TILTAKSPAKKE_1"
| event_data_flate="ny_plan"
| event_data_gruppe=~"tiltak|kontroll|utenfor_scope|ukjent"
| event_data_variant=~"aid|standard"
| label_format gruppe=event_data_gruppe, variant=event_data_variant, hendelse=event_data_hendelse, utfall=event_data_utfall`;

export const aidPlanEventPipeline = `${planEventContext}
| keep gruppe, variant, hendelse, utfall`;

const planCount = (filter: string, groupBy: string, range = "$__auto") =>
	`sum by (${groupBy}) (count_over_time(${aidPlanEventPipeline}\n${filter}\n[${range}]))`;

export const aidPlanDecisionsQuery = planCount(
	'| hendelse="beslutning" | utfall="tilgjengelig"',
	"gruppe, variant",
);
export const aidPlanViewsQuery = planCount(
	'| hendelse="vist" | utfall="tilgjengelig"',
	"gruppe, variant",
);
export const aidPlanCreationsQuery = planCount(
	'| hendelse="opprett" | utfall=~"forsok|bekreftet|feilet"',
	"gruppe, variant, utfall",
);
export const aidPlanConfirmedTrendQuery = planCount(
	'| hendelse="opprett" | utfall="bekreftet"',
	"gruppe, variant",
	"1d",
);

// Additive v1 field from frontend #1041. Old events must remain in the totals;
// neither absent nor invalid values represent a submitted "nei".
export const aidPlanEvaluationQuery = `sum by (gruppe, variant, evaluering_paaminnelse, utfall) (count_over_time(${planEventContext}
| hendelse="opprett" | utfall=~"forsok|bekreftet|feilet"
| label_format evaluering_paaminnelse=\`{{ if eq .event_data_evaluering_paaminnelse "ja" }}ja{{ else if eq .event_data_evaluering_paaminnelse "nei" }}nei{{ else if eq .event_data_evaluering_paaminnelse "" }}ikke_registrert{{ else }}ugyldig{{ end }}\`
| keep gruppe, variant, evaluering_paaminnelse, utfall
[$__auto]))`;
