import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import * as bcryptjs from 'bcryptjs';
import { SignupDto, LoginDto, KakaoLoginDto } from './dto/auth.dto';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Access Token 발급 헬퍼 함수
   * 마치 '단기 방문증'을 발급하는 창구입니다. 유효 기간이 짧습니다. (기본 1시간)
   */
  private issueAccessToken(userId: string, email: string): string {
    return this.jwt.sign(
      { sub: userId, email },
      { expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '1h') as any },
    );
  }

  /**
   * Refresh Token을 Redis에 저장하고 토큰 문자열을 반환하는 헬퍼 함수
   * 마치 '장기 입장권'을 발급하고 장부(Redis)에 기록하는 것과 같습니다. (기본 30일)
   */
  private async issueAndSaveRefreshToken(userId: string): Promise<string> {
    const tokenId = uuidv4(); // 각 리프레시 토큰을 유일하게 식별하는 ID
    const refreshToken = this.jwt.sign(
      { sub: userId, tokenId },
      { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any },
    );

    // Redis에 "rt:{userId}:{tokenId}" 형태의 키로 토큰 저장
    // TTL = 30일(초 환산: 30 * 24 * 60 * 60)
    const ttlSeconds = 30 * 24 * 60 * 60;
    await this.redis.set(`rt:${userId}:${tokenId}`, refreshToken, ttlSeconds);

    return refreshToken;
  }

  /**
   * 1.1 일반 회원가입
   */
  async signup(dto: SignupDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (exists) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    // 비밀번호를 평문으로 저장하지 않고, bcryptjs로 단방향 해싱 (공장에서 고기 원산지 암호화와 유사)
    const hashedPassword = await bcryptjs.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        nickname: dto.nickname,
        phone: `temp_${uuidv4()}`, // 전화번호는 추후 본인인증 프로세스로 업데이트
      },
    });

    return {
      userId: user.userId,
      email: user.email,
      nickname: user.nickname,
    };
  }

  /**
   * 1.2 일반 로그인 (Brute Force 방어는 추후 Rate Limiter 미들웨어로 보강)
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // 보안 원칙: 이메일 존재 여부와 비밀번호 불일치를 동일한 에러 메시지로 반환
    // (공격자가 이메일 존재 여부를 알지 못하도록 방어)
    if (!user || !user.password) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    if (user.status === 'LOCKED') {
      throw new UnauthorizedException(
        '계정이 잠겨있습니다. 고객 지원으로 문의해 주세요.',
      );
    }

    const passwordMatch = await bcryptjs.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    const accessToken = this.issueAccessToken(user.userId, user.email);
    // autoLogin이 true일 경우에만 리프레시 토큰을 발급 (장기 로그인)
    const refreshToken = dto.autoLogin
      ? await this.issueAndSaveRefreshToken(user.userId)
      : null;

    return {
      accessToken,
      refreshToken, // 컨트롤러에서 쿠키로 설정
      expiresIn: 3600,
      user: { userId: user.userId, nickname: user.nickname },
    };
  }

  /**
   * 1.3 카카오 소셜 로그인 (뼈대 로직)
   * '카카오 직원(카카오 API)'에게 "이 사람 우리 고객 맞아요?"라고 확인하는 절차
   */
  async kakaoLogin(dto: KakaoLoginDto) {
    let kakaoUserId: string;
    let kakaoEmail: string;

    try {
      // 카카오 API에 Access Token을 제시하여 유저 정보를 요청
      const response = await axios.get(
        process.env.KAKAO_USER_INFO_URL || 'https://kapi.kakao.com/v2/user/me',
        {
          headers: { Authorization: `Bearer ${dto.kakaoAccessToken}` },
        },
      );
      kakaoUserId = String(response.data.id);
      kakaoEmail = response.data.kakao_account?.email;
    } catch (error) {
      this.logger.error('카카오 API 호출 실패', error);
      throw new UnauthorizedException('유효하지 않은 카카오 토큰입니다.');
    }

    // 이미 연동된 소셜 계정이 있는지 확인
    const existingSocial = await this.prisma.userSocialAccount.findFirst({
      where: { provider: 'KAKAO', providerUid: kakaoUserId },
      include: { user: true },
    });

    let user = existingSocial?.user;

    if (!user) {
      // 최초 소셜 로그인: User와 UserSocialAccount 레코드를 동시에 생성
      user = await this.prisma.user.create({
        data: {
          email: kakaoEmail || `kakao_${kakaoUserId}@gogisise.internal`,
          nickname: `고기사장님_${kakaoUserId.slice(-4)}`,
          phone: `kakao_${uuidv4()}`,
          socialAccounts: {
            create: { provider: 'KAKAO', providerUid: kakaoUserId },
          },
        },
      });
    }

    const accessToken = this.issueAccessToken(user.userId, user.email);
    const refreshToken = await this.issueAndSaveRefreshToken(user.userId);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      user: { userId: user.userId, nickname: user.nickname },
    };
  }

  /**
   * 1.4 RTR 기반 토큰 갱신
   * 리프레시 토큰을 제시하고 새 토큰 쌍을 받는 '토큰 교환소'
   */
  async refreshTokens(refreshTokenFromCookie: string) {
    let payload: { sub: string; tokenId: string };
    try {
      payload = this.jwt.verify(refreshTokenFromCookie) as {
        sub: string;
        tokenId: string;
      };
    } catch {
      throw new UnauthorizedException(
        '만료되었거나 유효하지 않은 리프레시 토큰입니다.',
      );
    }

    const { sub: userId, tokenId } = payload;
    const redisKey = `rt:${userId}:${tokenId}`;

    // Redis에 해당 키가 존재하는지 확인
    const storedToken = await this.redis.get(redisKey);

    if (!storedToken) {
      // [RTR 핵심 보안 로직]
      // Redis에 없다 = 이미 사용된 토큰을 다시 제시한 것 = 탈취 의심!
      // 즉각적으로 해당 유저의 모든 리프레시 토큰을 삭제하여 세션 강제 종료
      this.logger.warn(
        `⚠️ RTR 위반 감지! userId: ${userId}의 모든 세션을 무효화합니다.`,
      );
      const allUserTokenKeys = await this.redis.keys(`rt:${userId}:*`);
      for (const key of allUserTokenKeys) {
        await this.redis.del(key);
      }
      throw new UnauthorizedException(
        '보안 이슈가 감지되었습니다. 다시 로그인해 주세요.',
      );
    }

    // 기존 리프레시 토큰을 Redis에서 삭제 (Rotation: 1회용 처리)
    await this.redis.del(redisKey);

    // 새로운 Access Token과 새로운 Refresh Token을 발급
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new UnauthorizedException('유저를 찾을 수 없습니다.');

    const newAccessToken = this.issueAccessToken(user.userId, user.email);
    const newRefreshToken = await this.issueAndSaveRefreshToken(user.userId);

    return { accessToken: newAccessToken, newRefreshToken, expiresIn: 3600 };
  }

  /**
   * 1.5 로그아웃 (Redis Blacklist 처리)
   */
  async logout(refreshTokenFromCookie: string | undefined) {
    if (!refreshTokenFromCookie) return;

    try {
      const payload = this.jwt.verify(refreshTokenFromCookie) as {
        sub: string;
        tokenId: string;
      };
      // 해당 리프레시 토큰 키를 Redis에서 제거
      await this.redis.del(`rt:${payload.sub}:${payload.tokenId}`);
    } catch {
      // 이미 만료된 토큰이어도 로그아웃은 성공으로 처리
      this.logger.warn(
        '로그아웃 시 토큰 파싱 실패 (이미 만료된 토큰으로 추정)',
      );
    }
  }

  /**
   * 1.7 이메일 마스킹 찾기
   */
  async findEmail(phone: string): Promise<string> {
    // 💡 [한글 주석] 입력받은 휴대폰 번호의 하이픈 제거 정규화 처리
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    // 💡 [한글 주석] 숫자만 11자리인 경우 '010-XXXX-XXXX' 포맷팅 변형 생성
    let formattedPhone = cleanPhone;
    if (cleanPhone.length === 11 && cleanPhone.startsWith('010')) {
      formattedPhone = `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 7)}-${cleanPhone.slice(7)}`;
    } else if (
      cleanPhone.length === 10 &&
      (cleanPhone.startsWith('011') ||
        cleanPhone.startsWith('016') ||
        cleanPhone.startsWith('017') ||
        cleanPhone.startsWith('018') ||
        cleanPhone.startsWith('019'))
    ) {
      formattedPhone = `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
    }

    // 💡 [한글 주석] DB에서 숫자 전용 포맷 또는 하이픈 포맷 둘 중 하나에 매칭되는 유저를 OR 조회
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: cleanPhone }, { phone: formattedPhone }],
      },
    });

    if (!user)
      throw new UnauthorizedException(
        '해당 휴대폰 번호로 가입된 계정이 없습니다.',
      );

    // 이메일 마스킹 처리 (예: us***@example.com)
    const [local, domain] = user.email.split('@');
    const masked = local.slice(0, 2) + '***';
    return `${masked}@${domain}`;
  }

  /**
   * 1.8 비밀번호 재설정 이메일 발송 (뼈대 - 실제 이메일 서버 연동 필요)
   */
  async sendResetLink(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // 보안: 이메일 존재 여부와 무관하게 항상 성공 응답 (유저 열거 공격 방어)
    if (!user) {
      this.logger.warn(`비밀번호 재설정 요청 - 가입되지 않은 이메일: ${email}`);
      return;
    }
    // TODO: 이메일 서버 연동 후 Magic Link 발송 로직 구현 (예: @nestjs-modules/mailer)
    this.logger.log(
      `비밀번호 재설정 링크 발송 요청: ${email} (이메일 서버 연동 필요)`,
    );
  }
}
