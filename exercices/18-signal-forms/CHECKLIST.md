# Checklist — Exercice 18

- [ ] Le composant `SignalFormComponent` est standalone
- [ ] Les 4 champs (name, email, password, confirmPassword) sont des signaux `signal<string>`
- [ ] Le two-way binding fonctionne via `[value]` + `(input)` sur chaque champ
- [ ] Le computed `emailValid` valide le format email avec une regex
- [ ] Le computed `passwordStrength` retourne `'weak'` | `'medium'` | `'strong'`
- [ ] Les regles de force sont respectees : weak < 8, medium = 8+ avec maj + chiffre, strong = 12+ avec maj + chiffre + special
- [ ] La barre de force s'affiche avec la bonne couleur (rouge/orange/vert) et largeur (33%/66%/100%)
- [ ] Le computed `passwordsMatch` vérifié la correspondance des deux mots de passe
- [ ] Le computed `isFormValid` combine toutes les validations
- [ ] Les erreurs n'apparaissent qu'après interaction (signaux `touched` + `(blur)`)
- [ ] Le bouton de soumission est désactivé si `isFormValid()` est false
- [ ] Zero `any` dans le code — `Event` + cast `as HTMLInputElement`
- [ ] TypeScript strict : tous les signaux et computed sont types explicitement
- [ ] Le composant compile et fonctionne sans erreur
- [ ] Bonus : regles de validation dynamiques selon `userType` (si tente)
