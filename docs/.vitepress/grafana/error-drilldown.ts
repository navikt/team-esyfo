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
	TEAM_ESYFO_DASHBOARD_FOLDER_UID,
	TEMPO_DATASOURCE_UID,
} from "./dashboard-kit.ts";
import { runtimeErrorPipeline } from "./runtime-logql.ts";

export { LOKI_DATASOURCE_UID, TEMPO_DATASOURCE_UID } from "./dashboard-kit.ts";

export const ERROR_DASHBOARD_UID = "team-esyfo-error-drilldown";
export const ERROR_DASHBOARD_FOLDER_UID = TEAM_ESYFO_DASHBOARD_FOLDER_UID;
export const RECENT_RUNTIME_EVENT_LIMIT = 100;
const APP_VARIABLE = grafanaVariable("app:regex");
const RUNTIME_ENVIRONMENT = grafanaVariable("runtime_environment:raw");
const FROM = grafanaVariable("__from");
const TO = grafanaVariable("__to");
const FROM_ISO = grafanaVariable("__from:date:iso");
const TO_ISO = grafanaVariable("__to:date:iso");
const ROW_VALUE = grafanaVariable("__value.raw");
const ROW_TIME = grafanaVariable("__value.time");

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

export const unverifiedApmServices = dashboardApplications
	.filter(({ runtimeApm }) => runtimeApm.status !== "linked")
	.map(({ runtime }) => runtime.name);

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

const escapeLogqlRegex = (value: string) =>
	value.replace(/[\\.^$|?*+()[\]{}]/g, "\\$&");

export const dashboardApplicationRegex = `^(${dashboardApplicationOptions
	.map(({ value }) => escapeLogqlRegex(value))
	.join("|")})$`;

export const runtimeEnvironmentOptions = [
	{ text: "prod-gcp", value: "prod" },
	{ text: "dev-gcp", value: "dev" },
];

const runtimeSelector = `{service_namespace="team-esyfo", k8s_cluster_name="${RUNTIME_ENVIRONMENT}", service_name=~"${APP_VARIABLE}"}`;

export const runtimeTotalQuery = `sum(count_over_time(${runtimeSelector}
${runtimeErrorPipeline}
[$__range])) or on() vector(0)`;

export const runtimeByServiceQuery = `topk(50, sum by(service_name) (count_over_time(${runtimeSelector}
${runtimeErrorPipeline}
[$__range])))`;

const browserSelector = `{kind="exception", service_name=~"${APP_VARIABLE}"}`;

export const browserTotalQuery = `sum(count_over_time(${browserSelector} [$__range])) or on() vector(0)`;

export const browserByTypeQuery = `topk(50, sum by(service_name, type) (count_over_time(${browserSelector} | logfmt | __error__="" | type!="" [$__range])))`;

const runtimeClassificationParser = `| json event_type, event, error_code, code, feilkode, runtime_type="type", status, logger_name, trace_id, category, operation, operation_name, operation_camel="operationName", top_exception_type="exception_type", nested_exception_type="exception.type", top_error_type="error_type", nested_error_type="error.type", top_err_type="err_type", nested_err_type="err.type"`;

const safeEventTypePattern = "^[a-z][a-z0-9_.-]{0,79}$";
const safeIdentifierPattern = "^[A-Za-z][A-Za-z0-9_.:$]{0,159}$";
const safeCodePattern = "^([A-Za-z][A-Za-z0-9_.:$]{0,79}|[1-5][0-9]{2})$";
const safeGenericTypeAsCodePattern = "^[A-Z][A-Z0-9_]{1,79}$";
const safeGenericErrorTypePattern =
	"^([A-Za-z][A-Za-z0-9_.:$]{0,143})?(Error|Exception)$";
const safeErrorStatusPattern = "^[45][0-9]{2}$";
const safeTraceIdPattern = "^[A-Fa-f0-9]{32}$";

const safeLabel = (target: string, source: string, pattern: string) =>
	`| label_format ${target}=\`{{ if and .${source} (not (regexReplaceAll "${pattern}" .${source} "")) }}{{ .${source} }}{{ end }}\``;

