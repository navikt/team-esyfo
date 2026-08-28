<script setup lang="ts">
import type {
	AlertEnvironment,
	AlertLifecycle,
	AlertRule,
	AlertSource,
} from "../alerts/model.ts";
import {
	alertRegistry,
	NAIS_ALERTS_URL,
	NAIS_APPLICATIONS_URL,
	NAIS_SETTINGS_URL,
} from "../alerts/registry.ts";
import { buildAlertRegistryReport } from "../alerts/validation.ts";

const report = buildAlertRegistryReport(alertRegistry);
const ruleById = new Map(alertRegistry.rules.map((rule) => [rule.id, rule]));
const sourceById = new Map(
	alertRegistry.sources.map((source) => [source.id, source]),
);
const observationsByRule = new Map(
	alertRegistry.rules.map((rule) => [
		rule.id,
		alertRegistry.observations.filter(
			(observation) => observation.ruleId === rule.id,
		),
	]),
);

const environments = [
	{ id: "dev-gcp", label: "Utvikling" },
	{ id: "prod-gcp", label: "Produksjon GCP" },
	{ id: "prod-fss", label: "Produksjon FSS" },
] as const satisfies ReadonlyArray<{
	id: AlertEnvironment;
	label: string;
}>;

const lifecycleSections = [
	{
		state: "permanent",
		label: "Varig",
		description: "Regler som skal inngå i den langsiktige alert-policyen.",
	},
	{
		state: "migrating",
		label: "Migrerer",
		description: "Midlertidige guardrails mens varsling flyttes til Budstikka.",
	},
	{
		state: "retiring",
		label: "Fases ut",
		description:
			"Regler med en eksplisitt oppryddingsavhengighet før de fjernes.",
	},
	{
		state: "sunset",
		label: "Avvikles",
		description: "Skal fjernes når syfooppfolgingsplanservice er borte.",
	},
] as const;

const lifecycleGroups = lifecycleSections.map((section) => ({
	...section,
	rules: alertRegistry.rules.filter(
		({ lifecycle }) => lifecycle.state === section.state,
	),
}));

const kafkaOffsetRule = alertRegistry.rules.find(
	({ id }) => id === "rule:grafana-kafka-offset",
);

type RepositorySource = Extract<AlertSource, { kind: "repository" }>;
type HistoricalRepositorySource = Extract<
	AlertSource,
	{ evidenceKind: "historical-source-snapshot" }
>;

const repositorySources = alertRegistry.sources.filter(
	(source): source is RepositorySource => source.kind === "repository",
);
const currentRepositorySources = repositorySources.filter(
	({ evidenceKind }) => evidenceKind === "default-branch-snapshot",
);
const historicalSources = repositorySources.filter(
	(source): source is HistoricalRepositorySource =>
		source.evidenceKind === "historical-source-snapshot",
);
const historicalSourceFindings = historicalSources.map((source) => ({
	source,
	deployments: report.historicalSourceDeployments
		.filter(({ sourceRef }) => sourceRef === source.id)
		.map((deployment) => ({
			...deployment,
			rule: ruleById.get(deployment.ruleId),
		})),
}));

const issueUrl = (issue: string) => {
	const [repository, number] = issue.split("#");
	return `https://github.com/${repository}/issues/${number}`;
};

const shortId = (id: string) => id.replace(/^(rule|app|job|topic):/, "");

const targetRole = (
	rule: AlertRule,
	target: AlertRule["targetRefs"][number],
) => (rule.monitoredRefs.includes(target) ? "målt" : "berørt");

const engineLabel = (engine: AlertRule["engine"]) =>
	engine === "prometheus-rule" ? "PrometheusRule" : "Grafana-managed";

const lifecycleLabel = (lifecycle: AlertLifecycle) => {
	switch (lifecycle.state) {
		case "permanent":
			return "Varig";
		case "migrating":
			return `Migrerer innen ${lifecycle.targetDate}`;
		case "retiring":
			return "Fases ut";
		case "sunset":
			return `Avvikles ${lifecycle.sunsetOn}`;
	}
};

const lifecycleDetail = (lifecycle: AlertLifecycle) => {
	switch (lifecycle.state) {
		case "permanent":
			return "Ingen planlagt sluttdato.";
		case "migrating":
			return `Mål: ${lifecycle.targetRefs.map(shortId).join(", ")}.`;
		case "retiring":
			return lifecycle.reason;
		case "sunset":
			return `Besluttet sluttdato ${lifecycle.sunsetOn}.`;
	}
};

const lifecycleIssue = (lifecycle: AlertLifecycle) =>
	lifecycle.state === "permanent" ? undefined : lifecycle.issue;

const sourceLabel = (source: AlertSource) =>
	source.kind === "repository"
		? `${source.repository}/${source.path}`
		: `Grafana · ${source.group}`;

const sourceMeta = (source: AlertSource) =>
	source.kind === "repository"
		? source.evidenceKind === "historical-source-snapshot"
			? `historisk kilde ${source.commitSha.slice(0, 12)} · ${source.transition.kind === "file-removed" ? "slettet" : "erstattet"} ${source.transition.occurredAt.slice(0, 10)}`
			: `${source.deliveryAutomationFinding ? "workflow-gap" : "default branch ved kartlegging"} · ${source.commitSha.slice(0, 12)}`
		: `UID ${source.uid} · oppdatert ${source.lastUpdatedAt.slice(0, 10)}`;

const sourceKindLabel = (source: AlertSource) => {
	if (source.kind === "grafana") return "Grafana";
	return source.evidenceKind === "historical-source-snapshot"
		? "Historisk repository"
		: "Repository-snapshot";
};

