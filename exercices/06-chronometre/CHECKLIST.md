# Checklist — Exercice 06

- [ ] Le composant `StopwatchComponent` est standalone
- [ ] Un signal `elapsedMs` de type `number` est declare (demarre a 0)
- [ ] Un signal `isRunning` de type `boolean` controle l'etat du chronometre
- [ ] Un computed `formattedTime` affiche le temps au format `MM:SS:ms`
- [ ] La methode `start()` lance un `setInterval` toutes les 10ms
- [ ] La methode `stop()` arrete l'intervalle avec `clearInterval`
- [ ] La methode `reset()` arrete et remet `elapsedMs` a 0
- [ ] `DestroyRef` est utilise pour nettoyer l'intervalle a la destruction du composant
- [ ] Les boutons Start/Stop sont affiches conditionnellement avec `@if`/`@else`
- [ ] La variable d'intervalle est typee correctement (pas de `any`)
- [ ] Un guard empeche de demarrer deux intervalles en parallele
- [ ] Zero `any` dans le code
- [ ] Bonus : systeme de tours (laps) avec liste affichee (si tente)
