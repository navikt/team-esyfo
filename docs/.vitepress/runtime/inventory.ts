import type {
	AppId,
	Application,
	BrowserSurface,
	BrowserTelemetryAssessment,
	CoverageProfile,
	Criticality,
	ExternalRelation,
	Job,
	JourneyId,
	Lifecycle,
	OperationalContext,
	PipelineId,
	Repository,
	RuntimeApm,
	RuntimeInventory,
	Topic,
	TrackedLink,
} from "./model.ts";

const GAP_ISSUE = "navikt/team-esyfo#211" as const;
const APM_VERIFICATION_ISSUE = "navikt/team-esyfo#211" as const;
const BROWSER_CONTRACT_ISSUE = "navikt/team-esyfo#206" as const;
const TOPIC_CONTRACT_ISSUE = "navikt/team-esyfo#212" as const;

const active = { state: "active" } as const;

const notificationsMigration: Lifecycle = {
	state: "migrating",
	targetRefs: ["app:syfo-budstikka"],
	targetDate: "2026-12-18",
	decision:
		"Varsling flyttes gradvis fra esyfovarsel til syfo-budstikka; måldato må godkjennes i navikt/team-esyfo#204.",
	minimumCoverage: "legacy-worker",
};

const missingRunbook = (): TrackedLink => ({
	status: "missing",
	issue: GAP_ISSUE,
});

const context = (
	areaRefs: OperationalContext["areaRefs"],
	journeyRefs: JourneyId[] = [],
	pipelineRefs: PipelineId[] = [],
): OperationalContext => ({ areaRefs, journeyRefs, pipelineRefs });

type ApplicationSeed = Omit<
	Application,
	| "kind"
	| "id"
	| "displayName"
	| "ownerTeam"
	| "runtime"
	| "runtimeApm"
	| "runbook"
> & {
	name: string;
	displayName?: string;
	runtimeName?: string;
	cluster?: Application["runtime"]["cluster"];
	namespace?: string;
	runtimeApm?: RuntimeApm;
	runbook?: TrackedLink;
};

const application = (seed: ApplicationSeed): Application => {
	const runtimeName = seed.runtimeName ?? seed.name;
	return {
		kind: "application",
		id: `app:${seed.name}`,
		displayName: seed.displayName ?? seed.name,
		ownerTeam: "team-esyfo",
		repository: seed.repository,
		sourcePath: seed.sourcePath,
		runtime: {
			cluster: seed.cluster ?? "prod-gcp",
			namespace: seed.namespace ?? "team-esyfo",
			name: runtimeName,
		},
		role: seed.role,
		criticality: seed.criticality,
		lifecycle: seed.lifecycle,
		context: seed.context,
		coverageProfile: seed.coverageProfile,
		runtimeApm:
			seed.runtimeApm ??
			({
				status: "unverified",
				serviceNamespace: "team-esyfo",
				serviceName: runtimeName,
				issue: APM_VERIFICATION_ISSUE,
			} satisfies RuntimeApm),
		runbook: seed.runbook ?? missingRunbook(),
	};
};

export const coverageProfiles: CoverageProfile[] = [
	{
		id: "critical-http",
		description: "Kritisk HTTP-tjeneste med full runtime- og request-kontroll.",
		resourceKinds: ["application"],
		requiredSignals: [
			"runtime-presence",
			"availability",
			"http-errors",
			"latency",
			"saturation",
			"restarts",
			"logs",
			"traces",
		],
		freshnessMinutes: 15,
	},
	{
		id: "standard-http",
		description:
			"HTTP-tjeneste med tilgjengelighet, feil, latency og runtimehelse.",
		resourceKinds: ["application"],
		requiredSignals: [
			"runtime-presence",
			"availability",
			"http-errors",
			"latency",
			"restarts",
			"logs",
			"traces",
		],
		freshnessMinutes: 30,
	},
	{
		id: "frontend-server",
		description:
			"Node-basert frontendruntime; browsertelemetri vurderes separat.",
		resourceKinds: ["application"],
		requiredSignals: [
			"runtime-presence",
			"availability",
			"http-errors",
			"latency",
			"restarts",
			"logs",
			"traces",
		],
		freshnessMinutes: 30,
	},
	{
		id: "internal-http",
		description:
			"Intern flate med samme runtimekrav og skjerpet personvernkontroll.",
		resourceKinds: ["application"],
		requiredSignals: [
			"runtime-presence",
			"availability",
			"http-errors",
			"latency",
			"restarts",
			"logs",
			"traces",
		],
		freshnessMinutes: 30,
	},
	{
		id: "async-worker",
		description: "Bakgrunnsarbeid uten HTTP-SLO.",
		resourceKinds: ["application"],
		requiredSignals: [
			"runtime-presence",
			"saturation",
			"restarts",
			"logs",
			"traces",
		],
		freshnessMinutes: 30,
	},
	{
		id: "scheduled-job",
		description: "Kjøreplanbevisst jobbkontroll.",
		resourceKinds: ["job"],
		requiredSignals: [
			"runtime-presence",
			"job-success",
			"job-duration",
			"logs",
		],
		freshnessMinutes: 60,
	},
	{
		id: "kafka-pipeline",
		description:
			"Pipelineorientert topic-kontroll; nulltrafikk kan være legitimt.",
		resourceKinds: ["topic"],
		requiredSignals: [
			"topic-throughput",
			"topic-errors",
			"pipeline-progress",
			"oldest-pending",
			"permanent-failures",
			"logs",
		],
		freshnessMinutes: 30,
	},
	{
		id: "browser-public",
		description: "Offentlig standalone-flate med personvernsikker RUM.",
		resourceKinds: ["browser-surface"],
		requiredSignals: [
			"browser-errors",
			"browser-performance",
			"browser-identity",
			"release-identity",
			"privacy-canary",
			"sourcemaps",
			"traces",
		],
		freshnessMinutes: 60,
	},
	{
		id: "browser-embedded",
		description:
			"Innebygd Min side-flate med egen identitet og verts-URL-kontroll.",
		resourceKinds: ["browser-surface"],
		requiredSignals: [
			"browser-errors",
			"browser-performance",
			"browser-identity",
			"release-identity",
			"privacy-canary",
			"sourcemaps",
			"traces",
		],
		freshnessMinutes: 60,
	},
	{
		id: "browser-internal-sensitive",
		description:
			"Intern flate med sensitivt innhold og streng syntetisk personverncanary.",
		resourceKinds: ["browser-surface"],
		requiredSignals: [
			"browser-errors",
			"browser-performance",
			"browser-identity",
			"release-identity",
			"privacy-canary",
			"sourcemaps",
			"traces",
		],
		freshnessMinutes: 60,
	},
	{
		id: "legacy-http",
		description: "Minimum HTTP-kontroll frem til avvikling er ferdig.",
		resourceKinds: ["application"],
		requiredSignals: [
			"runtime-presence",
			"availability",
			"http-errors",
			"restarts",
			"logs",
		],
		freshnessMinutes: 30,
	},
	{
		id: "legacy-worker",
		description:
			"Minimum fremdrifts- og feilkontroll for worker frem til migrering er ferdig.",
		resourceKinds: ["application"],
		requiredSignals: [
			"runtime-presence",
			"restarts",
			"logs",
			"pipeline-progress",
			"permanent-failures",
		],
		freshnessMinutes: 30,
	},
	{
		id: "infrastructure",
		description: "Runtime- og metrikksjekk for midlertidig infrastruktur.",
		resourceKinds: ["application"],
		requiredSignals: [
			"runtime-presence",
			"availability",
			"saturation",
			"restarts",
		],
		freshnessMinutes: 15,
	},
];

