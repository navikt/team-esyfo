import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Team eSyfo',
  description: 'Dokumentasjon for Team eSyfo',
  lang: 'no',
  appearance: 'dark',
  base: '/team-esyfo/',
  lastUpdated: true,
  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/navikt/team-esyfo' }
    ]
  }
})
