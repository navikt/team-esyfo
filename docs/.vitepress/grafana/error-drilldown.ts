import {
	activeApplicationIds,
	runtimeInventory,
} from "../runtime/inventory.ts";
import type { Application } from "../runtime/model.ts";
import {
	dataLink,
	GRAFANA_VERSION,
	type GrafanaDashboardResource,
	grafanaVariable,
	LOKI_DATASOURCE_UID,
	layoutItem,
	PROD_TEMPO_DATASOURCE_UID,
	TEAM_ESYFO_DASHBOARD_FOLDER_UID,
} from "./dashboard-kit.ts";
import { apmDataLink, runtimeLogsDataLink } from "./runtime-links.ts";
import {
	runtimeErrorPipeline,
	runtimeRejectionPipeline,
} from "./runtime-logql.ts";

export {
	DEV_TEMPO_DATASOURCE_UID,
	LOKI_DATASOURCE_UID,
	PROD_TEMPO_DATASOURCE_UID,
	TEMPO_DATASOURCE_UID,
} from "./dashboard-kit.ts";

export const ERROR_DASHBOARD_UID = "team-esyfo-feiloversikt";
export const ERROR_DASHBOARD_FOLDER_UID = TEAM_ESYFO_DASHBOARD_FOLDER_UID;
export const RECENT_RUNTIME_EVENT_LIMIT = 100;
const APP_VARIABLE = grafanaVariable("app:regex");
const BROWSER_APP_VARIABLE = grafanaVariable("browser_app:regex");
const BROWSER_ENVIRONMENT_VARIABLE = grafanaVariable("browser_environment:raw");
const RUNTIME_ENVIRONMENT_REGEX = grafanaVariable("runtime_environment:regex");
const RUNTIME_ENVIRONMENT_RAW = grafanaVariable("runtime_environment:raw");
const TEMPO_DATASOURCE_VARIABLE = grafanaVariable("tempo_datasource:raw");
const FROM = grafanaVariable("__from");
const TO = grafanaVariable("__to");
const ROW_VALUE = grafanaVariable("__value.raw");
const ROW_SERVICE = grafanaVariable('__data.fields["service_name"]');
const ROW_ERROR_TYPE = grafanaVariable('__data.fields["error_type_display"]');
const ROW_ERROR_CODE = grafanaVariable('__data.fields["error_code_display"]');
const ROW_OPERATION = grafanaVariable('__data.fields["operation_display"]');
const ROW_LEVEL = grafanaVariable('__data.fields["error_level"]');
const ROW_REJECTION_REASON = grafanaVariable(
	'__data.fields["rejection_reason_display"]',
);
const ROW_CONTRACT_GAP = grafanaVariable(
	'__data.fields["contract_state_display"]',
);
const ROW_BROWSER_TYPE = grafanaVariable(
	'__data.fields["browser_type_display"]',
);
const ROW_BROWSER_ENVIRONMENT = grafanaVariable(
	'__data.fields["browser_environment_display"]',
);

export const dashboardApplications = runtimeInventory.applications.filter(
	({ id }) => activeApplicationIds.has(id),
);

const currentApplicationIds = new Set(
	dashboardApplications.map(({ id }) => id),
);

export const dashboardBrowserSurfaces = runtimeInventory.browserSurfaces.filter(
	({ runtimeRef }) => currentApplicationIds.has(runtimeRef),
);

export const configuredBrowserServices = [
	...new Set(
		dashboardBrowserSurfaces
			.filter(
				({ currentImplementation }) =>
					currentImplementation.state === "configured",
			)
			.map(({ browserIdentity }) => browserIdentity.serviceName),
	),
];

export const missingBrowserServices = dashboardBrowserSurfaces
	.filter(
		({ currentImplementation }) => currentImplementation.state === "missing",
	)
	.map(({ browserIdentity }) => browserIdentity.serviceName);

const lifecycleLabel = (application: Application) => {
	switch (application.lifecycle.state) {
		case "migrating":
			return `${application.displayName} [migrering]`;
		case "retiring":
			return `${application.displayName} [utfasing]`;
		default:
			return application.displayName;
	}
};

export const dashboardApplicationOptions = dashboardApplications.map(
	(application) => ({
		text: lifecycleLabel(application),
		value: application.runtime.name,
	}),
);

export const dashboardBrowserOptions = configuredBrowserServices.map(
	(service) => ({ text: service, value: service }),
);

const escapeLogqlRegex = (value: string) =>
	value.replace(/[\\.^$|?*+()[\]{}]/g, "\\$&");

const inventoryRegex = (values: string[]) =>
	`^(${values.map(escapeLogqlRegex).join("|")})$`;

export const dashboardApplicationRegex = inventoryRegex(
	dashboardApplicationOptions.map(({ value }) => value),
);
export const dashboardBrowserRegex = inventoryRegex(configuredBrowserServices);

export const runtimeEnvironmentOptions = [
	{ text: "prod-gcp", value: "prod" },
	{ text: "dev-gcp", value: "dev" },
];

const runtimeSelector = `{service_namespace="team-esyfo", k8s_cluster_name=~"^${RUNTIME_ENVIRONMENT_REGEX}$", service_name=~"${APP_VARIABLE}"}`;
const browserSelector = `{kind="exception", service_name=~"${BROWSER_APP_VARIABLE}"}`;

export const runtimeTrendQuery = `sum(rate(${runtimeSelector}
${runtimeErrorPipeline}
| keep service_name
[$__auto])) * 60`;

