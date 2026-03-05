# Correction — Exercice 24 : Pipeline CI

## Resultat attendu

Un workflow GitHub Actions complet qui, a chaque push ou pull request, installe les dependances (avec cache), lance le linting, les tests, le build de production, et deploie automatiquement sur GitHub Pages quand on merge dans `main`.

## Code corrige

### Workflow CI/CD

```yaml
# src/app/exercises/ex24/.github/workflows/ci.yml

# --- Nom du workflow ---
# Apparait dans l'onglet "Actions" de GitHub
name: CI/CD Angular

# --- Declencheurs ---
# on: definit quand le workflow se lance
on:
  # Push sur main ou develop
  push:
    branches:
      - main
      - develop

  # Pull request vers main
  pull_request:
    branches:
      - main

# --- Permissions ---
# Necessaires pour le deploiement sur GitHub Pages
permissions:
  contents: read       # Lire le code source
  pages: write         # Ecrire sur GitHub Pages
  id-token: write      # Token OIDC pour l'authentification Pages

# --- Variables d'environnement globales ---
env:
  NODE_VERSION: '20'
  # Desactive les prompts interactifs d'Angular CLI
  NG_CLI_ANALYTICS: false

# =============================================
# JOBS
# =============================================
jobs:
  # =============================================
  # JOB 1 : Build (lint + test + build)
  # =============================================
  build:
    name: Build & Test
    # Image Ubuntu LTS la plus recente
    runs-on: ubuntu-latest

    steps:
      # --- Etape 1 : Checkout ---
      # Recupere le code source du repository
      - name: Checkout du code source
        uses: actions/checkout@v4

      # --- Etape 2 : Setup Node.js ---
      # Installe la version de Node.js specifiee
      - name: Installation de Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      # --- Etape 3 : Cache node_modules ---
      # Evite de retelecharger les dependances a chaque run
      # La cle est basee sur le hash de package-lock.json :
      # si le fichier ne change pas, le cache est reutilise
      - name: Cache des dependances npm
        uses: actions/cache@v4
        id: npm-cache
        with:
          # Chemin a mettre en cache
          path: node_modules
          # Cle unique basee sur l'OS + le hash du lockfile
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          # Cle de fallback si le lockfile a change (reutilise un cache partiel)
          restore-keys: |
            ${{ runner.os }}-node-

      # --- Etape 4 : Installation des dependances ---
      # npm ci : installation propre basee sur le lockfile
      # Plus rapide et plus fiable que npm install en CI
      # Condition : on ne reinstalle que si le cache n'a pas ete trouve
      - name: Installation des dependances
        if: steps.npm-cache.outputs.cache-hit != 'true'
        run: npm ci

      # --- Etape 5 : Linting ---
      # Analyse statique du code avec ESLint via Angular CLI
      - name: Linting du code
        run: npx ng lint

      # --- Etape 6 : Tests unitaires ---
      # --no-watch : execute les tests une fois et s'arrete (mode CI)
      # --code-coverage : genere un rapport de couverture
      # --browsers=ChromeHeadless : pas de fenetre graphique en CI
      - name: Tests unitaires
        run: npx ng test --no-watch --code-coverage --browsers=ChromeHeadless

      # --- Etape 7 : Build de production ---
      # --configuration=production active les optimisations :
      # minification, tree-shaking, AOT compilation, budget check
      - name: Build de production
        run: npx ng build --configuration=production

      # --- Etape 8 : Upload de l'artefact ---
      # Sauvegarde le dossier dist/ pour le job de deploiement
      - name: Upload de l'artefact build
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist/mon-projet/browser

  # =============================================
  # JOB 2 : Deploy (GitHub Pages)
  # =============================================
  deploy:
    name: Deploy GitHub Pages
    # Ne s'execute que si le job build a reussi
    needs: build
    # Conditions : uniquement sur main et sur un push (pas une PR)
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest

    # Environnement GitHub Pages
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      # --- Etape 1 : Configuration de GitHub Pages ---
      - name: Configuration de GitHub Pages
        uses: actions/configure-pages@v4

      # --- Etape 2 : Deploiement ---
      # Deploie l'artefact uploade par le job build
      - name: Deploiement sur GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Documentation de protection de branche

```markdown
<!-- src/app/exercises/ex24/.github/branch-protection.md -->

