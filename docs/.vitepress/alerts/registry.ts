import type { IssueRef, Repository, TrackedLink } from "../runtime/model.ts";
import type {
	AlertDeployment,
	AlertDesiredDelivery,
	AlertLifecycle,
	AlertNotificationRoute,
	AlertObservation,
	AlertOperationalPhase,
	AlertPolicyCatalog,
	AlertPolicyDecision,
	AlertPolicyEvidence,
	AlertPolicyOwner,
	AlertRegistry,
	AlertReplacement,
	AlertRule,
	AlertSource,
	AlertSourceAutomationFinding,
} from "./model.ts";

export const ALERT_SNAPSHOT_AT = "2026-08-28T17:45:44Z" as const;
export const ALERT_POLICY_DECIDED_AT = "2026-08-28T19:13:53Z" as const;
export const GRAFANA_CONSOLIDATION_REVIEWED_AT =
	"2026-08-29T09:45:02Z" as const;
export const NAIS_ALERTS_URL =
	"https://console.nav.cloud.nais.io/team/team-esyfo/alerts";
export const NAIS_SETTINGS_URL =
	"https://console.nav.cloud.nais.io/team/team-esyfo/settings";
export const NAIS_APPLICATIONS_URL =
	"https://console.nav.cloud.nais.io/team/team-esyfo/applications";
export const GRAFANA_FOLDER_ALERTS_URL =
	"https://grafana.nav.cloud.nais.io/dashboards/f/K-1b-N_4k/team-esyfo/alerting";
export const ERROR_DRILLDOWN_URL =
	"https://grafana.nav.cloud.nais.io/d/team-esyfo-error-drilldown/team-esyfo-e28093-feildrilldown";

const repositorySource = (
	id: AlertSource["id"],
	repository: `navikt/${string}`,
	path: string,
	commitSha: string,
	deliveryAutomationFinding?: AlertSourceAutomationFinding,
): AlertSource => ({
	kind: "repository",
	evidenceKind: "default-branch-snapshot",
	id,
	repository,
	path,
	commitSha,
	href: `https://github.com/${repository}/blob/${commitSha}/${path}`,
	capturedAt: ALERT_SNAPSHOT_AT,
	deliveryAutomationFinding,
});

export const alertSources: AlertSource[] = [
	repositorySource(
		"source:aktivitetskrav-prod",
		"navikt/aktivitetskrav-backend",
		"nais/alerts.yaml",
		"2f120532420ace64ec5b8e9947f7293f92208386",
	),
	repositorySource(
		"source:esyfovarsel-prod",
		"navikt/esyfovarsel",
		"nais/alerts.yaml",
		"4026473093e9fff96748fe2f225630c900d7cfa9",
	),
	{
		kind: "repository",
		evidenceKind: "historical-source-snapshot",
		id: "source:lps-mottak-prod",
		repository: "navikt/lps-oppfolgingsplan-mottak",
		path: "nais/alerts.yaml",
		commitSha: "c2101c2278ed8b67181480beed67c2038121f492",
		href: "https://github.com/navikt/lps-oppfolgingsplan-mottak/blob/c2101c2278ed8b67181480beed67c2038121f492/nais/alerts.yaml",
		capturedAt: ALERT_SNAPSHOT_AT,
		transition: {
			kind: "file-removed",
			commitSha: "16a44e597fdc6bfd9dc01c2ecec41b085c2dfa28",
			occurredAt: "2026-07-02T16:31:50Z",
			href: "https://github.com/navikt/lps-oppfolgingsplan-mottak/commit/16a44e597fdc6bfd9dc01c2ecec41b085c2dfa28",
			summary: "Alertfilen og Altinn-consumeren ble fjernet.",
			cleanupIssue: "navikt/lps-oppfolgingsplan-mottak#637",
		},
	},
	repositorySource(
		"source:lumi-prod",
		"navikt/lumi",
		"apps/lumi-api/nais/alerts/prod.yaml",
		"c880b1a6bf277114cb784eb5ef02bc69b7116145",
	),
	repositorySource(
		"source:budstikka-dev",
		"navikt/syfo-budstikka",
		"nais/alerts-dev.yaml",
		"6536a0090daedb3ade1818ff1e79adc4f0ff7951",
	),
	repositorySource(
		"source:budstikka-prod",
		"navikt/syfo-budstikka",
		"nais/alerts-prod.yaml",
		"6536a0090daedb3ade1818ff1e79adc4f0ff7951",
	),
	repositorySource(
		"source:oppfolgingsplan-dev",
		"navikt/syfo-oppfolgingsplan-backend",
		"nais/alerts-dev.yaml",
		"6fd3e1f6a5564ca73106f2ceedb039e0109bf953",
	),
	repositorySource(
		"source:oppfolgingsplan-prod",
		"navikt/syfo-oppfolgingsplan-backend",
		"nais/alerts-prod.yaml",
		"6fd3e1f6a5564ca73106f2ceedb039e0109bf953",
	),
	repositorySource(
		"source:brukertilgang",
		"navikt/syfobrukertilgang",
		"nais/alerts.yaml",
		"9571911ed14724db56d316c379c51b7b832f9676",
		{
			kind: "path-filter-mismatch",
			workflowHref:
				"https://github.com/navikt/syfobrukertilgang/blob/9571911ed14724db56d316c379c51b7b832f9676/.github/workflows/alerts.yaml",
			watchedPath: "alerts.yaml",
			resourcePath: "nais/alerts.yaml",
		},
	),
	{
		kind: "repository",
		evidenceKind: "historical-source-snapshot",
		id: "source:brukertilgang-fss-historical",
		repository: "navikt/syfobrukertilgang",
		path: "alerts.yaml",
		commitSha: "22b66f6950f874ac10dd5c2012c67c7a0835154e",
		href: "https://github.com/navikt/syfobrukertilgang/blob/22b66f6950f874ac10dd5c2012c67c7a0835154e/alerts.yaml",
		capturedAt: ALERT_SNAPSHOT_AT,
		transition: {
			kind: "deployment-superseded",
			commitSha: "9c9a259c7926093335a24788ed9fd82d00406d82",
			occurredAt: "2023-05-22T11:31:42Z",
			href: "https://github.com/navikt/syfobrukertilgang/commit/9c9a259c7926093335a24788ed9fd82d00406d82",
			summary:
				"Alert-workflowen byttet fra prod-fss til prod-gcp. Snapshotet er siste repository-tilstand før cluster-cutover, ikke bevis på en deployert SHA.",
			cleanupIssue: "navikt/syfobrukertilgang#368",
		},
	},
	repositorySource(
		"source:motebehov-prod",
		"navikt/syfomotebehov",
		"nais/alerts-gcp.yaml",
		"0c1549a71463a60569a4c07cc3c1c147c22d45e4",
		{
			kind: "path-filter-mismatch",
			workflowHref:
				"https://github.com/navikt/syfomotebehov/blob/0c1549a71463a60569a4c07cc3c1c147c22d45e4/.github/workflows/alerts.yaml",
			watchedPath: ".nais/alerts-gcp.yaml",
			resourcePath: "nais/alerts-gcp.yaml",
		},
	),
	repositorySource(
		"source:dokumentporten-prod",
		"navikt/syfo-dokumentporten",
		"nais/alert.yaml",
		"8da3c9926f66d9518e596316829d038ab8df3f55",
	),
	repositorySource(
		"source:oppfolgingsplanservice-prod",
		"navikt/syfooppfolgingsplanservice",
		"nais/alerts-fss.yaml",
		"46e66123d27cc1ad930beb9cb523b1d0b4b712f3",
		{
			kind: "resource-not-referenced",
			workflowHref:
				"https://github.com/navikt/syfooppfolgingsplanservice/blob/46e66123d27cc1ad930beb9cb523b1d0b4b712f3/.github/workflows/build-and-deploy.yaml",
			resourcePath: "nais/alerts-fss.yaml",
		},
	),
	{
		kind: "grafana",
		evidenceKind: "live-grafana",
		id: "source:grafana-varsel-avvik",
		uid: "ce3m1gf7tqwhsa",
		folderUid: "K-1b-N_4k",
		group: "meroppfolging-backend-esyfovarsel",
		href: "https://grafana.nav.cloud.nais.io/alerting/grafana/ce3m1gf7tqwhsa/view",
		lastUpdatedAt: "2024-11-22T09:57:36Z",
	},
	{
		kind: "grafana",
		evidenceKind: "live-grafana",
		id: "source:grafana-kafka-offset",
		uid: "cfq0972pkuy2ob",
		folderUid: "K-1b-N_4k",
		group: "Esyfo Kafka Alerts",
		href: "https://grafana.nav.cloud.nais.io/alerting/grafana/cfq0972pkuy2ob/view",
		lastUpdatedAt: "2026-06-24T07:51:05Z",
	},
];

const linked = (href: string, label: string): TrackedLink => ({
	status: "linked",
	href,
	label,
});
const missingRunbook = (): TrackedLink => ({
	status: "missing",
	issue: "navikt/team-esyfo#211",
});
const missingDashboard = (): TrackedLink => ({
	status: "missing",
	issue: "navikt/team-esyfo#211",
});
const errorDashboard = (app: string): TrackedLink =>
	linked(
		`${ERROR_DRILLDOWN_URL}?orgId=1&from=now-6h&to=now&timezone=browser&var-app=${app}`,
		"Feildrilldown",
	);

const naisNotification: AlertNotificationRoute = {
	kind: "nais-team-slack",
	channel: "#esyfo-alarm",
	verifiedAt: ALERT_SNAPSHOT_AT,
	evidenceHref: NAIS_SETTINGS_URL,
};
const grafanaNotification: AlertNotificationRoute = {
	kind: "grafana-contact-point",
	contactPoint: "Slack-esyfo-alert",
	channel: {
		status: "unresolved",
		reason:
			"Grafana viser kontaktpunktet, men fysisk Slack-kanal ligger bak en webhook og er ikke synlig i regelvisningen.",
		issue: "navikt/team-esyfo#210",
	},
	verifiedAt: ALERT_SNAPSHOT_AT,
	evidenceHref:
		"https://grafana.nav.cloud.nais.io/alerting/notifications?alertmanager=grafana",
};
const permanent: AlertLifecycle = { state: "permanent" };
const notificationMigration: AlertLifecycle = {
	state: "migrating",
	targetDate: "2026-12-18",
	targetRefs: ["app:syfo-budstikka", "topic:budstikka.v1"],
	issue: "navikt/team-esyfo#218",
};
const retiringAccess: AlertLifecycle = {
	state: "retiring",
	reason:
		"syfobrukertilgang skal fases ut etter at syfomotebehov har flyttet tilgangssjekken.",
	issue: "navikt/syfobrukertilgang#369",
};
const followUpPlanSunset: AlertLifecycle = {
	state: "sunset",
	sunsetOn: "2026-08-31",
	issue: "navikt/team-esyfo#208",
};
const orphanedLpsAlert: AlertLifecycle = {
	state: "retiring",
	reason:
		"Consumeren og alert-filen ble fjernet 2. juli 2026, men PrometheusRule-instansen finnes fortsatt i NAIS og må ryddes kontrollert.",
	issue: "navikt/lps-oppfolgingsplan-mottak#637",
};
const retiringKafkaOffset: AlertLifecycle = {
	state: "retiring",
	reason:
		"Den pausede regelen måler absolutt consumer-offset, ikke lag, og kan fjernes uten å redusere aktiv dekning. Reelle topic-kontrakter avklares separat i #212.",
	issue: "navikt/team-esyfo#213",
};

