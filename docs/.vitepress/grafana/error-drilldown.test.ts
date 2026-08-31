import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	activeApplicationIds,
	runtimeInventory,
} from "../runtime/inventory.ts";
import {
	apmDataLink,
	browserByTypeQuery,
	browserLogsDataLink,
	browserTotalQuery,
	buildErrorDashboard,
	dashboardApplicationOptions,
	dashboardApplicationRegex,
	dashboardApplications,
	ERROR_DASHBOARD_FOLDER_UID,
	ERROR_DASHBOARD_UID,
	LOKI_DATASOURCE_UID,
	runtimeByServiceQuery,
	runtimeLogsDataLink,
	runtimeTotalQuery,
	serializeErrorDashboard,
	TEMPO_DATASOURCE_UID,
	traceDataLink,
	tracedRuntimeErrorsQuery,
	unverifiedApmServices,
} from "./error-drilldown.ts";

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

const currentApplications = runtimeInventory.applications.filter(({ id }) =>
	activeApplicationIds.has(id),
);

describe("feildrilldown-dashboard", () => {
	test("bruker stabil identitet, mappe og gjeldende datasources", () => {
		const dashboard = buildErrorDashboard();
		const serialized = serializeErrorDashboard();
		assert.equal(dashboard.metadata.name, ERROR_DASHBOARD_UID);
		assert.equal(
			dashboard.metadata.annotations["grafana.app/folder"],
			ERROR_DASHBOARD_FOLDER_UID,
		);
		assert.equal(ERROR_DASHBOARD_UID, "team-esyfo-error-drilldown");
		assert.equal(ERROR_DASHBOARD_FOLDER_UID, "K-1b-N_4k");
		assert.ok(serialized.includes(LOKI_DATASOURCE_UID));
		assert.ok(serialized.includes(TEMPO_DATASOURCE_UID));
		assert.ok(!serialized.includes("PD969E40991D5C4A8"));
	});

	test("genererer eksakt nåværende tjenestescope fra runtimeinventaret", () => {
		assert.equal(dashboardApplications.length, 26);
		assert.deepEqual(
			dashboardApplicationOptions.map(({ value }) => value),
			currentApplications.map(({ runtime }) => runtime.name),
		);
		assert.ok(
			dashboardApplicationOptions.some(
				({ text, value }) =>
					value === "esyfovarsel" && text.includes("[migrering]"),
			),
		);
		assert.ok(
			dashboardApplicationOptions.some(
				({ text, value }) =>
					value === "syfobrukertilgang" && text.includes("[utfasing]"),
			),
		);
		for (const excluded of [
			"dulting-studio",
			"syfooppfolgingsplanservice",
			"syfooppfolgingsplanservice-redis",
			"syfooppfolgingsplanservice-redisexporter",
			"syfojanitor-backend",
			"syfojanitor-frontend",
		]) {
			assert.ok(!dashboardApplicationRegex.includes(excluded));
		}
	});

	test("låser prod-lenkene til dagens prod-gcp-scope", () => {
		assert.deepEqual(
			[...new Set(dashboardApplications.map(({ runtime }) => runtime.cluster))],
			["prod-gcp"],
		);
		assert.ok(
			dashboardApplications.every(
				({ runtime }) => runtime.namespace === "team-esyfo",
			),
		);
		assert.match(apmDataLink(`\${__value.raw}`), /environment=prod/);
		assert.match(
			runtimeLogsDataLink(`\${__value.raw}`),
			/k8s_cluster_name%7C%3D%7Cprod/,
		);
	});

	test("bruker positivt nivåfelt for runtime og separat Faro-schema", () => {
		for (const query of [
			runtimeTotalQuery,
			runtimeByServiceQuery,
			tracedRuntimeErrorsQuery,
		]) {
			assert.match(query, /service_namespace="team-esyfo"/);
			assert.match(query, /k8s_cluster_name=~"prod\|prod-fss"/);
			assert.match(
				query,
				/detected_level=~`\(\?i\)\(error\|critical\|fatal\)`/,
			);
			assert.ok(query.includes('!= `"x_isFrontend":true`'));
			assert.ok(
				query.indexOf('!= `"x_isFrontend":true`') <
					query.indexOf("k8s_container_name"),
			);
			assert.ok(!query.includes('level="ERROR"'));
			assert.ok(!query.includes("level !~"));
		}
		for (const query of [browserTotalQuery, browserByTypeQuery]) {
			assert.match(query, /kind="exception"/);
			assert.ok(!query.includes("x_isFrontend"));
			assert.ok(!query.includes("service_namespace"));
			assert.ok(!query.includes("k8s_cluster_name"));
			assert.ok(!query.includes("value"));
		}
	});

	test("skiller vellykket null fra datakildefeil", () => {
		assert.match(runtimeTotalQuery, /or on\(\) vector\(0\)$/);
		assert.match(browserTotalQuery, /or on\(\) vector\(0\)$/);
		const dashboard = buildErrorDashboard();
		assert.ok(serializeErrorDashboard().includes('"noValue": "Ukjent"'));
		assert.ok(
			JSON.stringify(dashboard.spec).includes(
				"Tom tabell betyr ingen kvalifiserende treff",
			),
		);
	});

	test("returnerer bare sanitiserte tracedata fra Loki", () => {
		assert.match(tracedRuntimeErrorsQuery, /\| json logger_name, trace_id/);
		assert.match(
			tracedRuntimeErrorsQuery,
			/\| line_format `\{\{ \.error_group \}\}`/,
		);
		assert.match(
			tracedRuntimeErrorsQuery,
			/\| keep service_name, error_group, trace_id/,
		);
		assert.match(
			tracedRuntimeErrorsQuery,
			/\| drop __error__, __error_details__/,
		);
		for (const forbidden of [
			"message",
			"msg",
			"stack_trace",
			"request_body",
			"__line__",
			"value",
		]) {
			assert.ok(!tracedRuntimeErrorsQuery.includes(forbidden));
		}
	});

	test("bruker radens tjeneste, tidsrom og betinget trace i dyplenker", () => {
		const rowValue = `\${__value.raw}`;
		for (const link of [
			runtimeLogsDataLink(rowValue),
			browserLogsDataLink(rowValue),
		]) {
			assert.match(link, /\$\{__from\}/);
			assert.match(link, /\$\{__to\}/);
			assert.ok(!link.includes("$app"));
		}
		const apmLink = apmDataLink(rowValue);
		assert.match(apmLink, /\$\{__value\.raw\}/);
		assert.match(apmLink, /\$\{__from:date:iso\}/);
		assert.match(apmLink, /\$\{__to:date:iso\}/);
		assert.ok(!apmLink.includes("$app"));
		const traceLink = traceDataLink(rowValue);
		assert.match(traceLink, /from=\$\{__value\.time\}/);
		assert.match(traceLink, /to=\$\{__value\.time\}/);
		assert.match(traceLink, /traceId=\$\{__value\.raw\}/);
		assert.ok(!traceLink.includes("$app"));
		const urls = collectByKey(buildErrorDashboard(), "url").filter(
			(value): value is string => typeof value === "string",
		);
		assert.ok(urls.some((url) => url.includes(rowValue)));
		assert.ok(urls.every((url) => !url.includes("$app")));
	});

	test("gjør trace klikkbar uten å vise rå trace-ID eller logglinje", () => {
		const dashboard = buildErrorDashboard();
		const tracePanel = (
			dashboard.spec.elements as Record<string, Record<string, unknown>>
		)["panel-6"];
		const serializedPanel = JSON.stringify(tracePanel);
		assert.match(serializedPanel, /"group":"table"/);
		assert.match(serializedPanel, /"group":"extractFields"/);
		assert.match(serializedPanel, /"source":"labels"/);
		assert.match(serializedPanel, /"replace":true/);
		assert.match(serializedPanel, /"trace_id":"Trace"/);
		assert.match(serializedPanel, /"type":"data-links"/);
		assert.match(serializedPanel, /Åpne trace/);
		assert.ok(!serializedPanel.includes('"group":"logs"'));
	});

	test("holder personverncanaries ute av dashboarddefinisjonen", () => {
		const serialized = serializeErrorDashboard();
		for (const canary of [
			"12345678901",
			"alice@example.com",
			"550e8400-e29b-41d4-a716-446655440000",
			"https://example.test/person?fnr=12345678901",
			'{"requestBody":{"aktorId":"1000000000000"}}',
			"Validation failed for schema PersonRequest",
		]) {
			assert.ok(!serialized.includes(canary));
		}
	});

	test("viser bare live-verifisert APM-status som linked", () => {
		const linked = currentApplications.filter(
			({ runtimeApm }) => runtimeApm.status === "linked",
		);
		assert.equal(linked.length, 23);
		assert.deepEqual(unverifiedApmServices, [
			"aktivitetskrav-frontend",
			"dialogmote-microfrontend",
			"lumi-dashboard",
		]);
		for (const application of linked) {
			assert.equal(application.runtimeApm.status, "linked");
			if (application.runtimeApm.status !== "linked") continue;
			assert.match(
				application.runtimeApm.href,
				new RegExp(
					`/team-esyfo/${application.runtime.name}\\?environment=prod$`,
				),
			);
			assert.equal(application.runtimeApm.verifiedAt, "2026-08-28T14:16:14Z");
		}
	});
});
