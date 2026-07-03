# Lab 20 — Patterns de formulaires : `FormArray`, validators custom/async, `ControlValueAccessor`

> **Outcome :** à la fin, tu sais construire le formulaire « Créer une sortie » de TribuZen avec un `FormArray` de participants de taille variable, un validateur cross-field (fin > début), un `AsyncValidator` de pseudo unique, et un composant `ControlValueAccessor` réutilisable — le tout visible et pilotable en direct dans le navigateur.
> **Vrai outil :** Angular CLI 19 + `ng serve` (dev server, rechargement à chaud). Aucun harnais de test simulé.
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis `CreerSortieComponent`, l'écran de création de sortie famille. Cahier des charges **exact** :

1. Un `FormGroup` racine avec `titre` (requis), `debut` (requis, `type="date"`), `fin` (requis, `type="date"`).
2. Une **validation cross-field** `finApresDebutValidator` posée sur le groupe : erreur `finAvantDebut` si `fin <= debut`. L'erreur s'affiche sous les dates quand `fin` est `touched`.
3. Un **`FormArray` `participants`**, vide au départ. Un bouton **+ Participant** ajoute un sous-`FormGroup` `{ pseudo, tranche }` ; chaque ligne a un bouton **Retirer**.
4. Le champ `pseudo` porte un **`AsyncValidator`** `PseudoUniqueValidator` (`updateOn: 'blur'`) : erreur `pseudoPris` si le pseudo existe déjà. Pendant la vérification, afficher « Vérification… » (`control.pending`).
5. Le champ `tranche` est piloté par un composant maison **`TrancheAgeComponent`** implémentant `ControlValueAccessor` (4 boutons : `0-3`, `4-11`, `12-17`, `18+`), utilisé via `formControlName="tranche"`, `required`.
6. Le bouton **Créer la sortie** est désactivé si `form.invalid || form.pending`. À la soumission valide, `console.log(form.getRawValue())`.

**Contraintes techniques :**
- Le `FormArray` se modifie **uniquement** via `push` / `removeAt` — jamais en mutant `.controls`.
- Le validateur cross-field va dans les **options du `FormGroup`** (`{ validators: [...] }`), pas sur un `FormControl`.
- L'async validator va dans le slot **`asyncValidators`** du `FormControl`, avec `updateOn: 'blur'`.
- `TrancheAgeComponent` s'enregistre via `NG_VALUE_ACCESSOR` (`multi: true`, `forwardRef`) et **appelle `onChange`** à la sélection.

**Simulation de l'API (pas de backend requis) :** le `PseudoUniqueValidator` interroge un service local qui renvoie un `Observable` avec un délai simulé (`of(...).pipe(delay(500))`) traitant `alice` et `bob` comme déjà pris. En vrai produit, ce serait un `HttpClient` (module 18) — la signature du validateur est identique.

**Pas de gap-fill** — tu écris les trois fichiers complets à partir des starters minimaux.

### Starter minimal

Dans un projet Angular 19 (`ng new tribuzen-labs --standalone`), génère les briques :

```bash
ng generate component sorties/creer-sortie
ng generate component shared/tranche-age
ng generate service sorties/pseudo-unique
```

Squelettes de départ :

```typescript
// src/app/shared/tranche-age.component.ts — starter
import { Component } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'app-tranche-age',
  standalone: true,
  template: `<!-- À construire : 4 boutons de tranche, classe .actif sur la valeur choisie -->`,
  // À toi : providers NG_VALUE_ACCESSOR (multi + forwardRef)
})
export class TrancheAgeComponent implements ControlValueAccessor {
  // À toi : valeur, disabled, onChange/onTouched (no-op au départ)
  //         writeValue, registerOnChange, registerOnTouched, setDisabledState, choisir()
  writeValue(): void {}
  registerOnChange(): void {}
  registerOnTouched(): void {}
}
```

