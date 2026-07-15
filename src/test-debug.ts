import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const items = await prisma.marketItem.findMany({
    where: { displayName: { contains: '꾸리살' } }
  });
  console.log("MarketItems:", items);

  const raw = await prisma.rawRecord.findMany({
    where: { rawProductName: { contains: '꾸리살' } },
    take: 5
  });
  console.log("RawRecords:", raw);
  await prisma.$disconnect();
}
main();
