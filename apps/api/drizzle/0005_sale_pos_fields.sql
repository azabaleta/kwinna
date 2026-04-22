-- Nuevo valor en el enum de estado de venta
ALTER TYPE "sale_status" ADD VALUE 'assembled';

-- Canal de origen de la venta
CREATE TYPE "sale_channel" AS ENUM('web', 'pos');
ALTER TABLE "sales" ADD COLUMN "channel" "sale_channel" NOT NULL DEFAULT 'web';

-- Metadata exclusiva del POS
ALTER TABLE "sales" ADD COLUMN "payment_method" varchar(50);
ALTER TABLE "sales" ADD COLUMN "sale_notes" text;
ALTER TABLE "sales" ADD COLUMN "customer_dni" varchar(20);
