# Cours 44 — Securite front-end Angular

> **Objectif** : Comprendre et prevenir les principales vulnerabilites web (XSS, CSRF, injection) dans Angular et appliquer les bonnes pratiques OWASP pour les projets ESN.

---

## Rappel du cours precedent

<details>
<summary>1. Comment un interceptor attache-t-il le token JWT ?</summary>

Il clone la requete avec `req.clone({ setHeaders: { Authorization: 'Bearer ...' } })`. Enregistre via `withInterceptors([authInterceptor])` dans `app.config.ts`.
</details>

<details>
<summary>2. Quelle est la difference entre un guard fonctionnel et l'ancien style ?</summary>

Le guard fonctionnel est une simple fonction `CanActivateFn` avec `inject()`. L'ancien style etait une classe implementant `CanActivate`. Le style fonctionnel est recommande en Angular 19.
</details>

<details>
<summary>3. Pourquoi preferer les httpOnly cookies au localStorage ?</summary>

Les httpOnly cookies sont inaccessibles depuis JavaScript, ce qui les protege des attaques XSS. Le localStorage est lisible par n'importe quel script sur la page.
</details>

---

## Analogie

En Vue, `v-html` injecte du HTML sans sanitization. Angular est **plus strict par defaut** : tout est echappe automatiquement. C'est un **systeme immunitaire** qui neutralise les menaces avant qu'elles n'atteignent le DOM — mais il peut etre desactive volontairement.

---

## Theorie

### XSS : la protection automatique d'Angular

```typescript
@Component({
  template: `<p>{{ commentaire }}</p>`  // ✅ Echappe automatiquement
})
export class CommentaireComponent {
  commentaire = '<script>alert("hack")</script>';
  // Affiche le texte brut, pas le script
}
```

Angular sanitise : les interpolations `{{ }}`, `[innerHTML]`, les attributs `[attr.href]`, les styles `[style]`.

### Le piege : bypassSecurityTrust*

```typescript
// ❌ DANGEREUX — desactive la sanitization
contenu = this.sanitizer.bypassSecurityTrustHtml(
  '<img src=x onerror="alert(document.cookie)">'
);

// ✅ Laisser Angular sanitiser automatiquement
@Component({ template: `<div [innerHTML]="contenu"></div>` })
export class SafeComponent {
  contenu = '<p>Texte <strong>formate</strong></p>';
  // Angular supprime les attributs dangereux (onerror, onclick, etc.)
}

// ✅ Si bypass necessaire, utiliser DOMPurify d'abord
const nettoye = DOMPurify.sanitize(contenuExterne);
this.contenu = this.sanitizer.bypassSecurityTrustHtml(nettoye);
```

> `bypassSecurityTrust*` est a utiliser **presque jamais**. Seul cas : contenu de confiance absolue.

### Content Security Policy (CSP)

```nginx
# Configuration Nginx recommandee
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://api.monapp.com;
  img-src 'self' data: https:;
" always;
```

| Directive | Role |
|---|---|
| `default-src 'self'` | Tout depuis la meme origine |
| `script-src 'self'` | Pas de scripts externes |
| `connect-src` | URLs API autorisees |

### CORS

Configure **cote serveur**, pas cote Angular :

```typescript
// ❌ Impossible de contourner CORS cote front
// ✅ Configurer le serveur
app.use(cors({ origin: ['http://localhost:4200', 'https://monapp.com'] }));
```

En dev, Angular CLI offre un proxy :

```json
// proxy.conf.json
{ "/api": { "target": "http://localhost:3000", "secure": false, "changeOrigin": true } }
```

### CSRF

Angular `HttpClient` gere le pattern **double-submit cookie** :

```typescript
// app.config.ts
provideHttpClient(
  withXsrfConfiguration({
    cookieName: 'XSRF-TOKEN',
    headerName: 'X-XSRF-TOKEN',
  })
)
```

Le serveur envoie un cookie, Angular le renvoie dans un header, le serveur verifie la correspondance.

