---
titre: Formulaires réactifs Angular — FormControl, FormGroup, FormBuilder, Validators
cours: 03-angular
notions: [ReactiveFormsModule, FormControl, FormGroup, FormBuilder, "inject(FormBuilder)", NonNullableFormBuilder, "Validators.required", "Validators.minLength", "Validators.email", "Validators.min", "Validators.pattern", ValidatorFn custom synchrone, formGroup et formControlName, ngSubmit, état valid touched dirty hasError, formulaire strictement typé nonNullable, value vs getRawValue, patchValue vs setValue, aperçu Signal Forms expérimental]
outcomes:
  - sait construire un formulaire réactif typé avec FormBuilder, FormGroup et FormControl
  - sait attacher des Validators built-in et un validateur synchrone personnalisé
  - sait binder le formulaire au template avec formGroup, formControlName et ngSubmit
  - sait afficher une erreur au bon moment via invalid, touched et hasError
  - sait obtenir un formulaire strictement typé non-nullable et lire ses valeurs avec value / getRawValue
  - situe Signal Forms comme une API expérimentale postérieure à la v19 sans la confondre avec le standard
prerequis: [modules 00-18 (signaux, control-flow, binding, services, inject, HttpClient)]
next: 20-formulaires-patterns
libs: [{ name: "@angular/forms", version: "19" }]
tribuzen: front-office TribuZen — formulaire de création de sortie famille (titre, date, lieu, budget max)
last-reviewed: 2026-07
---

# Formulaires réactifs Angular — `FormControl`, `FormGroup`, `FormBuilder`, `Validators`

> **Outcomes — tu sauras FAIRE :** construire un formulaire réactif typé avec `FormBuilder`, y attacher des `Validators`, le binder au template (`formGroup` / `formControlName`), afficher les erreurs au bon moment et lire les valeurs proprement.
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre **les formulaires réactifs de base** : `FormControl` / `FormGroup`, `FormBuilder`, les `Validators` built-in, un validateur **synchrone** simple, le binding template, l'affichage d'erreurs et le **typage strict non-nullable**. Il donne aussi un **aperçu honnête** de Signal Forms (expérimental). Ce qui est **explicitement reporté au module 20** : les listes dynamiques (`FormArray`), la **validation cross-field** (comparer deux champs), les **validateurs asynchrones** (`AsyncValidatorFn`), et `valueChanges` + RxJS. Les template-driven forms (`ngModel`) ne sont pas le sujet ici.

## 1. Cas concret d'abord

Nouvelle story TribuZen : l'utilisateur doit **créer une sortie famille**. Un formulaire avec un titre, une date, un lieu et un budget max, qu'on ne peut soumettre que s'il est valide.

Un collègue a commencé « à la main » avec des signaux, comme au module 02 :

```typescript
// sortie-form.component.ts — AVANT (validation cousue main)
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-sortie-form',
  template: `
    <input [value]="titre()" (input)="titre.set(cible($event))" />
    <input [value]="lieu()"  (input)="lieu.set(cible($event))" />
    <input type="number" [value]="budgetMax()" (input)="budgetMax.set(+cible($event))" />
    @if (erreurTitre()) { <p>{{ erreurTitre() }}</p> }
    <button [disabled]="!estValide()">Créer</button>
  `,
})
export class SortieFormComponent {
  titre = signal('');
  lieu = signal('');
  budgetMax = signal<number | null>(null);

  erreurTitre = computed(() =>
    this.titre().trim().length < 3 ? 'Titre trop court' : ''
  );
  estValide = computed(() => this.titre().trim().length >= 3 && this.budgetMax() !== null);

  cible(e: Event) { return (e.target as HTMLInputElement).value; }
}
```

Ça marche pour trois champs. Mais dès qu'on ajoute « touché / pas touché » (n'afficher l'erreur qu'après interaction), « réinitialiser », « pré-remplir en édition », « désactiver un champ », « erreurs multiples par champ »… on réécrit à la main tout ce qu'un système de formulaire fournit déjà. C'est exactement ce qu'Angular propose avec les **formulaires réactifs** : un objet formulaire qui **tient l'état de validation, l'état d'interaction (`touched`/`dirty`) et les valeurs**, pendant que le template ne fait que s'y brancher.

Ce module te donne ces briques : `FormControl`, `FormGroup`, `FormBuilder`, `Validators`.

---

## 2. Théorie complète, concise