type TeamPolicyOwner = Extract<AlertPolicyOwner, { kind: "team" }>;

const teamOwner = (
	repository: Repository,
	scopeRef: TeamPolicyOwner["scopeRef"],
): TeamPolicyOwner => ({
	kind: "team",
	team: "team-esyfo",
	repository,
	scopeRef,
});

const issueHref = (issue: IssueRef) => {
	const [repository, number] = issue.split("#");
	return `https://github.com/${repository}/issues/${number}`;
};

const issueEvidence = (
	issue: IssueRef,
	summary: string,
): AlertPolicyEvidence => ({
	href: issueHref(issue),
	summary,
	verifiedAt: ALERT_POLICY_DECIDED_AT,
});

const linkEvidence = (href: string, summary: string): AlertPolicyEvidence => ({
	href,
	summary,
	verifiedAt: ALERT_POLICY_DECIDED_AT,
});

const dashboardOnly = (): AlertDesiredDelivery => ({
	tier: "dashboard-only",
});
const ticket = (): AlertDesiredDelivery => ({
	tier: "ticket",
	channelPolicyRef: "channel:esyfo-alarm",
});
const blockedPager = (): AlertDesiredDelivery => ({
	tier: "pager",
	channelPolicyRef: "channel:team-esyfo-pager",
	activation: "blocked",
	blockerIssues: ["navikt/team-esyfo#211", "navikt/team-esyfo#217"],
});

const operationalResponse = <Phase extends AlertOperationalPhase>(
	phase: Phase,
	delivery: AlertDesiredDelivery,
) => ({ phase, delivery });

const plannedReplacement = (
	issue: IssueRef,
	targetRefs: AlertReplacement["targetRefs"],
): AlertReplacement => ({ status: "planned", issue, targetRefs });

const keepPolicy = (
	owner: TeamPolicyOwner,
	rationale: string,
	delivery: AlertDesiredDelivery,
): AlertPolicyDecision => ({
	decision: "KEEP",
	owner,
	rationale,
	operationalResponse: operationalResponse("retained-rule", delivery),
	decidedAt: ALERT_POLICY_DECIDED_AT,
});

const tunePolicy = (
	owner: TeamPolicyOwner,
	rationale: string,
	delivery: AlertDesiredDelivery,
	implementationIssue: IssueRef,
): AlertPolicyDecision => ({
	decision: "TUNE",
	owner,
	rationale,
	operationalResponse: operationalResponse("after-tuning", delivery),
	implementationIssue,
	decidedAt: ALERT_POLICY_DECIDED_AT,
});

const replacePolicy = (
	owner: TeamPolicyOwner,
	rationale: string,
	delivery: AlertDesiredDelivery,
	implementationIssue: IssueRef,
	replacement: AlertReplacement,
): AlertPolicyDecision => ({
	decision: "REPLACE",
	owner,
	rationale,
	operationalResponse: operationalResponse("replacement", delivery),
	implementationIssue,
	replacement,
	decidedAt: ALERT_POLICY_DECIDED_AT,
});

const migratePolicy = (
	owner: TeamPolicyOwner,
	rationale: string,
	delivery: AlertDesiredDelivery,
	implementationIssue: IssueRef,
	replacement: AlertReplacement,
): AlertPolicyDecision => ({
	decision: "MIGRATE",
	owner,
	rationale,
	operationalResponse: operationalResponse("during-migration", delivery),
	implementationIssue,
	replacement,
	decidedAt: ALERT_POLICY_DECIDED_AT,
});

const retireBlockedPolicy = (
	owner: TeamPolicyOwner,
	rationale: string,
	delivery: AlertDesiredDelivery,
	implementationIssue: IssueRef,
	gateIssue: IssueRef,
	condition: string,
): AlertPolicyDecision => ({
	decision: "RETIRE",
	owner,
	rationale,
	operationalResponse: operationalResponse("until-retired", delivery),
	implementationIssue,
	retirementGate: { status: "blocked", issue: gateIssue, condition },
	decidedAt: ALERT_POLICY_DECIDED_AT,
});

const retireReadyPolicy = (
	owner: TeamPolicyOwner,
	rationale: string,
	delivery: AlertDesiredDelivery,
	implementationIssue: IssueRef,
	removalReason: string,
	evidence: [AlertPolicyEvidence, ...AlertPolicyEvidence[]],
	reviewedAt?: AlertPolicyDecision["decidedAt"],
): AlertPolicyDecision => ({
	decision: "RETIRE",
	owner,
	rationale,
	operationalResponse: operationalResponse("until-retired", delivery),
	implementationIssue,
	retirementGate: {
		status: "ready",
		...(reviewedAt ? { reviewedAt } : {}),
		basis: {
			kind: "justified-removal",
			reason: removalReason,
			evidence,
		},
	},
	decidedAt: ALERT_POLICY_DECIDED_AT,
});

const prometheusAlertingPractice = linkEvidence(
	"https://prometheus.io/docs/practices/alerting/",
	"Prometheus anbefaler symptom- og handlingsorienterte alerts, med lenker til runbook og dashboard.",
);
const lpsRemovalEvidence = linkEvidence(
	"https://github.com/navikt/lps-oppfolgingsplan-mottak/commit/16a44e597fdc6bfd9dc01c2ecec41b085c2dfa28",
	"Consumeren og alert-filen ble fjernet 2. juli 2026.",
);

export const alertPolicyCatalog: AlertPolicyCatalog = {
	decisionIssue: "navikt/team-esyfo#210",
	decidedAt: ALERT_POLICY_DECIDED_AT,
	appliesTo: "canonical-production-deployments",
	actionTiers: {
		pager: {
			description:
				"Avbrytende respons kun ved pågående eller nært forestående alvorlig produksjonskonsekvens som krever konkret handling nå.",
			requirements: [
				"Kritisk produksjonsseverity og et signal på bruker-/domenekonsekvens, ikke bare intern årsak.",
				"Testet runbook, diagnostisk dashboard, konsekvens og konkret handling.",
				"Verifisert avbrytende kanal; Slack-ruting alene er ikke pager.",
			],
		},
		ticket: {
			description:
				"Ikke-avbrytende, deduplisert oppfølging med konkret eier og handling innen neste bemannede arbeidsdag.",
			requirements: [
				"Signalerer et konkret problem som må rettes, men ikke krever umiddelbar avbrytelse.",
				"Skal ha diagnostikk og en varig oppfølging dersom Slack-hendelsen ikke løses direkte.",
			],
		},
		"dashboard-only": {
			description:
				"Trend, feilsøkingssignal eller ikke-handlingsrettet indikator uten operativ varslingsrute.",
			requirements: [
				"Ingen forventet umiddelbar eller neste-dag-handling er forhåndsdefinert.",
				"Brukes til diagnose, korrelasjon og kapasitets-/kvalitetstrend.",
			],
		},
	},
	channels: [
		{
			id: "channel:team-esyfo-pager",
			destination: "Team eSyfos avbrytende kanal (ikke etablert)",
			stewardship: "team-esyfo",
			disposition: "planned",
			verification: "unverified",
			allowedTiers: ["pager"],
			rationale:
				"Pager-kandidater kan vedtas, men ingen kan aktiveres før en avbrytende rute og mottakeransvar er verifisert i #217.",
			evidence: [
				issueEvidence(
					"navikt/team-esyfo#217",
					"Shadow-evaluering, test og aktivering av første produksjonsvarsler.",
				),
			],
		},
		{
			id: "channel:esyfo-alarm",
			destination: "#esyfo-alarm",
			stewardship: "team-esyfo",
			disposition: "active",
			verification: "verified",
			allowedTiers: ["ticket"],
			rationale:
				"Dette er Team eSyfos verifiserte NAIS Slack-rute. Den er operativ innboks, men er ikke i seg selv dokumentasjon på pager/on-call.",
			evidence: [
				linkEvidence(
					NAIS_SETTINGS_URL,
					"NAIS-teaminnstillingen viste #esyfo-alarm som Slack-destinasjon.",
				),
			],
		},
		{
			id: "channel:esyfo-data-alert",
			destination: "#esyfo-data-alert",
			stewardship: "external",
			disposition: "external-only",
			verification: "verified",
			allowedTiers: [],
			rationale:
				"Kanalen brukes av Airflow/DAG-er i isyfo-analyse og eies av data scientists; Team eSyfo importerer ikke disse reglene eller ansvaret.",
			evidence: [
				linkEvidence(
					"https://github.com/navikt/isyfo-analyse/blob/e4f532ee22db45baa75841391ec4f4909b46067a/dags/slack_alert_diff_dag.py",
					"Pinnet Airflow-kilde viser bruk av data-alert-kanalen utenfor dette registerets scope.",
				),
			],
		},
		{
			id: "channel:esyfo-kibana-alerts",
			destination: "#esyfo-kibana-alerts",
			stewardship: "unresolved",
			disposition: "no-new-alerts",
			verification: "unverified",
			allowedTiers: [],
			rationale:
				"Ingen nåværende kode- eller plattformreferanse ble funnet. Kanalen behandles som legacy; ingen nye regler rutes dit uten ny eier- og mottakerverifikasjon.",
			evidence: [
				issueEvidence(
					"navikt/team-esyfo#210",
					"Policygjennomgangen dokumenterer uavklart legacy-kanal og no-new-alerts-beslutningen.",
				),
			],
		},
	],
	guardrails: [
		"Én ordinær requestfeil, én pod, rå loggrate, rå consumer-offset eller lag > 0 alene kan ikke page.",
		"Dev-instans skal aldri rute som produksjonspager.",
		"Manglende data eller ukjent evaluatorhelse er ukjent overvåkningstilstand, aldri grønn.",
		"esyfovarsel får bare tidsavgrensede guardrails; ny varselflyt-observability bygges i syfo-budstikka.",
		"Airflow/data science og teamsykefravr-eierskap er utenfor registeret; våre consumers er fortsatt vårt operative ansvar.",
	],
	references: [
		{
			label: "Google SRE Workbook · Alerting on SLOs",
			href: "https://sre.google/workbook/alerting-on-slos/",
		},
		{
			label: "Prometheus · Alerting practices",
			href: "https://prometheus.io/docs/practices/alerting/",
		},
		{
			label: "NAIS · PrometheusRule reference",
			href: "https://docs.nais.io/observability/alerting/reference/prometheusrule/index.html",
		},
		{
			label: "Grafana · No data and error states",
			href: "https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/nodata-and-error-states/",
		},
		{
			label: "Apache Kafka · Monitoring",
			href: "https://kafka.apache.org/42/operations/monitoring/",
		},
	],
};

type RuleSeed = Omit<
	AlertRule,
	"engine" | "ownerTeam" | "notification" | "monitoredRefs"
> & { monitoredRefs?: AlertRule["monitoredRefs"] };

const prometheusRule = (seed: RuleSeed): AlertRule => {
	const { monitoredRefs = seed.targetRefs, ...rest } = seed;
	return {
		engine: "prometheus-rule",
		ownerTeam: "team-esyfo",
		notification: naisNotification,
		...rest,
		monitoredRefs,
	};
};

const grafanaRule = (seed: RuleSeed): AlertRule => {
	const { monitoredRefs = seed.targetRefs, ...rest } = seed;
	return {
		engine: "grafana-managed",
		ownerTeam: "team-esyfo",
		notification: grafanaNotification,
		...rest,
		monitoredRefs,
	};
};

