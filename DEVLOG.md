# C123-SCORING - Development Log

Deníček vývoje projektu. Záznamy o tom co bylo uděláno, co fungovalo, co nefungovalo.

---

## 2026-01-16 - Iterace 1

### Shrnutí

První velká implementační iterace. Za jeden den bylo implementováno 11 fází z 15 plánovaných. Projekt je funkční a použitelný pro základní workflow zadávání penalizací.

### Dokončené fáze

#### Fáze 1: Projekt Setup
- Vite + React + TypeScript inicializace
- Design system integrace
- Adresářová struktura
- **Commit:** `3048b1f feat: initial project setup with design system`

#### Fáze 3: TypeScript typy a WebSocket
- Typy pro WebSocket zprávy (adaptováno z c123-scoreboard)
- Typy pro scoring API requesty
- Typy pro UI stav
- WebSocket hook s auto-reconnect
- Connection status hook
- **Commit:** `feat: add TypeScript types and WebSocket hook`

#### Fáze 4: Layout a ConnectionStatus
- CSS Grid layout (header, main, footer)
- ConnectionStatus komponenta s vizuálním indikátorem
- Header komponenta
- **Commit:** `e509b6c feat: add basic layout with connection status`

#### Fáze 5: Race Selector
- useSchedule hook pro parsování Schedule zpráv
- RaceSelector dropdown s status indikátorem
- Auto-select běžícího závodu
- localStorage persistence
- **Commit:** `6c412d5 feat: add race selector with schedule integration`

#### Fáze 6: Penalty Grid - zobrazení
- OnCourseGrid komponenta
- Utility pro parsování penalizací a gate config
- Barevné kódování stavů (0=zelená, 2=oranžová, 50=červená)
- Zvýraznění reverse branek
- **Commit:** `3c9f0f9 feat: add OnCourseGrid component for displaying competitors with penalties`

#### Fáze 7: Keyboard navigace
- useFocusNavigation hook (šipky, Home/End, PageUp/Down, Tab)
- useKeyboardInput hook (0/2/5 klávesy, Delete)
- GridCell komponenta s focus styly a ARIA atributy
- **Commit:** `feat: add keyboard navigation to penalty grid`

#### Fáze 8: REST API integrace
- scoringApi.ts service s retry logikou
- useScoring hook s optimistic updates
- Toast notifikace pro feedback
- **Commity:**
  - `feat: add scoring API integration`
  - `feat: add Toast notification component`

#### Fáze 9: Gate Grouping
- types/gateGroups.ts s podporou překrývajících se skupin
- useGateGroups hook s localStorage persistencí
- GateGroupEditor komponenta (vizuální editor)
- GateGroupSwitcher pro rychlé přepínání
- Keyboard shortcuts 0-9 pro skupiny
- **Commity:**
  - `65d4b2f feat: add gate groups types with overlap support`
  - `21ef96e feat: add useGateGroups hook for gate grouping`
  - `efcf188 feat: integrate gate grouping into penalty grid`
  - `682792e feat: add keyboard shortcuts for gate group switching`

#### Fáze 10: Kontrola protokolů
- CheckedState typy a utility
- useCheckedState hook s localStorage persistencí (per závod, per group)
- Check sloupec v gridu
- CheckProgress komponenta ve footeru
- **Commity:**
  - `0865549 feat: add protocol check tracking`
  - `c9e8f4d docs: update PLAN.md with completed phase 10 tasks`

#### Fáze 11: Settings Panel
- Settings modal s třemi taby (Server, Display, Keyboard)
- useSettings hook pro centrální správu nastavení
- Server URL validace a test connection
- Historie serverů
- Keyboard shortcut Ctrl+,
- **Commit:** `eb4a036 feat: add settings panel with server configuration`

### Přeskočené/odložené

- **Fáze 0 (UI Design):** Přeskočeno - implementováno ad-hoc během vývoje
- **Fáze 2 (Testovací infrastruktura):** Odloženo - priorita byla funkční aplikace

### Co fungovalo dobře

1. **Iterativní přístup** - postupné budování od základů k komplexnějším funkcím
2. **Kopírování typů z c123-scoreboard** - ušetřilo čas a zajistilo kompatibilitu
3. **Design system** - konzistentní styling bez nutnosti psát vše od nuly
4. **localStorage persistence** - jednoduchá implementace, funguje spolehlivě

### Co nefungovalo / problémy

1. **Dokumentace nebyla průběžně aktualizována** - PLAN.md checkboxy nebyly označovány, DEVLOG.md neexistoval
2. **Některé komponenty implementovány jinak než v plánu** - např. OnCourseGrid místo PenaltyGrid, KeyboardHelp jako součást Settings

