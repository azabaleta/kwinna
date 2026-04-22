/**
 * Crea o actualiza el usuario administrador desde variables de entorno.
 *
 * Variables requeridas:
 *   ADMIN_EMAIL          — email de acceso (ej: jjulieta.c981@gmail.com)
 *   ADMIN_NAME           — nombre visible en el sistema (ej: Juli)
 *   ADMIN_PASSWORD_HASH  — hash bcrypt de la contraseña (ver instrucciones abajo)
 *
 * Cómo generar ADMIN_PASSWORD_HASH:
 *   node -e "require('bcryptjs').hash('TuContraseña', 12).then(console.log)"
 *
 * Ejecutar con:
 *   pnpm --filter @kwinna/api db:seed-admin
 */

import "dotenv/config";
import { upsertAdminUser } from "./repositories/user.repository";

async function main() {
  const email = process.env["ADMIN_EMAIL"];
  const name  = process.env["ADMIN_NAME"];
  const hash  = process.env["ADMIN_PASSWORD_HASH"];

  if (!email || !name || !hash) {
    process.stderr.write(
      "[seed-admin] Error: faltan variables de entorno.\n" +
      "  Requeridas: ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD_HASH\n" +
      "  Generá el hash con:\n" +
      "  node -e \"require('bcryptjs').hash('TuContraseña', 12).then(console.log)\"\n"
    );
    process.exit(1);
  }

  if (!hash.startsWith("$2")) {
    process.stderr.write(
      "[seed-admin] Error: ADMIN_PASSWORD_HASH no parece un hash bcrypt válido.\n" +
      "  Debe comenzar con $2a$ o $2b$. Generalo con el comando indicado arriba.\n"
    );
    process.exit(1);
  }

  await upsertAdminUser(email, name, hash);

  process.stdout.write(
    `[seed-admin] ✓ Admin "${name}" (${email}) listo en la base de datos.\n`
  );
  process.exit(0);
}

main().catch((err: unknown) => {
  process.stderr.write(`[seed-admin] Error inesperado: ${String(err)}\n`);
  process.exit(1);
});
