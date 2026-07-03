# Lab 21 — Angular Material & CDK

> **Outcome :** à la fin, tu sais installer et thémer Angular Material 3, afficher des données dans un `MatTable` triable/filtrable, ouvrir un `MatDialog` de confirmation qui renvoie un résultat, notifier avec `MatSnackBar`, et réordonner des tâches en **CDK DragDrop** — le tout dans un vrai projet Angular CLI.
> **Vrai outil :** Angular CLI 19 + `ng add @angular/material` + `ng serve` (le navigateur est ton oracle visuel, HMR en direct). AUCUN harnais simulé.
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis le **tableau de bord d'organisation de sortie** de TribuZen, puis un **kanban de préparation**. Cahier des charges **exact** :

**Partie A — Setup & theming (M3)**
1. Créer un projet Angular en SCSS et y ajouter Material via `ng add`.
2. Thémer en **Material 3** dans `styles.scss` avec le mixin `mat.theme()` (palette au choix, Roboto, densité 0) et activer `color-scheme: light dark`.

**Partie B — Dashboard participants**
3. Un `MatTable` alimenté par un `MatTableDataSource<Participant>` avec au moins 5 participants.
4. Colonnes **Nom** et **Rôle** **triables** (`mat-sort-header`), une colonne **Actions** avec un bouton icône « Retirer ».
5. Un champ de **filtre** texte (`mat-form-field` + `matInput`) qui filtre le tableau.
6. Une **pagination** (`mat-paginator`, tailles 5 / 10 / 25).
7. Le clic sur « Retirer » ouvre un **`MatDialog`** de confirmation (« Retirer X de la sortie ? »). À la confirmation seulement : la ligne disparaît **et** un **`MatSnackBar`** « X retiré » s'affiche 3 s en haut à droite.

**Partie C — Kanban CDK DragDrop**
8. Deux colonnes **« À faire » / « Prêt »** en `cdkDropList` connectées, cartes `cdkDrag` déplaçables dans **et** entre les colonnes.
9. Les listes sont des **signaux** ; à chaque drop, réémettre avec `.set()` (copie + `moveItemInArray` / `transferArrayItem`).

**Données de départ (à copier) :**

```ts
interface Participant { id: string; nom: string; role: string; }

const PARTICIPANTS: Participant[] = [
  { id: 'p1', nom: 'Alice',  role: 'Organisatrice' },
  { id: 'p2', nom: 'Bob',    role: 'Conducteur' },
  { id: 'p3', nom: 'Cara',   role: 'Intendance' },
  { id: 'p4', nom: 'David',  role: 'Conducteur' },
  { id: 'p5', nom: 'Eve',    role: 'Photos' },
];
```

**Pas de gap-fill** — tu écris les composants complets à partir des starters minimaux.

### Starters minimaux

```bash
# Partie A — dans un dossier de travail
ng new tribuzen-material --style=scss --routing=false
cd tribuzen-material
ng add @angular/material     # choisis un thème custom + typographie globale
ng g c sorties/dashboard-sortie
ng g c sorties/confirm-dialog
ng g c sorties/preparation-kanban
```

```scss
/* src/styles.scss — starter : à compléter avec mat.theme() */
@use '@angular/material' as mat;

html {
  /* À toi : color-scheme + @include mat.theme((...)) */
}
```

```typescript
// confirm-dialog.component.ts — starter
import { Component, inject } from '@angular/core';
// À toi : importer MatDialogModule, MAT_DIALOG_DATA, MatButtonModule
@Component({
  selector: 'app-confirm-dialog',
  imports: [/* … */],
  template: `<!-- titre, contenu {{ data.message }}, actions Annuler / Retirer -->`,
})
export class ConfirmDialogComponent {
  // À toi : injecter MAT_DIALOG_DATA typé { message: string }
}
```

Lance `ng serve` et branche `DashboardSortieComponent` puis `PreparationKanbanComponent` dans `app.component.html` pour voir le résultat en direct.

---

## Étapes (en friction)

1. **Thème M3** — dans `styles.scss`, `color-scheme: light dark` sur `html` + `@include mat.theme((color: mat.$..., typography: Roboto, density: 0))`. Vérifie qu'un `<button matButton="filled">test</button>` est stylé.
2. **Provider animations** — vérifie que `provideAnimationsAsync()` est bien dans `app.config.ts` (posé par `ng add`).
3. **Table nue** — déclare `colonnes = ['nom', 'role', 'actions']`, un `MatTableDataSource(PARTICIPANTS)`, les 3 `matColumnDef`, le header row et la data row. Importe **chaque** module Material par son chemin dédié.
4. **Tri** — ajoute `matSort` sur la table, `mat-sort-header` sur Nom/Rôle, puis connecte `@ViewChild(MatSort)` à `dataSource.sort` dans `ngAfterViewInit`.
5. **Pagination** — ajoute `<mat-paginator>` et connecte `@ViewChild(MatPaginator)` à `dataSource.paginator` (même `ngAfterViewInit`).
6. **Filtre** — un `mat-form-field` + `matInput`, `(input)` → `dataSource.filter = valeur.trim().toLowerCase()`.
7. **Dialog** — écris `ConfirmDialogComponent` (lit `MAT_DIALOG_DATA`, boutons `mat-dialog-close` / `[mat-dialog-close]="true"`). Dans le dashboard, injecte `MatDialog`, ouvre-le avec `{ data: { message } }`, abonne-toi à `afterClosed()`.
8. **Snackbar** — dans le `subscribe`, si confirmé : filtre `dataSource.data` (nouvelle référence) puis `snackBar.open(..., 'OK', { duration: 3000, horizontalPosition: 'end', verticalPosition: 'top' })`.
9. **Kanban** — deux `cdkDropList` connectés (`[cdkDropListConnectedTo]`), cartes `cdkDrag`, listes en `signal`. Dans `drop()`, distingue même liste (`moveItemInArray` sur une copie) vs transfert (`transferArrayItem` sur deux copies), puis `.set()`.
10. **Cas limites** — filtre qui ne matche rien (table vide), annuler le dialog (rien ne se passe), glisser une carte dans la même position (pas de crash).

