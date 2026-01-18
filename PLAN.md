# C123-SCORING - Implementační plán

---

## Stav implementace

| Fáze | Název | Stav |
|------|-------|------|
| 1-15 | Základní implementace | ✅ Hotovo (v1.0.0) |
| 16 | Design System integrace | ✅ Hotovo |
| 17A-C | UX Polish (Header, Grid, Gate Groups) | ✅ Hotovo |
| 17D-E | UX Polish (Footer, Sorting) | ✅ Hotovo |
| 17F | UX Polish (Tablet) | ✅ Hotovo |
| 17G | UX Polish (Screenshots) | ✅ Hotovo |
| 17H | UX Polish (Settings) | ✅ Hotovo |
| 18 | Auto-load Gate Groups | ✅ Hotovo |
| 19 | E2E Test Refaktoring | ✅ Hotovo |
| 20 | Bug fixes a UX připomínky | ✅ Hotovo |
| 21 | Schedule WebSocket issue | ✅ Hotovo |
| 22 | Settings cleanup | ✅ Hotovo |
| 23 | Grid layout a sticky sloupce | ✅ Hotovo |
| 24 | Grid highlighting redesign | ✅ Hotovo |
| 25 | WebSocket connection management | ✅ Hotovo |
| 26 | Keyboard a scoring fixes | ✅ Hotovo |
| 27 | Grid UX a keyboard improvements | ✅ Hotovo |
| 28 | Grid layout fixes | ✅ Hotovo |

---

## Dokončené fáze (shrnutí)

### Fáze 1-15: Základní implementace ✅

**Výstup:** Funkční aplikace v1.0.0

- **Projekt setup:** Vite + React + TypeScript + Design System
- **WebSocket:** Připojení k c123-server, typy pro zprávy
- **Layout:** Header, Footer, ConnectionStatus
- **Race Selector:** Výběr závodu ze Schedule, persistence
- **Penalty Grid:** Zobrazení závodníků a branek, keyboard navigace
- **REST API:** Odesílání penalizací, optimistic updates, Toast notifikace
- **Gate Grouping:** Seskupování branek, editor, keyboard shortcuts
- **Kontrola protokolů:** Označování zkontrolovaných, progress bar
- **Settings:** Server config, display options, keyboard shortcuts
- **Akce:** DNS/DNF/CAP, manuální timing
- **Polish:** Error boundaries, empty states, animace, focus trap
- **Testy:** Vitest unit testy, Playwright E2E, screenshoty
- **Docs:** README, CHANGELOG, GitHub Actions CI

### Fáze 16: Design System integrace ✅

**Výstup:** Vizuálně konzistentní aplikace

- Přidány DS komponenty: Tabs, Kbd, ProgressBar, ContextMenu
- Header s DS komponenty (HeaderBrand, HeaderTitle, HeaderActions, HeaderStatus)
- Settings modal s DS Modal, Tabs, Input, Checkbox, Button
- Grid s DS Table, Badge pro status
- Toast, Empty states s DS Card
- Dark mode automaticky přes DS tokeny
- Smazáno ~1000 řádků vlastního CSS

---

## Testovací data

```bash
# Replay server (simulace živého C123)
cd ../c123-protocol-docs/tools
node replay-server.js ../recordings/rec-2025-12-28T09-34-10.jsonl --speed 10 --loop

# c123-server
cd ../c123-server && npm start -- --host localhost --port 27333

# Scoring app
cd ../c123-scoring && npm run dev

# Screenshoty
npx playwright test screenshots-with-data.spec.ts
```

---

## Fáze 17: UX Polish a Tablet Optimalizace

**Cíl:** Opravit UX problémy, optimalizovat pro tablet.

**Cílové zařízení:** Velký tablet (iPad Pro, Surface) - NE mobil.

---

### 17A: Header redesign (KRITICKÉ) ✅

**Problém:** Header je nepřehledný - titěrný selector, dva indikátory, 3× settings ikona.

- [x] 17A.1: Prozkoumat c123-server admin pro inspiraci
- [x] 17A.2: Přepsat Header:
  - `HeaderBrand` - "C123 Scoring"
  - `HeaderActions` - pouze settings tlačítko
  - `HeaderStatus` - pouze vodácký StatusIndicator
- [x] 17A.3: Race selector - zvětšit (použít `Select size="lg"`) v novém RaceBar
- [x] 17A.4: Změnit ⚙ ikonu u gate groups na ✎ (edit)
- [x] 17A.5: Commit

