# Claude Code Instructions - C123 Scoring

## Projekt

C123 Scoring - webová aplikace pro kontrolu, korekci a zadávání penalizací slalomových závodů měřených v Canoe123.

**GitHub:** OpenCanoeTiming/c123-scoring | **Licence:** MIT

---

## Architektura

```
┌─────────────────────────────────────────────────────────────┐
│                    c123-scoring (FE)                        │
│                      React + TypeScript                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
   WebSocket /ws                    REST API
   (real-time data)              (scoring commands)
          │                               │
          └───────────────┬───────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   c123-server :27123                        │
│                      (Node.js)                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼ TCP :27333
┌─────────────────────────────────────────────────────────────┐
│                       Canoe123                              │
└─────────────────────────────────────────────────────────────┘
```

**Klíčový princip:** c123-scoring komunikuje výhradně s c123-server, nikdy přímo s C123.

---

## Cesty a dokumentace

| Účel | Cesta |
|------|-------|
| **Tento projekt** | `/workspace/timing/c123-scoring/` |
| **Projektový záměr** | `./PROJECT.md` |
| **C123 Server** | `../c123-server/` |
| **Design system** | `../timing-design-system/` |
| **Scoreboard (reference)** | `../c123-scoreboard/` |
| **Protokol docs** | `../c123-protocol-docs/` |

### Klíčové reference v c123-server

- **`../c123-server/docs/REST-API.md`** - REST API včetně Write API
- **`../c123-server/docs/C123-PROTOCOL.md`** - WebSocket protokol, typy zpráv
- **`../c123-server/PLAN.md`** - Write API specifikace (Bloky G, H, I)

### Klíčové reference v c123-scoreboard

- **`../c123-scoreboard/src/types/c123server.ts`** - TypeScript typy pro WebSocket zprávy
- **`../c123-scoreboard/src/App.tsx`** - Příklad WebSocket připojení

### Privátní zdroje

- **`./resources-private/`** - Původní business logika (READONLY, nezmiňovat v kódu)

---

## Komunikace s c123-server

### WebSocket (čtení dat)

Připojení: `ws://<server>:27123/ws`

**Relevantní zprávy pro scoring:**
| Typ | Obsah | Použití |
|-----|-------|---------|
| `OnCourse` | Závodníci na trati + penalizace | Hlavní data pro grid |
| `Results` | Výsledky kategorie | Historická data |
| `RaceConfig` | Počet branek, typy (N/R) | Konfigurace gridu |
| `Schedule` | Seznam závodů + status | Přepínání kategorií |

### REST API (zápis)

**Scoring endpoint:**
```
POST /api/c123/scoring
{ "bib": "10", "gate": 5, "value": 2 }
```

**Remove from course:**
```
POST /api/c123/remove-from-course
{ "bib": "10", "reason": "DNS" }
```

**Timing (manuální impuls):**
```
POST /api/c123/timing
{ "bib": "10", "channelPosition": "Start" }
```

---

## Jazyk

- Komunikace a dokumentace: **čeština**
- Kód, komentáře, commit messages: **angličtina**

---

## Struktura projektu (plánovaná)

```
c123-scoring/
├── src/
│   ├── index.tsx             # Entry point
│   ├── App.tsx               # Hlavní komponenta
│   ├── components/           # UI komponenty
│   │   ├── RaceSelector/     # Výběr závodu
│   │   ├── PenaltyGrid/      # Grid penalizací
│   │   └── ConnectionStatus/ # Stav připojení
│   ├── hooks/                # React hooks
│   │   ├── useWebSocket.ts   # WebSocket připojení
│   │   └── useScoring.ts     # Scoring API volání
│   ├── services/             # API komunikace
│   │   └── scoringApi.ts     # REST API client
│   ├── store/                # State management
│   └── types/                # TypeScript typy
│       └── c123server.ts     # Kopie/adaptace z scoreboardu
├── resources-private/        # Zdrojové materiály (NENÍ v gitu)
└── package.json
```

---

## Klíčové funkce

1. **Připojení k serveru** - WebSocket k c123-server, analogicky jako c123-scoreboard
2. **Zobrazení závodů** - probíhající závody podle Schedule, indikace aktivních
3. **Grid jezdců** - kdo pojede, kdo jede, kdo má dojeto, stav penalizací
4. **Inline editace** - klávesnicové ovládání, navigace šipkami
5. **Odesílání penalizací** - REST API POST /api/c123/scoring
6. **Seskupování branek** - podle segmentů nebo vlastní skupiny
7. **Kontrola penalizací** - označování zkontrolovaných protokolů
8. **Persistence** - nastavení v localStorage

---

## Design system

Striktně využívat `@opencanoe/timing-design-system`:
- Základní komponenty z design systému
- Specifické komponenty (PenaltyGrid) stylovat podle tokenů
- Chybějící komponenty → vytvořit podnět pro rozšíření DS

```bash
npm install @opencanoe/timing-design-system
```

---

## Vývoj

```bash
# Instalace
npm install

# Dev server
npm run dev

# Build
npm run build
```

**Testování s c123-server:**
```bash
# V jiném terminálu spustit c123-server
cd ../c123-server && npm start

# Scoring app se připojí na ws://localhost:27123/ws
```

---

## Proces

Vždy, zejména u dodatečných požadavků a změn:
1. Nejprve aktualizovat dokumentaci jako plán a záměr
2. Doplnit kroky do plánu
3. Realizovat po blocích (cca 70% kontextu)
4. Commit nejpozději po každém bloku
5. Nedělat víc než jeden blok před clear/compact

Pokud se zjistí odchylka nebo větší problém:
- Aktualizovat plán o nové sekce a kroky
- Skončit a nechat práci na čerstvé instance

Psát deníček vývoje - co šlo, co nešlo, co se zkusilo.

---

## Commit message formát

```
feat: add penalty grid with keyboard navigation
fix: correct gate grouping logic
refactor: extract WebSocket logic to hook
```

---

*Projektový záměr → viz `./PROJECT.md`*
