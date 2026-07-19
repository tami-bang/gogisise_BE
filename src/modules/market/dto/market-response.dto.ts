export class MarketItemResponseDto {
  itemId: string;
  priceId: string | null;
  species: string;
  storageType: string;
  category: string;
  displayName: string;
  searchKeywords: string;
  grade: string | null;
  ageMonths: number | null;
  weightKg: number | null;
  salePrice: number | null;
  manufacturedAt: Date | null;
  expiresAt: Date | null;
  price: number | null;
  previousPrice: number | null;
  changeAmount: number | null;
  trendStatus: string | null;
  currency: string;
  priceUnit: string;
}

export class MarketItemsDataResponseDto {
  dataStatus: 'CURRENT';
  marketDate: string;
  items: MarketItemResponseDto[];
}

export class PriceHistoryPointResponseDto {
  marketDate: string;
  price: number | null;
}

export class PriceChangeSummaryResponseDto {
  currentMarketDate: string | null;
  previousMarketDate: string | null;
  currentPrice: number | null;
  previousPrice: number | null;
  changeAmount: number | null;
  changeRate: number | null;
  trendStatus: 'UP' | 'DOWN' | 'UNCHANGED' | null;
}

export class PriceHistoryDataResponseDto {
  item: {
    itemId: string;
    displayName: string;
  };
  summary: PriceChangeSummaryResponseDto;
  points: PriceHistoryPointResponseDto[];
}
