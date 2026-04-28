import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

// withMermaid registrerer <Mermaid>-komponenten automatisk via en Vite-transform.
// IKKE importer/registrer Mermaid manuelt i theme/index.ts — det gir hvit side.
export default withMermaid(
	defineConfig({
		title: "Team eSyfo",
		description: "Dokumentasjon for Team eSyfo",
		lang: "nb",
		appearance: "dark",
		base: "/team-esyfo/",
		lastUpdated: true,
		srcExclude: ["README.md"],
		mermaid: {},
		themeConfig: {
			nav: [
				{ text: "Kom i gang", link: "/" },
				{ text: "Utvikling", link: "/utvikling/" },
				{ text: "Domene", link: "/domene" },
				{ text: "Systemlandskap", link: "/systemlandskap" },
				{
					text: "GitHub",
					link: "https://github.com/navikt/team-esyfo",
					target: "_blank",
					rel: "noopener noreferrer",
				},
			],
			search: {
				provider: "local",
				options: {
					detailedView: true,
					translations: {
						button: {
							buttonText: "Søk",
							buttonAriaLabel: "Søk",
						},
						modal: {
							displayDetails: "Vis detaljert liste",
							resetButtonTitle: "Nullstill søk",
							backButtonTitle: "Lukk søk",
							noResultsText: "Ingen resultater for",
							footer: {
								selectText: "velg",
								navigateText: "naviger",
								closeText: "lukk",
							},
						},
					},
				},
			},
			editLink: {
				pattern: "https://github.com/navikt/team-esyfo/edit/main/docs/:path",
				text: "Rediger denne siden på GitHub",
			},
			sidebar: [
				{
					text: "Wiki",
					items: [{ text: "Hjem", link: "/" }],
				},
				{
					text: "Kom i gang",
					items: [{ text: "Onboarding", link: "/kom-i-gang" }],
				},
				{
					text: "Domene",
					items: [{ text: "Domenebeskrivelser", link: "/domene" }],
				},
				{
					text: "Systemlandskap",
					items: [
						{ text: "Teknisk oversikt", link: "/systemlandskap" },
						{ text: "Nærmeste leder", link: "/arkitektur/narmesteleder" },
					],
				},
				{
					text: "Utvikling",
					collapsed: false,
					items: [
						{ text: "Oversikt", link: "/utvikling/" },
						{
							text: "Frontend",
							collapsed: false,
							items: [
								{ text: "Oversikt", link: "/utvikling/frontend/" },
								{
									text: "Bygg og kjør",
									link: "/utvikling/frontend/bygg-og-kjor",
								},
								{ text: "Testing", link: "/utvikling/frontend/testing" },
								{ text: "Linting", link: "/utvikling/frontend/linting" },
								{ text: "Verktøy", link: "/utvikling/frontend/verktoy" },
							],
						},
						{
							text: "Backend",
							collapsed: false,
							items: [
								{ text: "Oversikt", link: "/utvikling/backend/" },
								{
									text: "API-testing (Bruno)",
									link: "/utvikling/backend/#api-testing-med-bruno",
								},
							],
						},
						{ text: "Repositories", link: "/utvikling/repositories" },
						{
							text: "Beste praksis",
							collapsed: false,
							items: [
								{
									text: "Pull requests",
									link: "/utvikling/beste-praksis/pull-request",
								},
							],
						},
					],
				},
			],
			socialLinks: [
				{ icon: "github", link: "https://github.com/navikt/team-esyfo" },
			],
			lastUpdated: {
				text: "Sist oppdatert",
				formatOptions: {
					dateStyle: "long",
					timeStyle: "short",
					forceLocale: true,
				},
			},
			outline: {
				label: "På denne siden",
			},
			docFooter: {
				prev: "Forrige side",
				next: "Neste side",
			},
			footer: {
				message: "Laget av Team eSyfo ❤️",
			},
		},
	}),
);
