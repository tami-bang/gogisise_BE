"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
prisma.user.findUnique({ where: { email: 'superuser@gogisise.com' } }).then(console.log).catch(console.error);
//# sourceMappingURL=scratch_db_check.js.map