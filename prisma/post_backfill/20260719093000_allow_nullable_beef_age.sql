-- 판매 가능한 한우 부산물은 원천에서 월령을 제공하지 않을 수 있다.
-- 월령이 존재하면 1~40개월을 강제하고, NULL이면 상품번호·중량·가격 등
-- 나머지 ACTIVE 제약조건으로 판매 가능성을 검증한다.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Market_Items"
    WHERE "status" = 'ACTIVE'
      AND "species" = 'BEEF'
      AND "ageMonths" IS NOT NULL
      AND "ageMonths" NOT BETWEEN 1 AND 40
  ) THEN
    RAISE EXCEPTION 'ACTIVE BEEF rows contain an out-of-range ageMonths value';
  END IF;
END $$;

ALTER TABLE "Market_Items"
  DROP CONSTRAINT IF EXISTS "ck_market_items_species_age";

ALTER TABLE "Market_Items"
  ADD CONSTRAINT "ck_market_items_species_age" CHECK (
    "status" = 'INACTIVE'
    OR (
      "species" = 'BEEF'
      AND ("ageMonths" IS NULL OR "ageMonths" BETWEEN 1 AND 40)
    )
    OR ("species" = 'PORK' AND "ageMonths" IS NULL)
  );
