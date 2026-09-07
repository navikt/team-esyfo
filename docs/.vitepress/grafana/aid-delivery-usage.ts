import {
	GRAFANA_VERSION,
	type GrafanaDashboardResource,
	grafanaVariable,
	LOKI_DATASOURCE_UID,
	layoutItem,
	TEAM_ESYFO_DASHBOARD_FOLDER_UID,
} from "./dashboard-kit.ts";

// Preserve the existing AID dashboard URL and its working environment datasource.
export const AID_DASHBOARD_UID = "aufd2lm";
export const AID_EVENT_NAME = "aid_paaminnelse";
export const AID_PACKAGE = "OPPFOLGINGSPLAN_TILTAKSPAKKE_1";

const eventSelector = '{service_name="dinesykmeldte", kind="event"}';
// Faro/Alloy serializes custom event attributes with the event_data_ prefix.
// Parse only the closed fields used here, never page URLs or session IDs.
export const aidEventPipeline = `${eventSelector}
| logfmt app_namespace, app_environment, event_name, event_domain, event_data_schema_version, event_data_tiltakspakke, event_data_flate, event_data_gruppe, event_data_variant, event_data_hendelse, event_data_paaminnelsevalg, event_data_utfall
| __error__=""
| app_namespace="team-esyfo"
| app_environment="\${env:text}"
| event_name="${AID_EVENT_NAME}"
| event_domain="aid"
| event_data_schema_version="1"
| event_data_tiltakspakke="${AID_PACKAGE}"
| event_data_flate="dinesykmeldte"
| event_data_gruppe=~"tiltak|kontroll|utenfor_scope|blandet|ukjent"
| event_data_variant=~"aid|skjult"
| event_data_hendelse=~"beslutning|vist|bestill|avbestill"
| event_data_paaminnelsevalg=~"bestilt|ikke_bestilt|ikke_tilbudt|ukjent"
| event_data_utfall=~"tilgjengelig|skjult|vurdering_mangler|status_feilet|forsok|bekreftet|feilet|ikke_bekreftet"
| label_format gruppe=event_data_gruppe, variant=event_data_variant, hendelse=event_data_hendelse, paaminnelsevalg=event_data_paaminnelsevalg, utfall=event_data_utfall
| keep gruppe, variant, hendelse, paaminnelsevalg, utfall`;

export const aidCount = (
	filter: string,
	groupBy = "gruppe",
	range = "$__auto",
) =>
	`sum by (${groupBy}) (count_over_time(${aidEventPipeline}\n${filter}\n[${range}]))`;
export const aidDecisionsQuery = aidCount(
	'| hendelse="beslutning"',
	"gruppe, variant, utfall",
);
export const aidViewsQuery = aidCount(
	'| hendelse="vist"',
	"gruppe, paaminnelsevalg",
);
export const aidActionsQuery = aidCount(
	'| hendelse=~"bestill|avbestill"',
	"gruppe, hendelse, paaminnelsevalg, utfall",
);
export const aidFailuresQuery = aidCount(
	'| utfall=~"vurdering_mangler|status_feilet|feilet|ikke_bekreftet"',
	"gruppe, hendelse, utfall",
);

const backendSelector = '{app="syfo-oppfolgingsplan-backend"}';
export const backendCount = (metric: string, range = "$__range") =>
	`sum(increase(syfo_oppfolgingsplan_backend_${metric}_total${backendSelector}[${range}]))`;
export const backendMetrics = [
	["oppfolgingsplan", "Planer opprettet"],
	["oppfolgingsplan_shared_with_gp", "Delt med fastlege"],
	["oppfolgingsplan_shared_with_nav", "Delt med Nav"],
	["paaminnelse_bestilt", "Bestillingsoperasjoner"],
	["paaminnelse_avbestilt", "Avbestillingsoperasjoner"],
	["unntaksvurdering", "Valgt «plan trengs ikke»"],
	["unntaksvurdering_soft_deleted", "Valget fjernet"],
] as const;

