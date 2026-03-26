import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Angular 19 Course',
  description: 'Formation Angular 19+ : Standalone, Signals, DI, RxJS, formulaires, routing, Material, SSR',
  lang: 'fr-FR',
  srcDir: '.',

  vite: {
    server: {
      port: 5172,
      strictPort: false
    }
  },

  ignoreDeadLinks: true,

  themeConfig: {
    nav: [
      { text: 'Cours', link: '/cours/01-composants-templates/01-standalone' },
      { text: 'Exercices', link: '/exercices/README' },
      { text: 'Quizzes', link: '/quizzes/' },
      { text: 'Projet fil rouge', link: '/projet-fil-rouge/README' }
    ],

    sidebar: {
      '/cours/': [
        {
          text: 'Avant-propos',
          items: [
            { text: 'Pièges fréquents', link: '/cours/00-pieges-frequents' },
            { text: 'Parcours recommandé', link: '/cours/parcours' },
            { text: 'De Vue à Angular', link: '/cours/00-de-vue-a-angular/01-mental-model' }
          ]
        },
        {
          text: 'Composants & Templates',
          items: [
            { text: 'Standalone components', link: '/cours/01-composants-templates/01-standalone' },
            { text: 'Interpolation & Binding', link: '/cours/01-composants-templates/02-interpolation-binding' },
            { text: 'Directives structurelles', link: '/cours/01-composants-templates/03-directives-structurelles' },
            { text: 'Pipes', link: '/cours/01-composants-templates/04-pipes' },
            { text: 'Inputs & Outputs', link: '/cours/01-composants-templates/05-inputs-outputs' },
            { text: 'Content Projection', link: '/cours/01-composants-templates/06-content-projection' },
            { text: 'Change Detection', link: '/cours/01-composants-templates/07-change-detection' },
            { text: 'Defer & Zoneless', link: '/cours/01-composants-templates/08-defer-et-zoneless' }
          ]
        },
        {
          text: 'Signals Avancés',
          items: [
            { text: 'Signals', link: '/cours/02-signals-avances/01-signals' },
            { text: 'Computed & Effects', link: '/cours/02-signals-avances/02-computed-et-effects' },
            { text: 'Signal-based inputs', link: '/cours/02-signals-avances/03-signal-based-inputs' }
          ]
        },
        {
          text: 'Services & Injection de dépendances',
          items: [
            { text: 'Services', link: '/cours/03-services-di/01-services' },
            { text: 'Injection de dépendances', link: '/cours/03-services-di/02-injection-de-dependances' },
            { text: 'Tokens & Providers', link: '/cours/03-services-di/03-tokens-et-providers' }
          ]
        },
        {
          text: 'Routing',
          items: [
            { text: 'Router fondamentaux', link: '/cours/04-routing/01-router-fondamentaux' },
            { text: 'Guards & Resolvers', link: '/cours/04-routing/02-guards-et-resolvers' },
            { text: 'Lazy loading', link: '/cours/04-routing/03-lazy-loading' },
            { text: 'Router avancé', link: '/cours/04-routing/04-router-avance' }
          ]
        },
        {
          text: 'RxJS Essentiel',
          items: [
            { text: 'Observables', link: '/cours/05-rxjs-essentiel/01-observables' },
            { text: 'Opérateurs fondamentaux', link: '/cours/05-rxjs-essentiel/02-operateurs-fondamentaux' },
            { text: 'Subjects', link: '/cours/05-rxjs-essentiel/03-subjects' },
            { text: 'Patterns RxJS', link: '/cours/05-rxjs-essentiel/04-patterns-rxjs' }
          ]
        },
        {
          text: 'HTTP & API',
          items: [
            { text: 'HttpClient', link: '/cours/06-http-api/01-httpclient' },
            { text: 'Interceptors', link: '/cours/06-http-api/02-interceptors' },
            { text: 'Gestion erreurs', link: '/cours/06-http-api/03-gestion-erreurs' }
          ]
        },
        {
          text: 'Formulaires',
          items: [
            { text: 'Template-driven forms', link: '/cours/07-formulaires/01-template-driven' },
            { text: 'Reactive forms', link: '/cours/07-formulaires/02-reactive-forms' },
            { text: 'Validation', link: '/cours/07-formulaires/03-validation' },
            { text: 'Formulaires avancés', link: '/cours/07-formulaires/04-formulaires-avances' }
          ]
        },
        {
          text: 'Angular Material',
          items: [
            { text: 'Composants Material', link: '/cours/08-angular-material/01-composants-material' },
            { text: 'Theming', link: '/cours/08-angular-material/02-theming' },
            { text: 'CDK', link: '/cours/08-angular-material/03-cdk' }
          ]
        },
        {
          text: 'Accessibilité',
          items: [
            { text: 'A11y avec Angular', link: '/cours/09-accessibilite/01-a11y-angular' }
          ]
        },
        {
          text: 'Tests',
          items: [
            { text: 'Tests unitaires', link: '/cours/09-tests/01-tests-unitaires' },
            { text: 'Tests composants', link: '/cours/09-tests/02-tests-composants' }
          ]
        },
        {
          text: 'State Management',
          items: [
            { text: 'NgRx / NGXS', link: '/cours/10-state-management/01-ngrx-ngxs' },
            { text: 'Signals dans le state', link: '/cours/10-state-management/02-signals-state' },
            { text: 'State patterns', link: '/cours/10-state-management/03-state-patterns' }
          ]
        },
        {
          text: 'CI/CD & Auth',
          items: [
            { text: 'Auth JWT & Guards', link: '/cours/11-cicd-auth-securite/02-auth-jwt-guards' }
          ]
        },
        {
          text: 'Recettes ESN',
          items: [
            { text: 'Architecture en mission', link: '/cours/12-recettes-esn/01-architecture-mission' },
            { text: 'Bonnes pratiques ESN', link: '/cours/12-recettes-esn/02-bonnes-pratiques' }
          ]
        }
      ],
      '/quizzes/': [
        {
          text: 'Quizzes',
          items: [
            { text: 'Quiz — Accessibilité CDK', link: '/quizzes/quiz-accessibilite-cdk-a11y.html' },
            { text: 'Quiz — Defer & Zoneless', link: '/quizzes/quiz-defer-zoneless.html' }
          ]
        }
      ]
    },

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3],
      label: 'Sur cette page'
    },

    docFooter: {
      prev: 'Précédent',
      next: 'Suivant'
    }
  }
})
