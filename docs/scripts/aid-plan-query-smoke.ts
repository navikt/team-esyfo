import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { setTimeout as pause } from "node:timers/promises";
import { promisify } from "node:util";
import {
	aidPlanConfirmedTrendQuery,
	aidPlanCreationsQuery,
	aidPlanDecisionsQuery,
	aidPlanEvaluationQuery,
	aidPlanViewsQuery,
} from "../.vitepress/grafana/aid-plan-queries.ts";
import { aidServerPlanCreationsQuery } from "../.vitepress/grafana/aid-server-plan-queries.ts";

const exec = promisify(execFile);
const container = `aid-plan-query-check-${process.pid}-${randomBytes(4).toString("hex")}`;
const base = {
	app_namespace: "team-esyfo",
	app_environment: "dev-gcp",
	event_name: "aid_oppfolgingsplan",
	event_domain: "aid",
	event_data_schema_version: "1",
	event_data_tiltakspakke: "OPPFOLGINGSPLAN_TILTAKSPAKKE_1",
	event_data_flate: "ny_plan",
	event_data_gruppe: "tiltak",
	event_data_variant: "aid",
	event_data_hendelse: "opprett",
	event_data_utfall: "bekreftet",
};
// Synthetic fixtures only. Missing/invalid choice still counts as a creation.
const fixtures: Record<string, string>[] = [
	{},
	{ event_data_evaluering_paaminnelse: "ja" },
	{ event_data_evaluering_paaminnelse: "nei" },
	{ event_data_evaluering_paaminnelse: "untrusted-fixture-value" },
	{ event_data_evaluering_paaminnelse: "ja", event_data_utfall: "forsok" },
	{ event_data_evaluering_paaminnelse: "nei", event_data_utfall: "feilet" },
	{ event_data_evaluering_paaminnelse: "nei", event_data_variant: "standard" },
	{ event_data_evaluering_paaminnelse: "ja", event_data_variant: "standard" },
	{ event_data_gruppe: "kontroll", event_data_variant: "standard" },
	{ event_data_gruppe: "ukjent", event_data_variant: "standard" },
	{ event_data_hendelse: "vist", event_data_utfall: "tilgjengelig" },
	{ event_data_hendelse: "beslutning", event_data_utfall: "tilgjengelig" },
	{ app_environment: "prod-gcp", event_data_evaluering_paaminnelse: "ja" },
	// Unrelated and invalid contracts must not inflate any creation count.
	{ app_namespace: "other" },
	{ event_name: "aid_paaminnelse" },
	{ event_domain: "other" },
	{ event_data_schema_version: "2" },
	{ event_data_tiltakspakke: "OTHER" },
	{ event_data_flate: "other" },
	{ event_data_gruppe: "blandet" },
	{ event_data_variant: "skjult" },
	{ event_data_hendelse: "vist" },
	{ event_data_utfall: "tilgjengelig" },
];

type Series = { metric: Record<string, string>; value: [number, string] };
const serverLabels = {
	service_namespace: "team-esyfo",
	service_name: "syfo-oppfolgingsplan-frontend",
	k8s_cluster_name: "dev",
};
const serverEvent = {
	event_type: "aid_plan_opprettet",
	schema_version: "1",
	tiltakspakke: "OPPFOLGINGSPLAN_TILTAKSPAKKE_1",
	gruppe: "tiltak",
	variant: "aid",
	evaluering_paaminnelse: "ja",
};
const serverFixtures: {
	labels?: Record<string, string>;
	fields?: Record<string, unknown>;
}[] = [
	{},
	{},
	{ fields: { evaluering_paaminnelse: "nei" } },
	{ fields: { variant: "standard", evaluering_paaminnelse: "nei" } },
	{
		fields: {
			gruppe: "kontroll",
			variant: "standard",
			evaluering_paaminnelse: "nei",
		},
	},
	{
		fields: {
			gruppe: "ukjent",
			variant: "standard",
			evaluering_paaminnelse: "nei",
		},
	},
	{ labels: { k8s_cluster_name: "prod" } },
	{ labels: { k8s_cluster_name: "other" } },
	{ labels: { service_namespace: "other" } },
	{ labels: { service_name: "other" } },
	{ labels: { x_isFrontend: "true" } },
	{ fields: { x_isFrontend: true } },
	{ fields: { event_type: "other" } },
	{ fields: { schema_version: "2" } },
	{ fields: { tiltakspakke: "other" } },
	{ fields: { gruppe: "other" } },
	{ fields: { variant: "other" } },
	{ fields: { evaluering_paaminnelse: "other" } },
	{ fields: { evaluering_paaminnelse: null } },
];
const total = (rows: Series[]) =>
	rows.reduce((sum, row) => sum + Number(row.value[1]), 0);
