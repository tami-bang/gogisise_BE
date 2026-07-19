import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export class FinalizeCrawlDto {
  @IsArray()
  @ArrayMaxSize(200000)
  @IsString({ each: true })
  goodsNos: string[];
}
