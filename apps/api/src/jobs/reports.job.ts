import { schedule } from "node-cron";
import { generateSnapshot } from "../services/reports.service";
import { uploadCsvToDrive } from "../services/drive.service";
import { buildSnapshotCsv, snapshotFilename } from "../lib/snapshot-csv";

// ─── Labels ───────────────────────────────────────────────────────────────────

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ─── Core helper ──────────────────────────────────────────────────────────────

async function generateAndUpload(
  period:   "monthly" | "semestral",
  label:    string,
  dateFrom: Date,
  dateTo:   Date,
): Promise<void> {
  const tag = `[Reports Job][${label}]`;
  process.stdout.write(`${tag} Generando snapshot…\n`);

  try {
    const snapshot = await generateSnapshot({
      period,
      label,
      dateFrom: dateFrom.toISOString(),
      dateTo:   dateTo.toISOString(),
    });

    process.stdout.write(`${tag} Snapshot guardado (id: ${snapshot.id}). Subiendo a Drive…\n`);

    const csv      = buildSnapshotCsv(snapshot);
    const filename = snapshotFilename(snapshot);
    const { webViewLink } = await uploadCsvToDrive(filename, csv);

    process.stdout.write(`${tag} ✓ Subido a Drive: ${webViewLink}\n`);
  } catch (err) {
    // No relanzamos — no queremos tumbar el servidor por un fallo de reporte.
    process.stderr.write(`${tag} ERROR: ${(err as Error).message}\n`);
  }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function startOf(year: number, month: number /* 0-indexed */): Date {
  return new Date(year, month, 1, 0, 0, 0, 0);
}

function endOf(year: number, month: number /* 0-indexed */): Date {
  // Día 0 del mes siguiente = último día del mes pedido
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

// ─── Job payload ──────────────────────────────────────────────────────────────
// Se ejecuta el día 1 de cada mes a las 06:00 (hora del servidor).
// Siempre genera el reporte mensual del mes anterior.
// En enero genera además el semestral H2 del año anterior.
// En julio genera además el semestral H1 del año en curso.

async function runMonthlyJob(): Promise<void> {
  const now       = new Date();
  const thisMonth = now.getMonth();   // 0 = enero … 11 = diciembre
  const thisYear  = now.getFullYear();

  // ── Mes anterior ─────────────────────────────────────────────────────────
  const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const prevYear  = thisMonth === 0 ? thisYear - 1 : thisYear;

  await generateAndUpload(
    "monthly",
    `${MONTHS_ES[prevMonth]} ${prevYear}`,
    startOf(prevYear, prevMonth),
    endOf(prevYear,   prevMonth),
  );

  // ── 1 de enero → 2do semestre del año anterior (julio – diciembre) ────────
  if (thisMonth === 0) {
    await generateAndUpload(
      "semestral",
      `2do semestre ${prevYear}`,
      startOf(prevYear, 6),   // 1 jul año anterior
      endOf(prevYear,   11),  // 31 dic año anterior
    );
  }

  // ── 1 de julio → 1er semestre del año en curso (enero – junio) ───────────
  if (thisMonth === 6) {
    await generateAndUpload(
      "semestral",
      `1er semestre ${thisYear}`,
      startOf(thisYear, 0),   // 1 ene
      endOf(thisYear,   5),   // 30 jun
    );
  }
}

// ─── Registro del cron ────────────────────────────────────────────────────────
// "0 6 1 * *"  → minuto 0, hora 6, día 1 de cualquier mes, cualquier año.
// scheduled: false → no arranca hasta que se llame a .start() explícitamente.

export function registerReportsJob(): void {
  schedule("0 6 1 * *", runMonthlyJob);
  process.stdout.write("[Reports Job] Cron registrado — se ejecuta el día 1 de cada mes a las 06:00\n");
}
