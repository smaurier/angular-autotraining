# Cours 36 — Tester les composants : fixture, DOM, interactions

> **Objectif** : Maitriser les tests de composants Angular avec `TestBed.createComponent()`, `ComponentFixture`, les requetes DOM, le test des signals/inputs, les interactions utilisateur (clic, saisie, soumission de formulaire), et les test harnesses Angular Material.

---

## Rappel du cours precedent

<details>
<summary>1. Quelle est la structure de base d'un fichier de test Angular ?</summary>

```typescript
describe('MaSuite', () => {
  beforeEach(() => { /* setup */ });
  it('devrait faire X', () => { expect(...).toBe(...); });
});
```
</details>

<details>
<summary>2. Comment injecter un service dans un test avec TestBed ?</summary>

```typescript
beforeEach(() => {
  TestBed.configureTestingModule({ providers: [...] });
  service = TestBed.inject(MonService);
});
```
</details>

<details>
<summary>3. Pourquoi ne faut-il jamais faire de vraies requetes HTTP dans un test unitaire ?</summary>

Les tests doivent etre rapides, reproductibles et independants de l'infrastructure. Les requetes reelles sont lentes, fragiles et non deterministes. On utilise des mocks a la place.
</details>

---

## Analogie

En Vue 3 avec Vue Test Utils, vous faites `mount(MonComposant)` pour obtenir un `wrapper`, puis `wrapper.find('.btn').trigger('click')` pour simuler un clic.

En Angular, le pattern est identique mais avec un vocabulaire different :

| Vue Test Utils | Angular TestBed |
|---------------|----------------|
| `mount(Comp)` | `TestBed.createComponent(Comp)` |
| `wrapper` | `fixture` (ComponentFixture) |
| `wrapper.vm` | `fixture.componentInstance` |
| `wrapper.find('.btn')` | `fixture.nativeElement.querySelector('.btn')` |
| `wrapper.trigger('click')` | `element.click()` + `fixture.detectChanges()` |
| `await nextTick()` | `fixture.detectChanges()` |

---

## Theorie

### ComponentFixture et createComponent

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('CompteurComponent', () => {
  let component: CompteurComponent;
  let fixture: ComponentFixture<CompteurComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompteurComponent],  // Composant standalone
    }).compileComponents();

    fixture = TestBed.createComponent(CompteurComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();  // Declenchement initial
  });

  it('devrait creer le composant', () => {
    expect(component).toBeTruthy();
  });
});
```

| Objet | Role |
|-------|------|
| `fixture` | Enveloppe du composant (DOM + instance + utilitaires) |
| `fixture.componentInstance` | L'instance de la classe TypeScript |
| `fixture.nativeElement` | L'element DOM racine |
| `fixture.debugElement` | Element debug Angular (requetes avancees) |
| `fixture.detectChanges()` | Force la detection de changements |

### fixture.detectChanges() — quand et pourquoi

```typescript
// ❌ Oubli de detectChanges = le DOM n'est pas mis a jour
it('devrait afficher le compteur', () => {
  component.compteur.set(42);
  // Le DOM affiche encore l'ancienne valeur !
  const texte = fixture.nativeElement.querySelector('span').textContent;
  expect(texte).toContain('42');  // ECHEC !
});

// ✅ Appeler detectChanges apres chaque modification
it('devrait afficher le compteur', () => {
  component.compteur.set(42);
  fixture.detectChanges();  // Synchronise le DOM
  const texte = fixture.nativeElement.querySelector('span').textContent;
  expect(texte).toContain('42');  // OK
});
```

> **Regle d'or** : Apres toute modification de signal ou de propriete, appelez `fixture.detectChanges()` avant de lire le DOM.

### Requetes DOM

```typescript
// Methode 1 : querySelector sur nativeElement
const bouton = fixture.nativeElement.querySelector('button');
const titre = fixture.nativeElement.querySelector('h1');
const items = fixture.nativeElement.querySelectorAll('.item');

// Methode 2 : By.css sur debugElement (plus Angular-idiomatic)
import { By } from '@angular/platform-browser';

const boutonDebug = fixture.debugElement.query(By.css('button'));
const tousLesItems = fixture.debugElement.queryAll(By.css('.item'));

