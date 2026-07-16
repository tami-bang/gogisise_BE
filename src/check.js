const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();
async function main() {
  const records = await prisma.rawRecord.findMany({ take: 30 });
  const lines = records.map(r => r.rawProductName).join('\n');
  fs.writeFileSync('raw.txt', lines, 'utf8');
}
main().catch(console.error).finally(() => prisma.$disconnect());
