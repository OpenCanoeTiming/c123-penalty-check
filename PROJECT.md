# C123-PENALTY-CHECK - Projektový záměr

Webová aplikace s vysoce optimalizovaným UX pro kontrolu a korekci penalizací slalomových závodů měřených v systému Canoe123.

## Motivace

Reimplementace stávajícího C123 terminálu. Důvody:

- **Ergonomie pro celodenní práci** - na závodech se s aplikací pracuje mnoho hodin v kuse
- **Přehlednost** - původní terminál je malý a nepřehledný, zvlášť při únavě
- **Čitelnost** - dostatečná velikost písma a prvků, jasné vizuální odlišení stavů
- **Snížení chybovosti** - zřetelná indikace aktivní buňky, potvrzení akcí
- **Komfort obsluhy** - minimalizace klikání, efektivní klávesové zkratky

---

## Architektura

Aplikace běží jako **čistě frontendové řešení** (React + TypeScript) a komunikuje s **c123-server** jako backendem:

```
c123-penalty-check (tento projekt)
    │
    ├─► WebSocket ws://server:27123/ws  (čtení real-time dat)
    │     - OnCourse, Results, RaceConfig, Schedule
    │
    └─► REST API http://server:27123/api/c123/*  (zápis)
          - POST /api/c123/scoring
          - POST /api/c123/remove-from-course
          - POST /api/c123/timing
```

**Proč c123-server?**
- Browser nemůže komunikovat přímo s C123 (TCP:27333)
- c123-server již má implementované Write API pro odesílání penalizací
- Sdílená infrastruktura se scoreboardem

**Reference:** Připojení analogicky k `c123-scoreboard` - viz `../c123-scoreboard/src/types/c123server.ts`

---

## Hlavní požadavky

### Zobrazení dat

- Zobrazení probíhajících závodů podle stavu (Schedule), indikace aktivního závodu
- Grid jezdců s vyznačením: kdo pojede, kdo jede, kdo má dojeto, stav penalizací
- Aktualizace podle nastavení závodu a trati (RaceConfig - rozlišení typů branek N/R)

### Editace penalizací

- Efektivní "inline" editace v tabulce penalizací
- Navigace pomocí šipek, ovládání přes klávesnici
- Zadávání bez zbytečného klikání
- Penalizace odpovídají typu závodu (0 = čistě, 2 = dotek, 50 = nejetí)
- Velmi přehledná navigace - vždy vidím jakého jezdce a jakou branku edituji
- **Odesílání:** REST API `POST /api/c123/scoring`

### Kontrola penalizací

- Označování zkontrolovaných protokolů
- Možnost seskupování podle branek:
  - Kontrolor dostává papírový protokol jen za několik branek
  - Výchozí skupiny podle segmentů nastavení C123 trati
  - Možnost předefinovat v aplikaci
  - Podpora překrývajících se segmentů (např. rozhodčí 1: brány 1-4, rozhodčí 2: brány 5-8, pomocný: brány 4-6)

### Persistence

- Nastavení v localStorage
- Adresa serveru, vybraný závod, konfigurace skupin branek

---

## Komunikace s c123-server

### WebSocket - čtení dat

| Zpráva | Obsah | Použití |
|--------|-------|---------|
| `OnCourse` | Závodníci na trati, penalizace per branka | Hlavní data pro grid |
| `Results` | Výsledky kategorie | Historická data, kontrola |
| `RaceConfig` | nrGates, gateConfig (N/R) | Konfigurace gridu |
| `Schedule` | Seznam závodů, raceStatus | Přepínání kategorií |

### REST API - zápis

```typescript
// Penalizace
POST /api/c123/scoring
{ "bib": "10", "gate": 5, "value": 2 }

// Status závodníka (DNS/DNF/CAP)
POST /api/c123/remove-from-course
{ "bib": "10", "reason": "DNS" }

// Manuální časový impuls
POST /api/c123/timing
{ "bib": "10", "channelPosition": "Start" }
```

---

## Zdroje a dokumenty

### Pro implementaci

| Zdroj | Účel |
|-------|------|
| `../c123-server/docs/REST-API.md` | REST API dokumentace |
| `../c123-server/docs/C123-PROTOCOL.md` | WebSocket protokol |
| `../c123-scoreboard/src/types/c123server.ts` | TypeScript typy (lze zkopírovat/adaptovat) |
| `../timing-design-system/` | UI komponenty a tokeny |

### Pro business logiku

| Zdroj | Účel |
|-------|------|
| `./resources-private/` | Původní implementace (READONLY, nezmiňovat v kódu) |
| `../c123-protocol-docs/c123-xml-format.md` | Formát penalizací (Gates field) |

---

## Technologie

- **React** + TypeScript
- **Vite** jako build tool
- **@opencanoetiming/timing-design-system** pro UI
- **localStorage** pro persistence
- **WebSocket** pro real-time data
- **fetch** pro REST API

---

## Odlišnosti od scoreboardu

| Aspekt | c123-scoreboard | c123-penalty-check |
|--------|-----------------|--------------|
| Účel | Zobrazení výsledků | Zadávání penalizací |
| Směr dat | Pouze čtení | Čtení + zápis |
| Interakce | Pasivní | Aktivní (editace) |
| API | Pouze WebSocket | WebSocket + REST |
| Hlavní data | Results, OnCourse | OnCourse (penalizace per gate) |
