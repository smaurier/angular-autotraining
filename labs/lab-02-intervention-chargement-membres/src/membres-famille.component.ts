// membres-famille.component.ts — déjà consommé par la page famille (le parent lui pousse les
// changements de famille via `chargerPour(familleId$)`, appelé une fois dans `ngOnInit`).
// Version ACTUELLE EN PRODUCTION : à chaque nouvelle valeur de familleId$, elle lance une
// NOUVELLE requête SANS annuler la précédente. Si l'utilisateur change deux fois de famille
// rapidement, les deux requêtes sont en vol en même temps — celle qui répond EN DERNIER gagne,
// pas forcément celle de la famille affichée. Aucun état de chargement ; une erreur réseau
// laisse `membres()` vide sans le dire.
//
// TA TÂCHE (intervention, pas une feature de zéro) : exposer `loading()`/`erreur()`, et annuler
// toute requête obsolète dès qu'une nouvelle valeur de familleId$ arrive — même piège switchMap
// que le lab-01 (`chargement` et `erreur` se remettent à zéro proprement à chaque changement).
// Le contrat existant (`membres()` contient la liste une fois chargée avec succès) NE DOIT PAS
// casser — test/regression.spec.ts le vérifie.
import { Component } from "@angular/core";
import { signal } from "@angular/core";
import { Observable } from "rxjs";
import { FamilleService, Membre } from "./famille.service";

@Component({
  selector: "app-membres-famille",
  standalone: true,
  template: `
    <ul>
      @for (membre of membres(); track membre.id) {
        <li>{{ membre.nom }} ({{ membre.role }})</li>
      }
    </ul>
  `,
})
export class MembresFamilleComponent {
  membres = signal<Membre[]>([]);

  constructor(private readonly familleService: FamilleService) {}

  chargerPour(familleId$: Observable<string>): void {
    // Naïf : s'abonne, mais `take(1)` implicite — on ne retraite jamais familleId$ au-delà
    // de sa première valeur émise.
    familleId$.subscribe((familleId) => {
      this.familleService.chargerMembres(familleId).subscribe((membres) => {
        this.membres.set(membres);
      });
    });
  }
}