export const runtimeByServiceQuery = `sort_desc(sum by(service_name) (count_over_time(${runtimeSelector}
${runtimeErrorPipeline}
| keep service_name
[$__auto])))`;

const runtimeSignatureParser = `| json event_type, event, error_code, code, feilkode, runtime_type="type", status, operation, top_exception_type="exception_type", nested_exception_type="exception.type", top_error_type="error_type", nested_error_type="error.type", top_err_type="err_type", nested_err_type="err.type"`;
const runtimeTraceParser = `| json event_type, event, error_code, code, feilkode, runtime_type="type", status, operation, upstream_status, trace_id, top_exception_type="exception_type", nested_exception_type="exception.type", top_error_type="error_type", nested_error_type="error.type", top_err_type="err_type", nested_err_type="err.type"`;

export const safeEventTypePattern = "^[a-z][a-z0-9_.-]{0,79}$";
export const safeGenericErrorTypePattern =
	"^([A-Za-z][A-Za-z0-9_.:$]{0,143})?(Error|Exception)$";
export const safeCodePattern = "^([A-Z][A-Z0-9_]{1,79}|[1-5][0-9]{2})$";
// Loki stringifies extracted JSON scalars. Producer tests enforce the number type;
// this pattern keeps only the allowed integer range in the operator view.
export const safeUpstreamStatusPattern = "^[1-5][0-9]{2}$";
const safeGenericTypeAsCodePattern = "^[A-Z][A-Z0-9_]{1,79}$";
const safeErrorStatusPattern = "^[45][0-9]{2}$";
const safeTraceIdPattern = "^[A-Fa-f0-9]{32}$";
export const safeBrowserTypePattern =
	"^(Error|TypeError|RangeError|ReferenceError|SyntaxError|URIError|EvalError|AggregateError|AbortError|DOMException|NetworkError|SecurityError|NotFoundError|NotAllowedError|DataCloneError|InvalidStateError|QuotaExceededError|TimeoutError|UnknownError|UnhandledRejection)$";

const safeLabel = (target: string, source: string, pattern: string) =>
	`| label_format ${target}=\`{{ if and .${source} (not (regexReplaceAll "${pattern}" .${source} "")) }}{{ .${source} }}{{ end }}\``;

const runtimeSignatureLabels = `| drop __error__, __error_details__
${safeLabel("safe_event_type", "event_type", safeEventTypePattern)}
${safeLabel("safe_event", "event", safeEventTypePattern)}
${safeLabel(
	"safe_top_exception_type",
	"top_exception_type",
	safeGenericErrorTypePattern,
)}
${safeLabel(
	"safe_nested_exception_type",
	"nested_exception_type",
	safeGenericErrorTypePattern,
)}
${safeLabel(
	"safe_top_error_type",
	"top_error_type",
	safeGenericErrorTypePattern,
)}
${safeLabel(
	"safe_nested_error_type",
	"nested_error_type",
	safeGenericErrorTypePattern,
)}
${safeLabel("safe_top_err_type", "top_err_type", safeGenericErrorTypePattern)}
${safeLabel(
	"safe_nested_err_type",
	"nested_err_type",
	safeGenericErrorTypePattern,
)}
${safeLabel(
	"safe_runtime_error_type",
	"runtime_type",
	safeGenericErrorTypePattern,
)}
${safeLabel("safe_error_code", "error_code", safeCodePattern)}
${safeLabel("safe_code", "code", safeCodePattern)}
${safeLabel("safe_feilkode", "feilkode", safeCodePattern)}
${safeLabel(
	"safe_runtime_type_code",
	"runtime_type",
	safeGenericTypeAsCodePattern,
)}
${safeLabel("safe_status", "status", safeErrorStatusPattern)}
${safeLabel("safe_operation", "operation", safeEventTypePattern)}
| label_format error_type_display=\`{{ if .safe_event_type }}{{ .safe_event_type }}{{ else if .safe_event }}{{ .safe_event }}{{ else if .safe_top_exception_type }}{{ .safe_top_exception_type }}{{ else if .safe_nested_exception_type }}{{ .safe_nested_exception_type }}{{ else if .safe_top_error_type }}{{ .safe_top_error_type }}{{ else if .safe_nested_error_type }}{{ .safe_nested_error_type }}{{ else if .safe_top_err_type }}{{ .safe_top_err_type }}{{ else if .safe_nested_err_type }}{{ .safe_nested_err_type }}{{ else if .safe_runtime_error_type }}{{ .safe_runtime_error_type }}{{ else }}Ikke oppgitt av appen{{ end }}\`
| label_format error_code_display=\`{{ if .safe_error_code }}{{ .safe_error_code }}{{ else if .safe_code }}{{ .safe_code }}{{ else if .safe_feilkode }}{{ .safe_feilkode }}{{ else if .safe_runtime_type_code }}{{ .safe_runtime_type_code }}{{ else if .safe_status }}{{ .safe_status }}{{ else }}—{{ end }}\`
| label_format operation_display=\`{{ if .safe_operation }}{{ .safe_operation }}{{ else }}—{{ end }}\`
| label_format contract_state=\`{{ if .safe_event_type }}canonical{{ else if .event_type }}rejected{{ else if or .safe_event .safe_top_exception_type .safe_nested_exception_type .safe_top_error_type .safe_nested_error_type .safe_top_err_type .safe_nested_err_type .safe_runtime_error_type }}legacy_type{{ else if or .event .top_exception_type .nested_exception_type .top_error_type .nested_error_type .top_err_type .nested_err_type .runtime_type }}rejected{{ else }}missing{{ end }}\`
| label_format contract_state_display=\`{{ if eq .contract_state "canonical" }}Kanonisk feiltype{{ else if eq .contract_state "legacy_type" }}Eldre typefelt{{ else if eq .contract_state "rejected" }}Avvist format{{ else }}Ikke oppgitt av appen{{ end }}\``;

