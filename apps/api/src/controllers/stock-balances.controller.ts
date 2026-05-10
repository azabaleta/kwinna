import type { Request, Response } from "express";
import { db } from "../db";
import { stockBalancesTable, stockBalanceItemsTable, stockTable, productsTable, stockMovementsTable } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { createStockBalance, getStockBalance, listStockBalances, updateStockBalanceDraft } from "../repositories/stock-balance.repository";

export async function createBalance(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const balance = await createStockBalance(userId, req.body);
    res.status(201).json({ data: balance });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    res.status(500).json({ message: "Error al crear el balance", error: msg });
  }
}

export async function listBalances(req: Request, res: Response) {
  try {
    const balances = await listStockBalances();
    res.json({ data: balances });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    res.status(500).json({ message: "Error listando balances", error: msg });
  }
}

export async function getBalance(req: Request, res: Response) {
  try {
    const balance = await getStockBalance(req.params.id);
    if (!balance) {
      return res.status(404).json({ message: "Balance no encontrado" });
    }
    res.json({ data: balance });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    res.status(500).json({ message: "Error obteniendo balance", error: msg });
  }
}

export async function updateDraft(req: Request, res: Response) {
  try {
    const balance = await getStockBalance(req.params.id);
    if (!balance) return res.status(404).json({ message: "Balance no encontrado" });
    if (balance.status !== "in_progress") {
      return res.status(400).json({ message: "No se puede editar un balance completado" });
    }

    await updateStockBalanceDraft(req.params.id, req.body.items);
    res.json({ message: "Borrador guardado" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    res.status(500).json({ message: "Error guardando borrador", error: msg });
  }
}

export async function completeBalance(req: Request, res: Response) {
  try {
    const balanceId = req.params.id;
    const balance = await getStockBalance(balanceId);
    
    if (!balance) return res.status(404).json({ message: "Balance no encontrado" });
    if (balance.status !== "in_progress") {
      return res.status(400).json({ message: "El balance ya está completado o cancelado" });
    }

    const clientItems: Array<{ productId: string, size?: string, quantity: number }> = req.body.items || [];

    await db.transaction(async (tx) => {
      // 1. Obtener todo el stock actual > 0
      const currentStock = await tx
        .select({
          id: stockTable.id,
          productId: stockTable.productId,
          size: stockTable.size,
          quantity: stockTable.quantity,
        })
        .from(stockTable);

      // 2. Obtener productos para los precios
      const allProducts = await tx
        .select({
          id: productsTable.id,
          price: productsTable.price,
        })
        .from(productsTable);

      const productPrices = new Map(allProducts.map(p => [p.id, parseFloat(p.price as string)]));

      // 3. Crear mapa del conteo del cliente
      const countedItemsMap = new Map();
      for (const item of clientItems) {
        countedItemsMap.set(`${item.productId}-${item.size || ""}`, item.quantity);
      }

      let totalLosses = 0;
      let totalDiscrepancies = 0;
      const balanceItemsToInsert = [];
      const movementsToInsert = [];
      const stockUpdates = [];

      const processedKeys = new Set<string>();

      // 4. Analizar el stock actual del sistema vs lo que el cliente contó
      for (const sysStock of currentStock) {
        // Ignorar si el stock es 0 y el cliente no lo escaneó (optimización)
        const key = `${sysStock.productId}-${sysStock.size}`;
        const countedQty = countedItemsMap.get(key) || 0;
        const expectedQty = sysStock.quantity;
        processedKeys.add(key);

        if (expectedQty === 0 && countedQty === 0) continue; // Nada cambió

        const unitPrice = productPrices.get(sysStock.productId) || 0;
        
        balanceItemsToInsert.push({
          balanceId,
          productId: sysStock.productId,
          size: sysStock.size,
          expectedQuantity: expectedQty,
          countedQuantity: countedQty,
          unitPrice: unitPrice.toString(),
        });

        if (countedQty !== expectedQty) {
          totalDiscrepancies++;
          const diff = countedQty - expectedQty; // Si había 10 y contamos 8, diff = -2 (Pérdida)
          
          if (diff < 0) {
            totalLosses += (Math.abs(diff) * unitPrice);
          }

          // Registrar movimiento de ajuste (guardamos el offset o la cantidad total, depende de la app. Kwinna guarda la cantidad absoluta del movimiento y el tipo)
          // Asumiremos que un ajuste negativo es una "salida" o ajuste negativo.
          movementsToInsert.push({
            productId: sysStock.productId,
            size: sysStock.size,
            type: "adjustment" as const,
            quantity: diff, // guardamos el diff real (positivo o negativo)
            reason: `Balance de stock #${balanceId.split('-')[0]}`,
          });

          // Preparamos actualización de stock
          stockUpdates.push({
            id: sysStock.id,
            productId: sysStock.productId,
            size: sysStock.size,
            newQuantity: countedQty,
          });
        }
      }

      // 5. Analizar productos contados que NO estaban en el stock del sistema (productos nuevos o que estaban en 0 y no aparecieron en currentStock)
      for (const item of clientItems) {
        const key = `${item.productId}-${item.size || ""}`;
        if (!processedKeys.has(key)) {
          const unitPrice = productPrices.get(item.productId) || 0;
          const expectedQty = 0;
          const countedQty = item.quantity;
          
          if (countedQty > 0) {
            balanceItemsToInsert.push({
              balanceId,
              productId: item.productId,
              size: item.size || "",
              expectedQuantity: expectedQty,
              countedQuantity: countedQty,
              unitPrice: unitPrice.toString(),
            });

            totalDiscrepancies++;
            // diff > 0, no hay pérdida económica, hay ganancia/sobrante
            
            movementsToInsert.push({
              productId: item.productId,
              size: item.size || "",
              type: "adjustment" as const,
              quantity: countedQty,
              reason: `Balance de stock #${balanceId.split('-')[0]} - Producto sobrante`,
            });

            stockUpdates.push({
              productId: item.productId,
              size: item.size || "",
              newQuantity: countedQty,
            });
          }
        }
      }

      // Limpiar items borrador
      await tx.delete(stockBalanceItemsTable).where(eq(stockBalanceItemsTable.balanceId, balanceId));

      // Insertar items finales
      if (balanceItemsToInsert.length > 0) {
        await tx.insert(stockBalanceItemsTable).values(balanceItemsToInsert);
      }

      // Insertar movimientos
      if (movementsToInsert.length > 0) {
        await tx.insert(stockMovementsTable).values(movementsToInsert);
      }

      // Actualizar tabla stock
      for (const update of stockUpdates) {
        if (update.id) {
          await tx.update(stockTable)
            .set({ quantity: update.newQuantity, updatedAt: new Date() })
            .where(eq(stockTable.id, update.id));
        } else {
          await tx.insert(stockTable)
            .values({
              productId: update.productId,
              size: update.size,
              quantity: update.newQuantity,
            });
        }
      }

      // Marcar balance como completado
      // Precisión: 100 - (discrepancias / total items procesados) * 100
      const totalItemsProcessed = processedKeys.size;
      let accuracy = 100.0;
      if (totalItemsProcessed > 0) {
        accuracy = 100.0 - ((totalDiscrepancies / totalItemsProcessed) * 100);
        if (accuracy < 0) accuracy = 0;
      }

      await tx.update(stockBalancesTable)
        .set({
          status: "completed",
          completedAt: new Date(),
          totalLosses: totalLosses.toString(),
          totalDiscrepancies,
          accuracyPercentage: accuracy.toFixed(2),
        })
        .where(eq(stockBalancesTable.id, balanceId));
    });

    const finalBalance = await getStockBalance(balanceId);
    res.json({ data: finalBalance });
    
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    res.status(500).json({ message: "Error completando balance", error: msg });
  }
}
