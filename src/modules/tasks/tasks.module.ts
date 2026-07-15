import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CrawlerModule } from '../crawler/crawler.module';
import { InternalModule } from '../internal/internal.module';
import { MarketModule } from '../market/market.module';

@Module({
  imports: [CrawlerModule, InternalModule, MarketModule],
  providers: [TasksService],
})
export class TasksModule {}
