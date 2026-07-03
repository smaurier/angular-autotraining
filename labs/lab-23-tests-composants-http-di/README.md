# Lab 23 — Tester composant, HTTP et DI (vrais `.spec.ts`)

> **Outcome :** à la fin, tu sais écrire de vrais fichiers `*.spec.ts` Angular qui montent un composant avec `TestBed`, lisent son DOM via `ComponentFixture`, isolent le réseau avec `HttpTestingController`, et mockent un service injecté avec `useValue`.
> **Vrai outil :** Angular CLI 19 + le runner **Karma/Jasmine** scaffoldé par `ng new` (`ng test`). Ton oracle, c'est la sortie du runner : `X specs, 0 failures` en vert, ou le message d'échec rouge. (Si ton projet est déjà migré Vitest, `ng test` / `vitest` marche pareil — seuls le spy et les assertions changent, cf. encadré en fin de corrigé.)
> **Feedback :** le coach valide en session — le runner Angular est le juge. **Aucun** harnais de test maison : tu utilises `TestBed`, `ComponentFixture`, `HttpTestingController` réels, jamais un lanceur de tests bricolé à la main.

---

## Énoncé

Le lead technique bloque le merge de TribuZen tant que le planificateur de sortie n'a pas de tests. Tu écris **deux** fichiers de spec, dans un projet Angular 19 (ou ton repo TribuZen).

Cahier des charges **exact** :

**A. `sortie-budget.component.spec.ts`** — teste le composant :
1. Le composant se crée (`toBeTruthy`).
2. Le `total` affiché se recalcule quand `participants` change (partant de `participants = 2`, `prixParPersonne = 15`).
3. Un message « Budget dépassé » apparaît quand `total > budgetMax`.
4. Un clic sur le bouton **+1** incrémente le nombre de participants affiché.

**B. `sortie.service.spec.ts`** — teste le service **sans** taper le vrai réseau :
5. `getAll()` fait un `GET /api/sorties` et livre la liste reçue.
6. `create(dto)` fait un `POST /api/sorties` avec le bon `body`.
7. `getAll()` propage une erreur `500` au callback `error`.
8. `afterEach(() => httpTesting.verify())` garde-fou.

**Composants/services sous test (à avoir dans ton projet — versions minimales avec `data-testid`) :**

```typescript
// sortie-budget.component.ts
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-sortie-budget',
  standalone: true,
  template: `
    <p data-testid="participants">Participants : {{ participants() }}</p>
    <p data-testid="total">Total : {{ total() }} EUR</p>
    <p data-testid="message">{{ message() }}</p>
    <button data-testid="btn-inc" (click)="ajouter()">+1</button>
  `,
})
export class SortieBudgetComponent {
  participants    = signal(2);
  prixParPersonne = signal(15);
  budgetMax       = signal(100);

  total   = computed(() => this.participants() * this.prixParPersonne());
  message = computed(() =>
    this.total() > this.budgetMax() ? 'Budget dépassé !' : 'Dans le budget',
  );

  ajouter(): void { this.participants.update(n => n + 1); }
}
```

```typescript
// sortie.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Sortie {
  id: string; titre: string; budgetTotal: number; participants: number;
}
export interface CreateSortieDto {
  titre: string; budgetTotal: number; participants: number;
}

@Injectable({ providedIn: 'root' })
export class SortieService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/sorties';

  getAll(): Observable<Sortie[]> { return this.http.get<Sortie[]>(this.baseUrl); }
  create(dto: CreateSortieDto): Observable<Sortie> {
    return this.http.post<Sortie>(this.baseUrl, dto);
  }
}
```

**Pas de gap-fill** — tu écris les deux specs complets à partir du starter ci-dessous.

### Mise en place du vrai outil

```bash
# Projet Angular 19 neuf (Karma/Jasmine scaffoldés par défaut)
ng new tribuzen-tests --standalone --style=css
cd tribuzen-tests

# Colle les deux fichiers sous test dans src/app/sorties/
# Puis lance le runner en watch : chaque sauvegarde ré-exécute les specs
ng test
```

Le navigateur Karma s'ouvre et affiche `Executed N of N SUCCESS` (ou les échecs en rouge). **C'est ton oracle.**

### Starter minimal

```typescript
// sortie-budget.component.spec.ts — starter
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SortieBudgetComponent } from './sortie-budget.component';

describe('SortieBudgetComponent', () => {
  let fixture: ComponentFixture<SortieBudgetComponent>;
  // À toi : component, el, beforeEach(async), et les 4 it(...)
});
```

```typescript
// sortie.service.spec.ts — starter
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SortieService } from './sortie.service';

describe('SortieService', () => {
  let service: SortieService;
  let httpTesting: HttpTestingController;
  // À toi : beforeEach (providers dans le bon ordre), afterEach(verify), les it(...)
});
```

---

## Étapes (en friction)

