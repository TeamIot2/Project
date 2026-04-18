# Test Case UMK-RECORD-002

## Identification

- ID: `UMK-RECORD-002`
- Name: Vytvoření nového záznamu s povinnými poli
- Related Business Use Case: `BUC-03 Vytvoření nového záznamu`
- Priority: High
- Test Type: Functional / End-to-End

## Description

Ověření, že uživatel s oprávněním editor dokáže založit nový záznam a uložený záznam se zobrazí v seznamu.

## Preconditions

- aplikace je dostupná,
- uživatel je přihlášen,
- uživatel má právo vytvářet nové záznamy,
- systém obsahuje alespoň jeden seznam nebo modul, do kterého lze záznam založit.

## Test Data

- Název: `QA test záznam 001`
- Typ: `Standard`
- Popis: `Záznam vytvořený pro ověření založení entity`

## User Roles / Permissions

- role `Editor`

## Start Point

Uživatel je přihlášen a nachází se na stránce se seznamem záznamů.

## Test Steps

### Step 1

- Action: Kliknout na akci `Nový záznam`.
- Expected Result: Otevře se formulář pro založení nového záznamu.

### Step 2

- Action: Vyplnit všechna povinná pole validními daty.
- Expected Result: Formulář nehlásí validační chyby.

### Step 3

- Action: Potvrdit uložení.
- Expected Result: Záznam je uložen, zobrazí se detail nebo potvrzovací zpráva.

### Step 4

- Action: Vrátit se do seznamu a vyhledat vytvořený záznam.
- Expected Result: Nově založený záznam je viditelný v seznamu.

## Expected Result (Overall)

Nový záznam je úspěšně vytvořen, uložen a dohledatelný v seznamu.

## Postconditions

V systému existuje nový testovací záznam.

## Notes / Comments

Je vhodné doplnit i negativní test s prázdným názvem a test na duplicitní hodnoty, pokud je systém omezuje.

## Estimation

10 minut
