export type Phase = "early" | "mid" | "late" | "continuous";

export interface Area {
	id: string;
	name: string;
	emoji: string;
	phase: Phase;
	description: string;
	path: string;
	subpages?: { text: string; link: string }[];
	dependencies?: {
		system: string;
		direction: "inn" | "ut" | "begge";
		description: string;
	}[];
}

export const areas: Area[] = [
	{
		id: "aktivitetskrav",
		name: "Aktivitetskrav",
		emoji: "⏱️",
		phase: "early",
		description:
			"Tidlig krav om aktivitet ved sykmelding. Sikrer at den sykmeldte vurderer aktivitet så tidlig som mulig i forløpet.",
		path: "/omrader/aktivitetskrav/",
		subpages: [{ text: "Teknisk", link: "/omrader/aktivitetskrav/teknisk" }],
		dependencies: [
			{
				system: "isaktivitetskrav (team iSyfo)",
				direction: "inn",
				description: "Produserer vurderinger og forhåndsvarsler via Kafka",
			},
			{
				system: "Min side (team navno)",
				direction: "ut",
				description: "Microfrontend viser status for aktivitetskrav",
			},
			{
				system: "syfomodiaperson (team iSyfo)",
				direction: "ut",
				description: "Veileder ser status for aktivitetskrav",
			},
		],
	},
	{
		id: "kartleggingssporsmal",
		name: "Kartleggingsspørsmål",
		emoji: "📋",
		phase: "early",
		description:
			"Spørsmål til den sykmeldte tidlig i forløpet. Gir Nav og arbeidsgiver bedre grunnlag for oppfølging.",
		path: "/omrader/kartleggingssporsmal/",
		subpages: [
			{ text: "Teknisk", link: "/omrader/kartleggingssporsmal/teknisk" },
		],
		dependencies: [
			{
				system: "ismeroppfolging (team iSyfo)",
				direction: "inn",
				description: "Produserer kandidat-hendelser via Kafka",
			},
			{
				system: "Min side (team navno)",
				direction: "ut",
				description: "Microfrontend vises i Min side",
			},
			{
				system: "syfomodiaperson (team iSyfo)",
				direction: "ut",
				description: "Veileder ser kartleggingssvar",
			},
		],
	},
	{
		id: "dine-sykmeldte",
		name: "Dine sykmeldte",
		emoji: "👥",
		phase: "continuous",
		description:
			"Arbeidsgivers oversikt over sykmeldte ansatte. En app som brukes gjennom hele sykefraværsforløpet.",
		path: "/omrader/dine-sykmeldte/",
		subpages: [{ text: "Teknisk", link: "/omrader/dine-sykmeldte/teknisk" }],
		dependencies: [
			{
				system: "dinesykmeldte-backend",
				direction: "inn",
				description:
					"Leverer oversikt, sykmeldinger, søknader og aktivitetsvarsler til frontend",
			},
			{
				system: "dinesykmeldte-sidemeny",
				direction: "inn",
				description:
					"Gir felles sidemeny og layout på detaljsidene for sykmeldt",
			},
			{
				system: "syfo-oppfolgingsplan-frontend",
				direction: "ut",
				description:
					"Arbeidsgiver kan gå videre til oppfølgingsplan fra sideoversikten",
			},
			{
				system: "dialogmote-frontend",
				direction: "ut",
				description:
					"Arbeidsgiver kan gå videre til dialogmøter fra sideoversikten",
			},
		],
	},
	{
		id: "narmeste-leder",
		name: "Nærmesteleder",
		emoji: "🤝",
		phase: "continuous",
		description:
			"Relasjonshåndtering mellom sykmeldt og nærmesteleder. Sikrer riktig kobling mellom partene.",
		path: "/omrader/narmeste-leder/",
		subpages: [{ text: "Teknisk", link: "/omrader/narmeste-leder/teknisk" }],
	},
	{
		id: "motebehov",
		name: "Møtebehov",
		emoji: "📅",
		phase: "mid",
		description:
			"Vurdering av behov for dialogmøte mellom partene. Brukes når det er tid for å avklare videre oppfølging.",
		path: "/omrader/motebehov/",
	},

	{
		id: "oppfolgingsplan",
		name: "Oppfølgingsplan",
		emoji: "📝",
		phase: "early",
		description:
			"Plan for oppfølging mellom arbeidsgiver og arbeidstaker. Dokumenterer tiltak og mål for tilbakeføring til arbeid.",
		path: "/omrader/oppfolgingsplan/",
		subpages: [
			{ text: "Dataanalyse", link: "/omrader/oppfolgingsplan/dataanalyse" },
			{ text: "Teknisk", link: "/omrader/oppfolgingsplan/teknisk" },
		],
		dependencies: [
			{
				system: "dinesykmeldte",
				direction: "inn",
				description:
					"Arbeidsgiver starter oppfølgingsplan fra oversikten over sykmeldte ansatte",
			},
			{
				system: "Dokumentporten",
				direction: "ut",
				description: "Arkiverer delte planer og returnerer journalpostId",
			},
			{
				system: "IsDialogmelding",
				direction: "ut",
				description: "Sender planen til fastlege som PDF",
			},
			{
				system: "Aareg",
				direction: "inn",
				description:
					"Leverer stillingstittel og stillingsprosent når planen opprettes",
			},
		],
	},
	{
		id: "mer-oppfolging",
		name: "Mer oppfølging",
		emoji: "🔔",
		phase: "late",
		description:
			"Oppfølging i sen fase når sykepengene nærmer seg slutt. Hjelper den sykmeldte med videre valg.",
		path: "/omrader/mer-oppfolging/",
	},
	{
		id: "fellestjenester",
		name: "Fellestjenester",
		emoji: "🔧",
		phase: "continuous",
		description:
			"Felles tjenester og infrastruktur som brukes på tvers av områdene. Tidligere kalt «crossdomain».",
		path: "/omrader/fellestjenester/",
	},
];

export const phaseLabels: Record<Phase, string> = {
	early: "Tidlig fase",
	mid: "Midtveis",
	late: "Sen fase",
	continuous: "Gjennomgående",
};

export const phaseColors: Record<Phase, string> = {
	early: "green",
	mid: "yellow",
	late: "orange",
	continuous: "blue",
};

export const phaseDescriptions: Record<Phase, string> = {
	early:
		"Fokus på tidlig aktivitet og kartlegging. Arbeidsgiver og Nav samler grunnlag for videre oppfølging.",
	mid: "Dialog og avklaring. Partene vurderer behov for dialogmøte og avklarer videre oppfølging.",
	late: "Sykepengene nærmer seg slutt. Den sykmeldte trenger informasjon om videre valg og rettigheter.",
	continuous:
		"Dine sykmeldte, nærmesteleder og fellestjenester er aktive gjennom hele forløpet og støtter de andre områdene.",
};

export const phaseWeeks: Record<Phase, { start: number; end: number }> = {
	early: { start: 0, end: 8 },
	mid: { start: 8, end: 26 },
	late: { start: 26, end: 52 },
	continuous: { start: 0, end: 52 },
};

/**
 * Ekstra tidslinjepunkter som vises i Timeline-komponenten,
 * men som IKKE er egne fagområder (skal ikke i sidebar/områdeliste).
 */
export interface TimelineExtra {
	id: string;
	name: string;
	emoji: string;
	phase: Phase;
	path: string;
}

export const timelineExtras: TimelineExtra[] = [
	{
		id: "dialogmote-2",
		name: "Dialogmøte 2",
		emoji: "🤝",
		phase: "mid",
		path: "/omrader/motebehov/",
	},
];
