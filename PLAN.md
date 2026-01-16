# C123-SCORING - Implementační plán

Podrobný plán pro autonomní iterativní implementaci. Každá fáze je navržena na max 70% kontextu.

---

## Fáze 0: UI Design (VISUAL DESIGNER)

**Cíl:** Důkladný návrh UI s maximálním důrazem na ergonomii a UX pro celodenní práci.

**Prerekvizity:**
- Prostudovat `../timing-design-system/` - dostupné komponenty a tokeny
- Prostudovat `./resources-private/` - původní terminál (READONLY)
- Prostudovat `../c123-protocol-docs/c123-xml-format.md` - datový model

### Kroky

- [ ] 0.1: Analýza původního terminálu - co funguje, co ne
- [ ] 0.2: Definice user stories a workflows
  - Workflow 1: Zadání penalizace při průjezdu závodníka
  - Workflow 2: Kontrola protokolu od rozhodčího
  - Workflow 3: Korekce chybně zadané penalizace
  - Workflow 4: Přepnutí mezi závody
- [ ] 0.3: Wireframes hlavních obrazovek (ASCII/Markdown)
  - Hlavní grid view
  - Race selector
  - Settings panel
- [ ] 0.4: Definice barevného kódování stavů
  - Závodník na trati (aktivní)
  - Závodník dojel (čeká na kontrolu)
  - Zkontrolováno
  - Penalizace 0/2/50
  - Aktivní buňka (focus)
- [ ] 0.5: Návrh klávesových zkratek
  - Navigace (šipky)
  - Zadání hodnot (0, 2, 5)
  - Potvrzení/zrušení
  - Přepínání závodů
- [ ] 0.6: Specifikace velikostí a kontrastů pro čitelnost
  - Minimální velikost písma
  - Kontrastní poměry
  - Touch targets (min 44px)
- [ ] 0.7: Dokumentace UI specifikace do `docs/UI-SPEC.md`

**Výstup:** `docs/UI-SPEC.md` s kompletní specifikací

---

## Fáze 1: Projekt Setup

**Cíl:** Funkční React projekt s design systemem a základní strukturou.

### Kroky

- [x] 1.1: Inicializace Vite + React + TypeScript
  ```bash
  npm create vite@latest . -- --template react-ts
  ```
- [x] 1.2: Instalace závislostí
  ```bash
  npm install @opencanoetiming/timing-design-system
  ```
- [x] 1.3: Konfigurace TypeScript (strict mode)
- [x] 1.4: Konfigurace ESLint + Prettier
- [x] 1.5: Vytvoření adresářové struktury
  ```
  src/
  ├── components/
  ├── hooks/
  ├── services/
  ├── store/
  ├── types/
  └── utils/
  ```
- [x] 1.6: Import design system CSS a fontů
- [x] 1.7: Základní App.tsx s design system komponentami
- [x] 1.8: Ověření buildu a dev serveru
- [x] 1.9: Commit: `feat: initial project setup with design system`

**Výstup:** Běžící dev server s design system styly ✅

---

## Fáze 2: Testovací infrastruktura

**Cíl:** Systém pro testování s reálnými závodními daty.

### Dostupné zdroje dat

| Typ | Umístění | Popis | Použití |
|-----|----------|-------|---------|
| **Captures (XML)** | `../c123-protocol-docs/captures/` | Statické XML soubory - finální stav závodu | Manuální testování, unit testy |
| **Recordings (JSONL)** | `../c123-protocol-docs/recordings/` | Nahrávky průběhu závodu s timestampy | Simulace živého závodu |

### Captures - statická data

Soubory:
- `xboardtest02_jarni_v1.xml` - Jarní slalomy 2024
- `2024-LODM-fin.xml` - LODM 2024 (komplexní závod s Cross)

**Aktuálně funkční:** c123-server podporuje `--xml` parametr pro načtení statického XML.

### Recordings - živá simulace

Soubory:
- `rec-2025-12-28T09-34-10.jsonl` - 4 minuty závodu, ~6000 zpráv

