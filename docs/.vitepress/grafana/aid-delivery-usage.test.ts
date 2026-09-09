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
>["spec"]["elements"]["panel-28"];
const elements = (): Record<string, Panel> => dashboard().spec.elements;
const rowWithPanel = (id: number) => {
	const row = rows().find((r) =>
		r.spec.layout.spec.items.some((i) => i.spec.element.name === `panel-${id}`),
	);
	assert.ok(row);
	return row;
};
const seriesLabel = (id: number, value: string) => {
	const overrides =
		elements()[`panel-${id}`].spec.vizConfig.spec.fieldConfig.overrides;
	const category = overrides.find(
		(o) =>
			o.matcher.id === "byRegexp" &&
			new RegExp(o.matcher.options.slice(1, -1)).test(value),
	);
	assert.ok(category);
	return category.properties.find((p) => p.id === "displayName")?.value;
};
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

test("starts with product data and keeps method explanations in panel information", () => {
	const panels = Object.values(elements());
	assert.ok(panels.every((p) => !["text"].includes(p.spec.vizConfig.group)));
	assert.equal(elements()["panel-1"], undefined);
	assert.doesNotMatch(
		panels.map((p) => p.spec.title).join(" "),
		/Serverbekreftede|Definisjoner|API|levert variant/i,
	);
	assert.match(elements()["panel-28"].spec.description, /Oppdaterte planer/);
	assert.match(
		elements()["panel-28"].spec.description,
		/9\. september 2026 kl\. 09\.28/,
	);
	assert.equal(rows()[0].spec.title, "Oppfølgingsplaner i forsøket");
	assert.equal(
		rows()[0].spec.layout.spec.items[0].spec.element.name,
		"panel-28",
	);
});

