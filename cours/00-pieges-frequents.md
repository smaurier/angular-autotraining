# 15 pieges frequents en Angular 19+ (pour développeurs Vue 3)

> **Objectif** : Ce document recense les 15 erreurs les plus courantes rencontrees par les développeurs
> venant de Vue 3 lorsqu'ils debutent avec Angular 19+. Pour chaque piege, vous trouverez le problème,
> le code incorrect, le code correct, une analogie et une explication de l'importance du sujet.

---

## Piege 1 -- Oublier d'importer les standalone components dans `imports: []`

### Problème

En Vue, un composant importe dans le `<script>` est automatiquement disponible dans le `<template>`.
En Angular standalone, chaque composant doit **explicitement** declarer ses dépendances dans le tableau `imports`.

### Code incorrect

```typescript
// child.component.ts
@Component({
  selector: 'app-child',
  template: `<p>Je suis le composant enfant</p>`
})
export class ChildComponent {}

// parent.component.ts
@Component({
  selector: 'app-parent',
  imports: [],  // ChildComponent manquant !
  template: `<app-child />`  // Angular ne reconnait pas ce selecteur
})
export class ParentComponent {}
```

### Code correct

```typescript
// parent.component.ts
@Component({
  selector: 'app-parent',
  imports: [ChildComponent],  // Declaration explicite
  template: `<app-child />`
})
export class ParentComponent {}
```

### Analogie

C'est comme une chaine de montage en usine : chaque poste (composant) doit avoir son bon de commande (import) pour recevoir les pieces (composants enfants). Pas de bon, pas de piece.

### Pourquoi c'est important

Sans l'import, Angular ignore silencieusement le selecteur ou lance une erreur `NG8001: 'app-child' is not a known element`. C'est l'erreur numéro 1 des débutants Angular.

---

## Piege 2 -- Utiliser `*ngIf` au lieu de `@if`

### Problème

Angular 19+ introduit la syntaxe de control flow intégrée (`@if`, `@for`, `@switch`). Les anciennes directives structurelles (`*ngIf`, `*ngFor`) sont depreciees. Venant de Vue, vous chercherez l'équivalent de `v-if` -- c'est `@if`, pas `*ngIf`.

### Code incorrect

```html
<!-- Ancienne syntaxe -- depreciee en Angular 19+ -->
<div *ngIf="isVisible">Contenu visible</div>
<div *ngIf="user; else noUser">{{ user.name }}</div>
<ng-template #noUser>Pas d'utilisateur</ng-template>
```

### Code correct

```html
<!-- Nouvelle syntaxe -- Angular 19+ -->
@if (isVisible) {
  <div>Contenu visible</div>
}

@if (user; as u) {
  <div>{{ u.name }}</div>
} @else {
  <div>Pas d'utilisateur</div>
}
```

### Analogie

C'est comme passer d'un GPS avec commandes vocales compliquees (`*ngIf="condition; else tmpl"`) à un GPS moderne avec des boutons clairs (`@if / @else`). Le résultat est le même, mais l'ergonomie est bien meilleure.

### Pourquoi c'est important

La nouvelle syntaxe est plus lisible, mieux typee, et ne nécessité pas d'importer `CommonModule` ou `NgIf`. Angular va progressivement retirer le support des anciennes directives.

---

## Piege 3 -- Muter un signal directement au lieu de `.set()` / `.update()`

### Problème

En Vue 3, on mute `ref.value` directement. En Angular, un `signal` est une fonction : on lit avec `signal()` et on écrit avec `.set()` ou `.update()`. Muter l'objet interne ne declenche aucune reactvite.

### Code incorrect

```typescript
// FAUX : tentative de mutation directe
const items = signal<string[]>(['a', 'b']);

// Ceci ne declenche AUCUNE mise a jour de la vue
items().push('c');  // Mute le tableau interne, Angular ne le detecte pas
```

### Code correct

```typescript
const items = signal<string[]>(['a', 'b']);

// Utiliser .update() pour creer une nouvelle reference
items.update(current => [...current, 'c']);

// Ou .set() pour remplacer entierement
items.set(['a', 'b', 'c']);
```

### Analogie

Un signal, c'est comme un panneau d'affichage electronique. Pour changer le message, vous devez utiliser la telecommande (`.set()` / `.update()`). Écrire au marqueur sur l'ecran (mutation directe) ne changera pas ce que le système affiche.

### Pourquoi c'est important

Angular Signals repose sur l'egalite referentielle pour détecter les changements. Si vous mutez un objet sans changer sa référence, `computed()` et `effect()` ne se re-executeront jamais. C'est une source de bugs silencieux.

