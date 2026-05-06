import { eq, sql } from "drizzle-orm";
import type { CreditNote, Return, ReturnReason } from "@kwinna/contracts";
import { db } from "../db";
import { creditNotesTable, productsTable, returnsTable, stockMovementsTable, stockTable } from "../db/schema";
import { mapCreditNoteRow, generateCreditNoteCode } from "../db/repositories/credit-note.repository";
import { mapReturnRow } from "../db/repositories/returns.repository";
import { findSaleById } from "../db/repositories/sale.repository";

const RETURN_WINDOW_DAYS = 30;

export interface CreateReturnInput {
  saleId?:   string;
  productId: string;
  size?:     string;
  quantity:  number;
  reason:    ReturnReason;
  notes?:    string;
  restock:   boolean;
}

/**
 * Registra una devolución de forma totalmente atómica.
 *
 * Flujo (todo dentro de una sola transacción, excepto el chequeo de ventana):
 *   1. Verifica ventana de 30 días si hay saleId (read-only, fuera de tx).
 *   2. Resuelve el precio real del producto con FOR UPDATE — 404 si no existe.
 *   3. Inserta el registro de devolución.
 *   4. Restaura el stock con upsert atómico (sin race condition TOCTOU).
 *   5. Inserta la nota de crédito. Si hay colisión de código, reinicia la
 *      transacción con un código nuevo (máx. 3 intentos).
 */
export async function createReturn(
  input: CreateReturnInput,
): Promise<{ returnData: Return; creditNote: CreditNote }> {

  // 1 — Ventana de cambio (fuera de tx: lectura pura, no necesita lock) ────
  if (input.saleId) {
    const sale = await findSaleById(input.saleId);
    if (sale) {
      const diffDays = (Date.now() - new Date(sale.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > RETURN_WINDOW_DAYS) {
        throw Object.assign(new Error("tiempo de cambio expirado"), { statusCode: 422 });
      }
    }
  }

  const dbSize = input.size ?? "";

  // Retry loop en caso de colisión de código único (23505).
  // La tx hace rollback completo → ningún registro queda a medias.
  const MAX_CODE_ATTEMPTS = 3;

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    try {
      return await db.transaction(async (tx) => {

        // 2 — Precio real del producto (404 si fue eliminado) ─────────────
        const [productRow] = await tx
          .select({ price: productsTable.price })
          .from(productsTable)
          .where(eq(productsTable.id, input.productId))
          .for("update")
          .limit(1);

        if (!productRow) {
          throw Object.assign(new Error("Producto no encontrado"), { statusCode: 404 });
        }

        const unitPrice = Number(productRow.price);

        // 3 — Insertar devolución ─────────────────────────────────────────
        const [returnRow] = await tx
          .insert(returnsTable)
          .values({
            saleId:    input.saleId,
            productId: input.productId,
            size:      dbSize,
            quantity:  input.quantity,
            reason:    input.reason,
            notes:     input.notes,
            restocked: input.restock ? 1 : 0,
            unitPrice: String(unitPrice),
          })
          .returning();

        // 4 — Restaurar stock atómicamente (upsert, sin TOCTOU) ──────────
        if (input.restock) {
          await tx
            .insert(stockTable)
            .values({
              productId: input.productId,
              size:      dbSize,
              quantity:  input.quantity,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [stockTable.productId, stockTable.size],
              set: {
                quantity:  sql`${stockTable.quantity} + ${input.quantity}`,
                updatedAt: new Date(),
              },
            });

          await tx.insert(stockMovementsTable).values({
            productId: input.productId,
            size:      dbSize,
            type:      "in",
            quantity:  input.quantity,
            reason:    "Devolución de cliente",
            createdAt: new Date(),
          });
        }

        // 5 — Nota de crédito (código fresco en cada intento) ────────────
        const [creditRow] = await tx
          .insert(creditNotesTable)
          .values({
            code:     generateCreditNoteCode(),
            amount:   String(unitPrice * input.quantity),
            reason:   input.reason,
            returnId: returnRow!.id,
          })
          .returning();

        return {
          returnData: mapReturnRow(returnRow!),
          creditNote: mapCreditNoteRow(creditRow!),
        };
      });
    } catch (err) {
      const isCodeCollision =
        (err as { code?: string }).code === "23505" && attempt < MAX_CODE_ATTEMPTS - 1;
      if (!isCodeCollision) throw err;
    }
  }

  throw Object.assign(
    new Error("No se pudo generar un código único para la nota de crédito"),
    { statusCode: 500 },
  );
}
