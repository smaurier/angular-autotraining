# Cours 12 — Resource API : chargement asynchrone avec Signals

> **Objectif** : Utiliser `resource()` et `rxResource()` pour charger des données asynchrones de manière déclarative, gérer les états de chargement (idle, loading, resolved, error), et comprendre la comparaison avec le pattern `useFetch` de Vue.

---

## Rappel du cours précédent

<details>
<summary>Quelle est la différence entre linkedSignal() et computed() ?</summary>

`linkedSignal()` crée un signal en lecture/écriture qui se réinitialise quand sa source change, mais qu'on peut aussi modifier manuellement. `computed()` est en lecture seule et se recalcule automatiquement — on ne peut pas écrire dedans.
</details>

<details>
<summary>Comment accéder à un élément du template avec les signaux Angular ?</summary>

Avec `viewChild('refName')` qui renvoie un `Signal<ElementRef | undefined>`, ou `viewChild.required('refName')` si l'élément existe toujours. C'est l'équivalent de `useTemplateRef()` en Vue.
</details>

<details>
<summary>Quelle est la différence entre viewChild() et contentChild() ?</summary>

`viewChild()` interroge les éléments du propre template du composant. `contentChild()` interroge les éléments projetés par le parent via `<ng-content>`.
</details>

---

## Analogie

En Vue, tu as peut-être utilisé `useFetch()` de VueUse ou écrit un composable personnalisé qui renvoie `{ data, isLoading, error }`. Angular 19 propose exactement ce concept avec `resource()` : un objet réactif qui encapsule un appel asynchrone, expose ses états, et se **relance automatiquement** quand ses paramètres changent.

C'est comme si `useFetch` et `watch` étaient fusionnés en une seule API.

---

## Théorie

### resource() — Chargement déclaratif de données

`resource()` crée une ressource qui charge des données de manière asynchrone et expose son état via des signaux.

```typescript
import { Component, signal, resource } from '@angular/core';

@Component({
  selector: 'app-utilisateur',
  template: `
    @switch (utilisateur.status()) {
      @case ('idle') {
        <p>En attente...</p>
      }
      @case ('loading') {
        <p>Chargement...</p>
      }
      @case ('resolved') {
        <h2>{{ utilisateur.value()?.nom }}</h2>
        <p>{{ utilisateur.value()?.email }}</p>
      }
      @case ('error') {
        <p class="erreur">Erreur : {{ utilisateur.error() }}</p>
      }
    }
  `
})
export class UtilisateurComponent {
  userId = signal<number>(1);

  utilisateur = resource({
    // request : la dépendance réactive (relance quand userId change)
    request: () => this.userId(),

    // loader : la fonction asynchrone qui charge les données
    loader: async ({ request: id, abortSignal }) => {
      const response = await fetch(`/api/utilisateurs/${id}`, {
        signal: abortSignal,
      });
      if (!response.ok) throw new Error('Utilisateur non trouvé');
      return response.json() as Promise<Utilisateur>;
    },
  });

  chargerSuivant() {
    this.userId.update(id => id + 1);
    // → le resource se relance automatiquement !
  }
}
```

### ResourceStatus — Les 4 états possibles

```typescript
// Les états de ResourceStatus
type ResourceStatus = 'idle' | 'loading' | 'resolved' | 'error';
```

| État | Signification | `value()` | `error()` |
|------|--------------|-----------|-----------|
| `idle` | Pas encore de requête (request retourne undefined) | `undefined` | `undefined` |
| `loading` | Requête en cours | Valeur précédente ou `undefined` | `undefined` |
| `resolved` | Données chargées avec succès | Les données | `undefined` |
| `error` | Erreur lors du chargement | `undefined` | L'erreur |

```typescript
// Vérification fine des états
const utilisateur = resource({ /* ... */ });

// isLoading() est un raccourci
if (utilisateur.isLoading()) {
  // spinner...
}

// hasValue() vérifie si value() n'est pas undefined
if (utilisateur.hasValue()) {
  console.log(utilisateur.value()); // garanti non-undefined
}
```

### Contrôler le request — déclencher ou non le chargement

```typescript
const filtreActif = signal<boolean>(false);
const recherche = signal<string>('');

const resultats = resource({
  // Si request retourne undefined, le loader NE se lance PAS
  request: () => {
    if (!filtreActif()) return undefined;
    return { terme: recherche() };
  },

  loader: async ({ request: params }) => {
    // params est garanti non-undefined ici
    const res = await fetch(`/api/recherche?q=${params.terme}`);
    return res.json();
  },
});
```

### AbortSignal — Annulation automatique

Quand `request` change pendant un chargement en cours, Angular **annule automatiquement** la requête précédente via l'`abortSignal` fourni au loader.

```typescript
const utilisateur = resource({
  request: () => this.userId(),
  loader: async ({ request: id, abortSignal }) => {
    // Si userId change pendant ce fetch, il est automatiquement annulé
    const res = await fetch(`/api/utilisateurs/${id}`, {
      signal: abortSignal,
    });
    return res.json();
  },
});
```

```typescript
// ❌ Anti-pattern : ignorer l'abortSignal
loader: async ({ request: id }) => {
  const res = await fetch(`/api/utilisateurs/${id}`);
  // Pas d'annulation → risque de race condition
  return res.json();
}

// ✅ Toujours passer l'abortSignal
loader: async ({ request: id, abortSignal }) => {
  const res = await fetch(`/api/utilisateurs/${id}`, {
    signal: abortSignal,
  });
  return res.json();
}
```

---

### rxResource() — Pour les projets utilisant RxJS

