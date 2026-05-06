import { eq } from "drizzle-orm";
import type { CreditNote } from "@kwinna/contracts";
import { db } from "../index";
import { creditNotesTable } from "../schema";
import type { ReturnReason } from "@kwinna/contracts";

// ─── Code generator ───────────────────────────────────────────────────────────
// Genera un código legible de 8 chars sin caracteres ambiguos (0/O, 1/I/L).
// Espacio de códigos: 32^6 ≈ 1 B → colisiones despreciables.

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCreditNoteCode(): string {
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `NC-${suffix}`;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function mapCreditNoteRow(row: typeof creditNotesTable.$inferSelect): CreditNote {
  return {
    id:                 row.id,
    code:               row.code,
    amount:             Number(row.amount),
    status:             row.status as "active" | "redeemed" | "void",
    ...(row.customerName       !== null && { customerName:       row.customerName       ?? undefined }),
    ...(row.customerDni        !== null && { customerDni:        row.customerDni        ?? undefined }),
    ...(row.posCustomerId      !== null && { posCustomerId:      row.posCustomerId      ?? undefined }),
    ...(row.userId             !== null && { userId:             row.userId             ?? undefined }),
    ...(row.reason             !== null && { reason:             row.reason             ?? undefined }),
    ...(row.returnId           !== null && { returnId:           row.returnId           ?? undefined }),
    ...(row.originCreditNoteId !== null && { originCreditNoteId: row.originCreditNoteId ?? undefined }),
    ...(row.redeemedSaleId     !== null && { redeemedSaleId:     row.redeemedSaleId     ?? undefined }),
    ...(row.redeemedAt         !== null && { redeemedAt:         row.redeemedAt?.toISOString() }),
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateCreditNoteInput {
  amount:              number;
  customerName?:       string;
  customerDni?:        string;
  posCustomerId?:      string;
  userId?:             string;
  reason?:             ReturnReason;
  returnId?:           string;
  originCreditNoteId?: string;
}

export async function insertCreditNote(input: CreateCreditNoteInput): Promise<CreditNote> {
  const code = generateCreditNoteCode();
  const [row] = await db
    .insert(creditNotesTable)
    .values({
      code,
      amount: String(input.amount),
      ...(input.customerName      !== undefined && { customerName:      input.customerName }),
      ...(input.customerDni       !== undefined && { customerDni:       input.customerDni }),
      ...(input.posCustomerId     !== undefined && { posCustomerId:     input.posCustomerId }),
      ...(input.userId            !== undefined && { userId:            input.userId }),
      ...(input.reason            !== undefined && { reason:            input.reason }),
      ...(input.returnId          !== undefined && { returnId:          input.returnId }),
      ...(input.originCreditNoteId !== undefined && { originCreditNoteId: input.originCreditNoteId }),
    })
    .returning();
  return mapCreditNoteRow(row!);
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

export async function findCreditNoteByCode(code: string): Promise<CreditNote | undefined> {
  const rows = await db
    .select()
    .from(creditNotesTable)
    .where(eq(creditNotesTable.code, code.trim().toUpperCase()))
    .limit(1);
  return rows[0] ? mapCreditNoteRow(rows[0]) : undefined;
}

export async function findCreditNoteById(id: string): Promise<CreditNote | undefined> {
  const rows = await db
    .select()
    .from(creditNotesTable)
    .where(eq(creditNotesTable.id, id))
    .limit(1);
  return rows[0] ? mapCreditNoteRow(rows[0]) : undefined;
}
