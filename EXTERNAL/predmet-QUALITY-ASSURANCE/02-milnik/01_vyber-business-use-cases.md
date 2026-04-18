# Výběr nejdůležitějších Business Use Cases

## Poznámka

Seznam níže je připraven jako pracovní výběr klíčových use casů pro školní QA dokumentaci k aplikaci `uuManagementKit`. Vychází z běžných scénářů pro webovou business aplikaci typu management toolkit. Jakmile budou dostupné oficiální use case stránky, lze názvy a identifikátory zpřesnit.

## Prioritní use casy

- `BUC-01 Přihlášení uživatele do aplikace`
  Ověřuje vstup do systému, validaci přihlašovacích údajů a chování při neplatných datech.

- `BUC-02 Zobrazení seznamu záznamů`
  Ověřuje načtení hlavního přehledu, zobrazení dat a práci se základním listingem.

- `BUC-03 Vytvoření nového záznamu`
  Ověřuje vytvoření nové business entity včetně povinných polí a validačních pravidel.

- `BUC-04 Úprava existujícího záznamu`
  Ověřuje změnu údajů v detailu a uložení změn bez ztráty dat.

- `BUC-05 Změna workflow stavu`
  Ověřuje přechod záznamu mezi stavy, správné zobrazení dostupných akcí a kontrolu oprávnění.

- `BUC-06 Vyhledání a filtrování záznamů`
  Ověřuje, že uživatel umí rychle najít požadovaný záznam a filtrovat výstupy podle více kritérií.

- `BUC-07 Správa rolí a oprávnění`
  Ověřuje, že různé role vidí pouze akce, které jim náleží.

## Doporučení pro testování

Pro další milník byly jako nejdůležitější vybrány tyto use casy:

1. `BUC-01 Přihlášení uživatele do aplikace`
2. `BUC-03 Vytvoření nového záznamu`
3. `BUC-05 Změna workflow stavu`
4. `BUC-07 Správa rolí a oprávnění`

Tyto use casy mají nejvyšší přínos pro ověření základní použitelnosti aplikace, integrity dat a bezpečného přístupu podle rolí.
