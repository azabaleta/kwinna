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
  shippingAddress: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingProvince: z.string().optional(),
  shippingZipCode: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.shippingMethod === "delivery") {
    if (!data.shippingAddress || data.shippingAddress.trim().length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ingresá tu dirección", path: ["shippingAddress"] });
    }
    if (!data.shippingCity || data.shippingCity.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ingresá la ciudad", path: ["shippingCity"] });
    }
    if (!data.shippingProvince || data.shippingProvince.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ingresá la provincia", path: ["shippingProvince"] });
    }
    if (!data.shippingZipCode || data.shippingZipCode.trim().length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El código postal es obligatorio", path: ["shippingZipCode"] });
    }
  }
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
