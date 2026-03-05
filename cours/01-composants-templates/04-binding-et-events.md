# Cours 7 — Binding et événements

> **Objectif** : Maîtriser les différentes formes de data binding en Angular (property, attribute, class, style, event, two-way) et comprendre leur correspondance avec la syntaxe Vue (`:prop`, `@event`, `v-model`).

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la nouvelle syntaxe pour afficher conditionnellement un élément dans le template ?</summary>

```html
@if (condition()) {
  <p>Visible</p>
} @else {
  <p>Caché</p>
}
```
Elle remplace l'ancienne directive `*ngIf`.
</details>

<details>
<summary>2. Pourquoi la propriété `track` est-elle obligatoire dans @for ?</summary>

`track` permet à Angular d'identifier chaque élément de manière unique pour optimiser les mises à jour du DOM. Sans `track`, Angular devrait recréer tous les éléments à chaque changement, ce qui nuit aux performances.
</details>

<details>
<summary>3. Quel est l'équivalent Angular de `v-show` en Vue ?</summary>

Le binding `[hidden]`. Il masque l'élément via CSS sans le supprimer du DOM, contrairement à `@if` qui détruit et recrée l'élément.
</details>

---

## Analogie

Pensez au tableau de bord d'une voiture :
- **Property binding** `[...]` : le compteur de vitesse *lit* une valeur du moteur et l'affiche — c'est un flux de données unidirectionnel (composant vers DOM)
- **Event binding** `(...)` : quand vous appuyez sur le klaxon, un *événement* est envoyé au système — le DOM envoie une information au composant
- **Two-way binding** `[(...)]` : le volant — vous tournez et la voiture suit, mais la route peut aussi ramener le volant — flux bidirectionnel

Les crochets `[]` sont comme des **entrées** (données qui entrent dans le DOM), les parenthèses `()` sont comme des **sorties** (événements qui sortent du DOM).

---

## Théorie

### Vue d'ensemble des syntaxes de binding

| Syntaxe              | Direction           | Exemple                              |
|----------------------|---------------------|--------------------------------------|
| `{{ expr }}`         | Composant → DOM     | `{{ titre() }}`                      |
| `[propriété]`        | Composant → DOM     | `[disabled]="estDesactive()"`        |
| `(événement)`        | DOM → Composant     | `(click)="gerer()"`                  |
| `[(propriété)]`      | Bidirectionnel      | `[(ngModel)]="nom"`                  |

### Property binding — `[propriété]="expression"`

Lie une propriété DOM à une expression du composant :

```typescript
@Component({
  selector: 'app-image',
  template: `
    <!-- Property binding -->
    <img [src]="urlImage()" [alt]="description()" />
    <button [disabled]="chargement()">Envoyer</button>
    <input [value]="nom()" [placeholder]="indice()" />

    <!-- ❌ Ne pas confondre avec l'interpolation pour les attributs -->
    <img src="{{ urlImage() }}" />  <!-- Fonctionne mais déconseillé -->

    <!-- ✅ Préférez le property binding -->
    <img [src]="urlImage()" />
  `,
})
export class ImageComponent {
  urlImage = signal('https://example.com/photo.jpg');
  description = signal('Photo de profil');
  chargement = signal(false);
  nom = signal('Alice');
  indice = signal('Entrez votre nom');
}
```

> **Règle** : utilisez `[propriété]` pour tout ce qui est dynamique. L'interpolation `{{ }}` est réservée au contenu textuel.

### Attribute binding — `[attr.nom]="expression"`

Certains attributs HTML n'ont pas de propriété DOM correspondante. On utilise `[attr.xxx]` :

```html
<!-- Attributs ARIA pour l'accessibilité -->
<button [attr.aria-label]="labelBouton()">X</button>

<!-- Attributs data- personnalisés -->
<div [attr.data-id]="elementId()"></div>

<!-- colspan (pas de propriété DOM) -->
<td [attr.colspan]="colonnes()">Total</td>
```

> **Quand utiliser `[attr.xxx]` ?** Uniquement quand la propriété DOM n'existe pas. Pour `src`, `href`, `disabled`, etc., le property binding classique `[propriété]` suffit.

### Class binding — `[class.nom]="condition"`

Ajoute ou retire une classe CSS selon une condition :

