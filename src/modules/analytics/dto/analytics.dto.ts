import { IsString } from 'class-validator';

export class ViewLogDto {
  @IsString({ message: '품목 ID(itemId)는 문자열이어야 합니다.' })
  itemId: string;
}
