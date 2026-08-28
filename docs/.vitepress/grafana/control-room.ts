import {
	activeApplicationIds,
	runtimeInventory,
} from "../runtime/inventory.ts";
import type { Application, JourneyId } from "../runtime/model.ts";
import {
	dataLink,
	GRAFANA_VERSION,
	type GrafanaDashboardResource,
	grafanaVariable,
	LOKI_DATASOURCE_UID,
	layoutItem,
	MIMIR_DATASOURCE_UID,
	TEAM_ESYFO_DASHBOARD_FOLDER_UID,
} from "./dashboard-kit.ts";

export const CONTROL_ROOM_UID = "team-esyfo-control-room-v1";
export const CONTROL_ROOM_FOLDER_UID = TEAM_ESYFO_DASHBOARD_FOLDER_UID;
export const CONTROL_ROOM_JOURNEY_ID: JourneyId = "journey:late-follow-up";

const FROM = grafanaVariable("__from");
const TO = grafanaVariable("__to");
const FROM_ISO = grafanaVariable("__from:date:iso");
const TO_ISO = grafanaVariable("__to:date:iso");
const APP_VARIABLE = grafanaVariable("app:regex");
const ROW_VALUE = grafanaVariable("__value.raw");
const FIELD_SERVICE = grafanaVariable("__field.labels.service_name");

export const SPAN_CALLS_METRIC = "traces_spanmetrics_calls_total";
export const SPAN_LATENCY_METRIC = "traces_spanmetrics_latency_bucket";
export const RESTARTS_METRIC = "kube_pod_container_status_restarts_total";
export const READY_REPLICAS_METRIC = "kube_deployment_status_replicas_ready";
export const DESIRED_REPLICAS_METRIC = "kube_deployment_spec_replicas";

export const controlRoomApplications = runtimeInventory.applications.filter(
	(application) =>
		activeApplicationIds.has(application.id) &&
		application.context.journeyRefs.includes(CONTROL_ROOM_JOURNEY_ID),
);

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

export const controlRoomApplicationOptions = controlRoomApplications.map(
	(application) => ({
		text: lifecycleLabel(application),
		value: application.runtime.name,
	}),
);

const escapePromqlRegex = (value: string) =>
	value.replace(/[\\.^$|?*+()[\]{}]/g, "\\$&");

export const controlRoomApplicationRegex = `^(${controlRoomApplicationOptions
	.map(({ value }) => escapePromqlRegex(value))
	.join("|")})$`;

const spanSelector = [
	'service_namespace="team-esyfo"',
	'k8s_cluster_name="prod"',
	`service_name=~"${APP_VARIABLE}"`,
	'span_kind="SPAN_KIND_SERVER"',
].join(", ");
const fleetSpanSelector = [
	'service_namespace="team-esyfo"',
	'k8s_cluster_name="prod"',
	`service_name=~"${controlRoomApplicationRegex}"`,
	'span_kind="SPAN_KIND_SERVER"',
].join(", ");

const errorSpanSelector = `${spanSelector}, status_code="STATUS_CODE_ERROR"`;
const kubeContainerSelector = [
	'namespace="team-esyfo"',
	'k8s_cluster_name="prod"',
	`container=~"${APP_VARIABLE}"`,
].join(", ");
const kubeDeploymentSelector = [
	'namespace="team-esyfo"',
	'k8s_cluster_name="prod"',
	`deployment=~"${APP_VARIABLE}"`,
].join(", ");
const fleetKubeDeploymentSelector = [
	'namespace="team-esyfo"',
	'k8s_cluster_name="prod"',
	`deployment=~"${controlRoomApplicationRegex}"`,
].join(", ");

export const requestCountQuery = `sum(increase(${SPAN_CALLS_METRIC}{${spanSelector}}[$__range]))`;

const requestRateTotal = `sum(rate(${SPAN_CALLS_METRIC}{${spanSelector}}[$__rate_interval]))`;
const errorRateTotal = `sum(rate(${SPAN_CALLS_METRIC}{${errorSpanSelector}}[$__rate_interval]))`;

export const httpErrorCountQuery = `(sum(increase(${SPAN_CALLS_METRIC}{${errorSpanSelector}}[$__range])) or on() (sum(increase(${SPAN_CALLS_METRIC}{${spanSelector}}[$__range])) * 0)) and on() (sum(increase(${SPAN_CALLS_METRIC}{${spanSelector}}[$__range])) > 0)`;

