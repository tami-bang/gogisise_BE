-- Phase 3 (contract): 활성 상품만 정규화 필드를 강제하고 레거시 비활성 상품은 보존한다.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Market_Items"
    WHERE "status" NOT IN ('ACTIVE', 'INACTIVE')
       OR (
         "status" = 'ACTIVE'
         AND (
           "species" IS NULL
           OR "species" NOT IN ('BEEF', 'PORK')
           OR "storageType" IS NULL
           OR "storageType" NOT IN ('CHILLED', 'FROZEN')
           OR "weightKg" IS NULL
           OR "weightKg" <= 0
           OR "price" <= 0
           OR "salePrice" IS NULL
           OR "salePrice" <= 0
           OR ("species" = 'BEEF' AND "ageMonths" IS NOT NULL AND "ageMonths" NOT BETWEEN 1 AND 40)
           OR ("species" = 'PORK' AND "ageMonths" IS NOT NULL)
           OR ("grade" IS NOT NULL AND "grade" NOT IN ('1++', '1+', '1'))
           OR ("expiresAt" IS NOT NULL AND "manufacturedAt" IS NOT NULL AND "expiresAt" <= "manufacturedAt")
         )
       )
  ) THEN
    RAISE EXCEPTION 'Market_Items active rows violate normalized constraints';
  END IF;
END $$;

-- 레거시 INACTIVE 행의 NULL 보존을 위해 물리 NOT NULL 대신 조건부 CHECK를 사용한다.
ALTER TABLE "Market_Items"
  ALTER COLUMN "species" DROP NOT NULL,
  ALTER COLUMN "storageType" DROP NOT NULL,
  ALTER COLUMN "weightKg" DROP NOT NULL,
  ALTER COLUMN "salePrice" DROP NOT NULL;

ALTER TABLE "Market_Items"
  DROP CONSTRAINT IF EXISTS "ck_market_items_status",
  DROP CONSTRAINT IF EXISTS "ck_market_items_species_age",
  DROP CONSTRAINT IF EXISTS "ck_market_items_storage_type",
  DROP CONSTRAINT IF EXISTS "ck_market_items_grade",
  DROP CONSTRAINT IF EXISTS "ck_market_items_weight_positive",
  DROP CONSTRAINT IF EXISTS "ck_market_items_price_positive",
  DROP CONSTRAINT IF EXISTS "ck_market_items_sale_price_positive",
  DROP CONSTRAINT IF EXISTS "ck_market_items_expiry_after_manufacture";

ALTER TABLE "Market_Items"
  ADD CONSTRAINT "ck_market_items_status" CHECK (
    "status" IN ('ACTIVE', 'INACTIVE')
  ),
  ADD CONSTRAINT "ck_market_items_species_age" CHECK (
    "status" = 'INACTIVE'
    OR ("species" = 'BEEF' AND ("ageMonths" IS NULL OR "ageMonths" BETWEEN 1 AND 40))
    OR ("species" = 'PORK' AND "ageMonths" IS NULL)
  ),
  ADD CONSTRAINT "ck_market_items_storage_type" CHECK (
    "status" = 'INACTIVE'
    OR "storageType" IN ('CHILLED', 'FROZEN')
  ),
  ADD CONSTRAINT "ck_market_items_grade" CHECK (
    "status" = 'INACTIVE'
    OR "grade" IS NULL
    OR "grade" IN ('1++', '1+', '1')
  ),
  ADD CONSTRAINT "ck_market_items_weight_positive" CHECK (
    "status" = 'INACTIVE'
    OR ("weightKg" IS NOT NULL AND "weightKg" > 0)
  ),
  ADD CONSTRAINT "ck_market_items_price_positive" CHECK (
    "status" = 'INACTIVE'
    OR "price" > 0
  ),
  ADD CONSTRAINT "ck_market_items_sale_price_positive" CHECK (
    "status" = 'INACTIVE'
    OR ("salePrice" IS NOT NULL AND "salePrice" > 0)
  ),
  ADD CONSTRAINT "ck_market_items_expiry_after_manufacture" CHECK (
    "status" = 'INACTIVE'
    OR "expiresAt" IS NULL
    OR "manufacturedAt" IS NULL
    OR "expiresAt" > "manufacturedAt"
  );
