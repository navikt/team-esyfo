import { runtimeInventory } from "../runtime/inventory.ts";
import {
	isCurrentLifecycle,
	isExpectedLifecycleAt,
} from "../runtime/lifecycle.ts";
import type {
	Application,
	BrowserSurface,
	Criticality,
	IssueRef,
	Lifecycle,
	PipelineId,
	Topic,
} from "../runtime/model.ts";

export const CONTROL_ROOM_BASELINE_AS_OF = runtimeInventory.baseline.capturedOn;

export const RUNBOOK_BASE_URL =
	"https://navikt.github.io/team-esyfo/utvikling/observability/runbooks";
export const RUNTIME_RUNBOOK_URL = `${RUNBOOK_BASE_URL}/http-runtime`;
export const BROWSER_RUNBOOK_URL = `${RUNBOOK_BASE_URL}/browser`;
export const PIPELINE_RUNBOOK_URL = `${RUNBOOK_BASE_URL}/pipelines-og-jobber`;
export const MOTEBEHOV_RUNBOOK_URL = `${RUNBOOK_BASE_URL}/syfomotebehov-tilgjengelighet`;
export const DESERIALIZATION_RUNBOOK_URL = `${RUNBOOK_BASE_URL}/oppfolgingsplan-deserialisering`;
export const BUDSTIKKA_RUNBOOK_URL =
	"https://github.com/navikt/syfo-budstikka/blob/main/docs/helsesjekk.md";

export const controlRoomApplications = runtimeInventory.applications.filter(
	({ lifecycle, runtime }) =>
		isCurrentLifecycle(lifecycle) && runtime.cluster === "prod-gcp",
);

const coverageProfileById = new Map(
	runtimeInventory.coverageProfiles.map((profile) => [profile.id, profile]),
);

export const controlRoomServerApplications = controlRoomApplications.filter(
	({ coverageProfile }) => {
		const signals = coverageProfileById.get(coverageProfile)?.requiredSignals;
		return signals?.includes("http-errors") && signals.includes("latency");
	},
);

export const controlRoomSunsetApplications =
	runtimeInventory.applications.filter(
		({ lifecycle }) =>
			lifecycle.state === "sunset" &&
			isExpectedLifecycleAt(lifecycle, CONTROL_ROOM_BASELINE_AS_OF),
	);

export const controlRoomBrowserSurfaces =
	runtimeInventory.browserSurfaces.filter(({ lifecycle }) =>
		isExpectedLifecycleAt(lifecycle, CONTROL_ROOM_BASELINE_AS_OF),
	);

export const controlRoomTopics = runtimeInventory.topics.filter(
	({ lifecycle }) =>
		isExpectedLifecycleAt(lifecycle, CONTROL_ROOM_BASELINE_AS_OF),
);

export const controlRoomJobs = runtimeInventory.jobs.filter(({ lifecycle }) =>
	isExpectedLifecycleAt(lifecycle, CONTROL_ROOM_BASELINE_AS_OF),
);

const escapeRegex = (value: string) =>
	value.replace(/[\\.^$|?*+()[\]{}]/g, "\\$&");

export const applicationRegex = (applications: Application[]) =>
	`^(${applications
		.map(({ runtime }) => escapeRegex(runtime.name))
		.join("|")})$`;

export const controlRoomApplicationRegex = applicationRegex(
	controlRoomApplications,
);

const criticalityLabel: Record<Criticality, string> = {
	critical: "Kritisk",
	high: "Høy",
	standard: "Standard",
	support: "Støtte",
};

export const lifecycleLabel = (lifecycle: Lifecycle) => {
	switch (lifecycle.state) {
		case "active":
			return "Aktiv";
		case "migrating":
			return "Migrerer";
		case "retiring":
			return "Utfasing";
		case "sunset":
			return `Sunset ${lifecycle.sunsetOn}`;
		case "retired":
			return `Avviklet ${lifecycle.retiredOn}`;
	}
};

