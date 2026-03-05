# Exercice 01 — Premier composant

**Module** : 00-De-Vue-a-Angular · **Difficulte** : ⭐
**Duree estimee** : 45 min
**Cours** : `cours/01-composants-templates/01-composants-standalone.md`, `cours/01-composants-templates/02-signaux-base.md`

## Objectif

Creer un composant standalone `HelloComponent` qui affiche un message de bienvenue personnalise et permet de basculer entre francais et anglais.

## Consignes

1. Creer un fichier `hello.component.ts` dans `src/app/exercises/ex01/`
2. Definir un composant standalone `HelloComponent` avec le decorateur `@Component`
3. Declarer un **signal** `name` initialise avec votre prenom (type `string`)
4. Declarer un **signal** `lang` initialise a `'fr'` (type `'fr' | 'en'`)
5. Creer un **computed** `greeting` qui retourne :
   - `'Bonjour, {name} !'` si `lang()` vaut `'fr'`
   - `'Hello, {name}!'` si `lang()` vaut `'en'`
6. Dans le template :
   - Afficher le message de bienvenue via interpolation `{{ greeting() }}`
   - Ajouter un bouton qui appelle une methode `toggleLang()` pour basculer la langue
   - Afficher sur le bouton : `'Passer en EN'` ou `'Passer en FR'` selon la langue courante
7. Ajouter un champ `<input>` lie au signal `name` pour pouvoir modifier le prenom en temps reel
   - Utiliser `(input)` event binding + `$event` pour mettre a jour le signal

## Contraintes TypeScript

- Zero `any` dans le code
- TypeScript strict active
- Typer le signal `lang` avec un type union literal (`'fr' | 'en'`)

## Bonus

- Ajouter un troisieme signal `visitCount` (nombre de fois que la langue a ete changee) et l'afficher
- Ajouter des styles inline avec un fond de couleur different selon la langue

## Fichiers

→ `src/app/exercises/ex01/hello.component.ts`
