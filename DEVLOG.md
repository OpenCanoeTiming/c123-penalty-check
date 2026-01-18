# C123-SCORING - Development Log

Deníček vývoje projektu. Záznamy o tom co bylo uděláno, co fungovalo, co nefungovalo.

---

## 2026-01-18 - Fáze 20A-C: Bug fixes

### Dokončeno

- [x] **20A.5-6:** Oprava keyboard navigace - `pendingValue` se nyní resetuje při změně pozice fokusované buňky
- [x] **20B.1-2:** Sticky header - přidána `position: sticky; top: 0; z-index: 100` pro header wrapper
- [x] **20C.1-2:** Space klávesa pro toggle "zkontrolováno" - `event.preventDefault()` a callback na `onToggleChecked`

### Investigace 20A.1-2

Zápis penalizací (scoring) byl prověřen end-to-end:
- `c123-scoring/scoringApi.ts` → `POST /api/c123/scoring`
- `c123-server/UnifiedServer.ts` → handler `handleC123Scoring`
- `c123-server/ScoringService.ts` → formátování XML a `TcpSource.write()`

Kód je implementovaný správně. Problém hlášený uživatelem vyžaduje testování s reálným C123 hardware - může to být TCP write problém nebo nesprávný XML formát.

### Změněné soubory

- `src/components/ResultsGrid/ResultsGrid.tsx` - přidán `useEffect` pro reset `pendingValue`, přidán Space handler
- `src/components/Layout/Layout.module.css` - sticky header

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

## 2026-01-17 - Fáze 15.5: GitHub Actions workflow

### Cíl iterace

Přidat CI/CD pipeline pro automatické buildování a testování při push/PR.

### Dokončeno

- [x] Vytvořen `.github/workflows/ci.yml`
  - Build job: checkout obou repozitářů, lint, typecheck, unit testy, build
  - E2E job: Playwright testy (statické screenshoty)
  - Upload artifacts pro build a test reporty
- [x] Řešení lokální závislosti na timing-design-system:
  - CI checkoutuje oba repozitáře
  - Dynamicky mění path v package.json

### Poznámky

- E2E testy spouští pouze `screenshots-static.spec.ts` (nevyžadují mock server)
- Plná E2E sada vyžaduje replay-server, což je mimo scope CI

---

## 2026-01-17 - Fáze 16C: Settings modal redesign

### Cíl iterace

Refaktoring Settings komponenty na použití design system komponent místo vlastních CSS stylů.

### Dokončeno

- [x] Nahrazení vlastního modalu za DS `Modal`, `ModalHeader`, `ModalTitle`, `ModalClose`, `ModalBody`
- [x] Použití DS `Tabs`, `TabList`, `Tab`, `TabPanels`, `TabPanel` pro přepínání záložek
- [x] Použití DS `Input` pro server URL vstup
- [x] Použití DS `Checkbox` pro display options
- [x] Použití DS `Button` pro akce (Test Connection, Save & Reconnect)
- [x] Použití DS `Kbd` pro zobrazení klávesových zkratek
- [x] Použití DS `Badge` pro status připojení
- [x] Smazání Settings.module.css (387 řádků)
- [x] Vytvoření minimálního Settings.css (130 řádků) pro layout-specifické styly

### Změny souborů

- `src/components/Settings/Settings.tsx` - kompletní refaktoring na DS komponenty
- `src/components/Settings/Settings.css` - nový minimální CSS soubor
- `src/components/Settings/Settings.module.css` - smazáno

### Poznámky

- DS Modal má vlastní focus trap, takže useFocusTrap hook už není potřeba
- Badge komponenta dobře nahrazuje vlastní status indikátory
- Celkově ušetřeno ~260 řádků CSS kódu

---

## 2026-01-17 - Fáze 16D: Grid redesign

### Cíl iterace

Refaktoring ResultsGrid na použití design system Table komponent a vytvoření PenaltyCell komponenty s DS tokeny.

### Dokončeno

- [x] Použití DS `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell`, `TableHeaderCell`
- [x] Vytvoření `PenaltyCell` komponenty jako custom cell s DS tokeny
- [x] Použití DS `Badge` pro zobrazení DNS/DNF/DSQ statusů
- [x] Nový `ResultsGrid.css` s DS color tokeny pro penalty stavy
- [x] Barevné kódování: clear (success), touch (warning), miss (error)
- [x] Zachována keyboard navigace a focus management

### Změny souborů

