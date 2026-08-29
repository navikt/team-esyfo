import {
	BROWSER_RUNBOOK_URL,
	BUDSTIKKA_RUNBOOK_URL,
	browserCoverageMarkdown,
	controlRoomApplicationOptions,
	controlRoomApplications,
	controlRoomBrowserSurfaces,
	controlRoomScopeOptions,
	controlRoomServerApplications,
	coverageMarkdown,
	DESERIALIZATION_RUNBOOK_URL,
	jobCoverageMarkdown,
	lifecycleLabel,
	lifecycleMarkdown,
	MOTEBEHOV_RUNBOOK_URL,
	PIPELINE_RUNBOOK_URL,
	pagerReadinessMarkdown,
	pipelineCoverageMarkdown,
	RUNTIME_RUNBOOK_URL,
	scopeMarkdown,
} from "./control-room-scope.ts";
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

const FROM = grafanaVariable("__from");
const TO = grafanaVariable("__to");
const FROM_ISO = grafanaVariable("__from:date:iso");
const TO_ISO = grafanaVariable("__to:date:iso");
const SCOPE_VARIABLE = grafanaVariable("scope:raw");
const SERVICE_VARIABLE = grafanaVariable("service:raw");
const ROW_VALUE = grafanaVariable("__value.raw");
const FIELD_SERVICE = grafanaVariable("__field.labels.service_name");

export const SPAN_CALLS_METRIC = "traces_spanmetrics_calls_total";
export const SPAN_LATENCY_METRIC = "traces_spanmetrics_latency_bucket";
export const RESTARTS_METRIC = "kube_pod_container_status_restarts_total";
export const READY_REPLICAS_METRIC = "kube_deployment_status_replicas_ready";
export const DESIRED_REPLICAS_METRIC = "kube_deployment_spec_replicas";
export const JOB_FAILED_METRIC = "kube_job_failed";
export const BUDSTIKKA_LAG_METRIC =
	"kafka_consumer_fetch_manager_records_lag_max";
export const DESERIALIZATION_ERROR_METRIC =
	"syfo_oppfolgingsplan_backend_sykmelding_deserialization_error_total";

const expectedApplicationVector = (
	applications: typeof controlRoomApplications,
) =>
	applications
		.map(({ runtime, criticality, lifecycle, role }) => {
			const labels = [
				["service_name", runtime.name],
				["criticality", criticality],
				["lifecycle", lifecycleLabel(lifecycle)],
				["role", role],
			] as const;
			return labels.reduce(
				(expression, [label, value]) =>
					`label_replace(${expression}, "${label}", "${value}", "", ".*")`,
				"vector(1)",
			);
		})
		.join(" or ");

const allExpectedApplicationVector = expectedApplicationVector(
	controlRoomApplications,
);
const serverExpectedApplicationVector = expectedApplicationVector(
	controlRoomServerApplications,
);

const scopeMarker =
	'label_replace(vector(1), "__control_room_scope", "selected", "", ".*")';

const expectedScopeVector = (vector: string) =>
	`(label_replace((${vector}), "__control_room_scope", "selected", "service_name", "${SCOPE_VARIABLE}")) and on(__control_room_scope) (${scopeMarker})`;

export const expectedScopeVectorQuery = expectedScopeVector(
	allExpectedApplicationVector,
);
export const expectedServerScopeVectorQuery = expectedScopeVector(
	serverExpectedApplicationVector,
);

const spanSelector = (serviceMatcher: string) =>
	[
		'service_namespace="team-esyfo"',
		'k8s_cluster_name="prod"',
		serviceMatcher,
		'span_kind="SPAN_KIND_SERVER"',
	].join(", ");

const fleetSpanSelector = spanSelector(`service_name=~"${SCOPE_VARIABLE}"`);
const selectedSpanSelector = spanSelector(`service_name="${SERVICE_VARIABLE}"`);
const fleetErrorSpanSelector = `${fleetSpanSelector}, status_code="STATUS_CODE_ERROR"`;
const selectedErrorSpanSelector = `${selectedSpanSelector}, status_code="STATUS_CODE_ERROR"`;

const kubeSelector = (serviceMatcher: string) =>
	['namespace="team-esyfo"', 'k8s_cluster_name="prod"', serviceMatcher].join(
		", ",
	);

const fleetKubeContainerSelector = kubeSelector(
	`container=~"${SCOPE_VARIABLE}"`,
);
const selectedKubeContainerSelector = kubeSelector(
	`container="${SERVICE_VARIABLE}"`,
);
const fleetKubeDeploymentSelector = kubeSelector(
	`deployment=~"${SCOPE_VARIABLE}"`,
);
const selectedKubeDeploymentSelector = kubeSelector(
	`deployment="${SERVICE_VARIABLE}"`,
);

const selectedRequestRate = `sum(rate(${SPAN_CALLS_METRIC}{${selectedSpanSelector}}[$__rate_interval]))`;
const selectedErrorRate = `sum(rate(${SPAN_CALLS_METRIC}{${selectedErrorSpanSelector}}[$__rate_interval]))`;

