# Correction — Exercice 09 : Theme et injection de dependances

## Resultat attendu

Une page avec :
- Un bouton pour basculer entre theme clair et sombre
- Les couleurs de fond et de texte changent dynamiquement dans tous les composants
- Un composant enfant qui partage le meme theme (meme instance du service)
- Un composant avec override qui a son propre theme independant

## Code corrige

### ThemeService

```typescript
// src/app/exercises/ex09/theme.service.ts

import { Injectable, signal, computed } from '@angular/core';

// --- Interface pour les couleurs du theme ---
// On type strictement l'objet de couleurs pour eviter les fautes de frappe
export interface ThemeColors {
  bg: string;
  text: string;
  primary: string;
}

// --- Type pour les themes disponibles ---
export type ThemeMode = 'light' | 'dark';

// --- Decorateur @Injectable ---
// providedIn: 'root' → Angular cree UNE seule instance de ce service (singleton)
// Cette instance est partagee par tous les composants qui l'injectent
// Exception : si un composant declare providers: [ThemeService], il obtient sa propre instance
@Injectable({
  providedIn: 'root',
})
export class ThemeService {

  // --- Signal theme ---
  // Le mode de theme courant, mutable
  readonly theme = signal<ThemeMode>('light');

  // --- Computed isDark ---
  // Booleen pratique pour les conditions dans les templates
  readonly isDark = computed<boolean>(() => this.theme() === 'dark');

  // --- Computed colors ---
  // Retourne les couleurs correspondant au theme actif
  // Se recalcule automatiquement quand theme() change
  readonly colors = computed<ThemeColors>(() => {
    if (this.theme() === 'dark') {
      return {
        bg: '#1e1e1e',
        text: '#e0e0e0',
        primary: '#90caf9',
      };
    }
    return {
      bg: '#ffffff',
      text: '#333333',
      primary: '#1976d2',
    };
  });

  // --- Methode toggle ---
  // Bascule entre les deux themes
  toggle(): void {
    this.theme.update((current) => (current === 'light' ? 'dark' : 'light'));
  }

  // --- Bonus : persistence localStorage ---
  // Uncomment pour activer la persistance
  // constructor() {
  //   // Restaurer le theme depuis localStorage au demarrage
  //   const saved = localStorage.getItem('theme') as ThemeMode | null;
  //   if (saved === 'light' || saved === 'dark') {
  //     this.theme.set(saved);
  //   }
  //
  //   // Sauvegarder le theme a chaque changement
  //   effect(() => {
  //     localStorage.setItem('theme', this.theme());
  //   });
  // }
}
```

### ThemeCardComponent (enfant)

```typescript
// src/app/exercises/ex09/theme-card.component.ts

import { Component, inject } from '@angular/core';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-theme-card',
  standalone: true,
  imports: [],
  template: `
    <div
      class="card"
      [style.backgroundColor]="themeService.colors().bg"
      [style.color]="themeService.colors().text"
      [style.borderColor]="themeService.colors().primary"
    >
      <h3 [style.color]="themeService.colors().primary">Carte enfant</h3>
      <p>
        Ce composant utilise le <strong>meme ThemeService</strong> que le parent.
      </p>
      <p>
        Theme actuel : <strong>{{ themeService.theme() }}</strong>
      </p>
      <p>
        Mode sombre : {{ themeService.isDark() ? 'Oui' : 'Non' }}
      </p>
    </div>
  `,
  styles: [`
    .card {
      padding: 1rem;
      border: 2px solid;
      border-radius: 8px;
      margin-top: 1rem;
      transition: all 0.3s ease;
    }
    h3 { margin-top: 0; }
  `]
})
export class ThemeCardComponent {
  // --- Injection de ThemeService ---
  // inject() est la fonction moderne pour injecter des dependances (Angular 14+)
  // Elle remplace l'injection par constructeur : constructor(private themeService: ThemeService)
  // Le service est le MEME singleton que celui du parent (providedIn: 'root')
  readonly themeService = inject(ThemeService);
}
```

### ThemeOverrideComponent (avec provider local)

```typescript
// src/app/exercises/ex09/theme-override.component.ts

import { Component, inject } from '@angular/core';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-theme-override',
  standalone: true,
  imports: [],
  // --- providers au niveau composant ---
  // En declarant ThemeService ici, Angular cree une NOUVELLE instance
  // Ce composant et ses enfants utiliseront cette instance locale
  // Le theme de ce composant est INDEPENDANT du theme global
  providers: [ThemeService],
  template: `
    <div
      class="override-card"
      [style.backgroundColor]="themeService.colors().bg"
      [style.color]="themeService.colors().text"
      [style.borderColor]="themeService.colors().primary"
    >
      <h3 [style.color]="themeService.colors().primary">
        Composant avec instance locale
      </h3>
      <p>
        Ce composant a sa <strong>propre instance</strong> de ThemeService.
      </p>
      <p>
        Theme local : <strong>{{ themeService.theme() }}</strong>
      </p>

      <!-- Ce bouton ne change que le theme LOCAL, pas le theme global -->
      <button
        (click)="themeService.toggle()"
        [style.backgroundColor]="themeService.colors().primary"
        [style.color]="themeService.colors().bg"
      >
        Basculer le theme LOCAL
      </button>
    </div>
  `,
  styles: [`
    .override-card {
      padding: 1rem;
      border: 2px dashed;
      border-radius: 8px;
      margin-top: 1rem;
      transition: all 0.3s ease;
    }
    h3 { margin-top: 0; }
    button {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      margin-top: 0.5rem;
    }
  `]
})
export class ThemeOverrideComponent {
  // inject() ici recoit l'instance LOCALE declaree dans providers
  // PAS le singleton global
  readonly themeService = inject(ThemeService);
}
```