---

## Piege 4 -- Oublier `track` dans `@for`

### Problème

En Vue 3, `:key` est optionnel (mais recommande). En Angular 19+, `track` est **obligatoire** dans `@for`. Sans lui, Angular refuse de compiler.

### Code incorrect

```html
<!-- Erreur de compilation : track est obligatoire -->
@for (item of items()) {
  <div>{{ item.name }}</div>
}
```

### Code correct

```html
<!-- track par une propriete unique -->
@for (item of items(); track item.id) {
  <div>{{ item.name }}</div>
}

<!-- Ou track par $index si pas d'identifiant unique -->
@for (item of items(); track $index) {
  <div>{{ item.name }}</div>
} @empty {
  <div>Aucun element</div>
}
```

### Analogie

`track` est comme le code-barres sur un colis. Sans code-barres, le livreur (Angular) ne peut pas savoir quel colis a change, quel colis est nouveau. Il serait oblige de tout jeter et tout re-livrer à chaque fois.

### Pourquoi c'est important

`track` permet a Angular d'optimiser le rendu en identifiant de manière unique chaque élément. Utiliser `$index` est acceptable mais moins performant que `item.id` si la liste est reordonnee.

---

## Piege 5 -- Ne pas unsubscribe les Observables

### Problème

Vue 3 géré automatiquement le nettoyage des `watch` et `watchEffect` quand le composant est detruit. En Angular, les souscriptions RxJS doivent etre nettoyees manuellement -- sinon vous avez des fuites mémoire.

### Code incorrect

```typescript
@Component({ /* ... */ })
export class UserComponent implements OnInit {
  ngOnInit() {
    // FUITE MEMOIRE : cette souscription vit indefiniment
    this.userService.getUser().subscribe(user => {
      this.user = user;
    });
  }
}
```

### Code correct

```typescript
@Component({ /* ... */ })
export class UserComponent {
  private destroyRef = inject(DestroyRef);

  constructor() {
    // takeUntilDestroyed se desabonne automatiquement
    this.userService.getUser().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(user => {
      this.user = user;
    });
  }
}

// Alternative moderne : convertir en signal
@Component({ /* ... */ })
export class UserComponent {
  user = toSignal(inject(UserService).getUser());
}
```

### Analogie

Un Observable sans unsubscribe, c'est comme laisser un robinet ouvert. L'eau (les donnees) continue de couler même quand vous avez quitte la piece (le composant est detruit). `takeUntilDestroyed` ferme le robinet automatiquement.

### Pourquoi c'est important

Les fuites mémoire s'accumulent silencieusement et degradent les performances. En production, une SPA qui tourne 8h peut devenir inutilisable. `takeUntilDestroyed` (Angular 16+) est la solution moderne et elegante.

---

## Piege 6 -- Confondre `toSignal()` et `toObservable()`

### Problème

Angular fournit deux ponts entre le monde Signals et le monde RxJS. Les confondre mene a des erreurs de typage ou des comportements inattendus.

### Code incorrect

```typescript
// FAUX : toSignal attend un Observable, pas un Signal
const count = signal(0);
const count$ = toSignal(count);  // Erreur : count n'est pas un Observable

// FAUX : toObservable attend un Signal, pas un Observable
const user$ = httpClient.get<User>('/api/user');
const user$$ = toObservable(user$);  // Erreur : user$ n'est pas un Signal
```

### Code correct

```typescript
// Observable -> Signal : utiliser toSignal()
const user$ = httpClient.get<User>('/api/user');
const user = toSignal(user$, { initialValue: undefined });

// Signal -> Observable : utiliser toObservable()
const count = signal(0);
const count$ = toObservable(count);
```

### Analogie

`toSignal()` est un adaptateur prise americaine -> prise francaise (Observable -> Signal). `toObservable()` fait l'inverse. Utiliser le mauvais adaptateur, c'est court-circuit garanti.

### Pourquoi c'est important

Angular va de plus en plus vers les Signals, mais RxJS reste essentiel pour les flux asynchrones complexes. Maîtriser ces deux ponts est indispensable pour un code Angular moderne.

---

## Piege 7 -- Melanger template-driven et réactive forms

### Problème

Angular a deux approches de formulaires : template-driven (`ngModel`) et réactive (`FormControl`). Les melanger dans un même formulaire créé des conflits et des bugs subtils.

### Code incorrect

```html
<!-- FAUX : melange de ngModel et formControl sur le meme champ -->
<form [formGroup]="myForm">
  <input formControlName="name" [(ngModel)]="userName" />
</form>
```

### Code correct