// Methode 3 : data-testid (recommande pour la robustesse)
const element = fixture.nativeElement.querySelector('[data-testid="btn-submit"]');
```

> **Bonne pratique ESN** : Utilisez `data-testid` pour les selecteurs de test. Ils ne cassent pas quand le CSS ou la structure HTML change.

### Tester les signals : inputs et computed

```typescript
// statut-badge.component.ts
@Component({
  selector: 'app-statut-badge',
  template: `
    <span [class]="classCss()">{{ libelle() }}</span>
  `,
})
export class StatutBadgeComponent {
  statut = input.required<'actif' | 'inactif' | 'en-attente'>();

  classCss = computed(() => {
    switch (this.statut()) {
      case 'actif': return 'badge-vert';
      case 'inactif': return 'badge-rouge';
      case 'en-attente': return 'badge-orange';
    }
  });

  libelle = computed(() => {
    switch (this.statut()) {
      case 'actif': return 'Actif';
      case 'inactif': return 'Inactif';
      case 'en-attente': return 'En attente';
    }
  });
}
```

```typescript
// statut-badge.component.spec.ts
describe('StatutBadgeComponent', () => {
  let fixture: ComponentFixture<StatutBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatutBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatutBadgeComponent);
  });

  it('devrait afficher "Actif" avec la classe badge-vert', () => {
    // Definir l'input via componentRef.setInput (Angular 19+)
    fixture.componentRef.setInput('statut', 'actif');
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector('span');
    expect(span.textContent).toContain('Actif');
    expect(span.className).toContain('badge-vert');
  });

  it('devrait afficher "En attente" avec badge-orange', () => {
    fixture.componentRef.setInput('statut', 'en-attente');
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector('span');
    expect(span.textContent).toContain('En attente');
    expect(span.className).toContain('badge-orange');
  });
});
```

> **Point cle** : `fixture.componentRef.setInput('nom', valeur)` est la facon moderne de definir les inputs signal dans les tests.

### Tester les interactions utilisateur

```typescript
// compteur.component.ts
@Component({
  selector: 'app-compteur',
  template: `
    <span data-testid="valeur">{{ compteur() }}</span>
    <button data-testid="btn-inc" (click)="incrementer()">+</button>
    <button data-testid="btn-dec" (click)="decrementer()">-</button>
  `,
})
export class CompteurComponent {
  compteur = signal(0);
  incrementer(): void { this.compteur.update(v => v + 1); }
  decrementer(): void { this.compteur.update(v => v - 1); }
}
```

```typescript
// compteur.component.spec.ts
describe('CompteurComponent', () => {
  let fixture: ComponentFixture<CompteurComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompteurComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CompteurComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('devrait afficher 0 au demarrage', () => {
    expect(el.querySelector('[data-testid="valeur"]')?.textContent).toContain('0');
  });

  it('devrait incrementer au clic sur +', () => {
    const btnInc = el.querySelector<HTMLButtonElement>('[data-testid="btn-inc"]')!;
    btnInc.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="valeur"]')?.textContent).toContain('1');
  });

  it('devrait decrementer au clic sur -', () => {
    const btnDec = el.querySelector<HTMLButtonElement>('[data-testid="btn-dec"]')!;
    btnDec.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="valeur"]')?.textContent).toContain('-1');
  });
});
```

### Tester la saisie dans un input

```typescript
it('devrait filtrer la liste a la saisie', () => {
  const input = el.querySelector<HTMLInputElement>('input')!;

  // Simuler une saisie
  input.value = 'Alice';
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();

  const items = el.querySelectorAll('.item');
  expect(items.length).toBe(1);
});
```

### Tester la soumission d'un formulaire

```typescript
it('devrait appeler envoyer() a la soumission', () => {
  const spy = jest.spyOn(component, 'envoyer');
  const form = el.querySelector('form')!;

  form.dispatchEvent(new Event('submit'));
  fixture.detectChanges();

  expect(spy).toHaveBeenCalled();
});
```

### Angular Material Test Harnesses

Les test harnesses simplifient les tests des composants Material :

```typescript
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatInputHarness } from '@angular/material/input/testing';

