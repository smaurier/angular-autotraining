# Checklist — Exercice 01

- [ ] Le composant `HelloComponent` est standalone
- [ ] Un signal `name` de type `string` est declare et initialise
- [ ] Un signal `lang` de type `'fr' | 'en'` est declare
- [ ] Un computed `greeting` retourne le bon message selon la langue
- [ ] Le message de bienvenue est affiche dans le template via `{{ greeting() }}`
- [ ] Un bouton permet de basculer la langue (FR ↔ EN)
- [ ] Le texte du bouton change dynamiquement selon la langue courante
- [ ] Un champ input permet de modifier le prenom en temps réel
- [ ] L'événement `(input)` met a jour le signal `name` correctement
- [ ] Zero `any` dans le code
- [ ] TypeScript strict : tous les signaux sont types explicitement
- [ ] Le composant compile sans erreur
- [ ] Bonus : compteur de changements de langue (si tente)
- [ ] Bonus : styles conditionnels selon la langue (si tente)
