# Cours — @defer et Zoneless Change Detection

> **Objectif** : Maitriser le chargement differe de composants avec `@defer` (Angular 17+) et comprendre le mode zoneless avec les signals (Angular 18+). Ces deux fonctionnalites representent l'avenir de la performance Angular.

---

## Rappel du cours precedent

<details>
<summary>1. Qu'est-ce qu'un signal Angular et comment en creer un ?</summary>

Un signal est une valeur reactive. On le cree avec `signal()` et on le lit en l'appelant comme une fonction :

```typescript
const compteur = signal(0);
console.log(compteur()); // 0
compteur.set(1);
```
</details>

<details>
<summary>2. Quelle est la difference entre `computed` et `effect` ?</summary>

- `computed` : derive une valeur a partir d'autres signals (lecture seule, synchrone)
- `effect` : execute un effet de bord quand un signal change (logging, localStorage, API call)
</details>

<details>
<summary>3. Comment Angular detecte-t-il les changements dans le template ?</summary>

Par defaut, Angular utilise **zone.js** qui intercepte les evenements asynchrones (click, setTimeout, HTTP) et declenche un cycle de detection de changements sur tout l'arbre de composants.
</details>

---

## Analogie

Imaginez un **restaurant**. Aujourd'hui, le serveur (zone.js) surveille en permanence toutes les tables : des qu'un client leve le bras, parle, ou meme respire, le serveur fait le tour de TOUTES les tables pour voir si quelqu'un a besoin de quelque chose. C'est epuisant et inefficace.

**`@defer`**, c'est comme un menu qui ne prepare certains plats que quand le client les commande — pas avant.

**Zoneless**, c'est comme remplacer le serveur hyperactif par des **boutons d'appel sur chaque table** (les signals). Chaque table signale elle-meme quand elle a besoin d'attention. Plus besoin de faire le tour en permanence.

---

## Partie 1 — @defer (Angular 17+)

### 1.1 Le probleme : tout charger d'un coup

Dans une application Angular classique, tous les composants importes dans un template sont inclus dans le bundle initial, meme s'ils ne sont jamais affiches :

```typescript
// ❌ Probleme : GraphiqueVentes est un composant lourd (chart.js, 200KB)
// Il est charge immediatement meme si l'utilisateur ne scrolle jamais
@Component({
  selector: 'app-dashboard',
  imports: [GraphiqueVentesComponent, TableauClientsComponent, CarteResumeComponent],
  template: `
    <app-carte-resume />
    <app-tableau-clients />
    <!-- Ce composant est en bas de page, rarement visible -->
    <app-graphique-ventes />
  `,
})
export class DashboardComponent {}
```

### 1.2 Syntaxe de base

`@defer` cree un **lazy boundary** : le composant a l'interieur n'est charge que lorsqu'une condition est remplie.

```typescript
@Component({
  selector: 'app-dashboard',
  imports: [GraphiqueVentesComponent, TableauClientsComponent, CarteResumeComponent],
  template: `
    <app-carte-resume />
    <app-tableau-clients />

    <!-- ✅ Le composant n'est charge que quand il entre dans le viewport -->
    @defer (on viewport) {
      <app-graphique-ventes />
    } @loading {
      <div class="skeleton" aria-busy="true">
        <p>Chargement du graphique...</p>
      </div>
    } @error {
      <p role="alert">Erreur lors du chargement du graphique.</p>
    } @placeholder {
      <div class="placeholder" style="height: 400px;">
        <p>Graphique des ventes</p>
      </div>
    }
  `,
})
export class DashboardComponent {}
```

### 1.3 Les blocs @defer

| Bloc | Role | Obligatoire |
|------|------|-------------|
| `@defer` | Contenu a charger en differe | Oui |
| `@placeholder` | Affiche avant le declenchement du chargement | Non |
| `@loading` | Affiche pendant le telechargement du chunk | Non |
| `@error` | Affiche si le chargement echoue | Non |

**Ordre d'affichage** : `@placeholder` → `@loading` → `@defer` (ou `@error`)

```typescript
// Options avancees pour @loading et @placeholder
template: `
  @defer (on viewport) {
    <app-graphique-ventes />
  } @loading (minimum 500ms; after 100ms) {
    <!-- S'affiche apres 100ms de chargement, reste visible 500ms minimum -->
    <!-- Evite le flash si le chargement est tres rapide -->
    <app-spinner />
  } @placeholder (minimum 200ms) {
    <!-- Reste visible au moins 200ms pour eviter le clignotement -->
    <div class="placeholder">Graphique des ventes</div>
  }