const query = (
	expr: string,
	group: "loki" | "prometheus",
	legend: string,
	range = false,
) => ({
	kind: "PanelQuery",
	spec: {
		refId: legend,
		hidden: false,
		query: {
			kind: "DataQuery",
			group,
			version: "v0",
			datasource: {
				name: group === "loki" ? LOKI_DATASOURCE_UID : grafanaVariable("env"),
			},
			spec:
				group === "loki"
					? {
							expr,
							editorMode: "code",
							queryType: range ? "range" : "instant",
							legendFormat: legend,
						}
					: {
							expr,
							editorMode: "code",
							instant: !range,
							range,
							exemplar: false,
							legendFormat: legend,
						},
		},
	},
});

type Query = ReturnType<typeof query>;
const panel = (
	id: number,
	title: string,
	description: string,
	queries: Query[],
	type: "stat" | "timeseries" | "table" | "text",
	content?: string,
) => ({
	kind: "Panel",
	spec: {
		id,
		title,
		description,
		links: [],
		data: {
			kind: "QueryGroup",
			spec: {
				queries,
				queryOptions: {},
				transformations:
					type === "table"
						? [
								{
									kind: "Transformation",
									group: "organize",
									spec: {
										options: {
											excludeByName: { Time: true },
											renameByName: {
												gruppe: "Tildelt gruppe",
												variant: "Levert variant",
												hendelse: "Hendelse",
												paaminnelsevalg: "Påminnelsesvalg",
												utfall: "Utfall",
												Value: "Hendelser",
												[`Value #${queries[0]?.spec.refId}`]: "Hendelser",
											},
										},
									},
								},
							]
						: [],
			},
		},
		vizConfig: {
			kind: "VizConfig",
			group: type,
			version: GRAFANA_VERSION,
			spec: {
				fieldConfig: {
					defaults: {
						noValue: "Ingen måledata",
						unit: type === "timeseries" ? "short" : "locale",
						decimals: 0,
						color: { mode: "palette-classic" },
						...(type === "table" ? { custom: { filterable: true } } : {}),
						...(type === "timeseries"
							? {
									custom: {
										drawStyle: "line",
										lineWidth: 2,
										fillOpacity: 8,
										showPoints: "never",
										spanNulls: false,
										axisLabel: "Hendelser per rullerende døgn",
									},
								}
							: {}),
					},
					overrides:
						type === "timeseries"
							? [
									{
										matcher: { id: "byRegexp", options: "^tiltak" },
										properties: [
											{
												id: "color",
												value: { mode: "fixed", fixedColor: "blue" },
											},
										],
									},
									{
										matcher: { id: "byRegexp", options: "^kontroll" },
										properties: [
											{
												id: "color",
												value: { mode: "fixed", fixedColor: "orange" },
											},
										],
									},
								]
							: [],
				},
				options:
					type === "text"
						? { mode: "markdown", content }
						: type === "stat"
							? {
									colorMode: "none",
									graphMode: "none",
									textMode: "auto",
									reduceOptions: {
										calcs: ["lastNotNull"],
										fields: "",
										values: false,
									},
									orientation: "auto",
								}
							: type === "table"
								? {
										showHeader: true,
										cellHeight: "sm",
										footer: { show: false },
									}
								: {
										legend: {
											displayMode: "list",
											placement: "bottom",
											showLegend: true,
										},
										tooltip: { mode: "multi", sort: "desc" },
									},
			},
		},
	},
});

const textPanel = (id: number, title: string, content: string) =>
	panel(id, title, content, [], "text", content);
const backendDescription =
	"Hele valgt miljø, ikke bare AID eller pilotområdet. Hendelser/vellykkede API-operasjoner, ikke unike personer. Ingen gruppe- eller påminnelsesvalgsegmentering. Increase er et estimat mellom scrape-tidspunkter.";
const browserDescription =
	"Påminnelsen i Dine sykmeldte, tiltakspakke 1. Browserhendelser, ikke personer eller hele pilotpopulasjonen. Tildelt gruppe vises separat fra levert variant. Ingen treff er ikke dokumentasjon på null bruk. Ukjent tildeling kan skyldes feil, toggle av eller manglende vurdering.";

