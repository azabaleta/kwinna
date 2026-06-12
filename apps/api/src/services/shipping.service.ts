import { findShippingZoneByCity, findAllShippingZones, insertShippingZone, updateShippingZone, deleteShippingZone } from "../db/repositories/shipping-zone.repository";
import type { ShippingZone, ShippingZoneCreateInput, ShippingZoneUpdateInput } from "@kwinna/contracts";
import { normalizeCity } from "@kwinna/contracts";

// ─── Costo de envío (fuente de verdad del backend) ────────────────────────────
// Consultado ANTES de abrir la transacción de venta para mantener la TX síncrona.
// Retorna 0 si la ciudad no tiene tarifa fija → coordinación manual con el local.

export async function computeShippingCost(city: string): Promise<number> {
  if (!city.trim()) return 0;
  const zone = await findShippingZoneByCity(normalizeCity(city));
  return zone?.cost ?? 0;
}

// ─── CRUD de zonas (admin) ────────────────────────────────────────────────────

export async function listShippingZones(): Promise<ShippingZone[]> {
  return findAllShippingZones();
}

export async function createShippingZone(input: ShippingZoneCreateInput): Promise<ShippingZone> {
  const city = normalizeCity(input.displayName);
  const existing = await findShippingZoneByCity(city);
  if (existing) {
    throw Object.assign(
      new Error(`Ya existe una zona para "${input.displayName}"`),
      { statusCode: 409 }
    );
  }
  return insertShippingZone(city, input.displayName.trim(), input.cost);
}

export async function patchShippingZone(id: string, input: ShippingZoneUpdateInput): Promise<ShippingZone> {
  let newCity: string | undefined;

  if (input.displayName !== undefined) {
    newCity = normalizeCity(input.displayName);
    const conflict = await findShippingZoneByCity(newCity);
    if (conflict && conflict.id !== id) {
      throw Object.assign(
        new Error(`Ya existe una zona configurada para "${input.displayName}"`),
        { statusCode: 409 }
      );
    }
  }

  const updated = await updateShippingZone(id, {
    city:        newCity,
    displayName: input.displayName,
    cost:        input.cost,
  });
  if (!updated) {
    throw Object.assign(new Error("Zona de envío no encontrada"), { statusCode: 404 });
  }
  return updated;
}

export async function removeShippingZone(id: string): Promise<void> {
  const deleted = await deleteShippingZone(id);
  if (!deleted) {
    throw Object.assign(new Error("Zona de envío no encontrada"), { statusCode: 404 });
  }
}