export const httpErrorRatioQuery = `(100 * ((${errorRateTotal} or on() (${requestRateTotal} * 0)) / ${requestRateTotal})) and on() (${requestRateTotal} > 0)`;

export const p95LatencyQuery = `(histogram_quantile(0.95, sum by (le) (rate(${SPAN_LATENCY_METRIC}{${spanSelector}}[$__rate_interval])))) and on() (${requestRateTotal} > 0)`;

const runtimeSelector = `{service_namespace="team-esyfo", k8s_cluster_name="prod", service_name=~"${APP_VARIABLE}"}`;
const runtimeNoiseFilter =
	"| k8s_container_name !~ `secure-logs-fluentbit|cloudsql-proxy|wonderwall|elector`";
const runtimeErrorFilter = "| detected_level=~`(?i)(error|critical|fatal)`";
const runtimeActivityTotal = `sum(count_over_time(${runtimeSelector} ${runtimeNoiseFilter} [$__range]))`;
const runtimeErrorsTotal = `sum(count_over_time(${runtimeSelector} ${runtimeNoiseFilter} ${runtimeErrorFilter} [$__range]))`;

export const runtimeErrorCountQuery = `(${runtimeErrorsTotal} or on() (${runtimeActivityTotal} * 0)) and on() (${runtimeActivityTotal} > 0)`;

export const restartCountQuery = `sum(max by (pod, container) (increase(${RESTARTS_METRIC}{${kubeContainerSelector}}[24h])))`;

const readyByDeployment = `max by (deployment) (${READY_REPLICAS_METRIC}{${kubeDeploymentSelector}})`;
const desiredByDeployment = `max by (deployment) (${DESIRED_REPLICAS_METRIC}{${kubeDeploymentSelector}})`;
const readyWithDesiredFallback = `(${readyByDeployment} or on(deployment) (${desiredByDeployment} * 0))`;
const fleetDesiredByDeployment = `max by (deployment) (${DESIRED_REPLICAS_METRIC}{${fleetKubeDeploymentSelector}})`;

export const lowestReadyRatioQuery = `min(100 * ${readyWithDesiredFallback} / ${desiredByDeployment})`;

const fleetCurrentSpanSeriesByService = `max by (service_name) (timestamp(${SPAN_CALLS_METRIC}{${fleetSpanSelector}}))`;
const recentSpanSeriesByService = `max by (service_name) (max_over_time(timestamp(${SPAN_CALLS_METRIC}{${spanSelector}})[30m:]))`;

export const deploymentCoverageQuery = `100 * ((count(${fleetDesiredByDeployment}) or on() vector(0)) / ${controlRoomApplications.length})`;

export const telemetryCoverageQuery = `100 * ((count(${fleetCurrentSpanSeriesByService}) or on() vector(0)) / ${controlRoomApplications.length})`;

export const requestRateByServiceQuery = `sum by (service_name) (rate(${SPAN_CALLS_METRIC}{${spanSelector}}[$__rate_interval]))`;

const requestRateByService = `sum by (service_name) (rate(${SPAN_CALLS_METRIC}{${spanSelector}}[$__rate_interval]))`;
const errorRateByService = `sum by (service_name) (rate(${SPAN_CALLS_METRIC}{${errorSpanSelector}}[$__rate_interval]))`;

export const errorRatioByServiceQuery = `(100 * ((${errorRateByService} or on(service_name) (${requestRateByService} * 0)) / ${requestRateByService})) and on(service_name) (${requestRateByService} > 0)`;

export const p95ByServiceQuery = `(histogram_quantile(0.95, sum by (service_name, le) (rate(${SPAN_LATENCY_METRIC}{${spanSelector}}[$__rate_interval])))) and on(service_name) (${requestRateByService} > 0)`;

const runtimeActivityByService = `sum by (service_name) (count_over_time(${runtimeSelector} ${runtimeNoiseFilter} [$__range]))`;
const runtimeErrorsByService = `sum by (service_name) (count_over_time(${runtimeSelector} ${runtimeNoiseFilter} ${runtimeErrorFilter} [$__range]))`;

export const runtimeErrorsByServiceQuery = `(${runtimeErrorsByService} or on(service_name) (${runtimeActivityByService} * 0)) and on(service_name) (${runtimeActivityByService} > 0)`;

