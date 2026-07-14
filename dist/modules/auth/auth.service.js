"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const redis_service_1 = require("../../core/redis/redis.service");
const bcryptjs = __importStar(require("bcryptjs"));
const uuid_1 = require("uuid");
const axios_1 = __importDefault(require("axios"));
let AuthService = AuthService_1 = class AuthService {
    prisma;
    redis;
    jwt;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, redis, jwt) {
        this.prisma = prisma;
        this.redis = redis;
        this.jwt = jwt;
    }
    issueAccessToken(userId, email) {
        return this.jwt.sign({ sub: userId, email }, { expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '1h') });
    }
    async issueAndSaveRefreshToken(userId) {
        const tokenId = (0, uuid_1.v4)();
        const refreshToken = this.jwt.sign({ sub: userId, tokenId }, { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') });
        const ttlSeconds = 30 * 24 * 60 * 60;
        await this.redis.set(`rt:${userId}:${tokenId}`, refreshToken, ttlSeconds);
        return refreshToken;
    }
    async signup(dto) {
        const exists = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (exists) {
            throw new common_1.ConflictException('이미 사용 중인 이메일입니다.');
        }
        const hashedPassword = await bcryptjs.hash(dto.password, 12);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                nickname: dto.nickname,
                phone: `temp_${(0, uuid_1.v4)()}`,
            },
        });
        return {
            userId: user.userId,
            email: user.email,
            nickname: user.nickname,
        };
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user || !user.password) {
            throw new common_1.UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        if (user.status === 'LOCKED') {
            throw new common_1.UnauthorizedException('계정이 잠겨있습니다. 고객 지원으로 문의해 주세요.');
        }
        const passwordMatch = await bcryptjs.compare(dto.password, user.password);
        if (!passwordMatch) {
            throw new common_1.UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        const accessToken = this.issueAccessToken(user.userId, user.email);
        const refreshToken = dto.autoLogin
            ? await this.issueAndSaveRefreshToken(user.userId)
            : null;
        return {
            accessToken,
            refreshToken,
            expiresIn: 3600,
            user: { userId: user.userId, nickname: user.nickname },
        };
    }
    async kakaoLogin(dto) {
        let kakaoUserId;
        let kakaoEmail;
        try {
            const response = await axios_1.default.get(process.env.KAKAO_USER_INFO_URL || 'https://kapi.kakao.com/v2/user/me', {
                headers: { Authorization: `Bearer ${dto.kakaoAccessToken}` },
            });
            kakaoUserId = String(response.data.id);
            kakaoEmail = response.data.kakao_account?.email;
        }
        catch (error) {
            this.logger.error('카카오 API 호출 실패', error);
            throw new common_1.UnauthorizedException('유효하지 않은 카카오 토큰입니다.');
        }
        const existingSocial = await this.prisma.userSocialAccount.findFirst({
            where: { provider: 'KAKAO', providerUid: kakaoUserId },
            include: { user: true },
        });
        let user = existingSocial?.user;
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    email: kakaoEmail || `kakao_${kakaoUserId}@gogisise.internal`,
                    nickname: `고기사장님_${kakaoUserId.slice(-4)}`,
                    phone: `kakao_${(0, uuid_1.v4)()}`,
                    socialAccounts: {
                        create: { provider: 'KAKAO', providerUid: kakaoUserId },
                    },
                },
            });
        }
        const accessToken = this.issueAccessToken(user.userId, user.email);
        const refreshToken = await this.issueAndSaveRefreshToken(user.userId);
        return {
            accessToken,
            refreshToken,
            expiresIn: 3600,
            user: { userId: user.userId, nickname: user.nickname },
        };
    }
    async refreshTokens(refreshTokenFromCookie) {
        let payload;
        try {
            payload = this.jwt.verify(refreshTokenFromCookie);
        }
        catch {
            throw new common_1.UnauthorizedException('만료되었거나 유효하지 않은 리프레시 토큰입니다.');
        }
        const { sub: userId, tokenId } = payload;
        const redisKey = `rt:${userId}:${tokenId}`;
        const storedToken = await this.redis.get(redisKey);
        if (!storedToken) {
            this.logger.warn(`⚠️ RTR 위반 감지! userId: ${userId}의 모든 세션을 무효화합니다.`);
            const allUserTokenKeys = await this.redis.keys(`rt:${userId}:*`);
            for (const key of allUserTokenKeys) {
                await this.redis.del(key);
            }
            throw new common_1.UnauthorizedException('보안 이슈가 감지되었습니다. 다시 로그인해 주세요.');
        }
        await this.redis.del(redisKey);
        const user = await this.prisma.user.findUnique({ where: { userId } });
        if (!user)
            throw new common_1.UnauthorizedException('유저를 찾을 수 없습니다.');
        const newAccessToken = this.issueAccessToken(user.userId, user.email);
        const newRefreshToken = await this.issueAndSaveRefreshToken(user.userId);
        return { accessToken: newAccessToken, newRefreshToken, expiresIn: 3600 };
    }
    async logout(refreshTokenFromCookie) {
        if (!refreshTokenFromCookie)
            return;
        try {
            const payload = this.jwt.verify(refreshTokenFromCookie);
            await this.redis.del(`rt:${payload.sub}:${payload.tokenId}`);
        }
        catch {
            this.logger.warn('로그아웃 시 토큰 파싱 실패 (이미 만료된 토큰으로 추정)');
        }
    }
    async findEmail(phone) {
        const user = await this.prisma.user.findFirst({ where: { phone } });
        if (!user)
            throw new common_1.UnauthorizedException('해당 휴대폰 번호로 가입된 계정이 없습니다.');
        const [local, domain] = user.email.split('@');
        const masked = local.slice(0, 2) + '***';
        return `${masked}@${domain}`;
    }
    async sendResetLink(email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            this.logger.warn(`비밀번호 재설정 요청 - 가입되지 않은 이메일: ${email}`);
            return;
        }
        this.logger.log(`비밀번호 재설정 링크 발송 요청: ${email} (이메일 서버 연동 필요)`);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map