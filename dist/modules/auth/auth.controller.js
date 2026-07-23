"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const auth_dto_1 = require("./dto/auth.dto");
const jwt_auth_guard_1 = require("../../core/guards/jwt-auth.guard");
let AuthController = AuthController_1 = class AuthController {
    authService;
    logger = new common_1.Logger(AuthController_1.name);
    constructor(authService) {
        this.authService = authService;
    }
    buildMeta(prefix) {
        return {
            requestId: `req_${prefix}_${Date.now()}`,
            servedAt: new Date().toISOString(),
        };
    }
    getRefreshCookieOptions() {
        const isProduction = process.env.NODE_ENV === 'production';
        return {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: '/',
        };
    }
    async signup(dto) {
        const data = await this.authService.signup(dto);
        return { success: true, data, meta: this.buildMeta('signup') };
    }
    async login(dto, res) {
        try {
            const result = await this.authService.login(dto);
            if (result.refreshToken) {
                res.cookie('refreshToken', result.refreshToken, this.getRefreshCookieOptions());
            }
            return {
                success: true,
                data: {
                    accessToken: result.accessToken,
                    expiresIn: result.expiresIn,
                    user: result.user,
                },
                meta: this.buildMeta('login'),
            };
        }
        catch (err) {
            this.logger.error('Login failed with error:', err);
            throw new common_1.InternalServerErrorException({
                message: `로그인 처리 중 에러가 발생했습니다: ${err.message || err.toString()}`,
                error: err.name || 'LoginError',
                stack: err.stack,
            });
        }
    }
    async kakaoLogin(dto, res) {
        const result = await this.authService.kakaoLogin(dto);
        res.cookie('refreshToken', result.refreshToken, this.getRefreshCookieOptions());
        return {
            success: true,
            data: {
                accessToken: result.accessToken,
                expiresIn: result.expiresIn,
                user: result.user,
            },
            meta: this.buildMeta('kakao'),
        };
    }
    async refresh(req, res) {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            throw new common_1.UnauthorizedException('리프레시 토큰이 없습니다. 다시 로그인해 주세요.');
        }
        const result = await this.authService.refreshTokens(refreshToken);
        res.cookie('refreshToken', result.newRefreshToken, this.getRefreshCookieOptions());
        return {
            success: true,
            data: { accessToken: result.accessToken, expiresIn: result.expiresIn },
            meta: this.buildMeta('refresh'),
        };
    }
    async logout(req, res) {
        const refreshToken = req.cookies?.refreshToken;
        await this.authService.logout(refreshToken);
        res.clearCookie('refreshToken', { path: '/' });
        return { success: true, data: null, meta: this.buildMeta('logout') };
    }
    async findEmail(dto) {
        const maskedEmail = await this.authService.findEmail(dto.phone);
        return {
            success: true,
            data: { maskedEmail },
            meta: this.buildMeta('find-email'),
        };
    }
    async sendResetLink(dto) {
        await this.authService.sendResetLink(dto.email);
        return {
            success: true,
            data: { message: '비밀번호 재설정 링크가 이메일로 발송되었습니다.' },
            meta: this.buildMeta('reset-link'),
        };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('signup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.SignupDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signup", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('kakao'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.KakaoLoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "kakaoLogin", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('find-email'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.FindEmailDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "findEmail", null);
__decorate([
    (0, common_1.Post)('send-reset-link'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.SendResetLinkDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendResetLink", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, common_1.Controller)('api/v1/auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map