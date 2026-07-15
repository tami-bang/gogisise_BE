import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrawlerService } from '../crawler/crawler.service';
import { InternalService } from '../internal/internal.service';
import { MarketService } from '../market/market.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly crawlerService: CrawlerService,
    private readonly internalService: InternalService,
    private readonly marketService: MarketService,
  ) {}

  // 매일 10:00, 14:00, 18:00에 실행 (KST 기준)
  // Cron 0 10,14,18 * * * (KST 타임존은 서버 시간 또는 환경 설정에 따름)
  @Cron('0 10,14,18 * * *', { timeZone: 'Asia/Seoul' })
  async handleHybridMilestoneScan() {
    this.logger.log('하이브리드 마일스톤 스캔 시작...');

    try {
      // 1. 카테고리별 최신 카운트 가져오기
      const latestCounts = await this.crawlerService.peekLatestMetadata();
      const savedCounts = await this.crawlerService.getLastTotalCounts();

      // 2. 변경 여부 확인 (하나라도 다르면 변경으로 간주)
      let hasChanged = false;
      if (!savedCounts) {
        hasChanged = true;
      } else {
        for (const [ctgNo, count] of Object.entries(latestCounts)) {
          if (savedCounts[ctgNo] !== count) {
            hasChanged = true;
            this.logger.log(`카테고리 ${ctgNo} 개수 변경 감지: ${savedCounts[ctgNo]} -> ${count}`);
            break;
          }
        }
      }

      if (!hasChanged) {
        this.logger.log('데이터 변동 없음. 전체 크롤링 스킵.');
        await this.crawlerService.updateLastCheckedAt();
        return;
      }

      // 3. 변동 시 전체 크롤링 실행
      this.logger.log('데이터 변동 확인. 전체 수집 실행...');
      const outcome = await this.crawlerService.runFullCrawl();

      // 4. BE DB에 Bulk Insert (멱등성 보장)
      if (outcome.records && outcome.records.length > 0) {
        this.logger.log(`${outcome.records.length}건 Bulk Upsert 시작...`);
        // InternalService expects chunks up to 100
        const chunkSize = 100;
        let totalInserted = 0;
        for (let i = 0; i < outcome.records.length; i += chunkSize) {
          const chunk = outcome.records.slice(i, i + chunkSize);
          const result = await this.internalService.createRawRecordsBulk({ records: chunk });
          totalInserted += result.insertedCount;
        }
        this.logger.log(`Bulk Upsert 완료: ${totalInserted}건 삽입 (중복 제외)`);
        
        // 5. MarketService를 통한 데이터 가공 파이프라인 트리거
        // 방금 수집한 날짜를 기준으로 가공 실행 (또는 오늘 날짜 전체)
        await this.marketService.processRawRecordsIntoMarketItems();
      }

      // 6. 저장소(TotalCounts) 갱신
      await this.crawlerService.saveLastTotalCounts(latestCounts);
      this.logger.log('하이브리드 마일스톤 스캔 완료');

    } catch (error) {
      this.logger.error('마일스톤 스캔 실패', error);
    }
  }
}
