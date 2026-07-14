import { PrismaService } from '../../core/prisma/prisma.service';
import { MarketService } from '../market/market.service';
export declare class UsersService {
    private readonly prisma;
    private readonly marketService;
    constructor(prisma: PrismaService, marketService: MarketService);
    getMyProfile(userId: string): Promise<{
        userId: any;
        email: any;
        nickname: any;
        status: any;
        connectedProviders: any;
        createdAt: any;
    }>;
    getFavorites(userId: string): Promise<any>;
    addFavorite(userId: string, itemId: string): Promise<void>;
    removeFavorite(userId: string, itemId: string): Promise<void>;
}