const ruleSources = (rule: AlertRule) =>
	[...new Set(rule.deployments.map(({ sourceRef }) => sourceRef))]
		.map((sourceRef) => sourceById.get(sourceRef))
		.filter((source): source is AlertSource => Boolean(source));

const deploymentObservation = (
	rule: AlertRule,
	environment: AlertEnvironment,
) =>
	observationsByRule
		.get(rule.id)
		?.find((candidate) => candidate.environment === environment);

const deploymentState = (rule: AlertRule, environment: AlertEnvironment) => {
	const observation = deploymentObservation(rule, environment);
	if (!observation) return undefined;
	return `${observation.configuredState} · ${observation.evaluationState} · helse ${observation.evaluationHealth}`;
};

const deploymentStateClass = (
	rule: AlertRule,
	environment: AlertEnvironment,
) => {
	const observation = deploymentObservation(rule, environment);
	if (!observation) return "is-unknown";
	if (observation.configuredState === "paused") return "is-paused";
	if (observation.evaluationState === "firing") return "is-firing";
	if (observation.evaluationState === "pending") return "is-pending";
	if (observation.evaluationState === "not-firing") return "is-not-firing";
	return "is-unknown";
};

const routeLabel = (rule: AlertRule) =>
	rule.notification.kind === "nais-team-slack"
		? rule.notification.channel
		: `${rule.notification.contactPoint} · fysisk kanal uavklart`;

const automationFindingLabel = (
	kind: (typeof report.deliveryAutomationGaps)[number]["kind"],
) =>
	kind === "path-filter-mismatch"
		? "path-filter matcher ikke alertfilen"
		: "alertfilen refereres ikke av workflowen";

const automationWorkflowHref = (sourceRef: AlertSource["id"]) => {
	const source = sourceById.get(sourceRef);
	return source?.kind === "repository" &&
		source.evidenceKind === "default-branch-snapshot"
		? source.deliveryAutomationFinding?.workflowHref
		: undefined;
};

const transitionLabel = (source: HistoricalRepositorySource) =>
	source.transition.kind === "file-removed"
		? "Fil og deploygrunnlag fjernet"
		: "Workflow-cluster flyttet";

const transitionLinkLabel = (source: HistoricalRepositorySource) =>
	source.transition.kind === "file-removed"
		? "Commit som fjernet filen"
		: "Commit som flyttet deployen";

const linkLabel = (status: AlertRule["runbook"] | AlertRule["dashboard"]) => {
	if (status.status === "linked") return status.label;
	if (status.status === "missing") return `Mangler · ${status.issue}`;
	return status.reason;
};
</script>

