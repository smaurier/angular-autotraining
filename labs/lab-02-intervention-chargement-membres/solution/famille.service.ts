// famille.service.ts — identique au starter, DONNÉ.
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