export const applications: Application[] = [
	application({
		name: "aktivitetskrav-backend",
		repository: "navikt/aktivitetskrav-backend",
		role: "backend-api",
		criticality: "high",
		lifecycle: active,
		context: context(
			["aktivitetskrav"],
			["journey:activity-requirement"],
			["pipeline:notifications"],
		),
		coverageProfile: "standard-http",
	}),
	application({
		name: "aktivitetskrav-frontend",
		repository: "navikt/aktivitetskrav-frontend",
		role: "frontend-server",
		criticality: "high",
		lifecycle: active,
		context: context(["aktivitetskrav"], ["journey:activity-requirement"]),
		coverageProfile: "frontend-server",
	}),
	application({
		name: "aktivitetskrav-microfrontend",
		repository: "navikt/esyfo-microfrontends",
		sourcePath: "microfrontends/aktivitetskrav",
		role: "microfrontend-server",
		criticality: "standard",
		lifecycle: active,
		context: context(["aktivitetskrav"], ["journey:activity-requirement"]),
		coverageProfile: "frontend-server",
	}),
	application({
		name: "bro-frontend",
		repository: "navikt/bro-frontend",
		role: "frontend-server",
		criticality: "high",
		lifecycle: active,
		context: context(
			["kartleggingssporsmal", "motebehov"],
			["journey:mapping-questions", "journey:meeting-needs"],
		),
		coverageProfile: "frontend-server",
	}),
	application({
		name: "dialogmote-frontend",
		repository: "navikt/dialogmote-frontend",
		role: "frontend-server",
		criticality: "high",
		lifecycle: active,
		context: context(["motebehov"], ["journey:dialog-meeting"]),
		coverageProfile: "frontend-server",
	}),
	application({
		name: "dialogmote-microfrontend",
		repository: "navikt/esyfo-microfrontends",
		sourcePath: "microfrontends/dialogmote",
		role: "microfrontend-server",
		criticality: "standard",
		lifecycle: active,
		context: context(["motebehov"], ["journey:dialog-meeting"]),
		coverageProfile: "frontend-server",
	}),
	application({
		name: "dinesykmeldte",
		repository: "navikt/dinesykmeldte",
		role: "frontend-server",
		criticality: "critical",
		lifecycle: active,
		context: context(["dine-sykmeldte"], ["journey:employer-follow-up"]),
		coverageProfile: "frontend-server",
	}),
	application({
		name: "dinesykmeldte-backend",
		repository: "navikt/dinesykmeldte-backend",
		role: "backend-api",
		criticality: "critical",
		lifecycle: active,
		context: context(
			["dine-sykmeldte", "narmeste-leder"],
			["journey:employer-follow-up", "journey:nearest-leader"],
			["pipeline:nearest-leader"],
		),
		coverageProfile: "critical-http",
	}),
	application({
		name: "esyfo-narmesteleder",
		repository: "navikt/esyfo-narmesteleder",
		role: "backend-api",
		criticality: "high",
		lifecycle: active,
		context: context(
			["narmeste-leder"],
			["journey:nearest-leader"],
			["pipeline:nearest-leader"],
		),
		coverageProfile: "standard-http",
	}),
	application({
		name: "esyfovarsel",
		repository: "navikt/esyfovarsel",
		role: "worker",
		criticality: "high",
		lifecycle: notificationsMigration,
		context: context(
			["fellestjenester"],
			["journey:notifications"],
			["pipeline:notifications"],
		),
		coverageProfile: "legacy-worker",
	}),
	application({
		name: "flaggskipet",
		repository: "navikt/flaggskipet",
		role: "internal-tool",
		criticality: "support",
		lifecycle: active,
		context: context(["fellestjenester"], ["journey:operational-insight"]),
		coverageProfile: "internal-http",
	}),
	application({
		name: "lps-oppfolgingsplan-mottak",
		repository: "navikt/lps-oppfolgingsplan-mottak",
		role: "backend-api",
		criticality: "high",
		lifecycle: active,
		context: context(
			["oppfolgingsplan"],
			["journey:follow-up-plan"],
			["pipeline:follow-up-plan-lps"],
		),
		coverageProfile: "standard-http",
	}),
	application({
		name: "lumi-api",
		repository: "navikt/lumi",
		sourcePath: "apps/lumi-api",
		role: "backend-api",
		criticality: "support",
		lifecycle: active,
		context: context(["fellestjenester"], ["journey:operational-insight"]),
		coverageProfile: "internal-http",
	}),
	application({
		name: "lumi-dashboard",
		repository: "navikt/lumi",
		sourcePath: "apps/lumi-dashboard",
		role: "internal-tool",
		criticality: "support",
		lifecycle: active,
		context: context(["fellestjenester"], ["journey:operational-insight"]),
		coverageProfile: "internal-http",
	}),
	application({
		name: "meroppfolging-backend",
		repository: "navikt/meroppfolging-backend",
		role: "backend-api",
		criticality: "high",
		lifecycle: active,
		context: context(
			["meroppfolging", "kartleggingssporsmal"],
			["journey:late-follow-up", "journey:mapping-questions"],
			[
				"pipeline:late-follow-up",
				"pipeline:mapping-questions",
				"pipeline:notifications",
			],
		),
		coverageProfile: "critical-http",
	}),
	application({
		name: "meroppfolging-frontend",
		repository: "navikt/meroppfolging-frontend",
		role: "frontend-server",
		criticality: "high",
		lifecycle: active,
		context: context(["meroppfolging"], ["journey:late-follow-up"]),
		coverageProfile: "frontend-server",
	}),
	application({
		name: "meroppfolging-microfrontend",
		repository: "navikt/esyfo-microfrontends",
		sourcePath: "microfrontends/meroppfolging",
		role: "microfrontend-server",
		criticality: "standard",
		lifecycle: active,
		context: context(
			["meroppfolging", "kartleggingssporsmal"],
			["journey:late-follow-up", "journey:mapping-questions"],
		),
		coverageProfile: "frontend-server",
	}),
	application({
		name: "narmesteleder-frontend",
		repository: "navikt/narmesteleder-frontend",
		role: "frontend-server",
		criticality: "high",
		lifecycle: active,
		context: context(["narmeste-leder"], ["journey:nearest-leader"]),
		coverageProfile: "frontend-server",
	}),
	application({
		name: "syfo-budstikka",
		repository: "navikt/syfo-budstikka",
		role: "worker",
		criticality: "high",
		lifecycle: active,
		context: context(
			["fellestjenester"],
			["journey:notifications"],
			["pipeline:notifications"],
		),
		coverageProfile: "async-worker",
		runbook: {
			status: "linked",
			href: "https://github.com/navikt/syfo-budstikka/blob/main/docs/helsesjekk.md",
			label: "Helsesjekk og feilsøking",
		},
	}),
	application({
		name: "syfo-dokumentporten",
		repository: "navikt/syfo-dokumentporten",
		role: "backend-api",
		criticality: "high",
		lifecycle: active,
		context: context(
			["oppfolgingsplan"],
			["journey:document-delivery"],
			["pipeline:follow-up-plan-lps"],
		),
		coverageProfile: "standard-http",
	}),
	application({
		name: "syfo-oppfolgingsplan-backend",
		repository: "navikt/syfo-oppfolgingsplan-backend",
		role: "backend-api",
		criticality: "critical",
		lifecycle: active,
		context: context(
			["oppfolgingsplan"],
			["journey:follow-up-plan", "journey:document-delivery"],
			["pipeline:notifications", "pipeline:follow-up-plan-lps"],
		),
		coverageProfile: "critical-http",
	}),
	application({
		name: "syfo-oppfolgingsplan-frontend",
		repository: "navikt/syfo-oppfolgingsplan-frontend",
		role: "frontend-server",
		criticality: "critical",
		lifecycle: active,
		context: context(["oppfolgingsplan"], ["journey:follow-up-plan"]),
		coverageProfile: "frontend-server",
	}),
	application({
		name: "syfobrukertilgang",
		repository: "navikt/syfobrukertilgang",
		role: "backend-api",
		criticality: "critical",
		lifecycle: {
			state: "retiring",
			candidateReplacementRefs: ["app:esyfo-narmesteleder"],
			consumerRefs: ["app:syfomotebehov"],
			reason:
				"Tjenesten skal fases ut. Default-branch-kartlegging viser syfomotebehov som aktiv konsument; syfooppfolgingsplanservice forsvinner 31. august 2026.",
			decision:
				"Kandidat er en tilsvarende tilgangssjekk i esyfo-narmesteleder. Endpoint, semantisk ekvivalens og dato er ikke besluttet.",
			minimumCoverage: "critical-http",
		},
		context: context(["fellestjenester"], ["journey:access-control"]),
		coverageProfile: "critical-http",
	}),
	application({
		name: "syfomotebehov",
		repository: "navikt/syfomotebehov",
		role: "backend-api",
		criticality: "high",
		lifecycle: active,
		context: context(
			["motebehov"],
			["journey:meeting-needs", "journey:dialog-meeting"],
		),
		coverageProfile: "standard-http",
	}),
	application({
		name: "syfooppdfgen",
		repository: "navikt/syfooppdfgen",
		role: "backend-api",
		criticality: "high",
		lifecycle: active,
		context: context(["oppfolgingsplan"], ["journey:document-delivery"]),
		coverageProfile: "standard-http",
	}),
	application({
		name: "sykepengedager-informasjon",
		repository: "navikt/sykepengedager-informasjon",
		role: "backend-api",
		criticality: "high",
		lifecycle: active,
		context: context(
			["meroppfolging"],
			["journey:late-follow-up"],
			["pipeline:sick-pay-days"],
		),
		coverageProfile: "critical-http",
	}),
	application({
		name: "syfooppfolgingsplanservice",
		repository: "navikt/syfooppfolgingsplanservice",
		cluster: "prod-fss",
		role: "backend-api",
		criticality: "standard",
		lifecycle: {
			state: "sunset",
			sunsetOn: "2026-08-31",
			replacementRefs: ["app:syfo-oppfolgingsplan-backend"],
			reason: "Tjenesten avvikles ved månedsskiftet.",
			decision: "navikt/team-esyfo#208",
		},
		context: context(["oppfolgingsplan"], ["journey:follow-up-plan"]),
		coverageProfile: "legacy-http",
	}),
	application({
		name: "syfooppfolgingsplanservice-redis",
		repository: "navikt/syfooppfolgingsplanservice",
		cluster: "prod-fss",
		role: "infrastructure",
		criticality: "support",
		lifecycle: {
			state: "sunset",
			sunsetOn: "2026-08-31",
			replacementRefs: [],
			reason: "Redis-instansen forsvinner sammen med tjenesten.",
			decision: "navikt/team-esyfo#208",
		},
		context: context(["oppfolgingsplan"], ["journey:follow-up-plan"]),
		coverageProfile: "infrastructure",
		runtimeApm: {
			status: "not-required",
			reason: "Redis overvåkes med runtime- og metrikksignaler.",
		},
	}),
	application({
		name: "syfooppfolgingsplanservice-redisexporter",
		repository: "navikt/syfooppfolgingsplanservice",
		cluster: "prod-fss",
		role: "infrastructure",
		criticality: "support",
		lifecycle: {
			state: "sunset",
			sunsetOn: "2026-08-31",
			replacementRefs: [],
			reason: "Eksportøren forsvinner sammen med Redis-instansen.",
			decision: "navikt/team-esyfo#208",
		},
		context: context(["oppfolgingsplan"], ["journey:follow-up-plan"]),
		coverageProfile: "infrastructure",
		runtimeApm: {
			status: "not-required",
			reason: "Eksportøren overvåkes med runtime- og metrikksignaler.",
		},
	}),
];

