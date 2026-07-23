import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MarketModule } from './modules/market/market.module';
import { InternalModule } from './modules/internal/internal.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { RedisModule } from './core/redis/redis.module'; // Redis 전역 모듈 추가
import { CrawlerModule } from './modules/crawler/crawler.module';
import { TasksModule } from './modules/tasks/tasks.module';

const imports = [
  ScheduleModule.forRoot(), // Cron 스케줄러 기능 활성화
  PrismaModule,
  RedisModule, // 전역(@Global)으로 등록: 모든 모듈에서 RedisService를 자유롭게 주입 가능
  AuthModule,
  UsersModule,
  MarketModule,
  InternalModule,
  AnalyticsModule,
];

// 💡 [한글 주석] Vercel 서버리스 환경(API 요청 인스턴스)에서는 백그라운드 크롤러 및 주기적 태스크 모듈을 로드하지 않고
// 로컬/배치 노드 환경에서만 동작하게 제약하여 서버리스의 냉간 시동(Cold Start) 속도를 비약적으로 단축시킵니다.
if (!process.env.VERCEL) {
  imports.push(CrawlerModule, TasksModule);
}

@Module({
  imports,
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
