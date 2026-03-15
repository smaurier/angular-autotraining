# Exercice 06 — Chronometre

**Module** : 01-Composants-Templates · **Difficulte** : ⭐⭐
**Duree estimee** : 45 min
**Cours** : `cours/01-composants-templates/01-composants-standalone.md`, `cours/01-composants-templates/02-signaux-base.md`

## Objectif

Construire un chronometre fonctionnel avec affichage MM:SS:ms, gestion du cycle de vie et nettoyage propre des ressources via `DestroyRef`.

## Consignes

1. Créer un fichier `stopwatch.component.ts` dans `src/app/exercises/ex06/`
2. Declarer un signal `elapsedMs` de type `number` (millisecondes ecoulees, demarre a 0)
3. Declarer un signal `isRunning` de type `boolean` (le chronometre tourne-t-il ?)
4. Créer un **computed** `formattedTime` qui transforme `elapsedMs` en format `MM:SS:ms` :
   - Minutes : `Math.floor(elapsed / 60000)`
   - Secondes : `Math.floor((elapsed % 60000) / 1000)`
   - Millisecondes : `Math.floor((elapsed % 1000) / 10)` (2 chiffres)
   - Padder chaque valeur avec `String(val).padStart(2, '0')`
5. Implementer les méthodes :
   - `start()` : lance un `setInterval` toutes les 10ms qui incremente `elapsedMs`
   - `stop()` : arrete l'intervalle avec `clearInterval`
   - `reset()` : arrete et remet `elapsedMs` a 0
6. **Nettoyage** : utiliser `DestroyRef` avec `inject()` pour nettoyer l'intervalle quand le composant est detruit
   - `inject(DestroyRef).onDestroy(() => clearInterval(...))`
7. Dans le template :
   - Afficher le temps formate en grand
   - Bouton **Start** (visible quand arrete)
   - Bouton **Stop** (visible quand en cours)
   - Bouton **Reset** (toujours visible)

## Contraintes TypeScript

- Zero `any`
- TypeScript strict
- Typer la variable d'intervalle avec `ReturnType<typeof setInterval> | null`

## Bonus

- Ajouter un système de "tours" (laps) : bouton "Tour" qui enregistre le temps courant
- Afficher la liste des tours avec le temps de chaque tour

## Fichiers

→ `src/app/exercises/ex06/stopwatch.component.ts`