const prod = (
	sourceRef: AlertSource["id"],
	severity: AlertDeployment["severity"],
): AlertDeployment => ({ environment: "prod-gcp", sourceRef, severity });
const prodFss = (
	sourceRef: AlertSource["id"],
	severity: AlertDeployment["severity"],
): AlertDeployment => ({ environment: "prod-fss", sourceRef, severity });
const dev = (
	sourceRef: AlertSource["id"],
	severity: AlertDeployment["severity"],
): AlertDeployment => ({ environment: "dev-gcp", sourceRef, severity });

const allOwnedTopics = [
	"topic:aapen-syfo-oppfolgingsplan-lps-nav-v2",
	"topic:budstikka.v1",
	"topic:dinesykmeldte-hendelser-v2",
	"topic:kartleggingssporsmal-svar",
	"topic:sen-oppfolging-svar",
	"topic:sen-oppfolging-varsel",
	"topic:syfo-narmesteleder-leesah",
	"topic:sykepengedager-informasjon-topic",
	"topic:sykepengedager.infotrygd.v1",
	"topic:varselbus",
] as const;

export const alertRules: AlertRule[] = [
	prometheusRule({
		id: "rule:aktivitetskrav-varsel-consumer-lag",
		name: "KAFKA PROSSESERING (VARSEL) I AKTIVITETSKRAV-BACKEND STOPPET!",
		expr: 'kafka_consumergroup_group_topic_sum_lag{topic="teamsykefravr.aktivitetskrav-varsel", group="aktivitetskrav-backend-group-v2"} > 0',
		holdFor: "10m",
		semantic: "consumer-lag",
		semanticFamily: "legacy-lag-greater-than-zero",
		lifecycle: permanent,
		policy: replacePolicy(
			teamOwner("navikt/aktivitetskrav-backend", "app:aktivitetskrav-backend"),
			"Lag > 0 skiller ikke normal købygging fra fastlåst behandling; vår consumer skal måles på fremdrift, alder og terminale utfall.",
			ticket(),
			"navikt/aktivitetskrav-backend#248",
			plannedReplacement("navikt/aktivitetskrav-backend#248", [
				"app:aktivitetskrav-backend",
			]),
		),
		targetRefs: ["app:aktivitetskrav-backend"],
		externalTargets: ["teamsykefravr.aktivitetskrav-varsel"],
		journeyRefs: ["journey:activity-requirement"],
		pipelineRefs: ["pipeline:notifications"],
		deployments: [prod("source:aktivitetskrav-prod", "critical")],
		runbook: missingRunbook(),
		dashboard: errorDashboard("aktivitetskrav-backend"),
		annotations: {
			summary:
				"aktivitetskrav-backend har ukonsumerte records på varsel-topicen.",
			action: "Finn ut hvorfor aktivitetskrav-backend har stoppet å konsumere.",
		},
		riskNotes: [
			"lag > 0 alene beviser ikke stanset behandling eller brukerinnvirkning",
		],
	}),
	prometheusRule({
		id: "rule:aktivitetskrav-vurdering-consumer-lag",
		name: "KAFKA PROSSESERING (VURDERING) I AKTIVITETSKRAV-BACKEND STOPPET!",
		expr: 'kafka_consumergroup_group_topic_sum_lag{topic="teamsykefravr.aktivitetskrav-vurdering", group="aktivitetskrav-backend-group-v2"} > 0',
		holdFor: "10m",
		semantic: "consumer-lag",
		semanticFamily: "legacy-lag-greater-than-zero",
		lifecycle: permanent,
		policy: replacePolicy(
			teamOwner("navikt/aktivitetskrav-backend", "app:aktivitetskrav-backend"),
			"Vurderingsconsumeren trenger typekorrekt fremdrift; én record i lag er ikke en produksjonsfeil.",
			ticket(),
			"navikt/aktivitetskrav-backend#248",
			plannedReplacement("navikt/aktivitetskrav-backend#248", [
				"app:aktivitetskrav-backend",
			]),
		),
		targetRefs: ["app:aktivitetskrav-backend"],
		externalTargets: ["teamsykefravr.aktivitetskrav-vurdering"],
		journeyRefs: ["journey:activity-requirement"],
		pipelineRefs: [],
		deployments: [prod("source:aktivitetskrav-prod", "critical")],
		runbook: missingRunbook(),
		dashboard: errorDashboard("aktivitetskrav-backend"),
		annotations: {
			summary:
				"aktivitetskrav-backend har ukonsumerte records på vurderingstopicen.",
			action: "Finn ut hvorfor aktivitetskrav-backend har stoppet å konsumere.",
		},
		riskNotes: [
			"lag > 0 alene beviser ikke stanset behandling eller brukerinnvirkning",
		],
	}),
	prometheusRule({
		id: "rule:esyfovarsel-down",
		name: "ESYFOVARSEL IS DOWN!",
		expr: 'kube_deployment_status_replicas_available{deployment="esyfovarsel"} == 0',
		holdFor: "2m",
		semantic: "availability",
		semanticFamily: "legacy-zero-available-replicas",
		lifecycle: notificationMigration,
		policy: migratePolicy(
			teamOwner("navikt/esyfovarsel", "app:esyfovarsel"),
			"All-replicas-down beholdes som en tidsavgrenset ticket-guardrail under migreringen. Eventuell pager bygges på Budstikkas ende-til-ende-signal, ikke legacy-appens podtilstand.",
			ticket(),
			"navikt/esyfovarsel#1094",
			plannedReplacement("navikt/syfo-budstikka#260", [
				"app:syfo-budstikka",
				"topic:budstikka.v1",
			]),
		),
		targetRefs: ["app:esyfovarsel", "topic:varselbus"],
		monitoredRefs: ["app:esyfovarsel"],
		externalTargets: [],
		journeyRefs: ["journey:notifications"],
		pipelineRefs: ["pipeline:notifications"],
		deployments: [prod("source:esyfovarsel-prod", "critical")],
		runbook: missingRunbook(),
		dashboard: errorDashboard("esyfovarsel"),
		annotations: {
			summary: "App esyfovarsel er nede.",
			action: "Undersøk pod-events og logger.",
		},
		riskNotes: [
			"må beholdes kun som tidsavgrenset guardrail under Budstikka-migreringen",
		],
	}),
	prometheusRule({
		id: "rule:esyfovarsel-log-ratio",
		name: "HIGH RATIO OF WARNING/ERRORS IN LOG",
		expr: '(100 * sum by (log_app, log_namespace) (rate(logd_messages_total{log_app="esyfovarsel",log_level=~"Warning|Error"}[3m])) / sum by (log_app, log_namespace) (rate(logd_messages_total{log_app="esyfovarsel"}[3m]))) > 10',
		holdFor: "3m",
		semantic: "log-error-ratio",
		semanticFamily: "legacy-log-ratio",
		lifecycle: notificationMigration,
		policy: retireReadyPolicy(
			teamOwner("navikt/esyfovarsel", "app:esyfovarsel"),
			"Rå Warning/Error-andel er nyttig diagnostikk, men er ikke et stabilt eller konsekvensbasert operativt signal.",
			dashboardOnly(),
			"navikt/esyfovarsel#1094",
			"Ingen operativ evne forsvinner når den generiske loggrate-regelen fjernes; logger beholdes som drilldown.",
			[prometheusAlertingPractice],
		),
		targetRefs: ["app:esyfovarsel"],
		externalTargets: [],
		journeyRefs: ["journey:notifications"],
		pipelineRefs: ["pipeline:notifications"],
		deployments: [prod("source:esyfovarsel-prod", "warning")],
		runbook: missingRunbook(),
		dashboard: errorDashboard("esyfovarsel"),
		annotations: {
			summary: "esyfovarsel har en høy andel Warning/Error-logger.",
			action: "Undersøk loggene.",
		},
		riskNotes: ["rå loggrate er diagnostikk og skal ikke være standard pager"],
	}),
	prometheusRule({
		id: "rule:esyfovarsel-job-failed",
		name: "ESYFOVARSEL-JOB HAS FAILED",
		expr: 'kube_job_failed{job_name=~"esyfovarsel-job.*", namespace="team-esyfo"} > 0',
		holdFor: "2m",
		semantic: "job-failure",
		semanticFamily: "scheduled-job-terminal-failure",
		lifecycle: notificationMigration,
		policy: retireBlockedPolicy(
			teamOwner("navikt/esyfovarsel", "job:esyfovarsel-job"),
			"Jobbfeil følges som ticket mens legacy-jobben finnes; regelen forsvinner sammen med prosessoren etter Budstikka-paritet.",
			ticket(),
			"navikt/esyfovarsel#1094",
			"navikt/team-esyfo#218",
			"Legacy-jobben må være avviklet og varselflyten verifisert i Budstikka før regelen fjernes.",
		),
		targetRefs: ["job:esyfovarsel-job"],
		externalTargets: [],
		journeyRefs: ["journey:notifications"],
		pipelineRefs: ["pipeline:notifications"],
		deployments: [prod("source:esyfovarsel-prod", "warning")],
		runbook: missingRunbook(),
		dashboard: missingDashboard(),
		annotations: {
			summary: "esyfovarsel-job har feilet.",
			action:
				"Undersøk logger og fjern feilet Job-objekt når årsaken er håndtert.",
		},
		riskNotes: ["jobben skal pensjoneres sammen med legacy-prosessoren"],
	}),
	prometheusRule({
		id: "rule:lps-altinn-consumer-lag",
		name: "ALTINN KAFKA OPPFOLGINGSPLAN CONSUMER LAG",
		expr: 'kafka_consumergroup_group_topic_sum_lag{topic="alf.aapen-altinn-oppfolgingsplan-mottatt-v2", group="lps-oppfolgingsplan-mottak-1"} > 0',
		holdFor: "15m",
		semantic: "consumer-lag",
		semanticFamily: "legacy-lag-greater-than-zero",
		lifecycle: orphanedLpsAlert,
		policy: retireReadyPolicy(
			teamOwner(
				"navikt/lps-oppfolgingsplan-mottak",
				"app:lps-oppfolgingsplan-mottak",
			),
			"Consumeren og kildefilen er allerede fjernet; den live regelen er foreldreløs restkonfigurasjon.",
			dashboardOnly(),
			"navikt/lps-oppfolgingsplan-mottak#637",
			"Målt consumer-kapasitet finnes ikke lenger, så regelen har ingen gyldig runtime å beskytte.",
			[lpsRemovalEvidence],
		),
		targetRefs: ["app:lps-oppfolgingsplan-mottak"],
		externalTargets: ["alf.aapen-altinn-oppfolgingsplan-mottatt-v2"],
		journeyRefs: ["journey:follow-up-plan"],
		pipelineRefs: ["pipeline:follow-up-plan-lps"],
		deployments: [prod("source:lps-mottak-prod", "warning")],
		runbook: missingRunbook(),
		dashboard: errorDashboard("lps-oppfolgingsplan-mottak"),
		annotations: {
			summary: "lps-oppfolgingsplan-mottak har ukonsumerte Altinn-meldinger.",
			action: "Finn ut hvorfor konsumenten har stoppet.",
		},
		riskNotes: [
			"foreldreløs live-regel: kildefilen og consumeren ble fjernet i commit 16a44e5 2026-07-02",
			"lag > 0 alene tar ikke høyde for legitim behandlingstid eller nulltrafikk",
		],
	}),
	prometheusRule({
		id: "rule:lumi-definition-conflict",
		name: "LumiSurveyDefinitionConflict",
		expr: 'sum(increase(lumi_survey_definition_conflicts_total{app="lumi-api"}[5m])) > 0',
		semantic: "definition-conflict",
		semanticFamily: "domain-terminal-outcome",
		lifecycle: permanent,
		policy: keepPolicy(
			teamOwner("navikt/lumi", "app:lumi-api"),
			"Definisjonskonflikt er et eksplisitt domeneterminalt utfall med kjent konsekvens, handling og runbook.",
			ticket(),
		),
		targetRefs: ["app:lumi-api"],
		externalTargets: [],
		journeyRefs: ["journey:operational-insight"],
		pipelineRefs: [],
		deployments: [prod("source:lumi-prod", "warning")],
		runbook: linked(
			"https://github.com/navikt/lumi/blob/main/apps/lumi-api/docs/runbooks/survey-definition-conflicts.md",
			"Survey definition conflicts",
		),
		dashboard: errorDashboard("lumi-api"),
		annotations: {
			summary: "Lumi avviser innsendinger på grunn av definisjonskonflikt.",
			consequence:
				"Minst én survey-innsending er avvist med 409 og er ikke lagret.",
			action:
				"Finn kanal og survey_id i strukturerte logger og følg runbooken.",
		},
		riskNotes: [],
	}),
	prometheusRule({
		id: "rule:lumi-submission-failure",
		name: "LumiSubmissionFailure",
		expr: 'sum(increase(lumi_submissions_total{app="lumi-api",outcome="failed"}[5m])) > 0',
		semantic: "submission-failure",
		semanticFamily: "domain-terminal-outcome",
		lifecycle: permanent,
		policy: keepPolicy(
			teamOwner("navikt/lumi", "app:lumi-api"),
			"Autentisert innsending som ikke lagres er et konkret terminalt utfall og skal følges opp som ticket.",
			ticket(),
		),
		targetRefs: ["app:lumi-api"],
		externalTargets: [],
		journeyRefs: ["journey:operational-insight"],
		pipelineRefs: [],
		deployments: [prod("source:lumi-prod", "warning")],
		runbook: linked(
			"https://github.com/navikt/lumi/blob/main/apps/lumi-api/docs/runbooks/submission-health.md",
			"Submission health",
		),
		dashboard: errorDashboard("lumi-api"),
		annotations: {
			summary: "Lumi feiler ved behandling av survey-innsendinger.",
			consequence: "En autentisert innsending kan mangle i dashboardet.",
			action: "Bryt utrulling og følg runbooken.",
		},
		riskNotes: [],
	}),
	prometheusRule({
		id: "rule:lumi-submission-rejection-spike",
		name: "LumiSubmissionRejectionSpike",
		expr: 'sum by (channel) (increase(lumi_submissions_total{app="lumi-api",outcome="rejected"}[10m])) >= 5 and sum by (channel) (increase(lumi_submissions_total{app="lumi-api",outcome="rejected"}[10m])) / clamp_min(sum by (channel) (increase(lumi_submissions_total{app="lumi-api"}[10m])), 1) > 0.1',
		semantic: "submission-rejection",
		semanticFamily: "domain-ratio-with-volume-guard",
		lifecycle: permanent,
		policy: keepPolicy(
			teamOwner("navikt/lumi", "app:lumi-api"),
			"Regelen kombinerer forholdstall med minimumsvolum og måler et definert domeneutfall fremfor én requestfeil.",
			ticket(),
		),
		targetRefs: ["app:lumi-api"],
		externalTargets: [],
		journeyRefs: ["journey:operational-insight"],
		pipelineRefs: [],
		deployments: [prod("source:lumi-prod", "warning")],
		runbook: linked(
			"https://github.com/navikt/lumi/blob/main/apps/lumi-api/docs/runbooks/submission-health.md",
			"Submission health",
		),
		dashboard: errorDashboard("lumi-api"),
		annotations: {
			summary: "Lumi avviser uvanlig mange survey-innsendinger.",
			consequence: "Minst fem og mer enn ti prosent i én kanal er avvist.",
			action: "Stans nye migreringer og følg runbooken.",
		},
		riskNotes: [],
	}),
	prometheusRule({
		id: "rule:lumi-retention-failure",
		name: "LumiRetentionCleanupFailure",
		expr: 'sum(increase(lumi_retention_runs_total{app="lumi-api",outcome="failed"}[15m])) > 0',
		semantic: "retention-failure",
		semanticFamily: "scheduled-process-terminal-failure",
		lifecycle: permanent,
		policy: keepPolicy(
			teamOwner("navikt/lumi", "app:lumi-api"),
			"Mislykket retention-kjøring har konkret personvern-/lagringskonsekvens og en dokumentert oppfølging.",
			ticket(),
		),
		targetRefs: ["app:lumi-api"],
		externalTargets: [],
		journeyRefs: ["journey:operational-insight"],
		pipelineRefs: [],
		deployments: [prod("source:lumi-prod", "warning")],
		runbook: linked(
			"https://github.com/navikt/lumi/blob/main/apps/lumi-api/docs/runbooks/automatic-retention.md",
			"Automatic retention",
		),
		dashboard: errorDashboard("lumi-api"),
		annotations: {
			summary: "Automatisk sletting av gamle Lumi-svar feiler.",
			consequence: "Svar kan bli liggende lenger enn 12 måneder.",
			action: "Undersøk feilen og verifiser neste kjøring.",
		},
		riskNotes: [],
	}),
	prometheusRule({
		id: "rule:lumi-retention-stale",
		name: "LumiRetentionCleanupStale",
		expr: 'max(lumi_retention_enabled{app="lumi-api"}) == 1 and on() ((time() - max(max_over_time(lumi_retention_last_success_timestamp_seconds{app="lumi-api"}[36h])) > 129600) or on() absent_over_time(lumi_retention_last_success_timestamp_seconds{app="lumi-api"}[15m]))',
		holdFor: "15m",
		semantic: "retention-freshness",
		semanticFamily: "scheduled-process-freshness",
		lifecycle: permanent,
		policy: keepPolicy(
			teamOwner("navikt/lumi", "app:lumi-api"),
			"Freshness og manglende serie håndteres eksplisitt; signalet dekker uteblitt suksess, ikke intern feilrate.",
			ticket(),
		),
		targetRefs: ["app:lumi-api"],
		externalTargets: [],
		journeyRefs: ["journey:operational-insight"],
		pipelineRefs: [],
		deployments: [prod("source:lumi-prod", "warning")],
		runbook: linked(
			"https://github.com/navikt/lumi/blob/main/apps/lumi-api/docs/runbooks/automatic-retention.md",
			"Automatic retention",
		),
		dashboard: errorDashboard("lumi-api"),
		annotations: {
			summary: "Automatisk sletting av gamle Lumi-svar har ikke fullført.",
			consequence:
				"Ingen instans har rapportert vellykket opprydding innen 36 timer.",
			action: "Kontroller konfigurasjon, scheduler, database og scraping.",
		},
		riskNotes: [],
	}),
	prometheusRule({
		id: "rule:budstikka-consumer-lag-warning",
		name: "BudstikkaConsumerLagWarning",
		expr: 'max by (topic) (kafka_consumer_fetch_manager_records_lag_max{app="syfo-budstikka", namespace="team-esyfo", topic="team-esyfo.budstikka.v1"}) > 100',
		holdFor: "15m",
		semantic: "consumer-lag",
		semanticFamily: "bounded-consumer-lag",
		lifecycle: permanent,
		policy: tunePolicy(
			teamOwner("navikt/syfo-budstikka", "app:syfo-budstikka"),
			"Varselgrensen er bedre enn lag > 0, men skal kalibreres mot forventet trafikk og ende-til-ende-ferskhet.",
			ticket(),
			"navikt/syfo-budstikka#260",
		),
		targetRefs: ["app:syfo-budstikka", "topic:budstikka.v1"],
		monitoredRefs: ["app:syfo-budstikka", "topic:budstikka.v1"],
		externalTargets: [],
		journeyRefs: ["journey:notifications"],
		pipelineRefs: ["pipeline:notifications"],
		deployments: [
			dev("source:budstikka-dev", "warning"),
			prod("source:budstikka-prod", "warning"),
		],
		runbook: linked(
			"https://github.com/navikt/syfo-budstikka/blob/main/docs/helsesjekk.md",
			"Budstikka helsesjekk",
		),
		dashboard: errorDashboard("syfo-budstikka"),
		annotations: {
			summary: "Budstikka har hatt mer enn 100 meldinger lag i 15 minutter.",
			consequence: "Varsler kan være forsinket.",
			action: "Følg runbooken for consumer-lag, dead letters og inbox-feil.",
		},
		riskNotes: [
			"må avstemmes mot forventet trafikk og ende-til-ende-ferskhet i #212",
		],
	}),
	prometheusRule({
		id: "rule:budstikka-consumer-lag-critical",
		name: "BudstikkaConsumerLagCritical",
		expr: 'max by (topic) (kafka_consumer_fetch_manager_records_lag_max{app="syfo-budstikka", namespace="team-esyfo", topic="team-esyfo.budstikka.v1"}) > 0',
		holdFor: "1h",
		semantic: "consumer-lag",
		semanticFamily: "bounded-consumer-lag",
		lifecycle: permanent,
		policy: replacePolicy(
			teamOwner("navikt/syfo-budstikka", "app:syfo-budstikka"),
			"Lag > 0 i én time er fortsatt køtilstand, ikke sikkert bevis på alvorlig konsekvens; pager-kandidaten skal bygge på eldste alder/ferskhet og terminale utfall.",
			blockedPager(),
			"navikt/syfo-budstikka#260",
			plannedReplacement("navikt/syfo-budstikka#260", [
				"app:syfo-budstikka",
				"topic:budstikka.v1",
			]),
		),
		targetRefs: ["app:syfo-budstikka", "topic:budstikka.v1"],
		monitoredRefs: ["app:syfo-budstikka", "topic:budstikka.v1"],
		externalTargets: [],
		journeyRefs: ["journey:notifications"],
		pipelineRefs: ["pipeline:notifications"],
		deployments: [
			dev("source:budstikka-dev", "critical"),
			prod("source:budstikka-prod", "critical"),
		],
		runbook: linked(
			"https://github.com/navikt/syfo-budstikka/blob/main/docs/helsesjekk.md",
			"Budstikka helsesjekk",
		),
		dashboard: errorDashboard("syfo-budstikka"),
		annotations: {
			summary: "Budstikka har ikke tømt topicen på én time.",
			consequence: "Varsler leveres ikke eller er vesentlig forsinket.",
			action: "Følg runbooken; restart alene løser ikke poison records.",
		},
		riskNotes: [
			"må avstemmes mot ende-til-ende-ferskhet og legitim nulltrafikk i #212",
		],
	}),
	prometheusRule({
		id: "rule:oppfolgingsplan-sykmelding-deserialization",
		name: "SykmeldingConsumerDeserializationErrors",
		expr: 'rate(syfo_oppfolgingsplan_backend_sykmelding_deserialization_error_total{namespace="team-esyfo"}[5m]) > 0.1',
		holdFor: "5m",
		semantic: "permanent-delivery-failure",
		semanticFamily: "kafka-terminal-record-failure",
		lifecycle: permanent,
		policy: keepPolicy(
			teamOwner(
				"navikt/syfo-oppfolgingsplan-backend",
				"app:syfo-oppfolgingsplan-backend",
			),
			"Vedvarende deserialiseringsrate betyr at flere records forkastes permanent og kan gi manglende sykmeldingsperioder.",
			blockedPager(),
		),
		targetRefs: ["app:syfo-oppfolgingsplan-backend"],
		externalTargets: ["teamsykmelding sykmeldingsperioder"],
		journeyRefs: ["journey:follow-up-plan"],
		pipelineRefs: ["pipeline:follow-up-plan-lps"],
		deployments: [
			dev("source:oppfolgingsplan-dev", "warning"),
			prod("source:oppfolgingsplan-prod", "critical"),
		],
		runbook: missingRunbook(),
		dashboard: errorDashboard("syfo-oppfolgingsplan-backend"),
		annotations: {
			summary: "Sykmelding-consumeren forkaster meldinger permanent.",
			consequence: "Oppfølgingsplanen kan mangle sykmeldingsperioder.",
			action: "Verifiser serialiseringsmodellen mot topic-kontrakten.",
		},
		riskNotes: [],
	}),
	prometheusRule({
		id: "rule:oppfolgingsplan-sykmelding-runtime-errors",
		name: "SykmeldingConsumerRuntimeErrors",
		expr: 'rate(syfo_oppfolgingsplan_backend_sykmelding_runtime_error_total{namespace="team-esyfo"}[5m]) > 0.05',
		holdFor: "10m",
		semantic: "runtime-errors",
		semanticFamily: "kafka-transient-runtime-errors",
		lifecycle: permanent,
		policy: keepPolicy(
			teamOwner(
				"navikt/syfo-oppfolgingsplan-backend",
				"app:syfo-oppfolgingsplan-backend",
			),
			"Vedvarende transiente consumerfeil er handlingsrettet, men backoff og retry gjør dette til ticket fremfor pager.",
			ticket(),
		),
		targetRefs: ["app:syfo-oppfolgingsplan-backend"],
		externalTargets: ["teamsykmelding sykmeldingsperioder"],
		journeyRefs: ["journey:follow-up-plan"],
		pipelineRefs: ["pipeline:follow-up-plan-lps"],
		deployments: [
			dev("source:oppfolgingsplan-dev", "warning"),
			prod("source:oppfolgingsplan-prod", "warning"),
		],
		runbook: missingRunbook(),
		dashboard: errorDashboard("syfo-oppfolgingsplan-backend"),
		annotations: {
			summary: "Sykmelding-consumeren har gjentatte transiente feil.",
			consequence: "Consumeren kjører med backoff og behandling kan forsinkes.",
			action: "Kontroller Kafka, database og nettverk.",
		},
		riskNotes: [],
	}),
	prometheusRule({
		id: "rule:oppfolgingsplan-outbox-oldest-due",
		name: "OppfolgingsplanOutboxOldestDueTooOld",
		expr: 'syfo_oppfolgingsplan_backend_outbox_oldest_due_age_seconds{namespace="team-esyfo",message_type=~"OPPFOLGINGSPLAN_.*"} > 900',
		holdFor: "10m",
		semantic: "outbox-oldest-age",
		semanticFamily: "outbox-progress",
		lifecycle: permanent,
		policy: keepPolicy(
			teamOwner(
				"navikt/syfo-oppfolgingsplan-backend",
				"app:syfo-oppfolgingsplan-backend",
			),
			"Eldste leveringsklare arbeid over 15 minutter er et direkte freshness-/progress-signal, men én forsinket melding mangler foreløpig dokumentert tids-SLO og volum-/impactkrav for pager.",
			ticket(),
		),
		targetRefs: [
			"app:syfo-oppfolgingsplan-backend",
			"app:syfo-budstikka",
			"topic:budstikka.v1",
		],
		monitoredRefs: ["app:syfo-oppfolgingsplan-backend"],
		externalTargets: [],
		journeyRefs: ["journey:notifications", "journey:follow-up-plan"],
		pipelineRefs: ["pipeline:notifications"],
		deployments: [
			dev("source:oppfolgingsplan-dev", "warning"),
			prod("source:oppfolgingsplan-prod", "critical"),
		],
		runbook: missingRunbook(),
		dashboard: errorDashboard("syfo-oppfolgingsplan-backend"),
		annotations: {
			summary: "Oppfølgingsplan-outboxen leverer ikke varsler raskt nok.",
			consequence: "Varsler har vært klare for levering i mer enn 15 minutter.",
			action: "Sjekk outbox, Kafka/Budstikka og failure_count.",
		},
		riskNotes: [
			"moderne alderssignal som bør gjenbrukes før nye generiske lagvarsler",
		],
	}),
	prometheusRule({
		id: "rule:oppfolgingsplan-outbox-expired-claims",
		name: "OppfolgingsplanOutboxExpiredClaims",
		expr: 'syfo_oppfolgingsplan_backend_outbox_expired_claims{namespace="team-esyfo",message_type=~"OPPFOLGINGSPLAN_.*"} > 0',
		holdFor: "10m",
		semantic: "outbox-expired-claims",
		semanticFamily: "outbox-progress",
		lifecycle: permanent,
		policy: keepPolicy(
			teamOwner(
				"navikt/syfo-oppfolgingsplan-backend",
				"app:syfo-oppfolgingsplan-backend",
			),
			"Utløpte claims er et konkret prosessproblem, men må vurderes sammen med alder før det kan være avbrytende.",
			ticket(),
		),
		targetRefs: [
			"app:syfo-oppfolgingsplan-backend",
			"app:syfo-budstikka",
			"topic:budstikka.v1",
		],
		monitoredRefs: ["app:syfo-oppfolgingsplan-backend"],
		externalTargets: [],
		journeyRefs: ["journey:notifications", "journey:follow-up-plan"],
		pipelineRefs: ["pipeline:notifications"],
		deployments: [
			dev("source:oppfolgingsplan-dev", "warning"),
			prod("source:oppfolgingsplan-prod", "warning"),
		],
		runbook: missingRunbook(),
		dashboard: errorDashboard("syfo-oppfolgingsplan-backend"),
		annotations: {
			summary: "Oppfølgingsplan-outboxen har vedvarende utløpte claims.",
			consequence: "Varsler kan forsinkes eller få dupliserte leveringsforsøk.",
			action: "Sjekk pod-restarts, timeouts, Kafka-latens og lease-budsjett.",
		},
		riskNotes: [
			"moderne prosessignal som må vurderes sammen med eldste ventende arbeid",
		],
	}),
	prometheusRule({
		id: "rule:oppfolgingsplan-outbox-persistent-failures",
		name: "OppfolgingsplanOutboxPersistentFailures",
		expr: 'syfo_oppfolgingsplan_backend_outbox_retrying{namespace="team-esyfo",message_type=~"OPPFOLGINGSPLAN_.*"} > 0',
		holdFor: "15m",
		semantic: "outbox-persistent-failures",
		semanticFamily: "outbox-progress",
		lifecycle: permanent,
		policy: keepPolicy(
			teamOwner(
				"navikt/syfo-oppfolgingsplan-backend",
				"app:syfo-oppfolgingsplan-backend",
			),
			"Vedvarende retry viser et konkret feilobjekt, men én fastlåst melding alene skal følges som ticket, ikke page.",
			ticket(),
		),
		targetRefs: [
			"app:syfo-oppfolgingsplan-backend",
			"app:syfo-budstikka",
			"topic:budstikka.v1",
		],
		monitoredRefs: ["app:syfo-oppfolgingsplan-backend"],
		externalTargets: [],
		journeyRefs: ["journey:notifications", "journey:follow-up-plan"],
		pipelineRefs: ["pipeline:notifications"],
		deployments: [
			dev("source:oppfolgingsplan-dev", "warning"),
			prod("source:oppfolgingsplan-prod", "critical"),
		],
		runbook: missingRunbook(),
		dashboard: errorDashboard("syfo-oppfolgingsplan-backend"),
		annotations: {
			summary: "Oppfølgingsplan-outboxen har vedvarende tekniske feil.",
			consequence: "Et varsel har hatt uløst teknisk feil i minst 15 minutter.",
			action: "Sjekk outbox, Budstikka/Kafka og failure_count.",
		},
		riskNotes: ["moderne terminal-/retry-signal som bør gjenbrukes"],
	}),
	prometheusRule({
		id: "rule:brukertilgang-down",
		name: "SYFOBRUKERTILGANG IS DOWN!",
		expr: 'kube_deployment_status_replicas_available{deployment="syfobrukertilgang"} == 0',
		holdFor: "5m",
		semantic: "availability",
		semanticFamily: "legacy-zero-available-replicas",
		lifecycle: retiringAccess,
		policy: retireBlockedPolicy(
			teamOwner("navikt/syfobrukertilgang", "app:syfobrukertilgang"),
			"All-replicas-down er en midlertidig ticket-guardrail mens den antatt siste konsumenten og eventuelle øvrige konsumenter verifiseres og flyttes; regelen pensjoneres når cutover er bevist.",
			ticket(),
			"navikt/syfobrukertilgang#369",
			"navikt/syfomotebehov#755",
			"Alle produksjonskonsumenter må bruke verifisert erstatning i esyfo-narmesteleder.",
		),
		targetRefs: ["app:syfobrukertilgang"],
		externalTargets: [],
		journeyRefs: ["journey:access-control"],
		pipelineRefs: [],
		deployments: [
			prodFss("source:brukertilgang-fss-historical", "critical"),
			prod("source:brukertilgang", "critical"),
		],
		runbook: missingRunbook(),
		dashboard: errorDashboard("syfobrukertilgang"),
		annotations: {
			summary: "syfobrukertilgang er nede.",
			action: "Undersøk hvorfor tjenesten er nede.",
		},
		riskNotes: [
			"NAIS-applikasjonslisten viser bare dev-gcp og prod-gcp; prod-fss-instansen er bekreftet restkonfigurasjon per 2026-08-28",
			"må beholdes frem til faktisk cutover, deretter pensjoneres",
		],
	}),
	prometheusRule({
		id: "rule:brukertilgang-http-5xx",
		name: "HIGH RATIO OF HTTP 5XX RESPONSE",
		expr: '(100 * (sum by (backend) (rate(nginx_ingress_controller_requests{namespace="team-esyfo", status=~"^5\\d\\d", service="syfobrukertilgang"}[5m])) / sum by (backend) (rate(nginx_ingress_controller_requests{namespace="team-esyfo", service="syfobrukertilgang"}[5m])))) > 2',
		holdFor: "5m",
		semantic: "http-5xx-ratio",
		semanticFamily: "legacy-nginx-http-5xx-ratio",
		lifecycle: retiringAccess,
		policy: retireBlockedPolicy(
			teamOwner("navikt/syfobrukertilgang", "app:syfobrukertilgang"),
			"5xx beholdes kun som ikke-avbrytende guardrail frem til tjenesten ikke lenger har konsumenter.",
			ticket(),
			"navikt/syfobrukertilgang#369",
			"navikt/syfomotebehov#755",
			"Tilgangscutover og observasjonsperiode må være verifisert før siste GCP-regel fjernes.",
		),
		targetRefs: ["app:syfobrukertilgang"],
		externalTargets: [],
		journeyRefs: ["journey:access-control"],
		pipelineRefs: [],
		deployments: [
			prodFss("source:brukertilgang-fss-historical", "warning"),
			prod("source:brukertilgang", "warning"),
		],
		runbook: missingRunbook(),
		dashboard: errorDashboard("syfobrukertilgang"),
		annotations: {
			summary: "syfobrukertilgang har en høy andel 5xx.",
			action: "Sjekk Grafana og logger.",
		},
		riskNotes: ["mangler eksplisitt minimumstrafikk og SLO-burn-semantikk"],
	}),
	prometheusRule({
		id: "rule:brukertilgang-http-4xx",
		name: "HIGH RATIO OF HTTP 4XX RESPONSE",
		expr: '(100 * (sum by (backend) (rate(nginx_ingress_controller_requests{namespace="team-esyfo", status=~"^4\\d\\d", service="syfobrukertilgang"}[5m])) / sum by (backend) (rate(nginx_ingress_controller_requests{namespace="team-esyfo", service="syfobrukertilgang"}[5m])))) > 10',
		holdFor: "5m",
		semantic: "http-4xx-ratio",
		semanticFamily: "legacy-nginx-http-4xx-ratio",
		lifecycle: retiringAccess,
		policy: retireBlockedPolicy(
			teamOwner("navikt/syfobrukertilgang", "app:syfobrukertilgang"),
			"Generisk 4xx-rate er diagnostikk og skal ikke varsle; endelig regelcleanup følger tjenestens cutover.",
			dashboardOnly(),
			"navikt/syfobrukertilgang#369",
			"navikt/syfomotebehov#755",
			"GCP-regelsettet fjernes samlet etter verifisert tilgangscutover.",
		),
		targetRefs: ["app:syfobrukertilgang"],
		externalTargets: [],
		journeyRefs: ["journey:access-control"],
		pipelineRefs: [],
		deployments: [
			prodFss("source:brukertilgang-fss-historical", "warning"),
			prod("source:brukertilgang", "warning"),
		],
		runbook: missingRunbook(),
		dashboard: errorDashboard("syfobrukertilgang"),
		annotations: {
			summary: "syfobrukertilgang har en høy andel 4xx.",
			action: "Sjekk Grafana og logger.",
		},
		riskNotes: [
			"4xx kan være forventet klientatferd og skal ikke page uten domeneimpact",
		],
	}),
	prometheusRule({
		id: "rule:motebehov-down",
		name: "SYFOMOTEBEHOV IS DOWN!",
		expr: 'kube_deployment_status_replicas_available{deployment="syfomotebehov"} == 0',
		holdFor: "5m",
		semantic: "availability",
		semanticFamily: "legacy-zero-available-replicas",
		lifecycle: permanent,
		policy: tunePolicy(
			teamOwner("navikt/syfomotebehov", "app:syfomotebehov"),
			"Null tilgjengelige replikaer kan være pager-kandidat, men workflow, konsekvens, runbook og avbrytende rute må verifiseres først.",
			blockedPager(),
			"navikt/syfomotebehov#753",
		),
		targetRefs: ["app:syfomotebehov"],
		externalTargets: [],
		journeyRefs: ["journey:meeting-needs", "journey:dialog-meeting"],
		pipelineRefs: [],
		deployments: [prod("source:motebehov-prod", "critical")],
		runbook: missingRunbook(),
		dashboard: errorDashboard("syfomotebehov"),
		annotations: {
			summary: "syfomotebehov er nede.",
			action: "Undersøk hvorfor tjenesten er nede.",
		},
		riskNotes: ["enkelt runtime-signal må kobles til request-/reiseimpact"],
	}),
	prometheusRule({
		id: "rule:motebehov-http-5xx",
		name: "HIGH RATIO OF HTTP 5XX RESPONSE",
		expr: '(100 * sum by (backend) (rate(nginx_ingress_controller_requests{namespace="team-esyfo", status=~"^5\\d\\d", service="syfomotebehov"}[5m])) / sum by (backend) (rate(nginx_ingress_controller_requests{namespace="team-esyfo", service="syfomotebehov"}[5m]))) > 2',
		holdFor: "5m",
		semantic: "http-5xx-ratio",
		semanticFamily: "legacy-nginx-http-5xx-ratio",
		lifecycle: permanent,
		policy: tunePolicy(
			teamOwner("navikt/syfomotebehov", "app:syfomotebehov"),
			"5xx trenger minimumsvolum eller SLO-burn-rate; én requestfeil skal ikke gi operativ hendelse.",
			ticket(),
			"navikt/syfomotebehov#753",
		),
		targetRefs: ["app:syfomotebehov"],
		externalTargets: [],
		journeyRefs: ["journey:meeting-needs", "journey:dialog-meeting"],
		pipelineRefs: [],
		deployments: [prod("source:motebehov-prod", "warning")],
		runbook: missingRunbook(),
		dashboard: errorDashboard("syfomotebehov"),
		annotations: {
			summary: "syfomotebehov har en høy andel 5xx.",
			action: "Sjekk Grafana og logger.",
		},
		riskNotes: ["mangler eksplisitt minimumstrafikk og SLO-burn-semantikk"],
	}),
	prometheusRule({
		id: "rule:motebehov-http-4xx",
		name: "HIGH RATIO OF HTTP 4XX RESPONSE",
		expr: '(100 * sum by (backend) (rate(nginx_ingress_controller_requests{namespace="team-esyfo", status=~"^4\\d\\d", service="syfomotebehov"}[5m])) / sum by (backend) (rate(nginx_ingress_controller_requests{namespace="team-esyfo", service="syfomotebehov"}[5m]))) > 10',
		holdFor: "5m",
		semantic: "http-4xx-ratio",
		semanticFamily: "legacy-nginx-http-4xx-ratio",
		lifecycle: permanent,
		policy: retireReadyPolicy(
			teamOwner("navikt/syfomotebehov", "app:syfomotebehov"),
			"Generisk 4xx-rate blander forventede avvisninger og klientfeil uten definert teamhandling.",
			dashboardOnly(),
			"navikt/syfomotebehov#753",
			"Ingen operativ evne forsvinner; 4xx beholdes som dashboard-diagnostikk og eventuelle domeneavvisninger må få egne signaler.",
			[prometheusAlertingPractice],
		),
		targetRefs: ["app:syfomotebehov"],
		externalTargets: [],
		journeyRefs: ["journey:meeting-needs", "journey:dialog-meeting"],
		pipelineRefs: [],
		deployments: [prod("source:motebehov-prod", "warning")],
		runbook: missingRunbook(),
		dashboard: errorDashboard("syfomotebehov"),
		annotations: {
			summary: "syfomotebehov har en høy andel 4xx.",
			action: "Sjekk Grafana og logger.",
		},
		riskNotes: [
			"4xx kan være forventet klientatferd og skal ikke page uten domeneimpact",
		],
	}),
	prometheusRule({
		id: "rule:motebehov-oppfolgingstilfelle-lag",
		name: "KAFKA ISOPPFOLGINGSTILFELLE-TOPIC CONSUMER LAG",
		expr: 'kafka_consumergroup_group_topic_sum_lag{topic="teamsykefravr.isoppfolgingstilfelle-oppfolgingstilfelle-person", group="syfomotebehov-p-isoppfolgingstilfelle"} > 0',
		holdFor: "15m",
		semantic: "consumer-lag",
		semanticFamily: "legacy-lag-greater-than-zero",
		lifecycle: permanent,
		policy: replacePolicy(
			teamOwner("navikt/syfomotebehov", "app:syfomotebehov"),
			"Eksternt topic-eierskap endrer ikke vårt consumeransvar, men lag > 0 må erstattes av alder/fremdrift og terminale utfall.",
			ticket(),
			"navikt/syfomotebehov#754",
			plannedReplacement("navikt/syfomotebehov#754", ["app:syfomotebehov"]),
		),
		targetRefs: ["app:syfomotebehov"],
		externalTargets: [
			"teamsykefravr.isoppfolgingstilfelle-oppfolgingstilfelle-person",
		],
		journeyRefs: ["journey:meeting-needs", "journey:dialog-meeting"],
		pipelineRefs: [],
		deployments: [prod("source:motebehov-prod", "warning")],
		runbook: missingRunbook(),
		dashboard: errorDashboard("syfomotebehov"),
		annotations: {
			summary: "syfomotebehov har ukonsumerte oppfølgingstilfelle-meldinger.",
			action: "Finn ut hvorfor konsumenten har stoppet.",
		},
		riskNotes: [
			"lag > 0 alene beviser ikke stanset behandling eller brukerinnvirkning",
		],
	}),
	prometheusRule({
		id: "rule:dokumentporten-terminal-varsel-error",
		name: "syfo-dokumentporten-varselinstruks-terminal-error",
		expr: 'sum(increase(syfo_dokumentporten_varsel_permanent_error_total{app="syfo-dokumentporten",namespace="team-esyfo"}[5m])) > 0',
		holdFor: "1m",
		semantic: "permanent-delivery-failure",
		semanticFamily: "domain-terminal-outcome",
		lifecycle: notificationMigration,
		policy: migratePolicy(
			teamOwner("navikt/syfo-dokumentporten", "app:syfo-dokumentporten"),
			"Terminal feil er et godt domeneutfall, men én melding krever ticket; ansvaret skal migreres til Budstikkas ende-til-ende-flyt.",
			ticket(),
			"navikt/team-esyfo#218",
			plannedReplacement("navikt/syfo-budstikka#260", [
				"app:syfo-budstikka",
				"topic:budstikka.v1",
			]),
		),
		targetRefs: ["app:syfo-dokumentporten", "topic:varselbus"],
		monitoredRefs: ["app:syfo-dokumentporten"],
		externalTargets: [],
		journeyRefs: ["journey:document-delivery", "journey:notifications"],
		pipelineRefs: ["pipeline:notifications"],
		deployments: [prod("source:dokumentporten-prod", "critical")],
		runbook: missingRunbook(),
		dashboard: errorDashboard("syfo-dokumentporten"),
		annotations: {
			summary: "Varselinstruks har gått til terminal ERROR.",
			consequence:
				"Publisering har feilet permanent eller brukt opp retry-terskelen.",
			action: "Undersøk logger og følg opp varselinstrukser som har stoppet.",
		},
		riskNotes: [
			"må migreres til ny Budstikka-flyt, ikke kopieres som legacy-regel",
		],
	}),
	prometheusRule({
		id: "rule:oppfolgingsplanservice-down",
		name: "SYFOOPPFOLGINGSPLAN IS DOWN!",
		expr: 'kube_deployment_status_replicas_available{deployment="syfooppfolgingsplanservice"} == 0',
		holdFor: "5m",
		semantic: "availability",
		semanticFamily: "legacy-zero-available-replicas",
		lifecycle: followUpPlanSunset,
		policy: retireBlockedPolicy(
			teamOwner(
				"navikt/syfooppfolgingsplanservice",
				"app:syfooppfolgingsplanservice",
			),
			"Availability beholdes kun som midlertidig ticket-guardrail frem til besluttet avvikling 31. august; det gjøres ingen ny pagerinvestering.",
			ticket(),
			"navikt/team-esyfo#208",
			"navikt/team-esyfo#208",
			"Runtime og avhengigheter må være verifisert borte før regelen fjernes.",
		),
		targetRefs: ["app:syfooppfolgingsplanservice"],
		externalTargets: [],
		journeyRefs: ["journey:follow-up-plan"],
		pipelineRefs: [],
		deployments: [prodFss("source:oppfolgingsplanservice-prod", "critical")],
		runbook: missingRunbook(),
		dashboard: missingDashboard(),
		annotations: {
			summary: "syfooppfolgingsplanservice er nede.",
			action: "Undersøk hvorfor tjenesten er nede frem til avvikling.",
		},
		riskNotes: ["skal fjernes etter bekreftet avvikling 31. august 2026"],
	}),
	prometheusRule({
		id: "rule:oppfolgingsplanservice-http-5xx",
		name: "HIGH RATIO OF HTTP 5XX RESPONSE",
		expr: '(100 * sum by (backend) (rate(nginx_ingress_controller_requests{namespace="team-esyfo", status=~"^5\\d\\d", service="syfooppfolgingsplanservice"}[5m])) / sum by (backend) (rate(nginx_ingress_controller_requests{namespace="team-esyfo", service="syfooppfolgingsplanservice"}[5m]))) > 2',
		holdFor: "5m",
		semantic: "http-5xx-ratio",
		semanticFamily: "legacy-nginx-http-5xx-ratio",
		lifecycle: followUpPlanSunset,
		policy: retireBlockedPolicy(
			teamOwner(
				"navikt/syfooppfolgingsplanservice",
				"app:syfooppfolgingsplanservice",
			),
			"5xx er en midlertidig ticket frem til avvikling; det er ikke verdt å bygge ny SLO i en runtime som stenges.",
			ticket(),
			"navikt/team-esyfo#208",
			"navikt/team-esyfo#208",
			"Runtime må være verifisert borte etter 31. august før alerten fjernes.",
		),
		targetRefs: ["app:syfooppfolgingsplanservice"],
		externalTargets: [],
		journeyRefs: ["journey:follow-up-plan"],
		pipelineRefs: [],
		deployments: [prodFss("source:oppfolgingsplanservice-prod", "warning")],
		runbook: missingRunbook(),
		dashboard: missingDashboard(),
		annotations: {
			summary: "syfooppfolgingsplanservice har en høy andel 5xx.",
			action: "Sjekk Grafana og logger frem til avvikling.",
		},
		riskNotes: ["skal fjernes etter bekreftet avvikling 31. august 2026"],
	}),
	prometheusRule({
		id: "rule:oppfolgingsplanservice-http-4xx",
		name: "HIGH RATIO OF HTTP 4XX RESPONSE",
		expr: '(100 * sum by (backend) (rate(nginx_ingress_controller_requests{namespace="team-esyfo", status=~"^4\\d\\d", service="syfooppfolgingsplanservice"}[5m])) / sum by (backend) (rate(nginx_ingress_controller_requests{namespace="team-esyfo", service="syfooppfolgingsplanservice"}[5m]))) > 10',
		holdFor: "5m",
		semantic: "http-4xx-ratio",
		semanticFamily: "legacy-nginx-http-4xx-ratio",
		lifecycle: followUpPlanSunset,
		policy: retireBlockedPolicy(
			teamOwner(
				"navikt/syfooppfolgingsplanservice",
				"app:syfooppfolgingsplanservice",
			),
			"Generisk 4xx er kun diagnostikk frem til tjenesten avvikles; ingen ny alertinvestering gjøres.",
			dashboardOnly(),
			"navikt/team-esyfo#208",
			"navikt/team-esyfo#208",
			"Runtime må være verifisert borte etter 31. august før siste regelcleanup.",
		),
		targetRefs: ["app:syfooppfolgingsplanservice"],
		externalTargets: [],
		journeyRefs: ["journey:follow-up-plan"],
		pipelineRefs: [],
		deployments: [prodFss("source:oppfolgingsplanservice-prod", "warning")],
		runbook: missingRunbook(),
		dashboard: missingDashboard(),
		annotations: {
			summary: "syfooppfolgingsplanservice har en høy andel 4xx.",
			action: "Sjekk Grafana og logger frem til avvikling.",
		},
		riskNotes: ["skal fjernes etter bekreftet avvikling 31. august 2026"],
	}),
	grafanaRule({
		id: "rule:grafana-varsel-avvik",
		name: "Alert for avvik i utsendte varsler",
		expr: 'sum by (meroppfolging_backend_sen_oppfolging_varsler_to_be_sent_total) (rate(meroppfolging_backend_sen_oppfolging_varsler_to_be_sent_total{app="meroppfolging-backend"}[7d])) - sum by (esyfovarsel_mer_veiledning_notice_sent_total) (rate(esyfovarsel_mer_veiledning_notice_sent_total{app="esyfovarsel"}[7d]))',
		holdFor: "10h",
		evaluationInterval: "2h",
		semantic: "migration-reconciliation",
		semanticFamily: "legacy-notification-reconciliation",
		lifecycle: notificationMigration,
		policy: replacePolicy(
			teamOwner("navikt/team-esyfo", "pipeline:notifications"),
			"Den pausede differansen sammenligner kandidater med et senere legacy-tellepunkt etter deler av fanouten og er verken regnskapsmessig eller prosessornøytral. Erstatningen må dekke akkurat SM_MER_VEILEDNING ende til ende.",
			dashboardOnly(),
			"navikt/team-esyfo#213",
			plannedReplacement("navikt/syfo-budstikka#260", [
				"app:meroppfolging-backend",
				"app:syfo-budstikka",
				"topic:budstikka.v1",
			]),
		),
		targetRefs: ["app:meroppfolging-backend", "app:esyfovarsel"],
		externalTargets: [],
		journeyRefs: ["journey:late-follow-up", "journey:notifications"],
		pipelineRefs: ["pipeline:notifications"],
		deployments: [prod("source:grafana-varsel-avvik", "unclassified")],
		runbook: missingRunbook(),
		dashboard: missingDashboard(),
		annotations: {},
		riskNotes: [
			"Grafana bruker query C direkte som Alert condition uten separat reduce-/threshold-expression",
			"produsenttelleren registrerer kandidater før utsending, mens legacy-telleren registrerer en senere og annen prosesseringsgrense",
			"live-verifisert 2026-08-29: konfigurert tilstand er NoData når queryen ikke gir data eller alle verdier er null, og Error ved evalueringsfeil eller timeout",
			"live-verifisert 2026-08-29: det koblede dashboardet med UID de2wwv58swrnkd finnes ikke lenger",
			"Budstikkas nåværende metrikker kan ikke avgrenses til den aktuelle SM_MER_VEILEDNING-slicen",
			"#260 erstatter bare regelen dersom den konkrete slicen er SM_MER_VEILEDNING og inkluderer produsentens eligible/published samt terminalt utfall",
			"må forbli pauset og skal ikke kopieres til en PrometheusRule eller bygges videre i esyfovarsel",
		],
	}),
	grafanaRule({
		id: "rule:grafana-kafka-offset",
		name: "Esyfo Kafka consumer lag more than 15 min",
		expr: 'kafka_consumer_group_offset{topic=~"team-esyfo.*"} > 100',
		holdFor: "15m",
		evaluationInterval: "5m",
		semantic: "raw-consumer-offset",
		semanticFamily: "legacy-raw-kafka-offset",
		lifecycle: retiringKafkaOffset,
		policy: retireReadyPolicy(
			teamOwner("navikt/team-esyfo", "pipeline:notifications"),
			"Regelen er pauset og måler absolutt offset, ikke lag. Den gir derfor verken aktiv eller korrekt dekning og skal fjernes uten én ny global erstatningsregel.",
			dashboardOnly(),
			"navikt/team-esyfo#213",
			"Fjerning reduserer ingen aktiv varsling. #212 definerer separat eier og riktig signal per topic; eventuell implementasjon følger den enkelte kontrakten.",
			[
				{
					href: "https://github.com/navikt/team-esyfo/blob/b68b9f818a5afd3c36a14c66f0f1c0321353ecd7/docs/public/alert-register.v2.json",
					summary:
						"Det commitlåste registersnapshotet bevarer queryen, paused/not-evaluated og live-preview med 46 serier over terskelen.",
					verifiedAt: ALERT_SNAPSHOT_AT,
				},
				{
					href: "https://grafana.nav.cloud.nais.io/alerting/grafana/cfq0972pkuy2ob/view",
					summary:
						"Live-rekontroll bekreftet at Grafana-regelen fortsatt er pauset før pensjoneringsbeslutningen.",
					verifiedAt: GRAFANA_CONSOLIDATION_REVIEWED_AT,
				},
				{
					href: "https://github.com/navikt/syfo-budstikka/blob/6536a0090daedb3ade1818ff1e79adc4f0ff7951/nais/alerts-prod.yaml",
					summary:
						"Kun budstikka.v1 har direkte overlapp i form av to app-avgrensede PrometheusRules; de ni øvrige topic-gapene beholdes separat.",
					verifiedAt: GRAFANA_CONSOLIDATION_REVIEWED_AT,
				},
				{
					href: issueHref("navikt/team-esyfo#212"),
					summary:
						"#212 definerer produsent, konsument, operativ eier og riktig signal separat for hvert av de ti team-topicsene.",
					verifiedAt: GRAFANA_CONSOLIDATION_REVIEWED_AT,
				},
			],
			GRAFANA_CONSOLIDATION_REVIEWED_AT,
		),
		targetRefs: [...allOwnedTopics],
		externalTargets: [],
		journeyRefs: [],
		pipelineRefs: [
			"pipeline:notifications",
			"pipeline:follow-up-plan-lps",
			"pipeline:employer-events",
			"pipeline:mapping-questions",
			"pipeline:late-follow-up",
			"pipeline:nearest-leader",
			"pipeline:sick-pay-days",
		],
		deployments: [prod("source:grafana-kafka-offset", "unclassified")],
		runbook: missingRunbook(),
		dashboard: missingDashboard(),
		annotations: {},
		riskNotes: [
			"navnet sier lag, men uttrykket måler absolutt consumer-offset",
			"live preview viste 46 fyrende serier mens selve regelen var pauset",
			"queryen blander consumer-grupper med forskjellige eiere, trafikkmønstre og konsekvenser",
			"kun budstikka.v1 har direkte overlapp via to app-avgrensede PrometheusRules; ni separate topic-gap beholdes i #212",
			"må forbli pauset frem til sletting og skal aldri erstattes av én global topic-regel",
			"#212 definerer det uavhengige arbeidet med typekorrekte signaler per topic og eier",
		],
	}),
];