export const controlRoomApplicationOptions = controlRoomApplications.map(
	(application) => ({
		text: `${application.displayName} · ${criticalityLabel[application.criticality]} · ${lifecycleLabel(application.lifecycle)}`,
		value: application.runtime.name,
	}),
);

const scopeOption = (text: string, applications: Application[]) => ({
	text,
	value: applicationRegex(applications),
});

const uniqueScopes = (options: Array<{ text: string; value: string }>) => {
	const seenOptions = new Set<string>();
	const regexOccurrences = new Map<string, number>();
	return options.flatMap((option) => {
		const key = `${option.text}\u0000${option.value}`;
		if (seenOptions.has(key)) return [];
		seenOptions.add(key);
		const occurrence = regexOccurrences.get(option.value) ?? 0;
		regexOccurrences.set(option.value, occurrence + 1);
		if (occurrence === 0) return [option];

		// Grafana persists a custom variable by value. Equivalent scopes therefore
		// need distinct, but semantically identical, RE2 expressions to retain the
		// selected label after a reload.
		const inner = option.value.slice(2, -2);
		const wrappingDepth = occurrence + 1;
		return [
			{
				...option,
				value: `^${"(".repeat(wrappingDepth)}${inner}${")".repeat(wrappingDepth)}$`,
			},
		];
	});
};

export const controlRoomScopeOptions = uniqueScopes([
	scopeOption(
		`Hele operative GCP-flåten (${controlRoomApplications.length})`,
		controlRoomApplications,
	),
	...runtimeInventory.journeys.flatMap((journey) => {
		const applications = controlRoomApplications.filter(({ context }) =>
			context.journeyRefs.includes(journey.id),
		);
		return applications.length > 0
			? [scopeOption(`Reise · ${journey.name}`, applications)]
			: [];
	}),
	...runtimeInventory.pipelines.flatMap((pipeline) => {
		const applications = controlRoomApplications.filter(({ context }) =>
			context.pipelineRefs.includes(pipeline.id),
		);
		return applications.length > 0
			? [scopeOption(`Pipeline · ${pipeline.name}`, applications)]
			: [];
	}),
	...(["migrating", "retiring"] as const).flatMap((state) => {
		const applications = controlRoomApplications.filter(
			({ lifecycle }) => lifecycle.state === state,
		);
		const label = {
			migrating: "Migrering",
			retiring: "Utfasing",
		}[state];
		return applications.length > 0
			? [scopeOption(`${label} (${applications.length})`, applications)]
			: [];
	}),
]);

const issueUrl = (issue: IssueRef) => {
	const [repository, number] = issue.split("#");
	return `https://github.com/${repository}/issues/${number}`;
};

const issueLink = (issue: IssueRef) => `[${issue}](${issueUrl(issue)})`;

const markdownCell = (value: string) => value.replaceAll("|", "\\|");

const runtimeName = (id: string) => {
	const application = runtimeInventory.applications.find(
		(candidate) => candidate.id === id,
	);
	if (application) return application.runtime.name;
	const job = runtimeInventory.jobs.find((candidate) => candidate.id === id);
	return job?.runtime.name ?? id.replace(/^(app|job):/, "");
};

export const scopeMarkdown = () => `### Kontrollrom v1 · coverage-first

**Les i denne rekkefølgen:** påvist brukerimpact → teknisk avvik → telemetry → deploykontekst → runbook. Brukerimpact, teknisk helse og datakvalitet er separate sannheter; kontrollrommet beregner aldri én samlet grønn status.

Flåten er generert fra runtimeinventaret per **${CONTROL_ROOM_BASELINE_AS_OF}**: ${controlRoomApplications.length} forventede GCP-apper, hvor ${controlRoomServerApplications.length} har SERVER-span/RED-kontrakt, samt ${controlRoomJobs.length} jobb, ${controlRoomTopics.length} team-topics og ${controlRoomBrowserSurfaces.length} browserflater. Workerprofiler står som \`ANNEN KONTRAKT\` i SERVER-kolonnen og får aldri falsk \`MANGLER\`. De ${controlRoomSunsetApplications.length} FSS-komponentene i \`syfooppfolgingsplanservice\` er bevisst **ikke** med i den generiske RED/kube/Loki-flåten: den hardkodede GCP-kontrakten ville gitt falsk \`MANGLER\`. Fram til 31. august følges tjenestegruppen kun indirekte via eksisterende, tidsavgrensede guardrails i Alert-registeret; deretter verifiseres shutdown i [#208](https://github.com/navikt/team-esyfo/issues/208). Airflow, dulting-studio og teamsykefravr er utenfor scope.

**Statusord:** \`PÅVIST\` krever observerbar evidens. \`INGEN PÅVIST IMPACT\` betyr ikke bevist frisk. \`UKJENT\` og \`IKKE DEFINERT\` er handlingsrettede dekningsgap, aldri grønt.`;

