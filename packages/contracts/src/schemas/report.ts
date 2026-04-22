import { z } from "zod";
import { ReturnReasonSchema } from "./return";

// ─── Period ───────────────────────────────────────────────────────────────────

export const SnapshotPeriodSchema = z.enum(["monthly", "semestral"]);
export type SnapshotPeriod = z.infer<typeof SnapshotPeriodSchema>;

// ─── Payload (datos calculados al momento del snapshot) ───────────────────────

export const TopProductSchema = z.object({
  productId: z.string().uuid(),
  name:      z.string(),
  units:     z.number().int().nonnegative(),
  revenue:   z.number().nonnegative(),
});

export const CriticalStockItemSchema = z.object({
  productId: z.string().uuid(),
  name:      z.string(),
  size:      z.string().optional(),
  quantity:  z.number().int().nonnegative(),
});

export const SnapshotDataSchema = z.object({
  sales: z.object({
    count:           z.number().int(),
    countWeb:        z.number().int(),
    countPos:        z.number().int(),
    revenue:         z.number(),
    revenueWeb:      z.number(),
    revenuePos:      z.number(),
    shippingRevenue: z.number(),
    avgOrderValue:   z.number(),
    topProducts:     z.array(TopProductSchema),
  }),
  returns: z.object({
    count:        z.number().int(),
    lostQuantity: z.number().int(),
    lostValue:    z.number(),
    byReason:     z.record(ReturnReasonSchema, z.number().int()),
  }),
  conversion: z.object({
    shopViews:           z.number().int(),
    cartAdds:            z.number().int(),
    checkoutStarts:      z.number().int(),
    salesCompleted:      z.number().int(),
    conversionRate:      z.number(),   // porcentaje, 0-100
    cartAbandonmentRate: z.number(),   // porcentaje, 0-100
  }),
  stock: z.object({
    criticalItems: z.array(CriticalStockItemSchema),
  }),
});

export type SnapshotData = z.infer<typeof SnapshotDataSchema>;

// ─── MetricSnapshot entity ────────────────────────────────────────────────────

export const MetricSnapshotSchema = z.object({
  id:        z.string().uuid(),
  period:    SnapshotPeriodSchema,
  label:     z.string(),
  dateFrom:  z.string().datetime(),
  dateTo:    z.string().datetime(),
  data:      SnapshotDataSchema,
  createdAt: z.string().datetime(),
});

export type MetricSnapshot = z.infer<typeof MetricSnapshotSchema>;

// ─── API wrappers ─────────────────────────────────────────────────────────────

export const MetricSnapshotResponseSchema = z.object({
  data: MetricSnapshotSchema,
});
export type MetricSnapshotResponse = z.infer<typeof MetricSnapshotResponseSchema>;

export const MetricSnapshotListResponseSchema = z.object({
  data: z.array(MetricSnapshotSchema),
});
export type MetricSnapshotListResponse = z.infer<typeof MetricSnapshotListResponseSchema>;

// ─── POST /reports/snapshots body ─────────────────────────────────────────────

export const GenerateSnapshotInputSchema = z.object({
  period:   SnapshotPeriodSchema,
  dateFrom: z.string().datetime(),
  dateTo:   z.string().datetime(),
  label:    z.string().min(1).max(100),
});

export type GenerateSnapshotInput = z.infer<typeof GenerateSnapshotInputSchema>;
