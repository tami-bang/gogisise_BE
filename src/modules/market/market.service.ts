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
        sourceName: `${r.sourceName} - ${r.rawProductName}`, // UI에서 브랜드+부위+등급이 보이도록
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

  /**
   * [Phase 3] 수집된 RawRecord를 MarketItem과 MarketItemPrice로 가공
   */
  async processRawRecordsIntoMarketItems() {
    // 1. 오늘 수집된 데이터 가져오기
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rawRecords = await this.prisma.rawRecord.findMany({
      where: {
        collectedAt: { gte: today },
      },
    });

    if (rawRecords.length === 0) return;

    // 2. 종별/부위별/등급별로 그룹핑
    const grouped = new Map<string, any[]>();

    for (const record of rawRecords) {
      // Rule 1: 한우 암소 필터링 (ageInMonths < 40)
      if (record.species === 'BEEF') {
        // 암소 키워드 검사 (보통 rawProductName에 '암소'가 포함됨)
        const isCow = record.rawProductName.includes('암소');
        if (isCow && (record.ageInMonths === null || record.ageInMonths >= 40)) {
          continue; // 40개월 이상 또는 알 수 없는 암소는 스킵
        }
      }

      // Rule 2: 등급 표준화
      let standardizedGrade: string | null = null;
      if (record.grade) {
        if (record.grade.includes('1++')) standardizedGrade = '1++';
        else if (record.grade.includes('1+')) standardizedGrade = '1+';
        else if (record.grade.includes('1')) standardizedGrade = '1';
        else if (record.grade.includes('2')) standardizedGrade = '2';
        else if (record.grade.includes('3')) standardizedGrade = '3';
        else standardizedGrade = '등외';
      }

      // 카테고리 추출 (단순 휴리스틱)
      let category = '기타';
      const possibleCategories = [
        '안심', '등심', '채끝', '삼겹', '목살', '앞다리', '전각', '뒷다리', 
        '우둔', '설도', '사태', '양지', '갈비', '항정', '가브리', '갈매기', '치마', '부채', '업진'
      ];
      for (const cat of possibleCategories) {
        if (record.rawProductName.includes(cat)) {
          category = cat;
          break;
        }
      }

      // displayName 생성: 세부 정보를 최대한 살림
      let displayName = category !== '기타' ? category : record.rawProductName.substring(0, 15);
      if (record.species === 'PORK' && (record.rawProductName.includes('(암)') || record.rawProductName.includes('암퇘지'))) {
        displayName += '(암)';
      } else if (record.species === 'BEEF' && record.rawProductName.includes('(암)')) {
        displayName += '(암)';
      }
      
      if (standardizedGrade) {
        displayName += ` ${standardizedGrade}`;
      }

      const key = `${record.species}_${record.storageType}_${category}_${displayName}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push({ ...record, standardizedGrade, category, displayName });
    }

    // 3. MarketItem 및 Price Upsert
    const marketDate = today;

    for (const [key, records] of grouped.entries()) {
      const first = records[0];
      
      // 가격 계산
      const prices = records.map(r => r.price);
      const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);

      // searchKeywords 생성 (초성 변환은 생략하고 핵심 핀포인트 로직만 구현)
      const keywords = new Set<string>();
      keywords.add(first.category);
      if (first.displayName.includes('(암)')) {
        keywords.add(`${first.category}암`);
        keywords.add(`${first.category}(암)`);
        keywords.add(`${first.category}살암`);
        keywords.add('ㅅㄱㅇ'); // 예시 하드코딩 (실제론 초성변환기 필요)
      }
      if (first.standardizedGrade) {
        const g = first.standardizedGrade;
        keywords.add(`${first.category}${g}`);
        if (g === '1++') {
          keywords.add(`1pp`);
          keywords.add(`1PP`);
          keywords.add(`${first.category}1pp`);
        }
      }

      const searchKeywords = Array.from(keywords).join(' ');

      // MarketItem 조회 (고유 조합으로)
      let marketItem = await this.prisma.marketItem.findFirst({
        where: {
          species: first.species,
          storageType: first.storageType,
          category: first.category,
          displayName: first.displayName,
          grade: first.standardizedGrade
        }
      });

      if (marketItem) {
        marketItem = await this.prisma.marketItem.update({
          where: { itemId: marketItem.itemId },
          data: { searchKeywords, displayName: first.displayName, grade: first.standardizedGrade }
        });
      } else {
        marketItem = await this.prisma.marketItem.create({
          data: {
            species: first.species,
            storageType: first.storageType,
            category: first.category,
            displayName: first.displayName,
            searchKeywords,
            grade: first.standardizedGrade,
          }
        });
      }

      // 전일 가격 조회 (어제 데이터)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const prevPrice = await this.prisma.marketItemPrice.findFirst({
        where: { itemId: marketItem.itemId, marketDate: yesterday },
      });

      let changeAmount: number | null = null;
      let trendStatus: string | null = null;
      if (prevPrice && prevPrice.price) {
        changeAmount = avgPrice - prevPrice.price;
        if (changeAmount > 0) trendStatus = 'UP';
        else if (changeAmount < 0) trendStatus = 'DOWN';
        else trendStatus = 'UNCHANGED';
      }

      await this.prisma.marketItemPrice.upsert({
        where: {
          itemId_marketDate: {
            itemId: marketItem.itemId,
            marketDate: marketDate,
          }
        },
        update: {
          price: avgPrice,
          previousPrice: prevPrice ? prevPrice.price : null,
          changeAmount,
          trendStatus,
          highestPrice: maxPrice,
          lowestPrice: minPrice,
          participantCount: records.length,
        },
        create: {
          itemId: marketItem.itemId,
          marketDate: marketDate,
          price: avgPrice,
          previousPrice: prevPrice ? prevPrice.price : null,
          changeAmount,
          trendStatus,
          highestPrice: maxPrice,
          lowestPrice: minPrice,
          participantCount: records.length,
        }
      });
    }
  }
}