const browserImplementation = (surface: BrowserSurface) =>
	surface.currentImplementation.state === "configured"
		? `${surface.currentImplementation.sdk}; tracing ${surface.currentImplementation.browserTracing === "configured" ? "konfigurert" : "mangler"}`
		: "Mangler SDK";

export const browserCoverageMarkdown = () => {
	const configured = controlRoomBrowserSurfaces.filter(
		({ currentImplementation }) => currentImplementation.state === "configured",
	).length;
	const rows = controlRoomBrowserSurfaces
		.map((surface) => {
			const pageIdentity =
				surface.pageIdentity.status === "defined" ? "Definert" : "Mangler";
			const privacy =
				surface.privacyContract.status === "implemented"
					? "Implementert"
					: "Gap";
			return `| ${markdownCell(surface.displayName)} | \`${surface.browserIdentity.serviceName}\` | ${browserImplementation(surface)} | ${pageIdentity} | ${privacy} | ${issueLink(surface.browserIdentity.verificationIssue)} |`;
		})
		.join("\n");

	return `### Browser · ${configured}/${controlRoomBrowserSurfaces.length} har SDK-konfigurasjon

Kun Faro \`kind=exception\` er live-verifisert for feildrilldown. **Miljølabel er ikke verifisert**, så exception-serien er diagnostikk på tvers av ukjent miljøscope og skal ikke leses som produksjonsstatus. Samplede page loads, sessions og CWV p75 er også **UKJENT** fram til [#206](https://github.com/navikt/team-esyfo/issues/206) har bevist identitet, miljø, numerisk samplingrate og queryschema. En session skal aldri omtales som en unik bruker, og ulike sample rates skal aldri summeres.

| Flate | Browser-identitet | Kildekode | Side-ID | Privacy | Høy-impact issue |
|---|---|---|---|---|---|
${rows}

[Browser-runbook](${BROWSER_RUNBOOK_URL}) · [NAIS Frontend web vitals](https://grafana.nav.cloud.nais.io/d/frontend-web-vitals/frontend-web-vitals) · [Feildrilldown](https://grafana.nav.cloud.nais.io/d/team-esyfo-error-drilldown/team-esyfo-e28093-feildrilldown)`;
};

const pipelineTopics = (pipelineId: PipelineId) =>
	controlRoomTopics.filter(({ context }) =>
		context.pipelineRefs.includes(pipelineId),
	);

const topicProcessors = (topics: Topic[]) => {
	const producers = [
		...new Set(topics.flatMap(({ producers }) => producers.internal)),
	].map(runtimeName);
	const consumers = [
		...new Set(topics.flatMap(({ consumers }) => consumers.internal)),
	].map(runtimeName);
	return `${producers.join(", ") || "ekstern"} → ${consumers.join(", ") || "ingen intern consumer"}`;
};

