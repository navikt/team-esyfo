import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
	CONTROL_ROOM_FOLDER_UID,
	CONTROL_ROOM_UID,
} from "../.vitepress/grafana/control-room.ts";
import {
	GRAFANA_VERSION,
	TEAM_ESYFO_DASHBOARD_FOLDER_UID,
} from "../.vitepress/grafana/dashboard-kit.ts";
import {
	ERROR_DASHBOARD_FOLDER_UID,
	ERROR_DASHBOARD_UID,
} from "../.vitepress/grafana/error-drilldown.ts";

const execFileAsync = promisify(execFile);
const username = "admin";
const password = randomBytes(24).toString("base64url");
const containerName = `team-esyfo-grafana-smoke-${process.pid}-${randomBytes(4).toString("hex")}`;
const auth = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
const image = `grafana/grafana:${GRAFANA_VERSION}`;
let baseUrl = "";

const dashboardArtifacts = [CONTROL_ROOM_UID, ERROR_DASHBOARD_UID].map((uid) => ({
	artifactPath: fileURLToPath(
		new URL(`../public/grafana/${uid}.json`, import.meta.url),
	),
	uid,
}));

type JsonRecord = Record<string, unknown>;

const collectObjects = (
	value: unknown,
	found: JsonRecord[] = [],
): JsonRecord[] => {
	if (!value || typeof value !== "object") return found;
	if (Array.isArray(value)) {
		for (const item of value) collectObjects(item, found);
		return found;
	}
	const record = value as JsonRecord;
	found.push(record);
	for (const child of Object.values(record)) collectObjects(child, found);
	return found;
};

const collectStringsByKey = (
	value: unknown,
	key: string,
	found: string[] = [],
) => {
	if (!value || typeof value !== "object") return found;
	if (Array.isArray(value)) {
		for (const item of value) collectStringsByKey(item, key, found);
		return found;
	}
	for (const [itemKey, itemValue] of Object.entries(value)) {
		if (itemKey === key && typeof itemValue === "string") found.push(itemValue);
		collectStringsByKey(itemValue, key, found);
	}
	return found;
};

const canonicalize = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(
		Object.entries(value)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, child]) => [key, canonicalize(child)]),
	);
};

const sortSemantically = (values: unknown[]) =>
	values
		.map(canonicalize)
		.sort((left, right) =>
			JSON.stringify(left).localeCompare(JSON.stringify(right)),
		);

const semanticContract = (resource: JsonRecord) => {
	const metadata = resource.metadata as JsonRecord;
	const annotations = metadata.annotations as JsonRecord;
	const spec = resource.spec as JsonRecord;
	const elements = spec.elements as JsonRecord;
	const layout = spec.layout as { spec: { items: unknown[] } };
	const variables = spec.variables as Array<{ kind: string; spec: JsonRecord }>;
	const queries = sortSemantically(
		collectObjects(spec)
			.filter(({ kind }) => kind === "DataQuery")
			.map(({ datasource, group, spec: querySpec }) => ({
				datasource,
				group,
				spec: querySpec,
			})),
	);
	const layoutElementNames = layout.spec.items
		.map(
			(item) =>
				(
					item as {
						spec: { element: { name: string } };
					}
				).spec.element.name,
		)
		.sort();
	return {
		apiVersion: resource.apiVersion,
		kind: resource.kind,
		name: metadata.name,
		folder: annotations["grafana.app/folder"],
		title: spec.title,
		timeSettings: spec.timeSettings,
		elements: canonicalize(elements),
		elementNames: Object.keys(elements).sort(),
		layoutElementNames,
		layoutItems: layout.spec.items.map(canonicalize),
		variables: variables.map(canonicalize),
		queries,
		transformations: sortSemantically(
			collectObjects(spec)
				.filter(({ kind }) => kind === "Transformation")
				.map(({ group, spec: transformationSpec }) => ({
					group,
					spec: transformationSpec,
				})),
		),
		datasources: [
			...new Set(
				queries.map(
					(query) =>
						((query as JsonRecord).datasource as { name: string }).name,
				),
			),
		].sort(),
		links: sortSemantically(
			collectObjects(spec).filter(({ url }) => typeof url === "string"),
		),
		urls: collectStringsByKey(spec, "url").sort(),
	};
};

