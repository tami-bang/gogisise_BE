import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  MarketItemsDataResponseDto,
  PriceHistoryDataResponseDto,
} from './dto/market-response.dto';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  // 💡 [한글 주석] 상세 계산 API의 응답 지연(10초 이상)을 해결하기 위한 30초 로컬 메모리 캐시 맵
  private readonly categoryCalculationsCache = new Map<string, { data: any; fetchedAt: number }>();
  private readonly itemCalculationsCache = new Map<string, { data: any; fetchedAt: number }>();
  private readonly CALCULATIONS_CACHE_TTL = 30 * 1000; // 30초 캐시

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 전체 시세 리스트 (Zero-Delay 서빙용 Flat Array) 반환
   */
  async getAllMarketItems(): Promise<MarketItemsDataResponseDto> {
    // 1. 모든 MarketItem을 조회하면서 매핑된 prices 중 가장 최신 데이터 1개만 함께 가져옴
    const items = await this.prisma.marketItem.findMany({
      where: { status: 'ACTIVE' },
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

    // 2. 응답 규격(USER_SERVED_SPEC)에 맞추어 플랫(Flat)하게 매핑 및 오매핑 데이터 필터링
    const mappedItems = items
      .map((item) => {
        const latestPrice = item.prices[0];

        // 카테고리 문자열(예: "국내산 돈육 > 냉장 > 삼겹") 파싱하여 필수 필드 복구
        const isPork = item.category?.includes('돈육');
        const isBeef =
          item.category?.includes('한우') || item.category?.includes('소고기');
        const parsedSpecies = isPork ? 'PORK' : isBeef ? 'BEEF' : item.species;

        const isChilled = item.category?.includes('냉장');
        const isFrozen = item.category?.includes('냉동');
        const parsedStorageType = isChilled
          ? 'CHILLED'
          : isFrozen
            ? 'FROZEN'
            : item.storageType;

        // 운영 데이터에는 과거 쉼표 구분 경로와 표준 ` > ` 경로가 함께 존재한다.
        const categoryParts = item.category
          ?.split(/\s*>\s*|\s*,\s*/)
          .filter(Boolean);
        const parsedCategory =
          categoryParts && categoryParts.length > 0
            ? categoryParts[categoryParts.length - 1]
            : item.category;
        const parsedDisplayName =
          item.displayName ||
          item.name ||
          (categoryParts && categoryParts.length > 0
            ? categoryParts[categoryParts.length - 1]
            : '');

        return {
          itemId: item.itemId,
          name: item.name,
          priceId: latestPrice ? latestPrice.priceId : null,
          species: item.species || parsedSpecies,
          storageType: item.storageType || parsedStorageType,
          category: parsedCategory,
          displayName: item.displayName || parsedDisplayName,
          searchKeywords: item.searchKeywords || '', // DB에서 꺼낸 값 반환 (Null 방어)
          grade: item.grade,
          ageMonths: item.ageMonths,
          weightKg: item.weightKg === null ? null : Number(item.weightKg),
          salePrice: item.salePrice,
          manufacturedAt: item.manufacturedAt,
          expiresAt: item.expiresAt,
          price: item.price || (latestPrice?.price ?? null),
          previousPrice: latestPrice?.previousPrice ?? null,
          changeAmount: latestPrice?.changeAmount ?? null,
          trendStatus: latestPrice?.trendStatus ?? null,
          currency: item.currency,
          priceUnit: item.priceUnit,
        };
      })
      .map(({ name, ...rest }) => rest); // 정규화된 ACTIVE 상품 전체를 서빙한다.

    return {
      dataStatus: 'CURRENT', // 데이터 최신성 플래그
      marketDate:
        latestDate === '1970-01-01'
          ? new Date().toISOString().split('T')[0]
          : latestDate,
      items: mappedItems as MarketItemsDataResponseDto['items'],
    };
  }

  /**
   * 카테고리 트리 목록 조회
   */
  async getCategories(options: { parentNo?: string; depth?: number }) {
    const where: any = {};
    if (options.parentNo !== undefined) {
      where.parentNo = options.parentNo;
    }
    if (options.depth !== undefined) {
      where.depth = options.depth;
    }
    return await this.prisma.categoryTree.findMany({
      where,
      orderBy: { ctgNo: 'asc' },
    });
  }

  /**
   * 카테고리 경로 기준으로 산출 세부 내역 반환
   */
  async getCategoryCalculations(categoryPath: string) {
    // 💡 [한글 주석] 30초 이내에 조회된 동일 카테고리 시세 계산 결과가 메모리 캐시에 존재할 경우 즉시 반환 (API 성능 지연 해결)
    const cached = this.categoryCalculationsCache.get(categoryPath);
    if (cached && Date.now() - cached.fetchedAt < this.CALCULATIONS_CACHE_TTL) {
      return cached.data;
    }

    const isPork =
      categoryPath.includes('돈육') || categoryPath.includes('한돈');
    const isBeef =
      categoryPath.includes('한우') || categoryPath.includes('소고기');
    const species = isPork ? 'PORK' : isBeef ? 'BEEF' : undefined;

    const isChilled = categoryPath.includes('냉장');
    const isFrozen = categoryPath.includes('냉동');
    const storageType = isChilled ? 'CHILLED' : isFrozen ? 'FROZEN' : undefined;

    const rawRecords = await this.prisma.rawRecord.findMany({
      where: {
        species,
        storageType,
      },
      orderBy: { collectedAt: 'desc' },
      take: 200, // 여유 있게 수집
    });

    // 운영 중 사용된 `>`, `,`, `/` 경로를 모두 허용하되 실제 조회 키는 마지막
    // 부위명으로 통일합니다. 공급처/브랜드는 매물 속성이지 부위 조회 조건이 아닙니다.
    const categorySeparator = categoryPath.includes('>')
      ? /\s*>\s*/
      : categoryPath.includes('/')
        ? /\s*\/\s*/
        : /\s*,\s*/;
    const categoryParts = categoryPath
      .split(categorySeparator)
      .map((part) => part.trim())
      .filter(Boolean);
    const catName = categoryParts[categoryParts.length - 1] || '';

    const strictFilteredRecords = rawRecords.filter(
      (record) => record.category.trim() === catName,
    );

    // 부위명 매핑 고도화 (Name Mapping)
    const mappedSourceRecords = strictFilteredRecords.map((r) => {
      const rawName = r.rawProductName;
      const brand = r.brand ? `[${r.brand}]` : '';

      let refinedName = '';
      if (r.category && r.category !== '기타') {
        refinedName = brand ? `${brand} ${r.category}` : r.category;

        if (r.qualityGrade) {
          refinedName += ` ${r.qualityGrade}`;
        }

        if (r.gender === '암소' || rawName.includes('(암)')) {
          refinedName += ' (암)';
        }
      } else {
        refinedName = brand
          ? rawName.startsWith(r.brand)
            ? rawName
            : `${brand} ${rawName}`
          : rawName;
      }

      return {
        id: r.rawRecordId,
        sourceName: refinedName,
        rawProductName: rawName,
        price: r.pricePerKg,
        ageInMonths: r.ageMonths,
        collectedAt: r.collectedAt.toISOString(),
        includedInAverage: true,
        grade: r.qualityGrade || null,
        brand: r.brand || null,
      };
    });

    // sourceItems: 원본 MarketItem 리스트 (금천미트 바로가기용)
    // 💡 [한글 주석] B-Tree 인덱스(idx_market_items_category)를 온전히 활용하기 위해
    // endsWith 조건 대신 CategoryTree 테이블에서 해당 부위명으로 끝나는 카테고리 전체 경로 리스트를 먼저 조회합니다.
    const matchedCategories = await this.prisma.categoryTree.findMany({
      where: {
        path: { endsWith: catName },
      },
      select: { path: true },
    });
    const categoryPaths = matchedCategories.map((c) => c.path);

    // 💡 [한글 주석] category: { in: categoryPaths } 를 사용해 인덱스 레인지 스캔이 유도되도록 쿼리 튜닝 완료
    const sourceItems = await this.prisma.marketItem.findMany({
      where: {
        status: 'ACTIVE',
        species,
        storageType,
        category: { in: categoryPaths },
      },
      select: {
        itemId: true,
        name: true,
        grade: true,
        brand: true,
        detailUrl: true,
        price: true,
        ageMonths: true,
        weightKg: true,
        salePrice: true,
        manufacturedAt: true,
        expiresAt: true,
        updatedAt: true,
      },
      orderBy: { price: 'asc' },
    });

    // 카드별 전일 변동과 7일 차트를 N+1 없이 계산한다. 먼저 해당 부위의 최근
    // 7개 기록일만 찾고, 그 날짜 범위의 모든 상품 가격을 한 번에 조회한다.
    const sourceItemIds = sourceItems.map((item) => item.itemId);
    const recentMarketDates = sourceItemIds.length > 0
      ? await this.prisma.marketItemPrice.findMany({
          where: { itemId: { in: sourceItemIds } },
          distinct: ['marketDate'],
          orderBy: { marketDate: 'desc' },
          take: 7,
          select: { marketDate: true },
        })
      : [];
    const historyRows = recentMarketDates.length > 0
      ? await this.prisma.marketItemPrice.findMany({
          where: {
            itemId: { in: sourceItemIds },
            marketDate: { in: recentMarketDates.map((row) => row.marketDate) },
          },
          orderBy: [{ itemId: 'asc' }, { marketDate: 'desc' }],
          select: { itemId: true, marketDate: true, price: true },
        })
      : [];

    const historyByItem = new Map<
      string,
      Array<{ marketDate: Date; price: number | null }>
    >();
    for (const row of historyRows) {
      const itemHistory = historyByItem.get(row.itemId) ?? [];
      itemHistory.push({ marketDate: row.marketDate, price: row.price });
      historyByItem.set(row.itemId, itemHistory);
    }

    const dailyPrices = new Map<string, number[]>();
    for (const row of historyRows) {
      if (row.price === null) continue;
      const marketDate = row.marketDate.toISOString().split('T')[0];
      const pricesForDate = dailyPrices.get(marketDate) ?? [];
      pricesForDate.push(row.price);
      dailyPrices.set(marketDate, pricesForDate);
    }
    const priceHistory = Array.from(dailyPrices.entries())
      .map(([marketDate, dailyValues]) => ({
        marketDate,
        price: Math.round(
          dailyValues.reduce((sum, price) => sum + price, 0) /
            dailyValues.length,
        ),
      }))
      .sort((a, b) => a.marketDate.localeCompare(b.marketDate));

    // 카테고리는 수집 단계에서 이미 정규화되어 있다. 상품명에 부위명이 반복되지
    // 않는 정상 상품까지 제거하던 키워드 기반 2차 필터는 적용하지 않는다.
    const filteredSourceItems = sourceItems;

    // 시세 가격 지표 연산
    const prices = strictFilteredRecords.map((r) => r.pricePerKg);
    const averagePrice =
      prices.length > 0
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : 0;

    const fallbackPrice =
      filteredSourceItems.length > 0
        ? Math.round(
            filteredSourceItems.reduce((a, b) => a + b.price, 0) /
              filteredSourceItems.length,
          )
        : 0;

    const finalAverage = averagePrice || fallbackPrice;
    const latestHistoryPoint = priceHistory.at(-1);
    const previousHistoryPoint = priceHistory.at(-2);
    const categoryChangeAmount =
      latestHistoryPoint && previousHistoryPoint
        ? latestHistoryPoint.price - previousHistoryPoint.price
        : 0;
    const categoryTrendStatus =
      categoryChangeAmount > 0
        ? 'UP'
        : categoryChangeAmount < 0
          ? 'DOWN'
          : 'UNCHANGED';

    const highestPrice =
      prices.length > 0
        ? Math.max(...prices)
        : filteredSourceItems.length > 0
          ? Math.max(...filteredSourceItems.map((si) => si.price))
          : 0;

    const lowestPrice =
      prices.length > 0
        ? Math.min(...prices)
        : filteredSourceItems.length > 0
          ? Math.min(...filteredSourceItems.map((si) => si.price))
          : 0;

    // 대표 카테고리 정보 추출
    const displayName = catName;
    const collectionTimestamps = [
      ...strictFilteredRecords.map((record) => record.collectedAt.getTime()),
      ...sourceItems.map((item) => item.updatedAt.getTime()),
    ];
    const lastCollectedAt = collectionTimestamps.length > 0
      ? new Date(Math.max(...collectionTimestamps)).toISOString()
      : null;

    const result = {
      itemId: `cat-${displayName}`,
      displayName,
      grade: null,
      averagePrice: finalAverage,
      changeAmount: categoryChangeAmount,
      trendStatus: categoryTrendStatus,
      highestPrice,
      lowestPrice,
      participantCount: strictFilteredRecords.length,
      lastCollectedAt,
      priceHistory,
      sourceRecords: mappedSourceRecords,
      sourceItems: filteredSourceItems.map((si) => {
        const itemHistory = historyByItem.get(si.itemId) ?? [];
        const latestPrice = itemHistory[0]?.price ?? si.price;
        const previousPrice = itemHistory[1]?.price ?? null;
        const changeAmount =
          latestPrice !== null && previousPrice !== null
            ? latestPrice - previousPrice
            : null;
        const trendStatus =
          changeAmount === null
            ? null
            : changeAmount > 0
              ? 'UP'
              : changeAmount < 0
                ? 'DOWN'
                : 'UNCHANGED';

        return {
          itemId: si.itemId,
          name: si.name,
          grade: si.grade,
          brand: si.brand || null,
          detailUrl: si.detailUrl,
          price: si.price,
          previousPrice,
          changeAmount,
          trendStatus,
          ageInMonths: si.ageMonths,
          manufacturedAt: si.manufacturedAt,
          expiresAt: si.expiresAt,
          weightKg: Number(si.weightKg),
          salePrice: si.salePrice,
        };
      }),
    };

    // 💡 [한글 주석] 결과를 30초 동안 로컬 메모리 캐시에 보관
    this.categoryCalculationsCache.set(categoryPath, {
      data: result,
      fetchedAt: Date.now(),
    });

    return result;
  }

  /**
   * 특정 품목의 시세 산출 세부 내역 (원본 매물) 반환
   */
  async getItemCalculations(itemId: string) {
    // 💡 [한글 주석] 30초 이내에 동일한 품목 ID로 계산된 시세 결과가 캐시에 존재하면 즉시 반환 (속도 최적화)
    const cached = this.itemCalculationsCache.get(itemId);
    if (cached && Date.now() - cached.fetchedAt < this.CALCULATIONS_CACHE_TTL) {
      return cached.data;
    }

    const item = await this.prisma.marketItem.findFirst({
      where: { itemId, status: 'ACTIVE' },
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

    // 1. 상세 페이지 필터링 로직 (Strict Filtering - RawRecord)
    const isPork = item.category?.includes('돈육');
    const isBeef =
      item.category?.includes('한우') || item.category?.includes('소고기');
    const parsedSpecies = isPork ? 'PORK' : isBeef ? 'BEEF' : item.species;

    const isChilled = item.category?.includes('냉장');
    const isFrozen = item.category?.includes('냉동');
    const parsedStorageType = isChilled
      ? 'CHILLED'
      : isFrozen
        ? 'FROZEN'
        : item.storageType;

    const rawRecords = await this.prisma.rawRecord.findMany({
      where: {
        species: item.species || parsedSpecies || undefined,
        storageType: item.storageType || parsedStorageType || undefined,
      },
      orderBy: { collectedAt: 'desc' },
      take: 100, // 여유 있게 가져와서 JS 단에서 카테고리 경로를 엄격히 필터링합니다.
    });

    const strictFilteredRecords = rawRecords.filter((r) => {
      const speciesPrefix =
        r.species === 'BEEF' ? '국내산 한우' : '국내산 돈육';
      const storagePrefix = r.storageType === 'CHILLED' ? '냉장' : '냉동';

      // 카테고리 부위명 표준 매핑 규칙
      let rawCat = r.category;
      if (r.species === 'BEEF') {
        if (rawCat === '우둔살') rawCat = '우둔';
        if (rawCat === '앞다리') rawCat = '앞다리살';
        if (rawCat === '설깃') rawCat = '설도';
        if (rawCat === '양지머리' || rawCat.includes('양지')) rawCat = '양지';
        if (rawCat === '갈비살') rawCat = '갈비';
      } else if (r.species === 'PORK') {
        if (rawCat === '앞다리살') rawCat = '앞다리';
        if (rawCat === '뒷다리살') rawCat = '뒷다리';
        if (rawCat === '삼겹살') rawCat = '삼겹';
        if (rawCat === '갈비살') rawCat = '갈비';
      }

      const reconstructedPath = `${speciesPrefix} > ${storagePrefix} > ${rawCat}`;
      const isPathMatch = reconstructedPath === item.category;
      if (!isPathMatch) return false;

      if (item.grade && r.qualityGrade) {
        return r.qualityGrade === item.grade;
      }
      return true;
    });

    // 2. 부위명 매핑 고도화 (Name Mapping)
    const mappedSourceRecords = strictFilteredRecords.map((r) => {
      const rawName = r.rawProductName;
      const brand = r.brand ? `[${r.brand}]` : '';

      let refinedName = '';
      if (r.category && r.category !== '기타') {
        refinedName = brand ? `${brand} ${r.category}` : r.category;

        if (r.qualityGrade) {
          refinedName += ` ${r.qualityGrade}`;
        }

        if (r.gender === '암소' || rawName.includes('(암)')) {
          refinedName += ' (암)';
        }
      } else {
        refinedName = brand
          ? rawName.startsWith(r.brand)
            ? rawName
            : `${brand} ${rawName}`
          : rawName;
      }

      return {
        id: r.rawRecordId,
        sourceName: refinedName,
        rawProductName: rawName,
        price: r.pricePerKg,
        ageInMonths: r.ageMonths,
        collectedAt: r.collectedAt.toISOString(),
        includedInAverage: true,
        grade: r.qualityGrade || null,
        brand: r.brand || null,
      };
    });

    // sourceItems: 원본 MarketItem 리스트 (금천미트 바로가기용)
    const sourceItems = await this.prisma.marketItem.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ itemId: item.itemId }, { category: item.category }],
      },
      select: {
        itemId: true,
        name: true,
        grade: true,
        brand: true,
        detailUrl: true,
        price: true,
        ageMonths: true,
        weightKg: true,
        salePrice: true,
        manufacturedAt: true,
        expiresAt: true,
      },
      orderBy: { price: 'asc' },
    });

    const filteredSourceItems = sourceItems.filter((si) => {
      // 본인은 항상 포함
      if (si.itemId === item.itemId) return true;

      // 오매핑 제거 필터링
      const catParts = item.category.split(' > ');
      const catName = catParts[catParts.length - 1]; // "우둔", "안심" 등

      const keywords = [
        '안심',
        '등심',
        '채끝',
        '목심',
        '앞다리',
        '부채살',
        '우둔',
        '홍두깨',
        '설도',
        '양지',
        '차돌박이',
        '치마살',
        '업진살',
        '사태',
        '갈비',
        '안창살',
        '토시살',
        '삼겹',
        '뒷다리',
        '항정',
        '등심덧살',
        '갈매기',
      ];
      const otherKeywords = keywords.filter((k) => k !== catName);

      const hasOtherKeyword = otherKeywords.some((k) => si.name.includes(k));
      if (hasOtherKeyword) return false;

      const hasCorrectKeyword =
        si.name.includes(catName) ||
        (catName === '우둔' && si.name.includes('우둔살')) ||
        (catName === '앞다리살' && si.name.includes('앞다리')) ||
        (catName === '설도' && si.name.includes('설깃'));

      return hasCorrectKeyword;
    });

    const result = {
      itemId: item.itemId,
      displayName: item.displayName || item.name,
      grade: item.grade || null,
      averagePrice: currentPrice,
      changeAmount: latestPrice?.changeAmount ?? 0,
      trendStatus: latestPrice?.trendStatus ?? 'UNCHANGED',
      highestPrice: latestPrice?.highestPrice ?? currentPrice,
      lowestPrice: latestPrice?.lowestPrice ?? currentPrice,
      participantCount: strictFilteredRecords.length, // 실 참여 개수 반영
      sourceRecords: mappedSourceRecords,
      sourceItems: filteredSourceItems.map((si) => ({
        itemId: si.itemId,
        name: si.name,
        grade: si.grade || null,
        brand: si.brand || null,
        detailUrl: si.detailUrl,
        price: si.price,
        ageInMonths: si.ageMonths,
        weightKg: si.weightKg === null ? null : Number(si.weightKg),
        salePrice: si.salePrice,
        manufacturedAt: si.manufacturedAt,
        expiresAt: si.expiresAt,
      })),
    };

    // 💡 [한글 주석] 결과를 30초 동안 메모리 캐시에 보관
    this.itemCalculationsCache.set(itemId, {
      data: result,
      fetchedAt: Date.now(),
    });

    return result;
  }

  /**
   * 특정 품목의 가격 이력(차트용) 반환
   */
  async getItemPriceHistory(itemId: string): Promise<PriceHistoryDataResponseDto> {
    // 동일 스냅샷에서 상품 정보, 변동 계산용 최근 2건, 차트용 최근 7건을
    // 조회한다. `(itemId, marketDate)` 복합 유니크 인덱스가 DESC 역방향
    // 스캔에 사용되므로 전체 가격 이력을 메모리에 올리지 않는다.
    const [item, latestRecords, recentRecords] = await this.prisma.$transaction([
      this.prisma.marketItem.findUnique({
        where: { itemId },
        select: {
          itemId: true,
          displayName: true,
          name: true,
          price: true,
        },
      }),
      this.prisma.marketItemPrice.findMany({
        where: { itemId },
        orderBy: { marketDate: 'desc' },
        take: 2,
        select: { marketDate: true, price: true },
      }),
      this.prisma.marketItemPrice.findMany({
        where: { itemId },
        orderBy: { marketDate: 'desc' },
        take: 7,
        select: { marketDate: true, price: true },
      }),
    ]);

    if (!item) {
      throw new NotFoundException(`품목(ID: ${itemId})을 찾을 수 없습니다.`);
    }

    const currentRecord = latestRecords[0] ?? null;
    const previousRecord = latestRecords[1] ?? null;
    const currentPrice = currentRecord?.price ?? item.price ?? null;
    const previousPrice = previousRecord?.price ?? null;
    const changeAmount =
      currentPrice !== null && previousPrice !== null
        ? currentPrice - previousPrice
        : null;
    const changeRate =
      changeAmount !== null && previousPrice !== null && previousPrice > 0
        ? Number(((changeAmount / previousPrice) * 100).toFixed(2))
        : null;
    const trendStatus =
      changeAmount === null
        ? null
        : changeAmount > 0
          ? ('UP' as const)
          : changeAmount < 0
            ? ('DOWN' as const)
            : ('UNCHANGED' as const);

    const points = recentRecords.length > 0
      ? recentRecords
          .slice()
          .reverse()
          .map((record) => ({
            marketDate: record.marketDate.toISOString().split('T')[0],
            price: record.price,
          }))
      : item.price
        ? [{ marketDate: new Date().toISOString().split('T')[0], price: item.price }]
        : [];

    return {
      item: {
        itemId: item.itemId,
        displayName: item.displayName || item.name,
      },
      summary: {
        currentMarketDate: currentRecord
          ? currentRecord.marketDate.toISOString().split('T')[0]
          : null,
        previousMarketDate: previousRecord
          ? previousRecord.marketDate.toISOString().split('T')[0]
          : null,
        currentPrice,
        previousPrice,
        changeAmount,
        changeRate,
        trendStatus,
      },
      points,
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
        if (
          record.gender === '암소' ||
          record.rawProductName.includes('(암)') ||
          record.rawProductName.includes('암퇘지')
        ) {
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
      grouped
        .get(key)!
        .push({ ...record, standardizedGrade, category, displayName });
    }

    // 3. MarketItem 및 Price Upsert
    const marketDate = today;

    for (const [key, records] of grouped.entries()) {
      const first = records[0];

      // 가격 계산 (pricePerKg 사용)
      const prices = records.map((r) => r.pricePerKg);
      const avgPrice = Math.round(
        prices.reduce((a, b) => a + b, 0) / prices.length,
      );
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
          grade: first.standardizedGrade,
        },
      });

      if (!marketItem) {
        this.logger.warn(
          `원본 상품 마스터가 없어 집계 생성을 건너뜁니다: ${key}`,
        );
        continue;
      }

      marketItem = await this.prisma.marketItem.update({
        where: { itemId: marketItem.itemId },
        data: {
          searchKeywords,
          displayName: first.displayName,
          grade: first.standardizedGrade,
          price: avgPrice,
        },
      });

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
          },
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
        },
      });
    }
  }
}