`
```

### 1.4 Les triggers

#### `on viewport` — quand l'element entre dans le viewport

```html
<!-- Le @placeholder (ou le @defer lui-meme) sert de sentinelle -->
@defer (on viewport) {
  <app-commentaires />
} @placeholder {
  <div style="height: 200px;">Commentaires</div>
}
```

#### `on idle` — quand le navigateur est inactif

```html
<!-- Utilise requestIdleCallback — charge quand le navigateur n'a rien a faire -->
@defer (on idle) {
  <app-panneau-analytics />
}
```

#### `on interaction` — au clic ou focus sur un element

```html
<!-- Charge le contenu quand l'utilisateur clique sur le bouton -->
<button #btnDetails>Voir les details</button>

@defer (on interaction(btnDetails)) {
  <app-details-produit [id]="produitId" />
} @placeholder {
  <p>Cliquez pour voir les details.</p>
}
```

#### `on hover` — au survol d'un element

```html
<!-- Charge au survol — utile pour les previews -->
<div #zonePreview>
  Survolez pour la preview

  @defer (on hover(zonePreview)) {
    <app-preview-image [src]="imageUrl" />
  } @placeholder {
    <div class="preview-placeholder"></div>
  }
</div>
```

#### `on timer(duree)` — apres un delai

```html
<!-- Charge apres 2 secondes -->
@defer (on timer(2000ms)) {
  <app-banniere-promo />
}
```

#### `when condition` — quand une expression est vraie

```typescript
@Component({
  selector: 'app-profil',
  template: `
    <button (click)="afficherParametres.set(true)">
      Parametres avances
    </button>

    <!-- Charge quand le signal est true -->
    @defer (when afficherParametres()) {
      <app-parametres-avances />
    } @placeholder {
      <p>Les parametres avances seront charges a la demande.</p>
    }
  `,
})
export class ProfilComponent {
  afficherParametres = signal(false);
}
```

#### Combiner plusieurs triggers

```html
<!-- Charge au viewport OU apres 5 secondes (le premier qui se declenche) -->
@defer (on viewport; on timer(5000ms)) {
  <app-section-temoignages />
}
```

### 1.5 Prefetch — telecharger sans afficher

Le prefetch telecharge le code JavaScript en avance, mais n'instancie pas le composant avant que le trigger principal se declenche.

```html
<!-- Telecharge le chunk quand le navigateur est inactif -->
<!-- Mais n'affiche le composant que quand il entre dans le viewport -->
@defer (on viewport; prefetch on idle) {
  <app-graphique-ventes />
} @loading {
  <!-- Le chargement sera quasi-instantane car le chunk est deja telecharge -->
  <app-spinner />
}
```

```html
<!-- Prefetch au hover, affiche au clic -->
<button #btnAdmin>Administration</button>

@defer (on interaction(btnAdmin); prefetch on hover(btnAdmin)) {
  <app-panneau-admin />
} @placeholder {
  <p>Panneau d'administration</p>
}
```

### 1.6 Exemple complet — Dashboard avec @defer

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  template: `
    <h1>Tableau de bord</h1>

    <!-- Section 1 : toujours visible, chargee immediatement -->
    <section class="resume">
      <app-carte-resume titre="Ventes" [valeur]="ventes()" />
      <app-carte-resume titre="Clients" [valeur]="clients()" />
      <app-carte-resume titre="Commandes" [valeur]="commandes()" />
    </section>

    <!-- Section 2 : charge quand le navigateur est libre -->
    @defer (on idle) {
      <section class="tableau">
        <h2>Dernieres commandes</h2>
        <app-tableau-commandes />
      </section>
    } @placeholder (minimum 200ms) {
      <div class="skeleton-table" aria-hidden="true"></div>
    }

    <!-- Section 3 : charge quand visible dans le viewport -->
    @defer (on viewport; prefetch on idle) {
      <section class="graphiques">
        <h2>Statistiques</h2>
        <app-graphique-ventes />
        <app-graphique-tendances />
      </section>
    } @loading (minimum 300ms; after 100ms) {
      <div class="loading" aria-busy="true">
        <app-spinner />
        <p>Chargement des graphiques...</p>
      </div>
    } @error {
      <div role="alert" class="erreur">
        <p>Impossible de charger les graphiques. Verifiez votre connexion.</p>
        <button (click)="recharger()">Reessayer</button>
      </div>
    } @placeholder {
      <div class="placeholder-graphiques" style="height: 500px;">
        <p>Les graphiques se chargeront quand vous ferez defiler.</p>
      </div>
    }

    <!-- Section 4 : panneau admin, charge au clic -->
    <button #btnAdmin class="btn-admin">
      Panneau d'administration
    </button>

    @defer (on interaction(btnAdmin); prefetch on hover(btnAdmin)) {
      <app-panneau-admin />
    } @placeholder {
      <p class="hint">Cliquez pour ouvrir le panneau d'administration.</p>
    }
  `,
})
export class DashboardComponent {
  ventes = signal(125_000);
  clients = signal(3_420);
  commandes = signal(89);

