# Claude Code Instructions - C123 Scoring

## Projekt

C123 Scoring - webová aplikace pro kontrolu, korekci a zadávání penalizací slalomových závodů měřených v Canoe123.

**GitHub:** OpenCanoeTiming/c123-scoring | **Licence:** MIT

---

## Důležitá pravidla

1. **NEMĚNIT c123-server** - Server je stabilní, změny jen po explicitním schválení.

2. **Povolené projekty pro úpravy:**
   - `c123-scoring` (tento projekt) - hlavní práce
   - `c123-protocol-docs/tools/` - pomocné nástroje (replay-server, recorder)

3. **Pouze pro čtení:**
   - `../c123-server/` - reference pro API, protokol
   - `../c123-scoreboard/` - reference pro typy, WebSocket
   - `../timing-design-system/` - UI komponenty

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

Striktně využívat `@opencanoetiming/timing-design-system`:
- Základní komponenty z design systému
- Specifické komponenty (PenaltyGrid) stylovat podle tokenů
- Chybějící komponenty → vytvořit podnět pro rozšíření DS

```bash
npm install @opencanoetiming/timing-design-system
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

### Před začátkem práce

1. Přečíst `PLAN.md` - zjistit aktuální stav a co je další na řadě
2. Přečíst `DEVLOG.md` - pochopit kontext z předchozích iterací

### Během práce

1. **Plánování:** Nejprve aktualizovat `PLAN.md` s novými kroky
2. **Realizace:** Pracovat po blocích (cca 70% kontextu)
3. **Commit:** Nejpozději po každém bloku
4. **Aktualizace PLAN.md:** Po dokončení kroku označit `- [x]`
5. Nedělat víc než jeden blok před clear/compact

### Po dokončení bloku/iterace

1. **PLAN.md:** Označit dokončené kroky jako `- [x]`
2. **DEVLOG.md:** Přidat záznam o tom co bylo uděláno:
   - Co se podařilo
   - Jaké byly problémy a jak se řešily
   - Poznámky k rozhodnutím
3. **Commit:** Commitnout změny včetně dokumentace

### Formát záznamu v DEVLOG.md

```markdown
## YYYY-MM-DD - Iterace X / Popis práce

### Dokončeno
- [x] Popis úkolu 1
- [x] Popis úkolu 2

### Problémy a řešení
1. **Problém:** [popis]
   **Řešení:** [jak bylo vyřešeno]

### Poznámky
[Důležitá rozhodnutí, odchylky od plánu, TODO pro příště]
```

### Při problémech

- Aktualizovat `PLAN.md` o nové sekce a kroky
- Zapsat do `DEVLOG.md` co nefungovalo
- Skončit a nechat práci na čerstvé instance

---

## Projektové soubory

| Soubor | Účel |
|--------|------|
| `PROJECT.md` | Projektový záměr a motivace (stabilní) |
| `PLAN.md` | Implementační plán s checkboxy (aktualizovat průběžně) |
| `DEVLOG.md` | Deníček vývoje (přidávat záznamy po každé iteraci) |
| `CLAUDE.md` | Instrukce pro Claude Code (tento soubor) |

---

## Commit message formát

```
feat: add penalty grid with keyboard navigation
fix: correct gate grouping logic
refactor: extract WebSocket logic to hook
```

---

*Projektový záměr → viz `./PROJECT.md`*
