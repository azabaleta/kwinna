import { z } from "zod";

// ─── CheckoutFormSchema ───────────────────────────────────────────────────────
// Valida los datos del cliente y envío en el checkout web.
// Todos los campos se envían a la API en POST /sales/checkout.

export const CheckoutFormSchema = z.object({
  // ── Contacto ──────────────────────────────────────────────────────────────
  name: z
    .string()
    .min(2, { message: "Ingresá tu nombre completo (mínimo 2 caracteres)" }),
  email: z
    .string()
    .email({ message: "Ingresá un email válido" }),
  phone: z
    .string()
    .min(1, { message: "El teléfono es obligatorio" }),
  dni: z
    .string()
    .min(1, { message: "El DNI o CUIL es obligatorio" }),

  // ── Envío ─────────────────────────────────────────────────────────────────
  shippingAddress: z
    .string()
    .min(5, { message: "Ingresá tu dirección completa" }),
  shippingCity: z
    .string()
    .min(2, { message: "Ingresá la ciudad" }),
  shippingProvince: z
    .string()
    .min(2, { message: "Ingresá la provincia" }),
  shippingZipCode: z
    .string()
    .min(1, { message: "El código postal es obligatorio" }),
});

export type CheckoutFormValues = z.infer<typeof CheckoutFormSchema>;
