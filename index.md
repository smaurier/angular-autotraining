---
layout: home

hero:
  name: "Angular 19 Course"
  text: "Angular 19+ · Signals · Standalone · SSR"
  tagline: Maîtrisez Angular moderne — de débutant à staffable en ESN avec les patterns production
  actions:
    - theme: brand
      text: Commencer le cours
      link: /cours/01-composants-templates/01-standalone
    - theme: alt
      text: Parcours recommandé
      link: /cours/parcours
    - theme: alt
      text: Exercices pratiques
      link: /exercices/README

features:
  - icon: 🅰️
    title: Angular 19 Standalone + Signals
    details: Composants standalone, Signals réactifs, change detection Zoneless et defer pour des applis ultra-performantes.
  - icon: 💉
    title: Injection de dépendances
    details: DI hiérarchique, tokens, providers fonctionnels et patterns D dans SOLID pour une architecture testable.
  - icon: 🔄
    title: RxJS Essentiel
    details: Observables, opérateurs fondamentaux, Subjects et patterns réactifs pour Angular.
  - icon: 🛣️
    title: Router & Guards
    details: Routing fonctionnel, lazy loading, guards, resolvers et gestion d'état URL.
  - icon: 🧪
    title: Tests Angular
    details: Tests unitaires, spectator, Cypress et stratégies de tests pour les projets enterprise.
  - icon: 🔐
    title: Auth, CI/CD & Recettes ESN
    details: JWT, RBAC, NgRx/Signals store et bonnes pratiques directement applicables en mission.
---

## Structure du cours

| Module | Thèmes |
|--------|--------|
| [Composants & Templates](/cours/01-composants-templates/01-standalone) | Standalone, directives, pipes, inputs, content projection, defer |
| [Signals avancés](/cours/02-signals-avances/01-signals) | Signals, computed, effects, signal-based inputs |
| [Services & DI](/cours/03-services-di/01-services) | Services, injection, tokens, providers |
| [Routing](/cours/04-routing/01-router-fondamentaux) | Router, guards, resolvers, lazy loading |
| [RxJS Essentiel](/cours/05-rxjs-essentiel/01-observables) | Observables, opérateurs, subjects, patterns |
| [HTTP & API](/cours/06-http-api/01-httpclient) | HttpClient, interceptors, gestion d'erreurs |
| [Formulaires](/cours/07-formulaires/01-template-driven) | Template-driven, reactive, validation avancée |
| [Angular Material](/cours/08-angular-material/01-composants-material) | Composants, theming, CDK |
| [Accessibilité](/cours/09-accessibilite/01-a11y-angular) | ARIA, CDK a11y, audit |
| [Tests](/cours/09-tests/01-tests-unitaires) | Unitaires, composants, E2E |
| [State Management](/cours/10-state-management/01-ngrx-ngxs) | NgRx, Signals store, patterns |
| [Auth & CI/CD](/cours/11-cicd-auth-securite/02-auth-jwt-guards) | JWT, guards, pipeline |
| [Recettes ESN](/cours/12-recettes-esn/01-architecture-mission) | Architecture en mission, bonnes pratiques |

### Quizzes

- [Quiz Accessibilité CDK](/quizzes/quiz-accessibilite-cdk-a11y.html)
- [Quiz Defer & Zoneless](/quizzes/quiz-defer-zoneless.html)

## Démarrer en local

```bash
# dans 03-angular/
pnpm install
pnpm docs:dev    # → http://localhost:5172
```
