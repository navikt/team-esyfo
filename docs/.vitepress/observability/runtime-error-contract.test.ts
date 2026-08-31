import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";
import Ajv from "ajv";
import {
	runtimeDashboardTraceIdPattern,
	runtimeErrorCodePattern,
	runtimeErrorContractPublicPath,
	runtimeErrorContractV1Schema,
	runtimeEventTypePattern,
	runtimeExceptionTypePattern,
	runtimeTraceIdPattern,
	runtimeUpstreamStatusStringPattern,
	serializeRuntimeErrorContractV1,
} from "./runtime-error-contract.ts";

const fixtureRoot = new URL("./fixtures/runtime-error/v1/", import.meta.url);

const readFixtures = (group: "valid" | "invalid" | "boundary") =>
	readdirSync(new URL(`${group}/`, fixtureRoot), { encoding: "utf8" })
		.filter((name) => name.endsWith(".json"))
		.sort()
		.map((name) => ({
			name,
			value: JSON.parse(
				readFileSync(new URL(`${group}/${name}`, fixtureRoot), "utf8"),
			) as Record<string, unknown>,
		}));

const ajv = new Ajv({ allErrors: true, strict: true });
const validate = ajv.compile(runtimeErrorContractV1Schema);

const validationErrors = () =>
	(validate.errors ?? [])
		.map(({ instancePath, message }) => `${instancePath || "/"} ${message}`)
		.join("; ");

const expectedInvalidError = {
	"error-code-format.json": ["/error_code", "pattern"],
	"error-code-json-number.json": ["/error_code", "type"],
	"error-code-number.json": ["/error_code", "pattern"],
	"event-type-format.json": ["/event_type", "pattern"],
	"exception-type-message.json": ["/exception_type", "pattern"],
	"missing-event-type.json": ["", "required"],
	"operation-url.json": ["/operation", "pattern"],
	"trace-id-zero.json": ["/trace_id", "not"],
	"upstream-status-decimal.json": ["/upstream_status", "type"],
	"upstream-status-range.json": ["/upstream_status", "maximum"],
	"upstream-status-string.json": ["/upstream_status", "type"],
} as const;

describe("runtime-feilkontrakt v1", () => {
	test("bevarer alle gyldige kompatibilitets-fixtures", () => {
		for (const fixture of readFixtures("valid")) {
			assert.equal(
				validate(fixture.value),
				true,
				`${fixture.name}: ${validationErrors()}`,
			);
		}
	});

	test("avviser feil format og feil JSON-typer", () => {
		for (const fixture of readFixtures("invalid")) {
			assert.equal(
				validate(fixture.value),
				false,
				`${fixture.name} skulle vært avvist`,
			);
			const expected =
				expectedInvalidError[fixture.name as keyof typeof expectedInvalidError];
			assert.ok(expected, `${fixture.name} mangler forventet diagnose`);
			assert.ok(
				validate.errors?.some(
					({ instancePath, keyword }) =>
						instancePath === expected[0] && keyword === expected[1],
				),
				`${fixture.name}: ${validationErrors()}`,
			);
		}
	});

	test("låser lengde- og statusgrensene", () => {
		for (const upstream_status of [100, 599]) {
			assert.equal(
				validate({ event_type: "a".repeat(80), upstream_status }),
				true,
				validationErrors(),
			);
		}
		assert.equal(validate({ event_type: "a".repeat(81) }), false);
		assert.ok(
			validate.errors?.some(
				({ instancePath, keyword }) =>
					instancePath === "/event_type" && keyword === "pattern",
			),
			validationErrors(),
		);
	});

	test("er eksplisitt om grensen mellom schema og kodeeid katalog", () => {
		const fixtures = Object.fromEntries(
			readFixtures("boundary").map(({ name, value }) => [name, value]),
		);
		for (const [name, value] of Object.entries(fixtures)) {
			assert.equal(validate(value), true, `${name}: ${validationErrors()}`);
		}

		const localEventCatalog = new Set(["sykmelding_lookup_failed"]);
		assert.equal(
			localEventCatalog.has(
				String(fixtures["allowlist-required.json"].event_type),
			),
			false,
		);
		const unknown = fixtures["allowlist-required.json"];
		assert.equal(
			new Set<string>(["hent_sykmelding"]).has(String(unknown.operation)),
			false,
		);
		assert.equal(
			new Set<string>(["UPSTREAM_HTTP_ERROR"]).has(String(unknown.error_code)),
			false,
		);
		assert.equal(
			new Set<string>(["UpstreamHttpException"]).has(
				String(unknown.exception_type),
			),
			false,
		);
		assert.equal("request_url" in fixtures["privacy-test-required.json"], true);
	});

	test("publisert schema er eksakt generert fra samme kilde", () => {
		const published = readFileSync(
			new URL(
				`../../public/${runtimeErrorContractPublicPath}`,
				import.meta.url,
			),
			"utf8",
		);
		assert.equal(published, serializeRuntimeErrorContractV1());
	});

	test("mønstrene som gjenbrukes i Loki holder seg innenfor RE2", () => {
		for (const pattern of [
			runtimeEventTypePattern,
			runtimeErrorCodePattern,
			runtimeExceptionTypePattern,
			runtimeTraceIdPattern,
			runtimeDashboardTraceIdPattern,
			runtimeUpstreamStatusStringPattern,
		]) {
			assert.doesNotMatch(pattern, /\(\?[=!<]|\\[1-9]/);
		}
	});
});
