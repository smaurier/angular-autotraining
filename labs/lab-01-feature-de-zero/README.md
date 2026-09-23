# Lab 01 — De zéro : un service Angular de bout en bout (DI + RxJS)

> **Outcome :** à la fin, TribuZen sait rechercher des sorties EN TEMPS RÉEL pendant la
> frappe (debounce + annulation de la recherche obsolète) et proposer une nouvelle sortie —
> dans un service injectable, testé sans réseau réel.
> **Vrai geste :** injection par constructeur (`@Injectable()`), un flux RxJS complet
> (`debounceTime` → `filter` → `switchMap` avec `catchError` interne), validation avant appel
> réseau.
> **Feedback :** `npm run lab:01` — RED tant que `src/sorties.service.ts` ne satisfait pas
> l'oracle (10 tests). `npm run solution:01` prouve l'oracle.

## Portée de ce lab — ce qui manque, et pourquoi (honnêteté d'abord)

La cible du cours dit « composant + service DI + RxJS ». **Ce lab couvre le service DI + RxJS
uniquement — pas le composant.** Essayé en construisant ce lab :
[`@analogjs/vite-plugin-angular`](https://www.npmjs.com/package/@analogjs/vite-plugin-angular)
(le pont standard entre Angular et Vitest, avec `@angular/build` comme peer dependency réel,
pas juste déclaré) pour monter un composant standalone et vérifier son template avec
`@testing-library/angular` — **crash natif reproductible (segfault) sur cet environnement**,
avant même d'atteindre le premier test. Tester le rendu de template Angular (via `TestBed` +
le compilateur, ou ce pont Vitest) est un chantier d'infra séparé, pas quelque chose à bâcler
pour cocher une case. Le service, lui, est du TypeScript pur (`@Injectable()` est juste un
décorateur ici, jamais résolu par l'injecteur Angular réel) — zéro dépendance au compilateur
de templates, zéro risque équivalent.

## Prérequis technique

```bash
cd 03-angular/labs
npm install
```

## Lire avant (une lecture bornée)

- Module [`16-rxjs-observables-et-operators.md`](../../modules/16-rxjs-observables-et-operators.md) —
  **l'ancrage TribuZen exact de ce lab** : « barre de recherche debounced des familles/
  sorties », `debounceTime`, `filter`, `switchMap` vs `mergeMap` (§2.8).
- Module [`11-services-et-injectable.md`](../../modules/11-services-et-injectable.md) —
  injection par constructeur, `@Injectable()`.
- Module [`18-http-crud-interceptors-cache.md`](../../modules/18-http-crud-interceptors-cache.md) —
  `HttpClient` retourne des Observables ; ici un contrat minimal injecté (`ApiHttpClient`)
  joue ce rôle pour rester testable sans réseau.

## Énoncé

Lis les commentaires en tête de `src/sorties.service.ts`. Implémente, dans l'ordre :

1. `validerNouvelleSortie` — mêmes règles que partout dans TribuZen (titre requis, date
   requise et pas dans le passé, comparaison à la journée).
2. `SortiesService.creerSortie` — valide d'abord, jamais d'appel réseau sur une entrée
   invalide.
3. `SortiesService.rechercherSorties` — le cœur du lab : `debounceTime(300)` →
   `filter` (≥ 2 caractères) → `switchMap` (annule la recherche précédente), avec
   `catchError` posé À L'INTÉRIEUR du `switchMap` pour qu'une recherche en échec dégrade en
   liste vide sans jamais casser l'abonnement pour la frappe suivante.

**Le piège à éviter.** `catchError` autour de TOUT le flux (après le `switchMap`, pas dedans)
termine l'abonnement entier à la première erreur — plus aucune recherche ne marche après. Il
doit être sur l'Observable interne, une recherche par une autre.

## Étapes (en friction)

1. `npm run lab:01` : RED.
2. `validerNouvelleSortie`, `creerSortie` : mêmes règles/piège que le lab Vue.
3. `rechercherSorties` : les trois opérateurs dans le bon ordre, `catchError` interne.

## Vérifier

```bash
cd 03-angular/labs
npm run lab:01
npm run solution:01
```

**Ce que l'oracle vérifie (10 tests)**

`validerNouvelleSortie` : 4 cas. `creerSortie` : entrée invalide → erreur, pas d'appel réseau ;
entrée valide → `http.post` appelé, résultat transmis. `rechercherSorties` : débounce (une
seule recherche après plusieurs frappes rapprochées), filtre sous 2 caractères, **switchMap
annule réellement la recherche précédente** (prouvé avec deux réponses contrôlables
manuellement, la première arrivant EN RETARD après le switch — elle n'atteint jamais
l'abonné), une recherche en échec dégrade en liste vide et la frappe suivante fonctionne
toujours.

## Variante J+30 (fading)

Ajoute une troisième frappe entre les deux existantes du test switchMap, et vérifie que
SEULE la toute dernière recherche compte — peu importe combien de frappes intermédiaires ont
été annulées.

## Application TribuZen

Même geste sur le vrai `SortiesService` de l'admin TribuZen (Angular), consommé par la barre
de recherche — le composant qui l'utilise reste à construire dans un chantier séparé une fois
l'infra Vitest+Angular résolue. Commit :
`feat(sorties): recherche debouncée + création de sortie (service DI + RxJS)`.
