-- Clean legacy wallet duplicates before adding unique index
UPDATE "users"
SET "wallet_address" = BTRIM("wallet_address")
WHERE "wallet_address" IS NOT NULL;

UPDATE "users"
SET "wallet_address" = NULL
WHERE "wallet_address" IS NOT NULL
  AND "wallet_address" = '';

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
  AND rw.rn > 1;

-- Add wallet uniqueness for wallet-based auth
CREATE UNIQUE INDEX IF NOT EXISTS "users_wallet_address_key"
ON "users"("wallet_address")
WHERE "wallet_address" IS NOT NULL;

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
