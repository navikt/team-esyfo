// Server JSON logs are separate from Faro events. Runtime cluster labels use
// dev/prod, while the existing dashboard datasource displays dev-gcp/prod-gcp.
export const aidServerPlanEventPipeline = `{service_namespace="team-esyfo", service_name="syfo-oppfolgingsplan-frontend", k8s_cluster_name=~"dev|prod"}
| label_format selected_environment=\`{{ .k8s_cluster_name }}-gcp\`
| selected_environment="\${env:text}"
| x_isFrontend!="true"
| json aid_event="event_type", aid_schema="schema_version", aid_package="tiltakspakke", aid_group="gruppe", aid_variant="variant", aid_form="skjemavariant", aid_reminder="evaluering_paaminnelse", forwarded_browser="x_isFrontend"
| __error__=""
| forwarded_browser!="true"
| aid_event="aid_plan_opprettet"
| aid_schema="1"
| aid_package="OPPFOLGINGSPLAN_TILTAKSPAKKE_1"
| aid_group=~"tiltak|kontroll|utenfor_scope|ukjent"
| label_format skjemavariant=\`{{ if ne .aid_form "" }}{{ .aid_form }}{{ else if eq .aid_variant "aid" }}tiltak{{ else if eq .aid_variant "standard" }}standard{{ end }}\`
| skjemavariant=~"tiltak|standard"
| aid_reminder=~"ja|nei"
| label_format gruppe=aid_group, evaluering_paaminnelse=aid_reminder
| keep gruppe, skjemavariant, evaluering_paaminnelse`;

export const aidServerPlanCreationsQuery = `sum by (gruppe, skjemavariant, evaluering_paaminnelse) (count_over_time(
${aidServerPlanEventPipeline}
[$__auto]))`;
