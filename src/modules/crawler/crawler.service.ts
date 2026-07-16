import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { AxiosError } from 'axios';
import CircuitBreaker = require('opossum');
import { CrawlerTaskPayloadDto } from './dto/crawler-task.dto';
import { CrawlerIngestDto } from './dto/crawler-ingest.dto';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly fastapiBase = process.env.FASTAPI_URL || 'http://fastapi:8000';
  private readonly circuitBreaker: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
  ) {
    const breakerOptions = {
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    };
    this.circuitBreaker = new CircuitBreaker(this.publishToFastAPI.bind(this), breakerOptions);
    this.circuitBreaker.fallback(() => {
      this.logger.warn('FastAPI circuit open – fallback engaged');
      throw new InternalServerErrorException('FastAPI unavailable');
    });
  }

  async peekLatestMetadata(): Promise<Record<string, number>> {
    const url = `${this.fastapiBase}/crawler/peek`;
    try {
      this.logger.log('파이썬 크롤러(peek 모드) 호출 중...');
      const response = await firstValueFrom(this.http.get(url));
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Unknown peek error');
      }
      return response.data.data as Record<string, number>;
    } catch (err) {
      const e = err as AxiosError;
      this.logger.error('크롤러 peek 호출 실패', e.message);
      throw new InternalServerErrorException('Peek failed');
    }
  }

  async runFullCrawl(categories: string[] = []): Promise<any> {
    const requestId = uuidv4();
    const payload: CrawlerTaskPayloadDto = { requestId, categories };

    this.logger.log(`파이썬 크롤러(crawl 모드) 작업 발행 중... requestId: ${requestId}`);

    // Prisma $transaction을 활용하여 DB 레코드 생성 후 Redis 발행 진행
    await this.prisma.$transaction(async (tx) => {
      await tx.crawlerTask.create({
        data: {
          id: requestId,
          payload: payload as any,
          status: 'PENDING',
        },
      });

      // 여기서 Circuit Breaker를 거쳐 FastAPI로 HTTP POST 수행
      await this.circuitBreaker.fire(payload);
    });

    // 트랜잭션 정상 종료 시 퍼블리시 성공으로 마킹
    await this.prisma.crawlerTask.update({
      where: { id: requestId },
      data: { status: 'PUBLISHED' },
    });

    return { requestId };
  }

  private async publishToFastAPI(payload: CrawlerTaskPayloadDto): Promise<void> {
    const url = `${this.fastapiBase}/crawler/crawl`;
    try {
      const response = await firstValueFrom(this.http.post(url, payload));
      this.logger.log(`Crawl task queued on FastAPI: taskId=${response.data.taskId}`);
    } catch (err) {
      const e = err as AxiosError;
      // 실패 시 트랜잭션 외부에 기록될 수 있도록 따로 상태 업데이트 처리
      await this.prisma.crawlerTask.update({
        where: { id: payload.requestId },
        data: { status: 'FAILED' },
      }).catch(dbErr => this.logger.error('Outbox 실패 마킹 실패', dbErr));
      
      this.logger.error('Failed to enqueue crawl on FastAPI', e.message);
      throw e; // Circuit breaker 카운트 증가
    }
  }

  async getLastTotalCounts(): Promise<Record<string, number> | null> {
    const meta = await this.prisma.crawlerMetadata.findUnique({
      where: { id: 1 },
    });
    return meta ? (meta.lastTotalCounts as Record<string, number>) : null;
  }

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

  async updateLastCheckedAt() {
    await this.prisma.crawlerMetadata.upsert({
      where: { id: 1 },
      update: { lastCheckedAt: new Date() },
      create: { id: 1, lastTotalCounts: {} },
    });
  }

  async processIngestedData(data: CrawlerIngestDto) {
    this.logger.log(`Ingesting data for category: ${data.category_path} (${data.items.length} items)`);
    
    // DB의 @db.Date 에 맞게 오늘 날짜 자정 기준 Date 객체 생성
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await this.prisma.$transaction(async (tx) => {
      for (const item of data.items) {
        // 1. 기존 상품 Upsert
        const marketItem = await tx.marketItem.upsert({
          where: { goodsNo: item.goodsNo },
          update: { 
            price: item.price, 
            updatedAt: new Date(),
            status: 'ACTIVE'
          },
          create: {
            goodsNo: item.goodsNo,
            name: item.name,
            price: item.price,
            category: data.category_path,
            brand: item.brand,
            detailUrl: item.detail_url,
            status: 'ACTIVE'
          },
        });

        // 2. 가격 이력(Market_Item_Prices) 적재 (오늘 날짜로 데이터 없으면 생성)
        await tx.marketItemPrice.upsert({
          where: {
            itemId_marketDate: {
              itemId: marketItem.itemId,
              marketDate: today,
            }
          },
          update: { price: item.price },
          create: {
            itemId: marketItem.itemId,
            marketDate: today,
            price: item.price,
            previousPrice: marketItem.price // 기존 가격을 이전 가격으로 임시 저장
          }
        });
      }
    }, {
      maxWait: 10000, // 10 seconds
      timeout: 120000 // 120 seconds
    });
  }
}
