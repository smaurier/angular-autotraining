# Correction — Exercice 06 : Chronometre

## Resultat attendu

Un chronometre affichant :
- Le temps au format `00:00:00` (MM:SS:ms)
- Un bouton Start/Stop pour demarrer et arreter
- Un bouton Reset pour remettre a zero
- Le chronometre se met a jour toutes les 10ms
- L'intervalle est proprement nettoye a la destruction du composant

## Code corrige

```typescript
// src/app/exercises/ex06/stopwatch.component.ts

// DestroyRef : reference au cycle de destruction du composant
// inject : fonction pour injecter des dependances (alternative au constructeur)
import { Component, signal, computed, inject, DestroyRef } from '@angular/core';

// --- Interface pour les tours (bonus) ---
interface Lap {
  number: number;
  time: string;       // temps formate du tour
  elapsedMs: number;  // temps total en ms au moment du tour
}

@Component({
  selector: 'app-stopwatch',
  standalone: true,
  imports: [],
  template: `
    <div class="stopwatch-container">
      <h1>Chronometre</h1>

      <!-- Affichage du temps formate -->
      <div class="display">
        {{ formattedTime() }}
      </div>

      <!-- Boutons de controle -->
      <div class="controls">
        <!-- Start et Stop sont mutuellement exclusifs -->
        @if (!isRunning()) {
          <button class="start" (click)="start()">Start</button>
        } @else {
          <button class="stop" (click)="stop()">Stop</button>
        }

        <!-- Bouton Tour (bonus) : visible seulement quand le chrono tourne -->
        @if (isRunning()) {
          <button class="lap" (click)="addLap()">Tour</button>
        }

        <!-- Reset toujours visible, desactive si deja a 0 et arrete -->
        <button
          class="reset"
          (click)="reset()"
          [disabled]="elapsedMs() === 0 && !isRunning()"
        >
          Reset
        </button>
      </div>

      <!-- Liste des tours (bonus) -->
      @if (laps().length > 0) {
        <div class="laps">
          <h3>Tours</h3>
          <ul>
            @for (lap of laps(); track lap.number) {
              <li>
                <span class="lap-number">Tour {{ lap.number }}</span>
                <span class="lap-time">{{ lap.time }}</span>
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [`
    .stopwatch-container {
      padding: 2rem;
      max-width: 400px;
      font-family: sans-serif;
      text-align: center;
    }
    .display {
      font-size: 4rem;
      font-weight: bold;
      font-family: 'Courier New', monospace;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 8px;
      margin: 1rem 0;
      letter-spacing: 2px;
    }
    .controls {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin: 1rem 0;
    }
    .controls button {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      color: white;
      font-weight: bold;
    }
    .start { background: #2e7d32; }
    .stop { background: #c62828; }
    .lap { background: #1976d2; }
    .reset { background: #757575; }
    .controls button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .laps {
      text-align: left;
      margin-top: 1.5rem;
    }
    .laps h3 { margin-bottom: 0.5rem; }
    .laps ul {
      list-style: none;
      padding: 0;
    }
    .laps li {
      display: flex;
      justify-content: space-between;
      padding: 0.4rem 0;
      border-bottom: 1px solid #eee;
    }
    .lap-number { color: #666; }
    .lap-time {
      font-family: 'Courier New', monospace;
      font-weight: bold;
    }
  `]
})
export class StopwatchComponent {

  // --- Injection de DestroyRef ---
  // DestroyRef permet d'enregistrer des callbacks de nettoyage
  // Quand le composant est detruit, toutes les callbacks sont executees
  // C'est l'equivalent de onUnmounted() en Vue 3
  private readonly destroyRef = inject(DestroyRef);

  // --- Signal elapsedMs ---
  // Nombre de millisecondes ecoulees depuis le dernier reset
  readonly elapsedMs = signal<number>(0);

  // --- Signal isRunning ---
  // Indique si le chronometre est en cours d'execution
  readonly isRunning = signal<boolean>(false);

  // --- Signal laps (bonus) ---
  // Liste des temps de passage enregistres
  readonly laps = signal<Lap[]>([]);

