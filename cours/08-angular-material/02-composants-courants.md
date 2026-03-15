# Cours 33 — Composants Material courants : Table, Dialog, Snackbar

> **Objectif** : Maîtriser les composants Angular Material les plus utilises en projet ESN : MatTable (avec tri, pagination, filtre), MatDialog, MatSnackBar, les champs de formulaire, et les composants de layout. Chaque composant est illustre avec un exemple pratique standalone.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle commande installe Angular Material dans un projet existant ?</summary>

```bash
ng add @angular/material
```

Elle installe les packages, configure le theme, ajoute les polices et met a jour `angular.json`.
</details>

<details>
<summary>2. Comment définir un theme personnalise en SCSS ?</summary>

```scss
@use '@angular/material' as mat;
$mon-theme: mat.define-theme((
  color: (theme-type: light, primary: mat.$azure-palette),
));
html { @include mat.all-component-themes($mon-theme); }
```
</details>

<details>
<summary>3. Quelle est la bonne pratique pour importer les modules Material ?</summary>

Importer chaque module individuellement depuis son chemin spécifique :
`import { MatButtonModule } from '@angular/material/button';`
et l'ajouter au tableau `imports` du composant standalone.
</details>

---

## Analogie

En Vue 3 avec Vuetify, vous utilisez `<v-data-table>`, `<v-dialog>`, `<v-snackbar>`. Chaque composant a ses props et ses événements. Angular Material fonctionne exactement pareil : des composants pre-styles avec une API d'entree/sortie bien definie. La différence principale est que les dialogs et snackbars sont ouverts via des **services injectes** plutot que par un `v-model`.

| Vuetify (Vue 3) | Angular Material |
|-----------------|-----------------|
| `<v-data-table>` | `<mat-table>` |
| `<v-dialog v-model>` | `MatDialog.open()` (service) |
| `<v-snackbar>` | `MatSnackBar.open()` (service) |
| `<v-text-field>` | `<mat-form-field>` + `<input matInput>` |

---

## Théorie

### MatTable : tableau de donnees

Le composant `mat-table` est le plus utilise en ESN (dashboards, listes, backoffice).

```typescript
import { Component, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

interface Utilisateur {
  id: number;
  nom: string;
  email: string;
  role: string;
}

@Component({
  selector: 'app-table-utilisateurs',
  imports: [
    MatTableModule, MatSortModule, MatPaginatorModule,
    MatInputModule, MatFormFieldModule,
  ],
  template: `
    <!-- Filtre -->
    <mat-form-field appearance="outline" style="width: 100%">
      <mat-label>Rechercher</mat-label>
      <input matInput (input)="appliquerFiltre($event)" placeholder="Nom, email...">
    </mat-form-field>

    <!-- Tableau -->
    <table mat-table [dataSource]="dataSource" matSort>

      <!-- Colonne Nom -->
      <ng-container matColumnDef="nom">
        <th mat-header-cell *matHeaderCellDef mat-sort-header>Nom</th>
        <td mat-cell *matCellDef="let u">{{ u.nom }}</td>
      </ng-container>

      <!-- Colonne Email -->
      <ng-container matColumnDef="email">
        <th mat-header-cell *matHeaderCellDef mat-sort-header>Email</th>
        <td mat-cell *matCellDef="let u">{{ u.email }}</td>
      </ng-container>

      <!-- Colonne Role -->
      <ng-container matColumnDef="role">
        <th mat-header-cell *matHeaderCellDef>Role</th>
        <td mat-cell *matCellDef="let u">{{ u.role }}</td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="colonnes"></tr>
      <tr mat-row *matRowDef="let row; columns: colonnes"></tr>
    </table>

    <!-- Pagination -->
    <mat-paginator [pageSizeOptions]="[5, 10, 25]" showFirstLastButtons />
  `,
})
export class TableUtilisateursComponent {
  colonnes = ['nom', 'email', 'role'];
  dataSource = new MatTableDataSource<Utilisateur>([
    { id: 1, nom: 'Alice Dupont', email: 'alice@esn.fr', role: 'Dev' },
    { id: 2, nom: 'Bob Martin', email: 'bob@esn.fr', role: 'Lead' },
    { id: 3, nom: 'Claire Petit', email: 'claire@esn.fr', role: 'PO' },
  ]);

  appliquerFiltre(event: Event): void {
    const valeur = (event.target as HTMLInputElement).value;
    this.dataSource.filter = valeur.trim().toLowerCase();
  }
}
```

> **Astuce** : `MatTableDataSource` géré automatiquement le tri, la pagination et le filtre si vous connectez `@ViewChild(MatSort)` et `@ViewChild(MatPaginator)`.

### MatDialog : boites de dialogue modales