```typescript
// src/app/sorties/creer-sortie.component.ts — starter
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-creer-sortie',
  standalone: true,
  imports: [ReactiveFormsModule /*, TrancheAgeComponent */],
  template: `<!-- À construire : titre, dates, erreur cross-field, FormArray participants, submit -->`,
})
export class CreerSortieComponent {
  private fb = inject(FormBuilder);
  // À toi : form (avec validateur cross-field), getter participants,
  //         creerParticipant(), ajouter(), retirer(i), soumettre()
}
```

Branche `<app-creer-sortie />` dans `AppComponent`, lance `ng serve`, et observe le formulaire réagir.

---

## Étapes (en friction)

1. **Écris le validateur cross-field** — une `ValidatorFn` `finApresDebutValidator` qui lit `group.get('debut')` / `group.get('fin')`, renvoie `null` si l'un est vide, sinon `fin > debut ? null : { finAvantDebut: true }`.
2. **Écris le service `PseudoUniqueValidator`** — `implements AsyncValidator`, `validate(control)` renvoie `of(pris).pipe(delay(500), map(...))` où `pris` teste `['alice','bob'].includes(control.value?.toLowerCase())`. `catchError(() => of(null))`.
3. **Écris `TrancheAgeComponent`** — les 4 méthodes du CVA + `choisir(t)` qui pose `valeur`, appelle `onChange(t)` puis `onTouched()`. N'oublie ni `multi: true`, ni `forwardRef`.
4. **Construis le `form`** — `fb.group({...}, { validators: [finApresDebutValidator] })`, avec `participants: fb.array([])`.
5. **Écris `creerParticipant()`** — un `fb.group` avec `pseudo` en `new FormControl('', { validators: [required], asyncValidators: [v.validate.bind(v)], updateOn: 'blur' })` et `tranche: ['', required]`.
6. **Écris le template** — dates + bloc erreur cross-field ; `formArrayName="participants"` + `@for` sur `participants.controls` avec `[formGroupName]="i"` ; `pending` / `pseudoPris` ; `<app-tranche-age formControlName="tranche">`.
7. **Teste les cas limites dans le navigateur** : saisis `alice` puis quitte le champ → « Vérification… » puis « Pseudo déjà pris » ; mets une date de fin avant le début → erreur cross-field ; ajoute/retire des participants → les lignes suivent ; le submit reste grisé tant que tout n'est pas valide.
8. **Épreuve anti-CVA cassé** : commente temporairement l'appel `this.onChange(t)` dans `choisir()` et observe que la tranche s'affiche mais que `form.value.participants[i].tranche` reste vide (le submit ne se débloque pas) — puis remets-le. Tu viens de voir le rôle de `onChange` de tes propres yeux.

---

## Corrigé complet commenté

```typescript
// src/app/sorties/pseudo-unique.service.ts — AsyncValidator (API simulée)
import { Injectable } from '@angular/core';
import { AbstractControl, AsyncValidator, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, delay, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PseudoUniqueValidator implements AsyncValidator {
  // Simule l'appel réseau. En vrai produit : inject(HttpClient).get(`/api/.../${value}`)
  private pseudoExiste(pseudo: string): Observable<boolean> {
    const pris = ['alice', 'bob'].includes((pseudo ?? '').toLowerCase());
    return of(pris).pipe(delay(500));   // 500 ms pour VOIR l'état pending à l'écran
  }

  // Renvoie null (libre) ou { pseudoPris: true } (déjà utilisé).
  validate(control: AbstractControl): Observable<ValidationErrors | null> {
    if (!control.value) return of(null);          // rien à vérifier si vide
    return this.pseudoExiste(control.value).pipe(
      map((existe) => (existe ? { pseudoPris: true } : null)),
      catchError(() => of(null)),                 // erreur réseau → ne bloque pas
    );
  }
}
```

