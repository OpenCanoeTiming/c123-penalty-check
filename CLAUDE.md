# Claude Code Instructions - C123 Scoring

## Projekt

C123 Scoring - webová aplikace pro kontrolu, korekci a zadávání penalizací slalomových závodů měřených v Canoe123.

**GitHub:** OpenCanoeTiming/c123-scoring | **Licence:** MIT

---

## Cesty a dokumentace

| Účel | Cesta |
|------|-------|
| **Tento projekt** | `/workspace/timing/c123-scoring/` |
| **Projektový záměr** | `./PROJECT.md` |
| **Protokol docs** | `../c123-protocol-docs/` |
| **Design system** | `../timing-design-system/` |
| **C123 Server** | `../c123-server/` (reference pro UDP discovery) |

### Klíčové reference

- **`../c123-protocol-docs/c123-protocol.md`** - C123 protokol, UDP broadcast
- **`../c123-protocol-docs/c123-xml-format.md`** - XML struktura penalizací
- **`./resources-private/`** - Původní business logika (READONLY, nezmiňovat v kódu)

---

## Jazyk

- Komunikace a dokumentace: **čeština**
- Kód, komentáře, commit messages: **angličtina**

---

## Architektura (plánovaná)

```
c123-scoring/
├── src/
│   ├── index.tsx             # Entry point
│   ├── App.tsx               # Hlavní komponenta
│   ├── components/           # UI komponenty
│   │   ├── RaceList/         # Seznam závodů
│   │   ├── RunnerGrid/       # Grid jezdců
│   │   └── PenaltyEditor/    # Inline editace penalizací
│   ├── hooks/                # React hooks
│   ├── services/             # C123 komunikace, UDP discovery
│   └── store/                # State management
├── resources-private/        # Zdrojové materiály (NENÍ v gitu)
└── package.json
```

---

## Klíčové funkce

1. **Zobrazení závodů** - probíhající závody, indikace aktivních
2. **Grid jezdců** - kdo pojede, kdo jede, kdo má dojeto, stav penalizací
3. **Inline editace** - klávesnicové ovládání, navigace šipkami
4. **Seskupování branek** - podle segmentů C123 nebo vlastní skupiny
5. **Kontrola penalizací** - označování zkontrolovaných protokolů
6. **Auto discovery** - UDP broadcast detekce C123 serveru
7. **Persistence** - nastavení v localStorage

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
refactor: extract UDP discovery to service
```

---

*Projektový záměr → viz `./PROJECT.md`*
