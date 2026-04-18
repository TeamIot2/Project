# Finální testovací strategie pro uuManagementKit

## 1. Úvod

Finální verze testovací strategie shrnuje přístup k testování aplikace `uuManagementKit` v agilním projektu, kde je tester součástí vývojového týmu. Dokument navazuje na předchozí milníky a doplňuje test design, evidenci testování, issue tracking a reporting.

## 2. Cíle

- průběžně ověřovat kvalitu implementace,
- včas zachycovat chyby během sprintu,
- ověřit klíčové business scénáře,
- zajistit, že role a oprávnění fungují správně,
- dodat týmu podklad pro akceptaci výstupu.

## 3. Scope

### V rozsahu

- přihlášení a přístup do aplikace,
- práce se seznamy a detaily záznamů,
- vytváření a editace záznamů,
- workflow přechody,
- vyhledávání a filtrování,
- role a oprávnění,
- smoke, funkční, integrační, E2E, regresní a akceptační testy.

### Mimo rozsah

- detailní penetrační testy,
- rozsáhlé performance testy,
- externí bezpečnostní audit.

## 4. Odpovědnosti

### Vývojář

- implementace funkcionality,
- unit testy,
- technické ověření,
- opravy chyb.

### Tester

- návrh a správa test case,
- příprava dat,
- funkční, integrační, E2E a regresní testování,
- evidence výsledků a bug reportů,
- retest.

### Product Owner

- zpřesnění požadavků,
- stanovení priorit,
- acceptance criteria,
- akceptace sprintu.

## 5. Testovací přístup

Testování probíhá průběžně během sprintu:

1. analýza požadavků,
2. příprava test designu,
3. průběžné ověřování během vývoje,
4. smoke test po nasazení,
5. funkční a integrační testy,
6. retest a regrese,
7. podklad pro sprint review.

## 6. Typy testů

- `Unit`
- `Smoke`
- `Functional`
- `Integration`
- `End-to-End`
- `Regression`
- `Acceptance`

## 7. Prostředí

- `DEV`
- `TEST`
- `UAT`

## 8. Test design

Testy vycházejí z:

- business use casů,
- user stories,
- acceptance criteria,
- rizikových oblastí,
- předchozích nálezů.

Pokrývají:

- pozitivní průchody,
- negativní průchody,
- alternativní scénáře,
- hraniční hodnoty,
- role a oprávnění.

## 9. Test repository

Testovací dokumentace je vedena po milnících v samostatných souborech. Každý test case má vlastní ID, návaznost na use case a status provedení.

## 10. Issue tracking

Každá chyba musí obsahovat:

- ID a název,
- prostředí a verzi,
- kroky k reprodukci,
- testovací data,
- očekávaný a skutečný výsledek,
- závažnost,
- stav.

Používaná závažnost:

- `Critical`
- `Major`
- `Minor`

## 11. Reporting

Reporting probíhá:

- průběžně během sprintu,
- při retestu,
- formou závěrečného test reportu.

Součástí reportingu jsou:

- metriky testů,
- přehled chyb,
- stav kritických nálezů,
- doporučení k akceptaci.

## 12. Entry Criteria

- funkcionalita je nasazena,
- požadavky jsou známé,
- existují testovací data,
- prostředí je dostupné a stabilní.

## 13. Exit Criteria

- klíčové testy jsou provedené,
- kritické chyby jsou vyřešené nebo formálně akceptované,
- proběhl retest,
- regrese je dokončená,
- tým má podklad pro rozhodnutí.

## 14. Rizika

- nejasné požadavky,
- opožděné dodání buildů,
- nestabilní prostředí,
- chybějící data,
- nedostupné integrace,
- časový tlak.

## 15. Shrnutí

Navržená strategie podporuje agilní testování s rychlou zpětnou vazbou a jasnou vazbou mezi požadavky, test case a bug reporty. Na základě modelových výsledků je nutné věnovat zvýšenou pozornost workflow logice, konzistenci zobrazených dat a kontrole oprávnění.

Jakmile budou dostupné oficiální Business Use Cases nebo přístup do aplikace, je vhodné doplnit přesné reference a nahradit modelové výsledky reálně provedeným testováním.
