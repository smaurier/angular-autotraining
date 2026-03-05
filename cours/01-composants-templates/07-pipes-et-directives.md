# Cours 10 — Pipes et directives

> **Objectif** : Maîtriser les pipes intégrés d'Angular pour transformer les données dans le template, créer ses propres pipes standalone, et comprendre les directives d'attribut personnalisées. Faire le parallèle avec les filtres (supprimés) de Vue 2 et les directives personnalisées de Vue 3.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre ngOnInit et afterNextRender ?</summary>

`ngOnInit` s'exécute après la première détection de changement — les inputs sont disponibles mais le DOM n'est pas encore garanti. `afterNextRender` s'exécute après le premier rendu dans le navigateur — le DOM est disponible. Il ne s'exécute pas côté serveur (SSR).
</details>

<details>
<summary>2. Comment éviter les fuites mémoire avec les observables RxJS ?</summary>

En utilisant `takeUntilDestroyed()` dans un pipe RxJS. Dans le constructor, on peut l'appeler sans argument. Dans `ngOnInit`, il faut passer `this.destroyRef` en paramètre. Alternative : `DestroyRef.onDestroy()` pour enregistrer un callback de nettoyage.
</details>

<details>
<summary>3. Quel est l'équivalent Vue 3 de afterNextRender ?</summary>

`onMounted` — les deux garantissent que le DOM est prêt et ne s'exécutent qu'une seule fois.
</details>

---

## Analogie

Pensez à une **chaîne de montage** dans une usine :
- **Pipe** : c'est un poste de transformation sur la chaîne. La donnée brute (date, nombre, texte) passe par le pipe et en ressort transformée (formatée, traduite, arrondie). La donnée d'origine n'est pas modifiée — le pipe ne fait que présenter autrement.
- **Directive** : c'est un autocollant qu'on colle sur un produit pour modifier son comportement. L'autocollant « fragile » ne change pas le produit, mais change la manière dont il est manipulé.

En Vue 2, on avait des « filtres » (`{{ date | formatDate }}`). Vue 3 les a supprimés en recommandant des fonctions ou `computed`. Angular a gardé ce concept sous le nom de **pipes** avec la même syntaxe `|`.

---

## Théorie

### Les pipes intégrés

Les pipes transforment une valeur dans le template **sans modifier la donnée source**. Syntaxe : `{{ valeur | pipe }}` ou `{{ valeur | pipe:argument }}`.

> En Angular 19 standalone, chaque pipe doit être importé dans le tableau `imports` du composant.

#### DatePipe — Formatage de dates

```typescript
import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-dates',
  imports: [DatePipe],
  template: `
    <p>Défaut : {{ maintenant() | date }}</p>
    <p>Court : {{ maintenant() | date:'shortDate' }}</p>
    <p>Complet : {{ maintenant() | date:'fullDate' }}</p>
    <p>Personnalisé : {{ maintenant() | date:'dd/MM/yyyy HH:mm' }}</p>
    <p>Français : {{ maintenant() | date:'longDate':'':'fr-FR' }}</p>
  `,
})
export class DatesComponent {
  maintenant = signal(new Date());
}
```

Résultat :
```
Défaut : Mar 5, 2026
Court : 3/5/26
Complet : Thursday, March 5, 2026
Personnalisé : 05/03/2026 14:30
Français : 5 mars 2026
```

#### CurrencyPipe — Formatage de devises

```typescript
import { CurrencyPipe } from '@angular/common';

@Component({
  imports: [CurrencyPipe],
  template: `
    <p>{{ prix() | currency }}</p>
    <p>{{ prix() | currency:'EUR' }}</p>
    <p>{{ prix() | currency:'EUR':'symbol':'1.2-2':'fr-FR' }}</p>
  `,
})
export class PrixComponent {
  prix = signal(1234.5);
}
```

Résultat :
```
$1,234.50
EUR1,234.50
1 234,50 EUR
```

#### DecimalPipe — Formatage de nombres

