import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as pause } from "node:timers/promises";
import { promisify } from "node:util";
import {
	buildControlRoomDashboard,
	fleetOtelErrorCountQuery,
	fleetRestartCountQuery,
	jobFailureQuery,
	lowestReadyRatioQuery,
	podTerminationReasonQuery,
	readyRatioByServiceQuery,
	selectedReadyRatioQuery,
} from "../.vitepress/grafana/control-room.ts";
import {
	browserByTypeQuery,
	browserErrorGroupDataLink,
	runtimeByClassificationQuery,
	runtimeByServiceQuery,
	runtimeContractGapDataLink,
	runtimeContractGapQuery,
	runtimeErrorGroupDataLink,
	runtimeRejectionDataLink,
	runtimeRejectionsQuery,
	runtimeTrendQuery,
	tracedRuntimeErrorsQuery,
} from "../.vitepress/grafana/error-drilldown.ts";

// Only synthetic data is sent to the loopback-bound test container.
const exec = promisify(execFile);
const suffix = `${process.pid}-${randomBytes(4).toString("hex")}`;
const lokiContainer = `observability-query-check-${suffix}`;
const promtoolContainer = `observability-metric-check-${suffix}`;
const service = "flaggskipet";
const safeTrace = "1234567890abcdef1234567890abcdef";
const secondTrace = "abcdef1234567890abcdef1234567890";
const runtimeLabels = {
	service_namespace: "team-esyfo",
	service_name: service,
	k8s_cluster_name: "prod",
	k8s_container_name: service,
	detected_level: "error",
};
const canonicalError = {
	event_type: "fixture_failed",
	error_code: "DEPENDENCY_UNAVAILABLE",
	operation: "fetch_record",
	upstream_status: 503,
	trace_id: safeTrace,
	message: "Synthetic message that must not enter summary tables",
};
type Fixture = {
	labels?: Record<string, string>;
	fields?: Record<string, unknown>;
	line?: string;
};
const fixtures: Fixture[] = [
	{},
	{ labels: { detected_level: "ERROR" } },
	{
		labels: { detected_level: "critical" },
		fields: {
			event_type: undefined,
			exception_type: "IllegalStateException",
			error_code: "500",
			trace_id: undefined,
		},
	},
	{
		labels: { detected_level: "FATAL" },
		line: "Synthetic fatal runtime failure",
	},
	{
		fields: {
			event_type: "invalid event type",
			error_code: "invalid code",
			operation: "invalid operation",
			trace_id: "invalid trace",
		},
	},
	{
		fields: {
			event_type: "zero_trace_failed",
			trace_id: "00000000000000000000000000000000",
		},
	},
	{ line: "{malformed synthetic JSON" },
	{
		fields: {
			event_type: undefined,
			error: { type: "NestedError" },
			error_code: 123,
			upstream_status: "invalid status",
			trace_id: secondTrace,
		},
	},
	{
		labels: { detected_level: "warn" },
		fields: {
			event_type: "api_request_rejected",
			rejection_reason: "INVALID_INPUT",
		},
	},
	{
		labels: { detected_level: "WARNING" },
		fields: {
			event_type: "api_request_rejected",
			rejection_reason: "invalid reason",
		},
	},
	{
		labels: { detected_level: "warn" },
		fields: {
			event_type: "api_request_rejected",
			rejection_reason: "UNSPECIFIED",
		},
	},
	{
		labels: { detected_level: "warn" },
		fields: { event_type: "api_request_rejected" },
	},
	// Unrelated levels, forwarded browser logs, sidecars and other scopes stay out.
	{ labels: { detected_level: "info" } },
	{ labels: { detected_level: "warn" } },
	{ labels: { detected_level: "warn" }, line: "api_request_rejected" },
	{ fields: { x_isFrontend: true } },
	{ labels: { x_isFrontend: "true" } },
	{ labels: { k8s_container_name: "cloudsql-proxy" } },
	{ labels: { k8s_cluster_name: "dev" } },
	{ labels: { service_namespace: "another-team" } },
	{ labels: { service_name: "another-service" } },
];
const browserFixtures = [
	'app_namespace="team-esyfo" app_environment="prod-gcp" type="TypeError"',
	'app_namespace="team-esyfo" app_environment="dev-gcp" type="TypeError"',
	'app_namespace="team-esyfo" type="TypeError"',
	'app_namespace="team-esyfo" app_environment="prod-gcp" type="UnboundedFixtureType"',
	'app_namespace="another-team" app_environment="prod-gcp" type="TypeError"',
	'app_environment="prod-gcp" type="TypeError"',
	'app_namespace="team-esyfo" app_environment="invalid" type="TypeError"',
	'malformed="unterminated synthetic line',
];

