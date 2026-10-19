import assert from "node:assert/strict";
import { test } from "node:test";
import {
	apmDataLink,
	runtimeErrorLogsDataLink,
	runtimeLogsDataLink,
	runtimePodLogsDataLink,
} from "./runtime-links.ts";

test("error log links keep service filters and add an error level filter", () => {
	const url = new URL(
		runtimeErrorLogsDataLink("esyfo-narmesteleder"),
		"https://grafana.example.test",
	);
	assert.deepEqual(url.searchParams.getAll("var-filters"), [
		"service_name|=|esyfo-narmesteleder",
		"service_namespace|=|team-esyfo",
		"k8s_cluster_name|=|prod",
	]);
	assert.deepEqual(url.searchParams.getAll("var-levels"), [
		"detected_level|=|error",
	]);
	assert.equal(
		new URL(
			runtimeLogsDataLink("esyfo-narmesteleder"),
			"https://grafana.example.test",
		).searchParams.has("var-levels"),
		false,
	);
});

test("pod logs filter structured metadata outside the stream selector and preserve time", () => {
	const link = runtimePodLogsDataLink("${service:raw}", "${__value.raw}");
	const url = new URL(
		link
			.replaceAll("${service:raw}", "flaggskipet")
			.replaceAll("${__value.raw}", "flaggskipet-old"),
		"https://grafana.example.test",
	);
	const pane = JSON.parse(url.searchParams.get("panes")!).A;
	assert.equal(
		pane.queries[0].expr,
		'{service_namespace="team-esyfo", k8s_cluster_name="prod", service_name="flaggskipet"} | k8s_pod_name="flaggskipet-old"',
	);
	assert.deepEqual(pane.range, { from: "${__from}", to: "${__to}" });
	assert.equal(pane.queries[0].queryType, "range");
	assert.equal(pane.datasource, "PEA2100DC89AE9FE2");
});

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
