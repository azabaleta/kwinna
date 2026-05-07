import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  // Orden: hijos antes que padres
  // Variant → Quality → ItemType → Category
  const v = await db.variant.deleteMany()
  const q = await db.quality.deleteMany()
  const t = await db.itemType.deleteMany()
  const p = await db.product.deleteMany()
  const c = await db.category.deleteMany()
  console.log('Borrados:', {
    variantes: v.count,
    calidades: q.count,
    tipos: t.count,
    productos: p.count,
    categorias: c.count,
  })
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