### Poznámky k architektuře

- Rozhodnutí: OnCourseGrid obsahuje většinu logiky místo rozdělení do více komponent
- Rozhodnutí: Gate groups jsou scopované per raceId v localStorage
- Rozhodnutí: Checked state je scopovaný per závod AND per gate group

### Další kroky

Viz PLAN.md - zbývají fáze 12-15:
- Fáze 12: RemoveFromCourse a Timing (DNS/DNF/CAP akce)
- Fáze 13: Polish a UX vylepšení
- Fáze 14: Vizuální testy (Playwright)
- Fáze 15: Dokumentace a finalizace

---

## 2026-01-16 - Oprava dokumentace

### Cíl

Opravit chybějící dokumentaci a aktualizovat testovací plán.

### Dokončeno

- [x] Opraveny checkboxy v PLAN.md (fáze 1-11 označeny jako hotové)
- [x] Vytvořen DEVLOG.md se shrnutím iterace 1
- [x] Rozšířen CLAUDE.md o explicitní dokumentační proces
- [x] Přepsána Fáze 2 (Testovací infrastruktura) s rozlišením:
  - **Captures** = statické XML (funguje teď)
  - **Recordings** = JSONL nahrávky (vyžaduje ReplaySource v c123-server)
- [x] Aktualizována sekce "Testovací data" s instrukcemi pro oba módy

### Poznámky

**Zjištění:** c123-server nepodporuje přehrávání recordings - má pouze:
- `TcpSource` - připojení k živému C123
- `XmlFileSource` - statické XML soubory

**Řešení:** Vytvořit standalone `replay-server.js` v c123-protocol-docs/tools:
- TCP server na portu 27333 (emuluje C123)
- c123-server se připojí jako k autentickému C123
- Žádné změny v c123-server potřeba

```
replay-server (TCP:27333) → c123-server → c123-scoring
```

**Důležité pravidlo:** Z tohoto projektu NEMĚNIT jiné projekty (c123-server, c123-protocol-docs, atd.) - pouze číst jako reference. Replay-server implementovat samostatně v c123-protocol-docs.

---

## 2026-01-16 - Fáze 2A: Replay Server

### Cíl iterace

Implementovat replay-server pro přehrávání JSONL nahrávek jako simulace živého C123.

### Dokončeno

- [x] Vytvořen `c123-protocol-docs/tools/replay-server.js`
  - TCP server na portu 27333
  - Parsování JSONL, filtrování `src: "tcp"` zpráv
  - Přehrávání s respektováním timestampů
  - CLI parametry: --speed, --loop, --port
- [x] Otestováno s c123-server a c123-scoring
- [x] Aktualizován `recordings/README.md` s dokumentací
- [x] Screenshot fungující aplikace: `docs/screenshots/scoring-live-replay.png`

### Architektura

```
replay-server (TCP:27333) → c123-server (:27123) → c123-scoring (:5173)
```

### Poznámky

- Replay-server filtruje pouze `src: "tcp"` zprávy (C123 protokol)
- Používá oddělovač `|` jako autentické C123
- Nahrávka `rec-2025-12-28T09-34-10.jsonl` obsahuje 1051 TCP zpráv (4m 7s)
- S `--speed 5` se 4 minuty přehrají za ~50s

---

## 2026-01-16 - Fáze 13.0: Oprava zobrazení gridu

### Cíl iterace

Opravit grid tak, aby primárně zobrazoval dojeté závodníky (pro kontrolu penalizací), ne závodníky na trati.

### Dokončeno

- [x] Rozdělení závodníků na "finished" a "on-course"
- [x] Dojetí se řadí podle `rank` (pořadí), ne podle `position`
- [x] Závodníci na trati se řadí podle `position` (1 = nejblíž cíli)
- [x] Dojetí závodníci jsou primárně nahoře, na trati jsou jako sekundární sekce
- [x] Vizuální separátor "ON COURSE (X)" mezi sekcemi
- [x] Sloupec "#" zobrazuje rank pro dojeté, position pro na trati
- [x] CSS úpravy - dojetí mají plnou opacity, na trati mají sníženou (0.85)

### Změny

**OnCourseGrid.tsx:**
- Nová logika pro separaci a řazení závodníků
- Fragment wrapper pro vložení section separátoru
- Dynamické zobrazení rank vs position

**OnCourseGrid.css:**
- Nové styly pro `.section-separator` a `.section-label`
- Invertovaná opacity - teď dojetí jsou plně viditelní, na trati tlumení

