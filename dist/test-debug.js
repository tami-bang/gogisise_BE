"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const prisma = new client_1.PrismaClient();
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
//# sourceMappingURL=test-debug.js.map