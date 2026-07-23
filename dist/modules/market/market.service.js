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
        const cached = this.categoryCalculationsCache.get(categoryPath);
        if (cached && Date.now() - cached.fetchedAt < this.CALCULATIONS_CACHE_TTL) {
            return cached.data;
        }
        const isPork = categoryPath.includes('돈육') || categoryPath.includes('한돈');
        const isBeef = categoryPath.includes('한우') || categoryPath.includes('소고기');
        const species = isPork ? 'PORK' : isBeef ? 'BEEF' : undefined;
        const isChilled = categoryPath.includes('냉장');
        const isFrozen = categoryPath.includes('냉동');
        const storageType = isChilled ? 'CHILLED' : isFrozen ? 'FROZEN' : undefined;
        const rawRecords = await this.prisma.rawRecord.findMany({
            where: {
                species,
                storageType,
            },
            orderBy: { collectedAt: 'desc' },
            take: 200,
        });
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
        const strictFilteredRecords = rawRecords.filter((record) => record.category.trim() === catName);
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
        const sourceItems = await this.prisma.marketItem.findMany({
            where: {
                status: 'ACTIVE',
                species,
                storageType,
                category: { endsWith: catName },
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
        const historyByItem = new Map();
        for (const row of historyRows) {
            const itemHistory = historyByItem.get(row.itemId) ?? [];
            itemHistory.push({ marketDate: row.marketDate, price: row.price });
            historyByItem.set(row.itemId, itemHistory);
        }
        const dailyPrices = new Map();
        for (const row of historyRows) {
            if (row.price === null)
                continue;
            const marketDate = row.marketDate.toISOString().split('T')[0];
            const pricesForDate = dailyPrices.get(marketDate) ?? [];
            pricesForDate.push(row.price);
            dailyPrices.set(marketDate, pricesForDate);
        }
        const priceHistory = Array.from(dailyPrices.entries())
            .map(([marketDate, dailyValues]) => ({
            marketDate,
            price: Math.round(dailyValues.reduce((sum, price) => sum + price, 0) /
                dailyValues.length),
        }))
            .sort((a, b) => a.marketDate.localeCompare(b.marketDate));
        const filteredSourceItems = sourceItems;
        const prices = strictFilteredRecords.map((r) => r.pricePerKg);
        const averagePrice = prices.length > 0
            ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
            : 0;
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
        const highestPrice = prices.length > 0
            ? Math.max(...prices)
            : filteredSourceItems.length > 0
                ? Math.max(...filteredSourceItems.map((si) => si.price))
                : 0;
        const lowestPrice = prices.length > 0
            ? Math.min(...prices)
            : filteredSourceItems.length > 0
                ? Math.min(...filteredSourceItems.map((si) => si.price))
                : 0;
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
            participantCount: strictFilteredRecords.length,
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
        return result;
    }
    async getItemCalculations(itemId) {
        const cached = this.itemCalculationsCache.get(itemId);
        if (cached && Date.now() - cached.fetchedAt < this.CALCULATIONS_CACHE_TTL) {
            return cached.data;
        }
        const item = await this.prisma.marketItem.findFirst({
            where: { itemId, status: 'ACTIVE' },
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
        const currentPrice = item.price || latestPrice?.price;
        if (!currentPrice) {
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
        const rawRecords = await this.prisma.rawRecord.findMany({
            where: {
                species: item.species || parsedSpecies || undefined,
                storageType: item.storageType || parsedStorageType || undefined,
            },
            orderBy: { collectedAt: 'desc' },
            take: 100,
        });
        const strictFilteredRecords = rawRecords.filter((r) => {
            const speciesPrefix = r.species === 'BEEF' ? '국내산 한우' : '국내산 돈육';
            const storagePrefix = r.storageType === 'CHILLED' ? '냉장' : '냉동';
            let rawCat = r.category;
            if (r.species === 'BEEF') {
                if (rawCat === '우둔살')
                    rawCat = '우둔';
                if (rawCat === '앞다리')
                    rawCat = '앞다리살';
                if (rawCat === '설깃')
                    rawCat = '설도';
                if (rawCat === '양지머리' || rawCat.includes('양지'))
                    rawCat = '양지';
                if (rawCat === '갈비살')
                    rawCat = '갈비';
            }
            else if (r.species === 'PORK') {
                if (rawCat === '앞다리살')
                    rawCat = '앞다리';
                if (rawCat === '뒷다리살')
                    rawCat = '뒷다리';
                if (rawCat === '삼겹살')
                    rawCat = '삼겹';
                if (rawCat === '갈비살')
                    rawCat = '갈비';
            }
            const reconstructedPath = `${speciesPrefix} > ${storagePrefix} > ${rawCat}`;
            const isPathMatch = reconstructedPath === item.category;
            if (!isPathMatch)
                return false;
            if (item.grade && r.qualityGrade) {
                return r.qualityGrade === item.grade;
            }
            return true;
        });
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
            changeAmount: latestPrice?.changeAmount ?? 0,
            trendStatus: latestPrice?.trendStatus ?? 'UNCHANGED',
            highestPrice: latestPrice?.highestPrice ?? currentPrice,
            lowestPrice: latestPrice?.lowestPrice ?? currentPrice,
            participantCount: strictFilteredRecords.length,
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