**Formát JSONL:**
```jsonl
{"_meta": {"version": 2, "recorded": "...", "host": "..."}}
{"ts": 0, "src": "tcp", "type": "RaceConfig", "data": "<xml>...</xml>"}
{"ts": 5, "src": "tcp", "type": "OnCourse", "data": "<xml>...</xml>"}
```

**Vyžaduje:** replay-server (viz Fáze 2A níže)

### Kroky

#### 2A: C123 Replay Server

Standalone server v `c123-protocol-docs/tools/`, který emuluje Canoe123 na TCP:27333.

```
┌─────────────────┐      TCP:27333      ┌─────────────────┐
│  replay-server  │ ─────────────────▶  │   c123-server   │
│  (JSONL replay) │                     │   (beze změny)  │
└─────────────────┘                     └─────────────────┘
```

**Umístění:** `../c123-protocol-docs/tools/replay-server.js`

- [x] 2A.1: Vytvořit `replay-server.js`
  - TCP server na portu 27333 (stejný jako C123)
  - Parsování JSONL souboru z `recordings/`
  - Filtrování na `src: "tcp"` zprávy (C123 protokol)
  - Přehrávání s respektováním `ts` timestampů
  - Oddělovač zpráv `|` (jako C123)
- [x] 2A.2: CLI parametry
  - `node replay-server.js <file.jsonl>` - základní spuštění
  - `--speed <multiplier>` - zrychlení/zpomalení (default 1)
  - `--loop` - opakované přehrávání
  - `--port <port>` - jiný port než 27333
- [x] 2A.3: Aktualizovat `recordings/README.md` s instrukcemi
- [x] 2A.4: Commit: `feat: add replay-server for JSONL recordings`

#### 2B: Unit testy (c123-scoring)

- [ ] 2B.1: Instalace test dependencies
  ```bash
  npm install -D vitest @testing-library/react jsdom
  ```
- [ ] 2B.2: Konfigurace Vitest
- [ ] 2B.3: Vytvoření `test-utils/fixtures/` s JSON fixtures
  - Extrahovat z JSONL: OnCourse, RaceConfig, Schedule, Results zprávy
  - Různé stavy: závodník na trati, dojel, penalizace
- [ ] 2B.4: Unit testy pro utility funkce (gates.ts, gateGroups.ts)
- [ ] 2B.5: Unit testy pro hooks (useSchedule, useGateGroups, useCheckedState)
- [ ] 2B.6: Commit: `test: add unit tests with vitest`

#### 2C: E2E testy s Playwright

- [ ] 2C.1: Instalace Playwright
  ```bash
  npm install -D @playwright/test
  npx playwright install
  ```
- [ ] 2C.2: Konfigurace `playwright.config.ts`
- [ ] 2C.3: E2E test: připojení k serveru (s c123-server + replay)
- [ ] 2C.4: E2E test: navigace v gridu
- [ ] 2C.5: E2E test: zadání penalizace
- [ ] 2C.6: Vizuální regresní testy (screenshoty)
- [ ] 2C.7: Commit: `test: add E2E tests with playwright`

#### 2D: Dokumentace

- [ ] 2D.1: Vytvořit `docs/TESTING.md`
  - Popis testovacích dat (captures vs recordings)
  - Jak spustit testy
  - Jak přidat nové fixtures
- [ ] 2D.2: Commit: `docs: add testing documentation`

**Výstup:** Kompletní testovací pipeline s unit testy, E2E testy a replay simulací

---

## Fáze 3: TypeScript typy a WebSocket hook

**Cíl:** Definice typů a real-time připojení k c123-server.

**Reference:** `../c123-scoreboard/src/types/c123server.ts`

### Kroky

- [x] 3.1: Vytvoření `types/c123server.ts`
  - Zkopírovat a adaptovat z c123-scoreboard
  - OnCourseMessage, ResultsMessage, RaceConfigMessage, ScheduleMessage