const runtimeClassificationLabels = `| drop __error__, __error_details__
${safeLabel("safe_event_type", "event_type", safeEventTypePattern)}
${safeLabel("safe_event", "event", safeIdentifierPattern)}
${safeLabel(
	"safe_top_exception_type",
	"top_exception_type",
	safeIdentifierPattern,
)}
${safeLabel(
	"safe_nested_exception_type",
	"nested_exception_type",
	safeIdentifierPattern,
)}
${safeLabel("safe_top_error_type", "top_error_type", safeIdentifierPattern)}
${safeLabel(
	"safe_nested_error_type",
	"nested_error_type",
	safeIdentifierPattern,
)}
${safeLabel("safe_top_err_type", "top_err_type", safeGenericErrorTypePattern)}
${safeLabel("safe_nested_err_type", "nested_err_type", safeIdentifierPattern)}
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
${safeLabel("safe_logger", "logger_name", safeIdentifierPattern)}
${safeLabel("safe_category", "category", safeIdentifierPattern)}
${safeLabel("safe_operation", "operation", safeIdentifierPattern)}
${safeLabel("safe_operation_name", "operation_name", safeIdentifierPattern)}
${safeLabel("safe_operation_camel", "operation_camel", safeIdentifierPattern)}
${safeLabel("safe_trace_id", "trace_id", safeTraceIdPattern)}
| label_format error_type_display=\`{{ if .safe_event_type }}{{ .safe_event_type }}{{ else if .safe_event }}{{ .safe_event }}{{ else if .safe_top_exception_type }}{{ .safe_top_exception_type }}{{ else if .safe_nested_exception_type }}{{ .safe_nested_exception_type }}{{ else if .safe_top_error_type }}{{ .safe_top_error_type }}{{ else if .safe_nested_error_type }}{{ .safe_nested_error_type }}{{ else if .safe_top_err_type }}{{ .safe_top_err_type }}{{ else if .safe_nested_err_type }}{{ .safe_nested_err_type }}{{ else if .safe_runtime_error_type }}{{ .safe_runtime_error_type }}{{ else }}Ikke oppgitt av appen{{ end }}\`
| label_format error_code_display=\`{{ if .safe_error_code }}{{ .safe_error_code }}{{ else if .safe_code }}{{ .safe_code }}{{ else if .safe_feilkode }}{{ .safe_feilkode }}{{ else if .safe_runtime_type_code }}{{ .safe_runtime_type_code }}{{ else if .safe_status }}{{ .safe_status }}{{ else }}—{{ end }}\`
| label_format error_source=\`{{ if .safe_logger }}{{ .safe_logger }}{{ else }}—{{ end }}\`
| label_format error_context=\`{{ if .safe_operation }}operasjon: {{ .safe_operation }}{{ else if .safe_operation_name }}operasjon: {{ .safe_operation_name }}{{ else if .safe_operation_camel }}operasjon: {{ .safe_operation_camel }}{{ else if .safe_category }}kategori: {{ .safe_category }}{{ else }}—{{ end }}\`
| label_format type_state=\`{{ if or .safe_event_type .safe_event .safe_top_exception_type .safe_nested_exception_type .safe_top_error_type .safe_nested_error_type .safe_top_err_type .safe_nested_err_type .safe_runtime_error_type }}typed{{ else if or .safe_error_code .safe_code .safe_feilkode .safe_runtime_type_code .safe_status }}code_only{{ else if or .event_type .event .top_exception_type .nested_exception_type .top_error_type .nested_error_type .top_err_type .nested_err_type .runtime_type .error_code .code .feilkode .status }}rejected{{ else if or .safe_category .safe_operation .safe_operation_name .safe_operation_camel }}context_only{{ else if or .category .operation .operation_name .operation_camel }}rejected{{ else }}missing{{ end }}\``;

export const runtimeByClassificationQuery = `topk(50, sum by(service_name, error_type_display, error_code_display) (count_over_time(${runtimeSelector}
${runtimeErrorPipeline}
${runtimeClassificationParser}
${runtimeClassificationLabels}
| keep service_name, error_type_display, error_code_display
[$__range])))`;

