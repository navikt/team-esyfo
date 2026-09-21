import {
	dataLink,
	GRAFANA_VERSION,
	type GrafanaDashboardResource,
	grafanaVariable,
	layoutItem,
} from "./dashboard-kit.ts";
import {
	runtimeContextLabels,
	runtimeErrorDetailsLabels,
	runtimeEventContextDataLink,
} from "./error-diagnostics.ts";
import {
	buildErrorDashboard,
	lokiQuery,
	queryGroup,
	runtimeErrorGroupDataLink,
	runtimeErrorGroupQuery,
	runtimeVariables,
	tracedErrorsPanel,
} from "./error-drilldown.ts";
import { ERROR_DETAILS_UID, runtimeLogsDataLink } from "./runtime-links.ts";

const variable = (name: string) => grafanaVariable(`${name}:doublequote`);

// Retain exact parity with the original group, including legacy fallbacks.
// Quote URL-supplied variables as values, never interpolate query fragments.
export const selectedErrorGroupQuery = (withTrace = false) => {
	let query = runtimeErrorGroupQuery(withTrace)
		.replace(
			'k8s_cluster_name=~"^${runtime_environment:regex}$"',
			`k8s_cluster_name=${variable("runtime_environment")}`,
		)
		.replace(
			'service_name="${__data.fields["service_name"]}"',
			`service_name=${variable("app")}`,
		);
	for (const [field, name] of [
		["error_type_display", "event"],
		["error_code_display", "code"],
		["operation_display", "operation"],
		["error_level", "level"],
	]) {
		query = query.replace(
			`\`${grafanaVariable(`__data.fields["${field}"]`)}\``,
			variable(name),
		);
	}
	return query;
};

export const recentErrorSamplesQuery = `${selectedErrorGroupQuery()}
${runtimeErrorDetailsLabels}
${runtimeContextLabels}
| label_format action=\`Logger rundt hendelsen\`
| line_format \`{{ .error_details }}\`
| keep service_name, error_type_display, error_code_display, operation_display, error_level, error_details, context_from, context_to, action`;

export const selectedErrorTracesQuery = `${selectedErrorGroupQuery(true)}
${runtimeErrorDetailsLabels}
| line_format \`{{ .error_details }}\`
| keep service_name, error_type_display, error_code_display, error_context, upstream_status_display, safe_trace_id, error_details`;

const samplePanel = () => {
	const query = lokiQuery(
		"Konkrete hendelser",
		recentErrorSamplesQuery,
		"range",
	);
	Object.assign(query.spec.query.spec, { maxLines: 50 });
	const hidden = [
		"service_name",
		"error_type_display",
		"error_level",
		"error_code_display",
		"operation_display",
		"context_from",
		"context_to",
	];
	return {
		kind: "Panel",
		spec: {
			id: 2,
			title: "Konkrete hendelser · med og uten trace",
			description:
				"De 50 nyeste treffene i akkurat denne feilgruppen. Logger rundt hendelsen åpner alle nivåer for tjenesten i et fire minutters vindu. Det kan også inneholde andre samtidige forløp; en trace-ID gir sikrere korrelasjon.",
			links: [],
			data: queryGroup(query, [
				{
					kind: "Transformation",
					group: "extractFields",
					spec: {
						options: {
							format: "json",
							keepTime: true,
							replace: true,
							source: "labels",
						},
					},
				},
				{
					kind: "Transformation",
					group: "organize",
					spec: {
						options: {
							excludeByName: {},
							includeByName: {},
							indexByName: { Time: 0, error_details: 1, action: 2 },
							renameByName: {
								Time: "Tidspunkt",
								error_details: "Tekniske felt",
								action: "Undersøk",
							},
						},
					},
				},
			]),
			vizConfig: {
				kind: "VizConfig",
				group: "table",
				version: GRAFANA_VERSION,
				spec: {
					fieldConfig: {
						defaults: {
							noValue: "—",
							custom: {
								align: "auto",
								cellOptions: { type: "auto" },
								inspect: false,
								wrapText: true,
							},
						},
						overrides: [
							...hidden.map((field) => ({
								matcher: { id: "byName", options: field },
								properties: [{ id: "custom.hideFrom.viz", value: true }],
							})),
							{
								matcher: { id: "byName", options: "Time" },
								properties: [{ id: "custom.width", value: 195 }],
							},
							{
								matcher: { id: "byName", options: "action" },
								properties: [
									{ id: "custom.width", value: 290 },
									{ id: "custom.cellOptions", value: { type: "data-links" } },
									{
										id: "links",
										value: [
											dataLink(
												"Logger rundt hendelsen",
												runtimeEventContextDataLink(),
											),
											dataLink(
												"Rålogger for gruppen",
												runtimeErrorGroupDataLink(),
											),
										],
									},
								],
							},
						],
					},
					options: {
						cellHeight: "sm",
						maxRowHeight: 100,
						showHeader: true,
						enablePagination: false,
						sortBy: [{ desc: true, displayName: "Tidspunkt" }],
					},
				},
			},
		},
	};
};