- `src/components/ResultsGrid/ResultsGrid.tsx` - přepsáno na DS Table komponenty
- `src/components/ResultsGrid/PenaltyCell.tsx` - nová komponenta pro penalty buňky
- `src/components/ResultsGrid/ResultsGrid.css` - nové styly s DS tokeny
- `src/components/ResultsGrid/index.ts` - export PenaltyCell

### Poznámky

- DS Checkbox nebyl použit pro check button - vlastní implementace lépe sedí do kompaktního gridu
- OnCourseGrid.css ponechán pro referenci, ResultsGrid má vlastní CSS
- Přechod na DS Table zjednodušuje styling a zajišťuje konzistenci s ostatními timing projekty

---

## 2026-01-17 - Fáze 17A: Header redesign

### Cíl iterace

Redesign headeru podle vzoru c123-server admin - přehlednější layout s prominentním race selectorem.

### Dokončeno

- [x] Prozkoumat c123-server admin pro inspiraci (event-bar pattern)
- [x] Zjednodušit Header komponentu:
  - Pouze HeaderBrand ("C123 Scoring") + HeaderStatus + settings button
  - Odstraněn subtitle/raceInfo z headeru
- [x] Vytvořit novou RaceBar komponentu:
  - Prominentní h1 s názvem vybraného závodu
  - Select size="lg" pro velký race selector
  - LIVE/Finished badge u race selectoru
- [x] Upravit Layout pro podporu race bar slotu
- [x] Sticky footer (position: sticky, bottom: 0)
- [x] Změnit ⚙ ikonu u gate groups na ✎ (edit) - odlišení od settings

### Změny souborů

- `src/components/Header/Header.tsx` - zjednodušeno, odstraněn raceInfo prop
- `src/components/RaceBar/` - nová komponenta (RaceBar.tsx, RaceBar.css, index.ts)
- `src/components/Layout/Layout.tsx` - přidán raceBar slot
- `src/components/Layout/Layout.module.css` - grid-template-rows: auto auto 1fr auto, sticky footer
- `src/components/GateGroupSwitcher/GateGroupSwitcher.tsx` - změna ikony ⚙ → ✎
- `src/App.tsx` - použití nového RaceBar místo RaceSelector v headeru
- `src/components/index.ts` - export RaceBar

### Poznámky

- Vzor z c123-server admin: header má pouze brand + status indikátory, event info je v samostatném "event-bar"
- RaceBar se zobrazuje vždy, i když není vybrán závod ("No race selected")
- Footer je nyní sticky - vždy viditelný na spodku obrazovky

---

## 2026-01-17 - Fáze 17B: Grid UX vylepšení

### Cíl iterace

Přidat vizuální highlighting řádků a sloupců při navigaci v gridu pro lepší orientaci.

### Dokončeno

- [x] Column highlight při HOVER (jemný 30% accent)
- [x] Column highlight při FOCUS (výraznější 50% accent)
- [x] Row highlight při FOCUS
- [x] Gate header buňky zvýrazněny pro hovered/focused sloupce
- [x] Odstraněn klub z name sloupce (méně clutteru)
- [x] PenaltyCell rozšířen o isColumnHovered/isColumnFocused props

### Změny souborů

- `src/components/ResultsGrid/ResultsGrid.tsx` - hover state, focus highlighting
- `src/components/ResultsGrid/ResultsGrid.css` - CSS třídy pro highlight
- `src/components/ResultsGrid/PenaltyCell.tsx` - nové props pro column highlighting

### Poznámky

- Použit `color-mix()` CSS funkce pro průhledné overlay efekty
- Hover sloupce je jemnější (30%) než focus sloupce (50%)
- Focus řádek má stejnou intenzitu jako focus sloupce

---

## 2026-01-17 - Fáze 17C: Gate Groups viditelnost

### Cíl iterace

Zlepšit viditelnost gate groups - přesunout switcher na prominentnější místo a vizuálně označit aktivní skupinu.

### Dokončeno

- [x] Přidán `toolbar` slot do Layout komponenty
- [x] GateGroupSwitcher přesunut z footeru do toolbaru nad gridem
- [x] Přidán label s názvem aktivní skupiny a počtem branek
- [x] Odstraněn `compact` mód (již není potřeba)
- [x] Přidána vizuální indikace aktivní skupiny v gridu:
  - `gate-header--in-group` třída pro header buňky
  - `penalty-cell--in-group` třída pro penalty buňky
  - Accent barva jako `box-shadow: inset 0 3px 0` na vrchu sloupců
