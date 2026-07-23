import { CrawlerService } from './crawler.service';
import { IngestCategoryTreeDto } from './dto/category-tree.dto';
import { IngestPayloadDto } from './dto/crawler-ingest.dto';
import { FinalizeCrawlDto } from './dto/finalize-crawl.dto';
export declare class CrawlerController {
    private readonly crawlerService;
    private readonly logger;
    constructor(crawlerService: CrawlerService);
    ingest(payload: IngestPayloadDto): Promise<{
        success: boolean;
        upserted: number;
    }>;
    finalize(dto: FinalizeCrawlDto): Promise<{
        success: boolean;
        deactivated: number;
    }>;
    ingestCategoryTree(dto: IngestCategoryTreeDto): Promise<{
        success: boolean;
    }>;
}
