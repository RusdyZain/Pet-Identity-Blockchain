-- Ownership transfer metadata
ALTER TABLE "ownership_history"
  ADD COLUMN IF NOT EXISTS "on_chain_pet_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "tx_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "block_number" INTEGER,
  ADD COLUMN IF NOT EXISTS "block_timestamp" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3);

UPDATE "ownership_history"
SET "created_at" = COALESCE("created_at", "transferred_at", NOW())
WHERE "created_at" IS NULL;

ALTER TABLE "ownership_history"
  ALTER COLUMN "created_at" SET DEFAULT NOW();

-- Shared wallet challenge store for multi-instance auth
CREATE TABLE IF NOT EXISTS "wallet_challenges" (
  "wallet_address" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "wallet_challenges_pkey" PRIMARY KEY ("wallet_address")
);

CREATE INDEX IF NOT EXISTS "wallet_challenges_expires_at_idx"
  ON "wallet_challenges"("expires_at");

-- Reminder dedupe log
CREATE TABLE IF NOT EXISTS "vaccine_reminder_logs" (
  "id" SERIAL NOT NULL,
  "pet_id" INTEGER NOT NULL,
  "owner_id" INTEGER NOT NULL,
  "due_date" DATE NOT NULL,
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "vaccine_reminder_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vaccine_reminder_logs_pet_id_due_date_key"
  ON "vaccine_reminder_logs"("pet_id", "due_date");