- [x] PenaltyCell rozšířen o `isInActiveGroup` prop

### Změny souborů

- `src/components/Layout/Layout.tsx` - přidán toolbar slot
- `src/components/Layout/Layout.module.css` - grid-template-rows: auto auto auto 1fr auto
- `src/components/GateGroupSwitcher/GateGroupSwitcher.tsx` - nový design s labelem
- `src/components/GateGroupSwitcher/GateGroupSwitcher.module.css` - přepracované styly
- `src/components/ResultsGrid/ResultsGrid.tsx` - isInActiveGroup prop
- `src/components/ResultsGrid/ResultsGrid.css` - styly pro in-group indikaci
- `src/components/ResultsGrid/PenaltyCell.tsx` - nový prop
- `src/App.tsx` - přesun GateGroupSwitcher do toolbar slotu

### Poznámky

- E2E screenshotové testy jsou zastaralé (používají staré selektory jako `.gate-cell`, `.competitor-row`)
- Vizuální ověření provedeno manuálně přes build
- Footer je nyní jednodušší - obsahuje pouze verzi a check progress

---

## 2026-01-17 - Fáze 17D-E: Footer sticky + Řazení závodníků

### Cíl iterace

Dokončit sticky footer (17D) a přidat možnost řazení závodníků (17E).

### Dokončeno

- [x] 17D: Footer sticky - již bylo implementováno v rámci 17A (position: sticky, bottom: 0)
- [x] 17E.1: Typ `ResultsSortOption` a `RESULTS_SORT_LABELS` v types/ui.ts
- [x] 17E.2: `SortSelector` komponenta s DS Select
- [x] 17E.3: Sorting logic v `ResultsGrid.tsx` (nový prop `sortBy`)
- [x] 17E.4: localStorage persistence v App.tsx
- [x] 17E.5: Toolbar layout s GateGroupSwitcher a SortSelector

### Změny souborů

- `src/types/ui.ts` - nové typy pro sort
- `src/components/SortSelector/` - nová komponenta (SortSelector.tsx, SortSelector.css, index.ts)
- `src/components/index.ts` - export SortSelector
- `src/components/ResultsGrid/ResultsGrid.tsx` - sortBy prop a sorting logika
- `src/App.tsx` - sort state, handler, toolbar layout
- `src/styles/app.css` - .toolbar-content styly

### Poznámky

- Fáze 17D byla již hotová z 17A - pouze označena v PLAN.md
- Sort options: startOrder, rank (default), bib
- DNS/DNF/DSQ závodníci jsou vždy na konci, řazení podle startOrder
- Toolbar nyní obsahuje GateGroupSwitcher vlevo a SortSelector vpravo

---

## 2026-01-17 - Fáze 17F: Tablet optimalizace

### Cíl iterace

Přidat tablet breakpointy a zvýšit touch targets na 48px pro lepší ergonomii na dotykových zařízeních.

### Dokončeno

- [x] Přidány tablet breakpointy:
  - 1366px: iPad Pro landscape, Surface Pro landscape
  - 1024px: iPad landscape, Surface Pro portrait
  - 768px: iPad portrait (již existovalo)
- [x] Touch targets zvětšeny z 44px na 48px:
  - Globální min-height v app.css
  - Penalty cells v ResultsGrid
  - Check buttons v ResultsGrid
  - Group buttons v GateGroupSwitcher
  - History items v Settings
- [x] Tablet-specifické úpravy:
  - Menší padding na 1024px a 1366px
  - Menší font-size pro labels na 1024px
  - Race bar title zmenšen na tablet

### Změny souborů

- `src/styles/app.css` - globální tablet breakpointy a touch targets 48px
- `src/components/Layout/Layout.module.css` - tablet padding
- `src/components/ResultsGrid/ResultsGrid.css` - tablet breakpointy, touch 48px
- `src/components/RaceBar/RaceBar.css` - tablet breakpointy
- `src/components/GateGroupSwitcher/GateGroupSwitcher.module.css` - tablet breakpointy, touch 48px
- `src/components/Settings/Settings.css` - touch 48px

### Poznámky

- Aplikace je navržena pro velké tablety (iPad Pro, Surface Pro), ne pro mobily
- 48px touch targets jsou lepší než 44px pro ergonomii (snadnější trefit prstem)
- Screenshoty pro tablet odloženy - E2E testy jsou zastaralé a vyžadují refaktoring

---

## 2026-01-17 - Fáze 17G: Cleanup screenshoty

### Cíl iterace