export const jobs: Job[] = [
	{
		kind: "job",
		id: "job:esyfovarsel-job",
		displayName: "esyfovarsel-job",
		ownerTeam: "team-esyfo",
		repository: "navikt/esyfovarsel",
		runtime: {
			cluster: "prod-gcp",
			namespace: "team-esyfo",
			name: "esyfovarsel-job",
		},
		criticality: "high",
		lifecycle: notificationsMigration,
		context: context(
			["fellestjenester"],
			["journey:notifications"],
			["pipeline:notifications"],
		),
		coverageProfile: "scheduled-job",
		schedule: {
			type: "cron",
			expression: "*/30 7-16 * * 1-5",
			timezone: "Europe/Oslo",
			lateAfterMinutes: 60,
		},
		runtimeApm: {
			status: "unverified",
			serviceNamespace: "team-esyfo",
			serviceName: "esyfovarsel-job",
			issue: APM_VERIFICATION_ISSUE,
		},
		runbook: missingRunbook(),
	},
];

const topic = (
	seed: Omit<
		Topic,
		| "kind"
		| "id"
		| "displayName"
		| "ownerTeam"
		| "cluster"
		| "serviceLevel"
		| "runbook"
	> & {
		shortName: string;
		processingDeadlineMinutes: number;
		runbook?: TrackedLink;
	},
): Topic => ({
	kind: "topic",
	id: `topic:${seed.shortName}`,
	displayName: seed.shortName,
	ownerTeam: "team-esyfo",
	repository: seed.repository,
	sourcePath: seed.sourcePath,
	cluster: "nav-prod",
	name: seed.name,
	criticality: seed.criticality,
	lifecycle: seed.lifecycle,
	context: seed.context,
	coverageProfile: seed.coverageProfile,
	trafficModel: seed.trafficModel,
	serviceLevel: {
		status: "proposed",
		approvalIssue: TOPIC_CONTRACT_ISSUE,
		progressMode:
			seed.producers.internal.length > 0 && seed.consumers.internal.length > 0
				? "end-to-end"
				: seed.producers.internal.length > 0
					? "producer-only"
					: "consumer-only",
		processingDeadlineMinutes: seed.processingDeadlineMinutes,
		zeroTrafficAllowed: seed.trafficModel !== "continuous",
		consumerLag:
			seed.consumers.internal.length > 0 ? "required" : "external-consumers",
	},
	producers: seed.producers,
	consumers: seed.consumers,
	runbook: seed.runbook ?? { status: "missing", issue: TOPIC_CONTRACT_ISSUE },
});

