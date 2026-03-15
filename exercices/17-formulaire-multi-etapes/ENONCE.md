# Exercice 17 — Formulaire multi-étapes

**Module** : 07-Formulaires · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 75 min
**Cours** : `cours/07-formulaires/01-reactive-forms.md`, `cours/07-formulaires/02-validateurs.md`

## Objectif

Construire un formulaire multi-étapes (wizard) avec une barre de progression, des validations par étape et un `FormArray` pour gérer plusieurs adresses.

## Consignes

1. Créer les fichiers dans `src/app/exercises/ex17/`
2. Créer un composant `WizardFormComponent` avec 3 étapes :

### Étape 1 — Informations personnelles
3. Champs : `firstName` (requis), `lastName` (requis), `email` (requis, email valide), `phone` (optionnel)
4. Utiliser un `FormGroup` imbrique pour ces champs

### Étape 2 — Adresses
5. Utiliser un `FormArray` pour permettre d'ajouter **plusieurs adresses**
6. Chaque adresse contient : `street` (requis), `city` (requis), `zipCode` (requis, pattern 5 chiffres), `country` (requis)
7. Bouton "Ajouter une adresse" pour ajouter une nouvelle entree au `FormArray`
8. Bouton "Supprimer" sur chaque adresse (sauf s'il n'en reste qu'une)
9. Au minimum 1 adresse est requise

### Étape 3 — Récapitulatif et soumission
10. Afficher un résumé de toutes les donnees saisies (lecture seule)
11. Bouton "Soumettre" pour finaliser
12. Bouton "Modifier" pour revenir à une étape précédente

### Navigation et progression
13. Barre de progression visuelle indiquant l'étape courante (1/3, 2/3, 3/3)
14. Bouton "Suivant" qui valide l'étape courante avant de passer à la suivante
15. Bouton "Précédent" pour revenir en arriere
16. Le bouton "Suivant" est désactivé si l'étape courante est invalide
17. Signal `currentStep` pour tracker l'étape courante

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Définir des interfaces pour chaque étape (`PersonalInfo`, `Address`)
- Le `FormArray` doit etre type correctement
- Les méthodes d'ajout/suppression d'adresse doivent etre typees

## Bonus

- Sauvegarder l'état du formulaire dans `localStorage` à chaque changement
- Ajouter une animation de transition entre les étapes
- Ajouter un validateur asynchrone sur l'email (simule la vérification d'unicite)
- Permettre de revenir directement à une étape en cliquant sur la barre de progression

## Fichiers

→ `src/app/exercises/ex17/wizard-form.component.ts`
→ `src/app/exercises/ex17/models/form.model.ts`
→ `src/app/exercises/ex17/steps/step-personal.component.ts`
→ `src/app/exercises/ex17/steps/step-addresses.component.ts`
→ `src/app/exercises/ex17/steps/step-review.component.ts`
