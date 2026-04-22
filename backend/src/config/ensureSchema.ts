import { AppDataSource } from "./dataSource";

// Pastikan kolom baru tersedia tanpa menjalankan migrasi berat.
export const ensureSchema = async () => {
  const queries = [
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wallet_address" TEXT',
    'UPDATE "users" SET "wallet_address" = BTRIM("wallet_address") WHERE "wallet_address" IS NOT NULL',
    'UPDATE "users" SET "wallet_address" = NULL WHERE "wallet_address" IS NOT NULL AND "wallet_address" = \'\'',
    `
    WITH ranked_wallets AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER("wallet_address")
          ORDER BY id
        ) AS rn
      FROM "users"
      WHERE "wallet_address" IS NOT NULL
    )
    UPDATE "users" AS u
    SET "wallet_address" = NULL
    FROM ranked_wallets rw
    WHERE u.id = rw.id
      AND rw.rn > 1
    `,
    'CREATE UNIQUE INDEX IF NOT EXISTS "users_wallet_address_key" ON "users"("wallet_address") WHERE "wallet_address" IS NOT NULL',
    'ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "data_hash" TEXT',
    'ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "tx_hash" TEXT',
    'ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "block_number" INTEGER',
    'ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "block_timestamp" TIMESTAMP',
    'ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "on_chain_pet_id" INTEGER',
    'ALTER TABLE "medical_records" ADD COLUMN IF NOT EXISTS "on_chain_record_id" INTEGER',
    'ALTER TABLE "medical_records" ADD COLUMN IF NOT EXISTS "data_hash" TEXT',
    'ALTER TABLE "medical_records" ADD COLUMN IF NOT EXISTS "tx_hash" TEXT',
    'ALTER TABLE "medical_records" ADD COLUMN IF NOT EXISTS "block_number" INTEGER',
    'ALTER TABLE "medical_records" ADD COLUMN IF NOT EXISTS "block_timestamp" TIMESTAMP',
    'ALTER TABLE "correction_requests" ADD COLUMN IF NOT EXISTS "data_hash" TEXT',
    'ALTER TABLE "correction_requests" ADD COLUMN IF NOT EXISTS "tx_hash" TEXT',
    'ALTER TABLE "correction_requests" ADD COLUMN IF NOT EXISTS "block_number" INTEGER',
    'ALTER TABLE "correction_requests" ADD COLUMN IF NOT EXISTS "block_timestamp" TIMESTAMP',
    'ALTER TABLE "ownership_history" ADD COLUMN IF NOT EXISTS "on_chain_pet_id" INTEGER',
    'ALTER TABLE "ownership_history" ADD COLUMN IF NOT EXISTS "tx_hash" TEXT',
    'ALTER TABLE "ownership_history" ADD COLUMN IF NOT EXISTS "block_number" INTEGER',
    'ALTER TABLE "ownership_history" ADD COLUMN IF NOT EXISTS "block_timestamp" TIMESTAMP',
    'ALTER TABLE "ownership_history" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP',
    'UPDATE "ownership_history" SET "created_at" = COALESCE("created_at", "transferred_at", NOW()) WHERE "created_at" IS NULL',
    'ALTER TABLE "ownership_history" ALTER COLUMN "created_at" SET DEFAULT NOW()',
    'ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "event_type" TEXT',
    'ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "pet_id" INTEGER',
    'ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "source_id" TEXT',
    'ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "action_url" TEXT',
    'ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMP',
    "UPDATE \"notifications\" SET \"event_type\" = COALESCE(NULLIF(BTRIM(\"event_type\"), ''), 'GENERAL')",
    'ALTER TABLE "notifications" ALTER COLUMN "event_type" SET DEFAULT \'GENERAL\'',
    'ALTER TABLE "notifications" ALTER COLUMN "event_type" SET NOT NULL',
    'UPDATE "notifications" SET "read_at" = COALESCE("read_at", "created_at", NOW()) WHERE "is_read" = TRUE AND "read_at" IS NULL',
    `
    CREATE TABLE IF NOT EXISTS "wallet_challenges" (
      "wallet_address" TEXT PRIMARY KEY,
      "message" TEXT NOT NULL,
      "expires_at" TIMESTAMP NOT NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    )
    `,
    'CREATE INDEX IF NOT EXISTS "wallet_challenges_expires_at_idx" ON "wallet_challenges"("expires_at")',
    `
    CREATE TABLE IF NOT EXISTS "vaccine_reminder_logs" (
      "id" SERIAL PRIMARY KEY,
      "pet_id" INTEGER NOT NULL,
      "owner_id" INTEGER NOT NULL,
      "vaccine_type" TEXT NOT NULL DEFAULT '',
      "due_date" DATE NOT NULL,
      "sent_at" TIMESTAMP NOT NULL DEFAULT NOW()
    )
    `,
    'ALTER TABLE "vaccine_reminder_logs" ADD COLUMN IF NOT EXISTS "vaccine_type" TEXT',
    'UPDATE "vaccine_reminder_logs" SET "vaccine_type" = COALESCE(NULLIF(BTRIM("vaccine_type"), \'\'), \'unknown\') WHERE "vaccine_type" IS NULL OR BTRIM("vaccine_type") = \'\'',
    'ALTER TABLE "vaccine_reminder_logs" ALTER COLUMN "vaccine_type" SET DEFAULT \'unknown\'',
    'ALTER TABLE "vaccine_reminder_logs" ALTER COLUMN "vaccine_type" SET NOT NULL',
    'DROP INDEX IF EXISTS "vaccine_reminder_logs_pet_id_due_date_key"',
    'CREATE UNIQUE INDEX IF NOT EXISTS "vaccine_reminder_logs_pet_id_vaccine_type_due_date_key" ON "vaccine_reminder_logs"("pet_id", "vaccine_type", "due_date")',
    'UPDATE "pets" SET "updated_at" = COALESCE("updated_at", "created_at", NOW()) WHERE "updated_at" IS NULL',
    'ALTER TABLE "pets" ALTER COLUMN "updated_at" SET DEFAULT NOW()',
  ];

  for (const query of queries) {
    await AppDataSource.query(query);
  }
};
