# Cours 38 — Tests E2E avec Playwright

> **Objectif** : Mettre en place Playwright pour les tests end-to-end d'une application Angular, maitriser le Page Object Pattern, les selecteurs robustes, les assertions, et integrer les tests E2E dans une CI. Comprendre quand privilegier un test E2E vs un test unitaire.

---

## Rappel du cours precedent

<details>
<summary>1. Quel est le role de `HttpTestingController` ?</summary>

Il intercepte toutes les requetes HTTP faites par `HttpClient` dans les tests. On utilise `expectOne(url)` pour capturer une requete et `flush(data)` pour lui envoyer une reponse fictive.
</details>

<details>
<summary>2. Comment mocker un service dans un test de composant ?</summary>

```typescript
const mock = { maMethode: jest.fn().mockReturnValue(of(data)) };
TestBed.configureTestingModule({
  providers: [{ provide: MonService, useValue: mock }],
});
```
</details>

<details>
<summary>3. Pourquoi appeler `httpController.verify()` dans `afterEach` ?</summary>

Pour s'assurer qu'aucune requete HTTP inattendue n'est restee sans reponse. Cela detecte les requetes oubliees ou les appels HTTP inattendus.
</details>

---

## Analogie

En Vue 3, vous utilisez **Cypress** ou **Playwright** pour les tests E2E. Vous lancez un vrai navigateur, naviguez sur l'application, cliquez, remplissez des formulaires et verifiez le resultat.

Angular utilisait historiquement **Protractor** (retire depuis Angular 12). Aujourd'hui, **Playwright** est le choix recommande. La syntaxe est identique que vous veniez de Vue ou Angular — Playwright teste des **pages web**, pas un framework specifique.

| Cypress (Vue) | Playwright (Angular) |
|---------------|---------------------|
| `cy.visit('/')` | `page.goto('/')` |
| `cy.get('[data-testid="btn"]')` | `page.getByTestId('btn')` |
| `cy.get('input').type('Alice')` | `page.getByRole('textbox').fill('Alice')` |
| `cy.contains('Bonjour')` | `expect(page.getByText('Bonjour')).toBeVisible()` |

---

## Theorie

### Installation de Playwright avec Angular

```bash
# Installer Playwright
npm init playwright@latest

# Structure creee :
# playwright.config.ts
# tests/
# tests/example.spec.ts
```

Configurer Playwright pour Angular :

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4200',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'ng serve',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
  ],
});
```

> **Point cle** : `webServer` lance automatiquement `ng serve` avant les tests et l'arrete apres.

### Premier test E2E

```typescript
// e2e/accueil.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Page d\'accueil', () => {
  test('devrait afficher le titre de l\'application', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mon App');
  });

  test('devrait naviguer vers la page utilisateurs', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Utilisateurs' }).click();
    await expect(page).toHaveURL('/utilisateurs');
    await expect(page.getByRole('heading')).toHaveText('Liste des utilisateurs');
  });
});
```

### Page Object Pattern

Le Page Object encapsule la logique d'interaction avec une page dans une classe reutilisable :

```typescript
// e2e/pages/login.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly errorMessage: Locator;

  constructor(private page: Page) {
    this.emailInput = page.getByTestId('input-email');
    this.passwordInput = page.getByTestId('input-password');
    this.submitButton = page.getByTestId('btn-login');
    this.errorMessage = page.getByTestId('error-message');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string): Promise<void> {
    await expect(this.errorMessage).toHaveText(message);
  }

  async expectRedirectToDashboard(): Promise<void> {
    await expect(this.page).toHaveURL('/dashboard');
  }
}
```

```typescript
// e2e/login.spec.ts
import { test } from '@playwright/test';
import { LoginPage } from './pages/login.page';

test.describe('Authentification', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('devrait se connecter avec des identifiants valides', async () => {
    await loginPage.login('admin@esn.fr', 'motdepasse123');
    await loginPage.expectRedirectToDashboard();
  });

  test('devrait afficher une erreur avec un mauvais mot de passe', async () => {
    await loginPage.login('admin@esn.fr', 'mauvais');
    await loginPage.expectError('Email ou mot de passe incorrect');
  });
});
```

> **Avantage** : Si le selecteur d'un element change, on le modifie a un seul endroit (la Page Object), pas dans chaque test.

### Selecteurs : data-testid, role, texte

```typescript
// ❌ Selecteur fragile — casse si le CSS ou la structure change
page.locator('.btn.btn-primary.submit-form');
page.locator('#main > div:nth-child(3) > button');

// ✅ Selecteur robuste — par role semantique
page.getByRole('button', { name: 'Envoyer' });
page.getByRole('textbox', { name: 'Email' });
page.getByRole('heading', { level: 2 });

// ✅ Selecteur robuste — par data-testid
page.getByTestId('btn-submit');
page.getByTestId('user-list');

