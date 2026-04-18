# Test Report

## 1. Přehled

- Projekt: `uuManagementKit`
- Typ dokumentu: Test Report
- Účel: Shrnutí výsledků testování a doporučení pro akceptaci
- Poznámka: Report je připraven jako školní vzorový výstup navázaný na předchozí dokumenty

## 2. Rozsah testování

V rámci testování byly pokryty tyto oblasti:

- přihlášení uživatele,
- vytvoření nového záznamu,
- změna workflow stavu,
- kontrola oprávnění podle role.

## 3. Metriky testování

| Metrika | Hodnota |
| --- | --- |
| Celkem test case | 4 |
| Provedené test case | 4 |
| Passed | 1 |
| Failed | 3 |
| Blocked | 0 |
| Celkem evidované chyby | 5 |
| Critical | 2 |
| Major | 2 |
| Minor | 1 |

## 4. Textové grafy

### Výsledky testů

- Passed: `#` 1
- Failed: `###` 3
- Blocked: `` 0

### Závažnost chyb

- Critical: `##` 2
- Major: `##` 2
- Minor: `#` 1

## 5. Přehled nejdůležitějších nálezů

- Kritický problém v workflow, kdy změna stavu není po refreshi perzistentní.
- Kritický problém v oprávněních, kdy role `Viewer` vidí nepovolenou akci.
- Závažný problém v refreshi seznamu po vytvoření záznamu.
- Závažný problém v zachování filtrů při návratu z detailu.
- Menší UX nedostatek u validačního hlášení přihlášení.

## 6. Manažerské shrnutí

Testování odhalilo, že základní vstup do aplikace funguje, ale klíčové oblasti práce se záznamy a řízení oprávnění vykazují významná rizika. Nejzávažnější nálezy se týkají workflow logiky a bezpečnosti přístupu podle rolí. Tyto chyby mají přímý dopad na důvěryhodnost dat a na korektní použití aplikace uživateli.

Z pohledu kvality není vhodné doporučit plnou akceptaci build verze bez opravy kritických nálezů a následného retestu. Po jejich odstranění je nutné znovu provést cílenou regresi na workflow, role a seznamové obrazovky.

## 7. Doporučení

- Neakceptovat build do další fáze bez opravy kritických chyb.
- Po opravách provést retest všech failed test case.
- Spustit cílený regresní balík na workflow, role a filtry.
- Doplnit skutečné reference na oficiální Business Use Cases.
