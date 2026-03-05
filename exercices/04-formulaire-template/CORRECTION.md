# Correction — Exercice 04 : Formulaire template-driven

## Resultat attendu

Un formulaire de contact avec :
- Trois champs (Nom, Email, Message) avec validation en temps reel
- Des messages d'erreur affiches quand un champ est invalide et touche
- Un bouton "Envoyer" desactive tant que le formulaire est invalide
- Apres soumission, un message de confirmation avec recapitulatif

## Code corrige

```typescript
// src/app/exercises/ex04/contact-form.component.ts

import { Component, signal } from '@angular/core';
// FormsModule est OBLIGATOIRE pour utiliser ngModel dans un composant standalone
// Sans cet import, Angular ne reconnait pas les directives ngModel, ngForm, etc.
import { FormsModule } from '@angular/forms';

// --- Interface pour typer les donnees du formulaire ---
interface ContactForm {
  name: string;
  email: string;
  subject: string;   // bonus
  message: string;
}

@Component({
  selector: 'app-contact-form',
  standalone: true,
  // On importe FormsModule pour avoir acces a ngModel, ngForm, et les validators
  imports: [FormsModule],
  template: `
    <div class="form-container">
      <h1>Formulaire de contact</h1>

      <!-- Affichage conditionnel : formulaire OU confirmation -->
      @if (!submitted()) {
        <!-- #contactForm="ngForm" : reference locale du formulaire -->
        <!-- (ngSubmit) : evenement declenche a la soumission du formulaire -->
        <form #contactForm="ngForm" (ngSubmit)="onSubmit(contactForm)">

          <!-- Champ Nom -->
          <div class="field">
            <label for="name">Nom</label>
            <input
              id="name"
              type="text"
              name="name"
              [(ngModel)]="formData.name"
              required
              minlength="2"
              #nameField="ngModel"
              placeholder="Votre nom"
            />
            <!-- Affiche l'erreur si le champ est invalide ET a ete touche (touched) -->
            <!-- nameField.errors?.['required'] : accede a l'erreur specifique -->
            @if (nameField.invalid && nameField.touched) {
              <div class="error">
                @if (nameField.errors?.['required']) {
                  <span>Le nom est obligatoire.</span>
                }
                @if (nameField.errors?.['minlength']) {
                  <span>Le nom doit contenir au moins 2 caracteres.</span>
                }
              </div>
            }
          </div>

          <!-- Champ Email -->
          <div class="field">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              [(ngModel)]="formData.email"
              required
              email
              #emailField="ngModel"
              placeholder="votre@email.com"
            />
            @if (emailField.invalid && emailField.touched) {
              <div class="error">
                @if (emailField.errors?.['required']) {
                  <span>L'email est obligatoire.</span>
                }
                @if (emailField.errors?.['email']) {
                  <span>L'email n'est pas valide.</span>
                }
              </div>
            }
          </div>

          <!-- Champ Sujet (bonus) -->
          <div class="field">
            <label for="subject">Sujet</label>
            <select
              id="subject"
              name="subject"
              [(ngModel)]="formData.subject"
              required
              #subjectField="ngModel"
            >
              <option value="" disabled>-- Choisir un sujet --</option>
              <option value="question">Question generale</option>
              <option value="bug">Signaler un bug</option>
              <option value="feature">Demande de fonctionnalite</option>
              <option value="other">Autre</option>
            </select>
            @if (subjectField.invalid && subjectField.touched) {
              <div class="error">
                <span>Veuillez choisir un sujet.</span>
              </div>
            }
          </div>

          <!-- Champ Message -->
          <div class="field">
            <label for="message">Message</label>
            <textarea
              id="message"
              name="message"
              [(ngModel)]="formData.message"
              required
              minlength="10"
              #messageField="ngModel"
              placeholder="Votre message (min. 10 caracteres)"
              rows="5"
            ></textarea>
            @if (messageField.invalid && messageField.touched) {
              <div class="error">
                @if (messageField.errors?.['required']) {
                  <span>Le message est obligatoire.</span>
                }
                @if (messageField.errors?.['minlength']) {
                  <span>
                    Le message doit contenir au moins 10 caracteres
                    ({{ messageField.errors?.['minlength']?.actualLength }}/10).
                  </span>
                }
              </div>
            }
          </div>

          <!-- Bouton de soumission -->
          <!-- [disabled] : desactive si le formulaire est invalide -->
          <button type="submit" [disabled]="contactForm.invalid">
            Envoyer
          </button>
        </form>
      } @else {
        <!-- Message de confirmation apres soumission (bonus) -->
        <div class="confirmation">
          <h2>Message envoye !</h2>
          <p><strong>Nom :</strong> {{ formData.name }}</p>
          <p><strong>Email :</strong> {{ formData.email }}</p>
          <p><strong>Sujet :</strong> {{ formData.subject }}</p>
          <p><strong>Message :</strong> {{ formData.message }}</p>
          <button (click)="resetForm()">Envoyer un autre message</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .form-container {
      padding: 2rem;
      max-width: 500px;
      font-family: sans-serif;
    }
    .field {
      margin-bottom: 1rem;
    }
    label {
      display: block;
      font-weight: bold;
      margin-bottom: 0.25rem;
    }
    input, textarea, select {
      width: 100%;
      padding: 0.5rem;
      font-size: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-sizing: border-box;
    }
    input.ng-invalid.ng-touched,
    textarea.ng-invalid.ng-touched,
    select.ng-invalid.ng-touched {
      border-color: #ef5350;
    }
    .error {
      color: #ef5350;
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }
    button[type="submit"] {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 0.5rem;
    }
    button[type="submit"]:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .confirmation {
      padding: 1.5rem;
      background: #e8f5e9;
      border-radius: 8px;
    }
    .confirmation h2 {
      color: #2e7d32;
      margin-top: 0;
    }
    .confirmation button {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  `]
})
export class ContactFormComponent {

  // --- Signal formData ---
  // Contient les donnees du formulaire
  // Note : avec ngModel, Angular gere le two-way binding directement
  // On utilise un objet simple ici car ngModel ne travaille pas avec des signaux
  // Pour un formulaire template-driven, les proprietes sont modifiees directement
  formData: ContactForm = {
    name: '',
    email: '',
    subject: '',
    message: '',
  };

  // --- Signal submitted ---
  // Permet de basculer entre le formulaire et la confirmation
  readonly submitted = signal<boolean>(false);

  // --- Methode onSubmit ---
  // Appelee quand le formulaire est soumis via (ngSubmit)
  // On recoit la reference du formulaire pour verifier sa validite
  onSubmit(form: { valid: boolean }): void {
    // Guard clause : on ne fait rien si le formulaire est invalide
    if (!form.valid) return;

    // Afficher les donnees dans la console pour debug
    console.log('Formulaire soumis :', this.formData);

    // Basculer vers l'affichage de confirmation
    this.submitted.set(true);
  }

  // --- Methode resetForm ---
  // Remet le formulaire a son etat initial
  resetForm(): void {
    this.formData = {
      name: '',
      email: '',
      subject: '',
      message: '',
    };
    this.submitted.set(false);
  }
}
```

## Ce que tu aurais pu oublier

### 1. Oublier d'importer FormsModule
- ❌ Ne pas importer `FormsModule` → `ngModel` n'est pas reconnu, erreur de compilation
- ✅ `imports: [FormsModule]` dans le decorateur `@Component`

### 2. Oublier l'attribut `name` sur les champs
- ❌ `<input [(ngModel)]="formData.name">` sans `name="name"` → erreur Angular
- ✅ Chaque champ avec `[(ngModel)]` doit avoir un attribut `name` unique

### 3. Afficher les erreurs sans verifier `touched`
- ❌ `@if (nameField.invalid)` → erreurs affichees des le chargement de la page
- ✅ `@if (nameField.invalid && nameField.touched)` → erreurs apres interaction utilisateur

### 4. Utiliser `(submit)` au lieu de `(ngSubmit)`
- ❌ `(submit)="onSubmit()"` → le formulaire se soumet et recharge la page
- ✅ `(ngSubmit)="onSubmit(contactForm)"` → Angular intercepte la soumission

### 5. Acceder aux erreurs sans optional chaining
- ❌ `nameField.errors['required']` → erreur si errors est null
- ✅ `nameField.errors?.['required']` → safe navigation

## Concepts cles utilises

| Concept | Explication |
|---------|-------------|
| `FormsModule` | Module Angular necessaire pour les formulaires template-driven (ngModel, ngForm) |
| `[(ngModel)]` | Two-way binding : lie la valeur du champ a une propriete du composant |
| `#field="ngModel"` | Reference locale au controle ngModel pour acceder a ses etats (valid, touched, errors) |
| `#form="ngForm"` | Reference locale au formulaire global pour verifier sa validite |
| `required`, `email`, `minlength` | Directives de validation natives HTML5 interpretees par Angular |
| `field.errors?.['key']` | Acces aux erreurs specifiques d'un champ avec optional chaining |
| `field.touched` | Booleen qui indique si l'utilisateur a interagi avec le champ |
| `[disabled]="form.invalid"` | Desactive le bouton si le formulaire contient des erreurs |
| `(ngSubmit)` | Evenement Angular qui intercepte la soumission du formulaire |
