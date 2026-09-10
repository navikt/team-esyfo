import {
	BUDSTIKKA_RUNBOOK_URL,
	CONTROL_ROOM_GUIDE_URL,
	controlRoomApplicationOptions,
	controlRoomApplicationRegex,
	controlRoomApplications,
	controlRoomServerApplications,
	DESERIALIZATION_RUNBOOK_URL,
	lifecycleLabel,
	MOTEBEHOV_RUNBOOK_URL,
	PIPELINE_RUNBOOK_URL,
	RUNTIME_RUNBOOK_URL,
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
import { runtimeRejectionScopeDataLink } from "./error-drilldown.ts";
import { apmDataLink, runtimeLogsDataLink } from "./runtime-links.ts";
import {
	runtimeErrorPipeline,
	runtimeRejectionPipeline,
} from "./runtime-logql.ts";

export { apmDataLink, runtimeLogsDataLink } from "./runtime-links.ts";

export const CONTROL_ROOM_UID = "team-esyfo-kontrollrom";
export const CONTROL_ROOM_FOLDER_UID = TEAM_ESYFO_DASHBOARD_FOLDER_UID;
export const SERVICE_TAB_TITLE = "Undersøk en tjeneste";

const FROM = grafanaVariable("__from");
const TO = grafanaVariable("__to");
const FLEET_SERVICE_REGEX = controlRoomApplicationRegex;
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

export const expectedScopeVectorQuery = allExpectedApplicationVector;
export const expectedServerScopeVectorQuery = serverExpectedApplicationVector;

const spanSelector = (serviceMatcher: string) =>
	[
		'service_namespace="team-esyfo"',
		'k8s_cluster_name="prod"',
		serviceMatcher,
		'span_kind="SPAN_KIND_SERVER"',
	].join(", ");

const fleetSpanSelector = spanSelector(
	`service_name=~"${FLEET_SERVICE_REGEX}"`,
);
const selectedSpanSelector = spanSelector(`service_name="${SERVICE_VARIABLE}"`);
const fleetErrorSpanSelector = `${fleetSpanSelector}, status_code="STATUS_CODE_ERROR"`;
const selectedErrorSpanSelector = `${selectedSpanSelector}, status_code="STATUS_CODE_ERROR"`;

const kubeSelector = (serviceMatcher: string) =>
	['namespace="team-esyfo"', 'k8s_cluster_name="prod"', serviceMatcher].join(
		", ",
	);

const fleetKubeContainerSelector = kubeSelector(
	`container=~"${FLEET_SERVICE_REGEX}"`,
);
const selectedKubeContainerSelector = kubeSelector(
	`container="${SERVICE_VARIABLE}"`,
);
const fleetKubeDeploymentSelector = kubeSelector(
	`deployment=~"${FLEET_SERVICE_REGEX}"`,
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

export const requestsByServiceQuery = fleetRequestsByService;
export const otelErrorsByServiceQuery = `((${fleetOtelErrorsByService}) or on(service_name) ((${fleetRequestsByService}) * 0)) and on(service_name) ((${fleetRequestsByService}) > 0)`;
export const fleetOtelErrorCountQuery = `sum(${otelErrorsByServiceQuery})`;

const fleetRuntimeSelector = `{service_namespace="team-esyfo", k8s_cluster_name="prod", service_name=~"${FLEET_SERVICE_REGEX}"}`;
const selectedRuntimeSelector = `{service_namespace="team-esyfo", k8s_cluster_name="prod", service_name="${SERVICE_VARIABLE}"}`;

export const runtimeErrorCountQuery = `sum(count_over_time(${selectedRuntimeSelector}
${runtimeErrorPipeline}
[$__range]))`;

export const runtimeErrorsByServiceQuery = `sum by (service_name) (count_over_time(${fleetRuntimeSelector}
${runtimeErrorPipeline}
[$__range]))`;
export const fleetRuntimeErrorCountQuery = `sum(${runtimeErrorsByServiceQuery})`;

export const apiRejectionsByServiceQuery = `sum by (service_name) (count_over_time(${fleetRuntimeSelector}
${runtimeRejectionPipeline}
| keep service_name
[$__range]))`;
export const fleetApiRejectionCountQuery = `sum(${apiRejectionsByServiceQuery})`;

const fleetRestartsByContainer = `sum by (container) (max by (pod, container) (increase(${RESTARTS_METRIC}{${fleetKubeContainerSelector}}[$__range])))`;
export const restartsByServiceQuery = `sum by (service_name) (label_replace(${fleetRestartsByContainer}, "service_name", "$1", "container", "(.*)"))`;
export const restartCountQuery = `sum(max by (pod, container) (increase(${RESTARTS_METRIC}{${selectedKubeContainerSelector}}[$__range])))`;
export const fleetRestartCountQuery = `sum(${restartsByServiceQuery})`;

export const podRestartsQuery = `max by (pod, container) (increase(${RESTARTS_METRIC}{${selectedKubeContainerSelector}}[$__range]))`;
// Latest reason on current pods, not the cause of every restart in a window.
export const podTerminationReasonQuery = `max by (pod, container, reason) (kube_pod_container_status_last_terminated_reason{${selectedKubeContainerSelector}}) == 1`;

const readyByDeployment = (selector: string) =>
	`max by (deployment) (${READY_REPLICAS_METRIC}{${selector}})`;
const desiredByDeployment = (selector: string) =>
	`max by (deployment) (${DESIRED_REPLICAS_METRIC}{${selector}})`;
const fleetReady = readyByDeployment(fleetKubeDeploymentSelector);
const fleetDesired = desiredByDeployment(fleetKubeDeploymentSelector);
const selectedReady = readyByDeployment(selectedKubeDeploymentSelector);
const selectedDesired = desiredByDeployment(selectedKubeDeploymentSelector);
const guardedFleetReadyRatio = `(100 * ${fleetReady} / ${fleetDesired}) and on(deployment) (${fleetDesired} > 0)`;
const guardedSelectedReadyRatio = `(100 * ${selectedReady} / ${selectedDesired}) and on(deployment) (${selectedDesired} > 0)`;

export const lowestReadyRatioQuery = `min(${guardedFleetReadyRatio})`;
export const readyRatioByServiceQuery = `max by (service_name) (label_replace(${guardedFleetReadyRatio}, "service_name", "$1", "deployment", "(.*)"))`;
export const selectedReadyRatioQuery = guardedSelectedReadyRatio;

const currentSpanSeriesByService = `max by (service_name) (timestamp(${SPAN_CALLS_METRIC}{${fleetSpanSelector}}))`;
const recentSpanSeriesByService = `max by (service_name) (max_over_time(timestamp(${SPAN_CALLS_METRIC}{${fleetSpanSelector}})[30m:]))`;

export const telemetryStateByServiceQuery = `((0 * (${expectedServerScopeVectorQuery})) and on(service_name) (${currentSpanSeriesByService})) or (((1 * (${expectedServerScopeVectorQuery})) and on(service_name) (${recentSpanSeriesByService})) unless on(service_name) (${currentSpanSeriesByService})) or ((2 * (${expectedServerScopeVectorQuery})) unless on(service_name) (${recentSpanSeriesByService})) or ((3 * (${expectedScopeVectorQuery})) unless on(service_name) (${expectedServerScopeVectorQuery}))`;

export const requestRateByServiceQuery = `sum by (service_name) (rate(${SPAN_CALLS_METRIC}{${selectedSpanSelector}}[$__rate_interval]))`;
const selectedErrorRateByService = `sum by (service_name) (rate(${SPAN_CALLS_METRIC}{${selectedErrorSpanSelector}}[$__rate_interval]))`;
export const errorRatioByServiceQuery = `(100 * ((${selectedErrorRateByService} or on(service_name) (${requestRateByServiceQuery} * 0)) / ${requestRateByServiceQuery})) and on(service_name) (${requestRateByServiceQuery} > 0)`;
export const p95ByServiceQuery = `(histogram_quantile(0.95, sum by (service_name, le) (rate(${SPAN_LATENCY_METRIC}{${selectedSpanSelector}}[$__rate_interval])))) and on(service_name) (${requestRateByServiceQuery} > 0)`;
export const telemetryAgeByServiceQuery = `time() - max by (service_name) (timestamp(${SPAN_CALLS_METRIC}{${selectedSpanSelector}}))`;

export const jobFailureQuery = `max(max_over_time(${JOB_FAILED_METRIC}{namespace="team-esyfo", k8s_cluster_name="prod", job_name=~"esyfovarsel-job.*", condition="true"}[$__range]))`;
export const budstikkaLagQuery = `max by (topic) (${BUDSTIKKA_LAG_METRIC}{app="syfo-budstikka", namespace="team-esyfo", k8s_cluster_name="prod", topic="team-esyfo.budstikka.v1"})`;
export const sykmeldingConsumerPollAgeByPodQuery = `max by (pod) (${KAFKA_CONSUMER_LAST_POLL_METRIC}{app="syfo-oppfolgingsplan-backend", namespace="team-esyfo", k8s_cluster_name="prod"})`;
export const sykmeldingConsumerCommittedLagQuery = `max(${KAFKA_CONSUMER_GROUP_TOPIC_LAG_METRIC}{namespace="nais-system", k8s_cluster_name="prod", group="syfo-oppfolgingsplan-backend-sykmeldingsperiode-v2", topic="teamsykmelding.syfo-sendt-sykmelding"})`;
export const deserializationRateQuery = `sum(rate(${DESERIALIZATION_ERROR_METRIC}{namespace="team-esyfo", k8s_cluster_name="prod"}[$__rate_interval]))`;
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

export const errorDashboardDataLink = (service: string) =>
	`/d/team-esyfo-feiloversikt/team-esyfo-feiloversikt?orgId=1&from=${FROM}&to=${TO}&var-runtime_environment=prod&var-app=${service}`;

export const serviceInvestigationDataLink = (service: string) =>
	`/d/${CONTROL_ROOM_UID}?orgId=1&from=${FROM}&to=${TO}&dtab=${encodeURIComponent(SERVICE_TAB_TITLE.replaceAll(" ", "-"))}&var-service=${service}`;

const serviceDataLinks = (service: string) => [
	dataLink("APM og tracing", apmDataLink(service)),
	dataLink("Feiloversikt", errorDashboardDataLink(service)),
	dataLink("Logger", runtimeLogsDataLink(service)),
	dataLink("Runbook", RUNTIME_RUNBOOK_URL),
];

const diagnosticLinks = (service: string, runbook: string, issue: string) => [
	...serviceDataLinks(service),
	dataLink("Tjenestens runbook", runbook),
	dataLink("Målegrunnlag", issue),
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
	noValue = "Ukjent",
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
	noValue?: string;
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
						noValue,
						thresholds: { mode: "absolute", steps: thresholds },
						unit,
					},
					overrides: [],
				},
				options: {
					colorMode,
					graphMode: "none",
					justifyMode: "center",
					orientation: "auto",
					percentChangeColorMode: "standard",
					reduceOptions: {
						calcs: ["lastNotNull"],
						fields: "",
						values: false,
					},
					showPercentChange: false,
					text: { valueSize: 32 },
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
	overrides = [],
}: {
	id: number;
	title: string;
	description: string;
	query: PanelQuery;
	unit: string;
	thresholds: Threshold[];
	links?: PanelLink[];
	fieldLinks?: PanelLink[];
	overrides?: Array<Record<string, unknown>>;
}) => ({
	kind: "Panel",
	spec: {
		data: queryGroup([query]),
		description: `${description} Last* under grafen er siste observerte verdi i tidsrommet, ikke nødvendigvis en oppdatert måling.`,
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
							...(unit === "percent"
								? { axisSoftMin: 0, axisSoftMax: 100 }
								: {}),
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
					overrides,
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
		"Value #Requests": "Kall i perioden",
		"Value #OTel-feil": "Feilmarkerte kall",
		"Value #Runtimefeil": "Loggfeil i perioden",
		"Value #Avvisninger": "API-avvisninger i perioden",
		"Value #Restarts": "Omstarter i perioden",
		"Value #Klare replikaer": "Klare replikaer",
		"Value #Telemetry": "HTTP-målinger",
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
			],
		],
		["Value #Avvisninger", attentionThresholds],
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
					lokiQuery("Avvisninger", apiRejectionsByServiceQuery),
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
									criticality: true,
									lifecycle: true,
									role: true,
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
				"Alle operative produksjonstjenester fra inventaret, også når målinger mangler. Kall, logghendelser, API-avvisninger og omstarter gjelder valgt tidsrom. Replikaer og HTTP-målinger er tilstand ved periodens slutt. HTTP-målinger viser seriesignal, ikke siste kall. Bakgrunnstjenester har ikke HTTP-kontrakt. Manglende tall er ukjent, ikke null. Klikk tjenesten for APM, tracing, feilgrupper eller logger.",
			id: 10,
			links: [dataLink("HTTP/runtime-runbook", RUNTIME_RUNBOOK_URL)],
			title: "Tjenester i produksjon",
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
								matcher: { id: "byName", options: fields.service_name },
								properties: [
									{
										id: "links",
										value: [
											{
												...dataLink(
													"Undersøk tjenesten",
													serviceInvestigationDataLink(ROW_VALUE),
												),
												targetBlank: false,
											},
											...serviceDataLinks(ROW_VALUE),
										],
									},
									{ id: "custom.width", value: 290 },
								],
							},
							{
								matcher: { id: "byName", options: fields["Value #Telemetry"] },
								properties: [
									{
										id: "mappings",
										value: [
											{
												options: {
													"0": { color: "blue", text: "Mottar data" },
													"1": { color: "yellow", text: "Forsinket" },
													"2": { color: "yellow", text: "Mangler" },
													"3": { color: "text", text: "Bakgrunnstjeneste" },
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
								matcher: {
									id: "byName",
									options: fields[field as keyof typeof fields],
								},
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
									options: fields["Value #Klare replikaer"],
								},
								properties: [
									{ id: "unit", value: "percent" },
									{
										id: "mappings",
										value: [
											{
												type: "special",
												options: {
													match: "null",
													result: { text: "—", color: "gray" },
												},
											},
										],
									},
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
						enablePagination: false,
						showHeader: true,
						sortBy: [
							{ desc: true, displayName: fields["Value #Runtimefeil"] },
							{ desc: false, displayName: "Klare replikaer" },
							{ desc: true, displayName: fields["Value #OTel-feil"] },
							{ desc: true, displayName: fields["Value #Restarts"] },
						],
					},
				},
				version: GRAFANA_VERSION,
			},
		},
	};
};

