import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { UsersModule } from './users.module';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { GlobalExceptionFilter } from '../../core/filters/global-exception.filter';
import { JwtStrategy } from '../../core/strategies/jwt.strategy';

/**
 * Favorites(즐겨찾기) & Users 모듈 통합 테스트
 *
 * [테스트 전략]
 * - JWT 발급 헬퍼를 이용해 실제 인증이 필요한 API를 테스트합니다.
 * - PrismaService를 Mock하여 즐겨찾기 추가/삭제/조회 흐름을 검증합니다.
 */
describe('Users/Favorites Module (통합 테스트)', () => {
  let app: INestApplication;

  const TEST_JWT_SECRET = 'test_jwt_secret_for_favorites';
  const MOCK_USER_ID = 'usr_fav_test';
  const MOCK_ITEM_ID = 'beef-tenderloin-1pp-chilled';

  const MOCK_USER = {
    userId: MOCK_USER_ID,
    email: 'fav@gogisise.com',
    nickname: '즐겨찾기러버',
    status: 'ACTIVE',
    phone: 'temp_fav_phone',
    createdAt: new Date(),
    updatedAt: new Date(),
    socialAccounts: [],
  };

  const MOCK_FAVORITE_ITEM = {
    favoriteId: 'fav_001',
    userId: MOCK_USER_ID,
    itemId: MOCK_ITEM_ID,
    item: {
      itemId: MOCK_ITEM_ID,
      species: 'BEEF',
      storageType: 'CHILLED',
      category: '한우(암소)',
      displayName: '한우 안심 1++',
      searchKeywords: '한우 안심',
      grade: '1++',
      currency: 'KRW',
      priceUnit: 'g',
      prices: [
        {
          price: 38000,
          previousPrice: 37000,
          changeAmount: 1000,
          trendStatus: 'UP',
        },
      ],
    },
  };

  // --- PrismaService Mock ---
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    favorite: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
        UsersModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 테스트용 JWT 발급 헬퍼
  const getTestJwt = () => {
    const jwt = new JwtService({ secret: TEST_JWT_SECRET });
    return jwt.sign({ sub: MOCK_USER_ID, email: MOCK_USER.email });
  };

  // =============================================
  // 테스트 1: GET /api/v1/users/me
  // =============================================
  describe('GET /api/v1/users/me', () => {
    it('[성공] JWT와 함께 요청 시 내 프로필을 반환해야 한다', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(MOCK_USER);
      const token = getTestJwt();

      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(MOCK_USER_ID);
      expect(res.body.data.nickname).toBe('즐겨찾기러버');
    });

    it('[실패] JWT 없이 요청 시 401 Unauthorized를 반환해야 한다', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me');

      expect(res.status).toBe(401);
    });
  });

  // =============================================
  // 테스트 2: GET /api/v1/users/me/favorites
  // =============================================
  describe('GET /api/v1/users/me/favorites', () => {
    it('[성공] 즐겨찾기 목록을 정확히 반환해야 한다', async () => {
      mockPrismaService.favorite.findMany.mockResolvedValueOnce([MOCK_FAVORITE_ITEM]);
      const token = getTestJwt();

      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me/favorites')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].itemId).toBe(MOCK_ITEM_ID);
      expect(res.body.data.items[0].displayName).toBe('한우 안심 1++');
    });

    it('[성공] 즐겨찾기가 없으면 빈 배열을 반환해야 한다', async () => {
      mockPrismaService.favorite.findMany.mockResolvedValueOnce([]);
      const token = getTestJwt();

      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me/favorites')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
    });
  });

  // =============================================
  // 테스트 3: POST /api/v1/users/me/favorites/:itemId
  // =============================================
  describe('POST /api/v1/users/me/favorites/:itemId', () => {
    it('[성공] 즐겨찾기 추가 시 204 No Content를 반환해야 한다', async () => {
      mockPrismaService.favorite.create.mockResolvedValueOnce(MOCK_FAVORITE_ITEM);
      const token = getTestJwt();

      const res = await request(app.getHttpServer())
        .post(`/api/v1/users/me/favorites/${MOCK_ITEM_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
      expect(mockPrismaService.favorite.create).toHaveBeenCalledTimes(1);
    });

    it('[성공] 이미 존재하는 즐겨찾기 추가(중복) 시에도 204를 반환해야 한다 (멱등성)', async () => {
      // Prisma P2002 Unique Constraint 에러를 모킹
      const duplicateError = new Error('Unique constraint failed');
      (duplicateError as any).code = 'P2002';
      mockPrismaService.favorite.create.mockRejectedValueOnce(duplicateError);
      const token = getTestJwt();

      const res = await request(app.getHttpServer())
        .post(`/api/v1/users/me/favorites/${MOCK_ITEM_ID}`)
        .set('Authorization', `Bearer ${token}`);

      // 중복이어도 에러 없이 204 처리 (멱등성 보장)
      expect(res.status).toBe(204);
    });
  });

  // =============================================
  // 테스트 4: DELETE /api/v1/users/me/favorites/:itemId
  // =============================================
  describe('DELETE /api/v1/users/me/favorites/:itemId', () => {
    it('[성공] 즐겨찾기 삭제 시 204 No Content를 반환해야 한다', async () => {
      mockPrismaService.favorite.deleteMany.mockResolvedValueOnce({ count: 1 });
      const token = getTestJwt();

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/users/me/favorites/${MOCK_ITEM_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
      expect(mockPrismaService.favorite.deleteMany).toHaveBeenCalledWith({
        where: { userId: MOCK_USER_ID, itemId: MOCK_ITEM_ID },
      });
    });
  });
});
