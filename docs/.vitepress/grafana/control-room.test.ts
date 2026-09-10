import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { runtimeInventory } from "../runtime/inventory.ts";
import { isCurrentLifecycle } from "../runtime/lifecycle.ts";
import {
	AVAILABLE_REPLICAS_METRIC,
	apmDataLink,
	BUDSTIKKA_LAG_METRIC,
	budstikkaLagQuery,
	buildControlRoomDashboard,
	CONTROL_ROOM_FOLDER_UID,
	CONTROL_ROOM_UID,
	DESERIALIZATION_ERROR_METRIC,
	DESIRED_REPLICAS_METRIC,
	deserializationRateQuery,
	dinesykmeldteDeviationRateQuery,
	dinesykmeldteOutcomeRateQuery,
	dinesykmeldteTrafficRateQuery,
	errorDashboardDataLink,
	errorRatioByServiceQuery,
	expectedScopeVectorQuery,
	expectedServerScopeVectorQuery,
	fleetOtelErrorCountQuery,
	fleetRestartCountQuery,
	fleetRuntimeErrorCountQuery,
	httpErrorCountQuery,
	httpErrorRatioQuery,
	JOB_FAILED_METRIC,
	jobFailureQuery,
	KAFKA_CONSUMER_GROUP_TOPIC_LAG_METRIC,
	KAFKA_CONSUMER_LAST_POLL_METRIC,
	lowestReadyRatioQuery,
	motebehovAvailableRatioQuery,
	otelErrorsByServiceQuery,
	p95ByServiceQuery,
	p95LatencyQuery,
	podTerminationReasonQuery,
	READY_REPLICAS_METRIC,
	RESTARTS_METRIC,
	readyRatioByServiceQuery,
	requestCountQuery,
	requestRateByServiceQuery,
	requestsByServiceQuery,
	restartCountQuery,
	restartsByServiceQuery,
	runtimeErrorCountQuery,
	runtimeErrorsByServiceQuery,
	runtimeLogsDataLink,
	SERVICE_TAB_TITLE,
	SPAN_CALLS_METRIC,
	SPAN_LATENCY_METRIC,
	selectedReadyRatioQuery,
	serializeControlRoomDashboard,
	serviceInvestigationDataLink,
	sykmeldingConsumerCommittedLagQuery,
	sykmeldingConsumerPollAgeByPodQuery,
	telemetryAgeByServiceQuery,
	telemetryStateByServiceQuery,
} from "./control-room.ts";
import {
	CONTROL_ROOM_BASELINE_AS_OF,
	controlRoomApplicationOptions,
	controlRoomApplicationRegex,
	controlRoomApplications,
	controlRoomServerApplications,
	controlRoomSunsetApplications,
	DESERIALIZATION_RUNBOOK_URL,
	MOTEBEHOV_RUNBOOK_URL,
	PIPELINE_RUNBOOK_URL,
	RUNTIME_RUNBOOK_URL,
} from "./control-room-scope.ts";
import {
	grafanaVariable,
	LOKI_DATASOURCE_UID,
	MIMIR_DATASOURCE_UID,
} from "./dashboard-kit.ts";

const objects = (value: unknown): Array<Record<string, unknown>> => {
	if (!value || typeof value !== "object") return [];
	if (Array.isArray(value)) return value.flatMap(objects);
	const record = value as Record<string, unknown>;
	return [record, ...Object.values(record).flatMap(objects)];
};
const values = (value: unknown, key: string): unknown[] =>
	objects(value)
		.filter((record) => key in record)
		.map((record) => record[key]);
const expressions = (value: unknown) => values(value, "expr") as string[];

type Item = {
	spec: {
		element: { name: string };
		x: number;
		y: number;
		width: number;
		height: number;
	};
};
type Variable = {
	kind: string;
	spec: {
		name: string;
		label: string;
		query: string;
		current: { text: string; value: string };
		multi: boolean;
		includeAll: boolean;
		skipUrlSync: boolean;
	};
};
type Row = {
	kind: string;
	spec: {
		title: string;
		collapse: boolean;
		hideHeader: boolean;
		layout: { kind: string; spec: { items: Item[] } };
		variables?: Variable[];
		conditionalRendering?: {
			kind: string;
			spec: {
				visibility: string;
				condition: string;
				items: Array<{
					kind: string;
					spec: { variable: string; operator: string; value: string };
				}>;
			};
		};
	};
};
type Tab = {
	kind: string;
	spec: {
		title: string;
		variables?: Variable[];
		layout: { kind: string; spec: { items?: Item[]; rows?: Row[] } };
	};
};
type Panel = {
	spec: {
		id: number;
		title: string;
		description: string;
		data: {
			spec: {
				queries: Array<{ spec: { refId: string } }>;
				transformations: Array<{
					group: string;
					spec: { options: Record<string, unknown> };
				}>;
			};
		};
		vizConfig: {
			group: string;
			spec: {
				fieldConfig: {
					defaults: Record<string, unknown>;
					overrides: Array<{
						matcher: { id: string; options: string };
						properties: Array<{ id: string; value: unknown }>;
					}>;
				};
				options: Record<string, unknown>;
			};
		};
	};
};
const panels = () =>
	buildControlRoomDashboard().spec.elements as Record<string, Panel>;
