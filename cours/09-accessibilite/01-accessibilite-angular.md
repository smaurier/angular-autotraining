# Cours — Accessibilite dans Angular

> **Objectif** : Maitriser les techniques d'accessibilite (a11y) dans une application Angular. Comprendre les exigences WCAG 2.1 AA, utiliser le CDK A11y, gerer le focus dans un SPA, et tester l'accessibilite de maniere automatisee.

---

## Rappel du cours precedent

<details>
<summary>1. Qu'est-ce que le WCAG et quel niveau viser en entreprise ?</summary>

**WCAG** (Web Content Accessibility Guidelines) est le standard international d'accessibilite. En Europe (EAA 2025) et en France (RGAA), le niveau **AA** est l'objectif legal.
</details>

<details>
<summary>2. Quels sont les 4 principes POUR du WCAG ?</summary>

- **Perceptible** : l'information est presentee de maniere perceptible (alt, contrastes, sous-titres)
- **Operable** : l'interface est utilisable au clavier et avec des technologies d'assistance
- **Understandable** (Comprehensible) : le contenu est comprehensible (langue, erreurs claires)
- **Robuste** : le contenu fonctionne avec les technologies d'assistance actuelles et futures
</details>

<details>
<summary>3. Pourquoi un SPA pose-t-il des defis specifiques en accessibilite ?</summary>

Un SPA ne recharge pas la page : les lecteurs d'ecran ne detectent pas automatiquement les changements de vue. Il faut gerer manuellement les annonces de navigation et le deplacement du focus.
</details>

---

## Analogie

Imaginez un **batiment public**. Les rampes d'acces, les boutons d'ascenseur en braille et les annonces sonores ne sont pas des « extras » — ce sont des obligations legales qui permettent a tous d'utiliser le batiment.

Dans une application Angular, l'accessibilite joue le meme role : les attributs ARIA, la gestion du focus et les annonces pour les lecteurs d'ecran sont les **rampes et ascenseurs** de votre interface. Angular fournit des outils dedies — le **CDK A11y** — qui sont l'equivalent des normes de construction pour le numerique.

---

## Theorie

### 1. WCAG 2.1 AA dans le contexte Angular

| Principe WCAG | Application Angular | Outils Angular |
|---------------|-------------------|----------------|
| **Perceptible** | `alt` sur les images, contrastes CSS, `aria-label` | Templates + CSS custom properties |
| **Operable** | Navigation clavier, skip links, pas de pieges clavier | CDK `FocusTrap`, `@HostListener('keydown')` |
| **Comprehensible** | Messages d'erreur clairs, langue declaree | `mat-error`, `aria-describedby`, `lang` sur `<html>` |
| **Robuste** | HTML semantique, roles ARIA corrects | Angular Material (roles integres), ESLint a11y |

> **Regle d'or** : Utilisez d'abord le **HTML semantique natif** (`<button>`, `<nav>`, `<main>`, `<dialog>`). Les attributs ARIA ne sont necessaires que lorsque le HTML natif ne suffit pas.

---

### 2. HTML semantique dans les templates Angular

#### Utiliser les bonnes balises

```typescript
@Component({
  selector: 'app-navigation',
  template: `
    <!-- ✅ Correct : balises semantiques -->
    <nav aria-label="Navigation principale">
      <ul>
        @for (item of menuItems; track item.id) {
          <li>
            <a [routerLink]="item.route" routerLinkActive="active">
              {{ item.label }}
            </a>
          </li>
        }
      </ul>
    </nav>

    <!-- ❌ Incorrect : div soup sans semantique -->
    <!--
    <div class="nav">
      <div *ngFor="let item of menuItems" (click)="navigate(item)">
        {{ item.label }}
      </div>
    </div>
    -->
  `,
})
export class NavigationComponent {
  menuItems = [
    { id: 1, route: '/accueil', label: 'Accueil' },
    { id: 2, route: '/produits', label: 'Produits' },
    { id: 3, route: '/contact', label: 'Contact' },
  ];
}
```

