import type { Request } from 'express';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    private buildMeta;
    getMyProfile(req: Request): Promise<{
        success: boolean;
        data: {
            userId: string;
            email: string;
            nickname: string;
            status: string;
            connectedProviders: string[];
            createdAt: Date;
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    getFavorites(req: Request): Promise<{
        success: boolean;
        data: {
            items: {
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
            }[];
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    addFavorite(req: Request, itemId: string): Promise<void>;
    removeFavorite(req: Request, itemId: string): Promise<void>;
}
