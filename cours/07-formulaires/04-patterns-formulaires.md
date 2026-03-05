# Cours 31 — Patterns formulaires avances

> **Objectif** : Maitriser les patterns de formulaires les plus courants en entreprise : formulaire multi-etapes (wizard), formulaires dynamiques depuis un JSON, validation cross-field, controles personnalises (ControlValueAccessor), patterns de soumission et auto-save avec debounce.

---

## Rappel du cours precedent

<details>
<summary>1. Quel est l'avantage principal du pattern Signal Forms par rapport aux Reactive Forms ?</summary>

Le modele (Signals) **est** directement le formulaire. Il n'y a pas de duplication entre un objet modele et un FormGroup. La validation est un `computed()` derive automatiquement du modele.
</details>

<details>
<summary>2. Comment migrer progressivement d'un Reactive Form vers un pattern Signal ?</summary>

En utilisant `toSignal(form.get('champ')!.valueChanges)` pour exposer les valeurs du Reactive Form comme des Signals. Cela permet de convertir les composants un par un sans tout casser.
</details>

<details>
<summary>3. Dans quel cas les Reactive Forms restent-ils le meilleur choix en 2025-2026 ?</summary>

Pour la production en ESN : ils sont stables, documentes, couverts par les tests, et attendus en entretien. Le pattern Signal Forms est encore experimental.
</details>

---

## Analogie

Imaginez construire une **maison** :

- **Formulaire simple** = une cabane de jardin : 4 murs, un toit, c'est fait.
- **Wizard multi-etapes** = construire etage par etage : fondations (etape 1), murs (etape 2), toiture (etape 3). On ne peut pas poser le toit sans les murs.
- **Formulaire dynamique** = une maison **modulaire** : les plans arrivent du bureau d'etude (JSON config), et les ouvriers assemblent les pieces selon le schema.
- **ControlValueAccessor** = un sous-traitant specialise : un electricien que vous appelez comme n'importe quel ouvrier, mais qui gere son travail en interne avec ses propres regles.

---

## Theorie

### Pattern 1 : Formulaire multi-etapes (Wizard)

Le pattern le plus demande en ESN pour les processus complexes (inscription, commande, onboarding) :

```typescript
import { Component, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-wizard',
  imports: [ReactiveFormsModule],
  template: `
    <!-- Barre de progression -->
    <div class="progress">
      @for (etape of etapes; track etape; let i = $index) {
        <span
          [class.active]="i === etapeCourante()"
          [class.done]="i < etapeCourante()"
        >
          {{ etape }}
        </span>
      }
    </div>

    <form [formGroup]="form" (ngSubmit)="soumettre()">
      <!-- Etape 1 : Informations personnelles -->
      @if (etapeCourante() === 0) {
        <div formGroupName="personnel">
          <h3>Informations personnelles</h3>
          <input formControlName="nom" placeholder="Nom">
          <input formControlName="prenom" placeholder="Prenom">
          <input formControlName="email" placeholder="Email" type="email">
        </div>
      }

      <!-- Etape 2 : Adresse -->
      @if (etapeCourante() === 1) {
        <div formGroupName="adresse">
          <h3>Adresse de livraison</h3>
          <input formControlName="rue" placeholder="Rue">
          <input formControlName="ville" placeholder="Ville">
          <input formControlName="codePostal" placeholder="Code postal">
        </div>
      }

      <!-- Etape 3 : Paiement -->
      @if (etapeCourante() === 2) {
        <div formGroupName="paiement">
          <h3>Paiement</h3>
          <input formControlName="numeroCarte" placeholder="Numero de carte">
          <input formControlName="expiration" placeholder="MM/AA">
          <input formControlName="cvv" placeholder="CVV" maxlength="3">
        </div>
      }

      <!-- Navigation -->
      <div class="actions">
        @if (etapeCourante() > 0) {
          <button type="button" (click)="precedent()">Precedent</button>
        }
        @if (etapeCourante() < etapes.length - 1) {
          <button type="button" (click)="suivant()" [disabled]="!etapeValide()">
            Suivant
          </button>
        }
        @if (etapeCourante() === etapes.length - 1) {
          <button type="submit" [disabled]="form.invalid">
            Confirmer la commande
          </button>
        }
      </div>
    </form>
  `,
})
export class WizardComponent {
  private fb = inject(FormBuilder);

  etapes = ['Personnel', 'Adresse', 'Paiement'];
  etapeCourante = signal(0);

  form = this.fb.group({
    personnel: this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    }),
    adresse: this.fb.group({
      rue: ['', Validators.required],
      ville: ['', Validators.required],
      codePostal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
    }),
    paiement: this.fb.group({
      numeroCarte: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
      expiration: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3}$/)]],
    }),
  });

  private groupesEtapes = ['personnel', 'adresse', 'paiement'];

  etapeValide(): boolean {
    const groupe = this.groupesEtapes[this.etapeCourante()];
    return this.form.get(groupe)?.valid ?? false;
  }

  suivant(): void {
    if (this.etapeValide()) {
      this.etapeCourante.update(e => Math.min(e + 1, this.etapes.length - 1));
    }
  }

  precedent(): void {
    this.etapeCourante.update(e => Math.max(e - 1, 0));
  }

  soumettre(): void {
    if (this.form.valid) {
      console.log('Commande :', this.form.getRawValue());
    }
  }
}
```

