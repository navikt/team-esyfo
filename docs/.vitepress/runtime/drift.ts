import { isCurrentLifecycle, isExpectedLifecycleAt } from "./lifecycle.ts";
import type {
	AppId,
	CoverageEvidenceSnapshot,
	CoverageProfile,
	EvidenceState,
	IsoDate,
	IsoDateTime,
	ObservedRuntimeResource,
	ObservedRuntimeSnapshot,
	ResourceId,
	RuntimeIdentity,
	RuntimeInventory,
	SignalEvidence,
	SignalKind,
} from "./model.ts";
import { runtimeKey } from "./validation.ts";

export interface IdentityMismatch {
	resourceId: ResourceId;
	expected: RuntimeIdentity;
	observed: RuntimeIdentity;
}

export interface UnexpectedRuntime extends RuntimeIdentity {
	kind: "application" | "job";
}

export interface RuntimeObservationAge extends UnexpectedRuntime {
	observedAt: IsoDateTime;
	ageMinutes: number;
}

export interface RuntimeDriftReport {
	status: "ok" | "drift" | "unknown";
	observedAt: IsoDateTime;
	source: string;
	staleSnapshot: boolean;
	futureSnapshot: boolean;
	staleRuntimeObservations: RuntimeObservationAge[];
	futureRuntimeObservations: RuntimeObservationAge[];
	counts: {
		expectedCurrentApplications: number;
		matchedCurrentApplications: number;
		expectedSunsetApplications: number;
		matchedSunsetApplications: number;
		observedTotalApplications: number;
		observedSunsetApplications: number;
		observedExcludedApplications: number;
		expectedCurrentJobs: number;
		matchedCurrentJobs: number;
		expectedSunsetJobs: number;
		matchedSunsetJobs: number;
		observedTotalJobs: number;
	};
	missingInRuntime: ResourceId[];
	unexpectedInRuntime: UnexpectedRuntime[];
	identityMismatch: IdentityMismatch[];
	pastMigrationTarget: ResourceId[];
	pastRetirementTarget: ResourceId[];
	pastSunset: ResourceId[];
	retiredInRuntime: ResourceId[];
	sunsetInRuntime: ResourceId[];
	excludedInRuntime: RuntimeIdentity[];
}

export interface DriftOptions {
	now?: IsoDateTime;
	staleAfterMinutes?: number;
}

const sameNameCandidate = (
	expected: RuntimeIdentity,
	observed: ObservedRuntimeResource[],
) => observed.find((item) => item.name === expected.name);

const exclusionMatches = (
	observed: RuntimeIdentity,
	exclusion: RuntimeInventory["exclusions"][number],
) => {
	const selector = exclusion.selector;
	if (selector.kind === "application") {
		return (
			observed.name === selector.name &&
			observed.namespace === selector.namespace
		);
	}
	if (selector.kind === "namespace")
		return observed.namespace === selector.namespace;
	return false;
};

const minutesBetween = (earlier: string, later: string) =>
	(new Date(later).getTime() - new Date(earlier).getTime()) / 60_000;

