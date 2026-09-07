import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAidDashboard } from "./aid-delivery-usage.ts";
import {
	aidPlanConfirmedTrendQuery,
	aidPlanCreationsQuery,
	aidPlanDecisionsQuery,
	aidPlanEventPipeline,
	aidPlanViewsQuery,
} from "./aid-plan-queries.ts";

const queries = [
	aidPlanDecisionsQuery,
	aidPlanViewsQuery,
	aidPlanCreationsQuery,
	aidPlanConfirmedTrendQuery,
];

test("plan queries isolate the producer, environment and exact v1 event contract", () => {
	for (const query of queries) {
		assert.match(query, /^sum by \(gruppe, variant(?:, utfall)?\)/);
		assert.ok(
			query.includes(
				'{service_name="syfo-oppfolgingsplan-frontend", kind="event"}',
			),
		);
		for (const filter of [
			'app_namespace="team-esyfo"',
			'event_name="aid_oppfolgingsplan"',
			'event_domain="aid"',
			'event_data_schema_version="1"',
			'event_data_tiltakspakke="OPPFOLGINGSPLAN_TILTAKSPAKKE_1"',
			'event_data_flate="ny_plan"',
		])
			assert.ok(query.includes(`| ${filter}`), filter);
		assert.match(query, /app_environment="\$\{env:text\}"/);
		assert.match(query, /\| keep gruppe, variant, hendelse, utfall/);
		assert.doesNotMatch(
			query,
			/aid_paaminnelse|paaminnelsevalg|session_id|person|orgnummer|page_url|vector\(0\)/,
		);
	}
});

test("unknown remains separate and standard does not imply control", () => {
	assert.match(
		aidPlanEventPipeline,
		/event_data_gruppe=~"tiltak\|kontroll\|utenfor_scope\|ukjent"/,
	);
	assert.match(aidPlanEventPipeline, /event_data_variant=~"aid\|standard"/);
	assert.doesNotMatch(aidPlanEventPipeline, /blandet|skjult/);
	for (const query of queries) assert.match(query, /sum by \(gruppe, variant/);
});

test("only valid event-outcome pairs count, with attempts separate from results", () => {
	assert.ok(
		aidPlanDecisionsQuery.includes(
			'| hendelse="beslutning" | utfall="tilgjengelig"',
		),
	);
	assert.ok(
		aidPlanViewsQuery.includes('| hendelse="vist" | utfall="tilgjengelig"'),
	);
	assert.ok(
		aidPlanCreationsQuery.includes(
			'| hendelse="opprett" | utfall=~"forsok|bekreftet|feilet"',
		),
	);
	assert.match(aidPlanCreationsQuery, /sum by \(gruppe, variant, utfall\)/);
	assert.ok(
		aidPlanConfirmedTrendQuery.includes(
			'| hendelse="opprett" | utfall="bekreftet"',
		),
	);
	for (const query of queries.slice(0, 3)) assert.match(query, /\[\$__auto\]/);
	assert.match(aidPlanConfirmedTrendQuery, /\[1d\]/);
});

test("new panels use their corresponding query and keep trend separate from table totals", () => {
	const panels = buildAidDashboard().spec.elements as Record<
		string,
		{
			spec: {
				data: {
					spec: {
						queries: {
							spec: {
								query: {
									group: string;
									spec: {
										expr: string;
										queryType: string;
										legendFormat: string;
									};
								};
							};
						}[];
					};
				};
				vizConfig: {
					group: string;
					spec: { fieldConfig: { defaults: { noValue: string } } };
				};
			};
		}
	>;
	for (const [index, expected] of queries.entries()) {
		const panel = panels[`panel-${22 + index}`].spec;
		const [query] = panel.data.spec.queries;
		assert.equal(panel.data.spec.queries.length, 1);
		assert.equal(query.spec.query.group, "loki");
		assert.equal(query.spec.query.spec.expr, expected);
		assert.equal(
			query.spec.query.spec.queryType,
			index === 3 ? "range" : "instant",
		);
		assert.equal(panel.vizConfig.group, index === 3 ? "timeseries" : "table");
		assert.equal(
			panel.vizConfig.spec.fieldConfig.defaults.noValue,
			"Ingen måledata",
		);
	}
	assert.equal(
		panels["panel-25"].spec.data.spec.queries[0].spec.query.spec.legendFormat,
		"{{gruppe}} · {{variant}}",
	);
});
