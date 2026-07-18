-- Phase 3 (contract): 전체 재수집/백필 완료 후 한 번 실행한다.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Market_Items"
    WHERE "species" IS NULL
       OR "storageType" IS NULL
       OR "weightKg" IS NULL
       OR "weightKg" <= 0
       OR "price" <= 0
       OR ("salePrice" IS NOT NULL AND "salePrice" <= 0)
       OR "species" NOT IN ('BEEF', 'PORK')
       OR "storageType" NOT IN ('CHILLED', 'FROZEN')
       OR ("species" = 'BEEF' AND ("ageMonths" IS NULL OR "ageMonths" NOT BETWEEN 1 AND 40))
       OR ("species" = 'PORK' AND "ageMonths" IS NOT NULL)
       OR ("expiresAt" IS NOT NULL AND "manufacturedAt" IS NOT NULL AND "expiresAt" <= "manufacturedAt")
  ) THEN
    RAISE EXCEPTION 'Market_Items backfill incomplete: normalized constraints cannot be enabled';
  END IF;
END $$;

ALTER TABLE "Market_Items"
  ALTER COLUMN "species" SET NOT NULL,
  ALTER COLUMN "storageType" SET NOT NULL,
  ALTER COLUMN "weightKg" SET NOT NULL;

ALTER TABLE "Market_Items"
  DROP CONSTRAINT IF EXISTS "ck_market_items_species_age",
  DROP CONSTRAINT IF EXISTS "ck_market_items_storage_type",
  DROP CONSTRAINT IF EXISTS "ck_market_items_weight_positive",
  DROP CONSTRAINT IF EXISTS "ck_market_items_price_positive",
  DROP CONSTRAINT IF EXISTS "ck_market_items_sale_price_positive",
  DROP CONSTRAINT IF EXISTS "ck_market_items_expiry_after_manufacture";

ALTER TABLE "Market_Items"
  ADD CONSTRAINT "ck_market_items_species_age" CHECK (
    ("species" = 'BEEF' AND "ageMonths" BETWEEN 1 AND 40)
    OR ("species" = 'PORK' AND "ageMonths" IS NULL)
  ),
  ADD CONSTRAINT "ck_market_items_storage_type" CHECK (
    "storageType" IN ('CHILLED', 'FROZEN')
  ),
  ADD CONSTRAINT "ck_market_items_weight_positive" CHECK ("weightKg" > 0),
  ADD CONSTRAINT "ck_market_items_price_positive" CHECK ("price" > 0),
  ADD CONSTRAINT "ck_market_items_sale_price_positive" CHECK (
    "salePrice" IS NULL OR "salePrice" > 0
  ),
  ADD CONSTRAINT "ck_market_items_expiry_after_manufacture" CHECK (
    "expiresAt" IS NULL
    OR "manufacturedAt" IS NULL
    OR "expiresAt" > "manufacturedAt"
  );