  recharger(): void {
    window.location.reload();
  }
}
```

**Impact sur le bundle** : chaque bloc `@defer` cree automatiquement un chunk JavaScript separe. Le bundle initial ne contient que les composants affiches immediatement.

---

## Partie 2 — Zoneless Change Detection (Angular 18+)

### 2.1 Pourquoi zone.js est un probleme

**zone.js** est une librairie qui intercepte (monkey-patch) toutes les API asynchrones du navigateur :

```
zone.js intercepte :
├── setTimeout / setInterval
├── Promise.then / catch
├── addEventListener (click, input, keydown...)
├── XMLHttpRequest / fetch
├── requestAnimationFrame
└── MutationObserver
```

**Les problemes :**

| Probleme | Detail |
|----------|--------|
| **Bundle size** | zone.js ajoute ~13 KB (gzipped) au bundle initial |
| **Monkey-patching** | Modifie les API natives — source de bugs subtils |
| **Performance** | Chaque event async declenche un cycle de detection sur TOUT l'arbre |
| **Debugging** | Stack traces polluees par zone.js, difficiles a lire |
| **Compatibilite** | Conflits avec certaines librairies tierces (e.g., Google Maps) |

```typescript
// Illustration du probleme : zone.js declenche inutilement
@Component({
  selector: 'app-horloge',
  template: `<p>{{ heure }}</p>`,
})
export class HorlogeComponent {
  heure = new Date().toLocaleTimeString();

  constructor() {
    // ❌ Ce setInterval declenche un cycle de detection de changements
    // sur TOUT l'arbre de composants, chaque seconde
    setInterval(() => {
      this.heure = new Date().toLocaleTimeString();
    }, 1000);
  }
}
```

### 2.2 Comment les signals rendent zoneless possible

Les signals informent Angular **exactement** quels composants ont change. Plus besoin de verifier tout l'arbre :

```
Avec zone.js (avant) :
Event async → zone.js intercepte → verifie TOUS les composants → met a jour le DOM

Avec signals (apres) :
Signal.set() → Angular sait EXACTEMENT quel composant → met a jour UNIQUEMENT ce composant
```

```typescript
// ✅ Avec signals : Angular sait precisement quoi mettre a jour
@Component({
  selector: 'app-horloge',
  template: `<p>{{ heure() }}</p>`,
})
export class HorlogeComponent {
  heure = signal(new Date().toLocaleTimeString());

  constructor() {
    setInterval(() => {
      this.heure.set(new Date().toLocaleTimeString());
    }, 1000);
  }
}
```

### 2.3 Activer le mode zoneless

#### Etape 1 : Configurer le bootstrap

```typescript
// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import {
  provideExperimentalZonelessChangeDetection
} from '@angular/core';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers ?? []),
    // ✅ Active le mode zoneless
    provideExperimentalZonelessChangeDetection(),
  ],
});
```

#### Etape 2 : Retirer zone.js du build

```typescript
// angular.json (extrait)
{
  "projects": {
    "mon-app": {
      "architect": {
        "build": {
          "options": {
            // ❌ Retirer cette ligne :
            // "polyfills": ["zone.js"],
            // ✅ La remplacer par :
            "polyfills": []
          }
        }
      }
    }
  }
}
```

#### Etape 3 : Verifier les tests

```typescript
// angular.json — section "test"
{
  "test": {
    "options": {
      // ❌ Retirer aussi pour les tests :
      // "polyfills": ["zone.js", "zone.js/testing"],
      "polyfills": []
    }
  }
}
```

### 2.4 Ce qui fonctionne en zoneless

Tout code base sur les **signals** ou les **API Angular** fonctionne directement :

```typescript
@Component({
  selector: 'app-compteur',
  template: `
    <h2>Compteur : {{ compteur() }}</h2>
    <p>Double : {{ double() }}</p>
    <button (click)="incrementer()">+1</button>
    <button (click)="decrementer()">-1</button>
    <button (click)="reset()">Reset</button>
  `,
})
export class CompteurComponent {
  // ✅ Signals : Angular detecte les changements automatiquement
  compteur = signal(0);
  double = computed(() => this.compteur() * 2);