export const restartsByServiceQuery = `sum by (container) (max by (pod, container) (increase(${RESTARTS_METRIC}{${kubeContainerSelector}}[24h])))`;

export const readyRatioByServiceQuery = `100 * ${readyWithDesiredFallback} / ${desiredByDeployment}`;

export const telemetryAgeByServiceQuery = `time() - ${recentSpanSeriesByService}`;

export const apmDataLink = (service: string) =>
	`/a/nais-apm-app/services/team-esyfo/${service}?environment=prod&from=${FROM_ISO}&to=${TO_ISO}`;

export const runtimeLogsDataLink = (service: string) =>
	`/a/grafana-lokiexplore-app/explore/service/${service}/logs?from=${FROM}&to=${TO}&var-ds=${LOKI_DATASOURCE_UID}&var-filters=service_name%7C%3D%7C${service}&var-filters=service_namespace%7C%3D%7Cteam-esyfo&var-filters=k8s_cluster_name%7C%3D%7Cprod`;

export const errorDashboardDataLink = (service: string) =>
	`/d/team-esyfo-error-drilldown/team-esyfo-e28093-feildrilldown?orgId=1&from=${FROM}&to=${TO}&var-app=${service}`;

const serviceDataLinks = (service: string) => [
	dataLink("Åpne tjenesten i NAIS APM", apmDataLink(service)),
	dataLink("Åpne avgrenset loggsøk", runtimeLogsDataLink(service)),
	dataLink("Åpne Feildrilldown", errorDashboardDataLink(service)),
];

type PanelQuery = Record<string, unknown>;

const prometheusQuery = (
	refId: string,
	expr: string,
	queryType: "instant" | "range",
	legendFormat = "",
	format?: "table",
): PanelQuery => ({
	kind: "PanelQuery",
	spec: {
		hidden: false,
		query: {
			datasource: { name: MIMIR_DATASOURCE_UID },
			group: "prometheus",
			kind: "DataQuery",
			spec: {
				editorMode: "code",
				exemplar: queryType === "range",
				expr,
				...(format ? { format } : {}),
				instant: queryType === "instant",
				interval: "",
				legendFormat,
				range: queryType === "range",
			},
			version: "v0",
		},
		refId,
	},
});

const lokiQuery = (refId: string, expr: string): PanelQuery => ({
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
				queryType: "instant",
			},
			version: "v0",
		},
		refId,
	},
});

const queryGroup = (
	queries: PanelQuery[],
	transformations: Array<Record<string, unknown>> = [],
) => ({
	kind: "QueryGroup",
	spec: { queries, queryOptions: {}, transformations },
});

type Threshold = { color: string; value: number };

