# Testovací strategie pro uuManagementKit

## 1. Úvod

Tento dokument představuje první návrh testovací strategie pro aplikaci `uuManagementKit`. Strategie vychází ze zadání předmětu Quality Assurance a z předpokladu, že tester je součástí vývojového týmu a testování probíhá průběžně v rámci sprintů.

Poznámka k podkladům: v tomto prostředí nebylo možné otevřít původní chráněné stránky s detailními Business Use Cases. Dokument je proto připraven jako konzistentní školní návrh, který lze později snadno zpřesnit podle oficiálních use casů.

## 2. Cíl testování

Cílem testování je:

- ověřit, že aplikace plní očekávané business scénáře,
- zachytit chyby co nejdříve během vývoje,
- ověřit správnou spolupráci frontendové a backendové části,
- snížit riziko, že se regresní chyba dostane do vyššího prostředí,
- poskytovat týmu průběžnou zpětnou vazbu o kvalitě řešení.

## 3. Scope

### V rozsahu

- funkční testování klíčových use casů,
- smoke testy po nasazení do testovacího prostředí,
- integrační testování komunikace UI a API,
- end-to-end ověření hlavních uživatelských toků,
- regresní testy po opravách a změnách,
- ověření rolí a oprávnění.

### Mimo rozsah

- detailní penetrační testování,
- plnohodnotné výkonnostní a zátěžové testy,
- externí bezpečnostní audit.

## 4. Testovací přístup

Testování bude probíhat agilně v každém sprintu:

1. Na začátku sprintu budou zkontrolovány požadavky a acceptance criteria.
2. Tester připraví test design a test data.
3. Během vývoje budou průběžně ověřovány nové funkcionality.
4. Po nasazení do testovacího prostředí proběhne smoke test.
5. Po dokončení funkcionality proběhnou funkční a integrační testy.
6. Před uzavřením sprintu proběhne relevantní regresní test.

## 5. Role a odpovědnosti

### Vývojář

- implementace funkcionality,
- unit testy,
- technické ověření v DEV,
- oprava nahlášených chyb.

### Tester

- návrh testovacích scénářů,
- příprava testovacích dat,
- smoke, funkční, integrační, E2E a regresní testy,
- evidence výsledků,
- retest opravených chyb.

### Product Owner

- zpřesnění požadavků,
- definice acceptance criteria,
- prioritizace funkcionalit,
- akceptace výstupu sprintu.

## 6. Typy testů

- Unit tests
- Smoke tests
- Integration tests
- Functional tests
- End-to-end tests
- Regression tests
- Acceptance tests

## 7. Prostředí

- `DEV` pro vývoj a základní technické ověření
- `TEST` pro systematické testování
- `UAT` pro akceptační ověření, pokud je dostupné

## 8. Testovací data

Testovací data musí pokrývat:

- standardní scénáře,
- chybové vstupy,
- hraniční hodnoty,
- různé role a úrovně oprávnění.

## 9. Rizika

- nejasné nebo měnící se požadavky,
- pozdní dodání funkcionality do testu,
- nestabilní prostředí,
- nedostatek reprezentativních dat,
- časový tlak na konci sprintu.

## 10. Další kroky

V dalších milnících bude tato strategie rozšířena o:

- výběr nejdůležitějších Business Use Cases,
- detailní test case,
- evidenci průběhu testování,
- bug reporty,
- test report a manažerské shrnutí.
