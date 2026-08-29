import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { reconcileAlertObservations } from "./drift.ts";
import type { AlertObservationSnapshot, AlertRegistry } from "./model.ts";
import { alertRegistry } from "./registry.ts";
import {
	assertValidAlertRegistry,
	buildAlertRegistryReport,
} from "./validation.ts";

const copyRegistry = () => structuredClone(alertRegistry) as AlertRegistry;

describe("alert-register", () => {
	test("avstemmer alle 39 PrometheusRule-instanser og to Grafana-regler", () => {
		const report = assertValidAlertRegistry(alertRegistry);

		assert.equal(report.counts.rules, 31);
		assert.equal(report.counts.prometheusRules, 29);
		assert.equal(report.counts.prometheusInstances, 39);
		assert.equal(report.counts.grafanaRules, 2);
		assert.equal(report.counts.grafanaInstances, 2);
		assert.deepEqual(report.counts.prometheusByEnvironment, {
			"dev-gcp": 7,
			"prod-gcp": 26,
			"prod-fss": 6,
		});
	});

	test("bevarer NAIS Inactive som enabled og not-firing", () => {
		const prometheusRuleIds = new Set(
			alertRegistry.rules
				.filter(({ engine }) => engine === "prometheus-rule")
				.map(({ id }) => id),
		);
		const observations = alertRegistry.observations.filter(({ ruleId }) =>
			prometheusRuleIds.has(ruleId),
		);

		assert.equal(observations.length, 39);
		assert.ok(
			observations.every(
				({ configuredState, evaluationState, evaluationHealth }) =>
					configuredState === "enabled" &&
					evaluationState === "not-firing" &&
					evaluationHealth === "unknown",
			),
		);
		assert.equal(
			alertRegistry.observations.filter(
				({ configuredState }) => configuredState === "disabled",
			).length,
			0,
		);
	});

	test("registrerer begge Grafana-reglene som faktisk pausede", () => {
		const report = assertValidAlertRegistry(alertRegistry);
		const grafanaRules = alertRegistry.rules.filter(
			({ engine }) => engine === "grafana-managed",
		);
		const kafkaRule = grafanaRules.find(
			({ id }) => id === "rule:grafana-kafka-offset",
		);

		assert.equal(report.counts.paused, 2);
		assert.equal(report.counts.firing, 0);
		assert.ok(kafkaRule);
		assert.equal(kafkaRule.semantic, "raw-consumer-offset");
		assert.match(kafkaRule.expr, /kafka_consumer_group_offset/);
		assert.ok(kafkaRule.riskNotes.some((note) => note.includes("46")));
		assert.equal(kafkaRule.policy.decision, "RETIRE");
		if (kafkaRule.policy.decision === "RETIRE") {
			assert.equal(kafkaRule.policy.retirementGate.status, "ready");
			if (kafkaRule.policy.retirementGate.status === "ready") {
				assert.equal(
					kafkaRule.policy.retirementGate.reviewedAt,
					"2026-08-29T09:45:02Z",
				);
				assert.equal(
					kafkaRule.policy.retirementGate.basis.kind,
					"justified-removal",
				);
				assert.ok(
					kafkaRule.policy.retirementGate.basis.evidence.some(
						({ href, summary }) =>
							href.endsWith("/team-esyfo/issues/212") &&
							summary.includes("definerer"),
					),
				);
			}
		}
		assert.ok(
			kafkaRule.riskNotes.some(
				(note) => note.includes("budstikka.v1") && note.includes("ni"),
			),
		);
		assert.equal(kafkaRule.notification.kind, "grafana-contact-point");
		if (kafkaRule.notification.kind === "grafana-contact-point") {
			assert.equal(kafkaRule.notification.channel.status, "unresolved");
		}
		const kafkaObservation = alertRegistry.observations.find(
			({ ruleId }) => ruleId === "rule:grafana-kafka-offset",
		);
		const varselObservation = alertRegistry.observations.find(
			({ ruleId }) => ruleId === "rule:grafana-varsel-avvik",
		);
		const varselRule = grafanaRules.find(
			({ id }) => id === "rule:grafana-varsel-avvik",
		);
		assert.ok(varselRule);
		assert.equal(varselRule.dashboard.status, "missing");
		assert.ok(
			varselRule.riskNotes.some((note) => note.includes("SM_MER_VEILEDNING")),
		);
		assert.equal(
			kafkaObservation?.observedDefinition.comparison,
			"semantic-match",
		);
		assert.match(
			kafkaObservation?.observedDefinition.normalizationNote ?? "",
			/query A og separat threshold-expression C/,
		);
		assert.equal(
			varselObservation?.observedDefinition.comparison,
			"exact-match",
		);
	});

	test("skiller dagens repo-kilder fra historisk provenance", () => {
		const repositorySources = alertRegistry.sources.filter(
			({ kind }) => kind === "repository",
		);

		assert.equal(repositorySources.length, 13);
		assert.equal(
			repositorySources.filter(
				({ evidenceKind }) => evidenceKind === "default-branch-snapshot",
			).length,
			11,
		);
		assert.equal(
			repositorySources.filter(
				({ evidenceKind }) => evidenceKind === "historical-source-snapshot",
			).length,
			2,
		);
		const historicalKinds = new Map(
			repositorySources
				.filter(
					(source) => source.evidenceKind === "historical-source-snapshot",
				)
				.map((source) => [
					source.id,
					source.evidenceKind === "historical-source-snapshot"
						? source.transition.kind
						: undefined,
				]),
		);
		assert.equal(historicalKinds.get("source:lps-mottak-prod"), "file-removed");
		assert.equal(
			historicalKinds.get("source:brukertilgang-fss-historical"),
			"deployment-superseded",
		);
		assert.deepEqual(
			new Map(
				repositorySources
					.filter(
						(source) => source.evidenceKind === "historical-source-snapshot",
					)
					.map((source) => [source.id, source.transition.cleanupIssue]),
			),
			new Map([
				["source:lps-mottak-prod", "navikt/lps-oppfolgingsplan-mottak#637"],
				["source:brukertilgang-fss-historical", "navikt/syfobrukertilgang#368"],
			]),
		);
		for (const source of repositorySources) {
			if (source.kind !== "repository") {
				assert.fail(`${source.id} skulle vært en repo-kilde.`);
			}
			assert.match(source.commitSha, /^[0-9a-f]{40}$/);
			assert.match(source.href, new RegExp(source.commitSha));
		}
	});

	test("holder migrering, retiring og sunset eksplisitt", () => {
		const lifecycleById = new Map(
			alertRegistry.rules.map(({ id, lifecycle }) => [id, lifecycle]),
		);

		assert.equal(
			lifecycleById.get("rule:esyfovarsel-down")?.state,
			"migrating",
		);
		assert.equal(
			lifecycleById.get("rule:dokumentporten-terminal-varsel-error")?.state,
			"migrating",
		);
		assert.equal(
			lifecycleById.get("rule:brukertilgang-down")?.state,
			"retiring",
		);
		assert.equal(
			lifecycleById.get("rule:lps-altinn-consumer-lag")?.state,
			"retiring",
		);
		assert.deepEqual(lifecycleById.get("rule:oppfolgingsplanservice-down"), {
			state: "sunset",
			sunsetOn: "2026-08-31",
			issue: "navikt/team-esyfo#208",
		});
	});

	test("vedtar én policy og én produksjonsrespons for alle 31 regler", () => {
		const report = assertValidAlertRegistry(alertRegistry);

		assert.equal(alertRegistry.schemaVersion, 2);
		assert.equal(alertRegistry.policy.decisionIssue, "navikt/team-esyfo#210");
		assert.deepEqual(report.policy.decisionCounts, {
			KEEP: 10,
			TUNE: 3,
			REPLACE: 5,
			RETIRE: 11,
			MIGRATE: 2,
			EXTERNAL_ONLY: 0,
		});
		assert.deepEqual(report.policy.tierCounts, {
			pager: 3,
			ticket: 21,
			"dashboard-only": 7,
		});
		assert.equal(
			Object.values(report.policy.decisionCounts).reduce(
				(sum, count) => sum + count,
				0,
			),
			alertRegistry.rules.length,
		);
		assert.ok(
			alertRegistry.rules.every(
				({ policy }) => policy.rationale.trim() && policy.owner.kind === "team",
			),
		);
	});

	test("skiller fasebundet policy fra faktisk varslingsrute", () => {
		const byId = new Map(alertRegistry.rules.map((rule) => [rule.id, rule]));
		const pagerCandidate = byId.get("rule:motebehov-down");
		const dashboardOnly = byId.get("rule:motebehov-http-4xx");

		assert.equal(pagerCandidate?.notification.kind, "nais-team-slack");
		assert.equal(
			pagerCandidate?.policy.operationalResponse.delivery.tier,
			"pager",
		);
		assert.equal(pagerCandidate?.policy.operationalResponse.phase, "after-tuning");
		assert.equal(dashboardOnly?.notification.kind, "nais-team-slack");
		assert.equal(
			dashboardOnly?.policy.operationalResponse.delivery.tier,
			"dashboard-only",
		);
		assert.equal(
			dashboardOnly?.policy.operationalResponse.phase,
			"until-retired",
		);
		assert.ok(
			alertRegistry.policy.guardrails.some((guardrail) =>
				guardrail.includes("lag > 0 alene kan ikke page"),
			),
		);
	});

	test("avklarer kanalene uten å gjøre Slack til pager eller eie Airflow", () => {
		const channels = new Map(
			alertRegistry.policy.channels.map((channel) => [channel.id, channel]),
		);

		assert.deepEqual(channels.get("channel:esyfo-alarm")?.allowedTiers, [
			"ticket",
		]);
		assert.equal(
			channels.get("channel:team-esyfo-pager")?.disposition,
			"planned",
		);
		assert.equal(
			channels.get("channel:esyfo-data-alert")?.disposition,
			"external-only",
		);
		assert.equal(
			channels.get("channel:esyfo-kibana-alerts")?.disposition,
			"no-new-alerts",
		);
	});

	test("låser kanal-ID til riktig eierskap, disposition og responsklasse", () => {
		const registry = copyRegistry();
		const dataChannel = registry.policy.channels.find(
			({ id }) => id === "channel:esyfo-data-alert",
		);
		assert.ok(dataChannel);
		Object.assign(dataChannel, {
			stewardship: "team-esyfo",
			disposition: "active",
			allowedTiers: ["ticket"],
		});

		assert.ok(
			buildAlertRegistryReport(registry).errors.some((error) =>
				error.includes("bryter den låste kanal-/eierskapskontrakten"),
			),
		);

		const activatedPager = copyRegistry();
		const pagerChannel = activatedPager.policy.channels.find(
			({ id }) => id === "channel:team-esyfo-pager",
		);
		assert.ok(pagerChannel);
		Object.assign(pagerChannel, {
			disposition: "active",
			verification: "verified",
		});
		assert.ok(
			!buildAlertRegistryReport(activatedPager).errors.some((error) =>
				error.includes("bryter den låste kanal-/eierskapskontrakten"),
			),
		);
	});

	test("avviser feil policyfase og repository-eier", () => {
		const wrongPhase = copyRegistry();
		wrongPhase.rules[0].policy.operationalResponse.phase =
			"retained-rule" as never;
		assert.ok(
			buildAlertRegistryReport(wrongPhase).errors.some((error) =>
				error.includes("REPLACE har feil operativ fase"),
			),
		);

		const wrongOwner = copyRegistry();
		if (wrongOwner.rules[0].policy.owner.kind !== "team") {
			assert.fail("Forventet teameier.");
		}
		wrongOwner.rules[0].policy.owner.repository = "navikt/definitely-not-owner";
		assert.ok(
			buildAlertRegistryReport(wrongOwner).errors.some((error) =>
				error.includes("eies av navikt/aktivitetskrav-backend"),
			),
		);
	});

	test("presenterer ingen pager-kandidat som klar før sikkerhetskravene er oppfylt", () => {
		const report = assertValidAlertRegistry(alertRegistry);

		assert.equal(report.policy.pagerCandidatesBlocked.length, 3);
		assert.ok(
			report.policy.pagerCandidatesBlocked.every(({ reasons }) =>
				reasons.includes("avbrytende kanal er ikke etablert og verifisert"),
			),
		);
		assert.ok(
			report.policy.pagerCandidatesBlocked.every(
				({ issues }) =>
					issues.includes("navikt/team-esyfo#211") &&
					issues.includes("navikt/team-esyfo#217"),
			),
		);
		assert.ok(
			alertRegistry.rules
				.filter(
					({ policy }) => policy.operationalResponse.delivery.tier === "pager",
				)
				.every(
					({ policy }) =>
						policy.operationalResponse.delivery.tier === "pager" &&
						policy.operationalResponse.delivery.activation === "blocked",
				),
		);
	});

	test("krever verifisert per-regel pagerrute og dev-isolasjon før ready", () => {
		const prepareCandidate = () => {
			const registry = copyRegistry();
			const pagerChannel = registry.policy.channels.find(
				({ id }) => id === "channel:team-esyfo-pager",
			);
			assert.ok(pagerChannel);
			Object.assign(pagerChannel, {
				disposition: "active",
				verification: "verified",
			});
			const rule = registry.rules.find(
				({ id }) => id === "rule:oppfolgingsplan-sykmelding-deserialization",
			);
			assert.ok(rule);
			rule.runbook = {
				status: "linked",
				href: "https://github.com/navikt/team-esyfo/issues/211",
				label: "Testet runbook",
			};
			rule.dashboard = {
				status: "linked",
				href: "https://github.com/navikt/team-esyfo/issues/211",
				label: "Diagnostisk dashboard",
			};
			const evidence = {
				href: "https://github.com/navikt/team-esyfo/issues/217",
				summary: "Kontrollert test av pager-rute.",
				verifiedAt: registry.policy.decidedAt,
			} as const;
			rule.policy.operationalResponse.delivery = {
				tier: "pager",
				channelPolicyRef: "channel:team-esyfo-pager",
				activation: "ready",
				activationEvidence: [evidence],
			};
			return { registry, rule, evidence };
		};

		const missingLiveProof = prepareCandidate();
		const missingLiveProofReport = buildAlertRegistryReport(
			missingLiveProof.registry,
		);
		assert.ok(
			missingLiveProofReport.errors.some((error) =>
				error.includes("er merket pager-klar med uløste sperrer"),
			),
		);
		const blocked = missingLiveProofReport.policy.pagerCandidatesBlocked.find(
			({ ruleId }) => ruleId === missingLiveProof.rule.id,
		);
		assert.ok(
			blocked?.reasons.includes(
				"per-regel produksjonsrute er ikke verifisert som pager",
			),
		);
		assert.ok(
			blocked?.reasons.includes(
				"dev-isolasjon fra produksjonspager er ikke verifisert",
			),
		);

		const fullyVerified = prepareCandidate();
		if (
			fullyVerified.rule.policy.operationalResponse.delivery.tier !== "pager" ||
			fullyVerified.rule.policy.operationalResponse.delivery.activation !== "ready"
		) {
			assert.fail("Forventet ready pager-kandidat.");
		}
		fullyVerified.rule.policy.operationalResponse.delivery.devIsolationEvidence =
			fullyVerified.evidence;
		fullyVerified.rule.notification = {
			kind: "verified-pager",
			channelPolicyRef: "channel:team-esyfo-pager",
			verifiedAt: fullyVerified.registry.policy.decidedAt,
			evidenceHref: fullyVerified.evidence.href,
		};
		const verifiedReport = buildAlertRegistryReport(fullyVerified.registry);
		assert.deepEqual(verifiedReport.errors, []);
		assert.ok(
			!verifiedReport.policy.pagerCandidatesBlocked.some(
				({ ruleId }) => ruleId === fullyVerified.rule.id,
			),
		);
		assert.ok(
			!verifiedReport.policy.implementationGaps.some(
				({ ruleId, kind }) =>
					ruleId === fullyVerified.rule.id &&
					(kind === "current-route-mismatch" ||
						kind === "dev-production-routing-unverified"),
			),
		);
	});

	test("avviser manglende beslutning, oppfølgingsissue og erstatning", () => {
		const missingPolicy = copyRegistry();
		delete (missingPolicy.rules[0] as Partial<AlertRegistry["rules"][number]>)
			.policy;
		assert.ok(
			buildAlertRegistryReport(missingPolicy).errors.some((error) =>
				error.includes("mangler én eksplisitt policybeslutning"),
			),
		);

		const missingIssue = copyRegistry();
		delete (
			missingIssue.rules[0].policy as unknown as {
				implementationIssue?: string;
			}
		).implementationIssue;
		assert.ok(
			buildAlertRegistryReport(missingIssue).errors.some((error) =>
				error.includes("mangler gyldig oppfølgingsissue"),
			),
		);

		const missingReplacement = copyRegistry();
		delete (
			missingReplacement.rules[0].policy as unknown as {
				replacement?: unknown;
			}
		).replacement;
		assert.ok(
			buildAlertRegistryReport(missingReplacement).errors.some((error) =>
				error.includes("REPLACE mangler erstatning"),
			),
		);
	});

	test("avviser retirement uten verifisert erstatning eller dokumentert bortfall", () => {
		const registry = copyRegistry();
		const rule = registry.rules.find(
			({ id }) => id === "rule:brukertilgang-down",
		);
		assert.ok(rule);
		if (rule.policy.decision !== "RETIRE") assert.fail("Forventet RETIRE.");
		rule.policy.retirementGate = {
			status: "ready",
			basis: {
				kind: "justified-removal",
				reason: "",
				evidence: [],
			},
		} as never;

		assert.ok(
			buildAlertRegistryReport(registry).errors.some((error) =>
				error.includes("mangler begrunnet og dokumentert retirement"),
			),
		);

		const invalidReview = copyRegistry();
		const reviewedRule = invalidReview.rules.find(
			({ id }) => id === "rule:grafana-kafka-offset",
		);
		assert.ok(reviewedRule);
		if (reviewedRule.policy.decision !== "RETIRE") {
			assert.fail("Forventet RETIRE.");
		}
		if (reviewedRule.policy.retirementGate.status !== "ready") {
			assert.fail("Forventet ready retirement.");
		}
		reviewedRule.policy.retirementGate.reviewedAt = "ugyldig" as never;
		assert.ok(
			buildAlertRegistryReport(invalidReview).errors.some((error) =>
				error.includes("ugyldig reviewtid for retirement"),
			),
		);
	});

	test("avviser dashboard-kanal, ugyldig ekstern overlevering og utrygg pager", () => {
		const dashboardWithChannel = copyRegistry();
		dashboardWithChannel.rules[3].policy.operationalResponse.delivery = {
			tier: "dashboard-only",
			channelPolicyRef: "channel:esyfo-alarm",
		} as never;
		assert.ok(
			buildAlertRegistryReport(dashboardWithChannel).errors.some((error) =>
				error.includes("dashboard-only, men har operativ kanal"),
			),
		);

		const invalidExternal = copyRegistry();
		invalidExternal.rules[6].policy = {
			...invalidExternal.rules[6].policy,
			decision: "EXTERNAL_ONLY",
			operationalResponse: {
				phase: "external",
				delivery: { tier: "dashboard-only" },
			},
			handoffEvidence: {
				href: "",
				summary: "",
				verifiedAt: alertRegistry.policy.decidedAt,
			},
		} as never;
		assert.ok(
			buildAlertRegistryReport(invalidExternal).errors.some((error) =>
				error.includes("ugyldig EXTERNAL_ONLY-overlevering"),
			),
		);

		const unsafePager = copyRegistry();
		const unsafeRule = unsafePager.rules[0];
		unsafeRule.policy = {
			decision: "KEEP",
			owner: unsafeRule.policy.owner,
			rationale: "Skal feilaktig page på lag.",
			operationalResponse: {
				phase: "retained-rule",
				delivery: {
					tier: "pager",
					channelPolicyRef: "channel:team-esyfo-pager",
					activation: "blocked",
					blockerIssues: ["navikt/team-esyfo#211"],
				},
			},
			decidedAt: alertRegistry.policy.decidedAt,
		};
		unsafeRule.semanticFamily = "renamed-family-must-not-bypass-safety";
		assert.ok(
			buildAlertRegistryReport(unsafePager).errors.some((error) =>
				error.includes("kan ikke page på rå loggrate, lag/offset"),
			),
		);
	});

	test("bevarer miljøspesifikk alvorlighet for outbox-reglene", () => {
		for (const ruleId of [
			"rule:oppfolgingsplan-outbox-oldest-due",
			"rule:oppfolgingsplan-outbox-persistent-failures",
		] as const) {
			const rule = alertRegistry.rules.find(({ id }) => id === ruleId);
			assert.ok(rule);
			assert.deepEqual(
				rule.deployments.map(({ environment, severity }) => ({
					environment,
					severity,
				})),
				[
					{ environment: "dev-gcp", severity: "warning" },
					{ environment: "prod-gcp", severity: "critical" },
				],
			);
		}
	});

	test("viser runtime-, topic- og clusterdrift uten å kalle det grønt", () => {
		const report = assertValidAlertRegistry(alertRegistry);

		assert.equal(report.currentRuntimeWithoutProductionRule.length, 18);
		assert.ok(
			report.currentRuntimeWithoutProductionRule.includes(
				"app:sykepengedager-informasjon",
			),
		);
		assert.ok(
			report.currentRuntimeWithoutProductionRule.includes(
				"app:lps-oppfolgingsplan-mottak",
			),
		);
		assert.equal(report.ownedTopicsWithoutEnabledProductionRule.length, 9);
		assert.ok(
			report.ownedTopicsWithoutEnabledProductionRule.includes(
				"topic:sykepengedager-informasjon-topic",
			),
		);
		assert.ok(
			report.ownedTopicsWithoutEnabledProductionRule.includes(
				"topic:varselbus",
			),
		);
		assert.equal(report.productionRuntimeClusterMismatches.length, 3);
		assert.ok(
			report.productionRuntimeClusterMismatches.every(
				({ targetRef, environment, expectedCluster }) =>
					targetRef === "app:syfobrukertilgang" &&
					environment === "prod-fss" &&
					expectedCluster === "prod-gcp",
			),
		);
		assert.equal(report.historicalSourceDeployments.length, 4);
		assert.ok(
			report.historicalSourceDeployments.some(
				({ ruleId, environment }) =>
					ruleId === "rule:lps-altinn-consumer-lag" &&
					environment === "prod-gcp",
			),
		);
		assert.equal(report.deliveryAutomationGaps.length, 3);
		assert.equal(
			report.deliveryAutomationGaps.reduce(
				(sum, gap) => sum + gap.affectedDeployments,
				0,
			),
			10,
		);
		assert.deepEqual(
			report.deliveryAutomationGaps.map(({ sourceRef }) => sourceRef),
			[
				"source:brukertilgang",
				"source:motebehov-prod",
				"source:oppfolgingsplanservice-prod",
			],
		);
		assert.equal(report.unresolvedNotificationChannels.length, 2);
	});

	test("synliggjør navnekollisjoner og semantiske familier uten å overdrive duplikater", () => {
		const report = assertValidAlertRegistry(alertRegistry);

		assert.equal(report.exactDuplicates.length, 0);
		assert.deepEqual(
			report.nameCollisions.map(({ name }) => name),
			["HIGH RATIO OF HTTP 4XX RESPONSE", "HIGH RATIO OF HTTP 5XX RESPONSE"],
		);
		assert.ok(
			report.semanticFamilies.some(
				({ family, ruleIds }) =>
					family === "legacy-lag-greater-than-zero" && ruleIds.length === 4,
			),
		);
	});

	test("skiller direkte måling fra targets som bare er berørt", () => {
		const byId = new Map(alertRegistry.rules.map((rule) => [rule.id, rule]));

		assert.deepEqual(byId.get("rule:esyfovarsel-down")?.monitoredRefs, [
			"app:esyfovarsel",
		]);
		assert.deepEqual(
			byId.get("rule:oppfolgingsplan-outbox-oldest-due")?.monitoredRefs,
			["app:syfo-oppfolgingsplan-backend"],
		);
		assert.deepEqual(
			byId.get("rule:budstikka-consumer-lag-warning")?.monitoredRefs,
			["app:syfo-budstikka", "topic:budstikka.v1"],
		);
	});

	test("krever ny live-attestasjon når kildeuttrykket endres", () => {
		const registry = copyRegistry();
		registry.rules[0].expr = `${registry.rules[0].expr} or vector(0)`;

		const report = buildAlertRegistryReport(registry);
		assert.ok(
			report.errors.some((error) => error.includes("har live-avvik i expr")),
		);
	});

	test("avviser når live-snapshotet feilaktig gjør Inactive til disabled", () => {
		const registry = copyRegistry();
		registry.observations[0].configuredState = "disabled";

		const report = buildAlertRegistryReport(registry);
		assert.ok(
			report.errors.some((error) =>
				error.includes("enabled/not-firing, ikke disabled"),
			),
		);
	});

	test("avviser deklarerte instanser uten tidsstemplet live-evidens", () => {
		const registry = copyRegistry();
		registry.observations.pop();

		const report = buildAlertRegistryReport(registry);
		assert.ok(
			report.errors.some((error) => error.includes("mangler live-observasjon")),
		);
	});

	test("rapporterer drift uten å tolke ordinær pending/firing som konfigurasjonsdrift", () => {
		const observations = structuredClone(alertRegistry.observations);
		for (const observation of observations) {
			observation.observedAt = "2026-08-28T18:00:00Z";
			observation.evaluationHealth = "ok";
		}
		observations[0].evaluationState = "firing";
		const clean = reconcileAlertObservations(
			alertRegistry,
			{
				schemaVersion: 1,
				observedAt: "2026-08-28T18:00:00Z",
				source: "synthetic-test",
				observations,
			},
			{ now: "2026-08-28T18:01:00Z" },
		);
		assert.equal(clean.status, "clean");

		observations[0].configuredState = "disabled";
		const drift = reconcileAlertObservations(
			alertRegistry,
			{
				schemaVersion: 1,
				observedAt: "2026-08-28T18:00:00Z",
				source: "synthetic-test",
				observations,
			},
			{ now: "2026-08-28T18:01:00Z" },
		);
		assert.equal(drift.status, "drift");
		assert.equal(drift.configuredStateChanges.length, 1);
	});

	test("rapporterer ukjent når konfigurasjonen matcher uten evaluatorhelsebevis", () => {
		const observations = structuredClone(alertRegistry.observations);
		for (const observation of observations) {
			observation.observedAt = "2026-08-28T18:00:00Z";
		}
		const report = reconcileAlertObservations(
			alertRegistry,
			{
				schemaVersion: 1,
				observedAt: "2026-08-28T18:00:00Z",
				source: "synthetic-test",
				observations,
			},
			{ now: "2026-08-28T18:01:00Z" },
		);

		assert.equal(report.status, "unknown");
		assert.equal(report.unknownEvaluationHealth.length, 41);
		assert.match(report.reason ?? "", /evaluatorhelse/);
	});

	test("oppdager endret live fingerprint og timing", () => {
		const observations = structuredClone(alertRegistry.observations);
		for (const observation of observations) {
			observation.observedAt = "2026-08-28T18:00:00Z";
		}
		observations[0].observedDefinition.expressionFingerprint =
			"fnv1a64:0000000000000000";
		observations[0].observedDefinition.holdFor = "11m";
		const report = reconcileAlertObservations(
			alertRegistry,
			{
				schemaVersion: 1,
				observedAt: "2026-08-28T18:00:00Z",
				source: "synthetic-test",
				observations,
			},
			{ now: "2026-08-28T18:01:00Z" },
		);

		assert.equal(report.status, "drift");
		assert.deepEqual(
			report.definitionChanges.map(({ field }) => field),
			["expr", "holdFor"],
		);
	});

	test("gjør stale live-snapshots ukjente", () => {
		const snapshot: AlertObservationSnapshot = {
			schemaVersion: 1,
			observedAt: alertRegistry.capturedAt,
			source: "synthetic-test",
			observations: alertRegistry.observations,
		};
		const report = reconcileAlertObservations(alertRegistry, snapshot, {
			now: "2026-08-30T18:00:00Z",
		});

		assert.equal(report.status, "unknown");
		assert.match(report.reason ?? "", /eldre enn/);
	});

	test("ferskt toppsnapshot kan ikke skjule en stale regelobservasjon", () => {
		const observations = structuredClone(alertRegistry.observations);
		observations[0].observedAt = "2025-01-01T00:00:00Z";
		const report = reconcileAlertObservations(
			alertRegistry,
			{
				schemaVersion: 1,
				observedAt: alertRegistry.capturedAt,
				source: "synthetic-test",
				observations,
			},
			{ now: "2026-08-28T17:46:00Z", maxAgeMinutes: 60 },
		);

		assert.equal(report.status, "unknown");
		assert.deepEqual(report.staleObservations, [
			"rule:aktivitetskrav-varsel-consumer-lag|prod-gcp",
		]);
	});

	test("regelobservasjon etter toppsnapshotet blir unknown", () => {
		const observations = structuredClone(alertRegistry.observations);
		observations[0].observedAt = "2026-08-28T18:00:00Z";
		const report = reconcileAlertObservations(
			alertRegistry,
			{
				schemaVersion: 1,
				observedAt: alertRegistry.capturedAt,
				source: "synthetic-test",
				observations,
			},
			{ now: "2026-08-28T17:46:00Z", maxAgeMinutes: 60 },
		);

		assert.equal(report.status, "unknown");
		assert.deepEqual(report.futureObservations, [
			"rule:aktivitetskrav-varsel-consumer-lag|prod-gcp",
		]);
	});
});
