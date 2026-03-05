# Correction — Exercice 18 : Signal Forms

## Resultat attendu

Un formulaire d'inscription avec 4 champs (nom, email, mot de passe, confirmation) entierement gere par des signaux Angular. L'indicateur de force du mot de passe se met a jour en temps reel. Les erreurs n'apparaissent qu'apres interaction avec le champ. Le bouton de soumission est desactive tant que le formulaire n'est pas valide.

## Code corrige

```typescript
// src/app/exercises/ex18/signal-form.component.ts

// Comparaison : Reactive Forms ~85 lignes TS vs Signal Forms ~70 lignes TS
// L'approche Signal elimine FormGroup/FormControl et simplifie la logique

// --- Imports Angular ---
// signal : valeur reactive mutable
// computed : valeur derivee en lecture seule
// effect : execute un side-effect quand ses dependances changent
// model : cree un signal two-way bindable (equivalent de [(ngModel)] mais type-safe)
import { Component, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-signal-form',
  standalone: true,
  imports: [],
  template: `
    <form class="form-container" (submit)="onSubmit($event)">
      <h2>Inscription (Signal Forms)</h2>

      <!-- Champ Nom -->
      <div class="field">
        <label for="name">Nom</label>
        <input
          id="name"
          type="text"
          [value]="name()"
          (input)="onFieldChange('name', $event)"
          (blur)="touchedName.set(true)"
          [class.error]="touchedName() && !nameValid()"
        />
        @if (touchedName() && !nameValid()) {
          <span class="error-msg">Le nom est requis (min. 2 caracteres)</span>
        }
      </div>

      <!-- Champ Email -->
      <div class="field">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          [value]="email()"
          (input)="onFieldChange('email', $event)"
          (blur)="touchedEmail.set(true)"
          [class.error]="touchedEmail() && !emailValid()"
        />
        @if (touchedEmail() && !emailValid()) {
          <span class="error-msg">Email invalide</span>
        }
      </div>

      <!-- Champ Mot de passe -->
      <div class="field">
        <label for="password">Mot de passe</label>
        <input
          id="password"
          type="password"
          [value]="password()"
          (input)="onFieldChange('password', $event)"
          (blur)="touchedPassword.set(true)"
          [class.error]="touchedPassword() && passwordStrength() === 'weak'"
        />
        <!-- Barre de force du mot de passe -->
        @if (password().length > 0) {
          <div class="strength-bar">
            <div
              class="strength-fill"
              [style.width]="strengthWidth()"
              [style.background-color]="strengthColor()"
            ></div>
          </div>
          <span class="strength-label">Force : {{ passwordStrength() }}</span>
        }
      </div>

      <!-- Champ Confirmation -->
      <div class="field">
        <label for="confirmPassword">Confirmer le mot de passe</label>
        <input
          id="confirmPassword"
          type="password"
          [value]="confirmPassword()"
          (input)="onFieldChange('confirmPassword', $event)"
          (blur)="touchedConfirm.set(true)"
          [class.error]="touchedConfirm() && !passwordsMatch()"
        />
        @if (touchedConfirm() && !passwordsMatch()) {
          <span class="error-msg">Les mots de passe ne correspondent pas</span>
        }
      </div>

      <!-- Bouton de soumission -->
      <button type="submit" [disabled]="!isFormValid()">
        Creer mon compte
      </button>

      @if (submitted()) {
        <p class="success">Compte cree avec succes !</p>
      }
    </form>
  `,
  styles: [`
    .form-container {
      max-width: 420px;
      padding: 2rem;
      font-family: sans-serif;
    }
    .field {
      margin-bottom: 1rem;
    }
    label {
      display: block;
      margin-bottom: 0.25rem;
      font-weight: 600;
    }
    input {
      width: 100%;
      padding: 0.5rem;
      font-size: 1rem;
      border: 2px solid #ccc;
      border-radius: 4px;
      box-sizing: border-box;
    }
    input.error {
      border-color: #e53935;
    }
    .error-msg {
      color: #e53935;
      font-size: 0.85rem;
      margin-top: 0.25rem;
      display: block;
    }
    .strength-bar {
      height: 6px;
      background: #e0e0e0;
      border-radius: 3px;
      margin-top: 0.5rem;
      overflow: hidden;
    }
    .strength-fill {
      height: 100%;
      transition: width 0.3s, background-color 0.3s;
      border-radius: 3px;
    }
    .strength-label {
      font-size: 0.8rem;
      color: #666;
    }
    button {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 0.5rem;
    }
    button:disabled {
      background: #bdbdbd;
      cursor: not-allowed;
    }
    .success {
      color: #2e7d32;
      font-weight: 600;
    }
  `]
})
export class SignalFormComponent {
  // --- Signaux des champs du formulaire ---
  // Chaque champ est un signal mutable independant
  readonly name = signal<string>('');
  readonly email = signal<string>('');
  readonly password = signal<string>('');
  readonly confirmPassword = signal<string>('');

  // --- Signaux "touched" ---
  // Passent a true quand l'utilisateur quitte le champ (blur)
  // Permettent de n'afficher les erreurs qu'apres interaction
  readonly touchedName = signal<boolean>(false);
  readonly touchedEmail = signal<boolean>(false);
  readonly touchedPassword = signal<boolean>(false);
  readonly touchedConfirm = signal<boolean>(false);

  // --- Signal de soumission ---
  readonly submitted = signal<boolean>(false);

  // --- Computed : validation du nom ---
  readonly nameValid = computed<boolean>(() =>
    this.name().trim().length >= 2
  );

  // --- Computed : validation de l'email ---
  // Regex simple pour verifier le format email
  readonly emailValid = computed<boolean>(() => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(this.email());
  });

  // --- Computed : force du mot de passe ---
  // Retourne 'weak', 'medium' ou 'strong' selon des criteres precis
  readonly passwordStrength = computed<'weak' | 'medium' | 'strong'>(() => {
    const pwd = this.password();
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasDigit = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);

    // Strong : 12+ caracteres avec majuscule, chiffre et caractere special
    if (pwd.length >= 12 && hasUppercase && hasDigit && hasSpecial) {
      return 'strong';
    }
    // Medium : 8+ caracteres avec majuscule et chiffre
    if (pwd.length >= 8 && hasUppercase && hasDigit) {
      return 'medium';
    }
    // Weak : tout le reste
    return 'weak';
  });

  // --- Computed : correspondance des mots de passe ---
  readonly passwordsMatch = computed<boolean>(() =>
    this.password().length > 0 && this.password() === this.confirmPassword()
  );

  // --- Computed : largeur de la barre de force ---
  readonly strengthWidth = computed<string>(() => {
    const map: Record<'weak' | 'medium' | 'strong', string> = {
      weak: '33%',
      medium: '66%',
      strong: '100%'
    };
    return map[this.passwordStrength()];
  });

  // --- Computed : couleur de la barre de force ---
  readonly strengthColor = computed<string>(() => {
    const map: Record<'weak' | 'medium' | 'strong', string> = {
      weak: '#e53935',
      medium: '#ff9800',
      strong: '#43a047'
    };
    return map[this.passwordStrength()];
  });

  // --- Computed : validite globale du formulaire ---
  // Combine toutes les validations individuelles
  readonly isFormValid = computed<boolean>(() =>
    this.nameValid()
    && this.emailValid()
    && this.passwordStrength() !== 'weak'
    && this.passwordsMatch()
  );

  constructor() {
    // --- Bonus : effect qui log les changements de force ---
    // effect() s'execute automatiquement quand ses dependances (signaux lus) changent
    effect(() => {
      const strength = this.passwordStrength();
      console.log(`[Signal Forms] Force du mot de passe : ${strength}`);
    });
  }

  // --- Methode generique de mise a jour d'un champ ---
  // Evite de dupliquer le code pour chaque champ
  onFieldChange(field: 'name' | 'email' | 'password' | 'confirmPassword', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const signalMap = {
      name: this.name,
      email: this.email,
      password: this.password,
      confirmPassword: this.confirmPassword
    } as const;
    // On appelle .set() sur le signal correspondant
    signalMap[field].set(value);
  }

  // --- Soumission du formulaire ---
  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.isFormValid()) {
      this.submitted.set(true);
      console.log('Formulaire soumis :', {
        name: this.name(),
        email: this.email()
      });
    }
  }
}
```

