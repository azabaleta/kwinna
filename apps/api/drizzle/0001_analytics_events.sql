CREATE TYPE "public"."analytics_event_type" AS ENUM('shop_view', 'cart_add', 'checkout_start', 'sale_complete');
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "analytics_event_type" NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
