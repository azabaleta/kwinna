ALTER TABLE "sales" ADD COLUMN "is_dismissed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "dismiss_reason" text;