### 2.1 `ReactiveFormsModule` — l'import qui active tout

Les directives de formulaire réactif (`formGroup`, `formControlName`) vivent dans `ReactiveFormsModule`. On l'ajoute dans le tableau `imports` du composant standalone.

```typescript
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-sortie-form',
  imports: [ReactiveFormsModule],   // ✅ pas FormsModule
  template: `...`,
})
export class SortieFormComponent {}
```

`FormsModule` (sans « Reactive ») sert aux formulaires **template-driven** (`ngModel`). Sur un même champ on ne mélange **jamais** `ngModel` et `formControlName`.

### 2.2 `FormControl` — un champ

Un `FormControl` représente **un seul champ** : sa valeur *et* son état (valide, touché, modifié). Le premier argument est la valeur initiale, le second (optionnel) la liste de validateurs.

```typescript
import { FormControl, Validators } from '@angular/forms';

const titre = new FormControl('', [Validators.required, Validators.minLength(3)]);

titre.value;      // '' — la valeur courante
titre.valid;      // false — 'required' n'est pas satisfait
titre.setValue('Pique-nique au parc');
titre.valid;      // true
```

### 2.3 `FormGroup` — un objet de champs

Un `FormGroup` regroupe plusieurs `FormControl` sous des clés. Sa `value` est l'objet reconstitué à partir des champs, et il est **valide seulement si tous ses champs le sont**.

```typescript
import { FormControl, FormGroup, Validators } from '@angular/forms';

const form = new FormGroup({
  titre: new FormControl('', Validators.required),
  lieu:  new FormControl('', Validators.required),
});

form.value;   // { titre: '', lieu: '' }
form.valid;   // false — les deux champs sont requis et vides
```

### 2.4 `FormBuilder` — le raccourci qu'on utilise en vrai

Écrire `new FormControl(...)` partout est verbeux. `FormBuilder` fournit une syntaxe compacte où chaque champ est un tableau `[valeurInitiale, validateurs]`. On l'obtient avec `inject()`.

```typescript
import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-sortie-form',
  imports: [ReactiveFormsModule],
  template: `...`,
})
export class SortieFormComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    titre:     ['', [Validators.required, Validators.minLength(3)]],
    lieu:      ['', Validators.required],
    budgetMax: [null as number | null, [Validators.required, Validators.min(0)]],
  });
}
```

`fb.group({...})` construit le `FormGroup`, `fb.control(...)` un `FormControl` isolé. C'est la forme dominante dans le code d'entreprise.

### 2.5 Les `Validators` built-in (synchrones)

Un validateur regarde la valeur d'un champ et renvoie soit `null` (valide), soit un objet d'erreur. Angular en fournit une série prête à l'emploi.

| Validator | Rôle | Clé d'erreur produite |
|-----------|------|-----------------------|
| `Validators.required` | champ non vide | `required` |
| `Validators.minLength(n)` | longueur ≥ n | `minlength` |
| `Validators.maxLength(n)` | longueur ≤ n | `maxlength` |
| `Validators.min(n)` | nombre ≥ n | `min` |
| `Validators.max(n)` | nombre ≤ n | `max` |
| `Validators.email` | format e-mail | `email` |
| `Validators.pattern(rx)` | regex satisfaite | `pattern` |

On en passe un seul, ou un tableau : `['', [Validators.required, Validators.minLength(3)]]`. La **clé d'erreur** (colonne de droite) est ce qu'on interrogera avec `hasError(...)` dans le template.

### 2.6 Un validateur synchrone personnalisé (`ValidatorFn`)

Quand aucun built-in ne convient, on écrit une fonction qui reçoit le control et renvoie `null` ou un objet d'erreur `{ maCle: true }`. Le type vérifié est `ValidatorFn = (control: AbstractControl) => ValidationErrors | null`.

```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Refuse un budget de 0 (une sortie coûte forcément quelque chose)
export function budgetNonNul(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valeur = control.value;
    if (valeur === null || valeur === '') return null;   // 'required' gère le vide
    return valeur > 0 ? null : { budgetNonNul: true };
  };
}

// Usage — au même endroit que les built-in
budgetMax: [null as number | null, [Validators.required, budgetNonNul()]],
```

> Un validateur qui compare **deux champs** (cross-field) ou qui appelle **le serveur** (asynchrone) relève du **module 20** — ici, un validateur mono-champ synchrone suffit.

### 2.7 Binder le formulaire au template

