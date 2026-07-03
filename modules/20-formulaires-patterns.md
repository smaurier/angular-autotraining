---
titre: Patterns de formulaires avancés — FormArray, validators custom/async, cross-field, ControlValueAccessor
cours: 03-angular
notions: ["FormArray dynamique (push/insert/removeAt/clear)", "ValidatorFn custom (factory)", "ValidationErrors", "AsyncValidator (Observable + updateOn blur)", "validation cross-field sur FormGroup", "ControlValueAccessor", "NG_VALUE_ACCESSOR", "writeValue/registerOnChange/registerOnTouched/setDisabledState", "template-driven en contraste"]
outcomes:
  - "sait construire un FormArray et y ajouter/retirer des sous-groupes dynamiquement avec push/removeAt/clear"
  - "sait écrire un validateur synchrone custom (factory ValidatorFn) qui retourne ValidationErrors ou null"
  - "sait écrire un validateur asynchrone (AsyncValidator) qui interroge une API et le brancher avec updateOn blur"
  - "sait poser une validation cross-field sur un FormGroup (mots de passe identiques, dates cohérentes)"
  - "sait rendre un composant utilisable comme un input de formulaire via ControlValueAccessor"
  - "sait dire quand un formulaire template-driven suffit et quand il ne suffit pas"
