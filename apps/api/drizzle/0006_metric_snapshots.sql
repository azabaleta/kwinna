CREATE TYPE "snapshot_period" AS ENUM('monthly', 'semestral');

CREATE TABLE "metric_snapshots" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "period"     "snapshot_period" NOT NULL,
  "label"      varchar(100) NOT NULL,
  "date_from"  timestamp with time zone NOT NULL,
  "date_to"    timestamp with time zone NOT NULL,
  "data"       jsonb NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