const runtimeTraceLabels = `${runtimeSignatureLabels}
${safeLabel(
	"safe_upstream_status",
	"upstream_status",
	safeUpstreamStatusPattern,
)}
${safeLabel("safe_trace_id", "trace_id", safeTraceIdPattern)}
| label_format upstream_status_display=\`{{ if .safe_upstream_status }}{{ .safe_upstream_status }}{{ else }}—{{ end }}\`
| label_format error_context=\`{{ .operation_display }}\``;

const browserTypePipeline = `| logfmt type, app_namespace, app_environment
| label_format browser_parse_error=\`{{ .__error__ }}\`
| drop __error__, __error_details__
| app_namespace="" or app_namespace="team-esyfo"
| label_format browser_environment_display=\`{{ if and (eq .browser_parse_error "") (eq .app_namespace "team-esyfo") (or (eq .app_environment "prod-gcp") (eq .app_environment "dev-gcp")) }}{{ .app_environment }}{{ else }}ukjent{{ end }}\`
${safeLabel("safe_browser_type", "type", safeBrowserTypePattern)}
| label_format browser_type_display=\`{{ if .safe_browser_type }}{{ .safe_browser_type }}{{ else }}Annen / ikke oppgitt{{ end }}\``;

const runtimeLevelLabel =
	"| label_format error_level=`{{ .detected_level | lower }}`";

export const runtimeByClassificationQuery = `topk by(error_level) (25, sum by(error_level, service_name, error_type_display, error_code_display, operation_display, action) (count_over_time(${runtimeSelector}
${runtimeErrorPipeline}
${runtimeSignatureParser}
${runtimeSignatureLabels}
${runtimeLevelLabel}
| label_format action=\`Undersøk\`
| keep error_level, service_name, error_type_display, error_code_display, operation_display, action
[$__auto])))`;

export const runtimeContractGapQuery = `sum by(service_name, contract_state_display, action) (count_over_time(${runtimeSelector}
${runtimeErrorPipeline}
${runtimeSignatureParser}
${runtimeSignatureLabels}
| contract_state!="canonical"
| label_format action=\`Undersøk\`
| keep service_name, contract_state_display, action
[$__auto]))`;

const runtimeRejectionLabels = `| json operation, error_code, rejection_reason
| drop __error__, __error_details__
${safeLabel("safe_operation", "operation", safeEventTypePattern)}
${safeLabel("safe_error_code", "error_code", safeCodePattern)}
${safeLabel("safe_rejection_reason", "rejection_reason", safeGenericTypeAsCodePattern)}
| label_format operation_display=\`{{ if .safe_operation }}{{ .safe_operation }}{{ else }}—{{ end }}\`
| label_format error_code_display=\`{{ if .safe_error_code }}{{ .safe_error_code }}{{ else }}—{{ end }}\`
| label_format rejection_reason_display=\`{{ if .safe_rejection_reason }}{{ .safe_rejection_reason }}{{ else }}UNSPECIFIED{{ end }}\``;

export const runtimeRejectionsQuery = `topk(50, sum by(service_name, operation_display, error_code_display, rejection_reason_display, action) (count_over_time(${runtimeSelector}
${runtimeRejectionPipeline}
${runtimeRejectionLabels}
| label_format action=\`Undersøk\`
| keep service_name, operation_display, error_code_display, rejection_reason_display, action
[$__auto])))`;

export const browserByTypeQuery = `topk(50, sum by(service_name, browser_environment_display, browser_type_display, action) (count_over_time(${browserSelector}
${browserTypePipeline}
| browser_environment_display=~"${BROWSER_ENVIRONMENT_VARIABLE}"
| label_format action=\`Undersøk\`
| keep service_name, browser_environment_display, browser_type_display, action
[$__auto])))`;

export const tracedRuntimeErrorsQuery = `${runtimeSelector}
${runtimeErrorPipeline}
${runtimeTraceParser}
${runtimeTraceLabels}
| safe_trace_id!=""
| safe_trace_id!="00000000000000000000000000000000"
| line_format \`{{ .error_type_display }}\`
| keep service_name, error_type_display, error_code_display, error_context, upstream_status_display, safe_trace_id
| drop __error__, __error_details__`;

export const traceDataLink = (traceId: string) =>
	`/a/grafana-exploretraces-app/explore?from=${FROM}&to=${TO}&var-ds=${TEMPO_DATASOURCE_VARIABLE}&traceId=${traceId}`;

const encodeExploreState = (value: unknown) => {
	const variables: string[] = [];
	const withTokens = JSON.stringify(value, (_key, child) => {
		if (typeof child !== "string") return child;
		return child.replace(/\$\{[^}]+\}/g, (variable) => {
			const token = `__GRAFANA_VARIABLE_${variables.length}__`;
			variables.push(variable);
			return token;
		});
	});
	return variables.reduce(
		(encoded, variable, index) =>
			encoded.replace(`__GRAFANA_VARIABLE_${index}__`, variable),
		encodeURIComponent(withTokens),
	);
};

