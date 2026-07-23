import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from '../../core/strategies/jwt.strategy';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import { GlobalExceptionFilter } from '../../core/filters/global-exception.filter';
import * as bcryptjs from 'bcryptjs';

/**
 * Auth 모듈 통합 테스트
 *
 * [테스트 전략]
 * - AuthModule을 직접 import하는 대신, 모듈 요소(Controller, Service, Strategy 등)를
 *   직접 providers에 나열하여 완전한 의존성 제어를 합니다.
 * - PrismaService와 RedisService는 Mock으로 대체하여 실제 DB/Redis 없이 테스트합니다.
 * - 식당의 서빙(HTTP) 흐름만 검증하고 주방(DB/Redis)은 가짜로 대체하는 방식입니다.
 */
describe('Auth Module (통합 테스트)', () => {
  let app: INestApplication;

  const TEST_JWT_SECRET = 'test_jwt_secret_for_auth';

  // --- Mock 유저 데이터 ---
  const MOCK_USER = {
    userId: 'usr_test_001',
    email: 'test@gogisise.com',
    password: '',
    nickname: '고기러버',
    status: 'ACTIVE',
    phone: 'temp_test_phone',
    createdAt: new Date(),
    updatedAt: new Date(),
    socialAccounts: [],
  };

  // --- PrismaService Mock ---
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    userSocialAccount: {
      findFirst: jest.fn(),
    },
  };

  // --- RedisService Mock (메모리 Map으로 흉내) ---
  const mockRedisStore = new Map<string, string>();
  const mockRedisService = {
    get: jest.fn((key: string) => Promise.resolve(mockRedisStore.get(key) || null)),
    set: jest.fn((key: string, value: string) => {
      mockRedisStore.set(key, value);
      return Promise.resolve();
    }),
    del: jest.fn((key: string) => {
      mockRedisStore.delete(key);
      return Promise.resolve();
    }),
    keys: jest.fn((pattern: string) => {
      const prefix = pattern.replace('*', '');
      return Promise.resolve(
        Array.from(mockRedisStore.keys()).filter(k => k.startsWith(prefix))
      );
    }),
  };

  beforeAll(async () => {
    MOCK_USER.password = await bcryptjs.hash('TestPass123!', 10);
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        // 실제 PrismaService 대신 Mock을 주입
        { provide: PrismaService, useValue: mockPrismaService },
        // 실제 RedisService 대신 Mock을 주입
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    app.use(require('cookie-parser')());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisStore.clear();
  });

  // =============================================
  // 테스트 1: 회원가입
  // =============================================
  describe('POST /api/v1/auth/signup', () => {
    it('[성공] 올바른 형식으로 회원가입 시 201과 userId를 반환해야 한다', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.user.create.mockResolvedValueOnce(MOCK_USER);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({ email: 'test@gogisise.com', password: 'TestPass123!', nickname: '고기러버', phone: '010-1234-5678' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test@gogisise.com');
    });

    it('[실패] 중복 이메일로 회원가입 시 409 Conflict를 반환해야 한다', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(MOCK_USER);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({ email: 'test@gogisise.com', password: 'TestPass123!', nickname: '고기러버', phone: '010-1234-5678' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('[실패] 짧은 비밀번호(7자 이하)로 회원가입 시 400 Bad Request를 반환해야 한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({ email: 'test@gogisise.com', password: 'short', nickname: '고기러버', phone: '010-1234-5678' });

      expect(res.status).toBe(400);
    });
  });

  // =============================================
  // 테스트 2: 로그인 및 JWT 발급
  // =============================================
  describe('POST /api/v1/auth/login', () => {
    it('[성공] 올바른 자격증명으로 로그인 시 accessToken이 발급되어야 한다', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(MOCK_USER);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@gogisise.com', password: 'TestPass123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(typeof res.body.data.accessToken).toBe('string');
    });

    it('[성공] autoLogin=true 시 응답 Set-Cookie 헤더에 refreshToken이 설정되어야 한다', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(MOCK_USER);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@gogisise.com', password: 'TestPass123!', autoLogin: true });

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'] as string[] | string;
      const cookieArr = Array.isArray(cookies) ? cookies : [cookies];
      expect(cookieArr.some(c => c.startsWith('refreshToken='))).toBe(true);
    });

    it('[실패] 잘못된 비밀번호로 로그인 시 401 Unauthorized를 반환해야 한다', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(MOCK_USER);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@gogisise.com', password: 'WrongPassword!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('[실패] 존재하지 않는 이메일로 로그인 시 401 Unauthorized를 반환해야 한다', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nouser@gogisise.com', password: 'TestPass123!' });

      expect(res.status).toBe(401);
    });
  });

  // =============================================
  // 테스트 3: JWT 보호 엔드포인트 (인증 미들웨어 검증)
  // =============================================
  describe('POST /api/v1/auth/logout (JWT 보호 엔드포인트)', () => {
    it('[실패] JWT 없이 보호 엔드포인트 접근 시 401 Unauthorized를 반환해야 한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('[성공] 유효한 JWT와 함께 로그아웃 요청 시 200 OK를 반환해야 한다', async () => {
      // 테스트용 유효 JWT 직접 생성
      const jwtSvc = new JwtService({ secret: TEST_JWT_SECRET });
      const token = jwtSvc.sign({ sub: MOCK_USER.userId, email: MOCK_USER.email });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
