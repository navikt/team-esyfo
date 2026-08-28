import type {
	IsoDate,
	IsoDateTime,
	IssueRef,
	JourneyId,
	PipelineId,
	Repository,
	ResourceId,
	TopicId,
	TrackedLink,
} from "../runtime/model.ts";

export type AlertEnvironment = "dev-gcp" | "prod-gcp" | "prod-fss";
export type AlertEngine = "prometheus-rule" | "grafana-managed";
export type AlertTargetId = ResourceId | TopicId;
export type AlertSeverity = "critical" | "warning" | "info" | "unclassified";
export type AlertSemantic =
	| "availability"
	| "consumer-lag"
	| "definition-conflict"
	| "http-4xx-ratio"
	| "http-5xx-ratio"
	| "job-failure"
	| "log-error-ratio"
	| "migration-reconciliation"
	| "outbox-expired-claims"
	| "outbox-oldest-age"
	| "outbox-persistent-failures"
	| "permanent-delivery-failure"
	| "raw-consumer-offset"
	| "retention-failure"
	| "retention-freshness"
	| "runtime-errors"
	| "submission-failure"
	| "submission-rejection";

export type AlertLifecycle =
	| { state: "permanent" }
	| {
			state: "migrating";
			targetDate: IsoDate;
			targetRefs: AlertTargetId[];
			issue: IssueRef;
	  }
	| {
			state: "retiring";
			reason: string;
			issue: IssueRef;
	  }
	| {
			state: "sunset";
			sunsetOn: IsoDate;
			issue: IssueRef;
	  };

export type AlertSourceAutomationFinding =
	| {
			kind: "path-filter-mismatch";
			workflowHref: string;
			watchedPath: string;
			resourcePath: string;
	  }
	| {
			kind: "resource-not-referenced";
			workflowHref: string;
			resourcePath: string;
	  };

export type AlertSource =
	| {
			kind: "repository";
			evidenceKind: "default-branch-snapshot";
			id: `source:${string}`;
			repository: Repository;
			path: string;
			commitSha: string;
			href: string;
			capturedAt: IsoDateTime;
			deliveryAutomationFinding?: AlertSourceAutomationFinding;
	  }
	| {
			kind: "repository";
			evidenceKind: "historical-source-snapshot";
			id: `source:${string}`;
			repository: Repository;
			path: string;
			commitSha: string;
			href: string;
			capturedAt: IsoDateTime;
			transition: {
				kind: "file-removed" | "deployment-superseded";
				commitSha: string;
				occurredAt: IsoDateTime;
				href: string;
				summary: string;
			};
	  }
	| {
			kind: "grafana";
			evidenceKind: "live-grafana";
			id: `source:${string}`;
			uid: string;
			folderUid: string;
			group: string;
			href: string;
			lastUpdatedAt: IsoDateTime;
	  };

export interface AlertDeployment {
	environment: AlertEnvironment;
	sourceRef: AlertSource["id"];
	severity: AlertSeverity;
}

export type AlertNotificationRoute =
	| {
			kind: "nais-team-slack";
			channel: "#esyfo-alarm";
			verifiedAt: IsoDateTime;
			evidenceHref: string;
	  }
	| {
			kind: "grafana-contact-point";
			contactPoint: "Slack-esyfo-alert";
			channel: {
				status: "unresolved";
				reason: string;
				issue: "navikt/team-esyfo#210";
			};
			verifiedAt: IsoDateTime;
			evidenceHref: string;
	  };

export interface AlertRule {
	id: `rule:${string}`;
	engine: AlertEngine;
	name: string;
	ownerTeam: "team-esyfo";
	expr: string;
	holdFor?: string;
	evaluationInterval?: string;
	semantic: AlertSemantic;
	semanticFamily: string;
	lifecycle: AlertLifecycle;
	targetRefs: AlertTargetId[];
	monitoredRefs: AlertTargetId[];
	externalTargets: string[];
	journeyRefs: JourneyId[];
	pipelineRefs: PipelineId[];
	deployments: AlertDeployment[];
	notification: AlertNotificationRoute;
	runbook: TrackedLink;
	dashboard: TrackedLink;
	annotations: {
		summary?: string;
		consequence?: string;
		action?: string;
	};
	policyReview: {
		status: "unreviewed";
		issue: "navikt/team-esyfo#210";
	};
	riskNotes: string[];
}

