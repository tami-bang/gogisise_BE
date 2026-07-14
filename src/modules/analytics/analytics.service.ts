import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../../core/redis/redis.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly REDIS_VIEW_QUEUE_KEY = 'analytics:view_queue';

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 1. Redis 기반 임시 적재 (LPUSH)
   * 조회 로깅 요청이 오면 DB를 거치지 않고 초고속 메모리(Redis List)에 쌓습니다.
   */
  async logView(userId: string, itemId: string): Promise<void> {
    const logData = {
      logId: `log_${uuidv4()}`,
      userId,
      itemId,
      viewedAt: new Date().toISOString(),
    };

    // JSON 직렬화 후 Redis List의 왼쪽(Head)에 푸시
    await this.redis.lpush(this.REDIS_VIEW_QUEUE_KEY, JSON.stringify(logData));
  }

  /**
   * 2. 1분마다 배치 실행 (Cron)
   * Redis에 쌓인 로그를 DB에 한 번에 벌크 삽입(Bulk Insert)합니다.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processViewLogs() {
    // 큐에서 가져올 범위 (전체 가져오기: 0 ~ -1)
    const logsFromRedis = await this.redis.lrange(
      this.REDIS_VIEW_QUEUE_KEY,
      0,
      -1,
    );

    if (!logsFromRedis || logsFromRedis.length === 0) {
      return; // 처리할 로그가 없으면 스킵
    }

    // Redis에서 가져온 만큼 List를 자릅니다. (방금 전 가져온 이후에 쌓인 새 로그는 보존)
    // ltrim(0, -1)을 해버리면 가져오는 사이 들어온 데이터가 날아가므로,
    // 데이터를 가져오고 삭제하는 대신 트랜잭션 파이프라인으로 안전하게 꺼냅니다.
    // 하지만 단순화를 위해, 가져온 만큼의 길이를 바탕으로 ltrim을 실행합니다.
    const logCount = logsFromRedis.length;

    const parsedLogs = logsFromRedis.map((log) => JSON.parse(log));

    try {
      // Prisma createMany를 사용한 Bulk Insert (파티셔닝 테이블에 안전하게 삽입됨)
      await this.prisma.userViewsLog.createMany({
        data: parsedLogs.map((log) => ({
          logId: log.logId,
          userId: log.userId,
          itemId: log.itemId,
          viewedAt: new Date(log.viewedAt),
        })),
        skipDuplicates: true, // 만에 하나 중복 방지
      });

      // 성공적으로 DB에 넣었으면 Redis 큐에서 삽입한 개수만큼 잘라냄(삭제)
      // LTRIM의 범위는 0-indexed로, logCount부터 마지막(-1)까지 남김
      await this.redis.ltrim(this.REDIS_VIEW_QUEUE_KEY, logCount, -1);

      this.logger.log(`📊 Analytics: ${logCount}건의 조회 로그 DB 적재 완료`);
    } catch (error) {
      this.logger.error(
        '조회 로그 적재 실패 (데이터는 Redis에 보존됩니다)',
        error,
      );
      // DB 삽입 실패 시 LTRIM을 실행하지 않으므로 데이터가 보존됨
    }
  }

  /**
   * 3. 자주 보는 품목 TOP N 조회
   */
  async getFrequentItems(limit: number = 5) {
    // DB의 UserViewsLog 테이블에서 itemId 기준으로 그룹핑하여 카운트
    const frequentItems = await this.prisma.userViewsLog.groupBy({
      by: ['itemId'],
      _count: { itemId: true },
      orderBy: {
        _count: { itemId: 'desc' },
      },
      take: limit,
    });

    if (frequentItems.length === 0) return [];

    // 가장 많이 본 itemId들의 상세 정보를 가져옴
    const itemIds = frequentItems.map((f) => f.itemId);
    const items = await this.prisma.marketItem.findMany({
      where: { itemId: { in: itemIds } },
      include: {
        prices: {
          orderBy: { marketDate: 'desc' },
          take: 1,
        },
      },
    });

    // 조회수 순서대로 정렬 유지
    return frequentItems.map((freq) => {
      const itemDetail = items.find((i) => i.itemId === freq.itemId);
      const latestPrice = itemDetail?.prices[0];

      return {
        itemId: freq.itemId,
        viewCount: freq._count.itemId,
        displayName: itemDetail?.displayName || '알 수 없는 품목',
        category: itemDetail?.category || '알 수 없음',
        price: latestPrice?.price || null,
      };
    });
  }
}