# Regles de protection de la branche `main`

Ces regles se configurent dans **Settings > Branches > Branch protection rules** sur GitHub.

## Regles recommandees

### 1. Require a pull request before merging
- Nombre minimum de reviewers : **1**
- Dismiss stale pull request approvals when new commits are pushed : **oui**
- Require review from Code Owners : **oui** (si CODEOWNERS configure)

### 2. Require status checks to pass before merging
- Cocher : **Require branches to be up to date before merging**
- Status checks requis :
  - `Build & Test` (le job `build` du workflow CI)

### 3. Regles supplementaires
- **Do not allow bypassing the above settings** : personne ne peut merger sans respecter les regles
- **Require signed commits** : optionnel, mais recommande
- **Require linear history** : force le rebase (pas de merge commits)

## Workflow recommande

1. Creer une branche `feature/xxx` depuis `develop`
2. Developper et committer
3. Ouvrir une Pull Request vers `main`
4. Le workflow CI se declenche automatiquement
5. Un reviewer approuve la PR
6. Merger quand tous les checks sont verts
```

### Script pre-push

```bash
#!/bin/bash
# src/app/exercises/ex24/scripts/pre-push.sh
#
# Hook Git pre-push : lance lint et tests avant chaque push
# Installation : cp scripts/pre-push.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push

echo "=== Pre-push hook : verification du code ==="

# --- Etape 1 : Linting ---
echo "[1/2] Linting..."
npx ng lint
LINT_EXIT=$?

if [ $LINT_EXIT -ne 0 ]; then
  echo "ERREUR : Le linting a echoue. Corrigez les erreurs avant de push."
  exit 1
fi

# --- Etape 2 : Tests ---
echo "[2/2] Tests unitaires..."
npx ng test --no-watch --browsers=ChromeHeadless
TEST_EXIT=$?

if [ $TEST_EXIT -ne 0 ]; then
  echo "ERREUR : Les tests ont echoue. Corrigez les erreurs avant de push."
  exit 1
fi

echo "=== Pre-push hook : tout est OK ==="
exit 0
```

## Ce que tu aurais pu oublier

### 1. Utiliser `npm install` au lieu de `npm ci`
- ❌ `npm install` → peut modifier `package-lock.json` et creer des incoherences
- ✅ `npm ci` → installation propre basee strictement sur le lockfile, plus rapide en CI

### 2. Oublier le `--no-watch` pour les tests en CI
- ❌ `npx ng test` → reste en mode watch, le job ne se termine jamais
- ✅ `npx ng test --no-watch` → execute les tests une fois et s'arrete

### 3. Mauvaise cle de cache
- ❌ `key: ${{ runner.os }}-node` → meme cache pour tous les lockfiles, dependencies obsoletes
- ✅ `key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}` → cache invalide quand les deps changent

### 4. Oublier les permissions pour GitHub Pages
- ❌ Pas de `permissions: pages: write` → erreur "Resource not accessible by integration"
- ✅ Declarer `pages: write` et `id-token: write` au niveau du workflow

### 5. Deployer sur chaque push (y compris develop)
- ❌ Pas de condition `if:` sur le job deploy → deploie le code de develop en production
- ✅ `if: github.ref == 'refs/heads/main' && github.event_name == 'push'` → deploie uniquement main

### 6. Oublier `--configuration=production` pour le build
- ❌ `ng build` → build de developpement (non optimise, gros bundle)
- ✅ `ng build --configuration=production` → minification, tree-shaking, AOT

## Concepts cles utilises

| Concept | Explication |
|---------|-------------|
| `on: push / pull_request` | Declencheurs du workflow — quand il se lance |
| `jobs` | Unite d'execution — chaque job tourne sur une machine virtuelle separee |
| `needs: build` | Dependance entre jobs — deploy attend que build soit termine |
| `actions/cache@v4` | Cache les fichiers entre les runs pour accelerer le pipeline |
| `npm ci` | Installation propre des dependances basee sur le lockfile |
| `--no-watch` | Mode non-interactif pour les tests (indispensable en CI) |
| `--configuration=production` | Build optimise pour la production |
| `actions/deploy-pages@v4` | Deploie un artefact sur GitHub Pages |
| `if:` | Condition d'execution d'un step ou d'un job |
| `hashFiles()` | Calcule un hash de fichier pour les cles de cache |