type Vector = { metric: Record<string, string>; value: [number, string] };
type Stream = { stream: Record<string, string>; values: [string, string][] };
const total = (rows: Vector[]) =>
	rows.reduce((sum, row) => sum + Number(row.value[1]), 0);
const renderQuery = (query: string, app = service) =>
	query
		.replaceAll("${app:regex}", app)
		.replaceAll("${runtime_environment:regex}", "prod")
		.replaceAll("${browser_app:regex}", "dialogmote-frontend")
		.replaceAll("${service:raw}", service)
		.replaceAll("$__auto", "1h")
		.replaceAll("$__range", "1h");

async function waitForLoki(url: string) {
	for (let attempt = 0; attempt < 120; attempt++) {
		try {
			const response = await fetch(`${url}/ready`, {
				signal: AbortSignal.timeout(2000),
			});
			if (response.ok) return;
		} catch {
			// The local container is still starting.
		}
		await pause(500);
	}
	throw new Error("Local Loki did not become ready");
}

async function checkLogQueries(url: string) {
	const now = Date.now();
	const push = await fetch(`${url}/loki/api/v1/push`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			streams: [
				...["error", "warn"].map((level) => ({
					stream: {
						...runtimeLabels,
						service_name: "syfo-dokumentporten",
						detected_level: level,
					},
					values: [20, 21, 22]
						.map((minutes) => [
							String(BigInt(now - minutes * 60000) * 1000000n),
							JSON.stringify({
								...canonicalError,
								event_type:
									level === "warn" ? "api_request_rejected" : "fixture_failed",
							}),
						])
						.reverse(),
				})),
				...fixtures.map(({ labels, fields, line }, index) => ({
					stream: { ...runtimeLabels, ...labels },
					values: [
						[
							String(BigInt(now - 120000) * 1000000n + BigInt(index)),
							line ?? JSON.stringify({ ...canonicalError, ...fields }),
						],
					],
				})),
				{
					stream: { kind: "exception", service_name: "dialogmote-frontend" },
					values: browserFixtures.map((line, index) => [
						String(BigInt(now - 120000) * 1000000n + BigInt(index)),
						line,
					]),
				},
			],
		}),
		signal: AbortSignal.timeout(10000),
	});
	assert.equal(push.status, 204, await push.text());
	const request = async (query: string, app = service, logs = false) => {
		const params = new URLSearchParams({ query: renderQuery(query, app) });
		if (logs) {
			params.set("start", String((now - 3600000) / 1000));
			params.set("end", String(now / 1000));
			params.set("limit", "100");
		} else {
			params.set("time", String(now / 1000));
		}
		const response = await fetch(
			`${url}/loki/api/v1/${logs ? "query_range" : "query"}?${params}`,
			{ signal: AbortSignal.timeout(10000) },
		);
		const body = await response.text();
		assert.equal(response.status, 200, body);
		return JSON.parse(body).data.result;
	};
	const controlPanels = buildControlRoomDashboard().spec.elements as Record<
		string,
		{
			spec: {
				data: {
					spec: {
						queries: Array<{ spec: { query: { spec: { expr: string } } } }>;
					};
				};
			};
		}
	>;
	for (const [id, shortCount] of [["panel-32", 8]] as const) {
		const query =
			controlPanels[id].spec.data.spec.queries[0].spec.query.spec.expr;
		const total = (rows: Vector[]) =>
			rows.reduce((sum, row) => sum + Number(row.value[1]), 0);
		assert.equal(
			total(await request(query.replaceAll("$__range", "5m"))),
			shortCount,
		);
		assert.equal(
			total(await request(query.replaceAll("$__range", "1h"))),
			shortCount + 3,
		);
	}
	// Link fields have no text-changing Grafana mappings. Their query labels are
	// therefore the same strings that a person sees and follows in the table.
	const checkRowLinks = async (rows: Vector[], link: string) => {
		for (const { metric, value } of rows) {
			const materialized = link
				.replace(/\$\{__data\.fields\["([^"]+)"\]\}/g, (_match, field) => {
					assert.equal(
						typeof metric[field],
						"string",
						`Missing link field ${field}`,
					);
					return encodeURIComponent(metric[field]);
				})
				.replaceAll("${runtime_environment:regex}", "prod")
				.replaceAll("${__from}", String(now - 3600000))
				.replaceAll("${__to}", String(now));
			assert.ok(
				!materialized.includes("${"),
				"All row-link variables are resolved",
			);
			const state = JSON.parse(
				new URL(materialized, "https://grafana.example.test").searchParams.get(
					"panes",
				) ?? "{}",
			).A;
			assert.deepEqual(state.range, {
				from: String(now - 3600000),
				to: String(now),
			});
			const logs: Stream[] = await request(
				state.queries[0].expr,
				service,
				true,
			);
			assert.equal(
				logs.reduce((count, { values }) => count + values.length, 0),
				Number(value[1]),
				`The log link must find every counted event for ${JSON.stringify(metric)}`,
			);
		}
	};
	const errors: Vector[] = await request(runtimeByClassificationQuery);
	assert.equal(
		total(errors),
		8,
		"Only the eight eligible runtime errors count",
	);
	assert.deepEqual(
		[...new Set(errors.map(({ metric }) => metric.error_level))].sort(),
		["critical", "error", "fatal"],
	);
	const canonical = errors.find(
		({ metric }) => metric.error_type_display === "fixture_failed",
	);
	assert.equal(
		Number(canonical?.value[1]),
		2,
		"Case-insensitive levels share a signature",
	);
	assert.equal(canonical?.metric.error_code_display, "DEPENDENCY_UNAVAILABLE");
	assert.equal(canonical?.metric.operation_display, "fetch_record");
	assert.ok(
		errors.some(
			({ metric }) => metric.error_type_display === "IllegalStateException",
		),
	);
	assert.ok(
		errors.some(({ metric }) => metric.error_type_display === "NestedError"),
	);
	assert.ok(
		errors.some(
			({ metric }) =>
				metric.error_level === "fatal" &&
				metric.error_type_display === "Ikke oppgitt av appen",
		),
	);
	assert.doesNotMatch(
		JSON.stringify(errors),
		/invalid event type|invalid code|invalid operation|Synthetic message/,
	);
	await checkRowLinks(errors, runtimeErrorGroupDataLink());
	const contractGaps: Vector[] = await request(runtimeContractGapQuery);
	assert.equal(total(contractGaps), 5);
	await checkRowLinks(contractGaps, runtimeContractGapDataLink());
	assert.equal(total(await request(runtimeByServiceQuery)), 8);
	assert.ok(
		Math.abs(total(await request(runtimeTrendQuery)) - 8 / 60) < 1e-9,
		"The trend is errors per minute, not a zoom-dependent count",
	);

	const rejections: Vector[] = await request(runtimeRejectionsQuery);
	assert.equal(
		total(rejections),
		4,
		"Only structured WARN/Warning API rejections count",
	);
	assert.deepEqual(
		rejections.map(({ metric }) => metric.rejection_reason_display).sort(),
		["INVALID_INPUT", "Årsak ikke oppgitt"],
	);
	await checkRowLinks(rejections, runtimeRejectionDataLink());
	const traces: Stream[] = await request(
		tracedRuntimeErrorsQuery,
		service,
		true,
	);
	assert.equal(
		traces.reduce((count, { values }) => count + values.length, 0),
		3,
	);
	assert.deepEqual(
		[...new Set(traces.map(({ stream }) => stream.safe_trace_id))].sort(),
		[safeTrace, secondTrace].sort(),
	);
	assert.doesNotMatch(
		JSON.stringify(traces),
		/Synthetic message|invalid status|invalid trace|00000000000000000000000000000000/,
	);
	assert.ok(
		traces.some(({ stream }) => stream.upstream_status_display === "503"),
	);
	assert.ok(
		traces.some(({ stream }) => stream.upstream_status_display === "—"),
	);
	for (const query of [
		runtimeTrendQuery,
		runtimeByServiceQuery,
		runtimeByClassificationQuery,
		runtimeRejectionsQuery,
		runtimeContractGapQuery,
	]) {
		assert.deepEqual(
			await request(query, "absent-fixture-service"),
			[],
			"Missing log evidence must not become a synthetic zero",
		);
	}
	assert.deepEqual(
		await request(tracedRuntimeErrorsQuery, "absent-fixture-service", true),
		[],
	);
	const browser = async (environment: string): Promise<Vector[]> =>
		request(
			browserByTypeQuery.replaceAll("${browser_environment:raw}", environment),
		);
	assert.equal(total(await browser("prod-gcp")), 2);
	assert.equal(total(await browser("dev-gcp")), 1);
	assert.equal(total(await browser("ukjent")), 4);
	const browserRows = await browser("prod-gcp|dev-gcp|ukjent");
	assert.equal(total(browserRows), 7);
	assert.deepEqual(
		[
			...new Set(
				browserRows.map(({ metric }) => metric.browser_environment_display),
			),
		].sort(),
		["Produksjon", "Test", "Ukjent"],
	);
	await checkRowLinks(browserRows, browserErrorGroupDataLink());
	assert.ok(
		(await browser("prod-gcp")).some(
			({ metric }) => metric.browser_type_display === "Annen / ikke oppgitt",
		),
	);
	assert.deepEqual(await browser("absent-environment"), []);
	console.log(
		"Loki: levels, signatures, exclusions, rejections, traces, browser environments, row-to-log parity and empty results passed",
	);
}

