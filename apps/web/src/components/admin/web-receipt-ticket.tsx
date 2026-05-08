import { forwardRef } from "react";
import type { Product, Sale } from "@kwinna/contracts";

const PAYMENT_LABELS: Record<string, string> = {
  efectivo:        "Efectivo",
  transferencia:   "Transferencia",
  transfer:        "Transferencia",
  debito:          "Débito",
  credito:         "Crédito",
  orden_de_compra: "Orden de compra",
  por_devolucion:  "Por devolución",
};

function fmtPrice(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d: Date): string {
  return d.toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface WebReceiptTicketProps {
  sale:       Sale;
  productMap: Map<string, Pick<Product, "sku" | "name">>;
  reprint?:   boolean;
}

const WebReceiptTicket = forwardRef<HTMLDivElement, WebReceiptTicketProps>(
  ({ sale, productMap, reprint = false }, ref) => {
    const sep   = "─".repeat(32);
    const txCode = sale.id.replace(/-/g, "").slice(0, 10).toUpperCase();

    return (
      <div ref={ref} className="receipt-ticket">
        {reprint && <p className="receipt-reprint-mark">· reimpreso ·</p>}

        <div className="receipt-header">
          {/* Inline SVG isotipo — no depends on SVGR in Next.js */}
          <svg
            viewBox="0 0 976.91 524.76"
            xmlns="http://www.w3.org/2000/svg"
            className="receipt-logo"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M280.26.28c-103.19-5.26-103.52,64.28-100.34,144.94,0,0,0,159.8,0,159.8,0,34.84-28.34,63.18-63.18,63.18-36.08,1.89-67.01-26.9-66.89-63.18,0,0,0-163.52,0-163.52H1.54c4.57,95.06-34.55,271.9,111.49,275,62.84,2.01,115.32-48.53,115.2-111.49.94-46.4-.68-182.32,0-226.69-.39-28.27,30.18-32.02,52.03-29.73,16.39,0,29.73,13.33,29.73,29.73,0,0,0,66.89,0,66.89v234.13c-3.44,80.06-2.32,150.68,100.34,144.94,80.66-4.35,81.12-74.96,78.04-137.5,0,0,0-7.43,0-7.43v-144.94c1.16-83.55,128.9-83.61,130.07,0,0,0,0,144.93,0,144.93,0,0,0,7.43,0,7.43-3.19,62.29-2.43,133.4,78.05,137.5,78.95,5.85,106.97-42.04,100.33-115.21-.27-17.31.2-153.84,0-174.67,0-34.84,28.34-63.18,63.18-63.18,36.07-1.89,67.02,26.9,66.89,63.18,0,0,0,174.67,0,174.67h48.31c-5.86-95.66,37.94-283.44-111.49-286.15-62.84-2-115.32,48.53-115.2,111.49-.59,46.99.42,166.6,0,211.83.39,28.27-30.18,32.02-52.03,29.73-16.39,0-29.73-13.33-29.73-29.73.24-43.6-.17-166.45,0-211.83.12-62.95-52.37-113.49-115.21-111.49-140.61,4.61-108.86,161.91-111.49,256.43-.38,3.51.27,61.97,0,66.89.39,28.27-30.19,32.02-52.04,29.73-16.39,0-29.72-13.34-29.72-29.73,0,0,0-66.89,0-66.89v-234.13c2.23-63.34,6.48-140.61-78.04-144.94"
            />
          </svg>
          <p className="receipt-sub">Comprobante de venta</p>
          <p className="receipt-date">{fmtDate(new Date(sale.createdAt))}</p>
        </div>

        <p className="receipt-sep">{sep}</p>

        <div className="receipt-items">
          {sale.items.map((item, i) => {
            const prod = productMap.get(item.productId);
            return (
              <div key={i} className="receipt-item">
                <p className="receipt-item-name">
                  {prod?.name ?? item.productId.slice(0, 8) + "…"}
                  {item.size ? ` (${item.size})` : ""}
                </p>
                <div className="receipt-item-line">
                  <span>{item.quantity} x {fmtPrice(item.unitPrice)}</span>
                  <span>{fmtPrice(item.subtotal)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="receipt-sep">{sep}</p>

        <div className="receipt-totals">
          {sale.shippingCost > 0 && (
            <div className="receipt-total-line">
              <span>Envío:</span>
              <span>{fmtPrice(sale.shippingCost)}</span>
            </div>
          )}
          <div className="receipt-total-line receipt-grand-total">
            <span>TOTAL</span>
            <span>{fmtPrice(sale.total)}</span>
          </div>
        </div>

        <p className="receipt-sep">{sep}</p>

        <div className="receipt-footer">
          <p>Cliente: {sale.customerName}</p>
          {sale.customerDni && <p>DNI: {sale.customerDni}</p>}
          {sale.paymentMethod && (
            <p>Pago: {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}</p>
          )}
          {sale.saleNotes && <p>Nota: {sale.saleNotes}</p>}
          <p style={{ marginTop: "4px" }}>
            N° transacción: <strong>{txCode}</strong>
          </p>
        </div>

        <p className="receipt-sep">{sep}</p>

        <div className="receipt-thanks">
          <p>¡Gracias por tu compra!</p>
          <p className="receipt-url">somoskwinna.com</p>
        </div>
      </div>
    );
  }
);

WebReceiptTicket.displayName = "WebReceiptTicket";

export default WebReceiptTicket;
