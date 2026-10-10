# Lab 02 — Intervention : charger les membres d'une famille sans casser personne

> **Outcome :** `MembresFamilleComponent`, déjà consommé par la page famille, gagne un état
> loading/erreur et ne se fait plus piéger quand l'utilisateur change deux fois de famille
> très vite (réponse obsolète qui écrase la bonne) — sans casser l'affichage existant.
> **Vrai geste :** intervention sur un composant déjà en prod (pas une feature de zéro),
> `switchMap` pour annuler une requête obsolète, non-régression vérifiée séparément.
> **Feedback :** `npm run lab:02` — RED tant que `src/membres-famille.component.ts` ne
> satisfait pas l'oracle (6 tests : 2 régression + 4 nouvelle capacité). `npm run solution:02`
> prouve l'oracle.

## Portée de ce lab — ce qui manque, et pourquoi (honnêteté d'abord)

Comme le lab-01, **le composant est testé comme une classe logique pure, jamais via un
template rendu.** Toujours bloqué sur cet environnement : `@analogjs/vite-plugin-angular` +
`@angular/build` 19.2 segfaultent avant le premier test (même constat que le lab-01, re-vérifié
le 10/10/2026). Piste creusée cette fois : `@angular/build` embarque depuis sa v20 un builder
natif `unit-test` avec un runner Vitest intégré (sans ce plugin tiers) — mais l'installer en
isolation sur ce poste bute sur deux chaînes de peer-dependencies (TypeScript ≥6.0, puis
vitest ^4/^5), qui impliqueraient de faire monter TOUT le cours en même temps. Chantier de
version séparé, pas un correctif de lab.

**Ce que ça change pour toi, concrètement** : `MembresFamilleComponent` est un vrai
`@Component` standalone avec un vrai template (`@if`/`@for`), mais injection **par
constructeur** (jamais `inject()` — `inject()` exige un contexte d'injection actif, que
`new MembresFamilleComponent(service)` n'a pas). Le template n'est jamais exécuté dans les
tests ; seule la logique (signaux `membres()`, `loading()`, `erreur()`) est vérifiée. C'est la
même frontière que le lab-01 (service), étendue au composant — cohérent avec la doctrine du
cours « logique métier hors template », pas une entorse à la règle oracle.

## Prérequis technique

```bash
cd 03-angular/labs
npm install
```

Prérequis pédagogique : lab-01 (même pattern DI par constructeur + `switchMap`/`catchError`
interne, ici appliqué à un composant au lieu d'un service).

## Lire avant (une lecture bornée)

- Module [`16-rxjs-observables-et-operators.md`](../../modules/16-rxjs-observables-et-operators.md) —
  `switchMap` vs `mergeMap` (§2.8), déjà vu au lab-01, ici sur un flux de sélection de famille
  au lieu d'un flux de frappe.
- Module [`02-signaux-base.md`](../../modules/02-signaux-base.md) — `signal()`, `.set()`,
  lecture par appel `()`.
- Module [`11-services-et-injectable.md`](../../modules/11-services-et-injectable.md) —
  injection par constructeur (le composant ici suit exactement le même principe que le
  service du lab-01, appliqué à `@Component`).

## Énoncé

Lis les commentaires en tête de `src/membres-famille.component.ts` : la version EN PRODUCTION
lance une nouvelle requête à chaque changement de famille, **sans jamais annuler la
précédente** — si l'utilisateur change deux fois de famille très vite, celle qui répond EN
DERNIER gagne, pas forcément celle affichée à l'écran. Aucun état de chargement, aucune
gestion d'erreur.

Implémente, dans `chargerPour(familleId$)` :

1. `loading.set(true)` et `erreur.set(null)` dès qu'une nouvelle valeur de `familleId$` arrive
   — AVANT que la requête ait répondu (`tap` en tête de pipe).
2. `switchMap` sur `familleId$` → `chargerMembres(familleId)` : une famille nouvellement
   sélectionnée annule la requête en vol pour l'ancienne.
3. `catchError` **à l'intérieur** du `switchMap` (même piège que le lab-01) : une famille en
   échec pose `erreur()` et dégrade en `of(null)`, sans jamais terminer l'abonnement global —
   changer de famille après une erreur doit refonctionner.
4. `loading.set(false)` quand la réponse (succès ou échec) arrive ; `membres.set(...)`
   seulement si la réponse n'est pas `null`.

**Le piège à éviter.** Mettre `loading.set(true)` APRÈS avoir lancé la requête (ou dans le
`switchMap` plutôt qu'avant) rate la toute première frappe/sélection si l'observable interne
répond de façon synchrone dans un test — toujours remettre à zéro l'état AVANT de lancer la
nouvelle requête, jamais après.

## Étapes (en friction)

1. `npm run lab:02` : RED (2 tests de régression passent déjà, 4 échouent).
2. `tap` de remise à zéro loading/erreur.
3. `switchMap` + `catchError` interne, dans cet ordre exact.

## Vérifier

```bash
cd 03-angular/labs
npm run lab:02
npm run solution:02
```

**Ce que l'oracle vérifie (6 tests)**

Régression (`test/regression.spec.ts`, doit passer avant ET après) : `membres()` se remplit
une fois la requête résolue ; `membres()` est vide avant toute réponse. Nouvelle capacité
(`test/chargement.spec.ts`) : `loading()` passe à `true` dès la demande (pas après la
réponse) ; `loading()` repasse à `false` et `membres()` se remplit à la réponse ; une erreur
réseau pose `erreur()` sans casser l'abonnement (changer de famille ensuite refonctionne) ;
**une réponse obsolète qui arrive après celle de la famille courante est ignorée**
(`switchMap`, prouvé avec deux requêtes contrôlables manuellement, la plus ancienne répondant
en dernier).

## Variante J+30 (fading)

Enchaîne trois changements de famille au lieu de deux, avec les trois requêtes qui répondent
dans un ordre différent de leur déclenchement — vérifie que seule la DERNIÈRE famille
sélectionnée compte, quel que soit l'ordre d'arrivée des réponses.

## Application TribuZen

Même geste sur le vrai composant de liste de membres de l'admin TribuZen (Angular) — le rendu
visuel (template, accessibilité du spinner `aria-live`) reste à vérifier à l'œil une fois le
composant branché en situation réelle, le rendu automatisé restant hors oracle sur ce poste.
Commit : `fix(membres): annule les requêtes obsolètes + état loading/erreur`.
