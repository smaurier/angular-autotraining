# Cours 37 — Tester les services HTTP et la DI

> **Prérequis** : les concepts de mocking et d'isolation sont couverts dans le **[Testing Course](https://github.com/smaurier/testing-course)** (module 04). Ici on se concentre sur `HttpTestingController` et le mocking de la DI Angular.

> **Objectif** : Maîtriser le test des appels HTTP avec `provideHttpClientTesting()` et `HttpTestingController`, mocker des services avec `provide` + `useValue`, et tester les interceptors, guards et resolvers. Comprendre le pattern : test service -> mock HTTP -> assert comportement.

---

## Rappel du cours précédent

<details>
<summary>1. Comment créer une fixture de test pour un composant standalone ?</summary>

```typescript
await TestBed.configureTestingModule({
  imports: [MonComposant],
}).compileComponents();
const fixture = TestBed.createComponent(MonComposant);
```
</details>

<details>
<summary>2. Pourquoi faut-il appeler `fixture.detectChanges()` après avoir modifie un signal ?</summary>

Angular ne synchronise pas automatiquement le DOM dans les tests. `detectChanges()` declenche la detection de changements pour que le template reflete les nouvelles valeurs.
</details>

<details>
<summary>3. Quelle est la façon moderne de définir un input signal dans un test ?</summary>

`fixture.componentRef.setInput('nomInput', valeur)` — c'est l'équivalent de passer une prop dans le template.
</details>

---

## Analogie

En Vue 3 avec Vitest, pour tester un appel HTTP vous utilisez `vi.mock('axios')` ou `msw` (Mock Service Worker) pour intercepter les requêtes.

Angular à un système intégré : `HttpTestingController`. C'est un intercepteur de test qui capture toutes les requêtes HTTP faites par `HttpClient` et vous permet de les résoudre manuellement avec des donnees fictives.

| Vue 3 / Vitest | Angular / Jest |
|----------------|---------------|
| `vi.mock('axios')` | `provideHttpClientTesting()` |
| `msw` server handlers | `HttpTestingController.expectOne()` |
| `server.use(rest.get(...))` | `req.flush(donnees)` |
| Vérification manuelle | `httpController.verify()` |

---

## Théorie

### Setup : provideHttpClientTesting

```typescript
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

describe('UtilisateurService', () => {
  let service: UtilisateurService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),           // Fournit HttpClient
        provideHttpClientTesting(),    // Remplace le backend par un mock
      ],
    });

    service = TestBed.inject(UtilisateurService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verifie qu'aucune requete inattendue n'est en attente
    httpController.verify();
  });
});
```

> **Important** : Toujours appeler `httpController.verify()` dans `afterEach()` pour détecter les requêtes non gerees.

### Pattern complet : expectOne + flush

```typescript
// utilisateur.service.ts
@Injectable({ providedIn: 'root' })
export class UtilisateurService {
  private http = inject(HttpClient);
  private apiUrl = '/api/utilisateurs';

  getAll(): Observable<Utilisateur[]> {
    return this.http.get<Utilisateur[]>(this.apiUrl);
  }

  getById(id: number): Observable<Utilisateur> {
    return this.http.get<Utilisateur>(`${this.apiUrl}/${id}`);
  }

  creer(data: Partial<Utilisateur>): Observable<Utilisateur> {
    return this.http.post<Utilisateur>(this.apiUrl, data);
  }

  supprimer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
```

