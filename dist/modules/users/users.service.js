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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const market_service_1 = require("../market/market.service");
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
            return {
                itemId: item.itemId,
                species: item.species,
                storageType: item.storageType,
                category: item.category,
                displayName: item.displayName,
                searchKeywords: item.searchKeywords || '',
                grade: item.grade,
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        market_service_1.MarketService])
], UsersService);
//# sourceMappingURL=users.service.js.map