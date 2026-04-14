import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env["DATABASE_URL"];

if (!url) {
  throw new Error("[drizzle-kit] DATABASE_URL is not set. Add it to your .env file.");
}

export default defineConfig({
  schema:      "./src/db/schema.ts",
  out:         "./drizzle",
  dialect:     "postgresql",
  dbCredentials: { url },
});
