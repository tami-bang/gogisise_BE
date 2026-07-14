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
exports.MarketService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
let MarketService = class MarketService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAllMarketItems() {
        const items = await this.prisma.marketItem.findMany({
            include: {
                prices: {
                    orderBy: {
                        marketDate: 'desc',
                    },
                    take: 1,
                },
            },
        });
        let latestDate = '1970-01-01';
        items.forEach((item) => {
            if (item.prices.length > 0) {
                const itemDate = item.prices[0].marketDate.toISOString().split('T')[0];
                if (itemDate > latestDate) {
                    latestDate = itemDate;
                }
            }
        });
        const mappedItems = items.map((item) => {
            const latestPrice = item.prices[0];
            return {
                itemId: item.itemId,
                priceId: latestPrice ? latestPrice.priceId : null,
                species: item.species,
                storageType: item.storageType,
                category: item.category,
                displayName: item.displayName,
                searchKeywords: item.searchKeywords || '',
                grade: item.grade,
                price: latestPrice?.price ?? null,
                previousPrice: latestPrice?.previousPrice ?? null,
                changeAmount: latestPrice?.changeAmount ?? null,
                trendStatus: latestPrice?.trendStatus ?? null,
                currency: item.currency,
                priceUnit: item.priceUnit,
            };
        });
        return {
            dataStatus: 'CURRENT',
            marketDate: latestDate === '1970-01-01'
                ? new Date().toISOString().split('T')[0]
                : latestDate,
            items: mappedItems,
        };
    }
    async getItemCalculations(itemId) {
        const item = await this.prisma.marketItem.findUnique({
            where: { itemId },
            include: {
                prices: {
                    orderBy: { marketDate: 'desc' },
                    take: 1,
                },
            },
        });
        if (!item) {
            throw new common_1.NotFoundException(`품목(ID: ${itemId})을 찾을 수 없습니다.`);
        }
        const latestPrice = item.prices[0];
        if (!latestPrice) {
            throw new common_1.NotFoundException('해당 품목의 가격 데이터가 존재하지 않습니다.');
        }
        const whereCondition = {
            species: item.species,
            storageType: item.storageType,
        };
        if (item.grade) {
            whereCondition.grade = item.grade;
        }
        if (item.species === 'BEEF') {
            whereCondition.ageInMonths = { lt: 40 };
        }
        const sourceRecords = await this.prisma.rawRecord.findMany({
            where: whereCondition,
            orderBy: { collectedAt: 'desc' },
            take: 10,
        });
        return {
            itemId: item.itemId,
            displayName: item.displayName,
            averagePrice: latestPrice.price,
            changeAmount: latestPrice.changeAmount,
            trendStatus: latestPrice.trendStatus,
            highestPrice: latestPrice.highestPrice,
            lowestPrice: latestPrice.lowestPrice,
            participantCount: latestPrice.participantCount,
            sourceRecords: sourceRecords.map((r) => ({
                sourceName: r.sourceName,
                rawProductName: r.rawProductName,
                price: r.price,
                ageInMonths: r.ageInMonths,
            })),
        };
    }
    async getItemPriceHistory(itemId) {
        const item = await this.prisma.marketItem.findUnique({
            where: { itemId },
        });
        if (!item) {
            throw new common_1.NotFoundException(`품목(ID: ${itemId})을 찾을 수 없습니다.`);
        }
        const history = await this.prisma.marketItemPrice.findMany({
            where: { itemId },
            orderBy: { marketDate: 'asc' },
        });
        return {
            item: {
                itemId: item.itemId,
                displayName: item.displayName,
            },
            points: history.map((h) => ({
                marketDate: h.marketDate.toISOString().split('T')[0],
                price: h.price,
            })),
        };
    }
};
exports.MarketService = MarketService;
exports.MarketService = MarketService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MarketService);
//# sourceMappingURL=market.service.js.map