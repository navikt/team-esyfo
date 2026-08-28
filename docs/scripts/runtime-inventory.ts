import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
	evaluateCoverageSnapshot,
	reconcileRuntime,
} from "../.vitepress/runtime/drift.ts";
import { runtimeInventory } from "../.vitepress/runtime/inventory.ts";
import type {
	CoverageEvidenceSnapshot,
	IsoDate,
	IsoDateTime,
	ObservedRuntimeSnapshot,
	SignalEvidence,
} from "../.vitepress/runtime/model.ts";
import { assertValidInventory } from "../.vitepress/runtime/validation.ts";

const args = process.argv.slice(2);
const command = args[0] ?? "check";

const option = (name: string) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
};

const today = () => new Date().toISOString().slice(0, 10) as IsoDate;

const check = () => {
	const result = assertValidInventory(runtimeInventory, {
		asOf: today(),
		failOnOverdueSunset: true,
		failOnOverdueMigration: true,
	});
	console.log(
		`Runtimeinventar OK: ${result.counts.applications} apper, ${result.counts.jobs} jobb, ${result.counts.ownedTopics} topics og ${result.counts.browserSurfaces} browserflater.`,
	);
	for (const warning of result.warnings) console.warn(`ADVARSEL: ${warning}`);
};

const exportInventory = async () => {
	assertValidInventory(runtimeInventory, {
		asOf: today(),
		failOnOverdueSunset: true,
		failOnOverdueMigration: true,
	});
	const output = resolve(option("--output") ?? ".vitepress/dist/runtime-inventory.v1.json");
	await mkdir(dirname(output), { recursive: true });
	await writeFile(output, `${JSON.stringify(runtimeInventory, null, 2)}\n`, "utf8");
	console.log(`Eksporterte runtimeinventar til ${output}`);
};

const isIsoDateTime = (value: unknown): value is IsoDateTime =>
	typeof value === "string" &&
	/^\d{4}-\d{2}-\d{2}T.+Z$/.test(value) &&
	Number.isFinite(new Date(value).getTime());

const isRuntimeResource = (value: unknown) => {
	if (!value || typeof value !== "object") return false;
	const item = value as Record<string, unknown>;
	return (
		(item.cluster === "prod-gcp" || item.cluster === "prod-fss") &&
		typeof item.namespace === "string" &&
		typeof item.name === "string" &&
		isIsoDateTime(item.observedAt) &&
		typeof item.source === "string"
	);
};

const duplicateRuntimeKeys = (items: unknown[]) => {
	const keys = items.map((value) => {
		const item = value as Record<string, unknown>;
		return `${item.cluster}:${item.namespace}:${item.name}`;
	});
	return keys.length !== new Set(keys).size;
};

const parseSnapshot = (value: unknown): ObservedRuntimeSnapshot => {
	if (!value || typeof value !== "object") throw new Error("Observed snapshot må være et objekt.");
	const snapshot = value as Record<string, unknown>;
	if (
		snapshot.schemaVersion !== 1 ||
		!isIsoDateTime(snapshot.observedAt) ||
		typeof snapshot.source !== "string" ||
		!Array.isArray(snapshot.applications) ||
		!snapshot.applications.every(isRuntimeResource) ||
		!Array.isArray(snapshot.jobs) ||
		!snapshot.jobs.every(isRuntimeResource) ||
		duplicateRuntimeKeys(snapshot.applications) ||
		duplicateRuntimeKeys(snapshot.jobs)
	) {
		throw new Error("Observed snapshot følger ikke runtime snapshot v1.");
	}
	return snapshot as unknown as ObservedRuntimeSnapshot;
};

