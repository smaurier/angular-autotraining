# Cours 35 — Tests unitaires : Jest, TestBed, premiers tests

> **Objectif** : Comprendre l'outillage de test Angular (Jest / Karma+Jasmine), configurer TestBed pour les tests de services et de pipes, et maitriser les patterns `describe`/`it`/`expect`/`beforeEach`. Comprendre pourquoi les tests sont essentiels en ESN (quality gates, CI/CD).

---

## Rappel du cours precedent

<details>
<summary>1. Quelle est la difference entre le CDK et Angular Material ?</summary>

Le CDK fournit des **comportements** sans style (drag & drop, virtual scroll, overlay). Angular Material utilise le CDK en ajoutant un **habillage visuel** Material Design par-dessus.
</details>

<details>
<summary>2. Quelle directive permet de rendre une liste de 10 000 elements performante ?</summary>

`cdk-virtual-scroll-viewport` avec `*cdkVirtualFor` : seuls les elements visibles sont rendus dans le DOM.
</details>

<details>
<summary>3. Quelles fonctions utilitaires utilise-t-on avec le CDK Drag & Drop ?</summary>

`moveItemInArray()` pour reordonner dans une meme liste, `transferArrayItem()` pour deplacer un element entre deux listes.
</details>

---

## Analogie

En Vue 3, vous testez avec **Vitest** (ou Jest) + **Vue Test Utils**. Vous montez un composant avec `mount()` ou `shallowMount()`, vous interrogez le DOM, vous verifiez le comportement.

Angular a son propre equivalent : **TestBed**. C'est l'utilitaire qui cree un mini-module de test, instancie les composants et injecte les dependances. Le reste (assertions, mocks, structure des tests) est identique.

| Vue 3 / Vitest | Angular / Jest |
|----------------|---------------|
| `describe()`, `it()`, `expect()` | Identique |
| `mount(MonComposant)` | `TestBed.createComponent(MonComposant)` |
| `vi.fn()` | `jest.fn()` |
| `wrapper.find('.btn')` | `fixture.nativeElement.querySelector('.btn')` |
| `vitest.config.ts` | `jest.config.ts` ou config Karma |

---

## Theorie

### Setup : Jest ou Karma+Jasmine ?

Angular propose deux ecosystemes de test :

| | Karma + Jasmine | Jest |
|-|----------------|------|
| **Status** | Historique (defaut avant Angular 16) | Recommande depuis Angular 16+ |
| **Vitesse** | Lent (lance un navigateur) | Rapide (Node.js, pas de navigateur) |
| **Configuration** | `karma.conf.js` + `angular.json` | `jest.config.ts` |
| **Usage ESN** | Projets legacy | Nouveaux projets |

> **En Angular 19+**, la CLI supporte nativement Jest avec l'option experimentale. En ESN, la tendance est clairement vers Jest.

```bash
# Creer un projet avec Jest (experimental)
ng new mon-projet --experimental-jest

# Ou migrer un projet existant
npm install --save-dev jest @angular-builders/jest
```

### Structure d'un test : describe, it, expect

```typescript
// calculatrice.spec.ts
describe('Calculatrice', () => {
  // Avant chaque test
  beforeEach(() => {
    // setup commun
  });

  it('devrait additionner deux nombres', () => {
    expect(2 + 3).toBe(5);
  });

  it('devrait multiplier deux nombres', () => {
    expect(4 * 5).toBe(20);
  });

  it('ne devrait pas diviser par zero', () => {
    expect(() => diviser(10, 0)).toThrow();
  });
});
```

| Fonction | Role |
|----------|------|
| `describe()` | Groupe de tests (suite) |
| `it()` | Un test individuel (spec) |
| `expect()` | Assertion |
| `beforeEach()` | Code execute avant chaque `it()` |
| `afterEach()` | Code execute apres chaque `it()` |
| `beforeAll()` | Code execute une fois avant tous les tests |

### Matchers courants

