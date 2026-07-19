import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { IngestCategoryTreeDto } from './dto/category-tree.dto';
import { IngestPayloadDto } from './dto/crawler-ingest.dto';

@Controller('crawler')
export class CrawlerController {
  private readonly logger = new Logger(CrawlerController.name);

  constructor(private readonly crawlerService: CrawlerService) {}

  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  async ingest(@Body() payload: IngestPayloadDto) {
    const dataList = payload.data;
    this.logger.log(
      `Received ${dataList?.length || 0} category results from crawler.`,
    );

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

  @Post('category-tree')
  @HttpCode(HttpStatus.OK)
  async ingestCategoryTree(@Body() dto: IngestCategoryTreeDto) {
    this.logger.log(
      `Received category tree sync request with ${dto.categories?.length || 0} categories.`,
    );
    await this.crawlerService.processCategoryTree(dto);
    return { success: true };
  }
}
