import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	activeApplicationIds,
	runtimeInventory,
} from "../runtime/inventory.ts";
import {
	browserByTypeQuery,
	browserErrorGroupDataLink,
	buildErrorDashboard,
	configuredBrowserServices,
	DEV_TEMPO_DATASOURCE_UID,
	dashboardApplicationOptions,
	dashboardApplicationRegex,
	dashboardApplications,
	dashboardBrowserOptions,
	dashboardBrowserRegex,
	ERROR_DASHBOARD_FOLDER_UID,
	ERROR_DASHBOARD_UID,
	LOKI_DATASOURCE_UID,
	PROD_TEMPO_DATASOURCE_UID,
	RECENT_RUNTIME_EVENT_LIMIT,
	runtimeByClassificationQuery,
	runtimeByServiceQuery,
	runtimeContractGapDataLink,
	runtimeContractGapQuery,
	runtimeEnvironmentOptions,
	runtimeErrorGroupDataLink,
	runtimeTrendQuery,
	safeBrowserTypePattern,
	safeCodePattern,
	safeEventTypePattern,
	safeGenericErrorTypePattern,
	safeUpstreamStatusPattern,
	serializeErrorDashboard,
	TEMPO_DATASOURCE_UID,
	traceDataLink,
	tracedRuntimeErrorsQuery,
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

const panels = () =>
	buildErrorDashboard().spec.elements as Record<
		string,
		Record<string, unknown>
	>;

const variableSpecs = () =>
	(
		buildErrorDashboard().spec.variables as Array<{
			spec: Record<string, unknown>;
		}>
	).map(({ spec }) => spec);

const scopedVariableSpecs = () => {
	const layout = buildErrorDashboard().spec.layout as {
		spec: {
			rows: Array<{
				spec: { variables?: Array<{ spec: Record<string, unknown> }> };
			}>;
		};
	};
	return layout.spec.rows.flatMap(({ spec }) =>
		(spec.variables ?? []).map(({ spec: variable }) => variable),
	);
};

type Layout = {
	kind: string;
	spec: {
		rows?: Array<{
			spec: {
				title: string;
				collapse: boolean;
				hideHeader: boolean;
				layout: Layout;
				variables?: Array<{ spec: Record<string, unknown> }>;
			};
		}>;
		items?: Array<{
			spec: { element: { name: string }; x: number; y: number; width: number };
		}>;
	};
};

const dashboardRows = () =>
	(buildErrorDashboard().spec.layout as Layout).spec.rows ?? [];

const fullMatch = (pattern: string, value?: string) =>
	value !== undefined && new RegExp(pattern).test(value);

type RuntimeFixture = {
	event_type?: string;
	event?: string;
	exception_type?: string;
	error_type?: string;
	err_type?: string;
};

const runtimeContractState = (fixture: RuntimeFixture) => {
	if (fullMatch(safeEventTypePattern, fixture.event_type)) return "canonical";
	if (fixture.event_type) return "rejected";
	if (
		fullMatch(safeEventTypePattern, fixture.event) ||
		fullMatch(safeGenericErrorTypePattern, fixture.exception_type) ||
		fullMatch(safeGenericErrorTypePattern, fixture.error_type) ||
		fullMatch(safeGenericErrorTypePattern, fixture.err_type)
	)
		return "legacy_type";
	if (
		fixture.event ||
		fixture.exception_type ||
		fixture.error_type ||
		fixture.err_type
	)
		return "rejected";
	return "missing";
};

const decodedExplorePane = (url: string) => {
	const materialized = url
		.replaceAll('${__data.fields["service_name"]}', "sample-service")
		.replaceAll('${__data.fields["error_type_display"]}', "sample_error")
		.replaceAll('${__data.fields["error_code_display"]}', "SAMPLE_CODE")
		.replaceAll('${__data.fields["operation_display"]}', "sample.operation")
		.replaceAll('${__data.fields["error_level"]}', "error")
		.replaceAll(
			'${__data.fields["rejection_reason_display"]}',
			"TOO_MANY_ORGNUMRE",
		)
		.replaceAll('${__data.fields["contract_state_display"]}', "Eldre typefelt")
		.replaceAll('${__data.fields["browser_type_display"]}', "TypeError")
		.replaceAll(`\${__data.fields["browser_environment_display"]}`, "prod-gcp");
	const encoded = new URL(
		materialized,
		"https://grafana.test",
	).searchParams.get("panes");
	assert.ok(encoded);
	return JSON.parse(encoded) as {
		A: {
			datasource: string;
			queries: Array<{ expr: string }>;
			range: { from: string; to: string };
		};
	};
};

describe("feiloversikt-dashboard", () => {
	test("viser WARN-avvisninger separat og åpent med årsak og logglenke", () => {
		const panel = panels()["panel-6"];
		assert.ok(panel, "Avvisningspanelet mangler");
		const query = collectByKey(panel, "expr")[0] as string;
		assert.match(query, /detected_level=~`\(\?i\)\(warn\|warning\)`/);
		assert.match(query, /event_type="api_request_rejected"/);
		assert.match(
			query,
			/sum by\(service_name, operation_display, error_code_display, rejection_reason_display, action\)/,
		);
		assert.match(
			query,
			/\| keep service_name, operation_display, error_code_display, rejection_reason_display, action/,
		);
		assert.match(
			query,
			/k8s_cluster_name=~"\^\$\{runtime_environment:regex\}\$"/,
		);
		assert.match(query, /service_name=~"\$\{app:regex\}"/);
		assert.ok(!query.includes("error|critical|fatal"));
		assert.ok(!query.includes("[$__range]"));
		const rows = (
			buildErrorDashboard().spec.layout as {
				spec: { rows: Array<{ spec: { collapse: boolean; layout: unknown } }> };
			}
		).spec.rows;
		assert.ok(
			rows.some(
				({ spec }) =>
					!spec.collapse &&
					collectByKey(spec.layout, "name").includes("panel-6"),
			),
		);
		const link = (collectByKey(panel, "url") as string[]).find((url) =>
			url.startsWith("/explore?"),
		);
		assert.ok(link);
		const pane = decodedExplorePane(link).A;
		assert.match(pane.queries[0].expr, /event_type="api_request_rejected"/);
		assert.match(pane.queries[0].expr, /service_name="sample-service"/);
		assert.match(pane.queries[0].expr, /operation_display=`sample.operation`/);
		assert.match(
			pane.queries[0].expr,
			/rejection_reason_display=`TOO_MANY_ORGNUMRE`/,
		);
		assert.equal(pane.range.from, "${__from}");
		assert.equal(pane.range.to, "${__to}");
	});

	test("bruker stabil identitet, autoritativ kode og gjeldende datasources", () => {
		const dashboard = buildErrorDashboard();
		const serialized = serializeErrorDashboard();
		assert.equal(dashboard.metadata.name, ERROR_DASHBOARD_UID);
		assert.equal(
			dashboard.metadata.annotations["grafana.app/folder"],
			ERROR_DASHBOARD_FOLDER_UID,
		);
		assert.equal(ERROR_DASHBOARD_UID, "team-esyfo-feiloversikt");
		assert.equal(ERROR_DASHBOARD_FOLDER_UID, "K-1b-N_4k");
		assert.equal(dashboard.spec.title, "Team eSyfo – Feiloversikt");
		assert.equal(dashboard.spec.editable, false);
		assert.equal(dashboard.spec.preload, false);
		assert.equal(dashboard.spec.liveNow, false);
		assert.ok(serialized.includes(LOKI_DATASOURCE_UID));
		assert.equal(TEMPO_DATASOURCE_UID, PROD_TEMPO_DATASOURCE_UID);
		assert.ok(serialized.includes(PROD_TEMPO_DATASOURCE_UID));
		assert.equal(DEV_TEMPO_DATASOURCE_UID, "P95CC91DC09CABFC8");
		assert.ok(!serialized.includes("PD969E40991D5C4A8"));
	});

	test("genererer runtime- og browserscope separat fra inventaret", () => {
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
		assert.equal(configuredBrowserServices.length, 5);
		assert.deepEqual(
			dashboardBrowserOptions.map(({ value }) => value),
			configuredBrowserServices,
		);
		for (const service of configuredBrowserServices) {
			assert.ok(dashboardBrowserRegex.includes(service));
		}
		assert.notEqual(dashboardApplicationRegex, dashboardBrowserRegex);
	});

	test("har prod/dev single-select og to tjenestevelgere med ærlig scope", () => {
		assert.deepEqual(runtimeEnvironmentOptions, [
			{ text: "prod-gcp", value: "prod" },
			{ text: "dev-gcp", value: "dev" },
		]);
		const variables = variableSpecs();
		const scopedVariables = scopedVariableSpecs();
		assert.equal(
			variables.length,
			0,
			"Ingen lokale utvalg skal fremstå som globale",
		);
		assert.equal(scopedVariables.length, 5);
		const environment = scopedVariables.find(
			({ name }) => name === "runtime_environment",
		);
		const runtime = scopedVariables.find(({ name }) => name === "app");
		const tempo = scopedVariables.find(
			({ name }) => name === "tempo_datasource",
		);
		const browser = scopedVariables.find(({ name }) => name === "browser_app");
		assert.deepEqual(environment?.current, {
			text: "prod-gcp",
			value: "prod",
		});
		assert.equal(environment?.includeAll, false);
		assert.equal(environment?.multi, false);
		assert.equal(environment?.label, "Miljø");
		assert.equal(runtime?.label, "Tjeneste");
		assert.deepEqual(tempo?.current, {
			text: "prod-gcp-tempo",
			value: PROD_TEMPO_DATASOURCE_UID,
		});
		assert.equal(tempo?.hide, "hideVariable");
		assert.equal(tempo?.pluginId, "tempo");
		assert.equal(tempo?.refresh, "onDashboardLoad");
		assert.equal(tempo?.regex, "/^${runtime_environment:raw}-gcp-tempo$/");
		assert.equal(tempo?.skipUrlSync, true);
		assert.equal(browser?.label, "Nettleserflate");
		assert.equal(browser?.allValue, dashboardBrowserRegex);
		const browserEnvironment = scopedVariables.find(
			({ name }) => name === "browser_environment",
		);
		assert.equal(browserEnvironment?.includeAll, false);
		assert.deepEqual(browserEnvironment?.current, {
			text: "Alle (også ukjent)",
			value: "prod-gcp|dev-gcp|ukjent",
		});
	});

	test("samler runtime med lokale filtre og arvet scope, men skiller nettleserfeil", () => {
		const rows = dashboardRows();
		assert.equal(rows.length, 2);
		const runtime = rows[0].spec;
		const browser = rows[1].spec;
		assert.equal(runtime.title, "Feil i tjenestene");
		assert.equal(runtime.collapse, false);
		assert.equal(runtime.hideHeader, false);
		assert.deepEqual(
			runtime.variables?.map(({ spec }) => spec.name),
			["runtime_environment", "tempo_datasource", "app"],
		);
		const nested = runtime.layout.spec.rows ?? [];
		assert.equal(nested.length, 2);
		const main = nested[0].spec;
		const metadata = nested[1].spec;
		assert.equal(main.collapse, false);
		assert.equal(metadata.collapse, true);
		assert.equal(metadata.title, "Forbedre loggdata");
		assert.deepEqual(collectByKey(metadata.layout, "name"), ["panel-4"]);
		assert.deepEqual(
			main.layout.spec.items?.map(({ spec }) => spec.element.name),
			["panel-1", "panel-7", "panel-2", "panel-3", "panel-6"],
		);
		assert.deepEqual(
			main.layout.spec.items?.slice(0, 2).map(({ spec }) => spec.width),
			[14, 10],
		);
		assert.equal(browser.collapse, false);
		assert.deepEqual(collectByKey(browser.layout, "name"), ["panel-5"]);
		assert.deepEqual(
			browser.variables?.map(({ spec }) => spec.name),
			["browser_environment", "browser_app"],
		);
		assert.equal(Object.keys(panels()).length, 7);
		assert.ok(!serializeErrorDashboard().includes('"group": "stat"'));
		assert.ok(!serializeErrorDashboard().includes('"group": "text"'));
	});

	test("bruker sju avgrensede Loki-queryer med minst ett minutts refresh", () => {
		for (const query of [
			runtimeTrendQuery,
			runtimeByClassificationQuery,
			runtimeContractGapQuery,
			runtimeByServiceQuery,
		]) {
			assert.match(query, /service_namespace="team-esyfo"/);
			assert.match(
				query,
				/k8s_cluster_name=~"\^\$\{runtime_environment:regex\}\$"/,
			);
			assert.match(query, /\| keep /);
			assert.match(query, /\[\$__auto\]/);
			assert.ok(!query.includes("[$__range]"));
			assert.ok(!query.includes("prod-fss"));
		}
		for (const query of [
			runtimeByClassificationQuery,
			runtimeContractGapQuery,
		]) {
			assert.match(query, /\| drop __error__, __error_details__/);
		}
		assert.match(
			runtimeByClassificationQuery,
			/topk by\(error_level\) \(25, sum by\(error_level,/,
		);
		assert.match(runtimeByClassificationQuery, /detected_level \| lower/);
		for (const query of [browserByTypeQuery]) {
			assert.match(query, /kind="exception"/);
			assert.match(query, /service_name=~"\$\{browser_app:regex\}"/);
			assert.match(query, /\| keep /);
			assert.match(query, /\[\$__auto\]/);
			assert.ok(!query.includes("runtime_environment"));
			assert.ok(!query.includes("k8s_cluster_name"));
		}
		const serialized = serializeErrorDashboard();
		const timeSettings = buildErrorDashboard().spec.timeSettings as {
			autoRefresh: string;
		};
		assert.equal(timeSettings.autoRefresh, "1m");
		assert.ok(!serialized.includes('"5s"'));
		assert.ok(!serialized.includes('"10s"'));
		assert.match(serialized, /"maxDataPoints": 240/);
		assert.match(serialized, /"interval": "1m"/);
		assert.equal(collectByKey(buildErrorDashboard(), "expr").length, 7);
	});

	test("viser en operativ hovedtabell med eksplisitt handling", () => {
		const main = JSON.stringify(panels()["panel-2"]);
		assert.match(main, /Hva feiler\?/);
		assert.match(main, /"error_level":"Nivå"/);
		assert.match(main, /"service_name":"Tjeneste"/);
		assert.match(main, /"error_type_display":"Feiltype"/);
		assert.match(main, /"error_code_display":"Kode"/);
		assert.match(main, /"operation_display":"Operasjon"/);
		assert.match(main, /"action":"Handling"/);
		assert.match(main, /"Value #Runtimefeil etter type":"Hendelser"/);
		assert.match(main, /Logger for denne gruppen/);
		assert.ok(!main.includes("Feilgruppe"));
		assert.ok(!main.includes("Logghendelser"));
	});

	test("viser stabil rate per minutt og eksakte tjenestetall uten kunstige nuller", () => {
		assert.match(runtimeTrendQuery, /^sum\(rate\(/);
		assert.match(runtimeTrendQuery, /\[\$__auto\]\)\) \* 60$/);
		assert.ok(!runtimeTrendQuery.includes("vector(0)"));
		const trend = JSON.stringify(panels()["panel-1"]);
		assert.match(
			trend,
			/"showPoints":"always"/,
			"Isolerte feilhendelser må være synlige selv uten linje mellom datapunkter",
		);
		assert.match(trend, /"pointSize":4/);
		assert.match(trend, /"spanNulls":false/);
		assert.match(
			runtimeByServiceQuery,
			/^sort_desc\(sum by\(service_name\) \(count_over_time\(/,
		);
		assert.ok(
			!runtimeByServiceQuery.includes("topk"),
			"Alle tjenester med treff skal kunne undersøkes",
		);
		const chart = JSON.stringify(panels()["panel-7"]);
		assert.match(chart, /"group":"bargauge"/);
		assert.match(chart, /"group":"rowsToFields"/);
		assert.match(chart, /"fieldName":"service_name","handlerKey":"field.name"/);
		assert.match(
			chart,
			/"fieldName":"Value #Feil per tjeneste","handlerKey":"field.value"/,
		);
		assert.match(chart, /"fieldName":"Time","handlerKey":"__ignore"/);
		assert.match(chart, /"orientation":"horizontal"/);
		assert.match(chart, /"decimals":0/);
		assert.match(chart, /"fieldMinMax":false/);
		assert.match(chart, /services\/team-esyfo\/\$\{__field.name\}/);
		assert.match(chart, /tab=issues/);
	});

	test("gir tydelig vei tilbake til kontrollrommet og forklaringen av målingene", () => {
		const links = buildErrorDashboard().spec.links as Array<
			Record<string, unknown>
		>;
		assert.deepEqual(
			links.map(({ title }) => title),
			["Kontrollrom", "Om målingene"],
		);
		assert.equal(
			links[0].url,
			"https://grafana.nav.cloud.nais.io/d/team-esyfo-kontrollrom",
		);
		assert.equal(links[0].keepTime, true);
		assert.equal(
			links[0].includeVars,
			false,
			"Nettleser- og dev-utvalg skal ikke sendes til produksjonskontrollrommet",
		);
		assert.equal(
			links[1].url,
			"https://navikt.github.io/team-esyfo/utvikling/observability/feildrilldown",
		);
		assert.ok(
			links.every(
				({ type, asDropdown }) => type === "link" && asDropdown === false,
			),
		);
	});

	test("feilgruppe-handlingen bevarer miljø, tjeneste, type, kode og tid", () => {
		const url = runtimeErrorGroupDataLink();
		assert.ok(url.includes('${__data.fields["service_name"]}'));
		assert.ok(url.includes('${__data.fields["error_type_display"]}'));
		assert.ok(url.includes('${__data.fields["error_code_display"]}'));
		assert.ok(url.includes('${__data.fields["operation_display"]}'));
		assert.ok(url.includes('${__data.fields["error_level"]}'));
		assert.ok(!url.includes('\\"service_name\\"'));
		const pane = decodedExplorePane(url).A;
		assert.equal(pane.datasource, LOKI_DATASOURCE_UID);
		assert.equal(pane.range.from, `\${__from}`);
		assert.equal(pane.range.to, `\${__to}`);
		const expr = pane.queries[0]?.expr ?? "";
		assert.match(
			expr,
			/k8s_cluster_name=~"\^\$\{runtime_environment:regex\}\$"/,
		);
		assert.match(expr, /service_name="sample-service"/);
		assert.match(expr, /error_type_display=`sample_error`/);
		assert.match(expr, /error_code_display=`SAMPLE_CODE`/);
		assert.match(expr, /operation_display=`sample.operation`/);
		assert.match(expr, /error_level=`error`/);
		assert.ok(!url.includes("$app"));
	});

	test("skiller kanonisk kontrakt, legacy, avvist og manglende identitet", () => {
		assert.equal(
			runtimeContractState({ event_type: "oppfolgingsplan_fetch_failed" }),
			"canonical",
		);
		assert.equal(
			runtimeContractState({ exception_type: "ConnectTimeoutException" }),
			"legacy_type",
		);
		assert.equal(runtimeContractState({ err_type: "Object" }), "rejected");
		assert.ok(fullMatch(safeCodePattern, "FETCH_NETWORK_ERROR"));
		assert.ok(fullMatch(safeCodePattern, "500"));
		assert.ok(!fullMatch(safeCodePattern, "dynamicCode"));
		assert.equal(
			runtimeContractState({
				event_type: "alice@example.com",
				exception_type: "ConnectTimeoutException",
			}),
			"rejected",
		);
		assert.equal(runtimeContractState({}), "missing");
		assert.match(runtimeContractGapQuery, /contract_state!="canonical"/);
		for (const state of ["canonical", "legacy_type", "rejected", "missing"]) {
			assert.ok(runtimeContractGapQuery.includes(state));
		}
		assert.ok(!runtimeContractGapQuery.includes("code_only"));
		assert.ok(!runtimeContractGapQuery.includes("context_only"));
		const gapPanel = JSON.stringify(panels()["panel-4"]);
		assert.match(gapPanel, /Feil uten standardisert hendelsestype/);
		assert.match(gapPanel, /Kode og operasjon er valgfri metadata/);
		assert.match(gapPanel, /Logger for denne gruppen/);
		assert.match(
			decodedExplorePane(runtimeContractGapDataLink()).A.queries[0]?.expr ?? "",
			/contract_state_display=`Eldre typefelt`/,
		);
	});

	test("avviser person- og fritekstlignende identiteter i fixturekontrakten", () => {
		for (const value of [
			"alice@example.com",
			"12345678901",
			"550e8400-e29b-41d4-a716-446655440000",
			"https://example.test/person?fnr=12345678901",
			"Validation failed for schema PersonRequest",
			"x".repeat(200),
		]) {
			assert.equal(runtimeContractState({ event_type: value }), "rejected");
			assert.ok(!fullMatch(safeCodePattern, value));
		}
		assert.equal(
			runtimeContractState({ err_type: "TypeError" }),
			"legacy_type",
		);
		assert.equal(runtimeContractState({ err_type: "Object" }), "rejected");
		assert.match(
			runtimeByClassificationQuery,
			/safe_nested_err_type=.*\(Error\|Exception\)\$/,
		);
	});

	test("holder upstream-status som avgrenset detaljkontekst", () => {
		for (const valid of ["100", "204", "301", "429", "500", "599"]) {
			assert.ok(fullMatch(safeUpstreamStatusPattern, valid));
		}
		for (const invalid of ["99", "600", "-1", "429.0", "5xx", "unknown"]) {
			assert.ok(!fullMatch(safeUpstreamStatusPattern, invalid));
		}

		assert.ok(!runtimeByClassificationQuery.includes("upstream_status"));
		assert.match(tracedRuntimeErrorsQuery, /\| json .*upstream_status/);
		assert.match(
			tracedRuntimeErrorsQuery,
			/safe_upstream_status=.*\^\[1-5\]\[0-9\]\{2\}\$/,
		);
		assert.match(
			tracedRuntimeErrorsQuery,
			/label_format upstream_status_display=/,
		);
		assert.match(tracedRuntimeErrorsQuery, /\| keep .*upstream_status_display/);
		const displayLine = tracedRuntimeErrorsQuery
			.split("\n")
			.find((line) => line.includes("label_format upstream_status_display="));
		assert.ok(displayLine?.includes(".safe_upstream_status"));
		assert.ok(!displayLine?.includes(".safe_status"));
		assert.match(runtimeByClassificationQuery, /else if \.safe_status/);
	});

	test("browserfeltet har lukket typeallowlist og eget eksplisitt miljø", () => {
		for (const valid of [
			"Error",
			"TypeError",
			"AbortError",
			"DOMException",
			"UnhandledRejection",
		]) {
			assert.ok(fullMatch(safeBrowserTypePattern, valid));
		}
		for (const invalid of [
			"alice@example.com",
			"https://example.test/failure",
			"Validation failed for PersonRequest",
		]) {
			assert.ok(!fullMatch(safeBrowserTypePattern, invalid));
		}
		assert.match(browserByTypeQuery, /Annen \/ ikke oppgitt/);
		assert.match(browserByTypeQuery, /\| drop __error__, __error_details__/);
		assert.ok(!browserByTypeQuery.includes('| __error__=""'));
		const panel = JSON.stringify(panels()["panel-5"]);
		assert.match(panel, /Hva feiler i nettleseren\?/);
		assert.ok(!panel.includes("NAIS APM"));
		assert.ok(!panel.includes("runtime_environment"));
		const expr =
			decodedExplorePane(browserErrorGroupDataLink()).A.queries[0]?.expr ?? "";
		assert.match(expr, /kind="exception"/);
		assert.match(expr, /service_name="sample-service"/);
		assert.ok(!expr.includes("k8s_cluster_name"));
		assert.ok(!expr.includes("runtime_environment"));
		assert.match(expr, /browser_environment_display=`prod-gcp`/);
		assert.match(
			browserByTypeQuery,
			/\| logfmt type, app_namespace, app_environment/,
		);
		assert.match(
			browserByTypeQuery,
			/app_namespace="" or app_namespace="team-esyfo"/,
		);
		assert.match(browserByTypeQuery, /eq \.browser_parse_error ""/);
		assert.match(browserByTypeQuery, /eq \.app_namespace "team-esyfo"/);
		assert.match(browserByTypeQuery, /eq \.app_environment "prod-gcp"/);
		assert.match(browserByTypeQuery, /eq \.app_environment "dev-gcp"/);
		assert.match(browserByTypeQuery, /else }}ukjent/);
		assert.match(
			browserByTypeQuery,
			/browser_environment_display=~"\$\{browser_environment:raw\}"/,
		);
		assert.match(
			browserByTypeQuery,
			/sum by\(service_name, browser_environment_display, browser_type_display, action\)/,
		);
		assert.match(panel, /"browser_environment_display":"Miljø"/);
	});

	test("tracepanelet har sju arbeidskolonner og dedupliserer identiske feil", () => {
		const trace = JSON.stringify(panels()["panel-3"]);
		assert.match(trace, /Konkrete feilforløp · åpne trace/);
		assert.equal(RECENT_RUNTIME_EVENT_LIMIT, 100);
		assert.match(trace, /"group":"extractFields"/);
		assert.match(trace, /"group":"groupBy"/);
		assert.match(trace, /"operation":"groupby"/);
		for (const column of [
			'"Time (max)":"Tidspunkt"',
			'"service_name":"Tjeneste"',
			'"error_type_display":"Feiltype"',
			'"error_code_display":"Kode"',
			'"error_context":"Operasjon"',
			'"upstream_status_display":"HTTP-status fra kall"',
			'"safe_trace_id":"Trace"',
		]) {
			assert.ok(trace.includes(column));
		}
		for (const removed of [
			"Kilde (logger)",
			"Klassifiseringsstatus",
			"Trygg kontekst",
		]) {
			assert.ok(!trace.includes(removed));
		}
		assert.match(tracedRuntimeErrorsQuery, /safe_trace_id!=""/);
		assert.match(
			tracedRuntimeErrorsQuery,
			/safe_trace_id!="00000000000000000000000000000000"/,
		);
		assert.match(
			tracedRuntimeErrorsQuery,
			/\| keep service_name, error_type_display, error_code_display, error_context, upstream_status_display, safe_trace_id/,
		);
	});

	test("trace-ID og rå payload kan ikke lekke inn i tabellen", () => {
		assert.ok(
			fullMatch("^[A-Fa-f0-9]{32}$", "0123456789abcdef0123456789abcdef"),
		);
		for (const invalid of [
			"0123456789abcdef0123456789abcde",
			"0123456789abcdef0123456789abcdef0",
			"g123456789abcdef0123456789abcdef",
			"00000000000000000000000000000000",
		]) {
			assert.ok(
				!fullMatch("^[A-Fa-f0-9]{32}$", invalid) ||
					invalid === "00000000000000000000000000000000",
			);
		}
		for (const forbidden of [
			"message",
			"msg",
			"stack_trace",
			"request_body",
			"operationName",
			"category",
			"logger_name",
			"__line__",
		]) {
			assert.ok(!tracedRuntimeErrorsQuery.includes(forbidden));
		}
		assert.match(tracedRuntimeErrorsQuery, /\| line_format/);
		assert.match(
			tracedRuntimeErrorsQuery,
			/\| drop __error__, __error_details__/,
		);
	});

	test("trace-lenken bruker dashboardets tidsrom uten å eksponere ID som tekst", () => {
		const rowValue = `\${__value.raw}`;
		const link = traceDataLink(rowValue);
		assert.match(link, /from=\$\{__from\}/);
		assert.match(link, /to=\$\{__to\}/);
		assert.match(link, /traceId=\$\{__value\.raw\}/);
		assert.match(link, /var-ds=\$\{tempo_datasource:raw\}/);
		const tracePanel = JSON.stringify(panels()["panel-3"]);
		assert.match(tracePanel, /"type":"data-links"/);
		assert.match(tracePanel, /Åpne trace/);
	});

	test("holder wall-of-text og personverncanaries ute av definisjonen", () => {
		const serialized = serializeErrorDashboard();
		assert.ok(!serialized.includes("Slik leses dashboardet"));
		assert.ok(!serialized.includes("Dekning og tolkning"));
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
});
test("runtime-rader tilbyr både presist loggsøk, enkel loggvisning og APM", () => {
	const elements = buildErrorDashboard().spec.elements as Record<
		string,
		unknown
	>;
	for (const id of ["panel-2", "panel-4", "panel-6"]) {
		const serialized = JSON.stringify(elements[id]);
		assert.match(serialized, /Feil i APM/);
		assert.match(serialized, /Alle tjenestelogger/);
		assert.match(serialized, /environment=\$\{runtime_environment:raw\}/);
		assert.match(
			serialized,
			/k8s_cluster_name%7C%3D%7C\$\{runtime_environment:raw\}/,
		);
		assert.match(serialized, /from=\$\{__from\}/);
		assert.match(serialized, /tab=issues/);
		assert.match(serialized, /\/explore\?panes=/);
	}
	assert.match(JSON.stringify(elements["panel-3"]), /Feil i APM/);
	assert.ok(!JSON.stringify(elements["panel-5"]).includes("Feil i APM"));
});
