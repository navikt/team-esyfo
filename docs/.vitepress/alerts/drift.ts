import type {
	AlertDriftReport,
	AlertObservation,
	AlertObservationSnapshot,
	AlertRegistry,
} from "./model.ts";

const key = (observation: Pick<AlertObservation, "ruleId" | "environment">) =>
	`${observation.ruleId}|${observation.environment}`;

const ageMinutes = (earlier: string, later: string) =>
	(new Date(later).getTime() - new Date(earlier).getTime()) / 60_000;

export const reconcileAlertObservations = (
	registry: AlertRegistry,
	snapshot: AlertObservationSnapshot,
	options: { now?: string; maxAgeMinutes?: number } = {},
): AlertDriftReport => {
	const now = options.now ?? new Date().toISOString();
	const maxAgeMinutes = options.maxAgeMinutes ?? 24 * 60;
	const unknown = (
		reason: string,
		staleObservations: string[] = [],
		futureObservations: string[] = [],
	): AlertDriftReport => ({
		status: "unknown",
		expectedInstances: registry.observations.length,
		observedInstances: snapshot.observations.length,
		missingInstances: [],
		unexpectedInstances: [],
		configuredStateChanges: [],
		definitionChanges: [],
		evaluationErrors: [],
		unknownEvaluationHealth: [],
		staleObservations,
		futureObservations,
		reason,
	});
	const snapshotAge = ageMinutes(snapshot.observedAt, now);
	if (
		!Number.isFinite(snapshotAge) ||
		snapshotAge < -5 ||
		snapshotAge > maxAgeMinutes
	) {
		return unknown(
			`Alert-snapshotet er ugyldig, i fremtiden eller eldre enn ${maxAgeMinutes} minutter.`,
		);
	}

	const expectedByKey = new Map(
		registry.observations.map((observation) => [key(observation), observation]),
	);
	const observedByKey = new Map(
		snapshot.observations.map((observation) => [key(observation), observation]),
	);
	if (observedByKey.size !== snapshot.observations.length) {
		return unknown(
			"Alert-snapshotet inneholder dupliserte regel-/miljønøkler.",
		);
	}

	const observationAge = (observation: AlertObservation) =>
		ageMinutes(observation.observedAt, now);
	const snapshotSkew = (observation: AlertObservation) =>
		ageMinutes(observation.observedAt, snapshot.observedAt);
	const futureObservations = snapshot.observations
		.filter(
			(observation) =>
				observationAge(observation) < -5 || snapshotSkew(observation) < -5,
		)
		.map(key)
		.sort();
	const futureObservationKeys = new Set(futureObservations);
	const staleObservations = snapshot.observations
		.filter(
			(observation) =>
				!futureObservationKeys.has(key(observation)) &&
				(!Number.isFinite(observationAge(observation)) ||
					!Number.isFinite(snapshotSkew(observation)) ||
					observationAge(observation) > maxAgeMinutes ||
					snapshotSkew(observation) > 5),
		)
		.map(key)
		.sort();
	if (staleObservations.length > 0 || futureObservations.length > 0) {
		return unknown(
			"Alert-snapshotet inneholder gamle, ugyldige eller tidsmessig inkonsistente regelobservasjoner.",
			staleObservations,
			futureObservations,
		);
	}

	const missingInstances = [...expectedByKey.keys()]
		.filter((instance) => !observedByKey.has(instance))
		.sort();
	const unexpectedInstances = [...observedByKey.keys()]
		.filter((instance) => !expectedByKey.has(instance))
		.sort();
	const configuredStateChanges: AlertDriftReport["configuredStateChanges"] = [];
	const definitionChanges: AlertDriftReport["definitionChanges"] = [];
	for (const [instance, expected] of expectedByKey) {
		const observed = observedByKey.get(instance);
		if (observed && observed.configuredState !== expected.configuredState) {
			configuredStateChanges.push({
				instance,
				expected: expected.configuredState,
				observed: observed.configuredState,
			});
		}
		if (!observed) continue;
		for (const [field, expectedValue, observedValue] of [
			[
				"expr",
				expected.observedDefinition.expressionFingerprint,
				observed.observedDefinition.expressionFingerprint,
			],
			[
				"holdFor",
				expected.observedDefinition.holdFor,
				observed.observedDefinition.holdFor,
			],
			[
				"evaluationInterval",
				expected.observedDefinition.evaluationInterval,
				observed.observedDefinition.evaluationInterval,
			],
		] as const) {
			if (expectedValue !== observedValue) {
				definitionChanges.push({
					instance,
					field,
					expected: expectedValue,
					observed: observedValue,
				});
			}
		}
	}
	const evaluationErrors = snapshot.observations
		.filter(({ evaluationHealth }) => evaluationHealth === "error")
		.map(key)
		.sort();
	const unknownEvaluationHealth = snapshot.observations
		.filter(({ evaluationHealth }) => evaluationHealth === "unknown")
		.map(key)
		.sort();
	const hasDrift =
		missingInstances.length > 0 ||
		unexpectedInstances.length > 0 ||
		configuredStateChanges.length > 0 ||
		definitionChanges.length > 0 ||
		evaluationErrors.length > 0;

	return {
		status: hasDrift
			? "drift"
			: unknownEvaluationHealth.length > 0
				? "unknown"
				: "clean",
		expectedInstances: expectedByKey.size,
		observedInstances: observedByKey.size,
		missingInstances,
		unexpectedInstances,
		configuredStateChanges,
		definitionChanges,
		evaluationErrors,
		unknownEvaluationHealth,
		staleObservations: [],
		futureObservations: [],
		reason:
			!hasDrift && unknownEvaluationHealth.length > 0
				? "Konfigurasjonen matcher, men evaluatorhelse er ikke eksponert for alle instanser."
				: undefined,
	};
};
