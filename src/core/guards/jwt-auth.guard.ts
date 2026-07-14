import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// JwtAuthGuard: JwtStrategy를 실제 요청에 적용하는 '문지기' 데코레이터입니다.
// @UseGuards(JwtAuthGuard)를 붙이면 해당 엔드포인트는 유효한 JWT 없이는 접근 불가합니다.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