export const pipelineCoverageMarkdown = () => {
	const rows = runtimeInventory.pipelines
		.map((pipeline) => {
			const topics = pipelineTopics(pipeline.id);
			const deadlines = [
				...new Set(
					topics.map(
						({ serviceLevel }) => serviceLevel.processingDeadlineMinutes,
					),
				),
			].sort((a, b) => a - b);
			const issue = topics[0]?.serviceLevel.approvalIssue;
			return `| ${pipeline.name} | ${topics.length} | ${markdownCell(topicProcessors(topics))} | ${deadlines.join("/") || "–"} min | ${issue ? `IKKE EVALUERT · ${issueLink(issue)}` : "IKKE DEFINERT"} |`;
		})
		.join("\n");

	return `### Pipelines · kontrakt før farge

| Pipeline | Topics | Interne prosessorer | Foreslått frist | Operativ status |
|---|---:|---|---:|---|
${rows}

Varsling modelleres prosessnøytralt: **syfo-budstikka er målprosessor**, mens **esyfovarsel er migrerende legacy-prosessor** fram mot 18. desember. Ingen rad er grønn før #212 har godkjent expected run, ferskhet, progresjon, eldste ventende og terminalt utfall. Airflow er en ekstern sekundærkonsument og er eksplisitt ute av scope.

[Pipeline-/jobbrunbook](${PIPELINE_RUNBOOK_URL})`;
};

export const jobCoverageMarkdown = () => {
	const rows = controlRoomJobs
		.map(
			(job) =>
				`| ${job.displayName} | \`${job.schedule.expression}\` · ${job.schedule.timezone} | ${job.schedule.lateAfterMinutes} min | ${issueLink("navikt/esyfovarsel#1094")} | IKKE EVALUERT |`,
		)
		.join("\n");
	return `### Planlagte jobber

| Jobb | Forventet kjøring | Sen etter | Guardrail | Status |
|---|---|---:|---|---|
${rows}

\`kube_job_failed\` under viser kun et observert terminalt Kubernetes-utfall i valgt tidsrom. **No data er UKJENT**, ikke en vellykket kjøring. Siste start, siste suksess, varighet og forventet-run-evaluering mangler fortsatt en verifisert adapter.`;
};

export const pagerReadinessMarkdown =
	() => `### Pager readiness · alle tre er blokkert

| Kandidat fra #210 | Diagnostikk i kontrollrommet | Runbook | Aktivering |
|---|---|---|---|
| Budstikka ende-til-ende-ferskhet | Nåværende consumer-lag vises kun som diagnostikk; endelig alder/ferskhet og terminale utfall mangler | [Budstikka-helsesjekk](${BUDSTIKKA_RUNBOOK_URL}) | **BLOCKED** · [#260](https://github.com/navikt/syfo-budstikka/issues/260), [#217](https://github.com/navikt/team-esyfo/issues/217) |
| Oppfølgingsplan permanent deserialisering | Verifisert rate-metrikk vises; recovery/reconciliation må bevises | [Runbook](${DESERIALIZATION_RUNBOOK_URL}) | **BLOCKED** · [#449](https://github.com/navikt/syfo-oppfolgingsplan-backend/issues/449), [#217](https://github.com/navikt/team-esyfo/issues/217) |
| syfomotebehov tilgjengelighet | Available/desired speiler shadow-kandidaten og vises sammen med ready/desired og RED-detaljene; endelig konsekvens og tuning gjenstår | [Runbook](${MOTEBEHOV_RUNBOOK_URL}) | **BLOCKED** · [#753](https://github.com/navikt/syfomotebehov/issues/753), [#217](https://github.com/navikt/team-esyfo/issues/217) |

Dashboardpaneler og runbooks aktiverer ikke pager. Aktivering krever shadow-evidens, 14–28 dagers observasjon, second-person-verifikasjon og eksplisitt beslutning i #217.`;

