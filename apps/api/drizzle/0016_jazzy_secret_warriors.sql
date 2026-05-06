CREATE TYPE "public"."credit_note_status" AS ENUM('active', 'redeemed', 'void');--> statement-breakpoint
CREATE TABLE "credit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" "credit_note_status" DEFAULT 'active' NOT NULL,
	"customer_name" varchar(255),
	"customer_dni" varchar(20),
	"pos_customer_id" uuid,
	"user_id" uuid,
	"reason" "return_reason",
	"return_id" uuid,
	"origin_credit_note_id" uuid,
	"redeemed_sale_id" uuid,
	"redeemed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_notes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "pos_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"dni" varchar(20) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"email" varchar(255),
	"address" text,
	"city" varchar(100),
	"province" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "pos_customer_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_notes_return_id_uniq" ON "credit_notes" USING btree ("return_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pos_customers_dni_uniq" ON "pos_customers" USING btree ("dni");