<template>
<div class="alert-register">
	<header class="register-header">
		<div>
			<p class="eyebrow">Team eSyfo · verifisert snapshot · {{ alertRegistry.capturedAt }}</p>
			<h2>Alert-register</h2>
			<p>
				Én sporbar oversikt over definisjon, deployert instans, observert tilstand,
				livssyklus og operativ oppfølging.
			</p>
		</div>
		<div class="header-stamp" aria-label="Registerstatus">
			<strong>{{ report.counts.rules }}</strong>
			<span>regler</span>
			<small>schema v{{ alertRegistry.schemaVersion }}</small>
		</div>
	</header>

	<div v-if="report.errors.length === 0" class="integrity-line">
		<span aria-hidden="true">✓</span>
		Registeret er internt konsistent. Det betyr ikke at alle regler er gode eller at evaluatorene er friske.
	</div>
	<div v-else class="integrity-line integrity-line--error">
		<strong>{{ report.errors.length }} valideringsfeil</strong>
		<ul><li v-for="error in report.errors" :key="error">{{ error }}</li></ul>
	</div>

	<section aria-labelledby="alert-state-heading">
		<div class="section-heading">
			<div>
				<p class="section-number">01 / Faktisk konfigurasjon</p>
				<h2 id="alert-state-heading">Hva er på, og hva er pauset?</h2>
			</div>
			<a :href="NAIS_ALERTS_URL">Åpne live NAIS-alerts ↗</a>
		</div>

		<div class="state-grid">
			<article class="state-card state-card--enabled">
				<span class="card-kicker">Prometheus</span>
				<strong>{{ report.counts.prometheusInstances }}</strong>
				<h3>observerte instanser</h3>
				<p>{{ report.counts.notFiring }} var <code>not-firing</code>; query og <code>for</code> matcher kilden, men evaluatorhelse er ukjent.</p>
			</article>
			<article class="state-card state-card--paused">
				<span class="card-kicker">Grafana</span>
				<strong>{{ report.counts.paused }}</strong>
				<h3>pausede regler</h3>
				<p>Begge er <code>paused / not-evaluated</code>; fysisk kanal og alvorlighet er uavklart.</p>
			</article>
			<article class="state-card">
				<span class="card-kicker">Deaktivert</span>
				<strong>{{ report.counts.disabled }}</strong>
				<h3>disabled-instanser</h3>
				<p>NAIS-statusen <code>Inactive</code> er ikke det samme som deaktivert.</p>
			</article>
			<article class="state-card state-card--route">
				<span class="card-kicker">Primærrute</span>
				<strong class="route-name">#esyfo-alarm</strong>
				<h3>for NAIS-regler</h3>
				<p><a :href="NAIS_SETTINGS_URL">Verifisert i teaminnstillingene ↗</a></p>
			</article>
		</div>

		<div class="meaning-note">
			<div class="meaning-mark" aria-hidden="true">≠</div>
			<div>
				<h3><code>Inactive</code> betyr ikke <code>disabled</code></h3>
				<p>
					Alle {{ report.counts.prometheusInstances }} Prometheus-instanser var konfigurert
					<code>enabled</code>. NAIS viste <code>Inactive</code>, som betyr at ingen alertinstans
					fyrte ved snapshotet. Det beviser verken at evalueringen er frisk eller at signalet er godt.
				</p>
			</div>
		</div>

		<div class="environment-grid" aria-label="Prometheus-instanser per miljø">
			<div v-for="environment in environments" :key="environment.id" class="environment-row">
				<div>
					<strong>{{ environment.label }}</strong>
					<code>{{ environment.id }}</code>
				</div>
				<div class="environment-bar" aria-hidden="true">
					<span :style="{ width: `${(report.counts.prometheusByEnvironment[environment.id] / report.counts.prometheusInstances) * 100}%` }" />
				</div>
				<strong>{{ report.counts.prometheusByEnvironment[environment.id] }}</strong>
			</div>
		</div>
	</section>

	<section class="risk-section" aria-labelledby="kafka-risk-heading">
		<div class="risk-signal" aria-hidden="true">!</div>
		<div>
			<p class="section-number">02 / Må ikke reaktiveres blindt</p>
			<h2 id="kafka-risk-heading">Kafka-regelen måler offset, ikke lag</h2>
			<p>
				Den pausede Grafana-regelen heter «Esyfo Kafka consumer lag more than 15 min», men
				uttrykket sammenligner absolutt consumer-offset med 100. Live preview viste
				<strong>46 serier over terskelen</strong>. Aktivering ville derfor gitt støy, ikke en
				typekorrekt alarm om fastlåst behandling.
			</p>
			<div class="risk-actions">
				<a v-if="kafkaOffsetRule" :href="ruleSources(kafkaOffsetRule)[0]?.href">Se pauset regel ↗</a>
				<a :href="issueUrl('navikt/team-esyfo#212')">Erstatt med topic-kontrakt i #212 ↗</a>
			</div>
		</div>
	</section>

	<section class="orphan-section" aria-labelledby="orphan-heading">
		<div class="orphan-label">SOURCE DRIFT</div>
		<div>
			<p class="section-number">03 / Kildekodedrift og opprydding</p>
			<h2 id="orphan-heading">{{ report.historicalSourceDeployments.length }} live instanser har historisk kildegrunnlag</h2>
			<p>
				{{ historicalSources.length }} tidligere kilde-/clustergrunnlag gjelder ikke lenger, men
				tilhørende PrometheusRule-instanser er fortsatt observert i NAIS. Historisk SHA
				forklarer hvor de kom fra; den er ikke en nåværende definisjon eller deploy-bevis.
			</p>
			<div class="orphan-findings">
				<article v-for="finding in historicalSourceFindings" :key="finding.source.id">
					<div class="orphan-finding__heading">
						<strong>{{ sourceLabel(finding.source) }}</strong>
						<span>{{ finding.deployments.length }} live {{ finding.deployments.length === 1 ? "instans" : "instanser" }}</span>
					</div>
					<p>
						Siste relevante kilde: <code>{{ finding.source.commitSha.slice(0, 12) }}</code>.
						{{ transitionLabel(finding.source) }} {{ finding.source.transition.occurredAt.slice(0, 10) }} i
						<code>{{ finding.source.transition.commitSha.slice(0, 12) }}</code>.
						{{ finding.source.transition.summary }}
					</p>
					<ul>
						<li v-for="deployment in finding.deployments" :key="`${deployment.ruleId}-${deployment.environment}`">
							<strong>{{ deployment.rule?.name ?? shortId(deployment.ruleId) }}</strong>
							<code>{{ deployment.environment }} · enabled / inactive</code>
							<small v-if="deployment.rule">{{ lifecycleDetail(deployment.rule.lifecycle) }}</small>
						</li>
					</ul>
					<div class="risk-actions">
						<a :href="finding.source.href">Siste gyldige fil ↗</a>
						<a :href="finding.source.transition.href">{{ transitionLinkLabel(finding.source) }} ↗</a>
					</div>
				</article>
			</div>
			<a class="orphan-live-link" :href="NAIS_ALERTS_URL">Verifiser og rydd instansene i NAIS ↗</a>
		</div>
	</section>

	<section aria-labelledby="lifecycle-heading">
		<div class="section-heading">
			<div>
				<p class="section-number">04 / Livssyklus</p>
				<h2 id="lifecycle-heading">Ikke invester likt i alt som finnes</h2>
			</div>
		</div>
		<div class="lifecycle-grid">
			<article
				v-for="group in lifecycleGroups"
				:key="group.state"
				class="lifecycle-card"
				:class="`lifecycle-card--${group.state}`"
			>
				<div class="lifecycle-card__heading">
					<span>{{ group.label }}</span>
					<strong>{{ group.rules.length }}</strong>
				</div>
				<p>{{ group.description }}</p>
				<ul>
					<li v-for="rule in group.rules" :key="rule.id">
						<code>{{ shortId(rule.id) }}</code>
						<small>{{ lifecycleDetail(rule.lifecycle) }}</small>
						<a
							v-if="lifecycleIssue(rule.lifecycle)"
							:href="issueUrl(lifecycleIssue(rule.lifecycle)!)"
						>
							{{ lifecycleIssue(rule.lifecycle) }}
						</a>
					</li>
				</ul>
			</article>
		</div>
	</section>

	<section aria-labelledby="patterns-heading">
		<div class="section-heading">
			<div>
				<p class="section-number">05 / Porteføljemønstre</p>
				<h2 id="patterns-heading">Like navn skjuler ulike runtimer</h2>
			</div>
		</div>
		<div class="pattern-grid">
			<article class="pattern-panel">
				<div class="panel-title">
					<h3>Eksakte definisjonsduplikater</h3>
					<span>{{ report.exactDuplicates.length }}</span>
				</div>
				<p>Samme normaliserte uttrykk, <code>for</code> og evalueringsintervall.</p>
				<p v-if="report.exactDuplicates.length === 0" class="empty-finding">Ingen funnet i snapshotet.</p>
				<div
					v-for="duplicate in report.exactDuplicates"
					:key="`${duplicate.expr}|${duplicate.holdFor ?? ''}|${duplicate.evaluationInterval ?? ''}`"
					class="pattern-group"
				>
					<div class="tag-list">
						<code v-for="ruleId in duplicate.ruleIds" :key="ruleId">{{ shortId(ruleId) }}</code>
					</div>
				</div>
			</article>
			<article class="pattern-panel">
				<div class="panel-title">
					<h3>Kolliderende alertnavn</h3>
					<span>{{ report.nameCollisions.length }}</span>
				</div>
				<p>Navnet alene identifiserer ikke hvilken runtime som alarmerer.</p>
				<div v-for="collision in report.nameCollisions" :key="collision.name" class="pattern-group">
					<strong>{{ collision.name }}</strong>
					<div class="tag-list">
						<code v-for="ruleId in collision.ruleIds" :key="ruleId">{{ shortId(ruleId) }}</code>
					</div>
				</div>
			</article>
			<article class="pattern-panel">
				<div class="panel-title">
					<h3>Delte semantiske familier</h3>
					<span>{{ report.semanticFamilies.length }}</span>
				</div>
				<p>Disse gruppene bør vurderes samlet når policy og terskler standardiseres.</p>
				<div v-for="family in report.semanticFamilies" :key="family.family" class="pattern-group">
					<strong><code>{{ family.family }}</code></strong>
					<span>{{ family.ruleIds.length }} regler</span>
				</div>
			</article>
		</div>
	</section>

	<section aria-labelledby="gaps-heading">
		<div class="section-heading">
			<div>
				<p class="section-number">06 / Dekningsgap</p>
				<h2 id="gaps-heading">Registrert betyr ikke komplett</h2>
			</div>
			<a :href="issueUrl(alertRegistry.policyIssue)">Policyarbeid {{ alertRegistry.policyIssue }} ↗</a>
		</div>
		<div class="gap-grid">
			<details class="gap-card" open>
				<summary><strong>{{ report.currentRuntimeWithoutProductionRule.length }}</strong> runtimer uten dedikert prodregel</summary>
				<div class="tag-list tag-list--roomy">
					<code v-for="target in report.currentRuntimeWithoutProductionRule" :key="target">{{ shortId(target) }}</code>
				</div>
			</details>
			<details class="gap-card" open>
				<summary><strong>{{ report.ownedTopicsWithoutEnabledProductionRule.length }}</strong> topics uten enabled prodregel</summary>
				<div class="tag-list tag-list--roomy">
					<code v-for="target in report.ownedTopicsWithoutEnabledProductionRule" :key="target">{{ shortId(target) }}</code>
				</div>
			</details>
			<article class="gap-card gap-card--mismatch">
				<h3><strong>{{ report.productionRuntimeClusterMismatches.length }}</strong> cluster-mismatch</h3>
				<p>
					Tre <code>syfobrukertilgang</code>-regler finnes i <code>prod-fss</code>, mens godkjent
					runtimeinventar og <a :href="NAIS_APPLICATIONS_URL">live applikasjonsliste</a>
					viser <code>prod-gcp</code>. Dette er
					bekreftet restkonfigurasjon fra GCP-migreringen og skal ryddes kontrollert.
				</p>
				<ul>
					<li v-for="mismatch in report.productionRuntimeClusterMismatches" :key="`${mismatch.ruleId}-${mismatch.environment}`">
						<code>{{ shortId(mismatch.ruleId) }}</code>: {{ mismatch.environment }} → forventet {{ mismatch.expectedCluster }}
					</li>
				</ul>
			</article>
			<article class="gap-card gap-card--mismatch">
				<h3>
					<strong>{{ report.deliveryAutomationGaps.length }}</strong> workflow-gap ·
					{{ report.deliveryAutomationGaps.reduce((sum, gap) => sum + gap.affectedDeployments, 0) }} live instanser
				</h3>
				<p>
					Kildefilene finnes på default branch, men dagens GitHub Actions-kobling sørger ikke
					for pålitelig redeploy når de endres.
				</p>
				<ul>
					<li v-for="gap in report.deliveryAutomationGaps" :key="gap.sourceRef">
						<a :href="automationWorkflowHref(gap.sourceRef)">
							<code>{{ gap.sourceRef.replace('source:', '') }}</code>
						</a>:
						{{ automationFindingLabel(gap.kind) }} · {{ gap.affectedDeployments }} instanser
					</li>
				</ul>
			</article>
			<article class="gap-card gap-card--links">
				<div>
					<strong>{{ report.missingRunbooks.length }}</strong>
					<span>regler mangler runbook</span>
				</div>
				<div>
					<strong>{{ report.missingDashboards.length }}</strong>
					<span>regler mangler diagnostisk dashboard</span>
				</div>
				<div>
					<strong>{{ report.unclassifiedSeverityDeployments.length }}</strong>
					<span>Grafana-instanser mangler alvorlighet</span>
				</div>
				<p>Gap er beholdt som eksplisitt status og blir aldri presentert som grønn dekning.</p>
			</article>
		</div>
	</section>

	<section aria-labelledby="sources-heading">
		<div class="section-heading">
			<div>
				<p class="section-number">07 / Evidens</p>
				<h2 id="sources-heading">Pinnet kildegrunnlag</h2>
			</div>
			<span>{{ currentRepositorySources.length }} default branch · {{ historicalSources.length }} historiske · {{ alertRegistry.sources.length - repositorySources.length }} Grafana</span>
		</div>
		<div class="source-caveat">
			<strong>Repo-SHA er ikke deploy-bevis.</strong>
			For vanlige repo-snapshots pinner SHA-en alertdefinisjonen som lå på default branch ved
			kartleggingstid. Slettede eller erstattede deploygrunnlag er eksplisitt merket som
			historiske kilder.
			Live query og <code>for</code> ble manuelt avstemt for alle 39 NAIS-instanser og lagret
			som fingerprint/timing-attestasjon. NAIS injiserer cluster-label og kan omorganisere
			matchere; dette er derfor en semantisk kontroll, ikke en automatisk PromQL-canonicalizer
			eller bevis på eksakt deployed commit. Det finnes ingen påstand om at alle
			Prometheus-reglene fortsatt styres av dagens default branch.
			<strong>Tre nåværende kilder har i tillegg eksplisitte workflow-gap.</strong>
		</div>
		<div class="source-grid">
			<a
				v-for="source in alertRegistry.sources"
				:key="source.id"
				:href="source.href"
				class="source-card"
				:class="{ 'source-card--historical': source.kind === 'repository' && source.evidenceKind === 'historical-source-snapshot' }"
			>
				<span>{{ sourceKindLabel(source) }}</span>
				<strong>{{ sourceLabel(source) }}</strong>
				<small>{{ sourceMeta(source) }}</small>
			</a>
		</div>
	</section>

	<section aria-labelledby="rules-heading">
		<div class="section-heading">
			<div>
				<p class="section-number">08 / Regeloversikt</p>
				<h2 id="rules-heading">Alle deklarerte regler</h2>
			</div>
			<span>{{ report.counts.rules }} registrerte regler · {{ report.counts.instances }} instanser</span>
		</div>
		<div class="table-scroll">
			<table aria-labelledby="rules-heading">
				<thead>
					<tr>
						<th scope="col">Regel / motor</th>
						<th scope="col">Semantikk</th>
						<th scope="col">Berørt / direkte målt</th>
						<th scope="col">Livssyklus</th>
						<th scope="col">Deploy / observert tilstand</th>
						<th scope="col">Ruting / oppfølging</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="rule in alertRegistry.rules" :key="rule.id">
						<th scope="row" class="rule-cell">
							<strong>{{ rule.name }}</strong>
							<code>{{ shortId(rule.id) }}</code>
							<small>{{ engineLabel(rule.engine) }}</small>
							<details>
								<summary>Vis uttrykk og kilde</summary>
								<pre>{{ rule.expr }}</pre>
								<a v-for="source in ruleSources(rule)" :key="source.id" :href="source.href">
									{{ sourceLabel(source) }} ↗
								</a>
							</details>
						</th>
						<td>
							<code>{{ rule.semantic }}</code>
							<small>{{ rule.semanticFamily }}</small>
						</td>
						<td>
							<div class="target-list">
								<code v-for="target in rule.targetRefs" :key="target">{{ targetRole(rule, target) }}: {{ shortId(target) }}</code>
								<span v-for="target in rule.externalTargets" :key="target">ekstern: {{ target }}</span>
							</div>
						</td>
						<td>
							<span class="lifecycle-pill" :class="`lifecycle-pill--${rule.lifecycle.state}`">
								{{ lifecycleLabel(rule.lifecycle) }}
							</span>
						</td>
						<td>
							<div v-for="deployment in rule.deployments" :key="deployment.environment" class="deployment-line">
								<code>{{ deployment.environment }}</code>
								<span :class="deploymentStateClass(rule, deployment.environment)">
									{{ deploymentState(rule, deployment.environment) }}
								</span>
								<small :class="`severity-${deployment.severity}`">{{ deployment.severity }}</small>
							</div>
						</td>
						<td>
							<strong>{{ routeLabel(rule) }}</strong>
							<a
								v-if="rule.runbook.status === 'linked'"
								:href="rule.runbook.href"
							>
								Runbook: {{ linkLabel(rule.runbook) }}
							</a>
							<a
								v-else-if="rule.runbook.status === 'missing'"
								class="missing-link"
								:href="issueUrl(rule.runbook.issue)"
							>
								Runbook: {{ linkLabel(rule.runbook) }}
							</a>
							<span v-else>Runbook: {{ linkLabel(rule.runbook) }}</span>
							<a
								v-if="rule.dashboard.status === 'linked'"
								:href="rule.dashboard.href"
							>
								Dashboard: {{ linkLabel(rule.dashboard) }}
							</a>
							<a
								v-else-if="rule.dashboard.status === 'missing'"
								class="missing-link"
								:href="issueUrl(rule.dashboard.issue)"
							>
								Dashboard: {{ linkLabel(rule.dashboard) }}
							</a>
							<span v-else>Dashboard: {{ linkLabel(rule.dashboard) }}</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<details class="exclusions">
			<summary>Eksplisitt utenfor scope ({{ alertRegistry.exclusions.length }})</summary>
			<ul>
				<li v-for="exclusion in alertRegistry.exclusions" :key="exclusion.id">
					<strong>{{ exclusion.id }}</strong> — {{ exclusion.reason }}
				</li>
			</ul>
		</details>
	</section>