### ThemeDemoComponent (parent principal)

```typescript
// src/app/exercises/ex09/theme-demo.component.ts

import { Component, inject } from '@angular/core';
import { ThemeService } from './theme.service';
import { ThemeCardComponent } from './theme-card.component';
import { ThemeOverrideComponent } from './theme-override.component';

@Component({
  selector: 'app-theme-demo',
  standalone: true,
  // On importe les composants enfants pour les utiliser dans le template
  imports: [ThemeCardComponent, ThemeOverrideComponent],
  template: `
    <div
      class="theme-container"
      [style.backgroundColor]="themeService.colors().bg"
      [style.color]="themeService.colors().text"
    >
      <h1 [style.color]="themeService.colors().primary">
        Gestion de theme avec DI
      </h1>

      <!-- Bouton de bascule du theme global -->
      <button
        class="toggle-btn"
        (click)="themeService.toggle()"
        [style.backgroundColor]="themeService.colors().primary"
        [style.color]="themeService.colors().bg"
      >
        {{ themeService.isDark() ? 'Passer en clair' : 'Passer en sombre' }}
      </button>

      <p>Theme global actuel : <strong>{{ themeService.theme() }}</strong></p>

      <!-- Composant enfant : partage le meme ThemeService (singleton) -->
      <app-theme-card />

      <!-- Composant avec override : a sa propre instance de ThemeService -->
      <app-theme-override />

      <p class="explanation">
        Le composant "Carte enfant" suit le theme global car il utilise le
        singleton. Le composant "Instance locale" a sa propre instance grace a
        <code>providers: [ThemeService]</code> dans son decorateur.
      </p>
    </div>
  `,
  styles: [`
    .theme-container {
      padding: 2rem;
      min-height: 100vh;
      font-family: sans-serif;
      transition: all 0.3s ease;
    }
    .toggle-btn {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s ease;
    }
    .toggle-btn:hover {
      opacity: 0.9;
    }
    .explanation {
      margin-top: 2rem;
      font-size: 0.9rem;
      font-style: italic;
      opacity: 0.8;
    }
    code {
      background: rgba(128, 128, 128, 0.2);
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
    }
  `]
})
export class ThemeDemoComponent {
  // --- Injection du ThemeService global ---
  // Ici on recoit le singleton (providedIn: 'root')
  // Comme on ne declare pas de providers local, c'est l'instance globale
  readonly themeService = inject(ThemeService);
}
```

## Ce que tu aurais pu oublier

### 1. Oublier `providedIn: 'root'` sur le service
- ❌ `@Injectable()` sans `providedIn` → le service n'est pas disponible sans declaration manuelle
- ✅ `@Injectable({ providedIn: 'root' })` → Angular cree un singleton automatiquement

### 2. Confondre singleton et instance locale
- ❌ Croire que `providers: [ThemeService]` modifie le singleton → non, ca cree une nouvelle instance
- ✅ Comprendre que `providers` au niveau composant cree une instance locale pour ce composant et ses enfants

### 3. Utiliser l'injection par constructeur
- ❌ `constructor(private themeService: ThemeService)` → fonctionne mais ancienne syntaxe
- ✅ `themeService = inject(ThemeService)` → syntaxe moderne Angular 14+

### 4. Ne pas typer l'objet de couleurs
- ❌ Retourner `{ bg: '...', text: '...' }` sans interface → pas de completion automatique
- ✅ Definir `interface ThemeColors` et typer le computed `computed<ThemeColors>(...)`

### 5. Oublier le `readonly` sur les injections
- ❌ `themeService = inject(ThemeService)` sans `readonly` → on pourrait reassigner par erreur
- ✅ `readonly themeService = inject(ThemeService)` → protege contre la reassignation

## Concepts cles utilises

| Concept | Explication |
|---------|-------------|
| `@Injectable({ providedIn: 'root' })` | Declare un service singleton disponible dans toute l'application |
| `inject(Service)` | Fonction moderne pour injecter un service (remplace l'injection par constructeur) |
| Singleton | Une seule instance partagee par tous les composants qui l'injectent |
| `providers: [Service]` au composant | Cree une instance locale du service pour ce composant et ses descendants |
| Injection hierarchique | Angular cherche le provider en remontant l'arbre des composants |
| Signaux dans un service | Les signaux dans un service permettent un etat reactif partage |
| `computed` dans un service | Les valeurs derivees dans un service sont accessibles par tous les consommateurs |
