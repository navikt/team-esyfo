import assert from "node:assert/strict";
import { test } from "node:test";
import {
	aidReminderCancellationsQuery,
	aidReminderOrdersQuery,
	aidReminderViewsQuery,
	buildAidDashboard,
	serializeAidDashboard,
} from "./aid-delivery-usage.ts";
import {
	aidActionsQuery,
	aidDecisionsQuery,
	aidEventPipeline,
	aidFailuresQuery,
	aidViewsQuery,
} from "./aid-reminder-queries.ts";

const dashboard = (): ReturnType<typeof buildAidDashboard> =>
	JSON.parse(serializeAidDashboard());
const rows = () => dashboard().spec.layout.spec.rows;
type Panel = ReturnType<
	typeof buildAidDashboard
>["spec"]["elements"]["panel-1"];
const elements = (): Record<string, Panel> => dashboard().spec.elements;
const labels = (
	id: number,
	field: string,
): Record<string, { text: string }> => {
	const override = elements()[
		`panel-${id}`
	].spec.vizConfig.spec.fieldConfig.overrides.find(
		(o) => o.matcher.options === field,
	);
	assert.ok(override);
	const mappings = override.properties[0].value;
	assert.ok(Array.isArray(mappings));
	return mappings[0].options;
};
const expr = (id: number) =>
	elements()[`panel-${id}` as keyof ReturnType<typeof elements>].spec.data.spec
		.queries[0].spec.query.spec.expr;

test("preserves the existing dashboard address and folder", () => {
	const d = buildAidDashboard();
	assert.equal(d.metadata.name, "aufd2lm");
	assert.equal(d.metadata.annotations["grafana.app/folder"], "K-1b-N_4k");
	assert.equal(serializeAidDashboard(), serializeAidDashboard());
});

test("starts with product questions and one compact note, not a method essay", () => {
	const panels = Object.values(elements());
	const texts = panels.filter((p) => p.spec.vizConfig.group === "text");
	assert.equal(texts.length, 1);
	const content = texts[0].spec.vizConfig.spec.options.content;
	assert.ok(content);
	assert.ok(content.split(/\s+/).length <= 40);
	assert.doesNotMatch(
		panels.map((p) => p.spec.title).join(" "),
		/Serverbekreftede|Definisjoner|API|levert variant/i,
	);
	assert.match(content, /Nye planversjoner/);
	assert.match(content, /ikke effekt/);
	assert.equal(
		rows()[1].spec.layout.spec.items[0].spec.element.name,
		"panel-28",
	);
});

test("environment is global and the group selector really belongs only to plans", () => {
	const d = dashboard();
	assert.deepEqual(
		d.spec.variables.map((v) => v.spec.name),
		["environment"],
	);
	assert.equal(d.spec.variables?.[0].spec.current.value, "prod-gcp");
	assert.match(
		d.spec.variables?.[0].spec.query,
		/Produksjon : prod-gcp,Test : dev-gcp/,
	);
	assert.equal(d.spec.variables?.[0].spec.allowCustomValue, false);
	assert.equal(rows()[1].spec.variables?.[0].spec.name, "plan_group");
	assert.equal(
		rows()[1].spec.variables?.[0].spec.current.value,
		"tiltak|kontroll",
	);
	for (const row of rows()) {
		for (const item of row.spec.layout.spec.items) {
			const p = elements()[item.spec.element.name].spec;
			for (const q of p.data.spec.queries) {
				assert.match(q.spec.query.spec.expr, /\$\{environment:raw\}/);
				assert.doesNotMatch(q.spec.query.spec.expr, /\$\{env:text\}/);
				assert.equal(q.spec.query.group, "loki");
				assert.equal(
					q.spec.query.spec.expr.includes(`\${plan_group:raw}`),
					row.spec.title.startsWith("Planer"),
				);
			}
		}
	}
});

test("product view excludes the rest of the service while diagnostic groups remain available", () => {
	for (const id of [28, 29, 23])
		assert.match(expr(id), /gruppe=~"tiltak\|kontroll"/);
	for (const id of [30, 31, 32, 33, 15])
		assert.match(expr(id), /gruppe="tiltak"/);
	assert.doesNotMatch(serializeAidDashboard(), /syfo_oppfolgingsplan_backend_/);
	assert.equal(rows().at(-1)?.spec.collapse, true);
	assert.match(rows().at(-1)?.spec.title ?? "", /alle grupper/);
	assert.match(expr(34), /utenfor_scope\|blandet\|ukjent/);
});

test("evaluation shows offered choices, not standard defaults or inferred intentions", () => {
	assert.match(expr(30), /skjemavariant="tiltak"/);
	assert.doesNotMatch(expr(30), /hendelse|forsok|bekreftet/);
	const p = elements()["panel-30"].spec;
	assert.match(p.description, /urørt valg/);
	const mapping = labels(30, "Påminnelse om evaluering");
	assert.equal(mapping.ja.text, "Med påminnelse");
	assert.equal(mapping.nei.text, "Uten påminnelse");
});