const tabs = () =>
	(
		buildControlRoomDashboard().spec.layout as {
			kind: string;
			spec: { tabs: Tab[] };
		}
	).spec.tabs;
const detailRows = () => {
	const rows = tabs()[1].spec.layout.spec.rows;
	assert.ok(rows);
	return rows;
};
const overviewItems = () => {
	const items = tabs()[0].spec.layout.spec.items;
	assert.ok(items);
	return items;
};
const selectedQueries = [
	requestCountQuery,
	httpErrorCountQuery,
	httpErrorRatioQuery,
	p95LatencyQuery,
	requestRateByServiceQuery,
	errorRatioByServiceQuery,
	p95ByServiceQuery,
	telemetryAgeByServiceQuery,
	runtimeErrorCountQuery,
	restartCountQuery,
	selectedReadyRatioQuery,
	podTerminationReasonQuery,
];
const fleetQueries = [
	fleetOtelErrorCountQuery,
	fleetRestartCountQuery,
	requestsByServiceQuery,
	otelErrorsByServiceQuery,
	runtimeErrorsByServiceQuery,
	restartsByServiceQuery,
	readyRatioByServiceQuery,
	telemetryStateByServiceQuery,
	lowestReadyRatioQuery,
];

test("bevarer identitet, produksjon og verifiserte datakilder", () => {
	const dashboard = buildControlRoomDashboard();
	assert.equal(CONTROL_ROOM_UID, "team-esyfo-kontrollrom");
	assert.equal(CONTROL_ROOM_FOLDER_UID, "K-1b-N_4k");
	assert.equal(dashboard.metadata.name, CONTROL_ROOM_UID);
	assert.equal(
		dashboard.metadata.annotations["grafana.app/folder"],
		CONTROL_ROOM_FOLDER_UID,
	);
	assert.equal(dashboard.spec.title, "Team eSyfo · Kontrollrom");
	const queries = objects(dashboard).filter(({ kind }) => kind === "DataQuery");
	assert.ok(queries.length > 20);
	for (const query of queries) {
		const datasource = query.datasource as { name: string };
		const spec = query.spec as {
			expr: string;
			instant?: boolean;
			range?: boolean;
		};
		assert.match(spec.expr, /k8s_cluster_name="prod"/);
		if (query.group === "prometheus") {
			assert.equal(datasource.name, MIMIR_DATASOURCE_UID);
			assert.equal(typeof spec.instant, "boolean");
			assert.equal(typeof spec.range, "boolean");
			assert.notEqual(spec.instant, spec.range);
		} else {
			assert.equal(query.group, "loki");
			assert.equal(datasource.name, LOKI_DATASOURCE_UID);
			assert.match(spec.expr, /service_namespace="team-esyfo"/);
			assert.ok(!spec.expr.includes("$__rate_interval"));
		}
	}
});