const observedPrometheusInstances = [
	["rule:aktivitetskrav-varsel-consumer-lag", "prod-gcp"],
	["rule:aktivitetskrav-vurdering-consumer-lag", "prod-gcp"],
	["rule:esyfovarsel-down", "prod-gcp"],
	["rule:esyfovarsel-log-ratio", "prod-gcp"],
	["rule:esyfovarsel-job-failed", "prod-gcp"],
	["rule:lps-altinn-consumer-lag", "prod-gcp"],
	["rule:lumi-definition-conflict", "prod-gcp"],
	["rule:lumi-submission-failure", "prod-gcp"],
	["rule:lumi-submission-rejection-spike", "prod-gcp"],
	["rule:lumi-retention-failure", "prod-gcp"],
	["rule:lumi-retention-stale", "prod-gcp"],
	["rule:budstikka-consumer-lag-warning", "dev-gcp"],
	["rule:budstikka-consumer-lag-warning", "prod-gcp"],
	["rule:budstikka-consumer-lag-critical", "dev-gcp"],
	["rule:budstikka-consumer-lag-critical", "prod-gcp"],
	["rule:oppfolgingsplan-sykmelding-deserialization", "dev-gcp"],
	["rule:oppfolgingsplan-sykmelding-deserialization", "prod-gcp"],
	["rule:oppfolgingsplan-sykmelding-runtime-errors", "dev-gcp"],
	["rule:oppfolgingsplan-sykmelding-runtime-errors", "prod-gcp"],
	["rule:oppfolgingsplan-outbox-oldest-due", "dev-gcp"],
	["rule:oppfolgingsplan-outbox-oldest-due", "prod-gcp"],
	["rule:oppfolgingsplan-outbox-expired-claims", "dev-gcp"],
	["rule:oppfolgingsplan-outbox-expired-claims", "prod-gcp"],
	["rule:oppfolgingsplan-outbox-persistent-failures", "dev-gcp"],
	["rule:oppfolgingsplan-outbox-persistent-failures", "prod-gcp"],
	["rule:brukertilgang-down", "prod-fss"],
	["rule:brukertilgang-down", "prod-gcp"],
	["rule:brukertilgang-http-5xx", "prod-fss"],
	["rule:brukertilgang-http-5xx", "prod-gcp"],
	["rule:brukertilgang-http-4xx", "prod-fss"],
	["rule:brukertilgang-http-4xx", "prod-gcp"],
	["rule:motebehov-down", "prod-gcp"],
	["rule:motebehov-http-5xx", "prod-gcp"],
	["rule:motebehov-http-4xx", "prod-gcp"],
	["rule:motebehov-oppfolgingstilfelle-lag", "prod-gcp"],
	["rule:dokumentporten-terminal-varsel-error", "prod-gcp"],
	["rule:oppfolgingsplanservice-down", "prod-fss"],
	["rule:oppfolgingsplanservice-http-5xx", "prod-fss"],
	["rule:oppfolgingsplanservice-http-4xx", "prod-fss"],
] as const satisfies ReadonlyArray<
	readonly [AlertRule["id"], AlertObservation["environment"]]
