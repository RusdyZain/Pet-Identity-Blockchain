ALTER TABLE "vaccine_reminder_logs"
  ADD COLUMN IF NOT EXISTS "vaccine_type" TEXT;

UPDATE "vaccine_reminder_logs"
SET "vaccine_type" = COALESCE(NULLIF(BTRIM("vaccine_type"), ''), 'unknown')
WHERE "vaccine_type" IS NULL
   OR BTRIM("vaccine_type") = '';

ALTER TABLE "vaccine_reminder_logs"
  ALTER COLUMN "vaccine_type" SET DEFAULT 'unknown';

ALTER TABLE "vaccine_reminder_logs"
  ALTER COLUMN "vaccine_type" SET NOT NULL;

DROP INDEX IF EXISTS "vaccine_reminder_logs_pet_id_due_date_key";

CREATE UNIQUE INDEX IF NOT EXISTS "vaccine_reminder_logs_pet_id_vaccine_type_due_date_key"
  ON "vaccine_reminder_logs"("pet_id", "vaccine_type", "due_date");
