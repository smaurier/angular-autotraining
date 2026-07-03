---
titre: Tester composants, HTTP et DI — TestBed, ComponentFixture, HttpTestingController
cours: 03-angular
notions: [TestBed, "TestBed.configureTestingModule()", compileComponents(), "TestBed.createComponent()", ComponentFixture, fixture.componentInstance, fixture.nativeElement, fixture.detectChanges(), "fixture.componentRef.setInput()", requêtes DOM querySelector, data-testid, simuler un clic et une saisie, "provideHttpClient()", "provideHttpClientTesting()", HttpTestingController, "expectOne()", "req.flush()", "verify()", mock de service useValue, "TestBed.runInInjectionContext()", runner Karma/Jasmine vs Vitest]
outcomes:
  - sait monter un composant standalone dans un test avec TestBed et lire son DOM via ComponentFixture
  - sait piloter la détection de changement avec detectChanges() et définir un input signal avec componentRef.setInput()
  - sait tester un service HTTP en isolant le réseau avec provideHttpClientTesting() et HttpTestingController
  - sait mocker une dépendance injectée avec provide + useValue et vérifier les appels
  - sait quel est le runner scaffoldé par Angular 19 (Karma/Jasmine) et que la CLI passe à Vitest par défaut
prerequis: [modules 00-22, module 11 services-et-injectable, module 18 http-crud-interceptors-cache]
next: 24-state-management
libs: [{ name: "@angular/core", version: "19" }, { name: "@angular/common", version: "19" }, { name: "jasmine-core", version: "5" }]
tribuzen: qualité TribuZen — suite de tests unitaires des composants et services front (planificateur de sortie, SortieService HTTP)
last-reviewed: 2026-07
---

# Tester composants, HTTP et DI — `TestBed`, `ComponentFixture`, `HttpTestingController`

> **Outcomes — tu sauras FAIRE :** monter un composant dans `TestBed`, lire son DOM via `ComponentFixture`, piloter `detectChanges()`, définir un input signal, isoler le réseau avec `provideHttpClientTesting()` + `HttpTestingController`, et mocker une dépendance DI avec `useValue`.
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre **les outils de test propres à Angular** : `TestBed` (le module de test qui reconstruit le contexte DI), `ComponentFixture` (l'enveloppe DOM + instance d'un composant), et `HttpTestingController` (le backend HTTP fictif). Les fondamentaux du test — `describe`/`it`, assertions, spies, tests asynchrones — sont supposés **acquis** (cours transverse testing). On ne réexplique pas ce qu'est un test unitaire ; on montre **comment Angular** t'en donne les briques. Les test harnesses Angular Material appartiennent au terrain du **module 21** ; l'e2e (Playwright/Cypress) n'est pas ici.

## 1. Cas concret d'abord

Ton `SortieService` (module 18) et ton `SortieBudgetComponent` (module 02) marchent à l'écran. Le lead technique de la mission te demande la seule chose qui manque avant la mise en prod : **des tests**. Deux exigences concrètes tombent en revue de code :

1. « Le badge de dépassement de budget doit s'afficher **rouge** quand le total dépasse le max. Prouve-le sans lancer l'appli à la main. »
2. « Le `SortieService.getAll()` doit appeler `GET /api/sorties` et **jamais** taper le vrai serveur pendant les tests. »

Un collègue tente une première approche naïve :

```typescript
// ❌ Tentative sans les outils Angular : on instancie le composant "à la main"
import { SortieBudgetComponent } from './sortie-budget.component';

it('affiche le badge rouge', () => {
  const cmp = new SortieBudgetComponent();  // new direct
  cmp.participants.set(100);
  // ... et maintenant ? Il n'y a pas de DOM. Pas de template rendu.
  // Les injections (inject(HttpClient)) explosent. On ne peut rien lire à l'écran.
});
```

