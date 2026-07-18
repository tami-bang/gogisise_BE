import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryTreeNodeDto {
  @IsString()
  @IsNotEmpty()
  ctgNo: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  parentNo: string | null;

  @IsInt()
  depth: number;

  @IsString()
  @IsNotEmpty()
  path: string;

  @IsIn(['Y', 'N'])
  leafYn: 'Y' | 'N';
}

export class IngestCategoryTreeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => CategoryTreeNodeDto)
  categories: CategoryTreeNodeDto[];
}
