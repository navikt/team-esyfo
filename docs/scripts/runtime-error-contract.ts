import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import {
	assertPublishedRuntimeErrorContractIsImmutable,
	runtimeErrorContractPublicPath,
	serializeRuntimeErrorContractV1,
} from "../.vitepress/observability/runtime-error-contract.ts";

const args = process.argv.slice(2);
const command = args[0] ?? "check";

const option = (name: string) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
};

const output = resolve(
	option("--output") ?? `public/${runtimeErrorContractPublicPath}`,
);

const canonicalOutput = resolve(`public/${runtimeErrorContractPublicPath}`);

const readPublishedContractAtBase = () => {
	if (output !== canonicalOutput) return undefined;

	const configuredBaseRef =
		option("--base-ref") ??
		process.env.RUNTIME_ERROR_CONTRACT_BASE_REF?.trim() ??
		"origin/main";
	if (!configuredBaseRef) return undefined;

	const repositoryRoot = spawnSync(
		"git",
		["rev-parse", "--show-toplevel"],
		{ encoding: "utf8" },
	);
	if (repositoryRoot.status !== 0) return undefined;

	const repositoryPath = relative(repositoryRoot.stdout.trim(), output).replaceAll(
		"\\",
		"/",
	);
	const publishedAtBase = spawnSync(
		"git",
		["show", `${configuredBaseRef}:${repositoryPath}`],
		{ encoding: "utf8" },
	);
	if (publishedAtBase.status === 0) return publishedAtBase.stdout;
	if (/does not exist|exists on disk, but not in|path .* not in/i.test(publishedAtBase.stderr)) {
		return undefined;
	}
	throw new Error(
		`Kunne ikke kontrollere publisert kontrakt mot ${configuredBaseRef}: ${publishedAtBase.stderr.trim()}`,
	);
};

const check = async () => {
	const expected = serializeRuntimeErrorContractV1();
	const actual = await readFile(output, "utf8");
	if (actual !== expected) {
		throw new Error(
			`Kontraktartefakten er utdatert: ${output}. Kjør pnpm runtime-error-contract:export.`,
		);
	}
	assertPublishedRuntimeErrorContractIsImmutable(
		readPublishedContractAtBase(),
		actual,
	);
	console.log(`Kontraktartefakt OK: ${output}`);
};

const exportContract = async () => {
	await mkdir(dirname(output), { recursive: true });
	await writeFile(output, serializeRuntimeErrorContractV1(), "utf8");
	console.log(`Eksporterte runtime-feilkontrakt til ${output}`);
};

switch (command) {
	case "check":
		await check();
		break;
	case "export":
		await exportContract();
		break;
	default:
		throw new Error(`Ukjent kommando ${command}. Bruk check eller export.`);
}