Le problème : un composant Angular n'est **pas** une classe isolée. Il a un template compilé, un contexte d'injection de dépendances, un cycle de détection de changement. Un `new` nu n'a ni DOM, ni DI, ni change detection — on ne peut ni rendre le template ni injecter `HttpClient`.

Angular fournit exactement l'outillage manquant : **`TestBed`** reconstruit un mini-contexte Angular (DI + compilation), **`ComponentFixture`** te donne le DOM rendu et l'instance, et **`HttpTestingController`** remplace le backend réseau par un double sous ton contrôle. Ce module te donne ces trois briques.

---

## 2. Théorie complète, concise

### 2.1 Le runner : Karma/Jasmine (Angular 19) → Vitest (CLI récente)

Angular ne teste pas « tout seul » : un **runner** exécute tes fichiers `*.spec.ts`. Deux vérités à distinguer (confirmées Context7, `/angular/angular`) :

- **Angular 19** scaffolde encore **Karma + Jasmine** par défaut (`ng new` → `karma.conf.js`, syntaxe Jasmine : `describe`/`it`/`expect(...).toBe(...)`, `jasmine.createSpyObj`, `spy.and.returnValue(...)`).
- **Karma/Jasmine reste le défaut en v19** ; le **support de Vitest** est arrivé plus tard (dans une version ultérieure, ≈ v20) via le builder `@angular/build:unit-test`, qui fait de **Vitest le runner par défaut** des nouveaux projets. L'option `runner` est configurable dans `angular.json`. <!-- FLAG-CONTEXT7: version exacte d'arrivée/défaut du runner Vitest -->.

**Ce qui ne change pas** entre les deux : `TestBed`, `ComponentFixture`, `HttpTestingController` sont fournis par `@angular/core/testing` et `@angular/common/http/testing`, **identiques** quel que soit le runner. Seule la syntaxe des assertions et des spies diffère (`jasmine.createSpyObj` vs `vi.fn()`). Ce module écrit les exemples en **Jasmine** (défaut Angular 19) ; l'encadré 2.8 donne la traduction Vitest.

### 2.2 `TestBed` — le module Angular de test

`TestBed` reconstruit un `NgModule` de test : il compile les composants et met en place le contexte d'injection. On le configure avec `configureTestingModule({ imports, providers })`.

```typescript
import { TestBed } from '@angular/core/testing';

await TestBed.configureTestingModule({
  imports: [SortieBudgetComponent],   // un composant standalone s'IMPORTE (pas declarations)
}).compileComponents();
```

- Un composant **standalone** (le défaut Angular 19+) se met dans `imports`, pas dans `declarations`.
- `compileComponents()` compile les templates de façon asynchrone — d'où le `beforeEach(async () => …)`. Avec le CLI/webpack les templates sont souvent déjà compilés, mais l'appeler est l'habitude sûre.

### 2.3 `createComponent()` et `ComponentFixture`

`TestBed.createComponent(Cmp)` instancie le composant, l'ajoute au DOM du runner, et renvoie une **`ComponentFixture`** : l'enveloppe qui te donne accès à tout.

```typescript
const fixture = TestBed.createComponent(SortieBudgetComponent);
const component = fixture.componentInstance;   // l'instance de la classe TS
const el: HTMLElement = fixture.nativeElement; // l'élément DOM racine
```

| Membre de la fixture | Rôle |
|----------------------|------|
| `fixture.componentInstance` | l'instance de la classe (lire/écrire ses signals, appeler ses méthodes) |
| `fixture.nativeElement` | l'élément DOM racine (`querySelector`, `textContent`) |
| `fixture.debugElement` | wrapper de debug Angular (requêtes `By.css`) |
| `fixture.componentRef` | référence de composant — sert à `setInput()` |
| `fixture.detectChanges()` | déclenche un cycle de détection de changement |

> **Attention :** `createComponent()` **fige** la configuration du `TestBed`. Tous les `configureTestingModule` / `override…` doivent venir **avant** ce premier `createComponent`.

### 2.4 `detectChanges()` — synchroniser le DOM

