---
titre: Accessibilité Angular — ARIA, focus management et CDK a11y
cours: 03-angular
notions: ["HTML sémantique natif d'abord", "attributs ARIA en Angular via [attr.aria-*]", "role, aria-label, aria-labelledby, aria-describedby", "aria-live (polite / assertive)", "aria-hidden", "gestion du focus dans un SPA", "skip link", "\"@angular/cdk/a11y\"", "cdkTrapFocus", "cdkTrapFocusAutoCapture", "LiveAnnouncer.announce()", "FocusMonitor.monitor()", "roving tabindex", "mapping WCAG 2.1 AA / RGAA 4.1", "tests a11y avec axe-core et Lighthouse"]
outcomes:
  - sait choisir le HTML sémantique natif avant les attributs ARIA et binder ARIA en Angular avec [attr.aria-*]
  - sait piéger et restituer le focus d'une modale avec cdkTrapFocus et cdkTrapFocusAutoCapture
  - sait annoncer un changement au lecteur d'écran avec LiveAnnouncer.announce() en mode polite ou assertive
  - sait gérer le focus après une navigation SPA (skip link + focus programmatique)
  - sait rattacher une exigence d'écran à un critère WCAG 2.1 AA et sa thématique RGAA, et auditer avec axe-core / Lighthouse
prerequis: [modules 00-21 (bases Angular, signals, control flow, routing, formulaires, Material + CDK)]
next: 23-tests-composants-http-di
libs: [{ name: "@angular/cdk", version: "19" }, { name: "@axe-core/playwright", version: "4" }]
tribuzen: couche accessibilité du front-office TribuZen — modale de confirmation de suppression, skip link + annonce de navigation dans l'app shell, onglets du profil famille
last-reviewed: 2026-07
---

<!-- FLAG-REVIEW: RGAA — à valider par Sylvain (certif oct 2026) -->
<!-- Les numéros de critères RGAA 4.1 et de succès WCAG 2.1 cités ici sont donnés
     comme repères pédagogiques. Vérifier chaque mapping avec le référentiel officiel
     (accessibilite.numerique.gouv.fr) avant de s'en servir en audit réel. -->

# Accessibilité Angular — ARIA, focus management et CDK a11y

> **Outcomes — tu sauras FAIRE :** binder ARIA proprement en Angular, piéger/restituer le focus d'une modale avec `cdkTrapFocus`, annoncer au lecteur d'écran avec `LiveAnnouncer`, gérer le focus après navigation, et rattacher chaque écran à un critère WCAG/RGAA vérifiable.
> **Difficulté :** :star::star::star:
>
> **Portée :** ce module couvre l'**accessibilité côté composant Angular** : le trio ARIA / focus / annonces, les outils du **CDK a11y** (`cdkTrapFocus`, `LiveAnnouncer`, `FocusMonitor`) et le rattachement aux référentiels **WCAG 2.1 AA** et **RGAA 4.1**. Les composants Material déjà accessibles (`mat-dialog`, `mat-select`…) relèvent du **module 21**. Les tests unitaires de composant (`TestBed`) sont le **module 23** : ici on reste sur l'audit a11y (axe-core, Lighthouse). On ne réécrit pas le référentiel RGAA — on apprend à s'y raccrocher.

## 1. Cas concret d'abord

Sur TribuZen, l'écran « Membres de la famille » a un bouton **Retirer** par membre. Un collègue a livré la modale de confirmation suivante :