1. **`beforeEach` du composant** — `async`, `configureTestingModule({ imports: [SortieBudgetComponent] })` + `compileComponents()`, puis `createComponent`, récupère `componentInstance` et `nativeElement`, appelle un premier `detectChanges()`.
2. **Test « crée »** — `expect(component).toBeTruthy()`.
3. **Test « total recalculé »** — `component.participants.set(4)`, `detectChanges()`, lis `[data-testid="total"]`, attends-toi à `60`. Oublie volontairement `detectChanges()` une fois pour voir l'échec, puis remets-le.
4. **Test « budget dépassé »** — baisse `budgetMax` à `50`, monte `participants` à `4`, `detectChanges()`, vérifie que `[data-testid="message"]` contient `Budget dépassé`.
5. **Test « clic +1 »** — `querySelector` du bouton `[data-testid="btn-inc"]`, `.click()`, `detectChanges()`, vérifie que `[data-testid="participants"]` contient `3`.
6. **`beforeEach` du service** — `providers: [provideHttpClient(), provideHttpClientTesting()]` (ordre !), inject `SortieService` et `HttpTestingController`.
7. **`afterEach`** — `httpTesting.verify()`.
8. **Test `getAll`** — `subscribe` avec assertions, puis `expectOne('/api/sorties')`, vérifie `method === 'GET'`, `flush(mockSorties)`.
9. **Test `create`** — `subscribe`, `expectOne`, vérifie `method === 'POST'` et `req.request.body`, `flush` la réponse.
10. **Test erreur 500** — `subscribe({ next: fail, error })`, `flush('...', { status: 500, statusText: 'Server Error' })`.
11. **Vérifie l'oracle** : le runner affiche toutes les specs en vert. Casse volontairement une assertion → observe le rouge → répare.

---

## Corrigé complet commenté

```typescript
// sortie-budget.component.spec.ts — corrigé
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SortieBudgetComponent } from './sortie-budget.component';

describe('SortieBudgetComponent', () => {
  let fixture: ComponentFixture<SortieBudgetComponent>;
  let component: SortieBudgetComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    // Standalone → imports (pas declarations).
    // compileComponents() : les templates sont compilés en asynchrone → beforeEach async.
    await TestBed.configureTestingModule({
      imports: [SortieBudgetComponent],
    }).compileComponents();

    fixture   = TestBed.createComponent(SortieBudgetComponent);
    component = fixture.componentInstance;   // l'instance de la classe
    el        = fixture.nativeElement;       // l'élément DOM racine
    fixture.detectChanges();                 // rendu initial (lit les signals une 1re fois)
  });

  it('crée le composant', () => {
    expect(component).toBeTruthy();
  });

  it('recalcule le total affiché quand participants change', () => {
    component.participants.set(4);   // 4 * 15 = 60
    fixture.detectChanges();         // SANS cette ligne, le DOM garde "30" → test rouge
    const total = el.querySelector('[data-testid="total"]');
    expect(total?.textContent).toContain('60');
  });

  it('affiche "Budget dépassé" quand le total dépasse budgetMax', () => {
    component.budgetMax.set(50);
    component.participants.set(4);   // total 60 > 50
    fixture.detectChanges();
    const msg = el.querySelector('[data-testid="message"]');
    expect(msg?.textContent).toContain('Budget dépassé');
  });

  it('incrémente les participants au clic sur +1', () => {
    // Interaction réelle : clic natif → déclenche le handler (click)
    el.querySelector<HTMLButtonElement>('[data-testid="btn-inc"]')!.click();
    fixture.detectChanges();         // propage l'update du signal au DOM
    const p = el.querySelector('[data-testid="participants"]');
    expect(p?.textContent).toContain('3');   // partait de 2
  });
});
```