### Securite des redirections

```typescript
// ❌ Redirection ouverte
this.router.navigateByUrl(this.route.snapshot.queryParams['returnUrl']);

// ✅ Valider que la redirection est interne
const url = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
if (url.startsWith('/') && !url.startsWith('//')) {
  this.router.navigateByUrl(url);
} else {
  this.router.navigate(['/dashboard']);
}
```

### OWASP Top 10 — resume front-end

| # | Vulnerabilite | Protection Angular |
|---|---|---|
| 1 | Injection (XSS) | Sanitization automatique des templates |
| 2 | Auth cassee | Guards + interceptors JWT + refresh |
| 3 | Exposition de donnees | Jamais de secrets cote client |
| 5 | Controle d'acces | Guards + RBAC cote serveur |
| 6 | Mauvaise config | CSP, CORS, headers securite |
| 7 | XSS | Eviter `bypassSecurityTrust*` |
| 9 | Composants vulnerables | `npm audit`, Dependabot |

### Checklist securite ESN

```markdown
## Templates et DOM
- [ ] Jamais de bypassSecurityTrustHtml sans DOMPurify
- [ ] Pas de document.write() ou eval()

## Authentification
- [ ] Tokens en httpOnly cookies (ou localStorage si prototypage)
- [ ] Guard sur toutes les routes protegees
- [ ] Gestion du 401 dans l'interceptor

## Configuration
- [ ] CSP header configure
- [ ] CORS restrictif (pas de wildcard *)
- [ ] Source maps desactivees en production
- [ ] Pas de secrets dans le code source

## Dependances
- [ ] npm audit dans le CI
- [ ] Dependabot ou Renovate active
```

---

## Pratique

Identifiez **toutes les vulnerabilites** dans ce code et proposez une version corrigee :

```typescript
@Component({
  template: `
    <div [innerHTML]="contenu"></div>
    <a [href]="lienExterne">Voir plus</a>
  `
})
export class ArticleComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);

  contenu = this.sanitizer.bypassSecurityTrustHtml(
    this.route.snapshot.queryParams['content']
  );
  lienExterne = this.route.snapshot.queryParams['url'];

  ngOnInit() {
    localStorage.setItem('apiKey', 'sk-secret-12345');
  }
}
```

<details>
<summary>Solution</summary>

**Vulnerabilites** :
1. `bypassSecurityTrustHtml` sur un queryParam → XSS direct
2. `lienExterne` non valide → redirection ouverte, possible `javascript:`
3. Cle API stockee en dur → exposition de secret

```typescript
@Component({
  template: `
    <div [innerHTML]="contenuSanitise"></div>
    <a [href]="lienValide()">Voir plus</a>
  `
})
export class ArticleComponent {
  private readonly route = inject(ActivatedRoute);

  // ✅ DOMPurify + sanitization Angular
  contenuSanitise = DOMPurify.sanitize(
    this.route.snapshot.queryParams['content'] ?? ''
  );

  // ✅ Validation de l'URL
  lienValide = computed(() => {
    const url = this.route.snapshot.queryParams['url'] ?? '#';
    try {
      const p = new URL(url);
      return ['http:', 'https:'].includes(p.protocol) ? url : '#';
    } catch { return '#'; }
  });

  // ✅ Pas de secret dans le code front
}
```
</details>

---

## Resume

| Point cle | A retenir |
|---|---|
| XSS | Angular sanitise `{{ }}` et `[innerHTML]` automatiquement |
| `bypassSecurityTrust*` | A eviter sauf cas exceptionnel + DOMPurify |
| CSP | Header qui restreint les sources de contenu autorisees |
| CORS | Configure cote serveur, pas cote Angular |
| CSRF | `withXsrfConfiguration()` pour le double-submit cookie |
| OWASP | Connaitre les principales vulnerabilites web |

---

> **Prochain cours** : [Cours 45 — Patterns et conventions d'entreprise (ESN)](../12-recettes-esn/01-patterns-esn.md)
