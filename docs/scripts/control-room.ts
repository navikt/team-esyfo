import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
	CONTROL_ROOM_UID,
	serializeControlRoomDashboard,
} from "../.vitepress/grafana/control-room.ts";

const args = process.argv.slice(2);
const command = args[0] ?? "check";

const option = (name: string) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
};

const output = resolve(
	option("--output") ?? `public/grafana/${CONTROL_ROOM_UID}.json`,
);

const check = async () => {
	const expected = serializeControlRoomDashboard();
	const actual = await readFile(output, "utf8");
	if (actual !== expected) {
		throw new Error(
			`Dashboardartefakten er utdatert: ${output}. Kjør pnpm control-room:export.`,
		);
	}
	console.log(`Dashboardartefakt OK: ${output}`);
};

const exportDashboard = async () => {
	await mkdir(dirname(output), { recursive: true });
	await writeFile(output, serializeControlRoomDashboard(), "utf8");
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