const lokiExploreDataLink = (expr: string) => {
	const panes = {
		A: {
			datasource: LOKI_DATASOURCE_UID,
			queries: [
				{
					datasource: { type: "loki", uid: LOKI_DATASOURCE_UID },
					direction: "backward",
					editorMode: "code",
					expr,
					queryType: "range",
					refId: "A",
				},
			],
			range: { from: FROM, to: TO },
		},
	};
	return `/explore?panes=${encodeExploreState(panes)}&schemaVersion=1&orgId=1`;
};

const runtimeRowSelector = `{service_namespace="team-esyfo", k8s_cluster_name=~"^${RUNTIME_ENVIRONMENT_REGEX}$", service_name="${ROW_SERVICE}"}`;

export const runtimeErrorGroupDataLink = () =>
	lokiExploreDataLink(`${runtimeRowSelector}
${runtimeErrorPipeline}
${runtimeSignatureParser}
${runtimeSignatureLabels}
${runtimeLevelLabel}
| error_type_display=\`${ROW_ERROR_TYPE}\`
| error_code_display=\`${ROW_ERROR_CODE}\`
| operation_display=\`${ROW_OPERATION}\`
| error_level=\`${ROW_LEVEL}\``);

export const runtimeContractGapDataLink = () =>
	lokiExploreDataLink(`${runtimeRowSelector}
${runtimeErrorPipeline}
${runtimeSignatureParser}
${runtimeSignatureLabels}
| contract_state_display=\`${ROW_CONTRACT_GAP}\``);

export const runtimeRejectionDataLink = () =>
	lokiExploreDataLink(`${runtimeRowSelector}
${runtimeRejectionPipeline}
${runtimeRejectionLabels}
| operation_display=\`${ROW_OPERATION}\`
| error_code_display=\`${ROW_ERROR_CODE}\`
| rejection_reason_display=\`${ROW_REJECTION_REASON}\``);

export const runtimeRejectionScopeDataLink = (serviceRegex: string) =>
	lokiExploreDataLink(`{service_namespace="team-esyfo", k8s_cluster_name="prod", service_name=~"${serviceRegex}"}
${runtimeRejectionPipeline}`);

export const browserErrorGroupDataLink = () =>
	lokiExploreDataLink(`{kind="exception", service_name="${ROW_SERVICE}"}
${browserTypePipeline}
| browser_environment_display=\`${ROW_BROWSER_ENVIRONMENT}\`
| browser_type_display=\`${ROW_BROWSER_TYPE}\``);

const runtimePanelLinks = () => [
	dataLink(
		"Runtime-feilkontrakt",
		"https://navikt.github.io/team-esyfo/utvikling/observability/runtime-feilkontrakt",
	),
	dataLink(
		"HTTP/runtime-runbook",
		"https://navikt.github.io/team-esyfo/utvikling/observability/runbooks/http-runtime",
	),
];

const runtimeServiceLinks = (service: string) => [
	dataLink(
		"Alle tjenestelogger",
		runtimeLogsDataLink(service, RUNTIME_ENVIRONMENT_RAW),
	),
	dataLink(
		"Feil i APM",
		apmDataLink(service, RUNTIME_ENVIRONMENT_RAW, "issues"),
	),
];

const runtimeInvestigationLinks = (groupUrl: string) => [
	dataLink("Logger for denne gruppen · Explore", groupUrl),
	...runtimeServiceLinks(ROW_SERVICE),
];

const lokiQuery = (
	refId: string,
	expr: string,
	queryType: "instant" | "range",
) => ({
	kind: "PanelQuery",
	spec: {
		hidden: false,
		query: {
			datasource: { name: LOKI_DATASOURCE_UID },
			group: "loki",
			kind: "DataQuery",
			spec: {
				direction: "backward",
				editorMode: "code",
				expr,
				queryType,
				...(refId === "Runtimefeil med trace"
					? { maxLines: RECENT_RUNTIME_EVENT_LIMIT }
					: {}),
			},
			version: "v0",
		},
		refId,
	},
});

const queryGroup = (
	query: ReturnType<typeof lokiQuery>,
	transformations: Array<Record<string, unknown>> = [],
	queryOptions: Record<string, unknown> = {},
) => ({
	kind: "QueryGroup",
	spec: {
		queries: [query],
		queryOptions,
		transformations,
	},
});

const neutralThresholds = {
	mode: "absolute",
	steps: [{ color: "blue", value: 0 }],
};

const runtimeTrendPanel = () => ({
	kind: "Panel",
	spec: {
		data: queryGroup(
			lokiQuery("Runtimefeil over tid", runtimeTrendQuery, "range"),
			[],
			{ interval: "1m", maxDataPoints: 240 },
		),
		description:
			"Loggede ERROR-, CRITICAL- og FATAL-hendelser per minutt, gjennomsnitt innen hvert måleintervall. Flere logger kan gjelde samme feil. Tomt betyr ingen treff, ikke bekreftet frisk tjeneste.",
		id: 1,
		links: runtimePanelLinks(),
		title: "Loggede feil per minutt",
		vizConfig: {
			group: "timeseries",
			kind: "VizConfig",
			spec: {
				fieldConfig: {
					defaults: {
						color: { fixedColor: "blue", mode: "fixed" },
						custom: {
							axisBorderShow: false,
							axisCenteredZero: false,
							axisColorMode: "text",
							axisLabel: "Hendelser/min",
							axisPlacement: "auto",
							barAlignment: 0,
							barWidthFactor: 0.6,
							drawStyle: "line",
							fillOpacity: 12,
							gradientMode: "none",
							hideFrom: { legend: false, tooltip: false, viz: false },
							insertNulls: false,
							lineInterpolation: "linear",
							lineWidth: 2,
							pointSize: 4,
							scaleDistribution: { type: "linear" },
							showPoints: "always",
							spanNulls: false,
							stacking: { group: "A", mode: "none" },
							thresholdsStyle: { mode: "off" },
						},
						noValue: "Ingen treff",
						thresholds: neutralThresholds,
						unit: "short",
						min: 0,
					},
					overrides: [],
				},
				options: {
					legend: {
						calcs: [],
						displayMode: "list",
						placement: "bottom",
						showLegend: false,
					},
					tooltip: { hideZeros: false, mode: "single", sort: "none" },
				},
			},
			version: GRAFANA_VERSION,
		},
	},
});

