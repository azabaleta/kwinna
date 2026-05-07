import { eq, ilike, inArray, or, and } from "drizzle-orm";
import type { Product, ProductBulkItem, ProductCreateInput, ProductQuery, ProductSeason, ProductUpdateInput } from "@kwinna/contracts";
import { db } from "../index";
import { productsTable, stockMovementsTable, stockTable, returnsTable } from "../schema";

// ─── Mapper ───────────────────────────────────────────────────────────────────
// Convierte la fila cruda de Drizzle al tipo del contrato Zod.
// numeric → Number, timestamp → ISO string, nullable → undefined,
// jsonb arrays → ya vienen como string[] desde postgres-js.

function mapRow(row: typeof productsTable.$inferSelect): Product {
  return {
    id:          row.id,
    name:        row.name,
    description: row.description ?? undefined,
    sku:         row.sku,
    price:       Number(row.price),
    categoryId:  row.categoryId ?? undefined,
    images:      row.images,
    tags:        row.tags,
    season:      (row.season as ProductSeason) ?? undefined,
    showInShop:  row.showInShop,
    createdAt:   row.createdAt.toISOString(),
    updatedAt:   row.updatedAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findAllProducts(query?: ProductQuery, opts?: { shopOnly?: boolean }): Promise<Product[]> {
  const q = query?.q?.trim();
  const conditions = [];

  if (q) {
    conditions.push(
      or(
        ilike(productsTable.name, `%${q}%`),
        ilike(productsTable.description, `%${q}%`),
      ),
    );
  }

  if (opts?.shopOnly) {
    conditions.push(eq(productsTable.showInShop, true));
  }

  const rows = conditions.length > 0
    ? await db.select().from(productsTable).where(and(...conditions))
    : await db.select().from(productsTable);

  return rows.map(mapRow);
}

export async function findProductById(id: string): Promise<Product | undefined> {
  const rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id));
  return rows[0] ? mapRow(rows[0]) : undefined;
}

export async function insertProduct(input: ProductCreateInput): Promise<Product> {
  const [row] = await db
    .insert(productsTable)
    .values({
      name:        input.name,
      description: input.description,
      sku:         input.sku,
      price:       input.price.toString(),
      categoryId:  input.categoryId,
      images:      input.images,
      tags:        input.tags,
      season:      input.season ?? null,
      showInShop:  input.showInShop ?? true,
      createdAt:   new Date(),
      updatedAt:   new Date(),
    })
    .returning();
  return mapRow(row!);
}

// ─── Update ──────────────────────────────────────────────────────────────────
// Solo actualiza los campos que vengan definidos en `input` (partial PATCH).

export async function updateProduct(
  id: string,
  input: ProductUpdateInput,
): Promise<Product | undefined> {
  // Construir el set-map con únicamente los campos presentes
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name        !== undefined) patch["name"]        = input.name;
  if (input.description !== undefined) patch["description"] = input.description;
  if (input.sku         !== undefined) patch["sku"]         = input.sku;
  if (input.price       !== undefined) patch["price"]       = input.price.toString();
  if (input.categoryId  !== undefined) patch["categoryId"]  = input.categoryId;
  if (input.images      !== undefined) patch["images"]      = input.images;
  if (input.tags        !== undefined) patch["tags"]        = input.tags;
  if (input.season      !== undefined) patch["season"]      = input.season ?? null;
  if (input.showInShop  !== undefined) patch["showInShop"]  = input.showInShop;

  const rows = await db
    .update(productsTable)
    .set(patch)
    .where(eq(productsTable.id, id))
    .returning();

  return rows[0] ? mapRow(rows[0]) : undefined;
}

// ─── Delete ───────────────────────────────────────────────────────────────────
// Eliminación segura en una transacción: movements → stock → product.
// FK constraints sin CASCADE requieren este orden explícito.

export async function deleteProductById(id: string): Promise<boolean> {
  const existing = await findProductById(id);
  if (!existing) return false;

  await db.transaction(async (tx) => {
    await tx.delete(returnsTable).where(eq(returnsTable.productId, id));
    await tx.delete(stockMovementsTable).where(eq(stockMovementsTable.productId, id));
    await tx.delete(stockTable).where(eq(stockTable.productId, id));
    await tx.delete(productsTable).where(eq(productsTable.id, id));
  });

  return true;
}

// ─── SKU prefix lookup (para el impresor de etiquetas de autoTags) ────────────
// Devuelve { fullCode, description }[] mapeando sku → fullCode, name → description.

export async function findProductsBySkuPrefix(
  prefix: string
): Promise<{ fullCode: string; description: string }[]> {
  const rows = await db
    .select({ sku: productsTable.sku, name: productsTable.name })
    .from(productsTable)
    .where(ilike(productsTable.sku, `${prefix}%`));

  return rows.map((r) => ({ fullCode: r.sku, description: r.name }));
}

// ─── Bulk insert ──────────────────────────────────────────────────────────────
// Runs inside a single Drizzle transaction.
// SKUs that already exist in the DB are silently skipped (idempotent import).

export async function bulkInsertProductsAndStock(
  items: ProductBulkItem[],
): Promise<{ created: number; skipped: number; products: Product[] }> {
  const createdProducts: Product[] = [];
  let skipped = 0;

  // Pre-fetch existing SKUs to avoid per-row round-trips inside the transaction
  const incomingSkus = items.map((i) => i.product.sku);
  const existingRows = await db
    .select({ sku: productsTable.sku })
    .from(productsTable)
    .where(inArray(productsTable.sku, incomingSkus));
  const existingSkus = new Set(existingRows.map((r) => r.sku));

  await db.transaction(async (tx) => {
    for (const item of items) {
      if (existingSkus.has(item.product.sku)) {
        skipped++;
        continue;
      }

      const [productRow] = await tx
        .insert(productsTable)
        .values({
          name:        item.product.name,
          description: item.product.description,
          sku:         item.product.sku,
          price:       item.product.price.toString(),
          categoryId:  item.product.categoryId,
          images:      item.product.images ?? [],
          tags:        item.product.tags ?? [],
          showInShop:  item.product.showInShop ?? true,
          createdAt:   new Date(),
          updatedAt:   new Date(),
        })
        .returning();

      const product = mapRow(productRow!);

      for (const entry of item.stock) {
        const dbSize = entry.size ?? "";
        await tx.insert(stockTable).values({
          productId: product.id,
          size:      dbSize,
          quantity:  entry.quantity,
          updatedAt: new Date(),
        });
        await tx.insert(stockMovementsTable).values({
          productId: product.id,
          type:      "in",
          quantity:  entry.quantity,
          reason:    "bulk_import",
          createdAt: new Date(),
        });
      }

      createdProducts.push(product);
      // Mark sku as seen so duplicates within the same batch are also skipped
      existingSkus.add(item.product.sku);
    }
  });

  return { created: createdProducts.length, skipped, products: createdProducts };
}