```typescript
expect(valeur).toBe(5);                    // Egalite stricte (===)
expect(valeur).toEqual({ a: 1 });          // Egalite profonde (objets)
expect(valeur).toBeTruthy();               // Truthy
expect(valeur).toBeFalsy();                // Falsy
expect(valeur).toContain('texte');         // Contient (string/array)
expect(valeur).toBeGreaterThan(3);         // Superieur a
expect(valeur).toHaveBeenCalled();         // Spy a ete appele
expect(valeur).toHaveBeenCalledWith('x');  // Appele avec cet argument
expect(() => fn()).toThrow();              // Lance une erreur
```

### Tester un service avec TestBed

```typescript
// utilisateur.service.ts
@Injectable({ providedIn: 'root' })
export class UtilisateurService {
  private http = inject(HttpClient);

  getUtilisateurs(): Observable<Utilisateur[]> {
    return this.http.get<Utilisateur[]>('/api/utilisateurs');
  }

  getNomComplet(prenom: string, nom: string): string {
    return `${prenom} ${nom}`.trim();
  }
}
```

```typescript
// utilisateur.service.spec.ts
describe('UtilisateurService', () => {
  let service: UtilisateurService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(UtilisateurService);
  });

  it('devrait etre cree', () => {
    expect(service).toBeTruthy();
  });

  it('devrait concatener prenom et nom', () => {
    const resultat = service.getNomComplet('Alice', 'Dupont');
    expect(resultat).toBe('Alice Dupont');
  });

  it('devrait gerer un prenom vide', () => {
    const resultat = service.getNomComplet('', 'Dupont');
    expect(resultat).toBe('Dupont');
  });
});
```

### Tester un pipe

Les pipes sont les plus simples a tester car ce sont des fonctions pures :

```typescript
// tronquer.pipe.ts
@Pipe({ name: 'tronquer' })
export class TronquerPipe implements PipeTransform {
  transform(valeur: string, longueur: number = 50): string {
    if (!valeur) return '';
    return valeur.length > longueur
      ? valeur.substring(0, longueur) + '...'
      : valeur;
  }
}
```

```typescript
// tronquer.pipe.spec.ts
describe('TronquerPipe', () => {
  let pipe: TronquerPipe;

  beforeEach(() => {
    pipe = new TronquerPipe();  // Pas besoin de TestBed pour un pipe !
  });

  it('devrait retourner le texte complet si court', () => {
    expect(pipe.transform('Bonjour', 50)).toBe('Bonjour');
  });

  it('devrait tronquer un texte long', () => {
    const texte = 'a'.repeat(60);
    const resultat = pipe.transform(texte, 50);
    expect(resultat).toBe('a'.repeat(50) + '...');
    expect(resultat.length).toBe(53);
  });

  it('devrait gerer une chaine vide', () => {
    expect(pipe.transform('', 50)).toBe('');
  });

  it('devrait utiliser la longueur par defaut', () => {
    const texte = 'a'.repeat(100);
    expect(pipe.transform(texte)).toBe('a'.repeat(50) + '...');
  });
});
```

### Tester des fonctions pures

```typescript
// utils/validation.ts
export function estEmailValide(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function formaterMontant(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
  }).format(montant);
}
```

```typescript
// utils/validation.spec.ts
describe('estEmailValide', () => {
  it('devrait accepter un email valide', () => {
    expect(estEmailValide('alice@esn.fr')).toBe(true);
  });

  it('devrait rejeter un email sans @', () => {
    expect(estEmailValide('alice-esn.fr')).toBe(false);
  });

  it('devrait rejeter une chaine vide', () => {
    expect(estEmailValide('')).toBe(false);
  });
});

describe('formaterMontant', () => {
  it('devrait formater en euros', () => {
    expect(formaterMontant(1234.5)).toContain('1');
    expect(formaterMontant(1234.5)).toContain('EUR');
  });
});
```

### Mocking avec jest.fn()

```typescript
// ❌ Sans mock — le test depend du vrai service HTTP
it('appelle le vrai serveur', () => {
  service.getUtilisateurs(); // Requete reseau reelle !
});

// ✅ Avec mock — on controle le comportement
it('devrait appeler le bon endpoint', () => {
  const httpSpy = jest.fn().mockReturnValue(of([]));
  const service = new UtilisateurService(
    { get: httpSpy } as any  // Mock partiel de HttpClient
  );

  service.getUtilisateurs().subscribe(data => {
    expect(data).toEqual([]);
  });

  expect(httpSpy).toHaveBeenCalledWith('/api/utilisateurs');
});
```

