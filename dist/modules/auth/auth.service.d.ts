import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import { SignupDto, LoginDto, KakaoLoginDto } from './dto/auth.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly redis;
    private readonly jwt;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService, jwt: JwtService);
    private issueAccessToken;
    private issueAndSaveRefreshToken;
    signup(dto: SignupDto): Promise<{
        userId: string;
        email: string;
        nickname: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string | null;
        expiresIn: number;
        user: {
            userId: string;
            nickname: string;
        };
    }>;
    kakaoLogin(dto: KakaoLoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        user: {
            userId: string;
            nickname: string;
        };
    }>;
    refreshTokens(refreshTokenFromCookie: string): Promise<{
        accessToken: string;
        newRefreshToken: string;
        expiresIn: number;
    }>;
    logout(refreshTokenFromCookie: string | undefined): Promise<void>;
    findEmail(phone: string): Promise<string>;
    sendResetLink(email: string): Promise<void>;
}