const runtimeServicePanel = () => ({
	kind: "Panel",
	spec: {
		id: 7,
		title: "Hvor skjer feilene?",
		description:
			"Loggede feil i hele tidsrommet, fordelt på tjeneste. Klikk en stolpe for logger eller APM. Tjenester uten treff vises ikke; dette er ikke en helsestatus.",
		links: [],
		data: queryGroup(
			lokiQuery("Feil per tjeneste", runtimeByServiceQuery, "instant"),
			[
				{
					kind: "Transformation",
					group: "rowsToFields",
					spec: {
						options: {
							mappings: [
								{ fieldName: "service_name", handlerKey: "field.name" },
								{
									fieldName: "Value #Feil per tjeneste",
									handlerKey: "field.value",
								},
								{ fieldName: "Time", handlerKey: "__ignore" },
							],
						},
					},
				},
			],
		),
		vizConfig: {
			kind: "VizConfig",
			group: "bargauge",
			version: GRAFANA_VERSION,
			spec: {
				fieldConfig: {
					defaults: {
						color: { mode: "fixed", fixedColor: "blue" },
						decimals: 0,
						displayName: grafanaVariable("__field.name"),
						fieldMinMax: false,
						min: 0,
						noValue: "Ingen treff",
						unit: "locale",
						links: runtimeServiceLinks(grafanaVariable("__field.name")),
					},
					overrides: [],
				},
				options: {
					displayMode: "basic",
					orientation: "horizontal",
					valueMode: "text",
					namePlacement: "left",
					showUnfilled: false,
					sizing: "manual",
					minVizHeight: 28,
					maxVizHeight: 40,
					minVizWidth: 8,
					text: { titleSize: 13, valueSize: 18 },
					reduceOptions: { calcs: ["lastNotNull"], fields: "", values: false },
					legend: {
						displayMode: "list",
						placement: "bottom",
						showLegend: false,
					},
				},
			},
		},
	},
});

const organizeTable = (
	refId: string,
	renameByName: Record<string, string>,
	indexByName: Record<string, number>,
) => ({
	group: "organize",
	kind: "Transformation",
	spec: {
		options: {
			excludeByName: { Time: true },
			includeByName: {},
			indexByName,
			renameByName: {
				[`Value #${refId}`]: "Hendelser",
				...renameByName,
			},
		},
	},
});

const tablePanel = ({
	id,
	title,
	description,
	refId,
	expr,
	renameByName,
	indexByName,
	actionLinks,
	panelLinks = [],
	widths = {},
}: {
	id: number;
	title: string;
	description: string;
	refId: string;
	expr: string;
	renameByName: Record<string, string>;
	indexByName: Record<string, number>;
	actionLinks: Array<Record<string, unknown>>;
	panelLinks?: Array<Record<string, unknown>>;
	widths?: Record<string, number>;
}) => ({
	kind: "Panel",
	spec: {
		data: queryGroup(lokiQuery(refId, expr, "instant"), [
			organizeTable(refId, renameByName, indexByName),
		]),
		description,
		id,
		links: panelLinks,
		title,
		vizConfig: {
			group: "table",
			kind: "VizConfig",
			spec: {
				fieldConfig: {
					defaults: {
						custom: {
							align: "auto",
							cellOptions: { type: "auto" },
							footer: { reducers: [] },
							inspect: false,
						},
						noValue: "—",
						decimals: 0,
					},
					overrides: [
						{
							matcher: { id: "byName", options: "browser_environment_display" },
							properties: [
								{
									id: "mappings",
									value: [
										{
											type: "value",
											options: {
												"prod-gcp": { text: "Produksjon" },
												"dev-gcp": { text: "Test" },
												ukjent: { text: "Ukjent" },
											},
										},
									],
								},
							],
						},
						{
							matcher: { id: "byName", options: "rejection_reason_display" },
							properties: [
								{
									id: "mappings",
									value: [
										{
											type: "value",
											options: {
												UNSPECIFIED: { text: "Årsak ikke oppgitt" },
											},
										},
									],
								},
							],
						},
						{
							matcher: { id: "byName", options: "action" },
							properties: [
								{ id: "links", value: actionLinks },
								{
									id: "custom.cellOptions",
									value: {
										type: actionLinks.length > 1 ? "auto" : "data-links",
									},
								},
								{ id: "custom.width", value: 120 },
							],
						},
						{
							matcher: { id: "byName", options: "Hendelser" },
							properties: [{ id: "custom.width", value: 95 }],
						},
						...Object.entries(widths).map(([field, width]) => ({
							matcher: { id: "byName", options: field },
							properties: [{ id: "custom.width", value: width }],
						})),
					],
				},
				options: {
					cellHeight: "sm",
					enablePagination: true,
					showHeader: true,
					sortBy: [{ desc: true, displayName: "Hendelser" }],
				},
			},
			version: GRAFANA_VERSION,
		},
	},
});

