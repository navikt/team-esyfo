import { aidPlanDecisionsQuery } from "./aid-plan-queries.ts";
import {
	aidPlanEvaluationDetailsQuery,
	aidProductEvaluationQuery,
	aidProductPlanCreationsQuery,
	aidProductPlanTrendQuery,
	aidProductPlanViewsQuery,
} from "./aid-product-queries.ts";
import {
	aidCount,
	aidDecisionsQuery,
	aidFailuresQuery,
} from "./aid-reminder-queries.ts";
import {
	GRAFANA_VERSION,
	type GrafanaDashboardResource,
	LOKI_DATASOURCE_UID,
	layoutItem,
	TEAM_ESYFO_DASHBOARD_FOLDER_UID,
} from "./dashboard-kit.ts";

export const AID_DASHBOARD_UID = "aufd2lm";

// Only the two experiment arms belong in the product view.
// Reminder offers are shown separately: their choices cannot filter plans.
export const aidReminderViewsQuery = aidCount(
	'| gruppe="tiltak" | variant="aid" | hendelse="vist" | utfall="tilgjengelig"',
	"gruppe",
);
export const aidReminderOrdersQuery = aidCount(
	'| gruppe="tiltak" | variant="aid" | hendelse="bestill" | utfall="bekreftet"',
	"gruppe",
);
export const aidReminderCancellationsQuery = aidCount(
	'| gruppe="tiltak" | variant="aid" | hendelse="avbestill" | utfall="bekreftet"',
	"gruppe",
);
export const aidReminderAvailabilityQuery = aidCount(
	'| gruppe="tiltak" | hendelse="beslutning"',
	"utfall",
);
const query = (expr: string, group: "loki", legend: string, range = false) => ({
	kind: "PanelQuery",
	spec: {
		refId: legend,
		hidden: false,
		query: {
			kind: "DataQuery",
			group,
			version: "v0",
			datasource: {
				name: LOKI_DATASOURCE_UID,
			},
			spec: {
				expr: expr.replaceAll(`\${env:text}`, `\${environment:raw}`),
				editorMode: "code",
				queryType: range ? "range" : "instant",
				legendFormat: legend,
			},
		},
	},
});

type Query = ReturnType<typeof query>;

const groupColors = [
	["tiltak", "blue", "Tiltaksgruppen"],
	["kontroll", "orange", "Kontrollgruppen"],
] as const;

const evaluationChoiceOverride = {
	matcher: { id: "byName", options: "Påminnelse om evaluering" },
	properties: [
		{
			id: "mappings",
			value: [
				{
					type: "value",
					options: {
						ja: { text: "Med påminnelse" },
						nei: { text: "Uten påminnelse" },
						ikke_tilbudt: { text: "Valget ble ikke tilbudt" },
						ikke_registrert: { text: "Ikke registrert" },
						ugyldig: { text: "Ugyldig verdi" },
					},
				},
			],
		},
	],
};