export const requestCountQuery = `sum(increase(${SPAN_CALLS_METRIC}{${selectedSpanSelector}}[$__range]))`;
export const httpErrorCountQuery = `(sum(increase(${SPAN_CALLS_METRIC}{${selectedErrorSpanSelector}}[$__range])) or on() (sum(increase(${SPAN_CALLS_METRIC}{${selectedSpanSelector}}[$__range])) * 0)) and on() (sum(increase(${SPAN_CALLS_METRIC}{${selectedSpanSelector}}[$__range])) > 0)`;
export const httpErrorRatioQuery = `(100 * ((${selectedErrorRate} or on() (${selectedRequestRate} * 0)) / ${selectedRequestRate})) and on() (${selectedRequestRate} > 0)`;
export const p95LatencyQuery = `(histogram_quantile(0.95, sum by (le) (rate(${SPAN_LATENCY_METRIC}{${selectedSpanSelector}}[$__rate_interval])))) and on() (${selectedRequestRate} > 0)`;

const fleetRequestsByService = `sum by (service_name) (increase(${SPAN_CALLS_METRIC}{${fleetSpanSelector}}[$__range]))`;
const fleetOtelErrorsByService = `sum by (service_name) (increase(${SPAN_CALLS_METRIC}{${fleetErrorSpanSelector}}[$__range]))`;

export const fleetServicesWithOtelErrorsQuery = `count((${fleetOtelErrorsByService}) > 0) or on() vector(0)`;
export const requestsByServiceQuery = fleetRequestsByService;
export const otelErrorsByServiceQuery = `((${fleetOtelErrorsByService}) or on(service_name) ((${fleetRequestsByService}) * 0)) and on(service_name) ((${fleetRequestsByService}) > 0)`;

const runtimeNoiseFilter =
	"| k8s_container_name !~ `secure-logs-fluentbit|cloudsql-proxy|wonderwall|elector`";
const runtimeErrorFilter = "| detected_level=~`(?i)(error|critical|fatal)`";
const fleetRuntimeSelector = `{service_namespace="team-esyfo", k8s_cluster_name="prod", service_name=~"${SCOPE_VARIABLE}"}`;
const selectedRuntimeSelector = `{service_namespace="team-esyfo", k8s_cluster_name="prod", service_name="${SERVICE_VARIABLE}"}`;

export const runtimeErrorCountQuery = `sum(count_over_time(${selectedRuntimeSelector} ${runtimeNoiseFilter} ${runtimeErrorFilter} [$__range]))`;

export const runtimeErrorsByServiceQuery = `sum by (service_name) (count_over_time(${fleetRuntimeSelector} ${runtimeNoiseFilter} ${runtimeErrorFilter} [5m]))`;

const fleetRestartsByContainer = `sum by (container) (max by (pod, container) (increase(${RESTARTS_METRIC}{${fleetKubeContainerSelector}}[24h])))`;
export const restartsByServiceQuery = `sum by (service_name) (label_replace(${fleetRestartsByContainer}, "service_name", "$1", "container", "(.*)"))`;
export const restartCountQuery = `sum(max by (pod, container) (increase(${RESTARTS_METRIC}{${selectedKubeContainerSelector}}[24h])))`;
export const fleetServicesWithRestartsQuery = `count((${restartsByServiceQuery}) > 0) or on() vector(0)`;

const readyByDeployment = (selector: string) =>
	`max by (deployment) (${READY_REPLICAS_METRIC}{${selector}})`;
const desiredByDeployment = (selector: string) =>
	`max by (deployment) (${DESIRED_REPLICAS_METRIC}{${selector}})`;
const fleetReady = readyByDeployment(fleetKubeDeploymentSelector);
const fleetDesired = desiredByDeployment(fleetKubeDeploymentSelector);
const selectedReady = readyByDeployment(selectedKubeDeploymentSelector);
const selectedDesired = desiredByDeployment(selectedKubeDeploymentSelector);
const fleetReadyWithFallback = `(${fleetReady} or on(deployment) (${fleetDesired} * 0))`;
const selectedReadyWithFallback = `(${selectedReady} or on(deployment) (${selectedDesired} * 0))`;
const guardedFleetReadyRatio = `(100 * ${fleetReadyWithFallback} / ${fleetDesired}) and on(deployment) (${fleetDesired} > 0)`;
const guardedSelectedReadyRatio = `(100 * ${selectedReadyWithFallback} / ${selectedDesired}) and on(deployment) (${selectedDesired} > 0)`;

export const lowestReadyRatioQuery = `min(${guardedFleetReadyRatio})`;
export const readyRatioByServiceQuery = `max by (service_name) (label_replace(${guardedFleetReadyRatio}, "service_name", "$1", "deployment", "(.*)"))`;
export const selectedReadyRatioQuery = guardedSelectedReadyRatio;

const currentSpanSeriesByService = `max by (service_name) (timestamp(${SPAN_CALLS_METRIC}{${fleetSpanSelector}}))`;
const recentSpanSeriesByService = `max by (service_name) (max_over_time(timestamp(${SPAN_CALLS_METRIC}{${fleetSpanSelector}})[30m:]))`;
const currentDeploymentByService = `label_replace(max by (deployment) (${DESIRED_REPLICAS_METRIC}{${fleetKubeDeploymentSelector}}), "service_name", "$1", "deployment", "(.*)")`;

