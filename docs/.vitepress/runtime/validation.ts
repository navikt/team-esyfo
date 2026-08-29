import { areas } from "../areas.ts";
import { isCurrentLifecycle } from "./lifecycle.ts";
import type {
	Application,
	BrowserSurface,
	CoverageProfileId,
	IsoDate,
	ResourceId,
	RuntimeIdentity,
	RuntimeInventory,
} from "./model.ts";

export interface ValidationResult {
	errors: string[];
	warnings: string[];
	counts: {
		applications: number;
		jobs: number;
		ownedTopics: number;
		browserSurfaces: number;
		sunsetApplications: number;
	};
}

export interface ValidationOptions {
	asOf?: IsoDate;
	failOnOverdueSunset?: boolean;
	failOnOverdueMigration?: boolean;
	browserAssessmentMaxAgeDays?: number;
}

const runtimeKey = (runtime: RuntimeIdentity) =>
	`${runtime.cluster}:${runtime.namespace}:${runtime.name}`;

const addDuplicateErrors = (
	values: string[],
	label: string,
	errors: string[],
) => {
	const seen = new Set<string>();
	for (const value of values) {
		if (seen.has(value)) errors.push(`Duplisert ${label}: ${value}`);
		seen.add(value);
	}
};

const validIsoDate = (value: string) =>
	/^\d{4}-\d{2}-\d{2}$/.test(value) &&
	new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

const validIsoDateTime = (value: string) =>
	/^\d{4}-\d{2}-\d{2}T.+Z$/.test(value) &&
	Number.isFinite(new Date(value).getTime());

const validCommitSha = (value: string) => /^[0-9a-f]{40}$/i.test(value);

const daysBetween = (earlier: string, later: string) =>
	(new Date(`${later}T00:00:00Z`).getTime() -
		new Date(`${earlier}T00:00:00Z`).getTime()) /
	86_400_000;

const validateContext = (
	resource:
		| Application
		| RuntimeInventory["jobs"][number]
		| RuntimeInventory["topics"][number]
		| BrowserSurface,
	knownAreas: Set<string>,
	knownJourneys: Set<string>,
	knownPipelines: Set<string>,
	errors: string[],
) => {
	if (resource.context.areaRefs.length === 0) {
		errors.push(`${resource.id} mangler fagområde.`);
	}
	if (
		resource.context.journeyRefs.length === 0 &&
		resource.context.pipelineRefs.length === 0
	) {
		errors.push(`${resource.id} mangler både brukerreise og pipeline.`);
	}
	for (const ref of resource.context.areaRefs) {
		if (!knownAreas.has(ref))
			errors.push(`${resource.id} peker til ukjent fagområde ${ref}.`);
	}
	for (const ref of resource.context.journeyRefs) {
		if (!knownJourneys.has(ref))
			errors.push(`${resource.id} peker til ukjent brukerreise ${ref}.`);
	}
	for (const ref of resource.context.pipelineRefs) {
		if (!knownPipelines.has(ref))
			errors.push(`${resource.id} peker til ukjent pipeline ${ref}.`);
	}
};

