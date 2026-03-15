# Correction — Exercice 07 : Pipes personnalises et directive

## Résultat attendu

Une page de demonstration affichant :
- Un texte long tronque a différentes longueurs
- Des dates affichees en format relatif ("il y a 5 min", "il y a 2 j")
- Un texte avec les occurrences d'un terme surlignees en jaune
- Des éléments qui changent de fond au survol grâce à la directive

## Code corrige

### Pipe 1 : TruncatePipe

```typescript
// src/app/exercises/ex07/truncate.pipe.ts

// Pipe : decorateur pour definir un pipe Angular
// PipeTransform : interface que le pipe doit implementer
import { Pipe, PipeTransform } from '@angular/core';

// --- Decorateur @Pipe ---
// name : le nom utilise dans le template (ex: {{ text | truncate:30 }})
// standalone : true pour etre importable directement sans NgModule
@Pipe({
  name: 'truncate',
  standalone: true,
})
export class TruncatePipe implements PipeTransform {
  // --- Methode transform ---
  // Appelee automatiquement par Angular quand le pipe est utilise dans le template
  // value : la valeur a transformer (a gauche du |)
  // maxLength : parametre optionnel (apres le : dans le template), defaut 50
  transform(value: string, maxLength: number = 50): string {
    // Guard : si le texte est plus court que la limite, on le retourne tel quel
    if (value.length <= maxLength) {
      return value;
    }
    // On coupe le texte et on ajoute '...'
    return value.substring(0, maxLength) + '...';
  }
}
```

### Pipe 2 : TimeAgoPipe

```typescript
// src/app/exercises/ex07/time-ago.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true,
  // pure: false → le pipe se recalcule a chaque cycle de detection de changement
  // Necessaire car le temps relatif change sans que l'input (la date) change
  // Attention : les pipes impurs sont plus couteux en performance
  // Pour le bonus, decommentez la ligne suivante :
  // pure: false,
})
export class TimeAgoPipe implements PipeTransform {
  // --- Methode transform ---
  // Convertit une Date en texte relatif en francais
  transform(value: Date): string {
    // On calcule la difference en millisecondes entre maintenant et la date
    const now = new Date();
    const diffMs = now.getTime() - value.getTime();

    // Conversion en unites de temps
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);

    // On retourne le texte relatif le plus precis
    if (diffSeconds < 60) {
      return "a l'instant";
    }
    if (diffMinutes < 60) {
      return `il y a ${diffMinutes} min`;
    }
    if (diffHours < 24) {
      return `il y a ${diffHours} h`;
    }
    if (diffDays < 30) {
      return `il y a ${diffDays} j`;
    }
    return `il y a ${diffMonths} mois`;
  }
}
```

### Pipe 3 : HighlightPipe

```typescript
// src/app/exercises/ex07/highlight.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'highlight',
  standalone: true,
})
export class HighlightPipe implements PipeTransform {
  // --- Methode transform ---
  // Entoure les occurrences du terme de recherche avec <mark>
  // La recherche est insensible a la casse grace au flag 'gi'
  transform(value: string, searchTerm: string): string {
    // Guard : si le terme est vide, on retourne le texte tel quel
    if (!searchTerm || searchTerm.trim() === '') {
      return value;
    }

    // On echappe les caracteres speciaux regex dans le terme de recherche
    // Par exemple, un point '.' doit etre traite comme un caractere literal
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // On cree une RegExp avec le flag 'gi' :
    // g = global (toutes les occurrences)
    // i = insensible a la casse
    const regex = new RegExp(`(${escapedTerm})`, 'gi');

    // On remplace chaque occurrence par elle-meme entouree de <mark>
    // $1 fait reference au groupe capture dans la regex
    return value.replace(regex, '<mark>$1</mark>');
  }
}
```

### Directive : HighlightDirective

```typescript
// src/app/exercises/ex07/highlight.directive.ts

// Directive : decorateur pour definir une directive d'attribut
// ElementRef : reference a l'element DOM natif
// HostListener : decorateur pour ecouter les evenements sur l'element hote
import { Directive, ElementRef, input, inject } from '@angular/core';

@Directive({
  // Le selecteur utilise la syntaxe d'attribut [appHighlight]
  // Usage : <p appHighlight> ou <p appHighlight="pink">
  selector: '[appHighlight]',
  standalone: true,
  // host : definit les listeners d'evenements sur l'element hote
  // Alternative moderne aux decorateurs @HostListener
  host: {
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
  },
})
export class HighlightDirective {
  // --- Injection de ElementRef ---
  // ElementRef donne acces a l'element DOM natif sur lequel la directive est appliquee
  private readonly el = inject(ElementRef<HTMLElement>);

  // --- Input pour la couleur ---
  // La couleur de surlignage, avec 'yellow' comme valeur par defaut
  // Usage : <p appHighlight="pink"> ou <p appHighlight> (jaune par defaut)
  readonly appHighlight = input<string>('yellow');

  // --- Methode onMouseEnter ---
  // Applique la couleur de fond quand la souris entre sur l'element
  onMouseEnter(): void {
    this.el.nativeElement.style.backgroundColor = this.appHighlight();
  }

  // --- Methode onMouseLeave ---
  // Retire la couleur de fond quand la souris quitte l'element
  onMouseLeave(): void {
    this.el.nativeElement.style.backgroundColor = '';
  }
}
```

### Composant de demonstration

