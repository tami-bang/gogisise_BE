import { IsString, IsArray, IsOptional } from 'class-validator';

export class CrawlerTaskPayloadDto {
  @IsString()
  requestId: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];
}