const validateLifecycle = (
	resource: { id: string; lifecycle: Application["lifecycle"] },
	knownResources: Map<string, Application["lifecycle"]>,
	options: ValidationOptions,
	errors: string[],
	warnings: string[],
) => {
	const lifecycle = resource.lifecycle;
	if (lifecycle.state === "migrating") {
		if (!validIsoDate(lifecycle.targetDate)) {
			errors.push(
				`${resource.id} har ugyldig targetDate ${lifecycle.targetDate}.`,
			);
		}
		if (lifecycle.targetRefs.length === 0)
			errors.push(`${resource.id} migrerer uten målressurs.`);
		for (const ref of lifecycle.targetRefs) {
			const targetLifecycle = knownResources.get(ref);
			if (!targetLifecycle)
				errors.push(`${resource.id} migrerer til ukjent ressurs ${ref}.`);
			if (ref === resource.id)
				errors.push(`${resource.id} kan ikke migrere til seg selv.`);
			if (
				targetLifecycle &&
				targetLifecycle.state !== "active" &&
				targetLifecycle.state !== "migrating"
			) {
				errors.push(
					`${resource.id} migrerer til ${ref}, som er ${targetLifecycle.state}.`,
				);
			}
		}
		if (options.asOf && lifecycle.targetDate < options.asOf) {
			const message = `${resource.id} passerte migreringsmålet ${lifecycle.targetDate}, men står fortsatt som migrating.`;
			if (options.failOnOverdueMigration) errors.push(message);
			else warnings.push(message);
		}
	}
	if (lifecycle.state === "retiring") {
		if (lifecycle.candidateReplacementRefs.length === 0)
			errors.push(
				`${resource.id} skal fases ut uten kandidater for erstatning.`,
			);
		if (lifecycle.consumerRefs.length === 0)
			errors.push(`${resource.id} skal fases ut uten kartlagte konsumenter.`);
		for (const ref of lifecycle.candidateReplacementRefs) {
			const targetLifecycle = knownResources.get(ref);
			if (!targetLifecycle)
				errors.push(`${resource.id} har ukjent erstatningskandidat ${ref}.`);
			if (ref === resource.id)
				errors.push(`${resource.id} kan ikke erstatte seg selv.`);
			if (targetLifecycle && !isCurrentLifecycle(targetLifecycle)) {
				errors.push(
					`${resource.id} har erstatningskandidat ${ref}, som er ${targetLifecycle.state}.`,
				);
			}
		}
		for (const ref of lifecycle.consumerRefs) {
			const consumerLifecycle = knownResources.get(ref);
			if (!consumerLifecycle)
				errors.push(`${resource.id} har ukjent aktiv konsument ${ref}.`);
			if (consumerLifecycle && !isCurrentLifecycle(consumerLifecycle)) {
				errors.push(
					`${resource.id} har konsument ${ref}, som er ${consumerLifecycle.state}.`,
				);
			}
		}
		if (lifecycle.targetDate && !validIsoDate(lifecycle.targetDate)) {
			errors.push(
				`${resource.id} har ugyldig targetDate ${lifecycle.targetDate}.`,
			);
		}
		if (
			options.asOf &&
			lifecycle.targetDate &&
			lifecycle.targetDate < options.asOf
		) {
			const message = `${resource.id} passerte utfasingmålet ${lifecycle.targetDate}, men står fortsatt som retiring.`;
			if (options.failOnOverdueMigration) errors.push(message);
			else warnings.push(message);
		}
	}
	if (lifecycle.state === "sunset") {
		if (!validIsoDate(lifecycle.sunsetOn)) {
			errors.push(`${resource.id} har ugyldig sunsetOn ${lifecycle.sunsetOn}.`);
		}
		for (const ref of lifecycle.replacementRefs) {
			if (!knownResources.has(ref))
				errors.push(`${resource.id} erstattes av ukjent ressurs ${ref}.`);
			if (ref === resource.id)
				errors.push(`${resource.id} kan ikke erstatte seg selv.`);
		}
		if (options.asOf && lifecycle.sunsetOn < options.asOf) {
			const message = `${resource.id} passerte sunset ${lifecycle.sunsetOn}, men står fortsatt som sunset.`;
			if (options.failOnOverdueSunset) errors.push(message);
			else warnings.push(message);
		}
	}
	if (lifecycle.state === "retired" && !validIsoDate(lifecycle.retiredOn)) {
		errors.push(`${resource.id} har ugyldig retiredOn ${lifecycle.retiredOn}.`);
	}
};

const exclusionMatches = (
	app: Application,
	exclusion: RuntimeInventory["exclusions"][number],
) => {
	const selector = exclusion.selector;
	if (selector.kind === "application") {
		return (
			app.runtime.name === selector.name &&
			app.runtime.namespace === selector.namespace
		);
	}
	if (selector.kind === "namespace")
		return app.runtime.namespace === selector.namespace;
	if (selector.kind === "repository")
		return app.repository === selector.repository;
	return false;
};

