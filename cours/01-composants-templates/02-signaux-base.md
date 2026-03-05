# Cours 5 — Les signaux (Signals) : signal, computed, effect

> **Objectif** : Maîtriser les trois primitives réactives d'Angular — `signal()`, `computed()` et `effect()` — et comprendre leur correspondance directe avec `ref()`, `computed()` et `watchEffect()` de Vue 3.

---

## Rappel du cours précédent

<details>
<summary>1. Qu'est-ce qu'un composant standalone et pourquoi n'a-t-on plus besoin de NgModule ?</summary>

Un composant standalone embarque toutes ses dépendances directement via la propriété `imports` du décorateur `@Component`. Il est autonome et n'a pas besoin d'être déclaré dans un `NgModule`. C'est le comportement par défaut depuis Angular 17+.
</details>

<details>
<summary>2. Quelle est la différence entre `template` et `templateUrl` dans @Component ?</summary>

`template` contient le HTML directement dans le fichier TypeScript (inline), tandis que `templateUrl` pointe vers un fichier HTML externe. On ne peut utiliser que l'un ou l'autre, jamais les deux.
</details>

<details>
<summary>3. Comment importe-t-on un composant enfant dans un composant standalone ?</summary>

On l'ajoute dans le tableau `imports` du décorateur `@Component` :
```typescript
@Component({
  imports: [MonComposantEnfant],
  // ...
})
```
</details>

---

## Analogie

Pensez à un **tableur** (Excel/Google Sheets). Une cellule `A1` contient une valeur brute (un `signal`). Une cellule `B1` contient une formule `=A1 * 2` (un `computed`). Quand vous modifiez `A1`, `B1` se recalcule automatiquement.

Maintenant, imaginez une macro qui se déclenche à chaque changement pour envoyer un e-mail : c'est un `effect`. Vous n'en avez pas souvent besoin, mais c'est utile pour les effets de bord.

---

## Théorie

### signal() — La valeur réactive de base

Un `signal` est un conteneur réactif qui stocke une valeur et notifie Angular quand elle change.

```typescript
import { signal } from '@angular/core';

// Créer un signal avec une valeur initiale
const compteur = signal(0);

// LIRE la valeur : on appelle le signal comme une fonction
console.log(compteur());  // 0

// ÉCRIRE une nouvelle valeur
compteur.set(5);
console.log(compteur());  // 5

// METTRE À JOUR en fonction de la valeur précédente
compteur.update(valeur => valeur + 1);
console.log(compteur());  // 6
```

**Comparaison directe avec Vue 3** :

| Opération        | Vue 3 (`ref`)           | Angular (`signal`)         |
|------------------|-------------------------|----------------------------|
| Créer            | `const c = ref(0)`      | `const c = signal(0)`     |
| Lire             | `c.value`               | `c()`                      |
| Écrire           | `c.value = 5`           | `c.set(5)`                 |
| Mettre à jour    | `c.value++`             | `c.update(v => v + 1)`    |

> La différence principale : en Vue on accède via `.value`, en Angular on **appelle** le signal comme une fonction `()`.

### Utiliser un signal dans un composant

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-compteur',
  template: `
    <p>Compteur : {{ compteur() }}</p>
    <button (click)="incrementer()">+1</button>
    <button (click)="reinitialiser()">Réinitialiser</button>
  `,
})
export class CompteurComponent {
  compteur = signal(0);

  incrementer() {
    this.compteur.update(v => v + 1);
  }

  reinitialiser() {
    this.compteur.set(0);
  }
}
```

> Dans le template, on écrit `{{ compteur() }}` avec les parenthèses. Angular sait qu'il doit re-rendre uniquement quand le signal change.

### Mises à jour mutables vs immuables

Pour les objets et tableaux, Angular propose `update` pour les mises à jour **immuables** :

```typescript
// ✅ Immuable — crée un nouvel objet/tableau
const utilisateurs = signal<string[]>(['Alice', 'Bob']);

utilisateurs.update(liste => [...liste, 'Charlie']);
```

```typescript
// ❌ Mutation directe — Angular ne détecte PAS le changement
utilisateurs().push('Charlie');  // Le signal ne sait pas qu'il a changé !
```

> **Règle d'or** : ne mutez jamais directement la valeur d'un signal. Utilisez toujours `set()` ou `update()` pour qu'Angular détecte le changement.

### computed() — Les valeurs dérivées

Un `computed` crée un signal en lecture seule qui se recalcule automatiquement quand ses dépendances changent.

```typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-panier',
  template: `
    <p>Quantité : {{ quantite() }}</p>
    <p>Prix unitaire : {{ prixUnitaire() }} EUR</p>
    <p>Total : {{ total() }} EUR</p>
    <button (click)="ajouter()">Ajouter un article</button>
  `,
})
export class PanierComponent {
  quantite = signal(1);
  prixUnitaire = signal(9.99);

  // Se recalcule automatiquement quand quantite OU prixUnitaire changent
  total = computed(() => this.quantite() * this.prixUnitaire());

