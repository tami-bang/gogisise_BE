import { MarketService } from './market.service';
export declare class MarketController {
    private readonly marketService;
    constructor(marketService: MarketService);
    getAllMarketItems(): Promise<{
        success: boolean;
        data: {
            dataStatus: string;
            marketDate: string;
            items: any;
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    getItemCalculations(itemId: string): Promise<{
        success: boolean;
        data: {
            itemId: any;
            displayName: any;
            averagePrice: any;
            changeAmount: any;
            trendStatus: any;
            highestPrice: any;
            lowestPrice: any;
            participantCount: any;
            sourceRecords: any;
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    getItemPriceHistory(itemId: string): Promise<{
        success: boolean;
        data: {
            item: {
                itemId: any;
                displayName: any;
            };
            points: any;
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
}
