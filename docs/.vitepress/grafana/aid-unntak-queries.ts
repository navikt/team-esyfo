// Contract: syfo-oppfolgingsplan-frontend #1048. Every event follows an
// explicit opening in the same overview visit; these are not API results.
export const aidUnntakEventPipeline = `{service_name="syfo-oppfolgingsplan-frontend", kind="event"}
| logfmt app_namespace, app_environment, event_name, event_domain, event_data_schema_version, event_data_tiltakspakke, event_data_flate, event_data_gruppe, event_data_hendelse
| __error__=""
| app_namespace="team-esyfo"
| app_environment="\${env:text}"
| event_name="aid_unntaksvurdering"
| event_domain="aid"
| event_data_schema_version="1"
| event_data_tiltakspakke="OPPFOLGINGSPLAN_TILTAKSPAKKE_1"
| event_data_flate="oversikt_arbeidsgiver"
| event_data_gruppe="tiltak"
| event_data_hendelse=~"aapnet|send|lag_plan"
| label_format hendelse=event_data_hendelse
| keep hendelse`;

const count = (event: "aapnet" | "send" | "lag_plan") =>
	`sum(count_over_time(${aidUnntakEventPipeline}\n| hendelse="${event}"\n[$__auto]))`;

export const aidUnntakOpenedQuery = count("aapnet");
export const aidUnntakSendQuery = count("send");
export const aidUnntakPlanQuery = count("lag_plan");
