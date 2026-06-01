import { api, API_BASE } from "../lib/api";
import { useAuthStore } from "../store/use-auth-store";

export interface SemanaListItem {
  semana:   number;
  semanaStr:string;
  periodo:  string | null;
  creadoEn: string;
}

export interface Pieza {
  id:         string;
  plataforma: string;
  tipo:       string;
  dia_hora:   string;
  gancho:     string;
}

export interface PiezasData {
  semana:  number;
  periodo: string;
  piezas:  Pieza[];
}

export interface EstadoRow {
  piezaId:              string;
  realizada:            boolean;
  actualizadoEn:        string;
  actualizadoPorNombre: string | null;
}

export interface ComentarioRow {
  id:       number;
  piezaId:  string;
  userId:   string;
  userName: string;
  texto:    string;
  creadoEn: string;
}

export interface Interaccion {
  estados:     Record<string, EstadoRow>;
  comentarios: Record<string, ComentarioRow[]>;
}

// ─── Semanas ──────────────────────────────────────────────────────────────────

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

export async function fetchSemanaJson(semana: number): Promise<PiezasData> {
  return api.get<PiezasData>(`/planificacion/semana/${semana}`);
}

// ─── Interacción ──────────────────────────────────────────────────────────────

export async function fetchInteraccion(semana: number): Promise<Interaccion> {
  return api.get<Interaccion>(`/planificacion/semana/${semana}/interaccion`);
}

export async function patchRealizada(semana: number, piezaId: string, realizada: boolean): Promise<EstadoRow> {
  return api.patch<EstadoRow>(`/planificacion/semana/${semana}/ficha/${encodeURIComponent(piezaId)}/realizada`, { realizada });
}

export async function postComentario(semana: number, piezaId: string, texto: string): Promise<ComentarioRow> {
  return api.post<ComentarioRow>(`/planificacion/semana/${semana}/ficha/${encodeURIComponent(piezaId)}/comentario`, { texto });
}

export async function deleteComentario(id: number): Promise<void> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE}/planificacion/comentario/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Error ${res.status}`);
}
