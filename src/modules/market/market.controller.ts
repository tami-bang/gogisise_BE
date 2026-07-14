import { Controller, Get, Param } from '@nestjs/common';
import { MarketService } from './market.service';

@Controller('api/v1/market/items')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get()
  async getAllMarketItems() {
    const data = await this.marketService.getAllMarketItems();
    return {
      success: true,
      data,
      meta: {
        requestId: `req_market_list_${Date.now()}`,
        servedAt: new Date().toISOString(),
      },
    };
  }

  @Get(':itemId/calculations')
  async getItemCalculations(@Param('itemId') itemId: string) {
    const data = await this.marketService.getItemCalculations(itemId);
    return {
      success: true,
      data,
      meta: {
        requestId: `req_market_calc_${Date.now()}`,
        servedAt: new Date().toISOString(),
      },
    };
  }

  @Get(':itemId/price-history')
  async getItemPriceHistory(@Param('itemId') itemId: string) {
    const data = await this.marketService.getItemPriceHistory(itemId);
    return {
      success: true,
      data,
      meta: {
        requestId: `req_market_hist_${Date.now()}`,
        servedAt: new Date().toISOString(),
      },
    };
  }
}
