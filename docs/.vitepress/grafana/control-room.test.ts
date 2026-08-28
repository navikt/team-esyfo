import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	activeApplicationIds,
	runtimeInventory,
} from "../runtime/inventory.ts";
import {
	apmDataLink,
	buildControlRoomDashboard,
	CONTROL_ROOM_FOLDER_UID,
	CONTROL_ROOM_JOURNEY_ID,
	CONTROL_ROOM_UID,
	controlRoomApplicationOptions,
	controlRoomApplicationRegex,
	controlRoomApplications,
	DESIRED_REPLICAS_METRIC,
	deploymentCoverageQuery,
	errorDashboardDataLink,
	errorRatioByServiceQuery,
	httpErrorCountQuery,
	httpErrorRatioQuery,
	lowestReadyRatioQuery,
	p95ByServiceQuery,
	p95LatencyQuery,
	READY_REPLICAS_METRIC,
	RESTARTS_METRIC,
	requestCountQuery,
	requestRateByServiceQuery,
	restartCountQuery,
	restartsByServiceQuery,
	runtimeErrorCountQuery,
	runtimeErrorsByServiceQuery,
	runtimeLogsDataLink,
	SPAN_CALLS_METRIC,
	SPAN_LATENCY_METRIC,
	serializeControlRoomDashboard,
	telemetryAgeByServiceQuery,
	telemetryCoverageQuery,
} from "./control-room.ts";
import { LOKI_DATASOURCE_UID, MIMIR_DATASOURCE_UID } from "./dashboard-kit.ts";

const collectByKey = (value: unknown, key: string, found: unknown[] = []) => {
	if (!value || typeof value !== "object") return found;
	if (Array.isArray(value)) {
		for (const item of value) collectByKey(item, key, found);
		return found;
	}
	for (const [itemKey, itemValue] of Object.entries(value)) {
		if (itemKey === key) found.push(itemValue);
		collectByKey(itemValue, key, found);
	}
	return found;
};

const collectObjects = (
	value: unknown,
	found: Array<Record<string, unknown>> = [],
) => {
	if (!value || typeof value !== "object") return found;
	if (Array.isArray(value)) {
		for (const item of value) collectObjects(item, found);
		return found;
	}
	const record = value as Record<string, unknown>;
	found.push(record);
	for (const child of Object.values(record)) collectObjects(child, found);
	return found;
};

const allQueries = [
	requestCountQuery,
	httpErrorCountQuery,
	httpErrorRatioQuery,
	p95LatencyQuery,
	telemetryCoverageQuery,
	deploymentCoverageQuery,
	requestRateByServiceQuery,
	errorRatioByServiceQuery,
	p95ByServiceQuery,
	telemetryAgeByServiceQuery,
	runtimeErrorCountQuery,
	runtimeErrorsByServiceQuery,
	restartCountQuery,
	restartsByServiceQuery,
	lowestReadyRatioQuery,
];

