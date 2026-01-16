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