>;

const observedExpressionFingerprints: Partial<
	Record<AlertRule["id"], `fnv1a64:${string}`>
> = {
	"rule:aktivitetskrav-varsel-consumer-lag": "fnv1a64:38a0555494ba3a30",
	"rule:aktivitetskrav-vurdering-consumer-lag": "fnv1a64:da300af41677f8c9",
	"rule:esyfovarsel-down": "fnv1a64:3f693aaf9d4bcaa0",
	"rule:esyfovarsel-log-ratio": "fnv1a64:6bb5e105aa41ecc5",
	"rule:esyfovarsel-job-failed": "fnv1a64:4eb3446bef050647",
	"rule:lps-altinn-consumer-lag": "fnv1a64:79e5bacc31c3bd88",
	"rule:lumi-definition-conflict": "fnv1a64:2e0c4c75e2a3516d",
	"rule:lumi-submission-failure": "fnv1a64:3c6afcea082fa8ac",
	"rule:lumi-submission-rejection-spike": "fnv1a64:ba85870083028e8c",
	"rule:lumi-retention-failure": "fnv1a64:28c98f9dd1f8b6cf",
	"rule:lumi-retention-stale": "fnv1a64:d5c2708bee37265e",
	"rule:budstikka-consumer-lag-warning": "fnv1a64:154e966036a92b0c",
	"rule:budstikka-consumer-lag-critical": "fnv1a64:b96fc67b0f7928bf",
	"rule:oppfolgingsplan-sykmelding-deserialization": "fnv1a64:a13a854f38a69dc1",
	"rule:oppfolgingsplan-sykmelding-runtime-errors": "fnv1a64:6293d5f1991f0e28",
	"rule:oppfolgingsplan-outbox-oldest-due": "fnv1a64:23305150acb4aec4",
	"rule:oppfolgingsplan-outbox-expired-claims": "fnv1a64:4b297746d4cf02f6",
	"rule:oppfolgingsplan-outbox-persistent-failures": "fnv1a64:23746ae8f856359d",
	"rule:brukertilgang-down": "fnv1a64:03acd168be638043",
	"rule:brukertilgang-http-5xx": "fnv1a64:a34562bca28dd589",
	"rule:brukertilgang-http-4xx": "fnv1a64:cbc16969c514186f",
	"rule:motebehov-down": "fnv1a64:fca298c27c9961df",
	"rule:motebehov-http-5xx": "fnv1a64:404b174c3269e3e6",
	"rule:motebehov-http-4xx": "fnv1a64:57643bae89a3df90",
	"rule:motebehov-oppfolgingstilfelle-lag": "fnv1a64:0e33e171cb31d990",
	"rule:dokumentporten-terminal-varsel-error": "fnv1a64:cb8c5984c10fad37",
	"rule:oppfolgingsplanservice-down": "fnv1a64:93bb99bef4fd9e78",
	"rule:oppfolgingsplanservice-http-5xx": "fnv1a64:36097a93c3f77c88",
	"rule:oppfolgingsplanservice-http-4xx": "fnv1a64:b75412cabdf434da",
	"rule:grafana-varsel-avvik": "fnv1a64:91536a7fffc0f9ab",
	"rule:grafana-kafka-offset": "fnv1a64:49bdad175a47601b",
};

