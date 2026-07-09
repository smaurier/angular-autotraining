# Lab 11 — Services et `@Injectable` : état partagé avec `inject()`

> **Outcome :** à la fin, tu sais extraire un état dans un service `@Injectable({ providedIn: 'root' })`, l'injecter avec `inject()` dans deux composants distincts, et constater que le singleton les garde synchronisés — le tout visible en direct dans le navigateur.
> **Vrai outil :** Angular CLI 19 + `ng serve` (dev server, rechargement à chaud dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis la couche partagée de la famille TribuZen : un service `FamilleStore` qui porte l'état, et **deux** composants qui l'utilisent — l'un lit, l'autre écrit — pour prouver que le singleton les synchronise. Cahier des charges **exact** :

1. Un service `FamilleStore` décoré `@Injectable({ providedIn: 'root' })`.
2. Dans le service : un `signal` **privé** `_membres` de type `Membre[]` (interface `{ id: string; nom: string }`), initialisé avec deux membres (`Alice`, `Bob`).
3. Expose `membres` en **lecture seule** via `asReadonly()`.
4. Expose un `computed` `nombreMembres` = longueur de la liste.
5. Deux **méthodes publiques** : `ajouterMembre(nom: string)` (ajout **immuable**, `id` via `crypto.randomUUID()`) et `retirerMembre(id: string)` (`filter` immuable).
6. Un composant `HeaderComponent` qui **lit** : affiche `nombreMembres()`. Il ne doit contenir **aucun** état ni aucune logique métier.
7. Un composant `FamillePageComponent` qui **écrit** : un champ de saisie + bouton « Ajouter » (appelle `ajouterMembre`), et la liste des membres avec un bouton « Retirer » par ligne (appelle `retirerMembre`).
8. `HeaderComponent` et `FamillePageComponent` sont affichés **ensemble** dans `AppComponent`. Ajouter/retirer depuis la page doit faire bouger le compteur du header **en temps réel**.

**Contraintes techniques :**
- L'état vit **uniquement** dans le service — aucun `signal` d'état dans les composants.
- Les composants récupèrent le service avec `inject()` en **propriété** (jamais dans un handler, jamais `new`).
- `membres` est exposé en `asReadonly()` ; les composants ne peuvent pas `set()` dessus — toute mutation passe par une méthode du service.
- Écritures **immuables** (`[...liste, x]`, `filter`) ; pas de `push`/mutation en place.
- Pas de `HttpClient`, pas de routing — état en mémoire (données en dur).

**Pas de gap-fill** — tu écris le service et les deux composants complets à partir des starters ci-dessous.

### Starter minimal

Dans un projet Angular 19 (`ng new tribuzen-labs --standalone` si pas déjà fait), génère le service et les composants :

```bash
ng generate service famille-store
ng generate component header
ng generate component famille-page
```

Pars de ces squelettes :

```typescript
// src/app/famille-store.ts — starter
import { Injectable, signal, computed } from '@angular/core';

export interface Membre {
  id: string;
  nom: string;
}

@Injectable({ providedIn: 'root' })
export class FamilleStore {
  // À toi : _membres (signal privé), membres (asReadonly),
  //         nombreMembres (computed), ajouterMembre, retirerMembre
}
```

```typescript
// src/app/header/header.component.ts — starter
import { Component, inject } from '@angular/core';
import { FamilleStore } from '../famille-store';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <!-- À construire : afficher le nombre de membres depuis le store -->
  `,
})
export class HeaderComponent {
  // À toi : injecter FamilleStore en propriété
}
```

Branche `<app-header />` et `<app-famille-page />` côte à côte dans `AppComponent`, lance `ng serve`, et regarde le compteur du header réagir quand tu ajoutes/retires depuis la page.

---

## Étapes (en friction)

1. **Écris le service d'abord** — `_membres` privé (`signal<Membre[]>` avec Alice + Bob), `membres = this._membres.asReadonly()`, `nombreMembres = computed(() => this._membres().length)`.
2. **Écris les mutations** — `ajouterMembre(nom)` avec `update(l => [...l, { id: crypto.randomUUID(), nom }])`, `retirerMembre(id)` avec `update(l => l.filter(m => m.id !== id))`.
3. **Injecte dans le header** — `protected readonly store = inject(FamilleStore)` en propriété, template <code v-pre>{{ store.nombreMembres() }} membre(s)</code>. Vérifie : aucun `signal` dans ce composant.
4. **Injecte dans la page** — même `inject(FamilleStore)`. Ajoute un `signal` **local** `nouveauNom` **uniquement** pour le champ de saisie (ça, c'est de la vue, pas de l'état métier), et un `@for` sur `store.membres()` avec un bouton « Retirer » par ligne.
5. **Affiche les deux ensemble** — importe et place `<app-header />` puis `<app-famille-page />` dans `AppComponent`.
6. **Teste la synchronisation dans le navigateur** — ajoute un membre depuis la page : le compteur du header passe de 2 à 3 **sans que tu aies écrit une seule ligne reliant les deux composants**. Retire-en un : il redescend.
7. **Épreuve DI** : remplace temporairement `inject(FamilleStore)` par `new FamilleStore()` dans le header, observe que le compteur du header **ne bouge plus** quand la page ajoute un membre (deux instances = deux états), puis remets `inject()`. Tu viens de voir de tes yeux pourquoi on ne fait jamais `new`.
8. **Épreuve encapsulation** : dans le header, essaie `this.store.membres.set([])` — le compilateur **refuse** (`membres` est en lecture seule via `asReadonly()`). Confirme que la seule voie de mutation est une méthode du service.

---

## Corrigé complet commenté

```typescript
// src/app/famille-store.ts — corrigé
import { Injectable, signal, computed } from '@angular/core';

