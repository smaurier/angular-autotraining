# Lab 04 — Binding et événements : `[prop]`, `(event)`, `[class.]`/`[style.]`, `#ref`, `[(ngModel)]`

> **Outcome :** à la fin, tu sais construire un composant Angular 19 dont le template est entièrement piloté par binding — property binding sur des propriétés DOM, class/style bindings conditionnels, event bindings avec `$event`, une variable de référence `#var` et un two-way `[(ngModel)]` — le tout visible en direct dans le navigateur.
> **Vrai outil :** Angular CLI 19 + `ng serve` (dev server, rechargement à chaud dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis `AventureCardComponent`, la **carte d'activité** du catalogue TribuZen : une famille parcourt les sorties, chaque carte réagit visuellement à son état et permet de s'inscrire. Cahier des charges **exact** :

1. État en `signal` (module 02) : `titre` (`'Canoë en famille'`), `urlPhoto` (`'/img/canoe.jpg'`), `placesRestantes` (`3`), `envoiEnCours` (`false`), `survole` (`false`).
2. Un `computed` `estComplet` = `placesRestantes() === 0`.
3. **Property binding** : la photo utilise `[src]` et `[alt]` ; le bouton « M'inscrire » utilise `[disabled]` (désactivé si `estComplet()` **ou** `envoiEnCours()`).
4. **Class binding** : la carte porte `[class.complet]="estComplet()"` (filtre grayscale) et `[class.derniere-place]="placesRestantes() === 1"` (bordure rouge). La classe statique `carte` reste présente.
5. **Style binding** : `[style.opacity]` passe à `0.85` au survol de la carte (`(mouseenter)`/`(mouseleave)` écrivent dans `survole`).
6. **Attribute binding** : le bouton porte un `[attr.aria-label]` décrivant l'action (ex. `'M inscrire a ' + titre()`).
7. **Event binding** : `(click)="sInscrire()"` décrémente `placesRestantes` **sans jamais passer sous 0** (`update` + `Math.max`), et ne fait rien si `estComplet()`.
8. **Bonus obligatoire** : ajoute sous la carte un champ de recherche avec **trois voies** de capture — un `<input (input)="surSaisie($event)">`, un `<input #champ>` + bouton `(click)="champ.focus()"`, et un `<input [(ngModel)]="terme">` avec <code v-pre>{{ terme }}</code> affiché en dessous.

**Contraintes techniques :**
- Aucune interpolation <code v-pre>{{ }}</code> dans un attribut (<code v-pre>disabled="{{ ... }}"</code> interdit) — utilise `[prop]`.
- Toute écriture de signal passe par `set()`/`update()` ; jamais de mutation en place.
- `[(ngModel)]` impose d'importer `FormsModule` dans le composant.
- Les méthodes des event bindings sont **invoquées** avec `()`.

**Pas de gap-fill** — tu écris le composant complet à partir du starter minimal ci-dessous.

### Starter minimal

Dans ton projet Angular 19 (`ng new tribuzen-labs` si pas déjà fait), génère le composant :

```bash
ng generate component aventure-card
```

Puis pars de ce squelette (`src/app/aventure-card/aventure-card.component.ts`) :

```typescript
import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-aventure-card',
  standalone: true,
  imports: [FormsModule],          // requis pour [(ngModel)]
  template: `
    <!-- À construire :
         - <article> avec [class.complet], [class.derniere-place], [style.opacity], (mouseenter)/(mouseleave)
         - <img [src] [alt]>
         - <button [disabled] [attr.aria-label] (click)>
         - bloc recherche : (input)+$event, #champ+focus, [(ngModel)] -->
  `,
  styles: [`
    .carte { border: 1px solid #cbd5e1; border-radius: 8px; padding: 1rem; transition: opacity .2s; }
    .complet { filter: grayscale(1); }
    .derniere-place { border-color: #ef4444; }
  `],
})
export class AventureCardComponent {
  // À toi : titre, urlPhoto, placesRestantes, envoiEnCours, survole (signal)
  //         estComplet (computed), terme (string pour ngModel)
  //         handlers : sInscrire, surSaisie
}
```

Branche `AventureCardComponent` dans `AppComponent` (import + balise `<app-aventure-card />`), lance `ng serve` et regarde la carte réagir en direct.

---

## Étapes (en friction)

1. **Déclare l'état source** — les cinq `signal` + le `computed` `estComplet`. Ajoute une propriété simple `terme = ''` pour le two-way.
2. **Property binding photo** — `<img [src]="urlPhoto()" [alt]="titre()" />`. Vérifie dans l'inspecteur que `src` reçoit bien l'URL, pas la chaîne <code v-pre>{{ ... }}</code>.
3. **Bouton d'inscription** — `[disabled]="estComplet() || envoiEnCours()"`, `[attr.aria-label]="..."`, `(click)="sInscrire()"`. Le libellé bascule sur `envoiEnCours()` (« Envoi… » / « M'inscrire »).
4. **Class bindings** — sur l'`<article class="carte">`, ajoute `[class.complet]` et `[class.derniere-place]`. Descends `placesRestantes` à 1 puis 0 et observe bordure puis grayscale.
5. **Style + événements de survol** — `[style.opacity]="survole() ? 0.85 : 1"`, plus `(mouseenter)="survole.set(true)"` / `(mouseleave)="survole.set(false)"`.
6. **Handler `sInscrire`** — `if (estComplet()) return;` puis `placesRestantes.update(n => Math.max(0, n - 1))`.
7. **Bloc recherche (bonus)** — les trois `<input>` : `(input)="surSaisie($event)"` (cast `event.target as HTMLInputElement`), `#champ` + `(click)="champ.focus()"`, `[(ngModel)]="terme"` + <code v-pre>&lt;p&gt;{{ terme }}&lt;/p&gt;</code>.
8. **Épreuve anti-piège #1** : remplace un instant `[disabled]="estComplet()"` par <code v-pre>disabled="{{ estComplet() }}"</code> et observe que le bouton reste **toujours désactivé** (l'attribut est présent) — puis remets le property binding. Tu viens de voir le piège de tes propres yeux.
9. **Épreuve anti-piège #4** : retire l'import `FormsModule` et constate l'erreur de compilation sur `[(ngModel)]` — puis remets-le.

---

## Corrigé complet commenté

```typescript
// src/app/aventure-card/aventure-card.component.ts — corrigé
import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-aventure-card',
  standalone: true,
  imports: [FormsModule],                 // sans cet import, [(ngModel)] ne compile pas (NG: unknown property)
  template: `
    <!-- class="carte" (statique) coexiste avec les [class.x] dynamiques : Angular fusionne -->
    <article
      class="carte"
      [class.complet]="estComplet()"
      [class.derniere-place]="placesRestantes() === 1"
      [style.opacity]="survole() ? 0.85 : 1"
      (mouseenter)="survole.set(true)"
      (mouseleave)="survole.set(false)"
    >
      <!-- property binding : [src] reçoit la vraie URL, [style.width.px] ajoute l'unité -->
      <img [src]="urlPhoto()" [alt]="titre()" [style.width.px]="largeurPhoto()" />

      <h3>{{ titre() }}</h3>
      <p>{{ placesRestantes() }} place(s) restante(s)</p>

      <!-- [disabled] reçoit un BOOLÉEN : désactivé si complet OU envoi en cours -->
      <!-- [attr.aria-label] : 'aria-label' n'a pas de propriété DOM → attribute binding -->
      <button
        [disabled]="estComplet() || envoiEnCours()"
        [attr.aria-label]="'M inscrire a ' + titre()"
        (click)="sInscrire()"
      >
        {{ envoiEnCours() ? 'Envoi…' : 'M\'inscrire' }}
      </button>
    </article>

    <hr />

    <!-- Voie A : event binding + $event, on lit la valeur du DOM natif -->
    <input (input)="surSaisie($event)" placeholder="Recherche (event)" />
    <p>Dernière saisie : {{ dernierEvenement() }}</p>

    <!-- Voie B : #champ référence l'<input> dans le même template -->
    <input #champ placeholder="Recherche (#ref)" />
    <button (click)="champ.focus()">Focus champ</button>

    <!-- Voie C : two-way de formulaire, terme suit la frappe en continu -->
    <input [(ngModel)]="terme" placeholder="Recherche (ngModel)" />
    <p>Terme courant : {{ terme }}</p>
  `,
  styles: [`
    .carte { border: 1px solid #cbd5e1; border-radius: 8px; padding: 1rem; transition: opacity .2s; }
    .complet { filter: grayscale(1); }        /* [class.complet] : grise la carte pleine */
    .derniere-place { border-color: #ef4444; } /* [class.derniere-place] : alerte visuelle */
  `],
})
export class AventureCardComponent {
  // --- État source : des signal (module 02) ---
  titre           = signal('Canoë en famille');
  urlPhoto        = signal('/img/canoe.jpg');
  placesRestantes = signal(3);
  envoiEnCours    = signal(false);
  survole         = signal(false);
  largeurPhoto    = signal(240);

  // --- Valeur dérivée : computed en lecture seule ---
  estComplet = computed(() => this.placesRestantes() === 0);

  // Two-way : propriété simple (pas un signal) liée par [(ngModel)]
  terme = '';

  // Trace de la voie A (event + $event)
  dernierEvenement = signal('');

  // (click) — la logique métier vit dans update, jamais dans le template
  sInscrire() {
    if (this.estComplet()) return;                       // garde : rien à faire si plein
    this.placesRestantes.update(n => Math.max(0, n - 1)); // update immuable, borné à 0
  }

  // $event = l'objet Event natif ; on affine le type pour lire .value
  surSaisie(event: Event) {
    const input = event.target as HTMLInputElement;
    this.dernierEvenement.set(input.value);
  }
}
```

**Pourquoi ce corrigé est correct :**
- `[disabled]="estComplet() || envoiEnCours()"` passe un **booléen** — le bouton se grise dès la dernière place prise ou pendant l'envoi. Une interpolation <code v-pre>disabled="{{ ... }}"</code> aurait laissé le bouton toujours désactivé (attribut présent).
- `[class.complet]` / `[class.derniere-place]` cohabitent avec la classe statique `carte` : Angular fusionne, l'attribut statique n'est jamais écrasé.
- `[style.opacity]` réagit au signal `survole`, lui-même écrit par les event bindings `(mouseenter)`/`(mouseleave)` — la réactivité vient des signaux, le binding ne fait que relier.
- `[attr.aria-label]` cible un attribut sans propriété DOM ; un `[aria-label]` classique n'aurait rien lié.
- Les trois voies de recherche montrent le bon outil selon le besoin : `$event` pour l'objet complet, `#champ` pour lire/agir à la demande, `[(ngModel)]` pour une liaison continue (au prix de `FormsModule`).

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées.** Reproduis `AventureCardComponent` **de mémoire, en 25 minutes**, avec ces modifications :

1. Ajoute un bouton **« Se désinscrire »** qui **ré-augmente** `placesRestantes` de 1, borné par un `signal` `placesTotal` (initial `3`) — via `update` + `Math.min`. Le bouton est `[disabled]` quand `placesRestantes() === placesTotal()`.
2. Ajoute un `[class.presque-plein]` qui s'active quand il reste **1 ou 2** places, avec un style distinct de `derniere-place`.
3. Intercepte la soumission : enveloppe le bloc recherche dans un `<form (submit)="chercher($event)">` et appelle `event.preventDefault()` dans le handler (pas de modificateur `.prevent` en Angular).
4. **Sans rouvrir ce corrigé** ni le module 04.

**Critère de réussite :** dans le navigateur, s'inscrire puis se désinscrire fait varier `placesRestantes` entre 0 et `placesTotal`, les classes conditionnelles basculent aux bons seuils, et soumettre le formulaire ne recharge pas la page.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, les composants vivent ici :

```
tribuzen/
  src/
    app/
      activites/
        aventure-card.component.ts        ← la carte (property/class/style/event)
        recherche-activite.component.ts   ← le bandeau de recherche ($event, #ref, ngModel)
```

**Différences par rapport au lab :**
- `titre`, `urlPhoto` et `placesRestantes` arriveront d'un parent `CatalogueComponent` via `input()` (module 05) — ici on les garde en `signal` local.
- L'inscription remontera au parent via `output()` (module 05) au lieu de décrémenter localement ; ici `sInscrire()` traite l'action sur place.
- Le rendu d'une **liste** de cartes se fera avec `@for` (module 03) ; ici on affiche une carte unique.
- Les styles passeront par le design system TribuZen (tokens CSS) plutôt que du CSS ad hoc — mais la logique de `[class.x]`/`[style.x]` reste identique.

**Commit cible :**
```
feat(activites): AventureCard — property/class/style bindings, event $event, #ref, ngModel recherche
```