test("holder alle aktive produksjonstjenester synlige uten avviklede FSS-ressurser", () => {
	assert.equal(CONTROL_ROOM_BASELINE_AS_OF, "2026-08-28");
	assert.deepEqual(
		controlRoomApplications,
		runtimeInventory.applications.filter(
			({ lifecycle, runtime }) =>
				isCurrentLifecycle(lifecycle) && runtime.cluster === "prod-gcp",
		),
	);
	assert.equal(controlRoomApplications.length, 26);
	assert.equal(controlRoomServerApplications.length, 24);
	assert.equal(controlRoomSunsetApplications.length, 0);
	for (const { runtime } of controlRoomApplications) {
		assert.ok(expectedScopeVectorQuery.includes(runtime.name));
		assert.ok(new RegExp(controlRoomApplicationRegex).test(runtime.name));
	}
	for (const retired of [
		"syfooppfolgingsplanservice",
		"syfooppfolgingsplanservice-redis",
		"syfooppfolgingsplanservice-redisexporter",
	]) {
		assert.ok(!expectedScopeVectorQuery.includes(retired));
		assert.ok(
			runtimeInventory.applications.some(
				({ runtime, lifecycle }) =>
					runtime.name === retired && lifecycle.state === "retired",
			),
		);
	}
	for (const excluded of [
		"dulting-studio",
		"syfojanitor-backend",
		"syfojanitor-frontend",
		"teamsykefravr",
	]) {
		assert.ok(!expectedScopeVectorQuery.includes(excluded));
	}
	for (const worker of ["esyfovarsel", "syfo-budstikka"]) {
		assert.ok(expectedScopeVectorQuery.includes(worker));
		assert.ok(!expectedServerScopeVectorQuery.includes(worker));
	}
});

test("har ingen globale filtre og avgrenser tjenestevelgeren til detaljfanen", () => {
	const dashboard = buildControlRoomDashboard();
	assert.deepEqual(dashboard.spec.variables, []);
	assert.ok(
		!serializeControlRoomDashboard().includes(grafanaVariable("scope:raw")),
	);
	const [overview, detail] = tabs();
	assert.equal(overview.spec.variables, undefined);
	assert.equal(detail.spec.title, SERVICE_TAB_TITLE);
	assert.equal(detail.spec.variables?.length, 1);
	const variable = detail.spec.variables?.[0];
	assert.equal(variable?.spec.name, "service");
	assert.equal(variable?.spec.label, "Tjeneste");
	assert.equal(variable?.spec.multi, false);
	assert.equal(variable?.spec.includeAll, false);
	assert.equal(variable?.spec.skipUrlSync, false);
	const options = variable?.spec.query.split(",").map((entry) => {
		const [text, value] = entry.split(" : ");
		assert.ok(text && value);
		return { text, value };
	});
	assert.deepEqual(options, controlRoomApplicationOptions);
	assert.ok(
		controlRoomApplicationOptions.some(
			(option) =>
				option.value === variable?.spec.current.value &&
				option.text === variable?.spec.current.text,
		),
	);
	assert.equal(
		objects(dashboard).filter(({ kind }) => kind === "CustomVariable").length,
		1,
	);
	for (const item of overviewItems())
		assert.ok(
			expressions(panels()[item.spec.element.name]).every(
				(q) => !q.includes(grafanaVariable("service:raw")),
			),
		);
	for (const row of detailRows()) {
		assert.equal(row.spec.variables, undefined);
		const condition = row.spec.conditionalRendering?.spec.items[0].spec;
		for (const item of row.spec.layout.spec.items) {
			if (condition?.operator === "equals") continue;
			assert.ok(
				expressions(panels()[item.spec.element.name]).every((q) =>
					q.includes(grafanaVariable("service:raw")),
				),
			);
		}
	}
	for (const expression of selectedQueries)
		assert.ok(expression.includes(grafanaVariable("service:raw")));
	for (const expression of fleetQueries) {
		assert.ok(!expression.includes(grafanaVariable("service:raw")));
		assert.ok(!expression.includes(grafanaVariable("scope:raw")));
	}
});

test("viser fire felles oversiktskort og tjenestetabellen som standard", () => {
	assert.equal(
		(buildControlRoomDashboard().spec.layout as { kind: string }).kind,
		"TabsLayout",
	);
	assert.deepEqual(
		tabs().map(({ spec }) => spec.title),
		["Oversikt", SERVICE_TAB_TITLE],
	);
	assert.deepEqual(
		overviewItems().map(({ spec }) => spec.element.name),
		["panel-2", "panel-32", "panel-4", "panel-5", "panel-10"],
	);
	assert.equal(overviewItems()[4].spec.y, 4);
	for (const id of ["panel-2", "panel-32", "panel-4"]) {
		assert.equal(
			panels()[id].spec.vizConfig.spec.fieldConfig.defaults.unit,
			"short",
		);
	}
	for (const id of ["panel-3", "panel-6", "panel-7"])
		assert.equal(panels()[id], undefined);
	assert.ok(
		Object.values(panels()).every(
			({ spec }) => spec.vizConfig.group !== "text",
		),
	);
	const serialized = serializeControlRoomDashboard();
	for (const text of [
		"BLOCKED",
		"IKKE DEFINERT",
		"Pagerkandidater",
		"Kjente gap",
		'kind=\\"exception',
	])
		assert.ok(!serialized.includes(text));
});

