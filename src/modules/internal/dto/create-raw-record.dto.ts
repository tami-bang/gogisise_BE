import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  ValidateNested,
  Equals,
  IsDateString,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRawRecordDto {
  @IsString()
  @Equals('GEUMCHEON', {
    message: 'sourceName은 반드시 GEUMCHEON 이어야 합니다.',
  })
  sourceName: string;

  @IsDateString(
    {},
    { message: 'collectedAt은 유효한 ISO 8601 날짜 문자열이어야 합니다.' },
  )
  collectedAt: string;

  @IsString()
  rawProductName: string;

  @IsInt()
  price: number;

  @IsString()
  @IsIn(['BEEF', 'PORK'], {
    message: 'species는 BEEF 또는 PORK 중 하나여야 합니다.',
  })
  species: string;

  @IsString()
  @IsIn(['CHILLED', 'FROZEN'], {
    message: 'storageType은 CHILLED 또는 FROZEN 중 하나여야 합니다.',
  })
  storageType: string;

  @IsOptional()
  @IsString()
  grade?: string;

  // species가 BEEF일 경우 ageInMonths는 필수 (정수형)
  @ValidateIf((o) => o.species === 'BEEF')
  @IsInt({
    message: '한우(BEEF)의 경우 ageInMonths(월령)는 필수 정수여야 합니다.',
  })
  ageInMonths?: number;
}

export class CreateRawRecordBulkDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRawRecordDto)
  records: CreateRawRecordDto[];
}