```typescript
import { DecimalPipe } from '@angular/common';

@Component({
  imports: [DecimalPipe],
  template: `
    <!-- Format : 'minEntier.minDecimal-maxDecimal' -->
    <p>{{ pi() | number:'1.0-2' }}</p>
    <p>{{ grand() | number:'1.0-0' }}</p>
    <p>{{ petit() | number:'1.4-4' }}</p>
  `,
})
export class NombresComponent {
  pi = signal(3.14159);      // → 3.14
  grand = signal(1234567);   // → 1,234,567
  petit = signal(0.5);       // → 0.5000
}
```

#### UpperCasePipe, LowerCasePipe, TitleCasePipe

```typescript
import { UpperCasePipe, LowerCasePipe, TitleCasePipe } from '@angular/common';

@Component({
  imports: [UpperCasePipe, LowerCasePipe, TitleCasePipe],
  template: `
    <p>{{ nom() | uppercase }}</p>
    <p>{{ nom() | lowercase }}</p>
    <p>{{ nom() | titlecase }}</p>
  `,
})
export class TexteComponent {
  nom = signal('alice dupont');
  // ALICE DUPONT
  // alice dupont
  // Alice Dupont
}
```

#### AsyncPipe — Afficher des observables

L'`AsyncPipe` souscrit automatiquement à un Observable et se désabonne à la destruction du composant :

```typescript
import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable, interval, map } from 'rxjs';

@Component({
  selector: 'app-horloge',
  imports: [AsyncPipe],
  template: `
    <p>Temps : {{ temps$ | async }}</p>
  `,
})
export class HorlogeComponent {
  temps$: Observable<string> = interval(1000).pipe(
    map(() => new Date().toLocaleTimeString())
  );
  // Pas besoin de subscribe/unsubscribe !
}
```

> Avec les signaux, `AsyncPipe` devient moins nécessaire. On peut convertir un Observable en signal avec `toSignal()`. Mais `AsyncPipe` reste utile dans certains cas.

#### Chaîner les pipes

Les pipes peuvent être enchaînés :

```html
<p>{{ dateNaissance() | date:'longDate' | uppercase }}</p>
<!-- Résultat : 15 MARS 1990 -->
```

### Créer un pipe standalone personnalisé

```typescript
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'tronquer',
})
export class TronquerPipe implements PipeTransform {
  transform(valeur: string, longueur: number = 50, suffixe: string = '...'): string {
    if (!valeur) return '';
    if (valeur.length <= longueur) return valeur;
    return valeur.substring(0, longueur).trimEnd() + suffixe;
  }
}
```

```typescript
import { TronquerPipe } from './tronquer.pipe';

@Component({
  imports: [TronquerPipe],
  template: `
    <p>{{ description() | tronquer }}</p>
    <p>{{ description() | tronquer:20 }}</p>
    <p>{{ description() | tronquer:30:' [...]' }}</p>
  `,
})
export class ArticleComponent {
  description = signal('Un texte très long qui dépasse largement la limite souhaitée pour l\'affichage');
}
```

Générer un pipe avec la CLI :

```bash
ng generate pipe tronquer
# ou
ng g p tronquer
```

#### Pipe avec calcul (ex: temps relatif)

```typescript
@Pipe({
  name: 'tempsRelatif',
})
export class TempsRelatifPipe implements PipeTransform {
  transform(valeur: Date): string {
    const maintenant = new Date();
    const diff = maintenant.getTime() - valeur.getTime();
    const secondes = Math.floor(diff / 1000);
    const minutes = Math.floor(secondes / 60);
    const heures = Math.floor(minutes / 60);
    const jours = Math.floor(heures / 24);

    if (secondes < 60) return 'il y a quelques secondes';
    if (minutes < 60) return `il y a ${minutes} minute(s)`;
    if (heures < 24) return `il y a ${heures} heure(s)`;
    return `il y a ${jours} jour(s)`;
  }
}
```

```html
<p>Publié {{ datePublication() | tempsRelatif }}</p>
<!-- Publié il y a 3 heure(s) -->
```

### Comparaison pipes Angular vs Vue

| Concept                | Vue 2                    | Vue 3                    | Angular                       |
|------------------------|--------------------------|--------------------------|-------------------------------|
| Transformation template| `{{ val \| filtre }}`   | Supprimé                 | `{{ val \| pipe }}`          |
| Alternative            | —                        | `computed()` / fonction  | Pipes (toujours supportés)   |
| Création               | `Vue.filter('nom', fn)` | —                        | `@Pipe({ name: 'nom' })`    |
| Avantage               | —                        | —                        | Réutilisable, testable, déclaratif |

