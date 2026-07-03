# Lab 22 — Accessibilité : modale conforme + audit a11y

> **Outcome :** à la fin, tu sais rendre une modale de confirmation Angular **accessible** (HTML sémantique, `role="dialog"`, `cdkTrapFocus`, `LiveAnnouncer`) et **prouver** sa conformité au clavier et avec `@axe-core/playwright`.
> **Vrai outil :** Angular CLI 19 + `ng serve` (oracle visuel + clavier) et `@axe-core/playwright` (audit WCAG runtime). Aucun harnais simulé.
> **Feedback :** le coach valide en session — au clavier et au lecteur d'écran, pas via un auto-correcteur.

---

## Énoncé

Tu pars de la modale de confirmation **inaccessible** de TribuZen (l'écran « Retirer un membre ») et tu la rends conforme WCAG 2.1 AA. Cahier des charges **exact** :

1. La modale utilise de **vrais `<button>`** (pas des `<div>` cliquables).
2. Elle porte `role="dialog"`, `aria-modal="true"` et un `aria-labelledby` qui pointe son titre (`<h2 id="...">`).
3. À l'ouverture, le focus se pose **dans** la modale ; la touche **Tab** y **boucle** (ne s'échappe pas derrière l'overlay).
4. **Échap** ferme la modale, et à la fermeture le focus **revient** sur le bouton « Retirer » qui l'avait ouverte.
5. À la confirmation, un `LiveAnnouncer` annonce « Membre retiré de la famille. » en mode `polite`.
6. Un clic sur l'overlay (hors modale) ferme ; un clic **dans** la modale ne ferme pas.

**Contraintes techniques :**
- `cdkTrapFocus` + `[cdkTrapFocusAutoCapture]="true"` pour les points 3 et 4 (n'implémente pas le trap de focus à la main).
- ARIA dynamique en `[attr.aria-*]` si tu en ajoutes.
- Aucune régression de focus visible : les boutons gardent un anneau de focus (`:focus-visible`).

**Pas de gap-fill** — tu écris le composant complet à partir du starter ci-dessous, qui est la version **cassée** à réparer.

### Starter (version inaccessible à réparer)

Dans un projet Angular 19 (`ng new tribuzen-labs --standalone`), assure-toi d'avoir le CDK :

```bash
npm install @angular/cdk
ng generate component shared/confirm-retrait
```

`src/app/shared/confirm-retrait/confirm-retrait.component.ts` — **point de départ cassé** :

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-confirm-retrait',
  standalone: true,
  template: `
    @if (ouverte()) {
      <div class="overlay">
        <div class="modale">
          <div class="titre">Retirer ce membre ?</div>
          <p>Cette action retire le membre de la famille.</p>
          <div class="boutons">
            <div class="btn" (click)="annuler()">Annuler</div>
            <div class="btn danger" (click)="confirmer()">Retirer</div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5);
               display: grid; place-items: center; }
    .modale { background: #fff; padding: 1.5rem; border-radius: 8px; min-width: 320px; }
    .boutons { display: flex; gap: .5rem; margin-top: 1rem; }
  `],
})
export class ConfirmRetraitComponent {
  ouverte = signal(false);
  ouvrir() { this.ouverte.set(true); }
  annuler() { this.ouverte.set(false); }
  confirmer() { this.ouverte.set(false); }
}
```

Branche-la dans un composant hôte avec un bouton déclencheur (nécessaire pour vérifier le **retour de focus**) :

```typescript
// app.component.ts (hôte minimal)
import { Component, viewChild } from '@angular/core';
import { ConfirmRetraitComponent } from './shared/confirm-retrait/confirm-retrait.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ConfirmRetraitComponent],
  template: `
    <button (click)="modale().ouvrir()">Retirer Alice</button>
    <app-confirm-retrait #modale />
  `,
})
export class AppComponent {
  modale = viewChild.required(ConfirmRetraitComponent);
}
```

Lance `ng serve` et **teste au clavier avant de coder** : ouvre la modale, appuie sur Tab plusieurs fois — tu verras le focus s'échapper derrière l'overlay. C'est le bug à corriger.

---

## Étapes (en friction)

1. **Remplace les `<div>` cliquables par des `<button type="button">`.** Reteste au clavier : les boutons deviennent focusables et activables à Entrée/Espace.
2. **Ajoute la sémantique de dialogue** sur le conteneur : `role="dialog"`, `aria-modal="true"`, `aria-labelledby="titre-retrait"`, et transforme le titre en `<h2 id="titre-retrait">`.
3. **Importe `A11yModule`** dans le composant et ajoute `cdkTrapFocus [cdkTrapFocusAutoCapture]="true"` sur la modale. Reteste : Tab boucle dans la modale, le focus y entre à l'ouverture.
4. **Ferme sur Échap** — ajoute `(keydown.escape)="annuler()"` sur l'overlay. Vérifie qu'à la fermeture le focus **revient** sur « Retirer Alice » (c'est `cdkTrapFocusAutoCapture` qui le fait).
5. **Ferme au clic sur l'overlay, pas dans la modale** : `(click)="annuler()"` sur l'overlay + `(click)="$event.stopPropagation()"` sur la modale.
6. **Annonce le retrait** — injecte `LiveAnnouncer` et, dans `confirmer()`, appelle `announce('Membre retiré de la famille.', 'polite')`.
7. **Garde le focus visible** — ajoute `button:focus-visible { outline: 3px solid #1a3c8a; outline-offset: 2px; }`.
8. **Audit clavier** (manuel) : ouvrir → Tab boucle → Échap ferme → focus revient sur le déclencheur. Puis **audit axe** (étape suivante).

### Audit axe-core (Playwright)

```bash
npm install -D @playwright/test @axe-core/playwright
npx playwright install chromium
```

`tests/a11y.spec.ts` — **écris ce test toi-même** (c'est le vrai outil, pas un harnais maison) :

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('la modale de retrait respecte WCAG 2.1 AA', async ({ page }) => {
  await page.goto('http://localhost:4200');
  await page.getByRole('button', { name: 'Retirer Alice' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const resultats = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(resultats.violations).toEqual([]);
});
```

Lance `ng serve` dans un terminal, puis `npx playwright test` dans un autre. Le test doit passer **après** ta correction et échouer sur le starter.

---

## Corrigé complet commenté

```typescript
// src/app/shared/confirm-retrait/confirm-retrait.component.ts — corrigé
import { Component, signal, inject } from '@angular/core';
import { A11yModule, LiveAnnouncer } from '@angular/cdk/a11y';

@Component({
  selector: 'app-confirm-retrait',
  standalone: true,
  imports: [A11yModule], // fournit la directive cdkTrapFocus
  template: `
    @if (ouverte()) {
      <!--
        overlay : clic dehors OU Échap ferme.
        (keydown.escape) satisfait « une issue clavier » → pas de piège (WCAG 2.1.2).
      -->
      <div class="overlay" (click)="annuler()" (keydown.escape)="annuler()">
        <!--
          role="dialog" + aria-modal="true" : annoncé « boîte de dialogue modale »
          aria-labelledby → le dialogue est NOMMÉ par son titre (WCAG 4.1.2)
          cdkTrapFocus : Tab/Shift+Tab bouclent dans la modale
          cdkTrapFocusAutoCapture : focus posé dans la modale à l'ouverture,
            RESTITUÉ au bouton déclencheur à la fermeture (WCAG 2.4.3)
          stopPropagation : un clic DANS la modale ne remonte pas à l'overlay → ne ferme pas
        -->
        <div class="modale" role="dialog" aria-modal="true"
             aria-labelledby="titre-retrait"
             cdkTrapFocus [cdkTrapFocusAutoCapture]="true"
             (click)="$event.stopPropagation()">
          <h2 id="titre-retrait">Retirer ce membre ?</h2>
          <p>Cette action retire le membre de la famille.</p>

          <!-- de VRAIS <button> : focusables + Entrée/Espace + annoncés « bouton » (2.1.1 / 4.1.2) -->
          <div class="boutons">
            <button type="button" (click)="annuler()">Annuler</button>
            <button type="button" class="danger" (click)="confirmer()">Retirer</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5);
               display: grid; place-items: center; }
    .modale { background: #fff; padding: 1.5rem; border-radius: 8px; min-width: 320px; }
    .boutons { display: flex; gap: .5rem; margin-top: 1rem; }
    .danger { background: #b3261e; color: #fff; }
    /* Focus visible au clavier uniquement, contrasté ≥ 3:1 (WCAG 2.4.7 / 1.4.11) */
    button:focus-visible { outline: 3px solid #1a3c8a; outline-offset: 2px; }
  `],
})
export class ConfirmRetraitComponent {
  // LiveAnnouncer : pousse un message dans une région aria-live gérée par le CDK
  private annonceur = inject(LiveAnnouncer);
  ouverte = signal(false);

  ouvrir() { this.ouverte.set(true); }

  annuler() { this.ouverte.set(false); }

  confirmer() {
    // ... en vrai produit : appel API de retrait (module 18) ...
    this.ouverte.set(false);
    // WCAG 4.1.3 : l'action est silencieuse à l'écran → on l'annonce au lecteur d'écran
    this.annonceur.announce('Membre retiré de la famille.', 'polite');
  }
}
```

**Pourquoi ce corrigé est correct :**
- **Sémantique** : `<button type="button">` remplace les `<div>` → focusable, activable Entrée/Espace, exposé comme « bouton » (WCAG 2.1.1, 4.1.2). `type="button"` évite une soumission de formulaire accidentelle.
- **Dialogue nommé** : `role="dialog"` + `aria-modal="true"` + `aria-labelledby` → le lecteur d'écran annonce l'ouverture et le titre.
- **Focus** : `cdkTrapFocus` boucle Tab dans la modale ; `cdkTrapFocusAutoCapture` capture le focus à l'ouverture et le **restitue** au déclencheur à la fermeture (WCAG 2.4.3) — c'est pour ça que l'hôte a besoin d'un vrai bouton déclencheur.
- **Pas de piège** : Échap et le bouton Annuler donnent une issue → le maintien de focus est réversible (WCAG 2.1.2).
- **Annonce** : `LiveAnnouncer.announce(..., 'polite')` couvre WCAG 4.1.3 sans qu'on gère une région `aria-live` à la main.
- **Focus visible** : `:focus-visible` garde l'anneau au clavier sans l'imposer au clic souris (WCAG 2.4.7).

> Le test `@axe-core/playwright` détecte les manques structurels (rôle, nom, contraste) mais **pas** le retour de focus ni le bouclage de Tab : ces deux points se vérifient **à la main** au clavier. L'audit auto ne remplace jamais le test clavier.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées.** Reproduis la modale accessible **de mémoire, en 30 minutes**, avec ces ajouts :

1. Ajoute un **deuxième bouton dangereux** « Retirer et bannir » (trois boutons focusables au total) et vérifie que le bouclage Tab passe bien par les trois puis revient au premier.
2. Annonce l'ouverture **et** la fermeture : à l'ouverture, `announce('Boîte de dialogue de confirmation ouverte.', 'assertive')` ; à la confirmation, garde l'annonce `polite` du retrait.
3. Écris **un second test axe** qui vérifie qu'après Échap la modale n'est plus dans le DOM (`await expect(page.getByRole('dialog')).toHaveCount(0)`).
4. **Sans rouvrir ce corrigé** ni le module 22.

**Critère de réussite :** au clavier seul, tu ouvres, tu tabules dans les trois boutons en boucle, tu fermes par Échap, et le focus revient sur le déclencheur — le tout sans souris. `npx playwright test` reste vert.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, la modale vit ici :

```
tribuzen/
  src/
    app/
      shared/
        confirm-retrait.component.ts   ← ce lab (réutilisé pour toute confirmation destructive)
  tests/
    a11y.spec.ts                       ← audit axe-core des pages clés
```

**Différences par rapport au lab :**
- Le message annoncé sera **paramétré** par un `input()` (module 05) : « Membre retiré », « Sortie supprimée », « Famille quittée » selon l'appelant.
- Le retrait réel déclenchera un appel HTTP (`resource` / service, modules 10 & 18) au lieu du `set(false)` immédiat.
- Le style passera par les tokens du design system TribuZen plutôt que du CSS inline — mais la couche a11y (rôles, trap de focus, annonce) reste **identique**.
- L'audit axe tournera en CI (GitHub Actions) sur les pages clés, en plus du test local.

**Commit cible :**
```
feat(shared): ConfirmRetrait a11y — role dialog, cdkTrapFocus, LiveAnnouncer + test axe
```