export const reconcileRuntime = (
	inventory: RuntimeInventory,
	snapshot: ObservedRuntimeSnapshot,
	options: DriftOptions = {},
): RuntimeDriftReport => {
	const now = options.now ?? (new Date().toISOString() as IsoDateTime);
	const snapshotAgeMinutes = minutesBetween(snapshot.observedAt, now);
	const futureSnapshot =
		Number.isFinite(snapshotAgeMinutes) && snapshotAgeMinutes < -5;
	const staleSnapshot =
		!Number.isFinite(snapshotAgeMinutes) ||
		futureSnapshot ||
		snapshotAgeMinutes > (options.staleAfterMinutes ?? 60);
	const runtimeObservations = [
		...snapshot.applications.map((resource) => ({
			...resource,
			kind: "application" as const,
		})),
		...snapshot.jobs.map((resource) => ({
			...resource,
			kind: "job" as const,
		})),
	];
	const staleAfterMinutes = options.staleAfterMinutes ?? 60;
	const observationAge = (observedAt: IsoDateTime) =>
		minutesBetween(observedAt, now);
	const snapshotSkew = (observedAt: IsoDateTime) =>
		minutesBetween(observedAt, snapshot.observedAt);
	const futureRuntimeObservations: RuntimeObservationAge[] = runtimeObservations
		.filter(
			({ observedAt }) =>
				observationAge(observedAt) < -5 || snapshotSkew(observedAt) < -5,
		)
		.map(({ cluster, namespace, name, observedAt, kind }) => ({
			kind,
			cluster,
			namespace,
			name,
			observedAt,
			ageMinutes: observationAge(observedAt),
		}));
	const futureObservationKeys = new Set(
		futureRuntimeObservations.map(
			({ kind, cluster, namespace, name }) =>
				`${kind}:${cluster}:${namespace}:${name}`,
		),
	);
	const staleRuntimeObservations: RuntimeObservationAge[] = runtimeObservations
		.filter(
			({ kind, cluster, namespace, name, observedAt }) =>
				!futureObservationKeys.has(`${kind}:${cluster}:${namespace}:${name}`) &&
				(!Number.isFinite(observationAge(observedAt)) ||
					observationAge(observedAt) > staleAfterMinutes ||
					snapshotSkew(observedAt) > 5),
		)
		.map(({ cluster, namespace, name, observedAt, kind }) => ({
			kind,
			cluster,
			namespace,
			name,
			observedAt,
			ageMinutes: observationAge(observedAt),
		}));
	const asOfDate = now.slice(0, 10) as IsoDate;
	const currentApps = inventory.applications.filter((app) =>
		isCurrentLifecycle(app.lifecycle),
	);
	const currentJobs = inventory.jobs.filter((job) =>
		isCurrentLifecycle(job.lifecycle),
	);
	const expectedSunsetApps = inventory.applications.filter(
		(app) =>
			!isCurrentLifecycle(app.lifecycle) &&
			isExpectedLifecycleAt(app.lifecycle, asOfDate),
	);
	const expectedSunsetJobs = inventory.jobs.filter(
		(job) =>
			!isCurrentLifecycle(job.lifecycle) &&
			isExpectedLifecycleAt(job.lifecycle, asOfDate),
	);
	const knownResources = [...inventory.applications, ...inventory.jobs];
	const expectedApps = [...currentApps, ...expectedSunsetApps];
	const expectedJobs = [...currentJobs, ...expectedSunsetJobs];
	const observedAppKeys = new Set(snapshot.applications.map(runtimeKey));
	const observedJobKeys = new Set(snapshot.jobs.map(runtimeKey));
	const knownAppKeys = new Set(
		inventory.applications.map(({ runtime }) => runtimeKey(runtime)),
	);
	const knownJobKeys = new Set(
		inventory.jobs.map(({ runtime }) => runtimeKey(runtime)),
	);
	const matchedMismatchAppKeys = new Set<string>();
	const matchedMismatchJobKeys = new Set<string>();
	const missingInRuntime: ResourceId[] = [];
	const identityMismatch: IdentityMismatch[] = [];

	for (const expected of expectedApps) {
		if (observedAppKeys.has(runtimeKey(expected.runtime))) continue;
		const candidate = sameNameCandidate(
			expected.runtime,
			snapshot.applications,
		);
		if (candidate) {
			identityMismatch.push({
				resourceId: expected.id,
				expected: expected.runtime,
				observed: candidate,
			});
			matchedMismatchAppKeys.add(runtimeKey(candidate));
		} else {
			missingInRuntime.push(expected.id);
		}
	}
	for (const expected of expectedJobs) {
		if (observedJobKeys.has(runtimeKey(expected.runtime))) continue;
		const pool = snapshot.jobs;
		const candidate = sameNameCandidate(expected.runtime, pool);
		if (candidate) {
			identityMismatch.push({
				resourceId: expected.id,
				expected: expected.runtime,
				observed: candidate,
			});
			matchedMismatchJobKeys.add(runtimeKey(candidate));
		} else {
			missingInRuntime.push(expected.id);
		}
	}

	const excludedInRuntime = snapshot.applications
		.filter((observed) =>
			inventory.exclusions.some((exclusion) =>
				exclusionMatches(observed, exclusion),
			),
		)
		.map(({ cluster, namespace, name }) => ({ cluster, namespace, name }));
	const excludedKeys = new Set(excludedInRuntime.map(runtimeKey));
	const unexpectedInRuntime: UnexpectedRuntime[] = [
		...snapshot.applications
			.filter((observed) => !knownAppKeys.has(runtimeKey(observed)))
			.filter((observed) => !excludedKeys.has(runtimeKey(observed)))
			.filter((observed) => !matchedMismatchAppKeys.has(runtimeKey(observed)))
			.map(({ cluster, namespace, name }) => ({
				kind: "application" as const,
				cluster,
				namespace,
				name,
			})),
		...snapshot.jobs
			.filter((observed) => !knownJobKeys.has(runtimeKey(observed)))
			.filter((observed) => !matchedMismatchJobKeys.has(runtimeKey(observed)))
			.map(({ cluster, namespace, name }) => ({
				kind: "job" as const,
				cluster,
				namespace,
				name,
			})),
	];

	const observedResourceIds = new Map(
		knownResources
			.filter(({ kind, runtime }) =>
				kind === "application"
					? observedAppKeys.has(runtimeKey(runtime))
					: observedJobKeys.has(runtimeKey(runtime)),
			)
			.map(({ id, runtime }) => [id, runtime]),
	);
	const pastMigrationTarget = knownResources
		.filter(
			(resource) =>
				resource.lifecycle.state === "migrating" &&
				resource.lifecycle.targetDate !== undefined &&
				resource.lifecycle.targetDate < asOfDate,
		)
		.map(({ id }) => id);
	const pastRetirementTarget = knownResources
		.filter(
			(resource) =>
				resource.lifecycle.state === "retiring" &&
				resource.lifecycle.targetDate !== undefined &&
				resource.lifecycle.targetDate < asOfDate,
		)
		.map(({ id }) => id);
	const pastSunset = knownResources
		.filter(
			(resource) =>
				resource.lifecycle.state === "sunset" &&
				resource.lifecycle.sunsetOn < asOfDate &&
				observedResourceIds.has(resource.id),
		)
		.map(({ id }) => id);
	const retiredInRuntime = knownResources
		.filter(
			(resource) =>
				resource.lifecycle.state === "retired" &&
				resource.lifecycle.retiredOn <= asOfDate &&
				observedResourceIds.has(resource.id),
		)
		.map(({ id }) => id);
	const sunsetInRuntime = knownResources
		.filter(
			(resource) =>
				((resource.lifecycle.state === "sunset" &&
					resource.lifecycle.sunsetOn >= asOfDate) ||
					(resource.lifecycle.state === "retired" &&
						resource.lifecycle.retiredOn > asOfDate)) &&
				observedResourceIds.has(resource.id),
		)
		.map(({ id }) => id);

	const hasDrift =
		missingInRuntime.length > 0 ||
		unexpectedInRuntime.length > 0 ||
		identityMismatch.length > 0 ||
		pastMigrationTarget.length > 0 ||
		pastRetirementTarget.length > 0 ||
		pastSunset.length > 0 ||
		retiredInRuntime.length > 0;

	return {
		status:
			staleSnapshot ||
			staleRuntimeObservations.length > 0 ||
			futureRuntimeObservations.length > 0
				? "unknown"
				: hasDrift
					? "drift"
					: "ok",
		observedAt: snapshot.observedAt,
		source: snapshot.source,
		staleSnapshot,
		futureSnapshot,
		staleRuntimeObservations,
		futureRuntimeObservations,
		counts: {
			expectedCurrentApplications: currentApps.length,
			matchedCurrentApplications: currentApps.filter(({ runtime }) =>
				observedAppKeys.has(runtimeKey(runtime)),
			).length,
			expectedSunsetApplications: expectedSunsetApps.length,
			matchedSunsetApplications: expectedSunsetApps.filter(({ runtime }) =>
				observedAppKeys.has(runtimeKey(runtime)),
			).length,
			observedTotalApplications: snapshot.applications.length,
			observedSunsetApplications: sunsetInRuntime.length,
			observedExcludedApplications: excludedInRuntime.length,
			expectedCurrentJobs: currentJobs.length,
			matchedCurrentJobs: currentJobs.filter(({ runtime }) =>
				observedJobKeys.has(runtimeKey(runtime)),
			).length,
			expectedSunsetJobs: expectedSunsetJobs.length,
			matchedSunsetJobs: expectedSunsetJobs.filter(({ runtime }) =>
				observedJobKeys.has(runtimeKey(runtime)),
			).length,
			observedTotalJobs: snapshot.jobs.length,
		},
		missingInRuntime,
		unexpectedInRuntime,
		identityMismatch,
		pastMigrationTarget,
		pastRetirementTarget,
		pastSunset,
		retiredInRuntime,
		sunsetInRuntime,
		excludedInRuntime,
	};
};

