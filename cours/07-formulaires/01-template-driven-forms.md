# Cours 28 — Formulaires template-driven

> **Objectif** : Comprendre les formulaires template-driven en Angular 19+ avec `FormsModule` et `ngModel`. Maitriser le two-way binding, la validation dans le template, et l'acces a l'etat du formulaire. Savoir quand choisir cette approche et la comparer avec Vue 3 `v-model`.

---

## Rappel du cours precedent

<details>
<summary>1. Comment implementer un retry avec backoff exponentiel en Angular ?</summary>

Avec l'operateur `retry({ count: 3, delay: (err, n) => timer(Math.pow(2, n) * 1000) })`. On reessaie uniquement sur les erreurs serveur (5xx), pas les erreurs client (4xx).
</details>

<details>
<summary>2. A quoi sert shareReplay et quelle option est obligatoire ?</summary>

`shareReplay` partage une seule souscription entre plusieurs abonnes et rejoue les derniers resultats. L'option `refCount: true` est obligatoire pour eviter les fuites memoire en se desabonnant de la source quand plus personne n'ecoute.
</details>

<details>
<summary>3. Quels etats sont disponibles avec resource() d'Angular 19+ ?</summary>

`resource()` fournit : `isLoading()` (chargement en cours), `value()` (donnees recues), `error()` (erreur eventuelle), et la methode `reload()` pour relancer le chargement.
</details>

---

## Analogie

Imaginez un **formulaire papier** dans une administration :

- **Template-driven** : le formulaire est pre-imprime avec des cases a cocher et des champs a remplir. Les regles de validation sont ecrites sur le papier ("champ obligatoire", "8 caracteres minimum"). C'est simple, visuel, direct.
- **Reactive forms** : vous recevez une feuille blanche et un cahier des charges separe qui definit programmatiquement chaque champ, chaque regle, chaque dependance.

Les formulaires template-driven sont le formulaire pre-imprime : tout est dans le template HTML, ideal pour les formulaires simples.

---

## Theorie

### Configuration : FormsModule

```typescript
// mon-formulaire.component.ts
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mon-formulaire',
  imports: [FormsModule],  // ✅ Obligatoire pour ngModel
  template: `<!-- ... -->`,
})
export class MonFormulaireComponent {}
```

### Two-way binding avec [(ngModel)]

```typescript
@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <form>
      <label for="email">Email :</label>
      <input id="email" [(ngModel)]="email" name="email">

      <label for="mdp">Mot de passe :</label>
      <input id="mdp" type="password" [(ngModel)]="motDePasse" name="mdp">

      <p>Vous allez vous connecter avec : {{ email }}</p>
    </form>
  `,
})
export class LoginComponent {
  email = '';
  motDePasse = '';
}
```

> **Attention** : chaque `ngModel` dans un `<form>` necessite un attribut `name` unique. Sans `name`, Angular ne peut pas enregistrer le champ dans le formulaire.

```typescript
// ❌ Mauvais : ngModel sans name dans un form
<input [(ngModel)]="email">  // Erreur Angular !

// ✅ Bon : toujours ajouter name
<input [(ngModel)]="email" name="email">
```

### Decomposition de [(ngModel)] : banana in a box

`[(ngModel)]` est un raccourci pour le binding bidirectionnel :

```html
<!-- Les deux sont equivalents -->
<input [(ngModel)]="nom" name="nom">

<input [ngModel]="nom" (ngModelChange)="nom = $event" name="nom">
```

**Parallele Vue 3** :

```vue
<!-- Vue 3 -->
<input v-model="nom">