const groupVariable = (name: string, value: string) => ({
	kind: "CustomVariable",
	spec: {
		name,
		label: name,
		hide: "hideVariable",
		query: value,
		current: { text: value, value },
		options: [],
		allowCustomValue: true,
		includeAll: false,
		multi: false,
		skipUrlSync: false,
		valuesFormat: "csv",
	},
});

export const buildErrorDetailsDashboard = (): GrafanaDashboardResource => {
	const base = buildErrorDashboard();
	const traces = tracedErrorsPanel();
	traces.spec.title = "Forløp med trace · bare denne feilgruppen";
	traces.spec.description =
		"Velg Logger med samme trace for alle nivåer og relevante tjenester med samme trace-ID i det valgte tidsrommet. Åpne trace krever at sporet er samplet, eksportert og fortsatt lagret. Hvis ingen trace finnes, bruk Logger rundt hendelsen over.";
	traces.spec.data.spec.queries[0].spec.query.spec.expr =
		selectedErrorTracesQuery;
	const selectorVariables = runtimeVariables().map((item) =>
		item.spec.name === "app"
			? {
					...item,
					spec: {
						...item.spec,
						hide: "hideVariable",
						multi: false,
						includeAll: false,
						current: { text: "Velg en feil fra Feiloversikt", value: "" },
					},
				}
			: item,
	);
	return {
		...base,
		metadata: { ...base.metadata, name: ERROR_DETAILS_UID },
		spec: {
			...base.spec,
			title: "Team eSyfo – Feildetaljer",
			description:
				"Konkrete hendelser og tekniske felt for én valgt feilgruppe, også uten trace.",
			elements: {
				"panel-2": samplePanel(),
				"panel-3": traces,
				"panel-4": {
					kind: "Panel",
					spec: {
						id: 4,
						title: "Valgt feil",
						description: "",
						links: [],
						data: {
							kind: "QueryGroup",
							spec: { queries: [], queryOptions: {}, transformations: [] },
						},
						vizConfig: {
							kind: "VizConfig",
							group: "text",
							version: GRAFANA_VERSION,
							spec: {
								options: {
									mode: "markdown",
									content:
										"**${app}** · ${event} · ${code} · ${operation} · ${level}",
								},
								fieldConfig: { defaults: {}, overrides: [] },
							},
						},
					},
				},
			},
			layout: {
				kind: "GridLayout",
				spec: {
					items: [
						layoutItem("panel-4", 0, 0, 24, 3),
						layoutItem("panel-2", 0, 3, 24, 12),
						layoutItem("panel-3", 0, 15, 24, 10),
					],
				},
			},
			variables: [
				...selectorVariables,
				groupVariable("event", ""),
				groupVariable("code", "—"),
				groupVariable("operation", "—"),
				groupVariable("level", "error"),
			],
			links: [
				{
					type: "link",
					title: "Feil for denne tjenesten",
					icon: "dashboard",
					tooltip: "",
					tags: [],
					asDropdown: false,
					includeVars: false,
					keepTime: false,
					targetBlank: false,
					url: "/d/team-esyfo-feiloversikt?var-runtime_environment=${runtime_environment:raw}&var-app=${app:percentencode}&from=${__from}&to=${__to}",
				},
				{
					type: "link",
					title: "Alle tjenestelogger",
					icon: "external link",
					tooltip: "",
					tags: [],
					asDropdown: false,
					includeVars: false,
					keepTime: false,
					targetBlank: true,
					url: runtimeLogsDataLink(
						grafanaVariable("app:raw"),
						grafanaVariable("runtime_environment:raw"),
					),
				},
			],
		},
	};
};

export const serializeErrorDetailsDashboard = () =>
	`${JSON.stringify(buildErrorDetailsDashboard(), null, 2)}\n`;
