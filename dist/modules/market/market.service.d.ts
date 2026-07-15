import { PrismaService } from '../../core/prisma/prisma.service';
export declare class MarketService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAllMarketItems(): Promise<{
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
    }>;
    getItemCalculations(itemId: string): Promise<{
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
    }>;
    getItemPriceHistory(itemId: string): Promise<{
        item: {
            itemId: string;
            displayName: string;
        };
        points: {
            marketDate: string;
            price: number | null;
        }[];
    }>;
    processRawRecordsIntoMarketItems(targetDate?: Date): Promise<void>;
}