prerequis: [module 16 rxjs-observables-et-operators, module 18 http-crud-interceptors-cache, module 19 formulaires-reactifs-et-signal-forms]
next: 21-angular-material-et-cdk
libs: [{ name: "@angular/forms", version: "19" }]
tribuzen: front-office TribuZen — formulaire multi-participants dynamique de création de sortie (FormArray de participants, pseudo unique async, contrôle de tranche d'âge réutilisable)
last-reviewed: 2026-07
---

# Patterns de formulaires avancés — `FormArray`, validators custom/async, cross-field, `ControlValueAccessor`

> **Outcomes — tu sauras FAIRE :** gérer une liste de sous-formulaires avec `FormArray`, écrire tes propres validateurs synchrones et asynchrones, valider un `FormGroup` sur plusieurs champs à la fois, et transformer un composant en input de formulaire avec `ControlValueAccessor`.
> **Difficulté :** :star::star::star::star:
>
> **Portée :** ce module suppose les **reactive forms de base acquis** (module 19 : `FormControl`, `FormGroup`, `FormBuilder`, `Validators.*`, `[formGroup]`, `formControlName`). On ne réexplique donc **ni** le câblage `[formGroup]`/`formControlName`, **ni** les validateurs fournis (`Validators.required`, `email`, `pattern`). On ajoute **quatre patterns avancés** : `FormArray` dynamique, validateurs **custom** (sync + async), validation **cross-field**, et **`ControlValueAccessor`**. Le formulaire **template-driven** est traité **uniquement en contraste** (quand l'éviter). Aucun composant **Angular Material** ici — les champs Material et le CDK sont le **module 21**. Le state global (NgRx Signal Store) est le **module 24**.

## 1. Cas concret d'abord

Story TribuZen : l'écran **« Créer une sortie famille »**. L'organisateur saisit un titre, une date, puis **ajoute autant de participants qu'il veut** — chaque participant a un pseudo et un âge. Trois contraintes métier apparaissent tout de suite :

1. Le **nombre de participants n'est pas connu à l'avance** : l'organisateur clique « + Ajouter un participant » 2 fois ou 8 fois. Un `FormGroup` à champs fixes ne suffit plus.
2. Le **pseudo doit être unique côté serveur** (deux « Alice » interdites dans TribuZen) : il faut interroger l'API pendant la saisie, sans figer l'UI.
3. La **date de fin doit être après la date de début** : une règle qui porte sur **deux champs à la fois**, pas sur un seul.

Un collègue a commencé avec un `FormGroup` classique et bloque :

```typescript
// creer-sortie.component.ts — AVANT (structure figée, ne monte pas en charge)
form = this.fb.group({
  titre: ['', Validators.required],
  debut: ['', Validators.required],
  fin: ['', Validators.required],
  // ❌ Comment mettre une LISTE de participants de taille variable ici ?
  // ❌ Comment vérifier que le pseudo n'existe pas déjà côté serveur ?
  // ❌ Comment dire "fin > debut" ? Ça ne tient sur aucun champ isolé.
});
```

Les trois blocages correspondent exactement aux trois premiers patterns de ce module : **`FormArray`** pour la liste, **`AsyncValidator`** pour le pseudo unique, **validation cross-field** pour `fin > debut`. Le quatrième pattern — **`ControlValueAccessor`** — arrive quand on voudra remplacer le `<select>` d'âge par un composant maison réutilisable, tout en le gardant pilotable par le formulaire.

---

## 2. Théorie complète, concise

### 2.1 `FormArray` — une liste de contrôles de taille variable

Un `FormArray` est un contrôle qui agrège une **liste ordonnée** d'`AbstractControl` (des `FormControl`, `FormGroup`, ou même d'autres `FormArray`). Contrairement au `FormGroup` (clés nommées, structure figée), le `FormArray` gère un **nombre variable** d'éléments — parfait pour « N participants ».

On le crée via `FormBuilder.array([...])`, souvent vide au départ :

```typescript
import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

export class CreerSortieComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    titre: ['', Validators.required],
    // participants démarre VIDE — l'utilisateur remplit à la demande
    participants: this.fb.array([]),
  });
}
```

**Modifier le contenu passe OBLIGATOIREMENT par les méthodes du `FormArray`** — jamais en mutant le tableau interne, sinon la détection de changement casse (source Context7 / angular.dev, `FormArray`) :

| Méthode | Effet |
|---------|-------|
| `push(control)` | ajoute un contrôle **à la fin** |
| `insert(index, control)` | insère à une position donnée |
| `removeAt(index)` | retire le contrôle à cet index |
| `clear()` | vide tout le tableau |
| `at(index)` | lit le contrôle à cet index |
| `.length` | nombre d'éléments courant |
| `.controls` | le tableau des contrôles (pour `@for` dans le template) |

```typescript
// Un participant = un petit FormGroup. On factorise sa création.
private creerParticipant() {
  return this.fb.group({
    pseudo: ['', Validators.required],
    age: [null, [Validators.required, Validators.min(0)]],
  });
}

// Accès typé au FormArray (getter pratique, réutilisé dans le template)
get participants(): FormArray {
  return this.form.get('participants') as FormArray;
}

ajouterParticipant(): void {
  this.participants.push(this.creerParticipant());   // ✅ méthode dédiée
}

retirerParticipant(i: number): void {
  this.participants.removeAt(i);                     // ✅ pas de splice() maison
}
```

Côté template, on itère sur `participants.controls` et on **relie chaque groupe par son index** avec `[formGroupName]` (l'index, pas une clé), le tout dans un conteneur `formArrayName` :

```html
<div formArrayName="participants">
  @for (groupe of participants.controls; track groupe; let i = $index) {
    <div [formGroupName]="i">
      <input formControlName="pseudo" placeholder="Pseudo" />
      <input formControlName="age" type="number" placeholder="Âge" />
      <button type="button" (click)="retirerParticipant(i)">Retirer</button>
    </div>
  }
</div>
<button type="button" (click)="ajouterParticipant()">+ Ajouter un participant</button>
```

> `track groupe` suit l'instance du contrôle : après un `removeAt`, Angular ne recrée pas les lignes restantes. Voir le control-flow `@for`/`track` au module 03.

### 2.2 Validateur synchrone custom — une **factory** qui renvoie une `ValidatorFn`

Quand `Validators.*` ne suffit pas, on écrit sa propre fonction. Un validateur synchrone est une **`ValidatorFn`** : une fonction qui reçoit le contrôle et renvoie soit `null` (valide), soit un objet **`ValidationErrors`** (invalide). Le pattern idiomatique est une **factory** — une fonction qui **retourne** la `ValidatorFn`, pour la paramétrer :

```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Factory : prend un paramètre (la regex interdite) et RETOURNE une ValidatorFn.
// Signature vérifiée sur angular.dev (forbiddenNameValidator).
export function pseudoInterditValidator(motsRe: RegExp): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const interdit = motsRe.test(control.value);
    // clé libre ('pseudoInterdit') → devient control.errors['pseudoInterdit']
    return interdit ? { pseudoInterdit: { value: control.value } } : null;
  };
}
```

Usage — comme n'importe quel validateur fourni, dans le tableau du contrôle :

```typescript
pseudo: ['', [Validators.required, pseudoInterditValidator(/admin|root/i)]],
```

Trois règles à retenir :

- **`null` = valide**, un objet = invalide. C'est contre-intuitif : renvoyer un objet signale une **erreur**.
- La **clé** de l'objet (`pseudoInterdit`) est le nom sous lequel l'erreur apparaît dans `control.errors` et `control.hasError('pseudoInterdit')`.
- La **valeur** associée peut être n'importe quoi d'utile pour le message (`{ value: ... }`, `{ min: 18, actual: 12 }`).

### 2.3 Validation cross-field — un validateur posé sur le **`FormGroup`**

Certaines règles portent sur **plusieurs champs** : « fin après début », « mot de passe = confirmation ». Un validateur de contrôle isolé ne les voit pas. On pose alors la `ValidatorFn` **sur le `FormGroup`** (2ᵉ argument, dans les options), et on lit les enfants avec `control.get(...)` :

```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Le contrôle reçu ICI est le FormGroup entier.
export const finApresDebutValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const debut = group.get('debut')?.value;
  const fin = group.get('fin')?.value;
  if (!debut || !fin) return null;                 // ne juge pas tant que c'est incomplet
  return fin > debut ? null : { finAvantDebut: true };
};
```

On l'attache dans les **options** du groupe (clé `validators`) :

```typescript
form = this.fb.group(
  {
    titre: ['', Validators.required],
    debut: ['', Validators.required],
    fin: ['', Validators.required],
  },
  { validators: [finApresDebutValidator] },        // ← validateur de GROUPE
);
```

Et l'erreur se lit **sur le groupe**, pas sur un champ :

```html
@if (form.hasError('finAvantDebut')) {
  <p class="erreur">La date de fin doit être après la date de début.</p>
}
```

> Point clé : l'erreur cross-field vit sur le **groupe** (`form.errors`), donc `form.get('fin')` reste `valid`. Pour afficher l'erreur près du champ « fin », on teste `form.hasError('finAvantDebit')` explicitement — le champ lui-même ne la porte pas.

### 2.4 Validateur asynchrone — interroger l'API sans figer l'UI

Vérifier qu'un pseudo est libre demande un **aller-retour serveur** : c'est un `AsyncValidator`. Sa méthode `validate()` renvoie une **`Promise` ou un `Observable`** de `ValidationErrors | null` (interface vérifiée sur angular.dev). On l'écrit comme un service injectable :

```typescript
import { Injectable, inject } from '@angular/core';
import { AbstractControl, AsyncValidator, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PseudoUniqueValidator implements AsyncValidator {
  private api = inject(ParticipantsApi);

  // Renvoie null (libre) ou { pseudoPris: true } (déjà utilisé).
  validate(control: AbstractControl): Observable<ValidationErrors | null> {
    return this.api.pseudoExiste(control.value).pipe(
      map((existe) => (existe ? { pseudoPris: true } : null)),
      catchError(() => of(null)),   // erreur réseau → on ne bloque pas la soumission
    );
  }
}
```

Deux points de câblage cruciaux :

- On le passe dans le **3ᵉ slot** du contrôle (async validators), **pas** avec les validateurs sync :

  ```typescript
  const uniqueValidator = inject(PseudoUniqueValidator);
  pseudo: new FormControl('', {
    validators: [Validators.required],
    asyncValidators: [uniqueValidator.validate.bind(uniqueValidator)],
    updateOn: 'blur',   // ⚠️ déclenche à la sortie du champ, PAS à chaque frappe
  }),
  ```

- Pendant l'appel, le contrôle passe en statut **`pending`** (`control.pending === true`). C'est là qu'on affiche un « Vérification… » :

  ```html
  @if (pseudoControl.pending) { <span>Vérification du pseudo…</span> }
  @if (pseudoControl.hasError('pseudoPris')) { <span class="erreur">Pseudo déjà pris.</span> }
  ```

`updateOn: 'blur'` évite de bombarder l'API à chaque touche — sans lui, chaque frappe lance une requête. (Alternative : un `debounceTime` interne au validateur ; mais `updateOn: 'blur'` est le réglage le plus simple et suffit ici.)

### 2.5 `ControlValueAccessor` — transformer un composant en input de formulaire

Un `<input>` natif sait dialoguer avec un formulaire réactif. Un composant **maison** (sélecteur de tranche d'âge, note en étoiles, toggle custom) ne le sait pas — sauf s'il implémente **`ControlValueAccessor` (CVA)**, le **pont** entre l'API forms et l'UI. L'interface a 3 méthodes obligatoires + 1 optionnelle (vérifié angular.dev) :

| Méthode | Rôle |
|---------|------|
| `writeValue(obj)` | le formulaire **écrit** une valeur → le composant l'affiche |
| `registerOnChange(fn)` | le composant **mémorise** le callback à appeler quand SA valeur change |
| `registerOnTouched(fn)` | idem pour signaler le **blur** (marque `touched`) |
| `setDisabledState(isDisabled)` *(optionnel)* | le formulaire active/désactive le contrôle |

Il faut aussi **s'enregistrer** comme value accessor via le token multi-provider `NG_VALUE_ACCESSOR` :

```typescript
import { Component, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-tranche-age',
  template: `
    @for (t of tranches; track t) {
      <button
        type="button"
        [class.actif]="t === valeur"
        [disabled]="disabled"
        (click)="choisir(t)"
      >{{ t }}</button>
    }
  `,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    // forwardRef : la classe n'est pas encore définie au moment où on la référence
    useExisting: forwardRef(() => TrancheAgeComponent),
    multi: true,   // NG_VALUE_ACCESSOR est un multi-token : jamais l'oublier
  }],
})
export class TrancheAgeComponent implements ControlValueAccessor {
  tranches = ['0-3', '4-11', '12-17', '18+'];
  valeur: string | null = null;
  disabled = false;

  // Callbacks fournis par Angular — initialisés à des no-op le temps de l'enregistrement
  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(val: string | null): void { this.valeur = val; }
  registerOnChange(fn: (val: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  choisir(t: string): void {
    this.valeur = t;
    this.onChange(t);   // ← notifie le formulaire de la nouvelle valeur
    this.onTouched();   // ← marque le contrôle comme touché
  }
}
```

Résultat : le composant s'utilise **exactement comme un input**, avec `formControlName` (ou `[(ngModel)]`, ou `[formControl]`) :

```html
<app-tranche-age formControlName="tranche"></app-tranche-age>
```

Le point qui fait tout marcher : `writeValue` reçoit la valeur **depuis** le formulaire (init, `patchValue`, `reset`), tandis que `onChange` pousse la valeur **vers** le formulaire. Oublier d'appeler `onChange` = le composant s'affiche mais le formulaire ne reçoit jamais la valeur.

### 2.6 Template-driven, en contraste — quand l'éviter

Le module 19 t'a donné les reactive forms. L'autre approche, **template-driven** (`FormsModule`, `[(ngModel)]`, validation en attributs HTML `required`/`minlength`, `#form="ngForm"`), existe et reste valable pour les cas **simples**. Mais **aucun des quatre patterns de ce module ne s'y prête bien** :

| Besoin | Template-driven | Reactive |
|--------|:-:|:-:|
| Login / contact 2-3 champs | ✅ idéal | ✅ ok |
| Liste dynamique de N champs (`FormArray`) | ❌ pénible | ✅ |
| Validateur cross-field | ❌ | ✅ |
| Validateur async lisible + testable | ❌ | ✅ |
| Tests unitaires du formulaire | ❌ (dépend du DOM) | ✅ (modèle en TS) |

**Règle ESN :** template-driven pour un formulaire trivial et jetable ; **reactive dès qu'il y a de la logique** (dynamique, cross-field, async, testé). Le formulaire TribuZen de ce module est reactive — sans hésitation.

---

## 3. Worked examples

### Exemple 1 — `CreerSortieComponent` : `FormArray` + cross-field + async (TribuZen)

On assemble les trois premiers patterns dans l'écran « Créer une sortie ».

```typescript
// creer-sortie.component.ts
import { Component, inject } from '@angular/core';
import {
  FormBuilder, FormArray, FormControl, Validators,
  ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn,
} from '@angular/forms';
import { PseudoUniqueValidator } from './pseudo-unique.validator';

// --- Validateur cross-field : fin strictement après début ---
const finApresDebutValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const debut = group.get('debut')?.value;
  const fin = group.get('fin')?.value;
  if (!debut || !fin) return null;
  return fin > debut ? null : { finAvantDebut: true };
};

@Component({
  selector: 'app-creer-sortie',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="soumettre()">
      <input formControlName="titre" placeholder="Titre de la sortie" />
      <input formControlName="debut" type="date" />
      <input formControlName="fin" type="date" />

      <!-- Erreur cross-field : lue sur le GROUPE, pas sur un champ -->
      @if (form.hasError('finAvantDebut') && form.get('fin')?.touched) {
        <p class="erreur">La date de fin doit être après le début.</p>
      }

      <!-- Liste dynamique de participants -->
      <div formArrayName="participants">
        @for (groupe of participants.controls; track groupe; let i = $index) {
          <div [formGroupName]="i" class="participant">
            <input formControlName="pseudo" placeholder="Pseudo" />
            @if (groupe.get('pseudo')?.pending) { <span>Vérification…</span> }
            @if (groupe.get('pseudo')?.hasError('pseudoPris')) {
              <span class="erreur">Pseudo déjà pris.</span>
            }
            <input formControlName="age" type="number" placeholder="Âge" />
            <button type="button" (click)="retirer(i)">Retirer</button>
          </div>
        }
      </div>

      <button type="button" (click)="ajouter()">+ Participant</button>
      <button type="submit" [disabled]="form.invalid || form.pending">Créer la sortie</button>
    </form>
  `,
})
export class CreerSortieComponent {
  private fb = inject(FormBuilder);
  private pseudoUnique = inject(PseudoUniqueValidator);

  form = this.fb.group(
    {
      titre: ['', Validators.required],
      debut: ['', Validators.required],
      fin: ['', Validators.required],
      participants: this.fb.array([]),   // vide au départ
    },
    { validators: [finApresDebutValidator] },
  );

  // getter typé : réutilisé dans le template ET les méthodes
  get participants(): FormArray {
    return this.form.get('participants') as FormArray;
  }

  private creerParticipant() {
    return this.fb.group({
      pseudo: new FormControl('', {
        validators: [Validators.required],
        // .bind pour garder le `this` du service dans validate()
        asyncValidators: [this.pseudoUnique.validate.bind(this.pseudoUnique)],
        updateOn: 'blur',
      }),
      age: [null, [Validators.required, Validators.min(0)]],
    });
  }

  ajouter(): void { this.participants.push(this.creerParticipant()); }
  retirer(i: number): void { this.participants.removeAt(i); }

  soumettre(): void {
    if (this.form.invalid) return;
    // getRawValue inclut les éventuels champs disabled
    console.log('Sortie créée :', this.form.getRawValue());
  }
}
```

**Ce qui se passe à l'ajout d'un participant** : `ajouter()` appelle `push` avec un nouveau `FormGroup` → le `@for` sur `participants.controls` rend une nouvelle ligne → le champ `pseudo` porte l'async validator, donc à chaque **blur** Angular passe le contrôle en `pending` le temps de la requête, puis pose `pseudoPris` ou rien. Le bouton submit reste désactivé tant que `form.invalid || form.pending`.

### Exemple 2 — `TrancheAgeComponent` branché dans le `FormArray`

On remplace l'`<input type="number">` de l'âge par le composant CVA de la §2.5, réutilisable partout.

```typescript
// Dans creerParticipant(), le champ 'tranche' remplace 'age' :
private creerParticipant() {
  return this.fb.group({
    pseudo: new FormControl('', {
      validators: [Validators.required],
      asyncValidators: [this.pseudoUnique.validate.bind(this.pseudoUnique)],
      updateOn: 'blur',
    }),
    tranche: ['', Validators.required],   // pilotera <app-tranche-age>
  });
}
```

```html
<!-- imports: [ReactiveFormsModule, TrancheAgeComponent] -->
<div [formGroupName]="i" class="participant">
  <input formControlName="pseudo" placeholder="Pseudo" />
  <!-- Le composant maison s'utilise comme un input natif grâce au CVA -->
  <app-tranche-age formControlName="tranche"></app-tranche-age>
  <button type="button" (click)="retirer(i)">Retirer</button>
</div>
```

Aucune ligne de « synchronisation » à écrire : `formControlName="tranche"` suffit parce que `TrancheAgeComponent` implémente `ControlValueAccessor`. Quand on fera `form.reset()`, Angular appellera `writeValue(null)` sur chaque `app-tranche-age` et les boutons se dé-sélectionneront tout seuls.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Muter le tableau interne d'un `FormArray`

```typescript
// ❌ Manipuler le tableau à la main : la détection de changement casse
this.participants.controls.push(this.creerParticipant());
this.participants.controls.splice(2, 1);

// ✅ Passer par les méthodes dédiées — Angular met à jour valeur ET validité
this.participants.push(this.creerParticipant());
this.participants.removeAt(2);
```

La doc angular.dev est explicite : modifier directement le tableau d'`AbstractControl` provoque « strange and unexpected behavior such as broken change detection ». Toujours `push`/`insert`/`removeAt`/`clear`.

### PIÈGE #2 — Croire que `null` = invalide dans un validateur

```typescript
// La convention est INVERSÉE par rapport à l'intuition :
export function ageMineurValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    // ❌ return control.value < 18;               // renvoie un boolean : type invalide
    // ✅ un OBJET = erreur, null = OK
    return control.value < 18 ? { mineur: true } : null;
  };
}
```

`null` signifie **« aucune erreur, contrôle valide »**. Renvoyer un objet (même `{ x: false }` !) marque le contrôle **invalide** — c'est la présence de la clé qui compte, pas sa valeur.

### PIÈGE #3 — Poser un validateur cross-field sur un `FormControl`

```typescript
// ❌ Un FormControl ne voit QUE sa propre valeur — il ne peut pas comparer deux champs
fin: ['', [finApresDebutValidator]],   // group.get('debut') sera null ici

