# Test Case UMK-WORKFLOW-003

## Identification

- ID: `UMK-WORKFLOW-003`
- Name: Změna stavu záznamu v workflow
- Related Business Use Case: `BUC-05 Změna workflow stavu`
- Priority: High
- Test Type: Functional / Integration

## Description

Ověření, že uživatel s oprávněním může převést záznam ze stavu `Draft` do stavu `Submitted`.

## Preconditions

- existuje záznam ve stavu `Draft`,
- uživatel je přihlášen,
- uživatel má oprávnění provést workflow akci.

## Test Data

- ID záznamu: `DRAFT-001`
- Původní stav: `Draft`
- Cílový stav: `Submitted`

## User Roles / Permissions

- role `Editor` nebo `Approver` podle konfigurace aplikace

## Start Point

Uživatel je na detailu záznamu ve stavu `Draft`.

## Test Steps

### Step 1

- Action: Otevřít detail záznamu ve stavu `Draft`.
- Expected Result: Detail je načten a zobrazuje aktuální stav `Draft`.

### Step 2

- Action: Kliknout na akci `Submit` nebo ekvivalentní workflow přechod.
- Expected Result: Systém zobrazí potvrzení nebo okamžitě provede změnu stavu.

### Step 3

- Action: Obnovit detail nebo přejít zpět do seznamu.
- Expected Result: Záznam má nový stav `Submitted`.

## Expected Result (Overall)

Přechod workflow je úspěšně proveden a nový stav je konzistentně zobrazen v detailu i v seznamu.

## Postconditions

Záznam zůstává ve stavu `Submitted`.

## Notes / Comments

Vhodné je doplnit i negativní variantu, kdy se o stejný přechod pokusí uživatel bez oprávnění.

## Estimation

8 minut
