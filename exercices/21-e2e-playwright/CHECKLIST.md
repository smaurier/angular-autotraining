# Checklist — Exercice 21 : E2E Playwright

## Configuration

- [ ] Le fichier `playwright.config.ts` est cree avec `baseURL`, `webServer` et au moins un projet (chromium)
- [ ] La configuration `webServer` demarre automatiquement `ng serve` avant les tests
- [ ] Le timeout global est defini (30 secondes recommande)

## Page Object

- [ ] La classe `TodoPage` est creee dans un fichier separe `todo.page.ts`
- [ ] Le constructeur recoit un objet `Page` et initialise tous les `Locator`
- [ ] Tous les selecteurs utilisent `data-testid` (aucun selecteur CSS ou de classe)
- [ ] Toutes les methodes publiques sont typees avec `Promise<>` explicite
- [ ] Les methodes sont nommees avec des verbes metier (`addTask`, `toggleTask`, etc.)

## Tests

- [ ] **Test 1 — Navigation** : verifie le chargement de la page, la presence du titre et la liste vide
- [ ] **Test 2 — Creer une tache** : ajoute 3 taches et verifie leur presence et leur titre
- [ ] **Test 3 — Modifier une tache** : cree, edite et verifie la modification du titre
- [ ] **Test 4 — Supprimer une tache** : cree 2 taches, supprime la premiere, verifie qu'il reste la bonne
- [ ] **Test 5 — Filtrer les taches** : teste les 3 filtres (all, active, completed) avec les bons compteurs

## Qualite

- [ ] Zero `any` dans le code TypeScript
- [ ] Les assertions utilisent `expect` de `@playwright/test` (pas Jest/Vitest)
- [ ] Chaque test est independant (pas de dependance entre tests)
- [ ] Un `test.beforeEach` reinitialise l'etat avant chaque test