### Poznámky

- Toggle pro skrývání závodníků na trati (13.0.4) odložen na později - není kritické
- Keyboard navigace funguje přes obě sekce (row index je konzistentní)

---

## 2026-01-16 - Fáze 13.2: Error Boundaries

### Cíl iterace

Přidat ErrorBoundary komponentu pro zachytávání React chyb a zobrazení fallback UI.

### Dokončeno

- [x] Vytvořena `ErrorBoundary` komponenta (class component s getDerivedStateFromError)
- [x] Fallback UI s detaily chyby, tlačítky "Try Again" a "Reload Page"
- [x] CSS styly konzistentní s design systémem
- [x] Integrace do main.tsx (wraps ToastProvider a App)

### Poznámky

- ErrorBoundary musí být class component (React hooks nepodporují error boundaries)
- Wraps celou aplikaci včetně ToastProvider pro maximální ochranu

---

## 2026-01-16 - Fáze 13.3: Empty States

### Cíl iterace

Přidat EmptyState komponenty pro různé prázdné stavy aplikace.

### Dokončeno

- [x] Vytvořena EmptyState komponenta s variantami:
  - `disconnected` - není připojení k serveru
  - `no-races` - žádné aktivní závody
  - `no-competitors` - žádní závodníci ve vybraném závodě
  - `loading` - probíhá připojování
- [x] Každá varianta má ikonu, title a message
- [x] Disconnected stav má akční tlačítko pro otevření nastavení
- [x] Integrace do App.tsx s kaskádovitou logikou zobrazení

### Poznámky

- Stavy jsou hierarchicky řazeny: loading → disconnected → no-races → no-competitors → grid
- Ikony jsou emoji pro jednoduchost (bez závislostí na icon library)
- CSS animace pro loading stav (pulse efekt)

---

## 2026-01-16 - Fáze 13.4: Animace a transitions

### Cíl iterace

Přidat animace a transitions pro lepší UX, s respektováním `prefers-reduced-motion`.

### Dokončeno

- [x] Modal animace (fade-in overlay, scale-in content) v App.css
- [x] Connection status indicator - pulsing animace pro connecting stav
- [x] Penalty cell transitions - plynulé přechody mezi stavy (empty/clear/touch/miss)
- [x] Competitor row transitions - plynulé hover a state změny
- [x] `@media (prefers-reduced-motion: reduce)` ve všech relevantních CSS souborech:
  - App.css
  - ConnectionStatus.module.css
  - OnCourseGrid.css
  - EmptyState.css
  - Settings.module.css
  - Toast.css (již existovalo)

### Změny

**App.css:**
- Přidána `fade-in` animace pro modal overlay
- Přidána `modal-scale-in` animace pro modal content
- Reduced-motion sekce pro vypnutí animací

**ConnectionStatus.module.css:**
- Přidána `indicator--connecting` třída s pulse animací
- Transition pro indikátor při změně stavu

**useConnectionStatus.ts:**
- Přidán nový statusClass `'connecting'` pro animovaný stav

**OnCourseGrid.css:**
- Transitions pro penalty stavy a competitor rows
- Reduced-motion sekce

### Poznámky

- Všechny animace jsou krátké (150-200ms) pro responsivní pocit
- Reduced-motion uživatelé vidí statické stavy bez animací
- Toast.css již měl reduced-motion podporu z předchozí iterace

---

## 2026-01-16 - Fáze 13.5: Focus trap v modalech

### Cíl iterace

Přidat focus trap do všech modalů pro lepší klávesnicovou navigaci a přístupnost.

### Dokončeno

- [x] Vytvořen `useFocusTrap` hook
  - Automatické zaměření prvního focusable elementu při otevření
  - Cyklování focusu mezi prvním a posledním elementem při Tab/Shift+Tab
  - Obnovení focusu na předchozí element při zavření modalu
  - Podpora pro enabled/autoFocus/restoreFocus options
- [x] Integrováno do Settings modalu
- [x] Integrováno do GateGroupEditor modalu
- [x] Export z hooks/index.ts

### Poznámky

- Hook používá `requestAnimationFrame` pro správné načasování focusu
- Focusable elementy jsou detekovány pomocí standardního selektoru (a, button, input, select, textarea, [tabindex])
- Elementy s `display: none` nebo `visibility: hidden` jsou filtrovány

---

## 2026-01-16 - Fáze 13.8: Touch device optimalizace

### Cíl iterace