Dans un test, Angular **ne** synchronise **pas** le DOM automatiquement. Tant que tu n'appelles pas `fixture.detectChanges()`, le template rendu reflète l'ancien état.

```typescript
it('affiche le total à jour', () => {
  component.participants.set(4);
  // le DOM affiche encore l'ancien total ici
  fixture.detectChanges();               // ← synchronise template ↔ état
  const p = el.querySelector('[data-testid="total"]');
  expect(p?.textContent).toContain('60');
});
```

**Règle d'or :** après chaque changement d'état (signal, input, propriété), `detectChanges()` **avant** de lire le DOM. Le premier `detectChanges()` (souvent dans le `beforeEach`) déclenche aussi le rendu initial et les `ngOnInit`.

> Alternative : le token `ComponentFixtureAutoDetect` (`{ provide: ComponentFixtureAutoDetect, useValue: true }`) active la détection automatique et évite les appels manuels. Pratique, mais garder `detectChanges()` explicite rend les tests plus lisibles au début.

### 2.5 Lire et interagir avec le DOM

```typescript
// Lire — 3 façons
const parQuery = el.querySelector('[data-testid="total"]');            // recommandé : data-testid stable
const parCss   = fixture.debugElement.query(By.css('button')).nativeElement; // idiomatique Angular
const tous     = el.querySelectorAll('.ligne');

// Cliquer — dispatch réel puis detectChanges
el.querySelector<HTMLButtonElement>('[data-testid="btn-inc"]')!.click();
fixture.detectChanges();

// Saisir dans un input — poser value PUIS dispatch 'input'
const input = el.querySelector<HTMLInputElement>('input')!;
input.value = 'Alice';
input.dispatchEvent(new Event('input'));  // sinon le binding ne voit rien
fixture.detectChanges();
```

Les sélecteurs `data-testid` sont préférés : ils ne cassent pas quand le CSS ou la structure HTML changent. Un clic natif (`.click()`) déclenche le handler `(click)` ; il faut ensuite `detectChanges()` pour propager au DOM.

### 2.6 Tester un input signal — `componentRef.setInput()`

Un composant qui déclare `input()` / `input.required()` (module 05) ne reçoit pas ses inputs par `component.monInput = …`. On passe par `fixture.componentRef.setInput('nom', valeur)` — la façon moderne (Angular 19+) qui simule un binding parent.

```typescript
// statut = input.required<'actif' | 'inactif'>();
fixture.componentRef.setInput('statut', 'inactif');
fixture.detectChanges();
expect(el.querySelector('span')?.className).toContain('badge-rouge');
```

### 2.7 Tester un service HTTP — `provideHttpClientTesting()` + `HttpTestingController`

Un test unitaire ne doit **jamais** taper le vrai réseau (lent, non déterministe). Angular fournit un **backend HTTP fictif** : `provideHttpClientTesting()` remplace le backend réel, et `HttpTestingController` te laisse intercepter et répondre à chaque requête.

```typescript
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),          // ⚠️ AVANT provideHttpClientTesting()
      provideHttpClientTesting(),   // écrase le backend par le double de test
    ],
  });
  service = TestBed.inject(SortieService);
  httpTesting = TestBed.inject(HttpTestingController);
});

afterEach(() => httpTesting.verify());   // aucune requête inattendue ne doit rester
```

Le cycle d'un test HTTP est toujours le même :

```typescript
it('GET /api/sorties', () => {
  // 1. Déclenche la requête (subscribe SINON rien ne part — Observable froid)
  service.getAll().subscribe(sorties => {
    // 4. Assertions sur la réponse livrée
    expect(sorties.length).toBe(2);
  });

  // 2. Intercepte : échoue si 0 ou >1 requête correspond
  const req = httpTesting.expectOne('/api/sorties');
  expect(req.request.method).toBe('GET');

  // 3. Répond avec des données fictives → complète l'Observable
  req.flush(mockSorties);
});
```

