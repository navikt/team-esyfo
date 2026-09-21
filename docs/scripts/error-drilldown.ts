import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
	ERROR_DASHBOARD_UID,
	serializeErrorDashboard,
} from "../.vitepress/grafana/error-drilldown.ts";
import { serializeErrorDetailsDashboard } from "../.vitepress/grafana/error-details.ts";
import { ERROR_DETAILS_UID } from "../.vitepress/grafana/runtime-links.ts";

const args = process.argv.slice(2);
const command = args[0] ?? "check";

const option = (name: string) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
};

const output = resolve(
	option("--output") ??
		`public/grafana/${ERROR_DASHBOARD_UID}.json`,
);

const artifacts = [
	{ output, serialize: serializeErrorDashboard },
	{ output: resolve(`public/grafana/${ERROR_DETAILS_UID}.json`), serialize: serializeErrorDetailsDashboard },
];

const check = async (output: string, serialize: () => string) => {
	const expected = serialize();
	const actual = await readFile(output, "utf8");
	if (actual !== expected) {
		throw new Error(
			`Dashboardartefakten er utdatert: ${output}. Kjør pnpm error-dashboard:export.`,
		);
	}
	console.log(`Dashboardartefakt OK: ${output}`);
};

const exportDashboard = async (output: string, serialize: () => string) => {
	await mkdir(dirname(output), { recursive: true });
	await writeFile(output, serialize(), "utf8");
	console.log(`Eksporterte dashboard til ${output}`);
};

switch (command) {
	case "check":
		for (const { output, serialize } of artifacts) await check(output, serialize);
		break;
	case "export":
		for (const { output, serialize } of artifacts) await exportDashboard(output, serialize);
		break;
	default:
		throw new Error(`Ukjent kommando ${command}. Bruk check eller export.`);
}
