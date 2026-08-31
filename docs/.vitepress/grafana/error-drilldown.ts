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
import { runtimeErrorPipeline } from "./runtime-logql.ts";

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
const ROW_CONTRACT_GAP = grafanaVariable(
	'__data.fields["contract_state_display"]',
);
const ROW_BROWSER_TYPE = grafanaVariable(
	'__data.fields["browser_type_display"]',
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

export const runtimeTrendQuery = `sum(count_over_time(${runtimeSelector}
${runtimeErrorPipeline}
| keep service_name
[$__auto])) or on() vector(0)`;

const runtimeSignatureParser = `| json event_type, event, error_code, code, feilkode, runtime_type="type", status, operation, top_exception_type="exception_type", nested_exception_type="exception.type", top_error_type="error_type", nested_error_type="error.type", top_err_type="err_type", nested_err_type="err.type"`;
const runtimeTraceParser = `| json event_type, event, error_code, code, feilkode, runtime_type="type", status, operation, trace_id, top_exception_type="exception_type", nested_exception_type="exception.type", top_error_type="error_type", nested_error_type="error.type", top_err_type="err_type", nested_err_type="err.type"`;

export const safeEventTypePattern = "^[a-z][a-z0-9_.-]{0,79}$";
export const safeGenericErrorTypePattern =
	"^([A-Za-z][A-Za-z0-9_.:$]{0,143})?(Error|Exception)$";
export const safeCodePattern = "^([A-Z][A-Z0-9_]{1,79}|[1-5][0-9]{2})$";
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
${safeLabel("safe_trace_id", "trace_id", safeTraceIdPattern)}
| label_format error_context=\`{{ .operation_display }}\``;

const browserTypePipeline = `| logfmt type
| drop __error__, __error_details__
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

export const browserByTypeQuery = `topk(50, sum by(service_name, browser_type_display, action) (count_over_time(${browserSelector}
${browserTypePipeline}
| label_format action=\`Undersøk\`
| keep service_name, browser_type_display, action
[$__auto])))`;

export const tracedRuntimeErrorsQuery = `${runtimeSelector}
${runtimeErrorPipeline}
${runtimeTraceParser}
${runtimeTraceLabels}
| safe_trace_id!=""
| safe_trace_id!="00000000000000000000000000000000"
| line_format \`{{ .error_type_display }}\`
| keep service_name, error_type_display, error_code_display, error_context, safe_trace_id
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

export const browserErrorGroupDataLink = () =>
	lokiExploreDataLink(`{kind="exception", service_name="${ROW_SERVICE}"}
${browserTypePipeline}
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
			"Volum av runtime-logghendelser på error, critical eller fatal i valgt miljø og tjenestescope. Hendelser, ikke unike feil eller incidents. En endring i nivå eller mønster er et signal til å prioritere tabellen under.",
		id: 1,
		links: runtimePanelLinks(),
		title: "Runtimefeil over tid",
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
							axisLabel: "",
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
							showPoints: "never",
							spanNulls: false,
							stacking: { group: "A", mode: "none" },
							thresholdsStyle: { mode: "off" },
						},
						noValue: "Ingen treff",
						thresholds: neutralThresholds,
						unit: "short",
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
	actionLink,
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
	actionLink: Record<string, unknown>;
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
					},
					overrides: [
						{
							matcher: { id: "byName", options: "action" },
							properties: [
								{ id: "links", value: [actionLink] },
								{
									id: "custom.cellOptions",
									value: { type: "data-links" },
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
								safe_trace_id: 5,
							},
							renameByName: {
								"Time (max)": "Tidspunkt",
								error_context: "Operasjon",
								error_code_display: "Kode",
								error_type_display: "Feiltype",
								safe_trace_id: "Trace",
								service_name: "Tjeneste",
							},
						},
					},
				},
			],
		),
		description: `Deduplisert utvalg fra de ${RECENT_RUNTIME_EVENT_LIMIT} nyeste trace-koblede runtimehendelsene, gruppert på trace, tjeneste, feiltype, kode og operasjon. Trace-kolonnen åpner hele forløpet. Tom tabell betyr ingen treff i valgt scope; det beviser ikke komplett telemetry. Rå melding, stack, URL og payload returneres ikke til tabellen.`,
		id: 3,
		links: runtimePanelLinks(),
		title: `Nyeste runtimefeil med trace (maks ${RECENT_RUNTIME_EVENT_LIMIT})`,
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
							properties: [{ id: "custom.width", value: 245 }],
						},
						{
							matcher: { id: "byName", options: "error_code_display" },
							properties: [{ id: "custom.width", value: 310 }],
						},
						{
							matcher: {
								id: "byName",
								options: "error_context",
							},
							properties: [{ id: "custom.width", value: 220 }],
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
			layoutItem("panel-1", 0, 0, 24, 6),
			layoutItem("panel-2", 0, 6, 24, 12),
			layoutItem("panel-3", 0, 18, 24, 11),
		],
	},
});

