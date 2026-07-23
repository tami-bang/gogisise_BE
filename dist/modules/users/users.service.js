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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const market_service_1 = require("../market/market.service");
const bcryptjs = __importStar(require("bcryptjs"));
let UsersService = class UsersService {
    prisma;
    marketService;
    constructor(prisma, marketService) {
        this.prisma = prisma;
        this.marketService = marketService;
    }
    async getMyProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { userId },
            include: { socialAccounts: true },
        });
        if (!user)
            throw new common_1.NotFoundException('유저를 찾을 수 없습니다.');
        return {
            userId: user.userId,
            email: user.email,
            nickname: user.nickname,
            status: user.status,
            connectedProviders: user.socialAccounts.map((s) => s.provider),
            createdAt: user.createdAt,
        };
    }
    async getFavorites(userId) {
        const favorites = await this.prisma.favorite.findMany({
            where: { userId },
            include: {
                item: {
                    include: {
                        prices: {
                            orderBy: { marketDate: 'desc' },
                            take: 1,
                        },
                    },
                },
            },
        });
        return favorites.map(({ item }) => {
            const latestPrice = item.prices[0];
            const isPork = item.category?.includes('돈육');
            const isBeef = item.category?.includes('한우') || item.category?.includes('소고기');
            const parsedSpecies = isPork ? 'PORK' : isBeef ? 'BEEF' : item.species;
            const isChilled = item.category?.includes('냉장');
            const isFrozen = item.category?.includes('냉동');
            const parsedStorageType = isChilled ? 'CHILLED' : isFrozen ? 'FROZEN' : item.storageType;
            const categoryParts = item.category?.split(/\s*>\s*|\s*,\s*/).filter(Boolean);
            const parsedCategory = categoryParts && categoryParts.length > 0
                ? categoryParts[categoryParts.length - 1]
                : item.category;
            const parsedDisplayName = item.displayName || item.name || (categoryParts && categoryParts.length > 0
                ? categoryParts[categoryParts.length - 1]
                : '');
            return {
                itemId: item.itemId,
                species: parsedSpecies,
                storageType: parsedStorageType,
                category: parsedCategory,
                displayName: parsedDisplayName,
                searchKeywords: item.searchKeywords || '',
                grade: item.grade,
                ageMonths: item.ageMonths,
                weightKg: item.weightKg ? Number(item.weightKg) : null,
                salePrice: item.salePrice,
                manufacturedAt: item.manufacturedAt ? item.manufacturedAt.toISOString() : null,
                expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
                price: latestPrice?.price ?? null,
                previousPrice: latestPrice?.previousPrice ?? null,
                changeAmount: latestPrice?.changeAmount ?? null,
                trendStatus: latestPrice?.trendStatus ?? null,
                currency: item.currency,
                priceUnit: item.priceUnit,
            };
        });
    }
    async addFavorite(userId, itemId) {
        try {
            await this.prisma.favorite.create({ data: { userId, itemId } });
        }
        catch (error) {
            if (error?.code === 'P2002')
                return;
            throw error;
        }
    }
    async removeFavorite(userId, itemId) {
        try {
            await this.prisma.favorite.deleteMany({ where: { userId, itemId } });
        }
        catch {
        }
    }
    async updateProfile(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { userId } });
        if (!user)
            throw new common_1.NotFoundException('유저를 찾을 수 없습니다.');
        const updateData = {};
        if (dto.nickname !== undefined && dto.nickname !== user.nickname) {
            updateData.nickname = dto.nickname;
        }
        if (dto.email !== undefined && dto.email !== user.email) {
            const emailExists = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
            if (emailExists) {
                throw new common_1.ConflictException('이미 사용 중인 이메일입니다.');
            }
            updateData.email = dto.email;
        }
        if (dto.phone !== undefined && dto.phone !== user.phone) {
            const phoneExists = await this.prisma.user.findUnique({
                where: { phone: dto.phone },
            });
            if (phoneExists) {
                throw new common_1.ConflictException('이미 사용 중인 연락처입니다.');
            }
            updateData.phone = dto.phone;
        }
        if (Object.keys(updateData).length === 0) {
            return {
                userId: user.userId,
                email: user.email,
                nickname: user.nickname,
                phone: user.phone,
            };
        }
        const updatedUser = await this.prisma.user.update({
            where: { userId },
            data: updateData,
        });
        return {
            userId: updatedUser.userId,
            email: updatedUser.email,
            nickname: updatedUser.nickname,
            phone: updatedUser.phone,
        };
    }
    async updatePassword(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { userId } });
        if (!user)
            throw new common_1.NotFoundException('유저를 찾을 수 없습니다.');
        if (!user.password) {
            throw new common_1.BadRequestException('소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.');
        }
        const passwordMatch = await bcryptjs.compare(dto.currentPassword, user.password);
        if (!passwordMatch) {
            throw new common_1.BadRequestException('현재 비밀번호가 일치하지 않습니다.');
        }
        if (dto.newPassword !== dto.newPasswordConfirm) {
            throw new common_1.BadRequestException('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
        }
        const hashedPassword = await bcryptjs.hash(dto.newPassword, 12);
        await this.prisma.user.update({
            where: { userId },
            data: { password: hashedPassword },
        });
    }
    async deleteAccount(userId) {
        const user = await this.prisma.user.findUnique({ where: { userId } });
        if (!user)
            throw new common_1.NotFoundException('유저를 찾을 수 없습니다.');
        await this.prisma.user.delete({
            where: { userId },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        market_service_1.MarketService])
], UsersService);
//# sourceMappingURL=users.service.js.map