// membres-famille.component.ts — SOLUTION DE RÉFÉRENCE (commentée). Ne l'ouvre pas avant ton GREEN.
import { Component, signal } from "@angular/core";
import { Observable } from "rxjs";
import { catchError, of, switchMap, tap } from "rxjs";
import { FamilleService, Membre } from "./famille.service";

@Component({
  selector: "app-membres-famille",
  standalone: true,
  template: `
    @if (loading()) {
      <p role="status" aria-live="polite">Chargement…</p>
    } @else if (erreur()) {
      <p role="alert">{{ erreur() }}</p>
    } @else {
      <ul>
        @for (membre of membres(); track membre.id) {
          <li>{{ membre.nom }} ({{ membre.role }})</li>
        }
      </ul>
    }
  `,
})
export class MembresFamilleComponent {
  membres = signal<Membre[]>([]);
  loading = signal(false);
  erreur = signal<string | null>(null);

  constructor(private readonly familleService: FamilleService) {}

  chargerPour(familleId$: Observable<string>): void {
    familleId$
      .pipe(
        // tap AVANT le switchMap : repart de zéro (loading affiché, erreur effacée) dès que
        // familleId change, même avant que la nouvelle requête ait répondu.
        tap(() => {
          this.loading.set(true);
          this.erreur.set(null);
        }),
        // switchMap : une nouvelle famille sélectionnée ANNULE la requête en vol pour l'ancienne
        // — jamais mergeMap (module 16 §2.8), sinon la réponse la plus lente peut écraser la
        // plus récente. catchError À L'INTÉRIEUR du switchMap : une famille en échec dégrade
        // proprement sans terminer l'abonnement — changer de famille ensuite refonctionne.
        switchMap((familleId) =>
          this.familleService.chargerMembres(familleId).pipe(
            catchError(() => {
              this.erreur.set("Impossible de charger les membres de cette famille.");
              return of(null);
            }),
          ),
        ),
      )
      .subscribe((membres) => {
        this.loading.set(false);
        if (membres !== null) {
          this.membres.set(membres);
        }
      });
  }
}
