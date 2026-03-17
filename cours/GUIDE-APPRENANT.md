# Guide de l'apprenant -- Angular

> **Ce guide est ta boussole.** Il t'aide a savoir ou tu en es, par ou passer,
> et quoi faire quand tu bloques. Lis-le avant de commencer, et reviens-y regulierement.
>
> **Temps estime** : ~120-160h (3-5 mois a 8-10h/semaine)
>
> **Philosophie** : Angular est un framework complet et opinione. Contrairement a React
> ou Vue, il fournit tout out-of-the-box : routing, formulaires, HTTP, DI, tests.
> C'est beaucoup a apprendre, mais une fois maitrise, tu vas tres vite sur les gros projets.
> Ce cours suppose que tu as termine le cours Vue -- on fait le pont.

---

## Avant de commencer -- Auto-diagnostic

Reponds honnetement. Ce n'est pas un examen -- c'est un GPS.

### Prerequis -- le socle

Coche ce que tu sais faire SANS chercher sur Google :
- [ ] Tu as termine le cours Vue (03) -- ou tu maitrises un framework frontend
- [ ] Tu connais le pattern composant (props, events, lifecycle)
- [ ] Tu es a l'aise avec TypeScript (interfaces, generics, decorateurs)
- [ ] Tu sais ce qu'est l'injection de dependances (meme vaguement)
- [ ] Tu connais les Observables ou les Streams (meme basiquement)
- [ ] Tu sais utiliser les DevTools pour debugger une application frontend

**6/6** -> Tu es pret. Attaque directement le module 00.
**4-5/6** -> Revise les points manquants, puis lance-toi. Le module 00 fait la transition depuis Vue.
**< 4/6** -> Termine d'abord le cours Vue (03) et TypeScript (01). Angular sans ces bases, c'est un mur.

### Angular -- ou en es-tu deja ?

- [ ] Tu as deja cree un composant Angular avec `@Component`
- [ ] Tu connais les Signals Angular (ou au moins le concept de reactivite granulaire)
- [ ] Tu as deja utilise un Service avec injection de dependances
- [ ] Tu sais ce qu'est RxJS et tu as deja utilise un Observable
- [ ] Tu as deja utilise les Reactive Forms d'Angular

**5/5** -> Tu peux probablement sauter a la Phase 3 (module 04). Fais le checkpoint Phase 2 d'abord.
**2-4/5** -> Commence par la Phase 1, le module 00 fait le pont depuis Vue.
**0-1/5** -> Parfait, ce cours est concu pour toi. Le module 00 part de Vue pour aller vers Angular.

### Le test decisif

On te demande de creer un service qui recupère des utilisateurs via une API et les affiche dans un composant.
Comment structures-tu le code en Angular ?

- Si tu penses : un `UserService` injectable avec `HttpClient`, un composant qui injecte le service, et un Observable pipe dans le template -> tu connais le pattern Angular. Verifie la Phase 3.
- Si tu penses a tout mettre dans le composant -> le module 03 (Services et DI) va changer ta vision.
- Si tu ne sais pas par ou commencer -> pas de panique, le module 00 part de Vue.

---

## Les 5 phases de ta progression

### Phase 1 -- De Vue a Angular (modules 00-01) ~15-20h

> **Objectif** : Faire la transition depuis Vue. Comprendre les composants Angular,
> les templates, le binding, et les differences fondamentales.
>
> **Analogie** : Tu parles francais et tu apprends l'espagnol. Beaucoup de similitudes, mais la grammaire change.

| Module | Sujet | Temps | Note |
|---|---|---|---|
| 00 | De Vue a Angular | 3h | **Cours cle** -- le pont entre les deux frameworks |
| 01 | Composants et templates | 4h | `@Component`, bindings, directives, pipes |

**Exercices Phase 1** : Recree un petit composant que tu avais fait en Vue, en Angular.
Le meilleur moyen de comprendre les differences, c'est de les vivre.

**Checkpoint Phase 1** :
- [ ] Tu sais creer un composant Angular avec `@Component` et un template
- [ ] Tu sais utiliser le property binding `[prop]`, l'event binding `(event)`, et le two-way `[(ngModel)]`
- [ ] Tu sais utiliser `@if`, `@for`, `@switch` (control flow moderne)
- [ ] Tu sais mapper les concepts Vue (ref, computed, emit) a leurs equivalents Angular
- [ ] Tu sais utiliser le CLI Angular (`ng generate`, `ng serve`)

