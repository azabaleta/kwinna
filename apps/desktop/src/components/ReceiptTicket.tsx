import { forwardRef } from "react";
import type { PriceTier } from "@kwinna/contracts";
import KwinnaLogo from "./KwinnaLogo";

export interface ReceiptData {
  items: {
    name:      string;
    sku:       string;
    size?:     string;
    quantity:  number;
    unitPrice: number;
  }[];
  total:           number;
  customerName:    string;
  customerDni?:    string;
  paymentMethod:   string;
  priceTier:       PriceTier;
  saleNotes?:      string;
  date:            Date;
  creditApplied?:  number;
  creditNoteCode?: string;
  transactionId?:  string;
}

const PAYMENT_LABELS: Record<string, string> = {
  efectivo:        "Efectivo",
  transferencia:   "Transferencia",
  debito:          "Débito",
  credito:         "Crédito",
  orden_de_compra: "Orden de compra",
  por_devolucion:  "Por devolución",
};

const PRICE_TIER_LABELS: Record<PriceTier, string> = {
  lista:     "Lista",
  efectivo:  "Efectivo",
  mayorista: "Mayorista",
};

function fmtPrice(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d: Date): string {
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Receipt component optimized for 58mm thermal printers.
 * Printable width: ~48mm ≈ 32 chars at 12px monospace.
 * Uses forwardRef so the parent can grab the DOM node for printing.
 *
 * hidePrice=true → ticket de regalo: sin precios, sin totales.
 */
const ReceiptTicket = forwardRef<HTMLDivElement, { data: ReceiptData; hidePrice?: boolean }>(
  ({ data, hidePrice = false }, ref) => {
    const separator = "─".repeat(32);
    const txCode    = data.transactionId
      ? data.transactionId.replace(/-/g, "").slice(0, 10).toUpperCase()
      : null;

    return (
      <div ref={ref} className="receipt-ticket">
        {/* Header */}
        <div className="receipt-header">
          <KwinnaLogo className="receipt-logo" />
          <p className="receipt-sub">
            {hidePrice ? "Ticket de regalo" : "Comprobante de venta"}
          </p>
          <p className="receipt-date">{fmtDate(data.date)}</p>
        </div>

        <p className="receipt-sep">{separator}</p>

        {/* Items */}
        <div className="receipt-items">
          {data.items.map((item, i) => (
            <div key={i} className="receipt-item">
              <p className="receipt-item-name">
                {item.name}
                {item.size ? ` (${item.size})` : ""}
              </p>
              {hidePrice ? (
                <div className="receipt-item-line">
                  <span>Cantidad: {item.quantity}</span>
                </div>
              ) : (
                <div className="receipt-item-line">
                  <span>{item.quantity} x {fmtPrice(item.unitPrice)}</span>
                  <span>{fmtPrice(item.unitPrice * item.quantity)}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="receipt-sep">{separator}</p>

        {/* Totals — ocultos en ticket de regalo */}
        {!hidePrice && (
          <div className="receipt-totals">
            <div className="receipt-total-line">
              <span>Precio:</span>
              <span>{PRICE_TIER_LABELS[data.priceTier]}</span>
            </div>
            {data.creditApplied !== undefined && (
              <div className="receipt-total-line">
                <span>Crédito NC:</span>
                <span>-{fmtPrice(data.creditApplied)}</span>
              </div>
            )}
            <div className="receipt-total-line receipt-grand-total">
              <span>TOTAL</span>
              <span>{fmtPrice(data.total - (data.creditApplied ?? 0))}</span>
            </div>
          </div>
        )}

        {!hidePrice && <p className="receipt-sep">{separator}</p>}

        {/* Customer & payment */}
        <div className="receipt-footer">
          <p>Cliente: {data.customerName}</p>
          {data.customerDni && <p>DNI: {data.customerDni}</p>}
          {!hidePrice && (
            <p>Pago: {PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod}</p>
          )}
          {!hidePrice && data.creditNoteCode && (
            <p>Nota de crédito: {data.creditNoteCode}</p>
          )}
          {data.saleNotes && <p>Nota: {data.saleNotes}</p>}
          {txCode && (
            <p style={{ marginTop: "4px" }}>
              N° transacción: <strong>{txCode}</strong>
            </p>
          )}
          {hidePrice && (
            <p style={{ marginTop: "6px", fontSize: "9px", opacity: 0.6 }}>
              Presentá este comprobante para cambios.
            </p>
          )}
        </div>

        <p className="receipt-sep">{separator}</p>

        {/* Tagline */}
        <div className="receipt-thanks">
          <p>¡Gracias por tu compra!</p>
          <p className="receipt-url">somoskwinna.com</p>
        </div>
      </div>
    );
  }
);

ReceiptTicket.displayName = "ReceiptTicket";

export default ReceiptTicket;