export const runtimeClassificationCoverageQuery = `sum by(service_name, type_state) (count_over_time(${runtimeSelector}
${runtimeErrorPipeline}
${runtimeClassificationParser}
${runtimeClassificationLabels}
| keep service_name, type_state
[$__range]))`;

export const tracedRuntimeErrorsQuery = `${runtimeSelector}
${runtimeErrorPipeline}
${runtimeClassificationParser}
${runtimeClassificationLabels}
| safe_trace_id!=""
| line_format \`{{ .error_type_display }}\`
| keep service_name, error_type_display, error_code_display, error_context, error_source, type_state, safe_trace_id
| drop __error__, __error_details__`;

export const apmDataLink = (service: string) =>
	`/a/nais-apm-app/services/team-esyfo/${service}?environment=${RUNTIME_ENVIRONMENT}&from=${FROM_ISO}&to=${TO_ISO}`;

export const runtimeLogsDataLink = (service: string) =>
	`/a/grafana-lokiexplore-app/explore/service/${service}/logs?from=${FROM}&to=${TO}&var-ds=${LOKI_DATASOURCE_UID}&var-filters=service_name%7C%3D%7C${service}&var-filters=service_namespace%7C%3D%7Cteam-esyfo&var-filters=k8s_cluster_name%7C%3D%7C${RUNTIME_ENVIRONMENT}`;

export const browserLogsDataLink = (service: string) =>
	`/a/grafana-lokiexplore-app/explore/service/${service}/logs?from=${FROM}&to=${TO}&var-ds=${LOKI_DATASOURCE_UID}&var-filters=service_name%7C%3D%7C${service}&var-filters=kind%7C%3D%7Cexception`;

export const traceDataLink = (traceId: string) =>
	`/a/grafana-exploretraces-app/explore?from=${ROW_TIME}&to=${ROW_TIME}&var-ds=${TEMPO_DATASOURCE_UID}&traceId=${traceId}`;

const runtimeRowLinks = () => [
	dataLink("Åpne tjenesten i NAIS APM", apmDataLink(ROW_VALUE)),
	dataLink(
		"Åpne runtime-logger i valgt tidsrom",
		runtimeLogsDataLink(ROW_VALUE),
	),
];

const runtimePanelLinks = () => [
	dataLink(
		"HTTP/runtime-runbook",
		"https://navikt.github.io/team-esyfo/utvikling/observability/runbooks/http-runtime",
	),
	dataLink(
		"Kontrollrom (kun prod)",
		`/d/team-esyfo-control-room-v1/team-esyfo-e28093-kontrollrom?orgId=1&from=${FROM}&to=${TO}&timezone=browser`,
	),
];

