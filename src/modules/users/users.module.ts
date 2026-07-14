import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MarketModule } from '../market/market.module';

@Module({
  imports: [MarketModule], // UsersService에서 MarketService를 주입받기 위해 import
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