export const validateInventory = (
	inventory: RuntimeInventory,
	options: ValidationOptions = {},
): ValidationResult => {
	const errors: string[] = [];
	const warnings: string[] = [];
	if (options.asOf && !validIsoDate(options.asOf)) {
		errors.push(`Ugyldig asOf-dato ${options.asOf}.`);
	}
	const currentApplications = inventory.applications.filter((app) =>
		isCurrentLifecycle(app.lifecycle),
	);
	const currentJobs = inventory.jobs.filter((job) =>
		isCurrentLifecycle(job.lifecycle),
	);
	const currentTopics = inventory.topics.filter((topic) =>
		isCurrentLifecycle(topic.lifecycle),
	);
	const currentBrowserSurfaces = inventory.browserSurfaces.filter((surface) =>
		isCurrentLifecycle(surface.lifecycle),
	);
	const counts = {
		applications: currentApplications.length,
		jobs: currentJobs.length,
		ownedTopics: currentTopics.length,
		browserSurfaces: currentBrowserSurfaces.length,
		sunsetApplications: inventory.applications.filter(
			(app) => app.lifecycle.state === "sunset",
		).length,
	};

	for (const [key, actual] of Object.entries(counts).filter(
		([key]) => key !== "sunsetApplications",
	)) {
		const expected =
			inventory.baseline.expected[
				key as keyof RuntimeInventory["baseline"]["expected"]
			];
		if (actual !== expected)
			errors.push(`Baseline ${key}: forventet ${expected}, fant ${actual}.`);
	}

	if (
		inventory.baseline.status === "approved" &&
		!inventory.baseline.approvedOn
	) {
		errors.push("Godkjent baseline mangler approvedOn.");
	}
	if (
		inventory.baseline.status === "proposed" &&
		inventory.baseline.approvedOn
	) {
		errors.push("Foreslått baseline kan ikke ha approvedOn.");
	}

	const resources = [...inventory.applications, ...inventory.jobs];
	const allIds = [
		...resources.map(({ id }) => id),
		...inventory.topics.map(({ id }) => id),
		...inventory.browserSurfaces.map(({ id }) => id),
		...inventory.exclusions.map(({ id }) => id),
	];
	addDuplicateErrors(allIds, "inventory-ID", errors);
	addDuplicateErrors(
		resources.map(({ runtime }) => runtimeKey(runtime)),
		"runtimeidentitet",
		errors,
	);
	addDuplicateErrors(
		inventory.coverageProfiles.map(({ id }) => id),
		"dekningsprofil",
		errors,
	);
	addDuplicateErrors(
		inventory.journeys.map(({ id }) => id),
		"brukerreise",
		errors,
	);
	addDuplicateErrors(
		inventory.pipelines.map(({ id }) => id),
		"pipeline",
		errors,
	);

	const knownAreas = new Set(areas.map(({ id }) => id));
	const knownJourneys = new Set(inventory.journeys.map(({ id }) => id));
	const knownPipelines = new Set(inventory.pipelines.map(({ id }) => id));
	const knownResources = new Map<ResourceId, Application["lifecycle"]>(
		resources.map(({ id, lifecycle }) => [id, lifecycle]),
	);
	const knownProfiles = new Map(
		inventory.coverageProfiles.map((profile) => [profile.id, profile]),
	);

	for (const resource of [
		...inventory.applications,
		...inventory.jobs,
		...inventory.topics,
		...inventory.browserSurfaces,
	]) {
		validateContext(
			resource,
			knownAreas,
			knownJourneys,
			knownPipelines,
			errors,
		);
		validateLifecycle(resource, knownResources, options, errors, warnings);
		const profile = knownProfiles.get(
			resource.coverageProfile as CoverageProfileId,
		);
		if (!profile) {
			errors.push(
				`${resource.id} bruker ukjent dekningsprofil ${resource.coverageProfile}.`,
			);
		} else if (!profile.resourceKinds.includes(resource.kind)) {
			errors.push(
				`${resource.id} bruker ${profile.id}, som ikke gjelder ${resource.kind}.`,
			);
		}
	}

	for (const resource of [...currentApplications, ...currentJobs]) {
		if (
			resource.runtime.cluster !== "prod-gcp" ||
			resource.runtime.namespace !== "team-esyfo"
		) {
			errors.push(
				`${resource.id} er i aktivt scope utenfor prod-gcp/team-esyfo.`,
			);
		}
		if (resource.runtimeApm.status === "linked") {
			if (!/^https:\/\//.test(resource.runtimeApm.href))
				errors.push(`${resource.id} har ugyldig APM-lenke.`);
			if (!validIsoDateTime(resource.runtimeApm.verifiedAt))
				errors.push(`${resource.id} har ugyldig APM-verifikasjonstid.`);
			if (!resource.runtimeApm.evidence.trim())
				errors.push(`${resource.id} mangler APM-verifikasjonsevidens.`);
		}
	}

	for (const app of currentApplications) {
		for (const exclusion of inventory.exclusions) {
			if (exclusionMatches(app, exclusion)) {
				errors.push(
					`${app.id} er både aktiv og ekskludert av ${exclusion.id}.`,
				);
			}
		}
	}

	const currentApplicationIds = new Set(
		currentApplications.map(({ id }) => id),
	);
	for (const surface of currentBrowserSurfaces) {
		if (!currentApplicationIds.has(surface.runtimeRef)) {
			errors.push(
				`${surface.id} peker ikke til en aktiv eller migrerende app: ${surface.runtimeRef}.`,
			);
		}
		if (surface.browserIdentity.serviceNamespace !== "team-esyfo") {
			errors.push(`${surface.id} har browseridentitet utenfor team-esyfo.`);
		}
		for (const [label, revision] of [
			["kilderevisjon", surface.currentImplementation.sourceRevision],
			["deployrevisjon", surface.currentImplementation.deployedRevision],
		] as const) {
			if (
				revision.status === "verified" &&
				(!validCommitSha(revision.commitSha) || !revision.evidence.trim())
			) {
				errors.push(
					`${surface.id} har ugyldig verifisert ${label}; immutable commit-SHA og evidens kreves.`,
				);
			}
		}
		if (surface.pageIdentity.status === "defined") {
			if (surface.pageIdentity.pageIds.length === 0) {
				errors.push(
					`${surface.id} har definert page identity uten page-ID-er.`,
				);
			}
			const unsafeIdentifier =
				/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|\b\d{11}\b/i;
			if (
				surface.pageIdentity.pageIds.some((pageId) =>
					unsafeIdentifier.test(pageId),
				)
			) {
				errors.push(`${surface.id} har rå identifikator i en page-ID.`);
			}
		}
		if (options.asOf) {
			const age = daysBetween(
				surface.currentImplementation.assessedAt,
				options.asOf,
			);
			if (age > (options.browserAssessmentMaxAgeDays ?? 30)) {
				warnings.push(
					`${surface.id} sin kildekodevurdering er ${Math.floor(age)} dager gammel og må revalideres mot deployet revisjon.`,
				);
			}
		}
	}

	for (const topic of currentTopics) {
		if (!topic.name.startsWith("team-esyfo."))
			errors.push(`${topic.id} mangler team-esyfo-prefix.`);
		if (topic.context.pipelineRefs.length === 0)
			errors.push(`${topic.id} mangler pipeline.`);
		if (
			topic.producers.internal.length + topic.producers.external.length ===
			0
		) {
			errors.push(`${topic.id} mangler produsentrelasjon.`);
		}
		if (
			topic.consumers.internal.length + topic.consumers.external.length ===
			0
		) {
			errors.push(`${topic.id} mangler konsumentrelasjon.`);
		}
		for (const ref of [
			...topic.producers.internal,
			...topic.consumers.internal,
		]) {
			if (!knownResources.has(ref))
				errors.push(`${topic.id} peker til ukjent intern ressurs ${ref}.`);
		}
		if (topic.serviceLevel.processingDeadlineMinutes <= 0) {
			errors.push(`${topic.id} har ugyldig behandlingsfrist.`);
		}
		if (
			topic.trafficModel === "continuous" &&
			topic.serviceLevel.zeroTrafficAllowed
		) {
			errors.push(
				`${topic.id} er continuous, men tillater nulltrafikk uten ferskt progressbevis.`,
			);
		}
		const expectedProgressMode =
			topic.producers.internal.length > 0 && topic.consumers.internal.length > 0
				? "end-to-end"
				: topic.producers.internal.length > 0
					? "producer-only"
					: "consumer-only";
		if (topic.serviceLevel.progressMode !== expectedProgressMode) {
			errors.push(
				`${topic.id} har ${topic.serviceLevel.progressMode}, forventet ${expectedProgressMode}.`,
			);
		}
		const expectedLag =
			topic.consumers.internal.length > 0 ? "required" : "external-consumers";
		if (topic.serviceLevel.consumerLag !== expectedLag) {
			errors.push(
				`${topic.id} har ${topic.serviceLevel.consumerLag}, forventet ${expectedLag}.`,
			);
		}
		for (const relation of [
			...topic.producers.external,
			...topic.consumers.external,
		]) {
			if (!relation.evidence.trim()) {
				errors.push(
					`${topic.id} har ekstern relasjon uten evidens: ${relation.name}.`,
				);
			}
		}
	}

	for (const profile of inventory.coverageProfiles) {
		if (profile.requiredSignals.length === 0)
			errors.push(`${profile.id} mangler obligatoriske signaler.`);
		if (profile.freshnessMinutes <= 0)
			errors.push(`${profile.id} har ugyldig freshness-grense.`);
	}

	return { errors, warnings, counts };
};

export const assertValidInventory = (
	inventory: RuntimeInventory,
	options: ValidationOptions = {},
) => {
	const result = validateInventory(inventory, options);
	if (result.errors.length > 0) {
		throw new Error(
			`Runtimeinventaret er ugyldig:\n- ${result.errors.join("\n- ")}`,
		);
	}
	return result;
};

export { runtimeKey };
