import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PrismaModule } from './core/prisma/prisma.module';
import { PrismaService } from './core/prisma/prisma.service';
import { MarketModule } from './modules/market/market.module';
import { MarketService } from './modules/market/market.service';

@Module({
  imports: [PrismaModule, MarketModule],
})
class StandaloneAppModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(StandaloneAppModule);

  console.log('🚀 기존 적재 데이터 재가공 스크립트를 시작합니다...');
  
  try {
    const prismaService = app.get(PrismaService);
    const marketService = app.get(MarketService);

    // 1. Raw_Records 테이블에 존재하는 모든 수집 데이터의 고유 날짜 추출 (Korean comment)
    console.log('1. 수집 기록이 존재하는 고유 날짜 목록을 조회 중...');
    const uniqueDates = await prismaService.$queryRaw<{ date: Date }[]>`
      SELECT DISTINCT DATE_TRUNC('day', "collectedAt") as date 
      FROM "Raw_Records"
      ORDER BY date ASC
    `;

    console.log(`조회 완료: 총 ${uniqueDates.length}개의 날짜가 식별되었습니다.`);

    // 2. 날짜별로 시세 데이터 순차적 재가공 (Korean comment)
    for (let i = 0; i < uniqueDates.length; i++) {
      const targetDate = new Date(uniqueDates[i].date);
      const dateString = targetDate.toISOString().split('T')[0];
      
      console.log(`[${i + 1}/${uniqueDates.length}] ${dateString} 시세 데이터 가공 시작...`);
      await marketService.processRawRecordsIntoMarketItems(targetDate);
    }
    
    console.log('✨ 모든 시세 데이터 재가공이 성공적으로 완료되었습니다!');
  } catch (err) {
    console.error('재가공 중 오류 발생:', err);
  } finally {
    await app.close();
  }
}

bootstrap();
