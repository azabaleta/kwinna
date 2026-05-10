CREATE TYPE "public"."stock_balance_status" AS ENUM('in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "stock_balance_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"balance_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"size" text DEFAULT '' NOT NULL,
	"expected_quantity" integer,
	"counted_quantity" integer DEFAULT 0 NOT NULL,
	"unit_price" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "stock_balance_status" DEFAULT 'in_progress' NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"total_losses" numeric(12, 2),
	"total_discrepancies" integer,
	"accuracy_percentage" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "stock_balance_items" ADD CONSTRAINT "stock_balance_items_balance_id_stock_balances_id_fk" FOREIGN KEY ("balance_id") REFERENCES "public"."stock_balances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balance_items" ADD CONSTRAINT "stock_balance_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_balance_items_uniq" ON "stock_balance_items" USING btree ("balance_id","product_id","size");