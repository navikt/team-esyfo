import { runtimeInventory } from "../runtime/inventory.ts";
import type { IssueRef, PipelineId, Repository } from "../runtime/model.ts";
import type {
	AlertChannelPolicy,
	AlertPolicyDecision,
	AlertPolicyDecisionKind,
	AlertPolicyEvidence,
	AlertRegistry,
	AlertRegistryReport,
	AlertReplacement,
	AlertResponseTier,
	AlertRule,
	AlertSemantic,
	AlertTargetId,
} from "./model.ts";

const POLICY_DECISIONS: AlertPolicyDecisionKind[] = [
	"KEEP",
	"TUNE",
	"REPLACE",
	"RETIRE",
	"MIGRATE",
	"EXTERNAL_ONLY",
];
const RESPONSE_TIERS: AlertResponseTier[] = [
	"pager",
	"ticket",
	"dashboard-only",
];
const ISSUE_REF = /^navikt\/[A-Za-z0-9_.-]+#\d+$/;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T.+Z$/;
const UNSAFE_CURRENT_PAGER_SEMANTICS = new Set<AlertSemantic>([
	"consumer-lag",
	"log-error-ratio",
	"raw-consumer-offset",
	"http-4xx-ratio",
	"http-5xx-ratio",
]);
const PAGER_ACTIVATION_ISSUE = "navikt/team-esyfo#217" as const;
const PAGER_READINESS_ISSUE = "navikt/team-esyfo#211" as const;

const EXPECTED_PHASE_BY_DECISION = {
	KEEP: "retained-rule",
	TUNE: "after-tuning",
	REPLACE: "replacement",
	RETIRE: "until-retired",
	MIGRATE: "during-migration",
	EXTERNAL_ONLY: "external",
} as const;

type PolicyReport = AlertRegistryReport["policy"];

export interface AlertPolicyEvaluation extends PolicyReport {
	errors: string[];
	warnings: string[];
}

const emptyDecisionCounts = (): Record<AlertPolicyDecisionKind, number> => ({
	KEEP: 0,
	TUNE: 0,
	REPLACE: 0,
	RETIRE: 0,
	MIGRATE: 0,
	EXTERNAL_ONLY: 0,
});

const emptyTierCounts = (): Record<AlertResponseTier, number> => ({
	pager: 0,
	ticket: 0,
	"dashboard-only": 0,
});

const validEvidence = (evidence: AlertPolicyEvidence | undefined) => {
	if (
		!evidence?.href.trim() ||
		!evidence.summary.trim() ||
		!ISO_DATE_TIME.test(evidence.verifiedAt) ||
		!Number.isFinite(new Date(evidence.verifiedAt).getTime())
	) {
		return false;
	}
	try {
		return new URL(evidence.href).protocol === "https:";
	} catch {
		return false;
	}
};

const implementationIssue = (policy: AlertPolicyDecision) =>
	"implementationIssue" in policy ? policy.implementationIssue : undefined;

const validateReplacement = (
	rule: AlertRule,
	replacement: AlertReplacement | undefined,
	knownTargets: Set<AlertTargetId>,
	errors: string[],
) => {
	if (!replacement) {
		errors.push(`${rule.id} ${rule.policy.decision} mangler erstatning.`);
		return;
	}
	if (replacement.targetRefs.length === 0) {
		errors.push(`${rule.id} har erstatning uten target.`);
	}
	for (const targetRef of replacement.targetRefs) {
		if (!knownTargets.has(targetRef)) {
			errors.push(`${rule.id} har erstatning med ukjent target ${targetRef}.`);
		}
	}
	if (replacement.status === "planned" && !ISSUE_REF.test(replacement.issue)) {
		errors.push(`${rule.id} har planlagt erstatning uten gyldig issue.`);
	}
	if (replacement.status === "verified") {
		if (
			replacement.evidence.length === 0 ||
			!replacement.evidence.every(validEvidence)
		) {
			errors.push(`${rule.id} har verifisert erstatning uten gyldig evidens.`);
		}
		if (replacement.ruleRefs?.includes(rule.id)) {
			errors.push(`${rule.id} kan ikke erstatte seg selv.`);
		}
	}
};

