# Lab 09 — Signaux avancés : effect(), linkedSignal(), untracked()

> **Outcome :** à la fin, tu sais construire un composant Angular 19 qui (1) auto-sauvegarde un brouillon dans `localStorage` avec un `effect()` debouncé (`onCleanup` + `untracked`), et (2) garde une sélection **persistante et réinitialisable** avec un `linkedSignal()`.
> **Vrai outil :** Angular 19 + Angular CLI (`ng serve`, HMR visible en direct dans le navigateur) + DevTools (onglet Application → Local Storage). JAMAIS un harnais de test simulé.
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis `PlanificateurSortieComponent`, l'écran central du planificateur TribuZen. Cahier des charges **exact** :

1. **Liste de sorties** affichée, chaque ligne cliquable pour sélectionner.
2. **Sélection persistante** (`linkedSignal`) : la sortie sélectionnée se **réinitialise** sur la première quand la liste change, **mais** préserve le choix courant s'il existe toujours dans la nouvelle liste.
3. **Un formulaire de brouillon** : nombre de participants + une note libre, stockés dans un `signal<Brouillon>`.
4. **Auto-sauvegarde** (`effect`) : à chaque changement du brouillon, écrire dans `localStorage` sous la clé `tribuzen:brouillon`, **debouncé à 400 ms** (`setTimeout` + `onCleanup`).
5. **Auteur non suivi** : un `signal` `auteurId` est écrit dans le brouillon sauvegardé, mais changer l'auteur ne doit **pas** déclencher de sauvegarde (`untracked`).
6. Un bouton **« Charger une autre famille »** remplace la liste des sorties (pour observer la réinitialisation).

**Vérification visuelle attendue :**
- Ouvre DevTools → Application → Local Storage : la clé `tribuzen:brouillon` se met à jour ~400 ms après la dernière frappe.
- Taper vite plusieurs caractères → **une seule** écriture finale (debounce OK).
- Cliquer « Charger une autre famille » → la sélection revient à la première sortie ; si l'ancienne sortie existe encore (même `id`), elle reste sélectionnée.

**Pas de gap-fill** — tu écris le composant complet à partir du starter minimal ci-dessous.

### Démarrer le vrai projet

```bash
# dans le repo tribuzen (ou un projet jetable)
ng generate component planificateur-sortie --standalone
ng serve
```

### Starter minimal

Crée `src/app/planificateur-sortie/planificateur-sortie.component.ts` :

```typescript
// planificateur-sortie.component.ts — starter
import { Component, signal, effect, linkedSignal, untracked } from '@angular/core';

interface Sortie {
  id: string;
  titre: string;
}

interface Brouillon {
  participants: number;
  note: string;
}

@Component({
  selector: 'app-planificateur-sortie',
  standalone: true,
  template: `
    <!-- À construire : liste cliquable, formulaire brouillon, bouton famille -->
  `,
})
export class PlanificateurSortieComponent {
  sorties = signal<Sortie[]>([
    { id: 's1', titre: 'Pique-nique parc' },
    { id: 's2', titre: 'Cinéma' },
    { id: 's3', titre: 'Rando' },
  ]);

  auteurId = signal('u-001');
  brouillon = signal<Brouillon>({ participants: 2, note: '' });

  // À toi : selection (linkedSignal), l'effect d'auto-sauvegarde,
  // les handlers setParticipants / setNote, changerFamille.
}
```

Branche `<app-planificateur-sortie />` dans `app.component.html` pour voir le résultat en direct.

---

## Étapes (en friction)

1. **Déclare `selection`** en `linkedSignal` forme `{ source, computation }` : source = `sorties`, computation = garder la sélection précédente si son `id` est dans la nouvelle liste, sinon la première (`?? liste[0] ?? null`). Ajoute `equal` par `id`.
2. **Écris le template** : `@for` sur `sorties()` avec `track s.id`, `[class.active]` selon `selection()?.id`, `(click)="selection.set(s)"`.
3. **Écris le formulaire** : un `input[type=number]` lié à `brouillon().participants` + un `textarea` lié à `brouillon().note`, chacun avec un handler qui fait un `update` **immuable** du brouillon.
4. **Crée l'`effect` dans le `constructor`** : lis `brouillon()` (dépendance), lis `auteurId()` via `untracked`, programme un `setTimeout(400)` qui écrit dans `localStorage`, et enregistre `onCleanup(() => clearTimeout(t))`.
5. **Écris `changerFamille()`** : `sorties.set([...])` avec une nouvelle liste.
6. **Vérifie les cas limites** : (a) frappe rapide → une seule écriture ; (b) changer l'auteur ne provoque **aucune** écriture ; (c) nouvelle liste sans l'ancienne sortie → reset sur la première ; nouvelle liste **avec** l'ancien `id` → sélection préservée.

---

## Corrigé complet commenté

