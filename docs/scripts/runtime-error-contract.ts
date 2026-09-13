import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, relative, resolve } from "node:path";
import {
	assertPublishedRuntimeErrorContractsAreImmutable,
	runtimeErrorContractV1PublicPath,
	serializeRuntimeErrorContractV1,
} from "../.vitepress/observability/runtime-error-contract.ts";

const args = process.argv.slice(2);
const command = args[0] ?? "check";

const option = (name: string) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
};

const output = resolve(
	option("--output") ?? `public/${runtimeErrorContractV1PublicPath}`,
);

const canonicalOutput = resolve(`public/${runtimeErrorContractV1PublicPath}`);
const canonicalContractDirectory = resolve("public/contracts/runtime-error");
const checksumsPath = resolve(dirname(output), "SHA256SUMS.txt");

const checksums = async () => {
	const files = ["schema.json", "validate.mjs"];
	const entries = await Promise.all(
		files.map(async (file) => {
			const content = await readFile(resolve(dirname(output), file));
			return `${createHash("sha256").update(content).digest("hex")}  ${file}`;
		}),
	);
	return `${entries.join("\n")}\n`;
};

const git = (gitArgs: string[], description: string) => {
	const result = spawnSync("git", gitArgs, { encoding: "utf8" });
	if (result.status !== 0) {
		throw new Error(`${description}: ${result.stderr.trim()}`);
	}
	return result.stdout;
};

const repositoryRoot = () =>
	git(["rev-parse", "--show-toplevel"], "Fant ikke repository root").trim();

const configuredBaseRef = () => {
	const baseRef =
		option("--base-ref") ??
		process.env.RUNTIME_ERROR_CONTRACT_BASE_REF?.trim() ??
		"origin/main";
	if (!baseRef) {
		throw new Error("Base-ref for kontraktkontroll kan ikke være tom");
	}
	return baseRef;
};

const readPublishedContractsAtBase = () => {
	if (output !== canonicalOutput) return {};

	const root = repositoryRoot();
	const contractDirectory = relative(
		root,
		canonicalContractDirectory,
	).replaceAll("\\", "/");
	const baseRef = configuredBaseRef();
	const paths = git(
		[
			"-C",
			root,
			"ls-tree",
			"-r",
			"--name-only",
			baseRef,
			"--",
			contractDirectory,
		],
		`Kunne ikke liste publiserte kontrakter på ${baseRef}`,
	)
		.split("\n")
		.filter((path) => /\/v[^/]+\//.test(path));

	return Object.fromEntries(
		paths.map((path) => [
			path,
			git(
				["-C", root, "show", `${baseRef}:${path}`],
				`Kunne ikke lese publisert kontrakt ${path} på ${baseRef}`,
			),
		]),
	);
};

const readCurrentPublishedContracts = async (paths: string[]) => {
	const root = repositoryRoot();
	const contracts: Record<string, string> = {};
	for (const path of paths) {
		try {
			contracts[path] = await readFile(resolve(root, path), "utf8");
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		}
	}
	return contracts;
};

const check = async () => {
	const expected = serializeRuntimeErrorContractV1();
	const actual = await readFile(output, "utf8");
	if (actual !== expected) {
		throw new Error(
			`Kontraktartefakten er utdatert: ${output}. Kjør pnpm runtime-error-contract:export.`,
		);
	}
	if (
		output === canonicalOutput &&
		(await readFile(checksumsPath, "utf8")) !== (await checksums())
	) {
		throw new Error(
			"Sjekksummene er utdaterte. Kjør pnpm runtime-error-contract:export.",
		);
	}
	const publishedAtBase = readPublishedContractsAtBase();
	assertPublishedRuntimeErrorContractsAreImmutable(
		publishedAtBase,
		await readCurrentPublishedContracts(Object.keys(publishedAtBase)),
	);
	console.log(`Kontraktartefakt OK: ${output}`);
};

const exportContract = async () => {
	await mkdir(dirname(output), { recursive: true });
	await writeFile(output, serializeRuntimeErrorContractV1(), "utf8");
	if (output === canonicalOutput)
		await writeFile(checksumsPath, await checksums(), "utf8");
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
