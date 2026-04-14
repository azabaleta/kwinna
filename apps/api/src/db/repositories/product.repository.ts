import { eq } from "drizzle-orm";
import type { Product, ProductCreateInput } from "@kwinna/contracts";
import { db } from "../index";
import { productsTable } from "../schema";

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
    createdAt:   row.createdAt.toISOString(),
    updatedAt:   row.updatedAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findAllProducts(): Promise<Product[]> {
  const rows = await db.select().from(productsTable);
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
      createdAt:   new Date(),
      updatedAt:   new Date(),
    })
    .returning();
  return mapRow(row!);
}
