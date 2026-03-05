# Cours 42 — Pipeline CI/CD pour Angular

> **Objectif** : Mettre en place un pipeline CI/CD avec GitHub Actions pour un projet Angular : lint, tests headless, build production, deploiement.

---

## Rappel du cours precedent

<details>
<summary>1. Qu'est-ce qu'un SignalStore dans NgRx ?</summary>

Un conteneur d'etat reactif base sur les Signals. Il se cree avec `signalStore()` et utilise des features comme `withState()`, `withComputed()`, `withMethods()`.
</details>

<details>
<summary>2. Comment gerer les mises a jour optimistes ?</summary>

On met a jour le state local **avant** la reponse serveur, puis on annule (rollback) en cas d'erreur HTTP via `catchError`.
</details>

<details>
<summary>3. Quelle est la difference entre un state service et NgRx SignalStore ?</summary>

Un state service utilise des `signal()` dans un `@Injectable`. SignalStore ajoute une structure formelle (features, plugins, devtools) pour les apps d'entreprise.
</details>

---

## Analogie

En Vue, tu as configure des scripts npm et peut-etre un pipeline GitLab/GitHub Actions. En Angular, c'est **identique** : la CLI fournit `lint`, `test`, `build`, et le pipeline les orchestre.

Pense au pipeline comme une **chaine de montage** : chaque poste verifie le produit. Si un poste detecte un defaut, la chaine s'arrete.

---

## Theorie

### Les etapes d'un pipeline Angular

```
install → lint → test → build → deploy
```

### Workflow GitHub Actions complet

```yaml
# .github/workflows/ci.yml
name: CI Angular
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      # Cache node_modules
      - uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}

      - run: npm ci                # ✅ Deterministe
      - run: npx ng lint
      - run: npx ng test --watch=false --browsers=ChromeHeadless
      - run: npx ng build --configuration production

      - uses: actions/upload-artifact@v4
        if: github.ref == 'refs/heads/main'
        with:
          name: dist
          path: dist/
```

### npm ci vs npm install

```bash
# ❌ Peut modifier package-lock.json
npm install

# ✅ Installation deterministe, plus rapide en CI
npm ci
```

### Tests headless en CI

```bash
# ❌ Echoue en CI (pas d'ecran)
ng test

# ✅ Chrome sans interface graphique
ng test --watch=false --browsers=ChromeHeadless
```

> Avec Jest ou Vitest, pas besoin de navigateur — les tests s'executent dans Node.js.

### Build de production

`ng build --configuration production` active :

| Optimisation | Description |
|---|---|
| AOT compilation | Templates compiles a l'avance |
| Tree-shaking | Code non utilise supprime |
| Minification | Fichiers JS/CSS reduits |
| Budgets | Alerte si le bundle depasse les seuils |

Les budgets dans `angular.json` :

```json
{ "budgets": [
  { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" }
]}
```

### Cibles de deploiement

#### Docker + Nginx

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

FROM nginx:alpine
COPY --from=build /app/dist/mon-app/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    location / {
        try_files $uri $uri/ /index.html;  # SPA routing
    }
    location ~* \.(js|css|png|jpg|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Vercel / Firebase Hosting

```yaml
# Vercel
- uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-args: '--prod'

# Firebase
- uses: FirebaseExtended/action-hosting-deploy@v0
  with:
    firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
```

### Protection des branches

```
GitHub → Settings → Branches → Branch protection rules :
✅ Require pull request before merging
✅ Require status checks to pass (selectionner le job "ci")
✅ Require branches to be up to date
```

---

## Pratique

Creez un fichier `.github/workflows/ci.yml` qui : se declenche sur push/PR vers `main`, cache les dependances, execute lint + tests + build, et n'uploade l'artifact que sur `main`.

<details>
<summary>Solution</summary>

```yaml
name: CI/CD Angular
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
      - run: npm ci
      - run: npx ng lint
      - run: npx ng test --watch=false --browsers=ChromeHeadless --code-coverage
      - run: npx ng build --configuration production
      - uses: actions/upload-artifact@v4
        if: github.ref == 'refs/heads/main'
        with: { name: dist, path: dist/ }
```
</details>

---

## Resume

| Point cle | A retenir |
|---|---|
| Pipeline | `install → lint → test → build → deploy` |
| `npm ci` | Toujours en CI, jamais `npm install` |
| Cache | Cle basee sur `package-lock.json` |
| Tests CI | `--watch=false --browsers=ChromeHeadless` |
| Build prod | `--configuration production` (AOT, tree-shaking, minification) |
| Deploy | Vercel (simple), Firebase, ou Docker+Nginx |
| Branches | Exiger le CI vert avant merge dans `main` |

---

> **Prochain cours** : [Cours 43 — Authentification JWT : guards et interceptors](./02-auth-jwt-guards.md)