</div>
</template>

<style scoped>
.alert-register {
	--alert-ink: var(--vp-c-text-1);
	--alert-muted: var(--vp-c-text-2);
	--alert-line: var(--vp-c-divider);
	--alert-panel: var(--vp-c-bg-soft);
	--alert-accent: var(--vp-c-brand-1);
	--alert-green: var(--vp-c-success-1);
	--alert-amber: var(--vp-c-warning-1);
	--alert-red: var(--vp-c-danger-1);
	display: grid;
	gap: 42px;
}

.register-header {
	position: relative;
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 32px;
	align-items: center;
	padding: 28px;
	margin-top: 20px;
	overflow: hidden;
	border: 1px solid var(--alert-line);
	border-top: 5px solid var(--alert-accent);
	background:
		linear-gradient(90deg, color-mix(in srgb, var(--alert-accent) 10%, transparent), transparent 58%),
		var(--vp-c-bg);
}

.register-header::after {
	position: absolute;
	right: -42px;
	bottom: -64px;
	width: 190px;
	height: 190px;
	content: "";
	border: 1px solid color-mix(in srgb, var(--alert-accent) 28%, transparent);
	border-radius: 50%;
	box-shadow: 0 0 0 28px color-mix(in srgb, var(--alert-accent) 5%, transparent);
}

