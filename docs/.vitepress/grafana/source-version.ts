import { createHash } from "node:crypto";
import type { GrafanaDashboardResource } from "./dashboard-kit.ts";

// Hash the generated content before adding this link, so exports are reproducible.
export const withSourceVersion = (
	dashboard: GrafanaDashboardResource,
): GrafanaDashboardResource => {
	const version = createHash("sha256")
		.update(JSON.stringify(dashboard))
		.digest("hex")
		.slice(0, 10);
	return {
		...dashboard,
		spec: {
			...dashboard.spec,
			links: [
				...(dashboard.spec.links as unknown[]),
				{
					type: "link",
					title: `Kildeversjon ${version}`,
					icon: "external link",
					tooltip:
						"Sammenlign kildeversjonen med JSON-filen på main. Ulik versjon betyr at denne importen avviker fra main.",
					tags: [],
					asDropdown: false,
					includeVars: false,
					keepTime: false,
					targetBlank: true,
					url: `https://github.com/navikt/team-esyfo/blob/main/docs/public/grafana/${dashboard.metadata.name}.json`,
				},
			],
		},
	};
};
