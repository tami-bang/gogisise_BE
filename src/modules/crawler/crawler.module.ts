import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { PrismaService } from '../../core/prisma/prisma.service';

@Module({
  providers: [CrawlerService, PrismaService],
  exports: [CrawlerService],
})
export class CrawlerModule {}
