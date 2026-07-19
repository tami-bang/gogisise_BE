import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MarketItemsDataResponseDto } from './dto/market-response.dto';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

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

        const categoryParts = item.category?.split(' > ');
        const parsedDisplayName =
          categoryParts && categoryParts.length > 0
            ? categoryParts[categoryParts.length - 1]
            : item.displayName;

        return {
          itemId: item.itemId,
          name: item.name,
          priceId: latestPrice ? latestPrice.priceId : null,
          species: item.species || parsedSpecies,
          storageType: item.storageType || parsedStorageType,
          category: item.category,
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
      .filter((mappedItem) => {
        // 엄격한 카테고리-상품명 매칭 검사
        const catParts = mappedItem.category.split(' > ');
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

        // 상품명에 다른 부위의 키워드가 들어있는 경우 제외 (오매핑 방지)
        const hasOtherKeyword = otherKeywords.some((k) =>
          mappedItem.name.includes(k),
        );
        if (hasOtherKeyword) return false;

        // 상품명에 해당 카테고리 키워드가 포함되어 있는지 검증 (앞다리살인 경우 앞다리 포함 등 예외처리)
        const hasCorrectKeyword =
          mappedItem.name.includes(catName) ||
          (catName === '우둔' && mappedItem.name.includes('우둔살')) ||
          (catName === '앞다리살' && mappedItem.name.includes('앞다리')) ||
          (catName === '설도' && mappedItem.name.includes('설깃'));

        return hasCorrectKeyword;
      })
      .map(({ name, ...rest }) => rest); // name 필드는 응답 스펙 제외

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

    const strictFilteredRecords = rawRecords.filter((r) => {
      const isBeefRecord = r.species === 'BEEF';

      // 하위분류 결정 (국내산 한우 / 국내산 한우 암소 / 국내산 돈육)
      let subCategory = '';
      if (isBeefRecord) {
        const isCow =
          r.gender === '암소' ||
          r.rawProductName.includes('암소') ||
          r.rawProductName.includes('(암)');
        subCategory = isCow ? '국내산 한우 암소' : '국내산 한우';
      } else {
        subCategory = '국내산 돈육';
      }

      const speciesPrefix = isBeefRecord ? '국내산 한우' : '국내산 돈육';
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

      const reconstructedPath = `${speciesPrefix} > ${subCategory} > ${storagePrefix} > ${rawCat}`;
      return reconstructedPath === categoryPath;
    });

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

    const catParts = categoryPath.split(' > ');
    const catName = catParts[catParts.length - 1]; // "우둔", "안심" 등
    const categoryScope = isPork ? '국내산 돈육' : '국내산 한우 암소';
    const storageIndex = catParts.findIndex(
      (part) => part === '냉장' || part === '냉동',
    );
    const sourceGroup = storageIndex > 0 ? catParts[storageIndex - 1] : null;

    // sourceItems: 원본 MarketItem 리스트 (금천미트 바로가기용)
    // 기존 데이터에는 축종/보관상태가 비어 있을 수 있으므로
    // 저장된 카테고리 또는 원본 상품명의 마지막 부위명으로 조회한다.
    const sourceItems = await this.prisma.marketItem.findMany({
      where: {
        AND: [
          { status: 'ACTIVE' },
          { category: { contains: categoryScope } },
          ...(sourceGroup && sourceGroup !== categoryScope
            ? [{ category: { contains: sourceGroup } }]
            : []),
          { category: { endsWith: catName } },
        ],
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
    const displayName = catParts[catParts.length - 1];

    return {
      itemId: `cat-${displayName}`,
      displayName,
      grade: null,
      averagePrice: finalAverage,
      changeAmount: 0,
      trendStatus: 'UNCHANGED',
      highestPrice,
      lowestPrice,
      participantCount: strictFilteredRecords.length,
      sourceRecords: mappedSourceRecords,
      sourceItems: filteredSourceItems.map((si) => ({
        itemId: si.itemId,
        name: si.name,
        grade: si.grade,
        brand: si.brand || null,
        detailUrl: si.detailUrl,
        price: si.price,
        ageInMonths: si.ageMonths,
        manufacturedAt: si.manufacturedAt,
        expiresAt: si.expiresAt,
        weightKg: Number(si.weightKg),
        salePrice: si.salePrice,
      })),
    };
  }

  /**
   * 특정 품목의 시세 산출 세부 내역 (원본 매물) 반환
   */
  async getItemCalculations(itemId: string) {
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

    return {
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
      points:
        history.length > 0
          ? history.map((h) => ({
              marketDate: h.marketDate.toISOString().split('T')[0],
              price: h.price,
            }))
          : item.price
            ? [
                {
                  marketDate: new Date().toISOString().split('T')[0],
                  price: item.price,
                },
              ]
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