export const telemetryStateByServiceQuery = `((0 * (${expectedServerScopeVectorQuery})) and on(service_name) (${currentSpanSeriesByService})) or (((1 * (${expectedServerScopeVectorQuery})) and on(service_name) (${recentSpanSeriesByService})) unless on(service_name) (${currentSpanSeriesByService})) or ((2 * (${expectedServerScopeVectorQuery})) unless on(service_name) (${recentSpanSeriesByService})) or ((3 * (${expectedScopeVectorQuery})) unless on(service_name) (${expectedServerScopeVectorQuery}))`;
export const telemetryCoverageQuery = `100 * ((count((${currentSpanSeriesByService}) and on(service_name) (${expectedServerScopeVectorQuery})) or on() vector(0)) / count(${expectedServerScopeVectorQuery}))`;
export const deploymentCoverageQuery = `100 * ((count((${currentDeploymentByService}) and on(service_name) (${expectedScopeVectorQuery})) or on() vector(0)) / count(${expectedScopeVectorQuery}))`;
export const missingTelemetryQuery = `count((${expectedServerScopeVectorQuery}) unless on(service_name) (${recentSpanSeriesByService})) or on() vector(0)`;

export const requestRateByServiceQuery = `sum by (service_name) (rate(${SPAN_CALLS_METRIC}{${selectedSpanSelector}}[$__rate_interval]))`;
const selectedErrorRateByService = `sum by (service_name) (rate(${SPAN_CALLS_METRIC}{${selectedErrorSpanSelector}}[$__rate_interval]))`;
export const errorRatioByServiceQuery = `(100 * ((${selectedErrorRateByService} or on(service_name) (${requestRateByServiceQuery} * 0)) / ${requestRateByServiceQuery})) and on(service_name) (${requestRateByServiceQuery} > 0)`;
export const p95ByServiceQuery = `(histogram_quantile(0.95, sum by (service_name, le) (rate(${SPAN_LATENCY_METRIC}{${selectedSpanSelector}}[$__rate_interval])))) and on(service_name) (${requestRateByServiceQuery} > 0)`;
export const telemetryAgeByServiceQuery = `time() - max by (service_name) (timestamp(${SPAN_CALLS_METRIC}{${selectedSpanSelector}}))`;

const configuredBrowserServices = [
	...new Set(
		controlRoomBrowserSurfaces
			.filter(
				({ currentImplementation }) =>
					currentImplementation.state === "configured",
			)
			.map(({ browserIdentity }) => browserIdentity.serviceName),
	),
];
const browserServiceRegex = `^(${configuredBrowserServices.join("|")})$`;
const browserSelector = `{kind="exception", service_name=~"${browserServiceRegex}"}`;
export const browserExceptionsByServiceQuery = `sum by (service_name) (count_over_time(${browserSelector} [$__rate_interval]))`;

export const jobFailureQuery = `max(max_over_time(${JOB_FAILED_METRIC}{namespace="team-esyfo", k8s_cluster_name="prod", job_name=~"esyfovarsel-job.*"}[$__range]))`;
export const budstikkaLagQuery = `max by (topic) (${BUDSTIKKA_LAG_METRIC}{app="syfo-budstikka", namespace="team-esyfo", k8s_cluster_name="prod", topic="team-esyfo.budstikka.v1"})`;
export const deserializationRateQuery = `sum(rate(${DESERIALIZATION_ERROR_METRIC}{namespace="team-esyfo", k8s_cluster_name="prod"}[5m]))`;
export const motebehovReadyRatioQuery = `(100 * (max by (deployment) (${READY_REPLICAS_METRIC}{namespace="team-esyfo", k8s_cluster_name="prod", deployment="syfomotebehov"}) or on(deployment) (max by (deployment) (${DESIRED_REPLICAS_METRIC}{namespace="team-esyfo", k8s_cluster_name="prod", deployment="syfomotebehov"}) * 0)) / max by (deployment) (${DESIRED_REPLICAS_METRIC}{namespace="team-esyfo", k8s_cluster_name="prod", deployment="syfomotebehov"})) and on(deployment) (max by (deployment) (${DESIRED_REPLICAS_METRIC}{namespace="team-esyfo", k8s_cluster_name="prod", deployment="syfomotebehov"}) > 0)`;

export const apmDataLink = (service: string) =>
	`/a/nais-apm-app/services/team-esyfo/${service}?environment=prod&from=${FROM_ISO}&to=${TO_ISO}`;

export const runtimeLogsDataLink = (service: string) =>
	`/a/grafana-lokiexplore-app/explore/service/${service}/logs?from=${FROM}&to=${TO}&var-ds=${LOKI_DATASOURCE_UID}&var-filters=service_name%7C%3D%7C${service}&var-filters=service_namespace%7C%3D%7Cteam-esyfo&var-filters=k8s_cluster_name%7C%3D%7Cprod`;

export const errorDashboardDataLink = (service: string) =>
	`/d/team-esyfo-error-drilldown/team-esyfo-e28093-feildrilldown?orgId=1&from=${FROM}&to=${TO}&var-app=${service}`;

