# Cours 11 — Signaux avancés : linkedSignal, viewChild, contentChild

> **Objectif** : Maîtriser les signaux avancés d'Angular 19 — créer des signaux liés qui se réinitialisent automatiquement, interroger le template et le contenu projeté via des signaux, et comprendre les équivalents Vue.

---

## Rappel du cours précédent

<details>
<summary>Quelle est la différence entre signal() et computed() ?</summary>

`signal()` crée un état mutable (lecture/écriture), tandis que `computed()` crée une valeur dérivée en lecture seule qui se recalcule automatiquement quand ses dépendances changent. C'est l'équivalent de `ref()` vs `computed()` en Vue.
</details>

<details>
<summary>Comment mettre à jour un signal contenant un tableau sans le muter ?</summary>

On utilise `update()` avec un nouveau tableau : `items.update(prev => [...prev, newItem])`. On ne doit jamais muter directement le tableau via `.push()` car Angular ne détecterait pas le changement.
</details>

<details>
<summary>Comment un effect() réagit-il aux changements de signaux ?</summary>

`effect()` s'exécute automatiquement quand un signal lu dans son callback change. Il est utilisé pour les effets de bord (logs, localStorage, appels DOM). Il faut éviter de modifier d'autres signaux dans un effect.
</details>

---

## Analogie

**En Vue**, tu connais les template refs (`ref="monElement"`) et `useTemplateRef()` pour accéder à un élément du DOM ou un composant enfant. Angular propose le même concept mais via des **signaux** : `viewChild()` et `viewChildren()` renvoient directement un `Signal` qui se met à jour quand le template change.

Pense à `linkedSignal()` comme un `ref()` Vue qui aurait un `watch()` intégré pour se réinitialiser quand une source change — pas besoin d'écrire le watch toi-même.

---

## Théorie

### linkedSignal() — Un signal lié à une source

`linkedSignal()` crée un signal en lecture/écriture dont la valeur est **recalculée automatiquement** quand un signal source change, mais qui peut aussi être modifié manuellement entre-temps.

**Cas d'usage typique** : un formulaire de sélection qui se réinitialise quand la liste de données change.

```typescript
import { signal, linkedSignal } from '@angular/core';

// Liste de produits qui peut changer (ex: filtre par catégorie)
const produits = signal<Produit[]>([]);

// Le produit sélectionné se réinitialise au premier de la liste
// quand la liste change
const produitSelectionne = linkedSignal(() => produits()[0] ?? null);

// Mais l'utilisateur peut le modifier manuellement
produitSelectionne.set(unAutreProduit);
// → fonctionne, la valeur est écrasée

// Quand produits() change, produitSelectionne revient au premier
```

**Forme avancée avec source et computation séparées** :

```typescript
const categorieId = signal<number>(1);
const produits = signal<Produit[]>([]);

const produitSelectionne = linkedSignal({
  source: categorieId,
  computation: (catId) => {
    // Recalculé à chaque changement de categorieId
    return produits().find(p => p.categorieId === catId) ?? null;
  }
});
```

**Vue vs Angular** :

```typescript
// ❌ En Vue, tu écrirais ceci (plus verbeux)
const produitSelectionne = ref(null);
watch(produits, (newList) => {
  produitSelectionne.value = newList[0] ?? null;
});

// ✅ En Angular, linkedSignal() combine les deux
const produitSelectionne = linkedSignal(() => produits()[0] ?? null);
```

---

### viewChild() / viewChildren() — Interroger le template

`viewChild()` et `viewChildren()` remplacent les anciens décorateurs `@ViewChild` / `@ViewChildren`. Ils renvoient des **signaux** qui se mettent à jour automatiquement.

```typescript
import { Component, viewChild, viewChildren, ElementRef } from '@angular/core';

@Component({
  selector: 'app-formulaire',
  template: `
    <input #champNom type="text" />
    <input #champEmail type="email" />
    <div #conteneur>
      <app-champ *ngFor="let c of champs()" />
    </div>
  `
})
export class FormulaireComponent {
  // Un seul élément — Signal<ElementRef | undefined>
  champNom = viewChild<ElementRef>('champNom');

  // Plusieurs éléments — Signal<readonly ElementRef[]>
  tousLesChamps = viewChildren<ElementRef>('champNom, champEmail');

  // Par type de composant
  composantsChamp = viewChildren(ChampComponent);

  focusSurNom() {
    // Le signal peut être undefined si l'élément n'existe pas encore
    this.champNom()?.nativeElement.focus();
  }
}
```

**viewChild.required()** — quand l'élément doit toujours exister :

```typescript
// ✅ Si tu es sûr que l'élément existe toujours dans le template
canvas = viewChild.required<ElementRef>('monCanvas');

ngAfterViewInit() {
  // Pas besoin de vérifier undefined
  const ctx = this.canvas().nativeElement.getContext('2d');
}
```

**Équivalent Vue** :

```typescript
// Vue 3
const champNom = useTemplateRef<HTMLInputElement>('champNom');

// Angular 19
champNom = viewChild<ElementRef<HTMLInputElement>>('champNom');
```

---

### contentChild() / contentChildren() — Contenu projeté

Quand un composant parent **projette** du contenu dans un enfant via `<ng-content>`, l'enfant peut interroger ce contenu avec `contentChild()` / `contentChildren()`.

