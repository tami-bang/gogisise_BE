import type { Request } from 'express';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    private buildMeta;
    getMyProfile(req: Request): Promise<{
        success: boolean;
        data: {
            userId: any;
            email: any;
            nickname: any;
            status: any;
            connectedProviders: any;
            createdAt: any;
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    getFavorites(req: Request): Promise<{
        success: boolean;
        data: {
            items: any;
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    addFavorite(req: Request, itemId: string): Promise<void>;
    removeFavorite(req: Request, itemId: string): Promise<void>;
}
