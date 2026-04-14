import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

/**
 * Cliente singleton de MercadoPago.
 * Se inicializa una única vez con el access token del entorno.
 * Lanza en runtime si MP_ACCESS_TOKEN no está configurado.
 */
function buildMPClient(): MercadoPagoConfig {
  const token = process.env["MP_ACCESS_TOKEN"];
  if (!token) {
    throw new Error(
      "[MercadoPago] MP_ACCESS_TOKEN no está configurado. " +
      "Añadí la variable al .env antes de usar el checkout con MP."
    );
  }
  return new MercadoPagoConfig({ accessToken: token });
}

// Lazy singleton — se construye la primera vez que se usa
let _client: MercadoPagoConfig | null = null;

function getClient(): MercadoPagoConfig {
  if (!_client) _client = buildMPClient();
  return _client;
}

export function getPreferenceClient(): Preference {
  return new Preference(getClient());
}

export function getPaymentClient(): Payment {
  return new Payment(getClient());
}
