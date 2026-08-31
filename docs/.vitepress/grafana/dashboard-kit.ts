export const TEAM_ESYFO_DASHBOARD_FOLDER_UID = "K-1b-N_4k";
export const MIMIR_DATASOURCE_UID = "PA58DA793C7250F1B";
export const LOKI_DATASOURCE_UID = "PEA2100DC89AE9FE2";
export const PROD_TEMPO_DATASOURCE_UID = "P8A28344D07741F8D";
export const DEV_TEMPO_DATASOURCE_UID = "P95CC91DC09CABFC8";
export const TEMPO_DATASOURCE_UID = PROD_TEMPO_DATASOURCE_UID;

export const GRAFANA_VERSION = "13.1.2";

export const grafanaVariable = (name: string) => `\${${name}}`;

export const dataLink = (title: string, url: string) => ({
	targetBlank: true,
	title,
	url,
});

export const layoutItem = (
	name: string,
	x: number,
	y: number,
	width: number,
	height: number,
) => ({
	kind: "GridLayoutItem",
	spec: {
		element: { kind: "ElementReference", name },
		height,
		width,
		x,
		y,
	},
});

export interface GrafanaDashboardResource {
	apiVersion: string;
	kind: "Dashboard";
	metadata: {
		annotations: { "grafana.app/folder": string };
		name: string;
	};
	spec: Record<string, unknown>;
}
