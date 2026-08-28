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