```typescript
// src/app/shared/tranche-age.component.ts — ControlValueAccessor
import { Component, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-tranche-age',
  standalone: true,
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
  styles: [`
    button { margin-right: 4px; }
    button.actif { background: #1e293b; color: #fff; }
  `],
  // multi:true car NG_VALUE_ACCESSOR est un multi-token ; forwardRef car la classe
  // est référencée dans le décorateur, AVANT sa propre définition.
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TrancheAgeComponent),
    multi: true,
  }],
})
export class TrancheAgeComponent implements ControlValueAccessor {
  tranches = ['0-3', '4-11', '12-17', '18+'];
  valeur: string | null = null;
  disabled = false;

  // Callbacks fournis par Angular — no-op tant que le form ne les a pas enregistrés.
  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  // Le formulaire ÉCRIT dans le composant (init, patchValue, reset).
  writeValue(val: string | null): void { this.valeur = val; }
  // Le composant MÉMORISE les callbacks du formulaire.
  registerOnChange(fn: (val: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  // Le formulaire active/désactive le contrôle (ex: form.disable()).
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  choisir(t: string): void {
    if (this.disabled) return;
    this.valeur = t;
    this.onChange(t);   // ← POUSSE la valeur vers le FormControl (sans ça, form vide)
    this.onTouched();   // ← marque le contrôle touched
  }
}
```

```typescript
// src/app/sorties/creer-sortie.component.ts — corrigé
import { Component, inject } from '@angular/core';
import {
  FormBuilder, FormArray, FormControl, Validators,
  ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn,
} from '@angular/forms';
import { PseudoUniqueValidator } from './pseudo-unique.service';
import { TrancheAgeComponent } from '../shared/tranche-age.component';

// --- Validateur cross-field : reçoit le GROUPE, lit deux enfants ---
const finApresDebutValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const debut = group.get('debut')?.value;
  const fin = group.get('fin')?.value;
  if (!debut || !fin) return null;                 // pas de jugement tant qu'incomplet
  return fin > debut ? null : { finAvantDebut: true };
};

@Component({
  selector: 'app-creer-sortie',
  standalone: true,
  imports: [ReactiveFormsModule, TrancheAgeComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="soumettre()">
      <input formControlName="titre" placeholder="Titre de la sortie" />

      <label>Début <input formControlName="debut" type="date" /></label>
      <label>Fin <input formControlName="fin" type="date" /></label>

      <!-- Erreur cross-field : lue sur le GROUPE, jamais sur form.get('fin') -->
      @if (form.hasError('finAvantDebut') && form.get('fin')?.touched) {
        <p class="erreur">La date de fin doit être après le début.</p>
      }

      <!-- Liste dynamique : on itère sur les contrôles du FormArray -->
      <div formArrayName="participants">
        @for (groupe of participants.controls; track groupe; let i = $index) {
          <div [formGroupName]="i" class="participant">
            <input formControlName="pseudo" placeholder="Pseudo" />
            @if (groupe.get('pseudo')?.pending) { <span>Vérification…</span> }
            @if (groupe.get('pseudo')?.hasError('pseudoPris')) {
              <span class="erreur">Pseudo déjà pris.</span>
            }

            <!-- Composant maison piloté comme un input natif grâce au CVA -->
            <app-tranche-age formControlName="tranche"></app-tranche-age>

            <button type="button" (click)="retirer(i)">Retirer</button>
          </div>
        }
      </div>

      <button type="button" (click)="ajouter()">+ Participant</button>
      <button type="submit" [disabled]="form.invalid || form.pending">Créer la sortie</button>
    </form>
  `,
  styles: [`.erreur { color: #dc2626; font-size: 0.85em; } .participant { margin: 8px 0; }`],
})
export class CreerSortieComponent {
  private fb = inject(FormBuilder);
  private pseudoUnique = inject(PseudoUniqueValidator);

  form = this.fb.group(
    {
      titre: ['', Validators.required],
      debut: ['', Validators.required],
      fin: ['', Validators.required],
      participants: this.fb.array([]),          // FormArray vide au départ
    },
    { validators: [finApresDebutValidator] },   // validateur cross-field sur le GROUPE
  );

  // Getter typé : réutilisé dans le template ET les méthodes
  get participants(): FormArray {
    return this.form.get('participants') as FormArray;
  }