export type CoverageState =
	| "complete"
	| "partial"
	| "missing"
	| "unknown"
	| "not-required";

export interface CoverageEvaluation {
	state: CoverageState;
	requiredSignals: SignalKind[];
	freshSignals: SignalKind[];
	missingSignals: SignalKind[];
	unknownSignals: SignalKind[];
}

const effectiveEvidenceState = (
	evidence: SignalEvidence,
	profile: CoverageProfile,
	now: IsoDateTime,
): EvidenceState => {
	if (evidence.state !== "fresh") return evidence.state;
	if (evidence.signal === "release-identity") {
		if (
			!evidence.revision ||
			!validCommitSha(evidence.revision.sourceCommitSha) ||
			!validCommitSha(evidence.revision.deployedCommitSha) ||
			evidence.revision.sourceCommitSha !== evidence.revision.deployedCommitSha
		) {
			return "error";
		}
	}
	const observedAge = minutesBetween(evidence.observedAt, now);
	if (!Number.isFinite(observedAge) || observedAge < -5) return "error";
	const deadline =
		evidence.freshUntil ??
		(new Date(
			new Date(evidence.observedAt).getTime() +
				profile.freshnessMinutes * 60_000,
		).toISOString() as IsoDateTime);
	if (!Number.isFinite(new Date(deadline).getTime())) return "error";
	return new Date(deadline).getTime() >= new Date(now).getTime()
		? "fresh"
		: "stale";
};

