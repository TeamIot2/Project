# Test Case UMK-LOGIN-001

## Identification

- ID: `UMK-LOGIN-001`
- Name: Přihlášení uživatele s validními údaji
- Related Business Use Case: `BUC-01 Přihlášení uživatele do aplikace`
- Priority: High
- Test Type: Functional / Smoke

## Description

Ověření, že se registrovaný uživatel dokáže přihlásit do aplikace a po přihlášení se zobrazí výchozí přehled.

## Preconditions

- aplikace je dostupná v prostředí `TEST`,
- existuje aktivní uživatelský účet,
- uživatel zná správné přihlašovací údaje.

## Test Data

- e-mail: `tester.basic@example.com`
- heslo: `ValidPassword123`

## User Roles / Permissions

- běžný přihlášený uživatel

## Start Point

Uživatel je odhlášen a nachází se na přihlašovací stránce aplikace.

## Test Steps

### Step 1

- Action: Otevřít přihlašovací stránku aplikace.
- Expected Result: Zobrazí se přihlašovací formulář s poli pro e-mail a heslo.

### Step 2

- Action: Vyplnit validní e-mail a validní heslo.
- Expected Result: Hodnoty jsou přijaty bez validační chyby.

### Step 3

- Action: Kliknout na tlačítko pro přihlášení.
- Expected Result: Uživatel je úspěšně autentizován a systém jej přesměruje na domovský přehled.

## Expected Result (Overall)

Přihlášení proběhne úspěšně, uživatel vidí domovskou stránku a je vytvořena aktivní session.

## Postconditions

Uživatel je přihlášen v systému.

## Notes / Comments

Doporučeno doplnit i negativní variantu s neplatným heslem a variantu s prázdnými poli.

## Estimation

5 minut