Si ton projet utilise déjà `HttpClient` (qui renvoie des Observables), `rxResource()` te permet de brancher un Observable au lieu d'une Promise.

```typescript
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

@Component({ /* ... */ })
export class ProduitsComponent {
  private http = inject(HttpClient);

  categorieId = signal<number>(1);

  produits = rxResource({
    request: () => this.categorieId(),
    loader: ({ request: catId }) => {
      // Retourne un Observable au lieu d'une Promise
      return this.http.get<Produit[]>(`/api/categories/${catId}/produits`);
    },
  });
}
```

**Quand utiliser `resource()` vs `rxResource()`** :

| Situation | Choix |
|-----------|-------|
| Nouveau projet, API simple (fetch) | `resource()` |
| Projet existant avec HttpClient | `rxResource()` |
| Besoin de retry, debounce, cache RxJS | `rxResource()` |
| Pas de dépendance RxJS nécessaire | `resource()` |

---

### Comparaison avec Vue : pattern useFetch

```typescript
// Vue 3 avec VueUse
const userId = ref(1);
const { data, pending, error } = useFetch(
  computed(() => `/api/utilisateurs/${userId.value}`)
);

// Angular 19
const userId = signal(1);
const utilisateur = resource({
  request: () => userId(),
  loader: async ({ request: id, abortSignal }) => {
    const res = await fetch(`/api/utilisateurs/${id}`, { signal: abortSignal });
    return res.json();
  },
});
// utilisateur.value()  ↔ data.value
// utilisateur.isLoading() ↔ pending.value
// utilisateur.error()  ↔ error.value
```

La différence majeure : en Angular, `resource()` est **intégré au framework** — pas besoin de librairie tierce comme VueUse.

---

### Rafraîchir manuellement une ressource

```typescript
const utilisateur = resource({ /* ... */ });

// Forcer un rechargement sans changer le request
utilisateur.reload();

// Mettre à jour la valeur localement (optimistic update)
utilisateur.value.set({ ...utilisateur.value()!, nom: 'Nouveau nom' });
```

---

## Pratique

### Exercice : Liste de produits avec filtre par catégorie

Crée un composant `ProduitListeComponent` qui :

1. A un signal `categorieId` initialisé à `1`
2. Utilise `resource()` pour charger les produits depuis une API simulée
3. Affiche un spinner pendant le chargement, un message d'erreur en cas d'échec
4. Change de catégorie via des boutons et vérifie que le resource se relance
5. A un bouton "Rafraîchir" qui appelle `reload()`

<details>
<summary>Voir la solution</summary>

```typescript
import { Component, signal, resource } from '@angular/core';

interface Produit {
  id: number;
  nom: string;
  prix: number;
}

// Fonction simulant une API
async function fetchProduits(
  categorieId: number,
  abortSignal: AbortSignal
): Promise<Produit[]> {
  // Simule un délai réseau
  await new Promise(r => setTimeout(r, 800));

  if (categorieId === 99) {
    throw new Error('Catégorie inconnue');
  }

  const data: Record<number, Produit[]> = {
    1: [
      { id: 1, nom: 'Laptop', prix: 999 },
      { id: 2, nom: 'Souris', prix: 29 },
    ],
    2: [
      { id: 3, nom: 'T-shirt', prix: 19 },
      { id: 4, nom: 'Jean', prix: 59 },
    ],
  };
  return data[categorieId] ?? [];
}

@Component({
  selector: 'app-produit-liste',
  template: `
    <div class="categories">
      <button (click)="categorieId.set(1)">Électronique</button>
      <button (click)="categorieId.set(2)">Vêtements</button>
      <button (click)="categorieId.set(99)">Invalide (test erreur)</button>
    </div>

    @switch (produits.status()) {
      @case ('loading') {
        <div class="spinner">Chargement des produits...</div>
      }
      @case ('resolved') {
        <ul>
          @for (produit of produits.value(); track produit.id) {
            <li>{{ produit.nom }} — {{ produit.prix }} €</li>
          } @empty {
            <li>Aucun produit dans cette catégorie</li>
          }
        </ul>
      }
      @case ('error') {
        <p class="erreur">{{ produits.error() }}</p>
      }
    }

    <button (click)="produits.reload()">Rafraîchir</button>
  `
})
export class ProduitListeComponent {
  categorieId = signal<number>(1);

  produits = resource({
    request: () => this.categorieId(),
    loader: ({ request: catId, abortSignal }) =>
      fetchProduits(catId, abortSignal),
  });
}
```
</details>

---

## Résumé

| API | Usage | Retour |
|-----|-------|--------|
| `resource()` | Chargement async avec Promise | `ResourceRef` avec `.value()`, `.status()`, `.error()` |
| `rxResource()` | Chargement async avec Observable | Idem mais le loader retourne un `Observable` |
| `.reload()` | Relancer manuellement | — |
| `.status()` | État courant | `'idle' \| 'loading' \| 'resolved' \| 'error'` |
| `.isLoading()` | Raccourci pour loading | `boolean` |
| `abortSignal` | Annulation automatique | Fourni par le framework dans le loader |

- `resource()` remplace les patterns `subscribe + isLoading + try/catch` manuels.
- Pense toujours à passer l'`abortSignal` au `fetch` pour éviter les race conditions.
- Le `request` contrôle **quand** le loader se lance : `undefined` = pas de requête.
- `rxResource()` est le pont vers le monde RxJS existant.

---

> **Prochain cours** : [Cours 13 — Patterns avancés avec les signaux](./03-patterns-signaux.md)