```html
<!-- Reactive forms : tout passe par formControl -->
<form [formGroup]="myForm">
  <input formControlName="name" />
</form>
```

```typescript
// Dans le composant
myForm = new FormGroup({
  name: new FormControl('', Validators.required),
});
```

### Analogie

C'est comme avoir deux pilotes dans un avion qui donnent des ordres contradictoires. Le formulaire ne sait plus qui ecouter. Choisissez un seul pilote (réactive forms, de préférence) et tenez-vous-y.

### Pourquoi c'est important

Angular affiche un warning en dev si vous melangez les deux. En production, les valeurs peuvent se desynchroniser. La recommandation officielle pour les projets d'entreprise est d'utiliser **uniquement** les réactive forms.

---

## Piege 8 -- `| async` retourne `T | null`

### Problème

Le pipe `async` souscrit à un Observable et affiche sa dernière valeur. Mais **avant** la première emission, il retourne `null`. Si votre template accede à une propriété, vous obtenez une erreur.

### Code incorrect

```html
<!-- user$ est Observable<User> mais async retourne User | null -->
<div>{{ (user$ | async).name }}</div>
<!-- Erreur : Cannot read property 'name' of null -->
```

### Code correct

```html
<!-- Solution 1 : @if pour verifier la valeur -->
@if (user$ | async; as user) {
  <div>{{ user.name }}</div>
}

<!-- Solution 2 (moderne) : utiliser toSignal dans le composant -->
<!-- user = toSignal(user$) dans le .ts -->
@if (user()) {
  <div>{{ user()!.name }}</div>
}
```

### Analogie

Le pipe `async` est comme un livreur qui sonne a votre porte. Avant qu'il arrive (première emission), il n'y a rien devant la porte (`null`). Vous devez vérifier que le colis est la avant de l'ouvrir.

### Pourquoi c'est important

En mode strict (recommande), TypeScript refuse `(obs$ | async).prop` car le type est `T | null`. Utiliser `toSignal` avec un `initialValue` ou `@if ... as` evite ce problème proprement.

---

## Piege 9 -- HttpClient : les requêtes sont cold

### Problème

En Vue avec Axios ou fetch, une requête se lance des qu'on appelle la fonction. En Angular, `HttpClient` retourne un Observable **cold** : la requête ne part **qu'au moment du `.subscribe()`** (où du `| async`, ou du `toSignal`).

### Code incorrect

```typescript
// La requete n'est JAMAIS envoyee : personne ne subscribe
loadUser() {
  this.http.get<User>('/api/user');  // Observable cree mais pas souscrit
}
```

### Code correct

```typescript
// Solution 1 : subscribe explicite
loadUser() {
  this.http.get<User>('/api/user').pipe(
    takeUntilDestroyed(this.destroyRef)
  ).subscribe(user => {
    this.user.set(user);
  });
}

// Solution 2 : toSignal (souscrit automatiquement)
user = toSignal(this.http.get<User>('/api/user'));

// Solution 3 : | async dans le template (souscrit automatiquement)
```

### Analogie

Un Observable cold, c'est comme un bon de commande rempli mais pas envoye. Tant que vous ne le postez pas (`.subscribe()`), le fournisseur ne prepare rien.

### Pourquoi c'est important

C'est LE piege classique des développeurs venant de Vue/React ou chaque appel `fetch()` ou `axios.get()` lance immediatement la requête. En Angular, il faut toujours un consommateur.

---

## Piege 10 -- `providedIn: 'root'` = singleton global

### Problème

En Vue 3, `provide/inject` est scope a l'arbre de composants. En Angular, un service avec `providedIn: 'root'` est un **singleton global** partage par toute l'application. Si vous voulez une instance par composant, il faut declarer le provider autrement.

### Code incorrect

```typescript
// Ce service est un singleton global
@Injectable({ providedIn: 'root' })
export class FormStateService {
  formData = signal({ name: '' });
}

// PROBLEME : si deux pages utilisent FormStateService,
// elles partagent le MEME etat !
```

### Code correct

```typescript
// Retirer providedIn: 'root' pour un service local
@Injectable()
export class FormStateService {
  formData = signal({ name: '' });
}

// Le fournir au niveau du composant pour une instance isolee
@Component({
  providers: [FormStateService],  // Nouvelle instance par composant
  // ...
})
export class FormPageComponent {
  formState = inject(FormStateService);
}
```

### Analogie

`providedIn: 'root'`, c'est comme un tableau blanc dans le hall d'entree -- tout le monde y accede. Un service en `providers: [...]`, c'est comme un tableau blanc dans chaque bureau -- chaque équipe a le sien.

### Pourquoi c'est important

