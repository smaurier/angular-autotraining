// famille.service.ts — DONNÉ, ne modifie pas ce fichier.
// Même contrat que SortiesService du lab-01 : l'interface ApiHttpClient abstrait HttpClient
// pour pouvoir tester sans backend réel.
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

export interface Membre {
  id: string;
  nom: string;
  role: "admin" | "member";
}

export interface ApiHttpClient {
  get<T>(url: string): Observable<T>;
}

@Injectable()
export class FamilleService {
  constructor(private readonly http: ApiHttpClient) {}

  chargerMembres(familleId: string): Observable<Membre[]> {
    return this.http.get<Membre[]>(`/api/familles/${familleId}/membres`);
  }
}
