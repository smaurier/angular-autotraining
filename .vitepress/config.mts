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

  // Docs statiques : jamais d'interpolation Vue live dans le markdown. On remappe les
  // délimiteurs `{{ }}` vers une séquence improbable pour que les moustaches Angular de
  // démonstration en prose s'affichent littéralement sans casser le build SSR.
  vue: {
    template: {
      compilerOptions: {
        delimiters: ['(%(', ')%)']
      }
    }
  },

  ignoreDeadLinks: true,

  // Refonte v1 : le cours vit désormais dans `modules/` (théorie) + `labs/` (pratique).
  // L'ancien contenu (`cours/NN-*/`, `exercices/`, `quizzes/`, `src/`, `projet-fil-rouge/`)
  // est conservé sur disque comme source d'audit / archive git, mais EXCLU du build pour
  // éviter les pages en double. `cours/00-pieges-frequents`, `cours/parcours`,
  // `cours/GUIDE-APPRENANT` restent publiés.
  srcExclude: [
    'cours/00-de-vue-a-angular/**',
    'cours/01-composants-templates/**',
    'cours/02-signals-avances/**',
    'cours/03-services-di/**',
    'cours/04-routing/**',
    'cours/05-rxjs-essentiel/**',
    'cours/06-http-api/**',
    'cours/07-formulaires/**',
    'cours/08-angular-material/**',
    'cours/09-accessibilite/**',
    'cours/09-tests/**',
    'cours/10-state-management/**',
    'cours/11-cicd-auth-securite/**',
    'cours/12-recettes-esn/**',
    'exercices/**',
    'quizzes/**',
    'src/**',
    'projet-fil-rouge/**'
  ],

  themeConfig: {
    nav: [
      { text: 'Cours', link: '/modules/00-de-vue-a-angular' },
      { text: 'Labs', link: '/labs/lab-00-de-vue-a-angular/README' },
      { text: 'Pièges fréquents', link: '/cours/00-pieges-frequents' },
      { text: 'Parcours', link: '/cours/parcours' }
    ],

    sidebar: {
      '/modules/': [
        {
          text: 'Composants & templates',
          items: [
            { text: '00 · De Vue à Angular', link: '/modules/00-de-vue-a-angular' },
            { text: '01 · Premier projet standalone', link: '/modules/01-premier-projet-standalone' },
            { text: '02 · Signaux — bases', link: '/modules/02-signaux-base' },
            { text: '03 · Control flow (@if/@for)', link: '/modules/03-control-flow' },
            { text: '04 · Binding & events', link: '/modules/04-binding-et-events' },
            { text: '05 · input() / output() / model()', link: '/modules/05-input-output-model' },
            { text: '06 · Lifecycle & signal queries', link: '/modules/06-lifecycle-hooks' },
            { text: '07 · Pipes & directives', link: '/modules/07-pipes-et-directives' },
            { text: '08 · Defer & zoneless', link: '/modules/08-defer-et-zoneless' }
          ]
        },
        {
          text: 'Signaux avancés',
          items: [
            { text: '09 · Signaux avancés', link: '/modules/09-signaux-avances' },
            { text: '10 · Resource API', link: '/modules/10-resource-api' }
          ]
        },
        {
          text: 'Services & injection de dépendances',
          items: [
            { text: '11 · Services & @Injectable', link: '/modules/11-services-et-injectable' },
            { text: '12 · Providers & scopes', link: '/modules/12-providers-et-scopes' },
            { text: '13 · Injection tokens', link: '/modules/13-injection-tokens' }
          ]
        },
        {
          text: 'Routing',
          items: [
            { text: '14 · Routing', link: '/modules/14-routing' },
            { text: '15 · Guards & lazy loading', link: '/modules/15-guards-et-lazy-loading' }
          ]
        },
        {
          text: 'RxJS',
          items: [
            { text: '16 · Observables & opérateurs', link: '/modules/16-rxjs-observables-et-operators' },
            { text: '17 · Patterns & interop signals', link: '/modules/17-rxjs-patterns-et-interop-signals' }
          ]
        },
        {
          text: 'HTTP & formulaires',
          items: [
            { text: '18 · HttpClient, interceptors, cache', link: '/modules/18-http-crud-interceptors-cache' },
            { text: '19 · Formulaires réactifs', link: '/modules/19-formulaires-reactifs-et-signal-forms' },
            { text: '20 · Formulaires — patterns', link: '/modules/20-formulaires-patterns' }
          ]
        },
        {
          text: 'UI, a11y & qualité',
          items: [
            { text: '21 · Angular Material & CDK', link: '/modules/21-angular-material-et-cdk' },
            { text: '22 · Accessibilité', link: '/modules/22-accessibilite' },
            { text: '23 · Tests (composant, HTTP, DI)', link: '/modules/23-tests-composants-http-di' }
          ]
        },
        {
          text: 'State, auth & mission',
          items: [
            { text: '24 · State management', link: '/modules/24-state-management' },
            { text: '25 · Auth JWT & guards', link: '/modules/25-auth-jwt-guards' },
            { text: '26 · Recettes ESN & pièges', link: '/modules/26-recettes-esn-et-pieges' }
          ]
        }
      ],
      '/labs/': [
        {
          text: 'Labs — pratique (énoncé + corrigé)',
          items: [
            { text: 'Lab 00 · De Vue à Angular', link: '/labs/lab-00-de-vue-a-angular/README' },
            { text: 'Lab 01 · Premier projet standalone', link: '/labs/lab-01-premier-projet-standalone/README' },
            { text: 'Lab 02 · Signaux — bases', link: '/labs/lab-02-signaux-base/README' },
            { text: 'Lab 03 · Control flow', link: '/labs/lab-03-control-flow/README' },
            { text: 'Lab 04 · Binding & events', link: '/labs/lab-04-binding-et-events/README' },
            { text: 'Lab 05 · input/output/model', link: '/labs/lab-05-input-output-model/README' },
            { text: 'Lab 06 · Lifecycle & signal queries', link: '/labs/lab-06-lifecycle-hooks/README' },
            { text: 'Lab 07 · Pipes & directives', link: '/labs/lab-07-pipes-et-directives/README' },
            { text: 'Lab 08 · Defer & zoneless', link: '/labs/lab-08-defer-et-zoneless/README' },
            { text: 'Lab 09 · Signaux avancés', link: '/labs/lab-09-signaux-avances/README' },
            { text: 'Lab 10 · Resource API', link: '/labs/lab-10-resource-api/README' },
            { text: 'Lab 11 · Services & @Injectable', link: '/labs/lab-11-services-et-injectable/README' },
            { text: 'Lab 12 · Providers & scopes', link: '/labs/lab-12-providers-et-scopes/README' },
            { text: 'Lab 13 · Injection tokens', link: '/labs/lab-13-injection-tokens/README' },
            { text: 'Lab 14 · Routing', link: '/labs/lab-14-routing/README' },
            { text: 'Lab 15 · Guards & lazy loading', link: '/labs/lab-15-guards-et-lazy-loading/README' },
            { text: 'Lab 16 · Observables & opérateurs', link: '/labs/lab-16-rxjs-observables-et-operators/README' },
            { text: 'Lab 17 · Patterns & interop signals', link: '/labs/lab-17-rxjs-patterns-et-interop-signals/README' },
            { text: 'Lab 18 · HttpClient & interceptors', link: '/labs/lab-18-http-crud-interceptors-cache/README' },
            { text: 'Lab 19 · Formulaires réactifs', link: '/labs/lab-19-formulaires-reactifs-et-signal-forms/README' },
            { text: 'Lab 20 · Formulaires — patterns', link: '/labs/lab-20-formulaires-patterns/README' },
            { text: 'Lab 21 · Material & CDK', link: '/labs/lab-21-angular-material-et-cdk/README' },
            { text: 'Lab 22 · Accessibilité', link: '/labs/lab-22-accessibilite/README' },
            { text: 'Lab 23 · Tests', link: '/labs/lab-23-tests-composants-http-di/README' },
            { text: 'Lab 24 · State management', link: '/labs/lab-24-state-management/README' },
            { text: 'Lab 25 · Auth JWT & guards', link: '/labs/lab-25-auth-jwt-guards/README' },
            { text: 'Lab 26 · Recettes ESN & pièges', link: '/labs/lab-26-recettes-esn-et-pieges/README' }
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
