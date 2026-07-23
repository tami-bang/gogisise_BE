import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MarketService } from '../market/market.service';
import * as bcryptjs from 'bcryptjs'; // 💡 [한글 주석] 비밀번호 해싱을 위한 bcryptjs 임포트
import { UpdateProfileDto, UpdatePasswordDto } from './dto/users.dto'; // 💡 [한글 주석] 회원정보 수정 및 비밀번호 변경 DTO 임포트

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

    // 시세 목록 조회와 동일한 포맷 및 파싱 규칙으로 반환 (프론트엔드 일치성 유지)
    return favorites.map(({ item }) => {
      const latestPrice = item.prices[0];

      // 💡 [한글 주석] 카테고리 풀 경로 문자열 파싱하여 단일 부위 및 표준화된 species, storageType 복구
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

  /**
   * 💡 [한글 주석] 이메일 및 회원 정보 수정 (이메일/연락처 중복 예외 처리 장착)
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');

    const updateData: any = {};

    // 닉네임 수정
    if (dto.nickname !== undefined && dto.nickname !== user.nickname) {
      updateData.nickname = dto.nickname;
    }

    // 이메일 수정 및 중복 검사
    if (dto.email !== undefined && dto.email !== user.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (emailExists) {
        throw new ConflictException('이미 사용 중인 이메일입니다.');
      }
      updateData.email = dto.email;
    }

    // 연락처 수정 및 중복 검사
    if (dto.phone !== undefined && dto.phone !== user.phone) {
      const phoneExists = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (phoneExists) {
        throw new ConflictException('이미 사용 중인 연락처입니다.');
      }
      updateData.phone = dto.phone;
    }

    // 변경 사항이 없으면 그대로 반환
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

  /**
   * 💡 [한글 주석] 비밀번호 변경 (소셜 로그인 예외 및 현재 비밀번호 대조 검증 장착)
   */
  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');

    // 소셜 로그인 회원 예외 처리
    if (!user.password) {
      throw new BadRequestException('소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.');
    }

    // 현재 비밀번호 일치 검증
    const passwordMatch = await bcryptjs.compare(dto.currentPassword, user.password);
    if (!passwordMatch) {
      throw new BadRequestException('현재 비밀번호가 일치하지 않습니다.');
    }

    // 새 비밀번호와 새 비밀번호 확인 일치 검증
    if (dto.newPassword !== dto.newPasswordConfirm) {
      throw new BadRequestException('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
    }

    // 새 비밀번호 해싱 및 업데이트 (해싱 강도: 12)
    const hashedPassword = await bcryptjs.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { userId },
      data: { password: hashedPassword },
    });
  }

  /**
   * 💡 [한글 주석] 회원탈퇴 (Hard Cascade Delete)
   */
  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');

    // Cascade 설정에 의해 사용자와 엮인 모든 자식 레코드 자동 소거
    await this.prisma.user.delete({
      where: { userId },
    });
  }
}