```typescript
// composant-onglets.component.ts
@Component({
  selector: 'app-onglets',
  template: `
    <div class="onglets-header">
      @for (onglet of onglets(); track onglet.titre) {
        <button (click)="selectionner(onglet)">{{ onglet.titre }}</button>
      }
    </div>
    <ng-content />
  `
})
export class OngletsComponent {
  // Interroge les composants OngletComponent projetés par le parent
  onglets = contentChildren(OngletComponent);

  selectionner(onglet: OngletComponent) {
    // ...
  }
}
```

```html
<!-- Utilisation par le parent -->
<app-onglets>
  <app-onglet titre="Général">Contenu 1</app-onglet>
  <app-onglet titre="Sécurité">Contenu 2</app-onglet>
</app-onglets>
```

**Différence clé** :
- `viewChild()` → éléments dans le **propre template** du composant
- `contentChild()` → éléments **projetés par le parent** via `<ng-content>`

---

### Patterns et anti-patterns

```typescript
// ❌ Anti-pattern : utiliser @ViewChild décorateur (ancien style)
@ViewChild('monElement') monElement!: ElementRef;

// ✅ Moderne : signal-based query
monElement = viewChild<ElementRef>('monElement');
```

```typescript
// ❌ Anti-pattern : linkedSignal pour du calcul pur (utiliser computed)
const total = linkedSignal(() => prix() * quantite());

// ✅ computed() suffit quand on n'a pas besoin d'écrire dans le signal
const total = computed(() => prix() * quantite());
```

```typescript
// ❌ Anti-pattern : oublier que viewChild peut être undefined
this.champNom().nativeElement.focus(); // 💥 TypeError si l'élément n'existe pas

// ✅ Vérifier ou utiliser .required()
this.champNom()?.nativeElement.focus();
// ou
champNom = viewChild.required<ElementRef>('champNom');
```

---

## Pratique

### Exercice : Sélecteur de catégorie avec réinitialisation

Crée un composant `CategorieSelecteurComponent` qui :

1. A un signal `categories` contenant une liste de catégories (avec id et nom)
2. A un `linkedSignal` `categorieSelectionnee` qui pointe sur la première catégorie et se réinitialise quand la liste change
3. A un `viewChild` sur un champ de recherche pour le focus automatique
4. Affiche la liste et permet de sélectionner une catégorie
5. Quand on clique sur "Réinitialiser les catégories", la sélection revient à la première

<details>
<summary>Voir la solution</summary>

```typescript
import { Component, signal, linkedSignal, viewChild, ElementRef, afterNextRender } from '@angular/core';

interface Categorie {
  id: number;
  nom: string;
}

@Component({
  selector: 'app-categorie-selecteur',
  template: `
    <input #recherche type="text" placeholder="Rechercher..." />

    <ul>
      @for (cat of categories(); track cat.id) {
        <li
          [class.active]="categorieSelectionnee()?.id === cat.id"
          (click)="categorieSelectionnee.set(cat)"
        >
          {{ cat.nom }}
        </li>
      }
    </ul>

    <p>Sélection : {{ categorieSelectionnee()?.nom ?? 'Aucune' }}</p>

    <button (click)="changerCategories()">Charger d'autres catégories</button>
  `
})
export class CategorieSelecteurComponent {
  champRecherche = viewChild<ElementRef<HTMLInputElement>>('recherche');

  categories = signal<Categorie[]>([
    { id: 1, nom: 'Électronique' },
    { id: 2, nom: 'Vêtements' },
    { id: 3, nom: 'Alimentation' },
  ]);

  // Se réinitialise automatiquement quand categories() change
  categorieSelectionnee = linkedSignal(() => this.categories()[0] ?? null);

  constructor() {
    // Focus automatique après le rendu
    afterNextRender(() => {
      this.champRecherche()?.nativeElement.focus();
    });
  }

  changerCategories() {
    this.categories.set([
      { id: 10, nom: 'Sport' },
      { id: 11, nom: 'Musique' },
    ]);
    // categorieSelectionnee passe automatiquement à "Sport"
  }
}
```
</details>

---

## Résumé

| Concept | Rôle | Équivalent Vue |
|---------|------|----------------|
| `linkedSignal()` | Signal read/write qui se réinitialise quand sa source change | `ref()` + `watch()` |
| `viewChild()` | Interroge un élément du propre template (Signal) | `useTemplateRef()` |
| `viewChildren()` | Interroge plusieurs éléments du template (Signal) | Pas d'équivalent direct |
| `contentChild()` | Interroge un élément projeté par le parent | Pas d'équivalent (slots Vue) |
| `contentChildren()` | Interroge plusieurs éléments projetés | Pas d'équivalent |
| `.required()` | Garantit que l'élément existe (pas d'undefined) | — |

- Utilise `linkedSignal()` quand tu as besoin d'un signal **modifiable** qui se réinitialise sur une source.
- Utilise `computed()` si tu n'as besoin que de **lecture seule**.
- Préfère `viewChild.required()` quand tu es certain que l'élément est toujours dans le template.

---

> **Prochain cours** : [Cours 12 — Resource API : chargement asynchrone avec signals](./02-resource-api.md)
