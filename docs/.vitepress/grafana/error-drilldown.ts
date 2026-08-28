import {
	activeApplicationIds,
	runtimeInventory,
} from "../runtime/inventory.ts";
import type { Application } from "../runtime/model.ts";

export const ERROR_DASHBOARD_UID = "team-esyfo-error-drilldown";
export const ERROR_DASHBOARD_FOLDER_UID = "K-1b-N_4k";
export const LOKI_DATASOURCE_UID = "PEA2100DC89AE9FE2";
export const TEMPO_DATASOURCE_UID = "P8A28344D07741F8D";

const GRAFANA_VERSION = "13.1.2";
const grafanaVariable = (name: string) => `\${${name}}`;
const APP_VARIABLE = grafanaVariable("app:regex");
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

const runtimeSelector = `{service_namespace="team-esyfo", k8s_cluster_name=~"prod|prod-fss", service_name=~"${APP_VARIABLE}"}`;
const runtimeNoiseFilter =
	"| k8s_container_name !~ `secure-logs-fluentbit|cloudsql-proxy|wonderwall|elector`";
const runtimeErrorFilter = "| detected_level=~`(?i)(error|critical|fatal)`";

export const runtimeTotalQuery = `sum(count_over_time(${runtimeSelector} ${runtimeNoiseFilter} ${runtimeErrorFilter} [$__range])) or on() vector(0)`;

export const runtimeByServiceQuery = `topk(50, sum by(service_name) (count_over_time(${runtimeSelector} ${runtimeNoiseFilter} ${runtimeErrorFilter} [$__range])))`;

const browserSelector = `{kind="exception", service_name=~"${APP_VARIABLE}"}`;

export const browserTotalQuery = `sum(count_over_time(${browserSelector} [$__range])) or on() vector(0)`;

export const browserByTypeQuery = `topk(50, sum by(service_name, type) (count_over_time(${browserSelector} | logfmt | __error__="" | type!="" [$__range])))`;

export const tracedRuntimeErrorsQuery = `${runtimeSelector}
${runtimeNoiseFilter}
${runtimeErrorFilter}
| json logger_name, trace_id
| __error__=""
| trace_id!=""
| label_format error_group=\`{{ if .logger_name }}{{ .logger_name }}{{ else }}uklassifisert{{ end }}\`
| line_format \`{{ .error_group }}\`
| keep service_name, error_group, trace_id
| drop __error__, __error_details__`;

export const apmDataLink = (service: string) =>
	`/a/nais-apm-app/services/team-esyfo/${service}?environment=prod&from=${FROM_ISO}&to=${TO_ISO}`;

export const runtimeLogsDataLink = (service: string) =>
	`/a/grafana-lokiexplore-app/explore/service/${service}/logs?from=${FROM}&to=${TO}&var-ds=${LOKI_DATASOURCE_UID}&var-filters=service_name%7C%3D%7C${service}&var-filters=service_namespace%7C%3D%7Cteam-esyfo&var-filters=k8s_cluster_name%7C%3D%7Cprod`;

export const browserLogsDataLink = (service: string) =>
	`/a/grafana-lokiexplore-app/explore/service/${service}/logs?from=${FROM}&to=${TO}&var-ds=${LOKI_DATASOURCE_UID}&var-filters=service_name%7C%3D%7C${service}&var-filters=kind%7C%3D%7Cexception`;

export const traceDataLink = (traceId: string) =>
	`/a/grafana-exploretraces-app/explore?from=${ROW_TIME}&to=${ROW_TIME}&var-ds=${TEMPO_DATASOURCE_UID}&traceId=${traceId}`;

const dataLink = (title: string, url: string) => ({
	targetBlank: true,
	title,
	url,
});