Confondre singleton et instance locale cause des bugs de partage d'état entre pages. C'est particulierement dangereux avec les formulaires et les états temporaires.

---

## Piege 11 -- Change detection : composant ne se met pas a jour

### Problème

Angular utilise Zone.js pour détecter les changements. Si vous modifiez une donnee en dehors de la zone Angular (setTimeout natif, WebSocket, librairie tierce), le composant ne se met pas a jour.

### Code incorrect

```typescript
@Component({
  // Avec OnPush ou en mode zoneless
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div>{{ counter }}</div>`
})
export class CounterComponent {
  counter = 0;

  ngOnInit() {
    // Le setTimeout fonctionne mais OnPush ne detecte pas le changement
    setInterval(() => {
      this.counter++;  // La vue ne se met PAS a jour
    }, 1000);
  }
}
```

### Code correct

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div>{{ counter() }}</div>`
})
export class CounterComponent {
  counter = signal(0);

  constructor() {
    // Les Signals notifient automatiquement Angular
    setInterval(() => {
      this.counter.update(c => c + 1);  // La vue se met a jour
    }, 1000);
  }
}
```

### Analogie

Zone.js est comme un detecteur de mouvement dans une piece. Si vous bougez (mutation standard), il détecté. Mais si quelqu'un passe par la fenêtre (hors zone), le detecteur ne voit rien. Les Signals, eux, envoient un SMS directement au système d'alarme.

### Pourquoi c'est important

Angular se dirige vers le mode **zoneless** (sans Zone.js). Les Signals sont la solution d'avenir pour une réactivité explicite et performante. Adoptez-les des maintenant.

---

## Piege 12 -- Router : chemins absolus vs relatifs

### Problème

En Vue Router, les chemins sont simples. En Angular, la distinction entre chemin absolu (`/dashboard`) et relatif (`dashboard` ou `../settings`) dans `router.navigate()` est source de confusion.

### Code incorrect

```typescript
// FAUX : navigate avec un chemin relatif SANS contexte
this.router.navigate(['settings']);
// -> navigue vers /settings (absolu depuis la racine) et non vers
//    /dashboard/settings comme attendu
```

### Code correct

```typescript
// Solution 1 : chemin absolu explicite
this.router.navigate(['/dashboard/settings']);

// Solution 2 : chemin relatif AVEC la route active comme contexte
this.router.navigate(['settings'], { relativeTo: this.route });
// Si on est sur /dashboard, navigue vers /dashboard/settings

// Solution 3 : routerLink dans le template (relatif par defaut)
// <a routerLink="settings">Parametres</a>
// ou
// <a routerLink="/dashboard/settings">Parametres</a>
```

### Analogie

C'est comme les chemins de fichiers. `cd settings` (relatif) depend d'où vous etes. `cd /home/user/settings` (absolu) va toujours au même endroit. Angular Router fonctionne exactement pareil.

### Pourquoi c'est important

Une navigation incorrecte peut envoyer l'utilisateur sur une route inexistante (404) ou sur la mauvaise page. En debug, c'est difficile a reperer car l'URL change silencieusement.

---

## Piege 13 -- Interceptors : l'ordre compte

### Problème

Les interceptors HTTP Angular s'executent dans l'ordre ou ils sont declares. En Angular 19+, les interceptors fonctionnels remplacent les interceptors en classe, mais l'ordre reste critique.

### Code incorrect

```typescript
// L'interceptor d'auth est APRES le logger
// -> le logger ne verra PAS le header Authorization
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([
        loggingInterceptor,   // Log la requete SANS le token
        authInterceptor,      // Ajoute le token APRES le log
      ])
    ),
  ],
};
```

### Code correct

```typescript
// L'interceptor d'auth est AVANT le logger
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([
        authInterceptor,      // 1. Ajoute le token
        loggingInterceptor,   // 2. Log la requete AVEC le token
        errorInterceptor,     // 3. Gere les erreurs
      ])
    ),
  ],
};
```

### Analogie

Les interceptors sont comme des postes de controle sur une autoroute. La voiture (requête) passe par chaque poste dans l'ordre. Si le poste "badge de peage" est après le poste "vérification de badge", ça ne marchera pas.

### Pourquoi c'est important

Un mauvais ordre d'interceptors peut faire echouer l'authentification, perdre des headers, ou logger des informations incompletes. Pensez-y comme un pipeline : l'ordre est fondamental.

---

## Piege 14 -- `inject()` ne marche que dans le contexte d'injection

### Problème

La fonction `inject()` (Angular 14+) ne peut etre appelee que dans un **contexte d'injection** : constructeur de classe, champ d'initialisation, ou factory d'un provider. L'appeler dans une méthode ou un callback provoque une erreur runtime.

### Code incorrect

```typescript
@Component({ /* ... */ })
export class UserComponent {
  loadUser() {
    // ERREUR RUNTIME : inject() appele hors du contexte d'injection
    const http = inject(HttpClient);
    http.get('/api/user').subscribe();
  }
}
```

### Code correct

```typescript
@Component({ /* ... */ })
export class UserComponent {
  // inject() dans l'initialisation du champ (contexte constructeur)
  private http = inject(HttpClient);