| Méthode | Usage |
|---------|-------|
| `expectOne(url)` | vérifie qu'**une seule** requête a été faite vers cette URL, la renvoie |
| `expectNone(url)` | vérifie qu'aucune requête n'a été faite |
| `match(predicate)` | renvoie **toutes** les requêtes qui matchent |
| `req.flush(data)` | répond en succès avec `data` |
| `req.flush('msg', { status: 404, statusText: 'Not Found' })` | répond en **erreur** HTTP |
| `httpTesting.verify()` | échoue s'il reste des requêtes non traitées (dans `afterEach`) |

**Ordre critique** (confirmé Context7) : `provideHttpClient()` **doit** précéder `provideHttpClientTesting()`, sinon le test casse.

### 2.8 Mocker une dépendance injectée — `provide` + `useValue`

Pour tester un composant **sans** son vrai service (et donc sans HTTP réel), on substitue un mock dans les `providers` :

```typescript
// Jasmine (Angular 19 par défaut)
const mockService = jasmine.createSpyObj<SortieService>('SortieService', ['getAll']);
mockService.getAll.and.returnValue(of(mockSorties));

await TestBed.configureTestingModule({
  imports: [MesSortiesComponent],
  providers: [{ provide: SortieService, useValue: mockService }],
}).compileComponents();
```

```typescript
// Vitest (CLI récente) — même TestBed, seuls le spy et l'assertion changent
const mockService = { getAll: vi.fn().mockReturnValue(of(mockSorties)) };
// ... providers: [{ provide: SortieService, useValue: mockService }]
expect(mockService.getAll).toHaveBeenCalled();
```

`{ provide: X, useValue: mock }` dit à la DI : « quand quelqu'un injecte `X`, donne `mock` ». Le composant testé n'a aucune idée qu'il ne parle pas au vrai service — c'est tout l'intérêt de l'injection de dépendances.

Pour tester une **fonction** qui utilise `inject()` hors composant (guard, interceptor fonctionnel), il faut un contexte d'injection : `TestBed.runInInjectionContext(() => monGuard(...))`.

---

## 3. Worked examples

### Exemple 1 — Tester `SortieBudgetComponent` (composant + signals + DOM)

On reprend le composant du module 02 (avec un `data-testid` ajouté sur les nœuds testés) et on prouve les deux comportements demandés en revue.

```typescript
// sortie-budget.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SortieBudgetComponent } from './sortie-budget.component';

describe('SortieBudgetComponent', () => {
  let fixture: ComponentFixture<SortieBudgetComponent>;
  let component: SortieBudgetComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    // Standalone → imports. compileComponents() car templates compilés en async.
    await TestBed.configureTestingModule({
      imports: [SortieBudgetComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SortieBudgetComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();   // rendu initial + ngOnInit
  });

  it('crée le composant', () => {
    expect(component).toBeTruthy();
  });

  it('recalcule le total quand participants change', () => {
    component.participants.set(4);   // prixParPersonne = 15 → total attendu 60
    fixture.detectChanges();         // sans ça, le DOM garde l'ancien total
    const total = el.querySelector('[data-testid="total"]');
    expect(total?.textContent).toContain('60');
  });

  it('affiche le message de dépassement quand total > budgetMax', () => {
    component.budgetMax.set(50);
    component.participants.set(4);   // total 60 > 50
    fixture.detectChanges();
    const msg = el.querySelector('[data-testid="message"]');
    expect(msg?.textContent).toContain('Budget dépassé');
  });

  it('incrémente au clic sur +1', () => {
    // interaction réelle : clic natif puis synchronisation
    el.querySelector<HTMLButtonElement>('[data-testid="btn-inc"]')!.click();
    fixture.detectChanges();
    const p = el.querySelector('[data-testid="participants"]');
    expect(p?.textContent).toContain('3');   // partait de 2
  });
});
```

