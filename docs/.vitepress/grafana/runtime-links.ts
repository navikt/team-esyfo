import { grafanaVariable, LOKI_DATASOURCE_UID } from "./dashboard-kit.ts";

const FROM = grafanaVariable("__from");
const TO = grafanaVariable("__to");

export const apmDataLink = (
	service: string,
	environment = "prod",
	tab: "overview" | "issues" | "traces" = "overview",
) =>
	`/a/nais-apm-app/services/team-esyfo/${service}?environment=${environment}&tab=${tab}&from=${FROM}&to=${TO}`;

export const runtimeLogsDataLink = (service: string, environment = "prod") =>
	`/a/grafana-lokiexplore-app/explore/service/${service}/logs?from=${FROM}&to=${TO}&var-ds=${LOKI_DATASOURCE_UID}&var-filters=service_name%7C%3D%7C${service}&var-filters=service_namespace%7C%3D%7Cteam-esyfo&var-filters=k8s_cluster_name%7C%3D%7C${environment}`;

export const encodeExploreState = (value: unknown) => {
	const variables: string[] = [];
	const withTokens = JSON.stringify(value, (_key, child) => {
		if (typeof child !== "string") return child;
		return child.replace(/\$\{[^}]+\}/g, (variable) => {
			const token = `__GRAFANA_VARIABLE_${variables.length}__`;
			variables.push(variable);
			return token;
		});
	});
	return variables.reduce(
		(encoded, variable, index) =>
			encoded.replace(`__GRAFANA_VARIABLE_${index}__`, variable),
		encodeURIComponent(withTokens),
	);
};

export const lokiExploreDataLink = (expr: string) => {
	const panes = {
		A: {
			datasource: LOKI_DATASOURCE_UID,
			queries: [
				{
					datasource: { type: "loki", uid: LOKI_DATASOURCE_UID },
					direction: "backward",
					editorMode: "code",
					expr,
					queryType: "range",
					refId: "A",
				},
			],
			range: { from: FROM, to: TO },
		},
	};
	return `/explore?panes=${encodeExploreState(panes)}&schemaVersion=1&orgId=1`;
};

// Pod names are structured metadata in production Loki, not stream labels.
export const runtimePodLogsDataLink = (
	service: string,
	pod: string,
	environment = "prod",
) =>
	lokiExploreDataLink(
		`{service_namespace="team-esyfo", k8s_cluster_name="${environment}", service_name="${service}"} | k8s_pod_name="${pod}"`,
	);