const statPanel = ({
	id,
	title,
	description,
	query,
	unit,
	thresholds,
	colorMode = "value",
	decimals,
}: {
	id: number;
	title: string;
	description: string;
	query: PanelQuery;
	unit: string;
	thresholds: Threshold[];
	colorMode?: "none" | "value";
	decimals?: number;
}) => ({
	kind: "Panel",
	spec: {
		data: queryGroup([query]),
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
						...(decimals === undefined ? {} : { decimals }),
						noValue: "Ukjent",
						thresholds: { mode: "absolute", steps: thresholds },
						unit,
					},
					overrides: [],
				},
				options: {
					colorMode,
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

const timeSeriesPanel = ({
	id,
	title,
	description,
	refId,
	expr,
	legendFormat,
	unit,
	thresholds,
}: {
	id: number;
	title: string;
	description: string;
	refId: string;
	expr: string;
	legendFormat: string;
	unit: string;
	thresholds: Threshold[];
}) => ({
	kind: "Panel",
	spec: {
		data: queryGroup([prometheusQuery(refId, expr, "range", legendFormat)]),
		description,
		id,
		links: [],
		title,
		vizConfig: {
			group: "timeseries",
			kind: "VizConfig",
			spec: {
				fieldConfig: {
					defaults: {
						color: { mode: "palette-classic" },
						custom: {
							axisBorderShow: false,
							axisCenteredZero: false,
							axisColorMode: "text",
							axisLabel: "",
							axisPlacement: "auto",
							barAlignment: 0,
							barWidthFactor: 0.6,
							drawStyle: "line",
							fillOpacity: 8,
							gradientMode: "none",
							hideFrom: { legend: false, tooltip: false, viz: false },
							insertNulls: false,
							lineInterpolation: "linear",
							lineWidth: 1,
							pointSize: 5,
							scaleDistribution: { type: "linear" },
							showPoints: "never",
							spanNulls: false,
							stacking: { group: "A", mode: "none" },
							thresholdsStyle: { mode: "off" },
						},
						links: serviceDataLinks(FIELD_SERVICE),
						noValue: "Ukjent",
						thresholds: { mode: "absolute", steps: thresholds },
						unit,
					},
					overrides: [],
				},
				options: {
					legend: {
						calcs: ["lastNotNull", "max"],
						displayMode: "table",
						placement: "bottom",
						showLegend: true,
					},
					tooltip: { hideZeros: false, mode: "multi", sort: "desc" },
				},
			},
			version: GRAFANA_VERSION,
		},
	},
});

const organizeTable = (
	refId: string,
	label: string,
	labelTitle: string,
	valueTitle: string,
) => ({
	group: "organize",
	kind: "Transformation",
	spec: {
		options: {
			excludeByName: { Time: true },
			includeByName: {},
			indexByName: { [label]: 0, Value: 1, [`Value #${refId}`]: 1 },
			renameByName: {
				[label]: labelTitle,
				Value: valueTitle,
				[`Value #${refId}`]: valueTitle,
			},
		},
	},
});

const mergeTableFrames = {
	group: "merge",
	kind: "Transformation",
	spec: { options: {} },
};

const tablePanel = ({
	id,
	title,
	description,
	query,
	refId,
	label,
	labelTitle,
	valueTitle,
	unit,
	thresholds,
	decimals,
}: {
	id: number;
	title: string;
	description: string;
	query: PanelQuery;
	refId: string;
	label: "service_name" | "container" | "deployment";
	labelTitle: string;
	valueTitle: string;
	unit: string;
	thresholds: Threshold[];
	decimals?: number;
}) => ({
	kind: "Panel",
	spec: {
		data: queryGroup(
			[query],
			[mergeTableFrames, organizeTable(refId, label, labelTitle, valueTitle)],
		),
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
						noValue: "Ukjent",
						...(decimals === undefined ? {} : { decimals }),
						thresholds: { mode: "absolute", steps: thresholds },
						unit,
					},
					overrides: [
						{
							matcher: { id: "byName", options: label },
							properties: [{ id: "links", value: serviceDataLinks(ROW_VALUE) }],
						},
						...["Value", `Value #${refId}`].map((fieldName) => ({
							matcher: { id: "byName", options: fieldName },
							properties: [
								{ id: "custom.cellOptions", value: { type: "color-text" } },
								{ id: "custom.width", value: 150 },
							],
						})),
					],
				},
				options: {
					cellHeight: "sm",
					enablePagination: false,
					showHeader: true,
					sortBy: [{ desc: true, displayName: valueTitle }],
				},
			},
			version: GRAFANA_VERSION,
		},
	},
});

const textPanel = (
	id: number,
	title: string,
	description: string,
	content: string,
) => ({
	kind: "Panel",
	spec: {
		data: queryGroup([]),
		description,
		id,
		links: [],
		title,
		vizConfig: {
			group: "text",
			kind: "VizConfig",
			spec: {
				fieldConfig: { defaults: {}, overrides: [] },
				options: { content, mode: "markdown" },
			},
			version: GRAFANA_VERSION,
		},
	},
});

const errorThresholds: Threshold[] = [
	{ color: "green", value: 0 },
	{ color: "yellow", value: 1 },
	{ color: "red", value: 5 },
];
const countThresholds: Threshold[] = [
	{ color: "green", value: 0 },
	{ color: "red", value: 1 },
];
const runtimeErrorThresholds: Threshold[] = [
	{ color: "gray", value: 0 },
	{ color: "red", value: 1 },
];
const latencyThresholds: Threshold[] = [
	{ color: "green", value: 0 },
	{ color: "yellow", value: 5 },
];
const readyThresholds: Threshold[] = [
	{ color: "red", value: 0 },
	{ color: "yellow", value: 99.999 },
	{ color: "green", value: 100 },
];
const freshnessThresholds: Threshold[] = [
	{ color: "green", value: 0 },
	{ color: "yellow", value: 300 },
	{ color: "red", value: 900 },
];

