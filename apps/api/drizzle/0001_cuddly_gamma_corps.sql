ALTER TABLE "sales" ADD COLUMN "customer_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "customer_email" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "customer_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "shipping_address" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "shipping_city" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "shipping_province" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "shipping_cost" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "user_id" uuid;