const external = (
	name: string,
	verification: ExternalRelation["verification"],
	evidence: string,
	owner?: string,
): ExternalRelation => ({ name, verification, evidence, owner });

export const topics: Topic[] = [
	topic({
		shortName: "aapen-syfo-oppfolgingsplan-lps-nav-v2",
		name: "team-esyfo.aapen-syfo-oppfolgingsplan-lps-nav-v2",
		repository: "navikt/lps-oppfolgingsplan-mottak",
		sourcePath: "nais/topics/lps-topic.yaml",
		criticality: "high",
		lifecycle: active,
		context: {
			...context(
				["oppfolgingsplan"],
				["journey:follow-up-plan"],
				["pipeline:follow-up-plan-lps"],
			),
			pipelineRefs: ["pipeline:follow-up-plan-lps"],
		},
		coverageProfile: "kafka-pipeline",
		trafficModel: "intermittent",
		processingDeadlineMinutes: 60,
		producers: { internal: ["app:lps-oppfolgingsplan-mottak"], external: [] },
		consumers: {
			internal: [],
			external: [
				external(
					"teamsykefravr/ispersonoppgave",
					"manifest-acl",
					"navikt/lps-oppfolgingsplan-mottak:nais/topics/lps-topic.yaml",
					"team iSyfo",
				),
				external(
					"disykefravar/dvh-sykefravar-airflow-kafka",
					"manifest-acl",
					"navikt/lps-oppfolgingsplan-mottak:nais/topics/lps-topic.yaml",
					"data scientists",
				),
			],
		},
	}),
	topic({
		shortName: "budstikka.v1",
		name: "team-esyfo.budstikka.v1",
		repository: "navikt/syfo-budstikka",
		sourcePath: "nais/topics/kafka-prod.yaml",
		criticality: "high",
		lifecycle: active,
		context: {
			...context(
				["fellestjenester", "oppfolgingsplan"],
				["journey:notifications"],
				["pipeline:notifications"],
			),
			pipelineRefs: ["pipeline:notifications"],
		},
		coverageProfile: "kafka-pipeline",
		trafficModel: "intermittent",
		processingDeadlineMinutes: 10,
		producers: { internal: ["app:syfo-oppfolgingsplan-backend"], external: [] },
		consumers: { internal: ["app:syfo-budstikka"], external: [] },
		runbook: {
			status: "linked",
			href: "https://github.com/navikt/syfo-budstikka/blob/main/docs/helsesjekk.md",
			label: "Helsesjekk og feilsøking",
		},
	}),
	topic({
		shortName: "dinesykmeldte-hendelser-v2",
		name: "team-esyfo.dinesykmeldte-hendelser-v2",
		repository: "navikt/dinesykmeldte-backend",
		sourcePath: "nais/topics/dinesykmeldte-hendelser-v2.yaml",
		criticality: "standard",
		lifecycle: active,
		context: {
			...context(
				["dine-sykmeldte"],
				["journey:employer-follow-up"],
				["pipeline:employer-events"],
			),
			pipelineRefs: ["pipeline:employer-events"],
		},
		coverageProfile: "kafka-pipeline",
		trafficModel: "intermittent",
		processingDeadlineMinutes: 15,
		producers: {
			internal: ["app:esyfovarsel", "app:syfo-budstikka"],
			external: [
				external(
					"flex/sykepengesoknad-narmesteleder-varsler",
					"manifest-acl",
					"navikt/dinesykmeldte-backend:nais/topics/dinesykmeldte-hendelser-v2.yaml",
					"team Flex",
				),
			],
		},
		consumers: { internal: ["app:dinesykmeldte-backend"], external: [] },
	}),
	topic({
		shortName: "kartleggingssporsmal-svar",
		name: "team-esyfo.kartleggingssporsmal-svar",
		repository: "navikt/meroppfolging-backend",
		sourcePath: "nais/topics/kartleggingssporsmalsvar-prod.yaml",
		criticality: "high",
		lifecycle: active,
		context: {
			...context(
				["kartleggingssporsmal"],
				["journey:mapping-questions"],
				["pipeline:mapping-questions"],
			),
			pipelineRefs: ["pipeline:mapping-questions"],
		},
		coverageProfile: "kafka-pipeline",
		trafficModel: "intermittent",
		processingDeadlineMinutes: 15,
		producers: { internal: ["app:meroppfolging-backend"], external: [] },
		consumers: {
			internal: [],
			external: [
				external(
					"teamsykefravr/ismeroppfolging",
					"manifest-acl",
					"navikt/meroppfolging-backend:nais/topics/kartleggingssporsmalsvar-prod.yaml",
					"team iSyfo",
				),
			],
		},
	}),
	topic({
		shortName: "sen-oppfolging-svar",
		name: "team-esyfo.sen-oppfolging-svar",
		repository: "navikt/meroppfolging-backend",
		sourcePath: "nais/topics/senoppfolgingsvar-prod.yaml",
		criticality: "high",
		lifecycle: active,
		context: {
			...context(
				["meroppfolging"],
				["journey:late-follow-up"],
				["pipeline:late-follow-up"],
			),
			pipelineRefs: ["pipeline:late-follow-up"],
		},
		coverageProfile: "kafka-pipeline",
		trafficModel: "intermittent",
		processingDeadlineMinutes: 30,
		producers: { internal: ["app:meroppfolging-backend"], external: [] },
		consumers: {
			internal: [],
			external: [
				external(
					"teamsykefravr/ismeroppfolging",
					"manifest-acl",
					"navikt/meroppfolging-backend:nais/topics/senoppfolgingsvar-prod.yaml",
					"team iSyfo",
				),
				external(
					"disykefravar/dvh-sykefravar-airflow-kafka",
					"manifest-acl",
					"navikt/meroppfolging-backend:nais/topics/senoppfolgingsvar-prod.yaml",
					"data scientists",
				),
				external(
					"teamsykefravr/iskafkamanager",
					"manifest-acl",
					"Kun ACL er bekreftet; faktisk konsum må verifiseres i navikt/team-esyfo#212.",
					"team iSyfo",
				),
			],
		},
	}),
	topic({
		shortName: "sen-oppfolging-varsel",
		name: "team-esyfo.sen-oppfolging-varsel",
		repository: "navikt/meroppfolging-backend",
		sourcePath: "nais/topics/senoppfolgingvarsel-prod.yaml",
		criticality: "high",
		lifecycle: active,
		context: {
			...context(
				["meroppfolging"],
				["journey:late-follow-up", "journey:notifications"],
				["pipeline:late-follow-up"],
			),
			pipelineRefs: ["pipeline:late-follow-up"],
		},
		coverageProfile: "kafka-pipeline",
		trafficModel: "scheduled",
		processingDeadlineMinutes: 30,
		producers: { internal: ["app:meroppfolging-backend"], external: [] },
		consumers: {
			internal: [],
			external: [
				external(
					"teamsykefravr/ismeroppfolging",
					"manifest-acl",
					"navikt/meroppfolging-backend:nais/topics/senoppfolgingvarsel-prod.yaml",
					"team iSyfo",
				),
				external(
					"disykefravar/dvh-sykefravar-airflow-kafka",
					"manifest-acl",
					"navikt/meroppfolging-backend:nais/topics/senoppfolgingvarsel-prod.yaml",
					"data scientists",
				),
			],
		},
	}),
	topic({
		shortName: "syfo-narmesteleder-leesah",
		name: "team-esyfo.syfo-narmesteleder-leesah",
		repository: "navikt/esyfo-narmesteleder",
		sourcePath: "nais/topics/syfo-narmestelder-leesah-prod.yaml",
		criticality: "high",
		lifecycle: active,
		context: {
			...context(
				["narmeste-leder", "dine-sykmeldte"],
				["journey:nearest-leader"],
				["pipeline:nearest-leader"],
			),
			pipelineRefs: ["pipeline:nearest-leader"],
		},
		coverageProfile: "kafka-pipeline",
		trafficModel: "continuous",
		processingDeadlineMinutes: 15,
		producers: { internal: ["app:esyfo-narmesteleder"], external: [] },
		consumers: { internal: ["app:dinesykmeldte-backend"], external: [] },
	}),
	topic({
		shortName: "sykepengedager-informasjon-topic",
		name: "team-esyfo.sykepengedager-informasjon-topic",
		repository: "navikt/sykepengedager-informasjon",
		sourcePath: "nais/topics/sykepengedager-informasjon-prod.yaml",
		criticality: "high",
		lifecycle: active,
		context: {
			...context(
				["meroppfolging"],
				["journey:late-follow-up"],
				["pipeline:sick-pay-days"],
			),
			pipelineRefs: ["pipeline:sick-pay-days"],
		},
		coverageProfile: "kafka-pipeline",
		trafficModel: "continuous",
		processingDeadlineMinutes: 60,
		producers: { internal: ["app:sykepengedager-informasjon"], external: [] },
		consumers: {
			internal: ["app:meroppfolging-backend"],
			external: [
				external(
					"disykefravar/dvh-sykefravar-airflow-kafka",
					"manifest-acl",
					"navikt/sykepengedager-informasjon:nais/topics/sykepengedager-informasjon-prod.yaml",
					"data scientists",
				),
			],
		},
	}),
	topic({
		shortName: "sykepengedager.infotrygd.v1",
		name: "team-esyfo.sykepengedager.infotrygd.v1",
		repository: "navikt/sykepengedager-informasjon",
		sourcePath: "nais/topics/sykepengedager-infotrygd-prod.yaml",
		criticality: "high",
		lifecycle: active,
		context: {
			...context(
				["meroppfolging"],
				["journey:late-follow-up"],
				["pipeline:sick-pay-days"],
			),
			pipelineRefs: ["pipeline:sick-pay-days"],
		},
		coverageProfile: "kafka-pipeline",
		trafficModel: "continuous",
		processingDeadlineMinutes: 60,
		producers: {
			internal: [],
			external: [
				external(
					"AivenApplication:sykepengedager-infotrygd",
					"documentation",
					"navikt/sykepengedager-informasjon README: Infotrygd/GoldenGate CDC; teknisk eier ukjent.",
				),
			],
		},
		consumers: { internal: ["app:sykepengedager-informasjon"], external: [] },
	}),
	topic({
		shortName: "varselbus",
		name: "team-esyfo.varselbus",
		repository: "navikt/esyfovarsel",
		sourcePath: "nais/topics/varselbus-topic-prod.yaml",
		criticality: "high",
		lifecycle: active,
		context: {
			...context(
				[
					"fellestjenester",
					"aktivitetskrav",
					"kartleggingssporsmal",
					"oppfolgingsplan",
					"meroppfolging",
				],
				["journey:notifications"],
				["pipeline:notifications"],
			),
			pipelineRefs: ["pipeline:notifications"],
		},
		coverageProfile: "kafka-pipeline",
		trafficModel: "intermittent",
		processingDeadlineMinutes: 10,
		producers: {
			internal: [
				"app:aktivitetskrav-backend",
				"app:meroppfolging-backend",
				"app:syfo-dokumentporten",
				"app:syfo-oppfolgingsplan-backend",
				"app:syfomotebehov",
				"app:syfooppfolgingsplanservice",
			],
			external: [
				external(
					"teamsykefravr/isdialogmote",
					"documentation",
					"navikt/esyfovarsel:docs/varslingsoversikt.md",
					"team iSyfo",
				),
				external(
					"teamsykefravr/isarbeidsuforhet",
					"documentation",
					"navikt/esyfovarsel:docs/varslingsoversikt.md",
					"team iSyfo",
				),
				external(
					"teamsykefravr/isfrisktilarbeid",
					"documentation",
					"navikt/esyfovarsel:docs/varslingsoversikt.md",
					"team iSyfo",
				),
				external(
					"teamsykefravr/ismanglendemedvirkning",
					"documentation",
					"navikt/esyfovarsel:docs/varslingsoversikt.md",
					"team iSyfo",
				),
				external(
					"teamsykefravr/isoppfolgingsplan",
					"documentation",
					"navikt/esyfovarsel:docs/varslingsoversikt.md",
					"team iSyfo",
				),
				external(
					"teamsykefravr/ismeroppfolging",
					"documentation",
					"navikt/esyfovarsel:docs/varslingsoversikt.md",
					"team iSyfo",
				),
			],
		},
		consumers: {
			internal: ["app:esyfovarsel"],
			external: [
				external(
					"disykefravar/dvh-sykefravar-airflow-kafka",
					"manifest-acl",
					"navikt/esyfovarsel:nais/topics/varselbus-topic-prod.yaml",
					"data scientists",
				),
			],
		},
	}),
];

