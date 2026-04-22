import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { google } from "googleapis";

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Prioridad de credenciales:
//   1. GOOGLE_CREDENTIALS_FILE — ruta a un JSON de Service Account (local/dev)
//   2. GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY — variables sueltas
//      (recomendado en Railway / Render donde no hay sistema de archivos estable)

interface ServiceAccountJson {
  client_email: string;
  private_key:  string;
}

function buildAuth() {
  const credFile = process.env["GOOGLE_CREDENTIALS_FILE"];

  if (credFile) {
    const resolved = path.resolve(process.cwd(), credFile);

    if (!fs.existsSync(resolved)) {
      throw Object.assign(
        new Error(`Archivo de credenciales no encontrado: ${resolved}`),
        { statusCode: 503 }
      );
    }

    const json = JSON.parse(fs.readFileSync(resolved, "utf-8")) as ServiceAccountJson;

    return new google.auth.JWT({
      email:  json.client_email,
      key:    json.private_key,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });
  }

  // Fallback: variables de entorno individuales
  const email = process.env["GOOGLE_SERVICE_ACCOUNT_EMAIL"];
  const key   = process.env["GOOGLE_PRIVATE_KEY"]?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw Object.assign(
      new Error(
        "Google Drive no configurado. " +
        "Definí GOOGLE_CREDENTIALS_FILE (ruta al JSON) " +
        "o GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY en .env"
      ),
      { statusCode: 503 }
    );
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface DriveUploadResult {
  fileId:      string;
  webViewLink: string;
}

/**
 * Sube un CSV a la carpeta de Drive configurada en GOOGLE_DRIVE_FOLDER_ID.
 *
 * - Incluye BOM UTF-8 para que Excel lo abra sin problemas de encoding.
 * - Después de subir, hace el archivo legible por cualquiera con el link
 *   (permiso "reader" + type "anyone").
 */
export async function uploadCsvToDrive(
  filename:   string,
  csvContent: string,
): Promise<DriveUploadResult> {
  const auth     = buildAuth();
  const drive    = google.drive({ version: "v3", auth });
  const folderId = process.env["GOOGLE_DRIVE_FOLDER_ID"];

  // BOM UTF-8 — necesario para que Excel lo abra correctamente
  const buffer = Buffer.from("\uFEFF" + csvContent, "utf-8");

  const file = await drive.files.create({
    requestBody: {
      name:     filename,
      mimeType: "text/csv",
      ...(folderId ? { parents: [folderId] } : {}),
    },
    media: {
      mimeType: "text/csv",
      body:     Readable.from([buffer]),
    },
    fields: "id,webViewLink",
  });

  const fileId = file.data.id;
  if (!fileId) throw new Error("Drive no devolvió un ID de archivo");

  // Compartir como "cualquiera con el link puede ver"
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return {
    fileId,
    webViewLink: file.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`,
  };
}
