// sorties.service.ts — SOLUTION DE RÉFÉRENCE (commentée). Ne l'ouvre pas avant ton GREEN.
import { Injectable } from "@angular/core";
import { Observable, of, throwError } from "rxjs";
import { catchError, debounceTime, filter, switchMap } from "rxjs/operators";

export interface Sortie {
  id: string;
  titre: string;
  date: string;
}

export interface NouvelleSortieInput {
  titre: string;
  date: string;
}

export interface ApiHttpClient {
  get<T>(url: string): Observable<T>;
  post<T>(url: string, body: unknown): Observable<T>;
}

export function validerNouvelleSortie(input: NouvelleSortieInput): string | null {
  if (input.titre.trim() === "") return "Le titre est requis.";
  if (input.date.trim() === "") return "La date est requise.";

  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);
  const dateSortie = new Date(input.date);
  dateSortie.setHours(0, 0, 0, 0);

  if (dateSortie.getTime() < aujourdHui.getTime()) return "La date ne peut pas être dans le passé.";

  return null;
}

@Injectable()
export class SortiesService {
  constructor(private readonly http: ApiHttpClient) {}

  rechercherSorties(termes$: Observable<string>): Observable<Sortie[]> {
    return termes$.pipe(
      debounceTime(300),
      filter((terme) => terme.trim().length >= 2),
      // switchMap : une nouvelle frappe ANNULE la recherche précédente (module 16 §2.8) —
      // jamais mergeMap, le résultat précédent est obsolète dès qu'un nouveau terme arrive.
      // catchError À L'INTÉRIEUR du switchMap (pas autour de tout le flux) : une recherche en
      // échec dégrade en liste vide SANS terminer l'abonnement — la frappe suivante marche.
      switchMap((terme) =>
        this.http
          .get<Sortie[]>(`/api/sorties?q=${encodeURIComponent(terme.trim())}`)
          .pipe(catchError(() => of([]))),
      ),
    );
  }

  creerSortie(input: NouvelleSortieInput): Observable<Sortie> {
    const messageValidation = validerNouvelleSortie(input);
    if (messageValidation) {
      // Erreur de validation : jamais d'appel réseau pour une entrée qu'on sait déjà invalide.
      return throwError(() => new Error(messageValidation));
    }
    return this.http.post<Sortie>("/api/sorties", input);
  }
}
