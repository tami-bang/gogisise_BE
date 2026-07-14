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
  private client: Redis;

  onModuleInit() {
    // NestJS 앱이 시작될 때 Redis 서버에 접속 연결을 맺음
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    });

    this.client.on('connect', () => {
      this.logger.log('✅ Redis 연결 성공');
    });

    this.client.on('error', (err) => {
      this.logger.error('❌ Redis 연결 에러', err);
    });
  }

  onModuleDestroy() {
    // NestJS 앱이 종료될 때 Redis 연결을 깔끔하게 끊음
    this.client.quit();
  }

  // Redis에서 키로 값 조회
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  // Redis에 키-값 저장 (ttlSeconds: 만료 시간(초) 지정)
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      // EX 옵션: 해당 초 뒤에 자동으로 삭제 (Refresh Token 만료 처리용)
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  // Redis에서 키 삭제 (로그아웃 시 토큰 제거)
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  // 특정 패턴과 일치하는 모든 키 조회 (유저 세션 전체 무효화 시 사용)
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  // Redis List에 데이터 삽입 (Analytics 큐잉 용도)
  async lpush(key: string, value: string): Promise<number> {
    return this.client.lpush(key, value);
  }

  // Redis List의 전체 데이터 가져오기 (0 ~ -1은 전체를 의미)
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  // Redis List의 데이터를 잘라내기 (남길 범위 지정)
  async ltrim(key: string, start: number, stop: number): Promise<string> {
    return this.client.ltrim(key, start, stop);
  }

  // Redis Transaction 파이프라인 반환 (원자적 작업 용도)
  multi() {
    return this.client.multi();
  }
}
