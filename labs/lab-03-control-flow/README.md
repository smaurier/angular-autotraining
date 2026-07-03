# Lab 03 — Control flow : `@for` / `track` / `@empty` / `@switch` / `@if`

> **Outcome :** à la fin, tu sais construire un composant Angular 19 qui liste une collection avec `@for` + un `track` correct, gère l'état vide avec `@empty`, aiguille un badge de statut avec `@switch`, et affiche une bannière conditionnelle avec `@if` — le tout visible en direct dans le navigateur.
> **Vrai outil :** Angular CLI 19 + `ng serve` (dev server, rechargement à chaud dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis `ListeSortiesComponent`, le deuxième écran interactif de TribuZen : la **liste des propositions de sortie** de la famille. Cahier des charges **exact** :

1. Un `signal<Activite[]>` `activites`, où `Activite = { id: string; titre: string; statut: 'proposee' | 'validee' | 'annulee' }`, initialisé avec au moins 3 activités de statuts différents.
2. Afficher chaque activité avec `@for`, en utilisant **`track activite.id`** (identifiant stable, pas l'objet, pas `$index`).
3. Numéroter chaque ligne avec la variable contextuelle `$index` (affiche `$index + 1`).
4. Afficher un **badge de statut** via `@switch` : `validee` → « Validée », `annulee` → « Annulée », `@default` → « Proposée ».
5. Afficher un bloc **`@empty`** « Aucune activité proposée pour le moment. » quand la liste est vide.
6. Afficher une **bannière** en haut (via `@if` sur un `computed` `auMoinsUneValidee`) seulement si au moins une activité a le statut `validee`.
7. Trois boutons : **Ajouter** une activité (statut `proposee`, ajout **immuable** avec spread), **Valider la première** (passe la première activité à `validee`, **immuable** via `map`), **Vider** (`activites.set([])` pour déclencher l'`@empty`).

**Contraintes techniques :**
- `track activite.id` **obligatoire** — pas `track activite`, pas `track $index`.
- `auMoinsUneValidee` est un `computed` — **aucune** logique de recalcul dans les handlers.
- Toute écriture de la liste est **immuable** (`set` / `update` avec spread/`map`) ; jamais de `push` ni de mutation en place.
- Lecture des signaux avec `()` partout, template compris.

**Pas de gap-fill** — tu écris le composant complet à partir du starter minimal ci-dessous.

### Starter minimal

Dans un projet Angular 19 (`ng new tribuzen-labs` si pas déjà fait au lab 01), génère le composant :

```bash
ng generate component liste-sorties
```

Puis pars de ce squelette (`src/app/liste-sorties/liste-sorties.component.ts`) :

```typescript
import { Component, signal, computed } from '@angular/core';

type Statut = 'proposee' | 'validee' | 'annulee';

interface Activite {
  id: string;
  titre: string;
  statut: Statut;
}

@Component({
  selector: 'app-liste-sorties',
  standalone: true,
  template: `
    <!-- A construire :
         - banniere @if (auMoinsUneValidee())
         - @for sur activites() avec track activite.id + numero ($index)
         - @switch statut -> badge
         - @empty liste vide
         - boutons Ajouter / Valider la premiere / Vider -->
  `,
})
export class ListeSortiesComponent {
  // A toi : activites (signal<Activite[]>)
  //         auMoinsUneValidee (computed)
  //         handlers : ajouter, validerPremiere, vider
}
```

Branche `ListeSortiesComponent` dans `AppComponent` (import + balise `<app-liste-sorties />`), lance `ng serve` et regarde l'écran réagir en direct.

---

## Étapes (en friction)

1. **Déclare l'état source** — un `signal<Activite[]>` `activites` avec 3 activités de statuts distincts (`proposee`, `validee`, `annulee`).
2. **Écris le computed `auMoinsUneValidee`** — `activites().some(a => a.statut === 'validee')`. Vérifie qu'il n'a pas de `set`.
3. **Construis la boucle** — `@for (activite of activites(); track activite.id; let num = $index)`, affiche `{{ num + 1 }}. {{ activite.titre }}`.
4. **Ajoute le `@switch`** dans la ligne — trois cas de statut, `@default` pour « Proposée ».
5. **Ajoute le `@empty`** juste après le `@for`.
6. **Ajoute la bannière** — `@if (auMoinsUneValidee()) { ... }` au-dessus de la liste.
7. **Écris les handlers immuables** — `ajouter` (`update(l => [...l, nouvelle])`), `validerPremiere` (`update(l => l.map((a, i) => i === 0 ? { ...a, statut: 'validee' } : a))`), `vider` (`set([])`).
8. **Teste les cas limites dans le navigateur** : clique « Vider » → l'`@empty` apparaît ; « Ajouter » → une ligne « Proposée » s'ajoute et la bannière reste selon l'état ; « Valider la première » → le badge de la 1re ligne passe à « Validée » **et** la bannière s'affiche.
9. **Épreuve anti-track** : remplace temporairement `track activite.id` par `track activite`, ouvre la console, clique « Valider la première » et observe l'avertissement/erreur **NG0956** (le DOM est recréé). Remets `track activite.id`. Tu viens de voir le piège de tes propres yeux.

---

## Corrigé complet commenté

```typescript
// src/app/liste-sorties/liste-sorties.component.ts — corrige
import { Component, signal, computed } from '@angular/core';

type Statut = 'proposee' | 'validee' | 'annulee';

interface Activite {
  id: string;
  titre: string;
  statut: Statut;
}

@Component({
  selector: 'app-liste-sorties',
  standalone: true,
  template: `
    <h2>Propositions de sortie</h2>

    <!-- Banniere : @if sur un computed derive de la liste.
         La branche non prise n'existe pas dans le DOM. -->
    @if (auMoinsUneValidee()) {
      <p class="banniere">Au moins une activite est validee, on peut reserver.</p>
    }

    <div class="actions">
      <button (click)="ajouter()">Ajouter</button>
      <button (click)="validerPremiere()">Valider la premiere</button>
      <button (click)="vider()">Vider</button>
    </div>

    <ul>
      <!-- track activite.id : identifiant metier stable -> Angular reutilise les noeuds DOM.
           Avec des updates immuables (map/spread), track activite recreerait tout (NG0956).
           let num = $index : alias lisible pour numeroter (commence a 0). -->
      @for (activite of activites(); track activite.id; let num = $index) {
        <li>
          {{ num + 1 }}. {{ activite.titre }}

          <!-- @switch : 3 cas sur une seule valeur (statut) -> plus lisible qu'une cascade de @if.
               Comparaison stricte === contre chaque @case. -->
          @switch (activite.statut) {
            @case ('validee') {
              <span class="badge vert">Validee</span>
            }
            @case ('annulee') {
              <span class="badge rouge">Annulee</span>
            }
            @default {
              <span class="badge gris">Proposee</span>
            }
          }
        </li>
      } @empty {
        <!-- @empty est attache au @for : rendu uniquement quand activites() est vide.
             Pas de @if separe a garder synchro. -->
        <li class="vide">Aucune activite proposee pour le moment.</li>
      }
    </ul>
  `,
  styles: [`
    .banniere { background: #dcfce7; padding: 8px; border-radius: 4px; }
    .badge { margin-left: 8px; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; color: #fff; }
    .vert { background: #16a34a; }
    .rouge { background: #dc2626; }
    .gris { background: #6b7280; }
    .vide { color: #94a3b8; font-style: italic; }
  `],
})
export class ListeSortiesComponent {
  // --- Etat source : un signal de tableau, mis a jour de facon immuable ---
  activites = signal<Activite[]>([
    { id: 'a1', titre: 'Accrobranche',        statut: 'proposee' },
    { id: 'a2', titre: 'Cine',                statut: 'validee'  },
    { id: 'a3', titre: 'Pique-nique au parc', statut: 'annulee'  },
  ]);

  // --- Valeur derivee : computed en lecture seule, recalcul auto quand activites() change ---
  auMoinsUneValidee = computed(() =>
    this.activites().some(a => a.statut === 'validee')
  );

  // --- Ecritures : toujours immuables ---
  ajouter() {
    // [...liste, x] : nouveau tableau -> nouvelle reference -> Angular notifie.
    // crypto.randomUUID() garantit un id unique et stable pour le track.
    const nouvelle: Activite = {
      id: crypto.randomUUID(),
      titre: 'Nouvelle activite',
      statut: 'proposee',
    };
    this.activites.update(liste => [...liste, nouvelle]);
  }

  validerPremiere() {
    // map cree un nouveau tableau ET de nouveaux objets pour l'element modifie.
    // C'est justement pourquoi track DOIT porter sur .id et non sur l'objet.
    this.activites.update(liste =>
      liste.map((a, i) => (i === 0 ? { ...a, statut: 'validee' } : a))
    );
  }

  vider() {
    // set : valeur absolue []. Declenche le bloc @empty.
    this.activites.set([]);
  }
}
```

**Pourquoi ce corrigé est correct :**
- `track activite.id` porte sur un identifiant stable : quand `validerPremiere` remplace le premier objet par `{ ...a, statut: 'validee' }`, l'`id` ne change pas, donc Angular réutilise la même `<li>` et met juste à jour le badge. `track activite` déclencherait NG0956 et recréerait tout.
- `auMoinsUneValidee` est un `computed` — la bannière apparaît/disparaît automatiquement quand un statut change, sans une ligne de synchronisation dans les handlers.
- `@empty` est lié au `@for` : impossible de désynchroniser « liste vide » et « message vide ».
- `@switch` aiguille sur `statut` (3 cas) au lieu d'une cascade de `@if / @else if` illisible ; la comparaison est `===` stricte contre chaque `@case`.
- Toutes les écritures sont immuables (`[...liste]`, `map`, `set([])`) — jamais de `push` ni de mutation en place.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées.** Reproduis `ListeSortiesComponent` **de mémoire, en 25 minutes**, avec ces modifications :

1. Ajoute un `signal` `filtreStatut` (`'tous' | 'validee' | 'proposee' | 'annulee'`, initial `'tous'`) et des boutons pour le changer.
2. Remplace la boucle sur `activites()` par une boucle sur un `computed` `activitesVisibles` qui filtre selon `filtreStatut()` (si `'tous'`, renvoie tout).
3. Ajoute un compteur en haut : « {{ activitesVisibles().length }} activité(s) affichée(s) », et utilise `$last` pour ne pas mettre de `<hr />` après la dernière ligne.
4. Vérifie que l'`@empty` s'affiche aussi quand un filtre ne laisse **aucune** activité (ex. filtre `validee` alors qu'aucune n'est validée).
5. **Sans rouvrir ce corrigé** ni le module 03.

**Critère de réussite :** dans le navigateur, changer le filtre met à jour la liste, le compteur **et** l'état vide simultanément ; le `track` reste sur `activite.id` et aucun avertissement NG0956 n'apparaît en console.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, le composant vit ici :

```
tribuzen/
  src/
    app/
      sorties/
        liste-sorties.component.ts
```

**Différences par rapport au lab :**
- Les activités seront chargées depuis l'API via `resource` (module 10) plutôt qu'un tableau en dur ; ici on les garde en `signal` local.
- Chaque ligne deviendra un composant enfant `<app-carte-activite [activite]="activite" />` avec un `input()` (module 05) ; ici tout est inline dans le template.
- Les actions (valider, annuler) passeront par un service injecté (module 11) au lieu de handlers locaux.
- Les styles passeront par le design system TribuZen (tokens CSS) — dans le lab, styles inline minimalistes.

**Commit cible :**
```
feat(sorties): ListeSorties — @for/track id, @empty, @switch statut, banniere @if
```
