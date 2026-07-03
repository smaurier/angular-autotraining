# Lab 06 — Cycle de vie : compte à rebours de la prochaine sortie

> **Outcome :** à la fin, tu sais brancher chaque étape d'un composant Angular 19 au bon hook de cycle de vie — `ngOnInit` pour l'initialisation dépendant d'un input, `DestroyRef.onDestroy()` pour arrêter un timer sans fuite mémoire, et `afterNextRender` pour toucher le DOM après rendu — le tout visible en direct dans le navigateur.
> **Vrai outil :** Angular CLI 19 + `ng serve` (dev server, rechargement à chaud dans le navigateur) + l'onglet Performance/Memory des DevTools pour observer l'absence de fuite.
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis `ProchaineSortieComponent`, l'écran **compte à rebours** de TribuZen : il affiche le temps restant avant la prochaine sortie famille, mis à jour chaque seconde. Cahier des charges **exact** :

1. Le composant reçoit un `input.required<number>()` `secondesInitiales` (secondes avant le départ, ex : `90`).
2. Un `signal` `restant` (nombre), initialisé **dans `ngOnInit`** à partir de `secondesInitiales()` — surtout **pas** dans le constructor.
3. Un `computed` `affichage` qui formate `restant()` en `m:ss` (ex : `1:30`, `0:09`).
4. Un timer (`setInterval`, 1 s) qui décrémente `restant` jusqu'à `0` sans descendre en dessous.
5. Le timer est **arrêté à la destruction** via `inject(DestroyRef).onDestroy(...)` — zéro fuite mémoire.
6. `afterNextRender` écrit `Compte à rebours prêt` dans la console **une seule fois**, après le premier rendu.
7. Quand `restant()` atteint `0`, afficher `Départ !` à la place du chrono.

**Pas de gap-fill** — tu écris le composant complet à partir du starter minimal ci-dessous.

### Mise en place (vrai outil)

```bash
# Si tu n'as pas encore de projet du cours Angular :
ng new tribuzen-labs --style=css --routing=false
cd tribuzen-labs

# Génère le composant du lab :
ng generate component sorties/prochaine-sortie
```

Branche-le dans `app.component.ts` en lui passant l'input, puis lance `ng serve` et ouvre `http://localhost:4200` :

```typescript
// app.component.ts — hôte de test
import { Component } from '@angular/core';
import { ProchaineSortieComponent } from './sorties/prochaine-sortie.component';

@Component({
  selector: 'app-root',
  imports: [ProchaineSortieComponent],
  // On monte/démonte le composant avec @if pour tester le nettoyage (voir étape 6)
  template: `
    <button (click)="visible = !visible">{{ visible ? 'Quitter' : 'Ouvrir' }} l'écran</button>
    @if (visible) {
      <app-prochaine-sortie [secondesInitiales]="90" />
    }
  `,
})
export class AppComponent {
  visible = true;
}
```

### Starter minimal

```typescript
// sorties/prochaine-sortie.component.ts — starter
import { Component, OnInit, inject, DestroyRef, input, signal, computed, afterNextRender } from '@angular/core';

@Component({
  selector: 'app-prochaine-sortie',
  template: `
    <!-- À construire : afficher affichage() tant que restant() > 0, sinon "Départ !" -->
  `,
})
export class ProchaineSortieComponent implements OnInit {
  // À toi : injecter DestroyRef, déclarer l'input secondesInitiales,
  //         les signaux restant + affichage, le constructor (afterNextRender)
  //         et ngOnInit (init + timer + nettoyage).

  ngOnInit(): void {
    // ...
  }
}
```

---

## Étapes (en friction)

1. **Injecte `DestroyRef`** en champ privé (`private destroyRef = inject(DestroyRef);`).
2. **Déclare l'input** `secondesInitiales = input.required<number>();` et le `signal` `restant = signal(0);`.
3. **Écris le `computed` `affichage`** — `Math.floor(s / 60)` pour les minutes, `s % 60` pour les secondes, `padStart(2, '0')` sur les secondes.
4. **Dans le `constructor`**, appelle `afterNextRender(() => console.log('Compte à rebours prêt'))`.
5. **Dans `ngOnInit`**, initialise `restant` avec `secondesInitiales()`, puis démarre le `setInterval` qui décrémente (`Math.max(0, s - 1)`).
6. **Enregistre le nettoyage** : `this.destroyRef.onDestroy(() => clearInterval(timerId))`. Vérifie dans DevTools : ouvre/ferme l'écran 5 fois avec le bouton → un seul timer actif à la fois, la valeur ne « double-décrémente » jamais.
7. **Écris le template** : `@if (restant() > 0) { ... {{ affichage() }} ... } @else { Départ ! }`.
8. **Teste le cas limite** : passe l'input à `3` → le chrono descend `0:03 → 0:00` puis affiche `Départ !` et s'arrête à 0 (ne passe pas en négatif).

---

## Corrigé complet commenté

