# Lab 10 — Resource API

> **Outcome :** à la fin, tu sais charger la liste des sorties TribuZen depuis une vraie requête réseau avec `resource()`, brancher le template sur `isLoading()` / `error()` / `value()`, gérer le changement de source (`request`) et le rechargement (`reload()`), et câbler l'`abortSignal`.
> **Vrai outil :** Angular 19 + Angular CLI (`ng serve`). Le **dev server sert lui-même les données JSON** (dossier `public/`) et le navigateur fait de **vraies requêtes `fetch`** — oracle = l'onglet Réseau + l'écran. JAMAIS un harnais de test simulé.
> **Feedback :** le coach valide visuellement en session (états qui s'enchaînent, requête annulée dans l'onglet Réseau) — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis `SortiesComponent`, la page « Mes sorties » de TribuZen. Elle charge la liste des sorties d'une famille depuis une **vraie URL** servie par le dev server, et gère proprement chargement / erreur / vide / rechargement.

Cahier des charges **exact** :

1. Un `<select>` choisit la famille : `fam-1` (Martin), `fam-2` (Nguyen), `fam-404` (pour tester l'erreur — le fichier n'existe pas).
2. La liste des sorties se charge via **`resource()`** dès l'affichage et **à chaque changement de famille**.
3. Pendant le chargement : afficher « Chargement des sorties… ».
4. En cas d'erreur (`fam-404`) : afficher un message d'erreur lisible.
5. Si la famille n'a **aucune** sortie : afficher un empty state (« Aucune sortie prévue. »).
6. Un bouton **Actualiser** relance le chargement de la famille courante via `reload()`, désactivé pendant le chargement.
7. Le `loader` **branche l'`abortSignal`** sur `fetch` (vérifiable : changer vite de famille annule la requête précédente dans l'onglet Réseau).

**Contrainte de branchement** : le template s'appuie sur `isLoading()` / `error()` / `value()` — **pas** de `@switch` sur `status()` en dur (API `status` expérimentale/instable en v19, cf. module 10 §2.3).

### Mise en place du projet (vrai outil)

```bash
# 1. Nouveau projet standalone (ou réutilise ton projet TribuZen)
ng new tribuzen-lab --style=css --ssr=false
cd tribuzen-lab

# 2. Génère le composant
ng generate component sorties --standalone --inline-template=false
```

Crée les **données servies par le dev server** dans le dossier `public/` (servi à la racine par `ng serve`) :

`public/sorties-fam-1.json`
```json
[
  { "id": "s1", "titre": "Pique-nique au parc" },
  { "id": "s2", "titre": "Cinéma dimanche" }
]
```

`public/sorties-fam-2.json`
```json
[]
```

*(Pas de fichier pour `fam-404` : le `fetch` renverra 404 → erreur.)*

### Starter minimal

`src/app/sorties/sorties.component.ts` — **pas de gap-fill**, tu écris le composant à partir de ce squelette :

```typescript
import { Component, signal, resource } from '@angular/core';

interface Sortie {
  id: string;
  titre: string;
}

@Component({
  selector: 'app-sorties',
  standalone: true,
  template: `
    <!-- À construire :
         - un <select> (change) -> familleId.set(...)
         - un bouton Actualiser -> reload(), disabled si isLoading()
         - @if isLoading / @else if error() / @else liste @for + @empty -->
  `,
})
export class SortiesComponent {
  familleId = signal('fam-1');

  // À toi : resource() avec request (id famille) + loader (fetch + abortSignal)
  // URL à charger : `/sorties-${id}.json`
}
```

Branche `<app-sorties>` dans `app.component.html`, lance `ng serve`, ouvre l'onglet **Réseau** du navigateur.

---

## Étapes (en friction)

1. **Déclare le `request`** — une computation qui renvoie `{ id: this.familleId() }`. C'est lui qui relancera le loader.
2. **Écris le `loader`** — `async ({ request, abortSignal }) => …` : `fetch(`/sorties-${request.id}.json`, { signal: abortSignal })`, lève une `Error` si `!res.ok`, renvoie `res.json()` typé `Sortie[]`.
3. **Branche le template sur les états** — `@if (sorties.isLoading())` puis `@else if (sorties.error())` puis `@else` avec `@for (s of sorties.value(); track s.id)` et un `@empty`.
4. **Ajoute le `<select>`** — `(change)="familleId.set($any($event.target).value)"` avec les trois options.
5. **Ajoute le bouton Actualiser** — `(click)="sorties.reload()"` et `[disabled]="sorties.isLoading()"`.
6. **Vérifie les 4 chemins dans le navigateur** : `fam-1` (liste), `fam-2` (empty state), `fam-404` (erreur), et clic Actualiser (la liste reste affichée pendant le `Reloading`).
7. **Prouve l'annulation** — dans l'onglet Réseau, change **très vite** `fam-1` → `fam-2` : la première requête doit apparaître **(canceled)**. Si elle ne l'est pas, tu as oublié de passer `abortSignal` à `fetch`.

---

## Corrigé complet commenté

