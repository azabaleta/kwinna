import { forwardRef } from "react";
import { RETURN_REASON_LABELS, type ReturnReason } from "@kwinna/contracts";
import KwinnaLogo from "./KwinnaLogo";

export interface CreditNoteData {
  customerName?:  string;
  originalCredit: number;
  usedInSale:     number;
  remaining:      number;
  reason?:        ReturnReason;
  date:           Date;
}

function fmtPrice(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style:                 "currency",
    currency:              "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d: Date): string {
  return d.toLocaleString("es-AR", {
    day:    "2-digit",
    month:  "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

/**
 * Nota de crédito imprimible — mismas dimensiones que ReceiptTicket (58mm).
 * Se emite cuando el crédito de devolución supera el total de la nueva venta.
 */
const CreditNote = forwardRef<HTMLDivElement, { data: CreditNoteData }>(
  ({ data }, ref) => {
    const sep = "─".repeat(32);

    return (
      <div ref={ref} className="receipt-ticket">
        <div className="receipt-header">
          <KwinnaLogo className="receipt-logo" />
          <p className="receipt-sub">Nota de crédito</p>
          <p className="receipt-date">{fmtDate(data.date)}</p>
        </div>

        <p className="receipt-sep">{sep}</p>

        <div className="receipt-footer">
          {data.customerName && <p>Cliente: {data.customerName}</p>}
          {data.reason && (
            <p>Motivo: {RETURN_REASON_LABELS[data.reason]}</p>
          )}
        </div>

        <p className="receipt-sep">{sep}</p>

        <div className="receipt-totals">
          <div className="receipt-total-line">
            <span>Crédito original</span>
            <span>{fmtPrice(data.originalCredit)}</span>
          </div>
          <div className="receipt-total-line">
            <span>Aplicado en venta</span>
            <span>-{fmtPrice(data.usedInSale)}</span>
          </div>
          <div className="receipt-total-line receipt-grand-total">
            <span>SALDO A FAVOR</span>
            <span>{fmtPrice(data.remaining)}</span>
          </div>
        </div>

        <p className="receipt-sep">{sep}</p>

        <div className="receipt-footer" style={{ marginTop: "4mm" }}>
          <p>Firma: {"_".repeat(20)}</p>
          <p style={{ marginTop: "2mm" }}>Aclaración: {"_".repeat(16)}</p>
        </div>

        <p className="receipt-sep">{sep}</p>

        <div className="receipt-thanks">
          <p>¡Gracias por tu preferencia!</p>
          <p className="receipt-url">somoskwinna.com</p>
        </div>
      </div>
    );
  }
);

CreditNote.displayName = "CreditNote";

export default CreditNote;
