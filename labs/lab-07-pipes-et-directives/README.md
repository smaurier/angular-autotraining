# Lab 07 — Pipes et directives

> **Outcome :** à la fin, tu sais rendre lisible une carte de données avec les pipes built-in (`date`, `currency`), écrire un pipe custom `@Pipe` avec argument, et composer une directive d'attribut paramétrée (`input()` + objet `host`) sur un composant via `hostDirectives`.
> **Vrai outil :** Angular CLI 19 + `ng serve` (dev server, rendu visible en direct dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis la **carte de sortie famille** de TribuZen : `SortieCardComponent`, un pipe custom `TronquerPipe`, et une directive d'attribut `AlerteBudgetDirective`. Cahier des charges **exact** :

1. La carte affiche : titre, date **formatée en français lisible**, budget **formaté en euros** (2 décimales), et description **tronquée à 80 caractères** avec un suffixe `…`.
2. La date arrive en chaîne ISO (`'2026-08-15T14:30:00Z'`) et le budget en `number` brut (`1234.5`) — tu ne modifies **jamais** ces données, tout se fait à l'affichage.
3. Le pipe custom `tronquer` prend un argument `longueur` (défaut 50) et coupe proprement (pas de mot coupé au milieu obligatoire, mais `trimEnd()` avant le suffixe).
4. La directive `appAlerteBudget` reçoit `budget` et `budgetMax` en `input`, calcule un `computed` `depasse`, et ajoute la classe `carte--depassement` sur l'hôte quand le budget dépasse — via l'**objet `host`**, pas de style en dur dans le template.
5. La directive est **composée** sur la carte avec `hostDirectives`, et ses inputs `budget`/`budgetMax` sont **exposés** pour être bindés depuis le parent.
6. Un style `:host(.carte--depassement)` colore la carte en rouge quand l'alerte est active.

**Données de test (à passer depuis `App` au composant carte) :**

```ts
interface Sortie {
  titre: string;
  date: string;
  budget: number;
  budgetMax: number;
  description: string;
}

const sortie: Sortie = {
  titre: 'Pique-nique au parc de la Tête d\'Or',
  date: '2026-08-15T14:30:00Z',
  budget: 1234.5,
  budgetMax: 1000,
  description: 'Sortie familiale avec jeux, goûter partagé, location de barque et pédalo sur le lac pour toute la tribu.',
};
```

**Pas de gap-fill** — tu écris les trois fichiers complets à partir du starter minimal.

### Starter minimal

Crée un projet et génère les squelettes avec la CLI (vrai outil) :

```bash
ng new tribuzen-lab07 --standalone --style=css --skip-tests
cd tribuzen-lab07
ng generate component sortie-card
ng generate pipe tronquer
ng generate directive alerte-budget
ng serve
```

Puis branche `<app-sortie-card>` dans `app.component.html` (ou `app.ts` inline) avec les données de test, et ouvre `http://localhost:4200`.

---

## Étapes (en friction)

1. **Le pipe `tronquer`** — dans `tronquer.pipe.ts`, implémente `PipeTransform` : `transform(value: string, longueur = 50, suffixe = '…')`. Gère `!value` → `''`, retourne la valeur telle quelle si assez courte, sinon `slice + trimEnd + suffixe`.
2. **La carte, pipes built-in** — dans `sortie-card.component.ts`, ajoute une `input.required<Sortie>()` `sortie`, importe `DatePipe`, `CurrencyPipe`, `TronquerPipe` dans `imports[]`, et écris le template avec `date:'fullDate':'':'fr-FR'`, `currency:'EUR':'symbol':'1.2-2':'fr-FR'`, et `tronquer:80`.
3. **La directive `appAlerteBudget`** — sélecteur d'**attribut** `[appAlerteBudget]`, deux `input.required<number>()` (`budget`, `budgetMax`), un `computed` `depasse`, et l'objet `host` avec `'[class.carte--depassement]': 'depasse()'` (et un `aria-live` en bonus).
4. **Composer** — dans le décorateur de la carte, ajoute `hostDirectives: [{ directive: AlerteBudgetDirective, inputs: ['budget', 'budgetMax'] }]`.
5. **Le style** — dans `styles`, `:host { display: block; … }` et `:host(.carte--depassement) { background: #fee2e2; }`.
6. **Brancher le parent** — passe `[sortie]`, `[budget]` et `[budgetMax]` à `<app-sortie-card>`.
7. **Vérifie visuellement** : la date est en français, le budget en « 1 234,50 € », la description coupée à 80 + `…`, et la carte est rouge (car 1234.5 > 1000). Puis baisse `budget` à `800` → la carte redevient normale, sans recharger.

---

## Corrigé complet commenté

```ts
// tronquer.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'tronquer',   // nom utilisé dans le template : {{ x | tronquer }}
})
export class TronquerPipe implements PipeTransform {
  // value = donnée à gauche du | ; longueur/suffixe = arguments avec défauts
  transform(value: string, longueur = 50, suffixe = '…'): string {
    if (!value) return '';                       // garde : null/undefined/'' -> ''
    if (value.length <= longueur) return value;  // déjà assez court : rien à faire
    // slice puis trimEnd pour ne pas laisser un espace collé au suffixe
    return value.slice(0, longueur).trimEnd() + suffixe;
  }
}
```

```ts
// alerte-budget.directive.ts
import { Directive, input, computed } from '@angular/core';

@Directive({
  selector: '[appAlerteBudget]',   // sélecteur d'ATTRIBUT (crochets) : augmente un élément existant
  host: {
    // classe conditionnelle posée sur l'hôte quand depasse() est vrai
    '[class.carte--depassement]': 'depasse()',
    // aria-live : le changement d'état est annoncé aux lecteurs d'écran
    '[attr.aria-live]': "'polite'",
  },
})
export class AlerteBudgetDirective {
  // deux entrées signal (module 05), requises
  budget = input.required<number>();
  budgetMax = input.required<number>();

  // computed (module 02) : recalculé quand budget OU budgetMax change
  depasse = computed(() => this.budget() > this.budgetMax());
}
```

```ts
// sortie-card.component.ts
import { Component, input } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { TronquerPipe } from './tronquer.pipe';
import { AlerteBudgetDirective } from './alerte-budget.directive';

interface Sortie {
  titre: string;
  date: string;
  budget: number;
  budgetMax: number;
  description: string;
}

@Component({
  selector: 'app-sortie-card',
  // pipes = comme des composants enfants : sans import, "No pipe found"
  imports: [DatePipe, CurrencyPipe, TronquerPipe],
  // composition : la directive s'applique à l'hôte, ses inputs sont exposés
  hostDirectives: [
    {
      directive: AlerteBudgetDirective,
      inputs: ['budget', 'budgetMax'],   // bindables sur <app-sortie-card [budget] [budgetMax]>
    },
  ],
  template: `
    <h3>{{ sortie().titre }}</h3>

    <!-- ISO -> "samedi 15 août 2026" ; la donnée source reste intacte -->
    <p>Le {{ sortie().date | date:'fullDate':'':'fr-FR' }}</p>

    <!-- 1234.5 -> "1 234,50 €" : 2 décimales fixes, locale fr -->
    <p>Budget : {{ sortie().budget | currency:'EUR':'symbol':'1.2-2':'fr-FR' }}</p>

    <!-- pipe custom avec argument : coupe à 80 + suffixe … -->
    <p>{{ sortie().description | tronquer:80 }}</p>
  `,
  styles: [`
    :host {
      display: block;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    /* :host(.classe) cible l'hôte QUAND il porte la classe (posée par la directive) */
    :host(.carte--depassement) {
      background: #fee2e2;
      border-color: #ef4444;
    }
  `],
})
export class SortieCardComponent {
  sortie = input.required<Sortie>();
}
```

```ts
// app.ts (ou app.component.ts) — le parent branche tout
import { Component, signal } from '@angular/core';
import { SortieCardComponent } from './sortie-card/sortie-card.component';

@Component({
  selector: 'app-root',
  imports: [SortieCardComponent],
  template: `
    <app-sortie-card
      [sortie]="sortie()"
      [budget]="sortie().budget"
      [budgetMax]="sortie().budgetMax"
    />
    <button (click)="baisserBudget()">Passer le budget à 800</button>
  `,
})
export class App {
  sortie = signal({
    titre: 'Pique-nique au parc de la Tête d\'Or',
    date: '2026-08-15T14:30:00Z',
    budget: 1234.5,
    budgetMax: 1000,
    description: 'Sortie familiale avec jeux, goûter partagé, location de barque et pédalo sur le lac pour toute la tribu.',
  });

  baisserBudget() {
    // update immuable : nouvelle référence -> pipes purs + directive recalculent
    this.sortie.update(s => ({ ...s, budget: 800 }));
  }
}
```

**Pourquoi ce corrigé est correct :**
- Les trois pipes sont importés dans `imports[]` — en standalone, un pipe non importé lève « No pipe found with name … ».
- Aucun champ de `sortie()` n'est modifié : `date`, `currency` et `tronquer` transforment **à l'affichage**. La donnée reste brute et réutilisable.
- La directive expose son état via l'objet `host` (`[class.carte--depassement]`), pas de style ni de `class` codé en dur dans le template — elle est réutilisable sur n'importe quelle carte.
- `depasse` est un `computed` : quand `baisserBudget()` change le budget avec un **update immuable** (nouvelle référence), le pipe pur et le computed se ré-évaluent → la carte redevient normale sans rechargement.
- Les inputs `budget`/`budgetMax` de la directive hôte sont **explicitement exposés** dans `hostDirectives.inputs` — sans ça, `[budget]` sur le composant lèverait « unknown input ».

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — de mémoire, en 25 minutes, sans rouvrir ce corrigé ni le module 07 :**

1. Reproduis la carte, le pipe `tronquer` et la directive.
2. Ajoute un **pipe custom `tempsRelatif`** qui transforme la date de création en « il y a 3 jour(s) » (calcul `Date.now() - valeur`). Affiche-le sous le titre.
3. Ajoute dans la directive un **listener `host`** `(mouseenter)` qui, au survol, écrit dans la console le pourcentage de dépassement (`budget/budgetMax`). Utilise `inject(ElementRef)` seulement si nécessaire.
4. Fais en sorte que le pipe `tempsRelatif` reste **pur** — donc la date passée doit être une nouvelle référence à chaque changement.

**Critère de réussite :** la carte s'affiche formatée, le temps relatif est correct, l'alerte rouge fonctionne, et le survol logue le pourcentage — le tout sans pipe impur.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces fichiers vivent ici :

```
tribuzen/
  src/
    app/
      sorties/
        sortie-card.component.ts       ← carte (pipes + hostDirectives)
        tronquer.pipe.ts               ← pipe custom réutilisable
        alerte-budget.directive.ts     ← directive d'alerte, réutilisée sur la carte de dépenses
```

**Différences par rapport au lab :**

- `sortie` viendra de l'API via `resource` (module 10) ; ici elle est passée en `input` depuis le parent.
- Le pipe `tronquer` et la directive `AlerteBudgetDirective` seront **partagés** (dossier `shared/`) car réutilisés sur plusieurs cartes (sorties, dépenses partagées).
- La locale `fr-FR` sera configurée globalement (`LOCALE_ID` + `registerLocaleData`) au lieu d'être répétée dans chaque pipe — la syntaxe du template reste identique.

**Commit cible :**
```
feat(sorties): SortieCard — pipes date/currency/tronquer + directive alerte-budget composée
```