export const evaluateCoverage = (
	resourceId: SignalEvidence["resourceId"],
	profile: CoverageProfile,
	evidence: SignalEvidence[],
	now: IsoDateTime,
): CoverageEvaluation => {
	if (profile.requiredSignals.length === 0) {
		return {
			state: "not-required",
			requiredSignals: [],
			freshSignals: [],
			missingSignals: [],
			unknownSignals: [],
		};
	}
	const evidenceBySignal = new Map<SignalKind, SignalEvidence[]>();
	for (const item of evidence.filter(
		(item) => item.resourceId === resourceId,
	)) {
		const items = evidenceBySignal.get(item.signal) ?? [];
		items.push(item);
		evidenceBySignal.set(item.signal, items);
	}
	const freshSignals: SignalKind[] = [];
	const missingSignals: SignalKind[] = [];
	const unknownSignals: SignalKind[] = [];
	for (const signal of profile.requiredSignals) {
		const items = evidenceBySignal.get(signal) ?? [];
		if (items.length === 0) {
			missingSignals.push(signal);
			continue;
		}
		const states = items.map((item) =>
			effectiveEvidenceState(item, profile, now),
		);
		if (states.some((state) => state === "error" || state === "stale")) {
			unknownSignals.push(signal);
		} else if (
			states.some((state) => state === "missing" || state === "not-required")
		) {
			missingSignals.push(signal);
		} else {
			freshSignals.push(signal);
		}
	}
	const state: CoverageState =
		unknownSignals.length > 0
			? "unknown"
			: missingSignals.length === 0
				? "complete"
				: freshSignals.length === 0
					? "missing"
					: "partial";
	return {
		state,
		requiredSignals: [...profile.requiredSignals],
		freshSignals,
		missingSignals,
		unknownSignals,
	};
};

export interface ResourceCoverageReport extends CoverageEvaluation {
	resourceId: SignalEvidence["resourceId"];
	resourceKind: "application" | "job" | "topic" | "browser-surface";
	profileId: CoverageProfile["id"];
	contractGaps: Array<BrowserContractGap | "pipeline-contract">;
}

type BrowserContractGap = "browser-contract" | "browser-production-canary";

const validCommitSha = (value: string) => /^[0-9a-f]{40}$/i.test(value);

