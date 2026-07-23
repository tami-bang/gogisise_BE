import type { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdatePasswordDto } from './dto/users.dto';
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
                ageMonths: number | null;
                weightKg: number | null;
                salePrice: number | null;
                manufacturedAt: string | null;
                expiresAt: string | null;
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
    updateProfile(req: Request, dto: UpdateProfileDto): Promise<{
        success: boolean;
        data: {
            userId: string;
            email: string;
            nickname: string;
            phone: string;
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    updatePassword(req: Request, dto: UpdatePasswordDto): Promise<void>;
    deleteAccount(req: Request): Promise<void>;
}
