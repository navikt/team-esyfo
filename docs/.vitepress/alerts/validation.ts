import { runtimeInventory } from "../runtime/inventory.ts";
import type { ResourceId, TopicId } from "../runtime/model.ts";
import {
	alertExpressionFingerprint,
	normalizeAlertExpression,
} from "./fingerprint.ts";
import type {
	AlertEnvironment,
	AlertObservation,
	AlertRegistry,
	AlertRegistryReport,
	AlertRule,
	AlertTargetId,
} from "./model.ts";

const COMMIT_SHA = /^[0-9a-f]{40}$/i;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T.+Z$/;
const PRODUCTION_ENVIRONMENTS = new Set<AlertEnvironment>([
	"prod-gcp",
	"prod-fss",
]);

const observationKey = (
	observation: Pick<AlertObservation, "ruleId" | "environment">,
) => `${observation.ruleId}|${observation.environment}`;

const deploymentKey = (rule: AlertRule, environment: AlertEnvironment) =>
	`${rule.id}|${environment}`;

const duplicateValues = (values: string[]) => {
	const seen = new Set<string>();
	const duplicates = new Set<string>();
	for (const value of values) {
		if (seen.has(value)) duplicates.add(value);
		seen.add(value);
	}
	return [...duplicates].sort();
};

const groupedRuleIds = (
	rules: AlertRule[],
	key: (rule: AlertRule) => string,
) => {
	const groups = new Map<string, AlertRule["id"][]>();
	for (const rule of rules) {
		const value = key(rule);
		groups.set(value, [...(groups.get(value) ?? []), rule.id]);
	}
	return [...groups.entries()]
		.filter(([, ruleIds]) => ruleIds.length > 1)
		.map(([value, ruleIds]) => ({ value, ruleIds: ruleIds.sort() }))
		.sort((left, right) => left.value.localeCompare(right.value));
};

const isCurrentLifecycle = (state: string) =>
	state === "active" || state === "migrating" || state === "retiring";

const currentRuntimeRefs = new Set<AlertTargetId>([
	...runtimeInventory.applications
		.filter(({ lifecycle }) => isCurrentLifecycle(lifecycle.state))
		.map(({ id }) => id),
	...runtimeInventory.jobs
		.filter(({ lifecycle }) => isCurrentLifecycle(lifecycle.state))
		.map(({ id }) => id),
]);

const knownRuntimeById = new Map<ResourceId, "prod-gcp" | "prod-fss">([
	...runtimeInventory.applications.map(
		({ id, runtime }) => [id, runtime.cluster] as const,
	),
	...runtimeInventory.jobs.map(
		({ id, runtime }) => [id, runtime.cluster] as const,
	),
]);

const knownTopicRefs = new Set<TopicId>(
	runtimeInventory.topics.map(({ id }) => id),
);

const knownTargetRefs = new Set<AlertTargetId>([
	...knownRuntimeById.keys(),
	...knownTopicRefs,
]);

