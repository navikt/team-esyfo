import { grafanaVariable } from "./dashboard-kit.ts";
import { lokiExploreDataLink } from "./runtime-links.ts";

// These are display fields, never indexed labels or additions to the stable
// error identity. Producers own their finite values and serialization tests.
const validated = (target: string, source: string, pattern: string) =>
	`| label_format ${target}=\`{{ if and .${source} (not (regexReplaceAll "${pattern}" .${source} "")) }}{{ .${source} }}{{ end }}\``;

export const diagnosticIdentifierPattern = "^[a-z][a-z0-9_.-]{0,79}$";
export const diagnosticExceptionPattern =
	"^([A-Za-z][A-Za-z0-9_.:$]{0,143})?(Error|Exception)$";
export const failureKindPattern =
	"^(dns|timeout|connection|tls|http|invalid_response|token|domain|configuration|unknown)$";

export const runtimeDiagnosticLabels = `| json upstream, upstream_status, failure_kind, failure_stage, cause_type, exception_type, outcome
| drop __error__, __error_details__
${validated("safe_upstream", "upstream", diagnosticIdentifierPattern)}
${validated("safe_upstream_status", "upstream_status", "^[1-5][0-9]{2}$")}
${validated("safe_failure_kind", "failure_kind", failureKindPattern)}
${validated("safe_failure_stage", "failure_stage", diagnosticIdentifierPattern)}
${validated("safe_cause_type", "cause_type", diagnosticExceptionPattern)}
${validated("safe_exception_type", "exception_type", diagnosticExceptionPattern)}
| label_format safe_cause_type=\`{{ if and (ne .safe_cause_type "UnknownException") (ne .safe_cause_type "UnknownError") (ne .safe_cause_type "Error") (ne .safe_cause_type "Exception") }}{{ .safe_cause_type }}{{ end }}\`
| label_format safe_exception_type=\`{{ if and (ne .safe_exception_type "UnknownException") (ne .safe_exception_type "UnknownError") (ne .safe_exception_type "Error") (ne .safe_exception_type "Exception") }}{{ .safe_exception_type }}{{ end }}\`
${validated("safe_outcome", "outcome", "^(failed|retrying|retry_exhausted|rejected|degraded|dead_lettered|skipped|stopped|adjusted)$")}
| label_format failure_explanation=\`{{ if eq .safe_failure_kind "dns" }}Tjenestenavnet kunne ikke slås opp{{ else if eq .safe_failure_kind "timeout" }}Kallet brukte for lang tid{{ else if eq .safe_failure_kind "connection" }}Forbindelsen feilet{{ else if eq .safe_failure_kind "tls" }}Sikker forbindelse feilet{{ else if eq .safe_failure_kind "invalid_response" }}Svaret kunne ikke tolkes{{ else if eq .safe_failure_kind "token" }}Tokenutvekslingen feilet{{ else if eq .safe_failure_kind "domain" }}Operasjonen ble avvist{{ else if eq .safe_failure_kind "configuration" }}Konfigurasjonen hindret operasjonen{{ else if .safe_upstream_status }}Tjenesten svarte HTTP {{ .safe_upstream_status }}{{ else if .safe_cause_type }}Feiltype: {{ .safe_cause_type }}{{ else if .safe_exception_type }}Feiltype: {{ .safe_exception_type }}{{ else }}Årsaken er ikke oppgitt i strukturerte felt{{ end }}\`
| label_format diagnostic_details=\`{{ .failure_explanation }}{{ if .safe_upstream }} · {{ .safe_upstream }}{{ end }}{{ if and .safe_upstream_status (ne .safe_failure_kind "http") (ne .safe_failure_kind "") (ne .safe_failure_kind "unknown") }} · HTTP {{ .safe_upstream_status }}{{ end }}{{ if .safe_failure_stage }} · fase: {{ .safe_failure_stage }}{{ end }}{{ if and .safe_cause_type (not (contains .safe_cause_type .failure_explanation)) }} · {{ .safe_cause_type }}{{ end }}{{ if .safe_outcome }} · utfall: {{ .safe_outcome }}{{ end }}\`
| label_format diagnostic_state=\`{{ if and .safe_upstream (or .safe_upstream_status (and .safe_failure_kind (ne .safe_failure_kind "unknown"))) }}Kaltjeneste og teknisk utfall{{ else if or .safe_upstream_status (and .safe_failure_kind (ne .safe_failure_kind "unknown")) .safe_cause_type .safe_exception_type }}Delvis teknisk forklaring{{ else }}Mangler teknisk forklaring{{ end }}\``;

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
