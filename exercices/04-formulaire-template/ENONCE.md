# Exercice 04 — Formulaire template-driven

**Module** : 01-Composants-Templates · **Difficulte** : ⭐
**Duree estimee** : 45 min
**Cours** : `cours/01-composants-templates/01-composants-standalone.md`, `cours/01-composants-templates/02-signaux-base.md`

## Objectif

Creer un formulaire de contact template-driven avec validation, en utilisant `ngModel` et les directives de validation natives.

## Consignes

1. Creer un fichier `contact-form.component.ts` dans `src/app/exercises/ex04/`
2. Importer `FormsModule` dans le tableau `imports` du composant (necessaire pour `ngModel`)
3. Definir une **interface** `ContactForm` avec les champs :
   - `name` : `string`
   - `email` : `string`
   - `message` : `string`
4. Declarer un **signal** `formData` de type `ContactForm` avec des valeurs initiales vides
5. Declarer un **signal** `submitted` de type `boolean` (pour afficher la confirmation)
6. Dans le template, creer un formulaire `<form>` avec :
   - `#contactForm="ngForm"` pour obtenir la reference du formulaire
   - Champ **Nom** : `<input>` avec `ngModel`, `required`, `minlength="2"`
   - Champ **Email** : `<input type="email">` avec `ngModel`, `required`, `email`
   - Champ **Message** : `<textarea>` avec `ngModel`, `required`, `minlength="10"`
   - Afficher les erreurs de validation sous chaque champ avec `@if`
   - Bouton **Envoyer** desactive si le formulaire est invalide : `[disabled]="contactForm.invalid"`
7. Implementer la methode `onSubmit()` :
   - Verifier que le formulaire est valide
   - Mettre `submitted` a `true`
   - Afficher les donnees dans la console

## Contraintes TypeScript

- Zero `any`
- TypeScript strict
- Interface `ContactForm` definie explicitement

## Bonus

- Ajouter un champ "Sujet" avec un `<select>` et des options predefinies
- Afficher un message de confirmation stylise apres soumission avec les donnees recapitulatives

## Fichiers

→ `src/app/exercises/ex04/contact-form.component.ts`
