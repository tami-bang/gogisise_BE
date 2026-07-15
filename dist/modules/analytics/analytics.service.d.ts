import { RedisService } from '../../core/redis/redis.service';
import { PrismaService } from '../../core/prisma/prisma.service';
export declare class AnalyticsService {
    private readonly redis;
    private readonly prisma;
    private readonly logger;
    private readonly REDIS_VIEW_QUEUE_KEY;
    constructor(redis: RedisService, prisma: PrismaService);
    logView(userId: string, itemId: string): Promise<void>;
    processViewLogs(): Promise<void>;
    getFrequentItems(limit?: number): Promise<{
        itemId: string;
        viewCount: number;
        displayName: string;
        category: string;
        price: number | null;
    }[]>;
}