Les dialogs sont ouverts via un **service**, pas un template conditionnel :

```typescript
// composant du dialog
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Confirmation</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" [mat-dialog-close]="true">
        Confirmer
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  readonly data = inject<{ message: string }>(MAT_DIALOG_DATA);
}
```

```typescript
// composant qui ouvre le dialog
@Component({
  selector: 'app-liste',
  imports: [MatButtonModule],
  template: `
    <button mat-flat-button color="warn" (click)="confirmerSuppression()">
      Supprimer
    </button>
  `,
})
export class ListeComponent {
  private dialog = inject(MatDialog);

  confirmerSuppression(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { message: 'Voulez-vous vraiment supprimer cet element ?' },
    });

    ref.afterClosed().subscribe(resultat => {
      if (resultat) {
        console.log('Suppression confirmee !');
      }
    });
  }
}
```

> **Point clé** : `MAT_DIALOG_DATA` injecte les donnees passees au dialog. `mat-dialog-close` ferme et retourne une valeur.

### MatSnackBar : notifications toast

```typescript
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-actions',
  imports: [MatButtonModule],
  template: `
    <button mat-flat-button (click)="notifier()">Sauvegarder</button>
  `,
})
export class ActionsComponent {
  private snackBar = inject(MatSnackBar);

  notifier(): void {
    this.snackBar.open('Element sauvegarde avec succes !', 'Fermer', {
      duration: 3000,             // Disparait apres 3s
      horizontalPosition: 'end',  // Droite
      verticalPosition: 'top',    // Haut
    });
  }
}
```

### Champs de formulaire : MatFormField + MatInput + MatSelect + MatAutocomplete

```typescript
@Component({
  selector: 'app-formulaire-contact',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatAutocompleteModule, MatButtonModule,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="envoyer()">

      <!-- Input texte -->
      <mat-form-field appearance="outline">
        <mat-label>Nom</mat-label>
        <input matInput formControlName="nom">
        <mat-error>Le nom est requis</mat-error>
      </mat-form-field>

      <!-- Select -->
      <mat-form-field appearance="outline">
        <mat-label>Service</mat-label>
        <mat-select formControlName="service">
          <mat-option value="dev">Developpement</mat-option>
          <mat-option value="design">Design</mat-option>
          <mat-option value="rh">Ressources Humaines</mat-option>
        </mat-select>
      </mat-form-field>

      <!-- Autocomplete -->
      <mat-form-field appearance="outline">
        <mat-label>Ville</mat-label>
        <input matInput formControlName="ville" [matAutocomplete]="auto">
        <mat-autocomplete #auto="matAutocomplete">
          @for (ville of villesFiltrees(); track ville) {
            <mat-option [value]="ville">{{ ville }}</mat-option>
          }
        </mat-autocomplete>
      </mat-form-field>

      <button mat-flat-button color="primary" type="submit">Envoyer</button>
    </form>
  `,
})
export class FormulaireContactComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    nom: ['', Validators.required],
    service: [''],
    ville: [''],
  });

  villes = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nantes'];
  villesFiltrees = computed(() => {
    const saisie = this.form.get('ville')?.value?.toLowerCase() ?? '';
    return this.villes.filter(v => v.toLowerCase().includes(saisie));
  });

  envoyer(): void {
    console.log(this.form.value);
  }
}
```

### Layout : MatToolbar + MatSidenav

```typescript
@Component({
  selector: 'app-layout',
  imports: [
    MatToolbarModule, MatSidenavModule, MatButtonModule,
    MatIconModule, MatListModule, RouterOutlet,
  ],
  template: `
    <mat-sidenav-container style="height: 100vh">
      <mat-sidenav mode="side" opened style="width: 240px">
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span>Tableau de bord</span>
          </a>
          <a mat-list-item routerLink="/utilisateurs">
            <mat-icon matListItemIcon>people</mat-icon>
            <span>Utilisateurs</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary">
          <span>Mon Application ESN</span>
        </mat-toolbar>
        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class LayoutComponent {}
```

### MatCard, MatChips, MatBadge

```typescript
@Component({
  selector: 'app-profil-carte',
  imports: [MatCardModule, MatChipsModule, MatBadgeModule, MatButtonModule, MatIconModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Alice Dupont</mat-card-title>
        <mat-card-subtitle>Developpeur Angular Senior</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <mat-chip-set>
          <mat-chip>Angular</mat-chip>
          <mat-chip>TypeScript</mat-chip>
          <mat-chip>RxJS</mat-chip>
        </mat-chip-set>
      </mat-card-content>
      <mat-card-actions>
        <button mat-button>
          <mat-icon matBadge="3" matBadgeColor="warn">mail</mat-icon>
          Messages
        </button>
      </mat-card-actions>
    </mat-card>
  `,
})
export class ProfilCarteComponent {}
```

### Pattern d'import : toujours individuel

```typescript
// ❌ Import groupe — ne fonctionne pas, chaque module a son entrypoint
import { MatButtonModule, MatIconModule } from '@angular/material';