.register-header h2,
.register-header p {
	margin: 4px 0;
}

.register-header h2 {
	font-size: clamp(2rem, 6vw, 3.7rem);
	line-height: 0.95;
	letter-spacing: -0.045em;
}

.register-header > div:first-child {
	position: relative;
	z-index: 1;
}

.eyebrow,
.section-number,
.card-kicker {
	font-size: 0.72rem;
	font-weight: 750;
	letter-spacing: 0.09em;
	text-transform: uppercase;
	color: var(--alert-accent);
}

.header-stamp {
	position: relative;
	z-index: 1;
	display: grid;
	justify-items: center;
	min-width: 116px;
	padding: 18px 16px;
	border: 1px solid var(--alert-line);
	background: var(--vp-c-bg);
	box-shadow: 7px 7px 0 color-mix(in srgb, var(--alert-accent) 18%, transparent);
}

.header-stamp strong {
	font-size: 2.7rem;
	line-height: 1;
	font-variant-numeric: tabular-nums;
}

.header-stamp span {
	font-weight: 700;
}

.header-stamp small {
	color: var(--alert-muted);
}

.integrity-line {
	display: flex;
	gap: 10px;
	align-items: baseline;
	padding: 12px 16px;
	margin-top: -30px;
	border-left: 4px solid var(--alert-green);
	background: color-mix(in srgb, var(--alert-green) 9%, var(--vp-c-bg));
	font-size: 0.86rem;
}