test("viser HTTP etter inventarkontrakt og særdiagnostikk bare for riktig eier", () => {
	const ownerPanels: Record<string, string[]> = {
		"syfo-oppfolgingsplan-backend": ["panel-33", "panel-34", "panel-26"],
		"syfo-budstikka": ["panel-25"],
		esyfovarsel: ["panel-23"],
		"dinesykmeldte-backend": ["panel-30", "panel-31"],
		syfomotebehov: ["panel-27"],
	};
	for (const { runtime } of controlRoomApplications) {
		const visible: string[] = [];
		for (const row of detailRows()) {
			assert.equal(row.spec.collapse, false);
			assert.equal(row.spec.hideHeader, true);
			const condition = row.spec.conditionalRendering;
			if (condition) {
				assert.equal(condition.kind, "ConditionalRenderingGroup");
				assert.equal(condition.spec.visibility, "show");
				assert.equal(condition.spec.condition, "and");
				assert.equal(condition.spec.items.length, 1);
				const rule = condition.spec.items[0];
				assert.equal(rule.kind, "ConditionalRenderingVariable");
				assert.equal(rule.spec.variable, "service");
				assert.ok(["equals", "matches"].includes(rule.spec.operator));
				const matches =
					rule.spec.operator === "equals"
						? runtime.name === rule.spec.value
						: new RegExp(rule.spec.value).test(runtime.name);
				if (!matches) continue;
			}
			visible.push(
				...row.spec.layout.spec.items.map(({ spec }) => spec.element.name),
			);
		}
		const expectsHttp = controlRoomServerApplications.some(
			(app) => app.runtime.name === runtime.name,
		);
		assert.deepEqual(
			visible.sort(),
			[
				"panel-15",
				"panel-37",
				"panel-36",
				...(expectsHttp ? ["panel-12", "panel-13", "panel-14"] : []),
				...(ownerPanels[runtime.name] ?? []),
			].sort(),
			runtime.name,
		);
	}
});

test("åpner riktig detaljfane fra tjenestetabellen med samme tidsrom", () => {
	const url = new URL(
		serviceInvestigationDataLink("flaggskipet"),
		"https://grafana.test",
	);
	assert.equal(url.pathname, `/d/${CONTROL_ROOM_UID}`);
	assert.equal(url.searchParams.get("dtab"), "Undersøk-en-tjeneste");
	assert.equal(url.searchParams.get("var-service"), "flaggskipet");
	assert.equal(url.searchParams.get("from"), grafanaVariable("__from"));
	assert.equal(url.searchParams.get("to"), grafanaVariable("__to"));
	const serviceField = panels()[
		"panel-10"
	].spec.vizConfig.spec.fieldConfig.overrides.find(
		({ matcher }) => matcher.options === "Tjeneste",
	);
	const links = objects(serviceField).filter(
		({ url }) => typeof url === "string",
	);
	assert.equal(links[0].title, "Undersøk tjenesten");
	assert.equal(links[0].targetBlank, false);
	assert.equal(
		links[0].url,
		serviceInvestigationDataLink(grafanaVariable("__value.raw")),
	);
});

test("viser hele tjenestelisten uten sidebytte", () => {
	assert.equal(
		panels()["panel-10"].spec.vizConfig.spec.options.enablePagination,
		false,
	);
	assert.ok(overviewItems()[4].spec.height >= controlRoomApplications.length);
});