Zajistit, aby všechny interaktivní prvky měly minimální touch target 44×44px na dotykových zařízeních.

### Dokončeno

- [x] OnCourseGrid.css - gate cells (44px), check buttons (44px), row heights (48px)
- [x] RaceSelector.module.css - select height (44px), larger padding
- [x] GateGroupSwitcher.module.css - group buttons (44px), edit button (44px)
- [x] Settings.module.css - tabs, buttons, inputs, checkboxes
- [x] CompetitorActions.module.css - action buttons (44px), menu sizing
- [x] GateGroupEditor.module.css - všechny interaktivní prvky včetně gates gridu
- [x] TimingPanel.module.css - timing buttons (48px), confirm buttons

### Implementace

Použit `@media (pointer: coarse)` media query pro detekci dotykových zařízení:
- Zvětšení touch targetů na min 44×44px (WCAG doporučení)
- Input font-size 16px pro prevenci zoomu na iOS
- Větší padding pro pohodlnější ovládání

### Poznámky

- `pointer: coarse` je spolehlivější než `hover: none` pro detekci touch zařízení
- Timing buttons mají 48px pro lepší ergonomii (kritické akce)
- iOS automaticky zoomuje při focusu na input s font-size < 16px

---

## 2026-01-16 - Fáze 13.10: Bundle size optimalizace

### Cíl iterace

Analyzovat a optimalizovat velikost produkčního bundlu.

### Dokončeno

- [x] Analýza bundle pomocí rollup-plugin-visualizer
- [x] Správné oddělení vendor chunku (React/ReactDOM)
- [x] Konfigurace Vite pro optimální build:
  - Target ES2020 (moderní JS bez polyfillů)
  - Drop console/debugger v produkci
  - Odstranění legal comments

### Výsledky

**Před optimalizací:**
- Celkem: 479 kB (136 kB gzip)
- Vše v jednom bundlu

**Po optimalizaci:**
- Vendor (React): 330 kB (100.5 kB gzip) - cacheable
- App code: 88.5 kB (19.7 kB gzip)
- Celkem: 418 kB (120.2 kB gzip) - **12% menší**

### Poznámky

- React 19 má větší runtime než React 18 (~330kB vs ~140kB)
- Vendor chunk je oddělen pro lepší cacheování - React se nemění často
- App code 88.5 kB je přiměřené pro aplikaci s 3300 řádky TypeScriptu
- source-map-explorer a rollup-plugin-visualizer přidány jako dev dependencies

---

## 2026-01-16 - Fáze 14: Vizuální testy (Playwright)

### Cíl iterace

Implementovat Playwright testy a vytvořit screenshoty všech stavů aplikace pro dokumentaci.

### Dokončeno

- [x] Instalace Playwright a závislostí (@playwright/test, ws, tsx)
- [x] Konfigurace playwright.config.ts
- [x] Vytvoření mock WebSocket serveru pro testy (tests/mock-ws-server.ts)
- [x] Vytvoření testovacích fixtures (tests/fixtures/mock-data.ts)
- [x] Playwright testy pro statické stavy (screenshots-static.spec.ts)
- [x] Playwright testy pro stavy s daty (screenshots-with-data.spec.ts)
- [x] 15 dokumentačních screenshotů v docs/screenshots/

### Vytvořené screenshoty

| Soubor | Popis |
|--------|-------|
| 01-disconnected.png | Stav bez připojení |
| 02-connecting.png | Připojování |
| 03-settings-panel.png | Settings modal - Server tab |
| 04-settings-keyboard.png | Settings modal - Keyboard tab |
| 05-no-races.png | Připojeno, žádné závody |
| 07-race-selector.png | Race selector s více závody |
| 08-grid-finished.png | Grid se závodníky |
| 09-grid-cell-focus.png | Grid s focusem na buňce |
| 10-grid-oncourse-section.png | Grid - sekce On Course |
| 11-gate-group-switcher.png | Gate group switcher |
| 12-gate-group-editor.png | Gate group editor modal |
| 13-competitor-actions.png | Competitor actions menu |
| 14-check-progress.png | Check progress ve footeru |
| 15-mobile-view.png | Mobile view |
| 16-mobile-settings.png | Mobile settings |

### Problémy a řešení

1. **Problém:** Mock WebSocket server kolidoval s portem při paralelních testech
   **Řešení:** Rozdělení testů na dva soubory - statické (bez serveru) a s daty (vyžadují běžící c123-server + replay-server)

2. **Problém:** Check buttons jsou disabled pro závodníky na trati
   **Řešení:** Test 14 upraven aby přeskočil disabled buttons