const podDiagnosticsPanel = () => ({
	kind: "Panel",
	spec: {
		id: 36,
		title: "Omstarter og siste avslutningsårsak",
		description:
			"Estimerte restarts i valgt tidsrom, også fra erstattede podder. Årsak er siste registrerte avslutning på nåværende pod, ikke årsak til alle restarts i vinduet. Tidspunkt er ikke tilgjengelig. OOMKilled betyr drept på grunn av minne; Error krever logger. Manglende årsak er ukjent. Klikk podnavnet for poddens logger i valgt tidsrom.",
		links: serviceDataLinks(SERVICE_VARIABLE),
		data: queryGroup(
			[
				prometheusQuery("Restarts", podRestartsQuery, "instant", "", "table"),
				prometheusQuery(
					"Siste årsak",
					podTerminationReasonQuery,
					"instant",
					"",
					"table",
				),
			],
			[
				mergeTableFrames,
				{
					kind: "Transformation",
					group: "organize",
					spec: {
						options: {
							excludeByName: {
								Time: true,
								container: true,
								"Value #Siste årsak": true,
							},
							indexByName: {
								pod: 0,
								"Value #Restarts": 1,
								reason: 2,
							},
							renameByName: {
								pod: "Pod",
								"Value #Restarts": "Omstarter i perioden",
								reason: "Siste avslutningsårsak",
							},
						},
					},
				},
			],
		),
		vizConfig: {
			kind: "VizConfig",
			group: "table",
			version: GRAFANA_VERSION,
			spec: {
				fieldConfig: {
					defaults: {
						noValue: "Ukjent",
						decimals: 0,
						custom: { cellOptions: { type: "auto" }, inspect: false },
					},
					overrides: [
						{
							matcher: { id: "byName", options: "Pod" },
							properties: [
								{
									id: "links",
									value: [
										dataLink(
											"Podlogger · valgt tidsrom",
											`${runtimeLogsDataLink(SERVICE_VARIABLE)}&var-filters=k8s_pod_name%7C%3D%7C${ROW_VALUE}`,
										),
									],
								},
							],
						},
					],
				},
				options: {
					showHeader: true,
					cellHeight: "sm",
					enablePagination: true,
					sortBy: [{ displayName: "Omstarter i perioden", desc: true }],
				},
			},
		},
	},
});

