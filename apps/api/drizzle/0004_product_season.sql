CREATE TYPE "product_season" AS ENUM('invierno', 'verano', 'media_estacion');
ALTER TABLE "products" ADD COLUMN "season" "product_season";
