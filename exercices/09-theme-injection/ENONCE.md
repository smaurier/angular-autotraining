# Exercice 09 — Theme et injection de dépendances

**Module** : 03-Services-DI · **Difficulte** : ⭐⭐
**Duree estimee** : 45 min
**Cours** : `cours/02-signals-avances/01-signaux-avances.md`

## Objectif

Créer un service de theme (clair/sombre) utilisant l'injection de dépendances Angular, et comprendre comment `inject()`, `providedIn`, et les providers au niveau composant fonctionnent.

## Consignes

### Service ThemeService
1. Créer `theme.service.ts` dans `src/app/exercises/ex09/`
2. Declarer un service injectable avec `@Injectable({ providedIn: 'root' })`
3. Declarer un signal `theme` de type `'light' | 'dark'` initialise a `'light'`
4. Créer un computed `isDark` qui retourne `true` si le theme est `'dark'`
5. Créer un computed `colors` qui retourne un objet avec les couleurs du theme :
   - Light : `{ bg: '#ffffff', text: '#333333', primary: '#1976d2' }`
   - Dark : `{ bg: '#1e1e1e', text: '#e0e0e0', primary: '#90caf9' }`
6. Implementer une méthode `toggle()` qui bascule entre light et dark

### Composant principal ThemeDemoComponent
1. Créer `theme-demo.component.ts` dans `src/app/exercises/ex09/`
2. Injecter `ThemeService` avec `inject(ThemeService)`
3. Afficher un bouton pour basculer le theme
4. Appliquer les couleurs du theme via des style bindings
5. Inclure un composant enfant `ThemeCardComponent`

### Composant enfant ThemeCardComponent
1. Créer `theme-card.component.ts` dans `src/app/exercises/ex09/`
2. Injecter le même `ThemeService` → il recoit la même instance (singleton)
3. Afficher le theme actuel et utiliser les couleurs du service

### Composant avec override : ThemeOverrideComponent
1. Créer `theme-override.component.ts` dans `src/app/exercises/ex09/`
2. Declarer un **provider local** : `providers: [ThemeService]`
3. Ce composant obtient sa **propre instance** de ThemeService
4. Montrer que son theme est independant du theme global

## Contraintes TypeScript

- Zero `any`
- TypeScript strict
- Utiliser `inject()` (pas l'injection par constructeur)
- Typer l'objet de couleurs avec une interface

## Bonus

- Persister le theme dans `localStorage` et le restaurer au démarrage
- Ajouter un troisieme theme "system" qui utilise `prefers-color-scheme`

## Fichiers

→ `src/app/exercises/ex09/theme.service.ts`
→ `src/app/exercises/ex09/theme-demo.component.ts`
→ `src/app/exercises/ex09/theme-card.component.ts`
→ `src/app/exercises/ex09/theme-override.component.ts`