### Pattern 2 : Formulaire dynamique depuis JSON

Pour generer des formulaires a partir d'une configuration serveur :

```typescript
// Modele de configuration
interface ChampConfig {
  cle: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea';
  requis: boolean;
  options?: string[];       // Pour les selects
  validations?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

// Exemple de config JSON (pourrait venir d'une API)
const configFormulaire: ChampConfig[] = [
  { cle: 'nom', label: 'Nom complet', type: 'text', requis: true, validations: { minLength: 2 } },
  { cle: 'email', label: 'Email', type: 'email', requis: true },
  { cle: 'age', label: 'Age', type: 'number', requis: false, validations: { min: 18, max: 120 } },
  { cle: 'pays', label: 'Pays', type: 'select', requis: true, options: ['France', 'Belgique', 'Suisse'] },
  { cle: 'commentaire', label: 'Commentaire', type: 'textarea', requis: false, validations: { maxLength: 500 } },
];
```

```typescript
@Component({
  selector: 'app-dynamic-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="soumettre()">
      @for (champ of config; track champ.cle) {
        <div>
          <label>{{ champ.label }} :</label>

          @switch (champ.type) {
            @case ('select') {
              <select [formControlName]="champ.cle">
                <option value="">-- Choisir --</option>
                @for (opt of champ.options; track opt) {
                  <option [value]="opt">{{ opt }}</option>
                }
              </select>
            }
            @case ('textarea') {
              <textarea [formControlName]="champ.cle" rows="4"></textarea>
            }
            @default {
              <input [type]="champ.type" [formControlName]="champ.cle">
            }
          }

          @if (form.get(champ.cle)?.invalid && form.get(champ.cle)?.touched) {
            <p class="erreur">Champ invalide</p>
          }
        </div>
      }

      <button type="submit" [disabled]="form.invalid">Envoyer</button>
    </form>
  `,
})
export class DynamicFormComponent implements OnInit {
  private fb = inject(FormBuilder);

  config: ChampConfig[] = configFormulaire;
  form!: FormGroup;

  ngOnInit(): void {
    const groupe: Record<string, any> = {};

    for (const champ of this.config) {
      const validators = [];
      if (champ.requis) validators.push(Validators.required);
      if (champ.type === 'email') validators.push(Validators.email);
      if (champ.validations?.minLength) validators.push(Validators.minLength(champ.validations.minLength));
      if (champ.validations?.maxLength) validators.push(Validators.maxLength(champ.validations.maxLength));
      if (champ.validations?.min) validators.push(Validators.min(champ.validations.min));
      if (champ.validations?.max) validators.push(Validators.max(champ.validations.max));
      if (champ.validations?.pattern) validators.push(Validators.pattern(champ.validations.pattern));

      groupe[champ.cle] = ['', validators];
    }

    this.form = this.fb.group(groupe);
  }

  soumettre(): void {
    if (this.form.valid) {
      console.log('Donnees dynamiques :', this.form.value);
    }
  }
}
```

### Pattern 3 : Validation cross-field

Valider que deux champs sont coherents entre eux :

```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Validateur de groupe : les mots de passe doivent correspondre
export function motDePasseIdentique(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const mdp = group.get('motDePasse')?.value;
    const confirm = group.get('confirmMotDePasse')?.value;

    if (!mdp || !confirm) return null;
    return mdp === confirm ? null : { motDePasseDifferent: true };
  };
}

