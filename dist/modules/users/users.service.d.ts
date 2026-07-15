import { PrismaService } from '../../core/prisma/prisma.service';
import { MarketService } from '../market/market.service';
export declare class UsersService {
    private readonly prisma;
    private readonly marketService;
    constructor(prisma: PrismaService, marketService: MarketService);
    getMyProfile(userId: string): Promise<{
        userId: string;
        email: string;
        nickname: string;
        status: string;
        connectedProviders: string[];
        createdAt: Date;
    }>;
    getFavorites(userId: string): Promise<{
        itemId: string;
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
    }[]>;
    addFavorite(userId: string, itemId: string): Promise<void>;
    removeFavorite(userId: string, itemId: string): Promise<void>;
}
