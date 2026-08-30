import type { AreaId } from "../areas.ts";
import { runtimeInventory } from "../runtime/inventory.ts";
import {
	isCurrentLifecycle,
	isExpectedLifecycleAt,
} from "../runtime/lifecycle.ts";
import type {
	Application,
	IssueRef,
	JourneyId,
	Lifecycle,
} from "../runtime/model.ts";

export const CONTROL_ROOM_BASELINE_AS_OF = runtimeInventory.baseline.capturedOn;

export const RUNBOOK_BASE_URL =
	"https://navikt.github.io/team-esyfo/utvikling/observability/runbooks";
export const CONTROL_ROOM_GUIDE_URL =
	"https://navikt.github.io/team-esyfo/utvikling/observability/kontrollrom";
export const RUNTIME_INVENTORY_URL =
	"https://navikt.github.io/team-esyfo/utvikling/observability/runtimeinventar";
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

const lifecycleSuffix = (lifecycle: Lifecycle) => {
	switch (lifecycle.state) {
		case "active":
			return "";
		case "migrating":
			return " (migrerer)";
		case "retiring":
			return " (utfasing)";
		case "sunset":
			return ` (sunset ${lifecycle.sunsetOn})`;
		case "retired":
			return ` (avviklet ${lifecycle.retiredOn})`;
	}
};

export const controlRoomApplicationOptions = controlRoomApplications.map(
	(application) => ({
		text: `${application.displayName}${lifecycleSuffix(application.lifecycle)}`,
		value: application.runtime.name,
	}),
);

const scopeOption = (text: string, applications: Application[]) => ({
	text,
	value: applicationRegex(applications),
});

const applicationsInArea = (areaRef: AreaId) =>
	controlRoomApplications.filter(({ context }) =>
		context.areaRefs.includes(areaRef),
	);

const applicationsInJourney = (journeyRef: JourneyId) =>
	controlRoomApplications.filter(({ context }) =>
		context.journeyRefs.includes(journeyRef),
	);

const withRetiringDependencies = (applications: Application[]) => {
	const applicationIds = new Set<string>(applications.map(({ id }) => id));
	return controlRoomApplications.filter(
		(application) =>
			applicationIds.has(application.id) ||
			(application.lifecycle.state === "retiring" &&
				application.lifecycle.consumerRefs.some((consumerRef) =>
					applicationIds.has(consumerRef),
				)),
	);
};

export const controlRoomScopeOptions = [
	scopeOption(
		`Alle operative GCP-tjenester (${controlRoomApplications.length})`,
		controlRoomApplications,
	),
	scopeOption("Aktivitetskrav", applicationsInArea("aktivitetskrav")),
	scopeOption(
		"Kartleggingsspørsmål",
		applicationsInArea("kartleggingssporsmal"),
	),
	scopeOption("Dine sykmeldte", applicationsInArea("dine-sykmeldte")),
	scopeOption("Nærmeste leder", applicationsInArea("narmeste-leder")),
	scopeOption(
		"Møtebehov og dialogmøte",
		withRetiringDependencies(applicationsInArea("motebehov")),
	),
	scopeOption(
		"Oppfølgingsplan og dokumenter",
		applicationsInArea("oppfolgingsplan"),
	),
	scopeOption("Mer oppfølging", applicationsInArea("meroppfolging")),
	scopeOption(
		"Varslingsmotorer",
		applicationsInJourney("journey:notifications"),
	),
	scopeOption(
		"Interne driftsverktøy",
		applicationsInJourney("journey:operational-insight"),
	),
];

const issueUrl = (issue: IssueRef) => {
	const [repository, number] = issue.split("#");
	return `https://github.com/${repository}/issues/${number}`;
};

const issueLink = (issue: IssueRef) => `[${issue}](${issueUrl(issue)})`;

export const scopeMarkdown = () =>
	`Velg operativt område for toppkort og flåtematrise, og detaljtjeneste for APM, logger og runbook. Ingen samlet brukerimpact-status ennå; \`UKJENT\` og \`MANGLER\` er aldri grønt. [Begreper og scope](${CONTROL_ROOM_GUIDE_URL}).`;

export const browserCoverageMarkdown = () => {
	const configured = controlRoomBrowserSurfaces.filter(
		({ currentImplementation }) => currentImplementation.state === "configured",
	).length;
	return `**SDK konfigurert: ${configured}/${controlRoomBrowserSurfaces.length}.** Kun Faro-unntak er diagnostisk verifisert; øvrig browserhelse er \`UKJENT\`. [Runbook](${BROWSER_RUNBOOK_URL}) · [inventar](${RUNTIME_INVENTORY_URL}) · [CWV](https://grafana.nav.cloud.nais.io/d/frontend-web-vitals/frontend-web-vitals).`;
};

export const pipelineCoverageMarkdown = () => {
	return `**Pipelinehelse: \`IKKE EVALUERT\`.** ${runtimeInventory.pipelines.length} grupper / ${controlRoomTopics.length} topics er kartlagt. [Avklar kontrakten i #212](https://github.com/navikt/team-esyfo/issues/212) · [se topicruter](${RUNTIME_INVENTORY_URL}).`;
};

export const jobCoverageMarkdown = () => {
	const summaries = controlRoomJobs
		.map(
			(job) =>
				`**${job.displayName}: \`IKKE EVALUERT\`.** \`${job.schedule.expression}\` · ${job.schedule.timezone} · sen etter ${job.schedule.lateAfterMinutes} min · ${issueLink("navikt/esyfovarsel#1094")}.`,
		)
		.join("\n\n");
	return `${summaries} \`No data\` er \`UKJENT\`, ikke en vellykket kjøring.`;
};

export const pagerReadinessMarkdown = () =>
	`**BLOCKED:** Grafene under er diagnostikk. Pager aktiveres først etter shadow-evidens, second-person-verifikasjon og eksplisitt beslutning i [#217](https://github.com/navikt/team-esyfo/issues/217).`;