#### Roles et aria-* dans les templates

```typescript
@Component({
  selector: 'app-alerte',
  template: `
    <!-- role="alert" + aria-live : annonce automatique par le lecteur d'ecran -->
    @if (message) {
      <div role="alert" aria-live="assertive" class="alerte" [class.erreur]="type === 'error'">
        <span class="alerte__icone" aria-hidden="true">{{ icone }}</span>
        <p>{{ message }}</p>
      </div>
    }
  `,
})
export class AlerteComponent {
  message = '';
  type: 'success' | 'error' | 'info' = 'info';

  get icone(): string {
    const icones: Record<string, string> = { success: '✓', error: '✗', info: 'ℹ' };
    return icones[this.type];
  }
}
```

> **Piege frequent** : Ne mettez `aria-hidden="true"` que sur les elements purement decoratifs. Jamais sur un element contenant du texte informatif.

---

### 3. Angular CDK A11y — La boite a outils

Le **CDK** (Component Dev Kit) est la couche bas niveau d'Angular Material. Le module `@angular/cdk/a11y` fournit des outils essentiels sans imposer de style visuel.

```bash
# Installation (inclus avec Angular Material, sinon :)
npm install @angular/cdk
```

#### 3.1 FocusTrap — Pieger le focus dans une modale

```typescript
import { Component, inject } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';

@Component({
  selector: 'app-modale',
  imports: [A11yModule],
  template: `
    @if (ouverte) {
      <div class="overlay" (click)="fermer()" (keydown.escape)="fermer()">
        <div
          class="modale"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titre-modale"
          cdkTrapFocus
          [cdkTrapFocusAutoCapture]="true"
          (click)="$event.stopPropagation()"
        >
          <h2 id="titre-modale">Confirmer la suppression</h2>
          <p>Etes-vous sur de vouloir supprimer cet element ?</p>
          <div class="modale__actions">
            <button (click)="fermer()">Annuler</button>
            <button (click)="confirmer()" class="btn-danger">Supprimer</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ModaleComponent {
  ouverte = false;

  ouvrir(): void {
    this.ouverte = true;
  }

  fermer(): void {
    this.ouverte = false;
  }

  confirmer(): void {
    // logique de suppression
    this.fermer();
  }
}
```

**Comment ca marche :**
- `cdkTrapFocus` empeche le focus de sortir de la modale (Tab et Shift+Tab restent a l'interieur)
- `cdkTrapFocusAutoCapture` deplace automatiquement le focus dans la modale a l'ouverture
- Le focus revient a l'element declencheur a la fermeture

#### 3.2 FocusMonitor — Detecter l'origine du focus

Le `FocusMonitor` distingue comment un element a recu le focus : clavier, souris, toucher ou programme.

```typescript
import { Component, ElementRef, inject, OnInit, OnDestroy } from '@angular/core';
import { FocusMonitor, FocusOrigin } from '@angular/cdk/a11y';

@Component({
  selector: 'app-bouton-custom',
  template: `
    <button
      #monBouton
      class="bouton"
      [class.focus-clavier]="focusOrigine === 'keyboard'"
      [class.focus-souris]="focusOrigine === 'mouse'"
    >
      <ng-content />
    </button>
  `,
  styles: [`
    .focus-clavier {
      /* Anneau de focus visible uniquement au clavier */
      outline: 3px solid #1a73e8;
      outline-offset: 2px;
    }
    .focus-souris {
      /* Pas d'anneau au clic souris */
      outline: none;
    }
  `],
})
export class BoutonCustomComponent implements OnInit, OnDestroy {
  private focusMonitor = inject(FocusMonitor);
  private elementRef = inject(ElementRef);
  focusOrigine: FocusOrigin = null;

  ngOnInit(): void {
    this.focusMonitor
      .monitor(this.elementRef.nativeElement, true)
      .subscribe((origine: FocusOrigin) => {
        this.focusOrigine = origine;
      });
  }

  ngOnDestroy(): void {
    this.focusMonitor.stopMonitoring(this.elementRef.nativeElement);
  }
}
```

> **Bonne pratique** : Utilisez `FocusMonitor` plutot que `:focus-visible` quand vous avez besoin de logique TypeScript en fonction de l'origine du focus.

#### 3.3 LiveAnnouncer — Annoncer des changements au lecteur d'ecran

```typescript
import { Component, inject } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';

@Component({
  selector: 'app-panier',
  template: `
    <div class="panier">
      <p>Articles : {{ nombre }}</p>
      <button (click)="ajouter()">Ajouter au panier</button>
    </div>
  `,
})
export class PanierComponent {
  private liveAnnouncer = inject(LiveAnnouncer);
  nombre = 0;

  ajouter(): void {
    this.nombre++;
    // Le lecteur d'ecran annoncera ce texte
    this.liveAnnouncer.announce(
      `Article ajoute. ${this.nombre} article${this.nombre > 1 ? 's' : ''} dans le panier.`,
      'polite'
    );
  }
}
```

**Modes d'annonce :**
- `'polite'` : attend que le lecteur d'ecran ait fini de parler (defaut, a privilegier)
- `'assertive'` : interrompt immediatement (a reserver aux erreurs critiques)

#### 3.4 AriaDescriber — Ajouter des descriptions dynamiques

```typescript
import { Component, ElementRef, inject, OnDestroy, viewChild } from '@angular/core';
import { AriaDescriber } from '@angular/cdk/a11y';

@Component({
  selector: 'app-champ-mot-de-passe',
  template: `
    <div class="champ">
      <label for="mdp">Mot de passe</label>
      <input
        #inputMdp
        id="mdp"
        type="password"
        [attr.aria-invalid]="!valide"
      />
      @if (!valide) {
        <p class="erreur" role="alert">
          Le mot de passe doit contenir au moins 8 caracteres.
        </p>
      }
    </div>
  `,
})
export class ChampMotDePasseComponent implements OnDestroy {
  private ariaDescriber = inject(AriaDescriber);
  private inputRef = viewChild<ElementRef>('inputMdp');
  valide = true;

  ajouterDescription(message: string): void {
    const input = this.inputRef();
    if (input) {
      this.ariaDescriber.describe(input.nativeElement, message);
    }
  }

  ngOnDestroy(): void {
    const input = this.inputRef();
    if (input) {
      this.ariaDescriber.removeDescription(input.nativeElement, '');
    }
  }
}
```

#### 3.5 InteractivityChecker — Verifier si un element est interactif

```typescript
import { Component, inject } from '@angular/core';
import { InteractivityChecker } from '@angular/cdk/a11y';

@Component({
  selector: 'app-focus-helper',
  template: `<ng-content />`,
})
export class FocusHelperComponent {
  private checker = inject(InteractivityChecker);

  peutRecevoirFocus(element: HTMLElement): boolean {
    return this.checker.isFocusable(element);
  }

  estTabbable(element: HTMLElement): boolean {
    return this.checker.isTabbable(element);
  }

  estVisible(element: HTMLElement): boolean {
    return this.checker.isVisible(element);
  }
}
```

---

### 4. Focus management dans un SPA Angular

Un des plus grands defis d'accessibilite dans un SPA : le lecteur d'ecran ne sait pas qu'on a change de page. Il faut **deux choses** :

1. **Annoncer la navigation** au lecteur d'ecran
2. **Deplacer le focus** vers le contenu principal

#### 4.1 Annoncer les changements de route

```typescript
import { Component, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  template: `
    <a class="skip-link" href="#contenu-principal">
      Aller au contenu principal
    </a>
    <app-header />
    <main id="contenu-principal" tabindex="-1">
      <router-outlet />
    </main>
    <app-footer />
  `,
  styles: [`
    .skip-link {
      position: absolute;
      top: -100%;
      left: 0;
      padding: 8px 16px;
      background: #1a73e8;
      color: white;
      z-index: 1000;
    }
    .skip-link:focus {
      top: 0;
    }
  `],
})
export class AppComponent {
  private router = inject(Router);
  private titleService = inject(Title);
  private liveAnnouncer = inject(LiveAnnouncer);

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        const titre = this.titleService.getTitle();
        this.liveAnnouncer.announce(`Navigation vers ${titre}`, 'polite');
      });
  }
}
```

#### 4.2 Deplacer le focus apres navigation avec `afterNextRender`

```typescript
import { Component, afterNextRender, inject, ElementRef, viewChild } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-page-layout',
  template: `
    <div #contenuPage>
      <h1 tabindex="-1" #titrePage>{{ titre }}</h1>
      <ng-content />
    </div>
  `,
})
export class PageLayoutComponent {
  private router = inject(Router);
  titre = '';