Chaque test suit le rythme **arrange (état) → act (`detectChanges`/clic) → assert (DOM)**. Le `detectChanges()` est l'étape qu'on oublie le plus : sans lui, l'assertion lit l'ancien DOM et échoue de façon déroutante.

### Exemple 2 — Tester `SortieService` en isolant le réseau

```typescript
// sortie.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SortieService, Sortie, CreateSortieDto } from './sortie.service';

describe('SortieService', () => {
  let service: SortieService;
  let httpTesting: HttpTestingController;

  const mockSorties: Sortie[] = [
    { id: 's1', titre: 'Plage',   budgetTotal: 120, participants: 4 },
    { id: 's2', titre: 'Cinéma',  budgetTotal: 40,  participants: 2 },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),          // fournit HttpClient — AVANT le testing
        provideHttpClientTesting(),   // backend fictif
      ],
    });
    service = TestBed.inject(SortieService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  // Garde-fou : échoue si une requête est partie sans être traitée
  afterEach(() => httpTesting.verify());

  it('getAll() → GET /api/sorties et livre la liste', () => {
    service.getAll().subscribe(sorties => {
      expect(sorties.length).toBe(2);
      expect(sorties[0].titre).toBe('Plage');
    });

    const req = httpTesting.expectOne('/api/sorties');
    expect(req.request.method).toBe('GET');
    req.flush(mockSorties);   // complète l'Observable avec la réponse fictive
  });

  it('create() → POST avec le bon body', () => {
    const dto: CreateSortieDto = { titre: 'Musée', budgetTotal: 30, participants: 3 };

    service.create(dto).subscribe(sortie => {
      expect(sortie.id).toBe('s3');
    });

    const req = httpTesting.expectOne('/api/sorties');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);   // on vérifie ce qui est ENVOYÉ
    req.flush({ id: 's3', ...dto });
  });

  it('getAll() propage une erreur 500', () => {
    service.getAll().subscribe({
      next: () => fail('ne devrait pas réussir'),
      error: (e) => expect(e.status).toBe(500),
    });

    const req = httpTesting.expectOne('/api/sorties');
    // flush en mode erreur : 2e argument = { status, statusText }
    req.flush('Erreur serveur', { status: 500, statusText: 'Server Error' });
  });
});
```

Aucune vraie requête ne part : `provideHttpClientTesting()` a remplacé le backend. `req.flush(...)` est ce qui **débloque** le `subscribe` — sans lui, l'Observable ne complète jamais et l'assertion dans le `subscribe` ne s'exécute pas.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Oublier `detectChanges()` avant de lire le DOM

```typescript
// ❌ Le DOM reflète encore l'ancien état
component.participants.set(4);
expect(el.querySelector('[data-testid="total"]')?.textContent).toContain('60'); // ÉCHOUE

// ✅ Synchroniser d'abord
component.participants.set(4);
fixture.detectChanges();
expect(el.querySelector('[data-testid="total"]')?.textContent).toContain('60');
```

Dans un test, Angular ne fait pas tourner la change detection tout seul. Toute modification d'état → `detectChanges()` avant lecture DOM.

### PIÈGE #2 — Modifier le `TestBed` après `createComponent()`

```typescript
const fixture = TestBed.createComponent(MonComponent);
// ❌ Trop tard : createComponent a FIGÉ la config
TestBed.overrideProvider(SortieService, { useValue: mock }); // erreur

// ✅ Tout configurer AVANT le premier createComponent
TestBed.configureTestingModule({ providers: [{ provide: SortieService, useValue: mock }] });
const fixture2 = TestBed.createComponent(MonComponent);
```

`createComponent()` gèle la configuration. Providers, overrides, imports : tout se pose avant.

### PIÈGE #3 — `provideHttpClientTesting()` avant `provideHttpClient()`

```typescript
// ❌ Ordre inversé → le backend de test n'est pas branché, les tests cassent
providers: [provideHttpClientTesting(), provideHttpClient()]

// ✅ Le vrai HttpClient d'abord, le double de test ensuite (il l'écrase)
providers: [provideHttpClient(), provideHttpClientTesting()]
```

