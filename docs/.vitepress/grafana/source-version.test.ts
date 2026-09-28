import assert from "node:assert/strict";
import { test } from "node:test";
import { buildControlRoomDashboard } from "./control-room.ts";
import { buildErrorDashboard } from "./error-drilldown.ts";
import { buildErrorDetailsDashboard } from "./error-details.ts";
import { withSourceVersion } from "./source-version.ts";

test("synlig kildeversjon er stabil og endres når dashboardinnholdet endres", () => {
	for (const build of [
		buildControlRoomDashboard,
		buildErrorDashboard,
		buildErrorDetailsDashboard,
	]) {
		const dashboard = build();
		const links = dashboard.spec.links as Array<{
			title: string;
			url: string;
			targetBlank: boolean;
		}>;
		const source = links.at(-1)!;
		assert.match(source.title, /^Kildeversjon [a-f0-9]{10}$/);
		assert.equal(
			source.url,
			`https://github.com/navikt/team-esyfo/blob/main/docs/public/grafana/${dashboard.metadata.name}.json`,
		);
		assert.equal(source.targetBlank, true);
		assert.deepEqual(dashboard, build());
		const changed = withSourceVersion({
			...dashboard,
			spec: {
				...dashboard.spec,
				title: "Endret dashboard",
				links: links.slice(0, -1),
			},
		});
		assert.notEqual(
			(changed.spec.links as typeof links).at(-1)!.title,
			source.title,
		);
	}
});
