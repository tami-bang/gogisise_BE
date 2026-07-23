import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';

// RedisService: 마치 서버 내부의 '빠른 메모리 메모장' 관리자와 같습니다.
// 일반 DB는 느린 하드디스크 창고지만, Redis는 RAM 위에서 동작하는 초고속 메모장입니다.
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  onModuleInit() {
    const host = process.env.REDIS_HOST || '';
    const isDummy = host.includes('your-production-redis-host') || !host;

    // 💡 [한글 주석] 호스트가 지정되지 않았거나 더미 주소일 경우 연결을 시도하지 않고 즉시 비활성화 처리
    if (isDummy) {
      this.logger.warn('⚠️ Redis 호스트가 비어있거나 더미 주소이므로 비활성화(Disable) 처리하고 Fallback(우회) 모드로 작동합니다.');
      this.client = null;
      return;
    }

    try {
      // 💡 [한글 주석] Vercel 서버리스의 20초 대기 락을 해소하기 위해 타임아웃 1초, 재시도 1회로 극소화 설정 주입
      this.client = new Redis({
        host,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        connectTimeout: 1000, // 1초 연결 대기 타임아웃
        maxRetriesPerRequest: 1, // 실패 시 빠른 포기 및 바이패스
        retryStrategy: (times) => {
          if (times > 1) {
            return null; // 1회 실패 후 추가 재시도 포기
          }
          return 50; // 50ms 후 1회만 재시도
        },
      });

      this.client.on('connect', () => {
        this.logger.log('✅ Redis 연결 성공');
      });

      this.client.on('error', (err) => {
        this.logger.error('❌ Redis 연결 에러 (Fallback 모드로 계속 진행합니다)', err);
      });
    } catch (e) {
      this.client = null;
      this.logger.error('❌ Redis 초기화 중 런타임 에러 발생 (Fallback 모드로 계속 진행합니다)', e);
    }
  }

  onModuleDestroy() {
    // NestJS 앱이 종료될 때 Redis 연결을 깔끔하게 끊음
    if (this.client) {
      this.client.quit();
    }
  }

  // 💡 [한글 주석] 레디스 장애 상황 시 애플리케이션 전체가 마비되는 것을 막기 위해 모든 API에 널 체크 및 예외 Fallback 적용

  // Redis에서 키로 값 조회
  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch (err) {
      this.logger.error(`[Redis Fallback] get failed for key: ${key}`, err);
      return null;
    }
  }

  // Redis에 키-값 저장 (ttlSeconds: 만료 시간(초) 지정)
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      if (ttlSeconds) {
        // EX 옵션: 해당 초 뒤에 자동으로 삭제 (Refresh Token 만료 처리용)
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      this.logger.error(`[Redis Fallback] set failed for key: ${key}`, err);
    }
  }

  // Redis에서 키 삭제 (로그아웃 시 토큰 제거)
  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.error(`[Redis Fallback] del failed for key: ${key}`, err);
    }
  }

  // 특정 패턴과 일치하는 모든 키 조회 (유저 세션 전체 무효화 시 사용)
  async keys(pattern: string): Promise<string[]> {
    if (!this.client) return [];
    try {
      return await this.client.keys(pattern);
    } catch (err) {
      this.logger.error(`[Redis Fallback] keys failed for pattern: ${pattern}`, err);
      return [];
    }
  }

  // Redis List에 데이터 삽입 (Analytics 큐잉 용도)
  async lpush(key: string, value: string): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.lpush(key, value);
    } catch (err) {
      this.logger.error(`[Redis Fallback] lpush failed for key: ${key}`, err);
      return 0;
    }
  }

  // Redis List의 전체 데이터 가져오기 (0 ~ -1은 전체를 의미)
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.client) return [];
    try {
      return await this.client.lrange(key, start, stop);
    } catch (err) {
      this.logger.error(`[Redis Fallback] lrange failed for key: ${key}`, err);
      return [];
    }
  }

  // Redis List의 데이터를 잘라내기 (남길 범위 지정)
  async ltrim(key: string, start: number, stop: number): Promise<string> {
    if (!this.client) return 'OK';
    try {
      return await this.client.ltrim(key, start, stop);
    } catch (err) {
      this.logger.error(`[Redis Fallback] ltrim failed for key: ${key}`, err);
      return 'OK';
    }
  }

  // Redis Transaction 파이프라인 반환 (원자적 작업 용도)
  multi() {
    if (!this.client) {
      // 💡 [한글 주석] client가 없을 시 트랜잭션 호출 부분의 널 에러 차단을 위해 mock pipeline 반환
      return {
        exec: () => Promise.resolve([]),
      } as any;
    }
    try {
      return this.client.multi();
    } catch (err) {
      this.logger.error('[Redis Fallback] multi failed', err);
      return {
        exec: () => Promise.resolve([]),
      } as any;
    }
  }
}
