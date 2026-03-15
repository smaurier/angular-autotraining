# Correction — Exercice 01 : Premier composant

## Résultat attendu

Une page affichant un message de bienvenue (ex: "Bonjour, Sophie !") avec :
- Un champ de saisie permettant de changer le prenom en temps réel
- Un bouton "Passer en EN" / "Passer en FR" qui bascule la langue
- Le message se met a jour automatiquement grace aux signaux

## Code corrige

```typescript
// src/app/exercises/ex01/hello.component.ts

// --- Imports Angular necessaires ---
// Component : decorateur pour definir un composant Angular
// signal : cree une valeur reactive mutable (equivalent de ref() en Vue 3)
// computed : cree une valeur reactive derivee en lecture seule (comme computed() en Vue 3)
import { Component, signal, computed } from '@angular/core';

// --- Decorateur @Component ---
// C'est ici qu'on configure le composant : selecteur, template, styles, etc.
@Component({
  // Le selecteur HTML pour utiliser ce composant : <app-hello></app-hello>
  selector: 'app-hello',

  // standalone: true signifie que ce composant n'a pas besoin d'un NgModule
  // C'est le comportement par defaut depuis Angular 19, mais on l'ecrit explicitement
  standalone: true,

  // Pas de dependances externes donc imports est vide
  imports: [],

  // Template inline : le HTML du composant directement dans le fichier TypeScript
  template: `
    <div class="hello-container">
      <!-- Titre principal avec interpolation du computed greeting -->
      <h1>{{ greeting() }}</h1>

      <!-- Champ de saisie pour modifier le prenom -->
      <!-- On ecoute l'evenement (input) et on met a jour le signal name -->
      <!-- $event est l'evenement DOM natif, .target.value donne la valeur saisie -->
      <label for="nameInput">Votre prenom :</label>
      <input
        id="nameInput"
        type="text"
        [value]="name()"
        (input)="onNameChange($event)"
        placeholder="Entrez votre prenom"
      />

      <!-- Bouton pour basculer la langue -->
      <!-- Le texte du bouton depend de la langue courante -->
      <button (click)="toggleLang()">
        {{ lang() === 'fr' ? 'Passer en EN' : 'Passer en FR' }}
      </button>

      <!-- Affichage du compteur de changements (bonus) -->
      <p class="visit-count">Changements de langue : {{ visitCount() }}</p>
    </div>
  `,

  // Styles inline avec backticks pour le multi-ligne
  styles: [`
    .hello-container {
      padding: 2rem;
      max-width: 400px;
      font-family: sans-serif;
    }
    input {
      display: block;
      margin: 0.5rem 0 1rem;
      padding: 0.5rem;
      font-size: 1rem;
      width: 100%;
      box-sizing: border-box;
    }
    button {
      padding: 0.5rem 1rem;
      font-size: 1rem;
      cursor: pointer;
      background-color: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
    }
    button:hover {
      background-color: #1565c0;
    }
    .visit-count {
      margin-top: 1rem;
      color: #666;
      font-size: 0.9rem;
    }
  `]
})
export class HelloComponent {
  // --- Signal name ---
  // signal<string> cree un signal mutable de type string
  // On l'initialise avec un prenom par defaut
  // Pour lire la valeur : this.name()
  // Pour ecrire : this.name.set('nouvelle valeur')
  readonly name = signal<string>('Sophie');

  // --- Signal lang ---
  // On type avec un union literal pour n'autoriser que 'fr' ou 'en'
  // Cela empeche toute valeur invalide a la compilation
  readonly lang = signal<'fr' | 'en'>('fr');

  // --- Signal visitCount (bonus) ---
  // Compte le nombre de fois que l'utilisateur change la langue
  readonly visitCount = signal<number>(0);

  // --- Computed greeting ---
  // computed() cree un signal derive en lecture seule
  // Il se recalcule automatiquement quand name() ou lang() changent
  // Aucun abonnement manuel n'est necessaire : Angular detecte les dependances
  readonly greeting = computed<string>(() => {
    // Chaque appel a un signal (.name(), .lang()) enregistre une dependance
    const currentName = this.name();
    const currentLang = this.lang();

    // Retourne le message dans la langue courante
    if (currentLang === 'fr') {
      return `Bonjour, ${currentName} !`;
    }
    return `Hello, ${currentName}!`;
  });

  // --- Methode toggleLang ---
  // Bascule entre 'fr' et 'en' en utilisant .set() sur le signal
  // .update() est aussi possible : this.lang.update(l => l === 'fr' ? 'en' : 'fr')
  toggleLang(): void {
    // On lit la valeur courante, puis on set la nouvelle
    this.lang.set(this.lang() === 'fr' ? 'en' : 'fr');

    // Bonus : on incremente le compteur avec .update()
    // .update() prend la valeur precedente en parametre et retourne la nouvelle
    this.visitCount.update((count) => count + 1);
  }

  // --- Methode onNameChange ---
  // Appelee a chaque frappe dans l'input
  // On cast $event en Event pour satisfaire le typage strict (zero any)
  onNameChange(event: Event): void {
    // On caste target en HTMLInputElement pour acceder a .value
    const input = event.target as HTMLInputElement;
    this.name.set(input.value);
  }
}
```

## Ce que tu aurais pu oublier

### 1. Oublier `standalone: true`
- ❌ Ne pas mettre `standalone: true` → le composant nécessité un NgModule pour fonctionner
- ✅ Toujours ajouter `standalone: true` (où compter sur le defaut Angular 19+)

### 2. Appeler le signal sans parentheses dans le template
- ❌ `{{ greeting }}` → affiche `[Signal]` ou `function`
- ✅ `{{ greeting() }}` → appelle le signal et affiche sa valeur

### 3. Utiliser `any` pour l'événement
- ❌ `onNameChange(event: any)` → viole la contrainte zero `any`
- ✅ `onNameChange(event: Event)` puis cast `event.target as HTMLInputElement`

### 4. Confondre `set()` et `update()`
- ❌ `this.lang.set(l => ...)` → `set()` prend une valeur directe, pas une fonction
- ✅ `this.lang.set('en')` ou `this.lang.update(l => l === 'fr' ? 'en' : 'fr')`

### 5. Oublier de typer le signal lang
- ❌ `signal('fr')` → TypeScript infere `string`, on peut écrire n'importe quoi
- ✅ `signal<'fr' | 'en'>('fr')` → seules les valeurs `'fr'` et `'en'` sont acceptees

## Concepts clés utilises

| Concept | Explication |
|---------|-------------|
| `@Component` | Decorateur qui définit les metadonnees d'un composant Angular (selecteur, template, styles) |
| `standalone: true` | Le composant est autonome, pas besoin de NgModule |
| `signal<T>(value)` | Cree un signal mutable de type T avec une valeur initiale |
| `computed<T>(() => ...)` | Cree un signal dérivé en lecture seule qui se recalcule automatiquement |
| `signal.set(value)` | Remplace la valeur du signal par `value` |
| `signal.update(fn)` | Met a jour le signal en appliquant une fonction sur la valeur précédente |
| `{{ expr() }}` | Interpolation dans le template — les signaux necessitent les `()` |
| `(click)="method()"` | Event binding — ecoute un événement DOM et appelle une méthode |
| `(input)="handler($event)"` | Ecoute l'événement input et passe l'objet Event à la méthode |
| `[value]="signal()"` | Property binding — lie la propriété HTML `value` à la valeur du signal |
