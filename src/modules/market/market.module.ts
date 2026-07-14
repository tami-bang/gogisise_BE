import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';

@Module({
  controllers: [MarketController],
  providers: [MarketService],
  exports: [MarketService], // UsersModule에서 주입 가능하도록 내보냄
})
export class MarketModule {}