  titrePage = viewChild<ElementRef>('titrePage');

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        afterNextRender(() => {
          const titreEl = this.titrePage();
          if (titreEl) {
            titreEl.nativeElement.focus();
          }
        });
      });
  }
}
```

> **Pourquoi `afterNextRender` ?** Apres une navigation, le nouveau composant n'est pas encore dans le DOM. `afterNextRender` garantit que le DOM est pret avant de deplacer le focus.

---

### 5. Navigation clavier

#### 5.1 @HostListener pour le clavier

```typescript
import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-menu-dropdown',
  template: `
    <div class="dropdown" role="menu">
      @for (option of options; track option.id; let i = $index) {
        <button
          role="menuitem"
          [attr.tabindex]="i === indexActif ? 0 : -1"
          [class.actif]="i === indexActif"
          (click)="selectionner(option)"
          [id]="'option-' + option.id"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class MenuDropdownComponent {
  options = [
    { id: 1, label: 'Copier' },
    { id: 2, label: 'Coller' },
    { id: 3, label: 'Supprimer' },
  ];
  indexActif = 0;

  @HostListener('keydown', ['$event'])
  gererClavier(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.indexActif = (this.indexActif + 1) % this.options.length;
        this.focusOption();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.indexActif = (this.indexActif - 1 + this.options.length) % this.options.length;
        this.focusOption();
        break;
      case 'Home':
        event.preventDefault();
        this.indexActif = 0;
        this.focusOption();
        break;
      case 'End':
        event.preventDefault();
        this.indexActif = this.options.length - 1;
        this.focusOption();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectionner(this.options[this.indexActif]);
        break;
    }
  }

  private focusOption(): void {
    const el = document.getElementById('option-' + this.options[this.indexActif].id);
    el?.focus();
  }

  selectionner(option: { id: number; label: string }): void {
    console.log('Selection :', option.label);
  }
}
```