- [x] 3.2: Vytvoření `types/scoring.ts`
  - ScoringRequest, RemoveFromCourseRequest, TimingRequest
  - PenaltyValue (0 | 2 | 50)
  - CompetitorState (waiting, onCourse, finished, checked)
- [x] 3.3: Vytvoření `types/ui.ts`
  - GridCell, GridRow
  - FocusPosition
  - GateGroup
- [x] 3.4: Vytvoření `hooks/useC123WebSocket.ts`
  - Připojení k ws://server:27123/ws
  - Reconnect logika s exponential backoff
  - Message parsing a dispatch
- [x] 3.5: Vytvoření `hooks/useConnectionStatus.ts`
  - ConnectionState: connecting, connected, disconnected, error
  - Latency tracking
- [ ] 3.6: Unit testy pro WebSocket hook s MockWebSocket
- [x] 3.7: Commit: `feat: add TypeScript types and WebSocket hook`

**Výstup:** Typy a funkční WebSocket připojení ✅

---

## Fáze 4: Základní layout a ConnectionStatus

**Cíl:** Responsivní layout s header a stavem připojení.

### Kroky

- [x] 4.1: Vytvoření `components/Layout/Layout.tsx`
  - Header s názvem aplikace
  - Main content area
  - Footer se stavem
- [x] 4.2: Vytvoření `components/Layout/Layout.module.css`
  - CSS Grid layout
  - Responsivní breakpoints
- [x] 4.3: Vytvoření `components/ConnectionStatus/ConnectionStatus.tsx`
  - Vizuální indikátor (zelená/žlutá/červená)
  - Server adresa
  - Latency
- [x] 4.4: Vytvoření `components/Header/Header.tsx`
  - Logo/název
  - Aktuální závod
  - Settings button
- [x] 4.5: Integrace do App.tsx
- [ ] 4.6: Playwright screenshot test: prázdný stav
- [ ] 4.7: Playwright screenshot test: connecting stav
- [x] 4.8: Commit: `feat: add basic layout with connection status`

**Výstup:** Základní layout s fungujícím connection statusem ✅

---

## Fáze 5: Race Selector

**Cíl:** Výběr aktivního závodu ze Schedule.

### Kroky

- [x] 5.1: Vytvoření `hooks/useSchedule.ts`
  - Parsování Schedule zpráv
  - Filtrování aktivních závodů (RaceStatus 4-9)
  - Řazení podle RaceOrder
- [x] 5.2: Vytvoření `components/RaceSelector/RaceSelector.tsx`
  - Dropdown nebo tab list
  - Indikace aktivního závodu (InProgress)
  - Počet závodníků na trati
- [x] 5.3: Vytvoření `components/RaceSelector/RaceSelector.module.css`
  - Styling podle design system
  - Active/hover stavy
- [x] 5.4: Integrace do Header
- [x] 5.5: Persistence vybraného závodu do localStorage
- [ ] 5.6: Unit testy pro useSchedule
- [ ] 5.7: Playwright test: přepínání závodů
- [x] 5.8: Commit: `feat: add race selector with schedule integration`

**Výstup:** Funkční přepínání mezi závody ✅

---

## Fáze 6: Penalty Grid - Základní zobrazení

**Cíl:** Tabulka závodníků a branek (read-only).

### Kroky

- [x] 6.1: Vytvoření `hooks/useOnCourse.ts`
  - Parsování OnCourse zpráv
  - Extrakce Gates pole na array penalizací
  - Mapování na GridRow[]
  - *Poznámka: Implementováno jako součást OnCourseGrid komponenty*
- [x] 6.2: Vytvoření `hooks/useRaceConfig.ts`
  - Parsování RaceConfig
  - Počet branek, typy (N/R)
  - *Poznámka: Implementováno v rámci useC123WebSocket*
- [x] 6.3: Vytvoření `components/PenaltyGrid/PenaltyGrid.tsx`
  - Tabulka: řádky = závodníci, sloupce = branky
  - Sticky header s čísly branek
  - Sticky first column s jmény
  - *Poznámka: Implementováno jako OnCourseGrid*