---

## Corrigé complet commenté

```scss
/* src/styles.scss — theming Material 3 */
@use '@angular/material' as mat;

html {
  /* color-scheme pilote clair/sombre : les tokens Material utilisent light-dark() */
  color-scheme: light dark;
  /* UN seul mixin M3 : émet toutes les variables système --mat-sys-* */
  @include mat.theme((
    color: mat.$violet-palette,   // palette prédéfinie (essaie mat.$azure-palette aussi)
    typography: Roboto,
    density: 0,
  ));
}

body { margin: 0; }
```

```typescript
// src/app/sorties/confirm-dialog/confirm-dialog.component.ts
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
      <!-- mat-dialog-close sans valeur ferme en renvoyant undefined (= annulation) -->
      <button matButton mat-dialog-close>Annuler</button>
      <!-- renvoie true : c'est ce que afterClosed() émettra -->
      <button matButton="filled" [mat-dialog-close]="true">Retirer</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  // Injection typée du payload passé via dialog.open(..., { data })
  readonly data = inject<{ message: string }>(MAT_DIALOG_DATA);
}
```

```typescript
// src/app/sorties/dashboard-sortie/dashboard-sortie.component.ts
import { AfterViewInit, Component, ViewChild, inject } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

interface Participant { id: string; nom: string; role: string; }

@Component({
  selector: 'app-dashboard-sortie',
  // Un module Material par composant utilisé — pas de barrel @angular/material
  imports: [
    MatTableModule, MatSortModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
  ],
  template: `
    <mat-form-field appearance="outline">
      <mat-label>Filtrer</mat-label>
      <input matInput (input)="filtrer($event)" placeholder="Nom, rôle…">
    </mat-form-field>

    <!-- matSort branche le tri au niveau de la table -->
    <table mat-table [dataSource]="dataSource" matSort>
      <ng-container matColumnDef="nom">
        <!-- mat-sort-header rend l'en-tête cliquable pour trier -->
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
          <!-- aria-label : le bouton icône n'a pas de texte visible -->
          <button matIconButton aria-label="Retirer le participant"
                  (click)="confirmerRetrait(p)">
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
    { id: 'p4', nom: 'David', role: 'Conducteur' },
    { id: 'p5', nom: 'Eve',   role: 'Photos' },
  ]);

  // Les vues MatSort/MatPaginator n'existent qu'après le rendu du template
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit(): void {
    // On connecte ici, pas dans le constructeur : les @ViewChild sont résolus
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  filtrer(event: Event): void {
    // MatTableDataSource applique le filtre texte tout seul
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  confirmerRetrait(p: Participant): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { message: `Retirer ${p.nom} de la sortie ?` },
    });
    // afterClosed() est un Observable : émet la valeur de mat-dialog-close
    ref.afterClosed().subscribe(confirme => {
      if (!confirme) return; // Annuler → undefined → on ne fait rien
      // Nouvelle référence de tableau → la table se met à jour
      this.dataSource.data = this.dataSource.data.filter(x => x.id !== p.id);
      this.snackBar.open(`${p.nom} retiré`, 'OK', {
        duration: 3000, horizontalPosition: 'end', verticalPosition: 'top',
      });
    });
  }
}
```

```typescript
// src/app/sorties/preparation-kanban/preparation-kanban.component.ts
import { Component, signal } from '@angular/core';
import {
  CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem,
} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-preparation-kanban',
  imports: [DragDropModule],
  template: `
    <div class="board">
      <section>
        <h3>À faire</h3>
        <!-- #aFaire expose l'instance cdkDropList ; on la connecte à l'autre liste -->
        <div cdkDropList #aFaire="cdkDropList"
             [cdkDropListData]="todo()"
             [cdkDropListConnectedTo]="[pret]"
             (cdkDropListDropped)="drop($event)"
             class="colonne">
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
             (cdkDropListDropped)="drop($event)"
             class="colonne">
          @for (t of done(); track t) {
            <div cdkDrag class="carte">{{ t }}</div>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .board { display: flex; gap: 24px; }
    .colonne { min-width: 200px; min-height: 60px;
               background: var(--mat-sys-surface-container-low); border-radius: 8px; padding: 8px; }
    .carte { padding: 12px; margin: 4px 0; background: var(--mat-sys-surface-container);
             border-radius: 8px; cursor: grab; }
    .cdk-drag-preview { box-shadow: 0 4px 12px rgba(0,0,0,.2); }
    .cdk-drag-placeholder { opacity: .3; }
    .cdk-drop-list-dragging .carte:not(.cdk-drag-placeholder) { transition: transform .2s; }
  `],
})
export class PreparationKanbanComponent {
  // Listes en signaux : source de vérité réactive
  todo = signal(['Pique-nique', 'Réserver parking', 'Vérifier météo']);
  done = signal(['Itinéraire']);

