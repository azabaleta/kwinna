CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TABLE "promotional_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"transfer_discount_type" "discount_type",
	"transfer_discount_value" numeric(10, 2),
	"card_discount_type" "discount_type",
	"card_discount_value" numeric(10, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotional_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "promo_code_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "promo_discount" numeric(12, 2) DEFAULT '0' NOT NULL;