type BrowserSeed = Omit<
	BrowserSurface,
	| "kind"
	| "id"
	| "displayName"
	| "ownerTeam"
	| "telemetryRequirement"
	| "browserIdentity"
	| "pageIdentity"
	| "privacyContract"
	| "runbook"
> & {
	name: string;
	displayName?: string;
	pageIdentity?: BrowserSurface["pageIdentity"];
	runbook?: TrackedLink;
};

const browserSurface = (seed: BrowserSeed): BrowserSurface => ({
	kind: "browser-surface",
	id: `browser:${seed.name}`,
	displayName: seed.displayName ?? seed.name,
	ownerTeam: "team-esyfo",
	runtimeRef: seed.runtimeRef,
	source: seed.source,
	framework: seed.framework,
	hosting: seed.hosting,
	criticality: seed.criticality,
	lifecycle: seed.lifecycle,
	context: seed.context,
	coverageProfile: seed.coverageProfile,
	telemetryRequirement: "required",
	browserIdentity: {
		serviceNamespace: "team-esyfo",
		serviceName: seed.name,
		verificationIssue: BROWSER_CONTRACT_ISSUE,
	},
	currentImplementation: seed.currentImplementation,
	pageIdentity: seed.pageIdentity ?? {
		status: "missing",
		issue: BROWSER_CONTRACT_ISSUE,
	},
	privacyContract: { status: "gap", issue: BROWSER_CONTRACT_ISSUE },
	runbook: seed.runbook ?? missingRunbook(),
});

