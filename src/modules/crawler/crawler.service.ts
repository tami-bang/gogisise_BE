import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  // 파이썬 실행 경로 (프로젝트 루트 기준)
  private readonly pythonScriptPath = path.resolve(process.cwd(), 'src/crawler/python/run.py');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * [Phase 2] 카테고리별 상품 총 개수(totalCount) 조회
   */
  async peekLatestMetadata(): Promise<Record<string, number>> {
    try {
      this.logger.log('파이썬 크롤러(peek 모드) 실행 중...');
      const { stdout } = await execAsync(`python3 "${this.pythonScriptPath}" --action peek`);
      
      const result = JSON.parse(stdout);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data as Record<string, number>;
    } catch (error) {
      this.logger.error('크롤러 peek 실행 실패', error);
      throw error;
    }
  }

  /**
   * 전체 카테고리 크롤링 실행
   */
  async runFullCrawl(): Promise<any> {
    try {
      this.logger.log('파이썬 크롤러(crawl 모드) 실행 중...');
      // 최대 버퍼 사이즈 증가 (결과가 클 수 있음)
      const { stdout } = await execAsync(`python3 "${this.pythonScriptPath}" --action crawl`, { maxBuffer: 1024 * 1024 * 50 });
      
      const result = JSON.parse(stdout);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    } catch (error) {
      this.logger.error('크롤러 crawl 실행 실패', error);
      throw error;
    }
  }

  /**
   * 최근 저장된 totalCounts 가져오기
   */
  async getLastTotalCounts(): Promise<Record<string, number> | null> {
    const meta = await this.prisma.crawlerMetadata.findUnique({
      where: { id: 1 },
    });
    return meta ? (meta.lastTotalCounts as Record<string, number>) : null;
  }

  /**
   * 새로운 totalCounts 상태 저장
   */
  async saveLastTotalCounts(counts: Record<string, number>) {
    await this.prisma.crawlerMetadata.upsert({
      where: { id: 1 },
      update: {
        lastTotalCounts: counts,
        lastUpdatedAt: new Date(),
        lastCheckedAt: new Date(),
      },
      create: {
        id: 1,
        lastTotalCounts: counts,
      },
    });
  }

  /**
   * 체크한 시점만 업데이트
   */
  async updateLastCheckedAt() {
    await this.prisma.crawlerMetadata.upsert({
      where: { id: 1 },
      update: { lastCheckedAt: new Date() },
      create: { id: 1, lastTotalCounts: {} },
    });
  }
}