const detectReplacementCycles = (rules: AlertRule[], errors: string[]) => {
	const knownRuleIds = new Set(rules.map(({ id }) => id));
	const graph = new Map<AlertRule["id"], AlertRule["id"][]>();
	for (const rule of rules) {
		if (!rule.policy) continue;
		const replacement =
			rule.policy.decision === "REPLACE" || rule.policy.decision === "MIGRATE"
				? rule.policy.replacement
				: rule.policy.decision === "RETIRE" &&
						rule.policy.retirementGate.status === "ready" &&
						rule.policy.retirementGate.basis.kind === "verified-replacement"
					? rule.policy.retirementGate.basis.replacement
					: undefined;
		if (replacement?.status !== "verified" || !replacement.ruleRefs) continue;
		for (const targetRuleId of replacement.ruleRefs) {
			if (!knownRuleIds.has(targetRuleId)) {
				errors.push(
					`${rule.id} peker til ukjent erstatningsregel ${targetRuleId}.`,
				);
			}
		}
		graph.set(rule.id, replacement.ruleRefs);
	}

	const visiting = new Set<AlertRule["id"]>();
	const visited = new Set<AlertRule["id"]>();
	const visit = (ruleId: AlertRule["id"]): boolean => {
		if (visiting.has(ruleId)) return true;
		if (visited.has(ruleId)) return false;
		visiting.add(ruleId);
		for (const next of graph.get(ruleId) ?? []) {
			if (visit(next)) return true;
		}
		visiting.delete(ruleId);
		visited.add(ruleId);
		return false;
	};
	for (const ruleId of graph.keys()) {
		if (visit(ruleId)) {
			errors.push(`Erstatningsgrafen inneholder en syklus ved ${ruleId}.`);
			break;
		}
	}
};

const validateChannel = (channel: AlertChannelPolicy, errors: string[]) => {
	if (!channel.destination.trim() || !channel.rationale.trim()) {
		errors.push(`${channel.id} mangler destinasjon eller begrunnelse.`);
	}
	if (
		(channel.allowedTiers as AlertResponseTier[]).includes("dashboard-only")
	) {
		errors.push(`${channel.id} kan ikke rute dashboard-only.`);
	}
	if (
		channel.verification === "verified" &&
		(channel.evidence.length === 0 || !channel.evidence.every(validEvidence))
	) {
		errors.push(`${channel.id} er verifisert uten gyldig evidens.`);
	}
	if (
		(channel.disposition === "external-only" ||
			channel.disposition === "no-new-alerts") &&
		channel.allowedTiers.length > 0
	) {
		errors.push(`${channel.id} kan ikke ta imot nye Team eSyfo-varsler.`);
	}
	const allowedTiersAre = (...tiers: AlertResponseTier[]) =>
		channel.allowedTiers.length === tiers.length &&
		channel.allowedTiers.every((tier) => tiers.includes(tier));
	const contractIsValid = (() => {
		switch (channel.id) {
			case "channel:team-esyfo-pager":
				return (
					channel.stewardship === "team-esyfo" &&
					allowedTiersAre("pager") &&
					((channel.disposition === "planned" &&
						channel.verification === "unverified") ||
						(channel.disposition === "active" &&
							channel.verification === "verified"))
				);
			case "channel:esyfo-alarm":
				return (
					channel.stewardship === "team-esyfo" &&
					channel.disposition === "active" &&
					channel.verification === "verified" &&
					allowedTiersAre("ticket")
				);
			case "channel:esyfo-data-alert":
				return (
					channel.stewardship === "external" &&
					channel.disposition === "external-only" &&
					channel.verification === "verified" &&
					allowedTiersAre()
				);
			case "channel:esyfo-kibana-alerts":
				return (
					channel.stewardship === "unresolved" &&
					channel.disposition === "no-new-alerts" &&
					channel.verification === "unverified" &&
					allowedTiersAre()
				);
		}
	})();
	if (!contractIsValid) {
		errors.push(`${channel.id} bryter den låste kanal-/eierskapskontrakten.`);
	}
};

