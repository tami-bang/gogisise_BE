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
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const redis_service_1 = require("../../core/redis/redis.service");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const uuid_1 = require("uuid");
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    redis;
    prisma;
    logger = new common_1.Logger(AnalyticsService_1.name);
    REDIS_VIEW_QUEUE_KEY = 'analytics:view_queue';
    constructor(redis, prisma) {
        this.redis = redis;
        this.prisma = prisma;
    }
    async logView(userId, itemId) {
        const logData = {
            logId: `log_${(0, uuid_1.v4)()}`,
            userId,
            itemId,
            viewedAt: new Date().toISOString(),
        };
        await this.redis.lpush(this.REDIS_VIEW_QUEUE_KEY, JSON.stringify(logData));
    }
    async processViewLogs() {
        const logsFromRedis = await this.redis.lrange(this.REDIS_VIEW_QUEUE_KEY, 0, -1);
        if (!logsFromRedis || logsFromRedis.length === 0) {
            return;
        }
        const logCount = logsFromRedis.length;
        const parsedLogs = logsFromRedis.map((log) => JSON.parse(log));
        try {
            await this.prisma.userViewsLog.createMany({
                data: parsedLogs.map((log) => ({
                    logId: log.logId,
                    userId: log.userId,
                    itemId: log.itemId,
                    viewedAt: new Date(log.viewedAt),
                })),
                skipDuplicates: true,
            });
            await this.redis.ltrim(this.REDIS_VIEW_QUEUE_KEY, logCount, -1);
            this.logger.log(`📊 Analytics: ${logCount}건의 조회 로그 DB 적재 완료`);
        }
        catch (error) {
            this.logger.error('조회 로그 적재 실패 (데이터는 Redis에 보존됩니다)', error);
        }
    }
    async getFrequentItems(limit = 5) {
        const frequentItems = await this.prisma.userViewsLog.groupBy({
            by: ['itemId'],
            _count: { itemId: true },
            orderBy: {
                _count: { itemId: 'desc' },
            },
            take: limit,
        });
        if (frequentItems.length === 0)
            return [];
        const itemIds = frequentItems.map((f) => f.itemId);
        const items = await this.prisma.marketItem.findMany({
            where: { itemId: { in: itemIds } },
            include: {
                prices: {
                    orderBy: { marketDate: 'desc' },
                    take: 1,
                },
            },
        });
        return frequentItems.map((freq) => {
            const itemDetail = items.find((i) => i.itemId === freq.itemId);
            const latestPrice = itemDetail?.prices[0];
            return {
                itemId: freq.itemId,
                viewCount: freq._count.itemId,
                displayName: itemDetail?.displayName || '알 수 없는 품목',
                category: itemDetail?.category || '알 수 없음',
                price: latestPrice?.price || null,
            };
        });
    }
};
exports.AnalyticsService = AnalyticsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsService.prototype, "processViewLogs", null);
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map