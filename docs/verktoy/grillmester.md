# Grillmester og nav-pilot

Nav-pilot starter Grillmester-pakken med felles agentroller og skills. Følg
[installasjonsveiledningen](https://github.com/navikt/grillmester/blob/main/docs/installation.md)
for gjeldende pakke og klient. Velg roller og korte skill-ID-er fra klientens
aktive oversikt.

Grillmester hjelper med avklaringer og gjennomføring, Barista med avgrenset
repoarbeid, Designer med design og Doctor Who med produkt- og teamarbeid.
Grillmester velger dokumentert grilling for sammenhengende avklaringer og
Wayfinder når avhengige spørsmål trenger et varig kart på tvers av økter.

## Et lite lokalt oppsett

Hvert repo beholder en kort `.github/copilot-instructions.md` med egne
kommandoer og fallgruver. `AGENTS.md` peker på den samme fila. Felles metode og
agentroller ligger i pakken; det er ingen filsynk, egen oppsettskontroll eller
påkrevd branch-sjekk for agentoppsettet.

I teamrepoet finnes to lokale skills: `team-kontekst` finner tavle- og fagkilder,
og `doc-new-area` registrerer nye wikiområder. Vanlig teamkunnskap ligger i
wikien, blant annet [Teamarbeid og tavla](../utvikling/teamarbeid.md).

Ved en manglende skill: kontroller aktiv pakke/profil og skillens synlige kilde.
En lokal kopi med samme ID kan skygge for pakken. Fjern gamle kopier etter å
ha vurdert lokale tilpasninger, og last klientens katalog på nytt.