Vyčistit screenshot složku - smazat zastaralé a mobilní screenshoty.

### Dokončeno

- [x] Smazán `scoring-live-replay.png` - starý screenshot před redesignem
- [x] Smazány mobilní screenshoty `15-mobile-view.png` a `16-mobile-settings.png`
- [x] Aktualizován PLAN.md

### Poznámky

- Tablet screenshoty (17G.3) odloženy - E2E testy jsou zastaralé (používají staré selektory)
- Zůstává 15 screenshotů dokumentujících aktuální stav aplikace
- Aplikace je optimalizována pro tablet, ne pro mobil

---

## 2026-01-17 - Fáze 17H: Settings konsolidace

### Cíl iterace

Audit a konsolidace settings ikon - řešení problému "3× zubatá kola".

### Dokončeno

- [x] 17H.1: Audit settings ikon v celé aplikaci
- [x] 17H.2: Verifikace že je jediný vstup: header ⚙ + Ctrl+,
- [x] 17H.3: Potvrzeno že footer a grid nemají settings ikony
- [x] 17H.4: Aktualizace PLAN.md

### Audit výsledky

| Umístění | Ikona | Akce | Status |
|----------|-------|------|--------|
| Header | ⚙ | Otevře Settings modal | ✅ Správně |
| Ctrl+, | - | Otevře Settings modal | ✅ Správně |
| GateGroupSwitcher | ✎ | Otevře GateGroupEditor | ✅ Odlišená ikona |
| EmptyState (disconnected) | - | "Open Settings" button | ✅ Kontextuální |
| Settings > Display | - | "Edit Gate Groups" button | ✅ Textové |
| Footer | - | Žádná settings ikona | ✅ Čisté |

### Poznámky

- Problém "3× zubatá kola" byl již vyřešen v předchozích fázích
- Fáze 17A změnila ikonu u gate groups z ⚙ na ✎ (edit)
- Footer obsahuje pouze verzi a check progress, žádné settings
- Aktuální stav je čistý a konzistentní

---

## 2026-01-17 - Redesign Header + Gate Group Indicators

### Cíl iterace

Redesign hlavičky z 3 pruhů (~250px) na jeden kompaktní řádek (~44px) a přesun gate group indikátorů do gridu.

### Iterace 1: Nový Header ✅

- [x] Vytvořena `RaceSelector` komponenta se šipkami a dropdown selectorem
- [x] Přepsána `Header` komponenta na kompaktní DS header
- [x] Zjednodušen `Layout` - odstraněny `raceBar` a `toolbar` props
- [x] Aktualizován `App.tsx` s novými props

### Iterace 2: Gate Group Indicators ✅

- [x] Vytvořena `GateGroupIndicatorRow` komponenta v ResultsGrid
- [x] Integrováno do ResultsGrid jako řádek nad čísly branek
- [x] Přidány dimming styly pro neaktivní gate skupiny
- [x] PenaltyCell rozšířen o `isDimmed` prop

### Iterace 3: Start Time sloupec ✅

- [x] Přidán `showStartTime` do useSettings
- [x] Přidán toggle v Settings modal (Display tab)
- [x] Přidán Start Time sloupec do ResultsGrid (podmíněný)
- [x] Poznámka: Finish time není implementován - C123ResultRow nemá finishTime pole

### Iterace 4: Cleanup ✅

- [x] Smazány složky `src/components/RaceBar/` a `src/components/GateGroupSwitcher/`
- [x] Aktualizovány exporty v `src/components/index.ts`
- [x] Odstraněny nepoužívané `.toolbar-content` styly z app.css
- [x] Build verification

### Smazané soubory

```
src/components/RaceBar/         (celá složka)
src/components/GateGroupSwitcher/  (celá složka)
```

### Poznámky

- Header je nyní jeden kompaktní pruh (~44px) místo 3 pruhů (~250px)
- Gate groups jsou nyní vizualizovány jako barevné pruhy nad sloupci branek v gridu
- Klik na skupinu aktivuje dimming ostatních sloupců
- Start time sloupec je volitelný (Settings > Display)

---

## 2026-01-18 - Fáze 18 analýza (BLOKOVÁNO)

### Cíl iterace

Implementovat automatické načítání gate groups ze segmentů trati (fáze 18 z PLAN.md).

### Zjištění

Fáze 18 je **blokována** - vyžaduje změny v c123-server, což je v rozporu s pravidlem v CLAUDE.md.

**Analýza problému:**

