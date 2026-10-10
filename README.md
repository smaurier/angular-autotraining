# Angular par exemple (TypeScript + Angular 19+)

![VitePress](https://img.shields.io/badge/-VitePress-646CFF?style=flat-square&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
[![fullstack-autotraining](https://img.shields.io/badge/curriculum-fullstack--autotraining-4C1?style=flat-square)](https://github.com/smaurier/fullstack-autotraining)

Formation progressive Angular : Transition Vue → Angular staffable ESN.

<!-- labs-gestes:start -->
## Labs — refonte du 22/09/2026 : un lab = un geste métier complet

> Règle qualité 5 du parcours : chaque lab est **un geste métier complet**, sous deux formes — **Zéro** (construire de zéro un artefact réel et entier) ou **Intervention** (modifier de l'existant avec consommateurs, findings avant code, non-régression). Un lab n'entre en file qu'avec un **oracle exécutable** (`src/` starter · `test/` · `solution/` séparée). Les labs historiques de ce cours (un concept par lab, sans oracle) restent dans `labs/` jusqu'à remplacement et **ne sont plus la file**. Cible détaillée : [`docs/gestes-complets.md`](../docs/gestes-complets.md). État : **2/2 avec oracle — cours COMPLET (10/10/2026)**.
>
> **Note infra (10/10/2026) :** le rendu de template Angular (TestBed + compilateur) reste hors
> oracle sur cet environnement — `@analogjs/vite-plugin-angular` + `@angular/build` 19.2
> segfaultent toujours. **Piste vérifiée** : `@angular/build` fournit un builder natif
> `unit-test` (runner Vitest intégré, sans ce plugin) à partir de la v20, absent en 19.2 —
> candidat sérieux pour lever le blocage un jour. Spike d'installation isolée tenté (poste
> sylva, 10/10) : bloqué par deux chaînes de peer-deps à la suite (`@angular/build@22` exige
> TypeScript ≥6.0, puis vitest ^4/^5) — pas résolu dans l'effort imparti, nécessiterait de
> faire monter TOUT le cours (Angular 19→20+, vitest 2→4/5, TS 5.6→6.0+) en même temps, un vrai
> chantier de version, pas un correctif. **Choix retenu pour lab-02 entre-temps : composant
> testé comme une classe logique pure** (DI par constructeur, jamais `inject()`, jamais de
> template rendu), même frontière que lab-01 — cohérent avec la doctrine du cours ("logique
> hors template"), et ça marche : solution GREEN / starter RED vérifiés sans aucun TestBed.

| # | Lab | Forme | Geste | Oracle |
|---|-----|-------|-------|--------|
| 01 | [`lab-01-feature-de-zero`](labs/lab-01-feature-de-zero/README.md) | Zéro | service DI + RxJS (recherche debouncée + création) ; composant hors oracle — @analogjs/vite-plugin-angular + @angular/build crashent (segfault) sur cet environnement | ✅ vérifié |
| 02 | [`lab-02-intervention-chargement-membres`](labs/lab-02-intervention-chargement-membres/README.md) | Intervention | composant consommé (`MembresFamilleComponent`) gagne loading/erreur + switchMap anti-requête-obsolète, sans template rendu (classe testée directement) | ✅ vérifié |

<!-- labs-gestes:end -->

## Stack

- **Framework** : Angular 19+ (standalone, Signals, @if/@for)
- **Langage** : TypeScript strict
- **UI** : Angular Material + CDK
- **State** : Services + Signals, NgRx SignalStore
- **Tests** : Jest + Playwright
- **Package manager** : npm

## Démarrage rapide

```bash
npm install
ng serve
```

## Vérification qualité

```bash
ng build              # Build production
npm run test          # Tests unitaires
npm run e2e           # Tests E2E
```

## Structure

```
cours/           → Cours pédagogiques en Markdown
exercices/       → Énoncés, corrections et checklists
src/             → Code Angular (composants à modifier)
projet-fil-rouge/→ DevDesk : app Kanban construite progressivement
```

## Méthode de travail

1. Lis la leçon dans `cours/`
2. Ouvre l'énoncé dans `exercices/`
3. Code en TypeScript dans `src/app/exercises/...`
4. Lance l'app et valide le comportement
5. Compare avec la correction

## Parcours cible (ESN)

| Niveau | Compétences |
|--------|------------|
| **Débutant solide** | Composants standalone, Signals, templates, DI |
| **Intermédiaire** | Routing, RxJS, HttpClient, formulaires, Material |
| **Avancé** | State management, tests complets, CI/CD, auth |
| **Staffable ESN** | Patterns entreprise, entretien technique, autonomie |

**Durée estimée** : ~65h (~2.5 mois à 1 cours/jour)

**Prérequis** : avoir complété la formation Vue 3 (vue-autotraining)