> **Test** : En Vue tu ecris `<div v-if="show">`. En Angular ?
> Si tu reponds `@if (show) { <div>...</div> }` (syntaxe moderne), c'est bon.

---

### Phase 2 -- Signals et DI (modules 02-03) ~20-25h

> **Objectif** : Maitriser les Signals (reactivite granulaire d'Angular)
> et l'injection de dependances, le pattern central d'Angular.
>
> **Analogie** : Tu apprends le systeme nerveux d'Angular. Les Signals sont les nerfs, la DI est le squelette.

| Module | Sujet | Temps | Note |
|---|---|---|---|
| 02 | Signals avances | 4h | **Cours cle** -- `signal`, `computed`, `effect`, `linkedSignal` |
| 03 | Services et injection de dependances | 4h | **Cours cle** -- `@Injectable`, `providedIn`, hierarchie d'injecteurs |

**Conseil** : L'injection de dependances (module 03) est LE pattern central d'Angular.
Si tu viens de Vue ou React, c'est un changement de paradigme.
Prends ton temps, fais tous les exercices.

**Checkpoint Phase 2** :
- [ ] Tu sais creer et utiliser un Signal (`signal()`, `computed()`, `effect()`)
- [ ] Tu sais creer un Service et l'injecter dans un composant
- [ ] Tu comprends la hierarchie des injecteurs (root, module, composant)
- [ ] Tu sais quand utiliser `providedIn: 'root'` vs un provider local
- [ ] Tu sais pourquoi Angular utilise la DI (testabilite, decouplage, reutilisation)

> **Test** : Pourquoi Angular utilise l'injection de dependances au lieu d'imports directs ?
> Si tu reponds "pour le decouplage, la testabilite (on peut injecter un mock), et la configuration flexible", c'est bon.

---

### Phase 3 -- RxJS et HTTP (modules 04-06) ~25-30h

> **Objectif** : Maitriser le routing, RxJS (la partie qui fait peur),
> et les appels HTTP avec `HttpClient`.
>
> **Analogie** : Tu roules sur l'autoroute Angular. RxJS est le turbo -- puissant mais demande du doigte.

| Module | Sujet | Temps | Note |
|---|---|---|---|
| 04 | Routing | 3h | Routes, guards, resolvers, lazy loading |
| 05 | RxJS essentiel | 5h | **Cours cle** -- Observables, operateurs, patterns |
| 06 | HTTP et API | 3h | `HttpClient`, interceptors, gestion d'erreurs |

**Attention** : RxJS (module 05) est le mur numero 1 de ce cours. C'est normal de ne pas
tout comprendre du premier coup. Concentre-toi sur `map`, `switchMap`, `catchError`,
`combineLatest` et `Subject`. Le reste viendra avec la pratique.

**Checkpoint Phase 3** :
- [ ] Tu sais configurer des routes avec lazy loading et des guards
- [ ] Tu sais utiliser les operateurs RxJS essentiels (`map`, `switchMap`, `mergeMap`, `catchError`)
- [ ] Tu sais la difference entre `switchMap`, `mergeMap`, `concatMap` et `exhaustMap`
- [ ] Tu sais faire un appel HTTP avec `HttpClient` et gerer les erreurs
- [ ] Tu sais creer un interceptor HTTP (pour les tokens, le logging, etc.)

> **Test** : Un champ de recherche doit appeler une API a chaque frappe. Comment evites-tu les requetes inutiles ?
> Si tu reponds "`debounceTime` + `distinctUntilChanged` + `switchMap`", c'est bon.

---

### Phase 4 -- Formulaires et UI (modules 07-08) ~15-20h

> **Objectif** : Maitriser les formulaires reactifs (Reactive Forms)
> et Angular Material pour une UI professionnelle.
>
> **Analogie** : Tu construis l'interieur de la voiture -- le tableau de bord et les commandes.

| Module | Sujet | Temps | Note |
|---|---|---|---|
| 07 | Formulaires | 4h | **Cours cle** -- Reactive Forms, validation, formulaires dynamiques |
| 08 | Angular Material | 3h | Composants UI, theming, CDK |

**Conseil** : Les Reactive Forms d'Angular sont plus puissants (mais plus verbeux)
que les formulaires Vue ou React. Le module 07 vaut vraiment le coup d'etre bien maitrise.

**Checkpoint Phase 4** :
- [ ] Tu sais creer un formulaire reactif avec `FormBuilder`, `FormGroup`, `FormControl`
- [ ] Tu sais creer des validateurs custom (synchrones et asynchrones)
- [ ] Tu sais gerer les formulaires dynamiques (ajouter/supprimer des champs)
- [ ] Tu sais utiliser Angular Material et personnaliser le theme
- [ ] Tu sais utiliser le CDK pour des composants custom (overlay, drag & drop)

> **Test** : Un formulaire a un champ "email" qui doit etre unique (verification API).
> Si tu crees un `AsyncValidator` qui appelle l'API et retourne une erreur si l'email existe, c'est bon.

---

### Phase 5 -- Expert (modules 09-12) ~30-40h

> **Objectif** : Tests, state management, accessibilite, securite, CI/CD,
> et les patterns de production en Angular.
>
> **Analogie** : Tu prepares la voiture pour la course. Chaque reglage compte.

| Module | Sujet | Temps | Note |
|---|---|---|---|
| 09 | Accessibilite et Tests | 4h | Testing avec TestBed, a11y |
| 10 | State management | 4h | NgRx, SignalStore, patterns reactifs a grande echelle |
| 11 | CI/CD, auth et securite | 3h | Guards, interceptors, deploy |
| 12 | Recettes ESN | 4h | Patterns concrets pour les projets en entreprise |

**Checkpoint Phase 5** :
- [ ] Tu sais ecrire des tests avec `TestBed` et tester des composants, services, et pipes
- [ ] Tu sais choisir entre Signals locaux, SignalStore, et NgRx selon la complexite
- [ ] Tu sais configurer l'authentification avec des guards et des interceptors
- [ ] Tu sais deployer une app Angular avec une pipeline CI/CD
- [ ] Tu connais les patterns de production (lazy loading, preloading, bundle optimization)

> **Test** : Un projet Angular a 200 composants et 50 services. Comment organises-tu le state ?
> Si tu proposes une architecture en couches (feature modules, shared services, store pour le state global)
> et que tu sais justifier chaque choix, c'est bon.

---

## Quand tu bloques

Angular a ses propres difficultes. Voici comment debloquer :

### "Il y a trop de concepts -- DI, decorateurs, modules, Signals, RxJS..."
1. Angular est un framework complet. C'est normal d'etre submerge au debut
2. Concentre-toi sur une seule phase a la fois. Ne regarde pas la suite
3. Retiens : composant + service + DI = 80% d'Angular. Le reste s'ajoute progressivement
4. Le CLI genere le boilerplate -- laisse-le faire (`ng generate component/service/pipe`)

### "RxJS me perd completement"
1. Commence par penser "tableau dans le temps". Un Observable, c'est comme un tableau qui emet des valeurs au fil du temps
2. Maitriser 5 operateurs suffit pour 80% des cas : `map`, `switchMap`, `catchError`, `combineLatest`, `tap`
3. Utilise le site [RxJS Marbles](https://rxmarbles.com/) pour visualiser les operateurs
4. Si tu hesites entre `switchMap` et `mergeMap` : `switchMap` annule la precedente requete, `mergeMap` les garde toutes

### "L'injection de dependances, je ne vois pas l'interet"
1. Sans DI : `const service = new UserService(new HttpClient(...))` -- tu geres tout manuellement
2. Avec DI : `constructor(private userService: UserService)` -- Angular gere tout
3. Pour les tests : tu injectes un mock au lieu du vrai service, sans changer le code
4. Relis le module 03 en te concentrant sur les exemples de test

### "Les Reactive Forms sont trop verbeux"
1. C'est vrai par rapport a Vue/React. Mais ils sont plus puissants pour les formulaires complexes
2. Utilise `FormBuilder` pour simplifier la syntaxe
3. Cree des validateurs reutilisables -- ca reduit la repetition
4. Pour les formulaires simples, le template-driven approach suffit

### "Mon composant ne se met pas a jour"
1. Verifie que tu utilises des Signals ou que l'Observable est subscribe (async pipe dans le template)
2. Si tu mutes un objet/tableau, Angular ne detecte pas le changement -- cree une nouvelle reference
3. Avec Signals : `.update()` ou `.set()`, pas de mutation directe

### "Je n'arrive pas a faire l'exercice"
1. Utilise `ng generate` pour creer la structure, puis remplis le code
2. Verifie que ton module/composant est bien declare et importe
3. Les erreurs Angular sont souvent verboses -- lis le message en entier, la solution est souvent dedans

---

## Auto-evaluation par phase

Apres chaque phase, pose-toi ces questions. Si tu ne sais pas repondre,
reviens en arriere -- c'est un signe, pas un echec.

**Apres Phase 1** : "Quelles sont les 3 grandes differences entre Vue et Angular ?"
-> Si tu cites la DI, le typage fort par defaut, et les templates avec une syntaxe differente, c'est bon.

**Apres Phase 2** : "Pourquoi les Signals remplacent progressivement les Observables pour le state local ?"
-> Si tu parles de simplicite, de performance (granularite fine), et d'absence de subscription manuelle, c'est bon.

**Apres Phase 3** : "Quand utiliser `switchMap` vs `concatMap` ?"
-> Si tu reponds "`switchMap` pour les recherches (annule la precedente), `concatMap` pour les sauvegardes (ordre garanti)", c'est bon.

**Apres Phase 4** : "Reactive Forms vs Template-driven : quand choisir quoi ?"
-> Si tu reponds "Reactive pour les formulaires complexes/dynamiques, Template-driven pour les formulaires simples", c'est bon.

---

## Rythme recommande

| Rythme | Par semaine | Duree totale |
|---|---|---|
| **Decouverte** (a cote du boulot) | 4-6h | 5-6 mois |
| **Regulier** (motivation) | 8-10h | 3-4 mois |
| **Intensif** (objectif pro) | 12-15h | 2-3 mois |

### Conseils concrets

- **1 module = 1 a 2 sessions.** RxJS (05) et les formulaires (07) meritent 2-3 sessions.
- **Utilise le CLI Angular.** Ne cree jamais les fichiers a la main -- `ng generate` fait le boilerplate.
- **RxJS (05) merite une semaine et demie.** C'est le point de bascule du cours.
- **La DI (03) merite une semaine.** C'est le pattern central, et il change ta facon de concevoir.
- **Installe Augury ou Angular DevTools.** C'est indispensable pour debugger.

### Quand faire une pause

- Si RxJS te rend fou -> c'est normal, tout le monde passe par la. Fais une pause et reviens avec RxJS Marbles
- Si tu compares tout a Vue/React -> c'est naturel au debut, mais laisse Angular te montrer ses forces
- Si les erreurs Angular te decouragent -> lis-les en entier, elles sont souvent tres explicatives

---

## Ressources complementaires

### Quand tu veux approfondir
- [Angular Docs](https://angular.dev/) -- la nouvelle documentation officielle
- [RxJS Marbles](https://rxmarbles.com/) -- visualisation interactive des operateurs
- [Angular Blog](https://blog.angular.dev/) -- les nouveautes et bonnes pratiques
- *RxJS in Action* (Paul Daniels, Luis Atencio) -- pour approfondir RxJS

### Quand tu cherches une reponse rapide
- Angular DevTools (extension Chrome) -- inspecter les composants et le change detection
- `ng generate --help` -- voir toutes les options du CLI
- Le message d'erreur Angular lui-meme -- souvent il contient le lien vers la solution

---

## Et apres ?

Tu as fini les 13 modules ? Tu es un dev Angular solide, pret pour les gros projets.

Voici les prochaines etapes :
1. **Construis un projet complet** -- un CRUD avec auth, formulaires, et API REST
2. **Explore NestJS (cours 05)** -- Angular et NestJS partagent la meme philosophie (DI, decorateurs, modules)
3. **Combine avec le testing (cours 04)** -- teste ton app Angular comme un pro
4. **Contribue a l'ecosysteme Angular** -- libraries, schematics, ou le framework lui-meme