// ✅ Le validateur cross-field va dans les OPTIONS du FormGroup
this.fb.group({ debut: [''], fin: [''] }, { validators: [finApresDebutValidator] });
```

Un validateur cross-field a besoin du **parent** pour lire les frères et sœurs. Sur un `FormControl`, `control.get('autre')` renvoie `null`. Et l'erreur vit alors sur le **groupe** : on la lit avec `form.hasError('finAvantDebut')`, jamais sur `form.get('fin')`.

### PIÈGE #4 — Async validator dans le mauvais slot (ou sans `updateOn`)

```typescript
// ❌ Mettre l'async avec les sync : Angular attend une ValidationErrors SYNCHRONE → erreur
pseudo: ['', [Validators.required, this.pseudoUnique.validate]],

// ❌ Sans updateOn:'blur', une requête part à CHAQUE frappe → DDoS de ta propre API
pseudo: new FormControl('', { asyncValidators: [/* ... */] }),

// ✅ 3ᵉ slot dédié + déclenchement au blur
pseudo: new FormControl('', {
  validators: [Validators.required],
  asyncValidators: [this.pseudoUnique.validate.bind(this.pseudoUnique)],
  updateOn: 'blur',
});
```

Les async validators ont leur **propre emplacement** (`asyncValidators`). Et ils ne s'exécutent **qu'après** que les validateurs sync passent — inutile d'appeler l'API si le champ est déjà vide et `required`.

### PIÈGE #5 — `ControlValueAccessor` : oublier `multi: true` ou `onChange`

```typescript
// ❌ Sans multi:true, on ÉCRASE tous les autres value accessors → NG01203 / rien ne marche
providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => X) }],