test("slanker tabellen uten å fjerne målegap eller lenker", () => {
	const panel = panels()["panel-10"];
	assert.equal(panel.spec.title, "Tjenester i produksjon");
	const { queries, transformations } = panel.spec.data.spec;
	const refIds = queries.map(({ spec }) => spec.refId);
	assert.deepEqual(refIds, [
		"Telemetry",
		"Requests",
		"OTel-feil",
		"Runtimefeil",
		"Restarts",
		"Klare replikaer",
	]);
	assert.deepEqual(
		transformations.map(({ group }) => group),
		["merge", "organize"],
	);
	const organize = transformations[1].spec.options as {
		excludeByName: Record<string, boolean>;
		indexByName: Record<string, number>;
		renameByName: Record<string, string>;
	};
	assert.deepEqual(Object.values(organize.renameByName), [
		"Tjeneste",
		"Kall i perioden",
		"Feilmarkerte kall",
		"Loggfeil i perioden",
		"Omstarter i perioden",
		"Klare replikaer",
		"HTTP-målinger",
	]);
	for (const field of ["Time", "criticality", "lifecycle", "role"])
		assert.equal(organize.excludeByName[field], true);
	const names = Object.values(organize.renameByName);
	for (const { matcher } of panel.spec.vizConfig.spec.fieldConfig.overrides) {
		assert.equal(matcher.id, "byName");
		assert.ok(names.includes(matcher.options), matcher.options);
	}
	for (const field of ["service_name", ...refIds.map((id) => `Value #${id}`)])
		assert.ok(field in organize.renameByName);
	const mapped = JSON.stringify(panel);
	for (const state of [
		"Nyere data",
		"Sett siste 30 min",
		"Ingen nyere data",
		"Bakgrunnstjeneste",
	])
		assert.ok(mapped.includes(state));
	assert.match(panel.spec.description, /ikke null/);
	assert.match(panel.spec.description, /gjelder valgt tidsrom/);
	assert.match(panel.spec.description, /tilstand ved periodens slutt/);
	assert.ok(
		(values(panel, "url") as string[]).some((url) =>
			url.includes(grafanaVariable("__value.raw")),
		),
	);
});

test("forankrer måledekningen i HTTP-profilene og skiller stale fra manglende", () => {
	assert.match(telemetryStateByServiceQuery, /0 \*/);
	assert.match(telemetryStateByServiceQuery, /1 \*/);
	assert.match(telemetryStateByServiceQuery, /2 \*/);
	assert.match(telemetryStateByServiceQuery, /3 \*/);
	assert.match(telemetryStateByServiceQuery, /\[30m:\]/);
	assert.match(telemetryStateByServiceQuery, /unless on\(service_name\)/);
	assert.ok(!telemetryStateByServiceQuery.includes("or on() vector(0)"));
});

test("bevarer SERVER-spans og skiller OTel-feilstatus fra HTTP-status", () => {
	for (const query of [
		requestCountQuery,
		httpErrorCountQuery,
		httpErrorRatioQuery,
		p95LatencyQuery,
		requestRateByServiceQuery,
		errorRatioByServiceQuery,
		p95ByServiceQuery,
		requestsByServiceQuery,
		otelErrorsByServiceQuery,
	]) {
		assert.match(query, /service_namespace="team-esyfo"/);
		assert.match(query, /span_kind="SPAN_KIND_SERVER"/);
	}
	assert.ok(requestCountQuery.includes(SPAN_CALLS_METRIC));
	assert.ok(p95LatencyQuery.includes(SPAN_LATENCY_METRIC));
	assert.match(httpErrorCountQuery, /status_code="STATUS_CODE_ERROR"/);
	assert.match(
		panels()["panel-2"].spec.description,
		/ikke automatisk HTTP 5xx/,
	);
});

test("lager bare HTTP-null med observerte serier og trafikk", () => {
	for (const query of [
		httpErrorCountQuery,
		httpErrorRatioQuery,
		errorRatioByServiceQuery,
		p95LatencyQuery,
		p95ByServiceQuery,
	]) {
		assert.match(query, /and on\(/);
		assert.match(query, /> 0\)/);
		assert.ok(!query.includes("vector(0)"));
	}
	assert.ok(!fleetOtelErrorCountQuery.includes("vector(0)"));
	assert.ok(fleetOtelErrorCountQuery.includes(requestsByServiceQuery));
});

test("lar manglende readiness være ukjent i stedet for falsk null", () => {
	for (const query of [
		lowestReadyRatioQuery,
		readyRatioByServiceQuery,
		selectedReadyRatioQuery,
	]) {
		assert.ok(query.includes(READY_REPLICAS_METRIC));
		assert.ok(query.includes(DESIRED_REPLICAS_METRIC));
		assert.match(query, /> 0\)/);
		assert.ok(!query.includes("* 0"));
		assert.ok(!query.includes("or on(deployment)"));
	}
	assert.ok(motebehovAvailableRatioQuery.includes(AVAILABLE_REPLICAS_METRIC));
	assert.ok(!motebehovAvailableRatioQuery.includes(READY_REPLICAS_METRIC));
	assert.ok(!motebehovAvailableRatioQuery.includes("* 0"));
	for (const id of ["panel-5", "panel-37", "panel-27"]) {
		assert.ok(
			!JSON.stringify(panels()[id].spec.vizConfig).includes('"color":"red"'),
		);
	}
	assert.ok(
		!serializeControlRoomDashboard().includes("kube_deployment_created"),
	);
	const readiness = panels()[
		"panel-10"
	].spec.vizConfig.spec.fieldConfig.overrides.find(
		({ matcher }) => matcher.options === "Klare replikaer",
	);
	assert.deepEqual(
		readiness?.properties.find(({ id }) => id === "mappings")?.value,
		[
			{
				type: "special",
				options: { match: "null", result: { text: "—", color: "gray" } },
			},
		],
	);
});

