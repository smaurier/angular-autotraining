# Correction — Exercice 21 : E2E Playwright

## Resultat attendu

Une suite de 5 tests E2E Playwright qui valident les fonctionnalites principales d'une application Todo : navigation, creation, modification, suppression et filtrage de taches. Les tests utilisent le pattern Page Object pour une meilleure maintenabilite.

## Code corrige

### Configuration Playwright

```typescript
// src/app/exercises/ex21/e2e/playwright.config.ts

// --- Import de la configuration Playwright ---
// defineConfig : fonction utilitaire pour typer la configuration
// devices : catalogue d'appareils pre-configures (viewport, user-agent, etc.)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Dossier contenant les fichiers de test
  testDir: './tests',

  // Timeout global par test : 30 secondes
  timeout: 30_000,

  // Timeout pour chaque assertion expect()
  expect: {
    timeout: 5_000,
  },

  // Nombre de tentatives en cas d'echec (0 = pas de retry)
  retries: 0,

  // Reporter : genere un rapport HTML consultable dans le navigateur
  reporter: 'html',

  // Configuration partagee par tous les projets
  use: {
    // URL de base de l'application Angular en dev
    baseURL: 'http://localhost:4200',

    // Capture une trace en cas d'echec (utile pour le debug)
    trace: 'on-first-retry',

    // Capture une capture d'ecran en cas d'echec
    screenshot: 'only-on-failure',
  },

  // Projets = navigateurs a tester
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Demarre le serveur Angular avant les tests
  webServer: {
    command: 'ng serve',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
  },
});
```

### Page Object

```typescript
// src/app/exercises/ex21/e2e/pages/todo.page.ts

// --- Import des types Playwright ---
// Page : represente un onglet du navigateur
// Locator : represente un selecteur d'element DOM (lazy, re-evalue a chaque interaction)
// expect : assertions Playwright (differentes de Jest/Vitest)
import { type Page, type Locator, expect } from '@playwright/test';

// --- Pattern Page Object ---
// Un Page Object encapsule toutes les interactions avec une page
// Avantages :
//   1. Les selecteurs sont centralises (un seul endroit a modifier si le HTML change)
//   2. Les tests sont plus lisibles (methodes avec des noms metier)
//   3. Reutilisable dans plusieurs fichiers de test
export class TodoPage {
  // --- Locators ---
  // Un Locator est "lazy" : il ne cherche l'element qu'au moment de l'interaction
  // On utilise data-testid pour decoupler les tests du CSS/HTML
  private readonly todoInput: Locator;
  private readonly addButton: Locator;
  private readonly todoList: Locator;
  private readonly todoItems: Locator;
  private readonly filterAll: Locator;
  private readonly filterActive: Locator;
  private readonly filterCompleted: Locator;
  private readonly pageTitle: Locator;

  // Le constructeur recoit l'objet Page de Playwright
  constructor(private readonly page: Page) {
    // Chaque locator cible un attribut data-testid
    // Syntaxe : page.locator('[data-testid="..."]')
    this.todoInput = page.locator('[data-testid="todo-input"]');
    this.addButton = page.locator('[data-testid="todo-add-btn"]');
    this.todoList = page.locator('[data-testid="todo-list"]');
    this.todoItems = page.locator('[data-testid="todo-item"]');
    this.filterAll = page.locator('[data-testid="filter-all"]');
    this.filterActive = page.locator('[data-testid="filter-active"]');
    this.filterCompleted = page.locator('[data-testid="filter-completed"]');
    this.pageTitle = page.locator('[data-testid="todo-title"]');
  }

  // --- Navigation ---
  // Navigue vers la page Todo de l'application
  async goto(): Promise<void> {
    await this.page.goto('/todo');
  }

  // --- Ajouter une tache ---
  // Remplit le champ de saisie et clique sur le bouton d'ajout
  async addTask(title: string): Promise<void> {
    await this.todoInput.fill(title);
    await this.addButton.click();
  }

  // --- Basculer l'etat d'une tache ---
  // Coche ou decoche la checkbox de la tache a l'index donne
  async toggleTask(index: number): Promise<void> {
    const checkbox = this.todoItems
      .nth(index)
      .locator('[data-testid="todo-checkbox"]');
    await checkbox.click();
  }

  // --- Supprimer une tache ---
  // Survole la tache pour faire apparaitre le bouton supprimer, puis clique
  async deleteTask(index: number): Promise<void> {
    const item = this.todoItems.nth(index);
    // hover() fait apparaitre les boutons caches en CSS (:hover)
    await item.hover();
    await item.locator('[data-testid="todo-delete-btn"]').click();
  }

  // --- Modifier une tache ---
  // Double-clic pour passer en mode edition, efface le contenu, saisit le nouveau titre
  async editTask(index: number, newTitle: string): Promise<void> {
    const item = this.todoItems.nth(index);
    const label = item.locator('[data-testid="todo-label"]');

    // Double-clic pour activer le mode edition
    await label.dblclick();

    // Le champ d'edition apparait apres le double-clic
    const editInput = item.locator('[data-testid="todo-edit-input"]');
    // clear() vide le champ avant de saisir le nouveau titre
    await editInput.clear();
    await editInput.fill(newTitle);
    // Appuyer sur Entree pour valider
    await editInput.press('Enter');
  }

  // --- Filtrer les taches ---
  // Clique sur le bouton de filtre correspondant
  async filterBy(status: 'all' | 'active' | 'completed'): Promise<void> {
    const filterMap: Record<string, Locator> = {
      all: this.filterAll,
      active: this.filterActive,
      completed: this.filterCompleted,
    };
    await filterMap[status].click();
  }

  // --- Compter les taches visibles ---
  // Retourne le nombre d'elements todo-item affichees
  async getTaskCount(): Promise<number> {
    return this.todoItems.count();
  }

  // --- Lire le titre d'une tache ---
  // Retourne le contenu textuel du label de la tache a l'index donne
  async getTaskTitle(index: number): Promise<string> {
    const label = this.todoItems
      .nth(index)
      .locator('[data-testid="todo-label"]');
    const text = await label.textContent();
    return text?.trim() ?? '';
  }

  // --- Verifier le titre de la page ---
  async expectTitleVisible(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
  }

  // --- Verifier que la liste est vide ---
  async expectEmptyList(): Promise<void> {
    await expect(this.todoItems).toHaveCount(0);
  }
}
```