  // --- Reference a l'intervalle ---
  // On type avec ReturnType<typeof setInterval> pour compatibilite navigateur/Node
  // Initialement null car aucun intervalle n'est en cours
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // --- Computed formattedTime ---
  // Transforme les millisecondes en format lisible MM:SS:ms
  readonly formattedTime = computed<string>(() => {
    const elapsed = this.elapsedMs();

    // Calcul des minutes : division entiere par 60000 (60 * 1000)
    const minutes = Math.floor(elapsed / 60000);

    // Calcul des secondes : reste apres les minutes, divise par 1000
    const seconds = Math.floor((elapsed % 60000) / 1000);

    // Calcul des centiemes : reste apres les secondes, divise par 10
    // On divise par 10 pour obtenir 2 chiffres (0-99) au lieu de 3 (0-999)
    const centiseconds = Math.floor((elapsed % 1000) / 10);

    // padStart(2, '0') : ajoute un zero devant si necessaire (ex: 5 → "05")
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    const ms = String(centiseconds).padStart(2, '0');

    return `${mm}:${ss}:${ms}`;
  });

  constructor() {
    // --- Nettoyage avec DestroyRef ---
    // On enregistre une callback qui sera executee quand le composant est detruit
    // Cela garantit que l'intervalle est arrete meme si l'utilisateur navigue ailleurs
    // Sans ce nettoyage, l'intervalle continuerait a tourner en arriere-plan (fuite memoire)
    this.destroyRef.onDestroy(() => {
      this.clearTimer();
    });
  }

  // --- Methode start ---
  // Lance le chronometre en creant un setInterval toutes les 10ms
  start(): void {
    // Guard : on ne demarre pas si deja en cours
    if (this.isRunning()) return;

    this.isRunning.set(true);

    // setInterval appelle la callback toutes les 10ms
    // A chaque tick, on incremente elapsedMs de 10
    this.intervalId = setInterval(() => {
      this.elapsedMs.update((prev) => prev + 10);
    }, 10);
  }

  // --- Methode stop ---
  // Arrete le chronometre sans remettre a zero
  stop(): void {
    this.isRunning.set(false);
    this.clearTimer();
  }

  // --- Methode reset ---
  // Arrete le chronometre ET remet le temps a zero
  reset(): void {
    this.stop();
    this.elapsedMs.set(0);
    this.laps.set([]);  // On vide aussi les tours
  }

  // --- Methode addLap (bonus) ---
  // Enregistre le temps courant comme un tour
  addLap(): void {
    const currentLaps = this.laps();
    const newLap: Lap = {
      number: currentLaps.length + 1,
      time: this.formattedTime(),
      elapsedMs: this.elapsedMs(),
    };
    this.laps.update((prev) => [...prev, newLap]);
  }

  // --- Methode privee clearTimer ---
  // Utilitaire pour nettoyer l'intervalle de maniere sure
  private clearTimer(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
```

## Ce que tu aurais pu oublier

### 1. Oublier le nettoyage de l'intervalle
- ❌ Ne pas appeler `clearInterval` quand le composant est detruit → fuite memoire
- ✅ Utiliser `DestroyRef.onDestroy()` pour garantir le nettoyage

### 2. Utiliser `ngOnDestroy` au lieu de `DestroyRef`
- ❌ `implements OnDestroy` + `ngOnDestroy()` → ancienne syntaxe, fonctionne mais moins moderne
- ✅ `inject(DestroyRef).onDestroy(callback)` → approche moderne Angular 19+

### 3. Ne pas garder la reference de l'intervalle
- ❌ `setInterval(...)` sans stocker le retour → impossible de l'arreter ensuite
- ✅ `this.intervalId = setInterval(...)` → on peut appeler `clearInterval(this.intervalId)`

### 4. Mauvais calcul du temps formate
- ❌ Oublier le modulo `%` → les secondes depassent 59
- ✅ `Math.floor((elapsed % 60000) / 1000)` → toujours entre 0 et 59

### 5. Pas de guard dans start()
- ❌ Appeler `start()` deux fois → deux intervalles en parallele, le chrono accelere
- ✅ Verifier `if (this.isRunning()) return;` avant de creer un nouvel intervalle

## Concepts cles utilises

| Concept | Explication |
|---------|-------------|
| `inject(DestroyRef)` | Injecte la reference de destruction pour enregistrer des callbacks de nettoyage |
| `destroyRef.onDestroy(fn)` | Execute `fn` quand le composant est detruit (equivalent de `onUnmounted` en Vue 3) |
| `setInterval / clearInterval` | API JavaScript native pour executer du code a intervalles reguliers |
| `ReturnType<typeof setInterval>` | Type TypeScript pour la valeur retournee par setInterval (compatible Node et navigateur) |
| `computed` avec calculs | Le computed recalcule le format affiche a chaque changement de `elapsedMs` |
| `String.padStart(2, '0')` | Methode JavaScript pour completer une chaine avec des zeros devant |
| `@if / @else` | Bascule entre les boutons Start et Stop selon l'etat |
