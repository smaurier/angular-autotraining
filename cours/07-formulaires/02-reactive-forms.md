# Cours 29 — Reactive Forms

> **Objectif** : Maitriser les Reactive Forms, le systeme de formulaires le plus utilise en entreprise Angular. Comprendre `FormBuilder`, `FormGroup`, `FormControl`, `FormArray`, les validateurs synchrones et asynchrones, les formulaires types, et `valueChanges`. C'est **LE** sujet d'entretien Angular — a maitriser absolument.

---

## Rappel du cours precedent

<details>
<summary>1. Quel module faut-il importer pour utiliser ngModel ?</summary>

`FormsModule` de `@angular/forms`. A importer dans le tableau `imports` du composant standalone.
</details>

<details>
<summary>2. Pourquoi l'attribut `name` est-il obligatoire sur un input avec ngModel dans un form ?</summary>

Angular utilise l'attribut `name` pour enregistrer le champ dans le formulaire interne (`NgForm`). Sans `name`, Angular ne peut pas tracker le champ et leve une erreur.
</details>

<details>
<summary>3. Comment afficher une erreur de validation seulement apres que l'utilisateur a interagi avec le champ ?</summary>

En testant `monChamp.invalid && monChamp.touched` (ou `monChamp.dirty`). `touched` est vrai apres un blur, `dirty` est vrai apres une modification.
</details>

---

## Analogie

Si les formulaires template-driven sont un **formulaire papier pre-imprime**, les Reactive Forms sont un **tableur Excel** :

- Chaque **cellule** est un `FormControl` (un champ)
- Un **groupe de cellules** est un `FormGroup` (un objet)
- Une **colonne extensible** est un `FormArray` (une liste dynamique)
- Les **formules** sont les validateurs (regles calculees automatiquement)
- Tout est **programmable** : ajouter des lignes, changer les formules, lire les valeurs a tout moment

C'est plus puissant qu'un formulaire papier, mais demande plus de configuration.

---

## Theorie

### Configuration : ReactiveFormsModule

```typescript
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-inscription',
  imports: [ReactiveFormsModule],  // ✅ Pas FormsModule !
  template: `<!-- ... -->`,
})
export class InscriptionComponent {}
```

> **Ne jamais melanger** `FormsModule` et `ReactiveFormsModule` sur le meme champ (pas de `ngModel` + `formControl` ensemble).

### FormBuilder, FormGroup, FormControl

```typescript
import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-inscription',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="soumettre()">
      <div>
        <label>Nom :</label>
        <input formControlName="nom">
        @if (form.get('nom')?.invalid && form.get('nom')?.touched) {
          <span class="erreur">Nom requis (2-50 caracteres)</span>
        }
      </div>

      <div>
        <label>Email :</label>
        <input formControlName="email" type="email">
      </div>

      <div>
        <label>Age :</label>
        <input formControlName="age" type="number">
      </div>

      <button type="submit" [disabled]="form.invalid">Valider</button>
    </form>

    <pre>{{ form.value | json }}</pre>
  `,
})
export class InscriptionComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    nom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    age: [null as number | null, [Validators.required, Validators.min(18), Validators.max(120)]],
  });

  soumettre(): void {
    if (this.form.valid) {
      console.log(this.form.value);
      // { nom: 'Alice', email: 'alice@mail.com', age: 30 }
    }
  }
}
```

### Validateurs built-in

| Validateur | Usage | Exemple |
|-----------|-------|---------|
| `Validators.required` | Champ obligatoire | `['', Validators.required]` |
| `Validators.minLength(n)` | Longueur min | `['', Validators.minLength(3)]` |
| `Validators.maxLength(n)` | Longueur max | `['', Validators.maxLength(100)]` |
| `Validators.min(n)` | Valeur min (nombre) | `[0, Validators.min(0)]` |
| `Validators.max(n)` | Valeur max (nombre) | `[100, Validators.max(100)]` |
| `Validators.email` | Format email | `['', Validators.email]` |
| `Validators.pattern(regex)` | Regex | `['', Validators.pattern(/^[A-Z]/)]` |

### Validateur personnalise

```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Validateur simple : verifie qu'un mot de passe contient un chiffre
export function contientChiffre(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valeur = control.value;
    if (!valeur) return null; // Laisser `required` gerer le vide

    const aUnChiffre = /\d/.test(valeur);
    return aUnChiffre ? null : { contientChiffre: true };
  };
}

