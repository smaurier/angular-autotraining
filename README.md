# Angular par exemple (TypeScript + Angular 19+)

Formation progressive Angular : Transition Vue → Angular staffable ESN.

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
