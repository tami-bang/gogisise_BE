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

      // 카테고리 문자열(예: "국내산 돈육 > 냉장 > 삼겹") 파싱하여 필수 필드 복구
      const isPork = item.category?.includes('돈육');
      const isBeef = item.category?.includes('한우') || item.category?.includes('소고기');
      const parsedSpecies = isPork ? 'PORK' : isBeef ? 'BEEF' : item.species;

      const isChilled = item.category?.includes('냉장');
      const isFrozen = item.category?.includes('냉동');
      const parsedStorageType = isChilled ? 'CHILLED' : isFrozen ? 'FROZEN' : item.storageType;

      const categoryParts = item.category?.split(' > ');
      const parsedDisplayName = categoryParts && categoryParts.length > 0 
        ? categoryParts[categoryParts.length - 1] 
        : item.displayName;

      return {
        itemId: item.itemId,
        priceId: latestPrice ? latestPrice.priceId : null,
        species: item.species || parsedSpecies,
        storageType: item.storageType || parsedStorageType,
        category: item.category,
        displayName: item.displayName || parsedDisplayName,
        searchKeywords: item.searchKeywords || '', // DB에서 꺼낸 값 반환 (Null 방어)
        grade: item.grade,
        price: item.price || (latestPrice?.price ?? null),
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
    const currentPrice = item.price || latestPrice?.price;

    if (!currentPrice) {
      throw new NotFoundException(
        '해당 품목의 가격 데이터가 존재하지 않습니다.',
      );
    }

    // 1. 상세 페이지 필터링 로직 (Strict Filtering)
    // 파이썬 크롤러 단에서 이미 하드 필터링 및 카테고리 매핑이 완료되었으므로, DB 레벨에서 바로 조회 가능합니다.
    const isPork = item.category?.includes('돈육');
    const isBeef = item.category?.includes('한우') || item.category?.includes('소고기');
    const parsedSpecies = isPork ? 'PORK' : isBeef ? 'BEEF' : item.species;

    const isChilled = item.category?.includes('냉장');
    const isFrozen = item.category?.includes('냉동');
    const parsedStorageType = isChilled ? 'CHILLED' : isFrozen ? 'FROZEN' : item.storageType;

    const categoryParts = item.category?.split(' > ');
    const shortCategory = categoryParts && categoryParts.length > 0 
      ? categoryParts[categoryParts.length - 1] 
      : item.category;

    const whereCondition: any = {
      species: item.species || parsedSpecies || undefined,
      storageType: item.storageType || parsedStorageType || undefined,
      category: { contains: shortCategory },
    };

    if (item.grade) {
      whereCondition.qualityGrade = item.grade;
    }

    const rawRecords = await this.prisma.rawRecord.findMany({
      where: whereCondition,
      orderBy: { collectedAt: 'desc' },
      take: 10, // 이미 정확히 매핑된 데이터이므로 10개만 가져옵니다.
    });

    const strictFilteredRecords = rawRecords;

    // 2. 부위명 매핑 고도화 (Name Mapping)
    const mappedSourceRecords = strictFilteredRecords.map((r) => {
      const rawName = r.rawProductName;
      
      // DB에 깔끔하게 분리된 brand 필드 사용
      const brand = r.brand ? `[${r.brand}]` : '';

      // "[브랜드] 부위명 등급" 형태로 개선
      let refinedName = '';
      if (r.category && r.category !== '기타') {
        refinedName = brand ? `${brand} ${r.category}` : r.category;
        
        if (r.qualityGrade) {
          refinedName += ` ${r.qualityGrade}`;
        }

        // 상세 특징: '(암)' 키워드가 있다면 보존
        if (r.gender === '암소' || rawName.includes('(암)')) {
          refinedName += ' (암)';
        }
      } else {
        refinedName = brand ? (rawName.startsWith(r.brand) ? rawName : `${brand} ${rawName}`) : rawName;
      }

      return {
        id: r.rawRecordId,
        sourceName: refinedName,
        rawProductName: rawName,
        price: r.pricePerKg,
        ageInMonths: r.ageMonths,
        collectedAt: r.collectedAt.toISOString(),
        includedInAverage: true,
        // === 추가 필드: 프론트엔드 상세 팝업 연동용 ===
        grade: r.qualityGrade || null,
        brand: r.brand || null,
      };
    });

    // sourceItems: 원본 MarketItem 리스트 (금천미트 바로가기용)
    const sourceItems = await this.prisma.marketItem.findMany({
      where: {
        OR: [
          { itemId: item.itemId },
          { category: item.category },
        ]
      },
      select: {
        itemId: true,
        name: true,
        grade: true,
        brand: true,
        detailUrl: true,
        price: true,
      },
      orderBy: { price: 'asc' },
      take: 20,
    });


    return {
      itemId: item.itemId,
      displayName: item.displayName || item.name,
      grade: item.grade || null,
      averagePrice: currentPrice,
      changeAmount: latestPrice?.changeAmount ?? 0,
      trendStatus: latestPrice?.trendStatus ?? 'UNCHANGED',
      highestPrice: latestPrice?.highestPrice ?? currentPrice,
      lowestPrice: latestPrice?.lowestPrice ?? currentPrice,
      participantCount: latestPrice?.participantCount ?? 0,
      sourceRecords: mappedSourceRecords,
      sourceItems: sourceItems.map((si) => ({
        itemId: si.itemId,
        name: si.name,
        grade: si.grade || null,
        brand: si.brand || null,
        detailUrl: si.detailUrl,
        price: si.price,
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
        displayName: item.displayName || item.name,
      },
      points: history.length > 0 
        ? history.map((h) => ({
            marketDate: h.marketDate.toISOString().split('T')[0],
            price: h.price,
          }))
        : item.price 
          ? [{ marketDate: new Date().toISOString().split('T')[0], price: item.price }] 
          : [],
    };
  }

  /**
   * [Phase 3] 수집된 RawRecord를 MarketItem과 MarketItemPrice로 가공
   */
  async processRawRecordsIntoMarketItems(targetDate?: Date) {
    // 1. 수집된 데이터 가져오기 (targetDate가 제공되면 해당 날짜 기준, 없으면 오늘 기준)
    const today = targetDate ? new Date(targetDate) : new Date();
    today.setHours(0, 0, 0, 0);

    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + 1);

    const rawRecords = await this.prisma.rawRecord.findMany({
      where: {
        collectedAt: {
          gte: today,
          lt: nextDay,
        },
      },
    });

    if (rawRecords.length === 0) return;

    // 2. 종별/부위별/등급별로 그룹핑
    const grouped = new Map<string, any[]>();

    for (const record of rawRecords) {
      // Rule 1, 2, 카테고리 추출 등은 이미 Python 크롤러에서 완벽하게 전처리됨
      const category = record.category;
      const standardizedGrade = record.qualityGrade;

      // displayName 생성: 세부 정보를 최대한 살림
      let displayName = '';
      if (category !== '기타') {
        displayName = category;
        if (record.gender === '암소' || record.rawProductName.includes('(암)') || record.rawProductName.includes('암퇘지')) {
          displayName += '(암)';
        }
        
        if (standardizedGrade) {
          displayName += ` ${standardizedGrade}`;
        }
      } else {
        displayName = record.rawProductName;
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
      
      // 가격 계산 (pricePerKg 사용)
      const prices = records.map(r => r.pricePerKg);
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
            goodsNo: `legacy-${Date.now()}-${Math.random()}`,
            name: first.displayName,
            brand: 'Unknown',
            detailUrl: '',
            price: 0,
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
