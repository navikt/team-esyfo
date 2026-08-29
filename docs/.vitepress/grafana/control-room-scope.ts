import { runtimeInventory } from "../runtime/inventory.ts";
import {
	isCurrentLifecycle,
	isExpectedLifecycleAt,
} from "../runtime/lifecycle.ts";
import type {
	Application,
	Criticality,
	IssueRef,
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

export const scopeMarkdown = () =>
	`Velg tjeneste for APM, logger og runbook. Ingen samlet brukerimpact-status ennå; \`UKJENT\` og \`MANGLER\` er aldri grønt. [Begreper og scope](${CONTROL_ROOM_GUIDE_URL}).`;

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
