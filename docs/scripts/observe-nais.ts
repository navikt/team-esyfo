import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type {
	IsoDateTime,
	ObservedRuntimeResource,
	ObservedRuntimeSnapshot,
} from "../.vitepress/runtime/model.ts";

const args = process.argv.slice(2);
const option = (name: string) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
};

interface KubernetesList {
	items?: Array<{ metadata?: { name?: string; namespace?: string } }>;
}

const observedAt = new Date().toISOString() as IsoDateTime;
const contexts = (option("--contexts") ?? "prod-gcp,prod-fss").split(",").filter(Boolean);
const namespace = option("--namespace") ?? "team-esyfo";

const readResources = (
	context: "prod-gcp" | "prod-fss",
	resourceType: "applications.nais.io" | "naisjobs.nais.io",
): ObservedRuntimeResource[] => {
	const raw = execFileSync(
		"kubectl",
		["--context", context, "get", resourceType, "-n", namespace, "-o", "json"],
		{ encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
	);
	const list = JSON.parse(raw) as KubernetesList;
	return (list.items ?? []).flatMap(({ metadata }) =>
		metadata?.name
			? [
					{
						cluster: context,
						namespace: metadata.namespace ?? namespace,
						name: metadata.name,
						observedAt,
						source: `kubectl:${context}`,
					} satisfies ObservedRuntimeResource,
				]
			: [],
	);
};

for (const context of contexts) {
	if (context !== "prod-gcp" && context !== "prod-fss") {
		throw new Error(`Ugyldig context ${context}. Tillatt: prod-gcp, prod-fss.`);
	}
}

const snapshot: ObservedRuntimeSnapshot = {
	schemaVersion: 1,
	observedAt,
	source: `kubectl:${contexts.join(",")}:${namespace}`,
	applications: contexts.flatMap((context) =>
		readResources(context as "prod-gcp" | "prod-fss", "applications.nais.io"),
	),
	jobs: contexts.flatMap((context) =>
		readResources(context as "prod-gcp" | "prod-fss", "naisjobs.nais.io"),
	),
};

const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
const output = option("--output");
if (output) {
	const resolvedOutput = resolve(output);
	await mkdir(dirname(resolvedOutput), { recursive: true });
	await writeFile(resolvedOutput, serialized, "utf8");
	console.log(`Skrev NAIS-snapshot til ${resolvedOutput}`);
} else {
	process.stdout.write(serialized);
}
