import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MarketService } from '../market/market.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketService: MarketService,
  ) {}

  /**
   * 내 프로필 조회 (연동된 소셜 계정 목록 포함)
   */
  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: { socialAccounts: true },
    });

    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');

    return {
      userId: user.userId,
      email: user.email,
      nickname: user.nickname,
      status: user.status,
      connectedProviders: user.socialAccounts.map((s) => s.provider),
      createdAt: user.createdAt,
    };
  }

  /**
   * 즐겨찾기 목록 조회
   */
  async getFavorites(userId: string) {
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

    // 시세 목록 조회와 동일한 포맷으로 반환 (프론트엔드 통일성 유지)
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

  /**
   * 즐겨찾기 추가 (멱등성: 중복 추가 시에도 에러 없이 204 반환)
   */
  async addFavorite(userId: string, itemId: string): Promise<void> {
    try {
      await this.prisma.favorite.create({ data: { userId, itemId } });
    } catch (error: any) {
      // Prisma의 Unique Constraint 에러(P2002)는 무시 (이미 즐겨찾기된 경우)
      if (error?.code === 'P2002') return;
      throw error;
    }
  }

  /**
   * 즐겨찾기 삭제 (멱등성: 존재하지 않는 항목 삭제 시에도 에러 없이 204 반환)
   */
  async removeFavorite(userId: string, itemId: string): Promise<void> {
    try {
      await this.prisma.favorite.deleteMany({ where: { userId, itemId } });
    } catch {
      // 존재하지 않는 레코드 삭제 시도 시 조용히 무시
    }
  }
}
