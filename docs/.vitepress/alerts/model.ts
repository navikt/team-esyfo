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
export type AlertPolicyDecisionKind =
	| "KEEP"
	| "TUNE"
	| "REPLACE"
	| "RETIRE"
	| "MIGRATE"
	| "EXTERNAL_ONLY";
export type AlertResponseTier = "pager" | "ticket" | "dashboard-only";
export type AlertOperationalPhase =
	| "retained-rule"
	| "after-tuning"
	| "replacement"
	| "during-migration"
	| "until-retired"
	| "external";
export type AlertChannelPolicyId =
	| "channel:team-esyfo-pager"
	| "channel:esyfo-alarm"
	| "channel:esyfo-data-alert"
	| "channel:esyfo-kibana-alerts";
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
				cleanupIssue: IssueRef;
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
	  }
	| {
			kind: "verified-pager";
			channelPolicyRef: "channel:team-esyfo-pager";
			verifiedAt: IsoDateTime;
			evidenceHref: string;
	  };

export interface AlertPolicyEvidence {
	href: string;
	summary: string;
	verifiedAt: IsoDateTime;
}

export type AlertPolicyOwner =
	| {
			kind: "team";
			team: "team-esyfo";
			repository: Repository;
			scopeRef: AlertTargetId | PipelineId;
	  }
	| {
			kind: "external";
			name: string;
			evidence: AlertPolicyEvidence;
	  };

export type AlertDesiredDelivery =
	| { tier: "dashboard-only" }
	| {
			tier: "ticket";
			channelPolicyRef: AlertChannelPolicyId;
	  }
	| (
			| {
					tier: "pager";
					channelPolicyRef: AlertChannelPolicyId;
					activation: "blocked";
					blockerIssues: [IssueRef, ...IssueRef[]];
			  }
			| {
					tier: "pager";
					channelPolicyRef: AlertChannelPolicyId;
					activation: "ready";
					activationEvidence: [
						AlertPolicyEvidence,
						...AlertPolicyEvidence[],
					];
					devIsolationEvidence?: AlertPolicyEvidence;
			  }
	  );

export interface AlertOperationalResponse<
	Phase extends AlertOperationalPhase = AlertOperationalPhase,
> {
	phase: Phase;
	delivery: AlertDesiredDelivery;
}

export type AlertReplacement =
	| {
			status: "planned";
			issue: IssueRef;
			targetRefs: [AlertTargetId, ...AlertTargetId[]];
	  }
	| {
			status: "verified";
			targetRefs: [AlertTargetId, ...AlertTargetId[]];
			ruleRefs?: [`rule:${string}`, ...`rule:${string}`[]];
			evidence: [AlertPolicyEvidence, ...AlertPolicyEvidence[]];
	  };

export type AlertRetirementGate =
	| {
			status: "blocked";
			condition: string;
			issue: IssueRef;
	  }
	| {
			status: "ready";
			reviewedAt?: IsoDateTime;
			basis:
				| {
						kind: "verified-replacement";
						replacement: Extract<AlertReplacement, { status: "verified" }>;
				  }
				| {
						kind: "justified-removal";
						reason: string;
						evidence: [AlertPolicyEvidence, ...AlertPolicyEvidence[]];
				  };
	  };

interface AlertPolicyDecisionBase {
	owner: AlertPolicyOwner;
	rationale: string;
	decidedAt: IsoDateTime;
}

export type AlertPolicyDecision =
	| (AlertPolicyDecisionBase & {
			decision: "KEEP";
			operationalResponse: AlertOperationalResponse<"retained-rule">;
	  })
	| (AlertPolicyDecisionBase & {
			decision: "TUNE";
			operationalResponse: AlertOperationalResponse<"after-tuning">;
			implementationIssue: IssueRef;
	  })
	| (AlertPolicyDecisionBase & {
			decision: "REPLACE";
			operationalResponse: AlertOperationalResponse<"replacement">;
			implementationIssue: IssueRef;
			replacement: AlertReplacement;
	  })
	| (AlertPolicyDecisionBase & {
			decision: "MIGRATE";
			operationalResponse: AlertOperationalResponse<"during-migration">;
			implementationIssue: IssueRef;
			replacement: AlertReplacement;
	  })
	| (AlertPolicyDecisionBase & {
			decision: "RETIRE";
			operationalResponse: AlertOperationalResponse<"until-retired">;
			implementationIssue: IssueRef;
			retirementGate: AlertRetirementGate;
	  })
	| (Omit<AlertPolicyDecisionBase, "owner"> & {
			decision: "EXTERNAL_ONLY";
			owner: Extract<AlertPolicyOwner, { kind: "external" }>;
			operationalResponse: {
				phase: "external";
				delivery: { tier: "dashboard-only" };
			};
			handoffEvidence: AlertPolicyEvidence;
	  });

interface AlertChannelPolicyBase {
	destination: string;
	rationale: string;
	evidence: AlertPolicyEvidence[];
}

export type AlertChannelPolicy = AlertChannelPolicyBase &
	(
		| {
				id: "channel:team-esyfo-pager";
				stewardship: "team-esyfo";
				disposition: "planned";
				verification: "unverified";
				allowedTiers: ["pager"];
		  }
		| {
				id: "channel:team-esyfo-pager";
				stewardship: "team-esyfo";
				disposition: "active";
				verification: "verified";
				allowedTiers: ["pager"];
		  }
		| {
				id: "channel:esyfo-alarm";
				stewardship: "team-esyfo";
				disposition: "active";
				verification: "verified";
				allowedTiers: ["ticket"];
		  }
		| {
				id: "channel:esyfo-data-alert";
				stewardship: "external";
				disposition: "external-only";
				verification: "verified";
				allowedTiers: [];
		  }
		| {
				id: "channel:esyfo-kibana-alerts";
				stewardship: "unresolved";
				disposition: "no-new-alerts";
				verification: "unverified";
				allowedTiers: [];
		  }
	);

export interface AlertPolicyCatalog {
	decisionIssue: "navikt/team-esyfo#210";
	decidedAt: IsoDateTime;
	appliesTo: "canonical-production-deployments";
	actionTiers: Record<
		AlertResponseTier,
		{ description: string; requirements: string[] }
	>;
	channels: AlertChannelPolicy[];
	guardrails: string[];
	references: Array<{ label: string; href: string }>;
}

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
	policy: AlertPolicyDecision;
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
	schemaVersion: 2;
	ownerTeam: "team-esyfo";
	capturedAt: IsoDateTime;
	inventoryIssue: "navikt/team-esyfo#203";
	policy: AlertPolicyCatalog;
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
	policy: {
		decisionCounts: Record<AlertPolicyDecisionKind, number>;
		tierCounts: Record<AlertResponseTier, number>;
		pagerCandidatesBlocked: Array<{
			ruleId: AlertRule["id"];
			reasons: string[];
			issues: IssueRef[];
		}>;
		implementationGaps: Array<{
			ruleId: AlertRule["id"];
			kind:
				| "pending-change"
				| "retirement-blocked"
				| "pager-not-ready"
				| "current-route-mismatch"
				| "dev-production-routing-unverified";
			message: string;
			issue?: IssueRef;
		}>;
	};
}
