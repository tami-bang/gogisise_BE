import type { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { ViewLogDto } from './dto/analytics.dto';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    private buildMeta;
    logView(req: Request, dto: ViewLogDto): Promise<{
        success: boolean;
        data: null;
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    getFrequentItems(): Promise<{
        success: boolean;
        data: {
            items: any;
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
}
