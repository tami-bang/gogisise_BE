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
            category: item.category,
        };
        if (item.grade) {
            whereCondition.qualityGrade = item.grade;
        }
        const rawRecords = await this.prisma.rawRecord.findMany({
            where: whereCondition,
            orderBy: { collectedAt: 'desc' },
            take: 10,
        });
        const strictFilteredRecords = rawRecords;
        const mappedSourceRecords = strictFilteredRecords.map((r) => {
            const rawName = r.rawProductName;
            const brand = r.brand ? `[${r.brand}]` : '';
            let refinedName = '';
            if (r.category && r.category !== '기타') {
                refinedName = brand ? `${brand} ${r.category}` : r.category;
                if (r.qualityGrade) {
                    refinedName += ` ${r.qualityGrade}`;
                }
                if (r.gender === '암소' || rawName.includes('(암)')) {
                    refinedName += ' (암)';
                }
            }
            else {
                refinedName = brand ? (rawName.startsWith(r.brand) ? rawName : `${brand} ${rawName}`) : rawName;
            }
            return {
                id: r.rawRecordId,
                sourceName: refinedName,
                rawProductName: rawName,
                price: r.pricePerKg,
                ageInMonths: r.ageMonths,
                collectedAt: r.collectedAt.toISOString(),
                includedInAverage: true,
            };
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
            sourceRecords: mappedSourceRecords,
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
    async processRawRecordsIntoMarketItems(targetDate) {
        const today = targetDate ? new Date(targetDate) : new Date();
        today.setHours(0, 0, 0, 0);
        const nextDay = new Date(today);
        nextDay.setDate(today.getDate() + 1);
        const rawRecords = await this.prisma.rawRecord.findMany({
            where: {
                collectedAt: {
                    gte: today,
                    lt: nextDay,
                },
            },
        });
        if (rawRecords.length === 0)
            return;
        const grouped = new Map();
        for (const record of rawRecords) {
            const category = record.category;
            const standardizedGrade = record.qualityGrade;
            let displayName = '';
            if (category !== '기타') {
                displayName = category;
                if (record.gender === '암소' || record.rawProductName.includes('(암)') || record.rawProductName.includes('암퇘지')) {
                    displayName += '(암)';
                }
                if (standardizedGrade) {
                    displayName += ` ${standardizedGrade}`;
                }
            }
            else {
                displayName = record.rawProductName;
            }
            const key = `${record.species}_${record.storageType}_${category}_${displayName}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push({ ...record, standardizedGrade, category, displayName });
        }
        const marketDate = today;
        for (const [key, records] of grouped.entries()) {
            const first = records[0];
            const prices = records.map(r => r.pricePerKg);
            const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
            const maxPrice = Math.max(...prices);
            const minPrice = Math.min(...prices);
            const keywords = new Set();
            keywords.add(first.category);
            if (first.displayName.includes('(암)')) {
                keywords.add(`${first.category}암`);
                keywords.add(`${first.category}(암)`);
                keywords.add(`${first.category}살암`);
                keywords.add('ㅅㄱㅇ');
            }
            if (first.standardizedGrade) {
                const g = first.standardizedGrade;
                keywords.add(`${first.category}${g}`);
                if (g === '1++') {
                    keywords.add(`1pp`);
                    keywords.add(`1PP`);
                    keywords.add(`${first.category}1pp`);
                }
            }
            const searchKeywords = Array.from(keywords).join(' ');
            let marketItem = await this.prisma.marketItem.findFirst({
                where: {
                    species: first.species,
                    storageType: first.storageType,
                    category: first.category,
                    displayName: first.displayName,
                    grade: first.standardizedGrade
                }
            });
            if (marketItem) {
                marketItem = await this.prisma.marketItem.update({
                    where: { itemId: marketItem.itemId },
                    data: { searchKeywords, displayName: first.displayName, grade: first.standardizedGrade }
                });
            }
            else {
                marketItem = await this.prisma.marketItem.create({
                    data: {
                        species: first.species,
                        storageType: first.storageType,
                        category: first.category,
                        displayName: first.displayName,
                        searchKeywords,
                        grade: first.standardizedGrade,
                    }
                });
            }
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const prevPrice = await this.prisma.marketItemPrice.findFirst({
                where: { itemId: marketItem.itemId, marketDate: yesterday },
            });
            let changeAmount = null;
            let trendStatus = null;
            if (prevPrice && prevPrice.price) {
                changeAmount = avgPrice - prevPrice.price;
                if (changeAmount > 0)
                    trendStatus = 'UP';
                else if (changeAmount < 0)
                    trendStatus = 'DOWN';
                else
                    trendStatus = 'UNCHANGED';
            }
            await this.prisma.marketItemPrice.upsert({
                where: {
                    itemId_marketDate: {
                        itemId: marketItem.itemId,
                        marketDate: marketDate,
                    }
                },
                update: {
                    price: avgPrice,
                    previousPrice: prevPrice ? prevPrice.price : null,
                    changeAmount,
                    trendStatus,
                    highestPrice: maxPrice,
                    lowestPrice: minPrice,
                    participantCount: records.length,
                },
                create: {
                    itemId: marketItem.itemId,
                    marketDate: marketDate,
                    price: avgPrice,
                    previousPrice: prevPrice ? prevPrice.price : null,
                    changeAmount,
                    trendStatus,
                    highestPrice: maxPrice,
                    lowestPrice: minPrice,
                    participantCount: records.length,
                }
            });
        }
    }
};
exports.MarketService = MarketService;
exports.MarketService = MarketService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MarketService);
//# sourceMappingURL=market.service.js.map