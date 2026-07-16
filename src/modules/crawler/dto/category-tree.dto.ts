import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
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
}

export class IngestCategoryTreeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryTreeNodeDto)
  categories: CategoryTreeNodeDto[];
}
