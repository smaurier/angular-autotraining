# Cours 8 — input(), output() et model()

> **Objectif** : Maîtriser la communication parent-enfant en Angular 19 avec les nouvelles API signal-based : `input()`, `output()` et `model()`. Comprendre leur correspondance avec `defineProps`, `defineEmits` et `v-model` de Vue 3.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle syntaxe utilise-t-on pour lier une propriété DOM à une expression du composant ?</summary>

Le **property binding** avec des crochets : `[propriété]="expression"`. Par exemple : `[disabled]="estDesactive()"`.
</details>

<details>
<summary>2. Comment écoute-t-on un événement dans le template Angular ?</summary>

Avec des parenthèses : `(événement)="handler()"`. Par exemple : `(click)="enregistrer()"`. On peut accéder à l'objet événement via `$event`.
</details>

<details>
<summary>3. Quel module faut-il importer pour utiliser [(ngModel)] ?</summary>

`FormsModule` depuis `@angular/forms`. Il doit être ajouté dans le tableau `imports` du composant standalone.
</details>

---

## Analogie

Pensez à un **distributeur automatique** :
- **input()** : c'est la fente ou vous insérez les pièces — des données entrent dans la machine (du parent vers l'enfant)
- **output()** : c'est le mécanisme qui délivre la boisson et rend la monnaie — des événements sortent de la machine (de l'enfant vers le parent)
- **model()** : c'est un écran tactile interactif — vous sélectionnez un produit (entrée) et l'écran se met à jour pour montrer votre choix (sortie) — communication bidirectionnelle

---

## Théorie

### L'ancienne syntaxe vs la nouvelle

Angular 19 introduit des API fonctionnelles basées sur les signaux. Voici la comparaison :

```typescript
// ❌ Ancienne syntaxe (décorateurs)
@Input() nom: string = '';
@Input({ required: true }) id!: number;
@Output() selection = new EventEmitter<string>();
```

```typescript
// ✅ Nouvelle syntaxe (signal-based, Angular 17.1+)
nom = input('');                    // InputSignal<string>
id = input.required<number>();      // InputSignal<number>
selection = output<string>();       // OutputEmitterRef<string>
```

### input() — Recevoir des données du parent

`input()` crée un signal en lecture seule dont la valeur est fournie par le composant parent.

#### Input optionnel avec valeur par défaut

```typescript
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-carte',
  template: `
    <div class="carte">
      <h3>{{ titre() }}</h3>
      <p>{{ description() }}</p>
    </div>
  `,
})
export class CarteComponent {
  // Input optionnel avec valeur par défaut
  titre = input('Sans titre');         // InputSignal<string>
  description = input('');             // InputSignal<string>
}
```

```html
<!-- Utilisation par le parent -->
<app-carte [titre]="'Mon article'" [description]="'Un super article'" />
<app-carte />  <!-- Utilise les valeurs par défaut -->
```

#### Input obligatoire

```typescript
@Component({
  selector: 'app-utilisateur',
  template: `
    <div>
      <strong>{{ nom() }}</strong>
      <span>({{ age() }} ans)</span>
    </div>
  `,
})
export class UtilisateurComponent {
  // Input obligatoire — erreur de compilation si non fourni
  nom = input.required<string>();     // InputSignal<string>
  age = input.required<number>();     // InputSignal<number>
}
```

```html
<!-- ✅ Tous les inputs requis sont fournis -->
<app-utilisateur [nom]="'Alice'" [age]="28" />

<!-- ❌ Erreur de compilation : 'nom' est requis -->
<app-utilisateur [age]="28" />
```

#### Input avec transformation

La propriété `transform` permet de transformer la valeur reçue :

```typescript
import { Component, input, booleanAttribute, numberAttribute } from '@angular/core';

@Component({
  selector: 'app-bouton',
  template: `
    <button [disabled]="desactive()">
      {{ label() }}
    </button>
  `,
})
export class BoutonComponent {
  label = input('Cliquer');

  // Transforme l'attribut string en boolean
  desactive = input(false, { transform: booleanAttribute });

  // Transforme l'attribut string en number
  taille = input(16, { transform: numberAttribute });
}
```

```html
<!-- L'attribut HTML 'desactive' (string) est transformé en boolean -->
<app-bouton desactive />           <!-- desactive() === true -->
<app-bouton [desactive]="false" /> <!-- desactive() === false -->
<app-bouton [taille]="24" />       <!-- taille() === 24 -->
```

#### Input avec alias

```typescript
// L'input s'appelle 'label' côté template parent, mais 'labelTexte' dans le composant
labelTexte = input('', { alias: 'label' });
```

```html
<app-bouton [label]="'Envoyer'" />
```

