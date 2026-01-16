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

- [ ] 1.1: Inicializace Vite + React + TypeScript
  ```bash
  npm create vite@latest . -- --template react-ts
  ```
- [ ] 1.2: Instalace závislostí
  ```bash
  npm install @opencanoetiming/timing-design-system
  ```
- [ ] 1.3: Konfigurace TypeScript (strict mode)
- [ ] 1.4: Konfigurace ESLint + Prettier
- [ ] 1.5: Vytvoření adresářové struktury
  ```
  src/
  ├── components/
  ├── hooks/
  ├── services/
  ├── store/
  ├── types/
  └── utils/
  ```
- [ ] 1.6: Import design system CSS a fontů
- [ ] 1.7: Základní App.tsx s design system komponentami
- [ ] 1.8: Ověření buildu a dev serveru
- [ ] 1.9: Commit: `feat: initial project setup with design system`

**Výstup:** Běžící dev server s design system styly

---

## Fáze 2: Testovací infrastruktura

**Cíl:** Systém pro přehrávání závodních dat a vizuální testování.

**Zdroje:**
- `../c123-protocol-docs/captures/xboardtest02_jarni_v1.xml`
- `../c123-protocol-docs/captures/2024-LODM-fin.xml`

### Kroky

- [ ] 2.1: Instalace test dependencies
  ```bash
  npm install -D vitest @testing-library/react @playwright/test
  ```
- [ ] 2.2: Konfigurace Vitest pro unit testy
- [ ] 2.3: Konfigurace Playwright pro E2E a vizuální testy
- [ ] 2.4: Vytvoření `test-utils/MockWebSocket.ts`
  - Simulace WebSocket připojení
  - Přehrávání zpráv ze souboru
- [ ] 2.5: Vytvoření `test-utils/fixtures/` s testovacími daty
  - Parsování XML captures na JSON fixtures
  - OnCourse zprávy s různými stavy
  - RaceConfig zprávy
- [ ] 2.6: Vytvoření `test-utils/TestHarness.tsx`
  - Wrapper pro komponenty s mock daty
  - Kontroly přehrávaných stavů
- [ ] 2.7: Nastavení Playwright screenshot testů
  - Konfigurace `playwright.config.ts`
  - Baseline screenshoty
- [ ] 2.8: Dokumentace testovacího workflow do `docs/TESTING.md`
- [ ] 2.9: Commit: `test: add testing infrastructure with replay system`

**Výstup:** Funkční test pipeline s mock WebSocket a Playwright

---

## Fáze 3: TypeScript typy a WebSocket hook

**Cíl:** Definice typů a real-time připojení k c123-server.

**Reference:** `../c123-scoreboard/src/types/c123server.ts`

### Kroky

- [ ] 3.1: Vytvoření `types/c123server.ts`
  - Zkopírovat a adaptovat z c123-scoreboard
  - OnCourseMessage, ResultsMessage, RaceConfigMessage, ScheduleMessage
- [ ] 3.2: Vytvoření `types/scoring.ts`
  - ScoringRequest, RemoveFromCourseRequest, TimingRequest
  - PenaltyValue (0 | 2 | 50)
  - CompetitorState (waiting, onCourse, finished, checked)
- [ ] 3.3: Vytvoření `types/ui.ts`
  - GridCell, GridRow
  - FocusPosition
  - GateGroup
- [ ] 3.4: Vytvoření `hooks/useC123WebSocket.ts`
  - Připojení k ws://server:27123/ws
  - Reconnect logika s exponential backoff
  - Message parsing a dispatch
- [ ] 3.5: Vytvoření `hooks/useConnectionStatus.ts`
  - ConnectionState: connecting, connected, disconnected, error
  - Latency tracking
- [ ] 3.6: Unit testy pro WebSocket hook s MockWebSocket
- [ ] 3.7: Commit: `feat: add TypeScript types and WebSocket hook`

**Výstup:** Typy a funkční WebSocket připojení

---

## Fáze 4: Základní layout a ConnectionStatus

**Cíl:** Responsivní layout s header a stavem připojení.

### Kroky

- [ ] 4.1: Vytvoření `components/Layout/Layout.tsx`
  - Header s názvem aplikace
  - Main content area
  - Footer se stavem
- [ ] 4.2: Vytvoření `components/Layout/Layout.module.css`
  - CSS Grid layout
  - Responsivní breakpoints
- [ ] 4.3: Vytvoření `components/ConnectionStatus/ConnectionStatus.tsx`
  - Vizuální indikátor (zelená/žlutá/červená)
  - Server adresa
  - Latency