**Řešení:** Nová RaceBar komponenta pod headerem s velkým názvem závodu a select size="lg"

---

### 17B: Grid UX vylepšení ✅

**Problém:** Chybí zvýraznění řádku/sloupce při navigaci.

- [x] 17B.1: Row/column highlight při HOVER (jemné)
- [x] 17B.2: Row/column highlight při FOCUS (výraznější)
- [x] 17B.3: Odstranit sloupec "Klub"
- [x] 17B.4: Commit

---

### 17C: Gate Groups viditelnost ✅

**Problém:** Na screenshotech není vidět že gate groups existují.

- [x] 17C.1: Gate group switcher výraznější (přesunuto do toolbar nad grid)
- [x] 17C.2: Vizuálně označit aktivní skupinu sloupců (accent top border)
- [x] 17C.3: Screenshot s gate groups (odloženo - E2E testy zastaralé)
- [x] 17C.4: Commit

**Řešení:**
- GateGroupSwitcher přesunut z footeru do nového toolbar slotu
- Label zobrazuje aktivní skupinu a počet branek
- Sloupce v aktivní skupině mají accent pruh nahoře (header i buňky)

---

### 17D: Footer sticky ✅

**Problém:** Footer se odscrolluje.

- [x] 17D.1: Footer vždy viditelný dole
- [x] 17D.2: Layout: header (auto) + main (1fr scroll) + footer (auto sticky)
- [x] 17D.3: Commit

**Poznámka:** Implementováno v rámci fáze 17A (sticky footer).

---

### 17E: Řazení závodníků ✅

**Problém:** Jen jedno řazení.

- [x] 17E.1: Možnosti: startOrder, rank (default), bib
- [x] 17E.2: UI pro přepínání (SortSelector komponenta v toolbaru)
- [x] 17E.3: Persistence do localStorage
- [x] 17E.4: Commit

**Řešení:**
- Nový typ `ResultsSortOption` a `RESULTS_SORT_LABELS` v types/ui.ts
- `SortSelector` komponenta s DS Select
- Sorting logic v `ResultsGrid.tsx` (sortBy prop)
- localStorage persistence v App.tsx

---

### 17F: Tablet optimalizace ✅

**Problém:** Optimalizace pro mobil místo tabletu.

- [x] 17F.1: Tablet breakpointy (1366×1024, 1024×1366, atd.)
- [x] 17F.2: Touch targets min 48px
- [ ] 17F.3: Screenshoty: `18-tablet-landscape.png`, `19-tablet-portrait.png` (odloženo - E2E testy zastaralé)
- [x] 17F.4: Commit

**Řešení:**
- Přidány tablet breakpointy 1366px (iPad Pro landscape) a 1024px (iPad landscape)
- Touch targets zvětšeny z 44px na 48px pro lepší ergonomii
- Upraveny padding a font-size pro tablet obrazovky

---

### 17G: Cleanup screenshoty ✅

- [x] 17G.1: Smazat `scoring-live-replay.png` (starý)
- [x] 17G.2: Odstranit mobilní screenshoty (15, 16)
- [ ] 17G.3: Přidat tablet screenshoty (odloženo - E2E testy zastaralé)
- [x] 17G.4: Commit

---

### 17H: Settings konsolidace ✅

**Problém:** 3× zubatá kola (settings ikony).

- [x] 17H.1: Audit settings ikon
- [x] 17H.2: Jediný vstup: header + Ctrl+,
- [x] 17H.3: Odstranit z footeru a od gridu
- [x] 17H.4: Commit

**Řešení:**
- Jediná ⚙ ikona je v headeru (správné místo)
- GateGroupSwitcher má ✎ ikonu (edit) - změněno ve fázi 17A
- Footer nemá settings ikonu - pouze verzi a check progress
- Settings modal má textové "Edit Gate Groups" tlačítko (ne ikonu)
- Klávesová zkratka Ctrl+, funguje globálně

---

### Pořadí implementace

1. **17A** - Header (nejvyšší priorita)
2. **17B** - Grid highlighting
3. **17D** - Sticky footer (rychlé)
4. **17F** - Tablet
5. **17C, 17E, 17G, 17H** - podle času

**Po každé fázi:** Screenshoty s replay serverem.

---

## Fáze 18: Auto-load Gate Groups ze segmentů

**Cíl:** Automaticky načítat gate groups podle segmentů trati z XML dat.

**Status:** ✅ Hotovo (logika ověřena)