> En Vue 3, vous faisiez probablement `{{ formatDate(date) }}` ou un `computed`. En Angular, les pipes sont la manière idiomatique de transformer les données dans le template.

### Les directives d'attribut

Une directive d'attribut modifie le comportement ou l'apparence d'un élément DOM existant.

#### Directive standalone personnalisée

```typescript
import { Directive, ElementRef, inject, input, effect } from '@angular/core';

@Directive({
  selector: '[appSurligner]',
})
export class SurlignerDirective {
  private el = inject(ElementRef);

  couleur = input('yellow', { alias: 'appSurligner' });

  constructor() {
    effect(() => {
      this.el.nativeElement.style.backgroundColor = this.couleur();
    });
  }
}
```

```typescript
import { SurlignerDirective } from './surligner.directive';

@Component({
  imports: [SurlignerDirective],
  template: `
    <!-- Couleur par défaut (yellow) -->
    <p appSurligner>Texte surligné en jaune</p>

    <!-- Couleur personnalisée -->
    <p [appSurligner]="'lightblue'">Texte surligné en bleu</p>
  `,
})
export class ExempleComponent {}
```

Générer une directive avec la CLI :

```bash
ng generate directive surligner
# ou
ng g d surligner
```

#### HostListener — Écouter les événements

`HostListener` permet à une directive d'écouter les événements de l'élément hôte :

```typescript
import { Directive, HostListener, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[appSurvol]',
})
export class SurvolDirective {
  private el = inject(ElementRef);
  private couleurOriginale = '';

  @HostListener('mouseenter')
  surEntree() {
    this.couleurOriginale = this.el.nativeElement.style.backgroundColor;
    this.el.nativeElement.style.backgroundColor = '#e0f7fa';
  }

  @HostListener('mouseleave')
  surSortie() {
    this.el.nativeElement.style.backgroundColor = this.couleurOriginale;
  }
}
```

```html
<div appSurvol>Survolez-moi !</div>
```

#### HostBinding — Lier des propriétés de l'hôte

`HostBinding` lie une propriété de la directive à une propriété DOM de l'élément hôte :

```typescript
import { Directive, HostBinding, HostListener } from '@angular/core';

@Directive({
  selector: '[appAccordeon]',
})
export class AccordeonDirective {
  private ouvert = false;

  @HostBinding('class.ouvert')
  get classeOuvert() {
    return this.ouvert;
  }

  @HostBinding('style.maxHeight')
  get hauteurMax() {
    return this.ouvert ? '500px' : '0px';
  }

  @HostListener('click')
  basculer() {
    this.ouvert = !this.ouvert;
  }
}
```

#### host — Alternative moderne aux décorateurs

Depuis Angular 15, on peut utiliser la propriété `host` dans le décorateur :

```typescript
@Directive({
  selector: '[appSurvol]',
  host: {
    '(mouseenter)': 'surEntree()',
    '(mouseleave)': 'surSortie()',
    '[class.survole]': 'estSurvole',
  },
})
export class SurvolDirective {
  estSurvole = false;

  surEntree() { this.estSurvole = true; }
  surSortie() { this.estSurvole = false; }
}
```

### Comparaison directives Angular vs Vue 3

| Concept                  | Vue 3                          | Angular                           |
|--------------------------|--------------------------------|-----------------------------------|
| Directive personnalisée  | `v-ma-directive`               | `appMaDirective` (sélecteur)     |
| Accès à l'élément        | `el` dans les hooks            | `inject(ElementRef)`              |
| Événements               | `mounted(el) { el.addEventListener }` | `@HostListener('event')`  |
| Binding propriété        | —                              | `@HostBinding('prop')`            |
| Cycle de vie             | `mounted`, `updated`, `unmounted` | Même hooks que les composants  |

```javascript
// Vue 3 — directive personnalisée
const vSurligner = {
  mounted(el, binding) {
    el.style.backgroundColor = binding.value || 'yellow';
  },
  updated(el, binding) {
    el.style.backgroundColor = binding.value || 'yellow';
  },
};
```