const passedProductionCanarySha = (
	surface: RuntimeInventory["browserSurfaces"][number],
) => {
	const implementation = surface.currentImplementation;
	const check = implementation.lastSyntheticCheck;
	const deployedRevision = implementation.deployedRevision;
	if (
		!check ||
		check.environment !== "prod" ||
		check.result !== "passed" ||
		implementation.privacy.canaryVerification !== "verified" ||
		deployedRevision.status !== "verified" ||
		check.deployedCommitSha !== deployedRevision.commitSha
	) {
		return undefined;
	}
	return check.deployedCommitSha;
};

const browserContractGaps = (
	surface: RuntimeInventory["browserSurfaces"][number],
): BrowserContractGap[] => {
	if (surface.privacyContract.status === "gap") return ["browser-contract"];
	return passedProductionCanarySha(surface)
		? []
		: ["browser-production-canary"];
};

const withTopicContract = (
	evaluation: CoverageEvaluation,
	status: RuntimeInventory["topics"][number]["serviceLevel"]["status"],
): CoverageEvaluation => {
	if (status === "approved" || evaluation.state !== "complete")
		return evaluation;
	return {
		...evaluation,
		state: "partial",
	};
};

const withBrowserContract = (
	evaluation: CoverageEvaluation,
	contractGaps: BrowserContractGap[],
): CoverageEvaluation => {
	if (contractGaps.length === 0 || evaluation.state !== "complete")
		return evaluation;
	return {
		...evaluation,
		state: "partial",
	};
};

export interface CoverageReport {
	status: "complete" | "gaps" | "unknown";
	observedAt: IsoDateTime;
	source: string;
	staleSnapshot: boolean;
	futureSnapshot: boolean;
	lifecycleInvalid: SignalEvidence["resourceId"][];
	summary: Record<
		"application" | "job" | "topic" | "browser-surface",
		Record<CoverageState, number>
	>;
	resources: ResourceCoverageReport[];
}

const emptyCoverageCounts = (): Record<CoverageState, number> => ({
	complete: 0,
	partial: 0,
	missing: 0,
	unknown: 0,
	"not-required": 0,
});