const serviceDataLinks = (service: string) => [
	dataLink("NAIS APM", apmDataLink(service)),
	dataLink("Avgrensede logger", runtimeLogsDataLink(service)),
	dataLink("Feildrilldown", errorDashboardDataLink(service)),
	dataLink("HTTP/runtime-runbook", RUNTIME_RUNBOOK_URL),
];

const pagerLinks = (service: string, runbook: string, issue: string) => [
	...serviceDataLinks(service),
	dataLink("Kandidatens runbook", runbook),
	dataLink("Blokkerende oppgave", issue),
];

type PanelQuery = Record<string, unknown>;
type PanelLink = ReturnType<typeof dataLink>;

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

const lokiQuery = (
	refId: string,
	expr: string,
	queryType: "instant" | "range" = "instant",
): PanelQuery => ({
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
	links = [],
}: {
	id: number;
	title: string;
	description: string;
	query: PanelQuery;
	unit: string;
	thresholds: Threshold[];
	colorMode?: "none" | "value";
	decimals?: number;
	links?: PanelLink[];
}) => ({
	kind: "Panel",
	spec: {
		data: queryGroup([query]),
		description,
		id,
		links,
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
	query,
	unit,
	thresholds,
	links = [],
	fieldLinks,
}: {
	id: number;
	title: string;
	description: string;
	query: PanelQuery;
	unit: string;
	thresholds: Threshold[];
	links?: PanelLink[];
	fieldLinks?: PanelLink[];
}) => ({
	kind: "Panel",
	spec: {
		data: queryGroup([query]),
		description,
		id,
		links,
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
						links: fieldLinks ?? serviceDataLinks(FIELD_SERVICE),
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

const mergeTableFrames = {
	group: "merge",
	kind: "Transformation",
	spec: { options: {} },
};

const fleetTablePanel = () => {
	const fields = {
		service_name: "Tjeneste",
		criticality: "Kritikalitet",
		lifecycle: "Livssyklus",
		role: "Rolle",
		"Value #Telemetry": "SERVER-span",
		"Value #Requests": "Requests",
		"Value #OTel-feil": "OTel-feil",
		"Value #Runtimefeil": "Runtimefeil 5m",
		"Value #Restarts": "Restarts 24t",
		"Value #Klare replikaer": "Klare replikaer",
	};
	const fieldOrder = Object.fromEntries(
		Object.keys(fields).map((field, index) => [field, index]),
	);
	const deviationFields: Array<[string, Threshold[]]> = [
		[
			"Value #OTel-feil",
			[
				{ color: "gray", value: 0 },
				{ color: "red", value: 1 },
			],
		],
		[
			"Value #Runtimefeil",
			[
				{ color: "gray", value: 0 },
				{ color: "red", value: 1 },
			],
		],
		[
			"Value #Restarts",
			[
				{ color: "gray", value: 0 },
				{ color: "yellow", value: 1 },
				{ color: "red", value: 3 },
			],
		],
	];
	return {
		kind: "Panel",
		spec: {
			data: queryGroup(
				[
					prometheusQuery(
						"Telemetry",
						telemetryStateByServiceQuery,
						"instant",
						"",
						"table",
					),
					prometheusQuery(
						"Requests",
						requestsByServiceQuery,
						"instant",
						"",
						"table",
					),
					prometheusQuery(
						"OTel-feil",
						otelErrorsByServiceQuery,
						"instant",
						"",
						"table",
					),
					lokiQuery("Runtimefeil", runtimeErrorsByServiceQuery),
					prometheusQuery(
						"Restarts",
						restartsByServiceQuery,
						"instant",
						"",
						"table",
					),
					prometheusQuery(
						"Klare replikaer",
						readyRatioByServiceQuery,
						"instant",
						"",
						"table",
					),
				],
				[
					mergeTableFrames,
					{
						group: "organize",
						kind: "Transformation",
						spec: {
							options: {
								excludeByName: {
									Time: true,
									__control_room_scope: true,
									container: true,
									deployment: true,
								},
								includeByName: {},
								indexByName: fieldOrder,
								renameByName: fields,
							},
						},
					},
				],
			),
			description:
				"Inventaret leverer alltid forventede GCP-rader. SERVER-eligible profiler viser FERSK, STALE eller MANGLER; workerprofiler viser ANNEN KONTRAKT. Datasourcefeil feiler hele queryen.",
			id: 10,
			links: [dataLink("HTTP/runtime-runbook", RUNTIME_RUNBOOK_URL)],
			title: "01 · Avvik og telemetry · hele valgt scope",
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
								matcher: { id: "byName", options: "service_name" },
								properties: [
									{ id: "links", value: serviceDataLinks(ROW_VALUE) },
								],
							},
							{
								matcher: { id: "byName", options: "Value #Telemetry" },
								properties: [
									{
										id: "mappings",
										value: [
											{
												options: {
													"0": { color: "green", text: "FERSK" },
													"1": { color: "yellow", text: "STALE" },
													"2": { color: "red", text: "MANGLER" },
													"3": { color: "blue", text: "ANNEN KONTRAKT" },
												},
												type: "value",
											},
										],
									},
									{
										id: "custom.cellOptions",
										value: { type: "color-text" },
									},
								],
							},
							...deviationFields.map(([field, steps]) => ({
								matcher: { id: "byName", options: field },
								properties: [
									{ id: "thresholds", value: { mode: "absolute", steps } },
									{
										id: "custom.cellOptions",
										value: { type: "color-text" },
									},
								],
							})),
							{
								matcher: {
									id: "byName",
									options: "Value #Klare replikaer",
								},
								properties: [
									{ id: "unit", value: "percent" },
									{
										id: "thresholds",
										value: {
											mode: "absolute",
											steps: readyThresholds,
										},
									},
									{
										id: "custom.cellOptions",
										value: { type: "color-text" },
									},
								],
							},
						],
					},
					options: {
						cellHeight: "sm",
						enablePagination: true,
						showHeader: true,
						sortBy: [
							{ desc: true, displayName: "SERVER-span" },
							{ desc: true, displayName: "Runtimefeil 5m" },
						],
					},
				},
				version: GRAFANA_VERSION,
			},
		},
	};
};