```typescript
// Angular — directive standalone équivalente
@Directive({
  selector: '[appSurligner]',
})
export class SurlignerDirective {
  private el = inject(ElementRef);
  couleur = input('yellow', { alias: 'appSurligner' });

  constructor() {
    effect(() => {
      this.el.nativeElement.style.backgroundColor = this.couleur();
    });
  }
}
```

---

## Pratique

Créez :
1. Un pipe `filtrer` qui filtre un tableau de chaînes contenant un terme de recherche
2. Une directive `appAutoFocus` qui donne le focus à un input au chargement

<details>
<summary>Solution</summary>

```typescript
// filtrer.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filtrer',
})
export class FiltrerPipe implements PipeTransform {
  transform(elements: string[], terme: string): string[] {
    if (!terme || terme.trim() === '') return elements;
    const termeMinuscule = terme.toLowerCase();
    return elements.filter(el =>
      el.toLowerCase().includes(termeMinuscule)
    );
  }
}
```

```typescript
// auto-focus.directive.ts
import { Directive, ElementRef, inject, afterNextRender } from '@angular/core';

@Directive({
  selector: '[appAutoFocus]',
})
export class AutoFocusDirective {
  private el = inject(ElementRef);

  constructor() {
    afterNextRender(() => {
      this.el.nativeElement.focus();
    });
  }
}
```

```typescript
// utilisation dans un composant
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FiltrerPipe } from './filtrer.pipe';
import { AutoFocusDirective } from './auto-focus.directive';

@Component({
  selector: 'app-recherche-fruits',
  imports: [FormsModule, FiltrerPipe, AutoFocusDirective],
  template: `
    <input
      appAutoFocus
      [(ngModel)]="terme"
      placeholder="Rechercher un fruit..."
    />

    <ul>
      @for (fruit of fruits() | filtrer:terme; track fruit) {
        <li>{{ fruit }}</li>
      } @empty {
        <li>Aucun fruit trouvé.</li>
      }
    </ul>
  `,
})
export class RechercheFruitsComponent {
  terme = '';
  fruits = signal([
    'Pomme', 'Banane', 'Cerise', 'Fraise',
    'Mangue', 'Orange', 'Poire', 'Raisin',
  ]);
}
```
</details>

---

## Résumé

### Pipes

| Pipe            | Rôle                          | Exemple                                |
|-----------------|-------------------------------|----------------------------------------|
| `DatePipe`      | Formater une date             | `{{ date \| date:'dd/MM/yyyy' }}`     |
| `CurrencyPipe`  | Formater une devise           | `{{ prix \| currency:'EUR' }}`        |
| `DecimalPipe`   | Formater un nombre            | `{{ val \| number:'1.0-2' }}`         |
| `UpperCasePipe` | Mettre en majuscules          | `{{ texte \| uppercase }}`            |
| `AsyncPipe`     | Souscrire à un Observable     | `{{ obs$ \| async }}`                 |
| Pipe custom     | Transformation personnalisée  | `@Pipe({ name: 'monPipe' })`         |

### Directives

| Concept         | Décorateur                      | Rôle                                     |
|-----------------|---------------------------------|------------------------------------------|
| Directive       | `@Directive({ selector })`      | Modifier le comportement d'un élément    |
| HostListener    | `@HostListener('event')`        | Écouter un événement sur l'hôte          |
| HostBinding     | `@HostBinding('prop')`          | Lier une propriété sur l'hôte            |
| `host: {}`      | Propriété du décorateur          | Alternative moderne aux décorateurs      |

**Points clés** :
- Les pipes sont la manière idiomatique de transformer les données dans le template Angular
- Les pipes sont **purs** par défaut (ne se recalculent que si l'entrée change)
- Les directives standalone s'importent comme les composants dans `imports: [...]`
- Utilisez `inject(ElementRef)` pour accéder à l'élément DOM dans une directive
- Les pipes remplacent les filtres de Vue 2 (supprimés en Vue 3)

---

> **Prochain cours** : [Cours 11 — Projection de contenu et ViewChild](../02-xxx/01-content-projection.md)
