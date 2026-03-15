# Exercice 18 — Signal Forms

**Module** : 07-Formulaires · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 min
**Cours** : `cours/07-formulaires/03-signal-forms.md`

## Objectif

Migrer un formulaire d'inscription classique (Reactive Forms) vers une approche 100 % Signals avec `model()` pour le two-way binding, et comparer les deux approches.

## Consignes

1. Créer un composant `SignalFormComponent` dans `src/app/exercises/ex18/`
2. Commencer par un formulaire réactif classique (`FormGroup`, `FormControl`) avec les champs : `name`, `email`, `password`, `confirmPassword`
3. Reecrire ce formulaire en utilisant des **signaux** et `model()` pour le two-way binding sur chaque champ
4. Implementer la validation via des **computed signals** :
   - `passwordStrength` : retourne `'weak'` | `'medium'` | `'strong'` selon des regles regex
   - `passwordsMatch` : vérifié que `password` === `confirmPassword`
   - `emailValid` : vérifié le format email avec une regex
   - `isFormValid` : computed global qui combine toutes les validations
5. Ajouter un **indicateur visuel de force du mot de passe** (barre coloree) :
   - `weak` : rouge, 33 % de largeur
   - `medium` : orange, 66 % de largeur
   - `strong` : vert, 100 % de largeur
   - Regles : weak = < 8 caracteres, medium = 8+ avec majuscule + chiffre, strong = 12+ avec majuscule + chiffre + caractere special
6. Afficher/masquer les messages d'erreur de manière réactive (apparition immediate quand le champ perd le focus ou quand la valeur change)
7. Ajouter un signal `touched` par champ (passe a `true` au `blur`) pour n'afficher les erreurs qu'après interaction
8. Comparer le nombre de lignes de code entre l'approche réactive et l'approche signal — ajouter un commentaire en haut du fichier avec le résultat

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Typer `passwordStrength` avec un type union literal (`'weak' | 'medium' | 'strong'`)
- Utiliser `readonly` sur tous les signaux

## Bonus

- Ajouter un signal `userType` (`'personal'` | `'professional'`) qui change dynamiquement les regles de validation (ex: email professionnel obligatoire pour `'professional'`)
- Ajouter un effet (`effect()`) qui log dans la console chaque changement de force du mot de passe

## Fichiers

-> `src/app/exercises/ex18/signal-form.component.ts`
