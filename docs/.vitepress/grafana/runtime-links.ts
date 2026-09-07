import { grafanaVariable, LOKI_DATASOURCE_UID } from "./dashboard-kit.ts";

const FROM = grafanaVariable("__from");
const TO = grafanaVariable("__to");

export const apmDataLink = (service: string, environment = "prod") =>
	`/a/nais-apm-app/services/team-esyfo/${service}?environment=${environment}&from=${grafanaVariable("__from:date:iso")}&to=${grafanaVariable("__to:date:iso")}`;

export const runtimeLogsDataLink = (service: string, environment = "prod") =>
	`/a/grafana-lokiexplore-app/explore/service/${service}/logs?from=${FROM}&to=${TO}&var-ds=${LOKI_DATASOURCE_UID}&var-filters=service_name%7C%3D%7C${service}&var-filters=service_namespace%7C%3D%7Cteam-esyfo&var-filters=k8s_cluster_name%7C%3D%7C${environment}`;
