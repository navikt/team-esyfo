<script setup lang="ts">
import {
	criticalityLabel,
	inventoryRepositoryUrl,
	inventorySourceUrl,
	runtimeInventory,
} from "../runtime/inventory.ts";
import type {
	BrowserSurface,
	Lifecycle,
	RevisionAssessment,
	RuntimeIdentity,
	TrackedLink,
} from "../runtime/model.ts";
import { validateInventory } from "../runtime/validation.ts";

const validation = validateInventory(runtimeInventory, {
	asOf: runtimeInventory.baseline.capturedOn,
});
const currentApplications = runtimeInventory.applications.filter(
	({ lifecycle }) =>
		lifecycle.state === "active" ||
		lifecycle.state === "migrating" ||
		lifecycle.state === "retiring",
);
const sunsetApplications = runtimeInventory.applications.filter(
	({ lifecycle }) => lifecycle.state === "sunset",
);
const lifecycleChanges = [
	...runtimeInventory.applications,
	...runtimeInventory.jobs,
].filter(
	({ lifecycle }) =>
		lifecycle.state === "migrating" ||
		lifecycle.state === "retiring" ||
		lifecycle.state === "sunset",
);
const configuredBrowserSurfaces = runtimeInventory.browserSurfaces.filter(
	({ currentImplementation }) => currentImplementation.state === "configured",
).length;
const baselineIsApproved = runtimeInventory.baseline.status === "approved";

const issueUrl = (issue: string) => {
	const [repository, number] = issue.split("#");
	return `https://github.com/${repository}/issues/${number}`;
};

const runtimeLabel = ({ cluster, namespace, name }: RuntimeIdentity) =>
	`${cluster}:${namespace}:${name}`;

const lifecycleLabel = (lifecycle: Lifecycle) => {
	switch (lifecycle.state) {
		case "active":
			return "Aktiv";
		case "migrating":
			return `Migrerer innen ${lifecycle.targetDate}`;
		case "retiring":
			return lifecycle.targetDate
				? `Fases ut innen ${lifecycle.targetDate}`
				: "Planlagt utfasing · dato ikke besluttet";
		case "sunset":
			return `Avvikles ${lifecycle.sunsetOn}`;
		case "retired":
			return `Avviklet ${lifecycle.retiredOn}`;
	}
};

const lifecycleClass = (lifecycle: Lifecycle) => `state-${lifecycle.state}`;

const linkLabel = (link: TrackedLink) => {
	if (link.status === "linked") return link.label;
	if (link.status === "missing") return "Mangler";
	return "Ikke påkrevd";
};

const browserStateLabel = (surface: BrowserSurface) => {
	const implementation = surface.currentImplementation;
	if (implementation.state === "missing") return "Mangler browser-SDK";
	return implementation.sdk === "nais-apm"
		? `@nais/apm ${implementation.versionRange}`
		: `Rå Faro ${implementation.versionRange}`;
};

const relationLabel = (relations: {
	internal: string[];
	external: Array<{ name: string; verification: string }>;
}) =>
	[
		...relations.internal,
		...relations.external.map(
			({ name, verification }) => `${name} [${verification}]`,
		),
	].join(", ") || "—";

const browserSourceUrl = (surface: BrowserSurface) =>
	surface.source.path
		? inventorySourceUrl(surface.source.repository, surface.source.path)
		: inventoryRepositoryUrl(surface.source.repository);

const revisionLabel = (revision: RevisionAssessment) =>
	revision.status === "verified"
		? revision.commitSha.slice(0, 12)
		: `ikke verifisert${revision.refHint ? ` (${revision.refHint})` : ""}`;
</script>