// Utilisation : le validateur est sur le FormGroup, pas sur un FormControl
form = this.fb.group({
  motDePasse: ['', [Validators.required, Validators.minLength(8)]],
  confirmMotDePasse: ['', Validators.required],
}, {
  validators: [motDePasseIdentique()],  // ← Validateur de groupe
});
```

```html
@if (form.hasError('motDePasseDifferent')) {
  <p class="erreur">Les mots de passe ne correspondent pas.</p>
}
```

### Pattern 4 : ControlValueAccessor (controle personnalise)

Creer un composant qui se comporte comme un input natif dans un formulaire :

```typescript
import { Component, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-star-rating',
  template: `
    <div class="stars">
      @for (star of [1, 2, 3, 4, 5]; track star) {
        <span
          [class.filled]="star <= valeur"
          (click)="setValeur(star)"
        >
          ★
        </span>
      }
    </div>
  `,
  styles: [`
    .stars span { cursor: pointer; font-size: 24px; color: #ccc; }
    .stars span.filled { color: gold; }
  `],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => StarRatingComponent),
    multi: true,
  }],
})
export class StarRatingComponent implements ControlValueAccessor {
  valeur = 0;
  private onChange: (val: number) => void = () => {};
  private onTouched: () => void = () => {};

  // Angular appelle cette methode pour ecrire une valeur dans le controle
  writeValue(val: number): void {
    this.valeur = val || 0;
  }

  // On enregistre le callback de changement
  registerOnChange(fn: (val: number) => void): void {
    this.onChange = fn;
  }

