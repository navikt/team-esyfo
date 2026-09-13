import assert from "node:assert/strict";
import { test } from "node:test";
import {
	aidPlanConfirmedTrendQuery,
	aidPlanCreationsQuery,
	aidPlanDecisionsQuery,
	aidPlanEvaluationQuery,
	aidPlanEventPipeline,
	aidPlanViewsQuery,
} from "./aid-plan-queries.ts";

const queries = [
	aidPlanDecisionsQuery,
	aidPlanViewsQuery,
	aidPlanCreationsQuery,
	aidPlanConfirmedTrendQuery,
];

test("evaluation choice is additive, creation-only and does not turn missing data into no", () => {
	assert.match(
		aidPlanEvaluationQuery,
		/^sum by \(gruppe, skjemavariant, evaluering_paaminnelse, utfall\)/,
	);
	assert.ok(
		aidPlanEvaluationQuery.includes(
			'| hendelse="opprett" | utfall=~"forsok|bekreftet|feilet"',
		),
	);
	assert.ok(
		aidPlanEvaluationQuery.includes(
			'else if eq .event_data_evaluering_paaminnelse "" }}ikke_registrert',
		),
	);
	assert.ok(aidPlanEvaluationQuery.includes("{{ else }}ugyldig{{ end }}"));
	assert.match(
		aidPlanEvaluationQuery,
		/\| keep gruppe, skjemavariant, evaluering_paaminnelse, utfall/,
	);
	assert.doesNotMatch(
		aidPlanEvaluationQuery,
		/vector\(0\)|session_id|page_url|orgnummer/,
	);
	for (const query of queries) {
		assert.doesNotMatch(query, /\| event_data_evaluering_paaminnelse[=!]\S/);
		assert.match(query, /\| keep gruppe, skjemavariant, hendelse, utfall\n/);
	}
});

test("plan queries isolate the producer, environment and exact v1 event contract", () => {
	for (const query of queries) {
		assert.match(query, /^sum by \(gruppe, skjemavariant(?:, utfall)?\)/);
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
		assert.match(query, /\| keep gruppe, skjemavariant, hendelse, utfall/);
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
	assert.match(aidPlanEventPipeline, /skjemavariant=~"tiltak\|standard"/);
	assert.doesNotMatch(aidPlanEventPipeline, /blandet|skjult/);
	for (const query of queries)
		assert.match(query, /sum by \(gruppe, skjemavariant/);
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
	assert.match(
		aidPlanCreationsQuery,
		/sum by \(gruppe, skjemavariant, utfall\)/,
	);
	assert.ok(
		aidPlanConfirmedTrendQuery.includes(
			'| hendelse="opprett" | utfall="bekreftet"',
		),
	);
	for (const query of queries.slice(0, 3)) assert.match(query, /\[\$__auto\]/);
	assert.match(aidPlanConfirmedTrendQuery, /\[1d\]/);
});