.integrity-line > span {
	font-weight: 800;
	color: var(--alert-green);
}

.integrity-line--error {
	display: block;
	border-left-color: var(--alert-red);
	background: color-mix(in srgb, var(--alert-red) 9%, var(--vp-c-bg));
}

.section-heading {
	display: flex;
	justify-content: space-between;
	gap: 24px;
	align-items: end;
	padding-bottom: 12px;
	margin-bottom: 16px;
	border-bottom: 1px solid var(--alert-line);
}

.section-heading h2,
.section-heading p {
	margin: 0;
}

.section-heading > a,
.section-heading > span {
	flex: 0 0 auto;
	font-size: 0.8rem;
	font-weight: 650;
}

.state-grid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 10px;
}

.state-card {
	min-height: 190px;
	padding: 16px;
	border: 1px solid var(--alert-line);
	background: var(--alert-panel);
}

.state-card::before {
	display: block;
	width: 26px;
	height: 3px;
	margin-bottom: 28px;
	content: "";
	background: var(--alert-muted);
}

.state-card--enabled::before {
	background: var(--alert-accent);
}

.state-card--paused::before {
	background: var(--alert-amber);
}

.state-card--route::before {
	background: var(--alert-accent);
}

.state-card > strong {
	display: block;
	margin-top: 5px;
	font-size: 2.5rem;
	line-height: 1;
	font-variant-numeric: tabular-nums;
}

.state-card > .route-name {
	font-size: 1.4rem;
}

.state-card h3,
.state-card p {
	margin: 7px 0 0;
}

.state-card h3 {
	font-size: 0.88rem;
}

.state-card p {
	font-size: 0.78rem;
	line-height: 1.45;
	color: var(--alert-muted);
}

.meaning-note {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	gap: 18px;
	align-items: center;
	padding: 18px;
	margin: 14px 0;
	border: 1px solid var(--alert-line);
}

.meaning-mark {
	font-size: 2.5rem;
	font-weight: 800;
	color: var(--alert-amber);
}

.meaning-note h3,
.meaning-note p {
	margin: 0;
}

.meaning-note p {
	margin-top: 5px;
	font-size: 0.86rem;
	color: var(--alert-muted);
}

.environment-grid {
	display: grid;
	gap: 8px;
	padding: 16px;
	background: var(--alert-panel);
}

.environment-row {
	display: grid;
	grid-template-columns: minmax(145px, 0.8fr) minmax(120px, 2fr) 28px;
	gap: 16px;
	align-items: center;
	font-size: 0.8rem;
}

.environment-row > div:first-child {
	display: grid;
}

.environment-bar {
	height: 7px;
	overflow: hidden;
	background: var(--vp-c-bg);
}

.environment-bar span {
	display: block;
	height: 100%;
	background: var(--alert-accent);
}

.environment-row > strong:last-child {
	text-align: right;
	font-variant-numeric: tabular-nums;
}

