-- Buat tabelnya dulu jika belum ada
CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL PRIMARY KEY,
    "username" TEXT,
    "wallet_address" TEXT
);

-- Baru jalankan Unique Index
CREATE UNIQUE INDEX IF NOT EXISTS "users_wallet_address_key"
ON "users"("wallet_address")
WHERE "wallet_address" IS NOT NULL;

-- 4. LANJUTKAN DENGAN ALTER TABLE PETS DLL (Sudah benar)

-- Persist on-chain block metadata for audit trails
ALTER TABLE "pets"
  ADD COLUMN IF NOT EXISTS "block_number" INTEGER,
  ADD COLUMN IF NOT EXISTS "block_timestamp" TIMESTAMP(3);

ALTER TABLE "medical_records"
  ADD COLUMN IF NOT EXISTS "block_number" INTEGER,
  ADD COLUMN IF NOT EXISTS "block_timestamp" TIMESTAMP(3);

ALTER TABLE "correction_requests"
  ADD COLUMN IF NOT EXISTS "block_number" INTEGER,
  ADD COLUMN IF NOT EXISTS "block_timestamp" TIMESTAMP(3);
