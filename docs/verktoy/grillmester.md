# Grillmester og nav-pilot

Grillmester gir felles agentroller og skills for avklaring, design,
implementering og review. Nav-pilot velger og starter agentpakken. Teamets
repoer beholder egne instruksjoner, domenekilder og arbeidsflyter.

Kilder: [Grillmester](https://github.com/navikt/grillmester) og
[nav-pilot](https://github.com/navikt/copilot). Følg den gjeldende
[installasjonsveiledningen](https://github.com/navikt/grillmester/blob/main/docs/installation.md)
for en publisert pakke som er kompatibel med klienten. Denne siden fastsetter
ikke en release eller et lokalt installasjonsoppsett.

## Velg inngang

- **Grillmester** avklarer uklare mål og valg, samler designbeslutninger og
  koordinerer implementering og verifikasjon.
- **Barista** passer for tydelig avgrenset repoarbeid med avklart retning.
- **Designer** utforsker brukerflyt og visuelle konsepter med Aksel og
  tilgjengelig Figma-støtte. Rollen leverer design, ikke produktkode.
- **Doctor Who** hjelper med produktarbeid, mål, prioritering og workshops.
  Bruk den lokale `team-kontekst`-skillen for Team eSyfos faktiske kilder.

Kokk, Grill-inspektør og Researcher brukes internt av agentteamet. Velg roller
og skills fra klientens aktive oversikt; ikke gjett prefiks eller importer
runtime-ID-er fra gamle repo-filer.

## Hva eies hvor

Grillmester distribueres som en **Tier 2-agentpakke**: klienten starter en
ferdig plugin-payload. Agentpakken synkroniserer ikke agenter, skills,
instruksjoner eller templates inn i hvert apprepo.

Repoene eier build-/testkommandoer, domenebegreper, risikoregler,
path-instruksjoner og issue-/PR-maler. I fellesrepoet beholder vi de lokale
skillsene `team-kontekst` og `doc-new-area`. Felles metode skal vedlikeholdes i
Grillmester, mens fakta om teamet og appene vedlikeholdes i sine repoer.

## Grilling og større avklaringer

Grillmester skal undersøke fakta og utfordre uklare antakelser fra start.
Dokumentert grilling passer når en samtale skal avklare begreper og varige
valg. Wayfinder organiserer flere avhengige, uløste spørsmål når en enkel
checkpoint ikke holder oversikten på tvers av økter; den bruker grilling,
research eller prototyper innenfor hvert spørsmål.

Metodevalg er agentens ansvar. Brukeren avklarer reelle produkt- og designvalg;
en spec eller oppdeling i implementeringsissues lages når det er ønsket og
nyttig, uten en automatisk kjede av dokumenter.

## Ved manglende eller feil skill

Kontroller aktiv pakkeversjon, full/fokusert profil og skillens synlige kilde.
Repo- eller brukerkopier med samme ID kan skygge for pluginen. Bruk `doctor`
hvis den finnes i den aktive oversikten, og ta vare på den eksakte feilen.
Gamle synkede komponenter skal fjernes med gjennomgang av lokale tilpasninger;
ikke start en ny filsynk for å reparere oppsettet.