export const buildAlertRegistryReport = (
	registry: AlertRegistry,
): AlertRegistryReport => {
	const errors: string[] = [];
	const warnings: string[] = [];
	const sourceById = new Map(
		registry.sources.map((source) => [source.id, source]),
	);
	const ruleById = new Map(registry.rules.map((rule) => [rule.id, rule]));
	const prometheusRules = registry.rules.filter(
		({ engine }) => engine === "prometheus-rule",
	);
	const grafanaRules = registry.rules.filter(
		({ engine }) => engine === "grafana-managed",
	);
	const prometheusObservations = registry.observations.filter(
		({ ruleId }) => ruleById.get(ruleId)?.engine === "prometheus-rule",
	);
	const grafanaObservations = registry.observations.filter(
		({ ruleId }) => ruleById.get(ruleId)?.engine === "grafana-managed",
	);

	for (const duplicate of duplicateValues(
		registry.sources.map(({ id }) => id),
	)) {
		errors.push(`Duplisert alertkilde: ${duplicate}.`);
	}
	for (const duplicate of duplicateValues(registry.rules.map(({ id }) => id))) {
		errors.push(`Duplisert alertregel: ${duplicate}.`);
	}
	for (const duplicate of duplicateValues(
		registry.observations.map(observationKey),
	)) {
		errors.push(`Duplisert alertobservasjon: ${duplicate}.`);
	}

	if (
		!ISO_DATE_TIME.test(registry.capturedAt) ||
		!Number.isFinite(new Date(registry.capturedAt).getTime())
	) {
		errors.push(`Ugyldig capturedAt: ${registry.capturedAt}.`);
	}

	for (const source of registry.sources) {
		if (source.kind === "repository") {
			if (!COMMIT_SHA.test(source.commitSha)) {
				errors.push(`${source.id} mangler pinnet commit-SHA.`);
			}
			if (!source.href.includes(source.commitSha)) {
				errors.push(`${source.id} peker ikke til sin pinnede commit.`);
			}
			if (
				source.evidenceKind === "historical-source-snapshot" &&
				(!COMMIT_SHA.test(source.transition.commitSha) ||
					!source.transition.href.includes(source.transition.commitSha) ||
					!ISO_DATE_TIME.test(source.transition.occurredAt) ||
					!source.transition.summary.trim())
			) {
				errors.push(`${source.id} mangler gyldig historisk overgangsevidens.`);
			}
			if (
				source.evidenceKind === "default-branch-snapshot" &&
				source.deliveryAutomationFinding
			) {
				const finding = source.deliveryAutomationFinding;
				if (
					finding.resourcePath !== source.path ||
					!finding.workflowHref.includes("/.github/workflows/")
				) {
					errors.push(`${source.id} har ugyldig workflow-evidens.`);
				}
				if (
					finding.kind === "path-filter-mismatch" &&
					finding.watchedPath === finding.resourcePath
				) {
					errors.push(`${source.id} påstår path-mismatch uten ulike stier.`);
				}
			}
		}
		if (source.kind === "grafana" && !source.href.includes(source.uid)) {
			errors.push(`${source.id} peker ikke til Grafana UID ${source.uid}.`);
		}
	}

	const deploymentKeys = new Set<string>();
	for (const rule of registry.rules) {
		if (!rule.expr.trim()) errors.push(`${rule.id} mangler uttrykk.`);
		if (rule.deployments.length === 0) {
			errors.push(`${rule.id} har ingen deployerte instanser.`);
		}
		if (rule.targetRefs.length === 0 && rule.externalTargets.length === 0) {
			errors.push(
				`${rule.id} mangler berørt runtime, topic eller ekstern flyt.`,
			);
		}
		for (const targetRef of rule.targetRefs) {
			if (!knownTargetRefs.has(targetRef)) {
				errors.push(`${rule.id} peker til ukjent target ${targetRef}.`);
			}
		}
		if (rule.monitoredRefs.length === 0) {
			errors.push(`${rule.id} mangler direkte måltarget.`);
		}
		for (const monitoredRef of rule.monitoredRefs) {
			if (!knownTargetRefs.has(monitoredRef)) {
				errors.push(`${rule.id} peker til ukjent måltarget ${monitoredRef}.`);
			}
			if (!rule.targetRefs.includes(monitoredRef)) {
				errors.push(
					`${rule.id} måler ${monitoredRef}, men targetet er ikke registrert som berørt.`,
				);
			}
		}
		for (const deployment of rule.deployments) {
			const key = deploymentKey(rule, deployment.environment);
			if (deploymentKeys.has(key)) {
				errors.push(`${rule.id} er duplisert i ${deployment.environment}.`);
			}
			deploymentKeys.add(key);
			const source = sourceById.get(deployment.sourceRef);
			if (!source) {
				errors.push(
					`${rule.id} peker til ukjent kilde ${deployment.sourceRef}.`,
				);
				continue;
			}
			if (rule.engine === "prometheus-rule" && source.kind !== "repository") {
				errors.push(`${rule.id} må ha en repo-kilde.`);
			}
			if (rule.engine === "grafana-managed" && source.kind !== "grafana") {
				errors.push(`${rule.id} må ha en Grafana-kilde.`);
			}
		}
		if (
			rule.engine === "prometheus-rule" &&
			rule.notification.kind !== "nais-team-slack"
		) {
			errors.push(`${rule.id} mangler NAIS-ruting.`);
		}
		if (
			rule.engine === "grafana-managed" &&
			rule.notification.kind !== "grafana-contact-point"
		) {
			errors.push(`${rule.id} mangler Grafana-kontaktpunkt.`);
		}
		if (
			rule.lifecycle.state === "migrating" &&
			rule.lifecycle.targetRefs.length === 0
		) {
			errors.push(`${rule.id} migrerer uten måltarget.`);
		}
	}

	const observationKeys = new Set<string>();
	for (const observation of registry.observations) {
		const key = observationKey(observation);
		observationKeys.add(key);
		const rule = ruleById.get(observation.ruleId);
		if (!rule) {
			errors.push(`Observasjon peker til ukjent regel ${observation.ruleId}.`);
			continue;
		}
		if (!deploymentKeys.has(key)) {
			errors.push(`Observert instans ${key} finnes ikke i registeret.`);
		}
		if (observation.observedAt !== registry.capturedAt) {
			errors.push(`${key} har annet observasjonstidspunkt enn snapshotet.`);
		}
		for (const [field, expected, observed] of [
			[
				"expr",
				alertExpressionFingerprint(rule.expr),
				observation.observedDefinition.expressionFingerprint,
			],
			["holdFor", rule.holdFor, observation.observedDefinition.holdFor],
			[
				"evaluationInterval",
				rule.evaluationInterval,
				observation.observedDefinition.evaluationInterval,
			],
		] as const) {
			if (expected !== observed) {
				errors.push(`${key} har live-avvik i ${field}.`);
			}
		}
		if (
			rule.engine === "prometheus-rule" &&
			(observation.configuredState !== "enabled" ||
				observation.evaluationState !== "not-firing")
		) {
			errors.push(
				`${key} skal bevare NAIS Inactive som enabled/not-firing, ikke disabled.`,
			);
		}
		if (
			rule.engine === "grafana-managed" &&
			(observation.configuredState !== "paused" ||
				observation.evaluationState !== "not-evaluated")
		) {
			errors.push(`${key} skal være eksplisitt paused/not-evaluated.`);
		}
	}
	for (const key of deploymentKeys) {
		if (!observationKeys.has(key)) {
			errors.push(`Deklarert instans ${key} mangler live-observasjon.`);
		}
	}

	if (prometheusRules.length !== 29) {
		errors.push(
			`Forventet 29 Prometheus-definisjoner, fant ${prometheusRules.length}.`,
		);
	}
	if (prometheusObservations.length !== 39) {
		errors.push(
			`Forventet 39 PrometheusRule-instanser, fant ${prometheusObservations.length}.`,
		);
	}
	if (grafanaRules.length !== 2 || grafanaObservations.length !== 2) {
		errors.push(
			`Forventet to Grafana-regler og to observasjoner, fant ${grafanaRules.length}/${grafanaObservations.length}.`,
		);
	}

	const prometheusByEnvironment: Record<AlertEnvironment, number> = {
		"dev-gcp": 0,
		"prod-gcp": 0,
		"prod-fss": 0,
	};
	for (const { environment } of prometheusObservations) {
		prometheusByEnvironment[environment] += 1;
	}
	for (const [environment, expected] of [
		["dev-gcp", 7],
		["prod-gcp", 26],
		["prod-fss", 6],
	] as const) {
		if (prometheusByEnvironment[environment] !== expected) {
			errors.push(
				`Forventet ${expected} Prometheus-instanser i ${environment}, fant ${prometheusByEnvironment[environment]}.`,
			);
		}
	}

	const enabledProductionTargets = new Set<AlertTargetId>();
	for (const rule of registry.rules) {
		for (const deployment of rule.deployments) {
			if (!PRODUCTION_ENVIRONMENTS.has(deployment.environment)) continue;
			const observation = registry.observations.find(
				(candidate) =>
					candidate.ruleId === rule.id &&
					candidate.environment === deployment.environment,
			);
			if (observation?.configuredState !== "enabled") continue;
			const source = sourceById.get(deployment.sourceRef);
			if (
				source?.kind === "repository" &&
				source.evidenceKind === "historical-source-snapshot"
			) {
				continue;
			}
			for (const targetRef of rule.monitoredRefs) {
				enabledProductionTargets.add(targetRef);
			}
		}
	}

	const currentRuntimeWithoutProductionRule = [...currentRuntimeRefs]
		.filter((targetRef) => !enabledProductionTargets.has(targetRef))
		.sort();
	const ownedTopicsWithoutEnabledProductionRule = [...knownTopicRefs]
		.filter((targetRef) => !enabledProductionTargets.has(targetRef))
		.sort();

	const productionRuntimeClusterMismatches: AlertRegistryReport["productionRuntimeClusterMismatches"] =
		[];
	for (const observation of registry.observations) {
		if (
			observation.configuredState !== "enabled" ||
			!PRODUCTION_ENVIRONMENTS.has(observation.environment)
		) {
			continue;
		}
		const rule = ruleById.get(observation.ruleId);
		if (!rule) continue;
		for (const targetRef of rule.monitoredRefs) {
			if (!targetRef.startsWith("app:") && !targetRef.startsWith("job:")) {
				continue;
			}
			const expectedCluster = knownRuntimeById.get(targetRef as ResourceId);
			if (expectedCluster && expectedCluster !== observation.environment) {
				productionRuntimeClusterMismatches.push({
					ruleId: rule.id,
					environment: observation.environment as "prod-gcp" | "prod-fss",
					targetRef: targetRef as ResourceId,
					expectedCluster,
				});
			}
		}
	}

	const nameCollisions = groupedRuleIds(registry.rules, ({ name }) => name).map(
		({ value, ruleIds }) => ({ name: value, ruleIds }),
	);
	const exactDuplicates = groupedRuleIds(registry.rules, (rule) =>
		JSON.stringify({
			expr: normalizeAlertExpression(rule.expr),
			holdFor: rule.holdFor,
			evaluationInterval: rule.evaluationInterval,
		}),
	).map(({ ruleIds }) => {
		const first = ruleById.get(ruleIds[0]);
		if (!first) throw new Error(`Mangler regel ${ruleIds[0]}.`);
		return {
			expr: normalizeAlertExpression(first.expr),
			holdFor: first.holdFor,
			evaluationInterval: first.evaluationInterval,
			ruleIds,
		};
	});
	const semanticFamilies = groupedRuleIds(
		registry.rules,
		({ semanticFamily }) => semanticFamily,
	).map(({ value, ruleIds }) => ({ family: value, ruleIds }));
	const missingRunbooks = registry.rules
		.filter(({ runbook }) => runbook.status === "missing")
		.map(({ id }) => id)
		.sort();
	const missingDashboards = registry.rules
		.filter(({ dashboard }) => dashboard.status === "missing")
		.map(({ id }) => id)
		.sort();
	const historicalSourceIds = new Set(
		registry.sources
			.filter(
				(source) =>
					source.kind === "repository" &&
					source.evidenceKind === "historical-source-snapshot",
			)
			.map(({ id }) => id),
	);
	const historicalSourceDeployments = registry.rules
		.filter(({ engine }) => engine === "prometheus-rule")
		.flatMap(({ id: ruleId, deployments }) =>
			deployments
				.filter(({ sourceRef }) => historicalSourceIds.has(sourceRef))
				.map(({ environment, sourceRef }) => ({
					ruleId,
					environment,
					sourceRef,
				})),
		)
		.sort((left, right) =>
			`${left.ruleId}|${left.environment}`.localeCompare(
				`${right.ruleId}|${right.environment}`,
			),
		);
	const deliveryAutomationGaps = registry.sources
		.filter(
			(source) =>
				source.kind === "repository" &&
				source.evidenceKind === "default-branch-snapshot" &&
				Boolean(source.deliveryAutomationFinding),
		)
		.map((source) => {
			if (
				source.kind !== "repository" ||
				source.evidenceKind !== "default-branch-snapshot" ||
				!source.deliveryAutomationFinding
			) {
				throw new Error(`Uventet kilde uten workflow-funn: ${source.id}.`);
			}
			const deployments = registry.rules.flatMap((rule) =>
				rule.deployments
					.filter(({ sourceRef }) => sourceRef === source.id)
					.map(({ environment }) => ({ ruleId: rule.id, environment })),
			);
			return {
				sourceRef: source.id,
				kind: source.deliveryAutomationFinding.kind,
				ruleIds: [...new Set(deployments.map(({ ruleId }) => ruleId))].sort(),
				environments: [
					...new Set(deployments.map(({ environment }) => environment)),
				].sort(),
				affectedDeployments: deployments.length,
			};
		})
		.sort((left, right) => left.sourceRef.localeCompare(right.sourceRef));
	const unresolvedNotificationChannels = registry.rules
		.filter(
			({ notification }) =>
				notification.kind === "grafana-contact-point" &&
				notification.channel.status === "unresolved",
		)
		.map(({ id }) => id)
		.sort();
	const unclassifiedSeverityDeployments = registry.rules
		.flatMap(({ id: ruleId, deployments }) =>
			deployments
				.filter(({ severity }) => severity === "unclassified")
				.map(({ environment }) => ({ ruleId, environment })),
		)
		.sort((left, right) =>
			`${left.ruleId}|${left.environment}`.localeCompare(
				`${right.ruleId}|${right.environment}`,
			),
		);

	if (currentRuntimeWithoutProductionRule.length > 0) {
		warnings.push(
			`${currentRuntimeWithoutProductionRule.length} aktive/migrerende runtimer har ingen dedikert enabled PrometheusRule i produksjon.`,
		);
	}
	if (ownedTopicsWithoutEnabledProductionRule.length > 0) {
		warnings.push(
			`${ownedTopicsWithoutEnabledProductionRule.length} team-eide topics har ingen dedikert enabled produksjonsregel.`,
		);
	}
	if (productionRuntimeClusterMismatches.length > 0) {
		warnings.push(
			`${productionRuntimeClusterMismatches.length} produksjonsinstanser peker til en runtime i et annet godkjent cluster.`,
		);
	}
	if (nameCollisions.length > 0) {
		warnings.push(
			`${nameCollisions.length} alertnavn kolliderer mellom regler.`,
		);
	}
	if (exactDuplicates.length > 0) {
		warnings.push(
			`${exactDuplicates.length} grupper har identisk uttrykk og tidskonfigurasjon.`,
		);
	}
	if (missingRunbooks.length > 0) {
		warnings.push(`${missingRunbooks.length} regler mangler runbook.`);
	}
	if (missingDashboards.length > 0) {
		warnings.push(
			`${missingDashboards.length} regler mangler diagnostisk dashboard.`,
		);
	}
	if (historicalSourceDeployments.length > 0) {
		warnings.push(
			`${historicalSourceDeployments.length} live PrometheusRule-instanser har historisk kilde-/deploygrunnlag i miljøet og må avstemmes som restinstanser.`,
		);
	}
	if (deliveryAutomationGaps.length > 0) {
		warnings.push(
			`${deliveryAutomationGaps.length} nåværende repo-kilder med ${deliveryAutomationGaps.reduce((sum, gap) => sum + gap.affectedDeployments, 0)} live instanser har kjente workflow-gap.`,
		);
	}
	if (unresolvedNotificationChannels.length > 0) {
		warnings.push(
			`${unresolvedNotificationChannels.length} Grafana-regler har kjent kontaktpunkt, men uavklart fysisk kanal.`,
		);
	}
	if (unclassifiedSeverityDeployments.length > 0) {
		warnings.push(
			`${unclassifiedSeverityDeployments.length} Grafana-instanser mangler klassifisert alvorlighet.`,
		);
	}

	return {
		errors,
		warnings,
		counts: {
			rules: registry.rules.length,
			prometheusRules: prometheusRules.length,
			grafanaRules: grafanaRules.length,
			instances: registry.observations.length,
			prometheusInstances: prometheusObservations.length,
			grafanaInstances: grafanaObservations.length,
			prometheusByEnvironment,
			paused: registry.observations.filter(
				({ configuredState }) => configuredState === "paused",
			).length,
			disabled: registry.observations.filter(
				({ configuredState }) => configuredState === "disabled",
			).length,
			firing: registry.observations.filter(
				({ evaluationState }) => evaluationState === "firing",
			).length,
			notFiring: registry.observations.filter(
				({ evaluationState }) => evaluationState === "not-firing",
			).length,
		},
		nameCollisions,
		exactDuplicates,
		semanticFamilies,
		currentRuntimeWithoutProductionRule,
		ownedTopicsWithoutEnabledProductionRule,
		productionRuntimeClusterMismatches,
		historicalSourceDeployments,
		deliveryAutomationGaps,
		unresolvedNotificationChannels,
		unclassifiedSeverityDeployments,
		missingRunbooks,
		missingDashboards,
	};
};

export const assertValidAlertRegistry = (registry: AlertRegistry) => {
	const report = buildAlertRegistryReport(registry);
	if (report.errors.length > 0) {
		throw new Error(`Ugyldig alert-register:\n- ${report.errors.join("\n- ")}`);
	}
	return report;
};