- [ ] 4.4: Vytvoření `components/Header/Header.tsx`
  - Logo/název
  - Aktuální závod
  - Settings button
- [ ] 4.5: Integrace do App.tsx
- [ ] 4.6: Playwright screenshot test: prázdný stav
- [ ] 4.7: Playwright screenshot test: connecting stav
- [ ] 4.8: Commit: `feat: add basic layout with connection status`

**Výstup:** Základní layout s fungujícím connection statusem

---

## Fáze 5: Race Selector

**Cíl:** Výběr aktivního závodu ze Schedule.

### Kroky

- [ ] 5.1: Vytvoření `hooks/useSchedule.ts`
  - Parsování Schedule zpráv
  - Filtrování aktivních závodů (RaceStatus 4-9)
  - Řazení podle RaceOrder
- [ ] 5.2: Vytvoření `components/RaceSelector/RaceSelector.tsx`
  - Dropdown nebo tab list
  - Indikace aktivního závodu (InProgress)
  - Počet závodníků na trati
- [ ] 5.3: Vytvoření `components/RaceSelector/RaceSelector.module.css`
  - Styling podle design system
  - Active/hover stavy
- [ ] 5.4: Integrace do Header
- [ ] 5.5: Persistence vybraného závodu do localStorage
- [ ] 5.6: Unit testy pro useSchedule
- [ ] 5.7: Playwright test: přepínání závodů
- [ ] 5.8: Commit: `feat: add race selector with schedule integration`

**Výstup:** Funkční přepínání mezi závody

---

## Fáze 6: Penalty Grid - Základní zobrazení

**Cíl:** Tabulka závodníků a branek (read-only).

### Kroky

- [ ] 6.1: Vytvoření `hooks/useOnCourse.ts`
  - Parsování OnCourse zpráv
  - Extrakce Gates pole na array penalizací
  - Mapování na GridRow[]
- [ ] 6.2: Vytvoření `hooks/useRaceConfig.ts`
  - Parsování RaceConfig
  - Počet branek, typy (N/R)
- [ ] 6.3: Vytvoření `components/PenaltyGrid/PenaltyGrid.tsx`
  - Tabulka: řádky = závodníci, sloupce = branky
  - Sticky header s čísly branek
  - Sticky first column s jmény
- [ ] 6.4: Vytvoření `components/PenaltyGrid/GridCell.tsx`
  - Zobrazení hodnoty (0/2/50 nebo prázdné)
  - Barevné kódování podle hodnoty
  - Typ branky (N/R) v headeru
- [ ] 6.5: Vytvoření `components/PenaltyGrid/GridRow.tsx`
  - Jméno závodníka, startovní číslo
  - Barevné kódování stavu (onCourse, finished)
- [ ] 6.6: Vytvoření `components/PenaltyGrid/PenaltyGrid.module.css`
  - Grid layout s overflow scroll
  - Sticky positioning
  - Velké, čitelné buňky (min 48px)
- [ ] 6.7: Integrace do Layout
- [ ] 6.8: Playwright screenshot: grid s daty
- [ ] 6.9: Commit: `feat: add penalty grid with read-only display`

**Výstup:** Funkční zobrazení penalizací

---

## Fáze 7: Penalty Grid - Keyboard navigace

**Cíl:** Plná klávesová ovladatelnost gridu.

### Kroky

- [ ] 7.1: Vytvoření `hooks/useFocusNavigation.ts`
  - FocusPosition state (row, column)
  - Arrow key handlers
  - Tab/Shift+Tab
  - Home/End, PageUp/PageDown
- [ ] 7.2: Vytvoření `hooks/useKeyboardInput.ts`
  - Numpad/number row pro hodnoty
  - 0 = čistě, 2 = dotek, 5 = nejetí (50)
  - Enter = potvrdit, Escape = zrušit
  - Delete/Backspace = vymazat
- [ ] 7.3: Update `GridCell.tsx`
  - Focus ring styling (výrazný, 3px+)
  - Focused state animation
  - aria-selected, role="gridcell"
- [ ] 7.4: Update `PenaltyGrid.tsx`
  - role="grid"
  - aria-activedescendant
  - Focus management
- [ ] 7.5: Vytvoření `components/KeyboardHelp/KeyboardHelp.tsx`
  - Modal s přehledem zkratek
  - Trigger: ? nebo F1