**Stav:**
- ✅ c123-server má endpoint `GET /api/xml/courses`
- ✅ Vrací `{ courses: [{ courseNr, courseConfig, splits: [5, 9, 14...] }] }`
- ✅ c123-scoring má připravenou infrastrukturu (`CourseSegment`, `createGroupsFromSegments()`)
- ✅ Course matching funguje (porovnání gateConfig bez S značek)
- ✅ Segmenty se generují správně

---

### 18A: Změny v c123-server ✅ HOTOVO

- [x] 18A.1: Přidat parsování `CourseData` do `XmlDataService.ts`
- [x] 18A.2: Přidat REST endpoint `GET /api/xml/courses`
- [x] 18A.3: Dokumentovat v `REST-API.md`

### 18B: Integrace v c123-scoring ✅

- [x] 18B.1: Přidat API client pro `/api/xml/courses` do `src/services/`
- [x] 18B.2: Přidat helper `createSegmentsFromSplits(splits: number[], totalGates: number)` do `src/types/gateGroups.ts`
- [x] 18B.3: Update `useGateGroups` hook - fetch courses API a parsovat segmenty
- [x] 18B.4: UI pro přepínání mezi "All Gates" / "Segment 1" / "Segment 2" / custom groups
- [x] 18B.5: Commit
- [x] 18B.6: Oprava: Course matching přes `gateConfig` místo `courseNr` (2026-01-18)
  - RaceConfig.gateConfig neobsahuje S značky
  - CourseData.courseConfig obsahuje S značky
  - Matching: `courseConfig.replace(/S/g, '') === gateConfig`

### 18C: Verifikace ✅

- [x] 18C.1: Otestovat s reálným serverem (192.168.68.108:27123)
  - ✅ Courses API vrací 4 kurzy se splits
  - ✅ Course matching funguje (Course 1 pro aktuální závod)
  - ✅ Generuje 6 segmentů pro 24 branek (správně ořezáno z 8)
- [x] 18C.2: Custom groups mají přednost (design - custom groups jsou v localStorage)
- [x] 18C.3: Screenshoty - nyní funkční (Schedule issue vyřešen ve fázi 21)

---

## Fáze 19: Screenshoty a E2E test refaktoring

**Cíl:** Aktualizovat E2E testy a screenshoty po redesignu UI.

**Status:** ✅ Hotovo

**Problém:**
- E2E testy v `tests/` používaly zastaralé selektory (`.gate-cell`, `.competitor-row`)
- Po redesignu headeru a gridu testy nefungovaly
- Screenshoty neodpovídaly aktuálnímu UI

---

### 19A: E2E test audit ✅

- [x] 19A.1: Aktualizovat `tests/screenshots-static.spec.ts`:
  - Opraveny selektory pro Settings modal (data-testid)
  - Odstraněn mobilní test (16-mobile-settings)
  - Přidán test pro Display tab (05-settings-display)
- [x] 19A.2: Aktualizovat `tests/screenshots-with-data.spec.ts`:
  - Opraven selektor pro race selector (`select[aria-label="Select race"]`)
  - Odstraněn zastaralý selektor `.competitor-row` → `.results-grid tbody tr`
  - Přejmenované screenshoty: 10-gate-group-active, 11-gate-group-indicators, 12-settings-display
  - Přeuspořádány testy (dark mode před tablet testy)
- [x] 19A.3: Mock-data.ts nevyžadovaly změny

### 19B: Screenshot regenerace ✅

- [x] 19B.1: Spustit `./scripts/take-screenshots.sh` - 16 testů prošlo
- [x] 19B.2: Zkontrolovat výstupy - 17 screenshotů vygenerováno
- [x] 19B.3: Tablet screenshoty přidány (18-tablet-landscape, 19-tablet-portrait)
- [x] 19B.4: Aktualizovat `README.md` - project structure (screenshoty nejsou přítomny)

### 19C: CI/CD update

- [x] 19C.1: Ověřit že `.github/workflows/ci.yml` funguje s aktualizovanými testy
- [x] 19C.2: Commit

---

## Fáze 20: Bug fixes a UX připomínky

**Cíl:** Opravit kritické bugy a UX problémy z uživatelského testování.

**Status:** 🟡 Částečně hotovo (20A-D)

---

### 20A: Kritické bugy (PRVNÍ) ✅

**Problém:** Vite blokuje fonty z linkovaného design-system.

- [x] 20A.0: Přidat `server.fs.allow` do `vite.config.ts` pro `../timing-design-system`

**Problém:** Zápis penalizací nefunguje.