```typescript
// sorties/prochaine-sortie.component.ts — corrigé
import {
  Component, OnInit, inject, DestroyRef,
  input, signal, computed, afterNextRender,
} from '@angular/core';

@Component({
  selector: 'app-prochaine-sortie',
  template: `
    <h2>Prochaine sortie</h2>

    <!-- @if control flow (module 03) : chrono tant qu'il reste du temps, sinon Départ ! -->
    @if (restant() > 0) {
      <p class="chrono">Départ dans {{ affichage() }}</p>
    } @else {
      <p class="depart">Départ !</p>
    }
  `,
  styles: [`
    .chrono { font-size: 1.5rem; font-family: monospace; }
    .depart { font-size: 1.5rem; font-weight: 700; color: #16a34a; }
  `],
})
export class ProchaineSortieComponent implements OnInit {
  // Injection : le constructor est un CONTEXTE D'INJECTION → inject() fonctionne ici
  private destroyRef = inject(DestroyRef);

  // Input signal (module 05) — fourni par le parent, PAS lisible dans le constructor
  secondesInitiales = input.required<number>();

  // État réactif local (module 02)
  restant = signal(0);

  // Valeur dérivée m:ss — un computed, aucune logique de format dans le template
  affichage = computed(() => {
    const s = this.restant();
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  });

  constructor() {
    // afterNextRender : s'exécute UNE fois, après le premier rendu, côté navigateur.
    // Ni en SSR ni au pré-rendu. Ici on log ; en vrai on initialiserait un canvas/lib.
    afterNextRender(() => {
      console.log('Compte à rebours prêt');
    });
  }

  ngOnInit(): void {
    // ✅ ngOnInit : l'input EST disponible ici (contrairement au constructor)
    this.restant.set(this.secondesInitiales());

    // Timer indépendant du composant → il DOIT être nettoyé à la destruction
    const timerId = setInterval(() => {
      // Math.max(0, ...) : on n'affiche jamais de temps négatif
      this.restant.update(s => Math.max(0, s - 1));
    }, 1000);

    // ✅ Nettoyage colocalisé : le timer meurt avec le composant → aucune fuite mémoire
    this.destroyRef.onDestroy(() => clearInterval(timerId));
  }
}
```

**Pourquoi ce corrigé est correct :**
- **L'init dépend de l'input** (`restant.set(secondesInitiales())`) : elle est dans `ngOnInit`, où les inputs sont prêts — la mettre dans le constructor lirait une valeur non fiable.
- **Le timer est arrêté** via `destroyRef.onDestroy(() => clearInterval(timerId))`, colocalisé avec sa création. Ouvre/ferme l'écran en boucle : un seul timer vit à la fois, jamais d'accumulation.
- **`afterNextRender`** garantit « DOM peint, une fois » — le bon hook pour tout ce qui touche le DOM réel, contrairement à `ngOnInit` (trop tôt) ou `afterRender` (trop souvent).
- **`affichage`** est un `computed` : le format `m:ss` se recalcule seul à chaque tick, aucune synchro manuelle.

> Variante de nettoyage acceptée : un flux RxJS `interval(1000).pipe(takeUntilDestroyed()).subscribe(...)` dans le constructor donne le même résultat sans `setInterval`. On reste ici sur `setInterval` + `DestroyRef` pour ne pas dépendre de RxJS (modules 16-17).

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées :**

Reproduis `ProchaineSortieComponent` **de mémoire, en 20 minutes**, avec ces modifications :

1. Ajoute un bouton **Pause / Reprendre** : un `signal` `enPause`, et le timer ne décrémente que si `!enPause()` (la logique reste dans le callback du timer, pas un nouveau timer).
2. Remplace le `setInterval` + `DestroyRef` par un flux RxJS : `interval(1000).pipe(takeUntilDestroyed()).subscribe(...)` dans le constructor. Vérifie que le désabonnement est automatique (aucun `ngOnDestroy` écrit).
3. **Sans rouvrir ce corrigé** ni le module 06.

**Critère de réussite :** le chrono fonctionne dans le navigateur, la pause fige/reprend le décompte, et fermer l'écran n'accumule aucun tick résiduel (vérifiable en console : les logs de tick s'arrêtent net à la fermeture).

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, le composant vit ici :

```
tribuzen/
  src/
    app/
      sorties/
        prochaine-sortie.component.ts
```

**Différences par rapport au lab :**

- `secondesInitiales` ne sera pas un nombre en dur : il se calcule à partir de la **date de la sortie** chargée depuis l'API (`resource`, module 10 ; service, module 11). Pour l'instant, garde l'input local.
- Le format `m:ss` migrera vers un **pipe** dédié (`DurationPipe`, module 07) réutilisable, au lieu d'un `computed` inline.
- À l'arrivée à `0`, on déclenchera une notification famille — ce flux passera par un service et RxJS (modules 16-17). Ici on se limite au geste de cleanup.

**Commit cible :**
```
feat(sorties): ProchaineSortie — compte à rebours (ngOnInit init, DestroyRef cleanup, afterNextRender)
```
