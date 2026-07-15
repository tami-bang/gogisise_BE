import { MarketService } from './market.service';
export declare class MarketController {
    private readonly marketService;
    constructor(marketService: MarketService);
    getAllMarketItems(): Promise<{
        success: boolean;
        data: {
            dataStatus: string;
            marketDate: string;
            items: {
                itemId: string;
                priceId: string | null;
                species: string;
                storageType: string;
                category: string;
                displayName: string;
                searchKeywords: string;
                grade: string | null;
                price: number | null;
                previousPrice: number | null;
                changeAmount: number | null;
                trendStatus: string | null;
                currency: string;
                priceUnit: string;
            }[];
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    getItemCalculations(itemId: string): Promise<{
        success: boolean;
        data: {
            itemId: string;
            displayName: string;
            averagePrice: number | null;
            changeAmount: number | null;
            trendStatus: string | null;
            highestPrice: number | null;
            lowestPrice: number | null;
            participantCount: number | null;
            sourceRecords: {
                id: string;
                sourceName: string;
                rawProductName: string;
                price: number;
                ageInMonths: number | null;
                collectedAt: string;
                includedInAverage: boolean;
            }[];
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
                itemId: string;
                displayName: string;
            };
            points: {
                marketDate: string;
                price: number | null;
            }[];
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
}