// ✅ Selecteur par texte
page.getByText('Bienvenue, Alice');
page.getByLabel('Adresse email');
page.getByPlaceholder('Rechercher...');
```

| Strategie | Priorite | Quand l'utiliser |
|-----------|----------|-----------------|
| `getByRole` | Haute | Elements interactifs (boutons, inputs, headings) |
| `getByTestId` | Haute | Elements sans role semantique clair |
| `getByText` | Moyenne | Texte visible unique |
| `getByLabel` | Haute | Champs de formulaire |
| CSS selector | Basse | Dernier recours uniquement |

### Navigation et assertions

```typescript
test('navigation complete', async ({ page }) => {
  // Navigation
  await page.goto('/');
  await page.getByRole('link', { name: 'Projets' }).click();

  // Attendre le chargement
  await page.waitForURL('/projets');

  // Assertions sur la page
  await expect(page).toHaveTitle('Projets - Mon App');
  await expect(page).toHaveURL('/projets');

  // Assertions sur les elements
  await expect(page.getByRole('heading')).toHaveText('Mes projets');
  await expect(page.getByTestId('project-card')).toHaveCount(3);
  await expect(page.getByTestId('project-card').first()).toBeVisible();

  // Assertion sur le contenu
  await expect(page.getByTestId('total')).toContainText('3 projets');
});
```

### Tester les formulaires

```typescript
test('devrait creer un utilisateur', async ({ page }) => {
  await page.goto('/utilisateurs/nouveau');

  // Remplir le formulaire
  await page.getByLabel('Nom').fill('Alice Dupont');
  await page.getByLabel('Email').fill('alice@esn.fr');
  await page.getByLabel('Role').selectOption('developpeur');

  // Soumettre
  await page.getByRole('button', { name: 'Creer' }).click();

  // Verifier la redirection et le message
  await expect(page).toHaveURL('/utilisateurs');
  await expect(page.getByText('Utilisateur cree avec succes')).toBeVisible();
});
```

### Tester les dialogs (MatDialog)

```typescript
test('devrait confirmer la suppression via dialog', async ({ page }) => {
  await page.goto('/utilisateurs');

  // Ouvrir le dialog
  await page.getByTestId('btn-delete-1').click();

  // Verifier que le dialog est apparu
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Voulez-vous vraiment supprimer')).toBeVisible();

  // Confirmer
  await page.getByRole('button', { name: 'Confirmer' }).click();

  // Verifier le resultat
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText('Element supprime')).toBeVisible();
});
```

### Integration CI (mode headless)

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npx playwright install --with-deps

      - run: npx playwright test

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

> Le mode headless est le defaut dans la CI. Les screenshots et traces sont sauvegardes en cas d'echec.

### Quand E2E vs quand unitaire ?

| Critere | Test unitaire | Test E2E |
|---------|--------------|----------|
| **Vitesse** | Tres rapide (ms) | Lent (secondes) |
| **Portee** | Une fonction/composant | Un parcours utilisateur complet |
| **Fiabilite** | Tres stable | Peut etre flaky (reseau, timing) |
| **Cout** | Faible | Eleve (navigateur, CI) |
| **Quand l'utiliser** | Logique metier, services, pipes | Parcours critiques (login, achat) |

```
Pyramide des tests (recommandation ESN) :

          /\
         /E2E\        → 5-10 scenarios critiques
        /------\
       / Integ. \     → Tests composants avec dependances
      /----------\
     / Unitaires  \   → Maximum de coverage ici
    /--------------\
```

> **Regle d'or** : Testez unitairement tout ce que vous pouvez. Reservez les E2E aux parcours utilisateur critiques (login, paiement, formulaires importants).

---

## Pratique

Ecrivez un test E2E Playwright pour le parcours suivant :
1. Aller sur `/login`
2. Remplir email et mot de passe
3. Cliquer sur "Se connecter"
4. Verifier la redirection vers `/dashboard`
5. Verifier que le nom de l'utilisateur apparait dans la toolbar

**Consignes** :
1. Utilisez le Page Object Pattern pour `LoginPage` et `DashboardPage`
2. Utilisez `getByRole` et `getByTestId` comme selecteurs
3. Ecrivez aussi un test d'echec (mauvais mot de passe)

<details>
<summary>Solution</summary>

```typescript
// e2e/pages/login.page.ts
import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async remplirEmail(email: string) {
    await this.page.getByLabel('Email').fill(email);
  }

  async remplirMotDePasse(mdp: string) {
    await this.page.getByLabel('Mot de passe').fill(mdp);
  }

  async soumettre() {
    await this.page.getByRole('button', { name: 'Se connecter' }).click();
  }

  async login(email: string, mdp: string) {
    await this.remplirEmail(email);
    await this.remplirMotDePasse(mdp);
    await this.soumettre();
  }

  async verifierErreur(message: string) {
    await expect(this.page.getByTestId('login-error')).toHaveText(message);
  }
}

// e2e/pages/dashboard.page.ts
import { Page, expect } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  async verifierURL() {
    await expect(this.page).toHaveURL('/dashboard');
  }

  async verifierNomUtilisateur(nom: string) {
    await expect(this.page.getByTestId('user-name')).toHaveText(nom);
  }
}
```

```typescript
// e2e/login.spec.ts
import { test } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { DashboardPage } from './pages/dashboard.page';

test.describe('Parcours de connexion', () => {
  test('devrait se connecter et voir le dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login('admin@esn.fr', 'password123');

    await dashboardPage.verifierURL();
    await dashboardPage.verifierNomUtilisateur('Admin');
  });

  test('devrait afficher une erreur avec un mauvais mot de passe', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('admin@esn.fr', 'mauvais');

    await loginPage.verifierErreur('Identifiants invalides');
  });
});
```
</details>

---

## Resume

| Point cle | A retenir |
|-----------|-----------|
| Installation | `npm init playwright@latest` + config `webServer` |
| Page Object | Encapsuler selecteurs et actions dans des classes |
| Selecteurs | Privilegier `getByRole`, `getByTestId`, `getByLabel` |
| Assertions | `expect(locator).toBeVisible()`, `.toHaveText()`, `.toHaveURL()` |
| CI | Mode headless par defaut, screenshots en cas d'echec |
| Pyramide | Unitaires (beaucoup) > Integration > E2E (peu, parcours critiques) |

---

> **Prochain cours** : [Cours 39 — State management avec Services et Signals](../10-state-management/01-state-avec-services.md)