export const buildAidDashboard = (): GrafanaDashboardResource => {
	const elements: Record<string, ReturnType<typeof panel>> = {
		"panel-1": textPanel(
			1,
			"AID · levering og bruk",
			`**Tiltakspakke 1 · produkttelemetri, ikke effektanalyse.** Hendelser, ikke personer. Ingen måling av sykefraværets lengde eller grad.

**To datagrunnlag:** Backendtallene under gjelder hele valgt miljø. Gruppe, faktisk visning og påminnelsesvalg finnes foreløpig bare i den nye Dine sykmeldte-målingen. Browserpaneler uten data er **ikke** null bruk. [Definisjoner og dekning](https://navikt.github.io/team-esyfo/aid/dashboard).`,
		),
		"panel-14": textPanel(
			14,
			"01 · Levering av påminnelsen · Dine sykmeldte",
			`**Tildeling ≠ visning.** Beslutninger teller én avklart vurdering per åpning/kontekst. «Vist» krever at kortet kommer inn i skjermbildet. Kontroll og utenfor scope får ikke tilbudet; manglende vurdering er ukjent, aldri kontroll.

Målingen samles først etter at instrumenteringen er rullet ut. Den dekker ikke alle arbeidsgivere, øvrige AID-elementer eller tidligere besøk.`,
		),
		"panel-15": panel(
			15,
			"Tildelt gruppe → levert variant",
			browserDescription,
			[query(aidDecisionsQuery, "loki", "Beslutninger")],
			"table",
		),
		"panel-16": panel(
			16,
			"Faktiske visninger · påminnelsesvalg",
			`${browserDescription} Ikke bestilt betyr tilgjengelig tilbud uten aktiv bestilling, ikke et aktivt nei.`,
			[query(aidViewsQuery, "loki", "Visninger")],
			"table",
		),
		"panel-17": panel(
			17,
			"02 · Bestilling og avbestilling · forsøk og bekreftelse",
			`${browserDescription} Valget er status FØR handlingen. Bekreftet betyr gyldig svar med forventet status; det betyr ikke at påminnelsen er sendt. Ingen automatisk retry.`,
			[query(aidActionsQuery, "loki", "Handlinger")],
			"table",
		),
		"panel-18": panel(
			18,
			"Visninger over tid · rullerende døgn",
			browserDescription,
			[
				query(
					aidCount('| hendelse="vist"', "gruppe", "1d"),
					"loki",
					"{{gruppe}}",
					true,
				),
			],
			"timeseries",
		),
		"panel-19": textPanel(
			19,
			"03 · Oppfølgingsplan og valg · hele miljøet",
			`Disse eksisterende backendtellerne er bevart. De kan **ikke** filtreres på tildelt gruppe eller påminnelsesvalg ennå. Trinnene er ikke én brukertrakt: deling kan gjelde en plan opprettet før valgt tidsrom. Nav-løsningen og LPS må ikke antas å ha samme dekning.`,
		),
		"panel-6": panel(
			6,
			"Planaktivitet · rullerende døgn",
			backendDescription,
			backendMetrics
				.slice(0, 3)
				.map(([metric, title]) =>
					query(backendCount(metric, "1d"), "prometheus", title, true),
				),
			"timeseries",
		),
		"panel-11": panel(
			11,
			"Påminnelsesoperasjoner · rullerende døgn",
			backendDescription,
			backendMetrics
				.slice(3, 5)
				.map(([metric, title]) =>
					query(backendCount(metric, "1d"), "prometheus", title, true),
				),
			"timeseries",
		),
		"panel-12": panel(
			12,
			"Behovsvurderinger · rullerende døgn",
			backendDescription,
			backendMetrics
				.slice(5)
				.map(([metric, title]) =>
					query(backendCount(metric, "1d"), "prometheus", title, true),
				),
			"timeseries",
		),
		"panel-20": panel(
			20,
			"04 · Leveringsgap og mislykkede handlinger",
			browserDescription,
			[query(aidFailuresQuery, "loki", "Gap og feil")],
			"table",
		),
		"panel-13": textPanel(
			13,
			"Definisjoner og neste måletrinn",
			`- **Påminnelsesvalg:** bestilt / ikke bestilt / ikke tilbudt / ukjent. Ikke tilbudt er ikke et nei. Status ved handling er ikke historikken til en person.
- **Ingen konverteringsprosent:** visninger og handlinger er hendelser uten personkobling. Flere besøk, nettleserblokkering og operasjoner fra andre flater gjør at tallene ikke er én kohort.
- **Neste:** øvrige AID-flater, planhandlinger med autoritativ gruppekontekst, evalueringspåminnelse og bekreftet utsending. Ingen ekstra Flaggskipet-kall bare for telemetri.
- **Teknisk feilsøking:** [NAIS APM](https://grafana.nav.cloud.nais.io/a/nais-apm-app/services) · [Feiloversikt](https://grafana.nav.cloud.nais.io/d/team-esyfo-feiloversikt).
- Sammenligningene beskriver produktbruk, ikke isolert effekt av påminnelse eller effekt på sykefravær.`,
		),
	};
	const ids = [2, 3, 4, 5, 8, 9, 10];
	backendMetrics.forEach(([metric, title], i) => {
		elements[`panel-${ids[i]}`] = panel(
			ids[i],
			title,
			backendDescription,
			[query(backendCount(metric), "prometheus", title)],
			"stat",
		);
	});
	return {
		apiVersion: "dashboard.grafana.app/v2",
		kind: "Dashboard",
		metadata: {
			name: AID_DASHBOARD_UID,
			annotations: { "grafana.app/folder": TEAM_ESYFO_DASHBOARD_FOLDER_UID },
		},
		spec: {
			title: "AID – Tiltakspakke 1: levering og bruk",
			description:
				"Produktbruk og leveringsdekning. Hendelser, ikke personer. Ingen sykefraværs- eller kausal effektanalyse.",
			editable: true,
			annotations: [],
			cursorSync: "Off",
			elements,
			layout: {
				kind: "GridLayout",
				spec: {
					items: [
						layoutItem("panel-1", 0, 0, 24, 4),
						layoutItem("panel-14", 0, 4, 24, 4),
						layoutItem("panel-15", 0, 8, 12, 8),
						layoutItem("panel-16", 12, 8, 12, 8),
						layoutItem("panel-17", 0, 16, 12, 9),
						layoutItem("panel-18", 12, 16, 12, 9),
						layoutItem("panel-19", 0, 25, 24, 3),
						layoutItem("panel-2", 0, 28, 6, 4),
						layoutItem("panel-3", 6, 28, 6, 4),
						layoutItem("panel-4", 12, 28, 6, 4),
						layoutItem("panel-5", 18, 28, 6, 4),
						layoutItem("panel-8", 0, 32, 8, 4),
						layoutItem("panel-9", 8, 32, 8, 4),
						layoutItem("panel-10", 16, 32, 8, 4),
						layoutItem("panel-6", 0, 36, 24, 8),
						layoutItem("panel-11", 0, 44, 12, 7),
						layoutItem("panel-12", 12, 44, 12, 7),
						layoutItem("panel-20", 0, 51, 24, 7),
						layoutItem("panel-13", 0, 58, 24, 7),
					],
				},
			},
			links: [],
			liveNow: false,
			preload: false,
			tags: ["team-esyfo", "aid", "produktbruk", "managed-as-code"],
			timeSettings: {
				autoRefresh: "5m",
				autoRefreshIntervals: ["1m", "5m", "15m", "1h"],
				fiscalYearStartMonth: 0,
				from: "now-7d",
				to: "now",
				hideTimepicker: false,
				timezone: "browser",
			},
			variables: [
				{
					kind: "DatasourceVariable",
					spec: {
						name: "env",
						label: "Miljø",
						description:
							"Gjelder alle paneler. Backend bruker valgt miljødatakilde; browser bruker app_environment.",
						pluginId: "prometheus",
						refresh: "onDashboardLoad",
						regex: "/^(prod-gcp|dev-gcp)$/",
						current: { text: "prod-gcp", value: "000000021" },
						options: [],
						multi: false,
						includeAll: false,
						hide: "dontHide",
						skipUrlSync: false,
						allowCustomValue: false,
					},
				},
			],
		},
	};
};

export const serializeAidDashboard = () =>
	`${JSON.stringify(buildAidDashboard(), null, 2)}\n`;
