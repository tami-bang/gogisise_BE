const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.marketItem.findMany({
    take: 5,
    orderBy: { updatedAt: 'desc' }
  });
  console.log("최근 5개 Market_Items:");
  console.log(JSON.stringify(items, null, 2));
  
  const count = await prisma.marketItem.count();
  console.log(`전체 MarketItem 개수: ${count}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