const tracedErrorsPanel = () => ({
	kind: "Panel",
	spec: {
		data: queryGroup(
			lokiQuery("Runtimefeil med trace", tracedRuntimeErrorsQuery, "range"),
			[
				{
					group: "extractFields",
					kind: "Transformation",
					spec: {
						options: {
							format: "json",
							keepTime: true,
							replace: true,
							source: "labels",
						},
					},
				},
				{
					group: "groupBy",
					kind: "Transformation",
					spec: {
						options: {
							fields: {
								Time: { aggregations: ["max"], operation: "aggregate" },
								error_code_display: {
									aggregations: [],
									operation: "groupby",
								},
								error_context: {
									aggregations: [],
									operation: "groupby",
								},
								error_type_display: {
									aggregations: [],
									operation: "groupby",
								},
								upstream_status_display: {
									aggregations: [],
									operation: "groupby",
								},
								safe_trace_id: {
									aggregations: [],
									operation: "groupby",
								},
								service_name: {
									aggregations: [],
									operation: "groupby",
								},
							},
						},
					},
				},
				{
					group: "organize",
					kind: "Transformation",
					spec: {
						options: {
							excludeByName: {},
							includeByName: {},
							indexByName: {
								"Time (max)": 0,
								service_name: 1,
								error_type_display: 2,
								error_code_display: 3,
								error_context: 4,
								upstream_status_display: 5,
								safe_trace_id: 6,
							},
							renameByName: {
								"Time (max)": "Tidspunkt",
								error_context: "Operasjon",
								error_code_display: "Kode",
								error_type_display: "Feiltype",
								safe_trace_id: "Trace",
								service_name: "Tjeneste",
								upstream_status_display: "HTTP-status fra kall",
							},
						},
					},
				},
			],
		),
		description: `Utvalg fra de ${RECENT_RUNTIME_EVENT_LIMIT} nyeste loggede feilene med trace-ID. Identiske feil i samme trace er slått sammen. Åpne trace viser forløpet hvis sporet er lagret og fortsatt finnes. HTTP-status gjelder tjenesten som ble kalt.`,
		id: 3,
		links: runtimePanelLinks(),
		title: "Konkrete feilforløp · åpne trace",
		vizConfig: {
			group: "table",
			kind: "VizConfig",
			spec: {
				fieldConfig: {
					defaults: {
						custom: {
							align: "auto",
							cellOptions: { type: "auto" },
							footer: { reducers: [] },
							inspect: false,
						},
						noValue: "—",
					},
					overrides: [
						{
							matcher: { id: "byName", options: "safe_trace_id" },
							properties: [
								{
									id: "links",
									value: [dataLink("Åpne trace", traceDataLink(ROW_VALUE))],
								},
								{
									id: "custom.cellOptions",
									value: { type: "data-links" },
								},
								{ id: "custom.width", value: 105 },
							],
						},
						{
							matcher: { id: "byName", options: "Time (max)" },
							properties: [{ id: "custom.width", value: 175 }],
						},
						{
							matcher: { id: "byName", options: "service_name" },
							properties: [
								{ id: "custom.width", value: 220 },
								{ id: "links", value: runtimeServiceLinks(ROW_VALUE) },
							],
						},
						{
							matcher: { id: "byName", options: "error_code_display" },
							properties: [{ id: "custom.width", value: 240 }],
						},
						{
							matcher: {
								id: "byName",
								options: "error_context",
							},
							properties: [{ id: "custom.width", value: 220 }],
						},
						{
							matcher: {
								id: "byName",
								options: "upstream_status_display",
							},
							properties: [{ id: "custom.width", value: 165 }],
						},
					],
				},
				options: {
					cellHeight: "sm",
					enablePagination: true,
					showHeader: true,
					sortBy: [{ desc: true, displayName: "Tidspunkt" }],
				},
			},
			version: GRAFANA_VERSION,
		},
	},
});

const primaryLayout = () => ({
	kind: "GridLayout",
	spec: {
		items: [
			layoutItem("panel-1", 0, 0, 14, 7),
			layoutItem("panel-7", 14, 0, 10, 7),
			layoutItem("panel-2", 0, 7, 24, 10),
			layoutItem("panel-3", 0, 17, 24, 8),
			layoutItem("panel-6", 0, 25, 24, 7),
		],
	},
});

const runtimeMetadataLayout = () => ({
	kind: "GridLayout",
	spec: {
		items: [layoutItem("panel-4", 0, 0, 24, 7)],
	},
});

