# Checklist — Exercice 09

- [ ] `ThemeService` est injectable avec `providedIn: 'root'`
- [ ] Un signal `theme` de type `'light' | 'dark'` est declare dans le service
- [ ] Un computed `isDark` retourne un booleen
- [ ] Un computed `colors` retourne un objet `ThemeColors` type avec une interface
- [ ] La methode `toggle()` bascule entre light et dark
- [ ] `ThemeDemoComponent` injecte le service avec `inject(ThemeService)`
- [ ] Les couleurs du theme sont appliquees via des style bindings
- [ ] `ThemeCardComponent` utilise la meme instance singleton du service
- [ ] `ThemeOverrideComponent` declare `providers: [ThemeService]` pour obtenir sa propre instance
- [ ] Le theme du composant avec override est independant du theme global
- [ ] `inject()` est utilise partout (pas d'injection par constructeur)
- [ ] Zero `any` dans le code
- [ ] Bonus : persistence du theme dans localStorage (si tente)
