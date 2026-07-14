import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

// @Global(): 이 모듈을 한 번만 등록하면 다른 모듈에서 별도 imports 없이 RedisService를 주입받을 수 있음
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