const runtimeRowLinks = () => [
	dataLink("Åpne tjenesten i NAIS APM", apmDataLink(ROW_VALUE)),
	dataLink("Åpne avgrenset runtime-loggsøk", runtimeLogsDataLink(ROW_VALUE)),
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
				...(queryType === "range" ? { maxLines: 100 } : {}),
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
) => ({
	group: "organize",
	kind: "Transformation",
	spec: {
		options: {
			excludeByName: { Time: true },
			includeByName: {},
			indexByName,
			renameByName: {
				[`Value #${refId}`]: "Antall",
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
}: {
	id: number;
	title: string;
	description: string;
	refId: string;
	expr: string;
	renameByName: Record<string, string>;
	indexByName: Record<string, number>;
	links: Array<Record<string, unknown>>;
}) => ({
	kind: "Panel",
	spec: {
		data: queryGroup(lokiQuery(refId, expr, "instant"), [
			organizeTable(refId, renameByName, indexByName),
		]),
		description,
		id,
		links: [],
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
							matcher: { id: "byName", options: "Antall" },
							properties: [{ id: "custom.width", value: 100 }],
						},
					],
				},
				options: {
					cellHeight: "sm",
					enablePagination: true,
					showHeader: true,
					sortBy: [{ desc: true, displayName: "Antall" }],
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

- **Scope:** ${dashboardApplications.length} nåværende runtimes fra det godkjente inventaret. Overgang: ${lifecycleNotes}.
- **Browser:** ${configuredBrowserServices.length}/${dashboardBrowserSurfaces.length} flater har konfigurert telemetry. Mangler: ${browserGaps}. Følges i [#206](https://github.com/navikt/team-esyfo/issues/206).
- **APM:** ${dashboardApplications.length - unverifiedApmServices.length}/${dashboardApplications.length} tjenester er sett i prod-katalogen. Uverifisert: ${apmGaps}.
- **Tolkning:** 0 betyr at count-spørringen lyktes uten feiltreff. Tom tabell betyr ingen kvalifiserende treff, ikke at telemetry er komplett. Datakilde- og syntaksfeil skal stå som feil/ukjent.`;
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
								error_group: 2,
								trace_id: 3,
							},
							renameByName: {
								Time: "Tidspunkt",
								service_name: "Tjeneste",
								error_group: "Feilgruppe",
								trace_id: "Trace",
							},
						},
					},
				},
			],
		),
		description:
			"Viser bare tid, tjeneste og trygg loggergruppe. Trace-ID vises ikke, men brukes i handlingen Åpne trace. Loki erstatter original feillinje før resultatet returneres. Klikk tjenesten for APM eller et avgrenset loggsøk.",
		id: 6,
		links: [],
		title: "Nylige runtimefeil med trace",
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
							matcher: { id: "byName", options: "trace_id" },
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

const layoutItem = (
	name: string,
	x: number,
	y: number,
	width: number,
	height: number,
) => ({
	kind: "GridLayoutItem",
	spec: {
		element: { kind: "ElementReference", name },
		height,
		width,
		x,
		y,
	},
});

export interface GrafanaDashboardResource {
	apiVersion: string;
	kind: "Dashboard";
	metadata: {
		annotations: { "grafana.app/folder": string };
		name: string;
	};
	spec: Record<string, unknown>;
}

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
			"Personvernsikker drilldown for runtime- og browserfeil i Team eSyfos nåværende produksjonsflåte. Generert fra runtimeinventaret i navikt/team-esyfo.",
		editable: true,
		elements: {
			"panel-1": statPanel(
				1,
				"Runtimefeil",
				"Antall runtimefeil med positivt verifisert detected_level i valgt tidsrom. 0 er et vellykket tomt resultat; datakildefeil er ukjent.",
				"Runtimefeil totalt",
				runtimeTotalQuery,
			),
			"panel-2": statPanel(
				2,
				"Browserfeil",
				"Antall faktiske Faro exception-hendelser i valgt tidsrom. Dette sier ikke at alle browserflater har telemetry.",
				"Browserfeil totalt",
				browserTotalQuery,
			),
			"panel-3": textPanel(),
			"panel-4": tablePanel({
				id: 4,
				title: "Runtimefeil per tjeneste",
				description:
					"Teller alle runtimeformater med positivt detected_level uten å laste rå feilmelding. Klikk tjenesten for APM eller et tids- og tjenesteavgrenset loggsøk.",
				refId: "Runtimefeil",
				expr: runtimeByServiceQuery,
				renameByName: { service_name: "Tjeneste" },
				indexByName: { service_name: 0, "Value #Runtimefeil": 1 },
				links: runtimeRowLinks(),
			}),
			"panel-5": tablePanel({
				id: 5,
				title: "Browserfeil per tjeneste og type",
				description:
					"Grupperer Faro exception på tjeneste og trygg type. Rå value, melding og dynamisk URL hentes ikke inn i panelet.",
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
			}),
			"panel-6": tracedErrorsPanel(),
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
					layoutItem("panel-6", 0, 17, 24, 12),
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
					allValue: dashboardApplicationRegex,
					allowCustomValue: false,
					current: { text: "All", value: ["$__all"] },
					description:
						"Eksakt nåværende produksjonsscope fra runtimeinventaret. Overgangstilstander vises i etiketten.",
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