L'ordre est significatif : `provideHttpClientTesting()` remplace le backend fourni juste avant.

### PIÈGE #4 — Oublier `subscribe()` ou `flush()` sur un test HTTP

```typescript
// ❌ Pas de subscribe : HttpClient est FROID, aucune requête ne part
service.getAll();
const req = httpTesting.expectOne('/api/sorties'); // ÉCHOUE : 0 requête

// ❌ subscribe mais pas de flush : l'Observable ne complète jamais,
//    les assertions dans le subscribe ne tournent pas
service.getAll().subscribe(s => expect(s.length).toBe(2));
httpTesting.expectOne('/api/sorties'); // la requête existe... mais rien ne répond

// ✅ subscribe PUIS expectOne PUIS flush
service.getAll().subscribe(s => expect(s.length).toBe(2));
httpTesting.expectOne('/api/sorties').flush(mockSorties);
```

Un `HttpClient` Observable est **froid** : sans `subscribe`, aucune requête. Et sans `flush`, la réponse n'est jamais livrée.

### PIÈGE #5 — Assigner un input signal directement au lieu de `setInput()`

```typescript
// statut = input.required<string>();

// ❌ Un input signal est en lecture seule côté enfant — pas d'affectation
component.statut = 'actif';           // erreur de type / n'a aucun effet de binding

// ✅ Passer par componentRef.setInput (simule le binding parent)
fixture.componentRef.setInput('statut', 'actif');
fixture.detectChanges();
```

Les `input()` se pilotent par `setInput()`, pas par affectation de propriété.

### PIÈGE #6 — Construire un composant avec `new` au lieu de `TestBed`

```typescript
// ❌ Pas de DOM, pas de DI, pas de change detection
const cmp = new SortieBudgetComponent();

// ✅ TestBed reconstruit le contexte Angular complet
const fixture = TestBed.createComponent(SortieBudgetComponent);
```

Un `new` nu convient à une classe pure (un service sans dépendance), jamais à un composant qui a un template et des injections.

---

## 5. Ancrage TribuZen

Les tests sont la **couche qualité** de TribuZen : chaque composant et service front livré en mission doit avoir sa suite `*.spec.ts`, exécutée en CI avant merge.

**`sortie-budget.component.spec.ts`** (Exemple 1) — teste le premier écran interactif : recalcul du `total` (`computed`), affichage du message de dépassement, interaction `+1`. On y prouve que la logique de budget tient, sans lancer l'appli.

**`sortie.service.spec.ts`** (Exemple 2) — teste le service HTTP du module 18 : `getAll`, `create`, gestion d'erreur 500, tout en isolant le réseau avec `HttpTestingController`. Le vrai `json-server` du lab 18 n'est **pas** sollicité : les tests restent rapides et déterministes.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      sorties/
        sortie-budget.component.ts
        sortie-budget.component.spec.ts   ← Exemple 1
        sortie.service.ts
        sortie.service.spec.ts            ← Exemple 2
