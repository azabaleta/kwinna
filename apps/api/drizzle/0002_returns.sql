CREATE TYPE "public"."return_reason" AS ENUM('quality', 'detail', 'color', 'size', 'not_as_expected');
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid REFERENCES "public"."sales"("id"),
	"product_id" uuid NOT NULL REFERENCES "public"."products"("id"),
	"size" text NOT NULL DEFAULT '',
	"quantity" integer NOT NULL DEFAULT 1,
	"reason" "return_reason" NOT NULL,
	"notes" text,
	"restocked" integer NOT NULL DEFAULT 0,
	"unit_price" numeric(12,2) NOT NULL DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
