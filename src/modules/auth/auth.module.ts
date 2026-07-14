import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from '../../core/strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    // JwtModule: 토큰 발급 및 검증을 담당하는 NestJS 공식 JWT 모듈
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback_secret',
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '1h') as any,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule], // JwtModule을 export하여 다른 모듈에서도 JWT 서비스 사용 가능
})
export class AuthModule {}
