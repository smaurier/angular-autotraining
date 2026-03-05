# Cours 30 — Signal Forms (experimental)

> **Objectif** : Decouvrir la nouvelle API experimentale Signal Forms d'Angular, comprendre le concept de formulaire schema-driven avec le modele comme source de verite unique, le two-way binding automatique, et savoir quand choisir entre template-driven, reactive et signal forms.

---

## Rappel du cours precedent

<details>
<summary>1. Quelle est la difference entre FormBuilder.group() et new FormGroup() ?</summary>

`FormBuilder.group()` est un raccourci syntaxique plus concis. `new FormGroup<T>()` permet un typage plus explicite. Les deux creent le meme resultat, mais `FormBuilder` est prefere pour la lisibilite.
</details>

<details>
<summary>2. Comment creer un validateur personnalise en Angular ?</summary>

C'est une fonction qui retourne une `ValidatorFn`. Cette fonction recoit un `AbstractControl` et retourne `null` si valide ou un objet `{ cleErreur: true }` si invalide. Exemple : `contientChiffre(): ValidatorFn`.
</details>

<details>
<summary>3. Comment reagir a chaque modification d'un champ reactive form ?</summary>

Via la propriete `valueChanges` qui retourne un Observable. On peut y appliquer des operateurs RxJS comme `debounceTime`, `distinctUntilChanged`, etc.
</details>

---

## Analogie

Imaginez trois generations d'appareils photo :

- **Template-driven** = un **appareil jetable** : simple, rapide, limites fixes. Ideal pour une photo vite faite.
- **Reactive Forms** = un **reflex professionnel** : puissant, configurable, mais il faut regler manuellement chaque parametre (FormGroup, FormControl, validateurs).
- **Signal Forms** = un **smartphone haut de gamme** : la puissance du reflex avec l'intelligence automatique. Le modele definit tout, la validation se deduit, le binding est automatique.

Signal Forms represente la direction vers laquelle Angular evolue : simplifier sans perdre en puissance.

---

## Theorie

### Attention : API experimentale

> **Important** : Signal Forms est une API **experimentale** introduite progressivement dans Angular 19+. La syntaxe peut evoluer. Utilisez-la pour vous former et prototyper, mais en production ESN, les Reactive Forms restent le standard en 2025-2026.

### Le probleme que Signal Forms resout

Avec les Reactive Forms, il y a une **duplication** entre le modele et le formulaire :

```typescript
// ❌ Reactive Forms : le modele et le form sont deux choses separees
interface User {
  nom: string;
  email: string;
  age: number;
}

// 1. Le modele TypeScript
const user: User = { nom: '', email: '', age: 0 };

// 2. Le formulaire (re-declare les memes champs !)
const form = this.fb.group({
  nom: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
  age: [0, [Validators.required, Validators.min(18)]],
});

// 3. Synchronisation manuelle modele ↔ form
form.patchValue(user);         // modele → form
const updated = form.value;     // form → modele
```

Signal Forms propose une approche ou le **modele est le formulaire** :

```typescript
// ✅ Signal Forms : le modele EST le formulaire
// Le schema definit a la fois la structure et les regles
```

### Concept : schema-based validation

Signal Forms utilise un **schema** qui definit la structure, les valeurs par defaut et les regles de validation en un seul endroit :

```typescript
import { SignalFormBuilder } from '@angular/forms';

// Le schema definit tout : structure + validation + valeurs par defaut
const userFormSchema = {
  nom: {
    defaultValue: '',
    validators: [{ type: 'required' }, { type: 'minLength', value: 2 }],
  },
  email: {
    defaultValue: '',
    validators: [{ type: 'required' }, { type: 'email' }],
  },
  age: {
    defaultValue: null as number | null,
    validators: [{ type: 'required' }, { type: 'min', value: 18 }],
  },
};
```

### SignalForm : le modele comme source de verite

Le concept central : au lieu de manipuler des `FormControl`, on manipule directement un **modele reactif** base sur des Signals :