  incrementer(): void {
    this.compteur.update(n => n + 1);
  }

  decrementer(): void {
    this.compteur.update(n => n - 1);
  }

  reset(): void {
    this.compteur.set(0);
  }
}
```

```typescript
// ✅ Les Observables via async pipe ou toSignal fonctionnent aussi
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-utilisateurs',
  template: `
    @if (utilisateurs(); as users) {
      <ul>
        @for (user of users; track user.id) {
          <li>{{ user.nom }}</li>
        }
      </ul>
    } @else {
      <p>Chargement...</p>
    }
  `,
})
export class UtilisateursComponent {
  private http = inject(HttpClient);

  // toSignal convertit l'Observable en signal — compatible zoneless
  utilisateurs = toSignal(
    this.http.get<{ id: number; nom: string }[]>('/api/utilisateurs')
  );
}
```

### 2.5 Ce qui casse en zoneless

#### Probleme 1 : `setTimeout` / `setInterval` sans signal

```typescript
// ❌ CASSE : la vue ne se met pas a jour
@Component({
  selector: 'app-timer',
  template: `<p>{{ message }}</p>`,
})
export class TimerComponent {
  message = 'En attente...';

  constructor() {
    setTimeout(() => {
      // Angular ne detecte PAS ce changement sans zone.js
      this.message = 'Termine !';
    }, 3000);
  }
}
```

```typescript
// ✅ CORRIGE : utiliser un signal
@Component({
  selector: 'app-timer',
  template: `<p>{{ message() }}</p>`,
})
export class TimerComponent {
  message = signal('En attente...');

  constructor() {
    setTimeout(() => {
      // Angular detecte le changement via le signal
      this.message.set('Termine !');
    }, 3000);
  }
}
```

#### Probleme 2 : Mutation d'objets sans signal

```typescript
// ❌ CASSE : mutation directe d'un tableau
@Component({
  selector: 'app-liste',
  template: `
    <ul>
      @for (item of items; track item) {
        <li>{{ item }}</li>
      }
    </ul>
    <button (click)="ajouter()">Ajouter</button>
  `,
})
export class ListeComponent {
  items = ['A', 'B', 'C'];

  ajouter(): void {
    this.items.push('D'); // ❌ Mutation directe, pas detectee
  }
}
```

```typescript
// ✅ CORRIGE : utiliser un signal avec update
@Component({
  selector: 'app-liste',
  template: `
    <ul>
      @for (item of items(); track item) {
        <li>{{ item }}</li>
      }
    </ul>
    <button (click)="ajouter()">Ajouter</button>
  `,
})
export class ListeComponent {
  items = signal(['A', 'B', 'C']);

  ajouter(): void {
    this.items.update(liste => [...liste, 'D']); // ✅ Nouvelle reference
  }
}
```

#### Probleme 3 : ChangeDetectorRef.detectChanges()

```typescript
// ❌ Ne fonctionne plus comme avant en zoneless
constructor(private cdr: ChangeDetectorRef) {
  someExternalLib.onUpdate(() => {
    this.data = newData;
    this.cdr.detectChanges(); // ❌ Pas fiable en zoneless
  });
}

// ✅ Utiliser un signal a la place
data = signal<Data | null>(null);

