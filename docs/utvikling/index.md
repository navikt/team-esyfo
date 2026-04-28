# Utvikling

Teamets teknologivalg og konvensjoner for frontend, backend og samarbeid. Her finner du oversikt over stacken vi bruker og hvordan vi jobber med kode.

## Seksjoner

<div class="sections-grid">

### 🖥️ [Frontend](./frontend/)

Next.js og Astro-baserte microfrontends hostet på NAIS. Biome for linting/formatering og Vitest for testing.

### ⚙️ [Backend](./backend/)

Kotlin-applikasjoner med Ktor og Spring Boot, deployed til NAIS-plattformen.

### 📋 [Beste praksis](./beste-praksis/pull-request)

Pull request-rutiner, GitHub Flow og konvensjoner for kodesamarbeid i teamet.

</div>

<style>
.sections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}
.sections-grid h3 {
  margin-top: 0;
}
.sections-grid h3 a {
  text-decoration: none;
}
</style>