test("bevarer dedupliserte restarts, observasjonsforankret null og nøytral historikk", () => {
	assert.ok(podTerminationReasonQuery.includes("max_over_time("));
	assert.ok(podTerminationReasonQuery.includes("[$__range]"));
	assert.ok(podTerminationReasonQuery.includes("Ikke registrert"));
	for (const query of [restartCountQuery, restartsByServiceQuery]) {
		assert.ok(query.includes(RESTARTS_METRIC));
		assert.match(query, /max by \(pod, container\)/);
		assert.match(query, /namespace="team-esyfo"/);
	}
	for (const query of [fleetRestartCountQuery]) {
		assert.ok(!query.includes("vector(0)"));
		assert.ok(query.startsWith("sum("));
	}
	const top = panels()["panel-4"];
	assert.ok(expressions(top)[0].includes("[$__range]"));
	assert.ok(!JSON.stringify(top.spec.vizConfig).includes('"color":"red"'));
	const diagnostic = panels()["panel-36"];
	const grouping = diagnostic.spec.data.spec.transformations.find(
		({ group }) => group === "groupBy",
	)?.spec.options;
	assert.deepEqual(grouping, {
		fields: {
			pod: { operation: "groupby", aggregations: [] },
			"Value #Restarts": { operation: "aggregate", aggregations: ["max"] },
			"Value #Avsluttet": { operation: "aggregate", aggregations: ["max"] },
			"Value #Exit": { operation: "aggregate", aggregations: ["max"] },
			"Value #Tidsstatus": { operation: "aggregate", aggregations: ["max"] },
			reason: { operation: "aggregate", aggregations: ["uniqueValues"] },
		},
	});
	assert.ok(expressions(diagnostic).some((q) => q.includes("[$__range]")));
	assert.ok(!expressions(diagnostic).some((q) => /\[(15m|24h)\]/.test(q)));
	assert.ok(
		expressions(diagnostic).some(
			(q) => q.includes("last_terminated_reason") && q.includes("== 1"),
		),
	);
	assert.ok(JSON.stringify(diagnostic).includes("last_terminated_timestamp"));
	assert.ok(JSON.stringify(diagnostic).includes("last_terminated_exitcode"));
	assert.match(diagnostic.spec.description, /ikke årsak til alle restarts/);
	assert.ok(
		!JSON.stringify(diagnostic.spec.vizConfig).includes('"color":"red"'),
	);
	assert.ok(
		(values(diagnostic, "url") as string[]).some((url) =>
			url.includes("k8s_pod_name"),
		),
	);
});

test("viser heltall og beskriver fravær av HTTP-data uten feildiagnose", () => {
	assert.equal(
		panels()["panel-10"].spec.vizConfig.spec.fieldConfig.defaults.decimals,
		0,
	);
	const panel = JSON.stringify(panels()["panel-10"]);
	assert.ok(panel.includes("Ingen nyere data"));
	assert.ok(!panel.includes('"Forsinket"'));
	assert.ok(!panel.includes('"Mangler"'));
});

test("viser tomme loggsøk som ingen treff uten kunstig null", () => {
	for (const query of [
		runtimeErrorCountQuery,
		runtimeErrorsByServiceQuery,
		fleetRuntimeErrorCountQuery,
	]) {
		assert.ok(!query.includes("vector(0)"));
		assert.ok(!query.includes("* 0"));
		assert.match(query, /detected_level=~`\(\?i\)\(error\|critical\|fatal\)`/);
		assert.ok(query.includes('| x_isFrontend!="true"'));
		assert.ok(query.includes('| json forwarded_browser="x_isFrontend"'));
		assert.ok(query.includes('| forwarded_browser!="true"'));
	}
	for (const id of ["panel-32", "panel-15"]) {
		assert.equal(
			panels()[id].spec.vizConfig.spec.fieldConfig.defaults.noValue,
			"Ingen treff",
		);
		assert.match(panels()[id].spec.description, /ikke bevis/);
	}
	assert.ok(runtimeErrorsByServiceQuery.includes("[$__range]"));
});