- [x] 6.4: Vytvoření `components/PenaltyGrid/GridCell.tsx`
  - Zobrazení hodnoty (0/2/50 nebo prázdné)
  - Barevné kódování podle hodnoty
  - Typ branky (N/R) v headeru
- [x] 6.5: Vytvoření `components/PenaltyGrid/GridRow.tsx`
  - Jméno závodníka, startovní číslo
  - Barevné kódování stavu (onCourse, finished)
  - *Poznámka: Integrováno do OnCourseGrid*
- [x] 6.6: Vytvoření `components/PenaltyGrid/PenaltyGrid.module.css`
  - Grid layout s overflow scroll
  - Sticky positioning
  - Velké, čitelné buňky (min 48px)
- [x] 6.7: Integrace do Layout
- [ ] 6.8: Playwright screenshot: grid s daty
- [x] 6.9: Commit: `feat: add OnCourseGrid component for displaying competitors with penalties`

**Výstup:** Funkční zobrazení penalizací ✅

---

## Fáze 7: Penalty Grid - Keyboard navigace

**Cíl:** Plná klávesová ovladatelnost gridu.

### Kroky

- [x] 7.1: Vytvoření `hooks/useFocusNavigation.ts`
  - FocusPosition state (row, column)
  - Arrow key handlers
  - Tab/Shift+Tab
  - Home/End, PageUp/PageDown
- [x] 7.2: Vytvoření `hooks/useKeyboardInput.ts`
  - Numpad/number row pro hodnoty
  - 0 = čistě, 2 = dotek, 5 = nejetí (50)
  - Enter = potvrdit, Escape = zrušit
  - Delete/Backspace = vymazat
- [x] 7.3: Update `GridCell.tsx`
  - Focus ring styling (výrazný, 3px+)
  - Focused state animation
  - aria-selected, role="gridcell"
- [x] 7.4: Update `PenaltyGrid.tsx`
  - role="grid"
  - aria-activedescendant
  - Focus management
- [x] 7.5: Vytvoření `components/KeyboardHelp/KeyboardHelp.tsx`
  - Modal s přehledem zkratek
  - Trigger: ? nebo F1
  - *Poznámka: Implementováno jako součást Settings panelu (Keyboard tab)*
- [ ] 7.6: Unit testy pro useFocusNavigation
- [ ] 7.7: Playwright test: navigace šipkami
- [ ] 7.8: Playwright test: zadání hodnoty
- [x] 7.9: Commit: `feat: add keyboard navigation to penalty grid`

**Výstup:** Plně ovladatelný grid klávesnicí ✅

---

## Fáze 8: REST API integrace

**Cíl:** Odesílání penalizací na c123-server.

### Kroky

- [x] 8.1: Vytvoření `services/scoringApi.ts`
  - sendScoring(bib, gate, value)
  - sendRemoveFromCourse(bib, reason)
  - sendTiming(bib, channelPosition)
  - Error handling, retry logika
- [x] 8.2: Vytvoření `hooks/useScoring.ts`
  - Wrapper nad scoringApi
  - Optimistic updates
  - Loading/error states
  - Queue pro offline režim
- [x] 8.3: Update `GridCell.tsx`
  - Pending state (odesílání)
  - Success/error feedback
  - Toast notifikace
- [x] 8.4: Vytvoření `components/Toast/Toast.tsx` (pokud není v DS)
  - Success/error/warning varianty
  - Auto-dismiss
- [ ] 8.5: Integration test s mock API (čeká na Fázi 2)
- [ ] 8.6: Playwright test: zadání penalizace E2E (čeká na Fázi 2)
- [x] 8.7: Commit: `feat: add scoring API integration` + `feat: add Toast notification component`

**Výstup:** Funkční odesílání penalizací ✅

---

## Fáze 9: Gate Grouping

**Cíl:** Seskupování branek pro kontrolory.