```typescript
// confirm-retrait.component.ts — AVANT (inaccessible)
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-confirm-retrait',
  template: `
    @if (ouverte()) {
      <div class="overlay">
        <div class="modale">
          <div class="titre">Retirer ce membre ?</div>
          <div class="boutons">
            <div class="btn" (click)="annuler()">Annuler</div>
            <div class="btn danger" (click)="confirmer()">Retirer</div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmRetraitComponent {
  ouverte = signal(false);
  annuler() { this.ouverte.set(false); }
  confirmer() { /* ... */ this.ouverte.set(false); }
}
```

Trois utilisateurs sont **exclus** par ce code :

- **Clavier seul** : les « boutons » sont des `<div>`. Pas focusables, pas activables à Entrée/Espace. La touche Tab quitte la modale et va se perdre dans la page en arrière-plan.
- **Lecteur d'écran** : rien n'annonce qu'une boîte de dialogue s'est ouverte (pas de `role="dialog"`, pas de titre lié). À la confirmation, rien n'annonce que le membre a été retiré : l'action se fait en silence.
- **Focus** : à l'ouverture le focus reste sur le bouton « Retirer » de la liste, derrière l'overlay ; à la fermeture il ne revient nulle part.

Ce ne sont pas des détails cosmétiques : ce sont des **non-conformités** WCAG 2.1 AA (donc RGAA 4.1), le niveau exigé par la réglementation française (RGAA) et européenne (EAA / directive 2016/2102). Ce module donne les briques Angular pour livrer cette modale **conforme** : HTML sémantique, `cdkTrapFocus`, `LiveAnnouncer`, et retour de focus. La version corrigée est le Worked example 1.

---

## 2. Théorie complète, concise

### 2.1 Règle d'or : le HTML natif d'abord, ARIA en dernier recours

La **première règle d'ARIA** (WAI-ARIA Authoring Practices) : *« Si un élément HTML natif fournit la sémantique et le comportement voulus, utilise-le plutôt que de réimplémenter avec ARIA. »*

Un `<button>` est focusable, activable à Entrée/Espace, annoncé « bouton » — gratuitement. Une `<div role="button" tabindex="0">` t'oblige à recâbler le focus, le clavier et l'état à la main, et le moindre oubli casse l'accès. Donc : `<button>`, `<a href>`, `<nav>`, `<main>`, `<h1>`–`<h6>`, `<label>`, `<dialog>` d'abord. ARIA seulement quand le natif ne suffit pas (composants composites : onglets, menus, comboboxes).

### 2.2 Les attributs ARIA en Angular

ARIA décrit trois choses à la couche d'assistance : le **rôle** (`role="dialog"`), les **propriétés/états** (`aria-label`, `aria-describedby`, `aria-invalid`, `aria-selected`…) et les **relations** (`aria-labelledby`, `aria-controls`).

En Angular, un attribut ARIA **statique** s'écrit tel quel dans le template. Un attribut ARIA **dynamique** se binde avec `[attr.aria-*]`, pas avec `[aria-*]` : ce ne sont pas des propriétés du DOM, ce sont des attributs.

```typescript
@Component({
  template: `
    <!-- statique : écrit directement -->
    <nav aria-label="Navigation principale">...</nav>

    <!-- dynamique : [attr.aria-*] car aria-invalid n'est pas une propriété DOM -->
    <input [attr.aria-invalid]="champInvalide()" [attr.aria-describedby]="descId()" />
  `,
})
```

Piège fréquent : `[ariaLabel]` ou `[aria-label]` ne fonctionnent pas de façon fiable — c'est **`[attr.aria-label]`**. Quand la valeur peut être absente, binde `null` (et non `''`) pour retirer l'attribut : `[attr.aria-describedby]="hasError() ? 'err-id' : null"`.

`aria-hidden="true"` retire un élément de l'arbre d'accessibilité : réservé au **purement décoratif** (icône dédoublant un texte déjà lisible). Jamais sur un élément contenant une information ou un élément focusable.

### 2.3 Les régions live : `aria-live`

Un lecteur d'écran ne relit pas la page à chaque changement du DOM. Pour qu'un contenu **apparu dynamiquement** soit annoncé, il doit vivre dans une **région live** :

- `aria-live="polite"` : annoncé quand le lecteur a fini sa phrase en cours. Défaut à privilégier (confirmations, comptages, statuts).
- `aria-live="assertive"` : interrompt tout de suite. Réservé au **critique** (erreur bloquante).
- `role="alert"` équivaut à une région `assertive` ; `role="status"` équivaut à `polite`.

Point clé (souvent raté) : la région live doit **exister dans le DOM avant** d'être remplie. Si tu crées la région **et** son texte au même render, l'annonce peut ne pas partir. On garde donc un conteneur live vide monté en permanence, ou — plus simple en Angular — on utilise `LiveAnnouncer` (§2.5) qui gère ce conteneur pour toi. Cela correspond à WCAG **4.1.3 Messages d'état** (AA), thématique RGAA **7 (Scripts)**.

### 2.4 CDK a11y — piéger le focus d'une modale : `cdkTrapFocus`

Quand une modale est ouverte, la touche Tab ne doit **pas** en sortir : sinon l'utilisateur clavier atterrit sur le contenu derrière l'overlay, qu'il ne voit même pas. Le CDK (`@angular/cdk/a11y`, `A11yModule`) fournit la directive `cdkTrapFocus`.

```typescript
import { A11yModule } from '@angular/cdk/a11y';

@Component({
  imports: [A11yModule],
  template: `
    <div role="dialog" aria-modal="true" aria-labelledby="t"
         cdkTrapFocus [cdkTrapFocusAutoCapture]="true">
      <h2 id="t">Titre</h2>
      ...
    </div>
  `,
})
```

- `cdkTrapFocus` : Tab et Shift+Tab bouclent **à l'intérieur** de l'élément.
- `[cdkTrapFocusAutoCapture]="true"` : déplace le focus dans la modale **à l'ouverture**, et le **restitue à l'élément déclencheur à la destruction** de la directive (fermeture). C'est ce retour de focus qui satisfait WCAG **2.4.3 Ordre de focus** (thématique RGAA **12 Navigation**).

Attention à ne pas confondre avec **2.1.2 Pas de piège au clavier** (A) : un *piège clavier* interdit, c'est une zone dont on **ne peut plus sortir du tout**. Une modale reste conforme car on en sort par Échap ou par un bouton — c'est un *maintien* de focus volontaire et réversible, pas un piège.

### 2.5 CDK a11y — annoncer : `LiveAnnouncer`

`LiveAnnouncer` est un service injectable qui pousse un message dans une région live gérée par le CDK. Signature vérifiée : `announce(message: string, politeness?: 'off' | 'polite' | 'assertive', duration?: number): Promise<void>`.

```typescript
import { inject } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';

export class Exemple {
  private annonceur = inject(LiveAnnouncer);

  retirer() {
    // ... logique métier
    this.annonceur.announce('Membre retiré de la famille.', 'polite');
  }
}
```

C'est l'outil idiomatique pour WCAG 4.1.3 : pas besoin de gérer une région `aria-live` à la main dans le template, le service garantit qu'elle préexiste.

### 2.6 CDK a11y — l'origine du focus : `FocusMonitor`

`FocusMonitor` distingue **comment** un élément a reçu le focus : `'keyboard'`, `'mouse'`, `'touch'`, `'program'` ou `null`. Utile pour n'afficher l'anneau de focus **qu'au clavier** en gardant une logique TypeScript.

```typescript
import { inject, ElementRef, OnDestroy } from '@angular/core';
import { FocusMonitor } from '@angular/cdk/a11y';

export class BoutonCustom implements OnDestroy {
  private focusMonitor = inject(FocusMonitor);
  private host = inject(ElementRef<HTMLElement>);

  constructor() {
    this.focusMonitor.monitor(this.host.nativeElement, true)
      .subscribe(origine => { /* 'keyboard' | 'mouse' | ... | null */ });
  }
  ngOnDestroy() {
    this.focusMonitor.stopMonitoring(this.host.nativeElement); // évite la fuite mémoire
  }
}
```

Chaque `monitor()` doit être appairé d'un `stopMonitoring()` au `ngOnDestroy`. Pour un simple style, `:focus-visible` en CSS suffit et couvre WCAG **2.4.7 Focus visible** (AA, thématique RGAA **10 Présentation**) ; `FocusMonitor` sert quand tu as besoin de la logique en TS.

### 2.7 Focus management dans un SPA

Un SPA ne recharge pas la page : après une navigation, le lecteur d'écran ne sait pas qu'on a « changé de page » et le focus reste où il était. Deux gestes :

1. **Un skip link** — un lien « Aller au contenu principal » en première position, visible au focus, qui cible le `<main id="contenu-principal" tabindex="-1">`. C'est WCAG **2.4.1 Contournement de blocs** (A), thématique RGAA **12 (critère lien d'évitement)**.
2. **Déplacer le focus** après navigation vers le titre `<h1 tabindex="-1">` de la nouvelle vue, avec `afterNextRender()` (le DOM de la vue cible n'existe pas encore au moment de l'événement de navigation).

`tabindex="-1"` rend un élément focusable **par programme** (`.focus()`) sans l'insérer dans l'ordre de tabulation naturel — exactement ce qu'il faut pour une cible de focus.

### 2.8 Composants composites : roving tabindex

Pour un groupe (onglets, menu, barre d'outils), le pattern ARIA veut **une seule** entrée dans l'ordre de tabulation : l'élément actif a `tabindex="0"`, les autres `tabindex="-1"`, et les flèches déplacent le focus **dans** le groupe (WAI-ARIA APG). C'est le **roving tabindex**. On le pilote très bien avec un `signal` pour l'index actif et `[attr.tabindex]` conditionnel.

### 2.9 Rattacher un écran à WCAG 2.1 AA / RGAA 4.1

Le RGAA 4.1 est la déclinaison française de WCAG 2.1 niveau AA. Il organise **13 thématiques** (Images, Couleurs, Liens, Scripts, Éléments obligatoires, Structuration, Présentation, Formulaires, Navigation, Consultation…) et **106 critères**. Un écran conforme = « chaque critère applicable est satisfait ». Repères utiles côté Angular :

| Exigence écran | Critère WCAG 2.1 | Thématique RGAA | Levier Angular |
|----------------|------------------|-----------------|----------------|
| Alternative sur image porteuse d'info | 1.1.1 (A) | 1 Images | `alt` / `[alt]`, `aria-label` |
| Structure de titres et régions | 1.3.1 (A) | 9 Structuration | `<h1>`–`<h6>`, `<nav>`, `<main>` |
| Contraste texte ≥ 4.5:1 | 1.4.3 (AA) | 3 Couleurs | CSS / tokens design |
| Tout au clavier | 2.1.1 (A) | 12 Navigation | `<button>`, `(keydown)` |
| Pas de piège clavier | 2.1.2 (A) | 12 Navigation | `cdkTrapFocus` réversible (Échap) |
| Lien d'évitement | 2.4.1 (A) | 12 Navigation | skip link + `<main tabindex="-1">` |
| Focus visible | 2.4.7 (AA) | 10 Présentation | `:focus-visible`, `FocusMonitor` |
| Erreurs de formulaire identifiées | 3.3.1 (A) | 11 Formulaires | `role="alert"`, `aria-describedby` |
| Nom / rôle / valeur exposés | 4.1.2 (A) | 7 Scripts | `role`, `[attr.aria-*]` |
| Messages d'état annoncés | 4.1.3 (AA) | 7 Scripts | `LiveAnnouncer` / `aria-live` |

> ⚠️ **FLAG-REVIEW RGAA** : les numéros de critères et de thématiques ci-dessus sont des repères d'apprentissage. Avant de les invoquer dans un audit officiel, Sylvain les recroise avec accessibilite.numerique.gouv.fr (certif oct 2026).

### 2.10 Tester l'accessibilité

Trois filets complémentaires (aucun ne remplace le test manuel clavier + lecteur d'écran, qui reste obligatoire) :

- **`@angular-eslint/template`** : règles a11y statiques à la compilation (`accessibility-alt-text`, `accessibility-label-for`, `click-events-have-key-events`, `no-positive-tabindex`…).
- **axe-core** via `@axe-core/playwright` : audit runtime d'une page rendue, avec filtrage par tags `wcag2a`, `wcag2aa`, `wcag21aa`.
- **Lighthouse** (catégorie *accessibility*), scriptable en CI, pour un score de non-régression.

L'audit automatique attrape environ 30–40 % des problèmes seulement : contraste, `alt` manquant, `label` manquant, ARIA invalide. Le focus, l'ordre logique, la pertinence des intitulés se vérifient **à la main**.

---

## 3. Worked examples

### Exemple 1 — La modale de confirmation, version conforme (TribuZen)

On reprend le cas concret et on le rend accessible de bout en bout.

```typescript
// confirm-retrait.component.ts — APRÈS (accessible)
import { Component, signal, inject } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { LiveAnnouncer } from '@angular/cdk/a11y';

@Component({
  selector: 'app-confirm-retrait',
  imports: [A11yModule],
  template: `
    @if (ouverte()) {
      <!-- overlay : clic dehors ou Échap ferme (2.1.2 : le focus n'est jamais piégé sans issue) -->
      <div class="overlay" (click)="annuler()" (keydown.escape)="annuler()">
        <!--
          role="dialog" + aria-modal : le lecteur annonce « boîte de dialogue »
          aria-labelledby pointe le titre → le dialogue est nommé (4.1.2)
          cdkTrapFocus : Tab boucle dans la modale
          cdkTrapFocusAutoCapture : focus posé dans la modale à l'ouverture,
            restitué au bouton déclencheur à la fermeture (2.4.3)
          stopPropagation : un clic DANS la modale ne la ferme pas
        -->
        <div class="modale" role="dialog" aria-modal="true"
             aria-labelledby="titre-retrait"
             cdkTrapFocus [cdkTrapFocusAutoCapture]="true"
             (click)="$event.stopPropagation()">
          <h2 id="titre-retrait">Retirer ce membre ?</h2>
          <p>Cette action retire le membre de la famille.</p>

          <!-- de VRAIS <button> : focusables, activables Entrée/Espace, annoncés « bouton » -->
          <div class="boutons">
            <button type="button" (click)="annuler()">Annuler</button>
            <button type="button" class="danger" (click)="confirmer()">Retirer</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmRetraitComponent {
  private annonceur = inject(LiveAnnouncer);
  ouverte = signal(false);

  ouvrir() { this.ouverte.set(true); }

  annuler() { this.ouverte.set(false); }

  confirmer() {
    // ... appel API de retrait (module 18) ...
    this.ouverte.set(false);
    // 4.1.3 : l'action, silencieuse à l'écran, est annoncée au lecteur d'écran
    this.annonceur.announce('Membre retiré de la famille.', 'polite');
  }
}
```

**Ce qui a été réparé, critère par critère :**
- `<div>` cliquables → `<button type="button">` : clavier (2.1.1) et nom/rôle (4.1.2).
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` : le dialogue est identifié et nommé.
- `cdkTrapFocus` + `cdkTrapFocusAutoCapture` : focus capturé à l'ouverture, bouclé pendant, **restitué** à la fermeture (2.4.3), sans devenir un piège (Échap ferme → 2.1.2 respecté).
- `LiveAnnouncer.announce(..., 'polite')` : le retrait, invisible pour un lecteur d'écran, est **annoncé** (4.1.3).

### Exemple 2 — L'app shell : skip link + annonce de navigation

Le composant racine de TribuZen doit rendre la navigation SPA accessible : lien d'évitement, annonce de la nouvelle page, focus sur son titre.

```typescript
// app.component.ts
import { Component, inject, afterNextRender, ElementRef, viewChild } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <!-- Skip link : premier élément focusable, caché hors focus, visible au focus (2.4.1) -->
    <a class="skip-link" href="#contenu-principal">Aller au contenu principal</a>

    <app-header />

    <!-- tabindex="-1" : cible focusable par programme, hors ordre de tabulation naturel -->
    <main id="contenu-principal" tabindex="-1" #contenu>
      <router-outlet />
    </main>
  `,
  styles: [`
    .skip-link {
      position: absolute; left: 0; top: -100%;
      padding: 8px 16px; background: #1a3c8a; color: #fff; z-index: 1000;
    }
    /* visible seulement quand il a le focus */
    .skip-link:focus { top: 0; }
  `],
})
export class AppComponent {
  private router = inject(Router);
  private titre = inject(Title);
  private annonceur = inject(LiveAnnouncer);
  private contenu = viewChild<ElementRef<HTMLElement>>('contenu');

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        // 4.1.3 : on annonce la nouvelle page au lecteur d'écran
        this.annonceur.announce(`Page ${this.titre.getTitle()}`, 'polite');

        // 2.4.3 : le nouveau DOM n'existe pas encore → afterNextRender attend le rendu,
        // puis on déplace le focus vers le conteneur principal.
        afterNextRender(() => this.contenu()?.nativeElement.focus());
      });
  }
}
```

**Pourquoi `afterNextRender` ?** L'événement `NavigationEnd` part **avant** que le composant de la route cible soit peint. Appeler `.focus()` tout de suite ciblerait un DOM absent. `afterNextRender` diffère le focus après le prochain rendu.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — `[aria-label]` au lieu de `[attr.aria-label]`

```typescript
// ❌ aria-label n'est pas une propriété DOM : le binding est ignoré / instable
template: `<button [aria-label]="libelle()">X</button>`

// ✅ ARIA se binde comme un ATTRIBUT
template: `<button [attr.aria-label]="libelle()">X</button>`
```

Tous les `aria-*` dynamiques passent par `[attr.aria-*]`. Pour retirer l'attribut, binde **`null`** (pas `''`) : `[attr.aria-describedby]="err() ? 'e' : null"`.

### PIÈGE #2 — `aria-hidden` sur du contenu informatif ou focusable

```html
<!-- ❌ le texte disparaît pour le lecteur d'écran alors qu'il porte l'info -->
<span aria-hidden="true">Solde : 42 €</span>

<!-- ❌ pire : un élément focusable caché de l'arbre → focus « fantôme » -->
<button aria-hidden="true">Valider</button>

<!-- ✅ aria-hidden seulement sur du décoratif qui double un texte déjà lisible -->
<button><span aria-hidden="true">✓</span> Valider</button>
```

`aria-hidden="true"` retire de l'arbre d'accessibilité : jamais sur de l'info, jamais sur un focusable.

### PIÈGE #3 — `disabled` sur le bouton de soumission au lieu de `aria-disabled`

```typescript
// ❌ disabled retire le bouton de l'ordre de tabulation : l'utilisateur clavier
//    ne peut plus l'atteindre pour comprendre POURQUOI il est bloqué
template: `<button type="submit" [disabled]="form.invalid">Envoyer</button>`

// ✅ aria-disabled : le bouton reste focusable et annoncé « indisponible »,
//    on bloque l'action dans le handler
template: `<button type="submit" [attr.aria-disabled]="form.invalid()"
             (click)="soumettre()">Envoyer</button>`
```

Un bouton `disabled` natif est parfois acceptable, mais pour un submit dont l'état bloqué doit rester **découvrable** au clavier, `aria-disabled` + garde dans le handler est préférable.

### PIÈGE #4 — Redéfinir le rôle natif d'un composant Material

```html
<!-- ❌ mat-select expose déjà role="listbox" : le forcer en menu CASSE le pattern ARIA
     (navigation, annonce de sélection) que Material fournissait gratuitement -->
<mat-select role="menu">...</mat-select>

<!-- ✅ on laisse Material gérer son rôle -->
<mat-select aria-label="Choisir un rôle">...</mat-select>
```

Les composants Material (module 21) implémentent déjà les patterns WAI-ARIA. Écraser leur `role`, c'est régresser.

### PIÈGE #5 — `outline: none` sans focus visible de remplacement

```css
/* ❌ supprime l'anneau de focus : casse WCAG 2.4.7 (AA) — l'utilisateur clavier est perdu */
button:focus { outline: none; }

/* ✅ style de focus explicite et contrasté (≥ 3:1, 1.4.11) */
button:focus-visible { outline: 3px solid #1a3c8a; outline-offset: 2px; }
```

`:focus-visible` cible le focus **clavier** sans imposer l'anneau au clic souris — l'équivalent CSS de `FocusMonitor`.

### PIÈGE #6 — Le `placeholder` comme seul label

```html
<!-- ❌ le placeholder disparaît à la saisie et n'est pas un label fiable (11 Formulaires) -->
<input type="email" placeholder="Email" />

<!-- ✅ un vrai label associé -->
<label for="email">Email</label>
<input id="email" type="email" />
```

Chaque champ a un `<label>` associé (`for`/`id`) ou, à défaut, un `aria-label` / `aria-labelledby`. Le placeholder n'est jamais un substitut.

### PIÈGE #7 — Croire que le score axe/Lighthouse à 100 = « accessible »

Un audit automatique ne détecte qu'une fraction des critères (~30–40 %). Un `100` Lighthouse ne prouve **pas** la conformité RGAA : l'ordre de focus, la pertinence des intitulés, la navigation clavier réelle et l'écoute au lecteur d'écran restent des vérifications **manuelles** obligatoires.

---

## 5. Ancrage TribuZen

L'accessibilité est une **couche transverse** du front-office TribuZen — un critère de définition de « fini » pour chaque écran, pas une option. Les points d'ancrage concrets :

- **`ConfirmRetraitComponent`** (Exemple 1) — la modale de confirmation : `cdkTrapFocus`, `role="dialog"`, `LiveAnnouncer` pour annoncer le retrait. Réutilisée pour toute confirmation destructive (quitter une famille, supprimer une sortie).
- **`AppComponent`** (Exemple 2) — l'app shell : skip link + annonce de navigation + focus sur le contenu à chaque changement de route.
- **`ProfilFamilleComponent`** — les onglets du profil (Général / Membres / Sorties) en **roving tabindex** piloté par un `signal` d'index actif.
- **Formulaires** (invitation d'un membre, création de sortie) : `<label>` associés, erreurs en `role="alert"` liées par `aria-describedby` (module 20 pour les patterns, ici la couche a11y).

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    app/
      app.component.ts                     ← Exemple 2 (skip link + annonce navigation)
      shared/
        confirm-retrait.component.ts       ← Exemple 1 (cdkTrapFocus + LiveAnnouncer)
      famille/
        profil-famille.component.ts        ← onglets roving tabindex
```

> Le CI de TribuZen fait tourner axe-core (`@axe-core/playwright`) + Lighthouse a11y sur les pages clés à chaque push — mais le passage manuel clavier + lecteur d'écran reste la validation finale (cf. certif RGAA de Sylvain, oct 2026).

---

## 6. Points clés

1. **HTML natif d'abord, ARIA en dernier recours** : `<button>`, `<nav>`, `<main>`, `<label>` avant tout `role`/`tabindex` custom.
2. Les ARIA dynamiques se bindent avec **`[attr.aria-*]`** (pas `[aria-*]`) ; valeur `null` pour retirer l'attribut.
3. `cdkTrapFocus` + `[cdkTrapFocusAutoCapture]="true"` piègent le focus d'une modale à l'ouverture **et le restituent** au déclencheur à la fermeture (WCAG 2.4.3), sans devenir un piège clavier (Échap ferme — 2.1.2).
4. `LiveAnnouncer.announce(msg, 'polite' | 'assertive')` annonce un changement invisible au lecteur d'écran (WCAG 4.1.3, RGAA thématique 7).
5. Dans un SPA : **skip link** vers `<main tabindex="-1">` (2.4.1) et **focus programmatique** après navigation via `afterNextRender`.
6. `FocusMonitor.monitor()` donne l'origine du focus ; toujours l'appairer d'un `stopMonitoring()` au `ngOnDestroy`. Pour un simple style, `:focus-visible` suffit (2.4.7).
7. Un composant composite (onglets/menu) utilise le **roving tabindex** : un seul `tabindex="0"`, flèches pour naviguer dans le groupe.
8. Le RGAA 4.1 = WCAG 2.1 AA en 13 thématiques / 106 critères ; l'audit automatique (axe, Lighthouse) ne couvre qu'une partie — le test manuel clavier + lecteur d'écran reste obligatoire.

---

## 7. Seeds Anki

```
En Angular, comment binder un attribut ARIA dynamique comme aria-invalid ?|Avec [attr.aria-*], pas [aria-*] : les ARIA sont des attributs, pas des propriétés DOM. Ex : [attr.aria-invalid]="champInvalide()". Pour retirer l'attribut, binder null (pas '').
À quoi servent cdkTrapFocus et cdkTrapFocusAutoCapture ?|cdkTrapFocus fait boucler Tab/Shift+Tab dans la zone (modale). cdkTrapFocusAutoCapture pose le focus dans la zone à l'ouverture et le restitue à l'élément déclencheur à la fermeture (WCAG 2.4.3).
Une modale avec cdkTrapFocus viole-t-elle WCAG 2.1.2 (pas de piège clavier) ?|Non : un piège clavier interdit est une zone dont on ne peut PLUS sortir. La modale se ferme par Échap ou un bouton, donc le maintien de focus est réversible et volontaire — conforme.
Comment annoncer un changement au lecteur d'écran en Angular sans gérer aria-live à la main ?|Injecter LiveAnnouncer et appeler announce(message, 'polite'|'assertive'). Le service maintient une région live préexistante — correspond à WCAG 4.1.3 Messages d'état (AA).
Pourquoi déplacer le focus après une navigation SPA, et avec quel outil ?|Un SPA ne recharge pas la page : le lecteur d'écran et le focus ne suivent pas. On pose le focus sur le <h1>/<main tabindex="-1"> via afterNextRender (le DOM de la vue cible n'existe pas encore au NavigationEnd). Complète le skip link (WCAG 2.4.1).
Pourquoi ne pas mettre aria-hidden="true" sur un bouton ou un texte informatif ?|aria-hidden le retire de l'arbre d'accessibilité : le texte devient invisible au lecteur d'écran, et un focusable caché crée un focus « fantôme ». Réservé au décoratif qui double un texte déjà lisible.
disabled ou aria-disabled sur un bouton submit bloqué ?|disabled retire le bouton de l'ordre de tabulation : l'utilisateur clavier ne peut plus l'atteindre. aria-disabled le garde focusable et annoncé « indisponible » ; on bloque l'action dans le handler.
Un score Lighthouse a11y à 100 prouve-t-il la conformité RGAA ?|Non. L'audit automatique (axe, Lighthouse) ne couvre que ~30-40 % des critères (contraste, alt, label, ARIA invalide). L'ordre de focus, la pertinence des intitulés et la navigation clavier se testent à la main.
```

---

## Pont vers le lab

> Lab associé : `labs/lab-22-accessibilite/README.md`. Rendre la modale de confirmation TribuZen conforme (HTML sémantique + `cdkTrapFocus` + `LiveAnnouncer`), puis auditer la page au clavier et avec `@axe-core/playwright` — dev server Angular comme oracle, corrigé commenté intégral.
