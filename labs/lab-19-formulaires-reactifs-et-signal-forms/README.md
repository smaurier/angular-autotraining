# Lab 19 — Formulaires réactifs et Signal Forms

> **Outcome :** à la fin, tu sais construire un formulaire réactif Angular **typé non-nullable** (`FormBuilder` + `Validators` + un validateur synchrone perso), afficher les erreurs au bon moment (`invalid && touched`) et lire les valeurs à la soumission (`getRawValue`).
> **Vrai outil :** Angular 19 + Angular CLI (`ng serve`, dev server visible en direct dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis `SortieFormComponent`, le formulaire de **création de sortie famille** de TribuZen. Cahier des charges **exact** :

1. Quatre champs : `titre` (texte), `lieu` (texte), `budgetMax` (nombre), `date` (texte au format `AAAA-MM-JJ`, input `type="date"`).
2. Validations :
   - `titre` : requis, au moins 3 caractères.
   - `lieu` : requis.
   - `budgetMax` : requis **et** strictement positif — via un **validateur synchrone perso** `budgetNonNul()` (pas seulement `Validators.min`, écris la `ValidatorFn` toi-même).
   - `date` : requise.
3. Le formulaire est **strictement typé non-nullable** (`fb.nonNullable.group`).
4. Chaque erreur ne s'affiche **qu'après interaction** (`invalid && touched`), avec un message distinct par type d'erreur pour `titre` et `budgetMax`.
5. Le bouton **Créer** est désactivé tant que `form.invalid`.
6. À la soumission : si invalide → `markAllAsTouched()` et on s'arrête ; si valide → `console.log(getRawValue())` puis `reset()`.

**Pas de gap-fill** — tu écris le composant complet à partir du starter minimal. Aucune validation cross-field, aucun `FormArray`, aucun validateur asynchrone (c'est le module 20).

### Mise en place du vrai outil

```bash
# Crée un projet Angular jetable pour le lab (standalone par défaut en v19)
npm create @angular@19 -- lab19-sortie-form --style=css --ssr=false
cd lab19-sortie-form
ng serve
```

Crée `src/app/sortie-form.component.ts`, branche-le dans `App` (`imports: [SortieFormComponent]` + `<app-sortie-form />` dans le template racine), et regarde le résultat en direct sur `http://localhost:4200`.

### Starter minimal

```typescript
// src/app/sortie-form.component.ts — starter
import { Component, inject } from '@angular/core';
import {
  ReactiveFormsModule, FormBuilder, Validators,
  AbstractControl, ValidationErrors, ValidatorFn,
} from '@angular/forms';

// À écrire : validateur synchrone qui refuse un budget <= 0
// export function budgetNonNul(): ValidatorFn { ... }

@Component({
  selector: 'app-sortie-form',
  imports: [ReactiveFormsModule],
  template: `
    <!-- À construire : <form [formGroup] (ngSubmit)>, 4 champs formControlName,
         blocs @if d'erreurs (invalid && touched), bouton [disabled]="form.invalid" -->
  `,
  styles: [`.erreur { color: #dc2626; font-size: 0.85rem; }`],
})
export class SortieFormComponent {
  private fb = inject(FormBuilder);

  // À écrire : this.fb.nonNullable.group({ titre, lieu, budgetMax, date })
  // À écrire : helper champ(nom), méthode creer()
}
```

---

## Étapes (en friction)

1. **Écris `budgetNonNul()`** — une `ValidatorFn` : renvoie `null` si la valeur est vide (laisse `required` gérer) ou strictement positive, sinon `{ budgetNonNul: true }`.
2. **Déclare le formulaire** avec `this.fb.nonNullable.group({...})` : les 4 champs, chacun avec ses validateurs. Pour `budgetMax`, initialise à `null as number | null` et combine `Validators.required` + `budgetNonNul()`.
3. **Ajoute le helper** `champ(nom: string) { return this.form.get(nom)!; }` pour alléger le template.
4. **Écris le template** : `<form [formGroup]="form" (ngSubmit)="creer()">`, un `<input formControlName="...">` par champ (`type="number"` pour le budget, `type="date"` pour la date).
5. **Ajoute les blocs d'erreur** sous chaque champ, conditionnés par `champ('x').invalid && champ('x').touched`, avec un `@if hasError(...)` par message pour `titre` (`required`, `minlength`) et `budgetMax` (`required`, `budgetNonNul`).
6. **Ajoute le bouton** `type="submit"` avec `[disabled]="form.invalid"`.
7. **Écris `creer()`** : si `form.invalid` → `markAllAsTouched()` + `return` ; sinon `console.log(this.form.getRawValue())` puis `this.form.reset()`.
8. **Vérifie les cas limites** : soumettre un formulaire vierge (toutes les erreurs apparaissent d'un coup) ; saisir un budget `0` (erreur `budgetNonNul`, pas `required`) ; remplir tout correctement (bouton actif, log de l'objet typé, formulaire vidé).

---

## Corrigé complet commenté

```typescript
// src/app/sortie-form.component.ts — corrigé
import { Component, inject } from '@angular/core';
import {
  ReactiveFormsModule, FormBuilder, Validators,
  AbstractControl, ValidationErrors, ValidatorFn,
} from '@angular/forms';

// Validateur synchrone mono-champ : budget strictement positif.
// ValidatorFn = (control) => ValidationErrors | null
export function budgetNonNul(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    // vide : on laisse 'required' produire l'erreur, pas ce validateur
    if (v === null || v === '') return null;
    // valide → null ; invalide → objet dont la clé 'budgetNonNul' sert au hasError()
    return v > 0 ? null : { budgetNonNul: true };
  };
}

