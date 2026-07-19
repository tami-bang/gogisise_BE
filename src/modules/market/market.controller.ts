import { Controller, Get, Param, Query } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketItemsDataResponseDto } from './dto/market-response.dto';

@Controller('api/v1/market/items')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get()
  async getAllMarketItems(): Promise<{
    success: true;
    data: MarketItemsDataResponseDto;
    meta: { requestId: string; servedAt: string };
  }> {
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

  @Get('categories')
  async getCategories(
    @Query('parentNo') parentNo?: string,
    @Query('depth') depth?: string,
  ) {
    const depthNum = depth ? parseInt(depth, 10) : undefined;
    const data = await this.marketService.getCategories({
      parentNo,
      depth: depthNum,
    });
    return {
      success: true,
      data,
      meta: {
        requestId: `req_market_cats_${Date.now()}`,
        servedAt: new Date().toISOString(),
      },
    };
  }

  @Get('calculations')
  async getCategoryCalculations(@Query('categoryPath') categoryPath: string) {
    const data = await this.marketService.getCategoryCalculations(categoryPath);
    return {
      success: true,
      data,
      meta: {
        requestId: `req_market_cat_calc_${Date.now()}`,
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
