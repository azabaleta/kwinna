-- Código corto de 6 dígitos como alternativa al link de verificación.
-- Nullable para compatibilidad con tokens existentes (filas anteriores quedan con NULL).
-- UNIQUE: en PostgreSQL, múltiples NULL no violan el constraint — solo se exige
-- unicidad entre valores no-nulos, que es exactamente lo que necesitamos.
ALTER TABLE "email_verification_tokens" ADD COLUMN "short_code" varchar(6);
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_short_code_unique" UNIQUE("short_code");