```typescript
import { Component, signal, computed } from '@angular/core';

// Pattern "Signal Form" manuel (en attendant l'API stable)
// Cette approche illustre le concept de Signal Forms

@Component({
  selector: 'app-user-form',
  template: `
    <form (ngSubmit)="soumettre()">
      <div>
        <label>Nom :</label>
        <input
          [value]="model.nom()"
          (input)="model.nom.set($any($event.target).value)"
        >
        @if (erreurs().nom) {
          <p class="erreur">{{ erreurs().nom }}</p>
        }
      </div>

      <div>
        <label>Email :</label>
        <input
          type="email"
          [value]="model.email()"
          (input)="model.email.set($any($event.target).value)"
        >
        @if (erreurs().email) {
          <p class="erreur">{{ erreurs().email }}</p>
        }
      </div>

      <div>
        <label>Age :</label>
        <input
          type="number"
          [value]="model.age()"
          (input)="model.age.set(+$any($event.target).value)"
        >
        @if (erreurs().age) {
          <p class="erreur">{{ erreurs().age }}</p>
        }
      </div>

      <button type="submit" [disabled]="!isValid()">Valider</button>

      <pre>Modele : {{ debugModel() | json }}</pre>
    </form>
  `,
})
export class UserFormComponent {
  // Le modele = des Signals, source de verite unique
  model = {
    nom: signal(''),
    email: signal(''),
    age: signal<number | null>(null),
  };

  // La validation est un computed derive du modele
  erreurs = computed(() => {
    const e: Record<string, string> = {};

    if (!this.model.nom()) e['nom'] = 'Le nom est requis';
    else if (this.model.nom().length < 2) e['nom'] = 'Minimum 2 caracteres';

    if (!this.model.email()) e['email'] = 'L\'email est requis';
    else if (!this.model.email().includes('@')) e['email'] = 'Format email invalide';

    if (this.model.age() === null) e['age'] = 'L\'age est requis';
    else if (this.model.age()! < 18) e['age'] = 'Minimum 18 ans';

    return e;
  });

  isValid = computed(() => Object.keys(this.erreurs()).length === 0);

  debugModel = computed(() => ({
    nom: this.model.nom(),
    email: this.model.email(),
    age: this.model.age(),
  }));

  soumettre(): void {
    if (this.isValid()) {
      console.log('Soumis :', this.debugModel());
    }
  }
}
```

### Avantages du pattern Signal Forms

| Aspect | Reactive Forms | Signal Forms (pattern) |
|--------|---------------|----------------------|
| Source de verite | FormGroup (separe du modele) | Modele directement (Signals) |
| Validation | Validators attaches aux FormControl | `computed()` derive du modele |
| Reactivite | `valueChanges` (Observable) | Signals (synchrone, granulaire) |
| Typage | `FormGroup<T>` depuis Angular 14 | Natif TypeScript via Signals |
| Boilerplate | Moyen (FormBuilder, formControlName) | Minimal |
| Tests | TestBed + fixture | Tester les Signals directement |

### Two-way binding avec Signals et model()

Angular 19+ propose `model()` pour un two-way binding Signal natif :

```typescript
import { Component, model, signal, computed } from '@angular/core';

// Composant input personnalise avec model()
@Component({
  selector: 'app-text-input',
  template: `
    <input
      [value]="value()"
      (input)="value.set($any($event.target).value)"
    >
  `,
})
export class TextInputComponent {
  readonly value = model(''); // Two-way binding Signal
}

// Utilisation dans le parent
@Component({
  selector: 'app-form',
  imports: [TextInputComponent],
  template: `
    <app-text-input [(value)]="nom" />
    <p>Bonjour {{ nom() }} !</p>
  `,
})
export class FormComponent {
  nom = signal('');
}
```

### Migration progressive : compatForm (concept)

Pour migrer progressivement d'un Reactive Form vers un pattern Signal Forms :

```typescript
// Etape 1 : Reactive Form existant
form = this.fb.group({
  nom: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
});

// Etape 2 : Exposer les valeurs comme Signals via toSignal
import { toSignal } from '@angular/core/rxjs-interop';

readonly nomValue = toSignal(
  this.form.get('nom')!.valueChanges,
  { initialValue: '' }
);

readonly emailValue = toSignal(
  this.form.get('email')!.valueChanges,
  { initialValue: '' }
);

// Etape 3 : Exposer la validite comme Signal
readonly isValid = toSignal(
  this.form.statusChanges.pipe(map(status => status === 'VALID')),
  { initialValue: false }
);

// Etape 4 (futur) : Remplacer par Signal Forms natif quand l'API sera stable
```

### Matrice de decision : quel type de formulaire ?

| Critere | Template-driven | Reactive Forms | Signal Forms (pattern) |
|---------|:-:|:-:|:-:|
| Formulaire simple (2-5 champs) | ✅ | Possible | Possible |
| Formulaire complexe (10+ champs) | ❌ | ✅ | ✅ |
| Validation dynamique | ❌ | ✅ | ✅ |
| Champs dynamiques (add/remove) | ❌ | ✅ (FormArray) | ✅ |
| Validation cross-field | Difficile | ✅ | ✅ (computed) |
| Tests unitaires | Difficile | ✅ | ✅ (pas de TestBed) |
| Projets ESN existants | Rare | ✅ Standard | En emergence |
| Performance (grands formulaires) | Moyenne | Bonne | Excellente (granulaire) |
| Apprentissage | Facile | Moyen | Facile si Signals maitrises |
| Maturite | Stable | Stable | Experimentale |