```typescript
// src/app/exercises/ex07/pipes-demo.component.ts

import { Component, signal } from '@angular/core';
import { TruncatePipe } from './truncate.pipe';
import { TimeAgoPipe } from './time-ago.pipe';
import { HighlightPipe } from './highlight.pipe';
import { HighlightDirective } from './highlight.directive';

@Component({
  selector: 'app-pipes-demo',
  standalone: true,
  // On importe tous les pipes et la directive dans le composant
  imports: [TruncatePipe, TimeAgoPipe, HighlightPipe, HighlightDirective],
  template: `
    <div class="demo-container">
      <h1>Pipes et directives personnalises</h1>

      <!-- Demo TruncatePipe -->
      <section>
        <h2>Pipe truncate</h2>
        <p>Original : {{ longText }}</p>
        <!-- Sans parametre : defaut 50 caracteres -->
        <p>Tronque (50) : {{ longText | truncate }}</p>
        <!-- Avec parametre : 30 caracteres -->
        <p>Tronque (30) : {{ longText | truncate:30 }}</p>
      </section>

      <!-- Demo TimeAgoPipe -->
      <section>
        <h2>Pipe timeAgo</h2>
        @for (date of dates; track date.label) {
          <p>{{ date.label }} : {{ date.value | timeAgo }}</p>
        }
      </section>

      <!-- Demo HighlightPipe -->
      <section>
        <h2>Pipe highlight</h2>
        <input
          type="text"
          [value]="searchTerm()"
          (input)="onSearchChange($event)"
          placeholder="Terme a surligner..."
        />
        <!-- [innerHTML] est necessaire car le pipe retourne du HTML (<mark>) -->
        <p [innerHTML]="sampleText | highlight:searchTerm()"></p>
      </section>

      <!-- Demo HighlightDirective -->
      <section>
        <h2>Directive highlight (survol)</h2>
        <p appHighlight>Survolez-moi (jaune par defaut)</p>
        <p appHighlight="lightblue">Survolez-moi (bleu clair)</p>
        <p appHighlight="lightcoral">Survolez-moi (corail)</p>
      </section>
    </div>
  `,
  styles: [`
    .demo-container {
      padding: 2rem;
      max-width: 600px;
      font-family: sans-serif;
    }
    section {
      margin-bottom: 2rem;
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }
    h2 { margin-top: 0; color: #1976d2; }
    input {
      width: 100%;
      padding: 0.5rem;
      font-size: 1rem;
      margin-bottom: 0.5rem;
      box-sizing: border-box;
    }
    mark {
      background: #fff176;
      padding: 0 2px;
      border-radius: 2px;
    }
    p[appHighlight] {
      padding: 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
  `]
})
export class PipesDemoComponent {
  // Texte long pour la demo du pipe truncate
  readonly longText = 'Angular est un framework de developpement web cree par Google qui permet de construire des applications dynamiques et performantes.';

  // Dates pour la demo du pipe timeAgo
  readonly dates = [
    { label: 'Maintenant', value: new Date() },
    { label: 'Il y a 5 min', value: new Date(Date.now() - 5 * 60 * 1000) },
    { label: 'Il y a 3 heures', value: new Date(Date.now() - 3 * 60 * 60 * 1000) },
    { label: 'Il y a 2 jours', value: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  ];

  // Texte pour la demo du pipe highlight
  readonly sampleText = 'Angular utilise des composants standalone, des signaux reactifs et une syntaxe de templates moderne avec @if et @for.';

  // Terme de recherche pour le pipe highlight
  readonly searchTerm = signal<string>('');

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }
}
```

## Ce que tu aurais pu oublier

### 1. Oublier `standalone: true` sur le pipe
- ❌ Pipe sans `standalone: true` → doit etre declare dans un NgModule
- ✅ `@Pipe({ name: '...', standalone: true })` → importable directement

### 2. Oublier d'implementer `PipeTransform`
- ❌ Pas d'`implements PipeTransform` → pas d'erreur TS mais mauvaise pratique
- ✅ `export class TruncatePipe implements PipeTransform` → force la signature de `transform()`

### 3. Ne pas echapper les caracteres regex dans HighlightPipe
- ❌ `new RegExp(searchTerm, 'gi')` → crash si le terme contient `.`, `*`, `(`, etc.
- ✅ Echapper avec `searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`

### 4. Utiliser `innerHTML` sans le pipe highlight
- ❌ `{{ text | highlight:term }}` → affiche le HTML brut avec les balises `<mark>`
- ✅ `[innerHTML]="text | highlight:term"` → Angular interprete le HTML

### 5. Confondre directive et pipe
- ❌ Utiliser un pipe pour manipuler le DOM → les pipes transforment des valeurs
- ✅ Utiliser une directive pour manipuler le DOM (ElementRef) et un pipe pour transformer du texte

## Concepts clés utilises

| Concept | Explication |
|---------|-------------|
| `@Pipe({ name, standalone })` | Decorateur pour définir un pipe personnalise |
| `PipeTransform` | Interface avec la méthode `transform()` a implementer |
| `{{ value \| pipe:arg }}` | Syntaxe d'utilisation d'un pipe dans le template |
| `@Directive({ selector })` | Decorateur pour définir une directive d'attribut |
| `inject(ElementRef)` | Acces a l'élément DOM natif sur lequel la directive est appliquee |
| `host: { '(event)': 'handler()' }` | Declaration des event listeners dans le decorateur |
| `input()` dans une directive | Passer des paramètres à une directive via un input |
| `[innerHTML]` | Binding qui interprete le HTML (nécessaire quand un pipe retourne du HTML) |
