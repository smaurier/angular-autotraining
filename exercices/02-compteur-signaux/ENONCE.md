# Exercice 02 — Compteur avec signaux

**Module** : 01-Composants-Templates · **Difficulte** : ⭐
**Duree estimee** : 45 min
**Cours** : `cours/01-composants-templates/02-signaux-base.md`

## Objectif

Construire un compteur interactif exploitant les trois primitives reactives d'Angular : `signal`, `computed` et `effect`.

## Consignes

1. Creer un fichier `counter.component.ts` dans `src/app/exercises/ex02/`
2. Definir un composant standalone `CounterComponent`
3. Declarer un **signal** `count` initialise a `0` (type `number`)
4. Creer un **computed** `double` qui retourne `count() * 2`
5. Creer un **computed** `isEven` qui retourne `true` si `count()` est pair
6. Creer un **effect** qui affiche dans la console : `"Compteur : {valeur}"` a chaque changement
7. Dans le template :
   - Afficher la valeur du compteur : `{{ count() }}`
   - Afficher le double : `{{ double() }}`
   - Afficher si pair ou impair : utiliser `@if` / `@else`
   - Bouton **+** qui incremente de 1
   - Bouton **-** qui decremente de 1
   - Bouton **Reset** qui remet a 0
8. Desactiver le bouton **-** quand `count()` vaut `0` (property binding `[disabled]`)

## Contraintes TypeScript

- Zero `any`
- TypeScript strict
- Tous les signaux et computeds doivent etre types explicitement

## Bonus

- Ajouter un signal `step` (pas d'incrementation) modifiable via un `<input type="number">`
- Changer la couleur du compteur : vert si positif, rouge si negatif, gris si zero

## Fichiers

→ `src/app/exercises/ex02/counter.component.ts`
