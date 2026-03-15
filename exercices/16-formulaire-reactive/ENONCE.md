# Exercice 16 — Formulaire réactif

**Module** : 07-Formulaires · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 min
**Cours** : `cours/07-formulaires/01-reactive-forms.md`, `cours/07-formulaires/02-validateurs.md`

## Objectif

Créer un formulaire d'inscription complet avec Reactive Forms, des validateurs natifs et un validateur personnalise de correspondance des mots de passe.

## Consignes

1. Créer les fichiers dans `src/app/exercises/ex16/`
2. Créer le composant `RegistrationFormComponent`
3. Utiliser `FormBuilder` pour créer un `FormGroup` avec les champs suivants :
   - `name` : requis, minimum 2 caracteres
   - `email` : requis, doit etre un email valide (validator `Validators.email`)
   - `password` : requis, minimum 8 caracteres
   - `confirmPassword` : requis
4. Créer un **validateur personnalise** `passwordMatchValidator` dans `validators/password-match.validator.ts` :
   - C'est un validateur de groupe (applique au `FormGroup`, pas à un champ)
   - Compare les valeurs de `password` et `confirmPassword`
   - Retourne `{ passwordMismatch: true }` si les mots de passe ne correspondent pas
   - Retourne `null` si tout est OK
5. Appliquer le validateur personnalise au `FormGroup`
6. Afficher les messages d'erreur sous chaque champ :
   - Afficher l'erreur **uniquement** si le champ a ete touche (`touched`) ou modifie (`dirty`)
   - Messages spécifiques : "Le nom est requis", "Email invalide", etc.
7. Desactiver le bouton "S'inscrire" si le formulaire est invalide
8. Au submit, afficher les donnees dans la console et un message de succes
9. Ajouter un indicateur visuel (bordure rouge/verte) sur chaque champ selon sa validite

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Utiliser le typage strict des formulaires réactifs (Angular 14+)
- Le `FormGroup` doit etre type avec une interface
- Le validateur personnalise doit retourner `ValidationErrors | null`

## Bonus

- Ajouter un champ `age` avec un validateur `min(18)` et `max(120)`
- Ajouter un validateur asynchrone qui simule la vérification de l'email (déjà utilise ou non)
- Ajouter un indicateur de force du mot de passe (faible/moyen/fort)
- Afficher un résumé des donnees avant soumission

## Fichiers

→ `src/app/exercises/ex16/registration-form.component.ts`
→ `src/app/exercises/ex16/validators/password-match.validator.ts`