Trois directives font le pont composant → template :

- `[formGroup]="form"` sur la balise `<form>` : relie l'objet formulaire.
- `formControlName="titre"` sur chaque `<input>` : relie le champ à la clé du groupe.
- `(ngSubmit)="creer()"` sur le `<form>` : intercepte la soumission (au lieu de `(submit)`).

```typescript
template: `
  <form [formGroup]="form" (ngSubmit)="creer()">
    <input formControlName="titre" placeholder="Titre" />
    <input formControlName="lieu" placeholder="Lieu" />
    <input formControlName="budgetMax" type="number" placeholder="Budget max" />

    <button type="submit" [disabled]="form.invalid">Créer la sortie</button>
  </form>
`,
```

`formControlName` prend une **chaîne** (le nom de la clé), pas le control lui-même. Le bouton se désactive tant que `form.invalid`.

### 2.8 État d'un champ : afficher l'erreur au bon moment

Chaque control expose des drapeaux : `valid` / `invalid`, `touched` (l'utilisateur a quitté le champ, événement blur), `dirty` (l'utilisateur a modifié la valeur), et `hasError('cle')` pour une erreur précise. On accède à un champ par `form.get('titre')`.

Le bon réflexe UX : n'afficher une erreur **qu'après interaction**, c'est-à-dire `invalid && touched`.

```typescript
template: `
  <input formControlName="titre" />
  @if (form.get('titre')?.invalid && form.get('titre')?.touched) {
    @if (form.get('titre')?.hasError('required')) {
      <p class="erreur">Le titre est obligatoire.</p>
    }
    @if (form.get('titre')?.hasError('minlength')) {
      <p class="erreur">Au moins 3 caractères.</p>
    }
  }
`,
```

`form.get('titre')` renvoie `AbstractControl | null` d'où le `?.` — un petit helper (`champ('titre')`) évite de répéter le chemin (voir Worked example 1).

### 2.9 Formulaire strictement typé et non-nullable

Par défaut, `FormBuilder` produit des champs **nullable** : `this.fb.control('')` a le type `FormControl<string | null>` (un `reset()` remet à `null`). Pour un typage strict sans `null`, on utilise **`this.fb.nonNullable.group(...)`** (le builder `NonNullableFormBuilder`) : chaque champ devient non-nullable et `reset()` revient à la **valeur initiale** au lieu de `null`.

```typescript
private fb = inject(FormBuilder);

form = this.fb.nonNullable.group({
  titre:     ['', [Validators.required, Validators.minLength(3)]],  // FormControl<string>
  lieu:      ['', Validators.required],                              // FormControl<string>
  budgetMax: [0,  [Validators.required, Validators.min(1)]],         // FormControl<number>
});
```

Deux façons de lire les valeurs :

- **`form.value`** : type `Partial` — **exclut les champs désactivés** (`disable()`), donc chaque clé est potentiellement absente.
- **`form.getRawValue()`** : **toutes** les valeurs, y compris les champs désactivés, avec le type complet. C'est celui à utiliser à la soumission quand on veut l'objet entier.

```typescript
creer(): void {
  if (this.form.invalid) {
    this.form.markAllAsTouched();   // force l'affichage des erreurs
    return;
  }
  const sortie = this.form.getRawValue();
  // { titre: string; lieu: string; budgetMax: number } — pas de | null grâce à nonNullable
}
```

### 2.10 Écrire dans le formulaire : `patchValue`, `setValue`, `reset`

- `form.patchValue({ titre: 'X' })` : met à jour **une partie** des champs (les autres restent). Idéal pour pré-remplir en édition.
- `form.setValue({ titre, lieu, budgetMax })` : met à jour **tous** les champs — il faut fournir **chaque** clé, sinon erreur `NG01002`.
- `form.reset()` : réinitialise (à la valeur initiale si `nonNullable`, sinon à `null`).
- `form.markAllAsTouched()` : marque tous les champs comme touchés, utile avant submit pour révéler les erreurs d'un formulaire jamais interagi.

### 2.11 Aperçu — Signal Forms (expérimental, **postérieur à la v19**)

Angular développe une nouvelle approche, **Signal Forms**, où le **modèle (un `signal`) est directement le formulaire** — plus de `FormGroup` séparé à synchroniser. L'API vit dans le sous-paquet `@angular/forms/signals` (`form()`, la directive `Control`, `validate()`, `required()`, `submit()`).

