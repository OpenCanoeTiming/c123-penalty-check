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
| 17H | UX Polish (Settings) | 📋 Další |

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

### 17H: Settings konsolidace

**Problém:** 3× zubatá kola (settings ikony).

- [ ] 17H.1: Audit settings ikon
- [ ] 17H.2: Jediný vstup: header + Ctrl+,
- [ ] 17H.3: Odstranit z footeru a od gridu
- [ ] 17H.4: Commit

---

### Pořadí implementace

1. **17A** - Header (nejvyšší priorita)
2. **17B** - Grid highlighting
3. **17D** - Sticky footer (rychlé)
4. **17F** - Tablet
5. **17C, 17E, 17G, 17H** - podle času

**Po každé fázi:** Screenshoty s replay serverem.

---

*Poslední aktualizace: 2026-01-17 (Phase 17G)*
