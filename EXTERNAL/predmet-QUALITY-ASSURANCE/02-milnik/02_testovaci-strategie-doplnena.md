# Testovací strategie pro uuManagementKit

## 1. Úvod

Tato verze rozšiřuje původní návrh testovací strategie o konkrétnější test design, repository přístup, reporting a vazbu na vybrané Business Use Cases.

## 2. Cíle testování

- ověřit shodu implementace s klíčovými business scénáři,
- odhalovat chyby v co nejranější fázi sprintu,
- průběžně hodnotit stabilitu řešení při rozšiřování funkcionality,
- ověřit, že práva a role jsou respektována v UI i v logice aplikace,
- zajistit podklad pro akceptaci sprintu.

## 3. Rozsah testování

### V rozsahu

- přihlášení a základní přístup do aplikace,
- práce se seznamem a detailem záznamů,
- vytváření a editace záznamů,
- workflow přechody,
- filtrování a vyhledávání,
- role a oprávnění,
- smoke, funkční, integrační, E2E a regresní testy.

### Mimo rozsah

- penetrační testy,
- hlubší performance testy,
- externí bezpečnostní audit.

## 4. Testovací fáze a odpovědnosti

### Vývojář

- provádí unit testy,
- ověřuje implementaci v DEV,
- opravuje chyby,
- spolupracuje s testerem při analýze nálezů.

### Tester

- připravuje test design,
- vytváří test case,
- připravuje data a testovací účty,
- provádí funkční, integrační, E2E a regresní testy,
- eviduje a retestuje chyby.

### Product Owner

- upřesňuje požadavky,
- definuje acceptance criteria,
- rozhoduje o akceptaci výstupu sprintu.

## 5. Testovací typy

### Unit tests

Provádí vývojář průběžně během implementace.

### Smoke tests

Rychlé ověření, že je build nasazen a klíčové obrazovky jsou dostupné.

### Functional tests

Ověření hlavních scénářů z pohledu uživatele.

### Integration tests

Ověření propojení UI, API a případných navázaných služeb.

### End-to-end tests

Ověření kompletního průchodu klíčovým scénářem.

### Regression tests

Ověření, že nová změna nerozbila dříve fungující části.

### Acceptance tests

Ověření připravenosti funkcionality pro business akceptaci.

## 6. Prostředí a zdroje

- `DEV`: rychlé ověřování implementace
- `TEST`: hlavní prostředí pro systematické testování
- `UAT`: ověření Product Ownerem

### Testovací data

Připravená data musí pokrýt:

- validní vstupy,
- nevalidní vstupy,
- hraniční hodnoty,
- různé role,
- různé workflow stavy.

## 7. Test plan ve sprintu

1. Analýza požadavků a acceptance criteria.
2. Příprava test scénářů a dat.
3. Průběžné ověřování během vývoje.
4. Smoke test po nasazení.
5. Funkční a integrační testy dokončených scénářů.
6. Retest opravených chyb.
7. Regrese před sprint review.

## 8. Test design a repository

### Test design

Testovací scénáře jsou navrhovány podle:

- business use casů,
- user stories,
- acceptance criteria,
- rizikových oblastí,
- zkušeností z předchozího testování.

Budou pokrývat:

- pozitivní scénáře,
- negativní scénáře,
- alternativní průběhy,
- hraniční hodnoty,
- role a oprávnění.

### Test repository

Dokumentace testů bude vedena v samostatných souborech po milnících. Každý test case musí mít vazbu na konkrétní use case a jednoznačný identifikátor.

## 9. Issue tracking

U každé chyby budou evidovány alespoň:

- ID chyby,
- název,
- prostředí,
- build nebo verze,
- kroky reprodukce,
- testovací data,
- očekávaný výsledek,
- skutečný výsledek,
- závažnost,
- stav.

### Závažnost

- `Critical`: blokuje klíčovou funkcionalitu
- `Major`: zásadně omezuje funkcionalitu
- `Minor`: menší dopad, případně UI nedostatek

## 10. Reporting

Reporting bude průběžný během sprintu a finálně v test reportu.

Bude obsahovat:

- počet provedených testů,
- poměr Passed / Failed / Blocked,
- seznam otevřených chyb,
- seznam retestů,
- doporučení k akceptaci.

## 11. Entry a Exit Criteria

### Entry Criteria

- funkcionalita je nasazena do odpovídajícího prostředí,
- existují požadavky nebo acceptance criteria,
- jsou dostupná testovací data,
- prostředí je stabilní.

### Exit Criteria

- klíčové testy jsou provedeny,
- kritické chyby jsou opravené nebo akceptované,
- byl proveden retest,
- proběhla relevantní regrese,
- tým má dost podkladů pro rozhodnutí.

## 12. Rizika

- nejasné zadání,
- opožděné dodání buildů,
- nestabilní testovací prostředí,
- chybějící testovací data,
- nedostupné integrace,
- časový tlak.

## 13. Shrnutí

Strategie je vhodná pro agilní projekt, kde je tester součástí týmu. Důraz je kladen na včasné zapojení testování, rychlou zpětnou vazbu a průběžné snižování rizik.
