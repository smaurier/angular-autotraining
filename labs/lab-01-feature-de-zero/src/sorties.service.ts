// sorties.service.ts — PAGE BLANCHE. TribuZen : un service Angular (injection par
// constructeur, module 11) qui recherche des sorties EN TEMPS RÉEL pendant la frappe (module
// 16, l'exemple même du module : « barre de recherche debounced des familles/sorties ») et
// propose une nouvelle sortie (module 18, HttpClient — ici un client HTTP minimal injecté,
// pour rester en TypeScript pur, sans le compilateur de templates Angular — voir README).
//
// export interface ApiHttpClient { get<T>(url: string): Observable<T>; post<T>(url: string, body: unknown): Observable<T> }
//   - Le contrat minimal qu'un vrai `HttpClient` Angular satisfait déjà (injecté par
//     constructeur, jamais instancié en dur dans le service — testable sans réseau).
//
// export function validerNouvelleSortie(input: NouvelleSortieInput): string | null
//   - Mêmes règles que partout dans TribuZen (cohérence front, cf. lab Vue) : titre requis,
//     date requise et pas dans le passé (comparaison à la JOURNÉE, pas à l'heure).
//
// @Injectable()
// export class SortiesService {
//   constructor(private readonly http: ApiHttpClient) {}
//
//   rechercherSorties(termes$: Observable<string>): Observable<Sortie[]>
//     - Transforme un flux de frappes en flux de résultats (module 16 §2.8, EXACTEMENT le cas
//       d'usage du module) :
//       1. `debounceTime(300)` — attend une pause de frappe avant de chercher.
//       2. `filter` — ignore les termes de MOINS DE 2 caractères après `trim()` (piège #1 du
//          module : chercher sur "a" seul spamme l'API pour rien).
//       3. `switchMap` — appelle `http.get` avec le terme ; si une NOUVELLE frappe arrive
//          avant que la recherche précédente ait répondu, elle est ANNULÉE (le résultat
//          obsolète n'arrive jamais à l'abonné final) — jamais `mergeMap` ici (règle de choix
//          du module §2.8 : le résultat précédent devient obsolète dès qu'un nouveau terme
//          arrive → switchMap).
//       4. Une recherche qui échoue (l'Observable de `http.get` émet une erreur) dégrade en
//          liste VIDE — `catchError` posé À L'INTÉRIEUR du `switchMap` (sur l'inner
//          Observable), jamais autour de tout le flux : sinon UNE recherche en échec termine
//          l'abonnement entier et la frappe suivante ne déclenche plus rien.
//
//   creerSortie(input: NouvelleSortieInput): Observable<Sortie>
//     - Valide D'ABORD (`validerNouvelleSortie`). Invalide → `throwError` avec le message,
//       **sans jamais appeler `http.post`** (même piège que le lab Vue : valider côté client
//       ET ne jamais taper le réseau pour rien).
//     - Valide → `http.post('/api/sorties', input)`.
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

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

export function validerNouvelleSortie(_input: NouvelleSortieInput): string | null {
  throw new Error("validerNouvelleSortie n'est pas encore implémenté");
}

@Injectable()
export class SortiesService {
  constructor(private readonly http: ApiHttpClient) {}

  rechercherSorties(_termes$: Observable<string>): Observable<Sortie[]> {
    throw new Error("rechercherSorties n'est pas encore implémenté");
  }

  creerSortie(_input: NouvelleSortieInput): Observable<Sortie> {
    throw new Error("creerSortie n'est pas encore implémenté");
  }
}
