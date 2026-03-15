# Correction — Exercice 16 : Formulaire réactif

## Résultat attendu

Un formulaire d'inscription avec 4 champs valides. Les erreurs s'affichent uniquement quand le champ a ete touche. Les bordures changent de couleur selon la validite. Le bouton est désactivé tant que le formulaire est invalide. Un validateur personnalise vérifié que les deux mots de passe correspondent.

## Code corrige

### `src/app/exercises/ex16/validators/password-match.validator.ts`

```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validateur de groupe qui verifie que 'password' et 'confirmPassword' correspondent.
 *
 * C'est un validateur applique au FormGroup (pas a un champ individuel).
 * Il a acces a tous les controles du groupe via `control.get()`.
 *
 * @returns ValidatorFn — une fonction de validation Angular
 */
export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    // Recuperer les champs du groupe
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    // Si les controles n'existent pas encore, ne pas valider
    if (!password || !confirmPassword) {
      return null;
    }

    // Si confirmPassword n'a pas encore ete touche, ne pas valider
    if (!confirmPassword.dirty && !confirmPassword.touched) {
      return null;
    }

    // Comparer les valeurs
    if (password.value !== confirmPassword.value) {
      // Ajouter aussi l'erreur sur le champ confirmPassword
      // pour pouvoir l'afficher directement sur ce champ
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    // Si confirmPassword n'a pas d'autres erreurs, nettoyer
    // Attention : ne pas ecraser d'eventuelles autres erreurs
    const errors = confirmPassword.errors;
    if (errors) {
      delete errors['passwordMismatch'];
      if (Object.keys(errors).length === 0) {
        confirmPassword.setErrors(null);
      }
    }

    return null;
  };
}
```

### `src/app/exercises/ex16/registration-form.component.ts`

