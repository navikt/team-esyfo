import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, test } from "node:test";
import { runtimeInventory } from "../runtime/inventory.ts";
import { isCurrentLifecycle } from "../runtime/lifecycle.ts";
import {
	apmDataLink,
	BUDSTIKKA_LAG_METRIC,
	browserExceptionsByServiceQuery,
	budstikkaLagQuery,
	buildControlRoomDashboard,
	CONTROL_ROOM_FOLDER_UID,
	CONTROL_ROOM_UID,
	DESERIALIZATION_ERROR_METRIC,
	DESIRED_REPLICAS_METRIC,
	deploymentCoverageQuery,
	deserializationRateQuery,
	errorDashboardDataLink,
	errorRatioByServiceQuery,
	expectedScopeVectorQuery,
	expectedServerScopeVectorQuery,
	fleetServicesWithOtelErrorsQuery,
	fleetServicesWithRestartsQuery,
	httpErrorCountQuery,
	httpErrorRatioQuery,
	JOB_FAILED_METRIC,
	jobFailureQuery,
	lowestReadyRatioQuery,
	missingTelemetryQuery,
	motebehovReadyRatioQuery,
	otelErrorsByServiceQuery,
	p95ByServiceQuery,
	p95LatencyQuery,
	READY_REPLICAS_METRIC,
	RESTARTS_METRIC,
	readyRatioByServiceQuery,
	requestCountQuery,
	requestRateByServiceQuery,
	requestsByServiceQuery,
	restartCountQuery,
	restartsByServiceQuery,
	runtimeErrorCountQuery,
	runtimeErrorsByServiceQuery,
	runtimeLogsDataLink,
	SPAN_CALLS_METRIC,
	SPAN_LATENCY_METRIC,
	selectedReadyRatioQuery,
	serializeControlRoomDashboard,
	telemetryAgeByServiceQuery,
	telemetryCoverageQuery,
	telemetryStateByServiceQuery,
} from "./control-room.ts";
import {
	BROWSER_RUNBOOK_URL,
	CONTROL_ROOM_BASELINE_AS_OF,
	controlRoomApplicationOptions,
	controlRoomApplications,
	controlRoomScopeOptions,
	controlRoomServerApplications,
	controlRoomSunsetApplications,
	DESERIALIZATION_RUNBOOK_URL,
	MOTEBEHOV_RUNBOOK_URL,
	PIPELINE_RUNBOOK_URL,
	RUNTIME_RUNBOOK_URL,
} from "./control-room-scope.ts";
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

const parseCustomVariableQuery = (query: string) =>
	query.split(",").map((entry) => {
		const parts = entry.split(" : ");
		assert.equal(parts.length, 2, `Ugyldig custom-variable-option: ${entry}`);
		return { text: parts[0], value: parts[1] };
	});

const selectedQueries = [
	requestCountQuery,
	httpErrorCountQuery,
	httpErrorRatioQuery,
	p95LatencyQuery,
	requestRateByServiceQuery,
	errorRatioByServiceQuery,
	p95ByServiceQuery,
	telemetryAgeByServiceQuery,
	runtimeErrorCountQuery,
	restartCountQuery,
	selectedReadyRatioQuery,
];

