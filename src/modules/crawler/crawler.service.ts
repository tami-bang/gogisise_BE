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
import { IngestCategoryTreeDto } from './dto/category-tree.dto';
import { Prisma } from '@prisma/client';

const parseSourceDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
};

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly fastapiBase =
    process.env.FASTAPI_URL || 'http://fastapi:8000';
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
    this.circuitBreaker = new CircuitBreaker(
      this.publishToFastAPI.bind(this),
      breakerOptions,
    );
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

    this.logger.log(
      `파이썬 크롤러(crawl 모드) 작업 발행 중... requestId: ${requestId}`,
    );

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

  private async publishToFastAPI(
    payload: CrawlerTaskPayloadDto,
  ): Promise<void> {
    const url = `${this.fastapiBase}/crawler/crawl`;
    try {
      const response = await firstValueFrom(this.http.post(url, payload));
      this.logger.log(
        `Crawl task queued on FastAPI: taskId=${response.data.taskId}`,
      );
    } catch (err) {
      const e = err as AxiosError;
      // 실패 시 트랜잭션 외부에 기록될 수 있도록 따로 상태 업데이트 처리
      await this.prisma.crawlerTask
        .update({
          where: { id: payload.requestId },
          data: { status: 'FAILED' },
        })
        .catch((dbErr) => this.logger.error('Outbox 실패 마킹 실패', dbErr));

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
    this.logger.log(
      `Ingesting data for category: ${data.category_path} (${data.items.length} items)`,
    );

    const species = data.category_path.includes('돈육') ? 'PORK' : 'BEEF';
    const storageType = data.category_path.includes('냉동')
      ? 'FROZEN'
      : 'CHILLED';

    // DB의 @db.Date 에 맞게 오늘 날짜 자정 기준 Date 객체 생성
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uniqueItems = Array.from(
      new Map(data.items.map((item) => [item.goodsNo, item])).values(),
    ).sort((left, right) => left.goodsNo.localeCompare(right.goodsNo));
    const preparedItems = uniqueItems.map((item) => {
      const itemSpecies = item.metadata.species || species;
      const itemStorageType = item.metadata.storage_type || storageType;
      const manufacturedAt = parseSourceDate(item.metadata.mfg_date);
      const expiresAt = parseSourceDate(item.metadata.expiry_date);
      const searchKeywords = [item.name, item.brand, data.category_path]
        .filter(Boolean)
        .join(' ');

      return {
        ...item,
        itemSpecies,
        itemStorageType,
        manufacturedAt,
        expiresAt,
        searchKeywords,
      };
    });

    return await this.prisma.$transaction(
      async (tx) => {
        // 갱신 전에 기존 가격을 한 번만 읽어 previousPrice를 보존한다.
        const existingItems = await tx.marketItem.findMany({
          where: { goodsNo: { in: preparedItems.map((item) => item.goodsNo) } },
          select: { goodsNo: true, price: true },
        });
        const previousPriceByGoodsNo = new Map(
          existingItems.map((item) => [item.goodsNo, item.price]),
        );

        const marketItemRows = preparedItems.map(
          (item) => Prisma.sql`(
        gen_random_uuid(), ${item.goodsNo}, ${item.name}, ${item.brand},
        ${item.detail_url}, 'ACTIVE', ${item.price}, ${item.itemSpecies},
        ${item.itemStorageType}, ${data.category_path}, ${item.metadata.grade || null},
        ${item.metadata.age}, ${item.metadata.weight_kg},
        ${item.metadata.sale_price ?? null}, ${item.manufacturedAt},
        ${item.expiresAt}, ${item.searchKeywords}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )`,
        );

        const upsertedItems = await tx.$queryRaw<
          Array<{ itemId: string; goodsNo: string }>
        >(Prisma.sql`
        INSERT INTO "Market_Items" (
          "itemId", "goodsNo", "name", "brand", "detailUrl", "status",
          "price", "species", "storageType", "category", "grade", "ageMonths",
          "weightKg", "salePrice", "manufacturedAt", "expiresAt",
          "searchKeywords", "createdAt", "updatedAt"
        ) VALUES ${Prisma.join(marketItemRows)}
        ON CONFLICT ("goodsNo") DO UPDATE SET
          "name" = EXCLUDED."name",
          "brand" = EXCLUDED."brand",
          "detailUrl" = EXCLUDED."detailUrl",
          "status" = EXCLUDED."status",
          "price" = EXCLUDED."price",
          "species" = EXCLUDED."species",
          "storageType" = EXCLUDED."storageType",
          "category" = EXCLUDED."category",
          "grade" = EXCLUDED."grade",
          "ageMonths" = EXCLUDED."ageMonths",
          "weightKg" = EXCLUDED."weightKg",
          "salePrice" = EXCLUDED."salePrice",
          "manufacturedAt" = EXCLUDED."manufacturedAt",
          "expiresAt" = EXCLUDED."expiresAt",
          "searchKeywords" = EXCLUDED."searchKeywords",
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING "itemId", "goodsNo"
      `);

        const itemIdByGoodsNo = new Map(
          upsertedItems.map((item) => [item.goodsNo, item.itemId]),
        );
        const priceRows = preparedItems.map(
          (item) => Prisma.sql`(
        gen_random_uuid(), 
        -- 📌 한국어 주석: PostgreSQL에서 텍스트 문자열(text)을 UUID 타입 컬럼에 넣을 수 있도록 명시적으로 형변환(::uuid)을 해줍니다.
        ${itemIdByGoodsNo.get(item.goodsNo)}::uuid, 
        ${today},
        ${item.price}, ${previousPriceByGoodsNo.get(item.goodsNo) ?? null},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )`,
        );

        await tx.$executeRaw(Prisma.sql`
        INSERT INTO "Market_Item_Prices" (
          "priceId", "itemId", "marketDate", "price", "previousPrice",
          "createdAt", "updatedAt"
        ) VALUES ${Prisma.join(priceRows)}
        ON CONFLICT ("itemId", "marketDate") DO UPDATE SET
          "price" = EXCLUDED."price",
          "updatedAt" = CURRENT_TIMESTAMP
      `);
      },
      {
        maxWait: 5000,
        timeout: 30000,
      },
    );
  }

  async finalizeCrawl(goodsNos: string[]): Promise<number> {
    const uniqueGoodsNos = Array.from(new Set(goodsNos.filter(Boolean)));
    if (uniqueGoodsNos.length === 0) {
      throw new InternalServerErrorException(
        '수집 상품 목록이 비어 있어 단종 동기화를 중단했습니다.',
      );
    }

    const collectedGoodsNosJson = JSON.stringify(uniqueGoodsNos);
    const deactivated = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "Market_Items" AS item
      SET "status" = 'INACTIVE', "updatedAt" = CURRENT_TIMESTAMP
      WHERE item."status" = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(${collectedGoodsNosJson}::jsonb) AS collected("goodsNo")
          WHERE collected."goodsNo" = item."goodsNo"
        )
    `);

    this.logger.log(
      `Crawl finalized with ${uniqueGoodsNos.length} active goods; ${deactivated} items deactivated.`,
    );
    return deactivated;
  }

  async processCategoryTree(dto: IngestCategoryTreeDto) {
    this.logger.log(
      `Processing category tree sync with ${dto.categories?.length || 0} nodes.`,
    );

    return await this.prisma.$transaction(
      async (tx) => {
        await tx.categoryTree.deleteMany();

        if (dto.categories && dto.categories.length > 0) {
          await tx.categoryTree.createMany({
            data: dto.categories.map((c) => ({
              ctgNo: c.ctgNo,
              name: c.name,
              parentNo: c.parentNo,
              depth: c.depth,
              path: c.path,
            })),
          });
        }
      },
      {
        maxWait: 5000,
        timeout: 30000,
      },
    );
  }
}
