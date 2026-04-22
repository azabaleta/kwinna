// ─── Georef API — datos.gob.ar ────────────────────────────────────────────────
// API pública del Estado argentino. Sin auth. Sin costo.
// Docs: https://apis.datos.gob.ar/georef/api

const BASE = "https://apis.datos.gob.ar/georef/api";

export interface Provincia {
  id:     string;
  nombre: string;
}

export interface Municipio {
  id:     string;
  nombre: string;
}

export async function fetchProvincias(): Promise<Provincia[]> {
  const res = await fetch(
    `${BASE}/provincias?campos=id,nombre&orden=nombre&max=100`,
    { next: { revalidate: 86400 } }, // cache 24 h en Next.js
  );
  if (!res.ok) throw new Error("No se pudieron cargar las provincias");
  const json = await res.json() as { provincias: Provincia[] };
  return json.provincias;
}

export async function fetchMunicipios(provinciaId: string): Promise<Municipio[]> {
  const res = await fetch(
    `${BASE}/municipios?provincia=${provinciaId}&campos=id,nombre&orden=nombre&max=500`,
  );
  if (!res.ok) throw new Error("No se pudieron cargar los municipios");
  const json = await res.json() as { municipios: Municipio[] };
  return json.municipios;
}
