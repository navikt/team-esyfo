import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
	aidPlanEvaluationEventPipeline,
	aidPlanEvaluationQuery,
	aidPlanEventPipeline,
} from "./aid-plan-queries.ts";
import {
	aidPlanEvaluationDetailsQuery,
	aidProductEvaluationQuery,
	aidProductPlanCreationsQuery,
	aidProductPlanTrendQuery,
	aidProductPlanViewsQuery,
} from "./aid-product-queries.ts";
import {
	aidServerPlanCreationsQuery,
	aidServerPlanEventPipeline,
} from "./aid-server-plan-queries.ts";

const planQueries = [
	aidProductPlanCreationsQuery,
	aidProductPlanTrendQuery,
	aidProductPlanViewsQuery,
];

test("product plan queries keep a closed pilot boundary beside the local group filter", () => {
	for (const query of planQueries) {
		assert.ok(query.includes('| gruppe=~"tiltak|kontroll"'));
		assert.ok(query.includes(`| gruppe=~"\${plan_group:raw}"`));
		assert.ok(query.includes('| skjemavariant=~"tiltak|standard"'));
		assert.doesNotMatch(query, /\| skjemavariant="tiltak"/);
		assert.doesNotMatch(query, /\| gruppe="kontroll"/);
	}
});

test("creation and trend use only server confirmations and retain standard forms within treatment", () => {
	for (const query of [
		aidProductPlanCreationsQuery,
		aidProductPlanTrendQuery,
	]) {
		assert.ok(query.startsWith("sum by (gruppe) (count_over_time("));
		assert.ok(query.includes(aidServerPlanEventPipeline));
		assert.ok(query.includes("| keep gruppe\n["));
		assert.ok(query.includes(`selected_environment="\${env:text}"`));
		assert.ok(query.includes('x_isFrontend!="true"'));
		assert.ok(query.includes('forwarded_browser!="true"'));
		assert.doesNotMatch(query, /kind="event"|event_data_/);
	}
	assert.ok(aidProductPlanCreationsQuery.endsWith("[$__auto]))"));
	assert.ok(aidProductPlanTrendQuery.endsWith("[1d]))"));
});

test("evaluation includes only submitted yes or no from the offered treatment form", () => {
	assert.ok(aidProductEvaluationQuery.includes(aidServerPlanEventPipeline));
	assert.ok(
		aidProductEvaluationQuery.startsWith("sum by (evaluering_paaminnelse)"),
	);
	assert.ok(aidProductEvaluationQuery.includes('| gruppe="tiltak"'));
	assert.ok(aidProductEvaluationQuery.includes('| skjemavariant="tiltak"'));
	assert.ok(aidProductEvaluationQuery.includes('| aid_reminder=~"ja|nei"'));
	assert.ok(
		aidProductEvaluationQuery.includes("| keep evaluering_paaminnelse\n"),
	);
	assert.doesNotMatch(
		aidProductEvaluationQuery,
		/plan_group|label_format evaluering_paaminnelse=/,
	);
});

test("browser views count successful visibility events in the selected environment", () => {
	assert.ok(aidProductPlanViewsQuery.includes(aidPlanEventPipeline));
	assert.ok(
		aidProductPlanViewsQuery.includes(`app_environment="\${env:text}"`),
	);
	assert.ok(aidProductPlanViewsQuery.includes('| utfall="tilgjengelig"'));
	assert.doesNotMatch(
		aidProductPlanViewsQuery,
		/aid_plan_opprettet|opprett"|forsok|bekreftet/,
	);
	assert.ok(aidProductPlanViewsQuery.includes('| hendelse="vist"'));
	assert.ok(
		aidProductPlanViewsQuery.startsWith("sum by (gruppe, skjemavariant)"),
	);
	assert.ok(
		aidProductPlanViewsQuery.includes("| keep gruppe, skjemavariant\n"),
	);
});

test("product queries preserve missing data and use no metric or identity joins", () => {
	for (const query of [...planQueries, aidProductEvaluationQuery]) {
		assert.doesNotMatch(
			query,
			/vector\(0\)|increase\(|rate\(|_total|group_left|group_right|orgnummer|personident|session_id|plan_id/,
		);
		assert.ok(query.includes('service_name="syfo-oppfolgingsplan-frontend"'));
		assert.ok(query.includes('"team-esyfo"'));
	}
});

test("shared server pipeline leaves the existing diagnostic query unchanged", () => {
	assert.equal(
		aidServerPlanCreationsQuery,
		`sum by (gruppe, skjemavariant, evaluering_paaminnelse) (count_over_time(\n${aidServerPlanEventPipeline}\n[$__auto]))`,
	);
});

test("shared browser evaluation pipeline preserves the original query byte for byte", () => {
	assert.equal(
		createHash("sha256").update(aidPlanEvaluationQuery).digest("hex"),
		"0ea905ce913c970c3a39a4ecf6b76bf0c1843a40467c62b6d35054d17aff4576",
	);
});

test("evaluation details keep missing and invalid categories without presenting standard forms as preferences", () => {
	assert.ok(
		aidPlanEvaluationDetailsQuery.includes(aidPlanEvaluationEventPipeline),
	);
	assert.ok(
		aidPlanEvaluationDetailsQuery.includes(
			'| hendelse="opprett" | utfall=~"forsok|bekreftet|feilet"',
		),
	);
	assert.ok(
		aidPlanEvaluationDetailsQuery.includes(
			'else if eq .event_data_evaluering_paaminnelse "" }}ikke_registrert{{ else }}ugyldig',
		),
	);
	assert.ok(
		aidPlanEvaluationDetailsQuery.includes(
			"| keep gruppe, skjemavariant, evaluering_paaminnelse, utfall",
		),
	);
	assert.ok(
		aidPlanEvaluationDetailsQuery.includes(
			'| label_format evaluering_paaminnelse=`{{ if eq .skjemavariant "standard" }}ikke_tilbudt{{ else }}{{ .evaluering_paaminnelse }}{{ end }}`',
		),
	);
	assert.ok(
		aidPlanEvaluationDetailsQuery.startsWith(
			"sum by (gruppe, skjemavariant, evaluering_paaminnelse, utfall)",
		),
	);
	assert.ok(
		aidPlanEvaluationDetailsQuery.includes(`app_environment="\${env:text}"`),
	);
	assert.doesNotMatch(
		aidPlanEvaluationDetailsQuery,
		/plan_group|vector\(0\)|\| evaluering_paaminnelse=~"ja\|nei"/,
	);
});
