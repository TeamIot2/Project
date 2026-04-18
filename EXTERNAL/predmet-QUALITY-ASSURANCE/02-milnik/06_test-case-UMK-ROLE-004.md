# Test Case UMK-ROLE-004

## Identification

- ID: `UMK-ROLE-004`
- Name: Ověření omezení akce podle role uživatele
- Related Business Use Case: `BUC-07 Správa rolí a oprávnění`
- Priority: High
- Test Type: Functional / Security-related

## Description

Ověření, že uživatel bez oprávnění nevidí nebo nemůže provést akci pro změnu workflow stavu.

## Preconditions

- existuje záznam, na kterém lze běžně provést workflow akci,
- existují minimálně dva testovací účty s různými rolemi,
- účet s omezenou rolí nemá právo změnit stav záznamu.

## Test Data

- účet 1: `editor@example.com`
- účet 2: `viewer@example.com`
- testovací záznam: `ROLE-001`

## User Roles / Permissions

- role `Viewer`

## Start Point

Uživatel s rolí `Viewer` je přihlášen a otevře detail testovacího záznamu.

## Test Steps

### Step 1

- Action: Otevřít detail záznamu jako uživatel s rolí `Viewer`.
- Expected Result: Detail se načte bez chyby.

### Step 2

- Action: Zkontrolovat dostupné akce v detailu.
- Expected Result: Akce pro změnu workflow stavu není zobrazena nebo je neaktivní.

### Step 3

- Action: Pokusit se provést změnu stavu alternativní cestou, pokud je dostupná.
- Expected Result: Systém změnu neumožní a vrátí odpovídající chybové hlášení nebo blokaci.

## Expected Result (Overall)

Uživatel bez příslušného oprávnění nedokáže změnit stav záznamu.

## Postconditions

Stav záznamu zůstává beze změny.

## Notes / Comments

Tento test je důležitý jak pro funkčnost, tak pro bezpečnostní stránku řešení.

## Estimation

7 minut