type Sample = { labels: string; value: number };
type InputSeries = { series: string; values: string };
const kubeLabels = `namespace="team-esyfo",k8s_cluster_name="prod",deployment="${service}"`;
const series = (name: string, labels: string, value: number): InputSeries => ({
	series: `${name}{${labels}}`,
	values: `${value}+0x10`,
});
const expressionTest = (expr: string, samples: Sample[]) => ({
	expr: renderQuery(expr),
	eval_time: "10m",
	exp_samples: samples,
});

async function checkMetricQueries(directory: string) {
	const readyCases = [
		{
			name: "Half the desired pods are ready",
			ready: 1,
			desired: 2,
			ratio: 50,
		},
		{ name: "Observed zero ready pods", ready: 0, desired: 2, ratio: 0 },
		{ name: "Missing ready is unknown", desired: 2 },
		{ name: "Scaled to zero is not an outage", ready: 0, desired: 0 },
		{ name: "Missing desired is unknown", ready: 1 },
		{ name: "Missing all deployment data is unknown" },
	];
	const readiness = readyCases.map(({ name, ready, desired, ratio }) => ({
		name,
		interval: "1m",
		input_series: [
			...(ready === undefined
				? []
				: [series("kube_deployment_status_replicas_ready", kubeLabels, ready)]),
			...(desired === undefined
				? []
				: [series("kube_deployment_spec_replicas", kubeLabels, desired)]),
		],
		promql_expr_test: [
			expressionTest(
				selectedReadyRatioQuery,
				ratio === undefined
					? []
					: [{ labels: `{deployment="${service}"}`, value: ratio }],
			),
			expressionTest(
				readyRatioByServiceQuery,
				ratio === undefined
					? []
					: [{ labels: `{service_name="${service}"}`, value: ratio }],
			),
			expressionTest(
				lowestReadyRatioQuery,
				ratio === undefined ? [] : [{ labels: "{}", value: ratio }],
			),
		],
	}));
	const jobLabels =
		'namespace="team-esyfo",k8s_cluster_name="prod",job_name="esyfovarsel-job-fixture"';
	const jobCases = [
		{ name: "Observed failed job", failed: 1, notFailed: 0, expected: 1 },
		{
			name: "False condition is not failure",
			failed: 0,
			notFailed: 1,
			expected: 0,
		},
		{
			name: "Unknown condition is not a failure",
			failed: 0,
			unknown: 1,
			expected: 0,
		},
		{ name: "Missing true condition is unknown", notFailed: 1 },
		{ name: "Missing job series is unknown" },
	].map(({ name, failed, notFailed, unknown, expected }) => ({
		name,
		interval: "1m",
		input_series: [
			...(failed === undefined
				? []
				: [series("kube_job_failed", `${jobLabels},condition="true"`, failed)]),
			...(notFailed === undefined
				? []
				: [
						series(
							"kube_job_failed",
							`${jobLabels},condition="false"`,
							notFailed,
						),
					]),
			...(unknown === undefined
				? []
				: [
						series(
							"kube_job_failed",
							`${jobLabels},condition="unknown"`,
							unknown,
						),
					]),
		],
		promql_expr_test: [
			expressionTest(
				jobFailureQuery,
				expected === undefined ? [] : [{ labels: "{}", value: expected }],
			),
		],
	}));
	const fleetCases = [
		{ name: "Missing counters stay unknown" },
		{
			name: "No traffic stays unknown; observed restart counter stays zero",
			values: "0+0x10",
			expected: 0,
		},
		{
			name: "Multiple events on one service are counted as events",
			values: "0+1x10",
			expected: 10,
		},
	].map(({ name, values, expected }) => ({
		name,
		interval: "1m",
		input_series:
			values === undefined
				? []
				: [
						{
							series: `traces_spanmetrics_calls_total{service_namespace="team-esyfo",k8s_cluster_name="prod",service_name="${service}",span_kind="SPAN_KIND_SERVER",status_code="STATUS_CODE_ERROR"}`,
							values,
						},
						{
							series: `kube_pod_container_status_restarts_total{namespace="team-esyfo",k8s_cluster_name="prod",container="${service}",pod="${service}-fixture"}`,
							values,
						},
					],
		promql_expr_test: [fleetOtelErrorCountQuery, fleetRestartCountQuery].map(
			(query) =>
				expressionTest(
					query,
					expected === undefined ||
						(query === fleetOtelErrorCountQuery && expected === 0)
						? []
						: [{ labels: "{}", value: expected }],
				),
		),
	}));
	const successfulTraffic = {
		name: "Observed successful traffic without error series gives zero errors",
		interval: "1m",
		input_series: [
			{
				series: `traces_spanmetrics_calls_total{service_namespace="team-esyfo",k8s_cluster_name="prod",service_name="${service}",span_kind="SPAN_KIND_SERVER",status_code="STATUS_CODE_UNSET"}`,
				values: "0+1x10",
			},
		],
		promql_expr_test: [
			expressionTest(fleetOtelErrorCountQuery, [{ labels: "{}", value: 0 }]),
		],
	};
	const historicalRestarts = {
		name: "Selected hour includes older restarts; duplicates and replacement pods do not inflate totals",
		interval: "1m",
		input_series: [
			...["a", "b"].map((instance) => ({
				series: `kube_pod_container_status_restarts_total{namespace="team-esyfo",k8s_cluster_name="prod",container="${service}",pod="old",instance="${instance}"}`,
				values: "0+0x19 2+0x40",
			})),
			{
				series: `kube_pod_container_status_restarts_total{namespace="team-esyfo",k8s_cluster_name="prod",container="${service}",pod="replacement"}`,
				values: "_x30 0+0x29",
			},
		],
		promql_expr_test: ["5m", "15m", "1h"].map((window) => ({
			expr: fleetRestartCountQuery.replaceAll("$__range", window),
			eval_time: "60m",
			exp_samples: [{ labels: "{}", value: window === "1h" ? 2 : 0 }],
		})),
	};
	const reasonLabels = `namespace="team-esyfo",k8s_cluster_name="prod",container="${service}"`;
	const reasonCases = [
		{
			name: "An absent pod retains all historically observed reasons without duplicate exporters",
			input_series: [
				{
					series: `kube_pod_container_status_restarts_total{${reasonLabels},pod="old"}`,
					values: "0+0x19 5+0x10 stale _x29",
				},
				...["a", "b"].flatMap((instance) =>
					["Error", "OOMKilled"].map((reason) => ({
						series: `kube_pod_container_status_last_terminated_reason{${reasonLabels},pod="old",instance="${instance}",reason="${reason}"}`,
						values: "_x20 1+0x10 stale _x28",
					})),
				),
			],
			expected: ["Error", "OOMKilled"].map((reason) => ({
				labels: `{container="${service}",pod="old",reason="${reason}"}`,
				value: 1,
			})),
		},
		{
			name: "A measured pod without a reason is explicitly unknown",
			input_series: [
				{
					series: `kube_pod_container_status_restarts_total{${reasonLabels},pod="old"}`,
					values: "0+0x60",
				},
			],
			expected: [
				{
					labels: `{container="${service}",pod="old",reason="Ikke registrert"}`,
					value: 1,
				},
			],
		},
		{
			name: "Missing metrics do not invent pods or reasons",
			input_series: [],
			expected: [],
		},
	].map(({ name, input_series, expected }) => ({
		name,
		input_series,
		interval: "1m",
		promql_expr_test: [
			{
				expr: renderQuery(podTerminationReasonQuery),
				eval_time: "60m",
				exp_samples: expected,
			},
		],
	}));
	await writeFile(
		join(directory, "metrics.test.yml"),
		JSON.stringify({
			evaluation_interval: "1m",
			tests: [
				...readiness,
				...jobCases,
				...fleetCases,
				successfulTraffic,
				historicalRestarts,
				...reasonCases,
			],
		}),
	);
	const { stdout } = await exec("docker", [
		"run",
		"--rm",
		"--name",
		promtoolContainer,
		"--user",
		`${process.getuid?.() ?? 65534}:${process.getgid?.() ?? 65534}`,
		"--network",
		"none",
		"--read-only",
		"--tmpfs",
		"/tmp:rw,mode=1777",
		"--mount",
		`type=bind,source=${directory},target=/checks,readonly`,
		"--entrypoint",
		"/bin/promtool",
		"prom/prometheus:v3.13.1",
		"test",
		"rules",
		"/checks/metrics.test.yml",
	]);
	console.log(stdout.trim());
	console.log(
		"PromQL: readiness, job conditions and observed/absent fleet counters passed",
	);
}

