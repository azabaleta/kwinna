CREATE TABLE "planificacion_semanas" (
	"id" serial PRIMARY KEY NOT NULL,
	"semana" integer NOT NULL,
	"semana_str" varchar(4) NOT NULL,
	"periodo" text,
	"json_data" jsonb NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planificacion_semanas_semana_unique" UNIQUE("semana")
);
--> statement-breakpoint
CREATE INDEX "idx_planificacion_semana" ON "planificacion_semanas" USING btree ("semana");