export interface Membre {
  id: string;
  nom: string;
}

@Injectable({ providedIn: 'root' })   // singleton d'application, tree-shakable, dispo partout
export class FamilleStore {
  // État privé : SEUL le service peut le muter (le _ signale « ne pas toucher dehors »)
  private readonly _membres = signal<Membre[]>([
    { id: 'm1', nom: 'Alice' },
    { id: 'm2', nom: 'Bob' },
  ]);

  // Exposition LECTURE SEULE : les composants lisent membres() mais ne peuvent pas set() dessus
  readonly membres = this._membres.asReadonly();

  // Valeur dérivée : recalculée automatiquement quand _membres change
  readonly nombreMembres = computed(() => this._membres().length);

  // Mutations : unique API publique pour changer l'état
  ajouterMembre(nom: string): void {
    const nettoye = nom.trim();
    if (!nettoye) return;                       // règle métier : pas de nom vide
    const nouveau: Membre = { id: crypto.randomUUID(), nom: nettoye };
    // immuable : nouveau tableau → nouvelle référence → tous les lecteurs notifiés
    this._membres.update(liste => [...liste, nouveau]);
  }

  retirerMembre(id: string): void {
    // filter renvoie un nouveau tableau → nouvelle référence → notifié
    this._membres.update(liste => liste.filter(m => m.id !== id));
  }
}
```

```typescript
// src/app/header/header.component.ts — corrigé
import { Component, inject } from '@angular/core';
import { FamilleStore } from '../famille-store';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header>
      <!-- Lecture seule du store — aucun état propre à ce composant -->
      <strong>{{ store.nombreMembres() }} membre(s)</strong>
    </header>
  `,
})
export class HeaderComponent {
  // inject() en PROPRIÉTÉ = injection context valide. Même instance que la page.
  protected readonly store = inject(FamilleStore);
}
```

