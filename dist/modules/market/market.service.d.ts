import { PrismaService } from '../../core/prisma/prisma.service';
import { MarketItemsDataResponseDto, PriceHistoryDataResponseDto } from './dto/market-response.dto';
export declare class MarketService {
    private readonly prisma;
    private readonly logger;
    private readonly categoryCalculationsCache;
    private readonly itemCalculationsCache;
    private readonly CALCULATIONS_CACHE_TTL;
    constructor(prisma: PrismaService);
    getAllMarketItems(): Promise<MarketItemsDataResponseDto>;
    getCategories(options: {
        parentNo?: string;
        depth?: number;
    }): Promise<{
        path: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ctgNo: string;
        parentNo: string | null;
        depth: number;
    }[]>;
    getCategoryCalculations(categoryPath: string): Promise<any>;
    getItemCalculations(itemId: string): Promise<any>;
    getItemPriceHistory(itemId: string): Promise<PriceHistoryDataResponseDto>;
    processRawRecordsIntoMarketItems(targetDate?: Date): Promise<void>;
}