const secondaryLayout = () => ({
	kind: "GridLayout",
	spec: {
		items: [
			layoutItem("panel-4", 0, 0, 24, 10),
			layoutItem("panel-5", 0, 10, 24, 10),
		],
	},
});

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
			"Operatørflate for å finne hvilke runtimefeil som øker, hvor de skjer og hvilket trace eller loggsøk som gir neste steg. Browserdiagnostikk og kontraktsgap er sekundære fordi miljø og metadata ikke har samme kvalitet.",
		editable: false,
		elements: {
			"panel-1": runtimeTrendPanel(),
			"panel-2": tablePanel({
				id: 2,
				title: "Vanligste runtimefeil per nivå (topp 25)",
				description:
					"Prioriteringsvisning for valgt miljø og tjeneste, med inntil 25 grupper per error-, critical- og fatal-nivå slik at lavvolums critical/fatal ikke forsvinner bak vanlige error-hendelser. Feiltype, kode og operasjon er kodeeid metadata; rå message vises først i Explore. Handlingen åpner samme gruppe med nivå og scope bevart. Tom tabell betyr ingen treff i valgt scope; det beviser ikke komplett telemetry.",
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
				actionLink: dataLink("Se logger", runtimeErrorGroupDataLink()),
				panelLinks: runtimePanelLinks(),
				widths: {
					error_level: 95,
					error_code_display: 310,
					operation_display: 230,
					service_name: 220,
				},
			}),
			"panel-3": tracedErrorsPanel(),
			"panel-4": tablePanel({
				id: 4,
				title: "Loggmetadata som må forbedres",
				description:
					"Viser bare hendelser som ikke bruker gyldig kanonisk event_type. Eldre typefelt betyr at dashboardet måtte bruke en migreringsfallback; avvist betyr feil format; Ikke oppgitt av appen betyr at ingen identitetskandidat ble sendt. Kode og operasjon er valgfri metadata og brukes ikke som erstatning for feilidentitet. Tom tabell betyr ingen treff i valgt scope; det beviser ikke komplett telemetry.",
				refId: "Runtime-kontraktsgap",
				expr: runtimeContractGapQuery,
				renameByName: {
					action: "Handling",
					contract_state_display: "Gap",
					service_name: "Tjeneste",
				},
				indexByName: {
					service_name: 0,
					contract_state_display: 1,
					"Value #Runtime-kontraktsgap": 2,
					action: 3,
				},
				actionLink: dataLink("Se logger", runtimeContractGapDataLink()),
				panelLinks: runtimePanelLinks(),
				widths: { contract_state_display: 170, service_name: 250 },
			}),
			"panel-5": tablePanel({
				id: 5,
				title: "Nettleserfeil (topp 50 · miljø ikke verifisert)",
				description:
					"Sekundær Faro-diagnostikk for konfigurerte nettleserflater. Kjøremiljøet påvirker ikke dette panelet. Bare en lukket liste med kjente exception-typer vises; øvrige og ikke-parsebare hendelser samles som Annen / ikke oppgitt. Handlingen åpner nettleserlogger uten å påstå et kjøremiljø. Tom tabell betyr ingen treff i valgt scope; det beviser ikke komplett telemetry.",
				refId: "Browserfeil",
				expr: browserByTypeQuery,
				renameByName: {
					action: "Handling",
					browser_type_display: "Feiltype",
					service_name: "Nettleserflate",
				},
				indexByName: {
					service_name: 0,
					browser_type_display: 1,
					"Value #Browserfeil": 2,
					action: 3,
				},
				actionLink: dataLink("Se logger", browserErrorGroupDataLink()),
				panelLinks: [
					dataLink(
						"Browserkontrakt",
						"https://navikt.github.io/team-esyfo/utvikling/observability/browserkontrakt",
					),
				],
				widths: { browser_type_display: 210, service_name: 250 },
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
							hideHeader: true,
							layout: primaryLayout(),
							title: "Operativ feilsøking",
						},
					},
					{
						kind: "RowsLayoutRow",
						spec: {
							collapse: true,
							hideHeader: false,
							layout: secondaryLayout(),
							title: "Datakvalitet og nettleserfeil",
							variables: [
								{
									kind: "CustomVariable",
									spec: {
										allValue: dashboardBrowserRegex,
										allowCustomValue: false,
										current: { text: "All", value: ["$__all"] },
										description:
											"Bare nettleserflater med konfigurert telemetry. Miljø er ikke verifisert og velgeren påvirker bare nettleserpanelet.",
										hide: "dontHide",
										includeAll: true,
										label: "Nettleserflate · miljø ukjent",
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
		links: [],
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
		variables: [
			{
				kind: "CustomVariable",
				spec: {
					allowCustomValue: false,
					current: { text: "prod-gcp", value: "prod" },
					description:
						"Filtrerer runtimepanelene og runtime-lenker. Browserdiagnostikk har ikke verifisert miljø og påvirkes ikke.",
					hide: "dontHide",
					includeAll: false,
					label: "Kjøremiljø",
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
					current: {
						text: "prod-gcp-tempo",
						value: PROD_TEMPO_DATASOURCE_UID,
					},
					description:
						"Skjult, avledet Tempo-datakilde for valgt kjøremiljø. Holder trace-lenker i samme dev/prod-scope som runtime-loggene.",
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
						"Eksakt runtime-scope fra inventaret. Velg én tjeneste når topp 25 per nivå ikke er komplett nok.",
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
		],
	},
});

export const serializeErrorDashboard = () =>
	`${JSON.stringify(buildErrorDashboard(), null, 2)}\n`;
