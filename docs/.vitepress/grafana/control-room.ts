import {
	BROWSER_RUNBOOK_URL,
	BUDSTIKKA_RUNBOOK_URL,
	browserCoverageMarkdown,
	CONTROL_ROOM_GUIDE_URL,
	controlRoomApplicationOptions,
	controlRoomApplications,
	controlRoomBrowserSurfaces,
	controlRoomScopeOptions,
	controlRoomServerApplications,
	DESERIALIZATION_RUNBOOK_URL,
	jobCoverageMarkdown,
	lifecycleLabel,
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
import { runtimeErrorPipeline } from "./runtime-logql.ts";

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
export const AVAILABLE_REPLICAS_METRIC =
	"kube_deployment_status_replicas_available";
export const DESIRED_REPLICAS_METRIC = "kube_deployment_spec_replicas";
export const JOB_FAILED_METRIC = "kube_job_failed";
export const BUDSTIKKA_LAG_METRIC =
	"kafka_consumer_fetch_manager_records_lag_max";
export const KAFKA_CONSUMER_LAST_POLL_METRIC =
	"kafka_consumer_last_poll_seconds_ago";
export const KAFKA_CONSUMER_GROUP_TOPIC_LAG_METRIC =
	"kafka_consumergroup_group_topic_sum_lag";
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

const fleetRuntimeSelector = `{service_namespace="team-esyfo", k8s_cluster_name="prod", service_name=~"${SCOPE_VARIABLE}"}`;
const selectedRuntimeSelector = `{service_namespace="team-esyfo", k8s_cluster_name="prod", service_name="${SERVICE_VARIABLE}"}`;

export const runtimeErrorCountQuery = `sum(count_over_time(${selectedRuntimeSelector}
${runtimeErrorPipeline}
[$__range]))`;

export const runtimeErrorsByServiceQuery = `sum by (service_name) (count_over_time(${fleetRuntimeSelector}
${runtimeErrorPipeline}
[5m]))`;
export const fleetServicesWithRuntimeErrorsQuery = `count((${runtimeErrorsByServiceQuery}) > 0)`;

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
export const browserExceptionsByServiceQuery = `sum by (service_name) (count_over_time(${browserSelector} [$__auto]))`;

export const jobFailureQuery = `max(max_over_time(${JOB_FAILED_METRIC}{namespace="team-esyfo", k8s_cluster_name="prod", job_name=~"esyfovarsel-job.*"}[$__range]))`;
export const budstikkaLagQuery = `max by (topic) (${BUDSTIKKA_LAG_METRIC}{app="syfo-budstikka", namespace="team-esyfo", k8s_cluster_name="prod", topic="team-esyfo.budstikka.v1"})`;
export const sykmeldingConsumerPollAgeByPodQuery = `max by (pod) (${KAFKA_CONSUMER_LAST_POLL_METRIC}{app="syfo-oppfolgingsplan-backend", namespace="team-esyfo", k8s_cluster_name="prod"})`;
export const sykmeldingConsumerCommittedLagQuery = `max(${KAFKA_CONSUMER_GROUP_TOPIC_LAG_METRIC}{namespace="nais-system", k8s_cluster_name="prod", group="syfo-oppfolgingsplan-backend-sykmeldingsperiode-v2", topic="teamsykmelding.syfo-sendt-sykmelding"})`;
export const deserializationRateQuery = `sum(rate(${DESERIALIZATION_ERROR_METRIC}{namespace="team-esyfo", k8s_cluster_name="prod"}[5m]))`;
export const motebehovAvailableRatioQuery = `(100 * max by (deployment) (${AVAILABLE_REPLICAS_METRIC}{namespace="team-esyfo", k8s_cluster_name="prod", deployment="syfomotebehov"}) / max by (deployment) (${DESIRED_REPLICAS_METRIC}{namespace="team-esyfo", k8s_cluster_name="prod", deployment="syfomotebehov"})) and on(deployment) (max by (deployment) (${DESIRED_REPLICAS_METRIC}{namespace="team-esyfo", k8s_cluster_name="prod", deployment="syfomotebehov"}) > 0)`;

const dinesykmeldteRoutePattern =
	"^GET /[(]authenticate tokenx[)]/api/(minesykmeldte|virksomheter)$";
const dinesykmeldteSpanSelector = `${spanSelector('service_name="dinesykmeldte-backend"')}, span_name=~"${dinesykmeldteRoutePattern}"`;
const dinesykmeldteRateByOperation = (series: string) =>
	`sum by (operation) (label_replace((${series}), "operation", "$1", "span_name", "${dinesykmeldteRoutePattern}"))`;
const dinesykmeldteRate = (extraSelector = "") =>
	dinesykmeldteRateByOperation(
		`rate(${SPAN_CALLS_METRIC}{${dinesykmeldteSpanSelector}${extraSelector}}[$__rate_interval])`,
	);
const withOutcome = (rate: string, outcome: string) =>
	`label_replace((${rate}), "outcome", "${outcome}", "", ".*")`;

export const dinesykmeldteTrafficRateQuery = [
	withOutcome(dinesykmeldteRate(), "attempt"),
	withOutcome(
		dinesykmeldteRate(
			', http_response_status_code=~"2..", status_code!="STATUS_CODE_ERROR"',
		),
		"good",
	),
].join(" or ");

export const dinesykmeldteDeviationRateQuery = [
	withOutcome(
		dinesykmeldteRate(
			', http_response_status_code=~"4..", status_code!="STATUS_CODE_ERROR"',
		),
		"http_4xx",
	),
	withOutcome(
		dinesykmeldteRateByOperation(
			`rate(${SPAN_CALLS_METRIC}{${dinesykmeldteSpanSelector}, status_code="STATUS_CODE_ERROR"}[$__rate_interval]) or rate(${SPAN_CALLS_METRIC}{${dinesykmeldteSpanSelector}, http_response_status_code=~"5.."}[$__rate_interval])`,
		),
		"technical_failure",
	),
	withOutcome(
		dinesykmeldteRate(
			', status_code!="STATUS_CODE_ERROR", http_response_status_code!~"[245].."',
		),
		"unclassified",
	),
].join(" or ");

export const dinesykmeldteOutcomeRateQuery = `${dinesykmeldteTrafficRateQuery} or ${dinesykmeldteDeviationRateQuery}`;

export const apmDataLink = (service: string) =>
	`/a/nais-apm-app/services/team-esyfo/${service}?environment=prod&from=${FROM_ISO}&to=${TO_ISO}`;

export const runtimeLogsDataLink = (service: string) =>
	`/a/grafana-lokiexplore-app/explore/service/${service}/logs?from=${FROM}&to=${TO}&var-ds=${LOKI_DATASOURCE_UID}&var-filters=service_name%7C%3D%7C${service}&var-filters=service_namespace%7C%3D%7Cteam-esyfo&var-filters=k8s_cluster_name%7C%3D%7Cprod`;

export const errorDashboardDataLink = (service: string) =>
	`/d/team-esyfo-error-drilldown/team-esyfo-e28093-feildrilldown?orgId=1&from=${FROM}&to=${TO}&var-runtime_environment=prod&var-app=${service}`;

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
type ValueMapping = {
	type: "value";
	options: Record<string, { color?: string; text: string }>;
};

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
	mappings = [],
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
	mappings?: ValueMapping[];
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
						...(mappings.length === 0 ? {} : { mappings }),
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
							{ desc: true, displayName: "Runtimefeil 5m" },
							{ desc: false, displayName: "Klare replikaer" },
							{ desc: true, displayName: "OTel-feil" },
							{ desc: true, displayName: "Restarts 24t" },
							{ desc: true, displayName: "SERVER-span" },
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
const pollAgeThresholds: Threshold[] = [
	{ color: "green", value: 0 },
	{ color: "yellow", value: 60 },
	{ color: "red", value: 300 },
];

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
			"Inventardrevet hendelsesinngang for Team eSyfos operative flåte. Skiller teknisk helse fra telemetrydekning og viser manglende brukerimpact-, SLO- og deploykontrakter som eksplisitte gap.",
		editable: true,
		elements: {
			"panel-1": textPanel(
				1,
				"Start med avvikene",
				"Kontrollrommet viser teknisk helse og telemetrydekning separat. Fullt scope og begreper ligger i dokumentasjonen.",
				scopeMarkdown(),
				[dataLink("Kontrollrom-dokumentasjon", CONTROL_ROOM_GUIDE_URL)],
			),
			"panel-2": statPanel({
				id: 2,
				title: "OTel-feil · tjenester",
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
			"panel-32": statPanel({
				id: 32,
				title: "Runtimefeil 5m · tjenester",
				description:
					"Antall tjenester med minst én påvist error-, critical- eller fatal-klassifisert runtime-logglinje siste fem minutter. Browservideresendte logger er ekskludert fra runtimekategorien; browser-exceptions måles separat i Faro der det er konfigurert. No data er ukjent; panelet konstruerer ikke null uten positiv loggevidens.",
				query: lokiQuery(
					"Tjenester med runtimefeil",
					fleetServicesWithRuntimeErrorsQuery,
				),
				unit: "short",
				thresholds: deviationThresholds,
				decimals: 0,
				links: [dataLink("HTTP/runtime-runbook", RUNTIME_RUNBOOK_URL)],
			}),
			"panel-3": statPanel({
				id: 3,
				title: "Tjenester uten SERVER-spanserie",
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
				title: "Restarts 24t · tjenester",
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
				title: "Laveste ready/desired %",
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
				title: "HTTP-dekning",
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
				title: "Kube-dekning",
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
				"Kjente gap · SLO og deploy",
				"SLO er ikke definert. Siste deploy er ukjent fordi pod-alder og deployment-created ikke er deployidentitet.",
				"**SLO:** `IKKE DEFINERT` · **Siste deploy:** `UKJENT`. Dette er dekningsgap, ikke grønt.",
				[
					dataLink("Kontrollrom-dokumentasjon", CONTROL_ROOM_GUIDE_URL),
					dataLink(
						"Dine sykmeldte SLO #729",
						"https://github.com/navikt/dinesykmeldte-backend/issues/729",
					),
					dataLink(
						"Meroppfølging SLO #422",
						"https://github.com/navikt/meroppfolging-backend/issues/422",
					),
				],
			),
			"panel-30": timeSeriesPanel({
				id: 30,
				title: "10 · Dine sykmeldte · forsøk og 2xx",
				description:
					"Fast produksjonsscope for inbound SERVER-spans på GET /api/minesykmeldte og GET /api/virksomheter. attempt viser all observert trafikk; good er 2xx uten OTel-feilstatus. Bare rute-/labelkontrakten og 200/STATUS_CODE_UNSET er live-verifisert. Uten attempt er trafikken ukjent eller null. Dette er diagnostikk, ikke en vedtatt SLI eller SLO.",
				query: prometheusQuery(
					"Forsøk og 2xx",
					dinesykmeldteTrafficRateQuery,
					"range",
					"{{operation}} · {{outcome}}",
				),
				unit: "reqps",
				thresholds: neutralThresholds,
				links: [
					...serviceDataLinks("dinesykmeldte-backend"),
					dataLink(
						"Implementeringsoppgave #729",
						"https://github.com/navikt/dinesykmeldte-backend/issues/729",
					),
				],
				fieldLinks: [
					...serviceDataLinks("dinesykmeldte-backend"),
					dataLink(
						"Implementeringsoppgave #729",
						"https://github.com/navikt/dinesykmeldte-backend/issues/729",
					),
				],
			}),
			"panel-31": timeSeriesPanel({
				id: 31,
				title: "Dine sykmeldte · avvikende HTTP-utfall",
				description:
					"Fast produksjonsscope for de samme to GET-rutene. http_4xx er 4xx uten OTel-feilstatus, men er ikke kalt forventet: Texas-pluginen kan også maskere tekniske introspeksjonsfeil som 401. technical_failure er 5xx eller OTel-feilstatus; unclassified dekker blant annet 3xx, 1xx og manglende HTTP-status uten OTel-feil. Manglende serier syntetiseres ikke til null. Skillet mellom forventede og tekniske 4xx krever et bounded appsignal i #729.",
				query: prometheusQuery(
					"Avvikende HTTP-utfall",
					dinesykmeldteDeviationRateQuery,
					"range",
					"{{operation}} · {{outcome}}",
				),
				unit: "reqps",
				thresholds: neutralThresholds,
				links: [
					...serviceDataLinks("dinesykmeldte-backend"),
					dataLink(
						"Implementeringsoppgave #729",
						"https://github.com/navikt/dinesykmeldte-backend/issues/729",
					),
				],
				fieldLinks: [
					...serviceDataLinks("dinesykmeldte-backend"),
					dataLink(
						"Implementeringsoppgave #729",
						"https://github.com/navikt/dinesykmeldte-backend/issues/729",
					),
				],
			}),
			"panel-10": fleetTablePanel(),
			"panel-12": timeSeriesPanel({
				id: 12,
				title: "02 · Valgt tjeneste · request-rate",
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
				title: "Valgt tjeneste · OTel-feilratio",
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
				title: "Valgt tjeneste · P95",
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
				title: "Valgt tjeneste · runtimefeil",
				description:
					"Positivt klassifiserte error|critical|fatal-logger for valgt runtime. Browservideresendte logger er ekskludert fra runtimekategorien; browser-exceptions måles separat i Faro der det er konfigurert. No data er ukjent, ikke null; panelet gjør ingen ekstra full-loggskann for å konstruere en kunstig null.",
				query: lokiQuery("Runtimefeil", runtimeErrorCountQuery),
				unit: "short",
				thresholds: deviationThresholds,
				decimals: 0,
				links: serviceDataLinks(SERVICE_VARIABLE),
			}),
			"panel-16": statPanel({
				id: 16,
				title: "Valgt tjeneste · restarts · 24t",
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
				title: "Valgt tjeneste · ready/desired",
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
				"20 · Browser",
				"Kun Faro kind=exception er live-verifisert. Miljølabel, numerisk sampling, page loads, sessions og CWV er ukjent; en session skal aldri omtales som en unik bruker.",
				browserCoverageMarkdown(),
				[
					dataLink("Browser-runbook", BROWSER_RUNBOOK_URL),
					dataLink(
						"Browserkontrakt #206",
						"https://github.com/navikt/team-esyfo/issues/206",
					),
				],
			),
			"panel-20": timeSeriesPanel({
				id: 20,
				title: "Browser-unntak · diagnostikk",
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
				"30 · Pipelines",
				"Kontraktstatus, ikke samlet produksjonshelse. Første tekniske slice viser sykmelding-consumerens poll-alder og committed lag. Expected run, eldste ventende arbeid, terminalt utfall og øvrige pipelinekontrakter avklares i #212. syfo-budstikka er målprosessor, esyfovarsel er migrerende legacy-prosessor, og Airflow er utenfor scope.",
				pipelineCoverageMarkdown(),
				[
					dataLink("Pipeline-/jobbrunbook", PIPELINE_RUNBOOK_URL),
					dataLink(
						"Pipelinekontrakter #212",
						"https://github.com/navikt/team-esyfo/issues/212",
					),
				],
			),
			"panel-33": statPanel({
				id: 33,
				title: "Sykmelding-consumer · poll-alder per pod",
				description:
					"Sekunder siden siste poll()-kall per eksporterte produksjonspod. IKKE POLLET er Kafka-verdien -1 før første poll. Grønt er under 60 sekunder, gult 60–300 og rødt minst 300. Dette viser consumer-loopens tekniske fremdrift, ikke null lag eller ende-til-ende-leveranse. No data er Ukjent.",
				query: prometheusQuery(
					"Poll-alder",
					sykmeldingConsumerPollAgeByPodQuery,
					"instant",
					"{{pod}}",
				),
				unit: "s",
				thresholds: pollAgeThresholds,
				decimals: 0,
				mappings: [
					{
						options: { "-1": { color: "red", text: "IKKE POLLET" } },
						type: "value",
					},
				],
				links: [
					...serviceDataLinks("syfo-oppfolgingsplan-backend"),
					dataLink("Pipeline-/jobbrunbook", PIPELINE_RUNBOOK_URL),
				],
			}),
			"panel-34": statPanel({
				id: 34,
				title: "Sykmelding-consumer · committed lag",
				description:
					"Committed consumer-group-lag for sykmeldingstopicen. Null betyr ingen observert backlog ved siste scrape, ikke bevist korrekt eller ende-til-ende-levert behandling. Positiv lag kan være kortvarig; No data er Ukjent.",
				query: prometheusQuery(
					"Committed lag",
					sykmeldingConsumerCommittedLagQuery,
					"instant",
				),
				unit: "short",
				thresholds: neutralThresholds,
				decimals: 0,
				links: [
					...serviceDataLinks("syfo-oppfolgingsplan-backend"),
					dataLink("Pipeline-/jobbrunbook", PIPELINE_RUNBOOK_URL),
				],
			}),
			"panel-22": textPanel(
				22,
				"32 · Planlagt jobb",
				"kube_job_failed viser bare observert terminalt Kubernetes-utfall. Siste start, siste suksess, varighet og expected-run-evaluering mangler en verifisert adapter.",
				jobCoverageMarkdown(),
				[dataLink("Pipeline-/jobbrunbook", PIPELINE_RUNBOOK_URL)],
			),
			"panel-23": statPanel({
				id: 23,
				title: "Kube-feil · planlagt jobb",
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
				"40 · Pagerkandidater",
				"Dashboardpaneler og runbooks aktiverer ikke pager. Aktivering krever 14–28 dagers shadow-evidens, second-person-verifikasjon og eksplisitt beslutning i #217.",
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
					"https://github.com/navikt/team-esyfo/issues/219",
				),
				fieldLinks: pagerLinks(
					"syfo-budstikka",
					BUDSTIKKA_RUNBOOK_URL,
					"https://github.com/navikt/team-esyfo/issues/219",
				),
			}),
			"panel-26": timeSeriesPanel({
				id: 26,
				title: "Oppfølgingsplan · deserialiseringsfeil",
				description:
					"Rate fra eksisterende legacy-teller. Signalet skiller foreløpig ikke terminalt avviste records fra retryforsøk; bruk det kun som diagnostikk fram til #449 er deployet og queryen er byttet.",
				query: prometheusQuery(
					"Deserialiseringsrate",
					deserializationRateQuery,
					"range",
					"observerte deserialiseringsfeil",
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
				title: "syfomotebehov · available/desired",
				description:
					"Alertnær tilgjengelighetsdiagnostikk med available-replikaer, namespace, cluster, desired-guard og eksplisitt no-data. Les sammen med valgt tjenestes ready/desired- og RED-paneler; endelig pager tuning skjer i #753.",
				query: prometheusQuery(
					"Motebehov available",
					motebehovAvailableRatioQuery,
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
		},
		layout: {
			kind: "GridLayout",
			spec: {
				items: [
					layoutItem("panel-1", 0, 0, 24, 3),
					layoutItem("panel-2", 0, 3, 8, 4),
					layoutItem("panel-32", 8, 3, 8, 4),
					layoutItem("panel-4", 16, 3, 8, 4),
					layoutItem("panel-5", 0, 7, 12, 4),
					layoutItem("panel-3", 12, 7, 12, 4),
					layoutItem("panel-10", 0, 11, 24, 16),
					layoutItem("panel-6", 0, 27, 12, 4),
					layoutItem("panel-7", 12, 27, 12, 4),
					layoutItem("panel-8", 0, 31, 24, 3),
					layoutItem("panel-12", 0, 34, 8, 9),
					layoutItem("panel-13", 8, 34, 8, 9),
					layoutItem("panel-14", 16, 34, 8, 9),
					layoutItem("panel-15", 0, 43, 8, 6),
					layoutItem("panel-16", 8, 43, 8, 6),
					layoutItem("panel-17", 16, 43, 8, 6),
					layoutItem("panel-30", 0, 49, 8, 8),
					layoutItem("panel-31", 8, 49, 16, 8),
					layoutItem("panel-18", 0, 57, 6, 6),
					layoutItem("panel-20", 6, 57, 18, 6),
					layoutItem("panel-21", 0, 63, 6, 4),
					layoutItem("panel-33", 6, 63, 12, 4),
					layoutItem("panel-34", 18, 63, 6, 4),
					layoutItem("panel-22", 0, 67, 16, 5),
					layoutItem("panel-23", 16, 67, 8, 5),
					layoutItem("panel-24", 0, 72, 24, 3),
					layoutItem("panel-25", 0, 75, 8, 10),
					layoutItem("panel-26", 8, 75, 8, 10),
					layoutItem("panel-27", 16, 75, 8, 10),
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
						"Filtrerer bare toppkort og flåtematrisen. Faste seksjoner og detaljpaneler endres ikke.",
					hide: "dontHide",
					includeAll: false,
					label: "Operativt område",
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
						"Velger én tjeneste for detaljpaneler og lenker, uavhengig av operativt område.",
					hide: "dontHide",
					includeAll: false,
					label: "Detaljtjeneste",
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