```html
<!-- Classe unique conditionnelle -->
<div [class.actif]="estActif()">Menu</div>
<li [class.selectionne]="estSelectionne()">Item</li>

<!-- Plusieurs classes conditionnelles -->
<div
  [class.erreur]="aDesErreurs()"
  [class.succes]="!aDesErreurs()"
  [class.anime]="enAnimation()"
>
  Message
</div>

<!-- Objet de classes (comme :class en Vue) -->
<div [ngClass]="{ 'actif': estActif(), 'desactive': !estActif() }">
  Contenu
</div>
```

**Comparaison avec Vue** :

```vue
<!-- Vue 3 -->
<div :class="{ actif: estActif, selectionne: estSelectionne }">
<div :class="['base', estActif ? 'actif' : '']">
```

```html
<!-- Angular -->
<div [class.actif]="estActif()" [class.selectionne]="estSelectionne()">
<div [ngClass]="{ 'base': true, 'actif': estActif() }">
```

### Style binding — `[style.propriété]="expression"`

Lie des styles inline dynamiques :

```html
<!-- Style unique -->
<div [style.color]="couleurTexte()">Texte coloré</div>
<div [style.width.px]="largeur()">Barre</div>
<div [style.font-size.rem]="taillePolice()">Grand texte</div>

<!-- Plusieurs styles -->
<div
  [style.background-color]="couleurFond()"
  [style.opacity]="opacite()"
  [style.transform]="'rotate(' + rotation() + 'deg)'"
>
  Box
</div>
```

> Notez la syntaxe pratique `[style.width.px]` qui ajoute automatiquement l'unité.

**Comparaison avec Vue** :

```vue
<!-- Vue 3 -->
<div :style="{ color: couleurTexte, fontSize: taillePolice + 'rem' }">
```

```html
<!-- Angular -->
<div [style.color]="couleurTexte()" [style.font-size.rem]="taillePolice()">
```

### Event binding — `(événement)="handler($event)"`

Écoute un événement DOM et appelle une méthode du composant :

```typescript
@Component({
  selector: 'app-formulaire',
  template: `
    <!-- Click simple -->
    <button (click)="enregistrer()">Sauvegarder</button>

    <!-- Avec l'objet événement -->
    <input (input)="surSaisie($event)" />
    <input (keyup.enter)="soumettre()" />

    <!-- Événements multiples -->
    <div
      (mouseenter)="survol.set(true)"
      (mouseleave)="survol.set(false)"
    >
      {{ survol() ? 'Survolé !' : 'Survolez-moi' }}
    </div>
  `,
})
export class FormulaireComponent {
  survol = signal(false);

  enregistrer() {
    console.log('Sauvegardé !');
  }

  surSaisie(event: Event) {
    const input = event.target as HTMLInputElement;
    console.log('Valeur :', input.value);
  }

  soumettre() {
    console.log('Formulaire soumis !');
  }
}
```

**Raccourcis clavier** — Angular supporte les key events filtrés :

```html
<input (keyup.enter)="soumettre()" />
<input (keydown.escape)="annuler()" />
<input (keydown.control.s)="sauvegarder()" />
```

**Comparaison avec Vue** :

| Vue 3                          | Angular                          |
|--------------------------------|----------------------------------|
| `@click="handler"`            | `(click)="handler()"`           |
| `@input="handler"`            | `(input)="handler($event)"`    |
| `@keyup.enter="handler"`      | `(keyup.enter)="handler()"`    |
| `@click.prevent="handler"`    | Gérer dans le handler            |

> En Angular, les modificateurs comme `.prevent` ou `.stop` n'existent pas dans le template. Vous devez appeler `event.preventDefault()` ou `event.stopPropagation()` dans le handler.

### Two-way binding — `[(ngModel)]`

Le two-way binding combine property binding et event binding. Pour les formulaires, Angular fournit `ngModel` :

```typescript
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profil',
  imports: [FormsModule],  // ⚠️ Import nécessaire !
  template: `
    <input [(ngModel)]="nom" placeholder="Votre nom" />
    <p>Bonjour {{ nom }} !</p>
  `,
})
export class ProfilComponent {
  nom = 'Alice';  // Note : pas un signal ici, ngModel classique
}
```

> `[(ngModel)]` est la syntaxe "banana in a box" (banane dans une boîte) — les parenthèses `()` à l'intérieur des crochets `[]`.

**Comparaison avec Vue** :

```vue
<!-- Vue 3 -->
<input v-model="nom" />
```