#### 5.2 Roving tabindex avec signals

```typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-onglets',
  template: `
    <div role="tablist" aria-label="Sections du profil">
      @for (onglet of onglets(); track onglet.id; let i = $index) {
        <button
          role="tab"
          [attr.aria-selected]="i === indexActif()"
          [attr.tabindex]="i === indexActif() ? 0 : -1"
          [attr.aria-controls]="'panel-' + onglet.id"
          [id]="'tab-' + onglet.id"
          (click)="activerOnglet(i)"
          (keydown)="gererClavier($event, i)"
        >
          {{ onglet.label }}
        </button>
      }
    </div>
    <div
      [id]="'panel-' + ongletActif().id"
      role="tabpanel"
      [attr.aria-labelledby]="'tab-' + ongletActif().id"
      tabindex="0"
    >
      {{ ongletActif().contenu }}
    </div>
  `,
})
export class OngletsComponent {
  onglets = signal([
    { id: 'general', label: 'General', contenu: 'Informations generales...' },
    { id: 'securite', label: 'Securite', contenu: 'Parametres de securite...' },
    { id: 'notifs', label: 'Notifications', contenu: 'Preferences de notifications...' },
  ]);

  indexActif = signal(0);

  ongletActif = computed(() => this.onglets()[this.indexActif()]);

  activerOnglet(index: number): void {
    this.indexActif.set(index);
  }

  gererClavier(event: KeyboardEvent, index: number): void {
    const tabs = this.onglets();
    let nouvelIndex = index;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        nouvelIndex = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        event.preventDefault();
        nouvelIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        event.preventDefault();
        nouvelIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nouvelIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    this.indexActif.set(nouvelIndex);
    const tabEl = document.getElementById('tab-' + tabs[nouvelIndex].id);
    tabEl?.focus();
  }
}
```

