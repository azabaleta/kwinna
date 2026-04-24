ALTER TYPE "public"."product_season" ADD VALUE 'deportivo';--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD COLUMN "short_code" varchar(6);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "shipping_method" varchar(20) DEFAULT 'delivery' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_short_code_unique" UNIQUE("short_code");