.risk-section {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	gap: 22px;
	padding: 24px;
	border: 1px solid color-mix(in srgb, var(--alert-red) 55%, var(--alert-line));
	background:
		repeating-linear-gradient(-45deg, transparent, transparent 8px, color-mix(in srgb, var(--alert-red) 4%, transparent) 8px, color-mix(in srgb, var(--alert-red) 4%, transparent) 16px),
		var(--vp-c-bg);
}

.orphan-section {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	gap: 22px;
	padding: 24px;
	border: 1px solid color-mix(in srgb, var(--alert-amber) 60%, var(--alert-line));
	background: color-mix(in srgb, var(--alert-amber) 6%, var(--vp-c-bg));
}

.orphan-label {
	align-self: start;
	padding: 5px 7px;
	border: 2px solid var(--alert-amber);
	font-size: 0.66rem;
	font-weight: 850;
	letter-spacing: 0.1em;
	color: var(--alert-amber);
	transform: rotate(-2deg);
}

.orphan-section h2,
.orphan-section p {
	margin: 0;
}

.orphan-section h2 {
	margin-top: 3px;
}

.orphan-section > div:last-child > p:not(.section-number) {
	margin-top: 10px;
}

.orphan-findings {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;
	margin-top: 16px;
}

.orphan-findings > article {
	padding: 14px;
	border: 1px solid var(--alert-line);
	background: var(--vp-c-bg);
}

.orphan-finding__heading {
	display: flex;
	justify-content: space-between;
	gap: 12px;
	align-items: start;
}

.orphan-finding__heading > strong {
	font-size: 0.8rem;
	overflow-wrap: anywhere;
}

.orphan-finding__heading > span {
	flex: 0 0 auto;
	padding: 2px 6px;
	background: var(--vp-c-warning-soft);
	font-size: 0.66rem;
	font-weight: 700;
	color: var(--alert-amber);
}

.orphan-findings article > p {
	margin-top: 7px;
	font-size: 0.72rem;
	color: var(--alert-muted);
}

.orphan-findings ul {
	padding: 0;
	margin: 10px 0 0;
	list-style: none;
}

.orphan-findings li {
	padding: 7px 0;
	border-top: 1px solid var(--alert-line);
}

.orphan-findings li > strong,
.orphan-findings li > code,
.orphan-findings li > small {
	display: block;
	margin-top: 3px;
	font-size: 0.7rem;
}

.orphan-findings li > small {
	color: var(--alert-muted);
}

.orphan-live-link {
	display: inline-block;
	margin-top: 15px;
	font-size: 0.82rem;
	font-weight: 700;
}

.risk-signal {
	display: grid;
	place-items: center;
	width: 48px;
	height: 48px;
	border: 2px solid var(--alert-red);
	border-radius: 50%;
	font-size: 1.7rem;
	font-weight: 850;
	color: var(--alert-red);
}

.risk-section h2,
.risk-section p {
	margin: 0;
}

.risk-section h2 {
	margin-top: 3px;
}

.risk-section > div:last-child > p:not(.section-number) {
	margin-top: 10px;
}

.risk-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px 18px;
	margin-top: 14px;
	font-size: 0.84rem;
	font-weight: 650;
}

.lifecycle-grid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 10px;
}

.lifecycle-card {
	padding: 15px;
	border-top: 4px solid var(--alert-green);
	background: var(--alert-panel);
}

.lifecycle-card--migrating,
.lifecycle-card--retiring {
	border-top-color: var(--alert-amber);
}

.lifecycle-card--sunset {
	border-top-color: var(--alert-red);
}

.lifecycle-card__heading {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	font-weight: 750;
}

.lifecycle-card__heading strong {
	font-size: 1.8rem;
	font-variant-numeric: tabular-nums;
}

.lifecycle-card > p {
	min-height: 55px;
	margin: 6px 0 12px;
	font-size: 0.77rem;
	color: var(--alert-muted);
}

.lifecycle-card ul {
	max-height: 270px;
	padding: 0;
	margin: 0;
	overflow: auto;
	list-style: none;
}

.lifecycle-card li {
	padding: 9px 0;
	border-top: 1px solid var(--alert-line);
}

.lifecycle-card li code,
.lifecycle-card li small,
.lifecycle-card li a {
	display: block;
	overflow-wrap: anywhere;
}

.lifecycle-card li small,
.lifecycle-card li a {
	margin-top: 3px;
	font-size: 0.7rem;
}

.lifecycle-card li small {
	color: var(--alert-muted);
}

.pattern-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

.gap-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
}

.pattern-panel,
.gap-card {
	padding: 18px;
	border: 1px solid var(--alert-line);
	background: var(--vp-c-bg);
}