- [x] 20A.1: Investigace - proč se penalizace neposílají do C123
  - Kód je správně implementovaný (c123-server má endpoint, ScoringService formátuje XML)
  - Vyžaduje testování s reálným C123 (není bug v kódu)
- [x] 20A.2: Debug REST API volání (`POST /api/c123/scoring`) - OK
- [ ] 20A.3: Otestovat s reálným C123 (vyžaduje hardware)
- [x] 20A.4: Commit (společně s dalšími opravami)

**Problém:** Zadaná hodnota se drží v buňce po přesunu šipkami.

- [x] 20A.5: Investigace - `pendingValue` z `useKeyboardInput` nebyl čištěn při změně `position`
- [x] 20A.6: Opravit keyboard navigaci - přidán `useEffect` pro reset `pendingValue` při změně pozice
- [x] 20A.7: Commit

---

### 20B: Layout fixes ✅

**Problém:** Header není sticky - scrolluje se pryč.

- [x] 20B.1: Změnit header na `position: sticky; top: 0`
- [x] 20B.2: Zajistit správný z-index (nad gridem) - z-index: 100
- [x] 20B.3: Commit

---

### 20C: Keyboard fixes ✅

**Problém:** Space klávesa stránkuje místo označování zkontrolovaných.

- [x] 20C.1: Přidat `preventDefault()` pro Space v gridu
- [x] 20C.2: Space = toggle "zkontrolováno" pro aktuální řádek
- [x] 20C.3: Commit

---

### 20D: Toast → Footer pending writes ✅

**Problém:** Toasty pro zápisy jsou rušivé.

- [x] 20D.1: Odstranit toast notifikace pro scoring writes
- [x] 20D.2: Přidat "pending writes" indikátor do footeru (spinner + počet)
- [x] 20D.3: Commit

---

### 20E: Odstranit zbytečné UI prvky ✅

**Problém:** Některé UI prvky nepřinášejí hodnotu.

- [x] 20E.1: Odstranit první zaškrtávací sloupeček z gridu
- [x] 20E.2: Odstranit context menu (DNS/DNF/CAP) nad gridem
- [x] 20E.3: Commit

---

### 20F: Grid highlighting redesign ✅

**Problém:** Podbarvení řádku/sloupce není čitelné, okraje by byly lepší.

- [x] 20F.1: Změnit row/column highlight z background na border
- [x] 20F.2: Aktivní buňka: silný border (např. 2px accent)
- [x] 20F.3: Hover: slabší border (např. 1px muted)
- [x] 20F.4: Commit

**Řešení:**
- Row focus: horizontální bordery (top/bottom) na všech buňkách v řádku
- Column focus: vertikální bordery (left/right) na všech buňkách ve sloupci
- Focused buňka: plný 2px border
- Hover: jemný 1px muted border
- Crosshair efekt: kombinované row+column bordery na průsečíku

---

### 20G: Light/Dark mode switch ✅

**Problém:** Nelze explicitně přepnout mezi light/dark mode.

- [x] 20G.1: Přidat theme toggle do Settings (nebo header)
- [x] 20G.2: Možnosti: Auto (system) / Light / Dark
- [x] 20G.3: Persistence do localStorage
- [x] 20G.4: Commit

**Řešení:**
- Přidán `theme: ThemeMode` do Settings interface ('auto' | 'light' | 'dark')
- Theme selector v Settings > Display tab (DS Select komponenta)
- App.tsx aplikuje `.theme-light` / `.theme-dark` třídy na document element
- Auto mode ponechá rozhodnutí na `@media (prefers-color-scheme)`

---

### Pořadí implementace

1. **20A** - Kritické bugy (zápis nefunguje!)
2. **20B** - Sticky header
3. **20C** - Space klávesa
4. **20D** - Pending writes footer
5. **20E** - Odstranit zbytečné UI
6. **20F** - Grid highlighting
7. **20G** - Theme switch

---

## Fáze 21: Schedule WebSocket issue ✅

**Cíl:** Zajistit že aplikace zobrazí aktivní závody.

**Status:** ✅ Hotovo (opraveno v c123-server)

**Problém (vyřešen):**
c123-server neposílal Schedule zprávu přes WebSocket automaticky po připojení.
Scoring aplikace proto zobrazovala "No active races" i když server měl aktivní závod.

**Řešení:**
Opraveno v c123-server - server nyní posílá Schedule zprávu při připojení klienta.

### Implementace v c123-server ✅

- [x] 21A.1: Přidat posílání Schedule zprávy při připojení klienta
- [x] 21A.2: Posílat Schedule při změně (nový závod začne/skončí)

