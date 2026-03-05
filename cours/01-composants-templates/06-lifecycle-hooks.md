# Cours 9 — Cycle de vie des composants

> **Objectif** : Comprendre le cycle de vie d'un composant Angular, maîtriser les hooks essentiels (`ngOnInit`, `ngOnDestroy`, `afterNextRender`), et savoir gérer le nettoyage avec `DestroyRef`. Faire le parallèle avec les hooks Vue 3 (`onMounted`, `onUnmounted`, etc.).

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre input() et model() ?</summary>

`input()` crée un signal en lecture seule — le composant enfant ne peut pas modifier la valeur. `model()` crée un signal en lecture/écriture avec synchronisation bidirectionnelle vers le parent (équivalent de `v-model` en Vue).
</details>

<details>
<summary>2. Comment rend-on un input obligatoire en Angular 19 ?</summary>

Avec `input.required<Type>()`. Si le parent ne fournit pas la valeur, le compilateur génère une erreur.
</details>

<details>
<summary>3. Quelle syntaxe utilise-t-on côté parent pour un binding bidirectionnel avec model() ?</summary>

La syntaxe « banana in a box » : `[(propriété)]="valeur"`. Par exemple : `[(actif)]="monSignal"`.
</details>

---

## Analogie

Pensez au **cycle de vie d'un employé** dans une entreprise :
1. **Constructor** : le contrat est signé, mais l'employé n'est pas encore à son bureau
2. **ngOnInit** : premier jour — l'employé s'installe, reçoit son matériel, découvre ses missions
3. **ngOnChanges** : les missions changent — on le prévient à chaque nouveau projet
4. **afterNextRender** : l'employé a accès à son bureau physique (le DOM est prêt)
5. **ngOnDestroy / DestroyRef** : l'employé quitte l'entreprise — il rend son matériel, ferme ses accès

On ne décore pas le bureau avant que l'employé arrive (pas d'accès au DOM dans le constructor), et on nettoie tout quand il part (désabonnements, timers).

---

## Théorie

### Vue d'ensemble du cycle de vie

```
  Constructor
       │
       ▼
  ngOnChanges (si inputs)
       │
       ▼
  ngOnInit          ← Initialisation (1 seule fois)
       │
       ▼
  afterNextRender   ← DOM disponible (1 seule fois, côté client)
       │
       ▼
  ┌──────────────┐
  │ Vie active   │ ← ngOnChanges à chaque changement d'input
  │              │ ← afterRender à chaque rendu
  └──────────────┘
       │
       ▼
  ngOnDestroy       ← Nettoyage
```

### Constructor vs ngOnInit

Le **constructor** est un concept TypeScript/JavaScript classique. `ngOnInit` est spécifique à Angular.

```typescript
import { Component, OnInit, input, signal } from '@angular/core';

@Component({
  selector: 'app-utilisateur',
  template: `<p>{{ salutation() }}</p>`,
})
export class UtilisateurComponent implements OnInit {
  nom = input.required<string>();
  salutation = signal('');

  constructor() {
    // ❌ Les inputs ne sont PAS encore disponibles ici
    console.log(this.nom());  // Erreur ou valeur par défaut !

    // ✅ Bon pour : injecter des services (fait automatiquement par Angular)
  }

  ngOnInit() {
    // ✅ Les inputs SONT disponibles
    this.salutation.set(`Bonjour ${this.nom()} !`);
    console.log('Composant initialisé avec :', this.nom());
  }
}
```

| Aspect             | Constructor                        | ngOnInit                         |
|--------------------|------------------------------------|----------------------------------|
| Quand              | À la création de la classe         | Après la 1re détection de changement |
| Inputs disponibles | Non                                | Oui                              |
| DOM disponible     | Non                                | Non                              |
| Utilisation        | Injection de dépendances           | Initialisation avec les inputs   |