// ❌ Ne jamais appeler onChange : le composant s'affiche mais le formulaire reste vide
choisir(t: string) { this.valeur = t; }   // le form ne reçoit RIEN

// ✅ multi:true + on notifie le formulaire
providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => X), multi: true }],
choisir(t: string) { this.valeur = t; this.onChange(t); this.onTouched(); }
```

`NG_VALUE_ACCESSOR` est un **multi-token** : plusieurs composants s'y enregistrent, d'où `multi: true` obligatoire. Et `writeValue` seul ne suffit pas : sans `onChange`, la valeur ne remonte jamais au `FormControl`.

### PIÈGE #6 — `forwardRef` oublié dans le provider CVA

```typescript
// ❌ La classe est référencée AVANT d'être définie (le décorateur s'exécute d'abord)
providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: TrancheAgeComponent, multi: true }],
// → ReferenceError / undefined selon le bundler

// ✅ forwardRef diffère la résolution jusqu'à ce que la classe existe
providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TrancheAgeComponent), multi: true }],
```

Le provider est déclaré dans le décorateur `@Component`, **au-dessus** de la classe. `forwardRef(() => X)` retarde la lecture de `X` jusqu'à l'exécution, quand la classe est bien définie.

---

## 5. Ancrage TribuZen

Ces patterns forment la **couche formulaires métier** de TribuZen — tout écran de saisie non trivial les combine.

**`CreerSortieComponent`** (Exemple 1) — l'écran de création de sortie famille : un `FormArray` `participants` de taille libre, une validation cross-field `finApresDebutValidator` (fin > début), et un `AsyncValidator` `PseudoUniqueValidator` qui interroge l'API pour interdire les doublons de pseudo. C'est le formulaire le plus complexe du front-office.

**`TrancheAgeComponent`** (Exemple 2) — le sélecteur de tranche d'âge en `ControlValueAccessor`, réutilisé dans le `FormArray` participants **et** dans le profil famille. Un seul composant, pilotable par `formControlName` partout.

**`PseudoUniqueValidator`** — service `AsyncValidator` injectable, testable isolément (module 23), branché sur `/api/participants/pseudo-existe`.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      sorties/
        creer-sortie.component.ts        ← Exemple 1 (FormArray + cross-field + async)
        pseudo-unique.validator.ts       ← AsyncValidator (service)
        validators/
          fin-apres-debut.validator.ts   ← ValidatorFn cross-field
      shared/
        tranche-age.component.ts         ← ControlValueAccessor réutilisable
```

