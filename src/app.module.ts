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

@Module({
  imports: [
    ScheduleModule.forRoot(), // Cron 스케줄러 기능 활성화
    PrismaModule,
    RedisModule, // 전역(@Global)으로 등록: 모든 모듈에서 RedisService를 자유롭게 주입 가능
    AuthModule,
    UsersModule,
    MarketModule,
    InternalModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
