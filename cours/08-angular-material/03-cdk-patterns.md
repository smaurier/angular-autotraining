# Cours 34 — CDK : Drag & Drop, Virtual Scroll, Overlay

> **Objectif** : Decouvrir le CDK (Component Dev Kit) d'Angular, la couche comportementale sous Angular Material. Maitriser le drag & drop, le virtual scroll pour les grandes listes, l'overlay pour les popups, le clipboard et le responsive avec `BreakpointObserver`.

---

## Rappel du cours precedent

<details>
<summary>1. Comment ouvrir un MatDialog et recuperer le resultat a sa fermeture ?</summary>

```typescript
const ref = this.dialog.open(MonDialogComponent, { data: { ... } });
ref.afterClosed().subscribe(resultat => { /* traiter */ });
```

On injecte `MatDialog`, on appelle `open()`, et on ecoute `afterClosed()`.
</details>

<details>
<summary>2. Quel est le role de `MatTableDataSource` ?</summary>

C'est une classe utilitaire qui gere automatiquement le tri (`MatSort`), la pagination (`MatPaginator`) et le filtre texte pour un `mat-table`.
</details>

<details>
<summary>3. Comment afficher une notification temporaire avec Material ?</summary>

```typescript
this.snackBar.open('Message', 'Fermer', { duration: 3000 });
```

On injecte `MatSnackBar` et on appelle `open()` avec un message, une action et une configuration.
</details>

---

## Analogie

En Vue 3, quand vous avez besoin de drag & drop, vous installez `vuedraggable`. Pour le virtual scroll, vous utilisez `vue-virtual-scroller`. Chaque comportement necessite une librairie tierce.

Angular a reuni tous ces **comportements reutilisables** dans un seul package : le **CDK** (Component Dev Kit). C'est la fondation sur laquelle Angular Material est construit. Le CDK fournit le **comportement** (drag, scroll, overlay, focus trap...) sans imposer de style visuel.

```
CDK = Comportement (headless)    →  Vous stylisez comme vous voulez
Material = CDK + Style Material  →  Composants prets a l'emploi
```

| Besoin | Vue 3 (lib tierce) | Angular CDK |
|--------|--------------------|-------------|
| Drag & Drop | `vuedraggable` | `@angular/cdk/drag-drop` |
| Virtual Scroll | `vue-virtual-scroller` | `@angular/cdk/scrolling` |
| Popups/Overlays | `floating-ui` | `@angular/cdk/overlay` |
| Clipboard | API native | `@angular/cdk/clipboard` |
| Responsive | `@vueuse/core` | `@angular/cdk/layout` |

---

## Theorie

### CDK DragDrop : glisser-deposer

Le module `DragDropModule` fournit les directives `cdkDrag` et `cdkDropList` :

```typescript
import { Component, signal } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-kanban',
  imports: [DragDropModule],
  template: `
    <div style="display: flex; gap: 24px">
      <!-- Colonne "A faire" -->
      <div>
        <h3>A faire</h3>
        <div cdkDropList #todoList="cdkDropList"
             [cdkDropListData]="todo()"
             [cdkDropListConnectedTo]="[doneList]"
             (cdkDropListDropped)="drop($event)">
          @for (item of todo(); track item) {
            <div cdkDrag class="card">{{ item }}</div>
          }
        </div>
      </div>

      <!-- Colonne "Termine" -->
      <div>
        <h3>Termine</h3>
        <div cdkDropList #doneList="cdkDropList"
             [cdkDropListData]="done()"
             [cdkDropListConnectedTo]="[todoList]"
             (cdkDropListDropped)="drop($event)">
          @for (item of done(); track item) {
            <div cdkDrag class="card">{{ item }}</div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      padding: 12px; margin: 4px 0;
      background: white; border: 1px solid #ddd;
      border-radius: 4px; cursor: move;
    }
    .cdk-drag-preview { box-shadow: 0 4px 12px rgba(0,0,0,.2); }
    .cdk-drag-placeholder { opacity: 0.3; }
  `],
})
export class KanbanComponent {
  todo = signal(['Tache 1', 'Tache 2', 'Tache 3']);
  done = signal(['Tache 4']);

  drop(event: CdkDragDrop<string[]>): void {
    if (event.previousContainer === event.container) {
      // Reordonnement dans la meme liste
      const items = [...event.container.data];
      moveItemInArray(items, event.previousIndex, event.currentIndex);
      this.mettreAJour(event.container.id, items);
    } else {
      // Transfert entre listes
      const prev = [...event.previousContainer.data];
      const curr = [...event.container.data];
      transferArrayItem(prev, curr, event.previousIndex, event.currentIndex);
      this.mettreAJour(event.previousContainer.id, prev);
      this.mettreAJour(event.container.id, curr);
    }
  }

  private mettreAJour(id: string, items: string[]): void {
    // Logique de mise a jour selon l'id de la liste
  }
}
```

