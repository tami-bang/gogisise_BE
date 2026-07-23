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
var CrawlerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrawlerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const uuid_1 = require("uuid");
const CircuitBreaker = require("opossum");
const client_1 = require("@prisma/client");
const parseSourceDate = (value) => {
    if (!value)
        return null;
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 8)
        return null;
    const year = Number(digits.slice(0, 4));
    const month = Number(digits.slice(4, 6));
    const day = Number(digits.slice(6, 8));
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
        ? date
        : null;
};
let CrawlerService = CrawlerService_1 = class CrawlerService {
    prisma;
    http;
    logger = new common_1.Logger(CrawlerService_1.name);
    fastapiBase = process.env.FASTAPI_URL || 'http://fastapi:8000';
    circuitBreaker;
    constructor(prisma, http) {
        this.prisma = prisma;
        this.http = http;
        const breakerOptions = {
            timeout: 5000,
            errorThresholdPercentage: 50,
            resetTimeout: 30000,
        };
        this.circuitBreaker = new CircuitBreaker(this.publishToFastAPI.bind(this), breakerOptions);
        this.circuitBreaker.fallback(() => {
            this.logger.warn('FastAPI circuit open – fallback engaged');
            throw new common_1.InternalServerErrorException('FastAPI unavailable');
        });
    }
    async peekLatestMetadata() {
        const url = `${this.fastapiBase}/crawler/peek`;
        try {
            this.logger.log('파이썬 크롤러(peek 모드) 호출 중...');
            const response = await (0, rxjs_1.firstValueFrom)(this.http.get(url));
            if (!response.data.success) {
                throw new Error(response.data.error || 'Unknown peek error');
            }
            return response.data.data;
        }
        catch (err) {
            const e = err;
            this.logger.error('크롤러 peek 호출 실패', e.message);
            throw new common_1.InternalServerErrorException('Peek failed');
        }
    }
    async runFullCrawl(categories = []) {
        const requestId = (0, uuid_1.v4)();
        const payload = { requestId, categories };
        this.logger.log(`파이썬 크롤러(crawl 모드) 작업 발행 중... requestId: ${requestId}`);
        await this.prisma.$transaction(async (tx) => {
            await tx.crawlerTask.create({
                data: {
                    id: requestId,
                    payload: payload,
                    status: 'PENDING',
                },
            });
            await this.circuitBreaker.fire(payload);
        });
        await this.prisma.crawlerTask.update({
            where: { id: requestId },
            data: { status: 'PUBLISHED' },
        });
        return { requestId };
    }
    async publishToFastAPI(payload) {
        const url = `${this.fastapiBase}/crawler/crawl`;
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.post(url, payload));
            this.logger.log(`Crawl task queued on FastAPI: taskId=${response.data.taskId}`);
        }
        catch (err) {
            const e = err;
            await this.prisma.crawlerTask
                .update({
                where: { id: payload.requestId },
                data: { status: 'FAILED' },
            })
                .catch((dbErr) => this.logger.error('Outbox 실패 마킹 실패', dbErr));
            this.logger.error('Failed to enqueue crawl on FastAPI', e.message);
            throw e;
        }
    }
    async getLastTotalCounts() {
        const meta = await this.prisma.crawlerMetadata.findUnique({
            where: { id: 1 },
        });
        return meta ? meta.lastTotalCounts : null;
    }
    async saveLastTotalCounts(counts) {
        await this.prisma.crawlerMetadata.upsert({
            where: { id: 1 },
            update: {
                lastTotalCounts: counts,
                lastUpdatedAt: new Date(),
                lastCheckedAt: new Date(),
            },
            create: {
                id: 1,
                lastTotalCounts: counts,
            },
        });
    }
    async updateLastCheckedAt() {
        await this.prisma.crawlerMetadata.upsert({
            where: { id: 1 },
            update: { lastCheckedAt: new Date() },
            create: { id: 1, lastTotalCounts: {} },
        });
    }
    async processIngestedData(data) {
        this.logger.log(`Ingesting data for category: ${data.category_path} (${data.items.length} items)`);
        const species = data.category_path.includes('돈육') ? 'PORK' : 'BEEF';
        const storageType = data.category_path.includes('냉동')
            ? 'FROZEN'
            : 'CHILLED';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const uniqueItems = Array.from(new Map(data.items.map((item) => [item.goodsNo, item])).values()).sort((left, right) => left.goodsNo.localeCompare(right.goodsNo));
        const preparedItems = uniqueItems.map((item) => {
            const itemSpecies = item.metadata.species || species;
            const itemStorageType = item.metadata.storage_type || storageType;
            const manufacturedAt = parseSourceDate(item.metadata.mfg_date);
            const expiresAt = parseSourceDate(item.metadata.expiry_date);
            const searchKeywords = [item.name, item.brand, data.category_path]
                .filter(Boolean)
                .join(' ');
            return {
                ...item,
                itemSpecies,
                itemStorageType,
                manufacturedAt,
                expiresAt,
                searchKeywords,
            };
        });
        this.logger.log(`Date mapping: manufacturedAt=${preparedItems.filter((item) => item.manufacturedAt).length}/${preparedItems.length}, expiresAt=${preparedItems.filter((item) => item.expiresAt).length}/${preparedItems.length}`);
        return await this.prisma.$transaction(async (tx) => {
            const existingItems = await tx.marketItem.findMany({
                where: { goodsNo: { in: preparedItems.map((item) => item.goodsNo) } },
                select: { goodsNo: true, price: true },
            });
            const previousPriceByGoodsNo = new Map(existingItems.map((item) => [item.goodsNo, item.price]));
            const marketItemRows = preparedItems.map((item) => client_1.Prisma.sql `(
        gen_random_uuid(), ${item.goodsNo}, ${item.name}, ${item.brand},
        ${item.detail_url}, 'ACTIVE', ${item.price}, ${item.itemSpecies},
        ${item.itemStorageType}, ${data.category_path}, ${item.metadata.grade || null},
        ${item.metadata.age}, ${item.metadata.weight_kg},
        ${item.metadata.sale_price ?? null}, ${item.manufacturedAt},
        ${item.expiresAt}, ${item.searchKeywords}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )`);
            const upsertedItems = await tx.$queryRaw(client_1.Prisma.sql `
        INSERT INTO "Market_Items" (
          "itemId", "goodsNo", "name", "brand", "detailUrl", "status",
          "price", "species", "storageType", "category", "grade", "ageMonths",
          "weightKg", "salePrice", "manufacturedAt", "expiresAt",
          "searchKeywords", "createdAt", "updatedAt"
        ) VALUES ${client_1.Prisma.join(marketItemRows)}
        ON CONFLICT ("goodsNo") DO UPDATE SET
          "name" = EXCLUDED."name",
          "brand" = EXCLUDED."brand",
          "detailUrl" = EXCLUDED."detailUrl",
          "status" = EXCLUDED."status",
          "price" = EXCLUDED."price",
          "species" = EXCLUDED."species",
          "storageType" = EXCLUDED."storageType",
          "category" = EXCLUDED."category",
          "grade" = EXCLUDED."grade",
          "ageMonths" = EXCLUDED."ageMonths",
          "weightKg" = EXCLUDED."weightKg",
          "salePrice" = EXCLUDED."salePrice",
          "manufacturedAt" = COALESCE(EXCLUDED."manufacturedAt", "Market_Items"."manufacturedAt"),
          "expiresAt" = COALESCE(EXCLUDED."expiresAt", "Market_Items"."expiresAt"),
          "searchKeywords" = EXCLUDED."searchKeywords",
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING "itemId", "goodsNo"
      `);
            const itemIdByGoodsNo = new Map(upsertedItems.map((item) => [item.goodsNo, item.itemId]));
            const priceRows = preparedItems.map((item) => client_1.Prisma.sql `(
        gen_random_uuid(), 
        -- 📌 한국어 주석: PostgreSQL에서 텍스트 문자열(text)을 UUID 타입 컬럼에 넣을 수 있도록 명시적으로 형변환(::uuid)을 해줍니다.
        ${itemIdByGoodsNo.get(item.goodsNo)}::uuid, 
        ${today},
        ${item.price}, ${previousPriceByGoodsNo.get(item.goodsNo) ?? null},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )`);
            await tx.$executeRaw(client_1.Prisma.sql `
        INSERT INTO "Market_Item_Prices" (
          "priceId", "itemId", "marketDate", "price", "previousPrice",
          "createdAt", "updatedAt"
        ) VALUES ${client_1.Prisma.join(priceRows)}
        ON CONFLICT ("itemId", "marketDate") DO UPDATE SET
          "price" = EXCLUDED."price",
          "updatedAt" = CURRENT_TIMESTAMP
      `);
        }, {
            maxWait: 5000,
            timeout: 30000,
        });
    }
    async finalizeCrawl(goodsNos) {
        const uniqueGoodsNos = Array.from(new Set(goodsNos.filter(Boolean)));
        if (uniqueGoodsNos.length === 0) {
            throw new common_1.InternalServerErrorException('수집 상품 목록이 비어 있어 단종 동기화를 중단했습니다.');
        }
        const collectedGoodsNosJson = JSON.stringify(uniqueGoodsNos);
        const [syncResult] = await this.prisma.$queryRaw(client_1.Prisma.sql `
      WITH collected AS MATERIALIZED (
        SELECT jsonb_array_elements_text(${collectedGoodsNosJson}::jsonb) AS "goodsNo"
      ),
      activated AS (
        UPDATE "Market_Items" AS item
        SET "status" = 'ACTIVE', "updatedAt" = CURRENT_TIMESTAMP
        WHERE item."status" = 'INACTIVE'
          AND EXISTS (
            SELECT 1 FROM collected
            WHERE collected."goodsNo" = item."goodsNo"
          )
        RETURNING 1
      ),
      deactivated AS (
        UPDATE "Market_Items" AS item
        SET "status" = 'INACTIVE', "updatedAt" = CURRENT_TIMESTAMP
        WHERE item."status" = 'ACTIVE'
          AND NOT EXISTS (
            SELECT 1 FROM collected
            WHERE collected."goodsNo" = item."goodsNo"
          )
        RETURNING 1
      )
      SELECT
        (SELECT COUNT(*) FROM activated) AS "activated",
        (SELECT COUNT(*) FROM deactivated) AS "deactivated"
    `);
        const activated = Number(syncResult?.activated ?? 0);
        const deactivated = Number(syncResult?.deactivated ?? 0);
        this.logger.log(`Crawl finalized with ${uniqueGoodsNos.length} collected goods; ${activated} items activated and ${deactivated} items deactivated.`);
        return deactivated;
    }
    async processCategoryTree(dto) {
        this.logger.log(`Processing category tree sync with ${dto.categories?.length || 0} nodes.`);
        return await this.prisma.$transaction(async (tx) => {
            await tx.categoryTree.deleteMany();
            if (dto.categories && dto.categories.length > 0) {
                await tx.categoryTree.createMany({
                    data: dto.categories.map((c) => ({
                        ctgNo: c.ctgNo,
                        name: c.name,
                        parentNo: c.parentNo,
                        depth: c.depth,
                        path: c.path,
                    })),
                });
            }
        }, {
            maxWait: 5000,
            timeout: 30000,
        });
    }
};
exports.CrawlerService = CrawlerService;
exports.CrawlerService = CrawlerService = CrawlerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        axios_1.HttpService])
], CrawlerService);
//# sourceMappingURL=crawler.service.js.map