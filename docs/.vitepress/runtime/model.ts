import type { AreaId } from "../areas.ts";

export type IsoDate = `${number}-${number}-${number}`;
export type IsoDateTime = `${number}-${number}-${number}T${string}Z`;
export type Repository = `navikt/${string}`;
export type ResourceId = `app:${string}` | `job:${string}`;
export type AppId = `app:${string}`;
export type JobId = `job:${string}`;
export type TopicId = `topic:${string}`;
export type BrowserSurfaceId = `browser:${string}`;
export type JourneyId = `journey:${string}`;
export type PipelineId = `pipeline:${string}`;
export type IssueRef = `navikt/${string}#${number}`;

export type Lifecycle =
	| { state: "active" }
	| {
			state: "migrating";
			targetRefs: ResourceId[];
			targetDate: IsoDate;
			decision: string;
			minimumCoverage: "legacy-http" | "legacy-worker";
	  }
	| {
			state: "retiring";
			candidateReplacementRefs: ResourceId[];
			consumerRefs: ResourceId[];
			targetDate?: IsoDate;
			reason: string;
			decision: string;
			minimumCoverage: CoverageProfileId;
	  }
	| {
			state: "sunset";
			sunsetOn: IsoDate;
			replacementRefs: ResourceId[];
			reason: string;
			decision: string;
	  }
	| {
			state: "retired";
			retiredOn: IsoDate;
			reason: string;
	  };

export type Criticality = "critical" | "high" | "standard" | "support";

export type CoverageProfileId =
	| "critical-http"
	| "standard-http"
	| "frontend-server"
	| "internal-http"
	| "async-worker"
	| "scheduled-job"
	| "kafka-pipeline"
	| "browser-public"
	| "browser-embedded"
	| "browser-internal-sensitive"
	| "legacy-http"
	| "legacy-worker"
	| "infrastructure";

export type SignalKind =
	| "runtime-presence"
	| "availability"
	| "http-errors"
	| "latency"
	| "saturation"
	| "restarts"
	| "logs"
	| "traces"
	| "job-success"
	| "job-duration"
	| "topic-throughput"
	| "topic-errors"
	| "consumer-lag"
	| "pipeline-progress"
	| "oldest-pending"
	| "permanent-failures"
	| "browser-errors"
	| "browser-performance"
	| "browser-identity"
	| "release-identity"
	| "privacy-canary"
	| "sourcemaps";

export interface CoverageProfile {
	id: CoverageProfileId;
	description: string;
	resourceKinds: Array<"application" | "job" | "topic" | "browser-surface">;
	requiredSignals: SignalKind[];
	freshnessMinutes: number;
}

export type TrackedLink =
	| { status: "linked"; href: string; label: string }
	| { status: "missing"; issue: IssueRef }
	| { status: "not-required"; reason: string };

export type RuntimeApm =
	| {
			status: "linked";
			serviceNamespace: string;
			serviceName: string;
			href: string;
			verifiedAt: IsoDateTime;
			evidence: string;
	  }
	| {
			status: "unverified";
			serviceNamespace: string;
			serviceName: string;
			issue: IssueRef;
	  }
	| { status: "not-required"; reason: string };

export interface RuntimeIdentity {
	cluster: "prod-gcp" | "prod-fss";
	namespace: string;
	name: string;
}

export interface OperationalContext {
	areaRefs: AreaId[];
	journeyRefs: JourneyId[];
	pipelineRefs: PipelineId[];
}

export interface Application {
	kind: "application";
	id: AppId;
	displayName: string;
	ownerTeam: "team-esyfo";
	repository: Repository;
	sourcePath?: string;
	runtime: RuntimeIdentity;
	role:
		| "backend-api"
		| "frontend-server"
		| "microfrontend-server"
		| "worker"
		| "internal-tool"
		| "infrastructure";
	criticality: Criticality;
	lifecycle: Lifecycle;
	context: OperationalContext;
	coverageProfile: CoverageProfileId;
	runtimeApm: RuntimeApm;
	runbook: TrackedLink;
}

export interface Job {
	kind: "job";
	id: JobId;
	displayName: string;
	ownerTeam: "team-esyfo";
	repository: Repository;
	runtime: RuntimeIdentity;
	criticality: Criticality;
	lifecycle: Lifecycle;
	context: OperationalContext;
	coverageProfile: "scheduled-job" | "legacy-worker";
	schedule: {
		type: "cron";
		expression: string;
		timezone: "Europe/Oslo";
		lateAfterMinutes: number;
	};
	runtimeApm: RuntimeApm;
	runbook: TrackedLink;
}

export interface ExternalRelation {
	name: string;
	owner?: string;
	verification: "runtime-code" | "manifest-acl" | "documentation" | "unknown";
	evidence: string;
}

