import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// JWT Payload 인터페이스: 토큰 안에 담기는 정보의 타입 정의
export interface JwtPayload {
  sub: string; // 유저 고유 ID (Subject)
  email: string; // 유저 이메일
}

// JwtStrategy: 경찰의 '신분증 감식 장비'와 같습니다.
// 요청 헤더에 담긴 Bearer 토큰을 꺼내어 비밀키(JWT_SECRET)로 위조 여부를 검증합니다.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Authorization: Bearer <token> 헤더에서 토큰을 추출
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 만료된 토큰도 일단 PassportStrategy가 받아들이지 않도록 설정 (false = 만료 시 자동 거부)
      ignoreExpiration: false,
      // .env에 등록된 비밀 키로 토큰의 서명을 검증
      secretOrKey: process.env.JWT_SECRET || 'fallback_secret',
    });
  }

  // 검증 통과 후, Payload 데이터를 req.user에 주입하는 메서드
  validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('유효하지 않은 토큰 페이로드입니다.');
    }
    return { userId: payload.sub, email: payload.email };
  }
}
