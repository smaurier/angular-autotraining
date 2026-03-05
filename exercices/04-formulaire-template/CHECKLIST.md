# Checklist — Exercice 04

- [ ] Le composant `ContactFormComponent` est standalone
- [ ] `FormsModule` est importe dans le composant
- [ ] L'interface `ContactForm` est definie avec `name`, `email`, `message`
- [ ] Le formulaire utilise `#contactForm="ngForm"` et `(ngSubmit)`
- [ ] Champ Nom : `[(ngModel)]`, `required`, `minlength="2"`
- [ ] Champ Email : `[(ngModel)]`, `required`, `email`
- [ ] Champ Message : `[(ngModel)]`, `required`, `minlength="10"`
- [ ] Les erreurs de validation sont affichees sous chaque champ (apres `touched`)
- [ ] Le bouton Envoyer est desactive quand le formulaire est invalide
- [ ] La methode `onSubmit()` verifie la validite et affiche les donnees dans la console
- [ ] Un signal `submitted` gere l'affichage de la confirmation
- [ ] Zero `any` dans le code
- [ ] Bonus : champ Sujet avec `<select>` (si tente)
- [ ] Bonus : message de confirmation avec recapitulatif (si tente)