let started = false;
try {
	const { stdout: host } = await exec("docker", [
		"context",
		"inspect",
		"--format",
		"{{.Endpoints.docker.Host}}",
	]);
	assert.match(
		host.trim(),
		/^unix:\/\//,
		"Only a local Docker socket is allowed",
	);
	await exec("docker", [
		"run",
		"--detach",
		"--name",
		container,
		"--tmpfs",
		"/loki:rw,uid=10001,gid=10001",
		"--publish",
		"127.0.0.1::3100",
		"grafana/loki:3.6.0",
		"-config.file=/etc/loki/local-config.yaml",
	]);
	started = true;
	const { stdout: binding } = await exec("docker", [
		"port",
		container,
		"3100/tcp",
	]);
	assert.match(binding.trim(), /^127\.0\.0\.1:\d+$/);
	const url = `http://${binding.trim()}`;
	let ready = false;
	for (let attempt = 0; attempt < 120; attempt++) {
		try {
			ready = (
				await fetch(`${url}/ready`, { signal: AbortSignal.timeout(2000) })
			).ok;
		} catch {
			/* Starting up. */
		}
		if (ready) break;
		await pause(500);
	}
	assert.ok(ready, "Local Loki did not become ready");
	const now = Date.now();
	const values = fixtures.map((fixture, index) => [
		String(BigInt(now - 1000) * 1000000n + BigInt(index)),
		Object.entries({ ...base, ...fixture })
			.map(([key, value]) => `${key}=${JSON.stringify(value)}`)
			.join(" "),
	]);
	const response = await fetch(`${url}/loki/api/v1/push`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			streams: [
				...serverFixtures.map(({ labels, fields }, index) => ({
					stream: { ...serverLabels, ...labels },
					values: [
						[
							String(BigInt(now - 1000) * 1000000n + BigInt(index)),
							JSON.stringify({ ...serverEvent, ...fields }),
						],
					],
				})),
				{
					stream: {
						service_name: "syfo-oppfolgingsplan-frontend",
						kind: "event",
					},
					values,
				},
				{
					stream: { service_name: "dinesykmeldte", kind: "event" },
					values: [values[0]],
				},
				{
					stream: {
						service_name: "syfo-oppfolgingsplan-frontend",
						kind: "log",
					},
					values: [values[0]],
				},
			],
		}),
		signal: AbortSignal.timeout(10000),
	});
	assert.equal(response.status, 204, await response.text());
	const count = async (
		query: string,
		environment = "dev-gcp",
	): Promise<Series[]> => {
		const expr = query
			.replaceAll("${env:text}", environment)
			.replaceAll("$__auto", "1h");
		const response = await fetch(
			`${url}/loki/api/v1/query?${new URLSearchParams({ query: expr, time: String(Date.now() / 1000) })}`,
			{ signal: AbortSignal.timeout(10000) },
		);
		const body = await response.text();
		assert.equal(response.status, 200, body);
		return JSON.parse(body).data.result;
	};
	const choices = await count(aidPlanEvaluationQuery);
	assert.deepEqual(
		choices
			.map(({ metric, value }) => [
				metric.gruppe,
				metric.variant,
				metric.evaluering_paaminnelse,
				metric.utfall,
				Number(value[1]),
			])
			.sort(),
		[
			["tiltak", "aid", "ikke_registrert", "bekreftet", 1],
			["tiltak", "aid", "ja", "bekreftet", 1],
			["tiltak", "aid", "nei", "bekreftet", 1],
			["tiltak", "aid", "ugyldig", "bekreftet", 1],
			["tiltak", "aid", "ja", "forsok", 1],
			["tiltak", "aid", "nei", "feilet", 1],
			["tiltak", "standard", "nei", "bekreftet", 1],
			["tiltak", "standard", "ja", "bekreftet", 1],
			["kontroll", "standard", "ikke_registrert", "bekreftet", 1],
			["ukjent", "standard", "ikke_registrert", "bekreftet", 1],
		].sort(),
	);
	assert.doesNotMatch(
		JSON.stringify(choices),
		/untrusted-fixture-value|event_data_|service_name/,
	);
	assert.equal(total(await count(aidPlanCreationsQuery)), 10);
	assert.equal(total(choices), total(await count(aidPlanCreationsQuery)));
	assert.equal(total(await count(aidPlanConfirmedTrendQuery)), 8);
	assert.equal(total(await count(aidPlanDecisionsQuery)), 1);
	assert.equal(total(await count(aidPlanViewsQuery)), 1);
	assert.equal(total(await count(aidPlanEvaluationQuery, "prod-gcp")), 1);
	assert.deepEqual(await count(aidPlanEvaluationQuery, "no-events"), []);
	const serverRows = await count(aidServerPlanCreationsQuery);
	assert.deepEqual(
		serverRows
			.map(({ metric, value }) => [
				metric.gruppe,
				metric.variant,
				metric.evaluering_paaminnelse,
				Number(value[1]),
			])
			.sort(),
		[
			["tiltak", "aid", "ja", 2],
			["tiltak", "aid", "nei", 1],
			["tiltak", "standard", "nei", 1],
			["kontroll", "standard", "nei", 1],
			["ukjent", "standard", "nei", 1],
		].sort(),
	);
	assert.equal(total(await count(aidServerPlanCreationsQuery, "prod-gcp")), 1);
	assert.deepEqual(await count(aidServerPlanCreationsQuery, "no-events"), []);
	for (const row of serverRows)
		assert.deepEqual(Object.keys(row.metric).sort(), [
			"evaluering_paaminnelse",
			"gruppe",
			"variant",
		]);
	console.log(
		"Loki 3.6.0: browser and server plan queries return exact expected counts; legacy events, closed categories, forwarded-browser exclusion and producer/environment isolation verified.",
	);
} finally {
	if (started) await exec("docker", ["rm", "--force", container]);
}