test("holder smale API-avvisninger utenfor flåteoversikten", () => {
	assert.equal(panels()["panel-35"], undefined);
	assert.ok(!serializeControlRoomDashboard().includes("api_request_rejected"));
});

test("viser bare Failed=True som jobbfeil og beholder manglende måling", () => {
	assert.ok(jobFailureQuery.includes(JOB_FAILED_METRIC));
	assert.match(jobFailureQuery, /job_name=~"esyfovarsel-job\.\*"/);
	assert.match(jobFailureQuery, /condition="true"/);
	assert.ok(!jobFailureQuery.includes("vector(0)"));
	assert.equal(
		panels()["panel-23"].spec.vizConfig.spec.fieldConfig.defaults.noValue,
		"Ukjent",
	);
	assert.match(panels()["panel-23"].spec.description, /ikke bevist vellykket/);
});

test("bevarer avgrenset kødiagnostikk uten å love ende-til-ende-leveranse", () => {
	assert.ok(
		sykmeldingConsumerPollAgeByPodQuery.includes(
			KAFKA_CONSUMER_LAST_POLL_METRIC,
		),
	);
	assert.match(sykmeldingConsumerPollAgeByPodQuery, /max by \(pod\)/);
	assert.ok(!sykmeldingConsumerPollAgeByPodQuery.includes(">= 0"));
	assert.ok(!sykmeldingConsumerPollAgeByPodQuery.includes("vector(0)"));
	assert.ok(
		sykmeldingConsumerCommittedLagQuery.includes(
			KAFKA_CONSUMER_GROUP_TOPIC_LAG_METRIC,
		),
	);
	assert.match(
		sykmeldingConsumerCommittedLagQuery,
		/group="syfo-oppfolgingsplan-backend-sykmeldingsperiode-v2"/,
	);
	assert.match(
		sykmeldingConsumerCommittedLagQuery,
		/topic="teamsykmelding\.syfo-sendt-sykmelding"/,
	);
	assert.ok(budstikkaLagQuery.includes(BUDSTIKKA_LAG_METRIC));
	assert.ok(deserializationRateQuery.includes(DESERIALIZATION_ERROR_METRIC));
	assert.match(
		panels()["panel-33"].spec.description,
		/ikke null lag eller ende-til-ende-leveranse/,
	);
	assert.match(
		panels()["panel-34"].spec.description,
		/Positiv lag kan være kortvarig/,
	);
	assert.match(
		panels()["panel-26"].spec.description,
		/ikke terminalt avviste meldinger fra gjentatte forsøk/,
	);
});

test("holder Dine sykmeldte-utfall disjunkte uten å gjøre alle 4xx til driftsfeil", () => {
	for (const outcome of [
		"attempt",
		"good",
		"http_4xx",
		"technical_failure",
		"unclassified",
	])
		assert.ok(dinesykmeldteOutcomeRateQuery.includes(`"${outcome}"`));
	assert.match(
		dinesykmeldteTrafficRateQuery,
		/http_response_status_code=~"2\.\.", status_code!="STATUS_CODE_ERROR"/,
	);
	assert.match(
		dinesykmeldteDeviationRateQuery,
		/http_response_status_code=~"4\.\.", status_code!="STATUS_CODE_ERROR"/,
	);
	assert.match(
		dinesykmeldteDeviationRateQuery,
		/status_code!="STATUS_CODE_ERROR", http_response_status_code!~"\[245\]\.\."/,
	);
	assert.ok(!dinesykmeldteOutcomeRateQuery.includes("vector(0)"));
	assert.match(panels()["panel-31"].spec.description, /ikke kalt forventet/);
	assert.match(panels()["panel-30"].spec.description, /ikke en vedtatt SLI/);
	const displayNames = ["panel-30", "panel-31"].flatMap((id) =>
		panels()[id].spec.vizConfig.spec.fieldConfig.overrides.flatMap(
			({ properties }) =>
				properties
					.filter(({ id }) => id === "displayName")
					.map(({ value }) => value),
		),
	);
	for (const operation of ["Sykmeldte", "Virksomheter"]) {
		for (const outcome of [
			"Alle kall",
			"Vellykkede svar",
			"HTTP 4xx",
			"Feilmarkerte svar",
			"Øvrig eller ukjent status",
		]) {
			assert.ok(displayNames.includes(`${operation} · ${outcome}`));
		}
	}
});

