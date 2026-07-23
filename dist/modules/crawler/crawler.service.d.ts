import { PrismaService } from '../../core/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { CrawlerIngestDto } from './dto/crawler-ingest.dto';
import { IngestCategoryTreeDto } from './dto/category-tree.dto';
export declare class CrawlerService {
    private readonly prisma;
    private readonly http;
    private readonly logger;
    private readonly fastapiBase;
    private readonly circuitBreaker;
    constructor(prisma: PrismaService, http: HttpService);
    peekLatestMetadata(): Promise<Record<string, number>>;
    runFullCrawl(categories?: string[]): Promise<any>;
    private publishToFastAPI;
    getLastTotalCounts(): Promise<Record<string, number> | null>;
    saveLastTotalCounts(counts: Record<string, number>): Promise<void>;
    updateLastCheckedAt(): Promise<void>;
    processIngestedData(data: CrawlerIngestDto): Promise<void>;
    finalizeCrawl(goodsNos: string[]): Promise<number>;
    processCategoryTree(dto: IngestCategoryTreeDto): Promise<void>;
}
