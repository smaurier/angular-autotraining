---
titre: Angular Material & CDK — setup, theming M3, composants courants, primitives CDK
cours: 03-angular
notions: ["ng add @angular/material", "@angular/material et @angular/cdk", "provideAnimationsAsync()", "theming Material 3 avec mat.theme()", "color-scheme light dark", "variables système --mat-sys-*", "import par composant (tree-shaking)", "MatButton (appearance filled/outlined/tonal)", "MatToolbar / MatCard / MatIcon", "MatFormField + matInput + MatSelect", "MatTable + MatTableDataSource (sort, paginator, filter)", "MatDialog + MAT_DIALOG_DATA + mat-dialog-close", "MatSnackBar", "CDK vs Material (headless vs habillé)", "CDK DragDrop (cdkDrag, cdkDropList, moveItemInArray, transferArrayItem)", "CDK Overlay (overlay.create, FlexibleConnectedPositionStrategy)", "CDK Portal (ComponentPortal, TemplatePortal)", "CDK a11y effleuré (LiveAnnouncer, cdkTrapFocus)"]
outcomes:
  - "sait installer Angular Material avec ng add et comprendre ce que la commande configure"
  - "sait poser un thème Material 3 avec le mixin mat.theme() et gérer clair/sombre via color-scheme"
  - "sait importer un composant Material par son module dédié et l'utiliser dans un standalone"
  - "sait afficher des données dans un MatTable avec tri, pagination et filtre via MatTableDataSource"
  - "sait ouvrir un MatDialog et un MatSnackBar depuis un service injecté et récupérer un résultat"
  - "sait distinguer le CDK (comportement headless) de Material (CDK habillé) et implémenter un drag-drop et un overlay CDK"
prerequis: [module 00 de-vue-a-angular, module 02 signaux-base, module 03 control-flow, module 05 input-output-model, module 11 services-et-injectable, module 16 rxjs-observables-et-operators, module 19 formulaires-reactifs-et-signal-forms, module 20 formulaires-patterns]
next: 22-accessibilite
libs: [{ name: "@angular/material", version: "19" }, { name: "@angular/cdk", version: "19" }]
tribuzen: couche UI / design system de TribuZen — tableau de bord d'organisation de sortie (table triable des participants, dialog de confirmation, snackbar, kanban de préparation en drag-drop)
last-reviewed: 2026-07
---

# Angular Material & CDK — setup, theming M3, composants courants, primitives CDK

> **Outcomes — tu sauras FAIRE :** installer et thémer Angular Material 3, importer et utiliser les composants courants (`MatTable`, `MatDialog`, `MatSnackBar`, champs de formulaire), et descendre au CDK pour le drag-drop et l'overlay.
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre **Angular Material** (setup, theming M3, composants courants) et le **CDK** (drag-drop, overlay, portal, `a11y` juste effleuré). C'est tout. L'**accessibilité approfondie** (RGAA, ARIA, navigation clavier complète, contrastes, tests axe) est le **module 22** — ici on ne fait qu'effleurer les deux primitives CDK d'a11y (`LiveAnnouncer`, `cdkTrapFocus`) pour montrer où elles vivent. On réutilise sans les réexpliquer : les **signaux** (module 02), le **control flow** `@if`/`@for` (module 03), l'**injection** `inject()` (module 11), les **reactive forms** (modules 19-20). Le **state global** (NgRx Signal Store) est le module 24.

## 1. Cas concret d'abord

Story TribuZen : le **tableau de bord d'organisation de sortie**. L'organisateur voit la **liste des participants** dans un tableau triable et filtrable, clique **« Retirer »** sur une ligne → une **modale de confirmation** s'ouvre, et à la confirmation un **toast** « Participant retiré » s'affiche en haut à droite. Plus tard, il réorganise les **tâches de préparation** (« apporter le pique-nique », « réserver le parking ») en les **glissant** d'une colonne à l'autre.