constructor() {
  someExternalLib.onUpdate((newData: Data) => {
    this.data.set(newData); // ✅ Angular reagit au signal
  });
}
```

### 2.6 Migration progressive

Vous n'etes pas oblige de tout migrer d'un coup. Voici une strategie en 3 etapes :

#### Etape 1 : Convertir les proprietes en signals (sans activer zoneless)

```typescript
// Avant
@Component({
  template: `<p>{{ nom }}</p>`,
})
export class ProfilComponent {
  nom = '';

  ngOnInit(): void {
    this.nom = 'Alice';
  }
}

// Apres — toujours avec zone.js, mais pret pour zoneless
@Component({
  template: `<p>{{ nom() }}</p>`,
})
export class ProfilComponent {
  nom = signal('');

  ngOnInit(): void {
    this.nom.set('Alice');
  }
}
```

#### Etape 2 : Convertir les Observables avec `toSignal`

```typescript
// Avant
@Component({
  template: `<p>{{ data | async }}</p>`,
})
export class DataComponent {
  data$ = this.http.get<string>('/api/data');
  constructor(private http: HttpClient) {}
}

// Apres
@Component({
  template: `<p>{{ data() }}</p>`,
})
export class DataComponent {
  private http = inject(HttpClient);
  data = toSignal(this.http.get<string>('/api/data'), { initialValue: '' });
}
```

#### Etape 3 : Activer zoneless et corriger les composants qui cassent

```typescript
// Chercher dans tout le projet :
// 1. Les proprietes de classe utilisees dans les templates sans signal
// 2. Les setTimeout/setInterval qui modifient l'etat
// 3. Les appels a ChangeDetectorRef
// 4. Les mutations directes d'objets/tableaux
```

### 2.7 Exemple complet — Application zoneless avec signals

```typescript
// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(),
  ],
});
```

```typescript
// app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <nav>
      <a routerLink="/">Accueil</a>
      <a routerLink="/taches">Taches</a>
    </nav>
    <main>
      <router-outlet />
    </main>
  `,
})
export class AppComponent {}
```

```typescript
// taches.component.ts
import { Component, signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

interface Tache {
  id: number;
  titre: string;
  terminee: boolean;
}

@Component({
  selector: 'app-taches',
  template: `
    <h1>Mes taches ({{ nombreRestantes() }} restantes)</h1>

    <form (submit)="ajouterTache($event)">
      <input
        #champTache
        type="text"
        placeholder="Nouvelle tache..."
        [value]="nouvelleTache()"
        (input)="nouvelleTache.set(champTache.value)"
      />
      <button type="submit" [disabled]="!nouvelleTache()">Ajouter</button>
    </form>

    <div class="filtres">
      <button
        [class.actif]="filtre() === 'toutes'"
        (click)="filtre.set('toutes')"
      >Toutes</button>
      <button
        [class.actif]="filtre() === 'actives'"
        (click)="filtre.set('actives')"
      >Actives</button>
      <button
        [class.actif]="filtre() === 'terminees'"
        (click)="filtre.set('terminees')"
      >Terminees</button>
    </div>

    <ul>
      @for (tache of tachesFiltrees(); track tache.id) {
        <li [class.terminee]="tache.terminee">
          <label>
            <input
              type="checkbox"
              [checked]="tache.terminee"
              (change)="toggleTache(tache.id)"
            />
            {{ tache.titre }}
          </label>
          <button (click)="supprimerTache(tache.id)" aria-label="Supprimer {{ tache.titre }}">
            ✕
          </button>
        </li>
      } @empty {
        <li class="vide">Aucune tache.</li>
      }
    </ul>
  `,
})
export class TachesComponent {
  // State — tout en signals
  taches = signal<Tache[]>([
    { id: 1, titre: 'Apprendre les signals', terminee: true },
    { id: 2, titre: 'Migrer vers zoneless', terminee: false },
    { id: 3, titre: 'Ajouter @defer', terminee: false },
  ]);

  nouvelleTache = signal('');
  filtre = signal<'toutes' | 'actives' | 'terminees'>('toutes');
  prochainId = signal(4);

  // Computed — derives reactifs
  tachesFiltrees = computed(() => {
    const f = this.filtre();
    const t = this.taches();
    switch (f) {
      case 'actives': return t.filter(tache => !tache.terminee);
      case 'terminees': return t.filter(tache => tache.terminee);
      default: return t;
    }
  });

  nombreRestantes = computed(
    () => this.taches().filter(t => !t.terminee).length
  );

  // Actions — modifient les signals (pas de mutation directe)
  ajouterTache(event: Event): void {
    event.preventDefault();
    const titre = this.nouvelleTache().trim();
    if (!titre) return;

    this.taches.update(liste => [
      ...liste,
      { id: this.prochainId(), titre, terminee: false },
    ]);
    this.prochainId.update(id => id + 1);
    this.nouvelleTache.set('');
  }

  toggleTache(id: number): void {
    this.taches.update(liste =>
      liste.map(t => t.id === id ? { ...t, terminee: !t.terminee } : t)
    );
  }

  supprimerTache(id: number): void {
    this.taches.update(liste => liste.filter(t => t.id !== id));
  }
}
```