### Utiliser un input dans un computed

Comme `input()` retourne un signal, il s'intègre naturellement avec `computed()` :

```typescript
@Component({
  selector: 'app-prix',
  template: `<p>{{ prixFormate() }}</p>`,
})
export class PrixComponent {
  montant = input.required<number>();
  devise = input('EUR');

  prixFormate = computed(() =>
    `${this.montant().toFixed(2)} ${this.devise()}`
  );
}
```

### output() — Émettre des événements vers le parent

`output()` crée un émetteur d'événements typé :

```typescript
import { Component, output } from '@angular/core';

@Component({
  selector: 'app-recherche',
  template: `
    <input
      #champ
      type="text"
      placeholder="Rechercher..."
      (keyup.enter)="lancer(champ.value)"
    />
    <button (click)="lancer(champ.value)">Chercher</button>
    <button (click)="annulation.emit()">Annuler</button>
  `,
})
export class RechercheComponent {
  // Output typé
  recherche = output<string>();      // OutputEmitterRef<string>
  annulation = output<void>();       // OutputEmitterRef<void>

  lancer(terme: string) {
    this.recherche.emit(terme);
  }
}
```

```html
<!-- Le parent écoute les événements -->
<app-recherche
  (recherche)="surRecherche($event)"
  (annulation)="fermerRecherche()"
/>
```

```typescript
// Dans le parent
surRecherche(terme: string) {
  console.log('Recherche :', terme);
}
```

> `$event` contient la valeur émise. C'est comme `$emit` en Vue, mais avec un typage fort.

### model() — Communication bidirectionnelle

`model()` combine `input()` et `output()` pour créer un binding bidirectionnel. C'est l'équivalent de `v-model` sur un composant enfant en Vue 3.

```typescript
import { Component, model } from '@angular/core';

@Component({
  selector: 'app-toggle',
  template: `
    <button (click)="basculer()">
      {{ actif() ? 'ON' : 'OFF' }}
    </button>
  `,
  styles: [`
    button { padding: 8px 16px; border-radius: 4px; }
  `],
})
export class ToggleComponent {
  // model() = input + output combinés
  actif = model(false);  // ModelSignal<boolean>

  basculer() {
    this.actif.update(v => !v);  // Met à jour et notifie le parent
  }
}
```

```html
<!-- Le parent utilise la syntaxe banana-in-a-box -->
<app-toggle [(actif)]="monBooleen" />

<!-- Équivalent décomposé (ce que fait Angular en coulisses) -->
<app-toggle [actif]="monBooleen" (actifChange)="monBooleen = $event" />
```

#### model() avec un signal côté parent

```typescript
@Component({
  selector: 'app-parent',
  imports: [ToggleComponent],
  template: `
    <p>État : {{ modeNuit() ? 'Nuit' : 'Jour' }}</p>
    <app-toggle [(actif)]="modeNuit" />
  `,
})
export class ParentComponent {
  modeNuit = signal(false);
}
```

#### model.required()

```typescript
@Component({
  selector: 'app-slider',
  template: `
    <input
      type="range"
      [min]="min()"
      [max]="max()"
      [value]="valeur()"
      (input)="surChangement($event)"
    />
    <span>{{ valeur() }}</span>
  `,
})
export class SliderComponent {
  valeur = model.required<number>();  // Obligatoire
  min = input(0);
  max = input(100);

  surChangement(event: Event) {
    const input = event.target as HTMLInputElement;
    this.valeur.set(Number(input.value));
  }
}
```

### Comparaison complète avec Vue 3