const directory = await mkdtemp(join(tmpdir(), "observability-query-check-"));
let lokiStarted = false;
try {
	assert.match(
		process.env.DOCKER_HOST ?? "unix://",
		/^unix:\/\//,
		"Only a local Docker socket is allowed",
	);
	const { stdout: host } = await exec("docker", [
		"context",
		"inspect",
		"--format",
		"{{.Endpoints.docker.Host}}",
	]);
	assert.match(
		host.trim(),
		/^unix:\/\//,
		"Only a local Docker context is allowed",
	);
	await exec("docker", [
		"run",
		"--detach",
		"--name",
		lokiContainer,
		"--tmpfs",
		"/loki:rw,uid=10001,gid=10001",
		"--publish",
		"127.0.0.1::3100",
		"grafana/loki:3.6.0",
		"-config.file=/etc/loki/local-config.yaml",
	]);
	lokiStarted = true;
	const { stdout: binding } = await exec("docker", [
		"port",
		lokiContainer,
		"3100/tcp",
	]);
	assert.match(binding.trim(), /^127\.0\.0\.1:\d+$/);
	const url = `http://${binding.trim()}`;
	await waitForLoki(url);
	await checkLogQueries(url);
	await checkMetricQueries(directory);
	if (process.argv.includes("--preview")) {
		console.log(`LOKI_PREVIEW_URL=${url}`);
		console.log("Synthetic fixtures remain available until SIGINT or SIGTERM.");
		await new Promise<void>((resolve) => {
			const keepAlive = setInterval(() => undefined, 60000);
			const stop = () => {
				clearInterval(keepAlive);
				process.off("SIGINT", stop);
				process.off("SIGTERM", stop);
				resolve();
			};
			process.once("SIGINT", stop);
			process.once("SIGTERM", stop);
		});
	}
} finally {
	const cleanup = await Promise.allSettled([
		...(lokiStarted ? [exec("docker", ["rm", "--force", lokiContainer])] : []),
		exec("docker", ["rm", "--force", promtoolContainer]).catch(() => undefined),
	]);
	await rm(directory, { recursive: true, force: true });
	for (const result of cleanup) {
		if (result.status === "rejected") throw result.reason;
	}
}
