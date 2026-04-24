import { z } from "zod";

// ─── CheckoutFormSchema ───────────────────────────────────────────────────────
// Valida los datos del cliente y envío en el checkout web.

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

  // ── Método de entrega ─────────────────────────────────────────────────────
  shippingMethod: z.enum(["delivery", "pickup"]),

  // ── Envío (siempre presentes — se completan con datos del local si es pickup) ──
  shippingAddress: z
    .string()
    .min(1, { message: "Ingresá tu dirección" }),
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

// ─── Constantes del local ─────────────────────────────────────────────────────

export const STORE_ADDRESS = {
  shippingAddress:  "Local Kwinna",
  shippingCity:     "Neuquén",
  shippingProvince: "Neuquén",
  shippingZipCode:  "8300",
} as const;

// ─── Draft localStorage ───────────────────────────────────────────────────────

export const CHECKOUT_DRAFT_KEY = "kwinna-checkout-draft";

export interface CheckoutDraft {
  name:             string;
  email:            string;
  phone:            string;
  dni:              string;
  shippingAddress:  string;
  shippingCity:     string;
  shippingProvince: string;
  shippingZipCode:  string;
}
