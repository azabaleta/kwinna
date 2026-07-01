import { eq } from "drizzle-orm";
import type { PromoStrip } from "@kwinna/contracts";
import { db } from "../index";
import { promoStripTable, promotionalCodesTable } from "../schema";

// El promo strip es un singleton: siempre la fila id=1. Si todavía no existe
// (base recién migrada), se crea con los defaults del schema en la primera
// lectura. El código promocionado se resuelve por FK a la tabla de promo codes.
const SINGLETON_ID = 1;

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapRow(
  row:  typeof promoStripTable.$inferSelect,
  code: string | null,
): PromoStrip {
  return {
    enabled:     row.enabled,
    message:     row.message,
    promoCodeId: row.promoCodeId ?? null,
    code:        code ?? null,
    copyText:    row.copyText,
    copyEnabled: row.copyEnabled,
    updatedAt:   row.updatedAt.toISOString(),
  };
}

// LEFT JOIN a promotional_codes para traer el `code` del promo promocionado.
async function selectSingleton(): Promise<PromoStrip | null> {
  const [row] = await db
    .select({ strip: promoStripTable, code: promotionalCodesTable.code })
    .from(promoStripTable)
    .leftJoin(promotionalCodesTable, eq(promoStripTable.promoCodeId, promotionalCodesTable.id))
    .where(eq(promoStripTable.id, SINGLETON_ID))
    .limit(1);
  return row ? mapRow(row.strip, row.code) : null;
}

// ─── Query ────────────────────────────────────────────────────────────────────

export async function getPromoStrip(): Promise<PromoStrip> {
  const found = await selectSingleton();
  if (found) return found;

  // Primera vez: materializar la fila singleton con los defaults del schema.
  // onConflictDoNothing cubre la carrera con otra request concurrente.
  await db.insert(promoStripTable).values({ id: SINGLETON_ID }).onConflictDoNothing();
  const created = await selectSingleton();
  return created!; // garantizado tras el insert
}

// ─── Mutation ─────────────────────────────────────────────────────────────────

export async function updatePromoStrip(patch: {
  enabled?:     boolean;
  message?:     string;
  promoCodeId?: string | null;
  copyText?:    string;
  copyEnabled?: boolean;
}): Promise<PromoStrip> {
  // Garantiza que la fila exista antes del UPDATE.
  await getPromoStrip();

  const set: Partial<typeof promoStripTable.$inferInsert> = { updatedAt: new Date() };
  if (patch.enabled     !== undefined) set.enabled     = patch.enabled;
  if (patch.message     !== undefined) set.message     = patch.message;
  if (patch.promoCodeId !== undefined) set.promoCodeId = patch.promoCodeId;
  if (patch.copyText    !== undefined) set.copyText    = patch.copyText;
  if (patch.copyEnabled !== undefined) set.copyEnabled = patch.copyEnabled;

  await db.update(promoStripTable).set(set).where(eq(promoStripTable.id, SINGLETON_ID));
  return getPromoStrip(); // re-resuelve el código promocionado
}
