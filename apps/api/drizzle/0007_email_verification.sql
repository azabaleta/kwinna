-- ─── Email verification ──────────────────────────────────────────────────────
-- DEFAULT true → todos los usuarios existentes (admin/operador) quedan verificados.
-- Los nuevos clientes se insertan con false explícitamente desde el código.

ALTER TABLE "users"
  ADD COLUMN "email_verified" boolean NOT NULL DEFAULT true;

--> statement-breakpoint

CREATE TABLE "email_verification_tokens" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"    uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" varchar(64) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at"    timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "email_verification_tokens_token_hash_unique" UNIQUE("token_hash")
);