const observedTimings: Partial<
	Record<AlertRule["id"], { holdFor?: string; evaluationInterval?: string }>
> = {
	"rule:aktivitetskrav-varsel-consumer-lag": { holdFor: "10m" },
	"rule:aktivitetskrav-vurdering-consumer-lag": { holdFor: "10m" },
	"rule:esyfovarsel-down": { holdFor: "2m" },
	"rule:esyfovarsel-log-ratio": { holdFor: "3m" },
	"rule:esyfovarsel-job-failed": { holdFor: "2m" },
	"rule:lps-altinn-consumer-lag": { holdFor: "15m" },
	"rule:lumi-definition-conflict": {},
	"rule:lumi-submission-failure": {},
	"rule:lumi-submission-rejection-spike": {},
	"rule:lumi-retention-failure": {},
	"rule:lumi-retention-stale": { holdFor: "15m" },
	"rule:budstikka-consumer-lag-warning": { holdFor: "15m" },
	"rule:budstikka-consumer-lag-critical": { holdFor: "1h" },
	"rule:oppfolgingsplan-sykmelding-deserialization": { holdFor: "5m" },
	"rule:oppfolgingsplan-sykmelding-runtime-errors": { holdFor: "10m" },
	"rule:oppfolgingsplan-outbox-oldest-due": { holdFor: "10m" },
	"rule:oppfolgingsplan-outbox-expired-claims": { holdFor: "10m" },
	"rule:oppfolgingsplan-outbox-persistent-failures": { holdFor: "15m" },
	"rule:brukertilgang-down": { holdFor: "5m" },
	"rule:brukertilgang-http-5xx": { holdFor: "5m" },
	"rule:brukertilgang-http-4xx": { holdFor: "5m" },
	"rule:motebehov-down": { holdFor: "5m" },
	"rule:motebehov-http-5xx": { holdFor: "5m" },
	"rule:motebehov-http-4xx": { holdFor: "5m" },
	"rule:motebehov-oppfolgingstilfelle-lag": { holdFor: "15m" },
	"rule:dokumentporten-terminal-varsel-error": { holdFor: "1m" },
	"rule:oppfolgingsplanservice-down": { holdFor: "5m" },
	"rule:oppfolgingsplanservice-http-5xx": { holdFor: "5m" },
	"rule:oppfolgingsplanservice-http-4xx": { holdFor: "5m" },
	"rule:grafana-varsel-avvik": {
		holdFor: "10h",
		evaluationInterval: "2h",
	},
	"rule:grafana-kafka-offset": {
		holdFor: "15m",
		evaluationInterval: "5m",
	},
};

