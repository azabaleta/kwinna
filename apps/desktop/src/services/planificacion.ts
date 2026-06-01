import { api, API_BASE } from "../lib/api";
import { useAuthStore } from "../store/use-auth-store";

export interface SemanaListItem {
  semana:   number;
  semanaStr:string;
  periodo:  string | null;
  creadoEn: string;
}

export async function fetchSemanas(): Promise<SemanaListItem[]> {
  return api.get<SemanaListItem[]>("/planificacion/semanas");
}

export async function fetchSemanaHtml(semana: number): Promise<string> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE}/planificacion/semana/${semana}/html`, {
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.text();
}