  private creerParticipant() {
    return this.fb.group({
      pseudo: new FormControl('', {
        validators: [Validators.required],
        // .bind conserve le `this` du service à l'appel de validate()
        asyncValidators: [this.pseudoUnique.validate.bind(this.pseudoUnique)],
        updateOn: 'blur',                       // déclenche l'appel au blur, pas à chaque frappe
      }),
      tranche: ['', Validators.required],       // piloté par <app-tranche-age>
    });
  }

  // Modification du FormArray : méthodes dédiées uniquement (jamais .controls.push)
  ajouter(): void { this.participants.push(this.creerParticipant()); }
  retirer(i: number): void { this.participants.removeAt(i); }

  soumettre(): void {
    if (this.form.invalid) return;
    console.log('Sortie créée :', this.form.getRawValue());
  }
}
```

**Pourquoi ce corrigé est correct :**
- Le `FormArray` grandit/rétrécit via `push`/`removeAt` — jamais en touchant `.controls` directement, ce qui casserait la détection de changement.
- `finApresDebutValidator` est posé dans les **options du groupe** : il reçoit le `FormGroup` et lit `debut`/`fin`. L'erreur vit sur `form` (`form.hasError('finAvantDebut')`), pas sur le champ `fin`.
- `pseudo` place l'async validator dans le **3ᵉ slot** (`asyncValidators`) avec `updateOn: 'blur'` : une seule requête au blur, statut `pending` visible pendant les 500 ms simulées.
- `TrancheAgeComponent` s'utilise via `formControlName="tranche"` **sans code de synchronisation** parce qu'il implémente `ControlValueAccessor` et appelle `onChange` à la sélection. `multi: true` + `forwardRef` sont ce qui l'enregistre correctement.
- Le submit teste `form.invalid || form.pending` : impossible d'envoyer pendant qu'une vérification async est en cours.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées.** Reproduis les trois fichiers **de mémoire, en 35 minutes**, avec ces modifications :

1. Ajoute une **contrainte de cardinalité** sur le `FormArray` : au moins **1 participant** requis. Écris une `ValidatorFn` `minParticipants(1)` (factory) posée sur le `FormArray` (`Validators.minLength` ne s'applique pas à un `FormArray` sur sa taille — il faut lire `control.value?.length`). Affiche un message quand la liste est vide.
2. Ajoute au `TrancheAgeComponent` la gestion de `setDisabledState` **visible** : quand `form.disable()` est appelé (ajoute un bouton « Verrouiller » qui fait `form.disable()`/`form.enable()`), les boutons de tranche doivent devenir non cliquables ET grisés.
3. Le validateur async doit refuser en plus le pseudo **`admin`** (en plus de `alice`/`bob`).
4. **Sans rouvrir ce corrigé** ni le module 20.

**Critère de réussite :** dans le navigateur, un formulaire à zéro participant est invalide (message affiché) ; « Verrouiller » grise les tranches ; saisir `admin` puis blur affiche « Pseudo déjà pris ».

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, les fichiers vivent ici :

```
tribuzen/
  src/
    app/
      sorties/
        creer-sortie.component.ts        ← FormArray + cross-field + async
        pseudo-unique.service.ts         ← AsyncValidator (branché sur HttpClient réel)
        validators/
          fin-apres-debut.validator.ts   ← ValidatorFn cross-field extraite
      shared/
        tranche-age.component.ts         ← ControlValueAccessor réutilisable
```

**Différences par rapport au lab :**
- `PseudoUniqueValidator` interrogera la vraie API via `HttpClient` (module 18) et l'intercepteur de cache — au lieu du `of(...).pipe(delay(500))` simulé. La **signature du validateur est identique**, seule l'implémentation de l'appel change.
- `TrancheAgeComponent` sera stylé par le design system TribuZen (tokens CSS) et testé isolément (module 23) — ici, style brut inline.
- Le validateur cross-field sera extrait dans son propre fichier `validators/` pour être réutilisé et testé unitairement.
- Le rendu des champs pourra passer aux composants Angular Material (`mat-form-field`, `mat-datepicker`) au module 21 — ici, inputs natifs.

**Commit cible :**
```
feat(sorties): CreerSortie — FormArray participants, cross-field fin>debut, pseudo unique async, tranche-age CVA
```