const repositoryByScopeRef = new Map<string, Repository>([
	...runtimeInventory.applications.map(
		({ id, repository }) => [id, repository] as const,
	),
	...runtimeInventory.jobs.map(({ id, repository }) => [id, repository] as const),
	...runtimeInventory.topics.map(
		({ id, repository }) => [id, repository] as const,
	),
]);

const uniqueIssues = (issues: Iterable<IssueRef>) =>
	[...new Set(issues)].sort((left, right) => left.localeCompare(right));

export const evaluateAlertPolicy = (
	registry: AlertRegistry,
): AlertPolicyEvaluation => {
	const errors: string[] = [];
	const warnings: string[] = [];
	const decisionCounts = emptyDecisionCounts();
	const tierCounts = emptyTierCounts();
	const pagerCandidatesBlocked: PolicyReport["pagerCandidatesBlocked"] = [];
	const implementationGaps: PolicyReport["implementationGaps"] = [];
	const knownTargets = new Set(
		registry.rules.flatMap(({ targetRefs }) => targetRefs),
	);

	if (
		!registry.policy ||
		registry.policy.decisionIssue !== "navikt/team-esyfo#210" ||
		registry.policy.appliesTo !== "canonical-production-deployments" ||
		!ISO_DATE_TIME.test(registry.policy.decidedAt)
	) {
		errors.push("Alert-policykatalogen mangler gyldig beslutning og scope.");
	}

	for (const tier of RESPONSE_TIERS) {
		const definition = registry.policy?.actionTiers?.[tier];
		if (
			!definition?.description.trim() ||
			definition.requirements.length === 0 ||
			definition.requirements.some((requirement) => !requirement.trim())
		) {
			errors.push(`Responsklassen ${tier} mangler komplett definisjon.`);
		}
	}

	const channelById = new Map(
		(registry.policy?.channels ?? []).map((channel) => [channel.id, channel]),
	);
	if (channelById.size !== (registry.policy?.channels.length ?? 0)) {
		errors.push("Alert-policyen har dupliserte kanal-ID-er.");
	}
	for (const channel of registry.policy?.channels ?? []) {
		validateChannel(channel, errors);
	}
	for (const requiredChannel of [
		"channel:team-esyfo-pager",
		"channel:esyfo-alarm",
		"channel:esyfo-data-alert",
		"channel:esyfo-kibana-alerts",
	] as const) {
		if (!channelById.has(requiredChannel)) {
			errors.push(`Alert-policyen mangler ${requiredChannel}.`);
		}
	}

	for (const rule of registry.rules) {
		const policy = rule.policy as AlertPolicyDecision | undefined;
		if (!policy || !POLICY_DECISIONS.includes(policy.decision)) {
			errors.push(`${rule.id} mangler én eksplisitt policybeslutning.`);
			continue;
		}
		decisionCounts[policy.decision] += 1;
		if (!policy.rationale.trim()) {
			errors.push(`${rule.id} mangler policybegrunnelse.`);
		}
		if (
			!ISO_DATE_TIME.test(policy.decidedAt) ||
			!Number.isFinite(new Date(policy.decidedAt).getTime())
		) {
			errors.push(`${rule.id} mangler gyldig beslutningstidspunkt.`);
		} else if (policy.decidedAt !== registry.policy.decidedAt) {
			errors.push(
				`${rule.id} har et annet beslutningstidspunkt enn policykatalogen.`,
			);
		}
		if (
			policy.operationalResponse?.phase !==
			EXPECTED_PHASE_BY_DECISION[policy.decision]
		) {
			errors.push(
				`${rule.id} ${policy.decision} har feil operativ fase ${policy.operationalResponse?.phase ?? "mangler"}.`,
			);
		}

		if (policy.owner.kind === "team") {
			if (
				!rule.targetRefs.includes(policy.owner.scopeRef as AlertTargetId) &&
				!rule.pipelineRefs.includes(policy.owner.scopeRef as PipelineId)
			) {
				errors.push(
					`${rule.id} har policy-eier utenfor registrert target/pipeline: ${policy.owner.scopeRef}.`,
				);
			}
			const expectedRepository = repositoryByScopeRef.get(policy.owner.scopeRef);
			if (
				expectedRepository &&
				policy.owner.repository !== expectedRepository
			) {
				errors.push(
					`${rule.id} har eier-repo ${policy.owner.repository}, men ${policy.owner.scopeRef} eies av ${expectedRepository} i runtimeinventaret.`,
				);
			}
			if (
				policy.owner.scopeRef.startsWith("pipeline:") &&
				policy.owner.repository !== "navikt/team-esyfo"
			) {
				errors.push(
					`${rule.id} har pipeline-eier utenfor navikt/team-esyfo.`,
				);
			}
		} else if (!validEvidence(policy.owner.evidence)) {
			errors.push(`${rule.id} har ekstern eier uten gyldig evidens.`);
		}

		const delivery = policy.operationalResponse?.delivery;
		if (!delivery) {
			errors.push(`${rule.id} mangler operativ respons.`);
			continue;
		}
		const tier = delivery.tier;
		tierCounts[tier] += 1;
		let desiredChannel: AlertChannelPolicy | undefined;
		if (tier !== "dashboard-only") {
			desiredChannel = channelById.get(delivery.channelPolicyRef);
			if (!desiredChannel) {
				errors.push(
					`${rule.id} peker til ukjent operativ kanal ${delivery.channelPolicyRef}.`,
				);
			} else if (
				!(desiredChannel.allowedTiers as AlertResponseTier[]).includes(tier)
			) {
				errors.push(
					`${rule.id} bruker ${desiredChannel.id}, som ikke tillater ${tier}.`,
				);
			}
		} else if ("channelPolicyRef" in delivery) {
			errors.push(`${rule.id} er dashboard-only, men har operativ kanal.`);
		}

		const followUp = implementationIssue(policy);
		if (
			policy.decision !== "KEEP" &&
			policy.decision !== "EXTERNAL_ONLY" &&
			(!followUp || !ISSUE_REF.test(followUp))
		) {
			errors.push(
				`${rule.id} ${policy.decision} mangler gyldig oppfølgingsissue.`,
			);
		}
		if (policy.decision === "REPLACE" || policy.decision === "MIGRATE") {
			validateReplacement(rule, policy.replacement, knownTargets, errors);
		}
		if (policy.decision === "MIGRATE" && rule.lifecycle.state !== "migrating") {
			errors.push(`${rule.id} er MIGRATE uten migrerende livssyklus.`);
		} else if (
			policy.decision === "MIGRATE" &&
			rule.lifecycle.state === "migrating" &&
			rule.lifecycle.targetRefs.some(
				(targetRef) => !policy.replacement.targetRefs.includes(targetRef),
			)
		) {
			errors.push(
				`${rule.id} har migreringsmål som ikke finnes i policyerstatningen.`,
			);
		}
		if (policy.decision === "RETIRE") {
			const gate = policy.retirementGate;
			if (gate.status === "blocked") {
				if (!gate.condition.trim() || !ISSUE_REF.test(gate.issue)) {
					errors.push(`${rule.id} har ugyldig blokkert retirement-gate.`);
				}
				implementationGaps.push({
					ruleId: rule.id,
					kind: "retirement-blocked",
					message: gate.condition,
					issue: gate.issue,
				});
			} else if (
				gate.reviewedAt &&
				(!ISO_DATE_TIME.test(gate.reviewedAt) ||
					!Number.isFinite(new Date(gate.reviewedAt).getTime()))
			) {
				errors.push(`${rule.id} har ugyldig reviewtid for retirement.`);
			} else if (gate.basis.kind === "verified-replacement") {
				if (gate.basis.replacement.status !== "verified") {
					errors.push(
						`${rule.id} kan ikke være klar for retirement med planlagt erstatning.`,
					);
				} else {
					validateReplacement(
						rule,
						gate.basis.replacement,
						knownTargets,
						errors,
					);
				}
			} else if (
				!gate.basis.reason.trim() ||
				gate.basis.evidence.length === 0 ||
				!gate.basis.evidence.every(validEvidence)
			) {
				errors.push(`${rule.id} mangler begrunnet og dokumentert retirement.`);
			}
		}
		if (policy.decision === "EXTERNAL_ONLY") {
			if (
				policy.owner.kind !== "external" ||
				tier !== "dashboard-only" ||
				!validEvidence(policy.handoffEvidence)
			) {
				errors.push(`${rule.id} har ugyldig EXTERNAL_ONLY-overlevering.`);
			}
		}

		if (policy.decision !== "KEEP" && policy.decision !== "EXTERNAL_ONLY") {
			implementationGaps.push({
				ruleId: rule.id,
				kind: "pending-change",
				message: `${policy.decision} er vedtatt, men oppfølgingsoppgaven må verifiseres før live-regelen regnes som endret.`,
				issue: followUp,
			});
		}

		const productionObservations = registry.observations.filter(
			(observation) =>
				observation.ruleId === rule.id &&
				observation.environment.startsWith("prod-"),
		);
		const enabledProductionObservations = productionObservations.filter(
			({ configuredState }) => configuredState === "enabled",
		);
		const currentRouteMatches =
			tier === "dashboard-only"
				? enabledProductionObservations.length === 0
				: tier === "ticket"
					? enabledProductionObservations.length > 0 &&
						rule.notification.kind === "nais-team-slack" &&
						rule.notification.channel === "#esyfo-alarm"
					: enabledProductionObservations.length > 0 &&
						rule.notification.kind === "verified-pager" &&
						rule.notification.channelPolicyRef === delivery.channelPolicyRef;
		if (!currentRouteMatches) {
			implementationGaps.push({
				ruleId: rule.id,
				kind: "current-route-mismatch",
				message:
					tier === "dashboard-only"
						? "Regelen er vedtatt dashboard-only, men minst én produksjonsinstans er fortsatt enabled med varslingsrute."
						: tier === "pager"
							? "Produksjonsregelen har ennå ikke en verifisert avbrytende rute."
							: "Operativ ticket-respons er ikke verifisert mot en enabled produksjonsinstans og #esyfo-alarm.",
				issue: followUp ?? PAGER_ACTIVATION_ISSUE,
			});
		}
		const hasDevDeployment = rule.deployments.some(
			({ environment }) => environment === "dev-gcp",
		);
		const devIsolationIsVerified =
			tier === "pager" &&
			delivery.activation === "ready" &&
			validEvidence(delivery.devIsolationEvidence);
		if (
			hasDevDeployment &&
			tier !== "dashboard-only" &&
			!devIsolationIsVerified
		) {
			implementationGaps.push({
				ruleId: rule.id,
				kind: "dev-production-routing-unverified",
				message:
					"Dev-instansen må dokumenteres skilt fra produksjonens operative respons.",
				issue: followUp ?? PAGER_ACTIVATION_ISSUE,
			});
		}

		if (tier === "pager") {
			const blockers: string[] = [];
			const blockerIssues = new Set<IssueRef>();
			if (delivery.activation === "blocked") {
				if (
					delivery.blockerIssues.length === 0 ||
					delivery.blockerIssues.some((issue) => !ISSUE_REF.test(issue))
				) {
					errors.push(`${rule.id} har ugyldige pager-sperreoppgaver.`);
				}
				for (const issue of delivery.blockerIssues) blockerIssues.add(issue);
				blockers.push("readiness-oppgaver er ikke verifisert lukket");
			} else if (
				delivery.activationEvidence.length === 0 ||
				!delivery.activationEvidence.every(validEvidence)
			) {
				errors.push(`${rule.id} er pager-klar uten gyldig aktiveringsevidens.`);
			}
			if (
				!desiredChannel ||
				desiredChannel.disposition !== "active" ||
				desiredChannel.verification !== "verified"
			) {
				blockers.push("avbrytende kanal er ikke etablert og verifisert");
				blockerIssues.add(PAGER_ACTIVATION_ISSUE);
			}
			if (!currentRouteMatches) {
				blockers.push("per-regel produksjonsrute er ikke verifisert som pager");
				blockerIssues.add(PAGER_ACTIVATION_ISSUE);
			}
			if (hasDevDeployment && !devIsolationIsVerified) {
				blockers.push("dev-isolasjon fra produksjonspager er ikke verifisert");
				blockerIssues.add(PAGER_ACTIVATION_ISSUE);
			}
			if (rule.runbook.status !== "linked") {
				blockers.push("runbook mangler");
				if (rule.runbook.status === "missing") {
					blockerIssues.add(rule.runbook.issue);
				}
			}
			if (rule.dashboard.status !== "linked") {
				blockers.push("diagnostisk dashboard mangler");
				if (rule.dashboard.status === "missing") {
					blockerIssues.add(rule.dashboard.issue);
				}
			}
			if (delivery.activation === "blocked") {
				blockerIssues.add(PAGER_READINESS_ISSUE);
			}
			if (
				!rule.deployments.some(
					({ environment, severity }) =>
						environment.startsWith("prod-") && severity === "critical",
				)
			) {
				blockers.push("kritisk produksjonsseverity mangler");
			}
			if (!rule.annotations.consequence?.trim()) {
				blockers.push("konsekvens mangler");
			}
			if (!rule.annotations.action?.trim()) blockers.push("handling mangler");
			if (
				policy.decision === "REPLACE" ||
				policy.decision === "MIGRATE" ||
				policy.decision === "TUNE"
			) {
				blockers.push(
					`${policy.decision.toLowerCase()} er ikke verifisert live`,
				);
				if (followUp) blockerIssues.add(followUp);
			}
			if (
				UNSAFE_CURRENT_PAGER_SEMANTICS.has(rule.semantic) ||
				/kube_pod_/i.test(rule.expr)
			) {
				if (policy.decision === "KEEP" || policy.decision === "RETIRE") {
					errors.push(
						`${rule.id} kan ikke page på rå loggrate, lag/offset, HTTP-ratio eller én pod.`,
					);
				} else {
					blockers.push("dagens signal er ikke pager-sikkert");
					if (followUp) blockerIssues.add(followUp);
				}
			}
			if (blockers.length > 0) {
				pagerCandidatesBlocked.push({
					ruleId: rule.id,
					reasons: [...new Set(blockers)],
					issues: uniqueIssues(blockerIssues),
				});
				implementationGaps.push({
					ruleId: rule.id,
					kind: "pager-not-ready",
					message: blockers.join("; "),
					issue: followUp ?? PAGER_ACTIVATION_ISSUE,
				});
				if (delivery.activation === "ready") {
					errors.push(
						`${rule.id} er merket pager-klar med uløste sperrer: ${blockers.join(", ")}.`,
					);
				}
			} else if (delivery.activation === "blocked") {
				warnings.push(
					`${rule.id} er fortsatt merket pager-blokkert uten beregnede sperrer.`,
				);
			}
		}
	}

	detectReplacementCycles(registry.rules, errors);
	if (
		Object.values(decisionCounts).reduce((sum, count) => sum + count, 0) !==
		registry.rules.length
	) {
		errors.push("Policybeslutningene summerer ikke til antall regler.");
	}
	if (
		Object.values(tierCounts).reduce((sum, count) => sum + count, 0) !==
		registry.rules.length
	) {
		errors.push("Responsklassene summerer ikke til antall regler.");
	}

	return {
		errors,
		warnings,
		decisionCounts,
		tierCounts,
		pagerCandidatesBlocked: pagerCandidatesBlocked.sort((left, right) =>
			left.ruleId.localeCompare(right.ruleId),
		),
		implementationGaps: implementationGaps.sort((left, right) =>
			`${left.ruleId}|${left.kind}`.localeCompare(
				`${right.ruleId}|${right.kind}`,
			),
		),
	};
};
