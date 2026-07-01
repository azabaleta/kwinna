CREATE TABLE "promo_strip" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"message" varchar(200) DEFAULT 'CELEBRAMOS NUESTRO LANZAMIENTO — HASTA 30% OFF EN TODA LA TIENDA' NOT NULL,
	"promo_code_id" uuid,
	"copy_text" varchar(100) DEFAULT 'SOYKWINNA' NOT NULL,
	"copy_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "promo_strip" ADD CONSTRAINT "promo_strip_promo_code_id_promotional_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promotional_codes"("id") ON DELETE set null ON UPDATE no action;