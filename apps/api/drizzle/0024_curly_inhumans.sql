CREATE TABLE "shipping_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city" text NOT NULL,
	"display_name" text NOT NULL,
	"cost" numeric(12, 2) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_zones_city_unique" UNIQUE("city")
);

-- Seed: zonas iniciales (equivalente al hardcode anterior)
INSERT INTO "shipping_zones" ("city", "display_name", "cost") VALUES
  ('neuquen',    'Neuquén',    3500),
  ('plottier',   'Plottier',   3500),
  ('cipolletti', 'Cipolletti', 3500),
  ('centenario', 'Centenario', 3500)
ON CONFLICT ("city") DO NOTHING;