## Ce que tu aurais pu oublier

### 1. Ne pas utiliser de signaux "touched" pour les erreurs
- ❌ Afficher les erreurs immediatement au chargement de la page (mauvaise UX)
- ✅ Ajouter un signal `touchedXxx` par champ, passe a `true` au `(blur)`, et conditionner l'affichage des erreurs

### 2. Oublier de typer `passwordStrength` avec un union literal
- ❌ `computed<string>(() => ...)` → on pourrait retourner n'importe quelle chaine
- ✅ `computed<'weak' | 'medium' | 'strong'>(() => ...)` → le compilateur verifie les valeurs

### 3. Utiliser `any` pour l'evenement dans `onFieldChange`
- ❌ `onFieldChange(field: string, event: any)` → pas de securite de type
- ✅ `onFieldChange(field: 'name' | 'email' | ..., event: Event)` puis cast `as HTMLInputElement`

### 4. Oublier `event.preventDefault()` dans `onSubmit`
- ❌ Le formulaire recharge la page a la soumission
- ✅ Appeler `event.preventDefault()` pour empecher le comportement par defaut

### 5. Confondre `signal()` et `model()`
- ❌ Utiliser `model()` dans un composant non-parent (model est concu pour le two-way binding parent-enfant)
- ✅ Utiliser `signal()` quand le binding est interne au composant, `model()` pour l'API publique du composant

## Concepts cles utilises

| Concept | Explication |
|---------|-------------|
| `signal<T>(value)` | Cree un signal mutable pour chaque champ du formulaire |
| `computed<T>(() => ...)` | Derive des validations reactives (emailValid, passwordStrength, isFormValid) |
| `effect(() => ...)` | Execute un side-effect (log) quand une dependance change |
| `[value]="signal()"` | Property binding pour lier la valeur de l'input au signal |
| `(input)="handler($event)"` | Event binding pour capturer les saisies utilisateur |
| `(blur)="touched.set(true)"` | Detecte quand l'utilisateur quitte un champ |
| `@if (condition)` | Nouveau control flow Angular 19 pour l'affichage conditionnel |
| `[disabled]="!isFormValid()"` | Desactive le bouton tant que le computed retourne false |
| `[style.width]="expr()"` | Binding de style dynamique pour la barre de force |
| Union literal types | `'weak' \| 'medium' \| 'strong'` pour un typage strict des valeurs |