**Comparaison avec Vue 3** :
- Le `constructor` Angular n'a pas d'équivalent direct en Vue (le `<script setup>` s'exécute une fois)
- `ngOnInit` est similaire à `onMounted` en Vue, mais **sans accès au DOM**

### ngOnInit — L'initialisation

Implémentez l'interface `OnInit` pour utiliser ce hook :

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { UtilisateurService } from './utilisateur.service';

@Component({
  selector: 'app-profil',
  template: `
    @if (utilisateur(); as user) {
      <h2>{{ user.nom }}</h2>
      <p>{{ user.email }}</p>
    } @else {
      <p>Chargement...</p>
    }
  `,
})
export class ProfilComponent implements OnInit {
  private utilisateurService = inject(UtilisateurService);
  utilisateur = signal<Utilisateur | null>(null);

  ngOnInit() {
    // ✅ Charger les données au démarrage
    this.utilisateurService.getUtilisateur().subscribe(user => {
      this.utilisateur.set(user);
    });
  }
}
```

> **Quand utiliser ngOnInit** : chargement de données, initialisation qui dépend des inputs, souscription à des observables.

### ngOnDestroy — Le nettoyage

Se déclenche quand le composant est supprimé du DOM :

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-horloge',
  template: `<p>{{ temps() }}</p>`,
})
export class HorlogeComponent implements OnInit, OnDestroy {
  temps = signal(new Date().toLocaleTimeString());
  private souscription?: Subscription;

  ngOnInit() {
    this.souscription = interval(1000).subscribe(() => {
      this.temps.set(new Date().toLocaleTimeString());
    });
  }

  ngOnDestroy() {
    // ✅ Toujours se désabonner pour éviter les fuites mémoire
    this.souscription?.unsubscribe();
    console.log('Horloge détruite, souscription nettoyée');
  }
}
```

> En Vue 3, c'est `onUnmounted(() => { /* nettoyage */ })`.

### DestroyRef et takeUntilDestroyed — L'approche moderne

`DestroyRef` est une alternative plus élégante à `ngOnDestroy`, surtout pour les observables :

```typescript
import { Component, inject, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

@Component({
  selector: 'app-horloge',
  template: `<p>{{ temps() }}</p>`,
})
export class HorlogeComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  temps = signal(new Date().toLocaleTimeString());

  ngOnInit() {
    // Se désabonne automatiquement quand le composant est détruit
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.temps.set(new Date().toLocaleTimeString());
      });
  }
}
```

On peut aussi enregistrer des callbacks de nettoyage manuellement :

```typescript
export class MonComposant {
  private destroyRef = inject(DestroyRef);

  constructor() {
    // Enregistrer un callback de nettoyage
    this.destroyRef.onDestroy(() => {
      console.log('Nettoyage personnalisé');
      // Fermer une connexion WebSocket, annuler un timer, etc.
    });
  }
}
```

#### takeUntilDestroyed dans le constructor

Cas spécial : dans le constructor (ou dans un contexte d'injection), `takeUntilDestroyed()` peut être appelé sans argument :

```typescript
export class RechercheComponent {
  terme = signal('');

  constructor() {
    // ✅ Dans le constructor, pas besoin de passer destroyRef
    interval(5000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.rafraichir());
  }

  rafraichir() { /* ... */ }
}
```

### afterNextRender et afterRender — Accès au DOM

Ces hooks s'exécutent **après le rendu dans le navigateur**. Ils ne s'exécutent pas côté serveur (SSR).

```typescript
import { Component, afterNextRender, afterRender, signal, ElementRef, viewChild } from '@angular/core';

@Component({
  selector: 'app-graphique',
  template: `<canvas #canvas width="400" height="200"></canvas>`,
})
export class GraphiqueComponent {
  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    // S'exécute UNE SEULE FOIS après le premier rendu
    afterNextRender(() => {
      const ctx = this.canvas().nativeElement.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#3498db';
        ctx.fillRect(10, 10, 100, 50);
        console.log('Canvas initialisé !');
      }
    });
  }
}
```

```typescript
@Component({
  selector: 'app-scroll-espion',
  template: `<div #contenu>{{ texte() }}</div>`,
})
export class ScrollEspionComponent {
  texte = signal('Lorem ipsum...');

  constructor() {
    // S'exécute APRÈS CHAQUE rendu
    afterRender(() => {
      console.log('Le DOM a été mis à jour');
    });
  }
}
```

| Hook              | Fréquence         | Cas d'usage                              |
|-------------------|--------------------|------------------------------------------|
| `afterNextRender` | 1 seule fois       | Initialiser un canvas, une lib tierce    |
| `afterRender`     | Après chaque rendu | Mesurer le DOM, synchroniser le scroll   |

**Comparaison avec Vue 3** :
- `afterNextRender` correspond à `onMounted` (accès au DOM, une seule fois)
- `afterRender` correspond à `onUpdated` (après chaque mise à jour du DOM)

### ngOnChanges — Réagir aux changements d'inputs

`ngOnChanges` se déclenche quand un input change. Avec les signaux, il est **moins utile** car on peut utiliser `computed()` ou `effect()` à la place.

```typescript
import { Component, OnChanges, SimpleChanges, input } from '@angular/core';

@Component({
  selector: 'app-journal',
  template: `<p>{{ message() }}</p>`,
})
export class JournalComponent implements OnChanges {
  nom = input.required<string>();
  message = signal('');

  // ⚠️ Approche classique (moins utilisée avec les signaux)
  ngOnChanges(changes: SimpleChanges) {
    if (changes['nom']) {
      console.log(
        'Ancien :',  changes['nom'].previousValue,
        'Nouveau :', changes['nom'].currentValue
      );
    }
  }
}
```

**Alternative avec les signaux** (préférable) :

```typescript
export class JournalComponent {
  nom = input.required<string>();

  // ✅ Préférez computed pour les valeurs dérivées
  message = computed(() => `Bienvenue, ${this.nom()} !`);