describe('MonFormComponent', () => {
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonFormComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(MonFormComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('devrait saisir dans un champ Material', async () => {
    const input = await loader.getHarness(MatInputHarness);
    await input.setValue('Alice');
    expect(await input.getValue()).toBe('Alice');
  });

  it('devrait cliquer sur un bouton Material', async () => {
    const button = await loader.getHarness(
      MatButtonHarness.with({ text: 'Envoyer' })
    );
    await button.click();
    // ... assertions
  });
});
```

> **Avantage** : Les harnesses abstraient les details d'implementation Material. Vos tests ne cassent pas quand Material change sa structure DOM interne.

### Shallow vs Deep testing

```typescript
// Deep testing : tous les composants enfants sont rendus
await TestBed.configureTestingModule({
  imports: [ParentComponent, EnfantComponent, PetitEnfantComponent],
}).compileComponents();

// Shallow testing : on isole le composant
// En standalone, on peut simplement ne pas importer les enfants
// et surcharger le template si necessaire
await TestBed.configureTestingModule({
  imports: [ParentComponent],
})
.overrideComponent(ParentComponent, {
  set: { imports: [], template: '<div>Template simplifie</div>' },
})
.compileComponents();
```

> **Conseil ESN** : Privilegiez le shallow testing pour les tests rapides, le deep testing pour les tests d'integration entre composants proches.

---

## Pratique

Testez le composant `CompteurComponent` ci-dessous. Ecrivez au moins 5 tests couvrant : l'affichage initial, l'incrementation, la decrementation, la valeur minimale (ne descend pas sous 0), et la remise a zero.

```typescript
@Component({
  selector: 'app-compteur',
  template: `
    <span data-testid="valeur">{{ compteur() }}</span>
    <button data-testid="btn-inc" (click)="incrementer()">+</button>
    <button data-testid="btn-dec" (click)="decrementer()" [disabled]="compteur() === 0">-</button>
    <button data-testid="btn-reset" (click)="reset()">Reset</button>
  `,
})
export class CompteurComponent {
  compteur = signal(0);
  incrementer(): void { this.compteur.update(v => v + 1); }
  decrementer(): void { this.compteur.update(v => Math.max(0, v - 1)); }
  reset(): void { this.compteur.set(0); }
}
```

<details>
<summary>Solution</summary>

```typescript
describe('CompteurComponent', () => {
  let fixture: ComponentFixture<CompteurComponent>;
  let el: HTMLElement;
  let component: CompteurComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompteurComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CompteurComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('devrait afficher 0 au demarrage', () => {
    const valeur = el.querySelector('[data-testid="valeur"]');
    expect(valeur?.textContent).toContain('0');
  });

  it('devrait incrementer de 1 au clic', () => {
    el.querySelector<HTMLButtonElement>('[data-testid="btn-inc"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="valeur"]')?.textContent).toContain('1');
  });

  it('devrait decrementer de 1 au clic', () => {
    component.compteur.set(5);
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="btn-dec"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="valeur"]')?.textContent).toContain('4');
  });

  it('ne devrait pas descendre en dessous de 0', () => {
    // Le compteur est a 0 par defaut
    el.querySelector<HTMLButtonElement>('[data-testid="btn-dec"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="valeur"]')?.textContent).toContain('0');
  });

  it('devrait desactiver le bouton - quand compteur vaut 0', () => {
    const btnDec = el.querySelector<HTMLButtonElement>('[data-testid="btn-dec"]')!;
    expect(btnDec.disabled).toBe(true);
  });

  it('devrait remettre a zero avec Reset', () => {
    component.compteur.set(10);
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="btn-reset"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="valeur"]')?.textContent).toContain('0');
  });
});
```
</details>

---

## Resume

| Point cle | A retenir |
|-----------|-----------|
| `createComponent()` | Cree une fixture pour tester un composant |
| `detectChanges()` | A appeler apres chaque modification de signal/propriete |
| Requetes DOM | `querySelector` / `By.css` / `data-testid` |
| Inputs signal | `fixture.componentRef.setInput('nom', valeur)` |
| Interactions | `element.click()`, `dispatchEvent(new Event('input'))` |
| Test harnesses | API abstraite pour les composants Material |
| Shallow testing | Isoler le composant des enfants pour des tests rapides |

---

> **Prochain cours** : [Cours 37 — Tester les services HTTP et la DI](./03-tests-http-et-di.md)