export const evaluateCoverageSnapshot = (
	inventory: RuntimeInventory,
	snapshot: CoverageEvidenceSnapshot,
	options: DriftOptions = {},
): CoverageReport => {
	const now = options.now ?? (new Date().toISOString() as IsoDateTime);
	const age = minutesBetween(snapshot.observedAt, now);
	const futureSnapshot = Number.isFinite(age) && age < -5;
	const staleSnapshot =
		!Number.isFinite(age) ||
		futureSnapshot ||
		age > (options.staleAfterMinutes ?? 60);
	const asOfDate = now.slice(0, 10);
	const allResources = [
		...inventory.applications,
		...inventory.jobs,
		...inventory.topics,
		...inventory.browserSurfaces,
	];
	const lifecycleInvalid = allResources
		.filter(
			(resource) =>
				(resource.lifecycle.state === "migrating" &&
					resource.lifecycle.targetDate !== undefined &&
					resource.lifecycle.targetDate < asOfDate) ||
				(resource.lifecycle.state === "retiring" &&
					resource.lifecycle.targetDate !== undefined &&
					resource.lifecycle.targetDate < asOfDate) ||
				(resource.lifecycle.state === "sunset" &&
					resource.lifecycle.sunsetOn < asOfDate),
		)
		.map(({ id }) => id);
	const resources = allResources.filter(
		(resource) =>
			resource.lifecycle.state === "active" ||
			resource.lifecycle.state === "migrating" ||
			resource.lifecycle.state === "retiring" ||
			(resource.lifecycle.state === "sunset" &&
				resource.lifecycle.sunsetOn >= asOfDate),
	);
	const profileById = new Map(
		inventory.coverageProfiles.map((profile) => [profile.id, profile]),
	);
	const reports: ResourceCoverageReport[] = resources.map((resource) => {
		const baseProfile = profileById.get(resource.coverageProfile);
		if (!baseProfile)
			throw new Error(`Ukjent dekningsprofil ${resource.coverageProfile}.`);
		const approvedTopicDeadline =
			resource.kind === "topic" && resource.serviceLevel.status === "approved"
				? resource.serviceLevel.processingDeadlineMinutes
				: undefined;
		const requiredSignals = [...baseProfile.requiredSignals];
		if (
			resource.kind === "topic" &&
			resource.serviceLevel.status === "approved" &&
			resource.serviceLevel.consumerLag === "required" &&
			!requiredSignals.includes("consumer-lag")
		) {
			requiredSignals.push("consumer-lag");
		}
		const effectiveProfile: CoverageProfile = {
			...baseProfile,
			requiredSignals,
			freshnessMinutes:
				approvedTopicDeadline !== undefined
					? approvedTopicDeadline
					: resource.kind === "job"
						? resource.schedule.lateAfterMinutes
						: baseProfile.freshnessMinutes,
		};
		const productionCanarySha =
			resource.kind === "browser-surface" &&
			resource.privacyContract.status === "implemented"
				? passedProductionCanarySha(resource)
				: undefined;
		const resourceEvidence = snapshot.evidence.map((item) => {
			if (item.resourceId !== resource.id || item.state !== "fresh")
				return item;
			if (
				resource.kind === "topic" &&
				approvedTopicDeadline !== undefined &&
				item.signal === "pipeline-progress" &&
				resource.serviceLevel.zeroTrafficAllowed === false
			) {
				if (!item.lastSeenAt) return { ...item, state: "missing" as const };
				const progressAge = minutesBetween(item.lastSeenAt, now);
				if (!Number.isFinite(progressAge) || progressAge < -5)
					return { ...item, state: "error" as const };
				if (progressAge > approvedTopicDeadline)
					return { ...item, state: "stale" as const };
			}
			if (
				resource.kind === "browser-surface" &&
				item.signal === "release-identity" &&
				item.revision
			) {
				const sourceRevision = resource.currentImplementation.sourceRevision;
				const deployedRevision =
					resource.currentImplementation.deployedRevision;
				if (
					(sourceRevision.status === "verified" &&
						item.revision.sourceCommitSha !== sourceRevision.commitSha) ||
					(deployedRevision.status === "verified" &&
						item.revision.deployedCommitSha !== deployedRevision.commitSha)
				) {
					return { ...item, state: "error" as const };
				}
			}
			if (
				resource.kind === "browser-surface" &&
				item.signal === "privacy-canary" &&
				productionCanarySha &&
				(!item.revision ||
					!validCommitSha(item.revision.deployedCommitSha) ||
					item.revision.deployedCommitSha !== productionCanarySha)
			) {
				return { ...item, state: "error" as const };
			}
			return item;
		});
		const evaluation = evaluateCoverage(
			resource.id,
			effectiveProfile,
			resourceEvidence,
			now,
		);
		const contractGaps =
			resource.kind === "topic" && resource.serviceLevel.status === "proposed"
				? (["pipeline-contract"] as const)
				: resource.kind === "browser-surface"
					? browserContractGaps(resource)
					: [];
		return {
			resourceId: resource.id,
			resourceKind: resource.kind,
			profileId: baseProfile.id,
			contractGaps: [...contractGaps],
			...(resource.kind === "topic"
				? withTopicContract(evaluation, resource.serviceLevel.status)
				: resource.kind === "browser-surface"
					? withBrowserContract(evaluation, browserContractGaps(resource))
					: evaluation),
		};
	});
	const summary: CoverageReport["summary"] = {
		application: emptyCoverageCounts(),
		job: emptyCoverageCounts(),
		topic: emptyCoverageCounts(),
		"browser-surface": emptyCoverageCounts(),
	};
	for (const report of reports) summary[report.resourceKind][report.state] += 1;
	const status: CoverageReport["status"] =
		staleSnapshot ||
		lifecycleInvalid.length > 0 ||
		reports.some(({ state }) => state === "unknown")
			? "unknown"
			: reports.some(({ state }) => state === "missing" || state === "partial")
				? "gaps"
				: "complete";
	return {
		status,
		observedAt: snapshot.observedAt,
		source: snapshot.source,
		staleSnapshot,
		futureSnapshot,
		lifecycleInvalid,
		summary,
		resources: reports,
	};
};

export const runtimeIdentityForApp = (
	inventory: RuntimeInventory,
	appId: AppId,
): RuntimeIdentity | undefined =>
	inventory.applications.find(({ id }) => id === appId)?.runtime;
