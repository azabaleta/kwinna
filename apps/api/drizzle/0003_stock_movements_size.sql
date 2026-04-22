-- Agrega la columna size a stock_movements para habilitar el cálculo
-- de Sell-Through Rate por variante (productId + size).
ALTER TABLE "stock_movements" ADD COLUMN "size" text NOT NULL DEFAULT '';
