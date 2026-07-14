import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class MarketService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 전체 시세 리스트 (Zero-Delay 서빙용 Flat Array) 반환
   */
  async getAllMarketItems() {
    // 1. 모든 MarketItem을 조회하면서 매핑된 prices 중 가장 최신 데이터 1개만 함께 가져옴
    const items = await this.prisma.marketItem.findMany({
      include: {
        prices: {
          orderBy: {
            marketDate: 'desc',
          },
          take: 1,
        },
      },
    });

    // 최신 날짜 파악 (가장 최근에 업데이트된 날짜 기준)
    let latestDate = '1970-01-01';
    items.forEach((item) => {
      if (item.prices.length > 0) {
        const itemDate = item.prices[0].marketDate.toISOString().split('T')[0];
        if (itemDate > latestDate) {
          latestDate = itemDate;
        }
      }
    });

    // 2. 응답 규격(USER_SERVED_SPEC)에 맞추어 플랫(Flat)하게 매핑
    const mappedItems = items.map((item) => {
      const latestPrice = item.prices[0];

      return {
        itemId: item.itemId,
        priceId: latestPrice ? latestPrice.priceId : null,
        species: item.species,
        storageType: item.storageType,
        category: item.category,
        displayName: item.displayName,
        searchKeywords: item.searchKeywords || '', // DB에서 꺼낸 값 반환 (Null 방어)
        grade: item.grade,
        price: latestPrice?.price ?? null,
        previousPrice: latestPrice?.previousPrice ?? null,
        changeAmount: latestPrice?.changeAmount ?? null,
        trendStatus: latestPrice?.trendStatus ?? null,
        currency: item.currency,
        priceUnit: item.priceUnit,
      };
    });

    return {
      dataStatus: 'CURRENT', // 데이터 최신성 플래그
      marketDate:
        latestDate === '1970-01-01'
          ? new Date().toISOString().split('T')[0]
          : latestDate,
      items: mappedItems,
    };
  }

  /**
   * 특정 품목의 시세 산출 세부 내역 (원본 매물) 반환
   */
  async getItemCalculations(itemId: string) {
    const item = await this.prisma.marketItem.findUnique({
      where: { itemId },
      include: {
        prices: {
          orderBy: { marketDate: 'desc' },
          take: 1,
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`품목(ID: ${itemId})을 찾을 수 없습니다.`);
    }

    const latestPrice = item.prices[0];
    if (!latestPrice) {
      throw new NotFoundException(
        '해당 품목의 가격 데이터가 존재하지 않습니다.',
      );
    }

    // 산출 근거를 위한 RawRecord 검색
    // 원본 데이터가 쌓인 날짜와 동일한 데이터 중 조건 일치 항목
    // [중요 로직] 한우(BEEF)의 경우 ageInMonths < 40 필터링 필수
    const whereCondition: any = {
      species: item.species,
      storageType: item.storageType,
    };

    if (item.grade) {
      whereCondition.grade = item.grade;
    }

    if (item.species === 'BEEF') {
      whereCondition.ageInMonths = { lt: 40 }; // 40개월 미만 필수 필터
    }

    // 이 부분은 당일 들어온 RawRecord를 기준으로 가져온다고 가정
    // 실제 운영 환경에서는 collectedAt의 날짜가 marketDate와 일치하는 조건이 추가됨.
    // 여기서는 가장 최근 적재된 데이터를 최신 기준으로 가져온다고 단순화.

    const sourceRecords = await this.prisma.rawRecord.findMany({
      where: whereCondition,
      orderBy: { collectedAt: 'desc' },
      take: 10, // 화면 표시를 위해 상위 10개만 리밋
    });

    return {
      itemId: item.itemId,
      displayName: item.displayName,
      averagePrice: latestPrice.price,
      changeAmount: latestPrice.changeAmount,
      trendStatus: latestPrice.trendStatus,
      highestPrice: latestPrice.highestPrice,
      lowestPrice: latestPrice.lowestPrice,
      participantCount: latestPrice.participantCount,
      sourceRecords: sourceRecords.map((r) => ({
        sourceName: r.sourceName,
        rawProductName: r.rawProductName,
        price: r.price,
        ageInMonths: r.ageInMonths,
      })),
    };
  }

  /**
   * 특정 품목의 가격 이력(차트용) 반환
   */
  async getItemPriceHistory(itemId: string) {
    const item = await this.prisma.marketItem.findUnique({
      where: { itemId },
    });

    if (!item) {
      throw new NotFoundException(`품목(ID: ${itemId})을 찾을 수 없습니다.`);
    }

    const history = await this.prisma.marketItemPrice.findMany({
      where: { itemId },
      orderBy: { marketDate: 'asc' }, // 과거부터 현재 순서
    });

    return {
      item: {
        itemId: item.itemId,
        displayName: item.displayName,
      },
      points: history.map((h) => ({
        marketDate: h.marketDate.toISOString().split('T')[0],
        price: h.price,
      })),
    };
  }
}