test("production and group scope are fixed with no global or row-local selectors", () => {
	const d = dashboard();
	assert.deepEqual(d.spec.variables, []);
	assert.match(d.spec.description, /^Produksjon:/);
	assert.doesNotMatch(
		serializeAidDashboard(),
		/\$\{(?:environment|env):|dev-gcp|plan_group|CustomVariable/,
	);
	for (const row of rows()) {
		assert.equal("variables" in row.spec, false);
		for (const item of row.spec.layout.spec.items) {
			const p = elements()[item.spec.element.name].spec;
			for (const q of p.data.spec.queries) {
				assert.match(q.spec.query.spec.expr, /prod-gcp/);
				assert.doesNotMatch(q.spec.query.spec.expr, /\$\{env:text\}/);
				assert.equal(q.spec.query.group, "loki");
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
	assert.match(p.description, /Valgt ja eller nei/);
	assert.match(p.description, /tre dager før avtalt evalueringsmøte/);
	assert.doesNotMatch(p.description, /urørt valg|aktivt avslag/);
	assert.equal(seriesLabel(30, "ja"), "Påminnelse valgt");
	assert.equal(seriesLabel(30, "nei"), "Påminnelse ikke valgt");
});

test("product counts use labelled horizontal bars without progress or percentage claims", () => {
	for (const [id, category] of [
		[28, "gruppe"],
		[30, "evaluering_paaminnelse"],
	] as const) {
		const config = elements()[`panel-${id}`].spec.vizConfig;
		assert.equal(config.group, "bargauge");
		assert.equal(config.spec.options.orientation, "horizontal");
		assert.equal(config.spec.options.valueMode, "text");
		assert.equal(config.spec.options.namePlacement, "left");
		assert.equal(config.spec.options.showUnfilled, false);
		assert.equal(config.spec.options.text?.valueSize, 24);
		assert.equal(config.spec.fieldConfig.defaults.min, 0);
		assert.equal(config.spec.fieldConfig.defaults.fieldMinMax, false);
		assert.equal(
			config.spec.fieldConfig.defaults.displayName,
			`\${__field.name}`,
		);
		assert.equal(config.spec.fieldConfig.defaults.unit, "locale");
		assert.deepEqual(config.spec.options.reduceOptions?.calcs, ["lastNotNull"]);
		assert.equal(config.spec.options.reduceOptions?.values, false);
		const data = elements()[`panel-${id}`].spec.data.spec;
		const q = data.queries[0];
		assert.equal(q.spec.query.spec.queryType, "instant");
		assert.equal("format" in q.spec.query.spec, false);
		assert.equal(data.transformations.length, 1);
		const transformation = data.transformations[0];
		assert.equal(transformation.group, "rowsToFields");
		assert.ok("mappings" in transformation.spec.options);
		assert.deepEqual(transformation.spec.options.mappings, [
			{ fieldName: category, handlerKey: "field.name" },
			{ fieldName: `Value #${q.spec.refId}`, handlerKey: "field.value" },
			{ fieldName: "Time", handlerKey: "__ignore" },
		]);
	}
	assert.equal(seriesLabel(28, "tiltak"), "Tiltaksgruppen");
	assert.equal(seriesLabel(28, "kontroll"), "Kontrollgruppen");
});

test("availability diagnostics aggregate the hidden variant rather than dropping table labels", () => {
	assert.match(expr(34), /^sum by \(gruppe, utfall\)/);
	assert.doesNotMatch(expr(34), /^sum by \([^)]*variant/);
	assert.match(expr(34), /hendelse="beslutning"/);
	assert.match(expr(34), /utenfor_scope\|blandet\|ukjent/);
	assert.equal(
		labels(34, "Resultat").vurdering_mangler.text,
		"Vurdering mangler",
	);
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

test("technical results describe responses rather than claiming that a plan was lost", () => {
	const results = labels(24, "Resultat");
	assert.equal(results.bekreftet.text, "Vellykket svar");
	assert.equal(results.feilet.text, "Feil eller manglende svar");
	assert.match(
		elements()["panel-24"].spec.description,
		/betyr ikke nødvendigvis at planen ikke ble lagret/,
	);
	assert.equal(labels(24, "Hendelse").opprett.text, "Ferdigstilling");
	const reminders = labels(20, "Hendelse");
	assert.equal(reminders.bestill.text, "Slå på påminnelse");
	assert.equal(reminders.avbestill.text, "Slå av påminnelse");
	const transformation =
		elements()["panel-24"].spec.data.spec.transformations[0];
	assert.ok("renameByName" in transformation.spec.options);
	assert.equal(transformation.spec.options.renameByName.Value, "Hendelser");
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
	assert.equal(rowWithPanel(23).spec.collapse, false);
	const mapping = labels(23, "Gruppe");
	assert.equal(mapping.ukjent.text, "Gruppe mangler");
	assert.equal(mapping.utenfor_scope.text, "Utenfor forsøket");
	assert.equal(mapping.kontroll.text, "Kontrollgruppen");
	const versions = labels(23, "Oppfølgingsplan");
	assert.equal(versions.tiltak.text, "Med AID-tilpasninger");
	assert.equal(versions.standard.text, "Uten AID-tilpasninger");
});

test("trend is one source with explicit overlapping window and no zero fill", () => {
	assert.match(expr(29), /aid_plan_opprettet/);
	assert.match(expr(29), /\[1d\]/);
	assert.match(elements()["panel-29"].spec.title, /rullerende døgn/);
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

test("reminder cards use the product action and leave room for both evaluation choices", () => {
	for (const id of [31, 32, 33]) {
		assert.equal(
			elements()[`panel-${id}`].spec.vizConfig.spec.options.text?.valueSize,
			32,
		);
	}
	assert.match(
		rowWithPanel(31).spec.title,
		/før fireukersfristen · Dine sykmeldte · tiltaksgruppen/,
	);
	assert.equal(elements()["panel-32"].spec.title, "Påminnelse slått på");
	assert.equal(elements()["panel-33"].spec.title, "Påminnelse slått av");
	const evaluation = rowWithPanel(30).spec.layout.spec.items[0].spec;
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
		assert.ok("renameByName" in t.spec.options);
		assert.equal(
			t.spec.options.renameByName[
				`Value #${p.spec.data.spec.queries[0].spec.refId}`
			],
			p.spec.id === 24 ? "Hendelser" : "Registreringer",
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