1. **XML data obsahují segment info:**
   - `CourseData.CourseConfig: "NNRNSNNRNSRNNNSRNNNSRRNS"` kde `S` = split boundary
   - Dokumentováno v `c123-protocol-docs/c123-xml-format.md`

2. **c123-server neparsuje CourseData:**
   - `XmlDataService.ts` parsuje pouze `Participants`, `Schedule`, `Results`
   - `CourseData` element je ignorován
   - REST API nemá endpoint `/api/xml/courses`

3. **TCP stream nemá segment info:**
   - `RaceConfig` zpráva má `gateConfig: "NNRNNRNRNNNRNNRNRNNRNNRN"` (bez S)
   - `nrSplits` říká počet splitů, ale ne jejich pozice

4. **c123-scoring je připraven:**
   - Typy `CourseSegment`, `createGroupsFromSegments()` existují
   - `useGateGroups` hook má placeholder `parseSegmentsFromConfig()` vracející `[]`

**Závěr:** Bez změny c123-serveru nelze segment data získat.

### Dokončeno

- [x] Analýza struktury dat v c123-server
- [x] Analýza XML formátu v c123-protocol-docs
- [x] Aktualizace PLAN.md:
  - Fáze 18 označena jako BLOKOVÁNO
  - Přidána explicitní závislost na c123-server změnách
  - Vytvořena Fáze 19 (E2E test refaktoring) jako alternativa

### Poznámky

**Pro odblokování fáze 18 je potřeba:**
1. Schválení změn v c123-server (výjimka z pravidla v CLAUDE.md)
2. Implementace v c123-server:
   - Parsování `CourseData` v `XmlDataService.ts`
   - REST endpoint `GET /api/xml/courses`
3. Až poté implementace v c123-scoring

**Alternativa:** Přeskočit na fázi 19 (E2E testy) která je nezávislá.

---

## 2026-01-18 - Fáze 19: E2E Test Refaktoring

### Cíl iterace

Aktualizovat E2E testy po redesignu UI - opravit zastaralé selektory a regenerovat screenshoty.

### Dokončeno

- [x] **screenshots-static.spec.ts:**
  - Opraveny selektory pro Settings modal (použity data-testid atributy)
  - Odstraněn mobilní test (16-mobile-settings) - aplikace cílí na tablety
  - Přidán test pro Display tab (05-settings-display)

- [x] **screenshots-with-data.spec.ts:**
  - Opraven selektor pro race selector: `.race-selector select` → `select[aria-label="Select race"]`
  - Odstraněn neexistující selektor `.competitor-row` → použit `.results-grid tbody tr`
  - Přejmenované screenshoty pro lepší popis:
    - `10-grid-oncourse-section` → `10-gate-group-active`
    - `11-gate-group-switcher` → `11-gate-group-indicators`
    - `12-gate-group-editor` → `12-settings-display`
  - Přeuspořádány testy (dark mode před tablet testy)

- [x] **Screenshot regenerace:**
  - Spuštěn `./scripts/take-screenshots.sh`
  - 16 testů prošlo (5 statických + 11 s daty)
  - 17 screenshotů vygenerováno
  - Smazány staré screenshoty s nesprávnými názvy

### Vygenerované screenshoty

| # | Název | Popis |
|---|-------|-------|
| 01 | disconnected | Stav bez připojení |
| 02 | connecting | Připojování k serveru |
| 03 | settings-panel | Settings modal - Server tab |
| 04 | settings-keyboard | Settings modal - Keyboard shortcuts |
| 05 | settings-display | Settings modal - Display options |
| 07 | race-selector | Header s race selectorem |
| 08 | grid-finished | Grid se závodníky |
| 09 | grid-cell-focus | Grid s focusem na buňce |
| 10 | gate-group-active | Aktivovaná gate group s dimming efektem |
| 11 | gate-group-indicators | Gate group indikátory v gridu |
| 12 | settings-display | Settings Display tab s daty |
| 13 | competitor-actions | Context menu pro závodníka |
| 14 | check-progress | Footer s check progress |
| 17 | dark-mode | Tmavý režim |
| 18 | tablet-landscape | iPad Pro landscape |
| 19 | tablet-portrait | iPad Pro portrait |

### Poznámky

- Screenshot 06 (no-competitors) chybí - obtížné vytvořit specifický stav
- Screenshoty 15-16 (mobile) odstraněny - aplikace cílí na tablety
- RaceSelector používá DS Select komponenty, ne vlastní CSS třídy
- Settings modal má data-testid atributy pro spolehlivé testování

