# C123-SCORING implementační projekt

Aplikace c123-scoring bude webová aplikace s vysoce optimalizovaným UX pro kontrolu, korekci a zadávání penalizací slalomových závodů měřených v systému Canoe123.

## Hlavní požadavky

- zobrazení probíhajících závodů podle stavu, indikace aktivního (aktivních) závodů
- zobrazení jezdců v probíhajícím závodu s vyznačením kdo pojede, kdo jede, kdo má dojeto a má dokončený výsledek, zobrazení stavu zadaných penalizací
- aktualizace zobrazení podle nastavení závodu a trati (rozlišení typů branek)

- efektivní "inline" editace v tabulce penalizací, navigace pomocí šipek, obecně ovládání přes klávesnici, zadávání bez zbytečného klikání
- penalizace odpovídají typu závodu ale s dostatečnou flexibilitou C123 ekosystému
- velmi přehledná navigace v tabulce penalizací jezdců - vždy vidím, jakého jezdce a jakou branku edituji

- využití i pro kontrolu penalizací, tedy mohu si označovat, co už je zkontrolované a co není (v případě že kontrolor třeba neobdržel daný protokol)
- možnost seskupování podle branek: kontrolor vždy dostává papírový protokol jen za několik branek a když je grid s brankami a výsledky velký, tak je snadné se ztratit. Výchozí skupiny podle segmentů nastavení Canoe123 trati, ale s možností předefinovat v scoring aplikaci. Navíc s možností definovat segmenty které se překrývají: např. 1. rozhodčí má brány (1,2,3,4), 2. rozhodčí (5,6,7,8), ale pomocný rozhodčí píše protokol pro (4,5,6) a je třeba kontrolovat vše.
- presistence nastavení v local storage

- auto discovery Canoe123 serveru podle UDP broadcastu, podobně jako ji dělá sousední projekt c123-server


## Zdroje a dokumenty

- striktně využívat timing-design-system, pokud nějaká základní komponenta chybí, udělat neostylovanou a vytvořit podnět pro rozšíření design systému. Velmi speciální komponenty jako grid pro zadávání penalizací udělat specificky přímo v aplikaci s využitím stylů design systému. 
- c123-protocol-docs poslouží k dokumentaci rozhraní a formátů
- pro získání původní business logiky využij dokumenty a zdrojové kódy ve složce resources-private, v nové aplikaci ani dokumentaci je ale nijak nezmiňuj