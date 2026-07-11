ALTER TABLE "sales" ADD COLUMN "credit_applied" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
-- Backfill histórico: crédito aplicado a cada venta = monto de la nota canjeada
-- menos el residuo devuelto (cn.amount - residual). Cada venta canjea a lo sumo
-- una nota (creditNoteId único), por lo que el join es 1:1. Idempotente.
UPDATE "sales" s
SET "credit_applied" = cn."amount" - COALESCE(res."amount", 0)
FROM "credit_notes" cn
LEFT JOIN "credit_notes" res ON res."origin_credit_note_id" = cn."id"
WHERE cn."redeemed_sale_id" = s."id";