# Checklist — Exercice 07

- [ ] `TruncatePipe` est standalone et implemente `PipeTransform`
- [ ] `TruncatePipe` coupe le texte a `maxLength` et ajoute `'...'`
- [ ] `TimeAgoPipe` est standalone et retourne un texte relatif en francais
- [ ] `TimeAgoPipe` gere les cas : instant, minutes, heures, jours, mois
- [ ] `HighlightPipe` est standalone et entoure les occurrences avec `<mark>`
- [ ] `HighlightPipe` est insensible a la casse et echappe les caracteres regex
- [ ] `HighlightDirective` est standalone avec le selecteur `[appHighlight]`
- [ ] La directive change la couleur de fond au survol et la retire au depart
- [ ] La directive accepte une couleur en input (defaut : jaune)
- [ ] Le composant de demo importe les 3 pipes et la directive
- [ ] Le pipe `highlight` est utilise avec `[innerHTML]` (pas d'interpolation)
- [ ] Zero `any` dans le code
- [ ] Bonus : pipe `TimeAgo` impure (si tente)
- [ ] Bonus : pipe `CurrencyFr` (si tente)
