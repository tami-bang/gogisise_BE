import { PrismaService } from '../../core/prisma/prisma.service';
export declare class CrawlerService {
    private readonly prisma;
    private readonly logger;
    private readonly pythonScriptPath;
    constructor(prisma: PrismaService);
    peekLatestMetadata(): Promise<Record<string, number>>;
    runFullCrawl(): Promise<any>;
    getLastTotalCounts(): Promise<Record<string, number> | null>;
    saveLastTotalCounts(counts: Record<string, number>): Promise<void>;
    updateLastCheckedAt(): Promise<void>;
}
