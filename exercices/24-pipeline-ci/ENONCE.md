# Exercice 24 — Pipeline CI

**Module** : 11-CI-CD-Auth-Securite · **Difficulte** : ⭐⭐
**Duree estimee** : 60 min
**Cours** : `cours/11-cicd-auth-securite/01-pipeline-cicd.md`

## Objectif

Creer un workflow GitHub Actions complet pour un projet Angular : installation, lint, tests, build et deploiement sur GitHub Pages, avec cache des dependances et protection de branche.

## Consignes

1. Creer le fichier workflow dans `src/app/exercises/ex24/.github/workflows/ci.yml`
2. Configurer le **declencheur** du workflow :
   - Se declenche sur `push` vers `main` et `develop`
   - Se declenche sur `pull_request` vers `main`
3. Definir le **job `build`** avec les etapes suivantes :
   - `checkout` — recuperer le code source avec `actions/checkout@v4`
   - `setup-node` — installer Node.js 20 avec `actions/setup-node@v4`
   - `cache` — mettre en cache `node_modules` avec une cle basee sur le hash de `package-lock.json`
   - `install` — `npm ci` (installation propre des dependances)
   - `lint` — `npx ng lint` (analyse statique du code)
   - `test` — `npx ng test --no-watch --code-coverage` (tests unitaires en mode CI)
   - `build` — `npx ng build --configuration=production` (build de production)
4. Definir le **job `deploy`** qui depend de `build` et ne s'execute que sur la branche `main` :
   - Deployer le contenu du dossier `dist/` sur GitHub Pages avec `actions/deploy-pages@v4`
   - Configurer les permissions `pages: write` et `id-token: write`
5. Creer un fichier `src/app/exercises/ex24/.github/branch-protection.md` documentant les regles de protection de branche recommandees :
   - Require pull request before merging
   - Require status checks to pass (job `build`)
   - Require branches to be up to date
6. Creer un fichier `src/app/exercises/ex24/scripts/pre-push.sh` contenant un hook Git pre-push qui lance lint + test avant chaque push

## Contraintes TypeScript

- Le fichier YAML doit etre valide (indentation correcte, syntaxe GitHub Actions)
- Utiliser `npm ci` et non `npm install` pour la reproductibilite
- Le cache doit utiliser `hashFiles('**/package-lock.json')` comme cle
- Le build de production doit utiliser `--configuration=production`

## Bonus

- Ajouter un job de **tests E2E Playwright** qui s'execute apres le build
- Ajouter une notification Slack en cas d'echec du pipeline
- Ajouter une matrice de test sur plusieurs versions de Node.js (18, 20, 22)
- Generer et publier le rapport de couverture de code comme artefact

## Fichiers

-> `src/app/exercises/ex24/.github/workflows/ci.yml`
-> `src/app/exercises/ex24/.github/branch-protection.md`
-> `src/app/exercises/ex24/scripts/pre-push.sh`