### Tests E2E

```typescript
// src/app/exercises/ex21/e2e/tests/todo.spec.ts

// --- Import du framework de test Playwright ---
// test : fonction pour definir un test (equivalent de it() en Jest)
// expect : assertions Playwright
import { test, expect } from '@playwright/test';

// Import du Page Object
import { TodoPage } from '../pages/todo.page';

// --- Groupe de tests ---
// test.describe() regroupe des tests lies (comme describe() en Jest)
test.describe('Application Todo', () => {
  let todoPage: TodoPage;

  // --- beforeEach ---
  // Execute avant chaque test : cree une nouvelle instance du Page Object
  // et navigue vers la page
  test.beforeEach(async ({ page }) => {
    todoPage = new TodoPage(page);
    await todoPage.goto();
  });

  // =============================================
  // TEST 1 — Navigation
  // =============================================
  test('doit afficher la page avec un titre et une liste vide', async () => {
    // Verifie que le titre de la page est visible
    await todoPage.expectTitleVisible();

    // Verifie que la liste de taches est initialement vide
    await todoPage.expectEmptyList();

    // Verifie que le nombre de taches est bien 0
    const count = await todoPage.getTaskCount();
    expect(count).toBe(0);
  });

  // =============================================
  // TEST 2 — Creer des taches
  // =============================================
  test('doit creer 3 taches et les afficher dans la liste', async () => {
    // Ajouter 3 taches avec des titres differents
    await todoPage.addTask('Acheter du pain');
    await todoPage.addTask('Faire le menage');
    await todoPage.addTask('Preparer la reunion');

    // Verifier qu'il y a bien 3 taches dans la liste
    const count = await todoPage.getTaskCount();
    expect(count).toBe(3);

    // Verifier le titre de chaque tache
    // Les taches s'affichent dans l'ordre d'ajout
    expect(await todoPage.getTaskTitle(0)).toBe('Acheter du pain');
    expect(await todoPage.getTaskTitle(1)).toBe('Faire le menage');
    expect(await todoPage.getTaskTitle(2)).toBe('Preparer la reunion');
  });

  // =============================================
  // TEST 3 — Modifier une tache
  // =============================================
  test('doit modifier le titre d\'une tache existante', async () => {
    // Creer une tache
    await todoPage.addTask('Titre original');

    // Verifier le titre initial
    expect(await todoPage.getTaskTitle(0)).toBe('Titre original');

    // Double-cliquer pour editer et changer le titre
    await todoPage.editTask(0, 'Titre modifie');

    // Verifier que le titre a bien change
    expect(await todoPage.getTaskTitle(0)).toBe('Titre modifie');

    // Verifier qu'il y a toujours 1 seule tache (pas de duplication)
    const count = await todoPage.getTaskCount();
    expect(count).toBe(1);
  });

  // =============================================
  // TEST 4 — Supprimer une tache
  // =============================================
  test('doit supprimer une tache de la liste', async () => {
    // Creer 2 taches
    await todoPage.addTask('Tache a supprimer');
    await todoPage.addTask('Tache a garder');

    // Verifier qu'il y a 2 taches
    expect(await todoPage.getTaskCount()).toBe(2);

    // Supprimer la premiere tache (index 0)
    await todoPage.deleteTask(0);

    // Verifier qu'il ne reste qu'une tache
    expect(await todoPage.getTaskCount()).toBe(1);

    // Verifier que c'est bien la bonne tache qui reste
    expect(await todoPage.getTaskTitle(0)).toBe('Tache a garder');
  });

  // =============================================
  // TEST 5 — Filtrer les taches
  // =============================================
  test('doit filtrer les taches par statut', async () => {
    // Creer 3 taches
    await todoPage.addTask('Tache active');
    await todoPage.addTask('Tache terminee 1');
    await todoPage.addTask('Tache terminee 2');

    // Completer les taches 2 et 3 (index 1 et 2)
    await todoPage.toggleTask(1);
    await todoPage.toggleTask(2);

    // --- Filtre "active" ---
    // Seule la tache non completee doit apparaitre
    await todoPage.filterBy('active');
    expect(await todoPage.getTaskCount()).toBe(1);
    expect(await todoPage.getTaskTitle(0)).toBe('Tache active');

    // --- Filtre "completed" ---
    // Seules les 2 taches completees doivent apparaitre
    await todoPage.filterBy('completed');
    expect(await todoPage.getTaskCount()).toBe(2);
    expect(await todoPage.getTaskTitle(0)).toBe('Tache terminee 1');
    expect(await todoPage.getTaskTitle(1)).toBe('Tache terminee 2');

    // --- Filtre "all" ---
    // Toutes les taches doivent apparaitre
    await todoPage.filterBy('all');
    expect(await todoPage.getTaskCount()).toBe(3);
  });
});
```