```typescript
// planificateur-sortie.component.ts — corrigé
import { Component, signal, effect, linkedSignal, untracked } from '@angular/core';

interface Sortie {
  id: string;
  titre: string;
}

interface Brouillon {
  participants: number;
  note: string;
}

@Component({
  selector: 'app-planificateur-sortie',
  standalone: true,
  template: `
    <h2>Planificateur de sortie</h2>

    <!-- Liste cliquable ; track par id métier stable, résistant au tri/filtre -->
    <ul>
      @for (s of sorties(); track s.id) {
        <li
          [class.active]="selection()?.id === s.id"
          (click)="selection.set(s)"
        >
          {{ s.titre }}
        </li>
      }
    </ul>
    <p>Sélection : {{ selection()?.titre ?? 'Aucune' }}</p>
    <button (click)="changerFamille()">Charger une autre famille</button>

    <hr />

    <!-- Formulaire de brouillon : chaque frappe met à jour le signal brouillon -->
    <label>
      Participants
      <input
        type="number"
        [value]="brouillon().participants"
        (input)="setParticipants($event)"
      />
    </label>
    <label>
      Note
      <textarea
        [value]="brouillon().note"
        (input)="setNote($event)"
      ></textarea>
    </label>
    <p><em>Sauvegardé automatiquement.</em></p>
  `,
})
export class PlanificateurSortieComponent {
  sorties = signal<Sortie[]>([
    { id: 's1', titre: 'Pique-nique parc' },
    { id: 's2', titre: 'Cinéma' },
    { id: 's3', titre: 'Rando' },
  ]);

  auteurId = signal('u-001');
  brouillon = signal<Brouillon>({ participants: 2, note: '' });

  // linkedSignal : modifiable (set au clic) ET réinitialisé quand sorties() change.
  // computation reçoit (nouvelle liste, previous) → on préserve le choix s'il existe encore.
  selection = linkedSignal<Sortie[], Sortie | null>({
    source: this.sorties,
    computation: (liste, previous) =>
      liste.find(s => s.id === previous?.value?.id) ?? liste[0] ?? null,
    // deux sorties « identiques » si même id → évite un reset cosmétique
    equal: (a, b) => a?.id === b?.id,
  });

  constructor() {
    // effect créé dans le constructor = contexte d'injection (détruit avec le composant).
    effect((onCleanup) => {
      const data = this.brouillon();            // DÉPENDANCE : relance à chaque changement

      // untracked : on lit l'auteur SANS en dépendre.
      // Changer auteurId() ne redéclenche donc PAS de sauvegarde.
      const auteur = untracked(() => this.auteurId());

      // debounce : on programme l'écriture 400 ms après le dernier changement
      const timer = setTimeout(() => {
        localStorage.setItem(
          'tribuzen:brouillon',
          JSON.stringify({ ...data, auteur }),
        );
      }, 400);

      // onCleanup : annule le timer en attente avant le prochain run (et à la destruction).
      // Sans ça, une frappe rapide programmerait une écriture par caractère.
      onCleanup(() => clearTimeout(timer));
    });
  }

  setParticipants(e: Event) {
    const n = Number((e.target as HTMLInputElement).value);
    // update immuable : nouvel objet → nouvelle référence → signal notifié → effect planifié
    this.brouillon.update(b => ({ ...b, participants: n }));
  }

  setNote(e: Event) {
    const note = (e.target as HTMLTextAreaElement).value;
    this.brouillon.update(b => ({ ...b, note }));
  }

  changerFamille() {
    // Nouvelle liste → computation du linkedSignal relancée.
    // 's2' est encore présent → si 'Cinéma' était sélectionné, la sélection est préservée.
    this.sorties.set([
      { id: 's2', titre: 'Cinéma' },
      { id: 's9', titre: 'Musée' },
      { id: 's10', titre: 'Plage' },
    ]);
  }
}
```

**Pourquoi ce corrigé est correct :**
- La sauvegarde n'est écrite **nulle part** dans les handlers : l'`effect` la centralise. Impossible d'« oublier » un handler.
- `untracked(() => this.auteurId())` lit l'auteur au moment du run mais ne l'inscrit pas comme dépendance → changer l'auteur ne relance pas la sauvegarde. Sans `untracked`, chaque changement d'auteur écrirait dans `localStorage`.
- `onCleanup(() => clearTimeout(timer))` garantit **une seule** écriture finale même en frappe rapide : chaque nouveau run annule le timer précédent.
- `selection` est un `linkedSignal` (pas un `computed`) parce qu'il faut pouvoir faire `selection.set(s)` au clic ; et pas un `signal` nu parce que la réinitialisation sur `source` serait à coder à la main.
- `equal: (a, b) => a?.id === b?.id` évite que la computation « re-sélectionne » un objet équivalent et déclenche un rendu inutile.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées.** Reproduis `PlanificateurSortieComponent` **de mémoire, en 25 minutes**, avec ces modifications :

1. **Restaure le brouillon au démarrage** : au `constructor`, lis `localStorage.getItem('tribuzen:brouillon')` et initialise `brouillon` avec la valeur trouvée (sinon le défaut). Attention : cette lecture initiale ne doit **pas** être dans l'`effect`.
2. **Ajoute un `computed` `resume`** qui affiche `"{participants} pers. — {N} caractères de note"` et rends-le dans le template.
3. **Sans rouvrir ce corrigé** ni le module 09.

**Critère de réussite :** recharger la page (F5) conserve le brouillon saisi, le debounce fonctionne toujours (une écriture après frappe rapide), et changer l'auteur ne provoque aucune écriture dans `localStorage`.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, le composant vit ici :

```
tribuzen/
  src/
    app/
      sorties/
        planificateur-sortie.component.ts
```

**Différences par rapport au lab :**

- La persistance passera du `localStorage` à une **sauvegarde serveur** via `resource` (module 10) — mais la logique `effect` + debounce + `onCleanup` reste le même squelette côté client.
- `auteurId` viendra d'un service d'authentification injecté (modules 11-13), pas d'un `signal` local.
- La liste `sorties` sera chargée depuis l'API ; ici on garde des données locales pour isoler la mécanique des signaux avancés.

**Commit cible :**
```
feat(sorties): PlanificateurSortie — auto-save effect debouncé + selection linkedSignal
```