**Roving tabindex** : un seul element du groupe a `tabindex="0"` (celui qui est actif). Les autres ont `tabindex="-1"`. Les fleches deplacent le focus a l'interieur du groupe.

---

### 6. Formulaires accessibles

#### 6.1 Avec Angular Material

```typescript
import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-formulaire-inscription',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <form [formGroup]="formulaire" (ngSubmit)="soumettre()">
      <!-- mat-form-field gere automatiquement aria-describedby -->
      <mat-form-field appearance="outline">
        <mat-label>Adresse email</mat-label>
        <input matInput formControlName="email" type="email" />
        <mat-hint>Nous ne partagerons jamais votre email.</mat-hint>

        <!-- mat-error s'affiche uniquement quand le champ est invalide et touche -->
        @if (formulaire.controls.email.hasError('required')) {
          <mat-error>L'email est obligatoire.</mat-error>
        }
        @if (formulaire.controls.email.hasError('email')) {
          <mat-error>Format d'email invalide.</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Mot de passe</mat-label>
        <input matInput formControlName="motDePasse" type="password" />
        @if (formulaire.controls.motDePasse.hasError('required')) {
          <mat-error>Le mot de passe est obligatoire.</mat-error>
        }
        @if (formulaire.controls.motDePasse.hasError('minlength')) {
          <mat-error>Minimum 8 caracteres requis.</mat-error>
        }
      </mat-form-field>

      <button mat-raised-button color="primary" type="submit"
        [disabled]="formulaire.invalid">
        S'inscrire
      </button>
    </form>
  `,
})
export class FormulaireInscriptionComponent {
  formulaire = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    motDePasse: new FormControl('', [Validators.required, Validators.minLength(8)]),
  });

  soumettre(): void {
    if (this.formulaire.valid) {
      console.log('Inscription :', this.formulaire.value);
    }
  }
}
```

> **Pourquoi Material est un bon choix pour l'a11y ?** `mat-form-field` genere automatiquement les `id`, `aria-describedby`, `aria-invalid` et les associations label/input. Vous n'avez pas a le faire manuellement.

#### 6.2 Formulaire sans Material — les associations manuelles

```typescript
@Component({
  selector: 'app-formulaire-natif',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="formulaire" (ngSubmit)="soumettre()">
      <div class="champ">
        <label for="nom">
          Nom complet
          <span aria-hidden="true" class="requis">*</span>
        </label>
        <input
          id="nom"
          formControlName="nom"
          type="text"
          [attr.aria-invalid]="formulaire.controls.nom.invalid && formulaire.controls.nom.touched"
          [attr.aria-describedby]="formulaire.controls.nom.invalid && formulaire.controls.nom.touched
            ? 'erreur-nom' : null"
          aria-required="true"
        />
        @if (formulaire.controls.nom.invalid && formulaire.controls.nom.touched) {
          <p id="erreur-nom" class="erreur" role="alert" aria-live="polite">
            Le nom est obligatoire.
          </p>
        }
      </div>

      <button type="submit" [attr.aria-disabled]="formulaire.invalid">
        Envoyer
      </button>
    </form>
  `,
})
export class FormulaireNatifComponent {
  formulaire = new FormGroup({
    nom: new FormControl('', Validators.required),
  });

  soumettre(): void {
    if (this.formulaire.valid) {
      console.log(this.formulaire.value);
    }
  }
}
```

**Checklist formulaire accessible :**
- Chaque `<input>` a un `<label>` associe (via `for`/`id`)
- Les champs obligatoires ont `aria-required="true"` ET un indicateur visuel
- Les erreurs sont liees via `aria-describedby` et annoncees via `role="alert"`
- Le bouton submit utilise `aria-disabled` plutot que `disabled` (pour rester focusable)

---

### 7. Angular Material et accessibilite

Angular Material est concu avec l'accessibilite en tete. La plupart des composants implementent deja les patterns ARIA WAI :

| Composant | Pattern ARIA | Ce qui est automatique |
|-----------|-------------|----------------------|
| `mat-select` | Listbox | `role="listbox"`, navigation fleches, annonce selection |
| `mat-dialog` | Dialog | `role="dialog"`, `aria-modal`, focus trap, retour focus |
| `mat-snack-bar` | Alert | `role="alert"`, `aria-live` |
| `mat-autocomplete` | Combobox | `role="combobox"`, `aria-expanded`, `aria-activedescendant` |
| `mat-table` + `mat-sort` | Grid | `role="grid"`, headers annonces au tri |
| `mat-stepper` | Tablist | `role="tablist"`, navigation fleches |

#### Comment ne pas casser l'a11y de Material

```typescript
// ❌ NE PAS FAIRE : remplacer le role natif
template: `<mat-select role="menu">` // CASSE l'accessibilite

// ❌ NE PAS FAIRE : cacher le label
template: `
  <mat-form-field>
    <!-- Pas de mat-label = pas de label accessible ! -->
    <input matInput placeholder="Email" />
  </mat-form-field>
`

// ✅ CORRECT : toujours fournir un mat-label
template: `
  <mat-form-field>
    <mat-label>Email</mat-label>
    <input matInput formControlName="email" />
  </mat-form-field>
`

// ✅ Si le label doit etre visuellement cache :
template: `
  <mat-form-field>
    <mat-label class="sr-only">Rechercher</mat-label>
    <input matInput formControlName="recherche" />
  </mat-form-field>
`
```

```css
/* Classe utilitaire pour cacher visuellement mais garder accessible */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

### 8. Testing de l'accessibilite

#### 8.1 ESLint — regles @angular-eslint/template

```bash
npm install -D @angular-eslint/eslint-plugin-template
```

```javascript
// eslint.config.js (extrait)
export default [
  {
    files: ['**/*.html'],
    rules: {
      // Chaque image doit avoir un alt
      '@angular-eslint/template/accessibility-alt-text': 'error',
      // Les elements interactifs doivent etre focusables
      '@angular-eslint/template/accessibility-elements-content': 'error',
      // Les elements cliquables doivent avoir un role
      '@angular-eslint/template/click-events-have-key-events': 'error',
      // Pas de role="presentation" sur des interactifs
      '@angular-eslint/template/no-positive-tabindex': 'error',
      // Labels associes aux inputs
      '@angular-eslint/template/accessibility-label-for': 'error',
      // Pas d'autofocus (sauf cas justifie)
      '@angular-eslint/template/no-autofocus': 'warn',
    },
  },
];
```

#### 8.2 Lighthouse CI — audit automatise

```yaml
# .github/workflows/a11y.yml
name: Accessibility Audit
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npm run serve &
      - name: Lighthouse a11y audit
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:4200/
            http://localhost:4200/contact
          configPath: .lighthouserc.json
```

```json
// .lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:accessibility": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

#### 8.3 Playwright — assertions a11y

```typescript
// tests/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibilite', () => {
  test('la page d\'accueil respecte WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('le focus est visible sur tous les elements interactifs', async ({ page }) => {
    await page.goto('/');

    // Tabuler a travers la page
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
    }
  });

  test('la modale piege le focus', async ({ page }) => {
    await page.goto('/produits');
    await page.click('[data-testid="btn-supprimer"]');

    // Le focus doit etre dans la modale
    const modale = page.locator('[role="dialog"]');
    await expect(modale).toBeVisible();

    // Tab doit rester dans la modale
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(modale).toContainText(await focused.textContent() ?? '');

    // Escape ferme la modale
    await page.keyboard.press('Escape');
    await expect(modale).not.toBeVisible();
  });

  test('la navigation au clavier fonctionne dans les onglets', async ({ page }) => {
    await page.goto('/profil');

    const premierOnglet = page.locator('[role="tab"]').first();
    await premierOnglet.focus();

    // Fleche droite = onglet suivant
    await page.keyboard.press('ArrowRight');
    const focused = page.locator(':focus');
    await expect(focused).toHaveAttribute('aria-selected', 'true');
  });
});
```

---

## Resume

| Outil | Usage | Quand l'utiliser |
|-------|-------|-----------------|
| `cdkTrapFocus` | Pieger le focus dans une zone | Modales, drawers, popovers |
| `FocusMonitor` | Detecter clavier/souris/touch | Style de focus conditionnel |
| `LiveAnnouncer` | Annonces pour lecteurs d'ecran | Actions, navigation, mises a jour |
| `AriaDescriber` | Descriptions ARIA dynamiques | Tooltips, validations |
| `InteractivityChecker` | Verifier focusabilite | Logique de focus custom |
| `@angular-eslint` | Linting a11y | CI, pre-commit |
| `axe-core/playwright` | Audit WCAG automatise | Tests e2e |

---

## Exercices

### Exercice 1 — Skip link et annonce de navigation (20 min)

Creez un `AppComponent` qui :
1. Affiche un **skip link** "Aller au contenu principal" visible uniquement au focus clavier
2. Utilise `LiveAnnouncer` pour annoncer le titre de chaque page apres navigation
3. Deplace le focus vers le `<h1>` de la page apres navigation avec `afterNextRender`

### Exercice 2 — Modale accessible (30 min)

Creez un composant `ConfirmationModaleComponent` qui :
1. Utilise `cdkTrapFocus` pour pieger le focus
2. Se ferme avec la touche Escape
3. Retourne le focus au bouton declencheur a la fermeture
4. A les attributs `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
5. Le premier bouton focusable recoit le focus a l'ouverture

### Exercice 3 — Onglets roving tabindex (30 min)

Creez un composant `OngletsComponent` avec :
1. Navigation par fleches gauche/droite
2. Home/End pour aller au premier/dernier onglet
3. `role="tablist"`, `role="tab"`, `role="tabpanel"` correctement associes
4. Les signaux Angular pour l'etat

### Exercice 4 — Audit a11y complet (45 min)

1. Ecrivez un test Playwright avec `@axe-core/playwright` qui :
   - Audite 3 pages de votre application
   - Verifie le score WCAG 2.1 AA
   - Verifie que le focus est toujours visible apres 10 tabulations
2. Configurez les regles `@angular-eslint/template/accessibility-*` dans votre projet
3. Corrigez toutes les violations detectees

---

## Ressources

- [Angular CDK A11y — Documentation officielle](https://material.angular.io/cdk/a11y/overview)
- [WAI-ARIA Authoring Practices 1.2](https://www.w3.org/WAI/ARIA/apg/)
- [RGAA — Referentiel General d'Amelioration de l'Accessibilite](https://accessibilite.numerique.gouv.fr/)
- [Axe-core Playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)
- [Angular ESLint Template Rules](https://github.com/angular-eslint/angular-eslint)
