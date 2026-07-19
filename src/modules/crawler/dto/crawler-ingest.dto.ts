import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class CrawlerStatisticsDto {
  @IsNumber()
  @Min(0)
  avg_price: number;

  @IsNumber()
  @Min(0)
  min_price: number;

  @IsNumber()
  @Min(0)
  max_price: number;

  @IsInt()
  @Min(0)
  total_count: number;
}

class CrawlerItemMetadataDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(40)
  age: number | null;

  @IsOptional()
  @IsIn(['1++', '1+', '1'])
  grade?: string | null;

  @IsOptional()
  @IsString()
  mfg_date?: string | null;

  @IsOptional()
  @IsString()
  expiry_date?: string;

  @IsNumber()
  @Min(0.001)
  weight_kg: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sale_price?: number | null;

  @IsIn(['BEEF', 'PORK'])
  species: 'BEEF' | 'PORK';

  @IsIn(['CHILLED', 'FROZEN'])
  storage_type: 'CHILLED' | 'FROZEN';

  @IsOptional()
  @IsString()
  haccp?: string;
}

class CrawlerItemDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  price: number;

  @IsString()
  brand: string;

  @IsString()
  detail_url: string;

  @IsString()
  goodsNo: string;

  @ValidateNested()
  @Type(() => CrawlerItemMetadataDto)
  metadata: CrawlerItemMetadataDto;
}

export class CrawlerIngestDto {
  @IsString()
  category_path: string;

  @ValidateNested()
  @Type(() => CrawlerStatisticsDto)
  statistics: CrawlerStatisticsDto;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CrawlerItemDto)
  items: CrawlerItemDto[];
}

export class IngestPayloadDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CrawlerIngestDto)
  data: CrawlerIngestDto[];
}