  drop(event: CdkDragDrop<string[]>): void {
    if (event.previousContainer === event.container) {
      // Même liste : réordonner. On COPIE car moveItemInArray mute en place.
      const items = [...event.container.data];
      moveItemInArray(items, event.previousIndex, event.currentIndex);
      // .set() → nouvelle référence → signal notifié
      this.appliquer(event.container.data, items);
    } else {
      // Deux listes : transférer. transferArrayItem mute les deux tableaux reçus.
      const source = [...event.previousContainer.data];
      const cible = [...event.container.data];
      transferArrayItem(source, cible, event.previousIndex, event.currentIndex);
      this.appliquer(event.previousContainer.data, source);
      this.appliquer(event.container.data, cible);
    }
  }

  // Identifie quel signal correspond au tableau reçu (référence d'origine) et le met à jour.
  private appliquer(original: string[], maj: string[]): void {
    if (original === this.todo()) this.todo.set(maj);
    else this.done.set(maj);
  }
}
```

**Pourquoi ce corrigé est correct :**
- **Theming** : un seul `mat.theme()` M3 alimente les tokens `--mat-sys-*` ; le clair/sombre passe par `color-scheme`, pas par un second thème. Pas une trace de l'ancien `mat.define-theme()`.
- **Table** : `MatTableDataSource` fournit tri/pagination/filtre gratuitement dès qu'on connecte `MatSort`/`MatPaginator` dans `ngAfterViewInit` (les `@ViewChild` n'existent pas avant le rendu de la vue).
- **Dialog** : ouvert par le **service** `MatDialog`, pas un template conditionnel ; `afterClosed()` (Observable) porte le résultat de `mat-dialog-close`. On agit **seulement** si `confirme` est vrai.
- **Snackbar** : mise à jour immuable de `dataSource.data` (nouvelle référence) → la table se rafraîchit.
- **Kanban** : les utilitaires DragDrop mutent les tableaux reçus ; comme les données sont des **signaux**, on leur passe des **copies** puis on réémet avec `.set()`.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées** — reproduis le dashboard + kanban **de mémoire, en 40 minutes**, avec :

1. Un **toggle clair/sombre** dans une `mat-toolbar` : un `ThemeService` (`signal isDark` + `effect` qui bascule `document.body.classList.toggle('dark-mode', …)`), et `body.dark-mode { color-scheme: dark; }` dans `styles.scss`.
2. Un bouton **« + Ajouter »** qui ouvre un `MatDialog` avec un mini formulaire (nom + rôle, reactive forms module 19) et **ajoute** la ligne à la table au retour (immuable).
3. Dans le kanban, **annoncer** chaque déplacement aux lecteurs d'écran avec `LiveAnnouncer.announce('Tâche déplacée vers …')` (`@angular/cdk/a11y`).
4. **Sans rouvrir** ce corrigé ni le module 21.

**Critère de réussite :** le toggle bascule tout le thème sans rechargement, l'ajout apparaît dans la table triée/paginée, et le drag-drop reste fonctionnel avec l'annonce a11y.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces écrans vivent ici :

```
tribuzen/
  src/
    styles.scss                                  ← mat.theme() M3 + color-scheme
    app/
      core/
        theme.service.ts                         ← toggle clair/sombre (signal + effect)
      sorties/
        dashboard-sortie/dashboard-sortie.component.ts   ← table + dialog + snackbar
        confirm-dialog/confirm-dialog.component.ts        ← modale de confirmation
        preparation-kanban/preparation-kanban.component.ts ← CDK DragDrop
```

**Différences par rapport au lab :**

- Les participants viendront de l'**API** via `resource`/HttpClient (modules 10, 18), pas d'un tableau en dur. La logique de table reste identique.
- Le mini formulaire d'ajout (variante) réutilisera les patterns reactive forms (modules 19-20) et pourra être un `FormArray` côté « créer une sortie ».
- L'**accessibilité conforme RGAA** (rôles ARIA sur la table, focus visible, contrastes, annonces rigoureuses du drag-drop) sera durcie au **module 22** — ici, on pose la couche visuelle et comportementale.

**Commit cible :**
```
feat(sorties): dashboard participants (MatTable + MatDialog + MatSnackBar) + kanban CDK DragDrop, thème M3
```