test("gir nyttige APM-, trace-, logg-, feil- og runbooklenker", () => {
	const rowValue = grafanaVariable("__value.raw");
	for (const link of [
		apmDataLink(rowValue),
		runtimeLogsDataLink(rowValue),
		errorDashboardDataLink(rowValue),
	])
		assert.ok(link.includes(rowValue));
	assert.match(apmDataLink(rowValue), /environment=prod/);
	assert.match(apmDataLink(rowValue), /from=\$\{__from\}/);
	assert.match(runtimeLogsDataLink(rowValue), /var-ds=PEA2100DC89AE9FE2/);
	assert.match(
		errorDashboardDataLink(rowValue),
		/var-runtime_environment=prod/,
	);
	const urls = values(buildControlRoomDashboard(), "url") as string[];
	for (const template of urls) {
		const parsed = new URL(
			template.replace(/\$\{[^}]+\}/g, "test-service"),
			"https://grafana.nav.cloud.nais.io",
		);
		assert.equal(parsed.protocol, "https:");
		assert.ok(
			["grafana.nav.cloud.nais.io", "github.com", "navikt.github.io"].includes(
				parsed.hostname,
			),
			template,
		);
	}
	for (const [url, fileName] of [
		[RUNTIME_RUNBOOK_URL, "http-runtime.md"],
		[PIPELINE_RUNBOOK_URL, "pipelines-og-jobber.md"],
		[MOTEBEHOV_RUNBOOK_URL, "syfomotebehov-tilgjengelighet.md"],
		[DESERIALIZATION_RUNBOOK_URL, "oppfolgingsplan-deserialisering.md"],
	]) {
		assert.ok(urls.includes(url));
		assert.ok(
			existsSync(
				new URL(
					`../../utvikling/observability/runbooks/${fileName}`,
					import.meta.url,
				),
			),
		);
	}
	assert.ok(
		(values(panels()["panel-10"], "title") as string[]).includes(
			"APM og tracing",
		),
	);
	const readinessLinks = values(panels()["panel-37"], "url") as string[];
	assert.ok(
		readinessLinks.some((url) => url.includes(grafanaVariable("service:raw"))),
	);
	assert.ok(
		readinessLinks.every((url) => !url.includes("__field.labels.service_name")),
	);
});

test("holder browser utenfor produksjonskontrollrommet og persondata utenfor ressursen", () => {
	const serialized = serializeControlRoomDashboard();
	for (const canary of [
		'kind=\\"exception',
		"12345678901",
		"alice@example.com",
		"550e8400-e29b-41d4-a716-446655440000",
		"request_body",
		"session_id",
	])
		assert.ok(!serialized.includes(canary));
	assert.ok(
		expressions(buildControlRoomDashboard()).every(
			(expr) => !expr.includes('kind="exception"'),
		),
	);
	assert.ok(!panels()["panel-20"]);
	assert.equal(
		values(buildControlRoomDashboard(), "group").filter(
			(group) => group === "loki",
		).length,
		3,
	);
	assert.ok(serialized.includes('"autoRefresh": "2m"'));
	assert.ok(serialized.includes('"from": "now-1h"'));
});

test("har unik, deterministisk fanelayout uten overlapp eller foreldreløse paneler", () => {
	const panelMap = panels();
	assert.equal(Object.keys(panelMap).length, 19);
	const ids = Object.values(panelMap).map(({ spec }) => spec.id);
	assert.equal(new Set(ids).size, ids.length);
	const names: string[] = [];
	for (const row of detailRows()) {
		assert.equal(row.kind, "RowsLayoutRow");
		assert.equal(row.spec.layout.kind, "GridLayout");
	}
	const grids = [
		overviewItems(),
		...detailRows().map((row) => row.spec.layout.spec.items),
	];
	for (const items of grids) {
		for (let i = 0; i < items.length; i++) {
			const a = items[i].spec;
			names.push(a.element.name);
			assert.ok(a.width > 0 && a.height > 0 && a.x >= 0 && a.y >= 0);
			assert.ok(a.x + a.width <= 24);
			for (const other of items.slice(i + 1)) {
				const b = other.spec;
				assert.ok(
					a.x + a.width <= b.x ||
						b.x + b.width <= a.x ||
						a.y + a.height <= b.y ||
						b.y + b.height <= a.y,
					`${a.element.name}/${b.element.name}`,
				);
			}
		}
	}
	assert.deepEqual(names.sort(), Object.keys(panelMap).sort());
	assert.equal(
		serializeControlRoomDashboard(),
		serializeControlRoomDashboard(),
	);
});