### Kroky

- [x] 9.1: Vytvoření `types/gateGroups.ts`
  - GateGroup interface
  - Podpora překrývajících se skupin
- [x] 9.2: Vytvoření `hooks/useGateGroups.ts`
  - Parsování segmentů z RaceConfig
  - Custom groups z localStorage
  - CRUD operace pro skupiny
- [x] 9.3: Vytvoření `components/GateGroupEditor/GateGroupEditor.tsx`
  - Vizuální editor skupin
  - Checkboxy s quick range selectory
  - Pojmenování skupin a výběr barvy
- [x] 9.4: Update `OnCourseGrid.tsx` s gate group filteringem
  - Zobrazení pouze vybraných branek z aktivní skupiny
  - Vizuální oddělovače skupin (modré okraje)
  - GateGroupSwitcher pro rychlé přepínání
- [x] 9.5: Keyboard shortcuts pro přepínání skupin (1-9)
- [x] 9.6: Persistence skupin do localStorage (součást useGateGroups)
- [ ] 9.7: Playwright test: vytvoření skupiny
- [ ] 9.8: Playwright screenshot: filtrovaný grid
- [x] 9.9: Commit: `feat: integrate gate grouping into penalty grid`

**Výstup:** Konfigurovatelné skupiny branek ✅

---

## Fáze 10: Kontrola protokolů

**Cíl:** Označování zkontrolovaných závodníků.

### Kroky

- [x] 10.1: Rozšíření `types/scoring.ts`
  - CheckedState per competitor per group
  - Timestamp kontroly
- [x] 10.2: Vytvoření `hooks/useCheckedState.ts`
  - Local state pro kontroly
  - Persistence do localStorage
  - Reset při novém závodě
- [x] 10.3: Update `OnCourseGrid.tsx`
  - Checkbox pro "zkontrolováno"
  - Vizuální odlišení zkontrolovaných
  - Keyboard: Space = toggle check (TODO)
- [x] 10.4: Vytvoření `components/CheckProgress/CheckProgress.tsx`
  - Progress bar: X/Y zkontrolováno
  - Per-group statistiky
- [x] 10.5: Integrace do Footer
- [ ] 10.6: Playwright test: označení jako zkontrolováno (čeká na Fázi 2)
- [x] 10.7: Commit: `feat: add protocol check tracking`

**Výstup:** Sledování postupu kontroly ✅

---

## Fáze 11: Settings Panel

**Cíl:** Konfigurace aplikace.

### Kroky

- [x] 11.1: Vytvoření `components/Settings/Settings.tsx`
  - Modal s tabs (Server, Display, Keyboard)
  - Server address input s validací
  - Gate groups link
  - Display options (showFinished, compactMode)
  - Keyboard shortcuts reference
- [x] 11.2: Vytvoření `hooks/useSettings.ts`
  - Centrální state pro nastavení
  - localStorage persistence
  - Validace hodnot
  - Server history tracking