  loadUser() {
    this.http.get('/api/user').subscribe();
  }
}

// Alternative : dans le constructeur
@Component({ /* ... */ })
export class UserComponent {
  private http: HttpClient;

  constructor() {
    this.http = inject(HttpClient);
  }
}
```

### Analogie

`inject()` est comme un distributeur automatique qui ne fonctionne qu'a l'entree du batiment (constructeur). Une fois a l'interieur (méthodes), le distributeur est verrouille. Prenez tout ce dont vous avez besoin a l'entree.

### Pourquoi c'est important

L'erreur `inject() must be called from an injection context` est cryptique pour les débutants. Regle simple : tous vos `inject()` doivent etre dans des declarations de champs ou dans le constructeur.

---

## Piege 15 -- NgZone / zoneless : `setTimeout` ne trigger pas le rendu

### Problème

Angular evolue vers un mode **zoneless** (sans Zone.js). Dans ce mode, `setTimeout`, `setInterval` et les callbacks DOM ne declenchent plus automatiquement la detection de changements. Seuls les Signals et les événements Angular (click dans le template, etc.) le font.

### Code incorrect

```typescript
// En mode zoneless, cette modification est INVISIBLE pour Angular
@Component({
  template: `<div>{{ message }}</div>`
})
export class NotifComponent {
  message = '';

  ngOnInit() {
    setTimeout(() => {
      this.message = 'Chargement termine';  // La vue ne se met PAS a jour
    }, 2000);
  }
}
```

### Code correct

```typescript
// Solution 1 : utiliser un Signal (recommande)
@Component({
  template: `<div>{{ message() }}</div>`
})
export class NotifComponent {
  message = signal('');

  constructor() {
    setTimeout(() => {
      this.message.set('Chargement termine');  // Signal notifie Angular
    }, 2000);
  }
}

// Solution 2 : ChangeDetectorRef.markForCheck() (si vous ne pouvez pas utiliser un Signal)
@Component({
  template: `<div>{{ message }}</div>`
})
export class NotifComponent {
  private cdr = inject(ChangeDetectorRef);
  message = '';

  ngOnInit() {
    setTimeout(() => {
      this.message = 'Chargement termine';
      this.cdr.markForCheck();  // Force la detection de changements
    }, 2000);
  }
}
```

### Analogie

Zone.js etait comme un assistant qui surveillait tout ce que vous faisiez et prevenait Angular à chaque geste. En mode zoneless, l'assistant est parti. Vous devez envoyer un message explicite (Signal ou `markForCheck()`) pour prévenir Angular vous-même.

### Pourquoi c'est important

Le mode zoneless est l'avenir d'Angular : meilleures performances, bundle plus petit, comportement plus predictible. Adoptez les Signals des maintenant pour etre pret quand zoneless deviendra le defaut.

---

## Résumé : les reflexes a adopter

| # | Piege | Reflexe |
|---|-------|---------|
| 1 | Imports manquants | Toujours vérifier `imports: []` dans `@Component` |
| 2 | `*ngIf` deprecie | Utiliser `@if` / `@else` |
| 3 | Mutation de signal | Toujours `.set()` ou `.update()` |
| 4 | `track` manquant | Toujours `track item.id` ou `track $index` |
| 5 | Fuite Observable | `takeUntilDestroyed()` ou `toSignal()` |
| 6 | toSignal/toObservable | Observable -> Signal = `toSignal()` |
| 7 | Mix forms | Choisir réactive forms, s'y tenir |
| 8 | async null | `@if (obs$ \| async; as val)` |
| 9 | Requête cold | Toujours subscribe (où `toSignal` / `\| async`) |
| 10 | Singleton global | `providedIn: 'root'` = partage, `providers: []` = local |
| 11 | Change detection | Utiliser Signals pour la réactivité |
| 12 | Routes abs/rel | `relativeTo: this.route` pour relatif |
| 13 | Ordre interceptors | Auth avant logging avant error |
| 14 | inject() hors contexte | Uniquement dans champs ou constructeur |
| 15 | Zoneless | Signals partout, `markForCheck()` en dernier recours |
