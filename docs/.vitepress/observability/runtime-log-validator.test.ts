import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const cli = new URL(
	"../../public/contracts/runtime-error/v1.0.0/validate.mjs",
	import.meta.url,
);

const run = (
	input: string,
	catalogue: Record<string, unknown> = { event_type: ["plan_creation_failed"] },
	options: string[] = [],
) => {
	const directory = mkdtempSync(join(tmpdir(), "runtime-log-test-"));
	try {
		const catalogPath = join(directory, "catalog.json");
		writeFileSync(catalogPath, JSON.stringify(catalogue));
		return spawnSync(
			process.execPath,
			[cli.pathname, "--catalog", catalogPath, ...options, "-"],
			{ input, encoding: "utf8" },
		);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
};

test("CLI validerer serialisert JSON uten å fjerne vanlig feildiagnostikk", () => {
	const result = run(
		JSON.stringify({
			event_type: "plan_creation_failed",
			level: 50,
			err: {
				type: "Error",
				message: "Connection closed",
				stack: "Error: Connection closed\n at createPlan",
				cause: { code: "UND_ERR_SOCKET" },
			},
		}),
	);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /1 logghendelse/);
});

test("CLI validerer alle NDJSON-linjer og viser felt og linje uten råverdier", () => {
	const result = run(
		[
			JSON.stringify({ event_type: "plan_creation_failed" }),
			JSON.stringify({
				event_type: "plan_creation_failed",
				operation: "person-sensitive-value",
			}),
		].join("\n"),
		{ event_type: ["plan_creation_failed"], operation: ["create_plan"] },
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /stdin:2.*operation.*lokal katalog/);
	assert.doesNotMatch(result.stderr, /person-sensitive-value/);
});

test("CLI avviser tom input, ugyldig katalog og ukjente flagg som konfigurasjonsfeil", () => {
	for (const result of [
		run("\n"),
		run('{"event_type":"plan_creation_failed"}', {
			event_type: "plan_creation_failed",
		}),
		run('{"event_type":"plan_creation_failed"}', {
			event_type: ["plan_creation_failed"],
			operations: ["create_plan"],
		}),
		run(
			'{"event_type":"plan_creation_failed"}',
			{ event_type: ["plan_creation_failed"] },
			["--skip-invalid"],
		),
	]) {
		assert.equal(result.status, 2, result.stdout + result.stderr);
		assert.doesNotMatch(result.stderr, /at Module|at JSON.parse/);
	}
});

test("CLI støtter pretty-printet JSON, antallskontroll og eksplisitt WARN-avvisning", () => {
	const log = {
		event_type: "api_request_rejected",
		level: "WARN",
		rejection_reason: "SYSTEM_USER_ACCESS_NOT_GRANTED",
		pdp_decision: "Deny",
	};
	const catalog = {
		event_type: [log.event_type],
		rejection_reason: [log.rejection_reason],
	};
	const result = run(JSON.stringify(log, null, 2), catalog, [
		"--format",
		"json",
		"--expect-count",
		"1",
	]);
	assert.equal(result.status, 0, result.stderr);
	const duplicate = run(
		[JSON.stringify(log), JSON.stringify(log)].join("\n"),
		catalog,
		["--expect-count", "1"],
	);
	assert.equal(duplicate.status, 1);
	assert.match(duplicate.stderr, /Forventet 1.*fant 2/);
});

test("CLI avviser feil JSON-type, manglende avvisningsgrunn og malformed JSON uten innholdslekkasje", () => {
	for (const input of [
		'{"event_type":"plan_creation_failed","upstream_status":"502"}',
		'{"event_type":"api_request_rejected"}',
		'{"event_type":"plan_creation_failed","private-value":',
		"null",
		"[]",
	]) {
		const result = run(input, {
			event_type: ["plan_creation_failed", "api_request_rejected"],
		});
		assert.equal(result.status, 1, result.stdout + result.stderr);
		assert.doesNotMatch(result.stderr, /private-value|at JSON.parse/);
	}
});

test("CLI leser faktiske filer og feiler tydelig ved manglende fil", () => {
	const directory = mkdtempSync(join(tmpdir(), "runtime-log-files-"));
	try {
		const file = join(directory, "log.ndjson");
		writeFileSync(file, '{"event_type":"plan_creation_failed"}\n');
		const result = run("", undefined, [file]);
		assert.equal(result.status, 0, result.stderr);
		const missing = run("", undefined, [join(directory, "missing.ndjson")]);
		assert.equal(missing.status, 2);
		assert.match(missing.stderr, /Kunne ikke lese/);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