> **Point cle** : dans cette application, aucun `zone.js`, aucun `ChangeDetectorRef`, aucun `async` pipe. Tout passe par les signals, et Angular sait exactement quand mettre a jour le DOM.

---

## Resume

### @defer

| Trigger | Quand utiliser | Exemple |
|---------|---------------|---------|
| `on viewport` | Contenu sous le fold | Graphiques, temoignages |
| `on idle` | Contenu secondaire | Analytics, recommendations |
| `on interaction` | Contenu a la demande | Panneau admin, details |
| `on hover` | Preview rapide | Apercu image, tooltip riche |
| `on timer` | Contenu differe | Banniere promo, chatbot |
| `when condition` | Contenu conditionnel | Parametres avances |
| `prefetch` | Optimiser le temps de chargement | Combiner avec n'importe quel trigger |

### Zoneless

| Avant (zone.js) | Apres (zoneless + signals) |
|-----------------|---------------------------|
| `this.prop = value` | `this.prop.set(value)` |
| `this.array.push(item)` | `this.array.update(a => [...a, item])` |
| `{{ prop }}` | `{{ prop() }}` |
| `data \| async` | `toSignal(data$)` |
| `ChangeDetectorRef` | Plus necessaire |
| ~13 KB bundle zone.js | 0 KB |
| Verifie tout l'arbre | Verifie uniquement ce qui change |

---

## Exercices

### Exercice 1 — Dashboard avec @defer (30 min)

Creez une page dashboard qui utilise `@defer` de maniere strategique :
1. Un composant `CarteResume` charge immediatement (au-dessus du fold)
2. Un composant `TableauDonnees` charge `on idle`
3. Un composant `Graphique` charge `on viewport` avec `prefetch on idle`
4. Un composant `PanneauAdmin` charge `on interaction` (clic sur un bouton)
5. Ajoutez des `@loading`, `@error` et `@placeholder` avec les bonnes options (minimum, after)

### Exercice 2 — Migration zoneless (45 min)

Prenez un composant existant avec des proprietes classiques et migrez-le en zoneless :
1. Convertissez toutes les proprietes du template en `signal()`
2. Convertissez les proprietes derivees en `computed()`
3. Remplacez `| async` par `toSignal()`
4. Remplacez les mutations directes (`push`, `splice`) par `signal.update()`
5. Activez `provideExperimentalZonelessChangeDetection()` et verifiez que tout fonctionne

### Exercice 3 — Todo App zoneless (45 min)

Creez une application Todo complete sans zone.js :
1. CRUD complet (ajouter, modifier, supprimer, toggle)
2. Filtres (toutes, actives, terminees) avec `computed`
3. Persistance dans `localStorage` avec `effect`
4. Aucune utilisation de `zone.js`, `async` pipe ou `ChangeDetectorRef`

### Exercice 4 — Combiner @defer et zoneless (30 min)

Dans votre Todo App zoneless :
1. Ajoutez une section `@defer (on viewport)` pour les statistiques (nombre de taches, % completion)
2. Ajoutez un panneau de parametres charge `on interaction`
3. Prefetch le panneau `on hover` du bouton parametres
4. Verifiez que tout fonctionne correctement sans zone.js

---

## Ressources

- [Angular @defer — Documentation officielle](https://angular.dev/guide/defer)
- [Angular Zoneless — Guide de migration](https://angular.dev/guide/experimental/zoneless)
- [Angular Signals — Documentation](https://angular.dev/guide/signals)
- [Web.dev — Lazy loading best practices](https://web.dev/articles/lazy-loading)
- [RFC Zoneless Angular](https://github.com/angular/angular/discussions/55648)
