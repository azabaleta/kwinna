"use client";

import { useCallback, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type { Product, Sale } from "@kwinna/contracts";
import { useOperators } from "@/hooks/use-operators";
import WebReceiptTicket from "./web-receipt-ticket";

// Imprime el ticket de un pedido desde cualquier punto del panel (fila de la
// lista, botón del diálogo o auto-impresión al marcar como armado) usando una
// única área oculta `#web-receipt-print-area`. flushSync garantiza que el ticket
// (incluido el barcode, que se pinta en componentDidMount) quede montado en el
// DOM antes de disparar window.print().
export function useReceiptPrinter(
  productMap: Map<string, Pick<Product, "sku" | "name">>
): { printReceipt: (sale: Sale, opts?: { reprint?: boolean }) => void; printArea: ReactNode } {
  const { operators } = useOperators();
  const [target, setTarget] = useState<{ sale: Sale; reprint: boolean } | null>(null);

  const printReceipt = useCallback((sale: Sale, opts?: { reprint?: boolean }) => {
    flushSync(() => setTarget({ sale, reprint: opts?.reprint ?? true }));
    window.print();
  }, []);

  const vendorName = target?.sale.vendorId
    ? operators?.find((o) => o.id === target.sale.vendorId)?.name
    : undefined;

  const printArea: ReactNode = (
    <div id="web-receipt-print-area" style={{ display: "none" }}>
      {target && (
        <WebReceiptTicket
          sale={target.sale}
          productMap={productMap}
          reprint={target.reprint}
          vendorName={vendorName}
        />
      )}
    </div>
  );

  return { printReceipt, printArea };
}
