import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
	ERROR_DASHBOARD_UID,
	serializeErrorDashboard,
} from "../.vitepress/grafana/error-drilldown.ts";

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

const check = async () => {
	const expected = serializeErrorDashboard();
	const actual = await readFile(output, "utf8");
	if (actual !== expected) {
		throw new Error(
			`Dashboardartefakten er utdatert: ${output}. Kjør pnpm error-dashboard:export.`,
		);
	}
	console.log(`Dashboardartefakt OK: ${output}`);
};

const exportDashboard = async () => {
	await mkdir(dirname(output), { recursive: true });
	await writeFile(output, serializeErrorDashboard(), "utf8");
	console.log(`Eksporterte dashboard til ${output}`);
};

switch (command) {
	case "check":
		await check();
		break;
	case "export":
		await exportDashboard();
		break;
	default:
		throw new Error(`Ukjent kommando ${command}. Bruk check eller export.`);
}