<!-- Equivalent decomposes -->
<input :value="nom" @input="nom = $event.target.value">
```

| Concept | Vue 3 | Angular Template-driven |
|---------|-------|------------------------|
| Two-way binding | `v-model` | `[(ngModel)]` |
| Directive | Implicite | Necessite `FormsModule` |
| Attribut requis | Non | `name` obligatoire dans `<form>` |
| Syntaxe decomposee | `:value` + `@input` | `[ngModel]` + `(ngModelChange)` |

### Validation dans le template

Angular fournit des directives de validation qu'on place directement sur les inputs :

```typescript
@Component({
  selector: 'app-inscription',
  imports: [FormsModule],
  template: `
    <form #monForm="ngForm" (ngSubmit)="soumettre(monForm)">

      <div>
        <label>Nom :</label>
        <input
          [(ngModel)]="utilisateur.nom"
          name="nom"
          required
          minlength="2"
          maxlength="50"
          #nomInput="ngModel"
        >
        @if (nomInput.invalid && nomInput.touched) {
          <div class="erreur">
            @if (nomInput.errors?.['required']) {
              <p>Le nom est obligatoire.</p>
            }
            @if (nomInput.errors?.['minlength']) {
              <p>Minimum 2 caracteres.</p>
            }
          </div>
        }
      </div>

      <div>
        <label>Email :</label>
        <input
          [(ngModel)]="utilisateur.email"
          name="email"
          required
          email
          #emailInput="ngModel"
        >
        @if (emailInput.invalid && emailInput.touched) {
          <div class="erreur">
            @if (emailInput.errors?.['required']) {
              <p>L'email est obligatoire.</p>
            }
            @if (emailInput.errors?.['email']) {
              <p>Format d'email invalide.</p>
            }
          </div>
        }
      </div>

      <div>
        <label>Telephone :</label>
        <input
          [(ngModel)]="utilisateur.telephone"
          name="telephone"
          pattern="^0[1-9][0-9]{8}$"
          #telInput="ngModel"
        >
        @if (telInput.invalid && telInput.touched) {
          <p class="erreur">Format : 0612345678</p>
        }
      </div>

      <button type="submit" [disabled]="monForm.invalid">
        S'inscrire
      </button>

      <p>Formulaire valide : {{ monForm.valid }}</p>
    </form>
  `,
})
export class InscriptionComponent {
  utilisateur = {
    nom: '',
    email: '',
    telephone: '',
  };

  soumettre(form: NgForm): void {
    if (form.valid) {
      console.log('Donnees soumises :', this.utilisateur);
    }
  }
}
```

### Directives de validation disponibles

| Directive | Description | Exemple |
|-----------|------------|---------|
| `required` | Champ obligatoire | `<input required>` |
| `minlength` | Longueur minimum | `<input minlength="3">` |
| `maxlength` | Longueur maximum | `<input maxlength="100">` |
| `pattern` | Regex | `<input pattern="^[A-Z]">` |
| `email` | Format email | `<input email>` |
| `min` | Valeur minimum (nombre) | `<input type="number" min="0">` |
| `max` | Valeur maximum (nombre) | `<input type="number" max="100">` |

### Etats du formulaire et des champs

Chaque champ et le formulaire entier ont des proprietes d'etat :

| Propriete | Description |
|-----------|------------|
| `valid` / `invalid` | Le champ passe-t-il toutes les validations ? |
| `pristine` / `dirty` | L'utilisateur a-t-il modifie le champ ? |
| `touched` / `untouched` | L'utilisateur a-t-il quitte le champ (blur) ? |
| `errors` | Objet contenant les erreurs de validation |

```html
<!-- Afficher les erreurs seulement apres interaction -->
@if (nomInput.invalid && (nomInput.dirty || nomInput.touched)) {
  <span class="erreur">Ce champ est requis</span>
}
```

**Classes CSS automatiques** : Angular ajoute des classes CSS selon l'etat :

| Etat | Classe CSS ajoutee |
|------|-------------------|
| Valide | `ng-valid` |
| Invalide | `ng-invalid` |
| Non modifie | `ng-pristine` |
| Modifie | `ng-dirty` |
| Non touche | `ng-untouched` |
| Touche | `ng-touched` |

```css
/* Styler les champs en erreur apres interaction */
input.ng-invalid.ng-touched {
  border: 2px solid red;
}

input.ng-valid.ng-touched {
  border: 2px solid green;
}
```

### References template : #ngForm et #ngModel

```html
<!-- Reference au formulaire entier -->
<form #monForm="ngForm">
  <!-- monForm.valid, monForm.value, monForm.controls -->

  <!-- Reference a un champ individuel -->
  <input ngModel name="nom" #nomChamp="ngModel">
  <!-- nomChamp.valid, nomChamp.errors, nomChamp.value -->
