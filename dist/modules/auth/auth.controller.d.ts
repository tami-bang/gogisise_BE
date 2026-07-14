import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto, KakaoLoginDto, FindEmailDto, SendResetLinkDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    private buildMeta;
    private getRefreshCookieOptions;
    signup(dto: SignupDto): Promise<{
        success: boolean;
        data: {
            userId: any;
            email: any;
            nickname: any;
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    login(dto: LoginDto, res: Response): Promise<{
        success: boolean;
        data: {
            accessToken: string;
            expiresIn: number;
            user: {
                userId: any;
                nickname: any;
            };
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    kakaoLogin(dto: KakaoLoginDto, res: Response): Promise<{
        success: boolean;
        data: {
            accessToken: string;
            expiresIn: number;
            user: {
                userId: any;
                nickname: any;
            };
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    refresh(req: Request, res: Response): Promise<{
        success: boolean;
        data: {
            accessToken: string;
            expiresIn: number;
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    logout(req: Request, res: Response): Promise<{
        success: boolean;
        data: null;
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    findEmail(dto: FindEmailDto): Promise<{
        success: boolean;
        data: {
            maskedEmail: string;
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
    sendResetLink(dto: SendResetLinkDto): Promise<{
        success: boolean;
        data: {
            message: string;
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
}
