import { CrawlerService } from '../crawler/crawler.service';
export declare class TasksService {
    private readonly crawlerService;
    private readonly logger;
    constructor(crawlerService: CrawlerService);
    handleHybridMilestoneScan(): Promise<void>;
}