const fleetQueries = [
	fleetServicesWithOtelErrorsQuery,
	fleetServicesWithRestartsQuery,
	requestsByServiceQuery,
	otelErrorsByServiceQuery,
	runtimeErrorsByServiceQuery,
	restartsByServiceQuery,
	readyRatioByServiceQuery,
	telemetryStateByServiceQuery,
	telemetryCoverageQuery,
	deploymentCoverageQuery,
	missingTelemetryQuery,
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

	test("genererer GCP-flåten og holder FSS-sunset som separat guardrail", () => {
		assert.equal(CONTROL_ROOM_BASELINE_AS_OF, "2026-08-28");
		const expected = runtimeInventory.applications.filter(
			({ lifecycle, runtime }) =>
				isCurrentLifecycle(lifecycle) && runtime.cluster === "prod-gcp",
		);
		assert.deepEqual(controlRoomApplications, expected);
		assert.equal(controlRoomApplications.length, 26);
		assert.equal(controlRoomServerApplications.length, 24);
		assert.equal(controlRoomApplicationOptions.length, 26);
		assert.equal(controlRoomSunsetApplications.length, 3);
		for (const sunset of [
			"syfooppfolgingsplanservice",
			"syfooppfolgingsplanservice-redis",
			"syfooppfolgingsplanservice-redisexporter",
		]) {
			assert.ok(!expectedScopeVectorQuery.includes(sunset));
			assert.ok(
				controlRoomSunsetApplications.some(
					({ runtime }) => runtime.name === sunset,
				),
			);
		}
		for (const excluded of [
			"dulting-studio",
			"syfojanitor-backend",
			"syfojanitor-frontend",
			"teamsykefravr",
		]) {
			assert.ok(!expectedScopeVectorQuery.includes(excluded));
		}
	});

	test("tilbyr inventardrevne scope for flåte, reiser, pipelines og livssyklus", () => {
		const labels = controlRoomScopeOptions.map(({ text }) => text);
		assert.ok(
			labels.some((label) => label.startsWith("Hele operative GCP-flåten")),
		);
		assert.ok(labels.includes("Reise · Sen oppfølging"));
		assert.ok(labels.includes("Reise · Dialogmøte"));
		assert.ok(labels.includes("Pipeline · Varsling"));
		assert.ok(labels.includes("Pipeline · Sykepengedager"));
		assert.ok(labels.includes("Migrering (1)"));
		assert.ok(labels.includes("Utfasing (1)"));
		assert.ok(!labels.some((label) => label.startsWith("Sunset-guardrail")));
		assert.equal(
			new Set(controlRoomScopeOptions.map(({ text }) => text)).size,
			controlRoomScopeOptions.length,
		);
	});

	test("skiller flåtescope fra single-select detaljtjeneste", () => {
		const serviceVariable = `$${"{service:raw}"}`;
		const scopeVariable = `$${"{scope:raw}"}`;
		for (const query of selectedQueries) {
			assert.ok(query.includes(serviceVariable));
			assert.ok(!query.includes(scopeVariable));
		}
		for (const query of fleetQueries) {
			assert.ok(query.includes(scopeVariable));
		}
		const variables = buildControlRoomDashboard().spec.variables as Array<{
			spec: { name: string; multi: boolean; includeAll: boolean };
		}>;
		assert.deepEqual(
			variables.map(({ spec }) => spec.name),
			["scope", "service"],
		);
		assert.ok(variables.every(({ spec }) => !spec.multi && !spec.includeAll));
	});

	test("roundtripper custom-variablene til inventarkilden uten tvetydige verdier", () => {
		const variables = buildControlRoomDashboard().spec.variables as Array<{
			spec: {
				current: { text: string; value: string };
				name: string;
				query: string;
			};
		}>;
		const byName = new Map(variables.map(({ spec }) => [spec.name, spec]));
		const scope = byName.get("scope");
		const service = byName.get("service");
		assert.ok(scope);
		assert.ok(service);
		assert.deepEqual(
			parseCustomVariableQuery(scope.query),
			controlRoomScopeOptions,
		);
		assert.deepEqual(
			parseCustomVariableQuery(service.query),
			controlRoomApplicationOptions,
		);
		assert.deepEqual(scope.current, controlRoomScopeOptions[0]);
		assert.ok(
			controlRoomApplicationOptions.some(
				(option) =>
					option.text === service.current.text &&
					option.value === service.current.value,
			),
		);

		for (const options of [
			controlRoomScopeOptions,
			controlRoomApplicationOptions,
		]) {
			assert.equal(
				new Set(options.map(({ text }) => text)).size,
				options.length,
			);
			assert.equal(
				new Set(options.map(({ value }) => value)).size,
				options.length,
			);
			for (const option of options) {
				assert.ok(!option.text.includes(","));
				assert.ok(!option.text.includes(" : "));
				assert.ok(!option.value.includes(","));
				assert.ok(!option.value.includes(" : "));
			}
		}

		const applicationNames = controlRoomApplications.map(
			({ runtime }) => runtime.name,
		);
		for (const { value } of controlRoomScopeOptions) {
			assert.match(value, /^\^\(.+\)\$$/);
			const matcher = new RegExp(value);
			assert.ok(applicationNames.some((name) => matcher.test(name)));
			assert.ok(!matcher.test("ikke-en-team-esyfo-app"));
		}
	});

	test("bruker SERVER-span-kontrakten og omtaler OTel-status presist", () => {
		for (const query of [
			requestCountQuery,
			httpErrorCountQuery,
			httpErrorRatioQuery,
			p95LatencyQuery,
			requestRateByServiceQuery,
			errorRatioByServiceQuery,
			p95ByServiceQuery,
			requestsByServiceQuery,
			otelErrorsByServiceQuery,
		]) {
			assert.match(query, /service_namespace="team-esyfo"/);
			assert.match(query, /k8s_cluster_name="prod"/);
			assert.match(query, /span_kind="SPAN_KIND_SERVER"/);
		}
		assert.ok(requestCountQuery.includes(SPAN_CALLS_METRIC));
		assert.ok(p95LatencyQuery.includes(SPAN_LATENCY_METRIC));
		assert.match(httpErrorCountQuery, /status_code="STATUS_CODE_ERROR"/);
		const serialized = serializeControlRoomDashboard();
		assert.ok(serialized.includes("OTel-feilstatus"));
		assert.ok(serialized.includes("ikke automatisk HTTP 5xx"));
		assert.ok(!serialized.includes('"title": "HTTP-feil"'));
	});

	test("forankrer HTTP-null i observasjon og lar logg-no-data være ukjent", () => {
		assert.match(httpErrorCountQuery, /or on\(\)/);
		assert.match(httpErrorCountQuery, /and on\(\)/);
		assert.match(httpErrorCountQuery, /> 0\)$/);
		assert.match(httpErrorRatioQuery, /and on\(\).* > 0/);
		assert.match(errorRatioByServiceQuery, /and on\(service_name\).* > 0/);
		assert.match(p95LatencyQuery, /and on\(\).* > 0/);
		assert.match(p95ByServiceQuery, /and on\(service_name\).* > 0/);
		assert.ok(!httpErrorRatioQuery.includes("vector(0)"));
		assert.ok(!errorRatioByServiceQuery.includes("vector(0)"));
		assert.match(runtimeErrorCountQuery, /sum\(count_over_time/);
		assert.ok(!runtimeErrorCountQuery.includes("* 0"));
		assert.ok(!runtimeErrorCountQuery.includes("vector(0)"));
		assert.ok(serializeControlRoomDashboard().includes('"noValue": "Ukjent"'));
	});

	test("forankrer telemetrymatrisen i riktig signalprofil", () => {
		for (const application of controlRoomApplications) {
			assert.ok(expectedScopeVectorQuery.includes(application.runtime.name));
		}
		for (const application of controlRoomServerApplications) {
			assert.ok(
				expectedServerScopeVectorQuery.includes(application.runtime.name),
			);
		}
		for (const worker of ["esyfovarsel", "syfo-budstikka"]) {
			assert.ok(expectedScopeVectorQuery.includes(worker));
			assert.ok(!expectedServerScopeVectorQuery.includes(worker));
		}
		assert.match(expectedScopeVectorQuery, /__control_room_scope/);
		assert.match(expectedScopeVectorQuery, /service_name/);
		assert.match(telemetryStateByServiceQuery, /0 \*/);
		assert.match(telemetryStateByServiceQuery, /1 \*/);
		assert.match(telemetryStateByServiceQuery, /2 \*/);
		assert.match(telemetryStateByServiceQuery, /3 \*/);
		assert.match(telemetryStateByServiceQuery, /unless on\(service_name\)/);
		assert.ok(!telemetryStateByServiceQuery.includes("or on() vector(0)"));
		const serialized = serializeControlRoomDashboard();
		for (const state of ["FERSK", "STALE", "MANGLER", "ANNEN KONTRAKT"]) {
			assert.ok(serialized.includes(state));
		}
		assert.ok(serialized.includes("Datasourcefeil feiler hele queryen"));
	});

	test("dedupliserer kube-scrapes, mapper runtimeidentitet og beskytter desired=0", () => {
		for (const query of [restartCountQuery, restartsByServiceQuery]) {
			assert.ok(query.includes(RESTARTS_METRIC));
			assert.match(query, /max by \(pod, container\)/);
			assert.match(query, /namespace="team-esyfo"/);
			assert.match(query, /k8s_cluster_name="prod"/);
		}
		assert.match(restartsByServiceQuery, /label_replace/);
		assert.match(readyRatioByServiceQuery, /label_replace/);
		for (const query of [
			lowestReadyRatioQuery,
			readyRatioByServiceQuery,
			selectedReadyRatioQuery,
			motebehovReadyRatioQuery,
		]) {
			assert.ok(query.includes(READY_REPLICAS_METRIC));
			assert.ok(query.includes(DESIRED_REPLICAS_METRIC));
			assert.match(query, /> 0\)/);
		}
	});

	test("holder browserhendelser separat fra sessions, brukere og prodstatus", () => {
		assert.match(browserExceptionsByServiceQuery, /kind="exception"/);
		assert.ok(!browserExceptionsByServiceQuery.includes("service_namespace"));
		assert.ok(!browserExceptionsByServiceQuery.includes("k8s_cluster_name"));
		assert.ok(!browserExceptionsByServiceQuery.includes("session"));
		const serialized = serializeControlRoomDashboard();
		assert.ok(
			serialized.includes("Samplede page loads, sessions og CWV p75 er også"),
		);
		assert.ok(serialized.includes("sessions eller unike brukere"));
		assert.ok(serialized.includes("Browsermiljø · UKJENT"));
		assert.ok(serialized.includes("ikke les dette som prod-status"));
		assert.ok(serialized.includes("issues/206"));
		assert.ok(serialized.includes(BROWSER_RUNBOOK_URL));
	});

	test("viser pipelines og jobb typekorrekt uten å late som podhelse er expected run", () => {
		assert.ok(jobFailureQuery.includes(JOB_FAILED_METRIC));
		assert.match(jobFailureQuery, /job_name=~"esyfovarsel-job\.\*"/);
		assert.match(jobFailureQuery, /k8s_cluster_name="prod"/);
		assert.ok(!jobFailureQuery.includes("vector(0)"));
		const serialized = serializeControlRoomDashboard();
		for (const text of [
			"Pipelines · prosessnøytral status",
			"syfo-budstikka er målprosessor",
			"esyfovarsel er migrerende legacy-prosessor",
			"expected run",
			"eldste ventende",
			"terminalt utfall",
			"IKKE EVALUERT",
		]) {
			assert.ok(serialized.includes(text));
		}
		assert.ok(serialized.includes("Airflow er en ekstern sekundærkonsument"));
		assert.ok(!jobFailureQuery.includes("airflow"));
	});

	test("gir alle tre pagerkandidater relevant panel, runbook og blocker", () => {
		assert.ok(budstikkaLagQuery.includes(BUDSTIKKA_LAG_METRIC));
		assert.ok(deserializationRateQuery.includes(DESERIALIZATION_ERROR_METRIC));
		assert.ok(motebehovReadyRatioQuery.includes("syfomotebehov"));
		for (const query of [
			budstikkaLagQuery,
			deserializationRateQuery,
			motebehovReadyRatioQuery,
		]) {
			assert.match(query, /k8s_cluster_name="prod"/);
		}
		const serialized = serializeControlRoomDashboard();
		for (const expected of [
			"Budstikka · consumer-lag · diagnostikk",
			"Oppfølgingsplan · permanent deserialiseringsrate",
			"syfomotebehov · ready/desired",
			BUDSTIKKA_LAG_METRIC,
			DESERIALIZATION_ERROR_METRIC,
			DESERIALIZATION_RUNBOOK_URL,
			MOTEBEHOV_RUNBOOK_URL,
			"syfo-budstikka/issues/260",
			"syfo-oppfolgingsplan-backend/issues/449",
			"syfomotebehov/issues/753",
			"team-esyfo/issues/217",
			"BLOCKED",
		]) {
			assert.ok(serialized.includes(expected));
		}
	});

	test("viser SLO og deploy som eksplisitte gap uten proxy-metrikker", () => {
		const serialized = serializeControlRoomDashboard();
		assert.ok(serialized.includes("SLO-burn · IKKE DEFINERT"));
		assert.ok(serialized.includes("Siste deploy · UKJENT"));
		assert.ok(serialized.includes("Alert-policy er ikke en SLO-kontrakt"));
		assert.ok(
			serialized.includes("deployment-created er ikke deployidentitet"),
		);
		const expressions = collectByKey(
			buildControlRoomDashboard(),
			"expr",
		).filter((value): value is string => typeof value === "string");
		assert.ok(
			expressions.every((expr) => !expr.includes("kube_deployment_created")),
		);
		assert.ok(expressions.every((expr) => !expr.includes("slo_burn")));
	});

	test("dyplenker runtime og pagerpaneler til APM, logger, feil og runbook", () => {
		const rowValue = `$${"{__value.raw}"}`;
		for (const link of [
			apmDataLink(rowValue),
			runtimeLogsDataLink(rowValue),
			errorDashboardDataLink(rowValue),
		]) {
			assert.ok(link.includes(rowValue));
		}
		assert.match(apmDataLink(rowValue), /environment=prod/);
		assert.match(apmDataLink(rowValue), /\$\{__from:date:iso\}/);
		assert.match(runtimeLogsDataLink(rowValue), /\$\{__from\}/);
		assert.match(errorDashboardDataLink(rowValue), /var-app=/);
		const urls = collectByKey(buildControlRoomDashboard(), "url").filter(
			(value): value is string => typeof value === "string",
		);
		assert.ok(urls.some((url) => url.includes("nais-apm-app")));
		assert.ok(urls.some((url) => url.includes("lokiexplore-app")));
		assert.ok(urls.some((url) => url.includes("team-esyfo-error-drilldown")));
		assert.ok(urls.includes(RUNTIME_RUNBOOK_URL));
	});

	test("holder flåtetabellens dataframe-kontrakt konsistent", () => {
		const elements = buildControlRoomDashboard().spec.elements as Record<
			string,
			Record<string, unknown>
		>;
		const fleetPanel = elements["panel-10"];
		assert.ok(fleetPanel);
		const panelSpec = fleetPanel.spec as Record<string, unknown>;
		const queryGroup = panelSpec.data as {
			spec: {
				queries: Array<{ spec: { refId: string } }>;
				transformations: Array<{
					group: string;
					spec: { options: Record<string, unknown> };
				}>;
			};
		};
		const refIds = queryGroup.spec.queries.map(({ spec }) => spec.refId);
		assert.deepEqual(refIds, [
			"Telemetry",
			"Requests",
			"OTel-feil",
			"Runtimefeil",
			"Restarts",
			"Klare replikaer",
		]);
		assert.equal(new Set(refIds).size, refIds.length);
		assert.deepEqual(
			queryGroup.spec.transformations.map(({ group }) => group),
			["merge", "organize"],
		);

		const organize = queryGroup.spec.transformations[1].spec.options as {
			indexByName: Record<string, number>;
			renameByName: Record<string, string>;
		};
		const expectedSourceFields = [
			"service_name",
			"criticality",
			"lifecycle",
			"role",
			...refIds.map((refId) => `Value #${refId}`),
		];
		assert.deepEqual(Object.keys(organize.indexByName), expectedSourceFields);
		assert.deepEqual(Object.keys(organize.renameByName), expectedSourceFields);
		assert.deepEqual(
			Object.values(organize.indexByName),
			expectedSourceFields.map((_, index) => index),
		);
		assert.equal(
			new Set(Object.values(organize.renameByName)).size,
			expectedSourceFields.length,
		);

		const vizConfig = panelSpec.vizConfig as {
			spec: {
				fieldConfig: {
					overrides: Array<{ matcher: { id: string; options: string } }>;
				};
				options: { sortBy: Array<{ displayName: string }> };
			};
		};
		for (const { matcher } of vizConfig.spec.fieldConfig.overrides) {
			assert.equal(matcher.id, "byName");
			assert.ok(expectedSourceFields.includes(matcher.options));
		}
		for (const { displayName } of vizConfig.spec.options.sortBy) {
			assert.ok(Object.values(organize.renameByName).includes(displayName));
		}
	});

	test("binder alle queries eksplisitt til riktig datasource og produksjonsscope", () => {
		const queries = collectObjects(buildControlRoomDashboard()).filter(
			(query) => query.kind === "DataQuery",
		);
		assert.equal(queries.length, 24);
		let browserQueries = 0;
		let builtInQueries = 0;
		for (const query of queries) {
			const group = query.group;
			const datasource = query.datasource as { name?: string };
			const spec = query.spec as { expr?: string };
			if (group === "grafana") {
				builtInQueries += 1;
				assert.equal(datasource.name, "-- Grafana --");
				assert.deepEqual(spec, {});
				continue;
			}
			assert.equal(typeof spec.expr, "string");
			if (group === "prometheus") {
				assert.equal(datasource.name, MIMIR_DATASOURCE_UID);
				assert.match(spec.expr ?? "", /k8s_cluster_name="prod"/);
				continue;
			}
			assert.equal(group, "loki");
			assert.equal(datasource.name, LOKI_DATASOURCE_UID);
			if ((spec.expr ?? "").includes('kind="exception"')) {
				browserQueries += 1;
				assert.ok(!(spec.expr ?? "").includes("k8s_cluster_name"));
				assert.ok(!(spec.expr ?? "").includes("service_namespace"));
			} else {
				assert.match(spec.expr ?? "", /service_namespace="team-esyfo"/);
				assert.match(spec.expr ?? "", /k8s_cluster_name="prod"/);
			}
		}
		assert.equal(browserQueries, 1);
		assert.equal(builtInQueries, 1);
	});

	test("holder dyplenker parsebare, avgrensede og koblet til eksisterende runbooks", () => {
		const urls = collectByKey(buildControlRoomDashboard(), "url").filter(
			(value): value is string => typeof value === "string",
		);
		const allowedHosts = new Set([
			"grafana.nav.cloud.nais.io",
			"github.com",
			"navikt.github.io",
		]);
		for (const template of urls) {
			const substituted = template.replace(/\$\{[^}]+\}/g, "test-service");
			const parsed = new URL(substituted, "https://grafana.nav.cloud.nais.io");
			assert.equal(parsed.protocol, "https:");
			assert.ok(allowedHosts.has(parsed.hostname), template);
			if (template.startsWith("/")) {
				assert.match(
					parsed.pathname,
					/^\/(a\/(nais-apm-app|grafana-lokiexplore-app)|d\/team-esyfo-error-drilldown)\//,
				);
			}
		}

		assert.match(
			runtimeLogsDataLink("test-service"),
			/var-ds=PEA2100DC89AE9FE2/,
		);
		for (const filter of [
			"service_name%7C%3D%7Ctest-service",
			"service_namespace%7C%3D%7Cteam-esyfo",
			"k8s_cluster_name%7C%3D%7Cprod",
		]) {
			assert.ok(runtimeLogsDataLink("test-service").includes(filter));
		}

		const localRunbooks = new Map([
			[RUNTIME_RUNBOOK_URL, "http-runtime.md"],
			[BROWSER_RUNBOOK_URL, "browser.md"],
			[PIPELINE_RUNBOOK_URL, "pipelines-og-jobber.md"],
			[MOTEBEHOV_RUNBOOK_URL, "syfomotebehov-tilgjengelighet.md"],
			[DESERIALIZATION_RUNBOOK_URL, "oppfolgingsplan-deserialisering.md"],
		]);
		for (const [url, fileName] of localRunbooks) {
			assert.ok(urls.includes(url));
			assert.ok(
				existsSync(
					new URL(
						`../../utvikling/observability/runbooks/${fileName}`,
						import.meta.url,
					),
				),
			);
		}
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

	test("deler ingen rå logger, request bodies eller persondata", () => {
		for (const query of [runtimeErrorCountQuery, runtimeErrorsByServiceQuery]) {
			assert.match(
				query,
				/detected_level=~`\(\?i\)\(error\|critical\|fatal\)`/,
			);
			assert.ok(!query.includes("message"));
			assert.ok(!query.includes("stack_trace"));
		}
		const serialized = serializeControlRoomDashboard();
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

	test("holder Loki-kost nede i standardvisningen", () => {
		assert.match(runtimeErrorsByServiceQuery, /\[5m\]/);
		assert.ok(!runtimeErrorsByServiceQuery.includes("$__range"));
		assert.ok(!runtimeErrorsByServiceQuery.includes("runtimeActivity"));
		const serialized = serializeControlRoomDashboard();
		assert.ok(serialized.includes('"autoRefresh": "2m"'));
		assert.ok(serialized.includes('"from": "now-1h"'));
		assert.equal(
			collectByKey(buildControlRoomDashboard(), "group").filter(
				(value) => value === "loki",
			).length,
			3,
		);
	});

	test("har deterministisk, unik layout uten panel-ID-overlapp", () => {
		const dashboard = buildControlRoomDashboard();
		const elements = dashboard.spec.elements as Record<
			string,
			{ spec: { id: number } }
		>;
		const ids = Object.values(elements).map(({ spec }) => spec.id);
		assert.equal(ids.length, 29);
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