```typescript
// utilisateur.service.spec.ts
describe('UtilisateurService', () => {
  let service: UtilisateurService;
  let httpController: HttpTestingController;

  const mockUsers: Utilisateur[] = [
    { id: 1, nom: 'Alice', email: 'alice@esn.fr' },
    { id: 2, nom: 'Bob', email: 'bob@esn.fr' },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UtilisateurService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpController.verify());

  it('devrait recuperer tous les utilisateurs (GET)', () => {
    // 1. Lancer la requete
    service.getAll().subscribe(users => {
      // 3. Verifier les donnees recues
      expect(users.length).toBe(2);
      expect(users[0].nom).toBe('Alice');
    });

    // 2. Intercepter et repondre
    const req = httpController.expectOne('/api/utilisateurs');
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);  // Envoyer la reponse fictive
  });

  it('devrait recuperer un utilisateur par id (GET)', () => {
    service.getById(1).subscribe(user => {
      expect(user.nom).toBe('Alice');
    });

    const req = httpController.expectOne('/api/utilisateurs/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers[0]);
  });

  it('devrait creer un utilisateur (POST)', () => {
    const nouveau = { nom: 'Claire', email: 'claire@esn.fr' };

    service.creer(nouveau).subscribe(user => {
      expect(user.id).toBe(3);
    });

    const req = httpController.expectOne('/api/utilisateurs');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nouveau);
    req.flush({ id: 3, ...nouveau });
  });

  it('devrait supprimer un utilisateur (DELETE)', () => {
    service.supprimer(1).subscribe();

    const req = httpController.expectOne('/api/utilisateurs/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('devrait gerer une erreur 404', () => {
    service.getById(999).subscribe({
      next: () => fail('devrait echouer'),
      error: (err) => {
        expect(err.status).toBe(404);
      },
    });

    const req = httpController.expectOne('/api/utilisateurs/999');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });
});
```

### Méthodes de HttpTestingController

| Méthode | Usage |
|---------|-------|
| `expectOne(url)` | Verifie qu'une seule requête a ete faite vers cette URL |
| `expectNone(url)` | Verifie qu'aucune requête n'a ete faite |
| `match(predicate)` | Retourne toutes les requêtes qui matchent |
| `verify()` | Verifie qu'il ne reste aucune requête en attente |
| `req.flush(data)` | Repond à la requête avec des donnees |
| `req.flush(msg, { status, statusText })` | Repond avec une erreur HTTP |

### Mocker un service avec provide + useValue

Quand un composant depend d'un service, on le remplace par un mock :

```typescript
// ❌ Sans mock — le composant utilise le vrai service (et le vrai HTTP)
await TestBed.configureTestingModule({
  imports: [ListeComponent],
}).compileComponents();

// ✅ Avec mock — on controle les donnees retournees
const mockService = {
  getAll: jest.fn().mockReturnValue(of(mockUsers)),
  supprimer: jest.fn().mockReturnValue(of(void 0)),
};

await TestBed.configureTestingModule({
  imports: [ListeComponent],
  providers: [
    { provide: UtilisateurService, useValue: mockService },
  ],
}).compileComponents();
```

```typescript
it('devrait afficher la liste des utilisateurs', () => {
  fixture.detectChanges();
  const items = el.querySelectorAll('[data-testid="user-item"]');
  expect(items.length).toBe(2);
  expect(mockService.getAll).toHaveBeenCalled();
});

it('devrait appeler supprimer au clic sur le bouton', () => {
  fixture.detectChanges();
  el.querySelector<HTMLButtonElement>('[data-testid="btn-delete-1"]')!.click();
  expect(mockService.supprimer).toHaveBeenCalledWith(1);
});
```

### Tester un interceptor fonctionnel

```typescript
// auth.interceptor.ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (token) {
    const reqClone = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(reqClone);
  }
  return next(req);
};
```

```typescript
// auth.interceptor.spec.ts
describe('authInterceptor', () => {
  let httpController: HttpTestingController;
  let httpClient: HttpClient;

  const mockAuthService = {
    getToken: jest.fn(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpController.verify());

  it('devrait ajouter le header Authorization si un token existe', () => {
    mockAuthService.getToken.mockReturnValue('mon-token-jwt');

    httpClient.get('/api/data').subscribe();

    const req = httpController.expectOne('/api/data');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mon-token-jwt');
    req.flush({});
  });

  it('ne devrait pas ajouter de header si pas de token', () => {
    mockAuthService.getToken.mockReturnValue(null);

    httpClient.get('/api/data').subscribe();

    const req = httpController.expectOne('/api/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
```

### Tester un guard

```typescript
// auth.guard.ts
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estConnecte()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
```

```typescript
// auth.guard.spec.ts
describe('authGuard', () => {
  const mockAuthService = { estConnecte: jest.fn() };
  const mockRouter = { createUrlTree: jest.fn() };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('devrait autoriser si connecte', () => {
    mockAuthService.estConnecte.mockReturnValue(true);

    const resultat = TestBed.runInInjectionContext(() =>
      authGuard({} as any, {} as any)
    );

    expect(resultat).toBe(true);
  });

  it('devrait rediriger vers /login si non connecte', () => {
    mockAuthService.estConnecte.mockReturnValue(false);
    mockRouter.createUrlTree.mockReturnValue('url-tree-mock');

    const resultat = TestBed.runInInjectionContext(() =>
      authGuard({} as any, {} as any)
    );

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
```

