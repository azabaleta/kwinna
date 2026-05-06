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
CREATE UNIQUE INDEX "pos_customers_dni_uniq" ON "pos_customers" ("dni");
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "pos_customer_id" uuid;
--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_pos_customer_id_fk" FOREIGN KEY ("pos_customer_id") REFERENCES "pos_customers"("id") ON DELETE SET NULL;