const scopeMarkdown = () => {
	const services = controlRoomApplications
		.map(({ runtime }) => `\`${runtime.name}\``)
		.join(", ");
	const missingRunbooks = controlRoomApplications
		.filter(({ runbook }) => runbook.status === "missing")
		.map(({ runtime }) => `\`${runtime.name}\``)
		.join(", ");

	return `### Sen oppfølging · første tracer i Kontrollrom v1

**Brukerinnvirkning** og **teknisk helse** vurderes uavhengig. SERVER-spans med OTel-feilstatus, request-rate og latency sier hva som er påvist i synkrone kall; runtimefeil, restarts, replikaer og telemetrydekning kan samtidig vise teknisk degradering. Ingen samlet grønn status skjuler et rødt teknisk signal.

Scope fra runtimeinventaret: ${services}. Manglende runbooks: ${missingRunbooks} ([#211](https://github.com/navikt/team-esyfo/issues/211)). Browserpåvirkning kommer etter kontrakten i [#206](https://github.com/navikt/team-esyfo/issues/206); SLO-burn kan kobles inn etter alertkartleggingen i [#203](https://github.com/navikt/team-esyfo/issues/203) og policybeslutningen i [#210](https://github.com/navikt/team-esyfo/issues/210).`;
};

const pipelineMarkdown = () => `### Sykepengedager-datakjeden · ikke evaluert

\`Infotrygd/AAP/Spleis → sykepengedager-informasjon → PostgreSQL → team-esyfo.sykepengedager-informasjon-topic → meroppfolging-backend\`

Denne tracer-slicen dekker HTTP- og runtimehelse. Den sier **ikke** at Kafka-flyten er frisk: consumer lag, siste vellykkede materialisering, publish success/failure, failed-send-kø og end-to-end-ferskhet mangler en godkjent kontrakt. Derfor står datakjeden som ukjent fram til [#212](https://github.com/navikt/team-esyfo/issues/212), ikke som grønn. Airflow er en ekstern sekundærkonsument og er utenfor teamets scope.`;

