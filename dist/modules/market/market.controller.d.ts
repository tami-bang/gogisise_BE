import { MarketService } from './market.service';
import { MarketItemsDataResponseDto, PriceHistoryDataResponseDto } from './dto/market-response.dto';
export declare class MarketController {
    private readonly marketService;
    constructor(marketService: MarketService);
    getAllMarketItems(): Promise<{
        success: true;
        data: MarketItemsDataResponseDto;
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    getCategories(parentNo?: string, depth?: string): Promise<{
        success: boolean;
        data: {
            path: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            ctgNo: string;
            parentNo: string | null;
            depth: number;
        }[];
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    getCategoryCalculations(categoryPath: string): Promise<{
        success: boolean;
        data: any;
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    getItemCalculations(itemId: string): Promise<{
        success: boolean;
        data: any;
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    getItemPriceHistory(itemId: string): Promise<{
        success: true;
        data: PriceHistoryDataResponseDto;
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
}