const runtimeVariables = () => [
	{
		kind: "CustomVariable",
		spec: {
			allowCustomValue: false,
			current: { text: "prod-gcp", value: "prod" },
			description:
				"Miljø for feil i tjenestene, tracing og loggdata. Gjelder ikke nettleserfeil.",
			hide: "dontHide",
			includeAll: false,
			label: "Miljø",
			multi: false,
			name: "runtime_environment",
			options: [],
			query: runtimeEnvironmentOptions
				.map(({ text, value }) => `${text} : ${value}`)
				.join(","),
			skipUrlSync: false,
			valuesFormat: "csv",
		},
	},
	{
		kind: "DatasourceVariable",
		spec: {
			allowCustomValue: false,
			current: { text: "prod-gcp-tempo", value: PROD_TEMPO_DATASOURCE_UID },
			description: "Trace-datakilde for valgt miljø.",
			hide: "hideVariable",
			includeAll: false,
			multi: false,
			name: "tempo_datasource",
			options: [],
			pluginId: "tempo",
			refresh: "onDashboardLoad",
			regex: `/^${RUNTIME_ENVIRONMENT_RAW}-gcp-tempo$/`,
			skipUrlSync: true,
		},
	},
	{
		kind: "CustomVariable",
		spec: {
			allValue: dashboardApplicationRegex,
			allowCustomValue: false,
			current: { text: "All", value: ["$__all"] },
			description:
				"Tjenestene som undersøkes. Gjelder alle paneler i denne delen, også loggdata.",
			hide: "dontHide",
			includeAll: true,
			label: "Tjeneste",
			multi: true,
			name: "app",
			options: [],
			query: dashboardApplicationOptions
				.map(({ text, value }) => `${text} : ${value}`)
				.join(","),
			skipUrlSync: false,
			valuesFormat: "csv",
		},
	},
];