const deviationThresholds: Threshold[] = [
	{ color: "gray", value: 0 },
	{ color: "red", value: 1 },
];
// Readiness is an instantaneous signal, not proof of an incident or its duration.
const readyThresholds: Threshold[] = [
	{ color: "yellow", value: 0 },
	{ color: "green", value: 100 },
];
const neutralThresholds: Threshold[] = [{ color: "blue", value: 0 }];
const attentionThresholds: Threshold[] = [
	{ color: "gray", value: 0 },
	{ color: "yellow", value: 1 },
];
const pollAgeThresholds: Threshold[] = [
	{ color: "blue", value: 0 },
	{ color: "yellow", value: 60 },
	{ color: "red", value: 300 },
];

const selectedService = "meroppfolging-backend";
const selectedServiceText =
	controlRoomApplicationOptions.find(({ value }) => value === selectedService)
		?.text ?? selectedService;
const serviceVariable = {
	kind: "CustomVariable",
	spec: {
		allowCustomValue: false,
		current: { text: selectedServiceText, value: selectedService },
		description:
			"Velger tjeneste bare i denne fanen. Oversikten over produksjonstjenester endres ikke.",
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
};
// Native row conditions preserve panel sizes and inherit the tab-local variable.
const serviceCondition = (operator: "equals" | "matches", value: string) => ({
	kind: "ConditionalRenderingGroup",
	spec: {
		visibility: "show",
		condition: "and",
		items: [
			{
				kind: "ConditionalRenderingVariable",
				spec: { variable: "service", operator, value },
			},
		],
	},
});
const detailSection = (
	title: string,
	items: ReturnType<typeof layoutItem>[],
	condition?: ReturnType<typeof serviceCondition>,
) => ({
	kind: "RowsLayoutRow",
	spec: {
		title,
		collapse: false,
		hideHeader: true,
		layout: { kind: "GridLayout", spec: { items } },
		...(condition ? { conditionalRendering: condition } : {}),
	},
});
const dashboardLink = (title: string, url: string, keepTime = false) => ({
	title,
	tooltip: "",
	type: "link",
	url,
	targetBlank: true,
	icon: "external link",
	tags: [],
	asDropdown: false,
	includeVars: false,
	keepTime,
});

const dinesykmeldteOutcomeLabels = {
	attempt: "Alle kall",
	good: "Vellykkede svar",
	http_4xx: "HTTP 4xx",
	technical_failure: "Feilmarkerte svar",
	unclassified: "Øvrig eller ukjent status",
};
const dinesykmeldteSeriesOverrides = (
	outcomes: Array<keyof typeof dinesykmeldteOutcomeLabels>,
) =>
	[
		["minesykmeldte", "Sykmeldte"],
		["virksomheter", "Virksomheter"],
	].flatMap(([operation, label]) =>
		outcomes.map((outcome) => ({
			matcher: { id: "byName", options: `${operation} · ${outcome}` },
			properties: [
				{
					id: "displayName",
					value: `${label} · ${dinesykmeldteOutcomeLabels[outcome]}`,
				},
			],
		})),
	);

export const buildControlRoomDashboard = (): GrafanaDashboardResource => ({
	apiVersion: "dashboard.grafana.app/v2",
	kind: "Dashboard",
	metadata: {
		annotations: { "grafana.app/folder": CONTROL_ROOM_FOLDER_UID },
		name: CONTROL_ROOM_UID,
	},
	spec: {
		annotations: [],
		cursorSync: "Off",
		description:
			"Produksjonsoversikt for Team eSyfo: observerte feil, omstarter, replikaer og måledata. Finn tjenesten og gå videre til APM, tracing, feilgrupper eller logger.",
		editable: true,
		elements: {
			"panel-2": statPanel({
				id: 2,
				title: "Feilmarkerte kall i perioden",
				description:
					"Antall inngående SERVER-spans markert STATUS_CODE_ERROR i valgt tidsrom. Dette er OTel-feilstatus, ikke automatisk HTTP 5xx eller bevist brukerimpact. Null vises bare når kallmetrikker finnes. Manglende HTTP-målinger vises også per tjeneste.",
				query: prometheusQuery(
					"Feilmarkerte kall",
					fleetOtelErrorCountQuery,
					"instant",
				),
				unit: "short",
				thresholds: deviationThresholds,
				decimals: 0,
				links: [dataLink("Runbook", RUNTIME_RUNBOOK_URL)],
			}),
			"panel-32": statPanel({
				id: 32,
				title: "Loggfeil i perioden",
				description:
					"Antall error-, critical- eller fatal-klassifiserte runtime-logghendelser i valgt tidsrom. Browservideresendte logger er utelatt. Ingen treff betyr ingen samsvarende logglinjer, ikke bevist feilfri drift eller komplett logging.",
				query: lokiQuery("Loggfeil", fleetRuntimeErrorCountQuery),
				unit: "short",
				thresholds: deviationThresholds,
				decimals: 0,
				noValue: "Ingen treff",
				links: [dataLink("Feiloversikt", errorDashboardDataLink("$__all"))],
			}),
			"panel-4": statPanel({
				id: 4,
				title: "Omstarter i perioden",
				description:
					"Estimert antall containeromstarter i valgt tidsrom. Gult betyr undersøk, ikke påvist nedetid. Vanlig pod-utskifting ved deploy eller skalering teller ikke. Manglende restartmetrikker blir ikke null. Historikk og siste avslutningsårsak finnes under Undersøk en tjeneste.",
				query: prometheusQuery("Omstarter", fleetRestartCountQuery, "instant"),
				unit: "short",
				thresholds: attentionThresholds,
				decimals: 0,
				links: [dataLink("Runbook", RUNTIME_RUNBOOK_URL)],
			}),
			"panel-5": statPanel({
				id: 5,
				title: "Replikaer · lavest ved periodeslutt",
				description:
					"Laveste observerte klare/ønskede replikaandel ved periodens slutt. Gult kan skyldes et kort fall ved deploy eller skalering; se utviklingen for tjenesten før du konkluderer. Manglende målinger og desired=0 gir ikke null eller grønt.",
				query: prometheusQuery(
					"Laveste andel klare replikaer",
					lowestReadyRatioQuery,
					"instant",
				),
				unit: "percent",
				thresholds: readyThresholds,
				decimals: 0,
				links: [dataLink("Runbook", RUNTIME_RUNBOOK_URL)],
			}),
			"panel-10": fleetTablePanel(),
			"panel-12": timeSeriesPanel({
				id: 12,
				title: "Kall per sekund",
				description:
					"Inbound SERVER-spans for valgt tjeneste. Bakgrunnstjenester vurderes med kø- og jobbsignaler, ikke HTTP-målinger.",
				query: prometheusQuery(
					"Kall per sekund",
					requestRateByServiceQuery,
					"range",
					"{{service_name}}",
				),
				unit: "reqps",
				thresholds: neutralThresholds,
			}),
			"panel-13": timeSeriesPanel({
				id: 13,
				title: "Andel feilmarkerte kall",
				description:
					"Andel inbound SERVER-spans med OTel-feilstatus STATUS_CODE_ERROR. Null vises bare med observert trafikk. Ingen trafikk eller manglende måling gir Ukjent; dette er ikke en vedtatt SLO-grense.",
				query: prometheusQuery(
					"Andel kall med feil",
					errorRatioByServiceQuery,
					"range",
					"{{service_name}}",
				),
				unit: "percent",
				thresholds: neutralThresholds,
			}),
			"panel-14": timeSeriesPanel({
				id: 14,
				title: "Svartid · 95-persentil",
				description:
					"95 prosent av observerte inbound SERVER-spans er raskere enn denne tiden. Gjelder bare valgt tjeneste, ikke hele flåten. Manglende trafikk gir Ukjent. Ingen generell SLO-grense.",
				query: prometheusQuery(
					"Svartid P95",
					p95ByServiceQuery,
					"range",
					"{{service_name}}",
				),
				unit: "s",
				thresholds: neutralThresholds,
			}),
			"panel-15": statPanel({
				id: 15,
				title: "Loggfeil i perioden",
				description:
					"Error-, critical- eller fatal-klassifiserte runtime-logger for valgt tjeneste og tidsrom. Browservideresendte logger er ekskludert. Ingen treff er ikke bevis på feilfri drift eller komplett logging. Åpne Feiloversikt for feilgrupper.",
				query: lokiQuery("Loggfeil", runtimeErrorCountQuery),
				unit: "short",
				thresholds: deviationThresholds,
				decimals: 0,
				noValue: "Ingen treff",
				links: serviceDataLinks(SERVICE_VARIABLE),
			}),
			"panel-37": timeSeriesPanel({
				id: 37,
				title: "Klare replikaer over tid",
				description:
					"Andel klare av ønskede replikaer. Et kort fall kan skyldes deploy eller skalering; vedvarende mangel krever undersøkelse. Ikke en incident- eller deploydetektor. desired=0 og manglende målinger blir ikke null eller grønt.",
				query: prometheusQuery(
					"Klare replikaer",
					selectedReadyRatioQuery,
					"range",
					"{{deployment}}",
				),
				unit: "percent",
				thresholds: readyThresholds,
				links: serviceDataLinks(SERVICE_VARIABLE),
				fieldLinks: serviceDataLinks(SERVICE_VARIABLE),
			}),
			"panel-36": podDiagnosticsPanel(),
			"panel-33": statPanel({
				id: 33,
				title: "Kafka · tid siden poll ved periodeslutt",
				description:
					"Ved periodens slutt: sekunder siden Kafka-klientens siste poll()-kall per pod i syfo-oppfolgingsplan-backend. Under 60 sekunder er nøytralt, 60–300 gult og minst 300 rødt. IKKE POLLET er verdien -1 før første poll, ikke bevis på feil under oppstart. Signalet beviser ikke null lag eller ende-til-ende-leveranse. No data er Ukjent.",
				query: prometheusQuery(
					"Tid siden poll",
					sykmeldingConsumerPollAgeByPodQuery,
					"instant",
					"{{pod}}",
				),
				unit: "s",
				thresholds: pollAgeThresholds,
				decimals: 0,
				mappings: [
					{
						options: { "-1": { color: "yellow", text: "Ikke pollet" } },
						type: "value",
					},
				],
				links: [
					...serviceDataLinks("syfo-oppfolgingsplan-backend"),
					dataLink("Køer og jobber", PIPELINE_RUNBOOK_URL),
				],
			}),
			"panel-34": statPanel({
				id: 34,
				title: "Sykmeldinger · kø ved periodeslutt",
				description:
					"Ved periodens slutt: samlet committed lag for consumer group syfo-oppfolgingsplan-backend-sykmeldingsperiode-v2 på teamsykmelding.syfo-sendt-sykmelding. Null betyr ingen observert transportbacklog ved siste scrape, ikke bevist korrekt behandling. Positiv lag kan være kortvarig. Manglende måling er Ukjent.",
				query: prometheusQuery(
					"Meldinger bak",
					sykmeldingConsumerCommittedLagQuery,
					"instant",
				),
				unit: "short",
				thresholds: neutralThresholds,
				decimals: 0,
				links: [
					...serviceDataLinks("syfo-oppfolgingsplan-backend"),
					dataLink("Køer og jobber", PIPELINE_RUNBOOK_URL),
				],
			}),
			"panel-25": timeSeriesPanel({
				id: 25,
				title: "budstikka.v1 · største partisjonslag",
				description:
					"Største observerte lag for en partisjon på team-esyfo.budstikka.v1, på tvers av Kafka-klienter. Ikke summen av meldinger bak, Budstikkas interne leveringskø eller bevis på at mottakeren har fått varselet. Kortvarig lag er ikke alene en driftsfeil.",
				query: prometheusQuery(
					"Meldinger bak",
					budstikkaLagQuery,
					"range",
					"{{topic}}",
				),
				unit: "short",
				thresholds: neutralThresholds,
				links: diagnosticLinks(
					"syfo-budstikka",
					BUDSTIKKA_RUNBOOK_URL,
					"https://github.com/navikt/team-esyfo/issues/219",
				),
				fieldLinks: diagnosticLinks(
					"syfo-budstikka",
					BUDSTIKKA_RUNBOOK_URL,
					"https://github.com/navikt/team-esyfo/issues/219",
				),
			}),
			"panel-26": timeSeriesPanel({
				id: 26,
				title: "Sykmeldinger · deserialiseringsfeil",
				description:
					"Observerte deserialiseringsfeil per sekund. Legacy-telleren skiller ikke terminalt avviste meldinger fra gjentatte forsøk. Bruk runbooken før restart eller ny behandling; ikke les dette som antall tapte meldinger.",
				query: prometheusQuery(
					"Deserialiseringsfeil",
					deserializationRateQuery,
					"range",
					"observerte deserialiseringsfeil",
				),
				unit: "ops",
				thresholds: neutralThresholds,
				links: diagnosticLinks(
					"syfo-oppfolgingsplan-backend",
					DESERIALIZATION_RUNBOOK_URL,
					"https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/449",
				),
				fieldLinks: diagnosticLinks(
					"syfo-oppfolgingsplan-backend",
					DESERIALIZATION_RUNBOOK_URL,
					"https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/449",
				),
			}),
			"panel-23": statPanel({
				id: 23,
				title: "esyfovarsel-job · feilet kjøring",
				description:
					"Den separate jobben esyfovarsel-job starter behandling i esyfovarsel. Viser om jobben hadde Kubernetes-tilstanden Failed=True i valgt tidsrom. 0 betyr ingen true-tilstand i observerte serier, ikke bevist vellykket eller forventet kjøring. Manglende Job-metrikk gir Ukjent.",
				query: prometheusQuery("Feilet kjøring", jobFailureQuery, "instant"),
				unit: "short",
				thresholds: deviationThresholds,
				decimals: 0,
				mappings: [
					{
						type: "value",
						options: {
							"0": { color: "gray", text: "Ingen observert" },
							"1": { color: "red", text: "Feilet kjøring" },
						},
					},
				],
				links: [
					dataLink("Jobbens logger", runtimeLogsDataLink("esyfovarsel-job")),
					dataLink("Køer og jobber", PIPELINE_RUNBOOK_URL),
				],
			}),
			"panel-30": timeSeriesPanel({
				id: 30,
				title: "Dine sykmeldte · kall og vellykkede svar",
				description:
					"Produksjonstrafikk på GET /api/minesykmeldte og GET /api/virksomheter. attempt viser alle observerte kall; good er 2xx uten OTel-feilstatus. Ingen trafikk er ikke bevist feil. Dette er diagnostikk, ikke en vedtatt SLI eller SLO.",
				query: prometheusQuery(
					"Kall og vellykkede svar",
					dinesykmeldteTrafficRateQuery,
					"range",
					"{{operation}} · {{outcome}}",
				),
				unit: "reqps",
				thresholds: neutralThresholds,
				links: serviceDataLinks("dinesykmeldte-backend"),
				fieldLinks: serviceDataLinks("dinesykmeldte-backend"),
				overrides: dinesykmeldteSeriesOverrides(["attempt", "good"]),
			}),
			"panel-31": timeSeriesPanel({
				id: 31,
				title: "Dine sykmeldte · avvikende svar",
				description:
					"De samme to rutene: http_4xx er ikke kalt forventet, fordi tekniske introspeksjonsfeil kan maskeres som 401. technical_failure er 5xx eller OTel-feilstatus; unclassified dekker øvrige svar og manglende HTTP-status. Manglende serier blir ikke null.",
				query: prometheusQuery(
					"Avvikende svar",
					dinesykmeldteDeviationRateQuery,
					"range",
					"{{operation}} · {{outcome}}",
				),
				unit: "reqps",
				thresholds: neutralThresholds,
				links: [
					...serviceDataLinks("dinesykmeldte-backend"),
					dataLink(
						"HTTP-utfall",
						"https://github.com/navikt/dinesykmeldte-backend/issues/729",
					),
				],
				fieldLinks: serviceDataLinks("dinesykmeldte-backend"),
				overrides: dinesykmeldteSeriesOverrides([
					"http_4xx",
					"technical_failure",
					"unclassified",
				]),
			}),
			"panel-27": timeSeriesPanel({
				id: 27,
				title: "Møtebehov · tilgjengelige replikaer",
				description:
					"Available/desired for syfomotebehov. Available har Kubernetes' krav om minimumstid klar og er ikke det samme som ready. Et kort fall kan skyldes utrulling. desired=0 og manglende måling blir ikke null eller grønt.",
				query: prometheusQuery(
					"Tilgjengelige replikaer",
					motebehovAvailableRatioQuery,
					"range",
					"{{deployment}}",
				),
				unit: "percent",
				thresholds: readyThresholds,
				links: diagnosticLinks(
					"syfomotebehov",
					MOTEBEHOV_RUNBOOK_URL,
					"https://github.com/navikt/syfomotebehov/issues/753",
				),
				fieldLinks: serviceDataLinks("syfomotebehov"),
			}),
			"panel-35": statPanel({
				id: 35,
				title: "API-avvisninger i perioden",
				description:
					"Antall WARN-hendelser av typen api_request_rejected i valgt tidsrom. Dekker bare produsenter av denne hendelsen, ikke alle WARN eller HTTP 4xx. Kan skyldes input, klientintegrasjon eller konfigurasjon; ikke automatisk driftsfeil. Ingen treff er ikke bevist fravær av avvisninger. Feiloversikt viser grupper av avvisningsgrunner.",
				query: lokiQuery("API-avvisninger", fleetApiRejectionCountQuery),
				unit: "short",
				thresholds: attentionThresholds,
				decimals: 0,
				noValue: "Ingen treff",
				links: [
					dataLink("Feiloversikt", errorDashboardDataLink("$__all")),
					dataLink(
						"Avgrensede avvisningslogger",
						runtimeRejectionScopeDataLink(FLEET_SERVICE_REGEX),
					),
				],
			}),
		},
		layout: {
			kind: "TabsLayout",
			spec: {
				tabs: [
					{
						kind: "TabsLayoutTab",
						spec: {
							title: "Oversikt",
							layout: {
								kind: "GridLayout",
								spec: {
									items: [
										layoutItem("panel-2", 0, 0, 4, 4),
										layoutItem("panel-32", 4, 0, 5, 4),
										layoutItem("panel-35", 9, 0, 5, 4),
										layoutItem("panel-4", 14, 0, 5, 4),
										layoutItem("panel-5", 19, 0, 5, 4),
										layoutItem(
											"panel-10",
											0,
											4,
											24,
											controlRoomApplications.length + 2,
										),
									],
								},
							},
						},
					},
					{
						kind: "TabsLayoutTab",
						spec: {
							title: SERVICE_TAB_TITLE,
							variables: [serviceVariable],
							layout: {
								kind: "RowsLayout",
								spec: {
									rows: [
										detailSection(
											"HTTP",
											[
												layoutItem("panel-12", 0, 0, 8, 7),
												layoutItem("panel-13", 8, 0, 8, 7),
												layoutItem("panel-14", 16, 0, 8, 7),
											],
											serviceCondition(
												"matches",
												`^(${controlRoomServerApplications.map(({ runtime }) => runtime.name).join("|")})$`,
											),
										),
										detailSection("Runtime", [
											layoutItem("panel-15", 0, 0, 6, 6),
											layoutItem("panel-37", 6, 0, 18, 6),
										]),
										detailSection(
											"Sykmeldinger",
											[
												layoutItem("panel-33", 0, 0, 12, 5),
												layoutItem("panel-34", 12, 0, 12, 5),
												layoutItem("panel-26", 0, 5, 24, 7),
											],
											serviceCondition(
												"equals",
												"syfo-oppfolgingsplan-backend",
											),
										),
										detailSection(
											"Budstikka",
											[layoutItem("panel-25", 0, 0, 24, 7)],
											serviceCondition("equals", "syfo-budstikka"),
										),
										detailSection(
											"Varslingsjobb",
											[layoutItem("panel-23", 0, 0, 24, 4)],
											serviceCondition("equals", "esyfovarsel"),
										),
										detailSection(
											"Dine sykmeldte",
											[
												layoutItem("panel-30", 0, 0, 12, 7),
												layoutItem("panel-31", 12, 0, 12, 7),
											],
											serviceCondition("equals", "dinesykmeldte-backend"),
										),
										detailSection(
											"Møtebehov",
											[layoutItem("panel-27", 0, 0, 24, 6)],
											serviceCondition("equals", "syfomotebehov"),
										),
										detailSection("Podder", [
											layoutItem("panel-36", 0, 0, 24, 6),
										]),
									],
								},
							},
						},
					},
				],
			},
		},
		links: [
			dashboardLink(
				"Feiloversikt",
				"https://grafana.nav.cloud.nais.io/d/team-esyfo-feiloversikt?var-runtime_environment=prod",
				true,
			),
			dashboardLink(
				"Runbooks",
				"https://navikt.github.io/team-esyfo/utvikling/observability/runbooks/",
			),
			dashboardLink("Om målingene", CONTROL_ROOM_GUIDE_URL),
		],
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
		title: "Team eSyfo · Kontrollrom",
		variables: [],
	},
});

export const serializeControlRoomDashboard = () =>
	`${JSON.stringify(buildControlRoomDashboard(), null, 2)}\n`;
