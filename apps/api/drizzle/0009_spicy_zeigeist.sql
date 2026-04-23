-- Agrega código postal al envío.
-- DEFAULT '' garantiza compatibilidad con filas históricas sin romper el NOT NULL.
ALTER TABLE "sales" ADD COLUMN "shipping_zip_code" varchar(20) NOT NULL DEFAULT '';
