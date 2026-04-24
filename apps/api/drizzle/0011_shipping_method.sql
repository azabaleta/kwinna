-- Método de envío: "delivery" (envío a domicilio) o "pickup" (retiro en local).
-- DEFAULT 'delivery' garantiza compatibilidad con ventas históricas.
ALTER TABLE "sales" ADD COLUMN "shipping_method" varchar(20) NOT NULL DEFAULT 'delivery';
