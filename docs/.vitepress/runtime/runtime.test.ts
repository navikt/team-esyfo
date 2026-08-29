import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	evaluateCoverage,
	evaluateCoverageSnapshot,
	reconcileRuntime,
} from "./drift.ts";
import { runtimeInventory } from "./inventory.ts";
import type {
	IsoDateTime,
	ObservedRuntimeResource,
	ObservedRuntimeSnapshot,
	RuntimeInventory,
	SignalEvidence,
} from "./model.ts";
import { validateInventory } from "./validation.ts";

const cloneInventory = () =>
	structuredClone(runtimeInventory) as RuntimeInventory;
const observedAt = "2026-08-28T10:00:00Z" as IsoDateTime;

const observed = (runtime: {
	cluster: "prod-gcp" | "prod-fss";
	namespace: string;
	name: string;
}) =>
	({
		...runtime,
		observedAt,
		source: "test",
	}) satisfies ObservedRuntimeResource;

const baselineSnapshot = (): ObservedRuntimeSnapshot => ({
	schemaVersion: 1,
	observedAt,
	source: "test",
	applications: [
		...runtimeInventory.applications
			.filter(({ lifecycle }) => lifecycle.state !== "retired")
			.map(({ runtime }) => observed(runtime)),
		observed({
			cluster: "prod-gcp",
			namespace: "team-esyfo",
			name: "dulting-studio",
		}),
	],
	jobs: runtimeInventory.jobs.map(({ runtime }) => observed(runtime)),
});

describe("runtimeinventar", () => {
	test("låser den godkjente baseline med typespesifikke antall", () => {
		const result = validateInventory(runtimeInventory, { asOf: "2026-08-28" });
		assert.deepEqual(result.errors, []);
		assert.deepEqual(result.counts, {
			applications: 26,
			jobs: 1,
			ownedTopics: 10,
			browserSurfaces: 11,
			sunsetApplications: 3,
		});
	});

	test("bevarer de tre avviklingsressursene samlet frem til #208-cutover", () => {
		const resourceIds = new Set<string>([
			"app:syfooppfolgingsplanservice",
			"app:syfooppfolgingsplanservice-redis",
			"app:syfooppfolgingsplanservice-redisexporter",
		]);
		const resources = runtimeInventory.applications.filter(({ id }) =>
			resourceIds.has(id),
		);

		assert.equal(resources.length, resourceIds.size);
		for (const resource of resources) {
			assert.equal(resource.lifecycle.state, "sunset");
			if (resource.lifecycle.state !== "sunset") continue;
			assert.equal(resource.lifecycle.sunsetOn, "2026-08-31");
			assert.equal(resource.lifecycle.decision, "navikt/team-esyfo#208");
		}

		const varselbus = runtimeInventory.topics.find(
			({ id }) => id === "topic:varselbus",
		);
		assert.ok(varselbus);
		assert.ok(
			varselbus.producers.internal.includes("app:syfooppfolgingsplanservice"),
		);
	});

	test("avviser duplisert runtimeidentitet", () => {
		const inventory = cloneInventory();
		inventory.applications[1].runtime = inventory.applications[0].runtime;
		const result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(
			result.errors.some((error) =>
				error.includes("Duplisert runtimeidentitet"),
			),
		);
	});

	test("avviser ukjente kryssreferanser", () => {
		const inventory = cloneInventory();
		inventory.browserSurfaces[0].runtimeRef = "app:finnes-ikke";
		inventory.topics[0].producers.internal = ["app:finnes-ikke"];
		const result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(
			result.errors.some((error) => error.includes("peker ikke til en aktiv")),
		);
		assert.ok(
			result.errors.some((error) => error.includes("ukjent intern ressurs")),
		);
	});

	test("avviser aktiv app som samtidig er ekskludert", () => {
		const inventory = cloneInventory();
		inventory.exclusions.push({
			id: "exclusion:test",
			selector: {
				kind: "application",
				name: inventory.applications[0].runtime.name,
				namespace: inventory.applications[0].runtime.namespace,
			},
			reason: "test",
			decision: "test",
		});
		const result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(
			result.errors.some((error) => error.includes("både aktiv og ekskludert")),
		);
	});

	test("gjør passert sunset til hard feil i streng CI-modus", () => {
		const warning = validateInventory(runtimeInventory, { asOf: "2026-09-01" });
		assert.equal(warning.errors.length, 0);
		assert.equal(warning.warnings.length, 3);
		const strict = validateInventory(runtimeInventory, {
			asOf: "2026-09-01",
			failOnOverdueSunset: true,
		});
		assert.equal(
			strict.errors.filter((error) => error.includes("passerte sunset")).length,
			3,
		);
	});

	test("håndhever migreringsfrist og aktiv målressurs", () => {
		const warning = validateInventory(runtimeInventory, { asOf: "2026-12-19" });
		assert.equal(
			warning.warnings.filter((message) => message.includes("migreringsmålet"))
				.length,
			2,
		);
		const strict = validateInventory(runtimeInventory, {
			asOf: "2026-12-19",
			failOnOverdueMigration: true,
		});
		assert.equal(
			strict.errors.filter((message) => message.includes("migreringsmålet"))
				.length,
			2,
		);
		const inventory = cloneInventory();
		const target = inventory.applications.find(
			({ id }) => id === "app:syfo-budstikka",
		);
		assert.ok(target);
		target.lifecycle = {
			state: "retired",
			retiredOn: "2026-08-28",
			reason: "test",
		};
		const invalidTarget = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(
			invalidTarget.errors.some((message) =>
				message.includes("app:syfo-budstikka, som er retired"),
			),
		);
	});

	test("håndhever progress-semantikk for continuous topics", () => {
		const inventory = cloneInventory();
		const continuous = inventory.topics.find(
			({ trafficModel }) => trafficModel === "continuous",
		);
		assert.ok(continuous);
		continuous.serviceLevel.zeroTrafficAllowed = true;
		const result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(
			result.errors.some((message) =>
				message.includes("tillater nulltrafikk uten ferskt progressbevis"),
			),
		);
	});

	test("beholder planlagt utfasing i aktiv kontroll uten oppdiktet dato", () => {
		const resource = runtimeInventory.applications.find(
			({ id }) => id === "app:syfobrukertilgang",
		);
		assert.ok(resource);
		assert.equal(resource.lifecycle.state, "retiring");
		if (resource.lifecycle.state !== "retiring") return;
		assert.equal(resource.lifecycle.targetDate, undefined);
		assert.deepEqual(resource.lifecycle.consumerRefs, ["app:syfomotebehov"]);
		assert.deepEqual(resource.lifecycle.candidateReplacementRefs, [
			"app:esyfo-narmesteleder",
		]);
	});
});

