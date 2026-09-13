# Teamarbeid og tavla

Team eSyfo arbeider med ekstern sykefraværsoppfølging i Nav. Wikien beskriver
fag, apper og praksis. [GitHub Projects-tavla](https://github.com/orgs/navikt/projects/157)
er kilden for oppgaver, mål, prioritering og status.

## Planlegging og mål

Teamet planlegger ukentlig innenfor tertialer. Ukas prioriteringer vises på
tavla, mens `Tertial` knytter arbeidet til planperioden. `Måleparameter` inneholder
tertialets mål og key results som valg i tavla. Drift og forvaltning er en del
av prioriteringen og markeres blant annet med `BAU`.

Felter, visninger og valg kan endres. Les gjeldende verdier fra tavla fremfor
å kopiere felt-ID-er, opsjons-ID-er eller målformuleringer inn i dokumentasjon.
Rapportkadensen er ikke fastsatt på denne siden.

| Visning | Formål |
| --- | --- |
| Mine oppgaver | Arbeidsliste filtrert på ansvarlig |
| Alle oppgaver | Backlog på tvers av repoer |
| Ukas prioriteringer | Arbeidet teamet prioriterer denne uka |
| Tertialvisningene | Arbeid gruppert per tertial |
| Til vurdering | Ufordelte eller uavklarte oppgaver |
| Done | Ferdig arbeid |
| AID-oppgaver | Tidslinje for AID-oppdraget |

| Felt | Betydning |
| --- | --- |
| Status | Arbeidsflyt, blant annet Backlog, Monday epics, Plukk meg, Jeg jobbes med og Done |
| Priority / Size | Prioritet og grovt størrelsesestimat |
| Tertial / Måleparameter | Planperiode og tilhørende mål |
| Tags | Blant annet BAU, Bug, Dataretting, Etterlevelse og AID |
| Start date / End date / Estimate | Tidsplanlegging |
| Parent issue / Sub-issues progress | Sammenheng mellom epic og deloppgaver |

## Oppgaver og AID

Issue-malene i repoet deklarerer prosjektkoblingen `navikt/157`. Epic samler
større oppgaver; Story, Task, Feature og Bug beskriver leveranser, teknisk
arbeid, funksjonalitet og feil. Parent/Sub-issues viser oppgavehierarkiet.

AID-arbeid samles i AID-visningen og merkes `AID`. Oversikten er wikien sammen
med tavla, uten en egen topp-epic. Begrepsmodellen er
**tiltakspakke → dulte-tiltak (nudgelab) → funksjonelle endringer → issues**.
«Tiltak» viser til nudgelabs dulte-tiltak; teamets nivå heter «funksjonelle
endringer». [Endringsoversikten](../aid/endringer.md) lenker til tilhørende
oppgaver. [AID-sidene](../aid/index.md) beskriver oppdraget, målingen og
forsøksdesignet; utrullingsstatus finnes der og i appenes konfigurasjon.

## Fagkilder

- [Repooversikten](./repositories.md) viser appene teamet eier.
- [Områdene](../omrader/index.md) beskriver brukerreisene; områdenes tekniske
  undersider utdyper systemer, dataflyt og integrasjoner.
- [Ordboka](../ordbok.md) forklarer domenebegreper og akronymer.
- [Kom i gang](../kom-i-gang.md) beskriver tilganger og onboarding.