export interface AlertObservation {
	ruleId: AlertRule["id"];
	environment: AlertEnvironment;
	configuredState: "enabled" | "paused" | "disabled";
	evaluationState:
		| "not-firing"
		| "pending"
		| "firing"
		| "not-evaluated"
		| "unknown";
	evaluationHealth: "ok" | "error" | "unknown";
	observedDefinition: {
		expressionFingerprint: `fnv1a64:${string}`;
		holdFor?: string;
		evaluationInterval?: string;
		comparison: "exact-match" | "semantic-match";
		normalizationNote: string;
	};
	observedAt: IsoDateTime;
	evidenceHref: string;
	note: string;
}

export interface AlertObservationSnapshot {
	schemaVersion: 1;
	observedAt: IsoDateTime;
	source: string;
	observations: AlertObservation[];
}

export interface AlertDriftReport {
	status: "clean" | "drift" | "unknown";
	expectedInstances: number;
	observedInstances: number;
	missingInstances: string[];
	unexpectedInstances: string[];
	configuredStateChanges: Array<{
		instance: string;
		expected: AlertObservation["configuredState"];
		observed: AlertObservation["configuredState"];
	}>;
	definitionChanges: Array<{
		instance: string;
		field: "expr" | "holdFor" | "evaluationInterval";
		expected?: string;
		observed?: string;
	}>;
	evaluationErrors: string[];
	unknownEvaluationHealth: string[];
	staleObservations: string[];
	futureObservations: string[];
	reason?: string;
}

export interface AlertRegistry {
	schemaVersion: 1;
	ownerTeam: "team-esyfo";
	capturedAt: IsoDateTime;
	decisionIssue: "navikt/team-esyfo#203";
	policyIssue: "navikt/team-esyfo#210";
	sources: AlertSource[];
	rules: AlertRule[];
	observations: AlertObservation[];
	exclusions: Array<{
		id: string;
		reason: string;
	}>;
}

export interface AlertRegistryReport {
	errors: string[];
	warnings: string[];
	counts: {
		rules: number;
		prometheusRules: number;
		grafanaRules: number;
		instances: number;
		prometheusInstances: number;
		grafanaInstances: number;
		prometheusByEnvironment: Record<AlertEnvironment, number>;
		paused: number;
		disabled: number;
		firing: number;
		notFiring: number;
	};
	nameCollisions: Array<{ name: string; ruleIds: AlertRule["id"][] }>;
	exactDuplicates: Array<{
		expr: string;
		holdFor?: string;
		evaluationInterval?: string;
		ruleIds: AlertRule["id"][];
	}>;
	semanticFamilies: Array<{ family: string; ruleIds: AlertRule["id"][] }>;
	currentRuntimeWithoutProductionRule: AlertTargetId[];
	ownedTopicsWithoutEnabledProductionRule: TopicId[];
	productionRuntimeClusterMismatches: Array<{
		ruleId: AlertRule["id"];
		environment: "prod-gcp" | "prod-fss";
		targetRef: ResourceId;
		expectedCluster: "prod-gcp" | "prod-fss";
	}>;
	historicalSourceDeployments: Array<{
		ruleId: AlertRule["id"];
		environment: AlertEnvironment;
		sourceRef: AlertSource["id"];
	}>;
	deliveryAutomationGaps: Array<{
		sourceRef: AlertSource["id"];
		kind: AlertSourceAutomationFinding["kind"];
		ruleIds: AlertRule["id"][];
		environments: AlertEnvironment[];
		affectedDeployments: number;
	}>;
	unresolvedNotificationChannels: AlertRule["id"][];
	unclassifiedSeverityDeployments: Array<{
		ruleId: AlertRule["id"];
		environment: AlertEnvironment;
	}>;
	missingRunbooks: AlertRule["id"][];
	missingDashboards: AlertRule["id"][];
}