export const buildControlRoomDashboard = (): GrafanaDashboardResource => ({
	apiVersion: "dashboard.grafana.app/v2",
	kind: "Dashboard",
	metadata: {
		annotations: { "grafana.app/folder": CONTROL_ROOM_FOLDER_UID },
		name: CONTROL_ROOM_UID,
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
			"Hendelsesinngang for brukerinnvirkning og teknisk helse i Team eSyfo. Første inventardrevne tracer dekker Sen oppfølging.",
		editable: true,
		elements: {
			"panel-1": textPanel(
				1,
				"Slik leses kontrollrommet",
				"Scope, tilstandsmodell og eksplisitte dekningsgap.",
				scopeMarkdown(),
			),
			"panel-2": statPanel({
				id: 2,
				title: "Requests",
				description:
					"Antall inbound SERVER-spans i valgt tidsrom. 0 betyr observert nulltrafikk; Ukjent betyr at spørringen ikke ga telemetry.",
				query: prometheusQuery("Requests totalt", requestCountQuery, "instant"),
				unit: "short",
				thresholds: [{ color: "blue", value: 0 }],
				colorMode: "none",
				decimals: 0,
			}),
			"panel-3": statPanel({
				id: 3,
				title: "HTTP-feil",
				description:
					"Antall SERVER-spans med OTel STATUS_CODE_ERROR i valgt tidsrom. Null fylles bare når requestserien finnes.",
				query: prometheusQuery(
					"HTTP-feil totalt",
					httpErrorCountQuery,
					"instant",
				),
				unit: "short",
				thresholds: countThresholds,
				decimals: 0,
			}),
			"panel-4": statPanel({
				id: 4,
				title: "HTTP-feilrate",
				description:
					"Andel SERVER-spans med OTel STATUS_CODE_ERROR. Ingen trafikk gir Ukjent. Verdien er observasjon, ikke en vedtatt SLO-grense.",
				query: prometheusQuery("HTTP-feilrate", httpErrorRatioQuery, "instant"),
				unit: "percent",
				thresholds: errorThresholds,
				colorMode: "none",
				decimals: 2,
			}),
			"panel-5": statPanel({
				id: 5,
				title: "P95 latency",
				description:
					"P95 for inbound SERVER-spans. Histogrammer slås statistisk sammen for valgte tjenester. Ingen trafikk gir Ukjent; verdien er ikke en vedtatt SLO-grense.",
				query: prometheusQuery("P95", p95LatencyQuery, "instant"),
				unit: "s",
				thresholds: latencyThresholds,
				colorMode: "none",
			}),
			"panel-6": statPanel({
				id: 6,
				title: "Runtimefeil",
				description:
					"Feillogger med positivt detected_level=error|critical|fatal i valgt tidsrom. Null forankres i observert loggaktivitet, men er nøytral fordi komplett loggdekning ikke er bevist.",
				query: lokiQuery("Runtimefeil totalt", runtimeErrorCountQuery),
				unit: "short",
				thresholds: runtimeErrorThresholds,
				decimals: 0,
			}),
			"panel-7": statPanel({
				id: 7,
				title: "Restarts · 24t",
				description:
					"Containerrestarts siste 24 timer, uavhengig av valgt dashboardtidsrom.",
				query: prometheusQuery("Restarts totalt", restartCountQuery, "instant"),
				unit: "short",
				thresholds: countThresholds,
				decimals: 0,
			}),
			"panel-8": statPanel({
				id: 8,
				title: "Laveste replika-dekning",
				description:
					"Laveste andel klare/ønskede replikaer blant valgte deployments. Manglende kube-telemetry gir Ukjent.",
				query: prometheusQuery(
					"Laveste replika-dekning",
					lowestReadyRatioQuery,
					"instant",
				),
				unit: "percent",
				thresholds: readyThresholds,
				decimals: 1,
			}),
			"panel-9": statPanel({
				id: 9,
				title: "Span-dekning · tracer",
				description:
					"Inventarforankret andel av tracerens fire tjenester med en aktuell SERVER-spanserie. Signalet gjelder hele traceren selv når tjenestefilteret endres.",
				query: prometheusQuery(
					"Telemetrydekning",
					telemetryCoverageQuery,
					"instant",
				),
				unit: "percent",
				thresholds: readyThresholds,
				decimals: 0,
			}),
			"panel-18": statPanel({
				id: 18,
				title: "Kube-dekning · tracer",
				description:
					"Inventarforankret andel av tracerens fire forventede deployments med kube deployment-telemetry. Signalet gjelder hele traceren.",
				query: prometheusQuery(
					"Kube-dekning",
					deploymentCoverageQuery,
					"instant",
				),
				unit: "percent",
				thresholds: readyThresholds,
				decimals: 0,
			}),
			"panel-10": timeSeriesPanel({
				id: 10,
				title: "Request-rate per tjeneste",
				description:
					"Inbound SERVER-spans per sekund. Klikk en serie for APM, avgrensede logger eller Feildrilldown.",
				refId: "Rate per tjeneste",
				expr: requestRateByServiceQuery,
				legendFormat: "{{service_name}}",
				unit: "reqps",
				thresholds: [{ color: "green", value: 0 }],
			}),
			"panel-11": timeSeriesPanel({
				id: 11,
				title: "HTTP-feilrate per tjeneste",
				description:
					"0 % vises bare når tjenesten har request-telemetry. No data kan være nulltrafikk eller manglende telemetry og må leses sammen med rate og ferskhet.",
				refId: "Feilrate per tjeneste",
				expr: errorRatioByServiceQuery,
				legendFormat: "{{service_name}}",
				unit: "percent",
				thresholds: errorThresholds,
			}),
			"panel-12": timeSeriesPanel({
				id: 12,
				title: "P95 per tjeneste",
				description: "P95 response time for inbound SERVER-spans per tjeneste.",
				refId: "P95 per tjeneste",
				expr: p95ByServiceQuery,
				legendFormat: "{{service_name}}",
				unit: "s",
				thresholds: latencyThresholds,
			}),
			"panel-13": tablePanel({
				id: 13,
				title: "Runtimefeil per tjeneste",
				description:
					"Tekniske feil i valgt tidsrom. Tom tabell betyr ingen kvalifiserende feiltreff, ikke nødvendigvis komplett telemetry.",
				query: lokiQuery("Runtimefeil", runtimeErrorsByServiceQuery),
				refId: "Runtimefeil",
				label: "service_name",
				labelTitle: "Tjeneste",
				valueTitle: "Feil",
				unit: "short",
				thresholds: runtimeErrorThresholds,
				decimals: 0,
			}),
			"panel-14": tablePanel({
				id: 14,
				title: "Restarts per tjeneste · 24t",
				description:
					"Containerrestarts siste 24 timer. Radlenkene åpner samme runtime i APM, logger og Feildrilldown.",
				query: prometheusQuery(
					"Restarts",
					restartsByServiceQuery,
					"instant",
					"",
					"table",
				),
				refId: "Restarts",
				label: "container",
				labelTitle: "Tjeneste",
				valueTitle: "Restarts",
				unit: "short",
				thresholds: countThresholds,
				decimals: 0,
			}),
			"panel-15": tablePanel({
				id: 15,
				title: "Replika-dekning per tjeneste",
				description:
					"Klare/ønskede replikaer akkurat nå. 100 % er grønt; lavere verdi krever inspeksjon.",
				query: prometheusQuery(
					"Replika-dekning",
					readyRatioByServiceQuery,
					"instant",
					"",
					"table",
				),
				refId: "Replika-dekning",
				label: "deployment",
				labelTitle: "Tjeneste",
				valueTitle: "Klare replikaer",
				unit: "percent",
				thresholds: readyThresholds,
			}),
			"panel-16": tablePanel({
				id: 16,
				title: "Telemetryferskhet per tjeneste",
				description:
					"Sekunder siden siste SERVER-spanmetric-sample, med 30 minutters lookback. En manglende rad betyr at tjenesten ikke har et sample i vinduet.",
				query: prometheusQuery(
					"Telemetryferskhet",
					telemetryAgeByServiceQuery,
					"instant",
					"",
					"table",
				),
				refId: "Telemetryferskhet",
				label: "service_name",
				labelTitle: "Tjeneste",
				valueTitle: "Alder",
				unit: "s",
				thresholds: freshnessThresholds,
			}),
			"panel-17": textPanel(
				17,
				"Datakjedestatus",
				"Eksplisitt ukjent tilstand for den delen av hybridtjenesten som ikke kan bevises med HTTP-signaler.",
				pipelineMarkdown(),
			),
		},
		layout: {
			kind: "GridLayout",
			spec: {
				items: [
					layoutItem("panel-1", 0, 0, 24, 7),
					layoutItem("panel-2", 0, 7, 6, 5),
					layoutItem("panel-3", 6, 7, 6, 5),
					layoutItem("panel-4", 12, 7, 6, 5),
					layoutItem("panel-5", 18, 7, 6, 5),
					layoutItem("panel-6", 0, 12, 5, 5),
					layoutItem("panel-7", 5, 12, 5, 5),
					layoutItem("panel-8", 10, 12, 5, 5),
					layoutItem("panel-9", 15, 12, 5, 5),
					layoutItem("panel-18", 20, 12, 4, 5),
					layoutItem("panel-10", 0, 17, 8, 10),
					layoutItem("panel-11", 8, 17, 8, 10),
					layoutItem("panel-12", 16, 17, 8, 10),
					layoutItem("panel-13", 0, 27, 12, 10),
					layoutItem("panel-14", 12, 27, 12, 10),
					layoutItem("panel-15", 0, 37, 12, 10),
					layoutItem("panel-16", 12, 37, 12, 10),
					layoutItem("panel-17", 0, 47, 24, 8),
				],
			},
		},
		// Grafana 13 rejects legacy dashboard-level links during import. The same
		// destinations remain available as panel and row data links.
		links: [],
		liveNow: false,
		preload: false,
		tags: ["team-esyfo", "control-room", "observability", "managed-as-code"],
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
		title: "Team eSyfo – Kontrollrom",
		variables: [
			{
				kind: "CustomVariable",
				spec: {
					allValue: controlRoomApplicationRegex,
					allowCustomValue: false,
					current: { text: "All", value: ["$__all"] },
					description:
						"Inventardrevet scope for første tracer: Sen oppfølging.",
					hide: "dontHide",
					includeAll: true,
					label: "Tjeneste",
					multi: true,
					name: "app",
					options: [],
					query: controlRoomApplicationOptions
						.map(({ text, value }) => `${text} : ${value}`)
						.join(","),
					skipUrlSync: false,
					valuesFormat: "csv",
				},
			},
		],
	},
});

export const serializeControlRoomDashboard = () =>
	`${JSON.stringify(buildControlRoomDashboard(), null, 2)}\n`;