```typescript
// src/app/famille-page/famille-page.component.ts — corrigé
import { Component, inject, signal } from '@angular/core';
import { FamilleStore } from '../famille-store';

@Component({
  selector: 'app-famille-page',
  standalone: true,
  template: `
    <section>
      <!-- nouveauNom() est un signal LOCAL de vue (contenu du champ), pas de l'état métier.
           On le lie à la main : input met à jour, bouton lit puis reset. -->
      <input
        [value]="nouveauNom()"
        (input)="nouveauNom.set($any($event.target).value)"
        placeholder="Prénom du membre"
      />
      <button (click)="ajouter()">Ajouter</button>

      <!-- @for sur le store en lecture seule (control flow, module 03) -->
      <ul>
        @for (membre of store.membres(); track membre.id) {
          <li>
            {{ membre.nom }}
            <button (click)="store.retirerMembre(membre.id)">Retirer</button>
          </li>
        }
      </ul>
    </section>
  `,
})
export class FamillePageComponent {
  // même singleton FamilleStore que le header
  protected readonly store = inject(FamilleStore);

  // signal LOCAL : uniquement la saisie en cours, une préoccupation de vue
  protected readonly nouveauNom = signal('');

  ajouter(): void {
    this.store.ajouterMembre(this.nouveauNom()); // la logique métier est dans le service
    this.nouveauNom.set('');                     // reset du champ (vue)
  }
}
```

```typescript
// src/app/app.component.ts — corrigé (les deux composants côte à côte)
import { Component } from '@angular/core';
import { HeaderComponent } from './header/header.component';
import { FamillePageComponent } from './famille-page/famille-page.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeaderComponent, FamillePageComponent],
  template: `
    <app-header />
    <app-famille-page />
  `,
})
export class AppComponent {}
```

**Pourquoi ce corrigé est correct :**
- L'état vit **uniquement** dans `FamilleStore`. `HeaderComponent` n'a aucun `signal` : il lit `store.nombreMembres()`. C'est la séparation logique/vue.
- `providedIn: 'root'` fait de `FamilleStore` un singleton : `inject(FamilleStore)` dans le header et dans la page renvoie **le même objet**. Ajouter depuis la page invalide `nombreMembres`, et le header — qui le lit — se réactualise seul. Zéro code de liaison entre les deux composants.
- `membres` est exposé via `asReadonly()` : impossible d'appeler `.set()` dessus depuis un composant. Toute mutation passe par `ajouterMembre` / `retirerMembre`, où vit la règle métier (nom non vide, immuabilité).
- `inject()` est en **propriété** (injection context valide), jamais dans un handler. On ne fait jamais `new FamilleStore()` — ça créerait un état isolé et casserait le partage.
- Le seul `signal` d'un composant est `nouveauNom` dans la page : c'est de la **vue** (le contenu du champ), pas de l'état métier partagé — il a donc sa place dans le composant.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées.** Reproduis `FamilleStore` + les deux composants **de mémoire, en 30 minutes**, avec ces modifications :

1. Ajoute au store un `signal` privé `_nomFamille` (string, initial `'Famille Martin'`) exposé en `asReadonly()`, affiché dans le header à côté du compteur.
2. Ajoute une méthode `renommer(nom: string)` sur le store, et dans la page un second champ + bouton pour renommer la famille. Le header doit refléter le nouveau nom **instantanément**.
3. Ajoute un `computed` `aDesMembres` (`nombreMembres() > 0`) et affiche « Famille vide » dans la page quand il est faux (`@if`).
4. **Sans rouvrir ce corrigé** ni le module 11.

**Critère de réussite :** dans le navigateur, renommer la famille ou ajouter/retirer un membre depuis la page met à jour le header **immédiatement**, et aucun composant ne détient d'état métier (seuls les champs de saisie sont des signals locaux de vue).

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, la couche vit ici :

```
tribuzen/
  src/
    app/
      famille/
        famille-store.ts            ← le service, source de vérité de la famille
        header.component.ts         ← lit nomFamille() + nombreMembres()
        famille-page.component.ts   ← ajoute / retire / renomme via le store
```

**Différences par rapport au lab :**
- Les membres seront chargés depuis l'API (`HttpClient`, module 18) au lieu du tableau en dur — le corps de `FamilleStore` change, mais son interface publique (`membres()`, `ajouterMembre(...)`) reste identique, donc les composants ne bougent pas.
- La saisie du nouveau membre passera par un formulaire réactif (module 19) plutôt qu'un `input` lié à la main.
- Fournir le store à une portée plus étroite qu'`root` (un store par page de famille) relèvera des scopes de providers (module 12).
- Les styles passeront par le design system TribuZen (tokens CSS) — dans le lab, template brut.

**Commit cible :**
```
feat(famille): FamilleStore injectable — état partagé signals, inject() header + page, sync singleton
```
