/**
 * Servicio de zonificación de envíos — fuente de verdad del backend.
 *
 * El costo de envío NUNCA se acepta desde el cliente; siempre se deriva
 * aquí a partir de la ciudad declarada. Cualquier manipulación del
 * campo shippingCost en el payload del cliente es ignorada por diseño.
 *
 * Ciudades locales: tarifa fija $3500.
 * Fuera de zona: $0 + coordinación con la vendedora.
 */

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const LOCAL_SHIPPING_COST = 3_500;

const LOCAL_CITIES = new Set([
  "neuquen",
  "plottier",
  "cipolletti",
  "centenario",
]);

/**
 * Devuelve el costo de envío en pesos según la ciudad.
 * @param city — Ciudad tal como la ingresó el usuario (acepta tildes, mayúsculas).
 */
export function computeShippingCost(city: string): number {
  return LOCAL_CITIES.has(normalize(city)) ? LOCAL_SHIPPING_COST : 0;
}
