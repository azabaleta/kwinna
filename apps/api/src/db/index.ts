import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const url = process.env["DATABASE_URL"];

if (!url) {
  throw new Error("[DB] DATABASE_URL is not set. Add it to your .env file.");
}

// En producción Railway/Render requieren SSL. En local (localhost / .internal)
// se desactiva para no exigir certificado en dev.
const isLocal =
  url.includes("localhost") ||
  url.includes("127.0.0.1") ||
  url.includes(".internal");

const client = postgres(url, {
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export const db = drizzle(client, { schema });
