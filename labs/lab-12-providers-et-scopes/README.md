# Lab 12 — Providers et scopes d'injection

> **Outcome :** à la fin, tu sais diagnostiquer un service partagé à tort, le passer en **scope composant** pour isoler chaque instance, et brancher une implémentation via `useClass` — le tout vérifié à l'œil dans un vrai projet Angular.
> **Vrai outil :** Angular CLI 19 (`ng new`, `ng serve`) + navigateur. Le dev server est ton oracle : tu **vois** le bug, puis tu le vois disparaître.
> **Feedback :** le coach valide en session (comportement à l'écran + lecture du code). Pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis l'écran « Mes sorties » de TribuZen : **une page qui affiche trois cartes de sortie éditables**. Chaque carte a son propre brouillon (un titre + un nombre de participants). Le cahier des charges **exact** :

1. `SortieDraftService` porte l'état d'un brouillon : `titre` (signal string) et `participants` (signal number, départ 2), plus un `computed resume` qui rend `"<titre> — <n> pers."`.
2. `SortieCardComponent` affiche un `<input>` lié au titre, le nombre de participants avec deux boutons `+`/`-`, la ligne `resume()`, et un bouton **Enregistrer**.
3. `SortiesPageComponent` affiche **trois** `<app-sortie-card>`.
4. **Étape piège d'abord :** avec `providedIn: 'root'`, constate que taper dans une carte modifie les trois. **Puis corrige** pour que chaque carte soit indépendante.
5. `NotificationSender` est une **classe abstraite** (`envoyer(message)`). Deux implémentations : `ToastSender` (log `[toast] ...`) et `SilentSender` (rien). Le bouton **Enregistrer** appelle `notifier.envoyer('Sortie enregistrée')`. Branche l'implémentation via `useClass` au niveau application.

**Pas de gap-fill** — tu écris les fichiers à partir du starter et de la CLI.

### Mise en place (vrai outil)

```bash
ng new tribuzen-lab12 --standalone --style=css --skip-tests
cd tribuzen-lab12
ng generate component sorties/sorties-page
ng generate component sorties/sortie-card
ng generate service sorties/sortie-draft
ng serve   # ouvre http://localhost:4200 et garde-le ouvert : c'est ton oracle
```

Branche `<app-sorties-page />` dans `app.component.html` (ou le template de `App`) pour voir l'écran.

### Starter minimal — la version qui a le bug

Écris d'abord cette version **volontairement fausse**, pour observer le symptôme avant de le corriger.

```typescript
// sortie-draft.service.ts — STARTER (bug volontaire : singleton global)
import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })   // ← à changer à l'étape 3
export class SortieDraftService {
  readonly titre = signal('');
  readonly participants = signal(2);
  readonly resume = computed(() => `${this.titre()} — ${this.participants()} pers.`);
}
```

```typescript
// sortie-card.component.ts — STARTER
import { Component, inject } from '@angular/core';
import { SortieDraftService } from './sortie-draft.service';

@Component({
  selector: 'app-sortie-card',
  standalone: true,
  // ← providers ajoutés à l'étape 3
  template: `
    <fieldset style="margin:.5rem 0;padding:.5rem">
      <input [value]="draft.titre()" (input)="draft.titre.set($any($event.target).value)" />
      <span> {{ draft.participants() }} pers. </span>
      <button (click)="draft.participants.update(n => n + 1)">+</button>
      <button (click)="draft.participants.update(n => Math.max(0, n - 1))">-</button>
      <p>{{ draft.resume() }}</p>
      <button (click)="enregistrer()">Enregistrer</button>
    </fieldset>
  `,
})
export class SortieCardComponent {
  readonly draft = inject(SortieDraftService);
  protected readonly Math = Math;
  enregistrer() { /* étape 5 */ }
}
```

```typescript
// sorties-page.component.ts — STARTER
import { Component } from '@angular/core';
import { SortieCardComponent } from './sortie-card.component';

@Component({
  selector: 'app-sorties-page',
  standalone: true,
  imports: [SortieCardComponent],
  template: `
    <h2>Mes sorties</h2>
    <app-sortie-card />
    <app-sortie-card />
    <app-sortie-card />
  `,
})
export class SortiesPageComponent {}
```

---

## Étapes (en friction)

1. **Reproduis le bug.** Lance le starter, tape un titre dans la première carte. **Observe** : les trois `<input>` se remplissent ensemble, les compteurs bougent ensemble. Écris en une phrase *pourquoi* (indice : combien d'instances de `SortieDraftService` existent avec `providedIn: 'root'` ?).
2. **Formule l'hypothèse de correction** avant de coder : à quel **niveau** faut-il fournir le service pour qu'il y ait une instance **par carte** ?
3. **Corrige le scope.** Retire `providedIn: 'root'` (mets `@Injectable()` nu) et ajoute `providers: [SortieDraftService]` dans `@Component` de `SortieCardComponent`. Recharge : chaque carte doit être **indépendante**. Vérifie visuellement.
4. **Crée l'abstraction `NotificationSender`** (classe abstraite) et ses deux implémentations `ToastSender` / `SilentSender`.
5. **Branche-la via `useClass`** dans `app.config.ts` (ou `bootstrapApplication`), injecte-la dans `SortieCardComponent`, et fais que **Enregistrer** appelle `envoyer(...)`. Vérifie dans la console qu'un seul `[toast]` apparaît par clic.
6. **Bonus — alias.** Ajoute `ToastSender` puis `{ provide: NotificationSender, useExisting: ToastSender }`. Prouve dans le composant que `inject(ToastSender) === inject(NotificationSender)` (un `console.log` du booléen suffit).

---

## Corrigé complet commenté

```typescript
// sortie-draft.service.ts — CORRIGÉ
import { Injectable, signal, computed } from '@angular/core';

// @Injectable() NU : le service ne s'enregistre nulle part tout seul.
// C'est le composant qui décide où le fournir (ici : au niveau composant).
@Injectable()
export class SortieDraftService {
  readonly titre = signal('');
  readonly participants = signal(2);
  // computed : dérivé, lecture seule ; se recalcule quand titre ou participants changent
  readonly resume = computed(() => `${this.titre()} — ${this.participants()} pers.`);
}
```

```typescript
// notification-sender.ts — CORRIGÉ (abstraction + implémentations)
import { Injectable } from '@angular/core';

// Le CONTRAT. Les composants ne dépendent que de cette abstraction,
// jamais d'une implémentation concrète.
export abstract class NotificationSender {
  abstract envoyer(message: string): void;
}

@Injectable()
export class ToastSender extends NotificationSender {
  readonly file: string[] = []; // public pour prouver l'alias au bonus
  envoyer(message: string): void {
    this.file.push(message);
    console.log('[toast]', message); // en vrai : un toast animé
  }
}

@Injectable()
export class SilentSender extends NotificationSender {
  envoyer(_message: string): void { /* silence : utile en dev/test */ }
}
```

```typescript
// sortie-card.component.ts — CORRIGÉ
import { Component, inject } from '@angular/core';
import { SortieDraftService } from './sortie-draft.service';
import { NotificationSender } from './notification-sender';

@Component({
  selector: 'app-sortie-card',
  standalone: true,
  // ★ LE POINT DU LAB : providers au niveau composant.
  // Chaque instance de SortieCardComponent crée son injecteur de composant,
  // donc SA propre instance de SortieDraftService → cartes indépendantes.
  providers: [SortieDraftService],
  template: `
    <fieldset style="margin:.5rem 0;padding:.5rem">
      <input [value]="draft.titre()" (input)="draft.titre.set($any($event.target).value)" />
      <span> {{ draft.participants() }} pers. </span>
      <button (click)="draft.participants.update(n => n + 1)">+</button>
      <button (click)="draft.participants.update(n => Math.max(0, n - 1))">-</button>
      <p>{{ draft.resume() }}</p>
      <button (click)="enregistrer()">Enregistrer</button>
    </fieldset>
  `,
})
export class SortieCardComponent {
  // draft est résolu dans l'injecteur DE CETTE carte (providers ci-dessus)
  readonly draft = inject(SortieDraftService);
  // notifier remonte jusqu'au root (fourni dans app.config) : SINGLETON partagé
  private readonly notifier = inject(NotificationSender);
  protected readonly Math = Math; // pour Math.max dans le template

  enregistrer(): void {
    // le composant ignore s'il parle à un ToastSender ou un SilentSender :
    // c'est le provider (app.config) qui a tranché.
    this.notifier.envoyer('Sortie enregistrée');
  }
}
```

```typescript
// app.config.ts — CORRIGÉ (choix de l'implémentation à la racine)
import { ApplicationConfig } from '@angular/core';
import { NotificationSender, ToastSender, SilentSender } from './sorties/notification-sender';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    // useClass : quand on demande NotificationSender, Angular instancie la classe choisie.
    // Ici fourni au ROOT → une seule instance partagée par toutes les cartes.
    {
      provide: NotificationSender,
      useClass: environment.production ? ToastSender : SilentSender,
    },
  ],
};
```

**Pourquoi ce corrigé est correct :**
- `SortieDraftService` est `@Injectable()` **nu** + fourni dans `@Component` → **une instance par carte**. Le bug de synchronisation disparaît parce que chaque carte a son propre injecteur de composant.
- `NotificationSender` est fourni au **root** → **une seule** instance partagée. C'est le bon scope : la notif est un service transverse, pas un état par carte.
- Le composant dépend de l'**abstraction** `NotificationSender`, jamais de `ToastSender`/`SilentSender`. Changer d'implémentation = une ligne dans `app.config.ts`, zéro changement de composant.
- Pour tester le chemin `[toast]` sans passer en build prod, remplace temporairement `environment.production ? ToastSender : SilentSender` par `useClass: ToastSender`.

**Corrigé du bonus (alias `useExisting`) :**

```typescript
// app.config.ts — variante bonus
providers: [
  ToastSender,                                              // l'instance réelle
  { provide: NotificationSender, useExisting: ToastSender },// alias → MÊME instance
];

// dans SortieCardComponent, pour prouver l'alias :
constructor() {
  console.log(inject(ToastSender) === inject(NotificationSender)); // true
}
```

Avec `useExisting`, les deux tokens partagent l'instance ; si on avait écrit `useClass: ToastSender` sur la seconde ligne, on aurait **deux** files distinctes et le `===` serait `false`.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — de mémoire, en 25 minutes, sans rouvrir ce corrigé ni le module 12 :**

1. Remonte un **compteur global de participants** (somme des trois cartes) dans un `SortiesTotalService` fourni au niveau de **`SortiesPageComponent`** (pas au root, pas par carte) — pour que le total soit partagé par les trois cartes mais recréé si la page est recréée. Affiche-le dans `SortiesPageComponent`.
2. Chaque carte incrémente/décrémente ce total **en plus** de son propre `participants`.
3. Prouve que le `SortieDraftService` reste **isolé par carte** pendant que le `SortiesTotalService` est **partagé par la page**.

**Critère de réussite :** modifier une carte met à jour le total partagé, mais ne touche pas les brouillons des autres cartes. Tu dois pouvoir expliquer, en une phrase, pourquoi les deux services vivent à des niveaux différents.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces fichiers vivent ici :

```
tribuzen/
  src/
    app/
      sorties/
        sorties-page.component.ts    ← page « Mes sorties »
        sortie-card.component.ts     ← providers: [SortieDraftService]  (scope composant)
        sortie-draft.service.ts      ← @Injectable() nu
      core/
        notification-sender.ts       ← abstraction + ToastSender / SilentSender
    app.config.ts                    ← useClass NotificationSender (scope root)
```

**Différences par rapport au lab :**
- Le brouillon sera **persisté** (API `PATCH /sorties/:id`) au module 18 (HttpClient) — ici il reste en mémoire.
- `NotificationSender` deviendra un vrai composant toast branché sur le design system TribuZen ; le **choix par provider** reste identique.
- `FamilleSectionService` (scope **route**) arrivera quand les routes `/famille` seront déclarées au module 14.

**Commit cible :**
```
feat(sorties): brouillons de sortie isolés par carte (provider composant) + NotificationSender via useClass
```
