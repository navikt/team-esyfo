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
	RECENT_RUNTIME_EVENT_LIMIT,
	runtimeByClassificationQuery,
	runtimeByServiceQuery,
	runtimeClassificationCoverageQuery,
	runtimeEnvironmentOptions,
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

	test("bruker ett eksplisitt runtime-miljø i queryer og lenker", () => {
		assert.deepEqual(
			[...new Set(dashboardApplications.map(({ runtime }) => runtime.cluster))],
			["prod-gcp"],
		);
		assert.ok(
			dashboardApplications.every(
				({ runtime }) => runtime.namespace === "team-esyfo",
			),
		);
		assert.match(
			apmDataLink(`\${__value.raw}`),
			/environment=\$\{runtime_environment:raw\}/,
		);
		assert.match(
			runtimeLogsDataLink(`\${__value.raw}`),
			/k8s_cluster_name%7C%3D%7C\$\{runtime_environment:raw\}/,
		);
		assert.ok(!apmDataLink(`\${__value.raw}`).includes("prod-gcp"));
		assert.ok(!runtimeLogsDataLink(`\${__value.raw}`).includes("prod-fss"));
	});

	test("har single-select runtime-miljø med prod-default og uten All", () => {
		assert.deepEqual(runtimeEnvironmentOptions, [
			{ text: "prod-gcp", value: "prod" },
			{ text: "dev-gcp", value: "dev" },
		]);
		const variables = buildErrorDashboard().spec.variables as Array<{
			spec: Record<string, unknown> & {
				current: unknown;
				name: string;
				query: string;
			};
		}>;
		const environment = variables.find(
			({ spec }) => spec.name === "runtime_environment",
		)?.spec;
		assert.ok(environment);
		assert.equal(environment.label, "Runtime-miljø");
		assert.deepEqual(environment.current, {
			text: "prod-gcp",
			value: "prod",
		});
		assert.equal(environment.query, "prod-gcp : prod,dev-gcp : dev");
		assert.equal(environment.includeAll, false);
		assert.equal(environment.allowCustomValue, false);
		assert.equal(environment.multi, false);
		assert.match(
			String(environment.description),
			/Browserpanelene.*påvirkes ikke/,
		);
	});

	test("bruker positivt nivåfelt for runtime og separat Faro-schema", () => {
		for (const query of [
			runtimeTotalQuery,
			runtimeByServiceQuery,
			runtimeByClassificationQuery,
			runtimeClassificationCoverageQuery,
			tracedRuntimeErrorsQuery,
		]) {
			assert.match(query, /service_namespace="team-esyfo"/);
			assert.match(query, /k8s_cluster_name="\$\{runtime_environment:raw\}"/);
			assert.ok(!query.includes("prod-fss"));
			assert.ok(!query.includes("prod-gcp"));
			assert.match(
				query,
				/detected_level=~`\(\?i\)\(error\|critical\|fatal\)`/,
			);
			assert.ok(query.includes('| x_isFrontend!="true"'));
			assert.ok(query.includes('| json forwarded_browser="x_isFrontend"'));
			assert.ok(query.includes('| forwarded_browser!="true"'));
			assert.ok(
				query.indexOf("k8s_container_name") <
					query.indexOf('| x_isFrontend!="true"'),
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
		assert.equal(
			browserTotalQuery,
			`sum(count_over_time({kind="exception", service_name=~"\${app:regex}"} [$__range])) or on() vector(0)`,
		);
		assert.equal(
			browserByTypeQuery,
			`topk(50, sum by(service_name, type) (count_over_time({kind="exception", service_name=~"\${app:regex}"} | logfmt | __error__="" | type!="" [$__range])))`,
		);
		const elements = buildErrorDashboard().spec.elements as Record<
			string,
			unknown
		>;
		for (const panel of [elements["panel-2"], elements["panel-5"]]) {
			assert.match(JSON.stringify(panel), /miljøscope UKJENT/);
			assert.match(JSON.stringify(panel), /Runtime-miljø filtrerer ikke/);
		}
	});

	test("prioriterer runtimefeil etter tjeneste og type før traced eksempler", () => {
		const dashboard = buildErrorDashboard();
		const elements = dashboard.spec.elements as Record<
			string,
			Record<string, unknown>
		>;
		const summaryPanel = JSON.stringify(elements["panel-4"]);
		assert.match(summaryPanel, /Runtimefeil etter tjeneste og type/);
		assert.match(summaryPanel, /"service_name":"Tjeneste"/);
		assert.match(summaryPanel, /"error_type_display":"Feiltype"/);
		assert.match(summaryPanel, /"error_code_display":"Kode"/);
		assert.match(summaryPanel, /Logghendelser/);
		assert.match(summaryPanel, /Hendelser uten trace er med/);
		assert.ok(!summaryPanel.includes("Kilde (logger)"));
		assert.ok(!summaryPanel.includes("Grunnlag"));
		assert.ok(!summaryPanel.includes("Feilgruppe"));

		const layout = dashboard.spec.layout as {
			spec: {
				items: Array<{
					spec: { element: { name: string }; y: number };
				}>;
			};
		};
		const yByPanel = new Map(
			layout.spec.items.map(({ spec }) => [spec.element.name, spec.y]),
		);
		assert.ok(
			(yByPanel.get("panel-4") ?? Infinity) < (yByPanel.get("panel-6") ?? 0),
		);
	});

	test("grupperer alle runtimefeil med samme sanitiserte signaturkontrakt", () => {
		assert.match(runtimeByClassificationQuery, /^topk\(50,/);
		assert.match(
			runtimeByClassificationQuery,
			/sum by\(service_name, error_type_display, error_code_display\)/,
		);
		assert.match(
			runtimeByClassificationQuery,
			/\| keep service_name, error_type_display, error_code_display/,
		);
		assert.match(runtimeByClassificationQuery, /Ikke oppgitt av appen/);
		assert.match(runtimeByClassificationQuery, /else }}—\{\{ end/);
		assert.ok(!runtimeByClassificationQuery.includes('trace_id!=""'));
		assert.ok(!runtimeByClassificationQuery.includes("line_format"));
		for (const forbidden of [
			"message",
			"stack_trace",
			"request_body",
			"__line__",
		]) {
			assert.ok(!runtimeByClassificationQuery.includes(forbidden));
		}
	});

	test("viser full klassifiseringsdekning per tjeneste uten top-k", () => {
		assert.match(
			runtimeClassificationCoverageQuery,
			/^sum by\(service_name, type_state\)/,
		);
		assert.ok(!runtimeClassificationCoverageQuery.includes("topk("));
		for (const state of [
			"typed",
			"context_only",
			"code_only",
			"rejected",
			"missing",
		]) {
			assert.ok(runtimeClassificationCoverageQuery.includes(state));
		}
		assert.match(
			runtimeClassificationCoverageQuery,
			/\| keep service_name, type_state/,
		);

		const coveragePanel = JSON.stringify(
			(
				buildErrorDashboard().spec.elements as Record<
					string,
					Record<string, unknown>
				>
			)["panel-7"],
		);
		assert.match(coveragePanel, /Klassifiseringsdekning for runtimefeil/);
		assert.match(coveragePanel, /"type_state":"Klassifiseringsstatus"/);
		assert.match(coveragePanel, /uten top-k-begrensning/);
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
		assert.match(
			tracedRuntimeErrorsQuery,
			/\| json event_type, event, error_code, code, feilkode, runtime_type="type", status, logger_name, trace_id, category, operation/,
		);
		assert.match(
			tracedRuntimeErrorsQuery,
			/top_exception_type="exception_type"/,
		);
		assert.match(
			tracedRuntimeErrorsQuery,
			/nested_exception_type="exception\.type"/,
		);
		assert.match(tracedRuntimeErrorsQuery, /top_error_type="error_type"/);
		assert.match(tracedRuntimeErrorsQuery, /nested_error_type="error\.type"/);
		assert.match(tracedRuntimeErrorsQuery, /top_err_type="err_type"/);
		assert.match(tracedRuntimeErrorsQuery, /nested_err_type="err\.type"/);
		assert.match(
			tracedRuntimeErrorsQuery,
			/label_format error_type_display=.*\.safe_event_type.*\.safe_event.*\.safe_top_exception_type.*\.safe_nested_exception_type.*\.safe_top_error_type.*\.safe_nested_error_type.*\.safe_top_err_type.*\.safe_nested_err_type.*\.safe_runtime_error_type.*Ikke oppgitt av appen/,
		);
		assert.match(
			tracedRuntimeErrorsQuery,
			/label_format error_source=.*\.safe_logger.*else }}—/,
		);
		const typeClassification = tracedRuntimeErrorsQuery.match(
			/\| label_format error_type_display=.*$/m,
		)?.[0];
		assert.ok(typeClassification);
		assert.ok(!typeClassification.includes("safe_logger"));
		assert.match(tracedRuntimeErrorsQuery, /regexReplaceAll/);
		assert.match(
			tracedRuntimeErrorsQuery,
			/safe_event_type=.*\^\[a-z\]\[a-z0-9_\.-\]\{0,79\}\$/,
		);
		assert.match(tracedRuntimeErrorsQuery, /\^\[A-Za-z\]/);
		assert.match(
			tracedRuntimeErrorsQuery,
			/safe_error_code[\s\S]*safe_code[\s\S]*safe_feilkode[\s\S]*safe_runtime_type_code[\s\S]*safe_status[\s\S]*else }}—/,
		);
		assert.match(
			tracedRuntimeErrorsQuery,
			/safe_runtime_type_code=.*\^\[A-Z\]\[A-Z0-9_\]/,
		);
		assert.match(
			tracedRuntimeErrorsQuery,
			/safe_runtime_error_type=.*\(Error\|Exception\)\$/,
		);
		assert.match(
			tracedRuntimeErrorsQuery,
			/safe_status=.*\^\[45\]\[0-9\]\{2\}\$/,
		);
		assert.match(
			tracedRuntimeErrorsQuery,
			/\| line_format `\{\{ \.error_type_display \}\}`/,
		);
		assert.match(
			tracedRuntimeErrorsQuery,
			/\| keep service_name, error_type_display, error_code_display, error_context, error_source, type_state, safe_trace_id/,
		);
		assert.match(
			tracedRuntimeErrorsQuery,
			/safe_trace_id=.*\^\[A-Fa-f0-9\]\{32\}\$/,
		);
		assert.match(tracedRuntimeErrorsQuery, /\| safe_trace_id!=""/);
		assert.match(tracedRuntimeErrorsQuery, /typed/);
		assert.match(tracedRuntimeErrorsQuery, /code_only/);
		assert.match(tracedRuntimeErrorsQuery, /context_only/);
		assert.match(tracedRuntimeErrorsQuery, /rejected/);
		assert.match(tracedRuntimeErrorsQuery, /missing/);
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
		assert.ok(!tracedRuntimeErrorsQuery.includes("uklassifisert"));
		assert.ok(!tracedRuntimeErrorsQuery.includes("error_group"));
		assert.ok(!tracedRuntimeErrorsQuery.includes(", type,"));
		assert.ok(!typeClassification.includes(".runtime_type"));
		const codeClassification = tracedRuntimeErrorsQuery.match(
			/\| label_format error_code_display=.*$/m,
		)?.[0];
		assert.ok(codeClassification);
		assert.ok(!codeClassification.includes(".runtime_type"));
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
		assert.match(
			serializedPanel,
			/Nyeste traced runtimehendelser \(maks 100\)/,
		);
		assert.equal(RECENT_RUNTIME_EVENT_LIMIT, 100);
		assert.match(serializedPanel, /"error_type_display":"Feiltype"/);
		assert.match(serializedPanel, /"error_code_display":"Kode"/);
		assert.match(serializedPanel, /"error_context":"Trygg kontekst"/);
		assert.match(serializedPanel, /"error_source":"Kilde \(logger\)"/);
		assert.match(serializedPanel, /"type_state":"Klassifiseringsstatus"/);
		assert.match(serializedPanel, /"safe_trace_id":"Trace"/);
		assert.match(serializedPanel, /"type":"data-links"/);
		assert.match(serializedPanel, /Åpne trace/);
		assert.match(serializedPanel, /ikke unike feil eller incidents/);
		assert.ok(!serializedPanel.includes('"group":"logs"'));
		assert.ok(!serializedPanel.includes("Feilgruppe"));
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
