---
titre: Pipes et directives — transformer l'affichage, augmenter un élément
cours: 03-angular
notions: ["pipes built-in (date, currency, AsyncPipe)", "import des pipes dans imports[]", "chaînage de pipes", "pipe custom @Pipe/PipeTransform", "transform() et arguments", "pipe pur vs impur (pure false)", "directive d'attribut custom @Directive", "sélecteur d'attribut", "inject(ElementRef)", "objet host (bindings et listeners)", "input() dans une directive", "hostDirectives (composition de comportement)"]
outcomes:
  - sait formater une valeur dans le template avec les pipes built-in date, currency et async
  - sait écrire un pipe custom avec @Pipe et transform(), avec des arguments, et sait quand le marquer impur
  - sait créer une directive d'attribut qui augmente un élément via inject(ElementRef) et l'objet host
  - sait paramétrer une directive avec input() et réagir aux événements de l'hôte
  - sait composer un comportement réutilisable sur un composant avec hostDirectives
prerequis: [module 00 de-vue-a-angular, module 02 signaux-base, module 04 binding-et-events, module 05 input-output-model, module 06 lifecycle-hooks]
next: 08-defer-et-zoneless
libs: [{ name: "@angular/core", version: "19" }]
tribuzen: front-office TribuZen — carte de sortie famille (formatage date/budget) et directive de surbrillance budget dépassé
last-reviewed: 2026-07
---

# Pipes et directives — transformer l'affichage, augmenter un élément

