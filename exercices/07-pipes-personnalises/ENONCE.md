# Exercice 07 — Pipes personnalises et directive

**Module** : 01-Composants-Templates · **Difficulte** : ⭐⭐
**Duree estimee** : 45 min
**Cours** : `cours/01-composants-templates/01-composants-standalone.md`, `cours/01-composants-templates/02-signaux-base.md`

## Objectif

Créer trois pipes personnalises standalone (`truncate`, `timeAgo`, `highlight`) et une directive `highlight`, puis les utiliser dans un composant de demonstration.

## Consignes

### Pipe 1 : `TruncatePipe`
1. Créer `truncate.pipe.ts` dans `src/app/exercises/ex07/`
2. Transformer un texte en le coupant a `maxLength` caracteres (defaut : 50)
3. Ajouter `'...'` si le texte a ete tronque
4. Signature : `transform(value: string, maxLength: number = 50): string`

### Pipe 2 : `TimeAgoPipe`
1. Créer `time-ago.pipe.ts` dans `src/app/exercises/ex07/`
2. Transformer un `Date` en texte relatif en français :
   - Moins de 60 secondes : `"a l'instant"`
   - Moins de 60 minutes : `"il y a X min"`
   - Moins de 24 heures : `"il y a X h"`
   - Moins de 30 jours : `"il y a X j"`
   - Sinon : `"il y a X mois"`
3. Signature : `transform(value: Date): string`

### Pipe 3 : `HighlightPipe`
1. Créer `highlight.pipe.ts` dans `src/app/exercises/ex07/`
2. Entourer les occurrences d'un terme de recherche avec `<mark>...</mark>`
3. Recherche insensible à la casse
4. Signature : `transform(value: string, searchTerm: string): string`

### Directive : `HighlightDirective`
1. Créer `highlight.directive.ts` dans `src/app/exercises/ex07/`
2. Directive d'attribut `[appHighlight]` qui change la couleur de fond d'un élément
3. Accepter une couleur via un `input()` (defaut : `'yellow'`)
4. Appliquer la couleur sur `mouseenter`, retirer sur `mouseleave`

### Composant de demonstration
1. Créer `pipes-demo.component.ts` qui importe et utilise les 3 pipes + la directive

## Contraintes TypeScript

- Zero `any`
- TypeScript strict
- Chaque pipe et directive doit etre `standalone: true`
- Utiliser le decorateur `@Pipe` et `@Directive`

## Bonus

- Rendre `TimeAgoPipe` impure pour qu'il se recalcule regulierement
- Ajouter un pipe `CurrencyFr` qui formate un nombre en euros (ex: `1234.5` → `1 234,50 EUR`)

## Fichiers

→ `src/app/exercises/ex07/truncate.pipe.ts`
→ `src/app/exercises/ex07/time-ago.pipe.ts`
→ `src/app/exercises/ex07/highlight.pipe.ts`
→ `src/app/exercises/ex07/highlight.directive.ts`
→ `src/app/exercises/ex07/pipes-demo.component.ts`