---

## 2026-01-18 - Fáze 18B: Auto-load Gate Groups

### Cíl iterace

Implementovat automatické načítání gate groups ze segmentů trati z REST API `/api/xml/courses`.

### Dokončeno

- [x] **API client:** Nový `src/services/coursesApi.ts` pro fetch `/api/xml/courses`
- [x] **Helper funkce:** `createSegmentsFromSplits()` v `src/types/gateGroups.ts`
- [x] **Hook update:** `useGateGroups` nyní:
  - Fetchuje courses z REST API při připojení
  - Vytváří segment groups z splits dat
  - Exportuje `availableCourses`, `coursesLoading`, `reloadCourses`
- [x] **Barvy segmentů:** Přidána `SEGMENT_COLORS` paleta pro vizuální odlišení
- [x] **UI integrace:** Segment groups se automaticky zobrazují v `GateGroupIndicatorRow`

### Změny souborů

- `src/services/coursesApi.ts` - nový API client
- `src/services/index.ts` - export coursesApi
- `src/types/gateGroups.ts` - `createSegmentsFromSplits()`, `SEGMENT_COLORS`
- `src/hooks/useGateGroups.ts` - fetch courses, nové return hodnoty

### Architektura

```
c123-scoring                     c123-server
     │                                │
     │ GET /api/xml/courses          │
     ├───────────────────────────────>│
     │                                │
     │ { courses: [                   │
     │   { courseNr: 1,               │
     │     splits: [5, 9, 14, ...] }  │
     │ ]}                             │
     │<───────────────────────────────┤
     │                                │
     ▼
createSegmentsFromSplits([5, 9, 14], 24)
     │
     ▼
[Segment 1 (1-5), Segment 2 (6-9), Segment 3 (10-14), ...]
```

### Poznámky

- Segment groups se zobrazují automaticky v gridu nad gate headers
- Klik na segment aktivuje dimming ostatních sloupců (stejně jako custom groups)
- Replay server nemá CourseData, segmenty se zobrazí pouze s reálným C123/XML
- Fáze 18C (verifikace) vyžaduje testování s reálným XML

---

## 2026-01-18 - Fáze 20F: Grid highlighting redesign

### Cíl iterace

Změnit grid highlighting z background podbarvení na border, pro lepší čitelnost.

### Dokončeno

- [x] Row focus: horizontální bordery (top/bottom) na všech buňkách v řádku
- [x] Column focus: vertikální bordery (left/right) na všech buňkách ve sloupci
- [x] Focused buňka: plný 2px accent border
- [x] Hover: jemný 1px muted border
- [x] Crosshair efekt: kombinované row+column bordery na průsečíku buněk
- [x] Změna `--in-group` z box-shadow na border-top (aby se nekonflikovalo)

### Změněné soubory

- `src/components/ResultsGrid/ResultsGrid.css` - nové border-based highlight styly

### Poznámky

- Původní background highlighting používal `color-mix()` pro průhledné overlay
- Box-shadow se vzájemně přepisují, takže kombinace stylů vyžadovala explicitní CSS pravidla
- `--in-group` změněno na `border-top` místo `box-shadow` aby fungovalo spolu s row/column highlights

---

## 2026-01-18 - Fáze 20G: Theme toggle

### Cíl iterace

Přidat možnost explicitně přepnout mezi light/dark mode v Settings.

### Dokončeno

- [x] Přidán typ `ThemeMode = 'auto' | 'light' | 'dark'` do `useSettings.ts`
- [x] Přidáno `theme` pole do `Settings` interface s defaultem 'auto'
- [x] Theme selector v Settings modal (Display tab) pomocí DS Select komponenty
- [x] `useEffect` v `App.tsx` aplikuje `.theme-light` / `.theme-dark` třídy na `document.documentElement`
- [x] Auto mode neaplikuje žádnou třídu - DS používá `@media (prefers-color-scheme: dark)`

### Změněné soubory

- `src/hooks/useSettings.ts` - nový typ a pole `theme`
- `src/components/Settings/Settings.tsx` - theme selector v Display tabu
- `src/App.tsx` - useEffect pro aplikování theme tříd

### Poznámky

- Design system (`timing-design-system`) používá CSS třídy `.theme-light` a `.theme-dark` na `:root` elementu
- Pokud není nastavena žádná třída, DS automaticky respektuje systémové preference pomocí `@media (prefers-color-scheme: dark)`
- Persistence do localStorage je automatická díky existující logice v `useSettings`

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
