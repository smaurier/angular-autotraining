// regression.spec.ts — doit passer AVANT ET APRÈS ton intervention. Si un de ces tests casse,
// tu as cassé le contrat existant, pas juste ajouté une capacité.
import { of, Subject } from "rxjs";
import { describe, expect, it } from "vitest";
import { FamilleService } from "@lab/famille.service";
import { MembresFamilleComponent } from "@lab/membres-famille.component";

const MEMBRES_FAMILLE_1 = [
  { id: "m1", nom: "Alice", role: "admin" as const },
  { id: "m2", nom: "Bob", role: "member" as const },
];

describe("MembresFamilleComponent — contrat existant", () => {
  it("charge et expose les membres de la famille une fois la requête résolue", () => {
    const http = { get: () => of(MEMBRES_FAMILLE_1) };
    const service = new FamilleService(http);
    const component = new MembresFamilleComponent(service);

    component.chargerPour(of("famille-1"));

    expect(component.membres()).toEqual(MEMBRES_FAMILLE_1);
  });

  it("membres() est vide avant toute réponse", () => {
    const http = { get: () => new Subject<typeof MEMBRES_FAMILLE_1>() };
    const service = new FamilleService(http);
    const component = new MembresFamilleComponent(service);

    component.chargerPour(of("famille-1"));

    expect(component.membres()).toEqual([]);
  });
});
