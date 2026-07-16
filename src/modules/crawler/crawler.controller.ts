import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { CrawlerService } from './crawler.service';

@Controller('crawler')
export class CrawlerController {
  private readonly logger = new Logger(CrawlerController.name);

  constructor(private readonly crawlerService: CrawlerService) {}

  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  async ingest(@Body('data') dataList: any[]) {
    this.logger.log(`Received ${dataList?.length || 0} category results from crawler.`);
    
    if (!dataList || !Array.isArray(dataList)) {
      return { success: false, message: 'Invalid payload' };
    }

    let totalUpserted = 0;
    for (const data of dataList) {
      if (data.items && data.items.length > 0) {
        await this.crawlerService.processIngestedData(data);
        totalUpserted += data.items.length;
      }
    }

    this.logger.log(`Ingest complete. Upserted ${totalUpserted} total items.`);
    return { success: true, upserted: totalUpserted };
  }
}