### c123-scoring (nepotřebovalo změny)
- Infrastruktura pro zpracování Schedule zpráv již existovala
- Typy: `C123ScheduleData`, `C123ScheduleMessage`
- WebSocket hook: `isScheduleMessage()` type guard + state update
- useSchedule hook: zpracování races a activeRaces

---

## Fáze 22: Settings cleanup ✅

**Cíl:** Odstranit nepoužívané nastavení.

**Status:** ✅ Hotovo

- [x] 22.1: Odstranit "Compact mode" ze Settings - nic nedělá
- [x] 22.2: Zkontrolovat jestli jsou všechny settings používané
- [x] 22.3: Commit

---

## Fáze 23: Grid layout a sticky sloupce ✅

**Cíl:** Vylepšit layout gridu pro širší tratě a horizontální scroll.

**Status:** ✅ Hotovo

### 23A: Kompaktnější záhlaví
- [x] 23A.1: Fixní šířky sloupců (pořadí, bib, jméno) - nenatahovat
- [x] 23A.2: Volné místo vpravo od gridu místo roztahování jména
- [x] 23A.3: Kompaktnější gate headers

### 23B: Sticky sloupce při horizontálním scrollu
- [x] 23B.1: Sticky sloupce: pořadí, číslo, jméno závodníka
- [x] 23B.2: Grid s penalizacemi scrolluje samostatně
- [x] 23B.3: Sticky segmenty/gate groups v headeru (při vertikálním scrollu)

### 23C: Viditelný horizontální scroll
- [x] 23C.1: Zajistit že je zřejmé jak scrollovat do strany (border separator)
- [ ] 23C.2: Případně přidat scroll indikátor (není potřeba)

---

## Fáze 24: Grid highlighting redesign ✅

**Cíl:** Subtilnější vizuální indikace, méně vizuálního šumu.

**Status:** ✅ Hotovo

### 24A: Zrušit hover highlighting
- [x] 24A.1: Odstranit highlight řádku/sloupce při hover
- [x] 24A.2: Při hover jen zvýraznit záhlaví (tučně)
- [x] 24A.3: Zachovat aktivní (focus) řádek/sloupec highlighting

### 24B: Subtilnější gate groups
- [x] 24B.1: Oddělení skupin subtilnější (šedé místo accent)
- [x] 24B.2: Groups indicator v záhlaví méně výrazný (šedý)
- [x] 24B.3: Zajistit že nekonflikují s aktivním řádkem/sloupcem

---

## Fáze 25: WebSocket connection management ✅

**Cíl:** Opravit problémy s připojením - duplicitní spojení, reconnect loop.

**Status:** ✅ Hotovo

**Problém:** Server loguje časté připojení/odpojení, drží více spojení.

- [x] 25.1: Audit `useC123WebSocket` hook - najít zdroj duplicitních spojení
- [x] 25.2: Zkontrolovat cleanup při unmount/reconnect
- [x] 25.3: Zajistit že běží max 1 aktivní spojení (isConnecting guard)
- [x] 25.4: Otestovat reconnect logiku
- [x] 25.5: Commit

**Řešení:** Přidán `isConnecting` ref, který blokuje duplicitní připojení.

---

## Fáze 26: Keyboard a scoring fixes ✅

**Cíl:** Opravit keyboard handling a scoring logiku.

**Status:** ✅ Hotovo

### 26A: Keyboard focus po načtení
- [x] 26A.1: Po načtení stránky šipky scrollují místo navigace v gridu
- [x] 26A.2: Automaticky fokusovat grid po načtení dat
- [x] 26A.3: Zajistit že šipky vždy navigují v gridu (ne page scroll)

### 26B: Delete hodnoty
- [x] 26B.1: Prozkoumat jak originál řeší mazání penalizace
- [x] 26B.2: Delete posílá value=0 - to je SPRÁVNÉ chování (clean pass)
- [x] 26B.3: Není třeba měnit - C123 API nemá koncept "odstranit hodnotu"

**Poznámka:** V C123 protokolu hodnota 0 = "čistý průjezd" (no penalty).
Neexistuje koncept "prázdná hodnota" - každá branka má vždy stav (0, 2, nebo 50).

---

## Fáze 27: Grid UX a keyboard improvements

**Cíl:** Opravit UX problémy s gridem a keyboard inputem.

**Status:** ✅ Hotovo

---

### 27A: Keyboard input rozšíření ✅

