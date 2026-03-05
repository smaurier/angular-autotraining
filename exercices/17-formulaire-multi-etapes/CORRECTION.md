# Correction — Exercice 17 : Formulaire multi-etapes

## Resultat attendu

Un wizard de 3 etapes avec une barre de progression. L'etape 1 collecte les infos personnelles, l'etape 2 permet d'ajouter plusieurs adresses via un FormArray dynamique, l'etape 3 affiche un recapitulatif avant soumission. La navigation valide chaque etape avant de passer a la suivante.

## Code corrige

### `src/app/exercises/ex17/models/form.model.ts`

```typescript
// Interfaces typees pour chaque section du formulaire

export interface PersonalInfo {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
}

export interface Address {
  readonly street: string;
  readonly city: string;
  readonly zipCode: string;
  readonly country: string;
}

// Type complet pour la soumission finale
export interface RegistrationData {
  readonly personalInfo: PersonalInfo;
  readonly addresses: Address[];
}
```

### `src/app/exercises/ex17/steps/step-personal.component.ts`

```typescript
import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-step-personal',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div [formGroup]="formGroup()" class="step-content">
      <h3>Etape 1 — Informations personnelles</h3>

      <div class="field-row">
        <div class="form-field">
          <label for="firstName">Prenom *</label>
          <input id="firstName" type="text" formControlName="firstName" />
          @if (formGroup().get('firstName')?.invalid && formGroup().get('firstName')?.touched) {
            <p class="error">Le prenom est requis.</p>
          }
        </div>

        <div class="form-field">
          <label for="lastName">Nom *</label>
          <input id="lastName" type="text" formControlName="lastName" />
          @if (formGroup().get('lastName')?.invalid && formGroup().get('lastName')?.touched) {
            <p class="error">Le nom est requis.</p>
          }
        </div>
      </div>

      <div class="form-field">
        <label for="email">Email *</label>
        <input id="email" type="email" formControlName="email" />
        @if (formGroup().get('email')?.touched) {
          @if (formGroup().get('email')?.hasError('required')) {
            <p class="error">L'email est requis.</p>
          }
          @if (formGroup().get('email')?.hasError('email')) {
            <p class="error">L'email n'est pas valide.</p>
          }
        }
      </div>

      <div class="form-field">
        <label for="phone">Telephone (optionnel)</label>
        <input id="phone" type="tel" formControlName="phone" />
      </div>
    </div>
  `,
  styles: [`
    .step-content { display: flex; flex-direction: column; gap: 1rem; }
    h3 { margin: 0 0 0.5rem; color: #1976d2; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-field { display: flex; flex-direction: column; gap: 0.25rem; }
    label { font-weight: 600; font-size: 0.9rem; }
    input {
      padding: 0.5rem; border: 1px solid #ccc;
      border-radius: 4px; font-size: 1rem;
    }
    .error { color: #c62828; font-size: 0.85rem; margin: 0; }
  `],
})
export class StepPersonalComponent {
  // Le FormGroup est passe en input depuis le parent
  readonly formGroup = input.required<FormGroup>();
}
```

### `src/app/exercises/ex17/steps/step-addresses.component.ts`

```typescript
import { Component, input, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-step-addresses',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="step-content">
      <h3>Etape 2 — Adresses</h3>

      <!-- Boucle sur le FormArray -->
      @for (addressGroup of addressControls; track $index) {
        <div class="address-card" [formGroup]="addressGroup">
          <div class="address-header">
            <strong>Adresse {{ $index + 1 }}</strong>
            <!-- Ne pas pouvoir supprimer la derniere adresse -->
            @if (addressControls.length > 1) {
              <button
                type="button"
                (click)="removeAddress($index)"
                class="btn-remove"
              >
                Supprimer
              </button>
            }
          </div>

          <div class="field-row">
            <div class="form-field">
              <label>Rue *</label>
              <input type="text" formControlName="street" />
              @if (addressGroup.get('street')?.invalid && addressGroup.get('street')?.touched) {
                <p class="error">La rue est requise.</p>
              }
            </div>
            <div class="form-field">
              <label>Ville *</label>
              <input type="text" formControlName="city" />
              @if (addressGroup.get('city')?.invalid && addressGroup.get('city')?.touched) {
                <p class="error">La ville est requise.</p>
              }
            </div>
          </div>

          <div class="field-row">
            <div class="form-field">
              <label>Code postal *</label>
              <input type="text" formControlName="zipCode" />
              @if (addressGroup.get('zipCode')?.touched) {
                @if (addressGroup.get('zipCode')?.hasError('required')) {
                  <p class="error">Le code postal est requis.</p>
                }
                @if (addressGroup.get('zipCode')?.hasError('pattern')) {
                  <p class="error">Le code postal doit contenir 5 chiffres.</p>
                }
              }
            </div>
            <div class="form-field">
              <label>Pays *</label>
              <input type="text" formControlName="country" />
              @if (addressGroup.get('country')?.invalid && addressGroup.get('country')?.touched) {
                <p class="error">Le pays est requis.</p>
              }
            </div>
          </div>
        </div>
      }

      <button type="button" (click)="addAddress()" class="btn-add">
        + Ajouter une adresse
      </button>
    </div>
  `,
  styles: [`
    .step-content { display: flex; flex-direction: column; gap: 1rem; }
    h3 { margin: 0 0 0.5rem; color: #1976d2; }
    .address-card {
      border: 1px solid #e0e0e0; border-radius: 8px;
      padding: 1rem; margin-bottom: 0.5rem;
    }
    .address-header {
      display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 0.75rem;
    }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.5rem; }
    .form-field { display: flex; flex-direction: column; gap: 0.25rem; }
    label { font-weight: 600; font-size: 0.9rem; }
    input {
      padding: 0.5rem; border: 1px solid #ccc;
      border-radius: 4px; font-size: 1rem;
    }
    .error { color: #c62828; font-size: 0.85rem; margin: 0; }
    .btn-remove {
      background: #f44336; color: white; border: none;
      padding: 0.3rem 0.8rem; border-radius: 4px;
      cursor: pointer; font-size: 0.85rem;
    }
    .btn-add {
      background: #e3f2fd; color: #1565c0; border: 1px dashed #1565c0;
      padding: 0.6rem; border-radius: 4px;
      cursor: pointer; font-size: 0.95rem; width: 100%;
    }
  `],
})
export class StepAddressesComponent {
  private readonly fb = inject(FormBuilder);

  // Le FormArray est passe en input depuis le parent
  readonly formArray = input.required<FormArray>();

  // Getter pour acceder aux controles types du FormArray
  get addressControls(): FormGroup[] {
    return this.formArray().controls as FormGroup[];
  }

  /**
   * Ajoute un nouveau groupe d'adresse au FormArray.
   */
  addAddress(): void {
    const addressGroup = this.fb.group({
      street: ['', Validators.required],
      city: ['', Validators.required],
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      country: ['', Validators.required],
    });
    this.formArray().push(addressGroup);
  }

  /**
   * Supprime une adresse par son index.
   */
  removeAddress(index: number): void {
    this.formArray().removeAt(index);
  }
}
```

### `src/app/exercises/ex17/steps/step-review.component.ts`

```typescript
import { Component, input } from '@angular/core';
import { FormGroup, FormArray } from '@angular/forms';
import { PersonalInfo, Address } from '../models/form.model';

@Component({
  selector: 'app-step-review',
  standalone: true,
  template: `
    <div class="step-content">
      <h3>Etape 3 — Recapitulatif</h3>

      <!-- Informations personnelles -->
      <div class="review-section">
        <h4>Informations personnelles</h4>
        <table class="review-table">
          <tr>
            <td><strong>Prenom</strong></td>
            <td>{{ personalData.firstName }}</td>
          </tr>
          <tr>
            <td><strong>Nom</strong></td>
            <td>{{ personalData.lastName }}</td>
          </tr>
          <tr>
            <td><strong>Email</strong></td>
            <td>{{ personalData.email }}</td>
          </tr>
          <tr>
            <td><strong>Telephone</strong></td>
            <td>{{ personalData.phone || 'Non renseigne' }}</td>
          </tr>
        </table>
      </div>

      <!-- Adresses -->
      <div class="review-section">
        <h4>Adresses ({{ addressesData.length }})</h4>
        @for (address of addressesData; track $index) {
          <div class="address-review">
            <p><strong>Adresse {{ $index + 1 }}</strong></p>
            <p>{{ address.street }}</p>
            <p>{{ address.zipCode }} {{ address.city }}</p>
            <p>{{ address.country }}</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .step-content { display: flex; flex-direction: column; gap: 1rem; }
    h3 { margin: 0 0 0.5rem; color: #1976d2; }
    h4 { margin: 0; color: #333; }
    .review-section {
      border: 1px solid #e0e0e0; border-radius: 8px;
      padding: 1rem;
    }
    .review-table { width: 100%; border-collapse: collapse; }
    .review-table td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #f0f0f0; }
    .address-review {
      background: #f5f5f5; border-radius: 4px;
      padding: 0.75rem; margin-top: 0.5rem;
    }
    .address-review p { margin: 0.15rem 0; }
  `],
})
export class StepReviewComponent {
  readonly personalGroup = input.required<FormGroup>();
  readonly addressesArray = input.required<FormArray>();

  // Getters pour extraire les valeurs typees
  get personalData(): PersonalInfo {
    return this.personalGroup().value as PersonalInfo;
  }

  get addressesData(): Address[] {
    return this.addressesArray().value as Address[];
  }
}
```

### `src/app/exercises/ex17/wizard-form.component.ts`

```typescript
import { Component, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { StepPersonalComponent } from './steps/step-personal.component';
import { StepAddressesComponent } from './steps/step-addresses.component';
import { StepReviewComponent } from './steps/step-review.component';
import { RegistrationData } from './models/form.model';

@Component({
  selector: 'app-wizard-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    StepPersonalComponent,
    StepAddressesComponent,
    StepReviewComponent,
  ],
  template: `
    <div class="wizard-container">
      <h2>Inscription multi-etapes</h2>

      <!-- Barre de progression -->
      <div class="progress-bar">
        @for (step of steps; track step.number) {
          <div
            class="step-indicator"
            [class.active]="currentStep() === step.number"
            [class.completed]="currentStep() > step.number"
            (click)="goToStep(step.number)"
          >
            <div class="step-circle">{{ step.number }}</div>
            <span class="step-label">{{ step.label }}</span>
          </div>
        }
      </div>

      <!-- Message de succes -->
      @if (submitted()) {
        <div class="success-message">
          Inscription reussie ! Merci {{ personalInfoGroup.value.firstName }}.
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <!-- Etape 1 : Informations personnelles -->
        @if (currentStep() === 1) {
          <app-step-personal [formGroup]="personalInfoGroup" />
        }

        <!-- Etape 2 : Adresses -->
        @if (currentStep() === 2) {
          <app-step-addresses [formArray]="addressesArray" />
        }

        <!-- Etape 3 : Recapitulatif -->
        @if (currentStep() === 3) {
          <app-step-review
            [personalGroup]="personalInfoGroup"
            [addressesArray]="addressesArray"
          />
        }

        <!-- Boutons de navigation -->
        <div class="nav-buttons">
          @if (currentStep() > 1) {
            <button type="button" (click)="previousStep()" class="btn-prev">
              Precedent
            </button>
          }

          @if (currentStep() < 3) {
            <button
              type="button"
              (click)="nextStep()"
              [disabled]="!isCurrentStepValid()"
              class="btn-next"
            >
              Suivant
            </button>
          }

          @if (currentStep() === 3) {
            <button type="submit" class="btn-submit">
              Soumettre
            </button>
          }
        </div>
      </form>
    </div>
  `,
  styles: [`
    .wizard-container {
      max-width: 650px;
      margin: 0 auto;
      font-family: 'Segoe UI', sans-serif;
    }

    h2 { text-align: center; margin-bottom: 1.5rem; }

    /* Barre de progression */
    .progress-bar {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2rem;
      position: relative;
    }

    .step-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      cursor: pointer;
    }

    .step-circle {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: #e0e0e0;
      color: #666;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700;
      transition: all 0.3s;
    }

    .step-indicator.active .step-circle {
      background: #1976d2; color: white;
    }

    .step-indicator.completed .step-circle {
      background: #4caf50; color: white;
    }

    .step-label {
      margin-top: 0.25rem;
      font-size: 0.8rem;
      color: #666;
    }

    .step-indicator.active .step-label { color: #1976d2; font-weight: 600; }

    /* Navigation */
    .nav-buttons {
      display: flex;
      justify-content: space-between;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #e0e0e0;
    }

    .btn-prev {
      background: #e0e0e0; color: #333; border: none;
      padding: 0.6rem 1.5rem; border-radius: 4px;
      cursor: pointer; font-size: 1rem;
    }

    .btn-next {
      background: #1976d2; color: white; border: none;
      padding: 0.6rem 1.5rem; border-radius: 4px;
      cursor: pointer; font-size: 1rem;
      margin-left: auto;
    }
    .btn-next:disabled { background: #bdbdbd; cursor: not-allowed; }

    .btn-submit {
      background: #4caf50; color: white; border: none;
      padding: 0.6rem 1.5rem; border-radius: 4px;
      cursor: pointer; font-size: 1rem;
      margin-left: auto;
    }

    .success-message {
      background: #e8f5e9; color: #2e7d32;
      padding: 1rem; border-radius: 6px;
      text-align: center; margin-bottom: 1rem;
      font-weight: 600;
    }
  `],
})
export class WizardFormComponent {
  private readonly fb = inject(FormBuilder);

  // Signal pour l'etape courante
  readonly currentStep = signal<number>(1);
  readonly submitted = signal<boolean>(false);

  // Metadata des etapes (pour la barre de progression)
  readonly steps = [
    { number: 1, label: 'Informations' },
    { number: 2, label: 'Adresses' },
    { number: 3, label: 'Recapitulatif' },
  ] as const;

  // Formulaire global avec groupes et FormArray imbriques
  readonly form: FormGroup = this.fb.group({
    personalInfo: this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
    }),
    // FormArray avec une adresse par defaut
    addresses: this.fb.array([
      this.createAddressGroup(),
    ]),
  });

  // Getters types pour acceder aux sous-groupes
  get personalInfoGroup(): FormGroup {
    return this.form.get('personalInfo') as FormGroup;
  }

  get addressesArray(): FormArray {
    return this.form.get('addresses') as FormArray;
  }

  /**
   * Cree un nouveau FormGroup pour une adresse.
   * Methode utilitaire reutilisee par le composant enfant aussi.
   */
  private createAddressGroup(): FormGroup {
    return this.fb.group({
      street: ['', Validators.required],
      city: ['', Validators.required],
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      country: ['', Validators.required],
    });
  }

  /**
   * Verifie si l'etape courante est valide.
   */
  isCurrentStepValid(): boolean {
    switch (this.currentStep()) {
      case 1:
        return this.personalInfoGroup.valid;
      case 2:
        return this.addressesArray.valid && this.addressesArray.length > 0;
      case 3:
        return this.form.valid;
      default:
        return false;
    }
  }

  /**
   * Passe a l'etape suivante apres validation.
   */
  nextStep(): void {
    if (this.isCurrentStepValid()) {
      this.currentStep.update((step) => Math.min(step + 1, 3));
    } else {
      // Marquer tous les champs de l'etape comme touches
      this.markCurrentStepAsTouched();
    }
  }

  /**
   * Revient a l'etape precedente.
   */
  previousStep(): void {
    this.currentStep.update((step) => Math.max(step - 1, 1));
  }

  /**
   * Navigation directe vers une etape (seulement si les etapes precedentes sont valides).
   */
  goToStep(step: number): void {
    // On ne peut aller a une etape que si toutes les precedentes sont valides
    if (step <= this.currentStep()) {
      this.currentStep.set(step);
    }
  }

  /**
   * Marque les champs de l'etape courante comme touches.
   */
  private markCurrentStepAsTouched(): void {
    switch (this.currentStep()) {
      case 1:
        this.personalInfoGroup.markAllAsTouched();
        break;
      case 2:
        this.addressesArray.markAllAsTouched();
        break;
    }
  }

  /**
   * Soumission finale du formulaire.
   */
  onSubmit(): void {
    if (this.form.valid) {
      const data = this.form.value as RegistrationData;
      console.log('Soumission:', data);
      this.submitted.set(true);
    }
  }
}
```

## Ce que tu aurais pu oublier

### 1. Oublier de typer le `FormArray`

- ❌ Acceder aux controles sans cast :
  ```typescript
  this.form.get('addresses').controls // Type unknown
  ```
- ✅ Caster en `FormArray` puis acceder aux controles types :
  ```typescript
  get addressesArray(): FormArray {
    return this.form.get('addresses') as FormArray;
  }
  ```

### 2. Ne pas valider l'etape avant de passer a la suivante

- ❌ Permettre la navigation libre sans validation
- ✅ Verifier `isCurrentStepValid()` avant d'incrementer l'etape

### 3. Oublier qu'un `FormArray` vide est toujours "valid"

- ❌ Verifier uniquement `addressesArray.valid` (true meme si vide)
- ✅ Verifier aussi `addressesArray.length > 0` pour imposer au minimum une adresse

### 4. Passer le formulaire complet au composant enfant

- ❌ Passer tout le `FormGroup` au composant enfant
- ✅ Passer uniquement le sous-groupe ou sous-array concerne (separation des responsabilites)

## Concepts cles utilises

| Concept | Explication |
|---------|-------------|
| `FormArray` | Collection ordonnee de controles (ajouter/supprimer dynamiquement) |
| `FormGroup` imbrique | Sous-groupe dans un formulaire pour organiser les donnees |
| `fb.array()` | Cree un FormArray via FormBuilder |
| `formArray.push()` | Ajoute un controle au FormArray |
| `formArray.removeAt()` | Supprime un controle par son index |
| `markAllAsTouched()` | Force l'affichage des erreurs de validation |
| Signal `currentStep` | Etat reactif de l'etape courante dans le wizard |
| `Validators.pattern` | Validateur basé sur une expression reguliere |
| `input.required<T>()` | Input obligatoire type pour la communication parent-enfant |
