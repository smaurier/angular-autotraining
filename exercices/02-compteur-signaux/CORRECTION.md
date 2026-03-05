# Correction — Exercice 02 : Compteur avec signaux

## Resultat attendu

Un compteur affichant :
- La valeur courante (ex: 5)
- Son double (ex: 10)
- Si le nombre est pair ou impair
- Trois boutons : +, -, Reset
- A chaque changement, un message s'affiche dans la console du navigateur

## Code corrige

```typescript
// src/app/exercises/ex02/counter.component.ts

// On importe les trois primitives reactives : signal, computed, effect
// signal : valeur reactive mutable
// computed : valeur derivee, lecture seule, recalculee automatiquement
// effect : effet de bord execute a chaque changement de ses dependances
import { Component, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [],
  template: `
    <div class="counter-container">
      <h1>Compteur Angular</h1>

      <!-- Affichage de la valeur courante -->
      <!-- On utilise le style binding [style.color] pour changer la couleur dynamiquement -->
      <p class="count" [style.color]="countColor()">
        Valeur : {{ count() }}
      </p>

      <!-- Affichage du double via le computed -->
      <p>Double : {{ double() }}</p>

      <!-- Control flow @if/@else pour afficher pair ou impair -->
      <!-- Nouvelle syntaxe Angular 17+ : @if remplace *ngIf -->
      @if (isEven()) {
        <p class="badge even">Pair</p>
      } @else {
        <p class="badge odd">Impair</p>
      }

      <!-- Boutons d'action -->
      <div class="actions">
        <!-- Le bouton - est desactive quand count() vaut 0 -->
        <!-- [disabled] est un property binding sur la propriete HTML disabled -->
        <button (click)="decrement()" [disabled]="count() === 0">-</button>

        <!-- Reset remet le compteur a 0 -->
        <button (click)="reset()" class="reset">Reset</button>

        <!-- Bouton + pour incrementer -->
        <button (click)="increment()">+</button>
      </div>

      <!-- Bonus : champ pour modifier le pas d'incrementation -->
      <div class="step-control">
        <label for="stepInput">Pas :</label>
        <input
          id="stepInput"
          type="number"
          [value]="step()"
          (input)="onStepChange($event)"
          min="1"
        />
      </div>
    </div>
  `,
  styles: [`
    .counter-container {
      padding: 2rem;
      max-width: 400px;
      font-family: sans-serif;
      text-align: center;
    }
    .count {
      font-size: 3rem;
      font-weight: bold;
      margin: 1rem 0;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: bold;
    }
    .even { background: #e8f5e9; color: #2e7d32; }
    .odd { background: #fff3e0; color: #e65100; }
    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin: 1.5rem 0;
    }
    .actions button {
      padding: 0.75rem 1.5rem;
      font-size: 1.25rem;
      cursor: pointer;
      border: none;
      border-radius: 8px;
      background: #1976d2;
      color: white;
    }
    .actions button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .actions button.reset {
      background: #757575;
    }
    .step-control {
      margin-top: 1rem;
    }
    .step-control input {
      width: 60px;
      padding: 0.25rem;
      font-size: 1rem;
      text-align: center;
    }
  `]
})
export class CounterComponent {

  // --- Signal count ---
  // Le compteur principal, mutable, initialise a 0
  readonly count = signal<number>(0);

  // --- Signal step (bonus) ---
  // Le pas d'incrementation/decrementation, modifiable par l'utilisateur
  readonly step = signal<number>(1);

  // --- Computed double ---
  // Se recalcule automatiquement a chaque changement de count()
  // Angular detecte la dependance car on appelle count() dans la fonction
  readonly double = computed<number>(() => this.count() * 2);

  // --- Computed isEven ---
  // Retourne true si count() est pair (modulo 2 === 0)
  readonly isEven = computed<boolean>(() => this.count() % 2 === 0);

  // --- Computed countColor (bonus) ---
  // Determine la couleur du compteur : vert, rouge ou gris
  readonly countColor = computed<string>(() => {
    const value = this.count();
    if (value > 0) return '#2e7d32';  // vert
    if (value < 0) return '#c62828';  // rouge
    return '#757575';                  // gris
  });

  // --- Effect ---
  // effect() cree un effet de bord qui s'execute :
  //   1. Une fois a l'initialisation
  //   2. A chaque fois qu'un signal lu a l'interieur change
  // Ici, il affiche la valeur du compteur dans la console
  // L'effect est automatiquement nettoye quand le composant est detruit
  constructor() {
    effect(() => {
      // L'appel a this.count() enregistre la dependance automatiquement
      console.log(`Compteur : ${this.count()}`);
    });
  }

  // --- Methode increment ---
  // Utilise .update() pour incrementer le compteur du pas courant
  // .update(fn) : prend la valeur precedente et retourne la nouvelle
  increment(): void {
    this.count.update((current) => current + this.step());
  }

  // --- Methode decrement ---
  // Decremente le compteur du pas courant
  decrement(): void {
    this.count.update((current) => current - this.step());
  }

  // --- Methode reset ---
  // Remet le compteur a 0 avec .set()
  // .set(value) : remplace directement la valeur
  reset(): void {
    this.count.set(0);
  }

  // --- Methode onStepChange (bonus) ---
  // Met a jour le signal step depuis l'input
  onStepChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    // parseInt car input.value est toujours une string
    const value = parseInt(input.value, 10);
    // On verifie que la valeur est un nombre valide avant de la setter
    if (!isNaN(value) && value > 0) {
      this.step.set(value);
    }
  }
}
```

## Ce que tu aurais pu oublier

### 1. L'effect dans le constructeur
- ❌ Mettre l'effect dans `ngOnInit` → fonctionne mais la convention Angular 19 est de le mettre dans le constructeur
- ✅ Declarer l'effect dans le `constructor()` — le contexte d'injection est disponible

### 2. Oublier les parentheses sur isEven dans le template
- ❌ `@if (isEven)` → evalue l'objet Signal (toujours truthy), le bloc s'affiche toujours
- ✅ `@if (isEven())` → appelle le computed et utilise la valeur booleenne

### 3. Ne pas desactiver le bouton -
- ❌ Pas de `[disabled]` → l'utilisateur peut passer en negatif sans le vouloir
- ✅ `[disabled]="count() === 0"` → le bouton est grise quand count vaut 0

### 4. Utiliser set() au lieu d'update() pour l'incrementation
- ❌ `this.count.set(this.count() + 1)` → fonctionne mais lit le signal deux fois
- ✅ `this.count.update(c => c + 1)` → plus idiomatique et plus sur

### 5. Oublier le nettoyage de l'effect
- ❌ S'inquieter du nettoyage manuel → inutile dans un composant
- ✅ Angular nettoie automatiquement les effects crees dans le constructeur quand le composant est detruit

## Concepts cles utilises

| Concept | Explication |
|---------|-------------|
| `signal<number>(0)` | Cree un signal mutable de type number initialise a 0 |
| `computed<T>(() => ...)` | Signal derive en lecture seule, recalcule quand ses dependances changent |
| `effect(() => ...)` | Effet de bord execute a chaque changement des signaux lus a l'interieur |
| `signal.update(fn)` | Met a jour le signal en appliquant une fonction de transformation |
| `@if / @else` | Nouvelle syntaxe de control flow Angular 17+ (remplace `*ngIf`) |
| `[disabled]="expr"` | Property binding qui desactive un element HTML quand l'expression est true |
| `[style.color]="expr"` | Style binding qui lie dynamiquement une propriete CSS |