```typescript
// APERÇU — API EXPÉRIMENTALE, susceptible de changer. Ne PAS utiliser en production.
import { form, Control, required, minLength } from '@angular/forms/signals';
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-sortie-signal-form',
  imports: [Control],
  template: `
    <input [control]="f.titre" />
    <input [control]="f.lieu" />
  `,
})
export class SortieSignalFormComponent {
  // Le modèle EST la source de vérité
  model = signal({ titre: '', lieu: '' });

  // Le schéma déclare la validation directement sur les chemins du modèle
  f = form(this.model, (path) => {
    required(path.titre);
    minLength(path.titre, 3);
    required(path.lieu);
  });
}
```

**État réel à retenir (vérifié Context7, juillet 2026)** :

- Signal Forms est **expérimental / developer preview**, apparu **après Angular 19** (chantier de la v20+). En **Angular 19** ce n'est **pas** une API publique stable.
- La syntaxe **peut évoluer** — l'exemple ci-dessus est illustratif, pas un contrat.
- **En ESN, le standard 2026 reste les Reactive Forms** de ce module. Signal Forms = à connaître pour se situer, pas à livrer en prod.

> À revérifier via Context7 (`/angular/angular`) avant tout usage : le paquet `@angular/forms/signals` et la signature de `form()` bougent d'une preview à l'autre.

---

## 3. Worked examples

### Exemple 1 — `SortieFormComponent` réactif, typé de bout en bout (TribuZen)

On reprend le cas concret et on le construit proprement en réactif typé non-nullable.

```typescript
// sortie-form.component.ts — version formulaire réactif
import { Component, inject } from '@angular/core';
import {
  ReactiveFormsModule, FormBuilder, Validators,
  AbstractControl, ValidationErrors, ValidatorFn,
} from '@angular/forms';

// Validateur synchrone mono-champ : le budget doit être strictement positif
function budgetNonNul(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (v === null || v === '') return null;   // laisse 'required' gérer le vide
    return v > 0 ? null : { budgetNonNul: true };
  };
}

@Component({
  selector: 'app-sortie-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="creer()">
      <label>
        Titre
        <input formControlName="titre" />
      </label>
      <!-- erreurs affichées seulement après interaction (invalid && touched) -->
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

      <!-- désactivé tant que le formulaire n'est pas valide -->
      <button type="submit" [disabled]="form.invalid">Créer la sortie</button>
    </form>
  `,
  styles: [`.erreur { color: #dc2626; font-size: 0.85rem; }`],
})
export class SortieFormComponent {
  private fb = inject(FormBuilder);

  // nonNullable.group → champs non-nullables, reset() revient aux valeurs initiales
  form = this.fb.nonNullable.group({
    titre:     ['', [Validators.required, Validators.minLength(3)]],
    lieu:      ['', Validators.required],
    budgetMax: [null as number | null, [Validators.required, budgetNonNul()]],
  });

  // helper : évite de répéter form.get('x')?. et son type nullable dans le template
  champ(nom: string) {
    return this.form.get(nom)!;
  }

  creer(): void {
    // garde-fou : si invalide, on révèle les erreurs et on s'arrête
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // getRawValue() → objet complet et typé (inclurait les champs désactivés)
    const sortie = this.form.getRawValue();
    console.log('Sortie créée :', sortie);
    // { titre: string; lieu: string; budgetMax: number | null }

    this.form.reset();   // vide le formulaire pour une nouvelle saisie
  }
}
```

**Ce qui se passe à la soumission** : `(ngSubmit)` appelle `creer()`. Si un champ est invalide, `markAllAsTouched()` bascule tous les `touched` à `true` → les blocs `@if` d'erreur apparaissent même sur les champs jamais visités. Si tout est valide, `getRawValue()` donne l'objet typé prêt à envoyer à l'API (module 18), puis `reset()` remet les valeurs initiales.

### Exemple 2 — pré-remplir en mode édition avec `patchValue`

Éditer une sortie existante : on réutilise **le même formulaire**, pré-rempli depuis un objet chargé.

```typescript
interface Sortie {
  titre: string;
  lieu: string;
  budgetMax: number;
}

