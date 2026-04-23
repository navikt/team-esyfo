import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// withMermaid registrerer <Mermaid>-komponenten automatisk via en Vite-transform.
// IKKE importer/registrer Mermaid manuelt i theme/index.ts — det gir hvit side.
export default withMermaid(defineConfig({
  title: 'Team eSyfo',
  description: 'Dokumentasjon for Team eSyfo',
  lang: 'nb',
  appearance: 'dark',
  base: '/team-esyfo/',
  lastUpdated: true,
  mermaid: {},
  themeConfig: {
    nav: [
      { text: 'Wiki', link: '/' },
      { text: 'Verktøy', link: '/verktoy' },
      {
        text: 'GitHub',
        link: 'https://github.com/navikt/team-esyfo',
        target: '_blank',
        rel: 'noopener noreferrer'
      }
    ],
    search: {
      provider: 'local',
      options: {
        detailedView: true,
        translations: {
          button: {
            buttonText: 'Søk',
            buttonAriaLabel: 'Søk'
          },
          modal: {
            displayDetails: 'Vis detaljert liste',
            resetButtonTitle: 'Nullstill søk',
            backButtonTitle: 'Lukk søk',
            noResultsText: 'Ingen resultater for',
            footer: {
              selectText: 'velg',
              navigateText: 'naviger',
              closeText: 'lukk'
            }
          }
        }
      }
    },
    editLink: {
      pattern: 'https://github.com/navikt/team-esyfo/edit/main/docs/:path',
      text: 'Rediger denne siden på GitHub'
    },
    sidebar: [
      {
        text: 'Wiki',
        items: [
          { text: 'Hjem', link: '/' }
        ]
      },
      {
        text: 'Kom i gang',
        items: [
          { text: 'Onboarding', link: '/kom-i-gang' }
        ]
      },
      {
        text: 'Domene',
        items: [
          { text: 'Domenebeskrivelser', link: '/domene' }
        ]
      },
      {
        text: 'Systemlandskap',
        items: [
          { text: 'Teknisk oversikt', link: '/systemlandskap' }
        ]
      },
      {
        text: 'Verktøy',
        items: [
          { text: 'API-testing og verktøy', link: '/verktoy' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/navikt/team-esyfo' }
    ],
    lastUpdated: {
      text: 'Sist oppdatert',
      formatOptions: {
        dateStyle: 'long',
        timeStyle: 'short',
        forceLocale: true
      }
    },
    outline: {
      label: 'På denne siden'
    },
    docFooter: {
      prev: 'Forrige side',
      next: 'Neste side'
    },
    footer: {
      message: 'Laget av Team eSyfo ❤️'
    }
  }
}))