  constructor() {
    // ✅ Ou effect pour les effets de bord
    effect(() => {
      console.log('Le nom a changé :', this.nom());
    });
  }
}
```

### Tableau comparatif complet : Angular vs Vue 3

| Phase               | Angular                            | Vue 3                          |
|---------------------|------------------------------------|---------------------------------|
| Création            | `constructor`                      | `<script setup>` (exécution)   |
| Initialisation      | `ngOnInit`                         | Pas d'équivalent exact         |
| DOM prêt (1 fois)   | `afterNextRender`                  | `onMounted`                    |
| DOM mis à jour       | `afterRender`                     | `onUpdated`                    |
| Input changé        | `ngOnChanges` / `computed` / `effect` | `watch` / `computed`        |
| Destruction         | `ngOnDestroy` / `DestroyRef`       | `onUnmounted`                  |
| Nettoyage auto      | `takeUntilDestroyed`               | Nettoyage auto dans `<script setup>` |

### Bonnes pratiques

```typescript
// ✅ BON : utiliser DestroyRef + takeUntilDestroyed
export class BonExemple {
  constructor() {
    monObservable$
      .pipe(takeUntilDestroyed())
      .subscribe(val => this.traiter(val));
  }
}

// ❌ MAUVAIS : oublier de se désabonner
export class MauvaisExemple implements OnInit {
  ngOnInit() {
    monObservable$.subscribe(val => this.traiter(val));
    // Fuite mémoire si le composant est détruit !
  }
}
```

```typescript
// ✅ BON : afterNextRender pour le DOM
constructor() {
  afterNextRender(() => {
    this.initialiserGraphique();
  });
}

// ❌ MAUVAIS : accéder au DOM dans ngOnInit
ngOnInit() {
  document.querySelector('#graphique');  // Peut ne pas exister encore !
}
```

---

## Pratique

Créez un composant `Chronometre` qui :
1. Affiche les secondes écoulées depuis le chargement
2. Utilise `interval` de RxJS avec `takeUntilDestroyed`
3. A un bouton pause/reprendre
4. Affiche un message dans la console quand le composant est détruit
5. Utilise `afterNextRender` pour afficher "Chronomètre prêt !" dans la console

<details>
<summary>Solution</summary>

```typescript
import {
  Component,
  signal,
  inject,
  DestroyRef,
  afterNextRender,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, Subject, switchMap, merge, EMPTY } from 'rxjs';

@Component({
  selector: 'app-chronometre',
  template: `
    <h2>Chronomètre</h2>
    <p class="temps">{{ secondes() }}s</p>
    <button (click)="basculerPause()">
      {{ enPause() ? '▶ Reprendre' : '⏸ Pause' }}
    </button>
    <button (click)="reinitialiser()">Réinitialiser</button>
  `,
  styles: [`
    .temps { font-size: 2rem; font-family: monospace; }
    button { margin: 4px; padding: 8px 16px; }
  `],
})
export class ChronometreComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  secondes = signal(0);
  enPause = signal(false);

  constructor() {
    afterNextRender(() => {
      console.log('Chronomètre prêt !');
    });

    this.destroyRef.onDestroy(() => {
      console.log('Chronomètre détruit, ressources libérées');
    });
  }

  ngOnInit() {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.enPause()) {
          this.secondes.update(s => s + 1);
        }
      });
  }

  basculerPause() {
    this.enPause.update(v => !v);
  }

  reinitialiser() {
    this.secondes.set(0);
  }
}
```
</details>

---

## Résumé

| Hook / API             | Quand                            | Cas d'usage principal                |
|------------------------|----------------------------------|--------------------------------------|
| `constructor`          | Création de la classe            | Injection de services               |
| `ngOnInit`             | Après le 1er changement détecté  | Charger des données, lire les inputs |
| `ngOnChanges`          | À chaque changement d'input     | Rarement utile avec les signaux      |
| `afterNextRender`      | Après le 1er rendu (client)      | Initialiser canvas, lib tierce       |
| `afterRender`          | Après chaque rendu (client)      | Mesurer le DOM                       |
| `ngOnDestroy`          | Suppression du composant         | Nettoyage (ancien style)             |
| `DestroyRef`           | Suppression du composant         | Nettoyage (style moderne)            |
| `takeUntilDestroyed`   | Suppression du composant         | Désabonnement automatique RxJS       |

**Points clés** :
- Préférez `DestroyRef` et `takeUntilDestroyed` plutôt que `ngOnDestroy`
- Utilisez `afterNextRender` au lieu de `ngOnInit` quand vous avez besoin du DOM
- Avec les signaux, `computed()` et `effect()` remplacent souvent `ngOnChanges`
- Nettoyez **toujours** vos souscriptions pour éviter les fuites mémoire

---

> **Prochain cours** : [Cours 10 — Pipes et directives](./07-pipes-et-directives.md)