### Poznámky

- Testy s daty vyžadují běžící replay-server + c123-server
- Statické testy lze spustit samostatně: `npm run test -- screenshots-static.spec.ts`
- Screenshot 06-no-competitors.png chybí (obtížné vytvořit specifický stav)

---

## 2026-01-16 - Results-based grid refactoring

### Cíl iterace

Refaktoring hlavního gridu z OnCourse dat na Results data pro správnou kontrolu penalizací. OnCourse data jsou vhodná pro live sledování závodníků na trati, ale Results obsahují kompletní výsledky závodu.

### Dokončeno

- [x] Přidány utility funkce pro parsování Results gates formátu (mezery místo čárek)
  - `parseResultsGatesString()` v utils/gates.ts
  - `parseResultsGatesWithConfig()` v utils/gates.ts
- [x] Vytvořena nová komponenta `ResultsGrid`
  - Používá Results data místo OnCourse
  - Řadí závodníky: platné výsledky podle rank, DNS/DNF/DSQ na konec
  - Zobrazuje status (DNS/DNF/DSQ) ve sloupci #
  - Sdílí CSS styly s OnCourseGrid
- [x] App.tsx upraven pro použití Results dat
  - ResultsGrid nahrazuje OnCourseGrid jako hlavní grid
  - finishedCompetitorBibs nyní počítá z Results

### Změny souborů

- `src/utils/gates.ts` - nové funkce pro Results format
- `src/components/ResultsGrid/` - nová komponenta
- `src/components/index.ts` - export ResultsGrid
- `src/App.tsx` - použití ResultsGrid místo OnCourseGrid

### Poznámky

- OnCourseGrid zůstává v codebase pro potenciální použití jako doplňkový panel
- Results data mají gates oddělené mezerami ("0 0 2 0 50"), OnCourse čárkami ("0,0,2,0,50")
- Zbývá upravit Race selector na shortTitle

---

## 2026-01-17 - Oprava parsování gates + screenshoty

### Cíl iterace

Opravit zobrazení penalizací v gridu (byly "ob-sloupec") a aktualizovat screenshoty pro dokumentaci.

### Dokončeno

- [x] **Bug fix: parseResultsGatesString** - C123 Results data mají dvojité mezery mezi hodnotami (`"0  0  0  2  0  ..."` místo `"0 0 0 2 0 ..."`). Parser teď používá regex `/\s+/` pro split.
- [x] Přidán unit test pro dvojité mezery v gates stringu
- [x] Aktualizovány všechny screenshoty (07-15) s reálnými Results daty
- [x] Vylepšeny E2E testy:
  - `waitForDataAndSelectRace()` helper funkce
  - Automatický výběr K1m 2. jízda (má data v replay)
  - Čištění localStorage pro konzistentní výsledky
- [x] Opraven mock-ws-server pro posílání Results zpráv
- [x] Opravena mock-data.ts s korektními typy zpráv (Connected, Results)

### Commity

- `7772537` fix: parse Results gates string with multiple spaces
- `877e1cc` test: update screenshots and improve E2E test reliability

### Problémy a řešení

1. **Problém:** Penalizace se zobrazovaly "ob-sloupec" (gate 5 ve sloupci 9, atd.)
   **Řešení:** Gates string z C123 má dvojité mezery. Split podle ` ` vytvářel prázdné položky. Opraveno na `/\s+/` regex.

2. **Problém:** Screenshoty ukazovaly "No competitors" - data nedorazila
   **Řešení:**
   - Výběr správného závodu (K1m 2. jízda má Results data)
   - Delší čekání na načtení dat
   - Čištění localStorage před testem

3. **Problém:** Mock server posílal ServerInfo místo Connected, chyběly Results
   **Řešení:** Opraveny typy zpráv v mock-data.ts, přidáno posílání Results v mock-ws-server.ts

### Poznámky

- C123 posílá gates ve formátu `"0  0  0  2  ..."` s dvojitými mezerami
- Results zprávy nejsou posílány pravidelně (jen při změně), proto screenshoty závisí na správném načasování replay-serveru
- Screenshoty ukazují stabilní stav z K1m - střední trať - 2. jízda

---

## Template pro další záznamy

```markdown
## YYYY-MM-DD - Iterace X

### Cíl iterace
[Co mělo být uděláno]

### Dokončeno
- [ ] Item 1
- [ ] Item 2

### Problémy a řešení
1. **Problém:** [popis]
   **Řešení:** [jak bylo vyřešeno]

### Poznámky
[Cokoliv důležitého k zapamatování]
```
