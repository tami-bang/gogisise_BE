import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CrawlerService } from '../crawler/crawler.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly crawlerService: CrawlerService,
  ) {}

  @Cron('0 10,14,18 * * *', { timeZone: 'Asia/Seoul' })
  async handleHybridMilestoneScan() {
    this.logger.log('Hybrid milestone scan start');

    try {
      const latestCounts = await this.crawlerService.peekLatestMetadata();
      const savedCounts = await this.crawlerService.getLastTotalCounts();

      let hasChanged = false;
      const changedCategories: string[] = [];

      if (!savedCounts) {
        hasChanged = true;
      } else {
        for (const [ctgNo, count] of Object.entries(latestCounts)) {
          if (savedCounts[ctgNo] !== count) {
            hasChanged = true;
            changedCategories.push(ctgNo);
            this.logger.log(`카테고리 ${ctgNo} 개수 변경 감지: ${savedCounts[ctgNo]} -> ${count}`);
          }
        }
      }

      if (!hasChanged) {
        this.logger.log('데이터 변동 없음. 전체 크롤링 스킵.');
        await this.crawlerService.updateLastCheckedAt();
        return;
      }

      this.logger.log('데이터 변동 확인. 큐에 크롤링 작업 발행 중...');
      const { requestId } = await this.crawlerService.runFullCrawl(changedCategories);
      this.logger.log(`크롤링 작업 발행 완료. requestId=${requestId}`);

      await this.crawlerService.saveLastTotalCounts(latestCounts);
      this.logger.log('하이브리드 마일스톤 스캔(발행 단계) 완료');
    } catch (error) {
      this.logger.error('마일스톤 스캔 실패', error);
    }
  }
}