> **Point clé** : `TestBed.runInInjectionContext()` permet d'exécuter une fonction qui utilise `inject()` dans un contexte de test.

### Pattern résumé : test service HTTP

```
1. configureTestingModule avec provideHttpClient() + provideHttpClientTesting()
2. inject(MonService) + inject(HttpTestingController)
3. Appeler la methode du service (.subscribe)
4. httpController.expectOne(url) — verifier method, headers, body
5. req.flush(donneesFictives) — repondre
6. Assertions dans le subscribe
7. afterEach(() => httpController.verify())
```

---

## Pratique

Testez un `ProjetService` qui a trois méthodes : `getAll()`, `getById(id)` et `creer(data)`. Ecrivez les tests HTTP complets avec gestion d'erreur pour `getById`.

**Consignes** :
1. Utilisez `provideHttpClientTesting()`
2. Testez chaque méthode (GET list, GET single, POST)
3. Testez le cas d'erreur 500 pour `getById`
4. N'oubliez pas `httpController.verify()` dans `afterEach`

<details>
<summary>Solution</summary>

```typescript
// projet.service.ts
@Injectable({ providedIn: 'root' })
export class ProjetService {
  private http = inject(HttpClient);

  getAll(): Observable<Projet[]> {
    return this.http.get<Projet[]>('/api/projets');
  }

  getById(id: number): Observable<Projet> {
    return this.http.get<Projet>(`/api/projets/${id}`);
  }

  creer(data: { nom: string; client: string }): Observable<Projet> {
    return this.http.post<Projet>('/api/projets', data);
  }
}
```

```typescript
// projet.service.spec.ts
describe('ProjetService', () => {
  let service: ProjetService;
  let httpController: HttpTestingController;

  const mockProjets: Projet[] = [
    { id: 1, nom: 'Refonte CRM', client: 'Acme Corp' },
    { id: 2, nom: 'App Mobile', client: 'StartupX' },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProjetService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpController.verify());

  it('devrait recuperer tous les projets', () => {
    service.getAll().subscribe(projets => {
      expect(projets.length).toBe(2);
      expect(projets[0].client).toBe('Acme Corp');
    });

    const req = httpController.expectOne('/api/projets');
    expect(req.request.method).toBe('GET');
    req.flush(mockProjets);
  });

  it('devrait recuperer un projet par id', () => {
    service.getById(1).subscribe(projet => {
      expect(projet.nom).toBe('Refonte CRM');
    });

    const req = httpController.expectOne('/api/projets/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockProjets[0]);
  });

  it('devrait gerer une erreur 500 sur getById', () => {
    service.getById(1).subscribe({
      next: () => fail('devrait echouer'),
      error: (err) => expect(err.status).toBe(500),
    });

    const req = httpController.expectOne('/api/projets/1');
    req.flush('Erreur serveur', { status: 500, statusText: 'Server Error' });
  });

  it('devrait creer un projet', () => {
    const nouveau = { nom: 'Migration Cloud', client: 'BigCorp' };

    service.creer(nouveau).subscribe(projet => {
      expect(projet.id).toBe(3);
    });

    const req = httpController.expectOne('/api/projets');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nouveau);
    req.flush({ id: 3, ...nouveau });
  });
});
```
</details>

---

## Résumé

| Point clé | A retenir |
|-----------|-----------|
| Setup HTTP | `provideHttpClient()` + `provideHttpClientTesting()` |
| Intercepter | `httpController.expectOne(url)` |
| Repondre | `req.flush(data)` ou `req.flush(msg, { status })` |
| Vérifier | `httpController.verify()` dans `afterEach` |
| Mock service | `{ provide: Service, useValue: mockObj }` |
| Interceptors | Tester avec `withInterceptors([...])` dans le provider |
| Guards | `TestBed.runInInjectionContext(() => guard(...))` |

---

> **Prochain cours** : [Module 10 — State Management](../10-state-management/01-etat-local-signals.md)

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Exercice** : [20-tests-complets](../../exercices/20-tests-complets/ENONCE)
:::
