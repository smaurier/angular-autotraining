# Cours 13 — Patterns avancés avec les signaux

> **Objectif** : Implémenter un Signal Store local dans un service, chaîner des computed pour créer des arbres de dérivation, savoir quand choisir un Signal ou un Observable, et identifier les anti-patterns courants avec les signaux.

---

## Rappel du cours précédent

<details>
<summary>Quel est le rôle du paramètre request dans resource() ?</summary>

`request` est une fonction réactive qui retourne la dépendance du loader. Quand la valeur retournée change, le loader se relance automatiquement. Si `request` retourne `undefined`, le loader ne se lance pas (état idle).
</details>

<details>
<summary>Comment Angular gère-t-il l'annulation des requêtes avec resource() ?</summary>

Angular fournit un `abortSignal` dans le callback du loader. Si le `request` change pendant un chargement, la requête précédente est annulée automatiquement via cet `abortSignal`. Il faut le passer au `fetch()` ou équivalent.
</details>

<details>
<summary>Quelle est la différence entre resource() et rxResource() ?</summary>

`resource()` attend un loader qui retourne une `Promise`, tandis que `rxResource()` attend un loader qui retourne un `Observable`. `rxResource()` est utile dans les projets qui utilisent déjà `HttpClient` et RxJS.
</details>

---

## Analogie

En Vue, tu as probablement utilisé Pinia ou un composable qui encapsule un `reactive()` avec des `computed` et des actions. Le **Signal Store local** en Angular est exactement le même concept : un service injectable qui encapsule l'état avec des `signal()`, expose des `computed()` dérivés, et fournit des méthodes pour modifier l'état.

La différence : Angular utilise le système d'injection de dépendances (DI) pour fournir ce service, là où Vue utilise `useStore()` ou un simple import.

---

## Théorie

### Pattern : Signal Store local (état dans un service)

Plutôt que de mettre tout l'état dans les composants, on crée un **service dédié** qui encapsule la logique d'état avec des signaux.

```typescript
import { Injectable, signal, computed } from '@angular/core';

export interface Tache {
  id: number;
  titre: string;
  terminee: boolean;
}

@Injectable({ providedIn: 'root' })
export class TacheStore {
  // État privé — les composants ne peuvent pas écrire directement
  private readonly _taches = signal<Tache[]>([]);

  // Lecture seule exposée via computed
  readonly taches = this._taches.asReadonly();
  readonly nombreTotal = computed(() => this._taches().length);
  readonly nombreTerminees = computed(() =>
    this._taches().filter(t => t.terminee).length
  );
  readonly nombreRestantes = computed(() =>
    this.nombreTotal() - this.nombreTerminees()
  );
  readonly progression = computed(() => {
    const total = this.nombreTotal();
    return total === 0 ? 0 : Math.round((this.nombreTerminees() / total) * 100);
  });

  // Actions — seul moyen de modifier l'état
  ajouter(titre: string): void {
    this._taches.update(taches => [
      ...taches,
      { id: Date.now(), titre, terminee: false },
    ]);
  }

  basculer(id: number): void {
    this._taches.update(taches =>
      taches.map(t => t.id === id ? { ...t, terminee: !t.terminee } : t)
    );
  }

  supprimer(id: number): void {
    this._taches.update(taches => taches.filter(t => t.id !== id));
  }
}
```

**Utilisation dans un composant** :

```typescript
@Component({
  selector: 'app-taches',
  template: `
    <h2>Tâches ({{ store.progression() }}% terminées)</h2>
    <p>{{ store.nombreRestantes() }} restante(s) sur {{ store.nombreTotal() }}</p>

    <ul>
      @for (tache of store.taches(); track tache.id) {
        <li>
          <input type="checkbox"
            [checked]="tache.terminee"
            (change)="store.basculer(tache.id)" />
          {{ tache.titre }}
          <button (click)="store.supprimer(tache.id)">✕</button>
        </li>
      }
    </ul>
  `
})
export class TachesComponent {
  readonly store = inject(TacheStore);
}
```

```typescript
// ❌ Anti-pattern : exposer le signal mutable directement
@Injectable({ providedIn: 'root' })
export class MauvaisStore {
  taches = signal<Tache[]>([]); // N'importe qui peut faire taches.set([])
}

// ✅ Signal privé + asReadonly()
@Injectable({ providedIn: 'root' })
export class BonStore {
  private readonly _taches = signal<Tache[]>([]);
  readonly taches = this._taches.asReadonly();
}
```

---

### Pattern : Derived state chains (computed en cascade)

Les `computed()` peuvent dépendre d'autres `computed()`, formant un **arbre de dérivation**. Angular optimise automatiquement : seuls les nœuds dont les dépendances ont changé sont recalculés.