export const lifecycleMarkdown = () => {
	const rows = [
		...controlRoomApplications.filter(
			({ lifecycle }) => lifecycle.state !== "active",
		),
		...controlRoomSunsetApplications,
	]
		.map((application) => {
			const detail =
				application.lifecycle.state === "migrating"
					? `Mål ${application.lifecycle.targetDate}; ${application.lifecycle.decision}`
					: application.lifecycle.state === "retiring"
						? `${application.lifecycle.targetDate ? `Mål ${application.lifecycle.targetDate}; ` : ""}${application.lifecycle.reason}`
						: application.lifecycle.state === "sunset"
							? `Sunset ${application.lifecycle.sunsetOn}; tjenestegruppen følges indirekte av eksisterende FSS-alerts, ikke med individuell dekning eller generisk flåterad; shutdown verifiseres i ${application.lifecycle.decision}`
							: application.lifecycle.state === "retired"
								? application.lifecycle.reason
								: "Aktiv";
			return `| \`${application.runtime.name}\` | ${lifecycleLabel(application.lifecycle)} | ${markdownCell(detail)} |`;
		})
		.join("\n");

	return `### Migrering og utfasing

| Runtime | Livssyklus | Operativ beslutning |
|---|---|---|
${rows}

De tre FSS-radene er historisk/livssyklus-kontekst og skal ikke bli røde «MANGLER» etter sunset. Etter 31. august betyr de kun at shutdown må verifiseres i [#208](https://github.com/navikt/team-esyfo/issues/208) før inventory og gamle regler ryddes. \`dulting-studio\`, janitor/\`teamsykefravr\` og Airflow får ingen nye signaler her. \`syfobrukertilgang\` skal erstattes av verifisert tilgangssjekk i \`esyfo-narmesteleder\`; antakelsen om siste konsument må bevises før shutdown.`;
};

const linkedRunbooks = [
	...controlRoomApplications,
	...controlRoomJobs,
	...controlRoomTopics,
	...controlRoomBrowserSurfaces,
].filter(({ runbook }) => runbook.status === "linked").length;

export const coverageMarkdown =
	() => `### Dekningskontrakt · det vi vet at vi ikke vet

| Signalområde | Forventet scope | Status nå | Neste bevis |
|---|---:|---|---|
| App-runtime | ${controlRoomApplications.length} | Kube/Loki dekker GCP-flåten; SERVER/RED gjelder ${controlRoomServerApplications.length} eligible profiler, mens workers har annen kontrakt | [#211](https://github.com/navikt/team-esyfo/issues/211) |
| Browser | ${controlRoomBrowserSurfaces.length} | ${controlRoomBrowserSurfaces.filter(({ currentImplementation }) => currentImplementation.state === "configured").length} SDK-konfigurert; page load/session/CWV ukjent | [#206](https://github.com/navikt/team-esyfo/issues/206) |
| Team-topics | ${controlRoomTopics.length} | 0 godkjente service-level-kontrakter | [#212](https://github.com/navikt/team-esyfo/issues/212) |
| Jobber | ${controlRoomJobs.length} | Kun failure-flag; expected run og siste suksess ukjent | [esyfovarsel#1094](https://github.com/navikt/esyfovarsel/issues/1094) |
| SLO-burn | – | IKKE DEFINERT | [dinesykmeldte-backend#729](https://github.com/navikt/dinesykmeldte-backend/issues/729), [meroppfolging-backend#422](https://github.com/navikt/meroppfolging-backend/issues/422) |
| Deploytid/-SHA | ${controlRoomApplications.length} | UKJENT; pod-alder og deployment-created brukes ikke som deploybevis | [#211](https://github.com/navikt/team-esyfo/issues/211) |
| Ressursspesifikke runbooks | ${controlRoomApplications.length + controlRoomJobs.length + controlRoomTopics.length + controlRoomBrowserSurfaces.length} | ${linkedRunbooks} allerede lenket; signal-familier dekkes midlertidig av sentrale runbooks | [runbook-indeks](${RUNBOOK_BASE_URL}/) |

SERVER-tilstanden i flåtetabellen er syntetisk inventarforankret: **FERSK** = aktuell SERVER-spanserie, **STALE** = serie sett siste 30 min men ikke aktuell, **MANGLER** = ingen serie i 30 min for en SERVER-eligible profil, **ANNEN KONTRAKT** = workerprofil som ikke skal vurderes med SERVER-spans. En datasourcefeil gjør hele queryen feil og skal aldri mappes til MANGLER eller grønt.`;