// Reçu du parent / de l'API — ici en dur pour l'exemple
prefill(sortie: Sortie): void {
  // patchValue : met à jour les clés fournies, tolère un objet partiel
  this.form.patchValue({
    titre: sortie.titre,
    lieu: sortie.lieu,
    budgetMax: sortie.budgetMax,
  });
}
```

Pourquoi `patchValue` et pas `setValue` ici ? `setValue` **exige toutes les clés** du groupe : si `Sortie` gagne demain un champ optionnel absent du formulaire, `setValue` lèverait `NG01002`. `patchValue` met à jour ce qu'on lui donne et ignore le reste — plus robuste pour du pré-remplissage.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Importer `FormsModule` au lieu de `ReactiveFormsModule`

```typescript
// ❌ FormsModule → 'formGroup'/'formControlName' inconnus, erreur de template
imports: [FormsModule],

// ✅ Les directives réactives sont dans ReactiveFormsModule
imports: [ReactiveFormsModule],
```

`FormsModule` = template-driven (`ngModel`). `ReactiveFormsModule` = `formGroup` / `formControlName`. Sur un même champ, ne jamais combiner `ngModel` et `formControlName`.

### PIÈGE #2 — Champs `| null` non désirés (oubli de `nonNullable`)

```typescript
// ❌ FormControl<string | null> — getRawValue() renvoie du string | null
form = this.fb.group({ titre: ['', Validators.required] });

// ✅ FormControl<string> — plus de | null à gérer, reset() revient à ''
form = this.fb.nonNullable.group({ titre: ['', Validators.required] });
```

Par défaut un control est nullable et `reset()` le remet à `null`. `nonNullable.group` (ou `{ nonNullable: true }` sur un `FormControl`) donne un typage strict et un `reset()` qui revient à la valeur initiale.

### PIÈGE #3 — `setValue` avec un objet partiel

```typescript
const form = this.fb.group({ titre: [''], lieu: [''] });

// ❌ 'lieu' manquant → NG01002 (setValue exige TOUTES les clés)
form.setValue({ titre: 'Parc' });

// ✅ patchValue tolère le partiel
form.patchValue({ titre: 'Parc' });
```

`setValue` = remplacement complet et strict ; `patchValue` = mise à jour partielle tolérante.

### PIÈGE #4 — Afficher l'erreur sans condition `touched`

```typescript
// ❌ l'erreur 'required' s'affiche dès le chargement, avant toute saisie
@if (champ('titre').hasError('required')) { <p>Requis</p> }

// ✅ on attend l'interaction : invalid ET touched
@if (champ('titre').invalid && champ('titre').touched) {
  @if (champ('titre').hasError('required')) { <p>Requis</p> }
}
```

Un formulaire vierge est invalide par nature ; noyer l'utilisateur d'erreurs avant qu'il ait tapé quoi que ce soit est une mauvaise UX. `touched` (après blur) — ou `dirty` (après frappe) — conditionne l'affichage. Avant submit, `markAllAsTouched()` révèle tout d'un coup.

### PIÈGE #5 — `formControlName` avec le control au lieu de son nom

```typescript
// ❌ formControlName attend une CHAÎNE (le nom de la clé), pas l'objet control
<input [formControlName]="form.controls.titre" />

// ✅ le nom de la clé, en attribut statique
<input formControlName="titre" />
```

`formControlName="titre"` référence la clé `titre` du `formGroup` parent. Passer l'objet control est l'erreur `[formControl]` (autre directive, sans groupe parent) — à ne pas confondre.

### PIÈGE #6 — Croire que Signal Forms est déjà le standard en v19

Signal Forms (`@angular/forms/signals`) est **expérimental** et **postérieur à la v19**. Écrire un `computed()` d'erreurs à la main (comme dans le cas concret §1) *illustre l'idée* de Signal Forms, mais ce n'est ni l'API officielle ni le standard de production. En 2026, un livrable ESN utilise les **Reactive Forms** de ce module.

---

## 5. Ancrage TribuZen

Les formulaires réactifs sont la **couche de saisie validée** de TribuZen. Dès qu'un écran collecte des données à envoyer à l'API, c'est un `FormGroup` typé non-nullable.

**`SortieFormComponent`** (Worked example 1) — le formulaire de **création de sortie famille** : `titre`, `lieu`, `budgetMax`, avec `Validators` built-in + un validateur synchrone `budgetNonNul()`, erreurs affichées sur `invalid && touched`, submit gardé par `form.invalid` et `markAllAsTouched()`. C'est le premier vrai formulaire d'écriture du produit.

Le même composant sert en **édition** via `patchValue` (Worked example 2), pré-rempli depuis la sortie chargée. L'envoi effectif de `getRawValue()` vers le back (`POST /sorties`) se branche sur le `HttpClient` du **module 18**.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      sorties/
        sortie-form.component.ts     ← Worked example 1 (create) + 2 (edit via patchValue)
        validators/
          budget-non-nul.ts          ← ValidatorFn synchrone réutilisable
```