En jetant les composants « à la main », un collègue se retrouve à réécrire un tri de colonnes, une pagination, une gestion de focus de modale, un système de positionnement de popup… des semaines de travail déjà résolues. En ESN, ~70 % des projets Angular partent sur **Angular Material** : la librairie UI **officielle** (maintenue par l'équipe Angular), qui fournit ces composants prêts à l'emploi **plus** le **CDK** (Component Dev Kit), la couche comportementale headless en dessous.

Le parallèle Vue est direct : Material est à Angular ce que **Vuetify / Quasar** sont à Vue. Voici l'écran cible en une passe, pour donner l'intention avant la théorie :

```typescript
// dashboard-sortie.component.ts — intention (détaillé section 3)
import { Component, inject, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-dashboard-sortie',
  imports: [MatTableModule, MatButtonModule],
  template: `
    <table mat-table [dataSource]="participants()">
      <!-- colonnes définies en section 3 -->
    </table>
  `,
})
export class DashboardSortieComponent {
  private dialog = inject(MatDialog);       // service, pas un template conditionnel
  private snackBar = inject(MatSnackBar);   // service aussi
  participants = signal([/* … */]);
}
```

Ce module te donne les briques : **setup + theming**, **composants courants**, puis **CDK**.

---

## 2. Théorie complète, concise

### 2.1 Installation — `ng add @angular/material`

On n'installe **pas** avec `npm install` : on utilise le schematic de la CLI, qui installe **et** configure.

```bash
ng add @angular/material
```

Vérifié (doc Angular 19), la commande :

- installe **`@angular/material` ET `@angular/cdk`** (Material dépend du CDK) ;
- pose un **thème** (préfabriqué au choix, ou « custom ») dans le fichier de styles global ;
- ajoute la police **Roboto** et la police **Material Icons** dans `index.html` ;
- ajoute quelques styles globaux (retire la marge du `body`, met `height: 100%` sur `html`/`body`) ;
- s'assure que les **animations** sont fournies via `provideAnimationsAsync()` dans `app.config.ts`.

`provideAnimationsAsync()` (remplaçant moderne de `provideAnimations()`) charge le moteur d'animations de façon paresseuse — plusieurs composants Material (ripple, dialog, expansion) en dépendent.

```typescript
// app.config.ts — ajouté/complété par ng add
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [provideAnimationsAsync()],
};
```

> En ESN, `ng add @angular/material` est souvent la **première** commande après `ng new` sur un projet client.

### 2.2 Theming Material 3 — le mixin `mat.theme()`

Point clé Angular 19 : Material est passé à **Material Design 3 (M3)**, et l'API de theming a changé. On déclare **un seul** thème avec le mixin **`mat.theme()`**, qui émet des **variables CSS système** (`--mat-sys-*`) consommées par tous les composants.

```scss
// src/styles.scss
@use '@angular/material' as mat;

html {
  color-scheme: light dark; // active le basculement clair/sombre automatique
  @include mat.theme((
    color: mat.$violet-palette,   // palette prédéfinie (ou une palette custom)
    typography: Roboto,
    density: 0,                   // 0 = confort ; négatif = plus compact
  ));
}
```

Trois axes dans la map : **`color`** (palette), **`typography`** (police de base), **`density`** (compacité). Le mixin génère les tokens ; tu n'inclus **plus** `mat.core()` + `mat.all-component-themes()` composant par composant comme avant.

> ⚠️ **Attention aux tutos datés.** L'ancienne API M2 (`mat.define-theme()`, `mat.all-component-themes($theme)`, `color="primary"` sur les boutons) traîne partout sur le web et **dans nos anciens supports**. En Angular 19 + M3, la voie officielle est **`mat.theme()`** + variables système. (API vérifiée sur `material.angular.dev`, guide Theming.)

### 2.3 Clair / sombre — piloté par `color-scheme`

Les variables de couleur générées utilisent la fonction CSS **`light-dark()`**. Le mode affiché dépend donc de la propriété **`color-scheme`**, pas d'un second thème.

- `color-scheme: light dark` → suit la préférence système de l'utilisateur.
- Pour un **toggle manuel**, on force `color-scheme` sous un sélecteur :

```scss
// styles.scss — thème clair par défaut, sombre sous une classe
html {
  color-scheme: light;
  @include mat.theme((color: mat.$violet-palette, typography: Roboto, density: 0));
}
body.dark-mode {
  color-scheme: dark; // Material bascule tout seul, aucune redéclaration de thème
}
```

```typescript
// theme.service.ts — le toggle, piloté par un signal (module 02)
import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(false);

  constructor() {
    // effect : réaction (module 09) — synchronise le DOM à chaque changement du signal
    effect(() => document.body.classList.toggle('dark-mode', this.isDark()));
  }

  toggle(): void {
    this.isDark.update(v => !v);
  }
}
```

### 2.4 Importer les composants — un module par composant

Chaque composant Material a **son propre point d'entrée** (`@angular/material/button`, `@angular/material/table`…). Dans un standalone, on ajoute uniquement les modules utilisés au tableau `imports`. Le **tree-shaking** élimine le reste.

```typescript
// ✅ un import par composant, depuis son chemin dédié
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-barre',
  imports: [MatButtonModule, MatIconModule], // seulement ce qu'on utilise
  template: `<button matButton="filled"><mat-icon>add</mat-icon> Ajouter</button>`,
})
export class BarreComponent {}
```

```typescript
// ❌ n'existe pas : il n'y a pas de barrel unique @angular/material
import { MatButtonModule, MatIconModule } from '@angular/material';
```

### 2.5 Boutons M3 — `appearance`, pas `color`

En M3, l'apparence d'un `MatButton` se choisit avec l'attribut **`appearance`**, dont le type vérifié est `'text' | 'filled' | 'elevated' | 'outlined' | 'tonal'`. L'ancien `color="primary"` n'est supporté **que dans les thèmes M2** — en M3 il est ignoré, la couleur vient des tokens système.

```html
<button matButton>Texte</button>
<button matButton="filled">Action principale</button>
<button matButton="outlined">Secondaire</button>
<button matButton="tonal">Nuancé</button>
<button matIconButton aria-label="Supprimer"><mat-icon>delete</mat-icon></button>
```

### 2.6 Composants courants — la boîte à outils ESN

- **Layout** : `mat-toolbar` (barre de titre), `mat-sidenav` (menu latéral), `mat-card` (carte).
- **Champs de formulaire** : `mat-form-field` enveloppe un `input matInput`, un `mat-select` (avec `mat-option`), affiche `mat-label` et `mat-error`. Se branche sur les reactive forms (modules 19-20).
- **Feedback via services injectés** (pas de template conditionnel) :
  - `MatDialog.open(Composant, { data, width })` → renvoie un `MatDialogRef` ; `ref.afterClosed()` est un **Observable** (module 16) du résultat. Le dialog lit ses données via le token **`MAT_DIALOG_DATA`** et se ferme en renvoyant une valeur avec **`mat-dialog-close`** / `[mat-dialog-close]="valeur"`.
  - `MatSnackBar.open(message, action, config)` → toast temporaire (`duration`, `horizontalPosition`, `verticalPosition`).

### 2.7 `MatTable` + `MatTableDataSource`

`mat-table` déclare des colonnes avec `matColumnDef`, un header et une ligne. Branché sur un **`MatTableDataSource`**, il gère **tri** (`matSort` + `mat-sort-header`), **pagination** (`mat-paginator`) et **filtre texte** (`dataSource.filter = ...`) presque gratuitement.

```typescript
dataSource = new MatTableDataSource(participants);
// pour activer tri/pagination : connecter les vues
@ViewChild(MatSort) sort!: MatSort;
@ViewChild(MatPaginator) paginator!: MatPaginator;
ngAfterViewInit() {
  this.dataSource.sort = this.sort;
  this.dataSource.paginator = this.paginator;
}
```

### 2.8 Le CDK — comportement sans style

Le **CDK** est la couche **headless** (comportement pur, aucun look) sur laquelle Material est construit :

```
CDK       = comportement (drag, overlay, focus, scroll…)  → tu styles comme tu veux
Material  = CDK + habillage Material Design               → composants prêts à l'emploi
```

Règle de choix : **besoin du look Material** → composant Material ; **besoin du comportement avec ton propre style** → CDK directement.

**DragDrop** (`@angular/cdk/drag-drop`) : directives `cdkDrag` (élément déplaçable) et `cdkDropList` (zone de dépôt), plus deux utilitaires **immuables-friendly** :

- `moveItemInArray(array, from, to)` — réordonne **dans** une liste ;
- `transferArrayItem(src, dst, from, to)` — déplace **entre** deux listes.

On relie les listes avec `[cdkDropListConnectedTo]` et on écoute `(cdkDropListDropped)`.

**Overlay** (`@angular/cdk/overlay`) : `overlay.create(config)` renvoie un **`OverlayRef`** (un `PortalOutlet`). On y **attache un portal** puis on `dispose()`. Le positionnement se fait via une **`FlexibleConnectedPositionStrategy`** (`overlay.position().flexibleConnectedTo(el).withPositions([...])`). C'est le moteur des tooltips, menus et dialogs de Material.

**Portal** (`@angular/cdk/portal`) : un **`ComponentPortal`** (rend un composant) ou un **`TemplatePortal`** (rend un `ng-template`) — le contenu « téléporté » dans l'overlay.

**a11y** (`@angular/cdk/a11y`, **juste effleuré ici — approfondi module 22**) : `LiveAnnouncer.announce('message')` pousse un texte dans une région `aria-live` pour les lecteurs d'écran ; la directive `cdkTrapFocus` piège le focus clavier `Tab` dans un conteneur (modale). On les cite pour savoir **où** elles vivent ; leur usage rigoureux relève du module accessibilité.

---

## 3. Worked examples

### Exemple 1 — Dashboard participants : table triable + dialog + snackbar (TribuZen)

L'écran complet du cas concret. Un `MatTable` filtrable/triable, un bouton « Retirer » qui ouvre une modale de confirmation, un toast au retour.

```typescript
// confirm-dialog.component.ts — la modale, lit ses données via MAT_DIALOG_DATA
import { Component, inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Confirmation</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <!-- mat-dialog-close ferme la modale ; la valeur devient le résultat de afterClosed() -->
      <button matButton mat-dialog-close>Annuler</button>
      <button matButton="filled" [mat-dialog-close]="true">Retirer</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  // injection typée du payload passé à dialog.open(..., { data })
  readonly data = inject<{ message: string }>(MAT_DIALOG_DATA);
}
```

```typescript
// dashboard-sortie.component.ts — la table + l'orchestration
import { AfterViewInit, Component, ViewChild, inject, signal } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from './confirm-dialog.component';

interface Participant { id: string; nom: string; role: string; }

@Component({
  selector: 'app-dashboard-sortie',
  imports: [
    MatTableModule, MatSortModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
  ],
  template: `
    <mat-form-field appearance="outline">
      <mat-label>Filtrer</mat-label>
      <input matInput (input)="filtrer($event)" placeholder="Nom, rôle…">
    </mat-form-field>

    <table mat-table [dataSource]="dataSource" matSort>
      <ng-container matColumnDef="nom">
        <th mat-header-cell *matHeaderCellDef mat-sort-header>Nom</th>
        <td mat-cell *matCellDef="let p">{{ p.nom }}</td>
      </ng-container>

      <ng-container matColumnDef="role">
        <th mat-header-cell *matHeaderCellDef mat-sort-header>Rôle</th>
        <td mat-cell *matCellDef="let p">{{ p.role }}</td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let p">
          <button matIconButton aria-label="Retirer" (click)="confirmerRetrait(p)">
            <mat-icon>delete</mat-icon>
          </button>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="colonnes"></tr>
      <tr mat-row *matRowDef="let row; columns: colonnes"></tr>
    </table>

    <mat-paginator [pageSizeOptions]="[5, 10, 25]" showFirstLastButtons />
  `,
})
export class DashboardSortieComponent implements AfterViewInit {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  colonnes = ['nom', 'role', 'actions'];
  dataSource = new MatTableDataSource<Participant>([
    { id: 'p1', nom: 'Alice', role: 'Organisatrice' },
    { id: 'p2', nom: 'Bob',   role: 'Conducteur' },
    { id: 'p3', nom: 'Cara',  role: 'Intendance' },
  ]);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit(): void {
    // On connecte tri + pagination APRÈS le rendu de la vue (les @ViewChild existent ici)
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  filtrer(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  confirmerRetrait(p: Participant): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { message: `Retirer ${p.nom} de la sortie ?` },
    });
    // afterClosed() est un Observable (module 16) : émet le résultat de mat-dialog-close
    ref.afterClosed().subscribe(confirme => {
      if (confirme) {
        this.dataSource.data = this.dataSource.data.filter(x => x.id !== p.id);
        this.snackBar.open(`${p.nom} retiré`, 'OK', {
          duration: 3000, horizontalPosition: 'end', verticalPosition: 'top',
        });
      }
    });
  }
}
```

**Le flux** : clic « Retirer » → `dialog.open()` affiche `ConfirmDialogComponent` (positionné + focus géré par le CDK sous le capot) → l'utilisateur clique « Retirer » → `[mat-dialog-close]="true"` ferme et fait émettre `true` à `afterClosed()` → on filtre la liste (immuable, nouvelle référence) et on ouvre le snackbar.

### Exemple 2 — Kanban de préparation en CDK DragDrop (TribuZen)

Les tâches de préparation, glissables entre « À faire » et « Prêt ». On descend au **CDK** : on veut le comportement, pas un look imposé.

```typescript
// preparation-kanban.component.ts
import { Component, inject, signal } from '@angular/core';
import {
  CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem,
} from '@angular/cdk/drag-drop';
import { LiveAnnouncer } from '@angular/cdk/a11y'; // effleuré — approfondi module 22

@Component({
  selector: 'app-preparation-kanban',
  imports: [DragDropModule],
  template: `
    <div class="board">
      <section>
        <h3>À faire</h3>
        <div cdkDropList #aFaire="cdkDropList"
             [cdkDropListData]="todo()"
             [cdkDropListConnectedTo]="[pret]"
             (cdkDropListDropped)="drop($event)">
          @for (t of todo(); track t) {
            <div cdkDrag class="carte">{{ t }}</div>
          }
        </div>
      </section>

      <section>
        <h3>Prêt</h3>
        <div cdkDropList #pret="cdkDropList"
             [cdkDropListData]="done()"
             [cdkDropListConnectedTo]="[aFaire]"
             (cdkDropListDropped)="drop($event)">
          @for (t of done(); track t) {
            <div cdkDrag class="carte">{{ t }}</div>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .board { display: flex; gap: 24px; }
    .carte { padding: 12px; margin: 4px 0; background: var(--mat-sys-surface-container);
             border-radius: 8px; cursor: grab; }
    .cdk-drag-preview { box-shadow: 0 4px 12px rgba(0,0,0,.2); }
    .cdk-drag-placeholder { opacity: .3; }
  `],
})
export class PreparationKanbanComponent {
  private announcer = inject(LiveAnnouncer);

  todo = signal(['Pique-nique', 'Réserver parking', 'Vérifier météo']);
  done = signal(['Itinéraire']);

  drop(event: CdkDragDrop<string[]>): void {
    if (event.previousContainer === event.container) {
      // même liste : on réordonne une COPIE puis on réémet le signal (immuable, module 02)
      const items = [...event.container.data];
      moveItemInArray(items, event.previousIndex, event.currentIndex);
      this.reinjecter(event.container.id, items);
    } else {
      // deux listes : transferArrayItem mute les copies, on réémet les deux signaux
      const source = [...event.previousContainer.data];
      const cible = [...event.container.data];
      transferArrayItem(source, cible, event.previousIndex, event.currentIndex);
      this.reinjecter(event.previousContainer.id, source);
      this.reinjecter(event.container.id, cible);
    }
    // a11y : on ANNONCE le déplacement (détaillé au module 22)
    this.announcer.announce('Tâche déplacée');
  }

  // On mappe l'id du cdkDropList au bon signal.
  private reinjecter(listId: string, items: string[]): void {
    if (listId === this.aFaireId) this.todo.set(items);
    else this.done.set(items);
  }
  // Ids réels lus depuis les cdkDropList si besoin ; ici simplifié pour l'exemple.
  private aFaireId = ''; // renseigné en pratique via #aFaire.id — voir lab
}
```

Point clé : les utilitaires `moveItemInArray` / `transferArrayItem` **mutent le tableau reçu**. Comme nos données sont des **signaux** (module 02), on leur passe une **copie** (`[...data]`) puis on **réémet** avec `.set()` — nouvelle référence, Angular notifié.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Utiliser l'ancienne API de theming M2

```scss
// ❌ API M2, périmée en Angular 19 M3 (traîne dans les vieux tutos)
@use '@angular/material' as mat;
@include mat.core();
$theme: mat.define-theme((color: (theme-type: light, primary: mat.$azure-palette)));
html { @include mat.all-component-themes($theme); }

// ✅ API M3 officielle : un seul mixin mat.theme(), variables système
html {
  color-scheme: light dark;
  @include mat.theme((color: mat.$violet-palette, typography: Roboto, density: 0));
}
```

`mat.define-theme()` / `mat.all-component-themes()` appartiennent au monde M2. En M3, `mat.theme()` fait tout et alimente les tokens `--mat-sys-*`.

### PIÈGE #2 — `color="primary"` sur un bouton M3

```html
<!-- ❌ ignoré en thème M3 : color n'est supporté qu'en M2 -->
<button mat-flat-button color="primary">Valider</button>

<!-- ✅ M3 : l'apparence via appearance, la couleur vient des tokens du thème -->
<button matButton="filled">Valider</button>
```

En M3, on ne pilote plus la couleur par un attribut `color` sur chaque bouton ; elle découle de la palette du thème.

### PIÈGE #3 — Importer depuis `@angular/material`

```typescript
// ❌ ce barrel n'existe pas — chaque composant a son entrypoint
import { MatButtonModule, MatTableModule } from '@angular/material';

// ✅ un import par chemin dédié
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
```

### PIÈGE #4 — Ouvrir un dialog/snackbar comme un composant conditionnel

```typescript
// ❌ réflexe Vue (v-model / v-if sur un <mat-dialog>) — ce n'est PAS comme ça
// <mat-dialog *ngIf="ouvert"> … </mat-dialog>

// ✅ Material : on ouvre via le SERVICE injecté
private dialog = inject(MatDialog);
this.dialog.open(ConfirmDialogComponent, { data: { message: '…' } });
```

`MatDialog` et `MatSnackBar` sont des **services** : on les injecte et on appelle `.open()`. Le CDK gère l'overlay, le backdrop et le focus.

### PIÈGE #5 — Confondre CDK et Material

Prendre un composant Material lourd quand on ne veut **que** le comportement (ou l'inverse). Repère :

| Besoin | Choix |
|--------|-------|
| Tableau stylé Material avec tri/pagination | `mat-table` (Material) |
| Drag-drop avec **ton** style | `cdkDrag` / `cdkDropList` (CDK) |
| Tooltip simple | `matTooltip` (Material) |
| Popup complexe sur-mesure | `Overlay` + `ComponentPortal` (CDK) |
| Grande liste performante | `cdk-virtual-scroll-viewport` (CDK) |

### PIÈGE #6 — Muter le tableau d'un signal dans un drop

```typescript
// ❌ moveItemInArray mute en place ; si data est le tableau du signal, aucune nouvelle référence
moveItemInArray(this.todo(), event.previousIndex, event.currentIndex); // signal non notifié

// ✅ on copie, on réordonne la copie, on réémet
const items = [...this.todo()];
moveItemInArray(items, event.previousIndex, event.currentIndex);
this.todo.set(items);
```

### PIÈGE #7 — Oublier `provideAnimationsAsync()`

Sans le provider d'animations dans `app.config.ts`, plusieurs composants (dialog, ripple, expansion) se comportent mal ou lèvent une erreur au runtime. `ng add` le pose ; sur un projet existant migré à la main, vérifie qu'il est présent.

---

## 5. Ancrage TribuZen

Angular Material + CDK forment la **couche UI / design system** de TribuZen — la présentation par-dessus l'état (signaux) et les formulaires (modules 19-20).

**`DashboardSortieComponent`** (Exemple 1) — le tableau de bord d'organisation : `MatTable` triable/filtrable des participants, `MatDialog` de confirmation de retrait, `MatSnackBar` de feedback. C'est l'écran d'administration d'une sortie.

**`PreparationKanbanComponent`** (Exemple 2) — le kanban des tâches de préparation en **CDK DragDrop**, données en **signaux**, avec `LiveAnnouncer` posé (a11y détaillée au module 22).

**`ThemeService`** (§2.3) — le toggle clair/sombre M3 global, piloté par un signal + `effect`, via `color-scheme`.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    styles.scss                                  ← mat.theme() M3 + color-scheme
    app/
      core/
        theme.service.ts                         ← toggle clair/sombre (signal + effect)
      sorties/
        dashboard-sortie.component.ts            ← Exemple 1 (table + dialog + snackbar)
        confirm-dialog.component.ts              ← modale de confirmation
        preparation-kanban.component.ts          ← Exemple 2 (CDK DragDrop)
```

> Les données en dur des exemples viendront de l'API via `resource`/HTTP (modules 10, 18). Le rendu accessible **conforme RGAA** (rôles ARIA, focus, contrastes, annonces rigoureuses) est le **module 22** — ici, la couche visuelle et comportementale.

---

## 6. Points clés

1. On installe avec **`ng add @angular/material`** (jamais `npm install` seul) : ça pose `@angular/material` + `@angular/cdk`, un thème, Roboto, Material Icons et `provideAnimationsAsync()`.
2. Le theming Angular 19 est **Material 3** : un seul mixin **`mat.theme()`** dans `styles.scss`, qui émet les variables système `--mat-sys-*`.
3. Le clair/sombre se pilote par **`color-scheme`** (via `light-dark()`), pas par un second thème ; un toggle = une classe qui force `color-scheme: dark`.
4. Chaque composant Material s'importe **par son module dédié** (`@angular/material/button`…) ; il n'y a pas de barrel `@angular/material`.
5. En M3, l'apparence d'un bouton se choisit avec **`appearance`** (`filled`/`outlined`/`tonal`…) ; l'ancien `color="primary"` est M2 seulement.
6. `MatDialog` et `MatSnackBar` sont des **services injectés** ; `dialog.open()` renvoie un ref dont `afterClosed()` est un **Observable** ; le dialog lit `MAT_DIALOG_DATA` et ferme via `mat-dialog-close`.
7. `MatTable` + **`MatTableDataSource`** donnent tri, pagination et filtre en connectant `MatSort` et `MatPaginator`.
8. Le **CDK** = comportement headless (drag-drop, overlay, portal, a11y) ; Material = CDK habillé. On descend au CDK pour garder son propre style.
9. `moveItemInArray`/`transferArrayItem` **mutent** le tableau reçu : avec des signaux, on passe une **copie** et on réémet avec `.set()`.

---

## 7. Seeds Anki

```
Comment installe-t-on Angular Material et que fait la commande ?|ng add @angular/material : installe @angular/material ET @angular/cdk, pose un thème dans styles.scss, ajoute Roboto + Material Icons, des styles globaux, et provideAnimationsAsync() dans app.config.ts.
Quelle est l'API de theming d'Angular Material 19 (M3) ?|Un seul mixin mat.theme((color, typography, density)) dans styles.scss, qui émet des variables système --mat-sys-*. L'ancien mat.define-theme()/all-component-themes() est du M2 périmé.
Comment gère-t-on le mode clair/sombre en Material 3 ?|Via la propriété CSS color-scheme (les couleurs utilisent light-dark()). color-scheme: light dark suit le système ; pour un toggle, on force color-scheme: dark sous une classe (ex. body.dark-mode).
Comment importe-t-on un composant Material dans un standalone ?|Depuis son module dédié (import { MatButtonModule } from '@angular/material/button') ajouté au tableau imports. Il n'existe pas de barrel unique @angular/material.
Comment choisit-on l'apparence d'un MatButton en M3 ?|Avec l'attribut appearance : 'text' | 'filled' | 'elevated' | 'outlined' | 'tonal'. color='primary' n'est supporté qu'en thèmes M2.
Comment ouvre-t-on un MatDialog et récupère-t-on son résultat ?|On injecte MatDialog, on appelle dialog.open(Composant, { data, width }) ; ref.afterClosed() est un Observable du résultat. Le dialog lit MAT_DIALOG_DATA et se ferme via [mat-dialog-close]='valeur'.
Quelle est la différence entre le CDK et Angular Material ?|Le CDK fournit le comportement headless (drag-drop, overlay, portal, focus, a11y) sans style ; Material = CDK + habillage Material Design. On utilise le CDK quand on veut le comportement avec son propre visuel.
À quoi servent moveItemInArray et transferArrayItem en CDK DragDrop ?|moveItemInArray(arr, from, to) réordonne dans une liste ; transferArrayItem(src, dst, from, to) déplace entre deux listes. Les deux MUTENT le tableau reçu : avec des signaux, passer une copie puis set().
Quelles primitives d'accessibilité le CDK fournit-il (effleurées ici) ?|LiveAnnouncer.announce(msg) pousse un message dans une région aria-live ; la directive cdkTrapFocus piège le focus Tab dans un conteneur. Usage rigoureux au module 22 (accessibilité).
```

---

## Pont vers le lab

> Lab associé : `labs/lab-21-angular-material-et-cdk/README.md`. Construire le tableau de bord TribuZen (MatTable + MatDialog + MatSnackBar) et un kanban CDK DragDrop dans un vrai projet Angular CLI thémé en M3 — dev server comme oracle visuel, corrigé commenté intégral.
