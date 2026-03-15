# Checklist — Exercice 16 : Formulaire réactif

- [ ] `FormBuilder` est injecte via `inject(FormBuilder)`
- [ ] Le `FormGroup` contient les 4 champs : name, email, password, confirmPassword
- [ ] `Validators.required` est applique sur tous les champs
- [ ] `Validators.minLength(2)` est applique sur le champ name
- [ ] `Validators.email` est applique sur le champ email
- [ ] `Validators.minLength(8)` est applique sur le champ password
- [ ] Le validateur `passwordMatchValidator` est applique au **groupe** (pas au champ)
- [ ] Le validateur retourne `{ passwordMismatch: true }` ou `null`
- [ ] Les erreurs s'affichent uniquement si le champ est `touched` ou `dirty`
- [ ] Les messages d'erreur sont spécifiques (nom requis, email invalide, etc.)
- [ ] Le bouton "S'inscrire" est désactivé si `form.invalid`
- [ ] `markAllAsTouched()` est appele au submit si le formulaire est invalide
- [ ] Les champs ont un indicateur visuel (bordure rouge/verte)
- [ ] `ReactiveFormsModule` est importe dans le composant standalone
- [ ] Zero `any` dans tout le code