const browserRowLinks = () => [
	dataLink("Åpne tjenesten i NAIS APM", apmDataLink(ROW_VALUE)),
	dataLink("Åpne avgrenset browser-loggsøk", browserLogsDataLink(ROW_VALUE)),
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
				...(queryType === "range"
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
) => ({
	kind: "QueryGroup",
	spec: {
		queries: [query],
		queryOptions: {},
		transformations,
	},
});

const thresholds = {
	mode: "absolute",
	steps: [
		{ color: "green", value: 0 },
		{ color: "red", value: 1 },
	],
};

const statPanel = (
	id: number,
	title: string,
	description: string,
	refId: string,
	expr: string,
) => ({
	kind: "Panel",
	spec: {
		data: queryGroup(lokiQuery(refId, expr, "instant")),
		description,
		id,
		links: [],
		title,
		vizConfig: {
			group: "stat",
			kind: "VizConfig",
			spec: {
				fieldConfig: {
					defaults: {
						noValue: "Ukjent",
						thresholds,
						unit: "short",
					},
					overrides: [],
				},
				options: {
					colorMode: "value",
					graphMode: "area",
					justifyMode: "center",
					orientation: "auto",
					percentChangeColorMode: "standard",
					reduceOptions: {
						calcs: ["lastNotNull"],
						fields: "",
						values: false,
					},
					showPercentChange: false,
					textMode: "auto",
					wideLayout: true,
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
	valueLabel = "Antall",
) => ({
	group: "organize",
	kind: "Transformation",
	spec: {
		options: {
			excludeByName: { Time: true },
			includeByName: {},
			indexByName,
			renameByName: {
				[`Value #${refId}`]: valueLabel,
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
	links,
	panelLinks = [],
	valueLabel = "Antall",
}: {
	id: number;
	title: string;
	description: string;
	refId: string;
	expr: string;
	renameByName: Record<string, string>;
	indexByName: Record<string, number>;
	links: Array<Record<string, unknown>>;
	panelLinks?: Array<Record<string, unknown>>;
	valueLabel?: string;
}) => ({
	kind: "Panel",
	spec: {
		data: queryGroup(lokiQuery(refId, expr, "instant"), [
			organizeTable(refId, renameByName, indexByName, valueLabel),
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
						color: { mode: "thresholds" },
						custom: {
							align: "auto",
							cellOptions: { type: "auto" },
							footer: { reducers: [] },
							inspect: false,
						},
						thresholds,
					},
					// Grafana 13.1.2 matcher kildefeltnavnet også etter organize-rename.
					overrides: [
						{
							matcher: { id: "byName", options: "service_name" },
							properties: [{ id: "links", value: links }],
						},
						{
							matcher: { id: "byName", options: valueLabel },
							properties: [{ id: "custom.width", value: 100 }],
						},
					],
				},
				options: {
					cellHeight: "sm",
					enablePagination: true,
					showHeader: true,
					sortBy: [{ desc: true, displayName: valueLabel }],
				},
			},
			version: GRAFANA_VERSION,
		},
	},
});

const coverageMarkdown = () => {
	const lifecycleNotes = dashboardApplications
		.filter(({ lifecycle }) => lifecycle.state !== "active")
		.map((application) => `\`${lifecycleLabel(application)}\``)
		.join(", ");
	const browserGaps = missingBrowserServices
		.map((name) => `\`${name}\``)
		.join(", ");
	const apmGaps = unverifiedApmServices.map((name) => `\`${name}\``).join(", ");

	return `### Dekning og tolkning

- **Runtime-scope:** Valgt runtime-miljø og ${dashboardApplications.length} nåværende tjenester fra det godkjente inventaret. Overgang: ${lifecycleNotes}.
- **Browser · miljøscope UKJENT:** Runtime-miljø filtrerer ikke Faro-panelene. ${configuredBrowserServices.length}/${dashboardBrowserSurfaces.length} flater har konfigurert telemetry. Mangler: ${browserGaps}. Se [browserkontrakten](https://navikt.github.io/team-esyfo/utvikling/observability/browserkontrakt).
- **APM:** ${dashboardApplications.length - unverifiedApmServices.length}/${dashboardApplications.length} tjenester er sett i prod-katalogen. Uverifisert: ${apmGaps}.
- **Tolkning:** Tallene er logghendelser, ikke unike feil, incidents eller berørte brukere. «Ikke oppgitt av appen» er et instrumenteringsgap, ikke en feiltype. Dekningspanelet skiller typet, kontekst-only, kode-only, avvist format og manglende klassifisering. 0 betyr at count-spørringen lyktes uten feiltreff. Tom tabell betyr ingen kvalifiserende treff, ikke at telemetry er komplett. Trace-tabellen er et utvalg på maks ${RECENT_RUNTIME_EVENT_LIMIT} JSON-hendelser med trace. Datakilde- og syntaksfeil skal stå som feil/ukjent.`;
};

const textPanel = () => ({
	kind: "Panel",
	spec: {
		data: {
			kind: "QueryGroup",
			spec: { queries: [], queryOptions: {}, transformations: [] },
		},
		description: "Dekning generert fra det godkjente runtimeinventaret.",
		id: 3,
		links: [],
		title: "Slik leses dashboardet",
		vizConfig: {
			group: "text",
			kind: "VizConfig",
			spec: {
				fieldConfig: { defaults: {}, overrides: [] },
				options: { content: coverageMarkdown(), mode: "markdown" },
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
					group: "organize",
					kind: "Transformation",
					spec: {
						options: {
							excludeByName: {},
							includeByName: {},
							indexByName: {
								Time: 0,
								service_name: 1,
								error_type_display: 2,
								error_code_display: 3,
								error_context: 4,
								error_source: 5,
								type_state: 6,
								safe_trace_id: 7,
							},
							renameByName: {
								Time: "Tidspunkt",
								service_name: "Tjeneste",
								error_type_display: "Feiltype",
								error_code_display: "Kode",
								error_context: "Trygg kontekst",
								error_source: "Kilde (logger)",
								type_state: "Klassifiseringsstatus",
								safe_trace_id: "Trace",
							},
						},
					},
				},
			],
		),
		description: `Diagnostisk utvalg av maksimalt ${RECENT_RUNTIME_EVENT_LIMIT} nyeste JSON-parsebare runtime-logghendelser med trace i valgt runtime-miljø. Radene er ikke unike feil eller incidents; samme trace kan gi flere hendelser. Feiltype kommer bare fra dokumenterte event-, exception- og error-felt; kode, trygg kontekst, loggerkilde og klassifiseringsstatus vises separat. Trace-ID vises ikke, og rå melding, stack og URL returneres ikke. Klikk tjenesten for APM eller runtime-logger i valgt tidsrom.`,
		id: 6,
		links: runtimePanelLinks(),
		title: `Nyeste traced runtimehendelser (maks ${RECENT_RUNTIME_EVENT_LIMIT})`,
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
					},
					// Grafana 13.1.2 matcher kildefeltnavnet også etter organize-rename.
					overrides: [
						{
							matcher: { id: "byName", options: "service_name" },
							properties: [{ id: "links", value: runtimeRowLinks() }],
						},
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
								{ id: "custom.width", value: 140 },
							],
						},
						{
							matcher: { id: "byName", options: "Time" },
							properties: [{ id: "custom.width", value: 190 }],
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
			"Personvernsikker drilldown for runtimefeil i valgt runtime-miljø og browserfeil med ukjent miljøscope. Generert fra runtimeinventaret i navikt/team-esyfo.",
		editable: true,
		elements: {
			"panel-1": statPanel(
				1,
				"Runtimefeil · logghendelser",
				"Antall error-, critical- og fatal-logghendelser i valgt tidsrom, ikke unike feil, incidents eller berørte brukere. Browservideresendte logger er ekskludert; browser-exceptions måles separat i Faro der det er konfigurert. 0 er et vellykket tomt resultat; datakildefeil er ukjent.",
				"Runtimefeil totalt",
				runtimeTotalQuery,
			),
			"panel-2": statPanel(
				2,
				"Browser-exceptions · miljøscope UKJENT",
				"Antall Faro exception-logghendelser i valgt tidsrom, ikke unike feil eller berørte brukere. Runtime-miljø filtrerer ikke dette panelet fordi Faro-miljøfeltet ikke er verifisert. Dette sier heller ikke at alle browserflater har telemetry.",
				"Browserfeil totalt",
				browserTotalQuery,
			),
			"panel-3": textPanel(),
			"panel-4": tablePanel({
				id: 4,
				title: "Runtimefeil etter tjeneste og type",
				description:
					"Hovedoversikt over error-, critical- og fatal-logghendelser i valgt runtime-miljø, gruppert på tjeneste, personvernsikker feiltype og kode. «Ikke oppgitt av appen» og «—» betyr at appen ikke sendte feltet i et godkjent format; dashboardet utleder aldri type fra rå melding, stack eller URL. Hendelser uten trace er med.",
				refId: "Runtimefeil etter type",
				expr: runtimeByClassificationQuery,
				renameByName: {
					service_name: "Tjeneste",
					error_type_display: "Feiltype",
					error_code_display: "Kode",
				},
				indexByName: {
					service_name: 0,
					error_type_display: 1,
					error_code_display: 2,
					"Value #Runtimefeil etter type": 3,
				},
				links: runtimeRowLinks(),
				panelLinks: runtimePanelLinks(),
				valueLabel: "Logghendelser",
			}),
			"panel-5": tablePanel({
				id: 5,
				title: "Browser-exceptions per tjeneste og type · miljøscope UKJENT",
				description:
					"Teller Faro exception-logghendelser gruppert på tjeneste og trygg type, ikke unike feil eller berørte brukere. Runtime-miljø filtrerer ikke dette panelet fordi Faro-miljøfeltet ikke er verifisert. Dette dekker bare flater med konfigurert browsertelemetri. Rå value, melding og dynamisk URL hentes ikke inn i panelet.",
				refId: "Browserfeil",
				expr: browserByTypeQuery,
				renameByName: {
					type: "Feiltype",
					service_name: "Tjeneste",
				},
				indexByName: {
					service_name: 0,
					type: 1,
					"Value #Browserfeil": 2,
				},
				links: browserRowLinks(),
				valueLabel: "Logghendelser",
			}),
			"panel-6": tracedErrorsPanel(),
			"panel-7": tablePanel({
				id: 7,
				title: "Klassifiseringsdekning for runtimefeil",
				description:
					"Datakvalitet per tjeneste i valgt runtime-miljø uten top-k-begrensning. typed har en godkjent event-/exception-/error-type; code_only har bare kode; context_only har bare trygg operasjon eller kategori; rejected betyr at et kandidatfelt ikke bestod den konservative formatkontrollen; missing betyr at appen ikke oppga noen kjent klassifiseringskontekst. Loggernavn er valgfritt og teller ikke som klassifiseringsdekning. Panelet bruker aldri rå melding, stack eller URL.",
				refId: "Runtime-klassifiseringsdekning",
				expr: runtimeClassificationCoverageQuery,
				renameByName: {
					service_name: "Tjeneste",
					type_state: "Klassifiseringsstatus",
				},
				indexByName: {
					service_name: 0,
					type_state: 1,
					"Value #Runtime-klassifiseringsdekning": 2,
				},
				links: runtimeRowLinks(),
				panelLinks: runtimePanelLinks(),
				valueLabel: "Logghendelser",
			}),
		},
		layout: {
			kind: "GridLayout",
			spec: {
				items: [
					layoutItem("panel-1", 0, 0, 6, 5),
					layoutItem("panel-2", 6, 0, 6, 5),
					layoutItem("panel-3", 12, 0, 12, 5),
					layoutItem("panel-4", 0, 5, 12, 12),
					layoutItem("panel-5", 12, 5, 12, 12),
					layoutItem("panel-7", 0, 17, 24, 12),
					layoutItem("panel-6", 0, 29, 24, 12),
				],
			},
		},
		links: [],
		liveNow: false,
		preload: false,
		tags: ["team-esyfo", "errors", "observability", "managed-as-code"],
		timeSettings: {
			autoRefresh: "30s",
			autoRefreshIntervals: [
				"5s",
				"10s",
				"30s",
				"1m",
				"5m",
				"15m",
				"30m",
				"1h",
			],
			fiscalYearStartMonth: 0,
			from: "now-6h",
			hideTimepicker: false,
			to: "now",
			timezone: "browser",
		},
		title: "Team eSyfo – Feildrilldown",
		variables: [
			{
				kind: "CustomVariable",
				spec: {
					allowCustomValue: false,
					current: { text: "prod-gcp", value: "prod" },
					description:
						"Filtrerer bare runtimepanelene og styrer miljøet i runtime-lenker til APM og logger. Browserpanelene har ukjent miljøscope og påvirkes ikke.",
					hide: "dontHide",
					includeAll: false,
					label: "Runtime-miljø",
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
				kind: "CustomVariable",
				spec: {
					allValue: dashboardApplicationRegex,
					allowCustomValue: false,
					current: { text: "All", value: ["$__all"] },
					description:
						"Eksakt nåværende tjenestescope fra runtimeinventaret. Overgangstilstander vises i etiketten.",
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