export const buildErrorDashboard = (): GrafanaDashboardResource => ({
	apiVersion: "dashboard.grafana.app/v2",
	kind: "Dashboard",
	metadata: {
		annotations: { "grafana.app/folder": ERROR_DASHBOARD_FOLDER_UID },
		name: ERROR_DASHBOARD_UID,
	},
	spec: {
		annotations: [
			{
				kind: "AnnotationQuery",
				spec: {
					builtIn: true,
					enable: true,
					hide: true,
					iconColor: "rgba(0, 211, 255, 1)",
					name: "Annotations & Alerts",
					query: {
						datasource: { name: "-- Grafana --" },
						group: "grafana",
						kind: "DataQuery",
						spec: {},
						version: "v0",
					},
				},
			},
		],
		cursorSync: "Off",
		description:
			"Finn hvor feilene skjer, hva som feiler og veien videre til logger, APM og tracing. Feil i tjenestene og nettleseren har hvert sitt utvalg.",
		editable: false,
		elements: {
			"panel-1": runtimeTrendPanel(),
			"panel-7": runtimeServicePanel(),
			"panel-2": tablePanel({
				id: 2,
				title: "Hva feiler?",
				description:
					"Loggede hendelser i hele tidsrommet, gruppert på tjeneste, feiltype, kode, operasjon og nivå. Inntil 25 grupper per ERROR-, CRITICAL- og FATAL-nivå. Undersøk gir logger for feilgruppen, tjenestelogger eller feil i APM. Bare gruppeloggen beholder den nøyaktige grupperingen.",
				refId: "Runtimefeil etter type",
				expr: runtimeByClassificationQuery,
				renameByName: {
					action: "Handling",
					error_level: "Nivå",
					error_code_display: "Kode",
					error_type_display: "Feiltype",
					operation_display: "Operasjon",
					service_name: "Tjeneste",
				},
				indexByName: {
					error_level: 0,
					service_name: 1,
					error_type_display: 2,
					error_code_display: 3,
					operation_display: 4,
					"Value #Runtimefeil etter type": 5,
					action: 6,
				},
				actionLinks: runtimeInvestigationLinks(runtimeErrorGroupDataLink()),
				panelLinks: runtimePanelLinks(),
				widths: {
					error_level: 95,
					error_code_display: 230,
					operation_display: 200,
					service_name: 220,
				},
			}),
			"panel-3": tracedErrorsPanel(),
			"panel-6": tablePanel({
				id: 6,
				title: "Avviste API-kall · WARN",
				description:
					"Inntil 50 grupper av WARN-hendelsen api_request_rejected, ikke alle advarsler eller HTTP 4xx. Gjentatte avvisninger kan vise klientfeil eller feilkonfigurasjon selv om serveren avviser riktig. Antallet er logghendelser, ikke brukere. Logger for feilgruppen bevarer også avvisningsgrunnen.",
				refId: "API-avvisninger",
				expr: runtimeRejectionsQuery,
				renameByName: {
					service_name: "Tjeneste",
					operation_display: "Operasjon",
					error_code_display: "Kode",
					rejection_reason_display: "Avvisningsgrunn",
					action: "Handling",
				},
				indexByName: {
					service_name: 0,
					operation_display: 1,
					error_code_display: 2,
					rejection_reason_display: 3,
					"Value #API-avvisninger": 4,
					action: 5,
				},
				actionLinks: runtimeInvestigationLinks(runtimeRejectionDataLink()),
				panelLinks: runtimePanelLinks(),
				widths: {
					service_name: 220,
					operation_display: 220,
					rejection_reason_display: 280,
				},
			}),
			"panel-4": tablePanel({
				id: 4,
				title: "Feil uten standardisert hendelsestype",
				description:
					"Feilene er med i oversikten, men mangler en gyldig event_type. Eldre typefelt er en fallback; avvist format er ubrukelig metadata; ikke oppgitt betyr at typefelt mangler. Kode og operasjon er valgfri metadata. Dette er forbedringsarbeid, ikke flere feil i tillegg til tabellen over.",
				refId: "Runtime-kontraktsgap",
				expr: runtimeContractGapQuery,
				renameByName: {
					action: "Handling",
					contract_state_display: "Hva mangler?",
					service_name: "Tjeneste",
				},
				indexByName: {
					service_name: 0,
					contract_state_display: 1,
					"Value #Runtime-kontraktsgap": 2,
					action: 3,
				},
				actionLinks: runtimeInvestigationLinks(runtimeContractGapDataLink()),
				panelLinks: runtimePanelLinks(),
				widths: { contract_state_display: 170, service_name: 250 },
			}),
			"panel-5": tablePanel({
				id: 5,
				title: "Hva feiler i nettleseren?",
				description:
					"Inntil 50 grupper fra nettleserens feillogg. Miljøet kommer fra appens metadata; manglende eller ukjent miljø beholdes som Ukjent. Andre eksplisitte namespaces er utelatt. Ukjent type samles som Annen / ikke oppgitt. Tallene er hendelser, ikke berørte brukere.",
				refId: "Browserfeil",
				expr: browserByTypeQuery,
				renameByName: {
					action: "Handling",
					browser_environment_display: "Miljø",
					browser_type_display: "Feiltype",
					service_name: "Nettleserflate",
				},
				indexByName: {
					service_name: 0,
					browser_environment_display: 1,
					browser_type_display: 2,
					"Value #Browserfeil": 3,
					action: 4,
				},
				actionLinks: [dataLink("Se logger", browserErrorGroupDataLink())],
				panelLinks: [
					dataLink(
						"Browserkontrakt",
						"https://navikt.github.io/team-esyfo/utvikling/observability/browserkontrakt",
					),
				],
				widths: {
					browser_type_display: 210,
					browser_environment_display: 130,
					service_name: 250,
				},
			}),
		},
		layout: {
			kind: "RowsLayout",
			spec: {
				rows: [
					{
						kind: "RowsLayoutRow",
						spec: {
							collapse: false,
							hideHeader: false,
							title: "Feil i tjenestene",
							variables: runtimeVariables(),
							layout: {
								kind: "RowsLayout",
								spec: {
									rows: [
										{
											kind: "RowsLayoutRow",
											spec: {
												collapse: false,
												hideHeader: true,
												title: "Feilsøking",
												layout: primaryLayout(),
											},
										},
										{
											kind: "RowsLayoutRow",
											spec: {
												collapse: true,
												hideHeader: false,
												title: "Forbedre loggdata",
												layout: runtimeMetadataLayout(),
											},
										},
									],
								},
							},
						},
					},
					{
						kind: "RowsLayoutRow",
						spec: {
							collapse: false,
							hideHeader: false,
							layout: {
								kind: "GridLayout",
								spec: { items: [layoutItem("panel-5", 0, 0, 24, 8)] },
							},
							title: "Nettleserfeil · eget utvalg",
							variables: [
								{
									kind: "CustomVariable",
									spec: {
										allowCustomValue: false,
										current: {
											text: "Alle (også ukjent)",
											value: "prod-gcp|dev-gcp|ukjent",
										},
										description:
											"Miljø rapportert av nettleserappen. Ukjent betyr manglende eller ugyldig team- eller miljømetadata.",
										hide: "dontHide",
										includeAll: false,
										label: "Nettlesermiljø",
										multi: false,
										name: "browser_environment",
										options: [],
										query:
											"Alle (også ukjent) : prod-gcp|dev-gcp|ukjent,Produksjon : prod-gcp,Test : dev-gcp,Ukjent : ukjent",
										skipUrlSync: false,
										valuesFormat: "csv",
									},
								},
								{
									kind: "CustomVariable",
									spec: {
										allValue: dashboardBrowserRegex,
										allowCustomValue: false,
										current: { text: "All", value: ["$__all"] },
										description:
											"Bare nettleserflater med konfigurert telemetry. Påvirker bare nettleserpanelet.",
										hide: "dontHide",
										includeAll: true,
										label: "Nettleserflate",
										multi: true,
										name: "browser_app",
										options: [],
										query: dashboardBrowserOptions
											.map(({ text, value }) => `${text} : ${value}`)
											.join(","),
										skipUrlSync: false,
										valuesFormat: "csv",
									},
								},
							],
						},
					},
				],
			},
		},
		links: [
			{
				title: "Kontrollrom",
				tooltip: "Fast oversikt over tjenester i produksjon",
				type: "link",
				url: "https://grafana.nav.cloud.nais.io/d/team-esyfo-kontrollrom",
				targetBlank: true,
				icon: "external link",
				tags: [],
				asDropdown: false,
				includeVars: false,
				keepTime: true,
			},
			{
				title: "Om målingene",
				tooltip: "Datagrunnlag og tolkning av feiloversikten",
				type: "link",
				url: "https://navikt.github.io/team-esyfo/utvikling/observability/feildrilldown",
				targetBlank: true,
				icon: "external link",
				tags: [],
				asDropdown: false,
				includeVars: false,
				keepTime: false,
			},
		],
		liveNow: false,
		preload: false,
		tags: ["team-esyfo", "errors", "observability", "managed-as-code"],
		timeSettings: {
			autoRefresh: "1m",
			autoRefreshIntervals: ["30s", "1m", "5m", "15m", "30m", "1h"],
			fiscalYearStartMonth: 0,
			from: "now-6h",
			hideTimepicker: false,
			to: "now",
			timezone: "browser",
		},
		title: "Team eSyfo – Feiloversikt",
		variables: [],
	},
});

export const serializeErrorDashboard = () =>
	`${JSON.stringify(buildErrorDashboard(), null, 2)}\n`;
