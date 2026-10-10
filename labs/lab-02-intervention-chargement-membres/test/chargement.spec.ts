// chargement.spec.ts — la capacité ajoutée par ton intervention. Ne passe QUE sur la solution.
import { Subject } from "rxjs";
import { describe, expect, it } from "vitest";
import { FamilleService, type Membre } from "@lab/famille.service";
import { MembresFamilleComponent } from "@lab/membres-famille.component";

function composant() {
  const requetes = new Map<string, Subject<Membre[]>>();
  const http = {
    get: (url: string) => {
      const familleId = url.match(/familles\/([^/]+)\/membres/)![1];
      const sujet = new Subject<Membre[]>();
      requetes.set(familleId, sujet);
      return sujet;
    },
  };
  const service = new FamilleService(http);
  const component = new MembresFamilleComponent(service);
  return { component, requetes };
}

describe("MembresFamilleComponent — chargement et erreur", () => {
  it("passe loading à true dès qu'une famille est demandée, avant toute réponse", () => {
    const { component } = composant();
    const familleId$ = new Subject<string>();

    component.chargerPour(familleId$);
    expect(component.loading()).toBe(false); // rien demandé encore

    familleId$.next("fam-1");
    expect(component.loading()).toBe(true);
  });

  it("repasse loading à false et remplit membres() une fois la réponse arrivée", () => {
    const { component, requetes } = composant();
    const familleId$ = new Subject<string>();
    component.chargerPour(familleId$);

    familleId$.next("fam-1");
    requetes.get("fam-1")!.next([{ id: "m1", nom: "Alice", role: "admin" }]);

    expect(component.loading()).toBe(false);
    expect(component.membres()).toEqual([{ id: "m1", nom: "Alice", role: "admin" }]);
  });

  it("expose une erreur lisible si la requête échoue, sans planter l'abonnement", () => {
    const { component, requetes } = composant();
    const familleId$ = new Subject<string>();
    component.chargerPour(familleId$);

    familleId$.next("fam-1");
    requetes.get("fam-1")!.error(new Error("boom réseau"));

    expect(component.loading()).toBe(false);
    expect(component.erreur()).toBe("Impossible de charger les membres de cette famille.");

    // L'abonnement global tient toujours : changer de famille ensuite refonctionne.
    familleId$.next("fam-2");
    expect(component.loading()).toBe(true);
    requetes.get("fam-2")!.next([{ id: "m9", nom: "Zoé", role: "member" }]);
    expect(component.erreur()).toBe(null);
    expect(component.membres()).toEqual([{ id: "m9", nom: "Zoé", role: "member" }]);
  });

  it("ignore une réponse obsolète qui arrive APRÈS celle de la famille courante (switchMap)", () => {
    const { component, requetes } = composant();
    const familleId$ = new Subject<string>();
    component.chargerPour(familleId$);

    // L'utilisateur change deux fois de famille très vite, avant que fam-A ait répondu.
    familleId$.next("fam-A");
    familleId$.next("fam-B");

    // fam-B (la famille AFFICHÉE) répond d'abord...
    requetes.get("fam-B")!.next([{ id: "b1", nom: "Famille B", role: "admin" }]);
    // ...puis fam-A (obsolète) répond ENSUITE, plus lente.
    requetes.get("fam-A")!.next([{ id: "a1", nom: "Famille A", role: "admin" }]);

    // La réponse tardive de fam-A ne doit JAMAIS écraser l'affichage de fam-B.
    expect(component.membres()).toEqual([{ id: "b1", nom: "Famille B", role: "admin" }]);
  });
});