test("diagnostics retain missing choices without presenting standard defaults as preferences", () => {
	assert.match(
		expr(24),
		/sum by \(gruppe, skjemavariant, evaluering_paaminnelse, utfall\)/,
	);
	assert.match(expr(24), /ikke_registrert/);
	assert.match(expr(24), /ugyldig/);
	assert.match(expr(24), /eq .skjemavariant "standard".*ikke_tilbudt/);
	const mapping = labels(24, "Påminnelse om evaluering");
	assert.equal(mapping.ikke_tilbudt.text, "Valget ble ikke tilbudt");
	assert.equal(mapping.ikke_registrert.text, "Ikke registrert");
});

test("reminder cards count views or confirmed operations, not attempts and results together", () => {
	assert.match(
		aidReminderViewsQuery,
		/hendelse="vist" \| utfall="tilgjengelig"/,
	);
	assert.match(
		aidReminderOrdersQuery,
		/hendelse="bestill" \| utfall="bekreftet"/,
	);
	assert.match(
		aidReminderCancellationsQuery,
		/hendelse="avbestill" \| utfall="bekreftet"/,
	);
	for (const q of [
		aidReminderViewsQuery,
		aidReminderOrdersQuery,
		aidReminderCancellationsQuery,
	]) {
		assert.match(q, /gruppe="tiltak" \| variant="aid"/);
		assert.doesNotMatch(q, /plan_group|vector\(0\)/);
	}
	assert.match(elements()["panel-32"].spec.description, /Ikke antall aktive/);
	assert.match(elements()["panel-15"].spec.description, /kan være forventet/);
});

test("delivery remains visible and unknown does not become control", () => {
	assert.match(expr(23), /sum by \(gruppe, skjemavariant\)/);
	assert.match(expr(23), /hendelse="vist"/);
	assert.equal(rows()[1].spec.collapse, false);
	const mapping = labels(23, "Gruppe");
	assert.equal(mapping.ukjent.text, "Gruppe mangler");
	assert.equal(mapping.utenfor_scope.text, "Utenfor forsøket");
	assert.equal(mapping.kontroll.text, "Kontrollgruppen");
});

test("trend is one source with explicit overlapping window and no zero fill", () => {
	assert.match(expr(29), /aid_plan_opprettet/);
	assert.match(expr(29), /\[1d\]/);
	assert.match(elements()["panel-29"].spec.description, /ikke kalenderdager/);
	assert.match(elements()["panel-29"].spec.description, /Ikke summer punktene/);
	assert.doesNotMatch(serializeAidDashboard(), /vector\(0\)/);
	for (const p of Object.values(elements())) {
		assert.equal(
			p.spec.vizConfig.spec.fieldConfig.defaults.noValue,
			"Ingen registreringer",
		);
	}
});

test("empty stat cards stay quiet and the evaluation table has room for both choices", () => {
	for (const id of [31, 32, 33]) {
		assert.equal(
			elements()[`panel-${id}`].spec.vizConfig.spec.options.text?.valueSize,
			32,
		);
	}
	const evaluation = rows()[2].spec.layout.spec.items[0].spec;
	assert.equal(evaluation.element.name, "panel-30");
	assert.ok(evaluation.height >= 5);
});

test("every panel is laid out once without overlap within a row", () => {
	const names: string[] = [];
	for (const row of rows()) {
		const items = row.spec.layout.spec.items.map((i) => i.spec);
		names.push(...items.map((i) => i.element.name));
		for (let i = 0; i < items.length; i++) {
			const a = items[i];
			assert.ok(a.x >= 0 && a.x + a.width <= 24);
			for (let j = i + 1; j < items.length; j++) {
				const b = items[j];
				assert.ok(
					a.x + a.width <= b.x ||
						b.x + b.width <= a.x ||
						a.y + a.height <= b.y ||
						b.y + b.height <= a.y,
				);
			}
		}
	}
	assert.deepEqual([...names].sort(), Object.keys(elements()).sort());
	assert.equal(new Set(names).size, names.length);
});

test("tables retain native filtering and explain the measured unit", () => {
	for (const p of Object.values(elements())) {
		if (p.spec.vizConfig.group !== "table") continue;
		assert.equal(
			p.spec.vizConfig.spec.fieldConfig.defaults.custom?.filterable,
			true,
		);
		const t = p.spec.data.spec.transformations[0];
		assert.equal(t.kind, "Transformation");
		assert.equal(t.group, "organize");
		assert.equal(
			t.spec.options.renameByName[
				`Value #${p.spec.data.spec.queries[0].spec.refId}`
			],
			"Registreringer",
		);
	}
});

test("reminder queries preserve producer, environment and closed event contract", () => {
	for (const q of [
		aidDecisionsQuery,
		aidViewsQuery,
		aidActionsQuery,
		aidFailuresQuery,
	]) {
		assert.match(q, /service_name="dinesykmeldte", kind="event"/);
		assert.match(q, /app_namespace="team-esyfo"/);
		assert.match(q, /app_environment="\$\{env:text\}"/);
		assert.match(q, /event_data_tiltakspakke="OPPFOLGINGSPLAN_TILTAKSPAKKE_1"/);
		assert.match(q, /event_data_schema_version="1"/);
		assert.match(q, /event_name="aid_paaminnelse"/);
		assert.match(
			q,
			/\| keep gruppe, variant, hendelse, paaminnelsevalg, utfall/,
		);
		assert.doesNotMatch(q, /vector\(0\)|session_id|orgnummer|page_url/);
	}
	assert.match(aidEventPipeline, /bestilt\|ikke_bestilt\|ikke_tilbudt\|ukjent/);
});