const waitForGrafana = async () => {
	let lastTransientError: unknown;
	for (let attempt = 0; attempt < 120; attempt += 1) {
		let response: Response;
		try {
			response = await fetch(`${baseUrl}/api/health`, {
				redirect: "error",
				signal: AbortSignal.timeout(5_000),
			});
		} catch (error) {
			lastTransientError = error;
			await new Promise((resolve) => setTimeout(resolve, 500));
			continue;
		}
		if (response.ok) {
			const health = (await response.json()) as { version?: string };
			assert.equal(health.version, GRAFANA_VERSION);
			return;
		}
		lastTransientError = new Error(
			`Grafana health svarte ${response.status}.`,
		);
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw new Error(`Grafana ble ikke klar på ${baseUrl} innen 60 sekunder.`, {
		cause: lastTransientError,
	});
};

const requestJson = async (
	path: string,
	expectedStatus: number,
	init: RequestInit = {},
) => {
	const response = await fetch(`${baseUrl}${path}`, {
		...init,
		redirect: "error",
		signal: AbortSignal.timeout(10_000),
		headers: {
			Authorization: auth,
			...(init.body ? { "Content-Type": "application/json" } : {}),
			...init.headers,
		},
	});
	const body = await response.text();
	if (response.status !== expectedStatus) {
		throw new Error(
			`${init.method ?? "GET"} ${path} svarte ${response.status}, forventet ${expectedStatus}: ${body.slice(0, 1_000)}`,
		);
	}
	return JSON.parse(body) as JsonRecord;
};

let containerId: string | undefined;
let containerRunAttempted = false;
let cleanupPromise: Promise<void> | undefined;
let primaryFailure: unknown;

const stopContainer = async () => {
	if (!containerRunAttempted) return;
	if (cleanupPromise) return cleanupPromise;
	cleanupPromise = (async () => {
		try {
			await execFileAsync("docker", ["rm", "--force", containerName], {
				timeout: 30_000,
			});
		} catch (error) {
			const stderr = (error as Error & { stderr?: string }).stderr;
			if (!stderr?.includes("No such container")) throw error;
		}
		containerId = undefined;
		containerRunAttempted = false;
	})();
	try {
		await cleanupPromise;
	} finally {
		cleanupPromise = undefined;
	}
};

const stopOnSignal = (exitCode: number) => {
	void stopContainer().finally(() => process.exit(exitCode));
};
const onSigint = () => stopOnSignal(130);
const onSigterm = () => stopOnSignal(143);
process.once("SIGINT", onSigint);
process.once("SIGTERM", onSigterm);

try {
	assert.equal(CONTROL_ROOM_FOLDER_UID, TEAM_ESYFO_DASHBOARD_FOLDER_UID);
	assert.equal(ERROR_DASHBOARD_FOLDER_UID, TEAM_ESYFO_DASHBOARD_FOLDER_UID);

	const { stdout: dockerHost } = await execFileAsync(
		"docker",
		["context", "inspect", "--format", "{{.Endpoints.docker.Host}}"],
		{ timeout: 10_000 },
	);
	assert.match(
		dockerHost.trim(),
		/^(unix|npipe):\/\//,
		"Smoken avviser en ekstern Docker-daemon.",
	);

	const dockerEnvironment = {
		...process.env,
		GF_ANALYTICS_CHECK_FOR_PLUGIN_UPDATES: "false",
		GF_ANALYTICS_CHECK_FOR_UPDATES: "false",
		GF_ANALYTICS_REPORTING_ENABLED: "false",
		GF_SECURITY_ADMIN_PASSWORD: password,
		GF_SECURITY_ADMIN_USER: username,
	};
	try {
		await execFileAsync("docker", ["image", "inspect", image], {
			timeout: 10_000,
		});
	} catch {
		await execFileAsync("docker", ["pull", image], {
			timeout: 300_000,
		});
	}
	containerRunAttempted = true;
	const { stdout: containerOutput } = await execFileAsync(
		"docker",
		[
			"run",
			"--pull",
			"never",
			"--rm",
			"--detach",
			"--name",
			containerName,
			"--publish",
			"127.0.0.1::3000",
			"--env",
			"GF_SECURITY_ADMIN_USER",
			"--env",
			"GF_SECURITY_ADMIN_PASSWORD",
			"--env",
			"GF_ANALYTICS_REPORTING_ENABLED",
			"--env",
			"GF_ANALYTICS_CHECK_FOR_UPDATES",
			"--env",
			"GF_ANALYTICS_CHECK_FOR_PLUGIN_UPDATES",
			image,
		],
		{ env: dockerEnvironment, timeout: 60_000 },
	);
	const candidateContainerId = containerOutput.trim();
	assert.match(candidateContainerId, /^[a-f0-9]{12,64}$/);
	containerId = candidateContainerId;
	const { stdout: publishedPort } = await execFileAsync(
		"docker",
		["port", containerId, "3000/tcp"],
		{ timeout: 10_000 },
	);
	const portMatch = publishedPort.trim().match(/^127\.0\.0\.1:(\d+)$/);
	assert.ok(portMatch, `Uventet lokal portbinding: ${publishedPort.trim()}`);
	baseUrl = `http://127.0.0.1:${portMatch[1]}`;
	await waitForGrafana();

	await requestJson(
		"/apis/folder.grafana.app/v1/namespaces/default/folders",
		201,
		{
			method: "POST",
			body: JSON.stringify({
				metadata: { name: TEAM_ESYFO_DASHBOARD_FOLDER_UID },
				spec: { title: "Team eSyfo smoke" },
			}),
		},
	);

	const summaries: string[] = [];
	for (const { artifactPath, uid } of dashboardArtifacts) {
		const artifactText = await readFile(artifactPath, "utf8");
		const artifact = JSON.parse(artifactText) as JsonRecord;
		await requestJson(
			"/apis/dashboard.grafana.app/v2/namespaces/default/dashboards",
			201,
			{ method: "POST", body: artifactText },
		);
		const resource = await requestJson(
			`/apis/dashboard.grafana.app/v2/namespaces/default/dashboards/${uid}`,
			200,
		);
		const dto = await requestJson(
			`/apis/dashboard.grafana.app/v2/namespaces/default/dashboards/${uid}/dto`,
			200,
		);

		const expected = semanticContract(artifact);
		assert.equal(expected.name, uid);
		assert.equal(expected.folder, TEAM_ESYFO_DASHBOARD_FOLDER_UID);
		assert.ok(expected.elementNames.length > 0);
		assert.deepEqual(expected.layoutElementNames, expected.elementNames);
		assert.equal(
			new Set(expected.layoutElementNames).size,
			expected.elementNames.length,
		);
		assert.ok(expected.variables.length > 0);
		assert.ok(expected.queries.length > 0);
		assert.ok(expected.datasources.length > 0);
		assert.deepEqual(semanticContract(resource), expected);
		const dtoContract = semanticContract(dto);
		assert.equal(dtoContract.kind, "DashboardWithAccessInfo");
		assert.deepEqual({ ...dtoContract, kind: "Dashboard" }, expected);

		summaries.push(
			`${uid}: ${expected.elementNames.length} paneler, ${expected.queries.length} queries`,
		);
	}

	assert.equal(summaries.length, dashboardArtifacts.length);
	console.log(
		`Grafana ${GRAFANA_VERSION} smoke OK for ${summaries.length} dashboards:\n- ${summaries.join("\n- ")}`,
	);
} catch (error) {
	primaryFailure = error;
	throw error;
} finally {
	process.off("SIGINT", onSigint);
	process.off("SIGTERM", onSigterm);
	try {
		await stopContainer();
	} catch (cleanupError) {
		if (!primaryFailure) throw cleanupError;
		console.error(
			`Smoke-containeren kunne ikke stoppes etter testfeilen: ${String(cleanupError)}`,
		);
	}
}
