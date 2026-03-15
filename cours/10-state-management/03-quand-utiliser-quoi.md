# Cours 41 — Quand utiliser quoi : matrice de decision state management

> **Objectif** : Savoir choisir entre Service+Signals, NgRx SignalStore et NgRx Store classique selon le contexte du projet. Construire une réponse argumentee pour l'entretien technique : "Quel state management choisir en Angular ?"

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre `withState()` et `withEntities()` dans NgRx SignalStore ?</summary>

`withState()` définit un état libre (objet quelconque). `withEntities<T>()` ajoute automatiquement une collection d'entites avec `entities()`, `ids()`, `entityMap()` et des fonctions CRUD (`addEntity`, `removeEntity`, etc.).
</details>

<details>
<summary>2. Comment mettre a jour partiellement l'état dans un SignalStore ?</summary>

Avec `patchState(store, { propriete: nouvelleValeur })`. Seules les propriétés specifiees sont modifiees, le reste est conserve.
</details>

<details>
<summary>3. Quel est l'avantage principal de NgRx SignalStore par rapport à un service + signals ?</summary>

Il impose une structure conventionnelle (`withState`, `withComputed`, `withMethods`) qui garantit que toute l'équipe code de la même façon. Il offre aussi des plugins comme `withEntities()` et la compatibilite DevTools.
</details>

---

## Analogie

Choisir un state management, c'est comme choisir un vehicule pour un trajet :

- **Service + Signals** = **velo** : leger, rapide a mettre en place, parfait pour les trajets courts a moyens. 80% de vos deplacements quotidiens.
- **NgRx SignalStore** = **voiture** : plus structure, plus de fonctionnalites, nécessaire quand le trajet est plus long ou qu'on est plusieurs passagers.
- **NgRx Store classique** = **camion** : puissant, lourd, nécessaire pour les très grosses charges. Surdimensionne pour un trajet de 5 km.

En Vue 3, c'est le même raisonnement :
| Angular | Vue 3 | Complexite |
|---------|-------|-----------|
| Service + Signals | Composables + `ref()` | Faible |
| NgRx SignalStore | Pinia (setup store) | Moyenne |
| NgRx Store classique | Vuex (legacy) | Elevee |

---

## Théorie

### Les trois approches en Angular 19+

#### 1. Service + Signals (le "velo")

```typescript
@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly _tasks = signal<Task[]>([]);
  readonly tasks = this._tasks.asReadonly();
  readonly nbTasks = computed(() => this._tasks().length);

  ajouter(task: Task): void {
    this._tasks.update(list => [...list, task]);
  }
}
```

**Forces** :
- Zero dépendance supplementaire
- Pas de courbe d'apprentissage
- Très flexible
- Facile à tester

**Faiblesses** :
- Pas de convention imposee (chaque dev fait differemment)
- Pas de devtools
- Pas de plugins/middleware

#### 2. NgRx SignalStore (la "voiture")

```typescript
export const TaskStore = signalStore(
  { providedIn: 'root' },
  withEntities<Task>(),
  withComputed((store) => ({
    nbTasks: computed(() => store.entities().length),
  })),
  withMethods((store) => ({
    ajouter(task: Task): void {
      patchState(store, addEntity(task));
    },
  })),
);
```

