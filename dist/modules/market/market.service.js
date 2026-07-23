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
var MarketService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
let MarketService = MarketService_1 = class MarketService {
    prisma;
    logger = new common_1.Logger(MarketService_1.name);
    categoryCalculationsCache = new Map();
    itemCalculationsCache = new Map();
    CALCULATIONS_CACHE_TTL = 30 * 1000;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAllMarketItems() {
        const items = await this.prisma.marketItem.findMany({
            where: { status: 'ACTIVE' },
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
        const mappedItems = items
            .map((item) => {
            const latestPrice = item.prices[0];
            const isPork = item.category?.includes('돈육');
            const isBeef = item.category?.includes('한우') || item.category?.includes('소고기');
            const parsedSpecies = isPork ? 'PORK' : isBeef ? 'BEEF' : item.species;
            const isChilled = item.category?.includes('냉장');
            const isFrozen = item.category?.includes('냉동');
            const parsedStorageType = isChilled
                ? 'CHILLED'
                : isFrozen
                    ? 'FROZEN'
                    : item.storageType;
            const categoryParts = item.category
                ?.split(/\s*>\s*|\s*,\s*/)
                .filter(Boolean);
            const parsedCategory = categoryParts && categoryParts.length > 0
                ? categoryParts[categoryParts.length - 1]
                : item.category;
            const parsedDisplayName = item.displayName ||
                item.name ||
                (categoryParts && categoryParts.length > 0
                    ? categoryParts[categoryParts.length - 1]
                    : '');
            return {
                itemId: item.itemId,
                name: item.name,
                priceId: latestPrice ? latestPrice.priceId : null,
                species: item.species || parsedSpecies,
                storageType: item.storageType || parsedStorageType,
                category: parsedCategory,
                displayName: item.displayName || parsedDisplayName,
                searchKeywords: item.searchKeywords || '',
                grade: item.grade,
                ageMonths: item.ageMonths,
                weightKg: item.weightKg === null ? null : Number(item.weightKg),
                salePrice: item.salePrice,
                manufacturedAt: item.manufacturedAt,
                expiresAt: item.expiresAt,
                price: item.price || (latestPrice?.price ?? null),
                previousPrice: latestPrice?.previousPrice ?? null,
                changeAmount: latestPrice?.changeAmount ?? null,
                trendStatus: latestPrice?.trendStatus ?? null,
                currency: item.currency,
                priceUnit: item.priceUnit,
            };
        })
            .map(({ name, ...rest }) => rest);
        return {
            dataStatus: 'CURRENT',
            marketDate: latestDate === '1970-01-01'
                ? new Date().toISOString().split('T')[0]
                : latestDate,
            items: mappedItems,
        };
    }
    async getCategories(options) {
        const where = {};
        if (options.parentNo !== undefined) {
            where.parentNo = options.parentNo;
        }
        if (options.depth !== undefined) {
            where.depth = options.depth;
        }
        return await this.prisma.categoryTree.findMany({
            where,
            orderBy: { ctgNo: 'asc' },
        });
    }
    async getCategoryCalculations(categoryPath) {
        const timeLabel = `[CategoryCalculations] ${categoryPath}`;
        console.time(timeLabel);
        const cached = this.categoryCalculationsCache.get(categoryPath);
        if (cached && Date.now() - cached.fetchedAt < this.CALCULATIONS_CACHE_TTL) {
            console.log(`⚡ Cache Hit category calculations for: ${categoryPath}`);
            console.timeEnd(timeLabel);
            return cached.data;
        }
        const isPork = categoryPath.includes('돈육') || categoryPath.includes('한돈');
        const isBeef = categoryPath.includes('한우') || categoryPath.includes('소고기');
        const species = isPork ? 'PORK' : isBeef ? 'BEEF' : undefined;
        const isChilled = categoryPath.includes('냉장');
        const isFrozen = categoryPath.includes('냉동');
        const storageType = isChilled ? 'CHILLED' : isFrozen ? 'FROZEN' : undefined;
        const categorySeparator = categoryPath.includes('>')
            ? /\s*>\s*/
            : categoryPath.includes('/')
                ? /\s*\/\s*/
                : /\s*,\s*/;
        const categoryParts = categoryPath
            .split(categorySeparator)
            .map((part) => part.trim())
            .filter(Boolean);
        const catName = categoryParts[categoryParts.length - 1] || '';
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        console.time(`${timeLabel} - 1. DB Aggregate RawRecords`);
        const aggregateResult = await this.prisma.rawRecord.aggregate({
            where: {
                species,
                storageType,
                category: catName,
                collectedAt: { gte: sevenDaysAgo },
            },
            _avg: {
                pricePerKg: true,
            },
            _max: {
                pricePerKg: true,
            },
            _min: {
                pricePerKg: true,
            },
            _count: {
                rawRecordId: true,
            },
        });
        console.timeEnd(`${timeLabel} - 1. DB Aggregate RawRecords`);
        console.time(`${timeLabel} - 2. DB findMany RawRecords (limit 20)`);
        const strictFilteredRecords = await this.prisma.rawRecord.findMany({
            where: {
                species,
                storageType,
                category: catName,
                collectedAt: { gte: sevenDaysAgo },
            },
            orderBy: { collectedAt: 'desc' },
            take: 20,
            select: {
                rawRecordId: true,
                rawProductName: true,
                pricePerKg: true,
                ageMonths: true,
                collectedAt: true,
                qualityGrade: true,
                brand: true,
                gender: true,
                category: true,
            },
        });
        console.timeEnd(`${timeLabel} - 2. DB findMany RawRecords (limit 20)`);
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
                refinedName = brand
                    ? rawName.startsWith(r.brand)
                        ? rawName
                        : `${brand} ${rawName}`
                    : rawName;
            }
            return {
                id: r.rawRecordId,
                sourceName: refinedName,
                rawProductName: rawName,
                price: r.pricePerKg,
                ageInMonths: r.ageMonths,
                collectedAt: r.collectedAt.toISOString(),
                includedInAverage: true,
                grade: r.qualityGrade || null,
                brand: r.brand || null,
            };
        });
        console.time(`${timeLabel} - 3. DB CategoryTree lookup`);
        const matchedCategories = await this.prisma.categoryTree.findMany({
            where: {
                path: { endsWith: catName },
            },
            select: { path: true },
        });
        const categoryPaths = matchedCategories.map((c) => c.path);
        console.timeEnd(`${timeLabel} - 3. DB CategoryTree lookup`);
        console.time(`${timeLabel} - 4. DB findMany MarketItems`);
        const sourceItems = await this.prisma.marketItem.findMany({
            where: {
                status: 'ACTIVE',
                species,
                storageType,
                category: { in: categoryPaths },
            },
            select: {
                itemId: true,
                name: true,
                grade: true,
                brand: true,
                detailUrl: true,
                price: true,
                ageMonths: true,
                weightKg: true,
                salePrice: true,
                manufacturedAt: true,
                expiresAt: true,
                updatedAt: true,
            },
            orderBy: { price: 'asc' },
        });
        console.timeEnd(`${timeLabel} - 4. DB findMany MarketItems`);
        console.time(`${timeLabel} - 5. DB Prices lookup`);
        const sourceItemIds = sourceItems.map((item) => item.itemId);
        const recentMarketDates = sourceItemIds.length > 0
            ? await this.prisma.marketItemPrice.findMany({
                where: { itemId: { in: sourceItemIds } },
                distinct: ['marketDate'],
                orderBy: { marketDate: 'desc' },
                take: 7,
                select: { marketDate: true },
            })
            : [];
        const historyRows = recentMarketDates.length > 0
            ? await this.prisma.marketItemPrice.findMany({
                where: {
                    itemId: { in: sourceItemIds },
                    marketDate: { in: recentMarketDates.map((row) => row.marketDate) },
                },
                orderBy: [{ itemId: 'asc' }, { marketDate: 'desc' }],
                select: { itemId: true, marketDate: true, price: true },
            })
            : [];
        console.timeEnd(`${timeLabel} - 5. DB Prices lookup`);
        console.time(`${timeLabel} - 6. Chart JS processing`);
        const historyByItem = new Map();
        for (const row of historyRows) {
            const itemHistory = historyByItem.get(row.itemId) ?? [];
            itemHistory.push({ marketDate: row.marketDate, price: row.price });
            historyByItem.set(row.itemId, itemHistory);
        }
        const chartHistory = sourceItemIds.length > 0
            ? await this.prisma.marketItemPrice.groupBy({
                by: ['marketDate'],
                where: {
                    itemId: { in: sourceItemIds },
                    marketDate: { in: recentMarketDates.map((row) => row.marketDate) },
                    price: { not: null },
                },
                _avg: {
                    price: true,
                },
                orderBy: {
                    marketDate: 'asc',
                },
            })
            : [];
        const priceHistory = chartHistory.map((row) => ({
            marketDate: row.marketDate.toISOString().split('T')[0],
            price: Math.round(row._avg.price ?? 0),
        }));
        console.timeEnd(`${timeLabel} - 6. Chart JS processing`);
        const filteredSourceItems = sourceItems;
        const averagePrice = Math.round(aggregateResult._avg.pricePerKg ?? 0);
        const fallbackPrice = filteredSourceItems.length > 0
            ? Math.round(filteredSourceItems.reduce((a, b) => a + b.price, 0) /
                filteredSourceItems.length)
            : 0;
        const finalAverage = averagePrice || fallbackPrice;
        const latestHistoryPoint = priceHistory.at(-1);
        const previousHistoryPoint = priceHistory.at(-2);
        const categoryChangeAmount = latestHistoryPoint && previousHistoryPoint
            ? latestHistoryPoint.price - previousHistoryPoint.price
            : 0;
        const categoryTrendStatus = categoryChangeAmount > 0
            ? 'UP'
            : categoryChangeAmount < 0
                ? 'DOWN'
                : 'UNCHANGED';
        const highestPrice = aggregateResult._max.pricePerKg || (filteredSourceItems.length > 0 ? Math.max(...filteredSourceItems.map((si) => si.price)) : 0);
        const lowestPrice = aggregateResult._min.pricePerKg || (filteredSourceItems.length > 0 ? Math.min(...filteredSourceItems.map((si) => si.price)) : 0);
        const displayName = catName;
        const collectionTimestamps = [
            ...strictFilteredRecords.map((record) => record.collectedAt.getTime()),
            ...sourceItems.map((item) => item.updatedAt.getTime()),
        ];
        const lastCollectedAt = collectionTimestamps.length > 0
            ? new Date(Math.max(...collectionTimestamps)).toISOString()
            : null;
        const result = {
            itemId: `cat-${displayName}`,
            displayName,
            grade: null,
            averagePrice: finalAverage,
            changeAmount: categoryChangeAmount,
            trendStatus: categoryTrendStatus,
            highestPrice,
            lowestPrice,
            participantCount: aggregateResult._count.rawRecordId,
            lastCollectedAt,
            priceHistory,
            sourceRecords: mappedSourceRecords,
            sourceItems: filteredSourceItems.map((si) => {
                const itemHistory = historyByItem.get(si.itemId) ?? [];
                const latestPrice = itemHistory[0]?.price ?? si.price;
                const previousPrice = itemHistory[1]?.price ?? null;
                const changeAmount = latestPrice !== null && previousPrice !== null
                    ? latestPrice - previousPrice
                    : null;
                const trendStatus = changeAmount === null
                    ? null
                    : changeAmount > 0
                        ? 'UP'
                        : changeAmount < 0
                            ? 'DOWN'
                            : 'UNCHANGED';
                return {
                    itemId: si.itemId,
                    name: si.name,
                    grade: si.grade,
                    brand: si.brand || null,
                    detailUrl: si.detailUrl,
                    price: si.price,
                    previousPrice,
                    changeAmount,
                    trendStatus,
                    ageInMonths: si.ageMonths,
                    manufacturedAt: si.manufacturedAt,
                    expiresAt: si.expiresAt,
                    weightKg: Number(si.weightKg),
                    salePrice: si.salePrice,
                };
            }),
        };
        this.categoryCalculationsCache.set(categoryPath, {
            data: result,
            fetchedAt: Date.now(),
        });
        console.timeEnd(timeLabel);
        return result;
    }
    async getItemCalculations(itemId) {
        const timeLabel = `[ItemCalculations] ${itemId}`;
        console.time(timeLabel);
        const cached = this.itemCalculationsCache.get(itemId);
        if (cached && Date.now() - cached.fetchedAt < this.CALCULATIONS_CACHE_TTL) {
            console.log(`⚡ Cache Hit item calculations for: ${itemId}`);
            console.timeEnd(timeLabel);
            return cached.data;
        }
        console.time(`${timeLabel} - 1. DB findFirst MarketItem (Flat)`);
        const item = await this.prisma.marketItem.findFirst({
            where: { itemId, status: 'ACTIVE' },
            select: {
                itemId: true,
                name: true,
                displayName: true,
                price: true,
                grade: true,
                category: true,
                species: true,
                storageType: true,
            },
        });
        if (!item) {
            console.timeEnd(timeLabel);
            throw new common_1.NotFoundException(`품목(ID: ${itemId})을 찾을 수 없습니다.`);
        }
        const latestPriceRecord = await this.prisma.marketItemPrice.findFirst({
            where: { itemId: item.itemId },
            orderBy: { marketDate: 'desc' },
            select: {
                price: true,
                changeAmount: true,
                trendStatus: true,
                highestPrice: true,
                lowestPrice: true,
            },
        });
        console.timeEnd(`${timeLabel} - 1. DB findFirst MarketItem (Flat)`);
        const currentPrice = item.price || latestPriceRecord?.price;
        if (!currentPrice) {
            console.timeEnd(timeLabel);
            throw new common_1.NotFoundException('해당 품목의 가격 데이터가 존재하지 않습니다.');
        }
        const isPork = item.category?.includes('돈육');
        const isBeef = item.category?.includes('한우') || item.category?.includes('소고기');
        const parsedSpecies = isPork ? 'PORK' : isBeef ? 'BEEF' : item.species;
        const isChilled = item.category?.includes('냉장');
        const isFrozen = item.category?.includes('냉동');
        const parsedStorageType = isChilled
            ? 'CHILLED'
            : isFrozen
                ? 'FROZEN'
                : item.storageType;
        const catParts = item.category.split(' > ');
        const catName = catParts[catParts.length - 1];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        console.time(`${timeLabel} - 2. DB Aggregate RawRecords`);
        const aggregateResult = await this.prisma.rawRecord.aggregate({
            where: {
                species: item.species || parsedSpecies || undefined,
                storageType: item.storageType || parsedStorageType || undefined,
                category: catName,
                collectedAt: { gte: sevenDaysAgo },
                ...(item.grade ? { qualityGrade: item.grade } : {}),
            },
            _avg: {
                pricePerKg: true,
            },
            _max: {
                pricePerKg: true,
            },
            _min: {
                pricePerKg: true,
            },
            _count: {
                rawRecordId: true,
            },
        });
        console.timeEnd(`${timeLabel} - 2. DB Aggregate RawRecords`);
        console.time(`${timeLabel} - 3. DB findMany RawRecords (limit 20)`);
        const strictFilteredRecords = await this.prisma.rawRecord.findMany({
            where: {
                species: item.species || parsedSpecies || undefined,
                storageType: item.storageType || parsedStorageType || undefined,
                category: catName,
                collectedAt: { gte: sevenDaysAgo },
                ...(item.grade ? { qualityGrade: item.grade } : {}),
            },
            orderBy: { collectedAt: 'desc' },
            take: 20,
            select: {
                rawRecordId: true,
                rawProductName: true,
                pricePerKg: true,
                ageMonths: true,
                collectedAt: true,
                qualityGrade: true,
                brand: true,
                gender: true,
                category: true,
            },
        });
        console.timeEnd(`${timeLabel} - 3. DB findMany RawRecords (limit 20)`);
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
                refinedName = brand
                    ? rawName.startsWith(r.brand)
                        ? rawName
                        : `${brand} ${rawName}`
                    : rawName;
            }
            return {
                id: r.rawRecordId,
                sourceName: refinedName,
                rawProductName: rawName,
                price: r.pricePerKg,
                ageInMonths: r.ageMonths,
                collectedAt: r.collectedAt.toISOString(),
                includedInAverage: true,
                grade: r.qualityGrade || null,
                brand: r.brand || null,
            };
        });
        console.time(`${timeLabel} - 4. DB findMany MarketItems`);
        const sourceItems = await this.prisma.marketItem.findMany({
            where: {
                status: 'ACTIVE',
                OR: [{ itemId: item.itemId }, { category: item.category }],
            },
            select: {
                itemId: true,
                name: true,
                grade: true,
                brand: true,
                detailUrl: true,
                price: true,
                ageMonths: true,
                weightKg: true,
                salePrice: true,
                manufacturedAt: true,
                expiresAt: true,
            },
            orderBy: { price: 'asc' },
        });
        console.timeEnd(`${timeLabel} - 4. DB findMany MarketItems`);
        console.time(`${timeLabel} - 5. Filtering and Final mapping`);
        const filteredSourceItems = sourceItems.filter((si) => {
            if (si.itemId === item.itemId)
                return true;
            const catParts = item.category.split(' > ');
            const catName = catParts[catParts.length - 1];
            const keywords = [
                '안심',
                '등심',
                '채끝',
                '목심',
                '앞다리',
                '부채살',
                '우둔',
                '홍두깨',
                '설도',
                '양지',
                '차돌박이',
                '치마살',
                '업진살',
                '사태',
                '갈비',
                '안창살',
                '토시살',
                '삼겹',
                '뒷다리',
                '항정',
                '등심덧살',
                '갈매기',
            ];
            const otherKeywords = keywords.filter((k) => k !== catName);
            const hasOtherKeyword = otherKeywords.some((k) => si.name.includes(k));
            if (hasOtherKeyword)
                return false;
            const hasCorrectKeyword = si.name.includes(catName) ||
                (catName === '우둔' && si.name.includes('우둔살')) ||
                (catName === '앞다리살' && si.name.includes('앞다리')) ||
                (catName === '설도' && si.name.includes('설깃'));
            return hasCorrectKeyword;
        });
        const result = {
            itemId: item.itemId,
            displayName: item.displayName || item.name,
            grade: item.grade || null,
            averagePrice: currentPrice,
            changeAmount: latestPriceRecord?.changeAmount ?? 0,
            trendStatus: latestPriceRecord?.trendStatus ?? 'UNCHANGED',
            highestPrice: latestPriceRecord?.highestPrice ?? currentPrice,
            lowestPrice: latestPriceRecord?.lowestPrice ?? currentPrice,
            participantCount: aggregateResult._count.rawRecordId,
            sourceRecords: mappedSourceRecords,
            sourceItems: filteredSourceItems.map((si) => ({
                itemId: si.itemId,
                name: si.name,
                grade: si.grade || null,
                brand: si.brand || null,
                detailUrl: si.detailUrl,
                price: si.price,
                ageInMonths: si.ageMonths,
                weightKg: si.weightKg === null ? null : Number(si.weightKg),
                salePrice: si.salePrice,
                manufacturedAt: si.manufacturedAt,
                expiresAt: si.expiresAt,
            })),
        };
        this.itemCalculationsCache.set(itemId, {
            data: result,
            fetchedAt: Date.now(),
        });
        return result;
    }
    async getItemPriceHistory(itemId) {
        const [item, latestRecords, recentRecords] = await this.prisma.$transaction([
            this.prisma.marketItem.findUnique({
                where: { itemId },
                select: {
                    itemId: true,
                    displayName: true,
                    name: true,
                    price: true,
                },
            }),
            this.prisma.marketItemPrice.findMany({
                where: { itemId },
                orderBy: { marketDate: 'desc' },
                take: 2,
                select: { marketDate: true, price: true },
            }),
            this.prisma.marketItemPrice.findMany({
                where: { itemId },
                orderBy: { marketDate: 'desc' },
                take: 7,
                select: { marketDate: true, price: true },
            }),
        ]);
        if (!item) {
            throw new common_1.NotFoundException(`품목(ID: ${itemId})을 찾을 수 없습니다.`);
        }
        const currentRecord = latestRecords[0] ?? null;
        const previousRecord = latestRecords[1] ?? null;
        const currentPrice = currentRecord?.price ?? item.price ?? null;
        const previousPrice = previousRecord?.price ?? null;
        const changeAmount = currentPrice !== null && previousPrice !== null
            ? currentPrice - previousPrice
            : null;
        const changeRate = changeAmount !== null && previousPrice !== null && previousPrice > 0
            ? Number(((changeAmount / previousPrice) * 100).toFixed(2))
            : null;
        const trendStatus = changeAmount === null
            ? null
            : changeAmount > 0
                ? 'UP'
                : changeAmount < 0
                    ? 'DOWN'
                    : 'UNCHANGED';
        const points = recentRecords.length > 0
            ? recentRecords
                .slice()
                .reverse()
                .map((record) => ({
                marketDate: record.marketDate.toISOString().split('T')[0],
                price: record.price,
            }))
            : item.price
                ? [{ marketDate: new Date().toISOString().split('T')[0], price: item.price }]
                : [];
        return {
            item: {
                itemId: item.itemId,
                displayName: item.displayName || item.name,
            },
            summary: {
                currentMarketDate: currentRecord
                    ? currentRecord.marketDate.toISOString().split('T')[0]
                    : null,
                previousMarketDate: previousRecord
                    ? previousRecord.marketDate.toISOString().split('T')[0]
                    : null,
                currentPrice,
                previousPrice,
                changeAmount,
                changeRate,
                trendStatus,
            },
            points,
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
                if (record.gender === '암소' ||
                    record.rawProductName.includes('(암)') ||
                    record.rawProductName.includes('암퇘지')) {
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
            grouped
                .get(key)
                .push({ ...record, standardizedGrade, category, displayName });
        }
        const marketDate = today;
        for (const [key, records] of grouped.entries()) {
            const first = records[0];
            const prices = records.map((r) => r.pricePerKg);
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
                    grade: first.standardizedGrade,
                },
            });
            if (!marketItem) {
                this.logger.warn(`원본 상품 마스터가 없어 집계 생성을 건너뜁니다: ${key}`);
                continue;
            }
            marketItem = await this.prisma.marketItem.update({
                where: { itemId: marketItem.itemId },
                data: {
                    searchKeywords,
                    displayName: first.displayName,
                    grade: first.standardizedGrade,
                    price: avgPrice,
                },
            });
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
                    },
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
                },
            });
        }
    }
};
exports.MarketService = MarketService;
exports.MarketService = MarketService = MarketService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MarketService);
//# sourceMappingURL=market.service.js.map