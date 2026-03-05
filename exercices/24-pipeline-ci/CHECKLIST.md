# Checklist — Exercice 24 : Pipeline CI

## Workflow CI

- [ ] Le fichier YAML est a l'emplacement `.github/workflows/ci.yml`
- [ ] Le workflow se declenche sur `push` vers `main` et `develop`
- [ ] Le workflow se declenche sur `pull_request` vers `main`
- [ ] Les permissions `pages: write` et `id-token: write` sont declarees

## Job Build

- [ ] `actions/checkout@v4` recupere le code source
- [ ] `actions/setup-node@v4` installe Node.js avec la bonne version
- [ ] Le cache `node_modules` utilise `hashFiles('**/package-lock.json')` comme cle
- [ ] L'installation utilise `npm ci` (pas `npm install`)
- [ ] Le linting est execute avec `npx ng lint`
- [ ] Les tests utilisent `--no-watch` et `--code-coverage`
- [ ] Le build utilise `--configuration=production`
- [ ] L'artefact build est uploade pour le deploiement

## Job Deploy

- [ ] Le job `deploy` depend du job `build` avec `needs: build`
- [ ] Le deploiement ne s'execute que sur la branche `main` (condition `if:`)
- [ ] Le deploiement utilise `actions/deploy-pages@v4`
- [ ] L'environnement GitHub Pages est configure

## Extras

- [ ] Le fichier `branch-protection.md` documente les regles de protection de branche
- [ ] Le script `pre-push.sh` lance lint + tests avant chaque push
- [ ] Le script est executable (`chmod +x`)