> La **validation cross-field** (ex. date de fin après date de début), les **listes dynamiques** de participants (`FormArray`) et les **validateurs asynchrones** (titre déjà pris côté serveur) sont le **module 20**. Ici on reste sur un formulaire à champs fixes, validation synchrone.

---

## 6. Points clés

1. `ReactiveFormsModule` (pas `FormsModule`) active `formGroup` / `formControlName` ; on ne mélange jamais `ngModel` et `formControlName` sur un champ.
2. `FormControl` = un champ (valeur + état) ; `FormGroup` = un objet de champs, valide seulement si tous ses champs le sont.
3. `inject(FormBuilder)` + `fb.group({ cle: [valeur, validateurs] })` est la forme compacte standard.
4. Les `Validators` built-in (`required`, `minLength`, `min`, `email`, `pattern`…) produisent des **clés d'erreur** qu'on interroge avec `hasError('cle')`.
5. Un validateur synchrone perso est une `ValidatorFn` renvoyant `null` (valide) ou `{ cle: true }` (invalide) ; cross-field et async = module 20.
6. On affiche une erreur sur `invalid && touched`, et on force l'affichage avant submit avec `markAllAsTouched()`.
7. `fb.nonNullable.group(...)` donne des champs non-nullables et un `reset()` qui revient à la valeur initiale ; `getRawValue()` lit l'objet complet typé, `value` exclut les champs désactivés.
8. `patchValue` = mise à jour partielle tolérante ; `setValue` exige **toutes** les clés (sinon `NG01002`).
9. Signal Forms (`@angular/forms/signals`) est **expérimental et postérieur à la v19** — à connaître, pas à livrer ; standard ESN 2026 = Reactive Forms.

---

## 7. Seeds Anki

```
Quel module importer pour un formulaire réactif Angular ?|ReactiveFormsModule de @angular/forms (dans imports du composant standalone). FormsModule, lui, sert au template-driven (ngModel) — à ne pas confondre.
Différence entre FormControl et FormGroup ?|FormControl représente un seul champ (valeur + état valid/touched/dirty). FormGroup regroupe plusieurs FormControl par clé ; il n'est valide que si tous ses champs le sont.
Que produit fb.group({ titre: ['', [Validators.required, Validators.minLength(3)]] }) ?|Un FormGroup avec un champ 'titre' initialisé à '' et validé par required + minLength(3). Forme compacte du FormBuilder : [valeurInitiale, validateurs].
À quoi sert fb.nonNullable.group(...) ?|Il crée des FormControl non-nullables (type sans | null) et fait que reset() revient à la valeur initiale au lieu de null. Sans lui, les champs sont FormControl<T | null>.
Différence entre form.value et form.getRawValue() ?|value exclut les champs désactivés (type Partial). getRawValue() renvoie TOUTES les valeurs, y compris les champs disabled, avec le type complet — à utiliser à la soumission.
patchValue vs setValue sur un FormGroup ?|patchValue met à jour un sous-ensemble de champs (tolère un objet partiel). setValue exige une valeur pour CHAQUE champ du groupe, sinon erreur NG01002.
Comment n'afficher une erreur de champ qu'après interaction ?|Conditionner l'affichage à champ.invalid && champ.touched (touched = après blur), puis cibler l'erreur précise avec hasError('cle'). Avant submit, markAllAsTouched() révèle tout.
Comment écrire un validateur synchrone personnalisé ?|Une fonction qui renvoie une ValidatorFn : (control: AbstractControl) => ValidationErrors | null. Renvoyer null si valide, { maCle: true } si invalide. On l'ajoute dans le tableau de validateurs du champ.
Quel est l'état de Signal Forms en Angular 19 ?|Expérimental / developer preview, apparu APRÈS la v19 (@angular/forms/signals). Ce n'est pas l'API stable ni le standard de prod — en ESN 2026, on livre en Reactive Forms.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-19-formulaires-reactifs-et-signal-forms/README.md`. Construire le formulaire de création de sortie TribuZen en réactif typé (FormBuilder + Validators + validateur perso), dev server Angular comme oracle visuel — zéro gap-fill, corrigé commenté intégral.