<template>
<div class="inventory">
	<div class="baseline-banner">
		<div>
			<p class="eyebrow">Kanonisk ønsket tilstand · schema v{{ runtimeInventory.schemaVersion }}</p>
				<h2>{{ baselineIsApproved ? "Godkjent baseline" : "Foreslått baseline" }}</h2>
				<p>
					Kartlagt {{ runtimeInventory.baseline.capturedOn }}.
					<template v-if="baselineIsApproved">
						Godkjent {{ runtimeInventory.baseline.approvedOn }}; faktisk helse krever fortsatt fersk evidens.
					</template>
					<template v-else> Baseline er ikke godkjent eller produksjonsverifisert ennå. </template>
				</p>
		</div>
		<a :href="issueUrl(runtimeInventory.baseline.approvedInIssue)">
				{{ baselineIsApproved ? "Se godkjenning" : "Godkjenn" }} i
				{{ runtimeInventory.baseline.approvedInIssue }}
		</a>
	</div>

	<div class="summary-grid" aria-label="Baselineantall">
		<div class="summary-card">
			<strong>{{ validation.counts.applications }}</strong>
			<span>aktive/under utfasing</span>
		</div>
		<div class="summary-card">
			<strong>{{ validation.counts.jobs }}</strong>
			<span>produksjonsjobb</span>
		</div>
		<div class="summary-card">
			<strong>{{ validation.counts.ownedTopics }}</strong>
			<span>team-eide topics</span>
		</div>
		<div class="summary-card">
			<strong>{{ validation.counts.browserSurfaces }}</strong>
			<span>browserflater</span>
		</div>
	</div>

	<div class="truth-note">
		<strong>Ingen falske grønne signaler.</strong>
		Denne siden viser deklarert scope og konfigurasjon. Faktisk runtime- og telemetrydekning må
		komme fra tidsstemplet evidens. Missing, stale og query error kan aldri evalueres som grønt.
	</div>

	<h2>Dekningskontrakt per type</h2>
	<p>
		Profilene er input til den maskinelle coverage-rapporten. Topic-frister og jobbfreshness
		overstyrer den generelle profilgrensen per ressurs.
	</p>
	<div class="table-scroll">
		<table>
			<thead>
				<tr><th>Profil</th><th>Ressurstype</th><th>Obligatoriske signaler</th><th>Standard freshness</th></tr>
			</thead>
			<tbody>
				<tr v-for="profile in runtimeInventory.coverageProfiles" :key="profile.id">
					<td><code>{{ profile.id }}</code></td>
					<td>{{ profile.resourceKinds.join(", ") }}</td>
					<td>{{ profile.requiredSignals.join(", ") }}</td>
					<td>{{ profile.freshnessMinutes }} min</td>
				</tr>
			</tbody>
		</table>
	</div>

	<h2>Endringer som krever oppfølging</h2>
	<div class="change-grid">
		<article v-for="resource in lifecycleChanges" :key="resource.id" class="change-card">
			<span class="state" :class="lifecycleClass(resource.lifecycle)">
				{{ lifecycleLabel(resource.lifecycle) }}
			</span>
			<h3>{{ resource.displayName }}</h3>
			<p v-if="resource.lifecycle.state === 'migrating'">
				Mål: {{ resource.lifecycle.targetRefs.join(", ") }}. {{ resource.lifecycle.decision }}
			</p>
			<p v-else-if="resource.lifecycle.state === 'retiring'">
				Kandidat: {{ resource.lifecycle.candidateReplacementRefs.join(", ") }}.
				Aktive konsumenter: {{ resource.lifecycle.consumerRefs.join(", ") }}.
				{{ resource.lifecycle.reason }} {{ resource.lifecycle.decision }}
			</p>
			<p v-else-if="resource.lifecycle.state === 'sunset'">
				{{ resource.lifecycle.reason }} {{ resource.lifecycle.decision }}
			</p>
		</article>
	</div>

	<h2>Applikasjoner</h2>
	<p>
		APM-kolonnen er forventet identitet, ikke bevis på ferske signaler. Browsertelemetri vises
		separat nedenfor.
	</p>
	<div class="table-scroll">
		<table>
			<thead>
				<tr>
					<th>Applikasjon</th>
					<th>Runtime</th>
					<th>Rolle / kritikalitet</th>
					<th>Dekningsprofil</th>
					<th>APM-identitet</th>
					<th>Runbook</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="app in currentApplications" :key="app.id">
					<td>
						<a :href="inventoryRepositoryUrl(app.repository)">{{ app.displayName }}</a>
						<span v-if="app.lifecycle.state !== 'active'" class="state" :class="lifecycleClass(app.lifecycle)">
							{{ lifecycleLabel(app.lifecycle) }}
						</span>
					</td>
					<td><code>{{ runtimeLabel(app.runtime) }}</code></td>
					<td>{{ app.role }} · {{ criticalityLabel[app.criticality] }}</td>
					<td><code>{{ app.coverageProfile }}</code></td>
					<td>
						<code v-if="app.runtimeApm.status !== 'not-required'">
							{{ app.runtimeApm.serviceNamespace }}/{{ app.runtimeApm.serviceName }}
						</code>
						<a
							v-if="app.runtimeApm.status === 'unverified'"
							class="unverified"
							:href="issueUrl(app.runtimeApm.issue)"
						>
							Ikke verifisert · {{ app.runtimeApm.issue }}
						</a>
						<a v-else-if="app.runtimeApm.status === 'linked'" :href="app.runtimeApm.href">
							Verifisert {{ app.runtimeApm.verifiedAt }}
						</a>
						<span v-else>{{ app.runtimeApm.reason }}</span>
					</td>
					<td>
						<a v-if="app.runbook.status === 'linked'" :href="app.runbook.href">
							{{ linkLabel(app.runbook) }}
						</a>
						<a v-else-if="app.runbook.status === 'missing'" class="gap" :href="issueUrl(app.runbook.issue)">
							Mangler · {{ app.runbook.issue }}
						</a>
						<span v-else>{{ linkLabel(app.runbook) }}</span>
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	<details class="sunset-details">
		<summary>{{ sunsetApplications.length }} workloader utenfor 26-baseline avvikles</summary>
		<ul>
			<li v-for="app in sunsetApplications" :key="app.id">
				<code>{{ runtimeLabel(app.runtime) }}</code> — {{ lifecycleLabel(app.lifecycle) }}
			</li>
		</ul>
	</details>

	<h2>Produksjonsjobb</h2>
	<div class="table-scroll">
		<table>
			<thead>
				<tr><th>Jobb</th><th>Runtime</th><th>Kjøreplan</th><th>Livssyklus</th><th>Profil</th><th>APM</th><th>Runbook</th></tr>
			</thead>
			<tbody>
				<tr v-for="job in runtimeInventory.jobs" :key="job.id">
					<td><a :href="inventoryRepositoryUrl(job.repository)">{{ job.displayName }}</a></td>
					<td><code>{{ runtimeLabel(job.runtime) }}</code></td>
					<td><code>{{ job.schedule.expression }}</code> {{ job.schedule.timezone }}</td>
					<td><span class="state" :class="lifecycleClass(job.lifecycle)">{{ lifecycleLabel(job.lifecycle) }}</span></td>
					<td><code>{{ job.coverageProfile }}</code></td>
					<td>
						<template v-if="job.runtimeApm.status !== 'not-required'">
							<code>{{ job.runtimeApm.serviceNamespace }}/{{ job.runtimeApm.serviceName }}</code>
							<a v-if="job.runtimeApm.status === 'unverified'" class="unverified" :href="issueUrl(job.runtimeApm.issue)">
								Ikke verifisert · {{ job.runtimeApm.issue }}
							</a>
							<a v-else :href="job.runtimeApm.href">Verifisert {{ job.runtimeApm.verifiedAt }}</a>
						</template>
						<span v-else>{{ job.runtimeApm.reason }}</span>
					</td>
					<td>
						<a v-if="job.runbook.status === 'linked'" :href="job.runbook.href">{{ linkLabel(job.runbook) }}</a>
						<a v-else-if="job.runbook.status === 'missing'" class="gap" :href="issueUrl(job.runbook.issue)">
							Mangler · {{ job.runbook.issue }}
						</a>
						<span v-else>{{ linkLabel(job.runbook) }}</span>
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	<h2>Kafka-topics etter pipeline</h2>
	<div class="table-scroll">
		<table>
			<thead>
				<tr><th>Topic</th><th>Pipeline</th><th>Produsenter</th><th>Konsumenter</th><th>Operativ kontrakt</th><th>Runbook</th></tr>
			</thead>
			<tbody>
				<tr v-for="topic in runtimeInventory.topics" :key="topic.id">
					<td>
						<a :href="inventorySourceUrl(topic.repository, topic.sourcePath)"><code>{{ topic.name }}</code></a>
					</td>
					<td>{{ topic.context.pipelineRefs.join(", ") }}</td>
					<td>{{ relationLabel(topic.producers) }}</td>
					<td>{{ relationLabel(topic.consumers) }}</td>
					<td>
						{{ topic.serviceLevel.status }} ·
						<a :href="issueUrl(topic.serviceLevel.approvalIssue)">{{ topic.serviceLevel.approvalIssue }}</a>
						<br>
						{{ topic.trafficModel }} · {{ topic.serviceLevel.processingDeadlineMinutes }} min ·
						zero {{ topic.serviceLevel.zeroTrafficAllowed ? "tillatt" : "krever progress" }} · lag
						{{ topic.serviceLevel.consumerLag }}
					</td>
					<td>
						<a v-if="topic.runbook.status === 'linked'" :href="topic.runbook.href">{{ linkLabel(topic.runbook) }}</a>
						<a v-else-if="topic.runbook.status === 'missing'" class="gap" :href="issueUrl(topic.runbook.issue)">
							Mangler · {{ topic.runbook.issue }}
						</a>
						<span v-else>{{ linkLabel(topic.runbook) }}</span>
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	<h2>Browserflater</h2>
	<p>
		{{ configuredBrowserSurfaces }} av {{ runtimeInventory.browserSurfaces.length }} har et SDK
		konfigurert i kildekoden. «Konfigurert» er ikke «verifisert»; ingen rad er grønn før fersk,
		personvernsikker produksjonsevidens finnes.
	</p>
	<div class="table-scroll">
		<table>
			<thead>
				<tr>
					<th>Flate / kilde</th><th>Browseridentitet</th><th>Teknologi</th><th>Nåtilstand</th>
					<th>Release / tracing</th><th>Personvern</th><th>Sampling / sourcemaps</th><th>Vurdering</th><th>Runbook</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="surface in runtimeInventory.browserSurfaces" :key="surface.id">
					<td>
						<a :href="browserSourceUrl(surface)">{{ surface.displayName }}</a>
						<small><code>{{ surface.runtimeRef }}</code></small>
					</td>
					<td>
						<code>{{ surface.browserIdentity.serviceNamespace }}/{{ surface.browserIdentity.serviceName }}</code>
						<small>ikke verifisert</small>
					</td>
					<td>
						{{ surface.framework.family }} / {{ surface.framework.router }} · {{ surface.hosting.mode }}
						<span v-if="surface.hosting.host"> · {{ surface.hosting.host }}</span>
					</td>
					<td>
						<span class="state" :class="surface.currentImplementation.state === 'missing' ? 'state-missing' : 'state-configured'">
							{{ browserStateLabel(surface) }}
						</span>
					</td>
					<td>
						{{ surface.currentImplementation.releaseIdentity }} · browser
						{{ surface.currentImplementation.browserTracing }} · e2e
						{{ surface.currentImplementation.endToEndTracing }}
					</td>
					<td>
						route {{ surface.currentImplementation.privacy.routeNormalization }} · URL
						{{ surface.currentImplementation.privacy.rawUrlSanitization }} · canary
						{{ surface.currentImplementation.privacy.canaryVerification }}
					</td>
					<td>
						{{ surface.currentImplementation.sampling }} · build-map
						{{ surface.currentImplementation.sourcemaps.build }} · prod
						{{ surface.currentImplementation.sourcemaps.productionDeobfuscation }}
					</td>
					<td>
						{{ surface.currentImplementation.assessedAt }} · source
						{{ revisionLabel(surface.currentImplementation.sourceRevision) }} · deploy
						{{ revisionLabel(surface.currentImplementation.deployedRevision) }}
					</td>
					<td>
						<a v-if="surface.runbook.status === 'linked'" :href="surface.runbook.href">{{ linkLabel(surface.runbook) }}</a>
						<a v-else-if="surface.runbook.status === 'missing'" class="gap" :href="issueUrl(surface.runbook.issue)">
							Mangler · {{ surface.runbook.issue }}
						</a>
						<span v-else>{{ linkLabel(surface.runbook) }}</span>
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	<h2>Eksplisitt utenfor scope</h2>
	<ul class="exclusion-list">
		<li v-for="exclusion in runtimeInventory.exclusions" :key="exclusion.id">
			<strong>{{ exclusion.id.replace("exclusion:", "") }}</strong> — {{ exclusion.reason }}
		</li>
	</ul>
