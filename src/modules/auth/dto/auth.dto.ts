import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsBoolean,
  IsOptional,
} from 'class-validator';

// 일반 회원가입 DTO
export class SignupDto {
  @IsEmail({}, { message: '유효한 이메일 형식이어야 합니다.' })
  email: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(64, { message: '비밀번호는 최대 64자 이하이어야 합니다.' })
  password: string;

  @IsString()
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
  @MaxLength(20, { message: '닉네임은 최대 20자 이하이어야 합니다.' })
  nickname: string;
}

// 일반 로그인 DTO
export class LoginDto {
  @IsEmail({}, { message: '유효한 이메일 형식이어야 합니다.' })
  email: string;

  @IsString()
  password: string;

  // autoLogin: 자동 로그인(Refresh Token 쿠키 발급) 여부
  @IsOptional()
  @IsBoolean()
  autoLogin?: boolean;
}

// 카카오 소셜 로그인 DTO
export class KakaoLoginDto {
  @IsString()
  kakaoAccessToken: string;
}

// 이메일 찾기 DTO
export class FindEmailDto {
  @IsString()
  phone: string;
}

// 비밀번호 재설정 이메일 발송 DTO
export class SendResetLinkDto {
  @IsEmail({}, { message: '유효한 이메일 형식이어야 합니다.' })
  email: string;
}