> **Outcomes — tu sauras FAIRE :** formater une valeur avec les pipes built-in (`date`, `currency`, `async`), écrire un pipe custom `@Pipe`, créer une directive d'attribut qui augmente un élément via l'objet `host`, la paramétrer avec `input()`, et composer un comportement avec `hostDirectives`.
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre **deux outils de template** : les **pipes** (transformer une valeur *à l'affichage*, sans toucher la donnée) et les **directives d'attribut** (augmenter le comportement/l'apparence d'un élément existant). Le pipe `async` introduit un `Observable` **minimal** — juste `flux$ | async` pour montrer l'abonnement automatique ; **RxJS en profondeur (opérateurs, `interop signals`) = modules 16-17**. On ne fait **ni service injectable, ni routing** ici (`inject(ElementRef)` est la seule injection, car c'est le cœur d'une directive). Les composants structurels `@if`/`@for` sont le **module 03**, déjà acquis.

## 1. Cas concret d'abord

Sur TribuZen, la **carte de sortie famille** affiche les données brutes telles qu'elles arrivent du modèle. Un collègue a écrit ça :

```typescript
// sortie-card.component.ts — AVANT (données brutes, illisibles)
import { Component, input } from '@angular/core';

interface Sortie {
  titre: string;
  date: string;          // ISO : '2026-08-15T14:30:00Z'
  budget: number;        // 1234.5
  budgetMax: number;     // 1000
  description: string;   // texte très long...
}

@Component({
  selector: 'app-sortie-card',
  template: `
    <h3>{{ sortie().titre }}</h3>
    <p>Le {{ sortie().date }}</p>
    <p>Budget : {{ sortie().budget }} EUR</p>
    <p>{{ sortie().description }}</p>
  `,
})
export class SortieCardComponent {
  sortie = input.required<Sortie>();
}
```

À l'écran : `Le 2026-08-15T14:30:00Z`, `Budget : 1234.5 EUR`, et une description qui déborde de la carte. Illisible.

Deux réflexes de débutant à **éviter** : (1) transformer la donnée dans la classe avec des `computed` de formatage pour chaque champ — verbeux et non réutilisable ; (2) muter `sortie()` pour y stocker une date déjà formatée — on **détruit** la donnée source.

La bonne réponse Angular : les **pipes** transforment *à l'affichage* sans toucher la donnée. Et pour signaler visuellement un budget dépassé (fond rouge sur la carte), on écrit une **directive d'attribut** réutilisable plutôt que du style en dur. Ce module te donne les deux.

---

## 2. Théorie complète, concise

### 2.1 Un pipe : transformer une valeur dans le template

Un pipe applique une transformation **de présentation** avec l'opérateur `|` : <code v-pre>{{ valeur | nomPipe }}</code>. La donnée source n'est **jamais modifiée** — le pipe produit une nouvelle valeur affichée. On peut passer des arguments après `:` : <code v-pre>{{ valeur | nomPipe:arg1:arg2 }}</code>.

En Angular standalone (défaut en 19), **chaque pipe utilisé doit être importé** dans le tableau `imports` du composant, exactement comme un composant enfant.

### 2.2 Les pipes built-in essentiels

Importés depuis `@angular/common` :

```typescript
import { Component, signal } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-demo-pipes',
  imports: [DatePipe, CurrencyPipe],   // ← obligatoire en standalone
  template: `
    <p>{{ date() | date:'longDate':'':'fr-FR' }}</p>
    <p>{{ prix() | currency:'EUR':'symbol':'1.2-2':'fr-FR' }}</p>
  `,
})
export class DemoPipesComponent {
  date = signal(new Date('2026-08-15'));
  prix = signal(1234.5);
}
```

- **`DatePipe`** — <code v-pre>{{ valeur | date:format:timezone:locale }}</code>. Formats nommés (`'short'`, `'longDate'`, `'fullDate'`) ou motif (`'dd/MM/yyyy HH:mm'`). Accepte une `Date`, un timestamp `number`, ou une chaîne ISO.
- **`CurrencyPipe`** — <code v-pre>{{ valeur | currency:codeDevise:affichage:digitsInfo:locale }}</code>. `digitsInfo` a la forme `'minEntier.minDéc-maxDéc'` (ex. `'1.2-2'` = 2 décimales fixes).
- **`AsyncPipe`** — voir 2.5.

> Note : les formats et locales autres qu'en-US demandent d'enregistrer la locale (`registerLocaleData`) ou de fournir `LOCALE_ID`. Le mécanisme d'i18n est hors périmètre ici ; on montre la syntaxe du pipe.

### 2.3 Chaîner les pipes

Les pipes se composent de gauche à droite — la sortie de l'un devient l'entrée du suivant :

```html
<p>{{ dateNaissance() | date:'longDate' | uppercase }}</p>
<!-- 15 AOÛT 1990 -->
```

`UpperCasePipe`, `LowerCasePipe`, `TitleCasePipe` (aussi dans `@angular/common`) reçoivent le résultat du `date` déjà formaté.

### 2.4 Écrire un pipe custom : `@Pipe` + `PipeTransform`

Un pipe custom est une classe décorée `@Pipe({ name })` qui implémente l'interface `PipeTransform` — c'est-à-dire une méthode **`transform(value, ...args)`**. Le premier paramètre est la valeur à gauche du `|` ; les suivants sont les arguments passés après `:`.

```typescript
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'tronquer',   // le nom utilisé dans le template : {{ x | tronquer }}
})
export class TronquerPipe implements PipeTransform {
  // value = la donnée ; longueur/suffixe = les arguments (avec défauts)
  transform(value: string, longueur = 50, suffixe = '…'): string {
    if (!value) return '';
    return value.length <= longueur
      ? value
      : value.slice(0, longueur).trimEnd() + suffixe;
  }
}
```

Utilisation (le pipe s'importe comme tout standalone) :

```typescript
import { TronquerPipe } from './tronquer.pipe';

@Component({
  imports: [TronquerPipe],
  template: `
    <p>{{ description() | tronquer }}</p>        <!-- 50 par défaut -->
    <p>{{ description() | tronquer:20 }}</p>      <!-- longueur = 20 -->
    <p>{{ description() | tronquer:20:' [suite]' }}</p>
  `,
})
export class ArticleComponent {
  description = signal('Un texte très long qui déborde de la carte…');
}
```

La CLI génère le squelette : `ng generate pipe tronquer` (ou `ng g p tronquer`).

### 2.5 `AsyncPipe` : afficher un flux sans s'abonner à la main

`AsyncPipe` prend un `Observable` (ou une `Promise`), **s'y abonne**, affiche la dernière valeur émise, marque le composant à vérifier à chaque émission, et **se désabonne automatiquement** quand le composant est détruit — zéro fuite mémoire, aucun `subscribe`/`unsubscribe` à écrire.

```typescript
import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable, interval, map } from 'rxjs';

@Component({
  selector: 'app-horloge',
  imports: [AsyncPipe],
  template: `<p>Heure : {{ heure$ | async }}</p>`,
})
export class HorlogeComponent {
  // Observable MINIMAL : on montre juste `| async`. RxJS = modules 16-17.
  heure$: Observable<string> = interval(1000).pipe(
    map(() => new Date().toLocaleTimeString()),
  );
}
```

Le motif `@if (flux$ | async; as valeur) { … }` permet de nommer la valeur déballée et de gérer l'état « pas encore émis ».

### 2.6 Pipe pur (défaut) vs impur

Par défaut un pipe est **pur** : `transform()` n'est **ré-exécuté que si la référence de l'entrée change** (ou un argument change). C'est une optimisation : muter *le contenu* d'un tableau (`push`) sans changer sa référence ne relance **pas** un pipe pur.

```typescript
@Pipe({ name: 'joindre', pure: false })   // ← impur : ré-exécuté à chaque détection de changement
export class JoindrePipe implements PipeTransform {
  transform(noms: string[]): string { return noms.join(', '); }
}
```

`pure: false` détecte les mutations internes **mais s'exécute très souvent** (à chaque cycle) — coûteux. La bonne pratique : rester **pur** et fournir des données **immuables** (nouvelle référence à chaque changement, comme vu au module 02), plutôt que de basculer en impur.

### 2.7 Une directive d'attribut : augmenter un élément existant

Là où un composant *crée* un élément, une **directive d'attribut** *augmente* un élément déjà là (comportement, style, attributs ARIA). Un `@Directive` a un **sélecteur d'attribut** entre crochets, et accède à son élément hôte via `inject(ElementRef)`.

```typescript
import { Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[appSurligner]',   // s'active sur tout élément portant l'attribut appSurligner
})
export class SurlignerDirective {
  private el = inject(ElementRef);   // référence à l'élément DOM hôte

  constructor() {
    this.el.nativeElement.style.backgroundColor = 'yellow';
  }
}
```

```html
<p appSurligner>Texte surligné</p>
```

La CLI : `ng generate directive surligner` (ou `ng g d surligner`).

### 2.8 Paramétrer avec `input()`, réagir avec l'objet `host`

Une directive utilise les mêmes signaux d'entrée qu'un composant : `input()` (module 05). On peut **aliaser** l'entrée sur le nom du sélecteur pour une syntaxe compacte. Pour écouter des événements de l'hôte et lier des classes/styles, on utilise l'**objet `host`** du décorateur (approche moderne, préférée aux décorateurs `@HostListener`/`@HostBinding`).

```typescript
import { Directive, ElementRef, inject, input, signal, computed } from '@angular/core';

@Directive({
  selector: '[appSurligner]',
  host: {
    '(mouseenter)': 'onEnter()',            // listener d'événement hôte
    '(mouseleave)': 'onLeave()',
    '[style.background-color]': 'couleurCourante()',  // binding de propriété
  },
})
export class SurlignerDirective {
  private el = inject(ElementRef);

  // input aliasé : [appSurligner]="'lightblue'" passe la couleur directement
  couleur = input('yellow', { alias: 'appSurligner' });
  private survol = signal(false);

  couleurCourante = computed(() =>
    this.survol() ? '#e0f7fa' : this.couleur(),
  );

  onEnter() { this.survol.set(true); }
  onLeave() { this.survol.set(false); }
}
```

- Clé `'(event)'` → **listener** : la valeur est l'expression à exécuter (une méthode de la classe).
- Clé `'[propriété]'` → **binding** : `[class.x]`, `[style.y]`, `[attr.aria-z]`, `[tabIndex]`… La valeur est une expression réévaluée.
- Clé littérale (ex. `'role': 'listitem'`) → **valeur statique** posée une fois.

### 2.9 `hostDirectives` : composer un comportement sur un composant

`hostDirectives` applique une ou plusieurs directives **standalone** à l'hôte d'un composant (ou d'une autre directive), **sans** les mettre dans le template. C'est de la **composition de comportement** : le composant hérite du comportement de la directive.

```typescript
@Component({
  selector: 'app-sortie-card',
  hostDirectives: [SurlignerDirective],   // la carte hérite du surlignage
  template: `…`,
})
export class SortieCardComponent {}
```

Par défaut, les `input()`/`output()` de la directive hôte **ne sont pas** exposés sur le composant. Pour les rendre bindables de l'extérieur, on développe l'entrée — avec alias possible via `:` :

```typescript
hostDirectives: [
  {
    directive: SurlignerDirective,
    inputs: ['appSurligner: couleurSurlignage'],   // expose sous un nouveau nom
    // outputs: ['nomOutput: alias'],
  },
]
```

---

## 3. Worked examples

### Exemple 1 — la carte de sortie lisible (pipes built-in + pipe custom)

On reprend le cas concret et on formate **à l'affichage**, sans toucher `sortie()`.

```typescript
// sortie-card.component.ts — pipes built-in + pipe custom
import { Component, input } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { TronquerPipe } from './tronquer.pipe';

interface Sortie {
  titre: string;
  date: string;
  budget: number;
  budgetMax: number;
  description: string;
}

@Component({
  selector: 'app-sortie-card',
  imports: [DatePipe, CurrencyPipe, TronquerPipe],   // 3 pipes importés
  template: `
    <h3>{{ sortie().titre }}</h3>

    <!-- ISO -> date française lisible -->
    <p>Le {{ sortie().date | date:'fullDate':'':'fr-FR' }}</p>

    <!-- 1234.5 -> "1 234,50 €" (2 décimales fixes, locale fr) -->
    <p>Budget : {{ sortie().budget | currency:'EUR':'symbol':'1.2-2':'fr-FR' }}</p>

    <!-- pipe custom : coupe la description trop longue -->
    <p>{{ sortie().description | tronquer:80 }}</p>
  `,
})
export class SortieCardComponent {
  sortie = input.required<Sortie>();
}
```

`sortie()` reste **intacte** : les trois pipes produisent des valeurs d'affichage à la volée. Si la donnée change (nouvelle `input`), les pipes purs se ré-exécutent parce que la **référence** de l'objet a changé.

### Exemple 2 — directive de surbrillance « budget dépassé » + composition

La carte doit devenir rouge quand `budget > budgetMax`. On écrit une directive paramétrée, puis on la **compose** sur la carte avec `hostDirectives`.

```typescript
// alerte-budget.directive.ts
import { Directive, input, computed } from '@angular/core';

@Directive({
  selector: '[appAlerteBudget]',
  host: {
    // classe conditionnelle : ajoutée quand depasse() est vrai
    '[class.carte--depassement]': 'depasse()',
    '[attr.aria-live]': "'polite'",   // annonce l'alerte aux lecteurs d'écran
  },
})
export class AlerteBudgetDirective {
  // deux entrées ; pas d'alias ici, on les nomme explicitement
  budget = input.required<number>();
  budgetMax = input.required<number>();

  // computed : recalculé quand budget OU budgetMax change (module 02)
  depasse = computed(() => this.budget() > this.budgetMax());
}
```

```typescript
// sortie-card.component.ts — composition par hostDirectives
import { Component, input, computed } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { AlerteBudgetDirective } from './alerte-budget.directive';

@Component({
  selector: 'app-sortie-card',
  imports: [DatePipe, CurrencyPipe],
  hostDirectives: [
    {
      directive: AlerteBudgetDirective,
      inputs: ['budget', 'budgetMax'],   // exposés sur <app-sortie-card [budget] [budgetMax]>
    },
  ],
  template: `
    <h3>{{ sortie().titre }}</h3>
    <p>Le {{ sortie().date | date:'fullDate':'':'fr-FR' }}</p>
    <p>Budget : {{ sortie().budget | currency:'EUR' }}</p>
  `,
  styles: [`
    :host { display: block; border: 1px solid #cbd5e1; padding: 1rem; }
    :host(.carte--depassement) { background: #fee2e2; border-color: #ef4444; }
  `],
})
export class SortieCardComponent {
  sortie = input.required<{ titre: string; date: string; budget: number }>();
}
```

Le parent branche les entrées exposées par la directive hôte :

```html
<app-sortie-card
  [sortie]="maSortie()"
  [budget]="maSortie().budget"
  [budgetMax]="maSortie().budgetMax"
/>
```

Quand `budget > budgetMax`, la directive ajoute `carte--depassement` sur l'hôte → le style `:host(.carte--depassement)` colore la carte en rouge. La logique d'alerte vit dans **une** directive réutilisable sur n'importe quelle carte.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Oublier d'importer le pipe (standalone)

```typescript
// ❌ DatePipe utilisé mais absent de imports[] -> erreur : "No pipe found with name 'date'"
@Component({ template: `{{ d() | date }}` })

// ✅ Importé explicitement
@Component({ imports: [DatePipe], template: `{{ d() | date }}` })
```

En standalone, un pipe est comme un composant enfant : **pas d'import, pas de pipe**. Erreur QA la plus fréquente.

### PIÈGE #2 — Croire qu'un pipe modifie la donnée

Un pipe est **de présentation**. <code v-pre>{{ prix() | currency }}</code> n'écrit rien dans `prix()`. Pour trier/filtrer une **liste** dans le template, un pipe impur est tentant mais coûteux : préfère un `computed` (module 02) qui dérive une nouvelle liste immuable.

### PIÈGE #3 — Passer en `pure: false` pour « voir » une mutation

```typescript
liste().push(x);   // ❌ mutation : un pipe PUR ne se relance pas (même référence)
```

Le réflexe « je mets `pure: false` » masque le vrai problème. La cause est la **mutation**. Corrige à la source : `liste.update(l => [...l, x])` (nouvelle référence) → le pipe pur se relance, sans le coût d'un pipe impur exécuté à chaque cycle.

### PIÈGE #4 — Sélecteur de directive : attribut vs élément

```typescript
selector: 'appSurligner'      // ❌ sélecteur d'ÉLÉMENT -> <appSurligner> (composant)
selector: '[appSurligner]'    // ✅ sélecteur d'ATTRIBUT -> <p appSurligner>
```

Une directive d'attribut **augmente** un élément existant : son sélecteur est **entre crochets**. Sans crochets, Angular cherche une balise de ce nom.

### PIÈGE #5 — `host` : listener vs binding

```typescript
host: {
  'mouseenter': 'onEnter()',      // ❌ ni () ni [] -> traité comme attribut statique, aucun listener
  '(mouseenter)': 'onEnter()',    // ✅ (event) = LISTENER
  '[class.actif]': 'estActif()',  // ✅ [prop]  = BINDING réévalué
  'role': 'listitem',             // ✅ littéral = valeur statique posée une fois
}
```

`( )` = j'écoute un événement. `[ ]` = je lie une propriété/classe/style/attr. Rien = valeur statique.

### PIÈGE #6 — Attendre les inputs d'une `hostDirective` sans les exposer

```typescript
hostDirectives: [AlerteBudgetDirective]   // ❌ [budget] sur le composant -> "unknown input"
hostDirectives: [{ directive: AlerteBudgetDirective, inputs: ['budget', 'budgetMax'] }]  // ✅
```

Par défaut les inputs/outputs d'une directive hôte **ne sont pas** exposés. Il faut les lister explicitement (avec alias `'nom: aliasPublic'` au besoin).

---

## 5. Ancrage TribuZen

Pipes et directives sont la **couche de présentation** du front-office TribuZen — tout ce qui rend une donnée brute lisible ou augmente un élément d'UI.

**`SortieCardComponent`** (Exemples 1 & 2) — la carte de sortie famille : `date` (ISO → date fr), `currency` (budget → « 1 234,50 € »), et le pipe custom **`tronquer`** pour la description. C'est la première carte du fil d'accueil.

**`AlerteBudgetDirective`** (Exemple 2) — directive d'attribut réutilisable : surligne en rouge toute carte dont le budget dépasse le plafond, avec `aria-live` pour l'accessibilité. Composée sur la carte via `hostDirectives`, elle sera réutilisée telle quelle sur la carte de dépenses partagées.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      sorties/
        sortie-card.component.ts       ← Exemples 1 & 2
        tronquer.pipe.ts               ← pipe custom
        alerte-budget.directive.ts     ← directive + hostDirectives
```

> Les données de sortie viendront de l'API via `resource` (module 10) ; ici `sortie` arrive en `input`. La locale `fr-FR` complète (i18n) est un réglage applicatif hors de ce module — on montre la syntaxe des pipes.

---

## 6. Points clés

1. Un pipe <code v-pre>{{ valeur | nom:arg }}</code> transforme **à l'affichage** sans modifier la donnée source.
2. En standalone, **chaque pipe doit être importé** dans `imports[]` (comme un composant enfant).
3. `DatePipe`, `CurrencyPipe`, `AsyncPipe` viennent de `@angular/common` ; `async` s'abonne et se **désabonne** tout seul.
4. Un pipe custom = `@Pipe({ name })` + `PipeTransform` avec `transform(value, ...args)`.
5. Un pipe est **pur** par défaut (relancé seulement si la référence change) — reste pur + données immuables plutôt que `pure: false`.
6. Une directive d'attribut a un sélecteur **entre crochets** `[appX]` et accède à l'hôte via `inject(ElementRef)`.
7. L'objet `host` : `'(event)'` = listener, `'[prop]'` = binding, littéral = valeur statique ; `input()` la paramètre.
8. `hostDirectives` **compose** un comportement sur un hôte ; les inputs/outputs ne sont exposés que si on les liste explicitement.

---

## 7. Seeds Anki

```
En standalone, que faut-il pour utiliser DatePipe dans un template ?|L'importer dans le tableau imports[] du composant (import { DatePipe } from '@angular/common'). Sans import : erreur "No pipe found with name 'date'".
Un pipe modifie-t-il la donnée source ?|Non. Un pipe est de présentation : il produit une valeur affichée sans toucher la donnée. Pour dériver une nouvelle valeur en dur, utiliser un computed.
Quelle interface et quelle méthode implémente un pipe custom ?|L'interface PipeTransform, via la méthode transform(value, ...args). Le décorateur @Pipe({ name }) déclare le nom utilisé dans le template.
Quand un pipe pur (défaut) est-il ré-exécuté ?|Seulement quand la référence de son entrée (ou un argument) change. Muter le contenu d'un tableau (push) sans changer la référence ne relance pas un pipe pur.
Pourquoi éviter pure false plutôt que d'y recourir ?|Un pipe impur s'exécute à chaque cycle de détection : coûteux. La cause d'un "non-rafraîchissement" est une mutation ; mieux vaut fournir des données immuables (nouvelle référence) et garder le pipe pur.
Quelle différence entre selector appSurligner et [appSurligner] ?|Sans crochets = sélecteur d'élément (balise <appSurligner>). Avec crochets = sélecteur d'attribut : la directive augmente un élément existant comme <p appSurligner>.
Dans l'objet host, que signifient '(mouseenter)', '[class.x]' et 'role' ?|'(event)' = listener d'événement hôte ; '[prop]' = binding réévalué (class/style/attr/propriété) ; clé littérale = valeur statique posée une fois.
À quoi sert hostDirectives et que faut-il pour exposer ses inputs ?|Il compose une directive standalone sur l'hôte d'un composant (comportement réutilisable). Par défaut les inputs/outputs ne sont pas exposés : il faut les lister dans inputs:[]/outputs:[] (avec alias 'nom: public' au besoin).
Comment AsyncPipe évite-t-il les fuites mémoire ?|Il s'abonne à l'Observable, affiche la dernière valeur, et se désabonne automatiquement quand le composant est détruit. Aucun subscribe/unsubscribe manuel.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-07-pipes-et-directives/README.md`. Construire la carte de sortie TribuZen lisible (pipes built-in + pipe custom `tronquer`) et une directive `appAlerteBudget` composée par `hostDirectives`, dev server Angular en oracle visuel — corrigé commenté intégral.
