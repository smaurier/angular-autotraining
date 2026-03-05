# Checklist — Exercice 17 : Formulaire multi-etapes

- [ ] Le formulaire comporte 3 etapes distinctes (personnel, adresses, recapitulatif)
- [ ] La barre de progression affiche l'etape courante avec un indicateur visuel
- [ ] L'etape 1 a les champs firstName, lastName, email (requis) et phone (optionnel)
- [ ] L'etape 2 utilise un `FormArray` pour les adresses
- [ ] Le bouton "Ajouter une adresse" ajoute un nouveau groupe au `FormArray`
- [ ] Le bouton "Supprimer" retire une adresse (impossible s'il n'en reste qu'une)
- [ ] Le code postal est valide par un pattern de 5 chiffres
- [ ] L'etape 3 affiche un recapitulatif en lecture seule de toutes les donnees
- [ ] Le bouton "Suivant" valide l'etape courante avant de passer a la suivante
- [ ] Le bouton "Suivant" est desactive si l'etape courante est invalide
- [ ] Le bouton "Precedent" permet de revenir en arriere
- [ ] Un signal `currentStep` gere l'etape courante
- [ ] Les sous-groupes/sous-arrays sont passes en input aux composants enfants
- [ ] `markAllAsTouched()` est appele si l'utilisateur tente de passer avec des erreurs
- [ ] Zero `any` dans tout le code
