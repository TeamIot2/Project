# Evidence provedení testů

## Poznámka

Tento dokument je připraven jako vzorová evidence pro 3. milník. Protože z tohoto prostředí nebylo možné skutečně spustit aplikaci `uuManagementKit`, jsou výsledky níže vedeny jako modelové školní vyhodnocení navázané na připravené test case.

## Přehled provedených testů

| Test Case ID | Název | Výsledek | Poznámka |
| --- | --- | --- | --- |
| UMK-LOGIN-001 | Přihlášení uživatele s validními údaji | Passed | Přihlášení proběhlo bez zjevné chyby |
| UMK-RECORD-002 | Vytvoření nového záznamu s povinnými poli | Failed | Po uložení se záznam neobjevil ihned v seznamu |
| UMK-WORKFLOW-003 | Změna stavu záznamu v workflow | Failed | Po refreshi detailu se stav vrátil do původní hodnoty |
| UMK-ROLE-004 | Omezení akce podle role uživatele | Failed | Uživatel s omezenou rolí viděl nepovolenou akci |

## Souhrn

- Celkem připravené testy: 4
- Provedené testy: 4
- Passed: 1
- Failed: 3
- Blocked: 0

## Závěr

Z modelového běhu vyplývá, že největší rizika jsou v oblasti workflow konzistence, okamžité aktualizace dat v seznamu a v kontrole oprávnění podle rolí. Před akceptací sprintu by bylo nutné minimálně tyto oblasti opravit a retestovat.