</div>
</template>

<style scoped>
.inventory {
	--inventory-border: var(--vp-c-divider);
}
.baseline-banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 24px;
	padding: 22px;
	margin: 20px 0;
	border: 1px solid var(--vp-c-brand-2);
	border-radius: 12px;
	background: var(--vp-c-brand-soft);
}
.baseline-banner h2,
.baseline-banner p {
	margin: 4px 0;
}
.baseline-banner > a {
	flex: 0 0 auto;
	font-weight: 650;
}
.eyebrow {
	font-size: 0.75rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--vp-c-brand-1);
}
.summary-grid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 12px;
	margin: 20px 0;
}
.summary-card {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 16px;
	border: 1px solid var(--inventory-border);
	border-radius: 10px;
	background: var(--vp-c-bg-soft);
}
.summary-card strong {
	font-size: 1.8rem;
	line-height: 1;
	color: var(--vp-c-brand-1);
}
.summary-card span {
	font-size: 0.82rem;
	color: var(--vp-c-text-2);
}
.truth-note {
	padding: 14px 16px;
	border-left: 4px solid var(--vp-c-warning-1);
	background: var(--vp-c-warning-soft);
}
.change-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	gap: 12px;
}
.change-card {
	padding: 16px;
	border: 1px solid var(--inventory-border);
	border-radius: 10px;
	background: var(--vp-c-bg-soft);
}
.change-card h3,
.change-card p {
	margin: 8px 0 0;
}
.change-card p {
	font-size: 0.88rem;
	color: var(--vp-c-text-2);
}
.state {
	display: inline-flex;
	width: fit-content;
	margin-top: 5px;
	padding: 2px 7px;
	border-radius: 999px;
	font-size: 0.72rem;
	font-weight: 650;
	white-space: nowrap;
}
.state-active {
	background: var(--vp-c-default-soft);
}
.state-migrating,
.state-retiring,
.state-configured {
	background: var(--vp-c-warning-soft);
	color: var(--vp-c-warning-1);
}
.state-sunset,
.state-missing,
.gap {
	color: var(--vp-c-danger-1);
}
.state-sunset,
.state-missing {
	background: var(--vp-c-danger-soft);
}
.state-retired {
	background: var(--vp-c-default-soft);
	color: var(--vp-c-text-2);
}
.unverified,
td small {
	display: block;
	margin-top: 4px;
	font-size: 0.7rem;
	color: var(--vp-c-warning-1);
}
.table-scroll {
	overflow-x: auto;
	margin: 14px 0 24px;
}
table {
	display: table;
	width: 100%;
	margin: 0;
	font-size: 0.78rem;
}
th,
td {
	min-width: 130px;
	vertical-align: top;
}
th:first-child,
td:first-child {
	min-width: 190px;
}
td code {
	white-space: nowrap;
}
.sunset-details {
	padding: 12px 16px;
	border: 1px dashed var(--vp-c-warning-1);
	border-radius: 8px;
}
.sunset-details summary {
	cursor: pointer;
	font-weight: 650;
}
.exclusion-list li {
	margin: 8px 0;
}
@media (max-width: 700px) {
	.baseline-banner {
		align-items: flex-start;
		flex-direction: column;
	}
	.summary-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}
</style>