const browserAssessmentDetails = (
	sourcemaps: "configured" | "missing",
	telemetryPresent: boolean,
) =>
	({
		sourceRevision: {
			status: "unverified",
			refHint: "main",
			issue: BROWSER_CONTRACT_ISSUE,
		},
		deployedRevision: {
			status: "unverified",
			issue: BROWSER_CONTRACT_ISSUE,
		},
		sampling: telemetryPresent ? "sdk-default" : "missing",
		endToEndTracing: telemetryPresent ? "unverified" : "not-applicable",
		sourcemaps: {
			build: sourcemaps,
			productionDeobfuscation: "unverified",
		},
		privacy: {
			routeNormalization: "missing",
			rawUrlSanitization: "missing",
			userContext: telemetryPresent ? "unverified" : "not-applicable",
			consoleCapture: telemetryPresent ? "disabled" : "not-applicable",
			sessionReplay: telemetryPresent ? "unverified" : "not-applicable",
			canaryVerification: "missing",
		},
	}) as const;

const configuredFaro = (
	versionRange: string,
	browserTracing: "configured" | "missing",
	releaseIdentity:
		| "release-id"
		| "environment-only"
		| "requires-runtime-verification",
): BrowserTelemetryAssessment => ({
	...browserAssessmentDetails("configured", true),
	state: "configured",
	sdk: "raw-faro",
	versionRange,
	browserTracing,
	releaseIdentity,
	assessedAt: "2026-08-28",
});

