import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CrawlerService } from './crawler.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CrawlerController } from './crawler.controller';

@Module({
  imports: [HttpModule],
  controllers: [CrawlerController],
  providers: [CrawlerService, PrismaService],
  exports: [CrawlerService],
})
export class CrawlerModule {}