> **Regle** : ne jamais faire de vraies requetes reseau dans un test unitaire. Toujours mocker.

### Pourquoi tester en ESN ?

```
1. Quality gates CI/CD    → Les merge requests sont bloquees si les tests echouent
2. Non-regression         → Chaque bug fixe a son test pour ne jamais revenir
3. Documentation vivante  → Les tests expliquent le comportement attendu
4. Confiance refactoring  → Modifier du code sans peur de casser
5. Exigence client        → Beaucoup de clients ESN exigent un coverage > 80%
```

> **En entretien technique**, la question "Comment testez-vous votre code ?" revient systematiquement. Savoir parler de tests est un avantage competitif.

---

## Pratique

Creez un service `PanierService` avec un signal contenant une liste d'articles. Implementez `ajouter(article)`, `supprimer(id)` et `total()` (computed). Ecrivez les tests unitaires correspondants.

**Consignes** :
1. Le service utilise des signals (pas de BehaviorSubject)
2. Testez `ajouter`, `supprimer` et `total` avec au moins 2 cas chacun
3. Pas besoin de HTTP — c'est un service de state local

<details>
<summary>Solution</summary>

```typescript
// panier.service.ts
export interface Article {
  id: number;
  nom: string;
  prix: number;
}

@Injectable({ providedIn: 'root' })
export class PanierService {
  readonly articles = signal<Article[]>([]);
  readonly total = computed(() =>
    this.articles().reduce((sum, a) => sum + a.prix, 0)
  );

  ajouter(article: Article): void {
    this.articles.update(list => [...list, article]);
  }

  supprimer(id: number): void {
    this.articles.update(list => list.filter(a => a.id !== id));
  }
}
```

```typescript
// panier.service.spec.ts
describe('PanierService', () => {
  let service: PanierService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PanierService);
  });

  describe('ajouter', () => {
    it('devrait ajouter un article au panier', () => {
      service.ajouter({ id: 1, nom: 'Clavier', prix: 89 });
      expect(service.articles().length).toBe(1);
      expect(service.articles()[0].nom).toBe('Clavier');
    });

    it('devrait ajouter plusieurs articles', () => {
      service.ajouter({ id: 1, nom: 'Clavier', prix: 89 });
      service.ajouter({ id: 2, nom: 'Souris', prix: 45 });
      expect(service.articles().length).toBe(2);
    });
  });

  describe('supprimer', () => {
    it('devrait supprimer un article par id', () => {
      service.ajouter({ id: 1, nom: 'Clavier', prix: 89 });
      service.ajouter({ id: 2, nom: 'Souris', prix: 45 });
      service.supprimer(1);
      expect(service.articles().length).toBe(1);
      expect(service.articles()[0].id).toBe(2);
    });

    it('ne devrait rien faire si id inexistant', () => {
      service.ajouter({ id: 1, nom: 'Clavier', prix: 89 });
      service.supprimer(999);
      expect(service.articles().length).toBe(1);
    });
  });

  describe('total', () => {
    it('devrait calculer le total a 0 si panier vide', () => {
      expect(service.total()).toBe(0);
    });

    it('devrait calculer le total de tous les articles', () => {
      service.ajouter({ id: 1, nom: 'Clavier', prix: 89 });
      service.ajouter({ id: 2, nom: 'Souris', prix: 45 });
      expect(service.total()).toBe(134);
    });
  });
});
```
</details>

---

## Resume

| Point cle | A retenir |
|-----------|-----------|
| Framework de test | Jest (recommande) ou Karma+Jasmine (legacy) |
| Structure | `describe` > `it` > `expect` + `beforeEach` pour le setup |
| TestBed | Mini-module de test pour instancier services/composants |
| Pipes | Tester directement avec `new MonPipe()` sans TestBed |
| Mocking | `jest.fn()` pour simuler les dependances |
| ESN | Tests = quality gate obligatoire, coverage > 80% souvent exige |

---

> **Prochain cours** : [Cours 36 — Tester les composants : fixture, DOM, interactions](./02-tests-composants.md)