```html
<!-- Angular -->
<input [(ngModel)]="nom" />
```

> **Important** : `FormsModule` doit être importé pour utiliser `[(ngModel)]`. En Vue, `v-model` fonctionne sans import supplémentaire.

### Template reference variables — `#maVariable`

Permet de référencer un élément DOM ou un composant directement dans le template :

```html
<!-- Référence à un élément DOM -->
<input #champNom type="text" />
<button (click)="saluer(champNom.value)">Saluer</button>

<!-- Référence utilisée pour le focus -->
<input #champRecherche type="text" />
<button (click)="champRecherche.focus()">Focus</button>
```

```typescript
// Dans le composant, on peut accéder à la référence avec viewChild
import { Component, viewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-recherche',
  template: `
    <input #champRecherche type="text" />
    <button (click)="focuser()">Focus</button>
  `,
})
export class RechercheComponent {
  champRecherche = viewChild<ElementRef>('champRecherche');

  focuser() {
    this.champRecherche()?.nativeElement.focus();
  }
}
```

**Comparaison avec Vue** :

```vue
<!-- Vue 3 -->
<input ref="champRecherche" />
<!-- Accès via champRecherche.value dans le script -->
```

```html
<!-- Angular -->
<input #champRecherche />
<!-- Accès via viewChild('champRecherche') dans la classe -->
```

### Tableau récapitulatif : Vue 3 vs Angular

| Fonctionnalité        | Vue 3                 | Angular                    |
|-----------------------|-----------------------|----------------------------|
| Property binding      | `:prop="val"`         | `[prop]="val"`             |
| Event binding         | `@event="handler"`   | `(event)="handler()"`      |
| Two-way binding       | `v-model="val"`       | `[(ngModel)]="val"`        |
| Class conditionnelle  | `:class="{ a: bool }"` | `[class.a]="bool"`       |
| Style dynamique       | `:style="{ color }"` | `[style.color]="val"`      |
| Ref template          | `ref="nom"`           | `#nom`                     |

---

## Pratique

Créez un composant `CarteCouleur` qui :
1. Affiche un rectangle dont la couleur de fond est liée à un signal
2. Affiche la valeur hexadécimale de la couleur
3. A un input de type `color` avec two-way binding
4. Change l'opacité au survol de la souris (event binding `mouseenter`/`mouseleave`)
5. Ajoute la classe `bordure` quand la couleur est sombre

<details>
<summary>Solution</summary>

```typescript
import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-carte-couleur',
  imports: [FormsModule],
  template: `
    <div
      class="carte"
      [class.bordure]="estSombre()"
      [style.background-color]="couleur()"
      [style.opacity]="survole() ? 0.8 : 1"
      (mouseenter)="survole.set(true)"
      (mouseleave)="survole.set(false)"
    >
      <p [style.color]="estSombre() ? 'white' : 'black'">
        {{ couleur() }}
      </p>
    </div>

    <label>
      Choisir une couleur :
      <input type="color" [(ngModel)]="couleurModel" (input)="mettreAJour($event)" />
    </label>
  `,
  styles: [`
    .carte {
      width: 200px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: opacity 0.2s;
      margin-bottom: 12px;
    }
    .bordure { border: 2px solid white; }
  `],
})
export class CarteCouleurComponent {
  couleur = signal('#3498db');
  survole = signal(false);
  couleurModel = '#3498db';

  estSombre = computed(() => {
    const hex = this.couleur().replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  });

  mettreAJour(event: Event) {
    const input = event.target as HTMLInputElement;
    this.couleur.set(input.value);
  }
}
```
</details>

---

## Résumé

- **`[propriété]`** : lie une propriété DOM à une expression (unidirectionnel, composant vers DOM)
- **`[attr.nom]`** : pour les attributs HTML sans propriété DOM correspondante
- **`[class.nom]`** : ajoute/retire une classe selon une condition booléenne
- **`[style.prop]`** : lie un style inline, avec support d'unités (`[style.width.px]`)
- **`(événement)`** : écoute un événement DOM, supporte les raccourcis clavier
- **`[(ngModel)]`** : two-way binding pour les formulaires (nécessite `FormsModule`)
- **`#variable`** : référence un élément du template, accessible avec `viewChild()`
- **Mnémonique** : `[]` = entrée, `()` = sortie, `[()]` = les deux

---

> **Prochain cours** : [Cours 8 — input(), output() et model()](./05-input-output-model.md)