@Component({
  selector: 'app-sortie-form',
  imports: [ReactiveFormsModule],   // ✅ pas FormsModule
  template: `
    <form [formGroup]="form" (ngSubmit)="creer()">
      <label>
        Titre
        <input formControlName="titre" />
      </label>
      <!-- erreurs uniquement après interaction : invalid && touched -->
      @if (champ('titre').invalid && champ('titre').touched) {
        @if (champ('titre').hasError('required')) {
          <p class="erreur">Le titre est obligatoire.</p>
        }
        @if (champ('titre').hasError('minlength')) {
          <p class="erreur">Au moins 3 caractères.</p>
        }
      }

      <label>
        Lieu
        <input formControlName="lieu" />
      </label>
      @if (champ('lieu').invalid && champ('lieu').touched) {
        <p class="erreur">Le lieu est obligatoire.</p>
      }

      <label>
        Budget max (EUR)
        <input formControlName="budgetMax" type="number" />
      </label>
      @if (champ('budgetMax').invalid && champ('budgetMax').touched) {
        @if (champ('budgetMax').hasError('required')) {
          <p class="erreur">Indique un budget.</p>
        }
        @if (champ('budgetMax').hasError('budgetNonNul')) {
          <p class="erreur">Le budget doit être supérieur à 0.</p>
        }
      }

      <label>
        Date
        <input formControlName="date" type="date" />
      </label>
      @if (champ('date').invalid && champ('date').touched) {
        <p class="erreur">La date est obligatoire.</p>
      }

      <!-- désactivé tant que le formulaire est invalide -->
      <button type="submit" [disabled]="form.invalid">Créer la sortie</button>
    </form>
  `,
  styles: [`.erreur { color: #dc2626; font-size: 0.85rem; }`],
})
export class SortieFormComponent {
  private fb = inject(FormBuilder);

  // nonNullable.group → titre/lieu/date en FormControl<string>, budgetMax typé sans surprise ;
  // reset() reviendra aux valeurs initiales (pas à null).
  form = this.fb.nonNullable.group({
    titre:     ['', [Validators.required, Validators.minLength(3)]],
    lieu:      ['', Validators.required],
    budgetMax: [null as number | null, [Validators.required, budgetNonNul()]],
    date:      ['', Validators.required],
  });

  // helper : form.get() renvoie AbstractControl | null → le '!' évite le ?. partout
  champ(nom: string) {
    return this.form.get(nom)!;
  }

  creer(): void {
    // formulaire jamais touché mais soumis (Entrée) : on révèle toutes les erreurs
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // getRawValue() : objet complet typé, prêt pour un POST /sorties (module 18)
    const sortie = this.form.getRawValue();
    console.log('Sortie créée :', sortie);

    this.form.reset();   // vide pour une nouvelle saisie (valeurs initiales)
  }
}
```

**Pourquoi ce corrigé est correct :**
- `budgetNonNul()` renvoie `null` sur valeur vide → il n'écrase pas le message `required`, les deux erreurs restent distinctes (piège classique de validateur qui double `required`).
- Les blocs d'erreur sont gardés par `invalid && touched` : le formulaire vierge ne crache pas d'erreurs au chargement ; `markAllAsTouched()` dans `creer()` les révèle en cas de submit prématuré.
- `fb.nonNullable.group` garantit que `getRawValue()` ne renvoie pas de `| null` parasites sur les champs texte, et que `reset()` revient à `''` plutôt qu'à `null`.
- Le bouton `[disabled]="form.invalid"` empêche la soumission côté UI, mais `creer()` re-vérifie `form.invalid` : la validation ne repose jamais sur le seul état du bouton.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées, sans rouvrir ce corrigé ni le module 19, en 25 minutes :**

1. Ajoute un champ `nbParticipants` (nombre) : requis, entre **1 et 20** (`Validators.min(1)` + `Validators.max(20)`), avec deux messages d'erreur distincts (`min`, `max`).
2. Ajoute un bouton **Réinitialiser** (`type="button"`, `(click)="form.reset()"`) séparé du submit.
3. Affiche en direct, sous le formulaire, l'état courant : <code v-pre>Formulaire {{ '{{' }} form.valid ? 'valide' : 'invalide' {{ '}}' }}</code> — pour observer le passage valide/invalide pendant la saisie.

**Critère de réussite :** le formulaire fonctionne dans le navigateur, `nbParticipants = 0` déclenche l'erreur `min`, `= 25` déclenche `max`, et le bouton Réinitialiser vide les champs sans soumettre.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, le formulaire vit ici :

```
tribuzen/
  src/
    app/
      sorties/
        sortie-form.component.ts     ← ce lab (create)
        validators/
          budget-non-nul.ts          ← budgetNonNul() extrait en fichier réutilisable
```

**Différences par rapport au lab :**

- Le type `Sortie` sera importé de `src/app/sorties/sortie.model.ts` (partagé) au lieu d'être implicite.
- À la soumission, `getRawValue()` sera envoyé au back via le service `SortiesService` (`HttpClient`, module 18) — `POST /sorties` — au lieu d'un `console.log`.
- Le même composant gérera l'**édition** via `patchValue(sortieChargée)` sur un `@Input()` — la validation cross-field (date de fin après date de début) et les participants dynamiques (`FormArray`) arriveront au **module 20**.

**Commit cible :**
```
feat(sorties): SortieForm — formulaire réactif typé, Validators + budgetNonNul, erreurs touched
```