## Ce que tu aurais pu oublier

### 1. Oublier `await` devant les interactions Playwright
- ❌ `todoPage.addTask('titre')` → l'action n'est pas attendue, le test continue sans garantie
- ✅ `await todoPage.addTask('titre')` → attend que l'interaction soit terminee avant de continuer

### 2. Utiliser des selecteurs CSS/classes au lieu de data-testid
- ❌ `page.locator('.todo-item')` → fragile, casse si le CSS change
- ✅ `page.locator('[data-testid="todo-item"]')` → stable, decouple du style

### 3. Confondre `expect` de Playwright et `expect` de Jest
- ❌ `import { expect } from '@jest/globals'` → pas les memes assertions
- ✅ `import { expect } from '@playwright/test'` → assertions adaptees aux Locators (`toBeVisible`, `toHaveCount`, etc.)

### 4. Ne pas utiliser `nth()` pour cibler un element dans une liste
- ❌ `page.locator('[data-testid="todo-item"]')` → cible TOUS les elements
- ✅ `page.locator('[data-testid="todo-item"]').nth(0)` → cible le premier element

### 5. Oublier le `webServer` dans la configuration
- ❌ Lancer manuellement `ng serve` avant les tests → oubli frequent en CI
- ✅ Configurer `webServer` dans `playwright.config.ts` → Playwright demarre et arrete le serveur automatiquement

### 6. Ne pas regrouper les selecteurs dans le Page Object
- ❌ Repeter `page.locator('[data-testid="todo-input"]')` dans chaque test → duplication, maintenance penible
- ✅ Centraliser dans le constructeur du Page Object → un seul endroit a modifier

## Concepts cles utilises

| Concept | Explication |
|---------|-------------|
| `Page Object Pattern` | Encapsule les interactions UI dans une classe reutilisable — separe la logique de test des details d'implementation |
| `data-testid` | Attribut HTML dedie aux tests, decouple les selecteurs de test du CSS et de la structure HTML |
| `Locator` | Reference "lazy" vers un element DOM, re-evaluee a chaque interaction (pas de stale element) |
| `test.describe()` | Regroupe des tests lies, permet de partager un `beforeEach` |
| `test.beforeEach()` | Execute du code avant chaque test du groupe (reinitialisation de l'etat) |
| `page.goto()` | Navigation vers une URL — attend le chargement complet de la page |
| `locator.fill()` | Remplit un champ de formulaire — efface le contenu existant puis saisit |
| `locator.dblclick()` | Simule un double-clic — utile pour le mode edition |
| `locator.nth(n)` | Cible le nieme element correspondant au selecteur (0-indexed) |
| `webServer` | Configuration Playwright qui demarre automatiquement le serveur avant les tests |