```typescript
// sorties.component.ts — corrigé
import { Component, signal, resource } from '@angular/core';

interface Sortie {
  id: string;
  titre: string;
}

@Component({
  selector: 'app-sorties',
  standalone: true,
  template: `
    <h2>Mes sorties</h2>

    <label>
      Famille :
      <!-- $any() court-circuite le typage de EventTarget pour lire .value -->
      <select (change)="familleId.set($any($event.target).value)">
        <option value="fam-1">Famille Martin</option>
        <option value="fam-2">Famille Nguyen (vide)</option>
        <option value="fam-404">Famille inconnue (erreur)</option>
      </select>
    </label>

    <!-- reload() relance la famille courante ; on désactive le bouton pendant le chargement -->
    <button (click)="sorties.reload()" [disabled]="sorties.isLoading()">
      Actualiser
    </button>

    <!-- Branchement ROBUSTE : isLoading -> error -> value.
         Pas de @switch (status()) en dur : status est expérimental/instable en v19. -->
    @if (sorties.isLoading()) {
      <p>Chargement des sorties…</p>
    } @else if (sorties.error()) {
      <!-- error() est unknown ; on l'affiche tel quel (message de l'Error levée) -->
      <p class="erreur">Impossible de charger : {{ sorties.error() }}</p>
    } @else {
      <ul>
        <!-- value() est Sortie[] | undefined -> le @empty couvre aussi le undefined transitoire -->
        @for (s of sorties.value(); track s.id) {
          <li>{{ s.titre }}</li>
        } @empty {
          <li>Aucune sortie prévue.</li>
        }
      </ul>
    }
  `,
})
export class SortiesComponent {
  // Source réactive : le changement de familleId relance le loader
  familleId = signal('fam-1');

  sorties = resource<Sortie[], { id: string }>({
    // request : computation réactive. Relit familleId() -> relance à chaque changement.
    request: () => ({ id: this.familleId() }),

    // loader : reçoit le request courant + un abortSignal fourni par Angular.
    loader: async ({ request, abortSignal }) => {
      // abortSignal branché : si familleId rechange avant la fin, ce fetch est annulé
      const res = await fetch(`/sorties-${request.id}.json`, {
        signal: abortSignal,
      });
      // fam-404 -> res.ok = false -> on lève -> status Error, error() renseigné
      if (!res.ok) {
        throw new Error(`Sorties introuvables (HTTP ${res.status})`);
      }
      return (await res.json()) as Sortie[];
    },
  });
}
```

**Pourquoi ce corrigé est correct :**
- **`request` porte la réactivité** : `familleId()` est lu dans `request`, donc changer la famille relance le loader. Le mettre dans le `loader` ne re-déclencherait rien (module 10, PIÈGE #4).
- **`abortSignal` passé à `fetch`** : le changement rapide de famille annule la requête obsolète — pas de race condition, la réponse la plus lente ne peut plus écraser la plus récente.
- **Template branché sur `isLoading()` / `error()` / `value()`**, pas sur `status()` : robuste au changement de représentation de `status` entre mineures de v19.
- **`@empty` couvre deux cas** : la famille sans sortie (`fam-2`, tableau vide) **et** le `undefined` transitoire de `value()` avant la première résolution.
- **`[disabled]="sorties.isLoading()"`** empêche les rechargements concurrents pendant qu'un chargement tourne.

**À observer dans le navigateur (oracle) :**
- `fam-1` → deux `<li>` ; `fam-2` → « Aucune sortie prévue. » ; `fam-404` → message d'erreur.
- Onglet Réseau : un changement rapide de famille montre la requête précédente **(canceled)**.
- Clic **Actualiser** : la liste reste visible pendant le rafraîchissement (statut `Reloading`, pas `Loading`).

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées** — reproduis `SortiesComponent` **de mémoire, en 25 minutes**, sans rouvrir ce corrigé ni le module 10, avec :

1. **Un compteur** « N sortie(s) » affiché au-dessus de la liste via un `computed` dérivé de `sorties.value()` (attention au `undefined` : `(sorties.value() ?? []).length`).
2. **Un bouton « Marquer la 1re comme favorite »** qui fait une **mise à jour optimiste** avec `sorties.value.update(...)` (ajoute `favori: true` sur la première sortie) — vérifie que `status()` passe alors à `Local`.
3. **Bascule le loader vers `rxResource()`** (import `@angular/core/rxjs-interop`) en injectant `HttpClient` (`provideHttpClient()` dans la config), le `loader` renvoyant `this.http.get<Sortie[]>(...)`.

**Critère de réussite :** les trois familles se comportent comme avant, le compteur est juste même pendant le chargement, l'update optimiste s'affiche instantanément, et la version `rxResource` charge sans passer `signal:` à la main.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, `SortiesComponent` vit ici :

```
tribuzen/
  src/
    app/
      sorties/
        sorties.component.ts        ← ce lab (resource + fetch + abortSignal)
```

**Différences par rapport au lab :**
- L'URL sera la **vraie API** (`/api/familles/:id/sorties`) via `HttpClient` + `rxResource()` plutôt que des fichiers `public/*.json` — le passage `resource` → `rxResource` est justement la variante J+30.
- Le typage `Sortie` sera importé de `src/app/sorties/sortie.model.ts` (partagé), pas défini inline.
- Les intercepteurs d'auth, le cache HTTP et le retry viendront au **module 18** ; ici on reste sur le loader minimal pour isoler la Resource API.

**Commit cible :**
```
feat(sorties): SortiesComponent — resource() chargement liste, états loading/error/empty, reload + abortSignal
```