const observedDefinition = (
	ruleId: AlertRule["id"],
	comparison: AlertObservation["observedDefinition"]["comparison"],
	normalizationNote: string,
): AlertObservation["observedDefinition"] => {
	const rule = alertRules.find(({ id }) => id === ruleId);
	if (!rule) throw new Error(`Mangler alertregel ${ruleId}.`);
	const expressionFingerprint = observedExpressionFingerprints[ruleId];
	if (!expressionFingerprint) {
		throw new Error(`Mangler live-verifisert fingerprint for ${ruleId}.`);
	}
	const timing = observedTimings[ruleId];
	if (!timing) throw new Error(`Mangler live-verifisert timing for ${ruleId}.`);
	return {
		expressionFingerprint,
		holdFor: timing.holdFor,
		evaluationInterval: timing.evaluationInterval,
		comparison,
		normalizationNote,
	};
};

const prometheusObservations: AlertObservation[] =
	observedPrometheusInstances.map(([ruleId, environment]) => ({
		ruleId,
		environment,
		configuredState: "enabled",
		evaluationState: "not-firing",
		evaluationHealth: "unknown",
		observedDefinition: observedDefinition(
			ruleId,
			"semantic-match",
			"Live NAIS-query og for-varighet er avstemt mot kilden etter normalisering av automatisk k8s_cluster_name og matcherrekkefølge.",
		),
		observedAt: ALERT_SNAPSHOT_AT,
		evidenceHref: NAIS_ALERTS_URL,
		note: "NAIS Console viste Inactive. Det betyr ingen fyrende alertinstans, ikke deaktivert regel; evaluatorhelse ble ikke eksponert.",
	}));

