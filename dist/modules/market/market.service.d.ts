import { PrismaService } from '../../core/prisma/prisma.service';
export declare class MarketService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAllMarketItems(): Promise<{
        dataStatus: string;
        marketDate: string;
        items: any;
    }>;
    getItemCalculations(itemId: string): Promise<{
        itemId: any;
        displayName: any;
        averagePrice: any;
        changeAmount: any;
        trendStatus: any;
        highestPrice: any;
        lowestPrice: any;
        participantCount: any;
        sourceRecords: any;
    }>;
    getItemPriceHistory(itemId: string): Promise<{
        item: {
            itemId: any;
            displayName: any;
        };
        points: any;
    }>;
}