```typescript
// sortie.service.spec.ts — corrigé
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SortieService, Sortie, CreateSortieDto } from './sortie.service';

describe('SortieService', () => {
  let service: SortieService;
  let httpTesting: HttpTestingController;

  const mockSorties: Sortie[] = [
    { id: 's1', titre: 'Plage',  budgetTotal: 120, participants: 4 },
    { id: 's2', titre: 'Cinéma', budgetTotal: 40,  participants: 2 },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),          // fournit HttpClient
        provideHttpClientTesting(),   // ⚠️ APRÈS : remplace le backend par le double de test
      ],
    });
    service     = TestBed.inject(SortieService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  // Garde-fou : échoue si une requête est partie sans être flush → détecte les oublis
  afterEach(() => httpTesting.verify());

  it('getAll() fait GET /api/sorties et livre la liste', () => {
    // 1. subscribe SINON l'Observable HttpClient est froid → aucune requête ne part
    service.getAll().subscribe(sorties => {
      // 4. assertions sur la réponse livrée par flush()
      expect(sorties.length).toBe(2);
      expect(sorties[0].titre).toBe('Plage');
    });

    // 2. intercepte (échoue si 0 ou >1 requête matche cette URL)
    const req = httpTesting.expectOne('/api/sorties');
    expect(req.request.method).toBe('GET');

    // 3. répond → complète l'Observable → déclenche le callback ci-dessus
    req.flush(mockSorties);
  });

  it('create() fait POST /api/sorties avec le bon body', () => {
    const dto: CreateSortieDto = { titre: 'Musée', budgetTotal: 30, participants: 3 };

    service.create(dto).subscribe(sortie => {
      expect(sortie.id).toBe('s3');
    });

    const req = httpTesting.expectOne('/api/sorties');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);   // vérifie ce qui est ENVOYÉ au serveur
    req.flush({ id: 's3', ...dto });
  });

  it('getAll() propage une erreur 500', () => {
    service.getAll().subscribe({
      next: () => fail('ne devrait pas réussir'),
      error: (e) => expect(e.status).toBe(500),
    });

    const req = httpTesting.expectOne('/api/sorties');
    // 2e argument → transforme le flush en réponse d'erreur → déclenche error()
    req.flush('Erreur serveur', { status: 500, statusText: 'Server Error' });
  });
});
```

**Pourquoi ce corrigé est correct :**
- Le composant est monté par `TestBed.createComponent`, pas par `new` : il a un DOM rendu, un contexte DI et une change detection. On lit le vrai `textContent` produit par le template.
- Chaque test suit **arrange → act → assert** ; le `detectChanges()` après chaque changement d'état est ce qui rend l'assertion DOM fiable. Le retirer (étape 3) fait échouer le test — c'est la démonstration à vivre une fois.
- Le service ne tape **jamais** le réseau : `provideHttpClientTesting()` (posé APRÈS `provideHttpClient()`) branche un backend fictif. `req.flush(...)` est ce qui débloque le `subscribe`. Sans `flush`, `verify()` en `afterEach` signalerait une requête restée en attente.
- Le test d'erreur prouve le chemin `error` sans serveur : `flush('...', { status: 500 })` simule un 500 déterministe.
- Zéro harnais maison : tout vient de `@angular/core/testing` et `@angular/common/http/testing`.

> **Traduction Vitest** (si ton projet est migré) — le `TestBed`, les providers et `HttpTestingController` sont **identiques**. Seuls changent : les spies (`vi.fn()` au lieu de `jasmine.createSpyObj`), et `fail()` (remplace par `expect.unreachable()` ou `throw new Error(...)`). La logique de test ne bouge pas.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées.** Reproduis les deux specs **de mémoire, en 30 minutes**, sans rouvrir ce corrigé ni le module 23, avec en plus :

1. **Un composant mocké** — écris `mes-sorties.component.spec.ts` qui monte un `MesSortiesComponent` dépendant de `SortieService`, mais en **injectant un mock** : `{ provide: SortieService, useValue: mock }` où `mock.getAll` renvoie `of(mockSorties)`. Vérifie que la liste rendue contient 2 lignes **et** que `mock.getAll` a été appelé — sans aucun `HttpTestingController` (le vrai HTTP n'est jamais atteint).
2. **Un input signal** — ajoute au `SortieBudgetComponent` un `input()` `devise` (`'EUR'` par défaut) affiché à côté du total, et teste-le avec `fixture.componentRef.setInput('devise', 'CHF')` puis `detectChanges()`.

**Critère de réussite :** `ng test` affiche toutes les specs en vert ; le test du composant mocké ne déclenche aucune requête réseau (aucun `HttpTestingController` importé), et le test d'input passe par `setInput`, pas par affectation directe.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, les specs vivent **à côté** de leur cible :

```
tribuzen/
  src/
    app/
      sorties/
        sortie-budget.component.ts
        sortie-budget.component.spec.ts   ← spec composant
        sortie.service.ts
        sortie.service.spec.ts            ← spec service HTTP
        mes-sorties.component.ts
        mes-sorties.component.spec.ts     ← spec avec mock DI (variante J+30)
```

**Différences par rapport au lab :**

- La CI (GitHub Actions) lancera `ng test --watch=false --browsers=ChromeHeadless` : les specs deviennent un **gate de merge**, pas juste un feedback local.
- Les mocks de service seront centralisés dans un dossier `testing/` (factories réutilisables) plutôt que redéfinis dans chaque spec.
- Les tests des **guards** et **interceptors** d'auth (module 25) réutiliseront `TestBed.runInInjectionContext()` et `HttpTestingController` — même outillage, cible différente.
- Le `SortieBudgetComponent` réel recevra ses données d'un formulaire réactif (module 19) ; les specs s'étoffent en conséquence, la mécanique de test ne change pas.

**Commit cible :**
```
test(sorties): specs SortieBudgetComponent (DOM + clic) et SortieService (HttpTestingController)
```