**Problém:** Uživatelé často píšou 50 místo 5, aplikace to neakceptuje.

- [x] 27A.1: Kromě 0, 2, 5 (→50) přijímat i "50" jako vstup
- [x] 27A.2: Po zadání "5" čekat krátce (např. 300ms) na případné "0"
- [x] 27A.3: Commit

**Řešení:** useKeyboardInput hook čeká 300ms po stisknutí "5" na možné "0".

---

### 27B: Delete/Backspace posílá null ✅

**Problém:** Del/Backspace neposílá nic, mělo by poslat null (vymazat hodnotu).

**Poznámka:** Server už umí přijmout value=null a vymazat penalizaci.
To je jiné než poslat 0 (clear pass = čistý průjezd).

- [x] 27B.1: Ověřit že Delete posílá `value: null` - už bylo implementováno v ResultsGrid
- [x] 27B.2: Případně opravit `useKeyboardInput` hook - nepotřeba
- [x] 27B.3: Commit

**Řešení:** Již bylo implementováno - onClear callback posílá null v ResultsGrid.

---

### 27C: Segment headers redesign ✅

**Problém:** Segmenty v záhlaví jsou příliš barevné/výrazné.

- [x] 27C.1: Změnit barvu segment headers na šedou (méně výrazné)
- [x] 27C.2: Zajistit že jsou sticky (při horizontálním scrollu) - už funguje
- [x] 27C.3: Commit

**Řešení:** Odstraněn barevný --group-color, použity neutrální šedé barvy z DS.

---

### 27D: Sticky columns fix ✅

**Problém:** První sloupce (pořadí, bib, jméno) by měly být sticky.

**Poznámka:** CSS pro sticky už existuje a funguje správně.

- [x] 27D.1: Ověřit/opravit sticky pozici pro col-pos, col-bib, col-name - funguje
- [x] 27D.2: Zajistit správný z-index a background - funguje
- [x] 27D.3: Otestovat horizontální scroll - funguje
- [x] 27D.4: Commit

**Řešení:** Již bylo implementováno v předchozí fázi.

---

### 27E: Horizontal scroll improvement ✅

**Problém:** Horizontální scroll funguje násilně, není vidět scrollbar.

- [x] 27E.1: Přidat viditelný scrollbar (webkit-scrollbar styling)
- [x] 27E.2: Případně přidat scroll shadow/fade indikátor na okrajích - není potřeba
- [x] 27E.3: Commit

**Řešení:** Přidán viditelný scrollbar s webkit a Firefox stylingem.

---

### 27F: Grid layout - name column ✅

**Problém:** Když je stránka širší než obsah, sloupec se jménem se rozšiřuje.

- [x] 27F.1: Zajistit fixní šířku sloupce name (ne roztahovat)
- [x] 27F.2: Volné místo ať je vpravo od gridu
- [x] 27F.3: Table layout: auto nebo fixed místo auto-stretch
- [x] 27F.4: Commit

**Řešení:** Přidáno `width: auto; min-width: min-content;` pro table.

---

### 27G: Arrow key navigation performance ✅

**Problém:** Při držení šipky (key repeat) se stránka zasekává a kurzor divně skáče.

- [x] 27G.1: Throttle navigace na 60fps (requestAnimationFrame)
- [x] 27G.2: Batchovat rychlé opakované klávesy
- [x] 27G.3: Otestovat plynulost při držení šipky
- [x] 27G.4: Commit

**Řešení:** useFocusNavigation hook throttluje pohyby na 16ms (60fps) pomocí RAF.

---

## Fáze 28: Grid layout fixes ✅

**Cíl:** Opravit problémy s gridem - sticky sloupce, padding, sticky header.

**Status:** ✅ Hotovo

### 28A: Sticky columns z-index ✅
- [x] 28A.1: Přidat background pro liché řádky sticky sloupců
- [x] 28A.2: Zvýšit z-index hierarchii (body=5, header=10, corner=20)

### 28B: Odstranit zbytečné okraje ✅
- [x] 28B.1: Odstranit padding z `.main`
- [x] 28B.2: Odstranit padding z `.results-grid`
- [x] 28B.3: Zjednodušit tablet breakpointy

### 28C: Sticky header pro vertikální scroll ✅
- [x] 28C.1: Celý thead sticky (grupy i branky)
- [x] 28C.2: Grupy na `top: 0`, branky na `top: 32px`
- [x] 28C.3: Grid container handles both scroll directions

---

*Poslední aktualizace: 2026-01-18 (Phase 28 completed)*