const valueLabels = (name: string, labels: Record<string, string>) => ({
	matcher: { id: "byName", options: name },
	properties: [
		{
			id: "mappings",
			value: [
				{
					type: "value",
					options: Object.fromEntries(
						Object.entries(labels).map(([value, text]) => [value, { text }]),
					),
				},
			],
		},
	],
});
const tableLabels = [
	valueLabels("Gruppe", {
		tiltak: "Tiltaksgruppen",
		kontroll: "Kontrollgruppen",
		utenfor_scope: "Utenfor forsøket",
		ukjent: "Gruppe mangler",
		blandet: "Flere ulike grupper",
	}),
	valueLabels("Skjema", { tiltak: "Nytt skjema", standard: "Vanlig skjema" }),
	valueLabels("Tilbud", { aid: "Tilgjengelig", skjult: "Ikke tilgjengelig" }),
	valueLabels("Resultat", {
		tilgjengelig: "Tilgjengelig",
		skjult: "Ikke tilgjengelig",
		vurdering_mangler: "Gruppe mangler",
		status_feilet: "Status kunne ikke hentes",
		forsok: "Forsøk",
		bekreftet: "Bekreftet",
		feilet: "Mangler bekreftelse",
		ikke_bekreftet: "Uventet svar",
	}),
	valueLabels("Hendelse", {
		beslutning: "Tilgjengelighet vurdert",
		vist: "Vist",
		bestill: "Bestilling",
		avbestill: "Avbestilling",
		opprett: "Opprettelse",
	}),
	valueLabels("Bestilling ved visning", {
		bestilt: "Aktiv bestilling",
		ikke_bestilt: "Ingen aktiv bestilling",
		ikke_tilbudt: "Ikke tilbudt",
		ukjent: "Ukjent",
	}),
];

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
												gruppe: "Gruppe",
												variant: "Tilbud",
												skjemavariant: "Skjema",
												hendelse: "Hendelse",
												paaminnelsevalg: "Bestilling ved visning",
												evaluering_paaminnelse: "Påminnelse om evaluering",
												utfall: "Resultat",
												Value: "Registreringer",
												[`Value #${queries[0]?.spec.refId}`]: "Registreringer",
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
						noValue: "Ingen registreringer",
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
										axisLabel: "Registreringer siste 24 timer",
									},
								}
							: {}),
					},
					overrides:
						type === "timeseries"
							? [
									...groupColors.map(([group, color, name]) => ({
										matcher: { id: "byRegexp", options: `/^${group}/` },
										properties: [
											{ id: "displayName", value: name },
											{
												id: "color",
												value: { mode: "fixed", fixedColor: color },
											},
										],
									})),
									{
										matcher: { id: "byRegexp", options: "/^kontroll/" },
										properties: [
											{
												id: "custom.lineStyle",
												value: { fill: "dash", dash: [6, 3] },
											},
										],
									},
								]
							: type === "table"
								? [evaluationChoiceOverride, ...tableLabels]
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

const grid = (items: ReturnType<typeof layoutItem>[]) => ({
	kind: "GridLayout",
	spec: { items },
});
const row = (
	title: string,
	items: ReturnType<typeof layoutItem>[],
	collapse = false,
	variables: (typeof planGroupVariable)[] = [],
) => ({
	kind: "RowsLayoutRow",
	spec: {
		title,
		collapse,
		hideHeader: !title,
		layout: grid(items),
		...(variables.length ? { variables } : {}),
	},
});
const planGroupVariable = {
	kind: "CustomVariable",
	spec: {
		name: "plan_group",
		label: "Vis planer for",
		description:
			"Gjelder bare denne delen. Begge forsøksgrupper vises som standard.",
		query:
			"Begge grupper : tiltak|kontroll,Tiltaksgruppen : tiltak,Kontrollgruppen : kontroll",
		current: { text: "Begge grupper", value: "tiltak|kontroll" },
		options: [],
		multi: false,
		includeAll: false,
		hide: "dontHide",
		skipUrlSync: false,
		allowCustomValue: false,
		valuesFormat: "csv",
	},
};

const planDescription =
	"Registrerte opprettelser gjennom planskjemaet. Nye planversjoner teller også; dette er ikke unike personer eller første planer. Måles etter vellykket svar fra lagringen, og kan undertelle ved tap av svar eller logg. Tiltaksgruppen inkluderer også dem som fikk vanlig skjema.";
const reminderDescription =
	"Tiltaksgruppen i Dine sykmeldte. Registrerte handlinger, ikke unike personer. Tallene er separate hendelser, ikke trinn i en brukertrakt.";

