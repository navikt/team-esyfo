export type Phase = "early" | "mid" | "late" | "continuous";

export interface Area {
	id: string;
	name: string;
	emoji: string;
	phase: Phase;
	description: string;
	path: string;
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
	},
	{
		id: "kartleggingssporsmal",
		name: "Kartleggingsspørsmål",
		emoji: "📋",
		phase: "early",
		description:
			"Spørsmål til den sykmeldte tidlig i forløpet. Gir Nav og arbeidsgiver bedre grunnlag for oppfølging.",
		path: "/omrader/kartleggingssporsmal/",
	},
	{
		id: "dine-sykmeldte",
		name: "Dine sykmeldte",
		emoji: "👥",
		phase: "continuous",
		description:
			"Arbeidsgivers oversikt over sykmeldte ansatte. En app som brukes gjennom hele sykefraværsforløpet.",
		path: "/omrader/dine-sykmeldte/",
	},
	{
		id: "narmeste-leder",
		name: "Nærmeste leder",
		emoji: "🤝",
		phase: "continuous",
		description:
			"Relasjonshåndtering mellom sykmeldt og nærmeste leder. Sikrer riktig kobling mellom partene.",
		path: "/omrader/narmeste-leder/",
	},
	{
		id: "motebehov",
		name: "Møtebehov / Dialogmøte",
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
		phase: "mid",
		description:
			"Plan for oppfølging mellom arbeidsgiver og arbeidstaker. Dokumenterer tiltak og mål for tilbakeføring til arbeid.",
		path: "/omrader/oppfolgingsplan/",
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
		id: "delt-infrastruktur",
		name: "Delt infrastruktur",
		emoji: "🔧",
		phase: "continuous",
		description:
			"Felles tjenester og infrastruktur som brukes på tvers av områdene. Tidligere kalt «crossdomain».",
		path: "/omrader/delt-infrastruktur/",
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