| Concept                 | Vue 3 (Composition API)          | Angular 19                        |
|-------------------------|----------------------------------|-----------------------------------|
| Props                   | `defineProps<{ nom: string }>()`| `nom = input.required<string>()` |
| Props avec défaut       | `withDefaults(defineProps(), {})` | `nom = input('valeur')`         |
| Événements              | `defineEmits(['click'])`         | `click = output<void>()`        |
| Émettre                 | `emit('click', valeur)`          | `click.emit(valeur)`            |
| v-model                 | `defineModel<boolean>()`         | `actif = model(false)`          |
| v-model obligatoire     | —                                | `actif = model.required<T>()`   |
| Accès dans le script    | `props.nom`                      | `this.nom()` (c'est un signal)  |
| Accès dans le template  | `{{ nom }}`                      | `{{ nom() }}`                   |

### Patron complet : parent-enfant

Voici un exemple complet illustrant `input`, `output` et `model` ensemble :

```typescript
// enfant : carte-produit.component.ts
@Component({
  selector: 'app-carte-produit',
  template: `
    <div class="carte" [class.favori]="estFavori()">
      <h3>{{ nom() }}</h3>
      <p>{{ prix() }} EUR</p>
      <button (click)="estFavori.update(v => !v)">
        {{ estFavori() ? '★' : '☆' }}
      </button>
      <button (click)="ajoutPanier.emit(nom())">
        Ajouter au panier
      </button>
    </div>
  `,
})
export class CarteProduitComponent {
  nom = input.required<string>();        // Donnée du parent (lecture seule)
  prix = input.required<number>();       // Donnée du parent (lecture seule)
  estFavori = model(false);              // Bidirectionnel avec le parent
  ajoutPanier = output<string>();        // Événement vers le parent
}
```

```typescript
// parent : vitrine.component.ts
@Component({
  selector: 'app-vitrine',
  imports: [CarteProduitComponent],
  template: `
    @for (produit of produits(); track produit.id) {
      <app-carte-produit
        [nom]="produit.nom"
        [prix]="produit.prix"
        [(estFavori)]="produit.favori"
        (ajoutPanier)="ajouterAuPanier($event)"
      />
    }
  `,
})
export class VitrineComponent {
  produits = signal([
    { id: 1, nom: 'Clavier', prix: 89, favori: false },
    { id: 2, nom: 'Souris', prix: 49, favori: true },
  ]);

  ajouterAuPanier(nomProduit: string) {
    console.log('Ajouté :', nomProduit);
  }
}
```

---

## Pratique

Créez un composant `Evaluation` (étoiles de notation) avec :
1. Un `input.required<number>()` pour le nombre maximum d'étoiles
2. Un `model<number>()` pour la note sélectionnée (bidirectionnel)
3. Un `output<number>()` qui émet quand la note change
4. Le parent affiche la note actuelle et peut la réinitialiser

<details>
<summary>Solution</summary>

```typescript
// evaluation.component.ts
import { Component, input, model, output, computed } from '@angular/core';

@Component({
  selector: 'app-evaluation',
  template: `
    @for (etoile of etoiles(); track etoile) {
      <button
        (click)="noter(etoile)"
        [class.remplie]="etoile <= note()"
        [attr.aria-label]="etoile + ' étoile(s)'"
      >
        {{ etoile <= note() ? '★' : '☆' }}
      </button>
    }
  `,
  styles: [`
    button {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
    }
    .remplie { color: gold; }
  `],
})
export class EvaluationComponent {
  maxEtoiles = input.required<number>();
  note = model(0);
  noteChangee = output<number>();

  etoiles = computed(() =>
    Array.from({ length: this.maxEtoiles() }, (_, i) => i + 1)
  );

  noter(valeur: number) {
    this.note.set(valeur);
    this.noteChangee.emit(valeur);
  }
}
```

```typescript
// parent.component.ts
import { Component, signal } from '@angular/core';
import { EvaluationComponent } from './evaluation.component';

@Component({
  selector: 'app-parent',
  imports: [EvaluationComponent],
  template: `
    <h2>Évaluez ce produit</h2>
    <app-evaluation
      [maxEtoiles]="5"
      [(note)]="maNote"
      (noteChangee)="surChangement($event)"
    />
    <p>Note actuelle : {{ maNote() }} / 5</p>
    <button (click)="maNote.set(0)">Réinitialiser</button>
  `,
})
export class ParentComponent {
  maNote = signal(0);

  surChangement(note: number) {
    console.log('Nouvelle note :', note);
  }
}
```
</details>

---

## Résumé

| API                     | Rôle                        | Direction         | Vue 3 équivalent       |
|-------------------------|-----------------------------|-------------------|------------------------|
| `input()`               | Recevoir une donnée         | Parent → Enfant   | `defineProps()`        |
| `input.required<T>()`   | Input obligatoire           | Parent → Enfant   | Prop requise           |
| `input(val, {transform})` | Input avec transformation | Parent → Enfant   | —                      |
| `output<T>()`           | Émettre un événement        | Enfant → Parent   | `defineEmits()`        |
| `model<T>()`            | Binding bidirectionnel      | Bidirectionnel    | `defineModel()`        |

**Points clés** :
- `input()` retourne un **signal en lecture seule** — utilisable dans `computed()` et le template
- `output()` s'utilise avec `.emit(valeur)` — plus simple que `EventEmitter`
- `model()` crée automatiquement un input + output — syntaxe `[(prop)]` côté parent
- Ces API sont **type-safe** : le compilateur vérifie les types à la compilation
- Toujours préférer ces nouvelles API aux décorateurs `@Input()` / `@Output()`

---

> **Prochain cours** : [Cours 9 — Cycle de vie des composants](./06-lifecycle-hooks.md)