> L'appel HTTP réel du `PseudoUniqueValidator` s'appuie sur le `HttpClient` et l'intercepteur de cache du **module 18**. Le rendu des champs avec des composants Angular Material (`mat-form-field`, `mat-datepicker`) est le **module 21** — ici les inputs sont natifs. Les tests du formulaire et du validateur async sont le **module 23**.

---

## 6. Points clés

1. `FormArray` gère une **liste de taille variable** de contrôles ; on la modifie **uniquement** via `push`/`insert`/`removeAt`/`clear`, jamais en mutant `.controls`.
2. Un validateur synchrone custom est une **`ValidatorFn`** (souvent produite par une **factory**) qui renvoie `null` si valide, un objet **`ValidationErrors`** si invalide.
3. La convention est inversée : **`null` = valide**, un objet = erreur ; la **clé** de l'objet est le nom de l'erreur (`hasError('maCle')`).
4. Une validation **cross-field** se pose **sur le `FormGroup`** (options `{ validators: [...] }`) et lit les enfants via `control.get(...)` ; l'erreur vit sur le **groupe**.
5. Un `AsyncValidator` renvoie un `Observable`/`Promise` de `ValidationErrors | null`, va dans le slot **`asyncValidators`**, se règle avec **`updateOn: 'blur'`**, et met le contrôle en **`pending`** pendant l'appel.
6. `ControlValueAccessor` (3 méthodes + `setDisabledState`) transforme un composant en input de formulaire ; s'enregistrer via `NG_VALUE_ACCESSOR` avec **`multi: true`** et **`forwardRef`**.
7. Dans un CVA, `writeValue` reçoit la valeur **du** formulaire, `onChange` la pousse **vers** le formulaire — oublier `onChange` = valeur jamais transmise.
8. **Template-driven** convient aux formulaires triviaux ; dès qu'il y a du dynamique, du cross-field, de l'async ou des tests → **reactive**.

