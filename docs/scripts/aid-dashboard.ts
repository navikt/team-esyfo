import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { serializeAidDashboard } from "../.vitepress/grafana/aid-delivery-usage.ts";

const output = resolve("public/grafana/team-esyfo-aid.json");
const expected = serializeAidDashboard();
if (process.argv[2] === "export") {
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected, "utf8");
  console.log(`Eksporterte dashboard til ${output}`);
} else if (!process.argv[2] || process.argv[2] === "check") {
  if (await readFile(output, "utf8") !== expected) {
    throw new Error("AID-dashboardartefakten er utdatert. Kjør pnpm aid-dashboard:export.");
  }
  console.log(`Dashboardartefakt OK: ${output}`);
} else {
  throw new Error("Bruk check eller export.");
}
