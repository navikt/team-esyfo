import { aidPlanDecisionsQuery } from "./aid-plan-queries.ts";
import {
	aidPlanEvaluationDetailsQuery,
	aidProductEvaluationQuery,
	aidProductPlanCreationsQuery,
	aidProductPlanTrendQuery,
	aidProductPlanViewsQuery,
} from "./aid-product-queries.ts";
import { aidCount, aidFailuresQuery } from "./aid-reminder-queries.ts";
import {
	aidUnntakOpenedQuery,
	aidUnntakPlanQuery,
	aidUnntakSendQuery,
} from "./aid-unntak-queries.ts";
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
export const aidReminderAvailabilityByGroupQuery = aidCount(
	'| hendelse="beslutning"',
	"gruppe, utfall",
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
				expr: expr.replaceAll(`\${env:text}`, "prod-gcp"),
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
const barCategories = {
	gruppe: groupColors,
	evaluering_paaminnelse: [
		["ja", "blue", "Påminnelse valgt"],
		["nei", "gray", "Påminnelse ikke valgt"],
	],
} as const;
const seriesOverrides = (
	series: readonly (readonly [string, string, string])[],
) =>
	series.map(([value, color, name]) => ({
		matcher: { id: "byRegexp", options: `/^${value}(?:$|\\s|\\{)/` },
		properties: [
			{ id: "displayName", value: name },
			{ id: "color", value: { mode: "fixed", fixedColor: color } },
		],
	}));

const evaluationChoiceOverride = {
	matcher: { id: "byName", options: "Påminnelse om evaluering" },
	properties: [
		{
			id: "mappings",
			value: [
				{
					type: "value",
					options: {
						ja: { text: "Påminnelse valgt" },
						nei: { text: "Påminnelse ikke valgt" },
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
	valueLabels("Oppfølgingsplan", {
		tiltak: "Med AID-tilpasninger",
		standard: "Uten AID-tilpasninger",
	}),
	valueLabels("Tilbud", { aid: "Tilgjengelig", skjult: "Ikke tilgjengelig" }),
	valueLabels("Resultat", {
		tilgjengelig: "Tilgjengelig",
		skjult: "Ikke tilgjengelig",
		vurdering_mangler: "Vurdering mangler",
		status_feilet: "Status kunne ikke hentes",
		forsok: "Forsøk",
		bekreftet: "Vellykket svar",
		feilet: "Feil eller manglende svar",
		ikke_bekreftet: "Uventet svar",
	}),
	valueLabels("Hendelse", {
		beslutning: "Tilgjengelighet vurdert",
		vist: "Vist",
		bestill: "Slå på påminnelse",
		avbestill: "Slå av påminnelse",
		opprett: "Ferdigstilling",
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
	type: "stat" | "timeseries" | "table" | "bargauge",
	barCategory: keyof typeof barCategories = "gruppe",
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
					type === "bargauge"
						? [
								{
									kind: "Transformation",
									group: "rowsToFields",
									spec: {
										options: {
											mappings: [
												{ fieldName: barCategory, handlerKey: "field.name" },
												{
													fieldName: `Value #${queries[0]?.spec.refId}`,
													handlerKey: "field.value",
												},
												{ fieldName: "Time", handlerKey: "__ignore" },
											],
										},
									},
								},
							]
						: type === "table"
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
													skjemavariant: "Oppfølgingsplan",
													hendelse: "Hendelse",
													paaminnelsevalg: "Bestilling ved visning",
													evaluering_paaminnelse: "Påminnelse om evaluering",
													utfall: "Resultat",
													Value: id === 24 ? "Hendelser" : "Registreringer",
													[`Value #${queries[0]?.spec.refId}`]:
														id === 24 ? "Hendelser" : "Registreringer",
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
						...(type === "bargauge"
							? {
									min: 0,
									fieldMinMax: false,
									displayName: `\${__field.name}`,
								}
							: {}),
						...(type === "table" ? { custom: { filterable: true } } : {}),
						...(type === "timeseries"
							? {
									custom: {
										drawStyle: "line",
										lineWidth: 2,
										fillOpacity: 8,
										showPoints: "never",
										spanNulls: false,
										axisLabel: "Ferdigstillinger per rullerende døgn",
									},
								}
							: {}),
					},
					overrides:
						type === "timeseries"
							? [
									...seriesOverrides(groupColors),
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
							: type === "bargauge"
								? seriesOverrides(barCategories[barCategory])
								: type === "table"
									? [evaluationChoiceOverride, ...tableLabels]
									: [],
				},
				options:
					type === "bargauge"
						? {
								displayMode: "basic",
								orientation: "horizontal",
								valueMode: "text",
								namePlacement: "left",
								showUnfilled: false,
								sizing: "manual",
								minVizHeight: 32,
								maxVizHeight: 64,
								minVizWidth: 8,
								text: { titleSize: 16, valueSize: 24 },
								reduceOptions: {
									calcs: ["lastNotNull"],
									fields: "",
									values: false,
								},
								legend: {
									displayMode: "list",
									placement: "bottom",
									showLegend: false,
								},
							}
						: type === "stat"
							? {
									colorMode: "none",
									graphMode: "none",
									textMode: "auto",
									text: { valueSize: 32 },
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
) => ({
	kind: "RowsLayoutRow",
	spec: {
		title,
		collapse,
		hideHeader: !title,
		layout: grid(items),
	},
});

const planDescription =
	"Antall ferdigstillinger i valgt tidsrom. Oppdaterte planer som ferdigstilles på nytt, teller også; dette er ikke antall unike planer eller personer. Måles etter vellykket svar fra lagringen, og kan undertelle ved tap av svar eller logg. Tiltaksgruppen inkluderer også dem som fikk oppfølgingsplanen uten AID-tilpasninger. Målingen startet 9. september 2026 kl. 09.28 i produksjon.";
const reminderDescription =
	"Tiltaksgruppen i Dine sykmeldte. Registrerte handlinger, ikke unike personer. Tallene er separate hendelser, ikke trinn i en brukertrakt.";
const unntakDescription =
	"Tiltaksgruppen med unntaksvalget tilgjengelig på arbeidsgivers oversikt. Registrerte åpninger og handlinger, ikke unike personer. Handlinger gjelder samme besøk som åpningen. Gjentatte klikk teller; send og lag plan kan forekomme i samme besøk. Tallene er ikke en konverteringstrakt. Måles først etter utrulling av instrumenteringen; ingen registreringer er ikke dokumentert null bruk.";

export const buildAidDashboard = () => {
	const elements = {
		"panel-35": panel(
			35,
			"Åpnet unntaksteksten",
			unntakDescription +
				" Kortet ble åpnet, én gang per besøk. Det betyr ikke at teksten er lest.",
			[query(aidUnntakOpenedQuery, "loki", "Åpninger")],
			"stat",
		),
		"panel-36": panel(
			36,
			"Trykket «Send» etter åpning",
			unntakDescription +
				" Aktivering av «Send til Nav og den ansatte», også med tastatur. Telles før validering og svar fra lagringen, ikke som bekreftet registrering.",
			[query(aidUnntakSendQuery, "loki", "Send")],
			"stat",
		),
		"panel-37": panel(
			37,
			"Trykket «Lag plan» etter åpning",
			unntakDescription +
				" Aktivering av lenken til utfyllingssiden etter at unntaksteksten har vært åpnet, også hvis kortet senere ble lukket. Det betyr ikke ferdigstilt plan.",
			[query(aidUnntakPlanQuery, "loki", "Lag plan")],
			"stat",
		),
		"panel-28": panel(
			28,
			"Ferdigstilte oppfølgingsplaner",
			planDescription,
			[query(aidProductPlanCreationsQuery, "loki", "{{gruppe}}")],
			"bargauge",
		),
		"panel-29": panel(
			29,
			"Ferdigstilte oppfølgingsplaner · rullerende døgn",
			planDescription +
				" Punktene viser overlappende 24-timersvinduer, ikke kalenderdager. Ikke summer punktene. Volumforskjeller mellom gruppene dokumenterer ikke effekt.",
			[query(aidProductPlanTrendQuery, "loki", "{{gruppe}}", true)],
			"timeseries",
		),
		"panel-23": panel(
			23,
			"Visninger av utfyllingssiden",
			"Visninger av siden der oppfølgingsplanen fylles ut, fordelt på forsøksgruppe og AID-tilpasninger. Tiltaksgruppen kan også få siden uten AID-tilpasninger. En visning betyr at utfyllingsområdet kom inn i skjermbildet, ikke at innholdet ble lest eller planen ferdigstilt.",
			[query(aidProductPlanViewsQuery, "loki", "Visninger")],
			"table",
		),
		"panel-30": panel(
			30,
			"Ferdigstilte planer med og uten evalueringspåminnelse",
			"Valgt ja eller nei til e-post tre dager før avtalt evalueringsmøte. Teller ferdigstillinger i tiltaksgruppen der valget tilbys, ikke personer. Oppdaterte planer som ferdigstilles på nytt, teller også. Planer uten AID-tilpasninger og kontrollgruppen inngår ikke: de får ikke valget. Bekrefter ikke utsendt påminnelse eller utført evaluering.",
			[query(aidProductEvaluationQuery, "loki", "{{evaluering_paaminnelse}}")],
			"bargauge",
			"evaluering_paaminnelse",
		),
		"panel-31": panel(
			31,
			"Tilbud om påminnelse vist",
			reminderDescription +
				" Kortet har kommet inn i skjermbildet. Det betyr ikke at det er lest.",
			[query(aidReminderViewsQuery, "loki", "Visninger")],
			"stat",
		),
		"panel-32": panel(
			32,
			"Påminnelse slått på",
			reminderDescription +
				" Vellykkede bestillinger. Ikke antall aktive bestillinger eller sendte påminnelser.",
			[query(aidReminderOrdersQuery, "loki", "Bestillinger")],
			"stat",
		),
		"panel-33": panel(
			33,
			"Påminnelse slått av",
			reminderDescription +
				" Vellykkede avbestillinger. Ikke antall personer som har ombestemt seg.",
			[query(aidReminderCancellationsQuery, "loki", "Avbestillinger")],
			"stat",
		),
		"panel-15": panel(
			15,
			"Kunne tilbudet om påminnelse vises?",
			"Vurderinger i tiltaksgruppen. Tilgjengelig betyr at tilbudet kan vises, ikke at det er sett. Ikke tilgjengelig kan være forventet, for eksempel når påminnelsen ikke lenger er aktuell; årsaken fremgår ikke av denne målingen. Ingen vurderinger er ikke bevis på feilfri levering.",
			[query(aidReminderAvailabilityQuery, "loki", "Vurderinger")],
			"table",
		),
		"panel-34": panel(
			34,
			"Påminnelse før fireukersfristen – tilgjengelighet per gruppe",
			"Kontroll av tilgjengelighet, inkludert utenfor forsøket og manglende gruppetilhørighet. Ikke en telling av personer eller arbeidsgivere. Utenfor forsøket er ikke kontrollgruppen.",
			[query(aidReminderAvailabilityByGroupQuery, "loki", "Vurderinger")],
			"table",
		),
		"panel-22": panel(
			22,
			"Oppfølgingsplan – hvilken løsning ble åpnet?",
			"Tildelt gruppe og AID-tilpasninger ved åpning, ikke bekreftet visning. Bruk denne kontrollen for å undersøke manglende gruppe eller uventet utforming av oppfølgingsplanen. Utenfor forsøket inngår ikke i produktanalysen.",
			[query(aidPlanDecisionsQuery, "loki", "Vurderinger")],
			"table",
		),
		"panel-24": panel(
			24,
			"Ferdigstilling – forsøk og svar i nettleseren",
			"Kontroll av ferdigstilling og manglende eller ugyldige evalueringsvalg i alle grupper. Oppfølgingsplanen uten AID-tilpasninger tilbyr ikke valget. Forsøk og resultater er separate hendelser og må ikke summeres. Feil eller manglende svar i nettleseren betyr ikke nødvendigvis at planen ikke ble lagret. Ikke summer med ferdigstillingene øverst.",
			[query(aidPlanEvaluationDetailsQuery, "loki", "Hendelser")],
			"table",
		),
		"panel-20": panel(
			20,
			"Påminnelse før fireukersfristen – registrerte problemer",
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
				"Produksjon: ferdigstilte oppfølgingsplaner, påminnelsesvalg og levering i forsøket. Registrerte handlinger, ikke effekt.",
			editable: true,
			annotations: [],
			cursorSync: "Off",
			elements,
			layout: {
				kind: "RowsLayout",
				spec: {
					rows: [
						row("Oppfølgingsplaner i forsøket", [
							layoutItem("panel-28", 0, 0, 8, 7),
							layoutItem("panel-29", 8, 0, 16, 7),
							layoutItem("panel-23", 0, 7, 24, 4),
						]),
						row("Valg av evalueringspåminnelse · tiltaksgruppen", [
							layoutItem("panel-30", 0, 0, 24, 5),
						]),
						row(
							"Påminnelse før fireukersfristen · Dine sykmeldte · tiltaksgruppen",
							[
								layoutItem("panel-31", 0, 0, 8, 4),
								layoutItem("panel-32", 8, 0, 8, 4),
								layoutItem("panel-33", 16, 0, 8, 4),
								layoutItem("panel-15", 0, 4, 24, 5),
							],
						),
						row("Unntaksvurdering · tiltaksgruppen", [
							layoutItem("panel-35", 0, 0, 8, 4),
							layoutItem("panel-36", 8, 0, 8, 4),
							layoutItem("panel-37", 16, 0, 8, 4),
						]),
						row(
							"Teknisk kontroll · produksjon · alle grupper",
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
			variables: [],
		},
	} satisfies GrafanaDashboardResource;
};
export const serializeAidDashboard = () =>
	`${JSON.stringify(buildAidDashboard(), null, 2)}\n`;
