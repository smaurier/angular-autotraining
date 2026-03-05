# Exercice 17 — Formulaire multi-etapes

**Module** : 07-Formulaires · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 75 min
**Cours** : `cours/07-formulaires/01-reactive-forms.md`, `cours/07-formulaires/02-validateurs.md`

## Objectif

Construire un formulaire multi-etapes (wizard) avec une barre de progression, des validations par etape et un `FormArray` pour gerer plusieurs adresses.

## Consignes

1. Creer les fichiers dans `src/app/exercises/ex17/`
2. Creer un composant `WizardFormComponent` avec 3 etapes :

### Etape 1 — Informations personnelles
3. Champs : `firstName` (requis), `lastName` (requis), `email` (requis, email valide), `phone` (optionnel)
4. Utiliser un `FormGroup` imbrique pour ces champs

### Etape 2 — Adresses
5. Utiliser un `FormArray` pour permettre d'ajouter **plusieurs adresses**
6. Chaque adresse contient : `street` (requis), `city` (requis), `zipCode` (requis, pattern 5 chiffres), `country` (requis)
7. Bouton "Ajouter une adresse" pour ajouter une nouvelle entree au `FormArray`
8. Bouton "Supprimer" sur chaque adresse (sauf s'il n'en reste qu'une)
9. Au minimum 1 adresse est requise

### Etape 3 — Recapitulatif et soumission
10. Afficher un resume de toutes les donnees saisies (lecture seule)
11. Bouton "Soumettre" pour finaliser
12. Bouton "Modifier" pour revenir a une etape precedente

### Navigation et progression
13. Barre de progression visuelle indiquant l'etape courante (1/3, 2/3, 3/3)
14. Bouton "Suivant" qui valide l'etape courante avant de passer a la suivante
15. Bouton "Precedent" pour revenir en arriere
16. Le bouton "Suivant" est desactive si l'etape courante est invalide
17. Signal `currentStep` pour tracker l'etape courante

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Definir des interfaces pour chaque etape (`PersonalInfo`, `Address`)
- Le `FormArray` doit etre type correctement
- Les methodes d'ajout/suppression d'adresse doivent etre typees

## Bonus

- Sauvegarder l'etat du formulaire dans `localStorage` a chaque changement
- Ajouter une animation de transition entre les etapes
- Ajouter un validateur asynchrone sur l'email (simule la verification d'unicite)
- Permettre de revenir directement a une etape en cliquant sur la barre de progression

## Fichiers

→ `src/app/exercises/ex17/wizard-form.component.ts`
→ `src/app/exercises/ex17/models/form.model.ts`
→ `src/app/exercises/ex17/steps/step-personal.component.ts`
→ `src/app/exercises/ex17/steps/step-addresses.component.ts`
→ `src/app/exercises/ex17/steps/step-review.component.ts`
