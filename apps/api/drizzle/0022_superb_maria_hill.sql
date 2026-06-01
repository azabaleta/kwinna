CREATE TABLE "planificacion_comentarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"semana" integer NOT NULL,
	"pieza_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"user_name" text NOT NULL,
	"texto" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planificacion_estados" (
	"semana" integer NOT NULL,
	"pieza_id" text NOT NULL,
	"realizada" boolean DEFAULT false NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_por_id" uuid,
	"actualizado_por_nombre" text,
	CONSTRAINT "planificacion_estados_semana_pieza_id_pk" PRIMARY KEY("semana","pieza_id")
);
