// src/modules/users/dto/users.dto.ts

import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';

// 💡 [한글 주석] 프로필 정보 수정을 위한 DTO
export class UpdateProfileDto {
  @IsOptional()
  @IsEmail({}, { message: '유효한 이메일 형식이어야 합니다.' })
  email?: string;

  @IsOptional()
  @IsString({ message: '닉네임은 문자열이어야 합니다.' })
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
  @MaxLength(20, { message: '닉네임은 최대 20자 이하이어야 합니다.' })
  nickname?: string;

  @IsOptional()
  @IsString({ message: '휴대폰 번호는 문자열이어야 합니다.' })
  phone?: string;
}

// 💡 [한글 주석] 비밀번호 변경을 위한 DTO
export class UpdatePasswordDto {
  @IsString({ message: '현재 비밀번호를 입력해 주세요.' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: '새 비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(64, { message: '새 비밀번호는 최대 64자 이하이어야 합니다.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, {
    message: '새 비밀번호는 8자 이상이며, 영문자와 숫자를 최소 1개 이상 포함해야 합니다.',
  })
  newPassword: string;

  @IsString({ message: '새 비밀번호 확인을 입력해 주세요.' })
  newPasswordConfirm: string;
}
