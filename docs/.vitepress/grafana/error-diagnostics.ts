import { grafanaVariable } from "./dashboard-kit.ts";
import { lokiExploreDataLink } from "./runtime-links.ts";

// These are display fields, never indexed labels or additions to the stable
// error identity. Producers own their finite values and serialization tests.
const validated = (target: string, source: string, pattern: string) =>
	`| label_format ${target}=\`{{ if and .${source} (not (regexReplaceAll "${pattern}" .${source} "")) }}{{ .${source} }}{{ end }}\``;

// Show source facts without classifying a root cause or adding grouping dimensions.
export const runtimeErrorDetailsLabels = `| json upstream, upstream_status, cause_type, exception_type, sql_state, task_name
| drop __error__, __error_details__
${validated("safe_upstream", "upstream", "^[a-z][a-z0-9_.-]{0,79}$")}
${validated("safe_upstream_status", "upstream_status", "^[1-5][0-9]{2}$")}
${validated("safe_cause_type", "cause_type", "^([A-Za-z][A-Za-z0-9_.:$]{0,143})?(Error|Exception)$")}
${validated("safe_exception_type", "exception_type", "^([A-Za-z][A-Za-z0-9_.:$]{0,143})?(Error|Exception)$")}
${validated("safe_sql_state", "sql_state", "^[0-9A-Z]{5}$")}
${validated("safe_task_name", "task_name", "^[A-Za-z][A-Za-z0-9_.$]{0,159}$")}
| label_format error_details=\`{{ if .safe_upstream }}{{ .safe_upstream }} · {{ end }}{{ if .safe_upstream_status }}HTTP {{ .safe_upstream_status }} · {{ end }}{{ if .safe_exception_type }}{{ .safe_exception_type }} · {{ end }}{{ if and .safe_cause_type (ne .safe_cause_type .safe_exception_type) }}Årsakstype: {{ .safe_cause_type }} · {{ end }}{{ if .safe_sql_state }}SQLState {{ .safe_sql_state }} · {{ end }}{{ if .safe_task_name }}Jobb: {{ .safe_task_name }} · {{ end }}\`
| label_format error_details=\`{{ if .error_details }}{{ trimSuffix " · " .error_details }}{{ else }}Ingen tekniske felt oppgitt – se rålogger{{ end }}\``;

// Generate a bounded window from Loki's event timestamp, not the browser's
// current time. Milliseconds are required by the Grafana Explore URL schema.
export const runtimeContextLabels = `| label_format context_from=\`{{ mul (sub (unixEpoch (__timestamp__)) 120) 1000 }}\`, context_to=\`{{ mul (add (unixEpoch (__timestamp__)) 120) 1000 }}\``;

const environment = grafanaVariable("runtime_environment:raw");
const row = (name: string) => grafanaVariable(`__data.fields["${name}"]`);

export const runtimeTraceLogsDataLink = (traceId = row("safe_trace_id")) =>
	lokiExploreDataLink(
		`{service_namespace="team-esyfo", k8s_cluster_name="${environment}"}
| json trace_id
| trace_id=\`${traceId}\`
| trace_id=~\`^[a-fA-F0-9]{32}$\`
| trace_id!="00000000000000000000000000000000"
| drop __error__, __error_details__`,
	);

export const runtimeEventContextDataLink = () =>
	lokiExploreDataLink(
		`{service_namespace="team-esyfo", k8s_cluster_name="${environment}", service_name="${row("service_name")}"}`,
		{ from: row("context_from"), to: row("context_to") },
	);