const grafanaObservations: AlertObservation[] = [
	{
		ruleId: "rule:grafana-varsel-avvik",
		environment: "prod-gcp",
		configuredState: "paused",
		evaluationState: "not-evaluated",
		evaluationHealth: "unknown",
		observedDefinition: observedDefinition(
			"rule:grafana-varsel-avvik",
			"exact-match",
			"Query C er live-verifisert som direkte Alert condition; evalueringsgruppe og pending-periode er avstemt.",
		),
		observedAt: ALERT_SNAPSHOT_AT,
		evidenceHref:
			"https://grafana.nav.cloud.nais.io/alerting/grafana/ce3m1gf7tqwhsa/view",
		note: "Grafana viste Alert evaluation currently paused.",
	},
	{
		ruleId: "rule:grafana-kafka-offset",
		environment: "prod-gcp",
		configuredState: "paused",
		evaluationState: "not-evaluated",
		evaluationHealth: "unknown",
		observedDefinition: observedDefinition(
			"rule:grafana-kafka-offset",
			"semantic-match",
			"Live Grafana query A og separat threshold-expression C (> 100), evalueringsgruppe og pending-periode er avstemt direkte i regelvisningen; registeruttrykket er en samlet semantisk representasjon.",
		),
		observedAt: ALERT_SNAPSHOT_AT,
		evidenceHref:
			"https://grafana.nav.cloud.nais.io/alerting/grafana/cfq0972pkuy2ob/view",
		note: "Grafana viste pauset evaluering; query-preview viste 46 serier over terskelen fordi uttrykket måler offset, ikke lag.",
	},
];

export const alertRegistry: AlertRegistry = {
	schemaVersion: 2,
	ownerTeam: "team-esyfo",
	capturedAt: ALERT_SNAPSHOT_AT,
	inventoryIssue: "navikt/team-esyfo#203",
	policy: alertPolicyCatalog,
	sources: alertSources,
	rules: alertRules,
	observations: [...prometheusObservations, ...grafanaObservations],
	exclusions: [
		{
			id: "airflow-isyfo-analyse",
			reason:
				"Airflow og data-science-varsling eies av data scientists og inngår ikke i teamets alert-register.",
		},
		{
			id: "teamsykefravr",
			reason:
				"Eksterne topics nevnes som avhengigheter, men namespace og varsler eies ikke av Team eSyfo.",
		},
		{
			id: "dulting-studio-and-janitors",
			reason:
				"Det bygges ingen varig alert-investering for dulting-studio eller syfojanitor-*.",
		},
	],
};

export const serializeAlertRegistry = () =>
	`${JSON.stringify(alertRegistry, null, 2)}\n`;