describe("runtime drift", () => {
	test("godtar aktiv baseline, midlertidig sunset og eksplisitt exclusion", () => {
		const report = reconcileRuntime(runtimeInventory, baselineSnapshot(), {
			now: "2026-08-28T10:30:00Z",
		});
		assert.equal(report.status, "ok");
		assert.equal(report.sunsetInRuntime.length, 3);
		assert.equal(report.excludedInRuntime.length, 1);
	});

	test("rapporterer manglende og ukjent runtime begge veier", () => {
		const snapshot = baselineSnapshot();
		snapshot.applications = snapshot.applications.filter(
			({ name }) => name !== "aktivitetskrav-backend",
		);
		snapshot.applications.push(
			observed({
				cluster: "prod-gcp",
				namespace: "team-esyfo",
				name: "ukjent-app",
			}),
		);
		const report = reconcileRuntime(runtimeInventory, snapshot, {
			now: "2026-08-28T10:30:00Z",
		});
		assert.equal(report.status, "drift");
		assert.deepEqual(report.missingInRuntime, ["app:aktivitetskrav-backend"]);
		assert.equal(report.unexpectedInRuntime[0].name, "ukjent-app");
	});

	test("sunset-runtime er påkrevd frem til og med cutoff", () => {
		const snapshot = baselineSnapshot();
		snapshot.applications = snapshot.applications.filter(
			({ name }) => !name.startsWith("syfooppfolgingsplanservice"),
		);
		const report = reconcileRuntime(runtimeInventory, snapshot, {
			now: "2026-08-28T10:30:00Z",
		});
		assert.equal(report.status, "drift");
		assert.equal(
			report.missingInRuntime.filter((id) =>
				id.startsWith("app:syfooppfolgingsplanservice"),
			).length,
			3,
		);
	});

	test("app og jobb kan ikke oppfylle hverandres runtimeidentitet", () => {
		const snapshot = baselineSnapshot();
		const moved = snapshot.applications.find(
			({ name }) => name === "aktivitetskrav-backend",
		);
		assert.ok(moved);
		snapshot.applications = snapshot.applications.filter(
			({ name }) => name !== moved.name,
		);
		snapshot.jobs.push(moved);
		const report = reconcileRuntime(runtimeInventory, snapshot, {
			now: "2026-08-28T10:30:00Z",
		});
		assert.equal(report.status, "drift");
		assert.ok(report.missingInRuntime.includes("app:aktivitetskrav-backend"));
		assert.ok(
			report.unexpectedInRuntime.some(
				(runtime) =>
					runtime.kind === "job" && runtime.name === "aktivitetskrav-backend",
			),
		);
	});

	test("stale snapshot kan aldri bli grønt", () => {
		const report = reconcileRuntime(runtimeInventory, baselineSnapshot(), {
			now: "2026-08-28T12:01:00Z",
			staleAfterMinutes: 60,
		});
		assert.equal(report.status, "unknown");
		assert.equal(report.staleSnapshot, true);
	});

	test("ferskt toppsnapshot kan ikke skjule en stale ressursobservasjon", () => {
		const snapshot = baselineSnapshot();
		snapshot.applications[0].observedAt = "2025-01-01T00:00:00Z";
		const report = reconcileRuntime(runtimeInventory, snapshot, {
			now: "2026-08-28T10:30:00Z",
		});
		assert.equal(report.status, "unknown");
		assert.equal(report.staleSnapshot, false);
		assert.equal(report.staleRuntimeObservations.length, 1);
		assert.equal(
			report.staleRuntimeObservations[0].name,
			"aktivitetskrav-backend",
		);
	});

	test("snapshot fra fremtiden blir unknown", () => {
		const report = reconcileRuntime(runtimeInventory, baselineSnapshot(), {
			now: "2026-08-28T09:00:00Z",
		});
		assert.equal(report.status, "unknown");
		assert.equal(report.futureSnapshot, true);
	});

	test("runtime etter sunset blir drift", () => {
		const report = reconcileRuntime(runtimeInventory, baselineSnapshot(), {
			now: "2026-09-01T10:00:00Z",
			staleAfterMinutes: 10_000,
		});
		assert.equal(report.status, "drift");
		assert.equal(report.pastSunset.length, 3);
	});
});