export const buildAidDashboard = () => {
	const elements = {
		"panel-1": panel(
			1,
			"",
			"",
			[],
			"text",
			"Registrerte handlinger i forsøket, ikke effekt. **Nye planversjoner teller også.** Tomt betyr ingen registreringer, ikke dokumentert null bruk. Målingen dekker planskjemaet og påminnelsestilbudet – ikke hele tiltakspakken.",
		),
		"panel-28": panel(
			28,
			"Planopprettelser · også nye versjoner",
			planDescription,
			[query(aidProductPlanCreationsQuery, "loki", "Opprettelser")],
			"table",
		),
		"panel-29": panel(
			29,
			"Planopprettelser over tid · siste 24 timer ved hvert tidspunkt",
			planDescription +
				" Punktene viser overlappende 24-timersvinduer, ikke kalenderdager. Ikke summer punktene. Volumforskjeller mellom gruppene dokumenterer ikke effekt.",
			[query(aidProductPlanTrendQuery, "loki", "{{gruppe}}", true)],
			"timeseries",
		),
		"panel-23": panel(
			23,
			"Hvilket skjema blir vist?",
			"Registrerte visninger av planskjemaet i valgt gruppe. Nytt skjema er tiltaksskjemaet; vanlig skjema er standardopplevelsen. Tiltaksgruppen kan få vanlig skjema. En visning betyr at skjemabeholderen kom inn i skjermbildet, ikke at alt innhold ble lest.",
			[query(aidProductPlanViewsQuery, "loki", "Visninger")],
			"table",
		),
		"panel-30": panel(
			30,
			"Med eller uten påminnelse om evaluering",
			"Valget ved registrert planopprettelse i tiltaksgruppen med nytt skjema. Vanlig skjema og kontrollgruppen inngår ikke: de får ikke valget. Uten påminnelse kan være et urørt valg eller et tidligere lagret valg, ikke et aktivt avslag. Teller også nye planversjoner. Bekrefter ikke utsendt påminnelse eller utført evaluering.",
			[query(aidProductEvaluationQuery, "loki", "Opprettelser")],
			"table",
		),
		"panel-31": panel(
			31,
			"Tilbudet vist",
			reminderDescription +
				" Kortet har kommet inn i skjermbildet. Det betyr ikke at det er lest.",
			[query(aidReminderViewsQuery, "loki", "Visninger")],
			"stat",
		),
		"panel-32": panel(
			32,
			"Påminnelse bestilt",
			reminderDescription +
				" Vellykkede bestillinger. Ikke antall aktive bestillinger eller sendte påminnelser.",
			[query(aidReminderOrdersQuery, "loki", "Bestillinger")],
			"stat",
		),
		"panel-33": panel(
			33,
			"Påminnelse avbestilt",
			reminderDescription +
				" Vellykkede avbestillinger. Ikke antall personer som har ombestemt seg.",
			[query(aidReminderCancellationsQuery, "loki", "Avbestillinger")],
			"stat",
		),
		"panel-15": panel(
			15,
			"Er påminnelsestilbudet tilgjengelig?",
			"Vurderinger i tiltaksgruppen. Tilgjengelig betyr at tilbudet kan vises, ikke at det er sett. Ikke tilgjengelig kan være forventet, for eksempel når påminnelsen ikke lenger er aktuell; årsaken fremgår ikke av denne målingen. Ingen vurderinger er ikke bevis på feilfri levering.",
			[query(aidReminderAvailabilityQuery, "loki", "Vurderinger")],
			"table",
		),
		"panel-34": panel(
			34,
			"Påminnelsestilbud · alle grupper",
			"Kontroll av tilgjengelighet, inkludert utenfor forsøket og manglende gruppetilhørighet. Ikke en telling av personer eller arbeidsgivere. Utenfor forsøket er ikke kontrollgruppen.",
			[query(aidDecisionsQuery, "loki", "Vurderinger")],
			"table",
		),
		"panel-22": panel(
			22,
			"Planskjema tilgjengeliggjort · alle grupper",
			"Tildelt gruppe og skjema ved åpning, ikke bekreftet visning. Bruk denne kontrollen for å undersøke manglende gruppe eller uventet skjema. Utenfor forsøket inngår ikke i produktanalysen.",
			[query(aidPlanDecisionsQuery, "loki", "Vurderinger")],
			"table",
		),
		"panel-24": panel(
			24,
			"Innsendinger · forsøk og svar til nettleseren",
			"Kontroll av innsendinger og manglende eller ugyldige evalueringsvalg i alle grupper. Vanlig skjema tilbyr ikke valget. Forsøk og resultater er separate hendelser og må ikke summeres. Manglende bekreftelse betyr ikke nødvendigvis at planen ikke ble lagret. Ikke summer med planopprettelsene øverst.",
			[query(aidPlanEvaluationDetailsQuery, "loki", "Innsendinger")],
			"table",
		),
		"panel-20": panel(
			20,
			"Påminnelser · problemer ved visning og handling",
			"Registrerte problemer i alle grupper. Ingen registreringer er ikke bevis på at alt virker. Bruk feiloversikten for videre feilsøking.",
			[query(aidFailuresQuery, "loki", "Problemer")],
			"table",
		),
	};
	return {
		apiVersion: "dashboard.grafana.app/v2",
		kind: "Dashboard",
		metadata: {
			name: AID_DASHBOARD_UID,
			annotations: { "grafana.app/folder": TEAM_ESYFO_DASHBOARD_FOLDER_UID },
		},
		spec: {
			title: "AID · Bruk av tiltakspakke 1",
			description:
				"Planopprettelser, påminnelsesvalg og levering i forsøket. Registrerte handlinger, ikke effekt.",
			editable: true,
			annotations: [],
			cursorSync: "Off",
			elements,
			layout: {
				kind: "RowsLayout",
				spec: {
					rows: [
						row("", [layoutItem("panel-1", 0, 0, 24, 2)]),
						row(
							"Planer · tiltak og kontroll",
							[
								layoutItem("panel-28", 0, 0, 8, 7),
								layoutItem("panel-29", 8, 0, 16, 7),
								layoutItem("panel-23", 0, 7, 24, 4),
							],
							false,
							[planGroupVariable],
						),
						row(
							"Påminnelse om å evaluere planen · tiltaksgruppen med nytt skjema",
							[layoutItem("panel-30", 0, 0, 24, 4)],
						),
						row("Påminnelse om å lage plan · tiltaksgruppen", [
							layoutItem("panel-31", 0, 0, 8, 4),
							layoutItem("panel-32", 8, 0, 8, 4),
							layoutItem("panel-33", 16, 0, 8, 4),
							layoutItem("panel-15", 0, 4, 24, 5),
						]),
						row(
							"Kontroll av målingen · alle grupper",
							[
								layoutItem("panel-34", 0, 0, 12, 6),
								layoutItem("panel-22", 12, 0, 12, 6),
								layoutItem("panel-24", 0, 6, 24, 10),
								layoutItem("panel-20", 0, 16, 24, 5),
							],
							true,
						),
					],
				},
			},
			links: [
				{
					title: "Om tallene",
					tooltip: "",
					type: "link",
					url: "https://navikt.github.io/team-esyfo/aid/dashboard",
					targetBlank: true,
					icon: "info",
					tags: [],
					asDropdown: false,
					includeVars: false,
					keepTime: false,
				},
				{
					title: "Feiloversikt",
					tooltip: "",
					type: "link",
					url: "https://grafana.nav.cloud.nais.io/d/team-esyfo-feiloversikt",
					targetBlank: true,
					icon: "external link",
					tags: [],
					asDropdown: false,
					includeVars: false,
					keepTime: true,
				},
			],
			liveNow: false,
			preload: false,
			tags: ["team-esyfo", "aid", "produktbruk", "managed-as-code"],
			timeSettings: {
				autoRefresh: "15m",
				autoRefreshIntervals: ["5m", "15m", "1h"],
				fiscalYearStartMonth: 0,
				from: "now-7d",
				to: "now",
				hideTimepicker: false,
				timezone: "browser",
			},
			variables: [
				{
					kind: "CustomVariable",
					spec: {
						name: "environment",
						label: "Miljø",
						description: "Gjelder hele dashboardet.",
						query: "Produksjon : prod-gcp,Test : dev-gcp",
						current: { text: "Produksjon", value: "prod-gcp" },
						options: [],
						multi: false,
						includeAll: false,
						hide: "dontHide",
						skipUrlSync: false,
						allowCustomValue: false,
						valuesFormat: "csv",
					},
				},
			],
		},
	} satisfies GrafanaDashboardResource;
};
export const serializeAidDashboard = () =>
	`${JSON.stringify(buildAidDashboard(), null, 2)}\n`;