const textPanel = (
	id: number,
	title: string,
	description: string,
	content: string,
	links: PanelLink[] = [],
) => ({
	kind: "Panel",
	spec: {
		data: queryGroup([]),
		description,
		id,
		links,
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

const deviationThresholds: Threshold[] = [
	{ color: "gray", value: 0 },
	{ color: "red", value: 1 },
];
const readyThresholds: Threshold[] = [
	{ color: "red", value: 0 },
	{ color: "yellow", value: 99.999 },
	{ color: "green", value: 100 },
];
const coverageThresholds: Threshold[] = [
	{ color: "red", value: 0 },
	{ color: "yellow", value: 99.999 },
	{ color: "green", value: 100 },
];
const neutralThresholds: Threshold[] = [{ color: "blue", value: 0 }];

const selectedService = "meroppfolging-backend";
const selectedServiceText =
	controlRoomApplicationOptions.find(({ value }) => value === selectedService)
		?.text ?? selectedService;
const defaultScope = controlRoomScopeOptions[0];

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
			"Inventardrevet hendelsesinngang for hele Team eSyfos operative flåte. Skiller brukerimpact, teknisk helse og telemetry og viser unsupported signaler som eksplisitte gap.",
		editable: true,
		elements: {
			"panel-1": textPanel(
				1,
				"00 · Slik leses kontrollrommet",
				"Operativ leserekkefølge, scope og statusord.",
				scopeMarkdown(),
			),
			"panel-2": statPanel({
				id: 2,
				title: "OTel-feilstatus · tjenester",
				description:
					"Antall tjenester med minst én inbound SERVER-span markert STATUS_CODE_ERROR i valgt tidsrom. Dette er OTel-status, ikke automatisk HTTP 5xx eller bevist brukerimpact. 0 er nøytralt og må leses sammen med dekning.",
				query: prometheusQuery(
					"Tjenester med OTel-feil",
					fleetServicesWithOtelErrorsQuery,
					"instant",
				),
				unit: "short",
				thresholds: deviationThresholds,
				decimals: 0,
				links: [dataLink("HTTP/runtime-runbook", RUNTIME_RUNBOOK_URL)],
			}),
			"panel-3": statPanel({
				id: 3,
				title: "SERVER-telemetry mangler · tjenester",
				description:
					"Antall inventarforankrede, SERVER-eligible GCP-tjenester uten spanserie siste 30 minutter. Workerprofiler er ikke i nevneren. Dette er et dekningsgap, ikke automatisk appfeil.",
				query: prometheusQuery(
					"Tjenester uten telemetry",
					missingTelemetryQuery,
					"instant",
				),
				unit: "short",
				thresholds: deviationThresholds,
				decimals: 0,
				links: [dataLink("HTTP/runtime-runbook", RUNTIME_RUNBOOK_URL)],
			}),
			"panel-4": statPanel({
				id: 4,
				title: "Restarts · tjenester · 24t",
				description:
					"Antall tjenester med minst én deduplisert containerrestart siste 24 timer. Fast vindu, uavhengig av valgt dashboardtidsrom.",
				query: prometheusQuery(
					"Tjenester med restarts",
					fleetServicesWithRestartsQuery,
					"instant",
				),
				unit: "short",
				thresholds: deviationThresholds,
				decimals: 0,
				links: [dataLink("HTTP/runtime-runbook", RUNTIME_RUNBOOK_URL)],
			}),
			"panel-5": statPanel({
				id: 5,
				title: "Laveste ready/desired",
				description:
					"Laveste klare/ønskede replikaandel i valgt scope. desired=0 filtreres bort i stedet for å gi NaN eller grønt.",
				query: prometheusQuery(
					"Laveste ready",
					lowestReadyRatioQuery,
					"instant",
				),
				unit: "percent",
				thresholds: readyThresholds,
				decimals: 1,
				links: [dataLink("HTTP/runtime-runbook", RUNTIME_RUNBOOK_URL)],
			}),
			"panel-6": statPanel({
				id: 6,
				title: "SERVER-spanserie · HTTP-dekning",
				description:
					"Andel forventede, SERVER-eligible runtime-identiteter i valgt scope med aktuell spanserie. Workerprofiler har annen signal-/span-kontrakt. Dette beviser seriescrape, ikke brukertrafikk eller komplett tracing.",
				query: prometheusQuery(
					"Spanserie-dekning",
					telemetryCoverageQuery,
					"instant",
				),
				unit: "percent",
				thresholds: coverageThresholds,
				decimals: 0,
			}),
			"panel-7": statPanel({
				id: 7,
				title: "Kube deployment · dekning",
				description:
					"Andel forventede runtime-identiteter i valgt scope med desired-replica-serie. Manglende mapping er et telemetry-/identitetsgap.",
				query: prometheusQuery(
					"Kube-dekning",
					deploymentCoverageQuery,
					"instant",
				),
				unit: "percent",
				thresholds: coverageThresholds,
				decimals: 0,
			}),
			"panel-8": textPanel(
				8,
				"SLO-burn · IKKE DEFINERT",
				"Alert-policy er ikke en SLO-kontrakt.",
				"### Ikke grønt, ikke null\n\nIngen godkjent SLI/objective/window/burn-rate finnes ennå. Derfor viser kontrollrommet ikke et oppdiktet SLO-tall. Avklaringer følges i [dinesykmeldte-backend#729](https://github.com/navikt/dinesykmeldte-backend/issues/729) og [meroppfolging-backend#422](https://github.com/navikt/meroppfolging-backend/issues/422).",
			),
			"panel-9": textPanel(
				9,
				"Siste deploy · UKJENT",
				"Pod-alder og deployment-created er ikke deployidentitet.",
				"### Mangler verifisert adapter\n\nKontrollrommet viser ikke nyeste pod eller `kube_deployment_created` som «siste deploy». Kilde-SHA, deployert SHA og tidspunkt må komme fra en verifisert NAIS/deploy-kontrakt. Bruk NAIS APM og Console under hendelsen; adapteren fullføres i [#211](https://github.com/navikt/team-esyfo/issues/211).",
			),
			"panel-10": fleetTablePanel(),
			"panel-11": textPanel(
				11,
				"02 · Valgt tjeneste · RED og runtime",
				"Detaljgrafer viser kun én eksplisitt valgt runtime.",
				"### Én tjeneste, ingen skjult flåteaggregering\n\nVelg **Tjeneste** øverst. Request-rate, OTel-feilratio og P95 gjelder inbound SERVER-spans for bare denne runtime-identiteten. For workerprofiler er disse SERVER-panelene ikke den operative kontrakten og kan stå `Ukjent`; bruk pipeline-/jobbpanelet og runbooken. Ingen trafikk gir `Ukjent`; P95 er diagnostikk, ikke SLO.",
				[dataLink("HTTP/runtime-runbook", RUNTIME_RUNBOOK_URL)],
			),
			"panel-12": timeSeriesPanel({
				id: 12,
				title: "Request-rate · valgt tjeneste",
				description: "Inbound SERVER-spans per sekund for én valgt tjeneste.",
				query: prometheusQuery(
					"Request-rate",
					requestRateByServiceQuery,
					"range",
					"{{service_name}}",
				),
				unit: "reqps",
				thresholds: neutralThresholds,
			}),
			"panel-13": timeSeriesPanel({
				id: 13,
				title: "OTel-feilratio · valgt tjeneste",
				description:
					"Andel inbound SERVER-spans med STATUS_CODE_ERROR. Null finnes bare med observert requestserie; ingen trafikk gir Ukjent. Ikke en vedtatt SLO-grense.",
				query: prometheusQuery(
					"OTel-feilratio",
					errorRatioByServiceQuery,
					"range",
					"{{service_name}}",
				),
				unit: "percent",
				thresholds: deviationThresholds,
			}),
			"panel-14": timeSeriesPanel({
				id: 14,
				title: "P95 · valgt tjeneste",
				description:
					"P95 for inbound SERVER-spans på én valgt tjeneste. Ingen flåtemiks og ingen SLO-farge.",
				query: prometheusQuery(
					"P95",
					p95ByServiceQuery,
					"range",
					"{{service_name}}",
				),
				unit: "s",
				thresholds: neutralThresholds,
			}),
			"panel-15": statPanel({
				id: 15,
				title: "Runtimefeil · valgt tidsrom",
				description:
					"Positivt klassifiserte error|critical|fatal-logger for valgt runtime. No data er ukjent, ikke null; panelet gjør ingen ekstra full-loggskann for å konstruere en kunstig null.",
				query: lokiQuery("Runtimefeil", runtimeErrorCountQuery),
				unit: "short",
				thresholds: deviationThresholds,
				decimals: 0,
				links: serviceDataLinks(SERVICE_VARIABLE),
			}),
			"panel-16": statPanel({
				id: 16,
				title: "Restarts · valgt tjeneste · 24t",
				description:
					"Dedupliserte containerrestarts siste 24 timer for valgt runtime.",
				query: prometheusQuery("Restarts", restartCountQuery, "instant"),
				unit: "short",
				thresholds: deviationThresholds,
				decimals: 0,
				links: serviceDataLinks(SERVICE_VARIABLE),
			}),
			"panel-17": statPanel({
				id: 17,
				title: "Ready/desired · valgt tjeneste",
				description:
					"Klar/ønsket replikaandel for valgt deployment. desired=0 og manglende serie gir Ukjent.",
				query: prometheusQuery("Ready", selectedReadyRatioQuery, "instant"),
				unit: "percent",
				thresholds: readyThresholds,
				decimals: 1,
				links: serviceDataLinks(SERVICE_VARIABLE),
			}),
			"panel-18": textPanel(
				18,
				"20 · Browser · dekning før tall",
				"Kildekodekonfigurasjon, identitetsgap og ærlig målesemantikk.",
				browserCoverageMarkdown(),
				[dataLink("Browser-runbook", BROWSER_RUNBOOK_URL)],
			),
			"panel-19": textPanel(
				19,
				"Browsermiljø · UKJENT",
				"Faro exception-schemaet mangler verifisert miljødimensjon.",
				"### Diagnostikk, ikke prod-status\n\nException-serien kan ikke dokumentert skilles mellom dev og prod. Den brukes bare til feildrilldown per browseridentitet. Miljø, sampling, page loads, sessions og CWV bevises i [#206](https://github.com/navikt/team-esyfo/issues/206).",
				[dataLink("Browser-runbook", BROWSER_RUNBOOK_URL)],
			),
			"panel-20": timeSeriesPanel({
				id: 20,
				title: "Browser-unntak · samplede hendelser · miljø ukjent",
				description:
					"Exception-hendelser per service i queryvinduet. Miljø kan ikke verifisert skilles; ikke les dette som prod-status. Ikke page loads, sessions eller unike brukere.",
				query: lokiQuery(
					"Browser-unntak per service",
					browserExceptionsByServiceQuery,
					"range",
				),
				unit: "short",
				thresholds: deviationThresholds,
				links: [dataLink("Browser-runbook", BROWSER_RUNBOOK_URL)],
				fieldLinks: [
					dataLink("Browser-runbook", BROWSER_RUNBOOK_URL),
					dataLink("Feildrilldown", errorDashboardDataLink(FIELD_SERVICE)),
				],
			}),
			"panel-21": textPanel(
				21,
				"30 · Pipelines · prosessnøytral status",
				"Topic-/pipelinekontrakter og varslingsmigrering.",
				pipelineCoverageMarkdown(),
				[dataLink("Pipeline-/jobbrunbook", PIPELINE_RUNBOOK_URL)],
			),
			"panel-22": textPanel(
				22,
				"32 · Jobber · forventet run er ikke det samme som podhelse",
				"Typekorrekt schedule og eksplisitte manglende utfallssignaler.",
				jobCoverageMarkdown(),
				[dataLink("Pipeline-/jobbrunbook", PIPELINE_RUNBOOK_URL)],
			),
			"panel-23": statPanel({
				id: 23,
				title: "esyfovarsel-job · failure flag",
				description:
					"Maks observert kube_job_failed i valgt tidsrom. No data betyr ingen bevist job resource i vinduet, ikke suksess.",
				query: prometheusQuery("Job failure", jobFailureQuery, "instant"),
				unit: "short",
				thresholds: deviationThresholds,
				decimals: 0,
				links: [
					dataLink("Pipeline-/jobbrunbook", PIPELINE_RUNBOOK_URL),
					dataLink(
						"Legacy guardrail #1094",
						"https://github.com/navikt/esyfovarsel/issues/1094",
					),
				],
			}),
			"panel-24": textPanel(
				24,
				"40 · Pager readiness",
				"De tre kandidatene fra #210 og deres reelle blockers.",
				pagerReadinessMarkdown(),
			),
			"panel-25": timeSeriesPanel({
				id: 25,
				title: "Budstikka · consumer-lag · diagnostikk",
				description:
					"Nåværende lag-metrikk. Lag > 0 er køtilstand, ikke bevist alvorlig konsekvens. Panelet er eksplisitt ikke det endelige pagersignalet.",
				query: prometheusQuery(
					"Budstikka lag",
					budstikkaLagQuery,
					"range",
					"{{topic}}",
				),
				unit: "short",
				thresholds: neutralThresholds,
				links: pagerLinks(
					"syfo-budstikka",
					BUDSTIKKA_RUNBOOK_URL,
					"https://github.com/navikt/syfo-budstikka/issues/260",
				),
				fieldLinks: pagerLinks(
					"syfo-budstikka",
					BUDSTIKKA_RUNBOOK_URL,
					"https://github.com/navikt/syfo-budstikka/issues/260",
				),
			}),
			"panel-26": timeSeriesPanel({
				id: 26,
				title: "Oppfølgingsplan · permanent deserialiseringsrate",
				description:
					"Total rate av records som forkastes permanent, summert over prod-replikaer. Eksisterende alertkandidat evaluerer hver serie mot 0,1/s i fem minutter; pagersemantikken er blokkert til aggregat, recovery og runbook er bevist.",
				query: prometheusQuery(
					"Deserialiseringsrate",
					deserializationRateQuery,
					"range",
					"permanente feil",
				),
				unit: "ops",
				thresholds: [
					{ color: "gray", value: 0 },
					{ color: "red", value: 0.1 },
				],
				links: pagerLinks(
					"syfo-oppfolgingsplan-backend",
					DESERIALIZATION_RUNBOOK_URL,
					"https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/449",
				),
				fieldLinks: pagerLinks(
					"syfo-oppfolgingsplan-backend",
					DESERIALIZATION_RUNBOOK_URL,
					"https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/449",
				),
			}),
			"panel-27": timeSeriesPanel({
				id: 27,
				title: "syfomotebehov · ready/desired",
				description:
					"Tilgjengelighetsdiagnostikk med namespace, cluster, desired-guard og eksplisitt no-data. Les sammen med valgt tjenestes RED-paneler; endelig pager tuning skjer i #753.",
				query: prometheusQuery(
					"Motebehov ready",
					motebehovReadyRatioQuery,
					"range",
					"{{deployment}}",
				),
				unit: "percent",
				thresholds: readyThresholds,
				links: pagerLinks(
					"syfomotebehov",
					MOTEBEHOV_RUNBOOK_URL,
					"https://github.com/navikt/syfomotebehov/issues/753",
				),
				fieldLinks: pagerLinks(
					"syfomotebehov",
					MOTEBEHOV_RUNBOOK_URL,
					"https://github.com/navikt/syfomotebehov/issues/753",
				),
			}),
			"panel-28": textPanel(
				28,
				"50 · Migrering og utfasing",
				"Separate guardrails for døende eller flyttende runtime.",
				lifecycleMarkdown(),
			),
			"panel-29": textPanel(
				29,
				"60 · Dekning og kjente gap",
				"Forventet mot bevist telemetry, kontrakter og runbooks.",
				coverageMarkdown(),
			),
		},
		layout: {
			kind: "GridLayout",
			spec: {
				items: [
					layoutItem("panel-1", 0, 0, 24, 7),
					layoutItem("panel-2", 0, 7, 4, 5),
					layoutItem("panel-3", 4, 7, 4, 5),
					layoutItem("panel-4", 8, 7, 4, 5),
					layoutItem("panel-5", 12, 7, 4, 5),
					layoutItem("panel-6", 16, 7, 4, 5),
					layoutItem("panel-7", 20, 7, 4, 5),
					layoutItem("panel-8", 0, 12, 12, 5),
					layoutItem("panel-9", 12, 12, 12, 5),
					layoutItem("panel-10", 0, 17, 24, 16),
					layoutItem("panel-11", 0, 33, 24, 5),
					layoutItem("panel-12", 0, 38, 8, 9),
					layoutItem("panel-13", 8, 38, 8, 9),
					layoutItem("panel-14", 16, 38, 8, 9),
					layoutItem("panel-15", 0, 47, 8, 6),
					layoutItem("panel-16", 8, 47, 8, 6),
					layoutItem("panel-17", 16, 47, 8, 6),
					layoutItem("panel-18", 0, 53, 24, 17),
					layoutItem("panel-19", 0, 70, 6, 8),
					layoutItem("panel-20", 6, 70, 18, 8),
					layoutItem("panel-21", 0, 78, 24, 15),
					layoutItem("panel-22", 0, 93, 16, 9),
					layoutItem("panel-23", 16, 93, 8, 9),
					layoutItem("panel-24", 0, 102, 24, 10),
					layoutItem("panel-25", 0, 112, 8, 10),
					layoutItem("panel-26", 8, 112, 8, 10),
					layoutItem("panel-27", 16, 112, 8, 10),
					layoutItem("panel-28", 0, 122, 24, 12),
					layoutItem("panel-29", 0, 134, 24, 15),
				],
			},
		},
		links: [],
		liveNow: false,
		preload: false,
		tags: ["team-esyfo", "control-room", "observability", "managed-as-code"],
		timeSettings: {
			autoRefresh: "2m",
			autoRefreshIntervals: ["30s", "1m", "2m", "5m", "15m", "30m", "1h"],
			fiscalYearStartMonth: 0,
			from: "now-1h",
			hideTimepicker: false,
			to: "now",
			timezone: "browser",
		},
		title: "Team eSyfo – Kontrollrom",
		variables: [
			{
				kind: "CustomVariable",
				spec: {
					allowCustomValue: false,
					current: { text: defaultScope.text, value: defaultScope.value },
					description:
						"Inventardrevet flåte-, reise-, pipeline- eller livssyklusscope. Påvirker oversikt og flåtematrise.",
					hide: "dontHide",
					includeAll: false,
					label: "Omfang",
					multi: false,
					name: "scope",
					options: [],
					query: controlRoomScopeOptions
						.map(({ text, value }) => `${text} : ${value}`)
						.join(","),
					skipUrlSync: false,
					valuesFormat: "csv",
				},
			},
			{
				kind: "CustomVariable",
				spec: {
					allowCustomValue: false,
					current: { text: selectedServiceText, value: selectedService },
					description:
						"Én runtime-identitet for detaljpanelene. Påvirker ikke flåtematrisen.",
					hide: "dontHide",
					includeAll: false,
					label: "Tjeneste",
					multi: false,
					name: "service",
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
