import assert from "node:assert/strict";
import { test } from "node:test";
import {
	aidActionsQuery,
	aidDecisionsQuery,
	aidEventPipeline,
	aidFailuresQuery,
	aidViewsQuery,
	backendCount,
	backendMetrics,
	buildAidDashboard,
	serializeAidDashboard,
} from "./aid-delivery-usage.ts";

test("preserves the existing dashboard UID and Team Esyfo folder", () => {
	const dashboard = buildAidDashboard();
	assert.equal(dashboard.metadata.name, "aufd2lm");
	assert.equal(
		dashboard.metadata.annotations["grafana.app/folder"],
		"K-1b-N_4k",
	);
	assert.equal(serializeAidDashboard(), serializeAidDashboard());
});

test("keeps existing backend counters and does not pretend they are arm segmented", () => {
	const text = serializeAidDashboard();
	for (const [metric] of backendMetrics) {
		assert.ok(text.includes(backendCount(metric).replaceAll('"', '\\"')));
	}
	assert.doesNotMatch(
		backendCount("paaminnelse_bestilt"),
		/gruppe|event_data|paaminnelsevalg|vector\(0\)/,
	);
	assert.match(text, /Hele valgt miljø/);
});

test("browser queries scope the exact producer, namespace, environment, package and version", () => {
	for (const query of [
		aidDecisionsQuery,
		aidViewsQuery,
		aidActionsQuery,
		aidFailuresQuery,
	]) {
		assert.match(query, /service_name="dinesykmeldte", kind="event"/);
		assert.match(query, /app_namespace="team-esyfo"/);
		assert.match(query, /app_environment="\$\{env:text\}"/);
		assert.match(
			query,
			/event_data_tiltakspakke="OPPFOLGINGSPLAN_TILTAKSPAKKE_1"/,
		);
		assert.match(query, /event_data_schema_version="1"/);
		assert.match(query, /event_name="aid_paaminnelse"/);
		assert.match(
			query,
			/\| keep gruppe, variant, hendelse, paaminnelsevalg, utfall/,
		);
		assert.match(query, /\[\$__auto\]/);
		assert.doesNotMatch(
			query,
			/vector\(0\)|session_id|person|orgnummer|page_url/,
		);
	}
});

test("does not merge unknown assignment or absent reminder choices with control/no", () => {
	assert.match(
		aidEventPipeline,
		/tiltak\|kontroll\|utenfor_scope\|blandet\|ukjent/,
	);
	assert.match(aidEventPipeline, /bestilt\|ikke_bestilt\|ikke_tilbudt\|ukjent/);
	assert.match(aidDecisionsQuery, /sum by \(gruppe, variant, utfall\)/);
	assert.match(
		aidActionsQuery,
		/sum by \(gruppe, hendelse, paaminnelsevalg, utfall\)/,
	);
	assert.match(aidActionsQuery, /forsok\|bekreftet\|feilet\|ikke_bekreftet/);
});

test("every panel appears once with no grid overlap", () => {
	const dashboard = buildAidDashboard().spec;
	const items = (
		dashboard.layout as {
			spec: {
				items: {
					spec: {
						element: { name: string };
						x: number;
						y: number;
						width: number;
						height: number;
					};
				}[];
			};
		}
	).spec.items;
	const names = items.map(({ spec }) => spec.element.name);
	assert.deepEqual(
		[...names].sort(),
		Object.keys(dashboard.elements as object).sort(),
	);
	assert.equal(new Set(names).size, names.length);
	for (let i = 0; i < items.length; i++) {
		const a = items[i].spec;
		assert.ok(a.x >= 0 && a.x + a.width <= 24);
		for (let j = i + 1; j < items.length; j++) {
			const b = items[j].spec;
			assert.ok(
				a.x + a.width <= b.x ||
					b.x + b.width <= a.x ||
					a.y + a.height <= b.y ||
					b.y + b.height <= a.y,
			);
		}
	}
});

test("no global arm or reminder filter can silently change the comparison", () => {
	const variables = buildAidDashboard().spec.variables as {
		spec: { name: string; allowCustomValue: boolean };
	}[];
	assert.deepEqual(
		variables.map((it) => it.spec.name),
		["env"],
	);
	assert.equal(variables[0].spec.allowCustomValue, false);
	assert.match(serializeAidDashboard(), /Ingen konverteringsprosent/);
});

test("instant tables use the v2 transformation contract and expose column filters", () => {
	const elements = buildAidDashboard().spec.elements as Record<
		string,
		{
			spec: {
				data: {
					spec: {
						queries: { spec: { refId: string } }[];
						transformations: {
							kind: string;
							group: string;
							spec: { options: { renameByName: Record<string, string> } };
						}[];
					};
				};
				vizConfig: {
					group: string;
					spec: {
						fieldConfig: { defaults: { custom: { filterable: boolean } } };
					};
				};
			};
		}
	>;
	for (const { spec } of Object.values(elements)) {
		if (spec.vizConfig.group !== "table") continue;
		const transform = spec.data.spec.transformations[0];
		assert.equal(transform.kind, "Transformation");
		assert.equal(transform.group, "organize");
		assert.equal(
			transform.spec.options.renameByName[
				`Value #${spec.data.spec.queries[0].spec.refId}`
			],
			"Hendelser",
		);
		assert.equal(
			spec.vizConfig.spec.fieldConfig.defaults.custom.filterable,
			true,
		);
	}
});
