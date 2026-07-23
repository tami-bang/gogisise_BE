const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const preparedItems = [
    {
      goodsNo: "test_goods_9999",
      name: "테스트상품",
      brand: "테스트브랜드",
      detail_url: "http://test.com",
      price: 50000,
      itemSpecies: "BEEF",
      itemStorageType: "CHILLED",
      manufacturedAt: new Date(),
      expiresAt: null,
      searchKeywords: "테스트상품 테스트브랜드 국내산",
      metadata: {
        grade: "1+",
        age: 30,
        weight_kg: 1.5,
        sale_price: 45000
      }
    }
  ];

  const marketItemRows = preparedItems.map(
    (item) => Prisma.sql`(
      gen_random_uuid(), ${item.goodsNo}, ${item.name}, ${item.brand},
      ${item.detail_url}, 'ACTIVE', ${item.price}, ${item.itemSpecies},
      ${item.itemStorageType}, '국내산 한우 > 냉장 > 안심', ${item.metadata.grade || null},
      ${item.metadata.age}, ${item.metadata.weight_kg},
      ${item.metadata.sale_price ?? null}, ${item.manufacturedAt},
      ${item.expiresAt}, ${item.searchKeywords}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )`
  );

  console.log("INSERT 시도...");
  const upsertedItems = await prisma.$queryRaw`
    INSERT INTO "Market_Items" (
      "itemId", "goodsNo", "name", "brand", "detailUrl", "status",
      "price", "species", "storageType", "category", "grade", "ageMonths",
      "weightKg", "salePrice", "manufacturedAt", "expiresAt",
      "searchKeywords", "createdAt", "updatedAt"
    ) VALUES ${Prisma.join(marketItemRows)}
    ON CONFLICT ("goodsNo") DO UPDATE SET
      "name" = EXCLUDED."name",
      "brand" = EXCLUDED."brand",
      "detailUrl" = EXCLUDED."detailUrl",
      "status" = EXCLUDED."status",
      "price" = EXCLUDED."price",
      "species" = EXCLUDED."species",
      "storageType" = EXCLUDED."storageType",
      "category" = EXCLUDED."category",
      "grade" = EXCLUDED."grade",
      "ageMonths" = EXCLUDED."ageMonths",
      "weightKg" = EXCLUDED."weightKg",
      "salePrice" = EXCLUDED."salePrice",
      "manufacturedAt" = EXCLUDED."manufacturedAt",
      "expiresAt" = EXCLUDED."expiresAt",
      "searchKeywords" = EXCLUDED."searchKeywords",
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "itemId", "goodsNo"
  `;

  console.log("Upserted:", upsertedItems);

  const itemIdByGoodsNo = new Map(
    upsertedItems.map((item) => [item.goodsNo, item.itemId]),
  );
  const priceRows = preparedItems.map(
    (item) => Prisma.sql`(
      gen_random_uuid(), ${itemIdByGoodsNo.get(item.goodsNo)}, ${today},
      ${item.price}, null,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )`,
  );

  console.log("Item Prices INSERT 시도...");
  await prisma.$executeRaw`
    INSERT INTO "Market_Item_Prices" (
      "priceId", "itemId", "marketDate", "price", "previousPrice",
      "createdAt", "updatedAt"
    ) VALUES ${Prisma.join(priceRows)}
    ON CONFLICT ("itemId", "marketDate") DO UPDATE SET
      "price" = EXCLUDED."price",
      "updatedAt" = CURRENT_TIMESTAMP
  `;
  console.log("Prices Upsert 성공!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