const drift = async () => {
	assertValidInventory(runtimeInventory, { asOf: today() });
	const observedPath = option("--observed");
	if (!observedPath) throw new Error("Bruk --observed <snapshot.json>.");
	const snapshot = parseSnapshot(JSON.parse(await readFile(resolve(observedPath), "utf8")));
	const report = reconcileRuntime(runtimeInventory, snapshot, {
		now: (option("--now") as IsoDateTime | undefined) ?? undefined,
	});
	console.log(JSON.stringify(report, null, 2));
	if (report.status === "drift") process.exitCode = 2;
	if (report.status === "unknown") process.exitCode = 3;
};

const evidenceStates = new Set(["fresh", "stale", "missing", "error", "not-required"]);
const knownResourceIds = new Set<string>([
	...runtimeInventory.applications.map(({ id }) => id),
	...runtimeInventory.jobs.map(({ id }) => id),
	...runtimeInventory.topics.map(({ id }) => id),
	...runtimeInventory.browserSurfaces.map(({ id }) => id),
]);
const knownSignals = new Set<string>([
	...runtimeInventory.coverageProfiles.flatMap(({ requiredSignals }) => requiredSignals),
	"consumer-lag",
]);
const commitSha = /^[0-9a-f]{40}$/i;

const isEvidenceRevision = (value: unknown) => {
	if (!value || typeof value !== "object") return false;
	const revision = value as Record<string, unknown>;
	return (
		typeof revision.sourceCommitSha === "string" &&
		commitSha.test(revision.sourceCommitSha) &&
		typeof revision.deployedCommitSha === "string" &&
		commitSha.test(revision.deployedCommitSha)
	);
};

const isSignalEvidence = (value: unknown): value is SignalEvidence => {
	if (!value || typeof value !== "object") return false;
	const item = value as Record<string, unknown>;
	return (
		typeof item.resourceId === "string" &&
		knownResourceIds.has(item.resourceId) &&
		typeof item.signal === "string" &&
		knownSignals.has(item.signal) &&
		typeof item.state === "string" &&
		evidenceStates.has(item.state) &&
		isIsoDateTime(item.observedAt) &&
		(item.lastSeenAt === undefined || isIsoDateTime(item.lastSeenAt)) &&
		(item.freshUntil === undefined || isIsoDateTime(item.freshUntil)) &&
		typeof item.source === "string" &&
		(item.revision === undefined || isEvidenceRevision(item.revision))
	);
};

const parseEvidenceSnapshot = (value: unknown): CoverageEvidenceSnapshot => {
	if (!value || typeof value !== "object") throw new Error("Evidence snapshot må være et objekt.");
	const snapshot = value as Record<string, unknown>;
	if (
		snapshot.schemaVersion !== 1 ||
		!isIsoDateTime(snapshot.observedAt) ||
		typeof snapshot.source !== "string" ||
		!Array.isArray(snapshot.evidence) ||
		!snapshot.evidence.every(isSignalEvidence)
	) {
		throw new Error("Evidence snapshot følger ikke coverage evidence v1.");
	}
	return snapshot as unknown as CoverageEvidenceSnapshot;
};

const coverage = async () => {
	assertValidInventory(runtimeInventory, {
		asOf: today(),
		failOnOverdueSunset: true,
		failOnOverdueMigration: true,
	});
	const evidencePath = option("--evidence");
	if (!evidencePath) throw new Error("Bruk --evidence <snapshot.json>.");
	const snapshot = parseEvidenceSnapshot(
		JSON.parse(await readFile(resolve(evidencePath), "utf8")),
	);
	const report = evaluateCoverageSnapshot(runtimeInventory, snapshot, {
		now: (option("--now") as IsoDateTime | undefined) ?? undefined,
	});
	console.log(JSON.stringify(report, null, 2));
	if (report.status === "gaps") process.exitCode = 2;
	if (report.status === "unknown") process.exitCode = 3;
};

switch (command) {
	case "check":
		check();
		break;
	case "export":
		await exportInventory();
		break;
	case "drift":
		await drift();
		break;
	case "coverage":
		await coverage();
		break;
	default:
		throw new Error(
			`Ukjent kommando ${command}. Bruk check, export, drift eller coverage.`,
		);
}