describe("dekningsevidens", () => {
	const profile = runtimeInventory.coverageProfiles.find(
		({ id }) => id === "kafka-pipeline",
	);
	if (!profile) throw new Error("Testprofilen kafka-pipeline mangler.");
	const freshEvidence: SignalEvidence[] = profile.requiredSignals.map(
		(signal) =>
			({
				resourceId: "topic:varselbus",
				signal,
				state: "fresh",
				observedAt,
				source: "test",
			}) satisfies SignalEvidence,
	);

	test("fersk pipelineevidens er komplett selv ved legitim nulltrafikk", () => {
		const result = evaluateCoverage(
			"topic:varselbus",
			profile,
			freshEvidence,
			"2026-08-28T10:20:00Z",
		);
		assert.equal(result.state, "complete");
	});

	test("manglende signal kan aldri bli komplett", () => {
		const result = evaluateCoverage(
			"topic:varselbus",
			profile,
			freshEvidence.slice(1),
			"2026-08-28T10:20:00Z",
		);
		assert.equal(result.state, "partial");
	});

	test("stale eller datasource-feil blir unknown", () => {
		const stale = evaluateCoverage(
			"topic:varselbus",
			profile,
			freshEvidence,
			"2026-08-28T11:00:00Z",
		);
		assert.equal(stale.state, "unknown");
		const withError = structuredClone(freshEvidence);
		withError[0].state = "error";
		const errored = evaluateCoverage(
			"topic:varselbus",
			profile,
			withError,
			"2026-08-28T10:20:00Z",
		);
		assert.equal(errored.state, "unknown");
	});

	test("fresh duplikat kan ikke skjule datasource-feil", () => {
		const duplicated = structuredClone(freshEvidence);
		duplicated.unshift({
			...freshEvidence[0],
			state: "error",
			source: "failing-source",
		});
		const result = evaluateCoverage(
			"topic:varselbus",
			profile,
			duplicated,
			"2026-08-28T10:20:00Z",
		);
		assert.equal(result.state, "unknown");
	});

	test("release-identitet krever matchende immutable revisjonsbevis", () => {
		const browserProfile = runtimeInventory.coverageProfiles.find(
			({ id }) => id === "browser-public",
		);
		assert.ok(browserProfile);
		const evidence = browserProfile.requiredSignals.map(
			(signal) =>
				({
					resourceId: "browser:aktivitetskrav-frontend",
					signal,
					state: "fresh",
					observedAt,
					source: "test",
					...(signal === "release-identity"
						? {
								revision: {
									sourceCommitSha: "a".repeat(40),
									deployedCommitSha: "b".repeat(40),
								},
							}
						: {}),
				}) satisfies SignalEvidence,
		);
		const result = evaluateCoverage(
			"browser:aktivitetskrav-frontend",
			browserProfile,
			evidence,
			"2026-08-28T10:20:00Z",
		);
		assert.equal(result.state, "unknown");
		assert.deepEqual(result.unknownSignals, ["release-identity"]);
	});

	test("continuous topic krever ferskt lastSeenAt for pipeline-progress", () => {
		const topic = runtimeInventory.topics.find(
			({ id }) => id === "topic:syfo-narmesteleder-leesah",
		);
		assert.ok(topic);
		const evidence = profile.requiredSignals.map(
			(signal) =>
				({
					resourceId: topic.id,
					signal,
					state: "fresh",
					observedAt,
					source: "test",
				}) satisfies SignalEvidence,
		);
		evidence.push({
			resourceId: topic.id,
			signal: "consumer-lag",
			state: "fresh",
			observedAt,
			source: "test",
		});
		const report = evaluateCoverageSnapshot(
			runtimeInventory,
			{
				schemaVersion: 1,
				observedAt,
				source: "test",
				evidence,
			},
			{ now: "2026-08-28T10:05:00Z" },
		);
		const topicReport = report.resources.find(
			({ resourceId }) => resourceId === topic.id,
		);
		assert.ok(topicReport);
		assert.equal(topicReport.state, "partial");
		assert.ok(topicReport.missingSignals.includes("pipeline-progress"));
	});

	test("lager en typespesifikk maskinell dekningsrapport", () => {
		const resources = [
			...runtimeInventory.applications,
			...runtimeInventory.jobs,
			...runtimeInventory.topics,
			...runtimeInventory.browserSurfaces,
		].filter(
			(resource) =>
				resource.lifecycle.state === "active" ||
				resource.lifecycle.state === "migrating" ||
				resource.lifecycle.state === "retiring" ||
				resource.lifecycle.state === "sunset",
		);
		const evidence: SignalEvidence[] = resources.flatMap((resource) => {
			const resourceProfile = runtimeInventory.coverageProfiles.find(
				({ id }) => id === resource.coverageProfile,
			);
			assert.ok(resourceProfile);
			const signals = [...resourceProfile.requiredSignals];
			if (
				resource.kind === "topic" &&
				resource.serviceLevel.consumerLag === "required"
			) {
				signals.push("consumer-lag");
			}
			return [...new Set(signals)].map((signal) => ({
				resourceId: resource.id,
				signal,
				state: "fresh",
				observedAt,
				lastSeenAt:
					resource.kind === "topic" &&
					signal === "pipeline-progress" &&
					!resource.serviceLevel.zeroTrafficAllowed
						? observedAt
						: undefined,
				revision:
					resource.kind === "browser-surface" && signal === "release-identity"
						? {
								sourceCommitSha: "a".repeat(40),
								deployedCommitSha: "a".repeat(40),
							}
						: undefined,
				source: "test",
			}));
		});
		const report = evaluateCoverageSnapshot(
			runtimeInventory,
			{
				schemaVersion: 1,
				observedAt,
				source: "test",
				evidence,
			},
			{ now: "2026-08-28T10:05:00Z" },
		);
		assert.equal(report.status, "complete");
		assert.equal(report.summary.application.complete, 29);
		assert.equal(report.summary.job.complete, 1);
		assert.equal(report.summary.topic.complete, 10);
		assert.equal(report.summary["browser-surface"].complete, 11);
	});
});