// Utilisation
form = this.fb.group({
  motDePasse: ['', [Validators.required, Validators.minLength(8), contientChiffre()]],
});
```

```html
@if (form.get('motDePasse')?.hasError('contientChiffre')) {
  <p class="erreur">Le mot de passe doit contenir au moins un chiffre.</p>
}
```

### Validateur asynchrone

Pour verifier cote serveur (ex : email deja pris) :

```typescript
import { AsyncValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

export function emailDisponible(http: HttpClient): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value) return of(null);

    return timer(500).pipe( // Debounce de 500ms
      switchMap(() =>
        http.get<{ disponible: boolean }>(`/api/check-email?email=${control.value}`)
      ),
      map(result => result.disponible ? null : { emailPris: true }),
      catchError(() => of(null)), // En cas d'erreur reseau, ne pas bloquer
    );
  };
}

// Utilisation : le 3eme argument de FormControl = async validators
form = this.fb.group({
  email: ['', [Validators.required, Validators.email], [emailDisponible(this.http)]],
});
```

```html
@if (form.get('email')?.pending) {
  <span>Verification en cours...</span>
}
@if (form.get('email')?.hasError('emailPris')) {
  <span class="erreur">Cet email est deja utilise.</span>
}
```

### valueChanges : reagir aux modifications

`valueChanges` retourne un **Observable** qui emet a chaque modification :

```typescript
ngOnInit() {
  // Ecouter un seul champ
  this.form.get('pays')?.valueChanges.subscribe(pays => {
    console.log('Pays change :', pays);
    // Adapter les validations selon le pays
    if (pays === 'FR') {
      this.form.get('codePostal')?.setValidators([
        Validators.required,
        Validators.pattern(/^\d{5}$/),
      ]);
    }
    this.form.get('codePostal')?.updateValueAndValidity();
  });

  // Ecouter le formulaire entier
  this.form.valueChanges.subscribe(valeurs => {
    console.log('Formulaire modifie :', valeurs);
  });
}
```

### FormArray : listes dynamiques

```typescript
@Component({
  selector: 'app-competences',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <h3>Competences</h3>
      <div formArrayName="competences">
        @for (ctrl of competences.controls; track ctrl; let i = $index) {
          <div>
            <input [formControlName]="i" placeholder="Competence {{ i + 1 }}">
            <button type="button" (click)="supprimerCompetence(i)">X</button>
          </div>
        }
      </div>
      <button type="button" (click)="ajouterCompetence()">+ Ajouter</button>
    </form>
  `,
})
export class CompetencesComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    competences: this.fb.array([
      this.fb.control('Angular', Validators.required),
      this.fb.control('TypeScript', Validators.required),
    ]),
  });

  get competences() {
    return this.form.get('competences') as FormArray;
  }

  ajouterCompetence(): void {
    this.competences.push(this.fb.control('', Validators.required));
  }

  supprimerCompetence(index: number): void {
    this.competences.removeAt(index);
  }
}
```

### Formulaires strictement types (Angular 14+)

```typescript
// ❌ Ancien : form.value est `any`
const form = new FormGroup({
  nom: new FormControl(''),
});
form.value; // Type: Partial<{ nom: string | null }>

// ✅ Moderne : formulaire strictement type
interface ProfileForm {
  nom: FormControl<string>;
  email: FormControl<string>;
  age: FormControl<number | null>;
  actif: FormControl<boolean>;
}

const form = new FormGroup<ProfileForm>({
  nom: new FormControl('', { nonNullable: true }),
  email: new FormControl('', { nonNullable: true }),
  age: new FormControl<number | null>(null),
  actif: new FormControl(true, { nonNullable: true }),
});

// form.value est maintenant type !
// { nom?: string; email?: string; age?: number | null; actif?: boolean }

// getRawValue() retourne toutes les valeurs (meme les disabled)
form.getRawValue();
// { nom: string; email: string; age: number | null; actif: boolean }
```

> **`nonNullable: true`** : le controle ne peut pas avoir la valeur `null`. Quand on appelle `reset()`, il revient a la valeur initiale au lieu de `null`.

### Methodes utiles de FormGroup

| Methode | Description |
|---------|------------|
| `form.value` | Valeurs actuelles (exclut les disabled) |
| `form.getRawValue()` | Toutes les valeurs (y compris disabled) |
| `form.valid` / `form.invalid` | Etat de validation |
| `form.get('champ')` | Acces a un controle specifique |
| `form.patchValue({...})` | Met a jour partiellement (pas tous les champs requis) |
| `form.setValue({...})` | Met a jour completement (tous les champs requis) |
| `form.reset()` | Reinitialise le formulaire |
| `form.markAllAsTouched()` | Marque tous les champs comme touches (utile avant submit) |
| `form.disable()` / `form.enable()` | Desactive/active le formulaire entier |

---

## Pratique

Creez un formulaire d'inscription avec Reactive Forms :
1. Champs : `nom`, `email`, `motDePasse`, `confirmMotDePasse`
2. Validations : nom requis (min 2), email requis + format, mot de passe requis (min 8 + contient un chiffre)
3. Validateur personnalise `contientChiffre()`
4. Affichage des erreurs apres interaction
5. Bouton desactive si invalide

<details>
<summary>Solution</summary>

```typescript
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

function contientChiffre(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    return /\d/.test(control.value) ? null : { contientChiffre: true };
  };
}

@Component({
  selector: 'app-inscription',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="soumettre()">
      <div>
        <label>Nom :</label>
        <input formControlName="nom">
        @if (champ('nom').invalid && champ('nom').touched) {
          @if (champ('nom').hasError('required')) {
            <p class="erreur">Nom obligatoire.</p>
          }
          @if (champ('nom').hasError('minlength')) {
            <p class="erreur">Minimum 2 caracteres.</p>
          }
        }
      </div>

      <div>
        <label>Email :</label>
        <input formControlName="email" type="email">
        @if (champ('email').invalid && champ('email').touched) {
          <p class="erreur">Email valide requis.</p>
        }
      </div>

      <div>
        <label>Mot de passe :</label>
        <input formControlName="motDePasse" type="password">
        @if (champ('motDePasse').invalid && champ('motDePasse').touched) {
          @if (champ('motDePasse').hasError('required')) {
            <p class="erreur">Mot de passe obligatoire.</p>
          }
          @if (champ('motDePasse').hasError('minlength')) {
            <p class="erreur">Minimum 8 caracteres.</p>
          }
          @if (champ('motDePasse').hasError('contientChiffre')) {
            <p class="erreur">Doit contenir au moins un chiffre.</p>
          }
        }
      </div>

      <button type="submit" [disabled]="form.invalid">S'inscrire</button>
    </form>
  `,
  styles: [`.erreur { color: red; font-size: 0.85em; }`],
})
export class InscriptionComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    motDePasse: ['', [Validators.required, Validators.minLength(8), contientChiffre()]],
  });

  champ(nom: string) {
    return this.form.get(nom)!;
  }

  soumettre(): void {
    if (this.form.valid) {
      console.log('Inscription :', this.form.getRawValue());
    } else {
      this.form.markAllAsTouched();
    }
  }
}
```
</details>

---

## Resume

| Point cle | A retenir |
|-----------|-----------|
| `ReactiveFormsModule` | A importer, ne pas melanger avec `FormsModule` sur le meme champ |
| `FormBuilder` | Raccourci pour creer `FormGroup`, `FormControl`, `FormArray` |
| `formControlName` | Lie un input a un controle dans le template |
| `Validators` | `required`, `email`, `minLength`, `min`, `pattern` |
| Validateur custom | Fonction qui retourne `null` (valide) ou `{ cle: true }` (invalide) |
| Async validator | 3eme argument, retourne `Observable<ValidationErrors | null>` |
| `valueChanges` | Observable qui emet a chaque modification |
| `FormArray` | Liste dynamique de controles (ajouter/supprimer) |
| Typed forms | `FormGroup<{...}>` + `nonNullable: true` |
| `getRawValue()` | Retourne toutes les valeurs, y compris les disabled |

---

> **Prochain cours** : [Cours 30 — Signal Forms](./03-signal-forms.md)
