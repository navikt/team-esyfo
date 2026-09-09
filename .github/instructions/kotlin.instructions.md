---
description: "Kotlin notebook boundaries for team-esyfo"
applyTo: "notebooks/**/*.{kts,ipynb}"
---

# Kotlin notebooks

Kotlin analysis lives under `notebooks/`; `notebooks/build.gradle.kts` and
`notebooks/settings.gradle.kts` define its dependencies. The notebook build is
`.github/workflows/build-notebooks.yaml` (`./gradlew build --no-daemon` from
`notebooks/`). This repository does not own a Spring or Ktor service.
Keep examples and notebook outputs free of personal data and credentials.
Do not introduce database migrations or service-runtime conventions into
analysis notebooks merely because application repositories use them.
