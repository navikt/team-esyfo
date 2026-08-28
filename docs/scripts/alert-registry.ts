import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { reconcileAlertObservations } from "../.vitepress/alerts/drift.ts";
import {
	alertRegistry,
	serializeAlertRegistry,
} from "../.vitepress/alerts/registry.ts";
import type {
	AlertObservation,
	AlertObservationSnapshot,
} from "../.vitepress/alerts/model.ts";
import { assertValidAlertRegistry } from "../.vitepress/alerts/validation.ts";

const args = process.argv.slice(2);
const command = args[0] ?? "check";
const defaultArtifact = "public/alert-register.v1.json";

const option = (name: string) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
};

const isIsoDateTime = (value: unknown): value is string =>
	typeof value === "string" &&
	/^\d{4}-\d{2}-\d{2}T.+Z$/.test(value) &&
	Number.isFinite(new Date(value).getTime());

const configuredStates = new Set(["enabled", "paused", "disabled"]);
const evaluationStates = new Set([
	"not-firing",
	"pending",
	"firing",
	"not-evaluated",
	"unknown",
]);
const evaluationHealthStates = new Set(["ok", "error", "unknown"]);
const environments = new Set(["dev-gcp", "prod-gcp", "prod-fss"]);
const definitionComparisons = new Set(["exact-match", "semantic-match"]);

const isObservedDefinition = (value: unknown) => {
	if (!value || typeof value !== "object") return false;
	const definition = value as Record<string, unknown>;
	return (
		typeof definition.expressionFingerprint === "string" &&
		/^fnv1a64:[0-9a-f]{16}$/.test(definition.expressionFingerprint) &&
		(definition.holdFor === undefined ||
			typeof definition.holdFor === "string") &&
		(definition.evaluationInterval === undefined ||
			typeof definition.evaluationInterval === "string") &&
		typeof definition.comparison === "string" &&
		definitionComparisons.has(definition.comparison) &&
		typeof definition.normalizationNote === "string" &&
		definition.normalizationNote.trim().length > 0
	);
};

const isObservation = (value: unknown): value is AlertObservation => {
	if (!value || typeof value !== "object") return false;
	const observation = value as Record<string, unknown>;
	return (
		typeof observation.ruleId === "string" &&
		observation.ruleId.startsWith("rule:") &&
		typeof observation.environment === "string" &&
		environments.has(observation.environment) &&
		typeof observation.configuredState === "string" &&
		configuredStates.has(observation.configuredState) &&
		typeof observation.evaluationState === "string" &&
		evaluationStates.has(observation.evaluationState) &&
		typeof observation.evaluationHealth === "string" &&
		evaluationHealthStates.has(observation.evaluationHealth) &&
		isObservedDefinition(observation.observedDefinition) &&
		isIsoDateTime(observation.observedAt) &&
		typeof observation.evidenceHref === "string" &&
		typeof observation.note === "string"
	);
};

const parseSnapshot = (value: unknown): AlertObservationSnapshot => {
	if (!value || typeof value !== "object") {
		throw new Error("Alert-snapshot må være et objekt.");
	}
	const snapshot = value as Record<string, unknown>;
	if (
		snapshot.schemaVersion !== 1 ||
		!isIsoDateTime(snapshot.observedAt) ||
		typeof snapshot.source !== "string" ||
		!Array.isArray(snapshot.observations) ||
		!snapshot.observations.every(isObservation)
	) {
		throw new Error("Alert-snapshot følger ikke observation snapshot v1.");
	}
	return snapshot as unknown as AlertObservationSnapshot;
};

const check = async () => {
	const report = assertValidAlertRegistry(alertRegistry);
	const artifactPath = resolve(defaultArtifact);
	const artifact = await readFile(artifactPath, "utf8").catch(() => undefined);
	if (artifact !== serializeAlertRegistry()) {
		throw new Error(
			`Alert-artefakten er utdatert. Kjør pnpm alert-register:export (${artifactPath}).`,
		);
	}
	console.log(
		`Alert-register OK: ${report.counts.prometheusInstances} PrometheusRule-instanser og ${report.counts.grafanaInstances} Grafana-regler.`,
	);
	for (const warning of report.warnings) console.warn(`GAP: ${warning}`);
};

const exportRegistry = async () => {
	assertValidAlertRegistry(alertRegistry);
	const output = resolve(option("--output") ?? defaultArtifact);
	await mkdir(dirname(output), { recursive: true });
	await writeFile(output, serializeAlertRegistry(), "utf8");
	console.log(`Eksporterte alert-register til ${output}`);
};

const drift = async () => {
	assertValidAlertRegistry(alertRegistry);
	const observedPath = option("--observed");
	if (!observedPath) throw new Error("Bruk --observed <snapshot.json>.");
	const snapshot = parseSnapshot(
		JSON.parse(await readFile(resolve(observedPath), "utf8")),
	);
	const report = reconcileAlertObservations(alertRegistry, snapshot, {
		now: option("--now"),
	});
	console.log(JSON.stringify(report, null, 2));
	if (report.status === "drift") process.exitCode = 2;
	if (report.status === "unknown") process.exitCode = 3;
};

switch (command) {
	case "check":
		await check();
		break;
	case "export":
		await exportRegistry();
		break;
	case "drift":
		await drift();
		break;
	default:
		throw new Error(
			`Ukjent kommando ${command}. Bruk check, export eller drift.`,
		);
}