.panel-title {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.panel-title h3,
.pattern-panel > p,
.pattern-group {
	margin: 0;
}

.panel-title span {
	display: grid;
	place-items: center;
	min-width: 28px;
	height: 28px;
	padding: 0 8px;
	border-radius: 999px;
	background: var(--vp-c-warning-soft);
	font-weight: 750;
	color: var(--alert-amber);
}

.pattern-panel > p {
	margin-top: 5px;
	font-size: 0.8rem;
	color: var(--alert-muted);
}

.pattern-panel > .empty-finding {
	margin-top: 18px;
	font-weight: 650;
}

.pattern-group {
	padding-top: 14px;
	margin-top: 14px;
	border-top: 1px solid var(--alert-line);
}

.pattern-group > strong,
.pattern-group > span {
	display: block;
	font-size: 0.8rem;
}

.pattern-group > span {
	margin-top: 4px;
	color: var(--alert-muted);
}

.tag-list {
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
	margin-top: 8px;
}

.tag-list code {
	padding: 3px 6px;
	font-size: 0.68rem;
	background: var(--alert-panel);
}

.tag-list--roomy {
	margin-top: 14px;
}

.gap-card summary {
	cursor: pointer;
	font-weight: 650;
}

.gap-card summary strong,
.gap-card--mismatch h3 strong,
.gap-card--links strong {
	margin-right: 5px;
	font-size: 1.7rem;
	font-variant-numeric: tabular-nums;
	color: var(--alert-red);
}

.gap-card--mismatch {
	grid-column: 1 / -1;
	border-left: 4px solid var(--alert-red);
}

.gap-card--mismatch h3,
.gap-card--mismatch p {
	margin: 0;
}

.gap-card--mismatch p {
	margin-top: 7px;
}

.gap-card--mismatch li {
	font-size: 0.78rem;
}

.gap-card--links {
	grid-column: 1 / -1;
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

.gap-card--links > div {
	display: flex;
	align-items: baseline;
	gap: 8px;
	padding: 12px;
	background: var(--alert-panel);
}

.gap-card--links > p {
	grid-column: 1 / -1;
	margin: 0;
	font-size: 0.8rem;
	color: var(--alert-muted);
}

.source-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
	gap: 8px;
}

.source-caveat {
	padding: 12px 15px;
	margin-bottom: 12px;
	border-left: 4px solid var(--alert-amber);
	background: var(--vp-c-warning-soft);
	font-size: 0.82rem;
}

.source-card {
	display: grid;
	gap: 4px;
	min-width: 0;
	padding: 13px;
	border: 1px solid var(--alert-line);
	color: var(--alert-ink);
	text-decoration: none;
	transition: border-color 120ms ease, transform 120ms ease;
}

.source-card:hover {
	border-color: var(--alert-accent);
	transform: translateY(-2px);
}

.source-card--historical {
	border-left: 4px solid var(--alert-amber);
}

.source-card > span {
	font-size: 0.68rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--alert-accent);
}

.source-card > strong {
	font-size: 0.78rem;
	overflow-wrap: anywhere;
}

.source-card > small {
	color: var(--alert-muted);
}

.table-scroll {
	overflow-x: auto;
}

table {
	display: table;
	width: 100%;
	margin: 0;
	font-size: 0.72rem;
}

th,
td {
	min-width: 145px;
	vertical-align: top;
}

th:first-child,
td:first-child {
	min-width: 235px;
}

.rule-cell > strong,
.rule-cell > code,
.rule-cell > small,
.rule-cell > a,
.rule-cell > span,
td > strong,
td > code,
td > small,
td > a,
td > span {
	display: block;
	margin-bottom: 4px;
}

.rule-cell details,
td details {
	margin-top: 8px;
}

.rule-cell details summary,
td details summary {
	cursor: pointer;
	font-weight: 650;
	color: var(--alert-accent);
}

.rule-cell details pre,
td details pre {
	max-width: 360px;
	padding: 8px;
	margin: 7px 0;
	overflow: auto;
	font-size: 0.66rem;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.rule-cell details a,
td details a {
	display: block;
	margin-top: 4px;
}

.rule-cell {
	font-weight: inherit;
	text-align: left;
}

.target-list,
.deployment-line {
	display: grid;
	gap: 4px;
}

.target-list code,
.target-list span {
	overflow-wrap: anywhere;
}

.deployment-line {
	grid-template-columns: auto minmax(110px, 1fr) auto;
	padding-bottom: 5px;
}

.is-not-firing {
	color: var(--alert-accent);
}

.is-paused,
.is-firing,
.missing-link {
	color: var(--alert-red);
}

.is-pending,
.is-unknown,
.severity-warning,
.severity-unclassified {
	color: var(--alert-amber);
}

.severity-critical {
	font-weight: 700;
	color: var(--alert-red);
}

.lifecycle-pill {
	display: inline-flex;
	padding: 3px 7px;
	border-radius: 999px;
	background: color-mix(in srgb, var(--alert-green) 10%, var(--vp-c-bg));
	font-size: 0.68rem;
	font-weight: 700;
}

.lifecycle-pill--migrating,
.lifecycle-pill--retiring {
	background: var(--vp-c-warning-soft);
	color: var(--alert-amber);
}

.lifecycle-pill--sunset {
	background: var(--vp-c-danger-soft);
	color: var(--alert-red);
}

.exclusions {
	padding: 14px 16px;
	margin-top: 18px;
	border: 1px dashed var(--alert-line);
}

.exclusions summary {
	cursor: pointer;
	font-weight: 650;
}

.exclusions li {
	margin-top: 8px;
	font-size: 0.82rem;
}

@media (max-width: 900px) {
	.state-grid,
	.lifecycle-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 640px) {
	.alert-register {
		gap: 34px;
	}

	.register-header {
		grid-template-columns: 1fr;
	}

	.header-stamp {
		justify-self: start;
	}

	.section-heading {
		align-items: start;
		flex-direction: column;
	}

	.state-grid,
	.lifecycle-grid,
	.pattern-grid,
	.gap-grid,
	.gap-card--links {
		grid-template-columns: 1fr;
	}

	.state-card {
		min-height: auto;
	}

	.state-card::before {
		margin-bottom: 16px;
	}

	.risk-section {
		grid-template-columns: 1fr;
	}

	.orphan-section,
	.orphan-findings {
		grid-template-columns: 1fr;
	}

	.gap-card--mismatch,
	.gap-card--links,
	.gap-card--links > p {
		grid-column: auto;
	}

	.environment-row {
		grid-template-columns: minmax(115px, 1fr) 1.5fr 24px;
		gap: 8px;
	}
}
</style>
