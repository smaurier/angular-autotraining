# Checklist — Exercice 17 : Formulaire multi-étapes

- [ ] Le formulaire comporte 3 étapes distinctes (personnel, adresses, récapitulatif)
- [ ] La barre de progression affiche l'étape courante avec un indicateur visuel
- [ ] L'étape 1 a les champs firstName, lastName, email (requis) et phone (optionnel)
- [ ] L'étape 2 utilise un `FormArray` pour les adresses
- [ ] Le bouton "Ajouter une adresse" ajoute un nouveau groupe au `FormArray`
- [ ] Le bouton "Supprimer" retire une adresse (impossible s'il n'en reste qu'une)
- [ ] Le code postal est valide par un pattern de 5 chiffres
- [ ] L'étape 3 affiche un récapitulatif en lecture seule de toutes les donnees
- [ ] Le bouton "Suivant" valide l'étape courante avant de passer à la suivante
- [ ] Le bouton "Suivant" est désactivé si l'étape courante est invalide
- [ ] Le bouton "Précédent" permet de revenir en arriere
- [ ] Un signal `currentStep` géré l'étape courante
- [ ] Les sous-groupes/sous-arrays sont passes en input aux composants enfants
- [ ] `markAllAsTouched()` est appele si l'utilisateur tente de passer avec des erreurs
- [ ] Zero `any` dans tout le code
