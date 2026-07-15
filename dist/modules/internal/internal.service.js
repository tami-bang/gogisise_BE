"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
let InternalService = class InternalService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createRawRecordsBulk(dto) {
        try {
            const result = await this.prisma.rawRecord.createMany({
                data: dto.records.map((record) => ({
                    sourceName: record.sourceName,
                    collectedAt: new Date(record.collectedAt),
                    rawProductName: record.rawProductName,
                    price: record.price,
                    species: record.species,
                    storageType: record.storageType,
                    grade: record.grade ?? null,
                    ageInMonths: record.ageInMonths ?? null,
                })),
                skipDuplicates: true,
            });
            return {
                totalReceived: dto.records.length,
                insertedCount: result.count,
                failedCount: dto.records.length - result.count,
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException('벌크 적재 중 오류가 발생했습니다.');
        }
    }
};
exports.InternalService = InternalService;
exports.InternalService = InternalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InternalService);
//# sourceMappingURL=internal.service.js.map