export interface Topic {
	kind: "topic";
	id: TopicId;
	displayName: string;
	ownerTeam: "team-esyfo";
	repository: Repository;
	sourcePath: string;
	cluster: "nav-prod";
	name: `team-esyfo.${string}`;
	criticality: Criticality;
	lifecycle: Lifecycle;
	context: OperationalContext & { pipelineRefs: [PipelineId, ...PipelineId[]] };
	coverageProfile: "kafka-pipeline";
	trafficModel: "continuous" | "intermittent" | "scheduled";
	serviceLevel: {
		status: "proposed" | "approved";
		approvalIssue: IssueRef;
		progressMode: "producer-only" | "consumer-only" | "end-to-end";
		processingDeadlineMinutes: number;
		zeroTrafficAllowed: boolean;
		consumerLag: "required" | "external-consumers";
	};
	producers: {
		internal: ResourceId[];
		external: ExternalRelation[];
	};
	consumers: {
		internal: ResourceId[];
		external: ExternalRelation[];
	};
	runbook: TrackedLink;
}

export type RevisionAssessment =
	| {
			status: "verified";
			commitSha: string;
			evidence: string;
	  }
	| {
			status: "unverified";
			refHint?: string;
			issue: IssueRef;
	  };

export interface BrowserAssessmentDetails {
	sourceRevision: RevisionAssessment;
	deployedRevision: RevisionAssessment;
	sampling: "sdk-default" | "missing";
	endToEndTracing: "unverified" | "not-applicable";
	sourcemaps: {
		build: "configured" | "missing";
		productionDeobfuscation: "unverified";
	};
	privacy: {
		routeNormalization: "missing";
		rawUrlSanitization: "missing";
		userContext: "unverified" | "not-applicable";
		consoleCapture: "disabled" | "not-applicable";
		sessionReplay: "unverified" | "not-applicable";
		canaryVerification: "missing";
	};
}

export type BrowserTelemetryAssessment = BrowserAssessmentDetails &
	(
		| {
				state: "configured";
				sdk: "raw-faro" | "nais-apm";
				versionRange: string;
				browserTracing: "configured" | "missing";
				releaseIdentity:
					| "release-id"
					| "environment-only"
					| "requires-runtime-verification";
				assessedAt: IsoDate;
		  }
		| {
				state: "missing";
				sdk: "none";
				browserTracing: "missing";
				releaseIdentity: "missing";
				assessedAt: IsoDate;
		  }
	);

export type PageIdentity =
	| { status: "defined"; pageIds: string[]; verificationIssue: IssueRef }
	| { status: "missing"; issue: IssueRef };

export interface BrowserSurface {
	kind: "browser-surface";
	id: BrowserSurfaceId;
	displayName: string;
	ownerTeam: "team-esyfo";
	runtimeRef: AppId;
	source: { repository: Repository; path?: string };
	framework: {
		family: "next" | "astro" | "tanstack-start";
		router: "pages" | "app" | "astro" | "tanstack-router";
		rendering: "ssr";
	};
	hosting: {
		mode: "standalone" | "embedded" | "internal";
		host?: string;
	};
	criticality: Criticality;
	lifecycle: Lifecycle;
	context: OperationalContext;
	coverageProfile:
		| "browser-public"
		| "browser-embedded"
		| "browser-internal-sensitive";
	telemetryRequirement: "required";
	browserIdentity: {
		serviceNamespace: "team-esyfo";
		serviceName: string;
		verificationIssue: IssueRef;
	};
	currentImplementation: BrowserTelemetryAssessment;
	pageIdentity: PageIdentity;
	privacyContract: {
		status: "gap" | "implemented";
		issue: IssueRef;
	};
	runbook: TrackedLink;
}

export interface Exclusion {
	id: `exclusion:${string}`;
	selector:
		| { kind: "application"; name: string; namespace: string }
		| { kind: "namespace"; namespace: string }
		| { kind: "repository"; repository: Repository }
		| { kind: "platform"; name: string };
	reason: string;
	decision: string;
}

export interface RuntimeInventory {
	schemaVersion: 1;
	baseline: {
		status: "proposed" | "approved";
		capturedOn: IsoDate;
		approvedInIssue: IssueRef;
		approvedOn?: IsoDate;
		ownerTeam: "team-esyfo";
		expected: {
			applications: 26;
			jobs: 1;
			ownedTopics: 10;
			browserSurfaces: 11;
		};
	};
	coverageProfiles: CoverageProfile[];
	journeys: Array<{ id: JourneyId; name: string }>;
	pipelines: Array<{ id: PipelineId; name: string }>;
	applications: Application[];
	jobs: Job[];
	topics: Topic[];
	browserSurfaces: BrowserSurface[];
	exclusions: Exclusion[];
}

export interface ObservedRuntimeResource extends RuntimeIdentity {
	observedAt: IsoDateTime;
	source: string;
}

export interface ObservedRuntimeSnapshot {
	schemaVersion: 1;
	observedAt: IsoDateTime;
	source: string;
	applications: ObservedRuntimeResource[];
	jobs: ObservedRuntimeResource[];
}

export type EvidenceState =
	| "fresh"
	| "stale"
	| "missing"
	| "error"
	| "not-required";

export interface SignalEvidence {
	resourceId: AppId | JobId | TopicId | BrowserSurfaceId;
	signal: SignalKind;
	state: EvidenceState;
	observedAt: IsoDateTime;
	lastSeenAt?: IsoDateTime;
	freshUntil?: IsoDateTime;
	source: string;
	revision?: {
		sourceCommitSha: string;
		deployedCommitSha: string;
	};
}

export interface CoverageEvidenceSnapshot {
	schemaVersion: 1;
	observedAt: IsoDateTime;
	source: string;
	evidence: SignalEvidence[];
}