describe("kontrollrom-dashboard", () => {
	test("bruker stabil identitet, Team eSyfo-mappen og live-verifiserte datasources", () => {
		const dashboard = buildControlRoomDashboard();
		const serialized = serializeControlRoomDashboard();
		assert.equal(CONTROL_ROOM_UID, "team-esyfo-control-room-v1");
		assert.equal(CONTROL_ROOM_FOLDER_UID, "K-1b-N_4k");
		assert.equal(MIMIR_DATASOURCE_UID, "PA58DA793C7250F1B");
		assert.equal(LOKI_DATASOURCE_UID, "PEA2100DC89AE9FE2");
		assert.equal(dashboard.metadata.name, CONTROL_ROOM_UID);
		assert.equal(
			dashboard.metadata.annotations["grafana.app/folder"],
			CONTROL_ROOM_FOLDER_UID,
		);
		assert.ok(serialized.includes(MIMIR_DATASOURCE_UID));
		assert.ok(serialized.includes(LOKI_DATASOURCE_UID));
		assert.ok(!serialized.includes("PD969E40991D5C4A8"));
	});

	test("genererer Sen oppfølging-scope fra det godkjente runtimeinventaret", () => {
		const expected = runtimeInventory.applications.filter(
			(application) =>
				activeApplicationIds.has(application.id) &&
				application.context.journeyRefs.includes(CONTROL_ROOM_JOURNEY_ID),
		);
		assert.deepEqual(controlRoomApplications, expected);
		assert.deepEqual(
			controlRoomApplicationOptions.map(({ value }) => value),
			[
				"meroppfolging-backend",
				"meroppfolging-frontend",
				"meroppfolging-microfrontend",
				"sykepengedager-informasjon",
			],
		);
		for (const excluded of [
			"dulting-studio",
			"esyfovarsel",
			"syfobrukertilgang",
			"syfooppfolgingsplanservice",
			"syfojanitor-backend",
			"teamsykefravr",
		]) {
			assert.ok(!controlRoomApplicationRegex.includes(excluded));
		}
	});

	test("bruker NAIS APMs verifiserte SERVER-span-kontrakt for HTTP-signaler", () => {
		for (const query of [
			requestCountQuery,
			httpErrorCountQuery,
			httpErrorRatioQuery,
			p95LatencyQuery,
			requestRateByServiceQuery,
			errorRatioByServiceQuery,
			p95ByServiceQuery,
			telemetryAgeByServiceQuery,
		]) {
			assert.match(query, /service_namespace="team-esyfo"/);
			assert.match(query, /k8s_cluster_name="prod"/);
			assert.match(query, /service_name=~"\$\{app:regex\}"/);
			assert.match(query, /span_kind="SPAN_KIND_SERVER"/);
		}
		for (const query of [telemetryCoverageQuery]) {
			assert.match(query, /service_namespace="team-esyfo"/);
			assert.match(query, /k8s_cluster_name="prod"/);
			assert.ok(
				query.includes(`service_name=~"${controlRoomApplicationRegex}"`),
			);
			assert.match(query, /span_kind="SPAN_KIND_SERVER"/);
			assert.match(query, /\/ 4\)$/);
			assert.ok(!query.includes(`\${app:regex}`));
		}
		assert.ok(requestCountQuery.includes(SPAN_CALLS_METRIC));
		assert.ok(p95LatencyQuery.includes(SPAN_LATENCY_METRIC));
		assert.match(httpErrorCountQuery, /status_code="STATUS_CODE_ERROR"/);
		assert.match(httpErrorRatioQuery, /status_code="STATUS_CODE_ERROR"/);
		assert.match(errorRatioByServiceQuery, /status_code="STATUS_CODE_ERROR"/);
		for (const query of allQueries) {
			assert.ok(!query.includes("apm:service:span_"));
		}
	});

	test("forankrer HTTP-null i faktisk request-telemetry og holder nulltrafikk ukjent", () => {
		assert.match(httpErrorCountQuery, /or on\(\)/);
		assert.match(httpErrorCountQuery, /and on\(\)/);
		assert.match(httpErrorCountQuery, /> 0\)$/);
		assert.match(httpErrorRatioQuery, /or on\(\)/);
		assert.match(errorRatioByServiceQuery, /or on\(service_name\)/);
		assert.match(httpErrorRatioQuery, /and on\(\).* > 0/);
		assert.match(errorRatioByServiceQuery, /and on\(service_name\).* > 0/);
		assert.match(p95LatencyQuery, /and on\(\).* > 0/);
		assert.match(p95ByServiceQuery, /and on\(service_name\).* > 0/);
		assert.ok(!httpErrorRatioQuery.includes("vector(0)"));
		assert.ok(!errorRatioByServiceQuery.includes("vector(0)"));
		assert.ok(serializeControlRoomDashboard().includes('"noValue": "Ukjent"'));
	});

	test("låser Grafanas Prometheus-spørringer til enten instant eller range", () => {
		const queries = collectObjects(buildControlRoomDashboard()).filter(
			(query) => query.kind === "DataQuery" && query.group === "prometheus",
		);
		assert.ok(queries.length > 0);
		for (const query of queries) {
			const spec = query.spec as Record<string, unknown>;
			assert.equal(typeof spec.instant, "boolean");
			assert.equal(typeof spec.range, "boolean");
			assert.notEqual(spec.instant, spec.range);
		}
	});

	test("dedupliserer kube-scrapes og avgrenser all runtimehelse til prod", () => {
		for (const query of [restartCountQuery, restartsByServiceQuery]) {
			assert.ok(query.includes(RESTARTS_METRIC));
			assert.match(query, /max by \(pod, container\)/);
			assert.match(query, /namespace="team-esyfo"/);
			assert.match(query, /k8s_cluster_name="prod"/);
			assert.match(query, /container=~"\$\{app:regex\}"/);
		}
		for (const query of [lowestReadyRatioQuery]) {
			assert.ok(query.includes(READY_REPLICAS_METRIC));
			assert.ok(query.includes(DESIRED_REPLICAS_METRIC));
			assert.match(query, /max by \(deployment\)/);
			assert.match(query, /k8s_cluster_name="prod"/);
		}
		assert.ok(deploymentCoverageQuery.includes(DESIRED_REPLICAS_METRIC));
		assert.match(deploymentCoverageQuery, /max by \(deployment\)/);
		assert.match(deploymentCoverageQuery, /k8s_cluster_name="prod"/);
		assert.match(lowestReadyRatioQuery, /or on\(deployment\)/);
		assert.ok(
			deploymentCoverageQuery.includes(
				`deployment=~"${controlRoomApplicationRegex}"`,
			),
		);
		assert.match(deploymentCoverageQuery, /\/ 4\)$/);
		assert.ok(!deploymentCoverageQuery.includes(`\${app:regex}`));
		assert.equal(
			collectByKey(buildControlRoomDashboard(), "format").filter(
				(format) => format === "table",
			).length,
			3,
		);
		assert.equal(
			collectByKey(buildControlRoomDashboard(), "group").filter(
				(group) => group === "merge",
			).length,
			4,
		);
	});

	test("viser brukerinnvirkning og teknisk helse som uavhengige sannheter", () => {
		const serialized = serializeControlRoomDashboard();
		for (const title of [
			"HTTP-feil",
			"HTTP-feilrate",
			"P95 latency",
			"Runtimefeil",
			"Restarts · 24t",
			"Laveste replika-dekning",
			"Span-dekning · tracer",
			"Kube-dekning · tracer",
		]) {
			assert.ok(serialized.includes(`"title": "${title}"`));
		}
		assert.ok(serialized.includes("Ingen samlet grønn status skjuler"));
		assert.ok(serialized.includes("ikke evaluert"));
		assert.ok(serialized.includes("ikke som grønn"));
		assert.ok(serialized.includes("issues/212"));
		assert.ok(serialized.includes("issues/206"));
		assert.ok(serialized.includes("issues/203"));
	});

	test("bruker positivt feillognivå og deler ingen rå logger eller persondata", () => {
		for (const query of [runtimeErrorCountQuery, runtimeErrorsByServiceQuery]) {
			assert.match(query, /service_namespace="team-esyfo"/);
			assert.match(
				query,
				/detected_level=~`\(\?i\)\(error\|critical\|fatal\)`/,
			);
			assert.ok(!query.includes("message"));
			assert.ok(!query.includes("stack_trace"));
			assert.ok(!query.includes("vector(0)"));
			assert.match(query, /\* 0\).* > 0/);
		}
		const serialized = serializeControlRoomDashboard();
		assert.ok(serialized.includes('"color": "gray"'));
		for (const canary of [
			"12345678901",
			"alice@example.com",
			"550e8400-e29b-41d4-a716-446655440000",
			"request_body",
			"session_id",
		]) {
			assert.ok(!serialized.includes(canary));
		}
	});

	test("dyplenker hver tjeneste til APM, logger og Feildrilldown med valgt tidsrom", () => {
		assert.deepEqual(buildControlRoomDashboard().spec.links, []);
		const rowValue = `\${__value.raw}`;
		for (const link of [
			apmDataLink(rowValue),
			runtimeLogsDataLink(rowValue),
			errorDashboardDataLink(rowValue),
		]) {
			assert.ok(link.includes(rowValue));
		}
		assert.match(apmDataLink(rowValue), /environment=prod/);
		assert.match(apmDataLink(rowValue), /\$\{__from:date:iso\}/);
		assert.match(apmDataLink(rowValue), /\$\{__to:date:iso\}/);
		assert.match(runtimeLogsDataLink(rowValue), /\$\{__from\}/);
		assert.match(runtimeLogsDataLink(rowValue), /\$\{__to\}/);
		assert.match(
			errorDashboardDataLink(rowValue),
			/var-app=\$\{__value\.raw\}/,
		);

		const urls = collectByKey(buildControlRoomDashboard(), "url").filter(
			(value): value is string => typeof value === "string",
		);
		assert.ok(urls.some((url) => url.includes("nais-apm-app")));
		assert.ok(urls.some((url) => url.includes("lokiexplore-app")));
		assert.ok(urls.some((url) => url.includes("team-esyfo-error-drilldown")));
	});

	test("har deterministisk, unik layout uten overlappende panel-ID-er", () => {
		const dashboard = buildControlRoomDashboard();
		const elements = dashboard.spec.elements as Record<
			string,
			{ spec: { id: number } }
		>;
		const ids = Object.values(elements).map(({ spec }) => spec.id);
		assert.equal(ids.length, 18);
		assert.equal(new Set(ids).size, ids.length);
		const layout = dashboard.spec.layout as {
			spec: { items: Array<{ spec: { element: { name: string } } }> };
		};
		const layoutNames = layout.spec.items.map(({ spec }) => spec.element.name);
		assert.deepEqual(layoutNames.sort(), Object.keys(elements).sort());
		assert.equal(
			serializeControlRoomDashboard(),
			serializeControlRoomDashboard(),
		);
	});
});
