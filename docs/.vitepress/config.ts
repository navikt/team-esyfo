import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Team eSyfo',
  description: 'Dokumentasjon for Team eSyfo',
  lang: 'nb',
  appearance: 'dark',
  base: '/team-esyfo/',
  lastUpdated: true,
  mermaid: true,
  themeConfig: {
    search: {
      provider: 'local'
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
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/navikt/team-esyfo' }
    ],
    footer: {
      message: 'Laget av Team eSyfo ❤️'
    }
  }
})
