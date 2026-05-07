CREATE TABLE "glossary_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "glossary_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" varchar(2) NOT NULL,
	"name" varchar(255) NOT NULL,
	CONSTRAINT "glossary_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "glossary_item_types" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "glossary_item_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category_id" integer NOT NULL,
	"code" varchar(2) NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "glossary_qualities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "glossary_qualities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"item_type_id" integer NOT NULL,
	"code" varchar(1) NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "glossary_variants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "glossary_variants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"quality_id" integer NOT NULL,
	"code" varchar(2) NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "glossary_item_types" ADD CONSTRAINT "glossary_item_types_category_id_glossary_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."glossary_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_qualities" ADD CONSTRAINT "glossary_qualities_item_type_id_glossary_item_types_id_fk" FOREIGN KEY ("item_type_id") REFERENCES "public"."glossary_item_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_variants" ADD CONSTRAINT "glossary_variants_quality_id_glossary_qualities_id_fk" FOREIGN KEY ("quality_id") REFERENCES "public"."glossary_qualities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "glossary_item_types_category_code_uniq" ON "glossary_item_types" USING btree ("category_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "glossary_qualities_item_type_code_uniq" ON "glossary_qualities" USING btree ("item_type_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "glossary_variants_quality_code_uniq" ON "glossary_variants" USING btree ("quality_id","code");