import { CrawlerService } from '../crawler/crawler.service';
import { InternalService } from '../internal/internal.service';
import { MarketService } from '../market/market.service';
export declare class TasksService {
    private readonly crawlerService;
    private readonly internalService;
    private readonly marketService;
    private readonly logger;
    constructor(crawlerService: CrawlerService, internalService: InternalService, marketService: MarketService);
    handleHybridMilestoneScan(): Promise<void>;
}