const missingBrowserTelemetry = (
	sourcemaps: "configured" | "missing",
): BrowserTelemetryAssessment => ({
	...browserAssessmentDetails(sourcemaps, false),
	state: "missing",
	sdk: "none",
	browserTracing: "missing",
	releaseIdentity: "missing",
	assessedAt: "2026-08-28",
});

export const browserSurfaces: BrowserSurface[] = [
	browserSurface({
		name: "aktivitetskrav-frontend",
		runtimeRef: "app:aktivitetskrav-frontend",
		source: { repository: "navikt/aktivitetskrav-frontend" },
		framework: { family: "next", router: "pages", rendering: "ssr" },
		hosting: { mode: "standalone" },
		criticality: "high",
		lifecycle: active,
		context: context(["aktivitetskrav"], ["journey:activity-requirement"]),
		coverageProfile: "browser-public",
		currentImplementation: configuredFaro(
			"^2.10.0",
			"configured",
			"environment-only",
		),
	}),
	browserSurface({
		name: "bro-frontend",
		runtimeRef: "app:bro-frontend",
		source: { repository: "navikt/bro-frontend" },
		framework: { family: "next", router: "app", rendering: "ssr" },
		hosting: { mode: "standalone" },
		criticality: "high",
		lifecycle: active,
		context: context(
			["kartleggingssporsmal", "motebehov"],
			["journey:mapping-questions", "journey:meeting-needs"],
		),
		coverageProfile: "browser-public",
		currentImplementation: missingBrowserTelemetry("configured"),
	}),
	browserSurface({
		name: "dialogmote-frontend",
		runtimeRef: "app:dialogmote-frontend",
		source: { repository: "navikt/dialogmote-frontend" },
		framework: { family: "next", router: "pages", rendering: "ssr" },
		hosting: { mode: "standalone" },
		criticality: "high",
		lifecycle: active,
		context: context(["motebehov"], ["journey:dialog-meeting"]),
		coverageProfile: "browser-public",
		currentImplementation: configuredFaro(
			"^2.10.0",
			"configured",
			"environment-only",
		),
	}),
	browserSurface({
		name: "dinesykmeldte",
		runtimeRef: "app:dinesykmeldte",
		source: { repository: "navikt/dinesykmeldte" },
		framework: { family: "next", router: "app", rendering: "ssr" },
		hosting: { mode: "standalone" },
		criticality: "critical",
		lifecycle: active,
		context: context(["dine-sykmeldte"], ["journey:employer-follow-up"]),
		coverageProfile: "browser-public",
		currentImplementation: configuredFaro(
			"^2.7.1",
			"missing",
			"requires-runtime-verification",
		),
	}),
	browserSurface({
		name: "meroppfolging-frontend",
		runtimeRef: "app:meroppfolging-frontend",
		source: { repository: "navikt/meroppfolging-frontend" },
		framework: { family: "next", router: "app", rendering: "ssr" },
		hosting: { mode: "standalone" },
		criticality: "high",
		lifecycle: active,
		context: context(["meroppfolging"], ["journey:late-follow-up"]),
		coverageProfile: "browser-public",
		currentImplementation: configuredFaro(
			"^2.10.0",
			"configured",
			"environment-only",
		),
	}),
	browserSurface({
		name: "narmesteleder-frontend",
		runtimeRef: "app:narmesteleder-frontend",
		source: { repository: "navikt/narmesteleder-frontend" },
		framework: { family: "next", router: "app", rendering: "ssr" },
		hosting: { mode: "standalone" },
		criticality: "high",
		lifecycle: active,
		context: context(["narmeste-leder"], ["journey:nearest-leader"]),
		coverageProfile: "browser-public",
		currentImplementation: missingBrowserTelemetry("configured"),
	}),
	browserSurface({
		name: "syfo-oppfolgingsplan-frontend",
		runtimeRef: "app:syfo-oppfolgingsplan-frontend",
		source: { repository: "navikt/syfo-oppfolgingsplan-frontend" },
		framework: { family: "next", router: "app", rendering: "ssr" },
		hosting: { mode: "standalone" },
		criticality: "critical",
		lifecycle: active,
		context: context(["oppfolgingsplan"], ["journey:follow-up-plan"]),
		coverageProfile: "browser-public",
		currentImplementation: configuredFaro(
			"^2.9.0",
			"configured",
			"environment-only",
		),
	}),
	browserSurface({
		name: "aktivitetskrav-microfrontend",
		runtimeRef: "app:aktivitetskrav-microfrontend",
		source: {
			repository: "navikt/esyfo-microfrontends",
			path: "microfrontends/aktivitetskrav",
		},
		framework: { family: "astro", router: "astro", rendering: "ssr" },
		hosting: { mode: "embedded", host: "tms-min-side" },
		criticality: "standard",
		lifecycle: active,
		context: context(["aktivitetskrav"], ["journey:activity-requirement"]),
		coverageProfile: "browser-embedded",
		currentImplementation: missingBrowserTelemetry("missing"),
	}),
	browserSurface({
		name: "dialogmote-microfrontend",
		runtimeRef: "app:dialogmote-microfrontend",
		source: {
			repository: "navikt/esyfo-microfrontends",
			path: "microfrontends/dialogmote",
		},
		framework: { family: "astro", router: "astro", rendering: "ssr" },
		hosting: { mode: "embedded", host: "tms-min-side" },
		criticality: "standard",
		lifecycle: active,
		context: context(["motebehov"], ["journey:dialog-meeting"]),
		coverageProfile: "browser-embedded",
		currentImplementation: missingBrowserTelemetry("missing"),
	}),
	browserSurface({
		name: "meroppfolging-microfrontend",
		runtimeRef: "app:meroppfolging-microfrontend",
		source: {
			repository: "navikt/esyfo-microfrontends",
			path: "microfrontends/meroppfolging",
		},
		framework: { family: "astro", router: "astro", rendering: "ssr" },
		hosting: { mode: "embedded", host: "tms-min-side" },
		criticality: "standard",
		lifecycle: active,
		context: context(
			["meroppfolging", "kartleggingssporsmal"],
			["journey:late-follow-up", "journey:mapping-questions"],
		),
		coverageProfile: "browser-embedded",
		currentImplementation: missingBrowserTelemetry("missing"),
	}),
	browserSurface({
		name: "lumi-dashboard",
		runtimeRef: "app:lumi-dashboard",
		source: { repository: "navikt/lumi", path: "apps/lumi-dashboard" },
		framework: {
			family: "tanstack-start",
			router: "tanstack-router",
			rendering: "ssr",
		},
		hosting: { mode: "internal" },
		criticality: "support",
		lifecycle: active,
		context: context(["fellestjenester"], ["journey:operational-insight"]),
		coverageProfile: "browser-internal-sensitive",
		currentImplementation: missingBrowserTelemetry("missing"),
	}),
];