**Forces** :
- Structure imposee (conventions d'équipe)
- Plugins (`withEntities`, custom features)
- Compatible DevTools NgRx
- Base sur les signals (moderne)

**Faiblesses** :
- Dependance `@ngrx/signals`
- Courbe d'apprentissage moderee
- Overhead pour les petits projets

#### 3. NgRx Store classique (le "camion")

```typescript
// actions.ts
export const addTask = createAction('[Tasks] Add', props<{ task: Task }>());

// reducer.ts
export const taskReducer = createReducer(
  initialState,
  on(addTask, (state, { task }) => ({
    ...state,
    tasks: [...state.tasks, task],
  })),
);

// selectors.ts
export const selectTasks = createSelector(selectTaskState, state => state.tasks);

// effects.ts
loadTasks$ = createEffect(() => this.actions$.pipe(
  ofType(loadTasks),
  switchMap(() => this.http.get<Task[]>('/api/tasks').pipe(
    map(tasks => loadTasksSuccess({ tasks })),
    catchError(err => of(loadTasksFailure({ error: err }))),
  )),
));
```

**Forces** :
- Très structure (actions, reducers, selectors, effects)
- DevTools puissants (time-travel debugging)
- Très repandu dans les grands projets Angular
- Middleware/Effects pour les side effects

**Faiblesses** :
- Enorme boilerplate (fichiers multiples par feature)
- Courbe d'apprentissage elevee
- Base sur RxJS (pas les signals)
- Surdimensionne pour 80% des projets

### Matrice de decision

| Critere | Service + Signals | NgRx SignalStore | NgRx Store |
|---------|:-----------------:|:----------------:|:----------:|
| Taille d'équipe | 1-5 | 3-15 | 10+ |
| Complexite de l'état | Faible-moyenne | Moyenne-elevee | Elevee |
| Nombre de stores | 1-3 | 3-10 | 5+ |
| Besoin de devtools | Non | Optionnel | Oui |
| Boilerplate | Minimal | Modere | Eleve |
| Courbe d'apprentissage | Nulle | 2-3 jours | 1-2 semaines |
| Time-travel debug | Non | Non | Oui |
| Middleware/Effects | Non | Custom features | Oui (Effects) |
| Projet ESN typique | 70% des cas | 20% des cas | 10% des cas |

### Arbre de decision

```
Votre application a-t-elle un etat partage complexe ?
│
├── NON → Service + Signals ✅
│         (la plupart des cas : CRUD, formulaires, dashboards)
│
└── OUI → L'equipe compte plus de 5 developpeurs Angular ?
          │
          ├── NON → Service + Signals ✅
          │         (meme avec de l'etat complexe, c'est genable)
          │
          └── OUI → Le projet utilise-t-il deja NgRx Store classique ?
                    │
                    ├── OUI → Continuer avec NgRx Store ✅
                    │         (migrer coute plus cher que maintenir)
                    │
                    └── NON → NgRx SignalStore ✅
                              (conventions + plugins + moderne)
```

### Pattern : commencer simple, migrer si nécessaire

```typescript
// Etape 1 : Service + Signals (jour 1)
@Injectable({ providedIn: 'root' })
export class ProjetStore {
  private readonly _projets = signal<Projet[]>([]);
  readonly projets = this._projets.asReadonly();

  charger(): void { /* ... */ }
  ajouter(p: Projet): void { /* ... */ }
}

// Etape 2 : Si le besoin grandit, migrer vers SignalStore
// L'API est tres similaire — la migration est rapide

export const ProjetStore = signalStore(
  { providedIn: 'root' },
  withEntities<Projet>(),
  withMethods((store) => ({
    charger(): void { /* ... */ },
    ajouter(p: Projet): void { patchState(store, addEntity(p)); },
  })),
);

// Les composants qui utilisent inject(ProjetStore) changent a peine :
// store.projets() → store.entities()
// Le reste (store.ajouter, store.charger) reste identique
```

> **Regle ESN** : Commencez toujours avec l'approche la plus simple. Migrez uniquement si vous rencontrez un vrai problème (pas un problème hypothetique).

### Cas concrets en ESN

| Projet ESN | Approche recommandee | Justification |
|------------|---------------------|---------------|
| Dashboard client (2 devs) | Service + Signals | Simple, rapide, suffisant |
| App interne RH (5 devs) | Service + Signals | État moderement complexe |
| Portail bancaire (12 devs) | NgRx SignalStore | Grande équipe, conventions nécessaires |
| Legacy Angular 8 migre | NgRx Store classique | Déjà en place, ne pas migrer |
| POC / prototype | Service + Signals | Vitesse de développement maximale |
| E-commerce complexe (8 devs) | NgRx SignalStore | Panier, catalogue, auth, multi-store |

### Question d'entretien : "Quel state management choisir ?"

Voici un template de réponse structuree :

```
1. "Ca depend du contexte du projet." (ne jamais repondre une solution unique)

2. "Pour la majorite des projets, un service injectable avec des signals
   suffit largement. C'est l'approche la plus simple, la plus testable,
   et elle ne necessite aucune dependance."

3. "Si l'equipe est grande (> 5 devs) et qu'on a besoin de conventions
   strictes, je recommande NgRx SignalStore. Il impose une structure
   (withState, withComputed, withMethods) tout en restant base sur
   les signals modernes d'Angular."

4. "NgRx Store classique reste pertinent pour les projets legacy qui
   l'utilisent deja, mais je ne le choisirais pas pour un nouveau
   projet en 2025+."

5. "Mon approche : commencer simple (service + signals), et migrer
   vers SignalStore si le besoin se fait sentir."
```

> Cette réponse montre que vous connaissez les trois approches, que vous savez les comparer, et que vous privilegiez la simplicite.

### Comparaison du code pour la même fonctionnalite

Ajout d'une tache dans les trois approches :

```typescript
// 1. Service + Signals — 3 lignes
ajouter(task: Task): void {
  this._tasks.update(list => [...list, task]);
}

// 2. NgRx SignalStore — 3 lignes (dans withMethods)
ajouter(task: Task): void {
  patchState(store, addEntity(task));
}

// 3. NgRx Store classique — 15+ lignes reparties dans 3 fichiers
// actions.ts
export const addTask = createAction('[Tasks] Add', props<{ task: Task }>());
// reducer.ts
on(addTask, (state, { task }) => ({ ...state, tasks: [...state.tasks, task] }))
// component.ts
this.store.dispatch(addTask({ task }));
```

### Anti-patterns a éviter

```typescript
// ❌ Utiliser NgRx Store classique "parce que c'est ce qu'on fait en Angular"
// → Le boilerplate ralentit les petites equipes sans apporter de valeur

// ❌ Creer un store pour un etat purement local
// → Si l'etat n'est utilise que dans un composant, un signal local suffit

// ❌ Mettre TOUT l'etat dans un seul store global
// → Decoupez en stores par domaine (TaskStore, UserStore, PanierStore)

// ❌ Migrer un projet legacy NgRx Store vers SignalStore "pour moderniser"
// → Le cout de migration depasse rarement le benefice

// ✅ Un store par domaine metier
// ✅ Commencer simple, complexifier si necessaire
// ✅ L'etat local reste local (signal dans le composant)
```

### Résumé des stores par domaine

```
app/
├── stores/
│   ├── auth.store.ts        → Service + Signals (simple)
│   ├── task.store.ts        → NgRx SignalStore (si equipe > 5)
│   └── notification.store.ts → Service + Signals (simple)
├── components/
│   └── compteur.component.ts → signal() local (pas de store)
```

---

## Pratique

Vous etes en entretien technique. On vous présenté trois scenarios de projet et on vous demandé de justifier votre choix de state management pour chacun.

**Scenario A** : Une app de gestion de taches interne, 2 développeurs, 3 mois de développement.

**Scenario B** : Un portail client pour une banque, 10 développeurs, état complexe (comptes, transactions, notifications temps réel).

**Scenario C** : Migration d'une app Angular 10 avec NgRx Store classique vers Angular 19.

<details>
<summary>Solution</summary>

**Scenario A** : **Service + Signals**
- Équipe petite (2 devs), pas besoin de conventions imposees
- État simple (liste de taches, filtre, utilisateur connecte)
- Zero dépendance supplementaire = livraison plus rapide
- Argument : "Pour une app de cette taille, un store NgRx serait du surdimensionnement. Un service avec des signals couvre largement le besoin."

**Scenario B** : **NgRx SignalStore**
- Grande équipe (10 devs) = besoin de conventions strictes
- État complexe avec beaucoup de derivations (solde, historique, alertes)
- Plusieurs stores par domaine (CompteStore, TransactionStore, AlerteStore)
- Argument : "La taille de l'équipe justifie des conventions imposees. NgRx SignalStore offre la structure nécessaire tout en restant moderne (signals). Je n'irais pas vers le Store classique pour un nouveau projet."

**Scenario C** : **Garder NgRx Store classique**
- Le Store classique est déjà en place et fonctionne
- Le cout de migration (recrire reducers, effects, selectors) est enorme
- On peut progressivement introduire SignalStore pour les nouvelles features
- Argument : "On ne migre pas un store qui fonctionne. On met a jour les dépendances NgRx vers les dernières versions compatibles Angular 19, et on utilise SignalStore pour les nouvelles fonctionnalites uniquement."
</details>

---

## Résumé

| Approche | Quand | % projets ESN |
|----------|-------|:------------:|
| Service + Signals | Petite-moyenne équipe, état simple | ~70% |
| NgRx SignalStore | Grande équipe, conventions nécessaires | ~20% |
| NgRx Store classique | Legacy, déjà en place | ~10% |

| Regle | Description |
|-------|-------------|
| Commencer simple | Service + Signals par defaut |
| Migrer si nécessaire | Vers SignalStore quand l'équipe grandit |
| Ne pas migrer pour migrer | Garder NgRx Store classique si déjà en place |
| Un store par domaine | Pas un store monolithique global |
| État local = signal local | Pas besoin de store pour l'état d'un seul composant |

---

> **Prochain cours** : [Cours 42 — Pipeline CI/CD : GitHub Actions, lint, test, build, deploy](../11-cicd-auth-securite/01-pipeline-cicd.md)

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Exercice** : [22-store-signaux](../../exercices/22-store-signaux/ENONCE)
2. **Exercice** : [23-ngrx-signal-store](../../exercices/23-ngrx-signal-store/ENONCE)
:::