---

## 7. Seeds Anki

```
Comment ajoute-t-on ou retire-t-on un contrôle dans un FormArray Angular ?|Via ses méthodes dédiées : push(control), insert(i, control), removeAt(i), clear(). Jamais en mutant le tableau .controls (splice/push direct) — ça casse la détection de changement.
Que doit renvoyer une ValidatorFn custom quand le contrôle est VALIDE ?|null. Un objet ValidationErrors (ex: { pseudoInterdit: true }) signale au contraire une erreur. La convention est inversée : null = OK, objet = invalide.
Pourquoi écrire un validateur custom comme une factory qui retourne une ValidatorFn ?|Pour le paramétrer : forbiddenNameValidator(regex) retourne (control) => ... . La factory capture le paramètre et produit la ValidatorFn qu'on met dans le tableau de validateurs du contrôle.
Où pose-t-on un validateur cross-field (ex: fin > debut) et où lit-on l'erreur ?|Sur le FormGroup, dans les options : fb.group({...}, { validators: [finApresDebutValidator] }). Le validateur lit les enfants via group.get('debut'). L'erreur vit sur le groupe : form.hasError('finAvantDebut'), pas sur un champ.
Comment câble-t-on un AsyncValidator sur un FormControl et pourquoi updateOn:'blur' ?|Dans le 3e slot : new FormControl('', { validators:[...], asyncValidators:[v.validate.bind(v)], updateOn:'blur' }). updateOn:'blur' évite une requête à chaque frappe. Pendant l'appel, control.pending vaut true.
Quelles sont les méthodes de l'interface ControlValueAccessor ?|writeValue(obj) — le form écrit dans le composant ; registerOnChange(fn) — mémorise le callback de changement ; registerOnTouched(fn) — callback de blur ; setDisabledState(isDisabled) optionnel. On s'enregistre via NG_VALUE_ACCESSOR (multi:true, forwardRef).
Dans un ControlValueAccessor, que se passe-t-il si on oublie d'appeler onChange ?|Le composant affiche bien la valeur (writeValue marche), mais la valeur ne remonte JAMAIS au FormControl : le formulaire reste vide. onChange(nouvelleValeur) est ce qui pousse la valeur vers le form.
Pourquoi NG_VALUE_ACCESSOR exige-t-il multi:true et forwardRef ?|multi:true car c'est un multi-token où plusieurs composants s'enregistrent — sans lui on écrase les autres (NG01203). forwardRef car le provider est déclaré dans le décorateur, au-dessus de la classe, donc référencée avant d'être définie.
Quand préférer template-driven à reactive forms ?|Template-driven pour un formulaire trivial et jetable (login, contact 2-3 champs). Reactive dès qu'il y a une liste dynamique (FormArray), du cross-field, de l'async, ou des tests unitaires — les 4 patterns de ce module.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-20-formulaires-patterns/README.md`. Construire le formulaire « Créer une sortie » de TribuZen — `FormArray` de participants, validateur cross-field, `AsyncValidator` de pseudo unique, et composant `ControlValueAccessor` — avec Angular CLI + dev server comme oracle visuel, corrigé commenté intégral.