```typescript
// Niveau 1 : état brut
const produits = signal<Produit[]>([]);
const filtreCategorie = signal<string>('tous');
const filtrePrixMax = signal<number>(Infinity);
const tri = signal<'nom' | 'prix'>('nom');

// Niveau 2 : filtres (dépendent du niveau 1)
const produitsParCategorie = computed(() => {
  const cat = filtreCategorie();
  return cat === 'tous'
    ? produits()
    : produits().filter(p => p.categorie === cat);
});

const produitsParPrix = computed(() =>
  produitsParCategorie().filter(p => p.prix <= filtrePrixMax())
);

// Niveau 3 : tri (dépend du niveau 2)
const produitsTries = computed(() => {
  const liste = produitsParPrix();
  const champ = tri();
  return [...liste].sort((a, b) =>
    champ === 'prix' ? a.prix - b.prix : a.nom.localeCompare(b.nom)
  );
});

// Niveau 4 : statistiques (dépendent du niveau 2 ou 3)
const prixMoyen = computed(() => {
  const liste = produitsParPrix();
  return liste.length === 0 ? 0 : liste.reduce((s, p) => s + p.prix, 0) / liste.length;
});
```

```
signal: produits ──→ computed: produitsParCategorie ──→ computed: produitsParPrix ──→ computed: produitsTries
signal: filtreCategorie ──↗                             ↑                             ↑
signal: filtrePrixMax ──────────────────────────────────↗                             │
signal: tri ──────────────────────────────────────────────────────────────────────────↗
```

**Point ESN** : Ce pattern est fréquent dans les dashboards d'entreprise. Les entretiens techniques testent souvent la capacité à structurer un arbre de dérivation propre.

---

### Signal vs Observable : quand utiliser quoi

Angular supporte les deux. Voici un arbre de décision pratique :

```
                      Ai-je besoin de...
                            │
                 ┌──────────┴──────────┐
                 │                     │
          État synchrone ?       Flux asynchrone ?
          (valeur courante)      (events dans le temps)
                 │                     │
            ✅ SIGNAL             ✅ OBSERVABLE
                 │                     │
         ┌───────┴────────┐    ┌───────┴────────┐
         │                │    │                │
    État local       État dérivé  WebSocket    Retry/Debounce
    signal()        computed()   Events DOM    Combinaisons
    linkedSignal()               Interval      complexes
```

| Critère | Signal | Observable |
|---------|--------|------------|
| Modèle mental | Valeur qui change | Flux d'événements |
| Accès à la valeur | `monSignal()` — synchrone | `.subscribe()` ou `async` pipe |
| Annulation | Automatique (garbage collected) | `unsubscribe()` obligatoire |
| Combinaison | `computed()` | `combineLatest`, `merge`, etc. |
| Template Angular | Direct `{{ monSignal() }}` | Via `async` pipe `{{ obs$ \| async }}` |
| Cas d'usage | 80% des cas en Angular 19+ | WebSocket, events complexes, legacy |

```typescript
// ✅ Signal : état de l'utilisateur connecté
const utilisateurCourant = signal<Utilisateur | null>(null);

// ✅ Signal : filtre de recherche
const termeRecherche = signal<string>('');

// ✅ Observable : WebSocket temps réel
const messages$ = webSocketSubject.pipe(
  retry(3),
  map(msg => JSON.parse(msg))
);

// ✅ Observable : debounce sur un champ de recherche
const resultats$ = champRecherche$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(terme => this.http.get(`/api/recherche?q=${terme}`))
);
```

---

### Anti-patterns courants avec les signaux

#### 1. Modifier un signal dans un computed

```typescript
// ❌ INTERDIT : effet de bord dans computed
const double = computed(() => {
  compteur.set(compteur() + 1); // 💥 Erreur à l'exécution
  return valeur() * 2;
});

// ✅ computed est pur — calcul uniquement
const double = computed(() => valeur() * 2);
```

#### 2. Lire un signal dans un effect sans le vouloir

```typescript
// ❌ L'effect traque TOUS les signaux lus
effect(() => {
  console.log('Nom:', nom());
  console.log('Âge:', age());
  // Cet effect se relance si nom OU age change !
});

// ✅ Utiliser untracked() pour ignorer certains signaux
import { untracked } from '@angular/core';

effect(() => {
  console.log('Nom:', nom());
  // age est lu mais ne déclenche PAS l'effect
  console.log('Âge:', untracked(() => age()));
});
```

#### 3. Créer des boucles infinies

```typescript
// ❌ Boucle infinie : l'effect modifie un signal qu'il lit
effect(() => {
  compteur.set(compteur() + 1); // 💥 Boucle
});

// ✅ Si tu dois transformer un signal, utilise computed ou linkedSignal
const compteurDouble = computed(() => compteur() * 2);
```

#### 4. Muter l'objet au lieu de le remplacer