</form>
```

### Quand utiliser template-driven ?

| Situation | Template-driven ? |
|-----------|:-:|
| Formulaire de login (2-3 champs) | ✅ |
| Formulaire de contact simple | ✅ |
| Prototype rapide | ✅ |
| Formulaire avec logique complexe | ❌ |
| Formulaire dynamique (champs generes) | ❌ |
| Validation cross-field | ❌ |
| Tests unitaires pousses | ❌ |
| Projet ESN critique | ❌ (preferer Reactive Forms) |

---

## Pratique

Creez un formulaire de contact template-driven avec :
1. Champ **nom** (obligatoire, min 2 caracteres)
2. Champ **email** (obligatoire, format email)
3. Champ **message** (textarea, obligatoire, min 10 caracteres)
4. Bouton submit desactive si le formulaire est invalide
5. Messages d'erreur affiches seulement apres interaction (touched)

<details>
<summary>Solution</summary>

```typescript
import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-contact',
  imports: [FormsModule],
  template: `
    <h2>Contactez-nous</h2>

    <form #contactForm="ngForm" (ngSubmit)="envoyer(contactForm)">
      <div>
        <label for="nom">Nom :</label>
        <input
          id="nom"
          [(ngModel)]="formulaire.nom"
          name="nom"
          required
          minlength="2"
          #nomRef="ngModel"
        >
        @if (nomRef.invalid && nomRef.touched) {
          @if (nomRef.errors?.['required']) {
            <p class="erreur">Le nom est obligatoire.</p>
          }
          @if (nomRef.errors?.['minlength']) {
            <p class="erreur">Minimum 2 caracteres.</p>
          }
        }
      </div>

      <div>
        <label for="email">Email :</label>
        <input
          id="email"
          type="email"
          [(ngModel)]="formulaire.email"
          name="email"
          required
          email
          #emailRef="ngModel"
        >
        @if (emailRef.invalid && emailRef.touched) {
          @if (emailRef.errors?.['required']) {
            <p class="erreur">L'email est obligatoire.</p>
          }
          @if (emailRef.errors?.['email']) {
            <p class="erreur">Format d'email invalide.</p>
          }
        }
      </div>

      <div>
        <label for="message">Message :</label>
        <textarea
          id="message"
          [(ngModel)]="formulaire.message"
          name="message"
          required
          minlength="10"
          rows="5"
          #msgRef="ngModel"
        ></textarea>
        @if (msgRef.invalid && msgRef.touched) {
          @if (msgRef.errors?.['required']) {
            <p class="erreur">Le message est obligatoire.</p>
          }
          @if (msgRef.errors?.['minlength']) {
            <p class="erreur">Minimum 10 caracteres.</p>
          }
        }
      </div>

      <button type="submit" [disabled]="contactForm.invalid">
        Envoyer
      </button>
    </form>
  `,
  styles: [`
    .erreur { color: red; font-size: 0.85em; }
    input.ng-invalid.ng-touched,
    textarea.ng-invalid.ng-touched { border: 2px solid red; }
  `],
})
export class ContactComponent {
  formulaire = {
    nom: '',
    email: '',
    message: '',
  };

  envoyer(form: NgForm): void {
    if (form.valid) {
      console.log('Envoi :', this.formulaire);
      form.resetForm();
    }
  }
}
```
</details>

---

## Resume

| Point cle | A retenir |
|-----------|-----------|
| `FormsModule` | A importer dans le composant pour utiliser `ngModel` |
| `[(ngModel)]` | Two-way binding, equivalent de `v-model` en Vue |
| `name` obligatoire | Chaque `ngModel` dans un `<form>` doit avoir un `name` |
| `#ref="ngModel"` | Acces aux proprietes du champ (valid, errors, touched) |
| `#form="ngForm"` | Acces au formulaire entier (valid, value, controls) |
| Validation | `required`, `minlength`, `email`, `pattern` en attributs HTML |
| Classes CSS | `ng-valid`, `ng-invalid`, `ng-touched`, `ng-dirty` |
| Cas d'usage | Formulaires simples, prototypes, 2-5 champs |
| Limites | Pas adapte pour la logique complexe ou les tests |

---

> **Prochain cours** : [Cours 29 — Reactive Forms](./02-reactive-forms.md)