> **Fonctions utilitaires** : `moveItemInArray()` reordonne dans une liste, `transferArrayItem()` deplace entre deux listes.

### CDK VirtualScroll : listes geantes

Quand vous avez des milliers d'elements, le DOM ne peut pas tous les rendre. Le virtual scroll ne rend que les elements visibles :

```typescript
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-grande-liste',
  imports: [ScrollingModule],
  template: `
    <cdk-virtual-scroll-viewport itemSize="48" style="height: 400px">
      <div *cdkVirtualFor="let item of items" class="item">
        {{ item.nom }} — {{ item.email }}
      </div>
    </cdk-virtual-scroll-viewport>
  `,
  styles: [`
    .item { height: 48px; display: flex; align-items: center; padding: 0 16px; }
  `],
})
export class GrandeListeComponent {
  items = Array.from({ length: 10_000 }, (_, i) => ({
    nom: `Utilisateur ${i + 1}`,
    email: `user${i + 1}@esn.fr`,
  }));
}
```

| Propriete | Description |
|-----------|-------------|
| `itemSize` | Hauteur fixe de chaque element (en px) |
| `*cdkVirtualFor` | Remplace `@for` pour le virtual scroll |
| `minBufferPx` | Buffer minimum a pre-rendre |
| `maxBufferPx` | Buffer maximum a pre-rendre |

```typescript
// ❌ Sans virtual scroll : 10 000 elements DOM = freeze du navigateur
@for (item of items; track item.id) {
  <div class="item">{{ item.nom }}</div>
}

// ✅ Avec virtual scroll : ~20 elements DOM visibles a la fois
<cdk-virtual-scroll-viewport itemSize="48">
  <div *cdkVirtualFor="let item of items">{{ item.nom }}</div>
</cdk-virtual-scroll-viewport>
```

### CDK Overlay : popups et tooltips personnalises

L'overlay CDK cree des elements flottants positionnes par rapport a un element ancre :

```typescript
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

@Component({
  selector: 'app-tooltip-demo',
  imports: [OverlayModule, MatButtonModule],
  template: `
    <button mat-flat-button #trigger
            (mouseenter)="afficher(trigger)"
            (mouseleave)="masquer()">
      Survolez-moi
    </button>
  `,
})
export class TooltipDemoComponent {
  private overlay = inject(Overlay);
  private overlayRef: OverlayRef | null = null;

  afficher(element: HTMLElement): void {
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(element)
      .withPositions([{
        originX: 'center', originY: 'bottom',
        overlayX: 'center', overlayY: 'top',
        offsetY: 8,
      }]);

    this.overlayRef = this.overlay.create({ positionStrategy });
    const portal = new ComponentPortal(MonTooltipComponent);
    this.overlayRef.attach(portal);
  }

  masquer(): void {
    this.overlayRef?.dispose();
  }
}

@Component({
  selector: 'app-mon-tooltip',
  template: `<div class="tooltip">Information complementaire</div>`,
  styles: [`
    .tooltip {
      background: #333; color: white;
      padding: 8px 12px; border-radius: 4px;
      font-size: 14px;
    }
  `],
})
export class MonTooltipComponent {}
```

> En pratique, utilisez `matTooltip` de Material pour les tooltips simples. L'overlay CDK est utile pour des popups complexes personnalises.

### CDK Clipboard

```typescript
import { ClipboardModule } from '@angular/cdk/clipboard';

@Component({
  selector: 'app-copier',
  imports: [ClipboardModule, MatButtonModule, MatIconModule],
  template: `
    <code>npm install @angular/material</code>
    <button mat-icon-button [cdkCopyToClipboard]="'npm install @angular/material'">
      <mat-icon>content_copy</mat-icon>
    </button>
  `,
})
export class CopierComponent {}
```

> La directive `cdkCopyToClipboard` copie la valeur dans le presse-papiers au clic. Simple et efficace.

### CDK Layout : BreakpointObserver pour le responsive

```typescript
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Component({
  selector: 'app-responsive',
  template: `
    @if (estMobile()) {
      <p>Affichage mobile</p>
    } @else {
      <p>Affichage desktop</p>
    }
  `,
})
export class ResponsiveComponent {
  private breakpoint = inject(BreakpointObserver);
  estMobile = signal(false);

  constructor() {
    this.breakpoint
      .observe([Breakpoints.Handset])
      .subscribe(result => this.estMobile.set(result.matches));
  }
}
```

| Breakpoint | Valeur |
|------------|--------|
| `Breakpoints.Handset` | Mobile portrait + paysage |
| `Breakpoints.Tablet` | Tablette |
| `Breakpoints.Web` | Desktop |
| `Breakpoints.HandsetPortrait` | Mobile portrait uniquement |

### Quand utiliser CDK vs Material ?

