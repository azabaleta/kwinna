import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const url = process.env["DATABASE_URL"];

if (!url) {
  throw new Error("[DB] DATABASE_URL is not set. Add it to your .env file.");
}

const client = postgres(url);

export const db = drizzle(client, { schema });
