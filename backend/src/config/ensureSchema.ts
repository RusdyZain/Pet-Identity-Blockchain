import { AppDataSource } from "./dataSource";
import { getBackendWalletAddress } from "../blockchain/petIdentityClient";

// Pastikan kolom baru tersedia tanpa menjalankan migrasi berat.
export const ensureSchema = async () => {
  const queries = [
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wallet_address" TEXT',
    'ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "data_hash" TEXT',
    'ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "tx_hash" TEXT',
    'ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "on_chain_pet_id" INTEGER',
    'ALTER TABLE "medical_records" ADD COLUMN IF NOT EXISTS "on_chain_record_id" INTEGER',
    'ALTER TABLE "medical_records" ADD COLUMN IF NOT EXISTS "data_hash" TEXT',
    'ALTER TABLE "medical_records" ADD COLUMN IF NOT EXISTS "tx_hash" TEXT',
    'ALTER TABLE "correction_requests" ADD COLUMN IF NOT EXISTS "data_hash" TEXT',
    'ALTER TABLE "correction_requests" ADD COLUMN IF NOT EXISTS "tx_hash" TEXT',
    'UPDATE "pets" SET "updated_at" = COALESCE("updated_at", "created_at", NOW()) WHERE "updated_at" IS NULL',
    'ALTER TABLE "pets" ALTER COLUMN "updated_at" SET DEFAULT NOW()',
  ];

  for (const query of queries) {
    await AppDataSource.query(query);
  }

  const walletAddress = getBackendWalletAddress();
  await AppDataSource.query(
    'UPDATE "users" SET "wallet_address" = $1 WHERE "wallet_address" IS NULL',
    [walletAddress]
  );
};