```
Vous avez besoin de style Material Design ?
  → OUI : utilisez les composants Material (mat-table, mat-dialog...)
  → NON : utilisez le CDK directement (cdkDrag, cdk-virtual-scroll...)

CDK = comportement sans opinion visuelle
Material = CDK + habillage Material Design
```

| Cas d'usage | Utilisez |
|-------------|----------|
| Tableau style avec tri/pagination | `mat-table` (Material) |
| Drag & drop avec votre propre style | `cdkDrag` (CDK) |
| Tooltip simple | `matTooltip` (Material) |
| Popup complexe personnalise | `Overlay` (CDK) |
| Grande liste performante | `cdk-virtual-scroll-viewport` (CDK) |
| Detecter la taille d'ecran | `BreakpointObserver` (CDK) |

---

## Pratique

Creez un mini kanban board avec deux colonnes ("A faire" / "En cours") utilisant le CDK Drag & Drop. Ajoutez un virtual scroll dans une troisieme colonne "Archive" contenant 1000 elements.

**Consignes** :
1. Trois colonnes cote a cote avec `cdkDropList`
2. On peut deplacer les taches entre "A faire" et "En cours"
3. La colonne "Archive" est en lecture seule avec un `cdk-virtual-scroll-viewport`
4. Utilisez des signals pour stocker les listes

<details>
<summary>Solution</summary>

```typescript
@Component({
  selector: 'app-kanban-complet',
  imports: [DragDropModule, ScrollingModule],
  template: `
    <div style="display: flex; gap: 16px">
      <div style="flex: 1">
        <h3>A faire</h3>
        <div cdkDropList #todoList="cdkDropList"
             [cdkDropListData]="todo()"
             [cdkDropListConnectedTo]="[progressList]"
             (cdkDropListDropped)="drop($event, 'todo')">
          @for (t of todo(); track t) {
            <div cdkDrag class="card">{{ t }}</div>
          }
        </div>
      </div>

      <div style="flex: 1">
        <h3>En cours</h3>
        <div cdkDropList #progressList="cdkDropList"
             [cdkDropListData]="enCours()"
             [cdkDropListConnectedTo]="[todoList]"
             (cdkDropListDropped)="drop($event, 'enCours')">
          @for (t of enCours(); track t) {
            <div cdkDrag class="card">{{ t }}</div>
          }
        </div>
      </div>

      <div style="flex: 1">
        <h3>Archive ({{ archives.length }} elements)</h3>
        <cdk-virtual-scroll-viewport itemSize="40" style="height: 300px">
          <div *cdkVirtualFor="let a of archives" class="card-archive">
            {{ a }}
          </div>
        </cdk-virtual-scroll-viewport>
      </div>
    </div>
  `,
  styles: [`
    .card {
      padding: 10px; margin: 4px 0; background: #e3f2fd;
      border-radius: 4px; cursor: grab;
    }
    .card-archive {
      height: 40px; display: flex; align-items: center;
      padding: 0 12px; border-bottom: 1px solid #eee;
    }
  `],
})
export class KanbanCompletComponent {
  todo = signal(['Design mockups', 'Ecrire specs', 'Configurer CI']);
  enCours = signal(['Developper API', 'Code review']);
  archives = Array.from({ length: 1000 }, (_, i) => `Tache archivee #${i + 1}`);

  drop(event: CdkDragDrop<string[]>, cible: 'todo' | 'enCours'): void {
    if (event.previousContainer === event.container) {
      const items = [...event.container.data];
      moveItemInArray(items, event.previousIndex, event.currentIndex);
      cible === 'todo' ? this.todo.set(items) : this.enCours.set(items);
    } else {
      const prev = [...event.previousContainer.data];
      const curr = [...event.container.data];
      transferArrayItem(prev, curr, event.previousIndex, event.currentIndex);
      // Determiner quelle liste source mettre a jour
      if (cible === 'todo') {
        this.todo.set(curr);
        this.enCours.set(prev);
      } else {
        this.enCours.set(curr);
        this.todo.set(prev);
      }
    }
  }
}
```
</details>

---

## Resume

| Module CDK | Usage | Directive / Classe cle |
|------------|-------|----------------------|
| Drag & Drop | Glisser-deposer | `cdkDrag`, `cdkDropList`, `moveItemInArray` |
| Scrolling | Grandes listes | `cdk-virtual-scroll-viewport`, `*cdkVirtualFor` |
| Overlay | Popups personnalises | `Overlay`, `ComponentPortal`, `FlexibleConnectedPositionStrategy` |
| Clipboard | Copier dans le presse-papiers | `cdkCopyToClipboard` |
| Layout | Responsive | `BreakpointObserver`, `Breakpoints` |

> **Regle** : CDK = comportement sans style. Material = CDK + style Material Design. Utilisez le CDK quand vous voulez le controle total du visuel.

---

> **Prochain cours** : [Cours 35 — Tests unitaires : Jest, TestBed, premiers tests](../09-tests/01-tests-unitaires.md)
