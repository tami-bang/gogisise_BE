"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceHistoryDataResponseDto = exports.PriceChangeSummaryResponseDto = exports.PriceHistoryPointResponseDto = exports.MarketItemsDataResponseDto = exports.MarketItemResponseDto = void 0;
class MarketItemResponseDto {
    itemId;
    priceId;
    species;
    storageType;
    category;
    displayName;
    searchKeywords;
    grade;
    ageMonths;
    weightKg;
    salePrice;
    manufacturedAt;
    expiresAt;
    price;
    previousPrice;
    changeAmount;
    trendStatus;
    currency;
    priceUnit;
}
exports.MarketItemResponseDto = MarketItemResponseDto;
class MarketItemsDataResponseDto {
    dataStatus;
    marketDate;
    items;
}
exports.MarketItemsDataResponseDto = MarketItemsDataResponseDto;
class PriceHistoryPointResponseDto {
    marketDate;
    price;
}
exports.PriceHistoryPointResponseDto = PriceHistoryPointResponseDto;
class PriceChangeSummaryResponseDto {
    currentMarketDate;
    previousMarketDate;
    currentPrice;
    previousPrice;
    changeAmount;
    changeRate;
    trendStatus;
}
exports.PriceChangeSummaryResponseDto = PriceChangeSummaryResponseDto;
class PriceHistoryDataResponseDto {
    item;
    summary;
    points;
}
exports.PriceHistoryDataResponseDto = PriceHistoryDataResponseDto;
//# sourceMappingURL=market-response.dto.js.map