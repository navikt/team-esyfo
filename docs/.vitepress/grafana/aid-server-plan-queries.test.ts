import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAidDashboard } from "./aid-delivery-usage.ts";
import { aidServerPlanCreationsQuery } from "./aid-server-plan-queries.ts";

test("server confirmation isolates runtime logs and closed categories, not browser events", () => {
	for (const expected of [
		'service_namespace="team-esyfo"',
		'service_name="syfo-oppfolgingsplan-frontend"',
		'k8s_cluster_name=~"dev|prod"',
		`selected_environment="\${env:text}"`,
		'x_isFrontend!="true"',
		'forwarded_browser!="true"',
		'aid_event="aid_plan_opprettet"',
		'aid_schema="1"',
		'aid_package="OPPFOLGINGSPLAN_TILTAKSPAKKE_1"',
		'aid_group=~"tiltak|kontroll|utenfor_scope|ukjent"',
		'skjemavariant=~"tiltak|standard"',
		'aid_reminder=~"ja|nei"',
		"| keep gruppe, skjemavariant, evaluering_paaminnelse",
	])
		assert.ok(aidServerPlanCreationsQuery.includes(expected), expected);
	assert.doesNotMatch(
		aidServerPlanCreationsQuery,
		/event_data_|vector\(0\)|orgnummer|session_id|page_url/,
	);
	const panels = buildAidDashboard().spec.elements as Record<string, unknown>;
	const serialized = JSON.stringify(panels);
	assert.ok(serialized.includes("Ikke summer med nettleserpanelene"));
	assert.ok(serialized.includes("Nettleserbekreftelser"));
	assert.ok(
		JSON.stringify(panels["panel-28"]).includes(
			JSON.stringify(aidServerPlanCreationsQuery).slice(1, -1),
		),
	);
});