```

> Le mock DI par `useValue` (§2.8) sert dès qu'un composant TribuZen dépend d'un service : on teste le composant en lui injectant un faux service, sans réseau. Le test des **guards** et **interceptors** d'auth (module 25) réutilisera `TestBed.runInInjectionContext()` et `HttpTestingController` vus ici. Le state management NgRx Signal Store (module 24) se teste avec ces mêmes briques.

---

## 6. Points clés

1. `TestBed.configureTestingModule({ imports: [...] })` reconstruit le contexte DI ; un composant **standalone** s'importe (pas `declarations`).
2. `TestBed.createComponent(Cmp)` renvoie une `ComponentFixture` (`componentInstance`, `nativeElement`, `componentRef`) et **fige** la config.
3. Dans un test, le DOM ne se synchronise pas seul : appeler `fixture.detectChanges()` après chaque changement d'état, avant toute lecture DOM.
4. Un input signal se définit avec `fixture.componentRef.setInput('nom', valeur)`, pas par affectation directe.
5. Les interactions se simulent par `element.click()` / `dispatchEvent(new Event('input'))`, suivis de `detectChanges()`.
6. `provideHttpClient()` **puis** `provideHttpClientTesting()` isolent le réseau ; `HttpTestingController.expectOne(url)` + `req.flush(data)` interceptent et répondent ; `verify()` en `afterEach` garde-fou.
7. Un service HTTP Observable est froid : sans `subscribe` aucune requête, sans `flush` aucune réponse.
8. On mocke une dépendance avec `{ provide: Service, useValue: mock }` ; une fonction à `inject()` (guard/interceptor) se teste dans `TestBed.runInInjectionContext(...)`.
9. Runner : Angular 19 scaffolde **Karma/Jasmine** (défaut en v19) ; le support **Vitest** est arrivé plus tard (≈ v20) et devient le défaut des nouveaux projets. Les briques `TestBed`/`ComponentFixture`/`HttpTestingController` sont identiques ; seule la syntaxe spies/assertions change.

---

## 7. Seeds Anki

```
Pourquoi ne peut-on pas tester un composant Angular avec new MonComponent() ?|Un composant a un template compilé, un contexte DI et une change detection. Un new nu n'a ni DOM, ni injection, ni détection. Il faut TestBed.createComponent(), qui renvoie une ComponentFixture avec le contexte Angular complet.
À quoi sert fixture.detectChanges() dans un test ?|À synchroniser le DOM avec l'état du composant. Angular ne fait pas tourner la change detection automatiquement en test : après tout changement de signal/input/propriété, il faut appeler detectChanges() avant de lire le DOM.
Comment définit-on un input signal dans un test Angular 19 ?|fixture.componentRef.setInput('nomInput', valeur), puis detectChanges(). On ne fait PAS component.nomInput = valeur : un input signal est en lecture seule côté enfant.
Quels deux providers isolent le réseau dans un test de service HTTP, et dans quel ordre ?|provideHttpClient() PUIS provideHttpClientTesting(). L'ordre est critique : le testing remplace le backend fourni juste avant. Ensuite on injecte HttpTestingController.
Quel est le cycle d'un test HttpTestingController ?|1) subscribe à la méthode du service (sinon rien ne part, Observable froid) ; 2) expectOne(url) intercepte ; 3) vérifier method/body/headers ; 4) req.flush(data) répond ; 5) assertions dans le subscribe ; 6) verify() en afterEach.
Comment simuler une réponse d'erreur 500 avec HttpTestingController ?|req.flush('message', { status: 500, statusText: 'Server Error' }). Le 2e argument transforme le flush en réponse d'erreur, ce qui déclenche le callback error du subscribe.
Comment mocker un service injecté dans un test de composant ?|Dans les providers : { provide: MonService, useValue: mock }. La DI renvoie le mock à quiconque injecte MonService. Le composant ignore qu'il ne parle pas au vrai service.
Quel est le runner de test par défaut d'Angular 19, et vers quoi la CLI évolue-t-elle ?|Angular 19 scaffolde Karma + Jasmine (défaut en v19). Le support Vitest (builder @angular/build:unit-test) est arrivé plus tard (≈ v20) et devient le runner par défaut des nouveaux projets. TestBed/ComponentFixture/HttpTestingController restent identiques ; seule la syntaxe spies/assertions change.
Pourquoi createComponent() ne doit-il pas être appelé avant les overrides du TestBed ?|createComponent() fige la configuration du TestBed. Tout configureTestingModule / overrideProvider / override de composant doit venir avant le premier createComponent, sinon l'override est refusé.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-23-tests-composants-http-di/README.md`. Écrire de vrais fichiers `*.spec.ts` (Jasmine/Karma, `ng test`) pour `SortieBudgetComponent` et `SortieService` — TestBed + HttpTestingController réels, corrigé commenté, feedback coach, zéro harnais maison.