- [x] 11.3: Server config integrovaná do Settings
  - URL input s validací (ws://, wss://)
  - Test connection button
  - Connection history s quick select
  - Real-time connection status
- [x] 11.4: Keyboard shortcut: Ctrl+, = settings (useSettingsShortcut hook)
- [ ] 11.5: Playwright test: změna serveru (čeká na Fázi 2)
- [x] 11.6: Commit: `feat: add settings panel`

**Výstup:** Konfigurovatelná aplikace ✅

---

## Fáze 12: RemoveFromCourse a Timing

**Cíl:** Plná funkčnost terminálu.

### Kroky

- [ ] 12.1: Vytvoření `components/CompetitorActions/CompetitorActions.tsx`
  - Context menu nebo toolbar
  - DNS/DNF/CAP buttons
  - Manual timing trigger
- [ ] 12.2: Update `GridRow.tsx`
  - Right-click context menu
  - Keyboard: D = DNS, F = DNF, C = CAP
- [ ] 12.3: Vytvoření `components/TimingPanel/TimingPanel.tsx`
  - Manual start/finish buttons
  - Pro případ selhání fotobunky
- [ ] 12.4: Confirmation dialogy pro destruktivní akce
- [ ] 12.5: Playwright test: označení DNS
- [ ] 12.6: Commit: `feat: add remove-from-course and timing actions`

**Výstup:** Kompletní funkčnost terminálu

---

## Fáze 13: Polish a UX vylepšení

**Cíl:** Doladění pro produkční použití.

### Kroky

#### 13.0: Oprava zobrazení gridu (KRITICKÉ)

**Problém:** Grid aktuálně zobrazuje všechny závodníky a řadí podle `position` (pozice na trati).
Správné chování: hlavní use case je kontrola penalizací u DOJETÝCH závodníků.

- [x] 13.0.1: Změnit filtrování v OnCourseGrid
  - Primárně zobrazovat dojeté (`completed: true`)
  - Závodníci na trati pouze jako sekundární sekce nebo skrytí
- [x] 13.0.2: Změnit řazení
  - Dojetí: podle pořadí dojezdu (rank nebo čas)
  - Ne podle `position` (to je pozice na trati)
- [x] 13.0.3: Vizuální oddělení sekcí
  - "Dojetí" - hlavní sekce pro kontrolu
  - "Na trati" - volitelně viditelná sekce
- [ ] 13.0.4: Toggle v Settings nebo tlačítko pro zobrazení závodníků na trati
- [x] 13.0.5: Commit: `fix: show finished competitors primarily for penalty checking`

#### Další kroky

- [ ] 13.1: Loading states pro všechny async operace
- [ ] 13.2: Error boundaries a fallback UI
- [ ] 13.3: Empty states (žádný závod, žádní závodníci)
- [ ] 13.4: Animace a transitions (respektovat reduced-motion)
- [ ] 13.5: Focus trap v modalech
- [ ] 13.6: Screen reader testing
- [ ] 13.7: High contrast mode testing
- [ ] 13.8: Touch device optimalizace
- [ ] 13.9: Performance profiling (React DevTools)
- [ ] 13.10: Bundle size optimalizace
- [ ] 13.11: Commit: `refactor: polish UX and accessibility`

**Výstup:** Produkčně připravená aplikace

---

## Fáze 14: Vizuální testy - Kompletní sada

**Cíl:** Baseline screenshoty pro všechny stavy.

### Kroky

- [ ] 14.1: Screenshot: prázdný stav (no connection)
- [ ] 14.2: Screenshot: connecting
- [ ] 14.3: Screenshot: connected, no races
- [ ] 14.4: Screenshot: race selector s více závody
- [ ] 14.5: Screenshot: grid - závodník na trati
- [ ] 14.6: Screenshot: grid - závodník dojel
- [ ] 14.7: Screenshot: grid - focus na buňce
- [ ] 14.8: Screenshot: grid - pending odesílání
- [ ] 14.9: Screenshot: grid - error stav
- [ ] 14.10: Screenshot: gate groups editor
- [ ] 14.11: Screenshot: settings panel
- [ ] 14.12: Screenshot: keyboard help modal
- [ ] 14.13: Screenshot: mobile view
- [ ] 14.14: Commit: `test: add comprehensive visual test suite`

**Výstup:** Kompletní vizuální regresní testy

---

## Fáze 15: Dokumentace a finalizace

**Cíl:** Připravit projekt pro použití a další vývoj.

### Kroky

- [ ] 15.1: README.md s instrukcemi pro:
  - Instalaci
  - Vývoj
  - Build
  - Testování
  - Deployment
- [ ] 15.2: CHANGELOG.md pro v1.0.0
- [ ] 15.3: Dokumentace API v `docs/`
- [ ] 15.4: Příklady konfigurace
- [ ] 15.5: GitHub Actions workflow
  - Build
  - Test
  - Visual regression
- [ ] 15.6: Finální code review
- [ ] 15.7: Tag: v1.0.0

**Výstup:** Release-ready v1.0.0

---

## Testovací data

### Přehled zdrojů

| Typ | Soubor | Popis | Stav |
|-----|--------|-------|------|
| **Capture** | `captures/xboardtest02_jarni_v1.xml` | Jarní slalomy 2024 | ✅ Funkční |
| **Capture** | `captures/2024-LODM-fin.xml` | LODM 2024 (s Cross) | ✅ Funkční |
| **Recording** | `recordings/rec-2025-12-28T09-34-10.jsonl` | 4 min živého závodu | ⏳ Vyžaduje ReplaySource |

### Manuální testování se statickým XML

```bash
# Terminal 1: c123-server s XML souborem (statická data)
cd ../c123-server
npm start -- --xml ../c123-protocol-docs/captures/xboardtest02_jarni_v1.xml

# Terminal 2: c123-scoring dev server
cd ../c123-scoring
npm run dev
```

**Omezení:** Statické XML = vidíte finální stav závodu, ne průběh.

### Testování s replay (po implementaci Fáze 2A)

```bash
# Terminal 1: replay-server emuluje C123 na TCP:27333
cd ../c123-protocol-docs/tools
node replay-server.js ../recordings/rec-2025-12-28T09-34-10.jsonl

# Volitelně: zrychlené přehrávání (2× rychlost)
node replay-server.js ../recordings/rec-2025-12-28T09-34-10.jsonl --speed 2

# Volitelně: loop pro nekonečné přehrávání
node replay-server.js ../recordings/rec-2025-12-28T09-34-10.jsonl --loop

# Terminal 2: c123-server se připojí k replay-server jako k C123
cd ../c123-server
npm start -- --host localhost

# Terminal 3: c123-scoring dev server
cd ../c123-scoring
npm run dev
```

**Výhody:**
- Simuluje reálný průběh závodu - závodníci startují, jedou, dojíždějí
- c123-server zůstává beze změny (replay-server je "fake C123")
- Jednoduchá architektura, snadné debugování

### Vytváření nových nahrávek

Pro nahrávání živého závodu použijte recorder:

```bash
cd ../c123-protocol-docs/tools
node recorder.js <C123_IP>
# Ctrl+C pro ukončení
# Výstup: recordings/rec-YYYY-MM-DDTHH-MM-SS.jsonl
```

---

## Poznámky pro autonomní běh

1. **Začít vždy přečtením tohoto PLAN.md**
2. **Označit aktuální fázi jako in-progress**
3. **Po dokončení fáze commitnout a označit jako done**
4. **Při problémech přidat kroky do plánu a ukončit**
5. **Každá fáze = čistý kontext, max 70% využití**
6. **Playwright screenshoty ukládat do `tests/screenshots/`**

---

*Vytvořeno: 2026-01-16*
*Poslední aktualizace: 2026-01-16*

---

## Stav implementace

| Fáze | Název | Stav |
|------|-------|------|
| 0 | UI Design | ⏸️ Přeskočeno |
| 1 | Projekt Setup | ✅ Hotovo |
| 2 | Testovací infrastruktura | 🔲 Čeká (2A vyžaduje c123-server) |
| 3 | TypeScript typy a WebSocket | ✅ Hotovo |
| 4 | Layout a ConnectionStatus | ✅ Hotovo |
| 5 | Race Selector | ✅ Hotovo |
| 6 | Penalty Grid - zobrazení | ✅ Hotovo |
| 7 | Penalty Grid - keyboard | ✅ Hotovo |
| 8 | REST API integrace | ✅ Hotovo |
| 9 | Gate Grouping | ✅ Hotovo |
| 10 | Kontrola protokolů | ✅ Hotovo |
| 11 | Settings Panel | ✅ Hotovo |
| 12 | RemoveFromCourse a Timing | 🔲 Čeká |
| 13 | Polish a UX | 🔲 Čeká |
| 14 | Vizuální testy | 🔲 Čeká |
| 15 | Dokumentace | 🔲 Čeká |