// ✅ Import individuel — un par ligne
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
```

---

## Pratique

Creez un composant `DashboardComponent` qui affiche une table d'utilisateurs avec filtre et pagination, et un bouton "Ajouter" qui ouvre un `MatDialog` avec un formulaire (nom + email). A la fermeture du dialog, affichez un `MatSnackBar` de confirmation.

**Consignes** :
1. Utilisez `MatTableDataSource` avec au moins 5 utilisateurs fictifs
2. Le dialog contient deux `mat-form-field` (nom, email)
3. Le snackbar s'affiche 3 secondes après la fermeture du dialog

<details>
<summary>Solution</summary>

```typescript
// ajout-dialog.component.ts
@Component({
  selector: 'app-ajout-dialog',
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule,
            MatButtonModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Nouvel utilisateur</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width: 100%">
        <mat-label>Nom</mat-label>
        <input matInput [formControl]="nom">
      </mat-form-field>
      <mat-form-field appearance="outline" style="width: 100%">
        <mat-label>Email</mat-label>
        <input matInput [formControl]="email">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary"
              [mat-dialog-close]="{ nom: nom.value, email: email.value }">
        Ajouter
      </button>
    </mat-dialog-actions>
  `,
})
export class AjoutDialogComponent {
  nom = new FormControl('');
  email = new FormControl('');
}
```

```typescript
// dashboard.component.ts
@Component({
  selector: 'app-dashboard',
  imports: [MatTableModule, MatPaginatorModule, MatSortModule,
            MatFormFieldModule, MatInputModule, MatButtonModule,
            MatIconModule],
  template: `
    <h1>Utilisateurs</h1>
    <mat-form-field appearance="outline" style="width: 100%">
      <mat-label>Filtrer</mat-label>
      <input matInput (input)="filtrer($event)">
    </mat-form-field>

    <button mat-flat-button color="primary" (click)="ouvrir()">
      <mat-icon>add</mat-icon> Ajouter
    </button>

    <table mat-table [dataSource]="dataSource" matSort>
      <ng-container matColumnDef="nom">
        <th mat-header-cell *matHeaderCellDef mat-sort-header>Nom</th>
        <td mat-cell *matCellDef="let u">{{ u.nom }}</td>
      </ng-container>
      <ng-container matColumnDef="email">
        <th mat-header-cell *matHeaderCellDef mat-sort-header>Email</th>
        <td mat-cell *matCellDef="let u">{{ u.email }}</td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="['nom', 'email']"></tr>
      <tr mat-row *matRowDef="let row; columns: ['nom', 'email']"></tr>
    </table>
    <mat-paginator [pageSizeOptions]="[5, 10]" showFirstLastButtons />
  `,
})
export class DashboardComponent {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  dataSource = new MatTableDataSource([
    { nom: 'Alice', email: 'alice@esn.fr' },
    { nom: 'Bob', email: 'bob@esn.fr' },
    { nom: 'Claire', email: 'claire@esn.fr' },
    { nom: 'David', email: 'david@esn.fr' },
    { nom: 'Eve', email: 'eve@esn.fr' },
  ]);

  filtrer(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  ouvrir(): void {
    const ref = this.dialog.open(AjoutDialogComponent, { width: '400px' });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.dataSource.data = [...this.dataSource.data, result];
        this.snackBar.open(`${result.nom} ajoute !`, 'OK', { duration: 3000 });
      }
    });
  }
}
```
</details>

---

## Résumé

| Composant | Usage | API clé |
|-----------|-------|---------|
| `mat-table` | Tableaux de donnees | `MatTableDataSource`, `matSort`, `mat-paginator` |
| `MatDialog` | Modales | `dialog.open()`, `MAT_DIALOG_DATA`, `mat-dialog-close` |
| `MatSnackBar` | Notifications toast | `snackBar.open(message, action, config)` |
| `mat-form-field` | Champs de formulaire | `appearance="outline"`, `<mat-error>`, `<mat-label>` |
| `mat-sidenav` | Layout avec menu lateral | `mat-sidenav-container`, `mode="side"` |
| `mat-card` | Cartes d'affichage | `mat-card-header`, `mat-card-content`, `mat-card-actions` |

---

> **Prochain cours** : [Cours 34 — CDK : Drag & Drop, Virtual Scroll, Overlay](./03-cdk-patterns.md)