- [ ] 7.6: Unit testy pro useFocusNavigation
- [ ] 7.7: Playwright test: navigace šipkami
- [ ] 7.8: Playwright test: zadání hodnoty
- [ ] 7.9: Commit: `feat: add keyboard navigation to penalty grid`

**Výstup:** Plně ovladatelný grid klávesnicí

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
- [ ] 8.4: Vytvoření `components/Toast/Toast.tsx` (pokud není v DS)
  - Success/error/warning varianty
  - Auto-dismiss
- [ ] 8.5: Integration test s mock API
- [ ] 8.6: Playwright test: zadání penalizace E2E
- [ ] 8.7: Commit: `feat: add scoring API integration`

**Výstup:** Funkční odesílání penalizací

---

## Fáze 9: Gate Grouping

**Cíl:** Seskupování branek pro kontrolory.

### Kroky

- [ ] 9.1: Vytvoření `types/gateGroups.ts`
  - GateGroup interface
  - Podpora překrývajících se skupin
- [ ] 9.2: Vytvoření `hooks/useGateGroups.ts`
  - Parsování segmentů z RaceConfig
  - Custom groups z localStorage
  - CRUD operace pro skupiny
- [ ] 9.3: Vytvoření `components/GateGroupEditor/GateGroupEditor.tsx`
  - Vizuální editor skupin
  - Drag & drop nebo checkboxy
  - Pojmenování skupin
- [ ] 9.4: Update `PenaltyGrid.tsx`
  - Zobrazení pouze vybraných branek
  - Vizuální oddělovače skupin
  - Quick switch mezi skupinami
- [ ] 9.5: Keyboard shortcuts pro přepínání skupin (1-9)
- [ ] 9.6: Persistence skupin do localStorage
- [ ] 9.7: Playwright test: vytvoření skupiny
- [ ] 9.8: Playwright screenshot: filtrovaný grid
- [ ] 9.9: Commit: `feat: add gate grouping for judges`

**Výstup:** Konfigurovatelné skupiny branek

---

## Fáze 10: Kontrola protokolů

**Cíl:** Označování zkontrolovaných závodníků.

### Kroky

- [ ] 10.1: Rozšíření `types/scoring.ts`
  - CheckedState per competitor per group
  - Timestamp kontroly
- [ ] 10.2: Vytvoření `hooks/useCheckedState.ts`
  - Local state pro kontroly
  - Persistence do localStorage
  - Reset při novém závodě
- [ ] 10.3: Update `GridRow.tsx`
  - Checkbox pro "zkontrolováno"
  - Vizuální odlišení zkontrolovaných
  - Keyboard: Space = toggle check
- [ ] 10.4: Vytvoření `components/CheckProgress/CheckProgress.tsx`
  - Progress bar: X/Y zkontrolováno
  - Per-group statistiky
- [ ] 10.5: Integrace do Header nebo Footer
- [ ] 10.6: Playwright test: označení jako zkontrolováno
- [ ] 10.7: Commit: `feat: add protocol check tracking`

**Výstup:** Sledování postupu kontroly

---

## Fáze 11: Settings Panel

**Cíl:** Konfigurace aplikace.

### Kroky

- [ ] 11.1: Vytvoření `components/Settings/Settings.tsx`
  - Modal nebo drawer
  - Server address input
  - Gate groups editor
  - Theme (pokud podporováno)
- [ ] 11.2: Vytvoření `hooks/useSettings.ts`
  - Centrální state pro nastavení
  - localStorage persistence
  - Validace hodnot
- [ ] 11.3: Vytvoření `components/Settings/ServerConfig.tsx`
  - URL input s validací
  - Test connection button
  - Connection history
- [ ] 11.4: Keyboard shortcut: Ctrl+, = settings
- [ ] 11.5: Playwright test: změna serveru
- [ ] 11.6: Commit: `feat: add settings panel`

**Výstup:** Konfigurovatelná aplikace

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

### Dostupné captures

| Soubor | Obsah | Použití |
|--------|-------|---------|
| `xboardtest02_jarni_v1.xml` | Jarní slalomy 2024 | Hlavní testovací data |
| `2024-LODM-fin.xml` | LODM 2024 | Komplexní závod s Cross |

### Spuštění s testovacími daty

```bash
# Terminal 1: c123-server s XML souborem
cd ../c123-server
npm start -- --xml ../c123-protocol-docs/captures/xboardtest02_jarni_v1.xml

# Terminal 2: c123-scoring dev server
cd ../c123-scoring
npm run dev
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