```typescript
import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { passwordMatchValidator } from './validators/password-match.validator';

// Interface pour le typage strict du formulaire
interface RegistrationForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-registration-form',
  standalone: true,
  // ReactiveFormsModule fournit les directives formGroup, formControlName, etc.
  imports: [ReactiveFormsModule],
  template: `
    <div class="form-container">
      <h2>Inscription</h2>

      @if (submitted()) {
        <div class="success-message">
          Inscription reussie ! Bienvenue, {{ form.value.name }}.
        </div>
      }

      <!-- [formGroup] lie le formulaire au FormGroup TypeScript -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="registration-form">

        <!-- Champ Nom -->
        <div class="form-field">
          <label for="name">Nom</label>
          <input
            id="name"
            type="text"
            formControlName="name"
            placeholder="Votre nom"
            [class.invalid]="isFieldInvalid('name')"
            [class.valid]="isFieldValid('name')"
          />
          <!-- Afficher les erreurs uniquement si le champ a ete touche -->
          @if (isFieldInvalid('name')) {
            <div class="error-messages">
              @if (form.get('name')?.hasError('required')) {
                <p>Le nom est requis.</p>
              }
              @if (form.get('name')?.hasError('minlength')) {
                <p>Le nom doit contenir au moins 2 caracteres.</p>
              }
            </div>
          }
        </div>

        <!-- Champ Email -->
        <div class="form-field">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            placeholder="votre@email.com"
            [class.invalid]="isFieldInvalid('email')"
            [class.valid]="isFieldValid('email')"
          />
          @if (isFieldInvalid('email')) {
            <div class="error-messages">
              @if (form.get('email')?.hasError('required')) {
                <p>L'email est requis.</p>
              }
              @if (form.get('email')?.hasError('email')) {
                <p>L'email n'est pas valide.</p>
              }
            </div>
          }
        </div>

        <!-- Champ Mot de passe -->
        <div class="form-field">
          <label for="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            placeholder="Minimum 8 caracteres"
            [class.invalid]="isFieldInvalid('password')"
            [class.valid]="isFieldValid('password')"
          />
          @if (isFieldInvalid('password')) {
            <div class="error-messages">
              @if (form.get('password')?.hasError('required')) {
                <p>Le mot de passe est requis.</p>
              }
              @if (form.get('password')?.hasError('minlength')) {
                <p>Le mot de passe doit contenir au moins 8 caracteres.</p>
              }
            </div>
          }
        </div>

        <!-- Champ Confirmation -->
        <div class="form-field">
          <label for="confirmPassword">Confirmer le mot de passe</label>
          <input
            id="confirmPassword"
            type="password"
            formControlName="confirmPassword"
            placeholder="Repetez le mot de passe"
            [class.invalid]="isFieldInvalid('confirmPassword')"
            [class.valid]="isFieldValid('confirmPassword')"
          />
          @if (isFieldInvalid('confirmPassword')) {
            <div class="error-messages">
              @if (form.get('confirmPassword')?.hasError('required')) {
                <p>La confirmation est requise.</p>
              }
              @if (form.get('confirmPassword')?.hasError('passwordMismatch')) {
                <p>Les mots de passe ne correspondent pas.</p>
              }
            </div>
          }
          <!-- Erreur au niveau du groupe (validateur de groupe) -->
          @if (form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched) {
            <div class="error-messages">
              <p>Les mots de passe ne correspondent pas.</p>
            </div>
          }
        </div>

        <!-- Bouton Submit -->
        <button
          type="submit"
          [disabled]="form.invalid"
          class="btn-submit"
        >
          S'inscrire
        </button>
      </form>
    </div>
  `,
  styles: [`
    .form-container {
      max-width: 480px;
      margin: 0 auto;
      font-family: 'Segoe UI', sans-serif;
    }

    h2 { text-align: center; margin-bottom: 1.5rem; }

    .registration-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    label {
      font-weight: 600;
      font-size: 0.9rem;
      color: #333;
    }

    input {
      padding: 0.6rem 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.2s;
      outline: none;
    }
    input:focus { border-color: #1976d2; }

    /* Indicateur visuel de validite */
    input.invalid { border-color: #c62828; }
    input.valid { border-color: #2e7d32; }

    .error-messages p {
      color: #c62828;
      font-size: 0.85rem;
      margin: 0.25rem 0 0;
    }

    .success-message {
      background: #e8f5e9;
      color: #2e7d32;
      padding: 1rem;
      border-radius: 6px;
      text-align: center;
      margin-bottom: 1rem;
      font-weight: 600;
    }

    .btn-submit {
      background: #1976d2;
      color: white;
      border: none;
      padding: 0.75rem;
      border-radius: 6px;
      font-size: 1.1rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-submit:hover:not(:disabled) { background: #1565c0; }
    .btn-submit:disabled {
      background: #bdbdbd;
      cursor: not-allowed;
    }
  `],
})
export class RegistrationFormComponent {
  private readonly fb = inject(FormBuilder);

  // Signal pour l'etat de soumission
  readonly submitted = signal<boolean>(false);

  // Creation du FormGroup avec FormBuilder
  // Typage strict grace a la surcharge typee de FormBuilder (Angular 14+)
  readonly form: FormGroup = this.fb.group(
    {
      // Chaque champ : [valeur initiale, [validateurs synchrones]]
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      // Validateur de groupe applique a l'ensemble du FormGroup
      validators: [passwordMatchValidator()],
    }
  );

  /**
   * Verifie si un champ est invalide ET a ete touche/modifie.
   * Sert a n'afficher les erreurs qu'apres interaction de l'utilisateur.
   */
  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return control !== null && control.invalid && (control.dirty || control.touched);
  }

  /**
   * Verifie si un champ est valide ET a ete touche/modifie.
   * Sert pour l'indicateur visuel vert.
   */
  isFieldValid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return control !== null && control.valid && (control.dirty || control.touched);
  }

  /**
   * Soumission du formulaire.
   */
  onSubmit(): void {
    if (this.form.valid) {
      // Extraire les valeurs typees
      const formValue = this.form.value as RegistrationForm;
      console.log('Inscription:', formValue);
      this.submitted.set(true);

      // Reinitialiser le formulaire apres 3 secondes
      setTimeout(() => {
        this.form.reset();
        this.submitted.set(false);
      }, 3000);
    } else {
      // Marquer tous les champs comme touches pour afficher les erreurs
      this.form.markAllAsTouched();
    }
  }
}
```

## Ce que tu aurais pu oublier

### 1. Oublier d'importer `ReactiveFormsModule`

- ❌ Sans `ReactiveFormsModule`, les directives `formGroup` et `formControlName` ne sont pas disponibles :
  ```
  Can't bind to 'formGroup' since it isn't a known property
  ```
- ✅ Importer `ReactiveFormsModule` dans le tableau `imports` du composant standalone

### 2. Appliquer le validateur de mot de passe au champ au lieu du groupe

- ❌ Validateur sur un champ individuel (n'a pas acces a l'autre champ) :
  ```typescript
  confirmPassword: ['', [passwordMatchValidator()]]
  ```
- ✅ Validateur applique au groupe entier dans les options du `fb.group()` :
  ```typescript
  this.fb.group({...}, { validators: [passwordMatchValidator()] })
  ```

### 3. Afficher les erreurs sans vérifier `touched` ou `dirty`

- ❌ Afficher les erreurs immediatement au chargement :
  ```html
  @if (form.get('name')?.hasError('required')) { ... }
  ```
- ✅ Afficher les erreurs uniquement après interaction :
  ```html
  @if (form.get('name')?.invalid && form.get('name')?.touched) { ... }
  ```

### 4. Oublier `markAllAsTouched()` lors de la soumission

- ❌ Si l'utilisateur clique "Submit" sans toucher les champs, aucune erreur ne s'affiche
- ✅ Appeler `this.form.markAllAsTouched()` pour forcer l'affichage de toutes les erreurs

### 5. Mauvais type de retour pour le validateur

- ❌ Retourner `false` au lieu de `null` quand le champ est valide :
  ```typescript
  return false; // Angular ne comprend pas
  ```
- ✅ Retourner `null` pour indiquer "pas d'erreur" :
  ```typescript
  return null; // Convention Angular : null = valide
  ```

## Concepts clés utilises

| Concept | Explication |
|---------|-------------|
| `FormBuilder` | Service utilitaire pour créer des FormGroup/FormControl |
| `FormGroup` | Groupe de controles de formulaire avec validation collective |
| `formControlName` | Directive qui lie un input à un FormControl du groupe |
| `Validators` | Classe statique avec des validateurs pre-définis |
| `ValidatorFn` | Type d'une fonction de validation personnalisee |
| `ValidationErrors` | Type de retour d'un validateur (objet clé/valeur ou null) |
| `touched` / `dirty` | État du controle après interaction de l'utilisateur |
| `markAllAsTouched()` | Force l'affichage des erreurs sur tous les champs |
| `form.valid` / `form.invalid` | État global de validite du formulaire |
| `[disabled]="form.invalid"` | Desactive le bouton si le formulaire est invalide |
