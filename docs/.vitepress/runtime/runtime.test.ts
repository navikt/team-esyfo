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
		...runtimeInventory.applications.map(({ runtime }) => observed(runtime)),
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
		assert.equal(runtimeInventory.schemaVersion, 3);
		const result = validateInventory(runtimeInventory, { asOf: "2026-08-28" });
		assert.deepEqual(result.errors, []);
		assert.deepEqual(result.counts, {
			applications: 26,
			jobs: 1,
			ownedTopics: 10,
			browserSurfaces: 11,
			sunsetApplications: 0,
		});
		assert.deepEqual(
			runtimeInventory.browserSurfaces
				.map(({ id }) => id.replace("browser:", ""))
				.toSorted(),
			[
				"aktivitetskrav-frontend",
				"aktivitetskrav-microfrontend",
				"bro-frontend",
				"dialogmote-frontend",
				"dialogmote-microfrontend",
				"dinesykmeldte",
				"lumi-dashboard",
				"meroppfolging-frontend",
				"meroppfolging-microfrontend",
				"narmesteleder-frontend",
				"syfo-oppfolgingsplan-frontend",
			],
		);
		const browserProfiles = runtimeInventory.coverageProfiles.filter(({ id }) =>
			id.startsWith("browser-"),
		);
		assert.equal(browserProfiles.length, 3);
		for (const profile of browserProfiles) {
			assert.ok(!profile.requiredSignals.includes("traces"));
		}
	});

	test("håndhever den personvernsikre @nais/apm-kontrakten", () => {
		const inventory = cloneInventory();
		const surface = inventory.browserSurfaces.find(
			({ id }) => id === "browser:dinesykmeldte",
		);
		assert.ok(surface);
		const implementation = surface.currentImplementation;
		assert.equal(implementation.state, "configured");
		if (implementation.state !== "configured") return;

		surface.privacyContract.status = "implemented";
		let result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(
			result.errors.some((error) =>
				error.includes("implementert browserkontrakt uten @nais/apm"),
			),
		);
		surface.privacyContract.status = "gap";
		implementation.sdk = "nais-apm";
		implementation.versionRange = "^0.6.0";
		result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(result.errors.some((error) => error.includes("eksakt versjon")));
		assert.ok(result.errors.some((error) => error.includes("samplingrate")));
		assert.ok(result.errors.some((error) => error.includes("page-identitet")));
		assert.ok(result.errors.some((error) => error.includes("tracingvalg")));
		assert.ok(result.errors.some((error) => error.includes("rute- eller URL")));
		assert.ok(result.errors.some((error) => error.includes("error boundary")));
		assert.ok(
			result.errors.some((error) =>
				error.includes("session replay og screenshots"),
			),
		);

		const commitSha = "a".repeat(40);
		implementation.versionRange = "0.6.0";
		implementation.sampling = "explicit";
		implementation.samplingRate = 1;
		implementation.errorBoundary = "configured";
		implementation.browserTracing = "disabled";
		implementation.endToEndTracing = "disabled";
		implementation.releaseIdentity = "release-id";
		implementation.sourceRevision = {
			status: "verified",
			commitSha,
			evidence: "Kilde verifisert i test.",
		};
		implementation.privacy = {
			...implementation.privacy,
			routeNormalization: "configured",
			rawUrlSanitization: "configured",
			userContext: "disabled",
			sessionReplay: "disabled",
			screenshotOnError: "disabled",
			canaryVerification: "missing",
		};
		surface.pageIdentity = {
			status: "defined",
			pageIds: ["dinesykmeldte.start"],
			verificationIssue: "navikt/team-esyfo#206",
		};

		surface.privacyContract.status = "implemented";
		result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.deepEqual(result.errors, []);

		for (const invalidRate of [0, -0.1, 1.01]) {
			implementation.samplingRate = invalidRate;
			result = validateInventory(inventory, { asOf: "2026-08-28" });
			assert.ok(
				result.errors.some((error) => error.includes("ugyldig samplingrate")),
			);
		}
		implementation.samplingRate = 1;
		implementation.sampling = "sdk-default";
		result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.deepEqual(result.errors, []);
		implementation.samplingRate = undefined;
		result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(
			result.errors.some((error) => error.includes("kjent samplingrate")),
		);
		implementation.sampling = "explicit";
		implementation.samplingRate = 1;

		implementation.browserTracing = "configured";
		implementation.endToEndTracing = "disabled";
		result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(result.errors.some((error) => error.includes("tracingvalg")));
		implementation.browserTracing = "disabled";
		implementation.endToEndTracing = "disabled";

		implementation.privacy.canaryVerification = "verified";
		result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(
			result.errors.some((error) => error.includes("uten siste syntetiske")),
		);
		implementation.lastSyntheticCheck = {
			checkedAt: "2026-08-28T12:00:00Z",
			environment: "dev",
			deployedCommitSha: commitSha,
			result: "passed",
			evidence: "Syntetisk test uten rå identifikatorer.",
		};
		result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.deepEqual(result.errors, []);

		implementation.lastSyntheticCheck.checkedAt = "ikke-en-dato" as never;
		result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(
			result.errors.some((error) => error.includes("ugyldig syntetisk")),
		);
		implementation.lastSyntheticCheck.checkedAt = "2026-08-28T12:00:00Z";
		implementation.lastSyntheticCheck.result = "ukjent" as never;
		result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(
			result.errors.some((error) => error.includes("ugyldig syntetisk")),
		);
		implementation.lastSyntheticCheck.result = "passed";
		implementation.lastSyntheticCheck.environment = "annet" as never;
		result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(
			result.errors.some((error) => error.includes("ugyldig syntetisk")),
		);
		implementation.lastSyntheticCheck.environment = "prod";
		implementation.lastSyntheticCheck.deployedCommitSha = "b".repeat(40);
		result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(
			result.errors.some((error) =>
				error.includes("produksjonscanary uten verifisert"),
			),
		);
		implementation.deployedRevision = {
			status: "verified",
			commitSha,
			evidence: "Produksjonsdeploy verifisert i test.",
		};
		result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(
			result.errors.some((error) =>
				error.includes("matcher ikke deployrevisjonen"),
			),
		);
		implementation.lastSyntheticCheck.deployedCommitSha = commitSha;
		result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.deepEqual(result.errors, []);

		implementation.sourceRevision = {
			status: "verified",
			commitSha: "b".repeat(40),
			evidence: "Nyere kilde verifisert i test.",
		};
		result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.deepEqual(result.errors, []);
	});

	test("registrerer de tre legacyressursene som avviklet etter #208-cutover", () => {
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
			assert.equal(resource.lifecycle.state, "retired");
			if (resource.lifecycle.state !== "retired") continue;
			assert.equal(resource.lifecycle.retiredOn, "2026-09-02");
			assert.match(resource.lifecycle.reason, /#208/);
		}

		const varselbus = runtimeInventory.topics.find(
			({ id }) => id === "topic:varselbus",
		);
		assert.ok(varselbus);
		assert.ok(
			!varselbus.producers.internal.includes("app:syfooppfolgingsplanservice"),
		);
	});

	test("bruker bare manifestbekreftede aktive topic-relasjoner", () => {
		const varselbus = runtimeInventory.topics.find(
			({ id }) => id === "topic:varselbus",
		);
		assert.ok(varselbus);
		assert.ok(
			varselbus.producers.internal.includes("app:syfo-oppfolgingsplan-backend"),
		);

		const dinesykmeldte = runtimeInventory.topics.find(
			({ id }) => id === "topic:dinesykmeldte-hendelser-v2",
		);
		assert.ok(dinesykmeldte);
		assert.ok(dinesykmeldte.producers.internal.includes("app:esyfovarsel"));
		assert.ok(dinesykmeldte.producers.internal.includes("app:syfo-budstikka"));
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

	test("har ingen passert sunset etter bekreftet cutover", () => {
		const warning = validateInventory(runtimeInventory, { asOf: "2026-09-01" });
		assert.equal(warning.errors.length, 0);
		assert.equal(warning.warnings.length, 0);
		const strict = validateInventory(runtimeInventory, {
			asOf: "2026-09-01",
			failOnOverdueSunset: true,
		});
		assert.equal(
			strict.errors.filter((error) => error.includes("passerte sunset")).length,
			0,
		);
	});

	test("håndhever migreringsfrist og aktiv målressurs", () => {
		const withoutDate = validateInventory(runtimeInventory, {
			asOf: "2026-12-19",
		});
		assert.equal(
			withoutDate.warnings.filter((message) =>
				message.includes("migreringsmålet"),
			).length,
			0,
		);
		const inventoryWithDate = cloneInventory();
		for (const resource of [
			...inventoryWithDate.applications,
			...inventoryWithDate.jobs,
		]) {
			if (resource.lifecycle.state === "migrating") {
				resource.lifecycle.targetDate = "2026-12-18";
			}
		}
		const warning = validateInventory(inventoryWithDate, {
			asOf: "2026-12-19",
		});
		assert.equal(
			warning.warnings.filter((message) => message.includes("migreringsmålet"))
				.length,
			2,
		);
		const strict = validateInventory(inventoryWithDate, {
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
		const continuous = inventory.topics[0];
		assert.ok(continuous);
		continuous.trafficModel = "continuous";
		continuous.serviceLevel = {
			...continuous.serviceLevel,
			status: "approved",
			processingDeadlineMinutes: 30,
			zeroTrafficAllowed: true,
			consumerLag: "external-consumers",
		};
		const result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(
			result.errors.some((message) =>
				message.includes("tillater nulltrafikk uten ferskt progressbevis"),
			),
		);
	});

	test("holder kildeubeviste topic-frister udefinert", () => {
		for (const topic of runtimeInventory.topics) {
			assert.equal(topic.serviceLevel.status, "proposed");
			assert.equal(topic.serviceLevel.processingDeadlineMinutes, undefined);
			assert.equal(topic.serviceLevel.zeroTrafficAllowed, "unresolved");
			assert.equal(topic.serviceLevel.consumerLag, "unresolved");
		}
		assert.deepEqual(
			runtimeInventory.topics
				.filter(({ trafficModel }) => trafficModel === "scheduled")
				.map(({ id }) => id),
			["topic:sen-oppfolging-varsel"],
		);
		assert.equal(
			runtimeInventory.topics.some(
				({ trafficModel }) => trafficModel === "continuous",
			),
			false,
		);
	});

	test("avviser godkjent topic-kontrakt uten behandlingsfrist", () => {
		const inventory = cloneInventory();
		const topic = inventory.topics[0];
		assert.ok(topic);
		topic.serviceLevel.status = "approved";
		topic.serviceLevel.zeroTrafficAllowed = true;
		topic.serviceLevel.consumerLag = "external-consumers";
		const result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(
			result.errors.some((message) =>
				message.includes("mangler godkjent behandlingsfrist"),
			),
		);
	});

	test("avviser godkjent topic-kontrakt uten nulltrafikkpolicy", () => {
		const inventory = cloneInventory();
		const topic = inventory.topics[0];
		assert.ok(topic);
		topic.serviceLevel = {
			...topic.serviceLevel,
			status: "approved",
			processingDeadlineMinutes: 30,
			consumerLag: "external-consumers",
		};
		const result = validateInventory(inventory, { asOf: "2026-08-28" });
		assert.ok(
			result.errors.some((message) =>
				message.includes("uten avklart nulltrafikkpolicy"),
			),
		);
	});

	test("avviser ikke-endelige og ikke-heltallige behandlingsfrister", () => {
		for (const deadline of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
			const inventory = cloneInventory();
			const topic = inventory.topics[0];
			assert.ok(topic);
			topic.serviceLevel.processingDeadlineMinutes = deadline;
			const result = validateInventory(inventory, { asOf: "2026-08-28" });
			assert.ok(
				result.errors.some((message) =>
					message.includes("ugyldig behandlingsfrist"),
				),
			);
		}
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
	test("godtar aktiv baseline, historisk avviklingsscope og eksplisitt exclusion", () => {
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

	test("avviklet runtime går ut av forventet baseline på retiredOn", () => {
		const snapshot = baselineSnapshot();
		snapshot.applications = snapshot.applications.filter(
			({ name }) => !name.startsWith("syfooppfolgingsplanservice"),
		);
		const beforeRetirement = reconcileRuntime(runtimeInventory, snapshot, {
			now: "2026-08-28T10:30:00Z",
		});
		assert.equal(beforeRetirement.status, "drift");
		assert.equal(
			beforeRetirement.missingInRuntime.filter((id) =>
				id.startsWith("app:syfooppfolgingsplanservice"),
			).length,
			3,
		);

		const afterRetirement = reconcileRuntime(runtimeInventory, snapshot, {
			now: "2026-09-02T10:30:00Z",
			staleAfterMinutes: 10_000,
		});
		assert.equal(afterRetirement.status, "ok");
		assert.equal(
			afterRetirement.missingInRuntime.filter((id) =>
				id.startsWith("app:syfooppfolgingsplanservice"),
			).length,
			0,
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

	test("observerte avviklede ressurser blir drift", () => {
		const snapshot = baselineSnapshot();
		const report = reconcileRuntime(runtimeInventory, snapshot, {
			now: "2026-09-02T10:00:00Z",
			staleAfterMinutes: 10_000,
		});
		assert.equal(report.status, "drift");
		assert.equal(report.retiredInRuntime.length, 3);
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
		const inventory = cloneInventory();
		const topic = inventory.topics.find(
			({ id }) => id === "topic:syfo-narmesteleder-leesah",
		);
		assert.ok(topic);
		topic.trafficModel = "continuous";
		topic.serviceLevel = {
			...topic.serviceLevel,
			status: "approved",
			processingDeadlineMinutes: 15,
			zeroTrafficAllowed: false,
			consumerLag: "required",
		};
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
			inventory,
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

	test("foreslått topic-kontrakt kan aldri gi komplett dekning", () => {
		const topic = runtimeInventory.topics.find(
			({ id }) => id === "topic:budstikka.v1",
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
		assert.deepEqual(topicReport.contractGaps, ["pipeline-contract"]);
		assert.ok(!topicReport.requiredSignals.includes("consumer-lag"));
	});

	test("browsergap kan aldri bli skjult av ferske live-signaler", () => {
		const surface = runtimeInventory.browserSurfaces.find(
			({ id }) => id === "browser:dinesykmeldte",
		);
		assert.ok(surface);
		const browserProfile = runtimeInventory.coverageProfiles.find(
			({ id }) => id === surface.coverageProfile,
		);
		assert.ok(browserProfile);
		const evidence = browserProfile.requiredSignals.map(
			(signal) =>
				({
					resourceId: surface.id,
					signal,
					state: "fresh",
					observedAt,
					revision:
						signal === "release-identity"
							? {
									sourceCommitSha: "a".repeat(40),
									deployedCommitSha: "a".repeat(40),
								}
							: undefined,
					source: "test",
				}) satisfies SignalEvidence,
		);
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
		const surfaceReport = report.resources.find(
			({ resourceId }) => resourceId === surface.id,
		);
		assert.ok(surfaceReport);
		assert.equal(surfaceReport.state, "partial");
		assert.deepEqual(surfaceReport.contractGaps, ["browser-contract"]);
	});

	test("browserdekning krever en revisjonskoblet produksjonscanary", () => {
		const inventory = cloneInventory();
		const surface = inventory.browserSurfaces.find(
			({ id }) => id === "browser:dinesykmeldte",
		);
		assert.ok(surface);
		const implementation = surface.currentImplementation;
		assert.equal(implementation.state, "configured");
		if (implementation.state !== "configured") return;
		const commitSha = "a".repeat(40);
		implementation.sdk = "nais-apm";
		implementation.versionRange = "0.6.0";
		implementation.sampling = "explicit";
		implementation.samplingRate = 1;
		implementation.errorBoundary = "configured";
		implementation.browserTracing = "disabled";
		implementation.endToEndTracing = "disabled";
		implementation.releaseIdentity = "release-id";
		implementation.sourceRevision = {
			status: "verified",
			commitSha,
			evidence: "Kilde verifisert i test.",
		};
		implementation.privacy = {
			...implementation.privacy,
			routeNormalization: "configured",
			rawUrlSanitization: "configured",
			userContext: "disabled",
			sessionReplay: "disabled",
			screenshotOnError: "disabled",
			canaryVerification: "missing",
		};
		surface.pageIdentity = {
			status: "defined",
			pageIds: ["dinesykmeldte.start"],
			verificationIssue: "navikt/team-esyfo#206",
		};
		surface.privacyContract.status = "implemented";

		const browserProfile = inventory.coverageProfiles.find(
			({ id }) => id === surface.coverageProfile,
		);
		assert.ok(browserProfile);
		const evidence = browserProfile.requiredSignals.map(
			(signal) =>
				({
					resourceId: surface.id,
					signal,
					state: "fresh",
					observedAt,
					revision:
						signal === "release-identity" || signal === "privacy-canary"
							? {
									sourceCommitSha: commitSha,
									deployedCommitSha: commitSha,
								}
							: undefined,
					source: "test",
				}) satisfies SignalEvidence,
		);
		const evaluateSurface = () => {
			const report = evaluateCoverageSnapshot(
				inventory,
				{
					schemaVersion: 1,
					observedAt,
					source: "test",
					evidence,
				},
				{ now: "2026-08-28T10:05:00Z" },
			);
			const surfaceReport = report.resources.find(
				({ resourceId }) => resourceId === surface.id,
			);
			assert.ok(surfaceReport);
			return surfaceReport;
		};

		let surfaceReport = evaluateSurface();
		assert.equal(surfaceReport.state, "partial");
		assert.deepEqual(surfaceReport.contractGaps, ["browser-production-canary"]);

		implementation.privacy.canaryVerification = "verified";
		implementation.lastSyntheticCheck = {
			checkedAt: observedAt,
			environment: "dev",
			deployedCommitSha: commitSha,
			result: "passed",
			evidence: "Dev-canary verifisert i test.",
		};
		surfaceReport = evaluateSurface();
		assert.equal(surfaceReport.state, "partial");
		assert.deepEqual(surfaceReport.contractGaps, ["browser-production-canary"]);

		implementation.deployedRevision = {
			status: "verified",
			commitSha,
			evidence: "Produksjonsdeploy verifisert i test.",
		};
		implementation.lastSyntheticCheck.environment = "prod";
		const canaryEvidence = evidence.find(
			({ signal }) => signal === "privacy-canary",
		);
		assert.ok(canaryEvidence?.revision);
		const matchingCanaryRevision = canaryEvidence.revision;
		canaryEvidence.revision = undefined;
		surfaceReport = evaluateSurface();
		assert.equal(surfaceReport.state, "unknown");
		assert.deepEqual(surfaceReport.unknownSignals, ["privacy-canary"]);

		canaryEvidence.revision = matchingCanaryRevision;
		surfaceReport = evaluateSurface();
		assert.equal(surfaceReport.state, "complete");
		assert.deepEqual(surfaceReport.contractGaps, []);

		canaryEvidence.revision.deployedCommitSha = "b".repeat(40);
		surfaceReport = evaluateSurface();
		assert.equal(surfaceReport.state, "unknown");
		assert.deepEqual(surfaceReport.unknownSignals, ["privacy-canary"]);
	});

	test("lager en typespesifikk maskinell dekningsrapport", () => {
		const inventory = cloneInventory();
		for (const topic of inventory.topics) {
			topic.serviceLevel = {
				...topic.serviceLevel,
				status: "approved",
				processingDeadlineMinutes: 30,
				zeroTrafficAllowed: true,
				consumerLag:
					topic.consumers.internal.length > 0
						? "required"
						: "external-consumers",
			};
		}
		const resources = [
			...inventory.applications,
			...inventory.jobs,
			...inventory.topics,
			...inventory.browserSurfaces,
		].filter(
			(resource) =>
				resource.lifecycle.state === "active" ||
				resource.lifecycle.state === "migrating" ||
				resource.lifecycle.state === "retiring" ||
				resource.lifecycle.state === "sunset",
		);
		const evidence: SignalEvidence[] = resources.flatMap((resource) => {
			const resourceProfile = inventory.coverageProfiles.find(
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
			inventory,
			{
				schemaVersion: 1,
				observedAt,
				source: "test",
				evidence,
			},
			{ now: "2026-08-28T10:05:00Z" },
		);
		assert.equal(report.status, "gaps");
		assert.equal(report.summary.application.complete, 26);
		assert.equal(report.summary.job.complete, 1);
		assert.equal(report.summary.topic.complete, 10);
		assert.equal(report.summary["browser-surface"].complete, 0);
		assert.equal(report.summary["browser-surface"].partial, 11);
	});
});
