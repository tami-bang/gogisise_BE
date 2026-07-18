-- Phase 1 (expand): 운영 중단 없이 정식 컬럼과 감사 컬럼을 먼저 추가한다.
ALTER TABLE "Market_Items"
  ADD COLUMN IF NOT EXISTS "ageMonths" INTEGER,
  ADD COLUMN IF NOT EXISTS "weightKg" DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS "salePrice" INTEGER,
  ADD COLUMN IF NOT EXISTS "manufacturedAt" DATE,
  ADD COLUMN IF NOT EXISTS "expiresAt" DATE;

CREATE OR REPLACE FUNCTION pg_temp.try_jsonb(input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN input::JSONB;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- 과거 임시 JSON이 존재하는 환경만 일회성으로 정식 컬럼에 이관한다.
UPDATE "Market_Items"
SET
  "ageMonths" = COALESCE(
    "ageMonths",
    CASE WHEN pg_temp.try_jsonb("searchKeywords") IS NOT NULL
      THEN ("searchKeywords"::jsonb ->> 'age')::INTEGER END
  ),
  "weightKg" = COALESCE(
    "weightKg",
    CASE WHEN pg_temp.try_jsonb("searchKeywords") IS NOT NULL
      THEN ("searchKeywords"::jsonb ->> 'weight_kg')::DECIMAL(10,3) END
  ),
  "salePrice" = COALESCE(
    "salePrice",
    CASE WHEN pg_temp.try_jsonb("searchKeywords") IS NOT NULL
      THEN ("searchKeywords"::jsonb ->> 'sale_price')::INTEGER END
  ),
  "manufacturedAt" = COALESCE(
    "manufacturedAt",
    CASE WHEN pg_temp.try_jsonb("searchKeywords") IS NOT NULL
      THEN NULLIF("searchKeywords"::jsonb ->> 'mfg_date', '')::DATE END
  ),
  "expiresAt" = COALESCE(
    "expiresAt",
    CASE WHEN pg_temp.try_jsonb("searchKeywords") IS NOT NULL
      THEN NULLIF("searchKeywords"::jsonb ->> 'expiry_date', '')::DATE END
  ),
  "grade" = COALESCE(
    "grade",
    CASE WHEN pg_temp.try_jsonb("searchKeywords") IS NOT NULL
      THEN NULLIF("searchKeywords"::jsonb ->> 'grade', '') END
  );

-- JSON 임시 저장을 폐기하고 검색 전용 문자열로 복구한다.
UPDATE "Market_Items"
SET "searchKeywords" = CONCAT_WS(' ', "name", "brand", "category");

CREATE INDEX IF NOT EXISTS "idx_market_items_species" ON "Market_Items" ("species");
CREATE INDEX IF NOT EXISTS "idx_market_items_storage_type" ON "Market_Items" ("storageType");
CREATE INDEX IF NOT EXISTS "idx_market_items_grade" ON "Market_Items" ("grade");

ALTER TABLE "User_Social_Accounts" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User_Tokens" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Favorites" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Market_Item_Prices" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "Users_phone_key" ON "Users" ("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "uk_favorites_user_item" ON "Favorites" ("userId", "itemId");
CREATE UNIQUE INDEX IF NOT EXISTS "uk_market_item_prices_date" ON "Market_Item_Prices" ("itemId", "marketDate");
CREATE INDEX IF NOT EXISTS "idx_user_tokens_expires_at" ON "User_Tokens" ("expiresAt");
