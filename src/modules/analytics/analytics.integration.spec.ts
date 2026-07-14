import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { JwtStrategy } from '../../core/strategies/jwt.strategy';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import { GlobalExceptionFilter } from '../../core/filters/global-exception.filter';

/**
 * Analytics 모듈 통합 테스트
 *
 * [테스트 전략]
 * - Redis List 구조를 인메모리 JS 배열로 Mocking합니다.
 * - Cron 스케줄러의 `processViewLogs`를 직접 호출하여 1분 기다리지 않고 DB Bulk Insert를 검증합니다.
 */
describe('Analytics Module (통합 테스트)', () => {
  let app: INestApplication;
  let analyticsService: AnalyticsService;

  const TEST_JWT_SECRET = 'test_jwt_secret_for_analytics';
  const MOCK_USER_ID = 'usr_analytics_test';
  const MOCK_USER_EMAIL = 'analytics@gogisise.com';

  // --- Redis List를 JS 배열로 Mocking ---
  const mockRedisLists = new Map<string, string[]>();
  const mockRedisService = {
    lpush: jest.fn((key: string, value: string) => {
      const list = mockRedisLists.get(key) || [];
      list.unshift(value);
      mockRedisLists.set(key, list);
      return Promise.resolve(list.length);
    }),
    lrange: jest.fn((key: string, start: number, stop: number) => {
      const list = mockRedisLists.get(key) || [];
      return Promise.resolve(stop === -1 ? list.slice(start) : list.slice(start, stop + 1));
    }),
    ltrim: jest.fn((key: string, start: number, _stop: number) => {
      const list = mockRedisLists.get(key) || [];
      mockRedisLists.set(key, list.slice(start));
      return Promise.resolve('OK');
    }),
  };

  // --- PrismaService Mock ---
  const mockPrismaService = {
    userViewsLog: {
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    marketItem: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [AnalyticsController],
      providers: [
        AnalyticsService,
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    analyticsService = module.get<AnalyticsService>(AnalyticsService);
  });

  afterAll(async () => { await app.close(); });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisLists.clear();
    // 기본 resolved 값 재설정
    mockPrismaService.userViewsLog.createMany.mockResolvedValue({ count: 0 });
    mockPrismaService.userViewsLog.groupBy.mockResolvedValue([]);
    mockPrismaService.marketItem.findMany.mockResolvedValue([]);
  });

  const getTestJwt = () =>
    new JwtService({ secret: TEST_JWT_SECRET }).sign({ sub: MOCK_USER_ID, email: MOCK_USER_EMAIL });

  // =============================================
  // 테스트 1: POST /api/v1/analytics/view - Redis 버퍼링
  // =============================================
  describe('POST /api/v1/analytics/view', () => {
    it('[성공] 인증 토큰과 함께 요청 시 Redis에 로그가 적재되고 200 OK를 반환해야 한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/analytics/view')
        .set('Authorization', `Bearer ${getTestJwt()}`)
        .send({ itemId: 'beef-tenderloin-1pp-chilled' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockRedisService.lpush).toHaveBeenCalledTimes(1);
    });

    it('[실패] JWT 없이 요청 시 401 Unauthorized를 반환해야 한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/analytics/view')
        .send({ itemId: 'beef-tenderloin-1pp-chilled' });

      expect(res.status).toBe(401);
    });

    it('[성공] Redis에 저장된 로그가 올바른 userId와 itemId를 포함해야 한다', async () => {
      const testItemId = 'pork-belly-chilled';
      await request(app.getHttpServer())
        .post('/api/v1/analytics/view')
        .set('Authorization', `Bearer ${getTestJwt()}`)
        .send({ itemId: testItemId });

      const [calledKey, calledValue] = (mockRedisService.lpush as jest.Mock).mock.calls[0];
      expect(calledKey).toBe('analytics:view_queue');
      const parsed = JSON.parse(calledValue);
      expect(parsed.userId).toBe(MOCK_USER_ID);
      expect(parsed.itemId).toBe(testItemId);
    });
  });

  // =============================================
  // 테스트 2: Cron 스케줄러 - Redis → DB Bulk Insert
  // =============================================
  describe('processViewLogs (Cron 스케줄러 로직)', () => {
    it('[성공] Redis에 쌓인 로그가 Prisma createMany로 DB에 Bulk Insert되어야 한다', async () => {
      mockRedisLists.set('analytics:view_queue', [
        JSON.stringify({ logId: 'log_01', userId: MOCK_USER_ID, itemId: 'beef-01', viewedAt: new Date().toISOString() }),
        JSON.stringify({ logId: 'log_02', userId: MOCK_USER_ID, itemId: 'pork-01', viewedAt: new Date().toISOString() }),
      ]);

      await analyticsService.processViewLogs();

      expect(mockPrismaService.userViewsLog.createMany).toHaveBeenCalledTimes(1);
      const callArgs = (mockPrismaService.userViewsLog.createMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.data).toHaveLength(2);
      expect(callArgs.data[0].itemId).toBe('beef-01');
      expect(mockRedisService.ltrim).toHaveBeenCalledTimes(1);
    });

    it('[성공] Redis 큐가 비어있으면 DB 호출 없이 스킵해야 한다', async () => {
      await analyticsService.processViewLogs();
      expect(mockPrismaService.userViewsLog.createMany).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // 테스트 3: GET /api/v1/analytics/frequent-items
  // =============================================
  describe('GET /api/v1/analytics/frequent-items', () => {
    it('[성공] 인기 품목 목록(viewCount 포함)을 반환해야 한다', async () => {
      mockPrismaService.userViewsLog.groupBy.mockResolvedValueOnce([
        { itemId: 'beef-01', _count: { itemId: 10 } },
        { itemId: 'pork-01', _count: { itemId: 5 } },
      ]);
      mockPrismaService.marketItem.findMany.mockResolvedValueOnce([
        {
          itemId: 'beef-01', displayName: '한우 안심 1++', category: '한우(암소)',
          species: 'BEEF', currency: 'KRW', priceUnit: 'g',
          prices: [{ price: 38000, previousPrice: 37000, changeAmount: 1000, trendStatus: 'UP' }],
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/frequent-items');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items[0].viewCount).toBe(10);
      expect(res.body.data.items[0].displayName).toBe('한우 안심 1++');
    });
  });
});