```typescript
// ❌ Mutation directe — Angular ne détecte pas le changement
effect(() => {
  const user = utilisateur();
  user.nom = 'Nouveau'; // Même référence → pas de notification
});

// ✅ Toujours créer un nouvel objet
utilisateur.update(u => ({ ...u, nom: 'Nouveau' }));
```

---

## Pratique

### Exercice : Mini-store de panier d'achat

Crée un `PanierStore` (service injectable) qui :

1. Gère une liste d'articles (`signal<ArticlePanier[]>`) avec id, nom, prix, quantite
2. Expose des `computed` : `nombreArticles`, `sousTotal`, `tva` (20%), `total`
3. A des actions : `ajouterArticle()`, `retirerArticle()`, `modifierQuantite()`, `vider()`
4. Le signal d'état est privé, les lectures sont en `asReadonly()` ou `computed()`

<details>
<summary>Voir la solution</summary>

```typescript
import { Injectable, signal, computed } from '@angular/core';

export interface ArticlePanier {
  id: number;
  nom: string;
  prix: number;
  quantite: number;
}

@Injectable({ providedIn: 'root' })
export class PanierStore {
  private readonly _articles = signal<ArticlePanier[]>([]);

  // Lecture seule
  readonly articles = this._articles.asReadonly();

  // Dérivations en cascade
  readonly nombreArticles = computed(() =>
    this._articles().reduce((total, a) => total + a.quantite, 0)
  );

  readonly sousTotal = computed(() =>
    this._articles().reduce((total, a) => total + a.prix * a.quantite, 0)
  );

  readonly tva = computed(() => this.sousTotal() * 0.2);

  readonly total = computed(() => this.sousTotal() + this.tva());

  readonly estVide = computed(() => this._articles().length === 0);

  // Actions
  ajouterArticle(article: Omit<ArticlePanier, 'quantite'>): void {
    this._articles.update(articles => {
      const existant = articles.find(a => a.id === article.id);
      if (existant) {
        return articles.map(a =>
          a.id === article.id ? { ...a, quantite: a.quantite + 1 } : a
        );
      }
      return [...articles, { ...article, quantite: 1 }];
    });
  }

  retirerArticle(id: number): void {
    this._articles.update(articles => articles.filter(a => a.id !== id));
  }

  modifierQuantite(id: number, quantite: number): void {
    if (quantite <= 0) {
      this.retirerArticle(id);
      return;
    }
    this._articles.update(articles =>
      articles.map(a => a.id === id ? { ...a, quantite } : a)
    );
  }

  vider(): void {
    this._articles.set([]);
  }
}
```

**Composant qui utilise le store** :

```typescript
@Component({
  selector: 'app-panier',
  template: `
    <h2>Panier ({{ panier.nombreArticles() }} articles)</h2>

    @if (panier.estVide()) {
      <p>Votre panier est vide.</p>
    } @else {
      <ul>
        @for (article of panier.articles(); track article.id) {
          <li>
            {{ article.nom }} × {{ article.quantite }}
            = {{ article.prix * article.quantite }} €
            <button (click)="panier.modifierQuantite(article.id, article.quantite + 1)">+</button>
            <button (click)="panier.modifierQuantite(article.id, article.quantite - 1)">−</button>
            <button (click)="panier.retirerArticle(article.id)">✕</button>
          </li>
        }
      </ul>

      <div class="totaux">
        <p>Sous-total : {{ panier.sousTotal() | number:'1.2-2' }} €</p>
        <p>TVA (20%) : {{ panier.tva() | number:'1.2-2' }} €</p>
        <p><strong>Total : {{ panier.total() | number:'1.2-2' }} €</strong></p>
      </div>

      <button (click)="panier.vider()">Vider le panier</button>
    }
  `
})
export class PanierComponent {
  readonly panier = inject(PanierStore);
}
```
</details>

---

## Résumé

- **Signal Store local** : un service `@Injectable` qui encapsule des `signal()` privés, expose des `computed()` en lecture seule, et fournit des méthodes pour modifier l'état. C'est le pattern recommandé pour gérer l'état applicatif en Angular 19.
- **Derived state chains** : les `computed()` peuvent dépendre d'autres `computed()`. Angular optimise le recalcul — seuls les nœuds affectés sont réévalués.
- **Signal vs Observable** : les signaux couvrent ~80% des besoins (état synchrone, dérivations). Les Observables restent pertinents pour les flux asynchrones complexes (WebSocket, debounce, retry).
- **Anti-patterns** : pas d'effets de bord dans `computed()`, attention aux lectures accidentelles dans `effect()`, toujours créer de nouveaux objets plutôt que de muter.

---

> **Prochain cours** : [Cours 14 — Services et @Injectable](../03-services-di/01-services-et-injectable.md)