  ajouter() {
    this.quantite.update(q => q + 1);
    // total() se met à jour automatiquement !
  }
}
```

**Comparaison avec Vue 3** :

```javascript
// Vue 3
const quantite = ref(1);
const prixUnitaire = ref(9.99);
const total = computed(() => quantite.value * prixUnitaire.value);
```

```typescript
// Angular 19
const quantite = signal(1);
const prixUnitaire = signal(9.99);
const total = computed(() => quantite() * prixUnitaire());
```

> Quasi identique ! La seule différence est `()` au lieu de `.value`.

Caractéristiques de `computed()` :
- **Lecture seule** : on ne peut pas faire `total.set(...)`
- **Lazy** : ne recalcule que quand on lit la valeur ET qu'une dépendance a changé
- **Auto-tracking** : Angular détecte automatiquement les signaux lus dans la fonction

### effect() — Les effets de bord

Un `effect` exécute une fonction chaque fois qu'un signal lu à l'intérieur change. C'est l'équivalent de `watchEffect()` en Vue 3.

```typescript
import { Component, signal, effect } from '@angular/core';

@Component({
  selector: 'app-recherche',
  template: `
    <input
      [value]="terme()"
      (input)="terme.set($any($event.target).value)"
    />
  `,
})
export class RechercheComponent {
  terme = signal('');

  constructor() {
    // S'exécute à chaque changement de terme()
    effect(() => {
      console.log('Recherche :', this.terme());
      // Sauvegarder dans le localStorage, appeler une API, etc.
    });
  }
}
```

**Comparaison avec Vue 3** :

```javascript
// Vue 3
const terme = ref('');
watchEffect(() => {
  console.log('Recherche :', terme.value);
});
```

### Quand NE PAS utiliser effect()

`effect()` est puissant, mais souvent **mal utilisé**. Voici les pièges :

```typescript
// ❌ MAUVAIS : utiliser effect pour dériver une valeur
effect(() => {
  this.total.set(this.quantite() * this.prix());
});

// ✅ BON : utiliser computed à la place
total = computed(() => this.quantite() * this.prix());
```

```typescript
// ❌ MAUVAIS : utiliser effect pour transformer des données
effect(() => {
  this.nomComplet.set(this.prenom() + ' ' + this.nom());
});

// ✅ BON : c'est un computed
nomComplet = computed(() => this.prenom() + ' ' + this.nom());
```

**Cas légitimes pour `effect()`** :
- Synchroniser avec le `localStorage`
- Logger / analytics
- Interagir avec des API tierces non-Angular (D3.js, Google Maps, etc.)
- Mettre à jour le `document.title`

> **Règle** : si vous pouvez exprimer la logique avec `computed()`, ne prenez **jamais** `effect()`.

### Nettoyage d'un effect

Un `effect` peut retourner une fonction de nettoyage via `onCleanup` :

```typescript
effect((onCleanup) => {
  const terme = this.recherche();
  const timer = setTimeout(() => {
    this.lancerRecherche(terme);
  }, 300);

  onCleanup(() => clearTimeout(timer));
});
```

> Cela fonctionne exactement comme le `onCleanup` de `watchEffect` en Vue 3.

### Typage des signaux

```typescript
// Type inféré automatiquement
const nom = signal('Alice');       // WritableSignal<string>
const age = signal(25);            // WritableSignal<number>

// Type explicite quand nécessaire
const utilisateur = signal<Utilisateur | null>(null);
const tags = signal<string[]>([]);

// computed est un Signal<T> (lecture seule)
const majeur = computed(() => age() >= 18);  // Signal<boolean>
```

---

## Pratique

Créez un composant `ConvertisseurTemperature` avec :
1. Un signal `celsius` initialisé à `0`
2. Un `computed` `fahrenheit` qui convertit (formule : `C * 9/5 + 32`)
3. Un `computed` `message` qui affiche "Chaud !" si > 30°C, sinon "Frais"
4. Des boutons pour augmenter/diminuer de 5 degrés

<details>
<summary>Solution</summary>

```typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-convertisseur',
  template: `
    <h2>Convertisseur de température</h2>
    <p>Celsius : {{ celsius() }}°C</p>
    <p>Fahrenheit : {{ fahrenheit() }}°F</p>
    <p>{{ message() }}</p>
    <button (click)="ajuster(-5)">-5°C</button>
    <button (click)="ajuster(5)">+5°C</button>
    <button (click)="reinitialiser()">Réinitialiser</button>
  `,
})
export class ConvertisseurTemperatureComponent {
  celsius = signal(0);

  fahrenheit = computed(() =>
    Math.round(this.celsius() * 9 / 5 + 32)
  );

  message = computed(() =>
    this.celsius() > 30 ? 'Chaud !' : 'Frais'
  );

  ajuster(delta: number) {
    this.celsius.update(c => c + delta);
  }

  reinitialiser() {
    this.celsius.set(0);
  }
}
```
</details>

---

## Résumé

| Primitive      | Rôle                          | Vue 3 équivalent | Lecture     | Écriture          |
|----------------|-------------------------------|-------------------|-------------|-------------------|
| `signal()`     | Valeur réactive               | `ref()`           | `sig()`     | `set()` / `update()` |
| `computed()`   | Valeur dérivée (lecture seule)| `computed()`      | `comp()`    | Impossible        |
| `effect()`     | Effet de bord                 | `watchEffect()`   | —           | —                 |

**Points clés** :
- `signal()` = `ref()` mais avec `()` au lieu de `.value`
- `computed()` est quasi identique entre Angular et Vue
- `effect()` est à utiliser avec parcimonie — préférez `computed()` quand c'est possible
- Ne jamais muter directement un signal contenant un objet ou un tableau

---

> **Prochain cours** : [Cours 6 — Le nouveau control flow : @if, @for, @switch](./03-control-flow.md)
