import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PrismaModule } from './core/prisma/prisma.module';
import { CrawlerModule } from './modules/crawler/crawler.module';
import { CrawlerService } from './modules/crawler/crawler.service';
import { InternalModule } from './modules/internal/internal.module';
import { InternalService } from './modules/internal/internal.service';
import { MarketModule } from './modules/market/market.module';
import { MarketService } from './modules/market/market.service';

@Module({
  imports: [PrismaModule, CrawlerModule, InternalModule, MarketModule],
})
class StandaloneAppModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(StandaloneAppModule);

  console.log('🚀 수동 크롤링 스캔을 시작합니다...');
  
  try {
    const crawlerService = app.get(CrawlerService);
    const internalService = app.get(InternalService);
    const marketService = app.get(MarketService);

    console.log('1. 전체 크롤링 강제 실행 (변동 여부 무시)...');
    const outcome = await crawlerService.runFullCrawl();

    if (outcome.records && outcome.records.length > 0) {
      console.log(`2. ${outcome.records.length}건 Bulk Upsert 시작...`);
      const chunkSize = 100;
      let totalInserted = 0;
      for (let i = 0; i < outcome.records.length; i += chunkSize) {
        const chunk = outcome.records.slice(i, i + chunkSize);
        const result = await internalService.createRawRecordsBulk({ records: chunk });
        totalInserted += result.insertedCount;
      }
      console.log(`Bulk Upsert 완료: ${totalInserted}건 삽입`);
      
      console.log('3. MarketService 가공 시작...');
      await marketService.processRawRecordsIntoMarketItems();
      console.log('가공 완료!');
    } else {
      console.log('수집된 데이터가 없습니다.');
    }
  } catch (err) {
    console.error('크롤링 중 에러 발생:', err);
  } finally {
    await app.close();
  }
}

bootstrap();
