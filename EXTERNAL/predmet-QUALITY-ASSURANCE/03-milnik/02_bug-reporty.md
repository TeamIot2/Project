# Bug Reporty

## Poznámka

Následující záznamy jsou připravené jako realistické vzorové bug reporty navázané na test case z 2. milníku. Jejich obsah je připraven tak, aby odpovídal formátu reportu chyb pro školní výstup. Při reálném testování je nutné ověřit skutečný build, prostředí a reprodukovatelnost.

## BUG-001

- Název: Nově vytvořený záznam se po uložení ihned nezobrazí v seznamu
- Prostředí: `TEST`
- Verze aplikace: `build QA-demo`
- Závažnost: Major
- Stav: New
- Navázaný test: `UMK-RECORD-002`

### Kroky k reprodukci

1. Přihlásit se jako uživatel s rolí `Editor`.
2. Vytvořit nový záznam s validními povinnými poli.
3. Uložit formulář.
4. Vrátit se do seznamu záznamů.

### Testovací data

- Název: `QA test záznam 001`
- Typ: `Standard`

### Očekávaný výsledek

Nově vytvořený záznam je po uložení ihned viditelný v seznamu.

### Skutečný výsledek

Záznam není v seznamu vidět, objeví se až po ručním obnovení stránky.

## BUG-002

- Název: Workflow akce změní stav jen dočasně, po refreshi se vrátí původní hodnota
- Prostředí: `TEST`
- Verze aplikace: `build QA-demo`
- Závažnost: Critical
- Stav: New
- Navázaný test: `UMK-WORKFLOW-003`

### Kroky k reprodukci

1. Otevřít detail záznamu ve stavu `Draft`.
2. Spustit akci `Submit`.
3. Ověřit zobrazení stavu `Submitted`.
4. Obnovit stránku.

### Testovací data

- Záznam: `DRAFT-001`

### Očekávaný výsledek

Stav záznamu zůstane po refreshi `Submitted`.

### Skutečný výsledek

Po refreshi detail opět zobrazuje stav `Draft`.

## BUG-003

- Název: Uživatel s rolí Viewer vidí akci pro změnu workflow stavu
- Prostředí: `TEST`
- Verze aplikace: `build QA-demo`
- Závažnost: Critical
- Stav: New
- Navázaný test: `UMK-ROLE-004`

### Kroky k reprodukci

1. Přihlásit se jako uživatel s rolí `Viewer`.
2. Otevřít detail existujícího záznamu.
3. Zkontrolovat sadu dostupných akcí.

### Testovací data

- Účet: `viewer@example.com`
- Záznam: `ROLE-001`

### Očekávaný výsledek

Akce pro změnu stavu není zobrazena nebo není dostupná.

### Skutečný výsledek

Akce je v uživatelském rozhraní zobrazena.

## BUG-004

- Název: Přihlašovací formulář neupozorní uživatele na prázdné heslo dostatečně výrazně
- Prostředí: `TEST`
- Verze aplikace: `build QA-demo`
- Závažnost: Minor
- Stav: New
- Navázaný test: rozšiřující negativní varianta k `UMK-LOGIN-001`

### Kroky k reprodukci

1. Otevřít přihlašovací formulář.
2. Vyplnit e-mail.
3. Nechat heslo prázdné.
4. Odeslat formulář.

### Testovací data

- E-mail: `tester.basic@example.com`

### Očekávaný výsledek

Pole hesla je zvýrazněné a uživatel dostane srozumitelné validační hlášení.

### Skutečný výsledek

Formulář se neodešle, ale validace je vizuálně málo zřetelná.

## BUG-005

- Název: Seznam záznamů neuchovává nastavený filtr po návratu z detailu
- Prostředí: `TEST`
- Verze aplikace: `build QA-demo`
- Závažnost: Major
- Stav: New
- Navázaný test: doplňkový scénář k `BUC-06 Vyhledání a filtrování záznamů`

### Kroky k reprodukci

1. Otevřít seznam záznamů.
2. Nastavit filtr podle typu nebo stavu.
3. Otevřít detail jednoho z výsledků.
4. Vrátit se zpět na seznam.

### Testovací data

- Filtr: `Status = Submitted`

### Očekávaný výsledek

Po návratu z detailu zůstane seznam vyfiltrovaný stejně jako před odchodem.

### Skutečný výsledek

Filtr se ztratí a seznam se vrátí do výchozího stavu.
