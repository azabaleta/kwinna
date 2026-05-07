import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Categorías
  const catCalzasCortas = await prisma.category.upsert({
    where: { code: '01' }, update: {},
    create: { code: '01', name: 'Calzas Cortas' },
  })
  const catCalzasLargas = await prisma.category.upsert({
    where: { code: '02' }, update: {},
    create: { code: '02', name: 'Calzas Largas' },
  })

  // Tipos de prenda para Calzas Cortas
  const shortLycra = await prisma.itemType.upsert({
    where: { categoryId_code: { categoryId: catCalzasCortas.id, code: '01' } }, update: {},
    create: { categoryId: catCalzasCortas.id, code: '01', name: 'Short de lycra' },
  })
  const bermuda = await prisma.itemType.upsert({
    where: { categoryId_code: { categoryId: catCalzasCortas.id, code: '02' } }, update: {},
    create: { categoryId: catCalzasCortas.id, code: '02', name: 'Bermuda' },
  })

  // Tipos de prenda para Calzas Largas
  const chupin = await prisma.itemType.upsert({
    where: { categoryId_code: { categoryId: catCalzasLargas.id, code: '01' } }, update: {},
    create: { categoryId: catCalzasLargas.id, code: '01', name: 'Chupín' },
  })
  const palazzo = await prisma.itemType.upsert({
    where: { categoryId_code: { categoryId: catCalzasLargas.id, code: '02' } }, update: {},
    create: { categoryId: catCalzasLargas.id, code: '02', name: 'Palazzo' },
  })

  // Calidades por tipo
  const shortPremium = await prisma.quality.upsert({
    where: { itemTypeId_code: { itemTypeId: shortLycra.id, code: '1' } }, update: {},
    create: { itemTypeId: shortLycra.id, code: '1', name: 'Premium' },
  })
  const shortEstandar = await prisma.quality.upsert({
    where: { itemTypeId_code: { itemTypeId: shortLycra.id, code: '2' } }, update: {},
    create: { itemTypeId: shortLycra.id, code: '2', name: 'Estándar' },
  })
  const shortEconomica = await prisma.quality.upsert({
    where: { itemTypeId_code: { itemTypeId: shortLycra.id, code: '3' } }, update: {},
    create: { itemTypeId: shortLycra.id, code: '3', name: 'Económica' },
  })

  const bermudaPremium = await prisma.quality.upsert({
    where: { itemTypeId_code: { itemTypeId: bermuda.id, code: '1' } }, update: {},
    create: { itemTypeId: bermuda.id, code: '1', name: 'Premium' },
  })
  const bermudaEstandar = await prisma.quality.upsert({
    where: { itemTypeId_code: { itemTypeId: bermuda.id, code: '2' } }, update: {},
    create: { itemTypeId: bermuda.id, code: '2', name: 'Estándar' },
  })

  const chupinEstandar = await prisma.quality.upsert({
    where: { itemTypeId_code: { itemTypeId: chupin.id, code: '2' } }, update: {},
    create: { itemTypeId: chupin.id, code: '2', name: 'Estándar' },
  })
  const chupinEconomica = await prisma.quality.upsert({
    where: { itemTypeId_code: { itemTypeId: chupin.id, code: '3' } }, update: {},
    create: { itemTypeId: chupin.id, code: '3', name: 'Económica' },
  })

  const palazzoPremium = await prisma.quality.upsert({
    where: { itemTypeId_code: { itemTypeId: palazzo.id, code: '1' } }, update: {},
    create: { itemTypeId: palazzo.id, code: '1', name: 'Premium' },
  })

  // Variantes por calidad (colores varían por calidad)
  const coloresFull  = [['01', 'Negro'], ['02', 'Azul'], ['03', 'Blanco'], ['04', 'Rosa']]
  const coloresBase  = [['01', 'Negro'], ['02', 'Azul'], ['03', 'Blanco']]
  const coloresBasic = [['01', 'Negro'], ['02', 'Azul']]

  async function seedVariants(qualityId: number, colors: string[][]) {
    for (const [code, name] of colors) {
      await prisma.variant.upsert({
        where: { qualityId_code: { qualityId, code } }, update: {},
        create: { qualityId, code, name },
      })
    }
  }

  await seedVariants(shortPremium.id,   coloresFull)   // Premium: 4 colores
  await seedVariants(shortEstandar.id,  coloresBase)   // Estándar: 3 colores
  await seedVariants(shortEconomica.id, coloresBasic)  // Económica: 2 colores

  await seedVariants(bermudaPremium.id,  coloresFull)
  await seedVariants(bermudaEstandar.id, coloresBase)

  await seedVariants(chupinEstandar.id,  coloresBase)
  await seedVariants(chupinEconomica.id, coloresBasic)

  await seedVariants(palazzoPremium.id, coloresFull)

  console.log('Seed completado.')
  console.log('  2 categorías, 4 tipos de prenda, 8 calidades')
  console.log('  Variantes por calidad: Premium=4 colores, Estándar=3, Económica=2')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
