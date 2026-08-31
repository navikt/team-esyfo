import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
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

const check = async () => {
	const expected = serializeRuntimeErrorContractV1();
	const actual = await readFile(output, "utf8");
	if (actual !== expected) {
		throw new Error(
			`Kontraktartefakten er utdatert: ${output}. Kjør pnpm runtime-error-contract:export.`,
		);
	}
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