export const runtimeInventory: RuntimeInventory = {
	schemaVersion: 1,
	baseline: {
		status: "approved",
		capturedOn: "2026-08-28",
		approvedInIssue: "navikt/team-esyfo#204",
		approvedOn: "2026-08-28",
		ownerTeam: "team-esyfo",
		expected: {
			applications: 26,
			jobs: 1,
			ownedTopics: 10,
			browserSurfaces: 11,
		},
	},
	coverageProfiles,
	journeys: [
		{ id: "journey:activity-requirement", name: "Aktivitetskrav" },
		{ id: "journey:mapping-questions", name: "Kartleggingsspørsmål" },
		{ id: "journey:employer-follow-up", name: "Arbeidsgivers oppfølging" },
		{ id: "journey:nearest-leader", name: "Nærmesteleder" },
		{ id: "journey:meeting-needs", name: "Møtebehov" },
		{ id: "journey:dialog-meeting", name: "Dialogmøte" },
		{ id: "journey:follow-up-plan", name: "Oppfølgingsplan" },
		{ id: "journey:late-follow-up", name: "Sen oppfølging" },
		{ id: "journey:notifications", name: "Brukernotifikasjoner" },
		{ id: "journey:access-control", name: "Brukertilgang" },
		{ id: "journey:document-delivery", name: "Dokumentlevering" },
		{ id: "journey:operational-insight", name: "Operasjonell innsikt" },
	],
	pipelines: [
		{ id: "pipeline:notifications", name: "Varsling" },
		{ id: "pipeline:mapping-questions", name: "Kartleggingsspørsmål" },
		{ id: "pipeline:nearest-leader", name: "Nærmesteleder" },
		{ id: "pipeline:follow-up-plan-lps", name: "Oppfølgingsplan fra LPS" },
		{ id: "pipeline:sick-pay-days", name: "Sykepengedager" },
		{ id: "pipeline:late-follow-up", name: "Sen oppfølging" },
		{ id: "pipeline:employer-events", name: "Arbeidsgiverhendelser" },
	],
	applications,
	jobs,
	topics,
	browserSurfaces,
	exclusions: [
		{
			id: "exclusion:dulting-studio",
			selector: {
				kind: "application",
				name: "dulting-studio",
				namespace: "team-esyfo",
			},
			reason:
				"Døende internverktøy; skal avvikles og får ingen ny observability-investering.",
			decision: "Avklart med teamet i navikt/team-esyfo#204.",
		},
		{
			id: "exclusion:syfojanitor-frontend",
			selector: {
				kind: "application",
				name: "syfojanitor-frontend",
				namespace: "teamsykefravr",
			},
			reason:
				"Ikke reelt team-eierskap og ikke del av produksjonskontrollens scope.",
			decision: "Avklart med teamet i navikt/team-esyfo#204.",
		},
		{
			id: "exclusion:syfojanitor-backend",
			selector: {
				kind: "application",
				name: "syfojanitor-backend",
				namespace: "teamsykefravr",
			},
			reason:
				"Ikke reelt team-eierskap og ikke del av produksjonskontrollens scope.",
			decision: "Avklart med teamet i navikt/team-esyfo#204.",
		},
		{
			id: "exclusion:teamsykefravr",
			selector: { kind: "namespace", namespace: "teamsykefravr" },
			reason: "Namespace eies ikke av Team eSyfo.",
			decision: "Avklart med teamet i navikt/team-esyfo#204.",
		},
		{
			id: "exclusion:airflow-isyfo-analyse",
			selector: { kind: "platform", name: "Airflow/isyfo-analyse" },
			reason:
				"Forvaltes av data scientists; tas bare inn etter eksplisitt avtale med dem.",
			decision: "Avklart med teamet i navikt/team-esyfo#204.",
		},
	],
};

export const activeApplicationIds = new Set<AppId>(
	runtimeInventory.applications
		.filter(
			(app) =>
				app.lifecycle.state === "active" ||
				app.lifecycle.state === "migrating" ||
				app.lifecycle.state === "retiring",
		)
		.map((app) => app.id),
);

export const inventoryRepositoryUrl = (repository: Repository) =>
	`https://github.com/${repository}` as const;

export const inventorySourceUrl = (
	repository: Repository,
	sourcePath: string,
) => `${inventoryRepositoryUrl(repository)}/blob/main/${sourcePath}` as const;

export const criticalityLabel: Record<Criticality, string> = {
	critical: "Kritisk",
	high: "Høy",
	standard: "Standard",
	support: "Støtte",
};