  // On enregistre le callback de touche
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setValeur(note: number): void {
    this.valeur = note;
    this.onChange(note);    // Notifie le formulaire
    this.onTouched();       // Marque comme touche
  }
}
```

```typescript
// Utilisation dans un formulaire reactif
@Component({
  selector: 'app-avis',
  imports: [ReactiveFormsModule, StarRatingComponent],
  template: `
    <form [formGroup]="form">
      <app-star-rating formControlName="note"></app-star-rating>
      <textarea formControlName="commentaire"></textarea>
    </form>
  `,
})
export class AvisComponent {
  form = inject(FormBuilder).group({
    note: [0, [Validators.required, Validators.min(1)]],
    commentaire: [''],
  });
}
```

### Pattern 5 : Soumission avec etats (loading, erreur, succes)

```typescript
@Component({
  selector: 'app-submit-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="soumettre()">
      <input formControlName="email" placeholder="Email">

      @switch (etatSoumission()) {
        @case ('idle') {
          <button type="submit" [disabled]="form.invalid">Envoyer</button>
        }
        @case ('loading') {
          <button disabled>Envoi en cours...</button>
        }
        @case ('success') {
          <p class="succes">Envoye avec succes !</p>
        }
        @case ('error') {
          <p class="erreur">Echec. <button (click)="soumettre()">Reessayer</button></p>
        }
      }
    </form>
  `,
})
export class SubmitFormComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  etatSoumission = signal<'idle' | 'loading' | 'success' | 'error'>('idle');

  soumettre(): void {
    if (this.form.invalid) return;

    this.etatSoumission.set('loading');

    this.http.post('/api/subscribe', this.form.value).pipe(
      catchError(() => {
        this.etatSoumission.set('error');
        return EMPTY;
      }),
    ).subscribe(() => {
      this.etatSoumission.set('success');
      this.form.reset();
    });
  }
}
```

### Pattern 6 : Auto-save avec debounce

```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, filter, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-auto-save',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <input formControlName="titre" placeholder="Titre">
      <textarea formControlName="contenu" rows="10" placeholder="Contenu..."></textarea>

      <small>
        @switch (etatSauvegarde()) {
          @case ('saving') { Sauvegarde en cours... }
          @case ('saved') { Sauvegarde automatique effectuee }
          @case ('error') { Erreur de sauvegarde }
          @default { }
        }
      </small>
    </form>
  `,
})
export class AutoSaveComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  form = this.fb.group({
    titre: [''],
    contenu: [''],
  });

  etatSauvegarde = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  constructor() {
    this.form.valueChanges.pipe(
      debounceTime(2000),             // Attend 2s d'inactivite
      filter(() => this.form.dirty),  // Seulement si modifie
      switchMap(valeurs => {
        this.etatSauvegarde.set('saving');
        return this.http.put('/api/brouillons/1', valeurs).pipe(
          catchError(() => {
            this.etatSauvegarde.set('error');
            return EMPTY;
          }),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe(() => {
      this.etatSauvegarde.set('saved');
      this.form.markAsPristine();     // Reinitialiser l'etat dirty
    });
  }
}
```

---

## Pratique

Creez un formulaire d'inscription en deux etapes :
- **Etape 1** : nom (requis), email (requis + format), mot de passe + confirmation (validation cross-field)
- **Etape 2** : adresse (rue, ville, code postal requis au format 5 chiffres)
- Navigation precedent/suivant, bouton submit a la derniere etape
- Bouton suivant desactive si l'etape courante est invalide

<details>
<summary>Solution</summary>

```typescript
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

function mdpIdentiques(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const mdp = group.get('motDePasse')?.value;
    const confirm = group.get('confirmMdp')?.value;
    return mdp === confirm ? null : { mdpDifferents: true };
  };
}

@Component({
  selector: 'app-inscription-wizard',
  imports: [ReactiveFormsModule],
  template: `
    <div class="steps">
      <span [class.active]="etape() === 0">1. Compte</span>
      <span [class.active]="etape() === 1">2. Adresse</span>
    </div>

    <form [formGroup]="form" (ngSubmit)="soumettre()">
      @if (etape() === 0) {
        <div formGroupName="compte">
          <input formControlName="nom" placeholder="Nom">
          <input formControlName="email" placeholder="Email" type="email">
          <input formControlName="motDePasse" placeholder="Mot de passe" type="password">
          <input formControlName="confirmMdp" placeholder="Confirmer" type="password">
          @if (form.get('compte')?.hasError('mdpDifferents')) {
            <p class="erreur">Les mots de passe ne correspondent pas.</p>
          }
        </div>
      }

      @if (etape() === 1) {
        <div formGroupName="adresse">
          <input formControlName="rue" placeholder="Rue">
          <input formControlName="ville" placeholder="Ville">
          <input formControlName="codePostal" placeholder="Code postal">
        </div>
      }

      <div class="actions">
        @if (etape() > 0) {
          <button type="button" (click)="etape.update(e => e - 1)">Precedent</button>
        }
        @if (etape() === 0) {
          <button type="button" (click)="etape.set(1)"
            [disabled]="form.get('compte')?.invalid">Suivant</button>
        }
        @if (etape() === 1) {
          <button type="submit" [disabled]="form.invalid">S'inscrire</button>
        }
      </div>
    </form>
  `,
  styles: [`.erreur { color: red; } .active { font-weight: bold; }`],
})
export class InscriptionWizardComponent {
  private fb = inject(FormBuilder);
  etape = signal(0);

  form = this.fb.group({
    compte: this.fb.group({
      nom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', [Validators.required, Validators.minLength(8)]],
      confirmMdp: ['', Validators.required],
    }, { validators: [mdpIdentiques()] }),
    adresse: this.fb.group({
      rue: ['', Validators.required],
      ville: ['', Validators.required],
      codePostal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
    }),
  });

  soumettre(): void {
    if (this.form.valid) {
      console.log('Inscription :', this.form.getRawValue());
    }
  }
}
```
</details>

---

## Resume

| Pattern | Cas d'usage | Elements cles |
|---------|------------|---------------|
| **Wizard multi-etapes** | Processus complexe (commande, onboarding) | `formGroupName` par etape, navigation par Signal |
| **Formulaire dynamique** | Config serveur, back-office generique | JSON config → `FormBuilder.group()` dynamique |
| **Validation cross-field** | Mots de passe, dates coherentes | Validateur sur le `FormGroup`, pas le `FormControl` |
| **ControlValueAccessor** | Composant custom (rating, color picker) | `writeValue`, `registerOnChange`, `registerOnTouched` |
| **Soumission avec etats** | UX professionnelle | Signal `idle/loading/success/error` |
| **Auto-save debounce** | Editeur de texte, brouillon | `valueChanges` + `debounceTime` + `switchMap` |

---

> **Prochain cours** : [Cours 32 — Angular Material : installation et theming](../08-angular-material/01-installation-theming.md)
