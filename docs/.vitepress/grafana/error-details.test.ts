import assert from "node:assert/strict";
import { test } from "node:test";
import {
	buildErrorDetailsDashboard,
	recentErrorSamplesQuery,
	selectedErrorGroupQuery,
	selectedErrorTracesQuery,
	serializeErrorDetailsDashboard,
} from "./error-details.ts";
import {
	runtimeEventContextDataLink,
	runtimeTraceLogsDataLink,
} from "./error-diagnostics.ts";
import { ERROR_DETAILS_UID, errorDetailsDataLink } from "./runtime-links.ts";

const pane = (link: string) =>
	JSON.parse(new URL(link, "https://grafana.test").searchParams.get("panes")!)
		.A;

test("første klikk bevarer den valgte feilgruppen uten å vise queryeditor", () => {
	const row = {
		service_name: "flaggskipet",
		error_type_display: "Ikke oppgitt av appen",
		error_code_display: "—",
		operation_display: "—",
		error_level: "fatal",
	};
	const link = errorDetailsDataLink()
		.replace(
			/\$\{__data.fields\["([^"]+)"\]\}/g,
			(_, field: keyof typeof row) => encodeURIComponent(row[field]),
		)
		.replace("${runtime_environment:raw}", "dev")
		.replace("${__from}", "1000")
		.replace("${__to}", "2000");
	const url = new URL(link, "https://grafana.test");
	assert.equal(url.pathname, `/d/${ERROR_DETAILS_UID}`);
	assert.equal(url.searchParams.get("var-event"), row.error_type_display);
	assert.equal(url.searchParams.get("var-code"), "—");
	assert.equal(url.searchParams.get("var-level"), "fatal");
	assert.equal(url.searchParams.get("var-runtime_environment"), "dev");
	assert.equal(url.searchParams.get("from"), "1000");
	assert.equal(url.searchParams.get("to"), "2000");
});

test("detaljqueryer siterer URL-verdier og beholder identitet og legacy-fallback", () => {
	const query = selectedErrorGroupQuery();
	for (const name of [
		"runtime_environment",
		"app",
		"event",
		"code",
		"operation",
		"level",
	])
		assert.ok(query.includes(`\${${name}:doublequote}`));
	assert.doesNotMatch(query, /__data.fields|:raw|:regex/);
	assert.match(query, /Ikke oppgitt av appen/);
	assert.match(query, /nested_err_type/);
	assert.doesNotMatch(recentErrorSamplesQuery, /safe_trace_id!=/);
	assert.match(selectedErrorTracesQuery, /safe_trace_id!=""/);
	assert.match(
		recentErrorSamplesQuery,
		/\| line_format `{{ .diagnostic_details }}`/,
	);
	assert.match(recentErrorSamplesQuery, /context_from/);
});

test("hele forløpet følger samme trace på tvers av tjenester og loggnivå", () => {
	const state = pane(
		runtimeTraceLogsDataLink("abcdef0123456789abcdef0123456789"),
	);
	assert.equal(state.compact, true);
	assert.match(state.queries[0].expr, /service_namespace="team-esyfo"/);
	assert.doesNotMatch(
		state.queries[0].expr,
		/service_name=|detected_level|event_type|error_code/,
	);
	assert.match(state.queries[0].expr, /trace_id!=/);
	assert.match(state.queries[0].expr, /\{32\}/);
});

test("uten trace finnes alle tjenestelogger rundt hendelsens tidspunkt", () => {
	const state = pane(
		runtimeEventContextDataLink()
			.replace('${__data.fields["service_name"]}', "flaggskipet")
			.replace('${__data.fields["context_from"]}', "1000")
			.replace('${__data.fields["context_to"]}', "241000"),
	);
	assert.deepEqual(state.range, { from: "1000", to: "241000" });
	assert.match(state.queries[0].expr, /service_name=/);
	assert.doesNotMatch(
		state.queries[0].expr,
		/detected_level|event_type|error_code/,
	);
	assert.equal(state.compact, true);
});

test("detaljvisningen viser forklaring før hendelser og trace med begrenset utvalg", () => {
	const dashboard = buildErrorDetailsDashboard();
	assert.equal(dashboard.metadata.name, ERROR_DETAILS_UID);
	const serialized = serializeErrorDetailsDashboard();
	assert.match(serialized, /"maxLines": 50/);
	assert.match(serialized, /Hva vet vi om feilen/);
	assert.match(serialized, /med og uten trace/);
	assert.match(serialized, /Logger i hele forløpet/);
	assert.match(serialized, /Rålogger for gruppen/);
	assert.equal(serialized, serializeErrorDetailsDashboard());
	const spec = dashboard.spec as {
		variables: Array<{
			spec: { name: string; multi?: boolean; hide?: string };
		}>;
	};
	assert.equal(
		spec.variables.find(({ spec }) => spec.name === "app")?.spec.multi,
		false,
	);
	for (const name of ["event", "code", "operation", "level"])
		assert.equal(
			spec.variables.find(({ spec }) => spec.name === name)?.spec.hide,
			"hideVariable",
		);
});