> **Recommandation ESN** : utilisez **Reactive Forms** pour la production. Familiarisez-vous avec le **pattern Signal Forms** pour les nouveaux projets Angular 19+ et anticipez la migration.

---

## Pratique

Creez un formulaire de profil utilisateur en utilisant le pattern Signal Forms (Signals purs) :
1. Champs : `prenom`, `nom`, `email`, `bio` (textarea)
2. Validation derivee via `computed()` : prenom et nom requis, email format valide, bio max 200 caracteres
3. Un compteur de caracteres pour la bio
4. Signal `isValid` derive
5. Affichage conditionnel des erreurs

<details>
<summary>Solution</summary>

```typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-profil-form',
  template: `
    <form (ngSubmit)="soumettre()">
      <div>
        <label>Prenom :</label>
        <input [value]="prenom()" (input)="prenom.set($any($event.target).value)">
        @if (touched().prenom && erreurs().prenom) {
          <p class="erreur">{{ erreurs().prenom }}</p>
        }
      </div>

      <div>
        <label>Nom :</label>
        <input [value]="nom()" (input)="nom.set($any($event.target).value)">
        @if (touched().nom && erreurs().nom) {
          <p class="erreur">{{ erreurs().nom }}</p>
        }
      </div>

      <div>
        <label>Email :</label>
        <input [value]="email()" (input)="email.set($any($event.target).value)">
        @if (touched().email && erreurs().email) {
          <p class="erreur">{{ erreurs().email }}</p>
        }
      </div>

      <div>
        <label>Bio :</label>
        <textarea
          [value]="bio()"
          (input)="bio.set($any($event.target).value)"
          (blur)="marquerTouche('bio')"
          rows="4"
        ></textarea>
        <small>{{ bio().length }} / 200 caracteres</small>
        @if (touched().bio && erreurs().bio) {
          <p class="erreur">{{ erreurs().bio }}</p>
        }
      </div>

      <button type="submit" [disabled]="!isValid()">Sauvegarder</button>
    </form>
  `,
  styles: [`.erreur { color: red; font-size: 0.85em; }`],
})
export class ProfilFormComponent {
  prenom = signal('');
  nom = signal('');
  email = signal('');
  bio = signal('');

  touched = signal<Record<string, boolean>>({
    prenom: false, nom: false, email: false, bio: false,
  });

  erreurs = computed(() => {
    const e: Record<string, string> = {};
    if (!this.prenom()) e['prenom'] = 'Le prenom est requis';
    if (!this.nom()) e['nom'] = 'Le nom est requis';
    if (!this.email()) e['email'] = 'L\'email est requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email()))
      e['email'] = 'Format email invalide';
    if (this.bio().length > 200)
      e['bio'] = `Bio trop longue (${this.bio().length}/200)`;
    return e;
  });

  isValid = computed(() => Object.keys(this.erreurs()).length === 0);

  marquerTouche(champ: string): void {
    this.touched.update(t => ({ ...t, [champ]: true }));
  }

  soumettre(): void {
    // Marquer tous les champs comme touches
    this.touched.set({
      prenom: true, nom: true, email: true, bio: true,
    });

    if (this.isValid()) {
      console.log('Profil sauvegarde :', {
        prenom: this.prenom(),
        nom: this.nom(),
        email: this.email(),
        bio: this.bio(),
      });
    }
  }
}
```
</details>

---

## Resume

| Point cle | A retenir |
|-----------|-----------|
| Signal Forms | API experimentale, pattern base sur Signals purs |
| Source de verite | Le modele (Signals) est directement le formulaire |
| Validation | Via `computed()`, derive automatiquement du modele |
| `model()` | Two-way binding Signal natif (Angular 19+) |
| Migration | `toSignal(form.valueChanges)` pour une transition progressive |
| Production ESN | Reactive Forms reste le standard, Signal Forms en anticipation |
| Avantages | Moins de boilerplate, typage natif, pas de TestBed |
| Limites actuelles | Pas d'equivalent FormArray, pas de validators standardises |

---

> **Prochain cours** : [Cours 31 — Patterns formulaires avances](./04-patterns-formulaires.md)
