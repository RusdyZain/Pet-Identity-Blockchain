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
    'UPDATE "pets" SET "updated_at" = COALESCE("updated_at", "created_at", NOW()) WHERE "updated_at" IS NULL',
    'ALTER TABLE "pets" ALTER COLUMN "updated_at" SET DEFAULT NOW()',
  ];

  for (const query of queries) {
    await AppDataSource.query(query);
  }
};
