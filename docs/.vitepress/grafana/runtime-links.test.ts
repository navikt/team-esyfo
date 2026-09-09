import assert from "node:assert/strict";
import { test } from "node:test";
import { apmDataLink, runtimeLogsDataLink } from "./runtime-links.ts";

test("APM links preserve service, environment and the dashboard's absolute time range", () => {
	for (const environment of ["prod", "dev"]) {
		for (const tab of ["overview", "issues", "traces"] as const) {
			const url = new URL(
				apmDataLink("dialogmote-frontend", environment, tab),
				"https://grafana.example.test",
			);
			assert.equal(
				url.pathname,
				"/a/nais-apm-app/services/team-esyfo/dialogmote-frontend",
			);
			assert.equal(url.searchParams.get("environment"), environment);
			assert.equal(url.searchParams.get("tab"), tab);
			assert.equal(url.searchParams.get("from"), "${__from}");
			assert.equal(url.searchParams.get("to"), "${__to}");
		}
	}
});

test("service log links keep team and environment filters", () => {
	const url = new URL(
		runtimeLogsDataLink("dialogmote-frontend", "dev"),
		"https://grafana.example.test",
	);
	assert.deepEqual(url.searchParams.getAll("var-filters"), [
		"service_name|=|dialogmote-frontend",
		"service_namespace|=|team-esyfo",
		"k8s_cluster_name|=|dev",
	]);
	assert.equal(url.searchParams.get("from"), "${__from}");
	assert.equal(url.searchParams.get("to"), "${__to}");
});
