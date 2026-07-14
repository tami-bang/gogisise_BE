import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express'; // isolatedModules 대응: type-only import
import { AuthService } from './auth.service';
import {
  SignupDto,
  LoginDto,
  KakaoLoginDto,
  FindEmailDto,
  SendResetLinkDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 공통 메타 정보 생성 헬퍼
  private buildMeta(prefix: string) {
    return {
      requestId: `req_${prefix}_${Date.now()}`,
      servedAt: new Date().toISOString(),
    };
  }

  // 쿠키 옵션 빌더: [핵심 디테일] NODE_ENV에 따라 Secure 옵션 동적 전환
  // 개발 환경(HTTP)에서 Secure=true이면 쿠키가 전달되지 않으므로 개발 시에는 false로 설정
  private getRefreshCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true, // JS에서 쿠키 접근 불가 (XSS 방어)
      secure: isProduction, // 운영: HTTPS에서만 전송 / 개발: HTTP에서도 전송 허용
      sameSite: 'strict' as const, // CSRF 공격 방어
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30일(밀리초)
      path: '/',
    };
  }

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    const data = await this.authService.signup(dto);
    return { success: true, data, meta: this.buildMeta('signup') };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    // autoLogin 시 리프레시 토큰을 HttpOnly 쿠키로 주입
    if (result.refreshToken) {
      res.cookie(
        'refreshToken',
        result.refreshToken,
        this.getRefreshCookieOptions(),
      );
    }

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        user: result.user,
      },
      meta: this.buildMeta('login'),
    };
  }

  @Post('kakao')
  @HttpCode(HttpStatus.OK)
  async kakaoLogin(
    @Body() dto: KakaoLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.kakaoLogin(dto);

    // 카카오 로그인 성공 시 항상 리프레시 토큰 쿠키 발급
    res.cookie(
      'refreshToken',
      result.refreshToken,
      this.getRefreshCookieOptions(),
    );

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        user: result.user,
      },
      meta: this.buildMeta('kakao'),
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // HttpOnly 쿠키에서 리프레시 토큰 추출
    const refreshToken = (req as any).cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException(
        '리프레시 토큰이 없습니다. 다시 로그인해 주세요.',
      );
    }

    const result = await this.authService.refreshTokens(refreshToken);

    // 새로운 리프레시 토큰을 쿠키로 다시 설정 (Rotation)
    res.cookie(
      'refreshToken',
      result.newRefreshToken,
      this.getRefreshCookieOptions(),
    );

    return {
      success: true,
      data: { accessToken: result.accessToken, expiresIn: result.expiresIn },
      meta: this.buildMeta('refresh'),
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = (req as any).cookies?.refreshToken;
    await this.authService.logout(refreshToken);

    // 클라이언트 쿠키 삭제
    res.clearCookie('refreshToken', { path: '/' });

    return { success: true, data: null, meta: this.buildMeta('logout') };
  }

  @Post('find-email')
  @HttpCode(HttpStatus.OK)
  async findEmail(@Body() dto: FindEmailDto) {
    const maskedEmail = await this.authService.findEmail(dto.phone);
    return {
      success: true,
      data: { maskedEmail },
      meta: this.buildMeta('find-email'),
    };
  }

  @Post('send-reset-link')
  @HttpCode(HttpStatus.OK)
  async sendResetLink(@Body() dto: SendResetLinkDto) {
    await this.authService.sendResetLink(dto.email);
    return {
      success: true,
      data: { message: '비밀번호 재설정 링크가 이메일로 발송되었습니다.' },
      meta: this.buildMeta('reset-link'),
    };
  }
}
