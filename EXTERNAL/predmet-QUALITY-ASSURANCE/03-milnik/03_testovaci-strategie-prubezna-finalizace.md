# Průběžná finalizace testovací strategie

## Stav po 3. milníku

Strategie byla rozšířena o konkrétní test case a o modelové výsledky testování. Na základě připravených nálezů se jako nejrizikovější oblasti ukazují:

- konzistence dat po změně workflow stavu,
- synchronizace seznamu po založení nového záznamu,
- respektování oprávnění podle role,
- použitelnost validačních hlášek,
- zachování filtrů při navigaci.

## Dopad na testovací přístup

Ve 4. milníku by měla být regrese zaměřena především na:

1. workflow změny stavů,
2. práva a role,
3. seznamy, filtry a navigaci,
4. vytvoření a editaci záznamů.

## Doporučení

- po opravě kritických chyb zopakovat všechny high priority testy,
- rozšířit sadu negativních testů u přihlášení a validací,
- přidat testy na zachování stavu UI po navigaci,
- doplnit jednoznačné mapování test case na oficiální Business Use Cases, jakmile budou dostupné.
