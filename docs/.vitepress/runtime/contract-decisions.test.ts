import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

const readDoc = (path: string) =>
	readFileSync(
		new URL(`../../utvikling/observability/${path}`, import.meta.url),
		{
			encoding: "utf8",
		},
	);

describe("operative kontraktvedtak", () => {
	test("bevarer separat Budstikka-ansvar uten tilbaketrukket per-hendelse-shadow", () => {
		const kafkaContract = readDoc("kafka-kontrakter.md");
		const currentDocs = [
			kafkaContract,
			readDoc("runtimeinventar.md"),
			readDoc("kontrollrom.md"),
			readDoc("alert-register.md"),
		].join("\n");

		assert.match(
			kafkaContract,
			/innfører ikke en egen per-hendelse-kvittering eller avstemming/,
		);
		for (const withdrawnContract of [
			"Godkjent shadow-hypotese",
			"28 sammenhengende produksjonsdager",
			"høyst **5 minutter**",
			"høyst **30 aktive minutter**",
			"syfo-budstikka/issues/260",
		]) {
			assert.ok(!currentDocs.includes(withdrawnContract));
		}
	});
});
