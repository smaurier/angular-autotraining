// Oracle du lab 01 (Angular). Ne pas modifier.
import { of, Subject, throwError } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SortiesService, validerNouvelleSortie, type ApiHttpClient, type Sortie } from "@lab/sorties.service";

function dateFuture(joursDecalage = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + joursDecalage);
  return d.toISOString().slice(0, 10);
}

function datePassee(): string {
  return dateFuture(-1);
}

function creerHttpFaux(): ApiHttpClient & { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> } {
  return {
    get: vi.fn(),
    post: vi.fn(),
  };
}

describe("validerNouvelleSortie", () => {
  it("rejette un titre vide", () => {
    expect(validerNouvelleSortie({ titre: "  ", date: dateFuture() })).toBe("Le titre est requis.");
  });

  it("rejette une date vide", () => {
    expect(validerNouvelleSortie({ titre: "Piscine", date: "" })).toBe("La date est requise.");
  });

  it("rejette une date dans le passé", () => {
    expect(validerNouvelleSortie({ titre: "Piscine", date: datePassee() })).toBe(
      "La date ne peut pas être dans le passé.",
    );
  });

  it("accepte une entrée valide", () => {
    expect(validerNouvelleSortie({ titre: "Piscine", date: dateFuture() })).toBeNull();
  });
});

describe("SortiesService — creerSortie", () => {
  it("entrée invalide : l'observable émet une erreur, jamais d'appel http.post", () => {
    const http = creerHttpFaux();
    const service = new SortiesService(http);
    const erreurs: unknown[] = [];

    service.creerSortie({ titre: "", date: dateFuture() }).subscribe({
      error: (e) => erreurs.push(e),
    });

    expect(erreurs).toHaveLength(1);
    expect((erreurs[0] as Error).message).toBe("Le titre est requis.");
    expect(http.post).not.toHaveBeenCalled();
  });

  it("entrée valide : appelle http.post et transmet le résultat", () => {
    const http = creerHttpFaux();
    const sortieCreee: Sortie = { id: "s1", titre: "Piscine", date: dateFuture() };
    http.post.mockReturnValue(of(sortieCreee));
    const service = new SortiesService(http);

    let resultat: Sortie | undefined;
    service.creerSortie({ titre: "Piscine", date: dateFuture() }).subscribe((s) => (resultat = s));

    expect(http.post).toHaveBeenCalledWith("/api/sorties", { titre: "Piscine", date: dateFuture() });
    expect(resultat).toEqual(sortieCreee);
  });
});

describe("SortiesService — rechercherSorties (debounce + filter + switchMap, module 16 §2.8)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("débounce : plusieurs frappes rapprochées ne déclenchent qu'UNE seule recherche", () => {
    const http = creerHttpFaux();
    http.get.mockReturnValue(of([]));
    const service = new SortiesService(http);
    const termes$ = new Subject<string>();

    service.rechercherSorties(termes$).subscribe();

    termes$.next("pi");
    vi.advanceTimersByTime(100);
    termes$.next("pis");
    vi.advanceTimersByTime(100);
    termes$.next("pisc");
    vi.advanceTimersByTime(299);
    expect(http.get).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith("/api/sorties?q=pisc");
  });

  it("filtre les termes de moins de 2 caractères — jamais de recherche sur une seule lettre", () => {
    const http = creerHttpFaux();
    http.get.mockReturnValue(of([]));
    const service = new SortiesService(http);
    const termes$ = new Subject<string>();

    service.rechercherSorties(termes$).subscribe();

    termes$.next("p");
    vi.advanceTimersByTime(300);

    expect(http.get).not.toHaveBeenCalled();
  });

  it("switchMap : une nouvelle frappe ANNULE la recherche précédente encore en cours", () => {
    const http = creerHttpFaux();
    const reponsePiscine = new Subject<Sortie[]>();
    const reponseRando = new Subject<Sortie[]>();
    http.get.mockImplementation((url: string) => (url.includes("piscine") ? reponsePiscine : reponseRando));

    const service = new SortiesService(http);
    const termes$ = new Subject<string>();
    const resultats: Sortie[][] = [];
    service.rechercherSorties(termes$).subscribe((r) => resultats.push(r));

    termes$.next("piscine");
    vi.advanceTimersByTime(300); // déclenche la recherche "piscine", encore en attente de réponse

    termes$.next("rando");
    vi.advanceTimersByTime(300); // déclenche la recherche "rando" AVANT que "piscine" ait répondu

    // "piscine" répond maintenant, en retard — switchMap a déjà annulé cet abonnement.
    reponsePiscine.next([{ id: "obsolete", titre: "Piscine (obsolète)", date: dateFuture() }]);
    // "rando" répond : c'est le SEUL résultat qui doit arriver à l'abonné final.
    reponseRando.next([{ id: "s-rando", titre: "Randonnée", date: dateFuture() }]);

    expect(resultats).toHaveLength(1);
    expect(resultats[0][0].id).toBe("s-rando");
  });

  it("une recherche en échec dégrade en liste vide SANS casser le flux pour la frappe suivante", () => {
    const http = creerHttpFaux();
    const sortieTrouvee: Sortie = { id: "s1", titre: "Randonnée", date: dateFuture() };
    http.get.mockReturnValueOnce(throwError(() => new Error("réseau down"))).mockReturnValueOnce(of([sortieTrouvee]));
    const service = new SortiesService(http);
    const termes$ = new Subject<string>();
    let erreurRecue = false;
    const resultats: Sortie[][] = [];

    service.rechercherSorties(termes$).subscribe({
      next: (r) => resultats.push(r),
      error: () => (erreurRecue = true),
    });

    termes$.next("pi");
    vi.advanceTimersByTime(300);
    expect(erreurRecue).toBe(false); // dégradé en liste vide, PAS une erreur qui remonte
    expect(resultats).toEqual([[]]);

    // La frappe SUIVANTE doit toujours fonctionner — l'abonnement n'a pas été terminé.
    termes$.next("ra");
    vi.advanceTimersByTime(300);
    expect(resultats).toEqual([[], [sortieTrouvee]]);
  });
});
